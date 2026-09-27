(function () {
  const NEXT_KEY = "baTermsNext";
  const HUB = "account.html";

  function journey() {
    return window.BAJourney;
  }

  function hasAgreed() {
    const J = journey();
    return !!(J && typeof J.hasAcceptedTerms === "function" && J.hasAcceptedTerms());
  }

  function canEnter() {
    return true;
  }

  function accountUrl() {
    return new URL(HUB, location.href).href.replace(/[?#].*$/, "");
  }

  function isAccountPage() {
    const file = (location.pathname.split("/").pop() || "").split("?")[0];
    return file === "account.html" || file === "account";
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

  function sameOriginPath(raw) {
    if (!raw) return null;
    try {
      const dest = new URL(raw, location.href);
      if (dest.origin !== location.origin) return null;
      const file = (dest.pathname.split("/").pop() || "").split("?")[0];
      if (file === "account.html" || file === "account") return null;
      return dest.pathname + dest.search + dest.hash;
    } catch (e) {
      return null;
    }
  }

  function goToAccount(next) {
    const dest = sameOriginPath(next) || sameOriginPath(location.pathname + location.search + location.hash);
    if (dest) rememberNext(dest);
    if (isAccountPage()) return;
    const url = new URL(accountUrl());
    if (dest) url.searchParams.set("next", dest);
    location.assign(url.href);
  }

  function requestSignIn(next) {
    goToAccount(next);
  }

  function continueIfReady() {
    const dest = sameOriginPath(takeNext());
    if (!dest) return false;
    const here = location.pathname + location.search + location.hash;
    if (dest !== here) location.assign(dest);
    return true;
  }

  window.ScrollTerms = {
    goToAccount: goToAccount,
    rememberNext: rememberNext,
    takeNext: takeNext,
    sameOriginPath: sameOriginPath,
    isAccountPage: isAccountPage,
    accountUrl: accountUrl,
    continueIfReady: continueIfReady,
    requestSignIn: requestSignIn,
    hasAgreed: hasAgreed,
    canEnter: canEnter,
    syncLock: function () {},
    syncError: function () {},
    setBusy: function () {}
  };
})();
