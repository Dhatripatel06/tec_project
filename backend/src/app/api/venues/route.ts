import { withApi } from '@/lib/api/handler';
import { ok } from '@/lib/api/response';
import { parseQuery } from '@/lib/api/context';
import { resolveCity } from '@/lib/services/feed';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

/** GET /api/venues?city=bhavnagar&q=victoria — the venue directory (PRD A6). */
export const GET = withApi(async (ctx) => {
  const { city, q, limit } = parseQuery(
    ctx.request,
    z.object({
      city: z.string().optional(),
      q: z.string().trim().min(1).max(100).optional(),
      limit: z.coerce.number().int().min(1).max(100).default(50),
    }),
  );

  const resolved = await resolveCity(ctx.db, city);
  let query = ctx.db
    .from('venues')
    .select('id, name, name_gu, address, area, lat, lng, phone, maps_url')
    .eq('city_id', resolved.id)
    .eq('is_active', true)
    .order('name')
    .limit(limit);

  if (q) query = query.ilike('name', `%${q}%`);

  const { data, error } = await query;
  if (error) throw error;
  return ok(data ?? [], { city: resolved.slug, count: data?.length ?? 0 });
});
