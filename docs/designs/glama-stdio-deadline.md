# GLAMA-STDIO-DEADLINE-1.0 and the 2026-10-11 runtime health audit

Author: Aziel Eliab. Package stays 2.0.0-rc1. tools/list stays 36. Softwares stays 42.

## Problem

Glama's inspector runs `node cli/mcp-stdio.mjs` in a container and expects
`initialize` and `tools/list` quickly. When container egress is black-holed
(packets dropped, no RST / no DNS error), every bridge request waited the full
30 s fetch timeout per LIVE origin. Reproduced locally: with
`AZIEL_RUNTIME_URL=http://10.255.255.1`, `initialize` did not answer within 20 s.
A refused / no-network container already fell back in ~0.3 s (#239).

## Change

- Discovery methods (`initialize`, `tools/list`) and notifications get a short
  per-attempt deadline (`AZIEL_RUNTIME_MCP_DISCOVERY_TIMEOUT_MS`, default 4000 ms,
  never longer than the full timeout). Once that deadline is missed, failover
  stops for that message and the existing GLAMA-STDIO-DISCOVERY-1.0 fallback
  answers from the in-process catalog, tagged `remote:false`,
  `fraggate_receipt:false`.
- For 60 s after a missed deadline, discovery and notifications skip the remote
  hop (same honest local tag). `tools/call` is never affected: it keeps the
  full timeout and the remote FragGate door, and never falls back locally.
- Result: black-holed egress answers `initialize` + `tools/list` (36) in ~4.4 s.

FragGate stays the single door; no receipt is minted on the local path
(fail-closed, honest flags). No schema change.

## Other audit fixes (no behavior change)

- Duplicate object keys removed (earlier occurrence; the later value already won):
  `src/fed-mesh/bearers.js` (9), `ban-survival.js` (2), `cap7-shuffle.js` (2),
  `display.js` (4), `engines/azos/engine.js` (1). ENGINE_DIGESTS re-hashed.
- `package-lock.json` committed and `engines.node >=20` declared so the Glama
  and Docker installs are reproducible; Dockerfile uses `npm ci --omit=dev
  --ignore-scripts` when the lockfile is present.
- Background `waitUntil` work (mesh fanout, mesh cron, background job persist)
  now has a `.catch` that logs to stderr, so a failed store write cannot surface
  as an unhandled rejection.

Test: `scripts/verify-glama-deadline.mjs` (npm test + Glama stdio workflow).
