import { withApi } from '@/lib/api/handler';
import { ok, ApiError } from '@/lib/api/response';
import { parseBody, requireUser } from '@/lib/api/context';
import { parseRequestSchema } from '@/lib/validation/schemas';
import { getParser } from '@/lib/parser';
import { isStaff } from '@/lib/domain/permissions';
import { localToday } from '@/lib/time/zoned';
import { resolveCity } from '@/lib/services/feed';

export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/parse — quick-add paste parser (PRD A5).
 *
 * Takes a raw WhatsApp forward, Instagram caption or OCR text and returns
 * structured fields for the curator to correct and publish. With
 * AI_PARSER_PROVIDER=none this runs the deterministic ManualParser: no external
 * call, no key, no cost. `provider` and `needs_review` in the response say what
 * ran and what still needs a human.
 */
export const POST = withApi(
  async (ctx) => {
    requireUser(ctx);
    const input = await parseBody(ctx.request, parseRequestSchema);

    const city = await resolveCity(ctx.db, input.city_id);
    if (!isStaff(ctx.actor, city.id)) {
      throw ApiError.forbidden('You do not have admin access to this city');
    }

    const parser = getParser();
    const result = await parser.parse({
      rawText: input.raw_text,
      imageText: input.image_text,
      referenceDate: input.reference_date ?? localToday(new Date(), city.timezone),
      timezone: city.timezone,
    });

    // Resolve the guessed category slug to a real id so the editor can prefill.
    let categoryId: string | null = null;
    if (result.parsed.category) {
      const { data } = await ctx.db
        .from('categories')
        .select('id')
        .eq('slug', result.parsed.category)
        .maybeSingle();
      categoryId = data?.id ?? null;
    }

    return ok(
      { ...result.parsed, category_id: categoryId },
      {
        provider: result.provider,
        confidence: result.confidence,
        needs_review: result.needsReview,
      },
    );
  },
  { requireAuth: true, rateLimit: 'parse' },
);
