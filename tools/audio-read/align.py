"""Align a generated lesson audio transcript to that sitting's lesson text.

Usage: python align.py <sitting-NN>

Reads sitting-NN-meta.json, sitting-NN-content.html and
transcript-sitting-NN.json from this folder and writes
assets/study/audio/sitting-NN-overview.json — a cue list the study app uses
to stroke a faint highlighter over exactly the text being spoken.

Block enumeration and text cooking here MUST mirror the runtime code in
js/study/study-app.js (cook/normalize + block selector), otherwise char offsets
drift. Keep the two in sync.
"""
import json
import re
import sys
import unicodedata
from difflib import SequenceMatcher
from html.parser import HTMLParser
from pathlib import Path

HERE = Path(__file__).parent

WORDMAP = {
    "one": "1", "two": "2", "three": "3", "four": "4", "five": "5", "six": "6",
    "seven": "7", "eight": "8", "nine": "9", "ten": "10", "eleven": "11",
    "twelve": "12", "thirteen": "13", "fourteen": "14", "fifteen": "15",
    "sixteen": "16", "seventeen": "17", "eighteen": "18", "nineteen": "19",
    "twenty": "20", "thirty": "30", "forty": "40", "fifty": "50", "sixty": "60",
    "seventy": "70", "eighty": "80", "ninety": "90", "hundred": "100",
    "thousand": "1000", "million": "1000000",
    "i": "1", "ii": "2", "iii": "3", "iv": "4", "v": "5", "vi": "6",
    "vii": "7", "viii": "8", "ix": "9", "x": "10",
}


def fold(c):
    d = unicodedata.normalize("NFKD", c)
    return "".join(ch for ch in d if not unicodedata.combining(ch))


def cook(raw):
    """Whitespace-collapse + fold, per char, so offsets can be mirrored in JS."""
    out = []
    last_space = False
    for c in raw:
        if c.isspace():
            if not last_space and out:
                out.append(" ")
            last_space = True
        else:
            out.append(fold(c))
            last_space = False
    return "".join(out)


def tokens(cooked_text):
    toks = []
    for t in cooked_text.lower().split():
        t = "".join(ch for ch in t if ch.isalnum())
        if t:
            toks.append(WORDMAP.get(t, t))
    return toks


class Block:
    def __init__(self, tag, text):
        self.tag = tag
        self.cooked = cook(text)
        toks = []
        pos = 0
        for word in self.cooked.split():
            start = self.cooked.index(word, pos)
            pos = start + len(word)
            stripped = "".join(ch for ch in word.lower() if ch.isalnum())
            if not stripped:
                continue
            toks.append((WORDMAP.get(stripped, stripped), start, pos))
        self.toks = toks


class DOMNode:
    def __init__(self, tag, attrs=None):
        self.tag = tag
        self.attrs = attrs or {}
        self.parts = []  # str text or DOMNode, in document order

    def add_text(self, data):
        if data:
            if self.parts and isinstance(self.parts[-1], str):
                self.parts[-1] += data
            else:
                self.parts.append(data)

    def add_node(self, node):
        self.parts.append(node)

    def text(self):
        out = []
        for part in self.parts:
            out.append(part if isinstance(part, str) else part.text())
        return "".join(out)


class TreeBuilder(HTMLParser):
    BLOCK_TAGS = {"p", "h3", "h4", "blockquote", "li"}

    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.root = DOMNode("root")
        self.stack = [self.root]
        self.blocks = []  # (tag, class, text) in document order

    def handle_starttag(self, tag, attrs):
        node = DOMNode(tag, dict(attrs))
        self.stack[-1].add_node(node)
        if tag not in ("br", "hr", "img"):
            self.stack.append(node)
        parent_classes = " ".join(
            (n.attrs.get("class") or "") for n in self.stack
        )
        in_toc = "lesson-toc" in parent_classes
        if tag in self.BLOCK_TAGS and not in_toc:
            self._pending_block = len(self.blocks)
            self.blocks.append((tag, node.attrs.get("class") or "", node))
        else:
            self._pending_block = None

    def handle_endtag(self, tag):
        for i in range(len(self.stack) - 1, 0, -1):
            if self.stack[i].tag == tag:
                del self.stack[i:]
                break

    def handle_data(self, data):
        self.stack[-1].add_text(data)


