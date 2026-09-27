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

assert(vercel.includes(" docs"), "Vercel stage must exclude the docs folder");
assert(vercel.includes("README.md"), "Vercel stage must exclude README.md");
assert(vercel.includes("server.py"), "Vercel stage must exclude server.py");
assert(vercel.includes(".oxlintrc.json"), "Vercel stage must exclude .oxlintrc.json");
assert(!/\/XF[^\n]*package\.json/.test(vercel.replace(/\r/g, "")), "Vercel stage must keep package.json");

assert(vercelIgnore.includes("docs/"), ".vercelignore must drop docs/");
assert(vercelIgnore.includes("README.md"), ".vercelignore must drop README.md");
assert(vercelIgnore.includes("server.py"), ".vercelignore must drop server.py");

console.log("Pages and Vercel stages drop operator files");
