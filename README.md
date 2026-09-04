# aziel-runtime

**Aziel Eliab Runtime 1.2.0** — catalog + pull + proxy, plus **one session object**:

`open → policy → exec(slug, op, payload) → receipt → close`

**1.1.0** was catalog + pull + proxy that started calling itself a runtime. Those front doors stay. They are not exec.

This Worker does **not** load an engine, jail it, schedule it, or emit a receipt of some other product's process. Isolation is Cloudflare's Worker / Durable Object isolate only. Closest true *local* runtimes remain `azai serve`, `forgereceipts ui`, `azos ui`. Hosted AZAI is still protocol mirror + Lamb check, **not** the blend.

ChatGPT GPT Actions, Grok custom tools, and Venice HTTP tools import **this** OpenAPI file — then pull a product skill, open a session, or call `/p/{slug}/{op}` (proxy only).

**Author:** Aziel Eliab  
**Identity:** Aziel Eliab only  
**License:** [Apache-2.0](LICENSE)  
**Version:** 1.2.0  
**Role:** `session-runtime` (layer: `catalog+pull+proxy+session`)  
**Worker:** `aziel-runtime` → https://aziel-runtime.vibelock.workers.dev/  
**Library front door:** https://www.azielcorpuslibrary.net/runtime  
**Everblooming sigil:** https://aziel-runtime.vibelock.workers.dev/sigil.png  
**Packaging:** Worker session + in-repo CLI (`node cli/aziel-runtime.mjs`). **No counted runtime tarball.**

**Forks are welcome and always allowed.** Do not invent Zenodo DOIs.

## Session (the actual cut)

```bash
SID=$(curl -s -A 'Mozilla/5.0' -X POST https://aziel-runtime.vibelock.workers.dev/v1/session/open \
  -H 'content-type: application/json' -d '{}' | jq -r .session.id)

curl -s -A 'Mozilla/5.0' -X POST https://aziel-runtime.vibelock.workers.dev/v1/session/$SID/policy \
  -H 'content-type: application/json' \
  -d '{"allow_slugs":["azclce"],"max_payload_bytes":8192}'

curl -s -A 'Mozilla/5.0' -X POST https://aziel-runtime.vibelock.workers.dev/v1/session/$SID/exec \
  -H 'content-type: application/json' \
  -d '{"slug":"azclce","op":"score","payload":{"r":"login button blue","d":"login form submits","p":"login button submits"}}'

curl -s -A 'Mozilla/5.0' https://aziel-runtime.vibelock.workers.dev/v1/session/$SID/receipt
curl -s -A 'Mozilla/5.0' https://aziel-runtime.vibelock.workers.dev/v1/session/$SID/receipts
curl -s -A 'Mozilla/5.0' -X POST https://aziel-runtime.vibelock.workers.dev/v1/session/$SID/close
```

Each `exec` records intent **before** the product call, then appends a **hash-chained receipt owned by this session** (status, latency, request/response digests — not huge bodies). `close` seals the chain; further exec is HTTP 409.

Local CLI (Worker client by default; `--local` writes an equivalent session file):

```bash
node cli/aziel-runtime.mjs session open
node cli/aziel-runtime.mjs session policy --allow-slugs azclce
node cli/aziel-runtime.mjs session exec azclce score \
  '{"r":"login button blue","d":"login form submits","p":"login button submits"}'
node cli/aziel-runtime.mjs session receipt
node cli/aziel-runtime.mjs session close
```

Proof script (local session log): `bash scripts/demo-session.sh`

## Front doors (still useful — not exec)

```bash
curl -s -A 'Mozilla/5.0' https://aziel-runtime.vibelock.workers.dev/v1/skill
curl -s -A 'Mozilla/5.0' https://aziel-runtime.vibelock.workers.dev/v1/runtime.json
curl -s -A 'Mozilla/5.0' https://aziel-runtime.vibelock.workers.dev/v1/bundle
curl -s -A 'Mozilla/5.0' https://aziel-runtime.vibelock.workers.dev/v1/pull/foldlock
curl -s -A 'Mozilla/5.0' https://aziel-runtime.vibelock.workers.dev/v1/pull/foldlock/skill
```

Proxy (no runtime-owned receipt — **not** exec):

