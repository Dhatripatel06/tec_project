import { withApi } from '@/lib/api/handler';
import { ok, fail, ERROR_CODES } from '@/lib/api/response';
import { corsHeaders, handleCorsOptions } from '@/lib/api/cors';
import { runClearAndSeed } from '../../../../scripts/seed';

export async function OPTIONS() {
  return handleCorsOptions();
}

async function handleSeed() {
  try {
    await runClearAndSeed();
    const response = ok({ success: true }, { message: 'Database successfully cleared and seeded with authentic Bhavnagar dataset.' });
    const headers = corsHeaders();
    Object.entries(headers).forEach(([k, v]) => response.headers.set(k, v));
    return response;
  } catch (error) {
    const response = fail(ERROR_CODES.INTERNAL_ERROR, error instanceof Error ? error.message : 'Seeding failed');
    const headers = corsHeaders();
    Object.entries(headers).forEach(([k, v]) => response.headers.set(k, v));
    return response;
  }
}

export const GET = withApi(handleSeed);
export const POST = withApi(handleSeed);
