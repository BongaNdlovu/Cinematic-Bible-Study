import re
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "assets" / "maps" / "globe"
SITES = ROOT / "js" / "map" / "map-data.js"
W, H = 1024, 512
SITE_LINE = re.compile(r'^\s*\{ id: "[^"]+", name: "[^"]*", lon: (-?[\d.]+), lat: (-?[\d.]+)', re.M)


def sphere_grid():
    lon = (np.arange(W) + 0.5) / W * 2 * np.pi - np.pi
    lat = np.pi / 2 - (np.arange(H) + 0.5) / H * np.pi
    lon, lat = np.meshgrid(lon, lat)
    return np.stack([np.cos(lat) * np.cos(lon), np.sin(lat), np.cos(lat) * np.sin(lon)]), np.degrees(lat)


def lattice(rng, size):
    return rng.random((size, size, size)).astype(np.float32)


def value_noise(table, p):
    n = table.shape[0]
    i = np.floor(p).astype(np.int64)
    f = p - i
    f = f * f * (3 - 2 * f)
    i0 = i % n
    i1 = (i + 1) % n
    out = 0
    for dx in (0, 1):
        for dy in (0, 1):
            for dz in (0, 1):
                v = table[(i1 if dx else i0)[0], (i1 if dy else i0)[1], (i1 if dz else i0)[2]]
                w = (f[0] if dx else 1 - f[0]) * (f[1] if dy else 1 - f[1]) * (f[2] if dz else 1 - f[2])
                out = out + v * w
    return out


def fbm(table, p, octaves, base):
    total = np.zeros(p.shape[1:], np.float32)
    amp, norm, freq = 0.5, 0.0, base
    for _ in range(octaves):
        total += amp * value_noise(table, p * freq + 17.0)
        norm += amp
        amp *= 0.5
        freq *= 2.03
    return total / norm


def smoothstep(a, b, x):
    t = np.clip((x - a) / (b - a), 0, 1)
    return t * t * (3 - 2 * t)


def clouds(p, lat):
    rng = np.random.default_rng(605)
    table = lattice(rng, 64)
    warp = np.stack([fbm(table, p + o, 4, 1.6) for o in (0.0, 5.3, 9.7)]) - 0.5
    n = fbm(table, p + warp * 0.55, 8, 4.2)
    grain = fbm(table, p + 31.0, 4, 22.0)
    a = np.abs(lat)
    band = 0.12 * np.exp(-(lat / 8) ** 2) - 0.14 * np.exp(-((a - 24) / 9) ** 2) + 0.1 * np.exp(-((a - 55) / 12) ** 2)
    c = smoothstep(0.44, 0.7, n + band) * (0.55 + 0.45 * smoothstep(0.3, 0.7, grain))
    return (np.clip(c, 0, 1) * 255).astype(np.uint8)


def land_mask():
    water = Image.open(OUT / "earth-water-2k.webp").convert("L").resize((W, H), Image.BILINEAR)
    return np.asarray(water, np.float32) < 128


def glow(img, lat, lon, sigma, gain):
    x = (lon + 180) / 360 * W
    y = (90 - lat) / 180 * H
    r = int(np.ceil(sigma * 3))
    xs = np.arange(int(x) - r, int(x) + r + 1)
    ys = np.arange(max(0, int(y) - r), min(H, int(y) + r + 1))
    gx, gy = np.meshgrid(xs, ys)
    k = gain * np.exp(-((gx + 0.5 - x) ** 2 + (gy + 0.5 - y) ** 2) / (2 * sigma * sigma))
    np.add.at(img, (gy, gx % W), k.astype(np.float32))


def night():
    text = SITES.read_text(encoding="utf-8")
    sites = sorted({(round(float(lat), 1), round(float(lon), 1)) for lon, lat in SITE_LINE.findall(text)})
    land = land_mask()
    rng = np.random.default_rng(1844)
    img = np.zeros((H, W), np.float32)
    for lat, lon in sites:
        glow(img, lat, lon, 1.3, 0.9)
        for _ in range(26):
            hl = lat + rng.normal(0, 2.4)
            ho = lon + rng.normal(0, 3.0)
            px = int((ho + 180) / 360 * W) % W
            py = min(H - 1, max(0, int((90 - hl) / 180 * H)))
            if land[py, px]:
                glow(img, hl, ho, 0.7, rng.uniform(0.12, 0.4))
    return (np.clip(img, 0, 1) ** 0.8 * 255).astype(np.uint8), len(sites)


def save(name, data):
    path = OUT / name
    Image.fromarray(data, "L").convert("RGB").save(path, "WEBP", quality=82, method=6)
    return path.stat().st_size


def main():
    p, lat = sphere_grid()
    sky = save("earth-clouds-1k.webp", clouds(p, lat))
    lights, count = night()
    dark = save("earth-night-1k.webp", lights)
    print(f"earth-clouds-1k.webp {sky} bytes; earth-night-1k.webp {dark} bytes from {count} sites")


if __name__ == "__main__":
    main()
