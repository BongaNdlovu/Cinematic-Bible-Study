-- Fix unsigned inserts with the sb_publishable_ key.
-- 1. Data API requests are not always role "anon", so TO anon policies never match.
--    Use TO public + GRANT INSERT TO public. WITH CHECK is unchanged:
--    unsigned rows must have user_id null; signed-in rows must match auth.uid().
-- 2. Do not use Prefer: return=representation (or .insert().select()) for these
--    tables. That runs INSERT ... RETURNING and needs a SELECT policy. There is
--    no public SELECT on purpose (only the moderator can read). Use return=minimal
--    or a bare POST. The site .insert() calls already omit .select().

drop policy if exists insert_events on public.exhibit_events;
create policy insert_events
  on public.exhibit_events for insert
  to public
  with check (
    user_id is null
    or (auth.uid() is not null and auth.uid() = user_id)
  );

grant insert on public.exhibit_events to anon, authenticated, public;

drop policy if exists insert_survey on public.exhibit_surveys;
create policy insert_survey
  on public.exhibit_surveys for insert
  to public
  with check (auth.uid() = user_id or user_id is null or auth.uid() is null);

grant insert on public.exhibit_surveys to anon, authenticated, public;
