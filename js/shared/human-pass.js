(function () {
  const SCRIPT_URL = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
  const ENDPOINT = "/__human-pass";
  const ACTION = "guest-pass";
  const UNTIL_PREFIX = "baHumanPass:";
  const RENEW_MARGIN_MS = 5 * 60 * 1000;
  const SOLVE_TIMEOUT_MS = 120000;
  let pending = null;
  let scriptLoad = null;

  function siteKey() {
    const cfg = window.BAAuthConfig;
    return cfg && typeof cfg.turnstileSiteKey === "string" ? cfg.turnstileSiteKey : "";
  }

  function signedIn() {
    const auth = window.ScrollAuth;
    return !!(auth && typeof auth.getUser === "function" && auth.getUser());
  }

  function guestIds() {
    const ids = [];
    const insights = window.Insights;
    const ops = window.SiteOps;
    const fromInsights = insights && typeof insights.anonId === "function" ? insights.anonId() : "";
    const fromOps = ops && typeof ops.anonId === "function" ? ops.anonId() : "";
    for (const id of [fromInsights, fromOps]) {
      if (!id || id === "edge-rate-limit") continue;
      if (ids.indexOf(id) >= 0) continue;
      ids.push(id);
    }
    return ids;
  }

  function untilFor(id) {
    try {
      return Number(sessionStorage.getItem(UNTIL_PREFIX + id)) || 0;
    } catch (e) {
      return 0;
    }
  }

  function missing(ids) {
    const cut = Date.now() + RENEW_MARGIN_MS;
    return ids.filter(function (id) { return untilFor(id) < cut; });
  }

  function loadScript() {
    if (window.turnstile) return Promise.resolve(window.turnstile);
    if (scriptLoad) return scriptLoad;
    scriptLoad = new Promise(function (resolve, reject) {
      const tag = document.createElement("script");
      tag.src = SCRIPT_URL;
      tag.async = true;
      tag.addEventListener("load", function () {
        if (window.turnstile) resolve(window.turnstile);
        else reject(new Error("turnstile_missing"));
      });
      tag.addEventListener("error", function () { reject(new Error("turnstile_load")); });
      document.head.appendChild(tag);
    });
    scriptLoad.catch(function () { scriptLoad = null; });
    return scriptLoad;
  }

  function solve() {
    const key = siteKey();
    if (!key) return Promise.reject(new Error("no_site_key"));
    return loadScript().then(function (turnstile) {
      return new Promise(function (resolve, reject) {
        const box = document.createElement("div");
        box.className = "human-pass-box";
        box.style.cssText = "position:fixed;left:16px;bottom:16px;z-index:9999;";
        document.body.appendChild(box);
        const done = function () { if (box.parentNode) box.parentNode.removeChild(box); };
        const timer = setTimeout(function () { done(); reject(new Error("turnstile_timeout")); }, SOLVE_TIMEOUT_MS);
        turnstile.render(box, {
          sitekey: key,
          action: ACTION,
          appearance: "interaction-only",
          callback: function (token) { clearTimeout(timer); done(); resolve(token); },
          "error-callback": function () { clearTimeout(timer); done(); reject(new Error("turnstile_error")); },
          "expired-callback": function () { clearTimeout(timer); done(); reject(new Error("turnstile_expired")); }
        });
      });
    });
  }

  function grant(token, ids) {
    return fetch(ENDPOINT, {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: token, ids: ids })
    }).then(function (res) {
      return res.ok ? res.json() : null;
    }).then(function (data) {
      const until = data && data.ok === true ? Date.parse(data.until) : NaN;
      if (!Number.isFinite(until)) return false;
      ids.forEach(function (id) {
        try { sessionStorage.setItem(UNTIL_PREFIX + id, String(until)); } catch (e) {}
      });
      return true;
    });
  }

  function ready() {
    if (signedIn()) return Promise.resolve(true);
    const need = missing(guestIds());
    if (!need.length) return Promise.resolve(true);
    if (pending) return pending;
    pending = solve().then(function (token) {
      return grant(token, need);
    }).catch(function () {
      return false;
    }).then(function (ok) {
      pending = null;
      return ok;
    });
    return pending;
  }

  window.HumanPass = { ready: ready, guestIds: guestIds, missing: missing };
})();
