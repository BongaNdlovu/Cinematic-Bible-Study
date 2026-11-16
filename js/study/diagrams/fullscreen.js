    /* Full screen for table, comparison and timeline: one shell puts `position:
       fixed; inset: 0` on the block, with no reparenting and no second render
       path.
       These three need it because narrowing breaks what carries their meaning
       (row labels, column alignment, scale); a chain reflows. The shell owns
       the frame and variables; each renderer owns its content.
       Escape: the layer registers in anotherLayerOwnsEscape(), so one press
       closes the innermost layer. */
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

      /* The header and footer exist only in full screen, so they are created on
         enter and removed on exit, not toggled. The layer is a three-row grid:
         title above the plate, note below it. */
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
        document.querySelectorAll('.insight-card, .audio-orb').forEach((el) => {
          if (!el.hasAttribute('inert')) { el.setAttribute('inert', ''); el.setAttribute('data-dfx-inert', ''); }
        });
        const replayBtn = replayControlFor(figure);
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
      /* A sitting switch replaces #sheet-article before any teardown can run.
         The listener is on the button, so a detached figure cannot fire it; the
         renderer clears the <html> class before rewriting the article. */
      figure.__diagramFs = { exit: exit, isFull: () => figure.classList.contains('is-full') };
    }

    /* Tear down what each figure mounted, before its markup is replaced. A
       sitting switch rewrites #sheet-article, which creates new figures: the old
       ones are never rendered again, so their mindmap (observers on the body, a
       frame loop) and story reader (a document listener) would otherwise live on
       and keep the whole detached article reachable. */
    function releaseFigureFullscreen(figure) {
      const fs = figure.__diagramFs;
      if (fs && typeof fs.isFull === 'function' && fs.isFull()) fs.exit(false);
      figure.__diagramFs = null;
    }

    function releaseFullscreenLeftovers() {
      if (document.querySelector('.chain.is-full, .mm.is-full')) return;
      document.documentElement.classList.remove('dfx-open', 'dfx-cite-open');
      document.querySelectorAll('[data-dfx-inert]').forEach((el) => {
        el.removeAttribute('inert');
        el.removeAttribute('data-dfx-inert');
      });
    }
