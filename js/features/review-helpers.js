(function () {
  const MIN = 40;
  const MAX = 600;
  const REVIEW_DAY = "baReviewDay";

  function localDay() {
    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const date = String(now.getDate()).padStart(2, "0");
    return now.getFullYear() + "-" + month + "-" + date;
  }
  function reviewDayCount() {
    const day = localDay();
    try {
      const s = JSON.parse(localStorage.getItem(REVIEW_DAY) || "{}");
      return s.d === day ? (s.n || 0) : 0;
    } catch (e) {
      return 0;
    }
  }
  function bumpReviewDay() {
    const day = localDay();
    try {
      localStorage.setItem(REVIEW_DAY, JSON.stringify({ d: day, n: reviewDayCount() + 1 }));
    } catch (e) {}
  }
  function publicName(raw) {
    return String(raw == null ? "" : raw).trim().slice(0, 80) || "Student";
  }
  function clampRating(n) {
    const r = Number(n);
    if (!Number.isFinite(r)) return 0;
    return Math.max(1, Math.min(5, Math.round(r)));
  }
  function starsLabel(n) {
    const r = clampRating(n) || 5;
    return "\u2605".repeat(r) + "\u2606".repeat(5 - r);
  }
  function formatDate(iso) {
    try {
      return new Date(iso).toLocaleDateString(undefined, {
        year: "numeric",
        month: "long",
        day: "numeric"
      });
    } catch (err) {
      return "";
    }
  }
  function mountStarPicker(container, hiddenInput, initial) {
    if (!container || !hiddenInput) return;
    let value = clampRating(initial) || 5;
    hiddenInput.value = String(value);
    container.innerHTML = "";
    container.setAttribute("role", "radiogroup");
    for (let i = 1; i <= 5; i++) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "witness-star-btn" + (i <= value ? " is-on" : "");
      btn.dataset.value = String(i);
      btn.setAttribute("aria-label", i + " star" + (i > 1 ? "s" : ""));
      btn.setAttribute("aria-pressed", i <= value ? "true" : "false");
      btn.textContent = "\u2605";
      btn.addEventListener("click", function () {
        value = i;
        hiddenInput.value = String(value);
        container.querySelectorAll(".witness-star-btn").forEach(function (b, idx) {
          const on = idx < value;
          b.classList.toggle("is-on", on);
          b.setAttribute("aria-pressed", on ? "true" : "false");
        });
      });
      container.appendChild(btn);
    }
  }
  function mountStarPickers() {
    mountStarPicker(
      document.getElementById("witness-stars"),
      document.getElementById("witness-rating"),
      5
    );
    mountStarPicker(
      document.getElementById("witness-edit-stars"),
      document.getElementById("witness-edit-rating"),
      5
    );
  }
  function saveFailureMessage(err, fallback) {
    const kind = window.SiteNet && typeof window.SiteNet.classify === "function"
      ? window.SiteNet.classify(err)
      : "client";
    if (kind === "offline") return "You are offline. Your note is kept on this page — try again once the connection returns.";
    if (kind === "rate") return "Notes are arriving a little too quickly. Wait a short while, then try again.";
    if (kind === "auth") return "Your session ended. Sign in again — your note is kept on this page.";
    if (kind === "forbidden") return "Posting is not available on this membership right now.";
    if (kind === "server") return "The exhibit's service hiccuped. Try again in a minute.";
    return fallback || "Could not save. Try again.";
  }
  function validateReviewText(raw) {
    const text = String(raw || "").replace(/\s+/g, " ").trim();
    if (text.length < MIN) {
      return { ok: false, message: "Write at least " + MIN + " characters." };
    }
    if (text.length > MAX) {
      return { ok: false, message: "Keep under " + MAX + " characters." };
    }
    return { ok: true, text: text };
  }

  window.ReviewHelpers = Object.freeze({ localDay, reviewDayCount, bumpReviewDay, publicName, clampRating, starsLabel, formatDate, mountStarPicker, mountStarPickers, validateReviewText, saveFailureMessage });
})();
