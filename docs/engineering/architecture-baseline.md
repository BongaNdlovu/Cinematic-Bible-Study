# Architecture baseline

**Last verified:** 16 November 2026

This is the "before" for the architecture improvement plan (Phase 0, step 0.6). Every later phase is compared against these figures. Re-run the command below and compare.

**How it was taken:** `node tools/measure_baseline.mjs`, from the repository root, on the working tree on 16 November 2026 (it includes uncommitted local edits). It covers tracked `.js` and `.css` files under `js/` and `css/`, and skips `vendor`, `models` and minified files. JavaScript is parsed with `acorn` (8.19.0). A "function" is any function declaration, function expression or arrow function, so the anonymous wrapper that holds a whole file shows up as one long function.

**Totals:** 65 JS files, 44770 JS lines; 20 CSS files, 21785 CSS lines; 3401 functions parsed.

**Largest files by lines**

| File | Lines | Bytes |
| --- | --- | --- |
| css/study-page.css | 8775 | 317389 |
| js/study/sheets-data.js | 6949 | 630940 |
| js/study/study-app.js | 6273 | 307038 |
| js/gallery/app.js | 4516 | 220856 |
| js/home/shelf.js | 2635 | 132407 |
| css/site.css | 2372 | 71142 |
| js/map/map.js | 1821 | 79888 |
| css/app.css | 1807 | 53152 |
| css/map.css | 1781 | 51711 |
| js/study/book-reader.js | 1559 | 48328 |
| js/study/mindmap.js | 1463 | 65605 |
| css/book-reader.css | 1224 | 29639 |
| js/shared/desk.js | 1167 | 37164 |
| js/insights/insights.js | 1157 | 50498 |
| js/study/workbench.js | 1134 | 73664 |

**Longest functions**

| File | Function | Line | Lines long |
| --- | --- | --- | --- |
| js/map/map.js | (anonymous) | 1 | 1821 |
| js/map/map.js | mount | 209 | 1610 |
| js/study/book-reader.js | (anonymous) | 1 | 1559 |
| js/study/mindmap.js | (anonymous) | 12 | 1452 |
| js/home/shelf.js | startRoom | 1249 | 1276 |
| js/study/mindmap.js | create | 245 | 1216 |
| js/shared/desk.js | (anonymous) | 1 | 1167 |
| js/insights/insights.js | (anonymous) | 1 | 1157 |
| js/study/workbench.js | (anonymous) | 6 | 1129 |
| js/shared/reviews.js | (anonymous) | 1 | 898 |
| js/map/globe.js | create | 197 | 840 |
| js/study/certificate.js | (anonymous) | 1 | 818 |
| js/shared/progress-sync.js | (anonymous) | 1 | 783 |
| js/shared/insights.js | (anonymous) | 1 | 768 |
| js/shared/account.js | (anonymous) | 1 | 767 |

**Function names defined in two or more files: ** (top 15 by number of files)

| Name | Files |
| --- | --- |
| boot | 6 |
| esc | 6 |
| mount | 6 |
| signedIn | 6 |
| build | 5 |
| close | 5 |
| onKey | 5 |
| refresh | 5 |
| render | 5 |
| authClient | 4 |
| currentUser | 4 |
| el | 4 |
| escapeHtml | 4 |
| frame | 4 |
| isLocalDevHost | 4 |

**Not measured:** the screenshot set (the before-and-after pictures the plan uses to prove a CSS or layout move changed nothing). `tools/verify/screenshot_study.mjs` is the existing script that takes study-page pictures; no set was captured.

**Checked against the plan:** `css/study-page.css` is 8,775 lines, `mount` in `js/map/map.js` is 1,610 lines, `startRoom` in `js/home/shelf.js` is 1,276, `create` in `js/study/mindmap.js` is 1,216, and `signedIn` is defined in 6 files. All match the plan.
