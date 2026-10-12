# GC submission — sentence-level proof: A.D. 508, A.D. 31, A.D. 34

**Audit date:** 2026-10-12  
**Scope:** Learner-facing copy and verify-dock notes for the 1,290 / 1,335 chart (508 start), the seventieth-week cross (A.D. 31), and the close of the seventy weeks (A.D. 34).  
**Method:** OneVoice27 tags (TEXT / HISTORY / INTERPRETATION / CHRIST). KJV checked against `bible/kjv.json`. Arithmetic checked independently. SDABC / BRI limits taken from `tools/review/PROPHECY_VERIFICATION.md` and published historicist sources named in that file (no Ellen White as public proof-text per OneVoice27 §7.3).

**Files in this package:**

| File | Role |
|------|------|
| `js/study/sheets-data.js` | Sitting 9 (mp4 cards) · Sitting 10 (Daniel 12:11–12 card + diagram) |
| `js/study/sheet-glossary.js` | `clovis` card |
| `js/study/sheet-map.js` | Map stops for sittings 9 and 10 |
| `js/study/sheet-verify.js` | Verify dock: Daniel 9:26–27 note · Daniel 12:11–12 item |
| `tools/review/PROPHECY_VERIFICATION.md` | Committee summary table (updated 2026-10-12) |

---

## Limits the committee should know (not errors)

| Topic | What the course teaches | Honest limit |
|-------|-------------------------|--------------|
| **508 / 1,290 / 1,335** | Year-day scale; 508 + 1,290 = 1798; 508 + 1,335 = 1843; standard historicist Adventist chart | **508 is a reconstructed civil start**, not a verse date. Clovis ~496 and Vouillé ~507 are related, not interchangeable pins. **Tamid / start-event:** Daniel 8 in this course reads *tamid* as Christ’s continual priesthood; many commentaries tie 12:11’s *start* to a different “daily” layer (pagan-imperial transition). That tension is **not** resolved in learner prose (content choice **B**: label 508 only). |
| **A.D. 31** | Midst of the week from autumn A.D. 27 + 3½ years | SDABC: crucifixion year **not** established by astronomical / calendrical proof alone; A.D. 30 vs 31 debated among historians. |
| **A.D. 34** | Working close of the 70th week; 34 + 1,810 = 1844 | SDABC: **no direct historical evidence** for Stephen’s year; **34 is a working date** inferred from the half-week and Acts 7–8. |

---

## A. Sitting 10 — Daniel 12:11–12 (`sheets-data.js`)

**Location:** framework card “The Numbered Spans of Daniel 12…” (~lines 5868–5876) and diagram `s10-3` (~5885–5893).

| # | Sentence (exact learner text) | Tag | Verdict | Proof |
|---|------------------------------|-----|---------|-------|
| A1 | In Daniel 12:11–12, two final prophetic spans are revealed from the time the *tamid* is taken away and the abomination of desolation is set up: | TEXT + INTERPRETATION | ACCURATE | Dan 12:11–12 (KJV) names 1,290 and 1,335 days from removal of the daily and setting up of the abomination. “Two spans” = 12:11 and 12:12. *Tamid* = Hebrew “the continual” (course uses term consistently with Sitting 8). |
| A2 | KJV blockquote of 12:11–12 | TEXT | ACCURATE | Verified against `bible/kjv.json` Daniel 12:11–12. Ellipsis between verses is editorial; both clauses verbatim. KJV adds italic “sacrifice” in 12:11; Hebrew is *ha-tamid*. |
| A3 | This sitting applies the year-day principle to these periods (Numbers 14:34; Ezekiel 4:6), reading the 1,290 and 1,335 days as solar years. | INTERPRETATION | ACCURATE (labeled) | Year-day scale stated as interpretation; precedents cited (Num 14:34; Ezek 4:6). Not claimed as explicit in Dan 12. |
| A4 | The chart uses **A.D. 508** as a **reconstructed civil start** — the year Frankish support for the Roman church in the West was in place in the usual historicist reckoning. | HISTORY + INTERPRETATION | ACCURATE (labeled) | 508 not in Scripture. “Reconstructed civil start” matches `bri-strict` SHEETS_7_10_PROOF row 10. Frankish–papacy alliance is standard historicist narrative for early sixth century (see PROPHECY_VERIFICATION: BRI “historical position”). |
| A5 | Clovis’s baptism is often dated 496; the battle of Vouillé is 507. | HISTORY | ACCURATE (reconstruction) | Common scholarly dates; labeled “often dated.” Not verse dates. |
| A6 | Those milestones are related but not interchangeable with 508. | INTERPRETATION | ACCURATE | Prevents conflating baptism / battle / civil-start pin (bri-strict requirement). |
| A7 | If the start moves, the landing years below move with it; the year-day method stays visible either way. | INTERPRETATION | ACCURATE | Logical dependency of landings on start; method (year-day) independent of 508 pin. |
| A8 | **1,290 …:** A.D. 508 + 1,290 years = A.D. 1798, the year Berthier took the pope and the “time of the end” begins (Daniel 12:4). | INTERPRETATION + HISTORY | ACCURATE | Arithmetic: 508 + 1290 = **1798**. Berthier entered Rome **1798** (Pius VI captive). Linking 1798 to “time of the end” is historicist reading of Dan 12:4, not a dated verse. |
| A9 | **1,335 …:** A.D. 508 + 1,335 years = A.D. 1843, the waiting year of the great second-advent awakening, immediately before the 2,300 evenings-mornings land in 1844 (sitting 8). | INTERPRETATION + HISTORY | ACCURATE | Arithmetic: 508 + 1335 = **1843**. Uriah Smith / SDABC / BRI Timm line: 1,335 → 1843/1844 (PROPHECY_VERIFICATION row 8). 1844 on separate 2,300 line (Sitting 9) — correctly distinguished. |

