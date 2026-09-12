import { z } from 'zod';
import { withApi } from '@/lib/api/handler';
import { ok, ApiError } from '@/lib/api/response';
import { parseQuery, requireUser } from '@/lib/api/context';
import { resolveCity } from '@/lib/services/feed';
import { isStaff } from '@/lib/domain/permissions';
import { pagination } from '@/lib/validation/common';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/submissions?status=PENDING&city=bhavnagar
 *
 * The moderation queue (PRD A4), oldest first so the backlog drains in order.
 * RLS already restricts rows to the caller's city; the explicit role check here
 * exists so a non-admin gets a clean 403 instead of a confusing empty list.
 */
export const GET = withApi(
  async (ctx) => {
    requireUser(ctx);
    const { status, city, limit, offset } = parseQuery(
      ctx.request,
      pagination.extend({
        status: z.enum(['PENDING', 'APPROVED', 'REJECTED']).optional(),
        city: z.string().optional(),
      }),
    );

    const resolved = await resolveCity(ctx.db, city);
    if (!isStaff(ctx.actor, resolved.id)) {
      throw ApiError.forbidden('You do not have moderation access to this city');
    }

    let query = ctx.db
      .from('submissions')
      .select(
        `id, city_id, title, raw_text, image_url, instagram_url, event_date,
         start_time, end_time, venue_id, venue_text, price_text, contact_phone,
         status, reason, potential_duplicate, duplicate_of, duplicate_score,
         submitted_by, submitter_phone, reviewed_by, reviewed_at, listing_id,
         created_at,
         category:categories(id, slug, name, emoji),
         venue:venues(id, name),
         duplicate:listings!submissions_duplicate_of_fkey(id, title)`,
        { count: 'exact' },
      )
      .eq('city_id', resolved.id)
      .order('created_at', { ascending: true })
      .range(offset, offset + limit - 1);

    if (status) query = query.eq('status', status);

    const { data, error, count } = await query;
    if (error) throw error;

    return ok(data ?? [], {
      city: resolved.slug,
      status: status ?? 'all',
      total: count ?? 0,
      limit,
      offset,
    });
  },
  { requireAuth: true },
);
