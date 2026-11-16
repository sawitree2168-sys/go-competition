-- Certificates on the athlete profile (design 16 Nov 2026).
-- Built from results: ranked divisions → ชนะเลิศ / รองชนะเลิศอันดับ 1 / อันดับ 2, friendship divisions → medal by wins,
-- everyone else → participation. Downloadable only after the organiser opens them for the event.
-- Signers (name + position, up to 2) are typed by the organiser; no signature images.

alter table public.gt_tournaments add column if not exists certificates_open boolean not null default false;
alter table public.gt_tournaments add column if not exists certificate_signers jsonb not null default '[]'::jsonb;
do $$ begin
  alter table public.gt_tournaments add constraint gt_tournaments_certificate_signers_v1
    check (jsonb_typeof(certificate_signers) = 'array' and jsonb_array_length(certificate_signers) <= 2);
exception when duplicate_object then null; end $$;

create or replace function public.gt_staff_set_certificates_v1(p_tournament uuid, p_open boolean, p_signers jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_signers jsonb;
begin
  perform gt_require_tournament_staff_v1(p_tournament);
  select coalesce(jsonb_agg(jsonb_build_object('name', left(btrim(coalesce(s->>'name', '')), 80), 'title', left(btrim(coalesce(s->>'title', '')), 80))), '[]'::jsonb)
    into v_signers
  from (select s from jsonb_array_elements(case when jsonb_typeof(p_signers) = 'array' then p_signers else '[]'::jsonb end) s
        where btrim(coalesce(s->>'name', '')) <> '' or btrim(coalesce(s->>'title', '')) <> '' limit 2) x;
  update gt_tournaments set certificates_open = coalesce(p_open, false), certificate_signers = v_signers where id = p_tournament;
  return jsonb_build_object('ok', true, 'open', coalesce(p_open, false), 'signers', v_signers);
end $$;

-- Public: one row per division the athlete entered (published events). Award only once the event's certificates are open.
create or replace function public.gt_athlete_certificates_v1(p_athlete uuid)
returns jsonb language sql stable security definer set search_path = public as $$
  with regs as (
    select r.id reg_id, r.division_id, r.registration_status, t.id tid, t.title, t.event_date, t.venue, t.certificates_open, t.certificate_signers,
           o.name organizer, d.name dname, d.award_scheme, d.friendship_gold_min_wins g, d.friendship_silver_min_wins s, d.friendship_bronze_min_wins b
    from gt_registrations r join gt_tournaments t on t.id = r.tournament_id join gt_divisions d on d.id = r.division_id
    left join gt_organizers o on o.id = t.organizer_id
    where r.athlete_id = p_athlete and t.published and r.registration_status in ('confirmed', 'withdrawn')
  ),
  st as (
    select x.division_id, s.pos, s.wins, s.byes, s.withdrawn
    from (select distinct division_id from regs where certificates_open) x
    cross join lateral gt_division_standings_v3(x.division_id) s where s.athlete_id = p_athlete
  )
  select coalesce(jsonb_agg(jsonb_build_object(
      'tournament_id', r.tid, 'title', r.title, 'event_date', r.event_date, 'venue', r.venue, 'organizer', r.organizer,
      'division_id', r.division_id, 'division', r.dname, 'open', r.certificates_open,
      'signers', case when r.certificates_open then r.certificate_signers else '[]'::jsonb end,
      'number', case when r.certificates_open then 'GT-' || upper(left(replace(r.reg_id::text, '-', ''), 8)) end,
      'kind', case when not r.certificates_open then null
                   when r.award_scheme = 'friendship_wins' and not coalesce(st.withdrawn, false) and coalesce(st.wins, 0) + coalesce(st.byes, 0) >= coalesce(r.b, 2) then 'medal'
                   when coalesce(r.award_scheme, 'ranking') <> 'friendship_wins' and st.pos between 1 and 3 then 'placement'
                   else 'participation' end,
      'pos', case when r.certificates_open and coalesce(r.award_scheme, 'ranking') <> 'friendship_wins' and st.pos between 1 and 3 then st.pos end,
      'medal', case when r.certificates_open and r.award_scheme = 'friendship_wins' and not coalesce(st.withdrawn, false) then
                      case when coalesce(st.wins, 0) + coalesce(st.byes, 0) >= coalesce(r.g, 4) then 'gold'
                           when coalesce(st.wins, 0) + coalesce(st.byes, 0) >= coalesce(r.s, 3) then 'silver'
                           when coalesce(st.wins, 0) + coalesce(st.byes, 0) >= coalesce(r.b, 2) then 'bronze' end end)
    order by r.event_date desc nulls last, r.title, r.dname), '[]'::jsonb)
  from regs r left join st on st.division_id = r.division_id
$$;

revoke all on function public.gt_staff_set_certificates_v1(uuid, boolean, jsonb) from public, anon;
grant execute on function public.gt_staff_set_certificates_v1(uuid, boolean, jsonb) to authenticated;
grant execute on function public.gt_athlete_certificates_v1(uuid) to anon, authenticated;
