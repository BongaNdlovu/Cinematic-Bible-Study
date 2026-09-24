(function () {
  function entry(id, term, aliases, kind, simple, history, image) {
    return {
      id: id,
      term: term,
      aliases: aliases || [],
      kind: kind,
      simple: simple,
      history: history,
      image: image || ""
    };
  }

  var IMG = "assets/study/glossary/";

  window.SHEET_GLOSSARY = [
    entry("hermeneutics", "hermeneutics", ["Hermeneutics"], "word",
      "How you read a text — the rules you use before you name a king or a date.",
      "In this course the live question is whether Daniel is a continuous chain of real kingdoms from the exile to Christ’s return, or a book that ends in the second century B.C., or a book that jumps to a future seven-year crisis. The method you pick decides whether the four metals stay one statue.",
      IMG + "glossary-hermeneutics.png"),
    entry("historicism", "Historicism", ["historicist", "historicist reading"], "word",
      "Read Daniel as an unbroken timeline of real empires from the prophet’s own day until the stone fills the earth.",
      "This course uses historicism because Daniel’s succession language and parallel visions best fit a continuous historical reading when Scripture interprets Scripture. Reformers such as Wycliffe, Luther, Melanchthon, and Knox showed historicist tendencies — not one uniform system. Preterism and futurism are alternative frameworks with long histories of interpretation.",
      IMG + "glossary-historicism.png"),
    entry("preterism", "Preterism", ["preterist"], "word",
      "The claim that almost all of Daniel (and often Revelation) already finished in the distant past.",
      "In the form this sitting names, Jesuit Luis de Alcázar (1614) placed Daniel under Antiochus IV in the 160s B.C. and Revelation at Jerusalem’s fall in A.D. 70. The medieval and modern church then fall out of the prophecy. A related older charge is Porphyry’s: Daniel was written after the events.",
      IMG + "glossary-preterism.png"),
    entry("futurism", "Futurism", ["futurist"], "word",
      "The claim that most of the hard numbers in Daniel jump to a future Antichrist after a long gap.",
      "Jesuit Francisco Ribera (1590) cut the 70th week of Daniel 9 away from the first 69 and placed Antichrist as one future man ruling 3½ literal years in Jerusalem. That gap later entered Protestant pulpits through Irving, Darby, and the Scofield Bible.",
      IMG + "glossary-futurism.png"),
    entry("dispensationalism", "Dispensationalism", ["dispensational"], "word",
      "A 19th-century Protestant system that splits history into ages and usually keeps Ribera’s gap before a future 70th week.",
      "Edward Irving and John Nelson Darby popularized it in the 1830s; the 1909 Scofield Reference Bible spread it in English pews. It is not in Daniel’s wording. Gabriel never writes a two-thousand-year gap into the seventy weeks.",
      IMG + "glossary-dispensationalism.png"),
    entry("year-day", "Year-Day Principle", ["year-day", "year-day principle", "Year-Day", "prophetic day"], "word",
      "When God gives a numbered sign, one prophetic day may stand for one literal solar year.",
      "God states the scale twice: Numbers 14:34 (forty spy-days become forty wilderness years) and Ezekiel 4:6 (Ezekiel’s body-days appointed “each day for a year”). Daniel’s own 70 weeks cannot be 490 ordinary days and still hold a rebuilt city and the cross — that is the book checking the ruler. 2 Peter 3:8 is about God’s patience, not this scale.",
      IMG + "glossary-year-day.png"),
    entry("apocalyptic", "apocalyptic", ["Apocalyptic"], "word",
      "A style of vision that uses symbols (beasts, horns, metals) for real kingdoms and spans of history.",
      "Daniel 7–8 is apocalyptic: a lion stands for a kingdom, not a literal beast. Time inside that same symbolic vision is not automatically a wall-clock day. Narrative chapters (1, 3–6) are different: a “day” or “time” there can be an ordinary human day or year, as in Nebuchadnezzar’s seven times.",
      IMG + "glossary-apocalyptic.png"),
    entry("colossus", "colossus", ["Colossus", "metallic colossus"], "word",
      "The huge multi-metal statue of Daniel 2 — gold head to iron-and-clay feet.",
      "Only the gold head is named (Babylon, 2:38). Later metals are identified by succession and by later chapters that name Medo-Persia and Greece. The stone does not mend the statue. It strikes the feet and fills the earth.",
      IMG + "glossary-colossus.png"),
    entry("little-horn", "little horn", ["Little Horn", "eleventh horn"], "word",
      "A smaller horn that rises among ten kings, diverse from them, and attacks God’s people and sanctuary.",
      "Daniel 7’s horn rises from the fourth beast (Rome) after A.D. 476, uproots three, speaks against the Most High, and reigns “a time, times, and the dividing of time.” This study reads that as the papal church-state. Daniel 8’s horn grows from the Greek settlement toward the Glorious Land and attacks the tamid; historicists read pagan then papal Rome in succession. Antiochus IV is too early and too short for chapter 7.",
      IMG + "glossary-little-horn.png"),
    entry("church-state", "church-state", ["church-state power"], "word",
      "A power that is both a church (it claims to speak for God) and a state (it can punish with civil force).",
      "Daniel 7:24 says the eleventh horn is “diverse” from the ten ethnic kingdoms. The Reformers took that diversity to be religious-plus-political authority seated in Rome, not a merely pagan king.",
      IMG + "glossary-church-state.png"),
    entry("tamid", "tamid", ["the daily", "continual"], "word",
      "Hebrew for the continual daily ministry — the standing, regular service before God.",
      "On earth it was the regular sacrifice. In Daniel 8 the horn removes the tamid and casts down the sanctuary’s place. This study reads the deeper target as Christ’s continual priesthood being replaced by a counterfeit earthly mediation.",
      IMG + "glossary-tamid.png"),
    entry("nitsdaq", "nitsdaq", ["cleansed", "put right"], "word",
      "The verb in Daniel 8:14: the sanctuary is justified, vindicated, put right — not merely washed.",
      "English often says “cleansed.” The Hebrew is a courtroom word (related to “righteous”), not taher (ritual washing). This study ties that putting-right to the Day of Atonement work in heaven, the same judgment scene Daniel 7 already opened.",
      IMG + "glossary-nitsdaq.png"),
    entry("chathak", "chathak", [], "word",
      "A Hebrew verb used only once in the Bible (Daniel 9:24): cut off, severed.",
      "Gabriel does not start a new clock from zero. He cuts seventy weeks from the only long span Daniel has just received — the 2,300 evenings-mornings — so the cross can date the longer line.",
      IMG + "glossary-chathak.png"),
    entry("hapax", "hapax", ["hapax legomenon"], "word",
      "A word that appears only once in the Bible (or in a given body of text).",
      "Chathak in Daniel 9:24 is a hapax. That is why the sitting slows down there: you cannot check the word against ten other verses. You weigh its root meaning (“cut”) and the vision Gabriel said he came to explain.",
      IMG + "glossary-hapax.png"),
    entry("arian", "Arian", ["Arian kingdoms"], "word",
      "Christian kingdoms that denied the Roman church’s teaching that Christ is fully God.",
      "The Heruli, Vandals, and Ostrogoths were Arian Germanic powers in the west. Historicists read them as the three horns uprooted before a church-state in Rome could operate freely (493, 534, 538).",
      IMG + "glossary-arian.png"),
    entry("diadochi", "Diadochi", [], "word",
      "Alexander’s generals who carved his empire into four after he died.",
      "Cassander, Lysimachus, Seleucus, and Ptolemy. They are the goat’s four horns in Daniel 8 and the four heads of the leopard in Daniel 7. From one of those directions the little horn of chapter 8 grows.",
      IMG + "glossary-diadochi.png"),
    entry("satrap", "satrap", ["satraps"], "word",
      "A Persian provincial governor who collected tribute and enforced the king’s law.",
      "In Daniel 6 the satraps cannot find fraud in Daniel, so they write a law against prayer. The trap is legal, not criminal.",
      IMG + "glossary-satrap.png"),
    entry("millerite", "Millerite", ["Millerites", "Millerite movement"], "word",
      "Americans in the 1830s–1840s who preached, from William Miller’s reading of Daniel, that the 2,300 days were about to end.",
      "The center was the Northeast: Low Hampton, Boston’s Signs of the Times, camp meetings, then Exeter’s seventh-month cry. They expected Christ to come to this earth. 22 October 1844 disappointed that event. This study keeps their year-day arithmetic and reads the sanctuary as heaven, not the earth.",
      IMG + "glossary-millerite.png"),
    entry("miller", "William Miller", ["Miller"], "person",
      "A Baptist farmer of Low Hampton, New York, who from 1831 preached that Daniel’s 2,300 days ended “about the year 1843.”",
      "War of 1812 captain; published Evidence from Scripture and History… About the Year 1843 (Boston, 1842). He treated the metals as one chain and the earth as the sanctuary to be cleansed by fire. He did not invent 22 October — Samuel S. Snow did, at Exeter in August 1844.",
      IMG + "glossary-miller.png"),
    entry("great-disappointment", "Great Disappointment", ["disappointment of 1844"], "word",
      "22 October 1844: Christ did not appear. The date the arithmetic named stayed; the event they expected did not.",
      "Hostile papers mocked the Millerites and invented white “ascension robes.” The ordinary record is ordinary clothes and public grief. The next morning’s cornfield claim (Hiram Edson, Port Gibson) is that the sanctuary of 8:14 is in heaven. Check it as their account, then test it in Hebrews 8–9.",
      IMG + "glossary-great-disappointment.png"),
    entry("seventh-month", "seventh-month cry", ["true midnight cry", "seventh month message"], "word",
      "Samuel S. Snow’s August 1844 preaching that the 2,300 days would end on the Day of Atonement, 22 October.",
      "Leviticus 16 puts cleansing on the tenth day of the seventh month. Snow used the Karaite visible-moon calendar. Exeter, New Hampshire, is where that day became the movement’s public appointment.",
      IMG + "glossary-seventh-month.png"),
    entry("karaite", "Karaite", ["Karaite calendar", "Karaite reckoning"], "word",
      "A Jewish calendar practice that sets months by the visible new moon, not only by later calculated tables.",
      "Leviticus 16 puts sanctuary cleansing on the tenth day of the seventh month (Day of Atonement). In 1844 that day fell on 22 October by Karaite reckoning. If you reject that calendar, the year 1844 still sits on the 2,300-year line; the exact day is this study’s finer claim.",
      IMG + "glossary-karaite.png"),
    entry("most-holy", "Most Holy Place", ["Most Holy", "Holy of Holies"], "word",
      "The inner room of the sanctuary, entered only on the Day of Atonement with blood.",
      "Leviticus 16. This study reads Daniel 8:14’s putting-right as that day’s heavenly counterpart — judgment and vindication — not a local cleaning of the earthly temple.",
      IMG + "glossary-most-holy.png"),
    entry("atonement", "Day of Atonement", ["atonement"], "word",
      "Israel’s yearly day when the high priest entered the Most Holy Place to cleanse the sanctuary from the year’s sins.",
      "Leviticus 16. It is the Old Testament picture behind “then shall the sanctuary be nitsdaq.” October 22, 1844 is this study’s dated claim for that day’s antitype in heaven.",
      IMG + "glossary-atonement.png"),
    entry("prophetic-year", "prophetic year", ["360-day year"], "word",
      "In apocalyptic counting, a “year” or “time” is often 360 days (12 × 30), matching 42 months = 1,260 days.",
      "Revelation 12:6, 12:14, and 13:5 use 1,260 days, 3½ times, and 42 months for the same span. That is how Daniel 7:25 becomes 1,260 days before year-day turns them into years.",
      IMG + "glossary-prophetic-year.png"),
    entry("time-times", "time, times, and dividing", ["time, times, and the dividing of time", "time and times"], "word",
      "A riddle-phrase for 3½ years: one year + two years + half a year.",
      "Daniel 7:25. Revelation writes the same span as 1,260 days and 42 months. On the year-day scale those days are years (A.D. 538–1798 in this study). Daniel 4’s “seven times” over Nebuchadnezzar are ordinary years of one man’s life — that chapter ends with him restored.",
      IMG + "glossary-time-times.png"),
    entry("counter-reformation", "Counter-Reformation", ["Counter Reformation"], "word",
      "Rome’s 16th–17th century answer to the Protestant Reformation, including new readings of prophecy.",
      "The Council of Trent (1545–1563) restated Catholic teaching. Jesuit scholars then published methods (Ribera’s futurism, Alcázar’s preterism) that moved the Antichrist off the medieval papacy.",
      IMG + "glossary-counter-reformation.png"),
    entry("trent", "Council of Trent", ["Trent"], "word",
      "A long Catholic council (1545–1563) that answered the Reformation.",
      "Twenty-five sessions. This sitting names it as the moment the historicist charge against a church-state Antichrist was felt to be pastorally dangerous, and new readings were published that removed the medieval church from the chain.",
      IMG + "glossary-trent.png"),
    entry("jesuit", "Jesuit", ["Jesuits", "Society of Jesus"], "word",
      "Members of the Society of Jesus, a Catholic order founded in 1540 to teach, missionize, and defend the Roman church.",
      "Luis de Alcázar and Francisco Ribera were Spanish Jesuits whose commentaries became the templates for preterism and futurism. This study names those two readings so you can test them. It does not treat the Society of Jesus, or every Jesuit, as the author of that work.",
      IMG + "glossary-jesuit.png"),
    entry("zeroim", "zeroim", [], "word",
      "Hebrew for vegetables, grains, and seeds — the food of Daniel’s ten-day test.",
      "Daniel 1:12. Echoes Genesis 1:29. The point is not a modern health regimen. The royal table was tied to Marduk’s liturgy and mixed unclean meat (Leviticus 11; Xenophon, Cyropaedia 1.3.10 documents the royal-table custom). Daniel drew the line at worship, not at court rank or language.",
      IMG + "glossary-zeroim.png"),
    entry("cubit", "cubit", ["cubits"], "word",
      "An ancient length: roughly from elbow to fingertip, about 18 inches / 45 cm.",
      "The Dura image is 60 cubits by 6 cubits (Daniel 3:1). Babylon counted in sixties. This sitting notes the all-gold design as a public denial of the multi-metal dream, not as a curiosity of measurement.",
      IMG + "glossary-cubit.png"),
    entry("co-regent", "co-regent", [], "word",
      "A king who shares the throne while another king (often his father) is still alive or away.",
      "Belshazzar ruled Babylon in the city while Nabonidus was in Tema. That is why Daniel can be offered third place (5:16): Nabonidus, Belshazzar, then the interpreter.",
      IMG + "glossary-co-regent.png"),
    entry("sola-scriptura", "sola scriptura", [], "word",
      "Latin: Scripture as the final rule of faith — not popes, councils, or custom above the text.",
      "A Reformation slogan. In this sitting it explains why Luther and Calvin thought they could read Daniel against the medieval church: the Bible, not the office, names the horn.",
      IMG + "glossary-sola-scriptura.png"),
    entry("sola-fide", "sola fide", [], "word",
      "Latin: justified by faith, not by buying pardon or collecting merits.",
      "Paired with sola scriptura as the Reformation’s other engine. The prophetic charge (the little horn as a church-state) rode with that gospel protest; it was not a secondary interest.",
      IMG + "glossary-sola-fide.png"),
    entry("antichrist", "Antichrist", ["antichrist"], "word",
      "In historicist reading: the church-state power that takes Christ’s place (anti = in place of) among Rome’s fragments — not only a future single man.",
      "1 John already speaks of “many antichrists.” The Reformers applied the office of a persecuting papal supremacy to Daniel 7 and Revelation 13/17. Futurism moved the word to one end-time individual.",
      IMG + "glossary-antichrist.png"),
    entry("papacy", "papacy", ["papal", "pope"], "word",
      "The office of the bishop of Rome as a spiritual and, for long centuries, civil power.",
      "This study identifies Daniel 7’s little horn with that office in its church-state form, not with every personal piety of every pope. The measured span this sitting uses is A.D. 538 to 1798.",
      IMG + "glossary-papacy.png"),
    entry("boanthropy", "boanthropy", [], "word",
      "A rare condition in which a person believes he is an ox and lives like a beast.",
      "A modern medical label for what Daniel 4 describes. The chapter’s point is theological: a king who says “I have built” is reduced beneath human dignity until he lifts his eyes. Do not use the label to erase the boast.",
      IMG + "glossary-boanthropy.png"),
    entry("mene", "MENE, TEKEL, UPHARSIN", ["MENE", "TEKEL", "UPHARSIN", "PERES"], "word",
      "Aramaic market-weights on the plaster: numbered, weighed, divided.",
      "Daniel 5. God has numbered Belshazzar’s kingdom and finished it; the king is too light on the scale; the realm is split to Medes and Persians. It is a weighing of the kingdom, not a tale of spirits.",
      IMG + "glossary-mene.png"),
    entry("probation", "probation", ["close of probation"], "word",
      "The time during which a person or world may still turn; when it closes, advocacy ends and judgment proceeds.",
      "This study reads Michael “standing up” in Daniel 12:1 as the close of Christ’s priestly plea. Twelve months of mercy in Daniel 4 are a smaller picture of the same patience.",
      IMG + "glossary-probation.png"),
    entry("exile", "exile", ["Babylonian exile", "Babylonian captivity"], "word",
      "The forced displacement of Judah to Babylon under God's judicial sentence across three deportations: 605, 597, and 586 B.C.",
      "Exile was not a chosen journey or a mere accident of war. Daniel 1:2 declares that God handed Jehoiakim over. Daniel begins in the first levy (605 B.C.), Ezekiel in the second (597 B.C.), and the city and temple were burned in the third (586 B.C., 2 Kings 25).",
      IMG + "glossary-exile.png"),
    entry("typology", "typology", ["type", "antitype", "antitypical", "type-pattern", "prophetic pattern"], "word",
      "An earlier God-designed picture (type) that a later reality (antitype) fills full.",
      "Dura is the type of forced worship; Revelation 13 is its global antitype. The earthly Day of Atonement is the type; Daniel 8:14 is the antitype in heaven. A type is not a metaphor you invent. It is a pattern Scripture itself repeats.",
      IMG + "glossary-typology.png"),
    entry("sanctuary", "sanctuary", [], "word",
      "God’s dwelling for priestly ministry — first the tent/temple on earth, then the true one in heaven (Hebrews 8–9).",
      "Daniel 8 is not only about a local altar in Judea. The horn magnifies itself to the Prince of the host and casts down the place of His sanctuary. The numbered span tells when that ministry is put right.",
      IMG + "glossary-sanctuary.png"),
    entry("evening-morning", "evening and morning", ["evenings and mornings", "evening-morning"], "word",
      "Genesis 1’s name for a full day-unit. Daniel 8:14 uses that pair for 2,300 units.",
      "Not half-sacrifices added together. Once Daniel 9 proves the numbered day runs as a year, these 2,300 units are 2,300 years, cut by seventy weeks from the same start.",
      IMG + "glossary-evening-morning.png"),
    entry("heruli", "Heruli", [], "word",
      "A Germanic kingdom in Italy, crushed in A.D. 493 — first of three horns this study reads as uprooted.",
      "Arian. Their fall cleared space for a church-state in the west. Date is history; the “three horns” claim is the prophetic reading you are allowed to test.",
      IMG + "glossary-heruli.png"),
    entry("vandals", "Vandals", [], "word",
      "A Germanic kingdom in North Africa, broken in A.D. 534 — second of the three horns.",
      "Arian sea-power. Justinian’s general Belisarius ended their kingdom. Again: dated history, then the Daniel 7 checklist.",
      IMG + "glossary-vandals.png"),
    entry("ostrogoths", "Ostrogoths", ["Ostrogothic"], "word",
      "The Germanic kingdom that held Rome until A.D. 538 in this study’s start-date.",
      "Arian. When their grip on the city broke, Justinian’s grant to the Roman bishop could operate. That is why 538 is a candidate, not a verse.",
      IMG + "glossary-ostrogoths.png"),

    entry("daniel", "Daniel", [], "person",
      "A Judahite noble taken to Babylon in 605 B.C.; prophet, court official, and the book’s human author-witness.",
      "His Hebrew name means “God is my Judge.” The court renamed him Belteshazzar. He drew the line at the king’s table (worship), served under Babylon and Persia, and received the metal, beast, and numbered-day visions. The book closes with a personal promise: he will rest and rise to his inheritance.",
      IMG + "glossary-daniel.png"),
    entry("nebuchadnezzar", "Nebuchadnezzar", ["Nebuchadrezzar"], "person",
      "Neo-Babylonian king (c. 605–562 B.C.), the head of gold, who took Judah’s first captives and later burned Jerusalem (586).",
      "He dreamed the statue, built the all-gold image on Dura, and was driven to the field for seven times until he lifted his eyes. Daniel 2:37–38 says the God of heaven gave him the kingdom. Babylonian building inscriptions match the pride of 4:30.",
      IMG + "glossary-nebuchadnezzar.png"),
    entry("jehoiakim", "Jehoiakim", [], "person",
      "King of Judah (c. 609–598 B.C.). Daniel 1:1 dates the first deportation to his third year (605).",
      "2 Kings 23–24: a son of Josiah who reversed his father’s reforms and served, then rebelled against, Babylon. The Lord “gave” him into Nebuchadnezzar’s hand (Dan 1:2). Do not collapse him with Jehoiachin (597) or Zedekiah (586).",
      IMG + "glossary-jehoiakim.png"),
    entry("jehoiachin", "Jehoiachin", [], "person",
      "King of Judah taken in 597 B.C. when Babylon captured “the city of Judah” (BM 21946).",
      "Also called Jeconiah. A later siege than Daniel 1:1. This study keeps 605 and 597 as two events so the Babylonian tablet is not forced onto Daniel’s opening year.",
      IMG + "glossary-jehoiachin.png"),
    entry("three-hebrews", "Shadrach, Meshach, and Abednego", ["Hananiah", "Mishael", "Azariah", "three Hebrews"], "person",
      "Daniel’s three companions. Hebrew names praise Yahweh; Babylonian names praise other gods.",
      "Hananiah, Mishael, and Azariah refused the Dura bow (Daniel 3) after already refusing the royal table (Daniel 1). The furnace is the public form of the same line Daniel drew in private.",
      IMG + "glossary-three-hebrews.png"),
    entry("belshazzar", "Belshazzar", [], "person",
      "Last king in the city of Babylon (539 B.C.); son and co-regent of Nabonidus.",
      "Greek lists once seemed to omit him. Tablets restored him: Nabonidus in Tema, Belshazzar hosting the feast. He drank from Yahweh’s vessels and was killed the night the city fell. “Grandson” of Nebuchadnezzar in this sitting is dynastic language.",
      IMG + "glossary-belshazzar.png"),
    entry("nabonidus", "Nabonidus", [], "person",
      "Last official king of Babylon; often away in Arabia while Belshazzar held the capital.",
      "The Nabonidus Chronicle and Verse Account explain the two-king court Daniel 5 assumes. His absence is why “third ruler” in 5:16 is a precise offer.",
      IMG + "glossary-nabonidus.png"),
    entry("cyrus", "Cyrus", ["Cyrus the Great"], "person",
      "Persian king who took Babylon in 539 B.C. and later permitted the Jews to return (Ezra 1).",
      "Isaiah 45:1 names him a century and more beforehand and speaks of open gates. The Cyrus Cylinder shows a policy of returning exiles and gods. He is the silver kingdom’s founder, not the bronze.",
      IMG + "glossary-cyrus.png"),
    entry("darius-mede", "Darius the Mede", [], "person",
      "The ruler who “received the kingdom” at Babylon’s fall in Daniel 5:31–6:1, about sixty-two years old.",
      "Greek histories name Cyrus as conqueror and do not list this Median Darius. Honest options: a governor (Ugbaru/Gubaru) with a throne-name; a short Median colleague of Cyrus; or Cyrus under a Median title. The chapter’s load-bearing test is the unchangeable law against prayer, not a modern personal identification.",
      IMG + "glossary-darius-mede.png"),
    entry("artaxerxes", "Artaxerxes", ["Artaxerxes I"], "person",
      "Persian great king. His seventh year (457 B.C.) is the decree this study uses to start the 70 weeks (Ezra 7).",
      "Ezra goes up with authority to appoint magistrates and judges — civil restoration, not only temple stones. His twentieth year (444 B.C.) sends Nehemiah to repair walls. 457 + 483 years (no year 0) = A.D. 27.",
      IMG + "glossary-artaxerxes.png"),
    entry("alexander", "Alexander", ["Alexander the Great"], "person",
      "Macedonian king who smashed Persia (Gaugamela 331 B.C.) and died in 323 B.C. at thirty-two.",
      "Daniel 8: the goat’s notable horn. When it snaps, four Diadochi horns replace it. Speed is the leopard’s wings. He is Greece, the bronze — not the little horn of chapter 7.",
      IMG + "glossary-alexander.png"),
    entry("antiochus", "Antiochus IV Epiphanes", ["Antiochus", "Antiochus IV"], "person",
      "Seleucid king (175–164 B.C.) who profaned the Jerusalem temple altar; a real tyrant, and far too small for Daniel 7–8’s full scope.",
      "Gabriel places Daniel 8’s vision at “the time of the end” (8:17, 19), which an ancient Syrian king dying in 164 B.C. cannot reach. He was merely one king in the Greek division (third kingdom), not the exceedingly great power that follows Greece and challenges the Prince of the host. Porphyry and later preterists forced the whole prophecy onto him to deny real prediction. This study keeps him as a local historical type, not the final horn.",
      IMG + "glossary-antiochus.png"),
    entry("judas-maccabeus", "Judas Maccabeus", ["Maccabees", "Maccabean"], "person",
      "Jewish commander who led the revolt against Seleucid rule and rededicated the Jerusalem temple altar (164 B.C.).",
      "Jewish tradition (Hanukkah) remembers that local temple restoration. It does not fulfill Daniel 8:14’s long time-scale to “the time of the end” (8:17, 19) or the celestial courtroom vindication of the sanctuary (nitsdaq).",
      IMG + "glossary-judas-maccabeus.png"),
    entry("gabriel", "Gabriel", [], "person",
      "The angel sent to make Daniel understand (8:16; 9:21–23).",
      "He interprets the ram and goat, then returns while Daniel is praying to cut seventy weeks from the unexplained vision. In Luke 1 he announces John and Jesus. He is a messenger sent to explain.",
      IMG + "glossary-gabriel.png"),
    entry("michael", "Michael", [], "person",
      "“The great prince who stands for Daniel’s people” (12:1). This study identifies him with Christ.",
      "He helps against the prince of Persia (10:13, 21). Jude 9 and Revelation 12 show him in conflict with the dragon. “Stand up” in 12:1 is Daniel’s verb for kings assuming power (11:2–4); this study reads it as Christ assuming His kingly stance with intercession finished. You may test that identification; do not empty the sanctuary picture.",
      IMG + "glossary-michael.png"),
    entry("justinian", "Justinian", [], "person",
      "Eastern Roman emperor (527–565) whose laws elevated the bishop of Rome and whose wars broke Arian kingdoms in the west.",
      "His grant is part of why historicists can start the 1,260 years when the Ostrogoths lose Rome (538): the legal claim and the city finally meet. He is not named in Daniel. He is a candidate in the checklist.",
      IMG + "glossary-justinian.png"),
    entry("berthier", "Berthier", ["Louis-Alexandre Berthier"], "person",
      "French Revolutionary general who entered Rome in 1798 and took Pope Pius VI prisoner.",
      "That dated blow is this study’s end of the 1,260 years of papal political supremacy. The office continued; the measured reign as a civil prince in that form did not.",
      IMG + "glossary-berthier.png"),
    entry("pius-vi", "Pius VI", [], "person",
      "Pope taken captive in 1798 when Berthier entered Rome; he died in exile in 1799.",
      "The event, not the man’s private character, is why the year appears on the chart. Historicists read it as Daniel 7:26 beginning to consume the horn’s dominion.",
      IMG + "glossary-pius-vi.png"),
    entry("clovis", "Clovis", [], "person",
      "Frankish king whose conversion and later Frankish policy gave the Roman church civil muscle in the west.",
      "This study uses A.D. 508 as a testable start for the 1,290 and 1,335 days of Daniel 12:11–12 (landing 1798 and 1843/44). If 508 is wrong, the landings move. The method stays.",
      IMG + "glossary-clovis.png"),
    entry("luther", "Martin Luther", ["Luther"], "person",
      "German Reformer (1483–1546). Read Daniel historicist: the little horn as a church-state Antichrist.",
      "Prefaces to Daniel (1530). He did not invent year-day; he inherited a medieval-Protestant habit of reading the empires as a chain. Sola scriptura is why he thought he could say so against Rome.",
      IMG + "glossary-luther.png"),
    entry("calvin", "John Calvin", ["Calvin"], "person",
      "French-Genevan Reformer (1509–1564); wrote commentaries on Daniel in the same historicist chain.",
      "He kept the four kingdoms as real empires and refused to treat the book as a finished Maccabean pamphlet. Cited on sheet 0 as part of the Protestant consensus, not as a final authority.",
      IMG + "glossary-calvin.png"),
    entry("newton-isaac", "Isaac Newton", ["Newton", "Sir Isaac Newton"], "person",
      "Natural philosopher (1643–1727) who also wrote Observations upon the Prophecies of Daniel (1733).",
      "He called Daniel “most distinct in order of time.” This study quotes that line because it states Historicism in one sentence: the book is a dated sequence, not a riddle left in the past or the far future.",
      IMG + "glossary-newton.png"),
    entry("wycliffe", "John Wycliffe", ["Wycliffe"], "person",
      "English reformer (d. 1384) who already read the papal office into apocalyptic warning.",
      "Named on sheet 0 as an early witness that Historicism is older than Luther. He translated Scripture into English and attacked indulgences and papal claims.",
      IMG + "glossary-wycliffe.png"),
    entry("alcazar", "Luis de Alcázar", ["Alcázar", "Alcazar"], "person",
      "Spanish Jesuit of Seville (1554–1613); his 1614 commentary became the template for preterism.",
      "Vestigatio Arcani Sensus in Apocalypsi. He placed Daniel under Antiochus and Revelation in A.D. 70, which takes the medieval and modern church out of the prophetic chain.",
      IMG + "glossary-alcazar.png"),
    entry("ribera", "Francisco Ribera", ["Ribera"], "person",
      "Spanish Jesuit of Salamanca (1537–1591); his 1590 Revelation commentary became the template for futurism.",
      "He placed Antichrist as one future man for 3½ literal years and severed the 70th week from the first 69. Darby and Scofield later carried that gap into Protestant Bibles.",
      IMG + "glossary-ribera.png"),
    entry("darby", "John Nelson Darby", ["Darby"], "person",
      "Plymouth Brethren teacher (1800–1882) who imported Ribera’s gap into Protestant dispensationalism.",
      "Albury / Powerscourt circles and a system of ages. Daniel never prints the gap. This sitting names Darby so you can see the 19th-century shift instead of assuming “the church has always read it this way.”",
      IMG + "glossary-darby.png"),
    entry("irving", "Edward Irving", ["Irving"], "person",
      "Scottish preacher (1792–1834); Albury Conferences helped move futurist readings into British Protestantism.",
      "A channel, with Darby, for Ribera’s severed week. Named so sheet 0’s “19th-century Great Shift” has named teachers, not an anonymous haze.",
      IMG + "glossary-irving.png"),
    entry("scofield", "C. I. Scofield", ["Scofield", "Scofield Reference Bible"], "person",
      "American minister and editor (1843–1921) whose annotated 1909 Scofield Reference Bible popularized dispensational futurism across English-speaking Protestantism.",
      "His explanatory study notes placed Ribera’s and Darby’s severed 70th week and secret pretribulation rapture directly beside the biblical text in millions of homes, canonizing the 2,000-year parenthetical prophetic gap in popular imagination.",
      IMG + "glossary-scofield.png"),
    entry("porphyry", "Porphyry", [], "person",
      "3rd-century pagan philosopher who said Daniel was written after Antiochus, as history dressed as prediction.",
      "Jerome preserved the charge while answering it. 19th-century higher criticism revived the late date (c. 165 B.C.). If Porphyry is right, the God of Daniel 2:28 does not reveal the latter days. The whole course stands against that.",
      IMG + "glossary-porphyry.png"),
    entry("ezekiel", "Ezekiel", [], "person",
      "Priest-prophet already in exile; God had him lie on his side 390 + 40 days, “each day for a year” (Ezekiel 4:6).",
      "He is why Ezekiel is on the year-day sitting: a contemporary of Daniel’s world, hearing the same appointment in a numbered sign-act. He is not a later church theorist.",
      IMG + "glossary-ezekiel.png"),

    entry("babylon", "Babylon", ["Shinar"], "place",
      "Capital of the gold head; Daniel’s first workplace and the city that fell in 539 B.C.",
      "Ishtar Gate, Marduk’s temples, double walls and a river. Daniel 1:2 says its first victory over Judah was given, not seized independently. Chapter 5 is the night the gold ended.",
      IMG + "glossary-babylon.png"),
    entry("jerusalem", "Jerusalem", ["Glorious Land", "Zion"], "place",
      "Judah’s capital; Temple city; the place Daniel faced when he prayed (6:10).",
      "First vessels leave in 605; city and Temple fall in 586; return decrees under Persia. In Daniel 8 “the Glorious Land” is Judah. The sanctuary put right in 8:14 is not this hill being locally restored in 164 B.C.",
      IMG + "glossary-jerusalem.png"),
    entry("dura", "Plain of Dura", ["Dura"], "place",
      "The level ground near Babylon where Nebuchadnezzar raised an all-gold image (Daniel 3).",
      "Sixty cubits by six, gold with no silver or iron — a public “no” to the dream of chapter 2. The furnace stands there as the civic test of the second commandment.",
      IMG + "glossary-dura.png"),
    entry("ulai", "Ulai", [], "place",
      "A canal or river by Susa (Shushan) where Daniel saw the ram and goat (Daniel 8).",
      "The vision that names Medo-Persia and Greece, then asks how long the sanctuary-attack lasts: 2,300 evenings-mornings.",
      IMG + "glossary-ulai.png"),
    entry("hiddekel", "Hiddekel", ["Tigris"], "place",
      "The Tigris River, where Daniel saw the man in linen (Daniel 10).",
      "Hebrew Hiddekel. The last sitting opens here in 536 B.C. with a three-week fast and the long explanation of chapters 10–12.",
      IMG + "glossary-hiddekel.png"),
    entry("rome", "Rome", ["Roman see"], "place",
      "Capital of the iron kingdom; later seat of the church-state this study reads as the little horn.",
      "Imperial Rome crushes (Daniel 2:40; 7:7). After 476 the west is fragments. 538 and 1798 are dated at this city in the historicist checklist.",
      IMG + "glossary-rome.png"),
    entry("pella", "Pella", [], "place",
      "Macedonian city tied to Alexander’s house — a map pin for the bronze/goat.",
      "Used on this desk’s map as a Greece node. The prophecy’s load-bearing name is Greece (8:21), not a later travel name.",
      IMG + "glossary-pella.png"),
    entry("persepolis", "Persepolis", [], "place",
      "Ceremonial capital of Persia; a map pin for the silver/ram.",
      "Burned in Alexander’s campaign. Daniel 8:20 names the ram: Media and Persia. The ruins help the eye; the verse names the kingdom.",
      IMG + "glossary-persepolis.png"),
    entry("susa", "Susa", ["Shushan"], "place",
      "Persian royal city; Daniel is “in Shushan the palace” when he sees chapter 8.",
      "Later Esther’s stage. The Ulai runs there. The vision is not a Greek pamphlet written in Judea after the fact — the book places the seer in Persia.",
      IMG + "glossary-susa.png"),
    entry("carchemish", "Carchemish", [], "place",
      "Euphrates fortress where Nebuchadnezzar beat Egypt in 605 B.C., opening the road to Judah.",
      "Jeremiah 46. That victory is why Daniel 1:1’s third year of Jehoiakim is a real first deportation, not a mix-up with 597 or 586.",
      IMG + "glossary-carchemish.png")
  ];

  function escapeHtml(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function byId(id) {
    var list = window.SHEET_GLOSSARY || [];
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
    return null;
  }

  function kindLabel(kind) {
    if (kind === "person") return "Person";
    if (kind === "place") return "Place";
    return "Word";
  }

  function namesOf(item) {
    var names = [item.term].concat(item.aliases || []);
    var out = [];
    var seen = {};
    names.forEach(function (n) {
      if (!n) return;
      var key = String(n).toLowerCase();
      if (seen[key]) return;
      seen[key] = true;
      out.push(String(n));
    });
    return out.sort(function (a, b) { return b.length - a.length; });
  }

  function skipParent(el) {
    if (!el || !el.closest) return true;
    return !!el.closest("script, style, button, a, .term-gloss, .strongs-gloss, .term-popover, .strongs-popover, .first-principles-kicker, figcaption, .glossary-index");
  }

  function wordBoundaryOk(text, start, end, needle) {
    if (/[^A-Za-z]/.test(needle.charAt(0)) || /[^A-Za-z0-9]/.test(needle.charAt(needle.length - 1))) {
      return true;
    }
    var before = start === 0 ? "" : text.charAt(start - 1);
    var after = end >= text.length ? "" : text.charAt(end);
    var edge = /[A-Za-z0-9]/;
    return !edge.test(before) && !edge.test(after);
  }

  function findMatch(text, needle) {
    var hay = text.toLowerCase();
    var find = needle.toLowerCase();
    var from = 0;
    while (from <= hay.length - find.length) {
      var at = hay.indexOf(find, from);
      if (at < 0) return -1;
      if (wordBoundaryOk(text, at, at + needle.length, needle)) return at;
      from = at + 1;
    }
    return -1;
  }

  function linkArticle(root) {
    if (!root) return;
    var entries = window.SHEET_GLOSSARY || [];
    var jobs = [];
    entries.forEach(function (item) {
      namesOf(item).forEach(function (name) {
        if (name.length < 4 && item.kind !== "word") return;
        jobs.push({ id: item.id, name: name });
      });
    });
    jobs.sort(function (a, b) { return b.name.length - a.name.length; });

    var used = {};
    jobs.forEach(function (job) {
      if (used[job.id]) return;
      var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
        acceptNode: function (node) {
          if (!node.nodeValue || !node.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
          if (skipParent(node.parentElement)) return NodeFilter.FILTER_REJECT;
          return NodeFilter.FILTER_ACCEPT;
        }
      });
      while (walker.nextNode()) {
        var node = walker.currentNode;
        var at = findMatch(node.nodeValue, job.name);
        if (at < 0) continue;
        var mid = node.splitText(at);
        mid.splitText(job.name.length);
        var mark = document.createElement("button");
        mark.type = "button";
        mark.className = "term-gloss";
        mark.setAttribute("data-term", job.id);
        mark.setAttribute("aria-label", "Glossary: " + job.name);
        mark.textContent = mid.nodeValue;
        mid.parentNode.replaceChild(mark, mid);
        used[job.id] = true;
        break;
      }
    });
  }

  function popoverHtml(item) {
    var img = item.image
      ? '<img class="term-popover-img" src="' + escapeHtml(item.image) + '" alt="" width="120" height="160" onerror="this.remove()">'
      : "";
    return (
      '<div class="flex items-center justify-between border-b border-amber-500/30 pb-1 mb-1.5 font-mono text-[10px]">' +
        '<span class="font-bold text-amber-700 dark:text-amber-400">' + escapeHtml(kindLabel(item.kind)) + '</span>' +
        '<button type="button" class="text-ink-400 hover:text-ink-800 dark:hover:text-paper-100 px-1 font-bold" data-term-close="1">✕</button>' +
      "</div>" +
      '<div class="term-popover-body">' + img +
        '<div>' +
          '<p class="font-serif text-sm font-bold text-ink-900 dark:text-paper-100 mb-1">' + escapeHtml(item.term) + "</p>" +
          '<p class="text-[11px] text-ink-700 dark:text-paper-200 leading-relaxed mb-1.5">' + escapeHtml(item.simple) + "</p>" +
          '<p class="text-[11px] text-ink-600 dark:text-paper-300 leading-relaxed border-t border-amber-500/20 pt-1">' + escapeHtml(item.history) + "</p>" +
          '<button type="button" class="term-open-index mt-2 font-mono text-[10px] uppercase tracking-wider text-amber-800 dark:text-amber-300" data-term-index="' + escapeHtml(item.id) + '">Open in index</button>' +
        "</div>" +
      "</div>"
    );
  }

  function showPopover(anchor) {
    var id = anchor.getAttribute("data-term");
    var item = byId(id);
    if (!item) return;
    var existing = anchor.querySelector(".term-popover");
    if (existing) {
      existing.remove();
      return;
    }
    document.querySelectorAll(".term-popover, .strongs-popover").forEach(function (p) { p.remove(); });
    var pop = document.createElement("div");
    pop.className = "term-popover strongs-popover";
    pop.innerHTML = popoverHtml(item);
    anchor.appendChild(pop);
    if (window.StudyCompetency) {
      if (typeof window.StudyCompetency.recordGlossaryLookup === 'function') {
        window.StudyCompetency.recordGlossaryLookup(item.term);
      } else {
        window.StudyCompetency.recordScriptureLookup("Glossary: " + item.term);
      }
    }
  }

  function cardHtml(item, highlight) {
    var img = item.image
      ? '<img src="' + escapeHtml(item.image) + '" alt="" width="72" height="96" onerror="this.remove()">'
      : "";
    return (
      '<article class="glossary-card' + (highlight ? " is-focus" : "") + '" id="gloss-' + escapeHtml(item.id) + '" data-kind="' + escapeHtml(item.kind) + '">' +
        (img ? '<div class="glossary-card-plate">' + img + "</div>" : "") +
        "<div>" +
          '<p class="glossary-card-kind">' + escapeHtml(kindLabel(item.kind)) + "</p>" +
          "<h4>" + escapeHtml(item.term) + "</h4>" +
          "<p>" + escapeHtml(item.simple) + "</p>" +
          '<p class="glossary-card-hist">' + escapeHtml(item.history) + "</p>" +
        "</div>" +
      "</article>"
    );
  }

  function renderIndex(container, opts) {
    opts = opts || {};
    var q = (opts.q || "").trim().toLowerCase();
    var kind = opts.kind || "all";
    var focus = opts.focus || "";
    var list = (window.SHEET_GLOSSARY || []).slice().sort(function (a, b) {
      return a.term.localeCompare(b.term);
    });
    var shown = list.filter(function (item) {
      if (kind !== "all" && item.kind !== kind) return false;
      if (!q) return true;
      var blob = (item.term + " " + (item.aliases || []).join(" ") + " " + item.simple + " " + item.history).toLowerCase();
      return blob.indexOf(q) >= 0;
    });
    var words = list.filter(function (i) { return i.kind === "word"; }).length;
    var people = list.filter(function (i) { return i.kind === "person"; }).length;
    var places = list.filter(function (i) { return i.kind === "place"; }).length;
    container.innerHTML =
      '<div class="glossary-index">' +
        "<header>" +
          "<p class=\"glossary-kicker\">In-text index</p>" +
          "<h3>Words, people, and places</h3>" +
          "<p class=\"glossary-lead\">Dotted gold terms in the lesson open a short plate. This list is the full desk. Search or filter; nothing here is meant to stay a closed assumption.</p>" +
          '<div class="glossary-tools">' +
            '<input type="search" id="glossary-q" placeholder="Search the index" value="' + escapeHtml(opts.q || "") + '">' +
            '<div class="glossary-filters" role="tablist">' +
              '<button type="button" data-gloss-kind="all"' + (kind === "all" ? " class=\"is-on\"" : "") + ">All (" + list.length + ")</button>" +
              '<button type="button" data-gloss-kind="word"' + (kind === "word" ? " class=\"is-on\"" : "") + ">Words (" + words + ")</button>" +
              '<button type="button" data-gloss-kind="person"' + (kind === "person" ? " class=\"is-on\"" : "") + ">People (" + people + ")</button>" +
              '<button type="button" data-gloss-kind="place"' + (kind === "place" ? " class=\"is-on\"" : "") + ">Places (" + places + ")</button>" +
            "</div>" +
          "</div>" +
        "</header>" +
        '<div class="glossary-grid">' +
          (shown.length ? shown.map(function (item) { return cardHtml(item, item.id === focus); }).join("") : "<p>No entries match.</p>") +
        "</div>" +
      "</div>";

    var input = container.querySelector("#glossary-q");
    if (input) {
      input.addEventListener("input", function () {
        renderIndex(container, { q: input.value, kind: kind, focus: focus });
        var again = container.querySelector("#glossary-q");
        if (again) {
          again.focus();
          var n = again.value.length;
          try { again.setSelectionRange(n, n); } catch (e) {}
        }
      });
    }
    container.querySelectorAll("[data-gloss-kind]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        renderIndex(container, { q: (container.querySelector("#glossary-q") || {}).value || "", kind: btn.getAttribute("data-gloss-kind"), focus: focus });
      });
    });
    if (focus) {
      var el = container.querySelector("#gloss-" + focus);
      if (el) el.scrollIntoView({ block: "nearest" });
    }
  }

  function openIndex(focusId) {
    var panel = document.getElementById("glossary-panel");
    var btn = document.getElementById("btn-toggle-glossary");
    if (!panel) return;
    panel.hidden = false;
    renderIndex(panel, { focus: focusId || "", kind: "all", q: "" });
    if (btn) btn.setAttribute("aria-expanded", "true");
    panel.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  window.GlossaryIndex = {
    byId: byId,
    linkArticle: linkArticle,
    showPopover: showPopover,
    renderIndex: renderIndex,
    openIndex: openIndex
  };
})();
