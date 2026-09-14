# Reviewer brief: SDA/BRI sentence-by-sentence review of the eleven sittings

You are an editor (or an agent acting as one) auditing a prophecy study course. Your job is to walk
**all eleven sittings sentence by sentence** — article, first-principles boxes, Christology panels,
quizzes, homework, verify cards, workbenches, glossary lines — and prove every load-bearing claim from
two layers: **Scripture** and **official SDA/BRI literature**. A sentence may not stand on tone alone.

This file is an internal working document in `tools/` (excluded from the public deploy). It is a prompt
you paste and follow. It does not authorize rewriting the lessons: you produce a report; fixes are
applied in a separate step, if the owner asks for one.

Work **one sitting per pass** unless the user explicitly asks for all 11 in one run. All 11 must be
covered before the review may be called complete. Track coverage yourself:

```
[ ] 0  [ ] 1  [ ] 2  [ ] 3  [ ] 4  [ ] 5  [ ] 6  [ ] 7  [ ] 8  [ ] 9  [ ] 10
```

## The eleven sittings

| # | Short name | Title in `sheets-data.js` | Scripture span |
|---|------------|---------------------------|----------------|
| 0 | Hermeneutics / year-day | The Battle of Hermeneutics: The Historicist Blueprint | (prologue — method, not a chapter) |
| 1 | Exile, names, food | The Exilic Crucible: Identity, Food, & Consecration | Daniel 1:1–21 |
| 2 | Colossus | The Metallic Colossus: The Historicist Sequence of Empires | Daniel 2:1–49 |
| 3 | Dura | The Plain of Dura: Forced Worship & The "But If Not" Faith | Daniel 3:1–30 |
| 4 | Pride / stump | The Emperor in the Dust: Pride & Divine Sanity | Daniel 4:1–37 |
| 5 | Handwriting / 539 | The Handwriting on the Plaster: The Fall of Babylon | Daniel 5:1–31 |
| 6 | Den / Medo-Persian law | The Pit of Hunger: The Law of the Medes and Persians | Daniel 6:1–28 |
| 7 | Beasts / little horn / 1260 | The Churning Sea & The Little Horn: The 1,260 Years to Judgment | Daniel 7:1–28 |
| 8 | Ram, goat, 2300 / 1844 | The Ram, The Goat, & 2,300 Days: The Cleansing of the Sanctuary | Daniel 8:1–27 |
| 9 | Seventy weeks / A.D. 31 | The 70 Weeks (Chathak) & The Cross: The Mathematical Anchor of 1844 | Daniel 9:1–27 |
| 10 | Michael / resurrection | Michael Stands Up: The Time of Trouble & Bodily Resurrection | Daniel 10:1 – 12:13 |

## What you must open for each sitting

The text of record is the live data, not your memory of it. For sitting `N`:

