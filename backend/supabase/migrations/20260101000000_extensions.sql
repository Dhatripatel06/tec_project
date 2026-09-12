-- ---------------------------------------------------------------------------
-- 00000 — Extensions.
--
-- Supabase-safe by construction:
--   * `if not exists` everywhere, so anything the platform already installed
--     (pgcrypto, uuid-ossp) is left completely untouched.
--   * pg_trgm is installed into the `extensions` schema when that schema
--     exists (every Supabase project has it) and into `public` otherwise
--     (plain Postgres / CI). Either way the later migrations open with
--     `set local search_path = public, extensions` so `gin_trgm_ops` resolves.
--
-- This migration does NOT touch the `auth` or `storage` schemas.
-- ---------------------------------------------------------------------------

do $$
declare
  ext_schema text;
begin
  select case
           when exists (select 1 from information_schema.schemata where schema_name = 'extensions')
             then 'extensions'
           else 'public'
         end
    into ext_schema;

  -- gen_random_uuid() is core since Postgres 13, but pgcrypto is kept for
  -- parity with Supabase defaults and for digest()/crypt() if ever needed.
  if not exists (select 1 from pg_extension where extname = 'pgcrypto') then
    execute format('create extension pgcrypto with schema %I', ext_schema);
  end if;

  if not exists (select 1 from pg_extension where extname = 'uuid-ossp') then
    execute format('create extension "uuid-ossp" with schema %I', ext_schema);
  end if;

  -- Trigram matching backs the duplicate-detection indexes on listing,
  -- venue and organiser names (PRD A4).
  if not exists (select 1 from pg_extension where extname = 'pg_trgm') then
    execute format('create extension pg_trgm with schema %I', ext_schema);
  end if;
end
$$;
