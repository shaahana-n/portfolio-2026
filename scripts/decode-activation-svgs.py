#!/usr/bin/env python3
"""Decode base64 SVG exports from Figma use_figma into activation-journey folder."""
import base64
import sys
from pathlib import Path

OUT = Path(__file__).resolve().parent.parent / "images" / "coinbase" / "activation-journey"


def write(name: str, b64: str) -> None:
    data = base64.b64decode(b64.strip())
    path = OUT / name
    path.write_bytes(data)
    print(f"Wrote {path} ({len(data)} bytes)")


if __name__ == "__main__":
    if len(sys.argv) < 3:
        sys.exit("Usage: decode-activation-svgs.py <filename.svg> <base64>")
    write(sys.argv[1], sys.argv[2])
