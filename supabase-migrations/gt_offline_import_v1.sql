-- Offline pairing desk → database (23 Nov 2026).
-- The organiser uploads the backup file of the offline desk. p_apply = false checks only (everything is rolled back)
-- and returns what would change; p_apply = true writes it.
-- Merge rules, per division and pool:
--  * registrations: withdraw / reinstate / "here for round N" made offline are applied when the website still has
--    the value the desk started from; otherwise it is a conflict (website wins).
--  * results on tables that already existed on the website: written when the website still has the result the desk
--    started from; if both sides changed it differently → conflict (website wins).
--  * new rounds made offline: added in order, only if the website has not paired that round itself and its previous
--    round is complete; their results are recorded too. Otherwise conflict, and that pool stops there.
-- Every write goes through the same result function as the website (audit actor label "โต๊ะสำรอง").

create or replace function public.gt_staff_import_offline_v1(p_tournament uuid, p_payload jsonb, p_apply boolean default false)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_actor uuid := gt_require_tournament_staff_v1(p_tournament);
  d jsonb; r jsonb; m jsonb; b jsonb; v_div uuid; v_name text; v_pool text; v_rnd int; v_last int; v_id uuid; k int;
  cur gt_matches%rowtype; cur_status text; cur_present int;
  rep jsonb := '[]'::jsonb; n_rounds int := 0; n_results int := 0; n_regs int := 0; n_conf int := 0; stop boolean;
