-- รางวัล: ถ้วย ใบประกาศ เงินรางวัล (23 Nov 2026).
-- • ผู้จัดตั้งรางวัลต่อรุ่น (อันดับ 1–3 ของแต่ละสาย): เงิน + ถ้วย. รุ่นเฟรนชิพ = เหรียญ + ใบประกาศ ไม่มีเงิน.
-- • รายชื่อผู้ได้รางวัลมาจากผลแข่งในระบบ (gt_division_standings_v3) — ไม่ต้องพิมพ์เอง.
-- • ผู้จัดกด "ประกาศรางวัล" → นักกีฬาเห็นรางวัลในหน้าบัญชีของตัวเอง แนบรูปยืนยัน (ถือถ้วย/ใบประกาศ) และกรอกบัญชี/QR รับเงินครั้งเดียวใช้ทุกงาน.
-- • ผู้จัดของรายการเห็นบัญชี/QR/รูปยืนยัน เฉพาะนักกีฬาที่ได้เงินรางวัลในรายการของตัวเอง; ติ๊ก "ให้ถ้วยแล้ว" / "โอนแล้ว" (+ สลิป).
-- Files live in the private bucket gt-payment-slips: athlete files under {auth.uid()}/prize/..., transfer slips under prize-slip/{uuid}.ext

alter table public.gt_tournaments add column if not exists prizes_open boolean not null default false;

create table if not exists public.gt_prize_rules_v1 (
  division_id uuid not null references public.gt_divisions(id) on delete cascade,
  place int not null check (place between 1 and 3),
  cash int not null default 0 check (cash between 0 and 10000000),
  trophy boolean not null default true,
  primary key (division_id, place)
);
alter table public.gt_prize_rules_v1 enable row level security;

create table if not exists public.gt_prize_status_v1 (
  division_id uuid not null references public.gt_divisions(id) on delete cascade,
  athlete_id uuid not null references public.gt_athletes(id) on delete cascade,
  trophy_given_at timestamptz,
  paid_at timestamptz,
  paid_amount int,
  slip_path text,
  proof_path text,
  proof_at timestamptz,
  updated_by uuid,
  primary key (division_id, athlete_id)
);
alter table public.gt_prize_status_v1 enable row level security;

create table if not exists gt_private.athlete_payout_v1 (
  athlete_id uuid primary key references public.gt_athletes(id) on delete cascade,
  bank_name text, account_name text, account_no text, promptpay text, qr_path text,
  updated_at timestamptz not null default now()
);
alter table gt_private.athlete_payout_v1 enable row level security;

-- winners of one tournament (ranking divisions, place 1–3 of each pool, with a rule that gives something)
create or replace function gt_private.prize_winners_v1(p_tournament uuid)
returns table (division_id uuid, division text, pool text, place int, athlete_id uuid, name text, institution text, cash int, trophy boolean)
language sql stable security definer set search_path = public, gt_private as $$
  select d.id, d.name, s.pool_label, s.pos, s.athlete_id, s.display_name, s.institution, coalesce(r.cash, 0), coalesce(r.trophy, false)
  from gt_divisions d
  cross join lateral gt_division_standings_v3(d.id, null) s
  join gt_prize_rules_v1 r on r.division_id = d.id and r.place = s.pos
  where d.tournament_id = p_tournament and coalesce(d.award_scheme, 'ranking') <> 'friendship_wins'
    and s.pos between 1 and 3 and not coalesce(s.withdrawn, false) and s.athlete_id is not null
    and s.wins + s.losses + coalesce(s.draws, 0) + s.byes > 0
    and (coalesce(r.cash, 0) > 0 or coalesce(r.trophy, false))
$$;

-- ---------- ผู้จัด ----------
create or replace function public.gt_staff_prize_setup_v1(p_tournament uuid) returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  perform gt_require_tournament_staff_v1(p_tournament);
  return jsonb_build_object(
    'open', (select prizes_open from gt_tournaments where id = p_tournament),
    'divisions', coalesce((select jsonb_agg(jsonb_build_object('id', d.id, 'name', d.name, 'friendship', d.award_scheme = 'friendship_wins',
        'rules', coalesce((select jsonb_agg(jsonb_build_object('place', r.place, 'cash', r.cash, 'trophy', r.trophy) order by r.place)
                           from gt_prize_rules_v1 r where r.division_id = d.id), '[]'::jsonb)) order by d.name)
      from gt_divisions d where d.tournament_id = p_tournament), '[]'::jsonb));
