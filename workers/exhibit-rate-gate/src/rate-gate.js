const WINDOWS = {
  models: [60, 60000],
  bible: [30, 60000],
  all: [240, 60000]
};

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
  if (path.startsWith("/models/") && !takeBucket(store, ip, "models", when)) return false;
  if (path.startsWith("/bible/") && !takeBucket(store, ip, "bible", when)) return false;
  return takeBucket(store, ip, "all", when);
}
