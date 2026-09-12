import { z } from 'zod';
import { withApi } from '@/lib/api/handler';
import { ok, ApiError } from '@/lib/api/response';
import { parseQuery, requireUser } from '@/lib/api/context';
import { resolveCity } from '@/lib/services/feed';
import { getDashboard } from '@/lib/services/listings';
import { isStaff } from '@/lib/domain/permissions';
import { localToday } from '@/lib/time/zoned';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/dashboard?city=bhavnagar
 * Coverage health for the next 7 days, flagging any day with < 5 items (PRD A1).
 */
export const GET = withApi(
  async (ctx) => {
    requireUser(ctx);
    const { city, days } = parseQuery(
      ctx.request,
      z.object({
        city: z.string().optional(),
        days: z.coerce.number().int().min(1).max(30).default(7),
      }),
    );

    const resolved = await resolveCity(ctx.db, city);
    if (!isStaff(ctx.actor, resolved.id)) {
      throw ApiError.forbidden('You do not have admin access to this city');
    }

    const today = localToday(new Date(), resolved.timezone);
    const dashboard = await getDashboard(ctx.db, resolved.id, today, days);

    return ok(dashboard, { city: resolved.slug, today });
  },
  { requireAuth: true },
);
