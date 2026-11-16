import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import * as acorn from "acorn";

const src = fs.readFileSync(new URL("../../js/shared/account.js", import.meta.url), "utf8");
const WANTED = new Set(["SITE_KEYS", "SITE_KEY_PREFIXES", "OWN_STASH_PREFIXES", "isSiteKey", "siteStores", "ownStashKeys", "clearSiteStorage"]);

function pickDeclarations() {
  const ast = acorn.parse(src, { ecmaVersion: "latest", sourceType: "script" });
  const out = [];
  const visit = (node) => {
    if (Array.isArray(node)) return node.forEach(visit);
    if (!node || typeof node !== "object") return;
    const name = node.type === "FunctionDeclaration" ? node.id.name
      : node.type === "VariableDeclaration" && node.declarations.length === 1 ? node.declarations[0].id.name : null;
    if (name && WANTED.has(name)) { out.push(src.slice(node.start, node.end)); return; }
    for (const key of Object.keys(node)) visit(node[key]);
  };
  visit(ast);
  return out;
}

function memoryStorage(keys) {
  const store = new Map(keys.map((k) => [k, "x"]));
  return {
    get length() { return store.size; },
    key: (i) => [...store.keys()][i] ?? null,
    removeItem: (k) => { store.delete(k); },
    keys: () => [...store.keys()].sort()
  };
}

function run(userId, keys) {
  const local = memoryStorage(keys);
  const session = memoryStorage([]);
  const sandbox = { window: { localStorage: local, sessionStorage: session } };
  vm.runInNewContext(pickDeclarations().join("\n") + "\nclearSiteStorage(" + JSON.stringify(userId) + ");", sandbox);
  return local.keys();
}

test("the seven storage-clearing declarations are found in account.js", () => {
  assert.equal(pickDeclarations().length, WANTED.size);
});

test("deleting an account clears its own stash keys and keeps other accounts' stashes", () => {
  const left = run("me-1", [
    "baProgressStash:me-1",
    "baStudySyncStash:me-1",
    "baProgressStash:other-2",
    "baStudySyncStash:other-2",
    "unrelatedKey"
  ]);
  assert.deepEqual(left, ["baProgressStash:other-2", "baStudySyncStash:other-2", "unrelatedKey"]);
});

test("with no user id no stash key is cleared", () => {
  const left = run("", ["baProgressStash:me-1", "baStudySyncStash:"]);
  assert.deepEqual(left, ["baProgressStash:me-1", "baStudySyncStash:"]);
});
