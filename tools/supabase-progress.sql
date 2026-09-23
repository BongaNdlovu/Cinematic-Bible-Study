-- Exhibit Progress & Learner Sync. Run once in the Supabase SQL editor.
-- Enables signed-in sync of journey, mastery, workbench verification, and cohort telemetry.

create table if not exists public.exhibit_progress (
  user_id uuid primary key references auth.users (id) on delete cascade,
  journey jsonb not null default '{}'::jsonb,
  mastery jsonb not null default '[]'::jsonb,
  workbench jsonb not null default '{}'::jsonb,
  telemetry jsonb not null default '{}'::jsonb,
  certificate_name text default '',
  cohort text default '',
  updated_at timestamptz not null default now()
);

create index if not exists exhibit_progress_cohort_idx
  on public.exhibit_progress (cohort);

alter table public.exhibit_progress enable row level security;

-- Learner can read and upsert their own progress row
drop policy if exists read_own_progress on public.exhibit_progress;
create policy read_own_progress
  on public.exhibit_progress for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists insert_own_progress on public.exhibit_progress;
create policy insert_own_progress
  on public.exhibit_progress for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists update_own_progress on public.exhibit_progress;
create policy update_own_progress
  on public.exhibit_progress for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Moderators / facilitators can inspect cohort progress
drop policy if exists moderator_read_progress on public.exhibit_progress;
create policy moderator_read_progress
  on public.exhibit_progress for select
  to authenticated
  using (
    exists (
      select 1 from pg_proc where proname = 'is_review_moderator'
    ) and public.is_review_moderator()
  );

-- Optional post-course survey table
create table if not exists public.exhibit_surveys (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete set null,
  cohort text default '',
  role text default 'Student',
  rating integer,
  feedback text,
  responses jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.exhibit_surveys enable row level security;

drop policy if exists insert_survey on public.exhibit_surveys;
drop policy if exists insert_own_survey on public.exhibit_surveys;
create policy insert_survey
  on public.exhibit_surveys for insert
  to public
  with check (auth.uid() = user_id or user_id is null or auth.uid() is null);

drop policy if exists moderator_read_surveys on public.exhibit_surveys;
create policy moderator_read_surveys
  on public.exhibit_surveys for select
  to authenticated
  using (
    exists (
      select 1 from pg_proc where proname = 'is_review_moderator'
    ) and public.is_review_moderator()
  );

grant select, insert, update on public.exhibit_progress to authenticated;
grant select, insert on public.exhibit_surveys to authenticated, anon, public;
