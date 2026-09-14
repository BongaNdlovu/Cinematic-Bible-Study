(function () {
  const cfg = window.BAAuthConfig || {};
  const listeners = [];
  let client = null;
  let user = null;

  function configured() {
    return !!(cfg.url && cfg.publishableKey && window.supabase && typeof window.supabase.createClient === "function");
  }

  function displayName(u) {
    if (!u) return "";
    const meta = u.user_metadata || {};
    return meta.full_name || meta.name || u.email || "Signed in";
  }

  function persistIdentity(nextUser) {
    if (!window.BAJourney || typeof window.BAJourney.save !== "function") return;
    if (!nextUser) {
      window.BAJourney.save({ identity: null });
      return;
    }
    window.BAJourney.save({
      identity: {
        id: nextUser.id || "",
        email: nextUser.email || "",
        name: displayName(nextUser)
      }
    });
  }

  function setUser(next) {
    user = next || null;
    persistIdentity(user);
    listeners.forEach(function (fn) {
      try { fn(user); } catch (err) {}
    });
    renderAll();
  }

  function redirectTo() {
    return window.location.origin + window.location.pathname;
  }

  function signInGoogle() {
    if (!client) return Promise.resolve();
    return client.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: redirectTo() }
    });
  }

  function signOut() {
    if (!client) return Promise.resolve();
    return client.auth.signOut();
  }

  function getUser() {
    return user;
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
    return "auth-btn " + extra;
  }

  function renderSlot(root) {
    if (!root) return;
    root.innerHTML = "";
    if (!configured()) return;
    if (user) {
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
      return;
    }
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = buttonClass(root, "auth-google");
    btn.textContent = "Continue with Google";
    btn.addEventListener("click", function () { signInGoogle(); });
    root.appendChild(btn);
  }

  function renderAll() {
    document.querySelectorAll("[data-auth-slot]").forEach(renderSlot);
  }

  function init() {
    if (!configured()) return;
    client = window.supabase.createClient(cfg.url, cfg.publishableKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        flowType: "pkce"
      }
    });
    client.auth.onAuthStateChange(function (_event, session) {
      setUser(session && session.user ? session.user : null);
    });
    client.auth.getSession().then(function (res) {
      const session = res && res.data && res.data.session;
      setUser(session && session.user ? session.user : null);
    });
  }

  window.ScrollAuth = {
    signInGoogle: signInGoogle,
    signOut: signOut,
    getUser: getUser,
    onChange: onChange,
    renderAll: renderAll
  };

  init();
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", renderAll);
  } else {
    renderAll();
  }
})();
