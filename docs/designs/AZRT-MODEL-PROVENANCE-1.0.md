# AZRT-MODEL-PROVENANCE-1.0 — model id and version on the receipt

Author: Aziel Eliab only. Status: **not LIVE** (awaits AZBot CLEAR). Source: RIB-068 (@datachad).

A model-backed call receipt records three additive fields:

| field | source |
|---|---|
| `requested_alias` | the name the caller asked for |
| `model_id` | the id in the provider response |
| `model_version` | the version in the provider response |

`model_id` is not copied from the alias. A top-level `model` echo is not a provider id. `provider.model` or `model_report.model` counts only together with `model_version`.

When a later receipt reports a different `model_version` under the same `requested_alias`, verify seals a `MODEL-VERSION-SWAP` finding. The finding is the sha256 of its canonical body. It is hash-linked and not signed. Same version, or a different alias, seals nothing. A model id change with the same version stays on the two receipts and does not seal a version finding.

Calls with no provider model report omit the fields. Receipts sealed before this spec verify as before.

Names only. A value that is an address, a URL, or `..` is not recorded. `.aziel` and Cap-7 strings are names. They are not resolved. Cap-7 is not ICANN. Paid satellite stays HELD.

Not a new MCP tool. `tools/list` stays 36. Softwares stay 42. Version stays 2.0.0-rc1.
