# GitHub About — aziel-runtime

Public identity: **Aziel Eliab** only. Aka / `alternateName` only: **Aziel Elroi Eliab**.

This file locks the **GitHub repository About box** (description, homepage, topics) so Google, GitHub search, and AI indexes pick up **MCP, OpenAPI, FragGate, and digital forensics**. It does **not** change Worker MCP behavior or homepage HTML. No `wrangler deploy`.

Coordinator applies the live box with `gh repo edit` (this file is the source of truth; PRs cannot patch About via git).

## Lead abstract (do not weaken)

NodeMesh'd MCP Softwares suite for digital forensics/auditing — **not** an API aggregator.

Canonical crawler paragraph stays `RUNTIME_ABSTRACT` in `src/seo.js` (README lead, `/llms.txt`, `/cite.json`, Worker meta). Version **2.0.0-rc1** stays **below** that abstract.

## Description (≤350 characters)

```text
NodeMesh'd MCP Softwares suite for digital forensics and auditing — not an API aggregator. FragGate door, OpenAPI + MCP, provenance and chain-of-custody. Aziel Runtime 2.0.0-rc1 by Aziel Eliab. Try on Glama.
```

## Homepage

**Try on Glama** is the primary Install Server / MCP distribution door:

`https://glama.ai/mcp/servers/AzielEliab/aziel-runtime`

Worker origin (`https://aziel-runtime.vibelock.workers.dev/`) stays the execution / OpenAPI / `/llms.txt` / `/cite.json` surface. Official hub identity is `https://www.azieleliab.com/runtime` (`@id` `#runtime`). Do not invent a Glama UUID.

## Topics (≤20)

`aziel-eliab`, `cloudflare-workers`, `mcp`, `mcp-server`, `openapi`, `fraggate`, `glama`, `nodemesh`, `runtime`, `agent-orchestration`, `ai-agents`, `auditing`, `digital-forensics`, `chain-of-custody`, `model-context-protocol`, `provenance`, `security`, `software-architecture`, `cloudflare`, `workers`

Required discovery terms: **mcp**, **openapi**, **fraggate**, **digital-forensics**.

## Entity graph (locked)

| Entity | `@id` |
|--------|-------|
| Person | `https://www.azieleliab.com/#aziel` |
| Runtime SoftwareApplication | `https://www.azieleliab.com/runtime#runtime` |

Do **not** use `https://github.com/AzielEliab#person`. Worker origin is `relatedLink` / execution URL, not the identity hub.

## Cross-links (README + this lock)

- Official site → https://www.azieleliab.com/
- Aziel Corpus Library → https://www.azielcorpuslibrary.net/
- GodLock.uk → https://godlock.uk/
- FragGate kernel → https://github.com/AzielEliab/fraggate
- Try on Glama → https://glama.ai/mcp/servers/AzielEliab/aziel-runtime
- Runtime Worker → https://aziel-runtime.vibelock.workers.dev/

## Compatible AI clients + crawler Allow

Full client set (ChatGPT, Grok, Venice, Claude, Cursor, Glama, Perplexity, Copilot, Gemini, Mistral, Meta AI, Apple Intelligence, Amazon Q, DuckAssist, You.com, Cohere, plus other MCP/OpenAPI-capable assistants) and the robots.txt Allow set live in the README and [PRODUCT_SEO.md](PRODUCT_SEO.md). Do not shrink that list to Grok / ChatGPT / Venice only.

## Apply

```bash
gh repo edit AzielEliab/aziel-runtime \
  --description "NodeMesh'd MCP Softwares suite for digital forensics and auditing — not an API aggregator. FragGate door, OpenAPI + MCP, provenance and chain-of-custody. Aziel Runtime 2.0.0-rc1 by Aziel Eliab. Try on Glama." \
  --homepage "https://glama.ai/mcp/servers/AzielEliab/aziel-runtime" \
  --add-topic openapi --add-topic fraggate --add-topic glama \
  --add-topic mcp-server --add-topic nodemesh --add-topic cloudflare --add-topic workers
```

Existing topics stay. Do not remove `digital-forensics` or `mcp`.

## Sister repo — FragGate

[AzielEliab/fraggate](https://github.com/AzielEliab/fraggate) is the FG-0.1 kernel (not a second runtime). If its About / README cross-links are stale, apply the same identity and hub set there — do not invent a second author.

Suggested FragGate description:

```text
FragGate FG-0.1 — THE single door for Aziel Runtime (MCP / OpenAPI). Hashed registry, DecisionGATE, ledger. Hosted on aziel-runtime 2.0.0-rc1. Author: Aziel Eliab.
```

Suggested homepage: `https://aziel-runtime.vibelock.workers.dev/` (runtime door) plus README links to Try on Glama, azieleliab.com, azielcorpuslibrary.net, godlock.uk, and `https://github.com/AzielEliab/aziel-runtime`.

Suggested topics: `fraggate`, `mcp`, `openapi`, `aziel-eliab`, `aziel-runtime`, `digital-forensics`, `kernel`, `model-context-protocol`, `decisiongate`, `cloudflare-workers`.
