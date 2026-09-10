# PROMPT — Codebase Organization & Complexity Ceiling

Copy everything below this line into the agent/developer work order.

---

## Mission

Reorganize this repository so that a new developer can answer "where does X live?" in under a minute, and give the codebase its first automated cyclomatic-complexity ceiling. This is a structural refactor: **no behavior changes, no content changes, no URL changes.** Course-content work is governed separately by `COURSE_IMPROVEMENT_PLAN.md` — this refactor is its prerequisite.

## Hard constraints (do not break any of these)

1. **URL contract.** `index.html`, `study.html`, `gallery.html`, `map.html` stay at the repo root. All existing deep links must keep working: `study.html?sheet=N` / `?id=…`, `gallery.html?id=…`, `map.html?year=…&event=…`, `?preview=full`.
2. **No logic changes in the move PR.** Moving files, fixing paths, and extracting inline scripts are mechanical. If you find yourself editing a function body, stop — that belongs in a later PR.
3. **localStorage schema is frozen.** Keys `baJourney`, `daniel_historicist_sheet`, `daniel_historicist_mastery`, `daniel_theme_v1`, `daniel_font_size_idx_v4`, `baNote-*`, `baStudyBookmarks`, `scroll_section`, `baScriptureStory`, `baGoogleMapsKey`, `baMapBasemap` keep their names and shapes.
4. **Offline runtime preserved.** `python server.py` (or `start_website.bat`) remains the only way to run. No build step, no bundler, no Node-at-runtime. `vendor/three/` stays committed and the import maps in `study.html`/`gallery.html` must resolve after any move.
5. **server.py allowlist.** Site-served files use allowlisted extensions (`.js`, `.css`, `.json`, `.glb`, images). New folders must only contain allowlisted types, or the page breaks silently. `docs/` and `qa/` are not served — that is fine and intentional.

## Verified current state (start from this, re-verify before acting)

- **Root is a dumping ground.** Besides the 4 pages, server, configs, and real source files, the root holds ~30 untracked PNG proofs (`gallery_*.png`, `map_proof_*.png`, `study_proof_*.png`, `theme_proof_*.png`, `horizon_proof_*.png`, `index_*.png`) and 5 compression-report JSONs. None are committed; all are regenerable via `tools/screenshot_*.mjs`.
- **No source tree.** All JS/CSS sits at root: `app.js` (3,712 lines — gallery engine + inline artifact database), `map.js` (932), `journey.js`, `study-stage.js`, `study-data.js`, `study.js`, plus `site.css`, `app.css`, `map.css`, `study.css`.
- **study.html is 5,457 lines / 347 KB**, containing the entire 11-sheet curriculum (`sheetsData`), the gate/quiz logic, pomodoro, weather engine, audio, and chrome as inline `<script>` blocks.
- **Legacy dead code.** `study-data.js` + `study.js` + `study.css` are an older 8-section study desk; `study.html` no longer links `study.css`, and `study.js`/`study-data.js` are not loaded by any page (verify with grep before removing).
- **No lint, no CI.** No `.github/`. Remote exists (`github.com/BongaNdlovu/Cinematic-Bible-Study`). `package.json` has only `three` as a dependency plus compress/screenshot scripts.
- **Complexity audit (oxlint 1.82, complexity rule, all root `.js` + `tools/*.mjs`, 282 functions):** max is `selectAsset` in `app.js` at **53**, then `run` in `tools/verify_all.mjs` at **45**, then 23 (`app.js`), 19 (`app.js` `animate`), 17 (`map.js` `start`, `drawOverlays`). The inline `study.html` script is not yet lintable — it is the known elephant and must be re-audited after extraction.

## Target layout

```
/                       index.html  gallery.html  study.html  map.html
                        server.py  start_website.bat  package.json
                        README.md  .gitignore
/css/                   site.css  app.css  map.css
/js/
  shared/               journey.js
  gallery/              app.js
  map/                  map.js  map-data.js
  study/                stage.js (was study-stage.js)  scripture.js (was bible/scripture.js)
                        study-app.js (extracted inline script, same load order)
                        sheets-data.js (extracted sheetsData + EPOCHS literals)
/bible/                 kjv.json  strongs-daniel.json  sheet-passages.json   (data corpus — unchanged)
/assets/  /models/  /vendor/                                             (unchanged)
/docs/                  README-linked: PROJECT_AUDIT_REPORT.md  COURSE_IMPROVEMENT_PLAN.md
/qa/                    proofs/  reports/        (gitignored — regenerable artifacts)
/tools/
  compress/             compress_*.mjs
  verify/               verify_*.mjs  screenshot_*.mjs
  audit/                audit_map_art.py  inspect_*.py
/legacy/                study.js  study-data.js  study.css   (or delete if grep proves zero references — preferred)
```

## Workstream A — Mechanical reorganization (PR 1: move-only)

