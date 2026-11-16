import * as THREE from 'three';

// --- ASSET REGISTRY ---
export const ASSET_REGISTRY = {
  assembled: {
    id: 'assembled',
    eyebrow: 'PROPHETIC SUCCESSION OF EMPIRES',
    title: 'Complete Daniel 2 Colossus',
    pill: 'DANIEL 2:31-45',
    dates: '605 BC to the Second Coming',
    quote: '“Thou, O king, sawest, and behold a great image. This great image, whose brightness was excellent, stood before thee; and the form thereof was terrible.”',
    quoteRef: 'Daniel 2:31 (KJV)',
    explanation: 'The complete prophetic colossus revealed to King Nebuchadnezzar encompasses the entire timeline of gentile world dominion from the golden head of Babylon down through the divided feet of iron and clay. Each distinct metal depicts a successive world empire that ruled the ancient biblical landscape. Together, they outline the unbroken march of human kingdoms until the arrival of the eternal kingdom of God.',
    historical: 'Daniel interpreted the dream before the royal court of Babylon after all the empire’s Chaldean wise men failed to recall or explain it. He announced that a divine stone cut without hands would strike the image at its feet of iron and clay, shattering every earthly kingdom into dust. This divine kingdom would then expand into a mountain that fills the whole earth forever.',
    plateImg: 'assets/site/hero-colossus.jpg',
    plateCaption: 'The complete colossus of Daniel 2',
    thumb: 'assets/site/era-assembled.webp',
    related: ['head', 'chest', 'feet', 'stone'],
    takeaway: 'The panoramic statue foretells human history from ancient Babylon to the end of time, showing that every earthly empire will finally give way to God’s everlasting kingdom.',
    filename: 'full_body.glb',
    camPos: [0.35, 1.45, 10.6],
    lookAt: [0, 1.05, 0],
    haloY: 2.8,
    haloScale: 1.2
  },
  head: {
    id: 'head',
    eyebrow: 'NEBUCHADNEZZAR’S',
    title: 'Golden Head',
    pill: 'DANIEL 2:32, 38',
    dates: '605–539 BC',
    quote: '“Thou art this head of gold.”',
    quoteRef: 'Daniel 2:38 (KJV)',
    explanation: 'The golden head represents the Babylonian Empire, the first in a series of world empires foretold by God. Babylon was known for its wealth, wisdom, and splendor, which is why gold is used to depict its rule.',
    historical: 'Under Nebuchadnezzar II, Babylon became the greatest city of its time. He expanded his empire, rebuilt the city with magnificent structures, and made Babylon the center of world power.',
    plateImg: 'assets/plates/babylon.jpg',
    plateCaption: 'The Ishtar Gate & Processional Way · Babylon',
    thumb: 'assets/site/era-head.webp',
    related: ['chest', 'lion', 'dura', 'stump'],
    takeaway: 'The head of fine gold represents the wealth and majesty of the Babylonian Empire under King Nebuchadnezzar, which ruled from 605 to 539 BC.',
    filename: 'golden_head.glb',
    scale: 1.0,
    position: [0, 0.95, 0],
    camPos: [0.85, 1.38, 5.85],
    lookAt: [0, 1.18, 0],
    haloY: 1.35,
    haloScale: 1.12
  },
  chest: {
    id: 'chest',
    eyebrow: 'MEDO-PERSIAN EMPIRE',
    title: 'Silver Chest & Arms',
    pill: 'DANIEL 2:32, 39',
    dates: '539–331 BC',
    quote: '“And after thee shall arise another kingdom inferior to thee...”',
    quoteRef: 'Daniel 2:39 (KJV)',
    explanation: 'The breast and dual arms of silver portray the Medo-Persian alliance under Cyrus the Great and Darius. Silver represents both their vast coinage treasury and their second-tier position in imperial splendor.',
    historical: 'Cyrus took Babylon in 539 BC. Herodotus and Xenophon describe a diversion of the Euphrates. The Cyrus Cylinder records a policy of returning displaced peoples; Ezra 1 attributes the Jewish return and Temple rebuilding to the same king.',
    plateImg: 'assets/plates/persia.jpg',
    plateCaption: 'Apadana stairway reliefs · Persepolis',
    thumb: 'assets/site/era-chest.webp',
    related: ['head', 'bear', 'ram', 'decree'],
    takeaway: 'The chest and arms of silver represent the Medo-Persian Empire, whose dual arms depict the alliance of Media and Persia that conquered Babylon in 539 BC.',
    filename: 'silver_chest.glb',
    scale: 1.0,
    position: [0, 0.95, 0],
    camPos: [0, 1.3, 4.6],
    lookAt: [0, 1.1, 0],
    haloY: 1.25,
    haloScale: 0.9
  },
  thighs: {
    id: 'thighs',
    eyebrow: 'GRECIAN EMPIRE',
    title: 'Bronze Belly & Thighs',
    pill: 'DANIEL 2:32, 39',
    dates: '331–168 BC',
    quote: '“And another third kingdom of brass, which shall bear rule over all the earth.”',
    quoteRef: 'Daniel 2:39 (KJV)',
    explanation: 'The belly and thighs of bronze symbolize the swift Greco-Macedonian empire founded by Alexander the Great, which swept across the Near East with bronze armor and phalanx warfare. Bronze reflects both the resonant trade and metalcraft of the Hellenistic world and its military equipment. Although dazzling in cultural influence, Greece occupied a third position in the descending succession of imperial metals.',
    historical: 'Alexander conquered from Greece to India in barely a decade. Upon his death, the empire fragmented into four Hellenistic dynasties, spreading the Greek language that later became the vehicle for the New Testament.',
    plateImg: 'assets/plates/greece.jpg',
    plateCaption: 'Bronze hoplite armor · Hellenistic gallery plate',
    thumb: 'assets/site/era-thighs.webp',
    related: ['chest', 'leopard', 'goat', 'legs'],
    takeaway: 'The bronze belly and thighs represent the Grecian Empire of Alexander the Great, whose rapid conquests united the Mediterranean world under Greek culture and language.',
    filename: 'bronze_thighs.glb',
    scale: 1.0,
    position: [0, 0.95, 0],
    camPos: [0, 1.25, 4.4],
    lookAt: [0, 1.05, 0],
    haloY: 1.1,
    haloScale: 0.85
  },
  legs: {
    id: 'legs',
    eyebrow: 'ROMAN EMPIRE',
    title: 'Legs of Iron',
    pill: 'DANIEL 2:33, 40',
    dates: '168 BC–AD 476',
    quote: '“And the fourth kingdom shall be strong as iron: forasmuch as iron breaketh in pieces and subdueth all things: and as iron that breaketh all these, shall it break in pieces and bruise.”',
    quoteRef: 'Daniel 2:40 (KJV)',
    explanation: 'The dual legs of unyielding iron represent Imperial Rome, which eventually split into Western and Eastern divisions. The Roman Empire was renowned for disciplined legions, iron weapons, and extensive paved roads that connected three continents.',
    historical: 'The Mediterranean world experienced the Roman peace, known as the Pax Romana, during which Jesus Christ was born and crucified. Rome\'s legal order and highway system subsequently enabled the rapid spread of the Christian gospel.',
    plateImg: 'assets/plates/rome.jpg',
    plateCaption: 'Lorica, gladius, and aquila · Imperial Rome',
    thumb: 'assets/site/era-legs.webp',
    related: ['thighs', 'beast', 'feet', 'stone'],
    takeaway: 'The two iron legs represent the unyielding military might of Imperial Rome, which crushed opposing realms and ruled during the earthly life of Jesus Christ.',
    filename: 'iron_legs.glb',
    scale: 1.0,
    position: [0, 0.95, 0],
    camPos: [0, 1.25, 4.4],
    lookAt: [0, 1.0, 0],
    haloY: 1.0,
    haloScale: 0.85
  },
  feet: {
    id: 'feet',
    eyebrow: 'DIVIDED REALMS',
    title: 'Feet of Iron & Clay',
    pill: 'DANIEL 2:33, 41-43',
    dates: 'AD 476 to the Second Coming',
    quote: '“And whereas thou sawest the feet and toes, part of potters’ clay, and part of iron, the kingdom shall be divided; but there shall be in it of the strength of the iron, forasmuch as thou sawest the iron mixed with miry clay.”',
    quoteRef: 'Daniel 2:41 (KJV)',
    explanation: 'The feet and ten toes composed of brittle potter\'s clay mixed with rigid iron represent the fragmented nations of Europe that arose after the fall of Western Rome. These kingdoms remain partly strong and partly fragile, continually forming diplomatic alliances yet never truly bonding into a single lasting empire.',
    historical: 'Centuries of royal marriages, diplomatic treaties, and military campaigns by conquerors such as Charlemagne, Charles V, and Napoleon failed to reunify Europe. This enduring division precisely fulfills Daniel\'s prophecy that these nations will remain divided until the supernatural stone strikes.',
    plateImg: 'assets/plates/divided.jpg',
    plateCaption: 'Iron crown and clay shards · divided realms',
    thumb: 'assets/site/era-feet.webp',
    related: ['legs', 'beast', 'stone', 'assembled'],
    takeaway: 'The feet of iron mixed with clay portray the divided nations of Europe that arose after the collapse of Western Rome, continually forming alliances yet never uniting into a single world empire.',
    filename: 'feet_iron_clay.glb',
    scale: 1.0,
    position: [0, 0.78, 0],
    camPos: [0, 1.05, 4.2],
    lookAt: [0, 0.75, 0],
    haloY: 0.8,
    haloScale: 0.8
  },
  altar: {
    id: 'altar',
    eyebrow: 'SACRED MESOPOTAMIAN DAIS',
    title: 'Ancient Azure Altar',
    pill: 'DANIEL 2:46-47',
    dates: '605–539 BC (Modern Reconstruction)',
    quote: '“The king answered unto Daniel, and said, Of a truth it is, that your God is a God of gods, and a Lord of kings, and a revealer of secrets, seeing thou couldest reveal this secret.”',
    quoteRef: 'Daniel 2:47 (KJV)',
    explanation: 'This architectural display features a reconstructed Mesopotamian glazed-brick dais with ceremonial tier moldings. In ancient Babylon, raised brick platforms were used to elevate royal monuments, sacred altars, and votive statues before the public.',
    historical: 'Vibrant glazed blue brick was the signature decorative medium of Neo-Babylonian monumental architecture, displayed most famously on Babylon\'s Ishtar Gate. This museum dais is a modern reconstruction created for this gallery rather than an excavated artifact from the ancient temple of Esagila.',
    plateImg: 'assets/plates/altar-dais.jpg',
    plateCaption: 'Glazed lapis altar dais · Babylon',
    thumb: 'assets/thumbs/altar.jpg',
    related: ['assembled', 'head', 'dura', 'stone'],
    takeaway: 'This museum dais is a modern reconstruction of a Babylonian glazed-brick platform, illustrating the ceremonial settings where ancient kings bowed when God revealed hidden futures.',
    filename: 'azure_altar.glb',
    scale: 1.4,
    position: [0, -0.60, 0],
    camPos: [0, 0.7, 4.8],
    lookAt: [0, 0.0, 0],
    haloY: 0.2,
    haloScale: 0.8
  },
  stone: {
    id: 'stone',
    eyebrow: 'THE KINGDOM OF GOD',
    title: 'Stone Cut Without Hands',
    pill: 'DANIEL 2:34-35, 44-45',
    dates: 'The Second Coming of Christ',
    quote: '“Thou sawest till that a stone was cut out without hands, which smote the image upon his feet that were of iron and clay, and brake them to pieces.”',
    quoteRef: 'Daniel 2:34 (KJV)',
    explanation: 'The stone cut out without hands represents the eternal kingdom that God Himself establishes at the Second Coming of Jesus Christ. It strikes the prophetic colossus upon its divided feet of iron and clay, demolishing all human kingdoms before expanding into a mountain that fills the entire earth.',
    historical: 'Daniel explained to Nebuchadnezzar that in the days of these divided kingdoms, the God of heaven will set up an everlasting kingdom that will never be destroyed or left to other rulers. This divine realm will completely consume all earthly empires and endure forever.',
    plateImg: 'assets/plates/stone-kingdom.jpg',
    plateCaption: 'A stone cut without hands · Daniel 2:34',
    thumb: 'assets/site/era-stone.webp',
    related: ['feet', 'assembled', 'son', 'ancient'],
    takeaway: 'The supernatural stone cut without human hands represents God’s eternal kingdom established at the Second Coming of Christ, which obliterates all earthly dominions and fills the whole earth.',
    filename: 'stone.glb',
    scale: 1.0,
    position: [0, 0.95, 0],
    camPos: [0, 1.22, 4.4],
    lookAt: [0, 1.0, 0],
    haloY: 1.2,
    haloScale: 0.9
  },
  lion: {
    id: 'lion',
    eyebrow: 'DANIEL 7 · FIRST BEAST',
    title: 'Winged Lion of Babylon',
    pill: 'DANIEL 7:4',
    dates: '605–539 BC',
    quote: '“The first was like a lion, and had eagle’s wings: I beheld till the wings thereof were plucked, and it was lifted up from the earth, and made stand upon the feet as a man, and a man’s heart was given to it.”',
    quoteRef: 'Daniel 7:4 (KJV)',
    explanation: 'Daniel 7 retells the succession of world empires as four predatory beasts emerging from a storm-tossed sea. The winged lion corresponds to the golden head of Babylon in Daniel 2. Its wings signify swift initial conquests, while the plucking of its wings and the gift of a human heart depict King Nebuchadnezzar being humbled and restored by God in Daniel 4.',
    historical: 'The Neo-Babylonian Empire under Nebuchadnezzar II served as the historical foundation for both the head of gold and the winged lion. Babylon adorned its monumental Processional Way and the Ishtar Gate with glazed reliefs of marching lions. The king who witnessed the colossus in Daniel 2 was later driven into the wilderness in Daniel 4 before acknowledging God and regaining his sanity.',
    plateImg: 'assets/plates/lion-procession.jpg',
    plateCaption: 'Winged lions on the Processional Way · Babylon',
    thumb: 'assets/site/era-lion.webp',
    related: ['head', 'bear', 'stump', 'dura'],
    takeaway: 'The winged lion portrays the swift rise of Babylon, whose plucked wings and human heart reflect King Nebuchadnezzar’s humiliation and subsequent restoration by God.',
    filename: 'lion.glb',
    organic: true,
    autoFrame: true,
    targetHeight: 2.15,
    camPos: [1.6, 1.55, 5.6],
    lookAt: [0, 1.05, 0],
    haloY: 1.35,
    haloScale: 1.05
  },
  bear: {
    id: 'bear',
    eyebrow: 'DANIEL 7 · SECOND BEAST',
    title: 'The Bear with Three Ribs',
    pill: 'DANIEL 7:5',
    dates: '539–331 BC',
    quote: '“And behold another beast, a second, like to a bear, and it raised up itself on one side, and it had three ribs in the mouth of it between the teeth of it: and they said thus unto it, Arise, devour much flesh.”',
    quoteRef: 'Daniel 7:5 (KJV)',
    explanation: 'The bear raised up on one side portrays the Medo-Persian Empire, where the Persian kingdom eventually surpassed its Median partner in military strength. The three ribs held between the beast\'s teeth represent the three major territories conquered during Persian expansion, namely Lydia, Babylon, and Egypt. This predatory bear directly corresponds to the silver chest and arms seen in Daniel 2.',
    historical: 'Daniel received the vision of the four beasts during the first year of King Belshazzar of Babylon. In 539 BC, Cyrus the Great diverted the waters of the Euphrates River and captured Babylon in a single night. Both the dual silver arms of the colossus and the lopsided stance of the bear illustrate the unequal partnership between the Medes and the dominant Persians.',
    plateImg: 'assets/site/bear-painting.jpg',
    plateCaption: 'The Bear with Three Ribs · Daniel 7:5',
    thumb: 'assets/site/era-bear.webp',
    related: ['chest', 'ram', 'lion', 'leopard'],
    takeaway: 'The lopsided bear represents the Medo-Persian Empire, with its raised side showing Persian dominance and the three ribs in its mouth recalling its three major conquests of Lydia, Babylon, and Egypt.',
    filename: 'bear.glb',
    organic: true,
    autoFrame: true,
    targetHeight: 2.15,
    camPos: [1.6, 1.55, 5.6],
    lookAt: [0, 1.05, 0],
    haloY: 1.3,
    haloScale: 1.0
  },
  leopard: {
    id: 'leopard',
    eyebrow: 'DANIEL 7 · THIRD BEAST',
    title: 'Four-Winged Leopard',
    pill: 'DANIEL 7:6',
    dates: '331–168 BC',
    quote: '“After this I beheld, and lo another, like a leopard, which had upon the back of it four wings of a fowl; the beast had also four heads; and dominion was given to it.”',
    quoteRef: 'Daniel 7:6 (KJV)',
    explanation: 'The four wings upon the leopard depict the remarkable speed of the Grecian armies led by Alexander the Great, who conquered the Persian world in a single decade. The beast\'s four heads symbolize the Diadochi, the rival Macedonian generals who partitioned Alexander\'s empire into four Hellenistic kingdoms following his death in 323 BC. This agile predator corresponds to the bronze belly and thighs described in Daniel 2.',
    historical: 'Alexander crushed the Persian forces at the Battle of Gaugamela in 331 BC to secure dominion over the Near East. Following his untimely death in Babylon at age thirty-two, his generals Cassander, Lysimachus, Seleucus, and Ptolemy established separate dynasties that spread Greek language and culture across the ancient world. Grecian political supremacy finally ended when Roman legions triumphed at the Battle of Pydna in 168 BC.',
    plateImg: 'assets/plates/leopard-diadochi.jpg',
    plateCaption: 'Four heads after Alexander · the Diadochi',
    thumb: 'assets/site/era-leopard.webp',
    related: ['thighs', 'goat', 'goat_broken', 'beast'],
    takeaway: 'The four-winged leopard represents the rapid conquests of the Grecian Empire under Alexander the Great, while its four heads portray the four Hellenistic realms formed by his generals after his death.',
    filename: 'leopard.glb',
    organic: true,
    autoFrame: true,
    targetHeight: 1.85,
    camPos: [1.8, 1.45, 5.8],
    lookAt: [0, 0.95, 0],
    haloY: 1.15,
    haloScale: 1.1
  },
  beast: {
    id: 'beast',
    eyebrow: 'DANIEL 7 · FOURTH BEAST',
    title: 'Dreadful Beast & Little Horn',
    pill: 'DANIEL 7:7-8, 23-25',
    dates: '168 BC–AD 476; Little Horn 538–1798',
    quote: '“After this I saw in the night visions, and behold a fourth beast, dreadful and terrible, and strong exceedingly; and it had great iron teeth: it devoured and brake in pieces, and stamped the residue with the feet of it: and it was diverse from all the beasts that were before it; and it had ten horns.”',
    quoteRef: 'Daniel 7:7 (KJV)',
    explanation: 'The fourth beast is distinct from all preceding predators, possessing massive iron teeth that correspond to the iron legs of Daniel 2. Its iron teeth portray Imperial Rome crushing Mediterranean nations, while its ten horns represent the barbarian kingdoms that partitioned Western Rome. Among these ten horns emerges a little horn, representing a persecuting religious and political power that uproots three rival kingdoms and exercises authority for 1,260 prophetic years, spanning from AD 538 to 1798.',
    historical: 'As Imperial Rome collapsed, authority shifted to a Roman church-state power established among the divided western tribes. The Byzantine emperor Justinian issued a decree elevating the Roman bishop. The start-year on this chart is A.D. 538: Belisarius lifted the Ostrogothic siege of Rome, and Justinian’s decree could take effect in the city. The Ostrogoths retook Rome in the 540s and were not fully defeated until about 553. This dominion persisted until French forces arrested the pope in 1798, after which Daniel describes a heavenly courtroom session convening before the final kingdom is given to the saints.',
    plateImg: 'assets/study/epochs/papal-rome.jpg',
    plateCaption: 'Iron teeth and the little horn among the ten · Rome',
    thumb: 'assets/site/era-beast.webp',
    related: ['legs', 'years1260', 'ancient', 'son'],
    takeaway: 'The fourth beast with iron teeth represents Imperial Rome, while its little horn portrays the persecuting church-state power that arose among the divided nations and reigned for 1,260 years until 1798.',
    filename: 'beast.glb',
    organic: true,
    autoFrame: true,
    targetHeight: 2.2,
    camPos: [1.7, 1.6, 5.8],
    lookAt: [0, 1.1, 0],
    haloY: 1.4,
    haloScale: 1.12
  },
  years1260: {
    id: 'years1260',
    eyebrow: 'DANIEL 7 · THE MEASURED SPAN',
    title: 'A Time, Times, and Dividing of Time',
    pill: 'DANIEL 7:25 · 1,260 YEARS',
    dates: 'AD 538 – AD 1798',
    quote: '“And he shall speak great words against the most High, and shall wear out the saints of the most High, and think to change times and laws: and they shall be given into his hand until a time and times and the dividing of time.”',
    quoteRef: 'Daniel 7:25 (KJV)',
    explanation: 'Do not memorize 1,260 years first. Build the number. In this style of prophecy a “time” is a year, “times” is two years, and “the dividing of time” is a half year: 1 + 2 + ½ = 3½ years. Revelation writes the same span three ways: a thousand two hundred and threescore days (Revelation 12:6), a time and times and half a time (Revelation 12:14), and forty and two months (Revelation 13:5). Forty-two months of thirty days are 1,260 days. On the year-day scale God appointed in Numbers 14:34 and Ezekiel 4:6, those 1,260 days are 1,260 years. This exhibit is that measured reign — not a fifth metal, and not a three-and-a-half-year man at the end of time.',
    historical: 'The marks in Daniel 7:24–25 sit among the ten fragments of western Rome: a power diverse from the others, speaking great words, wearing out the saints, intending to change times and laws. The start-year on this chart is A.D. 538: Belisarius lifted the Ostrogothic siege of Rome, and Justinian’s decree could take effect in the city. The Ostrogoths retook Rome in the 540s and were not fully defeated until about 553. The close is 1798, when General Berthier took Pius VI. You may not skip the marks in 7:24–25 and still claim any favorite villain. The 2020 lesson places the court of 7:9–14 after that span. The historicist reading places the coming to the Ancient of Days in 1844. Daniel 7:11 still has great words spoken while the court sits. The stone of chapter 2 is later.',
    plateImg: 'assets/plates/years1260.jpg',
    plateCaption: 'Time, times, and the dividing of time · 538 to 1798',
    thumb: 'assets/site/era-years1260.webp',
    related: ['beast', 'ancient', 'sealed', 'feet'],
    takeaway: 'Daniel 7:25’s riddle is 3½ years; Revelation equates it with 1,260 days; the year-day scale makes those 1,260 years, from the little horn’s measured supremacy in 538 to the deadly wound in 1798.',
    filename: 'years1260.glb',
    organic: true,
    autoFrame: true,
    targetHeight: 2.15,
    camPos: [1.6, 1.55, 5.6],
    lookAt: [0, 1.08, 0],
    haloY: 1.35,
    haloScale: 1.08
  },
  ram: {
    id: 'ram',
    eyebrow: 'DANIEL 8 · THE RAM',
    title: 'Ram of Medo-Persia',
    pill: 'DANIEL 8:3-4, 20',
    dates: '539–331 BC',
    quote: '“Then I lifted up mine eyes, and saw, and, behold, there stood before the river a ram which had two horns: and the two horns were high; but one was higher than the other, and the higher came up last.”',
    quoteRef: 'Daniel 8:3 (KJV)',
    explanation: 'The angel Gabriel explicitly identifies the two-horned ram as the kings of Media and Persia in Daniel 8:20. The two horns represent this dual monarchy, with the higher horn that emerged last illustrating that Persia arose after Media and grew far more powerful. This symbol provides the direct biblical key to the silver arms of Daniel 2 and the lopsided bear of Daniel 7.',
    historical: 'Daniel stood beside the Ulai River in the fortress city of Susa, which later became a royal capital of the Persian Empire, when this vision appeared. The ram pushed aggressively toward the west, north, and south, conquering territory without encountering any rival power that could resist its advance. This unchecked expansion continued until the charging Grecian he-goat swept across the earth from the west to confront it.',
    plateImg: 'assets/plates/ram-ulai.jpg',
    plateCaption: 'Two horns beside the Ulai · Medo-Persia',
    thumb: 'assets/site/era-ram.webp',
    related: ['chest', 'bear', 'goat', 'thighs'],
    takeaway: 'The two-horned ram represents the kings of Media and Persia, with the higher horn that came up last signifying the greater power of the Persian kingdom that arose after Media.',
    filename: 'ram.glb',
    organic: true,
    autoFrame: true,
    targetHeight: 2.1,
    camPos: [1.7, 1.5, 5.7],
    lookAt: [0, 1.05, 0],
    haloY: 1.25,
    haloScale: 1.0
  },
  goat: {
    id: 'goat',
    eyebrow: 'DANIEL 8 · THE HE-GOAT',
    title: 'Charging Goat of Greece',
    pill: 'DANIEL 8:5-7, 21',
    dates: '331–168 BC (Alexander 334–323 BC)',
    quote: '“And as I was considering, behold, an he goat came from the west on the face of the whole earth, and touched not the ground: and the goat had a notable horn between his eyes.”',
    quoteRef: 'Daniel 8:5 (KJV)',
    explanation: 'Daniel 8:21 says the rough goat is the king of Grecia, and the great horn is the first king. Alexander is the historical name of that first king, not a word Gabriel speaks. The goat moving so swiftly that its feet do not touch the ground signifies Alexander\'s lightning military campaign from Greece to the borders of India. In this vision, the goat charges the Persian ram with furious power, breaking both of its horns and trampling it to the ground.',
    historical: 'Beginning at the Granicus River in 334 BC and culminating at the decisive Battle of Gaugamela in 331 BC, Alexander dismantled the Persian Empire in barely three years. This rapid triumph demonstrates why Daniel 2 depicted Greece as resonant bronze and Daniel 7 portrayed it as a four-winged leopard. The prophecy in Daniel 8 explicitly names the historical empires that were previously represented only by symbolic metals and beasts.',
    plateImg: 'assets/plates/goat-charge.jpg',
    plateCaption: 'The notable horn from the west · Alexander',
    thumb: 'assets/site/era-goat.webp',
    related: ['thighs', 'leopard', 'ram', 'goat_broken'],
    takeaway: 'The swift he-goat represents the Grecian Empire moving from the west with unmatched speed, whose prominent single horn between his eyes identifies its first great monarch, Alexander the Great.',
    filename: 'goat.glb',
    organic: true,
    autoFrame: true,
    targetHeight: 2.15,
    camPos: [1.8, 1.5, 5.8],
    lookAt: [0, 1.05, 0],
    haloY: 1.3,
    haloScale: 1.05
  },
  goat_broken: {
    id: 'goat_broken',
    eyebrow: 'DANIEL 8 · THE GREAT HORN BROKEN',
    title: 'Goat with the Broken Horn',
    pill: 'DANIEL 8:8, 22',
    dates: '323–168 BC (Hellenistic Division)',
    quote: '“Therefore the he goat waxed very great: and when he was strong, the great horn was broken; and for it came up four notable ones toward the four winds of heaven.”',
    quoteRef: 'Daniel 8:8 (KJV)',
    explanation: 'The sudden shattering of the goat\'s great horn represents Alexander the Great dying unexpectedly of fever in Babylon in 323 BC at the zenith of his military career. In place of the single horn, four notable horns grew toward the four winds of heaven, representing the partition of Alexander\'s realm among four Macedonian generals known as the Diadochi. Daniel 8:22 explains that four separate kingdoms would arise from the Greek nation, but none would equal the personal power of its founder.',
    historical: 'The four horns of the he-goat correspond directly to the four heads of the leopard introduced in Daniel 7. Following decades of internal warfare, the Diadochi established the four Hellenistic realms of Cassander in Macedonia, Lysimachus in Thrace and Asia Minor, Seleucus in Syria and Mesopotamia, and Ptolemy in Egypt. Although Greek language and civilization continued to dominate the Mediterranean basin, the fractured dynasties progressively fell before the rising military power of Rome.',
    plateImg: 'assets/plates/goat-broken.jpg',
    plateCaption: 'When he was strong, the great horn was broken',
    thumb: 'assets/site/era-goat_broken.webp',
    related: ['goat', 'leopard', 'goat_horn', 'thighs'],
    takeaway: 'The breaking of the goat’s great horn represents Alexander the Great’s sudden death at the height of his power in 323 BC, after which his realm fractured into four separate Hellenistic kingdoms.',
    filename: 'goat_broken.glb',
    organic: true,
    autoFrame: true,
    targetHeight: 2.1,
    camPos: [1.7, 1.5, 5.7],
    lookAt: [0, 1.05, 0],
    haloY: 1.25,
    haloScale: 1.0
  },
  goat_horn: {
    id: 'goat_horn',
    eyebrow: 'DANIEL 8 · THE LITTLE HORN',
    title: 'Little Horn of the Goat',
    pill: 'DANIEL 8:9-14, 23-25',
    dates: '168 BC (pagan Rome’s rise); cleansing begins 1844; broken without hand at the Second Coming (Daniel 8:25)',
    quote: '“And out of one of them came forth a little horn, which waxed exceeding great, toward the south, and toward the east, and toward the pleasant land.”',
    quoteRef: 'Daniel 8:9 (KJV)',
    explanation: 'The little horn of Daniel 8 represents the persecuting power of Rome in both its pagan imperial and papal ecclesiastical phases. It grows exceeding great toward the south, east, and the pleasant land of Palestine, usurping the daily priestly ministry, or tamid in Hebrew, of Christ and casting down the truth of His heavenly sanctuary. By the year-day principle of prophetic interpretation, where a symbolic prophetic day represents a literal calendar year, the 2,300 days end in 1844 when the heavenly cleansing begins.',
    historical: 'Daniel 8:17 says the vision is at the time of the end. Daniel 8:19 names the last end of the indignation and the time appointed. That reach is far beyond the brief second-century BC oppression under the Seleucid king Antiochus IV Epiphanes. While Antiochus desecrated the earthly temple in Jerusalem for three years, this prophetic horn waxes exceeding great and attacks the heavenly priesthood of Christ Himself. The fulfillment spans from Roman imperial authority through the medieval church-state system to the breaking without hand at the Second Coming (Daniel 8:25). The year 1844 is the start of the cleansing, the judgment that commenced then.',
    plateImg: 'assets/plates/goat-horn.jpg',
    plateCaption: 'A little horn toward the pleasant land',
    thumb: 'assets/site/era-goat_horn.webp',
    related: ['beast', 'goat_broken', 'ancient', 'stone'],
    takeaway: 'The little horn of Daniel 8 represents the persecuting power of Imperial and papal Rome that magnified itself against Christ’s heavenly sanctuary ministry. The 2,300 days end in 1844, when the heavenly cleansing begins. The horn is broken without hand at the Second Coming (Daniel 8:25).',
    filename: 'goat_horn.glb',
    organic: true,
    autoFrame: true,
    targetHeight: 2.15,
    camPos: [1.7, 1.55, 5.8],
    lookAt: [0, 1.1, 0],
    haloY: 1.35,
    haloScale: 1.08
  },
  dura: {
    id: 'dura',
    eyebrow: 'DANIEL 3 · PLAIN OF DURA',
    title: 'Golden Image of Dura',
    pill: 'DANIEL 3:1-6',
    dates: 'c. 594 BC',
    quote: '“Nebuchadnezzar the king made an image of gold, whose height was threescore cubits, and the breadth thereof six cubits: he set it up in the plain of Dura, in the province of Babylon.”',
    quoteRef: 'Daniel 3:1 (KJV)',
    explanation: 'King Nebuchadnezzar constructed an image fabricated entirely of gold on the plain of Dura as an open rejection of God\'s revelation in Daniel 2. Unwilling to accept that Babylon was merely the golden head and would eventually fall to an inferior kingdom, the king asserted that his empire would stand forever. Standing sixty cubits high and six cubits wide, the monument served as the centerpiece of a mandatory assembly where all subjects were commanded to bow down or face execution in a burning fiery furnace.',
    historical: 'Three young Hebrew administrators named Shadrach, Meshach, and Abednego refused to violate God\'s commandments by bowing before the golden idol. Even after the furious monarch ordered the furnace heated seven times hotter than normal, God protected them within the flames, where Nebuchadnezzar was astonished to see a divine fourth figure resembling the Son of God walking beside them unhurt. This dramatic trial serves as the biblical prototype for the end-time crisis described in Revelation 13, where civil rulers again enforce religious conformity upon threat of death.',
    plateImg: 'assets/plates/dura-plain.jpg',
    plateCaption: 'An image of gold on the plain of Dura',
    thumb: 'assets/site/era-dura.webp',
    related: ['assembled', 'head', 'stump', 'son'],
    takeaway: 'Nebuchadnezzar made his ninety-foot statue entirely of gold to defy God’s revelation that Babylon would fall, demanding universal worship on pain of death until God delivered three faithful Hebrew captives from the fiery furnace.',
    filename: 'dura.glb',
    organic: true,
    autoFrame: true,
    targetHeight: 2.4,
    camPos: [1.4, 1.7, 6.2],
    lookAt: [0, 1.15, 0],
    haloY: 1.55,
    haloScale: 1.15
  },
  ancient: {
    id: 'ancient',
    eyebrow: 'DANIEL 7 · THE HEAVENLY COURT',
    title: 'The Ancient of Days',
    pill: 'DANIEL 7:9-10',
    dates: 'Pre-Advent Judgment from 1844',
    quote: '“I beheld till the thrones were cast down, and the Ancient of days did sit, whose garment was white as snow, and the hair of his head like the pure wool: his throne was like the fiery flame, and his wheels as burning fire.”',
    quoteRef: 'Daniel 7:9 (KJV)',
    explanation: 'The judgment scene in Daniel 7 portrays a solemn celestial courtroom convened before the Ancient of Days rather than an earthly battlefield. Thrones are placed in order, celestial books of record are opened, and the oppressive deeds of the little horn are thoroughly evaluated before the heavenly court. This judicial session is the pre-advent judgment that commenced at the conclusion of the 2,300 prophetic days in 1844.',
    historical: 'Daniel describes millions of heavenly beings attending this celestial proceeding as a river of fire issues from the throne of the Ancient of Days. The arrogant fourth beast is not overthrown by an earthly military rival, but is condemned and destroyed as a direct result of heaven\'s judicial sentence. This verdict vindicates God\'s faithful people and prepares the way for the transfer of eternal dominion to the Son of man.',
    plateImg: 'assets/plates/ancient-throne.jpg',
    plateCaption: 'Thrones were set, and the books were opened',
    thumb: 'assets/site/era-ancient.webp',
    related: ['son', 'beast', 'years1260', 'stone'],
    takeaway: 'The vision of the Ancient of Days reveals God convening a heavenly courtroom where the books of record are opened and earthly persecuting powers are judged before Christ receives His eternal kingdom.',
    filename: 'ancient.glb',
    organic: true,
    autoFrame: true,
    targetHeight: 2.25,
    camPos: [1.5, 1.6, 5.8],
    lookAt: [0, 1.15, 0],
    haloY: 1.5,
    haloScale: 1.12
  },
  son: {
    id: 'son',
    eyebrow: 'DANIEL 7 · THE SON OF MAN',
    title: 'One Like the Son of Man',
    pill: 'DANIEL 7:13-14',
    dates: 'The Daniel 7:13 coming opens the pre-advent judgment in 1844',
    quote: '“I saw in the night visions, and, behold, one like the Son of man came with the clouds of heaven, and came to the Ancient of days, and they brought him near before him.”',
    quoteRef: 'Daniel 7:13 (KJV)',
    explanation: 'In Daniel 7:13, the figure described as the Son of man travels with the clouds of heaven toward the Ancient of Days rather than descending directly to earth. He is ushered into the presence of God to receive universal dominion, glory, and an everlasting kingdom that will never pass away. Jesus adopted this title during His earthly ministry to identify Himself as this divine ruler who receives sovereignty in the heavenly sanctuary before returning to claim His people.',
    historical: 'Daniel records that all peoples, nations, and languages will ultimately serve and obey the Son of man when His eternal kingdom is inaugurated. After the destructive dominion of the little horn is stripped away and consumed, the kingdom under the whole heaven will be given to the saints of the Most High. This climax marks the complete transition of world authority away from oppressive earthly empires and into the hands of Christ and His redeemed people.',
    plateImg: 'assets/plates/son-clouds.jpg',
    plateCaption: 'With the clouds of heaven, to the Ancient of Days',
    thumb: 'assets/site/era-son.webp',
    related: ['ancient', 'stone', 'michael', 'sealed'],
    takeaway: 'The vision reveals Jesus Christ approaching God’s heavenly throne as the Son of man to receive everlasting dominion over all peoples, nations, and languages before returning to earth.',
    filename: 'son.glb',
    organic: true,
    autoFrame: true,
    targetHeight: 2.2,
    camPos: [1.5, 1.55, 5.7],
    lookAt: [0, 1.12, 0],
    haloY: 1.45,
    haloScale: 1.1
  },
  stump: {
    id: 'stump',
    eyebrow: 'DANIEL 4 · THE WATCHER’S SENTENCE',
    title: 'Ironbound Stump',
    pill: 'DANIEL 4:14-17, 23',
    dates: 'c. 569–562 BC (Seven Times of Nebuchadnezzar)',
    quote: '“Nevertheless leave the stump of his roots in the earth, even with a band of iron and brass, in the tender grass of the field; and let it be wet with the dew of heaven, and let his portion be with the beasts in the grass of the earth.”',
    quoteRef: 'Daniel 4:15 (KJV)',
    explanation: 'In Daniel 4, a majestic tree that once offered shade and nourishment to all living creatures represents King Nebuchadnezzar at the height of his imperial power. A holy watcher from heaven commands the tree to be cut down, yet instructs that its roots and stump be secured with a band of iron and bronze so that the king\'s realm is preserved. The proud monarch is stricken with seven years of madness and lives among wild animals until he recognizes that the Most High rules over human kingdoms.',
    historical: 'Twelve months after Daniel warned him to repent of his sins and show mercy to the oppressed, Nebuchadnezzar boasted of building Babylon by his own sovereign might and was instantly struck with mental illness. For seven literal years he grazed upon grass like an ox until his hair grew like eagles\' feathers and his nails resembled birds\' claws. When his understanding finally returned, the humbled king lifted his eyes to heaven and publicly praised the Most High God, learning by personal experience that earthly sovereignty is granted only by divine decree.',
    plateImg: 'assets/study/babylon-sunset.jpg',
    plateCaption: 'Leave the stump of his roots · banded with iron and brass',
    thumb: 'assets/site/era-stump.webp',
    related: ['head', 'dura', 'lion', 'ox_king'],
    takeaway: 'The iron and bronze band binding the tree stump showed that God preserved Nebuchadnezzar’s royal throne during seven years of humiliating madness until the proud monarch acknowledged heaven’s supreme sovereignty.',
    filename: 'stump.glb',
    organic: true,
    autoFrame: true,
    targetHeight: 1.85,
    camPos: [1.6, 1.35, 5.4],
    lookAt: [0, 0.9, 0],
    haloY: 1.1,
    haloScale: 0.95
  },
  ox_king: {
    id: 'ox_king',
    eyebrow: 'DANIEL 4 · THE KING AMONG BEASTS',
    title: 'Nebuchadnezzar the Ox-King',
    pill: 'DANIEL 4:33',
    dates: 'c. 569–562 BC (Seven Times)',
    quote: '“The same hour was the thing fulfilled upon Nebuchadnezzar: and he was driven from men, and did eat grass as oxen, and his body was wet with the dew of heaven, till his hairs were grown like eagles’ feathers, and his nails like birds’ claws.”',
    quoteRef: 'Daniel 4:33 (KJV)',
    explanation: 'Daniel 4 records that the golden head of the colossus was himself driven from the throne and given a beast’s portion until he learned that the Most High rules. Hair like eagles’ feathers and nails like birds’ claws are the visible sentence: a king who claimed Babylon as his own building is numbered with the oxen. This figure stands beside the ironbound stump. The stump is the reserved throne; the ox-king is the man who must live the sentence.',
    historical: 'Twelve months after the warning, Nebuchadnezzar walked in the palace and boasted there (Daniel 4:29-30) and was struck the same hour. For seven years he ate grass as oxen until his understanding returned and he praised the King of heaven. Babylon’s throne was kept for him, then passed in the next generation to Belshazzar, who did not learn the family lesson.',
    plateImg: 'assets/plates/ox-king.jpg',
    plateCaption: 'Hair like eagles’ feathers, nails like birds’ claws',
    thumb: 'assets/site/era-ox_king.webp',
    related: ['stump', 'head', 'lion', 'dura'],
    takeaway: 'The ox-king is Nebuchadnezzar under the Watcher’s sentence: driven from men, wet with dew, until a proud monarch lifts his eyes and confesses that heaven assigns every throne.',
    filename: 'ox_king.glb',
    organic: true,
    autoFrame: true,
    targetHeight: 2.15,
    camPos: [1.6, 1.55, 5.6],
    lookAt: [0, 1.05, 0],
    haloY: 1.35,
    haloScale: 1.05
  },
  michael: {
    id: 'michael',
    eyebrow: 'DANIEL 12 · THE GREAT PRINCE',
    title: 'Michael Standing Up',
    pill: 'DANIEL 12:1',
    dates: 'Daniel 12:1–2',
    quote: '“And at that time shall Michael stand up, the great prince which standeth for the children of thy people: and there shall be a time of trouble, such as never was since there was a nation even to that same time: and at that time thy people shall be delivered, every one that shall be found written in the book.”',
    quoteRef: 'Daniel 12:1 (KJV)',
    explanation: 'Michael is named the great prince who stands for Daniel’s people. In Daniel, “stand up” (amad) is the verb for a king taking power (11:2–4, 7, 20–21). When Michael stands up (12:1), Christ assumes His royal stance, human probation closes, a time of trouble follows, and those written in the book are delivered. The same chapter then promises a bodily resurrection. This standing figure is distinct from the Son of man approaching the Ancient of Days on the clouds in Daniel 7:13.',
    historical: 'Daniel 10 already names Michael as the prince who helps against the prince of Persia. Daniel 12 places his standing at the climax of the long conflict traced through the kings of the north and south. The promise that follows is personal: many who sleep in the dust of the earth shall awake, and Daniel himself shall rest and stand in his lot at the end of the days.',
    plateImg: 'assets/plates/michael.jpg',
    plateCaption: 'Michael shall stand up, the great prince',
    thumb: 'assets/site/era-michael.webp',
    related: ['son', 'sealed', 'ancient', 'stone'],
    takeaway: 'When Michael stands up, human probation closes, a time of trouble follows, those written in the book are delivered, and then the dust-sleepers awake.',
    filename: 'michael.glb',
    organic: true,
    autoFrame: true,
    targetHeight: 2.2,
    camPos: [1.5, 1.55, 5.7],
    lookAt: [0, 1.12, 0],
    haloY: 1.45,
    haloScale: 1.1
  },
  sealed: {
    id: 'sealed',
    eyebrow: 'DANIEL 12 · THE CLOSED BOOK',
    title: 'The Sealed Scroll',
    pill: 'DANIEL 12:4, 9',
    dates: 'Sealed until the time of the end',
    quote: '“But thou, O Daniel, shut up the words, and seal the book, even to the time of the end: many shall run to and fro, and knowledge shall be increased.”',
    quoteRef: 'Daniel 12:4 (KJV)',
    explanation: 'The last chapter does not leave the visions open for every generation to invent a new scheme. Daniel is told to shut up the words and seal the book until the time of the end. The angel repeats the charge in 12:9: the words are closed up and sealed. Understanding is promised to the wise when the measured spans actually reach their dates, not when curiosity demands an earlier chart.',
    historical: 'The text gives the day counts and seals them until the time of the end. 1798 and 1844 are the calculated application of those counts, not dates the text itself prints.',
    plateImg: 'assets/plates/sealed.jpg',
    plateCaption: 'Shut up the words, and seal the book',
    thumb: 'assets/site/era-sealed.webp',
    related: ['michael', 'son', 'goat_horn', 'ancient'],
    takeaway: 'Daniel is commanded to seal the book until the time of the end, so the numbered visions stay closed until their appointed dates arrive and the wise understand.',
    filename: 'sealed.glb',
    organic: true,
    autoFrame: true,
    targetHeight: 2.05,
    camPos: [1.4, 1.5, 5.4],
    lookAt: [0, 1.05, 0],
    haloY: 1.3,
    haloScale: 1.0
  },
  kings: {
    id: 'kings',
    eyebrow: 'DANIEL 11 · NORTH AND SOUTH',
    title: 'Kings of the North and South',
    pill: 'DANIEL 11:5, 40',
    dates: 'After Alexander to the time of the end',
    quote: '“And at the time of the end shall the king of the south push at him: and the king of the north shall come against him like a whirlwind, with chariots, and with horsemen, and with many ships; and he shall enter into the countries, and shall overflow and pass over.”',
    quoteRef: 'Daniel 11:40 (KJV)',
    explanation: 'Daniel 11 opens in the first year of Darius the Mede. The south-and-north narrative begins after the horn breaks (Daniel 11:4-5). The king of the south is first the Ptolemaic power in Egypt; the king of the north is first the Seleucid power in Syria. Their wars, marriages, and betrayals fill the chapter as a dated march. At the time of the end the same titles return: the south pushes, the north comes like a whirlwind, and the conflict moves toward the glorious holy mountain before Michael stands up in chapter 12.',
    historical: 'Ptolemy I held Egypt; Seleucus I held Syria and the lands toward the north. Daniel 11:6 records a failed marriage-alliance between the houses. Later verses track Rome’s rise over the Hellenistic kings. Daniel 11:22 breaks the prince of the covenant. Daniel 11:36 is magnification above every god. The last movement of the chapter is not another named empire in metal, but the last contest that yields to Michael’s standing.',
    plateImg: 'assets/plates/kings.jpg',
    plateCaption: 'The king of the south shall be strong… the king of the north',
    thumb: 'assets/site/era-kings.webp',
    related: ['goat_broken', 'michael', 'sealed', 'beast'],
    takeaway: 'After Alexander’s horn is broken, Daniel 11 tracks the kings of the south and north from the Ptolemies and Seleucids to a last whirlwind at the time of the end, just before Michael stands up.',
    filename: 'kings.glb',
    organic: true,
    autoFrame: true,
    targetHeight: 1.75,
    camPos: [0, 1.15, 4.8],
    lookAt: [0, 0.85, 0],
    haloY: 1.05,
    haloScale: 1.15
  },
  decree: {
    id: 'decree',
    eyebrow: 'DANIEL 9 · THE GOING FORTH',
    title: 'Royal Decree of Artaxerxes',
    pill: 'EZRA 7:13 · DANIEL 9:25',
    dates: '457 BC (seventh year of Artaxerxes I)',
    quote: '“Know therefore and understand, that from the going forth of the commandment to restore and to build Jerusalem unto the Messiah the Prince shall be seven weeks, and threescore and two weeks: the street shall be built again, and the wall, even in troublous times.”',
    quoteRef: 'Daniel 9:25 (KJV)',
    explanation: 'Gabriel dates the seventy weeks from the going forth of the commandment to restore and to build Jerusalem. Among the Persian restoration decrees, Ezra 7 records the fullest grant: Artaxerxes I in his seventh year authorizes return, temple service, and the civil restoration of the city. That going forth is 457 BC, the hinge from which sixty-nine weeks of years run to Messiah the Prince, and from which the longer 2,300 days of Daniel 8 also take their start.',
    historical: 'Cyrus (Ezra 1) sent the first wave home to rebuild the house. Darius confirmed the temple work. Artaxerxes’ letter in Ezra 7:12–26 adds priests, Levites, silver and gold, and authority to appoint magistrates — the commandment that actually rebuilds Jerusalem as a city under law. Ezra 7:7–8 places the journey in the seventh year of the king. From that date the arithmetic of Daniel 9 can be worked on paper: 457 plus 483 years lands on the anointing of Messiah, and the midst of the seventieth week is Calvary.',
    plateImg: 'assets/plates/decree.jpg',
    plateCaption: 'The commandment to restore and to build Jerusalem',
    thumb: 'assets/site/era-decree.webp',
    related: ['chest', 'ram', 'goat_horn', 'stone'],
    takeaway: 'Artaxerxes’ decree in 457 BC is the going forth of Daniel 9:25: the clock for Messiah the Prince, and the shared start of the 2,300 days.',
    filename: 'decree.glb',
    organic: true,
    autoFrame: true,
    targetHeight: 2.15,
    camPos: [1.5, 1.55, 5.6],
    lookAt: [0, 1.05, 0],
    haloY: 1.35,
    haloScale: 1.05
  }
};

