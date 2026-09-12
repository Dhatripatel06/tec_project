import { z } from 'zod';
import { withApi } from '@/lib/api/handler';
import { ok, created, ApiError } from '@/lib/api/response';
import { parseBody, parseQuery, requireUser } from '@/lib/api/context';
import { resolveCity } from '@/lib/services/feed';
import { createListing, listListings } from '@/lib/services/listings';
import { createListingSchema } from '@/lib/validation/schemas';
import { csvOf, localDate, pagination, uuid } from '@/lib/validation/common';
import { effectiveRole, isStaff } from '@/lib/domain/permissions';
import type { ListingStatus } from '@/lib/domain/lifecycle';

export const dynamic = 'force-dynamic';

const statusEnum = z.enum(['DRAFT', 'PENDING', 'PUBLISHED', 'EXPIRED', 'REJECTED', 'CANCELLED']);

/** GET /api/admin/listings — the listings table (PRD A2). */
export const GET = withApi(
  async (ctx) => {
    requireUser(ctx);
    const { city, status, category_id, q, from, to, limit, offset } = parseQuery(
      ctx.request,
      pagination.extend({
        city: z.string().optional(),
        status: csvOf(statusEnum).optional(),
        category_id: uuid.optional(),
        q: z.string().trim().min(1).max(120).optional(),
        from: localDate.optional(),
        to: localDate.optional(),
      }),
    );

    const resolved = await resolveCity(ctx.db, city);
    if (!isStaff(ctx.actor, resolved.id) && !effectiveRole(ctx.actor, resolved.id)) {
      throw ApiError.forbidden('You do not have admin access to this city');
    }

    const { items, total } = await listListings(ctx.db, {
      cityId: resolved.id,
      status: status as ListingStatus[] | undefined,
      categoryId: category_id,
      q,
      from,
      to,
      limit,
      offset,
    });

    return ok(items, { city: resolved.slug, total, limit, offset, count: items.length });
  },
  { requireAuth: true },
);

/**
 * POST /api/admin/listings — create a listing.
 * `status` may be DRAFT or PENDING for anyone with access; PUBLISHED is
 * curator-only and enforced in the service.
 */
export const POST = withApi(
  async (ctx) => {
    requireUser(ctx);
    const body = await parseBody(
      ctx.request,
      z.object({ status: statusEnum.optional() }).passthrough(),
    );
    const input = createListingSchema.parse(body);
    const status = (body.status as ListingStatus | undefined) ?? 'DRAFT';

    const listing = await createListing(ctx.db, ctx.actor, input, status);
    return created(listing);
  },
  { requireAuth: true },
);
