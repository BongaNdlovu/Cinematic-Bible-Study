-- Certificates and graduates, October 2026. Run once in the Supabase SQL editor
-- after supabase-progress.sql, supabase-insights.sql and supabase-quiz-integrity.sql (paste the whole file).
-- Safe to re-run.

begin;

create table if not exists public.exhibit_certificates (
  id uuid primary key default gen_random_uuid(),
  serial text not null unique check (serial ~ '^SD-[0-9]{4}-[0-9A-F]{8}$'),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 80),
  issued_at timestamptz not null default now()
);

create index if not exists exhibit_certificates_user_idx
  on public.exhibit_certificates (user_id, issued_at desc);

alter table public.exhibit_certificates enable row level security;

create or replace function public.exhibit_sittings_finished(p_journey jsonb)
returns integer
language sql
immutable
set search_path = public
as $$
  select count(distinct s.n)::integer
  from (
    select case when v ~ '^[0-9]{1,2}$' then v::integer end as n
    from jsonb_array_elements_text(
      case when jsonb_typeof(p_journey -> 'completedSheets') = 'array'
        then p_journey -> 'completedSheets'
        else '[]'::jsonb
      end
    ) v
  ) s
  where s.n between 0 and 10;
$$;

create or replace function public.exhibit_sittings_passed(p_user uuid)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::integer
  from (
    select k.sitting
    from public.exhibit_quiz_keys k
    left join public.exhibit_quiz_passes q
      on q.user_id = p_user and q.sitting = k.sitting and q.q_idx = k.q_idx
    group by k.sitting
    having count(q.q_idx) = count(*)
  ) s;
$$;

create table if not exists public.exhibit_migrations (
  name text primary key,
  ran_at timestamptz not null default now()
);

alter table public.exhibit_migrations enable row level security;

revoke all on public.exhibit_migrations from public, anon, authenticated;

do $$
begin
  insert into public.exhibit_migrations (name) values ('quiz_passes_backfill')
  on conflict do nothing;
  if not found then
    return;
  end if;
  insert into public.exhibit_quiz_passes (user_id, sitting, q_idx)
  select p.user_id, k.sitting, k.q_idx
  from public.exhibit_progress p
  cross join lateral jsonb_array_elements_text(
    case when jsonb_typeof(p.journey -> 'completedSheets') = 'array'
      then p.journey -> 'completedSheets'
      else '[]'::jsonb
    end
  ) v
  join public.exhibit_quiz_keys k
    on k.sitting = case when v.value ~ '^[0-9]{1,2}$' then v.value::integer end
  on conflict do nothing;
  insert into public.exhibit_quiz_passes (user_id, sitting, q_idx)
  select c.user_id, k.sitting, k.q_idx
  from (select distinct user_id from public.exhibit_certificates) c
  cross join public.exhibit_quiz_keys k
  on conflict do nothing;
end;
$$;

create or replace function public.issue_exhibit_certificate(p_name text)
returns table (
  serial text,
  name text,
  issued_at timestamptz
)
language plpgsql
security definer
set search_path = public, auth
as $$
#variable_conflict use_column
declare
  v_name text := btrim(regexp_replace(coalesce(p_name, ''), '\s+', ' ', 'g'));
  v_finished integer;
  v_recent integer;
  v_row public.exhibit_certificates;
  v_tries integer := 0;
begin
  if auth.uid() is null then
    raise exception 'not_allowed';
  end if;
  if char_length(v_name) not between 1 and 80 then
    raise exception 'bad_name';
  end if;
  v_finished := public.exhibit_sittings_passed(auth.uid());
  if coalesce(v_finished, 0) < 11 then
    raise exception 'not_finished';
  end if;
  select c.* into v_row
  from public.exhibit_certificates c
  where c.user_id = auth.uid() and c.name = v_name
  order by c.issued_at desc
  limit 1;
  if found then
    return query select v_row.serial, v_row.name, v_row.issued_at;
    return;
  end if;
  select count(*) into v_recent
  from public.exhibit_certificates c
  where c.user_id = auth.uid()
    and c.issued_at > now() - interval '1 day';
  if v_recent >= 5 then
    raise exception 'rate_limit';
  end if;
  loop
    begin
      insert into public.exhibit_certificates (serial, user_id, name)
      values (
        'SD-' || to_char(now(), 'YYYY') || '-' || upper(substr(md5(gen_random_uuid()::text), 1, 8)),
        auth.uid(),
        v_name
      )
      returning * into v_row;
      exit;
    exception when unique_violation then
      v_tries := v_tries + 1;
      if v_tries >= 3 then
        raise;
      end if;
    end;
  end loop;
  return query select v_row.serial, v_row.name, v_row.issued_at;
end;
$$;

create or replace function public.exhibit_graduates()
returns table (
  user_id uuid,
  email text,
  certificate_name text,
  sittings integer,
  last_active timestamptz,
  serial text,
  issued_at timestamptz,
  certificates integer,
  first_download_at timestamptz
)
language sql
stable
security definer
set search_path = public, auth
as $$
  select p.user_id,
    case when u.email_confirmed_at is not null then u.email else null end,
    coalesce(nullif(btrim(c.name), ''), nullif(btrim(p.certificate_name), '')),
    public.exhibit_sittings_passed(p.user_id),
    p.updated_at,
    c.serial,
    c.issued_at,
    cc.n::integer,
    d.first_at
  from public.exhibit_progress p
  join auth.users u on u.id = p.user_id
  left join lateral (
    select c1.serial, c1.name, c1.issued_at
    from public.exhibit_certificates c1
    where c1.user_id = p.user_id
    order by c1.issued_at desc
    limit 1
  ) c on true
  cross join lateral (
    select count(*) as n
    from public.exhibit_certificates c2
    where c2.user_id = p.user_id
  ) cc
  cross join lateral (
    select min(e.created_at) as first_at
    from public.exhibit_events e
    where e.user_id = p.user_id
      and e.event = 'feature_use'
      and e.detail ->> 'feature' = 'cert_download'
  ) d
  where public.is_review_moderator()
    and (public.exhibit_sittings_passed(p.user_id) >= 11 or c.serial is not null)
  order by coalesce(c.issued_at, p.updated_at) desc
  limit 2000;
$$;

revoke all on public.exhibit_certificates from public, anon, authenticated;

revoke all on function public.exhibit_sittings_finished(jsonb) from public, anon, authenticated;
revoke all on function public.exhibit_sittings_passed(uuid) from public, anon, authenticated;
revoke all on function public.issue_exhibit_certificate(text) from public, anon, authenticated;
revoke all on function public.exhibit_graduates() from public, anon, authenticated;
grant execute on function public.issue_exhibit_certificate(text) to authenticated;
grant execute on function public.exhibit_graduates() to authenticated;

notify pgrst, 'reload schema';

commit;
