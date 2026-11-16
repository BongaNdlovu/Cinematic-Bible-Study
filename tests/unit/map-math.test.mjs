import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const src = fs.readFileSync(new URL("../../js/pages/map/map-math.js", import.meta.url), "utf8");
const sandbox = { window: {}, Math, String, parseFloat, Number };
vm.runInNewContext(src, sandbox);
const M = sandbox.window.MapMath;

test("clamp keeps a value inside its range", () => {
  assert.equal(M.clamp(5, 0, 3), 3);
  assert.equal(M.clamp(-1, 0, 3), 0);
  assert.equal(M.clamp(2, 0, 3), 2);
});

test("tileZoom prefers the camera's own tile zoom, then steps by camera zoom", () => {
  assert.equal(M.tileZoom({ camera: { tileZoom: 9 } }), 9);
  assert.equal(M.tileZoom({ camera: { zoom: 3 } }), 7);
  assert.equal(M.tileZoom({ camera: { zoom: 2.5 } }), 6);
  assert.equal(M.tileZoom({ camera: { zoom: 2.1 } }), 5);
  assert.equal(M.tileZoom({}), 5);
  assert.equal(M.tileZoom({ camera: { zoom: 1 } }), 4);
});

test("haversineKm measures great-circle distance", () => {
  assert.equal(M.haversineKm(0, 0, 0, 0), 0);
  const quarter = M.haversineKm(0, 0, 0, 90);
  assert.ok(Math.abs(quarter - 10007.5) < 1, String(quarter));
});

test("distanceText uses metres under one kilometre and adds miles above", () => {
  assert.equal(M.distanceText(0.25), "250 m");
  assert.equal(M.distanceText(1000), "1,000 km (621 mi)");
});

test("scrub year labels and the prophetic periods", () => {
  assert.equal(M.scrubYearLabel(-457), "457 B.C.");
  assert.equal(M.scrubYearLabel(31), "A.D. 31");
  assert.equal(M.yearsComplete(-457), 0);
  assert.equal(M.yearsComplete(27), 483);
  assert.match(M.scrubPeriod(-500), /^Before the decree/);
  assert.match(M.scrubPeriod(-440), /^Seven weeks/);
  assert.match(M.scrubPeriod(10), /^Sixty-two weeks/);
  assert.match(M.scrubPeriod(30), /^The seventieth week/);
  assert.match(M.scrubPeriod(1000), /^After the seventy weeks/);
  assert.match(M.scrubPeriod(1844), /^Autumn 1844/);
});

test("globeDistance steps in as tile zoom rises", () => {
  assert.equal(JSON.stringify([3, 5, 6, 7].map(M.globeDistance)), "[3,2.6,2.25,2]");
});

test("worldPx maps the origin to the centre of the world square", () => {
  const p = M.worldPx(0, 0, 0);
  assert.equal(p.x, 128);
  assert.ok(Math.abs(p.y - 128) < 1e-9);
  assert.ok(Number.isFinite(M.worldPx(90, 0, 1).y));
});

test("fillStyle reads the empire's fill colour and scales its opacity", () => {
  const s = M.fillStyle({ fill: "rgba(10,20,30,0.5)", stroke: "#000" }, 0.5);
  assert.equal(s.fillColor, "rgb(10,20,30)");
  assert.equal(s.fillOpacity, 0.25);
  assert.equal(s.color, "#000");
  assert.equal(M.fillStyle(null).fillOpacity, 0.42);
});

test("chaikinRing doubles the points each pass and closes the ring", () => {
  const square = [[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]];
  const once = M.chaikinRing(square, 1);
  assert.equal(once.length, 9);
  assert.equal(JSON.stringify(once[0]), JSON.stringify(once[once.length - 1]));
  assert.equal(JSON.stringify(once[0]), "[0.25,0]");
  const tri = [[0, 0], [1, 0], [0, 1], [0, 0]];
  assert.equal(M.chaikinRing(tri, 2), tri);
});

test("smoothGeom smooths polygons and leaves other shapes alone", () => {
  const square = [[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]];
  assert.equal(M.smoothGeom({ type: "Polygon", coordinates: [square] }).coordinates[0].length, 9);
  assert.equal(M.smoothGeom({ type: "MultiPolygon", coordinates: [[square]] }).coordinates[0][0].length, 9);
  const point = { type: "Point", coordinates: [0, 0] };
  assert.equal(M.smoothGeom(point), point);
  const f = M.smoothFeature({ properties: { a: 1 }, geometry: point });
  assert.equal(f.type, "Feature");
  assert.equal(JSON.stringify(f.properties), JSON.stringify({ a: 1 }));
});
