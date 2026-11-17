import { SHEET_CONTEXT, SHEET_INSIGHTS } from '/js/pages/study/sitting-map.js';
import { currentSheetIndex } from '/js/pages/study/study-app.js';

    export function bibleNoticeChapters(index) {
      const passage = window.BAScripture && window.BAScripture.passageForSheet(index);
      const sections = (passage && passage.sections) || [];
      if (!sections.length) return '';
      const first = sections[0];
      const last = sections[sections.length - 1];
      if (first.book !== last.book) return sections.map((s) => s.book + ' ' + s.chapter).join(' · ');
      if (sections.length === 1) return first.book + ' Chapter ' + first.chapter;
      return first.book + ' Chapters ' + first.chapter + '–' + last.chapter;
    }

    export function closeInfographic() {
      const modal = document.getElementById('infographic-modal');
      if (!modal) return;
      modal.hidden = true;
      document.body.classList.remove('infographic-open');
    }

    export function openInfographic() {
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

    export function renderBibleNotice(index) {
      const badge = document.getElementById('bible-notice-chapters');
      if (!badge) return;
      const label = bibleNoticeChapters(index);
      if (label) badge.textContent = label;
    }

    export function renderSheetInstruments(index) {
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

    export function openArtifactModal() {
      const modal = document.getElementById('artifact-modal');
      modal.classList.remove('opacity-0', 'pointer-events-none');
    }

    export function closeArtifactModal() {
      const modal = document.getElementById('artifact-modal');
      modal.classList.add('opacity-0', 'pointer-events-none');
    }
