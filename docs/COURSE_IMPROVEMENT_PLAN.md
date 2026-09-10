# Scroll of Daniel — Course Improvement Plan
**From 6.9/10 solid → 9+/10 exceptional. Plan only — no implementation in this document.**

Date: 2026-09-10. Scope: the study course (`study.html` + instruments), the homepage promise (`index.html`), and supporting tooling. The 3D gallery and map are touched only where the course links into them.

---

## 1. Objective

The review's verdict: spark, structure, and theology are near-exceptional; the learning mechanics are not. The gap is **forced doing, transfer, a complete path, and evidence**. This plan closes all four while adding the depth you asked for (history of preterism/historicism, the 1844 story, and the contested-claims cases), on the current architecture: **pure static site, Python file server, no backend, all state in localStorage.**

Success means a learner who finishes the gate can, with the page closed: state the year-day rule from its two verses, name the head of gold from Daniel 2:38, run 457→483→A.D. 27 and 538→1798 by hand, explain why preterism and futurism exist and why the historicist chain holds, and locate today's headlines on the statue. And it means **you can see whether they did**.

## 2. Locked design decisions (your answers)

| Decision | Choice |
|---|---|
| Depth content | **Codex + new sheets** — expandable per-sheet Codex drawers **plus** two new dedicated sheets (History of Interpretation; Miller & 1844) and a capstone sitting |
| Contested claims | **Weigh-then-teach** — opposing readings at their strongest, then the historicist answer; checkpoints ask the learner to judge |
| Access gate | **Keep gate, complete course** — sheets 0–2 free, everything else behind the offer panel (checkout stays off; tester preview remains) |
| Assessment | **Hard gate** — one checked artifact per sheet + the two MCQs; a synthesis capstone gates "you finished" |

## 3. Current state — where the levers actually are

Verified in code:

