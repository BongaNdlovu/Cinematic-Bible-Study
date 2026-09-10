#!/usr/bin/env python3
"""Inspect Meshy beast GLBs: meshes, bounds, textures, triangle counts."""
import json
import os
import struct
import sys


def inspect(path):
    size = os.path.getsize(path)
    with open(path, "rb") as f:
        magic, version, length = struct.unpack("<4sII", f.read(12))
        chunk_len, chunk_type = struct.unpack("<I4s", f.read(8))
        raw = f.read(chunk_len)
    j = json.loads(raw.decode("utf-8"))
    print("=" * 72)
    print(os.path.basename(path), f"{size / 1e6:.1f} MB", "json_chunk", chunk_len)
    print("asset", j.get("asset"))
    print("exts used", j.get("extensionsUsed"))
    print(
        "nodes", len(j.get("nodes") or []),
        "meshes", len(j.get("meshes") or []),
        "mats", len(j.get("materials") or []),
        "images", len(j.get("images") or []),
        "textures", len(j.get("textures") or []),
        "anims", len(j.get("animations") or []),
        "skins", len(j.get("skins") or []),
    )
    for i, n in enumerate(j.get("nodes") or []):
        print(
            f"  node[{i}]", n.get("name"),
            "mesh=", n.get("mesh"),
            "children=", n.get("children"),
            "rot=", n.get("rotation"),
            "scale=", n.get("scale"),
            "trans=", n.get("translation"),
        )
    accs = j.get("accessors") or []
    for i, m in enumerate(j.get("meshes") or []):
        prims = m.get("primitives") or []
        print(f"  mesh[{i}]", m.get("name"), "prims", len(prims))
        for pi, prim in enumerate(prims):
            attrs = list((prim.get("attributes") or {}).keys())
            print(
                f"    prim[{pi}] attrs={attrs} indices={prim.get('indices')}",
                f"mat={prim.get('material')} mode={prim.get('mode')}",
                f"exts={list((prim.get('extensions') or {}).keys())}",
            )
            posi = (prim.get("attributes") or {}).get("POSITION")
            if posi is not None and posi < len(accs):
                a = accs[posi]
                print("    POSITION count", a.get("count"), "min", a.get("min"), "max", a.get("max"))
            idx = prim.get("indices")
            if idx is not None and idx < len(accs):
                print("    indices count", accs[idx].get("count"), "tris", accs[idx].get("count") / 3)
    for i, mat in enumerate(j.get("materials") or []):
        pbr = mat.get("pbrMetallicRoughness") or {}
        print(f"  mat[{i}]", mat.get("name"), "alpha=", mat.get("alphaMode"), "doubleSided=", mat.get("doubleSided"))
        print("    baseColor", pbr.get("baseColorFactor"), "mr", pbr.get("metallicFactor"), pbr.get("roughnessFactor"))
        tex_map = {
            "baseColor": pbr.get("baseColorTexture"),
            "mr": pbr.get("metallicRoughnessTexture"),
            "normal": mat.get("normalTexture"),
            "emissive": mat.get("emissiveTexture"),
            "occ": mat.get("occlusionTexture"),
        }
        print("    tex keys", {k: (v.get("index") if isinstance(v, dict) else v) for k, v in tex_map.items()})
    buf_views = j.get("bufferViews") or []
    buffers = j.get("buffers") or []
    print("  buffers", [(b.get("byteLength"), b.get("uri")) for b in buffers])
    for i, im in enumerate(j.get("images") or []):
        bv = im.get("bufferView")
        nbytes = buf_views[bv].get("byteLength") if bv is not None and bv < len(buf_views) else None
        print(f"  image[{i}]", im.get("name"), im.get("mimeType"), "bytes", nbytes)


if __name__ == "__main__":
    for p in sys.argv[1:]:
        inspect(p)
