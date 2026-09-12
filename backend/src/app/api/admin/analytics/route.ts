import { z } from 'zod';
import { withApi } from '@/lib/api/handler';
import { ok, ApiError } from '@/lib/api/response';
import { parseQuery, requireUser } from '@/lib/api/context';
import { resolveCity } from '@/lib/services/feed';
import { getCityAnalytics, getListingStats } from '@/lib/services/analytics';
import { canViewAnalytics } from '@/lib/domain/permissions';
import { csvOf, uuid } from '@/lib/validation/common';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/analytics?city=bhavnagar&days=7
 * GET /api/admin/analytics?listing_ids=a,b,c
 *
 * City traffic, or per-listing counts for the exportable sales sheet (PRD A10).
 */
export const GET = withApi(
  async (ctx) => {
    requireUser(ctx);
    const { city, days, listing_ids } = parseQuery(
      ctx.request,
      z.object({
        city: z.string().optional(),
        days: z.coerce.number().int().min(1).max(90).default(7),
        listing_ids: csvOf(uuid).optional(),
      }),
    );

    const resolved = await resolveCity(ctx.db, city);
    if (!canViewAnalytics(ctx.actor, resolved.id)) {
      throw ApiError.forbidden('You do not have analytics access to this city');
    }

    const since = new Date(Date.now() - days * 86_400_000);

    if (listing_ids?.length) {
      const stats = await getListingStats(ctx.db, listing_ids.slice(0, 100), since);
      return ok(stats, { city: resolved.slug, days, since: since.toISOString() });
    }

    const analytics = await getCityAnalytics(ctx.db, resolved.id, since);
    return ok(analytics, { city: resolved.slug, days, since: since.toISOString() });
  },
  { requireAuth: true },
);
