# Jal Seva — Water Jar Delivery Management System

Mobile-first MVP for managing a 20L water jar delivery business: customers,
routes, driver deliveries, full/empty jar tracking, payments, billing,
expenses and reports.

Stack: **Next.js 14 (App Router) + TypeScript + Tailwind + Supabase (Postgres + Auth)**.

## What's built (MVP)

- Admin & Driver roles with role-based route protection (middleware) and
  database-level enforcement (Row Level Security — a driver cannot edit/delete
  historical deliveries or change customer rates even by calling the API directly)
- Customer management with search
- Routes with customer ordering
- Fixed daily delivery plan, auto-generated from each customer's regular
  quantity (`/api/daily-plan/generate`, meant to run on a daily cron)
- Driver "Today" screen + Mark Delivered flow, with same-day quantity
  overrides that don't touch the customer's regular quantity
- **Empty jar ledger** and **payment ledger**, both derived from an
  append-only `deliveries` table plus an admin-only, reason-required
  `ledger_adjustments` table — never a mutable "current balance" field
- Admin dashboard (today + monthly summary), daily closing reconciliation —
  including full jar-stock reconciliation (opening → purchased → delivered
  → remaining, and the same for empty jars sent back for refilling), logged
  via a simple daily entry form on that page
- Billing (custom date range, printable via browser print)
- Expense tracking, editable business settings (purchase price, salaries,
  fuel — nothing hardcoded)
- CSV report exports (daily/monthly/customer/area sales, outstanding
  payments, empty jars, driver collection, profit/loss)

## What's intentionally out of scope for the MVP

- In-app user management UI — create driver/admin logins via the Supabase
  dashboard for now (steps below).
- Push notifications — the spec listed these as optional; wire up a
  notification provider later without changing the data model.
- Multiple drivers/vehicles — the schema already supports it (deliveries are
  tied to `driver_id`), just create more driver accounts.

## Setup

