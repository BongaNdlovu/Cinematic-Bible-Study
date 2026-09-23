-- Server write caps. Test on a copy first. Do not run on production until verified.
-- Events: 60 rows/min per anon_id (or per user_id if anon_id is empty).
-- Surveys: 5/hour per anon_id (or per user_id if anon_id is empty).
-- Progress: one upsert per 6 seconds per row (10/min).
-- Reviews: 3 inserts/day per user_id.
-- Per-IP POST caps are enforced at the site edge, not here (browser posts go to Supabase).

alter table public.exhibit_surveys
  add column if not exists anon_id text not null default '';

create index if not exists exhibit_events_anon_created_idx
  on public.exhibit_events (anon_id, created_at desc);
create index if not exists exhibit_events_user_created_idx
  on public.exhibit_events (user_id, created_at desc);
create index if not exists exhibit_surveys_anon_created_idx
  on public.exhibit_surveys (anon_id, created_at desc);
create index if not exists exhibit_surveys_user_created_idx
  on public.exhibit_surveys (user_id, created_at desc);
create index if not exists exhibit_reviews_user_created_idx
  on public.exhibit_reviews (user_id, created_at desc);

create or replace function public.exhibit_events_rate_gate()
returns trigger
language plpgsql
as $$
begin
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
as $$
begin
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
as $$
begin
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

create or replace function public.exhibit_reviews_rate_gate()
returns trigger
language plpgsql
as $$
begin
  if (select count(*) from public.exhibit_reviews
      where user_id = new.user_id
        and created_at > now() - interval '1 day') >= 3 then
    raise exception 'rate_limit';
  end if;
  return new;
end;
$$;

drop trigger if exists exhibit_reviews_rate_gate on public.exhibit_reviews;
create trigger exhibit_reviews_rate_gate
  before insert on public.exhibit_reviews
  for each row execute procedure public.exhibit_reviews_rate_gate();
