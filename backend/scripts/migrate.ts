/**
 * Applies supabase/migrations to a Postgres database over a direct connection.
 *
 *   npm run db:migrate                 # uses SUPABASE_DB_URL from .env.local
 *   npm run db:migrate -- --dry-run    # show what would run, change nothing
 *   npm run db:migrate -- --with-shim  # ALSO apply the local auth shim
 *
 * `--with-shim` is for a throwaway Postgres only. It refuses to run against a
 * database that already looks like Supabase, because the shim must never touch
 * a GoTrue-managed auth schema.
 *
 * Each migration runs inside its own transaction and is recorded in
 * public.schema_migrations, so re-running only applies what is new.
 */
import { config } from 'dotenv';
import { Client } from 'pg';
import {
  loadLocalShim,
  loadMigrations,
  MIGRATIONS_TABLE_SQL,
} from '../src/lib/db/migrations';
import { connectionFromEnv, describeConnection } from '../src/lib/db/connection';

config({ path: '.env.local' });
config({ path: '.env' });

const args = new Set(process.argv.slice(2));
const dryRun = args.has('--dry-run');
const withShim = args.has('--with-shim');

async function looksLikeSupabase(client: Client): Promise<boolean> {
  const { rows } = await client.query<{ present: boolean }>(
    `select exists (
       select 1 from pg_proc p
       join pg_namespace n on n.oid = p.pronamespace
       where n.nspname = 'auth' and p.proname = 'uid'
     ) or exists (
       select 1 from pg_roles where rolname = 'supabase_auth_admin'
     ) as present`,
  );
  return rows[0]?.present ?? false;
}

async function main(): Promise<void> {
  const conn = connectionFromEnv();
  const client = new Client(conn);

  await client.connect();
  console.info(`Connected to ${describeConnection(conn)}`);

  const isSupabase = await looksLikeSupabase(client);
  console.info(`Target looks like: ${isSupabase ? 'a real Supabase project' : 'plain Postgres'}`);

  if (withShim) {
    if (isSupabase) {
      console.error(
        '\nREFUSING to apply the local auth shim to a Supabase project.\n' +
          'Supabase Auth already provides auth.users and auth.uid();\n' +
          'the shim exists only for throwaway test databases.',
      );
      await client.end();
      process.exit(1);
    }
    const shim = await loadLocalShim();
    if (dryRun) {
      console.info('[dry-run] would apply local_shim.sql');
    } else {
      await client.query(shim.sql);
      console.info('Applied local_shim.sql');
    }
  } else if (!isSupabase) {
    console.warn(
      'Note: this database has no auth.uid(). If it is not Supabase, re-run with --with-shim.',
    );
  }

  if (!dryRun) await client.query(MIGRATIONS_TABLE_SQL);

  const { rows } = dryRun
    ? { rows: [] as Array<{ name: string }> }
    : await client.query<{ name: string }>('select name from public.schema_migrations');
  const applied = new Set(rows.map((r) => r.name));

  const migrations = await loadMigrations();
  const pending = migrations.filter((m) => !applied.has(m.name));

  if (pending.length === 0) {
    console.info('Nothing to do — the database is up to date.');
    await client.end();
    return;
  }

  console.info(`\n${pending.length} pending migration(s):`);
  for (const migration of pending) console.info(`  - ${migration.name}`);

  if (dryRun) {
    console.info('\n[dry-run] nothing was applied.');
    await client.end();
    return;
  }

  for (const migration of pending) {
    process.stdout.write(`\nApplying ${migration.name} … `);
    try {
      await client.query('begin');
      await client.query(migration.sql);
      await client.query('insert into public.schema_migrations (name) values ($1)', [
        migration.name,
      ]);
      await client.query('commit');
      console.info('ok');
    } catch (error) {
      await client.query('rollback');
      console.error('FAILED (rolled back)');
      console.error((error as Error).message);
      await client.end();
      process.exit(1);
    }
  }

  console.info('\nAll migrations applied.');
  await client.end();
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
