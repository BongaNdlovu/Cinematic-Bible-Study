/*
 * Adds Philippians 2 to bible/kjv.json, which held only the chapters the course
 * actually cites. Sitting 4's reference list now carries Philippians 2:5–11 for
 * the "King of Glory" column of its comparison diagram, and the repository's own
 * quote checkers (verify_verify_pack_quotes.mjs, verify_onevoice27.mjs) can only
 * verify what is in the corpus.
 *
 * The verses are the 1769 public-domain KJV text with the italic supplied-word
 * markers removed, matching how the rest of the file is stored. The book is
 * inserted in canonical order, between Ephesians and Colossians.
 *
 * Run once: node tools/kjv-add-philippians2.mjs
 */
import fs from 'fs';

const PATH = 'bible/kjv.json';

const CHAPTER = {
  1: 'Paul and Timotheus, the servants of Jesus Christ, to all the saints in Christ Jesus which are at Philippi, with the bishops and deacons:',
  2: 'Grace be unto you, and peace, from God our Father, and from the Lord Jesus Christ.',
  3: 'I thank my God upon every remembrance of you,',
  4: 'Always in every prayer of mine for you all making request with joy,',
  5: 'For your fellowship in the gospel from the first day until now;',
  6: 'Being confident of this very thing, that he which hath begun a good work in you will perform it until the day of Jesus Christ:',
  7: 'Even as it is meet for me to think this of you all, because I have you in my heart; inasmuch as both in my bonds, and in the defence and confirmation of the gospel, ye all are partakers of my grace.',
  8: 'For God is my record, how greatly I long after you all in the bowels of Jesus Christ.',
  9: 'And this I pray, that your love may abound yet more and more in knowledge and in all judgment;',
  10: 'That ye may approve things that are excellent; that ye may be sincere and without offence till the day of Christ;',
  11: 'Being filled with the fruits of righteousness, which are by Jesus Christ, unto the glory and praise of God.',
  12: 'But I would ye should understand, brethren, that the things which happened unto me have fallen out rather unto the furtherance of the gospel;',
  13: 'So that my bonds in Christ are manifest in all the palace, and in all other places;',
  14: 'And many of the brethren in the Lord, waxing confident by my bonds, are much more bold to speak the word without fear.',
  15: 'Some indeed preach Christ even of envy and strife; and some also of good will:',
  16: 'The one preach Christ of contention, not sincerely, supposing to add affliction to my bonds:',
  17: 'But the other of love, knowing that I am set for the defence of the gospel.',
  18: 'What then? notwithstanding, every way, whether in pretence, or in truth, Christ is preached; and I therein do rejoice, yea, and will rejoice.',
  19: 'For I know that this shall turn to my salvation through your prayer, and the supply of the Spirit of Jesus Christ,',
  20: 'According to my earnest expectation and my hope, that in nothing I shall be ashamed, but that with all boldness, as always, so now also Christ shall be magnified in my body, whether it be by life, or by death.',
  21: 'For to me to live is Christ, and to die is gain.',
  22: 'But if I live in the flesh, this is the fruit of my labour: yet what I shall choose I wot not.',
  23: 'For I am in a strait betwixt two, having a desire to depart, and to be with Christ; which is far better:',
  24: 'Nevertheless to abide in the flesh is more needful for you.',
  25: 'And having this confidence, I know that I shall abide and continue with you all for your furtherance and joy of faith;',
  26: 'That your rejoicing may be more abundant in Jesus Christ for me by my coming to you again.',
  27: 'Only let your conversation be as it becometh the gospel of Christ: that whether I come and see you, or else be absent, I may hear of your affairs, that ye stand fast in one spirit, with one mind striving together for the faith of the gospel;',
  28: 'And in nothing terrified by your adversaries: which is to them an evident token of perdition, but to you of salvation, and that of God.',
  29: 'For unto you it is given in the behalf of Christ, not only to believe on him, but also to suffer for his sake;',
  30: 'Having the same conflict which ye saw in me, and now hear to be in me.',
};

