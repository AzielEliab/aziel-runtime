# Receipt schema — Aziel Runtime 2.0.0-rc1

**Author / identity:** **Aziel Eliab** only  
**Sources:** `src/session-core.js`, `src/fraggate/door.js`, `src/fraggate/ledger.js`, `src/engines/forgereceipts/engine.js`, `src/azpipe.js`, `src/chainlock/ops.js`

This is the **live** receipt contract. Callers verify hashes; they do not treat a receipt as an exec ticket (replay still goes through FragGate).

---

## 1. Session receipt (`aziel-runtime.receipt`)

Kind: `RECEIPT_KIND = "aziel-runtime.receipt"`  
Id: `sess_` + 32 hex (`SESSION_ID_RE`)  
Cap: `RECEIPT_CAP = 64`  
Genesis prev: `ZERO_HASH` = 64 zero hex chars

### Signed fields (`signReceipt`)

Hash is SHA-256 of `canonicalize(unsigned)` where `unsigned` is the receipt **without** `hash`. Canonicalization is sorted-key JSON (`canonicalize()` in `session-core.js`).

| Field | Type | Notes |
|-------|------|-------|
| `kind` | string | always `aziel-runtime.receipt` |
| `version` | string | session `runtime_version` (`RUNTIME_VERSION`) |
| `session_id` | string | `sess_` + 32 hex |
| `seq` | integer | 1-based, contiguous |
| `event` | string | `open` \| `policy` \| `exec` \| `close` |
| `ts` | string | ISO-8601 |
| `author` | string | `Aziel Eliab` |
| `identity` | string | `Aziel Eliab` |
| `runtime` | string | `aziel-runtime` |
| `owner` | string | `aziel-runtime` |
| `owner_note` | string | owned by this session process |
| `payload` | object | event-specific |
| `prev_hash` | 64 hex | previous receipt hash in this session chain, or `ZERO_HASH` |
| `request_id` | string | logical action. Same value across retries. New receipts only |
| `attempt_n` | integer | 1-based attempt of that `request_id` |
| `parent_receipt_id` | string or null | prior attempt's receipt `hash`. Null on the first attempt. Not `prev_hash` and not FragGate ledger `prev` |
| `correlation_id` | string or null | optional client correlation. Sealed on the receipt (null when omitted) |
| `outcome` | string | `retry`, `failed`, or `completed`. `completed` is the attempt that finished the action |
| `hash` | 64 hex | SHA-256 of canonical unsigned body, including the attempt fields on new receipts |

### Exec `payload.result`

| Field | Notes |
|-------|-------|
| `status` | HTTP-like status from the engine run |
| `latency_ms` | number |
| `request_digest` | SHA-256 of request bytes |
| `response_digest` | SHA-256 of response bytes |
| `response_bytes` | number |
| `content_type` | string or null |
| `error` | string or null |
| `upstream` | null when local true-engine |
| `mode` | `local` \| `proxy_fallback` |
| `true_engine_runtime` | boolean |
| `engine_digest` | hex when `mode === "local"` and digest present; else null |
| `engine_slug` | catalog slug |
| `engine_op` | op |
| `ran_in` | `"aziel-runtime"` when local |

### Chain verify

`verifyChain` / `verifyChainStrict` error tokens:

- `bad_kind`
- `prev_hash_mismatch`
- `seq_mismatch`
- `hash_mismatch` (strict recomputes SHA-256)

A prior receipt is **not** a skip ticket. Passing a receipt into `fraggate_call` still runs FragGate.

Offline re-check (no Worker):

```bash
node scripts/verify-receipt-fixture.mjs
```

Fixture: [`fixtures/session-receipt-chain.json`](../../fixtures/session-receipt-chain.json). Same algorithm as `signReceipt`.

---

## 2. FragGate result envelope

### Accept (`door.js` `accept`)

| Field | Value |
|-------|-------|
| `ok` | `true` |
| `code` | `FG-OK` |
| `door` | `fraggate` |
| `kernel` | `https://github.com/AzielEliab/fraggate` |
| `name` | registry display name |
| `slug` | catalog slug |
| `op` | requested op |
| `result` | engine JSON |
| `gate` | `{ final_state, blocked_at, lineage[] }` or null |
| `ledger_tip` | ask/refuse tip |
| `engine` | `{ engine_digest, ran_in, true_engine_runtime, mode, status }` |

### Refuse (`door.js` `refuse`)

