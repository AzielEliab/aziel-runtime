# aziel-runtime

**Aziel Eliab Runtime 1.5.0** — agent-native cut on **1.4.1** production gates. Agents use product tools like software (display-ready output, then the next input). Human software — Worker UI, Flutter `mobile/`, local install, counted `/download` — stays complete. Catalog + pull + proxy, one session object, **in-process engines** for every catalog Software slug, plus production gates (`/v1/ready`, HEAD, no-store, receipt cap 64, session TTL 6h, per-IP rate limits, optional `RUNTIME_TOKEN` on session mutate):

`open → policy → exec(slug, op, payload) → receipt → close`

Agents should not narrate that chain. Prefer `godlock_submit` / `foldlock_fold-preview` or `runtime_run { slug, op, payload }`.

**1.3.0** vendored portable engines (ark, azai Lamb check, azclce, decisiongate, foldlock, zsolver) and ran them in this isolate.

**1.2.0** was a session/receipt runtime: exec still `upstreamFetch`ed product Workers. Those receipts were not “this process ran FoldLock.”

**1.1.0** was catalog + pull + proxy that started calling itself a runtime. Those front doors stay. They are not exec.

For **every catalog slug** `session exec` loads a vendored module, computes `engine_digest` = SHA-256 of that artifact’s bytes, runs the primary compute op **inside this Worker isolate** (the jail) or a local CLI jail, wipes scratch buffers, and the receipt includes `engine_digest`, `engine_slug`, `engine_op`, `ran_in`. `GET /v1/health` `engine_slugs` equals `true_engine_slugs`. Ops that literally cannot run without product-Worker bindings (KV / D1 / AI / live media) stay honest per-op `proxy_fallback` — the slug itself remains a true engine.

Cloudflare’s Worker / Durable Object isolate **is** the jail. No extra guest isolate is claimed. `engine_digest` is still required.

Hosted / in-process AZAI is still protocol mirror + Lamb check, **not** the local blend (`azai serve`).

ChatGPT GPT Actions, Grok custom tools, and Venice HTTP tools import **this** OpenAPI file — then use product tools or `runtime_run`. Session tools are advanced/internal. `/p/{slug}/{op}` is proxy only.

**Author:** Aziel Eliab  
**Identity:** Aziel Eliab (primary). Also known as Aziel Elroi Eliab (`alternateName` / aka only).  
**License:** [Apache-2.0](LICENSE)  
**Version:** 1.5.0  
**Role:** `engine-runtime` (layer: `catalog+pull+proxy+session+in-process-engines`)  
**Worker:** `aziel-runtime` → https://aziel-runtime.vibelock.workers.dev/  
**Library front door:** https://www.azielcorpuslibrary.net/runtime  
**Everblooming sigil:** https://aziel-runtime.vibelock.workers.dev/sigil.png  
**Packaging:** Worker session + in-repo CLI (`node cli/aziel-runtime.mjs`) + stdio MCP (`node cli/mcp-stdio.mjs` / `npm run mcp`). **No counted runtime tarball.**

**Forks are welcome and always allowed.** Do not invent Zenodo DOIs.

## Dual surface (product law)

1. **Agent / MCP** — Software runs through the agent. Show `display.title` / `display.summary` / `display.fields`, then take the next input. Session, OpenAPI, and HTTP plumbing stay invisible unless asked for.
2. **Human software** — This Worker UI, Flutter `mobile/`, local install, and counted `/download` remain complete developed software.

## Session (the actual cut)

```bash
SID=$(curl -s -A 'Mozilla/5.0' -X POST https://aziel-runtime.vibelock.workers.dev/v1/session/open \
  -H 'content-type: application/json' -d '{}' | jq -r .session.id)

curl -s -A 'Mozilla/5.0' -X POST https://aziel-runtime.vibelock.workers.dev/v1/session/$SID/policy \
  -H 'content-type: application/json' \
  -d '{"allow_slugs":["azclce","foldlock"],"max_payload_bytes":8192}'

curl -s -A 'Mozilla/5.0' -X POST https://aziel-runtime.vibelock.workers.dev/v1/session/$SID/exec \
  -H 'content-type: application/json' \
  -d '{"slug":"azclce","op":"score","payload":{"r":"login button blue","d":"login form submits","p":"login button submits"}}'

curl -s -A 'Mozilla/5.0' https://aziel-runtime.vibelock.workers.dev/v1/session/$SID/receipt
curl -s -A 'Mozilla/5.0' https://aziel-runtime.vibelock.workers.dev/v1/session/$SID/receipts
curl -s -A 'Mozilla/5.0' -X POST https://aziel-runtime.vibelock.workers.dev/v1/session/$SID/close
```

