-- Institution teachers and owners on the institution page (24 พ.ย. 2569, rule from ครูเล็ก)
-- - An institution can have several owners (เจ้าของ). An active owner can make a teacher an owner, change an owner
--   back to teacher, or remove someone — but the last owner can never be removed or demoted.
-- - Owners and teachers do not need to play Go. A teacher who does play may link their own playing profile (GO ID)
--   so the page shows their results; it is display-only (it gives no login or rights over that athlete).
-- - Teachers without any playing history still sign up as before (easy login → "ครูในสถาบัน", or /institution →
--   เลือกสถาบัน) and an owner approves them.

alter table public.gt_academy_staff add column if not exists go_id text;

-- Everyone on the team, with their playing results when they linked a GO ID.
create or replace function public.gt_academy_team_v1(p_academy uuid)
returns jsonb language plpgsql stable security definer set search_path = public, gt_private, pg_temp as $$
declare v_owner boolean;
begin
  if auth.uid() is null or coalesce(gt_private.academy_role(p_academy), '') not in ('active', 'admin') then
    return jsonb_build_object('ok', false, 'error', 'NOT_ALLOWED');
  end if;
  v_owner := public.gt_is_platform_admin_v1() or exists (select 1 from gt_academy_staff where academy_id = p_academy and user_id = auth.uid() and role = 'manager' and status = 'active');
  return jsonb_build_object('ok', true, 'can_manage', v_owner, 'me', auth.uid(), 'team', coalesce((
    select jsonb_agg(t order by (t->>'role') = 'teacher', t->>'name') from (
      select jsonb_build_object(
        'user_id', s.user_id, 'role', s.role, 'since', s.created_at,
        'name', coalesce(nullif(btrim(u.raw_user_meta_data->>'full_name'), ''), nullif(btrim(u.raw_user_meta_data->>'display_name'), ''), split_part(u.email, '@', 1)),
        'go_id', s.go_id,
        'athlete_id', a.id,
        'photo', nullif(btrim(a.avatar_url), ''),
        'rank', coalesce(a.current_rank, r.source_rank),
        'students', (select count(*) from gt_teacher_athletes l where l.academy_id = p_academy and l.teacher_user_id = s.user_id),
        'stats', case when s.go_id is null then null else (
          select jsonb_build_object(
            'events', count(distinct g.ev), 'games', count(*) filter (where g.played),
            'wins', count(*) filter (where g.played and g.res = 'win'), 'losses', count(*) filter (where g.played and g.res = 'loss'))
          from (
            select 'h:' || h.event_id ev, h.kind = 'played' and h.counts_for_stats played,
                   case when h.winner = hp.id then 'win' when h.winner is null then 'other' else 'loss' end res
            from gt_history_people hp join gt_history_matches h on hp.id in (h.player_a, h.player_b)
            where hp.go_id = s.go_id
            union all
            select m.tournament_id::text, m.state = 'verified',
                   case when m.result_code = 'draw' then 'draw' when m.winner_athlete_id = a.id then 'win' else 'loss' end
            from gt_matches m join gt_tournaments tt on tt.id = m.tournament_id and tt.published
            where a.id is not null and a.id in (m.black_athlete_id, m.white_athlete_id) and m.state <> 'void'
          ) g) end) t
      from gt_academy_staff s join auth.users u on u.id = s.user_id
      left join gt_athletes a on a.go_id = s.go_id
      left join gt_private.history_identity_registry_v1 r on r.go_id = s.go_id
      where s.academy_id = p_academy and s.status = 'active'
    ) x(t)), '[]'::jsonb));
end $$;

