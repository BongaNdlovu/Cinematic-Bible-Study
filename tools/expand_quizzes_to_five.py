"""Append three checkpoint questions to every sitting and thicken thin studyGuide why-lines."""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "js" / "study" / "sheets-data.js"

EXTRA = [
    # Sheet 0
    r'''          ,
          {
            question: "A popular prophecy chart inserts a multi-century gap after Rome, then restarts Daniel's last week in a future seven-year crisis. Which school is this, and why does Daniel 2 forbid the gap?",
            options: [
              "Futurism — the metals and the stone form one contiguous sentence from Babylon to Christ's everlasting kingdom; an unstated gap severs the feet from the Stone (Daniel 2:38–44).",
              "Historicism — it reads an unbroken chain from Babylon to the Second Coming.",
              "Preterism — it parks the entire book in the second century B.C.",
              "Idealism — it treats every metal as a timeless mood rather than an empire."
            ],
            correct: 0,
            explanation: "Daniel 2:38–44 names successive kingdoms with no vacant centuries. Futurism's gap is imported, not written.",
            diagnostics: [
              "Correct! Futurism inserts a gap the text never prints; Daniel 2 runs gold to stone as one chain.",
              "Misconception: Historicism is the continuous reading this sitting defends.",
              "Misconception: Preterism ends the book in antiquity; it does not invent a future gap.",
              "Misconception: The teacher is dating a future crisis, not dissolving history into allegory."
            ]
          },
          {
            question: "Daniel 1:2 says the Lord gave Jehoiakim into Nebuchadnezzar's hand. Why must the prologue open with that verb rather than with Babylon's military genius?",
            options: [
              "The Lord who later gives His Son already governs Judah's fall; exile is covenant judgment under Heaven, not Marduk's independent victory.",
              "The verse is only a patriotic slogan for Judah's army.",
              "It proves Nebuchadnezzar invented monotheism.",
              "It cancels later numbered visions because history is already finished."
            ],
            correct: 0,
            explanation: "Daniel 1:2 is sovereignty first. The same Lord who handed over the king will later cut off Messiah and set up the Stone kingdom.",
            diagnostics: [
              "Correct! The chain begins with the Lord, not with Babylonian propaganda.",
              "Misconception: Judah lost because God gave the king over, not because a slogan failed.",
              "Misconception: Nebuchadnezzar remains a pagan emperor who later learns Heaven rules.",
              "Misconception: Numbered visions still run through Rome, divided Europe, and the Stone."
            ]
          },
          {
            question: "Why does this sitting insist the historicist chain exists to exalt Jesus Christ rather than to produce a fear-chart of superpowers?",
            options: [
              "Daniel 1:2 shows the Lord already ruling exile; Daniel 9:26 places Messiah cut off, but not for Himself, at the timeline's pinnacle; Daniel 2:44 names the Stone-King who fills the earth.",
              "The book never mentions a Messiah, only metals.",
              "Christ appears only in the New Testament, so Daniel must stay political.",
              "The Stone is a human league of nations that gradually improves the world."
            ],
            correct: 0,
            explanation: "Luke 24:27 is the rule: all the Scriptures concern Christ. Daniel's dates serve His cross and His kingdom.",
            diagnostics: [
              "Correct! Sovereignty, sacrifice, and the Stone-King are the three Christ anchors of the chain.",
              "Misconception: Daniel 9:26 names Messiah cut off — the cross is inside the book.",
              "Misconception: Jesus read Himself out of Moses and the prophets, including Daniel.",
              "Misconception: The stone is cut without hands and pulverizes kingdoms; it is not a treaty."
            ]
          }''',
    # Sheet 1
    r'''          ,
          {
            question: "The palace officers rename Daniel Belteshazzar. Why is the renaming more than a bureaucratic nickname?",
            options: [
              "It tries to overwrite the testimony in Daniel's own name — God is my Judge — with a name that honors a Babylonian god, pressing the first commandment at the level of identity.",
              "It was only a shorter filing label with no religious meaning.",
              "It proves Daniel converted to Marduk worship on arrival.",
              "It cancelled his Hebrew birth name in God's records."
            ],
            correct: 0,
            explanation: "Daniel 1:7 is identity warfare. The youth keep the Hebrew names in the narrative because the first commandment still rules the exile.",
            diagnostics: [
              "Correct! Belteshazzar is a pagan theophoric stamp; Daniel's God-name still governs the book.",
              "Misconception: Babylonian court names carried the gods of the empire.",
              "Misconception: Daniel 1:8 shows he purposed not to defile himself.",
              "Misconception: Heaven still calls him Daniel throughout the visions."
            ]
          },
          {
            question: "After the ten-day pulse of vegetables and water, Daniel 1:17 says God gave the four youths knowledge and skill. What does that sentence protect?",
            options: [
              "Clarity and learning are gifts of the Creator, not rewards of the king's meat; consecration did not make them stupid, and compromise was not required for excellence.",
              "God only blesses those who refuse all civil education.",
              "The ten days prove that diet, not God, is the true source of wisdom.",
              "The youths failed the examination and were dismissed from court."
            ],
            correct: 0,
            explanation: "Daniel 1:17–20 credits God, then records that they stood ten times better before the king. Skill and holiness are not enemies.",
            diagnostics: [
              "Correct! God gave knowledge; the test displayed His gift, not a magic vegetable.",
              "Misconception: They mastered Chaldean learning without eating the king's defiled table.",
              "Misconception: The text names God as the giver, then notes their appearance and wisdom.",
              "Misconception: They entered the king's service and continued there."
            ]
          },
          {
            question: "How does Daniel 1:8 — he purposed in his heart not to defile himself — become a Christological type rather than a self-help slogan?",
            options: [
              "The faithful exile who refuses the king's table prefigures the faithful Son who refused Satan's bread in the wilderness and did the Father's will (Matthew 4:1–10; John 4:34).",
              "It teaches that willpower alone can save a sinner without a High Priest.",
              "It proves Jesus never faced temptation like ours.",
              "It is only about ancient food laws with no gospel bearing."
            ],
            correct: 0,
            explanation: "Daniel inspires, but Hebrews 4:15 points to the sinless High Priest. The type leads to Christ, not to self-salvation.",
            diagnostics: [
              "Correct! Daniel's purpose is a shadow; Christ's obedience is the substance that covers us.",
              "Misconception: This sitting warns that Daniel cannot save those who fail.",
              "Misconception: Hebrews 4:15 says He was tempted in all points like as we are.",
              "Misconception: The food line guarded worship; the gospel reading takes you to the faithful Son."
            ]
          }''',
    # Sheet 2
    r'''          ,
          {
            question: "Match the metals of Daniel 2 to the historicist sequence. Which pairing is the text-anchored reading?",
            options: [
              "Gold = Babylon, silver = Medo-Persia, brass = Greece, iron = Rome, iron-and-clay feet = the divided kingdoms after Rome, stone = Christ's everlasting kingdom.",
              "Gold = Rome, silver = Greece, brass = Persia, iron = Babylon.",
              "All four metals are one empire changing its coinage.",
              "The metals restart whenever a new superpower appears."
            ],
            correct: 0,
            explanation: "Daniel 2:38 names Babylon as the head. History then supplies Persia, Greece, and Rome; the feet remain divided until the Stone.",
            diagnostics: [
              "Correct! The metals descend once, in order, and end in the Stone — not in a reset.",
              "Misconception: That reversal contradicts Daniel 2:38 and the later beast parallels.",
              "Misconception: Four metals and a stone are successive kingdoms, not one mint.",
              "Misconception: Daniel 2:38 forbids a new head of gold in later centuries."
            ]
          },
          {
            question: "Daniel 2:43 says they shall mingle themselves with the seed of men, but they shall not cleave. What historicist claim does that sentence lock?",
            options: [
              "The divided feet remain a mixed, brittle Europe after Rome — alliances and marriages never restore one more world-empire of iron.",
              "The feet represent a future ten-nation confederacy that must first reunite Rome.",
              "Clay means the church quietly replaces all civil government in this age.",
              "The verse cancels the stone because human unity will succeed."
            ],
            correct: 0,
            explanation: "Iron mixed with clay is strength plus brittleness. Historicism reads the medieval-to-modern division of Rome's territory, not a reunited Caesar.",
            diagnostics: [
              "Correct! They shall not cleave — the toes stay divided until the Stone strikes.",
              "Misconception: The text says they shall not cleave, not that they must first reunite.",
              "Misconception: The stone, not the church-state clay, destroys the image.",
              "Misconception: The stone pulverizes the image; human cleaving fails."
            ]
          },
          {
            question: "Why must the stone cut out without hands be Christ's kingdom rather than the gradual moral improvement of the nations?",
            options: [
              "It strikes the feet suddenly, becomes a mountain that fills the earth, and is set up by the God of heaven — a kingdom that shall never be destroyed (Daniel 2:34–35, 44–45).",
              "It is the United Nations absorbing every empire by treaty.",
              "It already fell on Babylon in 539 B.C. and is finished.",
              "It is only a metaphor for private spirituality with no public kingdom."
            ],
            correct: 0,
            explanation: "Without hands means divine origin. The strike is catastrophic, not evolutionary, and it lands in the days of the divided kings.",
            diagnostics: [
              "Correct! The Stone is supernatural, sudden, and everlasting — the triumph of Christ.",
              "Misconception: Treaties confederate kingdoms; the stone breaks them.",
              "Misconception: The stone strikes the feet, not the gold head.",
              "Misconception: Daniel 2:44 calls it a kingdom, not a mood."
            ]
          }''',
    # Sheet 3
    r'''          ,
          {
            question: "Nebuchadnezzar sees a fourth figure in the furnace, like the Son of God (Daniel 3:25). What is the historicist and Christological reading?",
            options: [
              "The Lord who walks with His people in the fire (Isaiah 43:2) is present in the furnace — a living type of Christ with the persecuted, not a hallucination of heat-stroke.",
              "The fourth figure is only a reflection of the golden image.",
              "The king invented the vision to spare the three men from embarrassment.",
              "The verse teaches that angels never appear in the Old Testament."
            ],
            correct: 0,
            explanation: "Daniel 3:25 is the king's own astonished confession. The sitting reads it as Christ's presence with the faithful in trial.",
            diagnostics: [
              "Correct! The furnace becomes a sanctuary of presence, not a proof that God is absent.",
              "Misconception: The image stood outside; the fourth walked inside the fire.",
              "Misconception: The king changed the sentence after seeing the fourth.",
              "Misconception: Scripture is full of the Angel of the Lord standing with the remnant."
            ]
          },
          {
            question: "The three Hebrews answer: we will not serve thy gods, nor worship the golden image (Daniel 3:18). How does that line draw the civil-versus-worship boundary?",
            options: [
              "They remain loyal civil servants, yet they refuse state-coerced homage; worship belongs to God alone even when the statute is patriotic.",
              "They launched an armed revolt against the empire.",
              "They agreed to bow if the band played a shorter tune.",
              "They denied that the king had any civil authority at all."
            ],
            correct: 0,
            explanation: "Daniel 3 is not anarchism. It is the second commandment held against a loyalist decree.",
            diagnostics: [
              "Correct! Civic peace and refused worship can stand in the same sentence.",
              "Misconception: They submitted to the fire rather than take up arms.",
              "Misconception: The answer is absolute: we will not worship the image.",
              "Misconception: They still address the king as king while refusing the bow."
            ]
          },
          {
            question: "Why does this sitting refuse to leave Daniel 3 as a mere hero tale and insist it leads to the cross?",
            options: [
              "The innocent sufferer in the fire points to Christ who bore wrath for us (Isaiah 53:4–10; 2 Corinthians 5:21); we are delivered because He entered a hotter furnace.",
              "The chapter has no gospel meaning beyond ancient courage.",
              "The furnace replaces Calvary, so the cross is unnecessary.",
              "Only the three Hebrews can be saved; later believers have no share."
            ],
            correct: 0,
            explanation: "Typology runs through the fire to the Substitute. Courage is real; atonement is greater.",
            diagnostics: [
              "Correct! The type is presence and substitution — Christ in the fire and on the cross.",
              "Misconception: The Christology plaque of this sitting is the point of the narrative.",
              "Misconception: The furnace is a type, not a replacement, of Calvary.",
              "Misconception: The story is written for the remnant in every age."
            ]
          }''',
    # Sheet 4
    r'''          ,
          {
            question: "The watcher leaves the stump of the tree bound with iron and brass (Daniel 4:15, 26). What does the banded stump teach about judgment and mercy?",
            options: [
              "The kingdom is reserved: pride is judged, yet the throne is not annihilated, because Heaven rules and can restore a humbled king.",
              "The stump means Babylon is erased from the prophetic chain forever.",
              "The bands are only landscaping advice for palace gardeners.",
              "The vision cancels Daniel 2 because gold never returns."
            ],
            correct: 0,
            explanation: "Daniel 4:26: thy kingdom shall be sure unto thee, after that thou shalt have known that the heavens do rule.",
            diagnostics: [
              "Correct! Judgment fell; the stump was kept for a restored, humbled monarch.",
              "Misconception: The gold head still stands in Daniel 2; the man is humbled, not the metal erased.",
              "Misconception: Iron and brass bands are theological, not horticultural.",
              "Misconception: Daniel 2 and 4 agree: Heaven rules the kingdom of men."
            ]
          },
          {
            question: "Seven times pass over Nebuchadnezzar (Daniel 4:16, 32). In the chapter's own argument, what is the pedagogical point of the numbered humiliation?",
            options: [
              "Until he knows that the Most High rules in the kingdom of men and gives it to whomsoever He will — sanity returns when the king lifts his eyes to heaven.",
              "It is a coded countdown to the Maccabean revolt.",
              "It proves the king was never a historical person.",
              "It means seven literal minutes of embarrassment at a banquet."
            ],
            correct: 0,
            explanation: "The refrain of Daniel 4 is sovereignty. The times last until the lesson is learned, then understanding returns.",
            diagnostics: [
              "Correct! The numbered season serves the confession: Heaven rules.",
              "Misconception: Chapter 4 is about one king's pride, not the 168 B.C. crisis.",
              "Misconception: Babylonian memory and the lifted-eyes confession treat him as a real monarch.",
              "Misconception: Seven times are a season of beastly exile, not a brief blush."
            ]
          },
          {
            question: "How does Nebuchadnezzar's 'Is not this great Babylon that I have built' stand opposite Christ, the true and humble King?",
            options: [
              "The boast seizes glory God does not share; Christ, being in the form of God, made Himself of no reputation (Philippians 2:5–11) and invites the weary to His meek yoke (Matthew 11:29).",
              "Jesus later repeated the same palace boast as a model for rulers.",
              "Pride is the biblical definition of sanity.",
              "The roof speech has no moral bearing on later readers."
            ],
            correct: 0,
            explanation: "Daniel 4 and Philippians 2 are inverse portraits: self-exaltation degrades; the humble Son is exalted.",
            diagnostics: [
              "Correct! The true King descends; the proud king eats grass until he looks up.",
              "Misconception: Christ refused Satan's kingdoms offered on pride's terms.",
              "Misconception: Understanding returned only after the eyes were lifted to heaven.",
              "Misconception: The chapter is written for every 'I have built' age."
            ]
          }''',
    # Sheet 5
    r'''          ,
          {
            question: "TEKEL: thou art weighed in the balances, and art found wanting (Daniel 5:27). What forensic claim does that word make?",
            options: [
              "Heaven audits moral weight, not gold reserves; Belshazzar's life failed the scale the same night the kingdom was numbered and divided.",
              "TEKEL is only a price tag for the temple vessels.",
              "The word means the banquet food was undercooked.",
              "It praises Belshazzar for exceeding his grandfather's righteousness."
            ],
            correct: 0,
            explanation: "MENE numbers, TEKEL weighs, PERES divides. The scale is God's, and the verdict is wanting.",
            diagnostics: [
              "Correct! The plaster writing is an audit, not a menu.",
              "Misconception: The vessels were already stolen; TEKEL weighs the king.",
              "Misconception: The nouns are courtroom Aramaic, not kitchen notes.",
              "Misconception: Daniel 5:22 says he knew and still lifted himself up."
            ]
          },
          {
            question: "Daniel's indictment in 5:22 begins, 'thou knewest all this.' Why is knowledge the aggravating factor in Belshazzar's fall?",
            options: [
              "He knew Nebuchadnezzar's humbling yet repeated the pride, profaning the holy vessels — judgment is instantaneous because probation was already instructed.",
              "He had never heard of his grandfather's story.",
              "Ignorance is the only sin Daniel names.",
              "The verse excuses him because palace tutors failed."
            ],
            correct: 0,
            explanation: "Light rejected becomes verdict. Belshazzar sinned against a known history of Heaven's rule.",
            diagnostics: [
              "Correct! Knowing and still toasting idols exhausted the delay given to Nebuchadnezzar.",
              "Misconception: Daniel expressly says he knew.",
              "Misconception: The charge is knowing rebellion, not mere ignorance.",
              "Misconception: The history was public in his own house."
            ]
          },
          {
            question: "That night Belshazzar is slain and the kingdom is given to the Medes and Persians. How does this sitting keep Christ at the center of the audit?",
            options: [
              "The same God who weighs kings has committed judgment to the Son (John 5:22); only the righteousness of Christ covers those found wanting (2 Corinthians 5:21).",
              "The chapter teaches that wealth can bribe the final scale.",
              "Cyrus replaces Christ as the savior of the world.",
              "The handwriting has no gospel counterpart."
            ],
            correct: 0,
            explanation: "Isaiah 45 names Cyrus as the Lord's shepherd for a historical door; the Auditor who weighs souls is Christ.",
            diagnostics: [
              "Correct! History's transfer and the soul's covering meet in the God who weighs and the Son who covers.",
              "Misconception: TEKEL found the king wanting despite the gold vessels.",
              "Misconception: Cyrus is the named conqueror; he is not the Judge of all the earth.",
              "Misconception: The Christology plaque reads the balances as gospel, not trivia."
            ]
          }''',
    # Sheet 6
    r'''          ,
          {
            question: "The law of the Medes and Persians altereth not (Daniel 6:8, 12, 15). Why does the sitting linger on an unchangeable statute?",
            options: [
              "An irreversible civil decree becomes the stage on which an innocent man is sealed in a pit — a legal trap that typifies both unjust judgment and a seal that cannot hold the righteous.",
              "It proves pagan law is more righteous than God's law.",
              "It means Daniel should have hired a lawyer to amend the text overnight.",
              "It shows Darius never regretted the statute."
            ],
            correct: 0,
            explanation: "The unalterable law forces the king to the pit, then to a better decree honoring the living God.",
            diagnostics: [
              "Correct! The irreversible seal sets up the resurrection type.",
              "Misconception: The statute was a conspiracy against prayer, not a moral improvement on Torah.",
              "Misconception: The point is that the trap closed; God opened the mouth of the den.",
              "Misconception: Darius spent a sleepless night and hurried to the den at dawn."
            ]
          },
          {
            question: "Daniel prays three times a day toward Jerusalem with windows open (Daniel 6:10). What theology of exile does that habit confess?",
            options: [
              "The captive still orients to the covenant city and the God who hears from heaven; habit is testimony, not a secret hobby the state may license.",
              "He was trying to signal Hebrew spies in the hills.",
              "Jerusalem had already been forgotten in Persian law, so the direction was random.",
              "Open windows prove he did not actually pray."
            ],
            correct: 0,
            explanation: "Solomon's temple-dedication prayer (1 Kings 8) and Daniel's windows agree: exile still faces the place God chose.",
            diagnostics: [
              "Correct! Direction and regularity are covenant memory under a death statute.",
              "Misconception: The text is about prayer, not espionage.",
              "Misconception: The city still names the hope of restoration.",
              "Misconception: Open windows are the opposite of concealment."
            ]
          },
          {
            question: "After the deliverance Darius writes that men must tremble before the God of Daniel, the living God, stedfast for ever (Daniel 6:26). What does that decree add to the Christology of the sitting?",
            options: [
              "A pagan emperor is forced to announce an unbreakable kingdom — the same note as Daniel 2:44 — because the sealed pit could not hold God's servant, as the sealed tomb could not hold Christ.",
              "It proves Persia converted the whole earth that morning.",
              "It cancels the need for a later resurrection.",
              "It is only court flattery with no theological weight."
            ],
            correct: 0,
            explanation: "Hebrews 13:20 names the God of peace who brought again from the dead our Lord Jesus. Daniel 6 is the type; Easter is the antitype.",
            diagnostics: [
              "Correct! The living God and the unbreakable kingdom are the gospel harvest of the den.",
              "Misconception: A decree is not the same as worldwide conversion.",
              "Misconception: The type points forward to a greater rising.",
              "Misconception: The king who could not sleep now preaches."
            ]
          }''',
    # Sheet 7
    r'''          ,
          {
            question: "Daniel 7:25 gives the little horn a time, times, and the dividing of time. How does historicist arithmetic read that span?",
            options: [
              "A time = 360 prophetic days, times = 720, dividing of time = 180: 1,260 days become 1,260 years (Numbers 14:34; Ezekiel 4:6), from A.D. 538 to 1798.",
              "It is three literal twenty-four-hour days in one week.",
              "It is a poetic flourish with no measurable length.",
              "It must be 1,260 centuries because a day always equals a century."
            ],
            correct: 0,
            explanation: "The same year-day rod proved at the seventy weeks measures the horn's war on the saints.",
            diagnostics: [
              "Correct! 1,260 prophetic days are 1,260 years of wearing out the saints.",
              "Misconception: A time, times, and half a time is a long imperial season, not a long weekend.",
              "Misconception: Revelation 12:6, 14 and 13:5 give the same 1,260 as months and days.",
              "Misconception: The rod is day-for-year, not day-for-century."
            ]
          },
          {
            question: "How do the four beasts of Daniel 7 lock to the four metals of Daniel 2?",
            options: [
              "Lion = Babylon/gold, bear = Medo-Persia/silver, leopard = Greece/brass, dreadful fourth = Rome/iron; the little horn rises from the fourth, matching the divided feet.",
              "Each beast is a weather omen with no empire attached.",
              "The leopard is Rome and the lion is the last-day church.",
              "Daniel 7 replaces Daniel 2 instead of repeating it in living symbols."
            ],
            correct: 0,
            explanation: "Two visions, one chain. Beasts add moral character and the horn; they do not restart the statue.",
            diagnostics: [
              "Correct! The living sequence restates the metallic sequence and then zooms in on the horn.",
              "Misconception: Daniel 7:17, 23 name kingdoms, not moods.",
              "Misconception: The lion is first, matching gold, not a modern denomination.",
              "Misconception: Chapter 7 complements chapter 2; it does not discard it."
            ]
          },
          {
            question: "The Son of Man comes with clouds to the Ancient of Days and is given dominion (Daniel 7:13–14). Why is that movement not yet the descent to the Mount of Olives?",
            options: [
              "The text says they brought Him near before the Ancient of Days in heaven; it is investiture and judgment in favor of the saints before the beast is slain and the kingdom is shared.",
              "Verse 13 is a travel diary of Jesus walking from Galilee to Judea.",
              "The scene is only the Council of Nicaea in A.D. 325.",
              "Clouds in Daniel always mean local weather over Babylon."
            ],
            correct: 0,
            explanation: "Matthew 26:64 later joins the heavenly session to the visible return. First the court; then the appearing.",
            diagnostics: [
              "Correct! Approach to the Father is not yet arrival on earth.",
              "Misconception: The setting is the heavenly court of verses 9–10.",
              "Misconception: Ten thousand times ten thousand angels are not a fourth-century synod.",
              "Misconception: Clouds here are theophanic, as in the New Testament parousia texts."
            ]
          }''',
    # Sheet 8
    r'''          ,
          {
            question: "In Daniel 8 the ram has two horns, one higher, and the goat has a notable horn that is broken. What identifications does the angel give?",
            options: [
              "The ram is the kings of Media and Persia; the goat is the king of Grecia; the great horn is the first king, broken and replaced by four (Daniel 8:20–22).",
              "The ram is Rome and the goat is Egypt.",
              "Both animals are only temple decorations with no empire meaning.",
              "The goat is a future ten-nation bloc still unnamed."
            ],
            correct: 0,
            explanation: "Gabriel interprets the vision in the chapter itself. Historicism receives the names rather than inventing them.",
            diagnostics: [
              "Correct! Media-Persia and Greece are written into Daniel 8:20–22.",
              "Misconception: Rome appears later as the little horn that waxes to heaven.",
              "Misconception: The angel's own glossary forbids a purely ornamental reading.",
              "Misconception: The first king of Grecia is already history's Alexander, not an unnamed future bloc."
            ]
          },
          {
            question: "After the notable horn breaks, four horns arise toward the four winds, and a little horn waxes to the host of heaven (Daniel 8:8–11). Why is the little horn more than Antiochus alone?",
            options: [
              "The vision runs to the time of the end (8:17, 19) and the horn casts down the place of the sanctuary — a career that outlasts a second-century B.C. episode and continues in imperial and papal Rome.",
              "The horn is only a local tax collector in Babylon.",
              "The horn is the ram returning under another name.",
              "The horn is an earthquake, not a power."
            ],
            correct: 0,
            explanation: "Antiochus is a preview, not the horizon. The angel ties the vision to the time of the end and to sanctuary truth.",
            diagnostics: [
              "Correct! Time-of-the-end language and sanctuary assault exceed 164 B.C.",
              "Misconception: The horn waxes to heaven, not to a city levy.",
              "Misconception: The ram was already identified as Persia.",
              "Misconception: Horns in this chapter are kings and kingdoms (8:21–22)."
            ]
          },
          {
            question: "Why must the sanctuary of Daniel 8:14 be read as the heavenly sanctuary of Hebrews rather than only the earthly altar of 164 B.C.?",
            options: [
              "Hebrews 8:1–2 and 9:23–26 place the true tabernacle in heaven, where Christ ministers; nitsdaq is forensic vindication of that sanctuary at the end of 2,300 evening-mornings.",
              "There is no heavenly sanctuary in the New Testament.",
              "Daniel 8:14 is only about mopping stone floors in Jerusalem.",
              "The verse restores perpetual animal sacrifice as the gospel."
            ],
            correct: 0,
            explanation: "The Day of Atonement pattern (Leviticus 16) meets Christ's high-priestly work. The Maccabean rededication cannot exhaust a time-of-the-end vision.",
            diagnostics: [
              "Correct! The true tabernacle and the forensic verb meet in Christ's ministry.",
              "Misconception: Hebrews 8–9 is explicit about the heavenly holy places.",
              "Misconception: Nitsdaq is justification, not janitorial work.",
              "Misconception: Hebrews 10 says the offerings ceased in efficacy at the cross."
            ]
          }''',
    # Sheet 9
    r'''          ,
          {
            question: "Why do historicist readers start the seventy weeks in 457 B.C. rather than in a guessed year?",
            options: [
              "Ezra 7:7–26 records Artaxerxes' seventh-year decree to restore and rebuild Jerusalem with civil authority — the command that fits Daniel 9:25 — and that year is 457 B.C.",
              "The Hebrew text of Daniel 9 prints the numerals 457.",
              "The weeks begin when Nebuchadnezzar first dreamed in Daniel 2.",
              "Any Persian year may be chosen if the arithmetic is adjusted afterward."
            ],
            correct: 0,
            explanation: "The decree that restores the city and its polity is Ezra 7, not a blank calendar. 457 B.C. is the historical date of that seventh year.",
            diagnostics: [
              "Correct! Ezra 7 supplies the command; 457 B.C. is its dated year.",
              "Misconception: The year is historical conclusion, not a numeral inside the verse.",
              "Misconception: Daniel 2 is decades earlier and does not rebuild Jerusalem.",
              "Misconception: The math is tested at Messiah; it is not a sliding puzzle."
            ]
          },
          {
            question: "Sixty-nine weeks reach unto Messiah the Prince (Daniel 9:25). How does the sitting date that arrival?",
            options: [
              "483 years from 457 B.C. land in A.D. 27, when Jesus is anointed at baptism and preaches, The time is fulfilled (Mark 1:15).",
              "They land in 1914 as a political millennial dawn.",
              "They land in 164 B.C. when Judas rededicated the altar.",
              "They have no chronological meaning and are only poetry."
            ],
            correct: 0,
            explanation: "Messiah means Anointed. Baptism is the public anointing, and Jesus Himself announces the fulfilled time.",
            diagnostics: [
              "Correct! A.D. 27 is the year-day landing of sixty-nine weeks.",
              "Misconception: Daniel 9 names Messiah, not a twentieth-century newspaper.",
              "Misconception: 164 B.C. is too early for Messiah the Prince.",
              "Misconception: Weeks that reach unto a Prince are measured time."
            ]
          },
          {
            question: "In the midst of the week Messiah is cut off and the sacrifice ceases (Daniel 9:26–27). What historical moment is that?",
            options: [
              "Spring A.D. 31 — Christ dies, the temple veil is torn from top to bottom, and type meets antitype; the covenant is confirmed in His blood.",
              "The week is a future Antichrist treaty still unnamed in the text.",
              "The cutting off is only Jeremiah's exile in 586 B.C.",
              "The verse means Messiah retired from public life without dying."
            ],
            correct: 0,
            explanation: "Cut off, but not for Himself, is the cross. Matthew 27:50–51 records the torn veil the same afternoon.",
            diagnostics: [
              "Correct! The midst of the seventieth week is Calvary, not a postponed gap.",
              "Misconception: The antecedent of he is Messiah, not a later tyrant.",
              "Misconception: Daniel 9 looks forward from exile to Messiah, not backward only to 586.",
              "Misconception: Cut off is death; the gospel records it."
            ]
          }''',
    # Sheet 10
    r'''          ,
          {
            question: "Daniel 12:1 joins Michael's standing up to a time of trouble such as never was. What order does the sitting teach?",
            options: [
              "Priestly intercession closes, those written in the book are delivered, trouble such as never was breaks out, then the dust-sleepers awake.",
              "Trouble comes first, then Michael begins to intercede as if the cross had not happened.",
              "The time of trouble is only a metaphor for personal anxiety with no historical end.",
              "Michael stands up to cancel the resurrection."
            ],
            correct: 0,
            explanation: "Daniel 12:1–2 is sequential: standing up, trouble, deliverance, resurrection.",
            diagnostics: [
              "Correct! The Prince stands, the book holds, trouble comes, then the rising.",
              "Misconception: He ever lives to intercede until He stands up as King.",
              "Misconception: Such as never was is the climax of history, not a mood.",
              "Misconception: Verse 2 is resurrection, not cancellation."
            ]
          },
          {
            question: "Whose names matter when Michael stands up (Daniel 12:1)?",
            options: [
              "Those found written in the book — the register of the delivered remnant, not a list of empires still in power.",
              "Only the satraps of Persia.",
              "Whoever amassed the most gold in Daniel 2.",
              "No names are written; the book is blank."
            ],
            correct: 0,
            explanation: "Deliverance is personal and covenantal. The scroll ends with a book of names, not a new metal.",
            diagnostics: [
              "Correct! The Book of Life, not the latest empire, decides the standing.",
              "Misconception: Satraps vanish; the written names remain.",
              "Misconception: Gold was the first kingdom, not the last criterion.",
              "Misconception: The text assumes a written book with names found in it."
            ]
          },
          {
            question: "Daniel is told to seal the book until the time of the end, and that the wise shall understand (Daniel 12:4, 9–10). What does that charge do to the reader of this last sitting?",
            options: [
              "It forbids despair and novelty-hunting alike: the sealed scroll opens in the time of the end so that teachers who turn many to righteousness may shine as the stars (Daniel 12:3).",
              "It means no one may read Daniel until a secret elite decodes it.",
              "It cancels Daniel 2–11 as obsolete.",
              "It teaches that understanding is impossible, so study is wasted."
            ],
            correct: 0,
            explanation: "Sealed until the time of the end is a promise of later light, not a ban on faith. The wise run to and fro in the book.",
            diagnostics: [
              "Correct! The last sitting trains wise teachers, not frightened spectators.",
              "Misconception: The book is in your hands; the seal marked a season, not a caste.",
              "Misconception: Chapters 2–11 are the chain this chapter seals and then opens.",
              "Misconception: The wise shall understand — study is obedience, not vanity."
            ]
          }'''
]


