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
            if (layer.__photoWatch) layer.__photoWatch.abort();
            layer.__photoWatch = null;
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
        if (layer.__photoWatch) layer.__photoWatch.abort();
        const watch = new AbortController();
        layer.__photoWatch = watch;
        let armed = false;
        const reveal = () => {
          if (armed) return;
          armed = true;
          watch.abort();
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
          watch.abort();
          if (token !== photoSeq) return;
          armed = true;
          layer.removeAttribute('src');
          layer.style.transition = '';
          layer.classList.remove('is-current');
          refreshHasPhoto();
        }, { once: true, signal: watch.signal });
        layer.setAttribute('src', src);
        refreshHasPhoto();
        if (layer.complete && layer.naturalWidth) reveal();
        else {
          layer.addEventListener('load', reveal, { once: true, signal: watch.signal });
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
