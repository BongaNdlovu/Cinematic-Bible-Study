(function () {
  const TABLE = "exhibit_events";
  const QUEUE_KEY = "baOpsQueue";
  const MAX_QUEUE = 20;
  let flushing = false;

  function hasAnalyticsConsent() {
    return !!(window.SODConsent && typeof window.SODConsent.has === "function" && window.SODConsent.has("analytics"));
  }

  function newId() {
    if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
    return "a_" + Date.now().toString(36);
  }

  function anonId() {
    const consented = hasAnalyticsConsent();
    const key = consented ? "baInsightsAnon" : "baOpsAnon";
    try {
      const store = consented ? localStorage : sessionStorage;
      const existing = store.getItem(key);
      if (existing) return existing;
      const id = newId();
      store.setItem(key, id);
      return id;
    } catch (e) {
      return "edge-rate-limit";
    }
  }

  function readQueue() {
    try {
      const q = JSON.parse(sessionStorage.getItem(QUEUE_KEY) || "[]");
      return Array.isArray(q) ? q : [];
    } catch (e) {
      return [];
    }
  }

  function writeQueue(q) {
    try { sessionStorage.setItem(QUEUE_KEY, JSON.stringify(q.slice(-MAX_QUEUE))); } catch (e) {}
  }

  function report(event, reason, extra) {
    if (!event) return;
    const q = readQueue();
    const info = extra || {};
    q.push({
      event: String(event).slice(0, 40),
      reason: String(reason || "unknown").slice(0, 40),
      page: (typeof location !== "undefined" && location.pathname) ? location.pathname.slice(0, 60) : "",
      ms: typeof info.ms === "number" ? info.ms : null,
      cause: info.cause ? String(info.cause).slice(0, 40) : ""
    });
    writeQueue(q);
    flush();
  }

  function flush() {
    if (flushing) return Promise.resolve();
    const auth = window.ScrollAuth;
    const client = auth && auth.getClient && auth.getClient();
    const user = auth && auth.getUser && auth.getUser();
    const queued = readQueue();
    if (!client || !queued.length) return Promise.resolve();
    flushing = true;
    const batch = queued.slice(0, 10);
    const pass = window.HumanPass;
    const send = function () {
      return client.from(TABLE).insert(batch.map(function (row) {
        return {
          event: row.event,
          anon_id: anonId(),
          page: row.page,
          detail: { reason: row.reason, ms: row.ms, cause: row.cause },
          user_id: user ? user.id : null
        };
      }));
    };
    const sent = user || !pass || typeof pass.ready !== "function"
      ? Promise.resolve(send())
      : pass.ready().then(function (isHuman) { return isHuman ? send() : { error: { message: "human_check" } }; });
    return sent.then(function (res) {
      if (res && !res.error) writeQueue(readQueue().slice(batch.length));
    }).catch(function () {}).then(function () {
      flushing = false;
    });
  }

  if (typeof window !== "undefined") {
    window.addEventListener("online", flush);
    setInterval(flush, 10000);
  }

  window.SiteOps = { report: report, flush: flush, anonId: anonId };
})();
