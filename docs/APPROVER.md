# AZRT-APPROVER-1.0 — approver in the same entry (RIB-043)

Idea: @RohanBhanotAI. Author: Aziel Eliab.

A session exec is **gated** when the session policy sets `require_decision: true`, or when the exec carries a `decision`.

A gated exec sends `decision { proposal, overrides?, args_hash, goal_hash? }`. Then:

1. The runtime runs DecisionGATE on `proposal` itself. `final_state` must be `PASS`, otherwise the exec is refused with `APPROVER-NOT-PASSED`. If there is no decision, or the decision names no `accountable_person`, it is refused with `APPROVER-MISSING`.
2. `args_hash = sha256(canonical({spec, slug, op, payload_digest, session_id, intent_id}))` must equal the executed call's hash. `intent_id` is runtime-issued: `<session_id>:<next receipt seq>` (a DRIFT refusal returns the `intent_id` it expected). `goal_hash` must equal the hash of the executed `goal`; when no goal is sent, both are null. A mismatch is refused with `APPROVER-DRIFT`. A decision whose `args_hash` or `decision_record_hash` was already sealed in this session is refused with `APPROVER-REPLAY`; a decision from another session fails `APPROVER-DRIFT`.
5. `require_decision` is one-way within a session: a policy update that turns it from `true` to anything else is refused with `409 APPROVER-POLICY-DOWNGRADE` and the policy is unchanged.
3. Each of these refusals seals a `refused` receipt using AZRT-REFUSAL-RECEIPT-1.0 (RIB-018, #284). Nothing runs.
4. On success, the exec receipt's `payload.intent.approver = { spec, approver_id, decision_record_hash, approved_at, record }` (and `payload.intent.goal_hash`) is sealed inside the **same row hash** as the action. It is not stored in a separate row.

`verifyChainStrict` returns an `approver` block:
- A gated exec row with no approver fails `APPROVER-MISSING`.
- A record hash, approver_id, approved_at, final_state or args_hash that doesn't match the sealed intent fails `APPROVER-MISMATCH`.
- An ungated exec row reports `approver: "not_required"`.
- Gating is sticky: once a session is gated, a policy receipt that goes from `require_decision:true` to anything else fails `APPROVER-POLICY-DOWNGRADE`, and later exec rows are still checked as gated.
- `approved_at` must equal the exec receipt's own `ts`; DecisionGATE is re-run on `record.proposal` (the sealed `final_state` is not trusted); `record.goal_hash` must equal the intent's sealed `goal_hash`; `args_hash` is recomputed with the row's `session_id` and `intent_id`; a reused `args_hash` / `decision_record_hash` fails `APPROVER-REPLAY`.

Old receipts verify unchanged; see the fixture check in `scripts/verify-approver.mjs`.

## Honest limits
- `intent_id` is predictable (`<session_id>:<next seq>`). A caller can make a decision ahead of time for a future seq; it only runs once that seq arrives, and only once (replay is refused). This is harmless because the caller is its own approver: `approver_id` is not an authenticated identity, so pre-computing a decision grants nothing a caller could not already do.
- `approver_id` is DecisionGATE's `accountable_person` record, **not a signature** and not an authenticated identity. Anyone who can call exec can write any name in the proposal. The runtime only proves that this record, bound to this exact call, passed DecisionGATE and was sealed in the same row.
- Receipts are hash-linked and sealed, not signed (unless RIB-042's provisioned key lands and is configured). Someone who rewrites the whole chain and rehashes it is caught only by external anchoring, not by this check.
- Reuse: this reuses #284's refused-receipt structure for refusals. It does not reuse #283's `evidence.authority`, because that field is caller-supplied and unchecked, while `approver` is written by the runtime after its own DecisionGATE run.
