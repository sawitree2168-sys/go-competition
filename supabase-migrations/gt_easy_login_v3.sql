-- Easy login v3 (20 Nov 2026): name suggestions on the sign-in box (public names only:
-- institutions, organiser teams, athletes already shown on the public athlete pages).
create or replace function public.gt_easy_suggest_v1(p_query text) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare q text := gt_private.easy_key(p_query);
begin
  if length(q) < 2 then return '[]'::jsonb; end if;
  return coalesce((select jsonb_agg(x) from (
    (select a.name as label, a.name as value, 'สถาบัน' as sub, null::text as photo, 1 as o from gt_academies a
      where a.status = 'active' and coalesce(a.workspace_type, 'academy') = 'academy' and gt_private.easy_key(a.name) like '%' || q || '%' order by a.name limit 4)
    union all
    (select o.name, o.name, 'ทีมผู้จัดงาน', null, 2 from gt_organizers o where o.status = 'active' and gt_private.easy_key(o.name) like '%' || q || '%' limit 2)
    union all
    (select r.full_name, r.go_id, concat_ws(' · ', 'นักกีฬา', r.go_id, nullif(r.source_rank, ''), nullif(g.school_name, '')), nullif(btrim(g.avatar_url), ''), 3
       from gt_private.history_identity_registry_v1 r left join gt_athletes g on g.go_id = r.go_id
      where r.go_id <> 'GO106260826' and gt_private.easy_key(r.full_name) like '%' || q || '%'
      order by (gt_private.easy_key(r.full_name) like q || '%') desc, r.full_name limit 8)
  ) x), '[]'::jsonb);
end $$;
revoke all on function public.gt_easy_suggest_v1(text) from public;
grant execute on function public.gt_easy_suggest_v1(text) to anon, authenticated;
