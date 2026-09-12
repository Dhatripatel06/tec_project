import { withApi } from '@/lib/api/handler';
import { ok } from '@/lib/api/response';
import { parseQuery, requireUser } from '@/lib/api/context';
import { pagination } from '@/lib/validation/common';
import { listSaves } from '@/lib/services/saves';

export const dynamic = 'force-dynamic';

/** GET /api/me/saves — the signed-in user's saved listings (PRD F6). */
export const GET = withApi(
  async (ctx) => {
    const userId = requireUser(ctx);
    const { limit, offset } = parseQuery(ctx.request, pagination);
    const { items, total } = await listSaves(ctx.db, userId, { limit, offset });
    return ok(items, { total, limit, offset, count: items.length });
  },
  { requireAuth: true },
);
