import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { publicEnv, serverEnv } from '../config/env';
import type { Database } from '../../types/database';

/**
 * Supabase clients.
 *
 * Three of them, and the distinction matters:
 *
 *  - `createRequestClient()` — anon key + the caller's session cookie. EVERY
 *    read and write for a normal request goes through this, so RLS applies.
 *  - `createAdminClient()`   — service-role key, bypasses RLS. Used only by
 *    trusted server tasks (occurrence generation, expiry, seeds) and never in
 *    response to unverified user input. Never exposed to the browser.
 *  - `createAnonClient()`    — anon key, no session. Public reads in contexts
 *    with no cookie store.
 */

export type Db = SupabaseClient<Database>;

/**
 * Request-scoped client carrying the user's session. RLS enforced.
 *
 * Accepts a session from either transport:
 *   - `Authorization: Bearer <access_token>` — SPAs, mobile, curl, tests
 *   - Supabase auth cookies — server-rendered pages
 *
 * The bearer token wins when both are present. It is never trusted directly:
 * it is handed to Supabase, which verifies the signature, and PostgREST applies
 * RLS from the verified claims.
 */
export async function createRequestClient(accessToken?: string | null): Promise<Db> {
  const env = publicEnv();
  const cookieStore = await cookies();

  return createServerClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      ...(accessToken
        ? { global: { headers: { Authorization: `Bearer ${accessToken}` } } }
        : {}),
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // Called from a Server Component: refreshing cookies is the
            // middleware's job there, and ignoring this is the documented
            // Supabase SSR behaviour.
          }
        },
      },
    },
  );
}

/** Sessionless public client. RLS enforced as `anon`. */
export function createAnonClient(): Db {
  const env = publicEnv();
  return createClient<Database>(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/**
 * Service-role client. BYPASSES RLS — every call site must have already
 * decided the caller is allowed to do this.
 */
export function createAdminClient(): Db {
  const env = serverEnv();
  return createClient<Database>(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
