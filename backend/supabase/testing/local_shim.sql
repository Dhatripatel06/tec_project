-- ---------------------------------------------------------------------------
-- LOCAL / CI COMPATIBILITY SHIM — **NOT A MIGRATION**
-- ---------------------------------------------------------------------------
-- This file deliberately lives OUTSIDE supabase/migrations so that
-- `supabase db push` and `supabase db reset` can never apply it to a real
-- project. It is loaded only by the test harness (tests/helpers/db.ts) and by
-- `npm run db:migrate -- --with-shim`, against a throwaway Postgres.
--
-- Why it must not run against Supabase: it fabricates `auth.users`,
-- `auth.uid()`, `auth.role()` and `auth.jwt()`. On a real project those are
-- owned and maintained by GoTrue (supabase_auth_admin). Even guarded by
-- IF NOT EXISTS, creating objects in a platform-managed schema is not
-- something a product migration should ever attempt.
--
-- Everything the real project needs is in supabase/migrations/, which
-- references `auth.users` and `auth.uid()` but never defines them.
-- ---------------------------------------------------------------------------

create schema if not exists auth;

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then
    create role anon nologin noinherit;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin noinherit;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then
    create role service_role nologin noinherit bypassrls;
  end if;
end
$$;

create table if not exists auth.users (
  id uuid primary key default gen_random_uuid(),
  phone text unique,
  email text unique,
  created_at timestamptz not null default now()
);

-- auth.uid() / auth.role() / auth.jwt() are provided by Supabase (GoTrue).
-- Only define them when absent, and never with CREATE OR REPLACE.
do $$
begin
  if not exists (
    select 1 from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'auth' and p.proname = 'uid'
  ) then
    execute $fn$
      create function auth.uid() returns uuid
      language sql stable
      as $inner$
        select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
      $inner$;
    $fn$;
  end if;

  if not exists (
    select 1 from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'auth' and p.proname = 'role'
  ) then
    execute $fn$
      create function auth.role() returns text
      language sql stable
      as $inner$
        select coalesce(nullif(current_setting('request.jwt.claim.role', true), ''), 'anon')
      $inner$;
    $fn$;
  end if;

  if not exists (
    select 1 from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'auth' and p.proname = 'jwt'
  ) then
    execute $fn$
      create function auth.jwt() returns jsonb
      language sql stable
      as $inner$
        select coalesce(nullif(current_setting('request.jwt.claims', true), '')::jsonb, '{}'::jsonb)
      $inner$;
    $fn$;
  end if;
end
$$;

grant usage on schema public to anon, authenticated, service_role;
