-- National score ranking (18 Nov 2026).
-- Dan players: the score the Thailand Go Association keeps in its dan list (one column per event date, same scale
-- as our Elo table: 1 dan = 1100, +100 per dan). A dan level is official (exam or announcement); the score only
-- ranks. A 4 dan above 1500 stays 4 dan until the 5 dan exam is passed.
-- Active = played within N months (default 6). Admin can force Active / Inactive per athlete, with a reason.
-- Kyu players will join this ranking from our own Elo (ELO RULESET v1) once their games are rated.

create table if not exists gt_private.dan_rating_history_v1 (
  dan_number int not null,
  rated_on date not null,
  score numeric not null,
  played boolean not null default false,
  primary key (dan_number, rated_on)
);
alter table gt_private.dan_rating_history_v1 enable row level security;

alter table gt_private.legacy_dan_directory_v5 add column if not exists max_score numeric;

create table if not exists gt_private.athlete_activity_override_v1 (
  go_id text primary key,
  status text not null check (status in ('active', 'inactive')),
  reason text not null,
  set_by uuid,
  set_at timestamptz not null default now()
);
alter table gt_private.athlete_activity_override_v1 enable row level security;

create table if not exists gt_private.activity_audit_v1 (
  id bigserial primary key,
  go_id text,
  old_status text,
  new_status text,
  reason text,
  actor uuid,
  created_at timestamptz not null default now()
);
alter table gt_private.activity_audit_v1 enable row level security;

create table if not exists gt_private.ranking_settings_v1 (
  id int primary key default 1 check (id = 1),
  inactive_months int not null default 6 check (inactive_months between 1 and 36),
  updated_by uuid,
  updated_at timestamptz not null default now()
);
insert into gt_private.ranking_settings_v1 (id) values (1) on conflict do nothing;

-- One row per dan player: latest score, change at the last event played, last played date, status and rank.
create or replace function gt_private.dan_ranking_rows_v1()
returns table (dan int, name text, level text, diamond boolean, go_id text, photo text, profile_id uuid,
               score numeric, delta numeric, max_score numeric, last_played date, auto_active boolean,
               status_source text, active boolean, next_level boolean)
language sql stable security definer set search_path = public, gt_private as $$
  with s as (select inactive_months m from gt_private.ranking_settings_v1 where id = 1),
  latest as (
    select distinct on (h.dan_number) h.dan_number, h.score
    from gt_private.dan_rating_history_v1 h order by h.dan_number, h.rated_on desc),
  played as (
    select h.dan_number, max(h.rated_on) last_played from gt_private.dan_rating_history_v1 h where h.played group by 1),
  delta as (
    select p.dan_number, p.last_played,
           h.score - coalesce((select h2.score from gt_private.dan_rating_history_v1 h2
                               where h2.dan_number = p.dan_number and h2.rated_on < p.last_played
                               order by h2.rated_on desc limit 1), h.score) d
    from played p join gt_private.dan_rating_history_v1 h on h.dan_number = p.dan_number and h.rated_on = p.last_played)
  select d.dan_number::int, d.full_name, nullif(d.source_rank, ''), d.diamond, c.go_id,
         nullif(btrim(a.avatar_url), ''),
         case when exists (select 1 from gt_registrations r join gt_tournaments t on t.id = r.tournament_id
                           where r.athlete_id = a.id and t.published and r.registration_status in ('confirmed', 'withdrawn')) then a.id end,
         l.score, dl.d, greatest(d.max_score, l.score), p.last_played,
         p.last_played is not null and p.last_played >= (now() at time zone 'Asia/Bangkok')::date - make_interval(months => (select m from s)),
         case when o.status is not null then 'admin' else 'auto' end,
         coalesce(o.status = 'active',
                  p.last_played is not null and p.last_played >= (now() at time zone 'Asia/Bangkok')::date - make_interval(months => (select m from s))),
         d.source_rank ~ '^[0-9]+$' and l.score >= 1000 + 100 * (d.source_rank::int + 1)
  from gt_private.legacy_dan_directory_v5 d
  left join gt_private.history_dan_crosswalk_v1 c on c.dan_number = d.dan_number::int
  left join gt_athletes a on a.go_id = c.go_id
  left join latest l on l.dan_number = d.dan_number::int
  left join played p on p.dan_number = d.dan_number::int
  left join delta dl on dl.dan_number = d.dan_number::int
  left join gt_private.athlete_activity_override_v1 o on o.go_id = c.go_id
  where d.dan_number ~ '^[0-9]+$';
$$;
revoke all on function gt_private.dan_ranking_rows_v1() from public, anon, authenticated;

-- Public: national ranking. Rank counts Active players only; equal scores share a rank.
create or replace function public.gt_national_ranking_v1()
returns jsonb language sql stable security definer set search_path = public, gt_private as $$
  with r as (select * from gt_private.dan_ranking_rows_v1()),
  ranked as (
    select r.*, case when r.active and r.score is not null
                     then rank() over (partition by (r.active and r.score is not null) order by r.score desc) end rnk
    from r)
  select jsonb_build_object(
    'inactive_months', (select inactive_months from gt_private.ranking_settings_v1 where id = 1),
    'as_of', (select max(rated_on) from gt_private.dan_rating_history_v1),
    'rows', coalesce(jsonb_agg(jsonb_build_object(
      'rank', rnk, 'dan', dan, 'name', name, 'level', level, 'diamond', diamond, 'go_id', go_id, 'photo', photo,
      'profile_id', profile_id, 'score', score, 'delta', delta, 'max_score', max_score, 'last_played', last_played,
      'active', active, 'status_source', status_source, 'next_level', coalesce(next_level, false))
      order by rnk nulls last, score desc nulls last, dan), '[]'::jsonb))
  from ranked;
