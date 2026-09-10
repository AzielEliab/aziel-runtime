# Runtime audit — 2026-09-10 — FULL (post–1.7.2)

**Repo:** [AzielEliab/aziel-runtime](https://github.com/AzielEliab/aziel-runtime)  
**Live version:** **1.7.2** (deployed `main` `fd33e07` — `GET /v1/azpipe/arch` MASTER-33 cite/read)  
**Auditor branch:** this PR  
**Author / identity:** **Aziel Eliab** only  

**Method:** live HTTP + MCP against all four public faces, then repo cross-check. User-Agent `Mozilla/5.0`. No invented tokens. No invented bypass. No deploy. No product behavior change — no FAIL required a fix.

**Bases probed 2026-09-10T11:36Z:**

| Face | Base | Via |
| --- | --- | --- |
| Origin Worker | `https://aziel-runtime.vibelock.workers.dev` | direct |
| AZInterface host | `https://www.azieleliab.com/runtime` | `x-aziel-runtime-via: service-binding` |
| Library host | `https://www.azielcorpuslibrary.net/runtime` | `x-aziel-runtime-via: service-binding` |
| GodLock host | `https://godlock.uk/runtime` | `x-aziel-runtime-via: service-binding` |

Companions (same day):

- `docs/audit/RUNTIME-AUDIT-2026-09-10.md` — deployed **1.6.13** (pre-lattice).
- `docs/audit/RUNTIME-AUDIT-2026-09-10-MASTER33.md` — deployed **1.7.1** (MASTER-33 + AKM-TRIAD).

This file audits deployed **1.7.2** after `GET /v1/azpipe/arch` landed (#50). Scope is the user’s post-1.7.2 checklist, including whether 1.7.1 WARNs regressed.

---

## Executive summary

Deployed **1.7.2 is a working MASTER-33 engine-runtime** plus a cite/read AZPIPE arch door. FragGate is THE single door. Lamb Lens sits after FragGate (`closed_at: "lamb-lens"` on refuse). The locked strip is admitted on `/v1/fraggate`, `fraggate_describe`, `fraggate_call`, and now **`GET/HEAD/POST /v1/azpipe/arch`**. That arch body is the same `arch()` object FragGate already exposes as `pipeline` / `pipeline_strip`, plus cite envelope fields (`ok`, `path`, `identity`, `cite`, `software_tab: false`, `fraggate_slug: false`, `mesh_get_never_enables: true`). It is **not** a Softwares-tab slug (`describe?slug=azpipe` → `FG-HALLUC-TOOL`). Eleven isolation domains stay on `/v1/software.domains`. AZChat and EmbryoLock remain name-only stubs (`FG-STUB`). 4DMap is live (`engine_digest` `896cf578…`). ZD30 does not exist. AKM-TRIAD stays fabric behind FragGate. Mesh GET never enables. QNS cites only (`POST /v1/qns/via` → `QNS-NO-PROXY`). Session mutate is token-gated (`REQUIRE_TOKEN=1`, `token_configured=true`; `POST /v1/session/open` without bearer → `401 token_required`). Public rollback paths 404 / stub. Identity on every probed JSON is **Aziel Eliab**.

**No FAIL. No code fix.** Remaining notes are the same class of WARN as 1.7.1 (host overlay, refuse-hint staleness, catalog-count vs domain-count arithmetic) plus the expected host prefix on `arch.path` for `/runtime` faces. Do not “fix” those by enabling mesh, adding ZD30, promoting AZChat, inventing a rollback API, or putting AZPIPE on the Softwares-tab.

---

## Scorecard

Status key: **PASS** = live law holds on all four faces (or on the named face) · **WARN** = holds, with a host/hint/count caveat · **FAIL** = law break or clear product bug.

| # | Check | Expected | Live 1.7.2 | Status |
| --- | --- | --- | --- | --- |
| 1 | MASTER-33 hop order | FragGate THE single door; Lamb Lens **after** FragGate; code must **not** follow MASTER-ARCHITECTURE-2.0 §4.2 Lamb-before-FragGate | Exact strip on `/v1/fraggate.pipeline_strip`, `arch().strip`, `LOCKED_STRIP` in `src/azpipe.js`, `src/fraggate/door.js`, `docs/designs/MASTER-33-SOFTWARE.md`, AP-WP-0.2 §3. Inbound starts `human → azinterface → public → fraggate → lamb-lens`. `refuseReorder` rejects the old fold-centric list and SUITE-PIPE-1.6.15 list. Local `scripts/verify-master33.mjs` asserts `indexOf("fraggate") < indexOf("lamb-lens")`. | **PASS** |
| 2 | `/v1/azpipe/arch` | Same FragGate pipeline payload; cite/read; not a Softwares slug | All four faces 200. Shared `arch()` keys (`v`, `magic`, `locked`, `master`, `lambgate`, `lamb_lens`, `fraggate_single_door`, `roseclock`, `rollback`, `inbound`, `outbound`, `strip`) **equal** `/v1/fraggate.pipeline`. Extra cite fields only. `software_tab=false`, `fraggate_slug=false`. `describe?slug=azpipe` → `FG-HALLUC-TOOL`. Not in `software[]`. POST is the same read. `PUT` 405. Unknown `/v1/azpipe/*` 404 + hint. | **PASS** |
| 3 | Domain map / catalog engines | 11 domains / 33 isolation softwares; true in-process engines; stubs refuse | `domains.spec=MASTER-33`, `domain_count=11`, `software_count=33`, `domains_are_doors=false`. Softwares-tab `count=36` (`live_count=34`, `stub_count=2`). 34 `ENGINE_RUNNERS` / `true_engine_slugs`. AZChat + EmbryoLock `FG-STUB`. 4DMap `FG-OK` + digest. Destructive / fantasy ops `FG-STUB`. Memory / AZPIPE / QNS / Lamb Lens / RoseClock not on the tab. | **PASS** |
| 4 | Mesh / QNS | GET never enables; QNS cite-only / default-off | `GET /v1/mesh` `enabled=false` before and after enable probes. Empty POST enable refused. Login bearer refused. `GET /v1/qns` cite-only. `POST /v1/qns/via` → **403 `QNS-NO-PROXY`**. MCP `mesh_status` OFF. | **PASS** |
| 5 | Security | No secret leakage; `REQUIRE_TOKEN`; destructive ops refuse; no public rollback | Health mentions `RUNTIME_TOKEN` only as a 1.4.1 version-history **note** (no secret value, no Bearer). Deploy workflow references `${{ secrets.CLOUDFLARE_API_TOKEN }}` by name only. Live ready: `require_token=true`, `token_configured=true`. Session open without bearer → **401 `token_required`**. Rebuild-index → `AKM-OPERATOR`. Rollback paths 404 / `FG-STUB`. Lamb Lens porn query → `FG-LAMB-REFUSE`, `closed_at=lamb-lens`. RoseClock `rollback=false`. | **PASS** |
| 6 | OpenAPI / skill / llms / cite | Live doors named consistently; 1.7.2 arch cited | `/cite.json` papers include MASTER-33, MASTER-ARCHITECTURE-2.0, AKM-TRIAD-1.0, AP-WP-0.2; `azpipe_arch` URL present. Skill + `/llms.txt` + sitemap name `GET /v1/azpipe/arch`. OpenAPI 51 paths include `/v1/azpipe/arch` GET/HEAD/POST. MCP `tools/list` still 36 (no new Softwares tool — correct; arch is HTTP cite). | **PASS** |
| 7 | 1.7.1 WARN regressions | `exist.mcp` stale counts; catalog 36 vs domain 33; library mesh overlay | All three **still present, not worse**. `exist.mcp` still 7 thin-door names vs live 36 `tools/list`. Softwares-tab 36 vs domain-map 33 still arithmetic (placements). Library `/runtime` mesh POST still 409 overlay, radios OFF. | **WARN** (unchanged) |

### WARN (not law breaks)

| Item | Where | Note vs 1.7.1 |
| --- | --- | --- |
| Library mesh POST overlay | `www.azielcorpuslibrary.net/runtime/v1/mesh/enable` | **Unchanged.** Host returns **409** `{ source: "library-default-off", enabled: false, error: "mesh default off until runtime enable" }` instead of Worker `MESH-NEED-BEARER` / `MESH-BAD-BEARER`. Radios stay OFF. GET still never enables. Do not “fix” by enabling. Origin + azieleliab + godlock return the Worker codes. |
| `exist.mcp` stale | FG-STUB / FG-HALLUC-TOOL / FG-LAMB-REFUSE envelopes | **Unchanged.** Refuse `exist.mcp` still lists 7 thin-door tools (`runtime_skill`, `fraggate_list`, `fraggate_describe`, `fraggate_verify`, `fraggate_call`, `decisiongate_check`, `library_lookup`) from `PUBLIC_DOOR_TOOLS` in `src/fraggate/codes.js`. Live `tools/list` has **36** (`mesh_*`, `chainlock_*`, `memory_*`, catalog helpers, advanced session). Agents copying `exist.mcp` miss fabric tools. Hint-only. |
| Catalog count vs 33 | `/v1/software` vs `domains.software_count` | **Unchanged arithmetic.** Tab `count=36` (`live_count=34`, `stub_count=2`). Domain map `software_count=33` is the isolation set (includes embryolock + azchat). Extra live cards: `azinterface`, `decisiongate`, `forgereceipts` (placements, `domain=null`, not extra doors). `GET /v1/catalog.json` `count=34` is PRODUCTS only (no named stubs). |
| VeilLock local_only | FragGate list vs catalog | **Unchanged.** Catalog cards VeilLock `status=live` (Softwares-tab). Registry `veillock:local_only` (public mesh does not exec). `inject` → `FG-STUB`. Pre-existing SEC-FEAT law. |
| Ready session href | azieleliab / godlock `/v1/ready` | **Unchanged.** `session` is `/runtime/v1/session/open` on those hosts. Library ready still prints `/v1/session/open`. Cosmetic host-root difference. |
| Arch cite `path` prefix | azieleliab / godlock `/v1/azpipe/arch` | **New, same class as ready href.** Origin `path=/v1/azpipe/arch`. Host `/runtime` faces rewrite the cite `path` to `/runtime/v1/azpipe/arch`. Pipeline keys still match. Not a Softwares door. |
| Public AKM observe | `POST /v1/memory/observe` | **Unchanged.** Succeeds without operator token because it is a FragGate-public allowlisted op. `rebuild-index` stays `AKM-OPERATOR`. Posterior ≠ truth. `authorizes_action=false`. |
| Skill overstates token on `fraggate_call` | `src/runtime-api.js` production-gates paragraph | Docs say `REQUIRE_TOKEN=1` also gates MCP `fraggate_call`. Live public FragGate call (HTTP + this Cursor MCP namespace) succeeds without a bearer; **session mutate** is what 401s. Production code (`src/production.js`) is session-mutate only. Hint-only docs drift — do not close the public door. |
| OpenAPI holes | Live `/openapi.json` 51 paths | Present: skill, software, fraggate, mesh, memory, qns, **azpipe/arch**, session, uses, update, SEO files. **Missing:** `/`, `/mcp`, `/openapi.json`, `/p/{product}/{op}` proxy. Dual-surface HTTP still works; Actions importers will not see MCP/proxy. Pre-existing. |

**FAIL:** none.

---

## Check 1 — MASTER-33 hop order (FragGate first)

Locked strip (exact match on `/v1/fraggate.pipeline_strip`, `fraggate_describe` / `fraggate_call` envelopes, `arch().strip`, and `GET /v1/azpipe/arch.strip`):

```
Human → AZInterface → PUBLIC/UI/AGENT/API → FragGate → Lamb Lens → SweepGate → Sentinel → Provenance/Input Packet → ChainLock-IN → DecisionGATE → AZPIPE → Internal Domain Layer → optional ASE → RoseClock (forward-only; StaticClock/VECTOR as needed) → TemporalLock → ChainLock-OUT → ForgeReceipts → Return
```

| Source | FragGate before Lamb Lens? |
| --- | --- |
| `docs/designs/MASTER-33-SOFTWARE.md` §0 HARD LAW | Yes. Explicitly **overrides** MASTER-ARCHITECTURE-2.0 §4.2. |
| `docs/designs/MASTER-ARCHITECTURE-2.0.md` §4.2 | Paper target still draws Lamb Lens **before** FragGate. **Not** the live hop list. |
| `docs/designs/AP-WP-0.2.md` §3 | Locked inbound is FragGate-first; fold-centric list is **internal** fld3-wire only. |
| `src/azpipe.js` `INBOUND_HOPS` / `LOCKED_STRIP` / `refuseReorder` | `fraggate` then `lamb-lens`. Old fold-centric + SUITE-PIPE-1.6.15 lists refuse `illegal-reorder`. |
| `src/fraggate/door.js` header + `listRegistry` / `describeRegistry` | Same strip. `pipeline: arch()`. |
| `src/domain-map.js` | 11 domains / 33 slugs; `domains_are_doors=false`. Placements for azinterface / decisiongate / forgereceipts / fraggate / mesh / memory. |
| Live `/v1/fraggate.pipeline` on all four faces | `master=MASTER-33`, `fraggate_single_door=true`, `lamb_lens=true`, `lambgate=false`, `rollback=false`. Inbound `[:6]` = `human, azinterface, public, fraggate, lamb-lens, sweepgate`. |

`pipeInbound` executed hops: human/AZInterface/public → FragGate classify → Lamb Lens → SweepGate → Sentinel → Provenance → ChainLock-IN → DecisionGATE → AZPIPE fld3 → Internal Domain Layer cite. ASE / RoseClock / TemporalLock / ChainLock-OUT / ForgeReceipts run on outbound. LambGate is not a hop. Illegal reorder is refused. This is the user override of paper §4.2 — **code keeps FragGate first**.

---

## Check 2 — `/v1/azpipe/arch` is FragGate pipeline cite, not a Softwares door

`src/azpipe.js` `archCite()` = `{ ok, path, identity, cite, software_tab:false, fraggate_slug:false, mesh_get_never_enables, ...arch() }`.  
`src/index.js` routes `/v1/azpipe/arch` (and `/v1/azpipe`, `/v1/azpipe/*`) through `dispatchAzpipeArchHttp` only. No mutate. No mesh enable. No new FragGate slug.

Live origin vs FragGate pipeline (same isolate, 2026-09-10T11:36Z):

| Field | `/v1/azpipe/arch` | `/v1/fraggate.pipeline` | Match |
| --- | --- | --- | --- |
| `v` | `AZPIPE-0.2` | `AZPIPE-0.2` | yes |
| `magic` | `FLD3` | `FLD3` | yes |
| `locked` | true | true | yes |
| `master` | `MASTER-33` | `MASTER-33` | yes |
| `lambgate` | false | false | yes |
| `lamb_lens` | true | true | yes |
| `fraggate_single_door` | true | true | yes |
| `roseclock` | true | true | yes |
| `rollback` | false | false | yes |
| `inbound` / `outbound` / `strip` | locked lists | same | yes |

Arch-only envelope keys (not on FragGate `pipeline` object): `ok`, `path`, `identity`, `cite`, `software_tab`, `fraggate_slug`, `mesh_get_never_enables`. FragGate has no extra pipeline keys the arch omits.

| Probe | Result |
| --- | --- |
| `GET /v1/azpipe/arch` all four | 200, `identity=Aziel Eliab`, `software_tab=false`, `fraggate_slug=false`, `domains.software_count=33` |
| `POST /v1/azpipe/arch` | 200, same strip (cite/read) |
| `HEAD /v1/azpipe/arch` | 200, empty body (local verify) |
| `GET /v1/azpipe` / `/v1/azpipe/invent` | 404 + hint `GET /v1/azpipe/arch` |
| `fraggate_describe` `slug=azpipe` | **FG-HALLUC-TOOL** |
| `azpipe` / `memory` / `aziel-runtime` in `software[]` | **false** |
| `GET /v1/catalog.json` `extras[]` | FragGate + mesh only (`kind:kernel`, `engine:false`). No azpipe card. |
| `/v1/software.azpipe_arch` | URL pointer, not a tab slug |

Host prefix: azieleliab / godlock rewrite cite `path` to `/runtime/v1/azpipe/arch`. Library `azpipe_arch` URL still points at the origin Worker (canonical). Same class as the 1.7.1 ready-href WARN.

---

## Check 3 — Catalog engines true in-process; stubs refuse

True-engine slugs (34, `src/engines/registry.js` `ENGINE_RUNNERS` = `honestyFields.true_engine_slugs`):  
`4dmap`, `ark`, `azai`, `azbot`, `azbrowser`, `azclce`, `azhub`, `aziel-corpus`, `azieltether`, `azinterface`, `azmail`, `aznet`, `azos`, `chronolock`, `codelock`, `decisiongate`, `employeelock`, `foldlock`, `forgereceipts`, `glossafilter`, `godlock`, `mialock`, `miragegrid`, `peacelock`, `postking`, `shadowlock`, `spectrallock`, `staticclock`, `temporallock`, `trajectorylock`, `veillock`, `vibelock`, `whistlelock`, `zsolver`.

`/v1/software.domains` isolation set (33) matches `docs/designs/MASTER-33-SOFTWARE.md` §4:

| ID | Domain | Softwares |
| --- | --- | --- |
| 01 | Vault/Custody | ark, embryolock |
| 02 | Media | vibelock, veillock, spectrallock, trajectorylock |
| 03 | Evidence | employeelock, whistlelock, peacelock, shadowlock, mialock, chronolock |
| 04 | Language | codelock, foldlock, glossafilter, zsolver, godlock, azclce |
| 05 | AI | azai, azbot, azhub |
| 06 | Research | azbrowser, aziel-corpus, 4dmap |
| 07 | Comms | azmail, **azchat** |
| 08 | Network | aznet, miragegrid, azieltether |
| 09 | System | azos |
| 10 | Simulation | postking |
| 11 | Core Time | staticclock, temporallock |

Placements (not extra doors): azinterface (human-ui), decisiongate + forgereceipts (fabric-product), fraggate (fabric-kernel), mesh (fabric-mesh), memory (fabric-memory).

| Probe | Result |
| --- | --- |
| `fraggate_list` | `registry_digest=7769a9340fed8897185ce16256a29b4c822ac609ad664f2340e798f7eb11db56` (same as 1.7.1). `live_count=35` (33 public-live engines + mesh + memory; VeilLock is `local_only`), `stub_count=2`, `local_only_count=1`, `product_count=38`, `stub_op_count=133`. |
| `fraggate_describe` azchat / embryolock | stub, `live=false`, `local_not_hosted=true`, digest null |
| `fraggate_call` azchat/unlock, embryolock/unlock | **FG-STUB** |
| `fraggate_describe` 4dmap | live, digest `896cf578117f27200a8761d6194ec07402c27435afe1718671768ff7b59b28e1` |
| `fraggate_call` 4dmap/health | **FG-OK**. `true_engine_runtime=true`, `ran_in=aziel-runtime`, `sequential_gate=false`, axes T/Δ/Γ/Π, Research / 06. Envelope stamps Lamb Lens PASS, Sentinel `rollback:false`, RoseClock `rollback:false`, TemporalLock rose hash, ForgeReceipts. |
| `describe?slug=zd30` | **FG-HALLUC-TOOL** |
| HTTP stub refuse | ark wipe/unlock, azos exec, azmail smtp, 4dmap truth_score, veillock inject — all **FG-STUB** |

Per-op `proxy_fallback` remains binding-only (AZ-OS session/exec/lattice; library D1/Whisper/OCR). Cloudflare isolate is the jail. Hosted AZAI is not the blend.

---

## Check 4 — Mesh GET never enables; QNS cite-only

| Probe | Origin / azieleliab / godlock | Library `/runtime` |
| --- | --- | --- |
| `GET /v1/mesh` | `enabled=false`, rollup 0/0/0, `qnm_s=false` | same (`source: service-binding` on GET) |
| `POST /v1/mesh/enable` `{}` | 400 **MESH-NEED-BEARER** | 409 library overlay, `enabled=false` |
| `POST /v1/mesh/enable` `{bearer:"login"}` | 400 **MESH-BAD-BEARER** | 409 library overlay, `enabled=false` |
| GET after those POSTs | still `enabled=false` | still `enabled=false` |
| MCP `mesh_status` | OFF. Display.summary: “GET /v1/mesh never enables.” | — |

Every Softwares-tab card carries `mesh.enabled_default=false`.

`GET /v1/qns`: `code=QNS-OK`, `spec=QNS-CD-1.0`, `photon=QNS1 1.3`, `software_tab=false`, `fraggate_slug=false`, `public_proxy=false`, `emit=false`, `wipe=false`, `control_plane=false`, `loopback_only=true`, `bind=127.0.0.1`, `local=https://github.com/AzielEliab/qnm-node`.  
`POST /v1/qns/via` `{}` → **403 `QNS-NO-PROXY`** on all four.

---

## Check 5 — Security

| Probe | Result |
| --- | --- |
| Public JSON secret scan | No Bearer / `sk-` / Cloudflare token values. `RUNTIME_TOKEN` appears only in `/v1/health` `version_history` 1.4.1 note (“optional RUNTIME_TOKEN on session mutate”). |
| Deploy | `.github/workflows/deploy.yml` uses `${{ secrets.CLOUDFLARE_API_TOKEN }}` — name only, not a pasted secret. |
| `GET /v1/ready` | 200, `require_token=true`, `token_configured=true`, `version=1.7.2` on all four |
| `POST /v1/session/open` `{}` | **401** `token_required` (no invented token used) |
| `POST /v1/memory/rebuild-index` | 400 **AKM-OPERATOR** |
| `POST /v1/rollback` / `/v1/roseclock/rollback` | 404 `not found` |
| `fraggate_call` memory/rollback | FG-STUB |
| AZBrowser `ethical_search` “download porn videos” | **FG-LAMB-REFUSE**. Message: “Lamb Lens REFUSE — no handler. Fabric ethics after FragGate. Not a second door.” Policy `MASTER-33-LL-1.0`. `prohibition_hits=["porn"]`. `closed_at=lamb-lens`. |
| Destructive / fantasy ops | ark wipe/unlock, azos exec, azmail smtp, veillock inject, 4dmap truth_score — FG-STUB |
| FLD3 fold | `password` / `private_key` / `secret` / `ssn` / `legal_name` / `home_address` fold to `[FLD3:block]` (`src/azpipe.js`) |

`REQUIRE_TOKEN` is live and fail-closed for session mutate. The public FragGate door (list / describe / call / catalog / skill) stays public — that is the dual-surface law, not a leak.

---

## Check 6 — OpenAPI / skill / llms / cite

| Surface | Live 1.7.2 |
| --- | --- |
| `/v1/skill` + MCP `runtime_skill` | Mentions **1.7.2 = GET /v1/azpipe/arch**, AKM-TRIAD-1.0, MASTER-33 FragGate-first strip |
| `/llms.txt` | Names `/v1/azpipe/arch` and 1.7.2 |
| `/cite.json` | `version=1.7.2`, `identity=Aziel Eliab`, `azpipe_arch` URL. Papers: SEC-FEAT-1.0, AZL-VOL-1.0, AZL-ARCH-1.0, AZL-WP-1.1, QNM-WP-1.0, NODE-OPS-1.0, CL-WP-0.4, AP-WP-0.2, SG-WP-0.1, LS-WP-0.1, RL-WP-0.1, QNS-CD-1.0, 4DM-WP-1.0, SUITE-PIPE-1.6.15, **MASTER-33**, **MASTER-ARCHITECTURE-2.0**, **AKM-TRIAD-1.0** |
| `/sitemap.xml` | Includes `/v1/azpipe/arch` |
| `/openapi.json` | 51 paths; `/v1/azpipe/arch` GET/HEAD/POST. Summary: MASTER-33 cite/read, not a Softwares door |
| MCP `tools/list` | **36** tools — same set as 1.7.1 (no new `azpipe_*` MCP tool; correct — arch is HTTP cite, not a FragGate slug) |
| `/v1/software` Cache-Control | `public, s-maxage=300, stale-while-revalidate=3600` (RL packed catalog still on the hot path) |

MCP `tools/list` (36): `runtime_skill`, `fraggate_list`, `fraggate_describe`, `fraggate_verify`, `fraggate_call`, `decisiongate_check`, `library_lookup`, `mesh_*` (8), `chainlock_{append,tip,recall,verify,seal}`, `memory_{observe,resolve,calibrate,recall,get}`, `runtime_{software,bundle,pull,run,manifest}`, `runtime_session_*` (6). No flat `{slug}_{op}` pile.

---

## Check 7 — 1.7.1 WARN regressions

| 1.7.1 WARN | 1.7.2 | Regression? |
| --- | --- | --- |
| Library mesh POST 409 overlay | Same 409, radios OFF | **No** |
| `exist.mcp` lists 7 vs live 36 tools | Still 7 vs 36 | **No** |
| Catalog 36 vs domain 33 | Still 36 / 34 live + 2 stub vs 33 isolation | **No** |
| VeilLock catalog-live / registry-local_only | Same | **No** |
| Ready session href host prefix | Same; arch `path` now shows the same prefix class on `/runtime` faces | **No** (new instance of the same host overlay, not a law break) |

Nothing in 1.7.2 re-opened a 1.7.1 PASS.

---

## Health 1.7.2 on all four

| Base | HTTP | version | role | door | identity | count | HEAD version |
| --- | --- | --- | --- | --- | --- | --- | --- |
| workers.dev | 200 | 1.7.2 | engine-runtime | fraggate | Aziel Eliab | 34 | 1.7.2 |
| azieleliab.com/runtime | 200 | 1.7.2 | engine-runtime | fraggate | Aziel Eliab | 34 | 1.7.2 |
| azielcorpuslibrary.net/runtime | 200 | 1.7.2 | engine-runtime | fraggate | Aziel Eliab | 34 | 1.7.2 |
| godlock.uk/runtime | 200 | 1.7.2 | engine-runtime | fraggate | Aziel Eliab | 34 | 1.7.2 |

`/v1/ready` 200 `ok=true` `require_token=true` `token_configured=true` on all four. `/v1/software` and `/cite.json` also carry `1.7.2`.

---

## Local verify (this tree)

`scripts/verify-master33.mjs`, `verify-software.mjs`, `verify-qns.mjs`, `verify-mesh.mjs`, `verify-cite.mjs`, `verify-seo.mjs`, `verify-akm-triad.mjs`, `verify-fraggate.mjs` — all **ok** on this checkout (`package.json` version `1.7.2`).

---

## Do not do from this audit

- Do not enable mesh from GET or from the library 409 overlay.
- Do not add ZD30.
- Do not promote AZChat or EmbryoLock to engines.
- Do not add a public rollback / RoseClock rewind API.
- Do not put AKM, QNS, SweepGate, AZPIPE, Lamb Lens, or `/v1/azpipe/arch` on the Softwares-tab.
- Do not invent `CLOUDFLARE_API_TOKEN`, donation wallets, or a Node Gate.
- Do not treat library `/v1/runtime` (Digital Library package discovery) as this Worker — only `/runtime` is aziel-runtime.
- Do not close the public FragGate door to “fix” the skill paragraph that overstates `REQUIRE_TOKEN` on `fraggate_call`.
- Do not deploy from this PR. This file is an audit.

---

## Recommended next (optional, not blocking)

1. Align `PUBLIC_DOOR_TOOLS` / refuse `exist.mcp` with live `tools/list` (include `memory_*` / `mesh_*` / `chainlock_*`, or say “see tools/list”). Hint-only.
2. Leave the library mesh 409 overlay as-is (stricter OFF). If hubs want identical Worker codes, that change belongs on **aziel-corpus**, not this runtime.
3. Tighten the skill/OpenAPI sentence so `REQUIRE_TOKEN` is described as session-mutate / `runtime_run` / advanced session tools — not the public FragGate cite/call door.
4. Keep public AKM observe on the FragGate door. Operator-only remains `rebuild-index`.

---

## Live probe appendix (2026-09-10)

| Path | Origin + three `/runtime` faces | Note |
| --- | --- | --- |
| `GET /v1/health` | 200 | 1.7.2, Aziel Eliab, 34 engines |
| `HEAD /v1/health` | 200 | `X-Aziel-Runtime-Version: 1.7.2` |
| `GET /v1/ready` | 200 | SESSION up; `REQUIRE_TOKEN` live |
| `GET /v1/fraggate` | 200 | `pipeline_strip` MASTER-33 FragGate-first |
| `GET /v1/azpipe/arch` | 200 | same `arch()` as FragGate `pipeline`; not a Softwares door |
| `POST /v1/azpipe/arch` | 200 | cite/read only |
| `GET /v1/software` | 200 | 36 cards; 11 domains; azchat stub; 4dmap live; no azpipe slug |
| `GET /cite.json` | 200 | AKM-TRIAD-1.0 + MASTER-33 + `azpipe_arch` |
| `GET /v1/skill` `/llms.txt` | 200 | 1.7.2 + `/v1/azpipe/arch` |
| `/openapi.json` | 200 | 51 paths; includes `/v1/azpipe/arch` |
| `POST /mcp` `tools/list` | 200 | 36 tools (no azpipe MCP tool) |
| `GET /v1/mesh` | 200 | `enabled: false` |
| `POST /v1/mesh/enable` | 400 / library 409 | never enables |
| `GET /v1/qns` | 200 | cite-only |
| `POST /v1/qns/via` | 403 | `QNS-NO-PROXY` |
| `GET /v1/memory` | 200 | AKM-TRIAD-1.0 |
| `POST /v1/memory/observe` | 200 | behind FragGate |
| `POST /v1/memory/rebuild-index` | 400 | `AKM-OPERATOR` |
| `POST /v1/session/open` | 401 | `token_required` |
| `POST /v1/fraggate/call` azbrowser/ethical_search (porn) | 400 | `FG-LAMB-REFUSE` |
| `POST /v1/fraggate/call` memory/rollback | 400 | `FG-STUB` |
| `POST /v1/fraggate/call` azchat/unlock | 400 | `FG-STUB` |
| `POST /v1/rollback` | 404 | no public rollback |
| `GET /v1/fraggate/describe?slug=zd30` | 400 | `FG-HALLUC-TOOL` |
| `GET /v1/fraggate/describe?slug=azpipe` | 400 | `FG-HALLUC-TOOL` |

MCP (Cursor aziel-runtime namespace): `runtime_skill` → `fraggate_list` → `fraggate_describe` (4dmap, azchat, embryolock, memory, azpipe, zd30) → `fraggate_call` (4dmap/health, azchat/unlock, memory/rollback, azbrowser/ethical_search) → `mesh_status`. Display titles/summaries shown to the operator; next input taken.

---

Author: **Aziel Eliab** only. This file is an audit, not a Softwares-tab product and not a FragGate slug.
