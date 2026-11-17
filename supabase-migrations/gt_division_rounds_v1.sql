-- Rounds per division (17 Nov 2026, ครูเล็ก: "ระบบการจับคู่ ... ป้องกันความผิดพลาดในการแข่งขันจริง").
-- Every division used to play 5 rounds. 47 players need 6 for a single undefeated winner; 4 players can
-- only play 3 without rematches. null = the old default of 5, so existing events show exactly as before.
alter table public.gt_divisions add column if not exists total_rounds smallint
  check (total_rounds is null or total_rounds between 1 and 15);

-- Organiser sets the number. Not below a round that has already been paired.
create or replace function public.gt_staff_set_division_rounds_v1(p_division uuid, p_rounds int) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_t uuid; v_last int;
begin
  select tournament_id into v_t from gt_divisions where id = p_division;
  if v_t is null then return jsonb_build_object('ok', false, 'error', 'NOT_FOUND'); end if;
  perform gt_require_tournament_staff_v1(v_t);
  if p_rounds is null or p_rounds < 1 or p_rounds > 15 then return jsonb_build_object('ok', false, 'error', 'RANGE'); end if;
  select greatest(coalesce((select max(round_number) from gt_matches where division_id = p_division and state <> 'void'), 0),
                  coalesce((select max(round_number) from gt_byes where division_id = p_division), 0)) into v_last;
  if p_rounds < v_last then return jsonb_build_object('ok', false, 'error', 'BELOW_PLAYED', 'played', v_last); end if;
  update gt_divisions set total_rounds = p_rounds where id = p_division;
  return jsonb_build_object('ok', true, 'rounds', p_rounds);
end $$;
revoke all on function public.gt_staff_set_division_rounds_v1(uuid, int) from public, anon;
grant execute on function public.gt_staff_set_division_rounds_v1(uuid, int) to authenticated;
