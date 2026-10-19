(function () {
  const CODE = /^[0-9]{6}$/;
  let mounted = false;
  let factorId = "";
  let challengeId = "";
  let busy = false;
  let generation = 0;

  function client() {
    return window.ScrollAuth && window.ScrollAuth.getClient && window.ScrollAuth.getClient();
  }

  function signedIn() {
    return window.ScrollAuth && window.ScrollAuth.getUser && window.ScrollAuth.getUser();
  }

  function node(id) {
    return document.getElementById(id);
  }

  function say(text) {
    const note = node("account-mfa-note");
    if (!note) return;
    note.textContent = text || "";
    note.hidden = !text;
  }

  function showSecret(text) {
    const secret = node("account-mfa-secret");
    if (!secret) return;
    secret.textContent = text || "";
    secret.hidden = !text;
  }

  function showForm(on) {
    const form = node("account-mfa-form");
    if (form) form.hidden = !on;
  }

  function showStart(on) {
    const start = node("account-mfa-start");
    if (start) start.hidden = !on;
  }

  function showRoot(on) {
    const root = node("account-mfa");
    if (root) root.hidden = !on;
  }

  function verifiedTotp(data) {
    const rows = data && Array.isArray(data.totp) ? data.totp : [];
    return rows.filter(function (row) { return row && row.status === "verified" && row.id; });
  }

  function pendingTotp(data) {
    const rows = data && Array.isArray(data.all) ? data.all : [];
    return rows.filter(function (row) {
      return row && row.id && row.factor_type === "totp" && row.status !== "verified";
    });
  }

  function still(gen) {
    return gen === generation && signedIn();
  }

  function beginChallenge(db, id) {
    factorId = id;
    return db.auth.mfa.challenge({ factorId: id }).then(function (res) {
      if (!res || res.error || !res.data || !res.data.id) {
        say("The authenticator challenge could not be started.");
        return;
      }
      challengeId = res.data.id;
      showStart(false);
      showForm(true);
      say("Enter the 6-digit code from your authenticator app.");
      const field = node("account-mfa-code");
      if (field) field.focus();
    });
  }

  function showEnrolled() {
    factorId = "";
    challengeId = "";
    showSecret("");
    showForm(false);
    showStart(false);
    say("An authenticator app is on for this account. Operator tools require its code.");
  }

  function showOffer() {
    showForm(false);
    showStart(true);
    say("Add an authenticator app. After it is verified, operator tools on this account require the code.");
  }

  function refresh() {
    const root = node("account-mfa");
    const db = client();
    const gen = generation + 1;
    generation = gen;
    if (!root || !db || !signedIn()) {
      showRoot(false);
      return;
    }
    showRoot(true);
    db.auth.mfa.getAuthenticatorAssuranceLevel().then(function (level) {
      if (!still(gen)) return;
      if (!level || level.error || !level.data) {
        say("The authenticator check could not be read.");
        return;
      }
      if (level.data.nextLevel === "aal2" && level.data.currentLevel !== "aal2") {
        return db.auth.mfa.listFactors().then(function (listed) {
          if (!still(gen)) return;
          const ready = verifiedTotp(listed && listed.data);
          if (!ready.length) {
            showOffer();
            return;
          }
          return beginChallenge(db, ready[0].id);
        });
      }
      return db.auth.mfa.listFactors().then(function (listed) {
        if (!still(gen)) return;
        if (verifiedTotp(listed && listed.data).length) showEnrolled();
        else showOffer();
      });
    }).catch(function () {
      if (still(gen)) say("The authenticator check could not be read.");
    });
  }

  function onStart() {
    const db = client();
    if (!db || busy) return;
    busy = true;
    db.auth.mfa.listFactors().then(function (listed) {
      const pending = pendingTotp(listed && listed.data);
      return pending.reduce(function (chain, row) {
        return chain.then(function () { return db.auth.mfa.unenroll({ factorId: row.id }); });
      }, Promise.resolve());
    }).then(function () {
      return db.auth.mfa.enroll({ factorType: "totp", friendlyName: "Shelf authenticator" });
    }).then(function (res) {
      if (!res || res.error || !res.data || !res.data.id || !res.data.totp) {
        say("The authenticator could not be started.");
        return;
      }
      factorId = res.data.id;
      showSecret("Enter this secret in your authenticator app: " + String(res.data.totp.secret || ""));
      return beginChallenge(db, factorId);
    }).catch(function () {
      say("The authenticator could not be started.");
    }).then(function () {
      busy = false;
    });
  }

  function onSubmit(event) {
    event.preventDefault();
    const db = client();
    const field = node("account-mfa-code");
    const code = field ? String(field.value || "").trim() : "";
    if (!db || busy || !factorId || !challengeId) return;
    if (!CODE.test(code)) {
      say("Enter the 6-digit code from the app.");
      return;
    }
    busy = true;
    db.auth.mfa.verify({ factorId: factorId, challengeId: challengeId, code: code }).then(function (res) {
      if (!res || res.error) {
        say("That code was not accepted.");
        return db.auth.mfa.challenge({ factorId: factorId }).then(function (next) {
          if (next && next.data && next.data.id) challengeId = next.data.id;
        });
      }
      if (field) field.value = "";
      showSecret("");
      say("The authenticator app is confirmed.");
      return db.auth.getSession();
    }).catch(function () {
      say("That code was not accepted.");
    }).then(function () {
      busy = false;
      refresh();
    });
  }

  function mount() {
    if (mounted || !node("account-mfa")) return;
    mounted = true;
    const form = node("account-mfa-form");
    const start = node("account-mfa-start");
    if (form) form.addEventListener("submit", onSubmit);
    if (start) start.addEventListener("click", onStart);
    if (window.ScrollAuth && typeof window.ScrollAuth.onChange === "function") {
      window.ScrollAuth.onChange(refresh);
    }
    if (window.ScrollAuth && typeof window.ScrollAuth.ready === "function") {
      window.ScrollAuth.ready().then(refresh, refresh);
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", mount, { once: true });
  else mount();
})();
