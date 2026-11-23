-- Per-event certificate design (23 Nov 2026).
-- The organiser uploads the event's own certificate picture (designed elsewhere, without names).
-- The site writes each athlete's name and award on top: ranked places 1–3 → "ได้รับรางวัล ชนะเลิศ / รองชนะเลิศอันดับ 1 / 2",
-- friendship medals → "ได้รับรางวัล เหรียญทอง …", everyone else → "เข้าร่วมการแข่งขัน".
-- certificate_template = { bg: public URL, name_y, award_y: 0–1 of the page height, color: "#rrggbb", size: name size px at 2000 wide,
--                          division: show the division line, number: show the certificate number }   (null = the built-in design)

alter table public.gt_tournaments add column if not exists certificate_template jsonb;

-- Picture: organisers of the event upload to the public site bucket under certificate-bg/<event>/.
create or replace function public.gt_can_upload_certificate_bg_v1(p_name text)
returns boolean language plpgsql stable security definer set search_path = public as $$
begin
  if p_name !~ '^certificate-bg/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|webp)$' then
    return false;
  end if;
  return gt_can_manage_tournament_v1(split_part(p_name, '/', 2)::uuid);
end $$;
revoke all on function public.gt_can_upload_certificate_bg_v1(text) from public, anon;
grant execute on function public.gt_can_upload_certificate_bg_v1(text) to authenticated;
drop policy if exists gt_certificate_bg_upload_v1 on storage.objects;
create policy gt_certificate_bg_upload_v1 on storage.objects for insert to authenticated
  with check (bucket_id = 'gt-site-assets' and gt_can_upload_certificate_bg_v1(name));

create or replace function public.gt_staff_set_certificate_template_v1(p_tournament uuid, p_template jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v jsonb; v_bg text;
  num constant text := '^-?[0-9]+(\.[0-9]+)?$';
begin
  perform gt_require_tournament_staff_v1(p_tournament);
  v_bg := p_template->>'bg';
  if p_template is null or jsonb_typeof(p_template) <> 'object' or coalesce(v_bg, '') = '' then
    update gt_tournaments set certificate_template = null where id = p_tournament;
    return jsonb_build_object('ok', true, 'template', null);
  end if;
  -- only pictures uploaded for this event
  if v_bg !~ ('^https://[a-z0-9]+\.supabase\.co/storage/v1/object/public/gt-site-assets/certificate-bg/' || p_tournament::text || '/[0-9a-f-]{36}\.(jpg|png|webp)$') then
    return jsonb_build_object('ok', false, 'error', 'bad_image');
  end if;
  v := jsonb_build_object(
    'bg', v_bg,
    'name_y', least(0.95, greatest(0.05, case when p_template->>'name_y' ~ num then (p_template->>'name_y')::numeric else 0.45 end)),
    'award_y', least(0.97, greatest(0.05, case when p_template->>'award_y' ~ num then (p_template->>'award_y')::numeric else 0.56 end)),
    'size', least(200, greatest(40, case when p_template->>'size' ~ num then (p_template->>'size')::numeric else 104 end)),
    'color', case when p_template->>'color' ~ '^#[0-9a-fA-F]{6}$' then p_template->>'color' else '#0b2a5b' end,
    'division', coalesce((p_template->>'division')::boolean, true),
    'number', coalesce((p_template->>'number')::boolean, false));
  update gt_tournaments set certificate_template = v where id = p_tournament;
  return jsonb_build_object('ok', true, 'template', v);
end $$;
revoke all on function public.gt_staff_set_certificate_template_v1(uuid, jsonb) from public, anon;
grant execute on function public.gt_staff_set_certificate_template_v1(uuid, jsonb) to authenticated;

-- Same as v1 plus 'template' (only once certificates are open).
create or replace function public.gt_athlete_certificates_v1(p_athlete uuid)
returns jsonb language sql stable security definer set search_path = public as $$
  with regs as (
    select r.id reg_id, r.division_id, r.registration_status, t.id tid, t.title, t.event_date, t.venue, t.certificates_open, t.certificate_signers, t.certificate_template,
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
      'template', case when r.certificates_open then r.certificate_template end,
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
grant execute on function public.gt_athlete_certificates_v1(uuid) to anon, authenticated;
