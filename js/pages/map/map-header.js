(function () {
  'use strict';

  const { el } = window.MapRender;

  function make(deps) {
    const { clampSheetIndex, opts } = deps;

    function cinematicChrome() {
      let chrome = null;
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
      return chrome;
    }

    return { cinematicChrome };
  }

  window.MapHeader = Object.freeze({ make });
})();
