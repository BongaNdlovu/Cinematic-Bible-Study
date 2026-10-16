/*
 * Find or start the local site server for a verification script.
 *
 * Order:
 *   1. --base=URL on the command line, or the BASE environment variable.
 *   2. A healthy server already on `preferred` (a 200 with a body).
 *   3. Start server.py and read the port it actually chose.
 *
 * Step 3 reads the port from the server's own output rather than assuming
 * `preferred`: server.py falls back to the next free port when one is taken,
 * and a stale process that holds the port without answering is exactly the
 * case where assuming it made scripts fail with "could not start a server".
 */
import { spawn } from 'child_process';
import http from 'http';

function healthy(base, probe) {
  return new Promise((resolve) => {
    const req = http.get(base + probe, (res) => {
      let n = 0;
      res.on('data', (c) => { n += c.length; });
      res.on('end', () => resolve(res.statusCode === 200 && n > 0));
      res.on('error', () => resolve(false));
    });
    req.on('error', () => resolve(false));
    req.setTimeout(1500, () => { req.destroy(); resolve(false); });
  });
}

function argBase() {
  const hit = process.argv.slice(2).find((a) => a.startsWith('--base='));
  const v = hit ? hit.slice('--base='.length) : process.env.BASE;
  return v ? String(v).replace(/\/$/, '') : '';
}

export async function ensureServer({ preferred = 8000, probe = '/index.html', timeoutMs = 10000 } = {}) {
  const given = argBase();
  if (given) return { base: given, port: Number(new URL(given).port) || 80, stop() {} };

  const preferredBase = `http://127.0.0.1:${preferred}`;
  if (await healthy(preferredBase, probe)) {
    return { base: preferredBase, port: preferred, stop() {} };
  }

  const child = spawn('python', ['server.py', '--no-browser'], {
    env: { ...process.env, PORT: String(preferred), PYTHONUNBUFFERED: '1' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let log = '';
  let port = 0;
  child.stdout.on('data', (d) => {
    log += d;
    const m = /Serving HTTP on port (\d+)/.exec(log);
    if (m && !port) port = Number(m[1]);
  });
  child.stderr.on('data', (d) => { log += d; });

  const stop = () => { try { child.kill(); } catch (e) { /* already gone */ } };
  // A script that throws before its own cleanup must not leave a server behind.
  process.once('exit', stop);
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 150));
    if (child.exitCode !== null) break;
    if (port && await healthy(`http://127.0.0.1:${port}`, probe)) {
      return { base: `http://127.0.0.1:${port}`, port, stop };
    }
  }
  stop();
  throw new Error(
    `Could not start or find a site server (preferred port ${preferred}).\n` +
    `Pass --base=http://127.0.0.1:<port> to use one you started.\n${log.trim().slice(-600)}`
  );
}
