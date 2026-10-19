#!/bin/sh
# OFFLINE-RECORDS-1.0: build a self-contained cold-shelf release (source at HEAD + production node_modules
# + a signed snapshot of the live public rows + the anchors witness log, when reachable) for Codeberg /
# archive.org / USB shelves. Installs and runs with no network. Author: Aziel Eliab.
# Stores addendum: the AZNews and 4DMap store rows land next to the snapshot as
# shelf/records.json.stores/{aznews,4dmap}.rows.jsonl (bound by the signed bundle). SKIP_STORES=1 leaves them out.
set -eu
SHA=$(git rev-parse HEAD); OUT=${1:-dist}; NAME=aziel-runtime-shelf-$(git rev-parse --short=8 HEAD)
rm -rf "$OUT/$NAME"; mkdir -p "$OUT/$NAME"
git archive HEAD | tar -x -C "$OUT/$NAME"
(cd "$OUT/$NAME" && npm ci --omit=dev --ignore-scripts --no-audit --no-fund >/dev/null)
mkdir -p "$OUT/$NAME/shelf"
echo "$SHA" > "$OUT/$NAME/shelf/GIT_SHA"
if [ "${SKIP_PULL:-0}" != "1" ]; then
  AZIEL_RUNTIME_HOME="$OUT/.shelf-holder" node cli/aziel-records.mjs pull "${ORIGIN:-https://aziel-runtime.vibelock.workers.dev}" "$OUT/$NAME/shelf/records.json" $( [ "${SKIP_STORES:-0}" = "1" ] && echo --no-stores ) >/dev/null || echo "records pull failed; bundle has no live snapshot" >&2
  curl -fsSL https://raw.githubusercontent.com/AzielEliab/aziel-anchors/main/anchors/log.jsonl -o "$OUT/$NAME/shelf/anchors-log.jsonl" || echo "anchors log not fetched" >&2
fi
tar -C "$OUT" -czf "$OUT/$NAME.tar.gz" "$NAME"
(cd "$OUT" && sha256sum "$NAME.tar.gz" > "$NAME.tar.gz.sha256")
echo "$OUT/$NAME.tar.gz"
