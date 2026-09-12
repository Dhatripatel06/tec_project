# Deploying the backend (Railway / Railpack)

## Why the build failed

```
✖ Railpack could not determine how to build the app.
  The app contents that Railpack analyzed contains:
  ./
  ├── .agents/
  ├── backend/
  ├── frontend/
  ├── city-today-prd.md
  ├── readme.md
  └── skills-lock.json
```

Railpack analysed the **repository root**, which has no `package.json` — this is
a monorepo holding two separate applications. Railpack looks for an app in the
directory it is pointed at, and the root is not one.

Nothing is wrong with the backend itself; the builder was pointed at the wrong
directory.

---

## The fix: set the service Root Directory

In the Railway dashboard, for the backend service:

**Settings → Source → Root Directory** → `backend`

That is the whole fix. Railpack then sees `backend/package.json`, detects Node,
and builds normally. Railway's monorepo support *is* this setting — there is no
root-level config file that redirects a build into a subdirectory.

If you also deploy the consumer app, create a **second service** on the same
repo with Root Directory `frontend`. Two services, one repo.

---

## What is committed to support it

| File | Purpose |
|---|---|
| `backend/railway.json` | Build/start commands, health check, restart policy |
| `backend/.nvmrc` | Pins Node 22 |
| `backend/package.json` → `engines.node` | `>=20.9.0`, so the builder does not pick an old default |

`backend/railway.json`:

```json
{
  "build":  { "buildCommand": "npm run build" },
  "deploy": {
    "startCommand": "npx next start -H 0.0.0.0 -p $PORT",
    "healthcheckPath": "/api/health",
    "healthcheckTimeout": 120,
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 3
  }
}
```

`-H 0.0.0.0` matters inside a container: binding to localhost only would make
the service unreachable. `$PORT` is injected by Railway and must be honoured —
never hard-code 3000.

The local `npm start` stays plain `next start` so it still works on Windows;
Next reads `PORT` from the environment either way.

---

## Environment variables to set on the service

Set these in **Variables** before the first deploy. `src/lib/config/env.ts`
validates them at boot and fails loudly if any are missing.

| Variable | Value |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | from Supabase → Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | from Supabase → Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | from Supabase → Settings → API. **Server only** |
| `NEXT_PUBLIC_DEFAULT_CITY_SLUG` | `bhavnagar` |
| `AI_PARSER_PROVIDER` | `none` |
| `PUSH_PROVIDER` | `none` |
| `OCCURRENCE_HORIZON_DAYS` | `120` |
| `RATE_LIMIT_ENABLED` | `true` |
| `NODE_ENV` | `production` (Railway usually sets this) |

`SUPABASE_DB_URL` is **not** needed at runtime — only migrations and seeds use
it, and those are run from your machine. Leave it out of the service unless you
intend to run migrations from a Railway shell.

> If you do add it, quote it: a Supabase password containing `#` will be
> truncated by any `.env` parser that treats `#` as a comment.

Do not prefix the service-role key with `NEXT_PUBLIC_`. Anything with that
prefix is inlined into client bundles.

---

## Verifying a deploy

The health check Railway uses is the same one you can call yourself:

```bash
curl https://<your-service>.up.railway.app/api/health
# {"data":{"status":"ok","database":"reachable","live_cities":1,...},"error":null}

curl "https://<your-service>.up.railway.app/api/feed?range=today"
```

`status: ok` with `database: reachable` means the service booted *and* can reach
Supabase. A 200 with `live_cities: 0` means it is connected but the database has
not been seeded.

To point the smoke suite at a deployed instance:

```bash
SMOKE_BASE_URL=https://<your-service>.up.railway.app npm run smoke
```

---

## Migrations and deploys

Migrations are **not** run by the deploy. That is deliberate: a build that
silently mutates the production schema is hard to reason about and harder to
roll back.

Run them yourself, from your machine, before deploying a change that needs them:

```bash
npm run db:migrate -- --dry-run   # see what would run
npm run db:migrate
npm run db:verify
```

---

## Notes

- **Build does not need the database.** No route touches the environment at
  module scope, so `next build` succeeds without Supabase credentials. The
  runtime does need them.
- **Rate limiting is per-instance** (in process memory). If you scale to more
  than one replica the effective limit multiplies. Fine for the pilot.
- **The occurrence horizon needs a scheduled job.** Occurrences are materialised
  120 days ahead; run `npm run occurrences:generate` periodically (a Railway
  cron service, or manually) so the calendar does not run dry.
