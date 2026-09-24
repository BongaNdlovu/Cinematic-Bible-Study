# Production audit (Playwright)

```bash
python server.py &
npm install
npx playwright install chromium
node qa-e2e/production-audit.mjs --base=http://127.0.0.1:8001 --phase=after
```

## What it covers

1. **Signed-out gate** — `study.html`, `study.html?sheet=3`, `map.html`, `gallery.html`, `insights.html` must show the terms overlay and `site-locked` (no guest entry, including free sittings).  
2. **Mocked signed-in session** — injects Supabase-shaped user into `localStorage.baQaMockSession` (see below), then walks all **11** sittings, map epochs, and gallery artifacts.  
3. **Session persist** — reload + new tab still signed in / `canEnter`.  
4. **Sign-out** — clears mock + session; exhibit re-locks.

Writes JSON under `EVIDENCE_DIR` (default `/workspace/audit-prod/evidence/reports`) and JPEG screenshots under `…/screenshots/<phase>/`.

## How the signed-in mock works

Real Google OAuth is **not** used.

1. Playwright `browser.newContext().addInitScript(…)` runs before page JS.  
2. It sets `localStorage.baQaMockSession` to JSON:

```json
{
  "user": {
    "id": "qa-mock-user-001",
    "email": "qa.auditor@example.com",
    "user_metadata": { "full_name": "QA Auditor", "name": "QA Auditor" }
  },
  "session": {
    "access_token": "qa-mock-access-token",
    "refresh_token": "qa-mock-refresh-token",
    "expires_at": 1234567890,
    "token_type": "bearer"
  }
}
```

3. It also seeds `baJourney.termsByUser` / `termsAccepted` for that user id (terms already accepted).  
4. `js/shared/auth.js` reads the key **only** when `hostname` is `localhost`, `127.0.0.1`, or `[::1]`. On deployed hosts the key is ignored.  
5. For the sign-out test, the runner sets `sessionStorage.baQaForceSignedOut=1` so the init script does not put the mock back on the next navigation.

**Mocked:** identity / session presence used by `ScrollAuth.getUser()` and terms binding.  
**Not mocked:** DOM, quizzes, WebGL gallery, map UI, lock overlay CSS.
