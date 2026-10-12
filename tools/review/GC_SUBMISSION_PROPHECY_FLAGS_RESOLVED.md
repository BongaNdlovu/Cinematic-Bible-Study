# Prophecy flags resolved — proof for GC submission

**Date:** 2026-10-12  
**Scope:** Items flagged in `PROPHECY_VERIFICATION.md` “reviewer challenge” and “not verified” lists.

---

## 1. A.D. 31 (midst of week vs astronomy)

| Claim in course | Proof | Learner copy |
|-----------------|-------|--------------|
| Spring A.D. 31 = midst of week from autumn A.D. 27 + 3½ years | Dan 9:27 “midst of the week”; SDABC: not established by astronomical/calendrical proof alone | Sitting 9 mp4 card; `sheet-map.js`; `sheet-verify.js`; `study-app.js` horizon |
| Crucifixion at Passover | Gospels (synoptic timing) | Unchanged |

**Status:** RESOLVED — hedge in copy; arithmetic unchanged.

---

## 2. A.D. 34 (Stephen / working close)

| Claim | Proof | Learner copy |
|-------|-------|--------------|
| Autumn A.D. 34 closes 70th week | SDABC: working date; no direct evidence for Stephen’s year | “Working close” + Acts 7–8; Acts does not print year |
| Stephen stoned | Acts 7:54–60 | TEXT accurate |

**Status:** RESOLVED — Acts 13:46 removed from 34 paragraph (was chronologically misleading).

---

## 3. 457 B.C. decree debate

| Claim | Proof | Learner copy |
|-------|-------|--------------|
| Start = Artaxerxes I, Ezra 7, seventh year → autumn 457 | Ezra 7:7–9; Ptolemy canon (named in sitting); Horn & Wood / SDABC 458–457 nuance | New paragraph: 458/457 regnal reckoning; Artaxerxes I vs II debate; not a Daniel 9 printed year |
| Three decrees in official guide | ABSG Ezra–Nehemiah 2019 Q4 (cited in PROPHECY sources table) | Sitting 9 intro names three + Nehemiah permit |

**Status:** RESOLVED — labeled; chart unchanged.

---

## 4. Four vs three Persian “decrees”

| Issue | Resolution |
|-------|------------|
| ABSG uses three decrees | Sitting 9 now says guide uses **three restoring decrees**; Nehemiah 444 is **fourth line = permit**, not new charter for 9:25 |
| Kicker / diagram | Renamed “Persian commissions compared (three decrees + Nehemiah permit)” |

**Status:** RESOLVED.

---

## 5. A.D. 538 as 1,260 start

| Claim | Proof | Learner copy |
|-------|-------|--------------|
| 533 Justinian letter (Codex I.1.8) | Primary law text; history not verse | Sitting 7 historical-note |
| March 538 Belisarius / Ostrogoths | Standard historicist pin | Same |
| Gradual papal rise; backward calc from 1798 | BRI 508/538 article caveat; SDABC on gradual transition | “Chart pin”; “if 538 moves, 1798 moves”; glossary Ostrogoths card |
| 538 + 1,260 = 1798 | Arithmetic | Unchanged |

**Status:** RESOLVED — labeled like 508 (reconstructed/effective pin).

---

## 6. 508 / 1,290 / 1,335 / tamid tension

| Layer | Handling |
|-------|----------|
| 508 arithmetic | 508 + 1290 = 1798; 508 + 1335 = 1843 | Labeled reconstructed civil start (prior pass) |
| Christ *tamid* (Sitting 8) vs 12:11 start event | SDABC difficulty acknowledged | One bridging sentence Sitting 10: civil 508 pin ≠ christological *tamid* question |
| Pagan-daily start in commentaries | Documented in limits table | Not taught as course primary reading |

**Status:** RESOLVED for GC (honest limits + labels); not a single unified tamid theory in prose.

---

## 7. Himes 20 March 1840

| Claim | Proof |
|-------|-------|
| First number Signs of the Times, Boston, 20 March 1840 | EGW Writings reprint table; **ESDA** “Advent Herald”; **Internet Archive** vol. 1 nos. 1–12 (Andrews University digitization); masthead March 20, 1840 |

**Learner surfaces:** `sheet-verify.js`, `sheet-map.js`, `map-data.js`, glossary miller-advent line.

**Status:** VERIFIED — removed from “not verified” list.

---

## 8. Exeter camp meeting (August 1844)

| Claim | Proof |
|-------|-------|
| Snow seventh-month message at Exeter, Aug 1844 | **ESDA** Snow article; **Advent Herald**, 21 Aug. 1844; Froom *PFF* vol. 4 (Aug 12–17 camp meeting) |
| True Midnight Cry 22 Aug. 1844 | Cited in verify dock with Snow pamphlet |

**Status:** VERIFIED — removed from “not verified” list.

---

## 9. Crosier *Day-Star* (1846)

| Finding | Action |
|---------|--------|
| Not cited in live `sheets-data.js` | Edson account only (“remembered years afterwards”) — already hedged |
| No Crosier quote in learner copy | Nothing to verify in public text |

**Status:** N/A for learner submission; no Crosier dependency.

---

## 10. Portal copy (`study-app.js`)

| Issue | Fix |
|-------|-----|
| A.D. 31 without astronomy hedge | Horizon + SHEET_INSIGHTS theme updated 2026-10-12 |

**Status:** RESOLVED.

---

## 11. Sitting 2 “bronze armor” (unsourced)

| Fix | Proof |
|-----|-------|
| Removed “clothing his armies in bronze armor” | Dan 2:39 / 8:21 retain Greece identification; Gaugamela 331 B.C. kept |

**Status:** RESOLVED in `sheets-data.js` (authoritative learner source).

---

## Still interpretive / not machine-verified (disclosed)

- **nitsdaq / taher / ereb-boqer** lexicography — interpretive; Sitting 8 argues from usage  
- **Luther Smalcald / Vicar of Christ** (Sitting 7) — see `doublecheck/sitting-07.md`; not re-audited this pass  
- **106 cited-but-unquoted refs** — full-course proof marks REVIEW where ellipsis KJV; spot-check list in `GC_SUBMISSION_FULL_COURSE_INDEX.md`  
- **Antiochus tribute / ~1,080-day span** — partial fixes per PROPHECY corrections §2; circle episode confirmed via Livy/Polybius in Sitting 8  

---

## Automated gates (after this pass)

Run before submit:

```bash
node tools/verify/generate_gc_full_proof.mjs
node tools/review/build_linechecks.mjs
node tools/verify/verify_scripture.mjs
npm run lint
npm test
```
