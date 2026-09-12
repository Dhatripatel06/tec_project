import { z } from 'zod';
import type { Db } from '../supabase/clients';
import type { Json, SubmissionRow } from '../../types/database';
import { ManualParser } from '../parser';
import { DEFAULT_TIMEZONE, localToday } from '../time/zoned';

/**
 * Compatibility layer for the submission contract the UIs already use.
 *
 * The submit form (both the Next page and the Vite app) posts a loose,
 * display-oriented body: a free-text `dateText` like "Today, 7:00 PM", a
 * category slug, a numeric price, an `area`. The database wants structured
 * columns.
 *
 * Rather than reject that body or flatten the database to match it, the legacy
 * payload is BOTH mapped onto the structured columns AND stored verbatim in
 * `parsed_json`. Nothing the submitter typed is lost, the moderation queue can
 * show exactly what was sent, and the curator still gets parsed fields to
 * work from.
 */

/** The body the existing submit forms post. Every field is optional but title. */
export const legacySubmissionSchema = z.object({
  title: z.string().trim().min(1).max(200),
  titleGujarati: z.string().trim().max(200).optional(),
  category: z.string().trim().max(60).optional(),
  date: z.string().trim().max(120).optional(),
  dateText: z.string().trim().max(120).optional(),
  venue: z.string().trim().max(160).optional(),
  area: z.string().trim().max(120).optional(),
  price: z.union([z.number(), z.string()]).optional(),
  contact: z.string().trim().max(120).optional(),
  organizer: z.string().trim().max(160).optional(),
  description: z.string().trim().max(4000).optional(),
  image: z.string().trim().max(500).optional(),
  city_id: z.string().uuid().optional(),
});

export type LegacySubmission = z.infer<typeof legacySubmissionSchema>;

/** Numeric price from either a number or "₹250" / "Free". */
export function numericPrice(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) return Math.max(0, value);
  if (typeof value === 'string') {
    if (/free/i.test(value)) return 0;
    const match = /(\d+(?:\.\d{1,2})?)/.exec(value.replace(/,/g, ''));
    if (match) return Number(match[1]);
  }
  return 0;
}

export function priceTextFor(price: number): string {
  return price > 0 ? `₹${price}` : 'Free';
}

export interface MappedSubmission {
  title: string;
  category_id: string | null;
  event_date: string | null;
  start_time: string | null;
  end_time: string | null;
  venue_text: string | null;
  price_text: string;
  contact_phone: string | null;
  image_url: string | null;
  raw_text: string;
  parsed_json: Json;
}

/**
 * Maps a legacy body onto the structured columns.
 *
 * The free-text date goes through the same deterministic parser the admin
 * quick-add uses, so "Today, 7:00 PM - 9:00 PM" becomes a real date and time
 * rather than being dropped. Anything it cannot read stays null for a curator
 * to fill in, which is exactly what the moderation queue is for.
 */
export async function mapLegacySubmission(
  body: LegacySubmission,
  categoryIdBySlug: Map<string, string>,
  timezone: string = DEFAULT_TIMEZONE,
  now: Date = new Date(),
): Promise<MappedSubmission> {
  const dateText = body.dateText || body.date || '';
  const parsed = await new ManualParser().parse({
    rawText: [body.title, dateText, body.venue, body.description].filter(Boolean).join('\n'),
    referenceDate: localToday(now, timezone),
    timezone,
  });

  const price = numericPrice(body.price);
  const venueText = [body.venue, body.area].filter(Boolean).join(', ') || null;

  // A contact that is not a usable Indian mobile is kept in raw_text rather
  // than forced into a phone column it would not satisfy.
  const digits = (body.contact ?? '').replace(/[^\d]/g, '');
  const contactPhone =
    digits.length >= 10 && /^[6-9]/.test(digits.slice(-10)) ? `+91${digits.slice(-10)}` : null;

  const rawParts = [
    dateText ? `When: ${dateText}` : null,
    body.venue ? `Venue: ${body.venue}` : null,
    body.area ? `Area: ${body.area}` : null,
    body.organizer ? `Organiser: ${body.organizer}` : null,
    body.contact && !contactPhone ? `Contact: ${body.contact}` : null,
    body.description || null,
  ].filter(Boolean);

  return {
    title: body.title,
    category_id: body.category ? (categoryIdBySlug.get(body.category) ?? null) : null,
    event_date: parsed.parsed.date,
    start_time: parsed.parsed.start_time,
    end_time: parsed.parsed.end_time,
    venue_text: venueText,
    price_text: priceTextFor(price),
    contact_phone: contactPhone,
    image_url: body.image || null,
    raw_text: rawParts.join('\n'),
    // Verbatim record of what was submitted, so the queue can show it exactly.
    parsed_json: {
      source: 'legacy_form',
      submitted: body as unknown as Json,
      parser: {
        provider: parsed.provider,
        confidence: parsed.confidence,
        needs_review: parsed.needsReview,
      },
    } as Json,
  };
}

