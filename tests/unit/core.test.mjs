import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const source = fs.readFileSync(path.join(root, "js/core/core.js"), "utf8");

function load({ hostname = "endoftimeacademy.com", auth, active = null } = {}) {
  const window = {};
  if (auth !== undefined) window.ScrollAuth = auth;
  const document = { activeElement: active };
  const ctx = { window, location: { hostname }, document };
  vm.createContext(ctx);
  vm.runInContext(source, ctx);
  return { core: window.SiteCore, document };
}

test("escapeHtml escapes the five HTML-significant characters", () => {
  const { core } = load();
  assert.equal(core.escapeHtml(`<a href="x" title='y'>&</a>`), "&lt;a href=&quot;x&quot; title=&#39;y&#39;&gt;&amp;&lt;/a&gt;");
});

test("escapeHtml turns null and undefined into an empty string and keeps numbers", () => {
  const { core } = load();
  assert.equal(core.escapeHtml(null), "");
  assert.equal(core.escapeHtml(undefined), "");
  assert.equal(core.escapeHtml(0), "0");
  assert.equal(core.escapeHtml("plain text"), "plain text");
});

test("escapeHtml does not double-escape on a single pass", () => {
  const { core } = load();
  assert.equal(core.escapeHtml("&amp;"), "&amp;amp;");
});

test("isLocalDevHost is true only for localhost, 127.0.0.1 and [::1]", () => {
  for (const host of ["localhost", "127.0.0.1", "[::1]"]) assert.equal(load({ hostname: host }).core.isLocalDevHost(), true, host);
  for (const host of ["endoftimeacademy.com", "localhost.evil.com", "::1", "dev.local", "127.0.0.2"]) assert.equal(load({ hostname: host }).core.isLocalDevHost(), false, host);
});

test("signedIn and currentUser read ScrollAuth at call time", () => {
  const user = { id: "u1" };
  assert.equal(load().core.signedIn(), false);
  assert.equal(load().core.currentUser(), null);
  assert.equal(load({ auth: { getUser: () => null } }).core.signedIn(), false);
  const { core } = load({ auth: { getUser: () => user } });
  assert.equal(core.signedIn(), true);
  assert.equal(core.currentUser(), user);
});

test("a ScrollAuth that throws counts as signed out", () => {
  const { core } = load({ auth: { getUser: () => { throw new Error("boom"); }, getClient: () => { throw new Error("boom"); } } });
  assert.equal(core.signedIn(), false);
  assert.equal(core.authClient(), null);
});

test("authClient returns the ScrollAuth client or null", () => {
  const client = { from() {} };
  assert.equal(load().core.authClient(), null);
  assert.equal(load({ auth: { getClient: () => client } }).core.authClient(), client);
});

function fakeElement(name, { hidden = false, rects = 1 } = {}) {
  const el = {
    name,
    hidden,
    focused: false,
    closest: () => null,
    getClientRects: () => ({ length: rects }),
    focus() { el.focused = true; },
  };
  return el;
}

function fakeContainer(items) {
  return {
    querySelectorAll: () => items,
    contains: (el) => items.includes(el),
  };
}

function tab(shiftKey = false) {
  const ev = { key: "Tab", shiftKey, prevented: false, preventDefault() { ev.prevented = true; } };
  return ev;
}

test("trapFocus wraps from the last item to the first and back", () => {
  const a = fakeElement("a");
  const b = fakeElement("b");
  const c = fakeElement("c");
  const box = fakeContainer([a, b, c]);

  const env = load({ active: c });
  const forward = tab();
  env.core.trapFocus(box, forward);
  assert.equal(forward.prevented, true);
  assert.equal(a.focused, true);

  env.document.activeElement = a;
  const back = tab(true);
  env.core.trapFocus(box, back);
  assert.equal(back.prevented, true);
  assert.equal(c.focused, true);
});

test("trapFocus leaves Tab alone between the first and last item", () => {
  const a = fakeElement("a");
  const b = fakeElement("b");
  const c = fakeElement("c");
  const env = load({ active: b });
  const ev = tab();
  env.core.trapFocus(fakeContainer([a, b, c]), ev);
  assert.equal(ev.prevented, false);
});

test("trapFocus pulls focus back in when it has escaped the container", () => {
  const a = fakeElement("a");
  const b = fakeElement("b");
  const outside = fakeElement("outside");
  const env = load({ active: outside });
  const ev = tab(true);
  env.core.trapFocus(fakeContainer([a, b]), ev);
  assert.equal(ev.prevented, true);
  assert.equal(b.focused, true);
});

test("trapFocus skips hidden and unrendered items and ignores other keys", () => {
  const a = fakeElement("a");
  const hidden = fakeElement("hidden", { hidden: true });
  const unrendered = fakeElement("unrendered", { rects: 0 });
  const env = load({ active: a });
  const ev = tab();
  env.core.trapFocus(fakeContainer([a, hidden, unrendered]), ev);
  assert.equal(ev.prevented, true);
  assert.equal(a.focused, true);

  const esc = { key: "Escape", preventDefault() { throw new Error("should not be called"); } };
  env.core.trapFocus(fakeContainer([a]), esc);
});

test("the focusable selector includes form fields, so every dialog agrees", () => {
  const { core } = load();
  for (const part of ["button:not([disabled])", "input:not([disabled])", "select:not([disabled])", "textarea:not([disabled])", "a[href]"]) {
    assert.ok(core.FOCUSABLE.includes(part), part);
  }
});