| Field | Value |
|-------|-------|
| `ok` | `false` |
| `code` | see [REFUSAL-CONTRACT.md](REFUSAL-CONTRACT.md) |
| `door` | `fraggate` |
| `kernel` | FragGate GitHub URL |
| `name` / `slug` / `op` | as resolved |
| `message` | human refuse text |
| `result` | `null` |
| `gate` | DecisionGATE view when blocked there |
| `ledger_tip` | tip with `asked: true`, `refused: true` |
| `exist` | `{ mcp, see, pointer, note, live_ops, allowlist }` |

### Pipe decorations (`decoratePipe`)

Present on accepted (and some refuse) envelopes:

`pipe`, `pipeline_strip`, `domain_doors`, `domain_layer`, `lamb_lens`, `sentinel`, `provenance`, `receipt` (ChainLock-OUT exit), `temporal`, `staticclock`, `roseclock`, `forgereceipts`, optional `entry` (ChainLock-IN).

UI op aliases may set `canonical_op` + `aliased: true`.

### Client transport refuse (not a FragGate receipt)

When the **stdio bridge**, session CLI, Docker/Glama image, or ToolBench HTTP client cannot reach the Worker (`ENOTFOUND` / `getaddrinfo` / timeout), the client returns this envelope. It is **not** `door.accept`, **not** a ledger tip, and **not** local validation of a remote call.

| Field | Value |
|-------|-------|
| `ok` | `false` |
| `remote` | `false` |
| `code` | `FG-DNS` (resolution) or `FG-NET` (other transport) |
| `kind` | `dns` \| `network-error` |
| `fraggate_receipt` | `false` |
| `local_validation` | `false` |
| `fabricated` | `false` |
| `door` | `null` |
| `result` | `null` |
| `ledger_tip` | `null` |

`--local` / `AZIEL_RUNTIME_MCP=local` is the only honest in-process path. A DNS miss must not switch to that path. Source: [`src/remote-transport.js`](../../src/remote-transport.js). How to verify a **real** `fraggate_call` hash: [`INSPECT.md`](INSPECT.md).

---

## 3. FragGate ledger tip

Kind: `LEDGER_KIND = "aziel-runtime.fraggate.ledger"`  
Cap: `LEDGER_CAP = 64`

`ledgerTipView`:

| Field | Notes |
|-------|-------|
| `kind` | `aziel-runtime.fraggate.ledger` |
| `seq` | integer |
| `tip` | current tip hash |
| `asked` | boolean |
| `refused` | boolean |
| `code` | FG / pipeline code |
| `name` | string or null |
| `op` | string or null |
| `prev` | previous tip |
| `hash` | current tip |

Append body also stores `gate` and `at` (ISO time). Hash is SHA-256 of `canonicalize(body)` without the `hash` field.

---

## 4. ForgeReceipts engine receipt

Minted by slug `forgereceipts` (and stamped on AZPIPE outbound as `forgereceipts`).

Receipt object:

| Field | Notes |
|-------|-------|
| `timestamp` | UTC |
| `summary` | string ≤ 500 |
| `evidence` | composed evidence string |
| `confidence` | float in `[0.0, 1.0]` |
| `prev_hash` | genesis prev on local mint |
| `hash` | SHA-256 of `canonicalBytes(...)`. New receipts include `request_id`, `attempt_n`, `parent_receipt_id`, `correlation_id`, and `outcome` in that canonical body. Same note with a different `attempt_n` is a different hash. Receipts sealed without integer `attempt_n` keep the older five-field hash (`timestamp`, `summary`, `evidence`, `confidence`, `prev_hash`) |
| `receipt_id` | this receipt's `hash`. `parent_receipt_id` of the next attempt points here |
| `request_id` | logical action. Same across retries |
| `attempt_n` | 1-based integer |
| `parent_receipt_id` | prior attempt's `hash`, or null on the first. Not FragGate ledger `prev` |
| `correlation_id` | optional client id. JSON null when omitted, and that null is inside the hash |
| `outcome` | `retry`, `failed`, or `completed` |
| `kind` | default `incident` |
| `child_impact` | context string |
| `note` | original note |
| `context` | object. Not a substitute for the hashed attempt fields |

Verify requires `timestamp`, `summary`, `evidence`, `hash`. Tamper → `match: false`. Local mint is `durable: false`, `stored: false`. Not a court filing.

AZPIPE outbound `forgereceipts` stamp includes `hash`, `rose_transition_hash`, `temporallock_hash`, `chainlock_out`.

