import fs from 'fs';
import path from 'path';
import assert from 'assert';
import { fileURLToPath } from 'url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');

const sql = read('tools/supabase-desk.sql');
const desk = read('js/shared/desk.js');

assert(sql.includes('public.is_review_moderator()'), 'desk SQL must use the confirmed-moderator check');
assert(sql.includes('set search_path = public, auth'), 'desk SQL functions must pin search_path');
assert(sql.includes("interval '1 day') >= 20"), 'notice publishes are capped at 20 a day');
assert(sql.includes("interval '1 day') >= 3"), 'help notes are capped at 3 a day');
assert(sql.includes('grant select (id, title, body, created_at)'), 'readers see only the public notice columns');
assert(!sql.includes('grant select (id, title, body, created_at, author_id)'), 'author_id stays off the notice grant');
assert(sql.includes('revoke all on public.exhibit_help_notes'), 'help notes are not a public table');
assert(!/grant select[\s\S]{0,80}exhibit_help_notes/.test(sql), 'help notes are not selectable through the API');
assert(sql.includes('exhibit_help_inbox()'), 'the operator reads notes through a guarded function');
assert(sql.includes('email_confirmed_at is not null'), 'only a confirmed address is returned to the operator');
assert(sql.includes('auth.uid()'), 'receipts and notes are stamped to the signed-in reader');
assert(sql.includes('revoke all on public.exhibit_help_replies'), 'replies are not a public table');
assert(!/grant (select|insert|update|delete)[^;]*exhibit_help_replies/.test(sql), 'replies are reached only through the guarded functions');
assert(sql.includes('(n.user_id = auth.uid() or public.is_review_moderator())'), 'a thread opens only for its writer or a moderator');
assert(sql.includes('(v_owner <> auth.uid() and not v_operator)'), 'only the writer or a moderator may reply');
assert(sql.includes('v_limit integer := case when public.is_review_moderator() then 200 else 20 end'), 'replies are capped per day');
assert(sql.includes('>= v_limit then'), 'the reply cap is checked against the daily limit');
assert(!/if \(select count\(\*\)[\s\S]{0,200}case when[\s\S]{0,40}then[\s\S]{0,40}end then/.test(sql), 'a CASE inside an IF condition breaks the PL/pgSQL parser');
assert(sql.includes('note_id uuid not null references public.exhibit_help_notes (id) on delete cascade'), 'clearing a note clears its replies');
assert(desk.includes('exhibit_help_mine') && desk.includes('exhibit_help_thread') && desk.includes('exhibit_help_reply'), 'the desk inbox uses the guarded functions');
assert(!desk.includes('from("exhibit_help_replies")'), 'the client must not query the replies table');
assert(!desk.includes('innerHTML'), 'desk must not assign HTML from message text');
assert(desk.includes('textContent'), 'desk renders message text as text');
assert(!desk.includes('author_id'), 'the client must not ask for the notice author');
assert(!desk.includes('user_id:'), 'the client must not send an account id on a note');
assert(desk.includes('baDeskReceipts'), 'guest read state stays in local storage');
assert(desk.includes('They are not copied into an account'), 'guest marks must not be uploaded');
assert(desk.includes('generation'), 'a late response must not paint another reader');
assert(!desk.includes('mailto:'), 'the desk must not open a mail link');

for (const page of ['index.html', 'study.html', 'map.html', 'gallery.html', 'account.html', 'reviews.html', 'insights.html', '404.html']) {
  const html = read(page);
  assert(html.includes('css/desk.css'), page + ' links the desk styles');
  assert(html.includes('js/shared/desk.js'), page + ' loads the desk');
}

console.log('desk: operator notices and reader notes stay on the guarded path');
