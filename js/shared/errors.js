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
    el.textContent = lastError;
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
  });

  window.addEventListener("online", function () {
    if (lastKind === "offline") clear();
  });

  window.SiteErrors = {
    show: show,
    showLock: showLock,
    clear: clear,
    current: current,
    paint: paint
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", paint);
  } else {
    paint();
  }
})();
