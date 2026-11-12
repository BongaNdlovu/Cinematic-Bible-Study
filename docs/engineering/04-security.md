# 4. Security

**Last verified:** 12 November 2026. The live database facts below come from read-only queries run on that date. Everything else comes from the repository.

## The model in one paragraph

The browser is not trusted. Pages are public files, and the browser talks to Supabase with the **public** (publishable) key. What a user can read or change is decided by Postgres row-level security and by `security definer` functions, never by client code. The edge adds response headers, a strict Content Security Policy, a 404 wall around private paths, and per-IP rate counters for the few paths it handles. Secrets live only in Cloudflare and GitHub settings.

## Layers

| Layer | Protects against | Where |
|---|---|---|
| Response headers and CSP | Script injection, clickjacking, MIME sniffing, leaking referrers | `_headers` |
| Private-path wall | Downloading source, tools, docs or config from the live site | `functions/_middleware.js`, `_routes.json`, deploy exclusions |
| Edge rate limits | Flooding `/csp-report` and `/__rate` | `functions/_middleware.js` and `workers/exhibit-rate-gate/` |
| Sign-in | Account takeover; moderator abuse | Supabase Auth (Google only), authenticator app for moderators |
| Row-level security | Reading or changing someone else's data | `tools/supabase-*.sql`, switched on for every table (live check) |
| Server-side answer checking | Skipping sittings by reading the answer key | `verify_quiz_answer`, `exhibit_quiz_keys` |
| Database write limits | Spam and runaway clients | `exhibit_*_rate_gate` triggers, `exhibit_take_slot`, row-size checks |
| Data retention | Keeping anonymous data longer than needed | `exhibit_prune_anon()` on a `pg_cron` schedule |
| Consent | Collecting analytics without permission | `js/shared/consent.js` |
| Local server checks | DNS rebinding and path tricks on a developer machine | `server.py` |
| CI hygiene | Tampered actions; over-broad tokens | `.github/workflows/*.yml` |
| Encrypted backups | Anyone reading user data from a backup in this public repository | `.github/workflows/db-backup.yml` encrypts each dump with `BACKUP_PASSPHRASE` (AES-256) before upload. See [Database backups](07-develop-test-release.md#database-backups). |

## Response headers (`_headers`, all paths)

| Header | Value |
|---|---|
| `Content-Security-Policy` | `default-src 'self'`. Scripts come from `'self'`, a fixed list of `sha256-` hashes for the inline scripts, Cloudflare Insights and `challenges.cloudflare.com`, plus `'wasm-unsafe-eval'` for WebAssembly (the Meshopt model decoder). `connect-src` lists only Supabase (https and wss), Sentry, Cloudflare Insights, the map tile hosts and Google Fonts. `object-src 'none'`, `frame-ancestors 'none'`, `base-uri 'self'`, `form-action 'self'`, `upgrade-insecure-requests`, `report-uri /csp-report`. |
| `X-Frame-Options` | `DENY` |
| `X-Content-Type-Options` | `nosniff` |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=()` |
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains; preload` |
| `Cross-Origin-Opener-Policy` | `same-origin-allow-popups` |

`style-src` allows `'unsafe-inline'`, because the pages use inline `style` attributes. Scripts do not get `'unsafe-inline'`.

`js/shared/auth-config.js` holds a `turnstileSiteKey`, and the CSP allows `challenges.cloudflare.com` and a Turnstile frame. No code in `js/` reads that key today, so Turnstile is configured but not used by the site's own scripts.

**Inline scripts:** each inline `<script>` must match a hash in the CSP. `tools/verify/verify_csp_hashes.mjs` (part of `npm test`) fails if a hash is missing or no longer used. `tools/verify/verify_csp_policy.mjs` loads 7 pages under the real policy and fails on any blocked resource.

## The private-path wall

- The deploy script copies only what the site needs, and **refuses to deploy** if `fix-plan/`, `FIX-PLAN.md`, `_factcheck/`, `_mig/`, `functions/`, example configs, dotfiles or unminified sources are found in the bundle.
- `_routes.json` sends paths such as `/docs/*`, `/tools/*`, `/tests/*`, `/functions/*`, `/server.py`, `/wrangler.toml` and `/.*` to the middleware. The middleware answers `404` with `no-store`, even if a file somehow got through.
- `tools/smoke.mjs` checks 7 private paths on the live site after every deploy and every 15 minutes, expecting `404` each time.
- `wrangler.toml` points `pages_build_output_dir` at `.pages-deploy`, the cleaned bundle. A manual `wrangler pages deploy` therefore cannot publish the working folder (changed 12 November 2026).

## Edge rate limits

`workers/exhibit-rate-gate/src/rate-gate.js` keeps a fixed one-minute window per IP in a Durable Object:

| Bucket | Paths | Limit per IP |
|---|---|---|
| `report` | `/csp-report` | 10 a minute |
| `account` | `/account`, `/account.html` | 120 a minute |
| `all` | Any other non-static path | 240 a minute |
| (none) | `/assets/`, `/js/`, `/css/`, `/vendor/`, `/models/`, `/bible/` | Not counted |

**What actually uses the gate today:** only `/csp-report` and the `/__rate` proxy. Page paths are deliberately left out of `_routes.json`, so page views never invoke Functions and never spend the Functions quota. `tools/verify/verify_pages_deny.mjs` enforces this. As a result, the `account` and `all` buckets, and the middleware's page-serving branch (`servePage`), are not used for pages today. Supabase's own Auth rate limits protect sign-in (see `docs/ARCHITECTURE.md` for the configured values).

If the gate cannot be reached, a page read is still served. A non-GET request, `/csp-report` included, gets `503`. Gate outages are reported to `exhibit_events` as `limit_unavailable`, at most once a minute per isolate.

`/__rate` needs `Authorization: Bearer <RATE_GATE_SECRET>` and compares the secret in constant time (`safeEqual`). Without it, the answer is `403`. The smoke test checks this.

## Sign-in and roles

| Role | How it is granted | Checks |
|---|---|---|
| Member | Any Google sign-in through Supabase Auth | `auth.uid()` in row-level security |
| Moderator | A row in `exhibit_moderators`, a table no client role can read | `is_review_moderator()` requires a Google identity **and** an `aal2` session, meaning the authenticator app was used. Confirmed in the live database on 12 November 2026. |

The client-side role checks (`ScrollAuth.isModerator()`, `journey.js` `isAdmin()`) only decide what the interface shows. Every moderator action is checked again in the database.

## Row-level security (live database, 12 November 2026)

All 18 tables in the `public` schema have row-level security switched on. A table with **0 policies** cannot be reached by clients at all. Only `security definer` functions or the service role can use it.

| Table | Policies | Notes |
|---|---:|---|
| `exhibit_progress` | 4 | Own row only. Moderators can read. Saved through `save_exhibit_progress`. |
| `exhibit_study_data` | 4 | Own row only |
| `exhibit_profiles` | 4 | Own row only. Moderators can read. |
| `exhibit_reviews` | 5 | Own rows. New and edited notes are forced back to pending. The public reads approved notes only, through `exhibit_public_reviews()`. |
| `exhibit_events` | 2 | Insert (rate-gated). Moderators can read. |
| `exhibit_surveys` | 2 | Insert (rate-gated). Moderators can read. Anonymous reading is revoked. |
| `exhibit_notices` | 3 | Operator notices |
| `exhibit_notice_receipts` | 1 | Own read and hidden state |
| `exhibit_help_notes` | 2 | Notes to the operator. Authors are hidden from other readers. |
| `exhibit_help_replies` | 0 | Functions only |
| `exhibit_certificates` | 0 | Functions only (`issue_exhibit_certificate`) |
| `exhibit_quiz_keys` | 0 | **The answer key.** Functions only. |
| `exhibit_quiz_passes` | 0 | Functions only |
| `exhibit_moderators` | 0 | Functions only |
| `exhibit_password_failures` | 0 | Functions only |
| `exhibit_write_slots` | 0 | Per-user write counters, functions only |
| `exhibit_migrations` | 0 | Functions only |
| `site_notices` | 4 | **Not used by any code in this repo.** Its origin was not checked. |

Function permissions checked live: guests (`anon`) **can** call `exhibit_public_reviews` and **cannot** call `verify_quiz_answer`.

## Answer checking

- The answer key was removed from the client bundle (`tools/audit/scrub_quiz_keys.mjs`) and lives in `exhibit_quiz_keys`.
- `verify_quiz_answer(int, int, int)` (sitting, question, choice) returns right or wrong, and a note. It only reveals the correct choice when the answer is right (audit fix, November 2026). It is rate-limited to 60 checks a minute per user (`exhibit_take_slot('quiz', 60, '1 minute')`).
- `tools/verify/verify_quiz_integrity.mjs` checks that none of the 55 questions (11 sittings × 5) carries a `correct` field in the client data.

## Database write limits

| Limit | Where |
|---|---|
| Insert rate gates on events, surveys, progress, reviews, study data and profiles | `exhibit_*_rate_gate` triggers |
| Per-user slot counters: profile 30 an hour, review edits 20 a day, quiz checks 60 a minute | `exhibit_take_slot` in `tools/supabase-rate-limits-gaps.sql` |
| Row sizes: progress JSON 64 KB in total, certificate name 120 characters, cohort 200 characters, notes 1.2 MB | `tools/supabase-row-size-limits.sql` |
| Client-side pacing (courtesy, not security): 12 event posts and 60 rows a minute, 5 surveys an hour | `js/shared/insights.js` |

## Data retention and deletion

- `exhibit_prune_anon()` runs on `pg_cron`. It deletes anonymous events older than 90 days, keeps at most the newest 200,000 anonymous events, deletes `rate_limited` events older than 7 days, and deletes anonymous surveys older than 180 days.
- Members can delete their account from the account page (`exhibit_delete_my_account()`).
- Signing out removes the personal keys listed in `PERSONAL_KEYS` and `PERSONAL_PREFIXES` in `js/shared/auth.js`. It warns first if anything is unsent.
- Changes put aside after an account switch (`baProgressStash:<account>`, `baStudySyncStash:<account>`) stay on the device until their owner signs in again. They are listed in `privacy.html`.

## Privacy and consent

- Analytics events, surveys and the Cloudflare beacon run only after the visitor allows analytics (`sodConsent`). Do-Not-Track or Global Privacy Control records analytics as declined when no choice has been made yet.
- Operational error reports (`js/shared/ops.js`) and Sentry run without analytics consent, on the legal basis of **legitimate interests (keeping the site working)**, as stated in `privacy.html`. This is a deliberate decision. Without consent, ops reports use a visit-only ID that is deleted when the tab closes. Sentry stores no replays.
- `privacy.html` lists every storage key the site writes. Update it whenever a key is added.

## Secrets

| Secret | Lives in | Used by |
|---|---|---|
| `RATE_GATE_SECRET` | Cloudflare Pages environment | `/__rate` |
| `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID` | GitHub Actions secrets, `production` environment | The deploy job |
| Supabase publishable key, Sentry DSNs | In the code, **on purpose** | Both are designed to be public |

## Local server (`server.py`)

- Binds `127.0.0.1` only.
- Answers only if the `Host` header is `127.0.0.1:<port>` or `localhost:<port>`, which blocks DNS rebinding.
- Serves an allow-list of file extensions and refuses dotfiles and directory traversal.
- CORS allows only the two local origins.

## CI hygiene

- Every third-party GitHub Action is pinned to a full commit hash.
- The default token is `contents: read`. Only the alert job may write issues.
- Production deploys run only on pushes to `master`, after lint and every test suite pass, and inside the `production` environment.

## Security tests

| Command | What it proves |
|---|---|
| `npm run test:security` | 22 attack-style checks (penetration audit) against the code and mocked services |
| `npm test` | Includes CSP hashes and policy, private-path routing, rate limiting, quiz integrity and the desk privacy checks |
| `node tools/smoke.mjs` | The live headers, the private paths, the `/__rate` refusal, and one public database read (the keep-alive) |