```bash
curl -s -A 'Mozilla/5.0' -X POST https://aziel-runtime.vibelock.workers.dev/p/azclce/score \
  -H 'content-type: application/json' \
  -d '{"r":"login button blue","d":"login form submits","p":"login button submits"}'
```

Always send `User-Agent: Mozilla/5.0`.

## Quick URLs

| What | URL |
|------|-----|
| Homepage (HTML) | https://aziel-runtime.vibelock.workers.dev/ |
| Skill | https://aziel-runtime.vibelock.workers.dev/v1/skill |
| Machine manifest (`role=session-runtime`) | https://aziel-runtime.vibelock.workers.dev/v1/runtime.json |
| Session open | `POST` https://aziel-runtime.vibelock.workers.dev/v1/session/open |
| Session exec | `POST` https://aziel-runtime.vibelock.workers.dev/v1/session/{id}/exec |
| Session receipt(s) | https://aziel-runtime.vibelock.workers.dev/v1/session/{id}/receipt |
| Bundle | https://aziel-runtime.vibelock.workers.dev/v1/bundle |
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
fallback. That path is a **proxy**, not session exec. Download counters are
**not** incremented.

This Worker is Worker-only (no counted runtime tarball). The local CLI lives
in-repo and is not a GitBaby `/download` package. Each product still has its
own counted `/download`.

**How to cite:** Eliab, Aziel. (2026). Aziel Eliab Runtime [Software]. Apache-2.0. https://aziel-runtime.vibelock.workers.dev/

## Add to ChatGPT (GPT Actions)

1. Create a GPT (or open GPT Actions).
2. **Import from URL** → `https://aziel-runtime.vibelock.workers.dev/openapi.json`
3. No authentication. CORS `*`.
4. Ask the GPT to call `runtime_session_open`, then `runtime_session_exec`, or the older front doors `runtime_bundle`, `decisiongate_check`, `foldlock_fold-preview`.

## Add to Grok

- **Custom tool / OpenAPI:** import `https://aziel-runtime.vibelock.workers.dev/openapi.json`
- **MCP remote:** `POST https://aziel-runtime.vibelock.workers.dev/mcp`  
  Methods: `initialize`, `tools/list`, `tools/call`.  
  Helpers: `runtime_skill`, `runtime_manifest`, `runtime_bundle`, `runtime_pull`,
  `runtime_session_open`, `runtime_session_policy`, `runtime_session_exec`,
  `runtime_session_receipt`, `runtime_session_receipts`, `runtime_session_close`.  
  Engine tools are named `{product}_{op}` and **proxy** (not exec). Public, no OAuth.

## Add to Venice

Custom HTTP tools / OpenAPI: import the same
`https://aziel-runtime.vibelock.workers.dev/openapi.json`.
Pull via `GET /v1/bundle` / `GET /v1/pull/{slug}`. Session exec is
`POST /v1/session/{id}/exec`. Proxy remains `POST /p/{slug}/{op}`.

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

**1.2.0 requires Durable Object migration tag `v1`** (`RuntimeSession`, SQLite).
The first deploy after this cut creates the `SESSION` binding. If this checkout
has no wrangler credentials, deploy from the author's machine:

```bash
npx wrangler deploy
# confirm POST /v1/session/open returns a sess_* id
```

## Library `/runtime`

https://www.azielcorpuslibrary.net/runtime is the Aziel Digital Library front
door that points here. After this runtime ships pull APIs, the corpus Worker
should advertise and reverse-proxy:

- `GET https://www.azielcorpuslibrary.net/runtime` — human front door
- `GET https://www.azielcorpuslibrary.net/runtime/v1/skill` → this `/v1/skill`
- `GET https://www.azielcorpuslibrary.net/runtime/v1/runtime.json` → this `/v1/runtime.json`
- `GET https://www.azielcorpuslibrary.net/runtime/v1/bundle` → this `/v1/bundle`
- `GET https://www.azielcorpuslibrary.net/runtime/v1/pull/{slug}` → this `/v1/pull/{slug}`
- `POST https://www.azielcorpuslibrary.net/runtime/v1/session/open` → this session object

See the companion PR on [AzielEliab/aziel-corpus](https://github.com/AzielEliab/aziel-corpus).

## License

Apache License 2.0. Copyright 2026 Aziel Eliab.
