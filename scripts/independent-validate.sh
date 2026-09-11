#!/usr/bin/env bash
# Outsider one-command entrypoint: full npm test + local attestation.
# Not a third-party lab. Author: Aziel Eliab only.
# Remain-OFF stays off. GET /v1/mesh never enables. No wrangler deploy.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
echo "aziel-runtime independent-validate (Aziel Eliab)"
echo "cwd=$ROOT"
npm test
OUT="${1:-attestation.json}"
node scripts/write-attestation.mjs --out "$OUT"
echo "attestation written: $OUT"
echo "Not a court or lab audit. Reproducible self-check only."
