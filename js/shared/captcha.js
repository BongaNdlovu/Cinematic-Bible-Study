(function () {
  const SCRIPT_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
  const config = window.BAAuthConfig || {};
  const siteKey = String(config.turnstileSiteKey || "");
  if (!siteKey) return;

  let token = "";
  let widgetId = null;

  function box() {
    return document.getElementById("account-captcha");
  }

  function clearToken() {
    token = "";
  }

  function reset() {
    clearToken();
    if (widgetId !== null && window.turnstile && typeof window.turnstile.reset === "function") {
      try { window.turnstile.reset(widgetId); } catch (e) {}
    }
  }

  function signBoxOpen() {
    const host = document.getElementById("account-signin-box");
    return !host || host.hidden !== true;
  }

  function render() {
    const slot = box();
    if (!slot || widgetId !== null || !window.turnstile || typeof window.turnstile.render !== "function") return;
    if (!signBoxOpen()) return;
    slot.hidden = false;
    widgetId = window.turnstile.render(slot, {
      sitekey: siteKey,
      callback: function (value) { token = String(value || ""); },
      "expired-callback": clearToken,
      "error-callback": clearToken,
      "timeout-callback": clearToken
    });
  }

  function whenDomReady(fn) {
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", fn, { once: true });
    else fn();
  }

  window.BACaptcha = {
    token: function () { return token; },
    reset: reset
  };

  function arm() {
    whenDomReady(function () {
      const host = document.getElementById("account-signin-box");
      if (host && window.MutationObserver) {
        const watch = new MutationObserver(function () { render(); });
        watch.observe(host, { attributes: true, attributeFilter: ["hidden"] });
      }
      render();
    });
  }

  const script = document.createElement("script");
  script.src = SCRIPT_SRC;
  script.async = true;
  script.addEventListener("load", arm);
  document.head.appendChild(script);
})();
