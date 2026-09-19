"""Patch sheets-data.js sheet 9 with generated HTML and refined metadata."""
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
html = (ROOT / "tools" / "sheet9_generated.html").read_text(encoding="utf-8")
data_path = ROOT / "js" / "study" / "sheets-data.js"
text = data_path.read_text(encoding="utf-8")

js_content = html.replace("\\", "\\\\").replace("`", "\\`").replace("${", "\\${")

new_block = f'''      {{
        id: 9,
        epoch: "SHEET 09 &bull; DANIEL 9",
        readTime: "22 min read",
        allocatedMinutes: 22,
        scripture: "Daniel 9:1-27 &bull; Babylon, 538 B.C.",
        title: "The 70 Weeks (Chathak) & The Cross: The Mathematical Anchor of 1844",
        subtitle: "How the crucifixion of Christ in A.D. 31 establishes the start date for the 2,300-day prophecy.",
        flow: [
          {{ kind: "scripture", title: "Gabriel returns to explain", text: "“Consider the vision” — the unexplained 2,300 of chapter 8 that made Daniel faint.", tag: "Daniel 9:21–23; 8:27" }},
          {{ kind: "anchor", title: "Chathak: severed from the line", text: "Chathak — a hapax: seventy weeks are severed from the longer 2,300-day line, so both share one starting point.", tag: "Daniel 9:24" }},
          {{ kind: "scripture", title: "Four decrees, one 'restore'", text: "Only Artaxerxes’ seventh-year decree (457 B.C., Ezra 7) restores magistrates and judges — the civil “restore” of 9:25.", tag: "Ezra 7:11–26" }},
          {{ kind: "scripture", title: "The walk to Messiah in A.D. 27", text: "457 B.C. + 483 years (no year zero) = autumn A.D. 27 — baptism and anointing: “The time is fulfilled.”", tag: "Daniel 9:25; Luke 3:1, 21–23; Mark 1:15" }},
          {{ kind: "anchor", title: "The cross in the midst (A.D. 31)", text: "Messiah cut off “but not for himself,” spring A.D. 31; the veil tears from top to bottom (Matthew 27:51).", tag: "Daniel 9:26–27" }},
          {{ kind: "guard", title: "No gap after week 69", text: "The “he” of 9:27 is the Messiah of 9:26 — the seventieth week is Christ's, not a future tyrant's.", tag: "Daniel 9:26–27 grammar" }},
          {{ kind: "scripture", title: "The remainder lands in 1844", text: "2,300 − 490 = 1,810 years; A.D. 34 + 1,810 = autumn 1844 — the line ends where chapter 8 said it would.", tag: "Daniel 9:27 → 8:14" }}
        ],
        content: `
{js_content}
        `,
        christology: {{
                "kicker": "Christology",
                "title": "Messiah Cut Off: The Mathematical Anchor of Prophecy",
                "scripture": "Daniel 9:24–27; Mark 1:15; Matthew 27:50–51; Isaiah 53:5; Hebrews 9:26",
                "body": [
                        "In Daniel 9, the focal point of the entire prophetic calendar converges upon the Person and work of Jesus Christ. Gabriel announces that sixty-nine prophetic weeks (483 literal years) from the Persian decree in 457 B.C. would reach 'unto the Messiah the Prince' (Daniel 9:25). In Autumn A.D. 27, precisely on schedule, Jesus was anointed by the Holy Spirit at His baptism in the Jordan, declaring: 'The time is fulfilled, and the kingdom of God is at hand' (Mark 1:15).",
                        "In the midst of the seventieth week—Spring A.D. 31—the divine climax occurred: Messiah was 'cut off, but not for himself' (Daniel 9:26). On Calvary's cross, Jesus bore our sins in His own body. In that awful, sacred hour, the temple veil tore from top to bottom (Matthew 27:51), signifying that type had met Antitype, earthly animal sacrifices had ceased to possess divine efficacy, and Christ had confirmed the everlasting covenant through His own shed blood.",
                        "Rejoice in the immovable historical certainty of your salvation. Because Jesus Christ was baptized and crucified on exact prophetic schedule in A.D. 27 and A.D. 31, the arithmetic that proved true at Calvary carries the remaining 1,810 years to 1844 on the same line, with the cross itself as the anchor. Stand secure in the righteousness of the One who was cut off for you, knowing that your High Priest now intercedes in the heavenly sanctuary until His kingdom is fully revealed."
                ]
        }},
        quizzes: [
          {{
            question: "A Bible student asks: 'Why do Seventh-day Adventist historicists connect the 70 weeks of Daniel 9 with the 2,300 days of Daniel 8, when chapter 9 does not mention the 2,300 days by name?'",
            options: [
              "Gabriel commands Daniel to 'consider the vision' (referring to the unexplained 2,300-day vision of Daniel 8:14, 27); the verb chathak in Daniel 9:24 specifically means 'to cut off or sever,' proving the 70 weeks are severed from the 2,300 days, giving both the exact same 457 B.C. starting point.",
              "The connection was invented by 19th-century American newspapers with no biblical basis.",
              "Daniel 9 is an allegorical poem about the rebuilding of King Solomon's palace.",
              "The two prophecies were written by different authors living centuries apart in Egypt."
            ],
            correct: 0,
            explanation: "Gabriel commands Daniel to understand 'the vision' (the only unexplained vision was the 2,300 days of 8:14, 27). The Hebrew verb chathak in 9:24 is a technical term meaning 'severed' or 'cut off' from a longer period.",
            diagnostics: [
              "Correct! Gabriel commands Daniel to consider the vision (Dan 9:23) and uses chathak ('cut off'), proving the 70 weeks are severed from the parent 2,300-day timeline.",
              "Misconception: Historicist exposition traces back to the early Christian centuries, Jewish commentators, and the Protestant Reformation, based strictly on the Hebrew text.",
              "Misconception: Daniel 9:24-27 is an explicit messianic timeline of 70 weeks concerning Jerusalem and Messiah the Prince, not Solomon's palace.",
              "Misconception: Daniel was the sole author, receiving both revelations from the angel Gabriel within a 13-year span in Babylon."
            ]
          }},
          {{
            question: "Dispensational futurism claims the 70th week of Daniel 9:27 was detached and pushed 2,000 years into the future as a 7-year tribulation under Antichrist. What grammatical and theological fact refutes this?",
            options: [
              "In Daniel 9:26-27, the pronoun 'he' refers to the subject 'Messiah,' who confirmed the New Covenant in His blood (Matt 26:28; Heb 8:8-13) and caused animal sacrifices to cease by dying on Calvary in the midst of the 70th week (Spring A.D. 31).",
              "The Hebrew text explicitly names Antichrist as the subject of verse 27.",
              "Daniel 9 was fulfilled entirely during the reign of King Nebuchadnezzar.",
              "The 70th week is 7,000 literal years long and cannot be measured on any calendar."
            ],
            correct: 0,
            explanation: "In Daniel 9:26-27, Messiah is the antecedent of 'he'. Christ confirmed the covenant (Matt 26:28) and caused sacrifice to cease by dying on the cross in the middle of the 70th week (A.D. 31). Inserting a 2,000-year gap fractures the text.",
            diagnostics: [
              "Correct! The subject of 9:26 is Messiah; the pronoun 'he' in 9:27 refers to Christ confirming the covenant and ending animal sacrifices on Calvary. Slicing off the 70th week robs Christ of His prophecy.",
              "Misconception: The word 'antichrist' appears nowhere in Daniel 9; Christ is 'Messiah the Prince' who confirms the covenant.",
              "Misconception: Daniel 9:24-27 spans from Artaxerxes in 457 B.C. to the Christian era (A.D. 27-34), centuries after Nebuchadnezzar's death.",
              "Misconception: A prophetic week equals seven literal years under the year-day principle; there is no textual basis for a 7,000-year interpretation."
            ]
          }}
        ],
        studyGuide: {{
          trace: [
            {{
              do: "Open Scripture to Daniel 9:3 through 9:19. Read Daniel's prayer of confession in sackcloth and ashes for his people.",
              why: "Daniel was one of the godliest men in history, yet his prayer repeatedly says 'we have sinned' and 'to us belongeth confusion of faces.' True intercessory prayer does not separate itself from the community in self-righteous pride; it takes the burden of the people to God. If you skip the prayer, chapter nine looks like a pure math exam. If you keep the prayer, you understand that prophetic dates are given as an answer to repentance and covenant distress."
            }},
            {{
              do: "Read Daniel 9:24 in Scripture, noting the six goals and the verb chathak ('cut off'). Open Ezra 7:11–26 in the Scripture dock.",
              why: "Daniel 9:24 lists six great covenant goals culminating in anointing the most holy and bringing in everlasting righteousness. The Hebrew verb chathak proves the 490 years are severed from the 2,300 days of Daniel 8:14. Ezra 7 provides the decree of Artaxerxes I in 457 B.C. that gives civil self-government to Jerusalem, anchoring both prophecies in historical reality."
            }},
            {{
              do: "Walk the arithmetic of Daniel 9:25–27: 457 B.C. + 483 years = A.D. 27; + 3.5 years = Spring A.D. 31; + 3.5 years = Autumn A.D. 34; + 1,810 years = Autumn 1844.",
              why: "Walking the arithmetic step-by-step with the no-year-zero rule shows that Christ was baptized on time (A.D. 27) and crucified on time (A.D. 31). The cross is the mathematical anchor of prophecy: because the first 490 years proved true down to the season, the remaining 1,810 years carry us with unshakeable certainty to the heavenly Day of Atonement in 1844."
            }},
            {{
              do: "Read Daniel 9:26–27 and Matthew 27:51. Trace who confirms the covenant and causes sacrifice and oblation to cease.",
              why: "Messiah confirms the covenant with many for one week and causes sacrifice to cease in the midst of the week when He dies and the temple veil is rent from top to bottom. Slicing off this week to assign it to a future Antichrist breaks the pronoun chain and robs Jesus of His glory. If you keep Christ as the 'he' of verse 27, Calvary stands at the glorious center of the 70 weeks."
            }}
          ],
          christ: {{
            claim: "Messiah is cut off, but not for Himself, in Daniel 9:26, which is Jesus at Passover in spring A.D. 31 in the midst of the seventieth week. His baptism and anointing at A.D. 27 open that week, and His death brings sacrifice and offering to their end at the cross.",
            why: "Daniel 9:26 through 9:27 place the Person before the arithmetic: Messiah confirms the covenant through His ministry and is cut off in the midst of the week so that the veil tears and the earthly sacrificial system reaches its end. A.D. 27 marks His anointing when sixty-nine weeks of prophetic years run from the 457 B.C. decree, and A.D. 31 marks the midst when He dies not for Himself but for the many. If your method postpones the seventieth week into a still-future seven years, you build a clock that misses the Person the weeks were cut to land on. If you keep Christ at the center, Calvary is the hinge and the leftover sanctuary years are the same line, sealed by His blood rather than separated from it."
          }},
          now: {{
            claim: "Dated mercy at the cross means your life is not floating in untimed religion. If Messiah landed on schedule in A.D. 31, the sanctuary appointment at the end of the same line is not folklore.",
            why: "Gabriel's arithmetic ties baptism, crucifixion, and the remaining balance of the two thousand three hundred days to one decree and one cut line, which means God numbers centuries with purpose rather than leaving prophecy as atmosphere. If the cross happened on schedule in the midst of the week, the leftover years to the sanctuary cleansing of 8:14 are the same kind of dated speech from the same God. If you treat A.D. 31 as optional while keeping 1844, you split a stick that Daniel's text refuses to split. If you accept the dated cross, both the gospel and the sanctuary appointment ask for the same trust: that God keeps His numbered word."
          }},
          help: {{
            claim: "This sheet gives you a single test for any chart that postpones the seventieth week: ask who confirms the covenant in Daniel 9:27.",
            why: "If the he of 9:27 is Messiah already named in 9:26, you are not waiting for a seven-year restart that pushes the cross out of Daniel's timeline. If the he is a future tyrant, the pronoun chain breaks and week seventy floats free of the Person Gabriel was explaining. That one question collapses a postponed week without needing a shouting match over dates. What you gain is a test you can run on any inheritance before you adopt it: does this reading keep Messiah in the midst of the week or park Him elsewhere? The help is a who-question, not a louder poster."
          }},
          value: {{
            claim: "A hapax verb that forces a cut from the two thousand three hundred days is more valuable than a chart you cannot defend when someone asks why.",
            why: "Chathak appears only once in the Hebrew Bible, and Gabriel uses it while Daniel is still sick from the vision of chapter 8, which forces you to show why the seventy weeks belong on the same line. When you can explain cut off from what and walk the arithmetic from 457 to 27 to 31 to 34 to the remaining balance, 1844 stands or falls with Calvary in an honest way. If someone moves A.D. 31, you can show them exactly what else must move on the same stick. That is ownership of the prophecy rather than inheriting a date you cannot explain when challenged."
          }},
          ask: [
            "Cut off from what — can I answer that question from Scripture without borrowing a teacher's summary?",
            "Why does inserting a gap after week sixty-nine break Gabriel's command to consider the vision in 9:23?",
            "If Messiah died on schedule in the midst of the week, what does that do to my willingness to trust the leftover sanctuary years on the same line?"
          ]
        }},
        guide: {{
          intro: {{
            title: "457, A.D. 31, and 1844",
            expect: "Daniel 9 cuts seventy weeks from the 2,300 days. You will do the arithmetic yourself and see why the confirming 'he' is Messiah.",
            do: [
              "Follow Introduction and Main Points I–V plus Practical Application.",
              "Open Map and trace Artaxerxes' decree (457 B.C.), Calvary (A.D. 31), and the sanctuary (1844). View the royal decree.",
              "Complete checkpoint questions, then continue to the final vision of Daniel 10–12."
            ]
          }},
          end: {{
            title: "Michael standing is next",
            nextWhy: "Daniel 10–12 is next: the man in linen, the long march of chapter 11, and the promise of 12:13.",
            spotlight: "next-sheet-btn"
          }}
        }}
      }},'''

pattern = r'      \{\s*\n\s*id: 9,.*?\n      \},\s*\n      \{\s*\n\s*id: 10,'
m = re.search(pattern, text, re.DOTALL)
if not m:
    raise SystemExit("Could not find sheet 9 block")
text = text[:m.start()] + new_block + "\n      {\n        id: 10," + text[m.end():]
data_path.write_text(text, encoding="utf-8")
print("Patched Sheet 9 in", data_path)
