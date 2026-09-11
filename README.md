# aziel-runtime

**Aziel Runtime** (`aziel-runtime`) is not merely an API orchestrator or software aggregator; it is a node-meshed orchestration suite of MCP-connected software designed to coordinate specialized tools through a shared, security-gated runtime while preserving provenance, chain-of-custody, temporal integrity, and auditable execution. It functions as a digital forensic, investigative, verification, research, intelligence-support, and systems-auditing environment in which individual engines can analyze evidence, validate records, inspect trajectories and patterns, track lineage, enforce capability boundaries, generate receipts, and exchange structured results without collapsing into one opaque model or unrestricted control plane. Its architecture emphasizes compartmentalization, deterministic routing, explicit refusal states, append-only evidence handling, and machine-readable metadata, making it suitable for distributed analysis workflows where trust, reproducibility, attribution, and post-hoc auditability matter as much as the result itself.

FragGate is THE single public executable door (`fraggate_list` → `fraggate_describe` → `fraggate_call`). Softwares catalog is Plain → Gate → Lock; hubs refresh from `GET /v1/software`. Dual-surface: agents via OpenAPI/MCP; humans via Worker UI + counted `/download`. NodeMesh / QNM suite-presence is operator-enabled; `GET /v1/mesh` never enables; not a login mesh / VPN / Node Gate.

**Version 1.9.2** binds Workers Browser Rendering (`BROWSER`) and live D1 MASTER (`CORPUS_D1` → `aziel-digital-library` `records`). Whisper/OCR stay Workers-AI-bound. Sample MASTER remains the unbound fallback. Chromium product UI is not claimed; Tor/phoenix stay refuse. Remain-OFF untouched. Crawler surfaces keep the abstract above; changelog stays below. **1.9.1** closed AZRT-1.9-GAPS-CLOSE. **1.9.0** closed AZRT-1.9-CLOSE-1.0. **1.7.11** is the SEO-clarity heritage that locked that lead copy.

