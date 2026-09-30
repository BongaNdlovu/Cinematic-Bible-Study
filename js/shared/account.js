(function () {
  const NAME_KEY = "daniel_certificate_name";
  const AUTH_IDS = [
    "account-signin",
    "account-accept",
    "account-signout",
    "account-email-go",
    "account-email-create",
    "account-email-reset",
    "account-cert-save",
    "account-password-save"
  ];
  let busy = false;
  let shouldReturn = false;

  function terms() {
    return window.ScrollTerms;
  }

  function journey() {
    return window.BAJourney;
  }

  function signedIn() {
    return !!(window.ScrollAuth && window.ScrollAuth.getUser && window.ScrollAuth.getUser());
  }

  function hasAgreed() {
    return !!(terms() && terms().hasAgreed && terms().hasAgreed());
  }

  function hasPending() {
    const J = journey();
    return !!(J && typeof J.hasPendingTerms === "function" && J.hasPendingTerms());
  }

  function formConsented() {
    return hasAgreed() || hasPending();
  }

  function recovering() {
    return !!(window.ScrollAuth && window.ScrollAuth.isPasswordRecovery && window.ScrollAuth.isPasswordRecovery());
  }

  function displayName() {
    if (window.ScrollAuth && typeof window.ScrollAuth.displayName === "function") {
      return window.ScrollAuth.displayName() || "Signed in";
    }
    return "Signed in";
  }

  function el(id) {
    return document.getElementById(id);
  }

  function messages() {
    return {
      agree: "Accept the terms before you sign in.",
      storage: "Your agreement could not be saved on this device. Allow site data, then try again.",
      unsigned: "Browse freely, or accept the terms and sign in to save cloud progress and certificates.",
      generic: "The terms could not be saved. Try again.",
      unavailable: "Sign-in is unavailable on this copy of the site. You can still browse. Cloud save, reviews, and the certificate need sign-in.",
      email: "Enter a valid email address.",
      password: "Enter your password.",
      weak: "Use a password with at least 8 characters.",
      name: "Enter the name that should appear on the certificate.",
      saved: "Saved.",
      mailed: "Check your email for a reset link. It returns you here.",
      confirm: "Check your email to confirm this address, then sign in.",
      passwordSet: "Password updated."
    };
  }

  function setError(kind, message) {
    const box = el("account-error");
    if (!box) return;
    if (!message) {
      box.hidden = true;
      box.textContent = "";
      box.removeAttribute("data-error");
      return;
    }
    box.hidden = false;
    box.dataset.error = kind || "generic";
    box.textContent = message;
  }

  function setNote(id, message) {
    const box = el(id);
    if (!box) return;
    if (!message) {
      box.hidden = true;
      box.textContent = "";
      return;
    }
    box.hidden = false;
    box.textContent = message;
  }

  function setBusy(on, googleLabel) {
    busy = !!on;
    AUTH_IDS.forEach(function (id) {
      const node = el(id);
      if (node) node.disabled = busy;
    });
    const signIn = el("account-signin");
    if (signIn) signIn.textContent = googleLabel || "Sign in with Google";
  }

  function emailOk(value) {
    const email = String(value || "").trim();
    return email.indexOf("@") > 0 && email.indexOf(".") > 2 && email.length < 254;
  }

  function sanitizeName(raw) {
    const source = String(raw || "");
    let cleaned = "";
    for (let i = 0; i < source.length; i += 1) {
      const code = source.charCodeAt(i);
      if (code >= 32 && code !== 127) cleaned += source.charAt(i);
    }
    return cleaned.replace(/\s+/g, " ").trim().slice(0, 80);
  }

  function readEmail() {
    const field = el("account-email");
    return field ? String(field.value || "").trim() : "";
  }

  function readPassword() {
    const field = el("account-password");
    return field ? String(field.value || "") : "";
  }

  function siteError() {
    return window.SiteErrors && window.SiteErrors.current && window.SiteErrors.current();
  }

  function authReady(copy) {
    if (!formConsented()) {
      setError("agree", copy.agree);
      const accept = el("account-accept");
      if (accept) accept.focus();
      return false;
    }
    if (!window.ScrollAuth) {
      setError("unavailable", copy.unavailable);
      return false;
    }
    return true;
  }

  function fillSettings() {
    const nameField = el("account-cert-name");
    if (nameField && !nameField.matches(":focus")) {
      try { nameField.value = sanitizeName(localStorage.getItem(NAME_KEY) || ""); } catch (e) {}
    }
  }

  /* ---------------- Account hub ---------------- */

  const BOOKMARKS_KEY = "baStudyBookmarks";

  function escapeHub(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }

  function readBookmarks() {
    try {
      const raw = JSON.parse(localStorage.getItem(BOOKMARKS_KEY) || "[]");
      if (!Array.isArray(raw)) return [];
      return raw.map(Number).filter(function (n) { return Number.isInteger(n) && n >= 0 && n <= 10; });
    } catch (e) { return []; }
  }

  function hubCard(inner, extraClass) {
    return '<article class="hub-card' + (extraClass ? " " + extraClass : "") + '">' + inner + "</article>";
  }

  function progressCard(J, state) {
    const done = state.completed;
    const total = 11;
    const pct = Math.round((done / total) * 100);
    const nextLabel = J.resumeLabel();
    const nextHref = J.resumeHref();
    const body =
      "<small>Study progress</small>" +
      '<p class="hub-big">' + done + " <span>of " + total + " sittings</span></p>" +
      '<div class="hub-bar" role="progressbar" aria-valuemin="0" aria-valuemax="' + total + '" aria-valuenow="' + done + '">' +
      '<i style="width:' + pct + '%"></i></div>' +
      (done > 0
        ? '<p class="hub-line">Up next: <b>' + escapeHub(nextLabel) + "</b></p>" +
          '<a class="hub-link" href="' + escapeHub(nextHref) + '">Continue where you left off →</a>'
        : '<p class="hub-line">Open the first sitting to begin the chain.</p>' +
          '<a class="hub-link" href="study.html?sheet=0">Begin the sitting →</a>');
    return hubCard(body);
  }

  function bookmarkCard() {
    const marks = readBookmarks();
    const J = journey();
    let list;
    if (!marks.length) {
      list = '<p class="hub-line">Nothing saved yet. The Bookmark button in a sitting keeps your place here.</p>';
    } else {
      list = "<ul>" + marks.map(function (n) {
        const label = J && typeof J.sheetLabel === "function" ? J.sheetLabel(n) : "Sitting " + n;
        return '<li><a href="study.html?sheet=' + n + '">' + escapeHub(label) + "</a></li>";
      }).join("") + "</ul>";
    }
    return hubCard("<small>Bookmarks</small>" + list);
  }

  function certificateCard() {
    const J = journey();
    const complete = !!(J && typeof J.allLessonsComplete === "function" && J.allLessonsComplete());
    let name = "";
    try { name = sanitizeName(localStorage.getItem(NAME_KEY) || ""); } catch (e) {}
    const body =
      "<small>Certificate</small>" +
      (complete
        ? '<p class="hub-big">Ready <span>to print</span></p>' +
          '<p class="hub-line">Name on it: <b>' + (name ? escapeHub(name) : "not set yet") + "</b></p>" +
          '<a class="hub-link" href="study.html?sheet=10">Open the study to print it →</a>'
        : '<p class="hub-big">' + (name ? escapeHub(name) : "Locked") + "</p>" +
          '<p class="hub-line">Finish all 11 sittings to earn the certificate' +
          (name ? ". Your name is saved and waiting." : ", then confirm the name to print it.") + "</p>");
    return hubCard(body);
  }

  function syncCard() {
    const auth = window.ScrollAuth;
    const live = !!(auth && auth.isConfigured && auth.isConfigured() && auth.getClient && auth.getClient());
    const body = live
      ? "<small>Cloud backup</small>" +
        '<p class="hub-big">On</p>' +
        '<p class="hub-line">Progress, bookmarks, and the certificate name save with your profile and follow you to other devices.</p>'
      : "<small>Cloud backup</small>" +
        '<p class="hub-big">This device</p>' +
        '<p class="hub-line">No live connection on this copy. Your study still saves on this device.</p>';
    return hubCard(body);
  }

  function reviewsCard(reviews, reviewsError) {
    let list;
    if (reviewsError) {
      list = '<p class="hub-line">Could not load your reviews right now.</p>';
    } else if (!reviews.length) {
      list = '<p class="hub-line">You have not left a note yet. After a sitting, the home page stars are yours.</p>';
    } else {
      list = "<ul>" + reviews.slice(0, 4).map(function (r) {
        const status = r.approved ? "Posted" : (r.rejected ? "Not posted" : "Awaiting review");
        const text = String(r.body || "").slice(0, 90);
        return "<li><b>" + escapeHub(status) + "</b> · " + escapeHub(text) + (text.length >= 90 ? "…" : "") + "</li>";
      }).join("") + "</ul>";
    }
    return hubCard("<small>My notes on the home page</small>" + list);
  }

  function adminCard() {
    return hubCard(
      "<small>Moderator</small>" +
      '<p class="hub-big">Dashboard</p>' +
      '<p class="hub-line">Lesson funnel, quiz accuracy, feedback, referrals, and learners — limited to the operator account.</p>' +
      '<a class="hub-link" href="insights.html">Open the moderator dashboard →</a>',
      "hub-card-admin"
    );
  }

  function renderHub(reviews, reviewsError) {
    if (reviews !== undefined) { hubReviews = reviews; hubReviewsError = !!reviewsError; }
    const host = el("account-hub-cards");
    if (!host) return;
    // The hub is for signed-in members. Guests see the terms and sign-in steps only.
    if (!signedIn()) { host.hidden = true; host.innerHTML = ""; return; }
    const J = journey();
    if (!J || typeof J.load !== "function") { host.hidden = true; return; }
    const state = J.load() || {};
    const done = Array.isArray(state.completedSheets) ? state.completedSheets.length : 0;
    let cards = progressCard(J, { completed: done });
    cards += bookmarkCard();
    cards += certificateCard();
    const auth = window.ScrollAuth;
    cards += reviewsCard(hubReviews || [], hubReviewsError);
    cards += syncCard();
    if (auth && typeof auth.isModerator === "function" && auth.isModerator()) cards += adminCard();
    host.innerHTML = cards;
    host.hidden = false;
  }

  let hubReviews = null;
  let hubReviewsError = false;
  let hubMemberKey = null;

  function loadMyReviews() {
    const auth = window.ScrollAuth;
    const user = auth && auth.getUser && auth.getUser();
    const c = auth && auth.getClient && auth.getClient();
    if (!user || !c || typeof c.from !== "function") { renderHub([], false); return; }
    c.from("exhibit_reviews")
      .select("body,rating,approved,rejected,created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(10)
      .then(function (res) {
        if (res && res.error) renderHub([], true);
        else renderHub(res && res.data ? res.data : [], false);
      })
      .catch(function () { renderHub([], true); });
  }

  function refreshHub() {
    renderHub();
    loadMyReviews();
  }

  function hubIfNeeded() {
    const auth = window.ScrollAuth;
    const user = auth && auth.getUser && auth.getUser();
    const key = user ? (user.id || "member") : "guest";
    if (key !== hubMemberKey) {
      hubMemberKey = key;
      refreshHub();
    } else {
      renderHub();
    }
  }

  function paint() {
    const inSession = signedIn();
    const needsTerms = !formConsented();
    const readyToSign = !inSession && !needsTerms;
    const resetMode = recovering();
    const session = el("account-session");
    const form = el("terms-form");
    const accept = el("account-accept");
    const signIn = el("account-signin");
    const signBox = el("account-signin-box");
    const signOut = el("account-signout");
    const name = el("account-name");
    const lead = el("account-lead");
    const settings = el("account-settings");
    const passwordBox = el("account-password-box");
    if (name) name.textContent = inSession ? displayName() : "";
    if (session) session.hidden = !inSession;
    if (signOut) signOut.hidden = !inSession;
    if (form) form.hidden = !needsTerms;
    if (accept) accept.hidden = !needsTerms;
    if (signIn) signIn.hidden = !readyToSign;
    if (signBox) {
      signBox.hidden = !readyToSign;
      signBox.classList.toggle("is-lit", readyToSign);
    }
    if (settings) {
      settings.hidden = !inSession;
      settings.classList.toggle("is-lit", resetMode);
    }
    if (passwordBox) passwordBox.classList.toggle("is-lit", resetMode);
    if (!inSession) setNote("account-settings-note", "");
    else fillSettings();
    if (lead) {
      if (resetMode) lead.textContent = "Set a new password to finish signing in.";
      else if (inSession && !needsTerms) lead.textContent = "You are signed in. Settings stay on this page.";
      else if (inSession && needsTerms) lead.textContent = "The terms text changed. Accept once here, then you are done.";
      else if (!needsTerms) lead.textContent = "You accepted the terms. Sign in with email or Google to save cloud progress and certificates.";
      else lead.textContent = "Browse freely, or accept the terms and sign in to save cloud progress and certificates.";
    }
    const err = siteError();
    if (err) setError("auth", err);
    else if (!busy) setError("", "");
    hubIfNeeded();
  }

  function acceptNow() {
    const copy = messages();
    const J = journey();
    if (!J || typeof J.acceptTerms !== "function") {
      setError("generic", copy.generic);
      return false;
    }
    const ok = J.acceptTerms();
    if (!ok) {
      setError("storage", copy.storage);
      return false;
    }
    setError("", "");
    return true;
  }

  function saveTerms() {
    if (!acceptNow()) return;
    paint();
    const email = el("account-email");
    if (email && el("account-signin-box") && !el("account-signin-box").hidden) email.focus();
  }

  function finishAuthResult(res, kind) {
    const copy = messages();
    setBusy(false);
    if (res && res.error) {
      setError("auth", siteError() || copy.unsigned);
      return;
    }
    if (kind === "reset") {
      setNote("account-signin-note", copy.mailed);
      return;
    }
    if (kind === "create" && res && res.data && res.data.user && !res.data.session) {
      setNote("account-signin-note", copy.confirm);
      return;
    }
    setNote("account-signin-note", "");
    paint();
    finishReturn();
  }

  function startGoogle() {
    const copy = messages();
    if (!authReady(copy)) return;
    if (typeof window.ScrollAuth.signIn !== "function") {
      setError("unavailable", copy.unavailable);
      return;
    }
    shouldReturn = true;
    setBusy(true, "Opening sign-in…");
    window.ScrollAuth.signIn().then(function (res) {
      if (res && res.data && res.data.url && !(res && res.error)) return;
      finishAuthResult(res, "google");
    });
  }

  function runEmail(kind) {
    const copy = messages();
    if (!authReady(copy)) return;
    const email = readEmail();
    if (!emailOk(email)) {
      setError("auth", copy.email);
      const field = el("account-email");
      if (field) field.focus();
      return;
    }
    const password = readPassword();
    if (kind !== "reset" && !password) {
      setError("auth", copy.password);
      return;
    }
    if (kind === "create" && password.length < 8) {
      setError("auth", copy.weak);
      return;
    }
    const auth = window.ScrollAuth;
    const fn = kind === "create"
      ? auth.signUpEmail
      : kind === "reset"
        ? auth.resetPassword
        : auth.signInEmail;
    if (typeof fn !== "function") {
      setError("unavailable", copy.unavailable);
      return;
    }
    shouldReturn = kind !== "reset";
    setBusy(true);
    setNote("account-signin-note", "");
    const req = kind === "reset" ? fn.call(auth, email) : fn.call(auth, email, password);
    req.then(function (res) {
      finishAuthResult(res, kind);
    });
  }

  function startSignOut() {
    if (!window.ScrollAuth || typeof window.ScrollAuth.signOut !== "function") return;
    shouldReturn = false;
    setBusy(true);
    window.ScrollAuth.signOut().then(function () {
      setBusy(false);
      paint();
    });
  }

  function saveCertName() {
    const copy = messages();
    const name = sanitizeName(el("account-cert-name") && el("account-cert-name").value);
    if (!name) {
      setNote("account-settings-note", copy.name);
      return;
    }
    try { localStorage.setItem(NAME_KEY, name); } catch (e) {}
    if (window.ProgressSync && typeof window.ProgressSync.syncNow === "function") {
      window.ProgressSync.syncNow();
    }
    setNote("account-settings-note", copy.saved);
  }

  function savePassword() {
    const copy = messages();
    const password = el("account-new-password") ? String(el("account-new-password").value || "") : "";
    if (password.length < 8) {
      setNote("account-settings-note", copy.weak);
      return;
    }
    if (!window.ScrollAuth || typeof window.ScrollAuth.updatePassword !== "function") {
      setNote("account-settings-note", copy.unavailable);
      return;
    }
    setBusy(true);
    window.ScrollAuth.updatePassword(password).then(function (res) {
      setBusy(false);
      if (res && res.error) {
        setNote("account-settings-note", siteError() || copy.generic);
        return;
      }
      const field = el("account-new-password");
      if (field) field.value = "";
      setNote("account-settings-note", copy.passwordSet);
      paint();
      finishReturn();
    });
  }

  function finishReturn() {
    if (!shouldReturn || !signedIn()) return;
    if (recovering()) return;
    if (!hasAgreed()) return;
    if (terms() && typeof terms().continueIfReady === "function") terms().continueIfReady();
  }

  function readNextFromQuery() {
    if (!terms()) return;
    try {
      const next = new URLSearchParams(location.search || "").get("next");
      const dest = terms().sameOriginPath(next);
      if (dest) {
        terms().rememberNext(dest);
        shouldReturn = true;
      }
    } catch (e) {}
    try {
      if (new URLSearchParams(location.search || "").get("code")) shouldReturn = true;
    } catch (e) {}
  }

  function bind() {
    const form = el("terms-form");
    const emailForm = el("account-email-form");
    if (form) {
      form.addEventListener("submit", function (e) {
        e.preventDefault();
        saveTerms();
      });
    }
    if (emailForm) {
      emailForm.addEventListener("submit", function (e) {
        e.preventDefault();
        runEmail("signin");
      });
    }
    const accept = el("account-accept");
    const signIn = el("account-signin");
    const signOut = el("account-signout");
    const create = el("account-email-create");
    const reset = el("account-email-reset");
    const cert = el("account-cert-save");
    const password = el("account-password-save");
    if (accept) accept.addEventListener("click", saveTerms);
    if (signIn) signIn.addEventListener("click", startGoogle);
    if (signOut) signOut.addEventListener("click", startSignOut);
    if (create) create.addEventListener("click", function () { runEmail("create"); });
    if (reset) reset.addEventListener("click", function () { runEmail("reset"); });
    if (cert) cert.addEventListener("click", saveCertName);
    if (password) password.addEventListener("click", savePassword);
    window.addEventListener("ba-progress-synced", function () {
      fillSettings();
      refreshHub();
    });
  }

  function afterAuthReady() {
    if (window.ScrollAuth && typeof window.ScrollAuth.onChange === "function") {
      window.ScrollAuth.onChange(function () {
        paint();
        finishReturn();
      });
    }
    paint();
    finishReturn();
  }

  function boot() {
    if (!el("account-hub")) return;
    readNextFromQuery();
    bind();
    if (window.ScrollAuth && typeof window.ScrollAuth.ready === "function") {
      window.ScrollAuth.ready().then(afterAuthReady);
      return;
    }
    afterAuthReady();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