1. [`js/study/sheets-data.js`](../js/study/sheets-data.js) — find the object with `id: N` in the
   `sheetsData` array, then work through every field:
   - `content` — the article HTML. Every `<p>` **and every `<div class="first-principles">` box**
     (each has a `first-principles-kicker`; use it as the box's name in your report).
   - `christology` — the Christology panel: `scripture` list and `body` paragraphs.
   - `quizzes` — each question, every option, the `explanation`, and every `diagnostics` line.
   - `studyGuide` — the homework. The `trace` steps (`do` **and** `why`), the `christ` / `now` /
     `help` / `value` cards (`claim` and `why`), and the `ask` questions.
   - `guide.intro.do` — the intro checklist items shown before the article.
   - `path` — if a sitting ever carries one, review it the same way.
2. [`js/study/sheet-verify.js`](../js/study/sheet-verify.js) — `window.SHEET_VERIFY[N]`. Each item has
   a `lesson` (the claim line), a `kind` (`scripture` or `commentary`), a `source`, a `quote`, a
   `check`, and sometimes an `href`.
   Verify the quotes against the cited source (follow the `href` when there is one). A verify card is
   itself a claim: if its quotation is wrong or its `check` overstates, that is a finding.
3. [`js/study/workbench.js`](../js/study/workbench.js) — **only sittings 0, 1, and 2 have workbenches**
   (`renderSheet0Workbench` … `renderSheet2Workbench`). The matching tasks (schools matrix, name grid,
   civic/defilement sorts) embed claims in their statements and their "correct" answers.
4. [`js/study/sheet-glossary.js`](../js/study/sheet-glossary.js) — the entries whose term or alias is
   actually used in that sitting's article (the article auto-links them). Both the `simple` and the
   `history` prose of each used entry are in scope.

To see a sitting rendered, open `study.html?sheet=N` locally — but the files above are the text of
record.

## The control corpus — what "proof" means

Every load-bearing sentence needs **two layers**. Both, on the same row of your report. Tone, consensus,
and vibe are not sources.

### Layer 1 — Scripture

- The **66-book Protestant canon only**. Quote the verse that actually carries the claim, not a
  neighboring verse that is near the topic.
- **1 Maccabees and the deuterocanon are not Bible for this review.** They may appear only as history,
  labeled as history.
- Extra-biblical history is welcome but must be **labeled as history and carry a specific source**:
  e.g. BM 21946, Josephus, Carchemish, Berthier and 1798, the 1844 newspapers. "History says" is not a
  source; a work, a section, or a URL is.

### Layer 2 — Official SDA / BRI literature

Find the published Adventist line that agrees, qualifies, or contradicts the sentence. Preferred
control set, in order of authority:

1. **Biblical Research Institute papers and BRI books** on Daniel, the sanctuary, year-day, the little
   horn, 1260, 2300, and 1844 — [adventistbiblicalresearch.org](https://www.adventistbiblicalresearch.org).
2. **Daniel and Revelation Committee Series (DARCOM)**, vol. 1–7.
3. *Seventh-day Adventist Bible Commentary* on Daniel.
4. **Fundamental Belief 24** (Christ's ministry in the heavenly sanctuary) and related GC statements.
5. Named BRI-adjacent scholars **when they are the actual published line** — e.g. Shea, Hasel,
   Doukhan, Pfandl, Rodríguez, Holbrook. Cite the work, not the name alone.
6. **Ellen White only as SDA literature, never as a replacement for the biblical verse.** Cite book
   and chapter. When the lesson over-reads her — claims a detail she does not state, or leans on her
   where the verse was owed — say so on that row.

**The unjustified rule:** if you cannot name an SDA/BRI source for a sentence, it is **unjustified**
until a source is added or the claim is softened. Put it on the must-fix list.

## Verdicts

Assign exactly one verdict per sentence / paragraph / quiz stem / homework `do` or `why` / verify card:

| Verdict | Meaning |
|---------|---------|
| **Confirmed** | Scripture and an SDA/BRI source both support it as written. |
| **Needs citation** | Likely true, but the lesson does not show the proof. Name the source that should be added. |
| **Conflicts** | Contradicts the BRI/SDA published line or the biblical wording. Show the contradiction. |
| **Overclaim** | Stronger than the sources: "unanimous," "invented," "zero," "no scholar denies," invented-motive language. |
| **Tone risk** | Could hurt the research: casual mockery, cartoon villains, unsourced motive claims. |
| **History, not canon** | An extra-biblical fact that is fine **if** it stays labeled as history and carries a source; flag it when the label or source is missing. |

## House rules

1. **Historicist chain.** The review presumes the course's framework: one continuous chain — Babylon,
   Medo-Persia, Greece, Rome, divided Europe — with year-day, 538–1798, and 457 B.C. / A.D. 31 / 1844.
   Your task is to test whether the course *proves* its own line, not to relitigate the method.
2. **66-book only.** Protestant canon. No deuterocanonical verse may carry a doctrinal claim.
3. **No 1 Maccabees as Scripture.** History only, labeled.
4. **Jesuits are named as authors of readings, not as cartoon villains.** Ribera and Alcázar are cited
   as dated sources of futurist/preterist readings. No unsourced motive claims ("designed to deceive,"
   "to save the papacy"), no mockery. The dates and the titles are the argument.
5. **Do not flip `TEMP_REVIEW_UNLOCK`.** It is currently `true` in `js/study/study-app.js` and
   `js/shared/journey.js`. Leave it exactly as you found it; a review pass never changes the flag.
6. **Do not invent quotes.** Every quotation you accept in a verify card, and every quotation you put
   in your report, must match its cited source. If you cannot verify a quote, write "could not
   verify" — never reconstruct from memory.

## The report

One report per sitting. Structure:

1. **Header** — sitting number, title, Scripture span.
2. **Findings table** — one row per reviewed sentence or claim:

   | # | Location | Sentence or claim | Scripture proof | SDA/BRI proof (work + page or URL) | Verdict | Required fix |
   |---|----------|-------------------|-----------------|-------------------------------------|---------|--------------|

   - **Location** uses this vocabulary: `article`, `first principles: <kicker>`, `Christology`,
     `quiz Q<n> (stem / option / explanation / diagnostic)`, `homework trace <n> (do / why)`,
     `guide card <christ|now|help|value> (claim / why)`, `intro checklist <n>`, `ask <n>`,
     `verify <scripture|commentary> <n>`, `workbench task <n>`, `glossary: <term>`.
   - **Required fix** states the concrete change: add citation X, soften to Y, relabel as history,
     rephrase, delete. "None" only when the verdict is Confirmed.
   - Group rows so the load-bearing chain is readable: chronology and doctrine first, then supporting
     prose. Do not pad the table with filler rows; but do not skip a sentence because it sounds
     devotional — devotional sentences that make dated claims get rows too.
3. **Must-fix list** — the unjustified statements that weaken the research: every Conflicts row, every
   Overclaim row, every Needs-citation row whose claim is load-bearing (a date, an identification, a
   "the Bible says," a "history records"). Order by damage.
4. **Alignment note** (short) — where this sitting matches BRI; where it goes **beyond** BRI
   (Reformers' testimony, museum tablets, Newton, other dated readers) and whether that extra layer is
   explicitly labeled as history rather than as Scripture or as Adventist doctrine.

Finish the pass with the coverage checklist updated, and stop there. Do not edit the lesson files.
