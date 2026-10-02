# Data and privacy (published behavior only)

**Author / identity:** **Aziel Eliab** only  
**OpenAPI:** `GET /openapi.json` on the Worker. This note says **what is stored**, what is **ephemeral**, and what **phones home**. It does not add collection.

Primary host: [Try on Glama](https://glama.ai/mcp/servers/AzielEliab/aziel-runtime). Execution origin: `https://aziel-runtime.vibelock.workers.dev/`.

## Not stored (request bodies / secrets)

- FragGate / MCP handlers do not persist Authorization headers, tokens, or raw request bodies in the API-use log.
- `GET /v1/uses` counters skip SEO files, health, mesh reads, and catalog GETs (`SKIP_CATALOG_GETS`, including `GET /v1/software`). Logged fields are path / host / day / op — **no PII**, no raw body. Prefix walks are budgeted (8s) so the route stays under the 25s deadline; incomplete maps set `uses_complete: false`. `GET /v1/mesh` peeks only `USES` `total` (`human_uses`) — it never walks `/v1/uses`. Live Nodes does not invent users from missing uses. Code: [`src/uses.js`](../src/uses.js), [`src/mesh.js`](../src/mesh.js).
- `by_op` detail is additive and does not add a second hit to `uses`. The generic key stays so older totals stay comparable:
  - `POST /mcp` still records `mcp`. A JSON-RPC `tools/call` also records `mcp.<toolName>` when the name is a safe token (letters, digits, hyphen, underscore; max 48; case kept). Examples: `mcp.Softwares`, `mcp.fraggate_call`, `mcp.runtime_software`. `tools/list` and other methods stay `mcp` only.
  - `POST /v1/fraggate/call` still records `fraggate.call`. A safe slug also records `fraggate.call.<slug>` (slug lowercased). MCP `fraggate_call` records the same slug key plus `mcp.fraggate_call`.
  - `GET /v1/fraggate/describe` still records `fraggate.describe`. `?slug=` or `?name=` also records `fraggate.describe.<slug>` when that token is safe. MCP `fraggate_describe` records the same slug key plus `mcp.fraggate_describe`.
  - The slug is the door's name, then slug, then product. `name/op` splits only when op is absent. An unsafe token is dropped and is not replaced by another field. The ring entry keeps `op` as the generic key and adds `ops` when a detail key was stored. `product` on that entry is the sanitized slug for that call or describe.
  - Softwares has no slug. `mcp.Softwares` is never expanded into a per-slug key, even if the arguments contain one. Glama telemetry stays `{ server, tool, client }` and does not invent a Softwares slug.
- Session mutate may require `RUNTIME_TOKEN` when set. The token is an operator secret (Wrangler), not a user account store.

## Ephemeral

| Surface | Lifetime | Where |
|---------|----------|--------|
| Session object + receipt chain | 6 hours or `close`; cap 64 receipts | Durable Object `SESSION` ([`src/session-do.js`](../src/session-do.js), [`src/production.js`](../src/production.js)) |
| FragGate DecisionGATE ledger tip | in-isolate ring; not a user dossier | [`src/fraggate/ledger.js`](../src/fraggate/ledger.js) |
| Mesh `{slug}-worker` suite-presence | 5-minute TTL, no user heartbeat | [`src/mesh.js`](../src/mesh.js) |
| Mesh human / site registration | Registered until leave or 14 days after the last beat. Miss 3 adaptive beats → stale, not deleted. Stale is not Live. | [`src/mesh-membership.js`](../src/mesh-membership.js) |
| AZBrowser tabs / AZMail mesh KV | product-scoped Worker KV when those ops run | bindings in `wrangler.toml` |

## Stored / counted (published)

| Surface | What | Phones home? |
|---------|------|----------------|
| `USES` KV | API use totals by host / path / day / op + 100-line ring. Additive `by_op` keys: `mcp.<tool>`, `fraggate.call.<slug>`, `fraggate.describe.<slug>` | Stays on this Worker. `GET /v1/uses` is read-only. |
| Product `/download` | Counted package downloads on **product** Workers | Not incremented by FragGate call or `/p/{slug}/{op}` proxy. |
| ACT-RECEIPT append | Four public fields (request, output, event, hashes) | Only when `RECEIPT_APPEND_TOKEN` is set; POST to corpus `/v1/receipts/append`. Fail-open skip if token missing or corpus dark. No user / IP / geo in the receipt. [`src/library-receipts.js`](../src/library-receipts.js) |
| Stdio MCP default | `cli/mcp-stdio.mjs` **bridges** to the production Worker `/mcp` unless `--local` / `AZIEL_RUNTIME_MCP=local` | That is the published default for Glama Install Server. Clean-room uses local. **Egress:** outbound DNS + HTTPS to `*.vibelock.workers.dev` / Cloudflare (`/mcp`, `/v1/fraggate/*`). DNS failure is `FG-DNS` (`remote:false`) — no FragGate receipt, no silent local validation. |

## What this runtime does not do

- No analytics SDK, no third-party pixel, no invented exfiltration path.
- `GET /v1/mesh` never enables radios.
- Remain-OFF items stay refused.

Install / update: product Workers may publish `/install.sh` and counted `/download`. This repo has **no** pipe-to-bash installer. Download, inspect, then run — [`docs/2.0/INSPECT.md`](2.0/INSPECT.md), [`docs/CLIENT_UPDATE.md`](CLIENT_UPDATE.md). Docker / Glama / ToolBench / session clients that keep the default bridge must allow outbound DNS + HTTPS; verify a real call with `ledger_tip.hash` as in INSPECT.
