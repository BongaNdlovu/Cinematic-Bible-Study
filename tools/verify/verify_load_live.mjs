const base = process.env.LIVE_BASE || "https://cinematic-bible-study-daniel.pages.dev";
const responses = await Promise.all(Array.from({ length: 40 }, () => fetch(base + "/study")));
const statuses = responses.map((res) => res.status);
if (!statuses.every((status) => status === 200)) {
  console.error("live statuses " + statuses.join(","));
  process.exit(1);
}
console.log("40 overlapping live study reads returned 200");
