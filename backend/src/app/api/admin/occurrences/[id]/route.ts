import { withApi } from '@/lib/api/handler';
import { ok, ApiError, ERROR_CODES } from '@/lib/api/response';
import { parseBody, parseParam, requireUser } from '@/lib/api/context';
import { uuid } from '@/lib/validation/common';
import { occurrenceUpdateSchema } from '@/lib/validation/schemas';
import { canModerate } from '@/lib/domain/permissions';
import { cancelOccurrence, overrideOccurrence, restoreOccurrence } from '@/lib/services/occurrences';

export const dynamic = 'force-dynamic';

/**
 * PATCH /api/admin/occurrences/:id — per-occurrence cancel and override (PRD A3).
 *
 * This is what lets a curator call off next Tuesday's open mic, or move one
 * night of a five-day exhibition, without touching the rest of the series.
 * Both flags survive the next regeneration of the recurrence.
 */
export const PATCH = withApi<{ id: string }>(
  async (ctx, params) => {
    requireUser(ctx);
    const id = parseParam(params.id, uuid, 'occurrence id');
    const input = await parseBody(ctx.request, occurrenceUpdateSchema);

    const { data: occurrence, error } = await ctx.db
      .from('occurrences')
      .select('id, city_id')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    if (!occurrence) throw ApiError.notFound('Occurrence', ERROR_CODES.OCCURRENCE_NOT_FOUND);

    if (!canModerate(ctx.actor, occurrence.city_id)) {
      throw ApiError.forbidden('Only a curator of this city may edit its occurrences');
    }

    if (input.is_cancelled === true) {
      return ok(await cancelOccurrence(ctx.db, id, input.cancel_reason ?? null));
    }
    if (input.is_cancelled === false) {
      return ok(await restoreOccurrence(ctx.db, id));
    }

    return ok(
      await overrideOccurrence(ctx.db, id, {
        startAt: input.start_at ? new Date(input.start_at) : undefined,
        endAt: input.end_at ? new Date(input.end_at) : undefined,
        note: input.note,
      }),
    );
  },
  { requireAuth: true },
);