A local exec receipt includes `engine_digest`, `engine_slug`, `engine_op`, `ran_in: "aziel-runtime"`, result digests, and latency — not only an upstream HTTP status. `close` seals the chain; further exec is HTTP 409. Sessions expire after 6h (410/auto-close). Receipt cap is 64. Session mutate may require `Authorization: Bearer …` or `X-Aziel-Runtime-Token` when `RUNTIME_TOKEN` is set.

Local CLI (Worker client by default; `--local` writes a session file and prefers vendored engines; `--jail` runs the engine in a child Node process):

```bash
node cli/aziel-runtime.mjs session open --local
node cli/aziel-runtime.mjs session policy --allow-slugs azclce,foldlock
node cli/aziel-runtime.mjs session exec azclce score \
  '{"r":"login button blue","d":"login form submits","p":"login button submits"}'
node cli/aziel-runtime.mjs session exec foldlock fold-preview '{"text":"the cat and the dog"}'
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
| Machine manifest (`role=engine-runtime`) | https://aziel-runtime.vibelock.workers.dev/v1/runtime.json |
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
| sitemap-index.xml | https://aziel-runtime.vibelock.workers.dev/sitemap-index.xml |
| MCP (JSON-RPC over HTTP, public, no OAuth) | `POST` https://aziel-runtime.vibelock.workers.dev/mcp |
| MCP stdio (Glama / Claude Desktop) | `node cli/mcp-stdio.mjs` — [docs/GLAMA.md](docs/GLAMA.md) |
| Glama listing | https://glama.ai/mcp/servers/AzielEliab/aziel-runtime |
| Health | https://aziel-runtime.vibelock.workers.dev/v1/health |
| Ready | https://aziel-runtime.vibelock.workers.dev/v1/ready |
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

**Digital Library:** Eliab, Aziel. (2026). Aziel Digital Library [Software]. Apache-2.0. https://www.azielcorpuslibrary.net/

Product Worker crawl template: [docs/PRODUCT_SEO.md](docs/PRODUCT_SEO.md).

## Add to ChatGPT (GPT Actions)

1. Create a GPT (or open GPT Actions).
2. **Import from URL** → `https://aziel-runtime.vibelock.workers.dev/openapi.json`
3. No authentication. CORS `*`.
4. Ask the GPT to call `foldlock_fold-preview`, `godlock_submit`, `decisiongate_check`, or `runtime_run`. Session tools (`runtime_session_*`) are advanced/internal.

## Add to Grok

- **Custom tool / OpenAPI:** import `https://aziel-runtime.vibelock.workers.dev/openapi.json`
- **MCP remote:** `POST https://aziel-runtime.vibelock.workers.dev/mcp`  
  Methods: `initialize`, `tools/list`, `tools/call`.  
  Default: product tools `{product}_{op}` (in-process when the op is implemented here) and `runtime_run`.  
  Catalog/pull: `runtime_skill`, `runtime_bundle`, `runtime_pull`.  
  Advanced/internal: `runtime_manifest`, `runtime_session_*`, raw `*_health`.  
  HTTP `/p/{product}/{op}` is still a **proxy** (not exec). Public, no OAuth.  
  Tool results are `{ display, result, receipt? }` — show `display` to the user.

## Add to Glama (Install Server)

Glama hosts a **stdio** MCP process. HTTP `POST /mcp` on the Worker is not enough — without [`glama.json`](glama.json), [`cli/mcp-stdio.mjs`](cli/mcp-stdio.mjs), and a [`Dockerfile`](Dockerfile), the listing says **This server cannot be installed**.

```bash
node cli/mcp-stdio.mjs
npm run mcp
```

Default mode **bridges** to `POST https://aziel-runtime.vibelock.workers.dev/mcp` (`User-Agent: Mozilla/5.0`). Optional `RUNTIME_TOKEN` / `AZIEL_RUNTIME_TOKEN`. `--local` or `AZIEL_RUNTIME_MCP=local` runs the same `/mcp` handler in-process.

