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

Scripts: `scripts/verify-keystore.mjs`, `scripts/verify-envelope-v2.mjs`, `scripts/verify-replay.mjs`, `scripts/verify-relay.mjs`, `scripts/verify-checkpoint.mjs`, `scripts/verify-replication.mjs`, `scripts/verify-provider-loss.mjs`, `scripts/verify-disaster-recovery.mjs`, `scripts/verify-privacy-metadata.mjs`.

## Identity

AZKS-1 wraps long-term Ed25519 and X25519 seeds with PBKDF2-SHA-256 (210000 iterations unless a caller passes a count still at least 100000) and AES-GCM. The file stores ciphertext, the auth tag, and the public identity. Session seeds stay in process memory and are omitted from the sealed file. Uint8Array copies are zeroized. JavaScript strings and WebCrypto key objects are not fully wipeable.

`--passphrase` on `qnm-node/fed-instance.mjs` opts a data directory into that keystore. Without a passphrase, FED-MESH L0 still writes `identity.json` seed fields so existing nodes keep their handles. That plaintext file is not encrypted storage and is not an AZP-NS claim.

A session key is not the node key. The node key signs the session binding. The session key signs envelopes. An expired session is refused.

## Envelopes and relays

EnvelopeV2 encrypts the payload to the recipient session X25519 key. The outer fields are the metadata inventory in `ENVELOPE_METADATA`. A relay stores those bytes and forwards them. It has no decrypt function. Replacing the relay does not re-key the session. A bounded replay cache forgets the oldest entry when it is full. That bound is not infinite recall.

Tor, UDP, radio, and sandbox bearers return `AZP-BEARER-REFUSE` with `live: false`. They are not painted LIVE. Version negotiation accepts only `AZP-NS-1.0`. Any other version is `AZP-DOWNGRADE`.

## Ledger

ChainLock sequence and previous-hash behavior is unchanged. A checkpoint is a signed Merkle root over protocol records derived from stamps. Those records store stamp hashes and fact hashes. They do not copy the fact text. A checkpoint that conflicts with an accepted tip is `AZP-ROLLBACK` unless a threshold of the roster signs an `azp-fork` statement. The checkpoint hash includes the handoff fields (chain id, start and end sequence, start and end hash, Merkle root) plus `protocol_version`, `network_id`, and `signer_set_hash`.

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

A relay network does not make traffic anonymous. An observer can still see timing, size, recipient hint, and the path to the relay.

## Preserved

FragGate admit and refuse, `FG-GATE-REFUSE`, DecisionGATE, and receipt provenance stay on their existing paths. Ledger records from this layer do not carry secrets. FED-MESH NAT refusal stays `FED-MESH-NAT-REFUSE`. Open-world awareness stays the `0.0.0.0` listen in `qnm-node/awareness.mjs`, separate from the FED-MESH direct socket.
