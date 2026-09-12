# "Aaje Su?" — backend

Backend and API for a daily feed of things worth doing in **Bhavnagar**.
Next.js (App Router) route handlers over Supabase / PostgreSQL.

The consumer app lives in `../frontend` and is built separately. This package
is the data and API layer only.

---

## Quick start

```bash
cd backend
npm install

cp .env.example .env.local     # fill in your Supabase values
npm run db:migrate             # apply the schema
npm run db:seed                # Bhavnagar + categories + demo listings
npm run user:create -- --email admin@aajesu.test --password admin12345 --role SUPER_ADMIN

npm run dev                    # http://localhost:3000
npm run db:verify              # health-check the database
npm run smoke                  # end-to-end API checks (dev server must be running)
```

> **If your database password contains `#`, `%` or `@`**, quote it in
> `.env.local`: `SUPABASE_DB_URL='postgresql://...'`. Unquoted, `dotenv` treats
> `#` as a comment and truncates the value. Alternatively put the password in
> `SUPABASE_DB_PASSWORD` and leave it out of the URL.

---

## Commands

| Command | What it does |
|---|---|
| `npm run dev` | Dev server on :3000 |
| `npm run build` / `start` | Production build / serve |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint |
| `npm test` | Unit + RLS tests (in-process Postgres, no Docker) |
| `npm run test:watch` | Tests in watch mode |
| `npm run db:migrate` | Apply pending migrations (`-- --dry-run` to preview) |
| `npm run db:seed` | Seed reference + demo data (`-- --reset-demo` to replace) |
| `npm run db:verify` | Post-migration health check |
| `npm run db:check` | Apply all migrations to a throwaway DB — fast SQL feedback |
| `npm run user:create` | Create a user / grant a role |
| `npm run occurrences:generate` | Extend the rolling occurrence horizon |
| `npm run listings:expire` | Expiry sweep (secondary; the feed query already excludes finished items) |
| `npm run smoke` | End-to-end API test against a running server |

---

## Configuration

Copy `.env.example` to `.env.local`. Every variable is validated at boot by
`src/lib/config/env.ts`.

| Variable | Notes |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Settings → API. Safe in the browser |
| `SUPABASE_SERVICE_ROLE_KEY` | **Server only.** Bypasses RLS. Never `NEXT_PUBLIC_` |
| `SUPABASE_DB_URL` | Settings → Database → URI. Port **5432**, not the 6543 pooler |
| `SUPABASE_DB_PASSWORD` | Optional override for awkward passwords |
| `NEXT_PUBLIC_DEFAULT_CITY_SLUG` | `bhavnagar` |
| `AI_PARSER_PROVIDER` | `none` for the MVP — no key needed |
| `PUSH_PROVIDER` | `none` for the MVP |
| `OCCURRENCE_HORIZON_DAYS` | How far ahead recurrences are materialised (120) |

`serverEnv()` throws if it is ever reached from browser code, so the service
key cannot leak into a client bundle.

---

## Supabase setup

Full detail, including the safety audit of every migration, is in
[docs/SUPABASE-SETUP.md](docs/SUPABASE-SETUP.md). The short version:

1. Create a project, copy the keys into `.env.local`.
2. `npm run db:migrate` — 20 tables, 45 RLS policies, 72 indexes, 3 storage buckets.
3. `npm run db:seed`.
4. In the dashboard: enable your auth providers, and confirm
   **Settings → API → Exposed schemas** is `public` only.

### Migrations

Plain SQL in `supabase/migrations/`, applied in filename order and recorded in
`public.schema_migrations`, so re-running only applies what is new. Works with
`supabase db push` too.

`supabase/testing/local_shim.sql` is **not** a migration. It fakes `auth.users`
and `auth.uid()` so the schema can run on a plain Postgres in tests. It lives
outside `migrations/` so `db push` cannot reach it, and `db:migrate --with-shim`
refuses to run it against anything that looks like Supabase.

---

## Authentication

Browsing needs no login. Authentication is required for saving, submitting and
notifications (PRD F9).

The API accepts a session from either transport:

- `Authorization: Bearer <access_token>` — SPAs, mobile, curl
- Supabase auth cookies — server-rendered pages

The PRD specifies **phone OTP**, which is a dashboard setting (Authentication →
Providers → Phone) plus an SMS provider. For the MVP the demo accounts use
email + password so nothing waits on a Twilio account — the roles, RLS and API
behave identically either way.

```bash
npm run user:create -- --email demo@aajesu.test    --password demo12345
npm run user:create -- --email admin@aajesu.test   --password admin12345 --role SUPER_ADMIN
npm run user:create -- --email curator@aajesu.test --password curator12345 --role CITY_CURATOR --city bhavnagar
```

Frontend sign-in:

```js
const { data } = await supabase.auth.signInWithPassword({ email, password });
const token = data.session.access_token;   // send as Authorization: Bearer
```

---

## Roles

| Role | Can do |
|---|---|
| `SUPER_ADMIN` | Everything, every city. Only role that may grant roles |
| `CITY_CURATOR` | Full CRUD + moderation — **assigned city only** |
| `CONTENT_INTERN` | Create and edit own drafts. **Cannot publish** |
| `PARTNER` | Create/edit own listings. **Always moderated** |

