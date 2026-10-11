# AZRT-INTEGRITY-LEVEL-1.0 — how much to trust a receipt

Author: Aziel Eliab only. Status: LIVE (additive). Source: RIB-017 (@eveliqTrace).

Every verify output that already exists gains an optional `integrity` object: `{spec, level, levels}` with `level` one of:

| Level | Meaning |
|-------|---------|
| `none` | no hash |
| `hash_present` | the row has a hash, but the chain walk failed or was not done |
| `chain_consistent` | hashes recompute and prev links hold from genesis (or across the bounded walk to the anchored head) |
| `externally_anchored` | chain_consistent **and** a verified AZRT-ANCHOR-1.0 witness statement anchors this chain at a seq at or after the row, and that anchored row still matches |

Where: `chainlock_verify` (per chain, with `anchored_through`, `unanchored_tail`, `witness_view`), session `verifyChainStrict` (`/v1/session/{id}/receipts`, ceiling `chain_consistent` because sessions are not witnessed), `GET /v1/anchor/row`.

Law fit: additive field only; existing `ok` semantics only tighten (a moved anchored head is now a break, which NO-REWRITE already forbade). Old receipts verify unchanged and simply show their level. Never claims `externally_anchored` without a pinned-key signature check.
