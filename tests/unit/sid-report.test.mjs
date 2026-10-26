import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const SRC = fs.readFileSync(new URL("../../js/insights/sid-report.js", import.meta.url), "utf8");
const box = { Intl, Date, Math, Number, String, Object, Array };
vm.runInNewContext(SRC, box);
const { build, render, count, share, MIN } = box.window ? box.window.SidReport : box.SidReport;

const FROM = "2026-07-01T00:00:00.000Z";
const TO = "2026-10-01T00:00:00.000Z";
const AT = "2026-08-15T10:00:00.000Z";

function ev(event, actor, sitting, detail, at) {
  return { event, user_id: actor, anon_id: "", sitting, detail: detail || {}, created_at: at || AT };
}

function people(n, prefix) {
  return Array.from({ length: n }, (_, i) => `${prefix || "u"}${i}`);
}

test("counts under five are withheld, zero and larger counts are shown", () => {
  assert.equal(MIN, 5);
  assert.equal(count(0), "0");
  assert.equal(count(1), "fewer than 5");
  assert.equal(count(4), "fewer than 5");
  assert.equal(count(5), "5");
  assert.equal(count(1200), "1 200".replace(" ", " "));
});

test("shares need a base of five and hide small parts", () => {
  assert.equal(share(3, 4), "too few to report");
  assert.equal(share(3, 40), "fewer than 5 of 40");
  assert.equal(share(0, 40), "0%");
  assert.equal(share(30, 40), "75%");
});

test("only rows inside the period count", () => {
  const events = [
    ...people(6).map((u) => ev("sitting_start", u, 0)),
    ev("sitting_start", "early", 0, {}, "2026-06-30T23:59:59.000Z"),
    ev("sitting_start", "late", 0, {}, TO)
  ];
  const f = build({ events, surveys: [], profiles: [] }, { from: FROM, to: TO });
  assert.equal(f.reach.readers, 6);
  assert.equal(f.funnel[0].started, 6);
});

test("each person counts once per sitting and excluded rows are dropped", () => {
  const events = [
    ...people(5).flatMap((u) => [ev("sitting_start", u, 2), ev("sitting_start", u, 2)]),
    ev("sitting_start", "me", 2),
    ...people(5).map((u) => ev("sitting_complete", u, 2, { seconds: 600 }))
  ];
  const f = build({ events, surveys: [], profiles: [] }, { from: FROM, to: TO, exclude: (r) => r.user_id === "me" });
  assert.equal(f.funnel[2].started, 5);
  assert.equal(f.funnel[2].completed, 5);
  assert.equal(f.funnel[2].seconds / f.funnel[2].timed, 600);
});

test("quiz figures use each reader's first answer only", () => {
  const events = people(5).flatMap((u, i) => [
    ev("quiz_answer", u, 7, { q: 2, correct: i < 2, attempt: 1 }, "2026-08-01T00:00:00.000Z"),
    ev("quiz_answer", u, 7, { q: 2, correct: true, attempt: 2 }, "2026-08-02T00:00:00.000Z")
  ]);
  const f = build({ events, surveys: [], profiles: [] }, { from: FROM, to: TO });
  assert.equal(f.quiz.bySitting[7].answers, 5);
  assert.equal(f.quiz.bySitting[7].correct, 2);
  assert.equal(f.quiz.hardest.length, 1);
  assert.equal(f.quiz.hardest[0].question, 3);
  assert.equal(f.quiz.hardest[0].name, "Daniel 7");
});

test("questions with fewer than five answers are not listed as hardest", () => {
  const events = people(4).map((u) => ev("quiz_answer", u, 1, { q: 0, correct: false, attempt: 1 }));
  const f = build({ events, surveys: [], profiles: [] }, { from: FROM, to: TO });
  assert.equal(f.quiz.hardest.length, 0);
});

test("reader answers, ratings and certificates are tallied from the period", () => {
  const profiles = [
    ...people(6).map((u) => ({ user_id: u, found_via: "First time", study_mode: "With others", created_at: AT })),
    { user_id: "x", found_via: "Something else", study_mode: "", created_at: AT }
  ];
  const surveys = people(5).map((u) => ({ user_id: u, responses: { kind: "sitting_pulse", score: 4 }, created_at: AT }));
  const graduates = [{ user_id: "a", issued_at: AT, email: "a@example.test", certificate_name: "A" }, { user_id: "b", issued_at: "2026-01-01T00:00:00.000Z" }];
  const f = build({ events: [], surveys, profiles, graduates }, { from: FROM, to: TO });
  assert.equal(f.readers.firstRead.total, 6);
  assert.equal(f.readers.uses.items.find((r) => r.label === "With others").n, 6);
  assert.equal(f.feedback.pulse.n, 5);
  assert.equal(f.feedback.pulse.total, 20);
  assert.equal(f.completion.certificates, 1);
});

test("the rendered report carries no names, emails or SID marks and shows the period", () => {
  const graduates = [{ user_id: "a", issued_at: AT, email: "secret@example.test", certificate_name: "Jane Reader" }];
  const events = [ev("sitting_start", "a", 0), ev("sitting_start", "b", 0)];
  const html = render(build({ events, surveys: [], profiles: [], graduates }, { from: FROM, to: TO, preparedAt: "2026-10-26T00:00:00.000Z" }));
  assert.doesNotMatch(html, /secret@example\.test|Jane Reader/);
  assert.doesNotMatch(html, /<img|logo/i);
  assert.match(html, /Prepared for the<br><strong>Southern Africa-Indian Ocean Division<\/strong>/);
  assert.match(html, /1 July 2026 to 30 September 2026/);
  assert.match(html, /fewer than 5/);
  assert.equal((html.match(/class="sid-page/g) || []).length, 6);
});

test("sample reports are labelled on every page", () => {
  const html = render(build({ events: [], surveys: [], profiles: [] }, { from: FROM, to: TO, sample: true }));
  assert.equal((html.match(/Sample data: these are not real figures/g) || []).length, 6);
});

test("the welcome count only includes readers who answered the questions", () => {
  const profiles = [
    ...people(5).map((u) => ({ user_id: u, found_via: "I teach it", study_mode: "", created_at: AT })),
    { user_id: "consent-only", found_via: "", study_mode: "", created_at: AT },
    { user_id: "ref-only", found_via: "", study_mode: "", created_at: AT }
  ];
  const f = build({ events: [], surveys: [], profiles }, { from: FROM, to: TO });
  assert.equal(f.reach.welcome, 5);
});

test("a period older than the guest retention window is flagged", () => {
  const old = build({ events: [], surveys: [], profiles: [] }, { from: FROM, to: TO, guestCutoff: "2026-07-28T00:00:00.000Z" });
  assert.equal(old.incomplete.length, 1);
  assert.match(old.incomplete[0], /guest activity before 28 July 2026 has already been deleted/);
  const fresh = build({ events: [], surveys: [], profiles: [] }, { from: FROM, to: TO, guestCutoff: "2026-06-01T00:00:00.000Z" });
  assert.equal(fresh.incomplete.length, 0);
  assert.match(render(old), /class="sid-warn">Activity by guests/);
});

test("the report says study figures cover consenting readers only and labels the final sitting honestly", () => {
  const html = render(build({ events: [], surveys: [], profiles: [] }, { from: FROM, to: TO }));
  assert.match(html, /count only readers who allowed anonymous study analytics/);
  assert.match(html, /finished the final sitting \(Daniel 10–12\)/);
  assert.doesNotMatch(html, /finished all eleven sittings|new reader accounts/);
});
