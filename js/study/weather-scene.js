(function (root) {
  'use strict';

  var PAL_LIGHT = { rain: '62,78,98', fog: '196,200,204', cloud: '44,50,60', flash: '255,255,255', bolt: '255,255,255', glow: '150,180,235', mote: '150,110,40', light: true };
  var PAL_DARK = { rain: '188,204,222', fog: '150,158,170', cloud: '6,8,12', flash: '215,228,255', bolt: '240,246,255', glow: '160,195,255', mote: '240,228,201', light: false };

  function lerp(a, b, t) {
    return a + (b - a) * Math.max(0, Math.min(1, t));
  }

  function boltPath(x0, y0, x1, y1, spread, depth, out) {
    if (depth === 0) { out.push({ x: x1, y: y1 }); return; }
    var mx = (x0 + x1) / 2 + (Math.random() - 0.5) * spread;
    var my = (y0 + y1) / 2 + (Math.random() - 0.5) * spread * 0.25;
    boltPath(x0, y0, mx, my, spread * 0.55, depth - 1, out);
    boltPath(mx, my, x1, y1, spread * 0.55, depth - 1, out);
  }

  function makeBolt(w, h, x0) {
    var x1 = x0 + (Math.random() - 0.5) * w * 0.22;
    var y1 = h * (0.55 + Math.random() * 0.35);
    var main = [{ x: x0, y: -10 }];
    boltPath(x0, -10, x1, y1, w * 0.1, 7, main);
    var branches = [];
    var n = 2 + Math.floor(Math.random() * 3);
    for (var i = 0; i < n; i++) {
      var s = main[Math.floor(main.length * (0.15 + Math.random() * 0.55))];
      var pts = [{ x: s.x, y: s.y }];
      boltPath(s.x, s.y, s.x + (Math.random() - 0.5) * w * 0.22, s.y + h * (0.08 + Math.random() * 0.18), w * 0.04, 5, pts);
      branches.push(pts);
    }
    return { main: main, branches: branches };
  }

  function strokePath(ctx, pts) {
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (var i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
    ctx.stroke();
  }

  function create(canvas) {
    var ctx = canvas.getContext('2d');
    var state = { type: 'quiet', atmosphere: 0, light: false };
    var frameId = null;
    var particles = [];
    var motes = [];
    var fogBanks = [];
    var lightning = 0;
    var nextStrikeAt = 0;
    var activeBolt = null;
    var strikeX = 0;
    var strikePulses = [];
    var splashes = [];
    var gust = 0;
    var lastFrame = 0;

    function seed(w, h) {
      particles = Array.from({ length: 640 }, function () {
        return {
          x: Math.random() * (w + 300),
          y: Math.random() * h,
          z: Math.pow(Math.random(), 1.7)
        };
      });
      motes = Array.from({ length: 46 }, function () {
        return {
          x: Math.random() * w,
          y: Math.random() * h,
          r: 0.6 + Math.random() * 1.4,
          vx: -4 + Math.random() * 8,
          vy: -3 + Math.random() * 4,
          phase: Math.random() * Math.PI * 2
        };
      });
      fogBanks = Array.from({ length: 9 }, function (_, i) {
        return {
          x: Math.random() * w,
          y: h * (0.4 + Math.random() * 0.6),
          rx: w * (0.28 + Math.random() * 0.3),
          ry: h * (0.1 + Math.random() * 0.12),
          speed: 6 + Math.random() * 12,
          a: 0.6 + Math.random() * 0.4,
          phase: i * 1.7
        };
      });
    }

    function draw() {
      var w = canvas.width, h = canvas.height;
      ctx.clearRect(0, 0, w, h);
      if (state.type === 'off') {
        frameId = null;
        return;
      }

      var v = state.atmosphere;
      var building = state.type === 'building' ? 1 : Math.max(0, 1 - Math.abs(v - 0.34) / 0.18);
      var storm = state.type === 'storm' ? 1 : Math.max(0, 1 - Math.abs(v - 0.58) / 0.28);
      var sun = state.type === 'sunshine' ? 1 : Math.max(0, (v - 0.76) / 0.24);
      var quiet = state.type === 'quiet' ? 1 : Math.max(0, 1 - v / 0.22);
      var t = performance.now();
      var dt = lastFrame ? Math.min(0.05, (t - lastFrame) / 1000) : 0.016;
      lastFrame = t;
      var pal = state.light ? PAL_LIGHT : PAL_DARK;
      gust = lerp(gust, (building * 0.45 + storm * 1) * (0.75 + Math.sin(t / 2300) * 0.25), 0.02);

      var overcast = (0.05 + building * 0.1 + storm * 0.22) * (1 - sun * 0.8) * (pal.light ? 0.7 : 1);
      var sky = ctx.createLinearGradient(0, 0, 0, h);
      sky.addColorStop(0, 'rgba(' + pal.cloud + ',' + overcast * 1.6 + ')');
      sky.addColorStop(0.5, 'rgba(' + pal.cloud + ',' + overcast * 0.7 + ')');
      sky.addColorStop(1, 'rgba(' + pal.cloud + ',' + overcast * 0.4 + ')');
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, w, h);

      var cloudA = (0.03 + building * 0.1 + storm * 0.2) * (1 - sun * 0.7);
      for (var i = 0; i < 10; i++) {
        var x = ((i * w / 6 + t * (0.006 + i * 0.0009) * (0.5 + gust)) % (w + 700)) - 350;
        var y = 20 + (i % 5) * 42;
        var r = 220 + (i % 4) * 90;
        var g = ctx.createRadialGradient(x, y, 0, x, y, r);
        g.addColorStop(0, 'rgba(' + pal.cloud + ',' + cloudA + ')');
        g.addColorStop(1, 'rgba(' + pal.cloud + ',0)');
        ctx.fillStyle = g;
        ctx.save(); ctx.translate(x, y); ctx.scale(1.8, 0.6); ctx.translate(-x, -y);
        ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      }

      var now = t / 1000;
      if (storm > 0.55) {
        if (!nextStrikeAt) nextStrikeAt = now + 1.5 + Math.random() * 2.5;
        if (now >= nextStrikeAt) {
          strikeX = w * (0.1 + Math.random() * 0.8);
          strikePulses = [now, now + 0.5 + Math.random() * 0.25];
          activeBolt = Math.random() < 0.55 ? makeBolt(w, h, strikeX) : null;
          nextStrikeAt = now + 6 + Math.random() * 9;
        }
      } else {
        nextStrikeAt = 0;
      }
      lightning = 0;
      strikePulses.forEach(function (p0, k) {
        var age = now - p0;
        if (age >= 0 && age < 0.8) lightning = Math.max(lightning, (k === 0 ? 1 : 0.55) * Math.exp(-age * 9));
      });
      if (lightning > 0.01) {
        var fg = ctx.createRadialGradient(strikeX, 0, 0, strikeX, 0, Math.max(w, h) * 0.95);
        fg.addColorStop(0, 'rgba(' + pal.flash + ',' + 0.3 * lightning + ')');
        fg.addColorStop(0.45, 'rgba(' + pal.flash + ',' + 0.1 * lightning + ')');
        fg.addColorStop(1, 'rgba(' + pal.flash + ',0)');
        ctx.fillStyle = fg;
        ctx.fillRect(0, 0, w, h);
      }
      if (activeBolt && lightning > 0.03) {
        ctx.save();
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.shadowColor = 'rgba(' + pal.glow + ',0.9)';
        ctx.shadowBlur = 24;
        ctx.strokeStyle = 'rgba(' + pal.glow + ',' + 0.35 * lightning + ')';
        ctx.lineWidth = 6;
        strokePath(ctx, activeBolt.main);
        ctx.shadowBlur = 10;
        ctx.strokeStyle = 'rgba(' + pal.bolt + ',' + lightning + ')';
        ctx.lineWidth = 1.8;
        strokePath(ctx, activeBolt.main);
        ctx.lineWidth = 0.9;
        ctx.strokeStyle = 'rgba(' + pal.bolt + ',' + 0.6 * lightning + ')';
        activeBolt.branches.forEach(function (b) { strokePath(ctx, b); });
        ctx.restore();
      } else if (lightning <= 0.03 && strikePulses.length && now > strikePulses[strikePulses.length - 1] + 0.8) {
        activeBolt = null;
        strikePulses = [];
      }

      var rainAmt = Math.min(1, storm + building * 0.25);
      if (rainAmt > 0.03) {
        var windX = -50 - 240 * gust;
        var count = Math.floor(particles.length * rainAmt);
        ctx.lineCap = 'round';
        for (var j = 0; j < count; j++) {
          var p = particles[j];
          var vy = 900 + 1500 * p.z;
          var vx = windX * (0.6 + 0.4 * p.z);
          p.x += vx * dt;
          p.y += vy * dt;
          if (p.y > h + 40) {
            if (p.z > 0.6 && rainAmt > 0.5 && splashes.length < 70) {
              splashes.push({ x: p.x, y: h - 2 - Math.random() * h * 0.05, r: 0.6, a: 0.45 * p.z });
            }
            p.y = -40 - Math.random() * 80;
            p.x = Math.random() * (w + 300);
          }
          if (p.x < -40) p.x += w + 300;
          var len = (0.016 + 0.012 * p.z) * vy;
          ctx.strokeStyle = 'rgba(' + pal.rain + ',' + (0.06 + 0.32 * p.z) * rainAmt * (1 + lightning * 0.8) + ')';
          ctx.lineWidth = 0.5 + 1.3 * p.z;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p.x - (vx / vy) * len, p.y - len);
          ctx.stroke();
        }
        splashes = splashes.filter(function (s) { return s.a > 0.02; });
        ctx.lineWidth = 0.7;
        splashes.forEach(function (s) {
          ctx.strokeStyle = 'rgba(' + pal.rain + ',' + s.a + ')';
          ctx.beginPath(); ctx.ellipse(s.x, s.y, s.r * 2.4, s.r * 0.7, 0, 0, Math.PI * 2); ctx.stroke();
          s.r += 24 * dt;
          s.a *= Math.pow(0.015, dt);
        });
      }

      var fogAmt = quiet * 0.55 + building * 0.9 + storm * 0.7 + sun * 0.12;
      if (fogAmt > 0.03) {
        fogBanks.forEach(function (f) {
          f.x -= (f.speed + 36 * gust) * dt;
          if (f.x + f.rx < 0) { f.x = w + f.rx; f.y = h * (0.4 + Math.random() * 0.6); }
          var a = 0.19 * fogAmt * f.a * (0.75 + 0.25 * Math.sin(t / 4200 + f.phase));
          ctx.save();
          ctx.translate(f.x, f.y);
          ctx.scale(1, f.ry / f.rx);
          var bank = ctx.createRadialGradient(0, 0, 0, 0, 0, f.rx);
          bank.addColorStop(0, 'rgba(' + pal.fog + ',' + a + ')');
          bank.addColorStop(0.6, 'rgba(' + pal.fog + ',' + a * 0.45 + ')');
          bank.addColorStop(1, 'rgba(' + pal.fog + ',0)');
          ctx.fillStyle = bank;
          ctx.beginPath(); ctx.arc(0, 0, f.rx, 0, Math.PI * 2); ctx.fill();
          ctx.restore();
        });
        var haze = ctx.createLinearGradient(0, h * 0.55, 0, h);
        haze.addColorStop(0, 'rgba(' + pal.fog + ',0)');
        haze.addColorStop(1, 'rgba(' + pal.fog + ',' + 0.15 * fogAmt + ')');
        ctx.fillStyle = haze;
        ctx.fillRect(0, h * 0.55, w, h * 0.45);
      }

      if (sun > 0.04) {
        ctx.save();
        ctx.globalCompositeOperation = 'screen';
        var sx = w * 0.82, sy = h * 0.12;
        var sg = ctx.createRadialGradient(sx, sy, 0, sx, sy, Math.max(w, h) * 0.55);
        sg.addColorStop(0, 'rgba(255,226,150,' + 0.28 * sun + ')');
        sg.addColorStop(0.2, 'rgba(255,210,120,' + 0.12 * sun + ')');
        sg.addColorStop(1, 'rgba(255,200,110,0)');
        ctx.fillStyle = sg; ctx.fillRect(0, 0, w, h);
        ctx.translate(sx, sy);
        for (var k = 0; k < 7; k++) {
          ctx.rotate(0.09);
          ctx.globalAlpha = 0.035 * sun;
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(-90 + k * 28, h);
          ctx.lineTo(-40 + k * 28, h);
          ctx.closePath();
          ctx.fillStyle = '#ffe4a8';
          ctx.fill();
        }
        ctx.restore();
      }

      var moteAmt = Math.max(quiet, sun * 0.7);
      if (moteAmt > 0.2) {
        motes.forEach(function (m) {
          m.x += (m.vx + Math.sin(t / 3100 + m.phase) * 3) * dt;
          m.y += (m.vy + Math.cos(t / 2700 + m.phase) * 2) * dt;
          if (m.x < -5) m.x = w + 5; else if (m.x > w + 5) m.x = -5;
          if (m.y < -5) m.y = h + 5; else if (m.y > h + 5) m.y = -5;
          ctx.fillStyle = 'rgba(' + pal.mote + ',' + 0.3 * moteAmt * (0.4 + 0.6 * Math.abs(Math.sin(t / 1900 + m.phase))) + ')';
          ctx.beginPath(); ctx.arc(m.x, m.y, m.r, 0, Math.PI * 2); ctx.fill();
        });
      }

      frameId = root.requestAnimationFrame(draw);
    }

    return {
      resize: function (width, height, viewW, viewH) {
        canvas.width = width;
        canvas.height = height;
        seed(viewW, viewH);
      },
      setState: function (next) {
        state.type = next.type;
        state.atmosphere = next.atmosphere;
        state.light = !!next.light;
      },
      start: function () {
        if (frameId === null && state.type !== 'off') frameId = root.requestAnimationFrame(draw);
      },
      stop: function () {
        if (frameId !== null) root.cancelAnimationFrame(frameId);
        frameId = null;
      }
    };
  }

  function apply(scene, msg) {
    if (msg.size) scene.resize(msg.size[0], msg.size[1], msg.size[2], msg.size[3]);
    if (msg.state) scene.setState(msg.state);
    if (msg.run === true) scene.start();
    if (msg.run === false) scene.stop();
  }

  root.WeatherScene = { create: create, apply: apply };

  if (typeof root.document === 'undefined' && typeof root.postMessage === 'function') {
    var scene = null;
    root.addEventListener('message', function (e) {
      var msg = e.data || {};
      if (msg.canvas) scene = create(msg.canvas);
      if (scene) apply(scene, msg);
    });
  }
})(self);