### Diagram `s10-3` (ASCII labels)

| # | Label | Tag | Verdict | Proof |
|---|-------|-----|---------|-------|
| D1 | Title: FROM A.D. 508 — RECONSTRUCTED CIVIL START | INTERPRETATION | ACCURATE | Matches A4. |
| D2 | 508 → 1798 (1,290 years) | INTERPRETATION | ACCURATE | Same as A8. |
| D3 | Frankish support … (496 / 507 related, not same pin) | HISTORY | ACCURATE | Same as A5–A6. |
| D4 | Berthier captures Pope; Time of the End | HISTORY + INTERPRETATION | ACCURATE | 1798 event; Dan 12:4 phrase applied interpretively. |
| D5 | 508 → 1843 (1,335 years) | INTERPRETATION | ACCURATE | Same as A9. |
| D6 | then 1844: 2,300-year sanctuary landing (sitting 8) | INTERPRETATION | ACCURATE | Separates 1,335 terminus from 2,300 terminus. |

---

## B. Sitting 9 — Cross and close of seventieth week (`sheets-data.js` mp4)

**Location:** framework cards 1–4 (~5303–5320), diagram `s9-5`, balance bullet (~5345).

| # | Sentence (exact learner text) | Tag | Verdict | Proof |
|---|------------------------------|-----|---------|-------|
| B1 | With 69 weeks completed in Autumn A.D. 27, exactly one prophetic week (7 literal years) remained… | INTERPRETATION | ACCURATE | 70 − 69 = 1 week; week = 7 years in this chart (Dan 9:27 “one week”). Autumn 27 from 457 + 483 walk (earlier in sitting). |
| B2 | Daniel 9:26–27 blockquote (Messiah cut off; midst of week; sacrifice cease) | TEXT | ACCURATE | Substance matches KJV Dan 9:26–27; ellipsis marked. |
| B3 | Messiah cut off, but not for himself — innocent substitute; Isaiah 53:5 | TEXT + CHRIST | ACCURATE | Dan 9:26; Isa 53:5 parallel (interpretation labeled by context). |
| B4 | Final week Autumn A.D. 27 to Autumn A.D. 34; midst 3.5 years after Autumn A.D. 27 → Spring A.D. 31; crucifixion at Passover. | INTERPRETATION | ACCURATE | 7-year week split 3.5 + 3.5; arithmetic consistent with chart. Gospels: crucifixion at Passover (Matt 26–27; Mark 14–15; Luke 22–23; John 18–19). |
| B5 | **Hedge:** That date is this chart’s landing from Daniel 9’s midst of the week, not a separately attested astronomical lock on Passover; historians debate A.D. 30 versus A.D. 31 for the crucifixion. | INTERPRETATION | ACCURATE | Matches SDABC limit in PROPHECY_VERIFICATION (no astronomical proof; 30 vs 31). Does not retract midst-of-week landing. |
| B6 | Veil rent (Matt 27:51); sacrifices cease typologically (Heb 9–10) | TEXT + CHRIST | ACCURATE | Matt 27:51 verbatim sense; Heb 10:1–14 argument. |
| B7 | Remaining 3.5 years Spring A.D. 31 to Autumn A.D. 34; ministry to Israel (Matt 10:5–6; Acts 1:8). | INTERPRETATION | ACCURATE | Chart geometry; Matt 10:5–6 limits mission; Acts 1:8 sequence. |
| B8 | In A.D. 34, Stephen was stoned (Acts 7:54–60). | TEXT + HISTORY | ACCURATE | Acts 7 narrates stoning; **does not print “A.D. 34.”** Year is chart assignment. |
| B9 | **Hedge:** Autumn A.D. 34 is this chart’s **working close** of the seventieth week — inferred from the half-week after the cross and from Acts 7–8 (Stephen and the wider Gentile mission), not a year the biblical narrative prints. | INTERPRETATION | ACCURATE | Matches SDABC “working date” / no direct evidence for Stephen’s year (PROPHECY_VERIFICATION). |
| B10 | Stoning closes seventy weeks for people and city (9:24). | INTERPRETATION | ACCURATE | Historicist assignment of 9:24 sixfold goal to end of 490 years; labeled by “closes” logic, not by verse naming Stephen. |
| B11 | Acts 7 does not print a formal council title. | TEXT | ACCURATE | Acts 7 has no Sanhedrin session title as modern councils use. |
| B12 | After Stephen, scattered witness beyond Jerusalem (Acts 8:1–4); Saul converted (Acts 9:1–9). | TEXT | ACCURATE | Acts 8:1–4 follows Stephen; Acts 9:1–9 is Saul’s conversion. No claim that Acts prints A.D. 34. Acts 13:46 deliberately omitted here (Paul’s Pisidian sermon is later and not used to date the week’s close). |
| B13 | Balance: 490 complete A.D. 34; 1,810 remain; 34 + 1,810 = autumn 1844; cross A.D. 31 anchors 2,300 terminus. | INTERPRETATION | ACCURATE | 2300 − 490 = 1810; 34 + 1810 = 1844. Internal consistency of course chart. |

