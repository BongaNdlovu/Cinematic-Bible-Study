-- Security hardening, October 2026. Run once in the Supabase SQL editor (paste the whole file).
-- Safe to re-run. It is one transaction, so if any statement fails nothing changes.
-- Surveys: an unsigned caller may only write user_id null; a signed-in caller only its own id.
-- Surveys and events: a row with neither anon_id nor user_id is refused, and unsigned rows
-- (user_id null) share one cap for the whole project per minute (events 600, surveys 20),
-- so rotating anon_id cannot flood either table.
-- Surveys: feedback at most 600 characters, responses at most 2000 bytes, anon_id 64,
-- role 40, cohort 200. Each check guards new rows at once; it is validated only if every
-- existing row already passes (see pg_constraint.convalidated).
-- Moderators: only the confirmed auth email counts, never user metadata or the JWT.
-- Reviews: run supabase-reviews-privacy.sql as well; this file closes the table to signed-out readers.
-- The same statements live in the setup files (supabase-progress.sql, supabase-insights.sql,
-- supabase-reviews.sql, supabase-rate-limits.sql, supabase-fix-anon-inserts.sql).

begin;

drop policy if exists insert_survey on public.exhibit_surveys;
drop policy if exists insert_own_survey on public.exhibit_surveys;
create policy insert_survey
  on public.exhibit_surveys for insert
  to public
  with check ((auth.uid() is null and user_id is null) or auth.uid() = user_id);

alter table public.exhibit_surveys
  add column if not exists anon_id text not null default '';

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

create index if not exists exhibit_events_user_created_idx
  on public.exhibit_events (user_id, created_at desc);
create index if not exists exhibit_surveys_user_created_idx
  on public.exhibit_surveys (user_id, created_at desc);

create or replace function public.exhibit_events_rate_gate()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.created_at := now();
  if coalesce(new.anon_id, '') <> '' then
    if (select count(*) from public.exhibit_events
        where anon_id = new.anon_id
          and created_at > now() - interval '1 minute') >= 60 then
      raise exception 'rate_limit';
    end if;
  elsif new.user_id is not null then
    if (select count(*) from public.exhibit_events
        where user_id = new.user_id
          and created_at > now() - interval '1 minute') >= 60 then
      raise exception 'rate_limit';
    end if;
  else
    raise exception 'rate_limit';
  end if;
  if new.user_id is null then
    if (select count(*) from public.exhibit_events
        where user_id is null
          and created_at > now() - interval '1 minute') >= 600 then
      raise exception 'rate_limit';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists exhibit_events_rate_gate on public.exhibit_events;
create trigger exhibit_events_rate_gate
  before insert on public.exhibit_events
  for each row execute procedure public.exhibit_events_rate_gate();

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
  end if;
  return new;
end;
$$;

drop trigger if exists exhibit_surveys_rate_gate on public.exhibit_surveys;
create trigger exhibit_surveys_rate_gate
  before insert on public.exhibit_surveys
  for each row execute procedure public.exhibit_surveys_rate_gate();

create or replace function public.is_review_moderator()
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select exists (
    select 1
    from auth.users u
    join public.exhibit_moderators m
      on m.email = lower(btrim(u.email))
    join auth.identities i
      on i.user_id = u.id
     and i.provider = 'google'
    where u.id = auth.uid()
      and u.email is not null
      and u.email_confirmed_at is not null
      and (
        not exists (
          select 1
          from auth.mfa_factors f
          where f.user_id = u.id
            and f.status = 'verified'
        )
        or coalesce(auth.jwt()->>'aal', '') = 'aal2'
      )
  );
$$;

grant execute on function public.is_review_moderator() to authenticated;

revoke select on public.exhibit_reviews from anon, public;
grant select on public.exhibit_reviews to authenticated;

commit;
