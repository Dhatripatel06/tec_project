/**
 * End-to-end API smoke test against a running dev server.
 *
 *   npm run dev          # in one terminal
 *   npm run smoke        # in another
 *
 * Exercises the real HTTP surface with real Supabase sessions, so it catches
 * what unit tests cannot: auth wiring, RLS as applied through PostgREST, and
 * the JSON contract the frontend will consume.
 *
 * Requires the demo accounts from `npm run user:create` (see README).
 */
import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

config({ path: '.env.local' });
config({ path: '.env' });

const BASE = process.env.SMOKE_BASE_URL ?? 'http://localhost:3000';

const ACCOUNTS = {
  user: { email: 'demo@aajesu.test', password: 'demo12345' },
  curator: { email: 'curator@aajesu.test', password: 'curator12345' },
};

let passed = 0;
let failed = 0;
const failures: string[] = [];

function check(label: string, condition: boolean, detail = ''): void {
  if (condition) {
    passed += 1;
    console.info(`  PASS  ${label}${detail ? ` — ${detail}` : ''}`);
  } else {
    failed += 1;
    failures.push(label);
    console.error(`  FAIL  ${label}${detail ? ` — ${detail}` : ''}`);
  }
}

interface ApiEnvelope<T = unknown> {
  data: T | null;
  error: { code: string; message: string } | null;
  meta?: Record<string, unknown>;
}

async function api<T = unknown>(
  path: string,
  options: { method?: string; token?: string; body?: unknown } = {},
): Promise<{ status: number; body: ApiEnvelope<T> }> {
  const response = await fetch(`${BASE}${path}`, {
    method: options.method ?? 'GET',
    headers: {
      'content-type': 'application/json',
      ...(options.token ? { authorization: `Bearer ${options.token}` } : {}),
    },
    ...(options.body ? { body: JSON.stringify(options.body) } : {}),
  });
  const body = (await response.json()) as ApiEnvelope<T>;
  return { status: response.status, body };
}

async function signIn(account: { email: string; password: string }): Promise<string> {
  const client = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } },
  );
  const { data, error } = await client.auth.signInWithPassword(account);
  if (error || !data.session) {
    throw new Error(`Could not sign in as ${account.email}: ${error?.message ?? 'no session'}`);
  }
  return data.session.access_token;
}

