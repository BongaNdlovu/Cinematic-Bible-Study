begin;

create or replace function public.exhibit_events_rate_gate()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.created_at := now();
  if new.user_id is not null then
    perform public.exhibit_take_slot('event_min', 60, interval '1 minute');
    perform public.exhibit_take_slot('event_day', 2000, interval '1 day');
    return new;
  end if;
  if coalesce(new.anon_id, '') <> '' then
    if (select count(*) from public.exhibit_events
        where anon_id = new.anon_id
          and created_at > now() - interval '1 minute') >= 60 then
      raise exception 'rate_limit';
    end if;
  elsif new.user_id is not null then
    if (select count(*) from public.exhibit_events
        where user_id = new.user_id
          and created_at > now() - interval '1 minute') >= 60 then
      raise exception 'rate_limit';
    end if;
  else
    raise exception 'rate_limit';
  end if;
  if new.user_id is null then
    if pg_column_size(new.detail) > 500 then
      raise exception 'rate_limit';
    end if;
    if (select count(*) from public.exhibit_events
        where user_id is null
          and created_at > now() - interval '1 minute') >= 600 then
      raise exception 'rate_limit';
    end if;
    if (select count(*) from public.exhibit_events
        where user_id is null
          and created_at > now() - interval '24 hours') >= 20000 then
      raise exception 'rate_limit';
    end if;
  end if;
  return new;
end;
$$;

create or replace function public.exhibit_surveys_rate_gate()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.created_at := now();
  if new.user_id is not null then
    perform public.exhibit_take_slot('survey', 5, interval '1 hour');
    return new;
  end if;
  if coalesce(new.anon_id, '') <> '' then
    if (select count(*) from public.exhibit_surveys
        where anon_id = new.anon_id
          and created_at > now() - interval '1 hour') >= 5 then
      raise exception 'rate_limit';
    end if;
  elsif new.user_id is not null then
    if (select count(*) from public.exhibit_surveys
        where user_id = new.user_id
          and created_at > now() - interval '1 hour') >= 5 then
      raise exception 'rate_limit';
    end if;
  else
    raise exception 'rate_limit';
  end if;
  if new.user_id is null then
    if (select count(*) from public.exhibit_surveys
        where user_id is null
          and created_at > now() - interval '1 minute') >= 20 then
      raise exception 'rate_limit';
    end if;
    if (select count(*) from public.exhibit_surveys
        where user_id is null
          and created_at > now() - interval '24 hours') >= 200 then
      raise exception 'rate_limit';
    end if;
  end if;
  return new;
end;
$$;

create or replace function public.verify_quiz_answer(p_sitting int, p_q_idx int, p_chosen int)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_key public.exhibit_quiz_keys;
  v_correct boolean;
begin
  if p_chosen is null or p_chosen < 0 or p_chosen > 9
     or p_sitting is null or p_q_idx is null then
    return jsonb_build_object('correct', false, 'correct_idx', null, 'note', '', 'error', 'bad_input');
  end if;
  perform public.exhibit_take_slot('quiz', 60, interval '1 minute');
  select * into v_key from public.exhibit_quiz_keys
    where sitting = p_sitting and q_idx = p_q_idx;
  if not found then
    return jsonb_build_object('correct', false, 'correct_idx', null, 'note', '', 'error', 'not_found');
  end if;
  v_correct := v_key.correct_idx = p_chosen;
  if v_correct and auth.uid() is not null then
    insert into public.exhibit_quiz_passes (user_id, sitting, q_idx)
    values (auth.uid(), p_sitting, p_q_idx)
    on conflict do nothing;
  end if;
  return jsonb_build_object(
    'correct', v_correct,
    'correct_idx', case when v_correct then v_key.correct_idx end,
    'note', case when v_correct then v_key.correct_note else '' end
  );
end;
$$;

commit;
