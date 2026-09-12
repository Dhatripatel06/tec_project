import type { Db } from '../supabase/clients';
import { ApiError, ERROR_CODES } from '../api/response';
import {
  buildFeed,
  EVERGREEN_THRESHOLD,
  type FeedFilters,
  type FeedListing,
  type FeedOccurrence,
  type FeedResult,
} from '../domain/feed';
import { localiseListing, type Lang } from '../domain/i18n';
import type { SortMode } from '../domain/ranking';
import type { TimeBand } from '../time/time-bands';
import { addDays, DEFAULT_TIMEZONE, localToday, weekendDates } from '../time/zoned';
import type { CityRow } from '../../types/database';

/**
 * Feed queries.
 *
 * Everything here reads `occurrences`, never `listings` — a recurring event has
 * one listing and many occurrences, and the day view is a question about
 * occurrences. Three filters are applied in SQL rather than in memory, because
 * they are the ones that must never be got wrong:
 *
 *   local_date = the requested IST day
 *   is_cancelled = false
 *   end_at > now()          ← auto-expiry, enforced by the query itself
 *
 * The last one is why an unrun cleanup job can never surface a finished event.
 */

/** Shape of the joined row PostgREST returns. */
interface OccurrenceWithListing {
  id: string;
  listing_id: string;
  local_date: string;
  start_at: string;
  end_at: string;
  is_cancelled: boolean;
  listing: ListingJoin | null;
}

interface ListingJoin {
  id: string;
  city_id: string;
  category_id: string;
  title: string;
  title_gu: string | null;
  description: string | null;
  description_gu: string | null;
  hook: string | null;
  hook_gu: string | null;
  cover_image: string | null;
  price_type: 'free' | 'paid' | 'donation';
  price_min: number | null;
  price_max: number | null;
  is_indoor: boolean;
  is_family_friendly: boolean;
  is_evergreen: boolean;
  is_featured: boolean;
  rank_weight: number;
  status: string;
  venue_id: string | null;
  organiser_id: string | null;
  created_at: string;
  category: { slug: string; name: string; name_gu: string | null; emoji: string | null } | null;
  venue: { id: string; name: string; name_gu: string | null; lat: number | null; lng: number | null; area: string | null } | null;
  organiser: { id: string; name: string } | null;
}

const LISTING_FIELDS = `
  id, city_id, category_id, title, title_gu, description, description_gu,
  hook, hook_gu, cover_image, price_type, price_min, price_max,
  is_indoor, is_family_friendly, is_evergreen, is_featured, rank_weight,
  status, venue_id, organiser_id, created_at,
  category:categories(slug, name, name_gu, emoji),
  venue:venues(id, name, name_gu, lat, lng, area),
  organiser:organisers(id, name)
`;

function toFeedListing(row: ListingJoin): FeedListing {
  return {
    listingId: row.id,
    cityId: row.city_id,
    categoryId: row.category_id,
    categorySlug: row.category?.slug ?? '',
    title: row.title,
    titleGu: row.title_gu,
    description: row.description,
    descriptionGu: row.description_gu,
    hook: row.hook,
    hookGu: row.hook_gu,
    coverImage: row.cover_image,
    priceType: row.price_type,
    priceMin: row.price_min,
    priceMax: row.price_max,
    isIndoor: row.is_indoor,
    isFamilyFriendly: row.is_family_friendly,
    isEvergreen: row.is_evergreen,
    isFeatured: row.is_featured,
    rankWeight: row.rank_weight,
    venueId: row.venue?.id ?? row.venue_id,
    venueName: row.venue?.name ?? null,
    venueLat: row.venue?.lat ?? null,
    venueLng: row.venue?.lng ?? null,
    organiserId: row.organiser?.id ?? row.organiser_id,
    organiserName: row.organiser?.name ?? null,
    createdAt: new Date(row.created_at),
  };
}

export async function resolveCity(db: Db, cityRef?: string | null): Promise<CityRow> {
  const fallback = process.env.NEXT_PUBLIC_DEFAULT_CITY_SLUG ?? 'bhavnagar';
  const ref = cityRef?.trim() || fallback;
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(ref);

  const query = db.from('cities').select('*');
  const { data, error } = await (isUuid ? query.eq('id', ref) : query.eq('slug', ref)).maybeSingle();

  if (error) throw error;
  if (!data) throw ApiError.notFound(`City "${ref}"`, ERROR_CODES.CITY_NOT_FOUND);
  return data;
}

export interface FeedServiceQuery {
  cityRef?: string | null;
  date?: string;
  sort?: SortMode;
  lang?: Lang;
  filters?: FeedFilters;
  userLocation?: { lat: number; lng: number } | null;
  limit?: number;
  now?: Date;
}

export interface LocalisedFeedItem {
  kind: 'scheduled' | 'evergreen';
  listing_id: string;
  occurrence_id: string | null;
  title: string;
  description: string | null;
  hook: string | null;
  lang: Lang;
  language_fallbacks: string[];
  category: { id: string; slug: string; name: string; emoji: string | null } | null;
  venue: { id: string; name: string; area: string | null } | null;
  organiser: { id: string; name: string } | null;
  start_at: string | null;
  end_at: string | null;
  local_date: string | null;
  time_band: TimeBand | null;
  price: { type: string; min: number | null; max: number | null };
  is_free: boolean;
  is_indoor: boolean;
  is_family_friendly: boolean;
  is_featured: boolean;
  is_editors_pick: boolean;
  is_evergreen: boolean;
  distance_km: number | null;
  cover_image: string | null;
}