### Diagram `s9-5`

| # | Label | Verdict | Proof |
|---|-------|---------|-------|
| B-D1 | A.D. 27 → 31 → 34 with 3.5y segments | ACCURATE | Visual of B4, B7. |
| B-D2 | Stoning of Stephen / 70 Weeks expire | ACCURATE (interpretive) | Same as B8–B10; year on diagram is chart label. |

---

## C. Glossary — Clovis (`sheet-glossary.js`)

| # | Sentence | Tag | Verdict | Proof |
|---|----------|-----|---------|-------|
| C1 | Frankish king whose later policy gave the Roman church civil muscle in the west. | HISTORY | ACCURATE | Standard historicist gloss; not a verse claim. |
| C2 | Baptism 496; Vouillé 507 — related milestones, not the same pin as 508. | HISTORY | ACCURATE | Same as A5–A6. |
| C3 | A.D. 508 reconstructed civil start for 1,290 / 1,335 (year-day), landings 1798 and 1843; if start moves, landings move. | INTERPRETATION | ACCURATE | Same as A3–A7, A8–A9. |
| C4 | 1844 on separate line from Sitting 9. | INTERPRETATION | ACCURATE | Prevents merging 1,335 and 2,300 starts. |

---

## D. Sheet map (`sheet-map.js`)

| # | Excerpt | Verdict | Proof |
|---|---------|---------|-------|
| D1 | spring A.D. 31 (midst of the week; not astronomical proof) | ACCURATE | Same as B5. |
| D2 | A.D. 34 as working close from Acts 7–8 (not a year Acts prints) | ACCURATE | Same as B9. |
| D3 | 1,290 / 1,335 from 508 reconstructed; 496/507 not same pin; landings move if start moves; 1844 separate | ACCURATE | Same as A3–A7 and C3. |

---

## E. Verify dock (`sheet-verify.js`)

| # | Claim / note | Verdict | Proof |
|---|--------------|---------|-------|
| E1 | Dan 9:26–27 KJV + note on 31 (midst; not astronomical) and 34 (working close) and 1844 arithmetic | ACCURATE | KJV checked; notes match B5, B9, B13. |
| E2 | Dan 12:11–12 KJV + 508 reconstructed; 496/507; arithmetic; landings move | ACCURATE | KJV Daniel 12:11–12; notes match A3–A9. |

---

## F. Arithmetic certificate

| Calculation | Result | Checked |
|-------------|--------|---------|
| 508 + 1,290 | 1798 | ✓ |
| 508 + 1,335 | 1843 | ✓ |
| 2,300 − 490 | 1,810 | ✓ |
| 34 + 1,810 | 1844 | ✓ |
| −457 + 483 + 1 (no year zero) | 27 A.D. | ✓ (stated earlier in Sitting 9) |
| A.D. 27 + 3.5 years (midst) | Spring A.D. 31 | ✓ (chart rule) |

---

## G. Automated gates (2026-10-12)

| Gate | Result |
|------|--------|
| `node tools/verify/verify_scripture.mjs` | PASS |
| `npm run lint` | PASS |

---

## H. Sign-off

These sentences are **accurate for what they claim**: Scripture quoted verbatim where marked KJV; reconstructed and working dates **labeled**; historicist arithmetic **shown**; known SDABC/BRI limits **not hidden** (31, 34, 508; tamid/12:11 **named in limits table**, not expanded in learner prose per content choice **B**).

**Recommended committee attachment:** this file + `tools/review/PROPHECY_VERIFICATION.md` (rows A.D. 31, A.D. 34, 508).

**Not in scope of this audit:** Every sentence in Sittings 9–10 outside the blocks above; OneVoice27 `units.json` / LINECHECK regeneration; full-course 457 B.C. decree debate.
