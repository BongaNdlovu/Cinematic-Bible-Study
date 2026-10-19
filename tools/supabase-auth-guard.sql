-- Operator privilege and the password-attempt hook.
-- Safe to re-run. The hook function does nothing until Auth Hooks enables it.
-- Enabling that hook is a Teams or Enterprise dashboard step.

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

create table if not exists public.exhibit_password_failures (
  user_id uuid primary key,
  failures integer not null default 0,
  window_start timestamptz not null default now()
);

alter table public.exhibit_password_failures enable row level security;

revoke all on table public.exhibit_password_failures from public, anon, authenticated;

create or replace function public.hook_password_verification_attempt(event jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid;
  valid boolean;
  row_failures integer;
  row_start timestamptz;
begin
  uid := nullif(event->>'user_id', '')::uuid;
  valid := (event->>'valid') = 'true';
  if uid is null then
    return jsonb_build_object('decision', 'continue');
  end if;

  if valid then
    delete from public.exhibit_password_failures where user_id = uid;
    return jsonb_build_object('decision', 'continue');
  end if;

  insert into public.exhibit_password_failures (user_id, failures, window_start)
  values (uid, 1, now())
  on conflict (user_id) do update
    set failures = case
          when public.exhibit_password_failures.window_start < now() - interval '15 minutes'
            then 1
          else public.exhibit_password_failures.failures + 1
        end,
        window_start = case
          when public.exhibit_password_failures.window_start < now() - interval '15 minutes'
            then now()
          else public.exhibit_password_failures.window_start
        end
  returning failures, window_start into row_failures, row_start;

  if row_failures >= 8
     and row_start >= now() - interval '15 minutes' then
    return jsonb_build_object(
      'decision', 'reject',
      'message', 'Please wait before trying again.',
      'should_logout_user', false
    );
  end if;

  return jsonb_build_object('decision', 'continue');
end;
$$;

revoke all on function public.hook_password_verification_attempt(jsonb) from public, anon, authenticated;

do $$
begin
  if exists (select 1 from pg_roles where rolname = 'supabase_auth_admin') then
    grant execute on function public.hook_password_verification_attempt(jsonb) to supabase_auth_admin;
  end if;
end;
$$;
