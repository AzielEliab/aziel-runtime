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

## Session chain (RIB-018 gap closed)

#247 sealed MCP-door refusals on the internal ChainLock `refusals` chain. Pre-exec policy refusals on
`/v1/session/{id}/exec` (`slug_not_allowed`, `op_not_allowed`, `payload_too_large`, `max_ops`,
`unknown_slug`, `bad_exec`, `SCHEMA-DRIFT`) left no session receipt. Now each one appends exactly one
`event: "refused"` receipt to the session chain before the error returns:
`outcome: "failed"`, `payload.refusal { code, status, slug, op, payload_digest, payload_bytes, executed:false }`.
It links by prev_hash and passes verifyChain / verifyChainStrict. The error body carries
`refused_receipt { sealed:true, seq, hash }`. No exec receipt is written, and `max_ops` refusals do not
consume an exec.

Closed or expired sessions and receipt-cap refusals stay as they were. They cannot seal, and the error says
so with `refused_receipt { sealed:false, reason }`. Malformed JSON and operator-token-in-body refusals
are rejected before the session is touched and are not sealed (no secret material reaches a receipt).
Receipts are hash-linked and sealed, not signed.

## Addendum (2026-10-19): the remaining doors, AZ-OS and azinterface

Not a new RIB and not a new spec: the same AZRT-REFUSAL-RECEIPT-1.0 receipt, written by the same
`sealRefusal` path onto the same internal `refusals` chain. Code: `src/refusal-doors.js`. Tests:
`scripts/verify-refusal-doors.mjs`. Review baseline: `/tmp/diagrepos/logs/refusals-baseline.md` (b6771ed).

Laws cited: docs/2.0/REFUSAL-CONTRACT.md (refuse codes and envelopes untouched; additive fields only),
docs/2.0/RECEIPT-SCHEMA.md (receipt fields additive), docs/2.0/COMPATIBILITY-POLICY.md and
BREAKING-CHANGE-POLICY.md (no removals, rc1 frozen, tools/list 36, Softwares 42), AZRT-DUAL-LATTICE-1.0
(src/dual-lattice.js: both lattice hashes on every row; offline secondary = H(primary document hash +
username)), AZRT-AZOS-TETHER-1.0 / TETHER-REFUSALS-1.0 (the refusals chain is already sent to AZ-OS),
FragGate stays the single exec door (nothing here executes anything).

**(a) Both lattice hashes.** Confirmed already present: every `refusals` row is a ChainLock stamp with
`lattice {document_hash, primary, secondary}` and `refusal_receipt.lattice {primary, secondary}`.
The verify script recomputes the primary and online secondary of every stored row and checks the
offline rule. Additive on the receipt view: `kind: "refusal"` and `code`.

**(b) Doors sealed here.** Any response with status >= 400 whose JSON body has a stable `code` (or the
MESH-ONBOARD `install.sh` text refusal) on these REST doors: `/v1/fraggate*` (REST forms not already
sealed inside), `/v1/mesh*` (mesh and onboarding/install), `/v1/tether*`, `/v1/memory*`
(lattice-learn and other memory ops over REST), `/v1/qns*`, `/v1/interface`, `/v1/pull/*`, `/p/*`.
A body that already carries `refusal_receipt` or `refused_receipt` (MCP door, POST
/v1/fraggate/call, session exec) is left alone, so nothing is sealed twice. The stamp's `refusal`
object gains additive `kind, surface, door, reason (<=160 chars, our own message), status, route
(template)`. The body keeps every field and gains `refusal_receipt`; every refusal (JSON or text)
gains the header `X-Azrt-Refusal-Receipt`.

**(c) AZ-OS and azinterface.** Each worker reports its own non-auth refusals over its
`AZIEL_RUNTIME` service binding to `POST https://peer.aziel.internal/v1/refusals/peer`
(surface `azos` or `azinterface`). That hostname is not routable to this Worker from the public
internet, and a request carrying `CF-Connecting-IP` is refused `REFUSAL-PEER-NOT-BOUND`, so only a
bound Worker can write. The row lands on the same `refusals` chain, so there is one lattice; AZ-OS
gets it back through the existing signed tether (TETHER-REFUSALS-1.0, every 2 minutes) and
azinterface reads the tip through `/v1/runtime/sync`. Tips agree after the next tether tick.

**Finding receipts.** `GET /v1/receipts/refusals` (newest first, `?limit<=50`) and
`GET /v1/receipts/refusals?seq=N`; `GET /v1/receipts` gains `refusal_receipts`. Verify the chain with
`chainlock_verify {"c":"refusals"}` (an internal chain is now verifiable when named; the default
roster walk is unchanged) and each row with `/v1/anchor/row?c=refusals&seq=N` (new rows show
ANCHOR-MISSING until the next witness run).

**Flood guard.** (1) sealRefusal's idempotency key covers code + door (or peer surface) + method +
status + minute, with no caller identity and no route (routes are caller-shaped; the first route in
that minute is the one recorded), so one refusal shape writes at most one row per minute and the
worst case is bounded by the finite set of codes x doors;
(2) an in-isolate memo answers repeats in that minute with no Durable Object call; (3) an in-isolate
cap of 60 new seals per minute (over it: `status: "rate_limited"`, sealed:false, the refusal still
stands); (4) the recorded route is a template (ids collapsed, at most 4 segments).

**Fail closed.** The refusal status, code and body never change. No store: `status: "unavailable"`.
Write slower than 2.5 s: `status: "receipt_pending"` (the write continues in the background; look it
up in `/v1/receipts/refusals`). Neither carries a hash. Not signed (no receipt signing key is set);
hash-linked and sealed, as the rest of this note says.

**(d) Not recorded, by design (user decision pending).** Auth-gate refusals: any 401, the codes
`token_required`, `token_mismatch`, `token_not_configured`, `TOKEN-QUERY-REFUSED`, `CL-NOT-ISSUER`
(and any code containing "token"), plus 429 rate limits. About 13 emit sites in 6 modules
(production.js, session-http.js, session-do.js, issuer-append.js, redline.js, workspace.js) behind
6 gate call sites. Flood risk if they were recorded: anyone can trigger them without credentials at
the per-door rate limit; with the same minute dedupe the worst case is about codes x gated route
templates rows per minute (roughly 5 x 10 = 50/min, ~72k rows/day), against today's few dozen rows.
