import { groupByBand, type TimeBand, bandFor, TIME_BAND_LABELS } from '../time/time-bands';
import { haversineKm, rankItems, type RankableItem, type SortMode } from './ranking';
import { DEFAULT_TIMEZONE } from '../time/zoned';

/**
 * Feed assembly: filter → rank → evergreen fallback → group into time bands.
 *
 * Pure functions over rows that the data layer has already fetched. Keeping the
 * assembly separate from the query is what makes "a dead Tuesday still shows
 * something good" testable without a database.
 */

export type FeedItemKind = 'scheduled' | 'evergreen';

export interface FeedListing {
  listingId: string;
  cityId: string;
  categoryId: string;
  categorySlug: string;
  /** Display name of the category, for card rendering. */
  categoryName: string | null;
  title: string;
  titleGu: string | null;
  description: string | null;
  descriptionGu: string | null;
  hook: string | null;
  hookGu: string | null;
  coverImage: string | null;
  priceType: 'free' | 'paid' | 'donation';
  priceMin: number | null;
  priceMax: number | null;
  isIndoor: boolean;
  isFamilyFriendly: boolean;
  isEvergreen: boolean;
  isFeatured: boolean;
  rankWeight: number;
  venueId: string | null;
  venueName: string | null;
  venueAddress: string | null;
  venueArea: string | null;
  venueLat: number | null;
  venueLng: number | null;
  organiserId: string | null;
  organiserName: string | null;
  /** "18 interested" social proof (PRD F6). Null when not counted. */
  saveCount: number | null;
  createdAt: Date;
}

export interface FeedOccurrence {
  occurrenceId: string;
  listingId: string;
  localDate: string;
  startAt: Date;
  endAt: Date;
  isCancelled: boolean;
}

/** A scheduled item carries its occurrence; an evergreen filler does not. */
export interface FeedCandidate extends RankableItem {
  kind: FeedItemKind;
  listing: FeedListing;
  occurrence: FeedOccurrence | null;
  band: TimeBand | null;
}

export interface FeedFilters {
  categoryIds?: string[];
  categorySlugs?: string[];
  freeOnly?: boolean;
  /** true = indoor only, false = outdoor only, undefined = both. */
  indoor?: boolean;
  familyFriendly?: boolean;
  /** Kilometres from `userLocation`; ignored when no location is supplied. */
  maxDistanceKm?: number;
  timeOfDay?: TimeBand[];
}

export interface FeedRequest {
  date: string;
  now: Date;
  timezone?: string;
  sort?: SortMode;
  filters?: FeedFilters;
  userLocation?: { lat: number; lng: number } | null;
  /** Whether the day being viewed is today; `happening_now` only applies then. */
  isToday: boolean;
  editorsPickListingId?: string | null;
  /** Below this many real items, evergreen fillers are added (PRD §5). */
  minRealItems?: number;
  limit?: number;
}

/** PRD §5: "the feed auto-fills with these when a day has fewer than 5 live items". */
export const EVERGREEN_THRESHOLD = 5;
export const DEFAULT_FEED_LIMIT = 100;

export interface FeedSection {
  band: TimeBand;
  label: { en: string; gu: string };
  items: FeedCandidate[];
}

export interface FeedResult {
  date: string;
  sections: FeedSection[];
  items: FeedCandidate[];
  meta: {
    realCount: number;
    evergreenCount: number;
    totalCount: number;
    evergreenFallbackApplied: boolean;
    sort: SortMode;
    isToday: boolean;
  };
}

function distanceFor(
  listing: FeedListing,
  userLocation: { lat: number; lng: number } | null | undefined,
): number | null {
  if (!userLocation || listing.venueLat === null || listing.venueLng === null) return null;
  return (
    Math.round(
      haversineKm(userLocation, { lat: listing.venueLat, lng: listing.venueLng }) * 100,
    ) / 100
  );
}

/**
 * Builds a candidate from a published occurrence.
 * Cancelled occurrences and occurrences that have already finished never make
 * it this far — but the guard is repeated here so an unfiltered caller cannot
 * leak stale content into the feed.
 */
export function toScheduledCandidate(
  listing: FeedListing,
  occurrence: FeedOccurrence,
  ctx: {
    now: Date;
    isToday: boolean;
    timezone?: string;
    userLocation?: { lat: number; lng: number } | null;
    editorsPickListingId?: string | null;
  },
): FeedCandidate {
  const timezone = ctx.timezone ?? DEFAULT_TIMEZONE;
  return {
    kind: 'scheduled',
    listing,
    occurrence,
    listingId: listing.listingId,
    isEditorsPick: ctx.editorsPickListingId === listing.listingId,
    isFeatured: listing.isFeatured,
    rankWeight: listing.rankWeight,
    isEvergreen: false,
    startAt: occurrence.startAt,
    distanceKm: distanceFor(listing, ctx.userLocation),
    createdAt: listing.createdAt,
    band: bandFor({
      startAt: occurrence.startAt,
      endAt: occurrence.endAt,
      now: ctx.isToday ? ctx.now : null,
      timeZone: timezone,
    }),
  };
}

/**
 * Builds an evergreen filler.
 *
 * It carries no occurrence and `band: 'all_day'`, and `kind` says plainly what
 * it is. The brief is explicit about this: never pretend an evergreen
 * attraction is a scheduled event happening on that date.
 */
