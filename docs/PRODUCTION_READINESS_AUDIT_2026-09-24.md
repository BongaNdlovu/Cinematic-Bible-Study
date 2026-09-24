# Production Readiness Audit — Cinematic Bible Study (Daniel)

**Date:** 2026-09-24 (Africa/Johannesburg)  
**Repo:** https://github.com/BongaNdlovu/Cinematic-Bible-Study  
**Commit audited:** `2a61921` (`master`)  
**Branch with fixes:** `audit/production-readiness` (local only — do not push; evaluate via bundle)  
**Auditor:** automated static + Playwright live walkthrough on this machine  

## Scope

1. **Static code audit** — correctness, asset paths (Linux case-sensitive), lint, headers/CSP, a11y/SEO basics, CF vs Vercel config, dead prior-audit claims.  
2. **Live audit** — `python server.py` + headless Chromium (SwiftShader WebGL) via `qa-e2e/production-audit.mjs`: access gate, every sitting (0–10), map epochs, gallery artifacts; plus production smoke on Pages + Vercel.  
3. **Fixes** on `audit/production-readiness`, then re-run live walkthrough.

## Lesson / sitting count

**11 sittings** (ids 0–10) in `js/study/sheets-data.js`. Each has a workbench gate and **5** checkpoint quiz items (**55** quizzes total).

| id | Title (short) |
|---:|---|
| 0 | The Prophetic Blueprint |
| 1 | The Exilic Crucible |
| 2 | The Metallic Colossus |
| 3 | The Plain of Dura |
| 4 | The Emperor in the Dust |
| 5 | The Handwriting on the Plaster |
| 6 | The Pit of Hunger |
| 7 | The Churning Sea & Little Horn |
| 8 | The Ram, Goat & 2,300 Days |
| 9 | The 70 Weeks & the Cross |
| 10 | Michael Stands Up |

Map chronicle: **10 epochs**. Gallery rail: **25** `data-asset` artifacts exercised after fix.

## Verdict

**Conditionally production-ready after the fixes on `audit/production-readiness`.**

Access control matches the product requirement (terms + Google sign-in; no guest mode). See **Access control** below for gate-strength honesty: the gate is strong for ordinary browsers and is **not** cryptographic server-side enforcement of static assets.

Remaining non-blocking risks:
- Tailwind CDN still loaded in production (official warning; CSP already allows it).
- Cloudflare Web Analytics RUM CORS noise on `localhost` (not on Pages).
- All quiz `correct` indices are `0` (pedagogically correct answers placed first — cheatable pattern).
- Software WebGL (SwiftShader) cannot prove GPU/perf quality of GLB shaders; gallery loaded and switched artifacts successfully under SwiftShader.
- Production Cloudflare serves extensionless URLs (`/study`); `.html` returns **308** — OG tags updated to extensionless on the fix branch.
- Static HTML/JS/models remain downloadable if someone knows URLs (see Access control → Gate strength).

## Access control

### Required behaviour (product)

1. **No guest mode.** Study (including `FREE_THROUGH` free sittings 0–2), map, gallery, and insights are closed until the visitor **both** accepts the current terms **and** is signed in with Google (Supabase OAuth).  
2. Terms acceptance is required before/as part of sign-in; a signed-in account that has not accepted the current terms version stays locked.  
3. After sign-in, the Supabase session must persist on that device (reload + new tab) until explicit sign-out; sign-out re-gates everything.  
4. Deep links while signed out open the gate and, after successful entry, return to the requested URL.  
5. No production bypass via `?preview=full` or similar.

### Policy choices (cover / 404 / preview)

| Surface | Choice | Rationale |
|---------|--------|-----------|
| **Cover `index.html`** | Browsable while signed out; Begin/Enter CTAs open the terms gate | Landing / marketing page can be seen; exhibit content is not. |
| **`404.html`** | Ungated | Error page only; no curriculum. |
| **`?preview=full`** | Honoured **only** on `localhost` / `127.0.0.1` / `[::1]` | Local QA / curriculum review. Ignored on deployed hostnames (Pages/Vercel). |
| **`BAJourney.enablePreview` / TEMP unlock** | Localhost or admin only | Same constraint. |

### What changed (files)

