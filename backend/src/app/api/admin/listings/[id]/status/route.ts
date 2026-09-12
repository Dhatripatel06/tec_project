import { withApi } from '@/lib/api/handler';
import { ok } from '@/lib/api/response';
import { parseBody, parseParam, requireUser } from '@/lib/api/context';
import { uuid } from '@/lib/validation/common';
import { listingStatusChangeSchema } from '@/lib/validation/schemas';
import { changeListingStatus } from '@/lib/services/listings';
import { availableTransitions } from '@/lib/domain/lifecycle';
import { effectiveRole } from '@/lib/domain/permissions';
import { getListing } from '@/lib/services/listings';

export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/listings/:id/status — move through the lifecycle.
 *
 *   DRAFT → PENDING → PUBLISHED → EXPIRED
 *             ↓           ↓
 *         REJECTED    CANCELLED
 *
 * Publishing is curator-only. An illegal or unauthorised move returns 409
 * INVALID_TRANSITION rather than silently doing nothing.
 */
export const POST = withApi<{ id: string }>(
  async (ctx, params) => {
    requireUser(ctx);
    const id = parseParam(params.id, uuid, 'listing id');
    const { status, reason } = await parseBody(ctx.request, listingStatusChangeSchema);

    const listing = await changeListingStatus(ctx.db, ctx.actor, id, status, reason);
    const role = effectiveRole(ctx.actor, listing.city_id);

    return ok(listing, {
      available_transitions: role ? availableTransitions(listing.status, role) : [],
    });
  },
  { requireAuth: true },
);

/** GET — what moves this role may make from the current state. */
export const GET = withApi<{ id: string }>(
  async (ctx, params) => {
    requireUser(ctx);
    const id = parseParam(params.id, uuid, 'listing id');
    const listing = await getListing(ctx.db, id);
    const role = effectiveRole(ctx.actor, listing.city_id);

    return ok({
      status: listing.status,
      available_transitions: role ? availableTransitions(listing.status, role) : [],
    });
  },
  { requireAuth: true },
);
