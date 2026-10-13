(function () {
  function entry(id, term, aliases, kind, simple, history, image, proof) {
    return {
      id: id,
      term: term,
      aliases: aliases || [],
      kind: kind,
      simple: simple,
      history: history,
      image: image || "",
      proof: proof || []
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
      "This course uses historicism because Daniel’s succession language and parallel visions best fit a continuous historical reading when Scripture interprets Scripture. Wycliffe, Luther, Melanchthon, and Knox read Daniel as this one chain. Preterism, futurism, and idealism are the opposing views, with dated authors Alcázar (1614) and Ribera (about 1590) (ABSG 2020 Q1, lesson 1).",
      IMG + "glossary-historicism.png"),
    entry("preterism", "Preterism", ["preterist"], "word",
      "The claim that almost all of Daniel (and often Revelation) already finished in the distant past.",
      "Alcázar’s 1614 book limits the Apocalypse to Constantine’s overthrow of paganism. The Maccabean reading of Daniel is Porphyry’s, which Jerome reports. A related older charge is that Daniel was written after the events.",
      IMG + "glossary-preterism.png"),
    entry("futurism", "Futurism", ["futurist"], "word",
      "The claim that most of the hard numbers in Daniel jump to a future Antichrist after a long gap.",
      "Older readers already expected a future individual antichrist. Francisco Ribera’s 1590 commentary made a systematic gap-week reading. Protestant pulpits later took it up through Maitland (1826), then Irving, Darby, and the Scofield Bible.",
      IMG + "glossary-futurism.png"),
    entry("dispensationalism", "Dispensationalism", ["dispensational"], "word",
      "History: A 19th-century Protestant system that splits history into ages and usually keeps a gap of centuries before a future three and a half years (PFF2 488).",
      "In 1826 Maitland published a seventy-two-page pamphlet on the period of 1260 Years (Prophetic Faith of Our Fathers, vol. 3). Irving and others who were proclaiming an interpretation of prophecy based on the year-day principle (Prophetic Faith of Our Fathers, vol. 3). It is not in Daniel’s wording. Gabriel never writes a two-thousand-year gap into the seventy weeks.",
      IMG + "glossary-dispensationalism.png"),
    entry("year-day", "Year-Day Principle", ["year-day", "year-day principle", "Year-Day", "prophetic day"], "word",
      "When God gives a numbered sign, one prophetic day may stand for one literal solar year.",
      "God states the scale twice: Numbers 14:34 (forty spy-days become forty wilderness years) and Ezekiel 4:6 (Ezekiel’s body-days appointed “each day for a year”). Daniel’s own 70 weeks cannot be 490 ordinary days and still hold a rebuilt city and the cross. That is the book checking its own measuring rod. 2 Peter 3:8 is about God’s patience, not this scale.",
      IMG + "glossary-year-day.png"),
    entry("apocalyptic", "apocalyptic", ["Apocalyptic"], "word",
      "A style of vision that uses symbols (beasts, horns, metals) for real kingdoms and spans of history.",
      "Daniel 7–8 is apocalyptic: a lion stands for a kingdom, not a literal beast. Time inside that same symbolic vision is not automatically a wall-clock day. Narrative chapters (1, 3–6) are different: a “day” or “time” there can be an ordinary human day or year, as in Nebuchadnezzar’s seven times.",
      IMG + "glossary-apocalyptic.png"),
    entry("colossus", "colossus", ["Colossus", "metallic colossus"], "word",
      "The huge multi-metal statue of Daniel 2 — gold head to iron-and-clay feet.",
      "Daniel 2:38 names the king: \"Thou art this head of gold.\" The historicist reading identifies that head as Babylon. Later metals are identified by succession and by later chapters that name Medo-Persia and Greece. The stone does not mend the statue. It strikes the feet and fills the earth.",
      IMG + "glossary-colossus.png"),
    entry("little-horn", "little horn", ["Little Horn", "eleventh horn"], "word",
      "A smaller horn that rises among ten kings, diverse from them, and attacks God’s people and sanctuary.",
      "Daniel 7’s horn rises from the fourth beast (Rome) after A.D. 476, uproots three, speaks against the Most High, and reigns “a time, times, and the dividing of time.” That is the papal church-state. Daniel 8’s horn grows from the Greek settlement toward the pleasant land and attacks the tamid: pagan then papal Rome in succession. Antiochus IV is too early and too short for chapter 7.",
      IMG + "glossary-little-horn.png"),
    entry("church-state", "church-state", ["church-state power"], "word",
      "A power that is both a church (it claims to speak for God) and a state (it can punish with civil force).",
      "Daniel 7:24 says the horn shall be “diverse from the first” of the ten kings. Newton read that diversity as religious-plus-political authority seated in Rome, not a merely pagan king (Isaac Newton, Observations (1733), Part I, chap. VII).",
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
      "Chathak in Daniel 9:24 is a word occurring only here in the Bible (SDA Bible Commentary, Daniel 9:24). That is why the sitting slows down there: there is no second biblical occurrence (SDA Bible Commentary, Daniel 9:24). You weigh its root meaning (“cut”) and the vision Gabriel said he came to explain.",
      IMG + "glossary-hapax.png"),
    entry("arian", "Arian", ["Arian kingdoms"], "word",
      "History: The Heruli, Vandals, and Ostrogoths were Arian powers, Christian kingdoms that denied the Roman church’s teaching that Christ is fully God, not the whole definition of Arian theology (SDA Bible Commentary, Daniel 7:8).",
      "The Heruli, Vandals, and Ostrogoths were Arian Germanic powers in the west (SDA Bible Commentary, Daniel 7:8). Historicists read them as the three horns that stood in the way: the Heruli fell in 493, the Vandals in 534, and the Ostrogoths withdrew from Rome in 538 and were not fully defeated until about 553.",
      IMG + "glossary-arian.png"),
    entry("diadochi", "Diadochi", [], "word",
      "Four kingdoms shall stand up out of the nation (Daniel 8:22). History: Alexander’s generals who carved his empire into four after he died (SDA Bible Commentary, Daniel 8).",
      "Cassander, Lysimachus, Seleucus, and Ptolemy (SDA Bible Commentary, Daniel 8). They are the goat’s four horns in Daniel 8 and the four heads of the leopard in Daniel 7. From one of the four winds, a compass point, not one of the four generals, the little horn of chapter 8 grows (SDA Bible Commentary, Daniel 8:9).",
      IMG + "glossary-diadochi.png"),
    entry("satrap", "satrap", ["satraps"], "word",
      "The KJV calls them the presidents of the kingdom, the governors, and the princes (Daniel 6:7).",
      "In Daniel 6 the satraps cannot find fault in Daniel, so they write a law against prayer. The trap is legal, not criminal.",
      IMG + "glossary-satrap.png"),
    entry("millerite", "Millerite", ["Millerites", "Millerite movement"], "word",
      "History: Americans in the 1830s–1840s who preached, from William Miller’s reading of Daniel, that the 2,300 days were about to end (William Miller, Apology and Defence).",
      "The center was the Northeast: Low Hampton (William Miller, Apology and Defence). They expected Christ to come to this earth, Miller’s hope, not Daniel 8:14’s wording. 22 October 1844 (Uriah Smith, Daniel and the Revelation (1897)) brought that disappointment. This study keeps their year-day arithmetic and reads the sanctuary as heaven, not the earth.",
      IMG + "glossary-millerite.png"),
    entry("miller", "William Miller", ["Miller"], "person",
      "History: Low Hampton, New York; a call to preach in the summer of 1833 that Daniel’s 2,300 days would end “about the year 1843” (William Miller, Apology and Defence).",
      "In 1813 he received a Captain’s commission in the U. S. service (William Miller, Apology and Defence). The Advent of Christ in A. D. 1843-4 (William Miller, Apology and Defence). He treated the metals as one chain and the earth as the sanctuary to be cleansed by fire. He met an October 22 movement already under way (William Miller, Apology and Defence).",
      IMG + "glossary-miller.png"),
    entry("great-disappointment", "Great Disappointment", ["disappointment of 1844"], "word",
      "History: 22 October 1844, the calculated end of the 2,300 years: Christ did not appear (Uriah Smith, Daniel and the Revelation (1897)). The date the arithmetic named stayed; the event they expected did not.",
      "There was no making of ascension robes (Ellen G. White, The Great Controversy). Their white robes were purity of soul (Ellen G. White, The Great Controversy). The next morning’s cornfield claim (Hiram Edson, Port Gibson) is that the sanctuary of 8:14 is in heaven. Check it as their account, then test it in Hebrews 8–9.",
      IMG + "glossary-great-disappointment.png"),
    entry("seventh-month", "seventh-month cry", ["true midnight cry", "seventh month message"], "word",
      "The 2,300 days would end on the Day of Atonement, 22 October (Uriah Smith, Daniel and the Revelation (1897)).",
      "Leviticus 16 puts cleansing on the tenth day of the seventh month. Snow used the Karaite visible-moon calendar.",
      IMG + "glossary-seventh-month.png"),
    entry("karaite", "Karaite", ["Karaite calendar", "Karaite reckoning"], "word",
      "History: A Jewish calendar practice that sets months by the visible new moon, not only by later calculated tables.",
      "Leviticus 16 puts sanctuary cleansing on the tenth day of the seventh month (Day of Atonement). In 1844 that day fell on 22 October (Uriah Smith, Daniel and the Revelation (1897)), by Karaite reckoning, when Christ entered the Most Holy Place.",
      IMG + "glossary-karaite.png"),
    entry("most-holy", "Most Holy Place", ["Most Holy", "Holy of Holies"], "word",
      "The inner room of the sanctuary, entered only on the Day of Atonement with blood.",
      "Leviticus 16 describes that one-day entry with blood. This course reads Daniel 8:14’s putting-right (nitsdaq) as that day’s heavenly counterpart — judgment and vindication — not a local scrubbing of the earthly temple in Judea.",
      IMG + "glossary-most-holy.png"),
    entry("atonement", "Day of Atonement", ["atonement"], "word",
      "Israel’s yearly day when the high priest entered the Most Holy Place to cleanse the sanctuary from the year’s sins.",
      "Leviticus 16 is the Old Testament picture behind “then shall the sanctuary be cleansed” (Daniel 8:14; SDA Bible Commentary, Daniel 8:14). Millerite reckoning tied 22 October 1844 to that calendar day; this course reads the fulfillment as Christ’s entry into the heavenly Most Holy Place, not an earthly temple event.",
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
      "History: Rome’s 16th–17th century answer to the Protestant Reformation, including new readings of prophecy (PFF2 489).",
      "PFF2 places Ribera and Alcázar in the Counter-Reformation. Jesuit scholars then published methods (Ribera’s futurism, Alcázar’s preterism) whose dated effect is that the medieval papacy falls off the chain (PFF2 488).",
      IMG + "glossary-counter-reformation.png"),
    entry("trent", "Council of Trent", ["Trent"], "word",
      "History: A long Catholic council (1545–1563) that answered the Reformation.",
      "Ribera (1590) and Alcázar (1614) published readings that take the medieval church off the prophetic chain.",
      IMG + "glossary-trent.png"),
    entry("jesuit", "Jesuit", ["Jesuits", "Society of Jesus"], "word",
      "History: Members of the Society of Jesus, a Catholic order founded in 1540 to teach, missionize, and defend the Roman church.",
      "Alcázar and Ribera, both Jesuits, published the two rejected readings: preterism and futurism.",
      IMG + "glossary-jesuit.png"),
    entry("zeroim", "zeroim", [], "word",
      "The KJV says “pulse,” the food of Daniel’s ten-day test (Daniel 1:12).",
      "Daniel 1:12. Echoes Genesis 1:29. The point is not a modern health regimen. The likeliest reason for the defilement is that the food had passed through the worship of the empire’s gods and may have broken the Torah’s food laws (Leviticus 11); Daniel 1 states neither. The commentary also lists unclean meat and improper slaughter, and it cites Acts 15:29 for the pagan sacrifice (SDA Bible Commentary, Daniel 1:8). Xenophon, Cyropaedia 7.1.1, “first offered to the gods a part and then began his breakfast,” is a Persian analogy, not a Babylonian court proof. Daniel 1 shows a food refusal, and 1:4 and 1:7 show language and new names. A portion of the animals eaten was first offered as a sacrifice to pagan gods (Daniel 1:8; SDA Bible Commentary, Daniel 1:8).",
      IMG + "glossary-zeroim.png"),
    entry("cubit", "cubit", ["cubits"], "word",
      "An ancient length: roughly from elbow to fingertip, about 18 inches / 45 cm.",
      "The Dura image is 60 cubits by 6 cubits (Daniel 3:1). This sitting notes the all-gold design as a public denial of the multi-metal dream, not as a curiosity of measurement, and not as a cipher for 666.",
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
      "In historicist reading: the church-state power that takes Christ’s place (anti = in place of; the Greek word is also against) among Rome’s fragments (SDA Bible Commentary, Daniel 7:8).",
      "1 John already speaks of “many antichrists.” The Reformers applied the office of a persecuting papal supremacy to Daniel 7 and Revelation 13/17 (Prophetic Faith of Our Fathers, vol. 2 (PFF2 489)). The futurist reading moved the word to one end-time individual (PFF2 487), not as a change inside 1 John.",
      IMG + "glossary-antichrist.png"),
    entry("papacy", "papacy", ["papal", "pope"], "word",
      "The office of the bishop of Rome as a spiritual and, for long centuries, civil power.",
      "This study applies Daniel 7’s little-horn interpretation to that historical office and its church-state role, not to Roman Catholics as a people. Many Catholics sincerely follow Christ; this interpretation gives no warrant for prejudice or hostility toward them. The measured span this sitting uses is A.D. 538 to 1798.",
      IMG + "glossary-papacy.png"),
    entry("mene", "MENE, TEKEL, UPHARSIN", ["MENE", "TEKEL", "UPHARSIN", "PERES"], "word",
      "Aramaic words on the plaster: numbered, weighed, divided (Daniel 5:26–28; ABSG 2020 Q1, lesson 6).",
      "In Daniel 5 the hand writes MENE, MENE, TEKEL, UPHARSIN: God has numbered Belshazzar’s kingdom and finished it; the king is too light on the scales; the realm is divided between Medes and Persians. Daniel treats it as a royal audit, not a ghost story.",
      IMG + "glossary-mene.png"),
    entry("probation", "probation", ["close of probation"], "word",
      "The time during which a person or a kingdom may still turn. Daniel 4 gives twelve months of patience before the king’s sentence falls.",
      "When Michael stands up (Daniel 12:1), that time of turning ends — on the Adventist reading, the close of human probation — and a time of trouble follows for those written in the book.",
      IMG + "glossary-probation.png"),
    entry("exile", "exile", ["Babylonian exile", "Babylonian captivity"], "word",
      "The forced displacement of Judah to Babylon under God's judicial sentence across three deportations: 605, 597, and 586 B.C.",
      "Exile was not a chosen journey or a mere accident of war. Daniel 1:2 declares that the Lord handed Jehoiakim over to Nebuchadnezzar. Daniel and the first temple vessels leave in the 605 B.C. levy under Jehoiakim; Ezekiel and ten thousand more go in the 597 B.C. levy under Jehoiachin; the city and Solomon’s temple fall in the 586 B.C. levy under Zedekiah (2 Kings 24–25).",
      IMG + "glossary-exile.png"),
    entry("typology", "typology", ["type", "antitype", "antitypical", "type-pattern", "prophetic pattern"], "word",
      "An earlier God-designed picture (type) that a later reality (antitype) fills full.",
      "On this course’s analogy, Dura is the type of forced worship; Revelation 13 is its global antitype. The earthly Day of Atonement is the type; Daniel 8:14 is the antitype in heaven. It is a pattern Scripture itself repeats.",
      IMG + "glossary-typology.png"),
    entry("sanctuary", "sanctuary", [], "word",
      "God’s dwelling for priestly ministry — first the tent/temple on earth, then the true one in heaven (Hebrews 8–9).",
      "Daniel 8 is not only about a local altar in Judea. The horn magnifies itself to the Prince of the host and casts down the place of His sanctuary. The numbered span tells when that ministry is put right.",
      IMG + "glossary-sanctuary.png"),
    entry("evening-morning", "evening and morning", ["evenings and mornings", "evening-morning"], "word",
      "Genesis 1’s name for a full day-unit. KJV 8:14 says days. The vision of the evening and the morning is at 8:26 (ABSG 2020 Q1, lesson 1).",
      "Not half-sacrifices added together. Once Daniel 9 proves the numbered day runs as a year, these 2,300 units are 2,300 years, cut by seventy weeks from the same start.",
      IMG + "glossary-evening-morning.png"),
    entry("heruli", "Heruli", [], "word",
      "A Germanic kingdom in Italy, crushed in A.D. 493 — first of the three horns uprooted.",
      "Arian. Their fall cleared space for a church-state in the west. The three horns are the Heruli (493), the Vandals (534), and the Ostrogoths, who withdrew from Rome in 538 and were not fully defeated until about 553.",
      IMG + "glossary-heruli.png"),
    entry("vandals", "Vandals", [], "word",
      "History: A Germanic kingdom in North Africa, broken in A.D. 534 (SDA Bible Commentary, Daniel 7).",
      "Arian sea-power. Justinian’s general Belisarius ended their kingdom (SDA Bible Commentary, Daniel 7). Again: dated history, then the Daniel 7 checklist.",
      IMG + "glossary-vandals.png"),
    entry("ostrogoths", "Ostrogoths", ["Ostrogothic"], "word",
      "The Germanic kingdom whose siege of Rome was lifted in A.D. 538.",
      "Arian. In 538 Belisarius lifted their siege of Rome, and this chart starts the 1,260 years there. They retook the city in the 540s and were not fully defeated until about 553. That lifting is not the uprooting. If 538 moves, 1798 moves on the same 1,260-year stick.",
      IMG + "glossary-ostrogoths.png"),

    entry("daniel", "Daniel", [], "person",
      "A Judahite noble taken to Babylon in 605 B.C.; prophet, court official, and the book’s human author-witness.",
      "His Hebrew name means “God is my Judge.” The court renamed him Belteshazzar. He drew the line at the king’s table (he would not defile himself), served under Babylon and Persia, and received the metal, beast, and numbered-day visions. The book closes with a personal promise: he will rest and rise to his inheritance.",
      IMG + "glossary-daniel.png"),
    entry("nebuchadnezzar", "Nebuchadnezzar", ["Nebuchadrezzar"], "person",
      "History: Neo-Babylonian king (c. 605–562 B.C.) (SDA Bible Commentary, Daniel 2), the head of gold (Daniel 2:38), who took Judah’s first captives and later burned Jerusalem (586).",
      "He dreamed of the statue, built the all-gold image on the plain of Dura, and was driven into the field for seven times (literal years) until he lifted his eyes to heaven. Daniel 2:37–38 says the God of heaven gave him the kingdom.",
      IMG + "glossary-nebuchadnezzar.png"),
    entry("jehoiakim", "Jehoiakim", [], "person",
      "King of Judah when Daniel opens: Daniel 1:1–2 dates Nebuchadnezzar’s first siege to Jehoiakim’s third year (605 B.C.), when vessels and noble youths were taken.",
      "Son of Josiah (2 Kings 23:36–24:6). The battle of Carchemish in 605 (Jeremiah 46:2; SDA Bible Commentary, Daniel 1). In 605 the Lord gave him into Nebuchadnezzar’s hand (Daniel 1:2): tribute, temple vessels, and deportees, including Daniel. He kept the throne until he “slept with his fathers” and Jehoiachin succeeded him (2 Kings 24:6). He is not Jehoiachin (597 second levy) and not Zedekiah (586 destruction).",
      IMG + "glossary-jehoiakim.png"),
    entry("jehoiachin", "Jehoiachin", [], "person",
      "History: King of Judah who reigned in Jerusalem three months (2 Kings 24:8), in February/March 597 (Livius, ABC 5), when Babylon deposed him and took a second wave of captives.",
      "Called Jehoiachin in 2 Kings 24:8–16; also Jeconiah (1 Chronicles 3:16; Jeremiah 24:1) and Coniah (Jeremiah 22:24). He reigned after his father Jehoiakim; this is the second deportation, not Daniel’s 605 opening (Daniel 1:1). Babylonian Chronicle BM 21946 (Livius, ABC 5) records Nebuchadnezzar at “the city of Judah” in his seventh year—keep that year separate from Jehoiakim’s third year in Daniel 1:1.",
      IMG + "glossary-jehoiachin.png"),
    entry("zedekiah", "Zedekiah", [], "person",
      "History: Last king of Judah before 586 B.C.; Babylon installed him after Jehoiachin was taken (2 Kings 24:17; SDA Bible Commentary, Daniel 1); his revolt brought the final siege and temple burning (2 Kings 25:9).",
      "Mattaniah, renamed Zedekiah by Nebuchadnezzar (2 Kings 24:17–20). His rebellion triggered the third campaign: walls broken, Solomon’s temple burned, survivors deported (2 Kings 25; Jeremiah 52). He is not the king of Daniel 1:1 (Jehoiakim, 605) or the king taken in 597 (Jehoiachin).",
      ""),
    entry("three-hebrews", "Shadrach, Meshach, and Abednego", ["Hananiah", "Mishael", "Azariah", "three Hebrews"], "person",
      "Daniel’s three companions. Hebrew names praise Yahweh; Babylonian names praise other gods.",
      "Hananiah, Mishael, and Azariah refused the Dura bow (Daniel 3) after already refusing the royal table (Daniel 1). The furnace is the public form of the same line Daniel drew in private.",
      IMG + "glossary-three-hebrews.png"),
    entry("belshazzar", "Belshazzar", [], "person",
      "History: Last king in the city of Babylon (539 B.C.), distinct from Nabonidus as last king of the empire; first-born son of Nabonidus, entrusted the kingship to him (SDA Bible Commentary, Daniel 5:1).",
      "Greek lists once seemed to omit him (SDA Bible Commentary, Daniel 5). Tablets restored him: Nabonidus in Tema. He drank from Yahweh’s vessels and was killed the night the city fell. “Grandson” of Nebuchadnezzar in this sitting is dynastic language: it seems, and the verse’s word is “father” (Daniel 5:2, 22; SDA Bible Commentary, Daniel 5).",
      IMG + "glossary-belshazzar.png"),
    entry("nabonidus", "Nabonidus", [], "person",
      "History: Last official king of Babylon; often away in Arabia (Livius, ABC 7).",
      "The Nabonidus Chronicle: the king was in Tayma while the prince was in Akkad (Livius, ABC 7). His absence is why “third ruler” in 5:16 is a precise offer.",
      IMG + "glossary-nabonidus.png"),
    entry("cyrus", "Cyrus", ["Cyrus the Great"], "person",
      "History: Persian king who later permitted the Jews to return (Ezra 1). The night of Babylon’s fall, in 539 B.C. (SDA Bible Commentary, Daniel introduction). Daniel 5:31 names Darius the Mede as the one who took the kingdom.",
      "Isaiah 45:1 names him and speaks of open gates. The Cyrus Cylinder (Livius): “I gathered all their inhabitants and returned to them their dwellings”. It does not say exiles, and it does not name the Jews. Ezra 1 does that. He is the silver kingdom’s founder, not the bronze.",
      IMG + "glossary-cyrus.png"),
    entry("darius-mede", "Darius the Mede", [], "person",
      "The ruler who “took the kingdom” at Babylon’s fall in Daniel 5:31–6:1, about sixty-two years old.",
      "Still an obscure figure as far as secular history (SDA Bible Commentary, Daniel 5:31). Proposals: a governor (Ugbaru/Gubaru) with a throne-name; a short-reigning Median colleague of Cyrus; or Cyrus under a Median title. The Commentary discusses Ugbaru and Gubaru and still calls Darius obscure; it does not, on the pages opened, endorse all three as equal (SDA Bible Commentary, on the fall). The chapter’s load-bearing test is the unchangeable law against prayer, not a modern personal identification.",
      IMG + "glossary-darius-mede.png"),
    entry("artaxerxes", "Artaxerxes", ["Artaxerxes I"], "person",
      "Persian great king. His seventh year (457 B.C.) is the decree this study uses to start the 70 weeks (Ezra 7).",
      "Ezra goes up with authority to appoint magistrates and judges — civil restoration, not only temple stones. His twentieth year (444 B.C.) sends Nehemiah to repair walls. 457 + 483 years (no year 0) = A.D. 27.",
      IMG + "glossary-artaxerxes.png"),
    entry("alexander", "Alexander", ["Alexander the Great"], "person",
      "History: Macedonian king who smashed Persia (Gaugamela 331 B.C.) and died in 323 B.C. at thirty-two.",
      "Daniel 8:5, 8, 21–22: the goat’s notable horn. When it is broken, four notable horns come up in its place. His kingdom is the bronze Greece and he is its first king (Daniel 8:21), not the little horn of chapter 7, a later power (ABSG 2020 Q1, lesson 1).",
      IMG + "glossary-alexander.png"),
    entry("antiochus", "Antiochus IV Epiphanes", ["Antiochus", "Antiochus IV"], "person",
      "History: Seleucid king (175–164 B.C.) who profaned the Jerusalem temple altar; a real tyrant, and far too small for Daniel 7–8’s full scope, the SDA reading (ABSG 2020 Q1, lesson 9).",
      "Gabriel places Daniel 8’s vision at “the time of the end” (8:17, 19), which an ancient Syrian king dying in 164 B.C. cannot reach. He was merely one king in the Greek division (third kingdom), not the exceeding great power that follows Greece and challenges the Prince of the host. Porphyry and later preterists forced the whole prophecy onto him to deny real prediction. This study does not make him the final horn (SDA Bible Commentary, Daniel 8:9).",
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
      "“The great prince who stands for Daniel’s people” (12:1). Michael is Christ.",
      "He helps against the prince of Persia (10:13, 21). Jude 9 and Revelation 12 show him in conflict with the dragon. “Stand up” in 12:1 is Daniel’s verb for kings assuming power (11:2–4) (ABSG 2020 Q1, lesson 13): Christ’s kingly stance for His people, when, on the Adventist reading, human probation closes.",
      IMG + "glossary-michael.png"),
    entry("justinian", "Justinian", [], "person",
      "History: Eastern Roman emperor (527–565) whose laws elevated the bishop of Rome and whose wars broke Arian kingdoms in the west (SDA Bible Commentary, Daniel 7).",
      "Justinian’s decree is the legal claim that met the city in 538, when Belisarius lifted the Ostrogothic siege of Rome and the 1,260 years begin on this chart. He is not named in Daniel.",
      IMG + "glossary-justinian.png"),
    entry("berthier", "Berthier", ["Louis-Alexandre Berthier"], "person",
      "History: French Revolutionary general who entered Rome in 1798 and took Pope Pius VI prisoner (Uriah Smith, Daniel and the Revelation (1897)).",
      "That blow ends the 1,260 years of papal political supremacy in 1798. The office continued; the measured reign as a civil prince in that form did not.",
      IMG + "glossary-berthier.png"),
    entry("pius-vi", "Pius VI", [], "person",
      "History: Pope taken captive in 1798 when Berthier entered Rome; he died at Valence, France, 29 Aug., 1799 (Catholic Encyclopedia (1913), Pius VI).",
      "The event, not the man’s private character, is why the year appears on the chart. Historicists read it as Daniel 7:26 beginning to consume the horn’s dominion.",
      IMG + "glossary-pius-vi.png"),
    entry("clovis", "Clovis", [], "person",
      "History: With the conversion of Clovis (496), king of the Franks, the papacy found a strong army (SDA Bible Commentary, on 508).",
      "The conversion of Clovis (496), not the same pin as 508 (SDA Bible Commentary). A.D. 508 is this chart’s reconstructed civil start for the 1,290 and 1,335 days of Daniel 12:11–12 (year-day scale), landing 1798 and 1843; if the start moves, those landings move. The 1844 date is the 2,300-year landing from the 457 B.C. decree taught in Sitting 9. It is separate from the 508 Clovis pin, not from Sitting 9.",
      IMG + "glossary-clovis.png"),
    entry("luther", "Martin Luther", ["Luther"], "person",
      "History: German Reformer (1483–1546). Smalcald Articles call the pope the Antichrist from 2 Thessalonians 2:4 (Smalcald Articles II.iv).",
      "Prefaces to Daniel (1530). He read the empires as one chain.",
      IMG + "glossary-luther.png"),
    entry("calvin", "John Calvin", ["Calvin"], "person",
      "History: French-Genevan Reformer (1509–1564); wrote commentaries on Daniel that read the four empires as real kingdoms.",
      "He kept the four kingdoms as real empires. Cited on sheet 0 as a Reformation voice on the empires.",
      IMG + "glossary-calvin.png"),
    entry("newton-isaac", "Isaac Newton", ["Newton", "Sir Isaac Newton"], "person",
      "Natural philosopher (1643–1727) who also wrote Observations upon the Prophecies of Daniel (1733).",
      "He called Daniel “most distinct in order of time.” This study quotes that line because it states Historicism in one sentence: the book is a dated sequence, not a riddle left in the past or the far future.",
      IMG + "glossary-newton.png"),
    entry("wycliffe", "John Wycliffe", ["Wycliffe"], "person",
      "English Reformer (d. 1384) who already read the papal office into apocalyptic warning.",
      "Named on sheet 0 as an early witness. He translated Scripture into English and attacked indulgences and papal claims.",
      IMG + "glossary-wycliffe.png"),
    entry("alcazar", "Luis de Alcázar", ["Alcázar", "Alcazar"], "person",
      "History: Spanish Jesuit; his 1614 commentary became the template for preterism (Preterist Archives, Vestigatio page).",
      "Vestigatio Arcani Sensus in Apocalypsi. The book limits the Apocalypse to Constantine’s overthrow of paganism. It does not place Daniel under Antiochus or Revelation in A.D. 70.",
      IMG + "glossary-alcazar.png"),
    entry("ribera", "Francisco Ribera", ["Ribera"], "person",
      "History: Spanish Jesuit; about 1590 his commentary on the Apocalypse became the template for futurism (PFF2 489).",
      "His 1590 commentary placed Antichrist as one future man for 3½ literal years (PFF2 487). That systematic gap later entered Protestant Bibles through Maitland, Darby, and Scofield.",
      IMG + "glossary-ribera.png"),
    entry("darby", "John Nelson Darby", ["Darby"], "person",
      "History: Plymouth Brethren teacher (1800–1882) who popularized the gap-week reading in Protestant dispensationalism.",
      "Albury / Powerscourt circles and a system of ages. Daniel never prints the gap. This sitting names Darby so you can see the 19th-century shift instead of assuming “the church has always read it this way.”",
      IMG + "glossary-darby.png"),
    entry("irving", "Edward Irving", ["Irving"], "person",
      "History: Scottish preacher.",
      "Named so sheet 0 shows named teachers, not an anonymous haze.",
      IMG + "glossary-irving.png"),
    entry("scofield", "C. I. Scofield", ["Scofield", "Scofield Reference Bible"], "person",
      "History: American minister and editor whose annotated 1909 Scofield Reference Bible popularized dispensational futurism.",
      "His explanatory study notes placed Ribera’s and Darby’s severed 70th week and secret pretribulation rapture directly beside the biblical text, canonizing the 2,000-year parenthetical prophetic gap in popular imagination.",
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
      "History: Daniel’s first workplace and the city that fell in 539 B.C. (SDA Bible Commentary, Daniel introduction). The verse names the king as the head of gold, not the word Babylon.",
      "Daniel 1:2 says its first victory over Judah was given, not seized independently. Chapter 5 is the night the gold ended.",
      IMG + "glossary-babylon.png"),
    entry("jerusalem", "Jerusalem", ["Glorious Land", "Zion"], "place",
      "Judah’s capital; Temple city; the place Daniel faced when he prayed (6:10).",
      "First vessels leave in 605 (SDA Bible Commentary, Daniel 1); city and Temple fall in 586; return decrees under Persia. In Daniel 8:9 “the pleasant land” is Judah (compare “the glorious land” in Daniel 11:16, 41). The sanctuary put right in 8:14 is not this hill being locally restored in 164 B.C.",
      IMG + "glossary-jerusalem.png"),
    entry("dura", "Plain of Dura", ["Dura"], "place",
      "The level ground near Babylon where Nebuchadnezzar raised an all-gold image (Daniel 3).",
      "Sixty cubits by six, gold with no silver or iron (Daniel 3:1) — on this course’s reading, a public “no” to the dream of chapter 2. The furnace stands there as the civic test of the refusal to worship the image (Daniel 3:18).",
      IMG + "glossary-dura.png"),
    entry("ulai", "Ulai", [], "place",
      "A river by Susa (Shushan) where Daniel saw the ram and goat (Daniel 8:2).",
      "The vision that names Medo-Persia and Greece, then asks how long the sanctuary-attack lasts: 2,300 evenings-mornings.",
      IMG + "glossary-ulai.png"),
    entry("hiddekel", "Hiddekel", ["Tigris"], "place",
      "The great river, which is Hiddekel, where Daniel saw a certain man clothed in linen (Daniel 10).",
      "Hebrew Hiddekel. The last sitting opens here in the third year of Cyrus king of Persia with mourning three full weeks and the long explanation of chapters 10–12.",
      IMG + "glossary-hiddekel.png"),
    entry("rome", "Rome", ["Roman see"], "place",
      "Capital of the iron kingdom; later seat of the church-state this study reads as the little horn.",
      "Imperial Rome crushes (Daniel 2:40; 7:7). After 476 the west is fragments (SDA Bible Commentary, Daniel 7). 538 (the Ostrogoths abandoning the siege) and 1798 both fall on this city: the start and the wound of the 1,260 years.",
      IMG + "glossary-rome.png"),
    entry("pella", "Pella", [], "place",
      "Pella was the royal capital of ancient Macedon, the kingdom Alexander the Great inherited from his father. Daniel never names it; Daniel 8:21 names the power, Greece.",
      "On maps of the Greek world, Pella marks the Macedonian heartland. The prophecy names the power, not the city: “the rough goat is the king of Grecia” (Daniel 8:21).",
      IMG + "glossary-pella.png"),
    entry("persepolis", "Persepolis", [], "place",
      "Ceremonial capital of Persia; a map pin for the silver/ram.",
      "Burned in Alexander’s campaign. Daniel 8:20 names the ram: Media and Persia. The ruins help the eye; the verse names the kingdom.",
      IMG + "glossary-persepolis.png"),
    entry("susa", "Susa", ["Shushan"], "place",
      "Daniel is “at Shushan in the palace, which is in the province of Elam” under Belshazzar (Daniel 8:1–2).",
      "Later Esther’s stage. The Ulai runs there. The vision is not a Greek pamphlet written in Judea after the fact — the book places the seer in Persia.",
      IMG + "glossary-susa.png"),
    entry("carchemish", "Carchemish", [], "place",
      "History: By the river Euphrates in Carchemish, where Nebuchadnezzar beat Egypt in 605 B.C. (Jeremiah 46:2; SDA Bible Commentary, Daniel 1).",
      "Jeremiah 46:2 dates Nebuchadnezzar’s defeat of Pharaoh Necho at Carchemish to Jehoiakim’s fourth year—the same campaign window as Daniel 1:1’s third year of Jehoiakim (605 B.C., accession-year difference). That battle year supports a real first deportation under Jehoiakim, distinct from 597 (Jehoiachin) and 586 (Zedekiah).",
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

  function showPopover(anchor) {
    var id = anchor.getAttribute("data-term");
    var item = byId(id);
    if (!item) return;
    if (window.StudyCompetency) {
      window.StudyCompetency.recordScriptureLookup("Glossary: " + item.term);
    }
    window.TermOverlay.open({ type: "glossary", item: item }, anchor);
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

  (function applyGlossaryEnrichment() {
    var patch = window.GLOSSARY_ENRICHMENT || {};
    (window.SHEET_GLOSSARY || []).forEach(function (e) {
      var p = patch[e.id];
      if (!p) return;
      if (p.simple) e.simple = p.simple;
      if (p.history) e.history = p.history;
      if (p.proof && p.proof.length) e.proof = p.proof;
    });
  })();

  window.GlossaryIndex = {
    byId: byId,
    linkArticle: linkArticle,
    showPopover: showPopover,
    renderIndex: renderIndex,
    openIndex: openIndex
  };
})();
