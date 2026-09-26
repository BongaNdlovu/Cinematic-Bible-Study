import assert from "assert";
import path from "path";
import { spawn } from "child_process";
import { fileURLToPath } from "url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const preferred = 18000 + Math.floor(Math.random() * 2000);
const child = spawn("python", ["server.py", "--no-browser"], {
  cwd: ROOT,
  env: Object.assign({}, process.env, { PORT: String(preferred), PYTHONUNBUFFERED: "1" }),
  stdio: ["ignore", "pipe", "pipe"]
});
let log = "";
child.stdout.on("data", (chunk) => { log += chunk.toString(); });
child.stderr.on("data", (chunk) => { log += chunk.toString(); });
child.on("error", (err) => { log += String(err); });
child.on("exit", (code) => { log += "\nexit " + code; });

function portFromLog() {
  const started = Date.now();
  return new Promise((resolve, reject) => {
    const tick = () => {
      const match = log.match(/Server URL:\s+http:\/\/127\.0\.0\.1:(\d+)\//);
      if (match) resolve(Number(match[1]));
      else if (Date.now() - started > 15000) reject(new Error("local server did not print a port\n" + log));
      else setTimeout(tick, 100);
    };
    tick();
  });
}

try {
  const port = await portFromLog();
  await new Promise((resolve) => setTimeout(resolve, 200));
  const responses = await Promise.all(Array.from({ length: 40 }, () => {
    return fetch("http://127.0.0.1:" + port + "/study.html").catch((err) => {
      throw new Error(String(err && err.cause ? err.cause.code || err.cause.message : err) + "\n" + log);
    });
  }));
  const statuses = responses.map((res) => res.status);
  assert.ok(statuses.every((status) => status === 200), "statuses " + statuses.join(",") + "\n" + log);
  console.log("40 overlapping local study reads returned 200");
} finally {
  child.kill();
}