```bash
docker build -t aziel-runtime-mcp .
docker run --rm -i aziel-runtime-mcp
```

After merge: claim on the Glama Score tab (`glama.json` maintainers = `AzielEliab`), then admin Dockerfile → **Deploy** → **Make Release** so **Install Server** works. Build steps: `npm install --omit=dev`. CMD: `["node", "cli/mcp-stdio.mjs"]`. Full steps: [docs/GLAMA.md](docs/GLAMA.md). Public identity: **Aziel Eliab** only.

## Add to Venice

Custom HTTP tools / OpenAPI: import the same
`https://aziel-runtime.vibelock.workers.dev/openapi.json`.
Pull via `GET /v1/bundle` / `GET /v1/pull/{slug}`. Session exec is
`POST /v1/session/{id}/exec`. Proxy remains `POST /p/{slug}/{op}`.

## Honesty banners

- **Every catalog Software slug is in-process.** `engine_slugs` equals `true_engine_slugs` on `/v1/health` and `/v1/runtime.json`. Binding-only ops stay per-op `proxy_fallback`.
- **GodLock** and **MirageGrid** are not VPNs and not anonymity networks.
- **ForgeReceipts** is not legal advice and does not contact courts.
- **ZionPattern Solver** never claims more than 75% confidence. It does not solve cases.
- **VeilLock** does not inject into FaceTime or any calling app. YOUR camera/screen only.
- **AZ-CLCE** detects inconsistency, not intent. Type D is a label, not a finding of malice.
- **ChronoLock** is advisory only — not a scheduler, not targeting, not virality. 08:30–10:30 local. Distinct from TemporalLock.
- **The ARK** is not a kernel. Hosted API never unlocks or encrypts with a passphrase and never stores vaults. Sweep is Mode E heuristics only.
- **AZAI** is a local OpenAI-compatible runtime, not a new foundation model. Hosted / in-process `/v1` is a protocol mirror + Lamb check, not a provider proxy. Jeeves is not sovereign. Live blend is local `azai serve`.
- **SpectralLock** hosted overlay is a 256px preview, not a spectrometer, not forensic. Full pipeline is the Python package.
- **EmployeeLock** is not a court, not UL, not a truth score. Hosted never stores xlsx. Demo rows are format proof, not case facts.
- **FoldLock** is not zip. Hosted / in-process preview is tether-suppression on small UTF-8 text. Ratios are receipts, not trophies. Short strings can grow.
- **WhistleLock** is a local vault + dead-man copy. Not a mailer. Hosted never holds whistle files.
- **TrajectoryLock** is a research prototype / auditable geometric test. Not a certified forensic instrument. Hosted never stores media. Match probability is P(match | declared model), not P(official account is true). Synthetic examples are not real-case findings.
- **M.I.A.Lock** Doe hits are compatibility leads only — never an ID. Coverage heat is not presence. No live tracking.
- **Aziel Corpus Library** is a public library index + counted PDF/package download. Not a private-file search engine, not Zenodo, not a new Lock engine.
- **AzielTether** is not a VPN. Prefer-central mesh for downloaded Aziel Eliab software; public HTTPS stays mesh-free.

## Product slugs → Workers

