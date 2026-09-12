import { randomUUID } from 'node:crypto';
import type { Db } from '../supabase/clients';
import { ApiError, ERROR_CODES } from '../api/response';
import { findDuplicates, type DuplicateCandidate, type DuplicateResult } from '../domain/duplicates';
import { regenerateOccurrences } from './occurrences';
import { localDateTimeToUtc, addDays, DEFAULT_TIMEZONE } from '../time/zoned';
import type { Json, SubmissionRow } from '../../types/database';

/**
 * Public submissions and the moderation queue (PRD F7 / A4).
 *
 * The rule that cannot bend: a submission NEVER becomes a published listing on
 * its own. Approval is an explicit curator action that creates a listing —
 * `createSubmission` only ever writes a row with status PENDING, and the RLS
 * policy independently refuses any other status from an anon or user token.
 */

export interface CreateSubmissionInput {
  city_id: string;
  title?: string | null;
  category_id?: string | null;
  event_date?: string | null;
  start_time?: string | null;
  end_time?: string | null;
  venue_id?: string | null;
  venue_text?: string | null;
  price_text?: string | null;
  contact_phone?: string | null;
  image_url?: string | null;
  instagram_url?: string | null;
  raw_text?: string | null;
  submitter_phone?: string | null;
}

/**
 * Finds listings that might be the same event, for the duplicate warning.
 * Candidates are narrowed in SQL (same city, overlapping dates) and scored in
 * the pure domain module.
 */
export async function detectDuplicates(
  db: Db,
  input: {
    cityId: string;
    title: string;
    venueId?: string | null;
    venueText?: string | null;
    dates: string[];
    excludeListingId?: string | null;
  },
): Promise<DuplicateResult> {
  if (!input.title.trim() || input.dates.length === 0) {
    return { potentialDuplicate: false, bestMatch: null, matches: [] };
  }

  // Listings in this city that have an occurrence on any of the candidate days.
  const { data: occurrences, error } = await db
    .from('occurrences')
    .select(
      `listing_id, local_date,
       listing:listings!inner(id, title, venue_id, city_id, status, venue:venues(id, name))`,
    )
    .eq('city_id', input.cityId)
    .in('local_date', input.dates)
    .eq('is_cancelled', false)
    .in('listing.status', ['PUBLISHED', 'PENDING', 'DRAFT'])
    .limit(300);

  if (error) throw error;

  const rows = (occurrences ?? []) as unknown as Array<{
    listing_id: string;
    local_date: string;
    listing: {
      id: string;
      title: string;
      venue_id: string | null;
      venue: { id: string; name: string } | null;
    } | null;
  }>;

  const byListing = new Map<string, DuplicateCandidate>();
  for (const row of rows) {
    if (!row.listing) continue;
    const existing = byListing.get(row.listing_id);
    if (existing) {
      existing.dates.push(row.local_date);
      continue;
    }
    byListing.set(row.listing_id, {
      listingId: row.listing.id,
      title: row.listing.title,
      venueId: row.listing.venue_id,
      venueName: row.listing.venue?.name ?? null,
      dates: [row.local_date],
    });
  }

  return findDuplicates(
    {
      title: input.title,
      venueId: input.venueId,
      venueName: input.venueText,
      dates: input.dates,
      excludeListingId: input.excludeListingId,
    },
    [...byListing.values()],
  );
}

/** What createSubmission returns. Deliberately narrow — see below. */
export interface CreatedSubmission {
  id: string;
  status: 'PENDING';
  potential_duplicate: boolean;
  duplicate_of: string | null;
  duplicate_score: number | null;
  duplicate: DuplicateResult;
}

/**
 * Records a public submission. Always PENDING; the duplicate check is advisory
 * and never blocks a submission — a curator decides.
 *
 * The row id is generated here rather than read back from the insert. An
 * anonymous submitter has INSERT rights on `submissions` but deliberately no
 * SELECT rights (the queue is staff-only), so `.insert().select()` would be
 * refused by RLS for exactly the callers this endpoint exists to serve.
 */
