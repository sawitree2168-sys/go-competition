-- GO TOURNAMENT source-data blueprint
-- Review on a development database before production use.

create extension if not exists pgcrypto;

create type public.rank_kind as enum ('BEGINNER', 'KYU', 'DAN');
create type public.publish_state as enum ('DRAFT', 'PUBLISHED', 'ARCHIVED');
create type public.result_state as enum ('DRAFT', 'FINALIZED', 'PUBLISHED', 'REVISED');
create type public.match_outcome as enum ('BLACK_WIN', 'WHITE_WIN', 'DRAW', 'BYE', 'WALKOVER', 'NO_SHOW', 'VOID');

create table public.institutions (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name_th text not null,
  name_en text,
  province text,
  logo_path text,
  is_published boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.athletes (
  id uuid primary key default gen_random_uuid(),
  athlete_code text not null unique,
  owner_user_id uuid references auth.users(id) on delete set null,
  legal_name_th text,
  legal_name_en text,
  birth_date date,
  contact_email text,
  contact_phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.athlete_public_profiles (
  athlete_id uuid primary key references public.athletes(id) on delete cascade,
  display_name_th text not null,
  display_name_en text,
  institution_id uuid references public.institutions(id) on delete set null,
  rank_kind public.rank_kind not null,
  rank_value smallint,
  public_photo_path text,
  biography_th text,
  biography_en text,
  is_published boolean not null default false,
  updated_at timestamptz not null default now(),
  check (
    (rank_kind = 'BEGINNER' and rank_value is null)
    or (rank_kind = 'KYU' and rank_value between 1 and 15)
    or (rank_kind = 'DAN' and rank_value between 1 and 9)
  )
);

create table public.athlete_photos (
  id uuid primary key default gen_random_uuid(),
  athlete_id uuid not null references public.athletes(id) on delete cascade,
  storage_path text not null unique,
  review_state text not null default 'PENDING' check (review_state in ('PENDING', 'APPROVED', 'REJECTED')),
  is_current boolean not null default false,
  submitted_at timestamptz not null default now(),
  reviewed_at timestamptz,
  check (not is_current or review_state = 'APPROVED')
);

create table public.events (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  organizer_user_id uuid not null references auth.users(id),
  name_th text not null,
  name_en text,
  competition_year smallint not null check (competition_year between 2020 and 2100),
  venue_th text,
  venue_en text,
  starts_at timestamptz not null,
  ends_at timestamptz,
  registration_opens_at timestamptz,
  registration_closes_at timestamptz,
  state public.publish_state not null default 'DRAFT',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at is null or ends_at >= starts_at)
);

create table public.event_staff (
  event_id uuid not null references public.events(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('OWNER', 'MANAGER', 'PAIRING', 'REFEREE', 'CHECK_IN')),
  primary key (event_id, user_id)
);

create table public.divisions (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  name_th text not null,
  name_en text,
  category text not null check (category in ('BEGINNER', 'KYU', 'DAN', 'HIGH_DAN', 'OPEN_DAN', 'OPEN', 'CUSTOM')),
  format text not null check (format in ('SWISS', 'MCMAHON', 'ROUND_ROBIN', 'KNOCKOUT', 'CUSTOM')),
  rounds smallint,
  min_rank_kind public.rank_kind,
  min_rank_value smallint,
  max_rank_kind public.rank_kind,
  max_rank_value smallint,
  settings jsonb not null default '{}'::jsonb,
  sort_order integer not null default 0
);

create table public.competition_series (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name_th text not null,
  name_en text,
  is_published boolean not null default true
);

create table public.series_seasons (
  id uuid primary key default gen_random_uuid(),
  series_id uuid not null references public.competition_series(id) on delete cascade,
  competition_year smallint not null check (competition_year between 2020 and 2100),
  name text not null,
  is_published boolean not null default false,
  unique (series_id, competition_year)
);

create table public.series_event_memberships (
  season_id uuid not null references public.series_seasons(id) on delete cascade,
  event_id uuid not null references public.events(id) on delete cascade,
  eligibility_status text not null default 'PENDING'
    check (eligibility_status in ('PENDING', 'ELIGIBLE', 'APPROVED', 'REJECTED')),
  reviewed_at timestamptz,
  primary key (season_id, event_id)
);

create table public.registrations (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  division_id uuid not null references public.divisions(id) on delete restrict,
  athlete_id uuid not null references public.athletes(id) on delete restrict,
  status text not null default 'PENDING' check (status in ('PENDING', 'APPROVED', 'CHECKED_IN', 'WITHDRAWN', 'REJECTED')),
  seed integer,
  created_at timestamptz not null default now(),
  unique (event_id, athlete_id)
);

create table public.matches (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  division_id uuid not null references public.divisions(id) on delete cascade,
  round_number smallint not null check (round_number > 0),
  board_number integer not null check (board_number > 0),
  black_athlete_id uuid references public.athletes(id) on delete restrict,
  white_athlete_id uuid references public.athletes(id) on delete restrict,
  handicap smallint not null default 0 check (handicap between 0 and 9),
  komi numeric(4,1),
  outcome public.match_outcome,
  winner_athlete_id uuid references public.athletes(id) on delete restrict,
  result_state public.result_state not null default 'DRAFT',
  played_at timestamptz,
  revision integer not null default 1,
  updated_at timestamptz not null default now(),
  unique (division_id, round_number, board_number, revision)
);

create table public.event_results (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  division_id uuid not null references public.divisions(id) on delete cascade,
  athlete_id uuid not null references public.athletes(id) on delete restrict,
  placing integer check (placing > 0),
  wins integer not null default 0,
  losses integer not null default 0,
  byes integer not null default 0,
  sos numeric,
  score numeric not null default 0,
  result_state public.result_state not null default 'DRAFT',
  revision integer not null default 1,
  published_at timestamptz,
  unique (event_id, division_id, athlete_id, revision)
);

create table public.kyu_rating_accounts (
  athlete_id uuid primary key references public.athletes(id) on delete cascade,
  rating integer not null check (rating between 100 and 1099),
  current_kyu smallint not null check (current_kyu between 1 and 15),
  is_closed boolean not null default false,
  last_calculated_at timestamptz
);

create table public.kyu_rating_ledger (
  id uuid primary key default gen_random_uuid(),
  athlete_id uuid not null references public.athletes(id) on delete cascade,
  match_id uuid references public.matches(id) on delete restrict,
  event_id uuid not null references public.events(id) on delete restrict,
  occurred_at timestamptz not null,
  rating_before integer not null,
  rating_change integer not null,
  rating_after integer not null,
  reason text not null check (reason in ('MATCH', 'INITIAL', 'CORRECTION', 'PROMOTION_CLOSE')),
  revision integer not null default 1,
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  unique nulls not distinct (athlete_id, match_id, revision),
  check (rating_after = rating_before + rating_change)
);

create index athlete_profiles_institution_idx on public.athlete_public_profiles (institution_id);
create index events_state_starts_idx on public.events (state, starts_at desc);
create index divisions_event_idx on public.divisions (event_id, sort_order);
create index events_year_state_idx on public.events (competition_year, state, starts_at desc);
create index series_memberships_event_idx on public.series_event_memberships (event_id, eligibility_status);
create index registrations_athlete_idx on public.registrations (athlete_id, event_id);
create index matches_public_idx on public.matches (event_id, division_id, round_number, result_state);
create index results_athlete_idx on public.event_results (athlete_id, published_at desc);
create index kyu_ledger_athlete_time_idx on public.kyu_rating_ledger (athlete_id, occurred_at, revision);

alter table public.institutions enable row level security;
alter table public.athletes enable row level security;
alter table public.athlete_public_profiles enable row level security;
alter table public.athlete_photos enable row level security;
alter table public.events enable row level security;
alter table public.event_staff enable row level security;
alter table public.divisions enable row level security;
alter table public.competition_series enable row level security;
alter table public.series_seasons enable row level security;
alter table public.series_event_memberships enable row level security;
alter table public.registrations enable row level security;
alter table public.matches enable row level security;
alter table public.event_results enable row level security;
alter table public.kyu_rating_accounts enable row level security;
alter table public.kyu_rating_ledger enable row level security;

create policy "published institutions are public"
on public.institutions for select to anon, authenticated
using (is_published);

create policy "published athlete profiles are public"
on public.athlete_public_profiles for select to anon, authenticated
using (is_published);

create policy "athletes can read own private record"
on public.athletes for select to authenticated
using ((select auth.uid()) = owner_user_id);

create policy "athletes can read own photo submissions"
on public.athlete_photos for select to authenticated
using (exists (
  select 1 from public.athletes a
  where a.id = athlete_photos.athlete_id and a.owner_user_id = (select auth.uid())
));

create policy "published events are public"
on public.events for select to anon, authenticated
using (state = 'PUBLISHED');

create policy "organizers can read owned draft events"
on public.events for select to authenticated
using ((select auth.uid()) = organizer_user_id);

create policy "staff can read own assignments"
on public.event_staff for select to authenticated
using ((select auth.uid()) = user_id);

create policy "divisions of published events are public"
on public.divisions for select to anon, authenticated
using (exists (
  select 1 from public.events e
  where e.id = divisions.event_id and e.state = 'PUBLISHED'
));

create policy "published series are public"
on public.competition_series for select to anon, authenticated
using (is_published);

create policy "published series seasons are public"
on public.series_seasons for select to anon, authenticated
using (is_published);

create policy "approved series events are public"
on public.series_event_memberships for select to anon, authenticated
using (eligibility_status = 'APPROVED');

create policy "athletes can read own registrations"
on public.registrations for select to authenticated
using (exists (
  select 1 from public.athletes a
  where a.id = registrations.athlete_id and a.owner_user_id = (select auth.uid())
));

create policy "published matches are public"
on public.matches for select to anon, authenticated
using (result_state in ('PUBLISHED', 'REVISED'));

create policy "published event results are public"
on public.event_results for select to anon, authenticated
using (result_state in ('PUBLISHED', 'REVISED'));

create policy "kyu accounts are public for published athletes"
on public.kyu_rating_accounts for select to anon, authenticated
using (exists (
  select 1 from public.athlete_public_profiles p
  where p.athlete_id = kyu_rating_accounts.athlete_id and p.is_published
));

create policy "published kyu ledger is public"
on public.kyu_rating_ledger for select to anon, authenticated
using (is_published);

-- HIGH_DAN and OPEN_DAN remain available as division categories for reporting,
-- but they are not automatic eligibility requirements for Super Series membership.
-- Exceptional events can be approved without either category.
--
-- competition_year is only for yearly filtering and yearly statistics.
-- kyu_rating_accounts and kyu_rating_ledger intentionally continue across years.
-- Dan results may be stored for history, but rating changes come from GAT POINT,
-- not from this Kyu ledger.
--
-- Mutations intentionally have no browser policies in this foundation.
-- Organizer writes must go through authenticated server actions that verify
-- event ownership/staff assignment. Never expose a service-role key to clients.