end $$;

create or replace function public.gt_staff_set_prize_rule_v1(p_division uuid, p_place int, p_cash int, p_trophy boolean) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_t uuid;
begin
  select tournament_id into v_t from gt_divisions where id = p_division;
  perform gt_require_tournament_staff_v1(v_t);
  if p_place not between 1 and 3 then raise exception 'อันดับ 1–3 เท่านั้น'; end if;
  if coalesce(p_cash, 0) = 0 and not coalesce(p_trophy, false) then
    delete from gt_prize_rules_v1 where division_id = p_division and place = p_place;
  else
    insert into gt_prize_rules_v1(division_id, place, cash, trophy) values (p_division, p_place, greatest(coalesce(p_cash, 0), 0), coalesce(p_trophy, false))
    on conflict (division_id, place) do update set cash = excluded.cash, trophy = excluded.trophy;
  end if;
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.gt_staff_set_prizes_open_v1(p_tournament uuid, p_open boolean) returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  perform gt_require_tournament_staff_v1(p_tournament);
  update gt_tournaments set prizes_open = coalesce(p_open, false) where id = p_tournament;
  return jsonb_build_object('ok', true, 'open', coalesce(p_open, false));
end $$;

create or replace function public.gt_staff_prize_board_v1(p_tournament uuid) returns jsonb
language plpgsql stable security definer set search_path = public, gt_private as $$
begin
  perform gt_require_tournament_staff_v1(p_tournament);
  return coalesce((select jsonb_agg(jsonb_build_object(
      'division_id', w.division_id, 'division', w.division, 'pool', w.pool, 'place', w.place,
      'athlete_id', w.athlete_id, 'name', coalesce(a.full_name, w.name), 'institution', w.institution, 'photo', a.avatar_url, 'go_id', a.go_id,
      'cash', w.cash, 'trophy', w.trophy, 'has_account', a.claimed_by is not null,
      'payout', case when w.cash > 0 and p.athlete_id is not null then jsonb_build_object('bank', p.bank_name, 'account_name', p.account_name,
                  'account_no', p.account_no, 'promptpay', p.promptpay, 'qr_path', p.qr_path, 'updated_at', p.updated_at) end,
      'proof_path', st.proof_path, 'proof_at', st.proof_at, 'trophy_given_at', st.trophy_given_at,
      'paid_at', st.paid_at, 'paid_amount', st.paid_amount, 'slip_path', st.slip_path)
      order by w.division, w.pool nulls first, w.place)
    from gt_private.prize_winners_v1(p_tournament) w
    left join gt_athletes a on a.id = w.athlete_id
    left join gt_private.athlete_payout_v1 p on p.athlete_id = w.athlete_id
    left join gt_prize_status_v1 st on st.division_id = w.division_id and st.athlete_id = w.athlete_id), '[]'::jsonb);
end $$;

-- p_what: 'trophy' | 'paid'
create or replace function public.gt_staff_mark_prize_v1(p_division uuid, p_athlete uuid, p_what text, p_done boolean, p_amount int default null, p_slip text default null) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_t uuid;
begin
  select tournament_id into v_t from gt_divisions where id = p_division;
  perform gt_require_tournament_staff_v1(v_t);
  if p_slip is not null and p_slip !~ '^prize-slip/[0-9a-f-]{36}\.(jpg|png|webp|pdf)$' then raise exception 'ไฟล์สลิปไม่ถูกต้อง'; end if;
  insert into gt_prize_status_v1(division_id, athlete_id, updated_by) values (p_division, p_athlete, auth.uid()) on conflict do nothing;
  if p_what = 'trophy' then
    update gt_prize_status_v1 set trophy_given_at = case when p_done then now() end, updated_by = auth.uid() where division_id = p_division and athlete_id = p_athlete;
  elsif p_what = 'paid' then
    update gt_prize_status_v1 set paid_at = case when p_done then now() end, paid_amount = case when p_done then p_amount end,
      slip_path = case when p_done then coalesce(p_slip, slip_path) end, updated_by = auth.uid()
    where division_id = p_division and athlete_id = p_athlete;
  else raise exception 'unknown'; end if;
  return jsonb_build_object('ok', true);
