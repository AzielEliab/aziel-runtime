# Compatibility policy — Aziel Runtime 2.0.0-rc1

**Author / identity:** **Aziel Eliab** only  
**Applies to:** MCP, OpenAPI, HTTP, and Glama stdio clients talking to this runtime.

2.0.0-rc1 is a **contract freeze** of 1.9.3 behavior. There are **no intentional behavioral breaks**. Clients written against 1.9.x FragGate list → describe → call keep working.

---

## Compatible clients (unchanged)

`COMPATIBLE_AI_CLIENTS` in `src/ai-clients.js`:

ChatGPT (GPT Actions / OpenAI), Grok (xAI), Venice, Claude (Anthropic Desktop / custom tools), Cursor (MCP), **Glama (Install Server / MCP)**, Perplexity, Microsoft Copilot / Bing, Google Gemini / Vertex AI, Mistral, Meta AI, Apple Intelligence / Applebot surfaces, Amazon Q / Amazonbot tooling, DuckAssist / DuckDuckGo AI, You.com, Cohere, plus other MCP/OpenAPI-capable assistants.

Public, no OAuth. Always send `User-Agent: Mozilla/5.0`.

---

## Promises (must not regress)

1. **FragGate remains THE single public executable door.** Agents do not need a new tool family.
2. **`POST /mcp` `tools/list` names stay the 36 `PUBLIC_MCP_TOOLS`.** Adding a public MCP name is a contract change (see [BREAKING-CHANGE-POLICY.md](BREAKING-CHANGE-POLICY.md)). Flat `{slug}_{op}` stays unlistable. Description / annotation / `outputSchema` enrichment (Glama TDQS 5.0) is **not** a name change and **not** a behavioral break. `fraggate_call` must not be marked globally read-only or idempotent.
3. **MCP `initialize`** keeps `protocolVersion: "2025-03-26"`, `serverInfo.name: "aziel-runtime"`, `capabilities.tools.listChanged: false`.
4. **OpenAPI** `GET /openapi.json` stays OpenAPI 3.1. `info.description` still **starts** with `RUNTIME_ABSTRACT`. Prefer `POST /v1/fraggate/call`. `/p/{slug}/{op}` stays proxy-not-exec.
5. **Authority JSON** (`/v1/health`, `/v1/ready`, `/v1/runtime.json`) stay the same snapshot shape (`authoritySnapshot()`). `door` stays `"fraggate"`. `fraggate_call_public` stays `true`.
6. **Glama / stdio / TDQS** — `glama.json` maintainers `["AzielEliab"]` plus the already-enriched listing fields (`name`, `version` = `2.0.0-rc1`, `description`, `keywords`, `categories`). GitHub description/topics/homepage stay the coordinator listing; lock in [`docs/GITHUB.md`](../GITHUB.md) (Try on Glama homepage; topics include mcp / openapi / fraggate / digital-forensics). MCP `tools/list` descriptions follow the Glama TDQS 5.0 template (purpose / when / when-not / alternative / side-effects / returns / refusals) documented in `docs/GLAMA-TDQS.md`. Tool **names** stay the 36 `PUBLIC_MCP_TOOLS`. `fraggate_call` is **not** globally `readOnlyHint` / `idempotentHint`. `cli/mcp-stdio.mjs` remains the Install Server entry (`Dockerfile` `CMD ["node", "cli/mcp-stdio.mjs"]`). Default still bridges to `POST $AZIEL_RUNTIME_URL/mcp`. `--local` / `AZIEL_RUNTIME_MCP=local` stays in-process. **Do not wrap CMD in `mcp-proxy`.** See `docs/GLAMA.md`.
7. **Hub catalog** — `GET /v1/software` sort law Plain A–Z → Gate A–Z → Lock A–Z. Clock ≠ Lock. Sibling software under one FragGate door. Isolation `domains.software_count` stays **33** (`domains_are_doors: false`). Softwares-tab `count` may include placements; do not equate the two (`count_note`).
8. **Client update** — `GET /v1/update/check?slug=&version=` and `GET /v1/update/manifest` stay.
9. **Receipts** — session kind `aziel-runtime.receipt`, hash-chained, identity **Aziel Eliab** only. See [RECEIPT-SCHEMA.md](RECEIPT-SCHEMA.md).
10. **Refusals stay refusals.** A previously-refused Remain-OFF verb must not start returning `FG-OK`. See [REFUSAL-CONTRACT.md](REFUSAL-CONTRACT.md).
11. **SEO abstract** — `RUNTIME_ABSTRACT` / `RUNTIME_ONE_LINE` stay the crawler lead. Changelog stays below.

---

## Non-promises (not compatibility bugs)

- Bindings (`BROWSER`, `CORPUS_D1`, `AI`, `USES`, `SESSION`) may be absent in a clean-room or fork. Binding-gated ops **honest-refuse**; they do not invent transcripts, Chromium visits, or OCR.
- Mesh radios stay default OFF. `GET /v1/mesh` never enables. Empty `POST /v1/mesh/enable` stays `MESH-NEED-BEARER`.
- `runtime_run` / `runtime_session_*` / `runtime_manifest` remain advanced/internal.
- Product Worker UIs, Flutter `mobile/` (not vendored here), and counted `/download` are the human surface — not required for MCP compatibility.
- Directory **score / install badges** (Glama or any other MCP index) are operational listing state, not a runtime API. This freeze does not change MCP initialize / `tools/list` / FragGate call semantics for those indexes.

---

## Integrator path

Published examples: `examples/consumer/` (`mcp-client.mjs`, `openapi-client.mjs`).

```text
fraggate_list → fraggate_describe { slug } → fraggate_call { slug, op, payload }
```

Do not call `smtp_send`, `deanonymize`, `chromium`, `tor_exit`, `exec`, `blend`, or invented tool names.

---

## Version reading rule

Read `version` on `GET /v1/health` / `GET /v1/runtime.json` / MCP `serverInfo.version`.  
Do **not** treat `version_history[].note` as the current contract. A superseded 1.9.x row is heritage.
