(function () {
  const HERO_EMPIRES = [
    { caption: "Faith in a foreign land", name: "Daniel 1" },
    { caption: "The dream of the image", name: "Daniel 2" },
    { caption: "The fiery furnace", name: "Daniel 3" },
    { caption: "The tree cut down", name: "Daniel 4" },
    { caption: "The writing on the wall", name: "Daniel 5" },
    { caption: "Delivered from the lions", name: "Daniel 6" },
    { caption: "Visions of the future", name: "Daniel 7–12" }
  ];
  const REEL_MS = 5200;

  function revealDashboard() {
    document.body.classList.add("dash-loaded");
  }

  requestAnimationFrame(function () {
    requestAnimationFrame(revealDashboard);
  });

  function setHeroEra(index) {
    const slides = document.querySelectorAll(".dash-hero-reel img");
    const eras = document.querySelectorAll(".dash-empire-ticker [data-era]");
    const caption = document.getElementById("hero-reel-caption");
    slides.forEach(function (slide, i) {
      slide.classList.toggle("is-active", i === index);
    });
    eras.forEach(function (era) {
      era.classList.toggle("is-active", Number(era.getAttribute("data-era")) === index);
    });
    if (caption && HERO_EMPIRES[index]) {
      caption.textContent = HERO_EMPIRES[index].caption + " — " + HERO_EMPIRES[index].name;
    }
  }

  function initHeroReel() {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      setHeroEra(0);
      return;
    }
    let index = 0;
    setHeroEra(index);
    document.querySelectorAll(".dash-empire-ticker [data-era]").forEach(function (el) {
      el.addEventListener("click", function () {
        index = Number(el.getAttribute("data-era")) || 0;
        setHeroEra(index);
      });
    });
    window.setInterval(function () {
      index = (index + 1) % HERO_EMPIRES.length;
      setHeroEra(index);
    }, REEL_MS);
  }

  initHeroReel();

  const J = window.BAJourney;
  if (!J) return;

  function syncLocks() {
    document.querySelectorAll("[data-sheet]").forEach(function (el) {
      const sheet = Number(el.getAttribute("data-sheet"));
      const open = typeof J.canAccessSheet === "function" ? J.canAccessSheet(sheet) : sheet === 0;
      el.classList.toggle("is-locked", !open);
      el.setAttribute("aria-disabled", open ? "false" : "true");
      if (!open && typeof J.lockExplain === "function") {
        const note = J.lockExplain("sheet", sheet);
        el.title = note.title + " — " + note.body;
      } else {
        el.removeAttribute("title");
      }
    });
    const resumeHref = J.resumeHref();
    const resumeSheet = J.resumeSheet();
    const heroCta = document.getElementById("hero-cta") || document.getElementById("hero-primary");
    if (heroCta) heroCta.href = resumeHref;
    const ctaLabel = document.getElementById("hero-cta-label");
    if (ctaLabel) ctaLabel.textContent = J.resumeLabel();
    const ctaSub = document.getElementById("hero-cta-sub");
    if (ctaSub) {
      ctaSub.textContent = "25-minute guided sitting · Sitting " + (resumeSheet + 1) + " of 11";
    }
    const signedIn = !!(window.ScrollAuth && window.ScrollAuth.getUser && window.ScrollAuth.getUser());
    document.querySelectorAll(".dash-account").forEach(function (wrap) {
      wrap.classList.toggle("is-signed-in", signedIn);
    });
  }

  document.querySelectorAll("[data-dash-signin]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      if (window.ScrollTerms && typeof window.ScrollTerms.requestSignIn === "function") {
        window.ScrollTerms.requestSignIn();
      }
    });
  });

  document.addEventListener("click", function (e) {
    const el = e.target.closest("a[data-sheet]");
    if (!el || !el.classList.contains("is-locked")) return;
    e.preventDefault();
    if (typeof J.announceLock === "function") {
      J.announceLock("sheet", el.getAttribute("data-sheet"));
    }
  });

  syncLocks();
  if (window.ScrollAuth && typeof window.ScrollAuth.ready === "function") {
    window.ScrollAuth.ready().then(syncLocks);
  }
  if (window.ScrollAuth && typeof window.ScrollAuth.onChange === "function") {
    window.ScrollAuth.onChange(syncLocks);
  }
})();
