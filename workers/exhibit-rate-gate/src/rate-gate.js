const WINDOWS = {
  all: [240, 60000],
  account: [30, 60000],
  report: [10, 60000]
};

const STATIC_PREFIXES = [
  "/assets/",
  "/js/",
  "/css/",
  "/vendor/",
  "/models/",
  "/bible/"
];

function isStaticPath(path) {
  const p = String(path || "");
  for (let i = 0; i < STATIC_PREFIXES.length; i += 1) {
    if (p.startsWith(STATIC_PREFIXES[i])) return true;
  }
  return false;
}

function bucketName(path) {
  const p = String(path || "");
  if (p === "/csp-report") return "report";
  if (p === "/account" || p === "/account.html") return "account";
  return "all";
}

function prune(store, now) {
  const stale = [];
  store.forEach(function (bucket, key) {
    const spec = WINDOWS[String(key).split(":")[0]];
    if (!spec || !bucket || now - bucket.start >= spec[1]) stale.push(key);
  });
  stale.forEach(function (key) { store.delete(key); });
}

function takeBucket(store, ip, name, now) {
  const spec = WINDOWS[name];
  const key = name + ":" + ip;
  let bucket = store.get(key);
  if (!bucket || now - bucket.start >= spec[1]) bucket = { start: now, n: 0 };
  store.set(key, bucket);
  if (bucket.n > spec[0]) return { ok: false, first: false };
  bucket.n += 1;
  return { ok: bucket.n <= spec[0], first: bucket.n === spec[0] + 1 };
}

export function decide(store, ip, path, now) {
  const when = now || Date.now();
  prune(store, when);
  if (isStaticPath(path)) return { ok: true, first: false };
  return takeBucket(store, ip, bucketName(path), when);
}

export function allow(store, ip, path, now) {
  return decide(store, ip, path, now).ok;
}
