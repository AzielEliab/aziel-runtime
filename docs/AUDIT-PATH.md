# AZRT-AUDIT-PATH-1.0 (RIB-055)

An external recorder can see network and file activity the session never logged. A hash chain shows edits to what was written. It does not show a run the worker did not record. This spec names that recorder, fails closed when its path is not healthy, and reconciles its records on the harness.

Receipts stay hash-linked and sealed, not signed. This is a PR, not a live claim. No new MCP tool. Softwares stay 42. `tools/list` stays 36. Stub ops stay 363. Version stays 2.0.0-rc1.

## Naming the recorder

`POST /v1/session/open` may include:

```json
{ "recorder": { "observer_id": "obs-1", "records_at": "observer://records/sess" } }
```

Stamp #1 seals `recorder`, `recorder_hash`, and an `audit_path` health stamp (`healthy` by default, or `audit_health`: `healthy` / `degraded` / `down`).

`records_at` is where the records live. It is stored as a name. The runtime does not dial it. A Cap-7 or `.aziel` name is `names_only: true` and `resolved: false`. `observer_id` must name something other than the runtime or this session.

Sessions that omit `recorder` are unchanged.

## Health

`POST /v1/session/{id}/audit` with `{ "status": "down" }` seals the transition. `degraded` is the same class of outage for the gate. Returning to `healthy` requires `beat_hash` (sha256 of the recorder beat). The outage is not erased.

High-impact ops are the FragGate mutate class (`fraggateOpAccess`: write-shaped ops, and unknown ops, which stay mutating) plus DecisionGATE `check` and `evaluate`. While the path is not `healthy`, those ops refuse `AUDIT-PATH-DOWN` before anything runs. The refusal is a sealed `refused` receipt with `audit_status=unaudited`, and a row on the internal `refusals` chain.

Every exec and refusal while the path is `down` or `degraded` is sealed `audit_status=unaudited`. A high-impact exec also carries the health stamp when the path is healthy.

## Close

When stamp #1 named a recorder, close always seals a harness `reconcile` receipt. The caller cannot supply findings and cannot skip the row. `observer_records` are hash-addressed (`record_hash` must match the canonical record, or close refuses `AUDIT-RECORD-HASH-MISMATCH` and writes nothing). Omitting them seals `observer_records_absent` and is not clean.

Each contiguous span that was not healthy becomes one `unaudited_gap` row: `start`, `end`, and `rows_affected` (exec and refused receipts inside the span). Verify recomputes both rows. A missing or forged row fails closed. A gap or a finding means verify does not report the session as clean (`clean: false`, `ok: false`), and a verdict is not sealed.

Unmatched observer actions and unmatched exec receipts are each a finding. Match is one-to-one, by `receipt_hash` or by `slug` + `op` + `payload_digest`.

## What this does not do

The runtime does not contact the recorder. Health is the sealed stamp, not a probe. Cap-7 is not a registrar and not a public egress address. No private key is sealed, printed, or logged.
