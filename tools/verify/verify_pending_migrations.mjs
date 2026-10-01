import assert from 'assert';

const URL = 'https://ttlrspnfadmxkoyqvofh.supabase.co';
const KEY = 'sb_publishable_k3fsJ1eGKIcmOxtmaZHbJw_R1qdW_ya';
const HEADERS = { apikey: KEY, 'Content-Type': 'application/json' };

async function verify() {
  console.log('--- Probing Supabase Database Status ---');

  // 1. Check existing core tables
  const coreTables = ['exhibit_progress', 'exhibit_reviews', 'exhibit_events', 'exhibit_surveys', 'exhibit_profiles'];
  for (const t of coreTables) {
    const res = await fetch(`${URL}/rest/v1/${t}?select=*&limit=1`, { headers: HEADERS });
    console.log(`✓ Core table ${t}: HTTP ${res.status}`);
    assert.strictEqual(res.status, 200, `Expected ${t} to return 200`);
  }

  // 2. Check pending tables. exhibit_quiz_keys is revoked from anon, so a
  // deployed copy answers 401; only 404 means the table is missing.
  const pendingTables = ['exhibit_study_data', 'exhibit_quiz_keys'];
  const pendingTableResults = {};
  for (const t of pendingTables) {
    const res = await fetch(`${URL}/rest/v1/${t}?select=*&limit=1`, { headers: HEADERS });
    pendingTableResults[t] = res.status;
    console.log(`• Pending table ${t}: HTTP ${res.status} (${res.status !== 404 ? 'DEPLOYED' : 'PENDING'})`);
  }

  // 3. Check verify_quiz_answer RPC
  const rpcRes = await fetch(`${URL}/rest/v1/rpc/verify_quiz_answer`, {
    method: 'POST',
    headers: HEADERS,
    body: JSON.stringify({ p_sitting: 0, p_q_idx: 0, p_chosen: 0 })
  });
  console.log(`• Pending RPC verify_quiz_answer: HTTP ${rpcRes.status} (${rpcRes.status !== 404 ? 'DEPLOYED' : 'PENDING'})`);

  const allDeployed = Object.values(pendingTableResults).every(s => s !== 404) && rpcRes.status !== 404;
  if (allDeployed) {
    console.log('\nSUCCESS: All pending Supabase migrations are fully deployed!');
  } else {
    console.log('\nNOTICE: One or more pending migrations have not been applied to Supabase yet.');
    console.log('Run tools/supabase-pending-migrations.sql in the Supabase SQL editor:');
    console.log('https://supabase.com/dashboard/project/ttlrspnfadmxkoyqvofh/sql/new');
  }
}

verify().catch(err => {
  console.error('Verification failed:', err);
  process.exit(1);
});
