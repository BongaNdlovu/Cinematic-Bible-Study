-- Moderators must use the authenticator app, October 2026.
-- Run only AFTER the operator account has a verified authenticator (Account page, two-step sign-in).
-- Run it earlier and the operator tools lock out until one is added.
-- It removes the password-only fallback: every moderator call needs a Google identity and an aal2 session.
-- Re-running supabase-reviews.sql, supabase-auth-guard.sql or supabase-hardening-2026-10.sql
-- brings the fallback back, so run this file again after any of them.

begin;

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
      and coalesce(auth.jwt()->>'aal', '') = 'aal2'
      and exists (
        select 1
        from auth.mfa_factors f
        where f.user_id = u.id
          and f.status = 'verified'
      )
  );
$$;
grant execute on function public.is_review_moderator() to authenticated;

create or replace function public.exhibit_shows_authenticator()
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
  );
$$;
revoke all on function public.exhibit_shows_authenticator() from public, anon, authenticated;
grant execute on function public.exhibit_shows_authenticator() to authenticated;

notify pgrst, 'reload schema';

commit;
