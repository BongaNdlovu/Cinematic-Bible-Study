(function () {
  const HERO_EMPIRES = [
    { caption: "The dream of the image", name: "Daniel 2" },
    { caption: "Head of gold", name: "Babylon" },
    { caption: "Chest of silver", name: "Medo-Persia" },
    { caption: "Belly of brass", name: "Greece" },
    { caption: "Legs of iron", name: "Rome" },
    { caption: "Iron mixed with clay", name: "Divided kingdoms" },
    { caption: "The stone cut without hands", name: "Now" }
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
      if (el.tagName === "A") {
        if (!open) {
          if (el.hasAttribute("href")) {
            el.dataset.savedHref = el.getAttribute("href");
            el.removeAttribute("href");
          }
          el.setAttribute("tabindex", "-1");
        } else {
          if (!el.hasAttribute("href") && el.dataset.savedHref) {
            el.setAttribute("href", el.dataset.savedHref);
          }
          el.removeAttribute("tabindex");
        }
      }
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
      ctaSub.textContent = "25-minute guided sitting · Sitting " + resumeSheet + " of 11";
    }
    const signedIn = !!(window.ScrollAuth && window.ScrollAuth.getUser && window.ScrollAuth.getUser());
    document.querySelectorAll(".dash-account").forEach(function (wrap) {
      wrap.classList.toggle("is-signed-in", signedIn);
    });
  }

  document.querySelectorAll("[data-dash-signin]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      if (window.Insights) window.Insights.track('home_nav', null, { action: 'signin' });
      if (window.ScrollTerms && typeof window.ScrollTerms.requestSignIn === "function") {
        window.ScrollTerms.requestSignIn();
      }
    });
  });

  document.addEventListener("click", function (e) {
    const card = e.target.closest("[data-sheet], #hero-cta, [data-hero-primary]");
    if (!card || !window.Insights) return;
    const sheet = card.hasAttribute("data-sheet") ? Number(card.getAttribute("data-sheet")) : null;
    window.Insights.track('home_nav', Number.isInteger(sheet) ? sheet : null, {
      action: card.id === "hero-cta" || card.hasAttribute("data-hero-primary") ? "cta" : "card"
    });
  });

  syncLocks();
  if (window.ScrollAuth && typeof window.ScrollAuth.ready === "function") {
    window.ScrollAuth.ready().then(syncLocks);
  }
  if (window.ScrollAuth && typeof window.ScrollAuth.onChange === "function") {
    window.ScrollAuth.onChange(syncLocks);
  }
})();
