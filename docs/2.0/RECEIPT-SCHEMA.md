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
| `prev_hash` | 64 hex | previous receipt hash, or `ZERO_HASH` |
| `hash` | 64 hex | SHA-256 of canonical unsigned body |

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
| `hash` | SHA-256 of `canonicalBytes(...)` |
| `kind` | default `incident` |
| `child_impact` | context string |
| `note` | original note |
| `context` | object |

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
