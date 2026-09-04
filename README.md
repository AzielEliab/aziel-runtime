# aziel-runtime

**Aziel Eliab Runtime** — the root source for AI to **pull**, **invoke**, and **cite** every
[Aziel Eliab](https://github.com/AzielEliab) product. Not only a catalog.

ChatGPT GPT Actions, Grok custom tools, and Venice HTTP tools import **this**
OpenAPI file — then pull a product skill and call `/p/{slug}/{op}` without
visiting each Worker first.

**Author:** Aziel Eliab  
**Identity:** Aziel Eliab only  
**License:** [Apache-2.0](LICENSE)  
**Version:** 1.1.0  
**Worker:** `aziel-runtime` → https://aziel-runtime.vibelock.workers.dev/  
**Library front door:** https://www.azielcorpuslibrary.net/runtime  
**Everblooming sigil:** https://aziel-runtime.vibelock.workers.dev/sigil.png

**Forks are welcome and always allowed.** Do not invent Zenodo DOIs.

## Bootstrap (start here)

```bash
curl -s -A 'Mozilla/5.0' https://aziel-runtime.vibelock.workers.dev/v1/skill
curl -s -A 'Mozilla/5.0' https://aziel-runtime.vibelock.workers.dev/v1/runtime.json
curl -s -A 'Mozilla/5.0' https://aziel-runtime.vibelock.workers.dev/v1/bundle
curl -s -A 'Mozilla/5.0' https://aziel-runtime.vibelock.workers.dev/v1/pull/foldlock
curl -s -A 'Mozilla/5.0' https://aziel-runtime.vibelock.workers.dev/v1/pull/foldlock/skill
```

Then invoke:

```bash
curl -s -A 'Mozilla/5.0' -X POST https://aziel-runtime.vibelock.workers.dev/p/azclce/score \
  -H 'content-type: application/json' \
  -d '{"r":"login button blue","d":"login form submits","p":"login button submits"}'
```

Always send `User-Agent: Mozilla/5.0`.

## Quick URLs

| What | URL |
|------|-----|
| Runtime (HTML) | https://aziel-runtime.vibelock.workers.dev/ |
| Runtime skill | https://aziel-runtime.vibelock.workers.dev/v1/skill |
| Machine manifest (`role=runtime`) | https://aziel-runtime.vibelock.workers.dev/v1/runtime.json |
| Bundle (every skill URL + invoke prefix) | https://aziel-runtime.vibelock.workers.dev/v1/bundle |
| Pull one product | https://aziel-runtime.vibelock.workers.dev/v1/pull/{slug} |
| Pull product skill | https://aziel-runtime.vibelock.workers.dev/v1/pull/{slug}/skill |
| Combined OpenAPI 3.1 | https://aziel-runtime.vibelock.workers.dev/openapi.json |
| Machine catalog | https://aziel-runtime.vibelock.workers.dev/v1/catalog.json |
| How to cite | https://aziel-runtime.vibelock.workers.dev/cite.json |
| LLM crawler | https://aziel-runtime.vibelock.workers.dev/llms.txt (also `/ai.txt`) |
| robots.txt | https://aziel-runtime.vibelock.workers.dev/robots.txt |
| sitemap.xml | https://aziel-runtime.vibelock.workers.dev/sitemap.xml |
| MCP (JSON-RPC over HTTP, public, no OAuth) | `POST` https://aziel-runtime.vibelock.workers.dev/mcp |
| Health | https://aziel-runtime.vibelock.workers.dev/v1/health |
| Everblooming sigil | https://aziel-runtime.vibelock.workers.dev/sigil.png |

`GET /v1/pull?all=1` is an alias of `/v1/bundle`.

`POST /p/{product}/{op}` proxies to the product Worker `/v1/{op}` with the JSON
body. Service bindings are preferred; public `*.vibelock.workers.dev` is the
fallback. `GET /p/{product}/{op}` proxies GET. Download counters are **not**
incremented.

This Worker is Worker-only (no counted runtime tarball). Pull skill markdown and
invoke through the routes above. Each product still has its own counted
`/download`.

**How to cite:** Eliab, Aziel. (2026). Aziel Eliab Runtime [Software]. Apache-2.0. https://aziel-runtime.vibelock.workers.dev/

## Add to ChatGPT (GPT Actions)

1. Create a GPT (or open GPT Actions).
2. **Import from URL** → `https://aziel-runtime.vibelock.workers.dev/openapi.json`
3. No authentication. CORS `*`.
4. Ask the GPT to call `runtime_bundle`, then `decisiongate_check`, `foldlock_fold-preview`, etc.

## Add to Grok

- **Custom tool / OpenAPI:** import `https://aziel-runtime.vibelock.workers.dev/openapi.json`
- **MCP remote:** `POST https://aziel-runtime.vibelock.workers.dev/mcp`  
  Methods: `initialize`, `tools/list`, `tools/call`.  
  Runtime helpers: `runtime_skill`, `runtime_manifest`, `runtime_bundle`, `runtime_pull`.  
  Engine tools are named `{product}_{op}`. Public, no OAuth.

## Add to Venice

Custom HTTP tools / OpenAPI: import the same
`https://aziel-runtime.vibelock.workers.dev/openapi.json`.
Pull via `GET /v1/bundle` / `GET /v1/pull/{slug}`. Each action is
`POST /p/{slug}/{op}` with a JSON object.

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
- **FoldLock** is not zip. Hosted preview is tether-suppression on small UTF-8 text. Ratios are receipts, not trophies. Short strings can grow.
- **WhistleLock** is a local vault + dead-man copy. Not a mailer. Hosted never holds whistle files.
- **TrajectoryLock** is a research prototype / auditable geometric test. Not a certified forensic instrument. Hosted never stores media. Match probability is P(match | declared model), not P(official account is true). Synthetic examples are not real-case findings.
- **M.I.A.Lock** Doe hits are compatibility leads only — never an ID. Coverage heat is not presence. No live tracking.
- **Aziel Corpus Library** is a public library index + counted PDF/package download. Not a private-file search engine, not Zenodo, not a new Lock engine.
- **AzielTether** is not a VPN. Prefer-central mesh for downloaded Aziel Eliab software; public HTTPS stays mesh-free.

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
| foldlock | foldlock-download-tracker | health, fold-preview, unfold-preview, skill |
| whistlelock | whistlelock-download-tracker | health, hash-preview, canon-preview, skill |
| trajectorylock | trajectorylock-download-tracker | health, example, analyze, skill |
| mialock | mialock-download-tracker | map, search-options, queries, doe-match, coverage |
| azieltether | azieltether-download-tracker | health, skill |
| aziel-corpus | aziel-corpus-download-tracker (www.azielcorpuslibrary.net) | health, search, example, skill |

Catalog aliases (also accepted on `/v1/pull/{slug}`): `az-clce` → azclce,
`zion-pattern-solver` → zsolver, `postking-chess` → postking,
`aziel-digital-library` → aziel-corpus, `mia-lock` → mialock.

If a sibling `/v1` API is not live yet, the proxy returns that Worker's response
(often 404 JSON) and the combined OpenAPI still lists the expected path.
`GET /v1/pull/{slug}/skill` falls back to a catalog-built skill so an AI can
still invoke.

## Deploy

```bash
npx wrangler deploy
```

Account `ac575a9b822bea2bed97d0ab73aed238`. workers.dev
`aziel-runtime.vibelock.workers.dev`. No download KV.

## Library `/runtime`

https://www.azielcorpuslibrary.net/runtime is the Aziel Digital Library front
door that points here. After this runtime ships pull APIs, the corpus Worker
should advertise and reverse-proxy:

- `GET https://www.azielcorpuslibrary.net/runtime` — human front door
- `GET https://www.azielcorpuslibrary.net/runtime/v1/skill` → this `/v1/skill`
- `GET https://www.azielcorpuslibrary.net/runtime/v1/runtime.json` → this `/v1/runtime.json`
- `GET https://www.azielcorpuslibrary.net/runtime/v1/bundle` → this `/v1/bundle`
- `GET https://www.azielcorpuslibrary.net/runtime/v1/pull/{slug}` → this `/v1/pull/{slug}`

See the companion PR on [AzielEliab/aziel-corpus](https://github.com/AzielEliab/aziel-corpus).

## License

Apache License 2.0. Copyright 2026 Aziel Eliab.
