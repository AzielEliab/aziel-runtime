# Runtime audit — 2026-09-10

**Repo:** [AzielEliab/aziel-runtime](https://github.com/AzielEliab/aziel-runtime)  
**Live host:** `https://aziel-runtime.vibelock.workers.dev/` — **1.6.13** (deployed `main`)  
**Auditor branch:** this PR  
**Method:** design corpus → expected modules/routes → grep/read live code + OpenAPI + MCP + live Worker probes. No large features shipped. No Node Gate. No mesh enable from public GET. No invented `CLOUDFLARE_API_TOKEN`. Public identity **Aziel Eliab** only.

**Open PR that lands missing wires:** [#40](https://github.com/AzielEliab/aziel-runtime/pull/40) `cursor/wire-azpipe-lattice-b4ba` (AZPIPE / SweepGate / ChainLock / LOCKSET / RL packed catalog). Not merged, not deployed.

**Not in this repo:** `AIH-WP-1.3` / “Spiderweb” (no matches). Mesh companion on live + papers is **AIH-WP-1.1**. Full `qnm-node/` process is local (parent package). Flutter `mobile/` is claimed in skill/README, not vendored here. `TUN-WP-0.1` and **RL-WP-0.1-library** are library-scope (aziel-corpus), not this Worker.

---

## Executive summary

- **Deployed 1.6.13 is a working FragGate engine-runtime.** 33 true in-process engines (`engine_digest`), EmbryoLock stub-only (live `FG-STUB` on `unlock`), thin MCP door, DecisionGATE before exec, isolate ask/refuse ledger, dual surface (MCP/OpenAPI + human Worker UI), full AI-client discoverability (`/v1/skill`, `/llms.txt`, `/cite.json`, sitemap, robots). Identity on live JSON is **Aziel Eliab**.
- **QNM-BUILD-1.0 suite rollup is LIVE and law-compliant.** `GET /v1/mesh` returns `enabled: false`, `rollup: {live:0, locked:0, isolated:0}`; empty enable → `MESH-NEED-BEARER`; `bearer: "login"` → `MESH-BAD-BEARER`; radios stay OFF after those probes. Mesh is a **kernel extra**, not a Softwares-tab product. No Node Gate / IP UI in this Worker.
- **Pack1 papers (SEC-FEAT / AZL / QNM-WP / NODE-OPS) are cited on the Worker** (skill, llms, cite, sitemap). Pack2 papers **exist on `main` as git files** (merged #37/#38/#39) but are **not** in `SUITE_DESIGNS` — so live `/cite.json` / skill Designs / sitemap **omit** CL/AP/SG/LS/RL. That cite-wire is on #40, not on deployed `main`.
- **Pack2 lattice is DOCS-ONLY on deployed `main`.** No `src/azpipe.js`, `sweepgate.js`, `chainlock/*`, `lockset.js`, `packed-catalog.js`. Hop list is not admitted around `fraggate_call`. RL packed catalog + visitor-cap law is not on the live hot path.
- **The live cost path still matches the RL bill story.** `GET /v1/software` is `Cache-Control: no-store` and **increments USES** (live `by_path["/v1/software"] = 1150` of `uses.total ≈ 5534`). Homepage `GET /` fans out `loadStatsMap` → 33 product `/stats` fetches. That is the ~191-ops-class walk RL-WP-0.1-runtime exists to kill. #40 cuts catalog KV/USES and homepage fan-out.
- **Do not treat #40 as a Softwares-tab product drop.** Those modules are runtime fabric (not catalog slugs). Donation in #40 is `addresses: null` (operator paste later — do not invent wallets).
- **No one-file broken wire on `main` was patched in this audit.** Remaining closes are merge/deploy of #40, then leftover paper-complete ChainLock verbs / durable visitor buckets if isolate Maps prove insufficient.

---

## Scorecard

Status key: **LIVE** = on deployed 1.6.13 and verified · **PARTIAL** = some door exists, design not fully admitted · **DOCS-ONLY** = paper on `main`, no live module · **PR-WIRE** = implemented on #40, not on `main` · **ABSENT** = not in this repo.

| Design / law | Expected | Live `main` (1.6.13) | #40 | Class |
| --- | --- | --- | --- | --- |
| **SEC-FEAT-1.0** | Hashed registry, stubs, DecisionGATE, thin MCP, mesh GET never enables, ledger, identity, EmbryoLock not an engine | All present. 124-class stub refuses. `FG-HALLUC-TOOL` / `FG-STUB` / `FG-GATE-REFUSE` | Unchanged + SweepGate isolate code | **LIVE** |
| **AZL-VOL-1.0** | Software-tab 34 + door extras FragGate/mesh + runtime host; Q×act ledger | 33 live + EmbryoLock stub; extras `fraggate`+`mesh` (`kind: kernel`, `engine: false`); ledger is **isolate memory** (cap 64), not durable Q×act | ChainLock/LOCKSET add local memory; still not a public ledger | **PARTIAL** (catalog LIVE; durable lattice DOCS/PR) |
| **AZL-ARCH-1.0** | 39 named: 34 tab + 2 extras + runtime + qnm-node + anon-broadcast | Tab+extras+runtime LIVE. `qnm-node/` and anon-broadcast **not hosted** (correct) | Same | **LIVE** (faces) / **DOCS-ONLY** (local fabric) |
| **AZL-WP-1.1** | One door; UI=MCP; hash question/act; two mesh planes; Clock ≠ Lock; no 36th Lattice slug | FragGate door LIVE. No Lattice software slug. Clock/Lock sort law on `/v1/software`. Exec pipe is DecisionGATE → handler, not the full AZPIPE hop list | Hop list admitted around `fraggate_call` | **PARTIAL** on main / **PR-WIRE** hop list |
| **QNM-WP-1.0** | Local ON / public rollup OFF; GET never enables; no Node Gate; no fake cell of 25 | Public rollup LIVE, default OFF. No 25-peer claim. Local process not in this package | Same | **LIVE** (rollup) |
| **NODE-OPS-1.0** | Surface law; phoenix local wait; no Node Gate on faces | Reflected in mesh stubs (`phoenix-hunt`, `heal`, `controller`) and copy | Same | **LIVE** (surface law) / **DOCS-ONLY** (phoenix loop process) |
| **AP-WP-0.2 AZPIPE** | Magic FLD3; inbound `frag→sweep→fold→static→fold→entry→frag→toolkits`; fld3-wire fold | **No module** | `src/azpipe.js` wraps `fraggate_call`; `ssn` folds `[FLD3:block]` | **DOCS-ONLY** → **PR-WIRE** |
| **SG-WP-0.1 SweepGate** | Airlock; poison/malware-class isolate; off-origin isolate only inbound+untrusted | **No module** | `src/sweepgate.js` `inspect(...)`; official airlock text (not ChainLock paste) | **DOCS-ONLY** → **PR-WIRE** |
| **CL-WP-0.4 ChainLock** | Append-only stamps; MCP `chainlock___*` set; no Node Gate | **No module** | `src/chainlock/*`; MCP **subset**: `append/tip/recall/verify/seal` (paper also: status, walk, compact, door, mesh_cite, library_sync, tether, interact, pipe) | **DOCS-ONLY** → **PR-WIRE / PARTIAL** |
| **LS-WP-0.1 LOCKSET** | Fail-closed seal; cite `https://godlock.uk`; do not write public ledger | **No module** | `src/lockset.js`; GodLock cite, `pull:false`, `isolate:true`; operator posts hash | **DOCS-ONLY** → **PR-WIRE** |
| **RL-WP-0.1-runtime** | Packed catalog; Cache-Control; visitor caps; operator uncapped; catalog GET always 200/full | Catalog is in-isolate JSON (good) but **no-store**, **USES increment**, homepage **33× /stats** | Packed + `s-maxage=300`; skip USES on catalog/update; homepage no fan-out; soft caps on expensive fan-out only; operator token bypass | **DOCS-ONLY / BROKEN cost path** → **PR-WIRE** |
| **RL-WP-0.1-library** | Packed library index | Out of scope (aziel-corpus) | Correctly not implemented here | **ABSENT (correct)** |
| **TUN-WP-0.1** | Library tunnel / standby Worker | Out of scope | Not admitted (correct) | **DOCS-ONLY (correct)** |
| **QNM-BUILD-1.0 + AIH-WP-1.1** | `/v1/mesh` rollup; bearer enable; Live Nodes; MCP `mesh_*`; FragGate `slug=mesh` | LIVE + live-probed | Same | **LIVE** |
| **AIH-WP-1.3 Spiderweb** | User corpus named this as mesh companion | **No file, no cite** | No | **ABSENT** (this repo cites 1.1) |
| **FragGate FG-0.1** | Hashed registry, DecisionGATE, ledger; integrates over catalog; **not** Softwares-tab #31 | extras `kind:kernel`; kernel card beside products; not in `software[]` | AZPIPE around door | **LIVE** |
| **Dual surface** | MCP/OpenAPI + full human Worker UI | Homepage + product cards + MCP `tools/list` (26 tools) + OpenAPI 41 paths | Adds `chainlock_*` MCP; homepage cacheable | **LIVE** |
| **Softwares / engine_digest** | True engines; EmbryoLock stub refuse | 33 `true_engine_slugs`; embryolock `engine:false`; live `FG-STUB` | Same | **LIVE** |
| **Discoverability** | skill, llms, cite, sitemap, robots; full AI client set | All 200; 16 named clients present; GPTBot Allow | Pack2 added to `SUITE_DESIGNS` | **LIVE** (Pack2 cite **PARTIAL** on main) |
| **Identity** | Aziel Eliab ONLY | Live health/mesh/software/cite `identity: Aziel Eliab`; Elroi = `alternateName` only | Same | **LIVE** |

---

## RED blockers

These block “everything currently works per the TOTAL design plan” or keep the live bill class. They are **not** “the Worker is down.”

1. **Pack2 fabric is not on the deployed Worker.** Papers are on `main`. Modules and `fraggate_call` hop-list admission live only on **#40**. Until merge+deploy, AZPIPE / SweepGate / ChainLock / LOCKSET / packed-RL are **DOCS-ONLY**. Agents and hubs cannot call that fabric on 1.6.13.
2. **Live catalog/homepage still walks like the RL evidence window.**  
   - `GET /v1/software` → `Cache-Control: no-store`, counted on USES (`1150`).  
   - `GET /` → `loadStatsMap(env)` fans out every product Worker `/stats` (33 upstream GETs, 2s timeout each).  
   - `shouldIncrementUse` treats `/v1/software`, `/v1/catalog.json`, `/v1/update/*` as incrementing `/v1/` paths.  
   This is the class of walk RL-WP-0.1-runtime Step 1–2 exist to stop. #40 is the intended close.
3. **Do not “fix” cost by inventing a Node Gate, IP panel, or pasted `CLOUDFLARE_API_TOKEN`.** Operator exclude is the existing `RUNTIME_TOKEN` / Access-style header (server-side). Donation addresses stay operator paste — #40 correctly ships `addresses: null`.

---

## YELLOW gaps

Integration / completeness — not law breaks.

| Gap | Where | Note |
| --- | --- | --- |
| Pack2 not in live `SUITE_DESIGNS` | `src/seo.js` on `main` lists only Pack1 | Live `/cite.json` `designs.papers` = SEC-FEAT, AZL-VOL, AZL-ARCH, AZL-WP-1.1, QNM-WP, NODE-OPS. Skill/llms/sitemap match. #40 adds CL/AP/SG/LS/RL-runtime. |
| AIH-WP-1.3 Spiderweb | User corpus vs this repo | Mesh `companion` is **AIH-WP-1.1** everywhere (live mesh, skill, NODE_MESH.md, verify-mesh). No Spiderweb paper to wire. Do not invent it here. |
| FragGate ledger durability | `src/fraggate/ledger.js` | Hash-chained, cap 64, **per-isolate**. AZL-VOL Q×act / TemporalLock public evidence is not this tip. #40 ChainLock is the walkable memory — still Worker-local (memory or `USES` `chainlock|`). |
| OpenAPI holes | Live `/openapi.json` 41 paths | Present: skill, software, fraggate, mesh, session, uses, update, catalog, SEO files. **Missing:** `/`, `/mcp`, `/openapi.json`, `/v1/runtime` alias, `/p/{product}/{op}` proxy. Dual-surface HTTP still works; Actions importers will not see MCP/proxy. |
| `exist.mcp` stale vs `tools/list` | `PUBLIC_DOOR_TOOLS` in `fraggate/codes.js` | Refuse envelopes list 7 tools. Live MCP `tools/list` has **26** including `mesh_*` + catalog helpers + advanced session. Agents copying `exist.mcp` will miss mesh. |
| ChainLock MCP vs CL-WP-0.4 | #40 | Paper: status, append, walk, recall, verify, compact, door, mesh_cite, library_sync, tether, interact, seal, pipe. #40 ships five named tools. `interact` exists internally; SSH stamps / vault jsonl path are documented, not a public FUSE. |
| RL visitor buckets | #40 `packed-catalog.js` | Isolate `Map` on `env.__aziel_rl_bucket` — not durable across isolates. Soft caps **do not** starve catalog/HTML (correct vs later #40 commits). Operator token bypasses. Cycle $80–$100 Cloudflare budget alert is **operator dashboard**, not code. |
| #40 ChainLock on USES KV | `chainlock/store.js` | Fallback `KvStore(env.USES)` under `chainlock|`. Heavy append/recall could re-bill KV. Prefer memory / dedicated binding; do not `list()` the whole namespace on the hub catalog path. |
| Homepage lastmod | `LASTMOD = "2026-09-06"` | Sitemap/software `updated_at` still 2026-09-06 while version is 1.6.13 (2026-09). Cosmetic. |
| Flutter `mobile/` | README / skill | Claimed as required human surface. **Not in this repo.** Counted `/download` is per-product Worker, not a runtime tarball. |
| `qnm-node/` | NODE_MESH / QNM-WP | Correctly **not** hosted. Views/MCP/downloads `qnm_s: false`. |
| AZMail mesh vs suite mesh | Catalog / skill | Product-local `azmail/mesh_*` stays a mail ring. Suite `mesh_*` is QNM rollup. Do not unify (already documented). |
| Mesh `digest: null` | FragGate describe `slug=mesh` | Correct — rollup kernel, not a true engine. Do not mint `engine_digest` for mesh. |
| Donation tab | RL §7 | Not on `azieleliab.com` from this repo. #40 JSON stub only. Do not invent wallet addresses. |
| Library RL / TUN | Pack2 companions | Belong on aziel-corpus / library origin. Do not pack library PDF bodies into this Worker. |

---

## GREEN confirmed

Probed 2026-09-10 against `aziel-runtime.vibelock.workers.dev` (User-Agent `Mozilla/5.0`) and `main` + #40 trees.

- **Health / ready 200**, `version=1.6.13`, `role=engine-runtime`, `door=fraggate`, `identity=Aziel Eliab`, `count=33`.
- **`GET /v1/software` 200**, `count=34` (`live_count=33`, `stub_count=1`). Sort Plain→Gate→Lock. EmbryoLock `status=stub`, `engine=false`, `local_not_hosted=true`. Every card has `mesh.enabled_default=false`. Mesh is **not** in `software[]`.
- **`GET /v1/catalog.json` extras:** FragGate + Quantum Node Mesh, `kind: kernel`, `engine: false`.
- **`GET /v1/mesh` + `/status`:** `enabled=false`, `bearers=[]`, rollup zeros, `qnm_s=false`, `scores=false`, `leaderboard=false`. GET does not enable. Empty POST enable refused. Login-named bearer refused. Status after refuses still OFF.
- **FragGate:** hashed `registry_digest`; live describe `embryolock` stub; `fraggate_call` embryolock/unlock → `FG-STUB` + ledger tip; describe `mesh` live with stub ops `login/gate/ip-panel/publish/heal/...`.
- **MCP `tools/list`:** 26 tools — FragGate pipeline, `decisiongate_check`, `library_lookup`, suite `mesh_*`, `runtime_software` / bundle / pull, advanced session/`runtime_run`. No flat `{slug}_{op}` pile.
- **OpenAPI** documents software + mesh + fraggate + session + uses + update. Compatible-client list on `/llms.txt` includes ChatGPT, Grok, Venice, Claude, Cursor, Glama, Perplexity, Copilot, Gemini, Mistral, Meta AI, Apple Intelligence, Amazon Q, DuckAssist, You.com, Cohere.
- **robots.txt** Allow `/` for GPTBot, Google-Extended, ClaudeBot, PerplexityBot, Applebot, Amazonbot, YouBot, cohere-ai. No GPTBot Disallow.
- **DecisionGATE** runs in `admitCall` before any handler; BLOCK/REVISE → no exec.
- **Stub surface (SEC-FEAT):** ark unlock/encrypt/scorch/wipe; azmail smtp/login/harvest; azieltether vpn/arm; miragegrid hop/tunnel; veillock inject; embryolock entire engine — named refuse, not silent success.
- **No Node Gate / IP allow-block UI** in `src/` routes. Mesh forbidden bearer tokens include `gate`, `ip`, `ip-panel`.
- **Deploy workflow** references GitHub Actions secrets by name only — no token paste in-repo.
- **#40 donation stub** names networks, `addresses: null`, “do not invent wallets.”
- **Verify suite on `main`:** `verify-mesh`, `verify-software`, `verify-fraggate`, `verify-engines`, `verify-seo`, `verify-cite`, etc. #40 adds `verify-lattice.mjs`.

---

## Design → module map (what should exist)

| Paper | Expected module / route | `main` | #40 |
| --- | --- | --- | --- |
| FragGate FG-0.1 | `src/fraggate/{door,registry,ledger,codes}.js`; `/v1/fraggate/*`; MCP list→describe→call | yes | + AZPIPE wrap |
| DecisionGATE | `src/engines/decisiongate`; pre-exec in `admitCall` | yes | yes |
| Catalog / AZL-VOL | `src/software-catalog.js`; `GET /v1/software` | yes (in-memory build, USES increment) | packed + cache + skip USES |
| Mesh QNM-BUILD | `src/mesh.js`; `/v1/mesh*`; MCP `mesh_*`; FragGate `slug=mesh` | yes | yes |
| AZPIPE | `src/azpipe.js` around `fraggate_call` | **no** | yes |
| SweepGate | `src/sweepgate.js` | **no** | yes |
| ChainLock | `src/chainlock/*`; MCP `chainlock_*` | **no** | subset |
| LOCKSET | `src/lockset.js` via seal/verify | **no** | yes |
| RL runtime | packed catalog + visitor caps + operator bypass | **no** | yes (caps isolate-local) |
| Engines | `src/engines/{slug}.js` × 33 | yes | yes |
| EmbryoLock | registry stub only | yes | yes |
| SEO / skill | `src/seo.js` `SUITE_DESIGNS`; `/v1/skill` `/llms.txt` `/cite.json` | Pack1 only | Pack1+Pack2 |
| qnm-node | local package | not here | not here |

---

## Open PRs

| PR | Branch | State | Lands |
| --- | --- | --- | --- |
| **[#40](https://github.com/AzielEliab/aziel-runtime/pull/40)** | `cursor/wire-azpipe-lattice-b4ba` | **OPEN** (not draft) | AZPIPE, SweepGate, ChainLock, LOCKSET, RL packed catalog, Pack2 `SUITE_DESIGNS`, catalog Cache-Control, skip USES on hub doors, homepage no `/stats` fan-out |
| #39 | designs-sg-rl-scopes | **MERGED** | RL library vs runtime scopes; SweepGate PDF/text |
| #38 | fix-sg-wp-md | **MERGED** | SG-WP-0.1 was a ChainLock paste — fixed |
| #37 | suite-designs-pack2 | **MERGED** | Papers only (CL/AP/SG/LS/RL/TUN) |
| #36–#33 | designs + mesh 1.6.13 | **MERGED** | Pack1 cite-wire + QNM rollup |

`origin/cursor/node-mesh-kernel-e803` is **already merged** (#33/#34). Diff vs `main` is historical, not an open ship.

---

## Recommended next merge / deploy order

1. **Review and merge #40** (lattice + RL packed catalog + hub cost). This is the single deploy that moves Pack2 from DOCS-ONLY to LIVE fabric and stops catalog/homepage walking USES/product `/stats`. Keep fabric **off** the Softwares tab. Keep `GET /v1/mesh` as read-only. Keep donation addresses null until operator paste.
2. **Deploy `main` via existing GitHub Action** (secrets already named; do not invent tokens). Re-probe: `/v1/software` `Cache-Control` contains `s-maxage=300`; USES `by_path["/v1/software"]` stops climbing on hub crawls; homepage HTML has no 33-way `/stats` fan-out; `fraggate_call` still DecisionGATE-first; SweepGate still isolates poison; mesh GET still OFF.
3. **Optional follow-ups (not blocking #40):**  
   - Add remaining ChainLock MCP verbs from CL-WP-0.4 if operators need walk/compact/door/library_sync.  
   - Align `PUBLIC_DOOR_TOOLS` / refuse `exist.mcp` with live `tools/list` (include `mesh_*` or say “see tools/list”).  
   - OpenAPI: document `/mcp` and proxy `/p/{product}/{op}` as **proxy, not exec**.  
   - Durable visitor buckets only if isolate Maps fail in production — **do not** `KV.list()` to enforce them.  
   - Bump `LASTMOD` on next ship.
4. **Do not do in this runtime:** host `qnm-node/`; mint AIH-WP-1.3 here; enable mesh from GET; add Node Gate / IP UI; implement library RL or TUN; invent donation wallets; add EmbryoLock as an engine; unify AZMail mesh onto suite mesh.

---

## Live probe appendix (2026-09-10)

| Path | Status | Note |
| --- | --- | --- |
| `/v1/health` | 200 | 1.6.13, 33 products, Aziel Eliab |
| `/v1/ready` | 200 | SESSION binding up |
| `/v1/mesh` | 200 | `enabled: false` |
| `POST /v1/mesh/enable` `{}` | 400 | `MESH-NEED-BEARER` |
| `POST /v1/mesh/enable` `{bearer:login}` | 400 | `MESH-BAD-BEARER` |
| `/v1/software` | 200 | 34 cards; **no-store**; USES increments on main |
| `/v1/runtime.json` | 200 | door=fraggate |
| `/cite.json` | 200 | Pack1 designs only |
| `/llms.txt` `/robots.txt` `/sitemap.xml` `/sitemap-index.xml` | 200 | Full client/bot set |
| `/openapi.json` | 200 | 41 paths; no `/mcp` |
| `/v1/fraggate` | 200 | registry digest |
| `/v1/uses` | 200 | `uses_kv: true`; software path 1150 |
| `POST /mcp` `tools/list` | 200 | 26 tools |
| MCP `fraggate_describe` embryolock | stub | `live: false` |
| MCP `fraggate_call` embryolock/unlock | `FG-STUB` | ledger tip written |
| MCP `mesh_status` | OFF | never enables |

---

Author: **Aziel Eliab** only. This file is an audit, not a Softwares-tab product and not a FragGate slug.
