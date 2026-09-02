# aziel-runtime

**One URL** for every [Aziel Eliab](https://github.com/AzielEliab) product runtime.

ChatGPT GPT Actions, Grok custom tools, and Venice HTTP tools import **this**
OpenAPI file — not fifteen separate Workers.

**Author:** Aziel Eliab
**License:** [Apache-2.0](LICENSE)
**Worker:** `aziel-runtime` → https://aziel-runtime.vibelock.workers.dev/

**Forks are welcome and always allowed.**

## Quick URLs

| What | URL |
|------|-----|
| Catalog (HTML) | https://aziel-runtime.vibelock.workers.dev/ |
| Combined OpenAPI 3.1 | https://aziel-runtime.vibelock.workers.dev/openapi.json |
| MCP (JSON-RPC over HTTP, public, no OAuth) | `POST` https://aziel-runtime.vibelock.workers.dev/mcp |
| Health | https://aziel-runtime.vibelock.workers.dev/v1/health |

`POST /p/{product}/{op}` proxies to
`https://{productWorker}.vibelock.workers.dev/v1/{op}` with the JSON body.
`GET /p/{product}/{op}` proxies GET. Download counters are **not** incremented.

## Add to ChatGPT (GPT Actions)

1. Create a GPT (or open GPT Actions).
2. **Import from URL** → `https://aziel-runtime.vibelock.workers.dev/openapi.json`
3. No authentication. CORS `*`.
4. Ask the GPT to call `decisiongate_check`, `glossafilter_render`, `azclce_score`, `chronolock_advisory`, etc.

## Add to Grok

- **Custom tool / OpenAPI:** import `https://aziel-runtime.vibelock.workers.dev/openapi.json`
- **MCP remote:** `POST https://aziel-runtime.vibelock.workers.dev/mcp`  
  Methods: `initialize`, `tools/list`, `tools/call`. Tools are named `{product}_{op}`
  (example: `decisiongate_check`, `glossafilter_render`, `azclce_gate`, `chronolock_advisory`, `chronolock_anchors`, `ark_sweep`, `ark_levels`, `azai_lamb_check`, `azai_health`).
  Returns text JSON. Public, no OAuth.

## Add to Venice

Custom HTTP tools / OpenAPI: import the same
`https://aziel-runtime.vibelock.workers.dev/openapi.json`.
Each action is `POST /p/{slug}/{op}` with a JSON object.

## Honesty banners

- **GodLock** and **MirageGrid** are not VPNs and not anonymity networks.
- **ForgeReceipts** is not legal advice and does not contact courts.
- **ZionPattern Solver** never claims more than 75% confidence. It does not solve cases.
- **VeilLock** does not inject into FaceTime or any calling app. YOUR camera/screen only.
- **AZ-CLCE** detects inconsistency, not intent. Type D is a label, not a finding of malice.
- **ChronoLock** is advisory only — not a scheduler, not targeting, not virality. 08:30–10:30 local. Distinct from TemporalLock.
- **The ARK** is not a kernel. Hosted API never unlocks or encrypts with a passphrase and never stores vaults. Sweep is Mode E heuristics only.
- **AZAI** is a local OpenAI-compatible runtime, not a new foundation model. Hosted /v1 is a protocol mirror + Lamb check, not a provider proxy. Jeeves is not sovereign. Live blend is local `azai serve`.
- **SpectralLock** hosted overlay is a 256px preview, not a spectrometer, not forensic. Full pipeline is the Python package.
- **EmployeeLock** is not a court, not UL, not a truth score. Hosted never stores xlsx. Demo rows are format proof, not case facts.

## Product slugs → Workers

| slug | Worker hostname | example ops |
|------|-----------------|-------------|
| vibelock | vibelock-download-tracker | analyze |
| veillock | veillock-download-tracker | apps |
| codelock | codelock-download-tracker | render |
| godlock | godlock-download-tracker | score, submit |
| shadowlock | shadowlock-download-tracker | observe |
| temporallock | temporallock-download-tracker | genesis, append, verify |
| forgereceipts | forgereceipts-download-tracker | receipt |
| decisiongate | decisiongate-download-tracker | check |
| zsolver | zsolver-download-tracker | patterns, score, session |
| azos | azos-download-tracker | status |
| glossafilter | glossafilter-download-tracker | render |
| miragegrid | miragegrid-download-tracker | assign |
| staticclock | staticclock-download-tracker | advise |
| chronolock | chronolock-download-tracker | advisory, anchors |
| postking | postking-download-tracker | new, move, status |
| azclce | azclce-download-tracker | score, classify, gate |
| ark | ark-download-tracker | sweep, levels |
| azai | azai-download-tracker | health, lamb-check, lamb_check |
| spectrallock | spectrallock-download-tracker | health, modes, overlay |
| azbot | azbot-download-tracker | health, skill |
| employeelock | employeelock-download-tracker | health, append-preview, verify-canonical, skill |

If a sibling `/v1` API is not live yet, the proxy returns that Worker's response
(often 404 JSON) and the combined OpenAPI still lists the expected path.

## Example

```bash
curl https://aziel-runtime.vibelock.workers.dev/v1/health

curl -X POST https://aziel-runtime.vibelock.workers.dev/p/azclce/score \
  -H 'content-type: application/json' \
  -d '{"r":"login button blue","d":"login form submits","p":"login button submits"}'

curl -X POST https://aziel-runtime.vibelock.workers.dev/p/decisiongate/check \
  -H 'content-type: application/json' \
  -d '{"statement":"Ship the catalog.","evidence":["OpenAPI 3.1"],"accountable":"Aziel Eliab"}'

curl -X POST https://aziel-runtime.vibelock.workers.dev/mcp \
  -H 'content-type: application/json' \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}'
```

## Deploy

```bash
# from this tree, using the shared wrangler binary
/workspace/vibelock/workers/download-tracker/node_modules/.bin/wrangler deploy
```

Account `ac575a9b822bea2bed97d0ab73aed238`. workers.dev
`aziel-runtime.vibelock.workers.dev`. No download KV.

## License

Apache License 2.0. Copyright 2026 Aziel Eliab.
