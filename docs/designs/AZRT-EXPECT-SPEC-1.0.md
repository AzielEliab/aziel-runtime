# AZRT-EXPECT-SPEC-1.0 — seal the expected state before anything runs

Author: Aziel Eliab only. Status: LIVE (additive). Source: RIB-013 (@DTXNaidu).

`runtime_session_open` (and `POST /v1/session/open`) accepts `expect: {spec, verdict_criteria, world_version?}` (canonical JSON ≤ 2048 bytes). The open receipt — stamp #1 of the session chain — seals `expect` and `expect_hash = sha256(canonicalize({spec, expect}))` before any exec. Every later receipt in that session carries `spec_ref {spec, receipt_hash, expect_hash}` pointing at stamp #1, inside its hash, so the goalposts cannot move after the fact without breaking the chain.

`runtime_session_close` accepts `verdict: {pass, notes?}`; the close receipt seals it with `claimed_by: "caller"`, `computed_by_runtime: false` (the runtime does not judge the verdict; it seals who claimed what against which sealed criteria).

Refuse codes: `EXPECT-SPEC-INVALID`, `EXPECT-VERDICT-INVALID` (400, nothing opened / closed).

Not done here (parked): RIB-014 (stale on world-version move) and RIB-015 (only stamp #1's issuer may append expiry / revocation). `world_version` is sealed so RIB-014 can build on it later.

Law fit: additive fields on new sessions only; session receipt `kind`, hash algorithm and signed-field set for old chains unchanged; RoseClock forward-only (no edit of stamp #1).
