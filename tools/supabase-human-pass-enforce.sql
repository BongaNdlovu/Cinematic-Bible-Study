begin;

drop trigger if exists exhibit_events_human_pass on public.exhibit_events;
create trigger exhibit_events_human_pass
  before insert on public.exhibit_events
  for each row execute function public.exhibit_require_human_pass();

drop trigger if exists exhibit_surveys_human_pass on public.exhibit_surveys;
create trigger exhibit_surveys_human_pass
  before insert on public.exhibit_surveys
  for each row execute function public.exhibit_require_human_pass();

commit;
