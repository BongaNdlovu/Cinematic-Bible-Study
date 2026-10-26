import * as Sentry from "@sentry/cloudflare";
import { decide } from "./rate-gate.js";

const SENTRY_DSN = "https://fb62126576bb04e73c1be1d851791ab8@o4512321608679424.ingest.de.sentry.io/4512321650557008";

function sentryOptions(env) {
  return {
    dsn: (env && env.SENTRY_DSN) || SENTRY_DSN,
    tracesSampleRate: 1,
    dataCollection: { userInfo: false }
  };
}

class ExhibitRateGateBase {
  constructor() {
    this.store = new Map();
  }

  async fetch(request) {
    const body = await request.json();
    const ip = String(body.ip || "0");
    const path = String(body.path || "/");
    const verdict = decide(this.store, ip, path, Date.now());
    return Response.json({ ok: verdict.ok, first: verdict.first });
  }
}

export const ExhibitRateGate = Sentry.instrumentDurableObjectWithSentry(sentryOptions, ExhibitRateGateBase);

export default Sentry.withSentry(sentryOptions, {
  async fetch() {
    return new Response("exhibit rate gate");
  }
});
