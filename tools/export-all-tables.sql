create or replace function pg_temp.export_all_tables() returns jsonb
language plpgsql
as $$
declare
  target record;
  table_rows jsonb;
  tables jsonb := '{}'::jsonb;
begin
  for target in
    select table_schema, table_name
    from information_schema.tables
    where table_type = 'BASE TABLE'
      and (
        table_schema = 'public'
        or (table_schema = 'auth' and table_name in ('users', 'identities'))
      )
    order by table_schema, table_name
  loop
    execute format(
      'select coalesce(jsonb_agg(to_jsonb(r)), ''[]''::jsonb) from %I.%I r',
      target.table_schema,
      target.table_name
    ) into table_rows;
    tables := tables || jsonb_build_object(target.table_schema || '.' || target.table_name, table_rows);
  end loop;

  return jsonb_build_object(
    'exported_at', now(),
    'table_count', (select count(*) from jsonb_object_keys(tables)),
    'tables', tables
  );
end;
$$;

select pg_temp.export_all_tables() as snapshot;
