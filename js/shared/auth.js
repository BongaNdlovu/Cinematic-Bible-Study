(function () {
  const cfg = window.BAAuthConfig || {};
  const listeners = [];
  let client = null;
  let user = null;
  let accessToken = "";
  let signingIn = false;
  let readySettled = false;
  let readyResolve = function () {};
  const readyPromise = new Promise(function (resolve) {
    readyResolve = resolve;
  });

  function markReady() {
    if (readySettled) return;
    readySettled = true;
    readyResolve();
  }

  function configured() {
    return !!(cfg.url && cfg.publishableKey && window.supabase && typeof window.supabase.createClient === "function");
  }

  function displayName(u) {
    if (!u) return "";
    const meta = u.user_metadata || {};
    return meta.full_name || meta.name || u.email || "Signed in";
  }

  function addEmail(out, value) {
    const email = String(value || "").trim().toLowerCase();
    if (!email || email.indexOf("@") < 1 || out.indexOf(email) >= 0) return;
    out.push(email);
  }

  function emailsFromPayload(token) {
    const found = [];
    if (!token || typeof token !== "string") return found;
    const parts = token.split(".");
    if (parts.length < 2) return found;
    try {
      const json = JSON.parse(atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")));
      addEmail(found, json && json.email);
      addEmail(found, json && json.user_metadata && json.user_metadata.email);
      addEmail(found, json && json.app_metadata && json.app_metadata.email);
    } catch (err) {}
    return found;
  }

  function accountEmails(u, token) {
    const found = emailsFromPayload(token);
    if (!u) return found;
    addEmail(found, u.email);
    const meta = u.user_metadata || {};
    addEmail(found, meta.email);
    const app = u.app_metadata || {};
    addEmail(found, app.email);
    const ids = u.identities || [];
    for (let i = 0; i < ids.length; i++) {
      const identity = ids[i] || {};
      addEmail(found, identity.email);
      const data = identity.identity_data || {};
      addEmail(found, data.email);
      addEmail(found, data.email_address);
    }
    return found;
  }

  function persistIdentity(nextUser) {
    if (!window.BAJourney || typeof window.BAJourney.save !== "function") return;
    if (!nextUser) {
      window.BAJourney.save({ identity: null });
      return;
    }
    const emails = accountEmails(nextUser, accessToken);
    window.BAJourney.save({
      identity: {
        id: nextUser.id || "",
        email: emails[0] || nextUser.email || "",
        name: displayName(nextUser)
      }
    });
  }

  function reportError(message, kind) {
    if (window.SiteErrors) window.SiteErrors.show(message, kind || "auth");
  }

  function clearError() {
    if (window.SiteErrors) window.SiteErrors.clear();
  }

  function friendlyAuthError(err) {
    const code = String((err && (err.code || err.error || err.name)) || "").toLowerCase();
    const raw = String((err && (err.message || err.error_description || err.msg)) || "").replace(/\+/g, " ");
    if (code === "access_denied" || /cancel/i.test(raw)) {
      return "Sign-in was cancelled. Agree to the terms, then sign in to continue.";
    }
    if (code === "invalid_request" || /redirect/i.test(raw)) {
      return "Sign-in could not return to this page. Try again in a moment.";
    }
    if (/network|fetch|failed to fetch|offline/i.test(raw + " " + code)) {
      return "Sign-in could not start. Check your connection and try again.";
    }
    if (code === "session" || /session/i.test(raw)) {
      return "Your session ended. Sign in again to continue.";
    }
    return "Sign-in failed. Agree to the terms, then try again.";
  }

  function consumeUrlError() {
    const query = new URLSearchParams(location.search || "");
    const hash = new URLSearchParams((location.hash || "").replace(/^#/, "").replace(/^\/?/, ""));
    const code = query.get("error") || hash.get("error") || query.get("error_code") || hash.get("error_code");
    const desc = query.get("error_description") || hash.get("error_description");
    if (!code && !desc) return;
    reportError(friendlyAuthError({ code: code, message: desc || code }), "auth");
    ["error", "error_description", "error_code"].forEach(function (key) {
      query.delete(key);
      hash.delete(key);
    });
    const nextSearch = query.toString();
    const nextHash = hash.toString();
    const url = location.pathname + (nextSearch ? "?" + nextSearch : "") + (nextHash ? "#" + nextHash : "");
    try { history.replaceState({}, "", url); } catch (e) {}
  }

  function setUser(next, session) {
    user = next || null;
    accessToken = session && session.access_token ? session.access_token : "";
    if (user && window.BAJourney && typeof window.BAJourney.commitPendingTerms === "function") {
      window.BAJourney.commitPendingTerms(user.id);
    }
    persistIdentity(user);
    if (user) clearError();
    listeners.forEach(function (fn) {
      try { fn(user); } catch (err) {}
    });
    renderAll();
    if (window.ScrollTerms && typeof window.ScrollTerms.syncLock === "function") {
      window.ScrollTerms.syncLock();
    }
  }

  function redirectTo() {
    return window.location.origin + window.location.pathname;
  }

  const AUTH_PER_HOUR = 5;
  const AUTH_WIN = "baAuthStarts";

  function takeAuthSlot() {
    const now = Date.now();
    let times = [];
    try {
      times = JSON.parse(localStorage.getItem(AUTH_WIN) || "[]");
      if (!Array.isArray(times)) times = [];
    } catch (e) { times = []; }
    times = times.filter(function (t) { return now - t < 3600000; });
    if (times.length >= AUTH_PER_HOUR) return false;
    times.push(now);
    try { localStorage.setItem(AUTH_WIN, JSON.stringify(times)); } catch (e) {}
    return true;
  }

  function signIn() {
    if (!configured() || !client) {
      reportError("Sign-in is unavailable on this copy of the site.", "auth");
      return Promise.resolve({ error: new Error("not configured") });
    }
    if (typeof navigator !== "undefined" && navigator.onLine === false) {
      reportError("You appear to be offline. Sign-in needs a connection.", "offline");
      return Promise.resolve({ error: new Error("offline") });
    }
    if (signingIn) {
      return Promise.resolve({ error: new Error("busy") });
    }
    if (!takeAuthSlot()) {
      reportError("Please wait before signing in again.", "auth");
      return Promise.resolve({ error: new Error("rate_limit") });
    }
    clearError();
    signingIn = true;
    renderAll();
    if (window.ScrollTerms && typeof window.ScrollTerms.setBusy === "function") {
      window.ScrollTerms.setBusy(true);
    }
    return client.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: redirectTo() }
    }).then(function (res) {
      signingIn = false;
      if (res && res.error) reportError(friendlyAuthError(res.error), "auth");
      renderAll();
      const redirected = !!(res && res.data && res.data.url && !(res && res.error));
      if (!redirected && window.ScrollTerms && typeof window.ScrollTerms.setBusy === "function") {
        window.ScrollTerms.setBusy(false);
      }
      return res;
    }).catch(function (err) {
      signingIn = false;
      reportError(friendlyAuthError(err), "auth");
      renderAll();
      if (window.ScrollTerms && typeof window.ScrollTerms.setBusy === "function") {
        window.ScrollTerms.setBusy(false);
      }
      return { error: err };
    });
  }

  function signOut() {
    if (!client) {
      reportError("You could not be signed out. Refresh and try again.", "auth");
      return Promise.resolve({ error: new Error("not configured") });
    }
    clearError();
    return client.auth.signOut().then(function (res) {
      if (res && res.error) reportError(friendlyAuthError(res.error), "auth");
      return res;
    }).catch(function (err) {
      reportError(friendlyAuthError(err), "auth");
      return { error: err };
    });
  }

  function getUser() {
    return user;
  }

  function getClient() {
    return client;
  }

  function isModerator() {
    const allowed = Array.isArray(cfg.moderatorEmails) ? cfg.moderatorEmails : [];
    const have = accountEmails(user, accessToken);
    if (!allowed.length || !have.length) return false;
    return have.some(function (email) {
      return allowed.some(function (item) {
        return String(item || "").toLowerCase() === email;
      });
    });
  }

  function onChange(fn) {
    if (typeof fn === "function") listeners.push(fn);
    return function () {
      const i = listeners.indexOf(fn);
      if (i >= 0) listeners.splice(i, 1);
    };
  }

  function buttonClass(root, extra) {
    const variant = (root && root.getAttribute("data-auth-variant")) || "nav";
    if (variant === "study") return "header-read-btn auth-btn " + extra;
    if (variant === "access") return "px-5 py-2.5 rounded bg-amber-600 text-paper-50 font-sans text-sm font-semibold auth-btn " + extra;
    if (variant === "dash") return "dash-auth-out auth-btn " + extra;
    return "auth-btn " + extra;
  }

  function renderSlot(root) {
    if (!root) return;
    root.innerHTML = "";
    if (!user) return;
    const variant = (root && root.getAttribute("data-auth-variant")) || "nav";
    if (variant === "dash") {
      const wrap = document.createElement("div");
      wrap.className = "dash-auth-user";
      const avatar = document.createElement("span");
      avatar.className = "dash-auth-avatar";
      avatar.textContent = (displayName(user)[0] || "?").toUpperCase();
      const meta = document.createElement("div");
      meta.className = "dash-auth-meta";
      const name = document.createElement("span");
      name.className = "dash-auth-name";
      name.textContent = displayName(user);
      const out = document.createElement("button");
      out.type = "button";
      out.className = buttonClass(root, "auth-sign-out");
      out.textContent = "Sign out";
      out.addEventListener("click", function () { signOut(); });
      meta.appendChild(name);
      meta.appendChild(out);
      wrap.appendChild(avatar);
      wrap.appendChild(meta);
      root.appendChild(wrap);
      return;
    }
    const wrap = document.createElement("span");
    wrap.className = "auth-signed-in";
    const name = document.createElement("span");
    name.className = "auth-name";
    name.textContent = displayName(user);
    const out = document.createElement("button");
    out.type = "button";
    out.className = buttonClass(root, "auth-sign-out");
    out.textContent = "Sign out";
    out.addEventListener("click", function () { signOut(); });
    wrap.appendChild(name);
    wrap.appendChild(out);
    root.appendChild(wrap);
  }

  function renderAll() {
    document.querySelectorAll("[data-auth-slot]").forEach(renderSlot);
    if (document.body) document.body.classList.toggle("is-admin", isModerator());
  }

  function init() {
    consumeUrlError();
    if (!configured()) {
      reportError("Sign-in is unavailable on this copy of the site.", "auth");
      markReady();
      return;
    }
    client = window.supabase.createClient(cfg.url, cfg.publishableKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        flowType: "pkce",
        storage: window.localStorage
      }
    });
    client.auth.onAuthStateChange(function (event, session) {
      if (event === "SIGNED_OUT") {
        setUser(null, null);
        return;
      }
      setUser(session && session.user ? session.user : null, session);
    });
    client.auth.getSession().then(function (res) {
      if (res && res.error) reportError(friendlyAuthError(res.error), "auth");
      const session = res && res.data && res.data.session;
      setUser(session && session.user ? session.user : null, session);
    }).catch(function (err) {
      reportError(friendlyAuthError(err), "auth");
      setUser(null, null);
    }).then(function () {
      markReady();
    });
    setTimeout(markReady, 8000);
  }

  window.ScrollAuth = {
    signIn: signIn,
    signInGoogle: signIn,
    signOut: signOut,
    getUser: getUser,
    getClient: getClient,
    displayName: function () { return displayName(user); },
    isModerator: isModerator,
    isAdmin: isModerator,
    ready: function () { return readyPromise; },
    onChange: onChange,
    renderAll: renderAll,
    isConfigured: configured,
    isSigningIn: function () { return signingIn; },
    takeAuthSlot: takeAuthSlot
  };

  init();
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", renderAll);
  } else {
    renderAll();
  }
})();