Roles live in `user_roles (user_id, role, city_id)`. `city_id` is `NULL` only
for `SUPER_ADMIN`; every other role is city-scoped, which is what makes
cross-city isolation enforceable.

Enforcement is in two places on purpose: `src/lib/domain/permissions.ts` so the
API can return a clean 403, and RLS policies in the database, which cannot be
bypassed even with the anon key. 30 automated tests cover the policies —
including that a Bhavnagar curator cannot touch Rajkot.

---

## Architecture

```
src/
├─ app/api/              route handlers (thin: parse → authorise → service → respond)
├─ lib/
│  ├─ api/               response envelope, error mapping, context, rate limiting
│  ├─ config/            validated environment
│  ├─ db/                migration loader, connection parsing
│  ├─ domain/            pure logic — no database, no clock
│  │   ├─ recurrence.ts  rule → occurrences, and non-destructive regeneration
│  │   ├─ feed.ts        filter → rank → evergreen fallback → time bands
│  │   ├─ ranking.ts     deterministic scoring (no ML — PRD non-goal)
│  │   ├─ duplicates.ts  title/venue/date similarity
│  │   ├─ lifecycle.ts   the listing state machine
│  │   ├─ permissions.ts the role matrix
│  │   └─ i18n.ts        Gujarati → English fallback
│  ├─ parser/            quick-add parser (Manual + AI seam)
│  ├─ services/          database-facing use cases
│  ├─ supabase/          the three clients (request / anon / admin)
│  ├─ time/              UTC ↔ IST, day windows, time bands
│  └─ validation/        Zod schemas for every external input
└─ types/database.ts     row types matching the migrations
```

The domain layer is pure, which is why the interesting rules — recurrence,
ranking, fallback, expiry, duplicates — are tested directly without a database.

### Time

Every instant is `timestamptz` (UTC). Wall-clock parts of a recurrence
(`start_time`, `starts_on`) are `time`/`date` interpreted in the listing's
timezone. A "day" in the feed is an IST calendar day: `[00:00 IST, 24:00 IST)`,
which is `18:30 UTC` the previous day to `18:30 UTC`. A 21:00 IST garba night is
stored `15:30Z` and files under the day it *starts*.

### The feed reads occurrences, never listings

```
listing → recurrence rule → occurrences → feed
```

A weekly open mic is one listing and many occurrences. Three filters are applied
in SQL: `local_date = the day`, `is_cancelled = false`, and `end_at > now()`.
That last one *is* auto-expiry — a finished event cannot appear even if no
cleanup job has run. `npm run listings:expire` is a secondary tidy-up that marks
listings `EXPIRED` for the admin table.

Regenerating a recurrence never discards a curator's work: cancelled and
overridden occurrences survive, and past occurrences are never deleted.

### Evergreen fallback

If a day has fewer than 5 real items, the feed tops up from the city's evergreen
pool, rotated deterministically by date. Fillers are returned with
`kind: "evergreen"`, `start_at: null` and no occurrence — the API never pretends
an evergreen attraction is scheduled for that date.

---

## API

All responses share one envelope:

```jsonc
// success
{ "data": { }, "error": null, "meta": { } }

// failure
{ "data": null, "error": { "code": "LISTING_NOT_FOUND", "message": "Listing not found" } }
```

Error codes: `VALIDATION_FAILED` (422), `UNAUTHENTICATED` (401), `FORBIDDEN`
(403), `NOT_FOUND` / `LISTING_NOT_FOUND` / `SUBMISSION_NOT_FOUND` (404),
`ALREADY_EXISTS` (409), `INVALID_TRANSITION` (409), `RATE_LIMITED` (429),
`INTERNAL_ERROR` (500).

### Public

| Method | Path | Notes |
|---|---|---|
| GET | `/api/health` | Liveness + database reachability |
| GET | `/api/cities` | Live cities |
| GET | `/api/categories` | The 12 PRD categories, in display order |
| GET | `/api/venues?city=&q=` | Venue directory |
| GET | `/api/organisers?city=&q=` | Organiser directory |
| GET | `/api/feed` | The day feed — see below |
| GET | `/api/listings/:id` | Full detail + upcoming occurrences + save count |
| POST | `/api/submissions` | Public submission. Always PENDING. Rate limited |
| POST | `/api/events` | Analytics events. Anonymous allowed. Rate limited |

`GET /api/feed` parameters:

```
city=bhavnagar            slug or uuid (defaults to the pilot city)
range=today|tomorrow|weekend
date=2026-09-12           a specific IST day (ignored if range is given)
category=food-drink,movies
free_only=true  indoor=false  family_friendly=true
time_of_day=evening,tonight
lat=21.76&lng=72.15&distance_km=5
sort=recommended|starting_soon|nearest
lang=en|gu
limit=50
```

`range=weekend` returns `{ city, days: [...] }`; everything else returns a
single day object.

### Authenticated (user)

