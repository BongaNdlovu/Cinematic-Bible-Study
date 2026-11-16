import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

test("study.html links every css/study/ stylesheet once, in file-name order", () => {
  const onDisk = fs.readdirSync(path.join(root, "css/study")).filter((n) => n.endsWith(".css")).sort();
  const html = fs.readFileSync(path.join(root, "study.html"), "utf8");
  const linked = [...html.matchAll(/<link rel="stylesheet" href="css\/study\/([^"?]+\.css)/g)].map((m) => m[1]);
  assert.ok(onDisk.length > 1, "css/study/ holds the study page stylesheets");
  assert.deepEqual(linked, onDisk);
});

test("the study stylesheet parts are numbered so their order is the cascade order", () => {
  const names = fs.readdirSync(path.join(root, "css/study")).filter((n) => n.endsWith(".css"));
  for (const name of names) assert.match(name, /^\d{2}-[a-z0-9-]+\.css$/, name);
});