end $$;

-- ---------- นักกีฬา (บัญชีของตัวเอง) ----------
create or replace function public.gt_my_prizes_v1() returns jsonb
language plpgsql stable security definer set search_path = public, gt_private as $$
declare a gt_athletes;
begin
  if auth.uid() is null then raise exception 'ต้องเข้าสู่ระบบก่อน'; end if;
  select * into a from gt_athletes where claimed_by = auth.uid() limit 1;
  if a.id is null then return jsonb_build_object('athlete', null, 'prizes', '[]'::jsonb, 'payout', null); end if;
  return jsonb_build_object(
    'athlete', jsonb_build_object('id', a.id, 'name', a.full_name),
    'payout', (select to_jsonb(p) - 'athlete_id' from gt_private.athlete_payout_v1 p where p.athlete_id = a.id),
    'prizes', coalesce((select jsonb_agg(jsonb_build_object('tournament_id', t.id, 'title', t.title, 'event_date', t.event_date,
        'division_id', w.division_id, 'division', w.division, 'pool', w.pool, 'place', w.place, 'cash', w.cash, 'trophy', w.trophy,
        'proof_path', st.proof_path, 'trophy_given_at', st.trophy_given_at, 'paid_at', st.paid_at, 'paid_amount', st.paid_amount, 'slip_path', st.slip_path)
        order by t.event_date desc nulls last)
      from gt_registrations r join gt_tournaments t on t.id = r.tournament_id and t.prizes_open
      cross join lateral gt_private.prize_winners_v1(t.id) w
      left join gt_prize_status_v1 st on st.division_id = w.division_id and st.athlete_id = a.id
      where r.athlete_id = a.id and w.athlete_id = a.id and w.division_id = r.division_id), '[]'::jsonb));
end $$;

create or replace function public.gt_set_my_payout_v1(p_bank text, p_account_name text, p_account_no text, p_promptpay text, p_qr_path text) returns jsonb
language plpgsql security definer set search_path = public, gt_private as $$
declare a gt_athletes;
begin
  if auth.uid() is null then raise exception 'ต้องเข้าสู่ระบบก่อน'; end if;
  select * into a from gt_athletes where claimed_by = auth.uid() limit 1;
  if a.id is null then raise exception 'บัญชีนี้ยังไม่ได้ผูกกับนักกีฬา'; end if;
  if p_qr_path is not null and p_qr_path <> '' and split_part(p_qr_path, '/', 1) <> auth.uid()::text then raise exception 'ไฟล์ QR ไม่ถูกต้อง'; end if;
  insert into gt_private.athlete_payout_v1(athlete_id, bank_name, account_name, account_no, promptpay, qr_path, updated_at)
  values (a.id, left(nullif(btrim(p_bank), ''), 80), left(nullif(btrim(p_account_name), ''), 120), left(nullif(regexp_replace(coalesce(p_account_no, ''), '[^0-9-]', '', 'g'), ''), 30),
          left(nullif(regexp_replace(coalesce(p_promptpay, ''), '[^0-9]', '', 'g'), ''), 20), nullif(p_qr_path, ''), now())
  on conflict (athlete_id) do update set bank_name = excluded.bank_name, account_name = excluded.account_name, account_no = excluded.account_no,
    promptpay = excluded.promptpay, qr_path = coalesce(excluded.qr_path, athlete_payout_v1.qr_path), updated_at = now();
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.gt_set_my_prize_proof_v1(p_division uuid, p_path text) returns jsonb
language plpgsql security definer set search_path = public, gt_private as $$
declare a gt_athletes; v_t uuid;
begin
  if auth.uid() is null then raise exception 'ต้องเข้าสู่ระบบก่อน'; end if;
  select * into a from gt_athletes where claimed_by = auth.uid() limit 1;
  select tournament_id into v_t from gt_divisions where id = p_division;
  if a.id is null or not exists (select 1 from gt_private.prize_winners_v1(v_t) w where w.division_id = p_division and w.athlete_id = a.id) then
    raise exception 'ไม่พบรางวัลของคุณในรุ่นนี้';
  end if;
  if split_part(coalesce(p_path, ''), '/', 1) <> auth.uid()::text then raise exception 'ไฟล์ไม่ถูกต้อง'; end if;
  insert into gt_prize_status_v1(division_id, athlete_id, proof_path, proof_at) values (p_division, a.id, p_path, now())
  on conflict (division_id, athlete_id) do update set proof_path = excluded.proof_path, proof_at = now();
  return jsonb_build_object('ok', true);
