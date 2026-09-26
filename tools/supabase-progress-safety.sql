-- Progress save safety. Run the UP section once in the Supabase SQL editor.
-- Run the DOWN section only to undo it. Do not run both in one pass.
-- save_exhibit_progress keeps the signature (bigint, jsonb). The save id is payload->>'save_id'.

-- ========== UP ==========

alter table public.exhibit_progress
  add column if not exists last_save_id text;

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
  save_id text := nullif(btrim(coalesce(payload->>'save_id', '')), '');
  next_name text;
  next_cohort text;
begin
  if uid is null then
    raise exception 'not_authenticated';
  end if;

  if octet_length(payload::text) > 65536 then
    raise exception 'payload_too_large';
  end if;

  select * into current_row
  from public.exhibit_progress
  where user_id = uid
  for update;

  if not found then
    begin
      insert into public.exhibit_progress (
        user_id, journey, mastery, workbench, telemetry,
        certificate_name, cohort, updated_at, revision, last_save_id
      ) values (
        uid,
        coalesce(payload->'journey', '{}'::jsonb),
        coalesce(payload->'mastery', '[]'::jsonb),
        coalesce(payload->'workbench', '{}'::jsonb),
        coalesce(payload->'telemetry', '{}'::jsonb),
        coalesce(payload->>'certificate_name', ''),
        coalesce(payload->>'cohort', ''),
        now(),
        1,
        save_id
      )
      returning * into current_row;
      return jsonb_build_object(
        'status', 'ok',
        'revision', current_row.revision,
        'row', to_jsonb(current_row)
      );
    exception
      when unique_violation then
        select * into current_row
        from public.exhibit_progress
        where user_id = uid;
        return jsonb_build_object(
          'status', 'conflict',
          'revision', current_row.revision,
          'row', to_jsonb(current_row)
        );
    end;
  end if;

  if save_id is not null and current_row.last_save_id is not distinct from save_id then
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
  next_name := case
    when btrim(coalesce(payload->>'certificate_name', '')) <> '' then payload->>'certificate_name'
    else current_row.certificate_name
  end;
  next_cohort := case
    when btrim(coalesce(payload->>'cohort', '')) <> '' then payload->>'cohort'
    else current_row.cohort
  end;

  update public.exhibit_progress set
    journey = coalesce(payload->'journey', '{}'::jsonb),
    mastery = coalesce(payload->'mastery', '[]'::jsonb),
    workbench = coalesce(payload->'workbench', '{}'::jsonb),
    telemetry = coalesce(payload->'telemetry', '{}'::jsonb),
    certificate_name = next_name,
    cohort = next_cohort,
    updated_at = now(),
    revision = next_revision,
    last_save_id = coalesce(save_id, last_save_id)
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
-- To undo, run only the statements below. Do not run them together with UP.
-- They restore the previous function body and drop last_save_id.
-- The 6-second progress trigger is unchanged by UP and is not part of this undo.
--
-- create or replace function public.save_exhibit_progress(
--   expected_revision bigint,
--   payload jsonb
-- )
-- returns jsonb
-- language plpgsql
-- security invoker
-- set search_path = public
-- as $$
-- declare
--   uid uuid := auth.uid();
--   current_row public.exhibit_progress;
--   next_revision bigint;
-- begin
--   if uid is null then
--     raise exception 'not_authenticated';
--   end if;
--   select * into current_row
--   from public.exhibit_progress
--   where user_id = uid
--   for update;
--   if not found then
--     insert into public.exhibit_progress (
--       user_id, journey, mastery, workbench, telemetry,
--       certificate_name, cohort, updated_at, revision
--     ) values (
--       uid,
--       coalesce(payload->'journey', '{}'::jsonb),
--       coalesce(payload->'mastery', '[]'::jsonb),
--       coalesce(payload->'workbench', '{}'::jsonb),
--       coalesce(payload->'telemetry', '{}'::jsonb),
--       coalesce(payload->>'certificate_name', ''),
--       coalesce(payload->>'cohort', ''),
--       now(),
--       1
--     )
--     returning * into current_row;
--     return jsonb_build_object(
--       'status', 'ok',
--       'revision', current_row.revision,
--       'row', to_jsonb(current_row)
--     );
--   end if;
--   if current_row.revision is distinct from expected_revision then
--     return jsonb_build_object(
--       'status', 'conflict',
--       'revision', current_row.revision,
--       'row', to_jsonb(current_row)
--     );
--   end if;
--   next_revision := current_row.revision + 1;
--   update public.exhibit_progress set
--     journey = coalesce(payload->'journey', '{}'::jsonb),
--     mastery = coalesce(payload->'mastery', '[]'::jsonb),
--     workbench = coalesce(payload->'workbench', '{}'::jsonb),
--     telemetry = coalesce(payload->'telemetry', '{}'::jsonb),
--     certificate_name = coalesce(payload->>'certificate_name', ''),
--     cohort = coalesce(payload->>'cohort', ''),
--     updated_at = now(),
--     revision = next_revision
--   where user_id = uid
--   returning * into current_row;
--   return jsonb_build_object(
--     'status', 'ok',
--     'revision', current_row.revision,
--     'row', to_jsonb(current_row)
--   );
-- end;
-- $$;
--
-- alter table public.exhibit_progress drop column if exists last_save_id;
