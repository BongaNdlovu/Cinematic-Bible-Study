# SDA/BRI sentence-by-sentence review — coverage index

Review executed 2026-09-13 per [`../review-sda-bri.md`](../review-sda-bri.md), all 11 sittings in one
run at the owner's request. **Fix pass applied the same day**: every must-fix item in the eleven
reports is resolved in the lesson data (`js/study/sheets-data.js`, `js/study/sheet-glossary.js`,
`js/study/workbench.js`); `sheet-verify.js` needed no edits — every quotation in it survived
verification, including the two Newton quotations that were checked verbatim against the Gutenberg
text. Reports are one file per sitting; rows marked **FIXED** record what changed.

**Quarterly citation pass (2026-09-14).** After analyzing the BRI-authored Adult Bible Study Guide,
*Daniel* (1st Quarter 2020) — see [`2020-q1-sabbath-school.md`](2020-q1-sabbath-school.md) — four
open findings were closed with it as the named source and five enrichments were added to the course
data, all in the course's own words:

- **Citations added:** sitting 7 bear-ribs (= Lydia, Babylon, Egypt — ABSG week 8); sitting 8
  two-phase Rome (now quotes SDABC 4:841 and cites ABSG week 9); sitting 9 A.D. 34 (ABSG week 10
  prints the same dating); sitting 10 A.D. 508 (ABSG week 13 reads both spans from 508).
- **Enrichments added:** sitting 1 — Shinar/Babel (Gen 11:2) and the 1:21 Cyrus homecoming hint;
  sitting 2 — Isa 14:4 "golden city" + Herodotus for gold=Babylon; sitting 3 — the 1 Cor 15
  deliverance guard rail (the final rescue is the resurrection); sitting 6 — Diodorus Siculus on
  Darius III as a second extra-biblical witness for Medo-Persian irrevocability; sitting 8 — the
  ram and goat as the two Day-of-Atonement animals (Lev 16), pointing at nitsdaq.

## Coverage

```
[x] 0  sitting-00.md  Hermeneutics / year-day      — 4 must-fixes, all FIXED
[x] 1  sitting-01.md  Exile, names, food           — 3 must-fixes, all FIXED
[x] 2  sitting-02.md  Colossus                     — 2 must-fixes, FIXED (incl. quote verified)
[x] 3  sitting-03.md  Dura                         — 1 must-fix, FIXED
[x] 4  sitting-04.md  Pride / stump                — 3 must-fixes, all FIXED
[x] 5  sitting-05.md  Handwriting / 539            — 3 must-fixes, all FIXED
[x] 6  sitting-06.md  Den / Medo-Persian law       — none (clean; unchanged)
[x] 7  sitting-07.md  Beasts / little horn / 1260  — 1 must-fix, FIXED
[x] 8  sitting-08.md  Ram, goat, 2300 / 1844       — 1 must-fix, FIXED
[x] 9  sitting-09.md  Seventy weeks / A.D. 31      — 3 must-fixes, all FIXED
[x] 10 sitting-10.md  Michael / resurrection       — 1 root error (4 surfaces), FIXED
```

All 11 covered; all must-fixes resolved. The review is complete.

## Verdict tally (original findings, with resolution status)

