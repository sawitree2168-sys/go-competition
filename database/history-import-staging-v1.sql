create table gt_private.history_import_batches_v1(batch_key text primary key,source_url text not null,status text not null check(status in ('staging','verified','published')),created_at timestamptz not null default now());
create table gt_private.history_match_staging_v1(source_key text primary key,batch_key text not null references gt_private.history_import_batches_v1(batch_key),event_title text not null,event_date date,event_year integer,round_no integer not null check(round_no>0),dan_a integer not null, name_a text not null,dan_b integer not null,name_b text not null,winner_dan integer not null,source_rows integer[] not null,review_status text not null default 'date_pending',check(dan_a<>dan_b),check(winner_dan in(dan_a,dan_b)));
create index history_stage_player_a_v1 on gt_private.history_match_staging_v1(dan_a);
create index history_stage_player_b_v1 on gt_private.history_match_staging_v1(dan_b);
alter table gt_private.history_import_batches_v1 enable row level security;
alter table gt_private.history_match_staging_v1 enable row level security;
revoke all on gt_private.history_import_batches_v1,gt_private.history_match_staging_v1 from public,anon,authenticated;