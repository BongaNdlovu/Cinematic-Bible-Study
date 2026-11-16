import { MAP_YEAR_FOR_ASSET } from '/js/gallery/artifact-registry.js';
import { lessonReturnHref, lessonSheetSafe } from '/js/gallery/gallery.js';

export function syncDossierStudyLink(key) {
  const narStudyLink = document.getElementById('nar-study-link');
  if (!narStudyLink) return;
  const J = window.BAJourney;
  const sitting = J && typeof J.sittingForAsset === 'function' ? J.sittingForAsset(key) : -1;
  if (sitting >= 0 && J && typeof J.canAccessSheet === 'function' && !J.canAccessSheet(sitting)) {
    narStudyLink.hidden = true;
    return;
  }
  narStudyLink.hidden = false;
  if (lessonReturnHref) {
    narStudyLink.href = lessonReturnHref;
    narStudyLink.innerHTML = '<span>📖</span> ← Back to this lesson';
  } else {
    narStudyLink.href = `study.html?id=${key}`;
    narStudyLink.innerHTML = '<span>📖</span> Open Full Study Desk &amp; Quiz →';
  }
}

export function syncDossierMapLink(key) {
  const narMapLink = document.getElementById('nar-map-link');
  if (!narMapLink) return;
  const y = MAP_YEAR_FOR_ASSET[key] || 'y605';
  const lessonQuery = lessonSheetSafe
    ? `&from=lesson&sheet=${encodeURIComponent(lessonSheetSafe)}`
    : '';
  narMapLink.href = `map.html?year=${y}${lessonQuery}`;
  const mapTopLink = document.getElementById('gallery-map-link');
  if (mapTopLink && lessonSheetSafe) {
    mapTopLink.href = `map.html?year=${y}&from=lesson&sheet=${encodeURIComponent(lessonSheetSafe)}`;
  }
  if (window.BAJourney) window.BAJourney.save({ artifact: key, year: y });
}

export function syncDossierNarrative(data) {
  // Update Right Narrative Column
  const quote = document.getElementById('nar-scripture-quote');
  const ref = document.getElementById('nar-scripture-ref');
  const exp = document.getElementById('nar-explanation');
  const hist = document.getElementById('nar-historical');
  const plate = document.getElementById('nar-plate-img');
  const take = document.getElementById('nar-takeaway');
  if (quote) quote.textContent = data.quote;
  if (ref) ref.textContent = data.quoteRef;
  if (exp) exp.textContent = data.explanation;
  if (hist) hist.textContent = data.historical;
  if (plate && data.plateImg) {
    plate.src = data.plateImg;
    plate.alt = data.plateCaption || data.title;
  }
  const plateCap = document.getElementById('nar-plate-caption');
  if (plateCap) plateCap.textContent = data.plateCaption || '';
  if (take) take.textContent = data.takeaway;
}
