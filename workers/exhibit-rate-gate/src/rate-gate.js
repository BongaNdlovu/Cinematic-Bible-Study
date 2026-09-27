const WINDOWS = {
  all: [240, 60000]
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

function takeBucket(store, ip, name, now) {
  const spec = WINDOWS[name];
  const key = name + ":" + ip;
  let bucket = store.get(key);
  if (!bucket || now - bucket.start >= spec[1]) bucket = { start: now, n: 0 };
  bucket.n += 1;
  store.set(key, bucket);
  return bucket.n <= spec[0];
}

export function allow(store, ip, path, now) {
  const when = now || Date.now();
  if (isStaticPath(path)) return true;
  return takeBucket(store, ip, "all", when);
}
