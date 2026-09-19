"""Patch sheets-data.js sheet 4 with generated HTML and updated metadata."""
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
html = (ROOT / "tools" / "sheet4_generated.html").read_text(encoding="utf-8")
data_path = ROOT / "js" / "study" / "sheets-data.js"
text = data_path.read_text(encoding="utf-8")

js_content = html.replace("\\", "\\\\").replace("`", "\\`").replace("${", "\\${")

new_block = f'''      {{
        id: 4,
        epoch: "SHEET 04 &bull; DANIEL 4",
        readTime: "18 min read",
        allocatedMinutes: 18,
        scripture: "Daniel 4:1-37 &bull; Babylon, c. 570 B.C.",
        title: "The Emperor in the Dust: Pride, Divine Sanity, and the Humility of Christ",
        subtitle: "A pagan king's open confession — hubris, beastly madness, restored reason, and Christ's kenosis.",
        flow: [
          {{ kind: "scripture", title: "An imperial encyclical", text: "Nebuchadnezzar publishes his own humiliation to all peoples — a rare first-person royal document.", tag: "Daniel 4:1" }},
          {{ kind: "anchor", title: "The thesis of thrones", text: "The most High ruleth in the kingdom of men — stated three times (4:17, 25, 32).", tag: "Daniel 4:17" }},
          {{ kind: "scripture", title: "Tree and banded stump", text: "Watcher hews the cosmic tree; iron/bronze band preserves mercy for repentance.", tag: "Daniel 4:14–16" }},
          {{ kind: "scripture", title: "Mercy before judgment", text: "Break off thy sins, show mercy to the poor — twelve months of divine patience.", tag: "Daniel 4:27, 29" }},
          {{ kind: "scripture", title: "The threefold boast", text: "I have built / my mighty power / my majesty — pride taking credit for a gift.", tag: "Daniel 4:30; 2:37" }},
          {{ kind: "guard", title: "Seven times = literal years", text: "Court narrative, not apocalyptic clock — year-day does not apply here.", tag: "Daniel 4:33, 36" }},
          {{ kind: "anchor", title: "Eyes lifted, mind restored", text: "Sanity is theological; Christ is the humble King opposite Nebuchadnezzar's pride.", tag: "Daniel 4:34; Phil 2:6–8" }}
        ],
        content: `
{js_content}
        `,
        christology: {{
                "kicker": "Christology",
                "title": "Christ, the True and Humble King",
                "scripture": "Daniel 4:34–37; Philippians 2:5–11; Colossians 3:10; Matthew 11:29",
                "body": [
                        "Nebuchadnezzar strutted on his palace roof: 'Is not this great Babylon that I have built?' Christ, being in the form of God, made Himself of no reputation and took the form of a servant (Philippians 2:6–7). The emperor was humbled by force; the Son emptied Himself willingly.",
                        "Sin reduces humanity to beast-like pride. Christ restores the imago Dei by His sinless life, substitutionary death, and resurrection (Colossians 3:10; 2 Corinthians 3:18). Understanding returned when Nebuchadnezzar lifted his eyes; the Father highly exalted the Son after obedient humility.",
                        "Take His yoke upon you. Learn of Him who is meek and lowly in heart — the antidote to every 'I have built' boast (Matthew 11:29)."
                ]
        }},
        quizzes: [
          {{
            question: "A political theorist reviewing Nebuchadnezzar's boanthropy (Dan 4:30–33) claims that his mental breakdown was merely an acute organic psychosis with no relation to his boast on the palace roof. What is the biblical and theological reality?",
            options: [
              "The text reveals that human sanity is tethered to acknowledging Heaven's sovereignty; when a ruler usurps God's glory ('Is not this great Babylon that I have built'), he is degraded to the beastly level beneath human dignity until he recognizes that the Most High rules.",
              "The theorist is right because Daniel 4 is an allegorical myth without any historical basis in Babylonian records.",
              "The breakdown was caused by poisoning from court magicians who plotted a military coup.",
              "Nebuchadnezzar was transformed into a literal mythological beast with physical wings and iron claws."
            ],
            correct: 0,
            explanation: "Daniel 4:17, 25, 32 establish the thesis: the Most High rules in the kingdom of men. Refusing divine accountability strips man of his rational, spiritual dignity, reducing him to animalistic predation.",
            diagnostics: [
              "Correct! Daniel 4 shows that self-deification strips humanity of true rational dignity, reducing the proud ruler to eating grass like a beast until he lifts his eyes to the King of heaven.",
              "Misconception: Daniel 4 is not without historical echo: Babylonian fragment BM 34113 (published by A. K. Grayson, 1975; see Ministry, April 1978, 'New light on Nebuchadnezzar's madness') is read by some as a period when the king's conduct turned erratic. The fragment is broken and its reading debated — the chapter's case rests on the lifted eyes, not on the tablet.",
              "Misconception: Daniel 4:31 records that while the words were still in the king's mouth, a voice from heaven announced immediate judgment; the text records divine audit, not political treason.",
              "Misconception: The biblical text uses poetic simile ('his hair was grown like eagles' feathers, and his nails like birds' claws') to describe the neglected physical state of boanthropy."
            ]
          }},
          {{
            question: "A skeptic argues: 'Daniel only functioned as a fatalistic soothsayer predicting inescapable doom for pagan kings.' How does Daniel 4:27 directly refute this claim?",
            options: [
              "Daniel urgently offered an ethical path of repentance ('break off thy sins by righteousness, and thine iniquities by shewing mercy to the poor'), proving that biblical prophecy is redemptive and granted a 12-month reprieve before judgment fell.",
              "Daniel demanded that Nebuchadnezzar surrender his crown to the high priest of Jerusalem immediately.",
              "Daniel told the king that judgment was immutable and no moral change could delay it.",
              "Daniel advised the king to conquer Egypt to expand the empire's borders."
            ],
            correct: 0,
            explanation: "Prophecy is pedagogical and moral, not mechanistic fatalism. Daniel 4:27 offered conditional mercy: twelve months passed between the warning and the consequence, showing divine longsuffering.",
            diagnostics: [
              "Correct! Daniel 4:27 displays authentic prophetic ministry: calling the monarch to active repentance through social justice and righteousness, resulting in a 12-month delay.",
              "Misconception: Daniel never sought political insurrection or ecclesiastical dominance; he served faithfully as a high civil counselor while maintaining covenant purity.",
              "Misconception: Prophetic warnings in Scripture are frequently conditional (cf. Jonah 3:10, Jer 18:7-8); genuine repentance would have prolonged Nebuchadnezzar's tranquility.",
              "Misconception: Daniel commanded ethical reform and mercy to the oppressed, not military expansionism."
            ]
          }}
        ],
        studyGuide: {{
          trace: [
            {{
              do: "Read Daniel 4:17 aloud. Write the thesis that repeats in 4:25 and 4:32.",
              why: "The whole chapter exists to teach one truth: the Most High rules in the kingdom of men. Skip 4:17 and the grass-eating looks like a medical oddity with no moral center."
            }},
            {{
              do: "Read Daniel 4:27. Note the two things Daniel tells the king before judgment: righteousness and mercy to the poor.",
              why: "Twelve months of mercy passed between warning and boast. Heaven is slow to judge and quick to warn."
            }},
            {{
              do: "Write Nebuchadnezzar's boast (4:30) on one line. Note what happens in 4:31–33.",
              why: "The boast is the charge; the field is the sentence. A soul that refuses a Lord above descends beneath human dignity."
            }},
            {{
              do: "Compare Daniel 4:34 with 2:37. Who gave Babylon according to each text?",
              why: "4:30 says I have built; 2:37 says God gave. Restoration comes when the king lifts his eyes and credits the Giver."
            }},
          ],
          christ: {{
            claim: "Nebuchadnezzar exalted himself; Christ emptied Himself. Philippians 2 is the antidote to Daniel 4:30.",
            why: "The king's understanding returned when he lifted his eyes. The Father highly exalted the Son after obedient humility unto death."
          }},
          now: {{
            claim: "Social feeds and career ladders still reward the boast of Daniel 4:30. This chapter is a diagnostic for headlines, speeches, and your own mouth.",
            why: "Is not this great Babylon that I have built still appears whenever success is treated as self-made. Name self-credit before it hardens into pride."
          }},
          help: {{
            claim: "Pride is spiritual descent, not only a personality flaw. The return is lifting your eyes to heaven.",
            why: "Boanthropy is what happens when thrones are treated as personal achievements. Practice looking up before judgment has to teach it the hard way."
          }},
          value: {{
            claim: "A mind restored to praise is worth more than an empire left unchallenged.",
            why: "The banded stump shows discipline can be mercy when pride still has time to repent. Restoration outlasts every crown."
          }},
          ask: [
            "Where have I said 'I have built' this month without crediting the Giver?",
            "If Heaven rules the kingdom of men, what boast do I need to bury?",
            "Can I take Christ's yoke today without waiting to be driven to the grass?",
          ]
        }},
        guide: {{
          intro: {{
            title: "Pride, the Watcher, and the stump",
            expect: "Imperial confession, cosmic tree, threefold boast, seven literal years, eyes lifted, Christ's kenosis.",
            do: [
              "Follow the introduction and Main Points I–IV — quote 4:17 as the thesis.",
              "Open Map at the Watcher, roof boast, and Heaven's claim on thrones. View the ox-king artifact.",
              "Complete checkpoint questions, then continue to Daniel 5."
            ]
          }},
          end: {{
            title: "The handwriting is next",
            nextWhy: "Daniel 5: Belshazzar ignored the family lesson — numbered, weighed, divided on the night Babylon fell.",
            spotlight: "next-sheet-btn"
          }}
        }}
      }},'''

pattern = r'      \{\s*\n\s*id: 4,.*?\n      \},\s*\n      \{\s*\n\s*id: 5,'
m = re.search(pattern, text, re.DOTALL)
if not m:
    raise SystemExit("Could not find sheet 4 block")
text = text[:m.start()] + new_block + "\n      {\n        id: 5," + text[m.end():]
data_path.write_text(text, encoding="utf-8")
print("Patched", data_path)
