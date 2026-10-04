/*
 * Term Overlay — the full-page card reader.
 *
 * Clicking a dotted gold term (glossary entry) or a Strong's word used to
 * spawn a small popover anchored to the word. Any ancestor with overflow
 * (the prophecy-diagram <pre>, scroll panes) clipped it to pieces. This
 * module replaces that popover with a dedicated page-level view: the lesson
 * stays behind a darkened, blurred veil, the card sits on the left, the
 * information on the right, and a Back button (plus Esc, the veil, and the
 * browser's own Back) returns to the reading position.
 */
(function () {
  var overlay = null;
  var lastTrigger = null;
  var historyPushed = false;
  var suppressPopstate = false;
  var backPending = false;

  var CSS = [
    '.term-page-overlay {',
    '  position: fixed;',
    '  inset: 0;',
    '  z-index: 90;',
    '  display: flex;',
    '  align-items: center;',
    '  justify-content: center;',
    '  padding: clamp(0.75rem, 3vw, 2.5rem);',
    '  background: rgba(10, 8, 5, 0.72);',
    '  -webkit-backdrop-filter: blur(16px) saturate(0.85);',
    '  backdrop-filter: blur(16px) saturate(0.85);',
    '  animation: term-page-fade 0.22s ease;',
    '}',
    'html:not(.dark) .term-page-overlay {',
    '  background: rgba(46, 36, 20, 0.55);',
    '}',
    '.term-page-overlay.is-closing { animation: term-page-fade-out 0.18s ease forwards; }',
    '@keyframes term-page-fade { from { opacity: 0; } to { opacity: 1; } }',
    '@keyframes term-page-fade-out { from { opacity: 1; } to { opacity: 0; } }',
    '',
    '.term-page-panel {',
    '  position: relative;',
    '  width: min(1040px, 100%);',
    '  max-height: min(86vh, 780px);',
    '  display: grid;',
    '  grid-template-columns: minmax(240px, 330px) minmax(0, 1fr);',
    '  border-radius: 18px;',
    '  overflow: hidden;',
    '  border: 1px solid rgba(212, 175, 55, 0.45);',
    '  background: radial-gradient(ellipse at 18% 0%, rgba(212, 175, 55, 0.14), transparent 55%), #17130d;',
    '  color: #f3ead8;',
    '  box-shadow: 0 0 44px rgba(212, 175, 55, 0.2), 0 28px 70px rgba(0, 0, 0, 0.6);',
    '  animation: term-page-rise 0.24s ease;',
    '}',
    'html:not(.dark) .term-page-panel {',
    '  border-color: rgba(146, 106, 22, 0.5);',
    '  background: radial-gradient(ellipse at 18% 0%, rgba(217, 119, 6, 0.1), transparent 55%), #fdfaf2;',
    '  color: #241d12;',
    '  box-shadow: 0 28px 70px rgba(64, 44, 10, 0.35);',
    '}',
    '@keyframes term-page-rise {',
    '  from { opacity: 0; transform: translateY(14px) scale(0.985); }',
    '  to { opacity: 1; transform: translateY(0) scale(1); }',
    '}',
    '.term-page-overlay.is-closing .term-page-panel { animation: term-page-sink 0.18s ease forwards; }',
    '@keyframes term-page-sink {',
    '  from { opacity: 1; transform: translateY(0) scale(1); }',
    '  to { opacity: 0; transform: translateY(10px) scale(0.985); }',
    '}',
    '',
    '/* Left column — the card */',
    '.term-page-card {',
    '  display: flex;',
    '  flex-direction: column;',
    '  min-height: 0;',
    '  overflow: hidden;',
    '  border-right: 1px solid rgba(212, 175, 55, 0.25);',
    '  background: linear-gradient(180deg, rgba(212, 175, 55, 0.07), transparent 45%);',
    '}',
    'html:not(.dark) .term-page-card {',
    '  border-right-color: rgba(146, 106, 22, 0.25);',
    '  background: linear-gradient(180deg, rgba(217, 119, 6, 0.06), transparent 45%);',
    '}',
    '.term-page-plate {',
    '  position: relative;',
    '  margin: 1.4rem 1.4rem 0;',
    '  border-radius: 12px;',
    '  overflow: hidden;',
    '  border: 1px solid rgba(212, 175, 55, 0.4);',
    '  box-shadow: 0 10px 26px rgba(0, 0, 0, 0.45);',
    '  aspect-ratio: 3 / 4;',
    '  max-height: 46vh;',
    '  background: linear-gradient(160deg, rgba(212, 175, 55, 0.2), rgba(23, 19, 13, 0.9));',
    '  flex-shrink: 0;',
    '}',
    'html:not(.dark) .term-page-plate {',
    '  border-color: rgba(146, 106, 22, 0.4);',
    '  background: linear-gradient(160deg, rgba(217, 119, 6, 0.16), rgba(253, 250, 242, 0.9));',
    '  box-shadow: 0 10px 26px rgba(84, 60, 16, 0.25);',
    '}',
    '.term-page-plate img {',
    '  position: absolute;',
    '  inset: 0;',
    '  width: 100%;',
    '  height: 100%;',
    '  object-fit: cover;',
    '  display: block;',
    '}',
    '.term-page-plate-fallback {',
    '  position: absolute;',
    '  inset: 0;',
    '  display: flex;',
    '  align-items: center;',
    '  justify-content: center;',
    '  font-family: Newsreader, Georgia, serif;',
    '  font-size: 4.6rem;',
    '  color: rgba(212, 175, 55, 0.85);',
    '}',
    'html:not(.dark) .term-page-plate-fallback { color: rgba(146, 106, 22, 0.75); }',
    '.term-page-card-body { padding: 1.1rem 1.4rem 1.4rem; }',
    '.term-page-kind {',
    '  display: inline-block;',
    '  font-family: "JetBrains Mono", monospace;',
    '  font-size: 10px;',
    '  letter-spacing: 0.18em;',
    '  text-transform: uppercase;',
    '  color: #e5c158;',
    '  border: 1px solid rgba(212, 175, 55, 0.45);',
    '  border-radius: 999px;',
    '  padding: 0.28rem 0.7rem;',
    '  margin-bottom: 0.6rem;',
    '}',
    'html:not(.dark) .term-page-kind { color: #926a16; border-color: rgba(146, 106, 22, 0.45); }',
    '.term-page-card-title {',
    '  font-family: Newsreader, Georgia, serif;',
    '  font-size: 1.35rem;',
    '  line-height: 1.25;',
    '  margin: 0 0 0.5rem;',
    '}',
    '.term-page-alias { margin: 0; font-size: 12px; line-height: 1.6; opacity: 0.72; }',
    '.term-page-alias b {',
    '  font-family: "JetBrains Mono", monospace;',
    '  font-size: 9px;',
    '  letter-spacing: 0.14em;',
    '  text-transform: uppercase;',
    '  font-weight: 600;',
    '  opacity: 0.9;',
    '}',
    '',
    '/* Right column — the information */',
    '.term-page-info {',
    '  min-height: 0;',
    '  overflow-y: auto;',
    '  padding: 1.7rem 1.9rem 1.6rem;',
    '}',
    '.term-page-kicker {',
    '  font-family: "JetBrains Mono", monospace;',
    '  font-size: 10px;',
    '  letter-spacing: 0.2em;',
    '  text-transform: uppercase;',
    '  color: #d4af37;',
    '  margin: 0 0 0.45rem;',
    '}',
    'html:not(.dark) .term-page-kicker { color: #926a16; }',
    '.term-page-title {',
    '  font-family: Newsreader, Georgia, serif;',
    '  font-size: clamp(1.5rem, 2.6vw, 2.05rem);',
    '  line-height: 1.15;',
    '  margin: 0 0 1.05rem;',
    '}',
    '.term-page-rule {',
    '  border: 0;',
    '  height: 1px;',
    '  margin: 0 0 1.05rem;',
    '  background: linear-gradient(90deg, rgba(212, 175, 55, 0.55), rgba(212, 175, 55, 0.08));',
    '}',
    'html:not(.dark) .term-page-rule { background: linear-gradient(90deg, rgba(146, 106, 22, 0.5), rgba(146, 106, 22, 0.08)); }',
    '.term-page-label {',
    '  font-family: "JetBrains Mono", monospace;',
    '  font-size: 9.5px;',
    '  letter-spacing: 0.16em;',
    '  text-transform: uppercase;',
    '  opacity: 0.62;',
    '  margin: 1.1rem 0 0.4rem;',
    '}',
    '.term-page-plain {',
    '  font-size: 1.02rem;',
    '  line-height: 1.65;',
    '  margin: 0;',
    '}',
    '.term-page-deep {',
    '  font-size: 0.93rem;',
    '  line-height: 1.7;',
    '  opacity: 0.88;',
    '  margin: 0;',
    '}',
    '.term-page-lemma {',
    '  font-family: Newsreader, Georgia, serif;',
    '  font-size: 1.3rem;',
    '  margin: 0.15rem 0 0.2rem;',
    '}',
    '.term-page-lemma i { font-size: 0.85em; opacity: 0.75; }',
    '.term-page-meta {',
    '  font-family: "JetBrains Mono", monospace;',
    '  font-size: 11px;',
    '  opacity: 0.7;',
    '  margin: 0 0 0.9rem;',
    '}',
    '.term-page-refs { list-style: none; margin: 0; padding: 0; display: flex; flex-wrap: wrap; gap: 0.35rem; }',
    '.term-page-refs li {',
    '  font-family: "JetBrains Mono", monospace;',
    '  font-size: 10.5px;',
    '  letter-spacing: 0.05em;',
    '  border: 1px solid rgba(212, 175, 55, 0.3);',
    '  border-radius: 6px;',
    '  padding: 0.22rem 0.5rem;',
    '  opacity: 0.85;',
    '}',
    'html:not(.dark) .term-page-refs li { border-color: rgba(146, 106, 22, 0.3); }',
    '.term-page-actions {',
    '  display: flex;',
    '  flex-wrap: wrap;',
    '  gap: 0.6rem;',
    '  margin-top: 1.5rem;',
    '  padding-top: 1.2rem;',
    '  border-top: 1px solid rgba(212, 175, 55, 0.22);',
    '}',
    'html:not(.dark) .term-page-actions { border-top-color: rgba(146, 106, 22, 0.22); }',
    '.term-page-btn {',
    '  font-family: "JetBrains Mono", monospace;',
    '  font-size: 10.5px;',
    '  letter-spacing: 0.14em;',
    '  text-transform: uppercase;',
    '  border: 1px solid rgba(212, 175, 55, 0.5);',
    '  background: rgba(212, 175, 55, 0.1);',
    '  color: #edda9a;',
    '  border-radius: 9px;',
    '  padding: 0.55rem 1rem;',
    '  cursor: pointer;',
    '  transition: background-color 0.15s ease, border-color 0.15s ease;',
    '}',
    '.term-page-btn:hover, .term-page-btn:focus-visible { background: rgba(212, 175, 55, 0.22); border-color: #d4af37; outline: none; }',
    'html:not(.dark) .term-page-btn {',
    '  border-color: rgba(146, 106, 22, 0.5);',
    '  background: rgba(217, 119, 6, 0.08);',
    '  color: #7a5a10;',
    '}',
    'html:not(.dark) .term-page-btn:hover, html:not(.dark) .term-page-btn:focus-visible { background: rgba(217, 119, 6, 0.16); border-color: #926a16; }',
    '',
    '/* Chrome: back button + close */',
    '.term-page-back {',
    '  position: fixed;',
    '  top: clamp(0.9rem, 2.4vh, 1.5rem);',
    '  left: clamp(0.9rem, 2.4vw, 1.5rem);',
    '  z-index: 2;',
    '  display: inline-flex;',
    '  align-items: center;',
    '  gap: 0.5rem;',
    '  font-family: "JetBrains Mono", monospace;',
    '  font-size: 11px;',
    '  letter-spacing: 0.14em;',
    '  text-transform: uppercase;',
    '  color: #f3ead8;',
    '  background: rgba(23, 19, 13, 0.72);',
    '  border: 1px solid rgba(212, 175, 55, 0.45);',
    '  border-radius: 999px;',
    '  padding: 0.55rem 1.05rem 0.55rem 0.8rem;',
    '  cursor: pointer;',
    '  transition: background-color 0.15s ease, border-color 0.15s ease, transform 0.15s ease;',
    '}',
    '.term-page-back:hover, .term-page-back:focus-visible {',
    '  background: rgba(50, 40, 22, 0.9);',
    '  border-color: #d4af37;',
    '  outline: none;',
    '  transform: translateX(-2px);',
    '}',
    '.term-page-back .term-page-back-arrow { font-size: 13px; line-height: 1; }',
    'html:not(.dark) .term-page-back {',
    '  color: #241d12;',
    '  background: rgba(253, 250, 242, 0.82);',
    '  border-color: rgba(146, 106, 22, 0.5);',
    '}',
    'html:not(.dark) .term-page-back:hover, html:not(.dark) .term-page-back:focus-visible { background: #fff; border-color: #926a16; }',
    '.term-page-close {',
    '  position: absolute;',
    '  top: 0.85rem;',
    '  right: 0.85rem;',
    '  z-index: 2;',
    '  width: 32px;',
    '  height: 32px;',
    '  display: grid;',
    '  place-items: center;',
    '  font-size: 15px;',
    '  line-height: 1;',
    '  border-radius: 999px;',
    '  border: 1px solid rgba(212, 175, 55, 0.35);',
    '  background: rgba(23, 19, 13, 0.6);',
    '  color: inherit;',
    '  cursor: pointer;',
    '}',
    '.term-page-close:hover, .term-page-close:focus-visible { border-color: #d4af37; background: rgba(212, 175, 55, 0.16); outline: none; }',
    'html:not(.dark) .term-page-close { background: rgba(253, 250, 242, 0.7); border-color: rgba(146, 106, 22, 0.35); }',
    '',
    'body.term-page-open { overflow: hidden; }',
    '',
    '@media (max-width: 760px) {',
    '  .term-page-panel { grid-template-columns: 1fr; max-height: calc(100vh - 2rem); overflow-y: auto; }',
    '  .term-page-card { border-right: 0; border-bottom: 1px solid rgba(212, 175, 55, 0.25); }',
    '  html:not(.dark) .term-page-card { border-bottom-color: rgba(146, 106, 22, 0.25); }',
    '  .term-page-plate { margin: 1.2rem 1.2rem 0; aspect-ratio: 16 / 9; }',
    '  .term-page-plate-fallback { font-size: 3rem; }',
    '  .term-page-info { padding: 1.25rem 1.2rem 5rem; overflow-y: visible; }',
    '  .term-page-back { top: auto; bottom: clamp(0.9rem, 2.4vh, 1.5rem); }',
    '}',
    '@media (prefers-reduced-motion: reduce) {',
    '  .term-page-overlay, .term-page-panel, .term-page-overlay.is-closing .term-page-panel { animation: none; }',
    '  .term-page-back { transition: none; }',
    '}'
  ].join('\n');

  function ensureCss() {
    if (document.getElementById('term-page-style')) return;
    var tag = document.createElement('style');
    tag.id = 'term-page-style';
    tag.textContent = CSS;
    document.head.appendChild(tag);
  }

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function kindLabel(kind) {
    if (kind === 'person') return 'Person';
    if (kind === 'place') return 'Place';
    return 'Word';
  }

  function cardSide(item) {
    var initial = (item.term || '?').trim().charAt(0).toUpperCase();
    // The fallback letter sits under the photo; if the plate fails to load it
    // removes itself and the letter shows through.
    var img = item.image
      ? '<img src="' + esc(item.image) + '" alt="" onerror="this.remove()">'
      : '';
    var aliases = (item.aliases || []).filter(function (a) { return a && String(a).trim(); });
    return (
      '<div class="term-page-card">' +
        '<div class="term-page-plate">' +
          '<div class="term-page-plate-fallback" aria-hidden="true">' + esc(initial) + '</div>' + img +
        '</div>' +
        '<div class="term-page-card-body">' +
          '<span class="term-page-kind">' + esc(kindLabel(item.kind)) + ' · Desk index</span>' +
          '<h4 class="term-page-card-title">' + esc(item.term) + '</h4>' +
          (aliases.length ? '<p class="term-page-alias"><b>Also called</b> — ' + esc(aliases.join(', ')) + '</p>' : '') +
        '</div>' +
      '</div>'
    );
  }

  function infoSide(item) {
    return (
      '<div class="term-page-info">' +
        '<p class="term-page-kicker">From the study glossary</p>' +
        '<h3 class="term-page-title" id="term-page-heading">' + esc(item.term) + '</h3>' +
        '<hr class="term-page-rule">' +
        '<p class="term-page-label">In plain words</p>' +
        '<p class="term-page-plain">' + esc(item.simple) + '</p>' +
        '<p class="term-page-label">The deeper record</p>' +
        '<p class="term-page-deep">' + esc(item.history) + '</p>' +
        '<div class="term-page-actions">' +
          '<button type="button" class="term-page-btn" data-term-index="' + esc(item.id) + '">Open in the full index</button>' +
        '</div>' +
      '</div>'
    );
  }

  function refList(label, refs) {
    if (!refs || !refs.length) return '';
    return (
      '<p class="term-page-label">' + esc(label) + '</p>' +
      '<ul class="term-page-refs">' + refs.map(function (r) { return '<li>' + esc(typeof r === 'string' ? r : (r && r.ref) || '') + '</li>'; }).join('') + '</ul>'
    );
  }

  function strongsSides(lemmaId, entry) {
    var card =
      '<div class="term-page-card">' +
        '<div class="term-page-plate"><div class="term-page-plate-fallback" aria-hidden="true">' + esc((entry.lemma || lemmaId).charAt(0)) + '</div></div>' +
        '<div class="term-page-card-body">' +
          '<span class="term-page-kind">' + esc((entry.lang || 'Hebrew') + ' · Strong’s ' + esc(lemmaId)) + '</span>' +
          '<h4 class="term-page-card-title">' + esc(entry.lemma || lemmaId) + '</h4>' +
          (entry.translit ? '<p class="term-page-alias"><b>Transliteration</b> — ' + esc(entry.translit) + '</p>' : '') +
        '</div>' +
      '</div>';
    var info =
      '<div class="term-page-info">' +
        '<p class="term-page-kicker">Strong’s concordance</p>' +
        '<h3 class="term-page-title" id="term-page-heading">' + esc(lemmaId) + ' · ' + esc(entry.translit || entry.lemma || '') + '</h3>' +
        '<hr class="term-page-rule">' +
        (entry.lemma ? '<p class="term-page-lemma">' + esc(entry.lemma) + ' <i>' + esc(entry.translit || '') + '</i></p>' : '') +
        '<p class="term-page-meta">' + esc(entry.lang || 'Hebrew') + (entry.gloss ? ' — ' + esc(entry.gloss) : '') + '</p>' +
        (entry.derivation ? '<p class="term-page-label">Form of the word</p><p class="term-page-deep">' + esc(entry.derivation) + '</p>' : '') +
        (entry.why ? '<p class="term-page-label">Why it matters here</p><p class="term-page-plain">' + esc(entry.why) + '</p>' : '') +
        refList('In Daniel', entry.danielHits) +
        refList('Elsewhere in the KJV', entry.otherKjv) +
      '</div>';
    return { card: card, info: info };
  }

  function open(payload, trigger) {
    ensureCss();
    if (overlay) close(true);
    lastTrigger = trigger || (document.activeElement && document.activeElement.closest ? document.activeElement : null) || null;

    var sides;
    var heading;
    if (payload.type === 'strongs') {
      sides = strongsSides(payload.lemmaId, payload.entry || {});
      heading = 'Strong’s ' + payload.lemmaId;
    } else {
      sides = { card: cardSide(payload.item), info: infoSide(payload.item) };
      heading = payload.item.term;
    }

    overlay = document.createElement('div');
    overlay.className = 'term-page-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', heading);
    overlay.innerHTML =
      '<button type="button" class="term-page-back" data-term-page-back><span class="term-page-back-arrow" aria-hidden="true">←</span> Back to the lesson</button>' +
      '<div class="term-page-panel">' +
        '<button type="button" class="term-page-close" data-term-page-close aria-label="Close term page">✕</button>' +
        sides.card +
        sides.info +
      '</div>';
    document.body.appendChild(overlay);
    document.body.classList.add('term-page-open');

    overlay.addEventListener('click', function (e) {
      e.stopPropagation(); // the page underneath must not react to overlay controls
      if (e.target === overlay) { close(); return; }
      if (e.target.closest('[data-term-page-back]') || e.target.closest('[data-term-page-close]')) { close(); return; }
      var indexBtn = e.target.closest('[data-term-index]');
      if (indexBtn) {
        var id = indexBtn.getAttribute('data-term-index');
        close();
        if (window.GlossaryIndex) window.GlossaryIndex.openIndex(id);
      }
    });
    overlay.addEventListener('keydown', trapFocus);

    document.addEventListener('keydown', onKeydown, true);
    window.addEventListener('popstate', onPopstate);
    if (!historyPushed) {
      try { history.pushState({ termPage: true }, '', location.href); historyPushed = true; } catch (e) {}
    }

    var backBtn = overlay.querySelector('[data-term-page-back]');
    if (backBtn) backBtn.focus();
  }

  function onKeydown(e) {
    if (!overlay) return;
    if (e.key === 'Escape') { e.stopPropagation(); close(); }
  }

  function trapFocus(e) {
    if (e.key !== 'Tab' || !overlay) return;
    var focusables = overlay.querySelectorAll('button, [href], input, [tabindex]:not([tabindex="-1"])');
    if (!focusables.length) return;
    var first = focusables[0];
    var last = focusables[focusables.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }

  function onPopstate() {
    if (suppressPopstate) { suppressPopstate = false; historyPushed = false; return; }
    if (overlay) { historyPushed = false; backPending = false; teardown(); }
  }

  function close(fromHistory) {
    if (!overlay || backPending) return;
    if (historyPushed && !fromHistory) {
      // Route through history so the browser Back press and the button behave
      // the same way; popstate performs the actual teardown.
      backPending = true;
      history.back();
      return;
    }
    teardown();
  }

  function teardown() {
    if (!overlay) return;
    var node = overlay;
    overlay = null;
    document.body.classList.remove('term-page-open');
    document.removeEventListener('keydown', onKeydown, true);
    window.removeEventListener('popstate', onPopstate);
    node.classList.add('is-closing');
    setTimeout(function () { node.remove(); }, 190);
    if (lastTrigger && lastTrigger.focus) {
      try { lastTrigger.focus(); } catch (e) {}
    }
    lastTrigger = null;
  }

  window.TermOverlay = {
    open: open,
    close: function () { close(); },
    isOpen: function () { return !!overlay; }
  };
})();