// --- MUSEUM NODES CONFIGURATION ---
// 6 precision nodes matching the mock layout: 3 on left column, 3 on right column
export const MUSEUM_NODES_DATA = {
  // Complete Assembled Statue Nodes
  assembled: [
    {
      id: 'col-head', col: 'left', row: 0,
      icon: '👑', label: 'HEAD OF GOLD',
      body: 'The golden head represents the Babylonian Empire under Nebuchadnezzar II, ruling with supreme wealth and majesty from 605 to 539 BC.',
      anchor: new THREE.Vector3(0, 3.25, 0.42), enabled: true
    },
    {
      id: 'col-thighs', col: 'left', row: 1,
      icon: '⚔️', label: 'BRONZE THIGHS',
      body: 'The bronze thighs represent the Grecian Empire from 331 to 168 BC, whose swift armies conquered the ancient world in bronze hoplite armor.',
      anchor: new THREE.Vector3(0, 1.48, 0.45), enabled: true
    },
    {
      id: 'col-feet', col: 'left', row: 2,
      icon: '🦶', label: 'IRON AND CLAY',
      body: 'The feet of iron and clay represent the divided nations after AD 476, partly strong and partly fragile, which never permanently unite.',
      anchor: new THREE.Vector3(0, 0.25, 0.45), enabled: true
    },
    {
      id: 'col-chest', col: 'right', row: 0,
      icon: '🛡️', label: 'SILVER CHEST',
      body: 'The silver chest and arms represent the Medo-Persian Empire from 539 to 331 BC, renowned for massive treasuries and silver coinage.',
      anchor: new THREE.Vector3(0, 2.38, 0.45), enabled: true
    },
    {
      id: 'col-legs', col: 'right', row: 1,
      icon: '🦿', label: 'LEGS OF IRON',
      body: 'The iron legs represent Imperial Rome from 168 BC to AD 476, whose disciplined legions crushed and governed opposing realms.',
      anchor: new THREE.Vector3(0, 0.88, 0.40), enabled: true
    },
    {
      id: 'col-altar', col: 'right', row: 2,
      icon: '🏛️', label: 'AZURE ALTAR DAIS',
      body: 'This glazed-brick platform reconstructs a Mesopotamian dais, which elevated royal monuments and sacred altars in ancient Babylon.',
      anchor: new THREE.Vector3(0, -0.42, 1.15), enabled: true
    }
  ],
  // Golden Head Nodes
  head: [
    {
      id: 'head-mat', col: 'left', row: 0,
      icon: '🟡', label: 'WHY GOLD',
      body: 'Gold portrays Babylon\'s unmatched imperial splendor and vast wealth described by ancient historians. (Daniel 2:38)',
      anchor: new THREE.Vector3(-0.35, 1.95, 0.38), enabled: true
    },
    {
      id: 'head-sig', col: 'left', row: 1,
      icon: '👑', label: 'BABYLONIAN EMPIRE',
      body: 'Babylon ruled as the supreme power of the Near East from 605 to 539 BC, establishing the benchmark for world empires.',
      anchor: new THREE.Vector3(-0.42, 1.35, 0.46), enabled: true
    },
    {
      id: 'head-fig', col: 'left', row: 2,
      icon: '👤', label: 'NEBUCHADNEZZAR II',
      body: 'King Nebuchadnezzar II reigned from 605 to 562 BC, expanding his empire and rebuilding Babylon into an architectural wonder.',
      anchor: new THREE.Vector3(-0.48, 0.55, 0.52), enabled: true
    },
    {
      id: 'head-bib', col: 'right', row: 0,
      icon: '📖', label: 'SCRIPTURE TEXT',
      body: 'Daniel told the king: “Thou, O king, art a king of kings... Thou art this head of gold.” (Daniel 2:37-38)',
      anchor: new THREE.Vector3(0.35, 1.88, 0.38), enabled: true
    },
    {
      id: 'head-rep', col: 'right', row: 1,
      icon: '🦁', label: 'MATCHING SYMBOL',
      body: 'In Daniel 7:4, Babylon is depicted as a winged lion that is subsequently plucked and given a human heart.',
      anchor: new THREE.Vector3(0.40, 1.25, 0.48), enabled: true
    },
    {
      id: 'head-ai', col: 'right', row: 2,
      icon: '🥈', label: 'WHAT FOLLOWED',
      body: 'Babylon fell in 539 BC to the Medo-Persian Empire, represented by the silver chest and arms of the colossus.',
      anchor: new THREE.Vector3(0.48, 0.45, 0.52), enabled: true
    }
  ],
  // Silver Chest Nodes
  chest: [
    {
      id: 'chest-bib', col: 'left', row: 0,
      icon: '📖', label: 'SCRIPTURE',
      body: 'Daniel declared that after Babylon would arise another kingdom inferior to it, symbolized by silver arms. (Daniel 2:39)',
      anchor: new THREE.Vector3(-0.35, 1.95, 0.38), enabled: true
    },
    {
      id: 'chest-emp', col: 'left', row: 1,
      icon: '🏛️', label: 'MEDO-PERSIAN EMPIRE',
      body: 'The dual kingdom of the Medes and Persians ruled the Near East from 539 to 331 BC following Babylon\'s fall.',
      anchor: new THREE.Vector3(-0.42, 1.35, 0.46), enabled: true
    },
    {
      id: 'chest-met', col: 'left', row: 2,
      icon: '🥈', label: 'WHY SILVER',
      body: 'Silver signifies Medo-Persia\'s vast coinage and tax revenues, while remaining second to Babylon in cultural splendor.',
      anchor: new THREE.Vector3(-0.48, 0.55, 0.52), enabled: true
    },
    {
      id: 'chest-evt', col: 'right', row: 0,
      icon: '⚔️', label: 'FALL OF BABYLON',
      body: 'In 539 BC, Cyrus the Great diverted the Euphrates River to enter Babylon by night and end the Chaldean dynasty.',
      anchor: new THREE.Vector3(0.35, 1.88, 0.38), enabled: true
    },
    {
      id: 'chest-par', col: 'right', row: 1,
      icon: '🐻', label: 'PARALLEL BEASTS',
      body: 'Medo-Persia is portrayed in Daniel 7 as a bear raised on one side and in Daniel 8 as a two-horned ram.',
      anchor: new THREE.Vector3(0.40, 1.25, 0.48), enabled: true
    },
    {
      id: 'chest-nxt', col: 'right', row: 2,
      icon: '🥉', label: 'WHAT FOLLOWED',
      body: 'Persian rule ended in 331 BC when Alexander the Great of Greece conquered the empire at the Battle of Gaugamela.',
      anchor: new THREE.Vector3(0.48, 0.45, 0.52), enabled: true
    }
  ],
  // Bronze Thighs Nodes
  thighs: [
    {
      id: 'thighs-bib', col: 'left', row: 0,
      icon: '📖', label: 'SCRIPTURE',
      body: 'Daniel foresaw a third kingdom of brass that would bear rule over all the earth. (Daniel 2:39)',
      anchor: new THREE.Vector3(-0.35, 1.95, 0.38), enabled: true
    },
    {
      id: 'thighs-emp', col: 'left', row: 1,
      icon: '🏛️', label: 'GRECIAN EMPIRE',
      body: 'The Greco-Macedonian Empire established world supremacy from 331 to 168 BC following Alexander\'s rapid conquests.',
      anchor: new THREE.Vector3(-0.42, 1.35, 0.46), enabled: true
    },
    {
      id: 'thighs-met', col: 'left', row: 2,
      icon: '🥉', label: 'WHY BRONZE',
      body: 'Bronze characterizes the metal armor, breastplates, and shields of the Grecian hoplite phalanxes.',
      anchor: new THREE.Vector3(-0.48, 0.55, 0.52), enabled: true
    },
    {
      id: 'thighs-evt', col: 'right', row: 0,
      icon: '⚔️', label: 'GAUGAMELA 331 BC',
      body: 'At the Battle of Gaugamela in 331 BC, Alexander shattered the Persian forces of Darius III to claim the east.',
      anchor: new THREE.Vector3(0.35, 1.88, 0.38), enabled: true
    },
    {
      id: 'thighs-par', col: 'right', row: 1,
      icon: '🐆', label: 'PARALLEL BEASTS',
      body: 'Greece corresponds to the four-winged leopard of Daniel 7 and the swift he-goat with a notable horn in Daniel 8.',
      anchor: new THREE.Vector3(0.40, 1.25, 0.48), enabled: true
    },
    {
      id: 'thighs-nxt', col: 'right', row: 2,
      icon: '🦿', label: 'WHAT FOLLOWED',
      body: 'Following Alexander\'s death in 323 BC, Greece split into four Hellenistic kingdoms before falling to Rome in 168 BC.',
      anchor: new THREE.Vector3(0.48, 0.45, 0.52), enabled: true
    }
  ],
  // Iron Legs Nodes
  legs: [
    {
      id: 'legs-bib', col: 'left', row: 0,
      icon: '📖', label: 'SCRIPTURE',
      body: 'Daniel prophesied a fourth kingdom as strong as iron that breaks in pieces and subdues all things. (Daniel 2:40)',
      anchor: new THREE.Vector3(-0.35, 1.95, 0.38), enabled: true
    },
    {
      id: 'legs-emp', col: 'left', row: 1,
      icon: '🏛️', label: 'ROMAN EMPIRE',
      body: 'Imperial Rome dominated the Mediterranean basin from 168 BC until the collapse of the Western empire in AD 476.',
      anchor: new THREE.Vector3(-0.42, 1.35, 0.46), enabled: true
    },
    {
      id: 'legs-met', col: 'left', row: 2,
      icon: '⚙️', label: 'WHY IRON',
      body: 'Iron signifies Rome\'s unyielding military discipline, legionary swords, and ability to crush all opposing nations.',
      anchor: new THREE.Vector3(-0.48, 0.55, 0.52), enabled: true
    },
    {
      id: 'legs-evt', col: 'right', row: 0,
      icon: '⚔️', label: 'BATTLE OF PYDNA',
      body: 'Rome established supremacy over the Greek world at the Battle of Pydna in 168 BC, crushing the Macedonian monarchy.',
      anchor: new THREE.Vector3(0.35, 1.88, 0.38), enabled: true
    },
    {
      id: 'legs-par', col: 'right', row: 1,
      icon: '🐉', label: 'PARALLEL BEAST',
      body: 'Daniel 7 depicts Rome as a dreadful beast with great iron teeth that stamped and devoured the ancient world.',
      anchor: new THREE.Vector3(0.40, 1.25, 0.48), enabled: true
    },
    {
      id: 'legs-nxt', col: 'right', row: 2,
      icon: '🦶', label: 'WHAT FOLLOWED',
      body: 'Rome was never conquered by a fifth world empire; instead, barbarian migrations divided it into the nations of Europe.',
      anchor: new THREE.Vector3(0.48, 0.45, 0.52), enabled: true
    }
  ],
  // Feet of Iron and Clay Nodes
  feet: [
    {
      id: 'feet-bib', col: 'left', row: 0,
      icon: '📖', label: 'SCRIPTURE',
      body: 'Daniel foresaw that the feet of iron and clay meant the kingdom would be divided and partly fragile. (Daniel 2:41-42)',
      anchor: new THREE.Vector3(-0.35, 1.95, 0.38), enabled: true
    },
    {
      id: 'feet-emp', col: 'left', row: 1,
      icon: '👑', label: 'DIVIDED KINGDOMS',
      body: 'The division began in AD 476 as barbarian tribes fragmented Western Rome into the separate nations of modern Europe.',
      anchor: new THREE.Vector3(-0.42, 1.35, 0.46), enabled: true
    },
    {
      id: 'feet-met', col: 'left', row: 2,
      icon: '🏺', label: 'IRON AND CLAY',
      body: 'The brittle mixture depicts European states retaining Roman strength yet unable to fuse into a lasting empire.',
      anchor: new THREE.Vector3(-0.48, 0.55, 0.52), enabled: true
    },
    {
      id: 'feet-evt', col: 'right', row: 0,
      icon: '📜', label: 'FAILED ALLIANCES',
      body: 'Centuries of dynastic marriages and military campaigns by Charlemagne and Napoleon failed to permanently unite Europe.',
      anchor: new THREE.Vector3(0.35, 1.88, 0.38), enabled: true
    },
    {
      id: 'feet-par', col: 'right', row: 1,
      icon: '🔟', label: 'TEN HORNS',
      body: 'The ten toes of the image match the ten horns of the fourth beast in Daniel 7, representing Western Rome\'s division.',
      anchor: new THREE.Vector3(0.40, 1.25, 0.48), enabled: true
    },
    {
      id: 'feet-nxt', col: 'right', row: 2,
      icon: '🪨', label: 'WHAT FOLLOWED',
      body: 'These divided powers will endure until the heavenly stone smites the feet to inaugurate God\'s everlasting kingdom.',
      anchor: new THREE.Vector3(0.48, 0.45, 0.52), enabled: true
    }
  ],
  // Azure Altar Dais Nodes
  altar: [
    {
      id: 'altar-rec', col: 'left', row: 0,
      icon: '🏛️', label: 'GALLERY RECONSTRUCTION',
      body: 'This glazed-brick dais is a modern museum reconstruction created to elevate and showcase the colossus of Daniel 2.',
      anchor: new THREE.Vector3(-0.35, 1.95, 0.38), enabled: true
    },
    {
      id: 'altar-bab', col: 'left', row: 1,
      icon: '🧱', label: 'BABYLONIAN DAIS',
      body: 'Ancient Babylonian architects built tiered podiums of glazed brick to elevate sacred altars and royal monuments.',
      anchor: new THREE.Vector3(-0.42, 1.35, 0.46), enabled: true
    },
    {
      id: 'altar-gla', col: 'left', row: 2,
      icon: '🎨', label: 'LAPIS-BLUE GLAZE',
      body: 'Cobalt and copper-glazed bricks formed the distinctive blue facade of Babylon\'s Processional Way and Ishtar Gate.',
      anchor: new THREE.Vector3(-0.48, 0.55, 0.52), enabled: true
    },
    {
      id: 'altar-bib', col: 'right', row: 0,
      icon: '📖', label: 'SCRIPTURE CONTEXT',
      body: 'After hearing the interpretation of his dream, King Nebuchadnezzar fell prostrate and worshipped God. (Daniel 2:46)',
      anchor: new THREE.Vector3(0.35, 1.88, 0.38), enabled: true
    },
    {
      id: 'altar-rev', col: 'right', row: 1,
      icon: '👑', label: 'GOD OF GODS',
      body: 'The king confessed to Daniel that his God is a Lord of kings and a revealer of secret things. (Daniel 2:47)',
      anchor: new THREE.Vector3(0.40, 1.25, 0.48), enabled: true
    },
    {
      id: 'altar-pur', col: 'right', row: 2,
      icon: '✨', label: 'PEDESTAL FUNCTION',
      body: 'In royal courts, elevated platforms symbolized sovereign power, yet here the dais supports a prophecy of human decline.',
      anchor: new THREE.Vector3(0.48, 0.45, 0.52), enabled: true
    }
  ],
  // Stone Kingdom Nodes
  stone: [
    {
      id: 'stone-bib', col: 'left', row: 0,
      icon: '📖', label: 'SCRIPTURE TEXT',
      body: 'A stone cut without hands struck the image upon its feet of iron and clay and broke them to pieces. (Daniel 2:34)',
      anchor: new THREE.Vector3(-0.35, 1.95, 0.38), enabled: true
    },
    {
      id: 'stone-div', col: 'left', row: 1,
      icon: '👑', label: 'DIVINE ORIGIN',
      body: 'Cut out of the mountain without human hands, the stone represents God\'s eternal kingdom established by Christ. (Daniel 2:45)',
      anchor: new THREE.Vector3(-0.42, 1.35, 0.46), enabled: true
    },
    {
      id: 'stone-tim', col: 'left', row: 2,
      icon: '⏳', label: 'IN THOSE DAYS',
      body: 'Daniel 2:44 foretells that God will set up this kingdom in the days of these divided post-Roman kings.',
      anchor: new THREE.Vector3(-0.48, 0.55, 0.52), enabled: true
    },
    {
      id: 'stone-imp', col: 'right', row: 0,
      icon: '💥', label: 'STRIKES THE FEET',
      body: 'The stone strikes the feet rather than the head because God\'s kingdom arrives during the divided era, not ancient Babylon.',
      anchor: new THREE.Vector3(0.35, 1.88, 0.38), enabled: true
    },
    {
      id: 'stone-ret', col: 'right', row: 1,
      icon: '☁️', label: 'SECOND COMING',
      body: 'The impact depicts the literal Second Coming of Christ, which obliterates every earthly kingdom and human tyranny.',
      anchor: new THREE.Vector3(0.40, 1.25, 0.48), enabled: true
    },
    {
      id: 'stone-mtn', col: 'right', row: 2,
      icon: '⛰️', label: 'GREAT MOUNTAIN',
      body: 'The stone that shattered the image becomes a great mountain that fills the whole earth forever. (Daniel 2:35, 44)',
      anchor: new THREE.Vector3(0.48, 0.45, 0.52), enabled: true
    }
  ],
  lion: [
    {
      id: 'lion-wings', col: 'left', row: 0,
      icon: '🦅', label: 'EAGLE’S WINGS',
      body: 'Babylon’s early conquests were swift until its wings were plucked to humble the proud empire. (Daniel 7:4)',
      anchor: new THREE.Vector3(-0.55, 1.55, 0.35), enabled: true
    },
    {
      id: 'lion-heart', col: 'left', row: 1,
      icon: '❤️', label: 'A MAN’S HEART',
      body: 'The beast was lifted up and given a man’s heart, depicting King Nebuchadnezzar’s restoration after seven years of madness.',
      anchor: new THREE.Vector3(-0.42, 1.1, 0.42), enabled: true
    },
    {
      id: 'lion-gold', col: 'left', row: 2,
      icon: '🟡', label: 'HEAD OF GOLD',
      body: 'The lion corresponds to the golden head of Daniel 2, depicting Babylon as seen from heaven’s perspective.',
      anchor: new THREE.Vector3(-0.4, 0.55, 0.4), enabled: true
    },
    {
      id: 'lion-bib', col: 'right', row: 0,
      icon: '📖', label: 'DANIEL 7:4',
      body: 'Daniel received this vision of four beasts emerging from the sea during the first year of King Belshazzar of Babylon.',
      anchor: new THREE.Vector3(0.5, 1.5, 0.35), enabled: true
    },
    {
      id: 'lion-gate', col: 'right', row: 1,
      icon: '🏛️', label: 'ISHTAR’S LIONS',
      body: 'Glazed reliefs of striding lions lined Babylon’s Processional Way, matching the prophetic symbol given to Daniel.',
      anchor: new THREE.Vector3(0.48, 1.05, 0.4), enabled: true
    },
    {
      id: 'lion-tak', col: 'right', row: 2,
      icon: '✨', label: 'KEY TAKEAWAY',
      body: 'The golden head and the winged lion depict the same Babylonian empire, whose pride was abased by the God of heaven.',
      anchor: new THREE.Vector3(0.45, 0.55, 0.42), enabled: true
    }
  ],
  bear: [
    {
      id: 'bear-side', col: 'left', row: 0,
      icon: '⚖️', label: 'ONE SIDE RAISED',
      body: 'The bear’s lopsided posture illustrates that the Persian half of the Medo-Persian alliance became dominant. (Daniel 7:5)',
      anchor: new THREE.Vector3(-0.45, 1.45, 0.38), enabled: true
    },
    {
      id: 'bear-ribs', col: 'left', row: 1,
      icon: '🦴', label: 'THREE RIBS',
      body: 'The three ribs between its teeth represent Medo-Persia’s three major conquests: Lydia in 546 BC, Babylon in 539 BC, and Egypt in 525 BC.',
      anchor: new THREE.Vector3(-0.5, 1.05, 0.45), enabled: true
    },
    {
      id: 'bear-devour', col: 'left', row: 2,
      icon: '⚔️', label: 'DEVOUR MUCH FLESH',
      body: 'Heaven commands the bear to arise and devour much flesh, portraying expansive imperial conquest permitted by divine providence.',
      anchor: new THREE.Vector3(-0.42, 0.55, 0.4), enabled: true
    },
    {
      id: 'bear-bib', col: 'right', row: 0,
      icon: '📖', label: 'DANIEL 7:5',
      body: 'The second beast appears as a bear, corresponding directly to the silver chest and arms seen in Daniel 2.',
      anchor: new THREE.Vector3(0.48, 1.45, 0.38), enabled: true
    },
    {
      id: 'bear-silver', col: 'right', row: 1,
      icon: '🛡️', label: 'SILVER PARALLEL',
      body: 'Cyrus the Great captured Babylon in 539 BC and subsequently issued a royal decree permitting the Jewish exiles to return home.',
      anchor: new THREE.Vector3(0.45, 1.05, 0.4), enabled: true
    },
    {
      id: 'bear-tak', col: 'right', row: 2,
      icon: '✨', label: 'KEY TAKEAWAY',
      body: 'The silver arms and the lopsided bear portray the Medo-Persian empire from two complementary prophetic viewpoints.',
      anchor: new THREE.Vector3(0.42, 0.55, 0.42), enabled: true
    }
  ],
  leopard: [
    {
      id: 'leo-wings', col: 'left', row: 0,
      icon: '🪽', label: 'FOUR WINGS',
      body: 'The leopard’s four wings depict the extraordinary speed of Alexander the Great’s decade-long conquest of the ancient world. (Daniel 7:6)',
      anchor: new THREE.Vector3(-0.55, 1.4, 0.35), enabled: true
    },
    {
      id: 'leo-heads', col: 'left', row: 1,
      icon: '👑', label: 'FOUR HEADS',
      body: 'After Alexander’s death in 323 BC, his generals, known as the Diadochi, divided the empire into four Hellenistic kingdoms.',
      anchor: new THREE.Vector3(-0.5, 1.05, 0.4), enabled: true
    },
    {
      id: 'leo-bronze', col: 'left', row: 2,
      icon: '🥉', label: 'BRONZE PARALLEL',
      body: 'The four-winged leopard corresponds to the bronze belly and thighs of Daniel 2, depicting the same Grecian empire.',
      anchor: new THREE.Vector3(-0.42, 0.55, 0.38), enabled: true
    },
    {
      id: 'leo-bib', col: 'right', row: 0,
      icon: '📖', label: 'DANIEL 7:6',
      body: 'Scripture states that dominion was given to the leopard, showing that heaven guided the rise and fall of world powers.',
      anchor: new THREE.Vector3(0.55, 1.4, 0.35), enabled: true
    },
    {
      id: 'leo-alex', col: 'right', row: 1,
      icon: '⚔️', label: 'GAUGAMELA 331 BC',
      body: 'At the Battle of Gaugamela in 331 BC, Alexander shattered Persian power to establish Greek supremacy over the Near East.',
      anchor: new THREE.Vector3(0.5, 1.05, 0.4), enabled: true
    },
    {
      id: 'leo-tak', col: 'right', row: 2,
      icon: '✨', label: 'KEY TAKEAWAY',
      body: 'The four wings symbolize Alexander’s swift conquest, while the four heads depict his empire dividing among his four generals.',
      anchor: new THREE.Vector3(0.45, 0.55, 0.4), enabled: true
    }
  ],
  beast: [
    {
      id: 'beast-teeth', col: 'left', row: 0,
      icon: '🦷', label: 'IRON TEETH',
      body: 'The dreadful fourth beast with iron teeth represents Imperial Rome crushing and devouring opposing nations. (Daniel 7:7)',
      anchor: new THREE.Vector3(-0.5, 1.55, 0.4), enabled: true
    },
    {
      id: 'beast-ten', col: 'left', row: 1,
      icon: '🔟', label: 'TEN HORNS',
      body: 'The ten horns correspond to the feet of iron and clay in Daniel 2, representing the divided barbarian realms of Western Rome.',
      anchor: new THREE.Vector3(-0.48, 1.1, 0.42), enabled: true
    },
    {
      id: 'beast-horn', col: 'left', row: 2,
      icon: '📯', label: 'THE LITTLE HORN',
      body: 'A little horn emerges among the ten, uprooting three rival kingdoms: the Heruli, the Vandals, and the Ostrogoths.',
      anchor: new THREE.Vector3(-0.42, 0.55, 0.4), enabled: true
    },
    {
      id: 'beast-bib', col: 'right', row: 0,
      icon: '📖', label: 'DANIEL 7:8, 25',
      body: 'The little horn speaks arrogant words, persecutes God’s saints, and intends to change religious times and laws for 1,260 prophetic years.',
      anchor: new THREE.Vector3(0.5, 1.5, 0.38), enabled: true
    },
    {
      id: 'beast-span', col: 'right', row: 1,
      icon: '📅', label: '538–1798',
      body: 'The 1,260-year prophetic era on this chart begins in AD 538, when the Ostrogothic siege of Rome was lifted, and ends in 1798 with the capture of the pope by French forces. The Ostrogoths were not fully defeated until about 553.',
      anchor: new THREE.Vector3(0.48, 1.05, 0.4), enabled: true
    },
    {
      id: 'beast-tak', col: 'right', row: 2,
      icon: '✨', label: 'HEAVENLY COURT',
      body: 'God convenes a heavenly courtroom to judge the persecuting little horn before giving the eternal kingdom to Christ.',
      anchor: new THREE.Vector3(0.45, 0.55, 0.42), enabled: true
    }
  ],
  years1260: [
    {
      id: 'y1260-riddle', col: 'left', row: 0,
      icon: '⏳', label: 'TIME + TIMES + HALF',
      body: 'A time is a year, times is two, the dividing of time is a half. 1 + 2 + ½ = 3½ years. (Daniel 7:25)',
      anchor: new THREE.Vector3(-0.48, 1.5, 0.4), enabled: true
    },
    {
      id: 'y1260-days', col: 'left', row: 1,
      icon: '📖', label: '1,260 DAYS',
      body: 'Revelation writes the same span as 1,260 days, a time and times and half a time, and forty-two months. (Revelation 12:6, 14; 13:5)',
      anchor: new THREE.Vector3(-0.45, 1.05, 0.42), enabled: true
    },
    {
      id: 'y1260-years', col: 'left', row: 2,
      icon: '📅', label: 'YEAR-DAY SCALE',
      body: 'On the scale God appointed in Numbers 14:34 and Ezekiel 4:6, those 1,260 days are 1,260 years — not a 3½-year future man.',
      anchor: new THREE.Vector3(-0.42, 0.55, 0.4), enabled: true
    },
    {
      id: 'y1260-open', col: 'right', row: 0,
      icon: '⛪', label: 'AD 538',
      body: 'The Ostrogothic siege of Rome is lifted. Justinian’s grant to the Roman see can take effect in the city; the measured reign begins on this chart. The Ostrogoths were not fully defeated until about 553.',
      anchor: new THREE.Vector3(0.5, 1.5, 0.38), enabled: true
    },
    {
      id: 'y1260-close', col: 'right', row: 1,
      icon: '⚔️', label: 'AD 1798',
      body: 'Berthier takes Pius VI. The 1,260 years close. Revelation 13:3 calls this a deadly wound. The time of the end opens.',
      anchor: new THREE.Vector3(0.48, 1.05, 0.4), enabled: true
    },
    {
      id: 'y1260-tak', col: 'right', row: 2,
      icon: '✨', label: 'KEY TAKEAWAY',
      body: 'The riddle is 3½ years; Scripture equates it with 1,260 days; the year-day scale makes those 1,260 years, 538 to 1798.',
      anchor: new THREE.Vector3(0.45, 0.55, 0.42), enabled: true
    }
  ],
  ram: [
    {
      id: 'ram-horns', col: 'left', row: 0,
      icon: '🐏', label: 'TWO HORNS',
      body: 'The two horns represent Media and Persia, with the higher horn showing that Persia arose after Media and became the dominant power. (Daniel 8:3, 20)',
      anchor: new THREE.Vector3(-0.45, 1.5, 0.4), enabled: true
    },
    {
      id: 'ram-push', col: 'left', row: 1,
      icon: '➡️', label: 'WEST, NORTH, SOUTH',
      body: 'The ram pushed westward, northward, and southward, conquering territories until no beast could stand before its military power.',
      anchor: new THREE.Vector3(-0.48, 1.05, 0.42), enabled: true
    },
    {
      id: 'ram-named', col: 'left', row: 2,
      icon: '📖', label: 'NAMED BY GABRIEL',
      body: 'The angel Gabriel explicitly declared in Daniel 8:20 that the two-horned ram represents the kings of Media and Persia.',
      anchor: new THREE.Vector3(-0.42, 0.55, 0.4), enabled: true
    },
    {
      id: 'ram-silver', col: 'right', row: 0,
      icon: '🛡️', label: 'SILVER PARALLEL',
      body: 'The ram portrays the same Medo-Persian empire represented by the silver chest of Daniel 2 and the lopsided bear of Daniel 7.',
      anchor: new THREE.Vector3(0.48, 1.45, 0.38), enabled: true
    },
    {
      id: 'ram-ulai', col: 'right', row: 1,
      icon: '🌊', label: 'ULAI / SUSA',
      body: 'Daniel received this prophetic vision beside the Ulai River in the fortress city of Susa during the third year of King Belshazzar.',
      anchor: new THREE.Vector3(0.45, 1.05, 0.4), enabled: true
    },
    {
      id: 'ram-tak', col: 'right', row: 2,
      icon: '✨', label: 'KEY TAKEAWAY',
      body: 'Daniel 8 removes prophetic ambiguity by explicitly identifying the two-horned ram as the Medo-Persian empire.',
      anchor: new THREE.Vector3(0.42, 0.55, 0.42), enabled: true
    }
  ],
  goat: [
    {
      id: 'goat-west', col: 'left', row: 0,
      icon: '💨', label: 'FROM THE WEST',
      body: 'The goat moving without touching the ground depicts the swift westward-to-east conquests of Alexander the Great. (Daniel 8:5)',
      anchor: new THREE.Vector3(-0.5, 1.5, 0.38), enabled: true
    },
    {
      id: 'goat-horn', col: 'left', row: 1,
      icon: '📯', label: 'THE NOTABLE HORN',
      body: 'The prominent horn between the goat’s eyes represents Greece’s first supreme monarch, Alexander the Great. (Daniel 8:21)',
      anchor: new THREE.Vector3(-0.48, 1.05, 0.42), enabled: true
    },
    {
      id: 'goat-ram', col: 'left', row: 2,
      icon: '⚔️', label: 'BREAKING THE RAM',
      body: 'The goat charged the ram with furious power at the Battle of Gaugamela in 331 BC, shattering Persian resistance.',
      anchor: new THREE.Vector3(-0.42, 0.55, 0.4), enabled: true
    },
    {
      id: 'goat-named', col: 'right', row: 0,
      icon: '📖', label: 'KING OF GRECIA',
      body: 'The angel Gabriel explicitly named Greece as the goat.',
      anchor: new THREE.Vector3(0.5, 1.45, 0.38), enabled: true
    },
    {
      id: 'goat-bronze', col: 'right', row: 1,
      icon: '🥉', label: 'BRONZE PARALLEL',
      body: 'The bronze thighs of Daniel 2, the leopard of Daniel 7, and the charging goat of Daniel 8 all depict the Grecian empire.',
      anchor: new THREE.Vector3(0.48, 1.05, 0.4), enabled: true
    },
    {
      id: 'goat-tak', col: 'right', row: 2,
      icon: '✨', label: 'KEY TAKEAWAY',
      body: 'The notable horn portrays Alexander the Great, whose brilliant conquests ended abruptly with his unexpected death.',
      anchor: new THREE.Vector3(0.45, 0.55, 0.42), enabled: true
    }
  ],
  goat_broken: [
    {
      id: 'brk-strong', col: 'left', row: 0,
      icon: '💔', label: 'BROKEN AT ZENITH',
      body: 'The great horn broke at the height of its power when Alexander the Great died suddenly in Babylon in 323 BC. (Daniel 8:8)',
      anchor: new THREE.Vector3(-0.48, 1.5, 0.4), enabled: true
    },
    {
      id: 'brk-four', col: 'left', row: 1,
      icon: '4️⃣', label: 'FOUR NOTABLE ONES',
      body: 'Four general officers divided the empire into separate kingdoms: Cassander, Lysimachus, Seleucus, and Ptolemy. (Daniel 8:22)',
      anchor: new THREE.Vector3(-0.5, 1.05, 0.42), enabled: true
    },
    {
      id: 'brk-heads', col: 'left', row: 2,
      icon: '🐆', label: 'FOUR HEADS',
      body: 'The four horns correspond to the four heads of the leopard in Daniel 7, depicting the division of Greece after Alexander.',
      anchor: new THREE.Vector3(-0.42, 0.55, 0.4), enabled: true
    },
    {
      id: 'brk-bib', col: 'right', row: 0,
      icon: '📖', label: 'DANIEL 8:8, 22',
      body: 'Gabriel explained that four kingdoms would arise from the Grecian nation, but none would possess Alexander’s personal power.',
      anchor: new THREE.Vector3(0.48, 1.45, 0.38), enabled: true
    },
    {
      id: 'brk-west', col: 'right', row: 1,
      icon: '🛡️', label: 'FALL TO ROME',
      body: 'As the four Hellenistic realms fought among themselves, the rising power of Rome conquered them, culminating at Pydna in 168 BC.',
      anchor: new THREE.Vector3(0.45, 1.05, 0.4), enabled: true
    },
    {
      id: 'brk-tak', col: 'right', row: 2,
      icon: '✨', label: 'KEY TAKEAWAY',
      body: 'Alexander’s sudden death fragmented Greece into four smaller kingdoms that were ultimately absorbed by Rome.',
      anchor: new THREE.Vector3(0.42, 0.55, 0.42), enabled: true
    }
  ],
  goat_horn: [
    {
      id: 'gh-exceed', col: 'left', row: 0,
      icon: '📈', label: 'EXCEEDING GREAT',
      body: 'The little horn expanded toward the south, the east, and the holy land, growing exceeding great as Imperial and papal Rome. (Daniel 8:9)',
      anchor: new THREE.Vector3(-0.48, 1.55, 0.4), enabled: true
    },
    {
      id: 'gh-tamid', col: 'left', row: 1,
      icon: '🕯️', label: 'THE DAILY TAKEN',
      body: 'This power obscured Christ’s daily heavenly priestly ministry, called the tamid in Hebrew, and attacked the sanctuary of God.',
      anchor: new THREE.Vector3(-0.5, 1.1, 0.42), enabled: true
    },
    {
      id: 'gh-end', col: 'left', row: 2,
      icon: '⏳', label: 'THE END TIME',
      body: 'The angel Gabriel declared that the vision reaches to the time of the end, extending far beyond the ancient Syrian king Antiochus IV.',
      anchor: new THREE.Vector3(-0.42, 0.55, 0.4), enabled: true
    },
    {
      id: 'gh-bib', col: 'right', row: 0,
      icon: '📖', label: 'DANIEL 8:14',
      body: 'Daniel 8:14 foretells that after 2,300 prophetic days, the sanctuary would be cleansed and restored to its rightful state.',
      anchor: new THREE.Vector3(0.5, 1.5, 0.38), enabled: true
    },
    {
      id: 'gh-1844', col: 'right', row: 1,
      icon: '📅', label: '1844',
      body: 'Applying the year-day principle from the Persian decree in 457 BC, the 2,300 prophetic years conclude in 1844.',
      anchor: new THREE.Vector3(0.48, 1.05, 0.4), enabled: true
    },
    {
      id: 'gh-tak', col: 'right', row: 2,
      icon: '✨', label: 'KEY TAKEAWAY',
      body: 'The little horn of Daniel 8 depicts Rome attacking Christ’s heavenly priesthood until the sanctuary is cleansed at the end of the 2,300 days.',
      anchor: new THREE.Vector3(0.45, 0.55, 0.42), enabled: true
    }
  ],
  dura: [
    {
      id: 'dura-gold', col: 'left', row: 0,
      icon: '🥇', label: 'ALL GOLD',
      body: 'By covering the entire statue in gold, Nebuchadnezzar defied God’s revelation that Babylon would eventually fall. (Daniel 3:1)',
      anchor: new THREE.Vector3(-0.4, 1.7, 0.4), enabled: true
    },
    {
      id: 'dura-six', col: 'left', row: 1,
      icon: '6️⃣', label: '60 BY 6',
      body: 'The statue measured sixty cubits high and six cubits wide (Daniel 3:1), prefiguring the human pride and coerced worship test described in Revelation 13:18.',
      anchor: new THREE.Vector3(-0.45, 1.15, 0.42), enabled: true
    },
    {
      id: 'dura-bow', col: 'left', row: 2,
      icon: '🎵', label: 'THE DECREE',
      body: 'The royal herald commanded all people to bow before the golden image at the sound of the musical instruments or be cast into the fire.',
      anchor: new THREE.Vector3(-0.42, 0.55, 0.4), enabled: true
    },
    {
      id: 'dura-three', col: 'right', row: 0,
      icon: '🔥', label: 'THE FIERY FURNACE',
      body: 'Shadrach, Meshach, and Abednego remained faithful to God, who delivered them unharmed as a divine fourth figure walked in the furnace.',
      anchor: new THREE.Vector3(0.45, 1.65, 0.38), enabled: true
    },
    {
      id: 'dura-rev', col: 'right', row: 1,
      icon: '📖', label: 'REVELATION 13',
      body: 'The decree to worship the golden image prefigures the end-time testing described in Revelation 13 regarding coerced false worship.',
      anchor: new THREE.Vector3(0.48, 1.1, 0.4), enabled: true
    },
    {
      id: 'dura-tak', col: 'right', row: 2,
      icon: '✨', label: 'KEY TAKEAWAY',
      body: 'King Nebuchadnezzar demanded absolute religious conformity, but God miraculously vindicated the three Hebrews who refused to worship his idol.',
      anchor: new THREE.Vector3(0.42, 0.55, 0.42), enabled: true
    }
  ],
  ancient: [
    {
      id: 'anc-throne', col: 'left', row: 0,
      icon: '⚖️', label: 'THRONES SET',
      body: 'Daniel saw heavenly thrones placed and the Ancient of Days seated as the celestial court convened. (Daniel 7:9-10)',
      anchor: new THREE.Vector3(-0.42, 1.6, 0.4), enabled: true
    },
    {
      id: 'anc-wool', col: 'left', row: 1,
      icon: '🤍', label: 'HAIR LIKE WOOL',
      body: 'The Ancient of Days appeared with garments white as snow and hair like pure wool, signifying eternal purity and divine wisdom.',
      anchor: new THREE.Vector3(-0.45, 1.1, 0.42), enabled: true
    },
    {
      id: 'anc-fire', col: 'left', row: 2,
      icon: '🔥', label: 'FIERY FLAME',
      body: 'His throne blazed with fiery flames and burning wheels, representing God’s absolute justice and cleansing holiness.',
      anchor: new THREE.Vector3(-0.4, 0.55, 0.4), enabled: true
    },
    {
      id: 'anc-books', col: 'right', row: 0,
      icon: '📚', label: 'THE BOOKS',
      body: 'The heavenly court sat in session and the books of record were opened to examine the conduct of earthly powers.',
      anchor: new THREE.Vector3(0.48, 1.55, 0.38), enabled: true
    },
    {
      id: 'anc-1844', col: 'right', row: 1,
      icon: '📅', label: 'PRE-ADVENT',
      body: 'This pre-advent judicial proceeding began in heaven at the close of the 2,300 prophetic days in 1844.',
      anchor: new THREE.Vector3(0.45, 1.05, 0.4), enabled: true
    },
    {
      id: 'anc-tak', col: 'right', row: 2,
      icon: '✨', label: 'KEY TAKEAWAY',
      body: 'Earthly empires are judged and stripped of dominion in heaven’s courtroom before Christ receives His everlasting kingdom.',
      anchor: new THREE.Vector3(0.42, 0.55, 0.42), enabled: true
    }
  ],
  son: [
    {
      id: 'son-clouds', col: 'left', row: 0,
      icon: '☁️', label: 'CLOUDS OF HEAVEN',
      body: 'One like the Son of man arrives with the clouds of heaven to enter the presence of the Ancient of Days. (Daniel 7:13)',
      anchor: new THREE.Vector3(-0.42, 1.55, 0.4), enabled: true
    },
    {
      id: 'son-title', col: 'left', row: 1,
      icon: '✝️', label: 'SON OF MAN',
      body: 'Jesus frequently referred to Himself as the Son of man, pointing to His role as the divine recipient of this eternal kingdom.',
      anchor: new THREE.Vector3(-0.45, 1.08, 0.42), enabled: true
    },
    {
      id: 'son-kingdom', col: 'left', row: 2,
      icon: '👑', label: 'DOMINION GIVEN',
      body: 'The Son of man is given everlasting dominion, glory, and a kingdom that will never pass away or be destroyed. (Daniel 7:14)',
      anchor: new THREE.Vector3(-0.4, 0.55, 0.4), enabled: true
    },
    {
      id: 'son-saints', col: 'right', row: 0,
      icon: '📖', label: 'THE SAINTS',
      body: 'Following the judgment, the saints of the Most High inherit the kingdom and reign under Christ forever.',
      anchor: new THREE.Vector3(0.48, 1.5, 0.38), enabled: true
    },
    {
      id: 'son-stone', col: 'right', row: 1,
      icon: '🪨', label: 'THE STONE',
      body: 'This heavenly transfer of authority corresponds to the stone of Daniel 2 striking the colossus and filling the earth.',
      anchor: new THREE.Vector3(0.45, 1.05, 0.4), enabled: true
    },
    {
      id: 'son-tak', col: 'right', row: 2,
      icon: '✨', label: 'KEY TAKEAWAY',
      body: 'Jesus receives royal authority before God’s throne in heaven, which will be fully established on earth at His Second Coming.',
      anchor: new THREE.Vector3(0.42, 0.55, 0.42), enabled: true
    }
  ],
  stump: [
    {
      id: 'stump-tree', col: 'left', row: 0,
      icon: '🌳', label: 'THE TREE',
      body: 'In Daniel 4, a holy watcher commanded the towering tree of Nebuchadnezzar’s empire to be chopped down to humble the king.',
      anchor: new THREE.Vector3(-0.42, 1.4, 0.4), enabled: true
    },
    {
      id: 'stump-band', col: 'left', row: 1,
      icon: '⛓️', label: 'IRON AND BRASS',
      body: 'A band of iron and bronze bound the tree stump in the earth, ensuring that Nebuchadnezzar’s throne was reserved for his return.',
      anchor: new THREE.Vector3(-0.45, 1.0, 0.42), enabled: true
    },
    {
      id: 'stump-seven', col: 'left', row: 2,
      icon: '7️⃣', label: 'SEVEN TIMES',
      body: 'Seven ordinary years of madness passed over the king until he acknowledged that the Most High rules in the kingdom of men (Daniel 4:16, 25, 32).',
      anchor: new THREE.Vector3(-0.4, 0.5, 0.4), enabled: true
    },
    {
      id: 'stump-beast', col: 'right', row: 0,
      icon: '🐂', label: 'GRASS AS OXEN',
      body: 'Nebuchadnezzar lived among wild beasts and ate grass like oxen until he humbled his heart and praised the God of heaven.',
      anchor: new THREE.Vector3(0.45, 1.35, 0.38), enabled: true
    },
    {
      id: 'stump-gold', col: 'right', row: 1,
      icon: '🟡', label: 'THE HEAD LEARNS',
      body: 'The proud golden head of Babylon learned through personal suffering that earthly monarchs rule solely by divine permission.',
      anchor: new THREE.Vector3(0.48, 0.95, 0.4), enabled: true
    },
    {
      id: 'stump-tak', col: 'right', row: 2,
      icon: '✨', label: 'KEY TAKEAWAY',
      body: 'The banded stump demonstrates God’s mercy, preserving Nebuchadnezzar’s kingdom until the proud monarch learned humility.',
      anchor: new THREE.Vector3(0.42, 0.5, 0.42), enabled: true
    }
  ],
  ox_king: [
    {
      id: 'ox-feathers', col: 'left', row: 0,
      icon: '🪶', label: 'EAGLES’ FEATHERS',
      body: 'Daniel 4:33 says his hairs were grown like eagles’ feathers — the golden head wearing a beast’s covering until he lifted his eyes.',
      anchor: new THREE.Vector3(-0.42, 1.45, 0.4), enabled: true
    },
    {
      id: 'ox-claws', col: 'left', row: 1,
      icon: '🦅', label: 'BIRDS’ CLAWS',
      body: 'His nails were like birds’ claws. The sentence is written on the body so the court can see that pride dehumanizes a king.',
      anchor: new THREE.Vector3(-0.45, 1.05, 0.42), enabled: true
    },
    {
      id: 'ox-seven', col: 'left', row: 2,
      icon: '7️⃣', label: 'SEVEN TIMES',
      body: 'Seven times pass over him among the oxen. The stump is banded so the throne waits; the man must live the grass and the dew.',
      anchor: new THREE.Vector3(-0.4, 0.55, 0.4), enabled: true
    },
    {
      id: 'ox-dew', col: 'right', row: 0,
      icon: '💧', label: 'DEW OF HEAVEN',
      body: 'His body was wet with the dew of heaven. The field, not the palace roof, becomes the school where the Most High is confessed.',
      anchor: new THREE.Vector3(0.45, 1.4, 0.38), enabled: true
    },
    {
      id: 'ox-stump', col: 'right', row: 1,
      icon: '🌳', label: 'BESIDE THE STUMP',
      body: 'The ironbound stump is the reserved kingdom. This figure is the king who must become like the beasts before he rules again.',
      anchor: new THREE.Vector3(0.48, 0.95, 0.4), enabled: true
    },
    {
      id: 'ox-tak', col: 'right', row: 2,
      icon: '✨', label: 'KEY TAKEAWAY',
      body: 'A throne is safer in God’s keeping than in a boast. The ox-king learns that heaven assigns every kingdom.',
      anchor: new THREE.Vector3(0.42, 0.5, 0.42), enabled: true
    }
  ],
  michael: [
    {
      id: 'mic-prince', col: 'left', row: 0,
      icon: '⚔️', label: 'GREAT PRINCE',
      body: 'Michael is the great prince who stands for the children of Daniel’s people — the same helper named in the unseen war of chapter 10.',
      anchor: new THREE.Vector3(-0.42, 1.5, 0.4), enabled: true
    },
    {
      id: 'mic-stand', col: 'left', row: 1,
      icon: '🕊️', label: 'STANDS UP',
      body: 'In Daniel, “stand up” is the verb for a king taking power (11:2–4, 7, 20–21). Michael standing (12:1) is Christ assuming His royal stance; human probation closes, then a time of trouble follows.',
      anchor: new THREE.Vector3(-0.45, 1.1, 0.42), enabled: true
    },
    {
      id: 'mic-trouble', col: 'left', row: 2,
      icon: '🌩️', label: 'TIME OF TROUBLE',
      body: 'When He stands, probation closes; then a time of trouble such as never was since there was a nation — then deliverance.',
      anchor: new THREE.Vector3(-0.4, 0.55, 0.4), enabled: true
    },
    {
      id: 'mic-book', col: 'right', row: 0,
      icon: '📖', label: 'WRITTEN IN THE BOOK',
      body: 'Those delivered are the ones found written in the book. The last gift of Daniel is a name, not another metal.',
      anchor: new THREE.Vector3(0.45, 1.45, 0.38), enabled: true
    },
    {
      id: 'mic-wake', col: 'right', row: 1,
      icon: '🌅', label: 'DUST-SLEEPERS',
      body: 'Daniel 12:2 promises that many who sleep in the dust of the earth shall awake — some to everlasting life.',
      anchor: new THREE.Vector3(0.48, 1.0, 0.4), enabled: true
    },
    {
      id: 'mic-tak', col: 'right', row: 2,
      icon: '✨', label: 'KEY TAKEAWAY',
      body: 'The book ends with a Prince who stands, probation closed, a time of trouble, a people written in a book, and a bodily resurrection.',
      anchor: new THREE.Vector3(0.42, 0.5, 0.42), enabled: true
    }
  ],
  sealed: [
    {
      id: 'seal-shut', col: 'left', row: 0,
      icon: '🔒', label: 'SHUT UP THE WORDS',
      body: 'Daniel is told to shut up the words. The visions are not a puzzle for every age to reopen at will.',
      anchor: new THREE.Vector3(-0.42, 1.45, 0.4), enabled: true
    },
    {
      id: 'seal-book', col: 'left', row: 1,
      icon: '📜', label: 'SEAL THE BOOK',
      body: 'Seal the book even to the time of the end. Chapter 12:9 repeats that the words are closed up and sealed.',
      anchor: new THREE.Vector3(-0.45, 1.05, 0.42), enabled: true
    },
    {
      id: 'seal-end', col: 'left', row: 2,
      icon: '⏳', label: 'TIME OF THE END',
      body: 'Understanding waits until the measured spans reach their dates. The wise understand when history meets the numbers.',
      anchor: new THREE.Vector3(-0.4, 0.55, 0.4), enabled: true
    },
    {
      id: 'seal-run', col: 'right', row: 0,
      icon: '👣', label: 'RUN TO AND FRO',
      body: 'Many shall run to and fro, and knowledge shall be increased — search increases when the seal’s time arrives.',
      anchor: new THREE.Vector3(0.45, 1.4, 0.38), enabled: true
    },
    {
      id: 'seal-wise', col: 'right', row: 1,
      icon: '⭐', label: 'THE WISE',
      body: 'None of the wicked shall understand, but the wise shall understand. The seal is mercy against premature charts.',
      anchor: new THREE.Vector3(0.48, 0.95, 0.4), enabled: true
    },
    {
      id: 'seal-tak', col: 'right', row: 2,
      icon: '✨', label: 'KEY TAKEAWAY',
      body: 'The scroll stays sealed until the time of the end, then the same book that was shut is opened for the wise.',
      anchor: new THREE.Vector3(0.42, 0.5, 0.42), enabled: true
    }
  ],
  kings: [
    {
      id: 'kings-south', col: 'left', row: 0,
      icon: '⬇️', label: 'KING OF THE SOUTH',
      body: 'Daniel 11:5: the king of the south shall be strong. First this is Ptolemaic Egypt after Alexander’s horn is broken.',
      anchor: new THREE.Vector3(-0.42, 1.4, 0.35), enabled: true
    },
    {
      id: 'kings-north', col: 'left', row: 1,
      icon: '⬆️', label: 'KING OF THE NORTH',
      body: 'One of his princes becomes stronger and holds a great dominion — the Seleucid north, then later powers wearing the same title.',
      anchor: new THREE.Vector3(-0.45, 1.05, 0.38), enabled: true
    },
    {
      id: 'kings-march', col: 'left', row: 2,
      icon: '📅', label: 'DATED MARCH',
      body: 'Marriages, betrayals, and wars fill the chapter as a survey of kings, not a new metal in the colossus.',
      anchor: new THREE.Vector3(-0.4, 0.55, 0.4), enabled: true
    },
    {
      id: 'kings-end', col: 'right', row: 0,
      icon: '🌪️', label: 'TIME OF THE END',
      body: 'At the time of the end the south pushes and the north comes like a whirlwind with chariots, horsemen, and ships.',
      anchor: new THREE.Vector3(0.45, 1.35, 0.35), enabled: true
    },
    {
      id: 'kings-holy', col: 'right', row: 1,
      icon: '⛰️', label: 'HOLY MOUNTAIN',
      body: 'The north plants tabernacles toward the glorious holy mountain, then comes to his end with none to help him.',
      anchor: new THREE.Vector3(0.48, 0.95, 0.38), enabled: true
    },
    {
      id: 'kings-tak', col: 'right', row: 2,
      icon: '✨', label: 'KEY TAKEAWAY',
      body: 'North and south are titles that run from the Diadochi to the last contest, then yield to Michael standing up.',
      anchor: new THREE.Vector3(0.42, 0.5, 0.4), enabled: true
    }
  ],
  decree: [
    {
      id: 'dec-king', col: 'left', row: 0,
      icon: '👑', label: 'ARTAXERXES I',
      body: 'Ezra 7 names Artaxerxes king of kings. The seventh year of his reign is the year the fullest restoration decree goes forth.',
      anchor: new THREE.Vector3(-0.42, 1.45, 0.4), enabled: true
    },
    {
      id: 'dec-ezra', col: 'left', row: 1,
      icon: '📜', label: 'EZRA 7:13',
      body: 'I make a decree: whoever of Israel, priests, and Levites is minded to go up to Jerusalem may go. The letter is law, not a wish.',
      anchor: new THREE.Vector3(-0.45, 1.05, 0.42), enabled: true
    },
    {
      id: 'dec-city', col: 'left', row: 2,
      icon: '🧱', label: 'RESTORE AND BUILD',
      body: 'Daniel 9:25 looks for a commandment that restores Jerusalem as a city — street and wall — not only the temple house.',
      anchor: new THREE.Vector3(-0.4, 0.55, 0.4), enabled: true
    },
    {
      id: 'dec-weeks', col: 'right', row: 0,
      icon: '7️⃣', label: 'SEVENTY WEEKS',
      body: 'Seventy weeks are cut off from the 2,300 for Daniel’s people and the holy city. The going forth starts both clocks.',
      anchor: new THREE.Vector3(0.45, 1.4, 0.38), enabled: true
    },
    {
      id: 'dec-messiah', col: 'right', row: 1,
      icon: '✝️', label: 'MESSIAH THE PRINCE',
      body: 'Sixty-nine weeks of years from 457 BC reach the anointing of Messiah. The midst of the seventieth week is His cutting off.',
      anchor: new THREE.Vector3(0.48, 0.95, 0.4), enabled: true
    },
    {
      id: 'dec-tak', col: 'right', row: 2,
      icon: '✨', label: 'KEY TAKEAWAY',
      body: 'Work 457 + 483 on paper. The decree is why Daniel 9 can name a Person and a date from the same line.',
      anchor: new THREE.Vector3(0.42, 0.5, 0.42), enabled: true
    }
  ]
};

