# AZP-NS-1.0 — network security and survivability

**Author:** Aziel Eliab only.  
**Runtime:** 2.0.0-rc1.  
**Not a Softwares card. No new MCP tool.** Softwares stay 42. `tools/list` stays 36.

This layer sits beside FragGate, ChainLock, and FED-MESH. It does not replace those doors. Cap-7 is not public ICANN and is not a public egress IP. Mirage is not AZVPN. `aznet_replaces_internet` is false. FED-MESH L1 LAN bind stays what PR #201 shipped: `--host` is a direct listen, `0.0.0.0` is not a peer URL, and that socket is not open-world awareness.

## Claim language

Records are tamper-evident: hash-linked and signed. Independent replication is fixture-tested. This is not a claim of immutability.

Payloads are privacy-preserving: encrypted end to end, with node identity separated from session identity. This is not anonymity.

Checkpoints are survivable and federated in the fixture model. This is not an unkillable network.

Relays are untrusted transport. They cannot decrypt payloads. That design rule is not a production zero-trust certification.

Use **tamper-evident** until independent replication is more than a fixture. Use **privacy-preserving** until a published anonymity test passes. Use **survivable** and **federated** until live multi-provider failure tests pass. Do not say anonymous. Do not say unkillable.

## What landed

| PDF §5 | Module | Gate |
|---|---|---|
| 5.1 encrypted keystore | `src/security/keystore.js` | A |
| 5.2 session identity | `src/security/session-identity.js` | A |
| canonical encoding | `src/security/canonical.js` | D |
| signatures | `src/security/signatures.js` | A–D |
| 5.3 EnvelopeV2 | `src/transport/envelope-v2.js` | B |
| 5.4 replay cache | `src/transport/replay-cache.js` | B |
| 5.9 dumb relay | `src/transport/relay.js` | C |
| version / bearer refusal | `src/transport/routing.js` | G |
| 5.5 checkpoints | `src/checkpoints/checkpoint.js` | D |
| Merkle | `src/checkpoints/merkle.js` | D |
| 5.6 verify | `src/checkpoints/verify.js` | D |
| 5.7 peer state | `src/replication/peer-state.js` | E |
| 5.8 recovery | `src/replication/recovery.js` | E |
| sync | `src/replication/sync.js` | E |

Scripts: `scripts/verify-keystore.mjs`, `scripts/verify-envelope-v2.mjs`, `scripts/verify-replay.mjs`, `scripts/verify-relay.mjs`, `scripts/verify-checkpoint.mjs`, `scripts/verify-checkpoint-quorum.mjs`, `scripts/verify-replication.mjs`, `scripts/verify-provider-loss.mjs`, `scripts/verify-disaster-recovery.mjs`, `scripts/verify-transport-adversarial.mjs`, `scripts/verify-key-compromise.mjs`, `scripts/verify-privacy-metadata.mjs`. One command runs that list: `node scripts/verify-azp-ns-repro.mjs`. The steps are in [`AZP-NS-REPRO-1.0.md`](AZP-NS-REPRO-1.0.md).

## Identity

AZKS-1 wraps long-term Ed25519 and X25519 seeds with PBKDF2-SHA-256 (210000 iterations unless a caller passes a count still at least 100000) and AES-GCM. The file stores ciphertext, the auth tag, and the public identity. Session seeds stay in process memory and are omitted from the sealed file. Uint8Array copies are zeroized. JavaScript strings and WebCrypto key objects are not fully wipeable.

`--passphrase` on `qnm-node/fed-instance.mjs` opts a data directory into that keystore. Without a passphrase, FED-MESH L0 still writes `identity.json` seed fields so existing nodes keep their handles. That plaintext file is not encrypted storage and is not an AZP-NS claim.

A session key is not the node key. The node key signs the session binding. The session key signs envelopes. An expired session is refused.

## Envelopes and relays

EnvelopeV2 encrypts the payload to the recipient session X25519 key. The outer fields are the metadata inventory in `ENVELOPE_METADATA`. A relay stores those bytes and forwards them. It has no decrypt function. Replacing the relay does not re-key the session. A bounded replay cache forgets the oldest entry when it is full. That bound is not infinite recall.

Tor, UDP, radio, and sandbox bearers return `AZP-BEARER-REFUSE` with `live: false`. They are not painted LIVE. Version negotiation accepts only `AZP-NS-1.0`. Any other version is `AZP-DOWNGRADE`.

## Ledger

ChainLock sequence and previous-hash behavior is unchanged. A checkpoint is a signed Merkle root over protocol records derived from stamps. Those records store stamp hashes and fact hashes. They do not copy the fact text. A checkpoint that conflicts with an accepted tip is `AZP-ROLLBACK` unless a threshold of the already accepted roster signs an `azp-fork` statement. The incoming checkpoint's own roster cannot authorize that fork. A continuation that changes the signer set or the threshold needs the same prior quorum. One signer cannot force accept. A new checkpoint whose roster still lists a revoked public key is refused. Already accepted checkpoints are not rewritten, and they keep verifying under the keys that signed them. The checkpoint hash includes the handoff fields (chain id, start and end sequence, start and end hash, Merkle root) plus `protocol_version`, `network_id`, and `signer_set_hash`.

Hash inputs are length-prefixed fields (`AZP-CANON-1` / `domainHash`) or the existing `canonicalize` function. They are not `JSON.stringify` of an unsorted object.

## Survivability limits

Fixture recovery deletes provider A from an in-memory set and rebuilds from the remaining signed checkpoints. That is not a destroyed Cloudflare account, not a VPS, and not a home node. `verify-provider-loss.mjs` and `verify-disaster-recovery.mjs` label those rows `FIXTURE` or `SKIP`. `live_multi_provider` stays false.

