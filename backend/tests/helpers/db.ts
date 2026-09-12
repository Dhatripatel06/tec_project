import { PGlite } from '@electric-sql/pglite';
import { pg_trgm } from '@electric-sql/pglite/contrib/pg_trgm';
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto';
import { uuid_ossp } from '@electric-sql/pglite/contrib/uuid_ossp';
import {
  loadLocalShim,
  loadMigrations,
  MIGRATIONS_TABLE_SQL,
} from '../../src/lib/db/migrations';

/**
 * An in-process Postgres (PGlite / WASM) with the full migration set applied.
 *
 * This is a real Postgres 18 engine, so constraints, triggers, RLS policies and
 * `set role` all behave exactly as they will on Supabase. It is NOT Supabase:
 * the `auth` schema comes from the local shim migration, and Storage / GoTrue
 * are absent. Anything depending on those is covered by the Supabase-only
 * integration suite instead.
 */
export type TestDb = PGlite;

export async function createTestDb(): Promise<TestDb> {
  const db = new PGlite({ extensions: { pg_trgm, pgcrypto, uuid_ossp } });
  await applyMigrations(db);
  return db;
}

export async function applyMigrations(db: PGlite): Promise<string[]> {
  // The shim stands in for Supabase Auth (auth.users, auth.uid()). It is applied
  // here and ONLY here — it is not part of the migration set that reaches a real
  // project.
  const shim = await loadLocalShim();
  await db.exec(shim.sql);

  const migrations = await loadMigrations();
  await db.exec(MIGRATIONS_TABLE_SQL);

  const applied: string[] = [];
  for (const migration of migrations) {
    try {
      await db.exec(migration.sql);
      await db.query('insert into public.schema_migrations (name) values ($1)', [migration.name]);
      applied.push(migration.name);
    } catch (error) {
      throw new Error(
        `Migration ${migration.name} failed: ${(error as Error).message}`,
        { cause: error },
      );
    }
  }
  return applied;
}

/**
 * Runs `fn` as a PostgREST-style client: a specific database role with a JWT
 * subject claim, which is what RLS policies and auth.uid() read. Always resets,
 * even when the callback throws, so one failing assertion cannot leak elevated
 * state into the next test.
 */
export async function asUser<T>(
  db: PGlite,
  opts: { userId?: string | null; role?: 'anon' | 'authenticated' | 'service_role' },
  fn: () => Promise<T>,
): Promise<T> {
  const role = opts.role ?? 'authenticated';
  await db.query('select set_config($1, $2, false)', [
    'request.jwt.claim.sub',
    opts.userId ?? '',
  ]);
  await db.query('select set_config($1, $2, false)', ['request.jwt.claim.role', role]);
  await db.exec(`set role ${role};`);
  try {
    return await fn();
  } finally {
    await db.exec('reset role;');
    await db.query('select set_config($1, $2, false)', ['request.jwt.claim.sub', '']);
  }
}

/** Convenience: does this statement raise (i.e. is it blocked)? */
export async function expectDenied(fn: () => Promise<unknown>): Promise<Error | null> {
  try {
    await fn();
    return null;
  } catch (error) {
    return error as Error;
  }
}
