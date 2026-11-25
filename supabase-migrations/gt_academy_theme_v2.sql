-- Institution theme v2 (25 พ.ย. 2569)
-- * Designed image presets (Nova banners/backgrounds) in addition to the colour styles.
-- * "full image" mode for uploaded banners that already contain their own text.
-- * GO MASTER-only hero banners (gm_*), because those images carry the GO MASTER name/logo.
-- v1 functions stay unchanged in behaviour so older pages keep working.

alter table public.gt_academies
  add column if not exists theme_section_full boolean not null default false,
  add column if not exists theme_hero_full boolean not null default false;

create or replace function public.gt_academy_theme_v1(p_academy uuid)
returns jsonb language plpgsql stable security definer
set search_path to 'public','gt_private','pg_temp' as $$
declare a public.gt_academies%rowtype;
begin
  if auth.uid() is null or coalesce(gt_private.academy_role(p_academy),'') not in ('active','admin') then
    return jsonb_build_object('ok',false,'error','NOT_ALLOWED');
  end if;
  select * into a from public.gt_academies where id=p_academy;
  if not found then return jsonb_build_object('ok',false,'error','NOT_FOUND'); end if;
  return jsonb_build_object('ok',true,'color',a.theme_color,'section',a.theme_section,'hero',a.theme_hero,
    'background',a.theme_background,'section_path',a.theme_section_path,'hero_path',a.theme_hero_path,
    'background_path',a.theme_background_path,'section_full',a.theme_section_full,'hero_full',a.theme_hero_full);
end $$;

create or replace function public.gt_academy_save_theme_v2(
  p_academy uuid, p_color text, p_section text, p_hero text, p_background text,
  p_section_path text default null, p_hero_path text default null, p_background_path text default null,
  p_section_full boolean default false, p_hero_full boolean default false)
returns jsonb language plpgsql security definer
set search_path to 'public','gt_private','pg_temp' as $$
declare v_name text;
begin
  if not public.gt_academy_can_customize_v1(p_academy) then
    return jsonb_build_object('ok',false,'error','NOT_ALLOWED');
  end if;
  select lower(btrim(name)) into v_name from public.gt_academies where id=p_academy;
  if p_color not in ('light_pink','light_green','light_gray','light_brown','light_blue','wood','go_board')
   or p_section not in ('classic','sakura','wood','green','blue','img_gold','img_sakura','img_navy')
   or p_hero not in ('classic','sakura','wood','green','blue','gm_sky','gm_green','gm_navy')
   or p_background not in ('classic','sakura','wood','green','blue','img_sky','img_bamboo','img_sakura')
   or (p_hero like 'gm\_%' and coalesce(v_name,'')<>'go master') then
    return jsonb_build_object('ok',false,'error','BAD_OPTION');
  end if;
  if exists (select 1 from unnest(array[p_section_path,p_hero_path,p_background_path]) v
      where v is not null and (v not like p_academy::text||'/%'
      or length(v)>300 or not exists(select 1 from storage.objects o where o.bucket_id='gt-institution-logos' and o.name=v))) then
    return jsonb_build_object('ok',false,'error','BAD_IMAGE');
  end if;
  update public.gt_academies set theme_color=p_color,theme_section=p_section,theme_hero=p_hero,
    theme_background=p_background,theme_section_path=p_section_path,theme_hero_path=p_hero_path,
    theme_background_path=p_background_path,
    theme_section_full=coalesce(p_section_full,false),theme_hero_full=coalesce(p_hero_full,false)
    where id=p_academy and status='active';
  return jsonb_build_object('ok',found);
end $$;
revoke all on function public.gt_academy_save_theme_v2(uuid,text,text,text,text,text,text,text,boolean,boolean) from public, anon;
grant execute on function public.gt_academy_save_theme_v2(uuid,text,text,text,text,text,text,text,boolean,boolean) to authenticated;

-- Current account's own username (so the settings form shows it instead of guessing).
create or replace function public.gt_my_staff_username_v1()
returns text language sql stable security definer set search_path to 'public','pg_temp' as $$
  select username from public.gt_staff_usernames where user_id=auth.uid()
$$;
revoke all on function public.gt_my_staff_username_v1() from public, anon;
grant execute on function public.gt_my_staff_username_v1() to authenticated;
