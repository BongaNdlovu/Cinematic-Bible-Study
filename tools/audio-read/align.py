"""Align a sitting's read-along recording to that sitting's lesson text.

Reads sitting-NN-blocks.json (written by extract_blocks.mjs from the live
study page) and transcript-sitting-NN.json from this folder and writes
assets/study/audio/sitting-NN-readalong.json — a cue list the study app uses
to stroke a faint highlighter over exactly the text being spoken.
"""
import argparse
import json
import re
import unicodedata
from difflib import SequenceMatcher
from pathlib import Path

HERE = Path(__file__).parent
MAX_STRAY_RUN_TOKENS = 3
MIN_STRAY_GAP_TOKENS = 150

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


def main():
    parser = argparse.ArgumentParser(description="Align a sitting's read-along recording to its lesson text.")
    parser.add_argument("sitting", nargs="?", default="sitting-00", help="for example sitting-07")
    parser.add_argument("restarts", nargs="*", type=float, metavar="restart-seconds",
                        help="times where the recording goes back and reads a passage again; each starts a fresh pass over the lesson text")
    args = parser.parse_args()
    sitting = args.sitting
    out = HERE.parent.parent / "assets" / "study" / "audio" / f"{sitting}-readalong.json"
    dumped = json.loads((HERE / f"{sitting}-blocks.json").read_text(encoding="utf-8"))
    transcript = json.loads((HERE / f"transcript-{sitting}.json").read_text(encoding="utf-8"))

    blocks = [Block("block", text) for text in dumped["blocks"]]

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

    restarts = sorted(args.restarts)
    cuts = [0] + [next((k for k, a in enumerate(audio_toks) if a[1] >= r), len(audio_toks)) for r in restarts] + [len(audio_toks)]

    # audio token index -> lesson token index, from equal runs
    audio_to_lesson = {}
    for a0, a1 in zip(cuts, cuts[1:]):
        sm = SequenceMatcher(None, lesson_seq, audio_seq[a0:a1], autojunk=False)
        runs = [(i1, i2, j1, j2) for tag, i1, i2, j1, j2 in sm.get_opcodes() if tag == "equal"]
        for n, (i1, i2, j1, j2) in enumerate(runs):
            if i2 - i1 <= MAX_STRAY_RUN_TOKENS:
                before = i1 - runs[n - 1][1] if n > 0 else i1
                after = runs[n + 1][0] - i2 if n + 1 < len(runs) else len(lesson_seq) - i2
                if before > MIN_STRAY_GAP_TOKENS and after > MIN_STRAY_GAP_TOKENS:
                    continue
            for k in range(j2 - j1):
                audio_to_lesson[a0 + j1 + k] = i1 + k
    matched = len(audio_to_lesson)
    print(f"audio token match: {matched}/{len(audio_seq)} = {matched/len(audio_seq):.1%}")

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
            "w": [
                [round(audio_toks[k][1], 2), bi, s, e]
                for k in range(j0, j1) if k in audio_to_lesson
                for bi, _t, s, e in [lesson_toks[audio_to_lesson[k]]]
            ],
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
                p["w"].extend(c["w"])
                continue
        stitched.append(c)
    cues = stitched

    data = {
        "audio": f"{sitting}-readalong.mp3",
        "duration": transcript["duration"],
        "version": 2,
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
