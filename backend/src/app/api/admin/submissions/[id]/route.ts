import { withApi } from '@/lib/api/handler';
import { ok, ApiError, ERROR_CODES } from '@/lib/api/response';
import { parseBody, parseParam, requireUser } from '@/lib/api/context';
import { uuid } from '@/lib/validation/common';
import { submissionModerationSchema } from '@/lib/validation/schemas';
import { canModerate } from '@/lib/domain/permissions';
import {
  approveSubmission,
  draftFromSubmission,
  rejectSubmission,
  type ListingDraft,
} from '@/lib/services/submissions';

export const dynamic = 'force-dynamic';

/**
 * PATCH /api/admin/submissions/:id — approve or reject (PRD A4).
 *
 * Approving creates a PUBLISHED listing and generates its occurrences, so the
 * item appears in the feed immediately. Only a curator (or super admin) of the
 * submission's own city may do either — checked here AND by RLS.
 */
export const PATCH = withApi<{ id: string }>(
  async (ctx, params) => {
    const reviewerId = requireUser(ctx);
    const id = parseParam(params.id, uuid, 'submission id');
    const input = await parseBody(ctx.request, submissionModerationSchema);

    const { data: submission, error } = await ctx.db
      .from('submissions')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    if (!submission) throw ApiError.notFound('Submission', ERROR_CODES.SUBMISSION_NOT_FOUND);

    if (!canModerate(ctx.actor, submission.city_id)) {
      throw ApiError.forbidden('Only a curator of this city may moderate its submissions');
    }

    if (input.action === 'REJECT') {
      return ok(await rejectSubmission(ctx.db, id, input.reason!, reviewerId));
    }

    // Approve-with-edits is the norm; fall back to the submitted values when
    // the curator sends nothing to change.
    let draft: ListingDraft;
    if (input.listing) {
      draft = input.listing as ListingDraft;
    } else {
      const { data: fallbackCategory } = await ctx.db
        .from('categories')
        .select('id')
        .order('sort_order')
        .limit(1)
        .maybeSingle();
      if (!fallbackCategory) {
        throw new ApiError(ERROR_CODES.VALIDATION_FAILED, 'No categories exist to file this under');
      }
      draft = draftFromSubmission(submission, fallbackCategory.id);
    }

    return ok(await approveSubmission(ctx.db, id, draft, reviewerId));
  },
  { requireAuth: true },
);

/** GET /api/admin/submissions/:id — one submission, for the side-by-side view. */
export const GET = withApi<{ id: string }>(
  async (ctx, params) => {
    requireUser(ctx);
    const id = parseParam(params.id, uuid, 'submission id');

    const { data, error } = await ctx.db
      .from('submissions')
      .select(
        `*, category:categories(id, slug, name, emoji), venue:venues(id, name),
         duplicate:listings!submissions_duplicate_of_fkey(id, title, start_at)`,
      )
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    if (!data) throw ApiError.notFound('Submission', ERROR_CODES.SUBMISSION_NOT_FOUND);

    return ok(data);
  },
  { requireAuth: true },
);
