(function () {
  if (typeof SCROLL_SECTIONS === "undefined") {
    console.error("SCROLL_SECTIONS failed to load.");
    return;
  }

  const ICONS = {
    book: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>',
    openbook: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>',
    crown: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 7l4 4 5-8 5 8 4-4v10H3z"/></svg>',
    pillars: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 21h16M5 8h14M7 8v10M12 8v10M17 8v10M4 4h16v4H4z"/></svg>',
    horn: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 16c4-1 7-6 8-12 3 4 7 6 9 6-3 2-5 7-5 12"/><circle cx="7" cy="18" r="2"/></svg>',
    calendar: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M8 3v4M16 3v4M3 11h18"/></svg>',
    flame: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 3c4 5 1 8 1 11a5 5 0 1 1-8-4c2 1 3-1 4-4 1 2 3 2 3-3z"/></svg>',
    sun: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>',
    scroll: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M8 6h11a2 2 0 0 1 2 2v10a3 3 0 0 0-3-3H8"/><path d="M8 6a3 3 0 0 0-3 3v11a2 2 0 1 0 4 0V8a2 2 0 0 1 2-2"/></svg>',
    quill: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M20 4c-6 1-10 7-12 16 4-3 8-4 12-4-2-4-2-8 0-12z"/><path d="M8 20H4"/></svg>'
  };

  const PHASES = ["still", "building", "storm", "breaking", "sunshine"];
  const WEATHER_TO_PHASE = { quiet: "still", building: "building", storm: "storm", sunshine: "sunshine", auto: "sunshine" };

  let currentIndex = 0;
  let weatherPreset = "sunshine";
  let autoTimer = null;
  let autoPhase = 4;
  let fontIdx = 1;
  const fontSizes = ["0.95rem", "1.05rem", "1.2rem", "1.35rem"];
  const fontLabels = ["90%", "100%", "115%", "130%"];

  const listEl = document.getElementById("section-list");
  const kickerEl = document.getElementById("article-kicker");
  const titleEl = document.getElementById("article-title");
  const bodyEl = document.getElementById("article-body");
  const cardsEl = document.getElementById("meta-cards");
  const whyTitleEl = document.getElementById("why-title");
  const whyTextEl = document.getElementById("why-text");
  const whyQuoteEl = document.getElementById("why-quote");
  const quizEl = document.getElementById("quiz-container");
  const quizBadgeEl = document.getElementById("quiz-badge");
  const galleryEl = document.getElementById("cta-gallery");
  const toastEl = document.getElementById("toast");

  function showToast(msg) {
    toastEl.textContent = msg;
    toastEl.hidden = false;
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => { toastEl.hidden = true; }, 2200);
  }

  function renderList() {
    listEl.innerHTML = "";
    SCROLL_SECTIONS.forEach((sec, idx) => {
      const li = document.createElement("li");
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "section-btn" + (idx === currentIndex ? " active" : "");
      const label = sec.number ? `${sec.number}. ${sec.label}` : sec.label;
      btn.innerHTML = `${ICONS[sec.icon] || ICONS.book}<span>${label}</span><span class="dot"></span>`;
      btn.addEventListener("click", () => loadSection(idx));
      li.appendChild(btn);
      listEl.appendChild(li);
    });
  }

  function loadSection(index, opts) {
    if (index < 0 || index >= SCROLL_SECTIONS.length) return;
    currentIndex = index;
    const sec = SCROLL_SECTIONS[index];
    kickerEl.textContent = sec.kicker;
    titleEl.textContent = sec.title;
    bodyEl.innerHTML = sec.body;
    whyTitleEl.textContent = sec.whyTitle;
    whyTextEl.textContent = sec.whyText;
    whyQuoteEl.textContent = sec.quote;
    galleryEl.href = `gallery.html${sec.galleryId ? "?id=" + sec.galleryId : ""}`;
    quizBadgeEl.textContent = `${sec.quizzes.length} Question${sec.quizzes.length === 1 ? "" : "s"}`;

    cardsEl.innerHTML = "";
    if (sec.cards && sec.cards.length) {
      cardsEl.hidden = false;
      sec.cards.forEach((card) => {
        const div = document.createElement("div");
        div.className = "meta-card";
        div.innerHTML = `${ICONS[card.icon] || ICONS.book}<h4>${card.title}</h4><p>${card.text}</p>`;
        cardsEl.appendChild(div);
      });
    } else {
      cardsEl.hidden = true;
    }

    renderQuiz(sec.quizzes);
    document.getElementById("checkpoint").hidden = sec.id === "intro";
    renderList();
    try { localStorage.setItem("scroll_section", sec.id); } catch (e) {}

    if (!opts || !opts.silent) {
      document.getElementById("study-main").scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  function renderQuiz(quizzes) {
    quizEl.innerHTML = "";
    quizzes.forEach((q, qIdx) => {
      const card = document.createElement("div");
      card.className = "quiz-card";
      card.innerHTML = `<h4>Q${qIdx + 1}. ${q.question}</h4>`;
      q.options.forEach((opt, oIdx) => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "quiz-opt";
        btn.textContent = opt;
        btn.addEventListener("click", () => {
          if (card.dataset.locked) return;
          card.dataset.locked = "1";
          const buttons = card.querySelectorAll(".quiz-opt");
          buttons.forEach((b, i) => {
            if (i === q.correct) b.classList.add("correct");
            else if (i === oIdx) b.classList.add("wrong");
          });
          const explain = document.createElement("p");
          explain.className = "quiz-explain";
          explain.textContent = q.explanation;
          card.appendChild(explain);
        });
        card.appendChild(btn);
      });
      quizEl.appendChild(card);
    });
  }

  function resolveStart() {
    const params = new URLSearchParams(location.search);
    const raw = params.get("id") || params.get("section") || location.hash.replace("#", "");
    const mapped = LEGACY_ID_MAP[raw] || raw;
    let idx = SCROLL_SECTIONS.findIndex((s) => s.id === mapped);
    if (idx < 0) {
      try {
        const saved = localStorage.getItem("scroll_section");
        idx = SCROLL_SECTIONS.findIndex((s) => s.id === saved);
      } catch (e) {}
    }
    return idx >= 0 ? idx : 0;
  }

  function setWeather(preset, fromAuto) {
    weatherPreset = preset;
    if (!fromAuto) {
      if (autoTimer) { clearInterval(autoTimer); autoTimer = null; }
      if (preset === "auto") {
        autoPhase = 0;
        applyPhase(PHASES[autoPhase]);
        autoTimer = setInterval(() => {
          autoPhase = (autoPhase + 1) % PHASES.length;
          applyPhase(PHASES[autoPhase]);
        }, 7000);
        showToast("Atmosphere: Auto cycle");
      } else {
        applyPhase(WEATHER_TO_PHASE[preset] || "sunshine");
        showToast("Atmosphere: " + preset);
      }
    }
    document.querySelectorAll(".atmo-btn").forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.weather === preset);
    });
  }

  function applyPhase(phase) {
    const weather = phase === "still" ? "quiet" : phase === "breaking" ? "building" : phase;
    document.body.dataset.weather = weather === "building" ? "building" : weather;
    document.querySelectorAll(".w-node").forEach((node) => {
      node.classList.toggle("on", node.dataset.phase === phase);
    });
  }

  /* weather canvas */
  const canvas = document.getElementById("weather-canvas");
  const ctx = canvas.getContext("2d");
  let particles = [];
  let lightning = 0;
  let lastBolt = 0;

  function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    particles = Array.from({ length: 140 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      speed: 380 + Math.random() * 640,
      len: 8 + Math.random() * 18,
      drift: -24 + Math.random() * 48
    }));
  }

  function drawWeather() {
    const w = canvas.width, h = canvas.height;
    ctx.clearRect(0, 0, w, h);
    const mode = document.body.dataset.weather;
    const storm = mode === "storm" ? 1 : mode === "building" ? 0.45 : 0;
    const sun = mode === "sunshine" ? 1 : mode === "quiet" ? 0.2 : 0;

    if (storm > 0.05) {
      ctx.strokeStyle = `rgba(190,210,230,${0.12 + storm * 0.28})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (const p of particles) {
        p.y += p.speed * 0.016;
        p.x += p.drift * 0.016;
        if (p.y > h + 20) { p.y = -20; p.x = Math.random() * w; }
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x + p.drift * 0.03, p.y + p.len);
      }
      ctx.stroke();
    }

    const now = performance.now() / 1000;
    if (storm > 0.6 && Math.random() < 0.012 && now - lastBolt > 2.4) {
      lightning = 1;
      lastBolt = now;
    }
    if (lightning > 0.02) {
      const lx = w * (0.22 + Math.random() * 0.4);
      const g = ctx.createRadialGradient(lx, h * 0.12, 0, lx, h * 0.12, w * 0.45);
      g.addColorStop(0, `rgba(220,230,255,${0.22 * lightning})`);
      g.addColorStop(1, "rgba(220,230,255,0)");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h * 0.7);
      lightning *= 0.84;
    }

    if (sun > 0.05) {
      ctx.save();
      ctx.globalCompositeOperation = "screen";
      const sx = w * 0.82, sy = h * 0.22;
      const sg = ctx.createRadialGradient(sx, sy, 0, sx, sy, Math.max(w, h) * 0.42);
      sg.addColorStop(0, `rgba(255,220,140,${0.16 * sun})`);
      sg.addColorStop(1, "rgba(255,200,120,0)");
      ctx.fillStyle = sg;
      ctx.fillRect(0, 0, w, h);
      ctx.restore();
    }

    requestAnimationFrame(drawWeather);
  }

  window.addEventListener("resize", resizeCanvas);
  resizeCanvas();
  requestAnimationFrame(drawWeather);

  document.querySelectorAll(".atmo-btn").forEach((btn) => {
    btn.addEventListener("click", () => setWeather(btn.dataset.weather));
  });

  document.getElementById("btn-continue").addEventListener("click", () => {
    document.getElementById("study-main").scrollIntoView({ behavior: "smooth", block: "start" });
    if (currentIndex === 0) loadSection(1);
  });
  document.getElementById("btn-why").addEventListener("click", () => {
    loadSection(currentIndex === 7 ? 7 : 0);
    document.getElementById("why-block").scrollIntoView({ behavior: "smooth", block: "center" });
  });
  document.getElementById("btn-prev-sheet").addEventListener("click", () => loadSection(currentIndex - 1));
  document.getElementById("btn-next-sheet").addEventListener("click", () => loadSection(Math.min(SCROLL_SECTIONS.length - 1, currentIndex + 1)));
  document.getElementById("nav-today").addEventListener("click", (e) => {
    e.preventDefault();
    loadSection(SCROLL_SECTIONS.findIndex((s) => s.id === "today"));
  });

  const searchPop = document.getElementById("search-popover");
  const settingsPop = document.getElementById("settings-popover");
  document.getElementById("btn-search").addEventListener("click", () => {
    searchPop.hidden = !searchPop.hidden;
    settingsPop.hidden = true;
    if (!searchPop.hidden) document.getElementById("section-search").focus();
  });
  document.getElementById("btn-settings").addEventListener("click", () => {
    settingsPop.hidden = !settingsPop.hidden;
    searchPop.hidden = true;
  });
  document.getElementById("btn-codex").addEventListener("click", () => {
    document.querySelector(".sections-panel").scrollIntoView({ behavior: "smooth" });
  });
  document.getElementById("section-search").addEventListener("input", (e) => {
    const q = e.target.value.toLowerCase().trim();
    const results = document.getElementById("search-results");
    results.innerHTML = "";
    SCROLL_SECTIONS.filter((s) =>
      (s.label + s.title + s.body + s.whyText).toLowerCase().includes(q)
    ).forEach((s) => {
      const li = document.createElement("li");
      const btn = document.createElement("button");
      btn.type = "button";
      btn.textContent = s.number ? `${s.number}. ${s.label}` : s.label;
      btn.addEventListener("click", () => {
        loadSection(SCROLL_SECTIONS.indexOf(s));
        searchPop.hidden = true;
      });
      li.appendChild(btn);
      results.appendChild(li);
    });
  });

  document.getElementById("font-down").addEventListener("click", () => {
    fontIdx = Math.max(0, fontIdx - 1);
    document.documentElement.style.setProperty("--reading", fontSizes[fontIdx]);
    document.getElementById("font-label").textContent = fontLabels[fontIdx];
  });
  document.getElementById("font-up").addEventListener("click", () => {
    fontIdx = Math.min(fontSizes.length - 1, fontIdx + 1);
    document.documentElement.style.setProperty("--reading", fontSizes[fontIdx]);
    document.getElementById("font-label").textContent = fontLabels[fontIdx];
  });

  const overlay = document.getElementById("timeline-overlay");
  const rail = document.getElementById("epoch-rail");
  function openTimeline(e) {
    if (e) e.preventDefault();
    overlay.hidden = false;
  }
  function closeTimeline() { overlay.hidden = true; }
  function renderEpochs(active) {
    rail.innerHTML = "";
    TIMELINE_EPOCHS.forEach((ep, i) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.textContent = ep.year;
      btn.className = i === active ? "active" : "";
      btn.addEventListener("click", () => selectEpoch(i));
      rail.appendChild(btn);
    });
  }
  function selectEpoch(i) {
    const ep = TIMELINE_EPOCHS[i];
    document.getElementById("epoch-year").textContent = ep.year;
    document.getElementById("epoch-title").textContent = ep.title;
    document.getElementById("epoch-desc").textContent = ep.desc;
    renderEpochs(i);
  }
  document.getElementById("nav-timeline").addEventListener("click", openTimeline);
  document.getElementById("close-timeline").addEventListener("click", closeTimeline);
  overlay.addEventListener("click", (e) => { if (e.target === overlay) closeTimeline(); });
  selectEpoch(0);

  document.getElementById("weather-info").addEventListener("click", () => {
    showToast("Attention weather tracks your study atmosphere.");
  });

  applyPhase("sunshine");
  loadSection(resolveStart(), { silent: true });
})();
