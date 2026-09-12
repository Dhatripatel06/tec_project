import { withApi } from '@/lib/api/handler';
import { created } from '@/lib/api/response';
import { parseBody } from '@/lib/api/context';
import { submissionSchema } from '@/lib/validation/schemas';
import { createSubmission } from '@/lib/services/submissions';

export const dynamic = 'force-dynamic';

/**
 * POST /api/submissions — the public submission form (PRD F7).
 *
 * Open to anonymous callers by design; rate limited because it is. Always
 * lands as PENDING and never becomes a live listing without a curator.
 * The duplicate check is advisory and returned to the client for information,
 * never used to block a submission.
 */
export const POST = withApi(
  async (ctx) => {
    const input = await parseBody(ctx.request, submissionSchema);
    const submission = await createSubmission(ctx.db, input, ctx.actor.userId);

    return created(
      {
        id: submission.id,
        status: submission.status,
        potential_duplicate: submission.potential_duplicate,
      },
      {
        message: 'Submission received. A curator will review it before it goes live.',
        duplicate: submission.duplicate.potentialDuplicate
          ? {
              listing_id: submission.duplicate.bestMatch?.listingId,
              title: submission.duplicate.bestMatch?.title,
              score: submission.duplicate.bestMatch?.score,
            }
          : null,
      },
    );
  },
  { rateLimit: 'submission' },
);
