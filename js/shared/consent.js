(function () {
  const KEY = 'sodConsent';
  const EVENT = 'sod:consent';
  const VERSION = 1;
  let memory = null;
  let banner = null;

  function parse(raw) {
    const r = JSON.parse(raw);
    if (!r || r.v !== VERSION || typeof r.analytics !== 'boolean') return null;
    return { analytics: r.analytics, ts: Number(r.ts) || 0, v: VERSION };
  }

  function get() {
    try {
      const raw = localStorage.getItem(KEY);
      return raw ? parse(raw) : null;
    } catch (e) {
      return memory;
    }
  }

  function store(rec) {
    memory = rec;
    try { localStorage.setItem(KEY, JSON.stringify(rec)); } catch (e) {}
  }

  function has(name) {
    if (name === 'essential') return true;
    const rec = get();
    return !!(rec && rec[name] === true);
  }

  function set(choice) {
    const prev = get();
    const rec = { analytics: !!(choice && choice.analytics), ts: Date.now(), v: VERSION };
    store(rec);
    if (!prev || prev.analytics !== rec.analytics) {
      window.dispatchEvent(new CustomEvent(EVENT, { detail: rec }));
    }
    return rec;
  }

  function privacySignal() {
    try {
      if (navigator.globalPrivacyControl === true) return true;
      return (navigator.doNotTrack || window.doNotTrack || navigator.msDoNotTrack) === '1';
    } catch (e) {
      return false;
    }
  }

  function template() {
    return '<div class="sod-consent-inner">' +
      '<button type="button" class="sod-close" data-sod-action="close" aria-label="Close without choosing">&times;</button>' +
      '<div class="sod-main">' +
        '<p class="sod-text" id="sod-text">We use anonymous study analytics and Cloudflare Web Analytics only if you accept. Sign-in, progress and your preferences work either way. Read our <a href="privacy.html">Privacy Policy</a> and <a href="terms.html">Terms</a>.</p>' +
        '<div class="sod-actions">' +
          '<button type="button" class="sod-btn" data-sod-action="accept">Accept analytics</button>' +
          '<button type="button" class="sod-btn" data-sod-action="reject">Reject</button>' +
          '<button type="button" class="sod-btn" data-sod-action="settings" aria-expanded="false" aria-controls="sod-settings">Settings</button>' +
        '</div>' +
      '</div>' +
      '<div class="sod-settings" id="sod-settings" hidden>' +
        '<p class="sod-text">Choose which optional storage to allow. You can change this at any time from Cookie settings in the footer.</p>' +
        '<div class="sod-row"><span class="sod-label">Essential storage (sign-in, progress, preferences)</span><span class="sod-always">Always on</span></div>' +
        '<label class="sod-row sod-toggle"><span class="sod-label">Anonymous study analytics and Cloudflare Web Analytics</span><input type="checkbox" id="sod-analytics" role="switch"></label>' +
        '<div class="sod-actions"><button type="button" class="sod-btn" data-sod-action="save">Save choices</button></div>' +
      '</div>' +
    '</div>';
  }

  function ensureBanner() {
    if (banner) return banner;
    banner = document.createElement('section');
    banner.id = 'sod-consent';
    banner.className = 'sod-consent';
    banner.setAttribute('role', 'dialog');
    banner.setAttribute('aria-label', 'Cookie and storage choices');
    banner.setAttribute('aria-describedby', 'sod-text');
    banner.hidden = true;
    banner.innerHTML = template();
    document.body.appendChild(banner);
    banner.addEventListener('click', onClick);
    return banner;
  }

  function showSettings(on) {
    const rec = get();
    const main = banner.querySelector('.sod-main');
    const panel = document.getElementById('sod-settings');
    const box = document.getElementById('sod-analytics');
    box.checked = !!(rec && rec.analytics);
    main.hidden = on;
    panel.hidden = !on;
    banner.querySelector('[data-sod-action="settings"]').setAttribute('aria-expanded', String(on));
    if (on) box.focus();
  }

  function show(withSettings) {
    ensureBanner();
    banner.hidden = false;
    showSettings(!!withSettings);
  }

  function hide() {
    if (!banner) return;
    const hadFocus = banner.contains(document.activeElement);
    banner.hidden = true;
    if (hadFocus) {
      const link = document.getElementById('sod-settings-link');
      if (link) link.focus({ preventScroll: true });
    }
  }

  function choose(analytics) {
    set({ analytics: analytics });
    hide();
  }

  function onClick(ev) {
    const btn = ev.target.closest && ev.target.closest('[data-sod-action]');
    if (!btn) return;
    const action = btn.getAttribute('data-sod-action');
    if (action === 'accept') choose(true);
    else if (action === 'reject') choose(false);
    else if (action === 'save') choose(document.getElementById('sod-analytics').checked);
    else if (action === 'settings') showSettings(true);
    else if (action === 'close') hide();
  }

  function open() {
    if (document.body) show(true);
    else document.addEventListener('DOMContentLoaded', function () { show(true); }, { once: true });
  }

  function addFooterLink() {
    const footer = document.querySelector('footer');
    if (!footer || document.getElementById('sod-settings-link')) return;
    const link = document.createElement('button');
    link.type = 'button';
    link.id = 'sod-settings-link';
    link.className = 'sod-settings-link';
    link.textContent = 'Cookie settings';
    link.addEventListener('click', open);
    footer.appendChild(link);
  }

  if (!get() && privacySignal()) set({ analytics: false });

  document.addEventListener('DOMContentLoaded', function () {
    if (!get()) show(false);
  });

  document.addEventListener('keydown', function (ev) {
    if (ev.key !== 'Escape' || !banner || banner.hidden || !banner.contains(ev.target)) return;
    const panel = document.getElementById('sod-settings');
    if (panel && !panel.hidden) showSettings(false);
    else hide();
  });

  window.addEventListener('load', addFooterLink);

  window.SODConsent = {
    get: get,
    set: set,
    has: has,
    open: open
  };
})();
