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

  function renderQuote(row) {
    const art = document.createElement("article");
    art.className = "witness-card";
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
    art.appendChild(quote);
    art.appendChild(cite);
    return art;
  }

  function loadApproved() {
    const list = document.getElementById("witness-list");
    const empty = document.getElementById("witness-empty");
    const c = authClient();
    if (!list) return Promise.resolve();
    if (!c) {
      if (empty) empty.hidden = false;
      return Promise.resolve();
    }
    return c.from(TABLE)
      .select("id, display_name, body, created_at")
      .eq("approved", true)
      .eq("rejected", false)
      .order("created_at", { ascending: false })
      .limit(24)
      .then(function (res) {
        list.innerHTML = "";
        const rows = (res && res.data) || [];
        if (res && res.error) {
          if (empty) {
            empty.hidden = false;
            empty.textContent = "No public testimonies yet. Sign in and write one after you have sat with the book.";
          }
          return;
        }
        rows.forEach(function (row) { list.appendChild(renderQuote(row)); });
        if (empty) empty.hidden = rows.length > 0;
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

  function loadQueue() {
    const wrap = document.getElementById("witness-queue");
    const list = document.getElementById("witness-queue-list");
    if (!wrap || !list) return Promise.resolve();
    if (!isModerator()) {
      wrap.hidden = true;
      return Promise.resolve();
    }
    wrap.hidden = false;
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

  function submitReview(raw) {
    if (!signedIn()) {
      setStatus("Sign in to post a review.", "error");
      if (window.ScrollTerms && typeof window.ScrollTerms.requestSignIn === "function") {
        window.ScrollTerms.requestSignIn();
      }
      return Promise.resolve(false);
    }
    const text = String(raw || "").replace(/\s+/g, " ").trim();
    if (text.length < MIN) {
      setStatus("Write at least " + MIN + " characters so the testimony has weight.", "error");
      return Promise.resolve(false);
    }
    if (text.length > MAX) {
      setStatus("Please keep the testimony under " + MAX + " characters.", "error");
      return Promise.resolve(false);
    }
    const c = authClient();
    const u = currentUser();
    if (!c || !u) {
      setStatus("Sign-in is required to post a review.", "error");
      return Promise.resolve(false);
    }
    return c.from(TABLE).insert({
      user_id: u.id,
      display_name: reviewerName(),
      body: text,
      approved: false,
      rejected: false
    }).then(function (res) {
      if (res && res.error) {
        setStatus("The review could not be saved. Try again in a moment.", "error");
        return false;
      }
      setStatus("Received. It will appear here after it is approved.", "ok");
      const input = document.getElementById("witness-body");
      if (input) input.value = "";
      loadQueue();
      return true;
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
    if (submit) submit.textContent = inSession ? "Submit for review" : "Sign in to testify";
  }

  function start() {
    syncFormGate();
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
        loadQueue();
      });
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
