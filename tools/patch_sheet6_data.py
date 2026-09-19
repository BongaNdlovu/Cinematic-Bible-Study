"""Patch sheets-data.js sheet 6 with generated HTML and updated metadata."""
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
html = (ROOT / "tools" / "sheet6_generated.html").read_text(encoding="utf-8")
data_path = ROOT / "js" / "study" / "sheets-data.js"
text = data_path.read_text(encoding="utf-8")

js_content = html.replace("\\", "\\\\").replace("`", "\\`").replace("${", "\\${")

new_block = f'''      {{
        id: 6,
        epoch: "SHEET 06 &bull; DANIEL 6",
        readTime: "18 min read",
        allocatedMinutes: 18,
        scripture: "Daniel 6:1-28 &bull; Babylon, c. 538 B.C.",
        title: "The Pit of Hunger: The Law of the Medes and Persians, The Open Window, and the Resurrection of Christ",
        subtitle: "The irrevocable imperial statute, blameless integrity under audit, prayer facing Jerusalem, and the sealed pit as a type of the risen Christ.",
        flow: [
          {{ kind: "history", title: "Transition from gold to silver", text: "Babylon falls; Darius the Mede establishes 120 satrapies under 3 presidents, with Daniel chief.", tag: "Daniel 5:31; 6:1–3" }},
          {{ kind: "history", title: "The unalterable statute", text: "Medo-Persian constitutional code: royal decrees cannot be repealed (Esther 8:8; Diodorus XVII.30).", tag: "Daniel 6:8, 12, 15" }},
          {{ kind: "scripture", title: "The forensic audit", text: "Satraps find zero error or fault — the only charge possible concerns the law of his God.", tag: "Daniel 6:4–5" }},
          {{ kind: "anchor", title: "The window stays open", text: "Daniel prays toward Jerusalem three times daily as he did aforetime; civil duty yields to the First Commandment.", tag: "Daniel 6:10; Acts 5:29" }},
          {{ kind: "scripture", title: "The sealed pit of hunger", text: "Cast into the den of lions; stone sealed with royal signet; king fasts through the night.", tag: "Daniel 6:16–18" }},
          {{ kind: "scripture", title: "Dawn inquiry and deliverance", text: "God sent his angel and shut the lions' mouths; Darius decrees worship of the living God.", tag: "Daniel 6:20–27" }},
          {{ kind: "guard", title: "The pit and the empty tomb", text: "Daniel sealed in the pit foreshadows Christ sealed in the tomb, rising at dawn over the roaring lion.", tag: "Matt 27:62–66; 1 Pet 5:8" }}
        ],
        content: `
{js_content}
        `,
        christology: {{
                "kicker": "Christology",
                "title": "The Living Deliverer Who Conquered the Sealed Tomb",
                "scripture": "Daniel 6:16–23; Matthew 27:62–66; 28:1–6; Hebrews 13:20; 1 Peter 5:8",
                "body": [
                        "Daniel's steadfast habit of praying toward Jerusalem three times a day, in the face of an unalterable imperial death decree, mirrors the unwavering prayer life and obedience of our Lord Jesus Christ in Gethsemane. When Daniel was cast into the pit of ravenous beasts and a stone was sealed over its mouth with the king's signet, he became an unmistakable prophetic picture of Christ entombed in Joseph of Arimathea’s garden under the Roman seal.",
                        "The tomb of Jesus could not hold the Prince of Life. Through the blood of the everlasting covenant, the God of peace brought again from the dead our Lord Jesus (Hebrews 13:20). Darius the Mede was compelled to issue an imperial decree honoring 'the living God, and stedfast for ever, and his kingdom that which shall not be destroyed' (Daniel 6:26). The enemies who plotted Daniel's destruction were destroyed by the very trap they laid, just as Satan's power was crushed at the cross when he thought he had swallowed up the Son of God.",
                        "Face intimidation, workplace pressure, and spiritual warfare with the confident peace of a resurrected Lord. Satan walks about as a roaring lion seeking whom he may devour (1 Peter 5:8), but Jesus Christ has broken his teeth and silenced his accusations. Keep your windows open toward the heavenly Jerusalem in daily prayer; do not let worldly decrees or secular scoffing compromise your communion with Christ. The God who delivered Daniel from the pit of hunger will preserve you through every dark trial."
                ]
        }},
        quizzes: [
          {{
            question: "The Persian satraps engineer an imperial law forbidding petitions to any god or man except Darius for 30 days. When Daniel learns the document is signed, he prays with windows open toward Jerusalem as before. A modern colleague asks: 'Why didn't Daniel pray quietly in his heart or pull the curtains to obey the law while keeping his faith?'",
            options: [
              "Concealing his prayer would have conceded that the state possessed legitimate jurisdiction over communion with God; Daniel maintained an open covenant testimony because the crown had attempted to usurp the throne of Heaven.",
              "Daniel wanted to provoke a civil war against the Medo-Persian government.",
              "Daniel did not know the decree had been signed until the guards arrested him.",
              "The law of the Medes and Persians applied only to native Persians, not foreign captives."
            ],
            correct: 0,
            explanation: "Daniel 6:10 notes: 'when Daniel knew that the writing was signed, he went into his house... and prayed, and gave thanks before his God, as he did aforetime.' Compromise through secrecy would legitimize the state's blasphemous claim.",
            diagnostics: [
              "Correct! Daniel knew the decree was signed and deliberately altered nothing. Conceding that the state has the right to pause or regulate prayer to the Creator would be an act of spiritual treason.",
              "Misconception: Daniel was completely non-violent; he submitted peacefully to arrest and the lions' den, stating 'before the king have I done no hurt' (Dan 6:22).",
              "Misconception: Daniel 6:10 begins explicitly: 'Now when Daniel knew that the writing was signed...' His action was deliberate, conscious obedience to God.",
              "Misconception: The decree was universal across all 120 provinces, establishing an unalterable royal interdict across the entire empire."
            ]
          }},
          {{
            question: "A literary scholar notes the remarkable parallels between Daniel in the pit of lions (Dan 6:17) and Christ in the tomb (Matt 27:66). What theological reality does this exilic narrative foreshadow?",
            options: [
              "Like Christ, Daniel was condemned by envious leaders, placed in a pit covered with a stone and sealed with a royal seal, and emerged unharmed at daybreak because God's innocent servant cannot be held by death, compelling the monarch to proclaim God's everlasting kingdom.",
              "Daniel survived because Persian lions were trained to be vegetarians.",
              "The narrative proves that believers will never experience trials or physical persecution in this life.",
              "Darius broke the seal during the night and replaced Daniel with another prisoner."
            ],
            correct: 0,
            explanation: "Daniel's deliverance is a vivid prophetic type of the resurrection: an innocent servant delivered to death through corrupt rulers, a stone placed and sealed with imperial signets, and morning deliverance through divine intervention.",
            diagnostics: [
              "Correct! Daniel 6 provides an unmistakable type: an innocent servant delivered to death through corrupt rulers, a stone placed and sealed with imperial signets, and morning deliverance through divine intervention.",
              "Misconception: Verse 24 shows that when the corrupt accusers were cast in, the hungry lions broke all their bones in pieces before they reached the bottom.",
              "Misconception: Daniel was thrown into the pit of death; God does not promise exemption from trials, but walking with His people and ultimate resurrection deliverance.",
              "Misconception: Darius spent the night fasting without sleep and rushed to the pit at dawn with lamentable voice; the imperial seal was broken only in the morning before witnesses."
            ]
          }}
        ],
        studyGuide: {{
          trace: [
            {{
              do: "Open Scripture to Daniel 6:4 and 6:5. Read what the satraps admitted after searching Daniel's record for corruption.",
              why: "When you read Daniel 6:4 and 6:5, you will see that Daniel's enemies found no fault in his administration except concerning the law of his God. Their honesty is itself a testimony: the only charge they could invent had to target worship, not fraud or incompetence. If you skip these verses, the trap looks like random palace intrigue. If you keep them, you understand that integrity left the conspirators no honest lever, which is why they aimed the irrevocable decree at prayer rather than policy."
            }},
            {{
              do: "Read Daniel 6:10 in Scripture. Mark the phrase 'as he did aforetime' and compare with 1 Kings 8:46–50 and Psalm 55:17.",
              why: "Daniel's open window was not an emergency stunt or a theatrical protest; it was an eighty-year habit of covenant fidelity rooted in Solomon's dedication prayer. If you skip 'as he did aforetime', Daniel looks like an exhibitionist. If you keep it, you understand that Tuesday's discipline prepared him for Friday's decree."
            }},
            {{
              do: "Read Daniel 6:17 and compare with Matthew 27:62–66. Note: innocent servant, pit/tomb, heavy stone, imperial seal, dawn vindication.",
              why: "Daniel in the sealed pit is an unmistakable type of Jesus Christ in the sealed tomb. Earthly tyrants sealed the stone to prevent rescue, but divine power broke the seal and conquered death. If you miss this parallel, chapter 6 is merely a moral lesson. If you trace it, you see the resurrection of Christ prefigured in Babylon."
            }},
            {{
              do: "Read Daniel 6:25–27 and compare with Daniel 4:34–37. Note what the second pagan monarch publishes to all nations.",
              why: "Darius proclaims that the God of Daniel is the living God whose kingdom shall not be destroyed. Both world empires—the gold head of Babylon and the silver chest of Medo-Persia—were compelled by divine vindication to publish imperial encyclicals exalting the everlasting kingdom of God."
            }},
          ],
          christ: {{
            claim: "Daniel emerging alive from the sealed pit of lions is a profound type of Christ emerging victorious from the sealed tomb, having conquered the roaring lion of sin and death (Hebrews 13:20; 1 Peter 5:8).",
            why: "The conspiracy of envious rulers, the reluctant magistrate, the death sentence for blameless holiness, the sealed stone, and the dawn deliverance all point directly to Calvary and the empty tomb. Christ broke the teeth of the enemy and secured our everlasting resurrection."
          }},
          now: {{
            claim: "Policies and workplace cultures still pressure believers to close the window, pause prayer, or concede that the state or employer owns the conscience.",
            why: "The temptation is rarely a literal pit of lions; it is the invitation to compromise in secret so you can keep your promotion. Daniel proves you can serve a secular government with supreme excellence while refusing to give the state the worship that belongs exclusively to God."
          }},
          help: {{
            claim: "This sheet teaches you that the line between civic duty and covenant compromise is drawn at the First Commandment: render labor to Caesar, but never your worship.",
            why: "When human law forbids prayer or commands what God forbids, civil disobedience is a sacred obligation (Acts 5:29). Daniel obeyed God without violence, hatred, or treason: 'before thee, O king, have I done no hurt.'"
          }},
          value: {{
            claim: "Eighty years of secret prayer is more valuable than an unalterable imperial statute. The stone rolled away from the pit proves that earthly seals cannot defeat God's servants.",
            why: "Constitutional codes and human decrees look permanent until God dispatches an angel. The man who kneels before the King of heaven has nothing to fear from the decrees of earthly monarchs."
          }},
          ask: [
            "Is my daily prayer life an established rhythm ('as I did aforetime'), or an emergency reaction to crisis?",
            "Is my professional work so blameless that rivals can find no fault except concerning the law of my God?",
            "When pressured to close the window of my testimony, do I seek human approval or the vindication of the living God?",
          ]
        }},
        guide: {{
          intro: {{
            title: "The pit, the unalterable law, and the open window",
            expect: "Medo-Persian constitutional law, the satraps' audit, Daniel's prayer at the window, the sealed pit, and the resurrection type.",
            do: [
              "Follow the introduction and Main Points I–V plus the practical application.",
              "Open Map at the lions' den, Babylon, and the open window toward Jerusalem. View the 3D artifact.",
              "Complete checkpoint questions, then continue to the apocalyptic vision of Daniel 7."
            ]
          }},
          end: {{
            title: "The sea vision is next",
            nextWhy: "Daniel 7 is next: four beasts from the sea, the little horn, and a court that sits in heaven.",
            spotlight: "next-sheet-btn"
          }}
        }}
      }},'''

pattern = r'      \{\s*\n\s*id: 6,.*?\n      \},\s*\n      \{\s*\n\s*id: 7,'
m = re.search(pattern, text, re.DOTALL)
if not m:
    raise SystemExit("Could not find sheet 6 block")
text = text[:m.start()] + new_block + "\n      {\n        id: 7," + text[m.end():]
data_path.write_text(text, encoding="utf-8")
print("Patched", data_path)
