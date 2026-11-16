

export let explodeAmount = 0;

export function setExplode(pct) {
  explodeAmount = Math.max(0, Math.min(1, pct / 100));
  const slider = document.getElementById('explode-slider');
  const label = document.getElementById('explode-val');
  const toggle = document.getElementById('btn-explode-toggle');
  if (slider && Number(slider.value) !== pct) slider.value = String(pct);
  if (label) label.textContent = pct <= 0 ? '0% (Assembled)' : `${pct}% lift`;
  if (toggle) {
    toggle.classList.toggle('active', pct > 0);
    toggle.textContent = pct > 0 ? 'Lift from Altar: ON' : 'Lift from Altar';
  }
}
