import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export interface MigrationFile {
  /** File name, e.g. `20260101000300_listings.sql`. Doubles as the version key. */
  name: string;
  sql: string;
}

function supabaseDir(): string {
  // src/lib/db -> backend root -> supabase
  const here = path.dirname(fileURLToPath(import.meta.url));
  return path.resolve(here, '../../../supabase');
}

export function migrationsDir(): string {
  return path.join(supabaseDir(), 'migrations');
}

/**
 * The local-only auth shim. It lives outside `migrations/` so that
 * `supabase db push` cannot reach it — see the header of the file itself.
 */
export function localShimPath(): string {
  return path.join(supabaseDir(), 'testing', 'local_shim.sql');
}

export async function loadLocalShim(): Promise<MigrationFile> {
  const file = localShimPath();
  return { name: 'local_shim.sql', sql: await readFile(file, 'utf8') };
}

/**
 * Loads every migration in lexical order. File names are timestamp-prefixed,
 * so lexical order is chronological order.
 */
export async function loadMigrations(dir = migrationsDir()): Promise<MigrationFile[]> {
  const entries = await readdir(dir);
  const files = entries.filter((f) => f.endsWith('.sql')).sort();

  return Promise.all(
    files.map(async (name) => ({
      name,
      sql: await readFile(path.join(dir, name), 'utf8'),
    })),
  );
}

export const MIGRATIONS_TABLE_SQL = `
  create table if not exists public.schema_migrations (
    name       text primary key,
    applied_at timestamptz not null default now()
  );
`;
