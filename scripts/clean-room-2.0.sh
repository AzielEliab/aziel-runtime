#!/usr/bin/env bash
# Aziel Runtime 2.0.0-rc1 clean-room wrapper.
# clone → install → npm test → docker|local → MCP initialize → tools/list
# → harmless call → receipt verify → shutdown.
# No undocumented secrets. No wrangler deploy. Not a third-party lab.
# Author: Aziel Eliab only. Remain-OFF stays off. GET /v1/mesh never enables.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
echo "aziel-runtime clean-room-2.0 (Aziel Eliab)"
echo "cwd=$ROOT"
exec node scripts/clean-room-2.0.mjs "$@"
