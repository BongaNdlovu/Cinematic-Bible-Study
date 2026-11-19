(function () {
  'use strict';

  const { clamp, fillStyle, smoothFeature, haversineKm, distanceText, scrubYearLabel, yearsComplete, scrubPeriod, worldPx } = window.MapMath;
  const DATA = window.MAP_CHRONICLE;
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

  function epochById(id) {
    return DATA.epochs.find((e) => e.id === id) || DATA.epochs[0];
  }

  function iconSrc(key) {
    const icons = DATA.icons || {};
    if (key === "iron-clay") return icons.clay || icons["iron-clay"];
    return icons[key] || icons.gold;
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

  function epochFocus(ep) {
    const focus = DATA.events.find((e) => e.id === ep.event);
    const useCam = ep.camera && ep.camera.useCamera;
    return {
      lat: useCam || !focus ? ep.camera.lat : focus.lat,
      lon: useCam || !focus ? ep.camera.lon : focus.lon
    };
  }

  const SAT_TILE = "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/";

  function make(deps) {
    const { bases, chapter, cinematic, clampSheetIndex, closeDossier, dossier, dossierBodyHtml, esc, initLeaflet, isLessonId, lessonOverlay, loadEl, nodeOpen, opts, playRoute, root, scrub, scrubPath, setBeacon, setYear, sheetPack, showMap, start, state, stopPlayback, syncGlobe, yearOpen } = deps;

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

    function setViewParam(view) {
      if (!cinematic || !history.replaceState) return;
      try {
        const u = new URL(location.href);
        if (view === "globe") u.searchParams.set("view", "globe");
        else u.searchParams.delete("view");
        history.replaceState(null, "", u.pathname + u.search);
      } catch (e) {}
    }

    function pickItem(item, isEvent) {
      if (!nodeOpen(item.id)) {
        if (window.BAJourney && typeof window.BAJourney.announceLock === "function") {
          window.BAJourney.announceLock("node", item.id);
        }
        return;
      }
      const isOtherYear = isEvent && item.yearId !== state.yearId && !isLessonId(item.id);
      if (isOtherYear) {
        stopPlayback();
        setYear(item.yearId, { animate: true, chapter: cinematic, open: false });
        openDossier(markerCopy(item, isEvent), { keepYearFlight: true });
        return;
      }
      openDossier(markerCopy(item, isEvent));
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

    function openDossier(d, dossierOpts) {
      const pin = d.kind !== "epoch" && !d.routeStop;
      const keepYearFlight = !!(dossierOpts && dossierOpts.keepYearFlight);
      if (window.Insights && pin) window.Insights.track('map_pin', state.sheetIndex, { id: d.id || d.title || '' });
      if (d.kind !== "epoch" && !keepYearFlight) state.yearGen++;
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
          style: (feature) => borderStyle(feature, ep, opacity),
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

    function borderStyle(feature, ep, opacity) {
      const emp = DATA.empires[feature.properties.name];
      const st = fillStyle(emp, opacity);
      st.weight = emp && emp.id === ep.focus ? 3.2 : 2.2;
      st.className = "cmap-border";
      return st;
    }

    function applyOverlayOpacity() {
      const o = state.overlayOpacity;
      if (state.geoLayer) {
        const ep = currentEpoch();
        state.geoLayer.setStyle((feature) => {
          const st = borderStyle(feature, ep, ep.polityOpacity);
          st.fillOpacity *= o;
          st.opacity *= o;
          return st;
        });
        state.geoLayer.eachLayer((layer) => {
          const path = layer.getElement && layer.getElement();
          if (path) path.style.pointerEvents = o > 0 ? '' : 'none';
        });
      }
      if (state.glowLayer) state.glowLayer.setStyle({ opacity: 0.55 * o });
      if (state.routeLayer) {
        state.routeLayer.eachLayer((layer) => {
          if (layer.setStyle) layer.setStyle({ opacity: 0.9 * o });
        });
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

    function resize() {
      if (state.lmap) state.lmap.invalidateSize();
    }

    function showLoadFailure(err) {
      const kind = window.SiteNet && typeof window.SiteNet.classify === "function"
        ? window.SiteNet.classify(err)
        : "network";
      loadEl.textContent = kind === "offline"
        ? "You are offline \u2014 the chronique needs a connection."
        : kind === "timeout" || kind === "network"
          ? "The chronique is taking too long to arrive."
          : "Could not load map geography.";
      const retry = el("button", {
        class: "cmap-retry",
        type: "button",
        style: { marginTop: "10px", padding: "6px 14px", borderRadius: "999px", cursor: "pointer",
                 border: "1px solid rgba(212,175,55,0.5)", background: "rgba(24,18,12,0.95)",
                 color: "#f0e0b8", font: "inherit", fontSize: "12.5px" }
      }, "Try again");
      retry.addEventListener("click", () => {
        retry.remove();
        loadEl.textContent = "Unrolling the chronique\u2026";
        start();
      });
      loadEl.appendChild(document.createElement("br"));
      loadEl.appendChild(retry);
      console.error(err);
    }

    return { addRuler, applyOverlayOpacity, applySheet, clearSiteLayers, currentEpoch, currentPolities, destroyLeaflet, drawOverlays, findMapItem, globeItems, markBase, markerCopy, nearestOpenEpoch, openDossier, openEpochDossier, pickItem, resize, routeFor, scrubPreview, scrubRead, selectPolity, setBasemap, setViewParam, showChapter, showFootprint, showLoadFailure, stepYear, yearIndex };
  }

  window.MapRender = Object.freeze({ REDUCE, BASE_STORE, SYMBOLS, epochById, iconSrc, el, epochFocus, SAT_TILE, make });
})();
