-- Observe the undo, then put it back. Run this whole script once.
-- It must end in rollback. Do not remove the rollback line.
-- Run this only after the UP section of supabase-progress-safety.sql.

begin;

create or replace function public.save_exhibit_progress(
  expected_revision bigint,
  payload jsonb
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  current_row public.exhibit_progress;
  next_revision bigint;
begin
  if uid is null then
    raise exception 'not_authenticated';
  end if;

  select * into current_row
  from public.exhibit_progress
  where user_id = uid
  for update;

  if not found then
    insert into public.exhibit_progress (
      user_id, journey, mastery, workbench, telemetry,
      certificate_name, cohort, updated_at, revision
    ) values (
      uid,
      coalesce(payload->'journey', '{}'::jsonb),
      coalesce(payload->'mastery', '[]'::jsonb),
      coalesce(payload->'workbench', '{}'::jsonb),
      coalesce(payload->'telemetry', '{}'::jsonb),
      coalesce(payload->>'certificate_name', ''),
      coalesce(payload->>'cohort', ''),
      now(),
      1
    )
    returning * into current_row;
    return jsonb_build_object(
      'status', 'ok',
      'revision', current_row.revision,
      'row', to_jsonb(current_row)
    );
  end if;

  if current_row.revision is distinct from expected_revision then
    return jsonb_build_object(
      'status', 'conflict',
      'revision', current_row.revision,
      'row', to_jsonb(current_row)
    );
  end if;

  next_revision := current_row.revision + 1;
  update public.exhibit_progress set
    journey = coalesce(payload->'journey', '{}'::jsonb),
    mastery = coalesce(payload->'mastery', '[]'::jsonb),
    workbench = coalesce(payload->'workbench', '{}'::jsonb),
    telemetry = coalesce(payload->'telemetry', '{}'::jsonb),
    certificate_name = coalesce(payload->>'certificate_name', ''),
    cohort = coalesce(payload->>'cohort', ''),
    updated_at = now(),
    revision = next_revision
  where user_id = uid
  returning * into current_row;

  return jsonb_build_object(
    'status', 'ok',
    'revision', current_row.revision,
    'row', to_jsonb(current_row)
  );
end;
$$;

alter table public.exhibit_progress drop column if exists last_save_id;

rollback;

select
  exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'exhibit_progress'
      and column_name = 'revision'
  ) as has_revision,
  exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'exhibit_progress'
      and column_name = 'last_save_id'
  ) as has_save_id,
  exists (
    select 1 from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'save_exhibit_progress'
      and pg_get_function_identity_arguments(p.oid) = 'expected_revision bigint, payload jsonb'
      and position('payload_too_large' in pg_get_functiondef(p.oid)) > 0
  ) as has_function;
