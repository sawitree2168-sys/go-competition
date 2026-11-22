-- ทำเนียบคิว: 1–15 คิว, ระดับจากผลแข่งล่าสุด / ทำเนียบคิวสมาคม / นักกีฬาแก้เอง
-- ครูเล็ก 22 พ.ย. 2569

-- 1) ระดับที่นักกีฬาระบุเอง (แยกจาก current_rank ที่ใช้ตอนสมัคร เพื่อรู้แหล่งที่มาและวันที่แก้)
alter table public.gt_athletes
  add column if not exists self_kyu smallint check (self_kyu between 1 and 15),
  add column if not exists self_kyu_at timestamptz;

-- 2) รุ่นเฟรนชิพในเว็บนี้ตั้งชื่อเป็นภาษาไทย ("เฟรนชิพ 9×9") ให้นับระดับได้เหมือน "Friendship"
create or replace function gt_private.history_division_strength_v1(p_division text)
 returns integer language sql immutable set search_path to 'pg_catalog' as $function$
  with d as (select coalesce(p_division,'') s),
  k as (select regexp_match(s, '(\d+)\s*(?:[-–]\s*(\d+))?\s*(?:kyu|คิว|k\M)', 'i') m from d)
  select case
    when s ~* '(friendship|เฟรนชิพ|เฟรนด์ชิพ|ฟรีนชิพ)' and s ~ '13\s*[x×X]\s*13' then -13
    when s ~* '(friendship|เฟรนชิพ|เฟรนด์ชิพ|ฟรีนชิพ)' and s ~ '9\s*[x×X]\s*9' then -15
    when (select m from k) is not null then -least((select m[1] from k)::int, coalesce((select m[2] from k)::int, (select m[1] from k)::int))
    else null end
  from d
$function$;

-- 3) ระดับคิวของนักกีฬาทุกคนที่ยังไม่มีดั้ง (หนึ่งแถวต่อ GO ID)
drop function if exists gt_private.kyu_levels_full_v1();
drop function if exists gt_private.kyu_levels_v1();
create or replace function gt_private.kyu_levels_v1(p_go_ids text[] default null)
 returns table(go_id text, full_name text, kyu int, source text, source_event text, source_division text, source_date date,
               assoc_kyu int, assoc_source text, division_kyu int, self_kyu int, self_kyu_at timestamptz, last_played date)
 language sql stable security definer set search_path to 'pg_catalog' as $function$
 with people as (
  select r.go_id, r.full_name, r.source_rank, r.source_tab from gt_private.history_identity_registry_v1 r where r.go_id <> 'GO106260826'
  union all
  select a.go_id, a.full_name, a.current_rank, null from public.gt_athletes a
  where a.profile_public and not exists (select 1 from gt_private.history_identity_registry_v1 r where r.go_id = a.go_id)
 ), dan_names as (
  select regexp_replace(d.full_name,'[\s​]','','g') n from gt_private.legacy_dan_directory_v5 d where d.dan_number ~ '^[0-9]+$'
 ), kyu_people as (
  select p.* from people p
  where (p_go_ids is null or p.go_id = any(p_go_ids))
    and not exists (select 1 from gt_private.history_dan_crosswalk_v1 x where x.go_id = p.go_id)
    and coalesce(gt_private.rank_label_v1(p.source_rank),'') !~ 'ดั้ง'
    and not exists (select 1 from public.gt_athletes a where a.go_id = p.go_id and a.current_rank ~ '(ดั้ง|dan)')
    and not exists (select 1 from dan_names d where d.n = regexp_replace(p.full_name,'[\s​]','','g'))
 ), dv as materialized (   -- strength once per distinct division name (the regex is the slow part)
  select z.division, gt_private.history_division_strength_v1(z.division) st from (select distinct coalesce(division,'') division from public.gt_history_matches) z
 ), ev as materialized (
  select e.id, e.title, gt_private.history_event_sort_date_v1(e.id, e.event_date) d from public.gt_history_events e
 ), entries as (   -- one row per athlete per event (strongest kyu division entered in that event)
  select hp.go_id, ev.title, ev.d, max(dv.st) st,
         (array_agg(m.division order by dv.st desc nulls last))[1] division
  from public.gt_history_matches m
  join dv on dv.division = coalesce(m.division,'')
  join ev on ev.id = m.event_id
  cross join lateral (values (m.player_a), (m.player_b)) pl(pid)
  join public.gt_history_people hp on hp.id = pl.pid
  where hp.go_id is not null and (p_go_ids is null or hp.go_id = any(p_go_ids))
  group by hp.go_id, m.event_id, ev.title, ev.d
  union all
  select a.go_id, t.title, t.event_date::date, max(gt_private.history_division_strength_v1(gd.name)), max(gd.name)
  from public.gt_registrations rg
  join public.gt_tournaments t on t.id = rg.tournament_id and t.published and t.event_date::date <= current_date
  join public.gt_divisions gd on gd.id = rg.division_id
  join public.gt_athletes a on a.id = rg.athlete_id
  where rg.registration_status = 'confirmed' and a.go_id is not null and (p_go_ids is null or a.go_id = any(p_go_ids))
  group by a.go_id, t.id, t.title, t.event_date
 ), latest_div as (
  select distinct on (en.go_id) en.go_id, -en.st kyu, en.title, en.division, en.d
  from entries en where en.st is not null
  order by en.go_id, en.d desc nulls last, en.st desc
 ), played as (select en.go_id, max(en.d) d from entries en group by en.go_id),
 base as (
  select k.go_id, k.full_name,
    case when gt_private.rank_label_v1(k.source_rank) ~ 'คิว' then least(15, substring(gt_private.rank_label_v1(k.source_rank) from '^\d+')::int) end assoc_kyu,
    case when k.source_tab ilike 'ระดับคิว%' then 'ทำเนียบคิวสมาคม' else 'ทะเบียนนักกีฬา' end assoc_source,
    ld.kyu div_kyu, ld.title div_event, ld.division div_name, ld.d div_date,
    a.self_kyu, a.self_kyu_at, pl.d last_played,
    case when a.self_kyu_at is not null then
      (select en.st from entries en where en.go_id = k.go_id and en.st is not null
         and en.d >= (a.self_kyu_at at time zone 'Asia/Bangkok')::date order by en.st desc limit 1) end after_self_st
  from kyu_people k
  left join latest_div ld on ld.go_id = k.go_id
  left join played pl on pl.go_id = k.go_id
  left join lateral (select x.self_kyu, x.self_kyu_at from public.gt_athletes x where x.go_id = k.go_id and x.self_kyu is not null
                     order by x.self_kyu_at desc nulls last limit 1) a on true
 )
 select b.go_id, b.full_name,
   case when b.self_kyu is not null then least(b.self_kyu, coalesce(-b.after_self_st, 99))
        else least(coalesce(b.assoc_kyu, 99), coalesce(b.div_kyu, 99)) end,
   case when b.self_kyu is not null then case when -b.after_self_st < b.self_kyu then 'division' else 'self' end
        when b.div_kyu is not null and b.div_kyu <= coalesce(b.assoc_kyu, 99) then 'division'
        when b.assoc_kyu is not null then 'association' end,
   case when b.self_kyu is null and b.div_kyu is not null and b.div_kyu <= coalesce(b.assoc_kyu, 99) then b.div_event end,
   case when b.self_kyu is null and b.div_kyu is not null and b.div_kyu <= coalesce(b.assoc_kyu, 99) then b.div_name end,
   case when b.self_kyu is null and b.div_kyu is not null and b.div_kyu <= coalesce(b.assoc_kyu, 99) then b.div_date end,
   b.assoc_kyu, b.assoc_source, b.div_kyu, b.self_kyu, b.self_kyu_at, b.last_played
 from base b
