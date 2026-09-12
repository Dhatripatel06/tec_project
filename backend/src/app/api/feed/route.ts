import { z } from 'zod';
import { withApi } from '@/lib/api/handler';
import { ok } from '@/lib/api/response';
import { parseQuery } from '@/lib/api/context';
import { corsHeaders, handleCorsOptions } from '@/lib/api/cors';
import { isAllSentinel, toFeedCard, type FeedCard } from '@/lib/api/compat';
import { feedQuerySchema } from '@/lib/validation/schemas';
import { getFeed, getFeedWindow, resolveCity } from '@/lib/services/feed';
import { addDays, localToday, weekendDates } from '@/lib/time/zoned';
import type { FeedFilters } from '@/lib/domain/feed';
import type { TimeBand } from '@/lib/time/time-bands';

export const dynamic = 'force-dynamic';

export async function OPTIONS() {
  return handleCorsOptions();
}

/**
 * GET /api/feed
 *
 * Served entirely from the database: published occurrences, ranked, with the
 * evergreen fallback and the auto-expiry rule (end_at > now()) applied in the
 * query itself.
 *
 * TWO RESPONSE SHAPES, because two contracts are live:
 *
 *   default          `data` is a flat array of cards. This is what /admin and
 *                    the Vite consumer app already fetch
 *                    (/api/feed?category=all&date=all), so it is preserved
 *                    exactly - only the data behind it changed, from an
 *                    in-memory array to Postgres. Each card carries `timeBand`,
 *                    and `meta.sections` gives the band order for grouping.
 *
 *   ?shape=sections  `data` is the structured day object (sections[], items[],
 *                    localised) used by newer clients.
 *
 * Legacy query parameters are honoured: `category` and `date` accept the `all`
 * sentinel, and `search`, `timeBand`, `maxPrice`, `familyFriendly` and
 * `acIndoor` map onto the database filters.
 */

/** Days included when the caller asks for date=all. */
const ALL_WINDOW_DAYS = 7;

const legacyQuerySchema = z.object({
  shape: z.enum(['cards', 'sections']).default('cards'),
  range: z.enum(['today', 'tomorrow', 'weekend', 'all']).optional(),
  search: z.string().trim().max(120).optional(),
  timeBand: z.string().optional(),
  maxPrice: z.coerce.number().min(0).optional(),
  familyFriendly: z.enum(['true', 'false']).optional(),
  acIndoor: z.enum(['true', 'false']).optional(),
  // Accepted for contract compatibility. Not modelled in the schema, so it is
  // not used as a filter rather than silently matching everything.
  foodOnSite: z.enum(['true', 'false']).optional(),
});

/** Maps the legacy timeBand values onto the feed bands. */
function toTimeBands(value: string | undefined): TimeBand[] | undefined {
  if (!value || value === 'all') return undefined;
  const aliases: Record<string, TimeBand> = {
    now: 'happening_now',
    happening_now: 'happening_now',
    morning: 'morning',
    afternoon: 'afternoon',
    evening: 'evening',
    night: 'tonight',
    tonight: 'tonight',
    all_day: 'all_day',
    evergreen: 'all_day',
  };
  const band = aliases[value];
  return band ? [band] : undefined;
}

/** Keeps the CORS headers the existing clients rely on. */
function withCors<T extends { headers: Headers }>(response: T): T {
  for (const [key, value] of Object.entries(corsHeaders())) {
    response.headers.set(key, value);
  }
  return response;
}