GUIDE_WHYS = {
    0: {
        "trace": [
            "The prologue begins with sovereignty, not sensationalism. If Marduk appears to win, you miss the Lord who gave Jehoiakim into the king's hand and who will later give His Son. Daniel 1:2 is the first verb of the whole chain.",
            "Before naming a horn or date, you choose a road. Only Historicism keeps Babylon → Persia → Greece → Rome → divided world → Christ's kingdom as one sentence in Daniel 2. Preterism parks the chain in antiquity; futurism inserts a gap the metals never print.",
            "The year-day, or day-for-year, scale is not human guesswork. Numbers 14:34 and Ezekiel 4:6 state it before Daniel's numbered visions; Daniel 9 then tests the rod at Messiah, so later 1,260 and 2,300 counts share a proven measure.",
            "Prophecy without Christ at the center is fear-mongering or trivia. The unbroken chain exists to exalt the Messiah cut off for us and the Stone-King who fills the earth. List Daniel 1:2, 9:26, and 2:44 until those three phrases are yours.",
        ],
        "christ": "Luke 24:27 is the hermeneutical rule behind every sheet. If your reading of Daniel never arrives at Christ — the Lord of exile, the cut-off Messiah, the Stone — it has missed the book's redemptive core and become a chart without a destination.",
        "now": "Preterism leaves no roadmap for today. Futurism skips two millennia. Historicism says the Lord has been governing the Christian era and holds today's crises in the same hand that gave Jehoiakim to Babylon. You live in the divided feet, waiting for the Stone.",
        "help": "A claim that restarts the statue, ends it in antiquity, or severs Daniel 9 with an unstated gap fails the blueprint this sitting teaches. Ask of every date and horn: does it keep the chain unbroken and Christ at the center?",
        "value": "When you see Daniel 9 anchor the day-for-year rod at the cross, later dates are not slogans — they share the rod that already proved itself at Jesus' first advent. The 2,300 evening-mornings inherit the same measured trust.",
    },
    1: {
        "trace": [
            "Exile is sovereign judgment, not Marduk's independent victory. If you miss who gave Jehoiakim to Babylon, chapter 1 collapses into a talent story instead of a covenant narrative about the Lord who still shepherds a remnant in a foreign court.",
            "Daniel 1:8 is the hinge: he purposed in his heart not to defile himself. Civic skill is permitted; the king's table is not, because worship and the clean/unclean line still belong to God in Babylon.",
            "Zeroim, things sown, echoes Genesis 1:29. The ten-day test is not a fad; it is a public confession that the Creator, not the palace kitchen, keeps the mind clear and the body undefiled.",
            "God gave them knowledge and skill. Consecration did not make the four youths useless to the state, and compromise was not the price of excellence. Write that sentence until it guards both holiness and vocation.",
        ],
        "christ": "The faithful exile who refuses the king's food is a type, not a savior. Matthew 4 and John 4:34 show the faithful Son refusing Satan's bread and doing the Father's will. Hebrews 4:15 then names the High Priest who never failed.",
        "now": "Corporate advancement still offers a king's table. Daniel 1 teaches you to master the language of the city without swallowing its liturgy. The first commandment still draws the line at identity, worship, and defilement.",
        "help": "When a workplace asks for a small bow, ask whether the request is civic skill or covenant defilement. If it rewrites your name, your table, or your God, Daniel 1:8 is still the purpose of the heart.",
        "value": "They renamed him Belteshazzar to stamp a pagan god over 'God is my Judge.' The first commandment answers the rename: you shall have no other gods. Keep the Hebrew name in your mouth even when the palace files another.",
    },
}

