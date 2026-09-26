-- Exhibit progress revision. Run the UP section once in the Supabase SQL editor.
-- Run the DOWN section only to undo it. Do not run both in one pass.

-- ========== UP ==========

alter table public.exhibit_progress
  add column if not exists revision bigint not null default 1;

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

grant execute on function public.save_exhibit_progress(bigint, jsonb) to authenticated;

-- ========== DOWN ==========
-- To undo, run only the two statements below. Do not run them together with UP.
-- drop function if exists public.save_exhibit_progress(bigint, jsonb);
-- alter table public.exhibit_progress drop column if exists revision;
