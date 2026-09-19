"""Patch sheets-data.js sheet 7 with generated HTML and refined metadata."""
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
html = (ROOT / "tools" / "sheet7_generated.html").read_text(encoding="utf-8")
data_path = ROOT / "js" / "study" / "sheets-data.js"
text = data_path.read_text(encoding="utf-8")

js_content = html.replace("\\", "\\\\").replace("`", "\\`").replace("${", "\\${")

new_block = f'''      {{
        id: 7,
        epoch: "SHEET 07 &bull; DANIEL 7",
        readTime: "20 min read",
        allocatedMinutes: 20,
        scripture: "Daniel 7:1-28 &bull; Babylon, c. 553 B.C.",
        title: "The Churning Sea & The Little Horn: The 1,260 Years to Judgment",
        subtitle: "The four predatory beasts, the church-state horn, the 1,260-year supremacy, and the pre-advent heavenly court.",
        flow: [
          {{ kind: "scripture", title: "Same chain, predatory symbols", text: "Four beasts rise from the sea: lion (Babylon), bear (Medo-Persia), leopard (Greece), and dreadful beast (Rome).", tag: "Daniel 7:3–7, 17, 23" }},
          {{ kind: "scripture", title: "Scripture defines its own vocabulary", text: "Waters represent peoples and nations; winds represent war and geopolitical upheaval.", tag: "Revelation 17:15; Jeremiah 49:36–37" }},
          {{ kind: "anchor", title: "The eleventh little horn", text: "Diverse from the ten, three uprooted, mouth speaking pompous words against the Most High, wearing out the saints, thinking to change times and laws.", tag: "Daniel 7:8, 24–25" }},
          {{ kind: "history", title: "Three blocking kingdoms uprooted", text: "Heruli (493), Vandals (534), Ostrogoths (538) — the Arian powers that barred a church-state in the west.", tag: "History — dated falls" }},
          {{ kind: "scripture", title: "The 1,260-year prophetic span", text: "Time + times + half = 3½ years = 42 months = 1,260 prophetic days = 1,260 solar years on the year-day ruler.", tag: "Daniel 7:25; Revelation 12:6, 14; 13:5" }},
          {{ kind: "history", title: "Historical boundaries: 538 to 1798", text: "A.D. 538 (Belisarius raises Ostrogothic siege; Justinian's decree active) to A.D. 1798 (Berthier captures Pius VI).", tag: "Procopius; Berthier 1798" }},
          {{ kind: "guard", title: "Pre-advent court before the stone", text: "Thrones placed, books opened, Son of Man brought TO the Ancient of Days — heavenly trial while the horn speaks on earth.", tag: "Daniel 7:9–14, 26–27" }}
        ],
        content: `
{js_content}
        `,
        christology: {{
                "kicker": "Christology",
                "title": "The Son of Man Vindicated Before the Ancient of Days",
                "scripture": "Daniel 7:9–14, 21–22, 26–27; Matthew 26:64; Revelation 1:7; 1 Timothy 2:5; Hebrews 7:25",
                "body": [
                        "In Daniel 7, the terrifying panorama of predatory beasts and the 1,260-year blasphemous reign of the little horn culminates in a celestial courtroom of blinding glory. The Ancient of Days sits upon a flaming throne, the books are opened, and 'one like the Son of man came with the clouds of heaven, and came to the Ancient of days' (Dan 7:13). This Son of Man is Jesus Christ, who repeatedly applied this very title to Himself during His earthly ministry, even declaring to the high priest that he would see the Son of man coming in the clouds of heaven (Matt 26:64).",
                        "The scene of Daniel 7:13 is not Christ coming to earth at His Second Advent; it is Christ moving into the presence of the Father in the heavenly sanctuary to receive the kingdom, glory, and dominion. While the papal little horn spoke great words against the Most High, wore out the saints for a time, times, and the dividing of time (538–1798), and usurped Christ's unique priesthood, the heavenly court convenes to execute judgment in favor of the saints (Dan 7:22). Christ is our heavenly High Priest and Advocate, standing before the universe to vindicate His covenant people and establish an everlasting kingdom.",
                        "Anchor your confidence in Christ's advocacy rather than earthly religious hierarchies or human mediators. There is one God, and one mediator between God and men, the man Christ Jesus (1 Tim 2:5). When you face spiritual persecution or feel worn out by the moral darkness of this age, remember that the judgment has been seated, the horn's dominion is taken away, and Christ will soon share His kingdom with those who remain faithful to His name."
                ]
        }},
        quizzes: [
          {{
            question: "A beginner studying Daniel 7 asks: 'Why does the vision use four predatory beasts rising from a stormy sea instead of literal names? What do the waters, winds, and beasts signify in biblical prophetic vocabulary?'",
            options: [
              "Scripture interprets its own symbols: the sea represents populated human multitudes (Rev 17:15), the winds represent war and military strife (Jer 49:36–37), and the four beasts explicitly represent four world-ruling kingdoms (Dan 7:17, 23) in direct parallel to the four metals of Daniel 2.",
              "The four beasts represent four mythological deities worshipped in ancient Babylon whose statues guarded the city gates.",
              "The beasts represent four distinct psychological personality temperaments of ancient rulers.",
              "The prophecy foretells literal predatory monsters that will emerge from the Mediterranean Sea during a future seven-year tribulation."
            ],
            correct: 0,
            explanation: "Daniel 7:17 and 7:23 state plainly that the four beasts are four kingdoms arising out of the earth. Connected with Revelation 17:15 (waters = peoples) and Jeremiah 49:36–37 (winds = war), the symbols provide an objective historical vocabulary mirroring the four metals of Daniel 2.",
            diagnostics: [
              "Correct! Daniel 7:17 and 7:23 explicitly define the beasts as four kingdoms arising from the earth, while Revelation 17:15 and Jeremiah 49:36–37 define the waters and winds as peoples and warfare.",
              "Misconception: The beasts are prophetic symbols for real geopolitical world empires (Babylon, Medo-Persia, Greece, and Rome), not pagan mythological deities.",
              "Misconception: Apocalyptic beasts symbolize world-ruling empires in continuous historical succession, not psychological temperaments.",
              "Misconception: Apocalyptic visions use symbolic imagery to depict historical empires, not literal biological monsters emerging from the sea."
            ]
          }},
          {{
            question: "A student asks: 'Does Daniel 7 describe the Second Coming of Christ to earth in verses 9–14?' How does historicist exegesis explain the setting and movement of this scene?",
            options: [
              "No; it describes a heavenly pre-advent forensic court session: thrones are placed, the Ancient of Days sits, the books of record are opened, and the Son of Man comes on the clouds of heaven TO the Ancient of Days in heaven to receive the kingdom and vindicate the persecuted saints before the final destruction of the beast.",
              "Yes; the text describes Christ riding a white horse down to the Mount of Olives in Jerusalem.",
              "The scene describes the creation of the world in Genesis 1.",
              "The scene is an allegorical depiction of the Council of Nicaea in 325 A.D."
            ],
            correct: 0,
            explanation: "Daniel 7:13 is explicit: the Son of Man comes with clouds of heaven and comes TO the Ancient of Days—a movement in heaven before the throne, not a descent to earth. The court sits to judge the horn and award the kingdom to the saints.",
            diagnostics: [
              "Correct! Daniel 7:9-14 depicts an extraordinary heavenly courtroom scene: the Son of Man approaches the Ancient of Days while books of record are examined, prior to the beast's execution and the Second Coming.",
              "Misconception: In Daniel 7:13, Christ moves TO the Father ('they brought Him near before Him') in heaven, not down to earth. That descent to earth occurs after the verdict (vv. 26-27).",
              "Misconception: Daniel 7:9-10 occurs at the end of the four predatory empires and the 1,260-year reign of the little horn, not at the beginning of creation.",
              "Misconception: The Ancient of Days and the celestial court of ten thousand times ten thousand ministering angels is the supreme heavenly judgment, not an earthly human church council."
            ]
          }}
        ],
        studyGuide: {{
          trace: [
            {{
              do: "Open Scripture to Daniel 7:17 and 7:23. Read both verses and write the definition the angel gives for the four beasts.",
              why: "When you read Daniel 7:17 and 7:23, the angel tells Daniel plainly that the four beasts are four kings and four kingdoms rising from the earth. That definition keeps chapter 7 tied to the same timeline as the metal statue in chapter 2 rather than turning the vision into a free-floating monster parade. If you skip these verses, you may invent a fifth kingdom from headlines or treat each beast as a mood about evil. If you write the angel's definition, you gain a fixed chain: Babylon, Medo-Persia, Greece, Rome, and then the horn among Rome's fragments."
            }},
            {{
              do: "Read Daniel 7:24 and 7:25 in Scripture, then review the little-horn list in the article above. Open the horizon timeline and locate the years 538 and 1798.",
              why: "When you read Daniel 7:24 and 7:25, you will see ten kings, then an eleventh horn diverse from the others, three horns uprooted, pompous words against the Most High, persecution of the saints, intent to change times and laws, and a reign of time, times, and half a time. The article's list names the Heruli, Vandals, and Ostrogoths and applies the year-day principle to 538 through 1798. If you skip the list and dates, any loud power can fit the horn. If you use the page tools, you gain a testable job description rather than a cartoon villain."
            }},
            {{
              do: "Read Daniel 7:9 through 7:10 and 7:13 through 7:14 in Scripture before you read 7:25 again. Note the order: thrones set, books opened, then one like a son of man receives the kingdom.",
              why: "When you read Daniel 7:9 through 7:10, thrones are placed, the Ancient of Days sits, thousands minister to Him, and books are opened in a court session that happens while the horn is still active on earth. Daniel 7:13 through 7:14 then shows one like a son of man brought before the Ancient of Days to receive dominion and glory. If you read 7:25 before the court, chapter 7 becomes beast-spotting without a verdict. If you keep the heavenly order, you see that judgment is a sitting with records already open, not only the stone strike of chapter 2."
            }},
            {{
              do: "Read Daniel 7:26 and 7:27 in Scripture. Write what happens to the horn's dominion and who receives the everlasting kingdom at the close of the vision.",
              why: "When you read Daniel 7:26 and 7:27, the court sits in judgment, the horn's dominion is taken away and consumed, and then the kingdom and dominion are given to the saints of the Most High, whose kingdom is an everlasting kingdom. This closes the vision with a sentence on the persecutor and a promise to the worn-out saints. If you stop at the horn's activity, evil looks unanswered. If you read the closing verses, you see that the beasts exist to lose and that the people the horn wore out are named in the final grant of dominion."
            }}
          ],
          christ: {{
            claim: "One like a son of man in Daniel 7:13 through 7:14 is brought before the Ancient of Days to receive an everlasting kingdom. Jesus takes that title for Himself before the high priest in Mark 14:62, and the heavenly court sits so He may reign and vindicate those the horn wore out.",
            why: "Daniel sees not a beast but a person, one like a son of man, receive dominion while the horn still speaks on earth. Jesus claimed that same title when He stood on trial, which means the court scene is not background decoration for empire watching but the center of the chapter's hope. If you drop 7:13 through 7:14, you have catalogued predators without meeting the Ruler they must answer to. If you keep Christ in view, the beasts and the horn exist to lose to the Son of man, and the saints are included in the kingdom He receives."
          }},
          now: {{
            claim: "Church-state power that changes times and laws is not only a medieval story. You still live among the fragments of the fourth beast, and claims on the calendar of worship remain a live issue.",
            why: "Daniel 7:25 describes a power diverse from ethnic kingdoms because it merges religious authority with civil enforcement, changes times and laws, and wears out the saints for a measured span. The years 538 and 1798 mark mainstream historical boundaries for that supremacy, but the pattern of revising worship and pressing conscience did not vanish when the span closed. If you archive the horn as costume drama, you will miss modern fights over holy time and commandment as side issues. If you see the pattern, you recognize why calendar and law remain central rather than decorative in biblical prophecy."
          }},
          help: {{
            claim: "This sheet keeps the four kingdoms on a fixed chain and gives you a checklist for the little horn so it does not become a vague mood or a cartoon villain.",
            why: "The beast table in the article matches lion, bear, leopard, and dreadful beast to the metals of chapter 2, and the horn list supplies marks any candidate must meet: rise among Rome's ten fragments, uproot three, speak against the Most High, persecute saints, change times and laws, and reign for 1,260 year-days. If you only feel alarm about empires, you gain emotion without discernment. If you use the checklist, you can ask sober questions about any power without turning prophecy into a rumor mill or treating every loud ruler as the horn."
          }},
          value: {{
            claim: "A heavenly court that sits while the horn still rages means judgment is already in session, not only a future explosion when the stone strikes.",
            why: "Daniel 7:9 through 7:14 shows books opened and a verdict underway before the horn's dominion is fully consumed in 7:26, which is valuable when evil looks unreviewed and the saints feel forgotten. You do not have to choose between a distant smash and silence now; Scripture presents a court that sits in heaven while mouths still speak on earth. That memory steadies believers who live between 538 and 1798 and beyond, because the Son of man has already been brought before the Ancient of Days to receive the kingdom the horn cannot keep."
          }},
          ask: [
            "Can I tell the story of chapter 7 without dropping the heavenly court out of the sequence?",
            "What times and laws are being revised around me, and how does Daniel 7:25 name that kind of pressure?",
            "Do I want the Son of man to receive the kingdom, or a horn that speaks pompous words on my behalf?",
          ]
        }},
        guide: {{
          intro: {{
            title: "Beasts, the little horn, and 538–1798",
            expect: "Daniel 7 retells the metals as predators, then shows a church-state horn and a court that sits before the stone strikes.",
            do: [
              "Follow Introduction and Main Points I–V plus Practical Application.",
              "Open Map and trace 538, 1798, Rome, and the celestial court. View the 3D artifact.",
              "Complete checkpoint questions, then continue to the sanctuary vision of Daniel 8."
            ]
          }},
          end: {{
            title: "The ram and goat are next",
            nextWhy: "Daniel 8 is next: a numbered sanctuary span, the tamid, and why Antiochus is too small and too early.",
            spotlight: "next-sheet-btn"
          }}
        }}
      }},'''

pattern = r'      \{\s*\n\s*id: 7,.*?\n      \},\s*\n      \{\s*\n\s*id: 8,'
m = re.search(pattern, text, re.DOTALL)
if not m:
    raise SystemExit("Could not find sheet 7 block")
text = text[:m.start()] + new_block + "\n      {\n        id: 8," + text[m.end():]
data_path.write_text(text, encoding="utf-8")
print("Patched Sheet 7 in", data_path)
