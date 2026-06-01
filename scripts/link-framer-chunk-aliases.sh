#!/usr/bin/env bash
# Framer bundles import ./chunk-*.mjs but publish hashed filenames; create aliases.
set -euo pipefail
JS="$(cd "$(dirname "$0")/../assets/js" && pwd)"
cd "$JS"
declare -A MAP=(
  [42U43NKG]=cb1827
  [JR5VT52U]=faa2f4
  [7VWJMTGS]=5bd161
  [Y5FTINFI]=808e17
)
for name in "${!MAP[@]}"; do
  src="${MAP[$name]}_chunk-${name}.mjs"
  dst="chunk-${name}.mjs"
  if [[ ! -f "$src" ]]; then
    echo "Missing source: $src" >&2
    exit 1
  fi
  cp -f "$src" "$dst"
  echo "Updated $dst"
done
