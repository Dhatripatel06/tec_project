import { withApi } from '@/lib/api/handler';
import { ok, noContent } from '@/lib/api/response';
import { parseBody, parseParam, requireUser } from '@/lib/api/context';
import { uuid } from '@/lib/validation/common';
import { updateListingSchema } from '@/lib/validation/schemas';
import { deleteListing, getListing, updateListing } from '@/lib/services/listings';

export const dynamic = 'force-dynamic';

/** GET /api/admin/listings/:id — the full record for the editor (PRD A3). */
export const GET = withApi<{ id: string }>(
  async (ctx, params) => {
    requireUser(ctx);
    const id = parseParam(params.id, uuid, 'listing id');
    const listing = await getListing(ctx.db, id);

    const [{ data: recurrence }, { data: tags }, { data: occurrences }] = await Promise.all([
      ctx.db.from('recurrences').select('*').eq('listing_id', id).maybeSingle(),
      ctx.db.from('listing_tags').select('tag').eq('listing_id', id),
      ctx.db
        .from('occurrences')
        .select('id, local_date, start_at, end_at, is_cancelled, is_override, cancel_reason, note')
        .eq('listing_id', id)
        .order('start_at', { ascending: true })
        .limit(200),
    ]);

    return ok({
      ...listing,
      recurrence: recurrence ?? null,
      tags: (tags ?? []).map((t) => t.tag),
      occurrences: occurrences ?? [],
    });
  },
  { requireAuth: true },
);

/** PATCH /api/admin/listings/:id — edit. Regenerates occurrences. */
export const PATCH = withApi<{ id: string }>(
  async (ctx, params) => {
    requireUser(ctx);
    const id = parseParam(params.id, uuid, 'listing id');
    const input = await parseBody(ctx.request, updateListingSchema);
    return ok(await updateListing(ctx.db, ctx.actor, id, input));
  },
  { requireAuth: true },
);

/** DELETE /api/admin/listings/:id — curator only. */
export const DELETE = withApi<{ id: string }>(
  async (ctx, params) => {
    requireUser(ctx);
    const id = parseParam(params.id, uuid, 'listing id');
    await deleteListing(ctx.db, ctx.actor, id);
    return noContent();
  },
  { requireAuth: true },
);
