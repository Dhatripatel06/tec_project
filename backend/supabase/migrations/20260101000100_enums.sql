-- ---------------------------------------------------------------------------
-- 00100 — Enumerated types
-- ---------------------------------------------------------------------------

do $$ begin
  create type listing_status as enum (
    'DRAFT', 'PENDING', 'PUBLISHED', 'EXPIRED', 'REJECTED', 'CANCELLED'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type price_type as enum ('free', 'paid', 'donation');
exception when duplicate_object then null; end $$;

-- Where a listing came from. Drives A10 "source attribution".
do $$ begin
  create type listing_source as enum (
    'admin', 'partner', 'user_submission', 'whatsapp', 'instagram', 'scraped'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type app_role as enum (
    'SUPER_ADMIN', 'CITY_CURATOR', 'CONTENT_INTERN', 'PARTNER'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type submission_status as enum ('PENDING', 'APPROVED', 'REJECTED');
exception when duplicate_object then null; end $$;

-- PRD §8 views.type(impression|detail|contact) extended with the share/save
-- metrics PRD A10 asks for on the same analytics surface.
do $$ begin
  create type view_type as enum ('impression', 'detail', 'contact', 'share', 'save');
exception when duplicate_object then null; end $$;

-- ONCE  = single occurrence (start/end taken from the listing)
-- DAILY = every N days inside [starts_on, ends_on]
-- WEEKLY= every N weeks on `byweekday` (selected weekdays) inside the range
do $$ begin
  create type recurrence_freq as enum ('ONCE', 'DAILY', 'WEEKLY');
exception when duplicate_object then null; end $$;

do $$ begin
  create type notification_segment as enum ('ALL_USERS', 'CITY', 'CATEGORY', 'SAVED_LISTING');
exception when duplicate_object then null; end $$;

do $$ begin
  create type notification_status as enum (
    'DRAFT', 'SCHEDULED', 'SENDING', 'SENT', 'FAILED', 'CANCELLED'
  );
exception when duplicate_object then null; end $$;

-- PRD A4 "submitter trust score; trusted organisers can be marked auto-publish"
do $$ begin
  create type trust_level as enum ('NEW', 'TRUSTED', 'VERIFIED', 'BLOCKED');
exception when duplicate_object then null; end $$;

do $$ begin
  create type app_lang as enum ('en', 'gu');
exception when duplicate_object then null; end $$;

do $$ begin
  create type audit_action as enum (
    'CREATE', 'UPDATE', 'DELETE', 'PUBLISH', 'REJECT', 'CANCEL', 'EXPIRE',
    'APPROVE', 'SUBMIT', 'ROLE_GRANT', 'ROLE_REVOKE'
  );
exception when duplicate_object then null; end $$;