$function$;

-- เมื่อนักกีฬาแก้เองแล้วแต่ลงแข่งรุ่นที่สูงกว่าหลังจากนั้น ต้องแสดงรายการแข่งนั้นด้วย
create or replace function gt_private.kyu_levels_full_v1(p_go_ids text[] default null)
 returns table(go_id text, full_name text, kyu int, source text, source_event text, source_division text, source_date date,
               assoc_kyu int, assoc_source text, division_kyu int, self_kyu int, self_kyu_at timestamptz, last_played date)
 language sql stable security definer set search_path to 'pg_catalog' as $function$
  select l.go_id, l.full_name, nullif(l.kyu, 99), l.source,
    coalesce(l.source_event, case when l.source = 'division' and l.self_kyu is not null then s.title end),
    coalesce(l.source_division, case when l.source = 'division' and l.self_kyu is not null then s.division end),
    coalesce(l.source_date, case when l.source = 'division' and l.self_kyu is not null then s.d end),
    l.assoc_kyu, l.assoc_source, l.division_kyu, l.self_kyu, l.self_kyu_at, l.last_played
  from gt_private.kyu_levels_v1(p_go_ids) l
  left join lateral (
    select e.title, m.division, gt_private.history_event_sort_date_v1(m.event_id, e.event_date) d
    from public.gt_history_people hp
    join public.gt_history_matches m on hp.id in (m.player_a, m.player_b)
    join public.gt_history_events e on e.id = m.event_id
    where l.source = 'division' and l.self_kyu is not null and hp.go_id = l.go_id
      and -gt_private.history_division_strength_v1(m.division) = l.kyu
    order by d desc nulls last limit 1) s on true
$function$;

