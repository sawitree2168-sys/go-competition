create table if not exists gt_private.athlete_extra_photos_v1 (
  athlete_id uuid not null references public.gt_athletes(id) on delete cascade,
  slot integer not null check (slot in (1, 2)),
  url text not null check (url <> ''),
  primary key (athlete_id, slot)
);
alter table gt_private.athlete_extra_photos_v1 enable row level security;

create or replace function gt_private.athlete_photo_state_v1(p_athlete uuid, p_primary text)
returns jsonb language sql stable set search_path = pg_catalog as $$
  select jsonb_build_object(
    'primary', nullif(btrim(p_primary), ''),
    'extras', coalesce((select jsonb_object_agg(p.slot, p.url)
                        from gt_private.athlete_extra_photos_v1 p where p.athlete_id = p_athlete), '{}'::jsonb)
  );
$$;
revoke all on function gt_private.athlete_photo_state_v1(uuid, text) from public, anon, authenticated;

create or replace function public.gt_manage_athlete_photos_v1(p_go_id text)
returns jsonb language plpgsql stable security definer set search_path = pg_catalog as $$
declare
  a public.gt_athletes%rowtype;
  actor uuid := auth.uid();
begin
  if actor is null then raise exception 'LOGIN_REQUIRED'; end if;
  select * into a from public.gt_athletes where go_id = p_go_id;
  if a.claimed_by is distinct from actor and not public.gt_is_platform_admin_v1() then
    raise exception 'NOT_ALLOWED';
  end if;
  return gt_private.athlete_photo_state_v1(a.id, a.avatar_url);
end;
$$;
revoke all on function public.gt_manage_athlete_photos_v1(text) from public, anon;
grant execute on function public.gt_manage_athlete_photos_v1(text) to authenticated;

create or replace function public.gt_change_athlete_photo_slot_v1(
  p_go_id text, p_slot integer, p_action text, p_expected text,
  p_expected_primary text default null, p_path text default null, p_reason text default null
)
returns jsonb language plpgsql security definer set search_path = pg_catalog as $$
declare
  a public.gt_athletes%rowtype;
  actor uuid := auth.uid();
  is_admin boolean := public.gt_is_platform_admin_v1();
  reason text := nullif(btrim(p_reason), '');
  avatar constant text := 'https://go-competition.vercel.app/avatars/go-approved-square.svg';
  base_url constant text := 'https://bqyokjwuxyzyiripijbs.supabase.co/storage/v1/object/public/gt-athlete-avatars/';
  primary_url text;
  old_url text;
  new_url text;
begin
  if actor is null then raise exception 'LOGIN_REQUIRED'; end if;
  if p_slot is null or p_slot not in (0, 1, 2) or p_action is null
     or p_action not in ('add', 'remove', 'promote') or (p_action = 'promote' and p_slot = 0) then
    raise exception 'BAD_ACTION';
  end if;
  select * into a from public.gt_athletes where go_id = p_go_id for update;
  if not found then
    if not is_admin then raise exception 'NOT_ALLOWED'; end if;
    insert into public.gt_athletes(go_id, full_name, current_rank)
    select go_id, full_name, nullif(source_rank, '')
    from gt_private.history_identity_registry_v1 where go_id = p_go_id
    on conflict (go_id) do nothing;
    select * into a from public.gt_athletes where go_id = p_go_id for update;
    if not found then raise exception 'NOT_FOUND'; end if;
  end if;
  if a.claimed_by is distinct from actor then
    if not is_admin then raise exception 'NOT_ALLOWED'; end if;
    if length(coalesce(reason, '')) < 4 then raise exception 'REASON_REQUIRED'; end if;
  end if;

  primary_url := nullif(btrim(a.avatar_url), '');
  if p_slot = 0 then
    old_url := primary_url;
  else
    select url into old_url from gt_private.athlete_extra_photos_v1
    where athlete_id = a.id and slot = p_slot;
  end if;
  if old_url is distinct from p_expected or
     (p_action = 'promote' and primary_url is distinct from p_expected_primary) then
    raise exception 'PHOTO_CHANGED';
  end if;

  if p_action = 'add' then
    if old_url is not null and (p_slot <> 0 or old_url <> avatar) then
      raise exception 'SLOT_OCCUPIED';
    end if;
    if p_path is null or not (
      p_path ~ ('^self/' || a.id::text || '/[0-9a-f-]{36}\.jpg$')
      or (is_admin and p_path ~ ('^admin/' || regexp_replace(a.go_id, '[^A-Za-z0-9-]', '', 'g') || '/[0-9a-f-]{36}\.jpg$'))
    ) then raise exception 'BAD_PATH'; end if;
    if not exists (select 1 from storage.objects where bucket_id = 'gt-athlete-avatars' and name = p_path) then
      raise exception 'PHOTO_MISSING';
    end if;
    new_url := base_url || p_path;
    if new_url = primary_url or exists (
      select 1 from gt_private.athlete_extra_photos_v1 where athlete_id = a.id and url = new_url
    ) then raise exception 'PHOTO_DUPLICATE'; end if;
  end if;

  if p_action = 'promote' then
    if old_url is null then raise exception 'PHOTO_MISSING'; end if;
    delete from gt_private.athlete_extra_photos_v1 where athlete_id = a.id and slot = p_slot;
    if primary_url is not null and primary_url <> avatar then
      insert into gt_private.athlete_extra_photos_v1(athlete_id, slot, url) values(a.id, p_slot, primary_url);
    end if;
    new_url := old_url;
  elsif p_slot <> 0 then
    if p_action = 'add' then
      insert into gt_private.athlete_extra_photos_v1(athlete_id, slot, url) values(a.id, p_slot, new_url);
    else
      delete from gt_private.athlete_extra_photos_v1 where athlete_id = a.id and slot = p_slot;
    end if;
    return gt_private.athlete_photo_state_v1(a.id, primary_url);
  elsif p_action = 'remove' then
    new_url := avatar;
  end if;

  if new_url is distinct from primary_url then
    insert into gt_private.athlete_photo_audit_v1(athlete_id, go_id, actor, actor_role, old_url, new_url, reason)
    values(a.id, a.go_id, actor, case when a.claimed_by = actor then 'owner' else 'admin' end, primary_url, new_url, reason);
    update public.gt_athletes set avatar_url = new_url where id = a.id;
  end if;
  return gt_private.athlete_photo_state_v1(a.id, new_url);