| Method | Path | Notes |
|---|---|---|
| POST | `/api/listings/:id/save` | Idempotent |
| DELETE | `/api/listings/:id/save` | Idempotent |
| GET | `/api/me/saves` | Saved list with each item's next occurrence |
| GET | `/api/me/saves/state?listing_ids=a,b,c` | Batch saved-state map |

### Admin

| Method | Path | Role |
|---|---|---|
| GET | `/api/admin/dashboard?city=` | staff — coverage health, thin days flagged |
| GET | `/api/admin/listings` | staff — filterable table |
| POST | `/api/admin/listings` | staff (PUBLISHED is curator-only) |
| GET/PATCH/DELETE | `/api/admin/listings/:id` | staff / curator for delete |
| GET/POST | `/api/admin/listings/:id/status` | lifecycle transitions |
| PATCH | `/api/admin/occurrences/:id` | curator — cancel / override one occurrence |
| GET | `/api/admin/submissions?status=PENDING` | staff — moderation queue |
| GET/PATCH | `/api/admin/submissions/:id` | curator — approve / reject |
| GET | `/api/admin/analytics?city=&days=` | staff |
| GET/POST | `/api/admin/notifications` | curator |
| POST | `/api/admin/notifications/:id/send` | curator |
| POST | `/api/admin/parse` | staff — quick-add paste parser |

---

## Listing lifecycle

```
DRAFT ──▶ PENDING ──▶ PUBLISHED ──▶ EXPIRED
            │             │
            ▼             ▼
        REJECTED      CANCELLED
```

Only a curator or super admin may reach `PUBLISHED`. Public submissions and
partner listings are always moderated — there is no path that publishes them
automatically. Rejections require a reason, which is stored to be sent to the
submitter. Status changes are written to `audit_logs` by a database trigger.

---

## Storage

Three buckets, created by migration:

| Bucket | Access | For |
|---|---|---|
| `listing-covers` | public read | Card and detail images |
| `listing-gallery` | public read | Additional images |
| `submission-posters` | **private** | Unmoderated public uploads |

Object paths start with the city id (`<city_id>/<listing_id>/<file>`), which is
what the storage policies authorise on. Postgres stores only the path — never
image bytes. Type and size limits (5 MB, JPEG/PNG/WebP) are set on the buckets.

---

## Notifications

Schema, segments (`ALL_USERS`, `CITY`, `CATEGORY`, `SAVED_LISTING`), campaign
lifecycle and audience resolution are implemented. `PUSH_PROVIDER=none`, so
sending resolves the audience and records delivery rows and stats **without
dispatching anything** — the response carries `stats.simulated: true`. Adding
FCM later means writing one `PushProvider` adapter.

## Quick-add parser

`ListingParser` with two implementations. `AI_PARSER_PROVIDER=none` selects
`ManualParser`: deterministic rules over the shapes WhatsApp forwards and
Instagram captions actually take — date (including "aaje"/"આજે"), time ranges,
₹ prices, Indian phone numbers, venue, and a category guess. No network calls,
no key, no cost. `AIListingParser` fixes the seam for a provider later; it is
only selected when a provider **and** a key are configured.

---

## Testing

```bash
npm test
```

Runs against **PGlite**, a real Postgres 18 compiled to WebAssembly, in process.
No Docker and no Supabase project needed — migrations are applied to a throwaway
database and RLS policies are exercised as the actual `anon` and `authenticated`
roles with a JWT subject, exactly as PostgREST does.

| File | Covers |
|---|---|
| `time.test.ts` | UTC↔IST, day windows, DST, time bands |
| `recurrence.test.ts` | daily/weekly/weekday/range, overnight, count, exdates, regeneration |
| `feed.test.ts` | bands, filters, sorting, evergreen fallback, expiry, ranking |
| `permissions.test.ts` | role matrix, cross-city, lifecycle transitions |
| `services.test.ts` | duplicates, i18n fallback, submission mapping, digests, rate limits |
| `parser.test.ts` | date/time/price/phone/venue extraction, provider selection |
| `validation.test.ts` | every input schema, including rejection cases |
| `rls.test.ts` | 30 policy tests against real Postgres |

`npm run smoke` additionally exercises the live HTTP surface with real Supabase
sessions — auth wiring, RLS through PostgREST, and the JSON contract.

---

## Known limitations

- **Phone OTP is not enabled.** Demo accounts use email + password. Enabling it
  is a dashboard setting plus an SMS provider; no code change.
- **Push delivery is not implemented.** Provider is `none` by design.
- **The AI parser is a seam, not an integration.** `ManualParser` does the work.
- **Rate limiting is per-instance**, held in process memory. Fine for one city;
  swap in Redis when there is more than one server.
- **Seed listings are demo data**, tagged `demo` and marked in their
  descriptions. The venues are real Bhavnagar places; the events are not.
  Replace them before showing this to anyone (PRD §15, day 10).
- **Share-card generation (PRD F5) is not built** — it is a rendering concern
  and belongs with the frontend.
- **Occurrences are materialised 120 days ahead.** Run
  `npm run occurrences:generate` on a schedule to keep the horizon rolling.
