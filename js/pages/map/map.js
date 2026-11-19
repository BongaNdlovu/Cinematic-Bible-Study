(function () {
  const { parseYearParam, loadJson, savedBase } = window.MapDom;
  const { REDUCE, epochById, iconSrc, el, epochFocus } = window.MapRender;
  const DATA = window.MAP_CHRONICLE;
  if (!DATA) {
    console.error("MAP_CHRONICLE failed to load.");
    return;
  }

  const { tileZoom, fillStyle, globeDistance } = window.MapMath;
  const FLIGHT_FALLBACK_MS = 2_600;

  const GLOBE_SRC = "js/pages/map/globe.js";
  const GLOBE_INTRO = "cmap-globe-intro";

  function mount(root, options) {
    const opts = options || {};
    const { cinematicChrome } = window.MapHeader.make({ clampSheetIndex, opts });
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
      flightGen: 0,
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

    const { stage, tiles, globeHost, stone, loadEl, chapter, overture, cartouche, legend, dossier, hint, credit, timeline, prevBtn, nextBtn, track, playBtn, scrubPath, scrubMax, scrub, scrubInput, bases } = window.MapDom.buildMapDom({ cinematic, globeFailed, root, setYear, stopPlayback, yearOpen });
    const { addRuler, applyOverlayOpacity, applySheet, clearSiteLayers, currentEpoch, currentPolities, destroyLeaflet, drawOverlays, findMapItem, globeItems, markBase, markerCopy, nearestOpenEpoch, openDossier, openEpochDossier, pickItem, resize, routeFor, scrubPreview, scrubRead, selectPolity, setBasemap, setViewParam, showChapter, showFootprint, showLoadFailure, stepYear, yearIndex } = window.MapRender.make({ bases, chapter, cinematic, clampSheetIndex, closeDossier, dossier, dossierBodyHtml, esc, initLeaflet, isLessonId, lessonOverlay, loadEl, nodeOpen, opts, playRoute, root, scrub, scrubPath, setBeacon, setYear, sheetPack, showMap, start, state, stopPlayback, syncGlobe, yearOpen });
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
    if (cinematic) chrome = cinematicChrome();

    // Small panels shown/hidden from the phone layout (desktop shows both always).
    const { zoomCtl, help } = window.MapDom.buildMapChrome({ bases, cartouche, chapter, chrome, cinematic, compass, coords, credit, dossier, flyBadge, hint, layers, legend, loadEl, overture, root, searchBox, stage, state, timeline });

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
        const flight = ++state.flightGen;
        const map = state.lmap;
        map.flyTo([lat, lon], z, { duration: 1.55, easeLinearity: 0.2 });
        return new Promise((resolve) => {
          let fallback = 0;
          const settle = () => {
            map.off("moveend", onEnd);
            clearTimeout(fallback);
            if (flight === state.flightGen) hideBadge();
            resolve();
          };
          const onEnd = () => {
            const isSuperseded = flight !== state.flightGen;
            const center = map.getCenter();
            const isArrived = Math.abs(center.lat - lat) < 0.01 && Math.abs(center.lng - lon) < 0.01 && map.getZoom() === z;
            if (isSuperseded || isArrived) settle();
          };
          map.on("moveend", onEnd);
          fallback = setTimeout(settle, FLIGHT_FALLBACK_MS);
        });
      }
      state.lmap.setView([lat, lon], z, { animate: false });
      hideBadge();
      return Promise.resolve();
    }

    function closeDossier() {
      routeRun++;
      dossier.classList.remove("open");
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

    function esc(s) { return window.SiteCore.escapeHtml(s); }

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

    bases.addEventListener("click", (ev) => {
      const btn = ev.target.closest("button[data-base]");
      if (btn) setBasemap(btn.dataset.base);
    });

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

    function setSheet(index, flags) {
      state.sheetIndex = clampSheetIndex(index);
      if (!mapReady) {
        queuedSheet = { index: state.sheetIndex, flags: flags || {} };
        return Promise.resolve();
      }
      return applySheet(index, flags);
    }

    let scrubbing = false;

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

    scrubInput.addEventListener("input", () => {
      scrubbing = true;
      stopPlayback();
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

    prevBtn.addEventListener("click", () => { stopPlayback(); stepYear(-1); });
    nextBtn.addEventListener("click", () => { stopPlayback(); stepYear(1); });

    let playRun = 0;

    async function playChronicle() {
      if (state.playing) {
        stopPlayback();
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
      stopPlayback();
    }

    function stopPlayback() {
      state.playing = false;
      playRun += 1;
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
      Object.keys(DATA.empires).forEach((key) => {
        const emp = DATA.empires[key];
        if ((key + " " + (emp.name || "")).toLowerCase().indexOf(q) !== -1) hits.push({ kind: "empire", id: key, label: emp.name || key });
      });
      searchHits.innerHTML = hits.slice(0, 8).map((h) => "<button type='button' data-kind='" + h.kind + "' data-id='" + h.id + "' data-year='" + (h.year || h.id) + "' data-lat='" + (h.lat == null ? "" : h.lat) + "' data-lon='" + (h.lon == null ? "" : h.lon) + "'>" + h.label + "</button>").join("") || "<p>No matches</p>";
      searchHits.hidden = false;
    });
    searchHits.addEventListener("click", (ev) => {
      const b = ev.target.closest("button");
      if (!b) return;
      searchHits.hidden = true;
      searchInput.value = "";
      if (b.dataset.kind === "empire") {
        selectPolity(b.dataset.id);
        return;
      }
      const year = b.dataset.year;
      if (year && (b.dataset.kind === "year" || year !== state.yearId)) {
        stopPlayback();
        setYear(year, { animate: true, chapter: cinematic });
      }
      if (b.dataset.lat && state.view === "globe" && globe) globe.flyTo(Number(b.dataset.lat), Number(b.dataset.lon), 2.0);
      else if (b.dataset.lat && state.lmap) state.lmap.flyTo([Number(b.dataset.lat), Number(b.dataset.lon)], 7);
      // A picked hit should open its place panel, not just fly the camera there.
      const kind = b.dataset.kind;
      let item = null;
      if (kind === "city") item = DATA.cities.find((c) => c.id === b.dataset.id);
      else if (kind === "event") item = DATA.events.find((e) => e.id === b.dataset.id);
      if (item) openDossier(markerCopy(item, kind === "event"));
    });

    searchInput.addEventListener("keydown", (ev) => {
      if (ev.key === "Escape") searchHits.hidden = true;
    });
    document.addEventListener("pointerdown", (ev) => {
      if (!searchBox.contains(ev.target)) searchHits.hidden = true;
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

    window.MapDom.wireMapControls({ cinematic, closeDossier, closeHelp, help, helpBtns, helpOpen, hint, openHelp, playChronicle, resize, stage, stepYear, stopPlayback, zoomStep });

    function globePlan(params) {
      const want = !globeFailed && params.get("view") === "globe";
      let seen = false;
      try { seen = sessionStorage.getItem(GLOBE_INTRO) === "1"; } catch (e) {}
      const fresh = ["year", "epoch", "id", "event", "sheet", "from", "view"].every((k) => !params.get(k));
      const conn = navigator.connection || {};
      const lowData = conn.saveData === true || /(^|-)(2g|3g)$/.test(String(conn.effectiveType || ""));
      const intro = !globeFailed && !want && fresh && !seen && !opts.skipOverture && !REDUCE && !lowData;
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
        /* Actionable failure state: name the class, offer one-click retry. */
        showLoadFailure(err);
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
