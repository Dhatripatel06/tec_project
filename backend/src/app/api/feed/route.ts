import { withApi } from '@/lib/api/handler';
import { ok } from '@/lib/api/response';
import { parseQuery } from '@/lib/api/context';
import { feedQuerySchema } from '@/lib/validation/schemas';
import { getFeed } from '@/lib/services/feed';
import { resolveCity } from '@/lib/services/feed';
import { addDays, localToday, weekendDates } from '@/lib/time/zoned';
import { z } from 'zod';
import type { FeedFilters } from '@/lib/domain/feed';

export const dynamic = 'force-dynamic';

/**
 * GET /api/feed
 *
 *   ?city=bhavnagar            city slug or id (defaults to the pilot city)
 *   ?date=2026-09-12           a specific IST day
 *   ?range=today|tomorrow|weekend
 *   ?category=food-drink,movies
 *   ?free_only=true &indoor=false &family_friendly=true
 *   ?time_of_day=evening,tonight
 *   ?lat= &lng= &distance_km=5
 *   ?sort=recommended|starting_soon|nearest
 *   ?lang=en|gu
 *
 * `range=weekend` returns both weekend days. Everything else returns one day.
 */
const rangeSchema = z.enum(['today', 'tomorrow', 'weekend']).optional();

export const GET = withApi(async (ctx) => {
  const query = parseQuery(ctx.request, feedQuerySchema);
  const range = parseQuery(ctx.request, z.object({ range: rangeSchema })).range;

  const city = await resolveCity(ctx.db, query.city);
  const now = new Date();
  const today = localToday(now, city.timezone);

  const dates =
    range === 'weekend'
      ? weekendDates(today)
      : range === 'tomorrow'
        ? [addDays(today, 1)]
        : range === 'today'
          ? [today]
          : [query.date ?? today];

  const filters: FeedFilters = {
    categorySlugs: query.category,
    freeOnly: query.free_only,
    indoor: query.indoor,
    familyFriendly: query.family_friendly,
    timeOfDay: query.time_of_day,
    maxDistanceKm: query.distance_km,
  };

  const userLocation =
    query.lat !== undefined && query.lng !== undefined
      ? { lat: query.lat, lng: query.lng }
      : null;

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
    fallbackApplied ||= meta.evergreenFallbackApplied;
  }

  // One day → return it directly; a range → return the days array. Keeps the
  // common case simple for the client.
  const data = days.length === 1 ? days[0] : { city: days[0]?.city, days };

  return ok(data, {
    range: range ?? 'date',
    dates,
    real_count: realCount,
    evergreen_count: evergreenCount,
    evergreen_fallback_applied: fallbackApplied,
    sort: query.sort,
    lang: query.lang,
  });
});
