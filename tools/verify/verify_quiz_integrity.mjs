import assert from "assert";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), "utf8");

/* 1. The shipped curriculum carries no answer key. */
global.window = {};
new Function(read("js/study/sheets-data.js"))();
const sheetsData = global.window.sheetsData;
assert.ok(Array.isArray(sheetsData) && sheetsData.length === 11, "eleven sittings load");

let total = 0;
sheetsData.forEach((sheet, sitting) => {
  assert.ok(Array.isArray(sheet.quizzes) && sheet.quizzes.length === 5, `sitting ${sitting} has 5 quizzes`);
  sheet.quizzes.forEach((quiz, qIdx) => {
    total += 1;
    assert.strictEqual("correct" in quiz, false, `quiz ${sitting}/${qIdx} must not ship a correct index`);
    assert.ok(Array.isArray(quiz.options) && quiz.options.length >= 2, `quiz ${sitting}/${qIdx} has options`);
    assert.ok(Array.isArray(quiz.diagnostics), `quiz ${sitting}/${qIdx} has diagnostics`);
    assert.strictEqual(quiz.diagnostics.length, quiz.options.length, `quiz ${sitting}/${qIdx} diagnostics stay aligned`);
    assert.strictEqual(quiz.diagnostics.filter((d) => d === "").length, 1, `quiz ${sitting}/${qIdx} has exactly the scrubbed slot`);
    assert.strictEqual(quiz.diagnostics.some((d) => /^correct/i.test(d)), false, `quiz ${sitting}/${qIdx} has no "Correct..." leak`);
  });
});
assert.strictEqual(total, 55, "all 55 checkpoint quizzes are present");

/* 2. The answer key lives in the server migration, covering every quiz. */
const sql = read("tools/supabase-quiz-integrity.sql");
assert.ok(sql.includes("create table if not exists public.exhibit_quiz_keys"), "migration creates the key table");
assert.ok(sql.includes("security definer"), "grading RPC runs as the definer");
const seed = new Set();
const tuple = /\((\d+),\s*(\d+),\s*(\d+),\s*'/g;
let m;
while ((m = tuple.exec(sql)) !== null) seed.add(`${m[1]}/${m[2]}`);
assert.strictEqual(seed.size, 55, "the migration seeds all 55 keys");
for (let s = 0; s < 11; s++) {
  for (let q = 0; q < 5; q++) {
    assert.ok(seed.has(`${s}/${q}`), `key seeded for sitting ${s} question ${q}`);
  }
}

/* 3. QuizGate grades through the RPC and fails closed without a session. */
global.window = { location: { hostname: "127.0.0.1" } };
global.localStorage = {
  store: {},
  getItem(k) { return this.store[k] ?? null; },
  setItem(k, v) { this.store[k] = String(v); },
  removeItem(k) { delete this.store[k]; }
};
global.location = global.window.location;

const rpcCalls = [];
let rpcReply = { data: { correct: true, correct_idx: 2, note: "Correct! Server note." }, error: null };
global.window.ScrollAuth = {
  getClient: () => ({
    rpc: (name, args) => {
      rpcCalls.push({ name, args });
      if (rpcReply.reject) return Promise.reject(rpcReply.reject);
      return Promise.resolve({ data: rpcReply.data, error: rpcReply.error });
    }
  })
};
new Function(read("js/shared/quiz-gate.js"))();
const QuizGate = global.window.QuizGate;

let res = await QuizGate.verify(4, 2, 2);
assert.deepStrictEqual(rpcCalls[0], { name: "verify_quiz_answer", args: { p_sitting: 4, p_q_idx: 2, p_chosen: 2 } }, "RPC args map to sitting/question/choice");
assert.deepStrictEqual(res, { ok: true, correct: true, correctIdx: 2, note: "Correct! Server note." }, "a correct answer returns the server note");

rpcReply = { data: { correct: false, correct_idx: 1, note: "" }, error: null };
res = await QuizGate.verify(0, 0, 3);
assert.strictEqual(res.correct, false, "a wrong answer is graded false");
assert.strictEqual(res.correctIdx, 1, "the server reveals the right option only after a pick");

rpcReply = { error: { message: "Could not find the function public.verify_quiz_answer" } };
res = await QuizGate.verify(0, 0, 1);
assert.deepStrictEqual(res, { ok: false, error: "missing_rpc" }, "a missing migration surfaces as missing_rpc");

rpcReply = { reject: new Error("Failed to fetch") };
res = await QuizGate.verify(0, 0, 1);
assert.strictEqual(res.ok, false, "network failure fails closed");

/* 4. Without a Supabase client: practice mode under the QA mock, closed otherwise. */
global.window.ScrollAuth.getClient = () => null;
global.localStorage.store.baQaMockSession = JSON.stringify({ user: { id: "qa" } });
res = await QuizGate.verify(0, 0, 1);
assert.deepStrictEqual(res, { ok: true, correct: true, correctIdx: 1, note: "" }, "QA mock session gets practice mode");

delete global.localStorage.store.baQaMockSession;
res = await QuizGate.verify(0, 0, 1);
assert.deepStrictEqual(res, { ok: false, error: "not_authenticated" }, "signed-out visitors fail closed");

/* 5. No consumer reads a plaintext key anymore. */
assert.strictEqual(/\b(q|quiz|questionData)\.correct\b/.test(read("js/study/study-app.js")), false, "study-app.js never reads q.correct");
assert.strictEqual(/q\.correct|correctIdx\s*=\s*q\.correct/.test(read("qa-e2e/production-audit.mjs")), false, "the e2e audit no longer reads the key");
assert.ok(read("js/study/study-app.js").includes("QuizGate.verify"), "study-app.js grades through QuizGate");

console.log("quiz integrity: key scrubbed, server seed complete, RPC grading, fail-closed paths hold");
