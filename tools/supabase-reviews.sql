-- Exhibit reviews (home-page Witnesses). Run once in the Supabase SQL editor.
-- Add your Google sign-in email to the moderator array if it is not already listed.

create table if not exists public.exhibit_reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 80),
  body text not null check (char_length(btrim(body)) between 40 and 600),
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
set search_path = public
as $$
  select lower(coalesce(auth.jwt() ->> 'email', '')) = any (array[
    'fanelesibonge50@gmail.com'
  ]);
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
  before insert on public.exhibit_reviews
  for each row execute procedure public.exhibit_reviews_force_pending();

grant select on public.exhibit_reviews to anon, authenticated;
grant insert, update on public.exhibit_reviews to authenticated;
