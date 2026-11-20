-- Removes everything gt_event_day_v1.sql added (schedules, medal/photo ticks, referee calls).
-- Touches nothing that existed before.
drop function if exists public.gt_referee_day_v1(text, text, uuid);
drop function if exists public.gt_referee_call_admin_v1(text, text, uuid, text, text);
drop function if exists public.gt_staff_event_day_v1(uuid);
drop function if exists public.gt_staff_resolve_call_v1(bigint);
drop function if exists public.gt_staff_set_ceremony_done_v1(uuid, text, boolean);
drop function if exists public.gt_staff_set_division_day_v1(uuid, text[], text);
drop function if exists gt_private.hhmm(text);
drop table if exists public.gt_referee_calls_v1;
drop table if exists public.gt_division_day_v1;
