import { withApi } from '@/lib/api/handler';
import { ok } from '@/lib/api/response';
import { corsHeaders, handleCorsOptions } from '@/lib/api/cors';

export async function OPTIONS() {
  return handleCorsOptions();
}

export interface CategoryResponseItem {
  id: string;
  slug: string;
  name: string;
  nameGu: string;
  emoji: string;
  sortOrder: number;
}

const CATEGORIES: CategoryResponseItem[] = [
  { id: 'cat-001', slug: 'culture', name: 'Culture & Natak', nameGu: 'સંસ્કૃતિ અને નાટક', emoji: '🎭', sortOrder: 1 },
  { id: 'cat-002', slug: 'exhibitions', name: 'Exhibitions & Mela', nameGu: 'પ્રદર્શન અને મેળો', emoji: '🛍️', sortOrder: 2 },
  { id: 'cat-003', slug: 'sports', name: 'Sports & Turfs', nameGu: 'રમત-ગમત અને ટર્ફ', emoji: '🏏', sortOrder: 3 },
  { id: 'cat-004', slug: 'food', name: 'Food Crawls', nameGu: 'ફૂડ અને નાસ્તો', emoji: '🍜', sortOrder: 4 },
  { id: 'cat-005', slug: 'workshops', name: 'Workshops', nameGu: 'વર્કશોપ અને કળા', emoji: '🎨', sortOrder: 5 },
  { id: 'cat-006', slug: 'social', name: 'Social & Open Mic', nameGu: 'ઓપન માઇક અને મનોરંજન', emoji: '🎤', sortOrder: 6 },
  { id: 'cat-007', slug: 'festivals', name: 'Temple & Festivals', nameGu: 'મંદિર અને ઉત્સવ', emoji: '🛕', sortOrder: 7 },
];

export const GET = withApi(async () => {
  const response = ok(CATEGORIES, { count: CATEGORIES.length });
  const headers = corsHeaders();
  Object.entries(headers).forEach(([k, v]) => response.headers.set(k, v));
  return response;
});
