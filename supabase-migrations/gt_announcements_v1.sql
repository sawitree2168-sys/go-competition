-- ข่าว tab (design 16 Nov 2026): organiser announcements per event. Round summaries are computed in the page.

create table if not exists public.gt_announcements (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.gt_tournaments(id) on delete cascade,
  title text not null check (length(btrim(title)) between 1 and 120),
  body text check (body is null or length(body) <= 2000),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists gt_announcements_event_v1 on public.gt_announcements (tournament_id, created_at desc);
alter table public.gt_announcements enable row level security;
revoke all on public.gt_announcements from anon, authenticated;
grant select on public.gt_announcements to anon, authenticated;

-- Everyone may read announcements of published events; organisers also see their unpublished ones.
create or replace function public.gt_can_read_announcements_v1(p_tournament uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select published from gt_tournaments where id = p_tournament), false)
      or (auth.uid() is not null and gt_can_manage_tournament_v1(p_tournament));
$$;
grant execute on function public.gt_can_read_announcements_v1(uuid) to anon, authenticated;
create policy gt_announcements_read_v1 on public.gt_announcements for select to anon, authenticated
  using (public.gt_can_read_announcements_v1(tournament_id));

create or replace function public.gt_staff_post_announcement_v1(p_tournament uuid, p_title text, p_body text)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_actor uuid := gt_require_tournament_staff_v1(p_tournament); v_id uuid;
begin
  if coalesce(btrim(p_title), '') = '' then raise exception 'TITLE_REQUIRED'; end if;
  insert into gt_announcements (tournament_id, title, body, created_by)
  values (p_tournament, left(btrim(p_title), 120), nullif(left(btrim(coalesce(p_body, '')), 2000), ''), v_actor)
  returning id into v_id;
  insert into gt_match_audit_v1 (action, after, actor) values ('post_announcement', jsonb_build_object('tournament', p_tournament, 'id', v_id), v_actor);
  return v_id;
end $$;

create or replace function public.gt_staff_delete_announcement_v1(p_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_t uuid; v_actor uuid;
begin
  select tournament_id into v_t from gt_announcements where id = p_id;
  if v_t is null then raise exception 'ANNOUNCEMENT_NOT_FOUND'; end if;
  v_actor := gt_require_tournament_staff_v1(v_t);
  delete from gt_announcements where id = p_id;
  insert into gt_match_audit_v1 (action, after, actor) values ('delete_announcement', jsonb_build_object('tournament', v_t, 'id', p_id), v_actor);
end $$;

revoke all on function public.gt_staff_post_announcement_v1(uuid, text, text) from public, anon;
revoke all on function public.gt_staff_delete_announcement_v1(uuid) from public, anon;
grant execute on function public.gt_staff_post_announcement_v1(uuid, text, text) to authenticated;
grant execute on function public.gt_staff_delete_announcement_v1(uuid) to authenticated;
