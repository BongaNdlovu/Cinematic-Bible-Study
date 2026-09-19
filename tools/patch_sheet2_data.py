"""Patch sheets-data.js sheet 2 with generated HTML and updated metadata."""
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
html = (ROOT / "tools" / "sheet2_generated.html").read_text(encoding="utf-8")
data_path = ROOT / "js" / "study" / "sheets-data.js"
text = data_path.read_text(encoding="utf-8")

js_content = html.replace("\\", "\\\\").replace("`", "\\`").replace("${", "\\${")

new_block = f'''      {{
        id: 2,
        epoch: "SHEET 02 &bull; DANIEL 2",
        readTime: "20 min read",
        allocatedMinutes: 20,
        scripture: "Daniel 2:1-49 &bull; Babylon, 603 B.C.",
        title: "The Metallic Colossus: The Historicist Blueprint of History and the Sovereign Triumph of Christ",
        subtitle: "From the impasse of human wisdom to the stone that fills the earth — God's unbroken chain of empires and Christ's everlasting kingdom.",
        flow: [
          {{ kind: "scripture", title: "Human wisdom bankrupt", text: "Magicians confess impotence; Daniel prays — there is a God in heaven that revealeth secrets.", tag: "Daniel 2:10–11, 28" }},
          {{ kind: "anchor", title: "The master-framework", text: "Gold → silver → bronze → iron → iron/clay feet → Stone. One contiguous chain.", tag: "Daniel 2:31–35" }},
          {{ kind: "scripture", title: "Thou art this head of gold", text: "Babylon fixed and non-repeatable; each metal follows after thee.", tag: "Daniel 2:38–40" }},
          {{ kind: "history", title: "Metallurgic gradient", text: "Value declines head to feet; crushing force increases — Rome harder than Babylon.", tag: "Daniel 2:39–40" }},
          {{ kind: "scripture", title: "They shall not cleave", text: "Iron + clay = civil power fused with religious claims; every European unity attempt fractures.", tag: "Daniel 2:41–43" }},
          {{ kind: "anchor", title: "Stone strikes the feet", text: "Cut without hands in the days of these kings — supernatural, not evolutionary.", tag: "Daniel 2:34–35, 44" }},
          {{ kind: "guard", title: "You live in the toenails", text: "Historicism places you before the Stone, not waiting for a fifth metal or a restarted head of gold.", tag: "Daniel 2:43–44" }}
        ],
        content: `
{js_content}
        `,
        christology: {{
                "kicker": "Christology",
                "title": "The Supernatural Stone and the Sovereign Triumph of Christ",
                "scripture": "Daniel 2:34–35, 44–45; Luke 20:17–18; 1 Peter 2:6–8; Revelation 11:15",
                "body": [
                        "The Stone cut out without hands is Jesus Christ — divine origin through the virgin birth, resurrection, and Second Coming. He is the chief cornerstone the builders rejected, the Rock upon which the Church is built, and the Stone that shatters all opposition (Psalm 118:22; Luke 20:17–18).",
                        "The Stone strikes the feet in the days of these kings — during divided Europe — not through human treaties or moral evolution. It pulverizes every metal kingdom at once and becomes a mountain filling the whole earth. Christ does not reform empires; He abolishes them and establishes an everlasting kingdom (Daniel 2:44–45; Rev 11:15).",
                        "Whosoever falls upon that stone in repentance shall be broken and saved; on whomsoever it shall fall in judgment, it will grind him to powder (Luke 20:18). Build your hope on the Living Stone — not on the crumbling feet of iron and clay."
                ]
        }},
        quizzes: [
          {{
            question: "A political commentator announces: 'A 21st-century superpower is the new Head of Gold in Bible prophecy.' What specific textual rule in Daniel 2:38 refutes this?",
            options: [
              "Daniel 2:38 explicitly fixed the head of gold: 'Thou [Nebuchadnezzar / Babylon] art this head of gold.' The sequence is strictly contiguous and non-repeatable; modern nations reside in the feet of iron and clay, awaiting the stone.",
              "The statue can restart in any century whenever an empire amasses more gold reserves than ancient Babylon.",
              "The head of gold actually represents Rome, so modern Western powers can claim to be the head.",
              "The prophecy was cancelled when Nebuchadnezzar repented in Daniel chapter 4."
            ],
            correct: 0,
            explanation: "Daniel 2:38 anchors the head of gold uniquely to Nebuchadnezzar's Babylon. The metals descend contiguously down to the feet of iron and clay; they never cycle or restart.",
            diagnostics: [
              "Correct! Daniel 2:38 fixes Babylon as the head. Succession is contiguous and descending; modern powers exist in the feet of iron and clay, awaiting the Stone.",
              "Misconception: Apocalyptic metals do not cycle based on economic wealth; each metal represents a specific historical empire in chronological order.",
              "Misconception: Rome is represented by the iron legs (Dan 2:40), not the head of gold.",
              "Misconception: Nebuchadnezzar's personal repentance in Daniel 4 did not alter the global imperial succession decreed by God."
            ]
          }},
          {{
            question: "A reader suggests that the 'stone cut out without hands' (Dan 2:34, 44–45) represents the gradual moral improvement of human civilization through international treaties. How does the text refute this?",
            options: [
              "The stone strikes the statue abruptly on its feet, pulverizing all earthly kingdoms to chaff, representing supernatural divine intervention at Christ's Second Advent rather than human social evolution.",
              "The stone represents the United Nations gradually assimilating all nations into a peaceful confederation.",
              "The stone struck during the Babylonian Empire and was completely fulfilled when Cyrus captured Babylon in 539 B.C.",
              "The stone is an allegorical metaphor with no historical or prophetic reality."
            ],
            correct: 0,
            explanation: "Daniel 2:34–35, 44 states that the stone strikes 'in the days of these kings' (the divided feet period) and grinds human empires to powder. It is supernatural ('without hands') and divine.",
            diagnostics: [
              "Correct! The stone strikes suddenly and pulverizes earthly kingdoms; it is cut 'without hands' (divine, supernatural) and establishes the eternal kingdom of God.",
              "Misconception: Human treaties cannot be the stone, because the stone destroys human kingdoms rather than confederating them.",
              "Misconception: The stone strikes the feet of iron and clay (the divided post-Roman era), not Babylon (the head).",
              "Misconception: Daniel 2:44 explicitly defines the stone as a literal kingdom set up by the God of heaven that shall never be destroyed."
            ]
          }}
        ],
        studyGuide: {{
          trace: [
            {{
              do: "Read Daniel 2:28 and 2:38 aloud. Write: who reveals secrets, and who is the head of gold?",
              why: "2:28 establishes heaven's sovereignty over history; 2:38 anchors the chain. Skip 2:38 and every later metal becomes guesswork."
            }},
            {{
              do: "Study the master-framework diagram. Label each metal with its empire and date range.",
              why: "Only the head is named in chapter 2; the rest follow by succession. Writing the empires turns the diagram from decoration into a defensible map."
            }},
            {{
              do: "Read Daniel 2:43 and list three historical attempts to unify Europe that failed to cleave.",
              why: "Charlemagne, Napoleon, and others prove the feet period — alliances that look strong but do not hold. You live in the feet, not at the head of gold."
            }},
            {{
              do: "Read Daniel 2:44–45. Where does the stone strike, and what does it become?",
              why: "The stone hits the feet in the days of these kings and fills the whole earth. It does not repair the statue — it ends every human empire at once."
            }},
          ],
          christ: {{
            claim: "The stone cut without hands is Jesus Christ. He strikes the feet, pulverizes every kingdom, and fills the earth with His everlasting kingdom.",
            why: "Luke 20:18 embeds the gospel in the colossus: fall upon the Stone in repentance and be saved, or resist and be ground to powder. Christ is the climax, not a footnote to the metals."
          }},
          now: {{
            claim: "You live near the base of the statue — in the toenails of divided history. The next major event is not another world empire, but the return of Christ.",
            why: "Daniel 2:43 already answered every merger that promises a final human empire. Historicism gives you location instead of panic."
          }},
          help: {{
            claim: "This sheet locates you on a map. You know which kingdom you are not waiting for and which King you are.",
            why: "When someone claims your century is the new head of gold, Daniel 2:38 is the refutation. When a treaty looks like the stone, 2:34–35 says the stone pulverizes, not confederates."
          }},
          value: {{
            claim: "A named first kingdom in Daniel 2:38 is the only reason later identifications are not mere guesswork.",
            why: "Pull out 2:38 and silver, bronze, and iron collapse into opinion. Keep it and you argue from succession — Babylon named, everything after must follow."
          }},
          ask: [
            "Can I say Daniel 2:38 from memory without looking?",
            "If they shall not cleave, what union am I treating as inevitable?",
            "Do I want the stone, or a fifth metal that feels safer?",
          ]
        }},
        guide: {{
          intro: {{
            title: "The colossus, the feet, and the Stone",
            expect: "Human wisdom fails; God reveals the master-framework from Babylon to Christ's kingdom. Completing this sitting opens Dura.",
            do: [
              "Follow the introduction and Main Points I–IV — use the diagrams to trace the unbroken chain.",
              "Open Map and walk Babylon, Rome, and the stone's mountain. View the assembled colossus in 3D.",
              "Complete the workbench, then checkpoint questions."
            ]
          }},
          end: {{
            title: "Daniel 3 is next",
            nextWhy: "Completing this sitting opens Dura: an all-gold image and a furnace — Babylon's answer to the dream.",
            spotlight: "next-sheet-btn"
          }}
        }}
      }},'''

pattern = r'      \{\s*\n\s*id: 2,.*?\n      \},\s*\n      \{\s*\n\s*id: 3,'
m = re.search(pattern, text, re.DOTALL)
if not m:
    raise SystemExit("Could not find sheet 2 block")
text = text[:m.start()] + new_block + "\n      {\n        id: 3," + text[m.end():]
data_path.write_text(text, encoding="utf-8")
print("Patched", data_path)
