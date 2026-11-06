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

  function swap(update, target) {
    if (target) {
      update();
      if (!reduced) {
        target.classList.remove("cx-swap-enter");
        void target.offsetWidth;
        target.classList.add("cx-swap-enter");
      }
      return Promise.resolve();
    }
    if (reduced || typeof document.startViewTransition !== "function") {
      update();
      return Promise.resolve();
    }
    let t;
    try {
      t = document.startViewTransition({ update: update, types: ["cx-swap"] });
    } catch (err) {
      t = document.startViewTransition(update);
    }
    return t.finished.catch(function () {});
  }

  const FOOTER_LINKS = [
    ["index.html", "The Shelf"],
    ["study.html", "Study"],
    ["map.html", "Map of History"],
    ["gallery.html", "3D Symbols"],
    ["reviews.html", "Readers' notes"],
    ["account.html", "Account"],
    ["privacy.html", "Privacy"],
    ["terms.html", "Terms"]
  ];

  const NAV_LINKS = [
    { href: "index.html", label: "Home" },
    { href: "map.html", label: "Map of History" },
    { href: "gallery.html", label: "3D Symbols" },
    { href: "reviews.html#witness-queue", label: "Admin", page: "reviews", adminId: "admin-reviews-link" },
    { href: "insights.html", label: "Insights", page: "insights", adminId: "admin-insights-link" },
    { href: "account.html", label: "Account", page: "account" }
  ];

  const CREST =
    '<svg class="crest" viewBox="0 0 32 32" fill="none" aria-hidden="true">' +
      '<path d="M16 2.5L5 7.5v9.5c0 7.8 4.7 15.1 11 16.5 6.3-1.4 11-8.7 11-16.5V7.5L16 2.5z" stroke="currentColor" stroke-width="1.6"/>' +
      '<path d="M11 15.5l3.5 3.5 6.5-6.5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>' +
    "</svg>";

  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; });
  }

  function navLink(link, active) {
    const isActive = !!link.page && link.page === active;
    if (link.adminId && !isActive) return "";
    if (isActive) return '<a class="active" href="' + link.href + '" aria-current="page">' + esc(link.label) + "</a>";
    return '<a href="' + link.href + '">' + esc(link.label) + "</a>";
  }

  function nav(host) {
    if (host.dataset.siteNavReady) return;
    host.dataset.siteNavReady = "1";
    const active = host.dataset.active || "";
    const links = NAV_LINKS.map(function (l) { return navLink(l, active); }).join("");
    const slot = host.hasAttribute("data-auth-slot-nav") ? '<span class="auth-slot" data-auth-slot data-auth-variant="nav"></span>' : "";
    host.innerHTML =
      '<a class="site-brand" href="index.html">' + (host.hasAttribute("data-crest") ? CREST : "") + "THE SHELF OF DANIEL</a>" +
      '<div class="site-links">' + links + slot + "</div>";
  }

  function navs() {
    document.querySelectorAll("nav[data-site-nav]").forEach(nav);
  }

  if (document.readyState === "loading" && "MutationObserver" in window) {
    const watch = new MutationObserver(navs);
    watch.observe(document.documentElement, { childList: true, subtree: true });
    document.addEventListener("DOMContentLoaded", function () { watch.disconnect(); }, { once: true });
  }

  function footer() {
    const host = document.querySelector("footer.site-footer");
    if (!host || host.classList.contains("cx-footer")) return;
    const verse = host.dataset.verse || "Surely the Lord God will do nothing, but he revealeth his secret unto his servants the prophets.";
    const cite = host.dataset.cite || "Amos 3:7 · King James Version";
    const rights = host.dataset.rights || "";
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
        (rights ? '<p class="cx-footer-rights">' + esc(rights) + "</p>" : "") +
      "</div>";
  }

  window.Cinema = { reveal: reveal, swap: swap, sweep: sweep, reduced: reduced };

  function boot() { navs(); footer(); reveal(document); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
