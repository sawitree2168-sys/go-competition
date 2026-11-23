-- อัปเดตข้อมูลสมาคมอัตโนมัติ (23 Nov 2026).
-- Source: Google Sheet "ทำเนียบดั้งไทยปี69" (thaigoregister, anyone-with-link). A daily Vercel cron
-- (/api/sync/association, at most once per 30 minutes) reads it and calls these functions with a sync token: the site keeps the token in its
-- environment (GT_ASSOC_SYNC_TOKEN); the database keeps only its sha256 (gt_private.sync_tokens_v1).
--   1. แท็บ "รวม"  → dan directory (name, level, diamond, year, max score) and dan scores per date.
--   2. แท็บวันที่ใหม่ (DDMMYY พ.ศ.) that are not on the site yet → central history (events, games).
--      Tabs already on the site are never touched, so manual corrections stay as they are.
--      Names that do not match a dan number / known athlete are kept as unlinked players and listed
--      in history_central_review_v1 (identity_unresolved) for the admin.
--   3. A new dan number whose name matches exactly one existing profile (without a dan number) is linked to it,
--      so a kyu player who passes the dan exam keeps one profile.

create table if not exists gt_private.association_sync_log_v1 (
  id bigserial primary key,
  ran_at timestamptz not null default now(),
  ok boolean not null,
  summary jsonb not null default '{}'::jsonb
);
alter table gt_private.association_sync_log_v1 enable row level security;

create table if not exists gt_private.sync_tokens_v1 (
  name text primary key,
  token_hash text not null
);
alter table gt_private.sync_tokens_v1 enable row level security;

create or replace function gt_private.sync_token_ok_v1(p_token text) returns boolean
language sql stable security definer set search_path = gt_private, pg_catalog as $$
  select exists (select 1 from gt_private.sync_tokens_v1 t
                 where t.name = 'association' and t.token_hash = encode(sha256(convert_to(coalesce(p_token, ''), 'UTF8')), 'hex'))
$$;
revoke all on function gt_private.sync_token_ok_v1(text) from public, anon, authenticated;

-- Who is who: dan number → GO ID, plus every known athlete name (for players without a dan number).
create or replace function public.gt_sync_association_registry_v1(p_token text) returns jsonb
language sql stable security definer set search_path = public, gt_private as $$
  select case when not gt_private.sync_token_ok_v1(p_token) then null else jsonb_build_object(
    'last_run', (select max(ran_at) from gt_private.association_sync_log_v1),
    'people', coalesce((select jsonb_agg(jsonb_build_object('go_id', r.go_id, 'name', r.full_name,
                 'dan', (select min(case when c.dan_number::text ~ '^[0-9]+$' then c.dan_number::text::int end) from gt_private.history_dan_crosswalk_v1 c where c.go_id = r.go_id)))
               from gt_private.history_identity_registry_v1 r where r.go_id <> 'GO106260826'), '[]'::jsonb),
    -- tabs already handled: imported events, plus tabs kept out on purpose (snapshots without an event, e.g. 171069)
    'events', coalesce((select jsonb_agg(distinct k) from (select id k from public.gt_history_events
                         union select source_key from gt_private.history_source_snapshots_v1) z), '[]'::jsonb)) end
$$;

create or replace function public.gt_sync_association_v1(p_token text, p jsonb) returns jsonb
language plpgsql security definer set search_path = public, gt_private as $$
declare
  v_batch text := p->>'batch';
  v_dir int := 0; v_rate int := 0; v_events int := 0; v_games int := 0; v_reviews int := 0; v_links int := 0;
  v_new_events text[];
