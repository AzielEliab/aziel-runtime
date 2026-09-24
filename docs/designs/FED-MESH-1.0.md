# FED-MESH-1.0: Local-First Edge Mesh

Author: **Aziel Eliab** only.

This is the shared protocol for a multi-user mesh. The runtime Worker is one relay. A qnm-node daemon can run the same relay. Nothing in the protocol requires this Worker.

FragGate stays the single door. This paper does not add an MCP tool. Relay ops are FragGate ops on slug `mesh` (`relay-register`, `relay-ref`, `relay-sync`, and the rest) and HTTP under `/v1/mesh/relay/`.

Test vectors live in [`fixtures/fed-mesh-vectors.json`](../../fixtures/fed-mesh-vectors.json). `scripts/verify-fed-mesh.mjs` recomputes them, including a name claim, a transfer, a refused fourth user name, a blocklist refusal, a refused `csam` label, a blocklist fold vector, a self-signed isolation, an appeal, a reserved-slot restore, an equivocation pair, and an airgap manifest.

## 1. Inner core and outer mesh

The inner core stays on the local node:

- signing keys and encryption keys
- raw data and full content-addressed objects
- heavy compute and tenant tasks

The outer mesh, by default, carries only:

- signed receipts
- state digests (the same idea as `engine_digest`: a hash, not the bytes)
- signed ref updates (how objects connect)

Raw data moves only when a node explicitly seals an end-to-end encrypted share. The relay routes that ciphertext. It must not need the plaintext to store, forward, or anchor the act.

Receipt sentences and ref updates are signed public mesh copies. They are not encrypted. Confidentiality of message bodies is the encrypted share. Routing metadata is not confidential.

## 2. Handle

Each node generates an Ed25519 key (WebCrypto in Workers and Node). The handle is `#` plus 11 uppercase Crockford base32 characters (`0123456789ABCDEFGHJKMNPQRSTVWXYZ`, no I, L, O, or U).

Source: the first 55 bits of SHA-256 of the raw 32-byte public key, MSB first, 5-bit groups. Fixed length. Birthday bound is about 2^27.5 identities for a 50% collision chance. At one million handles the chance is about 1.4e-5. At ten million it is about 1.4e-3.

Regex: `^#[0-9A-HJKMNP-TV-Z]{11}$`.

The node also generates an X25519 key bound to that handle and publishes `enc_public_key` on the signed registration. Private keys never leave the node. A body that contains `private_key`, `secret`, `seed`, `pkcs8`, or `enc_private_key` is refused `FED-MESH-PRIVATE-KEY`.

Vector seed `0102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f20` produces handle `#CPV0CWYPXP4` and public key `ebVWLo_mVPlAeLES6KmLp5AfhTrmlb7X4OORC60ElmQ`.

## 3. One sequence per handle

Every signed relay act except `pull`, `object`, and the `sync` wrapper consumes one monotonic sequence.

- Genesis `prev` is 64 zero hex.
- The link hash is SHA-256 of the canonical signed statement (signature excluded).
- The next act's `prev` is that link hash.

`pull` is signed and its `ts` must fall within five minutes. It does not consume a sequence. `object` is signed and rate-limited and does not consume a sequence, so caching a public object cannot fork the handle chain. `sync` is signed over `act_hashes` only. The wrapper does not consume a sequence. Each inner act does.

The relay remembers the last 32 sequences and prev links (`PREV_WINDOW`). A verifier with the full chain still catches an older fork the relay has forgotten. There is no compare-and-swap on the roster key. Two isolates can last-write-win. That limit is stated here.

Cross-user order is a per-relay monotonic `click_index` passed to TemporalLock. It is not a merged prev-hash across handles and not a worldwide total order.

## 4. Neighborhood grid

Cluster formation is local:

- discover peers on the LAN
- prefer those cluster peers for object fetch and direct envelopes
- keep working while the upstream relay is unreachable
- later sync rollups and ref updates upstream

This Worker does not discover a LAN and does not run that grid. It accepts the later sync. A sync is an ordered list of ref updates and rollups. Each act is verified and anchored in order when its `prev` matches the handle tip and, for a ref, `prev_ref` matches the stored ref. A fork stops that sync. Acts already anchored in the valid prefix stay anchored. The refusal reports `applied` and `stopped_at`. There is no rewrite that rolls the prefix back.

Direct transport on loopback or a configured LAN URL uses the same signed envelope as the relay. The relay is the fallback. This protocol does not punch holes through NAT. A peer with no public address uses a relay.

## 5. Git-like content model

Objects are content-addressed. The object hash is SHA-256 of the raw bytes, lowercase hex.

A ref update statement is:

| Field | Meaning |
| --- | --- |
| `v` | `FED-MESH-1.0` |
| `kind` | `ref` |
| `handle` | signer |
| `public_key` | raw Ed25519, base64url |
| `ref` | name matching `^[a-z0-9][a-z0-9_./-]{0,63}$` (example `heads/main`) |
| `object_hash` | 64 lowercase hex. The bytes are not in this act |
| `prev_ref` | previous ref statement hash for this name, or 64 zeros for the first |
| `seq` | handle sequence |
| `prev` | handle act-chain tip |
| `sig` | Ed25519 over the statement. Not hashed |

`prev` and `prev_ref` are different. `prev` links the handle's acts. `prev_ref` links one ref name.

The relay stores and serves this index (`GET /v1/mesh/relay/refs?handle=`). It anchors the act with ChainLock (`caller: fed-` + lowercase handle body, chain `mesh`) and TemporalLock. `object_hosted` is false. The relay does not need the object.

A fork is `FED-MESH-FORK` when `prev_ref` is not the stored statement hash for that name, or when `prev` / `seq` does not follow the handle tip.

### Ref update vector

Signed by `#CPV0CWYPXP4`. `prev` in this vector is a stand-in tip (`11` repeated) so the vector does not depend on a live register hash. A live relay still requires `prev` to match that handle's tip.

