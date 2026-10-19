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
Lattice and other op refusals that come back inside an accepted FragGate envelope (envelope `FG-OK`,
`result.ok:false` with a stable code and `fail_closed:true` or `written:false`, e.g. memory
`lattice-learn` `LATTICE-LEARN-BAD-CHAIN`) are sealed by the same door guard (`innerOpRefusal` in
src/receipt-guard.js; stamp `refusal.door: "op"`), on MCP and on POST /v1/fraggate/call.
A body that already carries `refusal_receipt` or `refused_receipt` (MCP door, POST
/v1/fraggate/call, session exec) is left alone, so nothing is sealed twice. The stamp's `refusal`
object gains additive `kind, surface, door, reason, status, route
(template)` (since the follow-up below, `reason` is always null on stored rows and `reason_sha256` carries the hash). The body keeps every field and gains `refusal_receipt`; every refusal (JSON or text)
gains the header `X-Azrt-Refusal-Receipt`.

**(c) AZ-OS and azinterface.** Neither keeps its own refusal chain. Each reports its coded non-auth
refusals over its `AZIEL_RUNTIME` service binding to `POST https://peer.aziel.internal/v1/refusals/peer`
(surface `azos` or `azinterface`), and the runtime seals them on its single `refusals` chain. That
hostname is not routable to this Worker from the public internet, and a request carrying
`CF-Connecting-IP` is refused `REFUSAL-PEER-NOT-BOUND`, so only a bound Worker can write.
AZ-OS holds a verified copy of the chain tip from the existing signed tether (TETHER-REFUSALS-1.0, every
2 minutes) and compares it with the runtime tip at `/v1/refusals` (`tip_state: agree | lagging`).
azinterface has no local copy: it reads the runtime's tip over the binding (`tip_state: no-local-copy`).
So the accurate claim is one shared chain, with AZ-OS holding a tethered copy that agrees.

**Finding receipts.** `GET /v1/receipts/refusals` (newest first, `?limit<=50`) and
`GET /v1/receipts/refusals?seq=N`; `GET /v1/receipts` gains `refusal_receipts`. Verify the chain with
`chainlock_verify {"c":"refusals"}` (an internal chain is now verifiable when named; the default
roster walk is unchanged) and each row with `/v1/anchor/row?c=refusals&seq=N` (new rows show
ANCHOR-MISSING until the next witness run).

**Flood guard.** Rows per minute are bounded by the number of distinct dedupe keys, and anyone can
trigger refusals without auth. (1) REST/peer doors: sealRefusal's idempotency key is code + door (or peer
surface) + method + status + minute, with no caller identity and no route, and it is shared across
isolates. The bound is **codes x doors x methods (x status) rows per minute**, every minute, for as long
as someone keeps sending; there is no retention, so the chain keeps growing at that rate (the edge only
passes standard methods, so methods multiply the bound by about 5-7). (2) MCP door and POST
/v1/fraggate/call: the key is code + tool + registry slug/op (or "other") + goal + the prior refusal +
minute; the args digest is no longer in it. The goal stays because RIB-018 goal links need one row per
goal, so the hard bound there is the cap. (3) Caps per isolate per minute: 30 per REST door and 30 per peer
surface (separate counters, so one door or one peer cannot crowd out another), and 60 for the MCP door.
Over a cap the receipt says `rate_limited`, sealed:false, and the refusal still stands. Caps limit the
Durable Object writes an isolate makes; adding isolates does not add rows past the key bound in (1), but
can add rows in (2) up to 60 per isolate per minute. (4) An in-isolate memo answers repeats in the
minute with no Durable Object call.

**Fail closed.** The refusal status, code and body never change. No store: `status: "unavailable"`.
The seal waits at most 2.5 s and never past the request deadline (what is left of it, minus 50 ms);
past either, `status: "receipt_pending"` and the write continues in the background (look it up in
`/v1/receipts/refusals`). Neither carries a hash. Not signed (no receipt signing key is set);
hash-linked and sealed, as the rest of this note says.

**(d) Not recorded, by design (user decision pending).** Auth-gate refusals: any 401, the codes
`token_required`, `token_mismatch`, `token_not_configured`, `TOKEN-QUERY-REFUSED`, `CL-NOT-ISSUER`
(and any code containing "token"), plus 429 rate limits. About 13 emit sites in 6 modules
(production.js, session-http.js, session-do.js, issuer-append.js, redline.js, workspace.js) behind
6 gate call sites. Flood risk if they were recorded: anyone can trigger them without credentials at
the per-door rate limit; with the same minute dedupe the worst case is about codes x gated route
templates rows per minute (roughly 5 x 10 = 50/min, ~72k rows/day), against today's few dozen rows.

### Follow-up (2026-10-19, after AZBot's post-merge review)

- **No caller text on the chain.** `route` is only ever a fixed template from code (`KNOWN_ROUTES`, or
  `/v1/pull/{slug}`, `/p/{product}/{op}`, ...); any other path is stored as its door wildcard (e.g.
  `/v1/mesh/*`) plus `route_sha256` (16 hex). On the MCP door, a slug that is not in the FragGate
  registry (or an op that is not one of its ops) is stored as null + `slug_sha256`/`op_sha256`.
