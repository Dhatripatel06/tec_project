import { withApi } from '@/lib/api/handler';
import { ok, fail, ERROR_CODES } from '@/lib/api/response';
import { corsHeaders, handleCorsOptions } from '@/lib/api/cors';

export async function OPTIONS() {
  return handleCorsOptions();
}

// In-memory persistent set for default session fallback
const savedEventIds = new Set<string>(['evt-001', 'evt-004']);

export const GET = withApi(async () => {
  const response = ok(Array.from(savedEventIds), { count: savedEventIds.size });
  const headers = corsHeaders();
  Object.entries(headers).forEach(([k, v]) => response.headers.set(k, v));
  return response;
});

export const POST = withApi(async (ctx) => {
  let body: Record<string, unknown>;
  try {
    body = await ctx.request.json();
  } catch {
    return fail(ERROR_CODES.VALIDATION_FAILED, 'Invalid JSON body');
  }

  const { eventId, action } = body;
  if (!eventId || typeof eventId !== 'string') {
    return fail(ERROR_CODES.VALIDATION_FAILED, 'Event ID is required');
  }

  if (action === 'remove') {
    savedEventIds.delete(eventId);
  } else {
    savedEventIds.add(eventId);
  }

  const response = ok(
    { eventId, isSaved: savedEventIds.has(eventId), savedIds: Array.from(savedEventIds) },
    { message: action === 'remove' ? 'Event removed from saves' : 'Event saved' },
  );

  const headers = corsHeaders();
  Object.entries(headers).forEach(([k, v]) => response.headers.set(k, v));
  return response;
});