```json
{
  "v": "FED-MESH-1.0",
  "kind": "ref",
  "handle": "#CPV0CWYPXP4",
  "public_key": "ebVWLo_mVPlAeLES6KmLp5AfhTrmlb7X4OORC60ElmQ",
  "ref": "heads/main",
  "object_hash": "f56487a629550848508cbd6305d814f6008a1705ab4e215d926f6fda5e9c94dc",
  "prev_ref": "0000000000000000000000000000000000000000000000000000000000000000",
  "seq": 2,
  "prev": "1111111111111111111111111111111111111111111111111111111111111111",
  "sig": "EzHgvUyXbK8lMlwzC_e1DJ-pucqeKC2CQEBCvAhM_Igc2xgD8x32dta2EwmpG5Z2QZFHOsVEd3e-P1ZhlULSCg"
}
```

Statement hash: `06805b89889f62b379ae1dee9a7108f9ad37e23124c3ea111145d27438ceb708`.

The object bytes are the UTF-8 string `local-first`. Their hash is `f56487a629550848508cbd6305d814f6008a1705ab4e215d926f6fda5e9c94dc`.

### Object fetch

Peers fetch by hash. The daemon implements this. The request and response are:

```json
{ "v": "FED-MESH-1.0", "kind": "object-fetch", "hash": "f56487a629550848508cbd6305d814f6008a1705ab4e215d926f6fda5e9c94dc" }
```

```json
{
  "v": "FED-MESH-1.0",
  "kind": "object",
  "hash": "f56487a629550848508cbd6305d814f6008a1705ab4e215d926f6fda5e9c94dc",
  "body_b64": "bG9jYWwtZmlyc3Q"
}
```

`body_b64` is unpadded base64url of the raw bytes. A miss is `FED-MESH-NO-OBJECT`.

The Worker may cache a small public object. The put is signed (`kind: object`, `hash`, `body_b64`) and does not advance the handle chain. Caps: 4096 bytes each, 64 objects, 64KiB total, one key, no list scan. An oversized body is `FED-MESH-TOO-LARGE` (HTTP 413). Bytes that do not hash to `hash` are `FED-MESH-HASH-MISMATCH` and are not stored. GET `/v1/mesh/relay/object?hash=` is a read. It never enables radios.

### Sync

```json
{ "v": "FED-MESH-1.0", "kind": "sync", "handle": "#…", "public_key": "…", "act_hashes": ["…"], "acts": [], "sig": "…" }
```

The signature covers `{ v, kind, handle, public_key, act_hashes }`. It does not cover the bulky `acts`. Each hash must equal the statement hash of `acts[i]`. Inner kinds are `ref`, `name`, and `rollup`. The signer must be the act's handle. At most 16 acts. A hash mismatch is `FED-MESH-TAMPER`.

## 5.1 Name records

AZNet is the `.aziel` naming standard. AZBrowser resolves a name from the local ledger. This section is the record those repos share. This relay accepts, anchors, and serves the record the same way it accepts a ref update. It verifies the signature, the handle chain, `prev_record`, and the cap. It refuses a fork. It is the relay, not the naming daemon and not the browser.

A name record statement is:

| Field | Meaning |
| --- | --- |
| `v` | `FED-MESH-1.0` |
| `kind` | `name` |
| `handle` | signer |
| `public_key` | raw Ed25519, base64url |
| `name` | one label plus `.aziel`, stored lowercase. Pattern `^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.aziel$` |
| `owner` | `#` handle that holds the name after this act. `""` on release |
| `target` | `{ type, value }`, or `null` on release. `hash` is 64 lowercase hex. `ref` matches the ref-name pattern. `handle` is a `#` handle |
| `expires` | `null` means no expiry. A future unix time in milliseconds means the record stops being live at that time. The field is required. A past time is `FED-MESH-NAME-EXPIRED` and is not stored |
| `seq` | handle sequence |
| `prev` | handle act-chain tip |
| `prev_record` | previous name-record statement hash for this name, or 64 zeros for the first |
| `sig` | Ed25519 over the statement. Not hashed |

`prev` links the handle's acts. `prev_record` links one name. The relay checks the signature, `prev_record`, the handle chain, and the cap before `commitChain`. A refusal leaves the handle sequence where it was.

Storage is one JSON object keyed by name. POST `/v1/mesh/relay/name` is a mesh mutation and follows the radio rule for other relay writes. GET `/v1/mesh/relay/name?name=` serves one record. GET `?handle=` serves the names that handle owns, plus `friendly_held` and `friendly_cap`. A missing name is `FED-MESH-NO-NAME` (HTTP 404). The read never enables radios.

ChainLock caller is `fed-` plus the lowercase handle body, chain `mesh`, kind `name`. TemporalLock `click_index` stays per relay.

### Self-certifying name

`<handle>.aziel` is the handle body in lowercase Crockford, plus `.aziel`. The label matches `^[0-9a-hjkmnp-tv-z]{11}$`. `#CPV0CWYPXP4` owns `cpv0cwypxp4.aziel`. The signer and the owner are that handle. A transfer or a release of that name is `FED-MESH-HANDLE-MISMATCH`. The self-certifying name does not count toward the 3 user slots. A label of 11 Crockford characters is that handle's own name, not one of the 4 reserved hub-mirror slots in section 12.

### Friendly names

A friendly claim is stored as `pending`. It becomes `final` only after the proof-of-work, the age window, and the witness count in section 11. The first valid final claim wins. Until then another valid claim may sit beside it. A later signer against a live final owner receives `FED-MESH-NAME-TAKEN`. The race is per relay. AZBrowser resolves final records from the ledger it holds and shows pending records as pending.

A handle may hold 3 live user names. The fourth is `FED-MESH-NAME-CAP` (HTTP 429). An expired row and a released row no longer count. The self-certifying name still fits after the cap is full. The 4 reserved hub-mirror slots in section 12 are not user names and do not count.

### Transfer and release

The current owner signs a transfer. `owner` becomes the new `#` handle. `target` stays required. The new owner does not have to be registered on this relay. The next act on that name is signed by the new owner.