export interface FeedResponse {
  city: { id: string; slug: string; name: string; timezone: string };
  date: string;
  sections: Array<{
    band: TimeBand;
    label: string;
    items: LocalisedFeedItem[];
  }>;
  items: LocalisedFeedItem[];
}

/** Fetches one day's feed and localises it. */
export async function getFeed(
  db: Db,
  query: FeedServiceQuery,
): Promise<{ response: FeedResponse; meta: FeedResult['meta'] }> {
  const city = await resolveCity(db, query.cityRef);
  const timezone = city.timezone || DEFAULT_TIMEZONE;
  const now = query.now ?? new Date();
  const today = localToday(now, timezone);
  const date = query.date ?? today;
  const lang: Lang = query.lang ?? 'en';

  // The day's occurrences. `end_at > now` is the auto-expiry rule; for a future
  // day it is trivially true, for today it drops anything already finished.
  const { data: occurrenceRows, error: occurrenceError } = await db
    .from('occurrences')
    .select(`id, listing_id, local_date, start_at, end_at, is_cancelled, listing:listings!inner(${LISTING_FIELDS})`)
    .eq('city_id', city.id)
    .eq('local_date', date)
    .eq('is_cancelled', false)
    .eq('listing.status', 'PUBLISHED')
    .gt('end_at', now.toISOString())
    .order('start_at', { ascending: true })
    .limit(300);

  if (occurrenceError) throw occurrenceError;

  const rows = (occurrenceRows ?? []) as unknown as OccurrenceWithListing[];

  const listings = new Map<string, FeedListing>();
  const occurrences: FeedOccurrence[] = [];
  for (const row of rows) {
    if (!row.listing) continue;
    listings.set(row.listing.id, toFeedListing(row.listing));
    occurrences.push({
      occurrenceId: row.id,
      listingId: row.listing_id,
      localDate: row.local_date,
      startAt: new Date(row.start_at),
      endAt: new Date(row.end_at),
      isCancelled: row.is_cancelled,
    });
  }

  // Evergreen pool, fetched only when the day might need filling.
  let evergreenPool: FeedListing[] = [];
  if (occurrences.length < EVERGREEN_THRESHOLD) {
    const { data: evergreenRows, error: evergreenError } = await db
      .from('listings')
      .select(LISTING_FIELDS)
      .eq('city_id', city.id)
      .eq('status', 'PUBLISHED')
      .eq('is_evergreen', true)
      .limit(60);
    if (evergreenError) throw evergreenError;
    evergreenPool = ((evergreenRows ?? []) as unknown as ListingJoin[]).map(toFeedListing);
  }

  // Editor's pick of the day (PRD F1).
  const { data: pick, error: pickError } = await db
    .from('editor_picks')
    .select('listing_id')
    .eq('city_id', city.id)
    .eq('pick_date', date)
    .maybeSingle();
  if (pickError) throw pickError;

  const result = buildFeed(
    {
      date,
      now,
      timezone,
      sort: query.sort ?? 'recommended',
      filters: query.filters,
      userLocation: query.userLocation,
      isToday: date === today,
      editorsPickListingId: pick?.listing_id ?? null,
      limit: query.limit,
    },
    listings,
    occurrences,
    evergreenPool,
  );

  const localise = (item: (typeof result.items)[number]): LocalisedFeedItem => {
    const content = localiseListing(
      {
        title: item.listing.title,
        title_gu: item.listing.titleGu,
        description: item.listing.description,
        description_gu: item.listing.descriptionGu,
        hook: item.listing.hook,
        hook_gu: item.listing.hookGu,
      },
      lang,
    );
    return {
      kind: item.kind,
      listing_id: item.listingId,
      occurrence_id: item.occurrence?.occurrenceId ?? null,
      title: content.title,
      description: content.description,
      hook: content.hook,
      lang,
      language_fallbacks: content.fallbacks,
      category: item.listing.categorySlug
        ? {
            id: item.listing.categoryId,
            slug: item.listing.categorySlug,
            name: item.listing.categorySlug,
            emoji: null,
          }
        : null,
      venue: item.listing.venueId
        ? { id: item.listing.venueId, name: item.listing.venueName ?? '', area: null }
        : null,
      organiser: item.listing.organiserId
        ? { id: item.listing.organiserId, name: item.listing.organiserName ?? '' }
        : null,
      start_at: item.occurrence?.startAt.toISOString() ?? null,
      end_at: item.occurrence?.endAt.toISOString() ?? null,
      local_date: item.occurrence?.localDate ?? null,
      time_band: item.band,
      price: {
        type: item.listing.priceType,
        min: item.listing.priceMin,
        max: item.listing.priceMax,
      },
      is_free: item.listing.priceType === 'free',
      is_indoor: item.listing.isIndoor,
      is_family_friendly: item.listing.isFamilyFriendly,
      is_featured: item.listing.isFeatured,
      is_editors_pick: item.isEditorsPick,
      is_evergreen: item.isEvergreen,
      distance_km: item.distanceKm,
      cover_image: item.listing.coverImage,
    };
  };

  return {
    response: {
      city: { id: city.id, slug: city.slug, name: city.name, timezone },
      date,
      sections: result.sections.map((section) => ({
        band: section.band,
        label: section.label[lang],
        items: section.items.map(localise),
      })),
      items: result.items.map(localise),
    },
    meta: result.meta,
  };
}

/** Today / tomorrow / weekend shortcuts (PRD F2). */
export function resolveDateRange(
  range: 'today' | 'tomorrow' | 'weekend',
  now: Date,
  timezone: string,
): string[] {
  const today = localToday(now, timezone);
  if (range === 'today') return [today];
  if (range === 'tomorrow') return [addDays(today, 1)];
  return weekendDates(today);
}
