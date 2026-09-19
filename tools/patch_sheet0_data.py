"""Patch sheets-data.js sheet 0 with generated HTML and updated metadata."""
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
html = (ROOT / "tools" / "sheet0_generated.html").read_text(encoding="utf-8")
data_path = ROOT / "js" / "study" / "sheets-data.js"
text = data_path.read_text(encoding="utf-8")

js_content = html.replace("\\", "\\\\").replace("`", "\\`").replace("${", "\\${")

new_block = f'''      {{
        id: 0,
        epoch: "THE PROLOGUE",
        readTime: "16 min read",
        allocatedMinutes: 16,
        scripture: "How the book teaches you to read it",
        title: "The Prophetic Blueprint: Why Daniel's Unbroken Chain Centers on Jesus Christ",
        subtitle: "God's historical roadmap from exile to the cross to the everlasting kingdom — and why how you read decides what you see.",
        flow: [
          {{ kind: "scripture", title: "The Lord gave the king", text: "Nebuchadnezzar did not conquer by independent might — God handed Judah over according to His purpose.", tag: "Daniel 1:2" }},
          {{ kind: "anchor", title: "Three hermeneutical roads", text: "Historicism keeps one chain; preterism locks it in antiquity; futurism severs it with a gap Daniel never names.", tag: "Daniel 2:38–44" }},
          {{ kind: "history", title: "Counter-Reformation catalyst", text: "Alcázar (1614) and Ribera (1590) relocated fulfillment to escape historicist papal identification — history of interpretation.", tag: "Council of Trent" }},
          {{ kind: "scripture", title: "The year-day scale", text: "Numbers 14:34 and Ezekiel 4:6 establish precedent; Daniel 9 tests it at Messiah and the cross.", tag: "Num 14:34; Ezek 4:6; Dan 9:24–27" }},
          {{ kind: "anchor", title: "Christ is the redemptive center", text: "Sovereignty in exile (Dan 1:2), Messiah cut off (Dan 9:26), Stone-King (Dan 2:44) — Luke 24:27.", tag: "Luke 24:27" }},
          {{ kind: "guard", title: "You live before the Stone", text: "Historicism places you in the divided feet — freed from fear, resting in Christ's first and second advent.", tag: "Daniel 2:41–44" }}
        ],
        content: `
{js_content}
        `,
        christology: {{
                "kicker": "Christology",
                "title": "The Unbroken Chain Exists to Exalt Jesus Christ",
                "scripture": "Daniel 1:2; Daniel 9:26; Daniel 2:44; Luke 24:27",
                "body": [
                        "The historicist chain is not a political chart. It exists to exalt Jesus Christ as Lord of history and personal Redeemer. In Daniel 1:2 the same God who gave His Son on Calvary already governed Judah's fall. In Daniel 9:26 Messiah is cut off, but not for Himself — the pinnacle of the timeline is the cross, not an earthly tyrant. In Daniel 2:44 the stone cut without hands is Christ returning to fill the earth with an everlasting kingdom.",
                        "On the road to Emmaus, Jesus expounded in all the Scriptures the things concerning Himself (Luke 24:27). Prophecy that does not lead to Him is a map with no destination.",
                        "The timeline that predicted Christ's first advent to bear our sins guarantees His second advent to reign as King. Rest in that triumph — not in fear of present superpowers."
                ]
        }},
        quizzes: [
          {{
            question: "A Bible teacher claims Daniel's kingdom sequence was fulfilled entirely under Antiochus IV and A.D. 70, so nothing in the book applies to the Christian era. Which school is this, and what is its structural flaw?",
            options: [
              "Preterism — it terminates Daniel's timeline in antiquity, leaving no continuous chain through Rome, divided Europe, and Christ's everlasting kingdom (Daniel 2:38–44).",
              "Historicism — it reads an unbroken chain from Babylon to the Second Coming.",
              "Futurism — it inserts a multi-millennial gap before a final seven-year crisis.",
              "Idealism — it treats all symbols as timeless allegory with no historical fulfillment."
            ],
            correct: 0,
            explanation: "Confining fulfillment to the second century B.C. or A.D. 70 is preterism's core move — it breaks the contiguous chain Daniel describes.",
            diagnostics: [
              "Correct! Preterism parks the chain in antiquity; Daniel 2 still requires successive kingdoms culminating in God's eternal kingdom.",
              "Misconception: Historicism is the continuous model this course uses — Babylon through divided Europe to the Stone.",
              "Misconception: Futurism severs the chain with a future gap, not by ending it in A.D. 70.",
              "Misconception: The teacher anchors to specific ancient dates — that is preterism, not idealism."
            ]
          }},
          {{
            question: "Why do historicist interpreters apply the year-day principle to Daniel 9's seventy weeks?",
            options: [
              "490 literal days cannot rebuild Jerusalem and reach Messiah; as 490 years the prophecy spans from the Persian restoration decree to Christ's ministry and cross — anchoring the same scale for 1,260 and 2,300.",
              "2 Peter 3:8 requires every prophetic day everywhere to equal one thousand years.",
              "Daniel 9 explicitly prints the date 457 B.C. in the Hebrew text.",
              "The year-day rule applies only to Revelation, never to Daniel."
            ],
            correct: 0,
            explanation: "Numbers 14:34 and Ezekiel 4:6 establish precedent; Daniel 9 self-checks at Messiah — 490 days fail, 490 years fit.",
            diagnostics: [
              "Correct! Precedent in Torah and exile, then Daniel 9 tests the scale at the cross.",
              "Misconception: 2 Peter 3:8 is about God's patience, not Daniel's prophetic ruler.",
              "Misconception: 457 B.C. and A.D. 27–34 are interpretive conclusions, not words in the verse.",
              "Misconception: Daniel 7:25 and 8:14 use the same measuring rod once established in Daniel 9."
            ]
          }}
        ],
        studyGuide: {{
          trace: [
            {{
              do: "Read Daniel 1:2 and write one sentence: who gave Jehoiakim into Nebuchadnezzar's hand?",
              why: "The prologue begins with sovereignty, not sensationalism. If Marduk appears to win, you miss the God who hands kings over and who will later give His Son."
            }},
            {{
              do: "Study the three-school diagram in Part I. Trace each line: where does the chain break?",
              why: "Before naming a horn or date, you choose a road. Only historicism keeps Babylon → Persia → Greece → Rome → divided world → Christ's kingdom as one sentence in Daniel 2."
            }},
            {{
              do: "Read Numbers 14:34, Ezekiel 4:6, and Daniel 9:24–27 in the Scripture dock. Write: precedent → test at Messiah.",
              why: "The year-day scale is not human guesswork. God stated it twice before Daniel uses numbered visions; Daniel 9 proves it at the cross."
            }},
            {{
              do: "List the three Christ anchors from Part III: Daniel 1, 9, and 2 — one phrase each.",
              why: "Prophecy without Christ at the center is fear-mongering or trivia. The chain exists to exalt the Messiah cut off for us and the Stone-King who fills the earth."
            }},
          ],
          christ: {{
            claim: "Daniel's unbroken chain centers on Jesus: sovereignty in exile (1:2), sacrifice at the cross (9:26), returning King (2:44).",
            why: "Luke 24:27 is the hermeneutical rule behind every sheet. If your reading of Daniel never arrives at Christ, it has missed the book's redemptive core."
          }},
          now: {{
            claim: "Historicism places you in the divided feet — after Rome, before the Stone. You are not adrift between a finished past and a vague future tribulation.",
            why: "Preterism leaves no roadmap for today. Futurism skips two millennia. Historicism says God has been governing the Christian era and holds today's crises in the same hand that gave Jehoiakim to Babylon."
          }},
          help: {{
            claim: "Ask of any prophetic claim: Does it keep the chain unbroken and Christ at the center?",
            why: "A claim that restarts the statue, ends it in antiquity, or severs Daniel 9 with an unstated gap fails the blueprint this sitting teaches."
          }},
          value: {{
            claim: "The same timeline that landed Messiah at Calvary guarantees His return as King.",
            why: "When you see Daniel 9 anchor the year-day rod at the cross, later dates are not slogans — they share the rod that already proved itself at Jesus' first advent."
          }},
          ask: [
            "Which of the three roads was I already using before this sitting?",
            "Can I explain why Daniel 9 requires years, not days, without circular reasoning?",
            "Does my reading of Daniel lead me to fear of empires — or trust in Christ's triumph?",
          ]
        }},
        guide: {{
          intro: {{
            title: "The prophetic blueprint",
            expect: "Three hermeneutical roads, the year-day scale anchored at the cross, and Christ as the redemptive center of every empire on the chain.",
            do: [
              "Follow the introduction and Parts I–IV — use the diagrams to see where each school breaks the chain.",
              "Complete the workbench, then the checkpoint questions.",
              "Continue to Daniel 1: faithfulness in Babylon."
            ]
          }},
          end: {{
            title: "The chain begins in exile",
            nextWhy: "Daniel 1 is next: a captive youth, the king's table, and consecration before revelation.",
            spotlight: "next-sheet-btn"
          }}
        }}
      }},'''

pattern = r'      \{\s*\n\s*id: 0,.*?\n      \},\s*\n      \{\s*\n\s*id: 1,'
m = re.search(pattern, text, re.DOTALL)
if not m:
    raise SystemExit("Could not find sheet 0 block")
text = text[:m.start()] + new_block + "\n      {\n        id: 1," + text[m.end():]
data_path.write_text(text, encoding="utf-8")
print("Patched", data_path)
