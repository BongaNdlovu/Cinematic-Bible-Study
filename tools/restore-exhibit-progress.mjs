// Build a restore script from a progress snapshot. Does not connect to the database.
// The written SQL rolls back. Replace the final rollback with commit only when restoring.

import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { dirname, resolve } from "path";

const snapshotPath = process.argv[2];
if (!snapshotPath) {
  console.error("Usage: node tools/restore-exhibit-progress.mjs <snapshot.json>");
  process.exit(1);
}

const snapshot = JSON.parse(readFileSync(snapshotPath, "utf8"));
const rows = Array.isArray(snapshot.rows) ? snapshot.rows : [];
const exportedAt = String(snapshot.exported_at || "");
if (!exportedAt) throw new Error("snapshot is missing exported_at");

function quote(value) {
  if (value === null || value === undefined) return "null";
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  if (typeof value === "object") return "'" + JSON.stringify(value).replace(/'/g, "''") + "'::jsonb";
  return "'" + String(value).replace(/'/g, "''") + "'";
}

const inserts = rows.map((row) => {
  const updatedAt = quote(row.updated_at);
  return `
insert into public.exhibit_progress (
  user_id, journey, mastery, workbench, telemetry,
  certificate_name, cohort, updated_at, revision, last_save_id
) values (
  ${quote(row.user_id)}::uuid,
  ${quote(row.journey)},
  ${quote(row.mastery)},
  ${quote(row.workbench)},
  ${quote(row.telemetry)},
  ${quote(row.certificate_name)},
  ${quote(row.cohort)},
  ${updatedAt}::timestamptz,
  ${quote(row.revision)}::bigint,
  ${quote(row.last_save_id)}
)
on conflict (user_id) do update set
  journey = excluded.journey,
  mastery = excluded.mastery,
  workbench = excluded.workbench,
  telemetry = excluded.telemetry,
  certificate_name = excluded.certificate_name,
  cohort = excluded.cohort,
  updated_at = excluded.updated_at,
  revision = excluded.revision,
  last_save_id = excluded.last_save_id
where public.exhibit_progress.updated_at <= excluded.updated_at;`;
});

const sql = `-- Restore progress from ${exportedAt}. ${rows.length} row(s).
-- Run the table SQL in tools/ first if the table is gone.
-- This script rolls back. Change the last line to commit to apply it.

begin;
${inserts.join("\n")}
rollback;
`;

const out = resolve("backups", "restore-exhibit-progress.sql");
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, sql);
console.log("wrote " + out + " (" + rows.length + " rows, rolls back)");
