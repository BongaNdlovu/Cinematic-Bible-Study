# 666 / Dura dimensions — check proof and correction proof

**Date:** 2026-10-07  
**Standard:** BRI only (Scripture + official SDA/BRI literature). Learner-facing copy does not name BRI.

## The statement that was found (not BRI)

> The image on the Plain of Dura measured sixty cubits in height and six cubits in breadth (Daniel 3:1). Ancient Babylon used a base-60 (sexagesimal) mathematical system. In Revelation 13:18, the number characterizing the counterfeit end-time power is explicitly designated as "six hundred threescore and six" (666) — a striking biblical echo of Babylonian units of pride and idolatry. The echo is suggestive; Revelation itself says the number is a man's number.

**Verdict: not correct as BRI teaching.** Piece-by-piece:

| Clause | Verdict | Proof |
|---|---|---|
| Sixty cubits high, six cubits broad | Confirmed | KJV Daniel 3:1: “whose height was threescore cubits, and the breadth thereof six cubits.” |
| Ancient Babylon used base-60 | History, not the BRI key | True as extra-biblical history; BRI/ABSG never uses sexagesimal math to explain 666. |
| 666 is “a striking biblical echo of Babylonian units of pride and idolatry” | Overclaim / Conflicts | No BRI paper, DARCOM volume, or SDABC note identifies 666 as a sexagesimal echo of Dura cubits. |
| “The echo is suggestive; … a man's number” | Mixed | Rev 13:18 KJV does say “it is the number of a man.” Calling Dura’s cubits a biblical echo still teaches a link BRI does not make as inspired arithmetic. |

## What BRI actually teaches

### 1. Scripture

- Daniel 3:1 (KJV): threescore cubits by six cubits; all gold; set up in the plain of Dura.
- Revelation 13:18 (KJV): “count the number of the beast: for it is the number of a man; and his number is Six hundred threescore and six.”
- The load-bearing Daniel 3 ↔ Revelation 13 link in the same quarterly is **forced worship**: image, decree, death (Dan 3:1–6, 15–18; Rev 13:15–16; 14:12).

### 2. BRI-authored Adult Bible Study Guide, *Daniel*, 1Q 2020, week 4 (Elias Brasil de Souza, then BRI director)

Monday (“The Call to Worship”), public text at  
https://ssnet.org/lessons/20a/less04.html

> Six categories of people are said to give allegiance to the image of the beast: “small and great, rich and poor, free and slave”. The number of the beast, which is 666, also emphasizes six. This shows that the image erected by Nebuchadnezzar is just an **illustration** of what the eschatological Babylon will do in the last days (**see Dan. 3:1 for the imagery of six and sixty**).

That is illustration via six-and-sixty **imagery**, not a sexagesimal cipher.

The same lesson: all-gold image as pride after Daniel 2; type of Revelation 13 forced worship; fourth figure as pre-incarnate Christ; final deliverance is the resurrection (1 Cor 15).

### 3. BRI FAQ on 666

https://adventistbiblicalresearch.org/articles/answers-to-questions-on-the-mark-of-the-beast-and-end-time-events

> The Seventh-day Adventist Church **does not have an official position** on this question but there are two major views among us on the number of the beast, 666… Some interpret it as a cryptic reference to the papal title Vicarius Filii Dei… Others view it as a triple six indicative of a Satanic trinity… The Greek text, however, is literally **600 + 60 + 6, not three sixes or a triple six**.

So: no official BRI decoding of 666; 777-vs-counterfeit-trinity is **one unofficial view**, not “official BRI exegesis”; the Greek form is 600+60+6.

### 4. Irenaeus (history, not BRI)

*Against Heresies* 5.29.2 (ANF): Noah’s 600 years + Nebuchadnezzar’s 60-by-6 cubits “indicate the number of the name.” Patristic allegory. Not the BRI control line. If mentioned, it must be labeled as Irenaeus.

## Why the later “official BRI / 777” rewrite also failed

The 2026-10-07 commit replaced the sexagesimal echo with:

> official BRI exegesis clarifies that Revelation 13:18 … symbolizing fallen humanity and the counterfeit trinity perpetually falling short of divine perfection (777), rather than an inspired mathematical echo of Babylonian units.

Problems under the same standard:

1. Learner-facing “official BRI exegesis” brands the institute (OneVoice27 forbids SDA/BRI branding in public copy).
2. It states as BRI fact a view BRI itself says is unofficial, and ignores BRI’s note that the Greek is 600+60+6 not a triple six.
3. It denies any six/sixty imagery, which **contradicts** the BRI-authored 2020 quarterly.

## Correction applied (learner-facing, BRI-only)

Kicker: **Six and sixty as illustration**

> The image on the Plain of Dura measured sixty cubits in height and six cubits in breadth (Daniel 3:1). Revelation 13:18 names six hundred threescore and six as the number of a man. Daniel 3:1's six-and-sixty measurements illustrate the later crisis; they do not decode the number by Babylonian arithmetic. Revelation 13 lists six classes of people pressed to worship the image of the beast, and 666 likewise emphasizes six. The load-bearing link is the worship pattern: a universal decree, an image, a death penalty, and commandment-keepers who refuse (Daniel 3:1–6, 18; Revelation 13:15–16; 14:12).

**Correction proof:** each clause is either Daniel 3:1 / Revelation 13:18 wording, or a paraphrase of ABSG 2020 week 4 Monday (illustration, six classes, 666 emphasizes six, Dan 3:1 six-and-sixty imagery), plus the quarterly’s forced-worship typology. No sexagesimal cipher, no 777, no “official BRI” label.

## Surfaces updated with this correction

| File | What changed |
|---|---|
| `js/study/sheets-data.js` | Historical note + quiz explanation |
| `tools/build_sheet3_html.py` | Same historical note (generator) |
| `tools/sheet3_generated.html` | Same historical note |
| `tools/patch_sheet3_data.py` | Quiz explanation |
| `js/study/sheet-map.js` | “The sixes…” → “Daniel 3:1’s six-and-sixty image…” |
| `js/study/sheet-verify.js` | Verify check no longer says “Babylon counted in sixties” as a cipher |
| `js/gallery/app.js` | Dura 60-by-6 hotspot |

Related BRI-only trim (not 666 math, but the same FAQ):

| File | What changed |
|---|---|
| `js/study/sheets-data.js` sitting 7 | Dropped Vicarius Filii Dei / infallibility as if they were the Daniel 7:25 proof; keep Vicar of Christ + Mark 2:7 (forgive sins) |
| `tools/build_sheet7_html.py`, `tools/sheet7_generated.html` | Same |
| `js/map/map-data.js` Ulai pin | Vision date (c. 551) distinguished from 457 start via Daniel 9 |

## What this file does not yet close

Source-by-source review of the remaining quiz, guide, glossary, verify, workbench, map, and timeline units is in progress under four Grok 4.6 audits. Findings from those passes will be merged into `tools/review/bri-strict/` and applied the same way: BRI source first, then rewrite, then proof of the rewrite.
