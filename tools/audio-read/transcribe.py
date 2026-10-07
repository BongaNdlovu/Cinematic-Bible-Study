"""Transcribe the generated audio overview with word-level timestamps."""
import json
import sys
import wave
from pathlib import Path

import numpy as np
from faster_whisper import WhisperModel

WAV16 = Path(__file__).parent / "audio16k.wav"
OUT = Path(__file__).parent / "transcript.json"

def load_audio():
    with wave.open(str(WAV16), "rb") as w:
        assert w.getnchannels() == 1 and w.getsampwidth() == 2
        data = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16)
    return (data.astype(np.float32) / 32768.0, w.getframerate())

def main():
    model_name = sys.argv[1] if len(sys.argv) > 1 else "small.en"
    audio, sr = load_audio()
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
    out = {"model": model_name, "duration": info.duration, "segments": []}
    for seg in segments:
        words = [
            {"start": round(w.start, 3), "end": round(w.end, 3), "word": w.word}
            for w in (seg.words or [])
        ]
        out["segments"].append({
            "start": round(seg.start, 3),
            "end": round(seg.end, 3),
            "text": seg.text.strip(),
            "words": words,
        })
        print(f"[{seg.start:7.2f} -> {seg.end:7.2f}] {seg.text.strip()}")
    OUT.write_text(json.dumps(out, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"wrote {OUT}")

if __name__ == "__main__":
    main()
