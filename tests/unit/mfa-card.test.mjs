import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const SRC = fs.readFileSync(new URL("../../js/shared/mfa.js", import.meta.url), "utf8");

function el(hidden) {
  return { hidden, textContent: "", value: "", addEventListener() {}, focus() {} };
}

async function mount({ rpc, user = { id: "u1" }, factors = [] }) {
  const nodes = {
    "account-mfa": el(true), "account-mfa-note": el(true), "account-mfa-secret": el(true),
    "account-mfa-form": el(true), "account-mfa-start": el(false), "account-mfa-code": el(false)
  };
  const calls = [];
  const db = {
    rpc(name) {
      calls.push(name);
      return typeof rpc === "function" ? rpc() : Promise.resolve(rpc);
    },
    auth: {
      mfa: {
        getAuthenticatorAssuranceLevel: () => Promise.resolve({ data: { currentLevel: "aal1", nextLevel: factors.length ? "aal2" : "aal1" } }),
        listFactors: () => Promise.resolve({ data: { totp: factors, all: factors } }),
        challenge: () => Promise.resolve({ data: { id: "ch1" } })
      }
    }
  };
  const window = {
    ScrollAuth: { getClient: () => db, getUser: () => user, onChange() {}, ready: () => Promise.resolve() }
  };
  const document = { readyState: "complete", getElementById: (id) => nodes[id] || null, addEventListener() {} };
  vm.runInNewContext(SRC, { window, document, Promise });
  await new Promise((r) => setTimeout(r, 20));
  return { nodes, calls, shown: nodes["account-mfa"].hidden === false, note: nodes["account-mfa-note"].textContent };
}

test("a moderator-list account sees the card", async () => {
  const r = await mount({ rpc: { data: true, error: null } });
  assert.equal(r.shown, true);
  assert.deepEqual(r.calls, ["exhibit_shows_authenticator"]);
  assert.doesNotMatch(r.note, /operator|moderator/i);
});

test("a moderator with a factor is asked for the code", async () => {
  const r = await mount({ rpc: { data: true, error: null }, factors: [{ id: "f1", status: "verified", factor_type: "totp" }] });
  assert.equal(r.shown, true);
  assert.equal(r.nodes["account-mfa-form"].hidden, false);
});

for (const [name, rpc] of [
  ["a reader", { data: false, error: null }],
  ["an rpc error", { data: null, error: { message: "missing" } }],
  ["a network failure", () => Promise.reject(new Error("net"))],
  ["a non-boolean answer", { data: "true", error: null }]
]) {
  test(`${name} keeps the card hidden`, async () => {
    const r = await mount({ rpc });
    assert.equal(r.shown, false);
    assert.equal(r.note, "");
  });
}

test("a signed-out visitor never triggers the check", async () => {
  const r = await mount({ rpc: { data: true, error: null }, user: null });
  assert.equal(r.shown, false);
  assert.deepEqual(r.calls, []);
});
