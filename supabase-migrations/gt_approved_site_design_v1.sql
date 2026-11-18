-- Approved multi-page release: scoped event editor. No deletion or identity reassignment.
create or replace function public.gt_staff_save_event_design_v1(p_tournament uuid,p_event jsonb,p_divisions jsonb)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare x jsonb; d public.gt_divisions; n int; latest int; v_id uuid;
begin
 if not public.gt_can_manage_tournament_v1(p_tournament) then raise exception 'NOT_ALLOWED' using errcode='42501'; end if;
 perform 1 from public.gt_tournaments where id=p_tournament for update;
 if length(btrim(p_event->>'title')) not between 3 and 200 then raise exception 'BAD_TITLE'; end if;
 if coalesce(p_event->>'poster_url','')<>'' and p_event->>'poster_url' !~ '^https://' then raise exception 'BAD_POSTER_URL'; end if;
 if jsonb_typeof(p_divisions)<>'array' or jsonb_array_length(p_divisions)>100 then raise exception 'BAD_DIVISIONS'; end if;
 update public.gt_tournaments set title=btrim(p_event->>'title'),event_date=nullif(p_event->>'event_date','')::date,venue=nullif(left(p_event->>'venue',160),''),poster_url=nullif(p_event->>'poster_url','') where id=p_tournament;
 for x in select value from jsonb_array_elements(p_divisions) loop
  if length(btrim(x->>'name')) not between 1 and 120 or (x->>'seats_limit')::int not between 1 and 2000 or (x->>'total_rounds')::int not between 1 and 20 or (x->>'entry_fee_thb')::numeric not between 0 and 100000 then raise exception 'BAD_DIVISION'; end if;
  v_id=nullif(x->>'id','')::uuid;
  if v_id is not null then
   select * into d from public.gt_divisions where id=v_id and tournament_id=p_tournament for update;
   if not found then raise exception 'NOT_THIS_EVENT'; end if;
   select count(*) into n from public.gt_web_applications where division_id=v_id and status in ('pending','approved');
   n=greatest(n,(select count(*) from public.gt_registrations where division_id=v_id and registration_status='confirmed'));
   if (x->>'seats_limit')::int<n then raise exception 'CAPACITY_BELOW_ENTRIES'; end if;
   select coalesce(max(round_number),0) into latest from public.gt_matches where division_id=v_id and state<>'void';
   if (x->>'total_rounds')::int<latest then raise exception 'ROUNDS_ALREADY_PUBLISHED'; end if;
   update public.gt_divisions set name=btrim(x->>'name'),seats_limit=(x->>'seats_limit')::int,total_rounds=(x->>'total_rounds')::int,entry_fee_thb=(x->>'entry_fee_thb')::numeric where id=v_id;
  else
   insert into public.gt_divisions(tournament_id,name,seats_limit,total_rounds,entry_fee_thb) values(p_tournament,btrim(x->>'name'),(x->>'seats_limit')::int,(x->>'total_rounds')::int,(x->>'entry_fee_thb')::numeric);
  end if;
 end loop;
 return jsonb_build_object('ok',true);
end $$;
revoke all on function public.gt_staff_save_event_design_v1(uuid,jsonb,jsonb) from public,anon;
grant execute on function public.gt_staff_save_event_design_v1(uuid,jsonb,jsonb) to authenticated;
