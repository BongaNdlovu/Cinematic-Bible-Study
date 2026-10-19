import fs from 'fs';
import path from 'path';
import assert from 'assert';
import { fileURLToPath } from 'url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');

const sql = read('tools/supabase-certificates.sql');
const cert = read('js/study/certificate.js');
const dash = read('js/insights/insights.js');

assert(sql.includes('revoke all on public.exhibit_certificates from public, anon, authenticated'), 'certificates are not a public table');
assert(!/grant (select|insert|update|delete)[^;]*exhibit_certificates/.test(sql), 'certificates are reached only through the guarded functions');
assert(sql.includes("raise exception 'not_finished'"), 'a number is issued only after all sittings are saved');
assert(sql.includes('coalesce(v_finished, 0) < 11'), 'issuing checks eleven finished sittings');
assert(sql.includes('v_finished := public.exhibit_sittings_passed(auth.uid());'), 'issuing counts server-recorded quiz passes, not the learner-written journey');
assert(!/exhibit_sittings_finished\(p\.journey\)/.test(sql), 'neither issuing nor the graduates list trusts the learner-written journey');
assert(sql.includes("values ('quiz_passes_backfill')"), 'the journey backfill runs once, so later self-written progress is never credited');
assert(sql.includes('revoke all on function public.exhibit_sittings_passed(uuid) from public, anon, authenticated'), 'the pass counter is not an API function');
assert(sql.includes('where c.user_id = auth.uid() and c.name = v_name'), 'the same name returns the same number');
assert(sql.includes("v_recent >= 5"), 'certificate numbers are capped per day');
assert(sql.includes('where public.is_review_moderator()'), 'only a confirmed moderator lists graduates');
assert(sql.includes('case when u.email_confirmed_at is not null then u.email else null end'), 'only a confirmed address is returned');
assert(sql.includes('revoke all on function public.exhibit_sittings_finished(jsonb) from public, anon, authenticated'), 'the helper is not an API function');
assert(!/grant execute on function public\.(issue_exhibit_certificate|exhibit_graduates)[^;]*anon/.test(sql), 'signed-out callers cannot issue or list');
assert(sql.includes('set search_path = public, auth'), 'certificate functions pin search_path');
assert(!/\n\s*if [^;]*case when[^;]*end then/i.test(sql), 'a CASE inside an IF condition breaks the PL/pgSQL parser');
assert(sql.trimEnd().endsWith('commit;'), 'the migration runs in one transaction');

assert(cert.includes('issue_exhibit_certificate'), 'the certificate asks the server for its number');
assert(cert.includes('CERTIFICATE NO.'), 'the number is printed on the certificate');
assert(cert.includes('SERIAL_RE.test'), 'only a well-formed number is printed');
assert(cert.includes('ISSUE_WAIT_MS'), 'a slow server cannot hold the download forever');
assert(cert.includes('without a certificate number'), 'the reader is told when a copy has no number');

assert(dash.includes("c.rpc('exhibit_graduates')"), 'the dashboard reads graduates through the guarded function');
assert(dash.includes('graduatesHtml'), 'the dashboard has a graduates panel');

console.log('certificates: numbers need eleven saved sittings; graduates stay moderator-only');
