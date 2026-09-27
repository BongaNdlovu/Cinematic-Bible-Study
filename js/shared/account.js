(function () {
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
      unsigned: "Accept the terms, then sign in with Google to begin the sittings.",
      generic: "The terms could not be saved. Try again.",
      unavailable: "Sign-in is unavailable on this copy of the site. You can still browse. Cloud save, reviews, and the certificate need sign-in."
    };
  }

  function setError(kind, message) {
    const box = el("terms-error");
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

  function setBusy(on) {
    busy = !!on;
    const signIn = el("account-signin");
    const accept = el("account-accept");
    const signOut = el("account-signout");
    if (signIn) signIn.disabled = busy;
    if (accept) accept.disabled = busy;
    if (signOut) signOut.disabled = busy;
    if (signIn) {
      signIn.textContent = busy ? "Opening sign-in…" : "Sign in with Google";
    }
  }

  function paint() {
    const inSession = signedIn();
    const needsTerms = !formConsented();
    const readyToSign = !inSession && !needsTerms;
    const session = el("account-session");
    const form = el("terms-form");
    const accept = el("account-accept");
    const signIn = el("account-signin");
    const signBox = el("account-signin-box");
    const signOut = el("account-signout");
    const name = el("account-name");
    const lead = el("account-lead");
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
    if (lead) {
      if (inSession && !needsTerms) lead.textContent = "You are signed in. Sign out only from this page.";
      else if (inSession && needsTerms) lead.textContent = "The terms text changed. Accept once here, then you are done.";
      else if (!needsTerms) lead.textContent = "You accepted the terms. Sign in to begin the sittings.";
      else lead.textContent = "Accept the terms once, then sign in to begin the sittings.";
    }
    const siteErr = window.SiteErrors && window.SiteErrors.current && window.SiteErrors.current();
    if (siteErr) setError("auth", siteErr);
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
    const signIn = el("account-signin");
    if (signIn && !signIn.hidden) signIn.focus();
  }

  function startSignIn() {
    const copy = messages();
    if (!formConsented()) {
      setError("agree", copy.agree);
      const accept = el("account-accept");
      if (accept) accept.focus();
      return;
    }
    if (!window.ScrollAuth || typeof window.ScrollAuth.signIn !== "function") {
      setError("unavailable", copy.unavailable);
      return;
    }
    shouldReturn = true;
    setBusy(true);
    window.ScrollAuth.signIn().then(function (res) {
      if (res && res.error) {
        setBusy(false);
        const siteErr = window.SiteErrors && window.SiteErrors.current && window.SiteErrors.current();
        setError("auth", siteErr || copy.unsigned);
        return;
      }
      if (res && res.data && res.data.url) return;
      setBusy(false);
      paint();
      finishReturn();
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

  function finishReturn() {
    if (!shouldReturn || !signedIn()) return;
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
    const accept = el("account-accept");
    const signIn = el("account-signin");
    const signOut = el("account-signout");
    if (form) {
      form.addEventListener("submit", function (e) {
        e.preventDefault();
        saveTerms();
      });
    }
    if (accept) accept.addEventListener("click", saveTerms);
    if (signIn) signIn.addEventListener("click", startSignIn);
    if (signOut) signOut.addEventListener("click", startSignOut);
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
