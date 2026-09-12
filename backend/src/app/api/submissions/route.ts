import { withApi } from '@/lib/api/handler';
import { created, fail, ERROR_CODES } from '@/lib/api/response';
import { corsHeaders, handleCorsOptions } from '@/lib/api/cors';

export async function OPTIONS() {
  return handleCorsOptions();
}

export const POST = withApi(async (ctx) => {
  let body: Record<string, unknown>;
  try {
    body = await ctx.request.json();
  } catch {
    return fail(ERROR_CODES.VALIDATION_FAILED, 'Invalid JSON body');
  }

  const { title, category, date, venue, price, contact, organizer, description } = body;

  if (!title) {
    return fail(ERROR_CODES.VALIDATION_FAILED, 'Title is required for submission');
  }

  const newSubmission = {
    id: `sub-${Date.now()}`,
    title,
    category: category || 'culture',
    date: date || 'today',
    venue: venue || 'Bhavnagar Venue',
    price: price ? Number(price) : 0,
    contact: contact || '',
    organizer: organizer || 'Community Contributor',
    description: description || '',
    status: 'PENDING_MODERATION',
    createdAt: new Date().toISOString(),
  };

  const response = created(newSubmission, {
    message: 'Listing submitted successfully for curation.',
  });

  const headers = corsHeaders();
  Object.entries(headers).forEach(([k, v]) => response.headers.set(k, v));
  return response;
});