A release sets `owner` to `""` and `target` to `null`, signed by the current owner. The name is free for a new first claim. That claim sets `prev_record` to the release statement hash.

A new claim is signed by the owner it names. A live name is updated only by its owner.

### Fork

`prev_record` must equal the stored statement hash, or 64 zeros when this relay has no row for that name. Any other value is `FED-MESH-FORK`. Handle `prev` and `seq` still follow section 3. A `name` act may travel inside `sync` with refs and rollups. A fork stops that sync. The valid prefix stays anchored.

### `.az`

A name that ends in `.az` and does not end in `.aziel` is `FED-MESH-DNS`. `.az` is normal DNS. The exception is this allowlist. The names are cites. They are not FED-MESH records, and this relay does not resolve them.

Cap-7 factory names: `azgrid.az`, `azbooth.az`, `azcloak.az`, `azvault.az`, `azshift.az`, `azflag.az`, `azstandby.az`.

AZ.* hub names: `AZ.AzielEliab.AZ`, `AZ.Godlock.AZ`, `AZ.AzielCorpusLibrary.AZ`, `AZ.HeDidntJump.AZ`.

Standard internet does not reach Cap-7. AZ.* resolves through hub HTTPS. `icann_tld_az` is false.

### Name claim vector

Signed by `#CPV0CWYPXP4` after that handle's registration. `prev` is the registration statement hash. `prev_record` is 64 zeros. `expires` is null. Target is the `local-first` object hash.

```json
{
  "v": "FED-MESH-1.0",
  "kind": "name",
  "handle": "#CPV0CWYPXP4",
  "public_key": "ebVWLo_mVPlAeLES6KmLp5AfhTrmlb7X4OORC60ElmQ",
  "name": "library.aziel",
  "owner": "#CPV0CWYPXP4",
  "target": {
    "type": "hash",
    "value": "f56487a629550848508cbd6305d814f6008a1705ab4e215d926f6fda5e9c94dc"
  },
  "expires": null,
  "seq": 2,
  "prev": "11a622e89de2b80c48ffee9a6f9efe13e857e6643e539617c9dd481c0b36904d",
  "prev_record": "0000000000000000000000000000000000000000000000000000000000000000",
  "sig": "2PLK1U2papMuoD6Ux_SPuWwT_r_nxtKmcLmzAa3aCSLFMvGhp5T2-p2lNavR47MtnoxMmFPITL8yPS1LKu4gBA"
}
```

Statement hash: `6d38408d305afb2ae562d3c022c3421fc8819c81d61108d3a8b91e2b8dc7ca7c`.

### Transfer vector

The same owner signs `library.aziel` over to `#4S11EZW09MD`. `prev` and `prev_record` are the claim statement hash. Sequence is 3.

```json
{
  "v": "FED-MESH-1.0",
  "kind": "name",
  "handle": "#CPV0CWYPXP4",
  "public_key": "ebVWLo_mVPlAeLES6KmLp5AfhTrmlb7X4OORC60ElmQ",
  "name": "library.aziel",
  "owner": "#4S11EZW09MD",
  "target": {
    "type": "handle",
    "value": "#4S11EZW09MD"
  },
  "expires": null,
  "seq": 3,
  "prev": "6d38408d305afb2ae562d3c022c3421fc8819c81d61108d3a8b91e2b8dc7ca7c",
  "prev_record": "6d38408d305afb2ae562d3c022c3421fc8819c81d61108d3a8b91e2b8dc7ca7c",
  "sig": "Tg6C3jVdCgRXl-yjkFv8WYiAYBLqrawPvy-0YMxvdDBNJOLe__YtJk6VwXPtrQyoImmHoEKQUmdeepdK5P6MAQ"
}
```

### Refused over-cap vector

On a fresh relay the same handle registers, then claims `name-1.aziel` through `name-3.aziel`. This fourth user claim is signed. The relay answers `FED-MESH-NAME-CAP` and does not store it. The handle sequence stays at the tip after `name-3`.

```json
{
  "v": "FED-MESH-1.0",
  "kind": "name",
  "handle": "#CPV0CWYPXP4",
  "public_key": "ebVWLo_mVPlAeLES6KmLp5AfhTrmlb7X4OORC60ElmQ",
  "name": "name-4.aziel",
  "owner": "#CPV0CWYPXP4",
  "target": {
    "type": "hash",
    "value": "f56487a629550848508cbd6305d814f6008a1705ab4e215d926f6fda5e9c94dc"
  },
  "expires": null,
  "seq": 5,
  "prev": "4ab885ab54ae5c5a26fbb40d9926ca79c35f6378ae997d73901655353bb46576",
  "prev_record": "0000000000000000000000000000000000000000000000000000000000000000",
  "sig": "_QlyljRmoQCqqovzy5EcvlNeoVnVTCAQGjBAZA98ztfzepMgZ2zrfyocAvcJWhIuLZZKbBaF-Tg6jv85dT87BQ",
  "pow": { "nonce": "88", "bits": 8, "digest": "002dbf061dd18abda5b2b6dfd0a08a935c2e2ad4a5e40aaff2dafa51539bc6fa" }
}
```

User slot cap: 3. Code: `FED-MESH-NAME-CAP`.

## 6. Relay protocol

Any qnm-node may implement this relay. The Worker is not required.

HTTP:

