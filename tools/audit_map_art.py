from pathlib import Path
import re
import hashlib
from collections import defaultdict

root = Path(__file__).resolve().parents[1]
text = (root / "map-data.js").read_text(encoding="utf-8")
arts = []
section = None
for i, line in enumerate(text.splitlines(), 1):
    if re.search(r"^\s*empires:\s*\{", line):
        section = "empires"
    elif re.search(r"^\s*cities:\s*\[", line):
        section = "cities"
    elif re.search(r"^\s*events:\s*\[", line):
        section = "events"
    elif re.search(r"^\s*epochs:\s*\[", line):
        section = "epochs"
    elif re.search(r"\.routes\s*=", line) or re.search(r"^\s*routes:\s*\[", line):
        section = "routes"
    m = re.search(r'art:\s*"([^"]+)"', line)
    if m and section in ("cities", "events", "empires"):
        arts.append((section, m.group(1), i))

missing = []
hmap = defaultdict(list)
for sec, p, i in arts:
    fp = root / p
    ok = fp.exists()
    if not ok:
        missing.append((sec, p))
        digest = "MISSING"
    else:
        digest = hashlib.md5(fp.read_bytes()).hexdigest()
        hmap[digest].append((sec, p))
    print(f"{sec:8} {p:55} exists={ok}")

print("--- content duplicates among city/event/empire ---")
dups = 0
for digest, items in hmap.items():
    if len(items) > 1:
        dups += 1
        print("DUP", items)
if not dups:
    print("none")
print("missing", missing)
print("city+event count", sum(1 for s, _, _ in arts if s in ("cities", "events")))
print("unique city+event paths", len({p for s, p, _ in arts if s in ("cities", "events")}))
if missing:
    raise SystemExit(1)
