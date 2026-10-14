# AZRT-EXPECT-SPEC-1.0 verify (RIB-013, idea from @DTXNaidu)

A chain can open with its expected-state spec (`spec` + `verdict_criteria`) sealed as stamp #1,
before anything runs. #247 added the spec stamp (`expect`, `expect_hash`) and the automatic
`spec_ref` on every later session receipt. This adds the verify side, so the chain proves what
was promised up front and not only that nothing changed afterwards.

Checked by the session chain verify (`runtime_session_receipt(s)`) and by `chainlock_verify`
(per chain). Every rule fails closed:

| code | when |
|---|---|
| `EXPECT-SPEC-TAMPERED` | stamp #1 carries `expect` whose canonical hash is not its `expect_hash` (caught even if every hash link is recomputed) |
| `EXPECT-SPEC-LATE` | an `expect_hash` appears on any stamp other than #1 |
| `EXPECT-SPEC-REF-UNSEALED` | a stamp carries `spec_ref` but no spec was sealed as stamp #1 (outcome before spec) |
| `EXPECT-SPEC-REF-MISMATCH` | `spec_ref` names a different stamp or a different `expect_hash` |
| `EXPECT-SPEC-REF-MISSING` | session chains only: a receipt after the spec omits `spec_ref` |
| `EXPECT-VERDICT-NO-SPEC` | a verdict is sealed on a chain that never sealed a spec |

On ChainLock chains `spec_ref` may name the spec stamp by `id` or by `stamp_sha256`; it is only
required where a stamp chooses to carry it (fact stamps are not outcomes).

Chains with no spec and no `spec_ref` report `expect_spec.status: "no_spec"` and verify exactly
as before. The verdict itself is the caller's claim, sealed; the runtime does not compute it.
Receipts are hash-linked and sealed, not signed. This is a PR, not a live claim.