| Method | Path | Role |
| --- | --- | --- |
| GET | `/v1/mesh/relay` | Cite and health (`health: up`). Never enables |
| POST | `/v1/mesh/relay/register` | Signed registration |
| POST | `/v1/mesh/relay/heartbeat` | Signed presence |
| POST | `/v1/mesh/relay/leave` | Signed leave |
| POST | `/v1/mesh/relay/post` | Signed ciphertext |
| POST | `/v1/mesh/relay/pull` | Signed inbox read |
| POST | `/v1/mesh/relay/deliver` | Signed delivery receipt |
| POST | `/v1/mesh/relay/forward` | One hop, store if the recipient is registered here, do not forward again |
| POST | `/v1/mesh/relay/peers` | Signed peer list |
| POST | `/v1/mesh/relay/bootstrap` | Signed bootstrap list |
| GET | `/v1/mesh/relay/bootstrap` | Lists this relay has accepted |
| POST | `/v1/mesh/relay/rollup` | Signed rollup |
| POST | `/v1/mesh/relay/remote-task` | Signed task/result hashes. Not execution |
| POST | `/v1/mesh/relay/ref` | Signed ref update |
| POST | `/v1/mesh/relay/name` | Signed `.aziel` name record. Friendly claims stay pending |
| GET | `/v1/mesh/relay/name?name=` | One name record. `?handle=` lists that owner's names. Pending and final are distinct |
| POST | `/v1/mesh/relay/witness` | Co-sign a pending name. This Worker does not mint the signature |
| GET | `/v1/mesh/relay/witness?subject_hash=` | Witness list for one statement |
| POST | `/v1/mesh/relay/equivocation` | Two conflicting signed name or ref acts at one sequence |
| GET | `/v1/mesh/relay/equivocation?handle=` | The stored proof for one handle |
| POST | `/v1/mesh/relay/vouch` | Optional co-sign of another handle. Local trust only |
| POST | `/v1/mesh/relay/advisory` | Signed advisory. Subscribers apply it. This relay does not |
| POST | `/v1/mesh/relay/quarantine` | Signed local peer cut. `network_cutoff` is false |
| POST | `/v1/mesh/relay/island` | Signed island off or on. Suite radios stay as they are |
| POST | `/v1/mesh/relay/airgap` | Verify a signed sha256 manifest. Bytes are not stored |
| POST | `/v1/mesh/relay/restore` | Reserved hub-mirror slot. Object must already be hash-verified here |
| GET | `/v1/mesh/relay/slot?handle=` | The 4 reserved slots for one handle. Never enables |
| POST | `/v1/mesh/relay/isolation` | Self-signed isolation. Reason and evidence hash. No bytes. `POST /v1/fedmesh/isolation` is the same route |
| GET | `/v1/mesh/relay/isolation?handle=` | Stored isolation record. Never enables. `GET /v1/fedmesh/isolation?handle=` is the same read |
| POST | `/v1/mesh/relay/appeal` | Signed appeal. Requests a re-check. Does not clear isolation |
| POST | `/v1/mesh/relay/sync` | Late sync |
| POST | `/v1/mesh/relay/object` | Small public object cache |
| GET | `/v1/mesh/relay/object?hash=` | Cache read |
| GET | `/v1/mesh/relay/refs?handle=` | Ref index |
| GET | `/v1/mesh/relay/directory?handle=` | Registration row |

Relay URLs are `https`, or `http` only for `127.0.0.1`, `localhost`, or `::1`. No userinfo. The Worker does not forward to other private addresses.

One hop. The forward target must be on an accepted peer list or on the recipient's signed registration. No DHT. No transitive gossip. If there is no mailbox and no allowed target, `FED-MESH-NO-ROUTE`. A duplicate `msg_hash` in the inbox is idempotent.

A node on relay A reaches a node on relay B when both are registered on a relay they share, or when the recipient's registration names a relay this one is allowed to forward to. Otherwise the send is `FED-MESH-NO-ROUTE`.

### What the relay sees

On a message: `v`, `kind`, `handle`, `public_key`, `to`, `seq`, `prev`, `nonce`, `eph_public_key`, `ciphertext`, `via`, `sig`. Not the plaintext.

