(function () {
  const NEXT_KEY = "baTermsNext";
  let busy = false;
  let lastFocus = null;
  let overlayRequested = false;

  function journey() {
    return window.BAJourney;
  }

  function isCoverPage() {
    return !!(document.body && document.body.classList.contains("cover"));
  }

  function hasAgreed() {
    const J = journey();
    return !!(J && typeof J.hasAcceptedTerms === "function" && J.hasAcceptedTerms());
  }

  function hasPending() {
    const J = journey();
    return !!(J && typeof J.hasPendingTerms === "function" && J.hasPendingTerms());
  }

  function formConsented() {
    return hasAgreed() || hasPending();
  }

  function signedIn() {
    return !!(window.ScrollAuth && window.ScrollAuth.getUser && window.ScrollAuth.getUser());
  }

  function isAdmin() {
    const auth = window.ScrollAuth;
    if (auth && typeof auth.isAdmin === "function") return !!auth.isAdmin();
    if (auth && typeof auth.isModerator === "function") return !!auth.isModerator();
    return false;
  }

  function canEnter() {
    // Dev-only preview bypass (localhost / loopback). Never on deployed hosts.
    try {
      const host = location.hostname;
      const local = host === "localhost" || host === "127.0.0.1" || host === "[::1]";
      if (local && new URLSearchParams(location.search).get("preview") === "full") return true;
    } catch (e) {}
    if (isAdmin()) return true;
    // Production: terms acceptance AND a live signed-in session are both required.
    // pendingTerms alone never unlocks content for a signed-out visitor.
    return hasAgreed() && signedIn();
  }

  function overlay() {
    return document.getElementById("terms-overlay");
  }

  function errorBox() {
    return document.getElementById("terms-error");
  }

  function agreeBox() {
    return document.getElementById("terms-agree");
  }

  function checkWrap() {
    return document.getElementById("terms-check-wrap");
  }

  function continueBtn() {
    return document.getElementById("terms-continue");
  }

  function dismissBtn() {
    return document.getElementById("terms-dismiss");
  }

  function isExhibitHref(href) {
    if (!href || href.charAt(0) === "#") return false;
    try {
      const u = new URL(href, location.href);
      if (u.origin !== location.origin) return false;
      const file = (u.pathname.split("/").pop() || "").split("?")[0];
      return file === "study.html" || file === "gallery.html" || file === "map.html" || file === "insights.html";
    } catch (e) {
      return false;
    }
  }

  function rememberNext(href) {
    try { sessionStorage.setItem(NEXT_KEY, href); } catch (e) {}
  }

  function takeNext() {
    try {
      const href = sessionStorage.getItem(NEXT_KEY);
      sessionStorage.removeItem(NEXT_KEY);
      return href;
    } catch (e) {
      return null;
    }
  }

  function clearNext() {
    try { sessionStorage.removeItem(NEXT_KEY); } catch (e) {}
  }

  function hasAuthCode() {
    try { return !!new URLSearchParams(location.search || "").get("code"); } catch (e) { return false; }
  }

  function dismissCoverGate() {
    overlayRequested = false;
    clearNext();
    unlock();
  }

  function continueIfReady() {
    if (!canEnter()) return false;
    overlayRequested = false;
    const next = takeNext();
    unlock();
    if (!next) return true;
    try {
      const dest = new URL(next, location.href);
      if (dest.origin !== location.origin) return true;
      const here = location.pathname + location.search + location.hash;
      const there = dest.pathname + dest.search + dest.hash;
      if (there !== here) location.assign(dest.href);
    } catch (e) {}
    return true;
  }

  function messages() {
    return {
      agree: "Confirm that you agree to the terms before you enter.",
      storage: "Your agreement could not be saved on this device. Allow site data, then try again.",
      unsigned: "Agree to the terms, then sign in with Google to enter. The exhibit stays closed until both are done.",
      generic: "The exhibit could not be opened. Check the form and try again.",
      unavailable: "Sign-in is unavailable on this copy of the site. The exhibit cannot open without it."
    };
  }

  function setError(kind, message) {
    const box = errorBox();
    const wrap = checkWrap();
    const input = agreeBox();
    if (!box) return;
    if (!message) {
      box.hidden = true;
      box.textContent = "";
      box.removeAttribute("data-error");
      if (wrap) wrap.classList.remove("is-invalid");
      if (input) {
        input.setAttribute("aria-invalid", "false");
        input.removeAttribute("aria-describedby");
      }
      return;
    }
    box.hidden = false;
    box.dataset.error = kind || "generic";
    box.textContent = message;
    if (kind === "agree" && wrap) wrap.classList.add("is-invalid");
    else if (wrap) wrap.classList.remove("is-invalid");
    if (input) {
      input.setAttribute("aria-invalid", kind === "agree" ? "true" : "false");
      input.setAttribute("aria-describedby", "terms-error");
    }
  }

  function syncError() {
    const siteErr = window.SiteErrors && window.SiteErrors.current && window.SiteErrors.current();
    if (siteErr && overlay() && !overlay().hidden) setError("auth", siteErr);
  }

  function setBusy(on) {
    busy = !!on;
    const btn = continueBtn();
    if (!btn) return;
    btn.disabled = busy;
    syncButton();
  }

  function syncButton() {
    const btn = continueBtn();
    if (!btn) return;
    if (busy) {
      btn.textContent = "Opening sign-in…";
      return;
    }
    btn.textContent = signedIn() ? "Enter the exhibit" : "Sign in";
  }

  function ensureOverlay() {
    if (overlay()) return overlay();
    const root = document.createElement("div");
    root.id = "terms-overlay";
    root.className = "terms-overlay";
    root.hidden = true;
    root.innerHTML =
      '<form id="terms-form" class="terms-card" role="dialog" aria-modal="true" aria-labelledby="terms-title">' +
        '<small>Required to enter</small>' +
        '<h2 id="terms-title">Terms of use</h2>' +
        '<div class="terms-scroll" tabindex="0">' +
          '<h3>Welcome</h3>' +
          '<p>The Scroll of Daniel is a guided study of the book of Daniel, offered for personal reading and classroom teaching. It is not a church membership, a diploma, or a paid course, and no payment is taken here.</p>' +
          '<h3>An account is required</h3>' +
          '<p>This exhibit is closed until you read these terms, confirm your agreement, and sign in. Signing in lets us recognize you on a later visit so you do not have to sign in every time. You may sign out at any time; the exhibit will remain closed until you sign in again.</p>' +
          '<h3>Certificate of completion</h3>' +
          '<p>Signing in is required so the certificate of completion can carry your proper details. Your signed-in name is used on the certificate; you may confirm or correct it before you download. Without a signed-in profile the exhibit cannot print a certificate that belongs to you.</p>' +
          '<h3>How your study is kept</h3>' +
          '<p>Your place in the sitting and your progress are saved with your signed-in profile, and also on this device, so you can continue where you left off.</p>' +
          '<h3>What we learn from your study</h3>' +
          '<p>While you study, the exhibit records simple study events: which lessons you open and finish, which steps of a sitting you visit, your answers to checkpoint questions, and the time spent on a lesson. Use is anonymous until sign-in. With your signed-in profile, your study progress and optional answers are collected to improve the lessons. No selling, no advertising. You may stop usage analytics from the Progress panel or the home page. If your browser sends a Do Not Track signal, nothing is recorded. To ask for deletion, email the site operator.</p>' +
          '<h3>Scripture and the exhibit</h3>' +
          '<p>Bible quotations are from the King James Version. The lessons, maps, images, and reconstructions are for study on this site. You may not copy the exhibit to sell, scrape, or republish as your own.</p>' +
          '<h3>What this site is not</h3>' +
          '<ul>' +
            '<li>We do not offer legal, medical, or pastoral counsel.</li>' +
            '<li>Dates and historical notes are taught with care, but scholars may still differ.</li>' +
            '<li>The exhibit is a teaching aid. It does not replace the reading of Scripture itself.</li>' +
          '</ul>' +
          '<h3>Your agreement</h3>' +
          '<p>By confirming below you state that you have read these terms, that you are old enough to use the site, and that you will sign in before entering. If the terms change, you will be asked to agree again.</p>' +
        '</div>' +
        '<div id="terms-error" class="terms-error" role="alert" hidden></div>' +
        '<label class="terms-check" id="terms-check-wrap" for="terms-agree">' +
          '<input id="terms-agree" name="terms-agree" type="checkbox" value="1">' +
          '<span class="terms-box" aria-hidden="true"></span>' +
          '<span>I have read and agree to these terms.</span>' +
        '</label>' +
        '<div class="terms-actions">' +
          '<button type="submit" id="terms-continue" class="terms-btn solid terms-btn-block">Sign in</button>' +
          '<button type="button" id="terms-dismiss" class="terms-btn terms-btn-block" hidden>Back to the cover</button>' +
        '</div>' +
      '</form>';
    document.body.appendChild(root);
    bindOverlay(root);
    return root;
  }

  function bindOverlay(root) {
    const form = root.querySelector("#terms-form");
    const input = agreeBox();
    const back = dismissBtn();
    if (form) {
      form.addEventListener("submit", function (e) {
        e.preventDefault();
        submitGate();
      });
    }
    if (input) {
      input.addEventListener("change", function () {
        const J = journey();
        if (input.checked) {
          setError("", "");
          if (J && typeof J.acceptTerms === "function") J.acceptTerms();
        } else if (J && typeof J.clearPendingTerms === "function") {
          J.clearPendingTerms();
        }
      });
    }
    if (back) {
      back.addEventListener("click", function () {
        dismissCoverGate();
      });
    }
    root.addEventListener("click", function (e) {
      if (e.target !== root || !isCoverPage()) return;
      dismissCoverGate();
    });
  }

  function bindCoverGates() {
    if (!isCoverPage()) return;
    document.addEventListener("click", function (e) {
      if (canEnter()) return;
      const a = e.target.closest("a[href]");
      if (!a || a.getAttribute("target") === "_blank") return;
      const href = a.getAttribute("href");
      if (!isExhibitHref(href)) return;
      e.preventDefault();
      rememberNext(a.href);
      overlayRequested = true;
      lock();
    }, true);
  }

  function lock() {
    // Preserve deep links (sheet, map epoch, artifact) for post-sign-in return.
    if (!isCoverPage()) {
      try { rememberNext(location.pathname + location.search + location.hash); } catch (e) {}
    }
    const node = ensureOverlay();
    const alreadyOpen = node && !node.hidden;
    node.hidden = false;
    document.body.classList.add("terms-locked", "site-locked");
    const back = dismissBtn();
    if (back) back.hidden = !isCoverPage();
    syncButton();
    const siteErr = window.SiteErrors && window.SiteErrors.current && window.SiteErrors.current();
    if (siteErr) setError("auth", siteErr);
    const input = agreeBox();
    if (input) {
      if (!alreadyOpen || hasAgreed() || hasPending()) input.checked = formConsented();
    }
    if (alreadyOpen) return;
    lastFocus = document.activeElement;
    if (input) {
      if (!input.checked) input.focus();
      else {
        const btn = continueBtn();
        if (btn) btn.focus();
      }
    }
  }

  function unlock() {
    const node = overlay();
    if (node) node.hidden = true;
    document.body.classList.remove("terms-locked", "site-locked");
    setError("", "");
    if (lastFocus && typeof lastFocus.focus === "function") {
      try { lastFocus.focus(); } catch (e) {}
    }
  }

  function syncLock() {
    ensureOverlay();
    syncButton();
    if (canEnter()) {
      continueIfReady();
      return;
    }
    if (isCoverPage() && !overlayRequested) {
      unlock();
      return;
    }
    lock();
  }

  function submitGate() {
    const input = agreeBox();
    const copy = messages();
    const J = journey();
    if (input && !input.checked && formConsented()) input.checked = true;
    if (!input || !input.checked) {
      setError("agree", copy.agree);
      if (input) input.focus();
      return;
    }
    if (!J || typeof J.acceptTerms !== "function") {
      setError("generic", copy.generic);
      return;
    }
    const ok = J.acceptTerms();
    if (!ok) {
      setError("storage", copy.storage);
      return;
    }
    // Terms first, then Google sign-in. A signed-in user who just accepted enters now.
    if (signedIn()) {
      continueIfReady();
      return;
    }
    if (!window.ScrollAuth || typeof window.ScrollAuth.signIn !== "function") {
      setError("unavailable", copy.unavailable);
      return;
    }
    setBusy(true);
    window.ScrollAuth.signIn().then(function (res) {
      if (res && res.error) {
        setBusy(false);
        const siteErr = window.SiteErrors && window.SiteErrors.current && window.SiteErrors.current();
        setError("auth", siteErr || copy.unsigned);
        return;
      }
      // OAuth redirect in progress (res.data.url) — leave the page.
      if (res && res.data && res.data.url) return;
      setBusy(false);
      if (canEnter()) continueIfReady();
      else setError("unsigned", copy.unsigned);
    });
  }

  function onKey(e) {
    const node = overlay();
    if (!node || node.hidden) return;
    if (e.key === "Escape") {
      e.preventDefault();
      if (isCoverPage()) {
        dismissCoverGate();
        return;
      }
      const copy = messages();
      setError("unsigned", signedIn() ? copy.agree : copy.unsigned);
    }
  }

  function requestSignIn() {
    overlayRequested = true;
    lock();
  }

  function afterAuthReady() {
    if (window.ScrollAuth && typeof window.ScrollAuth.onChange === "function") {
      window.ScrollAuth.onChange(function () { syncLock(); });
    }
    syncLock();
  }

  function boot() {
    ensureOverlay();
    bindCoverGates();
    if (isCoverPage() && !hasAuthCode()) clearNext();
    document.addEventListener("keydown", onKey);
    if (window.ScrollAuth && typeof window.ScrollAuth.ready === "function") {
      window.ScrollAuth.ready().then(afterAuthReady);
      return;
    }
    afterAuthReady();
  }

  window.ScrollTerms = {
    syncLock: syncLock,
    syncError: syncError,
    setBusy: setBusy,
    hasAgreed: hasAgreed,
    canEnter: canEnter,
    requestSignIn: requestSignIn
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
