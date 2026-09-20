# Inspect — source maps (not prose)

**Author / identity:** **Aziel Eliab** only  
**License:** [Apache-2.0](../../LICENSE)  
**Reviewed artifact:** unminified JavaScript under `src/`, `cli/`, and `scripts/`.  
**Deploy:** `wrangler.toml` `main = "src/index.js"`. Cloudflare may bundle that same module for the Worker. Treat **this tree** as the reviewed source of truth — not a minified upload, not JSON-LD, not `/llms.txt`.

This file maps **actual paths**. Machine identity (`Person @id`) may stay on `/who-is` / `/cite.json`. Softwares purpose copy lives in `src/software-copy.js` (designed-to-do only).

Primary public host / discovery: [Try on Glama](https://glama.ai/mcp/servers/AzielEliab/aziel-runtime). Worker origin is the execution / OpenAPI / MCP HTTP surface.

---

## FragGate (`fraggate` handlers)

| What | Path |
|------|------|
| Door: list / describe / verify / call, admit, accept, refuse | [`src/fraggate/door.js`](../../src/fraggate/door.js) |
| Hashed registry, `LIVE_OPS`, `STUB_OPS`, `classifyCall` | [`src/fraggate/registry.js`](../../src/fraggate/registry.js) |
| Public MCP names, refuse codes, `exist.mcp` hint | [`src/fraggate/codes.js`](../../src/fraggate/codes.js) |
| DecisionGATE ledger tip (hash chain) | [`src/fraggate/ledger.js`](../../src/fraggate/ledger.js) |
| HTTP routes `GET/POST /v1/fraggate*` | [`src/index.js`](../../src/index.js) |
| Kernel cite (not this repo’s exec) | https://github.com/AzielEliab/fraggate |

Behavioral tests: [`scripts/verify-fraggate.mjs`](../../scripts/verify-fraggate.mjs) (list / describe / call happy-path + `FG-STUB` / `FG-HALLUC-TOOL`).

---

## MCP server handlers

| What | Path |
|------|------|
| `initialize` / `tools/list` / `tools/call` | [`src/mcp-surface.js`](../../src/mcp-surface.js) |
| Tool JSON Schema + TDQS annotations | [`src/mcp-schema.js`](../../src/mcp-schema.js) |
| HTTP JSON-RPC `POST /mcp` | [`src/mcp-transport.js`](../../src/mcp-transport.js) + [`src/index.js`](../../src/index.js) |
| Stdio bridge / local handler | [`cli/mcp-stdio.mjs`](../../cli/mcp-stdio.mjs), [`src/mcp-stdio.js`](../../src/mcp-stdio.js) |
| Remote DNS / HTTPS refuse (not a FragGate receipt) | [`src/remote-transport.js`](../../src/remote-transport.js) |
| Well-known server card | [`src/mcp-discovery.js`](../../src/mcp-discovery.js) |

Behavioral tests: [`scripts/verify-mcp-tdqs.mjs`](../../scripts/verify-mcp-tdqs.mjs), [`scripts/verify-mcp-discovery.mjs`](../../scripts/verify-mcp-discovery.mjs), [`scripts/verify-mcp-stdio.mjs`](../../scripts/verify-mcp-stdio.mjs), [`scripts/verify-remote-transport.mjs`](../../scripts/verify-remote-transport.mjs), [`scripts/verify-mcp-transport.mjs`](../../scripts/verify-mcp-transport.mjs). Tool names are frozen as `PUBLIC_MCP_TOOLS`.

Default stdio **bridges** to `https://aziel-runtime.vibelock.workers.dev/mcp`. Containers need outbound **DNS + HTTPS** to `*.vibelock.workers.dev` / Cloudflare. If DNS fails the bridge returns `FG-DNS` (`remote:false`, `fraggate_receipt:false`, `local_validation:false`) — it does **not** run `--local` and does **not** mint a FragGate ledger tip. `--local` / `AZIEL_RUNTIME_MCP=local` is explicit in-process only.

### Verify a real `fraggate_call` receipt hash

When the container can resolve the Worker (not a mocked transport):

```bash
curl -sS -A 'Mozilla/5.0' -X POST \
  https://aziel-runtime.vibelock.workers.dev/v1/fraggate/call \
  -H 'content-type: application/json' \
  -d '{"slug":"spectrallock","op":"health"}'
```

A real execution receipt has `ok: true`, `code: FG-OK`, `door: fraggate`, `engine.engine_digest` matching `ENGINE_DIGESTS.spectrallock`, and `ledger_tip.hash` (64 hex). Re-check the tip with the same SHA-256 canonicalize used by [`src/fraggate/ledger.js`](../../src/fraggate/ledger.js). If curl/DNS fails, stop — that miss is `FG-DNS` / `FG-NET`, not a substitute local-validation receipt.

---

## Session `open → policy → exec → receipt → close`

| What | Path |
|------|------|
| Pure session + SHA-256 receipt chain | [`src/session-core.js`](../../src/session-core.js) (`canonicalize`, `signReceipt`, `verifyChainStrict`) |
| HTTP + MCP session tools | [`src/session-http.js`](../../src/session-http.js) |
| Durable Object / in-memory store | [`src/session-do.js`](../../src/session-do.js) |
| Isolate / TTL / receipt cap | [`src/production.js`](../../src/production.js) |

HTTP: `POST /v1/session/open` → `…/policy` → `…/exec` → `GET …/receipt` → `POST …/close`.

Behavioral tests: [`scripts/verify-session.mjs`](../../scripts/verify-session.mjs). Offline hash re-check: [`scripts/verify-receipt-fixture.mjs`](../../scripts/verify-receipt-fixture.mjs) against [`fixtures/session-receipt-chain.json`](../../fixtures/session-receipt-chain.json).

---

## Software catalog builder

| What | Path |
|------|------|
| Catalog object, sort law, update check | [`src/software-catalog.js`](../../src/software-catalog.js) |
| Plain use-purpose `one_line` / `description` | [`src/software-copy.js`](../../src/software-copy.js) |
| Extra cards / aliases | [`src/catalog-meta.js`](../../src/catalog-meta.js) |
| Product table (`PRODUCTS`) + `GET /v1/software` | [`src/index.js`](../../src/index.js) |

Behavioral tests: [`scripts/verify-software.mjs`](../../scripts/verify-software.mjs) (shape, sort, purpose fields, Glama primary host).

---

## Receipts (other)

| What | Path |
|------|------|
| ACT-RECEIPT-1.0 four-field mint / hash | [`src/library-receipts.js`](../../src/library-receipts.js) |
| Schema prose | [`RECEIPT-SCHEMA.md`](RECEIPT-SCHEMA.md) |
| Fixture + offline command | [`docs/2.0/TESTS.md`](TESTS.md#offline-receipt-hash) |

---

## What is not the source of truth

- `/llms.txt`, `/ai.txt`, `/cite.json`, `/who-is`, `/person.jsonld` — crawler identity + catalog cites
- `glama.json` — listing metadata
- Minified or bundled Worker bytes after deploy

How to run the suite: [`TESTS.md`](TESTS.md). Privacy / stored data: [`../DATA.md`](../DATA.md). Review process: [`../GOVERNANCE.md`](../GOVERNANCE.md).
