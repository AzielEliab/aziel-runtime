# AZRT-MODEL-PROVENANCE-1.0 (RIB-068, idea from @datachad)

Status: **not LIVE**. The check runs. It is not an AZBot CLEAR and it is not a LIVE law.

Model-backed call receipts record the requested alias and the model id and version the provider reported, so a silent version swap behind the same alias shows up in the log.

| field | meaning |
|---|---|
| `requested_alias` | the name the caller asked for |
| `model_id` | provider-reported id. Not filled from the alias |
| `model_version` | provider-reported version |
| `model_basis` | `source: provider-response`, `names_only: true`, `resolved: false` |
| `model_finding` | present only when `model_version` changed under that alias |

Written on FragGate ledger rows and session exec receipts when the provider response reports a model id and version and the request names an alias. Refusals, open, policy, and close do not gain the fields. A call that never used a model omits them. Old receipts keep their hashes.

Verify (`verifyChainStrict`, `verifyLedger`, `chainlock_verify`) walks receipts per `requested_alias` and:

- seals `MODEL-VERSION-SWAP` when `model_version` differs from the previous receipt for that alias
- reports `MODEL-FINDING-TAMPER` when a finding on the receipt does not match that seal
- reports `MODEL-PROVENANCE-PARTIAL` when some of the three fields are present and the triple is not valid

`MODEL-VERSION-SWAP` makes verify `ok: false`. The finding's `hash` is sha256 of the canonical finding body. `signed` is false. No signature is added.

With nothing model-backed in the window, `model_provenance` is `status: "not_checked"`, `ok: null`. That is not a pass and it does not fail the hash chain.

Limits: the runtime does not call a hosted model provider from this stamp. It records a provider report the call already returned. It does not invent a version. It does not resolve Cap-7 or `.aziel` names. Cap-7 is not ICANN. Paid satellite stays HELD.

Receipts are hash-linked and sealed, not signed.
