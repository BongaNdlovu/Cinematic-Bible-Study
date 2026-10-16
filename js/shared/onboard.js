(function () {
  "use strict";

  const KEY = "baOnboardV1";
  const ASKED = "baProfileAsked";
  const STEPS = [
    {
      title: "Are you reading Daniel for the first time?",
      choices: [
        { v: "First time", t: "Yes, this is my first time" },
        { v: "Read it before", t: "I have read it before" },
        { v: "I teach it", t: "I teach it" }
      ]
    },
    {
      title: "Which book of the Bible do you love most?",
      choices: [
        { v: "Daniel", t: "Daniel" },
        { v: "Revelation", t: "Revelation" },
        { v: "The Gospels", t: "The Gospels" },
        { v: "The Psalms", t: "The Psalms" },
        { v: "Another book", t: "Another book" }
      ]
    },
    {
      title: "How will you use this study?",
      choices: [
        { v: "On my own", t: "On my own" },
        { v: "Sabbath School or small group", t: "With a Sabbath School or small group" },
        { v: "Teaching a class", t: "In a class I teach" },
        { v: "Preaching or leading", t: "Preparing to preach or lead" }
      ]
    }
  ];

  let pending = null;
  let resolveGate = null;
  let root = null;
  let step = 0;
  let cursor = 0;
  let saving = false;
  const answers = ["", "", ""];

  function done() {
    try { return localStorage.getItem(KEY) === "1"; } catch (e) { return false; }
  }

  function mark() {
    try {
      localStorage.setItem(KEY, "1");
      localStorage.setItem(ASKED, "1");
    } catch (e) {}
  }

  function isFront() {
    const here = (location.pathname.split("/").pop() || "index.html").toLowerCase();
    return here === "" || here === "index.html" || here === "study.html" || here === "study";
  }

  function authReady() {
    const auth = window.ScrollAuth;
    if (auth && typeof auth.ready === "function") return auth.ready();
    return Promise.resolve();
  }

  function knownMember() {
    const auth = window.ScrollAuth;
    const client = auth && auth.getClient && auth.getClient();
    const user = auth && auth.getUser && auth.getUser();
    if (!client || !user) return Promise.resolve(false);
    return client.from("exhibit_profiles").select("study_mode").eq("user_id", user.id).maybeSingle().then(function (res) {
      return !!(res && res.data && res.data.study_mode);
    }).catch(function () { return false; });
  }

  function field(name, text) {
    const el = document.createElement(name);
    if (text != null) el.textContent = text;
    return el;
  }

  function focusCursor() {
    const on = root && root.querySelector(".is-on");
    if (on) on.focus();
  }

  function paintQuestion() {
    const q = STEPS[step];
    root.replaceChildren();
    const frame = field("div");
    frame.className = "onboard-frame";
    const kicker = field("p", "Before the shelf");
    kicker.className = "onboard-kicker";
    const progress = field("p", (step + 1) + " of 3");
    progress.className = "onboard-progress";
    const title = field("h2", q.title);
    title.id = "onboard-title";
    const list = field("div");
    list.className = "onboard-choices";
    list.setAttribute("role", "listbox");
    list.setAttribute("aria-label", q.title);
    q.choices.forEach(function (choice, i) {
      const btn = field("button");
      btn.type = "button";
      btn.className = "onboard-choice" + (i === cursor ? " is-on" : "");
      btn.setAttribute("data-choice", choice.v);
      btn.setAttribute("role", "option");
      btn.setAttribute("aria-selected", i === cursor ? "true" : "false");
      const markEl = field("span", String.fromCharCode(65 + i));
      markEl.className = "onboard-letter";
      btn.appendChild(markEl);
      btn.appendChild(field("span", choice.t));
      list.appendChild(btn);
    });
    frame.append(kicker, progress, title, list);
    if (step > 0) {
      const back = field("button", "Back");
      back.type = "button";
      back.className = "onboard-back";
      back.setAttribute("data-back", "");
      frame.appendChild(back);
    }
    root.appendChild(frame);
    focusCursor();
  }

  function paintNote(title, detail, retry) {
    root.replaceChildren();
    const frame = field("div");
    frame.className = "onboard-frame onboard-close";
    const kicker = field("p", "The shelf");
    kicker.className = "onboard-kicker";
    const heading = field("h2", title);
    heading.id = "onboard-title";
    const copy = field("p", detail);
    copy.className = "onboard-detail";
    frame.append(kicker, heading, copy);
    if (retry) {
      const btn = field("button", "Try again");
      btn.type = "button";
      btn.className = "onboard-retry";
      btn.setAttribute("data-retry", "");
      frame.appendChild(btn);
      root.appendChild(frame);
      btn.focus();
      return;
    }
    root.appendChild(frame);
  }

  function unbind() {
    document.removeEventListener("keydown", onKey, true);
  }

  function finish() {
    document.body.classList.remove("onboard-open");
    unbind();
    if (root && root.parentNode) root.parentNode.removeChild(root);
    root = null;
    if (window.Cinema && typeof window.Cinema.sweep === "function") window.Cinema.sweep();
    if (resolveGate) resolveGate();
    resolveGate = null;
  }

  function close() {
    if (!root) {
      finish();
      return;
    }
    root.classList.add("is-leaving");
    const reduced = window.Cinema && window.Cinema.reduced;
    if (reduced) finish();
    else setTimeout(finish, 720);
  }

  function save() {
    const insights = window.Insights;
    const daniel = answers[0];
    const book = answers[1];
    const use = answers[2];
    const survey = insights && insights.insertSurvey
      ? insights.insertSurvey({ responses: { kind: "onboarding", daniel: daniel, book: book, use: use } })
      : Promise.resolve({ ok: false, reason: "no_client" });
    const profile = insights && insights.upsertProfile
      ? insights.upsertProfile({ study_mode: use, background: book, found_via: daniel })
      : Promise.resolve({ ok: false, reason: "no_client" });
    return Promise.all([survey, profile]).then(function (results) {
      const surveyRes = results[0] || {};
      const profileRes = results[1] || {};
      const surveyOk = surveyRes.ok || surveyRes.reason === "no_client";
      const profileOk = profileRes.ok || profileRes.reason === "no_client";
      if (!surveyOk || !profileOk) return false;
      if (surveyRes.ok && insights.track) insights.track("onboarding", null, { daniel: daniel, book: book, use: use });
      return true;
    });
  }

  function onStudy() {
    const here = (location.pathname.split("/").pop() || "").toLowerCase();
    return here === "study" || here === "study.html";
  }

  function afterSave(ok) {
    saving = false;
    if (!ok) {
      paintNote("Could not save.", "Your answers are still here. Try again.", true);
      return;
    }
    step = 3;
    mark();
    if (onStudy()) paintNote("This sitting is open.", "Read it through. The next volume waits on the shelf.", false);
    else paintNote("The reading room is open.", "Eleven sittings. Begin with the Prologue.", false);
    const reduced = window.Cinema && window.Cinema.reduced;
    setTimeout(close, reduced ? 0 : 1100);
  }

  function choose(value) {
    if (saving || !STEPS[step]) return;
    answers[step] = value;
    if (step < 2) {
      step += 1;
      cursor = 0;
      paintQuestion();
      return;
    }
    saving = true;
    paintNote("Saving your answers.", "Then the shelf opens.", false);
    save().then(afterSave);
  }

  function onClick(e) {
    const choice = e.target.closest("[data-choice]");
    if (choice) {
      choose(choice.getAttribute("data-choice"));
      return;
    }
    if (e.target.closest("[data-back]") && step > 0 && !saving) {
      step -= 1;
      cursor = 0;
      paintQuestion();
      return;
    }
    if (e.target.closest("[data-retry]") && !saving) {
      saving = true;
      paintNote("Saving your answers.", "Then the shelf opens.", false);
      save().then(afterSave);
    }
  }

  function onKey(e) {
    if (!root) return;
    e.stopPropagation();
    if (saving) return;
    const q = STEPS[step];
    if (!q) return;
    const n = q.choices.length;
    if (e.key === "ArrowDown" || e.key === "ArrowRight") {
      e.preventDefault();
      cursor = (cursor + 1) % n;
      paintQuestion();
    } else if (e.key === "ArrowUp" || e.key === "ArrowLeft") {
      e.preventDefault();
      cursor = (cursor + n - 1) % n;
      paintQuestion();
    } else if (e.key === "Enter") {
      e.preventDefault();
      choose(q.choices[cursor].v);
    } else if (e.key === "Backspace" && step > 0) {
      e.preventDefault();
      step -= 1;
      cursor = 0;
      paintQuestion();
    } else if (e.key >= "1" && e.key <= String(n)) {
      e.preventDefault();
      choose(q.choices[Number(e.key) - 1].v);
    }
  }

  function mount() {
    if (root || done()) return;
    document.body.classList.add("onboard-open");
    root = document.createElement("div");
    root.id = "onboard";
    root.className = "onboard";
    root.setAttribute("role", "dialog");
    root.setAttribute("aria-modal", "true");
    root.setAttribute("aria-labelledby", "onboard-title");
    document.body.appendChild(root);
    root.addEventListener("click", onClick);
    document.addEventListener("keydown", onKey, true);
    paintQuestion();
  }

  function gate() {
    if (done()) return Promise.resolve();
    if (pending) return pending;
    pending = new Promise(function (resolve) {
      resolveGate = resolve;
      authReady().then(knownMember).then(function (known) {
        if (known || done()) {
          mark();
          resolveGate = null;
          resolve();
          return;
        }
        mount();
      }).catch(function () { mount(); });
    });
    return pending;
  }

  function boot() {
    if (!isFront() || done()) return;
    gate();
  }

  window.Onboard = { gate: gate, done: done };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
