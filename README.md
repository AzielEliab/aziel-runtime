# aziel-runtime

Aziel Runtime lets AI assistants run 40+ research tools through one door. Install on Glama, then list tools, describe one, and call it. Every call can leave a receipt.

## How to use

1. Click **[Install / Add to Glama](https://glama.ai/mcp/servers/AzielEliab/aziel-runtime)** (also `https://glama.ai/mcp/servers/@AzielEliab/aziel-runtime`).
2. In any MCP client, call the tool you need. The door runs first, then the tool. `confirm=true` writes. `dry_run=true` previews and writes nothing. `background=true` returns Running until a receipt hash exists. Done only with that hash. `tools/list` stays 36.

Diagnostics, if needed: `fraggate_list` → `fraggate_describe {name}` → `fraggate_call {name, op, payload, confirm:true}`.

Worker remote: `https://aziel-runtime.vibelock.workers.dev/mcp`

Example first call: `decisiongate_check` with a short proposal and `dry_run:true`, or `forgereceipts` receipt for a completed task.

MCP `tools/list` is **36** tools. FragGate is the single door. Install order stays Install Server on Glama, then this Worker, then local stdio last. Compatible AI clients are listed below. **Author:** Aziel Eliab.

## Designed purpose

**Aziel Runtime** (`aziel-runtime`) is a node-meshed orchestration suite of MCP-connected software designed to route catalog Softwares through the FragGate door, mint receipts, and coordinate mesh presence. Use it to list, describe, and call product operations over MCP or OpenAPI, then keep the returned receipt. It exists so each Softwares product stays a separate engine behind one door.

## Start

1. `node cli/aziel-runtime.mjs`
2. `node cli/aziel-runtime.mjs session open --local`
3. `node cli/aziel-runtime.mjs session status --local`

The terminal prints a short summary. Add `--json` for the machine object. Help: `node cli/aziel-runtime.mjs --help`. The same three steps are in [`RUN.txt`](RUN.txt).

Softwares purpose copy (`one_line` + `description`) is the designed-to-do addendum on `GET /v1/software` (`src/software-copy.js`). Hubs refresh from that route.

FragGate is THE single public executable door (`fraggate_list` → `fraggate_describe` → `fraggate_call`). Softwares catalog is Plain → Gate → Lock; hubs refresh from `GET /v1/software`. Dual-surface: agents via OpenAPI/MCP; humans via Worker UI + counted `/download`. NodeMesh / QNM read-only suite-presence is ON by default; `GET /v1/mesh` never enables radios beyond that.

**Version 2.0.0-rc1** is the certification-point freeze (not a feature dump): public contract, clean-room reproducibility, and external adversarial pack under `docs/2.0/`. No intentional behavioral breaks from 1.9.3. Remain-OFF untouched. Crawler surfaces keep the abstract above; changelog stays below. **1.9.3** closed remaining AZRT-1.9-GAPS-CLOSE items (isolate AZ-OS ethics session VFS; isolate-safe Ask Jeeves; binding-gated media-run; published independent-validation attestation path — not a third-party lab). **1.9.2** bound Browser Rendering and live D1 MASTER. **1.9.1** closed AZRT-1.9-GAPS-CLOSE isolate-safe verify. **1.9.0** closed AZRT-1.9-CLOSE-1.0. **1.7.11** is the SEO-clarity heritage that locked that lead copy.

Kernel: [AzielEliab/fraggate](https://github.com/AzielEliab/fraggate) (FG-0.1)

**[Try on Glama](https://glama.ai/mcp/servers/AzielEliab/aziel-runtime)** is the primary public host / discovery / install listing (also `https://glama.ai/mcp/servers/@AzielEliab/aziel-runtime`). Worker origin stays the execution / OpenAPI / MCP HTTP surface.

**Entity graph (locked):** Person `@id` [`https://www.azieleliab.com/#aziel`](https://www.azieleliab.com/#aziel) · Runtime SoftwareApplication `@id` [`https://www.azieleliab.com/runtime#runtime`](https://www.azieleliab.com/runtime#runtime). Worker origin is the execution endpoint (`url`). `relatedLink` is the Glama discovery / install host. Identity **Aziel Eliab** only.

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
**Version:** 2.0.0-rc1  
**2.0 pack:** [`docs/2.0/`](docs/2.0/) (contract freeze; self-test ≠ third-party lab)  
**Role:** `engine-runtime` (layer: `catalog+pull+proxy+session+in-process-engines+fraggate`)  
**Door:** `fraggate`  
**Primary host:** [Try on Glama](https://glama.ai/mcp/servers/AzielEliab/aziel-runtime)  
**Worker (execution / OpenAPI / MCP HTTP):** `aziel-runtime` → https://aziel-runtime.vibelock.workers.dev/  
**Entity parent:** https://www.azieleliab.com/runtime  
**Library mirror:** https://www.azielcorpuslibrary.net/runtime  
**Rose-star brand mark:** https://aziel-runtime.vibelock.workers.dev/sigil.png  
**Packaging:** Worker session + in-repo CLI (`node cli/aziel-runtime.mjs`) + stdio MCP (`node cli/mcp-stdio.mjs` / `npm run mcp`). **No counted runtime tarball.**

**Forks are welcome and always allowed.** Do not invent Zenodo DOIs.

## Inspect the code (not the crawler files)

| Behavior | Source | Tests |
|----------|--------|-------|
| FragGate list / describe / call | [`src/fraggate/door.js`](src/fraggate/door.js), [`registry.js`](src/fraggate/registry.js) | `scripts/verify-fraggate.mjs` |
| MCP `tools/list` + `tools/call` | [`src/mcp-surface.js`](src/mcp-surface.js), [`mcp-schema.js`](src/mcp-schema.js) | `scripts/verify-mcp-tdqs.mjs` |
| Session open → policy → exec → receipt → close | [`src/session-core.js`](src/session-core.js) | `scripts/verify-session.mjs` |
| Software catalog | [`src/software-catalog.js`](src/software-catalog.js), [`software-copy.js`](src/software-copy.js) | `scripts/verify-software.mjs` |
| Offline receipt hash | fixture [`fixtures/session-receipt-chain.json`](fixtures/session-receipt-chain.json) | `node scripts/verify-receipt-fixture.mjs` |

Full path map: [`docs/2.0/INSPECT.md`](docs/2.0/INSPECT.md). How to run tests: [`docs/2.0/TESTS.md`](docs/2.0/TESTS.md). Privacy: [`docs/DATA.md`](docs/DATA.md). Review / agent-assisted commits: [`docs/GOVERNANCE.md`](docs/GOVERNANCE.md). `wrangler.toml` `main` is `src/index.js` (unminified). Cloudflare may bundle that same module for deploy — the reviewed artifact is this tree.

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

Crawl / SEO Allow set on `robots.txt`: GPTBot/ChatGPT, Venice, Grok, Google-Extended, GoogleOther, Google-CloudVertexBot, Claude(+Search/User), anthropic-ai, Perplexity(+User), bingbot, Meta-External*, Applebot(+Extended), Amazonbot, DuckDuck/DuckAssist, MistralAI-User, YouBot, CCBot, cohere-ai, cohere-training-data-crawler, Diffbot, AI2Bot(+Dolma), Timpibot, Petalbot, Bytespider, Omgili(+bot), FirecrawlAgent, ImagesiftBot, Cloudflare-AI-Search, FacebookBot, TikTokSpider, Baiduspider*, Yandex.

GitHub About (description / homepage / topics) is documented in [docs/GITHUB.md](docs/GITHUB.md) so indexes see MCP, OpenAPI, and FragGate. Coordinator applies `gh repo edit` from that lock.

## Websites / Live sites

**[Try on Glama](https://glama.ai/mcp/servers/AzielEliab/aziel-runtime)** is the primary public host / discovery / install listing. This Worker homepage stays the **API / MCP / OpenAPI** execution surface. Human Softwares hubs are **azieleliab.com**, **Aziel Corpus Library**, and **GodLock.uk**. Sister archive: **[He Didn't Jump](https://www.hedidntjump.com/)**.

The Worker ships a FoldLock-packed **library tip** (index cite + sample MASTER + About Aziel) — not the entire live corpus. Verify via FragGate `foldlock/pack-verify`; open via `aziel-corpus/tip-pack`. Honesty: [`docs/corpus-fold-pack.md`](docs/corpus-fold-pack.md).

Every Worker launch (homepage, `/about`, every `/p/{slug}`, HTML Softwares/describe shells) includes product-specific `#hashtag` parts plus the same About Aziel block. Shared partial `workerLaunchHtml`. Product Workers inherit About Aziel + the fold tip by copy; hashtag parts stay local. Rule: [`docs/WORKER-LAUNCH.md`](docs/WORKER-LAUNCH.md).

| Surface | URL |
|---------|-----|
| **Primary host / discovery / install** | https://glama.ai/mcp/servers/AzielEliab/aziel-runtime |
| Official site | https://www.azieleliab.com/ |
| Runtime hub (entity parent) | https://www.azieleliab.com/runtime |
| FragGate kernel | https://github.com/AzielEliab/fraggate |
| Canonical GitHub | https://github.com/AzielEliab/aziel-runtime |
| Runtime Worker / MCP / OpenAPI | https://aziel-runtime.vibelock.workers.dev/ |
| Library mirror (reverse-proxy) | https://www.azielcorpuslibrary.net/runtime |
| Aziel Corpus Library | https://www.azielcorpuslibrary.net/ |
| Aziel Eliab (library) | https://www.azielcorpuslibrary.net/AzielEliab |
| Software page | https://www.azielcorpuslibrary.net/software |
| GodLock.uk | https://godlock.uk — https://godlock.uk/AzielEliab — https://godlock.uk/software |
| He Didn't Jump (sister archive) | https://www.hedidntjump.com/ |
| Trades-Runtime (sister product, cite-only) | https://github.com/AzielEliab/trades-runtime — Worker https://trades-runtime.vibelock.workers.dev — MCP `/mcp` — download `/download`. Not a FragGate true-engine. `fraggate_call` does not execute company ops. |
| Repos | https://github.com/AzielEliab/aziel-corpus · https://github.com/AzielEliab/godlock · https://github.com/AzielEliab/hedidntjump.com · https://github.com/AzielEliab/trades-runtime |
| Donate (canonical) | https://www.azieleliab.com/donate |

Glama **Install Server** is live ([Try on Glama](https://glama.ai/mcp/servers/AzielEliab/aziel-runtime)). Glama release **2.0.7** (Install Server ON, Auto-Release ON). Worker / server package stays **2.0.0-rc1**. Order: one-click Install Server, then remote `POST https://aziel-runtime.vibelock.workers.dev/mcp`, then local stdio. See [docs/GLAMA.md](docs/GLAMA.md).

Public identity: **Aziel Eliab** only. Do not invent Zenodo DOIs.

## Dual surface (product law)

1. **Agent / MCP** — Software runs through the agent. Show `display.title` / `display.summary` / `display.fields`, then take the next input. Session, OpenAPI, and HTTP plumbing stay invisible unless asked for. **One door — discover, route, refuse.** Download via `GET /v1/update/check` → `download_url` or `GET /v1/pull/{slug}`. Mesh-resident **azcorpus** + **azlibrary** website designs download from `GET /v1/software` `website_designs` (open for all AI clients). Upload/ingest/receipt via `fraggate_call` (azbrowser `airlock_ingest`, peacelock `upload_envelope`, forgereceipts `verify`, miragegrid `verify-receipt` / `bridge`). **azlibrary upload** is API token only — never embed the secret. Same ops on `/openapi.json`.
2. **Human software** — This Worker UI, local install, and counted `/download` remain complete developed software. Flutter `mobile/` is not vendored in this repo.

### Cold multi-shelf (COLD-MULTI-SHELF-1.0)

Runtime cites the same honesty as live corpus [GET /shelves](https://www.azielcorpuslibrary.net/shelves) (corpus#96). `GET /shelves` · `GET /v1/shelves` · `/cite.json` `shelves`. Person `@id` https://www.azieleliab.com/#aziel.

Plane A LIVE: 5 published surfaces (4 CF hubs + GitHub) / 2 family radii. One independent live (`cf-github`). Plane B SLOT: Codeberg https://codeberg.org/AzielEliab/aziel-lockset-tip hash-verify PASS still SLOT; archive.org PASS https://archive.org/details/aziel-lockset-tip + https://archive.org/details/aziel-lockset-tip_202609 (same blast_radius `archive-org`; pack `b549362c0736ddb54ddc488812327c464e0da1167281f92fd1a4263eedf5df37`) still SLOT; Framagit URL null (third ALL-TARGETS) Zenodo tip-pack SLOT (`CNS-ZENODO-NOT-LIVE`); `doi` null. Plane C USB SLOT until `CNS-OPERATOR-ATTEST`. This Worker is the same Plane A tunnel. No visible 15:20.

### Cap-7 semantic bridge (not ICANN)

Cap-7 is the MirageGrid auto-generate **.az** layer. It duplicates the four hub sites and shifts with StaticLock (catalog product StaticClock, slug `staticclock`) and MirageGrid cloak, paired with AZVPN. `design_of: hub_designs`. `resolves_to_hub: false` on Cap-7. Standard internet does not reach Cap-7. Real duplications: `azgrid`, `azcloak`, `azvault`, `azshift`. False sites: `azbooth`, `azflag`, `azstandby`. Factory duplication cite is LIVE. Internet reaches the AZ domains (`AZ.AzielEliab.AZ`, `AZ.AzielCorpusLibrary.AZ`, `AZ.Godlock.AZ`, `AZ.HeDidntJump.AZ`) through azieleliab.com, azielcorpuslibrary.net, godlock.uk, and hedidntjump.com. Those drop-ins are `public_icann: true` and `resolves_to_hub: true`, shuffle once to one of four, stand alone, and freeze after the hubs go down. Live nodes anchor them. Cap-7 `public_icann: false`. Not a fifth product. AI pulls metadata from MirageGrid Worker `/bridge` or `GET /v1/mesh/az-generator`. Update shuffle: `fraggate_call { slug: "miragegrid", op: "shuffle" }` lands one mesh name (factory land LIVE; not a public HTTPS door). No live AZ-GEN registrar. No ICANN `.az` ccTLD purchase. No visible 15:20. `GET /v1/mesh` never enables radios. Mesh browse: AZNet + AZBrowser via FragGate.

## FragGate door

Public MCP `tools/list` is **36 live tools**. First call: `@aziel-runtime` → `fraggate_list` → `fraggate_describe` → `fraggate_call` (`foldlock` / `fold-preview`, or `decisiongate_check` with `dry_run=true`). The same list includes `runtime_skill`, `fraggate_verify`, `library_lookup`, suite `mesh_*`, append-only `chainlock_*` and `memory_*`, and catalog helpers. `runtime_run` and `runtime_session_*` are advanced/internal.

Every catalog product is a **hashed registry** entry (`name`, `slug`, `digest`, `status`, public `ops`). Status is `live` | `stub` | `local_only`.

`stub_ops` / `stub_op_count` are named refuse verbs (never hosted), not extra catalog Software engines. `stub_count` is registry entries whose status is `stub` (none after 1.9.0 — **AZChat** is LIVE+bound). EmbryoLock is a live catalog engine (`live-with-local-destructive-boundary`); wipe / scorch / unlock stay `FG-STUB` on the public mesh. FragGate `live_count + local_only_count + stub_count ===` FragGate `product_count`.

**Live on the public mesh** (via `fraggate_call`): every catalog Software product that makes sense on a public agent door — advisory / score / classify / gate / search / preview / render / verify / hash / receipt / game / overlay / route / status, plus the original five (DecisionGATE, GodLock, FoldLock, AZ-CLCE, Aziel Digital Library). VeilLock stays **local_only** (device-local camera/screen). MCP `tools/list` is those 36 names. Start on the FragGate door.

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

Local CLI (Worker client by default; `--local` writes a session file and prefers vendored engines; `--jail` runs the engine in a child Node process). The terminal prints a short summary. Add `--json` for the machine object:

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
| Ban / blocked-endpoint failover | https://aziel-runtime.vibelock.workers.dev/survival (aliases `/v1/survival`, `/doors`, `/failover`) |
| LLM crawler | https://aziel-runtime.vibelock.workers.dev/llms.txt (also `/ai.txt`) |
| Human help | https://aziel-runtime.vibelock.workers.dev/help.txt · `/addendum.txt` · `/help/softwares.txt` · `/help/fraggate.txt` · `/help/glama.txt` |
| Person (machine) | https://aziel-runtime.vibelock.workers.dev/person.jsonld |
| Who-is (machine) | https://aziel-runtime.vibelock.workers.dev/who-is |
| robots.txt | https://aziel-runtime.vibelock.workers.dev/robots.txt |
| sitemap.xml | https://aziel-runtime.vibelock.workers.dev/sitemap.xml |
| sitemap-index.xml | https://aziel-runtime.vibelock.workers.dev/sitemap-index.xml |
| MCP (JSON-RPC over HTTP, public, no OAuth) | `POST` https://aziel-runtime.vibelock.workers.dev/mcp |
| MCP stdio (Glama / Claude Desktop) | `node cli/mcp-stdio.mjs` — [docs/GLAMA.md](docs/GLAMA.md) |
| Glama listing | https://glama.ai/mcp/servers/AzielEliab/aziel-runtime |
| Health | https://aziel-runtime.vibelock.workers.dev/v1/health |
| API uses (no increment, no PII) | https://aziel-runtime.vibelock.workers.dev/v1/uses |
| Stats / awareness rollup (read-only) | https://aziel-runtime.vibelock.workers.dev/v1/stats-rollups |
| Ready | https://aziel-runtime.vibelock.workers.dev/v1/ready |
| Rose-star brand mark | https://aziel-runtime.vibelock.workers.dev/sigil.png |

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

Product Worker crawl template: [docs/PRODUCT_SEO.md](docs/PRODUCT_SEO.md). QNM suite rollup: [docs/NODE_MESH.md](docs/NODE_MESH.md). Cross-network survival umbrella: [docs/designs/CROSS-NETWORK-SURVIVAL-1.0.md](docs/designs/CROSS-NETWORK-SURVIVAL-1.0.md). Companion NO-LIE / NO-REWRITE: [docs/designs/NO-LIE-NO-REWRITE-1.0.md](docs/designs/NO-LIE-NO-REWRITE-1.0.md). Donate plan (cite-only, not a Softwares product): [docs/designs/AZL-DONATE-1.0.md](docs/designs/AZL-DONATE-1.0.md).

## Donate (runtime + product Worker footer)

Canonical rails live on hubs: **https://www.azieleliab.com/donate**. Hub Donate pages include five QRs that encode payment URIs (BTC / ETH / LTC / XRP / DOGE). This runtime only links. Do not invent wallet addresses or tokens. Do not duplicate those five QRs on runtime or download-trackers.

- **Runtime Worker UI footer** — one line: `Donate` → `https://www.azieleliab.com/donate`
- **Product download-tracker Workers** — same footer pattern: `Support the work` → `https://www.azieleliab.com/donate`

This repo does not own product Workers. Copy that one line into those repos. Addresses stay operator paste on the hub.

## Designs

Current suite software designs (AZL / SEC-FEAT / QNM-WP / NODE-OPS / **AZL-DONATE-1.0** / **CROSS-NETWORK-SURVIVAL-1.0** / **NO-LIE-NO-REWRITE-1.0**) plus LIVE fabric papers (CL-WP-0.4, AP-WP-0.2, SG-WP-0.1, LS-WP-0.1, RL-WP-0.1-runtime, **QNS-CD-1.0**, **ACT-RECEIPT-1.0** — not Softwares-tab products): [docs/designs/](docs/designs/). Author: **Aziel Eliab** only. MCP `chainlock_*`. `GET /v1/mesh` never enables. **QNS-CD-1.0** is the Quantum Node Signal packet-transfer coding design (photon QNS1 1.3). Implementation is local `qnsd` in [AzielEliab/qnm-node](https://github.com/AzielEliab/qnm-node). `GET /v1/qns` cites only — the public Worker does not proxy local via emit. Every `/v1/software` card carries `qns_cd`. Do not add QNS as a Softwares-tab product. **ACT-RECEIPT-1.0** is the public four-field action-receipt mesh copy. The chain lives on [corpus /receipts](https://www.azielcorpuslibrary.net/receipts). `GET /v1/receipts` cites; append runs after FragGate list/call and `POST /mcp` when `RECEIPT_APPEND_TOKEN` is set (fail-open). Do not add ACT-RECEIPT as a Softwares-tab product. **CROSS-NETWORK-SURVIVAL-1.0** is the umbrella survival law. If network and data die tomorrow, the chain survives on cold shelves (hosts / DOI / git / vault). Machine tip: `/cite.json` `survival.tip` and `/llms.txt`. Do not add it as a Softwares-tab product. **NO-LIE-NO-REWRITE-1.0** is companion law under that umbrella (does not replace the machine tip): receipts that still hash; copies not all on one tunnel; no rewrite key; the network is never allowed to lie even to self-preserve. Do not add it as a Softwares-tab product. `GET /v1/azpipe/arch` cites the locked MASTER-33 strip (same payload as `GET /v1/fraggate` `pipeline`). Not a Softwares-tab door.

## Add to ChatGPT (GPT Actions)

1. Create a GPT (or open GPT Actions).
2. **Import from URL** → `https://aziel-runtime.vibelock.workers.dev/openapi.json`
3. No authentication. CORS `*`.
4. Ask the GPT to call `fraggate_list`, then `fraggate_call`. Named live modules: `decisiongate_check`, `library_lookup`. Session tools and `runtime_run` are advanced/internal.

## Add to Grok

- **Custom tool / OpenAPI:** import `https://aziel-runtime.vibelock.workers.dev/openapi.json`
- **MCP remote:** `POST https://aziel-runtime.vibelock.workers.dev/mcp`  
  Methods: `initialize`, `tools/list`, `tools/call`.  
  `tools/list` is 36 live tools. First call: `fraggate_list` → `fraggate_describe` → `fraggate_call`.  
  `runtime_run`, `runtime_manifest`, and `runtime_session_*` are advanced/internal.  
  HTTP `/p/{product}/{op}` stays a proxy. Public, no OAuth.  
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

## Add to Glama

Install order:

1. **Install Server (live)** — [Try on Glama](https://glama.ai/mcp/servers/AzielEliab/aziel-runtime) (also `https://glama.ai/mcp/servers/@AzielEliab/aziel-runtime`). One-click Install Server / Deploy. Glama release **2.0.7**. Install Server ON. Auto-Release ON. Worker / server package stays **2.0.0-rc1**.
2. **Remote MCP** — `POST https://aziel-runtime.vibelock.workers.dev/mcp` (`initialize`, `tools/list`, `tools/call`). User-Agent `Mozilla/5.0`. Public, no OAuth.
3. **Local stdio (last)** — [`cli/mcp-stdio.mjs`](cli/mcp-stdio.mjs) bridges to that same Worker `/mcp`. [`glama.json`](glama.json) + [`Dockerfile`](Dockerfile) CMD `["node", "cli/mcp-stdio.mjs"]`.

```bash
node cli/mcp-stdio.mjs
npm run mcp
docker build -t aziel-runtime-mcp .
docker run --rm -i aziel-runtime-mcp
# if the host resolver cannot see Cloudflare:
# docker run --rm -i --dns 1.1.1.1 aziel-runtime-mcp
```

Default bridge needs outbound **DNS + HTTPS** to `*.vibelock.workers.dev` / Cloudflare. A DNS miss is `FG-DNS` (`remote:false`). `--local` or `AZIEL_RUNTIME_MCP=local` is explicit in-process. Optional `RUNTIME_TOKEN` / `AZIEL_RUNTIME_TOKEN` when `REQUIRE_TOKEN=1`. Verify a real call hash: [docs/2.0/INSPECT.md](docs/2.0/INSPECT.md).

**First call** after connect: `@aziel-runtime` → `fraggate_list` → `fraggate_describe` → `fraggate_call`. Example: `{ "slug": "foldlock", "op": "fold-preview", "payload": { "text": "the cat and the dog" } }`, or `decisiongate_check` with `dry_run=true`. `tools/list` is 36 live tools. ChainLock and memory are append-only.

Re-claim on the Glama Score tab after any `glama.json` change (`maintainers` = `AzielEliab`) so Schema and keywords refresh. Full steps: [docs/GLAMA.md](docs/GLAMA.md). Public identity: **Aziel Eliab** only.

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
- **SpectralLock 0.3.1** hosted overlay is a 256px preview, not a spectrometer, not forensic. Wheel paint is a membership-tint plane separate from the spectral triad. Inject ON is paint, not pigment recovery. Restore lost pigment is LIVE on FragGate ops `pigment` and `restore-pigment` (`listPigment` / `pigmentFromB64`) and refuses `SL-PIGMENT-GONE` when the faded signal is gone. AMOE is not a live product. Leftover-bytes recover is honest (present container bytes only); incremental PDF revision graphs + per-revision copies are honest; opaque refuse is honest; universal recover marks 7z / HEIC / HEIF SLOT; handwriting is a 256px PNG ink-scan heuristic (not ESDA / court cert; hosted JPEG SLOT); never OCR-from-black-box. Unredact / recover / handwriting stay on spectrallock-download-tracker (`/v1/unredact`, `/v1/recover`, `/v1/handwriting`) — not FragGate door ops. UV is not a lamp. Balance/lemon/indent never invent marks. Full pipeline is the Python package.
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
| spectrallock | spectrallock-download-tracker | health, modes, overlay | **in-process** (256px PNG preview; inject ON/OFF; leftover-bytes + revision-graph + recover/handwriting honesty; no unredact/recover/handwriting door) |
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
| azinterface | azinterface-download-tracker | genesis_status, site_state_*, integrity_check, witness_list, page_cycle_status | **in-process** (FragGate only; suite shell, package 0.1.0; pre-locked page cycles; local pipeline_arch / withdraw / scorch_local / pair_* stay off the public door) |
| aziel-corpus | aziel-corpus-download-tracker (www.azielcorpuslibrary.net) | health, search, example, skill | **in-process** (sample MASTER; live D1/Whisper/OCR per-op proxy) |
| 4dmap | 4dmap-download-tracker | health, skill, pin, span, stack, gap, fork, walk, lens, class, cohort, absence, cap, join, list, example, card_new, card_pin, card_span, card_join, card_walk, card_list, verify_hash, frame_status, axis_describe, walk_trace, card_export, card_import, verify_chain, neighbor_cite, memory_cite, memory_observe, library_pin, plot, possibility, pattern_recall, lattice_tip, poison_refuse | **in-process** (4DM-WP-1.0 / 0.3.0; inspection frame after AZPIPE; not an extra door; not a sequential gate) |

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

Push to `main` runs `.github/workflows/deploy.yml` (`npx wrangler deploy --keep-vars --var GIT_SHA:<sha>`) only
when repo secret `CLOUDFLARE_API_TOKEN` is set. Missing token skips the job
(does not fail). `--keep-vars` leaves existing Worker vars in place. Primary deploy is Cursor/wrangler OAuth (Aziel Eliab).
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

## Library `/runtime` mirror

https://www.azielcorpuslibrary.net/runtime is the Aziel Digital Library
reverse-proxy / mirror of this Worker. Primary public host / discovery is
[Try on Glama](https://glama.ai/mcp/servers/AzielEliab/aziel-runtime). The
corpus Worker advertises and reverse-proxies:

- `GET https://www.azielcorpuslibrary.net/runtime` — library mirror
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
