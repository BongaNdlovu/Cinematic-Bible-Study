"""Patch sheets-data.js sheet 5 with generated HTML and updated metadata."""
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
html = (ROOT / "tools" / "sheet5_generated.html").read_text(encoding="utf-8")
data_path = ROOT / "js" / "study" / "sheets-data.js"
text = data_path.read_text(encoding="utf-8")

js_content = html.replace("\\", "\\\\").replace("`", "\\`").replace("${", "\\${")

new_block = f'''      {{
        id: 5,
        epoch: "SHEET 05 &bull; DANIEL 5",
        readTime: "18 min read",
        allocatedMinutes: 18,
        scripture: "Daniel 5:1-31 &bull; Babylon, October 11/12, 539 B.C.",
        title: "The Handwriting on the Plaster: The Fall of Babylon, the Divine Balance Sheet, and the Righteousness of Christ",
        subtitle: "Sacrilege against known light, Heaven's marketplace audit, and the only weight that can cover us.",
        flow: [
          {{ kind: "history", title: "The siege and the feast", text: "Medo-Persia encircles impregnable walls while Belshazzar toasts idols with holy vessels.", tag: "Daniel 5:1–3; October 539 B.C." }},
          {{ kind: "history", title: "Belshazzar was real", text: "Nabonidus Cylinders and the Verse Account confirm the co-regency — why 'third ruler' is precise.", tag: "BM 91125; BM 38299; Dan 5:16" }},
          {{ kind: "scripture", title: "Sacrilege against known light", text: "Temple vessels become toasting cups; Daniel 5:22: thou knewest all this.", tag: "Daniel 5:2–4, 22" }},
          {{ kind: "anchor", title: "The wall of audit", text: "MENE, TEKEL, PERES — numbered, weighed, divided. Marketplace weights become Heaven's ledger.", tag: "Daniel 5:25–28" }},
          {{ kind: "scripture", title: "The conqueror was named", text: "Isaiah named Cyrus and the open gates about 150 years before the night.", tag: "Isaiah 44:28; 45:1–3" }},
          {{ kind: "history", title: "The city falls in one night", text: "River diverted; chronicle says without battle; gold replaced by silver.", tag: "Daniel 5:30–31; BM 35382" }},
          {{ kind: "guard", title: "Found wanting, yet covered", text: "Cyrus types the Anointed Deliverer; only Christ's righteousness weighs enough on the scale.", tag: "Isa 45:1; 2 Cor 5:21" }}
        ],
        content: `
{js_content}
        `,
        christology: {{
                "kicker": "Christology",
                "title": "The Auditor Who Weighs — and the Righteousness That Covers",
                "scripture": "Daniel 5:25–28; Isaiah 45:1–3; John 5:22; 2 Corinthians 5:21; Romans 5:18–19",
                "body": [
                        "The hand that wrote on the plaster belongs to Jesus Christ, the Judge to whom the Father has committed all judgment (John 5:22). He numbers days, weighs souls, and closes accounts. Belshazzar was found wanting because he sinned against light he already possessed.",
                        "Cyrus, named God's anointed more than a century before he took Babylon (Isaiah 45:1), is a type of the true Messiah: he dried the river, opened the gates, and set captives free. Christ overthrows spiritual Babylon, conquers sin and death, and builds the New Jerusalem.",
                        "On our own merit the verdict is TEKEL — found wanting. On the cross Christ bore the full weight of justice; His righteousness is credited to the believer (2 Corinthians 5:21). When God weighs those who trust the Son, they possess the moral weight of Christ Himself."
                ]
        }},
        quizzes: [
          {{
            question: "Belshazzar brings the golden vessels taken from Yahweh's temple in Jerusalem into his banquet hall to toast Babylonian deities (Dan 5:2–4). What boundary did the king cross, and why was judgment instantaneous?",
            options: [
              "He deliberately conflated the holy with the profane, weaponizing sacred artifacts of true worship to exalt idols in an act of open defiance against the God of heaven, exhausting divine probation.",
              "He broke Babylonian etiquette by inviting noblewomen to a state military feast.",
              "He failed to pay the temple taxes owed to the priests of Marduk.",
              "He was drinking fermented wine instead of unfermented grape juice."
            ],
            correct: 0,
            explanation: "Daniel 5:22–23 records Daniel's indictment: Belshazzar knew his grandfather's humbling yet lifted himself up against the Lord of heaven, bringing the holy vessels into idol revelry.",
            diagnostics: [
              "Correct! Belshazzar's sin was conscious sacrilege: knowing the history of Nebuchadnezzar's humbling, he deliberately used the holy vessels of Yahweh to toast gods of gold, silver, brass, iron, wood, and stone.",
              "Misconception: While court customs existed, Daniel's indictment focuses entirely on spiritual rebellion against the Lord of heaven (Dan 5:22-23).",
              "Misconception: Belshazzar had no debt to Marduk; the divine judgment arrived because he insulted the Creator God whose breath was in his nostrils.",
              "Misconception: The transgression was the intentional profanation of holy temple vessels to toast false gods, not the chemical classification of the beverage."
            ]
          }},
          {{
            question: "A historian claims that the fall of Babylon on October 12, 539 B.C. was an unexpected coincidence unrelated to prophetic foresight. How does the inscription MENE, MENE, TEKEL, UPHARSIN together with Isaiah 45:1 refute this?",
            options: [
              "The inscription accurately computed the sovereign audit (Numbered, Weighed, Divided), and Isaiah 45:1 had named Cyrus more than a century earlier, predicting that the two-leaved gates along the Euphrates riverbed would not be shut when the river was diverted.",
              "The Medo-Persians used modern artillery to breach the northern walls of Babylon.",
              "Babylon voluntarily opened its gates to become a protectorate under Greek rule.",
              "Daniel forged the inscription on the plaster using invisible phosphorus ink."
            ],
            correct: 0,
            explanation: "God's word authenticated both the moral judgment (MENE, TEKEL, PERES) and the military mechanism: Cyrus diverted the Euphrates, entering through unlocked river gates foretold in Isaiah 45:1.",
            diagnostics: [
              "Correct! Isaiah 45:1-3 named Cyrus roughly a century and a half before Babylon fell and foretold the open two-leaved river gates, while the plaster writing in Daniel 5 announced the exact night the empire was divided and given to the Medes and Persians.",
              "Misconception: Artillery did not exist in 539 B.C.; Xenophon and Herodotus confirm Cyrus diverted the Euphrates, allowing troops to march into the city via the riverbed.",
              "Misconception: Greece was the third empire (bronze, 331 B.C.); in 539 B.C., Babylon fell to the Medo-Persian empire (silver).",
              "Misconception: The handwriting appeared from a mysterious detached hand in full view of the king and 1,000 lords, confounding all Babylonian astrologers until Daniel read it."
            ]
          }}
        ],
        studyGuide: {{
          trace: [
            {{
              do: "Read Daniel 5:2–4, then trace those vessels back to Daniel 1:2 where they first entered Babylon.",
              why: "Chapter 5 completes a line of profanation that began at the exile. Skip the vessels and Babylon's fall looks like a mere siege story."
            }},
            {{
              do: "Read Daniel 5:18–23. Write what Belshazzar knew from Nebuchadnezzar's story and still refused to honor.",
              why: "Judgment is just because it falls on a man who sinned against knowledge his own family had published. Mercy taught one generation; the next refused the lesson."
            }},
            {{
              do: "Study the wall-of-audit diagram. Write one verb beside each word: numbered, weighed, divided.",
              why: "MENE, TEKEL, PERES are marketplace weights read as Heaven's ledger. Every kingdom in the book is numbered, weighed, and eventually replaced."
            }},
            {{
              do: "Read Daniel 5:30–31 beside Isaiah 45:1–3. Note who was named, and what happened to the river gates.",
              why: "October 539 was not improvisation. Cyrus was named; the gates stood open; gold became silver in a single night."
            }},
          ],
          christ: {{
            claim: "The hand that weighed Belshazzar belongs to the Judge who weighs every soul. On our own we are TEKEL; in Christ we possess His righteousness.",
            why: "Cyrus types the Anointed Deliverer. Christ is the true Messiah who overthrows spiritual Babylon and covers those found wanting (2 Corinthians 5:21)."
          }},
          now: {{
            claim: "Cultures still feast with borrowed holy things — bodies, days, and names treated as party props — while walls look impregnable until the river drops.",
            why: "If you treat this chapter as ancient spectacle, you will envy banquets Scripture would call already weighed. Refuse to toast with stolen vessels."
          }},
          help: {{
            claim: "This sheet teaches you to read a collapse as an audit Heaven already wrote, not as random chaos.",
            why: "A fall that looks sudden to the crowd may be the closing entry on a ledger Heaven opened long ago. Daniel could read the wall because he knew the God who keeps accounts."
          }},
          value: {{
            claim: "Knowing that the gold kingdom ended on a dated night in 539 makes every later empire less absolute — including the one you live under now.",
            why: "If Babylon could fall in a single night after being numbered and weighed, no metal you live under is the final word in history."
          }},
          ask: [
            "What holy thing am I treating as a toast or a trophy rather than belonging to God?",
            "Belshazzar knew Nebuchadnezzar's story. What family lesson from Scripture am I ignoring?",
            "When God weighs me, am I standing in my own merit or in the righteousness of Christ?",
          ]
        }},
        guide: {{
          intro: {{
            title: "Vessels, MENE, and 539",
            expect: "Co-regency history, sacrilege against light, the wall of audit, Cyrus named, and Christ's covering righteousness.",
            do: [
              "Follow the introduction and Main Points I–V plus the practical application.",
              "Open Map at the fall of Babylon, the banquet, and the vessels' home in Jerusalem. View the 3D artifact.",
              "Complete checkpoint questions, then continue to Daniel 6."
            ]
          }},
          end: {{
            title: "The den is next",
            nextWhy: "Daniel 6: an irrevocable law, an open window toward Jerusalem, and a sealed pit at dawn.",
            spotlight: "next-sheet-btn"
          }}
        }}
      }},'''

pattern = r'      \{\s*\n\s*id: 5,.*?\n      \},\s*\n      \{\s*\n\s*id: 6,'
m = re.search(pattern, text, re.DOTALL)
if not m:
    raise SystemExit("Could not find sheet 5 block")
text = text[:m.start()] + new_block + "\n      {\n        id: 6," + text[m.end():]
data_path.write_text(text, encoding="utf-8")
print("Patched", data_path)
