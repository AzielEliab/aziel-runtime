# AZRT-HELD-KEY-1.0: hold but never mint (RIB-042, idea from @DTXNaidu)

Receipt signing at write time with a key the runtime holds but did not make.

**Provisioning (deploy/issuer side, Worker secrets):**
- `RECEIPT_SIGNING_KEY`: Ed25519 private key, PKCS#8, base64url
- `RECEIPT_SIGNING_PUBLIC_KEY`: the matching raw public key, base64url
- `RECEIPT_KEY_PROVISIONED_BY`: who provisioned it (default `deploy-secret`)
- `RECEIPT_KEY_ATTESTATION_SHA256`: optional, the hash of a provisioning attestation

The runtime imports the private key non-extractable and sign-only. `src/receipt-signing.js` has no
code path to generate, rotate or export a key, and a test scans it (and the rest of `src/`) for such calls.
At load the runtime self-checks that the private key matches the published public key; if they don't
match it signs nothing.

**Commitment (`sig_commit`, inside the hash):** before the receipt is hashed it seals
`{ spec, key_id }` when a key is held, or `{ spec, mode: "none" }` when not. Stripping or nulling a
signature later therefore cannot pass: a committed key_id requires a valid signature by that key.

**Receipt field (`signature`, outside the hash):** the hash is computed first, then:
- signed: `{ spec, alg: "Ed25519", sig, key_id: "ed25519:<sha256 of raw pubkey>", public_key, provisioned_by, attestation_sha256 }`.
  The signature covers `"azrt-receipt-sig-1:" + hash`.
- unsigned: `{ spec, sig: null, reason }` when no key is provisioned (or it failed the self-check). Never a fake or self-minted signature.

Receipts minted while a provisioned key is held are signed. All other receipts stay hash-linked and
sealed, not signed, and say so.

**Verify** (`receipt_signatures` in the session verify): signatures are checked against trusted keys,
which are `PINNED_RECEIPT_KEYS` (in code, none pinned yet) plus this deploy's published, unpinned
`RECEIPT_SIGNING_PUBLIC_KEY`. These fail closed:
- `RECEIPT-SIG-MISSING`: sig_commit names a key but the signature is absent or null (strip / swap downgrade)
- `RECEIPT-SIG-DOWNGRADE`: a legacy or unsigned receipt after the first signed one
- `RECEIPT-SIG-BAD`, `RECEIPT-KEY-UNTRUSTED`, `RECEIPT-KEY-ID-MISMATCH`
- `RECEIPT-SIG-UNCOMMITTED`: a signature on a `mode: none` receipt
- `RECEIPT-SIG-NO-REASON`: unsigned without a reason

Only a receipt with no `sig_commit` at all is `legacy` (minted before this change), and legacy receipts
before any signed one verify as before. Hash recompute: drop `hash` and `signature` (keep `sig_commit`).

`GET /v1/receipt-key` publishes the public key and its provenance with `trusted: false` and
`key_source: "published (self, unpinned)"` unless the key is pinned, or `signing: false` with the reason.

**Honest limits.**
- **Full rewrite.** With no key provisioned (every deploy today), `sig_commit` is `{mode:"none"}` on every row. Someone who can rewrite the whole stored chain can rewrite every row, recompute every hash and keep `mode:"none"` throughout; this check cannot tell, because nothing in the chain was signed. Even with a key held, a full rewrite back to the first row can drop the signatures and commit `mode:"none"` from row 1, so it reads as an unsigned chain rather than a downgrade. Only an outside record catches either: a witnessed head (AZRT-ANCHOR-1.0 / RIB-044) or a pinned key with a published first signed head.
- **`sig_commit` is not in the dual-lattice hash.** The lattice `document_hash` is computed from the receipt body before `sig_commit` is added (`appendReceipt` in `src/session-core.js`). `sig_commit` is covered by the row `hash` (and so by `prev_hash` linking and the witness), but not by the primary/secondary lattice chain. A lattice-only check (for example the AZ-OS tether, which carries lattice rows) does not see a changed `sig_commit`; use the row hash chain for that.
- **Source scan is a review gate, not a sandbox.** `verify-held-key` now refuses any fragment of the secret name outside `src/receipt-signing.js` (so `env["RECEIPT_" + "SIGNING_KEY"]` fails) and any new computed `env[...]` index or whole-env enumeration/spread that is not on a reviewed allowlist, and it checks that no HTTP surface echoes the key. Code could still reach the secret in ways no regex sees; the scan only forces such a change to be noticed in review.
- If a deploy stops holding the key after a receipt was signed, later receipts fail RECEIPT-SIG-DOWNGRADE in that session. That is by design.
- No key is provisioned on any deploy by this PR. Until the deploy side sets the secrets, every receipt is unsigned (sig null + reason).
- The published key is unpinned: it comes from the same deploy that holds the private key. To trust it independently, pin it in `PINNED_RECEIPT_KEYS` or compare `/v1/receipt-key` with an outside record. `provisioned_by` and the attestation hash are the deploy side's word.
- A Worker secret is readable by the deploy side, and the code holding it could be changed to misuse it. "Never mint" is about this code: it never creates, rotates or exports the key.
- Session receipts only. ChainLock stamps and FragGate ledger rows are not signed by this PR.
- This is a PR, not a live claim.
