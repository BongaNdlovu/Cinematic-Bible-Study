import { ASSET_REGISTRY } from '/js/gallery/artifact-registry.js';
import { AudioBus, selectAsset, activeAssetKey, TITLES_HIDE_KEY, btnTitlesToggle } from '/js/gallery/gallery.js';

export function buildEraTimeline() {
  const track = document.getElementById('era-track');
  if (!track) return;
  const cells = [
    { asset: 'assembled', label: 'COLOSSUS', date: 'Dan 2:31–45', img: 'assets/site/era-assembled.webp' },
    { asset: 'head', label: 'GOLD', date: '605–539 BC', img: 'assets/site/era-head.webp' },
    { asset: 'chest', label: 'SILVER', date: '539–331 BC', img: 'assets/site/era-chest.webp' },
    { asset: 'thighs', label: 'BRONZE', date: '331–168 BC', img: 'assets/site/era-thighs.webp' },
    { asset: 'legs', label: 'IRON', date: '168 BC–476 AD', img: 'assets/site/era-legs.webp' },
    { asset: 'feet', label: 'IRON & CLAY', date: 'Divided era', img: 'assets/site/era-feet.webp' },
    { asset: 'stone', label: 'THE STONE', date: 'Dan 2:34', img: 'assets/site/era-stone.webp' },
    { asset: 'lion', label: 'WINGED LION', date: 'Dan 7:4', img: 'assets/site/era-lion.webp' },
    { asset: 'bear', label: 'THE BEAR', date: 'Dan 7:5', img: 'assets/site/era-bear.webp' },
    { asset: 'leopard', label: 'LEOPARD', date: 'Dan 7:6', img: 'assets/site/era-leopard.webp' },
    { asset: 'beast', label: 'FOURTH BEAST', date: 'Dan 7:7', img: 'assets/site/era-beast.webp' },
    { asset: 'years1260', label: '1,260 YEARS', date: 'Dan 7:25', img: 'assets/site/era-years1260.webp' },
    { asset: 'ram', label: 'THE RAM', date: 'Dan 8:3', img: 'assets/site/era-ram.webp' },
    { asset: 'goat', label: 'THE GOAT', date: 'Dan 8:5', img: 'assets/site/era-goat.webp' },
    { asset: 'goat_broken', label: 'BROKEN HORN', date: 'Dan 8:8', img: 'assets/site/era-goat_broken.webp' },
    { asset: 'goat_horn', label: 'LITTLE HORN', date: 'Dan 8:9', img: 'assets/site/era-goat_horn.webp' },
    { asset: 'dura', label: 'DURA', date: 'Dan 3:1', img: 'assets/site/era-dura.webp' },
    { asset: 'stump', label: 'THE STUMP', date: 'Dan 4:15', img: 'assets/site/era-stump.webp' },
    { asset: 'ox_king', label: 'OX-KING', date: 'Dan 4:33', img: 'assets/site/era-ox_king.webp' },
    { asset: 'ancient', label: 'ANCIENT OF DAYS', date: 'Dan 7:9', img: 'assets/site/era-ancient.webp' },
    { asset: 'son', label: 'SON OF MAN', date: 'Dan 7:13', img: 'assets/site/era-son.webp' },
    { asset: 'decree', label: 'THE DECREE', date: '457 BC', img: 'assets/site/era-decree.webp' },
    { asset: 'kings', label: 'NORTH & SOUTH', date: 'Dan 11:5', img: 'assets/site/era-kings.webp' },
    { asset: 'michael', label: 'MICHAEL', date: 'Dan 12:1', img: 'assets/site/era-michael.webp' },
    { asset: 'sealed', label: 'SEALED BOOK', date: 'Dan 12:4', img: 'assets/site/era-sealed.webp' }
  ];
  const html = cells.map((c) => `
        <button class="era-cell" type="button" data-asset="${c.asset}">
          <img src="${c.img}" alt="">
          <span class="era-meta"><b>${c.label}</b><span>${c.date}</span></span>
        </button>`).join('');
  track.innerHTML = html + html;
  track.querySelectorAll('.era-cell').forEach((btn) => {
    btn.addEventListener('click', () => {
      AudioBus.play('select');
      selectAsset(btn.dataset.asset);
    });
  });
}

export function closeAllPanels() {
  document.body.classList.remove('rail-open', 'narrative-open', 'modal-open');
  const lab = document.getElementById('study-lab-drawer');
  if (lab) lab.classList.remove('open');
  document.querySelectorAll('.exhibit-modal.open').forEach((m) => m.classList.remove('open'));
}

export function openModal(id) {
  closeAllPanels();
  const modal = document.getElementById(id);
  if (!modal) return;
  modal.classList.add('open');
  document.body.classList.add('modal-open');
}

export function openScriptureModal() {
  const data = ASSET_REGISTRY[activeAssetKey] || ASSET_REGISTRY.assembled;
  const body = document.getElementById('scripture-modal-body');
  const ref = document.getElementById('scripture-modal-ref');
  if (body) body.textContent = data.quote;
  if (ref) ref.textContent = data.quoteRef;
  openModal('scripture-modal');
}

export function openAboutModal() {
  openModal('about-modal');
}

export function setNavActive(name) {
  document.querySelectorAll('.nav-item').forEach((el) => {
    el.classList.toggle('active', el.dataset.nav === name);
  });
}

export function filterArtifacts(query) {
  const q = (query || '').trim().toLowerCase();
  let visible = 0;
  document.querySelectorAll('.artifact-card-item').forEach((card) => {
    const hay = `${card.textContent} ${card.dataset.asset}`.toLowerCase();
    const show = !q || hay.includes(q);
    card.style.display = show ? '' : 'none';
    if (show) visible += 1;
  });
  const list = document.getElementById('artifact-cards-list');
  if (list) {
    let empty = document.getElementById('artifact-search-empty');
    if (!empty) {
      empty = document.createElement('p');
      empty.id = 'artifact-search-empty';
      empty.className = 'artifact-search-empty';
      empty.textContent = 'No artifacts match that search.';
      list.appendChild(empty);
    }
    empty.hidden = !(q && visible === 0);
  }
}

export function titlesHiddenStored() {
  try { return localStorage.getItem(TITLES_HIDE_KEY) === '1'; } catch (e) { return false; }
}

export function applyTitlesHidden(hidden, persist) {
  document.body.classList.toggle('titles-hidden', hidden);
  if (persist) {
    try { localStorage.setItem(TITLES_HIDE_KEY, hidden ? '1' : '0'); } catch (e) {}
  }
  if (btnTitlesToggle) {
    btnTitlesToggle.classList.toggle('active', !hidden);
    btnTitlesToggle.setAttribute('aria-pressed', hidden ? 'true' : 'false');
    const label = hidden ? 'Show artifact title' : 'Hide artifact title';
    btnTitlesToggle.title = label;
    btnTitlesToggle.setAttribute('aria-label', label);
  }
}
