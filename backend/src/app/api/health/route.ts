import { NextResponse } from 'next/server';
import { createAnonClient } from '@/lib/supabase/clients';
import { ok, fail, ERROR_CODES } from '@/lib/api/response';

export const dynamic = 'force-dynamic';

/**
 * Liveness + database reachability. Reports counts, never configuration
 * values — nothing here may leak a key or a connection string.
 */
export async function GET(): Promise<NextResponse> {
  try {
    const db = createAnonClient();
    const { count, error } = await db
      .from('cities')
      .select('*', { count: 'exact', head: true })
      .eq('is_live', true);

    if (error) {
      return fail(ERROR_CODES.INTERNAL_ERROR, 'Database unreachable', { reason: error.message });
    }

    return ok({
      status: 'ok',
      database: 'reachable',
      live_cities: count ?? 0,
      time: new Date().toISOString(),
    });
  } catch (error) {
    return fail(ERROR_CODES.INTERNAL_ERROR, 'Health check failed', {
      reason: error instanceof Error ? error.message : 'unknown',
    });
  }
}
