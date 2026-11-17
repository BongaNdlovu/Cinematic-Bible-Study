import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const src = fs.readFileSync(new URL("../../js/pages/study/certificate-pdf.js", import.meta.url), "utf8");
const sandbox = { window: {}, Uint8Array, atob };
vm.runInNewContext(src, sandbox);
const P = sandbox.window.CertificatePdf;
const text = (bytes) => Array.from(bytes, (b) => String.fromCharCode(b)).join("");

test("the canvas is twice the PDF page in each direction", () => {
  assert.equal(P.CANVAS_W, 1684);
  assert.equal(P.CANVAS_H, 1190);
});

test("jpegBytesFromCanvas decodes the canvas's JPEG data URL", () => {
  const canvas = { toDataURL: (type, quality) => "data:" + type + ";q=" + quality + ";base64," + Buffer.from([1, 2, 255]).toString("base64") };
  assert.deepEqual(Array.from(P.jpegBytesFromCanvas(canvas)), [1, 2, 255]);
});

test("buildPdf writes one A4 landscape page around the JPEG", () => {
  const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xd9]);
  const pdf = text(P.buildPdf(jpeg));
  assert.ok(pdf.startsWith("%PDF-"), pdf.slice(0, 12));
  assert.ok(pdf.includes("/MediaBox [0 0 842 595]"));
  assert.ok(pdf.includes("/Width 1684") && pdf.includes("/Height 1190"));
  assert.ok(pdf.includes("/Filter /DCTDecode"));
  assert.ok(pdf.includes("\xff\xd8\xff\xd9"), "the JPEG bytes are embedded unchanged");
  assert.ok(/startxref\n\d+\n%%EOF/.test(pdf));
});
