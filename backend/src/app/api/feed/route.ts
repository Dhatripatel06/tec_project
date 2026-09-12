import { withApi } from '@/lib/api/handler';
import { ok } from '@/lib/api/response';
import { corsHeaders, handleCorsOptions } from '@/lib/api/cors';
import { LIVE_EVENTS } from '@/lib/api/feed-store';

export async function OPTIONS() {
  return handleCorsOptions();
}

export const GET = withApi(async (ctx) => {
  const url = new URL(ctx.request.url);
  const category = url.searchParams.get('category') || 'all';
  const date = url.searchParams.get('date') || 'today';
  const query = (url.searchParams.get('search') || '').toLowerCase().trim();
  const timeBand = url.searchParams.get('timeBand') || 'all';
  const maxPrice = url.searchParams.get('maxPrice');
  const familyFriendly = url.searchParams.get('familyFriendly') === 'true';
  const acIndoor = url.searchParams.get('acIndoor') === 'true';
  const foodOnSite = url.searchParams.get('foodOnSite') === 'true';

  const filtered = LIVE_EVENTS.filter((item) => {
    // Category filter
    if (category !== 'all' && item.category !== category) return false;

    // Date filter
    if (date !== 'all' && date !== 'today' && date !== 'tomorrow' && date !== 'weekend' && date !== 'calendar') {
      if (item.date !== date) return false;
    }

    // Search query filter
    if (query) {
      const matchTitle = item.title.toLowerCase().includes(query);
      const matchVenue = item.venue.toLowerCase().includes(query);
      const matchDesc = item.description.toLowerCase().includes(query);
      if (!matchTitle && !matchVenue && !matchDesc) return false;
    }

    // Time band filter
    if (timeBand !== 'all' && item.timeBand !== timeBand && item.timeBand !== 'evergreen') {
      return false;
    }

    // Price filter
    if (maxPrice !== null) {
      const p = Number(maxPrice);
      if (p === 0 && item.price > 0) return false;
      if (p > 0 && item.price > p) return false;
    }

    // Vibe filters
    if (familyFriendly && !item.features.familyFriendly) return false;
    if (acIndoor && !item.features.acIndoor) return false;
    if (foodOnSite && !item.features.foodOnSite) return false;

    return true;
  });

  const response = ok(filtered, {
    count: filtered.length,
    city: 'Bhavnagar',
    date,
    category,
  });

  const headers = corsHeaders();
  Object.entries(headers).forEach(([k, v]) => response.headers.set(k, v));
  return response;
});