Kernel: [AzielEliab/fraggate](https://github.com/AzielEliab/fraggate) (FG-0.1)

`open → policy → exec(slug, op, payload) → receipt → close`

Agents should not narrate that chain. Prefer `fraggate_list` → `fraggate_describe` → `fraggate_call { name, op, payload }`. Hubs/clients: `GET /v1/software`.

**1.3.0** vendored portable engines (ark, azai Lamb check, azclce, decisiongate, foldlock, zsolver) and ran them in this isolate.

**1.2.0** was a session/receipt runtime: exec still `upstreamFetch`ed product Workers. Those receipts were not “this process ran FoldLock.”

**1.1.0** was catalog + pull + proxy that started calling itself a runtime. Those front doors stay. They are not exec.

For **every catalog slug** `session exec` loads a vendored module, computes `engine_digest` = SHA-256 of that artifact’s bytes, runs the primary compute op **inside this Worker isolate** (the jail) or a local CLI jail, wipes scratch buffers, and the receipt includes `engine_digest`, `engine_slug`, `engine_op`, `ran_in`. `GET /v1/health` `engine_slugs` equals `true_engine_slugs`. Ops that literally cannot run without product-Worker bindings (KV / D1 / AI / live media) stay honest per-op `proxy_fallback` — the slug itself remains a true engine.

Cloudflare’s Worker / Durable Object isolate **is** the jail. No extra guest isolate is claimed. `engine_digest` is still required.

Hosted / in-process AZAI is still protocol mirror + Lamb check, **not** the local blend (`azai serve`).

Any OpenAPI-, MCP-, or HTTP-tool-capable assistant imports **this** OpenAPI file — then use `fraggate_call`. Session tools and `runtime_run` are advanced/internal. `/p/{slug}/{op}` is proxy only and is not the agent default path.

**Author:** Aziel Eliab  
**Identity:** Aziel Eliab (primary). Also known as Aziel Elroi Eliab (`alternateName` / aka only).  
**License:** [Apache-2.0](LICENSE)  
**Version:** 1.9.2  
**Role:** `engine-runtime` (layer: `catalog+pull+proxy+session+in-process-engines+fraggate`)  
**Door:** `fraggate`  
**Worker:** `aziel-runtime` → https://aziel-runtime.vibelock.workers.dev/  
**Library front door:** https://www.azielcorpuslibrary.net/runtime  
**Everblooming sigil:** https://aziel-runtime.vibelock.workers.dev/sigil.png  
**Packaging:** Worker session + in-repo CLI (`node cli/aziel-runtime.mjs`) + stdio MCP (`node cli/mcp-stdio.mjs` / `npm run mcp`). **No counted runtime tarball.**

**Forks are welcome and always allowed.** Do not invent Zenodo DOIs.

## Compatible AI clients

Assistants / clients that can call OpenAPI, MCP, or HTTP tools:

- ChatGPT (GPT Actions / OpenAI)
- Grok (xAI)
- Venice
- Claude (Anthropic Desktop / custom tools)
- Cursor (MCP)
- Glama (Install Server / MCP)
- Perplexity
- Microsoft Copilot / Bing
- Google Gemini / Vertex AI
- Mistral
- Meta AI
- Apple Intelligence / Applebot surfaces
- Amazon Q / Amazonbot tooling
- DuckAssist / DuckDuckGo AI
- You.com
- Cohere
- plus other MCP/OpenAPI-capable assistants

Practical Add-to steps below cover ChatGPT, Grok, Venice, Claude Desktop, and Glama / Cursor MCP. Do not invent step-by-step for every crawler.

Crawl / SEO Allow set on `robots.txt`: GPTBot/ChatGPT, Venice, Grok, Google-Extended, GoogleOther, Google-CloudVertexBot, Claude(+Search/User), anthropic-ai, Perplexity(+User), bingbot, Meta-External*, Applebot(+Extended), Amazonbot, DuckDuck/DuckAssist, MistralAI-User, YouBot, CCBot, cohere-ai, cohere-training-data-crawler, Diffbot, AI2Bot(+Dolma), Timpibot, Petalbot, Bytespider, Omgili(+bot), FirecrawlAgent, ImagesiftBot, FacebookBot, TikTokSpider, Baiduspider*, Yandex.

## Websites / Live sites

This Worker homepage stays the **API / MCP / OpenAPI** surface. Human site access is the two public sites — **Aziel Corpus Library** and **GodLock.uk** — which cross-tether each other and this runtime.

| Surface | URL |
|---------|-----|
| Runtime Worker / MCP / OpenAPI | https://aziel-runtime.vibelock.workers.dev/ |
| Library Runtime front door | https://www.azielcorpuslibrary.net/runtime |
| Aziel Corpus Library | https://www.azielcorpuslibrary.net/ |
| Aziel Eliab (library) | https://www.azielcorpuslibrary.net/AzielEliab |
| Software page | https://www.azielcorpuslibrary.net/software |
| GodLock.uk | https://godlock.uk — https://godlock.uk/AzielEliab — https://godlock.uk/software |
| Repos | https://github.com/AzielEliab/aziel-corpus · https://github.com/AzielEliab/godlock |
| Glama MCP listing | https://glama.ai/mcp/servers/AzielEliab/aziel-runtime |
| Donate (canonical) | https://www.azieleliab.com/donate |

Glama **Install Server** is stdio via [`glama.json`](glama.json) + [`Dockerfile`](Dockerfile) on `main`. See [docs/GLAMA.md](docs/GLAMA.md).

Public identity: **Aziel Eliab** only. Do not invent Zenodo DOIs.

## Dual surface (product law)

1. **Agent / MCP** — Software runs through the agent. Show `display.title` / `display.summary` / `display.fields`, then take the next input. Session, OpenAPI, and HTTP plumbing stay invisible unless asked for. **One door — discover, route, refuse.**
2. **Human software** — This Worker UI, local install, and counted `/download` remain complete developed software. Flutter `mobile/` is not vendored in this repo.

## FragGate door

Public MCP `tools/list` is a **thin FragGate door**: `runtime_skill`, `fraggate_list`, `fraggate_describe`, `fraggate_verify`, `fraggate_call`, `decisiongate_check`, `library_lookup`, suite `mesh_*`, plus catalog helpers. `runtime_run` is advanced/internal.

Every catalog product is a **hashed registry** entry (`name`, `slug`, `digest`, `status`, public `ops`). Status is `live` | `stub` | `local_only`.

`stub_ops` / `stub_op_count` are named refuse verbs (never hosted), not extra catalog Software engines. `stub_count` is registry entries whose status is `stub` (none after 1.9.0 — **AZChat** is LIVE+bound). EmbryoLock is a live catalog engine (`live-with-local-destructive-boundary`); wipe / scorch / unlock stay `FG-STUB` on the public mesh. FragGate `live_count + local_only_count + stub_count ===` FragGate `product_count`.

**Live on the public mesh** (via `fraggate_call`): every catalog Software product that makes sense on a public agent door — advisory / score / classify / gate / search / preview / render / verify / hash / receipt / game / overlay / route / status, plus the original five (DecisionGATE, GodLock, FoldLock, AZ-CLCE, Aziel Digital Library). VeilLock stays **local_only** (device-local camera/screen). MCP `tools/list` stays the thin FragGate surface.

**Stub ops** (named refuse verbs, never execute): EmbryoLock wipe/scorch/unlock/encrypt/decrypt/initialize/login, ARK scorch/wipe/unlock/encrypt, WhistleLock send/mail/release, MirageGrid VPN-hop/hop/tunnel/mesh, AzielTether mesh-join/vpn/arm, VeilLock inject/intercept/facetime, AZ-OS exec/shell/lattice, AZAI blend/complete/chat, EmployeeLock court/judge, PeaceLock transcript/transcribe/motive/counterfactual/invent/waive-duty/bypass-duty, 4DMap truth_score/lumen_panel/invent_mark/backdate_class. Safe hosted ops on those products can still be live; the stub verbs refuse forever.

Unknown names refuse `FG-HALLUC-TOOL` and list the tools that *do* exist. DecisionGATE runs before any exec side effect; refuse is a typed ResultEnvelope + ledger tip (TemporalLock-shaped hash chain). Mesh is not claimed on this public surface.

```bash
curl -s -A 'Mozilla/5.0' https://aziel-runtime.vibelock.workers.dev/v1/fraggate
curl -s -A 'Mozilla/5.0' https://aziel-runtime.vibelock.workers.dev/v1/fraggate/list
curl -s -A 'Mozilla/5.0' -X POST https://aziel-runtime.vibelock.workers.dev/v1/fraggate/call \
  -H 'content-type: application/json' \
  -d '{"slug":"foldlock","op":"fold-preview","payload":{"text":"the cat and the dog"}}'
```

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
| FragGate door | https://aziel-runtime.vibelock.workers.dev/v1/fraggate |
| FragGate Worker UI + counted download | https://fraggate-download-tracker.vibelock.workers.dev/ |
| FragGate kernel | https://github.com/AzielEliab/fraggate |
| Machine manifest (`role=engine-runtime`) | https://aziel-runtime.vibelock.workers.dev/v1/runtime.json |
| Session open | `POST` https://aziel-runtime.vibelock.workers.dev/v1/session/open |
| Session exec | `POST` https://aziel-runtime.vibelock.workers.dev/v1/session/{id}/exec |
| Session receipt(s) | https://aziel-runtime.vibelock.workers.dev/v1/session/{id}/receipt |
| Bundle | https://aziel-runtime.vibelock.workers.dev/v1/bundle |
| Pull one product | https://aziel-runtime.vibelock.workers.dev/v1/pull/{slug} |
| Pull product skill | https://aziel-runtime.vibelock.workers.dev/v1/pull/{slug}/skill |
| Combined OpenAPI 3.1 | https://aziel-runtime.vibelock.workers.dev/openapi.json |
| Authoritative software catalog (hubs) | https://aziel-runtime.vibelock.workers.dev/v1/software |
| FragGate software mirror | https://aziel-runtime.vibelock.workers.dev/v1/fraggate/software |
| Client update check | https://aziel-runtime.vibelock.workers.dev/v1/update/check?slug={slug}&version={installed} |
| Update manifest | https://aziel-runtime.vibelock.workers.dev/v1/update/manifest |
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
| API uses (no increment, no PII) | https://aziel-runtime.vibelock.workers.dev/v1/uses |
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

Product Worker crawl template: [docs/PRODUCT_SEO.md](docs/PRODUCT_SEO.md). QNM suite rollup: [docs/NODE_MESH.md](docs/NODE_MESH.md). Donate plan (cite-only, not a Softwares product): [docs/designs/AZL-DONATE-1.0.md](docs/designs/AZL-DONATE-1.0.md).

## Donate (runtime + product Worker footer)

Canonical rails live on hubs: **https://www.azieleliab.com/donate**. Hub Donate pages include five QRs that encode payment URIs (BTC / ETH / LTC / XRP / DOGE). This runtime only links. Do not invent wallet addresses or tokens. Do not duplicate those five QRs on runtime or download-trackers.

- **Runtime Worker UI footer** — one line: `Donate` → `https://www.azieleliab.com/donate`
- **Product download-tracker Workers** — same footer pattern: `Support the work` → `https://www.azieleliab.com/donate`

This repo does not own product Workers. Copy that one line into those repos. Addresses stay operator paste on the hub.

## Designs

Current suite software designs (AZL / SEC-FEAT / QNM-WP / NODE-OPS / **AZL-DONATE-1.0**) plus LIVE fabric papers (CL-WP-0.4, AP-WP-0.2, SG-WP-0.1, LS-WP-0.1, RL-WP-0.1-runtime, **QNS-CD-1.0** — not Softwares-tab products): [docs/designs/](docs/designs/). Author: **Aziel Eliab** only. MCP `chainlock_*`. `GET /v1/mesh` never enables. **QNS-CD-1.0** is the Quantum Node Signal packet-transfer coding design (photon QNS1 1.3). Implementation is local `qnsd` in [AzielEliab/qnm-node](https://github.com/AzielEliab/qnm-node). `GET /v1/qns` cites only — the public Worker does not proxy local via emit. Every `/v1/software` card carries `qns_cd`. Do not add QNS as a Softwares-tab product. `GET /v1/azpipe/arch` cites the locked MASTER-33 strip (same payload as `GET /v1/fraggate` `pipeline`). Not a Softwares-tab door.

## Add to ChatGPT (GPT Actions)

1. Create a GPT (or open GPT Actions).
2. **Import from URL** → `https://aziel-runtime.vibelock.workers.dev/openapi.json`
3. No authentication. CORS `*`.
4. Ask the GPT to call `fraggate_list`, then `fraggate_call`. Named live modules: `decisiongate_check`, `library_lookup`. Session tools and `runtime_run` are advanced/internal.

## Add to Grok

- **Custom tool / OpenAPI:** import `https://aziel-runtime.vibelock.workers.dev/openapi.json`
- **MCP remote:** `POST https://aziel-runtime.vibelock.workers.dev/mcp`  
  Methods: `initialize`, `tools/list`, `tools/call`.  
  Default: thin FragGate door (`fraggate_list`, `fraggate_describe`, `fraggate_verify`, `fraggate_call`).  
  Named live: `decisiongate_check`, `library_lookup`. Catalog/pull: `runtime_skill`, `runtime_bundle`, `runtime_pull`.  
  Advanced/internal: `runtime_run`, `runtime_manifest`, `runtime_session_*`.  
  Flat `{product}_{op}` names are **not** listed. HTTP `/p/{product}/{op}` is still a **proxy** (not exec). Public, no OAuth.  
  Tool results are `{ display, result, ledger_tip? }` — show `display` to the user.

## Add to Claude Desktop

Claude Desktop `claude_desktop_config.json` (same shape as Cursor `mcp.json`):

```json
{
  "mcpServers": {
    "aziel-runtime": {
      "command": "node",
      "args": ["cli/mcp-stdio.mjs"],
      "cwd": "/path/to/aziel-runtime",
      "env": {
        "AZIEL_RUNTIME_URL": "https://aziel-runtime.vibelock.workers.dev"
      }
    }
  }
}
```

Restart Claude Desktop after updating. Remote alternative: `POST https://aziel-runtime.vibelock.workers.dev/mcp`. Full stdio notes: [docs/GLAMA.md](docs/GLAMA.md).

## Add to Glama / Cursor MCP (Install Server)

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
- **PeaceLock** is chosen silence / chosen inaction as a first-class receipt (PL-WP-0.1). Not a transcript, not a counterfactual, not a motive score, not a HARD_DUTY waiver. Hosted never invents speech or stores files.
- **4DMap** is a four-axis inspection frame T/Δ/Γ/Π (4DM-WP-1.0). Not a sequential gate, not a truth score, not a Lumen panel, and not an extra door (`domains_are_doors:false`). Does not invent marks or backdate class. Inspection frame after AZPIPE. FragGate claims cite join types. ChainLock may stamp walks.
- **AZBrowser** is the Lamb Lens ethical research browser (AZB-1.0). Not Chromium, not a Tor exit, not an unrestricted proxy. Lamb Lens cites; refuses harmful harvest; never invents visit results. FragGate only. AZNet is separate software (same FragGate door) — pairing is order/token only, not a shared Phase-1 UI.
- **AZNet** is a silent verification side-net (AZN-WP-0.1). Separate product (own Worker `aznet-download-tracker`, own UI). Not a payload host. Garden / stamp / memorial ops require AZBrowser `pair_token` AND `pair_flag` (functional order only). Hosted never stores payloads.

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
| peacelock | peacelock-download-tracker | open, seal, break, show, verify, stamp | **in-process** (HARD_DUTY refuse; ABSENT invariants) |
| azmail | azmail-download-tracker | airlock_classify, scrub, trust_score, mesh_*, keyword_alert_* | **in-process** (FragGate only; mesh default off; not an MTA) |
| azbrowser | azbrowser-download-tracker | ethical_search, lamb_lens_search, navigate, airlock_ingest, tab_*, receipt_list, verify | **in-process** (FragGate only; Lamb Lens; not Chromium) |
| aznet | aznet-download-tracker | pair_status, garden_list, stamp, verify_hash, memorial_*, receipt_verify | **in-process** (FragGate only; never hosts payloads; AZBrowser pair required) |
| azhub | azhub-download-tracker | region_list, place_module, remove_module, tether_*, blank_key_status | **in-process** (FragGate only; Blank Key; not AZInterface; no auto-unlock) |
| azinterface | azinterface-download-tracker | genesis_status, site_state_*, integrity_check, witness_list, page_cycle_status | **in-process** (FragGate only; pre-locked page cycles; not AZHub) |
| aziel-corpus | aziel-corpus-download-tracker (www.azielcorpuslibrary.net) | health, search, example, skill | **in-process** (sample MASTER; live D1/Whisper/OCR per-op proxy) |
| 4dmap | 4dmap-download-tracker | health, skill, pin, span, stack, gap, fork, walk, lens, class, cohort, absence, cap, join, list, example, card_new, card_pin, card_span, card_join, card_walk, card_list, verify_hash, frame_status, axis_describe, walk_trace, card_export, card_import, verify_chain, neighbor_cite | **in-process** (4DM-WP-1.0 / 0.2.0; inspection frame after AZPIPE; not an extra door; not a sequential gate) |

Catalog aliases (also accepted on `/v1/pull/{slug}`): `az-clce` → azclce,
`zion-pattern-solver` → zsolver, `postking-chess` → postking,
`aziel-digital-library` → aziel-corpus, `mia-lock` → mialock,
`peace-lock` → peacelock, `az-mail` / `app-1.0` → azmail,
`az-browser` / `lamb-lens` → azbrowser,
`az-net` / `azn-wp-0.1` → aznet,
`az-hub` / `blank-key` → azhub, `az-interface` / `page-cycle` → azinterface.
`aznet` is not an AZBrowser alias — AZNet is separate software (same FragGate door).
`fourdmap` / `4d-map` / `4dm-wp-1.0` → 4dmap.
AZHub and AZInterface are **sibling softwares** under the same FragGate door (never aliases of each other).

Software hubs (corpus / godlock.uk / azieleliab) list catalog `products[]` after
merge: slug `azhub` / `azinterface` / `aznet` / `azbrowser`, workers
`azhub-download-tracker` / `azinterface-download-tracker` /
`aznet-download-tracker` / `azbrowser-download-tracker`, github
`https://github.com/AzielEliab/azhub` ·
`https://github.com/AzielEliab/azinterface` ·
`https://github.com/AzielEliab/aznet` ·
`https://github.com/AzielEliab/azbrowser`.
AZHub, AZInterface, AZNet, and AZBrowser are **separate products** (own Workers,
own UIs; never nested). Pairing AZNet with AZBrowser is functional order only.
FragGate itself is **not** a 34th true-engine product. Hubs already show its
GitHub; this runtime also publishes a catalog-friendly kernel card at
`catalog.json` `extras[]` / `fraggate`
(`slug: "fraggate"`, `kind: "kernel"`,
`github: "https://github.com/AzielEliab/fraggate"`,
`worker: "fraggate-download-tracker"`, `engine: false`).
FragGate is the kernel door; human UI + counted download is the separate
FragGate Worker app (not nested in AZBrowser, AZHub, or AZInterface):
https://fraggate-download-tracker.vibelock.workers.dev/

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
`aziel-runtime.vibelock.workers.dev`. Product download KV stays on each
product Worker. This runtime's `USES` namespace is the **API use** counter
and ring log (`GET /v1/uses`) — no Authorization, tokens, bodies, or PII.
Production KV ids in `wrangler.toml`: `USES` `c1f89ba6f1db47328d36379cdd69b7ab`,
`AZMAIL_MESH` `ce81cecf8b75412fb7b56e1119e017da`, `AZBROWSER_TABS`
`7487aba1bbb5417fb668de86d8b48f37`. Do not create replacement namespaces.

Same-origin doors (`/runtime` on azielcorpuslibrary.net, godlock.uk,
www.azieleliab.com) should set `X-Aziel-Runtime-Via` or
`X-Aziel-Runtime-Host` (`origin`, `azieleliab.com`, `godlock.uk`,
`azielcorpuslibrary.net`) so host counters stay distinct.

**1.2.0+ requires Durable Object migration tag `v1`** (`RuntimeSession`, SQLite).
The first deploy after the session cut creates the `SESSION` binding. **1.4.0
does not need a new DO migration** — engines run in the same isolate. **1.4.1
reuses that SESSION class. 1.5.0, 1.6.0, 1.6.1, 1.6.2, 1.6.3, 1.6.4, 1.6.5, 1.6.6, 1.6.7, 1.6.8, 1.6.9, 1.6.10, 1.6.11, 1.6.12, 1.6.13, 1.6.14, 1.6.15, and 1.7.0 do not need a new DO migration.**

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

Push to `main` runs `.github/workflows/deploy.yml` (`npx wrangler deploy`) only
when repo secret `CLOUDFLARE_API_TOKEN` is set. Missing token skips the job
(does not fail). Primary deploy is Cursor/wrangler OAuth (Aziel Eliab).
Account `ac575a9b822bea2bed97d0ab73aed238` is the non-secret default. Do not
put tokens in the repo. `workflow_dispatch` is also enabled. The Action passes
`GIT_SHA` so `/v1/software` can stamp `git_sha`.

If this checkout has no wrangler credentials, deploy from the author's machine:

```bash
npx wrangler secret put RUNTIME_TOKEN
npx wrangler deploy
node scripts/probe-live.mjs
# confirm GET /v1/health and /v1/ready and /v1/runtime.json version=1.7.0 role=engine-runtime door=fraggate
# confirm GET /v1/uses returns uses / by_host / by_path / by_day / recent (no increment)
# confirm engine_slugs == true_engine_slugs == all 36 catalog slugs
# confirm POST /v1/session/open → policy → exec each primary op → receipt has engine_digest + ran_in
```

## Library `/runtime`

https://www.azielcorpuslibrary.net/runtime is the Aziel Digital Library front
door that points here. After this runtime ships pull APIs, the corpus Worker
should advertise and reverse-proxy:

- `GET https://www.azielcorpuslibrary.net/runtime` — human front door
- `GET https://www.azielcorpuslibrary.net/runtime/v1/skill` → this `/v1/skill`
- `GET https://www.azielcorpuslibrary.net/runtime/v1/runtime.json` → this `/v1/runtime.json`
- `GET https://www.azielcorpuslibrary.net/runtime/v1/software` → this `/v1/software`
- `GET https://www.azielcorpuslibrary.net/runtime/v1/update/check` → this `/v1/update/check`
- `GET https://www.azielcorpuslibrary.net/runtime/v1/bundle` → this `/v1/bundle`
- `GET https://www.azielcorpuslibrary.net/runtime/v1/pull/{slug}` → this `/v1/pull/{slug}`
- `POST https://www.azielcorpuslibrary.net/runtime/v1/session/open` → this session object
- `GET https://www.azielcorpuslibrary.net/runtime/v1/uses` → this `/v1/uses` (set `X-Aziel-Runtime-Via: azielcorpuslibrary.net`)
- `POST https://www.azielcorpuslibrary.net/runtime/v1/fraggate/call` → this FragGate door (AZMail and every live slug; no side door)

See the companion PR on [AzielEliab/aziel-corpus](https://github.com/AzielEliab/aziel-corpus).

## License

Apache License 2.0. Copyright 2026 Aziel Eliab.
