# AZRT-EVIDENCE-FIELDS-1.0 (RIB-016)

Ideas from @eveliqTrace (Roland Brüggemann), @pocket_log_gpt, and a DM with dim (@radimhfer):
hash-linked does not mean true, sealed does not mean authorized, and checkable does not mean verified.

**Policy binding (every new exec receipt).** Each exec receipt carries:
- `policy_hash`: sha256 of the canonical `{spec, policy}` in force
- `policy_receipt_ref`: the hash of the open or policy receipt that set that policy

Verify fails closed on:
- `POLICY-HASH-MISMATCH`: the hash does not match the policy sealed in the referenced receipt
- `POLICY-REF-UNSEALED`: the ref is missing or comes later in the chain
- `POLICY-REF-STALE`: the ref is not the latest policy-setting receipt before the exec

Older exec receipts without these fields report `policy_binding: "legacy"`.

**Optional evidence block** (`evidence` on `POST /v1/session/{id}/exec`):

    authority { grant_ref, scope }      grant_ref = hash of the open/policy receipt that granted it
    policy    { policy_hash, scope }
    execution { receipt_hash }          an earlier exec receipt in this chain
    effect    { observer, observation_hash, observed_at }

Every field is sealed with `status: "unchecked"`. Whatever status a caller sends is dropped, so a
caller can never seal "verified".

**Verification is per field** (`evidence.fields[]` in the session verify):
- **authority**: verified when grant_ref is an earlier open or policy receipt whose policy allows the scope.
- **policy**: verified when it equals the receipt's policy_hash and that binding verified.
- **execution**: verified when receipt_hash is an earlier exec receipt in the chain.
- **effect**: verified only when the supplied body matches the hash the caller committed to
  (`verifyEvidence(receipts, { observations })` against `observation_hash`). The observer is a name
  the caller supplies and is not checked. Self-named observers (runtime, session, the session id),
  compared after NFKC and stripping zero-width/Default_Ignorable characters (so `Runtime\u200b` is
  blocked), and absent bodies stay `unchecked`.

A failed field is listed in `field_failures` and `fields_ok: false`. It is not a chain-integrity
break. Chain integrity passing never sets any field to verified. The verify output's `ok` covers
only the policy binding (`ok_scope` says so); evidence results are in `fields` / `fields_ok`.

**Limits.** The hosted verify supplies no observation bodies, so effect stays `unchecked` there.
Anyone can check effect by running verifyEvidence with a body; "verified" means only that the
supplied body matches the hash the caller committed to, not who observed it. Receipts are
hash-linked and sealed, not signed. This is a PR, not a live claim.
