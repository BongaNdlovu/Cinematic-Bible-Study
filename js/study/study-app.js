    // Sequential sittings: access is owned by BAJourney.canAccessSheet.

    // Sheet to Timeline mapping
    const sheetToTimelineMap = {
      0: 0, // Prologue -> 605 B.C.
      1: 0, // Daniel 1 -> 605 B.C.
      2: 0, // Daniel 2 -> 605 B.C.
      3: 0, // Daniel 3 -> 605 B.C.
      4: 0, // Daniel 4 -> Babylon
      5: 1, // Daniel 5 -> 539 B.C.
      6: 1, // Daniel 6 -> Medo-Persia
      7: 4, // Daniel 7 -> 538 A.D. & 1844
      8: 6, // Daniel 8 -> 1844 A.D. Cleansing
      9: 2, // Daniel 9 -> 457 B.C. Decree
      10: 7 // Daniel 10-12 -> Michael Stands Up
    };

    const timelineToSheetMap = {
      0: 0, // 605 B.C. -> prologue / exile
      1: 5, // 539 B.C. -> handwriting
      2: 9, // 457 B.C. -> seventy weeks
      3: 9, // A.D. 31 -> midst of the week on sheet 9
      4: 7, // 538 A.D. -> little horn
      5: 7, // 1798 A.D. -> close of the 1,260 on sheet 7
      6: 8, // 1844 A.D. -> sanctuary put right
      7: 10 // Dan 12 -> Michael stands
    };

    let currentEpochIndex = 0;

    function sheetBelongsToEpoch(sheetIdx, epochIdx) {
      if (sheetToTimelineMap[sheetIdx] === epochIdx) return true;
      return timelineToSheetMap[epochIdx] === sheetIdx;
    }

    function epochAccessible(epochIdx) {
      const target = timelineToSheetMap[epochIdx];
      if (typeof target !== 'number') return true;
      return canAccessSheet(target);
    }

    function syncHorizonLocks() {
      document.querySelectorAll('.horizon-card').forEach((card) => {
        const idx = Number(card.dataset.epoch);
        const open = epochAccessible(idx);
        card.classList.toggle('is-locked', !open);
        card.disabled = !open;
        if (open) {
          card.removeAttribute('aria-disabled');
          card.removeAttribute('title');
        } else {
          card.setAttribute('aria-disabled', 'true');
          if (window.BAJourney && typeof window.BAJourney.lockExplain === 'function') {
            const note = window.BAJourney.lockExplain('sheet', timelineToSheetMap[idx]);
            card.title = note.title + ' — ' + note.body;
          } else {
            card.title = 'Locked — finish the open sitting first';
          }
        }
      });
    }

    function stepHorizon(delta) {
      let idx = currentEpochIndex + delta;
      while (idx >= 0 && idx < timelineEpochs.length && !epochAccessible(idx)) idx += delta;
      if (idx >= 0 && idx < timelineEpochs.length && idx !== currentEpochIndex) setEpochInfo(idx);
    }

    function setEpochInfo(epochIdx, opts) {
      if (epochIdx < 0 || epochIdx >= timelineEpochs.length) return;
      const fromSheet = opts && opts.fromSheet;
      if (!fromSheet && !epochAccessible(epochIdx)) {
        denyLockedSitting(timelineToSheetMap[epochIdx]);
        return;
      }
      currentEpochIndex = epochIdx;
      const epoch = timelineEpochs[epochIdx];

      hideHorizonFloat();
      syncHorizonLocks();
      document.querySelectorAll('.horizon-card').forEach((card, i) => {
        const on = i === epochIdx;
        card.classList.toggle('is-active', on);
        card.setAttribute('aria-pressed', on ? 'true' : 'false');
      });
      const activeCard = document.getElementById(`t-node-${epochIdx}`);
      const track = document.getElementById('horizon-track');
      if (activeCard && track) {
        const left = activeCard.offsetLeft - (track.clientWidth - activeCard.clientWidth) / 2;
        track.scrollTo({ left: Math.max(0, left), behavior: 'smooth' });
      }
      const prev = document.getElementById('horizon-prev');
      const next = document.getElementById('horizon-next');
      if (prev) prev.disabled = epochIdx === 0;
      if (next) next.disabled = epochIdx === timelineEpochs.length - 1;

      // Update Horizon Exegesis Banner
      const tag = document.getElementById('active-epoch-tag');
      const title = document.getElementById('epoch-banner-title');
      const desc = document.getElementById('epoch-banner-desc');

      if (tag) tag.innerText = epoch.year;
      if (title) title.innerText = epoch.title;
      if (desc) desc.innerText = epoch.desc;

      const plate = document.getElementById('epoch-plate-img');
      const kicker = document.getElementById('epoch-plate-kicker');
      const ptitle = document.getElementById('epoch-plate-title');
      if (plate && epoch.image) plate.src = epoch.image;
      if (kicker) kicker.textContent = epoch.year;
      if (ptitle) ptitle.textContent = epoch.title.replace(epoch.year + ' — ', '');
      const h = document.getElementById('epoch-fact-history');
      const p = document.getElementById('epoch-fact-prophecy');
      const t = document.getElementById('epoch-fact-today');
      if (h) h.textContent = epoch.history || epoch.desc;
      if (p) p.textContent = epoch.prophecy || '';
      if (t) t.textContent = epoch.today || epoch.pioneerNote || '';

      // Update the contextual note in the focus dock
      updateFocusNote(epoch);

      if (studyMap) {
        const yearId = STUDY_EPOCH_TO_YEAR[epochIdx] || 'y605';
        studyMap.setYear(yearId, { animate: true, chapter: false, open: false });
      }

      if (!fromSheet && !sheetBelongsToEpoch(currentSheetIndex, epochIdx)) {
        const target = timelineToSheetMap[epochIdx];
        if (typeof target === 'number') {
          if (!canAccessSheet(target)) denyLockedSitting(target);
          else loadSheet(target, { fromEpoch: true });
        }
      }
    }

    function epochShortTitle(epoch) {
      const mark = ' — ';
      const i = epoch.title.indexOf(mark);
      return i >= 0 ? epoch.title.slice(i + mark.length) : epoch.title;
    }

    function hideHorizonFloat() {
      const float = document.getElementById('horizon-float');
      if (!float) return;
      float.classList.remove('is-on');
      float.hidden = true;
    }

    function showHorizonFloat(idx, card) {
      if (window.matchMedia && window.matchMedia('(hover: none)').matches) return;
      const float = document.getElementById('horizon-float');
      const rail = document.querySelector('.horizon-rail');
      if (!float || !rail || !card) return;
      const epoch = timelineEpochs[idx];
      const img = document.getElementById('horizon-float-img');
      const year = document.getElementById('horizon-float-year');
      const title = document.getElementById('horizon-float-title');
      if (img) img.src = epoch.image;
      if (year) year.textContent = epoch.year;
      if (title) title.textContent = epochShortTitle(epoch);
      float.hidden = false;
      const railBox = rail.getBoundingClientRect();
      const cardBox = card.getBoundingClientRect();
      const half = Math.min(140, railBox.width * 0.36);
      let left = cardBox.left - railBox.left + cardBox.width / 2;
      left = Math.max(half + 8, Math.min(railBox.width - half - 8, left));
      float.style.left = left + 'px';
      requestAnimationFrame(() => float.classList.add('is-on'));
    }

    function buildHorizonCards() {
      const track = document.getElementById('horizon-track');
      if (!track) return;
      track.innerHTML = timelineEpochs.map((ep, i) =>
        '<button type="button" class="horizon-card' + (i === 0 ? ' is-active' : '') +
        (epochAccessible(i) ? '' : ' is-locked') +
        '" id="t-node-' + i + '" data-epoch="' + i + '" aria-pressed="' + (i === 0 ? 'true' : 'false') + '"' +
        (epochAccessible(i) ? '' : ' disabled aria-disabled="true" title="Locked — finish the open sitting first"') + '>' +
        '<img src="' + ep.image + '" alt="' + ep.year + '">' +
        '<span class="horizon-card-veil"></span>' +
        '<span class="horizon-card-year">' + ep.year + '</span>' +
        '</button>'
      ).join('');
      track.querySelectorAll('.horizon-card').forEach((card) => {
        const idx = Number(card.dataset.epoch);
        card.addEventListener('click', () => {
          if (!epochAccessible(idx)) return;
          setEpochInfo(idx);
        });
        card.addEventListener('mouseenter', () => showHorizonFloat(idx, card));
        card.addEventListener('mouseleave', hideHorizonFloat);
        card.addEventListener('focus', () => showHorizonFloat(idx, card));
        card.addEventListener('blur', hideHorizonFloat);
      });
      const prev = document.getElementById('horizon-prev');
      const next = document.getElementById('horizon-next');
      if (prev) prev.addEventListener('click', () => stepHorizon(-1));
      if (next) next.addEventListener('click', () => stepHorizon(1));
      track.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowLeft') { e.preventDefault(); stepHorizon(-1); }
        if (e.key === 'ArrowRight') { e.preventDefault(); stepHorizon(1); }
      });
      let startX = 0;
      track.addEventListener('touchstart', (e) => { startX = e.changedTouches[0].clientX; }, { passive: true });
      track.addEventListener('touchend', (e) => {
        const dx = e.changedTouches[0].clientX - startX;
        if (Math.abs(dx) > 40) stepHorizon(dx < 0 ? 1 : -1);
      }, { passive: true });
    }

    function updateFocusNote(epoch) {
      const noteEl = document.getElementById('pioneer-micro-note');
      if (noteEl && epoch.pioneerNote) noteEl.innerText = epoch.pioneerNote;
    }

    const MAP_EMPIRES = {
      babylon: {
        name: "Babylon — Head of Gold",
        beast: "Daniel 7: a lion with eagle’s wings, later given a man’s heart (Daniel 4).",
        span: "605–539 B.C.",
        insight: "The first world kingdom of the vision. Glory, learning, and idolatry at their height — and already dated to fall.",
        image: "assets/study/babylon-sunset.jpg",
        epoch: 0
      },
      persia: {
        name: "Medo-Persia — Chest and Arms of Silver",
        beast: "Daniel 7: a bear raised on one side, three ribs in its mouth (Lydia, Babylon, Egypt).",
        span: "539–331 B.C.",
        insight: "Inferior in glory, broader in reach. The ram of Daniel 8. Cyrus is named before he is born.",
        image: "assets/study/epochs/persepolis.jpg",
        epoch: 1
      },
      greece: {
        name: "Greece — Belly and Thighs of Bronze",
        beast: "Daniel 7: a four-winged, four-headed leopard — Alexander’s speed, then four Diadochi.",
        span: "331–168 B.C.",
        insight: "Bronze is harder than gold. Culture and arms spread faster than any kingdom before it.",
        image: "assets/study/epochs/greece-phalanx.jpg",
        epoch: 1,
        yearId: "y331"
      },
      rome: {
        name: "Rome — Legs of Iron",
        beast: "Daniel 7: a dreadful beast with iron teeth. Pagan, then papal, Rome crushes and breaks.",
        span: "168 B.C.–476 A.D. (imperial); little horn from 538 A.D.",
        insight: "Iron does not negotiate. The fourth kingdom is the longest and the most terrible.",
        image: "assets/plates/rome.jpg",
        epoch: 4
      },
      divided: {
        name: "Divided kingdoms — Feet of iron and clay",
        beast: "Ten horns of the fourth beast. They mingle but do not cleave.",
        span: "476 A.D. to the stone.",
        insight: "Europe’s fragments, marriage alliances, and failed unions are the last metal. The stone strikes here, not in Babylon.",
        image: "assets/plates/divided.jpg",
        epoch: 7
      }
    };

    const SHEET_CONTEXT = [
      { img: "assets/study/epochs/jerusalem-siege.jpg", title: "The prophetic blueprint", body: "Daniel opens in exile, but the Lord gave Jehoiakim into Nebuchadnezzar's hand (Daniel 1:2). Prophecy is God's historical roadmap — an unbroken chain pointing to Jesus Christ.", source: "Daniel 1:2; Daniel 9:26; Daniel 2:44; Luke 24:27.", exegesis: "Historicism keeps Babylon → Persia → Greece → Rome → divided Europe → Christ's kingdom as one chain. Preterism and futurism break that chain. Christ is the redemptive center: sovereignty in exile, sacrifice at the cross, Stone-King at the end." },
      { img: "assets/study/epochs/exile-court.jpg", title: "The exilic crucible", body: "Ashpenaz's school was assimilation: language, literature, and new names. Daniel drew the line at the king's table — idol table-fellowship, Levitical defilement, and dulled spiritual clarity.", source: "Daniel 1:8; Genesis 1:29; Leviticus 11. The ten-day test of zeroim.", exegesis: "Civic competence is not covenant surrender. Consecration at the table preceded revelation — and foreshadows Christ's faithful obedience in the wilderness." },
      { img: "assets/study/statue-nebuchadnezzar.jpg", title: "The metallic colossus", body: "Babylon's magicians confessed bankruptcy; Daniel prayed, and God revealed the master-framework of world history — from the head of gold to the stone that fills the earth.", source: "Daniel 2:28, 38–44. Babylonian Chronicle BM 21946.", exegesis: "One unbroken chain: Babylon → Medo-Persia → Greece → Rome → divided Europe → Christ's kingdom. The stone strikes the feet in the days of these kings — supernatural, not evolutionary." },
      { img: "assets/plates/dura-plain.jpg", title: "The plain of Dura", body: "An all-gold image 60×6 cubits high was Nebuchadnezzar's imperial veto against Daniel 2 — bow or burn. Shadrach, Meshach, and Abednego answered: but if not, we will not bow.", source: "Daniel 3:1, 17–18, 25. Exodus 20:4–5.", exegesis: "Civic duty has a ceiling. Dura is the type; Revelation 13 the antitype. The Fourth in the fire foreshadows Christ at Dura and on Calvary." },
      { img: "assets/study/babylon-sunset.jpg", title: "The emperor in the dust", body: "Nebuchadnezzar publishes his own humiliation: the threefold boast on the palace roof, seven years of beastly madness, and understanding restored when he lifts his eyes to heaven.", source: "Daniel 4:17, 27, 30, 34–37.", exegesis: "The Most High ruleth in the kingdom of men — three times. Seven times here are literal years, not 2,520. Christ is the humble King opposite Nebuchadnezzar's pride." },
      { img: "assets/study/epochs/babylon-fall.jpg", title: "The handwriting on the plaster", body: "Belshazzar toasts idols with Yahweh's temple vessels while Medo-Persia diverts the Euphrates. Heaven writes an audit: numbered, weighed, divided.", source: "Daniel 5:22, 25–31; Isaiah 45:1–3. Nabonidus Chronicle BM 35382.", exegesis: "The gold head becomes silver in a single night. Belshazzar sinned against known light. On the scale we are TEKEL unless clothed in Christ's righteousness." },
      { img: "assets/study/daniel-lions-den.jpg", title: "The pit of hunger", body: "Medo-Persian legal immutability is weaponized against Daniel's open window. The satraps find zero fraud; the pit of lions becomes an unmistakable type of Christ's sealed tomb.", source: "Daniel 6:4–5, 8, 10, 22, 26; Esther 8:8; Matthew 27:62–66.", exegesis: "Civil law has a divine ceiling at the First Commandment. Obedience to God is non-violent and faithful; the Living Deliverer breaks the seal of death." },
      { img: "assets/study/epochs/papal-rome.jpg", title: "Beasts from a wind-stirred sea", body: "The same four kingdoms return as predators. Among ten horns a little horn uproots three, speaks against the Most High, and wears out the saints 1,260 years until the heavenly court convenes.", source: "Daniel 7:4–7, 8, 9–14, 24–27; Revelation 12:6, 14; 13:5.", exegesis: "The pre-advent judgment scene of 7:9–14 convenes in heaven before the stone strikes. Christ approaches the Ancient of Days as High Priest and King." },
      { img: "assets/study/epochs/sanctuary.jpg", title: "The ram, the goat, and 2,300 days", body: "Gabriel names Media-Persia and Greece. The little horn attacks Christ's continual heavenly mediation (tamid). After 2,300 prophetic years, the heavenly sanctuary is vindicated (nitsdaq) on the antitypical Day of Atonement.", source: "Daniel 8:14, 17, 19–22; Leviticus 16:30; Hebrews 8:1–2; 9:23–26.", exegesis: "The vision belongs to the time of the end. Antiochus is far too small. In 1844, Christ entered the Most Holy Place of the heavenly sanctuary for the pre-advent judgment." },
      { img: "assets/study/horizon/y457.jpg", title: "The 70 weeks and the cross", body: "Gabriel returns to explain the unexplained 2,300 days. Seventy weeks (490 years) are severed (chathak) for Daniel's people, anchored in Artaxerxes' 457 B.C. decree. In A.D. 27 Messiah is anointed, in A.D. 31 He is cut off, ending animal sacrifices on Calvary.", source: "Daniel 9:24–27; Ezra 7:11–26; Luke 3:1, 21–23; Matthew 27:51.", exegesis: "Calvary is the mathematical anchor of prophecy. Because the 70 weeks proved true to the exact season, the remaining 1,810 years carry the timeline with certainty to the heavenly sanctuary in 1844." },
      { img: "assets/study/epochs/resurrection-dawn.jpg", title: "Michael stands in royal majesty", body: "Daniel 10–12 forms one undivided vision by the Tigris. When Michael stands up, high-priestly advocacy concludes, probation closes, the saints are delivered, and those sleeping in the dust awake in bodily resurrection.", source: "Daniel 10:5–6, 13; 11:22, 31; 12:1–3, 13; Hebrews 7:25; John 5:28–29.", exegesis: "Michael's standing up ('amad) marks Christ assuming His kingly reign as intercession ends. Deliverance belongs to all found in the Book; God promises Daniel rest and resurrection in his lot." }
    ];

    const SHEET_INSIGHTS = [
      { genre: "Prologue — three hermeneutical roads, year-day scale at the cross, Christ as redemptive center.", section: "Daniel 1:2; Numbers 14:34; Ezekiel 4:6; Daniel 2:38–44; Daniel 9:24–27; Luke 24:27.", theme: "Unbroken historicist chain; Messiah cut off; Stone-King; why historicism matters today." },
      { genre: "Exilic crucible — sovereign judgment, identity under renaming, consecration at the table, Christ as faithful Son.", section: "Daniel 1 — three sieges, Ashpenaz's school, the royal table, 605 B.C.", theme: "Civic cooperation vs. covenant surrender; zeroim and the ten-day test; redemptive typology of Jesus in the wilderness." },
      { genre: "Master-framework vision — historicist chain, metallurgic gradient, divided feet, Stone-King.", section: "Daniel 2 — impasse of human wisdom, four empires, iron and clay, stone without hands.", theme: "Thou art this head of gold; they shall not cleave; Christ pulverizes and fills the earth." },
      { genre: "Imperial veto and furnace crisis — civic duty vs. worship, Dura/Revelation 13 type, Christ in the fire.", section: "Daniel 3 — all-gold image, but if not faith, fourth like the Son of God.", theme: "State-enforced worship; non-transactional loyalty; Christophany and Calvary." },
      { genre: "Imperial encyclical — cosmic tree, Watcher, threefold boast, boanthropy, restored sanity, Christ's kenosis.", section: "Daniel 4 — seven literal years, eyes lifted, King of heaven praised.", theme: "Heaven rules; pride descends to beastliness; humility exalts; Philippians 2 antidote." },
      { genre: "Banquet-night audit — co-regency history, sacrilege against light, MENE/TEKEL/PERES, Cyrus as type, imputed righteousness.", section: "Daniel 5 — October 539 B.C.; Isaiah 45:1–3; John 5:22; 2 Corinthians 5:21.", theme: "Known light ignored; gold replaced by silver; found wanting unless covered by Christ." },
      { genre: "Constitutional conflict and pit deliverance — irrevocable Persian law, forensic audit, open window, and resurrection type.", section: "Daniel 6 — Babylon under Medo-Persian rule, c. 538 B.C.; Acts 5:29; Matthew 27–28.", theme: "The unalterable statute; blameless civic integrity; prayer facing Jerusalem; Christ conquers the roaring lion." },
      { genre: "Apocalyptic night vision — four predatory beasts, diverse eleventh horn, 1,260-year span (538–1798), and pre-advent heavenly court.", section: "Daniel 7 — Babylon, c. 553 B.C.; Revelation 12–13; Matthew 26:64.", theme: "Unbroken succession; church-state counterfeit; Arian horns uprooted; Son of Man crowned before Ancient of Days." },
      { genre: "Sanctuary apocalypse — named ram and goat, little horn in two phases, attack on the tamid, refutation of Antiochus, and nitsdaq in 1844.", section: "Daniel 8 — Susa by the Ulai, c. 551 B.C.; Leviticus 16; Hebrews 8–9.", theme: "Sacrificial animals; continual mediation obscured; forensic vindication; Christ in the heavenly Most Holy Place." },
      { genre: "Messianic prophecy & mathematical anchor — Daniel's penitential prayer, chathak severed from 2,300 days, four Persian decrees, midst of 70th week, and refutation of futurist gap.", section: "Daniel 9 — Babylon, c. 538 B.C.; Ezra 7; Matthew 27:51; Mark 1:15.", theme: "The 457 B.C. decree; A.D. 27 baptism; A.D. 31 cross; veil rent; 1,810-year balance to 1844." },
      { genre: "Tigris theophany, geopolitical march, and resurrection hope — unseen warfare, Daniel 11 succession, close of probation, time of trouble, and waking from the dust.", section: "Daniel 10:1 – 12:13 — Tigris River, c. 536 B.C.; Hebrews 7:25; John 5:28–29; Revelation 22:11.", theme: "The Man in linen; Michael the Prince; Persian and Greek march; 'amad royal stance; literal bodily resurrection; rest in thy lot." }
    ];

    function showInstrument(id) {
      document.querySelectorAll('.instrument-tabs button').forEach((b) => b.classList.toggle('active', b.dataset.instrument === id));
      document.querySelectorAll('.instrument-panel').forEach((p) => p.classList.toggle('active', p.id === 'panel-' + id));
      if (id === 'map') {
        ensureStudyMap();
        expandSittingMap(false);
        renderSheetMapPanel(currentSheetIndex);
      }
      if (id === 'scripture') {
        const box = document.querySelector('#scripture-root .scripture-scroll');
        const focus = document.getElementById('scripture-focus');
        if (box && focus) {
          box.scrollTop = Math.max(0, focus.offsetTop - box.offsetTop - 16);
        }
        if (window.StudyCompetency) {
          const pass = (sheetsData[currentSheetIndex] && sheetsData[currentSheetIndex].scripture) || `Sheet ${currentSheetIndex}`;
          window.StudyCompetency.recordScriptureLookup(pass);
        }
      }
    }

    function openLessonScripture() {
      showInstrument('scripture');
      const panel = document.getElementById('panel-scripture');
      if (panel) panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    let studyMap = null;
    const STUDY_EPOCH_TO_YEAR = (window.MAP_CHRONICLE && window.MAP_CHRONICLE.studyEpochIds) ||
      ['y605', 'y539', 'y457', 'y31', 'y538', 'y1798', 'y1844', 'y12'];
    if (window.BAJourney) window.BAJourney.load();

    const S2_STATIONS = [
      { id: 'gold', kind: 'dissolve', from: 'head', to: 'lion', year: 'y605', unlock: 'gold', empire: 'gold', label: 'Head → winged lion' },
      { id: 'silver', kind: 'dissolve', from: 'chest', to: 'bear', year: 'y539', unlock: 'silver', empire: 'silver', label: 'Chest → bear' },
      { id: 'bronze', kind: 'dissolve', from: 'thighs', to: 'leopard', year: 'y331', unlock: 'bronze', empire: 'bronze', label: 'Bronze → leopard' },
      { id: 'iron', kind: 'dissolve', from: 'legs', to: 'beast', year: 'y168', unlock: 'iron', empire: 'iron', label: 'Iron → beast' },
      { id: 'feet', kind: 'idle', show: 'feet', year: 'y538', empire: 'iron', label: 'Feet of iron and clay' },
      { id: 'stone', kind: 'smash', year: 'y1844', unlock: 'stone', empire: 'stone', label: 'Stone strikes the feet' }
    ];
    const S7_STATIONS = [
      { id: 'lion', kind: 'idle', show: 'lion', year: 'y605', empire: 'gold', label: 'Winged lion' },
      { id: 'bear', kind: 'idle', show: 'bear', year: 'y539', empire: 'silver', label: 'Lopsided bear' },
      { id: 'leopard', kind: 'idle', show: 'leopard', year: 'y331', empire: 'bronze', label: 'Four-headed leopard' },
      { id: 'beast', kind: 'idle', show: 'beast', year: 'y168', empire: 'iron', label: 'Dreadful beast' },
      { id: 'horn', kind: 'horn', show: 'beast', year: 'y538', empire: 'iron', label: 'Little horn grows' },
      { id: 'years1260', kind: 'idle', show: 'years1260', year: 'y538', empire: 'iron', label: '1,260 years' }
    ];

    let sittingBusy = false;
    let sittingYearOverride = null;
    let sittingEmpireOverride = null;

    function journeyState() {
      return window.BAJourney ? window.BAJourney.load() : { unlocked: [], station: {}, pathSheet: -1, sheet: 0, year: 'y605' };
    }

    function spineEmpireForSheet(index, unlocked) {
      if (index <= 4) return 'gold';
      if (index <= 6) return 'silver';
      if (index === 7) return 'iron';
      if (index === 8) return 'bronze';
      if (index === 9) return 'silver';
      return 'stone';
    }

    const SHEET_COMPETENCIES = [
      "The Prophetic Blueprint — Christ at the Center of the Chain",
      "Distinguishing Civic Service from Covenant Defilement",
      "Defending the Contiguous Chain of Four Empires",
      "Discerning Forced Worship on the Plain of Dura",
      "Reading the Seven Times of Nebuchadnezzar’s Humiliation",
      "Reading the Divine Balance Sheet — Numbered, Weighed, Covered",
      "Uncompromising Prayer and the Resurrected Deliverer",
      "Verifying the 1,260-Year Ecclesiastical Supremacy",
      "Vindicating the Sanctuary: 2,300 Days and the High Priest",
      "Calculating the 70 Weeks Severed from the 2,300 Days",
      "Standing Prepared as the Sealed Book Unlocks"
    ];

    function updateSpine(index, yearId, empireId) {
      const emp = empireId || sittingEmpireOverride || spineEmpireForSheet(index, journeyState().unlocked);
      const year = yearId || sittingYearOverride || STUDY_EPOCH_TO_YEAR[sheetToTimelineMap[index] || 0] || 'y605';
      const empireEl = document.getElementById('spine-empire');
      const sheetEl = document.getElementById('spine-sheet');
      const yearEl = document.getElementById('spine-year');
      if (empireEl) empireEl.textContent = window.BAJourney ? window.BAJourney.empireLabel(emp) : emp;
      if (sheetEl) sheetEl.textContent = index + ' of 11';
      if (yearEl) yearEl.textContent = window.BAJourney ? window.BAJourney.yearLabel(year) : year;
      const chip = document.getElementById('btn-map-chip');
      if (chip) chip.textContent = (window.BAJourney ? window.BAJourney.yearLabel(year) : year);

      const compText = SHEET_COMPETENCIES[index] || "Historicist Exegesis";
      const headerPill = document.getElementById('header-competency-pill');
      const headerCompText = document.getElementById('header-competency-text');
      if (headerCompText) {
        headerCompText.textContent = compText;
        if (headerPill) headerPill.title = "Current learning competency: " + compText;
      } else if (headerPill) {
        headerPill.textContent = compText;
        headerPill.title = "Current learning competency: " + compText;
      }
      const spineComp = document.getElementById('spine-competency');
      if (spineComp) {
        spineComp.textContent = compText;
      }
    }

    function pulseMapYear(yearId, opts) {
      sittingYearOverride = yearId;
      ensureStudyMap();
      if (studyMap && yearId) {
        if (studyMap.setSheet) {
          studyMap.setSheet(currentSheetIndex, Object.assign({
            animate: true,
            focusId: null,
            year: yearId
          }, opts || {}));
        } else {
          studyMap.setYear(yearId, Object.assign({ animate: true, chapter: false, open: false }, opts || {}));
        }
      }
      if (window.BAJourney) window.BAJourney.save({ year: yearId });
    }

    function setStageCaption(text) {
      const el = document.getElementById('sitting-stage-caption');
      if (el) el.textContent = text || 'Stage';
    }

    let sittingPhase = 'study';
    const sittingVisited = { study: true, tasks: false };
    const SITTING_PATH_HINTS = {
      study: 'Read the excerpt, sources, and Christology plaque. Open the Map and 3D Gallery, then answer the questions.',
      tasks: 'Answer the questions, then continue to the next lesson.',
      next: 'Advance when you are ready. The same path repeats on the next sheet.'
    };

    function lessonMapPack(index) {
      return (window.SHEET_MAP && window.SHEET_MAP[index]) || null;
    }
    function mapBodyHtml(text) {
      if (!text) return '';
      const t = String(text);
      if (/<[a-z][\s\S]*>/i.test(t)) return t;
      return t.split(/\n\n+/).map((p) => '<p>' + p.replace(/\n/g, '<br>') + '</p>').join('');
    }
    function renderSittingPath() {
      const hint = document.getElementById('sitting-path-hint');
      if (hint) hint.textContent = SITTING_PATH_HINTS[sittingPhase] || SITTING_PATH_HINTS.study;
      document.querySelectorAll('#sitting-path-steps [data-path]').forEach((btn) => {
        const key = btn.dataset.path;
        btn.classList.toggle('is-current', key === sittingPhase);
        btn.classList.toggle('is-done', !!(sittingVisited[key] && key !== sittingPhase));
        if (key === 'next') btn.disabled = !canAdvancePath();
      });
    }
    function resetSittingPath() {
      sittingPhase = 'study';
      sittingVisited.study = true;
      sittingVisited.tasks = false;
      renderSittingPath();
    }
    function renderSheetMapPanel(index) {
      const host = document.getElementById('sheet-map-list');
      const pack = lessonMapPack(index);
      if (!host) return;
      if (!pack) {
        host.innerHTML = '<p class="text-sm opacity-70">No lesson nodes for this sheet.</p>';
        return;
      }
      host.innerHTML = (pack.nodes || []).map((n, i) => {
        return '<details' + (i === 0 ? ' open' : '') + '>' +
          '<summary><small>' + (n.kicker || '') + '</small>' + (n.title || n.id) + '</summary>' +
          '<div class="sheet-map-body">' + mapBodyHtml(n.body) + '</div>' +
          (n.scripture ? '<div class="cite">' + n.scripture + '</div>' : '') +
          '<button type="button" data-node-id="' + n.id + '">Show on map</button>' +
          '</details>';
      }).join('');
      host.querySelectorAll('[data-node-id]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const currentPack = lessonMapPack(currentSheetIndex);
          const y = (currentPack && currentPack.year) || 'y605';
          window.location.href = `map.html?year=${encodeURIComponent(y)}&from=lesson&sheet=${currentSheetIndex}`;
        });
      });
    }
    function applySittingMap(index) {
      const pack = lessonMapPack(index);
      if (pack) {
        const art = (pack.nodes && pack.nodes[0] && pack.nodes[0].art) || '';
        fillMapFacts(pack.title, '', pack.kicker, pack.summary, art, pack.year);
      }
      renderSheetMapPanel(index);
    }
    function enterSittingPhase(phase) {
      if (phase === 'next') {
        sittingPhase = 'next';
        renderSittingPath();
        completeAndAdvance();
        return;
      }
      sittingPhase = phase;
      if (sittingVisited[phase] !== undefined) sittingVisited[phase] = true;
      if (phase === 'study') {
        const article = document.getElementById('sheet-article');
        if (article) article.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } else if (phase === 'tasks') {
        sittingVisited.tasks = true;
        const rev = document.getElementById('workbench-section') || document.getElementById('revision-section');
        if (rev) rev.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
      renderSittingPath();
    }

    function expandSittingMap() {}
    function collapseSittingInsets() {}

    function stationEndKey(st) {
      if (!st) return null;
      if (st.kind === 'dissolve') return st.to;
      if (st.kind === 'smash') return 'stone';
      return st.show || 'head';
    }

    async function playStation(act, st) {
      if (!st || sittingBusy) return;
      sittingBusy = true;
      sittingEmpireOverride = st.empire;
      sittingYearOverride = st.year;
      updateSpine(currentSheetIndex, st.year, st.empire);
      pulseMapYear(st.year, { animate: true });
      setStageCaption(st.label);
      try {
        const stage = window.StudyStage;
        if (stage && typeof stage.isMounted === 'function' && stage.isMounted()) {
          if (st.kind === 'dissolve') await stage.playDissolve(st.from, st.to);
          else if (st.kind === 'smash') await stage.playSmash();
          else if (st.kind === 'horn') await stage.playHornGrow();
          else await stage.show(st.show);
        }
        if (st.unlock && window.BAJourney) window.BAJourney.unlock(st.unlock);
        if (window.BAJourney) {
          const artifact = stationEndKey(st);
          const patch = { artifact: artifact, year: st.year, station: {} };
          patch.station[act] = st.id;
          window.BAJourney.save(patch);
        }
      } finally {
        sittingBusy = false;
        highlightStation(st.id);
      }
    }

    function highlightStation(id) {
      document.querySelectorAll('#sheet-article [data-station]').forEach((el) => {
        el.classList.toggle('is-current', el.getAttribute('data-station') === id);
      });
    }

    function markDoneStations(act, currentId) {
      const list = act === 's2' ? S2_STATIONS : S7_STATIONS;
      const idx = list.findIndex((s) => s.id === currentId);
      document.querySelectorAll('#sheet-article [data-station]').forEach((el) => {
        const sid = el.getAttribute('data-station');
        const i = list.findIndex((s) => s.id === sid);
        el.classList.toggle('is-done', idx >= 0 && i >= 0 && i <= idx);
      });
    }

    function injectStepRail(act, stations) {
      const article = document.getElementById('sheet-article');
      if (!article) return;
      const old = article.querySelector('.step-rail');
      if (old) old.remove();
      const rail = document.createElement('div');
      rail.className = 'step-rail';
      rail.innerHTML = '<button type="button" data-dir="-1">◀ Beat</button><strong data-step-label></strong><button type="button" data-dir="1">Beat ▶</button>';
      const first = article.querySelector('[data-station]');
      if (first && first.parentNode) first.parentNode.insertBefore(rail, first);
      else article.insertBefore(rail, article.firstChild);
      const label = rail.querySelector('[data-step-label]');
      const journey = journeyState();
      const currentId = (journey.station && journey.station[act]) || (act === 's7' ? 'leopard' : stations[0].id);
      const cur = stations.find((s) => s.id === currentId) || stations[0];
      if (label) label.textContent = cur.label + ' · ' + (stations.indexOf(cur) + 1) + '/' + stations.length;
      rail.addEventListener('click', (ev) => {
        const btn = ev.target.closest('button[data-dir]');
        if (!btn) return;
        const dir = Number(btn.getAttribute('data-dir'));
        const j = journeyState();
        const nowId = (j.station && j.station[act]) || (act === 's7' ? 'leopard' : stations[0].id);
        let i = stations.findIndex((s) => s.id === nowId);
        if (i < 0) i = 0;
        if (!(j.station && j.station[act]) && dir === 1 && i === 0) {
          playStation(act, stations[0]).then(() => refreshRailLabel(act, stations, rail));
          return;
        }
        const next = stations[i + dir];
        if (!next) return;
        playStation(act, next).then(() => refreshRailLabel(act, stations, rail));
      });
    }

    function refreshRailLabel(act, stations, rail) {
      const j = journeyState();
      const id = (j.station && j.station[act]) || (act === 's7' ? 'leopard' : stations[0].id);
      const st = stations.find((s) => s.id === id) || stations[0];
      const label = (rail || document).querySelector('[data-step-label]');
      if (label) label.textContent = st.label + ' · ' + (stations.indexOf(st) + 1) + '/' + stations.length;
      highlightStation(st.id);
      markDoneStations(act, st.id);
    }

    function wireArticleStations(act, stations) {
      const article = document.getElementById('sheet-article');
      if (!article) return;
      injectStepRail(act, stations);
      article.querySelectorAll('[data-station]').forEach((el) => {
        el.addEventListener('click', () => {
          const st = stations.find((s) => s.id === el.getAttribute('data-station'));
          if (st) playStation(act, st).then(() => refreshRailLabel(act, stations));
        });
      });
    }

    async function restoreSheetStage(index) {
      const j = journeyState();
      sittingYearOverride = null;
      sittingEmpireOverride = null;
      if (index === 2) {
        const id = j.station && j.station.s2;
        const st = S2_STATIONS.find((s) => s.id === id);
        if (st) {
          sittingEmpireOverride = st.empire;
          sittingYearOverride = st.year;
          pulseMapYear(st.year, { animate: false });
          highlightStation(st.id);
          markDoneStations('s2', st.id);
        }
        wireArticleStations('s2', S2_STATIONS);
        updateSpine(index, sittingYearOverride, sittingEmpireOverride);
        return;
      }
      if (index === 7) {
        const id = j.station && j.station.s7;
        const st = S7_STATIONS.find((s) => s.id === id);
        const start = st || S7_STATIONS.find((s) => s.id === 'years1260');
        sittingEmpireOverride = start.empire;
        sittingYearOverride = start.year;
        pulseMapYear(start.year, { animate: false });
        wireArticleStations('s7', S7_STATIONS);
        highlightStation(start.id);
        if (st) markDoneStations('s7', st.id);
        updateSpine(index, sittingYearOverride, sittingEmpireOverride);
        return;
      }
      const yearId = STUDY_EPOCH_TO_YEAR[sheetToTimelineMap[index] !== undefined ? sheetToTimelineMap[index] : 0] || 'y605';
      pulseMapYear(yearId, { animate: true });
      updateSpine(index, sittingYearOverride || yearId, sittingEmpireOverride || spineEmpireForSheet(index, j.unlocked));
    }

    function fillMapFacts(title, beast, span, insight, art, yearId) {
      const n = document.getElementById('map-name');
      const b = document.getElementById('map-beast');
      const s = document.getElementById('map-span');
      const i = document.getElementById('map-insight');
      const p = document.getElementById('map-plate');
      const enter = document.getElementById('map-enter-full');
      if (n) n.textContent = title || '';
      if (b) b.textContent = beast || '';
      if (s) s.textContent = span || '';
      if (i) i.textContent = insight || '';
      if (p && art) p.src = art;
      if (enter && yearId) {
        enter.href = 'map.html?year=' + encodeURIComponent(yearId) + '&from=lesson&sheet=' + currentSheetIndex;
      }
    }

    function ensureStudyMap() {
      // ChronicleMap is no longer embedded in the study desk sitting
    }

    function selectEmpire(id) {
      const emp = MAP_EMPIRES[id];
      if (!emp) return;
      const yearId = emp.yearId || STUDY_EPOCH_TO_YEAR[emp.epoch] || 'y605';
      fillMapFacts(emp.name, emp.beast, emp.span, emp.insight, emp.image, yearId);
      if (studyMap) studyMap.setYear(yearId, { animate: true, chapter: false, open: false });
    }

    function bibleNoticeChapters(index) {
      const passage = window.BAScripture && window.BAScripture.passageForSheet(index);
      const sections = (passage && passage.sections) || [];
      if (!sections.length) return '';
      const first = sections[0];
      const last = sections[sections.length - 1];
      if (first.book !== last.book) return sections.map((s) => s.book + ' ' + s.chapter).join(' · ');
      if (sections.length === 1) return first.book + ' Chapter ' + first.chapter;
      return first.book + ' Chapters ' + first.chapter + '–' + last.chapter;
    }

    function stopLessonAudio() {
      const player = document.getElementById('lesson-audio-player');
      if (!player) return;
      player.pause();
      player.removeAttribute('src');
      player.load();
    }

    function closeInfographic() {
      const modal = document.getElementById('infographic-modal');
      if (!modal) return;
      modal.hidden = true;
      document.body.classList.remove('infographic-open');
    }

    function openInfographic() {
      const modal = document.getElementById('infographic-modal');
      const img = document.getElementById('infographic-modal-img');
      if (!modal || !img || !img.getAttribute('src')) return;
      modal.hidden = false;
      document.body.classList.add('infographic-open');
      const closeBtn = document.getElementById('infographic-modal-close');
      if (closeBtn) closeBtn.focus();
    }

    function renderLessonMedia(data) {
      const box = document.getElementById('lesson-media');
      const audioBox = document.getElementById('lesson-audio');
      const figure = document.getElementById('sitting-roadmap');
      const player = document.getElementById('lesson-audio-player');
      if (!box) return;
      stopLessonAudio();
      closeInfographic();

      const audio = data && data.audio;
      const plate = data && data.infographic;
      if (audioBox && player) {
        if (audio && audio.src) {
          audioBox.hidden = false;
          const title = document.getElementById('lesson-audio-title');
          const kicker = document.getElementById('lesson-audio-kicker');
          const hint = document.getElementById('lesson-audio-hint');
          const isOverview = audio.kind === 'overview';
          if (title) title.textContent = audio.title || (isOverview ? 'Lesson overview' : 'Listen to this sitting');
          if (kicker) {
            kicker.textContent = audio.kicker || (isOverview
              ? ('Overview' + (audio.duration ? ' · ' + audio.duration : ''))
              : (audio.duration ? ('Listen along · ' + audio.duration) : 'Listen along'));
          }
          if (hint) {
            const hintText = audio.hint || (isOverview
              ? 'A quick orientation before you read — not a voiceover of the full sitting.'
              : '');
            hint.textContent = hintText;
            hint.hidden = !hintText;
          }
          player.src = audio.src;
        } else {
          audioBox.hidden = true;
        }
      }

      if (figure) {
        if (plate && plate.src) {
          figure.hidden = false;
          const title = document.getElementById('lesson-infographic-title');
          const img = document.getElementById('lesson-infographic-img');
          const modalImg = document.getElementById('infographic-modal-img');
          const modalTitle = document.getElementById('infographic-modal-title');
          const dl = document.getElementById('lesson-infographic-download');
          const modalDl = document.getElementById('infographic-modal-download');
          const alt = plate.alt || plate.title || 'Sitting infographic';
          if (title) title.textContent = plate.title || 'One-page infographic';
          if (modalTitle) modalTitle.textContent = plate.title || 'One-page infographic';
          if (img) {
            img.src = plate.src;
            img.alt = alt;
            img.width = 1672;
            img.height = 941;
            img.decoding = 'async';
            img.removeAttribute('srcset');
          }
          if (modalImg) {
            modalImg.src = plate.download || plate.src;
            modalImg.alt = alt;
            modalImg.width = 1672;
            modalImg.height = 941;
            modalImg.decoding = 'async';
          }
          const href = plate.download || plate.src;
          const name = plate.filename || 'sitting-infographic';
          if (dl) {
            dl.href = href;
            dl.setAttribute('download', name);
          }
          if (modalDl) {
            modalDl.href = href;
            modalDl.setAttribute('download', name);
          }
        } else {
          figure.hidden = true;
        }
      }

      box.hidden = !((audio && audio.src) || (plate && plate.src));
    }

    function renderBibleNotice(index) {
      const badge = document.getElementById('bible-notice-chapters');
      if (!badge) return;
      const label = bibleNoticeChapters(index);
      if (label) badge.textContent = label;
    }

    function renderSheetInstruments(index) {
      const ctx = SHEET_CONTEXT[index] || SHEET_CONTEXT[0];
      const ins = SHEET_INSIGHTS[index] || SHEET_INSIGHTS[0];
      document.getElementById('context-img').src = ctx.img;
      document.getElementById('context-title').textContent = ctx.title;
      document.getElementById('context-body').textContent = ctx.body;
      document.getElementById('context-source').textContent = ctx.source;
      document.getElementById('context-exegesis').textContent = ctx.exegesis;
      document.getElementById('insight-genre').textContent = ins.genre;
      document.getElementById('insight-section').textContent = ins.section;
      document.getElementById('insight-theme').textContent = ins.theme;
      if (window.BAScripture) window.BAScripture.showSheet(index).then(() => renderBibleNotice(index));
    }

    /* Archaeological Modal Controller */
    function openArtifactModal() {
      const modal = document.getElementById('artifact-modal');
      modal.classList.remove('opacity-0', 'pointer-events-none');
    }

    function closeArtifactModal() {
      const modal = document.getElementById('artifact-modal');
      modal.classList.add('opacity-0', 'pointer-events-none');
    }

    /* =========================================================================
       3. POMODORO STUDY ENGINE & DYNAMIC WEATHER ATMOSPHERE
       ========================================================================= */
    let timerDuration = 5 * 60; // default 5 minutes
    let timeRemaining = 5 * 60;
    let timerInterval = null;
    let isTimerRunning = false;
    const RING_CIRCUMFERENCE = 427.26;

    // Atmospheric Focus State — a continuous quiet → storm → sunshine continuum
    let weatherPreset = 'auto'; // visual weather only — no rain/thunder audio
    let currentWeatherType = 'quiet';
    let weatherAnimId = null;
    let particles = [];
    let focusAtmosphere = 0;
    let lightning = 0;
    let lastLightningAt = 0;

    const weatherMeta = {
      quiet: { name: "Still • Quiet Dusk", icon: "◌", level: "Quiet" },
      building: { name: "Building • Rising Wind", icon: "☁", level: "Building" },
      storm: { name: "Storm • Rain & Thunder", icon: "⛈", level: "Storm" },
      sunshine: { name: "Sunshine • Warm Light", icon: "☀", level: "Sunshine" },
      off: { name: "Off", icon: "⏸", level: "Off" }
    };

    let bolts = [];
    let splashes = [];
    let gust = 0;

    function lerp(a, b, t) {
      return a + (b - a) * Math.max(0, Math.min(1, t));
    }

    function initWeatherParticles() {
      const w = window.innerWidth, h = window.innerHeight;
      particles = Array.from({ length: 520 }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        speed: 620 + Math.random() * 980,
        len: 12 + Math.random() * 28,
        thick: Math.random() < 0.18 ? 1.6 : 0.7,
        drift: -90 + Math.random() * 40,
        alpha: 0.12 + Math.random() * 0.38
      }));
    }

    function focusPhase(progress) {
      if (weatherPreset !== 'auto') {
        return weatherPreset === 'storm' ? 0.58
          : weatherPreset === 'sunshine' ? 0.96
          : weatherPreset === 'building' ? 0.34
          : weatherPreset === 'quiet' ? 0.08
          : 0.0;
      }
      if (progress < 0.12) return progress * 0.7;
      if (progress < 0.32) return lerp(0.08, 0.36, (progress - 0.12) / 0.2);
      if (progress < 0.62) return lerp(0.36, 0.78, (progress - 0.32) / 0.3);
      return lerp(0.78, 1.0, (progress - 0.62) / 0.38);
    }

    function deriveWeatherType(v) {
      if (v < 0.2) return 'quiet';
      if (v < 0.42) return 'building';
      if (v < 0.78) return 'storm';
      return 'sunshine';
    }

    function makeBolt(w, h) {
      const x0 = w * (0.12 + Math.random() * 0.76);
      const segs = [{ x: x0, y: h * (0.02 + Math.random() * 0.08) }];
      let x = x0, y = segs[0].y;
      const target = h * (0.42 + Math.random() * 0.28);
      while (y < target) {
        x += -40 + Math.random() * 80;
        y += 18 + Math.random() * 36;
        segs.push({ x, y });
        if (Math.random() < 0.22) {
          const bx = x + (Math.random() < 0.5 ? -1 : 1) * (30 + Math.random() * 70);
          segs.push({ x: bx, y: y + 20 + Math.random() * 40, branch: true, from: segs.length - 1 });
        }
      }
      return { segs, life: 1, x0 };
    }

    function drawWeather() {
      const canvas = document.getElementById('weather-canvas');
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      const w = canvas.width, h = canvas.height;
      ctx.clearRect(0, 0, w, h);
      if (currentWeatherType === 'off') {
        document.body.dataset.weather = 'off';
        weatherAnimId = null;
        return;
      }

      const v = focusAtmosphere;
      const building = currentWeatherType === 'building' ? 1 : Math.max(0, 1 - Math.abs(v - 0.34) / 0.18);
      const storm = currentWeatherType === 'storm' ? 1 : Math.max(0, 1 - Math.abs(v - 0.58) / 0.28);
      const sun = currentWeatherType === 'sunshine' ? 1 : Math.max(0, (v - 0.76) / 0.24);
      const quiet = currentWeatherType === 'quiet' ? 1 : Math.max(0, 1 - v / 0.22);
      gust = lerp(gust, (building * 0.45 + storm * 1) * (0.7 + Math.sin(performance.now() / 900) * 0.3), 0.04);

      document.body.dataset.weather = currentWeatherType;

      const sky = ctx.createLinearGradient(0, 0, 0, h);
      sky.addColorStop(0, `rgba(${Math.round(18 + 70 * sun)},${Math.round(20 + 52 * sun)},${Math.round(28 + 40 * sun)},${0.18 + storm * 0.28 + building * 0.12})`);
      sky.addColorStop(0.45, `rgba(${Math.round(10 + 40 * sun)},${Math.round(14 + 32 * sun)},${Math.round(20 + 28 * sun)},${0.08 + storm * 0.22})`);
      sky.addColorStop(1, `rgba(4,5,6,${0.12 + storm * 0.3})`);
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, w, h);

      ctx.save();
      ctx.globalCompositeOperation = 'multiply';
      const cloudA = 0.04 + building * 0.1 + storm * 0.22;
      for (let i = 0; i < 10; i++) {
        const x = ((i * w / 6 + performance.now() * (0.012 + i * 0.0014) * (0.4 + gust)) % (w + 560)) - 280;
        const y = 40 + (i % 5) * 48;
        const r = 160 + (i % 4) * 80;
        const g = ctx.createRadialGradient(x, y, 0, x, y, r);
        g.addColorStop(0, `rgba(28,32,40,${cloudA})`);
        g.addColorStop(1, 'rgba(28,32,40,0)');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();

      const rainAmt = storm * 1 + building * 0.22;
      if (rainAmt > 0.04) {
        const dt = 0.016;
        ctx.lineCap = 'round';
        for (const p of particles) {
          p.x += (p.drift - 70 * gust) * dt;
          p.y += p.speed * (0.55 + rainAmt) * dt;
          if (p.y > h + 20) {
            p.y = -20;
            p.x = Math.random() * w;
            if (rainAmt > 0.5 && Math.random() < 0.08) splashes.push({ x: p.x, y: h - 4 - Math.random() * 18, r: 1, a: 0.35 });
          }
          if (p.x < -40) p.x = w + 20;
          ctx.strokeStyle = `rgba(186,210,230,${p.alpha * rainAmt})`;
          ctx.lineWidth = p.thick;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p.x + (p.drift - 80 * gust) * 0.04, p.y + p.len);
          ctx.stroke();
        }
        splashes = splashes.filter((s) => s.a > 0.02);
        for (const s of splashes) {
          ctx.strokeStyle = `rgba(200,220,235,${s.a})`;
          ctx.lineWidth = 0.8;
          ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2); ctx.stroke();
          s.r += 0.55; s.a *= 0.86;
        }
      }

      const now = performance.now() / 1000;
      if (storm > 0.55 && now - lastLightningAt > 2.2 && Math.random() < 0.018) {
        bolts.push(makeBolt(w, h));
        lastLightningAt = now;
        lightning = 1;
      }
      if (lightning > 0.02) {
        ctx.fillStyle = `rgba(220,232,255,${0.08 * lightning})`;
        ctx.fillRect(0, 0, w, h);
        lightning *= 0.78;
      }
      bolts = bolts.filter((b) => b.life > 0.04);
      for (const b of bolts) {
        ctx.save();
        ctx.strokeStyle = `rgba(230,240,255,${0.95 * b.life})`;
        ctx.shadowColor = 'rgba(180,210,255,0.9)';
        ctx.shadowBlur = 18;
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        b.segs.forEach((pt, i) => {
          if (pt.branch) return;
          if (i === 0) ctx.moveTo(pt.x, pt.y); else ctx.lineTo(pt.x, pt.y);
        });
        ctx.stroke();
        ctx.lineWidth = 1;
        ctx.strokeStyle = `rgba(200,220,255,${0.55 * b.life})`;
        b.segs.forEach((pt, i) => {
          if (!pt.branch) return;
          const from = b.segs[pt.from] || b.segs[0];
          ctx.beginPath(); ctx.moveTo(from.x, from.y); ctx.lineTo(pt.x, pt.y); ctx.stroke();
        });
        ctx.restore();
        b.life *= 0.82;
      }

      if (sun > 0.04) {
        ctx.save();
        ctx.globalCompositeOperation = 'screen';
        const sx = w * 0.82, sy = h * 0.12;
        const sg = ctx.createRadialGradient(sx, sy, 0, sx, sy, Math.max(w, h) * 0.55);
        sg.addColorStop(0, `rgba(255,226,150,${0.28 * sun})`);
        sg.addColorStop(0.2, `rgba(255,210,120,${0.12 * sun})`);
        sg.addColorStop(1, 'rgba(255,200,110,0)');
        ctx.fillStyle = sg; ctx.fillRect(0, 0, w, h);
        ctx.translate(sx, sy);
        for (let i = 0; i < 7; i++) {
          ctx.rotate(0.09);
          ctx.globalAlpha = 0.035 * sun;
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(-90 + i * 28, h);
          ctx.lineTo(-40 + i * 28, h);
          ctx.closePath();
          ctx.fillStyle = '#ffe4a8';
          ctx.fill();
        }
        ctx.restore();
      }

      if (quiet > 0.25 || sun > 0.35) {
        ctx.fillStyle = `rgba(240,228,201,${0.14 * Math.max(quiet, sun * 0.6)})`;
        for (let i = 0; i < 40; i++) {
          const x = (i * 173 + performance.now() * 0.008) % w;
          const y = (i * 97 + Math.sin(performance.now() / 800 + i) * 8) % h;
          ctx.fillRect(x, y, 1.3, 1.3);
        }
      }

      weatherAnimId = requestAnimationFrame(drawWeather);
    }

    function resizeWeatherCanvas() {
      const canvas = document.getElementById('weather-canvas');
      if (canvas) {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
      }
      initWeatherParticles();
    }

    function startWeatherAnimation() {
      if (!weatherAnimId && currentWeatherType !== 'off') {
        resizeWeatherCanvas();
        const canvas = document.getElementById('weather-canvas');
        if (canvas) canvas.classList.remove('opacity-0');
        weatherAnimId = requestAnimationFrame(drawWeather);
      }
    }

    function stopWeatherAnimation() {
      if (weatherAnimId) cancelAnimationFrame(weatherAnimId);
      weatherAnimId = null;
      const canvas = document.getElementById('weather-canvas');
      if (canvas) canvas.classList.add('opacity-0');
    }

    function updateAutoWeather() {
      const progress = (timerDuration - timeRemaining) / timerDuration;
      focusAtmosphere = focusPhase(progress);
      currentWeatherType = weatherPreset === 'off' ? 'off' : (weatherPreset === 'auto' ? deriveWeatherType(focusAtmosphere) : weatherPreset);
      updateWeatherHUD();
    }

    function updateWeatherHUD() {
      const meta = weatherMeta[currentWeatherType] || weatherMeta.quiet;
      const statusEl = document.getElementById('pomo-weather-status');
      const headerIcon = document.getElementById('pomo-header-icon');
      const phaseEl = document.getElementById('pomo-clock-phase');
      const levelEl = document.getElementById('focus-atmosphere-level');
      const fillEl = document.getElementById('focus-atmosphere-fill');

      const phaseLabel = focusAtmosphere < 0.22 ? 'Still' : focusAtmosphere < 0.43 ? 'Building' : focusAtmosphere < 0.72 ? 'Storm' : focusAtmosphere < 0.9 ? 'Breaking' : 'Sun';
      if (statusEl) statusEl.innerText = weatherPreset === 'auto' ? `${phaseLabel} • ${meta.name.split(' • ')[1] || meta.name}` : meta.name;
      if (headerIcon) headerIcon.innerText = meta.icon;
      if (phaseEl) phaseEl.innerText = weatherPreset === 'auto' ? `Auto: ${phaseLabel}` : meta.level;
      if (levelEl) levelEl.innerText = phaseLabel;
      if (fillEl) fillEl.style.width = `${Math.round(focusAtmosphere * 100)}%`;
      ['quiet','storm','sun'].forEach(k => {
        const el = document.getElementById(`focus-phase-${k}`);
        if (!el) return;
        el.classList.remove('bg-amber-500/20','text-amber-900','dark:text-amber-200','ring-1','ring-amber-400');
      });
      const activeId = focusAtmosphere < 0.34 ? 'focus-phase-quiet' : focusAtmosphere < 0.78 ? 'focus-phase-storm' : 'focus-phase-sun';
      const active = document.getElementById(activeId);
      if (active) active.classList.add('bg-amber-500/20','text-amber-900','dark:text-amber-200','ring-1','ring-amber-400');

    }

    function setWeatherPreset(preset, silent) {
      const prefersReduced =
        window.matchMedia('(prefers-reduced-motion: reduce)').matches ||
        (window.BAJourney && typeof window.BAJourney.prefersReducedMotion === 'function' && window.BAJourney.prefersReducedMotion());
      if (prefersReduced && preset !== 'off') {
        preset = 'off';
      }
      if (document.hidden && preset !== 'off') {
        stopWeatherAnimation();
      }
      weatherPreset = preset;
      ['auto', 'quiet', 'building', 'storm', 'sunshine', 'off'].forEach(id => {
        const btn = document.getElementById(`weather-btn-${id}`);
        if (!btn) return;
        const active = id === preset;
        btn.className = active
          ? "weather-pill py-1 rounded bg-amber-500/20 border border-amber-500/40 text-amber-900 dark:text-amber-200 font-semibold transition-all"
          : "weather-pill py-1 rounded bg-paper-200/60 dark:bg-paper-800 text-ink-700 dark:text-paper-300 hover:bg-amber-500/10 transition-all";
      });
      updateAutoWeather();
      if (preset === 'off') stopWeatherAnimation();
      else startWeatherAnimation();
      if (!silent) showToast(`Focus atmosphere: ${weatherMeta[currentWeatherType]?.name || preset}`);
    }

    function updateTimerDisplay() {
      const mins = Math.floor(timeRemaining / 60);
      const secs = timeRemaining % 60;
      const str = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;

      const clock = document.getElementById('pomo-clock');
      const headerTime = document.getElementById('pomo-header-time');
      const line = document.getElementById('pomo-progress-line');
      const ring = document.getElementById('timer-ring');

      if (clock) clock.innerText = str;
      if (headerTime) headerTime.innerText = str;

      const pct = ((timerDuration - timeRemaining) / timerDuration) * 100;
      if (line) line.style.width = `${pct}%`;
      if (ring) {
        const offset = RING_CIRCUMFERENCE * (1 - pct / 100);
        ring.style.strokeDashoffset = offset;
      }

      if (isTimerRunning && weatherPreset === 'auto') {
        updateAutoWeather();
      }
    }

    function startPomodoro() {
      if (isTimerRunning) return;
      isTimerRunning = true;
      const ping = document.getElementById('pomo-ping');
      const dot = document.getElementById('pomo-dot');
      const sub = document.getElementById('pomo-status-sub');
      if (ping) ping.classList.remove('hidden');
      if (dot) dot.classList.replace('bg-amber-600', 'bg-emerald-500');
      if (sub) sub.innerText = "Focus Session Active • Contemplating Divine Sovereignty...";

      startWeatherAnimation();

      timerInterval = setInterval(() => {
        if (timeRemaining > 0) {
          timeRemaining--;
          updateTimerDisplay();
        } else {
          completePomodoroSession();
        }
      }, 1000);
      showToast("Exilic Study Focus Timer Started");
    }

    function pausePomodoro() {
      isTimerRunning = false;
      clearInterval(timerInterval);
      const ping = document.getElementById('pomo-ping');
      const dot = document.getElementById('pomo-dot');
      const sub = document.getElementById('pomo-status-sub');
      if (ping) ping.classList.add('hidden');
      if (dot) dot.classList.replace('bg-emerald-500', 'bg-amber-600');
      if (sub) sub.innerText = "Focus Session Paused";

      showToast("Focus Timer Paused");
    }

    function resetPomodoro() {
      pausePomodoro();
      timeRemaining = timerDuration;
      updateTimerDisplay();
      updateAutoWeather();
      const sub = document.getElementById('pomo-status-sub');
      if (sub) sub.innerText = "Timer reset to designated reading duration.";
      showToast("Focus Timer Reset");
    }

    function setPomodoroDuration(minutes) {
      timerDuration = minutes * 60;
      timeRemaining = timerDuration;
      updateTimerDisplay();
      updateAutoWeather();
    }

    function completePomodoroSession() {
      pausePomodoro();
      const sub = document.getElementById('pomo-status-sub');
      if (sub) sub.innerText = "✓ Study Session Completed! The study path is complete.";

      try {
        const synth = new Tone.PolySynth(Tone.Synth).toDestination();
        synth.set({ volume: -12 });
        synth.triggerAttackRelease(["C4", "G4", "C5"], "1.8s");
        setTimeout(() => {
          try {
            synth.dispose();
          } catch (e) {}
        }, 2200);
      } catch (e) {}

      showToast("Study Session Complete! Review the quiz checkpoint.");
    }

    function togglePomodoroDrawer() {
      const dock = document.getElementById('pomo-dock');
      if (!dock) return;
      const isClosed = dock.classList.contains('pointer-events-none');
      if (isClosed) {
        dock.classList.remove('translate-y-[-120%]', 'opacity-0', 'pointer-events-none');
        startWeatherAnimation();
      } else {
        dock.classList.add('translate-y-[-120%]', 'opacity-0', 'pointer-events-none');
        if (!isTimerRunning) stopWeatherAnimation();
      }
    }

    /* =========================================================================
       3. STATE CONTROLLER: Reader, Theme, Font Sizing
       ========================================================================= */
    let currentSheetIndex = 0;
    let completedSheets = new Set();
    const themes = ['charcoal', 'paper', 'white', 'night'];
    let currentThemeIdx = 0;

    const fontSizes = [
      { label: "85%", size: "0.95rem" },
      { label: "100%", size: "1.125rem" },
      { label: "115%", size: "1.28rem" },
      { label: "130%", size: "1.45rem" },
      { label: "150%", size: "1.65rem" }
    ];
    let currentFontIdx = 1;

    try {
      if (window.BAJourney) {
        completedSheets = new Set((window.BAJourney.load().completedSheets || []).map(Number));
      } else {
        const savedCompleted = localStorage.getItem('daniel_historicist_mastery');
        if (savedCompleted) completedSheets = new Set(JSON.parse(savedCompleted));
      }
      const savedSheet = localStorage.getItem('daniel_historicist_sheet');
      if (savedSheet !== null) currentSheetIndex = parseInt(savedSheet, 10) || 0;
      const savedFont = localStorage.getItem('daniel_font_size_idx_v4');
      if (savedFont !== null) currentFontIdx = Math.max(0, Math.min(fontSizes.length - 1, parseInt(savedFont, 10) || 1));
      const savedThemeName = localStorage.getItem('daniel_theme_name_v1');
      if (savedThemeName === 'white' || savedThemeName === 'night') {
        currentThemeIdx = themes.indexOf(savedThemeName);
      } else {
        currentThemeIdx = 0;
      }
    } catch (e) {}

    function showToast(msg) {
      const toast = document.getElementById('toast');
      toast.innerText = msg;
      toast.classList.remove('opacity-0', 'pointer-events-none');
      setTimeout(() => {
        toast.classList.add('opacity-0', 'pointer-events-none');
      }, 2500);
    }

    function applyTheme(idx, silent) {
      currentThemeIdx = ((idx % themes.length) + themes.length) % themes.length;
      const theme = themes[currentThemeIdx];
      const html = document.documentElement;
      const themeIcon = document.getElementById('theme-icon');
      const isDark = theme === 'night' || theme === 'charcoal';

      html.classList.toggle('dark', isDark);
      html.dataset.theme = theme;
      document.body.dataset.theme = theme;

      document.body.classList.remove('charcoal-mode', 'paper-mode', 'white-mode', 'night-mode', 'bg-paper-950', 'bg-paper-50', 'bg-white', 'text-paper-100', 'text-ink-900', 'selection:bg-amber-900', 'selection:bg-amber-200');
      document.body.classList.add(theme + '-mode');
      document.body.classList.toggle('bg-paper-950', isDark);
      document.body.classList.toggle('text-paper-100', isDark);
      document.body.classList.toggle('selection:bg-amber-900', isDark);
      document.body.classList.toggle('bg-paper-50', theme === 'paper');
      document.body.classList.toggle('bg-white', theme === 'white');
      document.body.classList.toggle('text-ink-900', !isDark);
      document.body.classList.toggle('selection:bg-amber-200', !isDark);

      if (themeIcon) {
        themeIcon.innerText = theme === 'charcoal' ? '◑ Chiaroscuro'
          : theme === 'night' ? '🌙 Night'
          : theme === 'white' ? '⚪ White'
          : '☀️ Paper';
      }
      document.body.classList.remove('flashlight-active', 'beam-ready');
      try {
        localStorage.setItem('daniel_theme_v1', String(currentThemeIdx));
        localStorage.setItem('daniel_theme_name_v1', theme);
      } catch (e) {}
      if (!silent && themeIcon) showToast(`Theme: ${themeIcon.innerText}`);
    }

    function cycleTheme() {
      applyTheme(currentThemeIdx + 1);
    }

    function applyFontSize() {
      const current = fontSizes[currentFontIdx];
      document.documentElement.style.setProperty('--reading-font-size', current.size);
      const indicator = document.getElementById('font-size-indicator');
      if (indicator) indicator.innerText = current.label;
      try {
        localStorage.setItem('daniel_font_size_idx_v4', currentFontIdx);
      } catch (e) {}
    }

    function adjustFontSize(delta) {
      currentFontIdx = Math.max(0, Math.min(fontSizes.length - 1, currentFontIdx + delta));
      applyFontSize();
      showToast(`Text size: ${fontSizes[currentFontIdx].label}`);
    }

    /* =========================================================================
       4. TOC DRAWER & RENDERING
       ========================================================================= */
    function toggleTocDrawer() {
      const drawer = document.getElementById('toc-drawer');
      const overlay = document.getElementById('toc-overlay');
      const isOpen = !drawer.classList.contains('-translate-x-full');

      if (isOpen) {
        drawer.classList.add('-translate-x-full');
        overlay.classList.add('opacity-0', 'pointer-events-none');
      } else {
        renderToc();
        drawer.classList.remove('-translate-x-full');
        overlay.classList.remove('opacity-0', 'pointer-events-none');
      }
    }

    function hasCompletedCourse() {
      return sheetsData.every((_, i) => completedSheets.has(i));
    }

    function syncCertificateCta() {
      const btn = document.getElementById('btn-download-certificate');
      if (!btn) return;
      btn.hidden = !hasCompletedCourse();
    }

    function openCertificateIfReady() {
      if (!hasCompletedCourse() || !window.StudyCertificate) return;
      window.StudyCertificate.open();
    }

    function renderToc() {
      const list = document.getElementById('toc-unit-list');
      list.innerHTML = '';

      sheetsData.forEach((sheet, idx) => {
        const isCurrent = idx === currentSheetIndex;
        const isDone = completedSheets.has(idx);

        const locked = !canAccessSheet(idx);
        const btn = document.createElement(locked ? 'div' : 'button');
        if (!locked) {
          btn.addEventListener('click', () => {
            loadSheet(idx);
            toggleTocDrawer();
          });
        }
        btn.className = `w-full text-left p-3 rounded-lg flex items-start space-x-3 transition-colors ${
          locked
            ? 'opacity-45 cursor-default pointer-events-none'
            : isCurrent 
            ? 'bg-amber-100/70 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-800' 
            : 'hover:bg-paper-200/60 dark:hover:bg-paper-900'
        }`;
        if (locked) btn.setAttribute('aria-disabled', 'true');

        btn.innerHTML = `
          <div class="mt-0.5 w-5 h-5 rounded-full flex items-center justify-center text-xs font-mono font-bold shrink-0 ${
            isDone 
              ? 'bg-emerald-600 text-white' 
              : isCurrent 
                ? 'bg-amber-600 text-white' 
                : 'bg-paper-300 dark:bg-paper-800 text-ink-600 dark:text-paper-400'
          }">
            ${isDone ? '✓' : idx}
          </div>
          <div class="flex-1 min-w-0">
            <div class="flex items-center justify-between text-[10px] font-mono text-ink-500 dark:text-paper-400 uppercase">
              <span>${sheet.epoch}</span>
              <span>${sheet.readTime}</span>
            </div>
            <h4 class="font-serif text-sm font-semibold text-ink-900 dark:text-paper-100 truncate mt-0.5">
              ${sheet.title}
            </h4>
            ${locked ? '<p class="mt-1 font-mono text-[10px] uppercase tracking-wider text-amber-800 dark:text-amber-400">Locked — finish the open sitting</p>' : ''}
          </div>
        `;
        list.appendChild(btn);
      });

      const pct = Math.round((completedSheets.size / sheetsData.length) * 100);
      document.getElementById('toc-mastery-percent').innerText = `${pct}%`;
      document.getElementById('toc-mastery-bar').style.width = `${pct}%`;
      syncCertificateCta();
    }

    /* =========================================================================
       5. SHEET LOADER & POMODORO SYNCHRONIZATION
       ========================================================================= */
    function escapeStudy(value) {
      return String(value == null ? "" : value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
    }

    function renderList(items, ordered) {
      const tag = ordered ? "ol" : "ul";
      return "<" + tag + ">" + (items || []).map((item) => "<li>" + escapeStudy(item) + "</li>").join("") + "</" + tag + ">";
    }

    function renderWhy(text) {
      if (!text) return "";
      return '<p class="study-why">' + escapeStudy(text) + "</p>";
    }

    function renderTrace(items) {
      return "<ol>" + (items || []).map((item) => {
        const command = typeof item === "string" ? item : (item && item.do) || "";
        const why = typeof item === "string" ? "" : (item && item.why) || "";
        return "<li>" + escapeStudy(command) + renderWhy(why) + "</li>";
      }).join("") + "</ol>";
    }

    function renderClaim(value, className) {
      const claim = value && typeof value === "object" ? (value.claim || "") : (value || "");
      const why = value && typeof value === "object" ? (value.why || "") : "";
      const cls = className ? ' class="' + className + '"' : "";
      return "<p" + cls + ">" + escapeStudy(claim) + "</p>" + renderWhy(why);
    }

    function escapeVerify(text) {
      return String(text || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
    }

    function verifyKindLabel(kind) {
      if (kind === 'history') return 'Historical source';
      if (kind === 'inscription') return 'Inscription / chronicle';
      if (kind === 'commentary') return 'Dated reader';
      return 'Scripture';
    }
    function verifyOpenHref(href) {
      const s = String(href || '');
      return /^https:\/\//i.test(s) ? s : '';
    }
    function autoScriptureHref(it) {
      if (it.kind !== 'scripture') return '';
      const head = String(it.source || '').split(',')[0].trim();
      if (!/\d/.test(head)) return '';
      return 'https://www.biblegateway.com/passage/?search=' + encodeURIComponent(head) + '&version=KJV';
    }
    function renderSheetVerify(index) {
      const box = document.getElementById('sheet-verify');
      const pack = window.SHEET_VERIFY && window.SHEET_VERIFY[index];
      if (!box) return;
      if (!pack || !pack.items || !pack.items.length) {
        box.hidden = true;
        box.innerHTML = '';
        return;
      }
      box.hidden = false;
      const cards = pack.items.map((it) => {
        const open = verifyOpenHref(it.href) || verifyOpenHref(autoScriptureHref(it));
        const openHtml = open
          ? ' <a class="sheet-verify-open" href="' + escapeVerify(open) + '" target="_blank" rel="noopener noreferrer">Open source</a>'
          : '';
        return '<article class="sheet-verify-card">' +
          '<p class="sheet-verify-kind">' + escapeVerify(verifyKindLabel(it.kind)) + '</p>' +
          '<h4>' + escapeVerify(it.lesson) + '</h4>' +
          '<blockquote>' + escapeVerify(it.quote) + '</blockquote>' +
          '<p class="sheet-verify-source"><b>Source</b> ' + escapeVerify(it.source) + openHtml + '</p>' +
          '<p class="sheet-verify-check"><b>Check</b> ' + escapeVerify(it.check) + '</p>' +
          '</article>';
      }).join('');
      box.innerHTML =
        '<p class="sheet-verify-kicker">Verify this sitting</p>' +
        '<h3>Lessons, sources, and quotations</h3>' +
        '<p class="sheet-verify-claim">' + escapeVerify(pack.claim) + '</p>' +
        '<p class="sheet-verify-count">' + pack.items.length + ' direct references. Open the source; do not take the card’s word alone.</p>' +
        '<div class="sheet-verify-list">' + cards + '</div>';
    }

    function renderStudyGuide(guide) {
      const box = document.getElementById("sheet-study-path");
      if (!box) return;
      if (!guide || !guide.trace || !guide.trace.length) {
        box.hidden = true;
        box.innerHTML = "";
        return;
      }
      box.hidden = false;
      box.innerHTML =
        '<p class="study-path-kicker">How to study this sheet</p>' +
        '<p class="sitting-path-hint">Path for this sitting: study the excerpt, sources, and Christology plaque → open the Map page → open the 3D Gallery → return for the questions → next lesson.</p>' +
        "<h3>Trace it yourself</h3>" +
        renderTrace(guide.trace) +
        "<h4>Christ at the center</h4>" +
        renderClaim(guide.christ, "study-christ") +
        "<h4>Why this matters now</h4>" +
        renderClaim(guide.now) +
        "<h4>How it helps you</h4>" +
        renderClaim(guide.help) +
        "<h4>Why it is valuable</h4>" +
        renderClaim(guide.value) +
        "<h4>Questions to sit with</h4>" +
        renderList(guide.ask, false);
    }

    function renderFacilitatorStrip(fac) {
      const box = document.getElementById("facilitator-strip");
      if (!box) return;
      const urlParams = new URLSearchParams(window.location.search);
      const isTeach = urlParams.get("teach") === "1" || localStorage.getItem("daniel_teach_mode") === "1";
      if (!fac || !isTeach) {
        box.hidden = true;
        box.innerHTML = "";
        return;
      }
      box.hidden = false;
      const points = (fac.talkingPoints || []).map(p => `<li>${p}</li>`).join('');
      const asks = (fac.askClass || []).map(q => `<li>${q}</li>`).join('');
      box.innerHTML = `
        <div class="p-4 sm:p-5 rounded-xl border border-amber-600/40 bg-amber-500/10 dark:bg-amber-950/20 mb-8 font-sans">
          <div class="flex items-center justify-between border-b border-amber-600/20 pb-3 mb-4">
            <div class="flex items-center gap-2">
              <span class="px-2 py-0.5 rounded bg-amber-600 text-paper-50 font-mono text-[11px] font-bold uppercase">Classroom Facilitator</span>
              <span class="font-mono text-xs text-ink-600 dark:text-paper-400">Paced for ${fac.minutes || 40} min class</span>
            </div>
            <span class="text-[11px] font-mono text-amber-800 dark:text-amber-400 font-semibold">Teacher Notes (?teach=1)</span>
          </div>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div>
              <h5 class="font-mono font-bold text-amber-900 dark:text-amber-300 uppercase text-[11px] mb-2">Key Discussion Points</h5>
              <ul class="space-y-1.5 text-ink-800 dark:text-paper-200 list-disc list-inside">
                ${points}
              </ul>
            </div>
            <div>
              <h5 class="font-mono font-bold text-amber-900 dark:text-amber-300 uppercase text-[11px] mb-2">Ask the Class</h5>
              <ul class="space-y-1.5 text-ink-800 dark:text-paper-200 list-disc list-inside">
                ${asks}
              </ul>
            </div>
          </div>
        </div>
      `;
    }

    function canAccessSheet(index) {
      if (new URLSearchParams(location.search).get("preview") === "full") return true;
      if (window.BAJourney && typeof window.BAJourney.canAccessSheet === 'function') {
        return window.BAJourney.canAccessSheet(index);
      }
      return Number(index) === 0;
    }

    function denyLockedSitting(index) {
      if (window.BAJourney && typeof window.BAJourney.announceLock === 'function') {
        const target = (index == null || Number.isNaN(Number(index)))
          ? (window.BAJourney.maxOpenSheet() + 1)
          : Number(index);
        window.BAJourney.announceLock('sheet', target);
        return;
      }
      const open = window.BAJourney && typeof window.BAJourney.maxOpenSheet === 'function'
        ? window.BAJourney.maxOpenSheet()
        : 0;
      const label = window.BAJourney ? window.BAJourney.sheetLabel(open) : 'the open sitting';
      showToast('Finish ' + label + ' to open the next sitting.');
    }

    let sittingGuideMode = null;
    let endCardShownForSheet = -1;

    function clearGuideSpotlight() {
      document.querySelectorAll('.is-guide-spot').forEach((el) => el.classList.remove('is-guide-spot'));
    }

    function syncSittingOverlay() {
      const guide = document.getElementById('sitting-guide');
      const open = guide && !guide.hidden;
      document.body.classList.toggle('is-sitting-overlay', !!open);
    }

    function hideSittingGuide() {
      const box = document.getElementById('sitting-guide');
      if (!box) return;
      box.hidden = true;
      box.classList.remove('is-end');
      box.style.alignItems = '';
      sittingGuideMode = null;
      clearGuideSpotlight();
      syncSittingOverlay();
    }

    function showIntroGuide(index) {
      const data = sheetsData[index];
      const guide = data && data.guide && data.guide.intro;
      const box = document.getElementById('sitting-guide');
      if (!guide || !box) return;
      sittingGuideMode = 'intro';
      box.classList.remove('is-end');
      box.style.alignItems = '';
      document.getElementById('sitting-guide-kicker').textContent = (window.BAJourney && window.BAJourney.sheetLabel(index)) || ('Sheet ' + index);
      document.getElementById('sitting-guide-title').textContent = guide.title || 'Begin this sitting';
      document.getElementById('sitting-guide-expect').textContent = guide.expect || '';
      const list = document.getElementById('sitting-guide-do');
      list.innerHTML = '';
      (guide.do || []).forEach((item) => {
        const li = document.createElement('li');
        li.textContent = item;
        list.appendChild(li);
      });
      document.getElementById('sitting-guide-primary').textContent = 'Begin this sitting';
      document.getElementById('sitting-guide-skip').hidden = false;
      box.hidden = false;
      syncSittingOverlay();
      const primary = document.getElementById('sitting-guide-primary');
      if (primary) primary.focus();
    }

    function layoutEndSpotlight(target) {
      const box = document.getElementById('sitting-guide');
      if (!box || !target || target.hidden) return;
      let r = target.getBoundingClientRect();
      if (r.bottom < 80 || r.top > window.innerHeight - 40) {
        target.scrollIntoView({ behavior: 'auto', block: 'center' });
        r = target.getBoundingClientRect();
        if (r.bottom < 80 || r.top > window.innerHeight - 40) {
          const top = window.scrollY + r.top - (window.innerHeight / 2) + (r.height / 2);
          window.scrollTo(0, Math.max(0, top));
          r = target.getBoundingClientRect();
        }
      }
      const pad = 18;
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      const rad = Math.max(r.width, r.height) / 2 + pad;
      box.style.setProperty('--spot-x', cx + 'px');
      box.style.setProperty('--spot-y', cy + 'px');
      box.style.setProperty('--spot-r', rad + 'px');
      box.style.alignItems = cy > (window.innerHeight * 0.42) ? 'flex-start' : 'flex-end';
    }

    function scheduleEndSpotlight(target) {
      const run = () => layoutEndSpotlight(target);
      run();
      requestAnimationFrame(() => {
        run();
        requestAnimationFrame(run);
      });
      setTimeout(run, 60);
      setTimeout(run, 220);
      setTimeout(run, 480);
    }

    function showEndGuide(index) {
      const data = sheetsData[index];
      const guide = data && data.guide && data.guide.end;
      const box = document.getElementById('sitting-guide');
      if (!guide || !box) return;
      sittingGuideMode = 'end';
      endCardShownForSheet = index;
      box.classList.add('is-end');
      document.getElementById('sitting-guide-kicker').textContent = 'Where to go next';
      document.getElementById('sitting-guide-title').textContent = guide.title || 'Continue';
      document.getElementById('sitting-guide-expect').textContent = guide.nextWhy || '';
      document.getElementById('sitting-guide-do').innerHTML = '';
      document.getElementById('sitting-guide-primary').textContent = 'Go to the highlighted control';
      document.getElementById('sitting-guide-skip').hidden = true;
      box.hidden = false;
      syncSittingOverlay();
      const spotId = guide.spotlight || 'next-sheet-btn';
      const target = document.getElementById(spotId);
      if (target && !target.hidden) {
        target.classList.add('is-guide-spot');
        scheduleEndSpotlight(target);
      }
    }

    function maybeShowEndGuide() {
      if (!sheetQuizComplete()) return;
      if (endCardShownForSheet === currentSheetIndex) return;
      if (sittingGuideMode === 'intro') return;
      showEndGuide(currentSheetIndex);
    }

    function finishIntroGuide() {
      if (window.BAJourney) window.BAJourney.markIntroSeen(currentSheetIndex);
      hideSittingGuide();
    }

    function activateGuideTarget() {
      const data = sheetsData[currentSheetIndex];
      const spotId = (data && data.guide && data.guide.end && data.guide.end.spotlight) || 'next-sheet-btn';
      hideSittingGuide();
      const target = document.getElementById(spotId);
      if (target && !target.hidden && !target.disabled) target.click();
    }

    function syncAdvanceButtons(index) {
      const prevBtn = document.getElementById('prev-sheet-btn');
      const nextBtn = document.getElementById('next-sheet-btn');
      const nextBtnText = document.getElementById('next-btn-text');
      if (prevBtn) prevBtn.style.visibility = index === 0 ? 'hidden' : 'visible';
      if (nextBtn) nextBtn.hidden = false;
      if (nextBtnText) {
        if (index === sheetsData.length - 1) nextBtnText.innerText = 'Complete Codex & Review Mastery';
        else nextBtnText.innerText = 'Continue to Sheet ' + (index + 1) + ' →';
      }
      updateNextGate();
    }

    let strongsDataCache = null;
    async function getStrongsData() {
      if (strongsDataCache) return strongsDataCache;
      try {
        const res = await fetch('bible/strongs-daniel.json');
        if (res.ok) {
          strongsDataCache = await res.json();
          return strongsDataCache;
        }
      } catch (e) {}
      return {};
    }

    function wireStrongsTooltips() {
      document.querySelectorAll('.strongs-gloss').forEach((el) => {
        if (el.dataset.wired) return;
        el.dataset.wired = 'true';
        el.addEventListener('click', async (e) => {
          e.stopPropagation();
          const lemmaId = el.getAttribute('data-lemma');
          if (!lemmaId) return;
          const existing = el.querySelector('.strongs-popover');
          if (existing) {
            existing.remove();
            return;
          }
          document.querySelectorAll('.strongs-popover').forEach(p => p.remove());

          const data = await getStrongsData();
          const entry = data[lemmaId];
          if (!entry) return;

          const popover = document.createElement('div');
          popover.className = 'strongs-popover';
          popover.innerHTML = `
            <div class="flex items-center justify-between border-b border-amber-500/30 pb-1 mb-1.5 font-mono text-[10px]">
              <span class="font-bold text-amber-700 dark:text-amber-400">${lemmaId} · ${entry.lang || 'Hebrew'}</span>
              <button type="button" class="text-ink-400 hover:text-ink-800 dark:hover:text-paper-100 px-1 font-bold" onclick="event.stopPropagation(); this.closest('.strongs-popover').remove();">✕</button>
            </div>
            <div class="font-serif text-sm font-bold text-ink-900 dark:text-paper-100 mb-0.5">
              ${entry.lemma || ''} <span class="italic font-normal text-xs text-ink-600 dark:text-paper-300">(${entry.translit || ''})</span>
            </div>
            ${entry.derivation ? `<p class="text-[10px] text-ink-500 dark:text-paper-400 mb-1 font-mono">${entry.derivation}</p>` : ''}
            <p class="font-semibold text-amber-800 dark:text-amber-300 mb-1 text-xs">${entry.gloss || ''}</p>
            <p class="text-[11px] text-ink-700 dark:text-paper-200 leading-relaxed border-t border-amber-500/20 pt-1">${entry.why || ''}</p>
          `;
          el.appendChild(popover);
          if (window.StudyCompetency) {
            window.StudyCompetency.recordScriptureLookup(`Strong's ${lemmaId} (${entry.translit || entry.lemma || ''})`);
          }
        });
      });
    }

    window.switchDossierTab = function(tabId) {
      const container = document.getElementById('primary-source-dossier');
      if (!container) return;
      container.querySelectorAll('.dossier-tab').forEach(btn => {
        const isActive = btn.getAttribute('data-dossier-tab') === tabId;
        btn.className = isActive 
          ? "dossier-tab px-3 py-1.5 rounded-lg font-mono text-xs font-bold border border-amber-600 bg-amber-600 text-paper-50 transition-all"
          : "dossier-tab px-3 py-1.5 rounded-lg font-mono text-xs font-bold border border-paper-300 dark:border-paper-700 bg-paper-200/50 dark:bg-paper-800 text-ink-700 dark:text-paper-300 hover:border-amber-600 transition-all";
      });
      container.querySelectorAll('.dossier-pane').forEach(pane => {
        pane.classList.toggle('hidden', pane.getAttribute('data-dossier-pane') !== tabId);
      });
      if (window.StudyCompetency) {
        window.StudyCompetency.recordScriptureLookup(`Primary Source Dossier: ${tabId}`);
      }
    };

    window.onPlacementConfirmed = function() {
      const seen = window.BAJourney && window.BAJourney.hasSeenIntro(currentSheetIndex);
      if (!seen) {
        showIntroGuide(currentSheetIndex);
      }
    };

    document.addEventListener('click', (e) => {
      const termBtn = e.target.closest('.term-gloss');
      if (e.target.closest('[data-term-close]')) {
        const pop = e.target.closest('.term-popover');
        if (pop) pop.remove();
        return;
      }
      if (e.target.closest('[data-term-index]')) {
        const id = e.target.closest('[data-term-index]').getAttribute('data-term-index');
        document.querySelectorAll('.term-popover, .strongs-popover').forEach(p => p.remove());
        if (window.GlossaryIndex) window.GlossaryIndex.openIndex(id);
        return;
      }
      if (termBtn && window.GlossaryIndex) {
        e.stopPropagation();
        window.GlossaryIndex.showPopover(termBtn);
        return;
      }
      if (!e.target.closest('.strongs-popover') && !e.target.closest('.strongs-gloss') && !e.target.closest('.term-popover') && !e.target.closest('.term-gloss')) {
        document.querySelectorAll('.strongs-popover, .term-popover').forEach(p => p.remove());
      }
    });

    const LESSON_CONNECT_TABLE = [
      { mapYear: 'y605', galleryAssets: ['assembled'] },
      { mapYear: 'y605', galleryAssets: ['lion'] },
      { mapYear: 'y605', galleryAssets: ['head', 'chest', 'thighs', 'legs', 'feet', 'stone'] },
      { mapYear: 'y605', galleryAssets: ['dura'] },
      { mapYear: 'y605', galleryAssets: ['stump', 'ox_king'] },
      { mapYear: 'y539', galleryAssets: [] },
      { mapYear: 'y539', galleryAssets: ['bear'] },
      { mapYear: 'y538', galleryAssets: ['leopard', 'beast', 'years1260', 'ancient', 'son'] },
      { mapYear: 'y1844', galleryAssets: ['ram', 'goat', 'goat_broken', 'goat_horn'] },
      { mapYear: 'y457', galleryAssets: ['decree'] },
      { mapYear: 'y12', galleryAssets: ['kings', 'michael', 'sealed'] }
    ];
    const LESSON_CONNECT_COPY = [
      {
        kicker: 'The siege is the door of the book',
        lead: 'Daniel opens at 605 B.C. Walk Jerusalem into Babylon on the map, then stand before the whole image — the statue this book will take apart sitting by sitting.',
        map: 'Walk the siege of 605 B.C.',
        gallery: 'Stand before the complete statue'
      },
      {
        kicker: 'After the pulse of Daniel 1',
        lead: 'The young men who kept their food also kept their names. See the city that held them, then the winged lion — the gold kingdom they were trained to serve.',
        map: 'See Babylon, the city that held them',
        gallery: 'Turn the winged lion of gold'
      },
      {
        kicker: 'After the metals are named',
        lead: 'Daniel 2:38 names the head. Keep 605 B.C. on the map, then turn the image itself — gold, silver, brass, iron, and the stone that strikes the feet.',
        map: 'Keep 605 B.C. on the line of empires',
        gallery: 'Turn the image metal by metal'
      },
      {
        kicker: 'After the furnace',
        lead: 'The plain of Dura is not a parable. Find it on the map of Babylon, then stand before the gold image they were told to worship.',
        map: 'Find the plain of Dura',
        gallery: 'Stand before the image on the plain'
      },
      {
        kicker: 'After the tree is cut',
        lead: 'The watchers’ sentence falls on the same city. Stay with Babylon long enough to see the stump, then the ox-king — pride bound with iron and brass.',
        map: 'Stay with Babylon under the watchers',
        gallery: 'See the stump and the ox-king'
      },
      {
        kicker: 'After the writing on the wall',
        lead: 'That night the gold kingdom ends. The map moves to 539 B.C. — the feast, the river, the gates left open.',
        map: 'Open 539 B.C. — the night Babylon fell',
        gallery: 'View this sitting’s 3D artifact'
      },
      {
        kicker: 'After the den of lions',
        lead: 'The silver kingdom keeps a law it cannot change. See Medo-Persia on the map, then the bear — the next metal of the image, now a living court.',
        map: 'See the silver kingdom on the map',
        gallery: 'Turn the bear of Medo-Persia'
      },
      {
        kicker: 'After the four beasts',
        lead: 'The sea of kingdoms is the same line as the metals. Open AD 538 on the map, then the leopard, the fourth beast, and the 1,260.',
        map: 'Open AD 538 on the map of history',
        gallery: 'Turn the beasts of the night vision'
      },
      {
        kicker: 'After ram and goat',
        lead: 'Greece and the broken horn sit on the same line as the sanctuary count. Walk the map, then turn ram, goat, and the little horn.',
        map: 'Walk the sanctuary line on the map',
        gallery: 'Turn the ram, the goat, and the horn'
      },
      {
        kicker: 'After the seventy weeks',
        lead: 'The decree of 457 B.C. starts the weeks. Find it on the map, then the scroll of the commandment — the paper that starts the count.',
        map: 'Find the decree of 457 B.C.',
        gallery: 'See the decree that starts the weeks'
      },
      {
        kicker: 'After the last vision',
        lead: 'The book closes with kings, Michael, and a seal. Open Daniel 12 on the map, then those three figures in form.',
        map: 'Open the last station — Daniel 12',
        gallery: 'See the kings, Michael, and the sealed book'
      }
    ];

    function sittingConnectConfig(index) {
      const fromJourney = window.BAJourney && window.BAJourney.SITTING_ASSETS;
      const assets = fromJourney && fromJourney[index]
        ? fromJourney[index].slice()
        : ((LESSON_CONNECT_TABLE[index] && LESSON_CONNECT_TABLE[index].galleryAssets) || ['assembled']);
      const mapYear = (LESSON_CONNECT_TABLE[index] && LESSON_CONNECT_TABLE[index].mapYear) || 'y605';
      return { mapYear: mapYear, galleryAssets: assets, galleryAsset: assets[0] || 'assembled' };
    }

    function enrollmentUrl() {
      try {
        return new URL('index.html', window.location.href).href;
      } catch (e) {
        return (window.location.origin || '') + '/index.html';
      }
    }

    async function shareSitting() {
      const url = enrollmentUrl();
      const title = 'The Scroll of Daniel';
      const text = 'Join this sitting of the Scroll of Daniel. Open the cover, agree to the terms, and sign in to begin.';
      try {
        if (navigator.share) {
          await navigator.share({ title: title, text: text, url: url });
          showToast('Invitation ready to send.');
          return;
        }
        if (navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(url);
          showToast('Enrollment link copied. Recipients sign in on the cover.');
          return;
        }
      } catch (err) {
        if (err && err.name === 'AbortError') return;
      }
      showToast('Share the home page so they can sign in: ' + url);
    }

    function renderLessonConnectBar(index) {
      const bar = document.getElementById('lesson-connect');
      if (!bar) return;
      const cfg = sittingConnectConfig(index);
      const copy = LESSON_CONNECT_COPY[index] || LESSON_CONNECT_COPY[0];
      const kicker = document.getElementById('lesson-connect-kicker');
      const lead = document.getElementById('lesson-connect-lead');
      const mapBtn = document.getElementById('btn-lesson-map');
      const galleryBtn = document.getElementById('btn-lesson-gallery');
      const mapLabel = document.getElementById('btn-lesson-map-label');
      const galleryLabel = document.getElementById('btn-lesson-gallery-label');
      const shareBtn = document.getElementById('btn-lesson-share');
      if (kicker) kicker.textContent = copy.kicker;
      if (lead) lead.textContent = copy.lead;
      if (mapBtn) {
        mapBtn.href = `map.html?year=${encodeURIComponent(cfg.mapYear)}&from=lesson&sheet=${index}`;
      }
      if (mapLabel) mapLabel.textContent = copy.map;
      if (galleryBtn) {
        galleryBtn.href = `gallery.html?asset=${encodeURIComponent(cfg.galleryAsset)}&from=lesson&sheet=${index}`;
        galleryBtn.hidden = !(cfg.galleryAssets && cfg.galleryAssets.length);
      }
      if (galleryLabel) galleryLabel.textContent = copy.gallery;
      if (shareBtn && !shareBtn.dataset.wired) {
        shareBtn.dataset.wired = 'true';
        shareBtn.addEventListener('click', shareSitting);
      }
    }

    function playSheetEnter() {
      const main = document.querySelector('.sitting-main');
      if (!main) return;
      main.classList.remove('sheet-enter');
      void main.offsetWidth;
      main.classList.add('sheet-enter');
    }

    function renderChristologyPlaque(c) {
      const section = document.getElementById('sheet-christology');
      if (!section) return;
      if (!c) {
        section.hidden = true;
        return;
      }
      section.hidden = false;
      const scriptEl = document.getElementById('christology-scripture');
      const titleEl = document.getElementById('christology-title');
      const bodyEl = document.getElementById('christology-body');
      if (scriptEl) scriptEl.textContent = c.scripture || '';
      if (titleEl) titleEl.textContent = c.title || '';
      if (bodyEl) {
        if (Array.isArray(c.body)) {
          bodyEl.innerHTML = c.body.map((p) => `<p>${p.trim()}</p>`).join('');
        } else if (typeof c.body === 'string') {
          bodyEl.innerHTML = c.body.split(/\n\n+/).map((p) => `<p>${p.trim()}</p>`).join('');
        } else {
          bodyEl.innerHTML = '';
        }
      }
    }

    function renderSheetFlow(data) {
      const box = document.getElementById('sheet-flow');
      if (!box) return;
      const steps = (data && Array.isArray(data.flow)) ? data.flow : [];
      if (!steps.length) {
        box.hidden = true;
        box.innerHTML = '';
        return;
      }
      const kindLabels = { anchor: 'Anchor', scripture: '', history: 'History', guard: 'Guard rail' };
      const items = steps.map((step, i) => {
        const kind = kindLabels[step.kind] !== undefined ? step.kind : 'scripture';
        const kindLabel = kindLabels[kind];
        return `
          <li class="flow-step flow-step-${kind}">
            <span class="flow-marker" aria-hidden="true">${i + 1}</span>
            <div class="flow-body">
              <div class="flow-head">
                <span class="flow-title">${step.title}</span>
                <span class="flow-ref">${kindLabel ? `<span class="flow-kind flow-kind-${kind}">${kindLabel} · </span>` : ''}<span class="flow-tag">${step.tag}</span></span>
              </div>
              <p class="flow-text">${step.text}</p>
            </div>
          </li>`;
      }).join('');
      box.hidden = false;
      box.innerHTML = `
        <p class="flow-kicker">The line of this sitting</p>
        <h3 class="flow-heading">One path, first verse to last claim</h3>
        <ol class="flow-list">${items}</ol>
      `;
    }

    const SCROLL_KEY = 'scroll_section';
    let scrollHold = false;

    function readScrollPlace() {
      try {
        const raw = JSON.parse(localStorage.getItem(SCROLL_KEY) || 'null');
        const sheet = raw && Number(raw.sheet);
        const top = raw && Number(raw.top);
        if (!Number.isFinite(sheet) || !Number.isFinite(top) || top < 0) return null;
        return { sheet: sheet, top: top };
      } catch (e) {
        return null;
      }
    }

    function writeScrollPlace(sheet, top) {
      try {
        localStorage.setItem(SCROLL_KEY, JSON.stringify({
          sheet: sheet,
          top: Math.max(0, Math.round(top))
        }));
      } catch (e) {}
    }

    function rememberSheetUrl(index) {
      try {
        const params = new URLSearchParams(location.search);
        params.delete('id');
        params.delete('section');
        params.set('sheet', String(index));
        const next = location.pathname + '?' + params.toString() + location.hash;
        if (next !== location.pathname + location.search + location.hash) {
          history.replaceState(null, '', next);
        }
      } catch (e) {}
    }

    function placeReader(index, restore) {
      const hashTarget = location.hash ? document.querySelector(location.hash) : null;
      if (hashTarget) {
        setTimeout(() => hashTarget.scrollIntoView({ behavior: 'auto', block: 'start' }), 0);
        return;
      }
      let top = 0;
      if (restore) {
        const place = readScrollPlace();
        if (place && place.sheet === index) top = place.top;
      } else {
        writeScrollPlace(index, 0);
      }
      scrollHold = true;
      window.scrollTo(0, top);
      requestAnimationFrame(() => { scrollHold = false; });
    }

    function loadSheet(index, opts) {
      if (index < 0 || index >= sheetsData.length) return;
      if (!canAccessSheet(index)) {
        denyLockedSitting(index);
        return;
      }
      currentSheetIndex = index;
      endCardShownForSheet = -1;
      hideSittingGuide();
      rememberSheetUrl(index);
      try {
        localStorage.setItem('daniel_historicist_sheet', index);
      } catch (e) {}

      const data = sheetsData[index];
      const fromEpoch = opts && opts.fromEpoch;

      // Automatically calibrate Pomodoro to sheet's allocated time
      setPomodoroDuration(data.allocatedMinutes || 5);

      // Synchronize Prophetic Horizon Timeline Node
      const epochIndex = sheetToTimelineMap[index] !== undefined ? sheetToTimelineMap[index] : 0;
      if (!fromEpoch) setEpochInfo(epochIndex, { fromSheet: true });

      // Top progress bar
      const overallProgress = ((index + 1) / sheetsData.length) * 100;
      document.getElementById('progress-bar').style.width = `${overallProgress}%`;

      // Set Metadata
      document.getElementById('sheet-epoch-tag').innerHTML = data.epoch;
      document.getElementById('sheet-read-time').innerText = data.readTime;
      document.getElementById('sheet-scripture-ref').innerHTML = data.scripture;
      document.getElementById('sheet-title').innerText = data.title;
      document.getElementById('sheet-subtitle').innerText = data.subtitle;

      // Render Article Content
      document.getElementById('sheet-article').innerHTML = data.content;
      renderLessonMedia(data);
      renderSheetFlow(data);
      renderLessonConnectBar(index);
      renderStudyGuide(data.studyGuide);
      renderFacilitatorStrip(data.facilitator);
      renderSheetVerify(index);
      renderChristologyPlaque(data.christology);
      if (window.GlossaryIndex) {
        window.GlossaryIndex.linkArticle(document.getElementById('sheet-article'));
      }
      document.querySelectorAll('#sheet-article img, #epoch-plate-img, #context-img').forEach((img) => {
        img.loading = 'lazy';
        if (!img.alt) img.alt = data.title || 'Study illustration';
      });

      // Start sheet competency telemetry timer and record sheet passage
      if (window.StudyCompetency) {
        window.StudyCompetency.startSheetTimer(index);
        const pass = (data && data.scripture) || `Sheet ${index}`;
        window.StudyCompetency.recordScriptureLookup(pass);
      }

      // Render Active Proof Workbench Gate
      const wbContainer = document.getElementById('workbench-container');
      if (wbContainer && window.StudyWorkbench) {
        window.StudyWorkbench.renderWorkbench(index, wbContainer, () => {
          updateNextGate();
        });
      }

      wireStrongsTooltips();

      const recapTitle = document.getElementById('recap-title');
      const recapBody = document.getElementById('recap-body');
      if (recapTitle) recapTitle.textContent = data.title;
      if (recapBody) recapBody.textContent = (data.scripture || '') + ' — ' + (data.subtitle || '');
      const yearId = STUDY_EPOCH_TO_YEAR[currentEpochIndex] || STUDY_EPOCH_TO_YEAR[epochIndex] || 'y605';
      const notes = document.getElementById('sheet-notes');
      if (notes) {
        try { notes.value = localStorage.getItem('baNote-' + index) || ''; } catch (e) { notes.value = ''; }
      }
      if (window.BAJourney) window.BAJourney.save({ sheet: index, year: yearId });
      renderSheetInstruments(index);
      updateSpine(index, yearId, spineEmpireForSheet(index, journeyState().unlocked));
      restoreSheetStage(index);
      applySittingMap(index, { animate: false, focusId: null });
      resetSittingPath();
      syncHorizonLocks();
      playSheetEnter();

      // Render Quizzes
      renderQuiz(data.quizzes);
      syncAdvanceButtons(index);

      placeReader(index, !!(opts && opts.restorePlace));
      const skipIntro = opts && opts.skipIntro;
      const seen = window.BAJourney && window.BAJourney.hasSeenIntro(index);
      let hasChosenTrack = false;
      try { hasChosenTrack = !!localStorage.getItem('daniel_placement_track_v1'); } catch (e) { hasChosenTrack = true; }
      if (!skipIntro && !seen && hasChosenTrack) {
        showIntroGuide(index);
      }
    }

    function sheetQuizComplete() {
      const quizzes = (sheetsData[currentSheetIndex] && sheetsData[currentSheetIndex].quizzes) || [];
      if (!quizzes.length) return true;
      return quizzes.every((q, i) => answeredQuestions[i] === q.correct);
    }

    function canAdvancePath() {
      if (window.BAJourney && typeof window.BAJourney.isAdmin === "function" && window.BAJourney.isAdmin()) {
        return true;
      }
      if (window.StudyWorkbench && !window.StudyWorkbench.isSheetComplete(currentSheetIndex)) {
        return false;
      }
      if (completedSheets.has(currentSheetIndex)) return true;
      return sheetQuizComplete();
    }

    function updateNextGate() {
      const btn = document.getElementById('next-sheet-btn');
      const wbOk = !window.StudyWorkbench || window.StudyWorkbench.isSheetComplete(currentSheetIndex);
      const qOk = sheetQuizComplete();
      const ok = canAdvancePath();
      const hint = !wbOk ? 'Complete the active proof workbench above to continue' : (!qOk ? 'Answer every checkpoint question correctly to continue' : '');
      if (btn) {
        btn.disabled = !ok;
        btn.hidden = false;
        btn.title = hint;
      }
      const nextStep = document.querySelector('#sitting-path-steps [data-path="next"]');
      if (nextStep) nextStep.disabled = !ok;
    }

    function navigateSheet(delta) {
      if (delta > 0 && !canAdvancePath()) {
        showToast('Every checkpoint question must be answered correctly to continue.');
        const rev = document.getElementById('workbench-section') || document.getElementById('revision-section');
        if (rev) rev.scrollIntoView({ behavior: 'smooth' });
        return;
      }
      loadSheet(currentSheetIndex + delta);
    }

    /* =========================================================================
       6. ACTIVE RECALL REVISION & QUIZ CONTROLLER
       ========================================================================= */
    let answeredQuestions = {};

    function renderQuiz(quizzes) {
      const container = document.getElementById('quiz-container');
      container.innerHTML = '';
      answeredQuestions = {};
      const badge = document.getElementById('quiz-badge');
      if (badge) {
        const n = (quizzes && quizzes.length) || 0;
        badge.textContent = n + ' Question' + (n === 1 ? '' : 's') + ' to Advance';
      }

      quizzes.forEach((q, qIdx) => {
        const qBox = document.createElement('div');
        qBox.className = "p-5 sm:p-6 rounded-xl bg-transparent border border-paper-300/60 dark:border-paper-800/60 transition-all";
        qBox.id = `q-card-${qIdx}`;

        const qTitle = document.createElement('h4');
        qTitle.className = "font-serif text-base sm:text-lg font-bold text-ink-900 dark:text-paper-100 mb-4 leading-snug";
        qTitle.innerHTML = `<span class="font-mono text-xs px-2 py-0.5 rounded bg-paper-200 dark:bg-paper-900 mr-2 text-ink-600 dark:text-paper-400 font-semibold">Q${qIdx + 1}</span> ${q.question}`;
        qBox.appendChild(qTitle);

        const optionsGrid = document.createElement('div');
        optionsGrid.className = "space-y-2.5";

        q.options.forEach((optText, optIdx) => {
          const btn = document.createElement('button');
          btn.className = "quiz-option w-full p-3.5 sm:p-4 rounded-lg border border-paper-300 dark:border-paper-800 hover:border-ink-900 dark:hover:border-paper-200 bg-paper-100/50 dark:bg-paper-900/40 text-left text-xs sm:text-sm text-ink-800 dark:text-paper-200 flex items-start space-x-3";
          btn.id = `q-${qIdx}-opt-${optIdx}`;
          btn.innerHTML = `
            <span class="font-mono font-bold text-xs text-ink-500 dark:text-paper-500 mt-0.5 shrink-0">${String.fromCharCode(65 + optIdx)}.</span>
            <span class="flex-1">${optText}</span>
          `;
          btn.addEventListener('click', () => handleQuizAnswer(qIdx, optIdx, q));
          optionsGrid.appendChild(btn);
        });

        qBox.appendChild(optionsGrid);

        const fb = document.createElement('div');
        fb.id = `q-${qIdx}-feedback`;
        fb.className = "hidden mt-4 p-4 rounded-lg font-sans text-xs sm:text-sm leading-relaxed border";
        qBox.appendChild(fb);

        container.appendChild(qBox);
      });
    }

    function handleQuizAnswer(qIdx, selectedOptIdx, questionData) {
      if (answeredQuestions[qIdx] !== undefined) return;
      answeredQuestions[qIdx] = selectedOptIdx;

      const isCorrect = selectedOptIdx === questionData.correct;
      const feedback = document.getElementById(`q-${qIdx}-feedback`);

      if (window.StudyCompetency) {
        window.StudyCompetency.recordQuizAttempt(currentSheetIndex, qIdx, isCorrect);
      }

      questionData.options.forEach((_, optIdx) => {
        const btn = document.getElementById(`q-${qIdx}-opt-${optIdx}`);
        btn.disabled = true;
        if (optIdx === questionData.correct) {
          btn.classList.remove('bg-paper-100/50', 'dark:bg-paper-900/40', 'border-paper-300', 'dark:border-paper-800');
          btn.classList.add('bg-emerald-50', 'dark:bg-emerald-950/40', 'border-emerald-600', 'text-emerald-950', 'dark:text-emerald-200', 'font-medium');
        } else if (optIdx === selectedOptIdx && !isCorrect) {
          btn.classList.remove('bg-paper-100/50', 'dark:bg-paper-900/40', 'border-paper-300', 'dark:border-paper-800');
          btn.classList.add('bg-rose-50', 'dark:bg-rose-950/40', 'border-rose-500', 'text-rose-900', 'dark:text-rose-200');
        } else {
          btn.classList.add('opacity-40');
        }
      });

      feedback.classList.remove('hidden');
      const diagMsg = (questionData.diagnostics && questionData.diagnostics[selectedOptIdx])
        ? `<div class="mt-2.5 pt-2 border-t border-current/20 font-mono text-xs"><strong>Diagnostic Analysis:</strong> ${questionData.diagnostics[selectedOptIdx]}</div>`
        : '';

      if (isCorrect) {
        feedback.className = "mt-4 p-4 rounded-lg font-sans text-xs sm:text-sm leading-relaxed border border-emerald-500/50 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-200";
        feedback.innerHTML = `<strong>✓ Historicist Exegesis:</strong> ${questionData.explanation}${diagMsg}`;
        showToast("Correct! Understanding verified.");
      } else {
        feedback.className = "mt-4 p-4 rounded-lg font-sans text-xs sm:text-sm leading-relaxed border border-rose-500/50 bg-rose-50 dark:bg-rose-950/30 text-rose-900 dark:text-rose-200";
        feedback.innerHTML = `
          <div><strong>Key Doctrine:</strong> ${questionData.explanation}</div>
          ${diagMsg}
          <div class="mt-3">
            <button type="button" class="px-3 py-1 rounded bg-rose-700 text-white text-xs font-semibold hover:bg-rose-800 transition-colors" onclick="resetQuizQuestion(${qIdx})">Try Again</button>
          </div>
        `;
        showToast("Review the historicist explanation and try again.");
      }
      updateNextGate();
      if (sheetQuizComplete()) {
        sittingVisited.tasks = true;
        renderSittingPath();
      }
      maybeShowEndGuide();
    }

    function resetQuizQuestion(qIdx) {
      delete answeredQuestions[qIdx];
      const data = sheetsData[currentSheetIndex];
      const q = data.quizzes[qIdx];
      q.options.forEach((_, optIdx) => {
        const btn = document.getElementById(`q-${qIdx}-opt-${optIdx}`);
        if (btn) {
          btn.disabled = false;
          btn.className = "quiz-option w-full p-3.5 sm:p-4 rounded-lg border border-paper-300 dark:border-paper-800 hover:border-ink-900 dark:hover:border-paper-200 bg-paper-100/50 dark:bg-paper-900/40 text-left text-xs sm:text-sm text-ink-800 dark:text-paper-200 flex items-start space-x-3";
        }
      });
      const feedback = document.getElementById(`q-${qIdx}-feedback`);
      if (feedback) feedback.classList.add('hidden');
      updateNextGate();
    }

    function completeAndAdvance() {
      if (!canAdvancePath()) {
        showToast('Every checkpoint question must be answered correctly to continue.');
        const rev = document.getElementById('workbench-section') || document.getElementById('revision-section');
        if (rev) rev.scrollIntoView({ behavior: 'smooth' });
        return;
      }
      if (window.BAJourney && typeof window.BAJourney.markSheetComplete === 'function') {
        window.BAJourney.markSheetComplete(currentSheetIndex);
        completedSheets = new Set((window.BAJourney.load().completedSheets || []).map(Number));
      } else {
        completedSheets.add(currentSheetIndex);
        try {
          localStorage.setItem('daniel_historicist_mastery', JSON.stringify(Array.from(completedSheets)));
        } catch (e) {}
      }

      if (currentSheetIndex < sheetsData.length - 1) {
        loadSheet(currentSheetIndex + 1);
        showToast('Unit mastered! Advancing to ' + (window.BAJourney ? window.BAJourney.sheetLabel(currentSheetIndex) : ('sheet ' + (currentSheetIndex + 1))) + '.');
      } else {
        showToast("Congratulations! You have mastered the entire Historicist Scroll of Daniel!");
        syncCertificateCta();
        openCertificateIfReady();
      }
    }

    /* =========================================================================
       7. KEYBOARD SHORTCUTS & INITIALIZATION
       ========================================================================= */
    document.addEventListener('scroll', () => {
      if (sittingGuideMode !== 'end') return;
      const data = sheetsData[currentSheetIndex];
      const spotId = (data && data.guide && data.guide.end && data.guide.end.spotlight) || 'next-sheet-btn';
      const target = document.getElementById(spotId);
      if (target && !target.hidden) layoutEndSpotlight(target);
    }, { passive: true });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight' && (e.metaKey || e.ctrlKey)) {
        if (currentSheetIndex < sheetsData.length - 1) navigateSheet(1);
      } else if (e.key === 'ArrowLeft' && (e.metaKey || e.ctrlKey)) {
        if (currentSheetIndex > 0) navigateSheet(-1);
      } else if (e.key === 'Escape') {
        const guide = document.getElementById('sitting-guide');
        if (guide && !guide.hidden) {
          if (sittingGuideMode === 'intro') finishIntroGuide();
          else hideSittingGuide();
          return;
        }
        const drawer = document.getElementById('toc-drawer');
        if (!drawer.classList.contains('-translate-x-full')) toggleTocDrawer();
        const dock = document.getElementById('pomo-dock');
        if (!dock.classList.contains('pointer-events-none')) togglePomodoroDrawer();
        const modal = document.getElementById('artifact-modal');
        if (!modal.classList.contains('pointer-events-none')) closeArtifactModal();
        collapseSittingInsets();
      }
    });

    const LEGACY_ID_MAP = {
      assembled: 2, head: 2, chest: 5, thighs: 8, legs: 7, feet: 7, stone: 10,
      lion: 7, bear: 7, leopard: 7, beast: 7, horn: 7, years1260: 7,
      ram: 8, goat: 8, goat_broken: 8, goat_horn: 8,
      dura: 3, stump: 4, ox_king: 4, ancient: 7, son: 7,
      decree: 9, kings: 10, michael: 10, sealed: 10
    };

    function clampStartSheet(index) {
      if (new URLSearchParams(location.search).get("preview") === "full") return index;
      if (window.BAJourney && typeof window.BAJourney.clampToAccessible === 'function') {
        return window.BAJourney.clampToAccessible(index);
      }
      return canAccessSheet(index) ? index : 0;
    }

    function resolveStartSheet() {
      try {
        const params = new URLSearchParams(location.search);
        const raw = params.get('id') || params.get('section') || params.get('sheet');
        if (raw != null && raw !== '') {
          if (Object.prototype.hasOwnProperty.call(LEGACY_ID_MAP, raw)) {
            const wanted = LEGACY_ID_MAP[raw];
            const clamped = clampStartSheet(wanted);
            if (clamped !== wanted) denyLockedSitting(wanted);
            return clamped;
          }
          const asNum = parseInt(raw, 10);
          if (!Number.isNaN(asNum) && asNum >= 0 && asNum < sheetsData.length) {
            const clamped = clampStartSheet(asNum);
            if (clamped !== asNum) denyLockedSitting(asNum);
            return clamped;
          }
        }
        const journey = journeyState();
        if (typeof journey.sheet === 'number' && journey.sheet >= 0 && journey.sheet < sheetsData.length) {
          return clampStartSheet(journey.sheet);
        }
      } catch (e) {}
      return currentSheetIndex;
    }

    document.querySelectorAll('.artifact-thumb').forEach((btn) => {
      btn.addEventListener('click', () => {
        const img = document.getElementById('artifact-modal-img');
        if (img && btn.dataset.src) img.src = btn.dataset.src;
        document.querySelectorAll('.artifact-thumb').forEach((b) => b.classList.remove('ring-2', 'ring-amber-400'));
        btn.classList.add('ring-2', 'ring-amber-400');
      });
    });

    window.addEventListener('DOMContentLoaded', () => {
      const guidePrimary = document.getElementById('sitting-guide-primary');
      const guideSkip = document.getElementById('sitting-guide-skip');
      if (guidePrimary) {
        guidePrimary.addEventListener('click', () => {
          if (sittingGuideMode === 'end') activateGuideTarget();
          else finishIntroGuide();
        });
      }
      if (guideSkip) guideSkip.addEventListener('click', finishIntroGuide);
      const accessOpen = document.getElementById('access-open-btn');
      const accessPanel = document.getElementById('access-panel');
      const accessClose = document.getElementById('access-close');
      const accessEnable = document.getElementById('access-enable-preview');
      if (accessOpen && accessPanel) {
        accessOpen.addEventListener('click', () => { accessPanel.hidden = false; });
      }
      if (accessClose && accessPanel) {
        accessClose.addEventListener('click', () => { accessPanel.hidden = true; });
      }
      if (accessEnable && window.BAJourney && typeof window.BAJourney.enablePreview === 'function') {
        accessEnable.addEventListener('click', () => {
          window.BAJourney.enablePreview();
          if (accessPanel) accessPanel.hidden = true;
          showToast('Full preview enabled.');
          if (typeof loadSheet === 'function') loadSheet(currentSheetIndex);
        });
      }
      const certBtn = document.getElementById('btn-download-certificate');
      if (certBtn) certBtn.addEventListener('click', openCertificateIfReady);
      const openPlate = document.getElementById('btn-infographic-open');
      const openFull = document.getElementById('btn-infographic-fullscreen');
      const closePlate = document.getElementById('infographic-modal-close');
      const plateModal = document.getElementById('infographic-modal');
      if (openPlate) openPlate.addEventListener('click', openInfographic);
      if (openFull) openFull.addEventListener('click', openInfographic);
      if (closePlate) closePlate.addEventListener('click', closeInfographic);
      if (plateModal) {
        plateModal.addEventListener('click', (ev) => {
          if (ev.target === plateModal) closeInfographic();
        });
      }
      document.addEventListener('keydown', (ev) => {
        if (ev.key === 'Escape') closeInfographic();
      });
      syncCertificateCta();
      applyFontSize();
      applyTheme(currentThemeIdx, true);
      resizeWeatherCanvas();
      updateAutoWeather();
      setWeatherPreset('auto', true);
      updateTimerDisplay();
      window.addEventListener('resize', () => {
        resizeWeatherCanvas();
        if (sittingGuideMode === 'end') {
          const data = sheetsData[currentSheetIndex];
          const spotId = (data && data.guide && data.guide.end && data.guide.end.spotlight) || 'next-sheet-btn';
          const target = document.getElementById(spotId);
          if (target && !target.hidden) layoutEndSpotlight(target);
        }
      });
      document.querySelectorAll('.instrument-tabs button').forEach((btn) => {
        btn.addEventListener('click', () => showInstrument(btn.dataset.instrument));
      });
      if (window.BAScripture) window.BAScripture.mount(document.getElementById('scripture-root'));
      window.addEventListener('ba-scripture-station', (ev) => {
        const station = ev.detail && ev.detail.station;
        if (!station) return;
        if (currentSheetIndex === 2) {
          const st = S2_STATIONS.find((s) => s.id === station);
          if (st) playStation('s2', st).then(() => refreshRailLabel('s2', S2_STATIONS));
        } else if (currentSheetIndex === 7) {
          const st = S7_STATIONS.find((s) => s.id === station);
          if (st) playStation('s7', st).then(() => refreshRailLabel('s7', S7_STATIONS));
        }
      });
      selectEmpire('babylon');
      buildHorizonCards();
      document.querySelectorAll('#sitting-path-steps [data-path]').forEach((btn) => {
        btn.addEventListener('click', () => enterSittingPhase(btn.dataset.path));
      });
      const btnFocusMap = document.getElementById('btn-focus-live-map');
      if (btnFocusMap) {
        btnFocusMap.addEventListener('click', () => {
          const pack = lessonMapPack(currentSheetIndex);
          const y = (pack && pack.year) || 'y605';
          window.location.href = `map.html?year=${encodeURIComponent(y)}&from=lesson&sheet=${currentSheetIndex}`;
        });
      }
      loadSheet(resolveStartSheet(), { restorePlace: true });
      let scrollSaveTimer = null;
      window.addEventListener('scroll', () => {
        if (scrollHold) return;
        if (scrollSaveTimer) clearTimeout(scrollSaveTimer);
        scrollSaveTimer = setTimeout(() => {
          writeScrollPlace(currentSheetIndex, window.scrollY || 0);
        }, 120);
      }, { passive: true });
      window.addEventListener('pagehide', () => {
        if (scrollHold) return;
        writeScrollPlace(currentSheetIndex, window.scrollY || 0);
      });
      const notes = document.getElementById('sheet-notes');
      if (notes) {
        notes.addEventListener('input', () => {
          try { localStorage.setItem('baNote-' + currentSheetIndex, notes.value); } catch (e) {}
        });
      }
      const btnBm = document.getElementById('btn-bookmark-sheet');
      if (btnBm) btnBm.addEventListener('click', () => {
        try {
          const list = JSON.parse(localStorage.getItem('baStudyBookmarks') || '[]');
          if (!list.includes(currentSheetIndex)) list.push(currentSheetIndex);
          localStorage.setItem('baStudyBookmarks', JSON.stringify(list));
          showToast('Sheet bookmarked on this device');
        } catch (e) {}
      });
      const btnNotes = document.getElementById('btn-toggle-notes');
      if (btnNotes && notes) btnNotes.addEventListener('click', () => { notes.hidden = !notes.hidden; });
      const gloss = document.getElementById('glossary-panel');
      const btnGloss = document.getElementById('btn-toggle-glossary');
      if (btnGloss && gloss) {
        btnGloss.addEventListener('click', () => {
          gloss.hidden = !gloss.hidden;
          btnGloss.setAttribute('aria-expanded', gloss.hidden ? 'false' : 'true');
          if (!gloss.hidden && window.GlossaryIndex) {
            window.GlossaryIndex.renderIndex(gloss, { kind: 'all', q: '' });
          }
        });
      }
      const btnStudy = document.getElementById('btn-jump-study-path');
      if (btnStudy) {
        btnStudy.addEventListener('click', () => {
          const path = document.getElementById('sheet-study-path');
          if (path && !path.hidden) path.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
      }
      const btnVerify = document.getElementById('btn-jump-verify');
      if (btnVerify) {
        btnVerify.addEventListener('click', () => {
          const box = document.getElementById('sheet-verify');
          if (box && !box.hidden) box.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
      }
      if (new URLSearchParams(window.location.search).get('project') === '1') {
        document.body.classList.add('projection-mode');
      }
      const btnProgHeader = document.getElementById('btn-progress-header');
      if (btnProgHeader) {
        btnProgHeader.addEventListener('click', () => {
          if (window.StudyCompetency && typeof window.StudyCompetency.renderCompetencyRecordModal === 'function') {
            window.StudyCompetency.renderCompetencyRecordModal();
          }
        });
      }
      const btnCodexProg = document.getElementById('btn-codex-progress');
      if (btnCodexProg) {
        btnCodexProg.addEventListener('click', () => {
          if (window.StudyCompetency && typeof window.StudyCompetency.renderCompetencyRecordModal === 'function') {
            window.StudyCompetency.renderCompetencyRecordModal();
          }
        });
      }
      const btnPrintHeader = document.getElementById('btn-print-header');
      if (btnPrintHeader) {
        btnPrintHeader.addEventListener('click', () => {
          window.print();
        });
      }
      const btnToggleTeach = document.getElementById('btn-toggle-teach');
      if (btnToggleTeach) {
        btnToggleTeach.addEventListener('click', () => {
          const current = localStorage.getItem('daniel_teach_mode') === '1';
          localStorage.setItem('daniel_teach_mode', current ? '0' : '1');
          showToast(current ? 'Facilitator notes hidden' : 'Facilitator notes enabled');
          const curData = sheetsData[currentSheetIndex];
          if (curData) renderFacilitatorStrip(curData.facilitator);
        });
      }
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) stopWeatherAnimation();
        else if (weatherPreset !== 'off') startWeatherAnimation();
      });
      if (window.StudyCompetency) {
        if (window.ScrollAuth && typeof window.ScrollAuth.ready === "function") {
          window.ScrollAuth.ready().then(function () { window.StudyCompetency.initPlacementModal(); });
        } else {
          window.StudyCompetency.initPlacementModal();
        }
      }
      function refreshAdminAccess() {
        renderToc();
        syncHorizonLocks();
        updateNextGate();
        const wanted = resolveStartSheet();
        if (wanted !== currentSheetIndex && canAccessSheet(wanted)) loadSheet(wanted);
      }
      if (window.ScrollAuth && typeof window.ScrollAuth.ready === "function") {
        window.ScrollAuth.ready().then(refreshAdminAccess);
      }
      if (window.ScrollAuth && typeof window.ScrollAuth.onChange === "function") {
        window.ScrollAuth.onChange(refreshAdminAccess);
      }
      window.addEventListener('ba-progress-synced', () => {
        if (window.BAJourney && typeof window.BAJourney.load === 'function') {
          completedSheets = new Set((window.BAJourney.load().completedSheets || []).map(Number));
        }
        renderToc();
        syncHorizonLocks();
        updateNextGate();
        syncCertificateCta();
      });
    });

    Object.assign(window, {
      applyTheme,
      cycleTheme,
      adjustFontSize,
      toggleTocDrawer,
      togglePomodoroDrawer,
      setWeatherPreset,
      startPomodoro,
      pausePomodoro,
      resetPomodoro,
      setPomodoroDuration,
      openArtifactModal,
      closeArtifactModal,
      openLessonScripture,
      navigateSheet,
      completeAndAdvance,
      shareSitting,
      resetQuizQuestion,
      openInfographic,
      closeInfographic
    });
