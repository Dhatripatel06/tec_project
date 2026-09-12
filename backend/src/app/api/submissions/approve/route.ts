import { withApi } from '@/lib/api/handler';
import { ok, fail, ERROR_CODES } from '@/lib/api/response';
import { corsHeaders, handleCorsOptions } from '@/lib/api/cors';
import { PENDING_SUBMISSIONS } from '@/lib/api/submissions-store';
import { addLiveEvent, FeedEventResponseItem } from '@/lib/api/feed-store';

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

  const { id } = body;
  if (!id || typeof id !== 'string') {
    return fail(ERROR_CODES.VALIDATION_FAILED, 'Submission ID is required');
  }

  const index = PENDING_SUBMISSIONS.findIndex((s) => s.id === id);
  let approvedSubmission;
  if (index !== -1) {
    approvedSubmission = PENDING_SUBMISSIONS.splice(index, 1)[0];
  }

  // Construct live feed event item
  const newFeedEvent: FeedEventResponseItem = {
    id: `evt-approved-${Date.now()}`,
    listingId: `lst-${Date.now()}`,
    title: approvedSubmission?.title || (body.title as string) || 'Approved Community Event',
    titleGujarati: approvedSubmission?.titleGujarati,
    category: approvedSubmission?.category || (body.category as string) || 'culture',
    categoryName: (approvedSubmission?.category || 'culture').toUpperCase(),
    categoryBadge: 'Curator Verified',
    date: 'today',
    dateText: approvedSubmission?.date || '8:00 PM Tonight',
    startTime: '20:00',
    endTime: '22:00',
    timeBand: 'evening',
    venue: approvedSubmission?.venue || 'Bhavnagar Venue',
    address: approvedSubmission?.venue || 'Bhavnagar Hub',
    area: 'Waghawadi',
    distance: '1.5 km',
    price: approvedSubmission?.price ?? 0,
    priceText: (approvedSubmission?.price ?? 0) === 0 ? 'Free Entry' : `₹${approvedSubmission?.price}`,
    organizer: approvedSubmission?.organizer || 'Verified Organizer',
    interestedCount: 12,
    status: 'Just Approved',
    isFeatured: false,
    image: approvedSubmission?.image || 'https://lh3.googleusercontent.com/aida-public/AB6AXuBKairyZcRpTMjpTnJERNAbkEOFO31vdoPIyG22ybkw4IDUq-zHGAP3Wo1G9gz6Lijm4aBj6pCzozc9Jnhbhfhwi4Ccedu8Te3-tT9R0wfkQfrW79PaT6SnCVVr_ZIHjPWTigDYz0_rNQ8fxp_Do3LJJh1jJtpcD1Dd5jFn4fXNiJ2YniNBKOT6b7E1ZHkvumoysermLwE3gDWff6tt0mKseCODxwmfzCklXzAQjFtVOKs8PyuCbhBY1Q',
    description: approvedSubmission?.description || 'Community event verified by Bhavnagar City Curator.',
    features: { familyFriendly: true, acIndoor: false, foodOnSite: true },
  };

  addLiveEvent(newFeedEvent);

  const response = ok(
    { approvedId: id, liveEvent: newFeedEvent },
    { message: 'Submission approved and pushed live to Bhavnagar feed!' },
  );

  const headers = corsHeaders();
  Object.entries(headers).forEach(([k, v]) => response.headers.set(k, v));
  return response;
});