| File | Change |
|------|--------|
| `js/shared/terms.js` | `canEnter = hasAgreed() && signedIn()`; `pendingTerms` alone never unlocks; submit → accept terms then OAuth (or enter if already signed in); deep-link `baTermsNext` on lock; button “Sign in” / “Enter the exhibit”; `insights.html` treated as exhibit; localhost-only `?preview=full`. |
| `js/shared/journey.js` | `previewAllContent` / `enablePreview` restricted to localhost (or admin); export `isLocalDevHost`. `FREE_THROUGH` still defines sequential unlock **after** auth — it is not a guest path. |
| `js/shared/auth.js` | `persistSession` + `autoRefreshToken` + `localStorage` storage (unchanged intent, verified); sign-out clears QA mock + pending terms via `setUser(null)`; **localhost-only** `localStorage.baQaMockSession` for Playwright. |
| `js/study/study-app.js` | Preview / access-enable-preview gated through `BAJourney.previewAllContent` / localhost. |
| `qa-e2e/production-audit.mjs` | Signed-out block matrix; mocked signed-in walkthrough (11 sittings); reload / new-tab persistence; sign-out re-gate. |

**Removed from the branch history:** the earlier guest-entry commit (`allow guest entry after terms without forcing Google OAuth`). Guest entry is **not** a fix.

### End-to-end gate flow

1. Visitor opens `study.html` / `map.html` / `gallery.html` / `insights.html` (or a deep link).  
2. `ScrollTerms.syncLock()` runs after auth ready: if `!canEnter()`, body gets `site-locked` + `terms-locked`, overlay shown, and the deep link is stored in `sessionStorage.baTermsNext`.  
3. User checks “I agree” → `BAJourney.acceptTerms()` (stores `pendingTerms` if signed out, or `termsByUser[id]` if signed in). `hasAcceptedTerms()` is **false** without a user id, so content stays locked until OAuth completes.  
4. Submit calls `ScrollAuth.signIn()` → Google OAuth (PKCE). On return, `onAuthStateChange` / `getSession` restores the user; `commitPendingTerms` binds terms to the account; `syncLock` unlocks and `continueIfReady()` navigates to `baTermsNext` if set.  
5. Session: Supabase client uses `persistSession: true`, `autoRefreshToken: true`, `storage: localStorage`. Reload and a new tab on the same origin restore the session until `signOut()`.  
6. Sign-out: clears session (and QA mock key); `setUser(null)` clears pending terms and calls `syncLock()` → exhibit locked again.

### What was mocked in tests

Real Google OAuth is **not** run in CI/local audit.

- **Mechanism:** Playwright `context.addInitScript` writes `localStorage.baQaMockSession` =  
  `{ user: { id: "qa-mock-user-001", email: "qa.auditor@example.com", user_metadata: {…} }, session: { access_token, refresh_token, expires_at, token_type } }`  
  and seeds `baJourney.termsByUser` / `termsAccepted` for that user id.  
- **Reader:** `js/shared/auth.js` `readQaMock()` — **ignored unless hostname is localhost/127.0.0.1/[::1]**. On production hosts the key does nothing.  
- **Sign-out test:** sets `sessionStorage.baQaForceSignedOut=1` so the init script does not resurrect the mock on the next navigation.  
- **Not mocked:** curriculum DOM, workbench, quizzes, map epochs, gallery assets, CSS lock overlay behaviour.

### Live access evidence (after)

From `evidence/reports/live-after.json` (`http://127.0.0.1:8001`):

| Check | Result |
|-------|--------|
| Signed-out blocked (`study`, `study?sheet=3`, `map`, `gallery`, `insights`) | **5/5 PASS** |
| Mocked signed-in opens study | **PASS** |
| Sheets 0–10 walkthrough | **11/11 PASS** |
| Map epochs / gallery artifacts | 10 / 25 |
| Reload still signed in | **PASS** |
| New tab still signed in | **PASS** |
| Sign-out re-gates | **PASS** |

Highlight screenshots (Africa/Johannesburg run):

- `evidence/screenshots/after/blocked-study_html.jpg` — signed-out study gated  
- `evidence/screenshots/after/blocked-study_html_sheet_3.jpg` — deep link gated  
- `evidence/screenshots/after/signed-in-study-open.jpg` — mocked session, study open  
- `evidence/screenshots/after/session-after-reload.jpg` — still signed in after reload  
- `evidence/screenshots/after/session-new-tab.jpg` — still signed in in a new tab  
- `evidence/screenshots/after/session-after-signout-blocked.jpg` — gated again after sign-out  

(Also: `blocked-map_html.jpg`, `blocked-gallery_html.jpg`, `blocked-insights_html.jpg`, `cover-signed-out.jpg`.)

### Gate strength assessment

| Layer | What exists today | Strength |
|-------|-------------------|----------|
| **Client UI** | Terms overlay + `site-locked` CSS; `canEnter` requires terms + session | Stops normal browsing and deep links in the app shell. |
| **Client preview** | `?preview=full` / enable-preview only on loopback | Cannot unlock production hostnames via query string. |
| **Edge middleware** | `functions/_middleware.js` (Cloudflare) and `middleware.js` (Vercel) | **Rate-limit only** (models/bible/all). **No JWT / cookie / session check.** |
| **Static hosting** | Pages/Vercel serve HTML, JS, GLB, audio as public files | Anyone who can guess/fetch a URL can download assets **without** going through the overlay. |

