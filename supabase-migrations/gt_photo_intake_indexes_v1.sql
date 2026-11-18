create index if not exists gt_photo_inbox_created_idx on public.gt_photo_inbox_v1(created_at);
create index if not exists gt_photo_inbox_token_idx on public.gt_photo_inbox_v1(token_hash,created_at);
create index if not exists gt_photo_log_submission_idx on gt_private.photo_review_log_v1(submission_id);
create index if not exists gt_crowd_games_black_idx on gt_private.crowd_games_v1(black_id,event_date);
create index if not exists gt_crowd_games_white_idx on gt_private.crowd_games_v1(white_id,event_date);
