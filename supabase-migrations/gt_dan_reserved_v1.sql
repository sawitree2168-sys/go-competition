-- Dan numbers sold at the association auction whose buyer has not passed the dan exam yet (18 Nov 2026).
-- The association lists them in brackets. Public pages show only the number; the buyer's name stays private.
create table if not exists gt_private.dan_reserved_v1 (
  dan_number int primary key,
  buyer_name text,
  note text,
  created_at timestamptz not null default now()
);
alter table gt_private.dan_reserved_v1 enable row level security;

insert into gt_private.dan_reserved_v1 (dan_number, buyer_name)
select d.dan_number::int, btrim(d.full_name, '() ')
from gt_private.legacy_dan_directory_v5 d
where d.dan_number in ('1101', '1111')
on conflict do nothing;
insert into gt_private.dan_reserved_v1 (dan_number)
select unnest(array[1168, 1178, 1187, 1188, 1195, 1199, 1200, 1222, 1234])
on conflict do nothing;

create or replace function public.gt_dan_board_v1()
returns jsonb language sql stable security definer set search_path = public, gt_private as $$
  select jsonb_build_object(
    'synced_at', greatest((select max(imported_at) from gt_private.dan_announcements_v1),
                          (select max(synced_at) from gt_private.legacy_dan_directory_v5)),
    'source_url', 'https://www.thaigo.org/ประกาศรายชื่อดั้ง/',
    'announcements', coalesce((
      select jsonb_agg(gt_private.dan_person_v1(n.dan_number, n.full_name) || jsonb_build_object(
               'title', n.title, 'announced_on', n.announced_on,
               'examiners', jsonb_build_array(
                 gt_private.dan_person_v1(n.qualifier1_dan, n.qualifier1_name) || '{"role":"Qualifier 1"}',
                 gt_private.dan_person_v1(n.qualifier2_dan, n.qualifier2_name) || '{"role":"Qualifier 2"}',
                 gt_private.dan_person_v1(n.verifier_dan, n.verifier_name) || '{"role":"Verifier"}'))
             order by n.announced_on desc, n.dan_number desc)
      from gt_private.dan_announcements_v1 n), '[]'::jsonb),
    'directory', coalesce((
      select jsonb_agg(jsonb_build_object(
               'dan', d.dan_number::int, 'name', d.full_name, 'level', nullif(d.source_rank, ''),
               'diamond', d.diamond, 'year', d.awarded_year, 'go_id', c.go_id,
               'photo', nullif(btrim(a.avatar_url), ''))
             order by d.dan_number::int)
      from gt_private.legacy_dan_directory_v5 d
      left join gt_private.history_dan_crosswalk_v1 c on c.dan_number = d.dan_number::int
      left join gt_athletes a on a.go_id = c.go_id
      where d.dan_number ~ '^[0-9]+$'
        and not exists (select 1 from gt_private.dan_reserved_v1 r where r.dan_number = d.dan_number::int)), '[]'::jsonb),
    -- Numbers only: buyer names are not published until the exam is passed.
    'reserved', coalesce((select jsonb_agg(r.dan_number order by r.dan_number) from gt_private.dan_reserved_v1 r
                          where not exists (select 1 from gt_private.dan_announcements_v1 n where n.dan_number = r.dan_number)), '[]'::jsonb));
$$;
grant execute on function public.gt_dan_board_v1() to anon, authenticated;
