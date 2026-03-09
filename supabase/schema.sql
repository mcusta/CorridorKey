-- CorridorKey Web App — Supabase Schema
-- Run this in the Supabase SQL Editor

-- Enable UUID generation
create extension if not exists "uuid-ossp";

-- =============================================================================
-- JOBS TABLE
-- =============================================================================
create table public.jobs (
  id               uuid        primary key default uuid_generate_v4(),
  user_id          uuid        not null references auth.users(id) on delete cascade,
  name             text        not null,
  status           text        not null default 'draft'
    check (status in ('draft','queued','preparing','processing','uploading','completed','failed')),

  -- Processing config
  config           jsonb       not null default '{
    "input_is_linear": false,
    "despill_strength": 0.5,
    "auto_despeckle": true,
    "despeckle_size": 400,
    "refiner_scale": 1.0
  }'::jsonb,

  -- File references in Supabase Storage
  input_storage_path  text,
  alpha_storage_path  text,

  -- Progress tracking
  total_frames        int,
  processed_frames    int       not null default 0,

  -- Error info
  error_message       text,

  -- Worker tracking
  worker_id           text,
  claimed_at          timestamptz,
  last_heartbeat      timestamptz,

  -- Timestamps
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  started_at          timestamptz,
  completed_at        timestamptz
);

-- =============================================================================
-- JOB FILES TABLE (single source of truth for all file references)
-- =============================================================================
create table public.job_files (
  id              uuid        primary key default uuid_generate_v4(),
  job_id          uuid        not null references public.jobs(id) on delete cascade,
  file_type       text        not null
    check (file_type in ('input','alpha','matte','fg','processed','comp')),
  storage_path    text        not null,
  file_name       text        not null,
  frame_number    int,
  created_at      timestamptz not null default now()
);

-- =============================================================================
-- INDEXES
-- =============================================================================
create index idx_jobs_status_queued on public.jobs(status, created_at) where status = 'queued';
create index idx_jobs_user_id on public.jobs(user_id);
create index idx_jobs_stale_heartbeat on public.jobs(last_heartbeat) where status in ('preparing', 'processing');
create index idx_job_files_job_id on public.job_files(job_id);
create index idx_job_files_job_type on public.job_files(job_id, file_type);

-- =============================================================================
-- UPDATED_AT TRIGGER
-- =============================================================================
create or replace function public.update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger jobs_updated_at
  before update on public.jobs
  for each row execute function public.update_updated_at();

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

-- Jobs: users can only see/create their own jobs
alter table public.jobs enable row level security;

create policy "Users can view own jobs"
  on public.jobs for select
  using (auth.uid() = user_id);

create policy "Users can insert own jobs"
  on public.jobs for insert
  with check (auth.uid() = user_id);

create policy "Users can update own jobs"
  on public.jobs for update
  using (auth.uid() = user_id);

-- Job files: users can view files for their own jobs
alter table public.job_files enable row level security;

create policy "Users can view own job files"
  on public.job_files for select
  using (
    exists (
      select 1 from public.jobs
      where jobs.id = job_files.job_id
        and jobs.user_id = auth.uid()
    )
  );

-- =============================================================================
-- STORAGE BUCKET
-- =============================================================================
-- Create via Supabase Dashboard or API:
--   Bucket name: job-assets
--   Public: false (private)
--
-- Storage policies are managed via the Supabase Dashboard.
-- For this private single-user app:
--   - Authenticated users can upload to any path
--   - All downloads go through server-generated signed URLs
--   - Worker uses service_role key (bypasses storage policies)
