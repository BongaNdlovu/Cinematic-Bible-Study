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

const mockClient = {
  from: () => ({
    select: () => ({
      eq: () => ({
        eq: () => ({
          order: () => ({
            limit: () => (reviewReject ? Promise.reject(reviewReject) : Promise.resolve(reviewReply))
          })
        })
      })
    }),
    update: () => ({
      eq: () => Promise.resolve(updateReply)
    }),
    insert: () => Promise.resolve({ error: { message: "fail" } })
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
    getUser: () => ({ id: "mod-1" }),
    isModerator: () => true,
    displayName: () => "Moderator",
    ready: () => Promise.resolve(),
    onChange: () => {}
  },
  addEventListener: () => {}
};

new Function(fs.readFileSync(path.join(ROOT, "js/shared/reviews.js"), "utf8"))();

await global.window.ScrollReviews.loadApproved();
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

console.log("reviews load and approve failures stay visible");
