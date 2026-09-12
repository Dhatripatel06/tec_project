import type { Db } from '../supabase/clients';
import { ApiError, ERROR_CODES } from '../api/response';
import { canTransition, type ListingStatus } from '../domain/lifecycle';
import { effectiveRole, isCurator, isStaff, type Actor } from '../domain/permissions';
import { regenerateOccurrences } from './occurrences';
import { DEFAULT_TIMEZONE } from '../time/zoned';
import type { ListingRow } from '../../types/database';
import type { CreateListingInput, UpdateListingInput } from '../validation/schemas';

/**
 * Admin listing CRUD (PRD A2 / A3).
 *
 * Authorisation is checked twice on purpose: here, so the API can answer with a
 * clear 403, and again by RLS, which is the boundary that actually cannot be
 * bypassed. The status machine lives in domain/lifecycle.ts and is applied here
 * for every transition.
 */

const LISTING_SELECT = `
  *,
  category:categories(id, slug, name, name_gu, emoji),
  venue:venues(id, name, area, lat, lng),
  organiser:organisers(id, name, trust_level)
`;

export interface ListingFilters {
  cityId: string;
  status?: ListingStatus[];
  categoryId?: string;
  q?: string;
  from?: string;
  to?: string;
  limit?: number;
  offset?: number;
}

