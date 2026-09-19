"""Patch sheets-data.js sheet 10 with generated HTML and refined metadata."""
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
html = (ROOT / "tools" / "sheet10_generated.html").read_text(encoding="utf-8")
data_path = ROOT / "js" / "study" / "sheets-data.js"
text = data_path.read_text(encoding="utf-8")

js_content = html.replace("\\", "\\\\").replace("`", "\\`").replace("${", "\\${")

new_block = f'''      {{
        id: 10,
        epoch: "SHEET 10 &bull; DANIEL 10-12",
        readTime: "22 min read",
        allocatedMinutes: 22,
        scripture: "Daniel 10:1 - 12:13 &bull; Tigris River, 536 B.C.",
        title: "Michael Stands Up: The Time of Trouble & Bodily Resurrection",
        subtitle: "The close of probation, deliverance of the saints, and the eternal covenant reward.",
        flow: [
          {{ kind: "scripture", title: "One vision, three chapters", text: "Cyrus’s third year by the Tigris — chapters 10–12 are a single continuous revelation.", tag: "Daniel 10:1 – 12:13" }},
          {{ kind: "scripture", title: "The man in linen", text: "Body like beryl, face like lightning — the same inventory as the glorified Christ of Revelation 1.", tag: "Daniel 10:5–6 ↔ Revelation 1:13–15" }},
          {{ kind: "scripture", title: "The war behind the empires", text: "The prince of Persia withholds Gabriel twenty-one days; Michael comes to help.", tag: "Daniel 10:13, 20" }},
          {{ kind: "scripture", title: "The named march", text: "Persia’s kings, Alexander’s break into four, the north-south wars, Rome — and “the prince of the covenant” cut off.", tag: "Daniel 11:2–22" }},
          {{ kind: "scripture", title: "The daily removed again", text: "The papal phase takes the tamid and sets up the abomination — the attack of chapters 7 and 8 under a new face.", tag: "Daniel 11:31, 36–39" }},
          {{ kind: "anchor", title: "Michael stands up", text: "“Stand up” is Daniel’s verb for kings assuming power; the great Prince assumes His stance — the plea ends and trouble begins.", tag: "Daniel 12:1; Hebrews 7:25" }},
          {{ kind: "scripture", title: "Dust wakes", text: "Bodily resurrection, two destinies — confirmed by Jesus in John 5 — and Daniel is told to rest and arise.", tag: "Daniel 12:2, 13; John 5:28–29" }}
        ],
        content: `
{js_content}
        `,
        christology: {{
                "kicker": "Christology",
                "title": "Michael Standing Up in Glory and Resurrection Power",
                "scripture": "Daniel 12:1–3; Jude 9; 1 Thessalonians 4:16; John 5:28–29; Revelation 19:11–16",
                "body": [
                        "The Book of Daniel concludes not with an empire, a philosophical theory, or a cryptic code, but with a living Person standing up in royal majesty: 'And at that time shall Michael stand up, the great prince which standeth for the children of thy people' (Daniel 12:1). Michael—whose Hebrew name asks the glorious question Miy-ka-El, 'Who is like God?'—is none other than our Lord Jesus Christ in His warrior-king and archangelic office. He is the Prince of princes who stood as Commander of the Lord's host, the One who disputed with Satan over Moses' body (Jude 9), and who will descend with the voice of the archangel and the trump of God (1 Thessalonians 4:16).",
                        "When Michael 'stands up,' His priestly intercession closes, and He goes forth to deliver His people during a time of trouble such as never was. Yet every person whose name is found written in the Book of Life is delivered. Immediately following His intervention, Daniel 12:2 announces the ultimate hope of the covenant: 'And many of them that sleep in the dust of the earth shall awake, some to everlasting life.' Christ's resurrection guarantees the physical, bodily resurrection of all who sleep in Him. Death does not have the final word; Jesus has defeated the grave.",
                        "Live with your eyes fixed on the horizon for Michael's glorious standing up. When moral confusion, geopolitical upheaval, and personal trials press upon you, remember that the story of Daniel ends in victory, vindication, and resurrection glory. Walk as wise teachers who turn many to righteousness, shining as the brightness of the firmament and as the stars for ever and ever (Daniel 12:3). Christ is standing for you today in heaven, and soon He will stand to take you home."
                ]
        }},
        quizzes: [
          {{
            question: "An eschatology group debates what occurs when 'Michael stands up' in Daniel 12:1. One member argues it simply means an earthly military commander mobilizing his army. What is the sanctuary significance of this event?",
            options: [
              "In Daniel's own usage, 'stand up' (amad) is the verb for a king assuming power (Dan 11:2–4, 7, 20–21); Michael is the great Prince, so His standing up marks the close of human probation and the cessation of heavenly intercession (Heb 7:25), immediately followed by the Great Time of Trouble.",
              "It marks the decree of Cyrus allowing exiles to return in 536 B.C.",
              "It refers to the coronation of Caesar Augustus in Rome.",
              "It describes an angelic rebellion that overthrows heaven's government."
            ],
            correct: 0,
            explanation: "Christ 'ever liveth to make intercession' (Heb 7:25), and Daniel uses 'stand up' for kings assuming power (Dan 11:2–4). When Michael (Christ) stands up (Dan 12:1), heavenly intercession concludes, probation closes, and divine protection is withdrawn, precipitating the time of trouble.",
            diagnostics: [
              "Correct! 'Stand up' is Daniel's verb for assuming kingly power (Dan 11:2–4, 7, 20–21). When Michael stands, probation closes, the books are closed, and those written in the book of life are delivered through the final time of trouble.",
              "Misconception: Cyrus's decree occurred in 538/536 B.C., whereas Daniel 12:1 stands at the climax of the entire prophetic march of chapter 11, at the end of human history.",
              "Misconception: Augustus ruled at the start of the Roman Empire; Daniel 12:1 occurs at the resurrection and the deliverance of the saints.",
              "Misconception: Michael is 'the great prince which standeth for the children of thy people'—the defender and captain of the Lord's host, not a rebel."
            ]
          }},
          {{
            question: "A materialist philosophy professor states: 'The Old Testament contains no concept of personal bodily resurrection, only vague shadows of Sheol.' How does Daniel 12:2 and 12:13 definitively refute this assertion?",
            options: [
              "Daniel 12:2 explicitly promises that 'many of them that sleep in the dust of the earth shall awake, some to everlasting life,' and verse 13 guarantees to Daniel personally that he shall 'rest, and stand in thy lot at the end of the days.' Together they declare a literal bodily resurrection.",
              "Daniel 12 teaches eastern reincarnation where souls return in different animal bodies.",
              "Daniel states that all human consciousness is permanently annihilated at death with no resurrection.",
              "The professor is correct; Daniel 12 was mistranslated from Greek mythology."
            ],
            correct: 0,
            explanation: "Daniel 12:2 is the Old Testament's most explicit affirmation of individual bodily resurrection from the dust of the earth, concluding with God's personal covenant promise to Daniel in 12:13.",
            diagnostics: [
              "Correct! Daniel 12:2 and 12:13 provide the clearest Hebrew Bible proof of personal bodily resurrection: waking from the dust of the earth to everlasting life and standing in one's allotted inheritance at the end of the days.",
              "Misconception: Scripture teaches the sleep of death awaiting literal resurrection, not cyclic reincarnation.",
              "Misconception: Daniel 12:2 promises that those sleeping in the dust shall awake, refuting permanent annihilation of the righteous.",
              "Misconception: Daniel was composed in Hebrew and Aramaic; Daniel 12 is authentic Hebrew Scripture echoed by Jesus in John 5:28-29."
            ]
          }}
        ],
        studyGuide: {{
          trace: [
            {{
              do: "Read Daniel 10:5 and 10:6 in Scripture, then open Revelation 1:13 through 1:15 in the Scripture dock. Compare the man clothed in linen in both passages and write what they share.",
              why: "Daniel 10:5 through 10:6 describes a glorious figure clothed in fine linen with a belt of fine gold around his waist, his body like beryl and his face like lightning. Revelation 1:13 through 1:15 describes one like a son of man clothed in a garment down to the foot and girt about the chest with a golden band, his countenance like the sun shining in strength. The parallel descriptions point to the same glorified Christ who opens the long explanation of chapters ten through twelve. If you read chapter ten as only a Persian-era messenger without comparing Revelation, you miss who stands by the Tigris. If you compare the two passages, every later verse about Michael and standing up belongs to the Person Daniel has already seen in linen."
            }},
            {{
              do: "Read Daniel 10:13 in Scripture and Daniel 12:1 in Scripture. Write who Michael is and what happens when Michael stands up.",
              why: "Daniel 10:13 names Michael as your prince who came to help against the resistance of the prince of Persia, showing that nations are moved by unseen princes as well as visible kings. Daniel 12:1 declares that at that time Michael shall stand up, the great prince who stands watch over the sons of your people, and there shall be a time of trouble such as never was since there was a nation. Daniel uses ‘stand up’ for kings assuming power (11:2–4, 7, 20–21), and Michael is the great Prince — that is the posture the prophecy gives him in 12:1. If you treat Michael as only an archangel name without the kingly and priestly weight, you miss why trouble follows standing. If you keep both verses together, the book's metal sequence was always a heavenly conflict fought before it appeared on earth."
            }},
            {{
              do: "Read Daniel 11:31 and Daniel 12:11 in Scripture. In the Scripture dock, tap tamid again and write how the daily is removed in chapter eleven and what the twelve hundred ninety days measure from.",
              why: "Daniel 11:31 describes a power that shall take away the daily tamid and place the abomination that makes desolate, returning to the same attack on Christ's continual ministry that chapter eight already named. Daniel 12:11 adds twelve hundred ninety days from the time the daily is taken away and the abomination is set up, which this study reads as year-days running parallel to the sanctuary timeline traced through chapters eight and nine. If you read chapter eleven as only a geopolitical survey without the tamid, you lose the thread that ties the little horn, the ram-and-goat horn, and papal Rome together. If you connect 11:31 and 12:11, the march of kings serves the same question: when is the true daily restored and the sanctuary put right?"
            }},
            {{
              do: "Read Daniel 12:2 and Daniel 12:13 in Scripture, then open the horizon timeline and locate the stop labeled Dan 12.",
              why: "Daniel 12:2 gives the Old Testament's clearest testimony to literal bodily resurrection: many who sleep in the dust shall awake, some to everlasting life and some to shame and everlasting contempt. Daniel 12:13 closes the book with God's promise to His aged servant that he shall rest and will arise to his inheritance at the end of the days. The horizon timeline stop at Dan 12 places this climax within the numbered line the book has been building since chapter two. If you stop at the time of trouble without the awakening in verse two, the last chapter ends in panic rather than hope. If you read both verses and the timeline stop, the prophecy of metals, beasts, horns, and numbered days was always walking toward bodies leaving the dust."
            }}
          ],
          christ: {{
            claim: "Michael who stands up in Daniel 12:1 is the great prince identified with Christ, the same one like a son of man who received the kingdom in 7:14 and the High Priest whose advocacy ends when He assumes His royal stance.",
            why: "Daniel names one Lord through many titles: Prince of the host, Messiah cut off, Michael your prince, the man in linen by the Tigris. When Michael stands up, the heavenly work of advocacy is finished and the time of trouble begins because no further priestly plea remains between the sinner and judgment. Daniel 12:2 then shows the same Lord as the One who calls dust-sleepers to awake, which John 5:28 through 5:29 confirms in the New Testament. If you leave Christ in a single verse at the edge, chapters ten through twelve become a march of kings with a religious footnote. If you keep Him central, the last word of Daniel is a rising, not another empire."
          }},
          now: {{
            claim: "You will die, or you will see trouble. Either way Daniel 12:2 is the news that matters more than the next empire, and a name written in the book is the only deliverance this chapter offers.",
            why: "Daniel 12:1 promises deliverance for those whose names are found written in the book even when the time of trouble such as never was breaks upon the earth. The chapter does not end the story in despair but in bodies leaving the dust, which is why God can close with a personal promise to Daniel about resting and standing in his lot. If you use the last chapter only as a chart of future collisions, you will treat the time of trouble as spectacle rather than as the context for a register of names. If you hold verse two and verse thirteen together, the news that outranks the next metal is simple: dust wakes, and being found written matters more than predicting the next horn."
          }},
          help: {{
            claim: "This sheet ends prophecy in a body and a rest rather than in panic, giving you a last sentence to hold when the charts have done all they can do.",
            why: "God tells Daniel to go his way till the end, for you shall rest and will arise to your inheritance at the end of the days, which is a promise you can speak over your own death as well as over Daniel's. The help is not another timeline trick but a sentence about rest followed by standing in one's lot at the resurrection. If you finish the book still hunting metals, you gain information without hope. If you receive the closing promise, you gain a word to hold when names and bodies matter more than the next headline."
          }},
          value: {{
            claim: "Hope that outlasts every metal is the sealed book's gift when charts fatigue you, because Daniel is promised he will rest and stand in his lot at the end of the days.",
            why: "Chapters two through nine traced empires, horns, and numbered days with growing precision, but the book refuses to end on a diagram alone. Daniel 12:13 guarantees bodily resurrection and an allotted inheritance to the same servant who saw the churning sea and fainted over the two thousand three hundred days. That promise is why the book can close with calm rather than with another beast. When someone asks what all the prophecy was for, point past the metals: the sealed book's most valuable gift is not another empire to identify but a body awake at the end of the days."
          }},
          ask: [
            "If Michael has not yet stood up, how then shall I live while the heavenly intercession still continues?",
            "Is my hope anchored in a chart I can recite, or in a name written in the book and a body that will awake?",
            "Can I receive Daniel's blessing of rest now, knowing that standing in my lot awaits at the end of the days?"
          ]
        }},
        guide: {{
          intro: {{
            title: "Michael stands, and the dead awake",
            expect: "Daniel 10–12 closes the book: unseen war, a dated march through empires, Michael standing up, and a personal resurrection promise.",
            do: [
              "Follow Introduction and Main Points I–V plus Practical Application.",
              "Open Map and trace the Tigris River, the march of empires, and Michael standing up.",
              "Complete checkpoint questions, and review your mastery across the entire Scroll of Daniel."
            ]
          }},
          end: {{
            title: "The scroll is finished",
            nextWhy: "You have walked the metals, the beasts, the numbered days, and the hope of 12:13. Review the syllabus or return home. There is no sheet 11.",
            spotlight: "next-sheet-btn"
          }}
        }}
      }}'''

pattern = r'      \{\s*\n\s*id: 10,.*?\n      \}\s*\n    \];'
m = re.search(pattern, text, re.DOTALL)
if not m:
    raise SystemExit("Could not find sheet 10 block")
text = text[:m.start()] + new_block + "\n    ];" + text[m.end():]
data_path.write_text(text, encoding="utf-8")
print("Patched Sheet 10 in", data_path)