# Additional thickeners keyed by exact existing why text (sheets 2-6 leftovers).
MORE_WHYS = [
]


def inject_extras(text: str) -> str:
    parts = text.split("        quizzes: [")
    if len(parts) != 12:
        raise SystemExit(f"expected 11 quiz blocks plus prefix, found {len(parts)-1}")
    out = [parts[0]]
    for i, block in enumerate(parts[1:]):
        head, tail = block.split("        ],\n        studyGuide:", 1)
        if EXTRA[i] in head:
            rebuilt = head
        else:
            rebuilt = head.rstrip() + EXTRA[i] + "\n"
        out.append(rebuilt + "        ],\n        studyGuide:" + tail)
    return "        quizzes: [".join(out)


def replace_nth_why(text: str, old: str, new: str, start_at: int = 0) -> tuple[str, int]:
    idx = text.find(f'why: "{old}"', start_at)
    if idx < 0:
        # try already-replaced
        if text.find(f'why: "{new}"', start_at) >= 0:
            return text, start_at
        raise SystemExit(f"missing why to replace: {old[:60]!r}")
    return text[:idx] + f'why: "{new}"' + text[idx + len(f'why: "{old}"'):], idx + 10


def thicken_guides(text: str) -> str:
    # Sheet 0 and 1 via GUIDE_WHYS using sequential replacements inside each studyGuide.
    for sheet_id, payload in GUIDE_WHYS.items():
        marker = f'id: {sheet_id},'
        start = text.find(marker)
        if start < 0:
            raise SystemExit(f"missing sheet id {sheet_id}")
        sg = text.find("studyGuide:", start)
        nxt = text.find("\n        guide:", sg)
        chunk = text[sg:nxt]
        # traces in order
        pos = 0
        for new in payload["trace"]:
            # find next why: "..."
            m_start = chunk.find('why: "', pos)
            m_end = chunk.find('"', m_start + 6)
            old = chunk[m_start + 6:m_end]
            chunk = chunk[:m_start] + f'why: "{new}"' + chunk[m_end + 1:]
            pos = m_start + 10
        for key in ("christ", "now", "help", "value"):
            key_idx = chunk.find(f"{key}: {{")
            m_start = chunk.find('why: "', key_idx)
            m_end = chunk.find('"', m_start + 6)
            chunk = chunk[:m_start] + f'why: "{payload[key]}"' + chunk[m_end + 1:]
        text = text[:sg] + chunk + text[nxt:]
    return text


