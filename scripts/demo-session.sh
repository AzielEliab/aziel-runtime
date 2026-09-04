#!/usr/bin/env bash
# Prove open → policy → exec → receipt → close with a hash-chained receipt
# owned by aziel-runtime (local CLI session; optional live Worker).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
export AZIEL_RUNTIME_HOME="${AZIEL_RUNTIME_HOME:-$ROOT/.aziel-runtime-demo}"
CLI=(node "$ROOT/cli/aziel-runtime.mjs")
rm -rf "$AZIEL_RUNTIME_HOME"

echo "# open"
"${CLI[@]}" --local session open
echo "# policy"
"${CLI[@]}" --local session policy --allow-slugs azclce --max-payload 8192
echo "# exec"
"${CLI[@]}" --local session exec azclce score \
  '{"r":"login button blue","d":"login form submits","p":"login button submits"}'
echo "# receipt"
"${CLI[@]}" --local session receipt
echo "# close"
"${CLI[@]}" --local session close
echo "# closed exec must fail"
set +e
"${CLI[@]}" --local session exec azclce score '{}'
status=$?
set -e
if [[ "$status" -eq 0 ]]; then
  echo "expected close to reject further exec" >&2
  exit 1
fi
echo "ok: local session lifecycle sealed; further exec rejected"
