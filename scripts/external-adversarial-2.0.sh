#!/usr/bin/env bash
# External adversarial pack wrapper — reviewer runs this unchanged.
# Runs existing verify-adversarial + remain-OFF matrix.
# Self-test ≠ third-party lab. Author: Aziel Eliab only.
# Remain-OFF stays off. GET /v1/mesh never enables. No wrangler deploy.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
echo "aziel-runtime external-adversarial-2.0 (Aziel Eliab)"
echo "Self-test ≠ third-party lab. Run this pack unchanged."
exec node scripts/external-adversarial-2.0.mjs "$@"
