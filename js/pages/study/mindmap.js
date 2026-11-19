/* MindMap: the mindmap figure inside a study lesson (a classic script, like the
   rest of js/pages/study/).
     window.MindMap.create(host, spec, opts) -> { destroy, resize, refresh }
     opts.cite diagramCite() from study-app.js, so a node's `cite` renders as
     the shared chip; without it the reference prints flat.
     opts.canResolve the sitting's reference resolver, passed through.
   renderSheet() rebuilds the article on every sitting switch, so destroy() must
   remove the DOM, timers, frames and observers.
   Keyboard: the host claims arrows, Enter/Space and Escape only. Every word
   rendered comes from a spec field, except the four connector words and control
   labels. */
(function () {
  'use strict';

  const { CORE_D, CONNECTORS, connectorWord, place } = window.MindMapLayout;
  const { IDLE_MS } = window.MindMapRender;

  function create(host, spec, opts) {
    if (!host || !spec) return null;
    const options = opts || {};
    const citeFn = typeof options.cite === 'function' ? options.cite : null;
    const canResolve = options.canResolve;
    const steps = Array.isArray(spec.steps) ? spec.steps : [];
    if (!steps.length) return null;

    const model = place(steps);
    const byId = new Map(model.map((item) => [item.id, item]));
    const title = String(spec.title || '');

    /* Cross-links come from spec.links[]. Same side: solid, in authored order.
       Opposite sides: dashed, under the centre. A declared `route` wins. */
    const links = (Array.isArray(spec.links) ? spec.links : []).map((link, i) => {
      const from = byId.get(String((link && link.from) || ''));
      const to = byId.get(String((link && link.to) || ''));
      if (!from || !to || from === to) return null;
      const declared = String((link && link.route) || '');
      const route = declared === 'spine' || declared === 'vertical' || declared === 'under-centre'
        ? declared
        : (from.side === to.side ? 'spine' : 'under-centre');
      return { i, from, to, route, kind: String((link && link.kind) || '').toLowerCase(), word: connectorWord(link && link.kind) };
    }).filter(Boolean);

    const state = {
      compact: false,
      visible: false,
      reduced: !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches),
      full: false,
      inScene: false,
      scene: -1,
      tour: false,
      raf: 0,
      idle: 0,
      last: 0,
      started: 0,
      focus: '',
      tap: '',
      opener: null,
      width: 0,
      height: 0,
      coreRadius: CORE_D / 2,
      timers: []
    };
    let destroyed = false;
    const cam = { x: 0, y: 0, tx: 0, ty: 0, s: 1, ts: 1 };
    const pulses = [];
    const scenes = [];
    const cross = [];
    const dom = {};
    let pointerKind = 'mouse';                 // a tap selects, a click opens
    let replayEl = null;
    let observers = null;

    const reduceMQ = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
    const raf = window.requestAnimationFrame ? window.requestAnimationFrame.bind(window) : (cb) => window.setTimeout(cb, 16);
    const caf = window.cancelAnimationFrame ? window.cancelAnimationFrame.bind(window) : window.clearTimeout;

    const { build, closeScene, fit, openScene, setFocus, startLoop, startTour, stopLoop, stopTour, updateHud } = window.MindMapRender.make({ caf, cam, canResolve, citeFn, clearTimers, cross, dom, host, later, links, model, pulses, raf, scenes, spec, state, title, updateFull, wireBlock });
    function later(fn, ms) {
      const id = window.setTimeout(() => {
        state.timers = state.timers.filter((x) => x !== id);
        fn();
      }, ms);
      state.timers.push(id);
      return id;
    }

    function clearTimers() {
      state.timers.forEach((id) => window.clearTimeout(id));
      state.timers = [];
    }

    /* ── markup ─────────────────────────────────────────────────────────── */

    /* ── scenes ─────────────────────────────────────────────────────────── */

    /* ── the frame loop: camera parallax and the travelling light ───────── */

    /* ── wiring ─────────────────────────────────────────────────────────── */

    function branchOf(target) {
      const el = target && target.closest ? target.closest('.mm-branch') : null;
      return el ? el.getAttribute('data-mm') : '';
    }

    function onPointerDown(event) { pointerKind = event.pointerType || 'mouse'; }

    function onPointerOver(event) {
      if (state.inScene || state.compact) return;
      if (event.pointerType && event.pointerType !== 'mouse') return;
      const id = branchOf(event.target);
      if (id) setFocus(id);
    }

    function onPointerOut(event) {
      if (state.inScene || state.compact) return;
      const related = event.relatedTarget;
      if (related && related.closest && related.closest('.mm-branch')) return;
      if (!state.tap) setFocus('');
    }

    function onFocusIn(event) {
      const id = branchOf(event.target);
      if (id) setFocus(id);
    }

    function onFocusOut(event) {
      const next = event.relatedTarget;
      if (next && next.closest && next.closest('.mm-branch')) return;
      if (!state.tap) setFocus('');
    }

    function onPointerMove(event) {
      if (state.compact || state.reduced) return;
      if (event.pointerType === 'touch') return;
      const rect = host.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      cam.tx = -((event.clientX - rect.left) / rect.width - 0.5) * 18;
      cam.ty = -((event.clientY - rect.top) / rect.height - 0.5) * 12;
    }

    function onClick(event) {
      const target = event.target;
      const button = target.closest ? target.closest('[data-mm-open]') : null;
      if (button && host.contains(button)) {
        const id = button.getAttribute('data-mm-open');
        const index = model.findIndex((item) => item.id === id);
        if (index < 0) return;
        if (pointerKind !== 'mouse' && state.focus !== id) {
          state.tap = id;
          setFocus(id);
          return;
        }
        state.tap = '';
        openScene(index);
        return;
      }
      /* A cite chip's reference row sits below this layer (z-index 10 vs 180),
         so full screen exits first. study-app.js's handler, which runs after
         this one, scrolls the row into view. The film stays open. */
      if (state.full && target.closest && target.closest('.chain-cite')) {
        exitFull(true);
        return;
      }
      if (state.inScene && target.closest && target.closest('.mm-scene')) {
        if (!target.closest('.chain-cite')) closeScene();
        return;
      }
      if (state.inScene) { closeScene(); return; }
      /* In full screen, a press on the stage's ground (anything that is not
         chrome or a node) exits, as a press on the ground closes a film. */
      if (state.full) {
        const wrapper = dom.world ? dom.world.parentNode : null;
        if (wrapper && target.closest && wrapper.contains(target) && !target.closest('[data-mm-open]')) {
          exitFull(true);
          return;
        }
      }
      state.tap = '';
      setFocus('');
    }

    function onKey(event) {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      /* Another layer owns the keyboard while it is open. The story reader
         arbitrates with anotherLayerOwnsEscape() from its own capture-phase
         listener, which runs before this one; the modals below run their own. */
      if (document.querySelector('.story-read:not([hidden])')) return;
      /* While a block is full screen, the reference panel (html.dfx-cite-open,
         z-index 240) sits above the map (180) and owns Escape: one Escape
         closes the panel, the next the map. */
      if (document.documentElement.classList.contains('dfx-cite-open')) return;
      const modals = document.querySelectorAll('#infographic-modal, #certificate-review-modal, #certificate-panel');
      if ([...modals].some((modal) => !modal.hidden)) return;

      const key = event.key;
      if (key === 'Escape') {
        if (state.inScene) {
          /* This block is the innermost layer, so it owns Escape — the same
             claim the story reader makes when it is the one on top. */
          event.preventDefault();
          event.stopPropagation();
          closeScene();
          return;
        }
        if (state.full) {
          /* Escape takes one layer at a time: the film first, the map second.
             The reader is opened *from* the film's own cite chip, so the film
             is always closed before a reader exists; and while a reader is open
             the guard above has already stood this listener down, which is the
             other half of wireStory's `anotherLayerOwnsEscape()` contract —
             there, and here, one Escape closes exactly one thing. */
          event.preventDefault();
          event.stopPropagation();
          exitFull(true);
          return;
        }
        if (state.focus) { state.tap = ''; setFocus(''); }
        return;
      }
      if (key === 'Tab' && state.full) { trapFocus(event); return; }
      if (key === 'ArrowRight' || key === 'ArrowLeft' || key === 'ArrowUp' || key === 'ArrowDown') {
        event.preventDefault();
        const forward = key === 'ArrowRight' || key === 'ArrowDown';
        if (state.inScene) {
          openScene((state.scene + (forward ? 1 : model.length - 1)) % model.length);
          return;
        }
        const cards = Array.from(host.querySelectorAll('[data-mm-open]'));
        if (!cards.length) return;
        const at = cards.indexOf(document.activeElement);
        const next = at < 0
          ? (forward ? 0 : cards.length - 1)
          : (at + (forward ? 1 : -1) + cards.length) % cards.length;
        if (cards[next]) cards[next].focus();
        return;
      }
      /* Enter and Space activate a focused card natively. Space on the block
         itself must not scroll the page: the block is a focusable widget, and
         the page below it owns the arrow keys. */
      if ((key === ' ' || key === 'Spacebar') && document.activeElement === host) {
        event.preventDefault();
      }
    }

    /* Full screen uses `position: fixed; inset: 0` on the host, not the
       Fullscreen API. It escapes ancestor overflow, needs no user gesture and
       keeps Escape in the film → map order below; the API would give Escape to
       the browser.
       Only the host's box changes, so fit() (run by the host's ResizeObserver)
       does the rest. Stacking: 180, below the story reader (220), above the
       insight cards (~72). */

    function trapFocus(event) { window.SiteCore.trapFocus(host, event); }

    /* The page behind must not scroll while the view is open. The reader locks
       the same way, so this only ever removes the class it added: if a reader
       is still open on top (a reference row or a scene opened from a chip), the
       lock is its property and stays. */
    function unlockScroll() {
      if (document.querySelector('.story-read:not([hidden])')) return;
      document.documentElement.classList.remove('mm-fullscreen-open');
    }

    function onScroll() {
      if (!state.full) return;
      /* And if an engine scrolls the block anyway, the world would move off the
         origin fit() measured, so it is pinned back. */
      if (host.scrollTop) host.scrollTop = 0;
      if (host.scrollLeft) host.scrollLeft = 0;
    }

    /* A sitting switch replaces #sheet-article's innerHTML before destroy() can
       run, which would leave the page locked. The observer sees the detach and
       runs the same undo as destroy(). */
    let treeWatch = null;

    function watchTree(on) {
      if (!('MutationObserver' in window)) return;
      if (!treeWatch) treeWatch = new MutationObserver(onTreeChange);
      if (on) treeWatch.observe(document.body, { childList: true, subtree: true });
      else treeWatch.disconnect();
    }

    function onTreeChange() {
      if (!state.full || host.isConnected) return;
      watchTree(false);
      state.full = false;
      host.classList.remove('is-full');
      document.documentElement.classList.remove('mm-fullscreen-open');
    }

    function updateFull() {
      if (!dom.fs) return;
      dom.fs.setAttribute('aria-pressed', String(state.full));
      dom.fs.setAttribute('aria-label', state.full ? 'Exit full screen' : 'Full screen');
      const label = dom.fs.querySelector('.mm-lbl-fs');
      if (label) label.textContent = state.full ? 'Exit full screen' : 'Full screen';
    }

    function enterFull() {
      if (state.compact || state.full) return;
      state.full = true;
      watchTree(true);
      state.fsOpener = document.activeElement;
      /* The host becomes the whole of what is on screen. `role` and
         `aria-label` are restored from what the block had — the label is the
         diagram's own title and must survive — and nothing is invented for the
         heading, because the block has no heading contract to reuse. */
      state.hostRole = host.getAttribute('role') || 'group';
      host.classList.add('is-full');
      host.setAttribute('role', 'dialog');
      host.setAttribute('aria-modal', 'true');
      document.documentElement.classList.add('mm-fullscreen-open');
      updateFull();
      /* The class change has to be laid out before the deferred pass reads the
         box: the ResizeObserver dedupes on the size `fit()` last stored, so a
         read taken before the browser has laid the new box out would compare
         the full-screen box against itself and the observer would skip. */
      void host.offsetWidth;
      const after = () => {
        if (!destroyed && state.full) {
          fit();
          wake();
          if (dom.fs) dom.fs.focus({ preventScroll: true });
        }
      };
      raf(() => raf(after));
      later(after, 80);
    }

    function exitFull(refocus) {
      if (!state.full) return;
      state.full = false;
      watchTree(false);
      host.classList.remove('is-full');
      /* The overlay scrolls the block to bring a film's control into view. The
         class already un-makes the block a scroll container, but the offsets it
         left behind are put back to zero so the column comes up where it was. */
      if (host.scrollTop) host.scrollTop = 0;
      if (host.scrollLeft) host.scrollLeft = 0;
      host.setAttribute('role', state.hostRole || 'group');
      /* Not `aria-label`: the label belongs to the block's own title and is
         already there. An empty aria-modal is worse than none. */
      host.removeAttribute('aria-modal');
      const opener = state.fsOpener;
      state.fsOpener = null;
      updateFull();
      unlockScroll();
      if (refocus && opener && opener.isConnected && typeof opener.focus === 'function') {
        opener.focus({ preventScroll: true });
      } else if (refocus && host.contains(document.activeElement)) {
        if (typeof document.activeElement.blur === 'function') document.activeElement.blur();
      }
      if (destroyed) return;
      /* The column's geometry is restored by un-setting the class, so `fit()`
         has to run after the browser has laid the block out again — one frame
         after. The ResizeObserver usually gets there first and then no-ops,
         because its dedupe compares against the size `fit()` last stored; the
         reflow below is what makes that comparison see the column again. */
      state.width = 0;
      state.height = 0;
      void host.offsetWidth;
      raf(() => { if (!destroyed && !state.full) fit(); });
      later(() => { if (!destroyed && !state.full) fit(); }, 120);
    }

    function onFull() {
      if (state.full) exitFull(true);
      else enterFull();
    }

    function wake() {
      host.classList.remove('is-idle');
      window.clearTimeout(state.idle);
      state.idle = window.setTimeout(() => {
        if (!state.compact && !state.inScene) host.classList.add('is-idle');
      }, IDLE_MS);
    }

    function play() {
      state.visible = true;
      state.started = performance.now();
      if (state.reduced) {
        host.classList.add('is-visible');
      } else {
        host.classList.remove('is-visible');
        /* Two frames: one to commit the hidden state, one to start the run. */
        raf(() => { raf(() => host.classList.add('is-visible')); });
      }
      startLoop();
    }

    function onReplay(event) {
      if (event) event.preventDefault();
      closeScene(true);
      state.reduced = !!(reduceMQ && reduceMQ.matches);
      play();
    }

    function onReduceChange() {
      state.reduced = !!(reduceMQ && reduceMQ.matches);
      if (state.reduced) {
        host.classList.add('is-visible');
        stopLoop();
      } else if (state.visible) {
        startLoop();
      }
    }

    function onVisibility() {
      if (document.hidden) stopLoop();
      else if (state.visible && !state.reduced) startLoop();
    }

    function wireBlock() {
      model.forEach((item) => {
        item.branchEl = host.querySelector('.mm-branch[data-mm="' + item.id + '"]');
        item.headEl = item.branchEl ? item.branchEl.querySelector('.mm-head') : null;
        /* Leaves render in `item.leaves` order, one `.mm-leaf` each. */
        item.leafEls = item.branchEl ? Array.from(item.branchEl.querySelectorAll('.mm-leaf')) : [];
      });
      host.addEventListener('keydown', onKey);
      host.addEventListener('click', onClick);
      host.addEventListener('pointerdown', onPointerDown, { passive: true });
      host.addEventListener('pointerover', onPointerOver, { passive: true });
      host.addEventListener('pointerout', onPointerOut, { passive: true });
      host.addEventListener('pointermove', onPointerMove, { passive: true });
      host.addEventListener('focusin', onFocusIn);
      host.addEventListener('focusout', onFocusOut);
      /* Belt as well as braces for the layer's own no-scroll rule: an engine
         that scrolled the block anyway would move the world off the origin
         `fit()` measured, so it is pinned back. Nothing in the column scrolls
         this element (its content is exactly its own box), so this is inert
         outside full screen. */
      host.addEventListener('scroll', onScroll, { passive: true });
      ['pointermove', 'pointerdown', 'keydown', 'touchstart'].forEach((name) => host.addEventListener(name, wake, { passive: true }));
      if (dom.play) dom.play.addEventListener('click', () => { if (state.tour) stopTour(); else startTour(); });
      if (dom.overview) dom.overview.addEventListener('click', () => { stopTour(); closeScene(); state.tap = ''; setFocus(''); });
      if (dom.fs) dom.fs.addEventListener('click', onFull);
      updateFull();
      updateHud();
      wake();
    }

    function unwireBlock() {
      host.removeEventListener('keydown', onKey);
      host.removeEventListener('click', onClick);
      host.removeEventListener('pointerdown', onPointerDown);
      host.removeEventListener('pointerover', onPointerOver);
      host.removeEventListener('pointerout', onPointerOut);
      host.removeEventListener('pointermove', onPointerMove);
      host.removeEventListener('focusin', onFocusIn);
      host.removeEventListener('focusout', onFocusOut);
      ['pointermove', 'pointerdown', 'keydown', 'touchstart'].forEach((name) => host.removeEventListener(name, wake));
      host.removeEventListener('scroll', onScroll);
      if (dom.fs) dom.fs.removeEventListener('click', onFull);
    }

    /* ── observers and lifecycle ───────────────────────────────────────── */

    function observe() {
      const figure = host.closest ? host.closest('figure.chain') : null;
      replayEl = null;
      for (let node = figure ? figure.nextElementSibling : null; node; node = node.nextElementSibling) {
        if (node.matches('figure.chain')) break;
        if (node.matches('[data-chain-replay]')) {
          replayEl = node;
          break;
        }
      }
      if (replayEl) replayEl.addEventListener('click', onReplay);

      observers = [];
      if ('ResizeObserver' in window) {
        const ro = new ResizeObserver(() => {
          if (host.clientWidth === state.width && host.clientHeight === state.height) return;
          fit();
        });
        ro.observe(host);
        observers.push(ro);
      }
      if ('IntersectionObserver' in window) {
        const io = new IntersectionObserver((entries) => {
          const hit = entries.some((entry) => entry.isIntersecting);
          if (hit && !state.visible) play();
          if (!hit) stopLoop();
          else if (state.visible && !state.reduced) startLoop();
        }, { rootMargin: '0px 0px -15% 0px', threshold: 0 });
        io.observe(host);
        observers.push(io);
      } else {
        play();
      }
      document.addEventListener('visibilitychange', onVisibility);
      if (reduceMQ) {
        if (reduceMQ.addEventListener) reduceMQ.addEventListener('change', onReduceChange);
        else if (reduceMQ.addListener) reduceMQ.addListener(onReduceChange);
      }
    }

    function refresh() {
      if (destroyed) return;
      unwireBlock();
      build();
      fit();
      /* The controls were rebuilt, so an opener remembered from before this
         call is a detached node: focus goes back to the rebuilt exit control
         instead of to nothing. */
      if (state.full) state.fsOpener = dom.fs;
      /* Under reduced motion the map shows at once; a re-render of a revealed
         block stays revealed. */
      if (state.reduced || state.visible) {
        if (state.reduced) host.classList.add('is-visible');
        else play();
      }
    }

    function destroy() {
      if (destroyed) return;
      destroyed = true;
      stopTour();
      closeScene(true);
      /* Teardown must undo the full-screen state in full: the class, the scroll
         lock, the role it swapped and the focus it is holding — a sitting switch
         while the view is open must not leave the page locked or a torn-down
         node on top of it. `state.full` is cleared before the deferred fitters
         can run, so each of them sees the guard and does nothing. */
      state.full = false;
      watchTree(false);
      state.fsOpener = null;
      host.classList.remove('is-full');
      host.setAttribute('role', state.hostRole || 'group');
      host.removeAttribute('aria-modal');
      document.documentElement.classList.remove('mm-fullscreen-open');
      stopLoop();
      clearTimers();
      window.clearTimeout(state.idle);
      if (observers) observers.forEach((observer) => observer.disconnect());
      observers = null;
      document.removeEventListener('visibilitychange', onVisibility);
      if (reduceMQ) {
        if (reduceMQ.removeEventListener) reduceMQ.removeEventListener('change', onReduceChange);
        else if (reduceMQ.removeListener) reduceMQ.removeListener(onReduceChange);
      }
      if (replayEl) replayEl.removeEventListener('click', onReplay);
      replayEl = null;
      unwireBlock();
      pulses.length = 0;
      scenes.length = 0;
      cross.length = 0;
      host.innerHTML = '';
      host.classList.remove('mm', 'is-visible', 'is-compact', 'in-scene', 'is-idle', 'is-touring');
      host.removeAttribute('data-mm-focus');
    }

    /* ── start ──────────────────────────────────────────────────────────── */
    host.classList.add('mm');
    if (!host.hasAttribute('tabindex')) host.setAttribute('tabindex', '0');
    if (!host.getAttribute('role')) host.setAttribute('role', 'group');
    if (title && !host.getAttribute('aria-label')) host.setAttribute('aria-label', title);

    build();
    fit();
    observe();

    /* Under reduced motion the block is revealed at once and the loop never
       starts. Otherwise it is revealed when it first scrolls into view. */
    if (state.reduced) {
      state.visible = true;
      host.classList.add('is-visible');
    } else if (host.getBoundingClientRect().top < window.innerHeight * 0.95) {
      play();
    }
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(() => { if (!destroyed) fit(); }).catch(() => {});
    }

    return { destroy, resize: fit, refresh };
  }

  window.MindMap = { create, CONNECTORS };
})();
