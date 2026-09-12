import type { FeedEventResponseItem } from './feed-store';
import type { FeedCandidate } from '../domain/feed';
import type { Lang } from '../domain/i18n';
import { localiseListing } from '../domain/i18n';
import { getZonedParts, DEFAULT_TIMEZONE, toLocalDateString } from '../time/zoned';
import type { TimeBand } from '../time/time-bands';

/**
 * Compatibility layer between the database-backed feed and the card shape the
 * UIs already consume.
 *
 * Both the Next admin page (`/admin`) and the Vite consumer app fetch
 * `/api/feed?category=all&date=all` and expect `data` to be a flat array of
 * camelCase cards. That contract predates this API and is genuinely required —
 * so it is preserved exactly, while the data behind it now comes from Postgres
 * rather than an in-memory array.
 *
 * The projection is a SUPERSET: every legacy field is present, plus the
 * identifiers and instants a newer client needs (`occurrenceId`, `startAt`,
 * `endAt`, `localDate`, `kind`). Nothing is lost in either direction.
 */

/** The legacy card plus the fields the persistent model adds. */
export interface FeedCard extends FeedEventResponseItem {
  /** Null for evergreen picks, which are not scheduled. */
  occurrenceId: string | null;
  /** UTC instants. `startTime`/`endTime` above are IST wall-clock strings. */
  startAt: string | null;
  endAt: string | null;
  localDate: string | null;
  /** 'scheduled' | 'evergreen' — an evergreen pick is not happening on a date. */
  kind: 'scheduled' | 'evergreen';
  isEvergreen: boolean;
  isEditorsPick: boolean;
}

const BAND_STATUS: Record<TimeBand, string> = {
  happening_now: 'Happening Now',
  morning: 'This Morning',
  afternoon: 'This Afternoon',
  evening: 'This Evening',
  tonight: 'Tonight',
  all_day: 'All Day',
};

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

/** IST wall-clock "HH:MM" for an instant. */
function localTime(instant: Date, timeZone: string): string {
  const parts = getZonedParts(instant, timeZone);
  return `${pad(parts.hour)}:${pad(parts.minute)}`;
}

/** "8:00 PM", as the cards display it. */
function displayTime(instant: Date, timeZone: string): string {
  const { hour, minute } = getZonedParts(instant, timeZone);
  const meridiem = hour >= 12 ? 'PM' : 'AM';
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${h12}:${pad(minute)} ${meridiem}`;
}

/** `date` in the legacy cards is a coarse bucket, not an ISO date. */
function dateBucket(localDate: string | null, today: string, tomorrow: string): string {
  if (!localDate) return 'evergreen';
  if (localDate === today) return 'today';
  if (localDate === tomorrow) return 'tomorrow';
  return localDate;
}

export function priceLabel(
  priceType: 'free' | 'paid' | 'donation',
  min: number | null,
  max: number | null,
): string {
  if (priceType === 'free') return 'Free Entry';
  if (priceType === 'donation') return 'Donation';
  if (min === null) return 'Paid';
  if (max !== null && max > min) return `₹${min} - ₹${max}`;
  return `₹${min} onwards`;
}

export interface CardContext {
  today: string;
  tomorrow: string;
  timezone?: string;
  lang?: Lang;
}

/** Projects one ranked feed item into the card contract. */
export function toFeedCard(item: FeedCandidate, ctx: CardContext): FeedCard {
  const timezone = ctx.timezone ?? DEFAULT_TIMEZONE;
  const lang = ctx.lang ?? 'en';
  const { listing, occurrence } = item;

  const content = localiseListing(
    {
      title: listing.title,
      title_gu: listing.titleGu,
      description: listing.description,
      description_gu: listing.descriptionGu,
      hook: listing.hook,
      hook_gu: listing.hookGu,
    },
    lang,
  );

  const localDate = occurrence
    ? occurrence.localDate
    : null;

  const price = listing.priceMin ?? 0;

  return {
    // Legacy identity: the occurrence is the thing on the page, because a
    // recurring listing appears once per day.
    id: occurrence?.occurrenceId ?? listing.listingId,
    listingId: listing.listingId,

    title: content.title,
    ...(listing.titleGu ? { titleGujarati: listing.titleGu } : {}),
    category: listing.categorySlug,
    categoryName: listing.categoryName ?? listing.categorySlug,
    categoryBadge: listing.organiserName ?? listing.categoryName ?? '',

    date: dateBucket(localDate, ctx.today, ctx.tomorrow),
    dateText: occurrence
      ? `${displayTime(occurrence.startAt, timezone)}${
          localDate === ctx.today ? ' Today' : localDate === ctx.tomorrow ? ' Tomorrow' : ''
        }`
      : 'Always on',
    startTime: occurrence ? localTime(occurrence.startAt, timezone) : '',
    endTime: occurrence ? localTime(occurrence.endAt, timezone) : '',
    timeBand: item.band ?? 'all_day',

    venue: listing.venueName ?? '',
    address: listing.venueAddress ?? listing.venueName ?? '',
    area: listing.venueArea ?? '',
    distance: item.distanceKm === null ? '' : `${item.distanceKm.toFixed(1)} km`,

    price,
    priceText: priceLabel(listing.priceType, listing.priceMin, listing.priceMax),
    organizer: listing.organiserName ?? '',
    interestedCount: listing.saveCount ?? 0,
    status: item.isEditorsPick
      ? "Editor's Pick Today"
      : BAND_STATUS[(item.band ?? 'all_day') as TimeBand],
    isFeatured: listing.isFeatured,
    image: listing.coverImage ?? '',
    description: content.description ?? content.hook ?? '',
    features: {
      familyFriendly: listing.isFamilyFriendly,
      acIndoor: listing.isIndoor,
      // Not modelled in the schema; reported as false rather than guessed.
      foodOnSite: false,
    },

    // Superset fields.
    occurrenceId: occurrence?.occurrenceId ?? null,
    startAt: occurrence?.startAt.toISOString() ?? null,
    endAt: occurrence?.endAt.toISOString() ?? null,
    localDate,
    kind: item.kind,
    isEvergreen: item.isEvergreen,
    isEditorsPick: item.isEditorsPick,
  };
}

/**
 * `all` is the legacy sentinel for "no filter" on `category` and `date`.
 * Treating it as a literal value would silently return an empty feed.
 */
export function isAllSentinel(value: string | null | undefined): boolean {
  return value === null || value === undefined || value === '' || value === 'all';
}

/** Local date of an instant, for building the today/tomorrow buckets. */
export function localDateOf(instant: Date, timeZone: string): string {
  return toLocalDateString(instant, timeZone);
}