export async function createSubmission(
  db: Db,
  input: CreateSubmissionInput,
  submittedBy: string | null,
): Promise<CreatedSubmission> {
  const duplicate = input.title
    ? await detectDuplicates(db, {
        cityId: input.city_id,
        title: input.title,
        venueId: input.venue_id,
        venueText: input.venue_text,
        dates: input.event_date ? [input.event_date] : [],
      })
    : { potentialDuplicate: false, bestMatch: null, matches: [] };

  const id = randomUUID();

  const { error } = await db.from('submissions').insert({
    id,
    city_id: input.city_id,
    title: input.title ?? null,
    category_id: input.category_id ?? null,
    event_date: input.event_date ?? null,
    start_time: input.start_time ?? null,
    end_time: input.end_time ?? null,
    venue_id: input.venue_id ?? null,
    venue_text: input.venue_text ?? null,
    price_text: input.price_text ?? null,
    contact_phone: input.contact_phone ?? null,
    image_url: input.image_url ?? null,
    instagram_url: input.instagram_url ?? null,
    raw_text: input.raw_text ?? null,
    submitter_phone: input.submitter_phone ?? null,
    submitted_by: submittedBy,
    status: 'PENDING',
    potential_duplicate: duplicate.potentialDuplicate,
    duplicate_of: duplicate.bestMatch?.listingId ?? null,
    duplicate_score: duplicate.bestMatch?.score ?? null,
  });

  if (error) throw error;

  return {
    id,
    status: 'PENDING',
    potential_duplicate: duplicate.potentialDuplicate,
    duplicate_of: duplicate.bestMatch?.listingId ?? null,
    duplicate_score: duplicate.bestMatch?.score ?? null,
    duplicate,
  };
}

export interface ListingDraft {
  city_id: string;
  category_id: string;
  venue_id?: string | null;
  organiser_id?: string | null;
  venue_text?: string | null;
  title: string;
  title_gu?: string | null;
  description?: string | null;
  description_gu?: string | null;
  hook?: string | null;
  hook_gu?: string | null;
  start_at?: string | null;
  end_at?: string | null;
  timezone?: string;
  price_type?: 'free' | 'paid' | 'donation';
  price_min?: number | null;
  price_max?: number | null;
  is_indoor?: boolean;
  is_family_friendly?: boolean;
  is_featured?: boolean;
  rank_weight?: number;
  capacity?: number | null;
  external_url?: string | null;
  contact_phone?: string | null;
  cover_image?: string | null;
  /** Optional tags — stored in listing_tags, never as a listings column. */
  tags?: string[];
  recurrence?: {
    freq: 'ONCE' | 'DAILY' | 'WEEKLY';
    interval?: number;
    byweekday?: number[] | null;
    starts_on: string;
    ends_on?: string | null;
    count?: number | null;
    start_time: string;
    end_time: string;
    ends_next_day?: boolean;
    timezone?: string;
  } | null;
}

/**
 * Pure mapper: submission fields → a listing draft the curator can edit.
 *
 * Pulled out of the request path so the "approve with the fields as submitted"
 * default is directly testable. Anything the submitter did not supply stays
 * null for the curator to fill in.
 */
export function draftFromSubmission(
  submission: Pick<
    SubmissionRow,
    | 'city_id'
    | 'title'
    | 'category_id'
    | 'event_date'
    | 'start_time'
    | 'end_time'
    | 'venue_id'
    | 'venue_text'
    | 'contact_phone'
    | 'raw_text'
    | 'image_url'
    | 'price_text'
  >,
  fallbackCategoryId: string,
  timezone: string = DEFAULT_TIMEZONE,
): ListingDraft {
  const priceText = (submission.price_text ?? '').toLowerCase();
  const looksFree = priceText === '' || /free|નિ:શુલ્ક|no entry fee|entry free/.test(priceText);
  const amount = /(\d+(?:\.\d{1,2})?)/.exec(submission.price_text ?? '');

  let startAt: string | null = null;
  let endAt: string | null = null;
  if (submission.event_date) {
    const startTime = submission.start_time ?? '19:00';
    const endTime = submission.end_time ?? null;
    const start = localDateTimeToUtc(submission.event_date, startTime, timezone);
    startAt = start.toISOString();

    if (endTime) {
      // An end before the start means it runs past midnight.
      const endsNextDay = endTime <= startTime;
      const endDate = endsNextDay ? addDays(submission.event_date, 1) : submission.event_date;
      endAt = localDateTimeToUtc(endDate, endTime, timezone).toISOString();
    } else {
      // No end time given: assume two hours, the common case for a local event.
      endAt = new Date(start.getTime() + 2 * 3_600_000).toISOString();
    }
  }

  return {
    city_id: submission.city_id,
    category_id: submission.category_id ?? fallbackCategoryId,
    venue_id: submission.venue_id,
    venue_text: submission.venue_id ? null : submission.venue_text,
    title: submission.title?.trim() || 'Untitled submission',
    description: submission.raw_text,
    start_at: startAt,
    end_at: endAt,
    timezone,
    price_type: looksFree ? 'free' : 'paid',
    price_min: looksFree ? null : amount ? Number(amount[1]) : null,
    contact_phone: submission.contact_phone,
    cover_image: submission.image_url,
    is_indoor: true,
    is_family_friendly: false,
    recurrence: null,
  };
}

export interface ModerationResult {
  submission_id: string;
  status: 'APPROVED' | 'REJECTED';
  listing_id: string | null;
  occurrences_created: number;
  reason: string | null;
}