export function toEvergreenCandidate(
  listing: FeedListing,
  ctx: { userLocation?: { lat: number; lng: number } | null },
): FeedCandidate {
  return {
    kind: 'evergreen',
    listing,
    occurrence: null,
    listingId: listing.listingId,
    isEditorsPick: false,
    isFeatured: listing.isFeatured,
    rankWeight: listing.rankWeight,
    isEvergreen: true,
    startAt: null,
    distanceKm: distanceFor(listing, ctx.userLocation),
    createdAt: listing.createdAt,
    band: 'all_day',
  };
}

export function matchesFilters(
  candidate: FeedCandidate,
  filters: FeedFilters | undefined,
): boolean {
  if (!filters) return true;
  const { listing } = candidate;

  if (filters.categoryIds?.length && !filters.categoryIds.includes(listing.categoryId)) {
    return false;
  }
  if (filters.categorySlugs?.length && !filters.categorySlugs.includes(listing.categorySlug)) {
    return false;
  }
  if (filters.freeOnly && listing.priceType !== 'free') return false;
  if (filters.indoor !== undefined && listing.isIndoor !== filters.indoor) return false;
  if (filters.familyFriendly && !listing.isFamilyFriendly) return false;
  if (
    filters.maxDistanceKm !== undefined &&
    candidate.distanceKm !== null &&
    candidate.distanceKm > filters.maxDistanceKm
  ) {
    return false;
  }
  if (filters.timeOfDay?.length && candidate.band && !filters.timeOfDay.includes(candidate.band)) {
    return false;
  }
  return true;
}

/**
 * Deterministic daily rotation of the evergreen pool (PRD A9 "rotation
 * weights"). The same date always yields the same order, so a user who reloads
 * sees a stable feed, while consecutive days differ.
 */
export function rotateEvergreen(pool: FeedCandidate[], date: string, take: number): FeedCandidate[] {
  if (pool.length === 0 || take <= 0) return [];

  // Simple, stable date hash — no randomness, no clock.
  let seed = 0;
  for (let i = 0; i < date.length; i += 1) {
    seed = (seed * 31 + date.charCodeAt(i)) >>> 0;
  }

  // Weight by rank_weight, then rotate the weighted order by the date seed so
  // the whole pool gets airtime across a week rather than the top N always.
  const ordered = [...pool].sort(
    (a, b) => b.rankWeight - a.rankWeight || (a.listingId < b.listingId ? -1 : 1),
  );
  const offset = seed % ordered.length;
  const rotated = [...ordered.slice(offset), ...ordered.slice(0, offset)];
  return rotated.slice(0, take);
}

/**
 * Assembles the feed for one day.
 *
 * `occurrences` must already be restricted to published, non-cancelled,
 * not-yet-finished occurrences for the day — the data layer does that in SQL.
 * `evergreenPool` is the city's published evergreen listings.
 */
export function buildFeed(
  request: FeedRequest,
  listings: Map<string, FeedListing>,
  occurrences: FeedOccurrence[],
  evergreenPool: FeedListing[],
): FeedResult {
  const sort = request.sort ?? 'recommended';
  const minReal = request.minRealItems ?? EVERGREEN_THRESHOLD;
  const limit = request.limit ?? DEFAULT_FEED_LIMIT;

  const ctx = {
    now: request.now,
    isToday: request.isToday,
    timezone: request.timezone,
    userLocation: request.userLocation,
    editorsPickListingId: request.editorsPickListingId,
  };

  const scheduled: FeedCandidate[] = [];
  for (const occurrence of occurrences) {
    if (occurrence.isCancelled) continue;
    // Auto-expiry, enforced again in memory: a finished occurrence is gone.
    if (occurrence.endAt.getTime() <= request.now.getTime()) continue;
    const listing = listings.get(occurrence.listingId);
    if (!listing) continue;
    const candidate = toScheduledCandidate(listing, occurrence, ctx);
    if (matchesFilters(candidate, request.filters)) scheduled.push(candidate);
  }

  // Fallback is measured against REAL items that survived filtering, so a user
  // filtering down to "Sports, free, outdoor" also never sees an empty screen.
  const realCount = scheduled.length;
  let fillers: FeedCandidate[] = [];

  if (realCount < minReal) {
    const pool = evergreenPool
      .map((listing) => toEvergreenCandidate(listing, ctx))
      .filter((candidate) => matchesFilters(candidate, request.filters))
      .filter((candidate) => !scheduled.some((s) => s.listingId === candidate.listingId));
    fillers = rotateEvergreen(pool, request.date, minReal - realCount);
  }

  const ranked = rankItems([...scheduled, ...fillers], sort, { now: request.now }).slice(0, limit);

  const grouped = groupByBand(ranked, (item) => item.band ?? 'all_day');
  const sections: FeedSection[] = [];
  for (const [band, items] of grouped) {
    sections.push({ band, label: TIME_BAND_LABELS[band], items });
  }

  return {
    date: request.date,
    sections,
    items: ranked,
    meta: {
      realCount: ranked.filter((i) => i.kind === 'scheduled').length,
      evergreenCount: ranked.filter((i) => i.kind === 'evergreen').length,
      totalCount: ranked.length,
      evergreenFallbackApplied: fillers.length > 0,
      sort,
      isToday: request.isToday,
    },
  };
}
