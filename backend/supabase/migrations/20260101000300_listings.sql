-- ---------------------------------------------------------------------------
-- 00300 — Listings, recurrence definitions, occurrences, editor picks.
--
-- TIME ARCHITECTURE (PRD §8): every instant is stored as `timestamptz` (UTC).
-- Wall-clock pieces of a recurrence rule (start_time / end_time / starts_on /
-- ends_on) are stored as `time` / `date` and are interpreted in the listing's
-- `timezone` (default Asia/Kolkata) when occurrences are expanded.
--
-- The feed is ALWAYS queried from `occurrences`, never from `listings`.
-- ---------------------------------------------------------------------------

-- pg_trgm may live in `extensions` (Supabase) or `public` (plain Postgres);
-- this makes `gin_trgm_ops` resolve in both. Unknown schemas are ignored.
set local search_path = public, extensions;

-- listings ------------------------------------------------------------------
create table if not exists public.listings (
  id                 uuid primary key default gen_random_uuid(),
  city_id            uuid not null references public.cities (id) on delete restrict,
  category_id        uuid not null references public.categories (id) on delete restrict,
  venue_id           uuid references public.venues (id) on delete set null,
  organiser_id       uuid references public.organisers (id) on delete set null,

  -- Ad-hoc venue text for one-off places not worth a directory entry (PRD A3
  -- "venue (linked entity or ad-hoc)"). venue_id is preferred.
  venue_text         text,

  title              text not null,
  title_gu           text,
  description        text,
  description_gu     text,
  hook               text,          -- one-line card hook (PRD F1)
  hook_gu            text,

  -- Anchor instants for the listing itself. For ONCE listings these are the
  -- event time; for recurring listings they bound the whole series and are
  -- derived from the generated occurrences.
  start_at           timestamptz,
  end_at             timestamptz,
  timezone           text not null default 'Asia/Kolkata',

  price_type         price_type not null default 'free',
  price_min          numeric(10, 2),
  price_max          numeric(10, 2),

  is_indoor          boolean not null default true,
  is_family_friendly boolean not null default false,
  is_evergreen       boolean not null default false,
  is_featured        boolean not null default false,
  rank_weight        integer not null default 0,

  capacity           integer,
  external_url       text,
  contact_phone      text,
  contact_whatsapp   text,
  cover_image        text,
  gallery            text[] not null default '{}',

  status             listing_status not null default 'DRAFT',
  source             listing_source not null default 'admin',
  submitted_by       uuid references auth.users (id) on delete set null,
  created_by         uuid references auth.users (id) on delete set null,
  published_by       uuid references auth.users (id) on delete set null,
  published_at       timestamptz,
  rejection_reason   text,

  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),

  constraint listings_title_not_blank check (length(btrim(title)) > 0),
  constraint listings_price_range check (
    price_min is null or price_max is null or price_max >= price_min
  ),
  -- A paid listing must say what it costs; free/donation must not carry a price.
  constraint listings_price_type_coherent check (
    (price_type = 'paid' and price_min is not null)
    or (price_type <> 'paid' and price_min is null and price_max is null)
  ),
  constraint listings_capacity_positive check (capacity is null or capacity > 0),
  constraint listings_time_order check (
    start_at is null or end_at is null or end_at > start_at
  ),
  -- Evergreen items are "always good" picks, not scheduled events (PRD §5).
  -- They deliberately carry no start/end instant.
  constraint listings_evergreen_has_no_schedule check (
    not is_evergreen or (start_at is null and end_at is null)
  ),
  -- A published listing must be either evergreen or actually scheduled.
  constraint listings_published_needs_schedule check (
    status <> 'PUBLISHED' or is_evergreen or start_at is not null
  ),
  constraint listings_rejection_reason_required check (
    status <> 'REJECTED' or rejection_reason is not null
  )
);

drop trigger if exists listings_set_updated_at on public.listings;
create trigger listings_set_updated_at before update on public.listings
  for each row execute function public.set_updated_at();

-- Admin listings table: filter by city + status + recency (PRD A2).
create index if not exists listings_city_status_idx
  on public.listings (city_id, status, start_at desc);
create index if not exists listings_category_idx on public.listings (category_id);
create index if not exists listings_venue_idx on public.listings (venue_id);
create index if not exists listings_organiser_idx on public.listings (organiser_id);
create index if not exists listings_submitted_by_idx on public.listings (submitted_by)
  where submitted_by is not null;
create index if not exists listings_created_by_idx on public.listings (created_by);
-- Evergreen pool lookup (PRD A9) — small, hot, city-scoped.
create index if not exists listings_evergreen_pool_idx
  on public.listings (city_id, rank_weight desc)
  where is_evergreen and status = 'PUBLISHED';
-- Expiry sweep: only published, scheduled rows can expire.
create index if not exists listings_expiry_sweep_idx
  on public.listings (end_at)
  where status = 'PUBLISHED' and not is_evergreen;
-- Duplicate detection (PRD A4): fuzzy title match inside a city.
create index if not exists listings_title_trgm_idx
  on public.listings using gin (title gin_trgm_ops);

