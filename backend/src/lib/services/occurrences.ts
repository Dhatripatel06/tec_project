import type { Db } from '../supabase/clients';
import {
  diffOccurrences,
  expandRecurrence,
  expandSingleEvent,
  DEFAULT_HORIZON_DAYS,
  type ExistingOccurrence,
  type ExpandedOccurrence,
  type RecurrenceRule,
} from '../domain/recurrence';
import { addDays, localToday, DEFAULT_TIMEZONE } from '../time/zoned';
import { ApiError, ERROR_CODES } from '../api/response';
import type { OccurrenceRow, RecurrenceRow } from '../../types/database';

/**
 * Materialising listings into occurrences.
 *
 * The feed reads `occurrences` and nothing else, so this service is what makes
 * a listing visible at all. It is called whenever a listing's schedule changes
 * and by the rolling horizon job.
 *
 * Regeneration is non-destructive: cancellations and per-occurrence overrides
 * survive it (see diffOccurrences), and past occurrences are never deleted.
 */

export interface RegenerateOptions {
  /** How far ahead to materialise. Defaults to OCCURRENCE_HORIZON_DAYS. */
  horizonDays?: number;
  /** Reference "today", for deterministic tests. */
  today?: string;
}

export interface RegenerateResult {
  listingId: string;
  inserted: number;
  updated: number;
  deleted: number;
  preserved: number;
  firstStart: Date | null;
  lastEnd: Date | null;
}

function ruleFromRow(row: RecurrenceRow): RecurrenceRule {
  return {
    freq: row.freq,
    interval: row.interval,
    byweekday: row.byweekday,
    startsOn: row.starts_on,
    endsOn: row.ends_on,
    count: row.count,
    startTime: row.start_time,
    endTime: row.end_time,
    endsNextDay: row.ends_next_day,
    timezone: row.timezone,
    exdates: row.exdates,
  };
}

function toExisting(rows: OccurrenceRow[]): ExistingOccurrence[] {
  return rows.map((row) => ({
    id: row.id,
    localDate: row.local_date,
    startAt: new Date(row.start_at),
    endAt: new Date(row.end_at),
    isCancelled: row.is_cancelled,
    isOverride: row.is_override,
  }));
}

/**
 * Rebuilds the occurrence set for one listing.
 *
 * Requires a client that can write occurrences — either a curator's session or
 * the service role for background jobs.
 */
export async function regenerateOccurrences(
  db: Db,
  listingId: string,
  options: RegenerateOptions = {},
): Promise<RegenerateResult> {
  const { data: listing, error: listingError } = await db
    .from('listings')
    .select('id, city_id, timezone, start_at, end_at, is_evergreen')
    .eq('id', listingId)
    .maybeSingle();

  if (listingError) throw listingError;
  if (!listing) throw ApiError.notFound('Listing', ERROR_CODES.LISTING_NOT_FOUND);

  const timezone = listing.timezone || DEFAULT_TIMEZONE;
  const today = options.today ?? localToday(new Date(), timezone);
  const horizonDays = options.horizonDays ?? DEFAULT_HORIZON_DAYS;
  const horizonEnd = addDays(today, horizonDays);

  const { data: existingRows, error: existingError } = await db
    .from('occurrences')
    .select('*')
    .eq('listing_id', listingId);
  if (existingError) throw existingError;

  // An evergreen listing is not a scheduled event; it must never generate
  // occurrences, or it would appear in the feed as if it were happening.
  let expanded: ExpandedOccurrence[] = [];

  if (!listing.is_evergreen) {
    const { data: recurrence, error: recurrenceError } = await db
      .from('recurrences')
      .select('*')
      .eq('listing_id', listingId)
      .maybeSingle();
    if (recurrenceError) throw recurrenceError;

    if (recurrence) {
      expanded = expandRecurrence(ruleFromRow(recurrence), { to: horizonEnd });
    } else if (listing.start_at && listing.end_at) {
      expanded = expandSingleEvent(
        new Date(listing.start_at),
        new Date(listing.end_at),
        timezone,
      );
    }
  }

  const diff = diffOccurrences(expanded, toExisting(existingRows ?? []), today);

  if (diff.insert.length > 0) {
    const { error } = await db.from('occurrences').insert(
      diff.insert.map((occurrence) => ({
        listing_id: listingId,
        city_id: listing.city_id,
        local_date: occurrence.localDate,
        start_at: occurrence.startAt.toISOString(),
        end_at: occurrence.endAt.toISOString(),
      })),
    );
    if (error) throw error;
  }

  for (const update of diff.update) {
    const { error } = await db
      .from('occurrences')
      .update({
        start_at: update.startAt.toISOString(),
        end_at: update.endAt.toISOString(),
      })
      .eq('id', update.id);
    if (error) throw error;
  }

  if (diff.deleteIds.length > 0) {
    const { error } = await db.from('occurrences').delete().in('id', diff.deleteIds);
    if (error) throw error;
  }

  // Keep the listing's own anchor instants in step with its occurrences; the
  // admin table and the expiry sweep both read them.
  const instants = expanded.flatMap((o) => [o.startAt, o.endAt]);
  const firstStart = expanded.length
    ? new Date(Math.min(...expanded.map((o) => o.startAt.getTime())))
    : null;
  const lastEnd = instants.length
    ? new Date(Math.max(...expanded.map((o) => o.endAt.getTime())))
    : null;

  if (!listing.is_evergreen && firstStart && lastEnd) {
    const { error } = await db
      .from('listings')
      .update({ start_at: firstStart.toISOString(), end_at: lastEnd.toISOString() })
      .eq('id', listingId);
    if (error) throw error;
  }

  return {
    listingId,
    inserted: diff.insert.length,
    updated: diff.update.length,
    deleted: diff.deleteIds.length,
    preserved: diff.preservedIds.length,
    firstStart,
    lastEnd,
  };
}

