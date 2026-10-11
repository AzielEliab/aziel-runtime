# AZRT-CONTEXT-HASH-1.0 — what the agent read, sealed on the receipt

Author: Aziel Eliab only. Status: LIVE (additive). Source: RIB-020 (@senoldoganx).

Callers may send `context_refs` (up to 64 strings ≤ 512 bytes: URLs, content hashes, resource ids) and `node_ids` (up to 8 of `[a-z0-9._-]`) on `fraggate_call`, any `tools/call`, or `runtime_session_exec`. The runtime computes `context_hash = sha256(canonicalize({spec, refs: sorted unique}))` (or accepts a caller `context_hash` hex when no refs are sent; then `source: "caller-hash"`). `node_ids` always starts with `aziel-runtime`.

Sealed on: FragGate ledger rows of that call, session exec receipts (`context_hash`, `context_n`, `node_ids`), refusal / follow stamps. Returned as additive `context` on the result.

Honest limit: the hash proves which references the agent **declared** it read, bound to the act. The runtime does not fetch or attest the referenced content. FragGate strips these keys from engine payloads.

Law fit: additive optional fields; old receipts unchanged; no new tool.
