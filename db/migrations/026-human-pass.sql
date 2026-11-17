begin;

create extension if not exists pgcrypto with schema extensions;

create table if not exists public.exhibit_human_passes (
  anon_id text primary key check (anon_id ~ '^[A-Za-z0-9_-]{8,64}$' and anon_id <> 'edge-rate-limit'),
  expires_at timestamptz not null
);
alter table public.exhibit_human_passes enable row level security;
revoke all on public.exhibit_human_passes from public, anon, authenticated;

create table if not exists public.exhibit_edge_keys (
  name text primary key,
  key_hash text not null
);
alter table public.exhibit_edge_keys enable row level security;
revoke all on public.exhibit_edge_keys from public, anon, authenticated;

create or replace function public.exhibit_grant_human_pass(p_anon_ids text[], p_key text)
returns timestamptz
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_hash text;
  v_until timestamptz := now() + interval '12 hours';
  v_id text;
begin
  select key_hash into v_hash from public.exhibit_edge_keys where name = 'human_pass';
  if v_hash is null or p_key is null or encode(extensions.digest(p_key, 'sha256'), 'hex') <> v_hash then
    raise exception 'not allowed' using errcode = '42501';
  end if;

  if p_anon_ids is null or cardinality(p_anon_ids) < 1 or cardinality(p_anon_ids) > 2 then
    raise exception 'invalid ids' using errcode = '22023';
  end if;

  foreach v_id in array p_anon_ids loop
    if v_id is null or v_id !~ '^[A-Za-z0-9_-]{8,64}$' or v_id = 'edge-rate-limit' then
      raise exception 'invalid ids' using errcode = '22023';
    end if;
    insert into public.exhibit_human_passes (anon_id, expires_at)
    values (v_id, v_until)
    on conflict (anon_id) do update set expires_at = excluded.expires_at;
  end loop;

  delete from public.exhibit_human_passes where expires_at < now() - interval '1 day';
  return v_until;
end;
$$;

revoke all on function public.exhibit_grant_human_pass(text[], text) from public, anon, authenticated;
grant execute on function public.exhibit_grant_human_pass(text[], text) to anon;

create or replace function public.exhibit_require_human_pass()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.user_id is not null then
    return new;
  end if;

  if tg_table_name = 'exhibit_events' then
    if new.event = 'rate_limited' and new.anon_id = 'edge-rate-limit' then
      return new;
    end if;
  end if;

  if exists (
    select 1
    from public.exhibit_human_passes p
    where p.anon_id = new.anon_id
      and p.expires_at > now()
  ) then
    return new;
  end if;

  raise exception 'human_check';
end;
$$;

revoke all on function public.exhibit_require_human_pass() from public, anon, authenticated;

notify pgrst, 'reload schema';

commit;
