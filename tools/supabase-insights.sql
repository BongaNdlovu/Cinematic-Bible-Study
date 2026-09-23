-- Study insight events and learner profiles. Run once in the Supabase SQL editor, after supabase-reviews.sql
-- (it uses public.is_review_moderator()).

create table if not exists public.exhibit_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete cascade,
  anon_id text not null default '' check (char_length(anon_id) <= 64),
  session_id text not null default '' check (char_length(session_id) <= 64),
  event text not null check (char_length(event) between 1 and 40),
  sitting smallint check (sitting between 0 and 10),
  sheet smallint check (sheet between 0 and 10),
  page text not null default '' check (char_length(page) <= 60),
  detail jsonb not null default '{}'::jsonb check (pg_column_size(detail) <= 2000),
  created_at timestamptz not null default now()
);

-- Safe migrations if the table was previously created
alter table public.exhibit_events
  alter column user_id drop not null;
alter table public.exhibit_events
  add column if not exists anon_id text not null default '' check (char_length(anon_id) <= 64);
alter table public.exhibit_events
  add column if not exists session_id text not null default '' check (char_length(session_id) <= 64);
alter table public.exhibit_events
  add column if not exists sitting smallint check (sitting between 0 and 10);
alter table public.exhibit_events
  add column if not exists sheet smallint check (sheet between 0 and 10);

create index if not exists exhibit_events_event_idx
  on public.exhibit_events (event, created_at desc);
create index if not exists exhibit_events_sitting_idx
  on public.exhibit_events (sitting, created_at desc);
create index if not exists exhibit_events_user_idx
  on public.exhibit_events (user_id, created_at desc);

alter table public.exhibit_events enable row level security;

drop policy if exists insert_events on public.exhibit_events;
drop policy if exists insert_own_events on public.exhibit_events;
create policy insert_events
  on public.exhibit_events for insert
  to anon, authenticated
  with check (
    user_id is null
    or (auth.uid() is not null and auth.uid() = user_id)
  );

drop policy if exists moderator_read_events on public.exhibit_events;
create policy moderator_read_events
  on public.exhibit_events for select
  to authenticated
  using (public.is_review_moderator());

grant insert on public.exhibit_events to anon, authenticated;
grant select on public.exhibit_events to authenticated;

create table if not exists public.exhibit_profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  study_mode text not null default '' check (char_length(study_mode) <= 40),
  background text not null default '' check (char_length(background) <= 80),
  found_via text not null default '' check (char_length(found_via) <= 80),
  referred_by text not null default '' check (char_length(referred_by) <= 40),
  referred_from_sitting smallint check (referred_from_sitting between 0 and 10),
  ref_code text not null default '' check (char_length(ref_code) <= 16),
  analytics_opt_out boolean not null default false,
  created_at timestamptz not null default now()
);

create unique index if not exists exhibit_profiles_ref_code_idx
  on public.exhibit_profiles (ref_code) where ref_code <> '';

alter table public.exhibit_profiles enable row level security;

drop policy if exists read_own_profile on public.exhibit_profiles;
create policy read_own_profile
  on public.exhibit_profiles for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists insert_own_profile on public.exhibit_profiles;
create policy insert_own_profile
  on public.exhibit_profiles for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists update_own_profile on public.exhibit_profiles;
create policy update_own_profile
  on public.exhibit_profiles for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists moderator_read_profiles on public.exhibit_profiles;
create policy moderator_read_profiles
  on public.exhibit_profiles for select
  to authenticated
  using (public.is_review_moderator());

grant select, insert, update on public.exhibit_profiles to authenticated;
