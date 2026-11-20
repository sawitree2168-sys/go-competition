-- โต๊ะกรรมการ: competition-day timing for many divisions at once (20 Nov 2026)
-- * gt_division_day_v1: planned start time of each round, medal/photo time, ticks for medals given / photo taken
-- * gt_referee_calls_v1: line referees call the admin ("ลงผลครบแล้ว", "มีปัญหา") instead of walking to the desk
-- Additive only. Tables have RLS on and no policies: read/write only through the functions below.

create table if not exists public.gt_division_day_v1 (
  division_id    uuid primary key references public.gt_divisions(id) on delete cascade,
  round_times    text[] not null default '{}',   -- 'HH:MM' (Thai time) per round, index 1 = round 1
  ceremony_at    text,                           -- 'HH:MM' medal / photo time
  medals_done_at timestamptz,
  photo_done_at  timestamptz,
  updated_at     timestamptz not null default now(),
  updated_by     uuid
);
alter table public.gt_division_day_v1 enable row level security;

create table if not exists public.gt_referee_calls_v1 (
  id            bigint generated always as identity primary key,
  tournament_id uuid not null references public.gt_tournaments(id) on delete cascade,
  division_id   uuid not null references public.gt_divisions(id) on delete cascade,
  pool_label    text,
  round_number  int,
  kind          text not null check (kind in ('results_done', 'problem', 'when_next')),
  note          text,
  referee_name  text,
  referee_id    uuid,
  created_at    timestamptz not null default now(),
  resolved_at   timestamptz,
  resolved_by   uuid
);
create index if not exists gt_referee_calls_open_v1 on public.gt_referee_calls_v1 (tournament_id) where resolved_at is null;
alter table public.gt_referee_calls_v1 enable row level security;

-- 'HH:MM' or null
create or replace function gt_private.hhmm(p text) returns text language sql immutable as $$
  select case when p ~ '^([01]?[0-9]|2[0-3]):[0-5][0-9]$' then lpad(split_part(p, ':', 1), 2, '0') || ':' || split_part(p, ':', 2) end
$$;

-- ---------------------------------------------------------------- staff
create or replace function public.gt_staff_set_division_day_v1(p_division uuid, p_round_times text[], p_ceremony text)
returns void language plpgsql security definer set search_path = public as $$
declare v_t uuid; v_actor uuid; v_times text[];
begin
  select tournament_id into v_t from gt_divisions where id = p_division;
  if v_t is null then raise exception 'DIVISION_NOT_FOUND'; end if;
  v_actor := gt_require_tournament_staff_v1(v_t);
  select coalesce(array_agg(coalesce(gt_private.hhmm(btrim(x)), '') order by i), '{}')
    into v_times from unnest(coalesce(p_round_times, '{}')) with ordinality u(x, i) where i <= 12;
  insert into gt_division_day_v1 (division_id, round_times, ceremony_at, updated_at, updated_by)
  values (p_division, v_times, gt_private.hhmm(btrim(coalesce(p_ceremony, ''))), now(), v_actor)
  on conflict (division_id) do update set round_times = excluded.round_times, ceremony_at = excluded.ceremony_at,
    updated_at = now(), updated_by = v_actor;
end $$;

create or replace function public.gt_staff_set_ceremony_done_v1(p_division uuid, p_what text, p_done boolean)
returns void language plpgsql security definer set search_path = public as $$
declare v_t uuid; v_actor uuid;
begin
  select tournament_id into v_t from gt_divisions where id = p_division;
  if v_t is null then raise exception 'DIVISION_NOT_FOUND'; end if;
  v_actor := gt_require_tournament_staff_v1(v_t);
  if p_what not in ('medals', 'photo') then raise exception 'BAD_FIELD'; end if;
  insert into gt_division_day_v1 (division_id, updated_by) values (p_division, v_actor) on conflict (division_id) do nothing;
  update gt_division_day_v1 set
    medals_done_at = case when p_what = 'medals' then (case when p_done then now() end) else medals_done_at end,
    photo_done_at  = case when p_what = 'photo'  then (case when p_done then now() end) else photo_done_at end,
    updated_at = now(), updated_by = v_actor
  where division_id = p_division;
end $$;

create or replace function public.gt_staff_resolve_call_v1(p_call bigint)
returns void language plpgsql security definer set search_path = public as $$
declare v_t uuid; v_actor uuid;
begin
  select tournament_id into v_t from gt_referee_calls_v1 where id = p_call;
  if v_t is null then raise exception 'CALL_NOT_FOUND'; end if;
  v_actor := gt_require_tournament_staff_v1(v_t);
  update gt_referee_calls_v1 set resolved_at = now(), resolved_by = v_actor where id = p_call and resolved_at is null;
end $$;

