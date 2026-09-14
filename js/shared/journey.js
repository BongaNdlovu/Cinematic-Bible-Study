(function () {
  const KEY = "baJourney";
  const EMPIRE_LABELS = {
    gold: "Gold kingdom",
    silver: "Silver kingdom",
    bronze: "Bronze kingdom",
    iron: "Iron kingdom",
    stone: "Stone kingdom"
  };
  const YEAR_LABELS = {
    y605: "605 BC",
    y539: "539 BC",
    y457: "457 BC",
    y331: "331 BC",
    y168: "168 BC",
    y31: "AD 31",
    y538: "AD 538",
    y1798: "AD 1798",
    y1844: "1844",
    y12: "Daniel 12"
  };
  const ARTIFACT_EMPIRE = {
    assembled: "gold",
    head: "gold",
    lion: "gold",
    chest: "silver",
    bear: "silver",
    thighs: "bronze",
    leopard: "bronze",
    legs: "iron",
    beast: "iron",
    years1260: "iron",
    feet: "stone",
    stone: "stone",
    ox_king: "gold",
    decree: "silver",
    kings: "stone",
    michael: "stone",
    sealed: "stone"
  };

  const SHEET_COUNT = 11;
  const TERMS_VERSION = 1;
  const TEMP_REVIEW_UNLOCK = false;
  const SITTING_ASSETS = [
    ["assembled"],
    ["lion"],
    ["head", "chest", "thighs", "legs", "feet", "stone"],
    ["dura"],
    ["stump", "ox_king"],
    [],
    ["bear"],
    ["leopard", "beast", "years1260", "ancient", "son"],
    ["ram", "goat", "goat_broken", "goat_horn"],
    ["decree"],
    ["kings", "michael", "sealed"]
  ];
  const SITTING_YEARS = [
    ["y605"],
    ["y605"],
    ["y605"],
    ["y605"],
    ["y605"],
    ["y539"],
    ["y539"],
    ["y538", "y1798", "y1844"],
    ["y1844", "y331", "y457"],
    ["y457", "y31", "y1844"],
    ["y12"]
  ];
  const SITTING_NODES = [
    ["siege-jerusalem", "babylon", "rome"],
    ["siege-jerusalem", "babylon", "jerusalem"],
    ["babylon", "rome", "jerusalem"],
    ["dura-image", "babylon", "jerusalem"],
    ["watcher-stump", "babylon", "jerusalem"],
    ["fall-babylon", "babylon", "jerusalem"],
    ["lions-den", "babylon", "jerusalem"],
    ["ostrogoths-out", "berthier", "rome", "sanctuary-1844"],
    ["ulai-vision", "gaugamela", "sanctuary-1844", "jerusalem", "miller-lowhampton", "himes-boston", "exeter-seventh-month", "disappointment-1844", "edson-port-gibson", "washington-nh", "morse-telegraph"],
    ["artaxerxes-decree", "calvary", "jerusalem", "sanctuary-1844", "miller-lowhampton", "disappointment-1844"],
    ["hiddekel-theophany", "alexandria", "rome", "michael-stands"]
  ];
  const SHEET_LABELS = [
    "Prologue",
    "Daniel 1",
    "Daniel 2",
    "Daniel 3",
    "Daniel 4",
    "Daniel 5",
    "Daniel 6",
    "Daniel 7",
    "Daniel 8",
    "Daniel 9",
    "Daniel 10–12"
  ];

  // Sequential sittings: only sitting 0 starts open. Completing N opens N+1
  // for study sheets, gallery assets, and map pins. Client-side only.
  const ENABLE_BETA_PREVIEW_DEFAULT = false;

  const defaults = {
    year: "y605",
    sheet: 0,
    artifact: "assembled",
    reducedMotion: false,
    unlocked: [],
    station: { s2: null, s7: null },
    pathSheet: -1,
    seenIntro: {},
    previewFull: false,
    betaPreview: ENABLE_BETA_PREVIEW_DEFAULT,
    identity: null,
    termsAccepted: null,
    termsByUser: {},
    pendingTerms: null,
    completedSheets: []
  };

  function normalize(raw) {
    const next = Object.assign({}, defaults, raw || {});
    next.unlocked = Array.isArray(next.unlocked) ? next.unlocked.filter(Boolean) : [];
    next.station = Object.assign({ s2: null, s7: null }, next.station || {});
    next.seenIntro = next.seenIntro && typeof next.seenIntro === "object" ? next.seenIntro : {};
    if (typeof next.pathSheet !== "number" || Number.isNaN(next.pathSheet)) next.pathSheet = -1;
    if (typeof next.sheet !== "number" || Number.isNaN(next.sheet)) next.sheet = 0;
    next.reducedMotion = !!next.reducedMotion;
    next.previewFull = !!next.previewFull;
    next.betaPreview = (raw && typeof raw.betaPreview === "boolean") ? raw.betaPreview : ENABLE_BETA_PREVIEW_DEFAULT;
    const ident = raw && raw.identity;
    if (ident && typeof ident === "object") {
      next.identity = {
        id: String(ident.id || ""),
        email: String(ident.email || ""),
        name: String(ident.name || "")
      };
    } else {
      next.identity = null;
    }
    const terms = raw && raw.termsAccepted;
    if (terms && typeof terms === "object" && Number(terms.version) > 0) {
      next.termsAccepted = {
        version: Number(terms.version),
        at: Number(terms.at) || 0,
        userId: String(terms.userId || "")
      };
    } else {
      next.termsAccepted = null;
    }
    const byUser = {};
    const rawMap = raw && raw.termsByUser && typeof raw.termsByUser === "object" ? raw.termsByUser : {};
    Object.keys(rawMap).forEach(function (id) {
      const rec = rawMap[id];
      if (!id || !rec || typeof rec !== "object" || Number(rec.version) <= 0) return;
      byUser[id] = { version: Number(rec.version), at: Number(rec.at) || 0 };
    });
    const tid = next.termsAccepted && next.termsAccepted.userId ? next.termsAccepted.userId : "";
    if (tid && Number(next.termsAccepted.version) > 0 && !byUser[tid]) {
      byUser[tid] = { version: Number(next.termsAccepted.version), at: Number(next.termsAccepted.at) || 0 };
    }
    next.termsByUser = byUser;
    const done = [];
    const rawDone = raw && Array.isArray(raw.completedSheets) ? raw.completedSheets : [];
    rawDone.forEach(function (n) {
      const i = Number(n);
      if (!Number.isNaN(i) && i >= 0 && i < SHEET_COUNT && done.indexOf(i) === -1) done.push(i);
    });
    next.completedSheets = done;
    const pending = raw && raw.pendingTerms;
    if (pending && typeof pending === "object" && Number(pending.version) > 0) {
      next.pendingTerms = { version: Number(pending.version), at: Number(pending.at) || 0 };
    } else {
      next.pendingTerms = null;
    }
    return next;
  }

  function migrateMastery(raw) {
    if (raw && Array.isArray(raw.completedSheets) && raw.completedSheets.length) return raw;
    try {
      const legacy = JSON.parse(localStorage.getItem("daniel_historicist_mastery") || "[]");
      if (Array.isArray(legacy) && legacy.length) {
        raw = raw || {};
        raw.completedSheets = legacy;
      }
    } catch (e) {}
    return raw;
  }

  function load() {
    try {
      return normalize(migrateMastery(JSON.parse(localStorage.getItem(KEY) || "{}")));
    } catch (e) {
      return normalize(migrateMastery({}));
    }
  }

  function save(partial) {
    const cur = load();
    const patch = partial || {};
    const next = normalize(Object.assign({}, cur, patch, { t: Date.now() }));
    if (patch.station) next.station = Object.assign({}, cur.station, patch.station);
    if (patch.unlocked) next.unlocked = Array.from(new Set(patch.unlocked));
    if (patch.seenIntro) next.seenIntro = Object.assign({}, cur.seenIntro, patch.seenIntro);
    if (patch.termsByUser) next.termsByUser = Object.assign({}, cur.termsByUser, patch.termsByUser);
    if (patch.completedSheets) {
      next.completedSheets = Array.from(new Set(patch.completedSheets.map(Number).filter(function (n) {
        return n >= 0 && n < SHEET_COUNT;
      })));
    }
    try { localStorage.setItem(KEY, JSON.stringify(next)); } catch (e) {}
    return next;
  }

  function unlock(empire) {
    if (!empire || !EMPIRE_LABELS[empire]) return load();
    const cur = load();
    return save({ unlocked: cur.unlocked.concat([empire]) });
  }

  function isUnlocked(empire) {
    return load().unlocked.indexOf(empire) !== -1;
  }

  function prefersReducedMotion() {
    try {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return true;
    } catch (e) {}
    return !!load().reducedMotion;
  }

  function empireForAsset(key) {
    return ARTIFACT_EMPIRE[key] || null;
  }

  function yearLabel(id) {
    return YEAR_LABELS[id] || id || "605 BC";
  }

  function empireLabel(id) {
    return EMPIRE_LABELS[id] || EMPIRE_LABELS.gold;
  }

  function sheetLabel(index) {
    const i = Number(index);
    if (Number.isNaN(i) || i < 0) return SHEET_LABELS[0];
    return SHEET_LABELS[i] || SHEET_LABELS[0];
  }

  function completedSet() {
    return new Set((load().completedSheets || []).map(Number));
  }

  function maxOpenSheet() {
    if (TEMP_REVIEW_UNLOCK) return SHEET_COUNT - 1;
    const done = completedSet();
    let open = 0;
    for (let i = 0; i < SHEET_COUNT - 1; i++) {
      if (done.has(i)) open = i + 1;
      else break;
    }
    return open;
  }

  function canAccessSheet(index) {
    const i = Number(index);
    if (Number.isNaN(i) || i < 0) return true;
    return i <= maxOpenSheet();
  }

  function clampToAccessible(index) {
    const i = Number(index);
    if (Number.isNaN(i) || i < 0) return 0;
    const cap = maxOpenSheet();
    return i > cap ? cap : i;
  }

  function sittingForAsset(key) {
    const k = key === "altar" ? "assembled" : key;
    for (let i = 0; i < SITTING_ASSETS.length; i++) {
      if (SITTING_ASSETS[i].indexOf(k) >= 0) return i;
    }
    return -1;
  }

  function canAccessAsset(key) {
    const sitting = sittingForAsset(key);
    if (sitting < 0) return false;
    return canAccessSheet(sitting);
  }

  function openNodeIds() {
    const open = maxOpenSheet();
    const ids = {};
    for (let i = 0; i <= open; i++) {
      (SITTING_NODES[i] || []).forEach(function (id) { ids[id] = true; });
      const pack = window.SHEET_MAP && window.SHEET_MAP[i];
      if (pack && pack.nodes) {
        pack.nodes.forEach(function (n) { if (n && n.id) ids[n.id] = true; });
      }
    }
    return ids;
  }

  function canAccessMapNode(id) {
    if (!id) return false;
    return !!openNodeIds()[id];
  }

  function canAccessYear(yearId) {
    if (!yearId) return false;
    const open = maxOpenSheet();
    for (let i = 0; i <= open; i++) {
      if ((SITTING_YEARS[i] || []).indexOf(yearId) >= 0) return true;
    }
    return false;
  }

  function markSheetComplete(index) {
    const i = Number(index);
    if (Number.isNaN(i) || i < 0 || i >= SHEET_COUNT) return load();
    const cur = load();
    const next = (cur.completedSheets || []).concat([i]);
    const saved = save({ completedSheets: next, pathSheet: i, sheet: clampToAccessible(i + 1) });
    try {
      localStorage.setItem("daniel_historicist_mastery", JSON.stringify(saved.completedSheets));
    } catch (e) {}
    return saved;
  }

  function hasSeenIntro(index) {
    return !!load().seenIntro[String(index)];
  }

  function markIntroSeen(index) {
    const seenIntro = {};
    seenIntro[String(index)] = true;
    return save({ seenIntro: seenIntro });
  }

  function enablePreview() {
    return save({ previewFull: true, betaPreview: true });
  }

  function enableBetaPreview() {
    return save({ previewFull: true, betaPreview: true });
  }

  function isBetaPreview() {
    const cur = load();
    return !!(cur.previewFull || cur.betaPreview);
  }

  function hasProgress() {
    const cur = load();
    return cur.sheet > 0
      || (typeof cur.pathSheet === "number" && cur.pathSheet >= 0)
      || (cur.completedSheets && cur.completedSheets.length > 0);
  }

  function resumeSheet() {
    return clampToAccessible(load().sheet || 0);
  }

  function resumeHref() {
    return "study.html?sheet=" + resumeSheet();
  }

  function resumeLabel() {
    if (!hasProgress()) return "Begin the sitting";
    return "Continue " + sheetLabel(resumeSheet());
  }

  function currentUserId() {
    try {
      const u = window.ScrollAuth && window.ScrollAuth.getUser && window.ScrollAuth.getUser();
      return (u && u.id) ? String(u.id) : "";
    } catch (e) {
      return "";
    }
  }

  function termsRecordOk(rec) {
    return !!(rec && Number(rec.version) === TERMS_VERSION);
  }

  function hasAcceptedTerms() {
    const id = currentUserId();
    if (!id) return false;
    const cur = load();
    if (termsRecordOk(cur.termsByUser[id])) return true;
    return !!(cur.termsAccepted && cur.termsAccepted.userId === id && termsRecordOk(cur.termsAccepted));
  }

  function acceptTerms() {
    const at = Date.now();
    const id = currentUserId();
    if (id) {
      const cur = load();
      const termsByUser = Object.assign({}, cur.termsByUser);
      termsByUser[id] = { version: TERMS_VERSION, at: at };
      save({
        termsByUser: termsByUser,
        termsAccepted: { version: TERMS_VERSION, at: at, userId: id },
        pendingTerms: null
      });
      try {
        const stored = JSON.parse(localStorage.getItem(KEY) || "{}");
        return !!(stored.termsByUser && stored.termsByUser[id] && Number(stored.termsByUser[id].version) === TERMS_VERSION);
      } catch (e) {
        return false;
      }
    }
    save({ pendingTerms: { version: TERMS_VERSION, at: at } });
    try {
      const stored = JSON.parse(localStorage.getItem(KEY) || "{}");
      return !!(stored.pendingTerms && Number(stored.pendingTerms.version) === TERMS_VERSION);
    } catch (e) {
      return false;
    }
  }

  function commitPendingTerms(userId) {
    const id = String(userId || "");
    if (!id) return load();
    const cur = load();
    const termsByUser = Object.assign({}, cur.termsByUser);
    const pending = cur.pendingTerms;
    if (pending && Number(pending.version) === TERMS_VERSION) {
      termsByUser[id] = { version: TERMS_VERSION, at: Number(pending.at) || Date.now() };
    }
    const rec = termsByUser[id];
    return save({
      termsByUser: termsByUser,
      termsAccepted: rec
        ? { version: rec.version, at: rec.at, userId: id }
        : (cur.termsAccepted && cur.termsAccepted.userId === id ? cur.termsAccepted : null),
      pendingTerms: null
    });
  }

  function searchIndex() {
    const out = [];
    const map = window.MAP_CHRONICLE;
    if (map) {
      (map.epochs || []).forEach((ep) => {
        if (!canAccessYear(ep.id)) return;
        out.push({ kind: "epoch", id: ep.id, label: ep.label + " — " + ep.title, href: "map.html?year=" + ep.id });
      });
      (map.cities || []).forEach((c) => {
        if (!canAccessMapNode(c.id)) return;
        out.push({ kind: "city", id: c.id, label: c.name, href: "map.html?year=" + ((c.pulse && c.pulse[0]) || "y605") + "&event=" + c.id });
      });
      (map.events || []).forEach((ev) => {
        if (!canAccessMapNode(ev.id)) return;
        out.push({ kind: "event", id: ev.id, label: ev.name, href: "map.html?year=" + ev.yearId + "&event=" + ev.id });
      });
    }
    out.push(
      { kind: "page", id: "study", label: "Study desk", href: "study.html" },
      { kind: "page", id: "gallery", label: "3D gallery", href: "gallery.html" },
      { kind: "page", id: "map", label: "Map of History", href: "map.html" }
    );
    return out;
  }

  window.BAJourney = {
    load: load,
    save: save,
    unlock: unlock,
    isUnlocked: isUnlocked,
    prefersReducedMotion: prefersReducedMotion,
    empireForAsset: empireForAsset,
    yearLabel: yearLabel,
    empireLabel: empireLabel,
    searchIndex: searchIndex,
    sheetLabel: sheetLabel,
    canAccessSheet: canAccessSheet,
    clampToAccessible: clampToAccessible,
    canAccessAsset: canAccessAsset,
    canAccessMapNode: canAccessMapNode,
    canAccessYear: canAccessYear,
    maxOpenSheet: maxOpenSheet,
    markSheetComplete: markSheetComplete,
    sittingForAsset: sittingForAsset,
    SITTING_ASSETS: SITTING_ASSETS,
    hasSeenIntro: hasSeenIntro,
    markIntroSeen: markIntroSeen,
    enablePreview: enablePreview,
    enableBetaPreview: enableBetaPreview,
    isBetaPreview: isBetaPreview,
    hasProgress: hasProgress,
    resumeSheet: resumeSheet,
    resumeHref: resumeHref,
    resumeLabel: resumeLabel,
    hasAcceptedTerms: hasAcceptedTerms,
    acceptTerms: acceptTerms,
    commitPendingTerms: commitPendingTerms,
    TERMS_VERSION: TERMS_VERSION,
    SHEET_LABELS: SHEET_LABELS,
    EMPIRE_LABELS: EMPIRE_LABELS,
    YEAR_LABELS: YEAR_LABELS,
    ARTIFACT_EMPIRE: ARTIFACT_EMPIRE
  };
})();