| slug | Worker hostname | example ops | session exec |
|------|-----------------|-------------|--------------|
| vibelock | vibelock-download-tracker | analyze | **in-process** (features/PCM; no live mic) |
| veillock | veillock-download-tracker | apps | **in-process** (no camera inject) |
| codelock | codelock-download-tracker | render | **in-process** |
| godlock | godlock-download-tracker | score, submit | **in-process** (not a VPN) |
| shadowlock | shadowlock-download-tracker | observe | **in-process** (no OS hook) |
| temporallock | temporallock-download-tracker | genesis, append, verify | **in-process** |
| forgereceipts | forgereceipts-download-tracker | receipt | **in-process** (not legal advice) |
| decisiongate | decisiongate-download-tracker | check | **in-process** |
| zsolver | zsolver-download-tracker | patterns, score, session | **in-process** |
| azos | azos-download-tracker | status | **in-process** (session/exec/lattice per-op proxy) |
| glossafilter | glossafilter-download-tracker | render | **in-process** |
| miragegrid | miragegrid-download-tracker | assign | **in-process** (control-plane; not a hosted VPN hop) |
| staticclock | staticclock-download-tracker | advise | **in-process** |
| chronolock | chronolock-download-tracker | advisory, anchors | **in-process** |
| postking | postking-download-tracker | new, move, status | **in-process** |
| azclce | azclce-download-tracker | score, classify, gate | **in-process** |
| ark | ark-download-tracker | sweep, levels | **in-process** |
| azai | azai-download-tracker | health, lamb-check | **in-process (Lamb only; not the blend)** |
| spectrallock | spectrallock-download-tracker | health, modes, overlay | **in-process** (256px PNG preview) |
| azbot | azbot-download-tracker | health, skill, route | **in-process** (skill router, not a model) |
| employeelock | employeelock-download-tracker | health, append-preview, verify-canonical, skill | **in-process** (no xlsx store) |
| foldlock | foldlock-download-tracker | health, fold-preview, unfold-preview, skill | **in-process** |
| whistlelock | whistlelock-download-tracker | health, hash-preview, canon-preview, skill | **in-process** (no file store) |
| trajectorylock | trajectorylock-download-tracker | health, example, analyze, skill | **in-process** (geometry; no media store) |
| mialock | mialock-download-tracker | map, search-options, queries, doe-match, coverage | **in-process** (leads ≠ ID) |
| azieltether | azieltether-download-tracker | health, skill, verify | **in-process** (not a VPN) |
| aziel-corpus | aziel-corpus-download-tracker (www.azielcorpuslibrary.net) | health, search, example, skill | **in-process** (sample MASTER; live D1/Whisper/OCR per-op proxy) |

Catalog aliases (also accepted on `/v1/pull/{slug}`): `az-clce` → azclce,
`zion-pattern-solver` → zsolver, `postking-chess` → postking,
`aziel-digital-library` → aziel-corpus, `mia-lock` → mialock.

If a sibling `/v1` API is not live yet, the proxy returns that Worker's response
(often 404 JSON) and the combined OpenAPI still lists the expected path.
`GET /v1/pull/{slug}/skill` falls back to a catalog-built skill so an AI can
still invoke.

Vendored engine artifacts live under `src/engines/`. `engine_digest` is SHA-256
of those file bytes (sorted path order). Recompute with
`node scripts/hash-engines.mjs --write`.

## Deploy

```bash
npx wrangler deploy
```

Account `ac575a9b822bea2bed97d0ab73aed238`. workers.dev
`aziel-runtime.vibelock.workers.dev`. No download KV.

**1.2.0+ requires Durable Object migration tag `v1`** (`RuntimeSession`, SQLite).
The first deploy after the session cut creates the `SESSION` binding. **1.4.0
does not need a new DO migration** — engines run in the same isolate. **1.4.1
reuses that SESSION class. 1.5.0 does not need a new DO migration.**

Optional production token (session mutate only — catalog / health / runtime /
skill / pull stay public):

```toml
# wrangler.toml
# [vars]
# REQUIRE_TOKEN = "1"
```

```bash
npx wrangler secret put RUNTIME_TOKEN
npx wrangler deploy
node scripts/probe-live.mjs
```

If `RUNTIME_TOKEN` is unset and `REQUIRE_TOKEN` is not `1`, sessions stay open
(dev). If the secret is set, `POST /v1/session/open|policy|exec|close` requires
`Authorization: Bearer …` or `X-Aziel-Runtime-Token`. `GET /v1/ready` is **200**
only when the SESSION Durable Object binding is up, and **503** when
`REQUIRE_TOKEN=1` and the secret is missing. Authority JSON (`/v1/health`,
`/v1/ready`, `/v1/runtime.json`, `/v1/catalog.json`) is `Cache-Control: no-store`.
Receipts cap at 64. Sessions expire after 6h. Per-IP: 20 opens / minute, 60
execs / minute (HTTP 429 JSON).

If this checkout has no wrangler credentials, deploy from the author's machine:

```bash
npx wrangler secret put RUNTIME_TOKEN
npx wrangler deploy
node scripts/probe-live.mjs
# confirm GET /v1/health and /v1/ready and /v1/runtime.json version=1.5.0 role=engine-runtime
# confirm engine_slugs == true_engine_slugs == all 27 catalog slugs
# confirm POST /v1/session/open → policy → exec each primary op → receipt has engine_digest + ran_in
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
