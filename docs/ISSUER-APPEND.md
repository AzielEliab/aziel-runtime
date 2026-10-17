# AZRT-ISSUER-APPEND-1.0 (RIB-015, idea from @DTXNaidu)

"Stamp #1, expiry, revocation: all one issuer-owned log the deploy path can only read."

**Genesis records the issuer.** `POST /v1/session/open` mints a random issuer key on the Worker and
returns it once as `issuer_key`. The open receipt (stamp #1) seals only
`issuer { spec, kind: "session-issuer-key", key_hash }`, where key_hash = sha256("azrt-issuer-key:" + key).
The key is never stored or sealed. A client cannot choose its own issuer hash, and a re-open never
returns a key.

**Issuer-only control stamps.** Send `X-Azrt-Issuer-Key: <issuer_key>`:
- `POST /v1/session/{id}/stale {new_world_version, reason}` (RIB-014)
- `POST /v1/session/{id}/revoke {reason}`: appends `event: "revoke"` with `revoke { genesis_hash, expect_hash?, reason }`. Only one is allowed (`REVOKE-DUPLICATE`).
- `POST /v1/session/{id}/pause` and `/resume` (RIB-044) need the same issuer key (`403 CL-NOT-ISSUER` otherwise, chain unchanged) and, with `REQUIRE_TOKEN=1`, the runtime token. Their rows are `freeze`/`resume` receipts and carry no `written_by`; the gate is at write time.

A missing or wrong key gets 403 `CL-NOT-ISSUER` and leaves the chain unchanged. Chains sealed with no
issuer (legacy) have no writer for these stamps (fail closed). Each control stamp seals
`written_by { issuer_key_hash }`. `issuer`, `written_by`, `stale` and `revoke` are not additive fields,
so exec, close and open callers cannot inject them.

**The run path only reads.** `GET /v1/session/{id}/spec` returns `{ revoked, stale, exec_allowed, ... }`
and has no write side. Exec checks the same state and refuses with 409 `SPEC-REVOKED` / `SPEC-STALE`
before anything runs. Close with a verdict refuses after a revoke or stale stamp.

**Verify fails closed** (`issuer_append` in the session verify):
- `CL-NOT-ISSUER`: a stale or revoke stamp whose written_by is not the genesis issuer hash
- `EXEC-AFTER-REVOKE` / `EXEC-AFTER-STALE`
- `EXPECT-VERDICT-REVOKED`
- `REVOKE-DUPLICATE`

**Honest limits.** Verify proves each control stamp names the genesis issuer and that the hash links
hold. Proof that the writer actually held the key is the write gate, not a signature. Session chains
only; ChainLock append still has no per-chain writer authority. Receipts are hash-linked and sealed,
not signed. This is a PR, not a live claim.
