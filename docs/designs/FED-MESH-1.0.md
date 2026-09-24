# FED-MESH-1.0: Local-First Edge Mesh

Author: **Aziel Eliab** only.

This is the shared protocol for a multi-user mesh. The runtime Worker is one relay. A qnm-node daemon can run the same relay. Nothing in the protocol requires this Worker.

FragGate stays the single door. This paper does not add an MCP tool. Relay ops are FragGate ops on slug `mesh` (`relay-register`, `relay-ref`, `relay-sync`, and the rest) and HTTP under `/v1/mesh/relay/`.

Test vectors live in [`fixtures/fed-mesh-vectors.json`](../../fixtures/fed-mesh-vectors.json). `scripts/verify-fed-mesh.mjs` recomputes them, including a name claim, a transfer, and a refused eighth friendly name.

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

`<handle>.aziel` is the handle body in lowercase Crockford, plus `.aziel`. The label matches `^[0-9a-hjkmnp-tv-z]{11}$`. `#CPV0CWYPXP4` owns `cpv0cwypxp4.aziel`. The signer and the owner are that handle. A transfer or a release of that name is `FED-MESH-HANDLE-MISMATCH`. The self-certifying name does not count toward the cap of 7. A label of 11 Crockford characters is that handle's slot.

### Friendly names

The first valid anchored claim on that relay wins. A later signer who is not the live owner receives `FED-MESH-NAME-TAKEN`. The race is per relay. Two relays can anchor two first claims until the holders sync. AZBrowser resolves the ledger it holds.

A handle may hold 7 live friendly names. The eighth is `FED-MESH-NAME-CAP` (HTTP 429). An expired row and a released row no longer count. The self-certifying name still fits after the cap is full.

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

On a fresh relay the same handle registers, then claims `name-1.aziel` through `name-7.aziel`. This eighth friendly claim is signed. The relay answers `FED-MESH-NAME-CAP` and does not store it. The handle sequence stays at the tip after `name-7`.

```json
{
  "v": "FED-MESH-1.0",
  "kind": "name",
  "handle": "#CPV0CWYPXP4",
  "public_key": "ebVWLo_mVPlAeLES6KmLp5AfhTrmlb7X4OORC60ElmQ",
  "name": "name-8.aziel",
  "owner": "#CPV0CWYPXP4",
  "target": {
    "type": "hash",
    "value": "f56487a629550848508cbd6305d814f6008a1705ab4e215d926f6fda5e9c94dc"
  },
  "expires": null,
  "seq": 9,
  "prev": "a78075c00b23fbe1d7cf2449d7dc4ac3f099bb9fa568719f1e814f5e6566dc2d",
  "prev_record": "0000000000000000000000000000000000000000000000000000000000000000",
  "sig": "_UUBNgX4qVjQOPWDmf-C-5xT0krP_lB_x8XJbGot5YybugtMnqzODj3ds7ZwxiLkTQbZkMajCYDlIkeqVB21Aw"
}
```

Cap: 7. Code: `FED-MESH-NAME-CAP`.

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
| POST | `/v1/mesh/relay/name` | Signed `.aziel` name record |
| GET | `/v1/mesh/relay/name?name=` | One name record. `?handle=` lists that owner's names |
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

Per-handle signed acts: 30 per minute (`FED-MESH-RATE`, HTTP 429). The window is per isolate, not global. Ordinary HTML GETs are not in this bucket. Ciphertext: 4096 bytes. Rollup changes: 16384 bytes, at most 32 rows. Envelope: 20000 bytes. Inbox and object caps are above. Friendly `.aziel` names: 7 per handle (`FED-MESH-NAME-CAP`, HTTP 429). These are the same budget idea as `mesh_mutate` on the HTTP edge.

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
- A friendly `.aziel` name goes to the first valid anchored claim on that relay. A handle holds 7. `<handle>.aziel` is self-certifying and stays outside that cap. `.az` stays normal DNS except the Cap-7 and AZ.* allowlist in section 5.1.
- No tenant execution and no private keys on the relay.
- No worldwide total order. TemporalLock click is per relay.
- Rate limits are per isolate. The roster key has no compare-and-swap.
- The replay window is 32 acts. Older forks need a verifier that holds the whole chain.
- Neighborhood discovery is not run by this Worker.
- The public object cache is optional, small, and hash-checked. Peers are the object store.
- GET never enables radios. `mesh_disable` still refuses. Suite-presence stays the QNM rollup.
- Author identity remains Aziel Eliab only. A handle is not that identity.
