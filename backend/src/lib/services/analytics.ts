import type { Db } from '../supabase/clients';
import type { ViewType } from '../../types/database';

/**
 * Analytics (PRD A10).
 *
 * A single service so no controller writes to `views` directly. Deliberately
 * small: Postgres is the whole analytics platform at this stage, and the five
 * event types below are the ones the PRD actually asks for.
 *
 * Writes are best-effort. A dropped impression must never fail the request that
 * produced it — the user came for the feed, not for our telemetry.
 */

export const EVENT_TYPES: ViewType[] = ['impression', 'detail', 'contact', 'share', 'save'];

export interface TrackEventInput {
  userId?: string | null;
  listingId?: string | null;
  cityId?: string | null;
  sessionId?: string | null;
  type: ViewType;
  metadata?: Record<string, unknown>;
}

export async function trackEvent(db: Db, event: TrackEventInput): Promise<boolean> {
  return trackEvents(db, [event]).then((n) => n > 0);
}

/** Batched insert — the client sends impressions in groups as the feed scrolls. */
export async function trackEvents(db: Db, events: TrackEventInput[]): Promise<number> {
  if (events.length === 0) return 0;

  const rows = events.map((event) => ({
    listing_id: event.listingId ?? null,
    city_id: event.cityId ?? null,
    user_id: event.userId ?? null,
    session_id: event.sessionId ?? null,
    type: event.type,
    metadata: (event.metadata ?? {}) as never,
  }));

  const { error } = await db.from('views').insert(rows);
  if (error) {
    console.warn('[analytics] could not record events:', error.message);
    return 0;
  }
  return rows.length;
}

export interface ListingStats {
  listing_id: string;
  impression: number;
  detail: number;
  contact: number;
  share: number;
  save: number;
  /** detail views ÷ impressions (PRD success metric: feed → detail CTR). */
  ctr: number;
}

function emptyStats(listingId: string): ListingStats {
  return { listing_id: listingId, impression: 0, detail: 0, contact: 0, share: 0, save: 0, ctr: 0 };
}

/**
 * Per-listing counts (PRD A10 — "this is the sales sheet you show a café
 * owner"). Counting in the application keeps the schema free of rollup tables
 * we do not need at this volume.
 */
export async function getListingStats(
  db: Db,
  listingIds: string[],
  since?: Date,
): Promise<Record<string, ListingStats>> {
  const stats: Record<string, ListingStats> = {};
  for (const id of listingIds) stats[id] = emptyStats(id);
  if (listingIds.length === 0) return stats;

  let query = db.from('views').select('listing_id, type').in('listing_id', listingIds).limit(50_000);
  if (since) query = query.gte('created_at', since.toISOString());

  const { data, error } = await query;
  if (error) throw error;

  for (const row of data ?? []) {
    if (!row.listing_id) continue;
    const entry = stats[row.listing_id];
    if (entry) entry[row.type] += 1;
  }

  for (const entry of Object.values(stats)) {
    entry.ctr = entry.impression > 0
      ? Math.round((entry.detail / entry.impression) * 1000) / 1000
      : 0;
  }
  return stats;
}

export interface CityAnalytics {
  totals: Record<ViewType, number>;
  unique_sessions: number;
  top_listings: Array<{ listing_id: string; title: string; detail: number; impression: number }>;
  ctr: number;
}

/** City-level traffic for the admin dashboard (PRD A1 / A10). */
export async function getCityAnalytics(
  db: Db,
  cityId: string,
  since: Date,
): Promise<CityAnalytics> {
  const { data, error } = await db
    .from('views')
    .select('listing_id, type, session_id')
    .eq('city_id', cityId)
    .gte('created_at', since.toISOString())
    .limit(50_000);
  if (error) throw error;

  const totals = { impression: 0, detail: 0, contact: 0, share: 0, save: 0 } as Record<
    ViewType,
    number
  >;
  const sessions = new Set<string>();
  const perListing = new Map<string, { detail: number; impression: number }>();

  for (const row of data ?? []) {
    totals[row.type] += 1;
    if (row.session_id) sessions.add(row.session_id);
    if (!row.listing_id) continue;
    const entry = perListing.get(row.listing_id) ?? { detail: 0, impression: 0 };
    if (row.type === 'detail') entry.detail += 1;
    if (row.type === 'impression') entry.impression += 1;
    perListing.set(row.listing_id, entry);
  }

  const ranked = [...perListing.entries()]
    .sort((a, b) => b[1].detail - a[1].detail || b[1].impression - a[1].impression)
    .slice(0, 10);

  const titles = new Map<string, string>();
  if (ranked.length > 0) {
    const { data: listings } = await db
      .from('listings')
      .select('id, title')
      .in('id', ranked.map(([id]) => id));
    for (const listing of listings ?? []) titles.set(listing.id, listing.title);
  }

  return {
    totals,
    unique_sessions: sessions.size,
    top_listings: ranked.map(([id, counts]) => ({
      listing_id: id,
      title: titles.get(id) ?? '(unknown)',
      detail: counts.detail,
      impression: counts.impression,
    })),
    ctr: totals.impression > 0
      ? Math.round((totals.detail / totals.impression) * 1000) / 1000
      : 0,
  };
}
