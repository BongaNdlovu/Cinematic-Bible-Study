-- Account deletion, October 2026. Run once in the Supabase SQL editor (paste the whole file),
-- after the setup files it depends on: supabase-progress.sql, supabase-insights.sql,
-- supabase-reviews.sql, supabase-certificates.sql, supabase-quiz-integrity.sql,
-- supabase-study-sync.sql, supabase-desk.sql and supabase-auth-guard.sql.
-- Safe to re-run. One transaction: if any statement fails, nothing changes.
-- exhibit_delete_my_account() removes the signed-in caller's own rows, then the auth user.
-- Cascading tables (certificates, progress, study data, profile, reviews, quiz passes,
-- notice receipts, help notes) are also deleted explicitly, so nothing depends on the cascade.
-- Survey answers are deleted, not orphaned. Event rows are anonymised (user_id and
-- session_id cleared) so the Insights totals stay whole; the 90-day prune removes them later.
-- Operator accounts that have published notices are refused: those notices are shared content.

begin;

create or replace function public.exhibit_help_before_delete()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if not public.is_review_moderator()
     and not (coalesce(current_setting('exhibit.account_delete', true), '') = '1'
              and auth.uid() is not null
              and old.user_id = auth.uid()) then
    raise exception 'not_allowed';
  end if;
  return old;
end;
$$;

create or replace function public.exhibit_delete_my_account()
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_uid uuid := auth.uid();
  v_email text;
begin
  if v_uid is null then
    raise exception 'not_signed_in';
  end if;

  if exists (select 1 from public.exhibit_notices where author_id = v_uid) then
    raise exception 'operator_account';
  end if;

  select lower(btrim(u.email)) into v_email
    from auth.users u
   where u.id = v_uid;

  perform set_config('exhibit.account_delete', '1', true);

  delete from public.exhibit_help_replies where author_id = v_uid;
  delete from public.exhibit_help_notes where user_id = v_uid;
  delete from public.exhibit_notice_receipts where user_id = v_uid;
  delete from public.exhibit_reviews where user_id = v_uid;
  delete from public.exhibit_surveys where user_id = v_uid;
  delete from public.exhibit_certificates where user_id = v_uid;
  delete from public.exhibit_quiz_passes where user_id = v_uid;
  delete from public.exhibit_study_data where user_id = v_uid;
  delete from public.exhibit_progress where user_id = v_uid;
  delete from public.exhibit_profiles where user_id = v_uid;
  delete from public.exhibit_password_failures where user_id = v_uid;

  update public.exhibit_events
     set user_id = null,
         anon_id = '',
         session_id = ''
   where user_id = v_uid;

  if v_email is not null then
    delete from public.exhibit_moderators where email = v_email;
  end if;

  delete from auth.users where id = v_uid;
end;
$$;

revoke all on function public.exhibit_delete_my_account() from public, anon;
grant execute on function public.exhibit_delete_my_account() to authenticated;

notify pgrst, 'reload schema';

commit;