def main():
    sitting = sys.argv[1] if len(sys.argv) > 1 else "sitting-00"
    out = HERE.parent.parent / "assets" / "study" / "audio" / f"{sitting}-overview.json"
    meta = json.loads((HERE / f"{sitting}-meta.json").read_text(encoding="utf-8"))
    content_html = (HERE / f"{sitting}-content.html").read_text(encoding="utf-8")
    transcript = json.loads((HERE / f"transcript-{sitting}.json").read_text(encoding="utf-8"))

    parser = TreeBuilder()
    parser.feed(content_html)

    blocks = [Block("title", meta["title"]), Block("subtitle", meta["subtitle"])]
    for tag, cls, node in parser.blocks:
        blocks.append(Block(tag, node.text()))

    lesson_toks = []  # (block_index, token, s, e)
    for bi, b in enumerate(blocks):
        for t, s, e in b.toks:
            lesson_toks.append((bi, t, s, e))
    lesson_seq = [x[1] for x in lesson_toks]

    audio_toks = []  # (token, start, end)
    for seg in transcript["segments"]:
        for w in seg.get("words", []):
            word = w["word"].strip()
            if not word:
                continue
            t = "".join(ch for ch in word.lower() if ch.isalnum())
            if not t:
                continue
            audio_toks.append((WORDMAP.get(t, t), w["start"], w["end"]))
    audio_seq = [a[0] for a in audio_toks]

    print(f"blocks={len(blocks)} lesson_tokens={len(lesson_seq)} audio_tokens={len(audio_seq)}")

    sm = SequenceMatcher(None, lesson_seq, audio_seq, autojunk=False)
    opcodes = sm.get_opcodes()
    matched = sum(j2 - j1 for tag, i1, i2, j1, j2 in opcodes if tag == "equal")
    print(f"audio token match: {matched}/{len(audio_seq)} = {matched/len(audio_seq):.1%}")

    # audio token index -> lesson token index, from equal runs
    audio_to_lesson = {}
    for tag, i1, i2, j1, j2 in opcodes:
        if tag == "equal":
            for k in range(j2 - j1):
                audio_to_lesson[j1 + k] = i1 + k

    # One cue per whisper segment: spans = the lesson text its matched tokens hit
    cues = []
    j = 0
    for seg in transcript["segments"]:
        seg_toks = seg.get("words", [])
        j0 = j
        j1 = j
        for w in seg_toks:
            word = w["word"].strip()
            t = "".join(ch for ch in word.lower() if ch.isalnum())
            if t:
                j1 += 1
        j = j1
        lesson_hits = [audio_to_lesson[k] for k in range(j0, j1) if k in audio_to_lesson]
        if not lesson_hits:
            continue
        matched_ratio = len(lesson_hits) / (j1 - j0)
        if matched_ratio < 0.3:
            continue
        # group contiguous lesson tokens into per-block spans; bridge tiny
        # same-block gaps (misheard words, mangled Latin) so the stroke is whole
        spans = []
        prev_i = None
        for i in lesson_hits:
            bi, _t, s, e = lesson_toks[i]
            if (
                prev_i is not None
                and spans
                and spans[-1][0] == bi
                and i - prev_i <= 6
                and s - spans[-1][2] <= 40
            ):
                spans[-1][2] = e
            else:
                spans.append([bi, s, e])
            prev_i = i
        trimmed = []
        for bi, s, e in spans:
            text = blocks[bi].cooked
            while s < e and text[s].isspace():
                s += 1
            while e > s and text[e - 1].isspace():
                e -= 1
            if e > s:
                trimmed.append([bi, s, e])
        if not trimmed:
            continue
        cues.append({
            "s": round(seg["start"], 2),
            "e": round(seg["end"], 2),
            "h": trimmed,
        })

    # Stitch only cues that continue the very same sentence split by a breath
    # (tiny gap, text advances by a few chars); sentence cues stay separate.
    stitched = []
    for c in cues:
        if stitched:
            p = stitched[-1]
            if (
                len(p["h"]) == len(c["h"]) == 1
                and p["h"][0][0] == c["h"][0][0]
                and 0.0 <= c["s"] - p["e"] < 0.6
                and 0 < c["h"][0][1] - p["h"][0][2] <= 24
            ):
                p["h"][0][2] = c["h"][0][2]
                p["e"] = c["e"]
                continue
        stitched.append(c)
    cues = stitched

    data = {
        "audio": f"{sitting}-overview.m4a",
        "duration": transcript["duration"],
        "version": 1,
        "cues": cues,
    }
    out.write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(f"cues={len(cues)} -> {out}")

    # Quality report: coverage of each block + sample cues
    covered = set()
    for c in cues:
        for bi, s, e in c["h"]:
            covered.add(bi)
    print("blocks covered:", len(covered), "/", len(blocks))
    for bi in range(len(blocks)):
        if bi not in covered:
            print(f"  UNCOVERED block {bi} ({blocks[bi].tag}): {blocks[bi].cooked[:90]!r}")
    for c in cues[:6] + cues[-4:]:
        first = c["h"][0]
        text = blocks[first[0]].cooked[first[1]:first[2]]
        print(f"  [{c['s']:7.2f}-{c['e']:7.2f}] b{first[0]}: {text[:70]!r}")


if __name__ == "__main__":
    main()
