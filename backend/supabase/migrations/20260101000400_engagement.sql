-- ---------------------------------------------------------------------------
-- 00400 — Engagement & operations: saves, views (analytics), submissions,
--          notifications, reports, audit logs.
-- ---------------------------------------------------------------------------

-- saves ---------------------------------------------------------------------
create table if not exists public.saves (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  listing_id uuid not null references public.listings (id) on delete cascade,
  created_at timestamptz not null default now(),
  -- The duplicate-save guard the brief requires.
  constraint saves_user_listing_unique unique (user_id, listing_id)
);

create index if not exists saves_user_idx on public.saves (user_id, created_at desc);
create index if not exists saves_listing_idx on public.saves (listing_id);

-- views (analytics events) --------------------------------------------------
-- Deliberately a plain Postgres table (the brief: "PostgreSQL is sufficient").
-- user_id is nullable because browsing is anonymous (PRD F9).
create table if not exists public.views (
  id          uuid primary key default gen_random_uuid(),
  listing_id  uuid references public.listings (id) on delete cascade,
  city_id     uuid references public.cities (id) on delete cascade,
  user_id     uuid references auth.users (id) on delete set null,
  -- Opaque client-generated id so anonymous uniques are countable without PII.
  session_id  text,
  type        view_type not null,
  metadata    jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);

-- Per-listing analytics rollups (PRD A10).
create index if not exists views_listing_type_idx
  on public.views (listing_id, type, created_at desc);
-- Daily city traffic on the admin dashboard (PRD A1).
create index if not exists views_city_created_idx on public.views (city_id, created_at desc);
create index if not exists views_user_idx on public.views (user_id) where user_id is not null;

-- submissions ---------------------------------------------------------------
-- Public intake (PRD F7). NEVER becomes a published listing on its own.
create table if not exists public.submissions (
  id              uuid primary key default gen_random_uuid(),
  city_id         uuid not null references public.cities (id) on delete restrict,
  -- Raw intake, exactly as the PRD lists it.
  raw_text        text,
  parsed_json     jsonb,
  image_url       text,
  instagram_url   text,

  -- Structured fields the public form collects.
  title           text,
  category_id     uuid references public.categories (id) on delete set null,
  event_date      date,
  start_time      time,
  end_time        time,
  venue_id        uuid references public.venues (id) on delete set null,
  venue_text      text,
  price_text      text,
  contact_phone   text,

  status          submission_status not null default 'PENDING',
  reason          text,
  submitted_by    uuid references auth.users (id) on delete set null,
  submitter_phone text,
  reviewed_by     uuid references auth.users (id) on delete set null,
  reviewed_at     timestamptz,
  -- Set when a curator approves the submission into a real listing.
  listing_id      uuid references public.listings (id) on delete set null,

  -- Duplicate detection result (PRD A4), computed at submit time.
  potential_duplicate boolean not null default false,
  duplicate_of        uuid references public.listings (id) on delete set null,
  duplicate_score     numeric(4, 3),

  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),

  constraint submissions_has_content check (
    raw_text is not null or title is not null or image_url is not null
  ),
  constraint submissions_rejection_reason check (status <> 'REJECTED' or reason is not null),
  constraint submissions_reviewed_fields check (
    status = 'PENDING' or (reviewed_by is not null and reviewed_at is not null)
  ),
  constraint submissions_duplicate_score_range check (
    duplicate_score is null or duplicate_score between 0 and 1
  )
);

drop trigger if exists submissions_set_updated_at on public.submissions;
create trigger submissions_set_updated_at before update on public.submissions
  for each row execute function public.set_updated_at();

-- The moderation queue query (PRD A4): pending items for a city, oldest first.
create index if not exists submissions_queue_idx
  on public.submissions (city_id, status, created_at);
create index if not exists submissions_submitted_by_idx
  on public.submissions (submitted_by) where submitted_by is not null;