-- 4) หน้าทำเนียบ แถบคิว (แบ่งหน้าในฐานข้อมูล)
create or replace function public.gt_kyu_board_v1(p_kyu int default null, p_query text default '', p_scope text default 'all',
                                                  p_page int default 1, p_size int default 30)
 returns jsonb language sql stable security definer set search_path to 'pg_catalog' as $function$
 with lv as (select * from gt_private.kyu_levels_full_v1()),
 scoped as (
  select * from lv where p_scope <> 'active' or lv.last_played >= current_date - interval '6 months'
 ), counts as (
  select coalesce(jsonb_object_agg(k, n), '{}'::jsonb) by_kyu,
         (select count(*) from scoped where kyu is null) unknown, (select count(*) from scoped) total_all
  from (select least(kyu,15)::text k, count(*) n from scoped where kyu is not null group by 1) z
 ), matched as (
  select s.* from scoped s
  where (p_kyu is null or (p_kyu = 0 and s.kyu is null) or (p_kyu > 0 and least(s.kyu,15) = p_kyu))
    and (coalesce(p_query,'') = '' or position(lower(left(btrim(p_query),80)) in lower(s.full_name)) > 0
         or position(lower(left(btrim(p_query),80)) in lower(s.go_id)) > 0)
 ), paging as (
  select count(*) total, greatest(1, least(100, coalesce(p_size,30))) size from matched
 ), pg as (select total, size, least(greatest(1, coalesce(p_page,1)), greatest(1, ceil(total::numeric/size)::int)) page from paging),
 chunk as (
  select m.* from matched m
  order by m.kyu asc nulls last, m.last_played desc nulls last, m.full_name, m.go_id
  limit (select size from pg) offset (select (page-1)*size from pg)
 )
 select jsonb_build_object('total', p.total, 'page', p.page, 'page_size', p.size,
   'counts', (select by_kyu from counts), 'unknown', (select unknown from counts), 'all', (select total_all from counts),
   'rows', coalesce((select jsonb_agg(jsonb_build_object(
      'go_id', c.go_id, 'name', c.full_name, 'kyu', c.kyu, 'source', c.source,
      'event', c.source_event, 'division', c.source_division, 'date', c.source_date,
      'assoc_kyu', c.assoc_kyu, 'assoc_source', c.assoc_source, 'self_kyu', c.self_kyu, 'last_played', c.last_played,
      'photo', (select nullif(btrim(a.avatar_url),'') from public.gt_athletes a where a.go_id = c.go_id and nullif(btrim(a.avatar_url),'') is not null limit 1),
      'institution', (select a.school_name from public.gt_athletes a where a.go_id = c.go_id and a.profile_public limit 1)
    ) order by c.kyu asc nulls last, c.last_played desc nulls last, c.full_name, c.go_id) from chunk c), '[]'::jsonb))
 from pg p
$function$;
grant execute on function public.gt_kyu_board_v1(int, text, text, int, int) to anon, authenticated;

-- 5) นักกีฬาที่เข้าสู่ระบบ ดู/แก้ระดับคิวของตัวเอง
create or replace function public.gt_my_level_v1()
 returns jsonb language sql stable security definer set search_path to 'pg_catalog' as $function$
  select jsonb_build_object('athlete_id', a.id, 'go_id', a.go_id, 'full_name', a.full_name,
    'dan', case when exists (select 1 from gt_private.history_dan_crosswalk_v1 x where x.go_id = a.go_id) or a.current_rank ~ '(ดั้ง|dan)' then true else false end,
    'dan_rank', case when a.current_rank ~ '(ดั้ง|dan)' then a.current_rank end,
    'kyu', l.kyu, 'source', l.source, 'event', l.source_event, 'division', l.source_division, 'date', l.source_date,
    'assoc_kyu', l.assoc_kyu, 'assoc_source', l.assoc_source, 'division_kyu', l.division_kyu,
    'self_kyu', a.self_kyu, 'self_kyu_at', a.self_kyu_at)
  from public.gt_athletes a
  left join lateral (select * from gt_private.kyu_levels_full_v1(array[a.go_id]) z where z.go_id = a.go_id) l on true
  where a.claimed_by = auth.uid() and auth.uid() is not null limit 1
$function$;
grant execute on function public.gt_my_level_v1() to authenticated;

create or replace function public.gt_set_my_kyu_v1(p_kyu int)
 returns jsonb language plpgsql volatile security definer set search_path to 'pg_catalog' as $function$
declare a public.gt_athletes;
begin
  if auth.uid() is null then raise exception 'ต้องเข้าสู่ระบบก่อน'; end if;
  if p_kyu is not null and (p_kyu < 1 or p_kyu > 15) then raise exception 'เลือกได้ 1–15 คิว'; end if;
  select * into a from public.gt_athletes where claimed_by = auth.uid() limit 1;
  if a.id is null then raise exception 'บัญชีนี้ยังไม่ได้ผูกกับนักกีฬา'; end if;
  if exists (select 1 from gt_private.history_dan_crosswalk_v1 x where x.go_id = a.go_id) or a.current_rank ~ '(ดั้ง|dan)' then
    raise exception 'ระดับดั้งมาจากทำเนียบดั้งสมาคม แก้ไขเองไม่ได้';
  end if;
  update public.gt_athletes set self_kyu = p_kyu, self_kyu_at = case when p_kyu is null then null else now() end where id = a.id;
  return public.gt_my_level_v1();
end $function$;
revoke all on function public.gt_set_my_kyu_v1(int) from public, anon;
grant execute on function public.gt_set_my_kyu_v1(int) to authenticated;
