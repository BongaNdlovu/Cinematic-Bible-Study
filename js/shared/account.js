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
    window.addEventListener("ba-progress-synced", fillSettings);
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
