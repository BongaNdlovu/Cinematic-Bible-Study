-- Run once in the Supabase SQL editor (safe to re-run).
-- Unsigned events are kept 90 days, so the 90-day Insights view stays whole.

create extension if not exists pg_cron with schema extensions;

create or replace function public.exhibit_prune_anon()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.exhibit_events
   where user_id is null
     and created_at < now() - interval '90 days';
  delete from public.exhibit_events
   where id in (
     select id from public.exhibit_events
      where user_id is null
      order by created_at desc
      offset 200000
   );
  delete from public.exhibit_events
   where event = 'rate_limited'
     and created_at < now() - interval '7 days';
  delete from public.exhibit_surveys
   where user_id is null
     and created_at < now() - interval '180 days';
end;
$$;

revoke execute on function public.exhibit_prune_anon() from public, anon, authenticated;

do $$
begin
  if exists (select 1 from cron.job where jobname = 'exhibit-prune-anon') then
    perform cron.unschedule('exhibit-prune-anon');
  end if;
end;
$$;

select cron.schedule('exhibit-prune-anon', '17 3 * * *', 'select public.exhibit_prune_anon()');
