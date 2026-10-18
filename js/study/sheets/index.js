(function () {
  'use strict';

  const sheetsData = [{"id":0,"epoch":"THE PROLOGUE","readTime":"16 min read","allocatedMinutes":16,"scripture":"Gabriel is told to make Daniel understand the vision (KJV Daniel 8:16; see also 9:23). How to read that vision is a separate question.","title":"The Prophetic Blueprint: Why Daniel's Unbroken Chain Centers on Jesus Christ","subtitle":"God's historical roadmap from exile to the cross to the everlasting kingdom — and why how you read decides what you see."},{"id":1,"epoch":"SHEET 01 &bull; DANIEL 1","readTime":"18 min read","allocatedMinutes":18,"scripture":"Daniel 1:1-21 &bull; Babylon, 605 B.C.","title":"The Exilic Crucible: Identity, Consecration, and the Redemptive Obedience of Christ","subtitle":"Sovereign exile, the battle for identity at Babylon's table, and how Daniel's stand points to the faithful Son."},{"id":2,"epoch":"SHEET 02 &bull; DANIEL 2","readTime":"20 min read","allocatedMinutes":20,"scripture":"Daniel 2:1-49 &bull; Babylon, second year of Nebuchadnezzar (Daniel 2:1)","title":"The Metallic Colossus: The Historicist Blueprint of History and the Sovereign Triumph of Christ","subtitle":"From the impasse of human wisdom to the stone that fills the earth — God's unbroken chain of empires and Christ's everlasting kingdom."},{"id":3,"epoch":"SHEET 03 &bull; DANIEL 3","readTime":"18 min read","allocatedMinutes":18,"scripture":"Daniel 3:1-30 &bull; Plain of Dura (Daniel 3 prints no year; a possible date is 594 B.C., reconstructed)","title":"The Plain of Dura: Forced Worship, the \"But If Not\" Faith, and Christ in the Fire","subtitle":"Nebuchadnezzar's imperial veto, the Daniel 3 / Revelation 13 blueprint, and the Fourth who walks in the flames."},{"id":4,"epoch":"SHEET 04 &bull; DANIEL 4","readTime":"18 min read","allocatedMinutes":18,"scripture":"Daniel 4:1-37 &bull; Babylon","title":"The Emperor in the Dust: Pride, Humiliation, and the Humility of Christ","subtitle":"A pagan king's open confession — pride, the humiliation Daniel describes, restored understanding, and Christ's humility."},{"id":5,"epoch":"SHEET 05 &bull; DANIEL 5","readTime":"18 min read","allocatedMinutes":18,"scripture":"Daniel 5:1-31 &bull; Babylon, the night the city fell (Daniel 5:30), 12 October 539 B.C.","title":"The Handwriting on the Plaster: The Fall of Babylon, the Divine Balance Sheet, and the Righteousness of Christ","subtitle":"Sacrilege against known light, Heaven's marketplace audit, and the only weight that can cover us."},{"id":6,"epoch":"SHEET 06 &bull; DANIEL 6","readTime":"18 min read","allocatedMinutes":18,"scripture":"Daniel 6:1-28 &bull; Babylon, c. 539 B.C.","title":"The Pit of Hunger: The Law of the Medes and Persians, The Open Window, and the Resurrection of Christ","subtitle":"The irrevocable imperial statute, blameless integrity under audit, prayer facing Jerusalem, and the sealed pit set beside the empty tomb."},{"id":7,"epoch":"SHEET 07 &bull; DANIEL 7","readTime":"20 min read","allocatedMinutes":20,"scripture":"Daniel 7:1-28 &bull; Babylon, c. 553 B.C.","title":"The Churning Sea & The Little Horn: The 1,260 Years to Judgment","subtitle":"The four predatory beasts, the church-state horn, the 1,260-year supremacy, and the pre-advent heavenly court."},{"id":8,"epoch":"SHEET 08 &bull; DANIEL 8","readTime":"22 min read","allocatedMinutes":22,"scripture":"Daniel 8:1-27 &bull; Shushan (Susa), c. 551 B.C. (some reckonings give 548/547)","title":"The Ram, The Goat, & 2,300 Days: The Cleansing of the Sanctuary","subtitle":"Gabriel's named empires, the attack on Christ's continual mediation (tamid), refutation of Antiochus, and the 1844 Day of Atonement in heaven."},{"id":9,"epoch":"SHEET 09 &bull; DANIEL 9","readTime":"22 min read","allocatedMinutes":22,"scripture":"Daniel 9:1-27 &bull; Babylon, the realm of the Chaldeans, 538 B.C.","title":"The 70 Weeks (Chathak) & The Cross: The Mathematical Anchor of 1844","subtitle":"How the crucifixion of Christ in A.D. 31 confirms a count that starts in 457 B.C. and reaches 1844."},{"id":10,"epoch":"SHEET 10 &bull; DANIEL 10-12","readTime":"22 min read","allocatedMinutes":22,"scripture":"Daniel 10:1 - 12:13 &bull; Hiddekel (the Tigris), 536/535 B.C.","title":"Michael Stands Up: The Time of Trouble & Bodily Resurrection","subtitle":"Michael stands for his people, the time of trouble, and the waking of the dust."}];

  const timelineEpochs = [{"year":"605 B.C.","title":"605 B.C. — Nebuchadnezzar's First Siege of Jerusalem","desc":"The beginning of the 70 years of Babylonian captivity prophesied by Jeremiah. Daniel and the Hebrew youth are taken captive to Babylon.","pioneerNote":"Daniel 1:1–2 dates the first deportation to Jehoiakim’s third year. BM 21946 (ABC 5) places Nebuchadnezzar in Hatti in his first year and later records the 597 siege of “the city of Judah.” Jeremiah 25:11–12 names the seventy years.","image":"assets/study/horizon/y605.jpg","history":"Nebuchadnezzar II takes Jerusalem in Jehoiakim’s third year. Temple vessels go to Marduk’s treasury. Royal youths, including Daniel, enter Babylon’s three-year court school.","prophecy":"Daniel 1:2 says the Lord gave Judah into his hand. The gold head of Daniel 2 is already on the stage. Captivity is not an accident; it is judgment and mission.","today":"Exile is the first classroom. Identity is tested before any vision is given. The book begins with a plate, not a dream."},{"year":"539 B.C.","title":"539 B.C. — Fall of Babylon to Medo-Persia","desc":"Cyrus diverts the Euphrates. Belshazzar's sacrilegious feast ends with the divine audit on the plaster. The second kingdom of silver assumes world dominion.","pioneerNote":"Daniel 5:25–31 numbers, weighs, and divides the gold kingdom that night. The Nabonidus Chronicle and Cyrus Cylinder record a swift transfer; Isaiah 45:1 had already named Cyrus and the gates.","image":"assets/study/horizon/y539.jpg","history":"Cyrus’s engineers lower the Euphrates. The city that called itself eternal falls in a night. The Nabonidus Chronicle and Cyrus Cylinder confirm a swift transfer of power.","prophecy":"The silver chest of Daniel 2 and the bear of Daniel 7 take the gold. Isaiah 45 had named Cyrus more than a century earlier.","today":"No empire is too gilded, too rich, or too sure of itself. The handwriting is already on the wall of every age that drinks from holy vessels."},{"year":"457 B.C.","title":"457 B.C. — The Decree of Artaxerxes Longimanus","desc":"Ezra 7 recording the decree to restore and rebuild Jerusalem. The exact starting anchor point for both the 70 Weeks (Daniel 9) and the 2,300 Days (Daniel 8:14).","pioneerNote":"Ezra 7:7, 13 — Artaxerxes’ seventh year funds the return and the house of God. Daniel 9:25 starts the seventy weeks from that going forth: 457 B.C. + 483 years = A.D. 27.","image":"assets/study/horizon/y457.jpg","history":"Artaxerxes I’s seventh-year decree (Ezra 7) funds temple worship and restores civic order in Judah — the third and complete decree after Cyrus and Darius.","prophecy":"This is the chathak point: 70 weeks cut from the 2,300 days. 457 B.C. + 483 years = A.D. 27; + 1810 remaining years = 1844.","today":"Prophecy is not fog. It is dated. The cross landed in A.D. 31, and the sanctuary appointment is on the same line."},{"year":"A.D. 31","title":"Spring A.D. 31 — The Crucifixion on Calvary ('Midst of the Week')","desc":"After 3.5 years of ministry, Christ our Passover is sacrificed. The veil tears from top to bottom; the earthly sacrificial system is completed in the Courtyard.","pioneerNote":"Daniel 9:26–27: Messiah is cut off, not for himself, and causes sacrifice to cease in the midst of the week. The temple veil tears at Passover — the week’s midpoint, not a later gap.","image":"assets/study/horizon/y31.jpg","history":"Jesus is crucified at Passover. The temple veil tears. Within a few years Stephen is stoned and the gospel turns to the nations — the close of the 70th week in A.D. 34.","prophecy":"Daniel 9:26–27: Messiah is cut off, not for Himself. He confirms the covenant for one week and causes sacrifice to cease in the midst of it.","today":"The 70th week is not a future Antichrist gap. It is Calvary. That reading keeps the rest of the line honest."},{"year":"538 A.D.","title":"538 A.D. — Commencing the 1,260 Years of Papal Supremacy","desc":"In 538 the Ostrogothic siege of Rome is lifted. Justinian's decree establishes the Bishop of Rome as the head of all churches. Christ ministers daily in the Holy Place.","pioneerNote":"Daniel 7:8, 24–25: a little horn uproots three and thinks to change times and laws. After the Heruli (493) and the Vandals (534), and once the Ostrogoths withdrew from Rome in 538 (not fully defeated until about 553), a church-state power sits among the ten.","image":"assets/study/horizon/y538.jpg","history":"After the Heruli fell in 493 and the Vandals in 534, and once the Ostrogoths withdrew from Rome in 538, Justinian’s ecclesiastical decree can take effect on this chart. They were not fully defeated until about 553. A church-state power sits among the ten horns.","prophecy":"Daniel 7:25 — a little horn speaks great words, wears out the saints, and thinks to change times and laws for a time, times, and half a time.","today":"The controversy is not only pagan. It is religious power that takes Christ’s daily priesthood and His law into its own hands."},{"year":"1798 A.D.","title":"1798 A.D. — The Deadly Wound / End of the 1260 Years","desc":"French General Berthier takes Pope Pius VI into captivity, ending the 1,260-year epoch of political-ecclesiastical supremacy. The 'Time of the End' begins.","pioneerNote":"Berthier takes Pius VI in 1798 — 1,260 years from 538. Daniel 7:25’s time, times, and dividing of time closes; Revelation 13 names the wound.","image":"assets/study/horizon/y1798.jpg","history":"Berthier enters Rome. Pius VI is taken captive. A political-religious supremacy that began in 538 is broken exactly 1,260 years later.","prophecy":"The deadly wound of Revelation 13 and the end of Daniel 7’s 1,260 days open “the time of the end,” when the sealed book is to be understood.","today":"The wound can heal. Historicism does not end in 1798; it warns that the same power returns with global reach."},{"year":"1844 A.D.","title":"1844 — Cleansing of the Sanctuary","desc":"22 October 1844: Christ entered the Most Holy Place. The 2,300 prophetic years conclude. The sanctuary of Daniel 8:14 is nitsdaq — put right — the Day-of-Atonement work whose court already sat in Daniel 7:9–14.","pioneerNote":"Daniel 8:14 + 9:24–27: 457 B.C. plus 2,300 years lands in 1844. Leviticus 16 fixes the Day of Atonement; Karaite reckoning dates it to 22 October 1844.","image":"assets/study/horizon/y1844.jpg","history":"The date was lived in America: Miller’s farm, Himes’s Boston press, Snow at Exeter, then the Great Disappointment. The expectation was wrong. The sanctuary put right is the heavenly Most Holy Place, not the earth.","prophecy":"Daniel 8:14 — unto 2,300 evenings-mornings, then shall the sanctuary be nitsdaq: justified, restored, vindicated.","today":"Judgment is not only a future throne. It is present high-priestly work. How we live now is already before the books."},{"year":"Dan 12","title":"Daniel 12 — Michael Stands Up & The Bodily Resurrection","desc":"When Michael stands up, human probation closes. A time of trouble follows. Those written in the book are delivered. The dead awake from the dust.","pioneerNote":"Daniel 12:1–2, 13: Michael stands up; probation closes; those written in the book are delivered; dust-sleepers awake; Daniel rests, then stands in his lot.","image":"assets/study/horizon/y12.jpg","history":"Daniel is told to rest. The last scene is not another empire but a standing Prince, a trouble such as never was, and sleepers who awake.","prophecy":"Daniel 12:1–2, 13. Michael stands up. The book is sealed until the time of the end. The wise shall understand.","today":"The scroll does not end in fear. It ends in a name written in a book, a rest, and a rising."}];

  const loaded = new Set();
  const waiting = new Map();

  function chunkPath(index) {
    const host = document.getElementById('study-chunks');
    return host ? host.getAttribute('data-sheet-' + index) || '' : '';
  }

  function hasBody(index) {
    const row = sheetsData[Number(index)];
    return !!(row && typeof row.content === 'string');
  }

  function isReady(index) {
    const at = Number(index);
    return loaded.has(at) && hasBody(at);
  }

  function put(index, sheet) {
    const at = Number(index);
    if (!sheet || at < 0 || at >= sheetsData.length) return;
    sheetsData[at] = sheet;
    loaded.add(at);
    const entry = waiting.get(at);
    if (entry) {
      waiting.delete(at);
      entry.resolve(sheet);
    }
  }

  function ensure(index) {
    const at = Number(index);
    if (!Number.isInteger(at) || at < 0 || at >= sheetsData.length) return Promise.reject(new Error('no sitting ' + index));
    if (isReady(at)) return Promise.resolve(sheetsData[at]);
    const known = waiting.get(at);
    if (known) return known.promise;
    const src = chunkPath(at);
    if (!src) return Promise.reject(new Error('no file for sitting ' + at));
    const entry = {};
    entry.promise = new Promise((resolve, reject) => {
      entry.resolve = resolve;
      entry.reject = reject;
    });
    waiting.set(at, entry);
    const tag = document.createElement('script');
    tag.src = src;
    tag.async = true;
    tag.addEventListener('load', () => {
      tag.remove();
      if (loaded.has(at)) return;
      waiting.delete(at);
      entry.reject(new Error('sitting ' + at + ' did not register'));
    });
    tag.addEventListener('error', () => {
      tag.remove();
      waiting.delete(at);
      entry.reject(new Error('sitting ' + at + ' failed to load'));
    });
    document.head.appendChild(tag);
    return entry.promise;
  }

  function whenIdle(fn) {
    if (typeof window.requestIdleCallback === 'function') window.requestIdleCallback(fn, { timeout: 4000 });
    else window.setTimeout(fn, 1200);
  }

  function prefetchAround(index) {
    const at = Number(index);
    whenIdle(() => {
      [at + 1, at - 1].forEach((n) => {
        if (n >= 0 && n < sheetsData.length && !loaded.has(n)) ensure(n).catch(() => {});
      });
    });
  }

  function startingGuess() {
    try {
      const params = new URLSearchParams(location.search);
      const raw = params.get('sheet') || params.get('s');
      if (raw != null && raw !== '' && /^\d+$/.test(raw)) return Number(raw);
      if (params.get('id') || params.get('section')) return -1;
      const saved = localStorage.getItem('daniel_historicist_sheet');
      if (saved != null && /^\d+$/.test(saved)) return Number(saved);
    } catch (e) {}
    return -1;
  }

  window.sheetsData = sheetsData;
  window.timelineEpochs = timelineEpochs;
  window.StudySheets = { ensure: ensure, isReady: isReady, put: put, prefetchAround: prefetchAround };

  const guess = startingGuess();
  if (guess >= 0 && guess < sheetsData.length) ensure(guess).catch(() => {});
})();
