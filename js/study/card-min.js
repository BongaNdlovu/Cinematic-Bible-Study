/* Per-card minimize toggles for the study desk.
   Adds a collapse button to every card in the lesson article and in each
   instrument tab (timeline facts, map facts, context, insights, scripture,
   workbench, verify). Minimized cards collapse to their title line; state
   survives tab/sheet re-renders within the session (sessionStorage). */
(function () {
  var STORE_KEY = "baCardMinState";

  var CARD_SELECTOR = [
    ".framework-card",
    ".caution-card",
    ".principle-card",
    ".historical-note",
    ".level-card",
    ".biblical-case",
    ".layer-stack",
    ".next-sitting-card",
    ".gold-bible-notice-card",
    ".source-card",
    ".qa-card",
    ".checkpoint-card",
    ".governing-principle",
    ".from-last-sitting",
    ".lesson-toc",
    ".glossary-card",
    ".scripture-quote",
    ".prophecy-diagram",
    ".comparison-table-wrap",
    ".sheet-verify-card",
    ".study-block",
    ".study-trace-step",
    ".flow-step",
    ".insight-card",
    ".epoch-facts .fact",
    ".epoch-banner",
    ".context-plate",
    ".scripture-chapter",
    ".strong-dock",
    ".load-bearing-line",
    ".workbench-card",
    "[id^='q-card-']",
    ".sitting-guide-card"
  ].join(",");

  var CLIP_SELECTOR = ".scripture-quote, .prophecy-diagram, .comparison-table-wrap";

  var HEAD_SELECTOR = [
    "h1", "h2", "h3", "h4", "h5", "b", "strong",
    "[class*='kicker']",
    ".flow-title",
    ".study-do",
    ".load-bearing-ref",
    ".sheet-verify-kind",
    ".glossary-card-kind",
    ".epoch-cap"
  ].join(",");

  var store = readStore();
  var timer = null;

  function readStore() {
    try {
      return JSON.parse(sessionStorage.getItem(STORE_KEY) || "{}");
    } catch (e) {
      return {};
    }
  }

  function writeStore() {
    try {
      sessionStorage.setItem(STORE_KEY, JSON.stringify(store));
    } catch (e) {}
  }

  function headTextOf(head) {
    var btn = head.querySelector(".cardmin-btn");
    var clone = head.cloneNode(true);
    if (btn) clone.removeChild(clone.querySelector(".cardmin-btn"));
    return (clone.textContent || "").replace(/\s+/g, " ").trim().slice(0, 60);
  }

  /* Content-derived key: stable across re-renders, and unique enough that
     two sheets sharing a card design do not share state. Deliberately
     avoids the epoch tag, which the app may update out of step with the
     article render. */
  function keyFor(card, head) {
    var cls = card.classList[0] || "card";
    var same = document.querySelectorAll("." + cls);
    var index = Array.prototype.indexOf.call(same, card);
    var body = (card.textContent || "").replace(/\s+/g, " ").trim().slice(0, 80);
    return cls + "|" + index + "|" + headTextOf(head) + "|" + body;
  }

  function ownedBy(card, node) {
    return node.closest(".cardmin-target") === card;
  }

  function pickHead(card) {
    var headings = card.querySelectorAll("h1, h2, h3, h4, h5");
    var i;
    for (i = 0; i < headings.length; i += 1) {
      if (ownedBy(card, headings[i])) return headings[i];
    }
    var kids = card.querySelectorAll(HEAD_SELECTOR);
    for (i = 0; i < kids.length; i += 1) {
      if (ownedBy(card, kids[i])) return kids[i];
    }
    return card.firstElementChild;
  }

  function setLabel(btn, minimized, text) {
    var label = (minimized ? "Expand" : "Minimize") + (text ? " — " + text : "");
    btn.setAttribute("aria-expanded", minimized ? "false" : "true");
    btn.title = label;
    btn.setAttribute("aria-label", label);
  }

  /* Hide everything under `card` except head, its ancestors, and its
     descendants (the button lives inside head). Works through wrapper
     elements, unlike a flat child-selector rule. */
  function applyMin(card, head, minimize, persist) {
    var all = card.querySelectorAll("*");
    var i;
    var node;
    if (!card.classList.contains("cardmin-clip")) {
      for (i = 0; i < all.length; i += 1) {
        node = all[i];
        if (node.classList.contains("cardmin-btn")) continue;
        if (node === head || node.contains(head) || head.contains(node)) continue;
        if (minimize) {
          if (!node.hasAttribute("data-cardmin-hidden")) node.setAttribute("data-cardmin-hidden", "1");
        } else {
          node.removeAttribute("data-cardmin-hidden");
        }
      }
    }
    card.classList.toggle("is-card-min", !!minimize);
    var btn = head.querySelector(".cardmin-btn");
    var text = headTextOf(head);
    if (btn) setLabel(btn, !!minimize, text);
    if (persist !== false) {
      var key = card.dataset.cardminKey;
      if (key) {
        if (minimize) store[key] = 1;
        else delete store[key];
        writeStore();
      }
    }
  }

  function enhance(root) {
    if (!root) return;
    var scoped = root.matches && root.matches(CARD_SELECTOR) ? [root] : [];
    var cards = root.querySelectorAll(CARD_SELECTOR);
    var i;
    var card;
    var head;
    var btn;
    var list = scoped.length ? scoped : [];
    var pending = [];
    for (i = 0; i < cards.length; i += 1) list.push(cards[i]);
    for (i = 0; i < list.length; i += 1) {
      card = list[i];
      if (card.dataset.cardminDone) {
        /* App code may re-render a card's inner HTML (epoch banner, context
           plate) and wipe the injected button — re-enhance those. */
        if (card.querySelector(":scope > .cardmin-btn, [data-cardmin-head] .cardmin-btn") &&
            (card.querySelector("[data-cardmin-head]") || card.classList.contains("cardmin-clip"))) continue;
        delete card.dataset.cardminDone;
        card.classList.remove("is-card-min");
      }
      card.dataset.cardminDone = "1";
      card.classList.add("cardmin-target");
      if (card.matches(CLIP_SELECTOR)) card.classList.add("cardmin-clip");
      pending.push(card);
    }
    for (i = 0; i < pending.length; i += 1) {
      card = pending[i];
      head = pickHead(card);
      if (!head && card.classList.contains("cardmin-clip")) head = card;
      if (!head) continue;
      if (head !== card) head.setAttribute("data-cardmin-head", "1");
      btn = document.createElement("button");
      btn.type = "button";
      btn.className = "cardmin-btn";
      btn.innerHTML =
        '<svg viewBox="0 0 10 6" aria-hidden="true" focusable="false">' +
        '<path d="M1 1l4 4 4-4" fill="none" stroke="currentColor" stroke-width="1.6" ' +
        'stroke-linecap="round" stroke-linejoin="round"/></svg>';
      head.appendChild(btn);
      card.dataset.cardminKey = keyFor(card, head);
      setLabel(btn, false, headTextOf(head));
      if (store[card.dataset.cardminKey]) applyMin(card, head, true, false);
    }
  }

  function expandAllForPrint() {
    var open = document.querySelectorAll(".cardmin-target.is-card-min");
    for (var i = 0; i < open.length; i += 1) {
      var head = open[i].querySelector("[data-cardmin-head]") || open[i];
      applyMin(open[i], head, false, false);
    }
  }

  function restoreFromStore() {
    var cards = document.querySelectorAll(".cardmin-target");
    for (var i = 0; i < cards.length; i += 1) {
      var card = cards[i];
      if (!store[card.dataset.cardminKey] || card.classList.contains("is-card-min")) continue;
      var head = card.querySelector("[data-cardmin-head]") || card;
      applyMin(card, head, true, false);
    }
  }

  document.addEventListener("click", function (e) {
    var target = e.target;
    if (!target || !target.closest) return;
    var btn = target.closest(".cardmin-btn");
    if (btn) {
      var owned = btn.closest(".cardmin-target");
      if (owned) {
        var head = owned.querySelector("[data-cardmin-head]") || owned;
        applyMin(owned, head, !owned.classList.contains("is-card-min"));
      }
      return;
    }
    var minCard = target.closest(".cardmin-target.is-card-min");
    if (minCard && !target.closest("a, button, input, select, textarea, summary")) {
      var head2 = minCard.querySelector("[data-cardmin-head]") || minCard;
      applyMin(minCard, head2, false);
    }
  });

  window.addEventListener("beforeprint", expandAllForPrint);
  window.addEventListener("afterprint", restoreFromStore);

  function schedule() {
    if (timer) return;
    timer = setTimeout(function () {
      timer = null;
      enhance(document);
    }, 120);
  }

  function start() {
    enhance(document);
    if (window.MutationObserver) {
      new MutationObserver(schedule).observe(document.body, { childList: true, subtree: true });
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();
