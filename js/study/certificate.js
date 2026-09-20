(function () {
  const NAME_KEY = "daniel_certificate_name";
  const MAX_NAME = 80;
  const PAGE_W = 842;
  const PAGE_H = 595;
  const CANVAS_W = 1684;
  const CANVAS_H = 1190;

  function asciiBytes(text) {
    const out = new Uint8Array(text.length);
    for (let i = 0; i < text.length; i += 1) out[i] = text.charCodeAt(i) & 0xff;
    return out;
  }

  function concatBytes(parts) {
    let total = 0;
    for (let i = 0; i < parts.length; i += 1) total += parts[i].length;
    const out = new Uint8Array(total);
    let offset = 0;
    for (let i = 0; i < parts.length; i += 1) {
      out.set(parts[i], offset);
      offset += parts[i].length;
    }
    return out;
  }

  function sanitizeName(raw) {
    const source = String(raw || "");
    let cleaned = "";
    for (let i = 0; i < source.length; i += 1) {
      const code = source.charCodeAt(i);
      if (code >= 32 && code !== 127) cleaned += source.charAt(i);
    }
    return cleaned.replace(/\s+/g, " ").trim().slice(0, MAX_NAME);
  }

  function filenameFromName(name) {
    const slug = name
      .normalize("NFKD")
      .replace(/[^\w]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40);
    return "Scroll-of-Daniel-Certificate-" + (slug || "Student") + ".pdf";
  }

  function identityName() {
    let name = "";
    try {
      const J = window.BAJourney && typeof window.BAJourney.load === "function"
        ? window.BAJourney.load()
        : null;
      if (J && J.identity && J.identity.name) name = J.identity.name;
    } catch (err) {}
    if (!name && window.ScrollAuth && typeof window.ScrollAuth.displayName === "function") {
      name = window.ScrollAuth.displayName();
    }
    name = sanitizeName(name);
    if (!name || name.indexOf("@") >= 0 || name === "Signed in") return "";
    return name;
  }

  function loadSavedName() {
    try {
      const saved = sanitizeName(localStorage.getItem(NAME_KEY) || "");
      if (saved) return saved;
    } catch (err) {}
    return identityName();
  }

  function saveName(name) {
    try {
      localStorage.setItem(NAME_KEY, name);
    } catch (err) {
      /* private mode */
    }
  }

  function wrapLines(ctx, text, maxWidth) {
    const words = String(text).split(" ");
    const lines = [];
    let line = "";
    for (let i = 0; i < words.length; i += 1) {
      const next = line ? line + " " + words[i] : words[i];
      if (line && ctx.measureText(next).width > maxWidth) {
        lines.push(line);
        line = words[i];
      } else {
        line = next;
      }
    }
    if (line) lines.push(line);
    return lines;
  }

  function goldStroke(ctx, width, alpha) {
    ctx.strokeStyle = "rgba(184, 138, 42, " + (alpha == null ? 1 : alpha) + ")";
    ctx.lineWidth = width;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
  }

  function fillParchment(ctx) {
    const wash = ctx.createLinearGradient(0, 0, CANVAS_W, CANVAS_H);
    wash.addColorStop(0, "#f8efd4");
    wash.addColorStop(0.35, "#f0dfb4");
    wash.addColorStop(0.7, "#e8d09a");
    wash.addColorStop(1, "#dcc48a");
    ctx.fillStyle = wash;
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    const lamp = ctx.createRadialGradient(CANVAS_W * 0.5, 210, 80, CANVAS_W * 0.5, 560, 820);
    lamp.addColorStop(0, "rgba(255, 244, 210, 0.55)");
    lamp.addColorStop(1, "rgba(110, 72, 22, 0.16)");
    ctx.fillStyle = lamp;
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    let seed = 1844;
    function rnd() {
      seed = (seed * 16807) % 2147483647;
      return (seed - 1) / 2147483646;
    }
    for (let i = 0; i < 1400; i += 1) {
      const x = rnd() * CANVAS_W;
      const y = rnd() * CANVAS_H;
      ctx.fillStyle = "rgba(90, 58, 18, " + (0.015 + rnd() * 0.04) + ")";
      ctx.fillRect(x, y, 1 + rnd() * 2, 1 + rnd() * 2);
    }
  }

  function drawCornerFlourish(ctx, x, y, sx, sy) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(sx, sy);
    goldStroke(ctx, 3.2, 0.95);
    ctx.beginPath();
    ctx.moveTo(0, 92);
    ctx.quadraticCurveTo(4, 8, 92, 0);
    ctx.stroke();
    goldStroke(ctx, 1.6, 0.7);
    ctx.beginPath();
    ctx.moveTo(14, 78);
    ctx.quadraticCurveTo(16, 20, 78, 14);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(28, 28, 11, Math.PI * 0.15, Math.PI * 1.65);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(40, 16);
    ctx.quadraticCurveTo(52, 8, 68, 18);
    ctx.moveTo(16, 40);
    ctx.quadraticCurveTo(8, 52, 18, 68);
    ctx.stroke();
    ctx.fillStyle = "#c9a227";
    ctx.beginPath();
    ctx.arc(24, 24, 3.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawFrames(ctx) {
    ctx.save();
    ctx.strokeStyle = "#5c4014";
    ctx.lineWidth = 18;
    ctx.strokeRect(28, 28, CANVAS_W - 56, CANVAS_H - 56);
    goldStroke(ctx, 5, 1);
    ctx.strokeRect(46, 46, CANVAS_W - 92, CANVAS_H - 92);
    goldStroke(ctx, 1.8, 0.75);
    ctx.strokeRect(62, 62, CANVAS_W - 124, CANVAS_H - 124);
    ctx.strokeStyle = "rgba(92, 64, 20, 0.35)";
    ctx.lineWidth = 1;
    ctx.strokeRect(78, 78, CANVAS_W - 156, CANVAS_H - 156);
    ctx.restore();
    drawCornerFlourish(ctx, 88, 88, 1, 1);
    drawCornerFlourish(ctx, CANVAS_W - 88, 88, -1, 1);
    drawCornerFlourish(ctx, 88, CANVAS_H - 88, 1, -1);
    drawCornerFlourish(ctx, CANVAS_W - 88, CANVAS_H - 88, -1, -1);
  }

  function drawCrest(ctx, cx, cy) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(2.15, 2.15);
    ctx.beginPath();
    ctx.moveTo(0, -28);
    ctx.lineTo(-20, -18);
    ctx.lineTo(-20, 2);
    ctx.quadraticCurveTo(-20, 20, 0, 28);
    ctx.quadraticCurveTo(20, 20, 20, 2);
    ctx.lineTo(20, -18);
    ctx.closePath();
    const metal = ctx.createLinearGradient(0, -28, 0, 28);
    metal.addColorStop(0, "#f3d36a");
    metal.addColorStop(0.45, "#c9a227");
    metal.addColorStop(1, "#7a5614");
    ctx.fillStyle = metal;
    ctx.fill();
    ctx.strokeStyle = "#4a3410";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-8, 0);
    ctx.lineTo(-2, 7);
    ctx.lineTo(11, -9);
    ctx.strokeStyle = "#fff6d8";
    ctx.lineWidth = 2.4;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.stroke();
    ctx.restore();
  }

  function drawOrnamentRule(ctx, cx, y, half) {
    ctx.save();
    ctx.translate(cx, y);
    goldStroke(ctx, 1.6, 0.9);
    ctx.beginPath();
    ctx.moveTo(-half, 0);
    ctx.lineTo(-18, 0);
    ctx.moveTo(18, 0);
    ctx.lineTo(half, 0);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-18, 0);
    ctx.quadraticCurveTo(-8, -8, 0, 0);
    ctx.quadraticCurveTo(8, 8, 18, 0);
    ctx.stroke();
    ctx.fillStyle = "#c9a227";
    ctx.beginPath();
    ctx.moveTo(0, -5);
    ctx.lineTo(4.5, 0);
    ctx.lineTo(0, 5);
    ctx.lineTo(-4.5, 0);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function drawSeal(ctx, x, y, dated) {
    ctx.save();
    ctx.translate(x, y);
    ctx.beginPath();
    ctx.arc(0, 0, 62, 0, Math.PI * 2);
    const wax = ctx.createRadialGradient(-16, -18, 8, 0, 8, 64);
    wax.addColorStop(0, "#c45a3a");
    wax.addColorStop(0.55, "#8d2d22");
    wax.addColorStop(1, "#5a1812");
    ctx.fillStyle = wax;
    ctx.fill();
    goldStroke(ctx, 3, 0.85);
    ctx.beginPath();
    ctx.arc(0, 0, 54, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = "#f6e3b0";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = "700 28px Newsreader, Georgia, serif";
    ctx.fillText("XI", 0, -6);
    ctx.font = "600 11px Inter, sans-serif";
    ctx.fillText("SITTINGS", 0, 18);
    ctx.restore();
    ctx.save();
    ctx.fillStyle = "#6b4e16";
    ctx.textAlign = "left";
    ctx.font = "500 15px Inter, sans-serif";
    ctx.fillText("AWARDED", x + 82, y - 8);
    ctx.fillStyle = "#2a2114";
    ctx.font = "600 20px Newsreader, Georgia, serif";
    ctx.fillText(dated, x + 82, y + 20);
    ctx.restore();
  }

  function fitName(ctx, name, maxWidth) {
    let size = 70;
    ctx.font = "italic 700 " + size + "px Newsreader, Georgia, serif";
    while (size > 34 && ctx.measureText(name).width > maxWidth) {
      size -= 2;
      ctx.font = "italic 700 " + size + "px Newsreader, Georgia, serif";
    }
    return size;
  }

  function drawCertificate(name, dated) {
    const canvas = document.createElement("canvas");
    canvas.width = CANVAS_W;
    canvas.height = CANVAS_H;
    const ctx = canvas.getContext("2d");
    const cx = CANVAS_W / 2;
    fillParchment(ctx);
    drawFrames(ctx);
    drawCrest(ctx, cx, 168);

    ctx.textAlign = "center";
    ctx.fillStyle = "#6b4e16";
    ctx.font = "600 15px Inter, sans-serif";
    ctx.letterSpacing = "0.42em";
    ctx.fillText("THE SCROLL OF DANIEL", cx, 248);
    ctx.letterSpacing = "0px";

    ctx.fillStyle = "#1f160c";
    ctx.font = "600 68px Newsreader, Georgia, serif";
    ctx.fillText("Certificate of Completion", cx, 328);
    ctx.fillStyle = "#8a6a22";
    ctx.font = "italic 22px Lora, Georgia, serif";
    ctx.fillText("Eleven sittings  ·  A historicist reading of Daniel", cx, 372);
    drawOrnamentRule(ctx, cx, 404, 268);

    ctx.fillStyle = "#5a4a32";
    ctx.font = "italic 26px Lora, Georgia, serif";
    ctx.fillText("This certifies that", cx, 458);

    const display = name || " ";
    const nameSize = fitName(ctx, display, CANVAS_W - 340);
    ctx.fillStyle = "#1a1208";
    ctx.shadowColor = "rgba(122, 86, 28, 0.18)";
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 1;
    ctx.font = "italic 700 " + nameSize + "px Newsreader, Georgia, serif";
    ctx.fillText(display, cx, 538);
    ctx.shadowOffsetY = 0;
    drawOrnamentRule(ctx, cx, 568, Math.min(420, 80 + ctx.measureText(display).width / 2));

    ctx.fillStyle = "#3d3224";
    ctx.font = "400 26px Lora, Georgia, serif";
    const body = wrapLines(
      ctx,
      "has completed the eleven sittings of this historicist study of the book of Daniel, walking the text, the map of the kingdoms, and the symbols of the vision.",
      CANVAS_W - 380
    );
    let by = 624;
    for (let i = 0; i < body.length; i += 1) {
      ctx.fillText(body[i], cx, by);
      by += 36;
    }

    drawSeal(ctx, 268, 980, dated);

    ctx.textAlign = "right";
    ctx.fillStyle = "#6b4e16";
    ctx.font = "500 14px Inter, sans-serif";
    ctx.fillText("COURSE", CANVAS_W - 268, 962);
    ctx.fillStyle = "#2a2114";
    ctx.font = "600 22px Newsreader, Georgia, serif";
    ctx.fillText("The Scroll of Daniel", CANVAS_W - 268, 994);
    ctx.fillStyle = "#7a684c";
    ctx.font = "italic 16px Lora, Georgia, serif";
    ctx.fillText("Gold to stone  ·  605 B.C. to the end", CANVAS_W - 268, 1024);

    ctx.textAlign = "center";
    ctx.fillStyle = "#7a684c";
    ctx.font = "400 15px Inter, sans-serif";
    ctx.fillText(
      "66-book Protestant canon  ·  A study certificate, not a denominational diploma",
      cx,
      CANVAS_H - 102
    );
    return canvas;
  }

  function jpegBytesFromCanvas(canvas) {
    const dataUrl = canvas.toDataURL("image/jpeg", 0.95);
    const comma = dataUrl.indexOf(",");
    const binary = atob(dataUrl.slice(comma + 1));
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
    return bytes;
  }

  function buildPdf(jpeg) {
    const objects = [];
    objects[1] = asciiBytes("<< /Type /Catalog /Pages 2 0 R >>\n");
    objects[2] = asciiBytes("<< /Type /Pages /Kids [3 0 R] /Count 1 >>\n");
    objects[3] = asciiBytes(
      "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 " +
        PAGE_W +
        " " +
        PAGE_H +
        "] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>\n"
    );
    const imgDict =
      "<< /Type /XObject /Subtype /Image /Width " +
      CANVAS_W +
      " /Height " +
      CANVAS_H +
      " /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length " +
      jpeg.length +
      " >>\nstream\n";
    objects[4] = concatBytes([asciiBytes(imgDict), jpeg, asciiBytes("\nendstream\n")]);
    const content = "q\n" + PAGE_W + " 0 0 " + PAGE_H + " 0 0 cm\n/Im0 Do\nQ\n";
    objects[5] = asciiBytes("<< /Length " + content.length + " >>\nstream\n" + content + "endstream\n");

    const chunks = [asciiBytes("%PDF-1.4\n")];
    const offsets = [0];
    let pos = chunks[0].length;
    for (let num = 1; num <= 5; num += 1) {
      offsets[num] = pos;
      const head = asciiBytes(num + " 0 obj\n");
      const tail = asciiBytes("endobj\n");
      chunks.push(head, objects[num], tail);
      pos += head.length + objects[num].length + tail.length;
    }
    const xrefPos = pos;
    let xref = "xref\n0 6\n0000000000 65535 f \n";
    for (let num = 1; num <= 5; num += 1) {
      xref += String(offsets[num]).padStart(10, "0") + " 00000 n \n";
    }
    xref += "trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n" + xrefPos + "\n%%EOF\n";
    chunks.push(asciiBytes(xref));
    return concatBytes(chunks);
  }

  function downloadPdf(bytes, filename) {
    const blob = new Blob([bytes], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  }

  function els() {
    return {
      panel: document.getElementById("certificate-panel"),
      input: document.getElementById("certificate-name"),
      download: document.getElementById("certificate-download"),
      cancel: document.getElementById("certificate-cancel"),
      preview: document.getElementById("certificate-preview")
    };
  }

  function refreshPreview() {
    const node = els();
    if (!node.preview) return;
    const name = sanitizeName(node.input && node.input.value) || "Your name";
    const dated = new Date().toLocaleDateString(undefined, {
      year: "numeric",
      month: "long",
      day: "numeric"
    });
    node.preview.src = drawCertificate(name, dated).toDataURL("image/jpeg", 0.82);
    node.preview.hidden = false;
  }

  function syncDownloadEnabled() {
    const node = els();
    if (!node.download || !node.input) return;
    node.download.disabled = !sanitizeName(node.input.value);
    refreshPreview();
  }

  function close() {
    const node = els();
    if (node.panel) node.panel.hidden = true;
  }

  function open() {
    const node = els();
    if (!node.panel || !node.input) return;
    node.input.value = loadSavedName() || identityName();
    syncDownloadEnabled();
    node.panel.hidden = false;
    node.input.focus();
    node.input.select();
  }

  function handleDownload() {
    const name = sanitizeName(els().input && els().input.value);
    if (!name) {
      syncDownloadEnabled();
      return;
    }
    saveName(name);
    const dated = new Date().toLocaleDateString(undefined, {
      year: "numeric",
      month: "long",
      day: "numeric"
    });
    const canvas = drawCertificate(name, dated);
    const pdf = buildPdf(jpegBytesFromCanvas(canvas));
    downloadPdf(pdf, filenameFromName(name));
    close();
    setTimeout(() => {
      openReviewPrompt(name);
    }, 600);
  }

  function escapeHtml(str) {
    return String(str || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function openReviewPrompt(studentName) {
    const existing = document.getElementById("certificate-review-modal");
    if (existing) existing.remove();

    const cohortName = (window.BAJourney && typeof window.BAJourney.getCohort === "function" && window.BAJourney.getCohort()) || "";
    const modal = document.createElement("div");
    modal.id = "certificate-review-modal";
    modal.className = "fixed inset-0 z-[80] flex items-center justify-center p-4 bg-ink-950/80 backdrop-blur-sm font-sans";
    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-modal", "true");
    modal.setAttribute("aria-labelledby", "cert-review-title");

    modal.innerHTML = `
      <div class="relative w-full max-w-lg rounded-2xl border border-amber-600/30 bg-paper-50 dark:bg-paper-900 p-6 shadow-2xl overflow-hidden text-left">
        <div class="flex items-start justify-between gap-4 mb-4">
          <div>
            <span class="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider bg-amber-500/20 text-amber-900 dark:text-amber-300 mb-1.5">Classroom Feedback</span>
            <h3 id="cert-review-title" class="text-xl font-serif font-bold text-ink-900 dark:text-paper-100">Congratulations on your completion!</h3>
            <p class="text-xs text-ink-600 dark:text-paper-300 mt-1">Your certificate is downloading. Please take 30 seconds to share your experience to help future students and facilitators.</p>
          </div>
          <button type="button" id="cert-review-close" class="p-1 rounded-lg text-ink-400 hover:text-ink-700 dark:hover:text-paper-200 transition-colors" aria-label="Close dialog">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>

        <form id="cert-review-form" class="space-y-3.5">
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label for="cert-review-name" class="block text-[11px] font-mono font-semibold text-ink-700 dark:text-paper-300 mb-1">Your Name</label>
              <input type="text" id="cert-review-name" class="w-full px-3 py-1.5 rounded-lg border border-ink-300 dark:border-ink-700 bg-paper-100 dark:bg-paper-800 text-ink-900 dark:text-paper-100 text-xs focus:ring-2 focus:ring-amber-500 outline-none" value="${escapeHtml(studentName || '')}" required maxlength="80">
            </div>
            <div>
              <label for="cert-review-role" class="block text-[11px] font-mono font-semibold text-ink-700 dark:text-paper-300 mb-1">Your Role</label>
              <select id="cert-review-role" class="w-full px-3 py-1.5 rounded-lg border border-ink-300 dark:border-ink-700 bg-paper-100 dark:bg-paper-800 text-ink-900 dark:text-paper-100 text-xs focus:ring-2 focus:ring-amber-500 outline-none">
                <option value="Student">Student</option>
                <option value="Facilitator">Facilitator</option>
                <option value="Pastor">Pastor / Teacher</option>
                <option value="Independent">Independent Learner</option>
              </select>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label for="cert-review-rating" class="block text-[11px] font-mono font-semibold text-ink-700 dark:text-paper-300 mb-1">Overall Rating</label>
              <select id="cert-review-rating" class="w-full px-3 py-1.5 rounded-lg border border-ink-300 dark:border-ink-700 bg-paper-100 dark:bg-paper-800 text-ink-900 dark:text-paper-100 text-xs focus:ring-2 focus:ring-amber-500 outline-none">
                <option value="5">★★★★★ (5/5) Excellent</option>
                <option value="4">★★★★☆ (4/5) Very Good</option>
                <option value="3">★★★☆☆ (3/5) Good</option>
                <option value="2">★★☆☆☆ (2/5) Fair</option>
                <option value="1">★☆☆☆☆ (1/5) Needs Improvement</option>
              </select>
            </div>
            <div>
              <label for="cert-review-cohort" class="block text-[11px] font-mono font-semibold text-ink-700 dark:text-paper-300 mb-1">Cohort (Optional)</label>
              <input type="text" id="cert-review-cohort" class="w-full px-3 py-1.5 rounded-lg border border-ink-300 dark:border-ink-700 bg-paper-100 dark:bg-paper-800 text-ink-900 dark:text-paper-100 text-xs focus:ring-2 focus:ring-amber-500 outline-none" value="${escapeHtml(cohortName)}" placeholder="e.g. Class 2026">
            </div>
          </div>

          <div>
            <label for="cert-review-class" class="block text-[11px] font-mono font-semibold text-ink-700 dark:text-paper-300 mb-1">Would you use this with a class?</label>
            <select id="cert-review-class" class="w-full px-3 py-1.5 rounded-lg border border-ink-300 dark:border-ink-700 bg-paper-100 dark:bg-paper-800 text-ink-900 dark:text-paper-100 text-xs focus:ring-2 focus:ring-amber-500 outline-none">
              <option value="yes">Yes</option>
              <option value="maybe">Maybe</option>
              <option value="no">No</option>
            </select>
          </div>

          <div>
            <div class="flex items-center justify-between mb-1">
              <label for="cert-review-body" class="block text-[11px] font-mono font-semibold text-ink-700 dark:text-paper-300">Your Reflection / Review</label>
              <span id="cert-review-count" class="text-[10px] font-mono text-ink-500 dark:text-paper-400">0 / 40 min chars</span>
            </div>
            <textarea id="cert-review-body" rows="3" minlength="40" maxlength="600" required placeholder="What did this study clarify about Daniel's prophecies? Share your feedback (minimum 40 characters)..." class="w-full px-3 py-2 rounded-lg border border-ink-300 dark:border-ink-700 bg-paper-100 dark:bg-paper-800 text-ink-900 dark:text-paper-100 text-xs focus:ring-2 focus:ring-amber-500 outline-none resize-none"></textarea>
          </div>

          <div id="cert-review-status" class="text-xs font-medium" hidden></div>

          <div class="flex items-center justify-end gap-2.5 pt-2 border-t border-ink-200 dark:border-ink-800">
            <button type="button" id="cert-review-skip" class="px-4 py-2 rounded-lg border border-ink-300 dark:border-ink-700 text-ink-700 dark:text-paper-300 text-xs font-semibold hover:bg-paper-200 dark:hover:bg-paper-800 transition-colors">Maybe Later</button>
            <button type="submit" id="cert-review-submit" disabled class="px-5 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-paper-50 text-xs font-semibold shadow disabled:opacity-40 disabled:cursor-not-allowed transition-all">Submit Review</button>
          </div>
        </form>
      </div>
    `;

    document.body.appendChild(modal);

    const closeBtn = document.getElementById("cert-review-close");
    const skipBtn = document.getElementById("cert-review-skip");
    const bodyInput = document.getElementById("cert-review-body");
    const submitBtn = document.getElementById("cert-review-submit");
    const countEl = document.getElementById("cert-review-count");
    const statusEl = document.getElementById("cert-review-status");
    const form = document.getElementById("cert-review-form");

    function closeModal() {
      modal.remove();
    }
    if (closeBtn) closeBtn.addEventListener("click", closeModal);
    if (skipBtn) skipBtn.addEventListener("click", closeModal);
    modal.addEventListener("click", (e) => {
      if (e.target === modal) closeModal();
    });

    if (bodyInput) {
      bodyInput.addEventListener("input", () => {
        const len = bodyInput.value.trim().length;
        if (countEl) countEl.textContent = `${len} / 40 min chars`;
        if (submitBtn) submitBtn.disabled = len < 40;
        if (len >= 40) {
          countEl.classList.remove("text-ink-500", "dark:text-paper-400");
          countEl.classList.add("text-emerald-600", "dark:text-emerald-400");
        } else {
          countEl.classList.remove("text-emerald-600", "dark:text-emerald-400");
          countEl.classList.add("text-ink-500", "dark:text-paper-400");
        }
      });
    }

    if (form) {
      form.addEventListener("submit", (e) => {
        e.preventDefault();
        const text = bodyInput.value.trim();
        if (text.length < 40) return;
        const nameVal = (document.getElementById("cert-review-name")?.value || studentName || "").trim();
        const roleVal = document.getElementById("cert-review-role")?.value || "Student";
        const ratingVal = Number(document.getElementById("cert-review-rating")?.value || "5");
        const cohortVal = (document.getElementById("cert-review-cohort")?.value || "").trim();
        const classUse = document.getElementById("cert-review-class")?.value || "";

        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.textContent = "Submitting...";
        }

        if (window.ScrollReviews && typeof window.ScrollReviews.submitReview === "function") {
          window.ScrollReviews.submitReview(text, {
            name: nameVal,
            role: roleVal,
            rating: ratingVal,
            cohort: cohortVal,
            classroomUse: classUse
          }).then((res) => {
            if (statusEl) {
              statusEl.hidden = false;
              statusEl.className = "text-xs font-semibold text-emerald-600 dark:text-emerald-400";
              statusEl.textContent = "Thank you for your review! It will appear once approved.";
            }
            setTimeout(closeModal, 1800);
          }).catch(() => {
            if (statusEl) {
              statusEl.hidden = false;
              statusEl.className = "text-xs font-semibold text-amber-600 dark:text-amber-400";
              statusEl.textContent = "Thank you! Your feedback has been recorded.";
            }
            setTimeout(closeModal, 1800);
          });
        } else {
          if (statusEl) {
            statusEl.hidden = false;
            statusEl.className = "text-xs font-semibold text-emerald-600 dark:text-emerald-400";
            statusEl.textContent = "Thank you for completing the course!";
          }
          setTimeout(closeModal, 1500);
        }
      });
    }
  }

  function bindUi() {
    const node = els();
    if (!node.panel) return;
    if (node.input) {
      node.input.addEventListener("input", syncDownloadEnabled);
      node.input.addEventListener("keydown", (ev) => {
        if (ev.key === "Enter") {
          ev.preventDefault();
          handleDownload();
        }
      });
    }
    if (node.download) node.download.addEventListener("click", handleDownload);
    if (node.cancel) node.cancel.addEventListener("click", close);
    node.panel.addEventListener("click", (ev) => {
      if (ev.target === node.panel) close();
    });
    document.addEventListener("keydown", (ev) => {
      if (ev.key === "Escape" && node.panel && !node.panel.hidden) close();
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bindUi);
  } else {
    bindUi();
  }

  window.StudyCertificate = {
    open: open,
    close: close,
    isReady: function () {
      return !!document.getElementById("certificate-panel");
    }
  };
})();
