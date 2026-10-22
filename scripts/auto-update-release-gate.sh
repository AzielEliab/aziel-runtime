#!/usr/bin/env bash
# AUTO-UPDATE-1.0 release gate (no secret needed). Usage: auto-update-release-gate.sh <repo-dir> <tag> <main-ref> [out.tgz]
# Refuses unless the tag's commit T is on main's FIRST-PARENT line (a commit reachable only through a merged
# PR branch is refused). Prints "tag_sha=T" and "seq=<first-parent count at T>". With out.tgz, exports T
# deterministically (git archive, gzip -n) so the sign job can rebuild and compare sha256.
# Author: Aziel Eliab. SPDX-License-Identifier: Apache-2.0
set -euo pipefail
R="$1"; TAG="$2"; MAIN="$3"; OUT="${4:-}"
T=$(git -C "$R" rev-parse --verify -q "refs/tags/$TAG^{commit}") || { echo "AUTO-UPDATE-SIGN refused: tag $TAG missing" >&2; exit 1; }
git -C "$R" rev-list --first-parent "$MAIN" | grep -qx "$T" || { echo "AUTO-UPDATE-SIGN refused: $TAG ($T) is not on the first-parent line of $MAIN" >&2; exit 1; }
S=$(git -C "$R" rev-list --count --first-parent "$T")
if [ -n "$OUT" ]; then
  V="${TAG#v}"
  git -C "$R" -c core.autocrlf=false archive --format=tar --prefix="aziel-runtime-$V/" "$T" | gzip -n -9 > "$OUT"
fi
echo "tag_sha=$T"; echo "seq=$S"