export async function listListings(
  db: Db,
  filters: ListingFilters,
): Promise<{ items: unknown[]; total: number }> {
  const limit = filters.limit ?? 25;
  const offset = filters.offset ?? 0;

  let query = db
    .from('listings')
    .select(LISTING_SELECT, { count: 'exact' })
    .eq('city_id', filters.cityId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (filters.status?.length) query = query.in('status', filters.status);
  if (filters.categoryId) query = query.eq('category_id', filters.categoryId);
  if (filters.q) query = query.ilike('title', `%${filters.q}%`);
  if (filters.from) query = query.gte('start_at', filters.from);
  if (filters.to) query = query.lte('start_at', filters.to);

  const { data, error, count } = await query;
  if (error) throw error;
  return { items: data ?? [], total: count ?? 0 };
}

/**
 * Creates a listing. A new listing is never born published: an intern or
 * partner gets DRAFT/PENDING, and only a curator may ask for PUBLISHED.
 */
export async function createListing(
  db: Db,
  actor: Actor,
  input: CreateListingInput,
  requestedStatus: ListingStatus = 'DRAFT',
): Promise<ListingRow> {
  const role = effectiveRole(actor, input.city_id);
  if (!role) throw ApiError.forbidden('You do not have access to this city');
  if (requestedStatus === 'PUBLISHED' && !isCurator(actor, input.city_id)) {
    throw ApiError.forbidden('Only a curator may publish a listing');
  }

  const { tags, recurrence, ...fields } = input;

  const { data: listing, error } = await db
    .from('listings')
    .insert({
      ...fields,
      timezone: input.timezone ?? DEFAULT_TIMEZONE,
      status: requestedStatus,
      source: role === 'PARTNER' ? 'partner' : 'admin',
      created_by: actor.userId,
      ...(requestedStatus === 'PUBLISHED'
        ? { published_by: actor.userId, published_at: new Date().toISOString() }
        : {}),
    })
    .select('*')
    .single();
  if (error) throw error;

  if (tags?.length) {
    const { error: tagError } = await db
      .from('listing_tags')
      .insert(tags.map((tag) => ({ listing_id: listing.id, tag })));
    if (tagError) throw tagError;
  }

  if (recurrence) {
    const { error: recurrenceError } = await db.from('recurrences').insert({
      listing_id: listing.id,
      freq: recurrence.freq,
      interval: recurrence.interval,
      byweekday: recurrence.byweekday ?? null,
      starts_on: recurrence.starts_on,
      ends_on: recurrence.ends_on ?? null,
      count: recurrence.count ?? null,
      start_time: recurrence.start_time,
      end_time: recurrence.end_time,
      ends_next_day: recurrence.ends_next_day,
      timezone: recurrence.timezone,
    });
    if (recurrenceError) throw recurrenceError;
  }

  await regenerateOccurrences(db, listing.id);
  return listing;
}

export async function getListing(db: Db, id: string): Promise<ListingRow> {
  const { data, error } = await db.from('listings').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  if (!data) throw ApiError.notFound('Listing', ERROR_CODES.LISTING_NOT_FOUND);
  return data;
}

export async function updateListing(
  db: Db,
  actor: Actor,
  id: string,
  input: UpdateListingInput,
): Promise<ListingRow> {
  const current = await getListing(db, id);
  if (!isStaff(actor, current.city_id) && current.created_by !== actor.userId) {
    throw ApiError.forbidden('You may only edit your own listings');
  }

  const { tags, recurrence, ...fields } = input;

  const { data, error } = await db
    .from('listings')
    .update(fields)
    .eq('id', id)
    .select('*')
    .maybeSingle();
  if (error) throw error;
  if (!data) throw ApiError.notFound('Listing', ERROR_CODES.LISTING_NOT_FOUND);

  if (tags) {
    await db.from('listing_tags').delete().eq('listing_id', id);
    if (tags.length) {
      const { error: tagError } = await db
        .from('listing_tags')
        .insert(tags.map((tag) => ({ listing_id: id, tag })));
      if (tagError) throw tagError;
    }
  }

  if (recurrence !== undefined) {
    await db.from('recurrences').delete().eq('listing_id', id);
    if (recurrence) {
      const { error: recurrenceError } = await db.from('recurrences').insert({
        listing_id: id,
        freq: recurrence.freq,
        interval: recurrence.interval,
        byweekday: recurrence.byweekday ?? null,
        starts_on: recurrence.starts_on,
        ends_on: recurrence.ends_on ?? null,
        count: recurrence.count ?? null,
        start_time: recurrence.start_time,
        end_time: recurrence.end_time,
        ends_next_day: recurrence.ends_next_day,
        timezone: recurrence.timezone,
      });
      if (recurrenceError) throw recurrenceError;
    }
  }

  // Any schedule change must be reflected in the feed's source of truth.
  await regenerateOccurrences(db, id);
  return data;
}

/**
 * Moves a listing through the lifecycle. The transition table decides what is
 * legal for this role; the database records the change in audit_logs by trigger.
 */
export async function changeListingStatus(
  db: Db,
  actor: Actor,
  id: string,
  to: ListingStatus,
  reason?: string | null,
): Promise<ListingRow> {
  const current = await getListing(db, id);
  const role = effectiveRole(actor, current.city_id);
  if (!role) throw ApiError.forbidden('You do not have access to this city');

  const check = canTransition(current.status, to, role);
  if (!check.allowed) {
    throw new ApiError(ERROR_CODES.INVALID_TRANSITION, check.reason ?? 'Transition not allowed');
  }
  if (to === 'REJECTED' && !reason) {
    throw new ApiError(ERROR_CODES.VALIDATION_FAILED, 'A rejection requires a reason');
  }

  const patch: Partial<ListingRow> = { status: to };
  if (to === 'PUBLISHED') {
    patch.published_by = actor.userId;
    patch.published_at = new Date().toISOString();
  }
  if (to === 'REJECTED') patch.rejection_reason = reason ?? null;

  const { data, error } = await db
    .from('listings')
    .update(patch)
    .eq('id', id)
    .select('*')
    .maybeSingle();
  if (error) throw error;
  if (!data) throw ApiError.notFound('Listing', ERROR_CODES.LISTING_NOT_FOUND);

  // Publishing is the moment a listing needs to exist in the feed.
  if (to === 'PUBLISHED') await regenerateOccurrences(db, id);

  return data;
}

export async function deleteListing(db: Db, actor: Actor, id: string): Promise<void> {
  const current = await getListing(db, id);
  if (!isCurator(actor, current.city_id)) {
    throw ApiError.forbidden('Only a curator may delete a listing');
  }
  const { error } = await db.from('listings').delete().eq('id', id);
  if (error) throw error;
}

export interface DashboardDay {
  date: string;
  count: number;
  /** PRD A1: a day with fewer than 5 items is flagged red. */
  is_thin: boolean;
}

/** Dashboard coverage health (PRD A1). */
export async function getDashboard(
  db: Db,
  cityId: string,
  today: string,
  days = 7,
): Promise<{
  coverage: DashboardDay[];
  pending_submissions: number;
  open_reports: number;
  totals: { published: number; draft: number; pending: number; evergreen: number };
}> {
  const { data: occurrences, error } = await db
    .from('occurrences')
    .select('local_date, listing:listings!inner(status, is_evergreen)')
    .eq('city_id', cityId)
    .gte('local_date', today)
    .eq('is_cancelled', false)
    .eq('listing.status', 'PUBLISHED')
    .limit(1000);
  if (error) throw error;

  const counts = new Map<string, number>();
  for (const row of occurrences ?? []) {
    counts.set(row.local_date, (counts.get(row.local_date) ?? 0) + 1);
  }

  const coverage: DashboardDay[] = [];
  for (let i = 0; i < days; i += 1) {
    const date = shiftDate(today, i);
    const count = counts.get(date) ?? 0;
    coverage.push({ date, count, is_thin: count < 5 });
  }

  const [pending, reports, published, draft, pendingListings, evergreen] = await Promise.all([
    countRows(db, 'submissions', (q) => q.eq('city_id', cityId).eq('status', 'PENDING')),
    countRows(db, 'reports', (q) => q.eq('is_resolved', false)),
    countRows(db, 'listings', (q) => q.eq('city_id', cityId).eq('status', 'PUBLISHED')),
    countRows(db, 'listings', (q) => q.eq('city_id', cityId).eq('status', 'DRAFT')),
    countRows(db, 'listings', (q) => q.eq('city_id', cityId).eq('status', 'PENDING')),
    countRows(db, 'listings', (q) => q.eq('city_id', cityId).eq('is_evergreen', true)),
  ]);

  return {
    coverage,
    pending_submissions: pending,
    open_reports: reports,
    totals: {
      published,
      draft,
      pending: pendingListings,
      evergreen,
    },
  };
}

type CountableTable = 'submissions' | 'reports' | 'listings';

async function countRows(
  db: Db,
  table: CountableTable,
  apply: (query: ReturnType<Db['from']>) => unknown,
): Promise<number> {
  const base = db.from(table).select('*', { count: 'exact', head: true });
  const query = apply(base as never) as typeof base;
  const { count, error } = await query;
  if (error) throw error;
  return count ?? 0;
}

function shiftDate(date: string, days: number): string {
  const [y, m, d] = date.split('-').map(Number);
  const shifted = new Date(Date.UTC(y!, m! - 1, d! + days));
  return shifted.toISOString().slice(0, 10);
}
