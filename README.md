# PopUp Bagels — Growth CRM

Full-stack CRM for the PopUp Bagels Chicago growth team: track outreach to 88 office
buildings, book lobby pop-ups, and learn which buildings perform.

**Stack:** Next.js 15 (App Router, TypeScript, Tailwind v4) · Supabase (Postgres + Auth) · Leaflet/OpenStreetMap · Vercel

The original class-project static site lives in [`legacy/`](legacy/).

## Features

- **Dashboard** — pipeline stat cards, stale-lead follow-up queue, overdue tasks, upcoming pop-ups, recent activity
- **Buildings** — filterable/sortable lead table (stage, submarket, viability, wave, Mag Mile), CSV import/export, add/edit buildings
- **Building detail** — full research intel per building, multi-role contacts (TX / GM / ops), outreach timeline (calls/emails/visits/notes), tasks with due dates, pop-up events
- **Pipeline** — drag-and-drop kanban across the five stages; every stage change is logged for analytics
- **Map** — all 88 buildings pinned (colored by stage, sized by daytime population) plus a **day-planner mode**: pick stops, get a nearest-neighbor walking order and a Google Maps directions link
- **Calendar** — month view of pop-ups with COI tracking, load-in notes, and post-event results (revenue / bagels sold)
- **Analytics** — funnel conversion, booked-rate by submarket/viability/score/wave, average time-in-stage, event revenue results
- **Email templates** — merge-field templates ({{buildingName}}, {{contactFirstName}}, …) with one-click Gmail/mail-app drafts, auto-logged to the timeline

## Setup

### 1. Supabase

1. Create a project at [supabase.com](https://supabase.com).
2. In the SQL editor, run the contents of [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql).
3. (Recommended) Auth → Providers → Email: disable "Confirm email" for a team-internal tool.

### 2. Environment

```bash
cp .env.local.example .env.local
```

Fill in from Supabase → Project Settings → API:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (used only by the seed script)

### 3. Seed the dataset

```bash
npm install
npm run seed
```

Loads all 88 buildings (with lat/lng from `data/geocoded.json`), their contacts, and three
starter email templates. Uses `legacy/data-private.js` (real contact info, gitignored) when
present, otherwise falls back to the masked public dataset. Idempotent — safe to re-run.

To re-geocode after adding buildings with addresses only: `npm run geocode`.

### 4. Run

```bash
npm run dev
```

Visit http://localhost:3000, create an account on the login screen, and you're in.

### 5. Deploy to Vercel

```bash
npm i -g vercel
vercel
```

Add the two `NEXT_PUBLIC_*` env vars in the Vercel project settings (the service-role key is
not needed in production — seeding runs locally). Every push to `master` then deploys.

## Data model

`buildings` → `contacts`, `activities` (timeline), `tasks`, `events` (pop-ups + results),
`stage_changes` (auto-logged by trigger for time-in-stage analytics). `email_templates`
stores merge-field outreach templates; `profiles` mirrors auth users. Triggers keep
`buildings.last_contacted_at` in sync with logged calls/emails/visits. All tables are
RLS-protected: any signed-in team member has full access, anonymous users have none.