// Auto-generate generic feature nodes for other pieces if not explicitly listed
export function nodeUnlocked(node, assetKey) {
  if (!window.BAJourney || typeof window.BAJourney.canAccessMuseumNode !== "function") return true;
  return window.BAJourney.canAccessMuseumNode(node.id, assetKey);
}

export function getNodeDataForAsset(key) {
  let rows;
  if (ASSET_REGISTRY[key] && ASSET_REGISTRY[key].still) rows = [];
  else if (MUSEUM_NODES_DATA[key]) rows = MUSEUM_NODES_DATA[key];
  else {
    const d = ASSET_REGISTRY[key] || ASSET_REGISTRY.head;
    rows = [
      {
        id: `${key}-mat`, col: 'left', row: 0,
        icon: '🟡', label: 'PROPHETIC METAL',
        body: `${d.title} embodying ${d.eyebrow}. Reflected in Daniel 2 prophecy.`,
        anchor: new THREE.Vector3(-0.4, 1.4, 0.35), enabled: true
      },
      {
        id: `${key}-era`, col: 'left', row: 1,
        icon: '📅', label: 'HISTORICAL ERA',
        body: `${d.dates}. Documented across ancient biblical and secular annals.`,
        anchor: new THREE.Vector3(-0.45, 1.05, 0.4), enabled: true
      },
      {
        id: `${key}-geo`, col: 'left', row: 2,
        icon: '🏛️', label: 'GEOMETRY & FORM',
        body: 'Reconstructed 3D geometry with high-fidelity PBR metallic textures.',
        anchor: new THREE.Vector3(-0.45, 0.65, 0.45), enabled: true
      },
      {
        id: `${key}-bib`, col: 'right', row: 0,
        icon: '📖', label: 'SCRIPTURE TEXT',
        body: d.quote,
        anchor: new THREE.Vector3(0.4, 1.4, 0.35), enabled: true
      },
      {
        id: `${key}-emp`, col: 'right', row: 1,
        icon: '👑', label: 'WORLD EMPIRE',
        body: d.explanation,
        anchor: new THREE.Vector3(0.45, 1.05, 0.4), enabled: true
      },
      {
        id: `${key}-tak`, col: 'right', row: 2,
        icon: '✨', label: 'KEY TAKEAWAY',
        body: d.takeaway,
        anchor: new THREE.Vector3(0.45, 0.65, 0.45), enabled: true
      }
    ];
  }
  return rows.filter((node) => nodeUnlocked(node, key));
}

export const MAP_YEAR_FOR_ASSET = {
  head: 'y605', chest: 'y539', thighs: 'y331', legs: 'y168', feet: 'y538',
  stone: 'y1844', assembled: 'y605',
  lion: 'y605', bear: 'y539', leopard: 'y331', beast: 'y538', years1260: 'y538',
  ram: 'y539', goat: 'y331', goat_broken: 'y331', goat_horn: 'y168',
  dura: 'y605', stump: 'y605', ox_king: 'y605',
  ancient: 'y1844', son: 'y1844',
  decree: 'y457', kings: 'y331', michael: 'y12', sealed: 'y12'
};

// Previous / Next artifact arrows
export const artifactOrder = ['assembled', 'head', 'chest', 'thighs', 'legs', 'feet', 'stone', 'lion', 'bear', 'leopard', 'beast', 'years1260', 'ram', 'goat', 'goat_broken', 'goat_horn', 'dura', 'stump', 'ox_king', 'ancient', 'son', 'decree', 'kings', 'michael', 'sealed'];
