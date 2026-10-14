# AZRT-SPEC-STALE-1.0 (RIB-014, idea from @DTXNaidu)

The expected-state spec sealed as stamp #1 (AZRT-EXPECT-SPEC-1.0) can carry `world_version`, an
opaque string the issuer supplies (`expect.world_version`, inside the hashed spec).

If that world moves before the run closes, append a stale stamp:

    POST /v1/session/{id}/stale  { "new_world_version": "w-2", "reason": "upstream schema moved" }

The receipt (`event: "stale"`) seals `stale: { spec_ref, spec_world_version, new_world_version, reason }`.
It never edits stamp #1. More than one stale stamp may be appended; each names the version it replaces.

Rules (fail closed):
- `close` with a `verdict` refuses `409 EXPECT-SPEC-STALE` once a stale stamp is sealed. Close without a verdict still works.
- Verify reports `spec_stale { status: no_spec|fresh|stale, stale_at_seq, current_world_version, verdict_valid }`.
  A verdict sealed after a stale stamp fails with `EXPECT-VERDICT-STALE-SPEC` and `verdict_valid: false`.
  A verdict sealed before a later stale stamp stays valid.
- A stale stamp that names the wrong spec or wrong prior version fails (`SPEC-STALE-REF-MISMATCH`, `SPEC-STALE-VERSION-MISMATCH`); one without a spec fails `SPEC-STALE-NO-SPEC`.
- Refusals at write: `SPEC-STALE-NO-SPEC`, `SPEC-STALE-SAME-VERSION`, `SPEC-STALE-INVALID`.
- `stale` is not an additive field, so exec/close callers cannot inject it.

Expiry is a sealed event, not a schedule: no timer, clock or TTL decides staleness.
Only the issuer recorded at genesis may append a stale stamp (RIB-015, docs/ISSUER-APPEND.md):
send `X-Azrt-Issuer-Key`; anyone else gets 403 CL-NOT-ISSUER.
Receipts are hash-linked and sealed, not signed. This is a PR, not a live claim.
