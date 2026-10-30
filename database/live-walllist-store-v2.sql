create table gt_private.history_walllist_results_v2 (
 source_key text primary key,
 go_id text not null,
 payload jsonb not null,
 updated_at timestamptz not null default now(),
 check(payload->>'source_key'=source_key),
 check(payload->>'go_id'=go_id),
 check(payload->>'source_tab'='Walllist'),
 check(payload->>'link_status'='matched_name_and_id')
);
create index history_walllist_go_v2 on gt_private.history_walllist_results_v2(go_id);
alter table gt_private.history_walllist_results_v2 enable row level security;
revoke all on gt_private.history_walllist_results_v2 from public,anon,authenticated;
