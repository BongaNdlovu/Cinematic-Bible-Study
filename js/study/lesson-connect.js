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
      const text = 'Join this sitting of the Shelf of Daniel. Agree to the terms and sign in to begin.';
      const sent = (method, message) => {
        if (window.Insights) window.Insights.track('invite_shared', currentSheetIndex, { method: method });
        showToast(message);
      };
      if (navigator.share) {
        try {
          await navigator.share({ title: title, text: text, url: url });
          sent('share', 'Invitation ready to send.');
          return;
        } catch (err) {
          if (err && err.name === 'AbortError') return;
        }
      }
      if (navigator.clipboard && navigator.clipboard.writeText) {
        try {
          await navigator.clipboard.writeText(url);
          sent('clipboard', isFree ? 'Enrollment link copied.' : 'Enrollment link copied. Recipients sign in on the cover.');
          return;
        } catch (err) {}
      }
      sent('fallback', isFree ? 'Share this link: ' + url : 'Share the home page so they can sign in: ' + url);
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
        if ('IntersectionObserver' in window) {
          new IntersectionObserver((entries) => {
            entries.forEach((entry) => shareBtn.classList.toggle('is-offscreen', !entry.isIntersecting));
          }, { rootMargin: '120px 0px' }).observe(shareBtn);
        }
      }
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