/**
 * Approves a submission into a published listing.
 *
 * `draft` is what the curator actually confirmed — approve-with-edits is the
 * normal path (PRD A4), so the submitted values are only ever a starting point.
 * The listing is created directly as PUBLISHED because a curator publishing it
 * IS the moderation step.
 */
export async function approveSubmission(
  db: Db,
  submissionId: string,
  draft: ListingDraft,
  reviewerId: string,
): Promise<ModerationResult> {
  const { data: submission, error: loadError } = await db
    .from('submissions')
    .select('*')
    .eq('id', submissionId)
    .maybeSingle();
  if (loadError) throw loadError;
  if (!submission) throw ApiError.notFound('Submission', ERROR_CODES.SUBMISSION_NOT_FOUND);
  if (submission.status !== 'PENDING') {
    throw new ApiError(
      ERROR_CODES.INVALID_TRANSITION,
      `Submission is already ${submission.status}`,
    );
  }
  if (draft.city_id !== submission.city_id) {
    // Prevents a curator moving a submission into a city they may not hold.
    throw new ApiError(
      ERROR_CODES.VALIDATION_FAILED,
      'A listing must be created in the same city as the submission',
    );
  }

  // `tags` and `recurrence` are not columns on `listings`; they live in their
  // own tables and must be stripped before the insert.
  const { recurrence, tags, ...listingFields } = draft;

  const { data: listing, error: listingError } = await db
    .from('listings')
    .insert({
      ...listingFields,
      timezone: draft.timezone ?? DEFAULT_TIMEZONE,
      status: 'PUBLISHED',
      source: 'user_submission',
      submitted_by: submission.submitted_by,
      created_by: reviewerId,
      published_by: reviewerId,
      published_at: new Date().toISOString(),
    })
    .select('id')
    .single();
  if (listingError) throw listingError;

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
      interval: recurrence.interval ?? 1,
      byweekday: recurrence.byweekday ?? null,
      starts_on: recurrence.starts_on,
      ends_on: recurrence.ends_on ?? null,
      count: recurrence.count ?? null,
      start_time: recurrence.start_time,
      end_time: recurrence.end_time,
      ends_next_day: recurrence.ends_next_day ?? false,
      timezone: recurrence.timezone ?? draft.timezone ?? DEFAULT_TIMEZONE,
    });
    if (recurrenceError) throw recurrenceError;
  }

  // Materialise the listing into the occurrences the feed reads. Without this
  // an approved listing would exist but never appear.
  const generated = await regenerateOccurrences(db, listing.id);

  const { error: updateError } = await db
    .from('submissions')
    .update({
      status: 'APPROVED',
      reviewed_by: reviewerId,
      reviewed_at: new Date().toISOString(),
      listing_id: listing.id,
    })
    .eq('id', submissionId);
  if (updateError) throw updateError;

  await writeAudit(db, 'submissions', submissionId, 'APPROVE', submission.city_id, {
    listing_id: listing.id,
  });

  return {
    submission_id: submissionId,
    status: 'APPROVED',
    listing_id: listing.id,
    occurrences_created: generated.inserted,
    reason: null,
  };
}

/** Rejects a submission. The reason is stored so it can be sent to the submitter. */
export async function rejectSubmission(
  db: Db,
  submissionId: string,
  reason: string,
  reviewerId: string,
): Promise<ModerationResult> {
  const { data: submission, error: loadError } = await db
    .from('submissions')
    .select('id, status, city_id')
    .eq('id', submissionId)
    .maybeSingle();
  if (loadError) throw loadError;
  if (!submission) throw ApiError.notFound('Submission', ERROR_CODES.SUBMISSION_NOT_FOUND);
  if (submission.status !== 'PENDING') {
    throw new ApiError(
      ERROR_CODES.INVALID_TRANSITION,
      `Submission is already ${submission.status}`,
    );
  }

  const { error } = await db
    .from('submissions')
    .update({
      status: 'REJECTED',
      reason,
      reviewed_by: reviewerId,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', submissionId);
  if (error) throw error;

  await writeAudit(db, 'submissions', submissionId, 'REJECT', submission.city_id, { reason });

  return {
    submission_id: submissionId,
    status: 'REJECTED',
    listing_id: null,
    occurrences_created: 0,
    reason,
  };
}

/** Best-effort audit write; a logging failure must not fail the moderation. */
async function writeAudit(
  db: Db,
  entity: string,
  entityId: string,
  action: 'APPROVE' | 'REJECT',
  cityId: string,
  diff: Record<string, Json>,
): Promise<void> {
  const { error } = await db.rpc('write_audit_log', {
    p_entity: entity,
    p_entity_id: entityId,
    p_action: action,
    p_diff: diff,
    p_city_id: cityId,
  });
  if (error) console.warn('[audit] could not record action', action, error.message);
}