-- Owner tools: make owner / make teacher / remove. The last owner always stays.
create or replace function public.gt_academy_set_staff_role_v1(p_academy uuid, p_user uuid, p_role text)
returns jsonb language plpgsql security definer set search_path = public, gt_private, pg_temp as $$
declare v_cur text; v_owners int;
begin
  if auth.uid() is null or not (public.gt_is_platform_admin_v1() or exists (
       select 1 from gt_academy_staff where academy_id = p_academy and user_id = auth.uid() and role = 'manager' and status = 'active')) then
    return jsonb_build_object('ok', false, 'error', 'NOT_ALLOWED');
  end if;
  if p_role not in ('manager', 'teacher', 'remove') then return jsonb_build_object('ok', false, 'error', 'ROLE'); end if;
  perform pg_advisory_xact_lock(hashtextextended(p_academy::text, 91));
  select role into v_cur from gt_academy_staff where academy_id = p_academy and user_id = p_user and status = 'active';
  if v_cur is null then return jsonb_build_object('ok', false, 'error', 'NOT_FOUND'); end if;
  select count(*) into v_owners from gt_academy_staff where academy_id = p_academy and role = 'manager' and status = 'active';
  if v_cur = 'manager' and p_role <> 'manager' and v_owners <= 1 then return jsonb_build_object('ok', false, 'error', 'LAST_OWNER'); end if;
  if p_role = 'remove' then
    update gt_academy_staff set status = 'revoked', granted_by = auth.uid() where academy_id = p_academy and user_id = p_user;
  else
    update gt_academy_staff set role = p_role, granted_by = auth.uid() where academy_id = p_academy and user_id = p_user;
  end if;
  return jsonb_build_object('ok', true);
end $$;

-- A teacher links (or unlinks) their own playing profile. Display only.
create or replace function public.gt_set_my_staff_go_id_v1(p_academy uuid, p_go_id text)
returns jsonb language plpgsql security definer set search_path = public, gt_private, pg_temp as $$
declare v_go text := nullif(upper(btrim(coalesce(p_go_id, ''))), '');
begin
  if auth.uid() is null or not exists (select 1 from gt_academy_staff where academy_id = p_academy and user_id = auth.uid() and status = 'active') then
    return jsonb_build_object('ok', false, 'error', 'NOT_ALLOWED');
  end if;
  if v_go is not null and not exists (select 1 from gt_athletes where go_id = v_go)
     and not exists (select 1 from gt_history_people where go_id = v_go)
     and not exists (select 1 from gt_private.history_identity_registry_v1 where go_id = v_go) then
    return jsonb_build_object('ok', false, 'error', 'GO_ID_NOT_FOUND');
  end if;
  update gt_academy_staff set go_id = v_go where academy_id = p_academy and user_id = auth.uid();
  return jsonb_build_object('ok', true);
end $$;

-- Find a playing profile by name or GO ID (site athletes + the association registry).
create or replace function public.gt_staff_profile_search_v1(p_query text)
returns jsonb language plpgsql stable security definer set search_path = public, gt_private, pg_temp as $$
declare q text := replace(replace(left(btrim(coalesce(p_query, '')), 80), '%', ''), '_', '');
begin
  if auth.uid() is null or not exists (select 1 from gt_academy_staff where user_id = auth.uid() and status = 'active') then
    return '[]'::jsonb;
  end if;
  if length(q) < 2 then return '[]'::jsonb; end if;
  return coalesce((select jsonb_agg(x order by x->>'name') from (
    select distinct on (go_id) jsonb_build_object('go_id', go_id, 'name', name, 'rank', rank) x, go_id from (
      select a.go_id, a.full_name name, a.current_rank rank from gt_athletes a
      where a.go_id is not null and (a.full_name ilike '%' || q || '%' or a.go_id = upper(q))
      union all
      select r.go_id, r.full_name, r.source_rank from gt_private.history_identity_registry_v1 r
      where r.full_name ilike '%' || q || '%' or r.go_id = upper(q)
    ) z order by go_id limit 30) y), '[]'::jsonb);
end $$;

revoke all on function public.gt_academy_team_v1(uuid), public.gt_academy_set_staff_role_v1(uuid, uuid, text),
  public.gt_set_my_staff_go_id_v1(uuid, text), public.gt_staff_profile_search_v1(text) from public, anon;
grant execute on function public.gt_academy_team_v1(uuid), public.gt_academy_set_staff_role_v1(uuid, uuid, text),
  public.gt_set_my_staff_go_id_v1(uuid, text), public.gt_staff_profile_search_v1(text) to authenticated;
