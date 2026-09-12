import { withApi } from '@/lib/api/handler';
import { ok } from '@/lib/api/response';

export const dynamic = 'force-dynamic';

/** Live cities. Public: the app needs this before anyone signs in. */
export const GET = withApi(async (ctx) => {
  const { data, error } = await ctx.db
    .from('cities')
    .select('id, name, name_gu, slug, lat, lng, timezone, is_live')
    .order('name');

  if (error) throw error;
  return ok(data ?? [], { count: data?.length ?? 0 });
});
