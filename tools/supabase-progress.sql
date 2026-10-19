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
  with check ((auth.uid() is null and user_id is null) or auth.uid() = user_id);

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

alter table public.exhibit_surveys
  add column if not exists anon_id text not null default '';

create index if not exists exhibit_surveys_anon_created_idx
  on public.exhibit_surveys (anon_id, created_at desc);
create index if not exists exhibit_surveys_user_created_idx
  on public.exhibit_surveys (user_id, created_at desc);

alter table public.exhibit_surveys
  drop constraint if exists exhibit_surveys_feedback_len,
  drop constraint if exists exhibit_surveys_responses_size,
  drop constraint if exists exhibit_surveys_anon_id_len,
  drop constraint if exists exhibit_surveys_role_len,
  drop constraint if exists exhibit_surveys_cohort_len;
alter table public.exhibit_surveys
  add constraint exhibit_surveys_feedback_len
    check (char_length(feedback) <= 600) not valid,
  add constraint exhibit_surveys_responses_size
    check (pg_column_size(responses) <= 2000) not valid,
  add constraint exhibit_surveys_anon_id_len
    check (char_length(anon_id) <= 64) not valid,
  add constraint exhibit_surveys_role_len
    check (char_length(role) <= 40) not valid,
  add constraint exhibit_surveys_cohort_len
    check (char_length(cohort) <= 200) not valid;

do $$
declare
  c text;
begin
  foreach c in array array[
    'exhibit_surveys_feedback_len',
    'exhibit_surveys_responses_size',
    'exhibit_surveys_anon_id_len',
    'exhibit_surveys_role_len',
    'exhibit_surveys_cohort_len'
  ] loop
    begin
      execute format('alter table public.exhibit_surveys validate constraint %I', c);
    exception when check_violation then
      null;
    end;
  end loop;
end;
$$;

create or replace function public.exhibit_surveys_rate_gate()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.created_at := now();
  if coalesce(new.anon_id, '') <> '' then
    if (select count(*) from public.exhibit_surveys
        where anon_id = new.anon_id
          and created_at > now() - interval '1 hour') >= 5 then
      raise exception 'rate_limit';
    end if;
  elsif new.user_id is not null then
    if (select count(*) from public.exhibit_surveys
        where user_id = new.user_id
          and created_at > now() - interval '1 hour') >= 5 then
      raise exception 'rate_limit';
    end if;
  else
    raise exception 'rate_limit';
  end if;
  if new.user_id is null then
    if (select count(*) from public.exhibit_surveys
        where user_id is null
          and created_at > now() - interval '1 minute') >= 20 then
      raise exception 'rate_limit';
    end if;
    if (select count(*) from public.exhibit_surveys
        where user_id is null
          and created_at > now() - interval '24 hours') >= 200 then
      raise exception 'rate_limit';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists exhibit_surveys_rate_gate on public.exhibit_surveys;
create trigger exhibit_surveys_rate_gate
  before insert on public.exhibit_surveys
  for each row execute procedure public.exhibit_surveys_rate_gate();

create or replace function public.exhibit_progress_rate_gate()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.updated_at := now();
  if tg_op = 'UPDATE' and old.updated_at is not null
     and old.updated_at > now() - interval '6 seconds' then
    raise exception 'rate_limit';
  end if;
  return new;
end;
$$;

drop trigger if exists exhibit_progress_rate_gate on public.exhibit_progress;
create trigger exhibit_progress_rate_gate
  before update on public.exhibit_progress
  for each row execute procedure public.exhibit_progress_rate_gate();

alter table public.exhibit_progress
  drop constraint if exists exhibit_progress_payload_size,
  drop constraint if exists exhibit_progress_certificate_name_len,
  drop constraint if exists exhibit_progress_cohort_len;
alter table public.exhibit_progress
  add constraint exhibit_progress_payload_size
    check (
      octet_length(journey::text) + octet_length(mastery::text)
      + octet_length(workbench::text) + octet_length(telemetry::text) <= 65536
    ) not valid,
  add constraint exhibit_progress_certificate_name_len
    check (char_length(certificate_name) <= 120) not valid,
  add constraint exhibit_progress_cohort_len
    check (char_length(cohort) <= 200) not valid;

alter table public.exhibit_study_data
  drop constraint if exists exhibit_study_data_notes_size,
  drop constraint if exists exhibit_study_data_bookmarks_size;
alter table public.exhibit_study_data
  add constraint exhibit_study_data_notes_size
    check (octet_length(notes::text) <= 1228800) not valid,
  add constraint exhibit_study_data_bookmarks_size
    check (octet_length(bookmarks::text) <= 65536) not valid;
