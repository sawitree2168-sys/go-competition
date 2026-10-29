create table gt_private.history_identity_registry_v1(go_id text primary key,full_name text not null,legacy_id text,source_rank text,source_tab text not null,ownership_status text not null default 'unverified',updated_at timestamptz not null default now());
create index history_identity_name_v1 on gt_private.history_identity_registry_v1(full_name);
create table gt_private.history_event_summaries_v1(source_key text primary key,go_id text not null references gt_private.history_identity_registry_v1(go_id),event_title text not null,event_date_raw text,division text,placing_raw text,wins integer,losses integer,byes integer,source_label text,source_row integer not null,status text not null default 'source_summary_pending_rounds');
create index history_event_person_v1 on gt_private.history_event_summaries_v1(go_id);
alter table gt_private.history_identity_registry_v1 enable row level security;
alter table gt_private.history_event_summaries_v1 enable row level security;
revoke all on gt_private.history_identity_registry_v1,gt_private.history_event_summaries_v1 from public,anon,authenticated;
create view gt_private.history_played_sides_v1 with (security_invoker=true) as
select source_key,event_title,event_year,round_no,dan_a as dan_number,name_a as full_name,dan_b as opponent_dan,name_b as opponent_name,(winner_dan=dan_a) as won,review_status from gt_private.history_match_staging_v1
union all select source_key,event_title,event_year,round_no,dan_b,name_b,dan_a,name_a,(winner_dan=dan_b),review_status from gt_private.history_match_staging_v1;
create view gt_private.history_h2h_summary_v1 with(security_invoker=true) as select dan_number,opponent_dan,count(*) as games,count(*) filter(where won) as wins,count(*) filter(where not won) as losses,round(100.0*count(*) filter(where won)/nullif(count(*),0),2) as win_percent from gt_private.history_played_sides_v1 group by dan_number,opponent_dan;
revoke all on gt_private.history_played_sides_v1,gt_private.history_h2h_summary_v1 from public,anon,authenticated;