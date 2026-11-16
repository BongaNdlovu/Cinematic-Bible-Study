import { netRequest, showToast } from '/js/pages/study/study-app.js';

    export let strongsDataCache = null;

    export async function getStrongsData() {
      /* A failed load must not be cached as "empty" for the session — the next
         tap retries, and the interim feedback below covers the wait. */
      if (strongsDataCache) return strongsDataCache;
      try {
        const scripture = window.BAScripture;
        if (scripture && typeof scripture.loadStrongs === 'function') {
          const viaScripture = await scripture.loadStrongs();
          if (viaScripture && Object.keys(viaScripture).length) {
            strongsDataCache = viaScripture;
            return strongsDataCache;
          }
        } else {
          const res = await netRequest('bible/strongs-daniel.json', {
            onSlow: () => { showToast('Still opening the concordance\u2026'); }
          });
          if (res.ok) {
            const parsed = await res.json();
            if (parsed && Object.keys(parsed).length) {
              strongsDataCache = parsed;
              return strongsDataCache;
            }
          }
        }
      } catch (e) {}
      return null;
    }

    export function wireStrongsTooltips() {
      document.querySelectorAll('.strongs-gloss').forEach((el) => {
        if (el.dataset.wired) return;
        el.dataset.wired = 'true';
        el.addEventListener('click', async (e) => {
          e.stopPropagation();
          const lemmaId = el.getAttribute('data-lemma');
          if (!lemmaId) return;

          const data = await getStrongsData();
          const entry = data ? data[lemmaId] : null;
          if (!entry) {
            if (data === null) {
              showToast("The concordance could not be opened just now. Check your connection and tap the word again.");
            }
            return;
          }
          if (window.StudyCompetency) {
            window.StudyCompetency.recordScriptureLookup(`Strong's ${lemmaId} (${entry.translit || entry.lemma || ''})`);
          }
          window.TermOverlay.open({ type: 'strongs', lemmaId, entry }, el);
        });
      });
    }
