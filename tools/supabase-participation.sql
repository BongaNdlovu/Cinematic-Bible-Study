begin;

create or replace function public.exhibit_participation(p_from timestamptz, p_to timestamptz)
returns table (registered integer, began integer)
language plpgsql
stable
security definer
set search_path = public, auth
as $$
begin
  if not public.is_review_moderator() then
    raise exception 'moderator access required' using errcode = '42501';
  end if;

  if p_from is null or p_to is null or p_to <= p_from then
    raise exception 'invalid period' using errcode = '22023';
  end if;

  return query
  select
    count(*)::integer,
    count(*) filter (where public.exhibit_sittings_passed(u.id) >= 1)::integer
  from auth.users u
  where u.created_at >= p_from
    and u.created_at < p_to
    and not exists (
      select 1
      from public.exhibit_moderators m
      where m.email = lower(btrim(coalesce(u.email, '')))
    );
end;
$$;

revoke all on function public.exhibit_participation(timestamptz, timestamptz) from public, anon, authenticated;
grant execute on function public.exhibit_participation(timestamptz, timestamptz) to authenticated;

notify pgrst, 'reload schema';

commit;
