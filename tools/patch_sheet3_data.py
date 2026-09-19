"""Patch sheets-data.js sheet 3 with generated HTML and updated metadata."""
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
html = (ROOT / "tools" / "sheet3_generated.html").read_text(encoding="utf-8")
data_path = ROOT / "js" / "study" / "sheets-data.js"
text = data_path.read_text(encoding="utf-8")

js_content = html.replace("\\", "\\\\").replace("`", "\\`").replace("${", "\\${")

new_block = f'''      {{
        id: 3,
        epoch: "SHEET 03 &bull; DANIEL 3",
        readTime: "18 min read",
        allocatedMinutes: 18,
        scripture: "Daniel 3:1-30 &bull; Plain of Dura, c. 594 B.C.",
        title: "The Plain of Dura: Forced Worship, the \\\"But If Not\\\" Faith, and Christ in the Fire",
        subtitle: "Nebuchadnezzar's imperial veto, the Daniel 3 / Revelation 13 blueprint, and the Fourth who walks in the flames.",
        flow: [
          {{ kind: "scripture", title: "The imperial veto", text: "All-gold image (60×6) rejects Daniel 2's succession — Babylon declared eternal.", tag: "Daniel 3:1; 2:38" }},
          {{ kind: "scripture", title: "Bow or burn", text: "Universal decree enforced by furnace; second commandment forbids the bow.", tag: "Daniel 3:4–6; Exod 20:4–5" }},
          {{ kind: "anchor", title: "Civil duty has a ceiling", text: "Exemplary administrators who render Caesar labor but refuse Caesar worship.", tag: "Dan 2:49; Matt 22:21; Acts 5:29" }},
          {{ kind: "scripture", title: "Dura → Revelation 13", text: "Decree, image, death penalty, commandment-keepers — type and antitype.", tag: "Daniel 3 ↔ Rev 13:14–17; 14:12" }},
          {{ kind: "anchor", title: "But if not", text: "God is able to deliver — but if not, we will not bow. Obedience priced before rescue.", tag: "Daniel 3:17–18" }},
          {{ kind: "scripture", title: "Four men in the fire", text: "The form of the fourth is like the Son of God — ropes burn, bodies unharmed.", tag: "Daniel 3:25, 27" }},
          {{ kind: "guard", title: "Dura and Calvary", text: "Christ walks beside His servants at Dura; at Calvary He entered the fire alone for our sins.", tag: "Isa 53; 2 Cor 5:21; Rev 20:14" }}
        ],
        content: `
{js_content}
        `,
        christology: {{
                "kicker": "Christology",
                "title": "Christ in the Fire and on the Cross",
                "scripture": "Daniel 3:25; Isaiah 43:2; Isaiah 53:4–10; 2 Corinthians 5:21; Luke 20:18",
                "body": [
                        "The fourth figure walking in the flames was a pre-incarnate appearance of the Son of God. Jesus did not keep His servants out of the furnace; He stepped into it to walk beside them. The ropes burned away; their bodies, garments, and hair were untouched (Daniel 3:25, 27).",
                        "At Calvary, Christ entered the consuming fire of God's judgment against sin alone — not delivered, but consumed for our guilt so we will never face the second death (Isaiah 53:10; 2 Corinthians 5:21). Dura's deliverance points to the cross's expiation.",
                        "Cultivate non-transactional 'but if not' faith. Christ does not promise escape from every earthly furnace, but He promises presence in the fire and resurrection beyond it (John 11:25–26)."
                ]
        }},
        quizzes: [
          {{
            question: "A provincial magistrate reasons with the three Hebrews: 'The King's decree does not ask you to renounce Yahweh in your heart; it merely asks for a 2-second outward bow as a demonstration of civic patriotism. God understands your private intent.' How does authentic biblical faith evaluate this rationalization?",
            options: [
              "The magistrate is proposing situational compromise: Exodus 20:4–5 explicitly forbids bowing down to any graven image, proving that outward physical homage constitutes covenant defilement regardless of internal mental reservations.",
              "The magistrate is applying Preterism, which permits civil idolatry if the ruler is an anointed monarch.",
              "The magistrate is correct because Romans 13 commands unconditional obedience to governing authorities in all matters including worship.",
              "The magistrate is applying Dispensationalism, which suspends the Ten Commandments during Gentile captivity."
            ],
            correct: 0,
            explanation: "Daniel 3 establishes the inviolable boundary between legitimate civil obedience and state-coerced religious homage. The second commandment strictly forbids the physical act of bowing before any image.",
            diagnostics: [
              "Correct! The second commandment (Exodus 20:4-5) forbids bowing down before images; outward physical compliance cannot be separated from covenant defilement by appealing to private thoughts.",
              "Misconception: Preterism is an eschatological system dating prophetic fulfillments to antiquity; it is not an ethical framework permitting idolatry.",
              "Misconception: Romans 13:1-7 ordains magistrates for civil order, but Acts 5:29 and Daniel 3 clarify that when human law commands disobedience to God's law, God's authority is absolute.",
              "Misconception: Dispensationalism is a 19th-century prophetic schema; the issue at Dura is the timeless moral authority of the Decalogue over state edicts."
            ]
          }},
          {{
            question: "An archaeological lecturer asks why Nebuchadnezzar made the Dura image 60 cubits by 6 cubits and cast entirely of gold, with no silver, bronze, or iron sections. What does this design reveal?",
            options: [
              "It was a direct theological rebellion against the divine revelation of Daniel 2, defiantly proclaiming that Babylon's gold dominion would endure forever without being succeeded by another empire.",
              "It was a literal copy of the Daniel 2 dream intended to honor the God of heaven.",
              "It was an artistic limitation because the Babylonian royal treasury possessed gold but lacked copper and silver mines.",
              "It was an obelisk dedicated to the Roman emperor Titus to commemorate the fall of Jerusalem."
            ],
            correct: 0,
            explanation: "By casting an entire colossus in gold (60x6 cubits, sexagesimal system), Nebuchadnezzar rejected the divine declaration of succession, asserting perpetual Babylonian supremacy.",
            diagnostics: [
              "Correct! In Daniel 2, Babylon was only the head of gold. Casting the entire statue in gold was an act of open defiance, asserting that Babylon would never give way to silver, bronze, or iron.",
              "Misconception: The Daniel 2 colossus consisted of four distinct metals and divided feet; casting the Dura image entirely in gold explicitly contradicted the vision.",
              "Misconception: Babylon had vast trade networks and tributary wealth in silver and bronze; the all-gold composition was an intentional theological statement, not a material shortage.",
              "Misconception: Titus lived 650 years later during the Roman Empire; Daniel 3 is set in the 6th century B.C. Neo-Babylonian Empire."
            ]
          }}
        ],
        studyGuide: {{
          trace: [
            {{
              do: "Compare the theological collision diagram: Daniel 2 vs. Daniel 3. What did Nebuchadnezzar reject?",
              why: "The all-gold image is an imperial veto — Babylon eternal, no succession, no Stone. Skip that and Dura is random royal vanity."
            }},
            {{
              do: "Read Exodus 20:4–5 and Daniel 3:17–18. Write: where does civil service stop and worship begin?",
              why: "The three served the king in every lawful matter but refused the bow. The second commandment forbids the act itself."
            }},
            {{
              do: "Study the Daniel 3 / Revelation 13 blueprint table. List the four repeating elements.",
              why: "Decree, image, death penalty, commandment-keepers — Dura is the type; Revelation 13 is the global antitype."
            }},
            {{
              do: "Read Daniel 3:25 and write the phrase but if not beside it. What does each teach?",
              why: "But if not prices obedience before rescue. The fourth figure shows loyalty is never alone — Christ walks in the fire."
            }},
          ],
          christ: {{
            claim: "At Dura, Christ walks beside His servants. At Calvary, He entered the fire alone for our sins. Both reveal the same Son who refuses false worship.",
            why: "Drop Christ from Daniel 3 and you have bravery without gospel. Keep Him and Dura preaches presence in trial and expiation at the cross."
          }},
          now: {{
            claim: "States and markets still sell belonging for a bow, a slogan, or a silence. Dura is the rehearsal, not ancient spectacle.",
            why: "Revelation 13 is in the canon because Dura was kept in the canon first. The pattern scales; the loyalty test repeats."
          }},
          help: {{
            claim: "This sheet trains non-transactional faith — God can deliver, but God must deliver or I will not obey is not faith.",
            why: "Daniel 3:17 and 3:18 are both needed. Decide whose command comes first when the orchestra plays."
          }},
          value: {{
            claim: "A conscience that can say but if not is more valuable than a forecast of how hot the fire will be.",
            why: "You can lose a timeline prediction and still stand. You cannot lose but if not and still call it faith."
          }},
          ask: [
            "What bow is being asked of me that Daniel 3:18 would refuse?",
            "Am I bargaining with God for rescue before I will obey?",
            "Do I see Dura's Fourth Figure in Calvary's cross?",
          ]
        }},
        guide: {{
          intro: {{
            title: "Dura, the furnace, and Christ in the fire",
            expect: "Imperial veto, civic duty vs. worship, Revelation 13 blueprint, but if not faith, and the Fourth in the flames.",
            do: [
              "Follow the introduction and Main Points I–IV — use the diagrams to trace type to antitype.",
              "Open Map at Dura and stand at the commandment in Jerusalem. View the 3D artifact.",
              "Complete checkpoint questions, then continue to Daniel 4."
            ]
          }},
          end: {{
            title: "The tree is next",
            nextWhy: "Daniel 4: the Watcher, the banded stump, and the king who learns that the Most High rules.",
            spotlight: "next-sheet-btn"
          }}
        }}
      }},'''

pattern = r'      \{\s*\n\s*id: 3,.*?\n      \},\s*\n      \{\s*\n\s*id: 4,'
m = re.search(pattern, text, re.DOTALL)
if not m:
    raise SystemExit("Could not find sheet 3 block")
text = text[:m.start()] + new_block + "\n      {\n        id: 4," + text[m.end():]
data_path.write_text(text, encoding="utf-8")
print("Patched", data_path)