---

## 5. ChainLock card (fabric stamp)

Inbound / outbound stamps (`chainlock/ops.js`) use card fields:

`id`, `c`, `k`, `t`, `h`, `fh`, `s`, `f`, `g`, optional `r`, `pipe`.

Refuse code `FG-CL` is a ChainLock-domain refuse, not a FragGate halluc.

---

## 6. Production limits (receipt-adjacent)

| Limit | Value | Source |
|-------|-------|--------|
| Receipt cap | 64 | `RECEIPT_CAP` |
| Session TTL | 6 hours | `SESSION_TTL_MS` |
| Opens / IP / min | 20 | `RATE_OPEN_PER_MIN` |
| Execs / IP / min | 60 | `RATE_EXEC_PER_MIN` |
| Default max payload | 65536 bytes | `DEFAULT_MAX_PAYLOAD_BYTES` |

Optional `RUNTIME_TOKEN` / `X-Aziel-Runtime-Token` gates **session mutate only** when `REQUIRE_TOKEN=1`. Public `fraggate_call` stays open.

---

## 7. ACT-RECEIPT-1.0 (public mesh copy)

Kind: fabric plugin (not a Softwares-tab product, not a FragGate slug).  
Origin: `https://www.azielcorpuslibrary.net/receipts`  
Append: `POST https://www.azielcorpuslibrary.net/v1/receipts/append`  
Header: `x-aziel-receipt` when `RECEIPT_APPEND_TOKEN` (or `LIBRARY_RECEIPT_TOKEN`) is set.  
Fail-open: missing token or corpus errors never break engines.

Four fields (hash includes `previous_hash`):

| Field | Notes |
|-------|-------|
| `hash` | SHA-256 of canonical `{ previous_hash, request, output, event }` |
| `request` | One sentence. No bodies, tokens, or PII. |
| `output` | One sentence. Status-class only. |
| `event` | `surface`, `path`, `method`, `status`, `tool`, `spec`, `runtime_version`. No user / IP / geo. |

Genesis `previous_hash` is `ZERO_HASH` (64 zero hex). Runtime `GET /v1/receipts` cites the public chain. `GET /v1/receipts/tip` and `GET /v1/receipts/proxy` proxy the corpus tip. Empty (ZERO_HASH / null) or dark tip is SLOT (`ACT-RECEIPT-TIP-EMPTY` / `ACT-RECEIPT-TIP-DARK`) — not success. Fail-open is append-skip only. ForgeReceipts is not this public tip.

MESH-VAULT lite may mint catalog / download / mesh events when the token is set. This is not a substitute for session receipts, the FragGate ledger, or ForgeReceipts. Software pull / download is a catalog event, not site resurrection. A pulled site (token revoked, Worker dropped, DNS killed) dies with the pull. Receipts do not restore godlock.uk. Phoenix is wait / re-seal only.

**NO-LIE / NO-REWRITE:** a mutated receipt fails its hash. There is no rewrite key. Fail-open skip is a missing append, not a fake receipt. Law: `docs/designs/NO-LIE-NO-REWRITE-1.0.md`. Does not replace the CROSS-NETWORK-SURVIVAL-1.0 machine tip.

---

## 8. ACT-RECEIPT-1.1 identity anchor (FED-MESH-1.0)

The four-field hash in section 7 stays `ACT-RECEIPT-1.0`. A federated receipt may add `identity_anchor` beside that hash. The anchor is not inside the four-field hash, so a 1.0 receipt with no anchor stays valid.

`identity_anchor` fields: `v` (`FED-MESH-1.0`), `handle` (`#` plus 11 Crockford characters), `public_key` (base64url raw Ed25519), `seq` (per-handle monotonic integer), `prev` (SHA-256 of the previous anchor statement, or 64 zero hex at genesis), `receipt_hash` (the section 7 hash), `sig` (Ed25519 over the anchor statement, signature excluded).

ChainLock keeps one chain per handle (`caller: fed-` + the lowercase handle body, chain `mesh`). TemporalLock timeslates that chain with a per-relay `click_index`. That order is local to the relay. It is not a worldwide total order.

Verification refuses a duplicate sequence, two anchors that claim the same `prev` with different statement hashes, a handle whose key did not sign, a sequence gap, and a mutated receipt. No user geo or personal info. The handle is pseudonymous. Law: `docs/designs/FED-MESH-1.0.md`.
