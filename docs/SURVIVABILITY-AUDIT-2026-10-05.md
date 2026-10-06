# Survivability audit — 2026-10-05

Author: Aziel Eliab. Read-only audit. It changes no flag, no shelf status, and no catalog row. Version stays 2.0.0-rc1. Softwares stay 42, tools/list 36, stub ops 363.

Runtime tip read: `2221b1e03e67f8a7fc997a08b03d2df40ec20187` (live as Version `d7bd347c-a4cd-463a-b65d-93b802ba6087`). Sources: live `GET /v1/shelves`, live `GET /v1/mesh`, live `GET /v1/tether`, `src/fed-mesh/bearers.js`, `tools/cold_shelf/*.md`, and the AZ-OS download tracker `GET /v1/tether`.

## Question

If the network and the hosts went away tomorrow, could someone still hold bytes that match the published tip (CROSS-NETWORK-SURVIVAL-1.0)? And which parts of that answer are live today versus slots?

## Planes as published today

| Plane | Status | What is real | What is not |
| --- | --- | --- | --- |
| A — CF/GitHub tunnel | live | 4 Cloudflare hubs + GitHub = 5 published surfaces, 2 family blast radii (`cloudflare`, `github`). One independent live plane (`cf-github`). | Five surfaces are not five shelves. Losing the Cloudflare account takes out every hub and this Worker together. |
| B — alternate forge/archive tip-pack | **SLOT** | Codeberg `https://codeberg.org/AzielEliab/aziel-lockset-tip` hash-verify PASS. archive.org `https://archive.org/details/aziel-lockset-tip` and `https://archive.org/details/aziel-lockset-tip_202609` hash-verify PASS (one blast radius, `archive-org`). All three URLs answered HTTP 200 on 2026-10-05. | Framagit `url` is **null** (`CNS-NO-FORGE-MIRROR`). Plane B stays SLOT until all three working targets pass (`CNS-PLANE-B-ALL-TARGETS`). Hash-verify PASS is not LIVE. Zenodo is not live (`CNS-ZENODO-NOT-LIVE`), `doi` is null, no CID. GitFlic is refused (`CNS-GITFLIC-EMAIL`). |
| C — USB airgap | SLOT | Checklist `tools/cold_shelf/USB-AIRGAP-ATTEST.md` exists. | No operator attest (`CNS-OPERATOR-ATTEST`). |

`live_multi_provider` stays **false** (live `GET /v1/mesh` → `d2d_carriers.live_multi_provider: false`; asserted in `scripts/verify-privacy-metadata.mjs` and `scripts/verify-replication.mjs`). `cold_shelf_live` stays false. The live network is not a shelf (`survival.live_network_is_shelf: false`).

No Framagit, GitLab, Zenodo, or mirror URL is added by this audit. The only URLs named above are the ones already published in `README.md` and `GET /v1/shelves`.

## What changed in this wave (2026-10-04 → 2026-10-05)

1. **Dual lattice (PR #227, AZRT-DUAL-LATTICE-1.0).** ChainLock stamps and session receipts now carry a primary chain and a secondary chain. The offline secondary binds `{primary: document_hash, username}` and refuses doubles. Survivability effect: a copy of the receipts can be checked against two independent hash chains, so a single rewritten row breaks both. It does not add a shelf. The FragGate ledger is not covered by the lattice yet.
2. **AZ-OS tether (PRs #228, #229; azos #22).** The runtime signs its lattice tips with an Ed25519 key and posts them to the AZ-OS download tracker, which verifies the pinned key, the signature, the recomputed hashes, and the link to its stored tip. On 2026-10-05 the AZ-OS stored session tip (`primary 8e0543d1…`, `secondary 5ff6557f…`, 28 rows, `verified: true`, runtime `2221b1e`) matched the runtime session chain tip exactly. Survivability effect: a second Worker holds a verified copy of the tip. **It is the same Cloudflare account and the same `cloudflare` blast radius**, so it is a witness, not an independent shelf. It does not move Plane A's independent-live count off 1, and it does not touch Plane B or C.
3. **Hosted AZNews/4DMap paths (azinterface #27, azos #23).** No survivability effect. They read the runtime through FragGate and hold no data.

## Gaps, in order of exposure

1. **One account carries every live surface but GitHub.** Hubs, the runtime, AZ-OS, AZInterface, and the tether witness all sit in one Cloudflare account. GitHub is the only other live radius.
2. **Plane B is one target short.** Codeberg and archive.org pass. Framagit has no project. Until a real project exists and its tip-pack hash-verifies, Plane B stays SLOT. The operator steps are in `tools/cold_shelf/FRAMAGIT-TIP-PACK-CHECKLIST.md`. Do not fill the slot with a guessed path.
3. **The cold tip-pack is older than this wave.** The published tip-pack (`aziel-tip-pack.tar`, sha256 `b549362c…` per `README.md`) was cut before 2026-10-05. Receipts written after it, including every dual-lattice row from this wave, live only on Plane A (plus the tip-only tether witness) until a new pack is cut and hash-verified on each shelf.
4. **The tether witness keeps only tips, not rows.** AZ-OS stores the latest verified tip per chain and a row count. It can prove a later copy is or is not the same chain. It cannot rebuild the chain on its own.
5. **No CI on azos or azinterface.** Those repos were merged on local test evidence. A regression there would not be caught before deploy.
6. **The FragGate ledger has no lattice.** Its rows are single-chain.

## Left as they are

- Plane B: SLOT. Plane C: SLOT. Framagit `url`: null. `doi`: null. Zenodo: not live.
- `live_multi_provider`: false. `cold_shelf_live`: false. Independent live count: 1.
- Internet, mail, kernel, boot, mesh-node, second device, pilot, and live backends: not live.
- The AZ-OS lattice refusal (REMAIN-OFF item 8) stays. The tether is runtime-sends, AZ-OS-verifies-and-stores. The runtime does not exec into AZ-OS.
- No tag for 2.0.0.
