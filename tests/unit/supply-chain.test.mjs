import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const ROOT = new URL("../../", import.meta.url);
const WORKFLOWS = ["ci.yml", "db-backup.yml", "health.yml"];
const PINNED = /^\s*-?\s*uses:\s*[\w.-]+\/[\w./-]+@[0-9a-f]{40}(\s|$)/;
const ANY_USES = /^\s*-?\s*uses:\s*\S+/;

function read(rel) {
  return fs.readFileSync(new URL(rel, ROOT), "utf8").replace(/\r\n/g, "\n");
}

function checkoutBlocks(text) {
  const lines = text.split("\n");
  const blocks = [];
  for (let i = 0; i < lines.length; i++) {
    const step = lines[i].match(/^(\s*)- uses: actions\/checkout@/);
    if (!step) continue;
    const stepIndent = step[1].length;
    const body = [];
    for (let j = i + 1; j < lines.length; j++) {
      const indent = lines[j].match(/^\s*/)[0].length;
      const isNextStep = indent <= stepIndent && lines[j].trim() !== "";
      if (isNextStep) break;
      body.push(lines[j]);
    }
    blocks.push(body.join("\n"));
  }
  return blocks;
}

for (const name of WORKFLOWS) {
  const text = read(".github/workflows/" + name);

  test(name + ": every action is pinned to a full commit SHA", () => {
    const uses = text.split("\n").filter((l) => ANY_USES.test(l));
    assert.ok(uses.length > 0);
    for (const line of uses) assert.match(line, PINNED, line.trim());
  });

  test(name + ": every checkout drops its credentials", () => {
    const blocks = checkoutBlocks(text);
    assert.ok(blocks.length > 0);
    for (const block of blocks) assert.match(block, /^\s+persist-credentials: false$/m);
  });

  test(name + ": sets top-level permissions and avoids risky triggers", () => {
    assert.match(text, /^permissions:\n\s+contents: read$/m);
    assert.doesNotMatch(text, /pull_request_target|workflow_run|issue_comment/);
  });
}

test("Dependabot updates actions and npm after a 7-day cooldown", () => {
  const text = read(".github/dependabot.yml");
  for (const ecosystem of ["github-actions", "npm"]) {
    const at = text.indexOf("package-ecosystem: " + ecosystem);
    assert.ok(at >= 0, ecosystem + " is configured");
    const next = text.indexOf("package-ecosystem:", at + 1);
    const block = text.slice(at, next < 0 ? undefined : next);
    assert.match(block, /interval: weekly/);
    assert.match(block, /cooldown:\n\s+default-days: 7/);
  }
});

test("npm does not run package install scripts", () => {
  assert.match(read(".npmrc"), /^ignore-scripts=true$/m);
});
