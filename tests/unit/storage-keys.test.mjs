import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import * as acorn from "acorn";
import { STORAGE_KEYS } from "../../tools/storage-keys.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const read = (rel) => fs.readFileSync(path.join(root, rel), "utf8");
const STORAGE_METHODS = new Set(["getItem", "setItem", "removeItem"]);
const STORAGE_OBJECT = /(local|session)Storage|\bstore\b|\bstorage\b/i;
const KEY_SHAPE = /^(ba[A-Z][A-Za-z0-9]*[-:]?|daniel[_-][A-Za-z0-9_:-]+)$/;

function sourceFiles() {
  return execFileSync("git", ["ls-files", "js"], { cwd: root, encoding: "utf8" })
    .split("\n")
    .filter((f) => f.endsWith(".js") && !f.includes("/vendor/") && !f.endsWith(".min.js"));
}

function parse(text) {
  const opts = { ecmaVersion: "latest", allowHashBang: true };
  try {
    return acorn.parse(text, { ...opts, sourceType: "script" });
  } catch {
    return acorn.parse(text, { ...opts, sourceType: "module" });
  }
}

function walk(node, visit) {
  if (Array.isArray(node)) return node.forEach((n) => walk(n, visit));
  if (!node || typeof node.type !== "string") return;
  visit(node);
  for (const key of Object.keys(node)) walk(node[key], visit);
}

function stringConsts(ast) {
  const consts = new Map();
  walk(ast, (n) => {
    const isStringConst = n.type === "VariableDeclarator" && n.id.type === "Identifier" && n.init && n.init.type === "Literal" && typeof n.init.value === "string";
    if (isStringConst) consts.set(n.id.name, n.init.value);
  });
  return consts;
}

function keyOf(arg, consts) {
  if (!arg) return null;
  if (arg.type === "Literal" && typeof arg.value === "string") return arg.value;
  if (arg.type === "Identifier") return consts.get(arg.name) ?? null;
  if (arg.type === "BinaryExpression" && arg.operator === "+") return keyOf(arg.left, consts);
  if (arg.type === "TemplateLiteral") return arg.quasis[0].value.cooked || null;
  return null;
}

function keysInCode() {
  const found = new Map();
  const note = (key, file) => {
    if (!key) return;
    if (!found.has(key)) found.set(key, new Set());
    found.get(key).add(file);
  };
  for (const file of sourceFiles()) {
    const text = read(file);
    const ast = parse(text);
    const consts = stringConsts(ast);
    walk(ast, (n) => {
      const isCall = n.type === "CallExpression" && n.callee.type === "MemberExpression" && !n.callee.computed;
      if (isCall && STORAGE_METHODS.has(n.callee.property.name) && STORAGE_OBJECT.test(text.slice(n.callee.object.start, n.callee.object.end))) {
        note(keyOf(n.arguments[0], consts), file);
      }
      if (n.type === "Literal" && typeof n.value === "string" && KEY_SHAPE.test(n.value)) note(n.value, file);
    });
  }
  return found;
}

function covers(entry, key) {
  return entry.prefix ? key.startsWith(entry.key) : key === entry.key;
}

function listIn(text, name) {
  const match = new RegExp("const " + name + " = \\[([\\s\\S]*?)\\];").exec(text);
  assert.ok(match, name + " not found");
  return [...match[1].matchAll(/["']([^"']+)["']/g)].map((m) => m[1]);
}

test("every storage key the code uses is in tools/storage-keys.mjs", () => {
  const missing = [];
  for (const [key, files] of keysInCode()) {
    if (!STORAGE_KEYS.some((e) => covers(e, key))) missing.push(key + " (" + [...files].join(", ") + ")");
  }
  assert.deepEqual(missing, [], "add these keys to tools/storage-keys.mjs, or fix the typo");
});

test("every key in tools/storage-keys.mjs is still used by the code", () => {
  const used = [...keysInCode().keys()];
  const stale = STORAGE_KEYS.filter((e) => !used.some((k) => covers(e, k) || k === e.key)).map((e) => e.key);
  assert.deepEqual(stale, []);
});

test("the keys cleared on sign-out match PERSONAL_KEYS and PERSONAL_PREFIXES in auth.js", () => {
  const auth = read("js/shared/auth.js");
  const actual = [...listIn(auth, "PERSONAL_KEYS"), ...listIn(auth, "PERSONAL_PREFIXES")].sort();
  const expected = STORAGE_KEYS.filter((e) => e.signOut).map((e) => e.key).sort();
  assert.deepEqual(actual, expected);
});

test("the keys cleared on account deletion match SITE_KEYS and SITE_KEY_PREFIXES in account.js", () => {
  const account = read("js/shared/account.js");
  const actual = [...listIn(account, "SITE_KEYS"), ...listIn(account, "SITE_KEY_PREFIXES")].sort();
  const expected = STORAGE_KEYS.filter((e) => e.deleteAccount).map((e) => e.key).sort();
  assert.deepEqual(actual, expected);
});

test("the stash prefixes cleared for the deleted account match OWN_STASH_PREFIXES in account.js", () => {
  const actual = listIn(read("js/shared/account.js"), "OWN_STASH_PREFIXES").sort();
  const expected = STORAGE_KEYS.filter((e) => e.deleteOwnAccount).map((e) => e.key).sort();
  assert.deepEqual(actual, expected);
});

test("the privacy page names every key a reader's browser can hold", () => {
  const privacy = read("privacy.html").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
  const missing = STORAGE_KEYS.filter((e) => !e.localhostOnly && !privacy.includes(e.key)).map((e) => e.key);
  assert.deepEqual(missing, []);
});

test("the Supabase session key on the privacy page uses the project in auth-config.js", () => {
  const config = read("js/shared/auth-config.js");
  const ref = /https:\/\/([a-z0-9]+)\.supabase\.co/.exec(config);
  assert.ok(ref, "Supabase URL not found in auth-config.js");
  assert.ok(read("privacy.html").includes("sb-" + ref[1] + "-auth-token"));
});
