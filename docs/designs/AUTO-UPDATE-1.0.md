# AUTO-UPDATE-1.0 — signed auto-update, online and across the mesh

Status: **design, live:false**. Default OFF (`AUTO_UPDATE=on` required). Nothing here is live until the code
does it, is deployed, and is probed. Author: Aziel Eliab. SPDX-License-Identifier: Apache-2.0

Requested by Aziel Eliab, Oct 22 2026 8:18 AM ET: "all software runtime interface etc should auto update when
hitting another node in the mesh and or touching internet" — confirmed for both online and mesh updates.

## Scope
Every Softwares app, aziel-runtime, AZInterface, AZ-OS and trades-runtime. The Softwares registry count (42)
does not change; auto-update is a capability of each product, not a new card. Locks hold: tools/list 36,
Softwares 42, FragGate stub ops 363, version 2.0.0-rc1.

## Triggers
1. **Online.** When the internet is reachable, fetch the release channel (GitHub latest release asset
   `update-manifest.json` + `.sig`, or the catalog mirror). Compare, verify, apply.
2. **Mesh peer.** On contact with another mesh node over Plane P carriers in order
   LAN → Wi-Fi → Bluetooth → RF → Photon, exchange `{product, version_seq, manifest_hash}`. If the peer is newer,
   pull the signed manifest + artifact from that peer and run the *same* verify as online. Offline meshes
   converge because any node holding a validly signed newer build can seed it. A carrier whose hardware is
   absent refuses `UPDATE-CARRIER-ABSENT`; there is no mock carrier on a live path.

A peer is never trusted. Trust comes only from the release signature. A peer can only offer bytes.

## Signed release manifest (AZ-UPDATE-MANIFEST-1.0)
```
{ spec, product, version, version_seq (int, strictly monotonic), git_sha (40 hex),
  channel ("stable" only is accepted; "rc" is shape-valid but refused), artifact: { name, size, sha256 }, issued_at, prev_manifest_hash }
```
`manifest_hash = sha256(canonicalize(manifest))`. Signature: Ed25519 over the canonical manifest text, by the
**pinned release public key** compiled into each product. JS (`src/auto-update/manifest.js`) and Python
(`tools/auto_update_verify.py`) must give the same hash and the same decision code (parity test).

## Apply rules (fail closed, in order)
1. `AUTO_UPDATE` flag off → `UPDATE-OFF`. User pause/opt-out set → `UPDATE-PAUSED`.
2. No pinned release key, or the pinned key used for a product it does not vouch for → `UPDATE-NO-KEY`.
   The pinned key vouches for `aziel-runtime` only; other builds refuse until they get their own key.
3. Bad shape → `UPDATE-MANIFEST-SHAPE`; wrong product → `UPDATE-PRODUCT`.
4. Signature fails → `UPDATE-SIG`. A tampered build therefore never applies and is never re-offered to peers.
5. `version_seq <= installed` or `< anti_rollback_floor` → `UPDATE-DOWNGRADE` (never downgrade; the floor only
   rises and is persisted).
6. Artifact size/sha256 mismatch → `UPDATE-HASH`.
7. Stage, health-check, swap. Health check fails → roll back to the previous build, receipt `rolled_back`.
   The anti-rollback floor rises only after a successful health check.

Only a build that passed steps 1–7 on this node may be served to peers.

## Channel: stable only (Aziel, 2026-10-22)
Devices follow **stable only**. Any manifest whose channel is not `stable` (e.g. `rc`) is refused with
`UPDATE-CHANNEL-REFUSED` and receipted, online and from mesh peers alike; a refused build is never
re-advertised. `/v1/version` reports `update_channel: "stable"` and is not env-switchable. The release
workflow signs only non-prerelease, non-draft releases, always as `stable`; prereleases are skipped.

Other hardening: node state `installed_seq`/`floor_seq` must be safe non-negative integers (else
`UPDATE-STATE`; no 32-bit wrap); `artifact.name` must match `^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$` with no
`..`; when a node records `last_manifest_hash`, `prev_manifest_hash` must equal it (`UPDATE-CHAIN`).
Pause is re-checked before stage and before commit (a late pause rolls back; floor unchanged).

## Key custody (Aziel, 2026-10-22)
- **Holder:** the GitHub Actions secret `AUTO_UPDATE_SIGNING_KEY` on `AzielEliab/aziel-runtime` only.
  Generated on the agent box with umask 077 in a temp dir, piped to `gh secret set` on stdin, then
  shredded; never printed, logged or committed. No copy exists outside the secret.
- **Pinned public key:** `_3mc9CfQWexUWcyqDadNoQLjb6fFFPRv_XfWirwuH9s` (raw Ed25519, base64url),
  fingerprint `sha256(raw) = 822b409723b81a0dc3fe3f132a2cb95b72b1ec2b2b16c055c526b627132a4ce8`.
- **Signing:** `.github/workflows/auto-update-release.yml` runs on `release: published`, fails closed
  if the secret is missing, refuses prereleases, self-verifies the signature against the pinned key
  before attaching `auto-update-manifest.json` + the artifact to the release.
- **Rotation:** ship a new pinned key inside an update signed by the **old** key; nodes accept the new
  key only via that verified update. Then replace the secret and retire the old key.
- **Compromise residual:** anyone who can run a workflow with repo write access (or who steals the
  secret) can sign a valid update. GitHub secrets are not hardware-bound. Mitigations: release-only
  trigger (no PR/push access to the secret), branch protection, never-downgrade floor, receipts. If the
  key leaks there is no revocation channel other than rotation by a signed update, and an attacker
  holding the old key could race it. A hardware/offline key would remove this residual.
- **Untested:** the success path with the real key is untested until the first stable release runs
  the workflow (no agent can sign with it).

## Receipts (additive)
Every attempt (applied, rolled_back, refused) writes a lattice receipt via the existing
AZRT-DUAL-LATTICE-1.0 rules (primary + secondary; offline secondary uses the hashed node handle). The tie-break
chain (#327) is not required and existing primary/secondary hashes are unchanged.
Receipt doc: `{ kind:"update", product, from_seq, to_seq, manifest_hash, source:"online"|"mesh:<carrier>", outcome, code }`.

## User control
Visible pause/opt-out: `pause()` / `resume()` on the updater, surfaced in each UI. Paused nodes still answer
version queries but never apply or seed.

## Public read-only field for monitoring (API)
`GET /v1/version` (new route; no existing /v1 shape changes):
```
{ ok, product, version, git_sha, manifest_hash, update_channel,
  auto_update: { enabled, paused, key_pinned, last_check, last_applied, last_code }, live:false }
```
On Workers the runtime cannot self-replace, so `auto_update.enabled` is false there and the field reports the
deployed build honestly; the updater applies on device/node installs (AZ-OS, qnm-node, desktop/CLI).

## Not in this design
No auto-merge, no deploy. No malware/worm behaviour: updates move only
signed builds, only between consenting nodes, and refuse otherwise.

## PR plan
1. this note · 2. manifest + verify lib (JS/Python parity) · 3. online updater + rollback + pause + receipts ·
4. mesh peer updater · 5. `/v1/version` + lockstep row (pin bump → AZInterface/AZ-OS re-vendor PRs) ·
6. per-repo adoption PRs (AZ-OS, AZInterface, trades-runtime, Softwares apps) vendoring the lib.
