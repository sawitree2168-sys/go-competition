-- สถานะการสมัคร: find an application by full name + division + phone instead of the 6-letter reference
-- (17 Nov 2026, ครูเล็ก: "เลขอ้างอิงไม่เอา แก้เป็นชื่อนามสกุลและรุ่นแข่งขัน"). The phone stays as the secret:
-- without it anyone could open (and withdraw) someone else's entry by typing their name.
create or replace function public.gt_application_find_v1(p_name text, p_division uuid, p_phone text) returns jsonb
language plpgsql security definer set search_path = public, gt_private as $$
declare v_name text := lower(regexp_replace(coalesce(p_name, ''), '[[:space:]]|[' || chr(8203) || '-' || chr(8205) || chr(65279) || ']', '', 'g'));
        v_phone text := regexp_replace(coalesce(p_phone, ''), '[^0-9]', '', 'g');
        v_key text; v_id uuid;
begin
  if length(v_name) < 2 or p_division is null or v_phone !~ '^0[0-9]{8,9}$' then
    return jsonb_build_object('ok', false, 'error', 'NOT_FOUND');
  end if;
  v_key := left('N:' || p_division || ':' || v_name, 200);
  if (select count(*) from application_lookup_failures_v1 f where f.reference = v_key and f.at > now() - interval '1 hour') >= 8 then
    return jsonb_build_object('ok', false, 'error', 'LOCKED');
  end if;
  select a.id into v_id
  from gt_web_applications a join web_application_details_v1 w on w.application_id = a.id
  join gt_tournaments t on t.id = a.tournament_id and t.published
  where a.division_id = p_division and w.phone = v_phone
    and lower(regexp_replace(a.full_name, '[[:space:]]|[' || chr(8203) || '-' || chr(8205) || chr(65279) || ']', '', 'g')) = v_name
  order by (a.status = 'rejected'), a.created_at desc limit 1;
  if v_id is null then
    insert into application_lookup_failures_v1 (reference) values (v_key);
    return jsonb_build_object('ok', false, 'error', 'NOT_FOUND');
  end if;
  return jsonb_build_object('ok', true, 'application', gt_private.application_json_v1(v_id));
end $$;
revoke all on function public.gt_application_find_v1(text, uuid, text) from public;
grant execute on function public.gt_application_find_v1(text, uuid, text) to anon, authenticated;
