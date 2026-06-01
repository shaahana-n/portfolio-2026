#!/usr/bin/env bash
# Pull Framer-hosted assets referenced by the 2024 case study pages into /images.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="$ROOT/images"
mkdir -p "$OUT"

python3 <<'PY' > /tmp/framer-case-study-images.txt
import re, os
base = os.environ["ROOT"]
js_files = [
    "assets/js/49d094_2jbnKxOOpWqpblGYPElQgv-hcw_zWx2GIjEsnL9KdrA.RSVHOFXU.mjs",
    "assets/js/e397d3_a93pKoRhzl9f_M35jSsmaK_Avi4iRLf31iIvFIARPTA.NX5J2PJP.mjs",
    "assets/js/6934af_gqrB21kEabwUUVQ66BVOMSLl6YnodqQ_UMsX7WFr7Ms.GRCVK4HS.mjs",
]
imgs = set()
for jf in js_files:
    with open(os.path.join(base, jf)) as f:
        for m in re.finditer(r'/images/([A-Za-z0-9_\-]+\.(?:svg|jpg|png|webp))', f.read()):
            imgs.add(m.group(1))
for name in sorted(imgs):
    print(name)
PY

export ROOT
while IFS= read -r name; do
  dest="$OUT/$name"
  if [[ -f "$dest" && -s "$dest" ]]; then
    continue
  fi
  echo "Downloading $name"
  curl -fsSL "https://framerusercontent.com/images/$name" -o "$dest"
done < /tmp/framer-case-study-images.txt

echo "Synced $(ls -1 "$OUT" | wc -l | tr -d ' ') images to $OUT"
