(function () {
  const LOCAL_KEY = "baDeskReceipts";
  const TITLE_MAX = 120;
  const BODY_MAX = 2000;
  let generation = 0;
  let open = false;
  let mounted = false;
  let notices = [];
  let receipts = Object.create(null);
  let helpNotes = [];
  let returnFocus = null;
  const inflight = Object.create(null);
  let root = null;
  let panel = null;
  let launcher = null;
  let countNode = null;
  let listNode = null;
  let statusNode = null;
  let helpForm = null;
  let publishForm = null;
  let publishSection = null;
  let inboxSection = null;
  let inboxList = null;
  let guestLine = null;
  let syncLine = null;

  function client() {
    return window.ScrollAuth && window.ScrollAuth.getClient && window.ScrollAuth.getClient();
  }

  function currentUser() {
    return window.ScrollAuth && window.ScrollAuth.getUser && window.ScrollAuth.getUser();
  }

  function userId() {
    const user = currentUser();
    return user && user.id ? String(user.id) : "";
  }

  function isOperator() {
    return !!(window.ScrollAuth && window.ScrollAuth.isModerator && window.ScrollAuth.isModerator());
  }

  function isId(value) {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(value || ""));
  }

  function still(gen, uid) {
    return gen === generation && uid === userId();
  }

  function node(tag, className) {
    const el = document.createElement(tag);
    if (className) el.className = className;
    return el;
  }

  function clear(el) {
    if (!el) return;
    while (el.firstChild) el.removeChild(el.firstChild);
  }

  function line(parent, className, text) {
    const el = node("p", className);
    el.textContent = text;
    parent.appendChild(el);
    return el;
  }

  function clippedLine(value, max) {
    return String(value || "").replace(/[\r\n]+/g, " ").trim().slice(0, max);
  }

  function clippedBlock(value, max) {
    return String(value || "").replace(/\r\n/g, "\n").trim().slice(0, max);
  }

  function formatWhen(iso) {
    const when = new Date(iso);
    if (Number.isNaN(when.getTime())) return "";
    try {
      return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric" }).format(when);
    } catch (e) {
      return "";
    }
  }

  function plainError(error) {
    const msg = error && error.message ? String(error.message) : "";
    if (msg.indexOf("rate_limit") >= 0) return "Please wait before sending another.";
    return "That could not be saved.";
  }

  function safeEmail(value) {
    const email = String(value || "").trim();
    if (email.length > 254) return "";
    if (!/^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(email)) return "";
    return email;
  }

  function setStatus(message) {
    if (!statusNode) return;
    statusNode.textContent = message || "";
  }

  function lock(key) {
    if (inflight[key]) return false;
    inflight[key] = true;
    return true;
  }

  function unlock(key) {
    delete inflight[key];
  }

  function readLocal() {
    try {
      const raw = JSON.parse(localStorage.getItem(LOCAL_KEY) || "{}");
      if (!raw || typeof raw !== "object" || Array.isArray(raw)) return Object.create(null);
      return raw;
    } catch (e) {
      return Object.create(null);
    }
  }

  function writeLocal(next) {
    const slim = Object.create(null);
    const ids = [];
    notices.forEach(function (row) { if (isId(row.id)) ids.push(row.id); });
    Object.keys(next).forEach(function (id) {
      if (ids.indexOf(id) < 0 && isId(id)) ids.push(id);
    });
    ids.slice(0, 80).forEach(function (id) {
      const row = next[id];
      if (!isId(id) || !row) return;
      slim[id] = { read: !!row.read, hidden: !!row.hidden };
    });
    try { localStorage.setItem(LOCAL_KEY, JSON.stringify(slim)); } catch (e) {}
  }

  function cleanNotice(row) {
    if (!row || !isId(row.id)) return null;
    if (typeof row.title !== "string" || typeof row.body !== "string") return null;
    return {
      id: row.id,
      title: row.title.slice(0, TITLE_MAX),
      body: row.body.slice(0, BODY_MAX),
      created_at: typeof row.created_at === "string" ? row.created_at : ""
    };
  }

  function shownNotices() {
    const list = [];
    notices.forEach(function (row) {
      const state = receipts[row.id];
      if (state && state.hidden) return;
      list.push(row);
    });
    return list;
  }

  function unreadCount() {
    let count = 0;
    shownNotices().forEach(function (row) {
      const state = receipts[row.id];
      if (!state || !state.read) count += 1;
    });
    return count;
  }

  function paintBadge() {
    if (!countNode || !launcher) return;
    const count = unreadCount();
    countNode.hidden = count === 0;
    countNode.textContent = count > 9 ? "9+" : String(count);
    launcher.setAttribute("aria-label", count ? "Messages, " + count + " unread" : "Messages");
  }

  function actionButton(label, act, id) {
    const btn = node("button", "desk-text");
    btn.type = "button";
    btn.textContent = label;
    btn.setAttribute("data-desk", act);
    btn.setAttribute("data-id", id);
    if (inflight[id]) btn.disabled = true;
    return btn;
  }

  function paintCard(row) {
    const state = receipts[row.id] || { read: false, hidden: false };
    const card = node("article", state.read ? "desk-card" : "desk-card is-unread");
    const title = node("h4");
    title.textContent = row.title;
    card.appendChild(title);
    const when = node("time", "desk-when");
    when.dateTime = row.created_at;
    when.textContent = formatWhen(row.created_at);
    card.appendChild(when);
    const body = node("p", "desk-body");
    body.textContent = row.body;
    card.appendChild(body);
    const actions = node("div", "desk-actions");
    actions.appendChild(actionButton(state.read ? "Mark unread" : "Mark read", state.read ? "unread" : "read", row.id));
    actions.appendChild(actionButton("Remove", "hide", row.id));
    if (isOperator()) actions.appendChild(actionButton("Remove for everyone", "retract", row.id));
    card.appendChild(actions);
    return card;
  }

  function paintNotices() {
    if (!listNode) return;
    clear(listNode);
    const rows = shownNotices();
    if (!rows.length) {
      line(listNode, "desk-empty", "No notes from the operator yet.");
    } else {
      rows.forEach(function (row) { listNode.appendChild(paintCard(row)); });
    }
    paintBadge();
    paintRole();
  }

  function paintRole() {
    const signed = !!userId();
    const operator = isOperator();
    if (guestLine) guestLine.hidden = signed;
    if (syncLine) syncLine.hidden = signed;
    if (helpForm) helpForm.hidden = !signed;
    if (publishSection) publishSection.hidden = !operator;
    if (inboxSection) inboxSection.hidden = !operator;
    if (!operator) {
      helpNotes = [];
      paintInbox();
    }
  }

  function paintInbox() {
    if (!inboxList) return;
    clear(inboxList);
    if (!helpNotes.length) {
      line(inboxList, "desk-empty", "No notes waiting.");
      return;
    }
    helpNotes.forEach(function (row) { inboxList.appendChild(paintHelp(row)); });
  }

  function paintHelp(row) {
    const card = node("article", "desk-card");
    const title = node("h4");
    title.textContent = row.subject;
    card.appendChild(title);
    const when = node("time", "desk-when");
    when.dateTime = row.created_at;
    const email = safeEmail(row.sender_email);
    when.textContent = (email || "No confirmed address") + " · " + formatWhen(row.created_at);
    card.appendChild(when);
    const body = node("p", "desk-body");
    body.textContent = row.body;
    card.appendChild(body);
    const actions = node("div", "desk-actions");
    actions.appendChild(actionButton("Clear", "drop-help", row.id));
    card.appendChild(actions);
    return card;
  }

  function cleanHelp(row) {
    if (!row || !isId(row.id)) return null;
    if (typeof row.subject !== "string" || typeof row.body !== "string") return null;
    return {
      id: row.id,
      subject: row.subject.slice(0, TITLE_MAX),
      body: row.body.slice(0, BODY_MAX),
      created_at: typeof row.created_at === "string" ? row.created_at : "",
      sender_email: safeEmail(row.sender_email)
    };
  }

  function adoptGuest() {
    receipts = Object.create(null);
    const local = readLocal();
    Object.keys(local).forEach(function (id) {
      const row = local[id];
      if (!isId(id) || !row) return;
      receipts[id] = { read: !!row.read, hidden: !!row.hidden };
    });
    paintNotices();
  }

  function loadReceipts(gen, uid) {
    const db = client();
    if (!db || typeof db.from !== "function") {
      paintNotices();
      return;
    }
    db.from("exhibit_notice_receipts")
      .select("notice_id,read_at,hidden_at")
      .then(function (res) {
        if (!still(gen, uid)) return;
        receipts = Object.create(null);
        const rows = res && !res.error && Array.isArray(res.data) ? res.data : [];
        rows.forEach(function (row) {
          if (!row || !isId(row.notice_id)) return;
          receipts[row.notice_id] = { read: !!row.read_at, hidden: !!row.hidden_at };
        });
        paintNotices();
      }, function () {
        if (!still(gen, uid)) return;
        receipts = Object.create(null);
        paintNotices();
      });
  }

  function loadInbox(gen, uid) {
    if (!isOperator()) {
      helpNotes = [];
      paintInbox();
      return;
    }
    const db = client();
    if (!db || typeof db.rpc !== "function") return;
    db.rpc("exhibit_help_inbox").then(function (res) {
      if (!still(gen, uid) || !isOperator()) return;
      const rows = res && !res.error && Array.isArray(res.data) ? res.data : [];
      helpNotes = [];
      rows.forEach(function (row) {
        const clean = cleanHelp(row);
        if (clean) helpNotes.push(clean);
      });
      paintInbox();
    }, function () {
      if (!still(gen, uid)) return;
      helpNotes = [];
      paintInbox();
    });
  }

  function loadNotices(gen, uid) {
    const db = client();
    if (!db || typeof db.from !== "function") {
      notices = [];
      setStatus("Messages are unavailable on this copy.");
      paintNotices();
      return;
    }
    db.from("exhibit_notices")
      .select("id,title,body,created_at")
      .order("created_at", { ascending: false })
      .limit(40)
      .then(function (res) {
        if (!still(gen, uid)) return;
        if (!res || res.error) {
          notices = [];
          setStatus("Could not load messages.");
          paintNotices();
          return;
        }
        notices = [];
        (Array.isArray(res.data) ? res.data : []).forEach(function (row) {
          const clean = cleanNotice(row);
          if (clean) notices.push(clean);
        });
        setStatus("");
        if (!uid) adoptGuest();
        else loadReceipts(gen, uid);
        loadInbox(gen, uid);
      }, function () {
        if (!still(gen, uid)) return;
        notices = [];
        setStatus("Could not load messages.");
        paintNotices();
      });
  }

  function refresh() {
    generation += 1;
    const gen = generation;
    const uid = userId();
    receipts = Object.create(null);
    helpNotes = [];
    Object.keys(inflight).forEach(function (key) { delete inflight[key]; });
    paintNotices();
    paintInbox();
    loadNotices(gen, uid);
  }

  function applyState(id, read, hidden) {
    if (!isId(id) || !lock(id)) return;
    const gen = generation;
    const uid = userId();
    if (!uid) {
      /* Guest marks stay on this device. They are not copied into an account. */
      const local = readLocal();
      local[id] = { read: !!read, hidden: !!hidden };
      writeLocal(local);
      receipts[id] = local[id];
      unlock(id);
      paintNotices();
      return;
    }
    const db = client();
    if (!db || typeof db.rpc !== "function") {
      unlock(id);
      setStatus("That could not be saved.");
      return;
    }
    db.rpc("exhibit_notice_receipt_set", { p_notice: id, p_read: !!read, p_hidden: !!hidden })
      .then(function (res) {
        unlock(id);
        if (!still(gen, uid)) return;
        if (!res || res.error) {
          setStatus(plainError(res && res.error));
          return;
        }
        receipts[id] = { read: !!read, hidden: !!hidden };
        setStatus(hidden ? "Removed from your desk." : "");
        paintNotices();
      }, function () {
        unlock(id);
        if (still(gen, uid)) setStatus("That could not be saved.");
      });
  }

  function retractNotice(id) {
    if (!isOperator() || !isId(id) || !lock("retract:" + id)) return;
    const db = client();
    const gen = generation;
    const uid = userId();
    if (!db || typeof db.from !== "function") {
      unlock("retract:" + id);
      return;
    }
    db.from("exhibit_notices").delete().eq("id", id).then(function (res) {
      unlock("retract:" + id);
      if (!still(gen, uid)) return;
      if (!res || res.error) {
        setStatus(plainError(res && res.error));
        return;
      }
      notices = notices.filter(function (row) { return row.id !== id; });
      setStatus("Removed for every reader.");
      paintNotices();
    }, function () {
      unlock("retract:" + id);
      if (still(gen, uid)) setStatus("That could not be saved.");
    });
  }

  function dropHelp(id) {
    if (!isOperator() || !isId(id) || !lock("help:" + id)) return;
    const db = client();
    const gen = generation;
    const uid = userId();
    if (!db || typeof db.from !== "function") {
      unlock("help:" + id);
      return;
    }
    db.from("exhibit_help_notes").delete().eq("id", id).then(function (res) {
      unlock("help:" + id);
      if (!still(gen, uid)) return;
      if (!res || res.error) {
        setStatus(plainError(res && res.error));
        return;
      }
      helpNotes = helpNotes.filter(function (row) { return row.id !== id; });
      paintInbox();
    }, function () {
      unlock("help:" + id);
      if (still(gen, uid)) setStatus("That could not be saved.");
    });
  }

  function confirmOr(btn, prompt) {
    if (btn.getAttribute("data-confirm") === "yes") return true;
    btn.setAttribute("data-confirm", "yes");
    btn.textContent = prompt;
    return false;
  }

  function onPanelClick(event) {
    const btn = event.target && event.target.closest ? event.target.closest("[data-desk]") : null;
    if (!btn || !root || !root.contains(btn)) return;
    const act = btn.getAttribute("data-desk");
    const id = btn.getAttribute("data-id") || "";
    if (act === "close") {
      closeDesk();
      return;
    }
    if (!isId(id)) return;
    const state = receipts[id] || { read: false, hidden: false };
    if (act === "read") applyState(id, true, !!state.hidden);
    else if (act === "unread") applyState(id, false, !!state.hidden);
    else if (act === "hide") {
      if (confirmOr(btn, "Remove for you?")) applyState(id, !!state.read, true);
    } else if (act === "retract") {
      if (confirmOr(btn, "Remove for everyone?")) retractNotice(id);
    } else if (act === "drop-help") {
      if (confirmOr(btn, "Clear this note?")) dropHelp(id);
    }
  }

  function submitHelp(event) {
    event.preventDefault();
    if (!userId()) {
      setStatus("Sign in to write to the operator.");
      return;
    }
    const subject = clippedLine(helpForm.subject.value, TITLE_MAX);
    const body = clippedBlock(helpForm.body.value, BODY_MAX);
    if (!subject || !body) {
      setStatus("Add a subject and a message.");
      return;
    }
    if (!lock("help-send")) return;
    const db = client();
    const gen = generation;
    const uid = userId();
    if (!db || typeof db.from !== "function") {
      unlock("help-send");
      setStatus("That could not be saved.");
      return;
    }
    db.from("exhibit_help_notes").insert({ subject: subject, body: body }).then(function (res) {
      unlock("help-send");
      if (!still(gen, uid)) return;
      if (!res || res.error) {
        setStatus(plainError(res && res.error));
        return;
      }
      helpForm.reset();
      setStatus("The operator has your note.");
      loadInbox(gen, uid);
    }, function () {
      unlock("help-send");
      if (still(gen, uid)) setStatus("That could not be saved.");
    });
  }

  function submitNotice(event) {
    event.preventDefault();
    if (!isOperator()) return;
    const title = clippedLine(publishForm.title.value, TITLE_MAX);
    const body = clippedBlock(publishForm.body.value, BODY_MAX);
    if (!title || !body) {
      setStatus("Add a title and a message.");
      return;
    }
    if (!lock("notice-send")) return;
    const db = client();
    const gen = generation;
    const uid = userId();
    if (!db || typeof db.from !== "function") {
      unlock("notice-send");
      setStatus("That could not be saved.");
      return;
    }
    db.from("exhibit_notices").insert({ title: title, body: body }).then(function (res) {
      unlock("notice-send");
      if (!still(gen, uid)) return;
      if (!res || res.error) {
        setStatus(plainError(res && res.error));
        return;
      }
      publishForm.reset();
      setStatus("Published to every reader.");
      loadNotices(gen, uid);
    }, function () {
      unlock("notice-send");
      if (still(gen, uid)) setStatus("That could not be saved.");
    });
  }

  function diagramOpen() {
    return !!document.querySelector(".mm.is-full, .chain.is-full");
  }

  function onKey(event) {
    if (!open || event.key !== "Escape") return;
    if (diagramOpen()) {
      closeDesk();
      return;
    }
    event.preventDefault();
    closeDesk();
  }

  function openDesk() {
    if (!panel || !launcher) return;
    returnFocus = document.activeElement;
    open = true;
    root.classList.add("is-open");
    panel.hidden = false;
    launcher.setAttribute("aria-expanded", "true");
    const closeBtn = panel.querySelector(".desk-close");
    if (closeBtn) closeBtn.focus();
  }

  function closeDesk() {
    if (!panel || !launcher) return;
    open = false;
    root.classList.remove("is-open");
    panel.hidden = true;
    launcher.setAttribute("aria-expanded", "false");
    if (returnFocus && returnFocus.focus) returnFocus.focus();
    returnFocus = null;
  }

  function toggleDesk() {
    if (open) closeDesk();
    else openDesk();
  }

  function field(form, tag, name, label, max) {
    const wrap = node("label", "desk-field");
    const span = node("span");
    span.textContent = label;
    const input = document.createElement(tag);
    input.name = name;
    input.maxLength = max;
    input.required = true;
    if (tag === "textarea") input.rows = 4;
    wrap.appendChild(span);
    wrap.appendChild(input);
    form.appendChild(wrap);
    return input;
  }

  function buildHelp() {
    const section = node("section", "desk-section");
    const heading = node("h3");
    heading.textContent = "Write to the operator";
    section.appendChild(heading);
    guestLine = line(section, "desk-note", "Sign in to send a note. It stays with your account, and the operator sees only your confirmed address.");
    helpForm = node("form");
    field(helpForm, "input", "subject", "Subject", TITLE_MAX);
    field(helpForm, "textarea", "body", "Message", BODY_MAX);
    const send = node("button", "desk-send");
    send.type = "submit";
    send.textContent = "Send to the operator";
    helpForm.appendChild(send);
    helpForm.addEventListener("submit", submitHelp);
    section.appendChild(helpForm);
    return section;
  }

  function buildPublish() {
    publishSection = node("section", "desk-section desk-admin");
    publishSection.hidden = true;
    const heading = node("h3");
    heading.textContent = "Publish to every reader";
    publishSection.appendChild(heading);
    publishForm = node("form");
    field(publishForm, "input", "title", "Title", TITLE_MAX);
    field(publishForm, "textarea", "body", "Message", BODY_MAX);
    const send = node("button", "desk-send");
    send.type = "submit";
    send.textContent = "Publish";
    publishForm.appendChild(send);
    publishForm.addEventListener("submit", submitNotice);
    publishSection.appendChild(publishForm);
    return publishSection;
  }

  function buildInbox() {
    inboxSection = node("section", "desk-section desk-admin");
    inboxSection.hidden = true;
    const heading = node("h3");
    heading.textContent = "Notes to you";
    inboxSection.appendChild(heading);
    inboxList = node("div");
    inboxSection.appendChild(inboxList);
    return inboxSection;
  }

  function build() {
    root = node("div", "desk-root");
    launcher = node("button", "desk-launcher");
    launcher.type = "button";
    launcher.setAttribute("aria-haspopup", "dialog");
    launcher.setAttribute("aria-controls", "desk-panel");
    launcher.setAttribute("aria-expanded", "false");
    launcher.setAttribute("aria-label", "Messages");
    const label = node("span");
    label.textContent = "Messages";
    countNode = node("span", "desk-count");
    countNode.hidden = true;
    launcher.appendChild(label);
    launcher.appendChild(countNode);
    launcher.addEventListener("click", toggleDesk);

    panel = node("div", "desk-panel");
    panel.id = "desk-panel";
    panel.hidden = true;
    const backdrop = node("button", "desk-backdrop");
    backdrop.type = "button";
    backdrop.setAttribute("data-desk", "close");
    backdrop.setAttribute("aria-label", "Close messages");
    const sheet = node("div", "desk-sheet");
    sheet.setAttribute("role", "dialog");
    sheet.setAttribute("aria-modal", "true");
    sheet.setAttribute("aria-labelledby", "desk-title");
    const head = node("div", "desk-head");
    const titles = node("div");
    line(titles, "desk-kicker", "The desk");
    const title = node("h2", "desk-title");
    title.id = "desk-title";
    title.textContent = "Messages";
    titles.appendChild(title);
    const closeBtn = node("button", "desk-close");
    closeBtn.type = "button";
    closeBtn.setAttribute("data-desk", "close");
    closeBtn.setAttribute("aria-label", "Close");
    closeBtn.textContent = "×";
    head.appendChild(titles);
    head.appendChild(closeBtn);
    sheet.appendChild(head);
    statusNode = node("p", "desk-status");
    statusNode.setAttribute("role", "status");
    sheet.appendChild(statusNode);
    const notes = node("section", "desk-section");
    const notesHeading = node("h3");
    notesHeading.textContent = "From the operator";
    notes.appendChild(notesHeading);
    syncLine = line(notes, "desk-note", "Sign in to keep read and removed notes with your account.");
    listNode = node("div");
    notes.appendChild(listNode);
    sheet.appendChild(notes);
    sheet.appendChild(buildHelp());
    sheet.appendChild(buildPublish());
    sheet.appendChild(buildInbox());
    panel.appendChild(backdrop);
    panel.appendChild(sheet);
    root.appendChild(launcher);
    root.appendChild(panel);
    root.addEventListener("click", onPanelClick);
    document.body.appendChild(root);
  }

  function mount() {
    if (mounted || !document.body) return;
    mounted = true;
    build();
    document.addEventListener("keydown", onKey);
    window.addEventListener("pagehide", function () { generation += 1; });
    window.addEventListener("pageshow", function (event) {
      if (event.persisted) refresh();
    });
    if (window.ScrollAuth && typeof window.ScrollAuth.onChange === "function") {
      window.ScrollAuth.onChange(function () { refresh(); });
    }
    if (window.ScrollAuth && typeof window.ScrollAuth.ready === "function") {
      window.ScrollAuth.ready().then(refresh, refresh);
    } else {
      refresh();
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", mount, { once: true });
  else mount();
})();
