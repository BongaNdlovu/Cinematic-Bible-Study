-- Exhibit reviews (home-page Witnesses). Run once in the Supabase SQL editor.
--
-- Moderators live in public.exhibit_moderators, not in this file, so no
-- operator address is committed. After running this file, add yourself ONCE in
-- the SQL editor (do not save this line into the repo):
--
--   insert into public.exhibit_moderators (email) values ('you@example.com')
--   on conflict do nothing;
--
-- Re-running this file on a project that already works is safe, but until the
-- table holds an address nobody is a moderator (it fails closed).

create table if not exists public.exhibit_moderators (
  email text primary key check (email = lower(btrim(email)))
);

-- Locked down: no policies and no grants, so the API cannot read or write it.
-- is_review_moderator() is SECURITY DEFINER and is the only reader.
alter table public.exhibit_moderators enable row level security;
revoke all on public.exhibit_moderators from public, anon, authenticated;

create table if not exists public.exhibit_reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 80),
  body text not null check (char_length(btrim(body)) between 40 and 600),
  rating smallint check (rating between 1 and 5),
  created_at timestamptz not null default now(),
  approved boolean not null default false,
  approved_at timestamptz,
  rejected boolean not null default false
);

create index if not exists exhibit_reviews_approved_idx
  on public.exhibit_reviews (approved, rejected, created_at desc);

alter table public.exhibit_reviews enable row level security;

create or replace function public.is_review_moderator()
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select exists (
    select 1
    from auth.users u
    join public.exhibit_moderators m
      on m.email = lower(btrim(u.email))
    join auth.identities i
      on i.user_id = u.id
     and i.provider = 'google'
    where u.id = auth.uid()
      and u.email is not null
      and u.email_confirmed_at is not null
      and (
        not exists (
          select 1
          from auth.mfa_factors f
          where f.user_id = u.id
            and f.status = 'verified'
        )
        or coalesce(auth.jwt()->>'aal', '') = 'aal2'
      )
  );
$$;

drop policy if exists read_approved_reviews on public.exhibit_reviews;
create policy read_approved_reviews
  on public.exhibit_reviews for select
  to anon, authenticated
  using (approved = true and rejected = false);

drop policy if exists read_own_reviews on public.exhibit_reviews;
create policy read_own_reviews
  on public.exhibit_reviews for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists moderator_read_reviews on public.exhibit_reviews;
create policy moderator_read_reviews
  on public.exhibit_reviews for select
  to authenticated
  using (public.is_review_moderator());

drop policy if exists insert_own_reviews on public.exhibit_reviews;
create policy insert_own_reviews
  on public.exhibit_reviews for insert
  to authenticated
  with check (
    auth.uid() = user_id
    and approved = false
    and rejected = false
  );

drop policy if exists update_own_reviews on public.exhibit_reviews;
create policy update_own_reviews
  on public.exhibit_reviews for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists moderator_update_reviews on public.exhibit_reviews;
create policy moderator_update_reviews
  on public.exhibit_reviews for update
  to authenticated
  using (public.is_review_moderator())
  with check (public.is_review_moderator());

create or replace function public.exhibit_reviews_force_pending()
returns trigger
language plpgsql
as $$
begin
  if not public.is_review_moderator() then
    new.approved := false;
    new.approved_at := null;
    new.rejected := false;
  end if;
  return new;
end;
$$;

drop trigger if exists exhibit_reviews_force_pending on public.exhibit_reviews;
create trigger exhibit_reviews_force_pending
  before insert or update on public.exhibit_reviews
  for each row execute procedure public.exhibit_reviews_force_pending();

-- Migration for existing projects (safe to re-run)
alter table public.exhibit_reviews
  add column if not exists rating smallint check (rating between 1 and 5);

revoke select on public.exhibit_reviews from anon, public;
grant select (id, display_name, body, rating, created_at, approved, rejected)
  on public.exhibit_reviews to anon;
grant select on public.exhibit_reviews to authenticated;
grant insert, update on public.exhibit_reviews to authenticated;
grant execute on function public.is_review_moderator() to authenticated;

create index if not exists exhibit_reviews_user_created_idx
  on public.exhibit_reviews (user_id, created_at desc);

create or replace function public.exhibit_reviews_rate_gate()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.created_at := now();
  if (select count(*) from public.exhibit_reviews
      where user_id = new.user_id
        and created_at > now() - interval '1 day') >= 3 then
    raise exception 'rate_limit';
  end if;
  return new;
end;
$$;

drop trigger if exists exhibit_reviews_rate_gate on public.exhibit_reviews;
create trigger exhibit_reviews_rate_gate
  before insert on public.exhibit_reviews
  for each row execute procedure public.exhibit_reviews_rate_gate();
