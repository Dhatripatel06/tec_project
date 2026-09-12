import { withApi } from '@/lib/api/handler';
import { ok, ApiError, ERROR_CODES } from '@/lib/api/response';
import { parseParam, parseQuery } from '@/lib/api/context';
import { uuid, lang as langSchema } from '@/lib/validation/common';
import { localiseListing, type Lang } from '@/lib/domain/i18n';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

/**
 * GET /api/listings/:id — full detail for one listing (PRD F4).
 *
 * Returns upcoming occurrences alongside the listing, because a recurring
 * listing has no single date and the detail page must show which ones are
 * still to come. RLS decides visibility: the public sees published listings,
 * staff and owners also see their own drafts.
 */
export const GET = withApi<{ id: string }>(async (ctx, params) => {
  const id = parseParam(params.id, uuid, 'listing id');
  const { lang } = parseQuery(ctx.request, z.object({ lang: langSchema.default('en') }));

  const { data: listing, error } = await ctx.db
    .from('listings')
    .select(
      `*,
       category:categories(id, slug, name, name_gu, emoji),
       venue:venues(id, name, name_gu, address, area, lat, lng, phone, maps_url),
       organiser:organisers(id, name, phone, whatsapp, instagram, trust_level)`,
    )
    .eq('id', id)
    .maybeSingle();

  if (error) throw error;
  if (!listing) throw ApiError.notFound('Listing', ERROR_CODES.LISTING_NOT_FOUND);

  const row = listing as unknown as Record<string, unknown> & {
    title: string;
    title_gu: string | null;
    description: string | null;
    description_gu: string | null;
    hook: string | null;
    hook_gu: string | null;
    is_evergreen: boolean;
  };

  // Upcoming, non-cancelled occurrences only — a finished one is not on.
  const { data: occurrences, error: occurrenceError } = await ctx.db
    .from('occurrences')
    .select('id, local_date, start_at, end_at, is_cancelled, is_override, note')
    .eq('listing_id', id)
    .eq('is_cancelled', false)
    .gt('end_at', new Date().toISOString())
    .order('start_at', { ascending: true })
    .limit(50);
  if (occurrenceError) throw occurrenceError;

  const { data: recurrence } = await ctx.db
    .from('recurrences')
    .select('freq, interval, byweekday, starts_on, ends_on, start_time, end_time, ends_next_day')
    .eq('listing_id', id)
    .maybeSingle();

  // Social proof without a social graph (PRD F6).
  const { count: saveCount } = await ctx.db
    .from('saves')
    .select('*', { count: 'exact', head: true })
    .eq('listing_id', id);

  const content = localiseListing(row, lang as Lang);

  return ok(
    {
      ...listing,
      title: content.title,
      description: content.description,
      hook: content.hook,
      occurrences: occurrences ?? [],
      recurrence: recurrence ?? null,
      next_occurrence: occurrences?.[0] ?? null,
      save_count: saveCount ?? 0,
      is_evergreen: row.is_evergreen,
    },
    { lang, language_fallbacks: content.fallbacks },
  );
});
