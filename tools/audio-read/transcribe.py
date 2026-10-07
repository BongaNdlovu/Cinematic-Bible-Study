"""Transcribe a lesson audio file with word-level timestamps.

Usage: python transcribe.py <input-audio> <output-json>
The input is decoded to 16 kHz mono via ffmpeg before inference.
"""
import json
import os
import subprocess
import sys
import tempfile
import wave
from pathlib import Path

import numpy as np
from faster_whisper import WhisperModel

def load_audio(src):
    fd, tmp_path = tempfile.mkstemp(suffix=".wav")
    os.close(fd)
    tmp = Path(tmp_path)
    subprocess.run(
        ["ffmpeg", "-hide_banner", "-y", "-i", src, "-ar", "16000", "-ac", "1",
         "-c:a", "pcm_s16le", str(tmp)],
        check=True, capture_output=True,
    )
    with wave.open(str(tmp), "rb") as w:
        assert w.getnchannels() == 1 and w.getsampwidth() == 2
        data = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16)
    rate = w.getframerate()
    try:
        tmp.unlink()
    except OSError:
        pass
    return data.astype(np.float32) / 32768.0, rate

def main():
    src = sys.argv[1]
    out = Path(sys.argv[2])
    model_name = sys.argv[3] if len(sys.argv) > 3 else "small.en"
    audio, sr = load_audio(src)
    model = WhisperModel(model_name, device="cpu", compute_type="int8")
    segments, info = model.transcribe(
        audio,
        language="en",
        word_timestamps=True,
        vad_filter=True,
        vad_parameters={"min_silence_duration_ms": 400},
        beam_size=5,
    )
    print(f"detected language: {info.language} p={info.language_probability:.2f} duration={info.duration:.1f}s")
    out_data = {"model": model_name, "duration": info.duration, "segments": []}
    for seg in segments:
        words = [
            {"start": round(w.start, 3), "end": round(w.end, 3), "word": w.word}
            for w in (seg.words or [])
        ]
        out_data["segments"].append({
            "start": round(seg.start, 3),
            "end": round(seg.end, 3),
            "text": seg.text.strip(),
            "words": words,
        })
        print(f"[{seg.start:7.2f} -> {seg.end:7.2f}] {seg.text.strip()}")
    out.write_text(json.dumps(out_data, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"wrote {out}")

if __name__ == "__main__":
    main()
