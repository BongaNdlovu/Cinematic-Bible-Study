-- Review privacy, October 2026. Run once in the Supabase SQL editor (paste the whole file),
-- then deploy the site straight after: the new page reads approved notes only through
-- exhibit_public_reviews() and exhibit_public_review_count().
-- Safe to re-run. One transaction: if any statement fails, nothing changes.

begin;

create or replace function public.exhibit_public_reviews(p_limit integer default 24)
returns table (
  id uuid,
  display_name text,
  body text,
  rating smallint,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select r.id, r.display_name, r.body, r.rating, r.created_at
  from public.exhibit_reviews r
  where r.approved = true and r.rejected = false
  order by r.created_at desc
  limit least(greatest(coalesce(p_limit, 24), 1), 60);
$$;

create or replace function public.exhibit_public_review_count()
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::integer
  from public.exhibit_reviews
  where approved = true and rejected = false;
$$;

revoke all on function public.exhibit_public_reviews(integer) from public, anon, authenticated;
revoke all on function public.exhibit_public_review_count() from public, anon, authenticated;
grant execute on function public.exhibit_public_reviews(integer) to anon, authenticated;
grant execute on function public.exhibit_public_review_count() to anon, authenticated;

drop policy if exists read_approved_reviews on public.exhibit_reviews;
revoke select on public.exhibit_reviews from anon, public;

notify pgrst, 'reload schema';

commit;
