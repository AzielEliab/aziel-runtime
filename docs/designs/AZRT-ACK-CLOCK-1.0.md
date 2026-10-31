# AZRT-ACK-CLOCK-1.0 — ack and resolution clocks

Author: Aziel Eliab only. Status: **not LIVE**. Not a Softwares card. Not a new MCP tool. Not a Remain-OFF flip. Not a deploy.

Sources: RIB-066, RIB-064, RIB-065, RIB-067 (@smperng, 2026-10-30). Code: `src/ack-clock.js`. Tests: `scripts/verify-ack-clocks.mjs`.

Receipts are hash-linked and sealed. They are not signed. The kind is `aziel-runtime.ack-clock`. The hash is SHA-256 of `canonicalize(receipt without hash)`, the same canonicalizer as session receipts. There is no signature field. `live` is false. `spec_status` is `not-live`.

This chain does not add fields to session receipts, ForgeReceipts bodies, ChainLock stamps, or FragGate ledger rows. Those seals verify unchanged.

## RIB-066

`page_delivered` and `human_ack` are different rows. Delivery sets `ack_clock_started_ms` and arms `budget_ms`. `checkBudget` past that budget seals `ack_miss` and, when the ladder has a next person, a new `page_delivered` for that person. The miss does not stop the clock.

A human ack stops the clock only when `deliberate` is true and `human_name` is a person, not a read receipt or an auto-reply. `read_receipt` and `auto_reply` are their own rows with `stops_clock: false`. Resolve does not stop the ack clock.

`ack_latency_ms` is acked time minus the open ack-clock start. `resolution_ms` is resolve time minus `resolution_started_ms`. Weekly ack latency is the mean of `human_ack` rows in a window, recomputed from the chain alone.

## RIB-064

`reassign` increments `handoff_count` and seals a delivery for the new owner. A new owner gets a new ack start. `resolution_started_ms` does not move. Reassign back to the original owner uses that owner's first ack start. If that first ack already stopped the clock, it stays stopped. Past two handoffs (`handoff_count > 2`) sets `handoff_flagged`. A budget escalation is not a handoff.

## RIB-065 and RIB-067

`total_age_ms` is measured from the original open. `reopen` increments `reopen_count`. The second reopen sets `reopen_flagged`. The row sets `re_resolve_started_ms` and `original_receipt_hash` of the first seal. The inherited resolution start stays put, so a later resolve can show a long `resolution_ms` and a short `re_resolve_ms`.

Intake: the same requester and the same issue key, while the item is unresolved or within 30 days after `resolved_ms`, seals `intake_linked` on that item. It does not open a second item. A filing outside that window is a new item with its own resolution clock.

## Boundary

Cap-7 and `.aziel` text on a row is a name. `name_resolved` is false. The sealed boundary says Cap-7 is not ICANN and not a public egress IP. `paid_sat` is `HELD` (XM SDARS and the satellite relay stay held, not enabled, not live). Nothing in this module turns those on.

Not live until a later cut wires a door and AZBot CLEAR says so. This cut does not.
