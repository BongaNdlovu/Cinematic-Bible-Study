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
    await this.load();
    const body = await request.json();
    const ok = allow(this.store, String(body.ip || "0"), String(body.path || "/"), Date.now());
    const buckets = {};
    this.store.forEach((value, key) => { buckets[key] = value; });
    await this.state.storage.put("buckets", buckets);
    return Response.json({ ok: ok });
  }
}

export default {
  async fetch() {
    return new Response("exhibit rate gate");
  }
};
