-- Read-only invariants, plus rollback-only reimport test.
begin;
do $$
declare n bigint;after_n bigint;
begin
 select count(*) into n from public.gt_history_matches;
 insert into public.gt_history_matches select * from public.gt_history_matches on conflict do nothing;
 select count(*) into after_n from public.gt_history_matches;
 if n<>after_n then raise exception 'Idempotency failed';end if;
 if exists(select 1 from public.gt_history_matches where player_a=player_b or winner not in(player_a,player_b)) then raise exception 'Invalid participants';end if;
 if exists(select 1 from public.gt_history_events where date_status='year_only' and event_date is not null) then raise exception 'Invented date';end if;
 if (select count(*) from public.gt_history_matches where kind='played' and winner=player_a)+(select count(*) from public.gt_history_matches where kind='played' and winner=player_b)<>(select count(*) from public.gt_history_matches where kind='played' and result='decisive') then raise exception 'Win/loss symmetry failed';end if;
 if has_table_privilege('anon','gt_private.history_source_snapshots_v1','select') or has_table_privilege('authenticated','gt_private.history_central_review_v1','select') then raise exception 'Raw data exposed';end if;
 if has_table_privilege('anon','public.gt_history_matches','insert') then raise exception 'Public match writes allowed';end if;
end $$;
set local role anon;
select public.gt_history_profile_v1('GO41250826',2026)->'stats' as verified_public_stats;
rollback;
