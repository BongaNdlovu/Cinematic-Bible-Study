-- Operator desk, October 2026. Run once in the Supabase SQL editor (paste the whole file).
-- Safe to re-run. One transaction: if any statement fails, nothing changes.
-- Notices: the operator publishes a note every reader can see. A reader marks
-- their own copy read, unread, or removed. Removing a copy does not remove it
-- for anyone else. Only a confirmed moderator can publish or remove a notice
-- for everyone. author_id is not granted to the API.
-- Help notes: a signed-in reader can leave a note for the operator. Readers
-- cannot read the table. The operator reads notes, and the sender's confirmed
-- address, only through exhibit_help_inbox(). There is no mail provider in
-- the browser, so the note is not relayed by a client-side key.

begin;

create table if not exists public.exhibit_notices (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(btrim(title)) between 1 and 120),
  body text not null check (char_length(btrim(body)) between 1 and 2000),
  created_at timestamptz not null default now(),
  author_id uuid not null references auth.users (id) on delete cascade
);

create table if not exists public.exhibit_notice_receipts (
  notice_id uuid not null references public.exhibit_notices (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  read_at timestamptz,
  hidden_at timestamptz,
  primary key (notice_id, user_id)
);

create table if not exists public.exhibit_help_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  subject text not null check (char_length(btrim(subject)) between 1 and 120),
  body text not null check (char_length(btrim(body)) between 1 and 2000),
  created_at timestamptz not null default now()
);

create index if not exists exhibit_notices_created_idx
  on public.exhibit_notices (created_at desc);
create index if not exists exhibit_notice_receipts_user_idx
  on public.exhibit_notice_receipts (user_id);
create index if not exists exhibit_help_user_created_idx
  on public.exhibit_help_notes (user_id, created_at desc);

alter table public.exhibit_notices enable row level security;
alter table public.exhibit_notice_receipts enable row level security;
alter table public.exhibit_help_notes enable row level security;

create or replace function public.exhibit_notices_before_insert()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if auth.uid() is null or not public.is_review_moderator() then
    raise exception 'not_allowed';
  end if;
  new.author_id := auth.uid();
  new.created_at := now();
  new.title := btrim(new.title);
  new.body := btrim(new.body);
  if (select count(*) from public.exhibit_notices
      where author_id = new.author_id
        and created_at > now() - interval '1 day') >= 20 then
    raise exception 'rate_limit';
  end if;
  return new;
end;
$$;

create or replace function public.exhibit_notices_before_delete()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if not public.is_review_moderator() then
    raise exception 'not_allowed';
  end if;
  return old;
end;
$$;

create or replace function public.exhibit_help_before_insert()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if auth.uid() is null then
    raise exception 'not_allowed';
  end if;
  new.user_id := auth.uid();
  new.created_at := now();
  new.subject := btrim(new.subject);
  new.body := btrim(new.body);
  if (select count(*) from public.exhibit_help_notes
      where user_id = new.user_id
        and created_at > now() - interval '1 day') >= 3 then
    raise exception 'rate_limit';
  end if;
  return new;
end;
$$;

create or replace function public.exhibit_help_before_delete()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if not public.is_review_moderator() then
    raise exception 'not_allowed';
  end if;
  return old;
end;
$$;

drop trigger if exists exhibit_notices_before_insert on public.exhibit_notices;
create trigger exhibit_notices_before_insert
  before insert on public.exhibit_notices
  for each row execute procedure public.exhibit_notices_before_insert();

drop trigger if exists exhibit_notices_before_delete on public.exhibit_notices;
create trigger exhibit_notices_before_delete
  before delete on public.exhibit_notices
  for each row execute procedure public.exhibit_notices_before_delete();

drop trigger if exists exhibit_help_before_insert on public.exhibit_help_notes;
create trigger exhibit_help_before_insert
  before insert on public.exhibit_help_notes
  for each row execute procedure public.exhibit_help_before_insert();

drop trigger if exists exhibit_help_before_delete on public.exhibit_help_notes;
create trigger exhibit_help_before_delete
  before delete on public.exhibit_help_notes
  for each row execute procedure public.exhibit_help_before_delete();

