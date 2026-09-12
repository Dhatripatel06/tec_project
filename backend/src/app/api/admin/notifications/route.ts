import { z } from 'zod';
import { withApi } from '@/lib/api/handler';
import { ok, created, ApiError } from '@/lib/api/response';
import { parseBody, parseQuery, requireUser } from '@/lib/api/context';
import { notificationSchema } from '@/lib/validation/schemas';
import { createNotification } from '@/lib/services/notifications';
import { canSendNotifications, isStaff } from '@/lib/domain/permissions';
import { resolveCity } from '@/lib/services/feed';
import { pagination } from '@/lib/validation/common';

export const dynamic = 'force-dynamic';

/** GET /api/admin/notifications — campaign list (PRD A8). */
export const GET = withApi(
  async (ctx) => {
    requireUser(ctx);
    const { city, limit, offset } = parseQuery(
      ctx.request,
      pagination.extend({ city: z.string().optional() }),
    );
    const resolved = await resolveCity(ctx.db, city);
    if (!isStaff(ctx.actor, resolved.id)) {
      throw ApiError.forbidden('You do not have admin access to this city');
    }

    const { data, error, count } = await ctx.db
      .from('notifications')
      .select('*', { count: 'exact' })
      .eq('city_id', resolved.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
    if (error) throw error;

    return ok(data ?? [], { total: count ?? 0, limit, offset });
  },
  { requireAuth: true },
);

/** POST /api/admin/notifications — compose a campaign (not sent yet). */
export const POST = withApi(
  async (ctx) => {
    const userId = requireUser(ctx);
    const input = await parseBody(ctx.request, notificationSchema);

    if (!canSendNotifications(ctx.actor, input.city_id ?? null)) {
      throw ApiError.forbidden('Only a curator of this city may compose notifications');
    }

    return created(await createNotification(ctx.db, input, userId));
  },
  { requireAuth: true },
);
