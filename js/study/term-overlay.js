/* Term Overlay: the full-page card reader for glossary terms and Strong's
   words. A page-level view, because ancestors with overflow (diagram <pre>,
   scroll panes) clip a popover.
   Back, Esc, the veil and the browser's Back all return to the reading
   position. */
(function () {
  var overlay = null;
  var lastTrigger = null;
  var historyPushed = false;
  var closingNode = null;
  var backPending = false;



  function esc(s) { return window.SiteCore.escapeHtml(s); }

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
      ? '<img src="' + esc(item.image) + '" alt="" data-drop-on-error>'
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
        refList('Proof & sources', item.proof || []) +
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
    if (overlay && backPending) teardown();
    else if (overlay) close(true);
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

  function trapFocus(e) { window.SiteCore.trapFocus(overlay, e); }

  function onPopstate() {
    var isReopened = !!(overlay && backPending && closingNode && overlay !== closingNode);
    closingNode = null;
    backPending = false;
    historyPushed = false;
    if (isReopened) {
      try { history.pushState({ termPage: true }, '', location.href); historyPushed = true; } catch (e) {}
      return;
    }
    if (overlay) teardown();
  }

  function close(fromHistory) {
    if (!overlay || backPending) return;
    if (historyPushed && !fromHistory) {
      backPending = true;
      closingNode = overlay;
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