-- listing_tags --------------------------------------------------------------
-- PRD §5: "exactly one primary category and optional tags".
create table if not exists public.listing_tags (
  listing_id uuid not null references public.listings (id) on delete cascade,
  tag        text not null,
  primary key (listing_id, tag),
  constraint listing_tags_format check (tag ~ '^[a-z0-9]+(-[a-z0-9]+)*$')
);

create index if not exists listing_tags_tag_idx on public.listing_tags (tag);

-- recurrences ---------------------------------------------------------------
-- One rule per listing. Absence of a row means the listing is a single event
-- described by listings.start_at / listings.end_at.
create table if not exists public.recurrences (
  id           uuid primary key default gen_random_uuid(),
  listing_id   uuid not null unique references public.listings (id) on delete cascade,
  freq         recurrence_freq not null,
  interval     integer not null default 1,
  -- 0 = Sunday … 6 = Saturday. Required for WEEKLY, ignored otherwise.
  byweekday    smallint[],
  starts_on    date not null,
  ends_on      date,
  count        integer,
  start_time   time not null,
  end_time     time not null,
  -- true when end_time is on the calendar day AFTER start_time (e.g. a garba
  -- night running 21:00 → 01:00).
  ends_next_day boolean not null default false,
  timezone     text not null default 'Asia/Kolkata',
  -- Dates explicitly removed from the series (cheap exceptions).
  exdates      date[] not null default '{}',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),

  constraint recurrences_interval_positive check (interval >= 1),
  constraint recurrences_count_positive check (count is null or count >= 1),
  constraint recurrences_range_order check (ends_on is null or ends_on >= starts_on),
  -- An unbounded series would generate occurrences forever.
  constraint recurrences_bounded check (
    freq = 'ONCE' or ends_on is not null or count is not null
  ),
  constraint recurrences_weekly_needs_days check (
    freq <> 'WEEKLY' or (byweekday is not null and array_length(byweekday, 1) > 0)
  ),
  -- Array containment keeps this a plain (subquery-free) check constraint.
  constraint recurrences_weekday_values check (
    byweekday is null or byweekday <@ array[0, 1, 2, 3, 4, 5, 6]::smallint[]
  ),
  constraint recurrences_time_order check (ends_next_day or end_time > start_time)
);

drop trigger if exists recurrences_set_updated_at on public.recurrences;
create trigger recurrences_set_updated_at before update on public.recurrences
  for each row execute function public.set_updated_at();

create index if not exists recurrences_listing_idx on public.recurrences (listing_id);

-- occurrences ---------------------------------------------------------------
-- The materialised expansion of every listing into concrete UTC instants.
-- THIS is the table the feed reads.
create table if not exists public.occurrences (
  id            uuid primary key default gen_random_uuid(),
  listing_id    uuid not null references public.listings (id) on delete cascade,
  -- Denormalised from the listing so the feed query needs no join to filter.
  city_id       uuid not null references public.cities (id) on delete cascade,
  -- The IST calendar date this occurrence belongs to, i.e. the day it shows up
  -- under in the feed. Derived, never client-supplied.
  local_date    date not null,
  start_at      timestamptz not null,
  end_at        timestamptz not null,
  is_cancelled  boolean not null default false,
  -- true when a curator edited this single instance (PRD A3 per-occurrence
  -- override). Overrides survive regeneration of the series.
  is_override   boolean not null default false,
  cancel_reason text,
  note          text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),

  constraint occurrences_time_order check (end_at > start_at)
);

drop trigger if exists occurrences_set_updated_at on public.occurrences;
create trigger occurrences_set_updated_at before update on public.occurrences
  for each row execute function public.set_updated_at();

-- One occurrence per listing per local day. Regeneration upserts on this key,
-- which is what lets overrides and cancellations be preserved.
create unique index if not exists occurrences_listing_date_unique_idx
  on public.occurrences (listing_id, local_date);

-- THE feed index: city + day + time, restricted to occurrences that can appear.
create index if not exists occurrences_feed_idx
  on public.occurrences (city_id, local_date, start_at)
  where not is_cancelled;
-- "Happening now" and the expiry sweep both scan on the end instant.
create index if not exists occurrences_window_idx
  on public.occurrences (city_id, start_at, end_at)
  where not is_cancelled;
create index if not exists occurrences_listing_idx on public.occurrences (listing_id);

-- editor_picks --------------------------------------------------------------
-- PRD F1 / A7: one pinned "Editor's pick of the day" per city per day.
create table if not exists public.editor_picks (
  id         uuid primary key default gen_random_uuid(),
  city_id    uuid not null references public.cities (id) on delete cascade,
  pick_date  date not null,
  listing_id uuid not null references public.listings (id) on delete cascade,
  note       text,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  constraint editor_picks_one_per_day unique (city_id, pick_date)
);

create index if not exists editor_picks_lookup_idx
  on public.editor_picks (city_id, pick_date);
create index if not exists editor_picks_listing_idx on public.editor_picks (listing_id);