/** Cancels one occurrence without touching the rest of the series (PRD A3). */
export async function cancelOccurrence(
  db: Db,
  occurrenceId: string,
  reason: string | null,
): Promise<OccurrenceRow> {
  const { data, error } = await db
    .from('occurrences')
    .update({ is_cancelled: true, cancel_reason: reason })
    .eq('id', occurrenceId)
    .select('*')
    .maybeSingle();
  if (error) throw error;
  if (!data) throw ApiError.notFound('Occurrence', ERROR_CODES.OCCURRENCE_NOT_FOUND);
  return data;
}

export async function restoreOccurrence(db: Db, occurrenceId: string): Promise<OccurrenceRow> {
  const { data, error } = await db
    .from('occurrences')
    .update({ is_cancelled: false, cancel_reason: null })
    .eq('id', occurrenceId)
    .select('*')
    .maybeSingle();
  if (error) throw error;
  if (!data) throw ApiError.notFound('Occurrence', ERROR_CODES.OCCURRENCE_NOT_FOUND);
  return data;
}

/**
 * Overrides the times of a single occurrence. Marking `is_override` is what
 * protects the edit from the next regeneration of the series.
 */
export async function overrideOccurrence(
  db: Db,
  occurrenceId: string,
  changes: { startAt?: Date; endAt?: Date; note?: string | null },
): Promise<OccurrenceRow> {
  const patch: Partial<OccurrenceRow> = { is_override: true };
  if (changes.startAt) patch.start_at = changes.startAt.toISOString();
  if (changes.endAt) patch.end_at = changes.endAt.toISOString();
  if (changes.note !== undefined) patch.note = changes.note;

  const { data, error } = await db
    .from('occurrences')
    .update(patch)
    .eq('id', occurrenceId)
    .select('*')
    .maybeSingle();
  if (error) throw error;
  if (!data) throw ApiError.notFound('Occurrence', ERROR_CODES.OCCURRENCE_NOT_FOUND);
  return data;
}

/**
 * Rolling-horizon job: extends every published recurring listing so the
 * calendar never runs dry. Safe to run repeatedly (it is a diff, not a rebuild).
 */
export async function extendHorizon(
  db: Db,
  options: RegenerateOptions = {},
): Promise<RegenerateResult[]> {
  const { data, error } = await db
    .from('listings')
    .select('id')
    .eq('status', 'PUBLISHED')
    .eq('is_evergreen', false);
  if (error) throw error;

  const results: RegenerateResult[] = [];
  for (const listing of data ?? []) {
    results.push(await regenerateOccurrences(db, listing.id, options));
  }
  return results;
}
