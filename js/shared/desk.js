(function () {
  const LOCAL_KEY = "baDeskReceipts";
  const TITLE_MAX = 120;
  const BODY_MAX = 2000;
  const TABS = ["notices", "inbox", "write"];
  let generation = 0;
  let open = false;
  let mounted = false;
  let notices = [];
  let receipts = Object.create(null);
  let threads = [];
  let threadId = "";
  let threadRows = [];
  let threadState = "";
  let tab = "notices";
  let returnFocus = null;
  const inflight = Object.create(null);
  const tabButtons = Object.create(null);
  const tabPanes = Object.create(null);
  const tabCounts = Object.create(null);
  let root = null;
  let panel = null;
  let launcher = null;
  let countNode = null;
  let listNode = null;
  let statusNode = null;
  let helpForm = null;
  let publishForm = null;
  let publishSection = null;
  let inboxGuest = null;
  let inboxListView = null;
  let inboxHeading = null;
  let inboxList = null;
  let threadView = null;
  let threadBack = null;
  let threadTitle = null;
  let threadMeta = null;
  let threadList = null;
  let threadClear = null;
  let replyForm = null;
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

  function formatWhen(iso, withTime) {
    const when = new Date(iso);
    if (Number.isNaN(when.getTime())) return "";
    const options = withTime
      ? { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }
      : { month: "short", day: "numeric", year: "numeric" };
    try {
      return new Intl.DateTimeFormat(undefined, options).format(when);
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

  function cleanThread(row) {
    if (!row || !isId(row.id)) return null;
    if (typeof row.subject !== "string" || typeof row.body !== "string") return null;
    const created = typeof row.created_at === "string" ? row.created_at : "";
    return {
      id: row.id,
      subject: row.subject.slice(0, TITLE_MAX),
      body: row.body.slice(0, BODY_MAX),
      created_at: created,
      last_at: typeof row.last_at === "string" ? row.last_at : created,
      replies: Number.isFinite(row.replies) && row.replies > 0 ? row.replies : 0,
      unread: row.unread === true,
      sender_email: safeEmail(row.sender_email)
    };
  }

  function cleanMessage(row) {
    if (!row || !isId(row.id) || typeof row.body !== "string") return null;
    return {
      id: row.id,
      body: row.body.slice(0, BODY_MAX),
      created_at: typeof row.created_at === "string" ? row.created_at : "",
      from_operator: row.from_operator === true
    };
  }

  function findThread(id) {
    for (let i = 0; i < threads.length; i += 1) {
      if (threads[i].id === id) return threads[i];
    }
    return null;
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

  function inboxUnread() {
    let count = 0;
    threads.forEach(function (row) { if (row.unread) count += 1; });
    return count;
  }

  function paintCount(el, count) {
    if (!el) return;
    el.hidden = count === 0;
    el.textContent = count > 9 ? "9+" : String(count);
  }

  function paintBadge() {
    if (!countNode || !launcher) return;
    const notes = unreadCount();
    const inbox = inboxUnread();
    const count = notes + inbox;
    paintCount(countNode, count);
    paintCount(tabCounts.notices, notes);
    paintCount(tabCounts.inbox, inbox);
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
    if (guestLine) guestLine.hidden = signed;
    if (syncLine) syncLine.hidden = signed;
    if (helpForm) helpForm.hidden = !signed;
    if (publishSection) publishSection.hidden = !isOperator();
  }

  function paintThreadCard(row, operator) {
    const card = node("button", row.unread ? "desk-thread is-unread" : "desk-thread");
    card.type = "button";
    card.setAttribute("data-desk", "thread");
    card.setAttribute("data-id", row.id);
    const top = node("span", "desk-thread-top");
    const title = node("span", "desk-thread-title");
    title.textContent = row.subject;
    top.appendChild(title);
    if (row.unread) {
      const fresh = node("span", "desk-new");
      fresh.textContent = "New";
      top.appendChild(fresh);
    }
    card.appendChild(top);
    const meta = node("span", "desk-when");
    const parts = [];
    if (operator) parts.push(row.sender_email || "No confirmed address");
    parts.push(formatWhen(row.last_at));
    if (row.replies) parts.push(row.replies === 1 ? "1 reply" : row.replies + " replies");
    meta.textContent = parts.join(" · ");
    card.appendChild(meta);
    const preview = node("span", "desk-preview");
    preview.textContent = row.body;
    card.appendChild(preview);
    return card;
  }

  function paintMessage(row, operator) {
    const mine = operator ? row.from_operator : !row.from_operator;
    const item = node("article", mine ? "desk-msg is-mine" : "desk-msg");
    const who = node("p", "desk-when");
    const name = mine ? "You" : (operator ? "Reader" : "The operator");
    who.textContent = name + " · " + formatWhen(row.created_at, true);
    item.appendChild(who);
    const body = node("p", "desk-body");
    body.textContent = row.body;
    item.appendChild(body);
    return item;
  }

  function paintThread() {
    const row = findThread(threadId);
    const operator = isOperator();
    threadTitle.textContent = row ? row.subject : "Conversation";
    threadMeta.textContent = row && operator ? (row.sender_email || "No confirmed address") : "";
    threadMeta.hidden = !threadMeta.textContent;
    threadClear.hidden = !operator;
    threadClear.setAttribute("data-id", threadId);
    threadClear.removeAttribute("data-confirm");
    threadClear.textContent = "Clear for both sides";
    threadClear.disabled = !!inflight["help:" + threadId];
    clear(threadList);
    if (threadState === "loading") {
      line(threadList, "desk-empty", "Opening…");
    } else if (threadState === "error") {
      line(threadList, "desk-empty", "This conversation could not be opened.");
    } else {
      threadRows.forEach(function (msg) { threadList.appendChild(paintMessage(msg, operator)); });
    }
    replyForm.hidden = threadState !== "";
  }

  function paintInbox() {
    if (!inboxList) return;
    const signed = !!userId();
    const operator = isOperator();
    const showThread = signed && !!threadId;
    inboxGuest.hidden = signed;
    inboxListView.hidden = !signed || showThread;
    threadView.hidden = !showThread;
    if (showThread) {
      paintThread();
    } else {
      inboxHeading.textContent = operator ? "From readers" : "Your notes and replies";
      clear(inboxList);
      if (!threads.length) {
        line(inboxList, "desk-empty", operator
          ? "No notes waiting."
          : "Nothing yet. Notes you send to the operator, and the replies, appear here.");
      } else {
        threads.forEach(function (row) { inboxList.appendChild(paintThreadCard(row, operator)); });
      }
    }
    paintBadge();
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
    if (!uid) {
      threads = [];
      paintInbox();
      return;
    }
    const db = client();
    if (!db || typeof db.rpc !== "function") return;
    const operator = isOperator();
    db.rpc(operator ? "exhibit_help_inbox" : "exhibit_help_mine").then(function (res) {
      if (!still(gen, uid) || isOperator() !== operator) return;
      const rows = res && !res.error && Array.isArray(res.data) ? res.data : [];
      threads = [];
      rows.forEach(function (row) {
        const clean = cleanThread(row);
        if (clean) threads.push(clean);
      });
      if (threadId && !findThread(threadId)) closeThread();
      paintInbox();
    }, function () {
      if (!still(gen, uid)) return;
      threads = [];
      paintInbox();
    });
  }

  function loadThread(gen, uid, id) {
    const db = client();
    if (!db || typeof db.rpc !== "function") {
      threadState = "error";
      paintInbox();
      return;
    }
    db.rpc("exhibit_help_thread", { p_note: id }).then(function (res) {
      if (!still(gen, uid) || threadId !== id) return;
      if (!res || res.error) {
        threadState = "error";
        paintInbox();
        return;
      }
      threadRows = [];
      (Array.isArray(res.data) ? res.data : []).forEach(function (row) {
        const clean = cleanMessage(row);
        if (clean) threadRows.push(clean);
      });
      threadState = threadRows.length ? "" : "error";
      paintInbox();
      if (threadRows.length) markSeen(gen, uid, id);
    }, function () {
      if (!still(gen, uid) || threadId !== id) return;
      threadState = "error";
      paintInbox();
    });
  }

  function markSeen(gen, uid, id) {
    const row = findThread(id);
    if (!row || !row.unread) return;
    const db = client();
    if (!db || typeof db.rpc !== "function") return;
    db.rpc("exhibit_help_seen", { p_note: id }).then(function (res) {
      if (!still(gen, uid) || !res || res.error) return;
      const current = findThread(id);
      if (current) current.unread = false;
      paintBadge();
    }, function () {});
  }

  function openThread(id) {
    if (!isId(id) || !userId()) return;
    threadId = id;
    threadRows = [];
    threadState = "loading";
    paintInbox();
    if (threadBack) threadBack.focus();
    loadThread(generation, userId(), id);
  }

  function closeThread() {
    threadId = "";
    threadRows = [];
    threadState = "";
  }

  function backToList() {
    const id = threadId;
    closeThread();
    paintInbox();
    const card = isId(id) && inboxList ? inboxList.querySelector('[data-id="' + id + '"]') : null;
    if (card) card.focus();
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
    threads = [];
    closeThread();
    Object.keys(inflight).forEach(function (key) { delete inflight[key]; });
    paintNotices();
    paintInbox();
    loadNotices(gen, uid);
    loadInbox(gen, uid);
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
      threads = threads.filter(function (row) { return row.id !== id; });
      if (threadId === id) closeThread();
      setStatus("Cleared for both sides.");
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
    if (act === "tab") {
      selectTab(btn.getAttribute("data-tab"), false);
      return;
    }
    if (act === "back") {
      backToList();
      return;
    }
    if (!isId(id)) return;
    if (act === "thread") {
      openThread(id);
      return;
    }
    const state = receipts[id] || { read: false, hidden: false };
    if (act === "read") applyState(id, true, !!state.hidden);
    else if (act === "unread") applyState(id, false, !!state.hidden);
    else if (act === "hide") {
      if (confirmOr(btn, "Remove for you?")) applyState(id, !!state.read, true);
    } else if (act === "retract") {
      if (confirmOr(btn, "Remove for everyone?")) retractNotice(id);
    } else if (act === "drop-help") {
      if (confirmOr(btn, "Clear for both sides?")) dropHelp(id);
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
      setStatus("The operator has your note. Replies will appear in your inbox.");
      closeThread();
      selectTab("inbox", false);
      loadInbox(gen, uid);
    }, function () {
      unlock("help-send");
      if (still(gen, uid)) setStatus("That could not be saved.");
    });
  }

  function submitReply(event) {
    event.preventDefault();
    const id = threadId;
    if (!userId() || !isId(id)) return;
    const body = clippedBlock(replyForm.body.value, BODY_MAX);
    if (!body) {
      setStatus("Write a reply first.");
      return;
    }
    if (!lock("reply")) return;
    const db = client();
    const gen = generation;
    const uid = userId();
    if (!db || typeof db.rpc !== "function") {
      unlock("reply");
      setStatus("That could not be saved.");
      return;
    }
    db.rpc("exhibit_help_reply", { p_note: id, p_body: body }).then(function (res) {
      unlock("reply");
      if (!still(gen, uid)) return;
      if (!res || res.error) {
        setStatus(plainError(res && res.error));
        return;
      }
      replyForm.reset();
      setStatus("Reply sent.");
      if (threadId === id) loadThread(gen, uid, id);
      loadInbox(gen, uid);
    }, function () {
      unlock("reply");
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

  function selectTab(name, focus) {
    if (TABS.indexOf(name) < 0 || !tabButtons[name]) return;
    tab = name;
    TABS.forEach(function (key) {
      const on = key === name;
      tabButtons[key].setAttribute("aria-selected", on ? "true" : "false");
      tabButtons[key].tabIndex = on ? 0 : -1;
      tabPanes[key].hidden = !on;
    });
    if (focus) tabButtons[name].focus();
  }

  function onTabKey(event) {
    const at = TABS.indexOf(tab);
    let next = -1;
    if (event.key === "ArrowRight") next = (at + 1) % TABS.length;
    else if (event.key === "ArrowLeft") next = (at + TABS.length - 1) % TABS.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = TABS.length - 1;
    if (next < 0) return;
    event.preventDefault();
    selectTab(TABS[next], true);
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
    if (inboxUnread() && !unreadCount()) selectTab("inbox", false);
    const closeBtn = panel.querySelector(".desk-close");
    if (closeBtn) closeBtn.focus();
    const uid = userId();
    if (uid) loadInbox(generation, uid);
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

  function buildTab(tabs, name, label) {
    const btn = node("button", "desk-tab");
    btn.type = "button";
    btn.id = "desk-tab-" + name;
    btn.setAttribute("role", "tab");
    btn.setAttribute("aria-controls", "desk-pane-" + name);
    btn.setAttribute("data-desk", "tab");
    btn.setAttribute("data-tab", name);
    const text = node("span");
    text.textContent = label;
    btn.appendChild(text);
    if (name !== "write") {
      const count = node("span", "desk-count");
      count.hidden = true;
      btn.appendChild(count);
      tabCounts[name] = count;
    }
    tabs.appendChild(btn);
    tabButtons[name] = btn;
  }

  function buildPane(name) {
    const pane = node("div", "desk-pane");
    pane.id = "desk-pane-" + name;
    pane.setAttribute("role", "tabpanel");
    pane.setAttribute("aria-labelledby", "desk-tab-" + name);
    tabPanes[name] = pane;
    return pane;
  }

  function buildNotices() {
    const pane = buildPane("notices");
    const notes = node("section", "desk-section");
    const heading = node("h3");
    heading.textContent = "From the operator";
    notes.appendChild(heading);
    syncLine = line(notes, "desk-note", "Sign in to keep read and removed notes with your account.");
    listNode = node("div");
    notes.appendChild(listNode);
    pane.appendChild(notes);
    return pane;
  }

  function buildInbox() {
    const pane = buildPane("inbox");
    inboxGuest = line(pane, "desk-note desk-section", "Sign in to see the notes you sent and the operator's replies.");
    inboxListView = node("section", "desk-section");
    inboxHeading = node("h3");
    inboxListView.appendChild(inboxHeading);
    inboxList = node("div", "desk-threads");
    inboxListView.appendChild(inboxList);
    pane.appendChild(inboxListView);

    threadView = node("section", "desk-section");
    threadView.hidden = true;
    threadBack = node("button", "desk-text");
    threadBack.type = "button";
    threadBack.setAttribute("data-desk", "back");
    threadBack.textContent = "← All messages";
    threadView.appendChild(threadBack);
    threadTitle = node("h3", "desk-thread-head");
    threadView.appendChild(threadTitle);
    threadMeta = line(threadView, "desk-note", "");
    threadList = node("div", "desk-msgs");
    threadView.appendChild(threadList);
    replyForm = node("form", "desk-reply");
    field(replyForm, "textarea", "body", "Reply", BODY_MAX);
    const send = node("button", "desk-send");
    send.type = "submit";
    send.textContent = "Send reply";
    replyForm.appendChild(send);
    replyForm.addEventListener("submit", submitReply);
    threadView.appendChild(replyForm);
    const actions = node("div", "desk-actions");
    threadClear = actionButton("Clear for both sides", "drop-help", "");
    actions.appendChild(threadClear);
    threadView.appendChild(actions);
    pane.appendChild(threadView);
    return pane;
  }

  function buildHelp() {
    const section = node("section", "desk-section");
    const heading = node("h3");
    heading.textContent = "Write to the operator";
    section.appendChild(heading);
    guestLine = line(section, "desk-note", "Sign in to send a note. Replies come back to your inbox, and the operator sees only your confirmed address.");
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

  function buildWrite() {
    const pane = buildPane("write");
    pane.appendChild(buildHelp());
    pane.appendChild(buildPublish());
    return pane;
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
    const tabs = node("div", "desk-tabs");
    tabs.setAttribute("role", "tablist");
    tabs.setAttribute("aria-label", "Messages");
    buildTab(tabs, "notices", "Notices");
    buildTab(tabs, "inbox", "Inbox");
    buildTab(tabs, "write", "Write");
    tabs.addEventListener("keydown", onTabKey);
    sheet.appendChild(tabs);
    statusNode = node("p", "desk-status");
    statusNode.setAttribute("role", "status");
    sheet.appendChild(statusNode);
    sheet.appendChild(buildNotices());
    sheet.appendChild(buildInbox());
    sheet.appendChild(buildWrite());
    panel.appendChild(backdrop);
    panel.appendChild(sheet);
    root.appendChild(launcher);
    root.appendChild(panel);
    root.addEventListener("click", onPanelClick);
    document.body.appendChild(root);
    selectTab(tab, false);
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
