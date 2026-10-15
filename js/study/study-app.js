    // Sequential sittings: access is owned by BAJourney.canAccessSheet.

    // Guests get the free sittings only; their lock copy invites them to sign in.
    function memberLockText(fallback) {
      const guest = !(window.ScrollAuth && typeof window.ScrollAuth.getUser === 'function' && window.ScrollAuth.getUser());
      return guest ? 'Members only — sign in to continue' : fallback;
    }

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
      syncEpochLine(currentEpochIndex);
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
        (epochAccessible(i) ? '' : ' disabled aria-disabled="true" title="' + memberLockText('Locked — finish the open sitting first') + '"') + '>' +
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
      buildEpochLine();
    }

    function buildEpochLine() {
      const line = document.getElementById('epoch-line');
      if (!line || !timelineEpochs.length) return;
      const n = timelineEpochs.length;
      const points = timelineEpochs.map((ep, i) => {
        const at = n <= 1 ? 0 : i / (n - 1);
        const open = epochAccessible(i);
        const year = String(ep.year).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        return '<button type="button" class="epoch-dot' + (i === currentEpochIndex ? ' is-active' : '') + (open ? '' : ' is-locked') +
          '" data-epoch="' + i + '" style="--i:' + at + '" aria-pressed="' + (i === currentEpochIndex ? 'true' : 'false') + '"' +
          (open ? '' : ' disabled aria-disabled="true" title="' + memberLockText('Locked — finish the open sitting first') + '"') + '>' +
          '<span class="epoch-dot-mark" aria-hidden="true"></span>' +
          '<span class="epoch-dot-year">' + year + '</span></button>';
      }).join('');
      line.innerHTML =
        '<div class="epoch-line-track">' +
          '<div class="epoch-line-rail" aria-hidden="true"><span class="epoch-line-glow"></span></div>' +
          points +
        '</div>';
      line.querySelectorAll('.epoch-dot').forEach((dot) => {
        dot.addEventListener('click', () => {
          const idx = Number(dot.dataset.epoch);
          if (!epochAccessible(idx)) return;
          setEpochInfo(idx);
        });
      });
      syncEpochLine(currentEpochIndex);
    }

    function syncEpochLine(epochIdx) {
      const line = document.getElementById('epoch-line');
      if (!line || !timelineEpochs.length) return;
      const n = timelineEpochs.length;
      const at = n <= 1 ? 0 : epochIdx / (n - 1);
      line.style.setProperty('--epoch-at', String(at));
      line.querySelectorAll('.epoch-dot').forEach((dot) => {
        const i = Number(dot.dataset.epoch);
        const on = i === epochIdx;
        const open = epochAccessible(i);
        dot.classList.toggle('is-active', on);
        dot.classList.toggle('is-locked', !open);
        dot.disabled = !open;
        dot.setAttribute('aria-pressed', on ? 'true' : 'false');
      });
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
      if (!modal || !img) return;
      if (!img.getAttribute('src') && img.dataset.src) {
        img.src = img.dataset.src;
      }
      if (!img.getAttribute('src')) return;
      modal.hidden = false;
      document.body.classList.add('infographic-open');
      const closeBtn = document.getElementById('infographic-modal-close');
      if (closeBtn) closeBtn.focus();
      if (window.Insights) window.Insights.track('feature_use', currentSheetIndex, { feature: 'infographic' });
    }

    // ---- Spoken read-along highlighter --------------------------------------
    // Follows audio.cues (generated by tools/audio-read/align.py): each cue
    // lists [blockIndex, charStart, charEnd] ranges over the whitespace-collapsed
    // text of the sheet title, subtitle, and article blocks, stroked with a
    // faint highlighter while they are spoken.
    const AudioReader = {
      cues: null,
      blocks: [],
      idx: -1,
      marks: [],
      gen: 0,

      load(src, sheetIndex) {
        const gen = this.gen;
        fetch(src)
          .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
          .then((data) => {
            if (gen !== this.gen || currentSheetIndex !== sheetIndex || !Array.isArray(data.cues)) return;
            this.cues = data.cues;
            this.idx = -1;
            this.collectBlocks();
          })
          .catch(() => {}); // cues are optional polish; never break playback
      },

      collectBlocks() {
        const els = [];
        const title = document.getElementById('sheet-title');
        const subtitle = document.getElementById('sheet-subtitle');
        const article = document.getElementById('sheet-article');
        if (title) els.push(title);
        if (subtitle) els.push(subtitle);
        if (article) {
          article.querySelectorAll('p, h3, h4, blockquote, li').forEach((el) => {
            if (el.closest('nav.lesson-toc')) return;
            els.push(el);
          });
        }
        this.blocks = els;
      },

      teardown() {
        this.gen++;
        this.clearMarks();
        this.cues = null;
        this.blocks = [];
        this.idx = -1;
      },

      clearMarks() {
        this.marks.forEach((mark) => {
          const parent = mark.parentNode;
          if (!parent) return;
          while (mark.firstChild) parent.insertBefore(mark.firstChild, mark);
          parent.removeChild(mark);
          parent.normalize();
        });
        this.marks = [];
      },

      // Mirrors cook() in tools/audio-read/align.py (NFKD fold + whitespace
      // collapse) so cue char offsets line up with the rendered DOM text.
      foldChar(ch) {
        return ch.normalize('NFKD').replace(/[\u0300-\u036f]/g, '');
      },

      wrapSpan(el, s, e) {
        const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, {
          acceptNode: (node) => (
            node.nodeValue && node.parentElement && !/^(SCRIPT|STYLE)$/.test(node.parentElement.tagName)
              ? NodeFilter.FILTER_ACCEPT
              : NodeFilter.FILTER_REJECT
          )
        });
        let cooked = '';
        let lastSpace = false;
        const nodes = [];
        while (walker.nextNode()) {
          const textNode = walker.currentNode;
          const raw = textNode.nodeValue;
          const start = cooked.length;
          const offsets = [];
          for (let i = 0; i < raw.length; i++) {
            const ch = raw[i];
            if (/\s/.test(ch)) {
              if (!lastSpace && cooked.length) { cooked += ' '; offsets.push(i); }
              lastSpace = true;
            } else {
              const folded = this.foldChar(ch);
              for (const f of folded) { cooked += f; offsets.push(i); }
              lastSpace = false;
            }
          }
          nodes.push({ node: textNode, start, end: cooked.length, offsets, rawLen: raw.length });
        }
        nodes.forEach((entry) => {
          if (entry.end <= s || entry.start >= e) return;
          const is = Math.max(s, entry.start);
          const ie = Math.min(e, entry.end);
          const rawStart = is > entry.start ? entry.offsets[is - entry.start] : 0;
          const rawEnd = ie < entry.end ? entry.offsets[ie - entry.start] : entry.rawLen;
          let target = entry.node;
          if (rawStart > 0) target = target.splitText(rawStart);
          if (rawEnd < target.nodeValue.length) target.splitText(rawEnd);
          const mark = document.createElement('mark');
          mark.className = 'audio-read';
          target.parentNode.insertBefore(mark, target);
          mark.appendChild(target);
          this.marks.push(mark);
        });
      },

      show(cue) {
        this.clearMarks();
        if (!this.blocks.length) return;
        let firstEl = null;
        (cue.h || []).forEach(([bi, s, e]) => {
          const el = this.blocks[bi];
          if (!el) return;
          if (!firstEl) firstEl = el;
          this.wrapSpan(el, s, e);
        });
        this.follow(firstEl);
      },

      // Nudge the spoken text into view only when it has left the viewport
      // entirely, so an unhurried reader is never yanked around.
      follow(el) {
        const player = document.getElementById('lesson-audio-player');
        if (!el || (player && player.paused)) return;
        const rect = el.getBoundingClientRect();
        const vh = window.innerHeight || document.documentElement.clientHeight;
        if (rect.bottom < 72 || rect.top > vh - 96) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      },

      findCue(t) {
        let lo = 0;
        let hi = this.cues.length - 1;
        let ans = -1;
        while (lo <= hi) {
          const mid = (lo + hi) >> 1;
          if (this.cues[mid].s <= t) { ans = mid; lo = mid + 1; } else { hi = mid - 1; }
        }
        return ans;
      },

      sync(t) {
        if (!this.cues || !this.blocks.length) return;
        const prev = this.idx;
        let next;
        if (
          prev >= 0 && prev < this.cues.length
          && t >= this.cues[prev].s
          && (prev + 1 >= this.cues.length || this.cues[prev + 1].s > t)
        ) {
          next = prev; // still on this cue, including its pause tail
        } else {
          next = this.findCue(t);
        }
        if (next === prev) return;
        this.idx = next;
        if (next < 0) this.clearMarks();
        else this.show(this.cues[next]);
      }
    };

    function renderLessonMedia(data) {
      const box = document.getElementById('lesson-media');
      const audioBox = document.getElementById('lesson-audio');
      const figure = document.getElementById('sitting-roadmap');
      const player = document.getElementById('lesson-audio-player');
      if (!box) return;
      stopLessonAudio();
      closeInfographic();
      AudioReader.teardown();

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
          // Spoken read-along highlighter is disabled: the spoken-text marks and
          // their auto-scroll are off. AudioReader.load() is deliberately not
          // called, so AudioReader never receives cues and sync()/show() no-op.
          // The orb, player row, and audio element are unaffected.
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
            modalImg.dataset.src = plate.download || plate.src;
            modalImg.alt = alt;
            modalImg.width = 1672;
            modalImg.height = 941;
            modalImg.decoding = 'async';
            modalImg.removeAttribute('src');
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
          const modalImg = document.getElementById('infographic-modal-img');
          if (modalImg) {
            modalImg.removeAttribute('src');
            delete modalImg.dataset.src;
          }
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
    let nextStrikeAt = 0;

    const weatherMeta = {
      quiet: { name: "Still • Quiet Dusk", icon: "◌", level: "Quiet" },
      building: { name: "Building • Rising Wind", icon: "☁", level: "Building" },
      storm: { name: "Storm • Rain & Thunder", icon: "⛈", level: "Storm" },
      sunshine: { name: "Sunshine • Warm Light", icon: "☀", level: "Sunshine" },
      off: { name: "Off", icon: "⏸", level: "Off" }
    };

    let activeBolt = null;
    let strikeX = 0;
    let strikePulses = [];
    let splashes = [];
    let motes = [];
    let fogBanks = [];
    let gust = 0;
    let lastWeatherFrame = 0;

    function lerp(a, b, t) {
      return a + (b - a) * Math.max(0, Math.min(1, t));
    }

    function initWeatherParticles() {
      const w = window.innerWidth, h = window.innerHeight;
      // z = depth (0 far, 1 near); most drops are far away, a few streak close to the glass.
      particles = Array.from({ length: 640 }, () => ({
        x: Math.random() * (w + 300),
        y: Math.random() * h,
        z: Math.pow(Math.random(), 1.7)
      }));
      motes = Array.from({ length: 46 }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        r: 0.6 + Math.random() * 1.4,
        vx: -4 + Math.random() * 8,
        vy: -3 + Math.random() * 4,
        phase: Math.random() * Math.PI * 2
      }));
      fogBanks = Array.from({ length: 9 }, (_, i) => ({
        x: Math.random() * w,
        y: h * (0.4 + Math.random() * 0.6),
        rx: w * (0.28 + Math.random() * 0.3),
        ry: h * (0.1 + Math.random() * 0.12),
        speed: 6 + Math.random() * 12,
        a: 0.6 + Math.random() * 0.4,
        phase: i * 1.7
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

    function boltPath(x0, y0, x1, y1, spread, depth, out) {
      if (depth === 0) { out.push({ x: x1, y: y1 }); return; }
      const mx = (x0 + x1) / 2 + (Math.random() - 0.5) * spread;
      const my = (y0 + y1) / 2 + (Math.random() - 0.5) * spread * 0.25;
      boltPath(x0, y0, mx, my, spread * 0.55, depth - 1, out);
      boltPath(mx, my, x1, y1, spread * 0.55, depth - 1, out);
    }

    function makeBolt(w, h, x0) {
      const x1 = x0 + (Math.random() - 0.5) * w * 0.22;
      const y1 = h * (0.55 + Math.random() * 0.35);
      const main = [{ x: x0, y: -10 }];
      boltPath(x0, -10, x1, y1, w * 0.1, 7, main);
      const branches = [];
      const n = 2 + Math.floor(Math.random() * 3);
      for (let i = 0; i < n; i++) {
        const s = main[Math.floor(main.length * (0.15 + Math.random() * 0.55))];
        const pts = [{ x: s.x, y: s.y }];
        boltPath(s.x, s.y, s.x + (Math.random() - 0.5) * w * 0.22, s.y + h * (0.08 + Math.random() * 0.18), w * 0.04, 5, pts);
        branches.push(pts);
      }
      return { main, branches };
    }

    function weatherPalette() {
      const light = document.body.classList.contains('paper-mode') || document.body.classList.contains('white-mode');
      return light
        ? { rain: '62,78,98', fog: '196,200,204', cloud: '44,50,60', flash: '255,255,255', bolt: '255,255,255', glow: '150,180,235', mote: '150,110,40', light: true }
        : { rain: '188,204,222', fog: '150,158,170', cloud: '6,8,12', flash: '215,228,255', bolt: '240,246,255', glow: '160,195,255', mote: '240,228,201', light: false };
    }

    function strokePath(ctx, pts) {
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
      ctx.stroke();
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
      const t = performance.now();
      const dt = lastWeatherFrame ? Math.min(0.05, (t - lastWeatherFrame) / 1000) : 0.016;
      lastWeatherFrame = t;
      const pal = weatherPalette();
      gust = lerp(gust, (building * 0.45 + storm * 1) * (0.75 + Math.sin(t / 2300) * 0.25), 0.02);

      document.body.dataset.weather = currentWeatherType;

      // Overcast: heavier toward the top of the sky, clearing as the sun comes out.
      const overcast = (0.05 + building * 0.1 + storm * 0.22) * (1 - sun * 0.8) * (pal.light ? 0.7 : 1);
      const sky = ctx.createLinearGradient(0, 0, 0, h);
      sky.addColorStop(0, `rgba(${pal.cloud},${overcast * 1.6})`);
      sky.addColorStop(0.5, `rgba(${pal.cloud},${overcast * 0.7})`);
      sky.addColorStop(1, `rgba(${pal.cloud},${overcast * 0.4})`);
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, w, h);

      const cloudA = (0.03 + building * 0.1 + storm * 0.2) * (1 - sun * 0.7);
      for (let i = 0; i < 10; i++) {
        const x = ((i * w / 6 + t * (0.006 + i * 0.0009) * (0.5 + gust)) % (w + 700)) - 350;
        const y = 20 + (i % 5) * 42;
        const r = 220 + (i % 4) * 90;
        const g = ctx.createRadialGradient(x, y, 0, x, y, r);
        g.addColorStop(0, `rgba(${pal.cloud},${cloudA})`);
        g.addColorStop(1, `rgba(${pal.cloud},0)`);
        ctx.fillStyle = g;
        ctx.save(); ctx.translate(x, y); ctx.scale(1.8, 0.6); ctx.translate(-x, -y);
        ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      }

      // Lightning: a main strike and one dimmer return stroke, lit from the strike point.
      // Never more than two flashes a second (photosensitivity guideline).
      const now = t / 1000;
      if (storm > 0.55) {
        if (!nextStrikeAt) nextStrikeAt = now + 1.5 + Math.random() * 2.5;
        if (now >= nextStrikeAt) {
          strikeX = w * (0.1 + Math.random() * 0.8);
          strikePulses = [now, now + 0.5 + Math.random() * 0.25];
          activeBolt = Math.random() < 0.55 ? makeBolt(w, h, strikeX) : null;
          nextStrikeAt = now + 6 + Math.random() * 9;
        }
      } else {
        nextStrikeAt = 0;
      }
      lightning = 0;
      strikePulses.forEach((p0, i) => {
        const age = now - p0;
        if (age >= 0 && age < 0.8) lightning = Math.max(lightning, (i === 0 ? 1 : 0.55) * Math.exp(-age * 9));
      });
      if (lightning > 0.01) {
        const fg = ctx.createRadialGradient(strikeX, 0, 0, strikeX, 0, Math.max(w, h) * 0.95);
        fg.addColorStop(0, `rgba(${pal.flash},${0.3 * lightning})`);
        fg.addColorStop(0.45, `rgba(${pal.flash},${0.1 * lightning})`);
        fg.addColorStop(1, `rgba(${pal.flash},0)`);
        ctx.fillStyle = fg;
        ctx.fillRect(0, 0, w, h);
      }
      if (activeBolt && lightning > 0.03) {
        ctx.save();
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.shadowColor = `rgba(${pal.glow},0.9)`;
        ctx.shadowBlur = 24;
        ctx.strokeStyle = `rgba(${pal.glow},${0.35 * lightning})`;
        ctx.lineWidth = 6;
        strokePath(ctx, activeBolt.main);
        ctx.shadowBlur = 10;
        ctx.strokeStyle = `rgba(${pal.bolt},${lightning})`;
        ctx.lineWidth = 1.8;
        strokePath(ctx, activeBolt.main);
        ctx.lineWidth = 0.9;
        ctx.strokeStyle = `rgba(${pal.bolt},${0.6 * lightning})`;
        activeBolt.branches.forEach((b) => strokePath(ctx, b));
        ctx.restore();
      } else if (lightning <= 0.03 && strikePulses.length && now > strikePulses[strikePulses.length - 1] + 0.8) {
        activeBolt = null;
        strikePulses = [];
      }

      // Rain: each drop's streak follows its own velocity (wind + fall), so near drops
      // are long, bright and fast while far drops are short and faint.
      const rainAmt = Math.min(1, storm + building * 0.25);
      if (rainAmt > 0.03) {
        const windX = -50 - 240 * gust;
        const count = Math.floor(particles.length * rainAmt);
        ctx.lineCap = 'round';
        for (let i = 0; i < count; i++) {
          const p = particles[i];
          const vy = 900 + 1500 * p.z;
          const vx = windX * (0.6 + 0.4 * p.z);
          p.x += vx * dt;
          p.y += vy * dt;
          if (p.y > h + 40) {
            if (p.z > 0.6 && rainAmt > 0.5 && splashes.length < 70) {
              splashes.push({ x: p.x, y: h - 2 - Math.random() * h * 0.05, r: 0.6, a: 0.45 * p.z });
            }
            p.y = -40 - Math.random() * 80;
            p.x = Math.random() * (w + 300);
          }
          if (p.x < -40) p.x += w + 300;
          const len = (0.016 + 0.012 * p.z) * vy;
          ctx.strokeStyle = `rgba(${pal.rain},${(0.06 + 0.32 * p.z) * rainAmt * (1 + lightning * 0.8)})`;
          ctx.lineWidth = 0.5 + 1.3 * p.z;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p.x - (vx / vy) * len, p.y - len);
          ctx.stroke();
        }
        splashes = splashes.filter((s) => s.a > 0.02);
        ctx.lineWidth = 0.7;
        for (const s of splashes) {
          ctx.strokeStyle = `rgba(${pal.rain},${s.a})`;
          ctx.beginPath(); ctx.ellipse(s.x, s.y, s.r * 2.4, s.r * 0.7, 0, 0, Math.PI * 2); ctx.stroke();
          s.r += 24 * dt;
          s.a *= Math.pow(0.015, dt);
        }
      }

      // Mist: slow elliptical fog banks drifting with the wind, plus low ground haze.
      const fogAmt = quiet * 0.55 + building * 0.9 + storm * 0.7 + sun * 0.12;
      if (fogAmt > 0.03) {
        for (const f of fogBanks) {
          f.x -= (f.speed + 36 * gust) * dt;
          if (f.x + f.rx < 0) { f.x = w + f.rx; f.y = h * (0.4 + Math.random() * 0.6); }
          const a = 0.19 * fogAmt * f.a * (0.75 + 0.25 * Math.sin(t / 4200 + f.phase));
          ctx.save();
          ctx.translate(f.x, f.y);
          ctx.scale(1, f.ry / f.rx);
          const fg = ctx.createRadialGradient(0, 0, 0, 0, 0, f.rx);
          fg.addColorStop(0, `rgba(${pal.fog},${a})`);
          fg.addColorStop(0.6, `rgba(${pal.fog},${a * 0.45})`);
          fg.addColorStop(1, `rgba(${pal.fog},0)`);
          ctx.fillStyle = fg;
          ctx.beginPath(); ctx.arc(0, 0, f.rx, 0, Math.PI * 2); ctx.fill();
          ctx.restore();
        }
        const haze = ctx.createLinearGradient(0, h * 0.55, 0, h);
        haze.addColorStop(0, `rgba(${pal.fog},0)`);
        haze.addColorStop(1, `rgba(${pal.fog},${0.15 * fogAmt})`);
        ctx.fillStyle = haze;
        ctx.fillRect(0, h * 0.55, w, h * 0.45);
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

      const moteAmt = Math.max(quiet, sun * 0.7);
      if (moteAmt > 0.2) {
        for (const m of motes) {
          m.x += (m.vx + Math.sin(t / 3100 + m.phase) * 3) * dt;
          m.y += (m.vy + Math.cos(t / 2700 + m.phase) * 2) * dt;
          if (m.x < -5) m.x = w + 5; else if (m.x > w + 5) m.x = -5;
          if (m.y < -5) m.y = h + 5; else if (m.y > h + 5) m.y = -5;
          ctx.fillStyle = `rgba(${pal.mote},${0.3 * moteAmt * (0.4 + 0.6 * Math.abs(Math.sin(t / 1900 + m.phase)))})`;
          ctx.beginPath(); ctx.arc(m.x, m.y, m.r, 0, Math.PI * 2); ctx.fill();
        }
      }

      weatherAnimId = requestAnimationFrame(drawWeather);
    }

    function resizeWeatherCanvas() {
      const canvas = document.getElementById('weather-canvas');
      if (canvas) {
        // Half resolution: the drifting motes are soft, and CSS stretches the
        // canvas back to full size — a large CPU/battery save, no visible change.
        canvas.width = Math.max(320, Math.round(window.innerWidth / 2));
        canvas.height = Math.max(240, Math.round(window.innerHeight / 2));
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
      if (!silent) {
        showToast(`Focus atmosphere: ${weatherMeta[currentWeatherType]?.name || preset}`);
        if (window.Insights) window.Insights.track('feature_use', currentSheetIndex, { feature: 'weather', preset: preset });
      }
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

      // No sound — the site stays silent when a timed sitting ends.

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
    // Auto mode: the reading size follows the screen until the learner picks
    // one with A-/A+. Legacy saves that match the old default are treated as
    // auto; deliberate non-default choices keep working untouched.
    let fontAuto = true;

    function autoFontIndexFor(width) {
      if (width >= 1900) return 3; // 130% on large monitors
      if (width >= 1366) return 2; // 115% on laptops and up
      return 1;                    // 100% on tablets and phones
    }

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
      const manualFont = localStorage.getItem('daniel_font_manual_v1') === '1';
      const legacyChosen = savedFont !== null && parseInt(savedFont, 10) !== 1;
      if (manualFont || legacyChosen) {
        fontAuto = false;
        if (savedFont !== null) currentFontIdx = Math.max(0, Math.min(fontSizes.length - 1, parseInt(savedFont, 10) || 1));
        if (legacyChosen && !manualFont) localStorage.setItem('daniel_font_manual_v1', '1');
      }
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
      if (!silent && themeIcon) {
        showToast(`Theme: ${themeIcon.innerText}`);
        if (window.Insights) window.Insights.track('feature_use', currentSheetIndex, { feature: 'theme', theme: theme });
      }
    }

    function cycleTheme() {
      applyTheme(currentThemeIdx + 1);
    }

    function applyFontSize() {
      if (fontAuto) {
        currentFontIdx = autoFontIndexFor(window.innerWidth);
      }
      const current = fontSizes[currentFontIdx];
      document.documentElement.style.setProperty('--reading-font-size', current.size);
      const indicator = document.getElementById('font-size-indicator');
      if (indicator) {
        // Keep the pill short on phones so the topbar never wraps.
        indicator.innerText = fontAuto && window.innerWidth >= 700 ? `Auto · ${current.label}` : current.label;
        indicator.title = fontAuto
          ? 'Text size follows your screen automatically. Use A- / A+ to set it yourself.'
          : 'Text size set manually. Delete the A- / A+ choice to return to automatic.';
      }
      if (!fontAuto) {
        try {
          localStorage.setItem('daniel_font_size_idx_v4', currentFontIdx);
        } catch (e) {}
      }
    }

    let fontResizeTimer = null;
    window.addEventListener('resize', () => {
      if (!fontAuto) return;
      clearTimeout(fontResizeTimer);
      fontResizeTimer = setTimeout(applyFontSize, 180);
    });

    function adjustFontSize(delta) {
      fontAuto = false;
      try {
        localStorage.setItem('daniel_font_manual_v1', '1');
      } catch (e) {}
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

      const memberViewer = !!(window.ScrollAuth && typeof window.ScrollAuth.getUser === 'function' && window.ScrollAuth.getUser());
      const maxOpenIdx = (window.BAJourney && typeof window.BAJourney.maxOpenSheet === 'function') ? window.BAJourney.maxOpenSheet() : 0;

      sheetsData.forEach((sheet, idx) => {
        const isCurrent = idx === currentSheetIndex;
        const isDone = completedSheets.has(idx);

        const locked = !canAccessSheet(idx);
        // Guests get the free sittings; their locked rows are sign-in doors.
        const guestWall = locked && !memberViewer;
        const btn = document.createElement('button');
        btn.type = 'button';
        if (!locked) {
          btn.addEventListener('click', () => {
            loadSheet(idx);
            toggleTocDrawer();
          });
        } else if (guestWall) {
          btn.addEventListener('click', () => {
            window.location.assign('account.html?next=' + encodeURIComponent('study.html?sheet=' + idx));
          });
        } else {
          btn.disabled = true;
          btn.setAttribute('aria-disabled', 'true');
        }
        const statusChip = isDone
          ? '<p class="mt-1 font-mono text-[10px] uppercase tracking-wider text-emerald-700 dark:text-emerald-400">✓ Completed</p>'
          : (locked
            ? `<p class="mt-1 font-mono text-[10px] uppercase tracking-wider text-amber-800 dark:text-amber-400">${memberLockText('Locked — finish the open sitting')}</p>`
            : (!memberViewer && idx === maxOpenIdx
              ? '<p class="mt-1 font-mono text-[10px] uppercase tracking-wider text-amber-700 dark:text-amber-400">Free — start here</p>'
              : (memberViewer && idx === maxOpenIdx
                ? '<p class="mt-1 font-mono text-[10px] uppercase tracking-wider text-amber-700 dark:text-amber-400">Up next</p>'
                : '')));
        btn.className = `w-full text-left p-3 rounded-lg flex items-start space-x-3 transition-colors ${
          locked
            ? (guestWall
              ? 'opacity-70 hover:bg-paper-200/60 dark:hover:bg-paper-900'
              : 'opacity-45 cursor-default pointer-events-none')
            : isCurrent
            ? 'bg-amber-100/70 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-800'
            : 'hover:bg-paper-200/60 dark:hover:bg-paper-900'
        }`;

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
            ${statusChip}
          </div>
        `;
        if (locked && !guestWall) btn.title = 'Locked — finish the open sitting first';
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
    function verifyKindClass(kind) {
      if (kind === 'history' || kind === 'inscription' || kind === 'commentary' || kind === 'scripture') return kind;
      return 'scripture';
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

    /* ---- Reference index -------------------------------------------------
       Turns SHEET_VERIFY[n] into a reference list the lesson prose can cite.
       Each item gets a stable id (ref-<sheet>-<i>) and, when it is Scripture,
       a set of normalised chapter/verse slots so a verse printed anywhere in
       the prose can be resolved to the reference that documents it.

       Source strings look like "Daniel 7:8, 24, King James Version" (two verses)
       and "Numbers 14:34; Ezekiel 4:6, King James Version" (two books), so the
       verse list is read from the digits after each colon rather than by
       splitting on commas, which would mistake "24" for a separate reference. */
    function normalBook(name) {
      const s = String(name || '').trim().toLowerCase().replace(/\./g, '');
      // Diagrams and prose abbreviate book names ("Dan 1:12", "Rev 13:5")
      // while the reference list spells them out, so both sides normalise
      // through this table before they are compared.
      const alias = {
        'dan': 'daniel', 'jer': 'jeremiah', 'isa': 'isaiah', 'ezek': 'ezekiel',
        'ex': 'exodus', 'exod': 'exodus', 'lev': 'leviticus', 'num': 'numbers',
        'deut': 'deuteronomy', 'ps': 'psalm', 'psa': 'psalm', 'prov': 'proverbs',
        'matt': 'matthew', 'mt': 'matthew', 'mk': 'mark', 'lk': 'luke',
        'jn': 'john', 'rom': 'romans', 'rev': 'revelation', 'gen': 'genesis',
        'hab': 'habakkuk', 'zeph': 'zephaniah', 'ezra': 'ezra', 'neh': 'nehemiah',
        'est': 'esther', 'kgs': 'kings', 'chr': 'chronicles', 'sam': 'samuel',
        'cor': 'corinthians', 'thess': 'thessalonians', 'tim': 'timothy'
      };
      const collapsed = s.replace(/^psalms?$/, 'psalm').replace(/\s+/g, ' ');
      if (alias[collapsed]) return alias[collapsed];
      // "1 kgs" / "2 chr" style: number then abbreviation.
      const parts = collapsed.match(/^([1-3])\s+(.+)$/);
      if (parts && alias[parts[2]]) return parts[1] + ' ' + alias[parts[2]];
      return collapsed;
    }
    function parseSourceRefs(source) {
      const body = String(source || '').split(/,\s*King James Version/i)[0];
      const slots = [];
      const ranges = [];
      // A semicolon starts a new clause, and a clause may or may not repeat the
      // book ("Numbers 14:34; Ezekiel 4:6" repeats it, "Revelation 12:6, 12:14;
      // 13:5" does not). The lookahead keeps a repeated chapter marker such as
      // the "12:" in "12:14" from being swallowed as the verse 12 of chapter 12.
      const V = '\\d+(?:\\s*[\\u2013\\u2014\\u2011-]\\s*\\d+)?';
      const rx = new RegExp(
        '([1-3]?\\s?[A-Za-z][A-Za-z. ]*?)?\\s*(\\d+):\\s*((?!\\d+\\s*:)' + V + '(?:\\s*,\\s*(?!\\d+\\s*:)' + V + ')*)',
        'g'
      );
      let book = '';
      body.split(';').forEach((clause) => {
        let m;
        rx.lastIndex = 0;
        while ((m = rx.exec(clause))) {
          if (m[1] && m[1].trim()) book = normalBook(m[1].replace(/[.\s]+$/, ''));
          if (!book) continue;
          const chapter = m[2];
          // Walk the verse expression so a range ("24–25") is recorded as a
          // span, letting a prose citation of 9:24–27 resolve to it.
          const group = /(\d+)(?:\s*[\u2013\u2014\u2011-]\s*(\d+))?/g;
          let g;
          while ((g = group.exec(m[3]))) {
            const from = Number(g[1]);
            const to = g[2] ? Number(g[2]) : from;
            const lo = Math.min(from, to);
            const hi = Math.max(from, to);
            ranges.push({ book: book, chapter: chapter, lo: lo, hi: hi });
            for (let v = lo; v <= hi; v++) slots.push(book + ' ' + chapter + ':' + v);
          }
        }
      });
      return { slots: slots, ranges: ranges };
    }
    function referenceIndex(sheetIndex) {
      const pack = window.SHEET_VERIFY && window.SHEET_VERIFY[sheetIndex];
      if (!pack || !pack.items) return [];
      return pack.items.map((it, i) => {
        const parsed = it.kind === 'scripture' ? parseSourceRefs(it.source) : { slots: [], ranges: [] };
        return {
          id: 'ref-' + sheetIndex + '-' + i,
          n: i + 1,
          kind: verifyKindClass(it.kind),
          label: verifyKindLabel(it.kind),
          claim: String(it.lesson || ''),
          source: String(it.source || ''),
          quote: String(it.quote || ''),
          check: String(it.check || ''),
          href: verifyOpenHref(it.href) || verifyOpenHref(autoScriptureHref(it)),
          slots: parsed.slots,
          ranges: parsed.ranges
        };
      });
    }

    // Resolve a book/chapter/verse printed in the prose to the reference that
    // documents it. A verse inside a documented span counts, so "9:24–27"
    // resolves to a reference held for "9:24–25".
    function findRefForVerse(bySlot, ranges, book, chapter, verse) {
      const exact = bySlot.get(book + ' ' + chapter + ':' + verse);
      if (exact) return exact;
      for (let i = 0; i < ranges.length; i++) {
        const r = ranges[i];
        if (r.book === book && String(r.chapter) === String(chapter) && verse >= r.lo && verse <= r.hi) return r.ref;
      }
      return null;
    }

    // Wrap "(Daniel 1:2)" style citations in the prose so they jump to the list.
    function decorateCitations(root, refs) {
      if (!root || !refs.length) return 0;
      const bySlot = new Map();
      const spans = [];
      refs.forEach((r) => {
        r.slots.forEach((s) => { if (!bySlot.has(s)) bySlot.set(s, r); });
        (r.ranges || []).forEach((rg) => spans.push({ book: rg.book, chapter: rg.chapter, lo: rg.lo, hi: rg.hi, ref: r }));
      });
      const resolve = (book, chapter, verse) => findRefForVerse(bySlot, spans, book, chapter, verse);

      const nodes = [];
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
        acceptNode(node) {
          const el = node.parentElement;
          if (!el) return NodeFilter.FILTER_REJECT;
          if (/^(SCRIPT|STYLE)$/.test(el.tagName)) return NodeFilter.FILTER_REJECT;
          /* `.mm` is the mindmap block. Its nodes are role=button, which the
             `button` exclusion below does not catch, and a citation button
             nested inside a node is not reachable or meaningful. */
          if (el.closest('blockquote, nav.lesson-toc, .cite-ref, .mm, a, button')) return NodeFilter.FILTER_REJECT;
          return /\d:\d/.test(node.nodeValue || '') ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
        }
      });
      while (walker.nextNode()) nodes.push(walker.currentNode);

      let made = 0;
      const rx = /\(\s*([1-3]?\s?[A-Za-z][A-Za-z. ]*?)\s*(\d+):([\d\s,\u2013\u2014\u2011-]+)\s*\)/g;
      nodes.forEach((node) => {
        const text = node.nodeValue;
        let match;
        let cursor = 0;
        const frag = document.createDocumentFragment();
        rx.lastIndex = 0;
        let hit = false;
        while ((match = rx.exec(text))) {
          const book = normalBook(match[1].replace(/[.\s]+$/, ''));
          const chapter = match[2];
          const verses = match[3].match(/\d+/g) || [];
          let ref = null;
          for (const v of verses) { ref = resolve(book, chapter, Number(v)); if (ref) break; }
          if (!ref) continue;
          hit = true;
          frag.appendChild(document.createTextNode(text.slice(cursor, match.index)));
          const btn = document.createElement('button');
          btn.type = 'button';
          btn.className = 'cite-ref';
          btn.setAttribute('data-cite', ref.id);
          btn.setAttribute('aria-label', 'Reference ' + ref.n + ': ' + match[0].replace(/[()]/g, '').trim());
          btn.textContent = match[0];
          frag.appendChild(btn);
          cursor = match.index + match[0].length;
        }
        if (!hit) return;
        frag.appendChild(document.createTextNode(text.slice(cursor)));
        node.parentNode.replaceChild(frag, node);
        made += 1;
      });
      return made;
    }
    /* ---- Chain diagram ---------------------------------------------------
       A three-step cinematic flow: cards joined by arrows that draw in, with
       the middle node promoted to a medalled centre. Ported from a standalone
       component so the artwork, fonts, and colour tokens are the ones this
       site already ships. Entrance plays when the figure scrolls into view and
       can be replayed; it is suppressed under prefers-reduced-motion. */
    /* ---- Diagrams --------------------------------------------------------
       Each sitting's ASCII `prophecy-diagram` artwork is authored as a spec in
       `sheet.diagrams`, keyed to a `figure[data-diagram]` marker left in the
       lesson where the artwork used to sit. renderSheetDiagrams() fills those
       markers in place, so a diagram stays wherever the lesson puts it.

       Variants:
         chain       linear sequence, middle node medalled
         steps       linear sequence without a centre
         comparison  N parallel columns of points
         table       header row plus data rows, stacking on narrow screens
         timeline    tracks of unequal length, drawn to proportional span
         flow        vertical sequence of statements

       The original artwork stays inside each figure as hidden text so it
       survives for search and copy. A verse chip resolves to a row in the
       sitting's reference list; a printed reference the list does not carry is
       shown as a flat label rather than a dead control. */

    /* A diagram's printed reference renders as a chip that opens the matching
       reference row. References the sitting's list does not carry — chapter-only
       labels like "Daniel 4", or a book this sitting never documents — are
       printed as plain text instead, so nothing is lost and nothing is a dead
       control. `canResolve` is supplied by the renderer for the current sitting. */
    function diagramCite(label, canResolve) {
      const text = String(label || '');
      if (!text) return '';
      if (canResolve && !canResolve(text)) {
        return '<span class="chain-cite is-flat">' + escapeStudy(text) + '</span>';
      }
      return '<button type="button" class="chain-cite" data-cite-src="' + escapeStudy(text) + '">' + escapeStudy(text) + '</button>';
    }

    // Does this printed reference correspond to a reference row for the sitting?
    function makeCiteResolver(refs) {
      const bySlot = new Map();
      const spans = [];
      refs.forEach((r) => {
        r.slots.forEach((s) => { if (!bySlot.has(s)) bySlot.set(s, r); });
        (r.ranges || []).forEach((rg) => spans.push({ book: rg.book, chapter: rg.chapter, lo: rg.lo, hi: rg.hi, ref: r }));
      });
      return (label) => {
        const text = String(label || '');
        const colon = text.indexOf(':');
        if (colon < 0) return false;
        const before = text.slice(0, colon);
        const book = normalBook(before.replace(/\s*\d+\s*$/, '').trim());
        const chapter = (before.match(/(\d+)\s*$/) || [])[1];
        if (!book || !chapter) return false;
        return spans.some((sp) => sp.book === book && String(sp.chapter) === String(chapter)) ||
          [...bySlot.keys()].some((k) => k.startsWith(book + ' ' + chapter + ':'));
      };
    }

    function nodeHtml(step, isCentre, t, canResolve) {
      return '<article class="chain-node' + (isCentre ? ' is-centre' : '') + '" style="--t:' + t.toFixed(2) + 's">' +
        (isCentre
          ? '<div class="chain-medal" aria-hidden="true">' +
              '<svg viewBox="0 0 140 140" fill="none" stroke="currentColor">' +
                '<circle cx="70" cy="70" r="68" stroke-opacity=".35" stroke-width="1"/>' +
                '<circle cx="70" cy="70" r="58" stroke-opacity=".7" stroke-width="1.2"/>' +
                '<path d="M70 36V106M51 58H89" stroke-width="3.5" stroke-linecap="round"/>' +
              '</svg>' +
            '</div>'
          : (step.role ? '<p class="chain-role">' + escapeStudy(step.role) + '</p>' : '')) +
        (step.title ? '<h4 class="chain-title">' + escapeStudy(step.title) + '</h4>' : '') +
        diagramCite(step.cite, canResolve) +
        (step.text ? '<p class="chain-text">' + escapeStudy(step.text) + '</p>' : '') +
      '</article>';
    }

    function bodyChain(spec, steps, withCentre, canResolve) {
      const mid = withCentre ? steps.findIndex((s) => s.centre) : -1;
      let t = 0.1;
      const parts = [];
      steps.forEach((step, i) => {
        if (i > 0) {
          t += 0.4;
          parts.push('<div class="chain-link" style="--t:' + t.toFixed(2) + 's" aria-hidden="true">' +
            '<span class="chain-link-line"></span><span class="chain-link-head"></span></div>');
          t += 0.5;
        }
        parts.push(nodeHtml(step, i === mid, t, canResolve));
      });
      // More than three cards form a grid (see .chain-flow.is-dense in study.html):
      // two columns for four cards, three columns otherwise, read left to right.
      const dense = steps.length > 3;
      const flowClass = 'chain-flow' + (dense ? ' is-dense' : '');
      const flowStyle = dense ? ' style="--chain-cols:' + (steps.length === 4 ? 2 : 3) + '"' : '';
      return '<div class="' + flowClass + '"' + flowStyle + '>' + parts.join('') + '</div>';
    }

    /* A comparison is one of two shapes, and which one it is is a property of the
       data, not of the drawing. Where every side carries the same number of
       points and point k of each side is about the same thing, the spec is a
       matrix that was flattened into parallel bullets: it carries `rows`, one
       authored label per point, and is rendered as a real table — the thing it
       actually is. Where the points differ in kind the sides are genuinely
       parallel and keep the bullet layout, with no row labels invented for them.

       Both shapes wear one set of clothes: serif italic column heads, monospace
       labels, butt-joined bordered panels, a hairline between rows. A change of
       shape never touches a point's text: the cells are `points[]` verbatim, and
       the only copy this renderer has ever added is the row label, which
       classifies the author's own points and asserts nothing. */
    function bodyComparison(spec, steps, canResolve) {
      const rows = Array.isArray(spec.rows) ? spec.rows : [];
      // A matrix only where the labels cover every side exactly. Anything else is
      // the parallel shape, which is what the data is when the counts disagree.
      const isMatrix = rows.length > 0 && steps.every((s) => (s.points || []).length === rows.length);

      // A head is sized by this standard, so its parts are spans: `.article-body
      // p` and `.article-body h4` both carry `font-size: … !important` for the
      // reader's text-size control, and either element would overrule the block.
      const colHead = (side) =>
        (side.role ? '<span class="chain-role cmp-role">' + escapeStudy(side.role) + '</span>' : '') +
        (side.title ? '<span class="chain-title cmp-title">' + escapeStudy(side.title) + '</span>' : '') +
        diagramCite(side.cite, canResolve);

      // Some comparisons branch from one labelled node rather than being a flat
      // pair of columns. `centre` renders that node above the columns, keeping
      // its reference a resolvable chip instead of demoting it to a note.
      const c = spec.centre;
      const centreHtml = c
        ? '<div class="cmp-centre" style="--t:0.1s">' +
            (c.role ? '<span class="chain-role cmp-role">' + escapeStudy(c.role) + '</span>' : '') +
            (c.title ? '<span class="chain-title cmp-title">' + escapeStudy(c.title) + '</span>' : '') +
            diagramCite(c.cite, canResolve) +
            (c.text ? '<p class="chain-text">' + escapeStudy(c.text) + '</p>' : '') +
          '</div>' +
          '<div class="cmp-stem" aria-hidden="true"></div>'
        : '';

      if (isMatrix) {
        // `th[scope=col]` for a column's identity and `th[scope=row]` for a row's,
        // so the matrix stays a table for a screen reader. The stacked phone
        // layout captions each value from `data-label`, the column it came from.
        const head = '<tr class="cmp-headrow" style="--t:0.1s">' +
          '<td class="cmp-corner"></td>' +
          steps.map((side) => '<th scope="col" class="cmp-colhead">' + colHead(side) + '</th>').join('') +
        '</tr>';
        const body = rows.map((label, r) =>
          // The stagger stops climbing after the eighth row: eleven rows of
          // narrative should arrive as one movement, not as a queue.
          '<tr style="--t:' + (0.16 + Math.min(r, 8) * 0.05).toFixed(2) + 's">' +
            '<th scope="row" class="cmp-rowhead">' + escapeStudy(label) + '</th>' +
            steps.map((side) => '<td data-label="' + escapeStudy(side.title || side.role || '') + '">' +
              escapeStudy((side.points || [])[r] || '') + '</td>').join('') +
          '</tr>').join('');
        return '<div class="cmp is-matrix' + (c ? ' has-centre' : '') + '">' + centreHtml +
          '<div class="cmp-matrix-wrap">' +
            '<table class="cmp-matrix">' +
              '<thead>' + head + '</thead>' +
              '<tbody>' + body + '</tbody>' +
            '</table>' +
          '</div>' +
        '</div>';
      }

      // Parallel columns. The head is a row of its own above the panels, so a
      // column's identity sits in the same place in both shapes, and `--cmp-i`
      // is what the stacked layout orders each head with its own panel by.
      const at = (i) => (0.1 + i * 0.25).toFixed(2) + 's;--cmp-i:' + i;
      const cols = steps.map((side, i) =>
        '<div class="cmp-head" style="--t:' + at(i) + '">' + colHead(side) + '</div>').join('') +
        steps.map((side, i) =>
          '<div class="cmp-col' + (i === 0 ? ' is-first' : '') + '" style="--t:' + at(i) + '">' +
            '<ul class="cmp-list">' +
              (side.points || []).map((p) => '<li>' + escapeStudy(p) + '</li>').join('') +
            '</ul>' +
          '</div>').join('');
      // Column count follows the data: some comparisons have two sides, the
      // schools comparison has three.
      return '<div class="cmp' + (c ? ' has-centre' : '') + '">' + centreHtml +
        '<div class="cmp-grid' + (steps.length >= 3 ? ' is-three' : '') + '" style="--cmp-cols:' + Math.max(2, steps.length) + '">' + cols + '</div>' +
      '</div>';
    }

    /* A table is a matrix read down its columns, so its anatomy is the
       reference's rather than a spreadsheet's: the row's identity is a
       monospace label on the page ground at the left, the column's identity is
       a serif italic head over the column, and the data columns are drawn as
       butt-joined bordered panels — one ruled body, no zebra stripes and no
       band of small-caps over the top.

       Each row is two table cells then: the row's label, and one cell holding
       that row's data cells as a single grid. The label column is a fixed width
       and every row's grid is the rest of the row on the same
       `repeat(N, minmax(0, 1fr))`, so a head over column 3 sits exactly over the
       cells below it at any wrap and each column reads as one tall panel with
       1px hairlines between its cells, rather than a tinted box per cell. The
       label is a cell of the row, not of the grid, which is what puts it outside
       the ruled body on the page ground with no border of its own.

       (A non-table element cannot be a child of `tr`: the HTML parser
       foster-parents it out of the table before any CSS sees it. So the grid is
       a cell — `display: grid` on a `td` — and not a wrapper inside the row.)

       Nothing is removed to achieve that: `thead`/`th[scope=col]` and
       `th[scope=row]` are still the semantics (the head row's first cell is the
       empty label cell of the row axis, which is what a matrix with a label
       column has), `data-label` still carries the stacked-layout contract, and
       an authored empty cell renders as an empty panel. */
    function bodyTable(spec, rows) {
      const head = spec.head || [];
      const cols = Math.max(1, head.length - 1);
      const body = rows;
      /* Written once: the real `<th scope=col>` heads and the stacked layout's
         `data-label` captions are the same words. */
      const dataHeads = head.slice(1);
      return '<div class="tbl-wrap"><table class="tbl">' +
        (head.length
          ? '<thead><tr><th class="tbl-label" scope="col" aria-label="Row"></th>' +
            '<td class="tbl-grid is-head" style="--tbl-cols:' + cols + '">' +
              dataHeads.map((h) => '<span class="tbl-head" role="columnheader">' + escapeStudy(h) + '</span>').join('') +
            '</td></tr></thead>'
          : '') +
        '<tbody>' + body.map((r) => {
          const cells = r.cells || [];
          return '<tr>' +
            '<th class="tbl-label" scope="row">' + (cells.length ? escapeStudy(cells[0]) : '') + '</th>' +
            '<td class="tbl-grid" style="--tbl-cols:' + cols + '">' +
              cells.slice(1).map((c, ci) => '<span class="tbl-cell" data-label="' + escapeStudy(dataHeads[ci] || '') + '">' + escapeStudy(c) + '</span>').join('') +
            '</td>' +
          '</tr>';
        }).join('') + '</tbody>' +
      '</table></div>';
    }

    /* Mindmap: the same steps re-projected around a centre node (C1–C21 of
       docs/spec-flow-mindmap.md). The body is a host element and nothing else —
       js/study/mindmap.js renders into it and owns the rAF loop, the observers
       and every listener, so the block can be destroyed with the figure. */
    function bodyMindmap(spec) {
      return '<div class="mm" data-mm-host></div>';
    }

    /* A flow is a strict sequence, so its steps stay stacked and visible as a
       whole: the order is the argument. What the stack was missing is the rail.
       It draws one continuous line through the steps with a marker on each, runs
       a travelling highlight down it when the block enters (and again from the
       figure's own Replay control, which replays the entrance animation), and
       lets a step open the course's existing full-screen reader as its scene.

       `continuation` is computed by the renderer from the neighbouring diagram of
       the same kind: the index of every step whose own words already appeared
       there, and the beat the sweep should enter on. No copy is involved. */
    const FLOW_ASIDES = {
      /* The one label a flow prints that is not read off the step it hangs on:
         the state Daniel 12:1 has not yet reached. It is the sitting's own
         sentence, quoted verbatim in docs/flow-map-decisions.md §6.5 ("Hebrews
         7:25 is the ministry of this age"); the side-note beside it is s10-2
         step 1's own `text`. Nothing here is authored copy. */
      's10-2': { step: 0, counter: 'Hebrews 7:25 is the ministry of this age' }
    };

    function bodyFlow(spec, steps, canResolve, diagramId, continuation) {
      const aside = FLOW_ASIDES[diagramId] || null;
      const shared = (continuation && continuation.shared) || new Set();
      const last = steps.length - 1;
      const enter = Math.max(0, Math.min(last, (continuation && continuation.enter) || 0));
      // One beat per step: the mark on the rail lights as the highlight reaches
      // it, and the cards keep the stagger they have always had.
      const BEAT = 0.35;
      const lit = (i) => 0.15 + Math.max(0, i - enter) * BEAT;
      const travel = (lit(last) + 0.9).toFixed(2) + 's';
      const parts = [];
      steps.forEach((step, i) => {
        if (i > 0) {
          // The segment of rail between two steps, drawn in as the light arrives.
          parts.push('<div class="flow-connector" style="--t:' + (lit(i - 1) + BEAT / 2).toFixed(2) + 's" aria-hidden="true">' +
            '<span class="flow-connector-line"></span>' +
            '<span class="flow-connector-tip"></span>' +
          '</div>');
        }
        const asideHere = !!aside && aside.step === i;
        // The step's own words name its marker for a screen reader; the card
        // around the marker is the pointer target for the same scene.
        const label = String(step.title || step.role || ('Step ' + (i + 1)));
        parts.push('<div class="flow-step' + (shared.has(i) ? ' is-shared' : '') + (step.centre ? ' is-centre' : '') + (asideHere ? ' has-aside' : '') + '"' +
          ' data-index="' + i + '" style="--t:' + (0.1 + i * BEAT).toFixed(2) + 's">' +
          '<button class="flow-node" type="button" aria-label="' + escapeStudy(label) + '">' +
            '<span class="flow-node-dot" style="--t:' + lit(i).toFixed(2) + 's" aria-hidden="true"></span>' +
          '</button>' +
          '<span class="flow-scene-mark" aria-hidden="true">' +
            '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M9.5 2H14v4.5M6.5 14H2V9.5M14 2 9.6 6.4M2 14l4.4-4.4"/></svg>' +
          '</span>' +
          '<div class="flow-content">' +
            // A centre keeps the medal the story carousel gives one, so a centre
            // movement reads the same in both renderers.
            (step.centre && !storySrc(step)
              ? '<div class="story-medal" aria-hidden="true"><svg viewBox="0 0 140 140" fill="none" stroke="currentColor"><circle cx="70" cy="70" r="58" stroke-width="1.2"/><path d="M70 36V106M51 58H89" stroke-width="3.5" stroke-linecap="round"/></svg></div>'
              : '') +
            (step.role ? '<p class="chain-role">' + escapeStudy(step.role) + '</p>' : '') +
            (step.title ? '<h4 class="chain-title">' + escapeStudy(step.title) + '</h4>' : '') +
            diagramCite(step.cite, canResolve) +
            // A `text` that hangs beside the step as a side-note is not repeated
            // inside it.
            (step.text && !asideHere ? '<p class="chain-text">' + escapeStudy(step.text) + '</p>' : '') +
            ((step.points || []).length
              ? '<ul class="flow-points">' + step.points.map((p) => '<li>' + escapeStudy(p) + '</li>').join('') + '</ul>'
              : '') +
          '</div>' +
          (asideHere
            ? '<aside class="flow-aside">' +
                (step.text ? '<p class="flow-note">' + escapeStudy(step.text) + '</p>' : '') +
                (aside.counter ? '<p class="flow-counter">' + escapeStudy(aside.counter) + '</p>' : '') +
              '</aside>'
            : '') +
        '</div>');
      });
      // The scene layer: the same steps again as reader cards, so a step can open
      // the course's existing full-screen reader. The carousel they belong to
      // stays hidden — a flow's order must remain visible at once — and only its
      // `.story-read` dialog is ever shown.
      return '<div class="flow-stack" style="--flow-travel:' + travel + '"' +
          (enter > 0 ? ' data-flow-enter="' + enter + '"' : '') + '>' +
          '<div class="flow-rail" aria-hidden="true"><span class="flow-rail-pulse"></span></div>' +
          parts.join('') +
        '</div>' +
        '<div class="flow-scenes" hidden aria-hidden="true">' + bodyStory(spec, steps, canResolve, 0, diagramId) + '</div>';
    }

    /* ---- Timeline standard ------------------------------------------------
       Ported from the standalone cinematic timeline the brief names. A spine
       draws itself in left to right; each segment is a stroke on that beat; each
       dated milestone is a node — ringed dot, serif year, sans event, mono
       reference, and a stemmed badge carrying an icon; each spec `segment` is a
       span bracket captioned with its own leading clause; the longest stretch is
       ticked by the century; the last milestone is filled, haloed and pings; and
       one selection keeps the axis, the legend and the panel in step.

       A milestone is a date the spec already prints — an axis endpoint, or a year
       named in a track's `role` or a segment's `label`. Its place is its own
       arithmetic: 457 B.C. is -456, so A.D. 34 is 490 years on. It is drawn on an
       even beat because on a 2,300-year axis A.D. 27, 31 and 34 fall within 0.3%
       of one another, i.e. on one dot. The reference resolves the same collision
       the same way, and says so: `.tlx-scale` underneath is the to-scale
       statement, each part at its true proportion.

       Nothing here is authored copy. The brackets are the spec's `segments`, the
       panel body is a segment's own `label`, the node's reference line is its
       track's own `cite` or `role`, the bar's split is `from`/`to` read as years,
       and the century ticks are multiples of a hundred on the axis. */
    const TLX_W = 1600;
    const TLX_EDGE = 150;
    const TLX_LEVEL = 48;
    const TLX_BRACKET_Y = 66;
    const TLX_PALETTE = ['#7db3e8', '#f2c75a', '#e8695d', '#b79af0', '#5fc4b0'];
    const TLX_FINAL = '#fff1c9';
    const TLX_GILT = '#dcb257';
    /* The reference's own icon set, on its 24-unit grid. */
    const TLX_ICONS = {
      scroll: 'M6 3h9l4 4v14H6ZM15 3v4h4M9 12h7M9 16h7',
      drop: 'M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11Z',
      cross: 'M12 3v18M6.5 9h11',
      globe: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18ZM3 12h18M12 3c3 2.7 3 15.3 0 18M12 3c-3 2.7-3 15.3 0 18',
      hourglass: 'M6 3h12M6 21h12M7 3v4l5 5-5 5v4M17 3v4l-5 5 5 5v4',
      temple: 'M3 20h18M5 20V11M19 20V11M3 11l9-7 9 7M9 20v-5h6v5',
      ring: 'M12 3.4a8.6 8.6 0 1 0 0 17.2 8.6 8.6 0 0 0 0-17.2ZM12 10.6a1.4 1.4 0 1 0 0 2.8 1.4 1.4 0 0 0 0-2.8Z'
    };
    /* Which badge a milestone wears is read off the milestone's own words. */
    const TLX_ICON_RULES = [
      [/decree|restore|rebuild|command|edict/i, 'scroll'],
      [/baptis|anoint|messiah|spirit/i, 'drop'],
      [/cross|cut off|midst|death/i, 'cross'],
      [/cleans|sanctuar|atonement|temple|church|pope|papacy|roman|judgment/i, 'temple'],
      [/wait|centur|remain|long stretch|time of the end/i, 'hourglass'],
      [/gospel|gentile|nation|world|week|seventy/i, 'globe'],
      [/prophec|unseal|vision|seal/i, 'scroll']
    ];
    const TLX_YEAR_RX = /(\d[\d,]*)\s*(B\.C\.|A\.D\.)|(B\.C\.|A\.D\.)\s*(\d[\d,]*)/g;
    const TLX_BREAK_RX = /\s*:\s+|\s*(?:→|—|–)\s*|\s*;\s*/;
    const TLX_JOIN_RX = /^(?:to|and|then|until|til)\b[\s:,]*/i;
    const TLX_TAIL_RX = /\s+(?:to|and|then|until|til)$/i;

    /* Every dated token in a string, in order. `year` is the astronomical year —
       457 B.C. is -456 — which is what makes a span between two dates
       subtractable, so a milestone needs no position table. */
    function tlxYears(text) {
      const src = String(text == null ? '' : text);
      const out = [];
      TLX_YEAR_RX.lastIndex = 0;
      let m = TLX_YEAR_RX.exec(src);
      while (m) {
        const era = m[2] || m[3];
        const n = parseInt(String(m[1] || m[4]).replace(/,/g, ''), 10);
        if (Number.isFinite(n)) {
          out.push({ at: m.index, end: TLX_YEAR_RX.lastIndex, label: m[0].replace(/\s+/g, ' ').trim(), year: era === 'B.C.' ? 1 - n : n });
        }
        m = TLX_YEAR_RX.exec(src);
      }
      return out;
    }

    /* A label's clauses. Only a separator that introduces one splits, so
       "2,300 Years (Daniel 8:14)" survives whole while "483 Years: 457 B.C. …"
       reads as "483 Years". */
    function tlxClauses(label) {
      return String(label == null ? '' : label).split(TLX_BREAK_RX).map((s) => s.trim()).filter(Boolean);
    }

    function tlxGroup(n) {
      return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    }

    function tlxClip(text, max) {
      const s = String(text == null ? '' : text).trim();
      if (s.length <= max) return s;
      const cut = s.slice(0, max);
      const space = cut.lastIndexOf(' ');
      return (space > max * 0.55 ? cut.slice(0, space) : cut).replace(/[\s,;:.]+$/, '') + '…';
    }

    /* A long event name becomes at most `lines` centred rows of about `perLine`
       characters, so it reads as two rows instead of running under its
       neighbours. The panel below prints the segment in full, so clipping the
       last row loses nothing. */
    const TLX_DANGLE_RX = /\s+(?:&|and|or|to|of|the|in|for|a|an)$/i;
    function tlxWrap(text, perLine, lines) {
      const words = String(text == null ? '' : text).split(/\s+/).filter(Boolean);
      const rows = [];
      let row = '';
      words.forEach((w) => {
        if (rows.length >= lines) return;
        const next = row ? row + ' ' + w : w;
        if (next.length <= perLine) { row = next; return; }
        if (row) { rows.push(row); row = ''; }
        if (w.length <= perLine) row = w;
        else rows.push(tlxClip(w, perLine));
      });
      if (row && rows.length < lines) rows.push(row);
      /* A row that ends on a joining word reads as a break in the middle of its
         phrase, so that word starts the next row instead. */
      for (let i = 0; i < rows.length - 1; i += 1) {
        const tail = TLX_DANGLE_RX.exec(rows[i]);
        if (!tail) continue;
        rows[i] = rows[i].slice(0, tail.index);
        rows[i + 1] = tail[0].trim() + ' ' + rows[i + 1];
      }
      const shown = rows.join(' ').length;
      if (rows.length && shown < words.join(' ').length) rows[rows.length - 1] += '…';
      return rows.length ? rows : [''];
    }

    /* What the label says happens at a date: the words that follow the year, up
       to the next date or the next clause, with a joining "to" trimmed off either
       end — "457 B.C. Decree to Restore City to A.D. 27" reads "Decree to
       Restore City". */
    function tlxPhrase(label, year) {
      const src = String(label == null ? '' : label);
      const tokens = tlxYears(src);
      const hit = tokens.find((t) => t.year === year);
      if (!hit) return '';
      const next = tokens.find((t) => t.at >= hit.end);
      const tail = src.slice(hit.end, next ? next.at : src.length).split(TLX_BREAK_RX)[0];
      return tlxClip(tail.trim().replace(TLX_JOIN_RX, '').replace(TLX_TAIL_RX, '').trim(), 46);
    }

    /* The badge is read off the milestone's own name first, and only then off the
       segments it sits between: a label that says "457 B.C. Decree" must not put
       a scroll on the baptism three beats later. */
    function tlxIcon(title, labels) {
      const first = String(title == null ? '' : title);
      for (const rule of TLX_ICON_RULES) if (rule[0].test(first)) return rule[1];
      const rest = String(labels == null ? '' : labels);
      for (const rule of TLX_ICON_RULES) if (rule[0].test(rest)) return rule[1];
      return 'ring';
    }

    /* The spec read into the shape an axis needs: the milestones in date order
       with the slot each is drawn in, the segments with the slots they span, and
       the intervals between the milestones. */
    function tlxModel(spec, steps) {
      const axis = (Array.isArray(spec.axis) ? spec.axis : []).map((a) => String(a == null ? '' : a));
      const ends = axis.map((a) => tlxYears(a)[0] || null);
      if (!ends[0] || !ends[1]) return null;
      const start = Math.min(ends[0].year, ends[1].year);
      const end = Math.max(ends[0].year, ends[1].year);
      const span = end - start;
      if (!(span > 0)) return null;

      const segs = [];
      steps.forEach((step) => {
        (step.segments || []).forEach((sg) => {
          const from = Number(sg.from);
          const to = Number(sg.to);
          if (!Number.isFinite(from) || !Number.isFinite(to)) return;
          const label = String(sg.label == null ? '' : sg.label).trim();
          segs.push({
            label: label, lo: Math.min(from, to), hi: Math.max(from, to), step: step,
            head: tlxClauses(label)[0] || label,
            colour: TLX_PALETTE[segs.length % TLX_PALETTE.length]
          });
        });
      });
      if (!segs.length) return null;

      /* A date is a milestone if the spec prints it inside the axis. The axis's
         own two labels are read first, so an endpoint keeps the authored order
         ("1844 A.D.", not "A.D. 1844"). */
      const byYear = new Map();
      const note = (token) => {
        if (!token || token.year < start - 0.5 || token.year > end + 0.5) return;
        const key = Math.round(token.year);
        if (!byYear.has(key)) byYear.set(key, { year: key, label: token.label });
      };
      ends.forEach(note);
      segs.forEach((sg) => tlxYears(sg.label).forEach(note));
      steps.forEach((step) => { tlxYears(step.role).forEach(note); tlxYears(step.title).forEach(note); });
      const miles = Array.from(byYear.values()).sort((a, b) => a.year - b.year);
      if (miles.length < 2) return null;

      /* The margin at each end is what keeps the first and last milestone's name
         inside the axis: a centred label needs as much room beside its node as
         half its own width, so the margin is set from how many milestones there
         are. Three can afford a wide one and print their names whole; five
         cannot, and wrap. */
      const edge = Math.max(TLX_EDGE, Math.min(420, (TLX_W * 0.48) / miles.length));
      const slotStep = (TLX_W - 2 * edge) / (miles.length - 1);
      /* How many characters a milestone's name may hold before it wraps: the slot
         it owns, less a margin, at the sans face's average advance. No name ever
         reaches into its neighbour's column. */
      const perLine = Math.max(16, Math.floor((slotStep * 0.92) / 13));
      const pctOf = (year) => ((year - start) / span) * 100;
      const yearAt = (pct) => start + (pct / 100) * span;
      const slotOf = (year) => {
        let best = 0;
        let gap = Infinity;
        miles.forEach((m, i) => {
          const d = Math.abs(m.year - year);
          if (d < gap) { gap = d; best = i; }
        });
        return best;
      };
      miles.forEach((m, i) => {
        m.slot = i;
        m.x = edge + i * slotStep;
        m.colour = i === miles.length - 1 ? TLX_FINAL : TLX_PALETTE[i % TLX_PALETTE.length];
      });
      segs.forEach((sg) => {
        const a = slotOf(yearAt(sg.lo));
        const b = slotOf(yearAt(sg.hi));
        sg.a = Math.min(a, b);
        sg.b = Math.max(a, b);
      });

      miles.forEach((m) => {
        m.touch = segs.filter((sg) => sg.a === m.slot || sg.b === m.slot);
        let title = '';
        for (const sg of m.touch) {
          title = tlxPhrase(sg.label, m.year);
          if (title) break;
        }
        const opens = m.touch.find((sg) => sg.a === m.slot) || null;
        if (!title && m.touch.length) {
          /* No date in the label to hang a phrase on: the segment that opens
             here names what begins, the one that closes here names what ends. */
          const src = opens || m.touch[0];
          const clauses = tlxClauses(src.label);
          title = opens ? (clauses[0] || '') : (clauses[clauses.length - 1] || '');
        }
        const primary = m.touch[0] || null;
        m.track = primary ? primary.step : null;
        if (!title) title = (m.track && (m.track.title || m.track.role)) || '';
        m.title = tlxClip(title, 46);
        m.cite = (m.track && m.track.cite) || '';
        m.ref = tlxClip(m.cite || (m.track && (m.track.role || m.track.title)) || '', 34);
        m.rows = tlxWrap(m.title, perLine, 2);
        m.icon = tlxIcon(m.title, m.touch.map((sg) => sg.label).join(' '));
        m.aria = m.label + (m.title ? ': ' + m.title : '');
        m.parts = [];
        const seen = new Set();
        m.touch.forEach((sg) => {
          if (seen.has(sg.label)) return;
          seen.add(sg.label);
          m.parts.push({ kicker: [sg.step.role, sg.step.title].filter(Boolean).join(' · '), label: sg.label });
        });
      });

      /* The interval a stretch of spine is drawn across, and the colour it takes:
         the narrowest segment that covers it, which is the one that names it. */
      const intervals = [];
      for (let i = 0; i < miles.length - 1; i += 1) {
        const a = miles[i];
        const b = miles[i + 1];
        const mid = pctOf((a.year + b.year) / 2);
        let pick = null;
        segs.forEach((sg) => {
          if (mid < sg.lo || mid > sg.hi) return;
          if (!pick || sg.hi - sg.lo < pick.hi - pick.lo) pick = sg;
        });
        const years = b.year - a.year;
        intervals.push({
          a: a, b: b, years: years, colour: pick ? pick.colour : TLX_GILT,
          label: '+' + tlxGroup(years) + (years === 1 ? ' YEAR' : ' YEARS')
        });
      }

      /* Brackets nest: the widest span takes the top line, and a span that
         overlaps one already placed drops a level. */
      const brackets = segs.filter((sg) => sg.b > sg.a).sort((x, y) => (y.b - y.a) - (x.b - x.a) || x.a - y.a);
      const levelEnds = [];
      brackets.forEach((sg) => {
        let level = 0;
        while (level < levelEnds.length && levelEnds[level] > sg.a) level += 1;
        levelEnds[level] = sg.b;
        sg.level = level;
      });
      const levels = Math.max(1, levelEnds.length);

      /* The entrance: one beat per interval, its length set by the years it
         covers, so the long stretch draws slower than the last week. A milestone
         arrives when the spine reaches it, and a bracket when its own end has. */
      const longest = intervals.reduce((best, iv) => (iv.years > best.years ? iv : best), intervals[0]);
      let clock = 0.15;
      intervals.forEach((iv) => {
        iv.t = clock;
        iv.dur = 0.35 + 0.5 * (iv.years / longest.years);
        clock += iv.dur;
        iv.arrive = clock;
      });
      miles.forEach((m, i) => { m.t = i === 0 ? 0.1 : intervals[i - 1].arrive; });
      brackets.forEach((sg) => {
        sg.t = intervals[sg.b - 1].arrive + 0.25;
        /* A caption may not run past the span it labels. The budget is that
           bracket's own width at the caption's type size, and the track's
           reference is dropped before the segment's own name is clipped — the
           panel below always prints the reference in full. */
        const width = Math.abs(miles[sg.b].x - miles[sg.a].x);
        const budget = Math.max(12, width / 14.4);
        const named = /[0-9]\s*:\s*[0-9]/.test(sg.head) || !sg.step.cite;
        const withCite = named ? sg.head : sg.head + ' · ' + sg.step.cite;
        sg.caption = withCite.length <= budget ? withCite : tlxClip(sg.head, budget);
      });

      /* Century marks on the longest stretch, at their due share of it. */
      let tickStep = 100;
      while (longest.years / tickStep > 22) tickStep *= 2;
      const ticks = [];
      for (let y = Math.ceil((longest.a.year + 1) / tickStep) * tickStep; y < longest.b.year; y += tickStep) {
        const f = (y - longest.a.year) / longest.years;
        ticks.push({ x: longest.a.x + (longest.b.x - longest.a.x) * f, t: longest.t + f * longest.dur });
      }

      /* The vertical rhythm is the reference's, tightened: the bracket stack, the
         badges, the spine and the three lines under each milestone. In column and
         full screen alike the whole diagram has to fit one plate, so the badge
         hangs just clear of the last bracket line and the lines under the spine
         sit at a 30-unit pitch. */
      const top = TLX_BRACKET_Y + (levels - 1) * TLX_LEVEL;
      const badgeY = top + 62;
      const spineY = badgeY + 82;
      const yearY = spineY + 60;
      const pitch = 30;
      miles.forEach((m) => {
        m.yearY = yearY;
        m.titleY = yearY + 40;
        m.refY = m.titleY + m.rows.length * pitch + 8;
      });
      const height = miles.reduce((deep, m) => Math.max(deep, m.refY), 0) + 22;

      /* The to-scale bar: the axis is split at the milestone that divides it most
         evenly, at that milestone's true proportion. The remaining cuts are
         hairlines, and the sum is the arithmetic the axis already carries. */
      let cut = null;
      miles.slice(1, -1).forEach((m) => {
        const left = m.year - start;
        const right = end - m.year;
        const even = Math.min(left, right);
        if (!cut || even > cut.even) cut = { m: m, even: even, left: left, right: right };
      });
      const marks = miles.slice(1, -1).map((m) => ({ m: m, pct: pctOf(m.year), main: !!cut && m === cut.m }));
      if (cut) marks.sort((a, b) => (b.main ? 1 : 0) - (a.main ? 1 : 0));

      return {
        miles: miles, segs: segs, intervals: intervals, brackets: brackets, ticks: ticks,
        start: start, end: end, span: span, axis: axis, cut: cut, marks: marks,
        cutPct: cut ? pctOf(cut.m.year) : null,
        badgeY: badgeY, spineY: spineY, height: height, levels: levels
      };
    }

    function bodyTimeline(spec, steps, canResolve) {
      const model = tlxModel(spec, steps);
      /* A timeline with no dated axis cannot be drawn on one. The tracks and their
         segments are still listed rather than dropped. */
      if (!model) {
        return '<div class="tlx"><ul class="tlx-plain">' + steps.map((step) => '<li>' +
          (step.role ? '<b>' + escapeStudy(step.role) + '</b> ' : '') +
          (step.title ? escapeStudy(step.title) + ' ' : '') +
          diagramCite(step.cite, canResolve) +
          (step.segments || []).map((sg) => '<span>' + escapeStudy(sg.label) + '</span>').join('') +
        '</li>').join('') + '</ul></div>';
      }
      const miles = model.miles;
      const last = miles.length - 1;

      /* --- the axis ------------------------------------------------------- */
      const parts = [];
      model.intervals.forEach((iv) => {
        parts.push('<path class="tlx-seg" pathLength="1" d="M' + iv.a.x + ' ' + model.spineY + 'H' + iv.b.x +
          '" style="--tlx-c:' + iv.colour + ';--tlx-t:' + iv.t.toFixed(2) + 's;--tlx-du:' + iv.dur.toFixed(2) + 's"/>');
      });
      /* Ticks are struck over the spine, as the reference draws them: they are the
         century marks of the long stretch, not a decoration underneath it. */
      model.ticks.forEach((tk) => {
        parts.push('<path class="tlx-tick" d="M' + tk.x.toFixed(1) + ' ' + (model.spineY - 12) + 'V' + (model.spineY + 12) +
          '" style="--tlx-t:' + tk.t.toFixed(2) + 's"/>');
      });
      model.brackets.forEach((sg) => {
        const y = TLX_BRACKET_Y + sg.level * TLX_LEVEL;
        const x1 = miles[sg.a].x;
        const x2 = miles[sg.b].x;
        parts.push('<g class="tlx-br" style="--tlx-c:' + sg.colour + ';--tlx-t:' + sg.t.toFixed(2) + 's">' +
          '<path class="tlx-br-line" pathLength="1" d="M' + x1 + ' ' + (y + 20) + 'V' + y + 'H' + x2 + 'V' + (y + 20) + '"/>' +
          '<text class="tlx-bt" x="' + ((x1 + x2) / 2).toFixed(1) + '" y="' + (y - 24) + '">' + escapeStudy(sg.caption) + '</text>' +
        '</g>');
      });
      model.intervals.forEach((iv) => {
        parts.push('<text class="tlx-dl" x="' + ((iv.a.x + iv.b.x) / 2).toFixed(1) + '" y="' + (model.spineY - 22) +
          '" style="--tlx-c:' + iv.colour + '">' + escapeStudy(iv.label) + '</text>');
      });
      miles.forEach((m, i) => {
        const isFinal = i === last;
        const dotR = isFinal ? 18 : 12;
        parts.push('<g class="tlx-nd' + (isFinal ? ' is-final' : '') + '" tabindex="0" role="button" aria-pressed="false"' +
          ' data-tlx-i="' + i + '" aria-label="' + escapeStudy(m.aria) + '"' +
          ' style="--tlx-c:' + m.colour + ';--tlx-t:' + m.t.toFixed(2) + 's">' +
          (isFinal ? '<circle class="tlx-ping" cx="' + m.x + '" cy="' + model.spineY + '" r="20"/>' : '') +
          '<circle class="tlx-bd" cx="' + m.x + '" cy="' + model.badgeY + '" r="25"/>' +
          '<g class="tlx-ico" transform="translate(' + (m.x - 12) + ' ' + (model.badgeY - 12) + ')"><path d="' + TLX_ICONS[m.icon] + '"/></g>' +
          '<path class="tlx-stem" d="M' + m.x + ' ' + (model.badgeY + 25) + 'V' + (model.spineY - 17) + '"/>' +
          '<circle class="tlx-foc" cx="' + m.x + '" cy="' + model.spineY + '" r="' + (dotR + 10) + '"/>' +
          '<circle class="tlx-halo" cx="' + m.x + '" cy="' + model.spineY + '" r="' + (dotR + 5) + '"/>' +
          '<circle class="tlx-dot" cx="' + m.x + '" cy="' + model.spineY + '" r="' + dotR + '"/>' +
          '<text class="tlx-yr" x="' + m.x + '" y="' + m.yearY + '">' + escapeStudy(m.label) + '</text>' +
          m.rows.map((row, k) => '<text class="tlx-tt" x="' + m.x + '" y="' + (m.titleY + k * 30) + '">' + escapeStudy(row) + '</text>').join('') +
          (m.ref ? '<text class="tlx-rf" x="' + m.x + '" y="' + m.refY + '">' + escapeStudy(m.ref) + '</text>' : '') +
        '</g>');
      });
      const svg = '<svg class="tlx-svg" viewBox="0 0 ' + TLX_W + ' ' + Math.round(model.height) + '"' +
        ' role="group" aria-label="' + escapeStudy('Timeline from ' + model.axis[0] + ' to ' + model.axis[1] + ': ' + miles.length + ' dated milestones') + '">' +
        parts.join('') + '</svg>';

      /* --- the legend ------------------------------------------------------ */
      const legend = '<div class="tlx-legend" role="group" aria-label="Milestones, colour coded">' +
        miles.map((m, i) => '<button type="button" class="tlx-lg" data-tlx-i="' + i + '" aria-pressed="false"' +
          ' style="--tlx-c:' + m.colour + ';--tlx-t:' + (m.t + 0.1).toFixed(2) + 's">' +
          '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="' + TLX_ICONS[m.icon] + '"/></svg>' +
          '<b>' + escapeStudy(m.label) + '</b><span>' + escapeStudy(m.title) + '</span>' +
        '</button>').join('') + '</div>';

      /* --- the two tracks the spec compares -------------------------------- */
      const tracks = '<ul class="tlx-tracks">' + steps.map((step) => {
        const first = model.segs.find((sg) => sg.step === step);
        return '<li class="tlx-track"' + (first ? ' style="--tlx-c:' + first.colour + '"' : '') + '>' +
          '<span class="tlx-track-dot" aria-hidden="true"></span>' +
          (step.role ? '<span class="tlx-track-role">' + escapeStudy(step.role) + '</span>' : '') +
          (step.title ? '<b>' + escapeStudy(step.title) + '</b>' : '') +
        '</li>';
      }).join('') + '</ul>';

      /* --- the to-scale bar ------------------------------------------------- */
      const scale = '<div class="tlx-scale">' +
        '<p class="tlx-scale-head">' +
          '<span>To scale</span>' +
          '<span>' + escapeStudy((model.cut ? tlxGroup(model.cut.left) + ' + ' + tlxGroup(model.cut.right) + ' = ' : '') + tlxGroup(model.span) + ' years') + '</span>' +
          '<span>Milestones above are evenly spaced; this bar is not</span>' +
        '</p>' +
        '<div class="tlx-scale-bar" aria-hidden="true" style="--tlx-cut:' + (model.cutPct === null ? 50 : model.cutPct.toFixed(2)) + '%">' +
          (model.cut
            ? '<i style="flex:' + model.cut.left + '"></i><i style="flex:' + model.cut.right + '"></i>'
            : '<i style="flex:' + model.span + '"></i>') +
          model.marks.map((mk) => '<span class="tlx-scale-mark' + (mk.main ? ' is-cut' : '') +
            '" style="left:' + mk.pct.toFixed(2) + '%"></span>').join('') +
          '<span class="tlx-scale-fill"></span>' +
        '</div>' +
        '<div class="tlx-scale-axis" aria-hidden="true">' +
          '<span style="left:0">' + escapeStudy(model.axis[0]) + '</span>' +
          /* Only the structural cut is named, and only when it is clear of the two
             end labels: on a 2,300-year axis A.D. 27, 31 and 34 fall within 0.3%
             of each other, so three labels would stack into one smudge, and a cut
             at 96.6% would sit on top of the closing date. The mark stays either
             way, and the head row prints the split as arithmetic. */
          model.marks.map((mk) => (mk.main && mk.pct > 8 && mk.pct < 92
            ? '<span style="left:' + mk.pct.toFixed(2) + '%">' + escapeStudy(mk.m.label) + '</span>' : '')).join('') +
          '<span style="right:0">' + escapeStudy(model.axis[1]) + '</span>' +
        '</div>' +
      '</div>';

      /* --- the panel, and one hidden slide per milestone -------------------- */
      const slide = (m, i) => '<div class="tlx-ph">' +
          '<span class="tlx-pib" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="' + TLX_ICONS[m.icon] + '"/></svg></span>' +
          '<div class="tlx-pid">' +
            '<p class="tlx-pmeta"><span class="tlx-pdate">' + escapeStudy(m.label) + '</span>' +
              (m.cite ? diagramCite(m.cite, canResolve)
                : (m.ref ? '<span class="chain-cite is-flat">' + escapeStudy(m.ref) + '</span>' : '')) +
            '</p>' +
            '<b class="tlx-ptitle">' + escapeStudy(m.title) + '</b>' +
          '</div>' +
        '</div>' +
        m.parts.map((pt) => '<p class="tlx-prow">' +
          (pt.kicker ? '<span class="tlx-pk">' + escapeStudy(pt.kicker) + '</span>' : '') +
          '<span class="tlx-pl">' + escapeStudy(pt.label) + '</span></p>').join('') +
        '<div class="tlx-pn">' +
          '<button type="button" class="tlx-pbtn" data-tlx-step="-1"' + (i === 0 ? ' disabled' : '') + '>Previous</button>' +
          '<span class="tlx-pnum">' + (i + 1) + ' OF ' + miles.length + '</span>' +
          '<button type="button" class="tlx-pbtn" data-tlx-step="1"' + (i === last ? ' disabled' : '') + '>Next</button>' +
        '</div>';
      const slides = miles.map((m, i) => '<div data-tlx-slide="' + i + '">' + slide(m, i) + '</div>').join('');

      return '<div class="tlx" data-tlx>' +
        '<div class="tlx-plot">' + svg + '</div>' +
        legend +
        tracks +
        scale +
        '<section class="tlx-panel" aria-live="polite" data-tlx-panel style="--tlx-c:' + miles[0].colour + '">' +
          slide(miles[0], 0) + '</section>' +
        '<div class="tlx-src" hidden>' + slides + '</div>' +
      '</div>';
    }

    function wireFigure(state) {
      // Shared shell: caption, collapse control, entrance animation, replay.
      // `figure` carries data-chain itself, so it is passed in rather than
      // queried for — querySelector only searches descendants.
      const figure = state.figure;
      const panel = figure.querySelector('.chain-body');
      const toggle = figure.querySelector('.chain-toggle');
      const replay = state.replay || figure.parentNode.querySelector('[data-chain-replay]');
      if (!figure || !panel || !toggle || !replay) return;

      const reduce = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
      const raf = window.requestAnimationFrame ? window.requestAnimationFrame.bind(window) : (cb) => setTimeout(cb, 16);
      const caf = window.cancelAnimationFrame ? window.cancelAnimationFrame.bind(window) : window.clearTimeout;
      let frame = 0;
      let started = false;

      const play = () => {
        if (reduce && reduce.matches) { figure.classList.add('is-visible'); return; }
        figure.classList.remove('is-visible');
        caf(frame);
        // Double rAF guarantees a style flush without forcing a sync layout.
        frame = raf(() => { frame = raf(() => figure.classList.add('is-visible')); });
      };
      const start = () => { if (started) return; started = true; play(); };
      const setOpen = (open) => {
        toggle.setAttribute('aria-expanded', String(open));
        toggle.setAttribute('aria-label', open ? 'Collapse diagram' : 'Expand diagram');
        panel.hidden = !open;
      };

      if (figure.getBoundingClientRect().top < window.innerHeight * 0.9) start();
      else if ('IntersectionObserver' in window) {
        const io = new IntersectionObserver((entries) => {
          if (entries[0].isIntersecting) { io.disconnect(); start(); }
        }, { rootMargin: '0px 0px -15% 0px', threshold: 0 });
        io.observe(figure);
      } else start();

      toggle.addEventListener('click', () => {
        // A host that owns the collapse control itself — a flow, whose scene
        // reader lives inside the panel, so wireStory() has already wired that
        // button — keeps this shell for the entrance animation only: expanding
        // the panel replays the rail.
        if (state.ownsToggle === true) {
          if (toggle.getAttribute('aria-expanded') === 'true') play();
          return;
        }
        const open = toggle.getAttribute('aria-expanded') !== 'false';
        setOpen(!open);
        if (!open) { started = true; play(); }
      });
      replay.addEventListener('click', () => { setOpen(true); started = true; play(); });
    }

    /* A flow's scenes. Each step opens the course's existing full-screen reader
       on its own card — `wireStory` builds that reader and exposes the one way
       in, so nothing here draws a second overlay — and a chain that continues a
       node from the diagram before it starts its sweep there rather than
       replaying the beats the reader has just seen. */
    function wireFlow(figure) {
      const stack = figure.querySelector('.flow-stack');
      const steps = Array.from(figure.querySelectorAll('.flow-step'));
      const openScene = figure.__openStoryScene;
      if (!stack || !steps.length || typeof openScene !== 'function') return;

      steps.forEach((node) => {
        const index = Number(node.getAttribute('data-index'));
        if (!Number.isFinite(index)) return;
        const marker = node.querySelector('.flow-node');
        node.addEventListener('click', (event) => {
          // The citation chip is its own control, exactly as it is on a story card.
          if (event.target.closest && event.target.closest('.chain-cite')) return;
          // The reader hands focus back to whatever held it when it opened, so
          // the step's own marker takes focus first and Escape returns here.
          if (marker && typeof marker.focus === 'function') marker.focus({ preventScroll: true });
          openScene(index);
        });
      });

      // Where the highlight enters: a percentage of the rail, measured once the
      // stack has a height, so a later reflow cannot leave it stranded.
      const enter = Number(stack.getAttribute('data-flow-enter'));
      const from = Number.isFinite(enter) && enter > 0 ? steps[enter] : null;
      const marker = from ? from.querySelector('.flow-node') : null;
      if (from && marker && stack.offsetHeight) {
        const centre = from.offsetTop + marker.offsetTop + marker.offsetHeight / 2;
        stack.style.setProperty('--flow-from', ((centre / stack.offsetHeight) * 100).toFixed(1) + '%');
      }
    }

    /* The timeline's one selection, in the three places it shows: a node on the
       axis, a pill in the legend, and the panel's Previous/Next. All three call
       `select`, so the ringed dot, the pill's state, `aria-pressed` and the
       panel's words cannot disagree.

       Each milestone's panel is rendered once as a hidden slide and moved into
       the live region, which keeps one copy of the escaping and lets the citation
       chips inside it be decorated with the rest of the figure.

       Escape is deliberately not handled here. The full-screen shell listens on
       the document in the capture phase, so its own arbitration (a reader above
       the layer keeps the key) runs first and this never sees it. */
    function wireTimeline(figure) {
      const root = figure.querySelector('[data-tlx]');
      if (!root) return;
      const panel = root.querySelector('[data-tlx-panel]');
      const nodes = Array.from(root.querySelectorAll('.tlx-nd'));
      const pills = Array.from(root.querySelectorAll('.tlx-lg'));
      const slides = Array.from(root.querySelectorAll('[data-tlx-slide]'));
      if (!panel || !nodes.length || slides.length !== nodes.length) return;

      let current = -1;
      const select = (index, focus) => {
        const next = Math.max(0, Math.min(nodes.length - 1, index));
        const node = nodes[next];
        if (next !== current) {
          const slide = slides[next];
          if (slide) panel.innerHTML = slide.innerHTML;
          // The panel's own edge takes the selected milestone's colour, which is
          // the same inline token the axis node and its legend pill carry.
          const colour = node && node.style ? node.style.getPropertyValue('--tlx-c').trim() : '';
          if (colour) panel.style.setProperty('--tlx-c', colour);
          current = next;
        }
        nodes.forEach((item, i) => {
          const on = i === next;
          item.classList.toggle('is-sel', on);
          item.setAttribute('aria-pressed', String(on));
        });
        pills.forEach((pill, i) => {
          const on = i === next;
          pill.classList.toggle('is-sel', on);
          pill.setAttribute('aria-pressed', String(on));
        });
        if (focus && node && typeof node.focus === 'function') node.focus({ preventScroll: true });
      };

      root.addEventListener('click', (event) => {
        const hit = event.target && event.target.closest ? event.target.closest('[data-tlx-i]') : null;
        if (!hit) return;
        select(Number(hit.getAttribute('data-tlx-i')), false);
      });
      panel.addEventListener('click', (event) => {
        const btn = event.target && event.target.closest ? event.target.closest('[data-tlx-step]') : null;
        if (!btn || btn.disabled) return;
        select(current + Number(btn.getAttribute('data-tlx-step')), false);
      });
      nodes.forEach((node, i) => {
        node.addEventListener('keydown', (event) => {
          const key = event.key;
          if (key === 'Enter' || key === ' ' || key === 'Spacebar') {
            event.preventDefault();
            select(i, false);
          } else if (key === 'ArrowRight' || key === 'ArrowDown') {
            event.preventDefault();
            select(i + 1, true);
          } else if (key === 'ArrowLeft' || key === 'ArrowUp') {
            event.preventDefault();
            select(i - 1, true);
          } else if (key === 'Home') {
            event.preventDefault();
            select(0, true);
          } else if (key === 'End') {
            event.preventDefault();
            select(nodes.length - 1, true);
          }
        });
      });

      // The panel's first slide is already in the markup, so the opening state is
      // the same whether or not this ran; this only marks the node and the pill.
      select(0, false);
    }

    function storySrc(step) {
      const src = String(step && step.image || '');
      return /^assets\/study\/diagrams\/[a-z0-9-]+\.jpg$/.test(src) ? src : '';
    }

    // How many artwork layers the reader keeps. One behind the other is enough
    // for a single step change; a third keeps a fast run of steps from snapping
    // a layer's source out from under a fade that is still running.
    const STORY_PHOTO_LAYERS = 3;

    function bodyStory(spec, steps, canResolve, start, diagramId) {
      const n = steps.length;
      const storyTitle = String(spec.title || 'The story');
      // Where the artwork is cropped. A movement's subject is rarely dead
      // centre — a figure sits low in the frame and a cross sits high — so the
      // default lets the crop drift down the story instead of holding one
      // framing for every picture. A step can declare its own `photoY`.
      const DEFAULT_PHOTO_Y = ['48%', '47%', '45%'];
      const photoYFor = (step, i) => {
        const declared = String(step.photoY || '').trim();
        if (/^\d{1,3}%$/.test(declared)) return declared;
        if (n === 1) return '46%';
        return DEFAULT_PHOTO_Y[Math.round((i * (DEFAULT_PHOTO_Y.length - 1)) / (n - 1))];
      };
      // The edge controls and the panel they open need ids that are unique per
      // diagram: several story figures can sit in one sitting.
      const slug = escapeStudy(diagramId || 'story');
      const bridgeId = slug + '-bridge';
      const helpId = slug + '-keyboard-help';
      const cards = steps.map((step, i) => {
        const src = storySrc(step);
        const photo = src
          ? '<img class="story-photo" src="' + escapeStudy(src) + '" alt="' + escapeStudy(step.alt || '') + '">' +
            '<div class="story-wash" aria-hidden="true"></div>'
          : '';
        const medal = (!src && step.centre)
          ? '<div class="story-medal" aria-hidden="true"><svg viewBox="0 0 140 140" fill="none" stroke="currentColor"><circle cx="70" cy="70" r="58" stroke-width="1.2"/><path d="M70 36V106M51 58H89" stroke-width="3.5" stroke-linecap="round"/></svg></div>'
          : '';
        const num = String(i + 1).padStart(2, '0') + ' / ' + String(n).padStart(2, '0');
        const d = i - start;
        return '<article class="story-card' + (i === start ? ' is-active' : '') + '" data-index="' + i + '" style="--d:' + d + ';--distance:' + Math.abs(d) + ';--photo-y:' + photoYFor(step, i) + '">' +
          photo +
          // The label repeats the diagram's title on every card, so it is kept
          // out of the reading order; the index is the part that moves.
          '<div class="story-topline"><span class="story-label" aria-hidden="true">' + escapeStudy(storyTitle) + '</span><span class="story-index">' + num + '</span></div>' +
          '<div class="story-content">' +
            medal +
            (step.role ? '<p class="story-kicker">' + escapeStudy(step.role) + '</p>' : '') +
            (step.title ? '<h4 class="story-title">' + escapeStudy(step.title) + '</h4>' : '') +
            diagramCite(step.cite, canResolve) +
            (step.text ? '<p class="story-text">' + escapeStudy(step.text) + '</p>' : '') +
            (step.detail ? '<p class="story-detail">' + escapeStudy(step.detail) + '</p>' : '') +
          '</div>' +
        '</article>';
      }).join('');
      const track = steps.map((step, i) => {
        const label = String(step.role || step.title || ('Step ' + (i + 1)));
        // The link copy is authored on the step that leaves it: `bridgeAhead` is
        // what this movement says about the next one, `bridgeShare` is what the
        // two hold in common. It rides on the step so the panel never invents a
        // connection the diagram does not make.
        const ahead = step.bridgeAhead ? ' data-bridge-ahead="' + escapeStudy(step.bridgeAhead) + '"' : '';
        const share = step.bridgeShare ? ' data-bridge-share="' + escapeStudy(step.bridgeShare) + '"' : '';
        return '<button class="story-step' + (i === start ? ' is-active' : '') + '" type="button" data-index="' + i + '"' + ahead + share + ' aria-label="' + escapeStudy(label) + '">' +
          '<span class="story-step-dot" aria-hidden="true"></span>' +
          '<span class="story-step-label">' + escapeStudy(label) + '</span>' +
        '</button>';
      }).join('<span class="story-connector" aria-hidden="true"></span>');
      const openTitle = String((steps[start] && steps[start].title) || '');
      // Paging arrows at the viewport's edges. Each is hidden while there is no
      // movement that way, and each opens the panel describing the link.
      const edgeControls =
        '<button class="story-link story-link--prev" type="button" data-story-link-prev hidden aria-expanded="false" aria-controls="' + bridgeId + '">' +
          '<span class="story-link-arrow" aria-hidden="true"><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M10 3 5 8l5 5"/></svg></span>' +
          '<span class="story-link-label"></span>' +
        '</button>' +
        '<button class="story-link story-link--next" type="button" data-story-link-next hidden aria-expanded="false" aria-controls="' + bridgeId + '">' +
          '<span class="story-link-arrow" aria-hidden="true"><svg viewBox="0 0 16 16" aria-hidden="true"><path d="m6 3 5 5-5 5"/></svg></span>' +
          '<span class="story-link-label"></span>' +
        '</button>';
      const bridge =
        '<div class="story-bridge" id="' + bridgeId + '" hidden>' +
          '<div class="story-bridge-top">' +
            '<p class="story-bridge-title" data-bridge-title></p>' +
            '<p class="story-bridge-dir" data-bridge-dir></p>' +
          '</div>' +
          '<p class="story-bridge-share" data-bridge-share hidden></p>' +
          '<p class="story-bridge-text" data-bridge-text hidden></p>' +
          '<div class="story-bridge-actions">' +
            '<button type="button" data-bridge-close>Close</button>' +
            '<button type="button" data-bridge-go></button>' +
          '</div>' +
        '</div>';
      return '<div class="story-stage" data-start="' + start + '">' +
        '<div class="story-viewport" tabindex="0" role="region" aria-roledescription="carousel" aria-label="' + escapeStudy(spec.title || 'Diagram') + '" aria-describedby="' + helpId + '">' +
          cards +
          edgeControls +
          bridge +
        '</div>' +
        '<p class="sr-only" id="' + helpId + '">Use the left and right arrow keys to move between story movements.</p>' +
        '<div class="story-controls">' +
          '<button class="story-nav" type="button" data-story-prev aria-label="Previous story movement">' +
            '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M10 3 5 8l5 5"/></svg>' +
          '</button>' +
          '<div class="story-track">' + track + '</div>' +
          '<button class="story-nav" type="button" data-story-next aria-label="Next story movement">' +
            '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="m6 3 5 5-5 5"/></svg>' +
          '</button>' +
        '</div>' +
        '<div class="story-utility">' +
          '<p class="story-live" aria-live="polite">Movement ' + (start + 1) + ' of ' + n + (openTitle ? ' \u00b7 ' + escapeStudy(openTitle) : '') + '</p>' +
          '<div class="story-actions">' +
            '<button class="story-play" type="button" aria-pressed="false">' +
              '<svg viewBox="0 0 16 16" aria-hidden="true"><path class="story-icon-play" d="M4 2.5 13 8l-9 5.5z"/><path class="story-icon-pause" d="M3 2h3.2v12H3zM9.8 2H13v12H9.8z"/></svg>' +
              '<span class="story-play-label">Play the story</span>' +
            '</button>' +
            '<button class="story-fullscreen" type="button">Full screen</button>' +
          '</div>' +
        '</div>' +
        '<div class="story-read" hidden role="dialog" aria-modal="true" aria-label="' + escapeStudy(spec.title || 'Story') + '">' +
          '<div class="story-read-bg" aria-hidden="true"></div>' +
          '<div class="story-read-photos" aria-hidden="true">' +
            '<img class="story-read-photo" alt="" decoding="async">'.repeat(STORY_PHOTO_LAYERS) +
          '</div>' +
          '<div class="story-read-veil" aria-hidden="true"></div>' +
          '<button class="story-back" type="button">Back</button>' +
          '<div class="story-read-frame">' +
            '<div class="story-read-deck"></div>' +
            // The study layer under the zoomed card: the movement's own line and
            // its citation chip, filled per movement by wireStory().
            '<div class="story-read-band" data-read-band></div>' +
            '<p class="story-read-note"></p>' +
            '<div class="story-read-progress" role="group" aria-label="Movements in this diagram"></div>' +
            '<div class="story-read-nav">' +
              '<button type="button" data-read-prev>Previous</button>' +
              '<p class="story-read-count"></p>' +
              '<button type="button" data-read-next>Next</button>' +
            '</div>' +
            '<p class="story-read-hint">Arrow keys move between movements. Escape closes.</p>' +
          '</div>' +
        '</div>' +
      '</div>';
    }

    function wireStory(figure) {
      const panel = figure.querySelector('.chain-body');
      const toggle = figure.querySelector('.chain-toggle');
      const stage = figure.querySelector('.story-stage');
      const viewport = figure.querySelector('.story-viewport');
      const cards = Array.from(figure.querySelectorAll('.story-card'));
      const steps = Array.from(figure.querySelectorAll('.story-step'));
      const prev = figure.querySelector('[data-story-prev]');
      const next = figure.querySelector('[data-story-next]');
      const play = figure.querySelector('.story-play');
      const playLabel = figure.querySelector('.story-play-label');
      const live = figure.querySelector('.story-live');
      const launch = figure.querySelector('.story-fullscreen');
      const reader = figure.querySelector('.story-read');
      const readBg = figure.querySelector('.story-read-bg');
      const readPhotos = Array.from(figure.querySelectorAll('.story-read-photo'));
      const deck = reader ? reader.querySelector('.story-read-deck') : null;
      const readBand = figure.querySelector('[data-read-band]');
      const readNote = figure.querySelector('.story-read-note');
      const readProgress = figure.querySelector('.story-read-progress');
      const readCount = figure.querySelector('.story-read-count');
      const readPrev = figure.querySelector('[data-read-prev]');
      const readNext = figure.querySelector('[data-read-next]');
      const readBack = figure.querySelector('.story-back');
      if (!panel || !toggle || !stage || !viewport || cards.length < 2 || !prev || !next || !play || !live || !launch || !reader || !deck) return;

      // The full screen is the same cards, larger. Clones stay in the reader so
      // the lesson stage underneath does not move when the overlay opens.
      const readCards = cards.map((card) => {
        const clone = card.cloneNode(true);
        clone.classList.remove('is-active');
        clone.removeAttribute('aria-current');
        deck.appendChild(clone);
        return clone;
      });

      let current = Number(stage.getAttribute('data-start')) || 0;
      if (current < 0 || current >= cards.length) current = 0;
      // The live region is rewritten only when the movement actually changes:
      // `render()` also runs on every autoplay beat, and re-announcing the same
      // sentence would talk over the reader.
      let liveIndex = current;
      let timer = null;
      let pointerStartX = null;
      let returnFocus = null;
      let closeTimer = 0;
      let openFrame = 0;
      let shiftFrame = 0;
      let retireTimer = 0;
      // Artwork layers are reused round-robin; `photoZ` keeps the newest one on
      // top so an older fade can finish underneath it without a source swap.
      let photoCursor = 0;
      let photoZ = 0;

      const titleOf = (index) => {
        const card = cards[index];
        const heading = card && card.querySelector('.story-title');
        return heading ? heading.textContent : '';
      };
      const stopPlayback = () => {
        if (timer !== null) window.clearInterval(timer);
        timer = null;
        play.setAttribute('aria-pressed', 'false');
        if (playLabel) playLabel.textContent = 'Play the story';
      };
      // The handover between two movements. A stage carries an arrow at each
      // edge; the panel they open names the two movements and, when the diagram
      // authors it, what the two share and what the step leaving the first one
      // says about the second. With no authored copy the panel still names the
      // movements and offers the move — it never invents a connection.
      const edgePrev = figure.querySelector('[data-story-link-prev]');
      const edgeNext = figure.querySelector('[data-story-link-next]');
      const bridge = figure.querySelector('.story-bridge');
      const bridgeTitle = figure.querySelector('[data-bridge-title]');
      const bridgeDir = figure.querySelector('[data-bridge-dir]');
      const bridgeShare = figure.querySelector('[data-bridge-share]');
      const bridgeText = figure.querySelector('[data-bridge-text]');
      const bridgeGo = figure.querySelector('[data-bridge-go]');
      const bridgeClose = figure.querySelector('[data-bridge-close]');
      // Optional furniture: a story markup without the edge controls still wires.
      const hasEdges = !!(edgePrev && edgeNext && bridge && bridgeGo);
      // 0 while the panel is closed, otherwise the direction that opened it.
      let bridgeDirOpen = 0;
      let bridgeOpener = null;

      const nameOf = (index) => {
        const step = steps[index];
        const label = step && step.querySelector('.story-step-label');
        return label ? label.textContent : '';
      };
      // The link a direction describes: `bridgeAhead` / `bridgeShare` belong to
      // the step that leaves it, so both directions read the same authored link.
      const linkFor = (dir) => {
        const link = dir > 0 ? current : current - 1;
        const step = steps[link];
        return {
          target: dir > 0 ? link + 1 : link,
          targetName: dir > 0 ? nameOf(link + 1) : nameOf(link),
          from: nameOf(link),
          reach: nameOf(link + 1),
          share: step ? (step.getAttribute('data-bridge-share') || '') : '',
          // `bridgeAhead` is the forward explanation. There is no authored
          // backward copy, so looking back shows the link without one rather
          // than reusing the forward sentence out of turn.
          ahead: dir > 0 && step ? (step.getAttribute('data-bridge-ahead') || '') : '',
        };
      };
      function onDocumentClick(event) {
        if (!hasEdges || bridge.hidden) return;
        const target = event.target;
        if (!target || !target.closest) return;
        // Only this stage's own panel and arrows count as inside; a press
        // anywhere else — including another diagram's edge control — closes it.
        if (bridge.contains(target) || edgePrev.contains(target) || edgeNext.contains(target)) return;
        closeBridge(false);
      }
      function onBridgeKey(event) {
        if (!hasEdges || bridge.hidden) return;
        if (event.key !== 'Escape') return;
        // The reader owns Escape while it is open (it closes this panel first),
        // and a layer stacked above owns it while that layer is open.
        if (!reader.hidden || anotherLayerOwnsEscape()) return;
        event.preventDefault();
        event.stopPropagation();
        closeBridge(true);
      }
      const closeBridge = (refocus) => {
        if (!hasEdges) return;
        document.removeEventListener('click', onDocumentClick);
        document.removeEventListener('keydown', onBridgeKey, true);
        if (bridge.hidden) return;
        bridge.hidden = true;
        bridgeDirOpen = 0;
        edgePrev.setAttribute('aria-expanded', 'false');
        edgeNext.setAttribute('aria-expanded', 'false');
        const opener = bridgeOpener;
        bridgeOpener = null;
        if (refocus && opener && opener.isConnected) opener.focus();
      };
      const openBridge = (dir) => {
        if (!hasEdges) return;
        // A second press on the same arrow closes the panel it opened.
        if (bridgeDirOpen === dir && !bridge.hidden) { closeBridge(true); return; }
        stopPlayback();
        const link = linkFor(dir);
        if (!link.from || !link.reach) return;
        bridgeTitle.textContent = link.from + ' \u2192 ' + link.reach;
        bridgeDir.textContent = dir > 0 ? 'Looking ahead' : 'Looking back';
        bridgeShare.textContent = link.share ? 'Shared thread: ' + link.share : '';
        bridgeShare.hidden = !link.share;
        bridgeText.textContent = link.ahead;
        bridgeText.hidden = !link.ahead;
        bridgeGo.textContent = 'Go to ' + link.targetName;
        bridgeGo.setAttribute('data-bridge-target', String(link.target));
        bridge.hidden = false;
        bridgeDirOpen = dir;
        bridgeOpener = dir > 0 ? edgeNext : edgePrev;
        edgePrev.setAttribute('aria-expanded', String(dir < 0));
        edgeNext.setAttribute('aria-expanded', String(dir > 0));
        // The listeners exist only while the panel is open, so they cannot leak
        // when a sitting is re-rendered.
        document.addEventListener('click', onDocumentClick);
        document.addEventListener('keydown', onBridgeKey, true);
        bridgeGo.focus();
      };
      const updateEdges = () => {
        if (!hasEdges) return;
        // The panel describes one link; a movement change ends that link.
        closeBridge(false);
        edgePrev.hidden = current === 0;
        edgeNext.hidden = current === cards.length - 1;
        const prevLabel = edgePrev.querySelector('.story-link-label');
        const nextLabel = edgeNext.querySelector('.story-link-label');
        const prevName = nameOf(current - 1) || 'Previous movement';
        const nextName = nameOf(current + 1) || 'Next movement';
        if (prevLabel) prevLabel.textContent = prevName;
        if (nextLabel) nextLabel.textContent = nextName;
        edgePrev.setAttribute('aria-label', 'Previous movement: ' + prevName);
        edgeNext.setAttribute('aria-label', 'Next movement: ' + nextName);
      };
      const render = () => {
        const paint = (card, index) => {
          const distance = Math.abs(index - current);
          card.style.setProperty('--d', String(index - current));
          card.style.setProperty('--distance', String(distance));
          card.classList.toggle('is-active', index === current);
          card.style.pointerEvents = distance > 1 ? 'none' : 'auto';
          if (index === current) card.setAttribute('aria-current', 'true');
          else card.removeAttribute('aria-current');
        };
        cards.forEach(paint);
        readCards.forEach(paint);
        steps.forEach((step, index) => {
          step.classList.toggle('is-active', index === current);
          if (index === current) step.setAttribute('aria-current', 'step');
          else step.removeAttribute('aria-current');
        });
        // A movement that has been visited keeps its mark, so the track carries
        // the trail of where the reader has already been.
        if (steps[current]) steps[current].classList.add('seen');
        prev.disabled = current === 0;
        next.disabled = current === cards.length - 1;
        if (current !== liveIndex) {
          liveIndex = current;
          const movementTitle = titleOf(current);
          live.textContent = 'Movement ' + (current + 1) + ' of ' + cards.length + (movementTitle ? ' \u00b7 ' + movementTitle : '');
        }
        updateEdges();
      };
      // The artwork is the subject of a movement, so a step change fades the
      // next picture up over the one still on screen. `prime` places the first
      // layer without animating, for the moment the reader opens.
      //
      // The outgoing layer keeps `is-current` until the incoming fade has
      // finished. Dropping it in the same turn as the new layer arrives makes
      // both pictures half-transparent at once, and the ground shows through.
      // A token throws away a load that resolves after the reader has moved on.
      let photoSeq = 0;
      const refreshHasPhoto = () => {
        const any = readPhotos.some((layer) => !!layer.getAttribute('src'));
        reader.classList.toggle('has-photo', any);
      };
      const retireOthers = (keep, token) => {
        if (token !== photoSeq) return;
        readPhotos.forEach((other) => { if (other !== keep) other.classList.remove('is-current'); });
      };
      const setPhoto = (src, prime) => {
        if (!readPhotos.length) return;
        window.clearTimeout(retireTimer);
        retireTimer = 0;
        if (!src) {
          photoSeq += 1;
          readPhotos.forEach((layer) => {
            layer.classList.remove('is-current');
            layer.removeAttribute('src');
            layer.style.transition = '';
          });
          readBg.style.backgroundImage = '';
          refreshHasPhoto();
          return;
        }
        photoSeq += 1;
        const token = photoSeq;
        photoZ += 1;
        let layer = readPhotos[photoCursor % readPhotos.length];
        photoCursor += 1;
        // Reusing the picture that is on screen would fade that picture out
        // before the next one has anything to cover it.
        if (layer.classList.contains('is-current')) {
          const idle = readPhotos.find((item) => !item.classList.contains('is-current'));
          if (idle) layer = idle;
        }
        layer.style.setProperty('--photo-z', String(photoZ));
        if (!layer.classList.contains('is-current')) {
          layer.style.transition = 'none';
          layer.classList.remove('is-current');
        }
        let armed = false;
        const reveal = () => {
          if (armed) return;
          armed = true;
          if (token !== photoSeq) {
            layer.style.transition = '';
            refreshHasPhoto();
            return;
          }
          readBg.style.backgroundImage = 'url("' + src + '")';
          refreshHasPhoto();
          if (prime) {
            layer.style.transition = 'none';
            layer.classList.add('is-current');
            void layer.offsetWidth;
            layer.style.transition = '';
            retireOthers(layer, token);
            return;
          }
          // Opacity has to be committed at 0 on one frame and raised on a
          // later one. Clearing the inline transition and adding `is-current`
          // in the same turn lets the browser skip the fade and cut.
          layer.style.transition = 'none';
          layer.classList.remove('is-current');
          void layer.offsetWidth;
          window.requestAnimationFrame(() => {
            if (token !== photoSeq) return;
            layer.style.transition = '';
            window.requestAnimationFrame(() => {
              if (token !== photoSeq) return;
              layer.classList.add('is-current');
              const done = (event) => {
                if (event.target !== layer || event.propertyName !== 'opacity') return;
                if (token !== photoSeq) return;
                layer.removeEventListener('transitionend', done);
                window.clearTimeout(retireTimer);
                retireTimer = 0;
                retireOthers(layer, token);
              };
              layer.addEventListener('transitionend', done);
              retireTimer = window.setTimeout(() => {
                layer.removeEventListener('transitionend', done);
                retireOthers(layer, token);
              }, 1600);
            });
          });
        };
        layer.addEventListener('error', () => {
          if (token !== photoSeq) return;
          armed = true;
          layer.removeAttribute('src');
          layer.style.transition = '';
          layer.classList.remove('is-current');
          refreshHasPhoto();
        }, { once: true });
        layer.setAttribute('src', src);
        refreshHasPhoto();
        if (layer.complete && layer.naturalWidth) reveal();
        else {
          layer.addEventListener('load', reveal, { once: true });
          // A cached frame can report complete before its pixels are ready, and
          // a slow one only becomes ready on load. Either path may arm the fade;
          // the second call is ignored.
          if (typeof layer.decode === 'function') layer.decode().then(reveal).catch(() => {});
        }
      };

      const buildProgress = () => {
        if (!readProgress) return;
        readProgress.replaceChildren();
        if (cards.length < 2) { readProgress.hidden = true; return; }
        readProgress.hidden = false;
        cards.forEach((card, index) => {
          const pip = document.createElement('button');
          pip.type = 'button';
          pip.className = 'story-read-pip';
          pip.setAttribute('data-read-pip', String(index));
          const heading = card.querySelector('.story-title');
          const label = (card.querySelector('.story-kicker') || {}).textContent || (heading ? heading.textContent : '');
          pip.setAttribute('aria-label', 'Movement ' + (index + 1) + (label ? ': ' + label : ''));
          if (index === current) { pip.classList.add('is-active'); pip.setAttribute('aria-current', 'true'); }
          readProgress.appendChild(pip);
        });
      };

      // The band under the deck is the reader's study layer: the movement's own
      // line, in the reference's note treatment, and its citation chip as a real
      // control. Both are read off the movement's own card, so the band can only
      // ever show what the diagram says. The content is rebuilt on every change,
      // and a freshly inserted element runs its entry animation again — no state
      // class to add, and none left in the CSS that nothing sets.
      const fillBand = () => {
        if (!readBand) return;
        const card = cards[current];
        const detail = card && card.querySelector('.story-detail');
        const cite = card && card.querySelector('.chain-cite');
        if (!detail && !cite) { readBand.replaceChildren(); return; }
        const inner = document.createElement('div');
        inner.className = 'story-read-band-inner';
        if (cite) {
          const line = document.createElement('p');
          line.className = 'story-read-band-cite';
          line.appendChild(cite.cloneNode(true));
          inner.appendChild(line);
        }
        if (detail) {
          const block = document.createElement('p');
          block.className = 'story-read-band-detail';
          block.textContent = detail.textContent;
          inner.appendChild(block);
        }
        readBand.replaceChildren(inner);
      };
      const fillRead = () => {
        const card = cards[current];
        const note = figure.querySelector('.chain-note');
        const img = card.querySelector('.story-photo');
        readNote.textContent = note ? note.textContent : '';
        readNote.hidden = !note;
        fillBand();
        const src = img && img.getAttribute('src') ? img.getAttribute('src') : '';
        setPhoto(src, !reader.classList.contains('has-photo'));
        readCount.textContent = (current + 1) + ' of ' + cards.length;
        readPrev.disabled = current === 0;
        readNext.disabled = current === cards.length - 1;
        if (readProgress) {
          Array.from(readProgress.querySelectorAll('.story-read-pip')).forEach((pip, index) => {
            pip.classList.toggle('is-active', index === current);
            if (index === current) pip.setAttribute('aria-current', 'true');
            else pip.removeAttribute('aria-current');
          });
        }
      };
      // One reader is open at a time, so only the reader that opened last keeps
      // the global key listener attached. It runs in the capture phase, so
      // stopping propagation here keeps the page's own Ctrl/Cmd+Arrow sitting
      // navigation from firing on the same press, and keeps the page's Escape
      // handling from firing behind the overlay.
      // Layers the page can stack above the reader. Each runs its own Escape
      // handler on the document, so the reader has to stand down while one is
      // open rather than stopping propagation ahead of it.
      const ABOVE_READER = '#infographic-modal, #certificate-panel, #certificate-review-modal';
      /* A full-screen diagram is a layer the reader can be opened from and above
         — a citation chip in a comparison column opens a reference row, which is
         the reader. It therefore joins the list rather than stopping Escape
         ahead of it, so one press closes exactly one thing: the reader first,
         then the diagram on the next press. */
      function anotherLayerOwnsEscape() {
        if (document.querySelector('.chain.is-full')) return true;
        return Array.from(document.querySelectorAll(ABOVE_READER)).some((el) => !el.hidden);
      }
      function onDocumentKey(event) {
        if (reader.hidden) return;
        if (document.body.lastElementChild !== reader) return;
        const nav = event.key === 'ArrowRight' || event.key === 'ArrowLeft';
        const close = event.key === 'Escape';
        if (!nav && !close) return;
        // A layer stacked above the reader keeps its own Escape.
        if (close && anotherLayerOwnsEscape()) return;
        event.preventDefault();
        event.stopPropagation();
        if (close) {
          // The panel belongs to the stage behind the reader. Escape steps back
          // one layer at a time: the panel first, the reader on the next press.
          if (hasEdges && !bridge.hidden) { closeBridge(true); return; }
          closeRead();
          return;
        }
        go(current + (event.key === 'ArrowRight' ? 1 : -1), true);
      }
      const clearShiftTimer = () => {
        window.cancelAnimationFrame(shiftFrame);
        shiftFrame = 0;
      };
      const closeRead = () => {
        if (reader.hidden) return;
        window.clearTimeout(closeTimer);
        window.cancelAnimationFrame(openFrame);
        document.removeEventListener('keydown', onDocumentKey, true);
        reader.classList.remove('is-open');
        // A fade still in flight must not finish onto a reader that is closing,
        // or onto the next one the visitor opens.
        photoSeq += 1;
        window.clearTimeout(retireTimer);
        retireTimer = 0;
        // Stop the panel's entry animation from being re-armed on the way out.
        clearShiftTimer();
        // The overlay is faded, not cut: hide it once the fade has run. A timer
        // backs up the transition event, which a hidden tab will never deliver.
        // `is-closing` marks the fade-out in flight: a reopen clears it, so a
        // late transitionend or timer can never hide an overlay the reader has
        // already opened again.
        reader.classList.add('is-closing');
        const finish = () => {
          if (!reader.classList.contains('is-closing')) return;
          reader.classList.remove('is-closing');
          reader.removeEventListener('transitionend', onEnd);
          reader.hidden = true;
          reader.classList.remove('is-open', 'has-photo');
          // Drop the artwork so the next open fades its own movement up from
          // the dark ground instead of showing the last one's still.
          readPhotos.forEach((layer) => { layer.classList.remove('is-current'); layer.removeAttribute('src'); });
          readBg.style.backgroundImage = '';
          stage.inert = false;
          document.documentElement.classList.remove('story-read-open');
          // The reader is about to leave the body, so focus must not be left
          // standing on one of its controls.
          if (document.activeElement && reader.contains(document.activeElement)) document.activeElement.blur();
          if (stage.isConnected) stage.appendChild(reader);
          else reader.remove();
          const backTo = returnFocus;
          returnFocus = null;
          if (backTo && typeof backTo.focus === 'function' && backTo.isConnected) backTo.focus();
        };
        const onEnd = (event) => { if (event.target === reader && event.propertyName === 'opacity') finish(); };
        reader.addEventListener('transitionend', onEnd);
        closeTimer = window.setTimeout(finish, 900);
      };
      const openRead = () => {
        stopPlayback();
        // The panel belongs to the stage, and the stage goes inert underneath.
        closeBridge(false);
        window.clearTimeout(closeTimer);
        // Cancel any fade-out still in flight: this open wins.
        reader.classList.remove('is-closing');
        returnFocus = document.activeElement;
        document.body.appendChild(reader);
        stage.inert = true;
        reader.hidden = false;
        reader.classList.remove('is-open');
        buildProgress();
        fillRead();
        clearShiftTimer();
        document.documentElement.classList.add('story-read-open');
        // Escape and the arrows answer wherever focus sits: a reader that only
        // closes while its own button holds focus strands a keyboard visitor the
        // moment the lesson behind it moves focus.
        document.addEventListener('keydown', onDocumentKey, true);
        // One frame with the overlay transparent, then fade it and let the panel
        // rise behind the artwork.
        openFrame = window.requestAnimationFrame(() => reader.classList.add('is-open'));
        readBack.focus();
      };
      const go = (index, manual) => {
        if (manual) stopPlayback();
        current = Math.max(0, Math.min(cards.length - 1, index));
        render();
        if (!reader.hidden) fillRead();
      };

      prev.addEventListener('click', () => go(current - 1, true));
      next.addEventListener('click', () => go(current + 1, true));
      steps.forEach((step) => step.addEventListener('click', () => go(Number(step.getAttribute('data-index')), true)));
      if (hasEdges) {
        edgePrev.addEventListener('click', () => openBridge(-1));
        edgeNext.addEventListener('click', () => openBridge(1));
        bridgeGo.addEventListener('click', () => {
          const target = Number(bridgeGo.getAttribute('data-bridge-target'));
          closeBridge(false);
          if (!Number.isNaN(target)) go(target, true);
        });
        if (bridgeClose) bridgeClose.addEventListener('click', () => closeBridge(true));
      }
      // A reader that is torn down with the sheet it belongs to must not keep
      // answering keys for a lesson that is no longer on the page.
      reader.disarmStoryReader = () => {
        document.removeEventListener('keydown', onDocumentKey, true);
        document.removeEventListener('click', onDocumentClick);
        document.removeEventListener('keydown', onBridgeKey, true);
        window.clearTimeout(closeTimer);
        window.clearTimeout(retireTimer);
        window.cancelAnimationFrame(shiftFrame);
        window.cancelAnimationFrame(openFrame);
        stage.inert = false;
        if (stage.isConnected) stage.appendChild(reader);
      };
      cards.forEach((card, index) => card.addEventListener('click', (event) => {
        if (event.target.closest('.chain-cite')) return;
        if (index !== current) go(index, true);
        else openRead();
      }));
      readCards.forEach((card, index) => card.addEventListener('click', (event) => {
        if (event.target.closest('.chain-cite')) return;
        if (index !== current) go(index, true);
      }));
      launch.addEventListener('click', openRead);
      readBack.addEventListener('click', closeRead);
      if (readProgress) {
        readProgress.addEventListener('click', (event) => {
          const pip = event.target.closest('[data-read-pip]');
          if (!pip) return;
          go(Number(pip.getAttribute('data-read-pip')), true);
        });
      }
      reader.addEventListener('click', (event) => {
        if (event.target.closest('.chain-cite')) closeRead();
      });
      readPrev.addEventListener('click', () => go(current - 1, true));
      readNext.addEventListener('click', () => go(current + 1, true));
      // Escape and the arrows are handled once, at the document, so they work
      // whether or not focus is standing on one of the reader's own controls.
      reader.addEventListener('keydown', (event) => {
        if (event.key !== 'Tab') return;
        const focusable = Array.from(reader.querySelectorAll('button')).filter((button) => !button.disabled);
        if (!focusable.length) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      });
      viewport.addEventListener('keydown', (event) => {
        if (event.key === 'ArrowRight') { event.preventDefault(); go(current + 1, true); }
        if (event.key === 'ArrowLeft') { event.preventDefault(); go(current - 1, true); }
      });
      viewport.addEventListener('pointerdown', (event) => { pointerStartX = event.clientX; });
      viewport.addEventListener('pointerup', (event) => {
        if (pointerStartX === null) return;
        const delta = event.clientX - pointerStartX;
        pointerStartX = null;
        if (Math.abs(delta) > 45) go(current + (delta < 0 ? 1 : -1), true);
      });
      viewport.addEventListener('pointercancel', () => { pointerStartX = null; });
      deck.addEventListener('pointerdown', (event) => { pointerStartX = event.clientX; });
      deck.addEventListener('pointerup', (event) => {
        if (pointerStartX === null) return;
        const delta = event.clientX - pointerStartX;
        pointerStartX = null;
        if (Math.abs(delta) > 45) go(current + (delta < 0 ? 1 : -1), true);
      });
      deck.addEventListener('pointercancel', () => { pointerStartX = null; });
      play.addEventListener('click', () => {
        if (timer !== null) { stopPlayback(); return; }
        if (current === cards.length - 1) go(0, false);
        play.setAttribute('aria-pressed', 'true');
        if (playLabel) playLabel.textContent = 'Pause story';
        // The card transition is 1.15s: a beat has to leave the movement settled
        // long enough to be read before the next one starts to move.
        timer = window.setInterval(() => {
          if (current >= cards.length - 1) { stopPlayback(); return; }
          go(current + 1, false);
        }, 3900);
      });
      function onHide() {
        if (!figure.isConnected) { document.removeEventListener('visibilitychange', onHide); return; }
        if (document.hidden) stopPlayback();
      }
      document.addEventListener('visibilitychange', onHide);
      // A sitting switch detaches the figure without any visibility event, so the
      // self-removal above would never run and the listener (and every node the
      // figure holds) would stay alive. releaseSheetFigures() calls this.
      figure.__storyRelease = () => {
        stopPlayback();
        document.removeEventListener('visibilitychange', onHide);
      };

      const setOpen = (open) => {
        toggle.setAttribute('aria-expanded', String(open));
        toggle.setAttribute('aria-label', open ? 'Collapse diagram' : 'Expand diagram');
        panel.hidden = !open;
        if (!open) { stopPlayback(); closeBridge(false); closeRead(); }
      };
      toggle.addEventListener('click', () => {
        const open = toggle.getAttribute('aria-expanded') !== 'false';
        setOpen(!open);
      });
      render();

      // A flow keeps its own stack visible and reuses this reader as its scene
      // layer, so its renderer needs one way in: open the reader on the step
      // that was pressed. Additive — nothing else about the reader changes.
      figure.__openStoryScene = (index) => {
        if (!Number.isFinite(index) || index < 0 || index >= cards.length) return;
        go(index, true);
        openRead();
      };
    }

    /* One chain can be split across two diagrams — `s4-4` and `s4-5` are Daniel 4
       divided at 4:34, and `s4-5` opens on the beats `s4-4` closes with. A step
       whose own title already appeared in the neighbouring diagram of the same
       kind is that node carried forward, so both diagrams mark it with the same
       bead and the later one starts its sweep there rather than replaying what
       the reader has just seen (docs/flow-map-decisions.md §5.5). The match is
       structural and reads only `title`; no copy is written. */
    function flowContinuation(figure, specs, kind) {
      const out = { shared: new Set(), enter: 0 };
      const article = figure.closest('#sheet-article');
      const own = specs[figure.getAttribute('data-diagram')];
      const ownSteps = (own && Array.isArray(own.steps)) ? own.steps : [];
      if (!article || !ownSteps.length) return out;
      const figures = Array.from(article.querySelectorAll('figure[data-diagram]'));
      const at = figures.indexOf(figure);
      if (at < 0) return out;
      // Only a neighbour drawn by the same renderer can be the other half of the
      // chain: a comparison or a timeline beside this diagram is not a sequence.
      const neighbourTitles = (dir) => {
        for (let i = at + dir; i >= 0 && i < figures.length; i += dir) {
          const spec = specs[figures[i].getAttribute('data-diagram')];
          if (!spec || (spec.kind || 'chain') !== kind) continue;
          const steps = Array.isArray(spec.steps) ? spec.steps : [];
          if (steps.length) return steps.map((step) => String(step.title || '').trim()).filter(Boolean);
        }
        return [];
      };
      const words = (text) => String(text).toLowerCase().replace(/[^a-z0-9' ]+/g, ' ').split(/\s+/).filter(Boolean);
      // Function words carry no subject, so they are not evidence either way:
      // "He lifts his eyes" and "Nebuchadnezzar lifts his eyes to heaven" are the
      // same beat said twice, and so are the two verbatim titles.
      const EMPTY_WORDS = new Set(['the', 'a', 'an', 'of', 'to', 'in', 'for', 'by', 'and', 'as', 'at', 'on', 'with',
        'he', 'she', 'it', 'its', 'his', 'her', 'their', 'them', 'they', 'this', 'that']);
      const isSameBeat = (mine, other) => {
        const [short, long] = mine.length <= other.length ? [mine, other] : [other, mine];
        const subject = short.filter((word) => !EMPTY_WORDS.has(word));
        const bag = new Set(long);
        // Two subject words is the floor: a one-word title like "Prologue"
        // cannot match a neighbour by accident.
        return subject.length >= 2 && subject.every((word) => bag.has(word));
      };
      const near = neighbourTitles(-1).concat(neighbourTitles(1)).map(words);
      ownSteps.forEach((step, i) => {
        const mine = words(step.title || '');
        if (near.some((other) => isSameBeat(mine, other))) out.shared.add(i);
      });
      // The sweep enters on the carried-over node — the last beat of the run this
      // diagram repeats — and only when the run is at the head of the chain.
      let head = 0;
      while (head < ownSteps.length && out.shared.has(head)) head += 1;
      out.enter = head > 0 ? head - 1 : 0;
      return out;
    }

    /* ---- Cinematic full screen for table, comparison and timeline ----------
       The mindmap proved the mechanism (docs/brief-fullscreen-diagram.md): put
       `position: fixed; inset: 0` on the block itself and the browser does the
       rest — no reparenting, no second overlay, no second render path. These
       three kinds are read the same way, so they get the same treatment through
       one shell rather than three.

       Why these three need it and the chain does not: a chain is a sequence of
       cards, which reflows into any width. A table is a matrix, a comparison is
       parallel columns and a timeline is a proportional axis. Narrow them and
       the row labels wrap, the columns stop lining up and the axis stops being
       to scale — the three things that carry the meaning. The lesson column is
       832px wide; the same table at 1,400px is a different diagram.

       The surface follows the reference the redesign was drawn from: a deep
       gold-on-black field with rays, grain and a vignette, a serif title over a
       monospace kicker, and the diagram on a lit plate. The shell owns only that
       frame — the variable contract below — and each renderer owns everything
       inside it.

       Escape is arbitrated the same way the mindmap's is: this layer registers
       in `anotherLayerOwnsEscape()` so it closes innermost-first when a reader is
       also open, and one press closes exactly one thing. */
    const FULLSCREEN_KINDS = new Set(['table', 'comparison', 'timeline']);

    /* What the layer calls itself. The word is the standard's own name, not a
       restatement of the title below it. */
    const FS_KICKER = { table: 'Table', comparison: 'Comparison', timeline: 'Timeline' };

    /* The block's own full-screen control. Same glyph as the mindmap's so the
       two surfaces read as one idea, sized to sit beside `.chain-toggle`. */
    function fullscreenControlHtml() {
      return '<button class="chain-fs" type="button" data-chain-fs aria-pressed="false" aria-label="Full screen" title="Full screen">' +
        '<svg class="dfx-i-expand" viewBox="0 0 12 12" fill="currentColor" aria-hidden="true" focusable="false">' +
          '<path d="M1.2 1.2h3.6v1.6H2.8v2H1.2zM7.2 1.2h3.6v3.6H9.2V2.8H7.2zM1.2 7.2h1.6v2h2v1.6H1.2zM9.2 7.2h1.6v3.6H7.2V9.2h2z"/>' +
        '</svg>' +
        '<svg class="dfx-i-close" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" aria-hidden="true" focusable="false">' +
          '<path d="M2.6 2.6l6.8 6.8M9.4 2.6l-6.8 6.8"/>' +
        '</svg>' +
      '</button>';
    }

    /* What "focusable" means inside the layer, matching mindmap.js's list so the
       two traps agree about the page. */
    const FS_FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

    function wireDiagramFullscreen(figure, kind) {
      const btn = figure.querySelector('[data-chain-fs]');
      const toggle = figure.querySelector('.chain-toggle');
      const panel = figure.querySelector('.chain-body');
      const title = figure.querySelector('.chain-title-cap');
      const note = figure.querySelector('.chain-note');
      const ascii = figure.querySelector('.chain-ascii');
      if (!btn || !panel) return;
      if (figure.__diagramFs) return;
      const root = document.documentElement;
      const reduce = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;

      /* The header and footer are built here rather than rendered into the column:
         they are only ever on screen in full screen, and a node that exists only
         to be hidden is one more thing to keep in step. Both are therefore
         created, not toggled, and removed on exit.
         They are two elements, not one, because the layer is a three-row grid:
         the title heads the plate and the note foots it, which is where the
         reference prints a table's footnote — under the table it qualifies. */
      let chrome = null;
      let foot = null;
      const label = (title && title.textContent.trim()) || 'Diagram';

      function trapFocus(event) {
        if (event.key !== 'Tab') return;
        /* The figure's own controls live inside it, so the layer's focusables are
           the controls plus whatever the renderer offers. `offsetParent` is null
           for anything display:none, which is how the in-column Replay control
           and a collapsed panel stay out of the ring. */
        const items = Array.from(figure.querySelectorAll(FS_FOCUSABLE))
          .filter((el) => !el.hidden && (el.offsetParent !== null || el === document.activeElement));
        if (!items.length) return;
        const first = items[0];
        const last = items[items.length - 1];
        const active = document.activeElement;
        event.preventDefault();
        if (!figure.contains(active)) { first.focus(); return; }
        const at = items.indexOf(active);
        if (at < 0) { (event.shiftKey ? last : first).focus(); return; }
        const step = event.shiftKey ? -1 : 1;
        items[(at + step + items.length) % items.length].focus();
      }

      /* A layer stacked above this one keeps its own Escape. The page's reader
         (`.story-read`, 220) sits above this layer (180) — a citation chip opens
         it — and the infographic and certificate panels sit above that. Ordering
         the list by stacking is what makes one press close one thing. */
      const ABOVE_LAYER = '.story-read:not([hidden]), #infographic-modal, #certificate-panel, #certificate-review-modal';
      function layerAbove() {
        return Array.from(document.querySelectorAll(ABOVE_LAYER)).some((el) => !el.hidden);
      }

      function onKey(event) {
        /* The reference panel is a capture-phase listener on this same node, so it
           runs first and marks the press; a spent press must not also close the
           layer underneath it. */
        if (event.__citePanelHandled) return;
        if (event.key === 'Escape' && figure.classList.contains('is-full')) {
          /* The reference panel sits above this layer, so it is the innermost
             thing open and takes the first Escape. This branch is the fallback for
             a press that reached here unmarked; the test is the *arming* class,
             not `#sheet-verify`'s `hidden`, because the list is unhidden for every
             sitting that has references. */
          if (citePanelOpen()) {
            event.preventDefault();
            event.stopPropagation();
            closeCitePanel();
            return;
          }
          if (layerAbove()) return;
          event.preventDefault();
          event.stopPropagation();
          exit(true);
          return;
        }
        trapFocus(event);
      }

      function buildChrome() {
        chrome = document.createElement('div');
        chrome.className = 'dfx-bar';
        chrome.innerHTML =
          '<p class="dfx-eyebrow"><span class="dfx-rule" aria-hidden="true"></span>' +
            '<span class="dfx-kind">' + escapeStudy(FS_KICKER[kind] || kind) + '</span></p>' +
          '<h2 class="dfx-title" id="' + figure.getAttribute('data-diagram') + '-fs-title">' + escapeStudy(label) + '</h2>';
        figure.insertBefore(chrome, figure.firstChild);
        if (note) {
          foot = document.createElement('div');
          foot.className = 'dfx-foot';
          foot.innerHTML = '<p class="dfx-note">' + escapeStudy(note.textContent.trim()) + '</p>';
          /* After the plate: `.chain-body` is the row above it in the grid. */
          figure.appendChild(foot);
        }
        if (ascii) ascii.hidden = true;
        if (toggle) toggle.hidden = true;
      }

      function dropChrome() {
        if (chrome && chrome.parentNode) chrome.parentNode.removeChild(chrome);
        if (foot && foot.parentNode) foot.parentNode.removeChild(foot);
        chrome = null;
        foot = null;
        if (ascii) ascii.hidden = false;
        if (toggle) toggle.hidden = false;
      }

      function enter() {
        if (figure.classList.contains('is-full')) return;
        if (reduce && reduce.matches) figure.classList.add('is-reduced');
        buildChrome();
        figure.__fsOpener = document.activeElement;
        figure.classList.add('is-full');
        figure.setAttribute('role', 'dialog');
        figure.setAttribute('aria-modal', 'true');
        figure.setAttribute('aria-labelledby', figure.getAttribute('data-diagram') + '-fs-title');
        btn.setAttribute('aria-pressed', 'true');
        btn.setAttribute('aria-label', 'Exit full screen');
        btn.title = 'Exit full screen';
        root.classList.add('dfx-open');
        /* A collapsed figure would open an empty layer: expanding is what the
           full-screen button means, so it is done here rather than refused. */
        if (toggle && toggle.getAttribute('aria-expanded') === 'false') {
          toggle.setAttribute('aria-expanded', 'true');
          toggle.setAttribute('aria-label', 'Collapse diagram');
          panel.hidden = false;
          figure.classList.remove('is-visible');
          void figure.offsetWidth;
          figure.classList.add('is-visible');
        }
        void figure.offsetWidth;
        /* The floating furniture is hidden by CSS while a layer is open (see
           `body:has(.chain.is-full)`), so it cannot be pressed — but a hidden
           control is still focusable. `inert` is what takes it out of the tab
           order as well as the pointer's reach. The figure's own Replay control
           is a sibling injected by the renderer and goes the same way; scoping it
           to the figure's parent avoids reaching into anything else on the page. */
        document.querySelectorAll('.insight-card, .audio-orb').forEach((el) => {
          if (!el.hasAttribute('inert')) { el.setAttribute('inert', ''); el.setAttribute('data-dfx-inert', ''); }
        });
        const replayBtn = figure.parentNode ? figure.parentNode.querySelector('[data-chain-replay]') : null;
        if (replayBtn && !replayBtn.hasAttribute('inert')) {
          replayBtn.setAttribute('inert', '');
          replayBtn.setAttribute('data-dfx-inert', '');
        }
        document.addEventListener('keydown', onKey, true);
        /* Focus lands on the exit control so one press closes, and a keyboard
           user is never left behind the layer. */
        window.requestAnimationFrame(() => { if (figure.classList.contains('is-full')) btn.focus({ preventScroll: true }); });
      }

      function exit(refocus) {
        if (!figure.classList.contains('is-full')) return;
        figure.classList.remove('is-full', 'is-reduced');
        figure.removeAttribute('role');
        figure.removeAttribute('aria-modal');
        figure.removeAttribute('aria-labelledby');
        btn.setAttribute('aria-pressed', 'false');
        btn.setAttribute('aria-label', 'Full screen');
        btn.title = 'Full screen';
        document.removeEventListener('keydown', onKey, true);
        dropChrome();
        /* Only the nodes this layer marked are released, so furniture that was
           inert for another reason keeps its state. */
        document.querySelectorAll('[data-dfx-inert]').forEach((el) => {
          el.removeAttribute('inert');
          el.removeAttribute('data-dfx-inert');
        });
        /* The lock is shared with the mindmap's layer, so it is only released when
           no other full-screen block is still open — and the reference panel's
           presentation goes with it, because the panel exists only for as long as
           a layer does. */
        if (!document.querySelector('.chain.is-full, .mm.is-full')) {
          root.classList.remove('dfx-open', 'dfx-cite-open');
          syncCiteClose();
        }
        const opener = figure.__fsOpener;
        figure.__fsOpener = null;
        if (refocus && opener && opener.isConnected && typeof opener.focus === 'function') {
          opener.focus({ preventScroll: true });
        }
      }

      btn.addEventListener('click', () => {
        if (figure.classList.contains('is-full')) exit(true);
        else enter();
      });
      /* A sitting switch replaces #sheet-article's innerHTML, which detaches the
         figure before anything can call a teardown — measured by the mindmap
         agent as the way a page stays locked with nothing on screen. The
         listener is on the button, so a detached figure cannot fire it; the
         class on <html> is the one thing that would survive, and the renderer
         clears it before rewriting the article. */
      figure.__diagramFs = { exit: exit, isFull: () => figure.classList.contains('is-full') };
    }

    /* Tear down what each figure mounted, before its markup is replaced. A
       sitting switch rewrites #sheet-article, which creates new figures: the old
       ones are never rendered again, so their mindmap (observers on the body, a
       frame loop) and story reader (a document listener) would otherwise live on
       and keep the whole detached article reachable. */
    function releaseSheetFigures(root) {
      if (!root) return;
      root.querySelectorAll('figure').forEach((figure) => {
        if (figure.__mm && typeof figure.__mm.destroy === 'function') figure.__mm.destroy();
        figure.__mm = null;
        if (typeof figure.__storyRelease === 'function') figure.__storyRelease();
        figure.__storyRelease = null;
      });
    }

    function renderSheetDiagrams(data) {
      document.querySelectorAll('body > .story-read').forEach((node) => {
        // Unhook the reader before it leaves the page: its key listener is
        // attached to the document, not to the node.
        if (typeof node.disarmStoryReader === 'function') node.disarmStoryReader();
        node.remove();
      });
      document.documentElement.classList.remove('story-read-open');
      /* A sitting switch rewrites #sheet-article's innerHTML, which detaches any
         figure that was full screen before its own exit() could run. The lock
         lives on <html>, not on the figure, so it is the one thing that would
         survive the rewrite with nothing left on screen to release it. */
      document.documentElement.classList.remove('dfx-open');
      const sheet = data || {};
      // Sittings mid-migration may still carry the single-diagram field.
      const specs = sheet.diagrams || (sheet.diagram ? { legacy: sheet.diagram } : {});
      const article = document.getElementById('sheet-article');
      if (!article) return;
      const sheetIndex = Number(article.getAttribute('data-sheet-index'));
      const refs = referenceIndex(isNaN(sheetIndex) ? 0 : sheetIndex);
      const canResolve = makeCiteResolver(refs);
      article.querySelectorAll('figure[data-diagram]').forEach((figure) => {
        // The mindmap owns a rAF loop, a ResizeObserver, an IntersectionObserver
        // and a block-scoped key listener. A sitting switch rebuilds the article,
        // so the previous mount is torn down before the figure is rewritten.
        if (figure.__mm && typeof figure.__mm.destroy === 'function') figure.__mm.destroy();
        figure.__mm = null;
        if (typeof figure.__storyRelease === 'function') figure.__storyRelease();
        figure.__storyRelease = null;
        const id = figure.getAttribute('data-diagram');
        const spec = specs[id];
        if (!spec) return;
        const steps = Array.isArray(spec.steps) ? spec.steps : [];
        const rows = Array.isArray(spec.rows) ? spec.rows : [];
        const kind = spec.kind || 'chain';
        const needs = kind === 'table' ? rows : steps;
        if (needs.length < 2) return;

        const isStory = kind === 'chain' || kind === 'steps';
        let storyStart = 0;
        if (isStory && kind === 'chain') {
          const mid = steps.findIndex((step) => step.centre);
          if (mid >= 0) storyStart = mid;
        }

        let body = '';
        if (isStory) body = bodyStory(spec, steps, canResolve, storyStart, id);
        else if (kind === 'comparison') body = bodyComparison(spec, steps, canResolve);
        else if (kind === 'table') body = bodyTable(spec, rows);
        else if (kind === 'flow') body = bodyFlow(spec, steps, canResolve, id, flowContinuation(figure, specs, kind));
        else if (kind === 'mindmap') body = bodyMindmap(spec, steps, canResolve);
        else if (kind === 'timeline') body = bodyTimeline(spec, steps, canResolve);
        else body = bodyChain(spec, steps, true, canResolve);

        // The plain-text artwork stays in the DOM, hidden, so it survives for
        // search and copy without duplicating what the cards announce.
        const asciiEl = figure.querySelector('.chain-ascii');
        const ascii = asciiEl ? asciiEl.textContent : '';

        figure.classList.add('chain');
        figure.setAttribute('data-chain', '');
        figure.innerHTML =
          (FULLSCREEN_KINDS.has(kind) ? fullscreenControlHtml() : '') +
          '<button class="chain-toggle" type="button" aria-expanded="true" aria-controls="' + id + '-body" aria-label="Collapse diagram">' +
            '<svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 5l5 5 5-5"/></svg>' +
          '</button>' +
          (spec.title ? '<figcaption class="chain-title-cap">' + escapeStudy(spec.title) + '</figcaption>' : '') +
          (ascii ? '<pre class="chain-ascii" aria-hidden="true">' + escapeStudy(ascii) + '</pre>' : '') +
          '<div class="chain-body" id="' + id + '-body">' + body + '</div>' +
          (spec.note ? '<p class="chain-note">' + escapeStudy(spec.note) + '</p>' : '');

        if (isStory) {
          figure.classList.add('is-story');
          wireStory(figure);
        } else {
          const replay = document.createElement('button');
          replay.type = 'button';
          replay.className = 'chain-replay';
          replay.setAttribute('data-chain-replay', '');
          replay.textContent = 'Replay animation';
          figure.parentNode.insertBefore(replay, figure.nextSibling);
          if (kind === 'flow') {
            // A flow keeps its stack visible and reuses the story reader as its
            // scene layer: wireStory() wires the panel and the reader (the panel
            // it opens contains it), the shared shell supplies the entrance
            // animation and the Replay control, and wireFlow() opens a step's
            // scene. The carousel those cards belong to stays hidden.
            wireStory(figure);
            wireFigure({ figure: figure, replay: replay, ownsToggle: true });
            wireFlow(figure);
          } else {
            wireFigure({ figure: figure, replay: replay });
            // The timeline's axis, legend and panel are one selection; the wiring
            // is its own, and the shell's full-screen layer is added after it.
            if (kind === 'timeline') wireTimeline(figure);
            if (FULLSCREEN_KINDS.has(kind)) wireDiagramFullscreen(figure, kind);
          }
        }
        // The mindmap mounts after the shell exists: it reuses the figure's own
        // Replay control, and its host must already be in the document so the
        // ResizeObserver and IntersectionObserver have something to measure.
        if (kind === 'mindmap' && window.MindMap && typeof window.MindMap.create === 'function') {
          const mmHost = figure.querySelector('.mm');
          if (mmHost) figure.__mm = window.MindMap.create(mmHost, spec, { cite: diagramCite, canResolve: canResolve });
        }
        if (refs.length) decorateCitations(figure, refs);
      });
    }

    // A diagram's citation opens the same reference row the prose markers use.
    function resolveCiteLabel(label) {
      const box = document.getElementById('sheet-verify');
      if (!box) return;
      const text = String(label || '');
      const colon = text.indexOf(':');
      if (colon < 0) return;
      // The chapter is the number BEFORE the colon, not after: "Daniel 1:2" is
      // chapter 1 verse 2. Reading the post-colon digits gives verse 2 as the
      // chapter and matches nothing.
      const beforeColon = text.slice(0, colon);
      const book = normalBook(beforeColon.replace(/\s*\d+\s*$/, '').trim());
      const chapter = (beforeColon.match(/(\d+)\s*$/) || [])[1];
      if (!book || !chapter) return;
      const rows = box.querySelectorAll('.cite-row');
      for (const row of rows) {
        const src = row.querySelector('.cite-source');
        if (!src) continue;
        const s = src.textContent.toLowerCase();
        if (s.includes(book) && new RegExp('\\b' + chapter + ':').test(s)) { revealReference(row.id); return; }
      }
    }

    /* The class that turns the list into a panel is added by the two layers, both
       of which also remove it on exit. `syncCiteClose` has to follow that, or the
       Close control would stay on a list that is no longer a panel — so the
       document's own class changes are watched rather than each layer being asked
       to remember a callback it was never given. */
    if (typeof MutationObserver === 'function') {
      new MutationObserver(() => syncCiteClose())
        .observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
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
      const refs = referenceIndex(index);

      // One row per reference. The claim and source answer "what does this
      // document?"; the quotation and the check open on demand so the list
      // stays scannable.
      const rows = refs.map((r) => {
        const openHtml = r.href
          ? '<a class="cite-open" href="' + escapeVerify(r.href) + '" target="_blank" rel="noopener noreferrer">Open source' +
            '<span aria-hidden="true"> ↗</span></a>'
          : '';
        return '<li class="cite-row cite-row-' + r.kind + '" id="' + r.id + '">' +
          '<details class="cite-details">' +
            '<summary class="cite-summary">' +
              '<span class="cite-num" aria-hidden="true">' + r.n + '</span>' +
              '<span class="cite-main">' +
                '<span class="cite-kind">' + escapeVerify(r.label) + '</span>' +
                '<span class="cite-claim">' + escapeVerify(r.claim) + '</span>' +
                '<span class="cite-source">' + escapeVerify(r.source) + '</span>' +
              '</span>' +
            '</summary>' +
            '<div class="cite-body">' +
              '<blockquote class="cite-quote">' + escapeVerify(r.quote) + '</blockquote>' +
              (r.check ? '<p class="cite-check"><b>Check</b> ' + escapeVerify(r.check) + '</p>' : '') +
              (openHtml ? '<p class="cite-actions">' + openHtml + '</p>' : '') +
            '</div>' +
          '</details>' +
        '</li>';
      }).join('');

      box.hidden = false;
      box.innerHTML =
        '<button type="button" class="cite-close" data-cite-close hidden>Close references</button>' +
        '<div class="cite-head">' +
          '<p class="cite-kicker">References</p>' +
          '<h3 class="cite-title">Lessons, sources, and quotations</h3>' +
        '</div>' +
        '<p class="cite-lead">' + escapeVerify(pack.claim) + '</p>' +
        '<p class="cite-count">' + refs.length + ' references. Tap any reference to read the quotation and its check.</p>' +
        '<ol class="cite-list">' + rows + '</ol>';
      syncCiteClose();

      const article = document.getElementById('sheet-article');
      if (article) decorateCitations(article, refs);
    }

    /* While a full-screen diagram or map is open, a citation chip's reference list
       is presented as a panel above the layer (see the `.sheet-verify` rule in
       study.html), and a panel needs a way out. The control is only shown when
       that panel is the presentation — in the column the list is part of the page,
       so a Close button there would be noise.

       `citePanelOpen()` reads the arming class rather than the layer's, because
       the list is always visible: keying the panel on the layer alone raised it
       over the diagram the instant it opened, burying the chips meant to open it. */
    function citePanelOpen() {
      return document.documentElement.classList.contains('dfx-cite-open');
    }

    function syncCiteClose() {
      const box = document.getElementById('sheet-verify');
      if (!box) return;
      const btn = box.querySelector('[data-cite-close]');
      if (btn) btn.hidden = !citePanelOpen();
    }

    function closeCitePanel() {
      const box = document.getElementById('sheet-verify');
      document.documentElement.classList.remove('dfx-cite-open');
      syncCiteClose();
      /* Focus was on the chip that opened it, which is inside the layer and still
         on screen, so it is handed back rather than left on a removed node. */
      const opener = box && box.__citeOpener;
      if (box) box.__citeOpener = null;
      if (opener && opener.isConnected && typeof opener.focus === 'function') {
        opener.focus({ preventScroll: true });
      }
    }

    /* The panel claims Escape for itself rather than relying on whichever layer
       happens to be underneath. It is the topmost layer whenever it is presented
       (240 against the diagram's 180 and the map's 180), so it is the innermost
       thing open by definition; a capture-phase listener on the document lets it
       say so once, and the map beneath it already stands down on the class.

       It marks the event as handled, and that is load-bearing rather than
       tidiness. Both this and a diagram layer's own handler are capture-phase
       listeners **on the same node**, and `stopPropagation()` does not stop other
       listeners on the node it is called from — only propagation to other nodes.
       So the layer's handler runs afterwards regardless, sees the class already
       cleared, and closes the layer under the panel: measured, one Escape closed
       both. The mark is how the later handler learns the press is spent. */
    function onCitePanelKey(event) {
      if (event.key !== 'Escape' || !citePanelOpen()) return;
      event.preventDefault();
      event.stopPropagation();
      event.__citePanelHandled = true;
      closeCitePanel();
    }

    // Citation markers jump to the reference list and open that row.
    function revealReference(id) {
      const row = document.getElementById(id);
      if (!row) return;
      const box = document.getElementById('sheet-verify');
      if (box) {
        /* Remember what opened it, so the panel can hand focus back. */
        if (box.hidden && document.activeElement && document.activeElement.closest
          && document.activeElement.closest('.chain-cite, .cite-ref')) {
          box.__citeOpener = document.activeElement;
        }
        box.hidden = false;
      }
      row.querySelectorAll('.cite-details').forEach((d) => { d.open = true; });
      row.classList.add('is-hit');
      /* Arm the panel only when a layer is open: in the column the list is already
         on the page and a fixed full-viewport presentation would be wrong. */
      if (document.documentElement.classList.contains('dfx-open') ||
        document.documentElement.classList.contains('mm-fullscreen-open')) {
        document.documentElement.classList.add('dfx-cite-open');
      }
      syncCiteClose();
      /* `scrollIntoView` walks the nearest scrollable ancestor. With a layer open
         the panel is `position: fixed` with its own overflow, so the row scrolls
         inside the panel; in the column it scrolls the page as it always did. */
      row.scrollIntoView({ behavior: 'smooth', block: 'center' });
      window.setTimeout(() => row.classList.remove('is-hit'), 1800);
    }

    /* Capture phase, so the panel answers Escape before any layer below it: the
       diagram's own handler is also capture-phase and is registered later, so it
       runs after this one and sees the class already cleared. */
    document.addEventListener('keydown', onCitePanelKey, true);

    document.addEventListener('click', (e) => {
      const cite = e.target.closest && e.target.closest('.cite-ref');
      if (cite) {
        e.preventDefault();
        revealReference(cite.getAttribute('data-cite'));
        return;
      }
      const chainCite = e.target.closest && e.target.closest('.chain-cite');
      if (chainCite) {
        e.preventDefault();
        resolveCiteLabel(chainCite.getAttribute('data-cite-src'));
        return;
      }
      const citeClose = e.target.closest && e.target.closest('[data-cite-close]');
      if (citeClose) {
        e.preventDefault();
        closeCitePanel();
      }
    });

    // The study-path card carries one thing only: the questions to sit with.
    // The trace / christ / now / help / value blocks were removed by request;
    // their helpers above remain unused rather than deleted, so nothing else
    // that referenced them can break.
    function renderStudyGuide(guide) {
      const box = document.getElementById("sheet-study-path");
      if (!box) return;
      const asked = guide && Array.isArray(guide.ask) ? guide.ask.filter((q) => q && String(q).trim()) : [];
      if (!asked.length) {
        box.hidden = true;
        box.innerHTML = "";
        return;
      }
      const items = asked
        .map((q, i) => '<li class="study-ask-item"><span class="study-ask-num" aria-hidden="true">' + (i + 1) + '</span><span class="study-ask-text">' + escapeStudy(String(q)) + "</span></li>")
        .join("");
      box.hidden = false;
      box.innerHTML =
        '<div class="study-ask-head">' +
          '<span class="study-ask-orb" aria-hidden="true"></span>' +
          '<p class="study-ask-kicker">Questions to sit with</p>' +
        "</div>" +
        '<ol class="study-ask-list">' + items + "</ol>";
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
      if (window.BAJourney && typeof window.BAJourney.previewAllContent === 'function' && window.BAJourney.previewAllContent()) return true;
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

          const data = await getStrongsData();
          const entry = data[lemmaId];
          if (!entry) return;
          if (window.StudyCompetency) {
            window.StudyCompetency.recordScriptureLookup(`Strong's ${lemmaId} (${entry.translit || entry.lemma || ''})`);
          }
          window.TermOverlay.open({ type: 'strongs', lemmaId, entry }, el);
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
        lead: 'Daniel 2:38 names the head. Keep 605 B.C. on the map, then turn the image itself — gold, silver, bronze, iron, and the stone that strikes the feet.',
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
        lead: 'The watchers’ sentence falls on the same city. Stay with Babylon long enough to see the stump, then the ox-king — pride bound with iron and bronze.',
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
      if (window.Insights && typeof window.Insights.inviteUrl === 'function') {
        return window.Insights.inviteUrl(currentSheetIndex);
      }
      try {
        const u = new URL('index.html', window.location.href);
        u.searchParams.set('s', String(currentSheetIndex));
        return u.href;
      } catch (e) {
        return (window.location.origin || '') + '/index.html';
      }
    }

    async function shareSitting() {
      const url = enrollmentUrl();
      const title = 'The Shelf of Daniel';
      const text = 'Join this sitting of the Shelf of Daniel. Open the cover, agree to the terms, and sign in to begin.';
      let method = 'fallback';
      try {
        if (navigator.share) {
          await navigator.share({ title: title, text: text, url: url });
          method = 'share';
          if (window.Insights) window.Insights.track('invite_shared', currentSheetIndex, { method: method });
          showToast('Invitation ready to send.');
          return;
        }
        if (navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(url);
          method = 'clipboard';
          if (window.Insights) window.Insights.track('invite_shared', currentSheetIndex, { method: method });
          showToast('Enrollment link copied. Recipients sign in on the cover.');
          return;
        }
      } catch (err) {
        if (err && err.name === 'AbortError') return;
      }
      if (window.Insights) window.Insights.track('invite_shared', currentSheetIndex, { method: method });
      showToast('Share the home page so they can sign in: ' + url);
    }

    function renderLessonConnectBar(index) {
      const bar = document.getElementById('lesson-connect');
      if (!bar) return;
      if (!bar.dataset.tracked) {
        bar.dataset.tracked = 'true';
        bar.addEventListener('click', (e) => {
          const link = e.target.closest('#btn-lesson-map, #btn-lesson-gallery');
          if (link && window.Insights) {
            window.Insights.track('path_step', currentSheetIndex, { step: link.id === 'btn-lesson-map' ? 'map' : 'gallery' });
          }
        });
      }
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

    function renderChristologyPlaque(articleEl, c) {
      if (!articleEl || !c) return;
      const section = document.createElement('section');
      section.id = 'sheet-christology';
      section.className = 'sheet-christology';
      section.innerHTML =
        '<div class="flex flex-wrap items-center justify-between gap-2 mb-3 pb-3 border-b border-amber-600/20 dark:border-amber-500/20">' +
          '<span class="font-mono text-xs uppercase tracking-widest text-amber-800 dark:text-amber-400 font-bold flex items-center gap-2">' +
            '<span class="inline-block w-2 h-2 rounded-full bg-amber-600 dark:bg-amber-400"></span>' +
            'Christology' +
          '</span>' +
          '<span class="font-mono text-xs text-ink-600 dark:text-paper-400 italic" id="christology-scripture"></span>' +
        '</div>' +
        '<h3 class="font-serif font-bold text-ink-900 dark:text-paper-50 tracking-tight" id="christology-title"></h3>' +
        '<div class="christology-body font-serif text-ink-800 dark:text-paper-200" id="christology-body"></div>';
      section.querySelector('#christology-scripture').textContent = c.scripture || '';
      section.querySelector('#christology-title').textContent = c.title || '';
      const bodyEl = section.querySelector('#christology-body');
      if (Array.isArray(c.body)) {
        bodyEl.innerHTML = c.body.map((p) => `<p>${p.trim()}</p>`).join('');
      } else if (typeof c.body === 'string') {
        bodyEl.innerHTML = c.body.split(/\n\n+/).map((p) => `<p>${p.trim()}</p>`).join('');
      }
      const anchor = articleEl.querySelector('.next-sitting-card') || articleEl.querySelector('.reading-notes');
      if (anchor) anchor.parentNode.insertBefore(section, anchor);
      else articleEl.appendChild(section);
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

    function plainText(html) {
      const holder = document.createElement('div');
      holder.innerHTML = String(html || '');
      return holder.textContent.trim();
    }

    function mountSheetBook(index, data, restore) {
      if (!window.BookReader) return;
      window.BookReader.mount(document.getElementById('sheet-article'), {
        sheetIndex: index,
        title: data.title,
        kicker: plainText(data.epoch),
        restore
      });
    }

    function placeReader(index, restore) {
      let hashTarget = null;
      try { hashTarget = location.hash ? document.querySelector(location.hash) : null; } catch (e) { hashTarget = null; }
      if (hashTarget) {
        setTimeout(() => {
          const book = window.BookReader;
          if (book && book.isActive() && book.reveal(hashTarget, { instant: true })) {
            document.getElementById('sheet-article').scrollIntoView({ behavior: 'auto', block: 'start' });
            return;
          }
          hashTarget.scrollIntoView({ behavior: 'auto', block: 'start' });
        }, 0);
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
      rememberSheetUrl(index);
      currentSheetIndex = index;
      endCardShownForSheet = -1;
      hideSittingGuide();
      try {
        localStorage.setItem('daniel_historicist_sheet', index);
      } catch (e) {}
      if (window.Insights) {
        window.Insights.resetActive();
        if (typeof window.Insights.readingTimer === 'function') {
          window.Insights.readingTimer(index);
        }
        window.Insights.track('sitting_start', index, { revisit: completedSheets.has(index) });
        window.Insights.maybePulse(index);
      }

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
      const articleEl = document.getElementById('sheet-article');
      articleEl.setAttribute('data-sheet-index', String(index));
      if (window.BookReader) window.BookReader.unmount();
      releaseSheetFigures(articleEl);
      articleEl.innerHTML = data.content;
      renderChristologyPlaque(articleEl, data.christology);
      renderLessonMedia(data);
      renderSheetDiagrams(data);
      renderLessonConnectBar(index);
      renderStudyGuide(data.studyGuide);
      renderFacilitatorStrip(data.facilitator);
      renderSheetVerify(index);
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
      placeCheckpointPlates(data.quizzes);
      syncAdvanceButtons(index);

      mountSheetBook(index, data, !!(opts && opts.restorePlace));
      placeReader(index, !!(opts && opts.restorePlace));
      const skipIntro = (opts && opts.skipIntro);
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
      return quizzes.every((q, i) => verifiedQuiz[i] === true);
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
      const hint = !wbOk ? 'Complete the active proof workbench above to continue' : (!qOk ? 'Answer the checkpoints in the lesson and the final questions to continue' : '');
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
        showToast('Answer the checkpoints in the lesson and the final questions to continue.');
        revealUnfinished();
        return;
      }
      loadSheet(currentSheetIndex + delta);
    }

    /* =========================================================================
       6. ACTIVE RECALL REVISION & QUIZ CONTROLLER
       Answers are graded server-side by QuizGate (verify_quiz_answer RPC);
       the client bundle carries no answer key.
       ========================================================================= */
    let answeredQuestions = {};
    let quizAttemptCounts = {};
    let verifiedQuiz = {};
    let quizPending = {};

    const QUIZ_COPY_DEFAULT = {
      kicker: 'Checkpoint • Active Recall',
      title: 'Consolidate Prophetic Understanding',
      lead: 'Active recall cements prophetic dates and biblical theology into permanent memory. Test your comprehension before unlocking the next sheet:',
      badgeTail: ' to Advance'
    };

    function checkpointCountFor(total) {
      if (total < 2) return 0;
      const finals = total >= 5 ? 2 : 1;
      return Math.min(3, total - finals);
    }

    function spreadIndexes(slotCount, take) {
      const picked = [];
      if (slotCount <= 0 || take <= 0) return picked;
      const n = Math.min(take, slotCount);
      let prev = -1;
      for (let k = 1; k <= n; k += 1) {
        let idx = Math.round((k * (slotCount + 1)) / (n + 1)) - 1;
        if (idx < 0) idx = 0;
        if (idx > slotCount - 1) idx = slotCount - 1;
        if (idx <= prev) idx = prev + 1;
        picked.push(idx);
        prev = idx;
      }
      return picked;
    }

    function checkpointAnchors(headers, take) {
      let slots = headers.slice(1);
      const intro = headers[0] && /introduction/i.test(headers[0].textContent || '');
      if (intro && slots.length - 1 >= take) slots = slots.slice(1);
      return spreadIndexes(slots.length, take).map((i) => slots[i]);
    }

    function setQuizCopy(copy, count) {
      const kicker = document.getElementById('quiz-kicker');
      const title = document.getElementById('quiz-title');
      const lead = document.getElementById('quiz-lead');
      const badge = document.getElementById('quiz-badge');
      if (kicker) kicker.textContent = copy.kicker;
      if (title) title.textContent = copy.title;
      if (lead) lead.textContent = copy.lead;
      if (badge) {
        badge.textContent = count + ' Question' + (count === 1 ? '' : 's') + copy.badgeTail;
      }
    }

    function makeCheckpointPlate(index, total, qIdx) {
      const plate = document.createElement('section');
      plate.className = 'checkpoint-plate';
      plate.setAttribute('aria-label', 'Checkpoint ' + index + ' of ' + total);
      plate.setAttribute('data-checkpoint', String(index));
      plate.setAttribute('data-checkpoint-total', String(total));
      plate.setAttribute('data-checkpoint-q', String(qIdx));
      const kicker = document.createElement('p');
      kicker.className = 'checkpoint-kicker';
      kicker.textContent = 'Checkpoint ' + index + ' of ' + total;
      const title = document.createElement('h3');
      title.textContent = 'Before you turn the page';
      const lead = document.createElement('p');
      lead.className = 'checkpoint-lead';
      lead.textContent = 'Answer this from the pages you just read. The final questions come after the lesson.';
      const slot = document.createElement('div');
      slot.className = 'checkpoint-slot';
      plate.appendChild(kicker);
      plate.appendChild(title);
      plate.appendChild(lead);
      plate.appendChild(slot);
      return plate;
    }

    function placeCheckpointPlates(quizzes) {
      const list = Array.isArray(quizzes) ? quizzes : [];
      setQuizCopy(QUIZ_COPY_DEFAULT, list.length);
      const article = document.getElementById('sheet-article');
      if (!article || article.querySelector('.checkpoint-plate')) return;
      const gates = checkpointCountFor(list.length);
      const headers = Array.prototype.slice.call(article.querySelectorAll('.part-header'));
      if (!gates || headers.length < 2) return;
      const anchors = checkpointAnchors(headers, gates);
      let placed = 0;
      anchors.forEach((anchor) => {
        const card = document.getElementById('q-card-' + placed);
        if (!card || !anchor || !anchor.parentNode) return;
        const plate = makeCheckpointPlate(placed + 1, anchors.length, placed);
        plate.querySelector('.checkpoint-slot').appendChild(card);
        anchor.parentNode.insertBefore(plate, anchor);
        placed += 1;
      });
      if (!placed) return;
      const finals = list.length - placed;
      const word = placed === 1 ? 'checkpoint is' : 'checkpoints are';
      setQuizCopy({
        kicker: 'Final questions',
        title: 'Close the sitting',
        lead: placed + ' ' + word + ' in the lesson. These last questions finish it.',
        badgeTail: ' to Finish'
      }, finals);
    }

    function markCheckpoint(qIdx, flag) {
      const plate = document.querySelector('[data-checkpoint-q="' + qIdx + '"]');
      if (!plate) return;
      if (flag) plate.setAttribute('data-checkpoint-passed', flag);
      else plate.removeAttribute('data-checkpoint-passed');
      plate.classList.remove('is-held');
      document.dispatchEvent(new CustomEvent('checkpoint:passed'));
    }

    function revealUnfinished() {
      const plate = document.querySelector('.checkpoint-plate:not([data-checkpoint-passed])');
      const book = window.BookReader;
      const article = document.getElementById('sheet-article');
      if (plate && book && book.isActive() && book.reveal(plate, { instant: true })) {
        if (article) article.scrollIntoView({ behavior: 'smooth', block: 'start' });
        return;
      }
      const rev = document.getElementById('revision-section') || document.getElementById('workbench-section');
      if (rev) rev.scrollIntoView({ behavior: 'smooth' });
    }

    function renderQuiz(quizzes) {
      const container = document.getElementById('quiz-container');
      container.innerHTML = '';
      answeredQuestions = {};
      quizAttemptCounts = {};
      verifiedQuiz = {};
      quizPending = {};
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

    function paintQuizOutcome(qIdx, selectedOptIdx, correctIdx, isCorrect, questionData, note) {
      const feedback = document.getElementById(`q-${qIdx}-feedback`);

      questionData.options.forEach((_, optIdx) => {
        const btn = document.getElementById(`q-${qIdx}-opt-${optIdx}`);
        btn.disabled = true;
        if (optIdx === correctIdx) {
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
      const diagMsg = (!isCorrect && questionData.diagnostics && questionData.diagnostics[selectedOptIdx])
        ? `<div class="mt-2.5 pt-2 border-t border-current/20 font-mono text-xs"><strong>Diagnostic Analysis:</strong> ${questionData.diagnostics[selectedOptIdx]}</div>`
        : '';

      if (isCorrect) {
        feedback.className = "mt-4 p-4 rounded-lg font-sans text-xs sm:text-sm leading-relaxed border border-emerald-500/50 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-200";
        feedback.innerHTML = `<strong>✓ Historicist Exegesis:</strong> ${questionData.explanation}${note ? `<div class="mt-2.5 pt-2 border-t border-current/20 font-mono text-xs">${note}</div>` : ''}${diagMsg}`;
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
    }

    function handleQuizAnswer(qIdx, selectedOptIdx, questionData) {
      if (verifiedQuiz[qIdx] !== undefined || quizPending[qIdx]) return;
      answeredQuestions[qIdx] = selectedOptIdx;
      const attempt = (quizAttemptCounts[qIdx] = (quizAttemptCounts[qIdx] || 0) + 1);
      const feedback = document.getElementById(`q-${qIdx}-feedback`);

      quizPending[qIdx] = true;
      questionData.options.forEach((_, optIdx) => {
        const btn = document.getElementById(`q-${qIdx}-opt-${optIdx}`);
        if (btn) btn.disabled = true;
      });
      if (feedback) {
        feedback.className = "mt-4 p-4 rounded-lg font-sans text-xs sm:text-sm leading-relaxed border border-paper-300 dark:border-paper-800 bg-paper-50 dark:bg-paper-900/40 text-ink-700 dark:text-paper-300";
        feedback.classList.remove('hidden');
        feedback.innerHTML = '<em>Verifying against the record…</em>';
      }

      const gate = window.QuizGate && typeof window.QuizGate.verify === 'function' ? window.QuizGate : null;
      const call = gate
        ? gate.verify(currentSheetIndex, qIdx, selectedOptIdx)
        : Promise.resolve({ ok: false, error: 'not_authenticated' });

      call.then(function (res) {
        quizPending[qIdx] = false;
        if (!res || !res.ok) {
          const cause = (res && res.error) || 'error';
          questionData.options.forEach((_, optIdx) => {
            const btn = document.getElementById(`q-${qIdx}-opt-${optIdx}`);
            if (btn) btn.disabled = false;
          });
          if (cause === 'not_authenticated') {
            const accountHref = 'account.html?next=' + encodeURIComponent(location.pathname + location.search);
            if (feedback) {
              feedback.className = "mt-4 p-4 rounded-lg font-sans text-xs sm:text-sm leading-relaxed border border-amber-600/40 bg-amber-50 dark:bg-amber-950/30 text-ink-800 dark:text-paper-200";
              feedback.classList.remove('hidden');
              feedback.innerHTML = `<strong>Answer checking is available to signed-in members.</strong> Sign in to check your answers, save your progress, and work toward your certificate. <a href="${accountHref}" class="font-semibold underline text-amber-800 dark:text-amber-300">Go to Account</a>`;
            }
            markCheckpoint(qIdx, 'auth');
            updateNextGate();
            return;
          }
          if (feedback) feedback.classList.add('hidden');
          if (window.SiteOps && typeof window.SiteOps.report === 'function') {
            window.SiteOps.report('quiz_verify_failed', cause, { q: qIdx, cause: cause });
          }
          showToast('The record could not verify that answer. Check your connection and try again.');
          updateNextGate();
          return;
        }

        const isCorrect = !!res.correct;
        const correctIdx = typeof res.correctIdx === 'number' ? res.correctIdx : selectedOptIdx;
        verifiedQuiz[qIdx] = isCorrect;
        if (isCorrect) markCheckpoint(qIdx, 'true');

        if (window.StudyCompetency) {
          window.StudyCompetency.recordQuizAttempt(currentSheetIndex, qIdx, isCorrect);
        }
        if (window.Insights) {
          window.Insights.track('quiz_answer', currentSheetIndex, {
            q: qIdx,
            chosen: selectedOptIdx,
            choice: selectedOptIdx,
            correct: isCorrect,
            attempt: attempt
          });
        }

        paintQuizOutcome(qIdx, selectedOptIdx, correctIdx, isCorrect, questionData, res.note);
        updateNextGate();
        if (sheetQuizComplete()) {
          sittingVisited.tasks = true;
          renderSittingPath();
        }
        maybeShowEndGuide();
      });
    }

    function resetQuizQuestion(qIdx) {
      delete answeredQuestions[qIdx];
      delete verifiedQuiz[qIdx];
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
      markCheckpoint(qIdx, '');
      updateNextGate();
    }

    function celebrationFor(sheet) {
      if (sheet === 0) {
        return {
          title: 'The first sitting is yours.',
          body: 'A quiet, good beginning. Continue in the same care.'
        };
      }
      if (sheet === 5) {
        return {
          title: 'Halfway through the scroll.',
          body: 'Keep going. The later visions will reward the same patience.'
        };
      }
      if (sheet === 10) {
        return {
          title: 'Well done.',
          body: 'You have finished the eleven sittings of Daniel.'
        };
      }
      return null;
    }

    let celebrateTimer = 0;

    function burstConfetti() {
      if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      const old = document.getElementById('sitting-confetti');
      if (old) old.remove();
      const canvas = document.createElement('canvas');
      canvas.id = 'sitting-confetti';
      canvas.setAttribute('aria-hidden', 'true');
      canvas.style.cssText = 'position:fixed;inset:0;z-index:240;pointer-events:none;width:100%;height:100%;';
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const W = window.innerWidth;
      const H = window.innerHeight;
      canvas.width = Math.floor(W * dpr);
      canvas.height = Math.floor(H * dpr);
      document.body.appendChild(canvas);
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        canvas.remove();
        return;
      }
      ctx.scale(dpr, dpr);
      const colors = ['#c9a227', '#e8d5a3', '#8b1e1e', '#f4efe3', '#5c4033', '#d4af37', '#b8860b'];
      const cannons = [
        { x: W * 0.18, y: H * 0.28, dir: 1 },
        { x: W * 0.82, y: H * 0.28, dir: -1 }
      ];
      const bits = [];
      for (let i = 0; i < 148; i++) {
        const origin = cannons[i % 2];
        const angle = (-92 + origin.dir * (16 + Math.random() * 54)) * Math.PI / 180;
        const speed = 6.5 + Math.random() * 10;
        bits.push({
          x: origin.x,
          y: origin.y,
          w: 4 + Math.random() * 7,
          h: 8 + Math.random() * 15,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          r: Math.random() * Math.PI,
          vr: -0.24 + Math.random() * 0.48,
          color: colors[i % colors.length],
          kind: i % 5 === 0 ? 'circle' : 'rect',
          wobble: 0.35 + Math.random() * 0.85
        });
      }
      const started = performance.now();
      function frame(now) {
        const t = (now - started) / 1000;
        ctx.clearRect(0, 0, W, H);
        for (let i = 0; i < bits.length; i++) {
          const p = bits[i];
          p.vy += 0.17;
          p.vx *= 0.991;
          p.x += p.vx + Math.sin(t * 9 + i) * p.wobble;
          p.y += p.vy;
          p.r += p.vr;
          const fade = t > 2.5 ? Math.max(0, 1 - (t - 2.5) / 1.0) : 1;
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(p.r);
          ctx.globalAlpha = fade;
          ctx.fillStyle = p.color;
          if (p.kind === 'circle') {
            ctx.beginPath();
            ctx.arc(0, 0, p.w * 0.48, 0, Math.PI * 2);
            ctx.fill();
          } else {
            ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
          }
          ctx.restore();
        }
        if (t < 3.5) requestAnimationFrame(frame);
        else canvas.remove();
      }
      requestAnimationFrame(frame);
    }

    function showSittingCelebration(sheet) {
      const spec = celebrationFor(sheet);
      if (!spec) return;
      burstConfetti();
      const prev = document.getElementById('sitting-celebrate');
      if (prev) prev.remove();
      if (celebrateTimer) window.clearTimeout(celebrateTimer);
      if (!document.getElementById('sitting-celebrate-style')) {
        const style = document.createElement('style');
        style.id = 'sitting-celebrate-style';
        style.textContent =
          '#sitting-celebrate{position:fixed;left:50%;top:18%;transform:translateX(-50%);z-index:241;width:min(22rem,calc(100vw - 2rem));padding:1.05rem 1.15rem 1rem;border:1px solid rgba(196,162,90,.5);background:#f7f1e4;color:#1c1914;font-family:Inter,system-ui,sans-serif;box-shadow:0 18px 44px rgba(0,0,0,.32);text-align:center}' +
          'html.dark #sitting-celebrate,body.charcoal-mode #sitting-celebrate,body.night-mode #sitting-celebrate{background:#1c1914;color:#f3ead8;border-color:rgba(212,175,55,.4)}' +
          '#sitting-celebrate small{display:block;font-size:10px;letter-spacing:.1em;text-transform:uppercase;opacity:.68;margin-bottom:.4rem}' +
          '#sitting-celebrate h3{margin:0 0 .4rem;font-family:"Cormorant Garamond",Georgia,serif;font-size:1.35rem;font-weight:600}' +
          '#sitting-celebrate p{margin:0 0 .85rem;font-size:.92rem;line-height:1.45}' +
          '#sitting-celebrate button{border:1px solid rgba(196,162,90,.45);background:transparent;color:inherit;padding:.35rem .8rem;font-size:.8rem;cursor:pointer}';
        document.head.appendChild(style);
      }
      const label = window.BAJourney && typeof window.BAJourney.sheetLabel === 'function'
        ? window.BAJourney.sheetLabel(sheet)
        : ('Sitting ' + sheet);
      const card = document.createElement('div');
      card.id = 'sitting-celebrate';
      card.setAttribute('role', 'status');
      card.innerHTML =
        '<small>' + label + '</small>' +
        '<h3></h3>' +
        '<p></p>' +
        '<button type="button">Continue</button>';
      card.querySelector('h3').textContent = spec.title;
      card.querySelector('p').textContent = spec.body;
      document.body.appendChild(card);
      function close() {
        if (card.parentNode) card.remove();
      }
      card.querySelector('button').addEventListener('click', close);
      celebrateTimer = window.setTimeout(close, 5600);
    }

    function completeAndAdvance() {
      if (!canAdvancePath()) {
        showToast('Answer the checkpoints in the lesson and the final questions to continue.');
        revealUnfinished();
        return;
      }
      const firstTime = !completedSheets.has(currentSheetIndex);
      const finishedSheet = currentSheetIndex;
      if (window.BAJourney && typeof window.BAJourney.markSheetComplete === 'function') {
        window.BAJourney.markSheetComplete(currentSheetIndex);
        completedSheets = new Set((window.BAJourney.load().completedSheets || []).map(Number));
      } else {
        completedSheets.add(currentSheetIndex);
        try {
          localStorage.setItem('daniel_historicist_mastery', JSON.stringify(Array.from(completedSheets)));
        } catch (e) {}
      }
      if (window.Insights) {
        window.Insights.track('sitting_complete', currentSheetIndex, { seconds: window.Insights.activeSeconds() });
        window.Insights.notePulse(currentSheetIndex);
        if (currentSheetIndex === sheetsData.length - 1) {
          window.Insights.track('course_complete', currentSheetIndex);
          window.Insights.maybePulse();
        }
      }
      if (firstTime) showSittingCelebration(finishedSheet);

      if (currentSheetIndex < sheetsData.length - 1) {
        loadSheet(currentSheetIndex + 1);
        if (!celebrationFor(finishedSheet)) {
          showToast('Unit mastered! Advancing to ' + (window.BAJourney ? window.BAJourney.sheetLabel(currentSheetIndex) : ('sheet ' + (currentSheetIndex + 1))) + '.');
        }
      } else {
        if (!celebrationFor(finishedSheet)) {
          showToast("Congratulations! You have mastered the entire Historicist Shelf of Daniel!");
        }
        syncCertificateCta();
        openCertificateIfReady();
      }
    }

    /* =========================================================================
       7. KEYBOARD SHORTCUTS & INITIALIZATION
       ========================================================================= */
    document.addEventListener('bookreader:continue', () => enterSittingPhase('tasks'));
    document.addEventListener('bookreader:held', () => {
      showToast('Answer this checkpoint before you turn the page.');
    });

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
      if (window.BAJourney && typeof window.BAJourney.previewAllContent === 'function' && window.BAJourney.previewAllContent()) return index;
      if (window.BAJourney && typeof window.BAJourney.clampToAccessible === 'function') {
        return window.BAJourney.clampToAccessible(index);
      }
      return canAccessSheet(index) ? index : 0;
    }

    function resolveStartSheet() {
      try {
        const params = new URLSearchParams(location.search);
        let raw = params.get('id') || params.get('section') || params.get('sheet') || params.get('s');
        if (raw == null || raw === '') {
          try {
            const refSitting = localStorage.getItem('baReferredSitting');
            if (refSitting != null && refSitting !== '') {
              raw = refSitting;
              localStorage.removeItem('baReferredSitting');
            }
          } catch (e) {}
        }
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
      if (accessEnable) {
        accessEnable.addEventListener('click', () => {
          const local = window.BAJourney && typeof window.BAJourney.isLocalDevHost === 'function' && window.BAJourney.isLocalDevHost();
          const admin = window.ScrollAuth && typeof window.ScrollAuth.isAdmin === 'function' && window.ScrollAuth.isAdmin();
          if (!local && !admin) {
            if (window.BAJourney && typeof window.BAJourney.announceLock === 'function') {
              window.BAJourney.announceLock('preview', 0);
            }
            return;
          }
          if (window.BAJourney && typeof window.BAJourney.enablePreview === 'function') {
            window.BAJourney.enablePreview();
          }
          const u = new URL(location.href);
          u.searchParams.set('preview', 'full');
          location.href = u.toString();
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
          if (window.Insights) window.Insights.track('path_step', currentSheetIndex, { step: 'map' });
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
          if (window.StudySync) window.StudySync.recordNote(currentSheetIndex, notes.value);
        });
      }
      window.addEventListener('ba-study-synced', () => {
        const notesEl = document.getElementById('sheet-notes');
        if (notesEl && document.activeElement !== notesEl) {
          try { notesEl.value = localStorage.getItem('baNote-' + currentSheetIndex) || ''; } catch (e) {}
        }
      });
      const btnBm = document.getElementById('btn-bookmark-sheet');
      if (btnBm) btnBm.addEventListener('click', () => {
        try {
          const list = JSON.parse(localStorage.getItem('baStudyBookmarks') || '[]');
          if (!list.includes(currentSheetIndex)) list.push(currentSheetIndex);
          localStorage.setItem('baStudyBookmarks', JSON.stringify(list));
          if (window.StudySync) window.StudySync.recordBookmarks(list);
          showToast('Sheet bookmarked' + (window.StudySync ? ' and synced to your account' : ' on this device'));
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
          if (window.Insights) window.Insights.track('feature_use', currentSheetIndex, { feature: 'print' });
          window.print();
        });
      }
      const verifyHost = document.getElementById('sheet-verify');
      if (verifyHost && !verifyHost.dataset.tracked) {
        verifyHost.dataset.tracked = 'true';
        verifyHost.addEventListener('click', (e) => {
          const link = e.target.closest('.sheet-verify-open');
          if (link && window.Insights) window.Insights.track('feature_use', currentSheetIndex, { feature: 'verify' });
        });
      }
      const audioPlayer = document.getElementById('lesson-audio-player');
      if (audioPlayer && !audioPlayer.dataset.tracked) {
        audioPlayer.dataset.tracked = 'true';
        audioPlayer.addEventListener('play', () => {
          if (window.Insights) window.Insights.track('feature_use', currentSheetIndex, { feature: 'audio' });
        });
        audioPlayer.addEventListener('timeupdate', () => {
          AudioReader.sync(audioPlayer.currentTime);
        });
      }
      ['lesson-infographic-download', 'infographic-modal-download'].forEach((id) => {
        const link = document.getElementById(id);
        if (link && !link.dataset.tracked) {
          link.dataset.tracked = 'true';
          link.addEventListener('click', () => {
            if (window.Insights) window.Insights.track('feature_use', currentSheetIndex, { feature: 'infographic_download' });
          });
        }
      });
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
      showSittingCelebration,
      shareSitting,
      resetQuizQuestion,
      openInfographic,
      closeInfographic
    });
