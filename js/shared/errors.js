(function () {
  let lastError = "";
  let lastKind = "";
  let lastLock = null;

  function banner() {
    if (!document.body) return null;
    let el = document.getElementById("site-error-banner");
    if (!el) {
      el = document.createElement("div");
      el.id = "site-error-banner";
      el.className = "site-error-banner";
      el.setAttribute("role", "alert");
      document.body.appendChild(el);
    }
    return el;
  }

  function paint() {
    const el = banner();
    if (!el) return;
    if (!lastError) {
      el.hidden = true;
      el.textContent = "";
      el.removeAttribute("data-error");
      return;
    }
    el.hidden = false;
    el.dataset.error = lastKind || "generic";
    if (lastKind === "lock" && lastLock) {
      el.replaceChildren();
      const title = document.createElement("strong");
      title.textContent = lastLock.title || "This is still locked";
      const body = document.createElement("p");
      body.textContent = lastLock.body || lastError;
      el.appendChild(title);
      el.appendChild(body);
      const row = document.createElement("div");
      row.className = "site-error-actions";
      if (lastLock.href) {
        const link = document.createElement("a");
        link.href = lastLock.href;
        link.textContent = lastLock.action || "Continue the open sitting";
        row.appendChild(link);
      }
      const close = document.createElement("button");
      close.type = "button";
      close.textContent = "Dismiss";
      close.addEventListener("click", clear);
      row.appendChild(close);
      el.appendChild(row);
      return;
    }
    el.replaceChildren();
    const span = document.createElement("span");
    span.className = "site-error-text";
    span.textContent = lastError;
    el.appendChild(span);
    const closeBtn = document.createElement("button");
    closeBtn.type = "button";
    closeBtn.className = "site-error-close";
    closeBtn.setAttribute("aria-label", "Dismiss notification");
    closeBtn.textContent = "×";
    closeBtn.addEventListener("click", clear);
    el.appendChild(closeBtn);
  }

  function show(message, kind) {
    lastLock = null;
    lastError = message || "";
    lastKind = kind || "generic";
    paint();
    if (window.ScrollTerms && typeof window.ScrollTerms.syncError === "function") {
      window.ScrollTerms.syncError();
    }
  }

  function showLock(detail) {
    lastLock = detail || {};
    lastError = ((lastLock.title || "") + " " + (lastLock.body || "")).trim() || "This is still locked";
    lastKind = "lock";
    paint();
  }

  function clear() {
    if (!lastError) return;
    lastError = "";
    lastKind = "";
    lastLock = null;
    paint();
    if (window.ScrollTerms && typeof window.ScrollTerms.syncError === "function") {
      window.ScrollTerms.syncError();
    }
  }

  function current() {
    return lastError;
  }

  window.addEventListener("error", function (e) {
    const msg = (e && e.message) || "";
    if (/ResizeObserver|Script error\.?$|tailwind|THREE|WebGL/i.test(msg)) return;
    show("Something on this page failed to load. Refresh and try again.", "page");
  });

  window.addEventListener("unhandledrejection", function (e) {
    const reason = String((e && e.reason && (e.reason.message || e.reason)) || "");
    if (/ResizeObserver|Load failed|abort|Failed to fetch/i.test(reason)) return;
    show("Something on this page failed. Refresh and try again.", "page");
  });

  window.addEventListener("offline", function () {
    show("You appear to be offline. Sign-in and the exhibit need a connection.", "offline");
    paintPending();
  });

  window.addEventListener("online", function () {
    if (lastKind === "offline") clear();
    paintPending();
  });

  /* ---- Pending-sync chip -------------------------------------------------
     Outboxes (progress, study notes) report their queue state here so a reader
     always knows which writes are still on this device. Non-blocking: sits at
     the bottom edge, never covers content, and clears itself once drained.
     Sources register by name so two sync modules never clobber each other. */
  const pendingSources = Object.create(null);

  function pendingChip() {
    if (!document.body) return null;
    let el = document.getElementById("site-sync-chip");
    if (!el) {
      el = document.createElement("div");
      el.id = "site-sync-chip";
      el.className = "site-sync-chip";
      el.setAttribute("role", "status");
      document.body.appendChild(el);
    }
    return el;
  }

  function paintPending() {
    const el = pendingChip();
    if (!el) return;
    const names = Object.keys(pendingSources).filter(function (k) { return pendingSources[k]; });
    if (names.length === 0) {
      el.hidden = true;
      el.textContent = "";
      return;
    }
    const offline = navigator.onLine === false;
    el.textContent = offline
      ? "Pending sync · your latest changes will send when you are back online"
      : "Pending sync · your latest changes are on their way";
    el.hidden = false;
    el.dataset.pending = offline ? "offline" : "sending";
  }

  function setPendingSource(name, pending) {
    const key = String(name || "generic");
    const value = !!pending;
    if (pendingSources[key] === value) return;
    pendingSources[key] = value;
    paintPending();
  }

  function showPending(count) {
    setPendingSource("generic", count > 0);
  }

  /* ---- Broken-image fallback ---------------------------------------------
     One capture-phase listener covers every <img> on every page: failed images
     swap to an inline plate instead of the browser's broken-image glyph, so
     layout holds and the gap reads as intentional. Opt out with
     data-no-fallback on the img. */
  const IMG_FALLBACK = "data:image/svg+xml," + encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="480" height="320" viewBox="0 0 480 320">' +
    '<rect width="480" height="320" fill="#191209"/>' +
    '<rect x="6" y="6" width="468" height="308" fill="none" stroke="#3a2f1c" stroke-width="2"/>' +
    '<path d="M240 128 l26 32 -26 32 -26 -32 z" fill="none" stroke="#8a744d" stroke-width="2"/>' +
    '<text x="240" y="232" fill="#8a744d" font-family="Georgia, serif" font-size="17" ' +
    'letter-spacing="2" text-anchor="middle">IMAGE UNAVAILABLE</text></svg>'
  );

  function installImageFallback() {
    document.addEventListener("error", function (e) {
      const img = e.target;
      if (!(img instanceof HTMLImageElement)) return;
      if (img.dataset.imgFallback) return;
      if (img.hasAttribute("data-no-fallback")) return;
      if (!img.getAttribute("src")) return;
      img.dataset.imgFallback = "1";
      img.classList.add("is-img-fallback");
      img.src = IMG_FALLBACK;
    }, true);
  }

  window.SiteErrors = {
    show: show,
    showLock: showLock,
    clear: clear,
    current: current,
    paint: paint,
    showPending: showPending,
    setPendingSource: setPendingSource,
    paintPending: paintPending
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      paint();
      paintPending();
      installImageFallback();
    });
  } else {
    paint();
    paintPending();
    installImageFallback();
  }
})();