begin
  if not gt_private.sync_token_ok_v1(p_token) then raise exception 'not allowed'; end if;
  if v_batch is null then raise exception 'batch required'; end if;

  -- 1. dan directory
  with src as (
    select x->>'dan' dan, x->>'name' name, x->>'rank' rank, coalesce((x->>'diamond')::boolean, false) diamond,
           x->>'awarded_raw' awarded_raw, (x->>'awarded_year')::int awarded_year, (x->>'max_score')::numeric max_score
    from jsonb_array_elements(coalesce(p->'directory', '[]'::jsonb)) x
  ), up as (
    insert into gt_private.legacy_dan_directory_v5 as d (dan_number, full_name, source_rank, source_file, imported_at, diamond, awarded_raw, awarded_year, synced_at, max_score)
    select dan, name, rank, coalesce(p->>'source_file', 'association'), now(), diamond, awarded_raw, awarded_year, now(), max_score from src
    on conflict (dan_number) do update set full_name = excluded.full_name, source_rank = excluded.source_rank, diamond = excluded.diamond,
      awarded_raw = coalesce(excluded.awarded_raw, d.awarded_raw), awarded_year = coalesce(excluded.awarded_year, d.awarded_year),
      max_score = coalesce(excluded.max_score, d.max_score), synced_at = now()
    where (d.full_name, d.source_rank, d.diamond, d.awarded_year, d.max_score) is distinct from
          (excluded.full_name, excluded.source_rank, excluded.diamond, coalesce(excluded.awarded_year, d.awarded_year), coalesce(excluded.max_score, d.max_score))
    returning 1
  ) select count(*) into v_dir from up;

  -- 2. dan scores per date (only dates where the score changed, plus each player's first date)
  with src as (
    select (x->>'dan')::int dan, (x->>'date')::date d, (x->>'score')::numeric score, coalesce((x->>'played')::boolean, false) played
    from jsonb_array_elements(coalesce(p->'ratings', '[]'::jsonb)) x
  ), up as (
    insert into gt_private.dan_rating_history_v1 as h (dan_number, rated_on, score, played)
    select dan, d, score, played from src
    on conflict (dan_number, rated_on) do update set score = excluded.score, played = h.played or excluded.played
    where h.score is distinct from excluded.score or (excluded.played and not h.played)
    returning 1
  ) select count(*) into v_rate from up;

  -- 2b. new dan holders who already have a profile (e.g. played kyu before): link dan number → GO ID when
  --     the site found exactly one profile with the same name and that profile has no dan number yet.
  insert into gt_private.history_dan_crosswalk_v1(dan_number, go_id, basis)
  select (x->>'dan')::int, x->>'go_id', 'auto_new_dan_name_match'
  from jsonb_array_elements(coalesce(p->'dan_links', '[]'::jsonb)) x
  where exists (select 1 from gt_private.history_identity_registry_v1 r where r.go_id = x->>'go_id')
    and not exists (select 1 from gt_private.history_dan_crosswalk_v1 c where c.dan_number = (x->>'dan')::int or c.go_id = x->>'go_id')
  on conflict do nothing;
  get diagnostics v_links = row_count;

  -- 3. new competition tabs only
  select coalesce(array_agg(e->>'id'), '{}') into v_new_events
  from jsonb_array_elements(coalesce(p#>'{history,events}', '[]'::jsonb)) e
  where not exists (select 1 from public.gt_history_events h where h.id = e->>'id')
    and not exists (select 1 from gt_private.history_source_snapshots_v1 s where s.source_key = e->>'id');

  if cardinality(v_new_events) > 0 then
    insert into gt_private.history_central_batches_v1(id, payload_hash, summary)
    values (v_batch, md5(p::text), coalesce(p#>'{history,summary}', '{}'::jsonb)) on conflict (id) do nothing;

    insert into public.gt_history_people(id, go_id, full_name)
    select x->>'id', nullif(x->>'go_id', ''), x->>'name' from jsonb_array_elements(coalesce(p#>'{history,people}', '[]'::jsonb)) x
    on conflict do nothing;

    insert into public.gt_history_events(id, title, event_year, event_date, date_status, source_url)
    select x->>'id', x->>'title', (x->>'year')::int, (x->>'date')::date, x->>'date_status', x->>'source_url'
    from jsonb_array_elements(p#>'{history,events}') x where x->>'id' = any(v_new_events)
    on conflict do nothing;
    get diagnostics v_events = row_count;

    insert into gt_private.history_identity_links_v1(namespace, identifier, person_id, basis, observed_name)
    select x->>'namespace', x->>'identifier', x->>'person_id', x->>'basis', x->>'observed_name'
    from jsonb_array_elements(coalesce(p#>'{history,links}', '[]'::jsonb)) x
    where exists (select 1 from public.gt_history_people hp where hp.id = x->>'person_id')
    on conflict do nothing;

    insert into public.gt_history_matches(id, event_id, player_a, player_b, winner, result, kind, division, round_label, board_label, source_url, import_batch)
    select x->>'id', x->>'event_id', x->>'a', nullif(x->>'b', ''), nullif(x->>'winner', ''), x->>'result', x->>'kind', x->>'division', x->>'round', x->>'board', x->>'source_url', v_batch
    from jsonb_array_elements(coalesce(p#>'{history,games}', '[]'::jsonb)) x where x->>'event_id' = any(v_new_events)
    on conflict do nothing;
    get diagnostics v_games = row_count;

    insert into gt_private.history_match_evidence_v1(match_id, payload)
    select x->>'id', x->'evidence' from jsonb_array_elements(coalesce(p#>'{history,games}', '[]'::jsonb)) x
    where x->>'event_id' = any(v_new_events) and exists (select 1 from public.gt_history_matches m where m.id = x->>'id')
    on conflict do nothing;

    insert into gt_private.history_player_observations_v1(source_key, person_id, event_id, division, placing_no, payload)
    select x->>'key', x->>'person_id', x->>'event_id', x->>'division', (x->>'placing')::int, x->'payload'
    from jsonb_array_elements(coalesce(p#>'{history,observations}', '[]'::jsonb)) x where x->>'event_id' = any(v_new_events)
    on conflict do nothing;

    insert into gt_private.history_central_review_v1(review_key, reason, details, batch_id)
    select x->>'key', x->>'reason', x->'details', v_batch from jsonb_array_elements(coalesce(p#>'{history,reviews}', '[]'::jsonb)) x
    where split_part(x->>'key', ':', 1) = 'local' or (split_part(x->>'key', ':', 1) || ':' || split_part(x->>'key', ':', 2)) = any(v_new_events)
    on conflict do nothing;
    get diagnostics v_reviews = row_count;

    insert into gt_private.history_source_snapshots_v1(source_key, content_hash, source_url, payload, batch_id)
    select x->>'key', x->>'hash', x->>'url', x->'payload', v_batch from jsonb_array_elements(coalesce(p#>'{history,sources}', '[]'::jsonb)) x
    where x->>'key' = any(v_new_events)
    on conflict do nothing;
  end if;

  insert into gt_private.association_sync_log_v1(ok, summary) values (true, jsonb_build_object(
    'directory_changed', v_dir, 'scores_changed', v_rate, 'profiles_linked', v_links, 'new_events', v_events, 'new_games', v_games,
    'names_to_check', v_reviews, 'new_event_ids', to_jsonb(v_new_events), 'tabs', p->'tabs'));
  return jsonb_build_object('directory_changed', v_dir, 'scores_changed', v_rate, 'profiles_linked', v_links, 'new_events', v_events, 'new_games', v_games, 'names_to_check', v_reviews);
end $$;

create or replace function public.gt_sync_association_fail_v1(p_token text, p_error text) returns void
language sql security definer set search_path = public, gt_private as $$
  insert into gt_private.association_sync_log_v1(ok, summary)
  select false, jsonb_build_object('error', left(p_error, 500)) where gt_private.sync_token_ok_v1(p_token);
$$;

-- Last runs, for the owner page.
create or replace function public.gt_association_sync_status_v1(p_token text) returns jsonb
language sql stable security definer set search_path = public, gt_private as $$
  select case when gt_private.sync_token_ok_v1(p_token) then
    coalesce((select jsonb_agg(jsonb_build_object('ran_at', ran_at, 'ok', ok, 'summary', summary) order by ran_at desc)
              from (select * from gt_private.association_sync_log_v1 order by ran_at desc limit 10) z), '[]'::jsonb) end
$$;

revoke all on function public.gt_sync_association_registry_v1(text), public.gt_sync_association_v1(text, jsonb), public.gt_sync_association_fail_v1(text, text), public.gt_association_sync_status_v1(text) from public;
grant execute on function public.gt_sync_association_registry_v1(text), public.gt_sync_association_v1(text, jsonb), public.gt_sync_association_fail_v1(text, text), public.gt_association_sync_status_v1(text) to anon, authenticated, service_role;
-- The token itself is set once outside this file (insert into gt_private.sync_tokens_v1 ... its sha256).

-- 23 Nov 2026: only successful runs count for the 30-minute gap; implausible ปีที่ได้ดั้ง (typos) are cleared.
create or replace function public.gt_sync_association_registry_v1(p_token text) returns jsonb
language sql stable security definer set search_path = public, gt_private as $$
  select case when not gt_private.sync_token_ok_v1(p_token) then null else jsonb_build_object(
    'last_run', (select max(ran_at) from gt_private.association_sync_log_v1 where ok),
    'people', coalesce((select jsonb_agg(jsonb_build_object('go_id', r.go_id, 'name', r.full_name,
                 'dan', (select min(case when c.dan_number::text ~ '^[0-9]+$' then c.dan_number::text::int end) from gt_private.history_dan_crosswalk_v1 c where c.go_id = r.go_id)))
               from gt_private.history_identity_registry_v1 r where r.go_id <> 'GO106260826'), '[]'::jsonb),
    'events', coalesce((select jsonb_agg(distinct k) from (select id k from public.gt_history_events
                         union select source_key from gt_private.history_source_snapshots_v1) z), '[]'::jsonb)) end
$$;
update gt_private.legacy_dan_directory_v5 set awarded_year = null
where awarded_year is not null and (awarded_year < 2400 or awarded_year > extract(year from now())::int + 543);
