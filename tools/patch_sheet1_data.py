"""Patch sheets-data.js sheet 1 with generated HTML and updated metadata."""
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
html = (ROOT / "tools" / "sheet1_generated.html").read_text(encoding="utf-8")
data_path = ROOT / "js" / "study" / "sheets-data.js"
text = data_path.read_text(encoding="utf-8")

js_content = html.replace("\\", "\\\\").replace("`", "\\`").replace("${", "\\${")

new_block = f'''      {{
        id: 1,
        epoch: "SHEET 01 &bull; DANIEL 1",
        readTime: "18 min read",
        allocatedMinutes: 18,
        scripture: "Daniel 1:1-21 &bull; Babylon, 605 B.C.",
        title: "The Exilic Crucible: Identity, Consecration, and the Redemptive Obedience of Christ",
        subtitle: "Sovereign exile, the battle for identity at Babylon's table, and how Daniel's stand points to the faithful Son.",
        flow: [
          {{ kind: "scripture", title: "Shinar and sovereign judgment", text: "Exile to Babel's plain is not Marduk's victory — the Lord gave Jehoiakim into Nebuchadnezzar's hand.", tag: "Daniel 1:1–2; Jer 25:9–12" }},
          {{ kind: "history", title: "Three sieges, three dates", text: "605 (Daniel's levy), 597 (Jehoiachin, BM 21946), 586 (temple burned) — Isaiah 39:7 fulfilled.", tag: "2 Kings 24–25" }},
          {{ kind: "scripture", title: "The conflict of names", text: "Yahweh-confessing names become Bel/Aku/Nebo honors — civic roll ≠ worship.", tag: "Daniel 1:7" }},
          {{ kind: "anchor", title: "The line at the royal table", text: "Daniel purposed in his heart not to defile himself — idol table-fellowship, Levitical breach, dulled clarity.", tag: "Daniel 1:8" }},
          {{ kind: "history", title: "Zeroim and the ten-day test", text: "Seed-grown foods echo Genesis 1:29; God gave wisdom ten times better — not the vegetables.", tag: "Daniel 1:12–20" }},
          {{ kind: "anchor", title: "Typology of the faithful Son", text: "Daniel in exile foreshadows Christ in the wilderness — bread, kingdoms, and covenant fidelity.", tag: "Matt 4:4; Heb 4:15" }},
          {{ kind: "guard", title: "Civic competence, covenant boundaries", text: "Excel in Babylon's court; draw the line when conscience, worship, or God's Word is demanded.", tag: "Daniel 1:3–8" }}
        ],
        content: `
{js_content}
        `,
        christology: {{
                "kicker": "Christology",
                "title": "The Redemptive Obedience of the Faithful Son",
                "scripture": "Daniel 1:8; Matthew 4:1–10; John 4:34; Hebrews 4:15",
                "body": [
                        "Daniel's quiet courage at the royal table is a prophetic type of Jesus Christ. Like Daniel in exile, the Son entered an alienated world and was tempted at the point of appetite — yet refused every illicit compromise (Matthew 4:1–4).",
                        "Where Adam fell at a table and Israel failed through appetite, Jesus answered: 'Man shall not live by bread alone.' His meat was to do the Father's will (John 4:34), culminating in the cross.",
                        "Daniel inspires us, but cannot save us when we fail. We have a High Priest tempted in all points like as we are, yet without sin (Hebrews 4:15). Stand in His imputed righteousness — not willpower alone."
                ]
        }},
        quizzes: [
          {{
            question: "An executive asks how to navigate corporate advancement while maintaining biblical integrity. How does Daniel 1 define the boundary between secular engagement and covenant defilement?",
            options: [
              "Daniel mastered Chaldean statecraft, language, and court administration (civic skill), but drew an absolute line at food tied to pagan worship and unclean flesh under Leviticus 11 (covenant defilement).",
              "Daniel staged an immediate violent boycott against the Babylonian civil service to avoid any association with pagans.",
              "Daniel accepted both the king's diet and Babylonian idolatry temporarily, reasoning that outward compliance does not affect inward faith.",
              "Daniel refused to learn the Chaldean language because studying foreign literature violates the first commandment."
            ],
            correct: 0,
            explanation: "Daniel 1:8 establishes that secular skill and civil excellence can be rendered to a foreign state, but worship and biblical dietary laws remain inviolable.",
            diagnostics: [
              "Correct! Daniel distinguished secular skill from covenant defilement, mastering civil statecraft while refusing idolatrous food.",
              "Misconception: Daniel never staged a violent rebellion; he demonstrated exceptional civil competence and respectful diplomacy.",
              "Misconception: Gnostic separation of inward faith from outward compliance contradicts Daniel 1:8, which says he purposed not to defile himself in body or spirit.",
              "Misconception: Daniel willingly mastered Chaldean language and literature (Dan 1:4, 17), proving education is not sin unless it demands idolatry."
            ]
          }},
          {{
            question: "A skeptic claims Daniel's request for zeroim (Dan 1:12) was merely a personal dietary fad with no theological significance. What is the biblical and linguistic meaning of zeroim?",
            options: [
              "Zeroim derives from zera (seed) and refers to legumes, grains, and seed-bearing vegetation, deliberately echoing the unfallen Creator's Edenic diet of Genesis 1:29 to preserve clarity and honor Leviticus 11.",
              "Zeroim means fermented royal wine mixed with herbal infusions to ward off palace diseases.",
              "Zeroim refers to rare sacrificial meats from the temple of Bel-Marduk reserved only for elite court astrologers.",
              "Zeroim is an Aramaic political term for an armed hunger strike."
            ],
            correct: 0,
            explanation: "Zeroim (זֵרֹעִים) points back to the seed-bearing diet of Genesis 1:29, affirming God as Creator and guarding the youth from sacrificial defilement.",
            diagnostics: [
              "Correct! Zeroim derives from zera (seed), echoing the original Genesis 1:29 diet to preserve moral and cognitive clarity.",
              "Misconception: Daniel explicitly rejected royal wine and requested water to drink (Dan 1:12).",
              "Misconception: Zeroim is strictly plant-based food, requested specifically to avoid sacrificial meats offered to pagan gods.",
              "Misconception: Zeroim is Hebrew for things sown/vegetables, not a political or legal term."
            ]
          }}
        ],
        studyGuide: {{
          trace: [
            {{
              do: "Read Daniel 1:1–2 and Jeremiah 25:9–12. Write one sentence: who gave Jehoiakim to Babylon, and why?",
              why: "Exile is sovereign judgment, not Marduk's independent victory. Missing that turns chapter 1 into a talent story instead of a covenant narrative."
            }},
            {{
              do: "Study the three-siege diagram. Label 605, 597, and 586 with what happened in each campaign.",
              why: "Daniel's capture in 605 is not the temple burning in 586. Collapsing the dates breaks the historical frame of the chapter."
            }},
            {{
              do: "Compare the names diagram with Daniel 1:7. What did Babylon take (the roll) and what did Daniel keep (worship)?",
              why: "Belteshazzar on a scroll is not prayer to Bel. Civic competence and covenant worship are not the same line."
            }},
            {{
              do: "Read Daniel 1:8, 12–17 beside Leviticus 11 and Genesis 1:29. Note: purpose → obedience → wisdom.",
              why: "Consecration at the table preceded the gift of understanding. God gave wisdom — not the vegetables."
            }},
          ],
          christ: {{
            claim: "Daniel's table stand foreshadows Christ refusing bread and kingdoms in the wilderness — the faithful Son whose obedience redeems our failures.",
            why: "Matthew 4 and Hebrews 4:15 show the same loyalty Daniel kept in exile, perfected in the Son who is our High Priest."
          }},
          now: {{
            claim: "Modern Babylon still offers a new name, a feed, and a cup. Civic excellence is allowed; worship at the world's table is not.",
            why: "Daniel shows you can serve faithfully in a foreign court without giving away the worship that makes you fit to hear from God."
          }},
          help: {{
            claim: "This sheet shows where the first stand actually is — skill you can offer vs. a table you cannot share.",
            why: "I can do the work, but I will not worship another god to keep the job — that is the line Daniel drew before any empire chart."
          }},
          value: {{
            claim: "Identity that survives renaming is more valuable than a career bought by breaking covenant at the king's table.",
            why: "The man who kept that line was the one God chose to receive chapter 2's dream."
          }},
          ask: [
            "What king's meat is on my table this week?",
            "Have I confused civic competence with covenant surrender?",
            "Am I standing on Christ's righteousness — or willpower alone?",
          ]
        }},
        guide: {{
          intro: {{
            title: "Identity, consecration, and the faithful Son",
            expect: "Three sieges of Jerusalem, the conflict of names, the dietary crisis at the royal table, and Christ as the redemptive apex.",
            do: [
              "Follow Main Points 1–4 and the practical application section.",
              "Complete the workbench (names + consecration line), then checkpoint questions.",
              "Open Map nodes for siege, court school, and Zion — then the 3D artifact."
            ]
          }},
          end: {{
            title: "The colossus is next",
            nextWhy: "Daniel 2: the forgotten dream, the metals, and the stone cut without hands — because chapter 1 already proved loyalty.",
            spotlight: "next-sheet-btn"
          }}
        }}
      }},'''

pattern = r'      \{\s*\n\s*id: 1,.*?\n      \},\s*\n      \{\s*\n\s*id: 2,'
m = re.search(pattern, text, re.DOTALL)
if not m:
    raise SystemExit("Could not find sheet 1 block")
text = text[:m.start()] + new_block + "\n      {\n        id: 2," + text[m.end():]
data_path.write_text(text, encoding="utf-8")
print("Patched", data_path)
