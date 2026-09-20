# GitHub About — aziel-runtime

Public identity: **Aziel Eliab** only. Aka / `alternateName` only: **Aziel Elroi Eliab**.

This file locks the **GitHub repository About box** (description, homepage, topics) so Google, GitHub search, and AI indexes pick up **MCP, OpenAPI, FragGate, and digital forensics**. Applying the About box (`gh repo edit`) does not deploy the Worker. Worker HTML is unchanged. The About **homepage** must be the live MCP endpoint (not a directory listing) so registry validators do not skip initialize.

Coordinator applies the live box with `gh repo edit` (this file is the source of truth; PRs cannot patch About via git).

## Lead abstract (do not weaken)

NodeMesh'd MCP Softwares suite for digital forensics/auditing. FragGate is THE single public door.

Canonical crawler paragraph stays `RUNTIME_ABSTRACT` in `src/seo.js` (README lead, `/llms.txt`, `/cite.json`, Worker meta). Version **2.0.0-rc1** stays **below** that abstract.

## Description (≤350 characters)

```text
NodeMesh'd MCP Softwares suite for digital forensics and auditing. FragGate door, OpenAPI + MCP, provenance and chain-of-custody. Aziel Runtime 2.0.0-rc1 by Aziel Eliab. Try on Glama.
```

## Homepage

GitHub About homepage is the **live MCP endpoint** (registry validators / Sentinel `remote_url`):

`https://aziel-runtime.vibelock.workers.dev/mcp`

**Try on Glama** remains the primary Install Server / MCP distribution door in Description text, README table, topics, and cross-links — it is **not** the About homepage. A directory listing is not the MCP endpoint.

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

COLD-MULTI-SHELF-1.0 honesty (in-repo scrape surfaces: `/cite.json`, `/llms.txt`, `/shelves`, OpenAPI, `docs/CITE.md`) matches live corpus `/shelves`. archive.org PASS is https://archive.org/details/aziel-lockset-tip + https://archive.org/details/aziel-lockset-tip_202609 (same blast_radius). Do not invent a Glama UUID, lockset DOI, Framagit URL, GitFlic URL, or GitLab URL.

## Cross-links (README + this lock)

- Official site → https://www.azieleliab.com/
- Aziel Corpus Library → https://www.azielcorpuslibrary.net/
- GodLock.uk → https://godlock.uk/
- He Didn't Jump → https://www.hedidntjump.com/
- GitHub → https://github.com/AzielEliab
- X → https://x.com/AzielEliab (`@AzielEliab`)
- FragGate kernel → https://github.com/AzielEliab/fraggate
- Try on Glama → https://glama.ai/mcp/servers/AzielEliab/aziel-runtime
- Runtime Worker → https://aziel-runtime.vibelock.workers.dev/

## Compatible AI clients + crawler Allow

Full client set (ChatGPT, Grok, Venice, Claude, Cursor, Glama, Perplexity, Copilot, Gemini, Mistral, Meta AI, Apple Intelligence, Amazon Q, DuckAssist, You.com, Cohere, plus other MCP/OpenAPI-capable assistants) and the robots.txt Allow set live in the README and [PRODUCT_SEO.md](PRODUCT_SEO.md). Do not shrink that list to Grok / ChatGPT / Venice only.

## Apply

```bash
gh repo edit AzielEliab/aziel-runtime \
  --description "NodeMesh'd MCP Softwares suite for digital forensics and auditing. FragGate door, OpenAPI + MCP, provenance and chain-of-custody. Aziel Runtime 2.0.0-rc1 by Aziel Eliab. Try on Glama." \
  --homepage "https://aziel-runtime.vibelock.workers.dev/mcp" \
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

Suggested homepage: `https://aziel-runtime.vibelock.workers.dev/` (runtime door) plus README links to Try on Glama, azieleliab.com, azielcorpuslibrary.net, godlock.uk, hedidntjump.com, and `https://github.com/AzielEliab/aziel-runtime`.

Suggested topics: `fraggate`, `mcp`, `openapi`, `aziel-eliab`, `aziel-runtime`, `digital-forensics`, `kernel`, `model-context-protocol`, `decisiongate`, `cloudflare-workers`.
