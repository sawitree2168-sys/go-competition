-- Central public sporting facts. Raw snapshots, identity evidence and review data
-- stay private. No auth users are created and no ownership rights are changed.
create table public.gt_history_people (
 id text primary key, go_id text unique, full_name text not null
);
create table public.gt_history_events (
 id text primary key, title text not null, event_year integer not null,
 event_date date, date_status text not null check(date_status in ('verified','year_only')),
 source_url text not null,
 check((date_status='year_only' and event_date is null) or (date_status='verified' and event_date is not null))
);
create table gt_private.history_central_batches_v1 (
 id text primary key, payload_hash text not null, summary jsonb not null,
 imported_at timestamptz not null default now()
);
create table public.gt_history_matches (
 id text primary key,event_id text not null references public.gt_history_events(id),
 player_a text not null references public.gt_history_people(id),
 player_b text references public.gt_history_people(id),
 winner text references public.gt_history_people(id),
 result text not null check(result in ('decisive','draw')),
 kind text not null check(kind in ('played','bye','walkover','not_played')),
 division text not null,round_label text,board_label text,source_url text not null,
 import_batch text not null references gt_private.history_central_batches_v1(id),
 check(player_b is null or player_a<>player_b),
 check(winner is null or winner=player_a or winner=player_b),
 check(kind<>'played' or (player_b is not null and ((result='draw' and winner is null) or (result='decisive' and winner is not null))))
);
create index gt_history_matches_a on public.gt_history_matches(player_a,event_id);
create index gt_history_matches_b on public.gt_history_matches(player_b,event_id);
create index gt_history_matches_event on public.gt_history_matches(event_id);
create table gt_private.history_source_snapshots_v1 (
 source_key text not null,content_hash text not null,source_url text not null,
 payload jsonb not null,batch_id text not null references gt_private.history_central_batches_v1(id),
 primary key(source_key,content_hash)
);
create table gt_private.history_identity_links_v1 (
 namespace text not null,identifier text not null,person_id text not null references public.gt_history_people(id),
 basis text not null,observed_name text not null,primary key(namespace,identifier)
);
create table gt_private.history_central_review_v1 (
 review_key text not null,reason text not null,details jsonb not null,
 batch_id text not null references gt_private.history_central_batches_v1(id),
 status text not null default 'pending',primary key(review_key,reason)
);
create table gt_private.history_match_evidence_v1 (
 match_id text primary key references public.gt_history_matches(id),payload jsonb not null
);
create table gt_private.history_player_observations_v1 (
 source_key text primary key,person_id text not null references public.gt_history_people(id),
 event_id text not null references public.gt_history_events(id),division text not null,
 placing_no integer,payload jsonb not null
);
alter table public.gt_history_people enable row level security;
alter table public.gt_history_events enable row level security;
alter table public.gt_history_matches enable row level security;
create policy history_people_public on public.gt_history_people for select to anon,authenticated using(true);
create policy history_events_public on public.gt_history_events for select to anon,authenticated using(true);
create policy history_matches_public on public.gt_history_matches for select to anon,authenticated using(true);
revoke all on public.gt_history_people,public.gt_history_events,public.gt_history_matches from anon,authenticated;
grant select on public.gt_history_people,public.gt_history_events,public.gt_history_matches to anon,authenticated;
alter table gt_private.history_central_batches_v1 enable row level security;
alter table gt_private.history_source_snapshots_v1 enable row level security;
alter table gt_private.history_identity_links_v1 enable row level security;
alter table gt_private.history_central_review_v1 enable row level security;
alter table gt_private.history_match_evidence_v1 enable row level security;
alter table gt_private.history_player_observations_v1 enable row level security;
revoke all on gt_private.history_central_batches_v1,gt_private.history_source_snapshots_v1,gt_private.history_identity_links_v1,gt_private.history_central_review_v1,gt_private.history_match_evidence_v1,gt_private.history_player_observations_v1 from public,anon,authenticated;

create function public.gt_history_stats_v1(p_go_ids text[],p_year integer default 2026)
returns jsonb language sql stable security invoker set search_path=pg_catalog as $$
 with selected as(select id,go_id from public.gt_history_people where go_id=any(p_go_ids[1:60])), stats as(
 select p.go_id,count(m.id) filter(where m.kind='played') games,
 count(m.id) filter(where m.kind='played' and m.winner=p.id) wins,
 count(m.id) filter(where m.kind='played' and m.winner is not null and m.winner<>p.id) losses,
 count(m.id) filter(where m.kind='played' and m.result='draw') draws,
 count(distinct m.event_id) events
 from selected p left join (public.gt_history_matches m join public.gt_history_events e on e.id=m.event_id and (p_year is null or e.event_year=p_year)) on p.id in(m.player_a,m.player_b)
 group by p.go_id)
 select coalesce(jsonb_object_agg(go_id,jsonb_build_object('games',games,'wins',wins,'losses',losses,'draws',draws,'events',events,'win_percent',case when games>0 then round(100.0*wins/games,2) else null end)),'{}'::jsonb) from stats
$$;
create function public.gt_history_profile_v1(p_go_id text,p_year integer default 2026)
returns jsonb language sql stable security invoker set search_path=pg_catalog as $$
 with person as(select * from public.gt_history_people where go_id=p_go_id), games as(
 select m.id,m.event_id,e.title,e.event_year,e.event_date,e.date_status,m.division,m.round_label,m.board_label,m.kind,
 case when m.winner=p.id then 'win' when m.winner is not null then 'loss' when m.result='draw' then 'draw' else 'pending' end outcome,
 o.id opponent_key,o.go_id opponent_go_id,o.full_name opponent_name,m.source_url
 from person p join public.gt_history_matches m on p.id in(m.player_a,m.player_b)
 join public.gt_history_events e on e.id=m.event_id and (p_year is null or e.event_year=p_year)
 left join public.gt_history_people o on o.id=case when p.id=m.player_a then m.player_b else m.player_a end
 ), opponents as(
 select opponent_key,opponent_go_id,opponent_name,count(*) filter(where kind='played') games,
 count(*) filter(where kind='played' and outcome='win') wins,
 count(*) filter(where kind='played' and outcome='loss') losses,
 count(*) filter(where kind='played' and outcome='draw') draws
 from games group by opponent_key,opponent_go_id,opponent_name
 ) select jsonb_build_object('go_id',p.go_id,'full_name',p.full_name,
 'stats',public.gt_history_stats_v1(array[p_go_id],p_year)->p_go_id,
 'games',coalesce((select jsonb_agg(to_jsonb(g) order by g.event_date desc nulls last,g.event_id,g.round_label,g.id) from games g),'[]'::jsonb),
 'opponents',coalesce((select jsonb_agg(to_jsonb(o) order by o.games desc,o.opponent_name) from opponents o),'[]'::jsonb),
 'coverage',jsonb_build_object('year',p_year,'status','partial_verified','note','เฉพาะแมตช์ที่ตรวจสอบแล้วจากข้อมูลนำเข้า ข้อมูลที่รอตรวจไม่รวมในสถิติ')) from person p
$$;
revoke all on function public.gt_history_stats_v1(text[],integer),public.gt_history_profile_v1(text,integer) from public;
grant execute on function public.gt_history_stats_v1(text[],integer),public.gt_history_profile_v1(text,integer) to anon,authenticated;
