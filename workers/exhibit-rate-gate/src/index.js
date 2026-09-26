import { allow } from "./rate-gate.js";

export class ExhibitRateGate {
  constructor(state) {
    this.state = state;
    this.store = new Map();
    this.loaded = false;
  }

  async load() {
    if (this.loaded) return;
    const saved = await this.state.storage.get("buckets");
    if (saved && typeof saved === "object") {
      Object.keys(saved).forEach((key) => {
        this.store.set(key, saved[key]);
      });
    }
    this.loaded = true;
  }

  async fetch(request) {
    const body = await request.json();
    const ip = String(body.ip || "0");
    const path = String(body.path || "/");
    const now = Date.now();
    const ok = await this.state.blockConcurrencyWhile(async () => {
      await this.load();
      const allowed = allow(this.store, ip, path, now);
      const buckets = {};
      this.store.forEach((value, key) => { buckets[key] = value; });
      await this.state.storage.put("buckets", buckets);
      return allowed;
    });
    return Response.json({ ok: ok });
  }
}

export default {
  async fetch() {
    return new Response("exhibit rate gate");
  }
};
