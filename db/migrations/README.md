# Database migrations

Each file here is a SQL script run **by hand** in the Supabase SQL editor. Nothing applies them automatically. The number is the order to run them in on a new database.

## How the order was set

The files used to be `tools/supabase-*.sql`, with no order in their names. On 16 November 2026 they were numbered by the date git first saw each file (the third column). Where several were added in one commit, the order follows what the files themselves say:

- `007-progress-safety.sql` before `008-progress-safety-observe.sql`: the second says to run it "only after the UP section of supabase-progress-safety.sql".
- `026-human-pass.sql` before `027-human-pass-enforce.sql`: the second calls `exhibit_require_human_pass()`, which the first creates.
- `011-pending-migrations.sql` is a bundle of `009-study-sync.sql` and `010-quiz-integrity.sql` for running both at once; it is not a separate change.
- `008-progress-safety-observe.sql` is a check to run once, not a lasting change.

## Which have run in production

**Not checked.** This list was written without access to the production database. `tools/verify/verify_pending_migrations.mjs` checks the live database for the objects these files create; run it with production access, then record the result here with its date.

`028-drop-duplicate-events-index.sql` ran in production on 19 November 2026, from the Supabase SQL editor. Before it, `exhibit_events_user_idx` and `exhibit_events_user_created_idx` had the same definition (checked with `pg_indexes`). After it, `exhibit_events` has 5 indexes, `exhibit_events_user_idx` is gone, and `exhibit_events_user_created_idx` remains.

| File | Was | First in git |
|---|---|---|
| `001-reviews.sql` | `tools/supabase-reviews.sql` | 2026-09-15 |
| `002-progress.sql` | `tools/supabase-progress.sql` | 2026-09-20 |
| `003-insights.sql` | `tools/supabase-insights.sql` | 2026-09-23 |
| `004-fix-anon-inserts.sql` | `tools/supabase-fix-anon-inserts.sql` | 2026-09-23 |
| `005-rate-limits.sql` | `tools/supabase-rate-limits.sql` | 2026-09-23 |
| `006-progress-revision.sql` | `tools/supabase-progress-revision.sql` | 2026-09-26 |
| `007-progress-safety.sql` | `tools/supabase-progress-safety.sql` | 2026-09-26 |
| `008-progress-safety-observe.sql` | `tools/supabase-progress-safety-observe.sql` | 2026-09-26 |
| `009-study-sync.sql` | `tools/supabase-study-sync.sql` | 2026-10-01 |
| `010-quiz-integrity.sql` | `tools/supabase-quiz-integrity.sql` | 2026-10-01 |
| `011-pending-migrations.sql` | `tools/supabase-pending-migrations.sql` | 2026-10-01 |
| `012-desk.sql` | `tools/supabase-desk.sql` | 2026-10-18 |
| `013-hardening-2026-10.sql` | `tools/supabase-hardening-2026-10.sql` | 2026-10-18 |
| `014-auth-guard.sql` | `tools/supabase-auth-guard.sql` | 2026-10-18 |
| `015-reviews-privacy.sql` | `tools/supabase-reviews-privacy.sql` | 2026-10-18 |
| `016-certificates.sql` | `tools/supabase-certificates.sql` | 2026-10-18 |
| `017-anon-retention.sql` | `tools/supabase-anon-retention.sql` | 2026-10-19 |
| `018-row-size-limits.sql` | `tools/supabase-row-size-limits.sql` | 2026-10-19 |
| `019-account-deletion.sql` | `tools/supabase-account-deletion.sql` | 2026-10-19 |
| `020-moderator-require-mfa.sql` | `tools/supabase-moderator-require-mfa.sql` | 2026-10-19 |
| `021-survey-read-lock.sql` | `tools/supabase-survey-read-lock.sql` | 2026-10-19 |
| `022-rate-limits-gaps.sql` | `tools/supabase-rate-limits-gaps.sql` | 2026-10-26 |
| `023-audit-fixes-2026-11.sql` | `tools/supabase-audit-fixes-2026-11.sql` | 2026-11-11 |
| `024-participation.sql` | `tools/supabase-participation.sql` | 2026-11-12 |
| `025-prune-test-rows.sql` | `tools/supabase-prune-test-rows.sql` | 2026-11-13 |
| `026-human-pass.sql` | `tools/supabase-human-pass.sql` | 2026-11-13 |
| `027-human-pass-enforce.sql` | `tools/supabase-human-pass-enforce.sql` | 2026-11-13 |
| `028-drop-duplicate-events-index.sql` | new | 2026-11-19 |
