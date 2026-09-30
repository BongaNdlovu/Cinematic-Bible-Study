(function () {
  const cfg = window.BAAuthConfig || {};
  const listeners = [];
  // The moderator dashboard is limited to the site operator. This list must match
  // the SQL is_review_moderator() function (tools/supabase-reviews.sql), which the
  // database also enforces on every moderator read.
  const MODERATOR_EMAILS = ["fanelesibonge50@gmail.com"];
  let client = null;
  let user = null;
  let accessToken = "";
  let signingIn = false;
  let passwordRecovery = false;
  let moderator = false;
  let moderatorGen = 0;
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

  function isLocalDevHost() {
    try {
      const h = location.hostname;
      return h === "localhost" || h === "127.0.0.1" || h === "[::1]";
    } catch (e) {
      return false;
    }
  }

  /** Playwright QA only: localStorage.baQaMockSession = JSON { user, session? }. Ignored off localhost. */
  function readQaMock() {
    if (!isLocalDevHost()) return null;
    try {
      const raw = localStorage.getItem("baQaMockSession");
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed || !parsed.user || !parsed.user.id) return null;
      return parsed;
    } catch (e) {
      return null;
    }
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
    const errorKind = kind || "auth";
    if (window.SiteErrors) window.SiteErrors.show(message, errorKind);
    if (errorKind === "auth" && window.SiteOps && typeof window.SiteOps.report === "function") {
      window.SiteOps.report("auth_failed", "auth");
    }
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
    if (code === "invalid_credentials" || /invalid login|invalid credentials/i.test(raw)) {
      return "That email or password is not right.";
    }
    if (code === "email_not_confirmed" || /not confirmed/i.test(raw)) {
      return "Check your email and confirm the address, then sign in.";
    }
    if (code === "user_already_exists" || code === "email_exists" || /already registered|already exists/i.test(raw)) {
      return "That email already has an account. Sign in, or use Google.";
    }
    if (code === "weak_password" || (/password/i.test(raw) && /weak|least|characters/i.test(raw))) {
      return "Use a password with at least 8 characters.";
    }
    if (code === "session" || /session/i.test(raw)) {
      return "Your session ended. Sign in again to continue.";
    }
    if (/rate limit|over_email|too many/i.test(raw + " " + code)) {
      return "Please wait before trying again.";
    }
    return "Sign-in failed. Accept the terms, then try again.";
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
    return refreshModerator().then(function () {
      listeners.forEach(function (fn) {
        try { fn(user); } catch (err) {}
      });
      renderAll();
      if (window.ScrollTerms && typeof window.ScrollTerms.syncLock === "function") {
        window.ScrollTerms.syncLock();
      }
    });
  }

  function redirectTo() {
    if (window.ScrollTerms && typeof window.ScrollTerms.accountUrl === "function") {
      return window.ScrollTerms.accountUrl();
    }
    return new URL("account.html", window.location.href).href.replace(/[?#].*$/, "");
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

  function beginAuth() {
    if (!configured() || !client) {
      reportError("Sign-in is unavailable on this copy of the site.", "auth");
      return { error: new Error("not configured") };
    }
    if (typeof navigator !== "undefined" && navigator.onLine === false) {
      reportError("You appear to be offline. Sign-in needs a connection.", "offline");
      return { error: new Error("offline") };
    }
    if (signingIn) {
      return { error: new Error("busy") };
    }
    if (!takeAuthSlot()) {
      reportError("Please wait before signing in again.", "auth");
      return { error: new Error("rate_limit") };
    }
    clearError();
    signingIn = true;
    renderAll();
    if (window.ScrollTerms && typeof window.ScrollTerms.setBusy === "function") {
      window.ScrollTerms.setBusy(true);
    }
    return null;
  }

  function finishAuth(res, err) {
    signingIn = false;
    if (err) reportError(friendlyAuthError(err), "auth");
    else if (res && res.error) reportError(friendlyAuthError(res.error), "auth");
    renderAll();
    if (window.ScrollTerms && typeof window.ScrollTerms.setBusy === "function") {
      window.ScrollTerms.setBusy(false);
    }
    return err ? { error: err } : res;
  }

  function signIn() {
    const blocked = beginAuth();
    if (blocked) return Promise.resolve(blocked);
    return client.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: redirectTo() }
    }).then(function (res) {
      const redirected = !!(res && res.data && res.data.url && !(res && res.error));
      if (redirected) {
        signingIn = false;
        if (res && res.error) reportError(friendlyAuthError(res.error), "auth");
        renderAll();
        return res;
      }
      return finishAuth(res);
    }).catch(function (err) {
      return finishAuth(null, err);
    });
  }

  function signInEmail(email, password) {
    const blocked = beginAuth();
    if (blocked) return Promise.resolve(blocked);
    return client.auth.signInWithPassword({
      email: String(email || "").trim(),
      password: String(password || "")
    }).then(function (res) {
      return finishAuth(res);
    }).catch(function (err) {
      return finishAuth(null, err);
    });
  }

  function signUpEmail(email, password) {
    const blocked = beginAuth();
    if (blocked) return Promise.resolve(blocked);
    return client.auth.signUp({
      email: String(email || "").trim(),
      password: String(password || ""),
      options: { emailRedirectTo: redirectTo() }
    }).then(function (res) {
      return finishAuth(res);
    }).catch(function (err) {
      return finishAuth(null, err);
    });
  }

  function resetPassword(email) {
    const blocked = beginAuth();
    if (blocked) return Promise.resolve(blocked);
    return client.auth.resetPasswordForEmail(String(email || "").trim(), {
      redirectTo: redirectTo()
    }).then(function (res) {
      return finishAuth(res);
    }).catch(function (err) {
      return finishAuth(null, err);
    });
  }

  function updatePassword(password) {
    if (!configured() || !client) {
      reportError("Sign-in is unavailable on this copy of the site.", "auth");
      return Promise.resolve({ error: new Error("not configured") });
    }
    return client.auth.updateUser({ password: String(password || "") }).then(function (res) {
      if (res && !res.error) passwordRecovery = false;
      if (res && res.error) reportError(friendlyAuthError(res.error), "auth");
      return res;
    }).catch(function (err) {
      reportError(friendlyAuthError(err), "auth");
      return { error: err };
    });
  }

  function signOut() {
    try { localStorage.removeItem("baQaMockSession"); } catch (e) {}
    if (!client) {
      // QA mock path (no Supabase client) — drop the synthetic user and re-gate.
      setUser(null, null);
      return Promise.resolve({ data: null, error: null });
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

  function isModeratorEmail(nextUser) {
    if (!nextUser) return false;
    const emails = accountEmails(nextUser, accessToken);
    for (let i = 0; i < emails.length; i++) {
      if (MODERATOR_EMAILS.indexOf(emails[i]) >= 0) return true;
    }
    return false;
  }

  function refreshModerator() {
    const gen = moderatorGen + 1;
    moderatorGen = gen;
    moderator = isModeratorEmail(user);
    return Promise.resolve(moderator);
  }

  function isModerator() {
    return moderator;
  }

  function onChange(fn) {
    if (typeof fn === "function") listeners.push(fn);
    return function () {
      const i = listeners.indexOf(fn);
      if (i >= 0) listeners.splice(i, 1);
    };
  }

  function renderSlot(root) {
    if (!root) return;
    root.innerHTML = "";
    if (!user) return;
    const link = document.createElement("a");
    link.href = "account.html";
    link.className = "auth-account-link";
    link.textContent = displayName(user);
    root.appendChild(link);
  }

  function renderAll() {
    document.querySelectorAll("[data-auth-slot]").forEach(renderSlot);
    if (document.body) document.body.classList.toggle("is-admin", isModerator());
  }

  function init() {
    consumeUrlError();
    const qaMock = readQaMock();
    if (qaMock) {
      // Local Playwright / manual QA: inject a synthetic session without Google OAuth.
      client = null;
      setUser(qaMock.user, qaMock.session || { access_token: "qa-mock-token" }).then(markReady);
      return;
    }
    if (!configured()) {
      reportError("Sign-in is unavailable on this copy of the site.", "auth");
      markReady();
      return;
    }
    client = window.supabase.createClient(cfg.url, cfg.publishableKey, {
      global: {
        fetch: function (input, requestInit) {
          const next = requestInit ? Object.assign({}, requestInit) : {};
          if (!next.signal) next.signal = AbortSignal.timeout(8000);
          return fetch(input, next);
        }
      },
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        flowType: "pkce",
        storage: window.localStorage
      }
    });
    client.auth.onAuthStateChange(function (event, session) {
      if (event === "PASSWORD_RECOVERY") passwordRecovery = true;
      if (event === "SIGNED_OUT") {
        passwordRecovery = false;
        setUser(null, null);
        return;
      }
      setUser(session && session.user ? session.user : null, session);
    });
    client.auth.getSession().then(function (res) {
      if (res && res.error) reportError(friendlyAuthError(res.error), "auth");
      const session = res && res.data && res.data.session;
      return setUser(session && session.user ? session.user : null, session);
    }).catch(function (err) {
      reportError(friendlyAuthError(err), "auth");
      return setUser(null, null);
    }).then(function () {
      markReady();
    });
    setTimeout(markReady, 8000);
  }

  window.ScrollAuth = {
    signIn: signIn,
    signInGoogle: signIn,
    signInEmail: signInEmail,
    signUpEmail: signUpEmail,
    resetPassword: resetPassword,
    updatePassword: updatePassword,
    isPasswordRecovery: function () { return passwordRecovery; },
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
