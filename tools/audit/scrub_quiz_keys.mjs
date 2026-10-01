/**
 * scrub_quiz_keys.mjs
 * One-time integrity migration for the checkpoint quizzes (audit item: the
 * answer key shipped as plaintext "correct" indices plus "Correct!"-marked
 * diagnostics in js/study/sheets-data.js).
 *
 *  1. Loads sheets-data.js in a sandbox and extracts (sitting, q_idx, correct_idx,
 *     correct_note) for every quiz.
 *  2. Generates tools/supabase-quiz-integrity.sql: the exhibit_quiz_keys table,
 *     the verify_quiz_answer security-definer RPC, and one seeded row per quiz.
 *  3. Rewrites sheets-data.js: drops every "correct" line and blanks the
 *     diagnostics entry that used to sit at the correct index (that string is
 *     what the server now returns as `note`).
 *
 * Run from the repo root:  node tools/audit/scrub_quiz_keys.mjs
 * Re-run ONLY after regenerating quiz content (tools/expand_quizzes_to_five.py):
 * the script is idempotent about extraction but will fail if no "correct"
 * fields remain (meaning the file is already scrubbed and the SQL already
 * carries the keys — do not regenerate the SQL unless the content changed).
 */
import fs from "fs";
import path from "path";
import vm from "vm";
import { fileURLToPath } from "url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const DATA_FILE = path.join(ROOT, "js/study/sheets-data.js");
const SQL_FILE = path.join(ROOT, "tools/supabase-quiz-integrity.sql");

function loadSheetsData(source) {
  const sandbox = { window: {} };
  vm.createContext(sandbox);
  vm.runInContext(source, sandbox, { filename: "sheets-data.js" });
  const data = sandbox.window.sheetsData;
  if (!Array.isArray(data) || !data.length) throw new Error("sheetsData did not load");
  return data;
}

