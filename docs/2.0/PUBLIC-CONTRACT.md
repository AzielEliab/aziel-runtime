# Public contract — Aziel Runtime 2.0.0-rc1

**Frozen at:** runtime `2.0.0-rc1` on 1.9.3 heritage  
**Author / identity:** **Aziel Eliab** only  
**Kernel:** [AzielEliab/fraggate](https://github.com/AzielEliab/fraggate) `FG-0.1`

This document freezes the **live** public surface. Field names, paths, and codes are taken from this repository. Do not invent extra doors, flat `{slug}_{op}` MCP tools, or a second FragGate.

Crawler lead copy stays the canonical abstract in `src/seo.js` (`RUNTIME_ABSTRACT` / `RUNTIME_ONE_LINE`). Version notes stay **below** that abstract.

---

## 1. FragGate flow (mandatory)

Agents use **one door — discover, route, refuse**:

1. `fraggate_list` **or** `GET /v1/software` (hub Softwares tab: Plain → Gate → Lock)
2. `fraggate_describe` one `name` or `slug`
3. `fraggate_call` with `{ slug|name, op, payload? }`

HTTP equivalents:

| Step | MCP | HTTP |
|------|-----|------|
| List | `fraggate_list` | `GET /v1/fraggate/list` |
| Describe | `fraggate_describe` | `GET /v1/fraggate/describe?name=` / `?slug=` |
| Verify | `fraggate_verify` | `POST /v1/fraggate/verify` |
| Call | `fraggate_call` | `POST /v1/fraggate/call` |

`GET /v1/fraggate` returns the hashed registry summary plus `pipeline` / `pipeline_strip`.  
`GET /v1/fraggate/software` mirrors `GET /v1/software`.

Locked MASTER-33 hop order (cite: `GET /v1/azpipe/arch`, same payload as FragGate `pipeline`):

> Human → AZInterface → PUBLIC/UI/AGENT/API → FragGate → Lamb Lens → SweepGate → Sentinel → Provenance/Input Packet → ChainLock-IN → DecisionGATE → AZPIPE → Internal Domain Layer → optional ASE → RoseClock → TemporalLock → ChainLock-OUT → ForgeReceipts → Return

FragGate is THE single public executable door. Lamb Lens is fabric ethics **after** FragGate, not a second door. LambGate is not a hop. Domains are isolation labels (`domains_are_doors: false`).

`POST /p/{slug}/{op}` is a **proxy** and is **not** exec (`proxy_is_not_exec: true`). A proxy 200 is not a FragGate receipt.

---

## 2. MCP tool names (frozen)

Source of truth: `PUBLIC_MCP_TOOLS` in `src/fraggate/codes.js`. Live `POST /mcp` `tools/list` must equal this list. Cap: `PUBLIC_MCP_TOOL_MAX = 40`. Count at freeze: **36**.

### Door (`PUBLIC_DOOR_TOOLS`)

| Name | Inputs |
|------|--------|
| `runtime_skill` | (none) |
| `fraggate_list` | (none) |
| `fraggate_describe` | `name?`, `slug?` |
| `fraggate_verify` | `name?`, `slug?`, `digest?` |
| `fraggate_call` | **`op` required**; `name?`, `slug?`, `payload?`, `claim?` |
| `decisiongate_check` | `statement?`, `evidence?[]`, `impact_pos?[]`, `impact_neg?[]`, `values?[]`, `accountable?` |
| `library_lookup` | `q?`, `op?` (`search` \| `example` \| `skill` \| `health`) |

### Fabric (`PUBLIC_FABRIC_TOOLS`)

- Mesh: `mesh_status`, `mesh_enable` (**`bearer` required**), `mesh_disable`, `mesh_join` (**`product` required**), `mesh_heartbeat` (**`node_id` required**), `mesh_leave` (**`node_id` required**), `mesh_nodes`, `mesh_broadcast` (**`sha256` required**)
- ChainLock: `chainlock_append` (**`fact` required**), `chainlock_tip`, `chainlock_recall`, `chainlock_verify`, `chainlock_seal`
- AKM: `memory_observe` (**`fact` required**), `memory_resolve`, `memory_calibrate`, `memory_recall`, `memory_get`

### Helper (`PUBLIC_HELPER_TOOLS`) — advanced / internal

`runtime_software`, `runtime_bundle`, `runtime_pull` (**`slug` required**), `runtime_run` (**`slug` + `op` required**), `runtime_manifest`

### Session (`PUBLIC_SESSION_TOOLS`) — advanced / internal

`runtime_session_open`, `runtime_session_policy` (**`session_id`**), `runtime_session_exec` (**`session_id`, `slug`, `op`**), `runtime_session_receipt` (**`session_id`**), `runtime_session_receipts` (**`session_id`**), `runtime_session_close` (**`session_id`**)

Unknown MCP names refuse `FG-HALLUC-TOOL`. Flat `{slug}_{op}` names are **not** listed. `exist.mcp` on a refuse envelope is a hint, not an exec allowlist (`existMcpHint()`).

Tool **names** are the contract (`PUBLIC_MCP_TOOLS`). `tools/list` **descriptions** follow the Glama TDQS 5.0 template (purpose / when / when-not / alternative / side-effects / returns / refusals). Parameter text, truthful MCP annotations (`readOnlyHint` / `destructiveHint` / `idempotentHint` / `openWorldHint`), and `outputSchema` may be enriched the same way without renaming tools or changing exec. That is metadata only — **names and routing stay frozen**. `fraggate_call` is **not** globally `readOnlyHint` or `idempotentHint` (side effects are operation-dependent). See `docs/GLAMA-TDQS.md`.

### MCP initialize

- Transport: `POST /mcp` (HTTP JSON-RPC) or stdio (`cli/mcp-stdio.mjs`)
- `protocolVersion`: `"2025-03-26"`
- `serverInfo`: `{ name: "aziel-runtime", version: RUNTIME_VERSION }`
- `capabilities.tools.listChanged`: `false`
- `instructions`: `mcpInitializeInstructions()` — pipeline list → describe → call; identity Aziel Eliab only

Always send `User-Agent: Mozilla/5.0` on HTTP.

---

## 3. OpenAPI parity

`GET /openapi.json` (`openapi: "3.1.0"`) has `info.title = "Aziel Runtime"`, `info.version = RUNTIME_VERSION`, `info.summary = RUNTIME_ONE_LINE`, and `info.description` **starting with** `RUNTIME_ABSTRACT` (changelog below).

Documented agent path: `POST /v1/fraggate/call`. Catalog `/p/{slug}/{op}` paths are documented as **proxy only**.

Other public HTTP surfaces that stay in the contract:

| Method | Path | Role |
|--------|------|------|
| GET | `/v1/health` | Authority snapshot + honesty |
| GET | `/v1/ready` | Same snapshot + SESSION / token gate |
| GET | `/v1/runtime.json` (`/v1/runtime`) | Machine manifest |
| GET | `/v1/software` | Hub catalog |
| GET | `/v1/update/check`, `/v1/update/manifest` | Client update |
| POST | `/v1/session/open` | Session open |
| POST | `/v1/session/{id}/policy\|exec\|close` | Session mutate |
| GET | `/v1/session/{id}/receipt\|receipts` | Receipts |
| GET | `/v1/mesh`, `/v1/mesh/status`, `/v1/mesh/nodes` | QNM rollup (**GET never enables**) |
| POST | `/v1/mesh/enable\|disable\|join\|heartbeat\|leave\|broadcast` | Mesh mutate (bearer / radios) |
| GET | `/v1/qns` | QNS cite only |
| GET | `/v1/azpipe/arch` | MASTER-33 cite/read |
| POST | `/v1/memory/observe\|resolve\|calibrate\|recall` | AKM (behind FragGate) |
| GET | `/v1/memory/{id}` | AKM read |
| GET | `/v1/uses`, `/v1/stats` | Use counters (no PII) |
| POST | `/mcp` | MCP JSON-RPC |

`/v1/rollback` stays **404**.

---

## 4. Health / version

`RUNTIME_VERSION` lives in `src/runtime-api.js` and `package.json`. Authority JSON (`GET /v1/health`, `GET /v1/ready`, `GET /v1/runtime.json`) share `authoritySnapshot()`:

| Field | Freeze |
|-------|--------|
| `product` | `aziel-runtime` |
| `name` / `title` | `Aziel Runtime` |
| `author` / `identity` | `Aziel Eliab` |
| `version` | `2.0.0-rc1` |
| `role` | `engine-runtime` |
| `layer` | `catalog+pull+proxy+session+in-process-engines+fraggate` |
| `door` | `fraggate` |
| `proxy_is_not_exec` | `true` |
| `isolate_is_the_jail` | `true` |
| `receipt_cap` | `64` |
| `session_ttl_ms` | `21600000` (6h) |
| `rate_open_per_minute` | `20` |
| `rate_exec_per_minute` | `60` |
| `token` | `optional-on-session-mutate` |
| `true_engine_slugs` / `engine_slugs` | catalog true-engine slugs |
| `proxy_fallback_ops` | per-op only (see §6) |

Headers on authority responses:

- `X-Aziel-Runtime-Version` = `RUNTIME_VERSION`
- `X-Aziel-Runtime-Role` = `engine-runtime`
- `Cache-Control` / `CDN-Cache-Control` = `no-store`

`GET /v1/ready` additionally reports `ready`, `session_binding`, `require_token`, `token_configured`, `mutate_requires_token`, `fraggate_call_public` (**always `true`** — public FragGate call is never token-gated).

Historical notes live only in `version_history`. Never read a superseded row as the current version.

---

## 5. `engine_digest` / `registry_digest`

**Per-slug `engine_digest`:** SHA-256 hex of concatenated `path + "\n" + bytes + "\n"` for that slug’s `ENGINE_ARTIFACTS` (`src/engines/digest.js`). Regenerated by `scripts/hash-engines.mjs`. Embedded map: `ENGINE_DIGESTS`.

Appears as:

- Registry entry `digest` (`fraggate_list` / `fraggate_describe`)
- `/v1/software` card field `engine_digest`
- FragGate accept `engine.engine_digest`
- Session exec receipt `payload.result.engine_digest` when `mode === "local"`

**`registry_digest`:** SHA-256 of canonicalized `{ name, slug, digest, status, ops, stub_ops }` for every registry entry. On `GET /v1/fraggate`, `fraggate_list`, `fraggate_verify`, and `GET /v1/runtime.json`.

`fraggate_verify` with only `digest` checks the **registry** digest. With a name/slug it checks that entry’s engine digest.

---

## 6. Live / stub / local_only / proxy-fallback

`classifyCall(entry, op)` in `src/fraggate/registry.js` returns `kind`:

| `kind` | Meaning | FragGate code |
|--------|---------|---------------|
| `live` | slug in `LIVE_OPS` and op allowlisted (including UI aliases) | `FG-OK` on accept |
| `stub` | product-level stub **or** op in `STUB_OPS[slug]` | `FG-STUB` |
| `unknown_op` | live slug, op not allowlisted | `FG-UNKNOWN-OP` |
| `halluc` | name not in registry | `FG-HALLUC-TOOL` |
| `local_only` | named entry, not live | `FG-LOCAL-ONLY` |

At freeze `NAMED_STUBS = []`. VeilLock is `local_only`. EmbryoLock is `live` with a local destructive boundary (wipe/scorch/unlock stay `FG-STUB`).

**Per-op `proxy_fallback`** (slug stays a true engine) — `PROXY_OPS` in `src/engines/registry.js`:

```js
{ "aziel-corpus": ["transcribe", "ocr"] }
```

`honestyFields().named_fallback_inventory.refused`:

`["exec", "shell", "blend", "chat", "smtp_send", "deanonymize", "unknown-tool"]`

Binding-only / unsupported isolate ops may still return `FG-LOCAL-ONLY` with message that proxy is not exec.

---

## 7. What this freeze does **not** change

- Remain-OFF inventory (33 items) stays OFF / REFUSE / GATED.
- No new Softwares engines.
- No Glama `glama.json` semantic change (maintainers + listing metadata already enriched).
- No MCP protocol version change.
- No flattening of `tools/list`.
- No public SMTP, remote shell, VPN hop, deanonymize, Tor/phoenix, or unknown-tool fallback.