### 1. Create a Supabase project
Go to [supabase.com](https://supabase.com), create a project, and note your
Project URL and anon/service-role keys from Settings → API.

### 2. Run the schema
Open the SQL editor in your Supabase dashboard and run the full contents of
`supabase/schema.sql`. This creates all tables, views, and RLS policies.

**Already ran an earlier version of this schema?** Run the numbered files in
`supabase/migration_*.sql` in order instead of the full schema — they apply
just the new pieces (custom payment cycle, jar stock entries) without
touching your existing data.

### 3. Create your first Admin user
In Supabase dashboard → Authentication → Users → Add User, create a user
with an email + password. Then in the SQL editor:

```sql
insert into profiles (id, role, name, phone)
values ('<the-user-id-from-auth-users>', 'admin', 'Your Name', '9999999999');
```

Repeat with `role = 'driver'` for each driver, using their own login.

### 4. Configure environment variables
Copy `.env.example` to `.env.local` and fill in your Supabase URL and keys.
Also set `CRON_SECRET` to any random string — it protects the daily-plan
generation endpoint from being called by strangers.

```bash
cp .env.example .env.local
```

### 5. Install and run

```bash
npm install
npm run dev
```

Visit `http://localhost:3000` — you'll be redirected to `/login`.

### 6. Schedule the daily plan generator
Each night, `POST /api/daily-plan/generate` with header
`Authorization: Bearer <CRON_SECRET>` should run to build tomorrow's delivery
list from customers' regular quantities. Options:
- **Vercel Cron** (if deploying to Vercel) — add a `vercel.json` cron entry
- **Supabase scheduled Edge Function** calling this endpoint
- Any external cron service (cron-job.org, GitHub Actions on a schedule)

Until that's wired up, you can trigger it manually for testing:
```bash
curl -X POST http://localhost:3000/api/daily-plan/generate \
  -H "Authorization: Bearer <your CRON_SECRET>"
```

### 7. Deploy
Deploy to Vercel (recommended, zero-config for Next.js) and add the same
environment variables in the Vercel project settings.

## Project structure

```
src/
  app/
    (admin)/        # admin-only pages, protected by middleware + RLS
    (driver)/       # driver-only pages
    api/
      reports/[slug]/       # CSV export endpoint
      daily-plan/generate/  # cron-triggered daily plan generator
    login/
  lib/
    supabase/        # server + browser Supabase clients
    actions/          # Server Actions (form submissions) per domain
    ledger.ts          # balance calculation helpers (mirrors SQL views)
    auth.ts             # requireUser/requireAdmin guards
    settings.ts          # reads editable business settings
supabase/
  schema.sql            # full DB schema, views, RLS policies
```

## Performance notes / troubleshooting

**"Everything feels slow, first click on each page does nothing"** — this is
almost always one of two things, not a bug in the app logic:

1. **`npm run dev` compiles each route on first visit.** Next.js dev mode
   compiles a page's JS the *first* time you navigate to it, which can take
   1–3 seconds — the second visit is instant because it's cached. This is
   normal dev-mode behavior, not real-world speed. To judge true speed, run
   `npm run build && npm run start` instead of `npm run dev`.
2. **Middleware was making a redundant database query on every click** —
   fixed in this version. It used to re-check the user's role against the
   `profiles` table on every single navigation, on top of the same check
   already happening in the page itself. That extra round-trip to Supabase
   on every click is gone now; role checks still happen (in each page +
   at the database level via RLS), just without the duplicate query.

**"Login takes a long time"** — if your Supabase project is on the free
tier and has been idle, the *database* pauses and takes a few seconds to
wake up on the first request after inactivity. This is a Supabase platform
behavior, not something the app can avoid — it only happens on the first
request after a period of no traffic.

**Double-tap protection** — all key forms (Mark Delivered, customer save,
adjustments, login) now disable themselves and show "Saving..." the instant
you tap, so a second tap while waiting can't create a duplicate delivery
or duplicate customer record.

**Seeing a console error like `Cannot read properties of undefined
(reading 'startTime')` from an anonymous `VM####` script** — that's not
from this app's code (the app never references `startTime`). It's almost
always a browser extension (ad blockers and some performance-monitoring
extensions inject scripts like this). Confirm by opening the app in an
Incognito/Private window with extensions disabled — if the error is gone
there, it's the extension, not the app.

## Production readiness

What's been hardened beyond the initial MVP:

- **Server-side validation on every form** (`src/lib/validation.ts`, zod) —
  negative jar counts, garbage prices, missing required fields, malformed
  IDs all get rejected with a clear message before touching the database,
  instead of relying only on HTML `required`/`type="number"` (which a user
  can bypass, and which gives ugly raw Postgres errors on failure).
- **Fail-fast environment checks** (`src/lib/env.ts`) — a missing/blank
  Supabase env var now throws a clear "Missing required environment
  variable: X" error immediately, instead of a cryptic failure deep inside
  a fetch call.
- **Graceful error boundaries** — `error.tsx` for both the admin and driver
  route groups, plus a root `global-error.tsx` and a custom `not-found.tsx`.
  A crash now shows a friendly retry screen instead of a blank page or a
  raw stack trace — important since the driver is non-technical.
- **Loading skeletons** (`loading.tsx`) so navigation always shows instant
  visual feedback instead of a blank screen while the server fetches data.
- **Double-submit protection** on every form via a shared `SubmitButton`
  component (disables + shows "Saving..." on tap).
- **Security headers** (`next.config.js`) — `X-Frame-Options`,
  `X-Content-Type-Options`, `Referrer-Policy`, restrictive
  `Permissions-Policy`, and `X-Robots-Tag: noindex` (this is an internal
  business tool with customer/payment data — it must never be indexed by
  search engines). `public/robots.txt` backs this up.
- **PWA manifest** (`public/manifest.json` + icons) — the driver can
  "Add to Home Screen" on Android and it opens full-screen like a real app,
  matching the spec's "must work well on Android mobile" requirement.
- **Health check endpoint** (`GET /api/health`) — for uptime monitors
  (UptimeRobot, Better Uptime, etc.); returns 503 if the app can't reach
  Supabase, not just whether the server process is alive.
- **CRON_SECRET auth bypass fixed** — the original check would silently
  accept a literal `Bearer undefined` header if `CRON_SECRET` was never
  set. Now an unset secret always rejects.
- **Middleware no longer duplicates the role-check DB query** on every
  click (see the earlier note above) — this was the main real speed issue.
- **`/api/daily-plan/generate` now accepts both GET and POST** — Vercel
  Cron sends GET requests; the original POST-only handler would have
  silently 405'd every scheduled run. `vercel.json` is included with a
  cron entry for 23:30 IST daily.

### Deploy checklist

1. Run `npm run typecheck` and `npm run build` locally first — catches
   anything a fresh clone would hit that dev mode might paper over.
2. Push to a GitHub repo, import into Vercel.
3. Add all four env vars in Vercel → Project → Settings → Environment
   Variables: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
   `SUPABASE_SERVICE_ROLE_KEY`, `CRON_SECRET`. Vercel automatically attaches
   `CRON_SECRET` as the `Authorization: Bearer` header on its own Cron Job
   requests when the env var name matches — no extra config needed for that
   part.
4. In Supabase → Settings → Database, confirm Point-in-Time Recovery /
   daily backups are enabled for your plan (this satisfies the spec's
   "automatic backups" requirement — Supabase manages it, not the app).
5. Rotate `SUPABASE_SERVICE_ROLE_KEY` immediately if it was ever committed,
   pasted in chat, or shared outside your own `.env.local` — treat it like
   a root database password, since it bypasses every RLS policy.
6. After deploy, hit `https://your-domain/api/health` once to confirm the
   app can reach Supabase in production.
7. Optional but recommended as the business grows: wire up an error-tracking
   service (Sentry is the common choice for Next.js) so failed deliveries or
   payment writes surface to you instead of only to the user's screen.
8. Optional type-safety upgrade: run `npx supabase gen types typescript`
   against your project and replace the remaining `any`-typed Supabase join
   results (mostly in `reports/[slug]/route.ts` and the list pages) with the
   generated types. Left as `any` for now since it needs your live schema to
   generate correctly — the manually-written types on the core driver flow
   and validation layer are already precise.

## Next steps (post-MVP, per the original roadmap)

More drivers/vehicles, more delivery areas, online payments (Razorpay,
following the same pattern used in other projects — webhook-verified,
never trust frontend-reported status), customer notifications (SMS/WhatsApp
Business API), additional water products. The schema and RLS model were
built to extend without a rewrite — e.g. adding a `product_id` to
`deliveries` for multiple products, or a `vehicle_id` for multi-vehicle
routing.