Operator-only work that this repository does not claim:

- Provider B: an ordinary VPS running the same protocol.
- Provider C: a separate cloud account.
- Node D: a self-hosted machine.
- Archive E: an offline copy the operator keeps.
- Plane B Framagit: still SLOT. The Framagit URL is null. Do not invent a deposit.
- No DNS change. No Cap-7 egress. No automatic self-propagation.

A relay network does not make traffic anonymous. Encryption of the payload is not anonymity. An observer can still see timing, IP and connection frequency, message size, relay relationships, and node uptime. Those classes are leakage. They are not necessary routing fields. `ENVELOPE_METADATA` lists the outer fields a relay must see to forward an envelope. `OBSERVER_LEAKAGE` lists the classes encryption does not remove. `encryption_addressed_is_anonymity` is false. `live_multi_provider` stays false.

## What's left

Operator checklist after the AZP-NS-1.0 layer. Items 1 and 2 need machines this repository does not have. The scripts keep those rows `SKIP` or `SLOT`. Items 3 through 7 are fixture gates. A fixture pass is not a live multi-provider claim.

| Item | Work | Status | Where |
|---|---|---|---|
| 1 | Independent nodes A–E | A is already LIVE production. B, C, and D are OPERATOR `SKIP`. E is `SLOT` | Map below. `verify-provider-loss.mjs` |
| 2 | Live provider destruction | `SKIP` | `verify-disaster-recovery.mjs` row `destroy-live-provider`. In-memory kill of provider A is `FIXTURE` and stays a fixture |
| 3 | Checkpoint quorum | `FIXTURE` | `scripts/verify-checkpoint-quorum.mjs` |
| 4 | Adversarial transport | `FIXTURE`, live remote destroy `SKIP` | `scripts/verify-transport-adversarial.mjs` |
| 5 | Metadata leakage | `FIXTURE` | `scripts/verify-privacy-metadata.mjs` |
| 6 | Key compromise and recovery | `FIXTURE` | `scripts/verify-key-compromise.mjs` |
| 7 | Independent reproduction | `FIXTURE` | [`AZP-NS-REPRO-1.0.md`](AZP-NS-REPRO-1.0.md), `scripts/verify-azp-ns-repro.mjs` |

### Nodes A–E

| Node | What it is | Status |
|---|---|---|
| A | Cloudflare Worker at `aziel-runtime.vibelock.workers.dev` | LIVE production already. These scripts do not deploy it and do not destroy it |
| B | Independent VPS | OPERATOR. `live-vps` is `SKIP` until that host exists |
| C | Separate provider | OPERATOR. `node-c-separate-provider` is `SKIP` |
| D | Self-hosted node | OPERATOR. `node-d-self-hosted` is `SKIP`. The fixture row `lose-one-node` removes an in-memory replica, not a home machine |
| E | Offline / cold copy | Codeberg and archive.org tip-pack hash PASS is an operator record: pack `b549362c0736ddb54ddc488812327c464e0da1167281f92fd1a4263eedf5df37`, lockset tip `c831429befc221bd41caeb0a6d1c5361602db5684abab7af6d39714084b6b245`. Plane B remains SLOT. The Framagit URL is null. This tree does not invent a Framagit, VPS, or Zenodo URL |

`archive-e-cold` is `SLOT` in `verify-provider-loss.mjs` because this script does not fetch those bytes. Hash PASS on Codeberg and archive.org does not paint Plane B LIVE. `plane-b-framagit` stays `SKIP`. `live_multi_provider` stays false.

Item 2 stays `SKIP` for a live destroy. The fixture that deletes provider A from an in-memory set is `kill-primary-provider` and is `FIXTURE`. That row is not a destroyed Cloudflare account.

Item 3 requires a threshold of independent signers. A reused signature, a wrong Merkle root, a roster below the threshold, and a conflicting tip are refused. A fork or a roster change counts signatures from the accepted roster. One signer cannot force accept.

Item 4 refuses replay, a forged signature, the wrong recipient, an expired session, a swapped session key, a swapped node key, a swapped encryption key, `AZP-DOWNGRADE`, and a relay that mutates outer bytes. The relay still cannot decrypt. A partition reconciles only from verifiable checkpoints. `destroy-live-provider` in that script is `SKIP`.

Item 5 writes a machine-readable report with `fields`, `observer`, `reveals`, `necessary`, and `claim_limits`. Routing fields are necessary. Timing, IP and connection frequency, message size, relay relationships, and node uptime are leakage. The anonymity claim stays false.

Item 6 refuses a keystore opened without the passphrase. Destroying or expiring a session key makes old envelopes fail. A new session still seals and opens. `rotateKey` leaves historical signatures verifiable under the retired public key. New tips use the new key. A revoked public key cannot sit on a new roster. Accepted history is not rewritten.

Item 7 is the reproduction document and `scripts/verify-azp-ns-repro.mjs`. The wrapper exits non-zero when a fixture gate fails. It does not mark `live-vps`, `plane-b-framagit`, `live-multi-provider`, or `destroy-live-provider` as pass.

Softwares stay 42. `tools/list` stays 36. No new Softwares card. No new MCP tool.

## Preserved

FragGate admit and refuse, `FG-GATE-REFUSE`, DecisionGATE, and receipt provenance stay on their existing paths. Ledger records from this layer do not carry secrets. FED-MESH NAT refusal stays `FED-MESH-NAT-REFUSE`. Open-world awareness stays the `0.0.0.0` listen in `qnm-node/awareness.mjs`, separate from the FED-MESH direct socket.