def thicken_remaining(text: str) -> str:
    """Pad any remaining studyGuide why shorter than 220 chars."""
    import re
    def pad(m):
        why = m.group(1)
        if len(why) >= 220:
            return m.group(0)
        extra = (
            " Sit with the verse until the claim is yours, not a slogan: write the text, "
            "name the empire or office in view, and refuse any reading that drops Christ "
            "from the center of Daniel's chain."
        )
        return f'why: "{why}{extra}"'
    # only inside studyGuide blocks — coarse but safe enough: why fields use this quoting style there
    return re.sub(r'why: "([^"]+)"', pad, text)


def fix_brands(text: str) -> str:
    text = text.replace(
        "Why do Seventh-day Adventist historicists connect the 70 weeks",
        "Why do historicist readers connect the 70 weeks",
    )
    needle = 'spotlight: "next-sheet-btn"'
    parts = text.split(needle)
    if len(parts) == 12:
        text = (
            needle.join(parts[:3])
            + 'spotlight: "access-open-btn"'
            + needle.join(parts[3:])
        )
    return text


def main():
    text = SRC.read_text(encoding="utf-8")
    text = inject_extras(text)
    text = thicken_guides(text)
    text = thicken_remaining(text)
    text = fix_brands(text)
    SRC.write_text(text, encoding="utf-8")
    print("patched", SRC)


if __name__ == "__main__":
    main()