create or replace function public.exhibit_notice_receipt_set(
  p_notice uuid,
  p_read boolean,
  p_hidden boolean
)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if auth.uid() is null or p_notice is null or p_read is null or p_hidden is null then
    raise exception 'not_allowed';
  end if;
  if not exists (select 1 from public.exhibit_notices where id = p_notice) then
    raise exception 'not_allowed';
  end if;
  insert into public.exhibit_notice_receipts (notice_id, user_id, read_at, hidden_at)
  values (
    p_notice,
    auth.uid(),
    case when p_read then now() else null end,
    case when p_hidden then now() else null end
  )
  on conflict (notice_id, user_id) do update
  set read_at = case
        when p_read then coalesce(public.exhibit_notice_receipts.read_at, now())
        else null
      end,
      hidden_at = case
        when p_hidden then coalesce(public.exhibit_notice_receipts.hidden_at, now())
        else null
      end;
end;
$$;

create or replace function public.exhibit_help_inbox()
returns table (
  id uuid,
  subject text,
  body text,
  created_at timestamptz,
  sender_email text
)
language sql
stable
security definer
set search_path = public, auth
as $$
  select n.id, n.subject, n.body, n.created_at,
    case when u.email_confirmed_at is not null then u.email else null end
  from public.exhibit_help_notes n
  join auth.users u on u.id = n.user_id
  where public.is_review_moderator()
  order by n.created_at desc
  limit 40;
$$;

drop policy if exists read_notices on public.exhibit_notices;
create policy read_notices
  on public.exhibit_notices for select
  to anon, authenticated
  using (true);

drop policy if exists insert_notices on public.exhibit_notices;
create policy insert_notices
  on public.exhibit_notices for insert
  to authenticated
  with check (public.is_review_moderator() and author_id = auth.uid());

drop policy if exists delete_notices on public.exhibit_notices;
create policy delete_notices
  on public.exhibit_notices for delete
  to authenticated
  using (public.is_review_moderator());

drop policy if exists read_own_receipts on public.exhibit_notice_receipts;
create policy read_own_receipts
  on public.exhibit_notice_receipts for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists insert_help on public.exhibit_help_notes;
create policy insert_help
  on public.exhibit_help_notes for insert
  to authenticated
  with check (user_id = auth.uid());

drop policy if exists delete_help on public.exhibit_help_notes;
create policy delete_help
  on public.exhibit_help_notes for delete
  to authenticated
  using (public.is_review_moderator());

revoke all on public.exhibit_notices from public, anon, authenticated;
grant select (id, title, body, created_at) on public.exhibit_notices to anon, authenticated;
grant insert (title, body) on public.exhibit_notices to authenticated;
grant delete on public.exhibit_notices to authenticated;

revoke all on public.exhibit_notice_receipts from public, anon, authenticated;
grant select (notice_id, read_at, hidden_at) on public.exhibit_notice_receipts to authenticated;

revoke all on public.exhibit_help_notes from public, anon, authenticated;
grant insert (subject, body) on public.exhibit_help_notes to authenticated;
grant delete on public.exhibit_help_notes to authenticated;

revoke all on function public.exhibit_notices_before_insert() from public, anon, authenticated;
revoke all on function public.exhibit_notices_before_delete() from public, anon, authenticated;
revoke all on function public.exhibit_help_before_insert() from public, anon, authenticated;
revoke all on function public.exhibit_help_before_delete() from public, anon, authenticated;
revoke all on function public.exhibit_notice_receipt_set(uuid, boolean, boolean) from public, anon, authenticated;
revoke all on function public.exhibit_help_inbox() from public, anon, authenticated;
-- The signed-in role must be allowed to fire the triggers. These functions
-- return trigger, so they cannot be called as ordinary API procedures.
grant execute on function public.exhibit_notices_before_insert() to authenticated;
grant execute on function public.exhibit_notices_before_delete() to authenticated;
grant execute on function public.exhibit_help_before_insert() to authenticated;
grant execute on function public.exhibit_help_before_delete() to authenticated;
grant execute on function public.exhibit_notice_receipt_set(uuid, boolean, boolean) to authenticated;
grant execute on function public.exhibit_help_inbox() to authenticated;

notify pgrst, 'reload schema';

commit;
