import { withApi } from '@/lib/api/handler';
import { ok, created } from '@/lib/api/response';
import { parseParam, requireUser } from '@/lib/api/context';
import { uuid } from '@/lib/validation/common';
import { saveListing, unsaveListing } from '@/lib/services/saves';

export const dynamic = 'force-dynamic';

/**
 * POST /api/listings/:id/save — save ("Interested").
 * Idempotent: saving twice returns 200 with saved:true rather than a conflict.
 */
export const POST = withApi<{ id: string }>(
  async (ctx, params) => {
    const userId = requireUser(ctx);
    const listingId = parseParam(params.id, uuid, 'listing id');
    const result = await saveListing(ctx.db, userId, listingId);
    return result.created ? created(result) : ok(result);
  },
  { requireAuth: true },
);

/** DELETE /api/listings/:id/save — unsave. Idempotent. */
export const DELETE = withApi<{ id: string }>(
  async (ctx, params) => {
    const userId = requireUser(ctx);
    const listingId = parseParam(params.id, uuid, 'listing id');
    return ok(await unsaveListing(ctx.db, userId, listingId));
  },
  { requireAuth: true },
);
