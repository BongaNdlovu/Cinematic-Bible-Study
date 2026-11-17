(function () {
  'use strict';

  const DATA = window.MAP_CHRONICLE;
  const { BASE_STORE, el, epochById, iconSrc } = window.MapRender;

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

  async function loadJson(url) {
    const alts = url.endsWith(".geojson")
      ? [url, url.replace(/\.geojson$/i, ".json")]
      : [url, url.replace(/\.json$/i, ".geojson")];
    let lastErr = null;
    for (const u of alts) {
      try {
        /* SiteNet throws on non-2xx and on timeout — either way, fall through
           to the next alternate, and keep the last error for classification. */
        return await window.SiteNet.request(u, {
          timeoutMs: 10000,
          onSlow: () => { const loadEl = document.querySelector(".cmap-load"); if (loadEl) loadEl.textContent = "Still unrolling the chronique\u2026"; }
        }).then((r) => r.json());
      } catch (err) {
        lastErr = err;
      }
    }
    throw lastErr || new Error("missing");
  }

  function savedBase() {
    try { return localStorage.getItem(BASE_STORE) || "satellite"; } catch (e) { return "satellite"; }
  }

  function buildMapDom(deps) {
    const { cinematic, globeFailed, root, setYear, stopPlayback, yearOpen } = deps;
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
        stopPlayback();
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
    return { stage, tiles, globeHost, stone, loadEl, chapter, overture, cartouche, legend, dossier, hint, credit, timeline, prevBtn, nextBtn, track, playBtn, scrubPath, scrubMax, scrub, scrubInput, bases };
  }

  function wireMapControls(deps) {
    const { cinematic, closeDossier, closeHelp, help, helpBtns, helpOpen, hint, openHelp, playChronicle, resize, stage, stepYear, stopPlayback, zoomStep } = deps;
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
        if (ev.key === "ArrowRight") { ev.preventDefault(); stopPlayback(); stepYear(1); }
        else if (ev.key === "ArrowLeft") { ev.preventDefault(); stopPlayback(); stepYear(-1); }
        else if (ev.key === " ") { ev.preventDefault(); playChronicle(); }
      });
      window.setTimeout(() => hint.classList.add("is-gone"), 5200);
    }

    window.addEventListener("resize", resize);
    if (window.ResizeObserver) new ResizeObserver(resize).observe(stage);
  }

  function buildMapChrome(deps) {
    const { bases, cartouche, chapter, chrome, cinematic, compass, coords, credit, dossier, flyBadge, hint, layers, legend, loadEl, overture, root, searchBox, stage, state, timeline } = deps;
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
    return { zoomCtl, help };
  }

  window.MapDom = Object.freeze({ HELP_HTML, parseYearParam, loadJson, savedBase, buildMapDom, wireMapControls, buildMapChrome });
})();
