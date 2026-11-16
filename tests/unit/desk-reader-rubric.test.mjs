import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const load = (rel, name) => {
  const sandbox = { window: {}, Intl, Date, Number, Math, String };
  vm.runInNewContext(fs.readFileSync(new URL("../../" + rel, import.meta.url), "utf8"), sandbox);
  return sandbox.window[name];
};
const D = load("js/shared/desk-rows.js", "DeskRows");
const B = load("js/study/book-reader-helpers.js", "BookReaderHelpers");
const W = load("js/study/workbench-rubric.js", "WorkbenchRubric");
const ID = "123e4567-e89b-42d3-a456-426614174000";
const plain = (v) => JSON.parse(JSON.stringify(v));

test("isId accepts only UUIDs", () => {
  assert.equal(D.isId(ID), true);
  assert.equal(D.isId("123"), false);
  assert.equal(D.isId(null), false);
});

test("clippedLine flattens line breaks and clippedBlock keeps them", () => {
  assert.equal(D.clippedLine(" a\r\nb \n", 10), "a b");
  assert.equal(D.clippedBlock(" a\r\nb ", 10), "a\nb");
  assert.equal(D.clippedLine("abcdef", 3), "abc");
});

test("formatWhen is empty for a bad date", () => {
  assert.equal(D.formatWhen("nope"), "");
  assert.notEqual(D.formatWhen("2026-01-02T03:04:05Z", true), "");
});

test("plainError hides details except the rate limit", () => {
  assert.equal(D.plainError({ message: "rate_limit hit" }), "Please wait before sending another.");
  assert.equal(D.plainError(new Error("boom")), "That could not be saved.");
  assert.equal(D.plainError(null), "That could not be saved.");
});

test("safeEmail returns only well-formed addresses", () => {
  assert.equal(D.safeEmail(" reader@example.org "), "reader@example.org");
  assert.equal(D.safeEmail("not an email"), "");
  assert.equal(D.safeEmail("a@" + "b".repeat(260) + ".org"), "");
});

test("the row cleaners drop bad rows and clip long text", () => {
  assert.equal(D.cleanNotice({ id: "x", title: "t", body: "b" }), null);
  const notice = plain(D.cleanNotice({ id: ID, title: "t".repeat(200), body: "b" }));
  assert.equal(notice.title.length, D.TITLE_MAX);
  assert.equal(notice.created_at, "");
  const thread = plain(D.cleanThread({ id: ID, subject: "s", body: "b", created_at: "c", replies: -2, unread: "yes", sender_email: "bad" }));
  assert.deepEqual(thread, { id: ID, subject: "s", body: "b", created_at: "c", last_at: "c", replies: 0, unread: false, sender_email: "" });
  assert.equal(D.cleanMessage({ id: ID, body: 5 }), null);
  assert.equal(D.cleanMessage({ id: ID, body: "x".repeat(3000), from_operator: true }).body.length, D.BODY_MAX);
});

test("book reader helpers clamp, split classes and size the page deck", () => {
  assert.equal(B.clamp(9, 0, 5), 5);
  assert.equal(JSON.stringify(B.classTokens("  a  b ")), '["a","b"]');
  assert.equal(JSON.stringify(B.classTokens(null)), "[]");
  assert.equal(B.deckPx(0, 10), "0px");
  assert.equal(B.deckPx(1, 100), "2px");
  assert.equal(B.deckPx(10, 10), "10px");
});

test("the capstone rubric scores each of the four criteria", () => {
  const full = W.evaluateCapstoneRubric(
    "Daniel 2:38 head of gold, an unbroken succession down to the feet of clay.",
    "Consecration at the king's table came first."
  );
  assert.equal(full.score, 100);
  assert.equal(full.passed, true);
  assert.equal(full.missing.length, 0);
  const none = W.evaluateCapstoneRubric("nothing", "nothing");
  assert.equal(none.score, 0);
  assert.equal(none.passed, false);
  assert.equal(none.missing.length, 4);
});