- **11 sheets** live in `const sheetsData` (study.html:1919), each with `content`, 2 MCQs, full `studyGuide` (trace/christ/now/help/value/ask), and guide intro/end cards.
- **The gate is only MCQs**: `sheetQuizComplete()` (study.html:5100) → `canAdvancePath()` (study.html:5106) → `updateNextGate()` (study.html:5113). `completeAndAdvance()` (study.html:5218) also persists `daniel_historicist_mastery` and triggers the access panel after sheet 2 (study.html:5231).
- **"How to study" is display-only**: `renderStudyGuide()` (study.html:4826) renders `studyGuide.trace` as text. Notes are saved to `baNote-<sheetId>` (study.html:5081) but never checked.
- **Access gate**: `FREE_THROUGH = 2` (`js/shared/journey.js`:40), `canAccessSheet()` (`js/shared/journey.js`:133), panel DOM study.html:1386–1396 with checkout disabled ("Payments are not live yet"), tester preview via `enableTesterPreview()` (study.html:5010) and `?preview=full` (study.html:5337). Offer copy also on index.html:158–168.
- **Instruments already instrumented**: Scripture dock (`js/study/scripture.js`, KJV + Strong's + `bible/sheet-passages.json`), map (10 epochs / 11 cities / 10 events / 6 routes in `js/map/map-data.js`), 3D gallery (23 artifacts in `js/gallery/app.js`), horizon timeline, glossary panel — all embedded in study.html.
- **Chrome**: pomodoro dock + weather presets + WeatherAudio + flashlight cursor + zen mode + 3 themes, all default-on surfaces in study.html.
- **Legacy study desk**: `study-data.js` + `study.js` + `study.css` were an unused 8-section desk and have been deleted.
- **11 localStorage keys** already exist (journey, mastery, theme, font, notes, bookmarks, scripture story mode, map basemap/key).
- **server.py** is static-only. No contact channel, no metrics, no email anywhere.

---

## 4. The new course shape

**16 sittings in 4 acts** (13 numbered sheets + capstone; sheet indices below are the new order):

| Act | # | Sitting | Status |
|---|---|---|---|
| I — The Method | 0 | Prologue: the Historicist Blueprint | exists; add Codex + artifact + weigh blocks |
| I | 1 | **NEW — The Wars over Daniel: How the Churches Left the Chain** (history of preterism/futurism/historicism) | new sheet |
| I | 2 | Daniel 1 — The Exilic Crucible | exists |
| I | 3 | Daniel 2 — The Colossus | exists (the statue; **last free sheet**) |
| II — The Court | 4 | Daniel 3 — Dura | exists |
| II | 5 | Daniel 4 — The Stump | exists |
| II | 6 | Daniel 5 — The Handwriting | exists |
| II | 7 | Daniel 6 — The Lions' Den | exists |
| III — The Visions | 8 | Daniel 7 — Four Beasts & Little Horn | exists |
| III | 9 | Daniel 8 — Ram, Goat & the Sanctuary | exists |
| III | 10 | Daniel 9 — The Seventy Weeks | exists |
| III | 11 | **NEW — The Midnight Cry: Miller, 1844, and the Disappointment** | new sheet |
| III | 12 | Daniel 10–12 — Michael Stands Up | exists |
| IV — The Chain | 13 | **NEW — Capstone: Build the Chain** | new sitting |

**Free-sample boundary.** Free = indices 0–3 (method → Wars-over-Daniel → Daniel 1 → Daniel 2 statue). This preserves today's semantic promise ("method, table, statue" free) after inserting sheet 1 — set `FREE_THROUGH = 3` in `js/shared/journey.js`:40 and update the offer copy ("the first act is free; the court, visions, and capstone unlock as one connected curriculum").

---

## 5. Phase 0 — Assessment & evidence engine (build first; everything else plugs in)

### 5.1 New module: `assessment.js`
Five checked artifact types, all client-side, all fail-open-with-help (never a dead end):

1. **`typed-line`** — a sentence the learner writes, validated against accepted model patterns (synonym/regex sets, e.g. the year-day line must express day→year). After 2 failed attempts: show a hint; after 3: reveal a model answer, mark the artifact "assisted," and allow Continue. Attempts and reveals are logged, never hidden.
2. **`calculation`** — the learner performs the arithmetic in input fields (457 + 483 → A.D. 27; 538 → +1260 → 1798; 2300 − 490 = 1810 → 1844). Integer/date checking with the no-year-zero convention explained inline.
3. **`ordering`** — click-to-order tiles (metals to kingdoms; the three uprooted horns with dates; the three schools onto their timelines).
4. **`verse-lookup`** — verified interaction with the Scripture dock: the sheet's load-bearing verses must actually be opened (hook the existing dock events in `js/study/scripture.js`), plus one one-line typed observation.
5. **`chain`** (capstone/timeline) — multi-tile assembly + free text, ≥40 words for the chain, ≥25 for the headline task.

### 5.2 Evidence store: `daniel_historicist_evidence` (new localStorage key)
Per sheet, one object: active seconds (heartbeat-paused when hidden), scripture refs opened, study-guide expand count, artifact attempts/reveals/assisted flags, quiz first-try correctness per item, notes word count, capstone status. Written on every `completeAndAdvance()`.

### 5.3 Gate rewiring (small, surgical)
- `canAdvancePath()` → `sheetProofComplete()` = artifact(s) done AND quizzes done.
- `updateNextGate()` tooltip names the missing piece ("Write your line to continue", "Show the arithmetic to continue").
- `completeAndAdvance()` unchanged except it also writes the evidence record.
- MCQs become **confirmation**; artifacts are **the gate**. Mastery % in the TOC becomes proof-based (proof + first-try quiz, not click-through).

### 5.4 File architecture (do before content lands)
`study.html` still holds the sheets inline. Extract once, before adding 5 sheets of content: `js/study/sheets-data.js` (all sheet objects), `assessment.js`, `evidence.js`. study.html remains the shell. Legacy `study-data.js` / `study.js` / `study.css` are already retired.

## 6. Phase 1 — Hard-gate rollout: proof of work per sheet

### 6.1 Artifact assignments (every sheet)

| Sheet | Artifact(s) | Type |
|---|---|---|
| 0 Prologue | Open Numbers 14:34 + Ezekiel 4:6 in the dock; write the year-day rule in your own words | verse-lookup + typed-line |
| 1 Wars over Daniel | Order the three schools onto their timelines (Alcázar 1614, Ribera 1590, the Reformers); write which school you were using before, and why it changed or held | ordering + typed-line |
| 2 Daniel 1 | "Daniel's line was ______, not ______." Open Daniel 1:8 | typed-line + verse-lookup |
| 3 Daniel 2 | Order gold→feet to kingdoms; "Name the head of gold, with the verse"; open Daniel 2:37–38 | ordering + typed-line + verse-lookup |
| 4 Daniel 3 | One sentence: what changed between the king's confession (2:47) and "who is that god?" (3:15) | typed-line |
| 5 Daniel 4 | One-sentence lesson of the stump; open 4:34–37 | typed-line + verse-lookup |
| 6 Daniel 5 | Match MENE / TEKEL / PERES to their glosses; open 5:26–28 | ordering + verse-lookup |
| 7 Daniel 6 | "What did Daniel change when the law changed?" | typed-line |
| 8 Daniel 7 | Order the three uprooted horns with dates; calculate 538 → 1798; open 7:25 | ordering + calculation + verse-lookup |
| 9 Daniel 8 | Open 8:14; write what *tamid* names; MCQ becomes the Antiochus weigh-item | verse-lookup + typed-line |
| 10 Daniel 9 | **The worksheet**: 457+483 → A.D. 27; midst of week → 31; 70×7 → 34; 2300−490 = 1810 → 1844; open 9:24–27 | calculation + verse-lookup |
| 11 Miller & 1844 | Run 457 → 1844 the way Miller did; one sentence on what the Disappointment did *not* disprove | calculation + typed-line |
| 12 Daniel 10–12 | Write the chain in three lines: 2:38 → 9:26 → 8:14 | chain (short) |
| 13 Capstone | See 6.3 | chain |

### 6.2 MCQ redesign — test application, not the page's own conclusion
Keep ≤1 recognition item per sheet; make ≥1 item an application/diagnosis item. Examples replacing today's items:

- Sheet 0: "A teacher says the 2,300 'days' are 2,300 morning-evenings — about six years, ending with Antiochus. Which passage do you open first, and what does it decide?" (options force the reasoning, not recall of a sentence the page just said).
- Sheet 3 (statue): "Someone says your century is a new head of gold. What verse do you use, and why?" (the review's suggested item).
- Wrong answers become **diagnostic**: map each distractor to the misconception it reveals and give one targeted sentence ("This is the futurist gap — here's why the week belongs to Messiah"), replacing today's same-paragraph historicist explanation (study.html:5207–5211).

### 6.3 Capstone (sheet 13) — the synthesis the course currently lacks
One sitting with three forced moves, reusing existing instruments:
1. **Assemble the dated chain** on a timeline (605, 539, 457, A.D. 27/31/34, 538, 1798, 1844, "Michael stands up") — tiles + ordering UI on the horizon rail.
2. **Write the chain**: "Daniel 2:38 → 9:24–27 → 8:14" in your own words (≥40 words, saved, counted, shown back).
3. **Put a headline on the statue**: type one current event and one sentence locating it on the statue (iron-clay feet, not a new metal).
Completion flips status from "cleared" to **"Finished — can explain the method when the page is closed"**, produces an exportable receipt (5.4), and is the only thing that completes the course. Sheet 12's end-guide spotlights it.

### 6.4 Spaced review (cheap, deterministic)
Add a shared `REVIEW_BANK`; each sheet from index 2 on draws one earlier-sheet item (e.g., sheet 10 pulls a year-day item from sheet 0). Rotates deterministically; logged first-try.

## 7. Phase 2 — Content depth (the biggest writing effort)

### 7.1 New sheet 1 — "The Wars over Daniel"
The history-of-interpretation sheet you asked for. Sections:
- **Historicism's pedigree**: early church readings (Irenaeus, Hippolytus), Joachim of Fiore and the year-day instinct, Wycliffe, Luther's preface to Daniel, Calvin, Wesley, Newton on the 1,260; the pre-1798 dare ("if this power is the little horn, its 1,260 years must end") and the post-1798 vindication.
- **Preterism at its strongest**: Luis de Alcázar (1614) in its Jesuit/Counter-Reformation context; the modern preterist case stated fairly (Antiochus *does* fit parts of Daniel 8–11; Matthew 24's "this generation"); where it breaks the chain (2:38–44 as one succession).
- **Futurism at its strongest**: Francisco Ribera (1590), Lacunza via Edward Irving, Darby's dispensationalism, the Scofield Reference Bible (1909), popular diffusion; its genuine appeal (plain-sense future Antichrist; a literal 70th week).
- **Why it matters**: same symbols, three timelines; only one keeps Daniel 2:38–44 a chain. The learner weighs before the answer lands.
Artifact + MCQ per 6.1/6.2; Codex: primary-source excerpts (Alcázar, Ribera, Miller's rules, Scofield notes) with citations.

### 7.2 Weigh-then-teach blocks in existing sheets
Format everywhere: **The Case / The Objection / The Answer** (one tight paragraph each):
- Sheet 3: iron = Rome (case: crushing + division; objection: Greek continuity claims; answer: Dan 2:40 + Dan 7 parallelism).
- Sheet 9/10: **457 vs 458 B.C.** for Ezra 7 (accession-year question; answer: Ezra 7:7–9 seventh year, decree scope in 7:11–26, "street and wall" in Dan 9:25).
- Sheet 9: **the Antiochus view of Daniel 8** stated at full strength (small start, takes away the daily, 2,300 evening-mornings ≈ 1,150 days) then the answer (exceedingly great; time of the end; year-day established in-book).
- Sheet 8: **538 / 1798** derivation shown honestly (Justinian's mandate 533; Ostrogoths' removal 538; Berthier 1798) with objections and the year-day necessity stated.
- Sheet 10: 1844 rejections answered from the internal chain, plus a pointer to sheet 11's honest telling of the Disappointment.
- Sheet 0: reframe "Counter-Reformation invention" phrasing to weigh-then-teach (historical fact stated, but the schools get their best case before the verdict).

### 7.3 New sheet 11 — "The Midnight Cry"
William Miller's rules (a historicist's rules), the 457→1843/44 arithmetic, the March→October 1844 Karaite-calendar correction, the Great Disappointment as lived experience, and the sanctuary reading that emerged from it. This converts "1844 taught as fact" into **a case the learner watches being made and corrected** — the single most credibility-building story the tradition owns. Artifact: run the arithmetic yourself (6.1).

### 7.4 Codex drawers (per sheet, expandable, `codex: [{title, html, source}]`)
- 0: Reformers' own words (Luther's preface; Newton on the 1,260); the four-school glossary (incl. idealism, historicist premillennialism).
- 2: Babylonian renaming practice (Akkadian name meanings); *zeroim* and Genesis 1:29.
- 3: Metallurgy of the statue (value falls, hardness rises); Neo-Babylonian chronology 605–539.
- 4: Dura archaeology; the instrument list of 3:5.
- 5: The "seven times" and the Nabonidus vs Nebuchadnezzar madness question — stated honestly.
- 6: **Belshazzar in the Nabonidus cylinder** — the 19th-century find that answered the critics; the wall-word wordplay.
- 7: **Darius the Mede — the strongest solutions** (Gubaru/Ugbaru; Cyrus as co-regent) stated fairly.
- 8: The four beasts in historiography; who the Heruli, Vandals, and Ostrogoths were; the 1,260 across Revelation (42 months; time, times, half).
- 9: *Tamid* — "the continual"; the 2,300 evening-morning unit question; *nitsdaq* via the Strong's chain.
- 10: *Chathak* (only occurrence); Cyrus/Darius/Artaxerxes decrees compared; the Karaite calendar question (cross-link sheet 11).
- 12: Kings of north and south outline; Michael in Daniel, Jude, Revelation.
Every entry ends with "Why this matters for the chain" + citation.

### 7.5 Glossary & first-use support
Auto-glossary: wrap first-use technical terms (`chathak`, `nitsdaq`, `tamid`, `zeroim`, Historicism, Preterism, Futurism, hermeneutics, year-day) in `<dfn>` spans with tooltips; the existing glossary panel auto-populates from the same data. Extend `bible/sheet-passages.json` so every "load-bearing lines" reference is one click in the dock.

**Content rule (non-negotiable): no fabricated quotations.** Every historical quote (Luther, Newton, Miller, Scofield, Alcázar, Ribera, EGW) is verified against a citable primary/secondary source during writing; anything unverifiable is cut or paraphrased-with-attribution.

## 8. Phase 3 — Onboarding, personalization, help

1. **Homepage promise rewrite** (index.html): lead with competency, keep atmosphere second: "In three free sittings you will be able to: state the year-day rule from two verses; name the head of gold from Daniel 2:38; show on paper why the four kingdoms stay a chain." Update the offer card to the new 4-act shape.
2. **Two-minute placement** (first visit only): three questions — read Daniel 2 before? already use year-day? new or returning? Routes: beginner → sheet 0; returning → resume; "already historicist" → audit sheet 0 or jump to 1. Stored in `baJourney.placement`. Plus a "Glossary-first" toggle for new readers.
3. **TOC "you are here" states the skill**, not just the chapter: each row gains a skill line ("Can state the year-day rule") and a proof status (done / in progress / locked) from the evidence store.
4. **Help when stuck**: per-distractor diagnosis (6.2); a "Common confusions" block per sheet (3–4 misconceptions, one paragraph each); artifact worked examples reveal on second failure; a contact channel — static mailto link + (placeholder) feedback form, decided at build time.
5. **Accessibility pass**: alt text on every image; flashlight beam **off by default** (opt-in in Desk); full `prefers-reduced-motion` honoring (weather canvas off); AA contrast in paper/white themes; keyboard-only path through artifacts; sheet 0's first screen shortened with an act-break.

## 9. Phase 4 — Chrome reduction

1. **One "Desk" control** collapses pomodoro, weather presets, WeatherAudio, flashlight, zen, themes. First-sitting default shows only: Scripture, How to study, Map, 3D.
2. Pomodoro reframed as "sitting timer": defaults to the sheet's `allocatedMinutes`, suggests a break at sheet end; the pioneer micro-note folds into the guide or is cut.
3. Flashlight cursor off by default (also 8.5).

## 10. Phase 5 — Evidence & iteration loop

1. **Receipts panel** (learner-facing): time on sheets, artifacts in their own words, first-try quiz rate, scripture opens, capstone status; **export/import JSON** so progress moves between devices and a learner can send you their receipts. No server needed; nothing leaves the device unexported.
2. **Your QA harness** (extend `tools/`): `verify_assessment.mjs` (Puppeteer: completes sheet 0's artifact + MCQs, asserts the gate opens only then; runs the capstone; checks review-bank draws), `verify_codex.mjs`, `verify_placement.mjs`, `verify_receipts.mjs`; per-sheet screenshot proofs like the existing `*_proof.png` set.
3. **Iteration ritual**: monthly, read a handful of exported receipts (time on How-to-study, scripture opens, first-try rate) and make exactly one content change. This is the loop the review found missing.
4. Explicitly out-of-scope unless you later ask: server.py POST endpoints for anonymous metrics, accounts, or email.

## 11. Phase 6 — Hygiene, docs, verification

1. Legacy study desk files (`study-data.js`, `study.js`, `study.css`) are already retired; update `LEGACY_ID_MAP` (study.html:5292) and gallery cross-links to the new sheet numbering.
2. README rewrite: site map, the 4-act course, assessment behavior, receipts/export, updated controls.
3. **Content QA checklist** (run before shipping): every date cross-checked (605, 539, 457, 27, 31, 34, 538, 1798, 1844; 2,300/490/1,810; 1,260); every Strong's ref verified against `bible/strongs-daniel.json`; every quotation source-verified; weigh-blocks present on all five contested claims; alts present (scripted check); keyboard path tested.
4. Verification scripts + screenshot proofs for each new sheet, like the existing `tools/verify/verify_*.mjs` pattern.

## 12. Sequencing & effort

| Order | Phase | Why this order | Rough effort |
|---|---|---|---|
| 1 | Phase 0 — engine + file extraction | Everything plugs into it; do before writing content | 1–2 sessions |
| 2 | Phase 1 — hard gate + artifact specs + MCQ redesign on the existing 11 | Highest learning-gain-per-hour in the review | 2–3 sessions |
| 3 | Phase 2 — new sheets 1 & 11, capstone content, Codex drawers, weigh blocks | Largest writing effort; gate already exists to enforce it | 3–5 sessions |
| 4 | Phase 3 — homepage, placement, TOC skills, help, accessibility | Needs new sheet numbering final | 1–2 sessions |
| 5 | Phase 4 — Desk consolidation | Quick after structure settles | 0.5–1 session |
| 6 | Phase 5 — receipts + verify tooling | Meaningful only once real artifacts flow | 1 session |
| 7 | Phase 6 — hygiene, README, content QA | Last pass | 0.5–1 session |

Total ≈ 10–15 focused sessions. Phases 3–5 partially parallelizable after Phase 2.

## 13. Acceptance criteria (done = all true)

- The gate cannot be passed by answering MCQs alone — on any sheet (testable via `verify_assessment.mjs`).
- Every sheet has ≥1 checked artifact; sheet 10's worksheet and the capstone are the flagship.
- "Finished" is only reachable through the capstone; mastery % reflects proof + first-try recall, not clicks.
- All five contested claims carry Case / Objection / Answer; sheets 1 and 11 exist with cited sources; no unverifiable quotes.
- A learner can export (and re-import) a receipts file; you can read it and name one change it suggests.
- Free sample = method → Wars-over-Daniel → Daniel 1 → statue, still ending at the offer panel; offer copy matches the 4-act reality.
- No image without alt; beam off by default; reduced-motion fully honored; keyboard-only completion of any artifact works.
- The review's pillar scores are addressed: Practice 5.2→hard gate; Mastery 4.4→capstone+chain; Scaffolding 4.1→placement+codex; Evidence 2.0→receipts; Signal-to-noise 6.4→Desk.

## 14. Left open (deliberately)

- Contact channel: plain `mailto:` vs a hosted form (needs a provider) — placeholder decided at build time.
- Whether "The Wars over Daniel" ships as one sheet or splits into two (Reformers / Counter-Reformation) if it runs long.
- Certificate wording on the capstone receipt.
