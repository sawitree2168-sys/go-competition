-- Rename one existing institution without altering membership, results, or account keys.
-- The privileged implementation stays in the non-exposed schema.
create or replace function gt_private.academy_rename_v1(p_academy uuid,p_name text,p_expected_name text)
returns jsonb language plpgsql security definer set search_path=pg_catalog as $$
declare
 v_name text := regexp_replace(btrim(coalesce(p_name,'')), '[[:space:]]+', ' ', 'g');
 v_old text;
begin
 if auth.uid() is null or not (public.gt_academy_can_customize_v1(p_academy) or public.gt_is_platform_admin_v1()) then
  raise exception 'NOT_ALLOWED' using errcode='42501';
 end if;
 if char_length(v_name) not between 2 and 160 or gt_private.norm_inst(v_name)='' then
  raise exception 'BAD_NAME' using errcode='22023';
 end if;
 select name into v_old from public.gt_academies where id=p_academy for update;
 if not found then raise exception 'ACADEMY_NOT_FOUND'; end if;
 if p_expected_name is distinct from v_old then raise exception 'NAME_CHANGED'; end if;
 update public.gt_academies set name=v_name where id=p_academy;
 return jsonb_build_object('ok',true,'name',v_name);
exception when unique_violation then
 raise exception 'NAME_TAKEN' using errcode='23505';
end;
$$;
revoke all on function gt_private.academy_rename_v1(uuid,text,text) from public,anon;
grant execute on function gt_private.academy_rename_v1(uuid,text,text) to authenticated;

create or replace function public.gt_academy_rename_v1(p_academy uuid,p_name text,p_expected_name text)
returns jsonb language sql security invoker set search_path=pg_catalog as $$
 select gt_private.academy_rename_v1(p_academy,p_name,p_expected_name);
$$;
revoke all on function public.gt_academy_rename_v1(uuid,text,text) from public,anon;
grant execute on function public.gt_academy_rename_v1(uuid,text,text) to authenticated;
