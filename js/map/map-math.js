(function () {
  function tileZoom(ep) {
    if (ep.camera && ep.camera.tileZoom) return ep.camera.tileZoom;
    const z = (ep.camera && ep.camera.zoom) || 2.2;
    if (z >= 3) return 7;
    if (z >= 2.5) return 6;
    if (z >= 2.1) return 5;
    return 4;
  }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function fillStyle(emp, opacity) {
    const m = String((emp && emp.fill) || "rgba(212,175,55,0.42)").match(/[\d.]+/g) || ["212", "175", "55", "0.42"];
    const op = (parseFloat(m[3] || "0.42")) * (opacity == null ? 1 : opacity);
    return {
      color: (emp && emp.stroke) || "#f3d98a",
      weight: 2.4,
      fillColor: "rgb(" + m[0] + "," + m[1] + "," + m[2] + ")",
      fillOpacity: op,
      opacity: 1,
      lineJoin: "round",
      lineCap: "round"
    };
  }
  function chaikinRing(ring, iters) {
    let pts = ring.slice();
    if (pts.length > 1 && pts[0][0] === pts[pts.length - 1][0] && pts[0][1] === pts[pts.length - 1][1]) {
      pts = pts.slice(0, -1);
    }
    if (pts.length < 4) return ring;
    for (let n = 0; n < iters; n++) {
      const next = [];
      for (let i = 0; i < pts.length; i++) {
        const a = pts[i];
        const b = pts[(i + 1) % pts.length];
        next.push([a[0] * 0.75 + b[0] * 0.25, a[1] * 0.75 + b[1] * 0.25]);
        next.push([a[0] * 0.25 + b[0] * 0.75, a[1] * 0.25 + b[1] * 0.75]);
      }
      pts = next;
    }
    pts.push(pts[0]);
    return pts;
  }
  function smoothGeom(geom) {
    const walk = (poly) => poly.map((ring) => chaikinRing(ring, ring.length > 24 ? 2 : 1));
    if (geom.type === "Polygon") return { type: "Polygon", coordinates: walk(geom.coordinates) };
    if (geom.type === "MultiPolygon") return { type: "MultiPolygon", coordinates: geom.coordinates.map(walk) };
    return geom;
  }
  function smoothFeature(f) {
    return { type: "Feature", properties: f.properties, geometry: smoothGeom(f.geometry) };
  }
  function haversineKm(lat1, lon1, lat2, lon2) {
    const rad = Math.PI / 180;
    const dLat = (lat2 - lat1) * rad;
    const dLon = (lon2 - lon1) * rad;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(dLon / 2) ** 2;
    return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }
  function distanceText(km) {
    if (km < 1) return Math.round(km * 1000).toLocaleString("en-US") + " m";
    return Math.round(km).toLocaleString("en-US") + " km (" + Math.round(km * 0.621371).toLocaleString("en-US") + " mi)";
  }
  function scrubYearLabel(y) {
    return y < 0 ? (-y) + " B.C." : "A.D. " + y;
  }
  function yearsComplete(y) {
    return y < 0 ? 457 + y : 456 + y;
  }
  function scrubPeriod(y) {
    const c = yearsComplete(y);
    if (y < -457) return "Before the decree — the 2,300 years have not begun";
    if (c < 49) return "Seven weeks — Jerusalem restored and built, 457–408 B.C. (Dan. 9:25)";
    if (c < 483) return "Sixty-two weeks — unto Messiah the Prince, A.D. 27";
    if (c < 490) return "The seventieth week — A.D. 27–34; cut off in the midst, A.D. 31";
    if (c < 2300) return "After the seventy weeks — 1,810 years reach to 1844";
    return "Autumn 1844 — then shall the sanctuary be cleansed (Dan. 8:14)";
  }
  function globeDistance(z) {
    if (z >= 7) return 2.0;
    if (z >= 6) return 2.25;
    if (z >= 5) return 2.6;
    return 3.0;
  }
  function worldPx(lat, lon, z) {
    const size = 256 * Math.pow(2, z);
    const r = clamp(lat, -84, 84) * Math.PI / 180;
    return {
      x: ((lon + 180) / 360) * size,
      y: ((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2) * size
    };
  }

  window.MapMath = Object.freeze({ tileZoom, clamp, fillStyle, chaikinRing, smoothGeom, smoothFeature, haversineKm, distanceText, scrubYearLabel, yearsComplete, scrubPeriod, globeDistance, worldPx });
})();
