import { decide } from "./rate-gate.js";

export class ExhibitRateGate {
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

export default {
  async fetch() {
    return new Response("exhibit rate gate");
  }
};