export const GET = withApi(async (ctx) => {
  const url = new URL(ctx.request.url);
  const rawCategory = url.searchParams.get('category');
  const rawDate = url.searchParams.get('date');

  // `all` means "no filter". The sentinels are stripped before schema
  // validation, or date=all would fail the YYYY-MM-DD rule and 422 a working
  // client.
  const sanitised = new URL(url.toString());
  if (isAllSentinel(rawCategory)) sanitised.searchParams.delete('category');
  if (isAllSentinel(rawDate)) sanitised.searchParams.delete('date');

  const query = parseQuery(
    new Request(sanitised.toString(), { headers: ctx.request.headers }),
    feedQuerySchema,
  );
  const legacy = parseQuery(ctx.request, legacyQuerySchema);

  const city = await resolveCity(ctx.db, query.city);
  const now = new Date();
  const today = localToday(now, city.timezone);

  // date=all (and the explicit range=all) mean "the days ahead", not one day.
  const wantsWindow = legacy.range === 'all' || (rawDate !== null && isAllSentinel(rawDate));

  const filters: FeedFilters = {
    categorySlugs: query.category,
    freeOnly: query.free_only || legacy.maxPrice === 0 || undefined,
    indoor: query.indoor ?? (legacy.acIndoor === 'true' ? true : undefined),
    familyFriendly: query.family_friendly ?? (legacy.familyFriendly === 'true' ? true : undefined),
    timeOfDay: query.time_of_day ?? toTimeBands(legacy.timeBand),
    maxDistanceKm: query.distance_km,
  };

  const userLocation =
    query.lat !== undefined && query.lng !== undefined
      ? { lat: query.lat, lng: query.lng }
      : null;

  const dates = wantsWindow
    ? Array.from({ length: ALL_WINDOW_DAYS }, (_, index) => addDays(today, index))
    : legacy.range === 'weekend'
      ? weekendDates(today)
      : legacy.range === 'tomorrow'
        ? [addDays(today, 1)]
        : legacy.range === 'today'
          ? [today]
          : [query.date ?? today];

  // -- Structured shape, for clients that ask for it -----------------------
  if (legacy.shape === 'sections') {
    const days = [];
    let realCount = 0;
    let evergreenCount = 0;
    let fallbackApplied = false;

    for (const date of dates) {
      const { response, meta } = await getFeed(ctx.db, {
        cityRef: city.id,
        date,
        sort: query.sort,
        lang: query.lang,
        filters,
        userLocation,
        limit: query.limit,
        now,
      });
      days.push(response);
      realCount += meta.realCount;
      evergreenCount += meta.evergreenCount;
      fallbackApplied = fallbackApplied || meta.evergreenFallbackApplied;
    }

    const data = days.length === 1 ? days[0] : { city: days[0]?.city, days };
    return withCors(
      ok(data, {
        shape: 'sections',
        range: legacy.range ?? (wantsWindow ? 'all' : 'date'),
        dates,
        real_count: realCount,
        evergreen_count: evergreenCount,
        evergreen_fallback_applied: fallbackApplied,
        sort: query.sort,
        lang: query.lang,
      }),
    );
  }

  // -- Card shape (default) -------------------------------------------------
  const feedWindow = await getFeedWindow(ctx.db, {
    cityRef: city.id,
    dates,
    now,
    sort: query.sort,
    filters,
    userLocation,
    limit: query.limit,
  });

  let cards: FeedCard[] = feedWindow.items.map((item) =>
    toFeedCard(item, {
      today: feedWindow.today,
      tomorrow: addDays(feedWindow.today, 1),
      timezone: city.timezone,
      lang: query.lang,
    }),
  );

  // Free-text search, applied after projection so it matches the localised
  // title and the venue name the user actually sees.
  if (legacy.search) {
    const needle = legacy.search.toLowerCase();
    cards = cards.filter(
      (card) =>
        card.title.toLowerCase().includes(needle) ||
        card.venue.toLowerCase().includes(needle) ||
        card.description.toLowerCase().includes(needle),
    );
  }

  const maxPrice = legacy.maxPrice;
  if (maxPrice !== undefined && maxPrice > 0) {
    cards = cards.filter((card) => card.price <= maxPrice);
  }

  // Band order, so a client can group the flat array without duplicating it.
  const sections: Array<{ band: string; count: number }> = [];
  for (const card of cards) {
    const existing = sections.find((section) => section.band === card.timeBand);
    if (existing) existing.count += 1;
    else sections.push({ band: card.timeBand, count: 1 });
  }

  return withCors(
    ok(cards, {
      shape: 'cards',
      count: cards.length,
      city: city.name,
      city_slug: city.slug,
      date: rawDate ?? (wantsWindow ? 'all' : (query.date ?? today)),
      category: rawCategory ?? 'all',
      dates,
      sections,
      real_count: feedWindow.meta.realCount,
      evergreen_count: feedWindow.meta.evergreenCount,
      evergreen_fallback_applied: feedWindow.meta.evergreenFallbackApplied,
      sort: query.sort,
      lang: query.lang,
    }),
  );
});
