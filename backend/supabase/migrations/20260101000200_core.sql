-- ---------------------------------------------------------------------------
-- 00200 — Core reference data: cities, categories, venues, organisers,
--          user profiles and role assignments.
-- ---------------------------------------------------------------------------

-- pg_trgm may live in `extensions` (Supabase) or `public` (plain Postgres);
-- this makes `gin_trgm_ops` resolve in both. Unknown schemas are ignored.
set local search_path = public, extensions;

-- Shared updated_at trigger ------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- cities --------------------------------------------------------------------
create table if not exists public.cities (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  name_gu     text,
  slug        text not null unique,
  lat         double precision not null,
  lng         double precision not null,
  timezone    text not null default 'Asia/Kolkata',
  is_live     boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint cities_slug_format check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  constraint cities_lat_range check (lat between -90 and 90),
  constraint cities_lng_range check (lng between -180 and 180)
);

create index if not exists cities_is_live_idx on public.cities (is_live) where is_live;

drop trigger if exists cities_set_updated_at on public.cities;
create trigger cities_set_updated_at before update on public.cities
  for each row execute function public.set_updated_at();

-- categories ----------------------------------------------------------------
-- Global (not per-city): the PRD taxonomy is the same in every city.
create table if not exists public.categories (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique,
  name        text not null,
  name_gu     text,
  emoji       text,
  sort_order  integer not null default 0,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint categories_slug_format check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$')
);

create index if not exists categories_sort_order_idx on public.categories (sort_order);

drop trigger if exists categories_set_updated_at on public.categories;
create trigger categories_set_updated_at before update on public.categories
  for each row execute function public.set_updated_at();

-- venues --------------------------------------------------------------------
create table if not exists public.venues (
  id          uuid primary key default gen_random_uuid(),
  city_id     uuid not null references public.cities (id) on delete restrict,
  name        text not null,
  name_gu     text,
  address     text,
  area        text,
  lat         double precision,
  lng         double precision,
  phone       text,
  maps_url    text,
  is_active   boolean not null default true,
  created_by  uuid references auth.users (id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint venues_lat_range check (lat is null or lat between -90 and 90),
  constraint venues_lng_range check (lng is null or lng between -180 and 180),
  -- Either both coordinates or neither; a half-located venue breaks distance sort.
  constraint venues_latlng_together check ((lat is null) = (lng is null))
);

create index if not exists venues_city_id_idx on public.venues (city_id);
create index if not exists venues_city_active_idx on public.venues (city_id, is_active);
-- Fuzzy venue matching for duplicate detection (PRD A4).
create index if not exists venues_name_trgm_idx on public.venues using gin (name gin_trgm_ops);

drop trigger if exists venues_set_updated_at on public.venues;
create trigger venues_set_updated_at before update on public.venues
  for each row execute function public.set_updated_at();

-- organisers ----------------------------------------------------------------
create table if not exists public.organisers (
  id           uuid primary key default gen_random_uuid(),
  city_id      uuid not null references public.cities (id) on delete restrict,
  name         text not null,
  name_gu      text,
  phone        text,
  whatsapp     text,
  instagram    text,
  logo_url     text,
  trust_level  trust_level not null default 'NEW',
  -- PRD A4: trusted organisers may be marked auto-publish.
  auto_publish boolean not null default false,
  -- Links a Partner-role account to the organiser record it may manage.
  owner_user_id uuid references auth.users (id) on delete set null,
  is_active    boolean not null default true,
  created_by   uuid references auth.users (id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists organisers_city_id_idx on public.organisers (city_id);
create index if not exists organisers_owner_idx on public.organisers (owner_user_id)
  where owner_user_id is not null;
create index if not exists organisers_name_trgm_idx
  on public.organisers using gin (name gin_trgm_ops);

drop trigger if exists organisers_set_updated_at on public.organisers;
create trigger organisers_set_updated_at before update on public.organisers
  for each row execute function public.set_updated_at();

-- users (profile rows mirroring auth.users) ---------------------------------
-- PRD A14: "No PII beyond phone number." Name is optional and user-supplied.
create table if not exists public.users (
  id          uuid primary key references auth.users (id) on delete cascade,
  phone       text unique,
  name        text,
  city_id     uuid references public.cities (id) on delete set null,
  lang        app_lang not null default 'en',
  notif_prefs jsonb not null default
    '{"daily_digest": true, "evening_nudge": true, "categories": []}'::jsonb,
  is_blocked  boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists users_city_id_idx on public.users (city_id);

drop trigger if exists users_set_updated_at on public.users;
create trigger users_set_updated_at before update on public.users
  for each row execute function public.set_updated_at();

-- Auto-create a profile row whenever Supabase Auth creates a user.
--
-- This is the one place the schema attaches to a Supabase-managed table. It is
-- written defensively on purpose: the trigger runs inside GoTrue's signup
-- transaction, so an unhandled error here would make phone OTP signup fail
-- outright. A missing profile row is recoverable (ensureProfile() backfills on
-- first authenticated request); a broken signup is not.
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.users (id, phone)
  values (new.id, new.phone)
  on conflict (id) do nothing;
  return new;
exception
  when others then
    raise warning 'handle_new_auth_user failed for %: %', new.id, sqlerrm;
    return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_auth_user();

-- user_roles ----------------------------------------------------------------
-- city_id is NULL for SUPER_ADMIN (global) and required for every other role,
-- which is what makes city-level isolation enforceable in RLS.
create table if not exists public.user_roles (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  role        app_role not null,
  city_id     uuid references public.cities (id) on delete cascade,
  granted_by  uuid references auth.users (id) on delete set null,
  created_at  timestamptz not null default now(),
  constraint user_roles_city_required check (
    (role = 'SUPER_ADMIN' and city_id is null)
    or (role <> 'SUPER_ADMIN' and city_id is not null)
  )
);

-- One row per (user, role, city). NULLS NOT DISTINCT keeps SUPER_ADMIN unique.
create unique index if not exists user_roles_unique_idx
  on public.user_roles (user_id, role, city_id) nulls not distinct;
create index if not exists user_roles_user_idx on public.user_roles (user_id);
create index if not exists user_roles_city_idx on public.user_roles (city_id);