-- notifications -------------------------------------------------------------
-- Campaign records (PRD A8). Delivery is behind a pluggable provider; this
-- table is the source of truth regardless of which provider sends.
create table if not exists public.notifications (
  id           uuid primary key default gen_random_uuid(),
  city_id      uuid references public.cities (id) on delete cascade,
  title        text not null,
  body         text not null,
  title_gu     text,
  body_gu      text,
  deep_link    text,
  segment      notification_segment not null,
  -- Segment parameter: category_id for CATEGORY, listing_id for SAVED_LISTING.
  segment_ref  uuid,
  status       notification_status not null default 'DRAFT',
  scheduled_at timestamptz,
  sent_at      timestamptz,
  -- {"recipients": n, "sent": n, "failed": n, "opened": n}
  stats        jsonb not null default '{}'::jsonb,
  provider     text,
  created_by   uuid references auth.users (id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),

  constraint notifications_scheduled_needs_time check (
    status <> 'SCHEDULED' or scheduled_at is not null
  ),
  constraint notifications_sent_needs_time check (status <> 'SENT' or sent_at is not null),
  constraint notifications_segment_ref check (
    (segment in ('CATEGORY', 'SAVED_LISTING') and segment_ref is not null)
    or (segment in ('ALL_USERS', 'CITY') and segment_ref is null)
  ),
  constraint notifications_city_segment check (segment <> 'CITY' or city_id is not null)
);

drop trigger if exists notifications_set_updated_at on public.notifications;
create trigger notifications_set_updated_at before update on public.notifications
  for each row execute function public.set_updated_at();

create index if not exists notifications_schedule_idx
  on public.notifications (status, scheduled_at)
  where status = 'SCHEDULED';
create index if not exists notifications_city_idx on public.notifications (city_id);

-- Per-user delivery rows; also the source of the frequency cap (PRD F8: max
-- 2 notifications per user per day).
create table if not exists public.notification_deliveries (
  id              uuid primary key default gen_random_uuid(),
  notification_id uuid not null references public.notifications (id) on delete cascade,
  user_id         uuid not null references auth.users (id) on delete cascade,
  sent_at         timestamptz,
  opened_at       timestamptz,
  error           text,
  created_at      timestamptz not null default now(),
  constraint notification_deliveries_unique unique (notification_id, user_id)
);

create index if not exists notification_deliveries_user_idx
  on public.notification_deliveries (user_id, sent_at desc);

-- Device push tokens. Empty until FCM is wired up (PRD Phase 2).
create table if not exists public.device_tokens (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  token      text not null unique,
  platform   text not null default 'web',
  is_active  boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists device_tokens_user_idx on public.device_tokens (user_id)
  where is_active;

-- reports -------------------------------------------------------------------
-- PRD A11 / §14: "user report cancelled" is a trust mechanism, not a nicety.
create table if not exists public.reports (
  id          uuid primary key default gen_random_uuid(),
  listing_id  uuid not null references public.listings (id) on delete cascade,
  occurrence_id uuid references public.occurrences (id) on delete set null,
  user_id     uuid references auth.users (id) on delete set null,
  reason      text not null,
  details     text,
  is_resolved boolean not null default false,
  resolved_by uuid references auth.users (id) on delete set null,
  resolved_at timestamptz,
  created_at  timestamptz not null default now()
);

create index if not exists reports_open_idx on public.reports (listing_id)
  where not is_resolved;

-- audit_logs ----------------------------------------------------------------
-- PRD A15: "Non-negotiable once more than one person has access."
create table if not exists public.audit_logs (
  id         uuid primary key default gen_random_uuid(),
  actor_id   uuid references auth.users (id) on delete set null,
  city_id    uuid references public.cities (id) on delete set null,
  entity     text not null,
  entity_id  uuid,
  action     audit_action not null,
  diff       jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists audit_logs_entity_idx on public.audit_logs (entity, entity_id, created_at desc);
create index if not exists audit_logs_actor_idx on public.audit_logs (actor_id, created_at desc);
create index if not exists audit_logs_city_idx on public.audit_logs (city_id, created_at desc);