async function main(): Promise<void> {
  console.info(`\nAPI smoke test against ${BASE}\n`);

  // ---- Public surface ----------------------------------------------------
  console.info('Public endpoints');
  const health = await api<{ status: string; live_cities: number }>('/api/health');
  check('GET /api/health', health.status === 200 && health.body.data?.status === 'ok');

  const categories = await api<unknown[]>('/api/categories');
  check('GET /api/categories returns 12', categories.body.data?.length === 12);

  const cities = await api<Array<{ slug: string }>>('/api/cities');
  check(
    'GET /api/cities includes bhavnagar',
    Boolean(cities.body.data?.some((c) => c.slug === 'bhavnagar')),
  );

  const venues = await api<unknown[]>('/api/venues?city=bhavnagar');
  check('GET /api/venues', (venues.body.data?.length ?? 0) > 0, `${venues.body.data?.length} venues`);

  const organisers = await api<unknown[]>('/api/organisers?city=bhavnagar');
  check('GET /api/organisers', (organisers.body.data?.length ?? 0) > 0);

  // ---- Feed --------------------------------------------------------------
  console.info('\nFeed');
  interface FeedItem {
    listing_id: string;
    kind: string;
    is_evergreen: boolean;
    start_at: string | null;
    end_at: string | null;
    title: string;
    is_free: boolean;
  }
  interface FeedBody {
    date: string;
    city: { slug: string };
    sections: Array<{ band: string; label: string; items: FeedItem[] }>;
    items: FeedItem[];
  }

  const today = await api<FeedBody>('/api/feed?range=today');
  check('GET /api/feed?range=today', today.status === 200 && today.body.data !== null);
  const items = today.body.data?.items ?? [];
  check('feed is never empty', items.length > 0, `${items.length} items`);

  const now = Date.now();
  check(
    'no finished occurrence appears (auto-expiry)',
    items.every((i) => !i.end_at || new Date(i.end_at).getTime() > now),
  );
  check(
    'evergreen items are distinguishable and unscheduled',
    items.filter((i) => i.is_evergreen).every((i) => i.kind === 'evergreen' && i.start_at === null),
  );

  const tomorrow = await api<FeedBody>('/api/feed?range=tomorrow');
  check('GET /api/feed?range=tomorrow', (tomorrow.body.data?.items.length ?? 0) > 0);
  check(
    'tomorrow has no happening_now band',
    !tomorrow.body.data?.sections.some((s) => s.band === 'happening_now'),
  );

  const weekend = await api<{ days: FeedBody[] }>('/api/feed?range=weekend');
  check('GET /api/feed?range=weekend returns 2 days', weekend.body.data?.days.length === 2);

  const free = await api<FeedBody>('/api/feed?range=tomorrow&free_only=true');
  check(
    'filter free_only returns only free items',
    (free.body.data?.items ?? []).every((i) => i.is_free),
  );

  const gu = await api<FeedBody>('/api/feed?range=today&lang=gu');
  check('lang=gu returns content', (gu.body.data?.items.length ?? 0) > 0);

  const badDate = await api('/api/feed?date=not-a-date');
  check('invalid date is rejected with 422', badDate.status === 422, badDate.body.error?.code);

  // ---- Listing detail ----------------------------------------------------
  console.info('\nListing detail');
  const scheduled = items.find((i) => i.kind === 'scheduled');
  if (scheduled) {
    const detail = await api<{ id: string; occurrences: unknown[] }>(
      `/api/listings/${scheduled.listing_id}`,
    );
    check('GET /api/listings/:id', detail.status === 200 && detail.body.data?.id === scheduled.listing_id);
    check('detail includes upcoming occurrences', Array.isArray(detail.body.data?.occurrences));
  }
  const missing = await api('/api/listings/00000000-0000-0000-0000-000000000000');
  check('unknown listing returns 404 LISTING_NOT_FOUND',
    missing.status === 404 && missing.body.error?.code === 'LISTING_NOT_FOUND');

  const malformed = await api('/api/listings/not-a-uuid');
  check('malformed id returns 422', malformed.status === 422);

  // ---- Saves -------------------------------------------------------------
  console.info('\nSaves');
  const userToken = await signIn(ACCOUNTS.user);
  const target = items[0]!.listing_id;

  const anonSave = await api(`/api/listings/${target}/save`, { method: 'POST' });
  check('anonymous save is rejected with 401',
    anonSave.status === 401 && anonSave.body.error?.code === 'UNAUTHENTICATED');

  const save1 = await api<{ saved: boolean; save_count: number }>(
    `/api/listings/${target}/save`, { method: 'POST', token: userToken });
  check('POST save succeeds', save1.body.data?.saved === true, `count=${save1.body.data?.save_count}`);

  const save2 = await api<{ saved: boolean; save_count: number }>(
    `/api/listings/${target}/save`, { method: 'POST', token: userToken });
  check('duplicate save is safe and idempotent',
    save2.status === 200 && save2.body.data?.saved === true &&
    save2.body.data?.save_count === save1.body.data?.save_count);

  const mySaves = await api<Array<{ listing_id: string }>>('/api/me/saves', { token: userToken });
  check('GET /api/me/saves lists the save',
    Boolean(mySaves.body.data?.some((s) => s.listing_id === target)));

  const state = await api<Record<string, boolean>>(
    `/api/me/saves/state?listing_ids=${target}`, { token: userToken });
  check('saved-state batch lookup reports true', state.body.data?.[target] === true);

  const unsave = await api<{ saved: boolean }>(
    `/api/listings/${target}/save`, { method: 'DELETE', token: userToken });
  check('DELETE unsaves', unsave.body.data?.saved === false);

  const unsaveAgain = await api<{ saved: boolean }>(
    `/api/listings/${target}/save`, { method: 'DELETE', token: userToken });
  check('repeat unsave is idempotent', unsaveAgain.status === 200 && unsaveAgain.body.data?.saved === false);

  const stateAfter = await api<Record<string, boolean>>(
    `/api/me/saves/state?listing_ids=${target}`, { token: userToken });
  check('saved-state reports false after unsave', stateAfter.body.data?.[target] === false);

  await runSubmissionChecks(userToken);

  // ---- Summary -----------------------------------------------------------
  console.info(`\n${passed} passed, ${failed} failed`);
  if (failed > 0) {
    console.error(`\nFailures:\n${failures.map((f) => `  - ${f}`).join('\n')}\n`);
    process.exit(1);
  }
  console.info('All smoke checks passed.\n');
}