end;
$$;
revoke all on function public.gt_change_athlete_photo_slot_v1(text, integer, text, text, text, text, text)
  from public, anon;
grant execute on function public.gt_change_athlete_photo_slot_v1(text, integer, text, text, text, text, text)
  to authenticated;

-- Photos from people already listed in public history, without exposing private gallery slots.
create or replace function public.gt_history_primary_photos_v1(p_go_ids text[])
returns jsonb language sql stable security definer set search_path = pg_catalog as $$
  select coalesce(jsonb_object_agg(a.go_id, btrim(a.avatar_url)), '{}'::jsonb)
  from public.gt_athletes a
  where a.go_id = any(p_go_ids[1:100])
    and nullif(btrim(a.avatar_url), '') is not null
    and exists (select 1 from public.gt_history_people p where p.go_id = a.go_id);
$$;
revoke all on function public.gt_history_primary_photos_v1(text[]) from public;
grant execute on function public.gt_history_primary_photos_v1(text[]) to anon, authenticated;

-- Use the same primary photo for Dan directory entries, keeping private profile details gated.
CREATE OR REPLACE FUNCTION gt_private.public_athlete_directory_v1(p_query text DEFAULT ''::text, p_page integer DEFAULT 1, p_size integer DEFAULT 24)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
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
 ), chunk2 as (
  select c.*, a.id athlete_uuid, coalesce(a.avatar_url, dan_photo.avatar_url) avatar_url, a.school_name, nullif(btrim(a.current_rank),'') a_rank,
    (select gt_private.history_division_level_v1(m.division)
       from public.gt_history_people hp
       join public.gt_history_matches m on hp.id in (m.player_a, m.player_b)
       join public.gt_history_events e on e.id = m.event_id
      where hp.go_id = c.go_id and gt_private.history_division_strength_v1(m.division) is not null
      order by (gt_private.history_division_strength_v1(m.division) is null), gt_private.history_event_sort_date_v1(m.event_id, e.event_date) desc nulls last, e.event_year desc nulls last, gt_private.history_division_strength_v1(m.division) desc nulls last, m.event_id desc
      limit 1) div_label
  from chunk c left join public.gt_athletes a on a.go_id = c.go_id and a.profile_public
  left join public.gt_athletes dan_photo on dan_photo.go_id = c.go_id
    and exists (select 1 from gt_private.history_dan_crosswalk_v1 dc where dc.go_id = c.go_id)
 )
 select jsonb_build_object('total', p.total, 'page', p.page, 'page_size', p.size,
  'rows', coalesce((select jsonb_agg(jsonb_build_object(
     'go_id', c.go_id, 'full_name', c.full_name,
     'rank', coalesce(c.a_rank, c.rank, c.dir_rank, case when c.dan_number is null then c.div_label end),
     'rank_source', case when c.a_rank is not null or c.rank is not null then 'registry'
                         when c.dir_rank is not null then 'association'
                         when c.dan_number is null and c.div_label is not null then 'division' end,
     'photo', c.avatar_url,
     'athlete_id', case when exists (select 1 from public.gt_registrations rg join public.gt_tournaments t on t.id = rg.tournament_id
                                     where rg.athlete_id = c.athlete_uuid and t.published and rg.registration_status in ('confirmed','withdrawn')) then c.athlete_uuid end,
     'institution', c.school_name,
     'dan_number', c.dan_number, 'score', c.score, 'dan_year', c.awarded_year,
     'group', case when c.grp = 0 then 'thai' else 'foreign' end
   ) order by c.ord) from chunk2 c), '[]'::jsonb))
 from paging p
$function$;
