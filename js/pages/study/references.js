    export function escapeStudy(value) { return window.SiteCore.escapeHtml(value); }

    export function escapeVerify(text) { return window.SiteCore.escapeHtml(text); }

    export function verifyKindLabel(kind) {
      if (kind === 'history') return 'Historical source';
      if (kind === 'inscription') return 'Inscription / chronicle';
      if (kind === 'commentary') return 'Dated reader';
      return 'Scripture';
    }

    export function verifyKindClass(kind) {
      if (kind === 'history' || kind === 'inscription' || kind === 'commentary' || kind === 'scripture') return kind;
      return 'scripture';
    }

    export function verifyOpenHref(href) {
      const s = String(href || '');
      return /^https:\/\//i.test(s) ? s : '';
    }

    export function autoScriptureHref(it) {
      if (it.kind !== 'scripture') return '';
      const head = String(it.source || '').split(',')[0].trim();
      if (!/\d/.test(head)) return '';
      return 'https://www.biblegateway.com/passage/?search=' + encodeURIComponent(head) + '&version=KJV';
    }

    /* Turns SHEET_VERIFY[n] into the reference list the prose cites. Each item
       gets a stable id (ref-<sheet>-<i>) and, for Scripture, chapter/verse
       slots.
       Verses are read from the digits after each colon, not by splitting on
       commas: "Daniel 7:8, 24" is one reference with two verses. */
    export function normalBook(name) {
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

    export function parseSourceRefs(source) {
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

    export function referenceIndex(sheetIndex) {
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
    export function findRefForVerse(bySlot, ranges, book, chapter, verse) {
      const exact = bySlot.get(book + ' ' + chapter + ':' + verse);
      if (exact) return exact;
      for (let i = 0; i < ranges.length; i++) {
        const r = ranges[i];
        if (r.book === book && String(r.chapter) === String(chapter) && verse >= r.lo && verse <= r.hi) return r.ref;
      }
      return null;
    }

    // Wrap "(Daniel 1:2)" style citations in the prose so they jump to the list.
    export function decorateCitations(root, refs) {
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
          if (el.closest('blockquote, nav.lesson-toc, .cite-ref, .mm, a, button, svg, [hidden], .chain-ascii')) return NodeFilter.FILTER_REJECT;
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

    // A diagram's citation opens the same reference row the prose markers use.
    export function resolveCiteLabel(label) {
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

    export function renderSheetVerify(index) {
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

    /* In a full-screen layer the reference list shows as a panel, so it needs a
       Close control; in the column it is part of the page and needs none.
       citePanelOpen() reads the arming class, not the layer's, so the panel
       does not cover the chips that open it. */
    export function citePanelOpen() {
      return document.documentElement.classList.contains('dfx-cite-open');
    }

    export function syncCiteClose() {
      const box = document.getElementById('sheet-verify');
      if (!box) return;
      const btn = box.querySelector('[data-cite-close]');
      if (btn) btn.hidden = !citePanelOpen();
    }

    export function closeCitePanel() {
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

    /* The panel (z-index 240) owns Escape and marks the event handled. The mark
       matters: this and the layer's handler are capture listeners on the same
       node, and stopPropagation() does not stop listeners on that node, so
       without it one Escape closes both. */
    export function onCitePanelKey(event) {
      if (event.key !== 'Escape' || !citePanelOpen()) return;
      event.preventDefault();
      event.stopPropagation();
      event.__citePanelHandled = true;
      closeCitePanel();
    }

    // Citation markers jump to the reference list and open that row.
    export function revealReference(id) {
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
