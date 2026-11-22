-- หน้านักกีฬา: ระดับคิวใช้กติกาเดียวกับทำเนียบคิว (นักกีฬาแก้เอง → รุ่นที่แข่งล่าสุด/ทำเนียบคิวสมาคม ที่สูงกว่า)
create or replace function gt_private.public_athlete_directory_v1(p_query text default ''::text, p_page integer default 1, p_size integer default 24)
 returns jsonb language sql stable security definer set search_path to 'pg_catalog' as $function$
 with candidates as (
  select r.go_id, r.full_name, gt_private.rank_label_v1(r.source_rank) rank
  from gt_private.history_identity_registry_v1 r where r.go_id <> 'GO106260826'
  union all
  select a.go_id, a.full_name, a.current_rank from public.gt_athletes a
  where a.profile_public and not exists (select 1 from gt_private.history_identity_registry_v1 r where r.go_id = a.go_id)
 ), latest as (
  select distinct on (h.dan_number) h.dan_number, h.score
  from gt_private.dan_rating_history_v1 h order by h.dan_number, h.rated_on desc
 ), dir_extra as (
  select d.dan_number::int dan_number, regexp_replace(d.full_name,'[\s​]','','g') n
  from gt_private.legacy_dan_directory_v5 d
  where d.dan_number ~ '^[0-9]+$'
    and not exists (select 1 from gt_private.history_dan_crosswalk_v1 x where x.dan_number = d.dan_number::int)
 ), dan_map as (
  select x.go_id, min(x.dan_number) dan_number from gt_private.history_dan_crosswalk_v1 x group by x.go_id
 ), enriched as (
  select c.*, coalesce(dm.dan_number, de.dan_number) dan_number
  from candidates c
  left join dan_map dm on dm.go_id = c.go_id
  left join dir_extra de on dm.go_id is null and de.n = regexp_replace(c.full_name,'[\s​]','','g')
 ), enriched2 as (
  select e.*, d.awarded_year, l.score, case when btrim(d.source_rank) ~ '^[1-9]$' then btrim(d.source_rank) || ' ดั้ง' end dir_rank,
    case when e.dan_number is not null or e.full_name ~ '[ก-๙]' then 0 else 1 end grp
  from enriched e
  left join gt_private.legacy_dan_directory_v5 d on d.dan_number = e.dan_number::text
  left join latest l on l.dan_number = e.dan_number
 ), matched as (
  select e.* from enriched2 e
  where coalesce(p_query,'') = ''
     or position(lower(left(btrim(p_query),80)) in lower(e.full_name)) > 0
     or position(lower(left(btrim(p_query),80)) in lower(e.go_id)) > 0
     or e.dan_number::text = btrim(p_query)
 ), settings as (select greatest(1, least(100, coalesce(p_size,24))) size),
 totals as (select count(*) total from matched),
 paging as (
  select total, size, least(greatest(1, coalesce(p_page,1)), greatest(1, ceil(total::numeric/size)::int)) page
  from totals cross join settings
 ), ordered as (
  select m.*, row_number() over (order by m.grp, m.score desc nulls last, m.awarded_year asc nulls last,
                                          m.dan_number asc nulls last, m.full_name, m.go_id) ord
  from matched m
 ), chunk as (
  select o.* from ordered o order by o.ord
  limit (select size from paging) offset (select (page-1)*size from paging)
 ), kyu as (
  select * from gt_private.kyu_levels_full_v1((select coalesce(array_agg(go_id), '{}') from chunk where dan_number is null))
 ), chunk2 as (
  select c.*, a.id athlete_uuid, coalesce(a.avatar_url, dan_photo.avatar_url) avatar_url, a.school_name, nullif(btrim(a.current_rank),'') a_rank,
    k.kyu, k.source kyu_source
  from chunk c left join public.gt_athletes a on a.go_id = c.go_id and a.profile_public
  left join public.gt_athletes dan_photo on dan_photo.go_id = c.go_id
    and exists (select 1 from gt_private.history_dan_crosswalk_v1 dc where dc.go_id = c.go_id)
  left join kyu k on k.go_id = c.go_id and c.dan_number is null
 )
 select jsonb_build_object('total', p.total, 'page', p.page, 'page_size', p.size,
  'rows', coalesce((select jsonb_agg(jsonb_build_object(
     'go_id', c.go_id, 'full_name', c.full_name,
     'rank', coalesce(case when c.a_rank ~ 'ดั้ง' then c.a_rank end, case when c.rank ~ 'ดั้ง' then c.rank end, c.dir_rank,
                      case when c.kyu is not null then c.kyu || ' คิว' end,
                      case when c.dan_number is null then null else coalesce(c.a_rank, c.rank) end),
     'rank_source', case when c.a_rank ~ 'ดั้ง' or c.rank ~ 'ดั้ง' then 'registry'
                         when c.dir_rank is not null then 'association'
                         when c.kyu is not null then c.kyu_source end,
     'photo', c.avatar_url,
     'athlete_id', case when exists (select 1 from public.gt_registrations rg join public.gt_tournaments t on t.id = rg.tournament_id
                                     where rg.athlete_id = c.athlete_uuid and t.published and rg.registration_status in ('confirmed','withdrawn')) then c.athlete_uuid end,
     'institution', c.school_name,
     'dan_number', c.dan_number, 'score', c.score, 'dan_year', c.awarded_year,
     'group', case when c.grp = 0 then 'thai' else 'foreign' end
   ) order by c.ord) from chunk2 c), '[]'::jsonb))
 from paging p
$function$;
