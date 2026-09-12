import { withApi } from '@/lib/api/handler';
import { ok } from '@/lib/api/response';
import { parseBody } from '@/lib/api/context';
import { analyticsBatchSchema } from '@/lib/validation/schemas';
import { trackEvents } from '@/lib/services/analytics';

export const dynamic = 'force-dynamic';

/**
 * POST /api/events — record analytics events (PRD A10).
 *
 * Open to anonymous callers (browsing needs no login) and rate limited because
 * of it. `user_id` is taken from the session, never from the body, so an event
 * cannot be attributed to someone else. Always returns 200: telemetry must
 * never break the page that emitted it.
 */
export const POST = withApi(
  async (ctx) => {
    const { events } = await parseBody(ctx.request, analyticsBatchSchema);

    const recorded = await trackEvents(
      ctx.db,
      events.map((event) => ({
        userId: ctx.actor.userId,
        listingId: event.listing_id ?? null,
        cityId: event.city_id ?? null,
        sessionId: event.session_id ?? null,
        type: event.type,
        metadata: event.metadata,
      })),
    );

    return ok({ recorded }, { submitted: events.length });
  },
  { rateLimit: 'analytics' },
);
