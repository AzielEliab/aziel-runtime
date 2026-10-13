# OFFLINE-RECORDS-1.0: running and keeping records with the origin gone

Author: Aziel Eliab. Status: built for local use. Nothing is marked live.

Laws cited: COLD-MULTI-SHELF-1.0 and CROSS-NETWORK-SURVIVAL (survival means bytes match hashes), AZRT-ANCHOR-1.0
(the outside witness log is aziel-anchors), LEDGER-ROWS-1.0 (the public walk of `/v1/anchor/rows`), LEDGER-LATTICE-1.0
(the dual lattice), REMAIN-OFF-BY-DESIGN-2026-09-10 (nothing is enabled), and the FragGate single-door rule (this is a
local records CLI, not a new MCP tool; tools/list stays at 36).

## The gap found (2026-10-13 audit)
The cold shelves (Codeberg `aziel-lockset-tip`, archive.org `aziel-lockset-tip` and `_202609`) hold a 2026-09-14
lockset tip pack (catalog metadata), not the runtime code. With GitHub and Cloudflare gone, nothing on a shelf can be
installed. Local-mode ChainLock was in memory only, so records did not survive a restart.

## What this adds
- `cli/aziel-records.mjs` (bin `aziel-records`) with a persistent local store at `$AZIEL_RUNTIME_HOME/records`, using
  the same ChainLock rules: append-only, dual lattice, and the offline secondary hash is the primary hash plus the
  username.
- `export`: a bundle of every chain, signed with Ed25519 by the local holder key. The bundle says
  `signer_is_origin:false`.
- `import` (rehydrate) fails closed. The hash, signature and every row's recompute and prev link are checked first.
  A chain is written only when the local copy is empty or a strict prefix of the bundle (forward only).
  Otherwise it refuses with `OFFLINE-FORK`. `--trust <pubkey>` pins the signer.
- `pull <origin>`: snapshots the live public rows (while the origin exists) into a bundle.
- `anchors <log> <bundle>`: verifies the witness log (pinned key and retired keys, hash order) and checks each
  anchored head against the bundle, with no origin. RFC 3161 and Rekor are not checked here.
- `scripts/make-shelf-bundle.sh` builds a release that installs with no network: source, production node_modules,
  a records snapshot and the anchors log.

## Not covered
AZNews and 4DMap Durable Object stores and the D1 data are not in `/v1/anchor/rows`, so they are not in the bundle.
Publishing to Codeberg or archive.org needs the account holder's credentials.
