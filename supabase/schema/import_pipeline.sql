-- Review/staging layer for imports from Google Sheets.
-- Apply after go_tournament_source.sql.
create table if not exists public.import_batches (
  id uuid primary key default gen_random_uuid(),
  source_type text not null check (source_type in ('google_sheets', 'excel', 'go_pairing', 'manual')),
  source_file_id text,
  source_sheet text,
  status text not null default 'received' check (status in ('received', 'validated', 'staged', 'published', 'failed')),
  received_count integer not null default 0 check (received_count >= 0),
  valid_count integer not null default 0 check (valid_count >= 0),
  error_count integer not null default 0 check (error_count >= 0),
  created_at timestamptz not null default now(),
  published_at timestamptz
);

create table if not exists public.match_import_staging (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references public.import_batches(id) on delete cascade,
  source_key text not null unique,
  source_match_id text not null,
  competition_year integer not null check (competition_year between 2000 and 2200),
  event_code text,
  division_name text not null,
  validation_status text not null default 'pending' check (validation_status in ('pending', 'valid', 'error', 'published')),
  validation_errors jsonb not null default '[]'::jsonb,
  payload jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists match_import_staging_batch_idx on public.match_import_staging(batch_id);
create index if not exists match_import_staging_status_idx on public.match_import_staging(validation_status);

alter table public.import_batches enable row level security;
alter table public.match_import_staging enable row level security;

-- No browser policies by design. Imports use the server-only Supabase secret key.