begin
  if jsonb_typeof(p_payload->'divisions') <> 'array' then return jsonb_build_object('ok', false, 'error', 'BAD_FILE'); end if;
  begin
    for d in select * from jsonb_array_elements(p_payload->'divisions') loop
      v_div := (d->>'id')::uuid;
      select name into v_name from gt_divisions where id = v_div and tournament_id = p_tournament;
      if v_name is null then
        n_conf := n_conf + 1; rep := rep || jsonb_build_object('division', d->>'name', 'text', 'ไม่พบรุ่นนี้ในงาน — ข้าม'); continue;
      end if;

      if (d->>'total_rounds') ~ '^[0-9]+$' and (d->>'total_rounds')::int between 1 and 15 then
        update gt_divisions set total_rounds = (d->>'total_rounds')::int where id = v_div and total_rounds is distinct from (d->>'total_rounds')::int;
      end if;

      -- registrations
      for r in select * from jsonb_array_elements(coalesce(d->'regs', '[]')) loop
        select registration_status, present_for_round into cur_status, cur_present from gt_registrations
          where division_id = v_div and athlete_id = (r->>'athlete_id')::uuid and registration_status in ('confirmed', 'withdrawn');
        if not found then continue; end if;
        if r->>'status' in ('confirmed', 'withdrawn') and r->>'status' is distinct from r->>'base_status' then
          if cur_status = r->>'status' then null;
          elsif cur_status = r->>'base_status' then
            update gt_registrations set registration_status = r->>'status' where division_id = v_div and athlete_id = (r->>'athlete_id')::uuid and registration_status = cur_status;
            insert into gt_match_audit_v1 (division_id, action, after, actor, actor_label)
            values (v_div, case when r->>'status' = 'withdrawn' then 'withdraw' else 'reinstate' end, jsonb_build_object('athlete', r->>'athlete_id'), v_actor, 'โต๊ะสำรอง');
            n_regs := n_regs + 1;
          else
            n_conf := n_conf + 1; rep := rep || jsonb_build_object('division', v_name, 'text', format('%s: สถานะบนเว็บถูกเปลี่ยนแล้ว — ใช้ของเว็บ', r->>'name'));
          end if;
        end if;
        if (r->>'present_for_round') ~ '^[0-9]+$' and (r->>'present_for_round') is distinct from (r->>'base_present') then
          if cur_present is not distinct from nullif(r->>'base_present', '')::int then
            update gt_registrations set present_for_round = (r->>'present_for_round')::int where division_id = v_div and athlete_id = (r->>'athlete_id')::uuid;
            n_regs := n_regs + 1;
          end if;
        end if;
      end loop;

      -- pools, one at a time
      for v_pool in
        select distinct nullif(x->>'pool_label', '') from (
          select jsonb_array_elements(coalesce(d->'matches', '[]')) x union all select jsonb_array_elements(coalesce(d->'byes', '[]'))) s
        order by 1 nulls first
      loop
        stop := false;
        -- 1. results on tables that already existed on the website
        for m in select x from jsonb_array_elements(coalesce(d->'matches', '[]')) x
                 where x->>'id' !~ '^off-' and nullif(x->>'pool_label', '') is not distinct from v_pool and x->>'state' = 'verified'
                   and (x->>'base_state' is distinct from 'verified' or x->>'result_code' is distinct from x->>'base_result_code'
                        or coalesce(x->>'result_margin', '') is distinct from coalesce(x->>'base_result_margin', ''))
                 order by (x->>'round_number')::int, (x->>'board_number')::int
        loop
          select * into cur from gt_matches where id = (m->>'id')::uuid and division_id = v_div;
          if not found or cur.state = 'void' then
            n_conf := n_conf + 1; rep := rep || jsonb_build_object('division', v_name, 'pool', v_pool, 'text', format('รอบ %s โต๊ะ %s: ไม่มีโต๊ะนี้บนเว็บแล้ว', m->>'round_number', m->>'board_number'));
            continue;
          end if;
          if cur.state = 'verified' and cur.result_code = m->>'result_code' and coalesce(cur.result_margin, '') = coalesce(m->>'result_margin', '') then continue; end if;
          if cur.state = 'verified' and (m->>'base_state' is distinct from 'verified' or cur.result_code is distinct from m->>'base_result_code'
                                         or coalesce(cur.result_margin, '') is distinct from coalesce(m->>'base_result_margin', '')) then
            n_conf := n_conf + 1; rep := rep || jsonb_build_object('division', v_name, 'pool', v_pool, 'text', format('รอบ %s โต๊ะ %s: ผลบนเว็บกับโต๊ะสำรองไม่ตรงกัน — ใช้ของเว็บ', m->>'round_number', m->>'board_number'));
            continue;
          end if;
          begin
            perform gt_private.record_result_core(cur.id, m->>'result_code', m->>'result_margin', v_actor, 'โต๊ะสำรอง');
            n_results := n_results + 1;
          exception when others then
            n_conf := n_conf + 1; rep := rep || jsonb_build_object('division', v_name, 'pool', v_pool, 'text', format('รอบ %s โต๊ะ %s: ลงผลไม่ได้ (%s)', m->>'round_number', m->>'board_number', sqlerrm));
          end;
        end loop;

        -- 2. rounds paired offline
        for v_rnd in
          select distinct (x->>'round_number')::int from (
            select jsonb_array_elements(coalesce(d->'matches', '[]')) x union all select jsonb_array_elements(coalesce(d->'byes', '[]'))) s
          where x->>'id' ~ '^off-' and nullif(x->>'pool_label', '') is not distinct from v_pool order by 1
        loop
          exit when stop;
          select greatest(coalesce((select max(round_number) from gt_matches where division_id = v_div and pool_label is not distinct from v_pool and state <> 'void'), 0),
                          coalesce((select max(round_number) from gt_byes where division_id = v_div and pool_label is not distinct from v_pool), 0)) into v_last;
          if v_rnd <> v_last + 1 then
            n_conf := n_conf + 1; stop := true;
            rep := rep || jsonb_build_object('division', v_name, 'pool', v_pool, 'text',
              case when v_rnd <= v_last then format('รอบ %s ถูกจับคู่บนเว็บไปแล้ว — ไม่นำคู่จากโต๊ะสำรองรอบ %s ขึ้นไป', v_rnd, v_rnd)
                   else format('ข้ามรอบ (เว็บมีถึงรอบ %s) — หยุดที่สายนี้', v_last) end);
            continue;
          end if;
          if exists (select 1 from gt_matches where division_id = v_div and pool_label is not distinct from v_pool and state not in ('verified', 'void')) then
            n_conf := n_conf + 1; stop := true;
            rep := rep || jsonb_build_object('division', v_name, 'pool', v_pool, 'text', format('รอบ %s บนเว็บยังลงผลไม่ครบ — นำรอบ %s ขึ้นไม่ได้', v_last, v_rnd));
            continue;
          end if;
          k := 0;
          begin
            for m in select x from jsonb_array_elements(coalesce(d->'matches', '[]')) x
                     where x->>'id' ~ '^off-' and (x->>'round_number')::int = v_rnd and nullif(x->>'pool_label', '') is not distinct from v_pool
                     order by (x->>'board_number')::int
            loop
              insert into gt_matches (tournament_id, division_id, pool_label, round_number, board_number, black_athlete_id, white_athlete_id, state)
              values (p_tournament, v_div, v_pool, v_rnd, (m->>'board_number')::int, (m->>'black_athlete_id')::uuid, (m->>'white_athlete_id')::uuid, 'pending')
              returning id into v_id;
              if m->>'state' = 'verified' then
                perform gt_private.record_result_core(v_id, m->>'result_code', m->>'result_margin', v_actor, 'โต๊ะสำรอง');
                k := k + 1;
              end if;
            end loop;
            for b in select x from jsonb_array_elements(coalesce(d->'byes', '[]')) x
                     where x->>'id' ~ '^off-' and (x->>'round_number')::int = v_rnd and nullif(x->>'pool_label', '') is not distinct from v_pool
            loop
              insert into gt_byes (tournament_id, division_id, pool_label, round_number, athlete_id)
              values (p_tournament, v_div, v_pool, v_rnd, (b->>'athlete_id')::uuid);
            end loop;
            insert into gt_match_audit_v1 (division_id, action, after, actor, actor_label)
            values (v_div, 'publish_round', jsonb_build_object('pool', v_pool, 'round', v_rnd, 'source', 'offline_desk'), v_actor, 'โต๊ะสำรอง');
            n_rounds := n_rounds + 1; n_results := n_results + k;
          exception when others then
            n_conf := n_conf + 1; stop := true;
            rep := rep || jsonb_build_object('division', v_name, 'pool', v_pool, 'text', format('รอบ %s นำขึ้นไม่ได้ (%s) — หยุดที่สายนี้', v_rnd,
              case when sqlerrm ~ 'no_repeat' then 'มีคู่ที่เคยเจอกันแล้ว' else sqlerrm end));
            continue;
          end;
          rep := rep || jsonb_build_object('division', v_name, 'pool', v_pool, 'ok', true, 'text', format('เพิ่มรอบ %s', v_rnd));
        end loop;
      end loop;
    end loop;
    if not coalesce(p_apply, false) then raise exception 'GT_DRY_RUN'; end if;
  exception when raise_exception then
    if sqlerrm <> 'GT_DRY_RUN' then raise; end if;
  end;
  return jsonb_build_object('ok', true, 'applied', coalesce(p_apply, false), 'rounds', n_rounds, 'results', n_results,
                            'registrations', n_regs, 'conflicts', n_conf, 'report', rep);
end $$;

revoke all on function public.gt_staff_import_offline_v1(uuid, jsonb, boolean) from public, anon;
grant execute on function public.gt_staff_import_offline_v1(uuid, jsonb, boolean) to authenticated;