-- Everything the โต๊ะกรรมการ needs that is not already readable: schedules and open referee calls.
create or replace function public.gt_staff_event_day_v1(p_tournament uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  if not gt_can_manage_tournament_v1(p_tournament) then raise exception 'NOT_STAFF'; end if;
  return jsonb_build_object(
    'days', coalesce((select jsonb_agg(jsonb_build_object('division_id', y.division_id, 'round_times', y.round_times,
              'ceremony_at', y.ceremony_at, 'medals_done_at', y.medals_done_at, 'photo_done_at', y.photo_done_at))
            from gt_division_day_v1 y join gt_divisions d on d.id = y.division_id where d.tournament_id = p_tournament), '[]'::jsonb),
    'calls', coalesce((select jsonb_agg(jsonb_build_object('id', c.id, 'division_id', c.division_id, 'pool', c.pool_label,
              'round', c.round_number, 'kind', c.kind, 'note', c.note, 'referee', c.referee_name, 'created_at', c.created_at) order by c.created_at)
            from gt_referee_calls_v1 c where c.tournament_id = p_tournament and c.resolved_at is null
              and c.created_at > now() - interval '12 hours'), '[]'::jsonb));
end $$;

-- ---------------------------------------------------------------- referees (link + 6-digit code)
create or replace function public.gt_referee_call_admin_v1(p_token text, p_code text, p_division uuid, p_kind text, p_note text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare c record; v_pool text; v_round int; v_id bigint;
begin
  select * into c from gt_private.referee_check(p_token, p_code);
  if c.err is not null then return jsonb_build_object('ok', false, 'error', c.err); end if;
  if not exists (select 1 from gt_divisions d where d.id = p_division and d.tournament_id = (c.acc).tournament_id) then
    return jsonb_build_object('ok', false, 'error', 'NOT_THIS_EVENT');
  end if;
  if p_kind not in ('results_done', 'problem', 'when_next') then return jsonb_build_object('ok', false, 'error', 'BAD_KIND'); end if;
  select max(m.round_number) into v_round from gt_matches m where m.division_id = p_division and m.state <> 'void';
  -- one open call per referee + division + kind: pressing again only refreshes it
  update gt_referee_calls_v1 set note = nullif(left(btrim(coalesce(p_note, '')), 200), ''), round_number = v_round, created_at = now()
   where division_id = p_division and kind = p_kind and referee_id = (c.acc).id and resolved_at is null
  returning id into v_id;
  if v_id is null then
    insert into gt_referee_calls_v1 (tournament_id, division_id, pool_label, round_number, kind, note, referee_name, referee_id)
    values ((c.acc).tournament_id, p_division, v_pool, v_round, p_kind, nullif(left(btrim(coalesce(p_note, '')), 200), ''), (c.acc).referee_name, (c.acc).id)
    returning id into v_id;
  end if;
  return jsonb_build_object('ok', true, 'id', v_id);
end $$;

-- Planned times of this division and this referee's open calls, for the referee screen.
create or replace function public.gt_referee_day_v1(p_token text, p_code text, p_division uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare c record;
begin
  select * into c from gt_private.referee_check(p_token, p_code);
  if c.err is not null then return jsonb_build_object('ok', false, 'error', c.err); end if;
  if not exists (select 1 from gt_divisions d where d.id = p_division and d.tournament_id = (c.acc).tournament_id) then
    return jsonb_build_object('ok', false, 'error', 'NOT_THIS_EVENT');
  end if;
  return jsonb_build_object('ok', true,
    'total_rounds', (select coalesce(nullif(d.total_rounds, 0), 5) from gt_divisions d where d.id = p_division),
    'round_times', coalesce((select round_times from gt_division_day_v1 where division_id = p_division), '{}'),
    'ceremony_at', (select ceremony_at from gt_division_day_v1 where division_id = p_division),
    'calls', coalesce((select jsonb_agg(jsonb_build_object('id', x.id, 'kind', x.kind, 'created_at', x.created_at, 'resolved_at', x.resolved_at) order by x.created_at desc)
              from gt_referee_calls_v1 x where x.division_id = p_division and x.referee_id = (c.acc).id
                and x.created_at > now() - interval '12 hours'), '[]'::jsonb));
end $$;

revoke all on function public.gt_staff_set_division_day_v1(uuid, text[], text) from public;
revoke all on function public.gt_staff_set_ceremony_done_v1(uuid, text, boolean) from public;
revoke all on function public.gt_staff_resolve_call_v1(bigint) from public;
revoke all on function public.gt_staff_event_day_v1(uuid) from public;
grant execute on function public.gt_staff_set_division_day_v1(uuid, text[], text) to authenticated;
grant execute on function public.gt_staff_set_ceremony_done_v1(uuid, text, boolean) to authenticated;
grant execute on function public.gt_staff_resolve_call_v1(bigint) to authenticated;
grant execute on function public.gt_staff_event_day_v1(uuid) to authenticated;
grant execute on function public.gt_referee_call_admin_v1(text, text, uuid, text, text) to anon, authenticated;
grant execute on function public.gt_referee_day_v1(text, text, uuid) to anon, authenticated;