/** The record shape the admin queue and submit form expect back. */
export interface SubmissionCard {
  id: string;
  title: string;
  titleGujarati?: string;
  category: string;
  date: string;
  venue: string;
  price: number;
  contact?: string;
  organizer: string;
  description: string;
  status: string;
  image?: string;
  isUrgent?: boolean;
  createdAt: string;
  // Superset: the persistent fields a newer client needs.
  submissionStatus: SubmissionRow['status'];
  potentialDuplicate: boolean;
  duplicateOf: string | null;
  cityId: string;
  eventDate: string | null;
  listingId: string | null;
}

interface LegacyEnvelope {
  submitted?: Partial<LegacySubmission>;
}

/** Projects a stored submission back into the card shape. */
export function toSubmissionCard(
  row: SubmissionRow & { category?: { slug: string } | null },
  now: Date = new Date(),
): SubmissionCard {
  const envelope = (row.parsed_json ?? {}) as unknown as LegacyEnvelope;
  const original = envelope.submitted ?? {};

  const price = numericPrice(original.price ?? row.price_text);
  const when =
    original.dateText ||
    original.date ||
    (row.event_date
      ? `${row.event_date}${row.start_time ? `, ${row.start_time.slice(0, 5)}` : ''}`
      : 'Date to confirm');

  // Anything submitted for today or tomorrow needs a curator sooner.
  const isUrgent = Boolean(
    row.event_date &&
      (row.event_date <= new Date(now.getTime() + 86_400_000).toISOString().slice(0, 10)),
  );

  return {
    id: row.id,
    title: row.title ?? original.title ?? 'Untitled submission',
    ...(original.titleGujarati ? { titleGujarati: original.titleGujarati } : {}),
    category: original.category ?? row.category?.slug ?? 'culture',
    date: when,
    venue: row.venue_text ?? original.venue ?? '',
    price,
    contact: row.contact_phone ?? original.contact ?? '',
    organizer: original.organizer ?? 'Community Contributor',
    description: original.description ?? row.raw_text ?? '',
    // The queue labels PENDING rows as needing review; the real status is
    // carried alongside so nothing is guessed from the label.
    status: row.status === 'PENDING' ? 'NEEDS_REVIEW' : row.status,
    image: row.image_url ?? original.image ?? '',
    isUrgent,
    createdAt: row.created_at,

    submissionStatus: row.status,
    potentialDuplicate: row.potential_duplicate,
    duplicateOf: row.duplicate_of,
    cityId: row.city_id,
    eventDate: row.event_date,
    listingId: row.listing_id,
  };
}

/**
 * The area list the submit form offers.
 *
 * Derived from the venue directory rather than an in-memory array: `zones` are
 * the areas the city actually has venues in. A brand-new area arrives as free
 * text on the submission and becomes a zone once a curator creates the venue —
 * which is the point of having a venue directory (PRD A6).
 */
export async function listZones(db: Db, cityId: string): Promise<string[]> {
  const { data, error } = await db
    .from('venues')
    .select('area')
    .eq('city_id', cityId)
    .eq('is_active', true)
    .not('area', 'is', null)
    .limit(500);
  if (error) throw error;

  const zones = new Set<string>();
  for (const row of data ?? []) {
    if (row.area) zones.add(row.area);
  }
  return [...zones].sort();
}

/** Category slug → id, for mapping the legacy `category` field. */
export async function categorySlugMap(db: Db): Promise<Map<string, string>> {
  const { data, error } = await db.from('categories').select('id, slug');
  if (error) throw error;
  return new Map((data ?? []).map((row) => [row.slug, row.id]));
}
