import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import * as acorn from "acorn";
import { pageScripts } from "../../tools/verify/_sources.mjs";

const ROOT = new URL("../../", import.meta.url);
const rootPath = path.resolve(new URL(".", ROOT).pathname.replace(/^\/([A-Za-z]:)/, "$1"));
const read = (rel) => fs.readFileSync(path.join(rootPath, rel), "utf8");

function walk(dir) {
  const out = [];
  for (const entry of fs.readdirSync(path.join(rootPath, dir), { withFileTypes: true })) {
    const rel = dir + "/" + entry.name;
    if (entry.isDirectory()) out.push(...walk(rel));
    else out.push(rel);
  }
  return out;
}

const JS_FILES = walk("js").filter((f) => f.endsWith(".js"));
const CSS_FILES = walk("css").filter((f) => f.endsWith(".css"));
const PAGES = fs.readdirSync(rootPath).filter((f) => f.endsWith(".html"));

function parse(src) {
  try {
    return acorn.parse(src, { ecmaVersion: "latest", sourceType: "module" });
  } catch {
    return acorn.parse(src, { ecmaVersion: "latest", sourceType: "script" });
  }
}

function declaredFunctions(src) {
  const found = [];
  (function visit(node) {
    if (Array.isArray(node)) return node.forEach(visit);
    if (!node || typeof node !== "object") return;
    if (node.type === "FunctionDeclaration" && node.id) found.push({ name: node.id.name, body: src.slice(node.body.start, node.body.end) });
    for (const key of Object.keys(node)) if (key !== "type") visit(node[key]);
  })(parse(src));
  return found;
}

function stylesheetLinks(page) {
  return [...read(page).matchAll(/<link[^>]+rel="stylesheet"[^>]+href="(?:\.\/)?(css\/[^"?]+)/g)].map((m) => m[1]);
}

const usage = new Map();
for (const page of PAGES) {
  const files = [...pageScripts(page), ...stylesheetLinks(page)];
  for (const file of files) {
    if (!usage.has(file)) usage.set(file, new Set());
    usage.get(file).add(page);
  }
}

test("a function named like a js/core/core.js helper only calls SiteCore, never repeats its body", () => {
  const core = read("js/core/core.js");
  const exported = /root\.SiteCore = Object\.freeze\(\{([^}]*)\}\)/.exec(core)[1].split(",").map((s) => s.trim()).filter(Boolean);
  const coreNames = declaredFunctions(core).map((f) => f.name);
  const helpers = exported.filter((name) => coreNames.includes(name));
  assert.ok(helpers.length >= 5, "the core helpers were found: " + helpers.join(", "));
  const copies = [];
  for (const file of JS_FILES) {
    if (file === "js/core/core.js") continue;
    for (const fn of declaredFunctions(read(file))) {
      if (helpers.includes(fn.name) && !fn.body.includes("SiteCore")) copies.push(file + ": " + fn.name);
    }
  }
  assert.deepEqual(copies, []);
});

test("every file in core/ and features/ is loaded by two or more pages", () => {
  const shared = [...JS_FILES, ...CSS_FILES].filter((f) => /^(js|css)\/(core|features)\//.test(f));
  const exempt = new Set(["js/core/auth-config.example.js"]);
  const lonely = shared.filter((f) => !exempt.has(f) && (usage.get(f) || new Set()).size < 2)
    .map((f) => f + " (" + [...(usage.get(f) || [])].join(", ") + ")");
  assert.deepEqual(lonely, []);
});

test("no page loads a script or stylesheet from another page's folder", () => {
  const folderOf = (page) => (page === "insights.html" ? "dashboard" : page.replace(/\.html$/, ""));
  const strays = [];
  for (const [file, pages] of usage) {
    const m = /^(?:js|css)\/pages\/([^/]+)\//.exec(file);
    if (!m) continue;
    for (const page of pages) if (folderOf(page) !== m[1]) strays.push(page + " -> " + file);
  }
  assert.deepEqual(strays, []);
});

test("every page with its own scripts loads exactly one module entry", () => {
  const counts = [];
  for (const page of PAGES) {
    const html = read(page);
    const entries = [...html.matchAll(/<script type="module" src="(?:\.\/)?(js\/pages\/[^"]+\/main\.js)"/g)].map((m) => m[1]);
    const hasEntryFolder = fs.existsSync(path.join(rootPath, "js/pages", page === "insights.html" ? "dashboard" : page.replace(/\.html$/, ""), "main.js"));
    if (hasEntryFolder && entries.length !== 1) counts.push(page + ": " + entries.length);
  }
  assert.deepEqual(counts, []);
});

test("no script creates a <style> element or writes a style block", () => {
  const offenders = JS_FILES.filter((f) => /createElement\(\s*['"`]style['"`]\s*\)|<style[\s>]/i.test(read(f)));
  assert.deepEqual(offenders, []);
});
