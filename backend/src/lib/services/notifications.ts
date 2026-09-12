import type { Db } from '../supabase/clients';
import { ApiError, ERROR_CODES } from '../api/response';
import type { NotificationRow, NotificationSegment } from '../../types/database';

/**
 * Notifications foundation (PRD F8 / A8).
 *
 * Schema, segments and campaign lifecycle are real. Delivery is behind a
 * provider interface with a no-op implementation, because PUSH_PROVIDER is
 * `none` for the MVP — campaigns are composed, audiences resolved and results
 * recorded, and plugging in FCM later means writing one adapter, not changing
 * any of this.
 */

export interface PushMessage {
  title: string;
  body: string;
  deepLink?: string | null;
  userIds: string[];
}

export interface PushResult {
  provider: string;
  sent: number;
  failed: number;
  /** True when nothing actually left the building. */
  simulated: boolean;
}

export interface PushProvider {
  readonly name: string;
  send(message: PushMessage): Promise<PushResult>;
}

/**
 * The MVP provider. Resolves the audience and records the campaign without
 * dispatching anything, so the whole flow is exercisable with no vendor
 * account and no keys.
 */
export class NoopPushProvider implements PushProvider {
  readonly name = 'none';

  async send(_message: PushMessage): Promise<PushResult> {
    return {
      provider: this.name,
      sent: 0,
      failed: 0,
      simulated: true,
    };
  }
}

/** Chooses the provider from configuration. Never throws for a missing key. */
export function getPushProvider(): PushProvider {
  const configured = process.env.PUSH_PROVIDER ?? 'none';
  // Only the no-op exists today; an unknown value degrades to it rather than
  // taking the API down.
  if (configured !== 'none') {
    console.warn(`[notifications] PUSH_PROVIDER="${configured}" has no adapter; using no-op`);
  }
  return new NoopPushProvider();
}

export interface CreateNotificationInput {
  city_id?: string | null;
  title: string;
  body: string;
  title_gu?: string | null;
  body_gu?: string | null;
  deep_link?: string | null;
  segment: NotificationSegment;
  segment_ref?: string | null;
  scheduled_at?: string | null;
}

export async function createNotification(
  db: Db,
  input: CreateNotificationInput,
  createdBy: string,
): Promise<NotificationRow> {
  const { data, error } = await db
    .from('notifications')
    .insert({
      ...input,
      status: input.scheduled_at ? 'SCHEDULED' : 'DRAFT',
      created_by: createdBy,
      provider: getPushProvider().name,
    })
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

/**
 * Resolves who a campaign targets (PRD A8 segments).
 *
 *   ALL_USERS     every user who has not opted out
 *   CITY          users whose profile city matches
 *   CATEGORY      users subscribed to a category
 *   SAVED_LISTING users who saved a specific listing
 */
export async function resolveAudience(
  db: Db,
  notification: Pick<NotificationRow, 'segment' | 'segment_ref' | 'city_id'>,
): Promise<string[]> {
  if (notification.segment === 'SAVED_LISTING') {
    if (!notification.segment_ref) return [];
    const { data, error } = await db
      .from('saves')
      .select('user_id')
      .eq('listing_id', notification.segment_ref);
    if (error) throw error;
    return [...new Set((data ?? []).map((row) => row.user_id))];
  }

  let query = db.from('users').select('id, notif_prefs').eq('is_blocked', false);

  if (notification.segment === 'CITY' && notification.city_id) {
    query = query.eq('city_id', notification.city_id);
  }

  const { data, error } = await query.limit(50_000);
  if (error) throw error;

  const users = data ?? [];

  if (notification.segment === 'CATEGORY') {
    if (!notification.segment_ref) return [];
    return users
      .filter((user) => {
        const prefs = user.notif_prefs as { categories?: string[] } | null;
        return Array.isArray(prefs?.categories)
          && prefs!.categories!.includes(notification.segment_ref!);
      })
      .map((user) => user.id);
  }

  return users.map((user) => user.id);
}

/**
 * Sends (or, with the no-op provider, simulates sending) a campaign and records
 * per-user delivery rows plus aggregate stats.
 */
export async function sendNotification(
  db: Db,
  notificationId: string,
): Promise<NotificationRow> {
  const { data: notification, error } = await db
    .from('notifications')
    .select('*')
    .eq('id', notificationId)
    .maybeSingle();
  if (error) throw error;
  if (!notification) throw ApiError.notFound('Notification');
  if (notification.status === 'SENT') {
    throw new ApiError(ERROR_CODES.INVALID_TRANSITION, 'This campaign has already been sent');
  }

  const provider = getPushProvider();
  const userIds = await resolveAudience(db, notification);

  const result = await provider.send({
    title: notification.title,
    body: notification.body,
    deepLink: notification.deep_link,
    userIds,
  });

  if (userIds.length > 0) {
    // Delivery rows exist even when simulated: they are what the frequency cap
    // (PRD F8, max 2/day) and the open-rate report will read.
    const { error: deliveryError } = await db.from('notification_deliveries').upsert(
      userIds.map((userId) => ({
        notification_id: notificationId,
        user_id: userId,
        sent_at: result.simulated ? null : new Date().toISOString(),
      })),
      { onConflict: 'notification_id,user_id', ignoreDuplicates: true },
    );
    if (deliveryError) throw deliveryError;
  }

  const { data: updated, error: updateError } = await db
    .from('notifications')
    .update({
      status: 'SENT',
      sent_at: new Date().toISOString(),
      provider: result.provider,
      stats: {
        recipients: userIds.length,
        sent: result.sent,
        failed: result.failed,
        simulated: result.simulated,
      } as never,
    })
    .eq('id', notificationId)
    .select('*')
    .single();
  if (updateError) throw updateError;

  return updated;
}

/**
 * Assembles the 8 AM digest body from the day's top listings (PRD A8
 * "auto-digest template"). Returns the text for a curator to review — it does
 * not send anything.
 */
export function buildDigest(
  cityName: string,
  items: Array<{ title: string; hook: string | null }>,
): { title: string; body: string } {
  const count = items.length;
  const headlines = items
    .slice(0, 5)
    .map((item) => (item.hook ? `${item.title} — ${item.hook}` : item.title));

  return {
    title: `${count} thing${count === 1 ? '' : 's'} to do in ${cityName} today`,
    body: headlines.join('\n'),
  };
}
