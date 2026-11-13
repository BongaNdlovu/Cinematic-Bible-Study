# Security assessment against the OWASP Cheat Sheet Series

**Date:** 13 November 2026. **Site:** `https://cinematic-bible-study-daniel.pages.dev` at commit `9e68565` plus the fixes listed in section 4.
**Measuring stick:** the OWASP Cheat Sheet Series, local copy at `C:\Users\fanel\Downloads\CheatSheetSeries-master\CheatSheetSeries-master\cheatsheets\` (137 sheets). Line numbers below refer to that copy.
**Method:** code and config review, `npm audit`, and read-only requests to the live site and database (response headers, and what the public key can read). No test that writes data was run for this assessment.

## 1. Summary

The site is in good shape for its kind: a static site with Supabase (database and Google sign-in) and Cloudflare (hosting and edge code).

| Result | Count |
|---|---|
| Meets the guidance | 23 points |
| Gaps fixed | 6 (4 at first, 2 more after your decision) |
| Gaps left open, with a reason | 5 |
| Not checked | 6 |

The one **medium** gap left open is that sign-in tokens are kept in `localStorage`. OWASP says not to do this. The strict script policy makes it much harder to exploit, and the real fix needs a server-side session (Phase 2 of `docs/MIGRATION-PLAN-CLOUDFLARE.md`).

## 2. Meets the guidance

| Area (cheat sheet) | What OWASP asks | What the site does | Evidence |
|---|---|---|---|
| OAuth2 (`OAuth2_Cheat_Sheet.md:22`, `:27-33`) | Use PKCE; it also gives CSRF protection | Supabase client uses `flowType: "pkce"` | `js/shared/auth.js:499` |
| Redirects (Unvalidated Redirects) | Only send people to known pages | `?next=` goes through `sameOriginPath()`: same origin, http(s) only, no `//` or `\`, and the file must be in an allow-list | `js/shared/terms.js:45-60` |
| Authentication | No passwords to steal | Google sign-in only | `docs/engineering/04-security.md` |
| Multifactor | MFA for privileged accounts | Moderator rights need a Google identity **and** an `aal2` session (authenticator app) | `tools/supabase-moderator-require-mfa.sql:27`; live check 12 Nov 2026 |
| Authorization / IDOR | Check access on the server for every object | Row-level security on all 18 `public` tables; the public key gets `401` or an empty list on every table (live, 13 Nov 2026) | Section 5 |
| Database Security | Least privilege, no direct client access to sensitive tables | Quiz keys, quiz passes, certificates, moderators and write slots are closed to clients; sensitive work goes through `security definer` functions with a fixed `search_path` | `tools/supabase-*.sql`; live probe |
| Admin functions | Not callable by the public | `exhibit_graduates`, `exhibit_prune_anon`, `exhibit_prune_test_rows` refuse the public key (`42501`) | Live probe, 13 Nov 2026 |
| CSRF | Protect state-changing requests | Requests carry a bearer token in a header, not a cookie, so a forged cross-site request has no credentials | `js/shared/auth.js` (Supabase client) |
| XSS / DOM XSS | No inline script; escape user text | CSP `script-src` has no `'unsafe-inline'` or `'unsafe-eval'`, only `'self'`, fixed hashes and two Cloudflare hosts. Checked: `js/shared/reviews.js` only clears with `innerHTML`; `js/shared/desk.js` uses no `innerHTML`; certificate names are escaped; security check PT-13 covers the insights exports | `_headers`; `run_penetration_audit.mjs` PT-13 |
| CSP | Restrictive policy | `default-src 'self'`, `object-src 'none'`, `base-uri 'self'`, `form-action 'self'`, `frame-ancestors 'none'` | `_headers` |
| Clickjacking | Block framing | `X-Frame-Options: DENY` and `frame-ancestors 'none'` | Live headers |
| HTTP headers (`HTTP_Headers_Cheat_Sheet.md`) | `nosniff`, a referrer policy, a permissions policy, no `X-XSS-Protection` | All present on every path checked; `X-XSS-Protection` correctly absent (`:32-37`) | Live headers, section 5 |
| HSTS | Long `max-age` | `max-age=31536000; includeSubDomains; preload` | Live headers |
| Cache-Control (`:82-88`) | `no-store` for sensitive responses | Error and private-path responses are `no-store`; pages hold no personal data in the HTML | Live headers |
| Secrets Management | No secrets in code | Only the publishable key and Sentry DSN are in code, both public by design. A scan of tracked files found no service keys, private keys or tokens (the only match is the audit's own leak-detector patterns) | Grep, 13 Nov 2026 |
| GitHub Actions: pinning (`:157`) | Pin actions to a commit SHA | Every `uses:` is pinned to a 40-character SHA | `.github/workflows/*.yml`; new test |
| GitHub Actions: token (`:50`) | Least-privilege `GITHUB_TOKEN` | Top-level `contents: read`; only `issues: write` where alerts are opened | Workflows |
| GitHub Actions: triggers (`:111-130`) | Avoid `pull_request_target`, `workflow_run`, `issue_comment` | None used; deploy runs only on a push to `master`, in the `production` environment (its protection rules were not checked) | `.github/workflows/ci.yml` |
| NPM (`:33`) | Install from the lockfile | CI uses `npm ci` | `ci.yml:28`, `:57` |
| Third-party JavaScript | Control third-party code | Three.js, Supabase, Leaflet and Sentry are vendored and served from the site, not from CDNs | `vendor/` |
| Error handling and logging | No sensitive data in error reports | Sentry runs with `dataCollection: { userInfo: false }` and no replays | `js/shared/sentry.js:32-36` |
| Denial of service / bots | Limits on writes and abuse | Per-user and global database write limits, guest event caps, row-size caps, edge rate limits | `docs/engineering/04-security.md` |
| User privacy | Consent, deletion, export | Analytics only with consent; account deletion and data download | `js/shared/consent.js`; `exhibit_delete_my_account()` |

## 3. Gaps left open

| # | Severity | Gap | Cheat sheet | Why it is open | Recommendation |
|---|---|---|---|---|---|
| G1 | **Medium** | Sign-in tokens (access and refresh) are stored in `localStorage` | `Session_Management_Cheat_Sheet.md:201`; `HTML5_Security_Cheat_Sheet.md:53` | Supabase's browser client stores them there; an `HttpOnly` cookie needs a server-side session | Keep the strict script CSP (it is the main defence). Move to server-side sessions in Phase 2 of `docs/MIGRATION-PLAN-CLOUDFLARE.md` |
| G2 | Low | `style-src` allows `'unsafe-inline'` | `Content_Security_Policy_Cheat_Sheet.md` | Inline styles are used across pages | Move inline styles to classes over time |
| G3 | Low | CSP reports use only `report-uri` | `Content_Security_Policy_Cheat_Sheet.md:106` | Works in current browsers | Add `report-to` with a `Reporting-Endpoints` header when convenient |
| G4 | — | **Fixed on 13 November 2026, see F5.** `Cross-Origin-Opener-Policy` was `same-origin-allow-popups` | `HTTP_Headers_Cheat_Sheet.md:160-163` | — | — |
| G5 | — | **Fixed on 13 November 2026, see F6.** The CSP allowed Cloudflare Turnstile, which no site code uses | Third-Party JavaScript | — | — |
| G6 | Info | Every response, including HTML pages, has `Access-Control-Allow-Origin: *` | `HTTP_Headers_Cheat_Sheet.md:143-148` | `_headers` sets it only for static folders; the HTML responses get it from the host. Not checked whether Pages lets `_headers` remove it | Low risk: the pages are public and no cookies are used |
| G7 | Info | The `site_notices` table is readable with the public key (it returned an empty list) | Database Security | Its origin is an open question in `docs/engineering/01-overview.md` | Drop the table or revoke `select`, once confirmed unused |

## 4. Gaps fixed in this change

| # | Gap | Cheat sheet | Fix |
|---|---|---|---|
| F1 | `actions/checkout` kept the token in the runner's git config | `GitHub_Actions_Security_Cheat_Sheet.md:216-218` | `persist-credentials: false` on all 6 checkouts (`ci.yml` ×4, `db-backup.yml`, `health.yml`). No job runs git commands |
| F2 | No automated updates for actions and packages | `GitHub_Actions_Security_Cheat_Sheet.md:164-165` | New `.github/dependabot.yml`: weekly updates for `github-actions` and `npm`, each with a 7-day cooldown |
| F3 | Package install scripts could run during `npm ci` | `NPM_Security_Cheat_Sheet.md:46-51` | New `.npmrc` with `ignore-scripts=true`. Only `fsevents` (Mac-only, optional) has an install script, and `package.json` has no lifecycle scripts |
| F4 | One moderate advisory in a build-time package (`postcss-selector-parser` 6.1.4, via `tailwindcss`; GHSA-rj75-hqrm-r3gf) | `NPM_Security_Cheat_Sheet.md` (audit) | `npm audit fix`: 6.1.6. `npm audit` now reports 0 vulnerabilities |

| F5 | `Cross-Origin-Opener-Policy` allowed popups to keep a link to the page | `HTTP_Headers_Cheat_Sheet.md:160-163` | Now `same-origin` in `_headers`. Sign-in is a full-page redirect, and no code calls `window.open`. Done on 13 November 2026, at your decision |
| F6 | The CSP allowed an unused third-party host (`challenges.cloudflare.com`, Turnstile) for scripts and frames | Third-Party JavaScript | Removed from `script-src`; `frame-src` is now `'none'`. Done on 13 November 2026, at your decision |

`tools/verify-headers.mjs` checks F5 and F6; putting either old value back fails it. `tests/unit/supply-chain.test.mjs` (11 tests) keeps F1 to F3 and the SHA pinning in place. Four mutations were caught: a checkout without `persist-credentials: false`, an action pinned to a tag, an empty `.npmrc`, and Dependabot without a cooldown.

## 5. Live checks (read-only, 13 November 2026)

**Response headers** on `/`, `/study`, `/account`, `/insights` and three 404 paths: all had CSP, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy`, HSTS, `Cross-Origin-Opener-Policy: same-origin-allow-popups`, `Server: cloudflare`, and `Access-Control-Allow-Origin: *`. No `X-Powered-By`.

**Public key against each table** (`GET /rest/v1/<table>?limit=1`):

| Response | Tables |
|---|---|
| `401` permission denied | `exhibit_certificates`, `exhibit_help_notes`, `exhibit_help_replies`, `exhibit_migrations`, `exhibit_moderators`, `exhibit_notice_receipts`, `exhibit_notices`, `exhibit_password_failures`, `exhibit_quiz_keys`, `exhibit_quiz_passes`, `exhibit_reviews`, `exhibit_surveys`, `exhibit_write_slots` |
| `200` with an empty list (row-level security hides every row) | `exhibit_events`, `exhibit_profiles`, `exhibit_progress`, `exhibit_study_data`, `site_notices` |

**Public key against admin functions:** `exhibit_graduates`, `exhibit_prune_anon` and `exhibit_prune_test_rows` returned `401` (`42501`). `is_review_moderator` returned `false`.

## 6. Not checked

- Supabase Auth settings: refresh-token lifetime, session time limits, and the redirect URL allow-list.
- The Google OAuth client's allowed redirect URIs.
- Cloudflare dashboard settings (WAF, bot fight mode) and its automatic DDoS protection for `pages.dev`.
- Sentry's server-side data scrubbing settings.
- A full line-by-line review of all 107 places in `js/` that write HTML (`innerHTML`, `insertAdjacentHTML`, `outerHTML`, `document.write`). The ones handling user text were checked, and the CSP limits the impact.
- Whether `npm run test:security` should be re-run. It was not, because it writes test rows to the live database; the hourly clean-up removes them.

## 7. Cheat sheets used

Authentication, Authorization, OAuth2, Multifactor Authentication, Session Management, JSON Web Token, HTML5 Security, Content Security Policy, HTTP Headers, HTTP Strict Transport Security, Clickjacking Defense, Cross-Site Scripting Prevention, DOM-based XSS Prevention, Cross-Site Request Forgery Prevention, Unvalidated Redirects and Forwards, Insecure Direct Object Reference Prevention, Database Security, Secrets Management, Error Handling, Logging, Denial of Service, Bot Management, User Privacy Protection, Third-Party JavaScript Management, GitHub Actions Security, CI/CD Security, NPM Security, Software Supply Chain Security.

Not applicable to this site, and skipped: language and framework sheets (Java, .NET, PHP, Django, Rails, Laravel, Symfony, Next.js, Node.js server), infrastructure sheets (Docker, Kubernetes, IaC, network), and topic sheets for features the site does not have (file upload, GraphQL, SAML, payments, LLM and AI agents, mobile).
