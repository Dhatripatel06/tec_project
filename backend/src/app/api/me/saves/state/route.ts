import { z } from 'zod';
import { withApi } from '@/lib/api/handler';
import { ok } from '@/lib/api/response';
import { parseQuery, requireUser } from '@/lib/api/context';
import { csvOf, uuid } from '@/lib/validation/common';
import { getSavedState } from '@/lib/services/saves';

export const dynamic = 'force-dynamic';

/**
 * GET /api/me/saves/state?listing_ids=a,b,c
 *
 * Batch saved-state lookup so a feed render resolves every heart in one call.
 * Returns a map of listing_id -> boolean, including false for ids not saved.
 */
export const GET = withApi(
  async (ctx) => {
    const userId = requireUser(ctx);
    // `.default()` on a transforming schema would apply to the raw string, so
    // the empty case is handled after parsing instead.
    const { listing_ids } = parseQuery(
      ctx.request,
      z.object({ listing_ids: csvOf(uuid).optional() }),
    );
    const state = await getSavedState(ctx.db, userId, (listing_ids ?? []).slice(0, 200));
    return ok(state, { count: Object.keys(state).length });
  },
  { requireAuth: true },
);