end $$;

-- who may open a prize file (QR, proof photo, transfer slip)
create or replace function public.gt_can_view_prize_file_v1(p_name text) returns boolean
language sql stable security definer set search_path = public, gt_private as $$
  select auth.uid() is not null and (
    exists (select 1 from gt_prize_status_v1 st join gt_divisions d on d.id = st.division_id join gt_athletes a on a.id = st.athlete_id
            where (st.slip_path = p_name or st.proof_path = p_name)
              and (a.claimed_by = auth.uid() or gt_can_manage_tournament_v1(d.tournament_id)))
    or exists (select 1 from gt_private.athlete_payout_v1 p
               join gt_registrations r on r.athlete_id = p.athlete_id
               join gt_prize_rules_v1 ru on ru.division_id = r.division_id and ru.cash > 0
               join gt_divisions d on d.id = r.division_id
               where p.qr_path = p_name and gt_can_manage_tournament_v1(d.tournament_id)))
$$;

drop policy if exists gt_prize_file_read_v1 on storage.objects;
create policy gt_prize_file_read_v1 on storage.objects for select to authenticated
  using (bucket_id = 'gt-payment-slips' and (name like 'prize-slip/%' or name like '%/prize/%') and public.gt_can_view_prize_file_v1(name));
drop policy if exists gt_prize_slip_upload_v1 on storage.objects;
create policy gt_prize_slip_upload_v1 on storage.objects for insert to authenticated
  with check (bucket_id = 'gt-payment-slips' and name ~ '^prize-slip/[0-9a-f-]{36}\.(jpg|png|webp|pdf)$'
    and (exists (select 1 from public.gt_organizer_members m where m.user_id = auth.uid() and m.active)
         or exists (select 1 from public.gt_event_roles_v1 r where r.user_id = auth.uid() and r.role = 'pairing')
         or public.gt_is_platform_admin_v1()));

revoke all on function public.gt_staff_prize_setup_v1(uuid), public.gt_staff_set_prize_rule_v1(uuid, int, int, boolean), public.gt_staff_set_prizes_open_v1(uuid, boolean),
  public.gt_staff_prize_board_v1(uuid), public.gt_staff_mark_prize_v1(uuid, uuid, text, boolean, int, text), public.gt_my_prizes_v1(),
  public.gt_set_my_payout_v1(text, text, text, text, text), public.gt_set_my_prize_proof_v1(uuid, text), public.gt_can_view_prize_file_v1(text) from public, anon;
grant execute on function public.gt_staff_prize_setup_v1(uuid), public.gt_staff_set_prize_rule_v1(uuid, int, int, boolean), public.gt_staff_set_prizes_open_v1(uuid, boolean),
  public.gt_staff_prize_board_v1(uuid), public.gt_staff_mark_prize_v1(uuid, uuid, text, boolean, int, text), public.gt_my_prizes_v1(),
  public.gt_set_my_payout_v1(text, text, text, text, text), public.gt_set_my_prize_proof_v1(uuid, text), public.gt_can_view_prize_file_v1(text) to authenticated;
revoke all on function gt_private.prize_winners_v1(uuid) from public, anon, authenticated;
