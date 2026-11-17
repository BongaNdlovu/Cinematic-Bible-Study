(function (root) {
  const ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]']);
  const FOCUSABLE = [
    'a[href]',
    'area[href]',
    'button:not([disabled])',
    'input:not([disabled]):not([type="hidden"])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
    '[contenteditable="true"]',
  ].join(', ');

  function escapeHtml(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, (ch) => ESCAPES[ch]);
  }

  function isLocalDevHost() {
    try {
      return LOCAL_HOSTS.has(location.hostname);
    } catch (e) {
      return false;
    }
  }

  function auth() {
    return root.ScrollAuth || null;
  }

  function currentUser() {
    const a = auth();
    if (!a || typeof a.getUser !== 'function') return null;
    try {
      return a.getUser() || null;
    } catch (e) {
      return null;
    }
  }

  function signedIn() {
    return !!currentUser();
  }

  function authClient() {
    const a = auth();
    if (!a || typeof a.getClient !== 'function') return null;
    try {
      return a.getClient() || null;
    } catch (e) {
      return null;
    }
  }

  function isShown(el) {
    if (el.hidden || el.closest('[hidden]')) return false;
    return el.getClientRects().length > 0;
  }

  function focusableIn(container) {
    if (!container) return [];
    return Array.from(container.querySelectorAll(FOCUSABLE)).filter(isShown);
  }

  function trapFocus(container, event) {
    if (!container || event.key !== 'Tab') return;
    const items = focusableIn(container);
    if (!items.length) return;
    const first = items[0];
    const last = items[items.length - 1];
    const active = document.activeElement;
    if (!container.contains(active)) {
      event.preventDefault();
      (event.shiftKey ? last : first).focus();
      return;
    }
    const wrapBack = event.shiftKey && active === first;
    const wrapForward = !event.shiftKey && active === last;
    if (!wrapBack && !wrapForward) return;
    event.preventDefault();
    (wrapBack ? last : first).focus();
  }

  root.SiteCore = Object.freeze({
    escapeHtml,
    isLocalDevHost,
    currentUser,
    signedIn,
    authClient,
    FOCUSABLE,
    focusableIn,
    trapFocus,
  });
})(typeof window !== 'undefined' ? window : globalThis);
