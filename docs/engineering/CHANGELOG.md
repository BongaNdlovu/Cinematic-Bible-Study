# Changelog

Newest first. Every change to the site adds an entry here, in the same change. Each entry says what changed, why, and which handbook chapters were updated. See [Keeping this handbook current](README.md#keeping-this-handbook-current).

Entry template:

```
## YYYY-MM-DD — short title
**Why:** one or two sentences.
**What changed:** bullet list, with file paths.
**Handbook updated:** chapter numbers.
**Status:** committed / deployed / not yet deployed.
```

---

## 2026-11-16 — Architecture plan, Phase 3: the study stylesheets

**Why:** `css/study-page.css` held 8,775 lines for some twenty features, and four scripts injected more CSS at run time, where a search of `css/` could not find it.

**What changed:**

- **3.1** `css/study-page.css` is cut at rule boundaries into 21 files in `css/study/` (`01-article.css` … `21-timeline.css`), linked by `study.html` in number order. Features were interleaved in the old file (chain-diagram rules, for example, appear in five places), so the cut keeps file order rather than gathering each feature into one file: moving rules across each other could change the cascade. Each file is named for what dominates it. `tools/verify/verify_equivalence.mjs` shows the 21 files, joined in link order, have the same rule list as the old file in git. `tools/minify-release-css.mjs` now walks subfolders. Without that, the parts would have shipped unminified. `verify_css_minify.mjs`, `verify_scripture.mjs`, `verify_workbench.mjs` and the Tailwind content list read the new folder. `tests/unit/study-css.test.mjs` (new) keeps `study.html`'s links in step with the folder.
- **Bug fixed on the way (separate commit):** the reader prompt cards (sitting pulse, profile) and the study page's Insights tab both use the class `insight-card`. Once a prompt had shown, its injected rules turned the tab's three cards into 352 px fixed boxes stacked at the top of the screen; this was seen in a browser before the fix. The prompt rules now match only `body > .insight-card`, with `:where()` so their specificity is unchanged. `tools/verify/verify_insight_cards.mjs` (new, in CI) fails on the old code and passes now.
- **3.2** No script creates a `<style>` element any more:
  - The prompt card styles are now `css/insight-card.css`.
  - The sitting celebration is `css/study/22-celebrate.css`, and the term page is `css/study/23-term-page.css`.
  - The loading bar's keyframes are in `18-scripture-and-loading.css`.
  - Each new file is linked last in the head, where the injected tags used to land, and every moved selector is scoped to its own feature.
  - `js/study/book-open.js` sets its per-sitting values as custom properties on `<html>` and removes them when the animation ends.
  - A before/after browser check matched the eight book-open values (including escaped quotes), their removal afterwards, 16 computed properties on three term-page elements, and the prompt card, its title and its save button.
- **3.3** `docs/engineering/important-inventory.md` and `tools/count_important.mjs`: the 314 `!important` declarations grouped by cause. Nothing was reduced.

**Handbook updated:** 03 (`css/study/`, `css/insight-card.css`), 05 (minification of subfolders, the number of stylesheets), 06 (no injected styles, scoped shared class names, `!important`), README (inventory), new `important-inventory.md`.

**Checked here:** on the Phase 3 branch after 3.2, on Windows: lint exits 0, `npm run test:unit` passes 132 of 132, every `npm test` script passes, and `npm run test:browser` passed 29 of 30. The one failure was the idle-globe check, a test race fixed on the Phase 0 branch. That fix passed 3 of 3 afterwards and is merged here.

**Not checked:** the effect of 23 stylesheets on the study page's first paint; the sitting celebration's styles in a browser (no check opens it); the Linux CI run for this branch.

**Status:** on branch `arch/phase-3-css`, not deployed.

## 2026-11-16 — Architecture plan, Phase 2: dead code and old papers

**Why:** Code that cannot run, rules that cannot match, and old papers beside the handbook all send a reader down false paths.

**What changed:**

- **2.1** `js/study/study-app.js`: `studyMap` was set to `null` and never assigned. It is removed, with its three branches (in the epoch change, `pulseMapYear()` and `selectEmpire()`).
- **2.2** 378 CSS rules deleted: 291 in `css/site.css` (mostly the old home page: `dash-*`, `hero-*`, `reel-*`), 48 in `css/terms.css` (the old email sign-in and terms overlay) and 39 in `css/map.css`. 27 selector lists lost only their dead selectors (13, 5 and 9). A rule went only if every selector in it named a class found in no page, script, vendor file or JSON file, **and** browser CSS coverage never used it. Coverage covered 13 pages, signed in and out, at 1440 and 390 px, and all four study themes. As a control, the same run marked 57 of 523, 24 of 113 and 195 of 380 rules as used. Vendor and state classes (`leaflet-`, `gm-`, `is-`, `has-`) were kept even when unreferenced, because libraries and state code build them at run time. The files shrank from 2,373 to 954 lines (`site.css`), 724 to 411 (`terms.css`) and 1,782 to 1,582 (`map.css`).
- **2.3** The 33 legacy sitting scripts moved to `tools/legacy/` (the user chose moving over deleting). The `patch_sheet*` scripts now find the repository root one level higher.
- **2.4** `FIX-PLAN.md` and `fix-plan/` removed, and their lint ignore with them. **`_mig/` was removed and then restored.** The plan called it finished work, but it is the diagram source: `tools/diagrams/merge-specs.mjs` builds the diagrams in `sheets-data.js` from `_mig/specN.json`, and `verify_flow.mjs` reads it. The reference search before the removal had its output cut short and missed these. CI caught it (`verify_flow`: no such file `_mig/spec4.json`). `validate-specs` reports 46 specs and no problems after the restore.
- **2.5** The 27 loose papers in `docs/` moved to `docs/archive/`. Each is named with the date it was written: the date in its old name, or else its first commit. References in the handbook, tests and tools are updated. Past changelog entries keep the old paths, because they record where the files were. `verify_rate_gate.mjs` now checks the account budget in chapter 04's table, not in the archived paper; with the table changed to 30 it fails. The Cursor complexity skill no longer asks for the archived paper to be updated.

**How 2.2 was checked visually:** screenshots of 10 pages, before and after, signed in and out, at two widths, with animation off and canvases hidden. 25 of 40 pairs were pixel-identical. Every other difference was traced:
- The gallery differed in one run and was identical in the next (3D timing).
- The map's 30–80 px difference and a privacy-page difference also show when the old version is compared with itself.
- The phone home page, signed in, differed in the rotating readers' note (`#shelf-notes-text`) and was identical when captured again.
- 9 full-page screenshots failed on both sides; not investigated further.

**Handbook updated:** 03 (`tools/legacy/`, `docs/archive/`, `_mig/`), 07 (complexity ceiling source), README (where old papers live).

**Checked here:** on the Phase 2 branch, on Windows: `npm run lint` exits 0, `npm run test:unit` passes 130 of 130, every `npm test` script passes, and `npm run test:browser` passes 29 of 29.

**Not checked:** the Linux CI run for this branch; the nine failed full-page screenshots.

**Status:** on branch `arch/phase-2-cleanup`, not deployed.

## 2026-11-16 — Architecture plan, Phase 1: one copy of each shared helper

**Why:** Small helpers had been copied from file to file and had drifted apart. There were 14 HTML escapers, and 8 of them did not escape `'`. There were 4 local-host checks (they decide when the local test sign-in is honoured), 3 different focus traps, and the sign-in reads were copied into 10 files. A fix to one copy never reached the others.

**What changed:**

- `js/shared/core.js` (new): `escapeHtml`, `isLocalDevHost`, `currentUser`, `signedIn`, `authClient`, `focusableIn` and `trapFocus` on `window.SiteCore`. It loads first, without `defer`, on every page except the `shelf.html` redirect. It reads `ScrollAuth` when called, not when loaded, because `journey.js` and `human-pass.js` load before `auth.js`. That load order is why the plan's "put it in `auth.js`" was not followed.
- 32 local copies in 21 files now call `window.SiteCore` and keep their names, so no call site changed: 13 escapers, 5 `signedIn`, 4 `currentUser`, 7 client getters and 3 `isLocalDevHost`. The inline escape at `study-app.js:258` calls `SiteCore.escapeHtml` directly.
- `js/shared/insights.js`: its local-host check also counted `*.local` hosts for analytics. It is now `analyticsOffHost()`: the shared check plus `*.local`, as before.
- One focus trap for `task-flow.js`, `term-overlay.js` and `mindmap.js`. **Behaviour change:** the three now agree. Tab wraps at the first and last visible control, and focus that has left the dialog is brought back. The mind map now includes form fields, and controls inside hidden panels are skipped.
- `tools/storage-keys.mjs` (new) lists 61 storage keys and prefixes, with which ones sign-out and account deletion clear. `tests/unit/storage-keys.test.mjs` checks it against the code, `privacy.html`, `PERSONAL_KEYS` and `SITE_KEYS`. **Decision:** the plan asked for constants in the code instead of typed strings. A mistyped constant is `undefined`, and `localStorage.getItem(undefined)` silently uses the key `"undefined"`, so constants alone would not catch the typo the plan worries about. The test does: a mistyped key fails it and names the file. The 212 storage calls were left as they are.
- `privacy.html`: seven keys the site already stored were missing from the storage table (three read-aloud settings, `daniel-shelf:last`, `scroll_section`, `cmap-key-open`, `cmap-globe-intro`). They are added to the preferences row, and the effective date is now 16 November 2026.
- Tests that load browser files in a Node sandbox now load `core.js` first, as a page does: `tests/unit/audit-fixes`, `human-pass`, `mfa-card`, `sentry`, `sid-report`, `state-fixes`, and `tools/verify/verify_insights.mjs`.
- `tests/unit/core.test.mjs` (12 tests) and `tests/unit/storage-keys.test.mjs` (6 tests).

**Handbook updated:** 03 (`core.js`, `tools/storage-keys.mjs`, where new work goes), 04 (one copy of each check, the storage-key test, an open question), 06 (focus trap).

**Also in this change (test scripts only):** `tools/verify/verify_mindmap_fullscreen.mjs` checked the reference row for its `is-hit` mark, which `study-app.js` removes after 1.8 s (line 4406). Under load the check ran later than that and failed 2 of 50 assertions. It now records the row the moment it is marked. A comment audit removed six comments that only restated empty `catch` blocks in `verify_book_reader.mjs`, `verify_mindmap.mjs` and `verify_mindmap_fullscreen.mjs`.

**Checked here:** `npm run lint` exits 0. `npm run test:unit` passes 130 of 130 (18 new). Every script in `npm test` passes, run one at a time. `npm run test:browser` on Windows: 28 of 29; the one failure (`verify_mindmap_fullscreen`, the timing race above) then passed 50 of 50 assertions three times in a row after the fix. Each new guard was made to fail on purpose: a mistyped `'daniel_historicist_mastry'` in `competency.js` failed the storage-key test and named the file, and removing `baDeskReceipts` from `PERSONAL_KEYS` failed it too.

**Not checked:** a full `npm run test:browser` run after the timing fix; CI on GitHub for this branch; a screen-reader pass of the new focus trap.

**Status:** on branch `arch/phase-1-shared-helpers`, not deployed.
## 2026-11-16 — Browser checks hardened for CI

**Why:** On GitHub's Linux runner, 22 of 29 browser checks passed. The failures were timing: scripts gave their own server 6 s to start, slept a fixed 1.6 s before talking to Chrome, and waited 12.5 s for a 3D model or 15 s for globe pins under software rendering. One check (`verify_mindmap_fullscreen`) raced a 1.8 s highlight.

**What changed:** `run_browser_checks.mjs` passes its server to every script as `BASE` and prints 30 lines of a failure. `_server.mjs` gains `cdpTargets()`. Eight Chrome-driven scripts use `BASE` when given and `cdpTargets()` instead of a fixed sleep. Longer limits that cost nothing when the page is fast: `verify_hall_mural` 40 s per artifact, `verify_globe` 45 s for pins, `verify_horizon` polls the hover card for up to 5 s. `verify_mindmap_fullscreen` records the reference row when it is marked.

**Handbook updated:** 07.

**Second CI round:** 26 of 29 passed on Linux. `verify_hall_mural` launched Chrome with `--use-angle=d3d11`, a Windows-only graphics backend, so the gallery had no WebGL on Linux; `_server.mjs` now has `webglFlags()` (Direct3D on Windows, SwiftShader elsewhere). `verify_horizon` failed because the Linux browser reports `(hover: none)`, and `showHorizonFloat()` in `js/study/study-app.js` deliberately shows no hover card on such devices; the check now expects the card to open where hover exists and to stay hidden where it does not. `verify_globe` now scrolls up to three times before giving up on close satellite imagery, and reports the globe's state if it still fails. On Windows these three passed 3 of 3 afterwards; not checked yet on Linux.

**Checked here:** on Windows, the eight changed scripts through the runner: 7 of 8 at first; `verify_globe` then failed twice more and passed after two stray local `server.py` processes from earlier runs were stopped, so the failures are put down to those processes. Not checked: why a stray server made the globe fail. Not checked yet: the Linux CI run.

**Status:** on branch `arch/phase-0-safety-net`, pushed.

## 2026-11-16 — Architecture plan, Phase 0: browser checks repaired

**Why:** Phase 0 left 10 browser checks quarantined. The first CI run on GitHub then showed 3 of the 20 in-CI checks failing on Linux. "Fix all the problems" was the request.

**What changed:**

- `tools/verify/_server.mjs`: new `signedInScript()` (the local test sign-in, consent, onboarding and terms in one place, with `TERMS_VERSION` read from `js/shared/journey.js`), `QA_MOCK` and `chromePath()` (`CHROME_PATH`, then an installed Chrome on Windows, Linux or Mac, then Playwright's Chromium). Eight Chrome-driven scripts now use `chromePath()` instead of their own Windows-only list.
- Nine quarantined checks fixed in the scripts, each because the site had changed on purpose: `verify_cp07`, `verify_flow`, `verify_lesson_connectors`, `verify_map`, `verify_medal_art`, `verify_mindmap`, `verify_mindmap_fullscreen`, `verify_mobile_viewports`, `verify_theme`. The table in chapter 07 gives the change and the fix for each.
- `verify_book_reader`: no longer injects a second copy of the reader, counts checkpoint plates, passes checkpoints before walking the book, ignores buttons inside hidden panels, and has a new check (M2.0) that an unanswered checkpoint holds the book. It stays quarantined for its timing and geometry checks.
- `verify_globe`: prints WebGL support, the renderer and page errors when the globe pins do not appear.
- `tools/verify/verify_live_inserts.mjs` deleted (obsolete, and it posted to the production database).
- `run_browser_checks.mjs`: 29 checks in CI, 1 quarantined.

**Handbook updated:** 07 (browser checks rewritten).

**Checked here:** `npm run test:browser` on Windows: 26 of 29 in one full run; the 3 that failed there (`verify_horizon`, `verify_lesson_connectors`, `verify_mindmap_fullscreen`) then passed 3 of 3. The first two had failed because a bug in the first `chromePath()` (single backslashes in the Windows paths) sent them to Playwright's Chromium instead of the installed Chrome; that is fixed. Every other check on the list passed in the full run.

**Not checked:** a CI run with these changes; `verify_mindmap_fullscreen` failed 2 of 50 assertions once under the full run and passed alone, so it may be timing-sensitive; why `verify_horizon` and `verify_lesson_connectors` fail under Playwright's Chromium on Windows.

**Status:** on branch `arch/phase-0-safety-net`, pushed, not deployed.

## 2026-11-16 — Architecture plan, Phase 0: the safety net

**Why:** The architecture improvement plan starts with checks, so every later move can be proved safe. 34 `tools/verify/verify_*.mjs` files were not run by anything, and a stale generated file would ship without a failing test. No site code changed in this step.

**What changed:**

- `package.json`: `npm test` now ends with `node tools/build_study_sheets.mjs --check`, `node tools/verify/build_glossary_enrichment.mjs --check` and `node tools/verify/verify_wiring.mjs`. New script `npm run test:browser`. New dev dependency `acorn` (^8.19.0, lockfile updated, no install scripts), used to parse JavaScript.
- `tools/verify/build_glossary_enrichment.mjs`: new `--check` mode. It compares the committed `js/study/glossary-enrichment.js` with what the overrides would produce, ignoring Windows line endings.
- `tools/verify/verify_wiring.mjs` (new): fails when a `verify_*.mjs` file is neither run by a script nor listed with a reason.
- `tools/verify/run_browser_checks.mjs` (new): starts one site server and runs 20 browser checks. 10 known-failing checks are kept in a `QUARANTINED` list with the reason for each; `--include-quarantined` runs them.
- `.github/workflows/ci.yml`: new `test-browser` job. **deploy** does not wait for it yet.
- `tools/verify/verify_equivalence.mjs` (new), with `tests/unit/equivalence.test.mjs` (11 tests): compares two folders or git revisions by JavaScript syntax tree and by CSS rule list.
- `tools/measure_baseline.mjs` (new) and `docs/engineering/architecture-baseline.md` (new): file sizes, function lengths and duplicate function names, taken today.
- Browser scripts fixed because the site now shows a cookie dialog and an onboarding dialog: `verify_readalong`, `verify_story_layers`, `verify_story_mobile`, `verify_story_reader`, `verify_story_themes` (they pass now). `verify_book_reader`, `verify_flow`, `verify_mindmap` and `verify_mindmap_fullscreen` got the same lines and still fail for other reasons.
- `tools/verify/verify_workbench.mjs`: two stale assertions updated (the survey grant lines in `tools/supabase-progress.sql`, and the `save_exhibit_progress` call in `js/shared/progress-sync.js`).
- `verify_live_inserts.mjs` is obsolete (it expects production to accept a guest insert; production now answers 400 `human_check`). It is listed as not run in CI and not deleted.

**Handbook updated:** 07 (scripts, tests, browser checks, CI, the equivalence check), 03 (new files in `tools/`), README (index), new `architecture-baseline.md`.

**Checked here:** `npm run lint` exits 0. `npm run test:unit` passes 112 of 112 (101 before, 11 new). `npm test` passes, including the three new guards. `npm run test:browser` passes 20 of 20. Each new guard was shown to fail on purpose and pass again: an unwired file, a file in both lists, and a changed generated file. `verify_equivalence.mjs` found a real difference between `git:HEAD` and the working tree in `css/study-page.css`.

**Not checked:** the `test-browser` job on GitHub (Linux); whether the 10 quarantined checks fail on a clean `master` (the run included uncommitted local edits); the screenshot set in the baseline.

**Status:** on branch `arch/phase-0-safety-net`, not committed, not deployed.

## 2026-11-16 — Comment bloat removed

**Why:** The comment bloat assessment found 160 KB of comments, 78% of it in three files. Much of it was build history, agent notes and essays, and seven comments were already wrong. JavaScript and HTML comments ship to every reader.

**What changed:**

- Dead code removed: the empty `ensureStudyMap()` and its two calls (`js/study/study-app.js`), and the `.mm.is-compact .mm .mm-text` rule, which could never match (`css/study-page.css`).
- 159 comments deleted: 83 section banners, 41 label comments in `study.html` and 1 in `index.html`, 31 lines in `js/study/study-app.js` that restated the code (including the wrong "538 A.D. & 1844" note), 2 history notes in `css/study-page.css`, and 1 dated line in `js/shared/journey.js`.
- 111 comments cut to the rule they hold: 46 in `js/study/mindmap.js`, 39 in `css/study-page.css`, 18 in `js/study/study-app.js`, and one file header each in `net.js`, `ui-sound.js`, `ui-click-sound.js`, `audio-orb.js`, `card-min.js`, `term-overlay.js`, `book-reader.js` and `journey.js`. Spec codes (C1–C21, §), prototype and agent notes are gone.
- Fixed: the contradicting scale figure in `mindmap.js` (now 0.88 throughout), three comments that pointed to `study.html` for styles in `css/study-page.css`, and the comment for a chime that no longer exists (`study.html`).
- 19 files changed in all.
- Result: 1,168 comments down to 1,009, and 159.6 KB down to 108.3 KB. Comments of 400+ characters: 63 down to 4; the longest is now 675 characters (was 3,246). The site's own JS is 26 KB smaller raw and 7.7 KB smaller after Brotli; the study page's scripts are 7.3 KB smaller after Brotli.

**Checked here:** every changed JS file parses to the same syntax tree as before. Every CSS file has the same rules and declarations, apart from the one dead rule. Every HTML page is identical once comments are removed, with byte-identical inline scripts. `verify_csp_hashes.mjs` passes (8 hashes), `oxlint` reports 0 warnings and 0 errors before and after, `lint-inline-scripts.mjs` and `verify_css_minify.mjs` pass. No verifier in `tools/verify/` reads any removed text. `npm test` and the Playwright suites were not run (they need the full repo and a browser).

**Not done:** `studyMap` in `js/study/study-app.js` is set to `null` and never reassigned, so the three `if (studyMap)` branches are also dead. They were left for a separate change.

**Handbook updated:** 05 Performance (JS and HTML ship unminified, with their comments), 06 UI (full-screen mechanism, layer order, comment rule).

**Status:** not committed, not deployed.

---

## 2026-11-15 — Theological audit fixes (lesson text)

**Why:** `docs/THEOLOGICAL-AUDIT-2026-11-15.md` flagged 22 items. Each was checked against the lesson source. All 22 were real problems and all were fixed; three of the audit's supporting details were wrong (recorded at the end of the audit file). Most were contradictions between two parts of the course, quiz feedback that answered the wrong option, or broken card markup.

**What changed:**

- `js/study/sheets-data.js` (the source every sitting is built from): Sittings 0, 1, 2, 3, 4, 5, 6, 8, 9, 10 and the 538 A.D. horizon card. Seven quiz feedback lines were rewritten (Sitting 1 Q1 and Q5, Sitting 4 Q1, Sitting 5 Q3, Sitting 8 Q4, Sitting 10 Q1 and Q3). Answer slots and the answer key are unchanged.
- `js/study/sheets/index.js` and `sheet-0.js` to `sheet-10.js` (not 7): rebuilt with `node tools/build_study_sheets.mjs`. `--check` passes.
- Sittings 4 and 8: the INTERPRETATION card was nested inside the CHRIST card. Both are now separate cards, interpretation first, as in the other sittings.
- `js/study/sheet-glossary.js`, `js/study/glossary-enrichment-overrides.json`: Alcázar, Jehoiakim's third and fourth year, zeroim, dispensationalism, Clovis and 508, tamid, little horn. Also removed the "History: " label from 41 short glossary definitions, where it showed to readers.
- `js/study/glossary-enrichment.js`: rebuilt with `node tools/verify/build_glossary_enrichment.mjs`.
- `js/study/sheet-verify.js`, `js/study/sheet-map.js`, `js/study/workbench.js`: the same corrections where they repeat.
- Not changed: `tools/supabase-quiz-integrity.sql`. No answer index moved, so the database key needs no migration.

**Checked here:** `build_study_sheets.mjs --check` passes. All 55 quizzes keep one blank feedback slot and aligned options. No level card is nested. No forbidden brand names in the edited files. Changed files parse. `npm test` was not run (the full repo was not available here).

**Handbook updated:** none. This changes lesson wording only, not pages, files, security, performance, UI components, or tooling.

**Status:** committed, pushed to `master`, and deployed to Cloudflare Pages.

---

## 2026-11-15 — Sign-in required from the first sitting

**Why:** You asked that the study need a sign-in from the start. Until now guests could read the Prologue, Daniel 1 and Daniel 2 without an account.

**What changed:**

- `js/study/study-app.js`: new `gateStudyForMembers()` runs first. It hides the page, waits for the session (`requireMember()`), and sends a guest to `account.html?next=study.html…`. A member sees the page as soon as the session is known. The share text no longer says "No sign-in needed".
- `js/shared/journey.js`: `FREE_THROUGH` is now `0`, so a new member starts with the Prologue and opens each later sitting by completing the one before. A guest's lock message for any sitting now asks them to sign in. `maxOpenSheet()` still answers 0 for a guest; this lets the study page draw the Prologue while the session is restored, instead of refusing a member who is not yet known.
- `js/home/shelf.js`: `can()` returns false for a guest (unless `previewAllContent()`), so all eleven volumes show as locked and lead to the account page. The 3D room now waits for `ScrollAuth.ready()` before it is built, so a member's open books are not drawn dimmed.
- Copy: `account.html` (lead, terms summary, "Signing in" section), `js/shared/account.js` (lead for signed-out readers), `terms.html` ("Signing in" replaces "The free sittings and sign-in"), `privacy.html` (the "without an account" card), `study.html` (access panel line).
- Tests: `tools/verify/verify_insights.mjs` now expects the new account wording. `tools/verify/verify_portal_and_hubs.mjs` checks that a guest sees every volume locked and is redirected with `next` kept, then signs in with the local QA session and checks that only the Prologue is open, and that Daniel 1 opens once the Prologue is complete.
- `tests/unit/human-pass.test.mjs`: the test pass expired at a fixed time (14 November 2026 02:00), so unit test 20 failed on every run after that and the CI `test` job, which the deploy job needs, could not pass. The expiry is now two hours after the test starts.
- Not changed: `TERMS_VERSION` (6) and the effective dates. You chose not to ask readers to accept the terms again.
- Not checked: scripts outside `npm test` that open `study.html` as a guest (for example `verify_cp07.mjs`, `verify_lesson_connectors.mjs`, `verify_story_reader.mjs`) will now be redirected and need a `baQaMockSession` before they are run again.

**Handbook updated:** 01 Overview, 02 How it works, 04 Security, 06 UI, 07 Develop, test, release.

**Status:** committed; CI deploys it on push to `master`.

---

## 2026-11-13 — Legal pages match the code

**Why:** A check of the site against a launch legal checklist found three sentences in the terms and privacy policy that no longer matched the code.

**What changed:**

- `terms.html`, "Your account": dropped the advice to choose and change a password. Sign-in is Google only, so the text now asks readers to keep their Google account secure.
- `terms.html`, "Third-party services": the human check is described as running before a guest's study activity is saved, not "at sign-in". This matches `js/shared/human-pass.js`.
- `privacy.html`, "Your rights": objection now names legitimate-interest uses (error reports, abuse protection). Study events rely on consent (the lawful-basis table), so the text points to Cookie settings to withdraw it.
- Not changed: the terms effective date and `TERMS_VERSION` (6, `js/shared/journey.js`). These are corrections, not new obligations, so readers are not asked to accept again.

**Open from the same check (not done):** Google Fonts load from Google before consent; no written breach procedure; no third-party licence notices file; processor agreements not checked.

**Handbook updated:** 04 Security.

**Status:** not committed, not deployed.

---

## 2026-11-13 — Guest human check (Turnstile)

**Why:** You asked for real bot protection. Any script with the public key could write guest study events and surveys; only rate limits stood in the way. Turnstile only protects anything when a server checks it.

**What changed** (gated plan `FIX-PLAN.md`; `gate.js pre` RESULT: PASS 39/39, `apply.js` applied 26 edits to 16 files, 4 new files, `gate.js post` RESULT: PASS 57/57)

- New `js/shared/human-pass.js`, loaded on all 8 pages after `ops.js`. Guest flushes in `js/shared/insights.js` and `js/shared/ops.js`, and guest surveys, wait for a pass.
- `functions/_middleware.js`: new `/__human-pass` route; `_routes.json` routes it.
- New `tools/supabase-human-pass.sql` (pass table, key table, grant and check functions) and `tools/supabase-human-pass-enforce.sql` (two triggers).
- `_headers`: Turnstile allowed again in `script-src` and `frame-src`, because it is now used. `tools/verify-headers.mjs` requires it.
- `js/shared/auth-config.js`: new site key `0x4AAAAAAF_kupAyw6i2kALC` (a new Turnstile widget made today). This one-line change was made after the gate, outside the plan.
- `privacy.html`: Turnstile named under Cloudflare; new `baHumanPass:<ID>` session key listed.
- `tools/security/run_penetration_audit.mjs`: PT-19 and PT-20 now expect `human_check`; new PT-23.
- New `tests/unit/human-pass.test.mjs` (17 tests). The gate caught all 15 planned mutations and all 24 tampers.
- Tested: `npx oxlint` exit 0; `npm run test:unit` 101 of 101; `npm test` exit 0, including "csp policy: 7 pages load under the _headers policy with nothing blocked".
- Live database, 13 November 2026: `tools/supabase-human-pass.sql` run ("Success. No rows returned"). Read-only check: both tables exist with row-level security on; `anon` cannot read either; `anon` can call the grant, `authenticated` cannot; no enforcement triggers yet.

- You stored the hash of `HUMAN_PASS_KEY` in `exhibit_edge_keys` (read-only check: 1 key, 64-character hash). Deployed as `a92ae2d` (CI: test, deploy, smoke success). Live: `/__human-pass` answered 403 to a fake token (so both Cloudflare secrets are set) and 400 to no token.
- A real guest visit in a private window got a pass (12 hours) and its `sitting_start`, `onboarding` and `scroll_depth` events were stored under the same guest id. Turnstile passed without showing a widget. A headless test browser was held at the challenge, as expected.
- You ran `tools/supabase-human-pass-enforce.sql`. Read-only check: `exhibit_events_human_pass` and `exhibit_surveys_human_pass` exist and are enabled, next to the rate-gate triggers.
- `npm run test:security`: 23 passed, 0 failed, including PT-19, PT-20 and PT-23. Afterwards, 0 `pen` events, 0 `pen` surveys and 0 `pen` passes in the database.

**Handbook updated:** 03, 04, 07.

**Status:** committed, pushed, deployed, and enforced in the live database.

---

## 2026-11-13 — Stricter popup isolation and no unused Turnstile host

**Why:** Two gaps from `docs/SECURITY-ASSESSMENT-OWASP.md` (G4, G5) that needed your decision; you chose to apply both.

**What changed**

- `_headers`: `Cross-Origin-Opener-Policy: same-origin` (was `same-origin-allow-popups`). The CSP no longer allows `https://challenges.cloudflare.com`: removed from `script-src`, and `frame-src` is now `'none'`.
- `tools/verify-headers.mjs`: checks the new values. Two mutations were caught (old COOP value; Turnstile back in `frame-src`).
- `docs/SECURITY-ASSESSMENT-OWASP.md`: G4 and G5 marked fixed (F5, F6).
- Tested: `npx oxlint` exit 0; `npm run test:unit` 84 of 84; `npm test` exit 0, including "csp policy: 7 pages load under the _headers policy with nothing blocked".

**Handbook updated:** 04.

**Status:** committed and pushed to `master`; CI deploys it.

---

## 2026-11-13 — OWASP security assessment and supply-chain fixes

**Why:** You asked for the site to be assessed against the OWASP Cheat Sheet Series, and for clear gaps to be fixed.

**What changed**

- New `docs/SECURITY-ASSESSMENT-OWASP.md`: 23 points that meet the guidance, 4 gaps fixed, 7 left open with reasons (one medium: sign-in tokens in `localStorage`), and 6 things not checked. Live checks were read-only.
- `.github/workflows/ci.yml`, `db-backup.yml`, `health.yml`: `persist-credentials: false` on all 6 checkouts.
- New `.github/dependabot.yml`: weekly updates for actions and npm, 7-day cooldown.
- New `.npmrc`: `ignore-scripts=true`.
- `package-lock.json`: `npm audit fix` moved `postcss-selector-parser` from 6.1.4 to 6.1.6 (moderate advisory GHSA-rj75-hqrm-r3gf, build-time only) and dropped `cssesc`. `npm audit`: 0 vulnerabilities.
- New `tests/unit/supply-chain.test.mjs` (11 tests). Four mutations were caught.
- Tested: clean `npm ci`; `npx oxlint` exit 0; `npm run test:unit` 84 of 84; `npm test` exit 0. `npm run test:security` was not re-run (it writes to the live database).

**Handbook updated:** 03, 04, 07.

**Status:** committed and pushed to `master`; CI deploys it.

---

## 2026-11-13 — Clean up rows left by the live tests

**Why:** `npm run test:security` (PT-19, PT-20) and `tools/verify/verify_live_inserts.mjs` write real rows to the live database to prove the spam limits there. They have to write to prove it, but the rows stayed. A read-only count on 13 November 2026 found 1,328 test events and 117 test surveys, out of 8,917 events and 138 surveys. The dashboard already hid the test events (`PROBES`), and the test surveys had no rating, so no figure was wrong, but the data was cluttered.

**What changed**

- New `tools/supabase-prune-test-rows.sql`: `exhibit_prune_test_rows()` deletes only rows with no account and both test markers (see chapter 04), and returns how many it deleted. A `pg_cron` job runs it every hour at minute 23. No client role can run it.
- `tools/verify/verify_insights.mjs`: checks that both deletes are limited to rows with no account, that each test row is matched by two markers, that clients cannot run it, and the schedule. Two mutations were caught.
- Tested on a local PGlite database: it deleted the 4 test events and 2 test surveys in the sample, and kept every real, signed-in or half-matching row.
- Live check before any delete: no `pen` survey or `pen_probe` event falls outside the rules.

**Handbook updated:** 04, 07.

- Run in the live database on 13 November 2026, with the owner's go-ahead. Supabase showed its "destructive operations" warning, which was confirmed. The cron job was created (job id 2). The first run returned `deleted_events=1328 ; deleted_surveys=117`, the same as the count beforehand. A read-only check afterwards: 0 test events and 0 test surveys left; 7,591 events and 21 surveys in total (2 new events arrived between the counts); job `exhibit-prune-test-rows`, `23 * * * *`, active; neither `anon` nor `authenticated` can run the function; 22 people started a sitting since 19 October 2026, the same as before.

**Status:** committed, pushed to `master`, and run in the live database.

---

## 2026-11-13 — Count study activity from 19 October 2026

**Why:** The SID report counted every event since launch. Before 19 October 2026 events were recorded without analytics consent, and the busiest days match development and test runs: 385 starts on 24 September, 398 on 30 September, 1,470 starts by 134 browsers on 14 October (read-only query on the live database, 13 November 2026). So "607 people started a sitting" was mostly test traffic, and the report's own line "count only readers who allowed anonymous study analytics" was untrue for those dates.

**What changed**

- `js/insights/insights.js`: `ACTIVITY_COUNT_FROM = '2026-10-19T00:00:00.000Z'`. The dashboard loads and counts events and ratings from that date at the earliest (`activityCut()`, `keepActivity()`); "All time" included. `loadRange()` does the same for the SID report and passes `countFrom` to it. The status line says "study activity counted from 19 October 2026, when analytics consent began". Test hooks `setCountFrom` and `loadRange` added.
- `js/insights/sid-report.js`: events and ratings are filtered from `countFrom`. A note explains the cut when the period starts earlier. The 90-day guest-deletion note only shows when it still matters. The method page has a line on the cut.
- Not cut: welcome answers, saved progress, certificates, the project-target figures. No rows were deleted.
- Tests: `verify_insights.mjs` checks the in-memory cut, and that report queries start at 19 October for events and ratings but not for profiles. `verify_sid_report.mjs` checks the cut, the notes, and that profiles keep the whole period. Four mutations were caught (no cut in the report, no cut in the report query, no cut on the dashboard, an earlier date).
- Tested: `npx oxlint` exit 0; `npm run test:unit` 73 of 73; `npm test` exit 0; `npm run test:security` 22 of 22.

**Handbook updated:** 02.

**Status:** committed and pushed to `master`; CI deploys it.

---

## 2026-11-13 — Clearer Study insights gate

**Why:** A moderator signed in with Google but without the authenticator step was told to "Sign in", although they were signed in. Seen on the live site on 13 November 2026 (session `aal1`).

**What changed**

- `js/insights/insights.js`: when the page is gated, `explainGate()` asks Supabase for the session's assurance level. If the account has an authenticator but the session has not used it (`nextLevel` `aal2`, `currentLevel` not `aal2`), the gate says "You are signed in. Enter the code from your authenticator app on the Account page to open this page." Otherwise it keeps the sign-in message. A late answer from an older check cannot overwrite a newer one (`gateGen`).
- `tools/verify/verify_insights.mjs`: five gate cases (second step needed, already `aal2`, no authenticator, signed out, failed check). Two mutations were caught.
- Tested: `npx oxlint` exit 0; `npm run test:unit` 73 of 73; `npm test` exit 0; `npm run test:security` 22 of 22.

**Handbook updated:** 06.

**Status:** committed and pushed to `master`; CI deploys it.

---

## 2026-11-12 — Count "began" from server-checked quiz answers

**Why:** "Began" counted sittings marked complete in saved progress, which the browser writes. A script with a Google account could fake that and inflate the 500 and 700 figures.

**What changed**

- `tools/supabase-participation.sql`: "began" is now `exhibit_sittings_passed(u.id) >= 1`, meaning every checkpoint question of at least one sitting was answered correctly through `verify_quiz_answer()`. It no longer reads `exhibit_progress`.
- `js/insights/sid-report.js` and `js/insights/insights.js`: the labels and the "How these figures are counted" line say so.
- `tools/verify/verify_insights.mjs`: checks that the SQL counts quiz passes, never reads `journey`, and refuses non-moderators first. A mutation back to the old rule was caught.
- Tested: `npx oxlint` exit 0; `npm run test:unit` 73 of 73; `npm test` exit 0; `npm run test:security` 22 of 22.
- Run in the live database on 12 November 2026 ("Success. No rows returned"). A read-only check then showed: one `exhibit_participation` function, using `exhibit_sittings_passed` and not `journey`; `security definer`; `anon` cannot run it and `authenticated` can; a non-moderator call returns `42501`; `is_review_moderator()` still requires `aal2`; all 11 sittings have questions. Live counts, leaving out moderators: 4 accounts registered, 0 began under the old rule and 0 under the new one.
- Not checked: the dashboard and report while signed in as a moderator.

**Handbook updated:** 02.

**Status:** committed and pushed to `master`; CI deploys it.

---

## 2026-11-12 — 700 counter on the Study insights page

**Why:** You want one verified number to watch: how many people have registered and begun the study, against a goal of 700.

**What changed**

- `js/insights/insights.js`: `load()` also calls `exhibit_participation()` for all time. A new first tile, "Toward 700", shows `began / 700` and the share of 700 and of the 500 SID target (`targetTile()`, `COUNTER_TARGET = 700`, `SID_TARGET = 500`).
- `tools/verify/verify_insights.mjs`: checks the tile's text, the missing and malformed cases, that the all-time count is loaded, and that the tile is rendered first. Two mutations were caught: changing the target to 600, and removing the tile from the page.
- Tested: `npx oxlint` exit 0; `npm run test:unit` 73 of 73; `npm test` exit 0; `npm run test:security` 22 of 22.
- Not checked: the tile on the live site while signed in as a moderator.

**Handbook updated:** 02.

**Status:** committed and pushed to `master`; CI deploys it.

---

## 2026-11-12 — Project target in the SID report

**Why:** The proposal to the Southern Africa-Indian Ocean Division measures success as 500 people who register and begin the study within 12 months. The report could not show that: it had no count of new accounts, its "started a sitting" figure mixed in guests, and its event figures count only readers who accepted analytics.

**What changed**

- New `tools/supabase-participation.sql`: `exhibit_participation(p_from, p_to)`, a moderator-only `security definer` function. It returns accounts created in the period and how many of them have at least one completed sitting saved. Moderator accounts are left out.
- `js/insights/insights.js`: `loadRange()` calls it with the report's period.
- `js/insights/sid-report.js`: a "Project target" block on the Summary page (accounts registered, registered and began, share of the 500 target), and a line on the "How these figures are counted" page. `PARTICIPATION_TARGET = 500`.
- `tools/verify/verify_sid_report.mjs`: checks the three figures, that counts under 5 are withheld, and that a missing or malformed result says the figures are not available. Two mutations were caught: removing the block, and changing the target to 600.
- Tested: `npx oxlint` exit 0; `npm run test:unit` 73 of 73; `npm test` exit 0 (the SID report still fits six A4 pages); `npm run test:security` 22 of 22.
- `tools/supabase-participation.sql` was run in the live SQL editor on 12 November 2026 ("Success. No rows returned"). A read-only check then showed: `security_definer` true, `anon` cannot execute, `authenticated` can, and a call from a non-moderator session returned error `42501`.
- Not checked: a real moderator building the report on the live site.

**Handbook updated:** 02, 04.

**Status:** committed and pushed to `master`; CI deploys it.

---

## 2026-11-12 — Keep the Supabase project awake

**Why:** Supabase pauses Free projects after 1 week of inactivity (`https://supabase.com/pricing`, read 12 November 2026). A pause takes sign-in and saving offline. Moving off Supabase is planned in `docs/MIGRATION-PLAN-CLOUDFLARE.md`, but that is large work; this stops the pausing now.

**What changed**

- `tools/smoke.mjs` now makes one real database read: `POST /rest/v1/rpc/exhibit_public_review_count` with the publishable key (the same public key as `functions/_middleware.js`). It passes only on `HTTP 200` with a number in the body. The smoke test runs every 15 minutes (`health.yml`) and after each deploy (`ci.yml`).
- New `docs/MIGRATION-PLAN-CLOUDFLARE.md`: a plan only, for moving off Supabase onto Cloudflare. Nothing in it was carried out.
- Tested: `node tools/smoke.mjs` against the live site, 22 of 22 passed, including "database answers a read (HTTP 200)". `npx oxlint` exit 0.
- Not checked: exactly which activity Supabase counts against pausing.

**Handbook updated:** 04, 07.

**Status:** committed and pushed to `master`.

---

## 2026-11-12 — Free full-database backups

**Why:** The project is on the Supabase Free plan, which has no automatic backups. The only backup tool copied `exhibit_progress`, one of the 18 tables, and the last copy in `backups/` was from 26 September 2026. Upgrading to Pro is not affordable right now.

**What changed**

- New `.github/workflows/db-backup.yml`: every Sunday at 03:00 UTC, or by hand, it runs `pg_dump` on the `public` schema and on the rows of `auth.users` and `auth.identities`. It encrypts the result with AES-256 and keeps it 90 days as an Actions artifact. A failed run opens a `ci-alert` issue. It needs two new repository secrets, `SUPABASE_DB_URL` and `BACKUP_PASSPHRASE`.
- New `tools/export-all-tables.sql`: a hand-run SQL editor export of every `public` table plus `auth.users` and `auth.identities`, as one JSON snapshot.
- Tested: the SQL on a local PGlite database, the encrypt and decrypt round trip with `gpg`, and the export function in the live SQL editor (20 tables, row counts only). Not checked: a real workflow run and `pg_dump` against the live database.

**Handbook updated:** 03, 04, 07.

**Status:** merged and pushed to `master`. The workflow is active but does nothing useful until the two secrets are added.

---

## 2026-11-12 — Known issues fixed

**Why:** The handbook's "Known issues" list held six problems confirmed from the state-machine review. Five were fixed; the sixth turned out to be correct behaviour and is now documented as such.

**What changed**

- Question dialog: the "still loading" screen now checks every half second and moves on to the questions by itself. Its text says so (`js/study/task-flow.js`).
- Message desk: action buttons check the lock key their action really uses (`retract:<id>`, `help:<id>`), so retract and clear buttons stay disabled while their request runs. A conversation that no longer exists says so, and a failed load offers a "Try again" button (`js/shared/desk.js`).
- Notes sync: a failing pull stops after 8 retries instead of retrying every minute forever. Reconnecting or signing in starts it again (`js/shared/study-sync.js`).
- Gallery tour: pressing `T` again or `Esc`, or picking any artifact, stops the guided tour. A tour step that arrives during a transition waits instead of being skipped (`js/gallery/app.js`).
- `Insights.readingTimer()` no longer returns a value that was always 0 (`js/shared/insights.js`).
- Not changed: the notes sync recording its last push time when a push starts. That timestamp only spaces attempts apart, so this is correct.
- New tests: 2 more in `tests/unit/state-fixes.test.mjs`; both fail on the previous code. `tools/verify/verify_map_help.mjs` now checks that pressing `T` again stops the tour and that picking an artifact stops it. It used to check for the old "ignore a second `T`" line.

**Handbook updated:** 01, 02, 05, 06, 07, CHANGELOG.

**Status:** shipped in the commit that adds this entry, pushed to `master` on 12 November 2026 for the CI deploy. The deploy result is in that commit's CI run.

---

## 2026-11-12 — Four state bugs from the state-machine review

**Why:** A read-only review (`docs/implicit-state-machines.md`) was checked against the code. Four of its findings were confirmed as real bugs; one of them was a gap in the morning's own-note fix.

**What changed**

- Message desk: each in-flight lock now carries an owner token. A late reply from before a refresh can no longer release a newer request's lock or re-enable its button (`js/shared/desk.js`).
- Focus weather: one band table (`WEATHER_BANDS`) now gives the weather type, the label and the highlighted step. Before, three different threshold sets could disagree, for example "Building" over a storm (`js/study/study-app.js`).
- Map playback: one `stopPlayback()` is used everywhere. Picking a year, a search result or another year's event, scrubbing, the arrows and the arrow keys now stop the chronicle, so it no longer jumps past the reader's choice (`js/map/map.js`).
- Readers' notes: when the 4 automatic re-checks of a reader's own note run out, the message now says to reload, instead of promising another try. Coming back online restarts the checks once, instead of running a second check alongside the timer (`js/shared/reviews.js`).
- New tests: `tests/unit/state-fixes.test.mjs` (3 tests; each fails on the previous code).

**Handbook updated:** 01 (known issues), 06 (map, UI rules), CHANGELOG.

**Status:** committed as `27d9499`, deployed through CI and smoke-tested on 12 November 2026.

---

## 2026-11-12 — Audit fixes and the engineering handbook

**Why:** The November audit listed 36 findings. 29 were real problems; the other 7 were not bugs or were deliberate designs. A developer handbook was also requested, to be kept current with every change.

**What changed**

- Survey and referral figures no longer treat a missing value as "Sitting 0" (`js/shared/insights.js`).
- Switching accounts on one device no longer loses unsaved notes and progress, and never sends them to the new account (`js/shared/study-sync.js`, `js/shared/progress-sync.js`, `privacy.html`).
- Late answer checks no longer affect a sitting the reader has left (`js/study/study-app.js`).
- The question dialog survives a fast close and reopen (`js/study/task-flow.js`).
- A map tap on another year's event now flies the camera, and flights finish only on their own end (`js/map/map.js`).
- The insights report shows only the newest build (`js/insights/insights.js`).
- The gallery releases material copies on every model swap (`js/gallery/app.js`).
- The progress export survives damaged saved values (`js/study/competency.js`).
- 17 edge-case fixes across reviews, insights, Sentry, the desk, net, the focus timer, passage counting, word cards, card buttons, diagram Replay, the home carousel, gallery backgrounds and double-tap.
- Dev tooling: `start_website.bat`, `server.py` (port handling, CORS) and `wrangler.toml` (output directory).
- New tests: `tests/unit/audit-fixes.test.mjs` (8 tests).
- New documents: the `docs/engineering/` handbook, and `docs/FIX-REPORT-2026-11-12.md` (the plain-English report).

**Handbook updated:** all chapters (first version).

**Status:** committed as `f9db265`, deployed through CI and smoke-tested on 12 November 2026.