function sqlQuote(text) {
  return "'" + String(text).replace(/'/g, "''") + "'";
}

const source = fs.readFileSync(DATA_FILE, "utf8");
const lines = source.split("\n");
const correctLine = /^\s*"correct":\s*(\d+),?\s*$/;

const found = [];
lines.forEach((line, i) => {
  const match = line.match(correctLine);
  if (match) found.push({ lineNo: i, correct: Number(match[1]) });
});
if (!found.length) {
  throw new Error('no "correct" fields found — sheets-data.js is already scrubbed');
}

const sheetsData = loadSheetsData(source);
const quizzes = [];
sheetsData.forEach((sheet, sitting) => {
  (sheet.quizzes || []).forEach((quiz, qIdx) => {
    if (typeof quiz.correct !== "number") throw new Error(`quiz ${sitting}/${qIdx} has no numeric correct field`);
    if (!Array.isArray(quiz.diagnostics) || quiz.diagnostics.length !== quiz.options.length) {
      throw new Error(`quiz ${sitting}/${qIdx} diagnostics/options length mismatch`);
    }
    quizzes.push({
      sitting,
      qIdx,
      correct: quiz.correct,
      note: quiz.diagnostics[quiz.correct] || "",
      options: quiz.options.length
    });
  });
});
if (quizzes.length !== found.length) {
  throw new Error(`parsed ${quizzes.length} quizzes but found ${found.length} "correct" lines`);
}

// Rewrite bottom-up so earlier line numbers stay valid.
for (const entry of [...found].sort((a, b) => b.lineNo - a.lineNo)) {
  const diagOpen = lines.findIndex((line, i) => i > entry.lineNo && /^\s*"diagnostics":\s*\[\s*$/.test(line));
  if (diagOpen === -1) throw new Error(`no diagnostics array after correct line ${entry.lineNo + 1}`);
  let element = -1;
  for (let i = diagOpen + 1; i < lines.length; i++) {
    if (/^\s*\],?\s*$/.test(lines[i])) break;
    if (/^\s*"/.test(lines[i])) {
      element += 1;
      if (element === entry.correct) {
        const trailingComma = /,\s*$/.test(lines[i]);
        const indent = lines[i].match(/^\s*/)[0];
        lines[i] = indent + '""' + (trailingComma ? "," : "");
        break;
      }
    }
  }
  if (element < entry.correct) throw new Error(`diagnostics too short at correct line ${entry.lineNo + 1}`);
  lines.splice(entry.lineNo, 1);
}

const scrubbed = lines.join("\n");
const scrubbedData = loadSheetsData(scrubbed);
scrubbedData.forEach((sheet, sitting) => {
  (sheet.quizzes || []).forEach((quiz, qIdx) => {
    if ("correct" in quiz) throw new Error(`correct survived in quiz ${sitting}/${qIdx}`);
    if (quiz.diagnostics.length !== quiz.options.length) {
      throw new Error(`scrub broke diagnostics alignment in quiz ${sitting}/${qIdx}`);
    }
    const blanks = quiz.diagnostics.filter((d) => d === "").length;
    if (blanks !== 1) throw new Error(`quiz ${sitting}/${qIdx} has ${blanks} blank diagnostics, expected 1`);
    if (quiz.diagnostics.some((d) => /^Correct!/i.test(d))) {
      throw new Error(`quiz ${sitting}/${qIdx} still leaks a "Correct!" diagnostics entry`);
    }
  });
});

fs.writeFileSync(DATA_FILE, scrubbed);

const seedRows = quizzes.map((q) =>
  `  (${q.sitting}, ${q.qIdx}, ${q.correct}, ${sqlQuote(q.note)})`
);

const sql = `-- Checkpoint quiz integrity. Run once in the Supabase SQL editor.
-- Moves the quiz answer key out of the client bundle: js/study/sheets-data.js
-- no longer carries "correct" indices (tools/audit/scrub_quiz_keys.mjs). This
-- file is the server half — deploy BEFORE the client release that includes
-- js/shared/quiz-gate.js, otherwise checkpoint questions cannot be graded.

create table if not exists public.exhibit_quiz_keys (
  sitting smallint not null,
  q_idx smallint not null,
  correct_idx smallint not null check (correct_idx between 0 and 9),
  correct_note text not null default '',
  primary key (sitting, q_idx)
);

alter table public.exhibit_quiz_keys enable row level security;

-- The table is readable only through the security-definer function below.
revoke all on public.exhibit_quiz_keys from anon, authenticated, public;

create or replace function public.verify_quiz_answer(p_sitting int, p_q_idx int, p_chosen int)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_key public.exhibit_quiz_keys;
begin
  if p_chosen is null or p_chosen < 0 or p_chosen > 9
     or p_sitting is null or p_q_idx is null then
    return jsonb_build_object('correct', false, 'correct_idx', null, 'note', '', 'error', 'bad_input');
  end if;
  select * into v_key from public.exhibit_quiz_keys
    where sitting = p_sitting and q_idx = p_q_idx;
  if not found then
    return jsonb_build_object('correct', false, 'correct_idx', null, 'note', '', 'error', 'not_found');
  end if;
  return jsonb_build_object(
    'correct', (v_key.correct_idx = p_chosen),
    'correct_idx', v_key.correct_idx,
    'note', case when v_key.correct_idx = p_chosen then v_key.correct_note else '' end
  );
end;
$$;

revoke execute on function public.verify_quiz_answer(int, int, int) from anon, public;
grant execute on function public.verify_quiz_answer(int, int, int) to authenticated;

insert into public.exhibit_quiz_keys (sitting, q_idx, correct_idx, correct_note) values
${seedRows.join(",\n")}
on conflict (sitting, q_idx) do update
  set correct_idx = excluded.correct_idx,
      correct_note = excluded.correct_note;
`;

fs.writeFileSync(SQL_FILE, sql);
console.log(`scrubbed ${quizzes.length} quizzes; wrote ${SQL_FILE}`);
