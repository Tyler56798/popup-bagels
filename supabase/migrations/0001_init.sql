-- PopUp Bagels CRM — initial schema
-- Run this in the Supabase SQL editor (or `supabase db push`).

-- ============================================================
-- PROFILES (mirror of auth.users for display names / ownership)
-- ============================================================
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  full_name text,
  created_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- BUILDINGS — the core lead list
-- ============================================================
create table public.buildings (
  id uuid primary key default gen_random_uuid(),
  building_key text not null unique,          -- stable slug from the source dataset
  name text not null,
  aka text,
  street_address text not null,
  zip text,
  submarket text,
  class_rating text,
  office_or_mixed_use text,
  multi_tenant boolean,
  rentable_sf bigint,
  num_floors int,
  year_built text,
  lobby_type text,
  est_daytime_pop int,
  owner_entity text,
  property_manager text,
  in_house_management boolean,
  leasing_brokerage text,
  website text,
  tenant_app text,
  tx_program_name text,
  viability text check (viability in ('strong', 'acceptable', 'weak', 'not_viable')),
  viability_rationale text,
  building_status text,
  mag_mile boolean not null default false,
  lobby_activation_history text,
  known_food_vendors text,
  anchor_tenants text,
  industry_mix text,
  lead_score int check (lead_score between 0 and 5),
  lead_score_rationale text,
  wave int,
  stage text not null default 'not_contacted'
    check (stage in ('not_contacted', 'reached_out', 'followed_up', 'booked', 'declined')),
  notes text,
  lat double precision,
  lng double precision,
  assigned_to uuid references public.profiles (id) on delete set null,
  last_contacted_at timestamptz,              -- maintained by trigger on activities
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index buildings_stage_idx on public.buildings (stage);
create index buildings_submarket_idx on public.buildings (submarket);
create index buildings_assigned_idx on public.buildings (assigned_to);

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger buildings_updated_at
  before update on public.buildings
  for each row execute function public.set_updated_at();

-- ============================================================
-- STAGE CHANGES — history for time-in-stage analytics
-- ============================================================
create table public.stage_changes (
  id uuid primary key default gen_random_uuid(),
  building_id uuid not null references public.buildings (id) on delete cascade,
  from_stage text,
  to_stage text not null,
  changed_by uuid references public.profiles (id) on delete set null,
  changed_at timestamptz not null default now()
);

create index stage_changes_building_idx on public.stage_changes (building_id, changed_at);

create or replace function public.log_stage_change()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if new.stage is distinct from old.stage then
    insert into public.stage_changes (building_id, from_stage, to_stage, changed_by)
    values (new.id, old.stage, new.stage, auth.uid());
  end if;
  return new;
end;
$$;

create trigger buildings_log_stage_change
  after update on public.buildings
  for each row execute function public.log_stage_change();

-- ============================================================
-- CONTACTS — multiple people per building (TX / GM / ops / …)
-- ============================================================
create table public.contacts (
  id uuid primary key default gen_random_uuid(),
  building_id uuid not null references public.buildings (id) on delete cascade,
  role text not null default 'other'
    check (role in ('tenant_experience', 'general_manager', 'operations', 'property_manager', 'leasing', 'security', 'other')),
  name text,
  title text,
  email text,
  email_status text,                          -- verified / pattern_unverified / not_found …
  phone text,
  linkedin_url text,
  source text,
  is_primary boolean not null default false,
  notes text,
  created_at timestamptz not null default now()
);

create index contacts_building_idx on public.contacts (building_id);

-- ============================================================
-- ACTIVITIES — the outreach timeline (calls, emails, visits, notes)
-- ============================================================
create table public.activities (
  id uuid primary key default gen_random_uuid(),
  building_id uuid not null references public.buildings (id) on delete cascade,
  contact_id uuid references public.contacts (id) on delete set null,
  user_id uuid references public.profiles (id) on delete set null,
  type text not null check (type in ('call', 'email', 'visit', 'note', 'stage_change')),
  summary text not null,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index activities_building_idx on public.activities (building_id, occurred_at desc);
create index activities_occurred_idx on public.activities (occurred_at desc);

-- Outreach touches refresh the building's last-contacted timestamp.
create or replace function public.touch_last_contacted()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if new.type in ('call', 'email', 'visit') then
    update public.buildings
       set last_contacted_at = greatest(coalesce(last_contacted_at, new.occurred_at), new.occurred_at)
     where id = new.building_id;
  end if;
  return new;
end;
$$;

create trigger activities_touch_last_contacted
  after insert on public.activities
  for each row execute function public.touch_last_contacted();

-- ============================================================
-- TASKS — follow-up reminders with due dates
-- ============================================================
create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  building_id uuid references public.buildings (id) on delete cascade,
  user_id uuid references public.profiles (id) on delete set null,
  title text not null,
  notes text,
  due_date date,
  status text not null default 'open' check (status in ('open', 'done')),
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create index tasks_status_due_idx on public.tasks (status, due_date);
create index tasks_building_idx on public.tasks (building_id);

-- ============================================================
-- EVENTS — booked pop-ups and their results
-- ============================================================
create table public.events (
  id uuid primary key default gen_random_uuid(),
  building_id uuid not null references public.buildings (id) on delete cascade,
  title text not null default 'Pop-up',
  event_date date not null,
  start_time time,
  end_time time,
  status text not null default 'tentative'
    check (status in ('tentative', 'confirmed', 'completed', 'cancelled')),
  location_note text,                         -- e.g. "NW lobby corner by security desk"
  load_in_notes text,
  coi_status text not null default 'pending'
    check (coi_status in ('not_needed', 'pending', 'submitted', 'approved')),
  revenue numeric,
  units_sold int,
  result_notes text,
  created_at timestamptz not null default now()
);

create index events_date_idx on public.events (event_date);
create index events_building_idx on public.events (building_id);

-- ============================================================
-- EMAIL TEMPLATES — merge-field outreach templates
-- ============================================================
create table public.email_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  subject text not null,
  body text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger email_templates_updated_at
  before update on public.email_templates
  for each row execute function public.set_updated_at();

-- ============================================================
-- ROW LEVEL SECURITY — this is a trusted internal team tool:
-- any signed-in user can read/write everything; anon gets nothing.
-- ============================================================
alter table public.profiles enable row level security;
alter table public.buildings enable row level security;
alter table public.stage_changes enable row level security;
alter table public.contacts enable row level security;
alter table public.activities enable row level security;
alter table public.tasks enable row level security;
alter table public.events enable row level security;
alter table public.email_templates enable row level security;

create policy "authenticated read profiles" on public.profiles
  for select to authenticated using (true);
create policy "own profile update" on public.profiles
  for update to authenticated using (id = auth.uid());

create policy "authenticated all buildings" on public.buildings
  for all to authenticated using (true) with check (true);
create policy "authenticated all stage_changes" on public.stage_changes
  for all to authenticated using (true) with check (true);
create policy "authenticated all contacts" on public.contacts
  for all to authenticated using (true) with check (true);
create policy "authenticated all activities" on public.activities
  for all to authenticated using (true) with check (true);
create policy "authenticated all tasks" on public.tasks
  for all to authenticated using (true) with check (true);
create policy "authenticated all events" on public.events
  for all to authenticated using (true) with check (true);
create policy "authenticated all email_templates" on public.email_templates
  for all to authenticated using (true) with check (true);
