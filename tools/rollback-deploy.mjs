import { execSync } from "node:child_process";

const PROJECT = "cinematic-bible-study-daniel";

function requiredEnv() {
  const token = process.env.CLOUDFLARE_API_TOKEN;
  const account = process.env.CLOUDFLARE_ACCOUNT_ID;
  if (token && account) return { token, account };
  console.error("Set CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID to roll back.");
  console.error("Pages rollback is the Cloudflare API, then `npx vercel rollback`.");
  console.error("Dashboard: https://developers.cloudflare.com/pages/configuration/rollbacks/");
  process.exit(1);
}

async function cf(account, token, pathname, method) {
  const url = "https://api.cloudflare.com/client/v4/accounts/" + account
    + "/pages/projects/" + PROJECT + pathname;
  const res = await fetch(url, {
    method: method || "GET",
    headers: { Authorization: "Bearer " + token }
  });
  const body = await res.json();
  if (!res.ok || body.success === false) {
    console.error(JSON.stringify(body.errors || body));
    process.exit(1);
  }
  return body.result;
}

const env = requiredEnv();
const listed = await cf(env.account, env.token, "/deployments");
const production = (Array.isArray(listed) ? listed : []).filter(function (item) {
  return item && item.environment === "production" && item.id;
});
production.sort(function (a, b) {
  return new Date(b.created_on || 0) - new Date(a.created_on || 0);
});
if (production.length < 2) {
  console.error("No previous production deployment to restore.");
  process.exit(1);
}
const target = production[1];
await cf(env.account, env.token, "/deployments/" + target.id + "/rollback", "POST");
console.log("Pages production restored to " + target.id);
execSync("npx vercel rollback --yes", { stdio: "inherit" });
console.log("Vercel rollback command finished.");
