-- Run once in the Supabase SQL editor.
-- Adds NOT VALID checks, so existing rows are kept; new and updated rows are checked.

alter table public.exhibit_progress
  drop constraint if exists exhibit_progress_payload_size,
  drop constraint if exists exhibit_progress_certificate_name_len,
  drop constraint if exists exhibit_progress_cohort_len;
alter table public.exhibit_progress
  add constraint exhibit_progress_payload_size
    check (
      octet_length(journey::text) + octet_length(mastery::text)
      + octet_length(workbench::text) + octet_length(telemetry::text) <= 65536
    ) not valid,
  add constraint exhibit_progress_certificate_name_len
    check (char_length(certificate_name) <= 120) not valid,
  add constraint exhibit_progress_cohort_len
    check (char_length(cohort) <= 200) not valid;

alter table public.exhibit_study_data
  drop constraint if exists exhibit_study_data_notes_size,
  drop constraint if exists exhibit_study_data_bookmarks_size;
alter table public.exhibit_study_data
  add constraint exhibit_study_data_notes_size
    check (octet_length(notes::text) <= 1228800) not valid,
  add constraint exhibit_study_data_bookmarks_size
    check (octet_length(bookmarks::text) <= 65536) not valid;
