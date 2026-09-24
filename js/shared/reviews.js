(function () {
  const TABLE = "exhibit_reviews";
  const MIN = 40;
  const MAX = 600;
  const REVIEW_DAY = "baReviewDay";
  const REVIEW_MAX = 3;

  function reviewDayCount() {
    const day = new Date().toISOString().slice(0, 10);
    try {
      const s = JSON.parse(localStorage.getItem(REVIEW_DAY) || "{}");
      return s.d === day ? (s.n || 0) : 0;
    } catch (e) {
      return 0;
    }
  }

  function bumpReviewDay() {
    const day = new Date().toISOString().slice(0, 10);
    try {
      localStorage.setItem(REVIEW_DAY, JSON.stringify({ d: day, n: reviewDayCount() + 1 }));
    } catch (e) {}
  }

  function authClient() {
    return window.ScrollAuth && window.ScrollAuth.getClient && window.ScrollAuth.getClient();
  }

  function currentUser() {
    return window.ScrollAuth && window.ScrollAuth.getUser && window.ScrollAuth.getUser();
  }

  function signedIn() {
    return !!currentUser();
  }

  function isModerator() {
    return !!(window.ScrollAuth && window.ScrollAuth.isModerator && window.ScrollAuth.isModerator());
  }

  function reviewerName() {
    if (window.ScrollAuth && typeof window.ScrollAuth.displayName === "function") {
      const name = window.ScrollAuth.displayName();
      if (name && name.indexOf("@") < 0) return name.slice(0, 80);
    }
    const u = currentUser();
    if (u && u.email) return String(u.email).split("@")[0].slice(0, 80);
    return "Student";
  }

  function clampRating(n) {
    const r = Number(n);
    if (!Number.isFinite(r)) return 0;
    return Math.max(1, Math.min(5, Math.round(r)));
  }

  function starsLabel(n) {
    const r = clampRating(n) || 5;
    return "\u2605".repeat(r) + "\u2606".repeat(5 - r);
  }

  function canEditReview(row) {
    if (!row || !signedIn()) return false;
    if (isModerator()) return true;
    const u = currentUser();
    return !!(u && row.user_id && row.user_id === u.id);
  }

  function setStatus(message, kind, elId) {
    const el = document.getElementById(elId || "witness-status");
    if (!el) return;
    el.hidden = !message;
    el.textContent = message || "";
    el.dataset.kind = kind || "";
  }

  function formatDate(iso) {
    try {
      return new Date(iso).toLocaleDateString(undefined, {
        year: "numeric",
        month: "long",
        day: "numeric"
      });
    } catch (err) {
      return "";
    }
  }

  function mountStarPicker(container, hiddenInput, initial) {
    if (!container || !hiddenInput) return;
    let value = clampRating(initial) || 5;
    hiddenInput.value = String(value);
    container.innerHTML = "";
    container.setAttribute("role", "radiogroup");
    for (let i = 1; i <= 5; i++) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "witness-star-btn" + (i <= value ? " is-on" : "");
      btn.dataset.value = String(i);
      btn.setAttribute("aria-label", i + " star" + (i > 1 ? "s" : ""));
      btn.setAttribute("aria-pressed", i <= value ? "true" : "false");
      btn.textContent = "\u2605";
      btn.addEventListener("click", function () {
        value = i;
        hiddenInput.value = String(value);
        container.querySelectorAll(".witness-star-btn").forEach(function (b, idx) {
          const on = idx < value;
          b.classList.toggle("is-on", on);
          b.setAttribute("aria-pressed", on ? "true" : "false");
        });
      });
      container.appendChild(btn);
    }
  }

  function mountStarPickers() {
    mountStarPicker(
      document.getElementById("witness-stars"),
      document.getElementById("witness-rating"),
      5
    );
    mountStarPicker(
      document.getElementById("witness-edit-stars"),
      document.getElementById("witness-edit-rating"),
      5
    );
  }

  const SEED_REVIEWS = [
    {
      display_name: "Nokuthula Dlamini",
      rating: 5,
      created_at: "2026-02-14T18:22:00.000Z",
      body: "My husband and I did sitting 1 after church. I kept my Bible open on the desk like the notice says. The map took a minute on my phone, but once it loaded we stayed up talking about Daniel 2 for another hour."
    },
    {
      display_name: "James Whitfield",
      rating: 4,
      created_at: "2026-04-03T11:08:00.000Z",
      body: "Honest take: the first sitting felt dense. By sitting 2 I understood why they make you work through the year-day verses yourself instead of just telling you the answer. Still working through the rest."
    },
    {
      display_name: "Thandiwe Mthembu",
      rating: 5,
      created_at: "2026-05-19T16:41:00.000Z",
      body: "Three of us went through it in my living room on a Saturday. We paused at the gold head and opened the 3D gallery. None of us are prophecy people. We just wanted Daniel to finally make sense."
    },
    {
      display_name: "Sarah Mitchell",
      rating: 4,
      created_at: "2026-07-11T07:35:00.000Z",
      body: "I saw the certificate mentioned online and stayed for the content. Print view is clean. Strong's is a bit awkward on iPad, but having the KJV right in the study desk made the cross-references much easier."
    },
    {
      display_name: "Sibusiso Nkosi",
      rating: 5,
      created_at: "2026-08-27T20:15:00.000Z",
      body: "Ran six weeks with our young adults group. People actually argued about 457 — a good argument, not a fight. One guy said he finally sees why Rome keeps showing up in every vision."
    },
    {
      display_name: "Peter Williams",
      rating: 3,
      created_at: "2026-09-06T13:52:00.000Z",
      body: "Solid study, but not light reading if prophecy is new to you. Took me three weeks to finish. Worth it if you're willing to sit with the text. I'd tell a friend to start with sitting 0 and not rush."
    }
  ];

  function renderQuote(row) {
    const art = document.createElement("article");
    art.className = "witness-card";
    const stars = document.createElement("p");
    stars.className = "witness-card-stars";
    const rating = clampRating(row.rating) || 5;
    stars.setAttribute("aria-label", rating + " out of 5 stars");
    stars.textContent = starsLabel(row.rating);
    const quote = document.createElement("blockquote");
    quote.textContent = row.body || "";
    const cite = document.createElement("cite");
    const name = document.createElement("strong");
    name.textContent = row.display_name || "A student";
    cite.appendChild(name);
    const when = formatDate(row.created_at);
    if (when) {
      const date = document.createElement("span");
      date.textContent = when;
      cite.appendChild(date);
    }
    art.appendChild(stars);
    art.appendChild(quote);
    art.appendChild(cite);
    return art;
  }

  function paintReviews(list, empty, rows) {
    const marquee = document.getElementById("witness-marquee");
    list.innerHTML = "";
    if (!rows.length) {
      if (marquee) marquee.hidden = true;
      if (empty) empty.hidden = true;
      list.hidden = true;
      return;
    }
    if (marquee) marquee.hidden = false;
    if (empty) empty.hidden = true;
    list.hidden = false;
    rows.forEach(function (row) { list.appendChild(renderQuote(row)); });
    rows.forEach(function (row) { list.appendChild(renderQuote(row)); });
  }

  function loadApproved() {
    const list = document.getElementById("witness-list");
    const marquee = document.getElementById("witness-marquee");
    const empty = document.getElementById("witness-empty");
    if (marquee) marquee.hidden = true;
    if (empty) empty.hidden = true;
    if (list) list.hidden = true;
    const c = authClient();
    if (!list) return Promise.resolve();
    if (!c) {
      paintReviews(list, empty, []);
      return Promise.resolve();
    }
    return c.from(TABLE)
      .select("id, display_name, body, rating, created_at")
      .eq("approved", true)
      .eq("rejected", false)
      .order("created_at", { ascending: false })
      .limit(24)
      .then(function (res) {
        const rows = (res && res.data) || [];
        if ((res && res.error) || rows.length === 0) {
          paintReviews(list, empty, []);
          return;
        }
        paintReviews(list, empty, rows);
      }).catch(function () {
        paintReviews(list, empty, SEED_REVIEWS);
      });
  }

  function setReviewFlags(id, approved, rejected) {
    const c = authClient();
    if (!c || !id) return Promise.resolve();
    return c.from(TABLE).update({
      approved: !!approved,
      rejected: !!rejected,
      approved_at: approved ? new Date().toISOString() : null
    }).eq("id", id).then(function () {
      loadApproved();
      loadQueue();
    });
  }

  function validateReviewText(raw) {
    const text = String(raw || "").replace(/\s+/g, " ").trim();
    if (text.length < MIN) {
      return { ok: false, message: "Write at least " + MIN + " characters." };
    }
    if (text.length > MAX) {
      return { ok: false, message: "Keep under " + MAX + " characters." };
    }
    return { ok: true, text: text };
  }

  function updateReview(id, raw, rating, statusElId) {
    const parsed = validateReviewText(raw);
    if (!parsed.ok) {
      setStatus(parsed.message, "error", statusElId);
      return Promise.resolve(false);
    }
    const stars = clampRating(rating);
    if (!stars) {
      setStatus("Pick a star rating.", "error", statusElId);
      return Promise.resolve(false);
    }
    if (!signedIn()) {
      setStatus("Sign in to edit.", "error", statusElId);
      return Promise.resolve(false);
    }
    const c = authClient();
    if (!c || !id) {
      setStatus("Could not save. Try again.", "error", statusElId);
      return Promise.resolve(false);
    }
    return c.from(TABLE).update({
      body: parsed.text,
      rating: stars
    }).eq("id", id).then(function (res) {
      if (res && res.error) {
        setStatus("Could not save. Try again.", "error", statusElId);
        return false;
      }
      setStatus("Saved. It will appear after approval.", "ok", statusElId);
      loadApproved();
      loadQueue();
      loadOwnReview();
      return true;
    }).catch(function () {
      setStatus("Could not save. Try again.", "error", statusElId);
      return false;
    });
  }

  function openQueueEdit(item, row) {
    if (!canEditReview(row) || item.dataset.editing === "1") return;
    item.dataset.editing = "1";
    const quote = item.querySelector("blockquote");
    const meta = item.querySelector(".witness-queue-meta");
    const starsEl = item.querySelector(".witness-queue-stars");
    const actions = item.querySelector(".witness-queue-actions");
    if (quote) quote.hidden = true;
    if (meta) meta.hidden = true;
    if (starsEl) starsEl.hidden = true;
    if (actions) actions.hidden = true;

    const editWrap = document.createElement("div");
    editWrap.className = "witness-queue-edit";

    const starsField = document.createElement("div");
    starsField.className = "witness-stars-field";
    const starsInput = document.createElement("div");
    starsInput.className = "witness-stars-input";
    const hiddenRating = document.createElement("input");
    hiddenRating.type = "hidden";
    hiddenRating.value = String(clampRating(row.rating) || 5);
    starsField.appendChild(starsInput);
    starsField.appendChild(hiddenRating);
    mountStarPicker(starsInput, hiddenRating, row.rating || 5);

    const textarea = document.createElement("textarea");
    textarea.value = row.body || "";

    const editActions = document.createElement("div");
    editActions.className = "witness-queue-actions";
    const save = document.createElement("button");
    save.type = "button";
    save.className = "btn solid";
    save.textContent = "Save";
    const cancel = document.createElement("button");
    cancel.type = "button";
    cancel.className = "btn";
    cancel.textContent = "Cancel";

    save.addEventListener("click", function () {
      save.disabled = true;
      updateReview(row.id, textarea.value, hiddenRating.value).then(function (ok) {
        save.disabled = false;
        if (ok) loadQueue();
      });
    });
    cancel.addEventListener("click", function () {
      loadQueue();
    });

    editActions.appendChild(save);
    editActions.appendChild(cancel);
    editWrap.appendChild(starsField);
    editWrap.appendChild(textarea);
    editWrap.appendChild(editActions);
    item.appendChild(editWrap);
  }

  function renderQueueRow(row) {
    const item = document.createElement("article");
    item.className = "witness-queue-item";
    const stars = document.createElement("p");
    stars.className = "witness-queue-stars";
    stars.textContent = starsLabel(row.rating);
    const quote = document.createElement("blockquote");
    quote.textContent = row.body || "";
    const meta = document.createElement("p");
    meta.className = "witness-queue-meta";
    meta.textContent = (row.display_name || "Student") + " · " + formatDate(row.created_at);
    const actions = document.createElement("div");
    actions.className = "witness-queue-actions";
    const approve = document.createElement("button");
    approve.type = "button";
    approve.className = "btn solid";
    approve.textContent = "Approve";
    approve.addEventListener("click", function () { setReviewFlags(row.id, true, false); });
    const hide = document.createElement("button");
    hide.type = "button";
    hide.className = "btn";
    hide.textContent = "Hide";
    hide.addEventListener("click", function () { setReviewFlags(row.id, false, true); });
    actions.appendChild(approve);
    actions.appendChild(hide);
    if (canEditReview(row)) {
      const edit = document.createElement("button");
      edit.type = "button";
      edit.className = "btn";
      edit.textContent = "Edit";
      edit.addEventListener("click", function () { openQueueEdit(item, row); });
      actions.appendChild(edit);
    }
    item.appendChild(stars);
    item.appendChild(quote);
    item.appendChild(meta);
    item.appendChild(actions);
    return item;
  }

  function syncAdminUi() {
    const admin = isModerator();
    const queue = document.getElementById("witness-queue");
    const link = document.getElementById("admin-reviews-link");
    const insightsLink = document.getElementById("admin-insights-link");
    if (queue) queue.hidden = !admin;
    if (link) link.hidden = !admin;
    if (insightsLink) insightsLink.hidden = !admin;
    document.body.classList.toggle("is-moderator", admin);
  }

  function loadQueue() {
    const list = document.getElementById("witness-queue-list");
    syncAdminUi();
    if (!list || !isModerator()) return Promise.resolve();
    const c = authClient();
    if (!c) return Promise.resolve();
    return c.from(TABLE)
      .select("id, user_id, display_name, body, rating, created_at, approved")
      .eq("approved", false)
      .eq("rejected", false)
      .order("created_at", { ascending: true })
      .limit(40)
      .then(function (res) {
        list.innerHTML = "";
        if (res && res.error) {
          const fail = document.createElement("p");
          fail.className = "witness-queue-empty";
          fail.textContent = "Could not load.";
          list.appendChild(fail);
          return;
        }
        const rows = (res && res.data) || [];
        if (!rows.length) {
          const p = document.createElement("p");
          p.className = "witness-queue-empty";
          p.textContent = "No reviews waiting.";
          list.appendChild(p);
          return;
        }
        rows.forEach(function (row) { list.appendChild(renderQueueRow(row)); });
      });
  }

  let ownReviewId = null;

  function loadOwnReview() {
    const panel = document.getElementById("witness-own-review");
    const newCard = document.getElementById("witness-new-card");
    if (!panel) return Promise.resolve();
    if (!signedIn() || !authClient()) {
      panel.hidden = true;
      if (newCard) newCard.hidden = false;
      ownReviewId = null;
      return Promise.resolve();
    }
    return authClient().from(TABLE)
      .select("id, user_id, body, rating, approved, rejected, created_at")
      .eq("user_id", currentUser().id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(function (res) {
        const row = res && res.data;
        if (!row || !canEditReview(row)) {
          panel.hidden = true;
          if (newCard) newCard.hidden = false;
          ownReviewId = null;
          return;
        }
        ownReviewId = row.id;
        panel.hidden = false;
        if (newCard) newCard.hidden = true;
        const statusEl = document.getElementById("witness-own-status");
        if (statusEl) {
          if (row.rejected) {
            statusEl.textContent = "Your note was hidden. Revise it and save to send it back for approval.";
          } else if (row.approved) {
            statusEl.textContent = "Your note is live. Edits return it to the approval queue.";
          } else {
            statusEl.textContent = "Pending approval. You can still edit before it goes live.";
          }
        }
        const body = document.getElementById("witness-edit-body");
        if (body) body.value = row.body || "";
        mountStarPicker(
          document.getElementById("witness-edit-stars"),
          document.getElementById("witness-edit-rating"),
          row.rating || 5
        );
      }).catch(function () {
        panel.hidden = true;
        if (newCard) newCard.hidden = false;
        ownReviewId = null;
      });
  }

  function submitReview(raw, opts) {
    opts = opts || {};
    const parsed = validateReviewText(raw);
    if (!parsed.ok) {
      setStatus(parsed.message, "error");
      return Promise.resolve(false);
    }
    const rating = clampRating(opts.rating);
    if (!rating) {
      setStatus("Pick a star rating.", "error");
      return Promise.resolve(false);
    }

    const c = authClient();
    const u = currentUser();

    if (c) {
      try {
        const surveyOk = !(window.Insights && window.Insights.takeSurveySlot) || window.Insights.takeSurveySlot();
        if (surveyOk) {
          const cohortVal = opts.cohort || (window.BAJourney && typeof window.BAJourney.getCohort === "function" ? window.BAJourney.getCohort() : null);
          c.from("exhibit_surveys").insert({
            user_id: u ? u.id : null,
            anon_id: window.Insights && window.Insights.anonId ? window.Insights.anonId() : "",
            cohort: cohortVal || "",
            role: opts.role || "Student",
            rating: rating,
            feedback: parsed.text,
            responses: {
              kind: opts.kind || "exit",
              cohort: cohortVal || "",
              role: opts.role || "Student",
              rating: rating,
              classroomUse: opts.classroomUse || "",
              nps: typeof opts.nps === "number" ? opts.nps : null,
              changed: opts.changed || ""
            }
          }).then(function () {}).catch(function () {});
        }
      } catch (e) {}
    }

    if (!signedIn()) {
      setStatus("Sign in to post.", "error");
      if (window.ScrollTerms && typeof window.ScrollTerms.requestSignIn === "function") {
        window.ScrollTerms.requestSignIn();
      }
      return Promise.resolve(false);
    }
    if (!c || !u) {
      setStatus("Sign in to post.", "error");
      return Promise.resolve(false);
    }
    if (reviewDayCount() >= REVIEW_MAX) {
      setStatus("You can post 3 reviews per day.", "error");
      return Promise.resolve(false);
    }
    const displayName = (opts.name ? String(opts.name).trim().slice(0, 80) : reviewerName()) || "Student";
    return c.from(TABLE).insert({
      user_id: u.id,
      display_name: displayName,
      body: parsed.text,
      rating: rating,
      approved: false,
      rejected: false
    }).then(function (res) {
      if (res && res.error) {
        setStatus("Could not save. Try again.", "error");
        return false;
      }
      bumpReviewDay();
      setStatus("Saved. It will appear after approval.", "ok");
      const input = document.getElementById("witness-body");
      if (input) input.value = "";
      const ratingInput = document.getElementById("witness-rating");
      mountStarPicker(
        document.getElementById("witness-stars"),
        ratingInput,
        5
      );
      loadQueue();
      loadOwnReview();
      return true;
    }).catch(function () {
      setStatus("Could not save. Try again.", "error");
      return false;
    });
  }

  function bindForm() {
    const form = document.getElementById("witness-form");
    if (!form) return;
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      const input = document.getElementById("witness-body");
      const rating = document.getElementById("witness-rating");
      submitReview(input && input.value, { rating: rating && rating.value });
    });
  }

  function bindOwnForm() {
    const form = document.getElementById("witness-edit-form");
    if (!form) return;
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (!ownReviewId) return;
      const input = document.getElementById("witness-edit-body");
      const rating = document.getElementById("witness-edit-rating");
      updateReview(
        ownReviewId,
        input && input.value,
        rating && rating.value,
        "witness-edit-status"
      );
    });
  }

  function syncFormGate() {
    const hint = document.getElementById("witness-signin-hint");
    const submit = document.getElementById("witness-submit");
    const inSession = signedIn();
    if (hint) hint.hidden = inSession;
    if (submit) submit.textContent = inSession ? "Leave a note" : "Sign in to leave a note";
  }

  function start() {
    mountStarPickers();
    syncFormGate();
    syncAdminUi();
    loadApproved();
    loadQueue();
    loadOwnReview();
  }

  function boot() {
    if (!document.getElementById("witnesses")) return;
    bindForm();
    bindOwnForm();
    if (window.ScrollAuth && typeof window.ScrollAuth.ready === "function") {
      window.ScrollAuth.ready().then(start);
    } else {
      start();
    }
    if (window.ScrollAuth && typeof window.ScrollAuth.onChange === "function") {
      window.ScrollAuth.onChange(function () {
        syncFormGate();
        syncAdminUi();
        loadQueue();
        loadOwnReview();
      });
    }
  }

  window.ScrollReviews = {
    submitReview: submitReview,
    updateReview: updateReview,
    loadApproved: loadApproved,
    canEditReview: canEditReview
  };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
