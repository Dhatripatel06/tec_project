import { withApi } from '@/lib/api/handler';
import { ok, created, ApiError } from '@/lib/api/response';
import { parseQuery, requireUser } from '@/lib/api/context';
import { corsHeaders, handleCorsOptions } from '@/lib/api/cors';
import { submissionSchema } from '@/lib/validation/schemas';
import { createSubmission } from '@/lib/services/submissions';
import { resolveCity } from '@/lib/services/feed';
import { isStaff } from '@/lib/domain/permissions';
import { pagination } from '@/lib/validation/common';
import {
  categorySlugMap,
  legacySubmissionSchema,
  listZones,
  mapLegacySubmission,
  toSubmissionCard,
  type SubmissionCard,
} from '@/lib/api/submissions-compat';
import { z } from 'zod';
import type { SubmissionRow } from '@/types/database';

export const dynamic = 'force-dynamic';

export async function OPTIONS() {
  return handleCorsOptions();
}

/** Keeps the CORS headers the existing clients rely on. */
function withCors<T extends { headers: Headers }>(response: T): T {
  for (const [key, value] of Object.entries(corsHeaders())) {
    response.headers.set(key, value);
  }
  return response;
}

/**
 * GET /api/submissions - the moderation queue (PRD A4).
 *
 * Backed by the database and scoped by RLS. This endpoint REQUIRES STAFF, which
 * is a deliberate change from the in-memory version it replaces: a submission
 * row carries the submitter's contact details, so an unauthenticated list would
 * publish other people's phone numbers. `/api/admin/submissions` is the same
 * queue with richer filters; this path is kept because the admin page uses it.
 *
 * `meta.zones` is preserved, now derived from the venue directory.
 */
export const GET = withApi(
  async (ctx) => {
    requireUser(ctx);
    const { city, status, limit, offset } = parseQuery(
      ctx.request,
      pagination.extend({
        city: z.string().optional(),
        status: z.enum(['PENDING', 'APPROVED', 'REJECTED']).default('PENDING'),
      }),
    );

    const resolved = await resolveCity(ctx.db, city);
    if (!isStaff(ctx.actor, resolved.id)) {
      throw ApiError.forbidden('You do not have moderation access to this city');
    }

    const { data, error, count } = await ctx.db
      .from('submissions')
      .select('*, category:categories(slug)', { count: 'exact' })
      .eq('city_id', resolved.id)
      .eq('status', status)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
    if (error) throw error;

    const rows = (data ?? []) as unknown as Array<SubmissionRow & { category: { slug: string } | null }>;
    const cards: SubmissionCard[] = rows.map((row) => toSubmissionCard(row));

    return withCors(
      ok(cards, {
        count: cards.length,
        total: count ?? cards.length,
        zones: await listZones(ctx.db, resolved.id),
        city: resolved.slug,
        status,
        limit,
        offset,
      }),
    );
  },
  { requireAuth: true },
);

/**
 * POST /api/submissions - the public submission form (PRD F7).
 *
 * Open to anonymous callers by design, and rate limited because of it. Accepts
 * either body shape:
 *
 *   legacy  { title, category, dateText, venue, area, price, contact, ... }
 *   canonical { city_id, title, event_date, start_time, venue_text, ... }
 *
 * Both are persisted to the same table as PENDING. Nothing here can publish a
 * listing: the RLS policy independently refuses any status other than PENDING
 * from an anon or user token, and a curator must approve it.
 */
export const POST = withApi(
  async (ctx) => {
    let body: unknown;
    try {
      body = await ctx.request.json();
    } catch {
      throw new ApiError('VALIDATION_FAILED', 'Request body must be valid JSON');
    }

    const canonical = submissionSchema.safeParse(body);
    const legacy = canonical.success ? null : legacySubmissionSchema.safeParse(body);

    if (!canonical.success && (!legacy || !legacy.success)) {
      // Report against the canonical schema: it is the documented contract.
      throw new ApiError(
        'VALIDATION_FAILED',
        'Submission failed validation',
        canonical.error.issues.map((issue) => ({
          path: issue.path.join('.') || '(root)',
          message: issue.message,
        })),
      );
    }

    // The legacy form does not send a city; the pilot city is the default.
    const cityRef = canonical.success ? canonical.data.city_id : legacy!.data!.city_id;
    const city = await resolveCity(ctx.db, cityRef);

    const input = canonical.success
      ? { ...canonical.data, city_id: city.id }
      : {
          city_id: city.id,
          ...(await mapLegacySubmission(
            legacy!.data!,
            await categorySlugMap(ctx.db),
            city.timezone,
          )),
        };

    const submission = await createSubmission(ctx.db, input, ctx.actor.userId);

    return withCors(
      created(
        {
          id: submission.id,
          status: submission.status,
          // The queue label the existing forms show on success.
          submissionStatus: 'NEEDS_REVIEW',
          potential_duplicate: submission.potential_duplicate,
        },
        {
          message: 'Listing submitted successfully for curation.',
          zones: await listZones(ctx.db, city.id),
          duplicate: submission.duplicate.potentialDuplicate
            ? {
                listing_id: submission.duplicate.bestMatch?.listingId,
                title: submission.duplicate.bestMatch?.title,
                score: submission.duplicate.bestMatch?.score,
              }
            : null,
        },
      ),
    );
  },
  { rateLimit: 'submission' },
);
