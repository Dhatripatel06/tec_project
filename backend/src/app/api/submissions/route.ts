import { withApi } from '@/lib/api/handler';
import { ok, created, fail, ERROR_CODES } from '@/lib/api/response';
import { corsHeaders, handleCorsOptions } from '@/lib/api/cors';
import { PENDING_SUBMISSIONS, SubmissionRecord, CUSTOM_ZONES, addZone } from '@/lib/api/submissions-store';

export async function OPTIONS() {
  return handleCorsOptions();
}

export const GET = withApi(async () => {
  const response = ok(PENDING_SUBMISSIONS, { count: PENDING_SUBMISSIONS.length, zones: CUSTOM_ZONES });
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

  const { title, category, date, dateText, venue, area, price, contact, organizer, description, image } = body;

  if (!title) {
    return fail(ERROR_CODES.VALIDATION_FAILED, 'Title is required for submission');
  }

  if (area && typeof area === 'string') {
    addZone(area);
  }

  const newSubmission: SubmissionRecord = {
    id: `sub-${Date.now()}`,
    title: String(title),
    category: String(category || 'culture'),
    date: String(dateText || date || 'Today, 7:00 PM'),
    venue: String(venue ? `${venue}${area ? `, ${area}` : ''}` : 'Bhavnagar Venue'),
    price: price ? Number(price) : 0,
    contact: String(contact || ''),
    organizer: String(organizer || 'Community Contributor'),
    description: String(description || ''),
    status: 'NEEDS_REVIEW',
    image: String(image || ''),
    isUrgent: false,
    createdAt: new Date().toISOString(),
  };

  PENDING_SUBMISSIONS.unshift(newSubmission);

  const response = created(newSubmission, {
    message: 'Listing submitted successfully for curation.',
    zones: CUSTOM_ZONES,
  });

  const headers = corsHeaders();
  Object.entries(headers).forEach(([k, v]) => response.headers.set(k, v));
  return response;
});