**Verdict:** The gate is **client-side UX enforcement**, appropriate for keeping casual visitors out of the exhibit UI. It is **not** server-side authorization. A motivated user can `curl` `study.html` or model URLs directly.

**Recommendation for real server-side enforcement** (not implemented — would need new secrets/deploy config and risks breaking current static deploys):

1. Put HTML routes behind **Cloudflare Access** / Zero Trust (email or IdP), or  
2. Edge Function that validates a Supabase JWT (httpOnly cookie set at OAuth callback) and **withholds** HTML for `/study`, `/map`, `/gallery`, `/insights` when invalid; keep cover + 404 public; optionally sign short-lived URLs for `/models/*`, or  
3. Move curriculum behind an authenticated API instead of static files.

Within the current static + rate-limit stack, implementing (2) cleanly was judged **not feasible without new auth cookie plumbing and env secrets**; documented instead of risking broken deploys.

## Findings table

| Sev | File:line (approx) | Description | Fix | Status |
|-----|--------------------|-------------|-----|--------|
| **HIGH** | Access / product | Guests must not reach exhibit content (incl. free sittings). | Require terms **and** Google sign-in; drop guest-entry approach; deep-link return; session persist; localhost-only preview. | **Fixed** |
| **MED** | `vercel.json` CSP `connect-src` | Missing `https://*.arcgisonline.com` present in `_headers` — ArcGIS tile variants could fail on Vercel. | Added host to Vercel CSP. | **Fixed** |
| **MED** | `vercel.json` | No `Strict-Transport-Security` in repo config (Vercel platform still injected HSTS live). | Added HSTS to `vercel.json`. | **Fixed** |
| **MED** | `vercel.json` `Access-Control-Allow-Origin` | Pinned `/*` ACAO to a single `*.vercel.app` origin (breaks preview URLs; CF omits ACAO on `/*`). | Removed global ACAO (same-origin static app). | **Fixed** |
| **MED** | `js/study/workbench.js` placeholder | Sheet 1 asks for Hebrew `zeroim` (6 letters) but placeholder said “7 letters”. | Placeholder → “6 letters”. | **Fixed** |
| **LOW** | `index.html` / `study.html` / `map.html` / `gallery.html` `og:url` | OG URLs used `*.html` while Pages **308** redirects to extensionless paths. | OG urls → `/`, `/study`, `/map`, `/gallery`. | **Fixed** |
| **LOW** | `insights.html`, `404.html` | Missing meta description / robots. | Added description + `noindex`. | **Fixed** |
| **LOW** | Quiz data pattern | All 55 quizzes use `correct: 0` (correct option always first). Content answers are right; pattern is cheatable. | Documented; not shuffled (would need seeded UI shuffle). | **Open** |
| **INFO** | Gate strength | CF/Vercel middleware rate-limits only; static files publicly fetchable. | Documented; recommend Access/JWT edge if assets must be secret. | **Noted** |
| **INFO** | `docs/PROJECT_AUDIT_REPORT.md` | Prior audit describes deleted monolith (`server.js`, `assets-data.js`, CDN Three.js, etc.). | Do not trust; superseded by this report. | **Noted** |
| **INFO** | Lint / `npm test` | `oxlint` clean; header/insights/ratelimit verify PASS before and after. | — | **Pass** |
| **INFO** | Asset paths | Tracked GLBs + study audio/infographics/epochs + HTML refs — **0 missing** on Linux case-sensitive FS. | — | **Pass** |

## Live results — after access-control fix

Auth: signed-out visitors see terms overlay on exhibit pages; curriculum walkthrough used **mocked** Supabase session (see Access control).

| sheet | title | result | notes |
|------:|-------|--------|-------|
| 0–10 | (all 11 sittings) | PASS | Mocked signed-in; wb + 5/5 quizzes each |

Reload / new-tab session: **PASS**. Sign-out re-gate: **PASS**. Signed-out block matrix: **5/5 PASS**.

## How to evaluate the branch (no push)

Artifacts:

- Bundle: `/workspace/audit-prod/audit-production-readiness.bundle`  
- Patch: `/workspace/audit-prod/production-fixes.patch`  
- This report + screenshots under `/workspace/audit-prod/evidence/`  
- In-repo copy: `docs/PRODUCTION_READINESS_AUDIT_2026-09-24.md`

Windows (PowerShell), from a clone of the repo:

```powershell
git fetch .\audit-production-readiness.bundle audit/production-readiness:audit/production-readiness
git checkout audit/production-readiness
```

Or apply the patch onto `master`:

```powershell
git apply --3way production-fixes.patch
```
