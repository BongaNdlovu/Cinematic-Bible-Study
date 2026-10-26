-- Write caps for the paths supabase-rate-limits.sql left open, October 2026. Run once in the Supabase SQL editor
-- (paste the whole file). Safe to re-run. One transaction: if any statement fails, nothing changes.

begin;

create table if not exists public.exhibit_write_slots (
  user_id uuid not null references auth.users (id) on delete cascade,
  bucket text not null,
  window_start timestamptz not null default now(),
  n integer not null default 0,
  primary key (user_id, bucket)
);

alter table public.exhibit_write_slots enable row level security;

revoke all on table public.exhibit_write_slots from public, anon, authenticated;

create or replace function public.exhibit_take_slot(p_bucket text, p_max integer, p_window interval)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_n integer;
begin
  if auth.uid() is null then
    return;
  end if;
  insert into public.exhibit_write_slots (user_id, bucket, window_start, n)
  values (auth.uid(), p_bucket, now(), 1)
  on conflict (user_id, bucket) do update
    set n = case
          when public.exhibit_write_slots.window_start < now() - p_window then 1
          else public.exhibit_write_slots.n + 1
        end,
        window_start = case
          when public.exhibit_write_slots.window_start < now() - p_window then now()
          else public.exhibit_write_slots.window_start
        end
  returning n into v_n;
  if v_n > p_max then
    raise exception 'rate_limit';
  end if;
end;
$$;

revoke all on function public.exhibit_take_slot(text, integer, interval) from public, anon, authenticated;

create or replace function public.exhibit_profiles_rate_gate()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.exhibit_take_slot('profile', 30, interval '1 hour');
  return new;
end;
$$;

revoke all on function public.exhibit_profiles_rate_gate() from public, anon, authenticated;

drop trigger if exists exhibit_profiles_rate_gate on public.exhibit_profiles;
create trigger exhibit_profiles_rate_gate
  before insert or update on public.exhibit_profiles
  for each row execute procedure public.exhibit_profiles_rate_gate();

create or replace function public.exhibit_reviews_edit_gate()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if not public.is_review_moderator() then
    perform public.exhibit_take_slot('review_edit', 20, interval '1 day');
  end if;
  return new;
end;
$$;

revoke all on function public.exhibit_reviews_edit_gate() from public, anon, authenticated;

drop trigger if exists exhibit_reviews_edit_gate on public.exhibit_reviews;
create trigger exhibit_reviews_edit_gate
  before update on public.exhibit_reviews
  for each row execute procedure public.exhibit_reviews_edit_gate();

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
    'correct_idx', v_key.correct_idx,
    'note', case when v_correct then v_key.correct_note else '' end
  );
end;
$$;

revoke execute on function public.verify_quiz_answer(int, int, int) from anon, public;
grant execute on function public.verify_quiz_answer(int, int, int) to authenticated;

notify pgrst, 'reload schema';

commit;
