with divisions as(select distinct event_id,division from public.gt_history_matches),
walls as materialized(select d.*,public.gt_history_walllist_v1(event_id,division) w from divisions d),
rows as(select event_id,division,w->>'ranking_mode' mode,r,ordinality n from walls cross join lateral jsonb_array_elements(w->'rows') with ordinality j(r,ordinality)),
checks as(select event_id,division,mode,count(*) players,
count(*) filter(where (r->>'place')::int<>n) place_errors,
count(*) filter(where mode='calculated' and (r->>'points')::numeric<coalesce((select max((b.r->>'points')::numeric) from rows b where b.event_id=a.event_id and b.division=a.division and b.n>a.n),-1)) score_errors,
(select count(*) from rows b cross join lateral jsonb_array_elements(b.r->'rounds') t where b.event_id=a.event_id and b.division=a.division and t->>'token'~'^[0-9]+[+=-]$' and not exists(select 1 from rows o where o.event_id=b.event_id and o.division=b.division and o.r->>'place'=substring(t->>'token' from '^([0-9]+)') and o.r->>'full_name'=t->>'opponent')) token_errors
from rows a group by 1,2,3)
select count(*) divisions,count(distinct event_id) events,sum(place_errors) place_errors,sum(score_errors) calculated_score_errors,sum(token_errors) token_errors,count(*) filter(where mode='calculated') calculated_divisions,count(*) filter(where mode='source') source_divisions from checks;
