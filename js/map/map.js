(function () {
  const DATA = window.MAP_CHRONICLE;
  if (!DATA) {
    console.error("MAP_CHRONICLE failed to load.");
    return;
  }

  const REDUCE = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const BASE_STORE = "baMapBasemap";
  const SYMBOLS = {
    head: "Golden Head",
    chest: "Silver Chest & Arms",
    thighs: "Bronze Belly & Thighs",
    legs: "Legs of Iron",
    feet: "Feet of Iron & Clay",
    stone: "Stone Cut Without Hands",
    years1260: "Time, Times & Half a Time"
  };
  const HELP_HTML =
    "<div class='cmap-help-card' tabindex='0'>" +
      "<div class='cmap-help-head'><h2 id='cmap-help-title'>How to use the map</h2>" +
      "<button type='button' class='cmap-help-close' aria-label='Close help'>✕</button></div>" +
      "<h3>Move and zoom</h3><dl>" +
        "<div><dt>Move around</dt><dd>Drag with the mouse, or with one finger.</dd></div>" +
        "<div><dt>Zoom in</dt><dd>The <kbd>+</kbd> button, scroll up, pinch outwards, double-click the flat map, or press <kbd>+</kbd>.</dd></div>" +
        "<div><dt>Zoom out</dt><dd>The <kbd>−</kbd> button, scroll down, pinch inwards, or press <kbd>−</kbd>.</dd></div>" +
        "<div><dt>Globe and map</dt><dd>Zoom far into the globe and it becomes the satellite map. Zoom all the way out of the map and it becomes the globe again. The Globe button switches straight away.</dd></div>" +
        "<div><dt>Imagery</dt><dd>Satellite shows the ground as it looks today. Streets shows a plain road map.</dd></div>" +
      "</dl>" +
      "<h3>Move through time</h3><dl>" +
        "<div><dt>Change year</dt><dd>Pick a year on the timeline, use the <kbd>‹</kbd> <kbd>›</kbd> buttons, or press <kbd>←</kbd> <kbd>→</kbd>.</dd></div>" +
        "<div><dt>Play the chronicle</dt><dd>The <kbd>▶</kbd> button or <kbd>Space</kbd> plays the years in order.</dd></div>" +
      "</dl>" +
      "<h3>Places</h3><dl>" +
        "<div><dt>Open a place</dt><dd>Click or tap a round medal on the map or globe.</dd></div>" +
        "<div><dt>Close-up</dt><dd>In a place's panel, flies down to an aerial view of the real site.</dd></div>" +
        "<div><dt>Play route</dt><dd>Follows the march or journey for that year.</dd></div>" +
        "<div><dt>Search</dt><dd>Type a city, empire or battle in the search box.</dd></div>" +
        "<div><dt>Layers and Key</dt><dd>Layers shows or hides borders, cities, events, labels and routes. Key explains the icons.</dd></div>" +
        "<div><dt>Close a panel</dt><dd>The <kbd>✕</kbd> button or <kbd>Esc</kbd>.</dd></div>" +
      "</dl>" +
      "<h3>The 3D button</h3>" +
      "<p>In a place's panel, <strong>Symbol in 3D</strong> opens the 3D gallery of the symbols from Daniel's visions, such as the golden head of Daniel 2. It is not a 3D view of the place. To see the real ground, use <strong>Close-up</strong>.</p>" +
      "<p class='cmap-help-foot'>Press <kbd>?</kbd> to open this help at any time.</p>" +
    "</div>";

  function epochById(id) {
    return DATA.epochs.find((e) => e.id === id) || DATA.epochs[0];
  }
  function parseYearParam(raw) {
    if (!raw) return null;
    const s = String(raw).toLowerCase().replace(/\s/g, "");
    const hit = DATA.epochs.find((e) => {
      return e.id === raw || e.id === "y" + s.replace("bc", "").replace("ad", "") ||
        String(e.year) === s || e.label.toLowerCase().replace(/\s/g, "") === s ||
        e.id.replace("y", "") === s.replace("b.c.", "").replace("a.d.", "");
    });
    if (hit) return hit.id;
    const n = parseInt(s.replace(/[^\d-]/g, ""), 10);
    if (!Number.isNaN(n)) {
      const byYear = DATA.epochs.find((e) => e.year === n || e.year === -n);
      if (byYear) return byYear.id;
    }
    return null;
  }
  function tileZoom(ep) {
    if (ep.camera && ep.camera.tileZoom) return ep.camera.tileZoom;
    const z = (ep.camera && ep.camera.zoom) || 2.2;
    if (z >= 3) return 7;
    if (z >= 2.5) return 6;
    if (z >= 2.1) return 5;
    return 4;
  }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function iconSrc(key) {
    const icons = DATA.icons || {};
    if (key === "iron-clay") return icons.clay || icons["iron-clay"];
    return icons[key] || icons.gold;
  }
  function fillStyle(emp, opacity) {
    const m = String((emp && emp.fill) || "rgba(212,175,55,0.42)").match(/[\d.]+/g) || ["212", "175", "55", "0.42"];
    const op = (parseFloat(m[3] || "0.42")) * (opacity == null ? 1 : opacity);
    return {
      color: (emp && emp.stroke) || "#f3d98a",
      weight: 2.4,
      fillColor: "rgb(" + m[0] + "," + m[1] + "," + m[2] + ")",
      fillOpacity: op,
      opacity: 1,
      lineJoin: "round",
      lineCap: "round"
    };
  }
  function chaikinRing(ring, iters) {
    let pts = ring.slice();
    if (pts.length > 1 && pts[0][0] === pts[pts.length - 1][0] && pts[0][1] === pts[pts.length - 1][1]) {
      pts = pts.slice(0, -1);
    }
    if (pts.length < 4) return ring;
    for (let n = 0; n < iters; n++) {
      const next = [];
      for (let i = 0; i < pts.length; i++) {
        const a = pts[i];
        const b = pts[(i + 1) % pts.length];
        next.push([a[0] * 0.75 + b[0] * 0.25, a[1] * 0.75 + b[1] * 0.25]);
        next.push([a[0] * 0.25 + b[0] * 0.75, a[1] * 0.25 + b[1] * 0.75]);
      }
      pts = next;
    }
    pts.push(pts[0]);
    return pts;
  }
  function smoothGeom(geom) {
    const walk = (poly) => poly.map((ring) => chaikinRing(ring, ring.length > 24 ? 2 : 1));
    if (geom.type === "Polygon") return { type: "Polygon", coordinates: walk(geom.coordinates) };
    if (geom.type === "MultiPolygon") return { type: "MultiPolygon", coordinates: geom.coordinates.map(walk) };
    return geom;
  }
  function smoothFeature(f) {
    return { type: "Feature", properties: f.properties, geometry: smoothGeom(f.geometry) };
  }
  function el(tag, attrs, html) {
    const node = document.createElement(tag);
    if (attrs) {
      Object.entries(attrs).forEach(([k, v]) => {
        if (v == null || v === false) return;
        if (k === "class") node.className = v;
        else if (k === "style" && typeof v === "object") Object.assign(node.style, v);
        else node.setAttribute(k, v === true ? "" : v);
      });
    }
    if (html != null) node.innerHTML = html;
    return node;
  }
  async function loadJson(url) {
    const alts = url.endsWith(".geojson")
      ? [url, url.replace(/\.geojson$/i, ".json")]
      : [url, url.replace(/\.json$/i, ".geojson")];
    let last = "missing";
    for (const u of alts) {
      const r = await fetch(u);
      if (r.ok) return r.json();
      last = r.status;
    }
    throw new Error(last);
  }
  function savedBase() {
    try { return localStorage.getItem(BASE_STORE) || "satellite"; } catch (e) { return "satellite"; }
  }
  function haversineKm(lat1, lon1, lat2, lon2) {
    const rad = Math.PI / 180;
    const dLat = (lat2 - lat1) * rad;
    const dLon = (lon2 - lon1) * rad;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(dLon / 2) ** 2;
    return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }
  function distanceText(km) {
    if (km < 1) return Math.round(km * 1000).toLocaleString("en-US") + " m";
    return Math.round(km).toLocaleString("en-US") + " km (" + Math.round(km * 0.621371).toLocaleString("en-US") + " mi)";
  }
  function scrubYearLabel(y) {
    return y < 0 ? (-y) + " B.C." : "A.D. " + y;
  }
  function yearsComplete(y) {
    return y < 0 ? 457 + y : 456 + y;
  }
  function scrubPeriod(y) {
    const c = yearsComplete(y);
    if (y < -457) return "Before the decree — the 2,300 years have not begun";
    if (c < 49) return "Seven weeks — Jerusalem restored and built, 457–408 B.C. (Dan. 9:25)";
    if (c < 483) return "Sixty-two weeks — unto Messiah the Prince, A.D. 27";
    if (c < 490) return "The seventieth week — A.D. 27–34; cut off in the midst, A.D. 31";
    if (c < 2300) return "After the seventy weeks — 1,810 years reach to 1844";
    return "Autumn 1844 — then shall the sanctuary be cleansed (Dan. 8:14)";
  }
  function epochFocus(ep) {
    const focus = DATA.events.find((e) => e.id === ep.event);
    const useCam = ep.camera && ep.camera.useCamera;
    return {
      lat: useCam || !focus ? ep.camera.lat : focus.lat,
      lon: useCam || !focus ? ep.camera.lon : focus.lon
    };
  }
  function globeDistance(z) {
    if (z >= 7) return 2.0;
    if (z >= 6) return 2.25;
    if (z >= 5) return 2.6;
    return 3.0;
  }
  const SAT_TILE = "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/";
  function worldPx(lat, lon, z) {
    const size = 256 * Math.pow(2, z);
    const r = clamp(lat, -84, 84) * Math.PI / 180;
    return {
      x: ((lon + 180) / 360) * size,
      y: ((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2) * size
    };
  }
  const GLOBE_SRC = "js/map/globe.js";
  const GLOBE_INTRO = "cmap-globe-intro";

  function mount(root, options) {
    const opts = options || {};
    const cinematic = opts.mode !== "embed";
    function yearOpen(id) {
      if (!cinematic || !id) return true;
      if (!window.BAJourney || typeof window.BAJourney.canAccessYear !== "function") return true;
      return window.BAJourney.canAccessYear(id);
    }
    function nodeOpen(id) {
      if (!cinematic || !id) return true;
      if (!window.BAJourney || typeof window.BAJourney.canAccessMapNode !== "function") return true;
      return window.BAJourney.canAccessMapNode(id);
    }
    function firstOpenYear() {
      const hit = DATA.epochs.find((e) => yearOpen(e.id));
      return hit ? hit.id : DATA.epochs[0].id;
    }
    function clampSheetIndex(n) {
      if (n == null || Number.isNaN(Number(n))) return n;
      if (window.BAJourney && typeof window.BAJourney.clampToAccessible === "function") {
        return window.BAJourney.clampToAccessible(Number(n));
      }
      return Number(n);
    }
    const state = {
      yearId: opts.year || DATA.epochs[0].id,
      polities: null,
      yearGen: 0,
      base: "satellite",
      lmap: null,
      geoLayer: null,
      markerLayer: null,
      glowLayer: null,
      labelTiles: null,
      playing: false,
      layers: { borders: true, cities: true, events: true, labels: true, routes: true },
      overlayOpacity: 1,
      routeLayer: null,
      poiLayer: null,
      footprint: null,
      beaconMarker: null,
      compareEl: null,
      view: "map",
      sheetIndex: clampSheetIndex(opts.sheetIndex != null
        ? opts.sheetIndex
        : (opts.sheet != null && /^\d+$/.test(String(opts.sheet).trim()) ? Number(String(opts.sheet).trim()) : null))
    };
    let mapReady = false;
    let queuedSheet = null;
    let globe = null;
    let globeLoading = null;
    let globeFailed = !cinematic || !window.WebGL2RenderingContext;
    let mapCredit = "";
    let globeAsk = null;
    let routeRun = 0;

    function sheetPack() {
      if (state.sheetIndex == null || !window.SHEET_MAP) return null;
      return window.SHEET_MAP[state.sheetIndex] || null;
    }
    function lessonOverlay(id) {
      const pack = sheetPack();
      if (!pack) return null;
      return (pack.nodes || []).find((n) => n.id === id) || null;
    }
    function isLessonId(id) {
      return !!lessonOverlay(id);
    }
    function dossierBodyHtml(text) {
      if (!text) return "";
      const t = String(text);
      if (/<[a-z][\s\S]*>/i.test(t)) return t;
      return t.split(/\n\n+/).map((p) => "<p>" + p.replace(/\n/g, "<br>") + "</p>").join("");
    }

    root.classList.add(cinematic ? "cmap-root" : "cmap-embed");
    root.innerHTML = "";

    const stage = el("div", { class: "cmap-stage", role: "application", "aria-label": "Interactive map of Daniel’s kingdoms" });
    const tiles = el("div", { class: "cmap-tiles" });
    stage.appendChild(tiles);
    const globeHost = el("div", { class: "cmap-globe" });
    if (!globeFailed) stage.appendChild(globeHost);
    stage.appendChild(el("div", { class: "cmap-vignette", "aria-hidden": "true" }));
    stage.appendChild(el("div", { class: "cmap-grain", "aria-hidden": "true" }));
    const stone = el("div", { class: "cmap-stone-glow", "aria-hidden": "true" });
    stage.appendChild(stone);

    const loadEl = el("div", { class: "cmap-load" }, "Unrolling the chronicle…");
    const chapter = el("div", { class: "cmap-chapter", "aria-hidden": "true" },
      '<img alt=""><div class="veil"></div><div class="copy"><small></small><h1></h1></div>');
    const overture = el("div", { class: "cmap-overture", "aria-hidden": "true" },
      "<small>Daniel 2 · 7 · 8 · 9</small><h1>Map of History</h1><p>The succession of kingdoms, from gold to the stone.</p>");
    const cartouche = el("div", { class: "cmap-cartouche" },
      "<img class='cmap-cartouche-icon' alt=''><div><small>Chronicle year</small><strong></strong><span></span></div>");
    const legend = el("div", { class: "cmap-legend", id: "cmap-legend-panel" },
      "<div class='cmap-legend-title'>Map key</div>" +
      "<div class='cmap-legend-row'><img src='assets/maps/icons/metal-gold.jpg' alt=''>Gold · Babylon</div>" +
      "<div class='cmap-legend-row'><img src='assets/maps/icons/metal-silver.jpg' alt=''>Silver · Persia</div>" +
      "<div class='cmap-legend-row'><img src='assets/maps/icons/metal-bronze.jpg' alt=''>Bronze · Greece</div>" +
      "<div class='cmap-legend-row'><img src='assets/maps/icons/metal-iron.jpg' alt=''>Iron · Rome</div>" +
      "<div class='cmap-legend-row'><img src='assets/maps/icons/metal-clay.jpg' alt=''>Iron &amp; clay</div>" +
      "<div class='cmap-legend-row'><img src='assets/maps/icons/metal-stone.jpg' alt=''>Stone — whole earth (map rim)</div>" +
      "<div class='cmap-legend-rule'></div>" +
      "<div class='cmap-legend-row'><img src='assets/maps/icons/key-city.jpg' alt=''>City</div>" +
      "<div class='cmap-legend-row'><img src='assets/maps/icons/key-battle.jpg' alt=''>Battle</div>" +
      "<div class='cmap-legend-row'><img src='assets/maps/icons/key-decree.jpg' alt=''>Decree</div>" +
      "<div class='cmap-legend-row'><img src='assets/maps/icons/key-sanctuary.jpg' alt=''>Sanctuary</div>" +
      "<div class='cmap-legend-row'><img src='assets/maps/icons/key-wound.jpg' alt=''>Deadly wound</div>");
    const dossier = el("aside", { class: "cmap-dossier", "aria-live": "polite" });
    const hint = el("div", { class: "cmap-hint" }, "Drag to move · scroll or pinch to zoom · press ? for all controls");
    const credit = el("div", { class: "cmap-credit" }, "Satellite: Esri World Imagery · Borders: Cliopatria / Seshat");
    const timeline = el("div", { class: "cmap-timeline" });
    const prevBtn = el("button", { class: "cmap-nav-year", type: "button", title: "Previous year", "aria-label": "Previous year" }, "‹");
    const nextBtn = el("button", { class: "cmap-nav-year", type: "button", title: "Next year", "aria-label": "Next year" }, "›");
    const track = el("div", { class: "cmap-year-track", role: "tablist", "aria-label": "Chronicle years" });
    DATA.epochs.forEach((ep) => {
      const src = iconSrc(ep.metal);
      const b = el("button", { class: "cmap-year", type: "button", role: "tab", "data-year": ep.id, title: ep.title },
        "<img src='" + src + "' alt=''><span>" + ep.label + "</span>");
      b.addEventListener("click", () => {
        if (!yearOpen(ep.id)) {
          if (window.BAJourney && typeof window.BAJourney.announceLock === "function") {
            window.BAJourney.announceLock("year", ep.id);
          }
          return;
        }
        setYear(ep.id, { animate: true, chapter: cinematic });
      });
      track.appendChild(b);
    });
    const playBtn = el("button", { class: "cmap-play", type: "button", title: "Play the chronicle", "aria-label": "Play the chronicle" }, "▶");
    const scrubPath = DATA.epochs.filter((ep) => ep.scrub !== false);
    const scrubMin = scrubPath[0].year;
    const scrubMax = scrubPath[scrubPath.length - 1].year;
    const seventyHref = "study.html?id=" + epochById("y457").studySheet;
    const scrub = el("div", { class: "cmap-scrub" },
      "<input type='range' min='" + scrubMin + "' max='" + scrubMax + "' step='1' value='" + scrubMin + "' aria-label='Scrub through the years'>" +
      "<div class='cmap-scrub-read' aria-live='polite'><strong></strong><span></span>" +
      "<a class='cmap-scrub-link' href='" + seventyHref + "'>The seventy weeks →</a></div>");
    const scrubInput = scrub.querySelector("input");
    if (cinematic) timeline.appendChild(scrub);
    timeline.appendChild(prevBtn);
    timeline.appendChild(track);
    timeline.appendChild(nextBtn);
    timeline.appendChild(playBtn);

    const bases = el("div", { class: "cmap-basemap", role: "group", "aria-label": "Basemap" },
      "<button type='button' class='cmap-view-btn' data-view='globe' aria-pressed='false' title='Show the whole earth'>Globe</button>" +
      "<button type='button' data-base='satellite'>Satellite</button>" +
      "<button type='button' data-base='streets'>Streets</button>");
    const viewBtn = bases.querySelector(".cmap-view-btn");
    if (globeFailed) viewBtn.remove();
    const layers = el("div", { class: "cmap-layers", id: "cmap-layers-panel" },
      "<div class='cmap-legend-title'>Layers</div>" +
      "<label><input type='checkbox' data-layer='borders' checked> Borders</label>" +
      "<label><input type='checkbox' data-layer='cities' checked> Cities</label>" +
      "<label><input type='checkbox' data-layer='events' checked> Events</label>" +
      "<label><input type='checkbox' data-layer='labels' checked> Labels</label>" +
      "<label><input type='checkbox' data-layer='routes' checked> Routes</label>" +
      "<label class='cmap-compare-label'>Then / now <input type='range' min='0' max='100' value='100' id='cmap-compare'></label>");
    const searchBox = el("div", { class: "cmap-search" },
      "<input type='search' placeholder='Search city, empire, battle…' aria-label='Search the map'>" +
      "<div class='cmap-search-hits' hidden></div>");
    const compass = el("div", { class: "cmap-compass", "aria-hidden": "true" },
      "<svg viewBox='0 0 72 72' aria-hidden='true'><circle cx='36' cy='36' r='33'/><path class='n' d='M36 8 L42 36 L36 32 L30 36 Z'/><text x='36' y='18'>N</text></svg>");
    const coords = el("div", { class: "cmap-coords" }, "—");
    const flyBadge = el("div", { class: "cmap-fly-badge", hidden: true }, "<img alt=''><span></span>");

    let chrome = null;
    if (cinematic) {
      const urlParams = (typeof location !== "undefined" && location.search) ? new URLSearchParams(location.search) : new URLSearchParams();
      const fromLesson = (opts && opts.from === "lesson") || urlParams.get("from") === "lesson";
      const sheetParam = (opts && opts.sheet !== undefined && opts.sheet !== null) ? opts.sheet : urlParams.get("sheet");
      const isValidSheet = (s) => s !== null && s !== undefined && /^\d+$/.test(String(s).trim()) && Number(s) >= 0 && Number(s) <= 10;
      const sheetSafe = (fromLesson && isValidSheet(sheetParam)) ? String(clampSheetIndex(sheetParam)) : null;
      const backHref = sheetSafe ? `study.html?sheet=${encodeURIComponent(sheetSafe)}#sheet-article` : "study.html";
      // The " desk" tail is hidden on narrow screens so every nav pill fits without a swipe.
      const backLabel = sheetSafe ? "← Back to this lesson" : "← Study<span class=\"cmap-back-tail\"> desk</span>";
      const galleryHref = sheetSafe ? `gallery.html?from=lesson&sheet=${encodeURIComponent(sheetSafe)}` : "gallery.html";

      chrome = el("header", { class: "cmap-chrome" });
      chrome.innerHTML = `
        <a class="cmap-brand" href="index.html">
          <svg viewBox="0 0 32 32" fill="none" aria-hidden="true">
            <path d="M16 2.5L5 7.5v9.5c0 7.8 4.7 15.1 11 16.5 6.3-1.4 11-8.7 11-16.5V7.5L16 2.5z" stroke="currentColor" stroke-width="1.6"/>
            <path d="M11 15.5l3.5 3.5 6.5-6.5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          BIBLE ARTIFACTS
        </a>
        <nav class="cmap-links">
          <a class="cmap-back" href="${backHref}">${backLabel}</a>
          <a href="index.html">Home</a>
          <a href="${galleryHref}">3D Gallery</a>
          <a class="active" href="map.html">Map</a>
          <a href="account.html">Account</a>
        </nav>`;
    }

    // Small panels shown/hidden from the phone layout (desktop shows both always).
    const panelsToggle = el("div", { class: "cmap-panels-toggle", role: "group", "aria-label": "Map panels" },
      "<button type='button' id='cmap-btn-layers' aria-expanded='false' aria-controls='cmap-layers-panel'>Layers</button>" +
      "<button type='button' id='cmap-btn-legend' aria-expanded='false' aria-controls='cmap-legend-panel'>Key</button>" +
      (cinematic ? "<button type='button' id='cmap-btn-help' aria-haspopup='dialog' aria-expanded='false' aria-controls='cmap-help-panel'>Help</button>" : ""));
    const zoomCtl = el("div", { class: "cmap-zoom", role: "group", "aria-label": "Zoom" },
      "<button type='button' data-zoom='1' aria-label='Zoom in' title='Zoom in (+)'>+</button>" +
      "<button type='button' data-zoom='-1' aria-label='Zoom out' title='Zoom out (−)'>−</button>" +
      (cinematic ? "<button type='button' class='cmap-zoom-help' aria-label='Map help' aria-haspopup='dialog' aria-expanded='false' aria-controls='cmap-help-panel' title='Map help (?)'>?</button>" : ""));
    const help = cinematic
      ? el("div", { class: "cmap-help", id: "cmap-help-panel", role: "dialog", "aria-modal": "true", "aria-labelledby": "cmap-help-title", hidden: true }, HELP_HTML)
      : null;

    root.appendChild(stage);
    if (chrome) root.appendChild(chrome);
    if (chrome) {
      // When the nav row must scroll (e.g. entering from a lesson), fade the edge
      // so the swipe is discoverable instead of hiding Account off-screen.
      const linksEl = chrome.querySelector(".cmap-links");
      if (linksEl) {
        const updateScrollHint = () => linksEl.classList.toggle("is-scrollable", linksEl.scrollWidth > linksEl.clientWidth + 1);
        updateScrollHint();
        window.addEventListener("resize", updateScrollHint);
        linksEl.addEventListener("scroll", () => linksEl.classList.toggle("is-scrolled", linksEl.scrollLeft > 4), { passive: true });
      }
    }
    root.appendChild(cartouche);
    if (cinematic) root.appendChild(legend);
    root.appendChild(bases);
    root.appendChild(panelsToggle);
    root.appendChild(layers);
    root.appendChild(searchBox);
    root.appendChild(compass);
    root.appendChild(zoomCtl);
    root.appendChild(coords);
    root.appendChild(flyBadge);
    root.appendChild(dossier);
    root.appendChild(timeline);
    if (cinematic) {
      root.appendChild(hint);
      root.appendChild(credit);
      root.appendChild(overture);
      root.appendChild(help);
    }
    root.appendChild(chapter);
    root.appendChild(loadEl);
    if (!cinematic) {
      root.appendChild(el("a", { class: "cmap-enter cmap-enter-overlay", href: "map.html?year=" + state.yearId }, "Enter cinematic map →"));
    }

    function markBase(name) {
      bases.querySelectorAll("button[data-base]").forEach((b) => b.classList.toggle("active", b.dataset.base === name));
    }

    function currentEpoch() { return epochById(state.yearId); }

    function globeItems(ep) {
      const out = [];
      const push = (item, isEvent) => {
        if (!nodeOpen(item.id)) return;
        const lesson = isLessonId(item.id);
        const hot = lesson || (isEvent ? item.yearId === ep.id : (item.pulse || []).includes(ep.id));
        if (isEvent && !hot) return;
        out.push({ id: item.id, name: item.name, lat: item.lat, lon: item.lon, hot: hot, icon: iconSrc(isEvent ? (item.kind || "battle") : "city") });
      };
      if (state.layers.cities) DATA.cities.forEach((c) => push(c, false));
      if (state.layers.events) DATA.events.forEach((evn) => push(evn, true));
      lessonExtraItems(ep).forEach((item) => push(item, item.kind !== "city"));
      return out;
    }

    function syncGlobe(ep, raw) {
      if (!globe) return;
      globe.setPins(globeItems(ep));
      const opacity = ep.polityOpacity == null ? 1 : ep.polityOpacity;
      const borders = state.layers.borders ? (raw || []).map((f) => {
        const emp = DATA.empires[f.properties.name];
        const g = f.geometry;
        const st = fillStyle(emp, opacity);
        const active = !!(emp && emp.id === ep.focus);
        return {
          color: st.color,
          active: active,
          fill: st.fillColor,
          fillOpacity: Math.min(0.24, st.fillOpacity * (active ? 0.5 : 0.32)),
          polys: g.type === "Polygon" ? [g.coordinates] : g.type === "MultiPolygon" ? g.coordinates : []
        };
      }) : [];
      globe.setBorders(borders);
      const routes = state.layers.routes
        ? (DATA.routes || []).filter((r) => r.yearIds.indexOf(ep.id) !== -1).map((r) => r.stops.map((s) => [s.lat, s.lon]))
        : [];
      globe.setRoutes(routes);
    }

    function setViewParam(view) {
      if (!cinematic || !history.replaceState) return;
      try {
        const u = new URL(location.href);
        if (view === "globe") u.searchParams.set("view", "globe");
        else u.searchParams.delete("view");
        history.replaceState(null, "", u.pathname + u.search);
      } catch (e) {}
    }

    function ensureGlobe() {
      if (globeFailed) return Promise.resolve(null);
      if (globeLoading) return globeLoading;
      globeLoading = import(new URL(GLOBE_SRC, document.baseURI).href).then((mod) => {
        if (!mod.webglAvailable()) throw new Error("WebGL2 unavailable");
        globe = mod.create(globeHost, {
          reduce: REDUCE,
          onPick: pickFromGlobe,
          onZoomThrough: (p) => showMap({ lat: p.lat, lon: p.lon }, 5)
        });
        globe.hide();
        syncGlobe(currentEpoch(), currentPolities(currentEpoch()));
        return globe;
      }).catch((err) => {
        console.error(err);
        globeFailed = true;
        viewBtn.remove();
        globeHost.remove();
        return null;
      });
      return globeLoading;
    }

    async function showGlobe(from) {
      const ask = { from: from };
      globeAsk = ask;
      const g = await ensureGlobe();
      if (globeAsk !== ask) return false;
      globeAsk = null;
      if (!g) return false;
      if (!from && state.view === "globe") return true;
      const c = from || (state.lmap ? { lat: state.lmap.getCenter().lat, lon: state.lmap.getCenter().lng } : epochFocus(currentEpoch()));
      state.view = "globe";
      root.classList.add("is-globe-view");
      viewBtn.setAttribute("aria-pressed", "true");
      viewBtn.classList.add("active");
      credit.textContent = "Globe: NASA Blue Marble · Close imagery: Esri · Borders: Cliopatria / Seshat";
      setViewParam("globe");
      g.jumpTo(c.lat, c.lon, 1.6);
      g.show();
      g.flyTo(c.lat, c.lon, 2.8);
      return true;
    }

    function showMap(center, zoom) {
      if (state.view === "map") return;
      state.view = "map";
      if (state.lmap && center) state.lmap.setView([center.lat, center.lon], zoom || 5, { animate: false });
      root.classList.remove("is-globe-view");
      viewBtn.setAttribute("aria-pressed", "false");
      viewBtn.classList.remove("active");
      credit.textContent = mapCredit;
      setViewParam("map");
      if (state.lmap) state.lmap.invalidateSize();
      window.setTimeout(() => { if (state.view === "map" && globe) globe.hide(); }, REDUCE ? 0 : 480);
    }

    viewBtn.addEventListener("click", () => {
      if (state.view === "globe") {
        const v = globe.view();
        showMap({ lat: v.lat, lon: v.lon }, tileZoom(currentEpoch()));
      } else {
        showGlobe();
      }
    });

    function pickFromGlobe(id) {
      const found = findMapItem(id);
      if (!found) return;
      pickItem(found.item, found.isEvent);
      if (globe) globe.flyTo(found.item.lat, found.item.lon, Math.min(globe.view().dist, 2.2));
    }

    function pickItem(item, isEvent) {
      if (!nodeOpen(item.id)) {
        if (window.BAJourney && typeof window.BAJourney.announceLock === "function") {
          window.BAJourney.announceLock("node", item.id);
        }
        return;
      }
      if (isEvent && item.yearId !== state.yearId && !isLessonId(item.id)) {
        setYear(item.yearId, { animate: true, chapter: cinematic, open: false });
      }
      openDossier(markerCopy(item, isEvent));
    }

    function flyToEpoch(ep, animate) {
      const { lat, lon } = epochFocus(ep);
      const z = tileZoom(ep);
      flyBadge.querySelector("img").src = iconSrc(ep.metal);
      flyBadge.querySelector("span").textContent = ep.label;
      flyBadge.hidden = false;
      const hideBadge = () => { flyBadge.hidden = true; };
      setTimeout(hideBadge, REDUCE ? 0 : 1700);
      if (state.view === "globe" && globe) {
        if (state.lmap) state.lmap.setView([lat, lon], z, { animate: false });
        const go = animate ? globe.flyTo(lat, lon, globeDistance(z)) : (globe.jumpTo(lat, lon, globeDistance(z)), Promise.resolve());
        return go.then(hideBadge);
      }
      if (!state.lmap) { hideBadge(); return Promise.resolve(); }
      if (animate && !REDUCE) {
        state.lmap.flyTo([lat, lon], z, { duration: 1.55, easeLinearity: 0.2 });
        return new Promise((resolve) => state.lmap.once("moveend", () => { hideBadge(); resolve(); }));
      }
      state.lmap.setView([lat, lon], z, { animate: false });
      hideBadge();
      return Promise.resolve();
    }

    function clearOverlays() {
      if (state.glowLayer && state.lmap) {
        state.lmap.removeLayer(state.glowLayer);
        state.glowLayer = null;
      }
      if (state.geoLayer && state.lmap) {
        state.lmap.removeLayer(state.geoLayer);
        state.geoLayer = null;
      }
      if (state.markerLayer && state.lmap) {
        state.lmap.removeLayer(state.markerLayer);
        state.markerLayer = null;
      }
      if (state.routeLayer && state.lmap) {
        state.lmap.removeLayer(state.routeLayer);
        state.routeLayer = null;
      }
    }

    function selectPolity(name) {
      const style = DATA.empires[name];
      const ep = currentEpoch();
      openDossier({
        kicker: style ? style.span : ep.kicker,
        title: style ? style.name : name,
        body: style ? style.insight : ep.insight,
        cite: (style ? style.beast + "  " : "") + ep.scripture,
        art: (style && style.art) || ep.art,
        kind: "empire",
        id: style ? style.id : name
      });
    }

    function routeFor(ep) {
      return (DATA.routes || []).find((r) => r.yearIds.indexOf(ep.id) !== -1) || null;
    }

    function dropEventParam(keepId) {
      if (!cinematic || !history.replaceState) return;
      try {
        const u = new URL(location.href);
        const id = u.searchParams.get("event");
        if (!id || id === keepId) return;
        u.searchParams.delete("event");
        history.replaceState(null, "", u.pathname + u.search);
      } catch (e) {}
    }

    function closeDossier() {
      routeRun++;
      dossier.classList.remove("open");
    }

    function openDossier(d) {
      const pin = d.kind !== "epoch" && !d.routeStop;
      if (window.Insights && pin) window.Insights.track('map_pin', state.sheetIndex, { id: d.id || d.title || '' });
      if (d.kind !== "epoch") state.yearGen++;
      dropEventParam(pin ? d.id : null);
      const ep = currentEpoch();
      const studyHref = "study.html?id=" + ep.studySheet;
      const galHref = "gallery.html" + (ep.galleryId ? "?id=" + ep.galleryId : "");
      const symbol = SYMBOLS[ep.galleryId] || "";
      const symbolNote = '<p class="cmap-symbol-note">The 3D gallery shows the symbols from Daniel\'s visions, not this place.' +
        (d.lat != null ? " To see the real ground, use Close-up." : "") + "</p>";
      const fullHref = "map.html?year=" + ep.id;
      const routeBtn = routeFor(ep) ? '<button type="button" class="cmap-play-route cmap-route-go">Play route</button>' : "";
      dossier.innerHTML = `
        <button class="cmap-close" type="button" aria-label="Close">✕</button>
        <div class="kicker">${d.kicker || ep.kicker}</div>
        <h2>${d.title}</h2>
        ${satelliteHtml(d)}
        ${dossierBodyHtml(d.body)}
        <div class="cite">${d.cite || ep.scripture}</div>
        ${ep.approximateYear ? '<p class="cmap-approx">Boundaries for this year are an approximate historicist overlay, not a surveyed frontier.</p>' : ""}
        ${styleSource(d, ep)}
        ${d.art ? '<img src="' + d.art + '" alt="">' : ""}
        ${siteExtrasHtml(d)}
        <div class="cmap-dossier-actions">
          ${cinematic ? '<a href="' + studyHref + '">Read in the study desk</a><a href="' + galHref + '" title="Opens the 3D gallery of Daniel\'s symbols">' + (symbol ? "Symbol in 3D: " + symbol : "Symbols in 3D") + "</a>" + routeBtn + (d.lat != null ? '<button type="button" class="cmap-play-route cmap-closeup">Close-up</button>' : "")
            : '<a class="cmap-enter" href="' + fullHref + '">Enter cinematic map →</a>'}
        </div>
        ${cinematic ? symbolNote : ""}`;
      const closeBtn = dossier.querySelector(".cmap-closeup");
      if (closeBtn) closeBtn.addEventListener("click", () => closeUp(d));
      const satGo = dossier.querySelector(".cmap-sat-go");
      if (satGo) satGo.addEventListener("click", () => closeUp(d));
      const satFrame = dossier.querySelector(".cmap-sat-frame");
      if (satFrame) satFrame.addEventListener("click", (ev) => { if (!ev.target.closest("[data-poi]")) closeUp(d); });
      dossier.querySelectorAll("[data-poi]").forEach((b) => b.addEventListener("click", () => flyToPoi(d, Number(b.dataset.poi))));
      const wasOpen = dossier.classList.contains("open");
      dossier.classList.add("open");
      if (wasOpen && !REDUCE) {
        dossier.classList.remove("is-swapping");
        void dossier.offsetWidth;
        dossier.classList.add("is-swapping");
      }
      dossier.querySelector(".cmap-close").addEventListener("click", closeDossier);
      const playRouteBtn = dossier.querySelector(".cmap-route-go");
      if (playRouteBtn) playRouteBtn.addEventListener("click", () => playRoute(ep));
      if (opts.onSelect) opts.onSelect(d, ep);
    }

    function styleSource(d, ep) {
      const emp = Object.values(DATA.empires || {}).find((e) => e.id === (d && d.id));
      const src = (emp && emp.source) || "";
      if (!src) return "";
      return '<p class="cmap-source"><b>Evidence</b> ' + src + "</p>";
    }

    function openEpochDossier(ep) {
      const focusEvent = DATA.events.find((e) => e.id === ep.event);
      if (!focusEvent) return;
      openDossier({
        kicker: ep.metal.toUpperCase() + "  ·  " + focusEvent.kicker,
        title: ep.title,
        body: ep.summary + " " + ep.insight,
        cite: ep.scripture,
        art: ep.art,
        kind: "epoch",
        id: ep.id
      });
    }

    function currentPolities(ep) {
      let raw = (state.polities && state.polities.features || [])
        .filter((f) => ep.mapYear != null && f.properties.mapYear === ep.mapYear);
      if (ep.includeNames) raw = raw.filter((f) => ep.includeNames.indexOf(f.properties.name) !== -1);
      if (ep.excludeNames) raw = raw.filter((f) => ep.excludeNames.indexOf(f.properties.name) === -1);
      return raw;
    }

    function drawOverlays(ep) {
      clearOverlays();
      const opacity = ep.polityOpacity == null ? 1 : ep.polityOpacity;
      const raw = currentPolities(ep);
      syncGlobe(ep, raw);
      const feats = raw.map(smoothFeature);

      if (!state.lmap) return;
      if (state.layers.borders) {
        if (!state.lmap.getPane("glowPane")) {
          state.lmap.createPane("glowPane");
          state.lmap.getPane("glowPane").style.zIndex = 410;
          state.lmap.getPane("glowPane").style.filter = "blur(2.4px)";
          state.lmap.getPane("glowPane").style.pointerEvents = "none";
        }
        state.glowLayer = L.geoJSON({ type: "FeatureCollection", features: feats }, {
          pane: "glowPane",
          interactive: false,
          style: (feature) => {
            const st = fillStyle(DATA.empires[feature.properties.name], opacity);
            const active = DATA.empires[feature.properties.name] && DATA.empires[feature.properties.name].id === ep.focus;
            return {
              color: st.color,
              weight: active ? 14 : 10,
              fill: false,
              opacity: 0.55,
              lineJoin: "round",
              lineCap: "round"
            };
          }
        }).addTo(state.lmap);
        state.geoLayer = L.geoJSON({ type: "FeatureCollection", features: feats }, {
          style: (feature) => {
            const st = fillStyle(DATA.empires[feature.properties.name], opacity);
            const active = DATA.empires[feature.properties.name] && DATA.empires[feature.properties.name].id === ep.focus;
            st.weight = active ? 3.2 : 2.2;
            st.className = "cmap-border";
            return st;
          },
          onEachFeature: (feature, layer) => {
            const name = feature.properties.name;
            layer.bindTooltip(name, { className: "cmap-tip", sticky: true });
            layer.on("click", () => selectPolity(name));
          }
        }).addTo(state.lmap);
      }

      state.markerLayer = L.layerGroup().addTo(state.lmap);
      if (state.layers.cities) DATA.cities.forEach((c) => addLeafletMarker(c, false, ep));
      if (state.layers.events) DATA.events.forEach((evn) => addLeafletMarker(evn, true, ep));
      lessonExtraItems(ep).forEach((item) => addLeafletMarker(item, item.kind !== "city", ep));
      if (state.layers.routes) drawRoutes(ep);
      applyLabelLayer();
      applyOverlayOpacity();
    }

    function drawRoutes(ep) {
      const routes = (DATA.routes || []).filter((r) => r.yearIds.indexOf(ep.id) !== -1);
      if (!routes.length || !state.lmap) return;
      state.routeLayer = L.layerGroup().addTo(state.lmap);
      routes.forEach((r) => {
        const latlngs = r.stops.map((s) => [s.lat, s.lon]);
        const line = L.polyline(latlngs, {
          color: "#f0d78c",
          weight: 3,
          opacity: 0.9,
          dashArray: "10 8",
          className: "cmap-route"
        });
        line.bindTooltip(r.name, { className: "cmap-tip" });
        line.addTo(state.routeLayer);
      });
    }

    function applyOverlayOpacity() {
      const o = state.overlayOpacity;
      if (state.geoLayer) state.geoLayer.setStyle((feature) => {
        const ep = currentEpoch();
        const st = fillStyle(DATA.empires[feature.properties.name], ep.polityOpacity);
        st.fillOpacity *= o;
        st.opacity *= o;
        return st;
      });
      if (state.glowLayer) state.glowLayer.setStyle({ opacity: 0.55 * o });
      if (state.routeLayer) {
        state.routeLayer.eachLayer((layer) => {
          if (layer.setStyle) layer.setStyle({ opacity: 0.9 * o });
        });
      }
    }

    async function playRoute(ep) {
      const route = routeFor(ep);
      if (!route || !state.lmap) return;
      const run = ++routeRun;
      const live = () => run === routeRun && state.yearId === ep.id && dossier.classList.contains("open");
      for (let i = 0; i < route.stops.length; i++) {
        if (!live()) return;
        const stop = route.stops[i];
        if (state.view === "globe" && globe) globe.flyTo(stop.lat, stop.lon, 1.9);
        else state.lmap.flyTo([stop.lat, stop.lon], Math.max(tileZoom(ep), 6), { duration: 1.1 });
        openDossier({
          kicker: route.name,
          title: stop.name,
          body: "Stop " + (i + 1) + " of " + route.stops.length + " on “" + route.name + ".”",
          cite: ep.scripture,
          art: stop.art || ep.art,
          kind: "event",
          id: ep.event,
          routeStop: true
        });
        await new Promise((r) => setTimeout(r, REDUCE ? 200 : 1600));
      }
    }

    function medalIcon(src, name, hot) {
      return L.divIcon({
        className: "cmap-medal" + (hot ? " is-pulse" : " is-dim"),
        html: "<img src='" + src + "' alt=''><span class='label'>" + name + "</span>",
        iconSize: [44, 44],
        iconAnchor: [22, 22]
      });
    }

    function lessonExtraItems(ep) {
      const pack = sheetPack();
      if (!pack) return [];
      return (pack.nodes || []).filter((n) => {
        const known = DATA.events.some((e) => e.id === n.id) || DATA.cities.some((c) => c.id === n.id);
        return !known && n.lat != null && n.lon != null;
      }).map((n) => ({
        id: n.id,
        name: n.title,
        lat: n.lat,
        lon: n.lon,
        yearId: n.yearId || ep.id,
        kind: n.kind || "event",
        kicker: n.kicker,
        text: n.body,
        scripture: n.scripture,
        art: n.art
      }));
    }

    function findMapItem(id) {
      const event = DATA.events.find((e) => e.id === id);
      if (event) return { item: event, isEvent: true };
      const city = DATA.cities.find((c) => c.id === id);
      if (city) return { item: city, isEvent: false };
      const extras = lessonExtraItems(currentEpoch());
      const extra = extras.find((e) => e.id === id);
      if (extra) return { item: extra, isEvent: extra.kind !== "city" };
      return null;
    }

    function openItemById(id) {
      if (!nodeOpen(id)) {
        if (window.BAJourney && typeof window.BAJourney.announceLock === "function") {
          window.BAJourney.announceLock("node", id);
        }
        return;
      }
      const found = findMapItem(id);
      if (!found) return;
      openDossier(markerCopy(found.item, found.isEvent));
      if (found.item.lat != null && state.view === "globe" && globe) {
        globe.flyTo(found.item.lat, found.item.lon, 2.0);
      } else if (found.item.lat != null && state.lmap) {
        const z = Math.max(state.lmap.getZoom ? state.lmap.getZoom() : 5, 6);
        state.lmap.flyTo([found.item.lat, found.item.lon], z, { duration: REDUCE ? 0 : 0.75 });
      }
    }

    function markerCopy(item, isEvent) {
      const overlay = lessonOverlay(item.id);
      return {
        kicker: (overlay && overlay.kicker) || item.kicker,
        title: (overlay && overlay.title) || item.name,
        body: (overlay && overlay.body) || item.text,
        cite: (overlay && overlay.scripture) || item.scripture,
        art: (overlay && overlay.art) || item.art || epochById(isEvent ? item.yearId : state.yearId).art,
        kind: isEvent ? "event" : "city",
        id: item.id,
        lat: item.lat,
        lon: item.lon,
        pois: item.pois,
        artifact: item.artifact,
        sat: isEvent ? item.sat : (item.sat || {})
      };
    }

    function satView(d) {
      if (!cinematic || d.lat == null || !(d.sat || (d.pois && d.pois.length))) return null;
      const conf = d.sat || {};
      if (d.pois && d.pois.length) {
        const lats = d.pois.map((p) => p.lat);
        const lons = d.pois.map((p) => p.lon);
        const lat = (Math.min.apply(null, lats) + Math.max.apply(null, lats)) / 2;
        const lon = (Math.min.apply(null, lons) + Math.max.apply(null, lons)) / 2;
        let zoom = 17;
        while (zoom > 12) {
          const a = worldPx(Math.max.apply(null, lats), Math.min.apply(null, lons), zoom);
          const b = worldPx(Math.min.apply(null, lats), Math.max.apply(null, lons), zoom);
          if (b.x - a.x <= 280 && b.y - a.y <= 150) break;
          zoom--;
        }
        return { lat: lat, lon: lon, zoom: zoom, approx: !!conf.approx };
      }
      return { lat: d.lat, lon: d.lon, zoom: conf.zoom || (d.kind === "city" ? 14 : 15), approx: !!conf.approx };
    }

    function satelliteHtml(d) {
      const v = satView(d);
      if (!v) return "";
      const hi = (window.devicePixelRatio || 1) >= 1.5 && v.zoom < 18;
      const z = v.zoom + (hi ? 1 : 0);
      const k = hi ? 0.5 : 1;
      const n = Math.pow(2, z);
      const c = worldPx(v.lat, v.lon, z);
      const halfW = 230 / k;
      const halfH = 110 / k;
      let mosaic = "";
      for (let ty = Math.floor((c.y - halfH) / 256); ty <= Math.floor((c.y + halfH) / 256); ty++) {
        if (ty < 0 || ty >= n) continue;
        for (let tx = Math.floor((c.x - halfW) / 256); tx <= Math.floor((c.x + halfW) / 256); tx++) {
          const wx = ((tx % n) + n) % n;
          mosaic += "<img src='" + SAT_TILE + z + "/" + ty + "/" + wx + "' alt='' decoding='async' style='left:calc(50% + " + ((tx * 256 - c.x) * k).toFixed(1) + "px);top:calc(50% + " + ((ty * 256 - c.y) * k).toFixed(1) + "px);width:" + 256 * k + "px;height:" + 256 * k + "px'>";
        }
      }
      const marks = (d.pois && d.pois.length ? d.pois : [{ name: d.title, lat: d.lat, lon: d.lon }]).map((p, i) => {
        const at = worldPx(p.lat, p.lon, z);
        const dx = (at.x - c.x) * k;
        const pos = "left:calc(50% + " + dx.toFixed(1) + "px);top:calc(50% + " + ((at.y - c.y) * k).toFixed(1) + "px)";
        return d.pois && d.pois.length
          ? "<button type='button' class='cmap-sat-mark" + (dx > 88 ? " is-left" : "") + "' data-poi='" + i + "' style='" + pos + "' title='" + esc(p.desc || p.name) + "'><span>" + esc(p.name) + "</span></button>"
          : "<span class='cmap-sat-mark is-point' style='" + pos + "'></span>";
      }).join("");
      return "<figure class='cmap-sat'><div class='cmap-sat-frame' role='img' aria-label='" + esc("Satellite view of " + d.title) + "'>" + mosaic + marks + "</div>" +
        "<figcaption><span>" + (v.approx ? "Approximate area" : "From above") + " · Imagery © Esri</span><button type='button' class='cmap-sat-go'>Explore from above →</button></figcaption></figure>";
    }

    function esc(s) {
      return String(s == null ? "" : s).replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" })[ch]);
    }

    function siteExtrasHtml(d) {
      if (!cinematic || d.lat == null) return "";
      let html = "";
      if (d.artifact) {
        const a = d.artifact;
        html += "<div class='cmap-artifact'><small>Artifact · " + esc(a.museum) + "</small><strong>" + esc(a.title) + "</strong><p>" + esc(a.desc) + "</p>" +
          (a.source ? "<p class='cmap-source'><b>Source</b> " + esc(a.source) + "</p>" : "") + "</div>";
      }
      if (d.pois && d.pois.length) {
        html += "<div class='cmap-pois'><small>Landmarks · tap to fly in</small><div>" +
          d.pois.map((p, i) => "<button type='button' data-poi='" + i + "' title='" + esc(p.desc) + "'>" + esc(p.name) + "</button>").join("") +
          "</div></div>";
      }
      const jer = DATA.cities.find((c) => c.id === "jerusalem");
      if (jer) {
        const km = haversineKm(d.lat, d.lon, jer.lat, jer.lon);
        if (km > 3) html += "<p class='cmap-distance'>" + distanceText(km) + " from Jerusalem</p>";
      }
      return html;
    }

    function clearSiteLayers() {
      if (!state.lmap) return;
      if (state.poiLayer) state.lmap.removeLayer(state.poiLayer);
      if (state.footprint) state.lmap.removeLayer(state.footprint);
      state.poiLayer = null;
      state.footprint = null;
    }

    function showFootprint() {
      if (!state.lmap || !state.footprint) return;
      const want = state.lmap.getZoom() >= 15;
      const has = state.lmap.hasLayer(state.footprint);
      if (want && !has) state.footprint.addTo(state.lmap);
      if (!want && has) state.lmap.removeLayer(state.footprint);
    }

    function flyToPoi(d, i) {
      const p = d.pois[i];
      if (!p) return;
      if (state.view === "globe") showMap({ lat: p.lat, lon: p.lon }, 12);
      if (!state.lmap) return;
      clearSiteLayers();
      state.poiLayer = L.layerGroup().addTo(state.lmap);
      d.pois.forEach((q, n) => {
        L.circleMarker([q.lat, q.lon], {
          radius: n === i ? 8 : 5,
          color: "#f0d78c",
          weight: 2,
          fillColor: n === i ? "#d4af37" : "#1a140c",
          fillOpacity: 0.9,
          className: "cmap-poi-dot"
        }).bindTooltip(q.name, { className: "cmap-tip", permanent: n === i, direction: "top", offset: [0, -8] }).addTo(state.poiLayer);
      });
      const lats = d.pois.map((q) => q.lat);
      const lons = d.pois.map((q) => q.lon);
      const pad = 0.0015;
      state.footprint = L.rectangle([[Math.min.apply(null, lats) - pad, Math.min.apply(null, lons) - pad], [Math.max.apply(null, lats) + pad, Math.max.apply(null, lons) + pad]], {
        color: "#f0d78c",
        weight: 2,
        dashArray: "8 6",
        fill: false,
        interactive: false,
        className: "cmap-footprint"
      });
      state.lmap.flyTo([p.lat, p.lon], p.zoom || 17, { duration: REDUCE ? 0 : 1.4 });
      state.lmap.once("moveend", showFootprint);
    }

    function closeUp(d) {
      const v = satView(d) || { lat: d.lat, lon: d.lon, zoom: 8 };
      if (state.view === "globe") showMap({ lat: v.lat, lon: v.lon }, Math.min(v.zoom, 7));
      if (state.lmap) state.lmap.flyTo([v.lat, v.lon], v.zoom, { duration: REDUCE ? 0 : 1.4 });
    }

    function addLeafletMarker(item, isEvent, ep) {
      if (!nodeOpen(item.id)) return;
      const lesson = isLessonId(item.id);
      const hot = lesson || (isEvent ? item.yearId === ep.id : (item.pulse || []).includes(ep.id));
      if (isEvent && !hot && !cinematic) return;
      const kind = isEvent ? (item.kind || "battle") : "city";
      const src = iconSrc(kind);
      const mk = L.marker([item.lat, item.lon], {
        icon: medalIcon(src, item.name, hot),
        zIndexOffset: hot ? 900 : 200,
        keyboard: true,
        title: item.name
      });
      mk.on("click", () => pickItem(item, isEvent));
      mk.addTo(state.markerLayer);
    }

    function destroyLeaflet() {
      if (state.lmap) {
        state.lmap.fire("moveend");
        state.lmap.remove();
        state.lmap = null;
      }
      state.geoLayer = null;
      state.glowLayer = null;
      state.markerLayer = null;
      state.labelTiles = null;
      state.poiLayer = null;
      state.footprint = null;
      state.beaconMarker = null;
    }

    function initLeaflet(base) {
      destroyLeaflet();
      tiles.innerHTML = "";
      state.base = base;
      const ep = currentEpoch();
      state.lmap = L.map(tiles, {
        zoomControl: false,
        attributionControl: true,
        minZoom: 2,
        maxZoom: cinematic ? 18 : 12,
        worldCopyJump: true
      });
      const sat = L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", {
        attribution: "Tiles © Esri",
        maxZoom: 18
      });
      const labels = L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}", {
        attribution: "",
        maxZoom: 18,
        opacity: 0.9
      });
      state.labelTiles = labels;
      const streets = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap",
        maxZoom: 18
      });
      if (base === "streets") {
        streets.addTo(state.lmap);
        mapCredit = "Map: OpenStreetMap · Borders: Cliopatria / Seshat";
      } else {
        sat.addTo(state.lmap);
        if (state.layers.labels) labels.addTo(state.lmap);
        mapCredit = "Satellite: Esri World Imagery · Borders: Cliopatria / Seshat";
      }
      if (state.view === "map") credit.textContent = mapCredit;
      L.control.scale({ position: "bottomleft", imperial: false, maxWidth: 140 }).addTo(state.lmap);
      if (cinematic) addRuler(state.lmap);
      state.lmap.on("zoomend", () => {
        showFootprint();
        if (state.view === "map" && !globeFailed && mapReady && state.lmap.getZoom() <= 2) {
          const c = state.lmap.getCenter();
          showGlobe({ lat: c.lat, lon: c.lng });
        }
      });
      state.lmap.on("mousemove", (ev) => {
        const p = ev.latlng;
        coords.textContent = p.lat.toFixed(2) + "°, " + p.lng.toFixed(2) + "°";
      });
      state.lmap.setView([ep.camera.lat, ep.camera.lon], tileZoom(ep));
      drawOverlays(ep);
      setTimeout(() => state.lmap && state.lmap.invalidateSize(), 80);
    }

    function addRuler(lmap) {
      const Ruler = L.Control.extend({
        options: { position: "bottomright" },
        onAdd: function () {
          const box = L.DomUtil.create("div", "leaflet-bar cmap-ruler");
          const btn = L.DomUtil.create("a", "", box);
          btn.href = "#";
          btn.title = "Measure: click two points";
          btn.setAttribute("role", "button");
          btn.setAttribute("aria-pressed", "false");
          btn.innerHTML = "<svg viewBox='0 0 24 24' aria-hidden='true'><path d='M3 17 17 3l4 4L7 21z M7 13l2 2 M10 10l2 2 M13 7l2 2' fill='none' stroke='currentColor' stroke-width='1.6'/></svg>";
          L.DomEvent.disableClickPropagation(box);
          let on = false;
          let pts = [];
          let layer = null;
          const reset = () => {
            pts = [];
            if (layer) lmap.removeLayer(layer);
            layer = null;
          };
          const onClick = (ev) => {
            if (pts.length === 2) reset();
            pts.push(ev.latlng);
            if (!layer) layer = L.layerGroup().addTo(lmap);
            L.circleMarker(ev.latlng, { radius: 4, color: "#f0d78c", weight: 2, fillColor: "#1a140c", fillOpacity: 1 }).addTo(layer);
            if (pts.length === 2) {
              const km = haversineKm(pts[0].lat, pts[0].lng, pts[1].lat, pts[1].lng);
              L.polyline(pts, { color: "#f0d78c", weight: 2, dashArray: "6 5" })
                .bindTooltip(distanceText(km), { permanent: true, className: "cmap-tip", direction: "center" })
                .addTo(layer);
            }
          };
          L.DomEvent.on(btn, "click", (ev) => {
            L.DomEvent.preventDefault(ev);
            on = !on;
            btn.classList.toggle("active", on);
            btn.setAttribute("aria-pressed", String(on));
            lmap.getContainer().classList.toggle("is-measuring", on);
            if (on) lmap.on("click", onClick);
            else {
              lmap.off("click", onClick);
              reset();
            }
          });
          return box;
        }
      });
      new Ruler().addTo(lmap);
    }

    function applyLabelLayer() {
      root.classList.toggle("hide-pin-labels", !state.layers.labels);
      if (!state.lmap || !state.labelTiles) return;
      const has = state.lmap.hasLayer(state.labelTiles);
      if (state.layers.labels && state.base !== "streets" && !has) state.labelTiles.addTo(state.lmap);
      if (!state.layers.labels && has) state.lmap.removeLayer(state.labelTiles);
    }

    function setBasemap(name) {
      const next = name === "streets" ? "streets" : "satellite";
      markBase(next);
      try { localStorage.setItem(BASE_STORE, next); } catch (e) {}
      initLeaflet(next);
    }

    bases.addEventListener("click", (ev) => {
      const btn = ev.target.closest("button[data-base]");
      if (btn) setBasemap(btn.dataset.base);
    });

    function showChapter(ep) {
      if (!cinematic) return Promise.resolve();
      const img = chapter.querySelector("img");
      chapter.querySelector("small").textContent = ep.label + "  ·  " + ep.kicker;
      chapter.querySelector("h1").textContent = ep.title;
      img.src = ep.plate;
      chapter.classList.add("show");
      return new Promise((resolve) => {
        window.setTimeout(() => {
          chapter.classList.remove("show");
          resolve();
        }, REDUCE ? 0 : 900);
      });
    }

    function updateChrome(ep) {
      const icon = cartouche.querySelector(".cmap-cartouche-icon");
      if (icon) icon.src = iconSrc(ep.metal);
      cartouche.querySelector("strong").textContent = ep.label;
      cartouche.querySelector("span").textContent = ep.kicker;
      track.querySelectorAll(".cmap-year").forEach((b) => {
        const open = yearOpen(b.dataset.year);
        b.classList.toggle("active", b.dataset.year === ep.id);
        b.setAttribute("aria-selected", b.dataset.year === ep.id ? "true" : "false");
        b.classList.toggle("is-locked", !open);
        b.disabled = false;
        b.setAttribute("aria-disabled", open ? "false" : "true");
        if (!open && window.BAJourney && typeof window.BAJourney.lockExplain === "function") {
          const note = window.BAJourney.lockExplain("year", b.dataset.year);
          b.title = note.title + " — " + note.body;
        } else {
          const src = DATA.epochs.find(function (row) { return row.id === b.dataset.year; });
          b.title = src ? src.title : "";
        }
      });
      if (cinematic && !scrubbing) {
        scrubInput.value = String(ep.scrub === false ? scrubMax : ep.year);
        scrubRead(Number(scrubInput.value));
      }
      stone.style.opacity = String(ep.stone || 0);
      root.classList.toggle("is-stone-world", Number(ep.stone || 0) > 0.05);
      const enter = root.querySelector(".cmap-enter-overlay");
      if (enter) enter.href = "map.html?year=" + ep.id;
      if (cinematic && history.replaceState) {
        try {
          const u = new URL(location.href);
          u.searchParams.set("year", ep.id);
          const evn = DATA.events.find((e) => e.id === u.searchParams.get("event"));
          if (!evn || evn.yearId !== ep.id) u.searchParams.delete("event");
          if (state.sheetIndex != null) u.searchParams.set("sheet", String(state.sheetIndex));
          history.replaceState(null, "", u.pathname + u.search);
        } catch (e) {}
      }
      if (window.BAJourney) window.BAJourney.save({ year: ep.id });
      if (opts.onYear) opts.onYear(ep);
    }

    async function setYear(id, flags) {
      if (!yearOpen(id)) id = firstOpenYear();
      const ep = epochById(id);
      const f = flags || {};
      const gen = ++state.yearGen;
      if (ep.id !== state.yearId) clearSiteLayers();
      state.yearId = ep.id;
      if (window.Insights) window.Insights.track('map_year', state.sheetIndex, { year: ep.id });
      updateChrome(ep);
      drawOverlays(ep);
      if (f.open !== false && !f.focusId) openEpochDossier(ep);
      if (f.chapter !== false && cinematic && f.animate !== false) {
        await showChapter(ep);
        if (gen !== state.yearGen) return;
      }
      await flyToEpoch(ep, f.animate !== false);
      if (gen !== state.yearGen) return;
      if (f.focusId) openItemById(f.focusId);
    }

    function applySheet(index, flags) {
      const f = flags || {};
      state.sheetIndex = clampSheetIndex(index);
      const pack = sheetPack();
      const year = f.year || (pack && pack.year) || state.yearId;
      const focus = f.focusId === null ? undefined : (f.focusId || (pack && pack.focusId));
      return setYear(year, {
        animate: f.animate !== false,
        chapter: false,
        open: false,
        focusId: focus
      });
    }

    function setSheet(index, flags) {
      state.sheetIndex = clampSheetIndex(index);
      if (!mapReady) {
        queuedSheet = { index: state.sheetIndex, flags: flags || {} };
        return Promise.resolve();
      }
      return applySheet(index, flags);
    }

    function yearIndex() {
      return DATA.epochs.findIndex((e) => e.id === state.yearId);
    }
    function stepYear(dir) {
      let i = yearIndex();
      for (let n = 0; n < DATA.epochs.length; n++) {
        i = clamp(i + dir, 0, DATA.epochs.length - 1);
        if (yearOpen(DATA.epochs[i].id)) {
          setYear(DATA.epochs[i].id, { animate: true, chapter: cinematic });
          return;
        }
        if (i === 0 || i === DATA.epochs.length - 1) break;
      }
      const blocked = DATA.epochs[clamp(yearIndex() + dir, 0, DATA.epochs.length - 1)];
      if (blocked && !yearOpen(blocked.id) && window.BAJourney && typeof window.BAJourney.announceLock === "function") {
        window.BAJourney.announceLock("year", blocked.id);
      }
    }
    let scrubbing = false;

    function scrubRead(v) {
      const y = v === 0 ? 1 : v;
      const c = yearsComplete(y);
      const read = scrub.querySelector(".cmap-scrub-read");
      read.querySelector("strong").textContent = scrubYearLabel(y);
      read.querySelector("span").textContent = (c >= 0 ? Math.min(c, 2300).toLocaleString("en-US") + " of 2,300 years · " : "") + scrubPeriod(y);
    }

    function scrubOpenPath() {
      return scrubPath.filter((ep) => yearOpen(ep.id));
    }

    function scrubPoint(v) {
      const path = scrubOpenPath();
      if (!path.length) return null;
      if (v <= path[0].year) return epochFocus(path[0]);
      for (let i = 0; i < path.length - 1; i++) {
        const a = path[i];
        const b = path[i + 1];
        if (v <= b.year) {
          const t = (v - a.year) / Math.max(1, b.year - a.year);
          const pa = epochFocus(a);
          const pb = epochFocus(b);
          return { lat: pa.lat + (pb.lat - pa.lat) * t, lon: pa.lon + (pb.lon - pa.lon) * t };
        }
      }
      return epochFocus(path[path.length - 1]);
    }

    function setBeacon(p) {
      if (globe) globe.setBeacon(p ? p.lat : null, p ? p.lon : null);
      if (!state.lmap) return;
      if (!p) {
        if (state.beaconMarker) state.lmap.removeLayer(state.beaconMarker);
        state.beaconMarker = null;
        return;
      }
      if (!state.beaconMarker) {
        state.beaconMarker = L.marker([p.lat, p.lon], {
          icon: L.divIcon({ className: "cmap-lbeacon", iconSize: [18, 18], iconAnchor: [9, 9] }),
          interactive: false,
          keyboard: false,
          zIndexOffset: 1200
        }).addTo(state.lmap);
      } else {
        state.beaconMarker.setLatLng([p.lat, p.lon]);
      }
    }

    function scrubPreview(v) {
      scrubRead(v);
      setBeacon(scrubPoint(v));
    }

    function nearestOpenEpoch(v) {
      let best = null;
      scrubOpenPath().forEach((ep) => {
        if (!best || Math.abs(ep.year - v) < Math.abs(best.year - v)) best = ep;
      });
      return best;
    }

    scrubInput.addEventListener("input", () => {
      scrubbing = true;
      state.playing = false;
      playBtn.textContent = "▶";
      scrubPreview(Number(scrubInput.value));
    });
    scrubInput.addEventListener("change", () => {
      scrubbing = false;
      setBeacon(null);
      const ep = nearestOpenEpoch(Number(scrubInput.value));
      if (!ep) return;
      if (ep.id !== state.yearId) setYear(ep.id, { animate: true, chapter: false });
      else updateChrome(ep);
    });

    function animateScrub(from, to, ms, run) {
      return new Promise((resolve) => {
        if (REDUCE || !cinematic) { window.setTimeout(resolve, REDUCE ? 200 : ms); return; }
        const t0 = performance.now();
        scrubbing = true;
        const tick = (now) => {
          if (!state.playing || run !== playRun) { scrubbing = false; setBeacon(null); resolve(); return; }
          const t = Math.min(1, (now - t0) / ms);
          const v = Math.round(from + (to - from) * t);
          scrubInput.value = String(v);
          scrubPreview(v);
          if (t < 1) requestAnimationFrame(tick);
          else { scrubbing = false; setBeacon(null); resolve(); }
        };
        requestAnimationFrame(tick);
      });
    }

    prevBtn.addEventListener("click", () => { state.playing = false; playBtn.textContent = "▶"; stepYear(-1); });
    nextBtn.addEventListener("click", () => { state.playing = false; playBtn.textContent = "▶"; stepYear(1); });

    let playRun = 0;

    async function playChronicle() {
      if (state.playing) {
        state.playing = false;
        playBtn.textContent = "▶";
        return;
      }
      state.playing = true;
      const run = ++playRun;
      playBtn.textContent = "❚❚";
      let i = yearIndex();
      if (i >= DATA.epochs.length - 1) i = 0;
      for (; i < DATA.epochs.length; i++) {
        if (!state.playing || run !== playRun) return;
        if (!yearOpen(DATA.epochs[i].id)) continue;
        await setYear(DATA.epochs[i].id, { animate: true, chapter: cinematic });
        if (!state.playing || run !== playRun) return;
        const here = DATA.epochs[i];
        const next = DATA.epochs.slice(i + 1).find((ep) => yearOpen(ep.id));
        if (cinematic && next && here.scrub !== false && next.scrub !== false) {
          await animateScrub(here.year, next.year, 2600, run);
        } else {
          await new Promise((r) => setTimeout(r, REDUCE ? 200 : 2600));
        }
      }
      state.playing = false;
      playBtn.textContent = "▶";
    }
    playBtn.addEventListener("click", () => playChronicle());

    layers.addEventListener("change", (ev) => {
      const box = ev.target.closest("input[data-layer]");
      if (!box) return;
      state.layers[box.dataset.layer] = box.checked;
      drawOverlays(currentEpoch());
    });
    const compare = layers.querySelector("#cmap-compare");
    if (compare) {
      compare.addEventListener("input", () => {
        state.overlayOpacity = Number(compare.value) / 100;
        applyOverlayOpacity();
      });
    }
    const searchInput = searchBox.querySelector("input");
    const searchHits = searchBox.querySelector(".cmap-search-hits");
    searchInput.addEventListener("input", () => {
      const q = searchInput.value.trim().toLowerCase();
      if (q.length < 2) { searchHits.hidden = true; return; }
      const hits = [];
      DATA.epochs.forEach((ep) => {
        if (!yearOpen(ep.id)) return;
        if ((ep.title + ep.label + ep.kicker).toLowerCase().indexOf(q) !== -1) hits.push({ kind: "year", id: ep.id, label: ep.label + " — " + ep.title });
      });
      DATA.cities.forEach((c) => {
        if (!nodeOpen(c.id)) return;
        const pulse = c.pulse || [];
        const year = pulse.includes(state.yearId) ? state.yearId : (pulse[0] || state.yearId);
        if (c.name.toLowerCase().indexOf(q) !== -1) hits.push({ kind: "city", id: c.id, year: year, label: c.name, lat: c.lat, lon: c.lon });
      });
      DATA.events.forEach((evn) => {
        if (!nodeOpen(evn.id)) return;
        if (evn.name.toLowerCase().indexOf(q) !== -1) hits.push({ kind: "event", id: evn.id, year: evn.yearId, label: evn.name, lat: evn.lat, lon: evn.lon });
      });
      searchHits.innerHTML = hits.slice(0, 8).map((h) => "<button type='button' data-kind='" + h.kind + "' data-id='" + h.id + "' data-year='" + (h.year || h.id) + "' data-lat='" + (h.lat || "") + "' data-lon='" + (h.lon || "") + "'>" + h.label + "</button>").join("") || "<p>No matches</p>";
      searchHits.hidden = false;
    });
    searchHits.addEventListener("click", (ev) => {
      const b = ev.target.closest("button");
      if (!b) return;
      searchHits.hidden = true;
      searchInput.value = "";
      const year = b.dataset.year;
      if (year && (b.dataset.kind === "year" || year !== state.yearId)) setYear(year, { animate: true, chapter: cinematic });
      if (b.dataset.lat && state.view === "globe" && globe) globe.flyTo(Number(b.dataset.lat), Number(b.dataset.lon), 2.0);
      else if (b.dataset.lat && state.lmap) state.lmap.flyTo([Number(b.dataset.lat), Number(b.dataset.lon)], 7);
      // A picked hit should open its place panel, not just fly the camera there.
      const kind = b.dataset.kind;
      let item = null;
      if (kind === "city") item = DATA.cities.find((c) => c.id === b.dataset.id);
      else if (kind === "event") item = DATA.events.find((e) => e.id === b.dataset.id);
      if (item) openDossier(markerCopy(item, kind === "event"));
    });

    const layersPanel = root.querySelector("#cmap-layers-panel");
    const legendPanel = root.querySelector("#cmap-legend-panel");
    const btnLayers = root.querySelector("#cmap-btn-layers");
    const btnLegend = root.querySelector("#cmap-btn-legend");
    if (btnLayers && layersPanel) {
      btnLayers.addEventListener("click", () => {
        const open = layersPanel.classList.toggle("is-open");
        btnLayers.setAttribute("aria-expanded", String(open));
      });
    }
    if (btnLegend && legendPanel) {
      let keyPref = null;
      try { keyPref = localStorage.getItem("cmap-key-open"); } catch (err) {}
      if (cinematic && window.innerWidth >= 1200 && keyPref !== "0") {
        legendPanel.classList.add("is-open");
        btnLegend.setAttribute("aria-expanded", "true");
      }
      btnLegend.addEventListener("click", () => {
        const open = legendPanel.classList.toggle("is-open");
        btnLegend.setAttribute("aria-expanded", String(open));
        try { localStorage.setItem("cmap-key-open", open ? "1" : "0"); } catch (err) {}
      });
    }

    function zoomStep(dir) {
      if (state.view === "globe" && globe) {
        globe.zoomBy(dir > 0 ? 0.7 : 1.4);
        return;
      }
      if (!state.lmap) return;
      if (dir < 0 && !globeFailed && state.lmap.getZoom() <= state.lmap.getMinZoom()) {
        const c = state.lmap.getCenter();
        showGlobe({ lat: c.lat, lon: c.lng });
        return;
      }
      if (dir > 0) state.lmap.zoomIn();
      else state.lmap.zoomOut();
    }

    zoomCtl.addEventListener("click", (ev) => {
      const b = ev.target.closest("[data-zoom]");
      if (b) zoomStep(Number(b.dataset.zoom));
    });

    const helpBtns = Array.from(root.querySelectorAll("#cmap-btn-help, .cmap-zoom-help"));
    let helpReturn = null;

    function helpOpen() {
      return !!(help && !help.hidden);
    }

    function openHelp() {
      if (!help || helpOpen()) return;
      helpReturn = document.activeElement;
      help.hidden = false;
      helpBtns.forEach((b) => b.setAttribute("aria-expanded", "true"));
      const closeHelpBtn = help.querySelector(".cmap-help-close");
      if (closeHelpBtn) closeHelpBtn.focus();
    }

    function closeHelp() {
      if (!helpOpen()) return;
      help.hidden = true;
      helpBtns.forEach((b) => b.setAttribute("aria-expanded", "false"));
      if (helpReturn && helpReturn.focus) helpReturn.focus();
      helpReturn = null;
    }

    if (help) {
      helpBtns.forEach((b) => b.addEventListener("click", () => (helpOpen() ? closeHelp() : openHelp())));
      help.addEventListener("click", (ev) => {
        if (ev.target === help || ev.target.closest(".cmap-help-close")) closeHelp();
      });
      help.addEventListener("keydown", (ev) => {
        if (ev.key !== "Tab") return;
        const stops = [help.querySelector(".cmap-help-close"), help.querySelector(".cmap-help-card")].filter(Boolean);
        if (!stops.length) return;
        ev.preventDefault();
        const at = stops.indexOf(document.activeElement);
        stops[(at + (ev.shiftKey ? stops.length - 1 : 1) + stops.length) % stops.length].focus();
      });
    }

    if (cinematic) {
      window.addEventListener("keydown", (ev) => {
        const t = ev.target;
        const typing = t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT" || t.isContentEditable);
        if (ev.key === "Escape") {
          if (helpOpen()) {
            closeHelp();
            return;
          }
          closeDossier();
          return;
        }
        if (typing || helpOpen()) return;
        if (ev.key === "?") { ev.preventDefault(); openHelp(); return; }
        if (ev.ctrlKey || ev.metaKey || ev.altKey) return;
        if (ev.key === "+" || ev.key === "=") { ev.preventDefault(); zoomStep(1); return; }
        if (ev.key === "-" || ev.key === "_") { ev.preventDefault(); zoomStep(-1); return; }
        if (ev.key === "ArrowRight") { ev.preventDefault(); state.playing = false; playBtn.textContent = "▶"; stepYear(1); }
        else if (ev.key === "ArrowLeft") { ev.preventDefault(); state.playing = false; playBtn.textContent = "▶"; stepYear(-1); }
        else if (ev.key === " ") { ev.preventDefault(); playChronicle(); }
      });
      window.setTimeout(() => hint.classList.add("is-gone"), 5200);
    }

    function resize() {
      if (state.lmap) state.lmap.invalidateSize();
    }
    window.addEventListener("resize", resize);
    if (window.ResizeObserver) new ResizeObserver(resize).observe(stage);

    function globePlan(params) {
      const want = !globeFailed && params.get("view") === "globe";
      let seen = false;
      try { seen = sessionStorage.getItem(GLOBE_INTRO) === "1"; } catch (e) {}
      const fresh = ["year", "epoch", "id", "event", "sheet", "from", "view"].every((k) => !params.get(k));
      const intro = !globeFailed && !want && fresh && !seen && !opts.skipOverture && !REDUCE;
      const ready = (want || intro) ? ensureGlobe().then((g) => (g ? g.ready : false)) : Promise.resolve(false);
      return { want: want, intro: intro, ready: ready };
    }

    async function enterGlobe(plan) {
      if (!plan.want && !plan.intro) return false;
      const ok = await Promise.race([plan.ready, new Promise((r) => setTimeout(() => r(false), plan.want ? 8000 : 3500))]);
      if (!ok && !(plan.want && globe)) return false;
      const f = epochFocus(epochById(state.yearId));
      return showGlobe({ lat: f.lat - 8, lon: f.lon + 40 });
    }

    async function finishIntro() {
      try { sessionStorage.setItem(GLOBE_INTRO, "1"); } catch (e) {}
      await new Promise((r) => setTimeout(r, 1400));
      if (state.view !== "globe" || state.playing) return;
      const ep = currentEpoch();
      const f = epochFocus(ep);
      const landed = await globe.flyTo(f.lat, f.lon, 1.45);
      if (landed && state.view === "globe") showMap(f, tileZoom(ep));
    }

    async function start() {
      if (cinematic) {
        const allowed = window.BAJourney && typeof window.BAJourney.requireMember === "function"
          ? await window.BAJourney.requireMember("map.html" + (location.search || ""))
          : false;
        if (!allowed) return;
      }
      if (typeof L === "undefined") {
        loadEl.textContent = "Map library failed to load.";
        return;
      }
      try {
        state.polities = await loadJson(DATA.sources.polities);
      } catch (err) {
        loadEl.textContent = "Could not load map geography.";
        console.error(err);
        return;
      }
      const params = new URLSearchParams(location.search);
      if (cinematic && state.sheetIndex == null && /^\d+$/.test(String(params.get("sheet") || ""))) {
        state.sheetIndex = clampSheetIndex(Number(params.get("sheet")));
      }
      const eventId = params.get("event");
      const eventRaw = eventId ? DATA.events.find((e) => e.id === eventId) : null;
      const eventItem = (eventRaw && nodeOpen(eventRaw.id)) ? eventRaw : null;
      if (eventRaw && !eventItem && window.BAJourney && typeof window.BAJourney.announceLock === "function") {
        window.BAJourney.announceLock("node", eventRaw.id);
      }
      let startId = parseYearParam(opts.year || params.get("year") || (eventItem ? eventItem.yearId : null)) || state.yearId;
      if (!yearOpen(startId)) {
        if ((params.get("year") || eventRaw) && window.BAJourney && typeof window.BAJourney.announceLock === "function") {
          window.BAJourney.announceLock("year", startId);
        }
        startId = firstOpenYear();
      }
      state.yearId = epochById(startId).id;
      let base = savedBase();
      const qBase = new URLSearchParams(location.search).get("basemap");
      if (qBase) base = qBase;
      if (base !== "streets") base = "satellite";
      markBase(base);
      initLeaflet(base);
      loadEl.classList.add("is-done");
      const plan = globePlan(params);
      if (cinematic && !opts.skipOverture && !REDUCE) {
        overture.classList.add("show");
        await new Promise((r) => setTimeout(r, 900));
        overture.classList.remove("show");
      }
      const globeOn = await enterGlobe(plan);
      await setYear(state.yearId, {
        animate: !eventItem,
        chapter: cinematic && !opts.skipOverture,
        open: cinematic && !eventItem
      });
      if (eventItem) openItemById(eventItem.id);
      mapReady = true;
      if (globeOn && plan.intro) await finishIntro();
      if (queuedSheet) {
        await applySheet(queuedSheet.index, queuedSheet.flags);
        queuedSheet = null;
      } else if (!cinematic && state.sheetIndex != null) {
        drawOverlays(currentEpoch());
      }
    }

    start();

    function refreshJourneyLocks() {
      if (!mapReady) return;
      if (!yearOpen(state.yearId)) {
        setYear(firstOpenYear(), { animate: false, chapter: false, open: false });
        return;
      }
      const ep = currentEpoch();
      updateChrome(ep);
      drawOverlays(ep);
    }
    if (window.ScrollAuth && typeof window.ScrollAuth.onChange === "function") {
      window.ScrollAuth.onChange(refreshJourneyLocks);
    }
    if (window.ScrollAuth && typeof window.ScrollAuth.ready === "function") {
      window.ScrollAuth.ready().then(refreshJourneyLocks);
    }

    return {
      setYear: (id, flags) => setYear(id, flags || { animate: true, chapter: false, open: false }),
      setSheet: setSheet,
      openNode: openItemById,
      resize: resize,
      getYear: () => state.yearId,
      el: root
    };
  }

  window.ChronicleMap = { mount: mount, parseYear: parseYearParam, epochs: DATA.epochs };
})();
