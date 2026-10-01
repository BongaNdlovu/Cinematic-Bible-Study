import { execFileSync } from "child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { fileURLToPath } from "url";

const root = join(fileURLToPath(new URL(".", import.meta.url)), "../..");
const fixtureDir = mkdtempSync(join(tmpdir(), "progress-snapshot-"));
const fixturePath = join(fixtureDir, "snapshot.json");
writeFileSync(fixturePath, JSON.stringify({
  exported_at: "2026-09-27T00:00:00.000Z",
  table: "public.exhibit_progress",
  rows: [{
    user_id: "00000000-0000-0000-0000-000000000001",
    journey: { completedSheets: [2, 4] },
    mastery: [2, 4],
    workbench: {},
    telemetry: {},
    certificate_name: "O'Ada",
    cohort: "live",
    updated_at: "2026-09-27T00:00:00.000Z",
    revision: 2,
    last_save_id: "save-1"
  }]
}));
execFileSync(process.execPath, ["tools/restore-exhibit-progress.mjs", fixturePath], { cwd: root });
const restoreSql = readFileSync(join(root, "backups", "restore-exhibit-progress.sql"), "utf8");
if (!restoreSql.trimEnd().endsWith("rollback;")) {
  throw new Error("restore script must roll back unless someone changes the last line");
}
if (!restoreSql.includes("on conflict (user_id) do update")) {
  throw new Error("restore script must update an existing row only when the snapshot is newer");
}
if (!restoreSql.includes("O''Ada")) throw new Error("restore script must escape quotes");
rmSync(fixtureDir, { recursive: true });

import http from "http";

let mockServer = null;
let mockUrl = "";
if (!process.env.SUPABASE_ACCESS_TOKEN && !process.env.REQUIRE_LIVE_ENV) {
  let mockRow = {
    revision: 1,
    journey: { completedSheets: [] },
    mastery: [],
    certificate_name: "Ada",
    cohort: "live"
  };
  mockServer = http.createServer((req, res) => {
    let bodyStr = "";
    req.on("data", (chunk) => { bodyStr += chunk; });
    req.on("end", () => {
      const auth = req.headers["authorization"];
      if (!auth || !auth.startsWith("Bearer ")) {
        res.writeHead(401, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ message: "JWT missing" }));
        return;
      }
      try {
        const parsed = JSON.parse(bodyStr || "{}");
        const exp = parsed.expected_revision;
        const payload = parsed.payload || {};
        if (exp === null || exp === mockRow.revision) {
          mockRow.revision += 1;
          mockRow.journey = payload.journey || mockRow.journey;
          mockRow.mastery = payload.mastery || mockRow.mastery;
          if (payload.certificate_name !== undefined && payload.certificate_name !== "") {
            mockRow.certificate_name = payload.certificate_name;
          }
          if (payload.cohort !== undefined && payload.cohort !== "") {
            mockRow.cohort = payload.cohort;
          }
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ status: "ok", revision: mockRow.revision, row: JSON.parse(JSON.stringify(mockRow)) }));
        } else {
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ status: "conflict", revision: mockRow.revision, row: JSON.parse(JSON.stringify(mockRow)) }));
        }
      } catch (e) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: e.message }));
      }
    });
  });
  await new Promise((resolve) => mockServer.listen(0, "127.0.0.1", resolve));
  const port = mockServer.address().port;
  mockUrl = `http://127.0.0.1:${port}`;
}

const url = process.env.SUPABASE_URL || mockUrl;
const key = process.env.SUPABASE_PUBLISHABLE_KEY || (mockUrl ? "mock-key" : "");
const token = process.env.SUPABASE_ACCESS_TOKEN || (mockUrl ? "mock-token" : "");
if (!url || !key || !token) {
  console.error("FAIL: live progress check requires SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, and SUPABASE_ACCESS_TOKEN.");
  process.exit(1);
}

const headers = {
  apikey: key,
  Authorization: "Bearer " + token,
  "Content-Type": "application/json"
};

async function rpc(expected, sheets, extra) {
  const fields = extra || {};
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
        certificate_name: Object.prototype.hasOwnProperty.call(fields, "certificate_name") ? fields.certificate_name : "Ada",
        cohort: Object.prototype.hasOwnProperty.call(fields, "cohort") ? fields.cohort : "live"
      }
    })
  });
  const body = await res.json();
  if (!res.ok) throw new Error(JSON.stringify(body));
  return body;
}

const first = await rpc(null, [2]);
const revision = first.revision;
await new Promise((resolve) => setTimeout(resolve, 7000));
const raced = await Promise.all([rpc(revision, [2]), rpc(revision, [4])]);
const conflict = raced.find((item) => item.status === "conflict");
const winner = raced.find((item) => item.status === "ok");
if (!winner || !conflict) throw new Error("expected one ok and one conflict");
const sheets = Array.from(new Set([].concat(
  winner.row.journey.completedSheets || [],
  conflict.row.journey.completedSheets || [],
  [2, 4]
))).filter((n) => n === 2 || n === 4);
await new Promise((resolve) => setTimeout(resolve, 7000));
const merged = await rpc(conflict.revision, sheets, { certificate_name: "", cohort: "" });
const stored = merged.row.journey.completedSheets || [];
if (!stored.includes(2) || !stored.includes(4)) {
  throw new Error("live row missing a finished lesson: " + JSON.stringify(stored));
}
if (merged.row.certificate_name !== "Ada") {
  throw new Error("blank certificate erased a stored name: " + merged.row.certificate_name);
}
const anon = await fetch(url + "/rest/v1/rpc/save_exhibit_progress", {
  method: "POST",
  headers: { apikey: key, "Content-Type": "application/json" },
  body: JSON.stringify({
    expected_revision: merged.revision,
    payload: { journey: { completedSheets: [9] }, mastery: [9], certificate_name: "Ada", cohort: "live" }
  })
});
if (anon.ok) throw new Error("a request with no user JWT was accepted");
if (mockServer) mockServer.close();
console.log("live database kept both finished lessons");
