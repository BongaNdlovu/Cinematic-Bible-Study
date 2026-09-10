#!/usr/bin/env python3
"""Inspect GLB for draco/webp/png and sizes."""
import struct, json, sys, os

def inspect(path):
    size = os.path.getsize(path)
    with open(path, 'rb') as f:
        magic, version, length = struct.unpack('<4sII', f.read(12))
        chunk_len, chunk_type = struct.unpack('<I4s', f.read(8))
        raw = f.read(chunk_len)
    j = json.loads(raw.decode('utf-8'))
    exts = j.get('extensionsUsed', []) or []
    mimes = {}
    for im in j.get('images', []) or []:
        mime = im.get('mimeType', '?')
        mimes[mime] = mimes.get(mime, 0) + 1
    has_draco = False
    for m in j.get('meshes', []) or []:
        for prim in m.get('primitives', []) or []:
            if 'KHR_draco_mesh_compression' in (prim.get('extensions') or {}):
                has_draco = True
    print(f"{os.path.basename(path)}\t{size/1e6:.2f}MB\tdraco={has_draco}\texts={exts}\timages={mimes}")

if __name__ == '__main__':
    for p in sys.argv[1:]:
        inspect(p)
