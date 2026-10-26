-- GO TOURNAMENT foundation migration (STAGING ONLY: do not run against uninspected DB).
-- Requires checking existing schema and backups before applying. All public tables are RLS locked.
create extension if not exists pgcrypto;

create table if not exists public.gt_organizers (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) between 2 and 200),
  created_at timestamptz not null default now()
);

create table if not exists public.gt_organizer_members (
  organizer_id uuid not null references public.gt_organizers(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('owner','admin','referee')),
  primary key(organizer_id,user_id)
);

create table if not exists public.gt_athletes (
  id uuid primary key default gen_random_uuid(),
  go_id text unique not null check (length(trim(go_id)) between 3 and 40),
  full_name text not null check (length(trim(full_name)) between 2 and 200),
  nickname text,
  current_rank text,
  claimed_by uuid references auth.users(id) on delete set null,
  profile_public boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists gt_athletes_name_idx on public.gt_athletes (lower(full_name));

create table if not exists public.gt_tournaments (
  id uuid primary key default gen_random_uuid(),
  organizer_id uuid not null references public.gt_organizers(id),
  title text not null check (length(trim(title)) between 3 and 250),
  starts_at timestamptz,
  status text not null default 'draft' check (status in ('draft','open','closed','completed','cancelled')),
  published boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.gt_divisions (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.gt_tournaments(id) on delete cascade,
  title text not null,
  seats_limit integer check (seats_limit is null or seats_limit > 0),
  pairing_enabled boolean not null default false
);

create table if not exists public.gt_registrations (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.gt_tournaments(id),
  division_id uuid not null references public.gt_divisions(id),
  athlete_id uuid not null references public.gt_athletes(id),
  payment_status text not null default 'pending' check (payment_status in ('pending','verified','rejected','waived')),
  registration_status text not null default 'pending' check (registration_status in ('pending','confirmed','cancelled')),
  created_at timestamptz not null default now(),
  unique(tournament_id,athlete_id)
);
create index if not exists gt_registration_athlete_idx on public.gt_registrations(athlete_id);

create table if not exists public.gt_matches (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.gt_tournaments(id),
  division_id uuid not null references public.gt_divisions(id),
  round_number integer not null check (round_number > 0),
  black_athlete_id uuid not null references public.gt_athletes(id),
  white_athlete_id uuid not null references public.gt_athletes(id),
  winner_athlete_id uuid references public.gt_athletes(id),
  state text not null default 'pending' check (state in ('pending','submitted','verified','void')),
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  check (black_athlete_id <> white_athlete_id),
  check (winner_athlete_id is null or winner_athlete_id in (black_athlete_id,white_athlete_id)),
  check (state <> 'verified' or (winner_athlete_id is not null and verified_at is not null)),
  unique(tournament_id,division_id,round_number,black_athlete_id,white_athlete_id)
);
create index if not exists gt_matches_black_idx on public.gt_matches(black_athlete_id,state);
create index if not exists gt_matches_white_idx on public.gt_matches(white_athlete_id,state);

alter table public.gt_organizers enable row level security;
alter table public.gt_organizer_members enable row level security;
alter table public.gt_athletes enable row level security;
alter table public.gt_tournaments enable row level security;
alter table public.gt_divisions enable row level security;
alter table public.gt_registrations enable row level security;
alter table public.gt_matches enable row level security;

-- Public sees only published tournament metadata. No broad read of minors' details.
create policy "gt published tournaments" on public.gt_tournaments
  for select to anon,authenticated using (published = true);
create policy "gt published divisions" on public.gt_divisions
  for select to anon,authenticated using (
    exists(select 1 from public.gt_tournaments t where t.id = tournament_id and t.published = true)
  );
-- Users may read only their own claimed athlete row (sensitive columns stay private).
create policy "gt athlete owner read" on public.gt_athletes
  for select to authenticated using ((select auth.uid()) = claimed_by);

-- No default insert/update/delete policies: public clients cannot fabricate athletes,
-- approve payments or rewrite results. Separate verified server-side workflow required.
-- DO NOT put a service role key in a browser bundle.

-- H2H computation: approved matches only. Run with an appropriately scoped backend principal.
-- SELECT count(*) AS games,
--   count(*) filter (where winner_athlete_id = $1) AS athlete_a_wins,
--   count(*) filter (where winner_athlete_id = $2) AS athlete_b_wins
-- FROM public.gt_matches
-- WHERE state='verified'
--   AND ((black_athlete_id=$1 AND white_athlete_id=$2)
--        OR (black_athlete_id=$2 AND white_athlete_id=$1));
