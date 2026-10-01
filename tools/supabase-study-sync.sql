-- Study Notes & Bookmarks Sync. Run once in the Supabase SQL editor.
-- Enables signed-in cloud sync of per-sheet study notes (baNote-*) and
-- bookmarks (baStudyBookmarks). Deploy before the client release that
-- includes js/shared/study-sync.js (the module degrades to local-only
-- until this table exists, showing a pull-miss notice once signed in).

create table if not exists public.exhibit_study_data (
  user_id uuid primary key references auth.users (id) on delete cascade,
  notes jsonb not null default '{}'::jsonb,
  bookmarks jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.exhibit_study_data enable row level security;

-- Learner can read and upsert their own study data row
drop policy if exists read_own_study_data on public.exhibit_study_data;
create policy read_own_study_data
  on public.exhibit_study_data for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists insert_own_study_data on public.exhibit_study_data;
create policy insert_own_study_data
  on public.exhibit_study_data for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists update_own_study_data on public.exhibit_study_data;
create policy update_own_study_data
  on public.exhibit_study_data for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Moderators / facilitators can inspect cohort study data
drop policy if exists moderator_read_study_data on public.exhibit_study_data;
create policy moderator_read_study_data
  on public.exhibit_study_data for select
  to authenticated
  using (
    exists (
      select 1 from pg_proc where proname = 'is_review_moderator'
    ) and public.is_review_moderator()
  );

grant select, insert, update on public.exhibit_study_data to authenticated;

create or replace function public.exhibit_study_data_rate_gate()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'UPDATE' and old.updated_at is not null
     and old.updated_at > now() - interval '6 seconds' then
    raise exception 'rate_limit';
  end if;
  return new;
end;
$$;

drop trigger if exists exhibit_study_data_rate_gate on public.exhibit_study_data;
create trigger exhibit_study_data_rate_gate
  before update on public.exhibit_study_data
  for each row execute procedure public.exhibit_study_data_rate_gate();