| Verdict | Count | Where | Status |
|---------|-------|-------|--------|
| Confirmed (incl. history correctly labeled) | ~120 | Every sitting | Nothing to fix; sittings 6 and 8 needed only labeling nits |
| Needs citation | 12 | Sittings 0, 1, 2, 3, 4, 5, 7, 9, 10 | **All FIXED** — sources named (Xenophon *Cyr.* 1.3.10; Grayson 1975 / *Ministry* 1978; SDABC on 7:5; Herodotus 1.185; Ptolemy's Canon context) or claims softened/labeled (Dura→666 downgraded to suggestive echo; Spurgeon dropped; 508/ Stephen "commonly dated") |
| Overclaim | 7 | Sittings 0 (4), 4 (1), 9 (2) | **All FIXED** — "mainstream" not "unanimous"; "first full preterist/futurist commentary" not "invention"; "zero" removed; "unique… verbatim" softened; "absolute proof" and "unseen hands" removed |
| Tone risk | 3 | Sitting 0 (Jesuit-motive language) | **All FIXED** — converged on the sitting's own "institutional preservation" framing; effects stated, purposes dropped |
| Conflicts | 2 (one root error) | Sitting 10 (inverted Heb 10:11–12, in article + quiz + glossary card) | **FIXED** — re-anchored on Daniel's *'amad* usage (Dan 11:2–4, 7, 20–21), Heb 7:25, and *Great Controversy* ch. 40; conclusion unchanged, proof now true to its texts |

## What the fix pass changed, by file

- **`js/study/sheets-data.js`** (~50 edited lines, all four quizzes/verify-adjacent text intact):
  - Sitting 0: "unanimous" → "mainstream"; Spurgeon dropped; Trent paragraph and both dossier panes de-motived; "first full preterist/futurist commentary" wording in card titles, bodies, quiz option, and diagnostic; "zero prophetic chain" removed; Alcázar/Porphyry conflation replaced by Porphyry-via-Jerome.
  - Sitting 1: Xenophon, *Cyropaedia* 1.3.10 cited for the royal-table offering custom (article box + first-principles point); menu claim hedged as historical reconstruction; Meshach etymology note added; "ten times better"; Dan 1:8 pull-quote now KJV.
  - Sitting 2: caption under the kingdom table ("Dates are history… only the head is named in the text"); "standard specific-gravity values."
  - Sitting 3: Dura→666 downgraded to a labeled suggestive echo in box and bullet; Dan 3:17–18 pull-quote now KJV.
  - Sitting 4: "rare… in his own voice" + Dan 6:25–27 named as the parallel decree; BM 34113 diagnostic now cites Grayson 1975 and *Ministry* (April 1978) and discloses the fragment's disputed reading; Dan 4:30 pull-quote and box now KJV.
  - Sitting 5: "Nitocris" labeled to Herodotus 1.185 with Daniel 5:10's silence stated; river stratagem and guards attributed to Herodotus 1.191 / Xenophon *Cyr.* 7.5; Isaiah 45:1–2 carries the gates; "before Cyrus took Babylon" (and the quiz anchor fixed); Dan 5:5 pull-quote now KJV.
  - Sitting 7: bear's three ribs labeled "the traditional Adventist identification… see the SDA Bible Commentary on 7:5."
  - Sitting 8: America box now carries its source line (verify cards + Froom vol. 4).
  - Sitting 9: "commonly dated here" on A.D. 34; "by unseen hands" removed twice; "absolute proof" replaced by the cross-as-anchor sentence.
  - Sitting 10: the Heb 10:11–12 inversion removed from the "What 'stands up' means" box, the article paragraph, trace 2, and quiz Q1 (option, explanation, diagnostic); re-anchored on Dan 11's *'amad* usage, Heb 7:25, and GC ch. 40; Onias III alternative noted on 11:22.
- **`js/study/sheet-glossary.js`**: zeroim card (Xenophon citation), Michael card (*'amad* re-anchor), Trent card ("published," not "funded").
- **`js/study/workbench.js`**: Meshach option labeled "traditional reading."
- **`js/study/sheet-map.js`** (final check): the sitting-10 map stop "Michael stands up" carried the same sit/stand typology; re-anchored on the Dan 11 *'amad* usage like the rest of sitting 10.
- **`js/study/sheet-verify.js`**: **unchanged** — every KJV quote matched, and both Newton quotations (sittings 0, 2, 7) verified verbatim against the Gutenberg text during the pass.

A final sweep after the fix pass confirmed zero survivors of any flagged phrase across the whole
`js/` tree (the remaining "drunken" hits are Daniel 5's own feast language, not the removed guard
gloss, and the remaining "inventing" hits are the course disclaiming invention or describing
Dispensationalism's structural gap — not Jesuit-motive language).

All edited files pass `node --check` and load correctly (11 sittings, 4-option quizzes, 86 glossary
entries, 8 timeline epochs).

## What held up under review

- **Every KJV quotation in all eleven verify packs matches its source text** (Scripture checked
  line-by-line; the linked commentary/inscription quotes verified against the published renderings,
  and the Newton quotations verified verbatim during the fix pass).
- **The date chain 605 → 539 → 457 → 27 → 31 → 34 → 1844 and 538 → 1798 → 508-based 1,290/1,335 is
  arithmetically sound throughout**, including the no-year-zero walking sums.
- **Honest-labeling is the course's habit where it matters most** — and after the fix pass the labels
  are complete: "a candidate start… not a verse that prints '538'" (sitting 7); "if that starting date
  is wrong, the landing dates move" (sitting 10); the Karaite card's year-vs-day honesty; the Newton
  three-horns self-correction; the Great Disappointment owned as a mistaken event.
- **House rule 4 is now honored in every sitting** — sitting 0's older prose was the only violator,
  and it now matches its own best passage.

## House-rule compliance (review + fix pass)

Historicist chain presumed throughout; 66-book canon respected (1 Maccabees appears only via the
Maccabean-rejection arguments, never as Scripture); `TEMP_REVIEW_UNLOCK` left as found in both files;
no quote invented — the two quotations the pass could not verify from memory (Newton ch. 3, ch. 1
context) were fetched and checked verbatim before being confirmed or edited.

## Running another pass

Paste [`../review-sda-bri.md`](../review-sda-bri.md) with a single sitting number for a full-depth
re-pass, or commit this review-plus-fix state as the next checkpoint. The reports now double as the
changelog for what moved in the data files.
