(function () {
  const J = window.BAJourney;
  let busy = false;
  let lastFocus = null;

  function hasAgreed() {
    return !!(J && typeof J.hasAcceptedTerms === "function" && J.hasAcceptedTerms());
  }

  function signedIn() {
    return !!(window.ScrollAuth && window.ScrollAuth.getUser && window.ScrollAuth.getUser());
  }

  function canEnter() {
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

  function messages() {
    return {
      agree: "Confirm that you agree to the terms before you sign in.",
      storage: "Your agreement could not be saved on this device. Allow site data, then try again.",
      unsigned: "You must sign in after agreeing. The exhibit stays closed until you do.",
      generic: "The exhibit could not be opened. Check the form and try again.",
      unavailable: "Sign-in is unavailable on this copy of the site."
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
          '<p>This exhibit is closed until you read these terms, confirm your agreement, and sign in. Signing in lets us recognize you on a later visit. You may sign out at any time; the exhibit will remain closed until you sign in again.</p>' +
          '<h3>How your study is kept</h3>' +
          '<p>Your place in the sitting and your progress are saved with your signed-in profile, and also on this device, so you can continue where you left off.</p>' +
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
          '<span>I have read and agree to these terms.</span>' +
        '</label>' +
        '<div class="terms-actions">' +
          '<button type="submit" id="terms-continue" class="terms-btn solid terms-btn-block">Sign in</button>' +
        '</div>' +
      '</form>';
    document.body.appendChild(root);
    bindOverlay(root);
    return root;
  }

  function bindOverlay(root) {
    const form = root.querySelector("#terms-form");
    const input = agreeBox();
    if (form) {
      form.addEventListener("submit", function (e) {
        e.preventDefault();
        submitGate();
      });
    }
    if (input) {
      input.addEventListener("change", function () {
        if (input.checked) setError("", "");
      });
    }
  }

  function lock() {
    const node = ensureOverlay();
    const alreadyOpen = node && !node.hidden;
    node.hidden = false;
    document.body.classList.add("terms-locked", "site-locked");
    syncButton();
    const siteErr = window.SiteErrors && window.SiteErrors.current && window.SiteErrors.current();
    if (siteErr) setError("auth", siteErr);
    const input = agreeBox();
    if (input) input.checked = hasAgreed();
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
    if (canEnter()) unlock();
    else lock();
  }

  function submitGate() {
    const input = agreeBox();
    const copy = messages();
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
    if (signedIn()) {
      unlock();
      return;
    }
    if (!window.ScrollAuth || typeof window.ScrollAuth.signIn !== "function") {
      setError("unavailable", copy.unavailable);
      return;
    }
    setBusy(true);
    window.ScrollAuth.signIn().then(function (res) {
      setBusy(false);
      if (res && res.error) {
        const siteErr = window.SiteErrors && window.SiteErrors.current && window.SiteErrors.current();
        setError("auth", siteErr || copy.unsigned);
        return;
      }
      if (canEnter()) unlock();
      else setError("unsigned", copy.unsigned);
    });
  }

  function onKey(e) {
    const node = overlay();
    if (!node || node.hidden) return;
    if (e.key === "Escape") {
      e.preventDefault();
      const copy = messages();
      setError("unsigned", signedIn() ? copy.agree : copy.unsigned);
    }
  }

  function boot() {
    ensureOverlay();
    document.addEventListener("keydown", onKey);
    if (window.ScrollAuth && typeof window.ScrollAuth.onChange === "function") {
      window.ScrollAuth.onChange(function () { syncLock(); });
    }
    syncLock();
  }

  window.ScrollTerms = {
    syncLock: syncLock,
    syncError: syncError,
    setBusy: setBusy,
    hasAgreed: hasAgreed,
    canEnter: canEnter
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
