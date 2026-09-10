# Runtime audit — 2026-09-10 — MASTER-33 + AKM-TRIAD

**Repo:** [AzielEliab/aziel-runtime](https://github.com/AzielEliab/aziel-runtime)  
**Live version:** **1.7.1** (deployed `main` `971eeee` — AKM-TRIAD-1.0 on MASTER-33)  
**Auditor branch:** this PR  
**Author / identity:** **Aziel Eliab** only  

**Method:** live HTTP + MCP against all four public faces, then repo cross-check. User-Agent `Mozilla/5.0`. No invented tokens. No invented bypass. No product behavior change — no FAIL required a fix.

**Bases probed 2026-09-10T09:47Z:**

| Face | Base | Via |
| --- | --- | --- |
| Origin Worker | `https://aziel-runtime.vibelock.workers.dev` | direct |
| AZInterface host | `https://www.azieleliab.com/runtime` | `x-aziel-runtime-via: service-binding` |
| Library host | `https://www.azielcorpuslibrary.net/runtime` | `x-aziel-runtime-via: service-binding` |
| GodLock host | `https://godlock.uk/runtime` | `x-aziel-runtime-via: service-binding` |

Companion (same day, pre-1.7.0 lattice): `docs/audit/RUNTIME-AUDIT-2026-09-10.md`. That file audited deployed **1.6.13**. This file audits deployed **1.7.1** after MASTER-33 + AKM-TRIAD.

---

## Executive summary

Deployed **1.7.1 is a working MASTER-33 engine-runtime**. FragGate is THE single door. Lamb Lens sits after FragGate (`closed_at: "lamb-lens"` on refuse). The locked strip is admitted on `/v1/fraggate`, `fraggate_describe`, and `fraggate_call`. Eleven isolation domains are on `/v1/software.domains`. AZChat is name-only stub (`FG-STUB`). 4DMap is live (`engine_digest` present). ZD30 does not exist (`FG-HALLUC-TOOL`). AKM-TRIAD is cited and live as fabric (`memory_*` on MCP `tools/list`; `POST /v1/memory/*` wrapped by `fraggateCall`). Mesh GET never enables. QNS cites only (`POST /v1/qns/via` → `QNS-NO-PROXY`). Softwares-tab `one_line` values do not mash “runtime X.Y FragGate”. Public rollback paths 404 / stub. RoseClock stamps `rollback: false`. Identity on every probed JSON is **Aziel Eliab**.

**No FAIL. No minimal fix PR.** Remaining notes are WARN (host overlay, refuse-hint staleness, catalog-count vs domain-count arithmetic). Do not “fix” those by enabling mesh, adding ZD30, promoting AZChat, or inventing a rollback API.

---

## Scorecard

Status key: **PASS** = live law holds on all four faces (or on the named face) · **WARN** = holds, with a host/hint/count caveat · **FAIL** = law break or clear product bug.

| # | Check | Expected | Live 1.7.1 | Status |
| --- | --- | --- | --- | --- |
| 1 | `/v1/health` version | `1.7.1` on all four | All four 200. `version=1.7.1`, `role=engine-runtime`, `door=fraggate`, `identity=Aziel Eliab`, `count=34`. HEAD `X-Aziel-Runtime-Version: 1.7.1`. `/v1/ready` 200 `ok=true` on all four. | **PASS** |
| 2 | `/v1/fraggate` `pipeline_strip` | MASTER-33 strip; FragGate THE single door; Lamb Lens after FragGate | Exact strip on all four. `pipeline.master=MASTER-33`, `fraggate_single_door=true`, `lamb_lens=true`, `lambgate=false`, `rollback=false`. First hops `human → azinterface → public → fraggate → lamb-lens`. | **PASS** |
| 3 | Domain map / catalog | 11 domains; azchat stub; 4dmap live; no ZD30 | `domains.spec=MASTER-33`, `domain_count=11`, `software_count=33`, `domains_are_doors=false`. AZChat `status=stub` / `FG-STUB`. 4DMap `status=live` / `FG-OK` / digest `896cf578…`. `describe?slug=zd30` → `FG-HALLUC-TOOL`. Memory not on Softwares-tab. | **PASS** |
| 4 | AKM-TRIAD | skill/cite mention AKM-TRIAD; `memory_*` on MCP `tools/list`; `POST /v1/memory/*` behind FragGate; auth/refuse without inventing bypass | Skill + `/cite.json` list **AKM-TRIAD-1.0**. MCP tools: `memory_observe`, `memory_resolve`, `memory_calibrate`, `memory_recall`, `memory_get` (36 tools total). HTTP POST observe/resolve/calibrate/recall go through `fraggateCall` (`slug=memory`). `rebuild-index` → `AKM-OPERATOR`. `op=rollback` → `FG-STUB`. Public observe is FragGate-allowlisted (writes a learn stamp; posterior ≠ truth; `authorizes_action=false`). | **PASS** |
| 5 | Mesh GET never enables; QNS cite-only | GET/status stay OFF; no public via proxy | `GET /v1/mesh` `enabled=false` before and after enable probes. Empty POST enable refused. Login bearer refused. `GET /v1/qns` cite-only (`public_proxy=false`, `emit=false`). `POST /v1/qns/via` → **403 `QNS-NO-PROXY`**. | **PASS** |
| 6 | Softwares naming | no “runtime X.Y FragGate” mash in `/v1/software` `one_line` for aziel-runtime | `aziel-runtime` is **not** a Softwares-tab card (correct). No `one_line` matches `runtime <ver> FragGate`. Extras: FragGate kernel door copy; mesh QNM rollup copy. Update check notes name “Aziel Eliab Runtime” without a mash. | **PASS** |
| 7 | Security | no public rollback; RoseClock forward-only; Lamb Lens refuse path exists | `/v1/rollback` and `/v1/roseclock/rollback` → 404. Memory rollback `FG-STUB`. Live `fraggate_call` stamps `roseclock.rollback=false`. AZBrowser `ethical_search` “download porn videos” → **`FG-LAMB-REFUSE`**, `lamb_lens.decision=REFUSE`, `prohibition_hits=["porn"]`, `closed_at="lamb-lens"`. | **PASS** |

### WARN (not law breaks)

| Item | Where | Note |
| --- | --- | --- |
| Library mesh POST overlay | `www.azielcorpuslibrary.net/runtime/v1/mesh/enable` | Host returns **409** `{ source: "library-default-off", enabled: false, error: "mesh default off until runtime enable" }` instead of Worker `MESH-NEED-BEARER` / `MESH-BAD-BEARER`. Radios stay OFF. GET still never enables. This is the **library** host, not a runtime enable. Do not “fix” by enabling. Origin + azieleliab + godlock `/runtime` return the Worker codes. |
| Public AKM observe | `POST /v1/memory/observe` | Succeeds without operator token because it is a FragGate-public allowlisted op (same door as `fraggate_call`). Not a side door. `rebuild-index` stays `AKM-OPERATOR`. Do not invent a token bypass; none was needed and none was used. |
| `exist.mcp` stale | FG-STUB / FG-UNKNOWN-OP envelopes | Refuse `exist.mcp` still lists 7 thin-door tools. Live `tools/list` has **36** (`mesh_*`, `chainlock_*`, `memory_*`, catalog helpers, advanced session). Agents copying `exist.mcp` miss fabric tools. Pre-existing; not a 1.7.1 ship break. |
| Catalog count vs 33 | `/v1/software` | Softwares-tab `count=36` (`live_count=34`, `stub_count=2`). Domain map `software_count=33` is the isolation set (includes embryolock + azchat). Extra live cards: `azinterface`, `decisiongate`, `forgereceipts` (placements, `domain=null`, not extra doors). Arithmetic holds. |
| VeilLock local_only | FragGate list vs catalog | Catalog cards VeilLock `status=live` (Softwares-tab). Registry `veillock:local_only` (public mesh does not exec). Pre-existing SEC-FEAT law. |
| Ready session href | azieleliab / godlock `/v1/ready` | `session` is `/runtime/v1/session/open` on those hosts (same-origin prefix). Library ready still prints `/v1/session/open`. Cosmetic host-root difference. |

**FAIL:** none.

---

## Check 1 — Health 1.7.1 on all four

| Base | HTTP | version | role | door | identity | count | HEAD version |
| --- | --- | --- | --- | --- | --- | --- | --- |
| workers.dev | 200 | 1.7.1 | engine-runtime | fraggate | Aziel Eliab | 34 | 1.7.1 |
| azieleliab.com/runtime | 200 | 1.7.1 | engine-runtime | fraggate | Aziel Eliab | 34 | 1.7.1 |
| azielcorpuslibrary.net/runtime | 200 | 1.7.1 | engine-runtime | fraggate | Aziel Eliab | 34 | 1.7.1 |
| godlock.uk/runtime | 200 | 1.7.1 | engine-runtime | fraggate | Aziel Eliab | 34 | 1.7.1 |

`/v1/ready` 200 `ok=true` `version=1.7.1` on all four. `/v1/software` and `/cite.json` also carry `1.7.1`.

True-engine slugs (34): `4dmap`, `ark`, `azai`, `azbot`, `azbrowser`, `azclce`, `azhub`, `aziel-corpus`, `azieltether`, `azinterface`, `azmail`, `aznet`, `azos`, `chronolock`, `codelock`, `decisiongate`, `employeelock`, `foldlock`, `forgereceipts`, `glossafilter`, `godlock`, `mialock`, `miragegrid`, `peacelock`, `postking`, `shadowlock`, `spectrallock`, `staticclock`, `temporallock`, `trajectorylock`, `veillock`, `vibelock`, `whistlelock`, `zsolver`.

---

## Check 2 — MASTER-33 pipeline strip

Locked strip (exact match on `/v1/fraggate.pipeline_strip` and on `fraggate_describe` / `fraggate_call` envelopes):

```
Human → AZInterface → PUBLIC/UI/AGENT/API → FragGate → Lamb Lens → SweepGate → Sentinel → Provenance/Input Packet → ChainLock-IN → DecisionGATE → AZPIPE → Internal Domain Layer → optional ASE → RoseClock (forward-only; StaticClock/VECTOR as needed) → TemporalLock → ChainLock-OUT → ForgeReceipts → Return
```

Live `pipeline` flags: `master=MASTER-33`, `locked=true`, `fraggate_single_door=true`, `lamb_lens=true`, `lambgate=false`, `roseclock=true`, `rollback=false`, `reorder_refuse=illegal-reorder`, `author=Aziel Eliab`.

Inbound hop order starts `human, azinterface, public, fraggate, lamb-lens, sweepgate, sentinel, provenance, chainlock-in, decisiongate, azpipe, domain-layer, …`. Lamb Lens is fabric after FragGate — not a Softwares-tab product and not a second door. LambGate is not a hop.

MCP `runtime_skill` (display.title **Aziel Eliab Runtime**) states the same strip and **1.7.1 = AKM-TRIAD-1.0** / **1.7.0 = MASTER-33**.

---

## Check 3 — Domain map, AZChat, 4DMap, no ZD30

`/v1/software.domains`:

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
| `fraggate_describe` `slug=azchat` | stub, `live=false`, `local_not_hosted=true`, digest null |
| `fraggate_call` azchat/unlock | **FG-STUB** — “local, not hosted. Never execute on the public mesh.” |
| `fraggate_describe` `slug=4dmap` | live, digest `896cf578117f27200a8761d6194ec07402c27435afe1718671768ff7b59b28e1` |
| `fraggate_call` 4dmap/health | **FG-OK**. `spec=4DM-WP-1.0`, `sequential_gate=false`, axes T/Δ/Γ/Π, Research / 06 |
| `describe?slug=zd30` | **FG-HALLUC-TOOL** (400) on all four |
| memory in `software[]` | **false** |
| ZD30 in `software[]` | **false** |

FragGate registry: `live_count=35` (33 public-live engines + mesh + memory; VeilLock is `local_only`), `stub_count=2` (embryolock, azchat), `local_only_count=1` (veillock), `product_count=38`, `registry_digest=7769a9340fed8897185ce16256a29b4c822ac609ad664f2340e798f7eb11db56`.

---

## Check 4 — AKM-TRIAD

| Surface | Live |
| --- | --- |
| `/v1/skill` | Mentions AKM-TRIAD-1.0 |
| `/cite.json` `designs.papers` | Includes **AKM-TRIAD-1.0** (with MASTER-33, MASTER-ARCHITECTURE-2.0, Pack1+Pack2, QNS, 4DM) |
| `GET /v1/memory` | 200, `spec=AKM-TRIAD-1.0` |
| MCP `tools/list` | `memory_observe`, `memory_resolve`, `memory_calibrate`, `memory_recall`, `memory_get` |
| `fraggate_describe` `slug=memory` | live fabric; stub ops `model_update`, `rollback`, `rewrite`, `delete_history`, `auto_update` |
| `POST /v1/memory/observe` | 200 via FragGate wrap (`src/index.js` → `fraggateCall`). Learn stamp. `belief_is_not_truth=true`. `roseclock.rollback=false`. |
| `POST /v1/memory/rebuild-index` | 400 **AKM-OPERATOR** (no invented token) |
| `fraggate_call` memory/rollback | **FG-STUB** |

MCP `memory_observe` (display.title **memory observe — Adaptive Knowledge Memory**) returned `ok=true`, `spec=AKM-TRIAD-1.0`, `software_tab=false`. Posterior is calibrated belief, not truth.

---

## Check 5 — Mesh GET never enables; QNS cite-only

| Probe | Origin / azieleliab / godlock | Library `/runtime` |
| --- | --- | --- |
| `GET /v1/mesh` | `enabled=false`, rollup 0/0/0, `qnm_s=false` | same |
| `GET /v1/mesh/status` | alias, still OFF | same |
| `POST /v1/mesh/enable` `{}` | 400 **MESH-NEED-BEARER** | 409 library overlay, `enabled=false` |
| `POST /v1/mesh/enable` `{bearer:"login"}` | 400 **MESH-BAD-BEARER** | 409 library overlay, `enabled=false` |
| GET after those POSTs | still `enabled=false` | still `enabled=false` |
| MCP `mesh_status` | OFF. Display.summary: “GET /v1/mesh never enables.” | — |

`GET /v1/qns`: `code=QNS-OK`, `spec=QNS-CD-1.0`, `photon=QNS1 1.3`, `software_tab=false`, `fraggate_slug=false`, `public_proxy=false`, `emit=false`, `wipe=false`, `control_plane=false`, `loopback_only=true`, `bind=127.0.0.1`, `local=https://github.com/AzielEliab/qnm-node`.  
`POST /v1/qns/via` `{}` → **403 `QNS-NO-PROXY`** on all four.

---

## Check 6 — Softwares naming

`GET /v1/software` is the hub Softwares-tab. Framing: “Separate software / sibling software under one FragGate door. Never separate FragGate engines. Clock is not Lock.”

- No card `slug=aziel-runtime` (runtime is the host, not a tab product).
- No `one_line` contains `runtime <digit>.<digit>` mashed with `FragGate`.
- Product lines that mention FragGate do so as “FragGate only” / “same FragGate door” — product framing, not a runtime-version mash.
- `catalog.extras[]`: FragGate kernel one_line is the door/Worker-app sentence. Mesh one_line is the QNM rollup sentence.
- `GET /v1/update/check?slug=aziel-runtime&version=1.7.0` → `latest=1.7.1`, notes: “Aziel Eliab Runtime has no counted tarball…”

---

## Check 7 — Security: no rollback; RoseClock forward-only; Lamb Lens refuse

| Probe | Result |
| --- | --- |
| `POST /v1/rollback` | 404 `error=not found` |
| `POST /v1/roseclock/rollback` | 404 `error=not found` |
| `fraggate_call` memory/rollback | FG-STUB |
| 4DMap health envelope | `roseclock: { sequence, transition_hash, action_class: "EXECUTE", rollback: false }`; TemporalLock carries `rose_transition_hash`; Sentinel `rollback: false` |
| `/v1/fraggate.pipeline.rollback` | `false` |
| AZBrowser `ethical_search` prohibited query | **FG-LAMB-REFUSE**. Message: “Lamb Lens REFUSE — no handler. Fabric ethics after FragGate. Not a second door.” Policy `MASTER-33-LL-1.0`. `closed_at=lamb-lens`. Ledger asked+refused. |
| AZBrowser unknown `search` | FG-UNKNOWN-OP (live ops are `ethical_search` / `lamb_lens_search` / …) — refuse, not exec |

No public rollback API. Recovery language on Sentinel / RoseClock is forward `action_class` only.

---

## MCP `tools/list` (36)

Thin door + named fabric (no flat `{slug}_{op}` pile):

`runtime_skill`, `fraggate_list`, `fraggate_describe`, `fraggate_verify`, `fraggate_call`, `decisiongate_check`, `library_lookup`, `mesh_*` (8), `chainlock_{append,tip,recall,verify,seal}`, `memory_{observe,resolve,calibrate,recall,get}`, `runtime_{software,bundle,pull,run,manifest}`, `runtime_session_*` (6).

---

## Cite papers (live `/cite.json`)

SEC-FEAT-1.0, AZL-VOL-1.0, AZL-ARCH-1.0, AZL-WP-1.1, QNM-WP-1.0, NODE-OPS-1.0, CL-WP-0.4, AP-WP-0.2, SG-WP-0.1, LS-WP-0.1, RL-WP-0.1, QNS-CD-1.0, 4DM-WP-1.0, SUITE-PIPE-1.6.15, **MASTER-33**, **MASTER-ARCHITECTURE-2.0**, **AKM-TRIAD-1.0**.

---

## Do not do from this audit

- Do not enable mesh from GET or from the library 409 overlay.
- Do not add ZD30.
- Do not promote AZChat or EmbryoLock to engines.
- Do not add a public rollback / RoseClock rewind API.
- Do not put AKM, QNS, SweepGate, AZPIPE, or Lamb Lens on the Softwares-tab.
- Do not invent `CLOUDFLARE_API_TOKEN`, donation wallets, or a Node Gate.
- Do not treat library `/v1/runtime` (Digital Library package discovery) as this Worker — only `/runtime` is aziel-runtime.

---

## Recommended next (optional, not blocking)

1. Align `PUBLIC_DOOR_TOOLS` / refuse `exist.mcp` with live `tools/list` (include `memory_*` / `mesh_*` / `chainlock_*`, or say “see tools/list”). Hint-only.
2. Leave the library mesh 409 overlay as-is (stricter OFF). If hubs want identical Worker codes, that change belongs on **aziel-corpus**, not this runtime.
3. Keep public AKM observe on the FragGate door. Operator-only remains `rebuild-index`.

---

## Live probe appendix (2026-09-10)

| Path | Origin + three `/runtime` faces | Note |
| --- | --- | --- |
| `GET /v1/health` | 200 | 1.7.1, Aziel Eliab, 34 engines |
| `HEAD /v1/health` | 200 | `X-Aziel-Runtime-Version: 1.7.1` |
| `GET /v1/ready` | 200 | SESSION up |
| `GET /v1/fraggate` | 200 | `pipeline_strip` MASTER-33 |
| `GET /v1/software` | 200 | 36 cards; 11 domains; azchat stub; 4dmap live |
| `GET /cite.json` | 200 | AKM-TRIAD-1.0 + MASTER-33 |
| `GET /v1/skill` | 200 | AKM-TRIAD mentioned |
| `POST /mcp` `tools/list` | 200 | 36 tools including `memory_*` |
| `GET /v1/mesh` | 200 | `enabled: false` |
| `POST /v1/mesh/enable` | 400 / library 409 | never enables |
| `GET /v1/qns` | 200 | cite-only |
| `POST /v1/qns/via` | 403 | `QNS-NO-PROXY` |
| `GET /v1/memory` | 200 | AKM-TRIAD-1.0 |
| `POST /v1/memory/observe` | 200 | behind FragGate |
| `POST /v1/memory/rebuild-index` | 400 | `AKM-OPERATOR` |
| `POST /v1/fraggate/call` azbrowser/ethical_search (porn) | 400 | `FG-LAMB-REFUSE` |
| `POST /v1/fraggate/call` memory/rollback | 400 | `FG-STUB` |
| `POST /v1/fraggate/call` azchat/unlock | 400 | `FG-STUB` |
| `POST /v1/rollback` | 404 | no public rollback |
| `GET /v1/fraggate/describe?slug=zd30` | 400 | `FG-HALLUC-TOOL` |

MCP (Cursor aziel-runtime namespace): `runtime_skill` → `fraggate_list` → `fraggate_describe` (4dmap, azchat, memory) → `fraggate_call` (4dmap/health, azchat/unlock, memory/rollback, azbrowser/ethical_search) → `mesh_status` → `memory_observe`. Display titles/summaries shown to the operator; next input taken.

---

Author: **Aziel Eliab** only. This file is an audit, not a Softwares-tab product and not a FragGate slug.
