(function () {
  const TITLE_MAX = 120;
  const BODY_MAX = 2000;

  function isId(value) {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(value || ""));
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

  window.DeskRows = Object.freeze({ TITLE_MAX, BODY_MAX, isId, clippedLine, clippedBlock, formatWhen, plainError, safeEmail, cleanNotice, cleanThread, cleanMessage });
})();
