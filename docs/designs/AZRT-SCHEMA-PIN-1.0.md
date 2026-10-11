# AZRT-SCHEMA-PIN-1.0 — pin the tool schema, stop on drift

Author: Aziel Eliab only. Status: LIVE (additive). Sources: RIB-019 (@Quantradin, @mikesaleme).

`schema_hash = sha256(canonicalize({spec, tools}))` over the live `tools/list`. Published as additive `_meta["aziel/schema_hash"]` on `tools/list` (MCP allows `_meta`).

- Per call: send `schema_hash` on any `tools/call` (or `POST /v1/fraggate/call`). If it no longer matches, the runtime refuses `SCHEMA-DRIFT` (HTTP 409, `executed: false`, pinned + current hash), nothing runs, and AZRT-REFUSAL-RECEIPT-1.0 seals the refusal.
- Per session: `runtime_session_open` seals the current `schema_hash` in the open receipt (stamp #1). Every `runtime_session_exec` re-checks; drift refuses `SCHEMA-DRIFT` (409) and the session must be reopened.
- Receipts: refusal / follow stamps, FragGate ledger rows (when the caller pinned) and session open / exec receipts carry `schema_hash`.

Law fit: additive. No tool renamed or added; the hash changes when the schema changes, which is the point. Callers that never send `schema_hash` see no change.
