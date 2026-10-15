(function () {
  var SHOW_MS = 7000;
  var FADE_MS = 560;
  var MIN_REVIEWS = 3;
  var VERSES = [
    { ref: "Daniel 2:20", text: "Daniel answered and said, Blessed be the name of God for ever and ever: for wisdom and might are his:" },
    { ref: "Daniel 2:22", text: "He revealeth the deep and secret things: he knoweth what is in the darkness, and the light dwelleth with him." },
    { ref: "Daniel 4:3", text: "How great are his signs! and how mighty are his wonders! his kingdom is an everlasting kingdom, and his dominion is from generation to generation." },
    { ref: "Daniel 6:27", text: "He delivereth and rescueth, and he worketh signs and wonders in heaven and in earth, who hath delivered Daniel from the power of the lions." },
    { ref: "Daniel 12:3", text: "And they that be wise shall shine as the brightness of the firmament; and they that turn many to righteousness as the stars for ever and ever." }
  ];

  function auth() { return window.ScrollAuth || null; }
  function user() { var a = auth(); return a && a.getUser ? a.getUser() : null; }

  function syncAdminTabs() {
    var a = auth();
    var mod = !!(a && typeof a.isModerator === "function" && a.isModerator());
    ["admin-reviews-link", "admin-insights-link"].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.hidden = !mod;
    });
  }

  function syncSignIn() {
    syncAdminTabs();
    var btn = document.getElementById("shelf-signin");
    if (!btn) return;
    if (user()) {
      var name = auth().displayName ? auth().displayName() : "";
      btn.textContent = name && name.indexOf("@") < 0 ? name : "My account";
      btn.href = "account.html";
      btn.classList.add("is-signed-in");
    } else {
      btn.textContent = "Sign in";
      btn.href = "account.html?next=index.html";
      btn.classList.remove("is-signed-in");
    }
  }

  function wireSignIn() {
    var btn = document.getElementById("shelf-signin");
    if (!btn) return;
    btn.addEventListener("click", function (e) {
      if (user()) return;
      if (window.Insights && typeof window.Insights.track === "function") {
        window.Insights.track("home_nav", null, { action: "signin" });
      }
      if (window.ScrollTerms && typeof window.ScrollTerms.requestSignIn === "function") {
        e.preventDefault();
        window.ScrollTerms.requestSignIn();
      }
    });
    syncSignIn();
    var a = auth();
    if (a && typeof a.ready === "function") a.ready().then(syncSignIn, function () {});
    if (a && typeof a.onChange === "function") a.onChange(syncSignIn);
  }

  var card, kicker, text, cite, more, pauseBtn;
  var items = VERSES.map(function (v) { return { kind: "verse", ref: v.ref, text: v.text }; });
  var idx = 0;
  var timer = 0;
  var hovering = false;
  var userPaused = false;
  var reduced = !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);

  function starsOf(r) {
    return "★".repeat(r) + "☆".repeat(5 - r);
  }

  function render(item) {
    text.textContent = "“" + item.text + "”";
    if (item.kind === "review") {
      kicker.textContent = "From a reader";
      cite.textContent = item.name + " · " + starsOf(item.rating);
      cite.setAttribute("aria-label", item.name + ", " + item.rating + " out of 5 stars");
      more.hidden = false;
    } else {
      kicker.textContent = "From the book";
      cite.textContent = item.ref + " (KJV)";
      cite.removeAttribute("aria-label");
      more.hidden = true;
    }
  }

  function stopped() { return hovering || userPaused || document.hidden || items.length < 2; }

  function schedule() {
    clearTimeout(timer);
    if (stopped()) return;
    timer = setTimeout(advance, SHOW_MS);
  }

  function advance() {
    if (stopped()) return;
    if (reduced) {
      idx = (idx + 1) % items.length;
      render(items[idx]);
      schedule();
      return;
    }
    card.classList.add("is-fading");
    timer = setTimeout(function () {
      idx = (idx + 1) % items.length;
      render(items[idx]);
      card.classList.remove("is-fading");
      schedule();
    }, FADE_MS);
  }

  function useReviews(rows) {
    if (!rows || rows.length < MIN_REVIEWS) return;
    var next = rows.map(function (r) {
      return {
        kind: "review",
        text: String(r.body || "").trim(),
        name: String(r.display_name || "A reader").trim(),
        rating: Math.max(1, Math.min(5, Math.round(Number(r.rating) || 5)))
      };
    }).filter(function (it) { return it.text; });
    if (next.length < MIN_REVIEWS) return;
    items = next;
    idx = items.length - 1;
  }

  function setPaused(on) {
    userPaused = on;
    pauseBtn.setAttribute("aria-pressed", String(on));
    pauseBtn.setAttribute("aria-label", on ? "Play the notes" : "Pause the notes");
    pauseBtn.textContent = on ? "▶" : "❚❚";
    schedule();
  }

  function wireNote() {
    card = document.getElementById("shelf-notes");
    if (!card) return;
    kicker = document.getElementById("shelf-notes-kicker");
    text = document.getElementById("shelf-notes-text");
    cite = document.getElementById("shelf-notes-cite");
    more = document.getElementById("shelf-notes-more");
    pauseBtn = document.getElementById("shelf-notes-pause");

    idx = Math.floor(Math.random() * items.length);
    render(items[idx]);
    card.hidden = false;

    card.addEventListener("mouseenter", function () { hovering = true; clearTimeout(timer); });
    card.addEventListener("mouseleave", function () { hovering = false; schedule(); });
    card.addEventListener("focusin", function () { hovering = true; clearTimeout(timer); });
    card.addEventListener("focusout", function () { hovering = false; schedule(); });
    document.addEventListener("visibilitychange", schedule);
    if (pauseBtn) pauseBtn.addEventListener("click", function () { setPaused(!userPaused); });
    schedule();

    var reviews = window.ScrollReviews;
    var a = auth();
    if (reviews && typeof reviews.fetchApproved === "function") {
      var ready = a && typeof a.ready === "function" ? a.ready() : Promise.resolve();
      ready.then(function () { return reviews.fetchApproved(12); }).then(useReviews, function () {});
    }
  }

  function start() {
    wireSignIn();
    wireNote();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();
