(function () {
  const DATA = window.MAP_CHRONICLE;
  if (!DATA) {
    console.error("MAP_CHRONICLE failed to load.");
    return;
  }

  const REDUCE = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const KEY_STORE = "baGoogleMapsKey";
  const BASE_STORE = "baMapBasemap";

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
  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = src;
      s.async = true;
      s.addEventListener("load", resolve);
      s.addEventListener("error", () => reject(new Error("Failed to load " + src)));
      document.head.appendChild(s);
    });
  }
  function googleKey() {
    try { return localStorage.getItem(KEY_STORE) || ""; } catch (e) { return ""; }
  }
  function savedBase() {
    try { return localStorage.getItem(BASE_STORE) || "satellite"; } catch (e) { return "satellite"; }
  }

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
      kind: "leaflet",
      base: "satellite",
      lmap: null,
      gmap: null,
      geoLayer: null,
      markerLayer: null,
      gPolys: [],
      gMarkers: [],
      glowLayer: null,
      labelTiles: null,
      playing: false,
      layers: { borders: true, cities: true, events: true, labels: true, routes: true },
      overlayOpacity: 1,
      routeLayer: null,
      compareEl: null,
      sheetIndex: clampSheetIndex(opts.sheetIndex != null
        ? opts.sheetIndex
        : (opts.sheet != null && /^\d+$/.test(String(opts.sheet).trim()) ? Number(String(opts.sheet).trim()) : null))
    };
    let mapReady = false;
    let queuedSheet = null;

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
    const legend = el("div", { class: "cmap-legend" },
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
    const hint = el("div", { class: "cmap-hint" }, "Drag to pan · scroll to zoom · space to play · click a medal");
    const credit = el("div", { class: "cmap-credit" }, "Satellite: Esri World Imagery · Borders: Cliopatria / Seshat");
    const keyPanel = el("div", { class: "cmap-key-panel", hidden: true },
      "<p>Google Maps needs a Maps JavaScript API key from Google Cloud. Satellite Earth works without one.</p>" +
      "<input type='text' autocomplete='off' spellcheck='false' placeholder='Paste your Google Maps API key'>" +
      "<div class='cmap-key-actions'><button type='button' class='go'>Use Google Maps</button>" +
      "<button type='button' class='skip'>Stay on satellite</button></div>");
    const timeline = el("div", { class: "cmap-timeline" });
    const prevBtn = el("button", { class: "cmap-nav-year", type: "button", title: "Previous year", "aria-label": "Previous year" }, "‹");
    const nextBtn = el("button", { class: "cmap-nav-year", type: "button", title: "Next year", "aria-label": "Next year" }, "›");
    const track = el("div", { class: "cmap-year-track", role: "tablist", "aria-label": "Chronicle years" });
    DATA.epochs.forEach((ep) => {
      const src = iconSrc(ep.metal);
      const b = el("button", { class: "cmap-year", type: "button", role: "tab", "data-year": ep.id, title: ep.title },
        "<img src='" + src + "' alt=''><span>" + ep.label + "</span>");
      b.addEventListener("click", () => {
        if (!yearOpen(ep.id)) return;
        setYear(ep.id, { animate: true, chapter: cinematic });
      });
      track.appendChild(b);
    });
    const playBtn = el("button", { class: "cmap-play", type: "button", title: "Play the chronicle", "aria-label": "Play the chronicle" }, "▶");
    timeline.appendChild(prevBtn);
    timeline.appendChild(track);
    timeline.appendChild(nextBtn);
    timeline.appendChild(playBtn);

    const bases = el("div", { class: "cmap-basemap", role: "group", "aria-label": "Basemap" },
      "<button type='button' data-base='satellite'>Satellite</button>" +
      "<button type='button' data-base='streets'>Streets</button>" +
      "<button type='button' data-base='google'>Google</button>");
    const layers = el("div", { class: "cmap-layers" },
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
    const compass = el("div", { class: "cmap-compass", "aria-label": "North" },
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
      const backLabel = sheetSafe ? "← Back to this lesson" : "← Study desk";
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
          <a href="study.html">Study</a>
          <a href="${galleryHref}">3D Gallery</a>
          <a class="active" href="map.html">Map</a>
        </nav>`;
    }

    root.appendChild(stage);
    if (chrome) root.appendChild(chrome);
    root.appendChild(cartouche);
    if (cinematic) root.appendChild(legend);
    root.appendChild(bases);
    root.appendChild(layers);
    root.appendChild(searchBox);
    root.appendChild(compass);
    root.appendChild(coords);
    root.appendChild(flyBadge);
    root.appendChild(dossier);
    root.appendChild(timeline);
    if (cinematic) {
      root.appendChild(hint);
      root.appendChild(credit);
      root.appendChild(overture);
    }
    root.appendChild(chapter);
    root.appendChild(keyPanel);
    root.appendChild(loadEl);
    if (!cinematic) {
      root.appendChild(el("a", { class: "cmap-enter cmap-enter-overlay", href: "map.html?year=" + state.yearId }, "Enter cinematic map →"));
    }

    function markBase(name) {
      bases.querySelectorAll("button").forEach((b) => b.classList.toggle("active", b.dataset.base === name));
    }

    function currentEpoch() { return epochById(state.yearId); }

    function flyToEpoch(ep, animate) {
      const focus = DATA.events.find((e) => e.id === ep.event);
      const useCam = ep.camera && ep.camera.useCamera;
      const lat = useCam ? ep.camera.lat : (focus ? focus.lat : ep.camera.lat);
      const lon = useCam ? ep.camera.lon : (focus ? focus.lon : ep.camera.lon);
      const z = tileZoom(ep);
      flyBadge.querySelector("img").src = iconSrc(ep.metal);
      flyBadge.querySelector("span").textContent = ep.label;
      flyBadge.hidden = false;
      const hideBadge = () => { flyBadge.hidden = true; };
      setTimeout(hideBadge, REDUCE ? 0 : 1700);
      if (state.kind === "google" && state.gmap) {
        state.gmap.panTo({ lat: lat, lng: lon });
        state.gmap.setZoom(z);
        setTimeout(hideBadge, 900);
        return Promise.resolve();
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
      if (state.gmap) {
        state.gmap.data.forEach((f) => state.gmap.data.remove(f));
        state.gMarkers.forEach((m) => m.setMap(null));
        state.gMarkers = [];
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

    function openDossier(d) {
      if (d && d.kind !== "epoch") state.yearGen++;
      const ep = currentEpoch();
      const studyHref = "study.html?id=" + ep.studySheet;
      const galHref = "gallery.html" + (ep.galleryId ? "?id=" + ep.galleryId : "");
      const fullHref = "map.html?year=" + ep.id;
      dossier.innerHTML = `
        <button class="cmap-close" type="button" aria-label="Close">✕</button>
        <div class="kicker">${d.kicker || ep.kicker}</div>
        <h2>${d.title}</h2>
        ${dossierBodyHtml(d.body)}
        <div class="cite">${d.cite || ep.scripture}</div>
        ${ep.approximateYear ? '<p class="cmap-approx">Boundaries for this year are an approximate historicist overlay, not a surveyed frontier.</p>' : ""}
        ${styleSource(d, ep)}
        ${d.art ? '<img src="' + d.art + '" alt="">' : ""}
        <div class="cmap-dossier-actions">
          ${cinematic ? '<a href="' + studyHref + '">Read in the study desk</a><a href="' + galHref + '">View in 3D</a><button type="button" class="cmap-play-route">Play route</button>'
            : '<a class="cmap-enter" href="' + fullHref + '">Enter cinematic map →</a>'}
        </div>`;
      dossier.classList.add("open");
      dossier.querySelector(".cmap-close").addEventListener("click", () => dossier.classList.remove("open"));
      const playRouteBtn = dossier.querySelector(".cmap-play-route");
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

    function drawOverlays(ep) {
      clearOverlays();
      const opacity = ep.polityOpacity == null ? 1 : ep.polityOpacity;
      let raw = (state.polities && state.polities.features || [])
        .filter((f) => ep.mapYear != null && f.properties.mapYear === ep.mapYear);
      if (ep.includeNames) raw = raw.filter((f) => ep.includeNames.indexOf(f.properties.name) !== -1);
      if (ep.excludeNames) raw = raw.filter((f) => ep.excludeNames.indexOf(f.properties.name) === -1);
      const feats = raw.map(smoothFeature);

      if (state.kind === "google" && state.gmap) {
        if (state.layers.borders) {
          state.gmap.data.addGeoJson({ type: "FeatureCollection", features: feats });
          state.gmap.data.setStyle((feature) => {
            const name = feature.getProperty("name");
            const st = fillStyle(DATA.empires[name], opacity);
            const active = DATA.empires[name] && DATA.empires[name].id === ep.focus;
            return {
              fillColor: st.fillColor,
              fillOpacity: st.fillOpacity,
              strokeColor: st.color,
              strokeWeight: active ? 4 : 3,
              strokeOpacity: 0.95
            };
          });
          state.gmap.data.addListener("click", (ev) => {
            selectPolity(ev.feature.getProperty("name"));
          });
        }
        if (state.layers.cities) DATA.cities.forEach((c) => addGoogleMarker(c, false, ep));
        if (state.layers.events) DATA.events.forEach((evn) => addGoogleMarker(evn, true, ep));
        lessonExtraItems(ep).forEach((item) => addGoogleMarker(item, item.kind !== "city", ep));
        return;
      }

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
      const route = (DATA.routes || []).find((r) => r.yearIds.indexOf(ep.id) !== -1);
      if (!route || !state.lmap) return;
      for (let i = 0; i < route.stops.length; i++) {
        const stop = route.stops[i];
        state.lmap.flyTo([stop.lat, stop.lon], Math.max(tileZoom(ep), 6), { duration: 1.1 });
        openDossier({
          kicker: route.name,
          title: stop.name,
          body: "Stop " + (i + 1) + " of " + route.stops.length + " on “" + route.name + ".”",
          cite: ep.scripture,
          art: stop.art || ep.art,
          kind: "event",
          id: ep.event
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
      if (!nodeOpen(id)) return;
      const found = findMapItem(id);
      if (!found) return;
      openDossier(markerCopy(found.item, found.isEvent));
      if (found.item.lat != null && state.lmap) {
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
        id: item.id
      };
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
      mk.on("click", () => {
        if (isEvent && item.yearId !== state.yearId && !lesson) {
          setYear(item.yearId, { animate: true, chapter: cinematic });
        }
        openDossier(markerCopy(item, isEvent));
      });
      mk.addTo(state.markerLayer);
    }

    function addGoogleMarker(item, isEvent, ep) {
      if (!nodeOpen(item.id)) return;
      const lesson = isLessonId(item.id);
      const hot = lesson || (isEvent ? item.yearId === ep.id : (item.pulse || []).includes(ep.id));
      if (isEvent && !hot && !cinematic) return;
      const kind = isEvent ? (item.kind || "battle") : "city";
      const mk = new google.maps.Marker({
        position: { lat: item.lat, lng: item.lon },
        map: state.gmap,
        title: item.name,
        opacity: hot ? 1 : 0.5,
        zIndex: hot ? 800 : 200,
        icon: {
          url: iconSrc(kind),
          scaledSize: new google.maps.Size(40, 40),
          anchor: new google.maps.Point(20, 20)
        }
      });
      mk.addListener("click", () => {
        if (isEvent && item.yearId !== state.yearId && !lesson) {
          setYear(item.yearId, { animate: true, chapter: cinematic });
        }
        openDossier(markerCopy(item, isEvent));
      });
      state.gMarkers.push(mk);
    }

    function destroyLeaflet() {
      if (state.lmap) {
        state.lmap.remove();
        state.lmap = null;
      }
      state.geoLayer = null;
      state.glowLayer = null;
      state.markerLayer = null;
      state.labelTiles = null;
    }
    function destroyGoogle() {
      state.gMarkers.forEach((m) => m.setMap(null));
      state.gMarkers = [];
      state.gmap = null;
    }

    function initLeaflet(base) {
      destroyGoogle();
      destroyLeaflet();
      tiles.innerHTML = "";
      state.kind = "leaflet";
      state.base = base;
      const ep = currentEpoch();
      state.lmap = L.map(tiles, {
        zoomControl: false,
        attributionControl: true,
        minZoom: 2,
        maxZoom: 12,
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
        credit.textContent = "Map: OpenStreetMap · Borders: Cliopatria / Seshat";
      } else {
        sat.addTo(state.lmap);
        if (state.layers.labels) labels.addTo(state.lmap);
        credit.textContent = "Satellite: Esri World Imagery · Borders: Cliopatria / Seshat";
      }
      L.control.scale({ position: "bottomleft", imperial: false, maxWidth: 140 }).addTo(state.lmap);
      state.lmap.on("mousemove", (ev) => {
        const p = ev.latlng;
        coords.textContent = p.lat.toFixed(2) + "°, " + p.lng.toFixed(2) + "°";
      });
      state.lmap.setView([ep.camera.lat, ep.camera.lon], tileZoom(ep));
      drawOverlays(ep);
      setTimeout(() => state.lmap && state.lmap.invalidateSize(), 80);
    }

    function applyLabelLayer() {
      root.classList.toggle("hide-pin-labels", !state.layers.labels);
      if (!state.lmap || !state.labelTiles) return;
      const has = state.lmap.hasLayer(state.labelTiles);
      if (state.layers.labels && state.base !== "streets" && !has) state.labelTiles.addTo(state.lmap);
      if (!state.layers.labels && has) state.lmap.removeLayer(state.labelTiles);
    }

    async function initGoogle() {
      const key = googleKey();
      if (!key) {
        keyPanel.hidden = false;
        return false;
      }
      try {
        if (!(window.google && google.maps)) {
          await loadScript("https://maps.googleapis.com/maps/api/js?key=" + encodeURIComponent(key) + "&v=weekly");
        }
      } catch (err) {
        console.error(err);
        keyPanel.hidden = false;
        return false;
      }
      destroyLeaflet();
      destroyGoogle();
      tiles.innerHTML = "";
      state.kind = "google";
      state.base = "google";
      const ep = currentEpoch();
      state.gmap = new google.maps.Map(tiles, {
        center: { lat: ep.camera.lat, lng: ep.camera.lon },
        zoom: tileZoom(ep),
        mapTypeId: "hybrid",
        disableDefaultUI: true,
        zoomControl: cinematic,
        gestureHandling: "greedy",
        backgroundColor: "#0a1218"
      });
      credit.textContent = "Google Maps · Borders: Cliopatria / Seshat";
      state.gmap.addListener("mousemove", (e) => {
        coords.textContent = e.latLng.lat().toFixed(2) + "°, " + e.latLng.lng().toFixed(2) + "°";
      });
      drawOverlays(ep);
      try { localStorage.setItem(BASE_STORE, "google"); } catch (e) {}
      return true;
    }

    async function setBasemap(name) {
      markBase(name);
      if (name === "google") {
        const ok = await initGoogle();
        if (!ok) {
          markBase(state.base === "google" ? "satellite" : state.base);
        }
        return;
      }
      keyPanel.hidden = true;
      try { localStorage.setItem(BASE_STORE, name); } catch (e) {}
      initLeaflet(name);
    }

    bases.addEventListener("click", (ev) => {
      const btn = ev.target.closest("button[data-base]");
      if (btn) setBasemap(btn.dataset.base);
    });
    keyPanel.querySelector(".go").addEventListener("click", async () => {
      const val = keyPanel.querySelector("input").value.trim();
      if (!val) return;
      try { localStorage.setItem(KEY_STORE, val); } catch (e) {}
      keyPanel.hidden = true;
      const ok = await initGoogle();
      if (ok) markBase("google");
    });
    keyPanel.querySelector(".skip").addEventListener("click", () => {
      keyPanel.hidden = true;
      setBasemap("satellite");
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
        b.classList.toggle("is-locked", !open);
        b.disabled = !open;
        b.setAttribute("aria-disabled", open ? "false" : "true");
      });
      stone.style.opacity = String(ep.stone || 0);
      root.classList.toggle("is-stone-world", Number(ep.stone || 0) > 0.05);
      const enter = root.querySelector(".cmap-enter-overlay");
      if (enter) enter.href = "map.html?year=" + ep.id;
      if (cinematic && history.replaceState) {
        try {
          const u = new URL(location.href);
          u.searchParams.set("year", ep.id);
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
      state.yearId = ep.id;
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
    }
    prevBtn.addEventListener("click", () => { state.playing = false; playBtn.textContent = "▶"; stepYear(-1); });
    nextBtn.addEventListener("click", () => { state.playing = false; playBtn.textContent = "▶"; stepYear(1); });

    async function playChronicle() {
      if (state.playing) {
        state.playing = false;
        playBtn.textContent = "▶";
        return;
      }
      state.playing = true;
      playBtn.textContent = "❚❚";
      let i = yearIndex();
      if (i >= DATA.epochs.length - 1) i = 0;
      for (; i < DATA.epochs.length; i++) {
        if (!state.playing) break;
        if (!yearOpen(DATA.epochs[i].id)) continue;
        await setYear(DATA.epochs[i].id, { animate: true, chapter: cinematic });
        if (!state.playing) break;
        await new Promise((r) => setTimeout(r, REDUCE ? 200 : 2600));
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
        if (c.name.toLowerCase().indexOf(q) !== -1) hits.push({ kind: "city", id: c.id, year: (c.pulse && c.pulse[0]) || state.yearId, label: c.name, lat: c.lat, lon: c.lon });
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
      if (year) setYear(year, { animate: true, chapter: cinematic });
      if (b.dataset.lat && state.lmap) state.lmap.flyTo([Number(b.dataset.lat), Number(b.dataset.lon)], 7);
    });

    if (cinematic) {
      window.addEventListener("keydown", (ev) => {
        const t = ev.target;
        const typing = t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT" || t.isContentEditable);
        if (ev.key === "Escape") {
          if (!keyPanel.hidden) keyPanel.hidden = true;
          else dossier.classList.remove("open");
          return;
        }
        if (typing) return;
        if (ev.key === "ArrowRight") { ev.preventDefault(); state.playing = false; playBtn.textContent = "▶"; stepYear(1); }
        else if (ev.key === "ArrowLeft") { ev.preventDefault(); state.playing = false; playBtn.textContent = "▶"; stepYear(-1); }
        else if (ev.key === " ") { ev.preventDefault(); playChronicle(); }
      });
      window.setTimeout(() => hint.classList.add("is-gone"), 5200);
    }

    function resize() {
      if (state.lmap) state.lmap.invalidateSize();
      if (state.gmap) google.maps.event.trigger(state.gmap, "resize");
    }
    window.addEventListener("resize", resize);
    if (window.ResizeObserver) new ResizeObserver(resize).observe(stage);

    async function start() {
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
      let startId = parseYearParam(opts.year || params.get("year") || (eventItem ? eventItem.yearId : null)) || state.yearId;
      if (!yearOpen(startId)) startId = firstOpenYear();
      state.yearId = epochById(startId).id;
      let base = savedBase();
      const qBase = new URLSearchParams(location.search).get("basemap");
      if (qBase) base = qBase;
      if (base === "google" && !googleKey()) base = "satellite";
      markBase(base === "google" ? "google" : base);
      if (base === "google") {
        const ok = await initGoogle();
        if (!ok) initLeaflet("satellite");
      } else {
        initLeaflet(base === "streets" ? "streets" : "satellite");
      }
      loadEl.classList.add("is-done");
      if (cinematic && !opts.skipOverture && !REDUCE) {
        overture.classList.add("show");
        await new Promise((r) => setTimeout(r, 900));
        overture.classList.remove("show");
      }
      await setYear(state.yearId, {
        animate: !eventItem,
        chapter: cinematic && !opts.skipOverture,
        open: cinematic && !eventItem
      });
      if (eventItem) openItemById(eventItem.id);
      mapReady = true;
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
      const params = new URLSearchParams(location.search);
      let id = parseYearParam(params.get("year")) || state.yearId;
      if (!yearOpen(id)) id = firstOpenYear();
      setYear(id, { animate: false, chapter: false, open: false });
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
