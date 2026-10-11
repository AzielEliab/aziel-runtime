# AZRT-REFUSAL-RECEIPT-1.0 — policy refusals get their own sealed receipts

Author: Aziel Eliab only. Status: LIVE (additive). Source: RIB-018 (@mikesaleme). Code: `src/receipt-guard.js`. Tests: `scripts/verify-receipt-guard.mjs`.

Every refused `tools/call` (and `POST /v1/fraggate/call`) — `MCP-CONFIRM-REQUIRED`, any `FG-*` refuse, `MESH-*`, `SCHEMA-DRIFT`, any other stable refuse code — seals one stamp on the runtime-internal ChainLock chain `refusals`:

- `k: "refusal"`, subject = code, fact = `<tool> <slug> <op> refused <code>. Nothing ran.`
- `refusal: {spec, code, tool, slug, op, args_digest}` (sha256 of canonical args minus confirm/dry_run; no raw args, no PII)
- optional `goal_key`, `follows`, `context_hash`, `node_ids`, `schema_hash`, and the AZRT-ANCHOR-1.0 `anchor`
- dual lattice (AZRT-DUAL-LATTICE-1.0) like every ChainLock stamp; CHAINLOCK Durable Object writer, commit before ack.

The refuse envelope is unchanged (same `ok`, `code`, `door`, message) plus an additive `refusal_receipt {spec, sealed, chain, seq, h, lattice, goal_key, follows, verify}`. The same refusal (code, tool, args digest, goal) inside one minute replays the same receipt (idempotency key) so a refusal loop cannot flood the chain.

`refusals` is **not** on the public ChainLock `ROSTER`, so `chainlock_append` cannot forge a refusal (it refuses `unknown-chain`). Only the door writes it (`append(..., {internal: true})`). It is in the AZRT-ANCHOR-1.0 heads feed, so refusals are witnessed outside the runtime like every other chain.

Fail-soft on the write only: if the store is unbound or the write fails, the envelope says `refusal_receipt.sealed: false` with a reason. A refusal never turns into success, and no receipt is invented.

Law fit: FragGate stays the door; no new tool; refuse codes untouched (REFUSAL-CONTRACT §5 adds `SCHEMA-DRIFT`, `EXPECT-*`); additive envelope field; append-only; dual lattice intact.