$$;
grant execute on function public.gt_national_ranking_v1() to anon, authenticated;

-- Admin: force Active / Inactive (p_status 'active' | 'inactive') or back to automatic (null). Reason required.
create or replace function public.gt_admin_set_activity_v1(p_go_id text, p_status text, p_reason text)
returns jsonb language plpgsql security definer set search_path = public, gt_private as $$
declare old text;
begin
  if not public.gt_is_platform_admin_v1() then raise exception 'NOT_ALLOWED'; end if;
  if length(btrim(coalesce(p_reason, ''))) < 4 then raise exception 'REASON_REQUIRED'; end if;
  if p_status is not null and p_status not in ('active', 'inactive') then raise exception 'BAD_STATUS'; end if;
  if not exists (select 1 from gt_private.history_identity_registry_v1 where go_id = p_go_id) then raise exception 'NOT_FOUND'; end if;
  select status into old from gt_private.athlete_activity_override_v1 where go_id = p_go_id;
  if p_status is null then
    delete from gt_private.athlete_activity_override_v1 where go_id = p_go_id;
  else
    insert into gt_private.athlete_activity_override_v1 (go_id, status, reason, set_by)
    values (p_go_id, p_status, btrim(p_reason), auth.uid())
    on conflict (go_id) do update set status = excluded.status, reason = excluded.reason, set_by = excluded.set_by, set_at = now();
  end if;
  insert into gt_private.activity_audit_v1 (go_id, old_status, new_status, reason, actor)
  values (p_go_id, coalesce(old, 'auto'), coalesce(p_status, 'auto'), btrim(p_reason), auth.uid());
  return jsonb_build_object('go_id', p_go_id, 'status', coalesce(p_status, 'auto'));
end $$;
revoke all on function public.gt_admin_set_activity_v1(text, text, text) from public, anon;
grant execute on function public.gt_admin_set_activity_v1(text, text, text) to authenticated;

-- Admin: search with activity details (name, GO ID or dan number).
create or replace function public.gt_admin_activity_search_v1(p_query text)
returns jsonb language plpgsql stable security definer set search_path = public, gt_private as $$
declare k text := regexp_replace(btrim(coalesce(p_query, '')), '[[:space:]​‌‍﻿]', '', 'g');
begin
  if not public.gt_is_platform_admin_v1() then raise exception 'NOT_ALLOWED'; end if;
  if length(k) < 2 then return '[]'::jsonb; end if;
  return coalesce((select jsonb_agg(jsonb_build_object(
      'go_id', r.go_id, 'dan', r.dan, 'name', r.name, 'level', r.level, 'photo', r.photo, 'score', r.score,
      'last_played', r.last_played, 'auto_active', r.auto_active, 'active', r.active, 'status_source', r.status_source,
      'reason', o.reason, 'set_at', o.set_at) order by r.dan)
    from (select * from gt_private.dan_ranking_rows_v1() x
          where x.go_id is not null and (upper(replace(x.go_id, '-', '')) = upper(replace(k, '-', ''))
             or (k ~ '^[0-9,]+$' and x.dan::text = replace(k, ',', ''))
             or regexp_replace(x.name, '[[:space:]​‌‍﻿]', '', 'g') ilike '%' || k || '%')
          limit 20) r
    left join gt_private.athlete_activity_override_v1 o on o.go_id = r.go_id), '[]'::jsonb);
end $$;
revoke all on function public.gt_admin_activity_search_v1(text) from public, anon;
grant execute on function public.gt_admin_activity_search_v1(text) to authenticated;

-- Admin: how many months without a game makes a player Inactive.
create or replace function public.gt_admin_ranking_settings_v1(p_inactive_months int default null)
returns jsonb language plpgsql security definer set search_path = public, gt_private as $$
begin
  if not public.gt_is_platform_admin_v1() then raise exception 'NOT_ALLOWED'; end if;
  if p_inactive_months is not null then
    if p_inactive_months not between 1 and 36 then raise exception 'BAD_MONTHS'; end if;
    update gt_private.ranking_settings_v1 set inactive_months = p_inactive_months, updated_by = auth.uid(), updated_at = now() where id = 1;
  end if;
  return (select jsonb_build_object('inactive_months', inactive_months, 'updated_at', updated_at,
                                    'active_count', (select count(*) from gt_private.dan_ranking_rows_v1() where active),
                                    'total', (select count(*) from gt_private.dan_ranking_rows_v1()))
          from gt_private.ranking_settings_v1 where id = 1);
end $$;
revoke all on function public.gt_admin_ranking_settings_v1(int) from public, anon;
grant execute on function public.gt_admin_ranking_settings_v1(int) to authenticated;