- **No reason text on any refusal row (AZBot pre-merge review).** A server message can repeat caller input
  from the path, the query or the request body (e.g. `POST /v1/fraggate/verify {"name": ...}`), and a cut
  message hides the repeat from any substring check. So REST-door, peer (AZ-OS / azinterface) and MCP
  op-refusal rows store `reason: null` plus `reason_sha256` = sha256 hex of the full, uncut server reason.
  The runtime applies this to peer reports whatever the peer sends: reason text is hashed here; a peer may
  send only a well-formed hash (16 or 64 hex) instead. The refusal response itself is unchanged.
- **Goal id hashed.** `goal_key` is `goal:` + sha256(goal_id) hex[:16], never the id as typed. The same
  `goal_id` always derives the same key, so goal links, `follows` and retry hints still resolve.
  Caller `node_ids` on refusal-chain stamps are stored as `n:<sha256[:16]>` (the runtime's own
  `aziel-runtime` stays literal). Follow stamps bound slug/op to the registry like refusals.
- **Session refused receipts.** A slug that is not a registry name, or an op that is not one of its ops,
  is stored as null + `slug_sha256`/`op_sha256` on the session chain too.
- Existing rows are not rewritten; they still verify. Goal pointers written before this change used the
  old key, so a goal_id refused just before deploy will not link across it (one-hour window).
- **Uncoded refusals.** A 4xx JSON refusal on a sealed door without `code`/`refuse` (ok:false or an
  `error` string), e.g. `/v1/pull/{unknown}` 404, is sealed with the fixed code `HTTP-<status>-UNCODED`.
  The body is unchanged (no code is added to it). Uncoded 5xx are not refusals and are not sealed.
- **Upstream errors.** `/p/*` 5xx are upstream errors, not refusals: logged as `upstream_error` and
  marked `X-Azrt-Upstream-Error: <status>`; no row.
- **OpenAPI (additive).** `/openapi.json` documents `GET /v1/receipts/refusals`,
  `#/components/schemas/RefusalReceipt` (the `refusal_receipt` field) and
  `#/components/headers/X-Azrt-Refusal-Receipt`.


### Follow-up 2 (2026-10-19): one global cap in the writer, split per class

The per-door caps above (30/min) and the MCP cap live in each isolate, so many isolates could each spend
their own cap. The ChainLock writer Durable Object is the only writer for the `refusals` chain, so it keeps
the one true global bound: at most **600 new refusal rows per minute**, split into per-class shares so one
class can't starve another (AZBot review of #302):

| class | who | share / min |
|---|---|---|
| `rest` | runtime REST/HTTP doors (`surface: "runtime"`) | 240 |
| `mcp` | FragGate envelope share: the MCP door plus `POST /v1/fraggate/call` (rows with no `surface`) | 240 |
| `peer` | AZ-OS + azinterface reports (`surface: "azos"` / `"azinterface"`) | 120 |

So ~10 isolates spending FragGate-envelope goal-id variants can fill at most the FragGate envelope share;
REST and peer refusals still seal.

**Goal-variant sub-cap.** Rows that differ only by `goal_key` (or by the prior refusal they follow) share
one shape, built from the same bounded names the dedupe key uses: code + tool (MCP-checked against the listed tools; "fraggate_call", "http", or the peer surface) + (slug || "other") +
(op || "other") + door + route template + status. Caller-shaped hashes (`slug_sha256`, `op_sha256`,
`route_sha256`) are left out of the shape, so varying a junk op or path together with the goal_id can't
mint a fresh shape (AZBot recheck of #302).
At most **30 new rows per minute per shape**, across all goal variants. A different code or door still writes.

**Over a cap** the writer answers `refuse: "refusal-cap"`, `code: "REFUSAL-GLOBAL-CAP"`, `cap_class`,
`written: false`; nothing is written. `sealRefusal` returns `status: "rate_limited"`, `sealed: false`, and
the REST and peer doors keep that status (they used to overwrite it with `unavailable`); the header reads
`rate_limited; sealed=false`. The refusal itself still stands (fail closed).

**Counted only on success.** The writer checks the caps before the write and counts the row only after
the row and meta are stored, so a failed write (lattice refusal, card cap, storage error) spends no slot.
The in-isolate door and MCP counters are given back only on a real write failure. A cap answer
(`rate_limited`) keeps its isolate slot, so the isolate caps fill and stop sending round trips to the
writer. A seal still in flight at the request deadline (`receipt_pending`) keeps its slot too.

**Class full memo.** When the writer says a share is spent (`cap_limit: "class"`) or the 600 total is
(`cap_limit: "total"`, which marks all three classes), the isolate remembers that class as full until the
end of that minute (`cap_minute`). Refusals of a full class answer `rate_limited` (`memo: true`) at once,
without calling the writer DO. A goal-variant cap answer (`cap_limit: "variant"`) does not mark the class.

**Replays** (same idempotency key) are never capped and never write a row.

Worst case under a sustained flood: 600 rows/min (~864,000 rows/day), at most 120/min from peers.
Not capped here: `k: "follow"` rows (one per prior refusal + goal, bounded by the refusals they follow).
Additive only: no row changed, no field removed; `cap_class`, `cap_limit` and `cap_minute` are new fields
on the writer's refusal answer.
Law: AZRT-REFUSAL-RECEIPT-1.0 (this doc), AZRT-GOAL-LINK-1.0, FragGate single door, append-only history.
Test: `scripts/verify-refusal-doors.mjs` group 19 (shares, no starvation, exactly 600, replays, goal-variant
sub-cap including junk op + goal both varying, failed write spends nothing, REST and peer doors answer
`rate_limited` while the refusal stands, class-full memo makes no writer calls, cap answers not refunded,
real failures refunded).
