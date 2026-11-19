import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { absoluteUrls, linkRuns, mergePage } from "../../tools/merge-release-css.mjs";

function stageWith(files) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "merge-css-"));
  for (const [rel, body] of Object.entries(files)) {
    fs.mkdirSync(path.join(dir, path.dirname(rel)), { recursive: true });
    fs.writeFileSync(path.join(dir, rel), body);
  }
  return dir;
}

test("relative urls become site paths; data, fragment, absolute and external urls are kept", () => {
  const css = '.a{background:url("../../assets/site/hall-bg.jpg")} .b{background:url(data:image/png;base64,AA)} .c{fill:url(#g)} .d{x:url(/x.png)} .e{x:url(https://e.test/y.png)}';
  const out = absoluteUrls(css, "css/core/site.css");
  assert.match(out, /url\("\/assets\/site\/hall-bg\.jpg"\)/);
  assert.match(out, /url\(data:image\/png;base64,AA\)/);
  assert.match(out, /url\(#g\)/);
  assert.match(out, /url\(\/x\.png\)/);
  assert.match(out, /url\(https:\/\/e\.test\/y\.png\)/);
});

test("only unbroken runs of two or more plain local stylesheet links are merged", () => {
  const lines = [
    '  <link rel="stylesheet" href="css/a.css?v=1">',
    '  <script src="x.js"></script>',
    '  <link rel="stylesheet" href="css/b.css">',
    '  <link rel="stylesheet" href="css/c.css">',
    '  <link rel="stylesheet" href="https://fonts.example/f.css">',
    '  <link rel="stylesheet" href="css/d.css" media="print">',
    '  <link rel="stylesheet" href="css/e.css">',
    '  <link rel="stylesheet" href="css/f.css">'
  ];
  const runs = linkRuns(lines);
  assert.deepEqual(runs.map((r) => r.files), [["css/b.css", "css/c.css"], ["css/e.css", "css/f.css"]]);
});

test("a merged page keeps the cascade order and its other tags", () => {
  const dir = stageWith({
    "page.html": [
      "<head>",
      '  <link rel="stylesheet" href="css/one.css">',
      '  <link rel="stylesheet" href="css/two.css">',
      '  <script src="s.js"></script>',
      '  <link rel="stylesheet" href="css/three.css">',
      '  <link rel="stylesheet" href="css/sub/four.css">',
      "</head>"
    ].join("\r\n"),
    "css/one.css": ".x{color:red}",
    "css/two.css": ".x{color:blue}",
    "css/three.css": ".y{color:green}",
    "css/sub/four.css": '.z{background:url("../img.png")}'
  });
  const made = mergePage(dir, "page.html");
  assert.deepEqual(made.map((m) => m.bundle), ["css/bundles/page-1.css", "css/bundles/page-2.css"]);
  const html = fs.readFileSync(path.join(dir, "page.html"), "utf8");
  assert.ok(html.includes("\r\n"), "line endings are kept");
  assert.deepEqual(html.split(/\r?\n/), [
    "<head>",
    '  <link rel="stylesheet" href="css/bundles/page-1.css">',
    '  <script src="s.js"></script>',
    '  <link rel="stylesheet" href="css/bundles/page-2.css">',
    "</head>"
  ]);
  const first = fs.readFileSync(path.join(dir, "css/bundles/page-1.css"), "utf8");
  assert.ok(first.indexOf("color:red") < first.indexOf("color:blue"), "later files still win");
  const second = fs.readFileSync(path.join(dir, "css/bundles/page-2.css"), "utf8");
  assert.match(second, /url\("\/css\/img\.png"\)/);
});

test("the deploy merges stylesheets before minifying and hashing them", () => {
  const script = fs.readFileSync(new URL("../../tools/deploy-cloudflare-pages.ps1", import.meta.url), "utf8");
  const merge = script.indexOf("merge-release-css.mjs");
  const minify = script.indexOf("minify-release-css.mjs");
  const hash = script.indexOf("hash-release-assets.mjs");
  assert.ok(merge > 0 && merge < minify && minify < hash);
});
