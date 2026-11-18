-- ประกาศรายชื่อดั้งใหม่ (18 Nov 2026).
-- Source: Thailand Go Association. Dan list (ทำเนียบดั้งไทย, Google Sheet 1-Dl1blZgqCVLDwPEevfEevLI_ve-X6cCOIUD1TlQyV4)
-- gives dan number, level, the diamond mark (*) and the year; the association's announcement page
-- (https://www.thaigo.org/ประกาศรายชื่อดั้ง/) gives the announcement date and the examiners
-- (Qualifier 1, Qualifier 2, Verifier). Examiners are stored with their dan number, so their name,
-- photo and profile always come from our own registry. Entries in brackets in the dan list are not imported.

alter table gt_private.legacy_dan_directory_v5
  add column if not exists diamond boolean not null default false,
  add column if not exists awarded_raw text,
  add column if not exists awarded_year int,
  add column if not exists synced_at timestamptz;

create table if not exists gt_private.dan_announcements_v1 (
  dan_number int primary key,
  announced_on date not null,
  full_name text not null,
  title text,
  qualifier1_name text, qualifier1_dan int,
  qualifier2_name text, qualifier2_dan int,
  verifier_name text, verifier_dan int,
  source_url text not null default 'https://www.thaigo.org/ประกาศรายชื่อดั้ง/',
  imported_at timestamptz not null default now()
);
alter table gt_private.dan_announcements_v1 enable row level security;

-- One person as the public pages may show them: registry name, GO ID, avatar, and a profile link
-- only when the athlete already has a public profile (an entry in a published event).
create or replace function gt_private.dan_person_v1(p_dan int, p_fallback text)
returns jsonb language sql stable security definer set search_path = public, gt_private as $$
  select jsonb_build_object(
    'dan', p_dan,
    'name', coalesce(d.full_name, p_fallback),
    'level', nullif(d.source_rank, ''),
    'diamond', coalesce(d.diamond, false),
    'go_id', c.go_id,
    'photo', nullif(btrim(a.avatar_url), ''),
    'profile_id', case when exists (select 1 from gt_registrations r join gt_tournaments t on t.id = r.tournament_id
                                    where r.athlete_id = a.id and t.published and r.registration_status in ('confirmed', 'withdrawn'))
                       then a.id end)
  from (select 1) one
  left join gt_private.legacy_dan_directory_v5 d on p_dan is not null and d.dan_number = p_dan::text
  left join gt_private.history_dan_crosswalk_v1 c on c.dan_number = p_dan
  left join gt_athletes a on a.go_id = c.go_id;
$$;
revoke all on function gt_private.dan_person_v1(int, text) from public, anon, authenticated;

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
      where d.dan_number ~ '^[0-9]+$'), '[]'::jsonb));
$$;
grant execute on function public.gt_dan_board_v1() to anon, authenticated;
