begin;

drop index if exists public.exhibit_events_user_idx;

create index if not exists exhibit_events_user_created_idx
  on public.exhibit_events (user_id, created_at desc);

commit;
