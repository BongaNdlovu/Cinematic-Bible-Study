/* SiteNet — the one gateway for app-driven fetches.
 *
 * Every request gets an explicit lifecycle instead of boolean flags:
 *   slow     → onSlow fires once past `slowMs` (default 4000) for "taking longer than usual"
 *   timeout  → aborted past `timeoutMs` (default 10000); classified, never spins forever
 *   offline  → fails immediately when navigator.onLine is false
 *   cancelled→ caller's own signal aborted (not an error worth showing)
 * Failures throw a SiteNetError with .kind, .status and .retryAfter so callers can
 * branch on the class (rate / auth / forbidden / server / client / network / timeout)
 * instead of parsing message strings. See classify() and message().
 */
(function () {
  const SLOW_MS = 4000;
  const TIMEOUT_MS = 10000;

  function SiteNetError(kind, status, retryAfter, cause) {
    const err = new Error(cause && cause.message ? cause.message : "request_failed");
    err.name = "SiteNetError";
    err.kind = kind;
    err.status = status || 0;
    err.retryAfter = retryAfter || 0;
    err.cause = cause || null;
    return err;
  }

  /* Combine an internal timeout controller with any caller-supplied signal. */
  function request(url, opts) {
    const options = opts || {};
    const timeoutMs = typeof options.timeoutMs === "number" ? options.timeoutMs : TIMEOUT_MS;
    const slowMs = typeof options.slowMs === "number" ? options.slowMs : SLOW_MS;
    const onSlow = typeof options.onSlow === "function" ? options.onSlow : null;

    if (navigator.onLine === false) {
      return Promise.reject(SiteNetError("offline", 0, 0, new Error("offline")));
    }

    const ctrl = new AbortController();
    let slowTimer = 0;
    let timeoutTimer = 0;
    let timedOut = false;
    let externallyAborted = false;

    const clearTimers = function () {
      if (slowTimer) { clearTimeout(slowTimer); slowTimer = 0; }
      if (timeoutTimer) { clearTimeout(timeoutTimer); timeoutTimer = 0; }
    };

    if (onSlow && slowMs > 0) {
      slowTimer = setTimeout(function () {
        slowTimer = 0;
        if (!ctrl.signal.aborted) onSlow();
      }, slowMs);
    }
    if (timeoutMs > 0) {
      timeoutTimer = setTimeout(function () {
        timeoutTimer = 0;
        timedOut = true;
        ctrl.abort();
      }, timeoutMs);
    }

    const forward = function () {
      externallyAborted = true;
      ctrl.abort();
    };
    const external = options.signal;
    if (external && typeof external.addEventListener === "function") {
      /* The caller cancelled before we even started — nothing to fetch. */
      if (external.aborted) {
        clearTimers();
        return Promise.reject(SiteNetError("cancelled", 0, 0, new Error("aborted")));
      }
      external.addEventListener("abort", forward);
    }

    const done = function () {
      clearTimers();
      if (external && typeof external.removeEventListener === "function") {
        external.removeEventListener("abort", forward);
      }
    };

    return fetch(url, {
      method: options.method || "GET",
      headers: options.headers || undefined,
      body: options.body === undefined ? undefined : options.body,
      credentials: options.credentials,
      signal: ctrl.signal
    }).then(function (res) {
      done();
      if (!res.ok) {
        const retryAfter = parseInt(res.headers && res.headers.get("retry-after"), 10);
        throw SiteNetError(classifyStatus(res.status), res.status, isFinite(retryAfter) ? retryAfter : 0);
      }
      return res;
    }, function (cause) {
      done();
      throw classifyThrow(cause, timedOut, externallyAborted);
    });
  }

  function classifyStatus(status) {
    if (status === 429) return "rate";
    if (status === 401) return "auth";
    if (status === 403) return "forbidden";
    if (status >= 500) return "server";
    if (status >= 400) return "client";
    return "badResponse";
  }

  function classifyThrow(cause, timedOut, externallyAborted) {
    const name = (cause && cause.name) || "";
    const msg = String((cause && (cause.message || cause)) || "");
    if (cause && cause.name === "SiteNetError") return cause;
    if (navigator.onLine === false) return SiteNetError("offline", 0, 0, cause);
    if (externallyAborted) return SiteNetError("cancelled", 0, 0, cause);
    if (timedOut || name === "TimeoutError") return SiteNetError("timeout", 0, 0, cause);
    if (name === "AbortError" || /abort/i.test(msg)) {
      return SiteNetError("cancelled", 0, 0, cause);
    }
    if (/failed to fetch|load failed|networkerror|network error|err_network/i.test(msg)) {
      return SiteNetError("network", 0, 0, cause);
    }
    return SiteNetError("client", 0, 0, cause);
  }

  /* Classify anything: a SiteNetError, a Supabase PostgrestError ({status, code,
     message}), or a raw Error. Returns one kind string. */
  function classify(err) {
    if (!err) return "client";
    if (err.name === "SiteNetError" && err.kind) return err.kind;
    if (typeof err === "number") return classifyStatus(err);
    if (navigator.onLine === false) return "offline";
    const status = Number(err.status) || (err.code === "429" ? 429 : 0);
    if (status === 429) return "rate";
    if (status === 401) return "auth";
    if (status === 403) return "forbidden";
    if (status >= 500) return "server";
    if (status >= 400) return "client";
    const code = String(err.code || "");
    if (code === "429" || /rate.?limit/i.test(code)) return "rate";
    if (code === "PGRST301" || /jwt.*(expired|invalid)/i.test(code + " " + (err.message || ""))) return "auth";
    const msg = String(err.message || err);
    if (err.name === "TimeoutError" || /TimeoutError|timed out/i.test(msg)) return "timeout";
    if (/failed to fetch|load failed|networkerror|abort/i.test(msg)) {
      return navigator.onLine === false ? "offline" : "network";
    }
    return "client";
  }

  /* Friendly copy per class. Each names the recovery, never a raw status. */
  const COPY = {
    offline: "You are offline. Your work is kept on this device — try again once the connection returns.",
    timeout: "This is taking too long and was stopped. Check your connection and try again.",
    network: "The connection dropped. Check your network and try again.",
    rate: "Too many attempts just now. Wait a short while, then try again.",
    auth: "Your session ended. Sign in again to continue.",
    forbidden: "This is not available on your current membership.",
    server: "The exhibit's service hiccuped. Try again in a minute.",
    client: "This could not be completed right now. Try again.",
    badResponse: "The answer came back incomplete. Try again.",
    cancelled: ""
  };

  function message(errOrKind) {
    const kind = typeof errOrKind === "string" ? errOrKind : classify(errOrKind);
    return COPY[kind] || COPY.client;
  }

  window.SiteNet = {
    request: request,
    classify: classify,
    message: message,
    SLOW_MS: SLOW_MS,
    TIMEOUT_MS: TIMEOUT_MS
  };
})();