/** Filled in by the submissions section; kept separate for readability. */
async function runSubmissionChecks(userToken: string): Promise<void> {
  console.info('\nSubmissions & moderation');
  const curatorToken = await signIn(ACCOUNTS.curator);

  const cities = await api<Array<{ id: string; slug: string }>>('/api/cities');
  const city = cities.body.data?.find((c) => c.slug === 'bhavnagar');
  if (!city) {
    check('bhavnagar city available for submission tests', false);
    return;
  }

  const unique = Date.now();
  const submission = await api<{ id: string; status: string; potential_duplicate: boolean }>(
    '/api/submissions',
    {
      method: 'POST',
      body: {
        city_id: city.id,
        title: `Smoke Test Submission ${unique}`,
        raw_text: 'Forwarded: event at 7pm, entry free',
        event_date: new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10),
        start_time: '19:00',
        end_time: '21:00',
        venue_text: 'Test Hall',
      },
    },
  );
  check('anonymous can submit', submission.status === 201, submission.body.error?.message ?? '');
  check('submission starts PENDING', submission.body.data?.status === 'PENDING');

  const submissionId = submission.body.data?.id;
  if (!submissionId) return;

  const userQueue = await api('/api/admin/submissions', { token: userToken });
  check('non-admin cannot read the moderation queue',
    userQueue.status === 403, userQueue.body.error?.code);

  const queue = await api<Array<{ id: string }>>('/api/admin/submissions?status=PENDING', {
    token: curatorToken,
  });
  check('curator sees the pending queue',
    Boolean(queue.body.data?.some((s) => s.id === submissionId)));

  const approved = await api<{ listing_id: string; status: string }>(
    `/api/admin/submissions/${submissionId}`,
    {
      method: 'PATCH',
      token: curatorToken,
      body: {
        action: 'APPROVE',
        listing: {
          city_id: city.id,
          category_id: (await api<Array<{ id: string; slug: string }>>('/api/categories')).body
            .data?.[0]?.id,
          title: `Smoke Test Submission ${unique}`,
          venue_text: 'Test Hall',
          price_type: 'free',
          start_at: new Date(Date.now() + 3 * 86400000).toISOString(),
          end_at: new Date(Date.now() + 3 * 86400000 + 7200000).toISOString(),
        },
      },
    },
  );
  check('curator can approve into a listing',
    approved.status === 200 && Boolean(approved.body.data?.listing_id),
    approved.body.error?.message ?? '');

  if (approved.body.data?.listing_id) {
    const listing = await api<{ status: string; occurrences: unknown[] }>(
      `/api/listings/${approved.body.data.listing_id}`,
      { token: curatorToken },
    );
    check('approved listing is PUBLISHED', listing.body.data?.status === 'PUBLISHED');
    check('approved listing generated occurrences',
      (listing.body.data?.occurrences.length ?? 0) > 0);
  }
}

main().catch((error) => {
  console.error(`\nSmoke test crashed: ${error instanceof Error ? error.message : error}\n`);
  process.exit(1);
});
