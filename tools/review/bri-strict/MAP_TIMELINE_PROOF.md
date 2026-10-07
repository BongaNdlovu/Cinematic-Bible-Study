# Map / timeline / gallery — BRI must-fix proof

**Date:** 2026-10-07  
**Source of findings:** Grok 4.6 audit [map, timeline, gallery](c58a50fb-ab53-45c5-802a-36c5327ebcf7)  
**Standard:** BRI only. ABSG *Daniel* 1Q 2020 (Elias Brasil de Souza); sitting 10 *’amad* re-anchor already in `sheets-data.js`.

Sitting 8’s study-map camera stays on `y1844` because that is the **landing** of the 2,300 evenings-mornings (ABSG weeks 9–10), not the date of the Ulai vision. The vision pin and first node now carry Belshazzar’s third year.

| # | Claim that failed | BRI / Scripture proof | Correction applied | Correction proof |
|---|---|---|---|---|
| 1 | Ulai event `yearId: "y457"` and kicker “Anchor for 457 B.C.” collapsed the vision into the later start date | Dan 8:1–2: third year of Belshazzar, at Shushan/Ulai. ABSG 2020 week 9 dates the vision 548/547 (course: c. 551). Week 10: Dan 9 / Ezra 7 **starts** the 2300 at 457. | `ulai-vision` now `yearId: "y539"` (late-Babylon hinge, nearest existing epoch). Kicker: “c. 551 B.C. · Belshazzar’s third year.” Body keeps 457 as later arithmetic start via Dan 9. Sitting 8 `SITTING_YEARS` adds `y539` so the pin stays in-scope. | Vision dated from Dan 8:1, not Ezra 7. 457 remains only on `artaxerxes-decree`. |
| 2 | City `susa` cited Daniel 8:2 on a 457 Ezra-7 card | Dan 8:2 is the Ulai vision, not Artaxerxes’ seventh year | Scripture is now `Ezra 7:12–26` only. Ulai keeps Dan 8:1–14. | 457 city card no longer carries a Belshazzar verse. |
| 3 | Sitting 8 pack year `y1844` made Ulai look like an 1844 event | Same as row 1. 1844 is nitsdaq landing (Dan 8:14 + 9:24–25), not the vision. | Camera remains `y1844` (landing). Summary and Ulai node kicker now print Belshazzar’s third year / c. 551. Sanctuary node kicker: “1844 · Karaite tenth day.” | Two dates, two labels: vision vs landing. |
| 4–5 | Gallery Michael used inverted sit/stand priest typology | Heb 10:11–12: priests **stand** daily; Christ **sat down**. ABSG 2020 week 13: Michael’s stand is military and judicial. Sitting 10 already uses Dan 11 *’amad*. | `mic-stand` hotspot and `michael.explanation` now use Dan 11:2–4, 7, 20–21. Same error also removed from `SHEET_VERIFY[10]` Dan 12:1–2 check. | Matches sitting 10 article; no Heb 10 inversion. |
| 6 | Gallery `stump-seven`: “Seven **prophetic** times” | ABSG 2020 week 5: seven times = seven **literal years**. Dan 4:16, 25, 32–36: the king is restored in his own life. Year-day does not apply to this court narrative. | “Seven ordinary years of madness… (Daniel 4:16, 25, 32).” | “Prophetic” deleted. |
| 7 | Timeline title “October 22, 1844 … / Yom Kippur” with no Karaite label | Dan 8:14 names no calendar day. ABSG weeks 9–10 print **the year** 1844. Course may keep 22 Oct if labeled Karaite tenth day. Rabbinic Yom Kippur 1844 is not that Millerite day. | Title: “1844 — Cleansing of the Sanctuary.” Desc/pioneerNote label 22 Oct as Karaite visible-moon tenth day; quarterly prints the year. | Year is load-bearing; day is labeled finer claim. |
| 8 | Epoch `y1844` kicker “22 October 1844 · America”; event `sanctuary-1844` kicker “22 Oct 1844” | Same as row 7 | Epoch kicker: “1844 · Karaite tenth day · America.” Event kicker: “1844 · Karaite tenth day,” with the day explained in the body. | Same hedge as Exeter pin. |
| 9 | Carthage kicker “A western **rib** of iron” | ABSG 2020 week 8: Dan 7:5 ribs = **Lydia, Babylon, Egypt** (the bear), not Rome | Kicker: “Rome’s western rival.” Scripture stays Dan 7:7, 23. | Rib language reserved for the bear. |

## Files touched

- `js/map/map-data.js`
- `js/shared/journey.js` (`SITTING_YEARS[8]` adds `y539`)
- `js/study/sheet-map.js`
- `js/study/sheets-data.js` (`timelineEpochs` 1844)
- `js/gallery/app.js`
- `js/study/sheet-verify.js` (sitting 10 Michael check)
