begin;

create or replace function public.exhibit_prune_test_rows()
returns table (events_deleted integer, surveys_deleted integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_events integer;
  v_surveys integer;
begin
  delete from public.exhibit_events
   where user_id is null
     and (
       (event = 'pen_probe' and (anon_id like 'pen-%' or coalesce(anon_id, '') = ''))
       or (event = 'live_insert_probe' and anon_id = 'live-insert-probe')
     );
  get diagnostics v_events = row_count;

  delete from public.exhibit_surveys
   where user_id is null
     and (
       (anon_id like 'pen-%' and responses ->> 'kind' = 'pen')
       or anon_id = 'live-insert-probe'
     );
  get diagnostics v_surveys = row_count;

  return query select v_events, v_surveys;
end;
$$;

revoke all on function public.exhibit_prune_test_rows() from public, anon, authenticated;

do $$
begin
  if exists (select 1 from cron.job where jobname = 'exhibit-prune-test-rows') then
    perform cron.unschedule('exhibit-prune-test-rows');
  end if;
end;
$$;

select cron.schedule('exhibit-prune-test-rows', '23 * * * *', 'select public.exhibit_prune_test_rows()');

commit;