const CHAPTER_2 = {
  1: 'If there be therefore any consolation in Christ, if any comfort of love, if any fellowship of the Spirit, if any bowels and mercies,',
  2: 'Fulfil ye my joy, that ye be likeminded, having the same love, being of one accord, of one mind.',
  3: 'Let nothing be done through strife or vainglory; but in lowliness of mind let each esteem other better than themselves.',
  4: 'Look not every man on his own things, but every man also on the things of others.',
  5: 'Let this mind be in you, which was also in Christ Jesus:',
  6: 'Who, being in the form of God, thought it not robbery to be equal with God:',
  7: 'But made himself of no reputation, and took upon him the form of a servant, and was made in the likeness of men:',
  8: 'And being found in fashion as a man, he humbled himself, and became obedient unto death, even the death of the cross.',
  9: 'Wherefore God also hath highly exalted him, and given him a name which is above every name:',
  10: 'That at the name of Jesus every knee should bow, of things in heaven, and things in earth, and things under the earth;',
  11: 'And that every tongue should confess that Jesus Christ is Lord, to the glory of God the Father.',
  12: 'Wherefore, my beloved, as ye have always obeyed, not as in my presence only, but now much more in my absence, work out your own salvation with fear and trembling.',
  13: 'For it is God which worketh in you both to will and to do of his good pleasure.',
  14: 'Do all things without murmurings and disputings:',
  15: 'That ye may be blameless and harmless, the sons of God, without rebuke, in the midst of a crooked and perverse nation, among whom ye shine as lights in the world;',
  16: 'Holding forth the word of life; that I may rejoice in the day of Christ, that I have not run in vain, neither laboured in vain.',
  17: 'Yea, and if I be offered upon the sacrifice and service of your faith, I joy, and rejoice with you all.',
  18: 'For the same cause also do ye joy, and rejoice with me.',
  19: 'But I trust in the Lord Jesus to send Timotheus shortly unto you, that I also may be of good comfort, when I know your state.',
  20: 'For I have no man likeminded, who will naturally care for your state.',
  21: 'For all seek their own, not the things which are Jesus Christ\u2019s.',
  22: 'But ye know the proof of him, that, as a son with the father, he hath served with me in the gospel.',
  23: 'Him therefore I hope to send presently, so soon as I shall see how it will go with me.',
  24: 'But I trust in the Lord that I also myself shall come shortly.',
  25: 'Yet I supposed it necessary to send to you Epaphroditus, my brother, and companion in labour, and fellowsoldier, but your messenger, and he that ministered to my wants.',
  26: 'For he longed after you all, and was full of heaviness, because that ye had heard that he had been sick.',
  27: 'For indeed he was sick nigh unto death: but God had mercy on him; and not on him only, but on me also, lest I should have sorrow upon sorrow.',
  28: 'I sent him therefore the more carefully, that, when ye see him again, ye may rejoice, and that I may be the less sorrowful.',
  29: 'Receive him therefore in the Lord with all gladness; and hold such in reputation:',
  30: 'Because for the work of Christ he was nigh unto death, not regarding his life, to supply your lack of service toward me.',
};

// Canonical order, so the corpus stays readable. The local file is a subset of
// the KJV, so the insertion point is the last book that precedes Philippians in
// the canon rather than a neighbour like Ephesians, which this file does not hold.
const CANON = [
  'Genesis', 'Exodus', 'Leviticus', 'Numbers', 'Deuteronomy', 'Joshua', 'Judges', 'Ruth', '1 Samuel', '2 Samuel',
  '1 Kings', '2 Kings', '1 Chronicles', '2 Chronicles', 'Ezra', 'Nehemiah', 'Esther', 'Job', 'Psalms', 'Proverbs',
  'Ecclesiastes', 'Song of Solomon', 'Isaiah', 'Jeremiah', 'Lamentations', 'Ezekiel', 'Daniel', 'Hosea', 'Joel', 'Amos',
  'Obadiah', 'Jonah', 'Micah', 'Nahum', 'Habakkuk', 'Zephaniah', 'Haggai', 'Zechariah', 'Malachi', 'Matthew', 'Mark',
  'Luke', 'John', 'Acts', 'Romans', '1 Corinthians', '2 Corinthians', 'Galatians', 'Ephesians', 'Philippians',
  'Colossians', '1 Thessalonians', '2 Thessalonians', '1 Timothy', '2 Timothy', 'Titus', 'Philemon', 'Hebrews', 'James',
  '1 Peter', '2 Peter', '1 John', '2 John', '3 John', 'Jude', 'Revelation',
];

const raw = fs.readFileSync(PATH, 'utf8');
const data = JSON.parse(raw);
if (data.books.Philippians) {
  console.log('Philippians already present — nothing to do');
  process.exit(0);
}

const target = CANON.indexOf('Philippians');
const books = {};
let placed = false;
for (const [name, chapters] of Object.entries(data.books)) {
  const at = CANON.indexOf(name);
  if (!placed && at > target) { books.Philippians = { 1: CHAPTER, 2: CHAPTER_2 }; placed = true; }
  books[name] = chapters;
}
if (!placed) books.Philippians = { 1: CHAPTER, 2: CHAPTER_2 };
data.books = books;

fs.writeFileSync(PATH, JSON.stringify(data, null, 2) + '\n', 'utf8');
const check = JSON.parse(fs.readFileSync(PATH, 'utf8'));
const order = Object.keys(check.books);
console.log('wrote', PATH);
console.log('books:', order.length, '| Philippians at index', order.indexOf('Philippians'), 'of', order.length - 1);
console.log('Philippians chapters:', Object.keys(check.books.Philippians).join(','));
console.log('2:5 =>', check.books.Philippians['2']['5']);
console.log('2:11 =>', check.books.Philippians['2']['11']);
console.log('Daniel 4:30 still intact:', check.books.Daniel['4']['30'].slice(0, 40) + '...');