1. Create the tree above; `git mv` every tracked file. Root JS/CSS into `css/` and `js/<page>/`; reports and proofs into `qa/` and add `qa/` to `.gitignore`; audit/plan docs into `docs/`.
2. Update every reference, and grep to prove none remain:
   - `<script src>` / `<link href>` in all four HTML files, including the import maps for `vendor/three` and `study-stage.js`.
   - Runtime `fetch()` paths (`bible/*.json` fetches in `scripture.js`; `assets/maps/chronicle-polities.json` in `map.js`).
   - Relative paths between tools and pages in `tools/*.mjs` (`file://`/`http://127.0.0.1:8000` targets), and the `npm run` script paths in `package.json`.
   - Cross-page hrefs in JS (`journey.js` `resumeHref`, gallery/map/study cross-links, `LEGACY_ID_MAP` targets).
3. Delete `study.js`, `study-data.js`, `study.css` only after `grep -rn "study-data\|study\.js\|study\.css" --include="*.html" --include="*.js"` shows zero live references; otherwise archive under `/legacy/` with a README line explaining what they were.
4. Update `README.md` (site map + layout table) and add `docs/ARCHITECTURE.md`: one page — page-to-JS mapping, data flow (`journey.js` → localStorage), how instruments connect, where new content goes.

## Workstream B — Inline-script extraction (PR 2: still no logic changes)

1. Extract each inline `<script>` block in `study.html` into `js/study/` files, **preserving execution order** as one `<script>` per former block (or one module fed the same globals). `sheetsData` + `EPOCHS` data literals go to `js/study/sheets-data.js` (plain script defining globals, loaded before the app script — this is the seam `COURSE_IMPROVEMENT_PLAN.md` Phase 0 builds on).
2. `journey.js` must load before any consumer; verify the existing `DOMContentLoaded` init still runs after DOM construction (external classic scripts at the same body position preserve this).
3. This is the riskiest PR. It must be verified by the full `tools/verify/` suite plus manual click-through before it can merge.

## Workstream C — Complexity ceiling (PR 3: stacked on PR 2)

1. Add `oxlint` as a devDependency; enable the ESLint-compatible `complexity` rule globally in `.oxlintrc.json`.
2. **Audit, then set.** After PR 2 lands, re-run the complexity audit including the extracted `js/study/` files. Set the initial maximum to **highest score + 2**, and record the top-5 table (score, function, file:line) in the PR description. Pre-extraction baseline for reference: 53 (`selectAsset`, app.js), 45 (`run`, verify_all.mjs). If nothing extracted exceeds 53, the ceiling is **55**.
3. Add `"lint": "oxlint"` to `package.json`.
4. Enforce: add `.github/workflows/lint.yml` running `npm run lint` on push/PR (first CI in this repo), and document `npm run lint` as a pre-commit expectation in the README. There is no existing CI step to piggyback on — this creates it.
5. **No grandfathering, no suppressions.** No `eslint-disable`/`oxlint-disable` for `complexity` anywhere. The ceiling is an initial regression ceiling, not the long-term target — it gets ratcheted down as hotspots (`selectAsset`, `run`) are split into focused handlers in later PRs.
6. Re-audit after extraction: if the extracted study-app code measures higher than 53, the ceiling moves to that max + 2 and the ratchet list is updated — never the reverse.

## Verification (gate for every PR)

1. `python server.py --no-browser` + `curl` smoke test on all four pages (200s, no missing-asset 404s in the server log).
2. `npm run verify` — keep `tools/verify/*.mjs` green (they cover map, scripture, theme, horizon, medals, hall mural).
3. Manual click-through: cover → study (sheet load, quiz gate, access panel, tester preview `?preview=full`) → map (epoch fly, `?year=` deep link) → gallery (`?id=` deep link, orbit) — on charcoal, paper, and white themes.
4. Regenerate one screenshot proof via the moved `tools/verify/` scripts to prove the tooling paths work.
5. `git grep` for every moved filename must return zero stale references.

## PR strategy

Stacked, in order: **PR 1** file moves + reference fixes + docs (diff should be moves and path strings only). **PR 2** inline-script extraction (mechanical, verify-suite gated). **PR 3** oxlint config + lint script + CI + the complexity ceiling (diff: config, one npm script, one workflow). Each PR's description states which constraint set it preserves.

## Acceptance criteria

- [ ] Root contains only: 4 HTML pages, server.py, start_website.bat, package.json, README.md, dotfiles.
- [ ] A newcomer can open `docs/ARCHITECTURE.md` and locate any behavior (gate logic, weather engine, map data, artifact DB) by file path in under a minute.
- [ ] All deep links and localStorage keys work; `?preview=full` still unlocks.
- [ ] `npm run lint` fails any function above the ceiling; CI runs it on every push.
- [ ] Complexity ceiling documented with the top-5 table; zero suppressions in the codebase.
- [ ] verify suite green; no stale path references (`git grep` clean).

## Out of scope

Course content, assessment artifacts, Codex drawers, gate redesign (`COURSE_IMPROVEMENT_PLAN.md` Phases 0–6), model re-compression, backend/server endpoints, renaming localStorage keys.
