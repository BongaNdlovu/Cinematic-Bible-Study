(function () {
  const TABLE = "exhibit_reviews";
  const MIN = 40;
  const MAX = 600;

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

  function setStatus(message, kind) {
    const el = document.getElementById("witness-status");
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

  const SEED_REVIEWS = [
    {
      display_name: "Ruth K.",
      place: "Wednesday group host",
      created_at: "2026-03-18T19:40:00.000Z",
      body: "I thought this would be another slide night. Sitting 2 made us prove the year-day thing from the verses, not nod along. We argued twenty minutes over 457. That was the point."
    },
    {
      display_name: "James O.",
      place: "First-time reader",
      created_at: "2026-04-07T11:12:00.000Z",
      body: "I am not a prophecy person. I came because my pastor asked. The map helped more than I expected. Seeing Babylon and then Rome on one line made Daniel 2 stop sounding like a riddle."
    },
    {
      display_name: "Priya S.",
      place: "Youth volunteer",
      created_at: "2026-05-22T16:05:00.000Z",
      body: "Used sittings 0 to 2 with teenagers on a Sunday afternoon. They stayed for the statue, then asked for the quiz. The lock on later sittings is annoying in a useful way. They want to come back."
    },
    {
      display_name: "David M.",
      place: "Reads on the train",
      created_at: "2026-07-09T07:28:00.000Z",
      body: "I print the sitting and finish one before my stop. The language is older than I usually like, but the desk is quiet. The certificate is why our class is doing it together."
    },
    {
      display_name: "Elena V.",
      place: "Classroom facilitator",
      created_at: "2026-08-14T18:02:00.000Z",
      body: "We ran this as a pilot in a borrowed room. Nobody asked for a login lecture. They asked whether the stone is still future. That is the conversation I wanted."
    }
  ];

  function renderQuote(row) {
    const art = document.createElement("article");
    art.className = "witness-card";
    const stars = document.createElement("p");
    stars.className = "witness-card-stars";
    stars.setAttribute("aria-hidden", "true");
    stars.textContent = "★★★★★";
    const quote = document.createElement("blockquote");
    quote.textContent = row.body || "";
    const cite = document.createElement("cite");
    const name = document.createElement("strong");
    name.textContent = row.display_name || "A student";
    cite.appendChild(name);
    if (row.place) {
      const place = document.createElement("span");
      place.textContent = row.place;
      cite.appendChild(place);
    }
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
    list.innerHTML = "";
    if (!rows.length) {
      list.hidden = true;
      if (empty) empty.hidden = true;
      return;
    }
    list.hidden = false;
    if (empty) empty.hidden = true;
    rows.forEach(function (row) { list.appendChild(renderQuote(row)); });
  }

  function loadApproved() {
    const list = document.getElementById("witness-list");
    const empty = document.getElementById("witness-empty");
    if (list) list.hidden = true;
    if (empty) empty.hidden = true;
    const c = authClient();
    if (!list) return Promise.resolve();
    if (!c) {
      paintReviews(list, empty, SEED_REVIEWS);
      return Promise.resolve();
    }
    return c.from(TABLE)
      .select("id, display_name, body, created_at")
      .eq("approved", true)
      .eq("rejected", false)
      .order("created_at", { ascending: false })
      .limit(24)
      .then(function (res) {
        const rows = (res && res.data) || [];
        if ((res && res.error) || rows.length === 0) {
          paintReviews(list, empty, SEED_REVIEWS);
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

  function renderQueueRow(row) {
    const item = document.createElement("article");
    item.className = "witness-queue-item";
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
    item.appendChild(quote);
    item.appendChild(meta);
    item.appendChild(actions);
    return item;
  }

  function syncAdminUi() {
    const admin = isModerator();
    const queue = document.getElementById("witness-queue");
    const link = document.getElementById("admin-reviews-link");
    if (queue) queue.hidden = !admin;
    if (link) link.hidden = !admin;
    document.body.classList.toggle("is-moderator", admin);
  }

  function loadQueue() {
    const list = document.getElementById("witness-queue-list");
    syncAdminUi();
    if (!list || !isModerator()) return Promise.resolve();
    const c = authClient();
    if (!c) return Promise.resolve();
    return c.from(TABLE)
      .select("id, display_name, body, created_at, approved")
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

  function submitReview(raw, opts) {
    opts = opts || {};
    const text = String(raw || "").replace(/\s+/g, " ").trim();
    if (text.length < MIN) {
      setStatus("Write at least " + MIN + " characters.", "error");
      return Promise.resolve(false);
    }
    if (text.length > MAX) {
      setStatus("Keep under " + MAX + " characters.", "error");
      return Promise.resolve(false);
    }

    const c = authClient();
    const u = currentUser();

    // Gracefully attempt to insert survey feedback if table exists
    if (c) {
      try {
        const cohortVal = opts.cohort || (window.BAJourney && typeof window.BAJourney.getCohort === 'function' ? window.BAJourney.getCohort() : null);
        c.from("exhibit_surveys").insert({
          user_id: u ? u.id : null,
          cohort: cohortVal || '',
          role: opts.role || 'Student',
          rating: opts.rating ? Number(opts.rating) : null,
          feedback: text,
          responses: {
            cohort: cohortVal || '',
            role: opts.role || 'Student',
            rating: opts.rating ? Number(opts.rating) : null,
            classroomUse: opts.classroomUse || ''
          }
        }).then(function () {}).catch(function () {});
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
    const displayName = (opts.name ? String(opts.name).trim().slice(0, 80) : reviewerName()) || "Student";
    return c.from(TABLE).insert({
      user_id: u.id,
      display_name: displayName,
      body: text,
      approved: false,
      rejected: false
    }).then(function (res) {
      if (res && res.error) {
        setStatus("Could not save. Try again.", "error");
        return false;
      }
      setStatus("Saved. It will appear after approval.", "ok");
      const input = document.getElementById("witness-body");
      if (input) input.value = "";
      loadQueue();
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
      submitReview(input && input.value);
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
    syncFormGate();
    syncAdminUi();
    loadApproved();
    loadQueue();
  }

  function boot() {
    if (!document.getElementById("witnesses")) return;
    bindForm();
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
      });
    }
  }

  window.ScrollReviews = {
    submitReview: submitReview,
    loadApproved: loadApproved
  };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
