# Theological & Question-Bank Audit Report (Seventh-day Adventist / Historicist Pass)

- **Date:** 2026-11-15
- **Scope:** Read-only theological, exegetical, editorial, and question-bank audit across all 11 sittings ([sheet-0.js](file:///c:/Users/fanel/Downloads/nebuchadnezzar_golden_head_threejs/js/study/sheets/sheet-0.js#L1) through [sheet-10.js](file:///c:/Users/fanel/Downloads/nebuchadnezzar_golden_head_threejs/js/study/sheets/sheet-10.js#L1)), shared study modules ([index.js](file:///c:/Users/fanel/Downloads/nebuchadnezzar_golden_head_threejs/js/study/sheets/index.js#L1), [workbench.js](file:///c:/Users/fanel/Downloads/nebuchadnezzar_golden_head_threejs/js/study/workbench.js#L1), [sheet-verify.js](file:///c:/Users/fanel/Downloads/nebuchadnezzar_golden_head_threejs/js/study/sheet-verify.js#L1), [sheet-map.js](file:///c:/Users/fanel/Downloads/nebuchadnezzar_golden_head_threejs/js/study/sheet-map.js#L1), [sheet-glossary.js](file:///c:/Users/fanel/Downloads/nebuchadnezzar_golden_head_threejs/js/study/sheet-glossary.js#L1), [glossary-enrichment.js](file:///c:/Users/fanel/Downloads/nebuchadnezzar_golden_head_threejs/js/study/glossary-enrichment.js#L1)), and [supabase-quiz-integrity.sql](file:///c:/Users/fanel/Downloads/nebuchadnezzar_golden_head_threejs/tools/supabase-quiz-integrity.sql#L69-L123).
- **Method & Filter:** Evaluates historic Seventh-day Adventist / Biblical Research Institute (BRI) Daniel scholarship against all lesson prose, diagrams, `christology` blocks, `studyGuide` prompts, `facilitator` notes, workbench tasks, map/verify/glossary cards, quiz stems/options/diagnostics, and SQL answer keys. **Only flagged ("fishy") items are listed.**
- **SQL Quiz Key Note:** All 55 `(sitting, q_idx, correct_idx)` rows in [supabase-quiz-integrity.sql](file:///c:/Users/fanel/Downloads/nebuchadnezzar_golden_head_threejs/tools/supabase-quiz-integrity.sql#L69-L123) match the empty-diagnostic slot (`diagnostics[idx] === ""`) in `sheet-0.js` through `sheet-10.js`; however, multiple `diagnostics` strings contain theological contradictions or mismatched refutations, and the `correct_note` for Sitting 1 Q1 tensions with Sitting 1's own notes (flagged below).

---

## Summary Matrix

| Scope | Critical | High | Medium | Low | Total |
| :--- | :---: | :---: | :---: | :---: | :---: |
| Sitting 0 (Prologue / Method) | 0 | 1 | 1 | 1 | 3 |
| Sitting 1 (Daniel 1) | 0 | 2 | 1 | 0 | 3 |
| Sitting 2 (Daniel 2) | 0 | 0 | 1 | 0 | 1 |
| Sitting 3 (Daniel 3) | 0 | 1 | 0 | 0 | 1 |
| Sitting 4 (Daniel 4) | 0 | 1 | 1 | 1 | 3 |
| Sitting 5 (Daniel 5) | 0 | 0 | 0 | 1 | 1 |
| Sitting 6 (Daniel 6) | 0 | 0 | 1 | 0 | 1 |
| Sitting 7 (Daniel 7) | 0 | 0 | 0 | 0 | 0 |
| Sitting 8 (Daniel 8) | 1 | 0 | 2 | 0 | 3 |
| Sitting 9 (Daniel 9) | 0 | 0 | 0 | 1 | 1 |
| Sitting 10 (Daniel 10–12) | 0 | 2 | 0 | 1 | 3 |
| Shared / Cross-Cutting Modules | 0 | 0 | 2 | 0 | 2 |
| **Total Flagged Items** | **1** | **7** | **9** | **5** | **22** |

---

## Sitting 0 — Method & Hermeneutics (`sheet-0.js`)

1. **[HIGH] Internal Contradiction Over Luis de Alcázar & A.D. 70**
   - **Locations:** [sheet-0.js](file:///c:/Users/fanel/Downloads/nebuchadnezzar_golden_head_threejs/js/study/sheets/sheet-0.js#L1) (`Part I` Preterism card, `s0-1` ASCII diagram, `diagrams["s0-1"]`, `quizzes[0]`), [workbench.js](file:///c:/Users/fanel/Downloads/nebuchadnezzar_golden_head_threejs/js/study/workbench.js#L134-L143) (`Task 2` instructions & item `m3`), [workbench.js](file:///c:/Users/fanel/Downloads/nebuchadnezzar_golden_head_threejs/js/study/workbench.js#L1064), [sheet-map.js](file:///c:/Users/fanel/Downloads/nebuchadnezzar_golden_head_threejs/js/study/sheet-map.js#L21), [sheet-glossary.js](file:///c:/Users/fanel/Downloads/nebuchadnezzar_golden_head_threejs/js/study/sheet-glossary.js#L28) & [`alcazar`](file:///c:/Users/fanel/Downloads/nebuchadnezzar_golden_head_threejs/js/study/sheet-glossary.js#L297), and [glossary-enrichment.js](file:///c:/Users/fanel/Downloads/nebuchadnezzar_golden_head_threejs/js/study/glossary-enrichment.js#L25-L28) & [`alcazar`](file:///c:/Users/fanel/Downloads/nebuchadnezzar_golden_head_threejs/js/study/glossary-enrichment.js#L310).
   - **Issue:** [sheet-0.js](file:///c:/Users/fanel/Downloads/nebuchadnezzar_golden_head_threejs/js/study/sheets/sheet-0.js#L1) (`Part I` & `s0-1`) and [glossary-enrichment.js](file:///c:/Users/fanel/Downloads/nebuchadnezzar_golden_head_threejs/js/study/glossary-enrichment.js#L25) / [line 310](file:///c:/Users/fanel/Downloads/nebuchadnezzar_golden_head_threejs/js/study/glossary-enrichment.js#L310) state that Alcázar (*Vestigatio Arcani Sensus in Apocalypsi*, 1614) read `"Revelation 1–11 as the fall of Jerusalem, and the rest as the overthrow of pagan Rome"`, and [workbench.js](file:///c:/Users/fanel/Downloads/nebuchadnezzar_golden_head_threejs/js/study/workbench.js#L142) (`m3`) scores `"All apocalyptic prophecies were completed by the destruction of Jerusalem in A.D. 70 and the fall of pagan Rome"` as `preterism` (matching Sitting 0 `quizzes[0]`). Directly contradicting this, [sheet-glossary.js](file:///c:/Users/fanel/Downloads/nebuchadnezzar_golden_head_threejs/js/study/sheet-glossary.js#L297) asserts Alcázar `"limits the Apocalypse to Constantine’s overthrow of paganism. It does not place Daniel under Antiochus or Revelation in A.D. 70"`, while [workbench.js](file:///c:/Users/fanel/Downloads/nebuchadnezzar_golden_head_threejs/js/study/workbench.js#L134) prints that `"Constantine's overthrow of paganism"` denial immediately above item `m3`. Historically, Froom (*The Prophetic Faith of Our Fathers*, vol. 2, pp. 507–509) confirms Alcázar *did* apply Revelation 1–11 to the rejection of Israel / fall of Jerusalem before pagan Rome/Constantine in chapters 12–19.

2. **[MEDIUM] Contradiction Between Verification Cards & Glossary on Jehoiakim's 3rd vs. 4th Year (605 B.C.)**
   - **Locations:** [sheet-verify.js](file:///c:/Users/fanel/Downloads/nebuchadnezzar_golden_head_threejs/js/study/sheet-verify.js#L18-L29) (`SHEET_VERIFY[0].items[1]`–`[2]`), [sheet-glossary.js](file:///c:/Users/fanel/Downloads/nebuchadnezzar_golden_head_threejs/js/study/sheet-glossary.js#L362), and [glossary-enrichment.js](file:///c:/Users/fanel/Downloads/nebuchadnezzar_golden_head_threejs/js/study/glossary-enrichment.js#L367-L370).
   - **Issue:** [sheet-verify.js](file:///c:/Users/fanel/Downloads/nebuchadnezzar_golden_head_threejs/js/study/sheet-verify.js#L22) states that Jehoiakim's 3rd year (Dan 1:1) and 4th year (Jer 25:1 / 46:2) *"are consecutive, not the same"*. Conversely, [sheet-glossary.js](file:///c:/Users/fanel/Downloads/nebuchadnezzar_golden_head_threejs/js/study/sheet-glossary.js#L362) and [glossary-enrichment.js](file:///c:/Users/fanel/Downloads/nebuchadnezzar_golden_head_threejs/js/study/glossary-enrichment.js#L367) state that Jeremiah 46:2's 4th year is *"the same campaign window as Daniel 1:1’s third year of Jehoiakim (605 B.C., accession-year difference)"*. Standard SDA chronology (*SDABC*, vol. 4, pp. 755–757) harmonizes both texts as the *same* 605 B.C. year via Babylonian accession-year vs. Judaean non-accession reckoning—not consecutive separate years.

3. **[LOW] Unqualified Ezekiel 4:6 Summary & Unannotated "606 B.C." Reference**
   - **Location:** [sheet-0.js](file:///c:/Users/fanel/Downloads/nebuchadnezzar_golden_head_threejs/js/study/sheets/sheet-0.js#L1) (`s0-2` ASCII diagram; `reading-notes` `Introduction`).
   - **Issue:** `s0-2` summarizes Ezekiel 4:6 as `"Ezekiel lies on his side for 40 prophetic days"` without noting the preceding 390 days on his left side for Israel (Ezek 4:4–5). In `reading-notes`, `"Smith dates the siege to 606 B.C."` appears with no explanation that modern SDA scholarship corrected Uriah Smith's zero-year error to **605 B.C.** (the date used in `Introduction` and `timelineEpochs`).

---

## Sitting 1 — Daniel 1 (`sheet-1.js`)

1. **[HIGH] Wrong-Chapter / Off-Target Diagnostic on Quiz Q1 Option 3**
   - **Location:** [sheet-1.js](file:///c:/Users/fanel/Downloads/nebuchadnezzar_golden_head_threejs/js/study/sheets/sheet-1.js#L1) (`quizzes[0]`, Option 3 & `diagnostics[3]`).
   - **Issue:** Option 3 claims `"Daniel organized an immediate subversive resistance within the Babylonian civil service, refusing all vocational duties until Hebrew worship was formally established."` Instead of refuting Daniel 1 refusal of vocational duty (Dan 1:4–5, 17–20), `diagnostics[3]` reads: `"Misconception: No violence is recorded. Daniel 6:10 has him praying after the decree was signed, so the chapter is not a picture of civil obedience to that law."` Mentioning "violence" and Daniel 6:10's decree does not match Option 3 and belongs to a different question/chapter.

2. **[HIGH] Self-Defeating Diagnostic on Quiz Q5 Option 3 (Denies Daniel 1:8 Typology)**
   - **Location:** [sheet-1.js](file:///c:/Users/fanel/Downloads/nebuchadnezzar_golden_head_threejs/js/study/sheets/sheet-1.js#L1) (`quizzes[4]`, Option 0, Option 3 & `diagnostics[3]`).
   - **Issue:** Q5 asks how Daniel 1:8 functions as a `"type" (a small picture of him)`, with Option 0 (correct) pairing Daniel refusing the king's table with Christ refusing Satan's bread in the wilderness (Matt 4:1–10; John 4:34). Distractor 3 dismisses Daniel 1 as `"merely an antiquated historical record of ancient dietary taboos, containing no moral application or redemptive significance"`. Yet `diagnostics[3]` states: `"Misconception: Christ's answer ties to Israel's wilderness, not to Daniel's table."` That refutation undercuts Option 0 rather than Distractor 3, effectively telling a student who denies Christian typology that typology between Daniel's table and Christ's temptation is invalid.

3. **[MEDIUM] Downplaying of Edenic / Health-Reform Theology & Contradiction with SQL `correct_note`**
   - **Locations:** [sheet-1.js](file:///c:/Users/fanel/Downloads/nebuchadnezzar_golden_head_threejs/js/study/sheets/sheet-1.js#L1) (`studyGuide.trace[1].why`, `studyGuide.trace[2].why`), [sheet-glossary.js](file:///c:/Users/fanel/Downloads/nebuchadnezzar_golden_head_threejs/js/study/sheet-glossary.js#L136), [glossary-enrichment.js](file:///c:/Users/fanel/Downloads/nebuchadnezzar_golden_head_threejs/js/study/glossary-enrichment.js#L139), [workbench.js](file:///c:/Users/fanel/Downloads/nebuchadnezzar_golden_head_threejs/js/study/workbench.js#L1071), and [supabase-quiz-integrity.sql](file:///c:/Users/fanel/Downloads/nebuchadnezzar_golden_head_threejs/tools/supabase-quiz-integrity.sql#L75).
   - **Issue:** `studyGuide.trace[1].why` (`"Daniel 1:8 does not say the king's food was unclean. It says he would not be defiled by it."`), `trace[2].why` (`"The point is the stand, not the menu."`), and `zeroim` ([sheet-glossary.js](file:///c:/Users/fanel/Downloads/nebuchadnezzar_golden_head_threejs/js/study/sheet-glossary.js#L136): `"The point is not a modern health regimen"`; [glossary-enrichment.js](file:///c:/Users/fanel/Downloads/nebuchadnezzar_golden_head_threejs/js/study/glossary-enrichment.js#L139): `"The point is not a modern health diet"`) create an artificial dichotomy between spiritual loyalty and dietary temperance. Meanwhile, [supabase-quiz-integrity.sql](file:///c:/Users/fanel/Downloads/nebuchadnezzar_golden_head_threejs/tools/supabase-quiz-integrity.sql#L75) (`correct_note` for Sitting 1 Q1) explicitly calls *zeroim* `"echoing the original Genesis 1:29 diet to preserve moral, cognitive, and covenant clarity"`, and [workbench.js](file:///c:/Users/fanel/Downloads/nebuchadnezzar_golden_head_threejs/js/study/workbench.js#L1071) calls it `"the Edenic loyalty diet"`. Classic SDA theology (*SDABC*, vol. 4, pp. 762–763; Ellen G. White, *PK* 481–484) holds that covenant loyalty and Levitical/Genesis 1:29 temperance operate together in Daniel 1:8 (*food and wine*), not against each other.

---

## Sitting 2 — Daniel 2 (`sheet-2.js`)

1. **[MEDIUM] Side-Lining the Historicist SDA Ecclesiastical-State Aspect of Iron and Clay**
   - **Location:** [sheet-2.js](file:///c:/Users/fanel/Downloads/nebuchadnezzar_golden_head_threejs/js/study/sheets/sheet-2.js#L1) (`historical-note`: *"Iron and clay — what Daniel 2:41–43 says, and how this sitting reads it"*, bullet 3).
   - **Issue:** The note writes: `"Some historicists take the clay as religious power allied with the state. That reading has to lean on Revelation 17... This sitting does not build on that, because Daniel 2 itself explains the feet in political terms: 'the kingdom shall be divided' (2:41), 'the seed of men' (2:43), and 'these kings' (2:44)."` While Daniel 2:41–43 emphasizes political division, saying the church-state reading `"has to lean on Revelation 17"` dismisses longstanding SDA exposition (Ellen G. White, *SDABC*, vol. 4, pp. 1168–1169; Uriah Smith, *Daniel and the Revelation*; *SDABC*, vol. 4, p. 775) that understands miry clay vs. iron right within Daniel 2 as representing the mingling of corrupted ecclesiastical/spiritual authority with civil/secular state power in divided Rome.

---

## Sitting 3 — Daniel 3 (`sheet-3.js`)

1. **[HIGH] Diagram `s3-4` Directly Contradicts Prose, Christology, Study Guide, and Quiz Q5**
   - **Location:** [sheet-3.js](file:///c:/Users/fanel/Downloads/nebuchadnezzar_golden_head_threejs/js/study/sheets/sheet-3.js#L1) (`<figure class="sheet-diagram" data-diagram="s3-4">` ASCII diagram vs. `Part IV, 2`, `christology.body[1]`, `studyGuide.christ.why`, and `quizzes[4].diagnostics[1]`).
   - **Issue:** Diagram `s3-4` includes a branch under `"The form of the fourth is like the Son of God" (Daniel 3:25)` stating:
     > `THE CROSS: HE BEARS WHAT WE OWE`
     > `• Christ entered the consuming fire of divine wrath for our sins`
     > `• Liberates believers from eternal death`
     Yet `Part IV, 2` (`"The furnace is the Son standing with his servants, not a code for that offering"`), `christology.body[1]`, `studyGuide.christ.why`, and `quizzes[4].diagnostics[1]` explicitly reject this exact claim: `"Misconception: The furnace is not a substitute for the cross, and it is not a type of the cross. Presence is Daniel 3:25. Atonement is Isaiah 53 and 2 Corinthians 5:21."` The graphic teaches the very theological conflation the text condemns.

---

## Sitting 4 — Daniel 4 (`sheet-4.js`)

1. **[HIGH] Corrupted / Factually Garbled Diagnostic on Quiz Q1 Option 2**
   - **Location:** [sheet-4.js](file:///c:/Users/fanel/Downloads/nebuchadnezzar_golden_head_threejs/js/study/sheets/sheet-4.js#L1) (`quizzes[0]`, Option 2 & `diagnostics[2]`).
   - **Issue:** Option 2 claims `"The dream's tree represents Babylon alone, and the king is never restored to his throne."` `diagnostics[2]` opens: `"Misconception: The chapter says the king's boast has no consequence; Daniel 4:31–33 records the sentence and humiliation."` First, `"The chapter says the king's boast has no consequence"` is an inverted false assertion (`says` instead of `does not say` / refuting a claim absent from Option 2). Second, it fails to cite **Daniel 4:22** (`"It is thou, O king"`, refuting `"Babylon alone"`) or **Daniel 4:34, 36** (his restoration, refuting `"never restored"`).

2. **[MEDIUM] Broken Nested HTML Cards (`level-interpretation` Inside `level-christ`)**
   - **Location:** [sheet-4.js](file:///c:/Users/fanel/Downloads/nebuchadnezzar_golden_head_threejs/js/study/sheets/sheet-4.js#L1) (`content`, following Daniel 4:34–37).
   - **Issue:** `<div class="level-card level-christ">` is left unclosed before `<div class="level-card level-interpretation">...</div>` begins, followed by `<p>The king himself says...</p></div>`. This renders the `INTERPRETATION` box nested inside the `CHRIST` card and breaks the card hierarchy.

3. **[LOW] Rhetorical Over-Correction Against Daniel 4:34's `"at the end of the days"`**
   - **Location:** [sheet-4.js](file:///c:/Users/fanel/Downloads/nebuchadnezzar_golden_head_threejs/js/study/sheets/sheet-4.js#L1) (`level-interpretation` card; echoed in `studyGuide.christ.why`).
   - **Issue:** The text writes: `"Notice where his reason came back. Not when the seven years ended, but when he lifted his eyes to heaven (Daniel 4:34)."` However, Daniel 4:34 (KJV) explicitly says: `"And at the end of the days I Nebuchadnezzar lifted up mine eyes unto heaven, and mine understanding returned unto me"`. Setting repentance *against* the completion of the appointed `"seven times"` contradicts the verse's temporal clause; both the prophetic term's completion and his upward look of submission occurred together.

---

## Sitting 5 — Daniel 5 (`sheet-5.js`)

1. **[LOW] Flattening Aramaic Weight-Noun / Verb Wordplay (*Teqēl* / *Peres*)**
   - **Location:** [sheet-5.js](file:///c:/Users/fanel/Downloads/nebuchadnezzar_golden_head_threejs/js/study/sheets/sheet-5.js#L1) (`s5-3`, `studyGuide.trace[2].why`, `principle-card`, and `quizzes[2].diagnostics[2]`).
   - **Issue:** Although `Main Point 3` body prose accurately notes `"the shekel is a weight"`, `s5-3`, `principle-card`, `studyGuide.trace[2].why` (`"MENE, TEKEL, and PERES are three Aramaic verbs: numbered, weighed, and divided"`), and `quizzes[2].diagnostics[2]` (`"Tekel is a verb meaning weighed"`) flatten the inscription strictly into verbs. In Biblical Aramaic (Dan 5:25–28), the cryptic words operate as a deliberate double entendre on standard **monetary weights/nouns** (mina, shekel, half-minas) interpreted by Daniel via **passive verbs** (and the proper noun *Pārās*, Persia).

---

## Sitting 6 — Daniel 6 (`sheet-6.js`)

1. **[MEDIUM] Internal Chronology Conflict: `c. 539 B.C.` Header vs. `538 B.C.` Body & Diagram**
   - **Locations:** [sheet-6.js](file:///c:/Users/fanel/Downloads/nebuchadnezzar_golden_head_threejs/js/study/sheets/sheet-6.js#L1) (`scripture`, `diagrams["s6-1"].title`, `Introduction`) and [index.js](file:///c:/Users/fanel/Downloads/nebuchadnezzar_golden_head_threejs/js/study/sheets/index.js#L4).
   - **Issue:** The sheet header prints `"Daniel 6:1-28 • Babylon, c. 539 B.C."`, whereas diagram `s6-1` reads `"From Babylon to Medo-Persia (538 B.C.)"` and `Introduction` explicitly insists: `"This sitting dates the story to 538 B.C., the first full year Medo-Persian rule was in place, and that is the year the chapter's events belong to."` Assigning the chapter dogmatically to `538 B.C.` contradicts its own `c. 539 B.C.` header (and overlaps ambiguously with Sitting 9's dating of Daniel 9:1 to `538 B.C.`).

---

## Sitting 7 — Daniel 7 (`sheet-7.js`)

- **No flagged items inside [sheet-7.js](file:///c:/Users/fanel/Downloads/nebuchadnezzar_golden_head_threejs/js/study/sheets/sheet-7.js#L1).**
  - *(Note: The course-wide `538 A.D.` timeline milestone card touching Daniel 7's 1,260 years is located in [index.js](file:///c:/Users/fanel/Downloads/nebuchadnezzar_golden_head_threejs/js/study/sheets/index.js#L6) and flagged under Shared / Cross-Cutting Modules below.)*

---

## Sitting 8 — Daniel 8 (`sheet-8.js`)

1. **[CRITICAL] Daniel 8:9 Little Horn Origin Contradiction (`"out of one of the four Greek kingdoms"` vs. `"one of the four winds"`)**
   - **Locations:** [sheet-8.js](file:///c:/Users/fanel/Downloads/nebuchadnezzar_golden_head_threejs/js/study/sheets/sheet-8.js#L1) (`Main Point 2`, `quizzes[3].diagnostics[2]`), [glossary-enrichment.js](file:///c:/Users/fanel/Downloads/nebuchadnezzar_golden_head_threejs/js/study/glossary-enrichment.js#L63) (`little-horn`), [sheet-glossary.js](file:///c:/Users/fanel/Downloads/nebuchadnezzar_golden_head_threejs/js/study/sheet-glossary.js#L80) (`diadochi`), [glossary-enrichment.js](file:///c:/Users/fanel/Downloads/nebuchadnezzar_golden_head_threejs/js/study/glossary-enrichment.js#L107) (`diadochi`), and [sheet-map.js](file:///c:/Users/fanel/Downloads/nebuchadnezzar_golden_head_threejs/js/study/sheet-map.js#L318) (`ulai-vision`).
   - **Issue:** [sheet-8.js](file:///c:/Users/fanel/Downloads/nebuchadnezzar_golden_head_threejs/js/study/sheets/sheet-8.js#L1) (`Main Point 2`) states: `"The horn comes out of one of the four Greek kingdoms (Daniel 8:9, 'out of one of them'). Rome began in the west, but it grew by taking over the Greek kingdoms one by one..."` Likewise `quizzes[3].diagnostics[2]` writes `"out of one of them (Daniel 8:9), after the four horns"`, and [glossary-enrichment.js](file:///c:/Users/fanel/Downloads/nebuchadnezzar_golden_head_threejs/js/study/glossary-enrichment.js#L63) states `"Daniel 8’s horn grows out of one of the four horns that replace Alexander’s great horn (8:8–9)"`.
   - **Internal & Theological Conflict:** [sheet-glossary.js](file:///c:/Users/fanel/Downloads/nebuchadnezzar_golden_head_threejs/js/study/sheet-glossary.js#L80) and [glossary-enrichment.js](file:///c:/Users/fanel/Downloads/nebuchadnezzar_golden_head_threejs/js/study/glossary-enrichment.js#L107) teach the exact opposite: `"From one of the four winds, a compass point, not one of the four generals, the little horn of chapter 8 grows (Bible Commentary, Daniel 8:9)"`, echoed by [sheet-map.js](file:///c:/Users/fanel/Downloads/nebuchadnezzar_golden_head_threejs/js/study/sheet-map.js#L318) (`"from one direction"`). Standard SDA / BRI scholarship (Gerhard Hasel, *Symposium on Daniel* / DARCOM vol. 2, pp. 386–389; *SDABC*, vol. 4, p. 841) holds that Daniel 8:9's feminine Hebrew *mēʾaḥaṯ mēhem* ("out of one of them") refers to the feminine **winds** (*rûḥôṯ*) / compass directions of v. 8, not the masculine Diadochi kings/horns—because conceding that the little horn emerges *from one of the four Hellenistic horns* concedes the foundational grammatical claim of the Antiochus IV preterist view.

2. **[MEDIUM] Broken Nested HTML Cards (`level-interpretation` Inside `level-christ`)**
   - **Location:** [sheet-8.js](file:///c:/Users/fanel/Downloads/nebuchadnezzar_golden_head_threejs/js/study/sheets/sheet-8.js#L1) (`content`).
   - **Issue:** Identical markup defect to Sitting 4: `<div class="level-card level-christ">` stays open while `<div class="level-card level-interpretation">...</div>` is nested inside it, followed by `<p>The Day of Atonement work of 1844...</p></div>`.

3. **[MEDIUM] Truncated Facilitator Point & Fragmented Study-Guide Sentence**
   - **Location:** [sheet-8.js](file:///c:/Users/fanel/Downloads/nebuchadnezzar_golden_head_threejs/js/study/sheets/sheet-8.js#L1) (`facilitator.talkingPoints[2]`, `studyGuide.trace[3].why`).
   - **Issue:** `facilitator.talkingPoints[2]` reads `"There is no consensus on the best (Richard M. Davidson, JATS 7/1 (1996))."`—cut off mid-phrase (missing *"translation"* and misleadingly suggesting Davidson leaves *nitsdaq* wholly undecided). In `studyGuide.trace[3].why`, the copy-pasted sentence fragment `"Cannot be limited only to the duration of the actions of the little horn."` appears mid-paragraph with no grammatical subject.

---

## Sitting 9 — Daniel 9 (`sheet-9.js`)

1. **[LOW] Unresolved `538 B.C.` vs. `539 B.C.` Regnal Note in `reading-notes`**
   - **Location:** [sheet-9.js](file:///c:/Users/fanel/Downloads/nebuchadnezzar_golden_head_threejs/js/study/sheets/sheet-9.js#L1) (`scripture`, `Introduction`, `reading-notes`).
   - **Issue:** `scripture` and `Introduction` place `"the first year of Darius the Mede"` in `538 B.C.`, while `reading-notes` (`Introduction`) appends an unexplained bare parenthetical: `"ABSG 2020 Q1, lesson 10 (gives 539 B.C.)"`, without explaining spring/fall accession differences or harmonizing with Sitting 6's `c. 539 B.C.` header.

---

## Sitting 10 — Daniel 10–12 (`sheet-10.js`)

1. **[HIGH] Contradictory & Weakly Grounded Treatment of A.D. 508, Clovis's Conversion (496 vs. 508), and the *Tamid***
   - **Locations:** [sheet-10.js](file:///c:/Users/fanel/Downloads/nebuchadnezzar_golden_head_threejs/js/study/sheets/sheet-10.js#L1) (`Main Point 5`), [sheet-verify.js](file:///c:/Users/fanel/Downloads/nebuchadnezzar_golden_head_threejs/js/study/sheet-verify.js#L712), [sheet-glossary.js](file:///c:/Users/fanel/Downloads/nebuchadnezzar_golden_head_threejs/js/study/sheet-glossary.js#L276-L277), and [glossary-enrichment.js](file:///c:/Users/fanel/Downloads/nebuchadnezzar_golden_head_threejs/js/study/glossary-enrichment.js#L73) & [`clovis`](file:///c:/Users/fanel/Downloads/nebuchadnezzar_golden_head_threejs/js/study/glossary-enrichment.js#L292).
   - **Issues:**
     1. **496 vs. 508 Contradiction:** [sheet-verify.js](file:///c:/Users/fanel/Downloads/nebuchadnezzar_golden_head_threejs/js/study/sheet-verify.js#L712) (`SHEET_VERIFY[10].items[9].check`) defines 508 as *"Clovis's conversion (ABSG 2020 Q1, lesson 13), separable from Clovis ~496 and Vouillé ~507"*, directly contradicting [sheet-glossary.js](file:///c:/Users/fanel/Downloads/nebuchadnezzar_golden_head_threejs/js/study/sheet-glossary.js#L277) and [glossary-enrichment.js](file:///c:/Users/fanel/Downloads/nebuchadnezzar_golden_head_threejs/js/study/glossary-enrichment.js#L292) (`"The conversion of Clovis (496), not the same pin as 508"`).
     2. **Undercutting Sitting 10's *Tamid* Integration:** [glossary-enrichment.js](file:///c:/Users/fanel/Downloads/nebuchadnezzar_golden_head_threejs/js/study/glossary-enrichment.js#L73) (`tamid.history`) claims `"508 is not a numeral in Daniel 8. It is the date reached by those who subtract 1290 from 1798 under the daily-as-paganism view"`, undermining Sitting 8 and Sitting 10's own Christ-centered *tamid* exposition that still retains the 508–1798 (1,290) and 508–1843 (1,335) pioneer counts.
     3. **Circular Backwards-Arithmetic Argument in `Main Point 5`:** [sheet-10.js](file:///c:/Users/fanel/Downloads/nebuchadnezzar_golden_head_threejs/js/study/sheets/sheet-10.js#L1) (`Main Point 5`) argues: `"The arithmetic shows why it has to be 508 and not 496 or 507: only 508 plus 1,290 lands on 1798 ... and 508 plus 1,335 lands on 1843"`, dismissing 496 and 507 without ever stating what historically happened in **508** (Clovis consolidating Frankish Catholic supremacy after defeating the Arian Visigoths and receiving honorary Roman consular honors from Emperor Anastasius in 508; *SDABC*, vol. 4, p. 881).

2. **[HIGH] Inverted / Self-Contradictory Diagnostic Phrasing on Quiz Q1 Option 0 & Quiz Q3 Option 1**
   - **Location:** [sheet-10.js](file:///c:/Users/fanel/Downloads/nebuchadnezzar_golden_head_threejs/js/study/sheets/sheet-10.js#L1) (`quizzes[0].diagnostics[0]`, `quizzes[2].diagnostics[1]`).
   - **Issues:**
     - `quizzes[0].diagnostics[0]`: `"Misconception: Cyrus's decree is Daniel 12:1. Ezra 1:1 is Cyrus's first year; 536 is the usual figure for the third year in Daniel 10:1. Daniel 12:1 stands at the culmination of the prophetic march at the end of human history."`
     - `quizzes[2].diagnostics[1]`: `"Misconception: Michael starts His intercession only when trouble begins. Hebrews 7:25 intercession runs in this age until He stands (Dan 12:1); then probation closes and trouble follows."`
     - Both strings state the distractor's error *as an unqualified affirmative declaration* immediately after `"Misconception:"`, before contradicting it in the next sentence—reversing the course's corrective diagnostic convention used in other sittings.

3. **[LOW] Duplicate Line in Diagram `s10-1` ASCII & Raw `(Esther 3:7)` Citation**
   - **Location:** [sheet-10.js](file:///c:/Users/fanel/Downloads/nebuchadnezzar_golden_head_threejs/js/study/sheets/sheet-10.js#L1) (`<figure class="sheet-diagram" data-diagram="s10-1">` ASCII; `Introduction`).
   - **Issue:** In `s10-1`, `"• Deliverance in the Book"` is printed twice consecutively in the `DANIEL 12: THE END` column (while `diagrams["s10-1"].steps[2].points` lists it once). In `Introduction`, `"On the twenty-fourth day of the first month (Nisan) (Esther 3:7)"` inserts a bare cross-reference with no explanation that Esther 3:7 identifies the first month as Nisan.

---

## Shared / Cross-Cutting Modules (`index.js`, `sheet-glossary.js`, `glossary-enrichment.js`, `workbench.js`)

1. **[MEDIUM] `538 A.D.` Epoch Card Conflation in Timeline Data**
   - **Location:** [index.js](file:///c:/Users/fanel/Downloads/nebuchadnezzar_golden_head_threejs/js/study/sheets/index.js#L6) (`timelineEpochs`, `"538 A.D."`).
   - **Issue:** `desc` states: `"In 538 the Ostrogothic siege of Rome is lifted. Justinian's decree establishes the Bishop of Rome as the head of all churches. Christ ministers daily in the Holy Place."` Two issues appear here: (a) Justinian's legal decree recognizing papal primacy was issued in **A.D. 533** and became practically effective in 538 (as the adjacent `history` field clarifies), and (b) appending `"Christ ministers daily in the Holy Place."` onto the 538 A.D. papal-supremacy description conflates Christ's entire A.D. 31–1844 Holy Place mediation with the year 538.

2. **[MEDIUM] Corrupted Citations, Truncated Sentence, & Field Leakage in Glossary Entries**
   - **Locations:** [sheet-glossary.js](file:///c:/Users/fanel/Downloads/nebuchadnezzar_golden_head_threejs/js/study/sheet-glossary.js#L35-L36) (`dispensationalism`), [sheet-glossary.js](file:///c:/Users/fanel/Downloads/nebuchadnezzar_golden_head_threejs/js/study/sheet-glossary.js#L276) (`clovis`), and [glossary-enrichment.js](file:///c:/Users/fanel/Downloads/nebuchadnezzar_golden_head_threejs/js/study/glossary-enrichment.js#L345) (`babylon`) / [line 366](file:///c:/Users/fanel/Downloads/nebuchadnezzar_golden_head_threejs/js/study/glossary-enrichment.js#L366) (`carchemish`).
   - **Issues:**
     - `dispensationalism` ([sheet-glossary.js](file:///c:/Users/fanel/Downloads/nebuchadnezzar_golden_head_threejs/js/study/sheet-glossary.js#L35-L36)) cites `(PFF2 488)`—the page in *Prophetic Faith of Our Fathers*, vol. 2 for **Ribera's** 16th-century *three and a half years*—for 19th-century dispensationalism (which teaches a **seven-year** tribulation). Its `history` field also contains a verbless copy-paste fragment (`"Irving and others who were proclaiming an interpretation of prophecy based on the year-day principle (Prophetic Faith of Our Fathers, vol. 3)."`).
     - `simple` tooltip fields in `dispensationalism`, `clovis`, `babylon`, and `carchemish` begin with `"History: "`, leaking internal label prefixes into user-facing plain-English definitions.

---

## Resolution (2026-11-15)

All 22 items were checked against `js/study/sheets-data.js` (the source of the generated `js/study/sheets/*.js`) and the shared modules. All 22 were real and are fixed. See the changelog entry of the same date for the file list.

| # | Item | Verdict | Fix |
| :--- | :--- | :--- | :--- |
| S0-1 | Alcázar / A.D. 70 | Confirmed | Glossary, map card and workbench now agree with the lesson: Revelation as Jerusalem's fall, then pagan Rome's overthrow, completed under Constantine. The "not A.D. 70" denials are gone. |
| S0-2 | Third vs. fourth year of Jehoiakim | Confirmed | Verify card now says both are 605 B.C., counted without and with the accession year (Bible Commentary vol. 4, Daniel 1:1). Glossary wording aligned. |
| S0-3 | Ezekiel 4 / 606 B.C. | Confirmed | Diagram shows 390 days for Israel, then 40 for Judah (4:4–6). Reading note says the course uses 605 B.C. |
| S1-1 | Q1 option 3 feedback | Confirmed | Feedback now answers the option: no strike or resistance movement in Daniel 1 (1:5, 8, 12, 19). |
| S1-2 | Q5 option 3 feedback | Confirmed | Feedback now answers "only old food rules" and points to Christ (Matthew 4:4). |
| S1-3 | Zeroim "stand vs. menu" | Confirmed in substance | Study guide and glossary now say loyalty is the reason and the Genesis 1:29 diet is how Daniel kept it. **Detail wrong:** the SQL note quoted is Sitting 1 Q2 (q_idx 1), not Q1. The SQL needed no change. |
| S2-1 | Iron and clay, church and state | Confirmed in substance | The note now presents the church-state application (Bible Commentary vol. 4, 1168) alongside the political reading instead of dismissing it. **Detail wrong:** Bible Commentary vol. 4 on Daniel 2:41–43 (around p. 775) reads the clay politically (weak successor kingdoms, intermarriage). It does not teach the church-state reading. |
| S3-1 | Diagram s3-4 | Confirmed | Right branch is now "Keep separate: the cross"; the furnace shows presence, atonement is Isaiah 53 and 2 Corinthians 5:21. Structured diagram data aligned. |
| S4-1 | Q1 option 2 feedback | Confirmed | Feedback now cites Daniel 4:22 and 4:36. |
| S4-2 | Nested cards | Confirmed | Interpretation and Christ cards separated. |
| S4-3 | "At the end of the days" | Confirmed | Interpretation card and study guide now keep both: the days ended, and he lifted his eyes (4:34). The lesson already said elsewhere that the end of the days is the end of the seven times. |
| S5-1 | MENE, TEKEL, PERES | Confirmed | Study guide, Q3 feedback and table header now say the words look like weights and Daniel reads them as verbs. |
| S6-1 | 539 vs. 538 header | Confirmed | Header now c. 538 B.C., matching the body's accession-year explanation. |
| S8-1 | Daniel 8:9 origin | Confirmed | Main Point 2, Q4 feedback and the little-horn glossary now read "one of them" as one of the four winds, a compass direction, with verse 23 giving the time. **Detail wrong:** the audit calls *mēhem* feminine. Bible Commentary vol. 4, Daniel 8:9 says *hem* is masculine (pointing to winds) and *ʾaḥat* is feminine (pointing to horns). |
| S8-2 | Nested cards | Confirmed | Same fix as Sitting 4. |
| S8-3 | Facilitator / study guide fragments | Confirmed | Both sentences completed. |
| S9-1 | 539 note | Confirmed | Note explains 539 is the fall of Babylon and the course counts 538. |
| S10-1 | 508, Clovis, tamid | Confirmed | Main Point 5 now says what is dated to 508 (end of the Visigothic war; consular title from Anastasius at Tours, Gregory of Tours 2.38), drawn from `_factcheck/bri_esd_508_538.txt`. Verify card and Clovis glossary agree. Tamid glossary no longer says 508 belongs only to the daily-as-paganism view. |
| S10-2 | Inverted feedback | Confirmed | Q1 option 0 and Q3 option 1 feedback now state the correction, as elsewhere. Sitting 4 Q1 option 2 had the same inversion and is fixed above. |
| S10-3 | Duplicate line / Esther 3:7 | Confirmed | Duplicate removed in s10-1. Esther 3:7 now explained. |
| X-1 | 538 A.D. card | Confirmed | Card names the 533 decree taking effect in 538; Christ's ministry is a separate sentence. |
| X-2 | Glossary citations and "History:" labels | Confirmed, wider than reported | Dispensationalism fixed. The "History: " label was on 41 short definitions (29 base, 12 enrichment), not 4; all removed. |

Kept as written: the course's choice to avoid naming the denomination or its authors in reader-facing text (enforced by `tools/verify/verify_workbench.mjs`). The Bible Commentary citation is used instead.
