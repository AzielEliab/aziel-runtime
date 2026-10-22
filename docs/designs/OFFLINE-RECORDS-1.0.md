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
~~AZNews and 4DMap Durable Object stores~~ (now covered, see the stores addendum below) and the D1 data are not in
`/v1/anchor/rows`. D1 is still not in the bundle. Publishing to Codeberg or archive.org needs the account holder's credentials.

## Follow-up (same day)
- `aziel-runtime-mcp --local` with `AZIEL_RUNTIME_HOME` set writes local ChainLock to the same persistent store, so MCP
  appends survive a restart. With it unset, the store stays in memory as before.
- FileKv batches writes during an import, so rehydrating the full live snapshot of about 4,800 rows takes under a second
  instead of about 5 minutes.

## Addendum (2026-10-19): the AZNews and 4DMap stores

Status: **BUILT, not deployed** (additive). Code: `src/offline-records.js` (stores section), the read-only `rows`
op in `src/aznews-do.js`, two routes in `src/index.js`, the CLI and `scripts/make-shelf-bundle.sh`.
Tests: `scripts/verify-offline-stores.mjs`.

Laws cited: the ones above, plus AZRT-STORE-CHECKPOINT-1.0 and AZRT-STORE-SHARD-1.0 (signed checkpoints every 1000
rows; sealed segments are read through the head, so no seq disappears), AZNEWS-WALK-1.0 (the same per-row check),
docs/2.0/PUBLIC-CONTRACT.md and COMPATIBILITY-POLICY.md (additive routes only; tools/list 36, Softwares 42, 2.0.0-rc1).

**Runtime, additive and read-only.** `GET /v1/aznews/rows?from=<seq>&limit=<1..500>` and `GET /v1/4dmap/rows` return
one page of raw ledger rows (`seq, kind, at, doc, lattice`) and `{total, from, to, count}`. They mint nothing, are
not a FragGate op or an MCP tool, and appear in OpenAPI. The rows are the same rows the store already sends to its
signed copies (AZ-OS tether). Viewers on offline view receipts are already stored only as `vh-<hash>`.

**Bundle, additive.** A bundle may carry `stores: { aznews, 4dmap }` inside the signed body:
`{ spec: "OFFLINE-RECORDS-1.0+stores", file, count, rows_sha256, tip {seq, primary, secondary}, checkpoints[] }`.
The rows themselves sit in sidecar files `<bundle>.stores/<name>.rows.jsonl` (one canonical JSON row per line;
`rows_sha256` is over the canonical lines: each non-blank line plus `\n`, so blank lines and CRLF do not change
it; a file written by the exporter hashes the same as its raw bytes), so ~10^5 rows never become one JSON string. A bundle with no stores has no
`stores` field and hashes exactly as before. A store the origin could not serve is named in `stores_skipped`.

**Offline check (fails closed).** File present and hash equal; row count equal; seq contiguous from 1; both lattice
links and every document hash (`verifyRowRun`, in runs of 2000 chained by tips); tip equal; every checkpoint's
signature, hash, n/to_seq order and chain link, and the signed tips equal the row at `to_seq`. Codes:
`OFFLINE-STORE-FILE-MISSING`, `-HASH-MISMATCH`, `-COUNT`, `-BROKEN`, `-TIP`, `-CHECKPOINT`, `-BAD-META`, `-UNKNOWN`,
`-UNTRUSTED-CHECKPOINT-KEY`.

**Import, forward-only.** Stores go to `$AZIEL_RUNTIME_HOME/records/stores/`. A local copy must be a prefix of
the bundle (same lattice tip at its seq, which pins the whole run from genesis). Otherwise the import refuses
`OFFLINE-FORK`, and it does so before any chain is written. `export` carries the imported stores on to the next shelf.

**Witness.** `aziel-records anchors` also checks the witness statement's `heads.stores` (`n`, `cp_hash`) against
the bundle's checkpoints (`match`, `MISMATCH`, `bundle-short`, `not-in-bundle`).

**Honest limits.**
- The checkpoint key comes from the bundle (the tether public key) unless it is pinned with
  `import --trust-store <pubkey>`. Rows are still checked row by row either way.
- Rows after the newest checkpoint are lattice-checked but not checkpoint-signed.
- A full AZNews pull is about 176k rows, which is about 350 pages of 500. The shelf build gets slower and
  bigger. `SKIP_STORES=1` leaves the stores out.
- Until this is deployed, the live origin has no `/rows` routes. A pull then still succeeds, with
  `stores_skipped` naming both stores.
- D1 data is still not exported.

### Follow-up (2026-10-19, AZBot review of #310)

- **Retracted pins in the raw rows.** The 4DMap rows include every retracted pin (live: 60, 54 geoparser junk + 6
  duplicates) and the retraction rows that hide them. Leaving them out would break the lattice, so they stay.
  `/v1/4dmap/pins` hides them unless `?include_retracted=1` (already public there); the raw export does not hide
  them. Readers apply the same rule: a `map_pin` row is hidden when a later `map_pin` row for the same `source_id`
  carries `retracted`. `GET /v1/4dmap/rows?marks=1` adds `marks[]` per row (`retraction` with `hides_seq`,
  `hidden` with `retracted_by_seq`), computed live and never part of the rows or their hashes. The offline check
  reports `retracted_pins {hidden, retraction_rows}` for the 4dmap store.
- **Caching and a light limit.** The page answer now carries `checkpoint_tip_seq`. A full page wholly at or below
  it never changes, so it is kept in the edge cache (Cache API) and served
  `public, max-age=86400, s-maxage=31536000, immutable` (`X-Azrt-Rows-Cache: hit|miss`). Other pages, `?marks=1`
  pages and errors stay `no-store` (`bypass`). Pages that reach the store object (cache misses) are limited to 60
  per minute per client per isolate (429 `STORE-ROWS-RATE-LIMIT`, `Retry-After`); cache hits are not limited.
  `aziel-records pull` waits out `Retry-After` (at most 12 times per page). The limit is per isolate, so it is
  light, not a global bound.
- **Cached bodies hold only what never changes (AZBot B311-1).** A cached page leaves out `total` and
  `checkpoint_tip_seq` (they move forward; a year-old copy would be stale) and says `cached: true`,
  `format: "rows-v1"`. Live (uncached) answers still carry both. The cache key includes the format version, so
  a future body shape never serves old bodies. `aziel-records pull` keeps paging while a page comes back full
  and stops only on a short or empty page; it never stops on `total`. HEAD has its own rate bucket and never
  spends a GET slot.
- **OpenAPI.** `from`, `limit` (and `marks` on 4dmap) are query parameters on both routes.
- Test: `scripts/verify-offline-stores.mjs` groups 10-14.

