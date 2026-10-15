(function () {
  "use strict";

  const root = document.documentElement;
  const reduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const nativePages = "PageRevealEvent" in window;
  if (!nativePages) root.classList.add("cx-fallback");

  function sweep() {
    if (reduced) return;
    let line = document.querySelector(".cx-sweep");
    if (!line) {
      line = document.createElement("div");
      line.className = "cx-sweep";
      line.setAttribute("aria-hidden", "true");
      document.body.appendChild(line);
    }
    root.classList.remove("cx-arrive");
    void line.offsetWidth;
    root.classList.add("cx-arrive");
    setTimeout(function () { root.classList.remove("cx-arrive"); }, 900);
  }

  if (nativePages) {
    window.addEventListener("pagereveal", function (e) {
      if (e.viewTransition) e.viewTransition.ready.then(sweep, function () {});
    });
  }

  function leavable(a, e) {
    if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return false;
    if (a.target && a.target !== "_self") return false;
    if (a.hasAttribute("download") || a.dataset.cxInstant !== undefined) return false;
    const href = a.getAttribute("href");
    if (!href || href.charAt(0) === "#" || /^(mailto|tel|javascript):/i.test(href)) return false;
    let url;
    try { url = new URL(a.href, location.href); } catch (err) { return false; }
    if (url.origin !== location.origin) return false;
    if (url.pathname === location.pathname && url.search === location.search) return false;
    return url;
  }

  if (!nativePages && !reduced) {
    document.addEventListener("click", function (e) {
      const a = e.target && e.target.closest ? e.target.closest("a[href]") : null;
      const url = leavable(a, e);
      if (!url) return;
      e.preventDefault();
      root.classList.add("cx-leaving");
      setTimeout(function () { location.href = url.href; }, 280);
    });
    window.addEventListener("pageshow", function (e) {
      root.classList.remove("cx-leaving");
      if (!e.persisted) sweep();
    });
  }

  let observer = null;
  function reveal(scope) {
    const items = (scope || document).querySelectorAll("[data-cx-reveal]:not(.cx-in)");
    if (!items.length) return;
    if (reduced || !("IntersectionObserver" in window)) {
      items.forEach(function (el) { el.classList.add("cx-in"); });
      return;
    }
    if (!observer) {
      observer = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("cx-in");
          observer.unobserve(entry.target);
        });
      }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });
    }
    items.forEach(function (el) { observer.observe(el); });
  }

  let swapping = false;
  function swap(update, target) {
    if (reduced || swapping || typeof document.startViewTransition !== "function") {
      update();
      return Promise.resolve();
    }
    const types = target ? ["cx-swap", "cx-swap-scoped"] : ["cx-swap"];
    if (target) target.style.viewTransitionName = "cx-swap";
    swapping = true;
    let t;
    try {
      t = document.startViewTransition({ update: update, types: types });
    } catch (err) {
      try {
        t = document.startViewTransition(update);
      } catch (err2) {
        swapping = false;
        if (target) target.style.viewTransitionName = "";
        update();
        return Promise.resolve();
      }
    }
    return t.finished.catch(function () {}).then(function () {
      swapping = false;
      if (target) target.style.viewTransitionName = "";
    });
  }

  const FOOTER_LINKS = [
    ["index.html", "The Shelf"],
    ["study.html", "Study"],
    ["map.html", "Map of History"],
    ["gallery.html", "3D Symbols"],
    ["reviews.html", "Readers' notes"],
    ["account.html", "Account"]
  ];

  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; });
  }

  function footer() {
    const host = document.querySelector("footer.site-footer");
    if (!host || host.classList.contains("cx-footer")) return;
    const verse = host.dataset.verse || "Surely the Lord God will do nothing, but he revealeth his secret unto his servants the prophets.";
    const cite = host.dataset.cite || "Amos 3:7 · King James Version";
    const here = location.pathname.split("/").pop() || "index.html";
    const links = FOOTER_LINKS.map(function (l) {
      const current = here === l[0] || here + ".html" === l[0] || (here === "" && l[0] === "index.html");
      return '<li><a href="' + l[0] + '"' + (current ? ' aria-current="page"' : "") + ">" + esc(l[1]) + "</a></li>";
    }).join("");
    host.className = "site-footer cx-footer";
    host.setAttribute("data-cx-reveal", "");
    host.innerHTML =
      '<div class="cx-footer-inner">' +
        '<svg class="cx-footer-mark" viewBox="0 0 168 22" aria-hidden="true">' +
          '<path d="M74 11 C58 11 44 4 26 7 C16 9 9 11 2 11"/>' +
          '<path d="M94 11 C110 11 124 4 142 7 C152 9 159 11 166 11"/>' +
          '<line x1="30" y1="14" x2="70" y2="14"/><line x1="98" y1="14" x2="138" y2="14"/>' +
          '<path class="cx-gem" d="M84 4 L88 11 L84 18 L80 11 Z"/>' +
        "</svg>" +
        '<blockquote class="cx-footer-verse">“' + esc(verse) + "”" +
          '<cite class="cx-footer-cite">' + esc(cite) + "</cite></blockquote>" +
        '<ul class="cx-footer-links" aria-label="Site">' + links + "</ul>" +
        '<p class="cx-footer-base"><span>The Shelf of Daniel</span><span>A historicist study of the book of Daniel</span><span>Scripture: King James Version</span></p>' +
      "</div>";
  }

  window.Cinema = { reveal: reveal, swap: swap, sweep: sweep, reduced: reduced };

  function boot() { footer(); reveal(document); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
