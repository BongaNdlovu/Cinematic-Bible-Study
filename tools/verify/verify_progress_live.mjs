const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_PUBLISHABLE_KEY;
const token = process.env.SUPABASE_ACCESS_TOKEN;
if (!url || !key || !token) {
  console.log("Skipped live progress check. Set SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, and SUPABASE_ACCESS_TOKEN after the revision SQL has been applied.");
  process.exit(0);
}

const headers = {
  apikey: key,
  Authorization: "Bearer " + token,
  "Content-Type": "application/json"
};

async function rpc(expected, sheets) {
  const res = await fetch(url + "/rest/v1/rpc/save_exhibit_progress", {
    method: "POST",
    headers: headers,
    body: JSON.stringify({
      expected_revision: expected,
      payload: {
        journey: { completedSheets: sheets, sheet: sheets[0] },
        mastery: sheets,
        workbench: {},
        telemetry: {},
        certificate_name: "Ada",
        cohort: "live"
      }
    })
  });
  const body = await res.json();
  if (!res.ok) throw new Error(JSON.stringify(body));
  return body;
}

const first = await rpc(null, [2]);
const revision = first.revision;
const raced = await Promise.all([rpc(revision, [2]), rpc(revision, [4])]);
const conflict = raced.find((item) => item.status === "conflict");
const winner = raced.find((item) => item.status === "ok");
if (!winner || !conflict) throw new Error("expected one ok and one conflict");
const sheets = Array.from(new Set([].concat(
  winner.row.journey.completedSheets || [],
  conflict.row.journey.completedSheets || [],
  [2, 4]
))).filter((n) => n === 2 || n === 4);
const merged = await rpc(conflict.revision, sheets);
const stored = merged.row.journey.completedSheets;
if (!stored.includes(2) || !stored.includes(4)) {
  throw new Error("live row missing a finished lesson: " + JSON.stringify(stored));
}
console.log("live database kept both finished lessons");
