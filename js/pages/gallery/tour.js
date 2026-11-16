import { museumToast, openArtifactKeys, selectAsset, TOUR_BUSY_RETRY_MS, reducedMotion } from '/js/pages/gallery/gallery.js';

export let tourRunning = false;

export let tourTimer = 0;

export function stopArtifactTour(announce) {
  if (!tourRunning) return;
  tourRunning = false;
  clearTimeout(tourTimer);
  tourTimer = 0;
  if (announce) museumToast('Tour stopped');
}

export function startArtifactTour() {
  if (tourRunning) {
    stopArtifactTour(true);
    return;
  }
  tourRunning = true;
  let i = 0;
  const order = openArtifactKeys().filter((k) => k !== 'altar');
  const step = () => {
    if (!tourRunning) return;
    if (i >= order.length) { tourRunning = false; museumToast('Tour complete'); return; }
    if (selectAsset._busy) {
      tourTimer = setTimeout(step, TOUR_BUSY_RETRY_MS);
      return;
    }
    selectAsset(order[i], { fromTour: true });
    i += 1;
    tourTimer = setTimeout(step, reducedMotion ? 400 : 2800);
  };
  museumToast('Guided artifact tour · press T or Esc to stop');
  step();
}