The body cipher is X25519 (ephemeral plus the recipient's static key), HKDF-SHA-256 with salt `FED-MESH-1.0` and info `FED-MESH-1.0|from|to|seq`, then AES-GCM with a 12-byte nonce. The relay never opens it.

TLS protects the hop when the relay URL is `https`. Loopback tests may use `http`. That hop protection is not the body cipher.

### Store and forward

Ciphertext for an offline handle is held for 24 hours, at most 32 messages and 64KiB per handle. Delivery is a signed `deliver` act. That act is the delivery receipt and is anchored with ChainLock and TemporalLock. Presence TTL is 5 minutes. Mail can outlive presence.

### Peers, bootstrap, failover

Peer and bootstrap lists are signed by a handle. At most 16 relays and 4096 bytes. A list whose text matches `poison` is `FED-MESH-POISON` and is not stored. The Worker has no private key, so it does not invent a signed bootstrap list. An empty list is honest. GET returns `only_source: false` and `needs_starting_address: true`.

Health is GET `/v1/mesh/relay`. Failover is the node trying its next configured relay. A new node needs at least one address it already has (config, CLI, or a signed list from any relay). This Worker can publish lists it has accepted. It is not the only bootstrap source.

### Quotas

Per-handle signed acts: 30 per minute (`FED-MESH-RATE`, HTTP 429). The window is per isolate, not global. Ordinary HTML GETs are not in this bucket. Ciphertext: 4096 bytes. Rollup changes: 16384 bytes, at most 32 rows. Envelope: 20000 bytes. Inbox and object caps are above. User `.aziel` names: 3 per handle (`FED-MESH-NAME-CAP`, HTTP 429). Reserved hub-mirror slots: 4, not user-nameable. These are the same budget idea as `mesh_mutate` on the HTTP edge.

### Rollups, roles, multisig, remote tasks

A rollup is a batch of `{ handle, op, payload_hash }` rows, co-signers, and signatures. `batch_id` is SHA-256 of canonical `{ changes, co_signers, multisig, submitter }`. The relay verifies every signature and handle, then anchors one upstream receipt. A bad signature, a mismatched handle, or a replayed `batch_id` is refused. `executed` is false. No tenant code runs here. Fields named `code`, `wasm`, `script`, `contract`, `smart_contract`, `bytecode`, or `source` are `FED-MESH-NO-EXEC`.

Roles are node-local. Admin is the node owner. Developer may post, pull, roll up, publish refs, claim `.aziel` names, and submit remote-task receipts for their own handle. Guest may pull. This runtime does not store a role registry. It checks that the signing key is the claimed handle. One handle cannot act as another.

Multisig is off when `multisig` is null. When set, it is integer m-of-n. At least m distinct signatures must come from the declared signer list, and every listed co-signer must sign. The submitter is a co-signer. Duplicate handles count once.

A remote-task receipt is `{ requester, requester_public_key, executor, executor_public_key, task_hash, result_hash, seq, prev }` plus both signatures. The runtime anchors it on the requester's chain and does not run the task. Including the task body is refused.

## 7. Receipts

`event.spec` stays `ACT-RECEIPT-1.0`. The four-field hash is unchanged. FED-MESH adds `identity_anchor` outside that hash (`ACT-RECEIPT-1.1`). A 1.0 receipt with no anchor stays valid.

Anchor statement: `{ v, handle, public_key, seq, prev, receipt_hash }`. `receipt_hash` is the four-field hash. The chain link used by `verifyIdentityChain` is the anchor statement hash, not the four-field hash.

Vector receipt hash: `49ef88c622177cd9662ea63d147589c9cea6c32adede83b7e7d127f853022dba`.

Anchor signature on that vector: `0OXT9sIHOYV-ZHvjP-qhLSY-GlVuwlja9UOXhCWV4c2LwEDmU3D5w597xIWdx4LQJgliyU3MJZBaScq4dfU4AQ`.

Verification catches duplicate sequence, two receipts claiming the same prev, a handle whose key did not sign, a sequence gap, and a mutated body. No user geo. The handle is pseudonymous.

## 8. Counters

`verified_handles` counts distinct handles whose key matches and whose `last_seen` is inside 5 minutes. One handle is one node. Three local instances with three keys are three nodes. The count is handles, not people.

`nodes` stays human mesh users plus cited human uses. `live_nodes` stays human mesh users plus site viewers. `software_nodes` stays the `{slug}-worker` roster. Downloads stay `instance_nodes`. Handles are not added into those pills. Rewriting the pills would make old and new `live_nodes_tip` seals disagree.

## 9. Several instances on one computer

Each instance has its own port, key, handle, and data directory. They speak to relays the same way any other node does. There is no hidden local shortcut. `qnm-node/fed-instance.mjs` in this repo is the protocol client used by the end-to-end test. Sandboxed tenant tasks, quotas, and LAN discovery belong to the qnm-node daemon.

## 10. Limits, stated plainly

- No DHT and no transitive gossip. Forwarding is one hop.
- This Worker is not required and is not the only bootstrap. A new node still needs a starting address.
- The relay never requires plaintext. It also cannot hide routing metadata.
- Receipts, refs, name records, and digests are signed public copies. They are not end-to-end encrypted.
- A friendly `.aziel` name is pending until proof-of-work, 72 hours, and 2 witness handles. The first valid final claim wins. A handle holds 3 user names and 4 reserved hub-mirror slots. `<handle>.aziel` is self-certifying and final immediately. `.az` stays normal DNS except the Cap-7 and AZ.* allowlist in section 5.1. MirageGrid factory names are a separate layer (section 12).
- Proof-of-work is an 8-bit flood filter. It is not a Sybil solution and not a blockchain. There is no token and no stake.
- This relay does not execute peer code, does not rank handles, and does not cut one peer off every other peer. Scanners are absent here. Two-hop routing and Tor are node adapters. This relay does not claim zero-knowledge or protection from a state-level adversary.
- No tenant execution and no private keys on the relay.
- No worldwide total order. TemporalLock click is per relay.
- Rate limits are per isolate. The roster key has no compare-and-swap.
- The replay window is 32 acts. Older forks need a verifier that holds the whole chain.
- Neighborhood discovery is not run by this Worker.
- The public object cache is optional, small, and hash-checked. Peers are the object store.
- GET never enables radios. `mesh_disable` still refuses. Suite-presence stays the QNM rollup.
- Author identity remains Aziel Eliab only. A handle is not that identity.

## 11. Mesh security

Author: **Aziel Eliab** only. Lamb Lens order stays Service, then Clarity, then Peace.

Every peer is untrusted. A node never executes code received from a peer. Received bytes land in quarantine on the node. Promotion is a local decision after the signature matches, the hash matches, and, where a scanner is installed, the scanner returns a verdict. This Worker has no ClamAV and no YARA rules. Object puts report `scanner: "absent"`, `executable: false`, and `promotion: "cache-only"`. A hash mismatch is `FED-MESH-HASH-MISMATCH` with `gate: "FG-GATE-REFUSE"` and is not stored. The cache serves only entries whose bytes matched the hash. Scanners catch known malware. The capability sandbox on the node is the main defense.

A node's failure or compromise stays on that handle's chain and names. One tenant's key does not open another tenant's ciphertext. Tests check that refusal.

### Proof of work

A friendly `.aziel` act carries `pow` outside the signature:

```json
{ "nonce": "<1 to 64 lowercase hex>", "bits": 8, "digest": "<64 hex>" }
```

`digest` is SHA-256 of the UTF-8 bytes of the statement hash, a newline, the signature, a newline, and the nonce. `bits` is at least 8. The digest must have at least that many leading zero bits. A missing or short stamp is `FED-MESH-POW` and does not advance the handle sequence. Self-certifying names skip the stamp. Eight bits is a flood filter. The Sybil control is the pending window below. There is no blockchain consensus and no token stake.

The pinned `library.aziel` claim keeps its signature and adds:

```json
{ "nonce": "7e", "bits": 8, "digest": "0091860bcaeed0c2dbc3520fb74656e8d40045d1c31954108fd7d30e7d9a1a20" }
```

Statement hash: `6d38408d305afb2ae562d3c022c3421fc8819c81d61108d3a8b91e2b8dc7ca7c`.

### Pending and final

`NAME_PENDING_MS` is 72 hours (`259200000`). `WITNESS_K` is 2.

A friendly claim is `pending` until both are true: the relay's `accepted_at` is at least 72 hours ago, and at least 2 handles other than the claimant have co-signed that statement hash. The earliest such claim becomes `final`. The first valid final claim wins. A later signer is `FED-MESH-NAME-TAKEN`. Competing pending claims with `prev_record` of 64 zeros are allowed until one is final. The cap of 3 counts pending and final user names. Reserved hub-mirror slots do not count.

A witness statement is `{ v, kind: "witness", handle, public_key, subject_hash, subject_kind: "name", seq, prev, sig }`. The witness handle is not the claimant. This Worker verifies and stores the co-sign. It has no private key, so it does not mint one. A self-certifying name is final when the key matches the label. It takes no witnesses and does not use the cap.

An owner update of a final name, including transfer and release, stays on that final chain. A transfer of a still-pending name replaces that pending statement. Witnesses do not carry to the new hash.

### Equivocation

Two signed `name` or `ref` acts from one handle at one sequence, with different statement hashes, are an equivocation proof:

```json
{ "v": "FED-MESH-1.0", "kind": "equivocation", "left": {}, "right": {} }
```

Pinned pair, both sequence 4, both `prev` of 64 `2` characters. Left object hash is the `local-first` hash. Right object hash is `ab` repeated 32 times.

Left signature: `OnkMvld5JofooG8askpJCNHioSqIbvLJmhsS8CcH1oT0z5YCB1DKwTpPVCDBfqX-qJeFM3wynii0vWTqwvhVAg`. Statement hash: `53cd930e757a6fe087bf8ee1b6cfe2415fae2fd5f6c5d87c26bae805a310bad6`.

Right signature: `hL_VghAjdp0jR2GizzNxXQwH8NCjRpk9hnNJIMeKWAnIDb8UJdt9wFEzrjpRMmmSSV07lt3vyQjQswdydfB-CQ`. Statement hash: `c83e7f185266b196802c23ece6bc3a138c24016e86d52a4c26cc948460c64d93`.

The relay stores the proof and refuses later acts from that handle with `FED-MESH-EQUIVOCATION`. `network_cutoff` is false. Other handles keep working. Already anchored history is not rewritten. Another relay learns the same fact by receiving the same proof.

### Vouch and advisory

A vouch is `{ v, kind: "vouch", handle, public_key, subject, subject_public_key, seq, prev, sig }`. It feeds local trust only. An advisory is `{ v, kind: "advisory", handle, public_key, subject, note, seq, prev, sig }` with `note` of 1 to 160 characters. `applied` is false on this relay. Subscribers decide. There is no public ranking and no use-based number. Public responses do not carry a score field.

Local trust on a node may show handle chain age, heartbeats other handles witnessed, hash-match history, vouches, and an equivocation flag. Those are separate facts.

### Quarantine and island

A quarantine receipt is `{ v, kind: "quarantine", handle, public_key, peer, decision: "cut"|"clear", seq, prev, sig }`. It is stored under the signer. It does not stop the peer from reaching anyone else. `network_cutoff` is false. No single authority cuts a handle off the mesh.

An island receipt is `{ v, kind: "island", handle, public_key, mode: "off"|"on", seq, prev, sig }`. `off` tells this relay to refuse later acts from that handle until `on`. The node keeps its local runtime. `radios_changed` is false: one handle does not disable suite presence. After `on`, a later sync with a valid `prev` is accepted. A fork is still refused.

### Rollback and rate

A ref update or name record with `seq` less than or equal to the handle tip is `FED-MESH-ROLLBACK`. The same sequence submitted again on other acts remains `FED-MESH-REPLAY`. A sequence gap remains `FED-MESH-GAP`.

Each signing handle has its own 30-per-minute window (`PEER_ROUTE_PER_MIN`, the same window as other signed relay acts). One handle filling the window leaves the next handle's window intact. The window is per isolate.

### Transport

Mesh message bodies stay X25519, HKDF-SHA-256, AES-GCM, bound to the handle keys. That cipher is mandatory for message bodies. The relay still sees routing metadata: handles, sequence, sizes, and the next hop.

Two-hop routing is opt-in on the node. The entry hop forwards ciphertext and does not need the destination payload. The exit hop does not need the origin payload. This Worker forwards one hop of ciphertext and does not decrypt a second layer.

Tor is an optional bearer adapter on the node. It is not a network this Worker runs.

This design does not provide zero-knowledge proofs. It does not provide protection against a state-level adversary who can watch every hop. Confidentiality of a body is the body cipher. Metadata is visible to the relays that carry it.

### Airlock and airgap

On the node, every inbound object, module, and file lands in a non-executable quarantine store. Promotion checks the signature, then the hash, then a malware scan when ClamAV and YARA rules are installed. If the scanner is missing, the node reports `scanner: "absent"` and requires an explicit operator override before promotion. The promotion receipt names the object hash, the scanner versions, and the verdict. This Worker does not promote anything to execution.

An airgap bundle is a signed manifest for sneakernet. The signature covers `{ v, kind: "airgap-bundle", handle, public_key, manifest }`. `manifest_sha256` is SHA-256 of the canonical manifest and is checked beside the signature. Each file row is `{ name, sha256 }`. A disconnected machine checks the files with `sha256sum -c`, the same Plane C offline check. This Worker verifies the manifest and stores nothing. `stored` is false.

Pinned manifest hash: `8bb63ac4cfc5e9906781c09c7eb60e222c5cdd4fecd8d39c6c459b29fa9c2d1a`.

Pinned signature: `9bMxW9h4PihQzDE5AWWSN9k4UFsGnBIvqA7XYvCCeVKLIuHUXeidBBLJTWLvMd_0UEKynH-ALEFVIKLmVIOTDA`.

The manifest names `objects/local-first` with the `local-first` object hash.

### What this Worker does not do

qnm-node owns the mandatory body cipher on the daemon, the two-hop opt-in, the Tor bearer, per-peer circuit breakers, enforcement of a local quarantine, the airlock scanner pipeline, airgap file import and export, and the local trust view. AZNet owns claim issuance against this record. AZBrowser resolves final names, shows pending names as pending, and refuses an equivocating handle. Content classifiers, design mode, and the browser UI are those repos (sections 12 and 13). The wire formats above are the shared ones.

## 12. Per-node domain slots (section B)

Each handle has 7 slots on its own node. This is the per-node `.aziel` rule. It does not rename the live MirageGrid global Cap-7 factory names.

| Slot | Kind | Hub | Origin |
| --- | --- | --- | --- |
| `ae` | reserved | `AZ.AzielEliab.AZ` | `https://www.azieleliab.com/` |
| `corpus` | reserved | `AZ.AzielCorpusLibrary.AZ` | `https://www.azielcorpuslibrary.net/` |
| `godlock` | reserved | `AZ.Godlock.AZ` | `https://godlock.uk/` |
| `hdj` | reserved | `AZ.HeDidntJump.AZ` | `https://www.hedidntjump.com/` |
| 3 user slots | user | a claimed `.aziel` name | the owner's target |

The 4 reserved slots mirror the four primary hubs. They are not user-nameable. A custom slot such as `mysite` is `FED-MESH-BAD-INPUT`. If a primary site is down, a node that holds the mirror can serve that signed copy and help bring the site back. Restore copies only an object this relay has already hash-verified. The restore act carries the hash, not the bytes.

User slots are the 3 friendly `.aziel` names in section 5.1. Claim rules are unchanged: proof-of-work, pending until 72 hours and 2 witnesses, first valid final claim, equivocation refused. `<handle>.aziel` is automatic and does not use a user slot.

MirageGrid factory names stay a separate layer. Real factory names are `azgrid`, `azcloak`, `azvault`, `azshift`. Decoys are `azbooth`, `azflag`, `azstandby`. Those `.az` cites, and the AZ.* hub display names, are not FED-MESH name records. This section does not edit `src/cap7-shuffle.js`. The operator may revisit that layer later.

A restore statement is `{ v, kind: "restore", handle, public_key, slot, hub, object_hash, prev_slot, seq, prev, sig }`. `hub` must be the slot's canonical hub. `prev_slot` is 64 zeros for the first mirror, then the previous restore statement hash. A mismatch is `FED-MESH-FORK`. A missing cache entry is `FED-MESH-NO-OBJECT`. An isolated signer is `FED-MESH-ISOLATED`. The stored mirror is verified and not executable. It does not count as a user name.

Pinned restore of slot `ae` for `#CPV0CWYPXP4`, object hash `f56487a629550848508cbd6305d814f6008a1705ab4e215d926f6fda5e9c94dc`, statement hash `2c88e4a8b4a1ce633abda1e92ce02b92eab783d02593c358db519a32f77f9f41`. Signature: `mBRhUmaRrrv6zEbp94i4tQALJ0CO9VOlnUtKr9yVh95sYT1hRv_5JBzhLjP0lpBSIWkqEs4O5t6bSOcOOsoFCg`.

AZBrowser displays the slots. qnm-node hosts the mirror bytes on the node. This relay stores the signed slot index.

## 13. Morality and ethics (section D)

Policy, applied to domain names, site designs, and uploads: no pornography, no pictures of children, and no hate content.

Enforcement on this relay is isolation of the handle. Isolation cuts mesh relay, witness, name resolution, and object fetch for that handle. The node keeps running locally. Isolation does not delete the user's machine data. `local_data_deleted` is false. `radios_changed` is false. Suite presence is unchanged. This is not the roster presence value `isolated`, and it is not a quarantine receipt. Quarantine stays a local peer note with `network_cutoff: false`.

### Name blocklist

Version `FED-MESH-BLOCKLIST-1`. It is the union of this relay's tokens and AZN-BLOCK-1.0 from aznet branch `cursor/azn-name-ledger-1dc6`. That repo's `main` branch has no blocklist file. Checked on a friendly claim, before the handle sequence advances. A hit isolates the claiming handle from that handle's own signature. The relay does not mint a second signature.

Match rules, the same fold aznet uses:

- drop a trailing `.aziel`, then remove every character that is not a letter or digit
- after that fold, read digits `0 1 3 4 5 7` as `o i e a s t`
- a substring token matches inside the folded string, inside that lookalike reading, or inside the raw label, longest token first
- an exact token matches the whole label, the fold, the lookalike reading, or one hyphen-part (and that part's fold and lookalike reading)
- `sex` does not hit `essex` or `sussex`, `anal` does not hit `analysis`, and `kkk` does not hit a longer word
- `child.porn`, `child-porn`, and `ch1ldp0rn` match `childporn` and are refused; `sussex` and `analysis` are allowed
- `child` alone is not a token
- the list is not exhaustive

Those shared cases are pinned as `blocklist_fold` in the fixture: the lookalike map, each refused label with its token and reason, and the allowed labels.

| Token | Reason | Scope |
| --- | --- | --- |
| `childporn`, `childsex`, `jailbait`, `pedophile`, `paedophile`, `underage`, `preteen`, `csam` | `CSAM` | substring |
| `porn`, `porno`, `pornhub`, `hentai`, `onlyfans`, `nsfw`, `sexcam`, `camgirl`, `xvideos`, `xhamster`, `rule34`, `nude`, `nudes` | `NAME-BLOCK` | substring |
| `sex`, `xxx`, `milf`, `anal` | `NAME-BLOCK` | exact |
| `nazi`, `nazism`, `whitepower`, `whitesupremac`, `killall` | `HATE` | substring |
| `kkk` | `HATE` | exact |

A hit returns `FED-MESH-NAME-BLOCK` and does not store the name as a resolvable record. `content_stored` is false. The evidence is the statement hash of the signed claim.

Pinned `porn.aziel` claim, evidence hash `c73c95876863dff6aa06f98e849e1b565a7f8eede5a9dbfc7ee6afa6a50742c9`, code `FED-MESH-NAME-BLOCK`, reason `NAME-BLOCK`. Signature: `ro20II1C29PMvcoy-3HpcwOAOqJqGGfLHA-2z9HSGP42MB-QN_-3SWIqbsOQzpZ_KZ0g92msKOz1S1hC1oUpAw`.

Pinned `csam` label: code `FED-MESH-NAME-BLOCK`, reason `CSAM`, `content_stored` false, `name_stored` false, evidence hash `cbdf94dc14f3b89e2aff8814c7fc61ae89cf9f5968cc5036d03c3bfd92287bc9`. The relay response omits the label. The signed record is in the fixture.

A `CSAM` hit stores the statement hash only. The response and the stored record omit the name. Operators follow the law in their jurisdiction. In the United States that includes reporting to NCMEC. Bytes are not stored or forwarded as evidence.

The next act from that handle, other than `appeal` and `island`, is `FED-MESH-ISOLATED`.

### Isolation route

qnm-node posts a self-signed isolation to this relay. The canonical path is `POST /v1/mesh/relay/isolation`. `POST /v1/fedmesh/isolation` is the same handler. Other `/v1/fedmesh/<tail>` paths alias `/v1/mesh/relay/<tail>` when that tail exists. An unknown tail is refused. GET on either prefix is a read and does not enable radios.

Body (the signature covers every field except `sig`):

```json
{
  "v": "FED-MESH-1.0",
  "kind": "isolation",
  "handle": "#4S11EZW09MD",
  "public_key": "<raw Ed25519 key, base64url>",
  "subject": "#4S11EZW09MD",
  "reason": "NUDITY",
  "check": "image-nudity",
  "model": "absent",
  "evidence_hash": "<64 lowercase hex>",
  "seq": 2,
  "prev": "<64 lowercase hex, the handle tip>",
  "sig": "<Ed25519 signature, base64url>"
}
```

`subject` must equal `handle`. `reason` is `NUDITY`, `CHILD`, `HATE`, or `CSAM`. `check` is 1 to 64 characters (`[a-z0-9][a-z0-9._-]*`). `model` is a version string or `absent`. `evidence_hash` is the hash only. A byte field such as `body_b64` is `FED-MESH-BAD-INPUT` and is not stored.

Success response (`HTTP 200`):

```json
{
  "ok": true,
  "code": "FED-MESH-OK",
  "op": "isolation",
  "subject": "#4S11EZW09MD",
  "reason": "NUDITY",
  "check": "image-nudity",
  "model": "absent",
  "blocklist": null,
  "evidence_hash": "<64 lowercase hex>",
  "content_stored": false,
  "name_stored": false,
  "source": "self",
  "signer": "#4S11EZW09MD",
  "statement_hash": "<64 lowercase hex>",
  "local_data_deleted": false,
  "radios_changed": false,
  "automatic_lift": false,
  "chainlock": { "anchored": true }
}
```

`GET /v1/mesh/relay/isolation?handle=` and `GET /v1/fedmesh/isolation?handle=` return that record plus `appeals` and `applied: false`. A missing record is `FED-MESH-NO-NAME` (HTTP 404). A later name, object, witness, or restore from that handle is `FED-MESH-ISOLATED`. `appeal` and `island` are still accepted.

### Isolation record

Reason codes: `NAME-BLOCK`, `NUDITY`, `CHILD`, `CSAM`, `HATE`.

`MODEL-ABSENT` is not an isolation reason. On the hosting node, a missing classifier blocks publish and says the model is absent. It does not isolate the handle. This Worker runs no classifier. `classifiers_run_here` is false. `scanner` stays `"absent"`.

A content isolation is self-signed. The signer and the subject are the same handle. A different handle cannot isolate this one: this relay never sees the bytes, and one handle must not be able to ban another. Fields: `{ v, kind: "isolation", handle, public_key, subject, reason, check, model, evidence_hash, seq, prev, sig }`. `reason` is `NUDITY`, `CHILD`, `HATE`, or `CSAM`. `check` names the local check. `model` is a version string, or `absent`. `evidence_hash` is 64 hex. A field that carries bytes (`body_b64` or the same class) is `FED-MESH-BAD-INPUT`. `content_stored` is false. The act is anchored with ChainLock and TemporalLock.

Honest limit: a node that skips its local check and never signs an isolation stays relayable, because the content bytes never arrive here. A name-block is different. The offender's own signed claim is the proof, and this relay records the isolation from that claim.

Pinned self-signed isolation, handle `#4S11EZW09MD`, reason `NUDITY`, check `image-nudity`, model `absent`, evidence hash `f56487a629550848508cbd6305d814f6008a1705ab4e215d926f6fda5e9c94dc`, statement hash `19368601e687ba923a76811770d65fb0d2af0c1f14953a94869a1dd9a5d67493`. Signature: `jqZRZDoElZHknWdIGzR7x9X138tL91sJZzbhWLnImLij24-eFjKzdtxIo4rXgDaBf247-NBC7oYy8mwBMeXgDw`.

### Appeal

`{ v, kind: "appeal", handle, public_key, isolation_hash, note, seq, prev, sig }`. `note` is 1 to 160 characters. `isolation_hash` matches the stored isolation statement hash or its evidence hash. The appeal is stored. `applied` is false. `isolation_remains` is true. There is no automatic lift. Appeal and island are the only acts accepted from an isolated handle, including while island mode is off.

Pinned appeal statement hash `762a17b6a1e209ddcb6ef0740eede2d89e892217964ae372dcc5628a3b8ddcd8`. Signature: `q8Mebxw1F_4ulhPCr_8D5mPR_fDADpSrpF7Xue1Qg_TqEVbSq_YV5nSJ0QbyVDHjx3nc72V9frXHAcFlTPYsDg`. `applied` is false.

Classifiers and this blocklist have false positives and misses. A refused name can be legitimate. A violating name can miss the list. Do not describe this as catching everything.

### Who does what

This relay refuses isolated handles, checks the name blocklist, and restores reserved slots from verified hashes. AZNet checks the same blocklist and the same slot rules on claims. qnm-node runs design mode on localhost only, runs the local image and text classifiers, fails closed when a model is absent, and hosts reserved mirrors. AZBrowser refuses to resolve an isolated handle and shows the policy refusal. Screenshots of the browser belong to that repo.
