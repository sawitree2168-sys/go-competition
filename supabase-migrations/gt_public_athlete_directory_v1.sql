-- Public registry fields only, matching the existing public registration search scope.
-- Owner-only history and identity review records remain inaccessible.
create or replace function gt_private.public_athlete_directory_v1(p_query text default '',p_page integer default 1,p_size integer default 24)
returns jsonb language sql stable security definer set search_path=pg_catalog as $$
 with candidates as (
  select r.go_id,r.full_name,gt_private.rank_label_v1(r.source_rank) rank from gt_private.history_identity_registry_v1 r where r.go_id<>'GO106260826'
  union all
  select a.go_id,a.full_name,a.current_rank from public.gt_athletes a where a.profile_public and not exists(select 1 from gt_private.history_identity_registry_v1 r where r.go_id=a.go_id)
 ), matched as (
  select c.* from candidates c where coalesce(p_query,'')='' or position(lower(left(btrim(p_query),80)) in lower(c.full_name))>0 or position(lower(left(btrim(p_query),80)) in lower(c.go_id))>0
 ), settings as (select greatest(1,least(60,coalesce(p_size,24))) size), totals as (select count(*) total from matched), paging as (
  select total,size,least(greatest(1,coalesce(p_page,1)),greatest(1,ceil(total::numeric/size)::int)) page from totals cross join settings
 ), chunk as (
  select c.* from matched c order by c.full_name,c.go_id limit (select size from paging) offset (select (page-1)*size from paging)
 )
 select jsonb_build_object('total',p.total,'page',p.page,'page_size',p.size,'rows',coalesce((select jsonb_agg(jsonb_build_object(
  'go_id',c.go_id,'full_name',c.full_name,'rank',coalesce(a.current_rank,c.rank),'photo',a.avatar_url,'athlete_id',case when exists(select 1 from public.gt_registrations rg join public.gt_tournaments t on t.id=rg.tournament_id where rg.athlete_id=a.id and t.published and rg.registration_status in ('confirmed','withdrawn')) then a.id else null end,'institution',a.school_name
 ) order by c.full_name,c.go_id) from chunk c left join public.gt_athletes a on a.go_id=c.go_id and a.profile_public),'[]'::jsonb)) from paging p
$$;
revoke all on function gt_private.public_athlete_directory_v1(text,integer,integer) from public;
grant execute on function gt_private.public_athlete_directory_v1(text,integer,integer) to anon,authenticated;
create or replace function public.gt_public_athlete_directory_v1(p_query text default '',p_page integer default 1,p_size integer default 24)
returns jsonb language sql stable security invoker set search_path=pg_catalog as $$
 select gt_private.public_athlete_directory_v1(p_query,p_page,p_size)
$$;
revoke all on function public.gt_public_athlete_directory_v1(text,integer,integer) from public;
grant execute on function public.gt_public_athlete_directory_v1(text,integer,integer) to anon,authenticated;
