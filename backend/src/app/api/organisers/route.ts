import { withApi } from '@/lib/api/handler';
import { ok } from '@/lib/api/response';
import { parseQuery } from '@/lib/api/context';
import { resolveCity } from '@/lib/services/feed';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

/**
 * GET /api/organisers?city=bhavnagar — the organiser directory (PRD A6).
 * Contact details are returned because the consumer app links out to them
 * (PRD F4 "Call / WhatsApp organiser"); trust_level is admin metadata and is
 * included only for staff, which RLS already scopes.
 */
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
    .from('organisers')
    .select('id, name, name_gu, phone, whatsapp, instagram, logo_url, trust_level')
    .eq('city_id', resolved.id)
    .eq('is_active', true)
    .order('name')
    .limit(limit);

  if (q) query = query.ilike('name', `%${q}%`);

  const { data, error } = await query;
  if (error) throw error;
  return ok(data ?? [], { city: resolved.slug, count: data?.length ?? 0 });
});
