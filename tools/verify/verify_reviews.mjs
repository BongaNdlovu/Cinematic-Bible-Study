import assert from "assert";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const els = {};

function node(tag, id) {
  const created = {
    tagName: String(tag || "div").toUpperCase(),
    className: "",
    textContent: "",
    hidden: false,
    innerHTML: "",
    children: [],
    dataset: {},
    attributes: {},
    _id: "",
    setAttribute: function (key, value) { this.attributes[key] = value; },
    appendChild: function (child) { this.children.push(child); return child; },
    insertBefore: function (child) { this.children.unshift(child); return child; },
    querySelector: function () { return null; },
    querySelectorAll: function () { return []; },
    addEventListener: function () {}
  };
  Object.defineProperty(created, "id", {
    get: function () { return this._id; },
    set: function (value) {
      this._id = String(value || "");
      if (this._id) els[this._id] = created;
    }
  });
  if (id) created.id = id;
  return created;
}

els["witness-list"] = node("div", "witness-list");
els["witness-empty"] = node("p", "witness-empty");
els["witness-marquee"] = node("div", "witness-marquee");
els["witness-queue"] = node("div", "witness-queue");
els["witness-queue-list"] = node("div", "witness-queue-list");

let reviewReply = { data: [], error: null };
let reviewReject = null;
let updateReply = { error: null };
const rpcCalls = [];
const inserts = [];
let signedInUser = { id: "mod-1" };

const mockClient = {
  rpc: (name, args) => {
    rpcCalls.push(name);
    if (name === "exhibit_public_review_count") return Promise.resolve({ data: 0, error: null });
    assert.strictEqual(name, "exhibit_public_reviews");
    assert.ok(args && args.p_limit > 0);
    return reviewReject ? Promise.reject(reviewReject) : Promise.resolve(reviewReply);
  },
  from: () => ({
    select: () => ({
      eq: () => ({
        eq: () => ({
          order: () => ({
            limit: () => Promise.resolve({ data: [], error: null })
          })
        })
      })
    }),
    update: () => ({
      eq: () => Promise.resolve(updateReply)
    }),
    insert: (row) => {
      inserts.push(row);
      return Promise.resolve({ error: { message: "fail" } });
    }
  })
};

global.document = {
  readyState: "complete",
  addEventListener: () => {},
  getElementById: (id) => (id === "witnesses" ? null : (els[id] || null)),
  querySelectorAll: () => [],
  createElement: (tag) => node(tag)
};
global.window = {
  ScrollAuth: {
    getClient: () => mockClient,
    getUser: () => signedInUser,
    isModerator: () => true,
    displayName: () => "Moderator",
    ready: () => Promise.resolve(),
    onChange: () => {}
  },
  addEventListener: () => {}
};

new Function(fs.readFileSync(path.join(ROOT, "js/shared/reviews.js"), "utf8"))();

await global.window.ScrollReviews.loadApproved();
assert.deepStrictEqual(rpcCalls, ["exhibit_public_reviews"]);
assert.strictEqual(els["witness-empty"].hidden, false);
assert.strictEqual(els["witness-empty"].textContent, "No notes yet. Sign in after a sitting if you want to leave the first one.");
assert.strictEqual(els["witness-list"].hidden, true);
assert.strictEqual(els["witness-list"].children.length, 0);

reviewReply = { data: null, error: { message: "down" } };
await global.window.ScrollReviews.loadApproved();
assert.strictEqual(els["witness-empty"].textContent, "Could not load reviews.");
assert.strictEqual(els["witness-list"].children.length, 0);
assert.ok(!els["witness-empty"].textContent.includes("Nokuthula"));

reviewReject = new Error("network");
await global.window.ScrollReviews.loadApproved();
assert.strictEqual(els["witness-empty"].textContent, "Could not load reviews.");
reviewReject = null;

updateReply = { error: { message: "down" } };
const updated = await global.window.ScrollReviews.setReviewFlags("rev-1", true, false);
assert.strictEqual(updated, false);
assert.strictEqual(els["witness-queue-status"].textContent, "Could not update that review. Try again.");

const NOTE = "This sitting finally made the 2,300 days make sense to our whole group.";
const submit = global.window.ScrollReviews.submitReview;

signedInUser = { id: "u-1", email: "jane.smith1987@gmail.com", user_metadata: { full_name: "Jane Mary Smith" } };
await submit(NOTE, { rating: 5 });
assert.strictEqual(inserts.pop().display_name, "Jane");

signedInUser = { id: "u-2", email: "jane.smith1987@gmail.com", user_metadata: { given_name: "Janie", full_name: "Jane Smith" } };
await submit(NOTE, { rating: 5 });
assert.strictEqual(inserts.pop().display_name, "Janie");

signedInUser = { id: "u-3", email: "jane.smith1987@gmail.com", user_metadata: {} };
await submit(NOTE, { rating: 5 });
assert.strictEqual(inserts.pop().display_name, "Student");

await submit(NOTE, { rating: 5, name: "  " });
assert.strictEqual(inserts.pop().display_name, "Student");

await submit(NOTE, { rating: 5, name: " J. S. " });
assert.strictEqual(inserts.pop().display_name, "J. S.");

console.log("reviews load and approve failures stay visible; public names default to a first name, never the email");
