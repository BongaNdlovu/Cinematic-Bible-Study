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
      { img: "assets/study/epochs/exile-court.jpg", title: "The exilic crucible", body: "Ashpenaz's school was assimilation: language, literature, and new names. Daniel drew the line at the king's table — idol table-fellowship and Levitical defilement. Daniel 1:8 names no effect on the mind.", source: "Daniel 1:8; Genesis 1:29; Leviticus 11. The ten-day test of zeroim.", exegesis: "Civic competence is not covenant surrender. Consecration at the table preceded revelation — and foreshadows Christ's faithful obedience in the wilderness." },
      { img: "assets/study/statue-nebuchadnezzar.jpg", title: "The metallic colossus", body: "Babylon's magicians confessed bankruptcy; Daniel prayed, and God revealed the master-framework of world history — from the head of gold to the stone that fills the earth.", source: "Daniel 2:28, 38–44. Babylonian Chronicle BM 21946.", exegesis: "One unbroken chain: Babylon → Medo-Persia → Greece → Rome → divided Europe → Christ's kingdom. The stone strikes the feet in the days of these kings. The blow comes from God, and no human hand cuts the stone." },
      { img: "assets/plates/dura-plain.jpg", title: "The plain of Dura", body: "An all-gold image 60×6 cubits high was Nebuchadnezzar's imperial veto against Daniel 2 — bow or burn. Shadrach, Meshach, and Abednego answered: but if not, we will not bow.", source: "Daniel 3:1, 17–18, 25. Exodus 20:4–5.", exegesis: "Civic duty has a ceiling. Dura is the type of forced worship; Revelation 13 the later pattern. The Fourth in the fire is presence (Daniel 3:25); the resurrection is the deliverance all the faithful finally have (1 Corinthians 15:12–26)." },
      { img: "assets/study/babylon-sunset.jpg", title: "The emperor in the dust", body: "Nebuchadnezzar publishes his own humiliation: the threefold boast on the palace roof, the seven times that pass over him, and his restored understanding when he lifts his eyes to heaven.", source: "Daniel 4:17, 27, 30, 32–37.", exegesis: "The Most High ruleth in the kingdom of men — three times. The narrative ends with the king restored and praising Heaven. Christ is the humble King opposite Nebuchadnezzar's pride." },
      { img: "assets/study/epochs/babylon-fall.jpg", title: "The handwriting on the plaster", body: "Belshazzar toasts idols with Yahweh's temple vessels while Medo-Persia diverts the Euphrates. Heaven writes an audit: numbered, weighed, divided.", source: "Daniel 5:22, 25–31; Isaiah 45:1–3. Nabonidus Chronicle BM 35382.", exegesis: "The gold head becomes silver in a single night. Belshazzar sinned against known light. On the scale we are TEKEL unless clothed in Christ's righteousness." },
      { img: "assets/study/daniel-lions-den.jpg", title: "The pit of hunger", body: "Medo-Persian legal immutability is weaponized against Daniel's open window. The satraps find no fraud. The sealed pit and dawn deliverance stand beside the sealed tomb (Matthew 27:62–66; 28:1–6).", source: "Daniel 6:4–5, 8, 10, 22, 26; Esther 8:8; Matthew 27:62–66.", exegesis: "Civil law has a divine ceiling at the First Commandment. Obedience to God is non-violent and faithful; the Living Deliverer breaks the seal of death." },
      { img: "assets/study/epochs/papal-rome.jpg", title: "Beasts from a wind-stirred sea", body: "The same four kingdoms return as predators. Among ten horns a papal church-state little horn (538–1798) uproots three, speaks against the Most High, and wears out the saints 1,260 years until the heavenly court convenes.", source: "Daniel 7:4–7, 8, 9–14, 24–27; Revelation 12:6, 14; 13:5.", exegesis: "The pre-advent judgment scene of 7:9–14 convenes in heaven before the stone strikes. Christ approaches the Ancient of Days as High Priest and King." },
      { img: "assets/study/epochs/sanctuary.jpg", title: "The ram, the goat, and 2,300 days", body: "Gabriel names Medo-Persia and Greece. The little horn attacks Christ's continual heavenly mediation (tamid). After 2,300 prophetic years, the heavenly sanctuary is vindicated (nitsdaq) on the antitypical Day of Atonement.", source: "Daniel 8:14, 17, 19–22; Leviticus 16:30; Hebrews 8:1–2; 9:23–26.", exegesis: "The vision belongs to the time of the end. Antiochus is far too small. In 1844, Christ entered the Most Holy Place of the heavenly sanctuary for the pre-advent judgment." },
      { img: "assets/study/horizon/y457.jpg", title: "The 70 weeks and the cross", body: "Gabriel returns to explain the unexplained 2,300 days. Seventy weeks (490 years) are severed (chathak) for Daniel's people, anchored in Artaxerxes' 457 B.C. decree (Ezra 7). In A.D. 27 Messiah is anointed; in A.D. 31 He is cut off at the midst of the week — Daniel's schedule, not a separately attested astronomical Passover date.", source: "Daniel 9:24–27; Ezra 7:11–26; Luke 3:1, 21–23; Matthew 27:51.", exegesis: "Calvary anchors the prophetic line on this chart. Because the seventy weeks land on schedule in the text’s arithmetic, the remaining 1,810 years carry the same line to the heavenly sanctuary in 1844." },
      { img: "assets/study/epochs/resurrection-dawn.jpg", title: "Michael stands in royal majesty", body: "Daniel 10–12 forms one undivided vision by the Tigris. When Michael stands up, human probation closes, a time of trouble follows, those written in the book are delivered, and those sleeping in the dust awake in bodily resurrection.", source: "Daniel 10:5–6, 13; 11:22, 31; 12:1–3, 13; Hebrews 7:25; John 5:28–29.", exegesis: "Michael's standing up ('amad) follows Daniel 11's kingly grammar: Christ stands for His people. Hebrews 7:25 is His intercession in this age, until that standing. Deliverance belongs to all found in the Book; God promises Daniel rest and resurrection in his lot." }
    ];

    const SHEET_INSIGHTS = [
      { genre: "Prologue — three of the main hermeneutical roads, idealism left aside; year-day scale tested in Daniel 9; Christ as redemptive center.", section: "Daniel 1:2; Numbers 14:34; Ezekiel 4:6; Daniel 2:38–44; Daniel 9:24–27; Luke 24:27.", theme: "Unbroken historicist chain; Messiah cut off; Stone-King; why historicism matters today." },
      { genre: "Exilic crucible — sovereign judgment, identity under renaming, consecration at the table, Christ as faithful Son.", section: "Daniel 1 — three sieges, Ashpenaz's school, the royal table, 605 B.C.", theme: "Civic cooperation vs. covenant surrender; zeroim and the ten-day test; redemptive typology of Jesus in the wilderness." },
      { genre: "Master-framework vision — historicist chain, metallurgic gradient, divided feet, Stone-King.", section: "Daniel 2 — impasse of human wisdom, four empires, iron and clay, stone without hands.", theme: "Thou art this head of gold; they shall not cleave; Christ pulverizes and fills the earth." },
      { genre: "Imperial veto and furnace crisis — civic duty vs. worship, Dura/Revelation 13 pattern, Christ in the fire.", section: "Daniel 3 — all-gold image, but if not faith, fourth like the Son of God.", theme: "State-enforced worship; non-transactional loyalty; presence in the fire; resurrection hope." },
      { genre: "Imperial encyclical — cosmic tree, Watcher, threefold boast, the king's humiliation and restoration, Christ's kenosis.", section: "Daniel 4 — seven times pass, the king lifts his eyes, and the King of heaven is praised.", theme: "Heaven rules; Nebuchadnezzar is humbled; Christ is the humble King (Philippians 2)." },
      { genre: "Banquet-night audit — co-regency history, sacrilege against light, MENE/TEKEL/PERES, Cyrus as type, imputed righteousness.", section: "Daniel 5 — October 539 B.C.; Isaiah 45:1–3; John 5:22; 2 Corinthians 5:21.", theme: "Known light ignored; gold replaced by silver; found wanting unless covered by Christ." },
      { genre: "Constitutional conflict and pit deliverance — irrevocable Persian law, forensic audit, open window, and the sealed tomb.", section: "Daniel 6 — Babylon under Medo-Persian rule, c. 538 B.C.; Acts 5:29; Matthew 27–28.", theme: "The unalterable statute; blameless civic integrity; prayer facing Jerusalem; Christ conquers the roaring lion." },
      { genre: "Apocalyptic night vision — four predatory beasts, diverse eleventh horn, 1,260-year span (538–1798), and pre-advent heavenly court.", section: "Daniel 7 — Babylon, c. 553 B.C.; Revelation 12–13; Matthew 26:64.", theme: "Unbroken succession; church-state counterfeit; Arian horns uprooted; Son of Man crowned before Ancient of Days." },
      { genre: "Sanctuary apocalypse — named ram and goat, little horn in two phases, attack on the tamid, refutation of Antiochus, and nitsdaq in 1844.", section: "Daniel 8 — Susa by the Ulai, c. 551 B.C.; Leviticus 16; Hebrews 8–9.", theme: "Sacrificial animals; continual mediation obscured; forensic vindication; Christ in the heavenly Most Holy Place." },
      { genre: "Messianic prophecy & mathematical anchor — Daniel's penitential prayer, chathak severed from 2,300 days, Persian commissions compared, midst of 70th week, and refutation of futurist gap.", section: "Daniel 9 — Babylon, c. 538 B.C.; Ezra 7; Matthew 27:51; Mark 1:15.", theme: "Autumn 457 B.C. start; A.D. 27 baptism; A.D. 31 cross (midst of week); working close A.D. 34; 1,810-year balance to 1844." },
      { genre: "Tigris theophany, geopolitical march, and resurrection hope — unseen warfare, Daniel 11 succession, close of probation, time of trouble, and waking from the dust.", section: "Daniel 10:1 – 12:13 — Tigris River, c. 536 B.C.; Hebrews 7:25; John 5:28–29; Revelation 22:11.", theme: "The Man in linen; Michael the Prince; Persian and Greek march; 'amad royal stance; literal bodily resurrection; rest in thy lot." }
    ];

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

    const SITTING_PATH_HINTS = {
      study: 'Read the lesson. Three checkpoints sit in the pages, before the final questions.',
      tasks: 'Answer the final questions, then continue to the next lesson.',
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
      if (window.Insights) window.Insights.track('path_step', currentSheetIndex, { step: phase });
      if (phase === 'study') {
        const article = document.getElementById('sheet-article');
        if (article) article.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } else if (phase === 'tasks') {
        sittingVisited.tasks = true;
        const flow = window.StudyTaskFlow;
        if (!(flow && typeof flow.open === 'function' && flow.open())) {
          const rev = document.getElementById('workbench-section') || document.getElementById('revision-section');
          if (rev) rev.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
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
      try {
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

    function selectEmpire(id) {
      const emp = MAP_EMPIRES[id];
      if (!emp) return;
      const yearId = emp.yearId || STUDY_EPOCH_TO_YEAR[emp.epoch] || 'y605';
      fillMapFacts(emp.name, emp.beast, emp.span, emp.insight, emp.image, yearId);
    }
