import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../..');
const cfg = fs.readFileSync(path.join(ROOT, 'js/shared/auth-config.js'), 'utf8');
const url = (cfg.match(/url:\s*"([^"]+)"/) || [])[1];
const key = (cfg.match(/publishableKey:\s*"([^"]+)"/) || [])[1];
if (!url || !key) {
  console.error('FAIL: missing url or publishableKey in auth-config.js');
  process.exit(1);
}

const headers = {
  apikey: key,
  Authorization: 'Bearer ' + key,
  'Content-Type': 'application/json',
  Prefer: 'return=minimal'
};

async function post(table, body) {
  const res = await fetch(url + '/rest/v1/' + table, {
    method: 'POST',
    headers,
    body: JSON.stringify(body)
  });
  const text = await res.text();
  return { status: res.status, text };
}

const events = await post('exhibit_events', {
  event: 'live_insert_probe',
  page: 'index.html',
  user_id: null,
  anon_id: 'live-insert-probe',
  session_id: 'live-insert-probe',
  detail: {}
});
const surveys = await post('exhibit_surveys', {
  user_id: null,
  anon_id: 'live-insert-probe',
  cohort: '',
  role: 'Student',
  feedback: 'live insert probe',
  responses: { kind: 'nps' }
});

console.log('events', events.status, events.text.slice(0, 200));
console.log('surveys', surveys.status, surveys.text.slice(0, 200));
if (events.status !== 201 || surveys.status !== 201) {
  console.error('FAIL: unsigned production inserts must return 201');
  process.exit(1);
}
console.log('✓ Live unsigned event and survey inserts returned 201');
