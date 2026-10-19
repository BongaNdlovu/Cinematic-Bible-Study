import assert from "assert";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const cf = fs.readFileSync(path.join(ROOT, "tools/deploy-cloudflare-pages.ps1"), "utf8");
const vercel = fs.readFileSync(path.join(ROOT, "tools/deploy-vercel.ps1"), "utf8");
const vercelIgnore = fs.readFileSync(path.join(ROOT, ".vercelignore"), "utf8");

assert(cf.includes(" docs"), "Cloudflare stage must exclude the docs folder");
assert(cf.includes("README.md"), "Cloudflare stage must exclude README.md");
assert(cf.includes("package.json"), "Cloudflare stage must exclude package.json");
assert(cf.includes("package-lock.json"), "Cloudflare stage must exclude package-lock.json");
assert(cf.includes("server.py"), "Cloudflare stage must exclude server.py");
assert(cf.includes(".oxlintrc.json"), "Cloudflare stage must exclude .oxlintrc.json");
assert(cf.includes("vercel.json"), "Cloudflare stage must exclude vercel.json");
assert(cf.includes("wrangler.toml"), "Cloudflare stage must exclude wrangler.toml");
assert(cf.includes(" backups"), "Cloudflare stage must exclude backups folder");
assert(cf.includes(" workers"), "Cloudflare stage must exclude workers folder");
assert(cf.includes(" qa-e2e"), "Cloudflare stage must exclude qa-e2e folder");
assert(cf.includes("start_website.bat"), "Cloudflare stage must exclude start_website.bat");

for (const name of ["skills-lock.json", "tailwind.study.config.js", "three.core.js", "three.module.js", "study-tailwind-src.css", "glossary-enrichment-overrides.json"]) {
  assert(cf.includes(" " + name), "Cloudflare stage must exclude " + name);
}
assert(/\/XD[^\n]* functions /.test(cf.replace(/\r/g, "")), "Cloudflare stage must not upload the functions source as static files");
assert(!/three\.(core|module)\.min\.js/.test(cf.split("/NFL")[0]), "Cloudflare stage must keep the minified three.js builds");
assert(cf.includes("$dotLeft"), "Cloudflare stage must abort when a dotfile survives anywhere in the bundle");
assert(cf.includes("$exampleLeft"), "Cloudflare stage must abort when an example config survives hashing");

const unminified = [];
function scan(dir) {
  for (const entry of fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true })) {
    const rel = dir ? dir + "/" + entry.name : entry.name;
    if (entry.isDirectory()) {
      if (["node_modules", ".git", "tools", "docs", "qa", "qa-e2e", "workers", "_mig", "functions"].includes(rel) || entry.name.startsWith(".")) continue;
      scan(rel);
    } else if (/\.(html|js|mjs|css|json)$/.test(entry.name) && !/^vendor\/three\/build\/three\.(core|module)\.js$/.test(rel) && !["package-lock.json", "tailwind.study.config.js"].includes(rel)) {
      const text = fs.readFileSync(path.join(ROOT, rel), "utf8");
      if (/three\.(core|module)\.js/.test(text)) unminified.push(rel);
    }
  }
}
scan("");
assert.deepStrictEqual(unminified, [], "no shipped page or script may load the unminified three.js builds the deploy drops");

const routes = JSON.parse(fs.readFileSync(path.join(ROOT, "_routes.json"), "utf8"));
assert.strictEqual(routes.version, 1, "_routes.json must be version 1");
assert.deepStrictEqual(routes.include, ["/*"], "_routes.json must route every path through the middleware by default");
assert(routes.include.length + routes.exclude.length <= 100, "_routes.json must stay within the 100 rule limit");
for (const folder of ["/assets/*", "/js/*", "/css/*", "/vendor/*", "/models/*", "/bible/*"]) {
  assert(routes.exclude.includes(folder), "_routes.json must skip the middleware for " + folder);
}
function routed(p) {
  return !routes.exclude.some((rule) => new RegExp("^" + rule.split("*").map((part) => part.replace(/[.+?^${}()|[\]\\]/g, "\\$&")).join(".*") + "$").test(p));
}
const protectedPaths = [
  "/docs/plan.md", "/tools/supabase-quiz-integrity.sql", "/backups/db.sql", "/workers/exhibit-rate-gate/src/index.js",
  "/qa/proofs/x.png", "/originals/a.glb", "/_factcheck/meta.json", "/_mig/index.json", "/functions/_middleware.js",
  "/README.md", "/package.json", "/package-lock.json", "/server.py", "/vercel.json", "/wrangler.toml",
  "/start_website.bat", "/middleware.js", "/__wiring_check.mjs", "/.env", "/.git/config", "/__rate",
  "/study.html", "/map.html", "/"
];
for (const p of protectedPaths) assert(routed(p), "_routes.json must keep " + p + " behind the middleware");

const { onRequest } = await import("../../functions/_middleware.js");
for (const p of protectedPaths.slice(0, 20)) {
  let reached = false;
  const res = await onRequest({
    request: new Request("https://example.test" + p),
    env: {},
    next: () => { reached = true; return new Response("SERVED"); },
    waitUntil: () => {}
  });
  assert(res.status === 404 && !reached, p + " must be denied by the middleware");
}

assert(vercel.includes(" docs"), "Vercel stage must exclude the docs folder");
assert(vercel.includes("README.md"), "Vercel stage must exclude README.md");
assert(vercel.includes("server.py"), "Vercel stage must exclude server.py");
assert(vercel.includes(".oxlintrc.json"), "Vercel stage must exclude .oxlintrc.json");
assert(!/\/XF[^\n]*package\.json/.test(vercel.replace(/\r/g, "")), "Vercel stage must keep package.json");

assert(vercelIgnore.includes("docs/"), ".vercelignore must drop docs/");
assert(vercelIgnore.includes("README.md"), ".vercelignore must drop README.md");
assert(vercelIgnore.includes("server.py"), ".vercelignore must drop server.py");

const report = await onRequest({
  request: new Request("https://example.test/csp-report", {
    method: "POST",
    body: '{"csp-report":{"blocked-uri":"https://secret.example/token","violated-directive":"script-src"}}'
  }),
  env: {},
  next: () => new Response("SERVED"),
  waitUntil: () => {}
});
const reportText = await report.text();
assert.strictEqual(report.status, 503, "a CSP report is refused when the counter is down");
assert.ok(!reportText.includes("secret"), "a refused CSP report does not echo the blocked address");

console.log("Pages and Vercel stages drop operator files; static folders skip the middleware without exposing protected paths");
