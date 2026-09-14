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

  const FREE_THROUGH = 2;
  // TEMPORARY REVIEW UNLOCK — set false with study-app.js to restore the free/paid cut.
  const TEMP_REVIEW_UNLOCK = true;
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

  // ARCHITECTURAL SEAM: Student Beta Preview vs Future Commercial Paywall
  // Sheets 3 through 10 are currently accessible in an unlocked Student Beta Preview mode.
  // When a production payment/licensing gateway is connected in the future:
  // 1. Set ENABLE_BETA_PREVIEW_DEFAULT = false
  // 2. Add license/token verification inside canAccessSheet (e.g. cur.licenseToken or verified entitlement)
  // Curriculum data, quizzes, and workbenches require zero modifications.
  const ENABLE_BETA_PREVIEW_DEFAULT = true;

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
    identity: null
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
    return next;
  }

  function load() {
    try {
      return normalize(JSON.parse(localStorage.getItem(KEY) || "{}"));
    } catch (e) {
      return normalize({});
    }
  }

  function save(partial) {
    const cur = load();
    const patch = partial || {};
    const next = normalize(Object.assign({}, cur, patch, { t: Date.now() }));
    if (patch.station) next.station = Object.assign({}, cur.station, patch.station);
    if (patch.unlocked) next.unlocked = Array.from(new Set(patch.unlocked));
    if (patch.seenIntro) next.seenIntro = Object.assign({}, cur.seenIntro, patch.seenIntro);
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

  function canAccessSheet(index) {
    if (TEMP_REVIEW_UNLOCK) return true;
    const i = Number(index);
    if (Number.isNaN(i) || i < 0) return true;
    if (i <= FREE_THROUGH) return true;
    const cur = load();
    return !!(cur.previewFull || cur.betaPreview);
  }

  function clampToAccessible(index) {
    const i = Number(index);
    if (Number.isNaN(i) || i < 0) return 0;
    return canAccessSheet(i) ? i : FREE_THROUGH;
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
    return cur.sheet > 0 || (typeof cur.pathSheet === "number" && cur.pathSheet >= 0);
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

  function searchIndex() {
    const out = [];
    const map = window.MAP_CHRONICLE;
    if (map) {
      (map.epochs || []).forEach((ep) => {
        out.push({ kind: "epoch", id: ep.id, label: ep.label + " — " + ep.title, href: "map.html?year=" + ep.id });
      });
      (map.cities || []).forEach((c) => {
        out.push({ kind: "city", id: c.id, label: c.name, href: "map.html?year=" + ((c.pulse && c.pulse[0]) || "y605") + "&event=" + c.id });
      });
      (map.events || []).forEach((ev) => {
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
    hasSeenIntro: hasSeenIntro,
    markIntroSeen: markIntroSeen,
    enablePreview: enablePreview,
    enableBetaPreview: enableBetaPreview,
    isBetaPreview: isBetaPreview,
    hasProgress: hasProgress,
    resumeSheet: resumeSheet,
    resumeHref: resumeHref,
    resumeLabel: resumeLabel,
    FREE_THROUGH: FREE_THROUGH,
    SHEET_LABELS: SHEET_LABELS,
    EMPIRE_LABELS: EMPIRE_LABELS,
    YEAR_LABELS: YEAR_LABELS,
    ARTIFACT_EMPIRE: ARTIFACT_EMPIRE
  };
})();
