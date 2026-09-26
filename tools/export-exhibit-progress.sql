-- Copy of public.exhibit_progress. Run in the Supabase SQL editor.
-- Save the snapshot cell as backups/exhibit-progress-<UTC time>.json
-- That file is the recovery point. It is not committed.

select jsonb_build_object(
  'exported_at', now(),
  'table', 'public.exhibit_progress',
  'rows', coalesce((
    select jsonb_agg(to_jsonb(p) order by p.user_id)
    from public.exhibit_progress p
  ), '[]'::jsonb)
) as snapshot;
