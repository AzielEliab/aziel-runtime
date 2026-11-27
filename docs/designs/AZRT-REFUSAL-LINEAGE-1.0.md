# AZRT-REFUSAL-LINEAGE-1.0 — walk a refusal to its upstream receipts

Author: Aziel Eliab only. Status: **Not live**. Receipts are hash-linked and sealed, not signed. Not a Softwares card. Not a new MCP tool.

Source: Twitter backlog RIB-057 (@read__the__diff). Code: `src/refusal-lineage.js`. Tests: `scripts/verify-refusal-lineage.mjs`.

AZRT-ANCHOR-COVERAGE-1.0 also uses the label RIB-057, for per-refusal anchor publish. That module is unchanged. This walk does not publish an anchor, does not read `COVERAGE_LIVE`, and does not write.

## What it walks

A refusal stamp stores one `follows.h`. A session receipt stores one `parent_receipt_id`. `correlation_id` groups attempts and is not an order. `prev_hash` (and ChainLock `prev`) is chain order, not a dependency.

`walkRefusalLineage` starts at one refusal and follows every upstream hop: `follows`, then `parent_receipt_id`, then an explicit `upstream` / `upstream_receipts` / `depends_on` list. The same receipt is visited once. A cycle is recorded and the walk returns. Depth stops at `max_hops` (default 32, cap 256). Each visited receipt is checked against its hash (`stamp_sha256` for a ChainLock stamp, `hash` for a session receipt, signature excluded). `verified` is true only when every hash matches, every link resolves, there is no cycle, and the bound holds.

The result is a lineage: the refusal id, then upstream ids, with edges, unresolved links, and truncated links. It does not include receipt bodies.

Cap-7 is not ICANN. Paid satellite stays HELD. `tools/list` stays 36. Softwares stay 42. Version stays 2.0.0-rc1.
