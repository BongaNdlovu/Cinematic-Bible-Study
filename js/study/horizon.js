import { canAccessSheet, currentSheetIndex, denyLockedSitting, epochAccessible, loadSheet, memberLockText, sheetBelongsToEpoch, timelineToSheetMap } from '/js/study/study-app.js';

    export let currentEpochIndex = 0;

    export function syncHorizonLocks() {
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

    export function stepHorizon(delta) {
      let idx = currentEpochIndex + delta;
      while (idx >= 0 && idx < timelineEpochs.length && !epochAccessible(idx)) idx += delta;
      if (idx >= 0 && idx < timelineEpochs.length && idx !== currentEpochIndex) setEpochInfo(idx);
    }

    export function setEpochInfo(epochIdx, opts) {
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

      updateFocusNote(epoch);

      if (!fromSheet && !sheetBelongsToEpoch(currentSheetIndex, epochIdx)) {
        const target = timelineToSheetMap[epochIdx];
        if (typeof target === 'number') {
          if (!canAccessSheet(target)) denyLockedSitting(target);
          else loadSheet(target, { fromEpoch: true });
        }
      }
    }

    export function epochShortTitle(epoch) {
      const mark = ' — ';
      const i = epoch.title.indexOf(mark);
      return i >= 0 ? epoch.title.slice(i + mark.length) : epoch.title;
    }

    export function hideHorizonFloat() {
      const float = document.getElementById('horizon-float');
      if (!float) return;
      float.classList.remove('is-on');
      float.hidden = true;
    }

    export function showHorizonFloat(idx, card) {
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

    export function buildHorizonCards() {
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

    export function buildEpochLine() {
      const line = document.getElementById('epoch-line');
      if (!line || !timelineEpochs.length) return;
      const n = timelineEpochs.length;
      const points = timelineEpochs.map((ep, i) => {
        const at = n <= 1 ? 0 : i / (n - 1);
        const open = epochAccessible(i);
        const year = window.SiteCore.escapeHtml(ep.year);
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

    export function syncEpochLine(epochIdx) {
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

    export function updateFocusNote(epoch) {
      const noteEl = document.getElementById('pioneer-micro-note');
      if (noteEl && epoch.pioneerNote) noteEl.innerText = epoch.pioneerNote;
    }
