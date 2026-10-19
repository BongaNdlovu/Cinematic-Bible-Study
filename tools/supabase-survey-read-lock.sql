-- Survey read lock, October 2026. Run once in the Supabase SQL editor (paste the whole file).
-- Safe to re-run. Signed-out callers keep insert on exhibit_surveys and lose select;
-- moderators still read through the authenticated role and the existing row-level policy.

begin;

revoke select on public.exhibit_surveys from anon, public;
grant select, insert on public.exhibit_surveys to authenticated;
grant insert on public.exhibit_surveys to anon;

commit;
