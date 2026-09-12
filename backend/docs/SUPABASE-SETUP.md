# Applying this schema to a real Supabase project

Read this before running anything against your project.

---

## 1. What is in `supabase/migrations/`

| File | Creates |
|---|---|
| `20260101000000_extensions.sql` | pgcrypto, uuid-ossp, pg_trgm |
| `20260101000100_enums.sql` | 12 enum types |
| `20260101000200_core.sql` | cities, categories, venues, organisers, users, user_roles |
| `20260101000300_listings.sql` | listings, listing_tags, recurrences, occurrences, editor_picks |
| `20260101000400_engagement.sql` | saves, views, submissions, notifications, device_tokens, reports, audit_logs |
| `20260101000500_functions.sql` | authorisation helpers, audit + integrity triggers, expiry |
| `20260101000600_rls.sql` | RLS enablement, 45 policies, grants |
| `20260101000700_storage.sql` | 3 storage buckets + 7 object policies |

Result: **20 tables, 45 RLS policies, 72 indexes**.

---

## 2. The local shim is NOT applied to your project

`supabase/testing/local_shim.sql` fabricates `auth.users`, `auth.uid()`,
`auth.role()` and `auth.jwt()` so the schema can run on a plain Postgres in
tests and CI.

It is **not a migration**. It lives outside `supabase/migrations/`, so
`supabase db push` and `supabase db reset` cannot see it. Two further guards:

- `tests/helpers/db.ts` is the only code that loads it for tests.
- `npm run db:migrate -- --with-shim` **refuses to run** if the target has
  `auth.uid()` or a `supabase_auth_admin` role — i.e. if it is really Supabase.

On your project, Supabase Auth (GoTrue) provides all of those objects. The
migrations *reference* `auth.users` and `auth.uid()`; they never define them.

---

## 3. Every point where the migrations touch Supabase-managed objects

There are exactly three, and no more:

1. **Foreign keys to `auth.users(id)`** — on `users`, `user_roles`, `venues`,
   `organisers`, `listings`, `saves`, `views`, `submissions`, `reports`,
   `notifications`, `device_tokens`, `audit_logs`. Read-only references; the
   standard Supabase pattern.

2. **A trigger on `auth.users`** (`on_auth_user_created`, in `00200_core.sql`)
   that inserts a matching `public.users` profile row on signup. It is
   `security definer`, uses `on conflict do nothing`, and has an exception
   handler that swallows any error and still returns `NEW` — so a profile
   problem can never break phone OTP signup. A missing profile is backfilled on
   the user's next authenticated request.

3. **`storage.buckets` and `storage.objects`** (in `00700_storage.sql`) —
   3 bucket rows inserted with `on conflict do nothing` (never rewriting an
   existing bucket's public/private flag), plus 7 named policies on
   `storage.objects`. The whole file is a no-op if no `storage` schema exists.

**Nothing else touches `auth` or `storage`.**

---

## 4. Destructive-statement audit

Scanned for `DROP TABLE`, `TRUNCATE`, `DELETE FROM`, `DROP COLUMN`,
`DROP SCHEMA`, `ALTER TABLE … DROP`: **zero matches.**

The only `DROP` statements are `drop policy if exists` and
`drop trigger if exists`, each immediately followed by a `create` of the same
object. They target only objects this schema owns, and exist so migrations are
re-runnable. Every table and index uses `if not exists`.

This migration set will not delete or overwrite existing data.

---

## 5. Environment variables

Copy `.env.example` → `.env.local` (git-ignored) and fill in:

| Variable | Where to get it | Notes |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Settings → API → Project URL | Public |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Settings → API → anon/public | Public |
| `SUPABASE_SERVICE_ROLE_KEY` | Settings → API → service_role | **Server only.** Bypasses RLS. Never prefix with `NEXT_PUBLIC_` |
| `SUPABASE_DB_URL` | Settings → Database → Connection string → URI | Port **5432** (session mode), not 6543. Migrations/seeds only |
| `NEXT_PUBLIC_DEFAULT_CITY_SLUG` | — | `bhavnagar` |
| `AI_PARSER_PROVIDER` | — | `none` to start; no key required |
| `PUSH_PROVIDER` | — | `none` to start |
| `OCCURRENCE_HORIZON_DAYS` | — | `120` |
| `RATE_LIMIT_ENABLED` | — | `true` |

`src/lib/config/env.ts` validates all of these at boot and throws if
`serverEnv()` is ever reached from browser code.

---

## 6. Dashboard settings to configure by hand

These cannot be done in SQL:

1. **Authentication → Providers → Phone** — enable it, and configure an SMS
   provider (Twilio / MessageBird / Vonage). PRD F9 specifies phone OTP.
   *Leave Email enabled too if you want a password login for the admin panel.*
2. **Authentication → Providers → Email** — if used, turn **off** "Confirm
   email" for the pilot, or admin invites will stall.
3. **Authentication → URL Configuration** — set Site URL and add your redirect
   URLs (`http://localhost:3000/**` for local work).
4. **Authentication → Rate limits** — the default OTP limits are fine; raise
   only if seeding many test users.
5. **Settings → API → Exposed schemas** — confirm it is `public` only. Do not
   expose `auth` or `storage`.
6. **Storage** — nothing to do; the migration creates the three buckets. Verify
   afterwards that `submission-posters` shows as **private**.
7. **Database → Extensions** — nothing to do; the migration enables what is
   needed. You may see an advisor notice about extensions in `public` on a
   non-Supabase database; on Supabase they land in `extensions`.

---

## 7. Applying the migrations

**Option A — this repo's migrate script (no Supabase CLI needed):**

```bash
cd backend
cp .env.example .env.local      # then fill in SUPABASE_DB_URL
npm install

npm run db:migrate -- --dry-run # lists pending migrations, changes nothing
npm run db:migrate              # applies them, one transaction each
```

Each migration is recorded in `public.schema_migrations`, so re-running only
applies what is new.

**Option B — Supabase CLI:**

```bash
npm install -g supabase
supabase login
supabase link --project-ref <your-project-ref>
supabase db push
```

`db push` reads only `supabase/migrations/`, so the shim is structurally out of
reach.

**Option C — Dashboard SQL Editor:** paste each file from
`supabase/migrations/` in filename order. Slowest, no ledger; use only if the
other two are unavailable.

### Then seed and verify

```bash
npm run db:seed        # Bhavnagar + the 12 PRD categories + demo data
npm run admin:create   # promote a signed-up user to SUPER_ADMIN
```

---

## 8. Verifying afterwards

```sql
-- 20 tables
select count(*) from information_schema.tables
where table_schema = 'public' and table_type = 'BASE TABLE';

-- every one of them has RLS on
select tablename from pg_tables t
where schemaname = 'public'
  and not exists (select 1 from pg_class c
                  join pg_namespace n on n.oid = c.relnamespace
                  where n.nspname = 'public' and c.relname = t.tablename
                    and c.relrowsecurity);

-- 45 policies
select count(*) from pg_policies where schemaname = 'public';
```

The same policies are exercised by 30 automated tests against a real Postgres
engine: `npm test -- rls`.
