"""Patch sheets-data.js sheet 8 with generated HTML and refined metadata."""
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
html = (ROOT / "tools" / "sheet8_generated.html").read_text(encoding="utf-8")
data_path = ROOT / "js" / "study" / "sheets-data.js"
text = data_path.read_text(encoding="utf-8")

js_content = html.replace("\\", "\\\\").replace("`", "\\`").replace("${", "\\${")

new_block = f'''      {{
        id: 8,
        epoch: "SHEET 08 &bull; DANIEL 8",
        readTime: "22 min read",
        allocatedMinutes: 22,
        scripture: "Daniel 8:1-27 &bull; Susa, c. 551 B.C.",
        title: "The Ram, The Goat, & 2,300 Days: The Cleansing of the Sanctuary",
        subtitle: "Gabriel's named empires, the attack on Christ's continual mediation (tamid), refutation of Antiochus, and the 1844 Day of Atonement in heaven.",
        flow: [
          {{ kind: "anchor", title: "The angel names the animals", text: "The two-horned ram is Media and Persia; the rough goat is Grecia — zero room for human guesswork.", tag: "Daniel 8:20–21" }},
          {{ kind: "scripture", title: "Alexander and the four horns", text: "Alexander dies at 32; four Diadochi realms arise toward the four winds of heaven (Cassander, Lysimachus, Seleucus, Ptolemy).", tag: "Daniel 8:8, 21–22" }},
          {{ kind: "anchor", title: "Rome in two phases", text: "Grows 'exceedingly great' (yigdal-me'od): pagan Rome horizontally (Egypt, Syria, Judea; crucifies Prince) and papal Rome vertically.", tag: "Daniel 8:9–10; SDABC 4:841" }},
          {{ kind: "scripture", title: "The attack on the Tamid", text: "The horn removes the tamid — Christ's continual heavenly intercession obscured by a counterfeit earthly priesthood.", tag: "Daniel 8:11–12; Hebrews 7:25" }},
          {{ kind: "guard", title: "Three tests Antiochus fails", text: "Not 'exceedingly great' (tributary to Rome), not 'time of the end' (8:17, 19), and 3 years cannot span 2,300 prophetic days.", tag: "Daniel 8:9, 14, 17, 19" }},
          {{ kind: "anchor", title: "Nitsdaq: courtroom vindication", text: "Nitsdaq — justified, vindicated, restored to rightful state: Day of Atonement grammar in the heavenly sanctuary (Leviticus 16; Hebrews 8–9).", tag: "Daniel 8:14; Leviticus 16:30" }},
          {{ kind: "history", title: "2,300 years land in 1844", text: "From 457 B.C. decree (Artaxerxes I) to October 22, 1844 — Christ enters the Most Holy Place for the pre-advent judgment.", tag: "Daniel 8:14; 9:24–27; Froom Vol. 4" }}
        ],
        content: `
{js_content}
        `,
        christology: {{
                "kicker": "Christology",
                "title": "The Great High Priest in the Heavenly Sanctuary",
                "scripture": "Daniel 8:11–14; Hebrews 7:25; 8:1–2; 9:23–26; Leviticus 16:16, 30",
                "body": [
                        "Daniel 8 unveils the assault of the little horn power upon 'the Prince of the host'—casting down the place of His sanctuary, taking away the daily intercession, and casting truth to the ground (Daniel 8:11–12). The Prince of the host is Jesus Christ. In response to this counterfeit earthly priesthood, Heaven proclaims the divine remedy: 'Unto two thousand and three hundred days; then shall the sanctuary be cleansed [nitsdaq]' (Daniel 8:14). This points not to an earthly building in Jerusalem, but to the true tabernacle which the Lord pitched, and not man (Hebrews 8:1–2).",
                        "The Day of Atonement cleansing of the sanctuary in 1844 is Christ's final priestly work, not a repetition of the cross. On Calvary, Jesus offered the once-for-all, all-sufficient sacrifice for human sin, paying our penalty in full (Hebrews 9:26). But an atonement requires both sacrifice and priestly ministry. In the heavenly sanctuary, our Great High Priest applies His shed blood, blotting out the recorded sins of His people and cleansing the sanctuary before the universe prior to His glorious return.",
                        "Enter boldly by faith into the Most Holy Place where Jesus ministers on your behalf. Do not allow human traditions, confessional booths, or earthly intermediaries to obscure Christ's direct and living mediation. Confess your sins honestly to Him today; He is faithful and just to forgive and cleanse you from all unrighteousness. Live with reverent joy, knowing that our High Priest is finishing His work of reconciliation and will soon step out of the sanctuary to receive His waiting people."
                ]
        }},
        quizzes: [
          {{
            question: "A commentator claims: 'The 2,300 evenings and mornings of Daniel 8:14 mean 1,150 morning and evening sacrifices (3.15 literal years) fulfilled when Judas Maccabeus cleansed the altar in December 164 B.C.' What textual evidence in Daniel 8 refutes this reduction?",
            options: [
              "The phrase 'evening-morning' (ereb boqer) mirrors Genesis 1:5, defining a full prophetic day; the angel states the vision reaches to the 'time of the end' (8:17) and covers the Medo-Persian ram and Grecian goat, demanding 2,300 literal years under the year-day principle (Num 14:34, Ezek 4:6).",
              "The Hebrew text says '2,300 months' rather than days.",
              "Judas Maccabeus never existed in history.",
              "The temple was completely destroyed and never cleansed until modern times."
            ],
            correct: 0,
            explanation: "Daniel 8:26 calls it 'the vision of the evening and the morning,' using the Genesis 1 creation formula for full day units. Furthermore, the vision spans from Persia and Greece through the Roman little horn to the 'time of the end' (Dan 8:17, 19).",
            diagnostics: [
              "Correct! Daniel 8:26 refers to the entire period as 'the vision of the evening and the morning,' identifying each unit as a prophetic day. The angel's declaration that the vision belongs to the 'time of the end' disproves the 3-year Maccabean hypothesis.",
              "Misconception: The Hebrew text reads 'ad ereb boqer alpaim ushelosh me'ot' (unto evening morning two thousand three hundred); there is no mention of months.",
              "Misconception: Judas Maccabeus was an authentic historical leader who rededicated the earthly altar in 164 B.C. (Hanukkah), but this local event falls far short of the cosmic scope of Daniel 8.",
              "Misconception: The earthly temple was restored by the Maccabees and later by Herod, but Daniel 8:14 focuses on the celestial sanctuary and the antitypical Day of Atonement."
            ]
          }},
          {{
            question: "A Bible student notices that English translations often render Daniel 8:14 as 'then shall the sanctuary be cleansed,' and wonders why the Hebrew verb is nitsdaq (נִצְדַּק) rather than taher (טָהֵר - ritual washing). What is the theological significance?",
            options: [
              "Nitsdaq is a forensic courtroom term meaning 'justified, vindicated, restored to its rightful state'—signifying the heavenly sanctuary being vindicated from the usurpations of the Little Horn and the final cosmic reconciliation of the Day of Atonement (Lev 16).",
              "It refers to physical janitorial cleaning of stone floors with water and soap.",
              "It indicates that the sanctuary was demolished and replaced by an earthly kingdom.",
              "It means that animal sacrifices would be reinstituted permanently in Jerusalem."
            ],
            correct: 0,
            explanation: "Strong's H6663 (nitsdaq) is forensic (Deut 25:1, Job 4:17). The cleansing of the heavenly sanctuary is not the removal of physical dirt, but the vindication of God's character and government in judgment.",
            diagnostics: [
              "Correct! Nitsdaq is forensic: justifying, righting, and vindicating. It points directly to the heavenly Day of Atonement, vindicating the sanctuary against the little horn's counterfeit priesthood.",
              "Misconception: Taher is the Hebrew verb for physical or ceremonial cleansing; Daniel was inspired to use nitsdaq to indicate forensic vindication and moral restoration.",
              "Misconception: The prophecy announces the restoration and vindication of the sanctuary, not its permanent destruction.",
              "Misconception: Hebrews 9-10 explains that Christ's once-for-all sacrifice brought animal sacrifices to an end; Daniel 8:14 centers on Christ's high-priestly ministry in the heavenly sanctuary."
            ]
          }}
        ],
        studyGuide: {{
          trace: [
            {{
              do: "Open Scripture to Daniel 8:3 through 8:8 and 8:20 through 8:21. On the chronicle map, locate the stop at Susa where Daniel saw the ram and goat vision by the Ulai canal.",
              why: "When you read Daniel 8:3 through 8:8, you see a two-horned ram charging west, north, and south until a goat from the west strikes it without resistance, breaks both horns, and tramples it. The angel names the ram as Media and Persia and the goat as Grecia in 8:20 and 8:21. The map stop at Susa shows where Daniel stood when he received this vision, which keeps the animals tied to real geography rather than abstract symbols. If you skip the angel's names and the map, the little horn in the next verses can attach to anyone. If you use both Scripture and the map, you gain a fixed chain of empires that any horn must fit."
            }},
            {{
              do: "Read Daniel 8:9 through 8:12 in Scripture. In the Scripture dock, tap the load-bearing line for tamid and write what the horn removes and what sanctuary it casts down.",
              why: "When you read Daniel 8:9 through 8:12, a little horn grows exceedingly great toward the south, east, and the Glorious Land. It magnifies itself even to the Prince of the host, removes the tamid (the continual daily ministry), casts down the place of His sanctuary, and tramples truth to the ground. This attack is directed against heaven's ongoing priestly work, not merely a local altar in Judea. If you treat the horn as only a territorial conqueror, you will miss why Gabriel must give a numbered span for when the sanctuary will be put right. If you circle tamid and follow the dock, you see that the prophecy concerns Christ's standing intercession being replaced by a counterfeit."
            }},
            {{
              do: "Read Daniel 8:14 in Scripture, then open Leviticus 16:30 in the Scripture dock. Tap the load-bearing line for nitsdaq and write how the Hebrew word differs from a simple cleaning.",
              why: "Daniel 8:14 answers the question with two thousand three hundred days, then shall the sanctuary be cleansed. The Hebrew verb nitsdaq means to be justified, put right, or vindicated, a courtroom word rather than a mop-and-bucket cleaning. Leviticus 16:30 describes the Day of Atonement when the sanctuary is cleansed from sin through the high priest's work in the Most Holy Place. If you hear only physical washing, Antiochus Epiphanes's three-year desecration in 164 B.C. might seem sufficient. If you connect nitsdaq to Leviticus 16, you see that 8:14 belongs with the books opened in Daniel 7:9 through 7:10 and points to a heavenly judgment work rather than a short earthly interruption."
            }},
            {{
              do: "Read Daniel 8:17 through 8:19 and 8:27 in Scripture. Write what Gabriel says about the time of the end and note Daniel's reaction when no one could explain the vision.",
              why: "Gabriel tells Daniel twice in 8:17 and 8:19 that the vision belongs to the time of the end, which means it cannot be exhausted by a second-century crisis. Daniel 8:27 records that Daniel fainted and was sick for days because no one could explain the two thousand three hundred days to him. The vision has named the attack and given the length of the wait, but without a starting date the number floats unattached to any calendar. If you stop at Antiochus in 164 B.C., you cut the longest number in the book short and leave nothing for modern history. If you keep Gabriel's time horizon and Daniel's sickness, you see why chapter 9 must supply the decree that anchors the count."
            }}
          ],
          christ: {{
            claim: "The Prince of the host whom the horn magnifies itself against is Jesus Christ. The tamid He performs is the true continual ministry of intercession described in Hebrews 7:25, and nitsdaq is His sanctuary put right through the Day of Atonement work He completes as High Priest.",
            why: "Daniel 8:11 shows the horn rising against the Prince of the host and removing the tamid, which is Christ's standing priesthood rather than a pile of sacrificial ashes on an earthly altar. Hebrews 7:25 declares that He ever liveth to make intercession for them that come unto God by Him, and that is the daily the horn seeks to replace with a counterfeit. Nitsdaq connects the sanctuary cleansing of 8:14 to Leviticus 16, where the high priest enters the Most Holy Place to put the sanctuary right before God. If you shrink the prophecy to three years under Antiochus, you remove Christ from the center of the book's longest number. If you keep the Prince of the host and the true tamid in view, the two thousand three hundred days point to when His heavenly ministry reaches its Day of Atonement fulfillment."
          }},
          now: {{
            claim: "Gabriel says this vision belongs to the time of the end, which means you are studying prophecy that still speaks to your century rather than a finished museum piece.",
            why: "Daniel 8:17 and 8:19 place the vision's horizon at the time of the end, so the attack on the tamid and the wait for the sanctuary to be put right are not ancient history alone. Counterfeit priesthoods still offer a daily ministry that is not Christ's, which is the same spiritual pattern the horn enacted under both pagan and papal Rome. If you file chapter 8 under the Maccabees alone, you will miss why a false daily in your own century remains on topic. If you accept Gabriel's end-time horizon, the sheet asks whether you look to Christ's continual intercession or to earthly mediators who stand in His place."
          }},
          help: {{
            claim: "This sheet gives you two tests you can run on any candidate for the little horn: scale of greatness and time horizon to the end.",
            why: "The prophecy requires an exceedingly great power that tramples truth across centuries and reaches to the time of the end, not a tribute-paying Seleucid king who died in 164 B.C. The article lists three specific reasons Antiochus Epiphanes fails the biblical criteria, and you can apply those same tests to any other suggestion. If you only feel alarm about horns without checking scale and horizon, you gain emotion without discernment. If you use the angel's nouns for the ram and goat and the forensic verb nitsdaq, you can explain why the vision remains open for your century instead of collapsing into a three-year footnote."
          }},
          value: {{
            claim: "When the angel names the empires and the verb nitsdaq ties 8:14 to a heavenly Day of Atonement, the sanctuary appointment becomes arithmetic on Scripture rather than a slogan you cannot defend.",
            why: "Named ram and goat plus a forensic nitsdaq mean you can walk a friend through the angel's own identifications and the court language of Leviticus 16 without relying on inherited charts alone. Chapter 9 will cut the first seventy weeks from this same two thousand three hundred day line and supply the decree of 457 B.C. as a starting date. If someone calls the sanctuary appointment folklore, you have the angel's nouns, the Hebrew verb, and the arithmetic chain to show your work. That is ownership of the prophecy rather than borrowing a date you cannot explain when challenged."
          }},
          ask: [
            "Why does the prophecy's requirement of exceedingly great power create a problem for a tribute-paying king who died in 164 B.C.?",
            "If Gabriel says the vision is for the time of the end, what must I refuse to do with Antiochus alone?",
            "What does it mean for my own worship that the holy place is being put right through Christ's priesthood rather than an earthly altar?"
          ]
        }},
        guide: {{
          intro: {{
            title: "The sanctuary attacked, then put right",
            expect: "Daniel 8 names the ram and goat, then asks when the sanctuary the horn attacks will be nitsdaq — put right.",
            do: [
              "Follow Introduction and Main Points I–V plus Practical Application.",
              "Open Map and trace the Ulai at Susa, Gaugamela, and the 1844 American awakening. View the 3D artifact.",
              "Complete checkpoint questions, then continue to the 70 weeks of Daniel 9."
            ]
          }},
          end: {{
            title: "Seventy weeks are next",
            nextWhy: "Daniel 9 is next: chathak cuts seventy weeks from this same line so the cross can date 8:14.",
            spotlight: "next-sheet-btn"
          }}
        }}
      }},'''

pattern = r'      \{\s*\n\s*id: 8,.*?\n      \},\s*\n      \{\s*\n\s*id: 9,'
m = re.search(pattern, text, re.DOTALL)
if not m:
    raise SystemExit("Could not find sheet 8 block")
text = text[:m.start()] + new_block + "\n      {\n        id: 9," + text[m.end():]
data_path.write_text(text, encoding="utf-8")
print("Patched Sheet 8 in", data_path)
