import { withApi } from '@/lib/api/handler';
import { ok, ApiError } from '@/lib/api/response';
import { parseParam, requireUser } from '@/lib/api/context';
import { uuid } from '@/lib/validation/common';
import { sendNotification } from '@/lib/services/notifications';
import { canSendNotifications } from '@/lib/domain/permissions';

export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/notifications/:id/send
 *
 * With PUSH_PROVIDER=none this resolves the audience, writes delivery rows and
 * records stats without dispatching anything. `stats.simulated` in the response
 * says so plainly — the admin UI should surface that, not imply a real send.
 */
export const POST = withApi<{ id: string }>(
  async (ctx, params) => {
    requireUser(ctx);
    const id = parseParam(params.id, uuid, 'notification id');

    const { data: notification, error } = await ctx.db
      .from('notifications')
      .select('id, city_id')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    if (!notification) throw ApiError.notFound('Notification');

    if (!canSendNotifications(ctx.actor, notification.city_id)) {
      throw ApiError.forbidden('Only a curator of this city may send notifications');
    }

    const sent = await sendNotification(ctx.db, id);
    return ok(sent, {
      provider: sent.provider,
      note:
        sent.provider === 'none'
          ? 'PUSH_PROVIDER is "none": the audience was resolved and recorded, but no push was delivered.'
          : undefined,
    });
  },
  { requireAuth: true },
);
