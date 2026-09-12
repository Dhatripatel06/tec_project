/**
 * Post-migration health check against the configured database.
 *
 *   npm run db:verify
 *
 * Read-only. Reports tables, RLS coverage, policy and index counts, storage
 * buckets and seeded reference data — the checklist from docs/SUPABASE-SETUP.md,
 * run for you instead of pasted into the SQL editor.
 */
import { config } from 'dotenv';
import { Client } from 'pg';
import { connectionFromEnv, describeConnection } from '../src/lib/db/connection';

config({ path: '.env.local' });
config({ path: '.env' });

const EXPECTED_TABLES = [
  'audit_logs', 'categories', 'cities', 'device_tokens', 'editor_picks',
  'listing_tags', 'listings', 'notification_deliveries', 'notifications',
  'occurrences', 'organisers', 'recurrences', 'reports', 'saves',
  'submissions', 'user_roles', 'users', 'venues', 'views',
];

let failures = 0;

function check(label: string, pass: boolean, detail = ''): void {
  if (!pass) failures += 1;
  console.info(`  ${pass ? 'PASS' : 'FAIL'}  ${label}${detail ? ` — ${detail}` : ''}`);
}

async function main(): Promise<void> {
  const conn = connectionFromEnv();
  const client = new Client(conn);
  await client.connect();
  console.info(`\nVerifying ${describeConnection(conn)}\n`);

  const tables = await client.query<{ table_name: string }>(
    `select table_name from information_schema.tables
     where table_schema = 'public' and table_type = 'BASE TABLE'
     order by table_name`,
  );
  const present = new Set(tables.rows.map((r) => r.table_name));
  const missing = EXPECTED_TABLES.filter((t) => !present.has(t));

  console.info('Schema');
  check(`${EXPECTED_TABLES.length} core tables present`, missing.length === 0,
    missing.length ? `missing: ${missing.join(', ')}` : `${present.size} total incl. schema_migrations`);

  const noRls = await client.query<{ relname: string }>(
    `select c.relname from pg_class c
     join pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'public' and c.relkind = 'r'
       and c.relname <> 'schema_migrations'
       and not c.relrowsecurity
     order by c.relname`,
  );
  check('row level security enabled on every table', noRls.rows.length === 0,
    noRls.rows.length ? `without RLS: ${noRls.rows.map((r) => r.relname).join(', ')}` : '');

  const policies = await client.query<{ n: string }>(
    `select count(*)::text as n from pg_policies where schemaname = 'public'`,
  );
  check('RLS policies created', Number(policies.rows[0]?.n) >= 45, `${policies.rows[0]?.n} policies`);

  const indexes = await client.query<{ n: string }>(
    `select count(*)::text as n from pg_indexes where schemaname = 'public'`,
  );
  check('indexes created', Number(indexes.rows[0]?.n) >= 60, `${indexes.rows[0]?.n} indexes`);

  const helpers = await client.query<{ n: string }>(
    `select count(*)::text as n from pg_proc p
     join pg_namespace nsp on nsp.oid = p.pronamespace
     where nsp.nspname = 'public'
       and p.proname in ('is_super_admin','has_city_role','can_curate_city',
                         'is_city_staff','is_city_partner','owns_organiser',
                         'can_read_listing','expire_finished_listings','safe_uuid')`,
  );
  check('authorisation helper functions', Number(helpers.rows[0]?.n) === 9,
    `${helpers.rows[0]?.n}/9`);

  console.info('\nSupabase integration');
  const authTrigger = await client.query<{ n: string }>(
    `select count(*)::text as n from pg_trigger
     where tgname = 'on_auth_user_created' and not tgisinternal`,
  );
  check('profile trigger on auth.users', Number(authTrigger.rows[0]?.n) === 1);

  const buckets = await client.query<{ id: string; public: boolean }>(
    `select id, public from storage.buckets
     where id in ('listing-covers','listing-gallery','submission-posters') order by id`,
  );
  check('3 storage buckets', buckets.rows.length === 3,
    buckets.rows.map((b) => `${b.id}=${b.public ? 'public' : 'private'}`).join(', '));
  const submissions = buckets.rows.find((b) => b.id === 'submission-posters');
  check('submission-posters is private', submissions?.public === false);

  const storagePolicies = await client.query<{ n: string }>(
    `select count(*)::text as n from pg_policies
     where schemaname = 'storage' and tablename = 'objects'
       and policyname like '%listing images%' or policyname like '%submission posters%'`,
  );
  check('storage object policies', Number(storagePolicies.rows[0]?.n) >= 7,
    `${storagePolicies.rows[0]?.n} policies`);

  console.info('\nReference data');
  const cities = await client.query<{ slug: string; is_live: boolean }>(
    `select slug, is_live from public.cities order by slug`,
  );
  const bhavnagar = cities.rows.find((c) => c.slug === 'bhavnagar');
  check('Bhavnagar exists as a city', Boolean(bhavnagar),
    cities.rows.length ? `cities: ${cities.rows.map((c) => c.slug).join(', ')}` : 'no cities yet — run npm run db:seed');
  if (bhavnagar) check('Bhavnagar is live', bhavnagar.is_live);

  const categories = await client.query<{ n: string }>(
    `select count(*)::text as n from public.categories`,
  );
  check('12 PRD categories', Number(categories.rows[0]?.n) === 12,
    `${categories.rows[0]?.n} categories${Number(categories.rows[0]?.n) === 0 ? ' — run npm run db:seed' : ''}`);

  const counts = await client.query<{ listings: string; occurrences: string; evergreen: string }>(
    `select
       (select count(*) from public.listings)::text as listings,
       (select count(*) from public.occurrences)::text as occurrences,
       (select count(*) from public.listings where is_evergreen)::text as evergreen`,
  );
  const row = counts.rows[0];
  console.info(`  INFO  listings=${row?.listings} occurrences=${row?.occurrences} evergreen=${row?.evergreen}`);

  await client.end();

  console.info(
    failures === 0
      ? '\nAll checks passed.\n'
      : `\n${failures} check(s) failed.\n`,
  );
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
