import { withApi } from '@/lib/api/handler';
import { ok } from '@/lib/api/response';

export const dynamic = 'force-dynamic';

/** The PRD taxonomy, in display order. */
export const GET = withApi(async (ctx) => {
  const { data, error } = await ctx.db
    .from('categories')
    .select('id, slug, name, name_gu, emoji, sort_order')
    .eq('is_active', true)
    .order('sort_order');

  if (error) throw error;
  return ok(data ?? [], { count: data?.length ?? 0 });
});
