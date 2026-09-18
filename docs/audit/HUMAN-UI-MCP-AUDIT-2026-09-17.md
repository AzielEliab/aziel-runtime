# Audit: Softwares human UI + MCP wiring

**Date:** 2026-09-17 (written 2026-09-18 UTC against the live tip)  
**Repo:** [AzielEliab/aziel-runtime](https://github.com/AzielEliab/aziel-runtime)  
**Base:** latest `main` `4d043d6` — **AZVPN public VPN concentrator + mesh radios + AZNet pair (#115)**  
**Live front door:** `https://aziel-runtime.vibelock.workers.dev/` (User-Agent `Mozilla/5.0`)  
**Live `GET /v1/software`:** `version=2.0.0-rc1`, `git_sha=4d043d6f1f4d4ca612c41cb069f50cba31333c9d` (matches this tip)  
**Identity:** Aziel Eliab only  
**Scope:** AUDIT ONLY. No runtime behavior change. Close-test: `scripts/verify-human-ui-mcp-audit.mjs`  
**NO-LIE:** do not invent scores. Do not claim `fielded_100`. Cite-only ≠ loaded.

**Operator receipt used as checklist (not as loaded-module proof):** FLEET 1000-PATH · ALL SOFTWARES AZIEL MESH · OPERATOR RECEIPT, `2026-09-17T20:50:00-04:00`. Phrase *1000* in that PDF means the named object exists, paper and code agree, tests or an honest stub banner exist, and the catalog does not lie. It does **not** mean uncrackable. Runtime stays a door.

---

## Method

1. Reset to `origin/main` @ `4d043d6` (#115).
2. Inventory `PRODUCTS` (`src/index.js`), FragGate `LIVE_OPS` / `STUB_OPS` / `OP_ALIASES` (`src/fraggate/registry.js`), hub catalog (`src/software-catalog.js`), MASTER-33 + placements (`src/domain-map.js`).
3. Read human UI (`src/human-ui.js`, `src/seo-html.js`, homepage / `/p/{slug}` HTML in `src/index.js`) — buttons, `data-*` handlers, `fetch` targets, confirm/dry_run.
4. Read MCP surface (`src/mcp-surface.js`, `src/mcp-safeguard.js`, `src/fraggate/codes.js`, session tools, mesh/chainlock/memory kernels).
5. Read OpenAPI (`src/runtime-api.js` + catalog proxy paths).
6. Execute the in-process Worker handler (same as `npm test`) plus live `GET /v1/software`, `GET /v1/mesh`, `GET /v1/fraggate/list`.
7. Cross-walk the FLEET PDF names as a **completeness rubric**. Cite-only fleet objects are not treated as missing runtime engines.

FragGate is THE single public **Softwares** executable door. `POST /mcp` is the edge MCP gateway. `POST /p/{slug}/{op}` is proxy, not exec.

---

## Severity rubric

| Level | Meaning |
| --- | --- |
| **BLOCKER** | Public door cannot be used as claimed, or a live surface invents a second exec door / fake REAL. |
| **HIGH** | Catalog or launch copy lies, or a wired control is dead / `href="null"` / status contradicts FragGate. |
| **MED** | Dual-surface gap, missing labeled pane, or architecture shortcut that still reaches the same kernel. |
| **LOW** | Heritage sentence, partial allowlist text, heuristic primary op. |
| **NOTE** | By-design thin MCP door, cite-only fleet objects, fabric vs Softwares-tab. |

This audit does **not** stamp belt scores or `fielded_100`.

---

## Executive findings

**No BLOCKER** on the live tip: FragGate list → describe → call works for live catalog slugs; MCP `tools/list` is the frozen 36-name door; `#115` AZVPN is on the live Worker (`git_sha=4d043d6…`); WireGuard/OpenVPN stay `FG-STUB` / SLOT.

### HIGH

1. **Hub Softwares tab marks VeilLock `status: "live"`** (`GET /v1/software` `live_count=41`) while FragGate registry marks `veillock` **`local_only`** (`ops: []`). FLEET law: the catalog does not lie. Door and tab disagree.
2. **Heritage “VPN/hop mesh is not claimed on the public surface”** still ships in MCP `initialize.instructions` (`src/mcp-surface.js`) and homepage honesty (`src/index.js` AZMail bullet) **after** `#115` published `GET /v1/mesh` `vpn=true`, `public_vpn=true`, `default_vpn_backend=azvpn`, `vpn_auto.auto_use=true`. Live JSON is more honest than the leftover sentence. NO-LIE prefers one story: HTTPS/WS REAL, WireGuard/OpenVPN SLOT, origin-hiding false.
3. **`Use in browser` is a dead hash for 33 of 41 catalog slugs.** Softwares HTML and homepage cards link `/workspace#task-{slug}`. Labeled `#task-*` panes exist only for the eight `HUMAN_TASKS` plus fabric `#task-chainlock`.
4. **In-runtime placements emit `href="null"`** on “Download desktop” / “counted tarball” (`productUrls.download` is `null` when `worker` is absent). Hits **azvpn**, **zkattest**, **mmconsensus**, **toolbench**.

### MED

5. MCP fabric tools **`mesh_*` / `chainlock_*` / `memory_*`** (and named wrappers `decisiongate_check`, `library_lookup`) run kernel functions from `POST /mcp` **without** walking the full MASTER-33 hop list that `fraggate_call` walks. Same kernels, not a second Softwares door — but not “edge MCP → FragGate only” for those names. Human mesh **Join** uses `POST /v1/fraggate/call { slug: "mesh", op: "join" }`; MCP `mesh_join` calls `runMeshOp` directly.
6. **33 live Softwares have dashboard Run buttons with `{}` payload** (or a first non-health LIVE_OP). Only eight have labeled fields.
7. **OpenAPI omits `GET /workspace`.** Combined spec documents `/about`, `/mcp`, `/v1/fraggate/call`, and per-op `/p/{slug}/{op}` proxy paths.
8. **`FRAGGATE_CATALOG_ALLOWLIST`** in MCP `fraggate_list` / `fraggate_call` descriptions names only azhub / azinterface / azbrowser / azvpn / aznet / embryolock. Discovery still works via empty `fraggate_list`.
9. **`mesh/vpn` is a FragGate LIVE_OP** with no dedicated MCP tool and no mesh-panel button. AZVPN has a labeled task (`describe`) and `/p/azvpn` buttons.
10. MCP **`fraggate_call` is always mutating** — even `health` / `skill` need `confirm=true` or `dry_run=true`. Human HTTP FragGate does not send `confirm` (click is the operator confirm). Dual-surface policy, not a missing gate.

### LOW / NOTE

11. Sentinel / SweepGate instruction-override regex is narrow (`ignore previous instructions`, `dan mode`, `jailbreak-ignore`).  
12. Initialize heritage still says EmbryoLock is stub (later 1.7.8 sentence corrects it).  
13. No first-class `{slug}_{op}` MCP tools — **by design**. Softwares exec is `fraggate_call`.  
14. FLEET PDF names (Lumen, ark-private, trades-runtime, Whitestone, qnm-node, hedidntjump.com, anon-broadcast, …) are **cite-only** here. Not missing UI. Not missing MCP.

---

## Counts (this tip)

| Surface | Count | Honest note |
| --- | --- | --- |
| Catalog `PRODUCTS` | **41** | MASTER-33 (33) + tab placements (8): azinterface, decisiongate, forgereceipts, azcoherence, zkattest, mmconsensus, toolbench, azvpn |
| Hub `GET /v1/software` | 41 cards, `live_count=41`, `stub_count=0` | Every card uses `liveSoftwareCard` — including VeilLock |
| FragGate `LIVE_OPS` keys | **42** | 40 catalog live + kernel `mesh` + `memory` |
| FragGate registry entries | **43** | 41 products + mesh + memory. `live_count=42`, `local_only_count=1` (veillock) |
| `NAMED_STUBS` | **0** | Stubs are **ops**, not fake catalog cards |
| `HUMAN_TASKS` labeled panes | **8** | decisiongate, foldlock, azbrowser, aznet, azvpn, forgereceipts, godlock, temporallock |
| Fabric task pane | **1** | `#task-chainlock` (not a Softwares slug) |
| Public MCP `tools/list` | **36** (cap 40) | 7 door + 18 fabric + 5 helpers + 6 session |
| Mutating MCP tools | **17** | confirm documented; `required[]` does not list `confirm` |

---

## Part A — Human UI

### Surfaces checked

| Surface | What is on it | FragGate / HTTP |
| --- | --- | --- |
| `GET /` | Crawler abstract first, then `#workspace` = operator rack + tasks + `#fg-console` + `#mesh-panel` + `#dashboard` + session strip; then Softwares cards; About Aziel + hashtags + FoldLock tip | Same `humanDoorScript()` as `/workspace` |
| `GET /workspace` | Same pane, no essay cards | Same |
| `GET /about` | What / for whom / architecture. **`workerLaunchHtml`** (About Aziel + slug hashtags + FoldLock tip). **No `#op-panel` / `#dashboard` / `#fg-console`** | Cite/launch only |
| `GET /p/{slug}` | Product card + FragGate button rack if `LIVE_OPS` exist + launch partials | Buttons → `POST /v1/fraggate/call` |
| Softwares HTML `GET /v1/software` Accept: text/html | Filter + row per catalog card + Use in browser + Connect AI + describe | Links only (filter JS). No exec |
| `#op-panel` | FragGate list/describe/call; 8 soft-op buttons; AZNet pair; mesh status/join; session open/receipt/close | list/describe GET; call + mesh join + pair → FragGate; session → `/v1/session/*` |
| `#dashboard` | Metrics from `GET /v1/mesh`; 41 Softwares cards; receipts from `GET /v1/receipts` | `dash-run` → FragGate (or clicks labeled task) |
| `#fg-console` | list → describe → call | `GET /v1/fraggate/list`, `GET /v1/fraggate/describe?slug=`, `POST /v1/fraggate/call` |
| AZVPN | Labeled task `describe`; dashboard card; `/p/azvpn` LIVE_OPS buttons | FragGate `azvpn/*`. Mesh panel **cites** public VPN; does not open a session on GET |
| Mesh panel | Refresh `GET /v1/mesh`; Join `fraggate_call mesh/join` | GET never enables. Join needs product slug |

**JS handlers:** every `data-console`, `data-op-console`, `data-op-soft`, `data-op-pair`, `data-op-mesh`, `data-op-sess`, `data-op` (`.fg-door`), `.run-task`, `.dash-run`, `data-mesh`, `data-cl`, `data-sess` is bound in `humanDoorScript()`. No orphan button class was found.

**confirm / dry_run:** human HTTP FragGate and session fetches do **not** send MCP `confirm`. That is intentional for a clicked Worker UI. MCP agents still hit `MCP-CONFIRM-REQUIRED`.

**Invalid JSON:** payload parse fails closed (“Invalid JSON — not sent”). Not rewritten to `{q,text}`.

### Softwares matrix (catalog slug → UI → door)

Legend — **Door:** live FragGate / local_only. **Task:** labeled `#task-{slug}`. **Dash:** dashboard card. **`/p`:** FragGate button rack. **Use:** `/workspace#task-{slug}` target exists? **MCP:** how an agent reaches it.

| Slug | Name | Door | Task | Dash | `/p` buttons | Use-in-browser | Primary wired op | MCP |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 4dmap | 4DMap | live | missing | yes | LIVE_OPS (+aliases) | **dead hash** | first non-health (`pin`) | `fraggate_call` |
| ark | The ARK | live | missing | yes | sweep/levels/… | **dead hash** | `sweep` | `fraggate_call` |
| azai | AZAI | live | missing | yes | lamb-check/models/… | **dead hash** | `lamb-check` | `fraggate_call` |
| azbot | AZBot | live | missing | yes | route/example/… | **dead hash** | `route` | `fraggate_call` |
| azbrowser | AZBrowser | live | **ethical_search** | yes | full + `vpn` + aliases | works | `ethical_search` | `fraggate_call` (`vpn` auto-binds AZVPN) |
| azchat | AZChat | live | missing | yes | handle/room/bus/… | **dead hash** | `handle_new` | `fraggate_call` |
| azclce | AZ-CLCE | live | missing | yes | score/classify/gate | **dead hash** | `score` | `fraggate_call` |
| azcoherence | AZCoherence | live | missing | yes | review_triad/… | **dead hash** | `doctor` then first non-generic | `fraggate_call` |
| azhub | AZHub | live | missing | yes | region/place/tether + aliases | **dead hash** | `region_list` | `fraggate_call` |
| aziel-corpus | Aziel Digital Library | live | missing | yes | search/jeeves/tip-pack/… | **dead hash** | `search` | `fraggate_call` **or** `library_lookup` (search/example/skill/health only) |
| azieltether | AzielTether | live | missing | yes | verify/tip/… | **dead hash** | `verify` | `fraggate_call` |
| azinterface | AZInterface | live | missing | yes | genesis/site_state + aliases | **dead hash** | `genesis_status` | `fraggate_call` |
| azmail | AZMail | live | missing | yes | airlock/mailbox/mesh_* + aliases | **dead hash** | `airlock_classify` | `fraggate_call` |
| aznet | AZNet | live | **pair_status** + pair | yes | pair + garden/stamp/… | works | `pair_status` / `pair` | `fraggate_call` |
| azos | AZ-OS | live | missing | yes | status/session_* + aliases | **dead hash** | `status` | `fraggate_call` |
| azvpn | AZVPN | live | **describe** | yes | describe/open/send/… + SLOT stubs refuse | works | `describe` | `fraggate_call` only (no `azvpn_*` tool) |
| chronolock | ChronoLock | live | missing | yes | advisory/window + alias | **dead hash** | `advisory` | `fraggate_call` |
| codelock | CodeLock | live | missing | yes | render/gate-status | **dead hash** | `render` | `fraggate_call` |
| decisiongate | DecisionGATE | live | **check** | yes | check/evaluate/gates/… | works | `check` | `fraggate_call` **or** `decisiongate_check` |
| embryolock | EmbryoLock | live + local-destructive | missing | yes | health/skill/doctor/verify_hash/policy/limitation | **dead hash** | `doctor` / `verify_hash` | `fraggate_call`. wipe/scorch/unlock = **FG-STUB** |
| employeelock | EmployeeLock | live | missing | yes | append-preview/verify-canonical | **dead hash** | `append-preview` | `fraggate_call` |
| foldlock | FoldLock | live | **fold-preview** | yes | fold/unfold/pack-verify | works | `fold-preview` | `fraggate_call` |
| forgereceipts | ForgeReceipts | live | **receipt** | yes | receipt/verify/import_export | works | `receipt` | `fraggate_call` |
| glossafilter | Glossa Filter | live | missing | yes | render/peers | **dead hash** | `render` | `fraggate_call` |
| godlock | GodLock | live | **score** | yes | score/submit | works | `score` | `fraggate_call` |
| mialock | M.I.A.Lock | live | missing | yes | map/queries/doe-match/… | **dead hash** | `map` | `fraggate_call` |
| miragegrid | MirageGrid | live | missing | yes | assign/nodes/bridge | **dead hash** | `assign` | `fraggate_call`. vpn-hop = stub |
| mmconsensus | MMConsensus | live | missing | yes | tally/agree/limitation | **dead hash** | `tally` | `fraggate_call`. `href="null"` download |
| peacelock | PeaceLock | live | missing | yes | open/seal/stamp + doctor | **dead hash** | `open` | `fraggate_call` |
| postking | Post-King Chess | live | missing | yes | new/move/status | **dead hash** | `new` | `fraggate_call` |
| shadowlock | ShadowLock | live | missing | yes | observe/hook | **dead hash** | `observe` | `fraggate_call` |
| spectrallock | SpectralLock | live | missing | yes | modes/overlay/verify | **dead hash** | `modes` | `fraggate_call` |
| staticclock | StaticClock | live | missing | yes | advise/click/timeslate/… | **dead hash** | `advise` | `fraggate_call` |
| temporallock | TemporalLock | live | **genesis** | yes | genesis/append/verify/… | works | `genesis` | `fraggate_call` |
| toolbench | ToolBench | live | missing | yes | suite/run_case/limitation | **dead hash** | `suite` | `fraggate_call`. fielded_100 = **FG-STUB**. `href="null"` |
| trajectorylock | TrajectoryLock | live | missing | yes | analyze/verify/hash_* | **dead hash** | `example`/`analyze` | `fraggate_call` |
| veillock | VeilLock | **local_only** | missing | yes (label: local only) | **no product door** (FoldLock tip door still present) | **dead hash** | none public | FragGate `FG-LOCAL-ONLY`. Hub card still `live` |
| vibelock | VibeLock | live | missing | yes | analyze/detect | **dead hash** | `analyze` | `fraggate_call` |
| whistlelock | WhistleLock | live | missing | yes | hash-preview/hash_* | **dead hash** | `hash-preview` | `fraggate_call`. send/mail = stub |
| zkattest | ZKAttest | live | missing | yes | commit/attest/open/verify | **dead hash** | `commit` | `fraggate_call`. groth16 = SLOT/stub. `href="null"` |
| zsolver | ZionPattern Solver | live | missing | yes | patterns/score/session | **dead hash** | `patterns` | `fraggate_call`. 75% cap |

**Not Softwares-tab (still on human UI):**

| Name | UI | HTTP / MCP | Honesty |
| --- | --- | --- | --- |
| Aziel Runtime | homepage / `/about` / launch hashtags `#aziel` `#runtime` | skill, `/v1/software` host | Door, not a 42nd isolation software |
| FragGate console | `#fg-console`, `#op-panel` | list/describe/call | THE door |
| Quantum Node Mesh | `#mesh-panel`, op-panel mesh row | GET `/v1/mesh`; join via FragGate `mesh` | GET never enables. `mesh/vpn` op exists; UI does not expose a VPN button |
| ChainLock | `#task-chainlock` tip/verify | **`POST /mcp` `chainlock_tip` / `chainlock_verify`** | Fabric. Not a catalog slug. Not `fraggate_call` |
| Session | `#session-strip` + op-panel open/receipt/close | `/v1/session/*` | Advanced. Same backend as MCP `runtime_session_*` |
| FoldLock corpus tip | every launch (`#fold-pack-verify`) | FragGate `foldlock/pack-verify` | REAL tip pack; `full_library_in_process` false |
| About Aziel | `#about-aziel` on `/`, `/workspace`, `/about`, `/p/{slug}`, Softwares HTML | cite | Shared partial |

### Button → op (human)

| Control | Target |
| --- | --- |
| FragGate console / op-panel List | `GET /v1/fraggate/list` |
| Describe | `GET /v1/fraggate/describe?slug=` |
| Call / product `data-op` / `.run-task` / `.dash-run` | `POST /v1/fraggate/call { slug, op, payload }` |
| AZNet Pair status / pair | `fraggate_call` `aznet` + `pair_status` / `pair` |
| Mesh Refresh | `GET /v1/mesh` |
| Mesh Join | `fraggate_call` `mesh` / `join` |
| ChainLock tip/verify | `POST /mcp` tools/call `chainlock_tip` / `chainlock_verify` |
| Session open/policy/exec/receipt/close | `/v1/session/open`, `/policy`, `/exec`, `/receipt`, `/close` |
| Receipts refresh | `GET /v1/receipts` |
| Softwares filter | client-only hide/show |

### Broken / stub / cite-only (UI)

| Finding | Class | Severity |
| --- | --- | --- |
| `#task-{slug}` missing for 33 slugs but linked from catalog + homepage “Use in browser” | dead wiring | HIGH |
| `href="null"` Download desktop on azvpn / zkattest / mmconsensus / toolbench | broken link | HIGH |
| VeilLock hub card `live` vs FragGate `local_only` | UI claims REAL-ish live | HIGH |
| “VPN/hop mesh is not claimed” on homepage + MCP instructions vs live AZVPN cite | copy vs field | HIGH |
| Dashboard Run on slugs without fields sends `{}` | works for health-like ops; thin for mailbox/open/analyze | MED |
| `/about` has no operator rack | by design (cite page) | NOTE |
| `#115` AZVPN SLOT verbs (`wireguard`, `openvpn`, `l3_exit`, …) | UI can type them in console → **FG-STUB** (honest) | NOTE |
| Product Worker “Use in browser” on counted `*-download-tracker` hosts | out of this repo (copy rule in `docs/WORKER-LAUNCH.md`) | NOTE |

---

## Part B — MCP

### Architecture (edge)

```
Agent / connector
  → POST /mcp  (JSON-RPC initialize | tools/list | tools/call)
       → mutating? evaluateMutateSafeguard (confirm | dry_run)
       → fraggate_list / describe / verify / call     → FragGate door (full hop list on call)
       → decisiongate_check / library_lookup          → named wrappers (DecisionGATE / corpus)
       → mesh_*                                        → runMeshOp (same kernel FragGate mesh uses)
       → chainlock_*                                   → runChainlockOp (no FragGate slug)
       → memory_*                                      → runMemoryMcp (FragGate slug=memory also exists)
       → runtime_software / bundle / pull / skill / manifest
       → runtime_run / runtime_session_*               → admitCall + session (advanced)
  HTTP POST /v1/fraggate/call                           → same door, no MCP confirm
  HTTP POST /p/{slug}/{op}                              → proxy, not exec
```

Live `GET /mcp` already publishes `gateway.role=edge-mcp-gateway`, `gateway.second_door=false`. That is true for **Softwares exec**. It is **not** true that every MCP tool is `fraggate_call`.

Honesty labels for fabric:

| Name | Class | Notes |
| --- | --- | --- |
| FragGate `fraggate_*` | **REAL** door | list/describe/verify/call |
| Softwares via `fraggate_call` | **REAL** in-process where digest exists; **SLOT/STUB** where `STUB_OPS` say so | AZVPN HTTPS/WS REAL; WG/OVPN SLOT |
| `decisiongate_check` | **REAL** five gates + ledger stamp | Also inside `fraggate_call` |
| `library_lookup` | **REAL** corpus cite | Not AKM, not ChainLock |
| `mesh_*` | **REAL** rollup / join / refuse; radios GET-cite | `mesh_disable` refuses `MESH-DISABLE-REFUSED`. `mesh/vpn` is FragGate-only |
| `chainlock_*` | **REAL** local stamps (CL-WP-0.4) | No Softwares card. No `chainlock_delete` |
| `memory_*` | **HEURISTIC** belief (AKM-TRIAD), ≠ truth | FragGate slug `memory`, `software_tab: false` |
| `runtime_session_*` / `runtime_run` | **REAL** session object when `SESSION` bound | Advanced; DecisionGATE-admitted exec |
| AZVPN auto_use | **REAL** cite + HTTPS/WS sessions; **SLOT** L3 | Callers should not name `software=azvpn` on auto hooks; explicit ops still exist |
| ToolBench `fielded_100` | **SLOT / FG-STUB** | Self-test ≠ third-party lab |

### tools/list (36) vs registry vs OpenAPI

Public names are exactly `PUBLIC_MCP_TOOLS` in `src/fraggate/codes.js`. Live `POST /mcp tools/list` matches. OpenAPI documents `POST /mcp` and `POST /v1/fraggate/call`; it does **not** explode 36 tools as OpenAPI operations (agents use JSON-RPC). Per-slug `/p/{slug}/{op}` paths are **proxy** operations (`operationId` `{slug}_{op}`) — leftover naming, not a second MCP pile.

No orphan MCP tool (name not in `PUBLIC_MCP_TOOLS`).  
No `{slug}_{op}` tool in `tools/list`. Unknown names → `FG-HALLUC-TOOL`.

**Registry orphans (FragGate slug with no dedicated MCP tool):** every Softwares slug except the wrappers below. **By design.**  
**MCP names with no Softwares card:** door + fabric + helpers + session (table).  
**FragGate slug + MCP family:** `mesh` (`mesh_*`), `memory` (`memory_*`).  
**MCP family with no FragGate slug:** `chainlock_*`.

### Per-tool matrix

`inputSchema` always documents `confirm` / `dry_run` on mutating tools; `required[]` does **not** include `confirm` (connector refresh). Runtime still refuses `MCP-CONFIRM-REQUIRED`.

| Tool | Kind | confirm gate | Maps to | Architecture fit |
| --- | --- | --- | --- | --- |
| runtime_skill | door/helper | no | `GET /v1/skill` | Read. Playbook. |
| fraggate_list | door | no | `GET /v1/fraggate/list` | Discovery. |
| fraggate_describe | door | no | `GET /v1/fraggate/describe` | One card. |
| fraggate_verify | door | no | `POST /v1/fraggate/verify` | Digest proof. |
| fraggate_call | door **exec** | **yes** | any `LIVE_OPS` slug/op | THE Softwares door. Always gated. |
| decisiongate_check | named wrapper | **yes** | `decisiongate/check` + ledger | Skips full hop list; stamps ledger. |
| library_lookup | named wrapper | no | `aziel-corpus` search/example/skill/health | Not full corpus LIVE_OPS (no jeeves/media-run). |
| mesh_status | fabric | no | `GET /v1/mesh` / `mesh/status` | Direct `runMeshOp`. |
| mesh_nodes | fabric | no | roster | Direct. |
| mesh_enable | fabric | **yes** | extra bearer | Direct. GET never enables. |
| mesh_disable | fabric | no | refuse `MESH-DISABLE-REFUSED` | Honest non-kill-switch. |
| mesh_join | fabric | **yes** | `mesh/join` | Direct; human UI uses FragGate. |
| mesh_heartbeat | fabric | **yes** | TTL refresh | Direct. |
| mesh_leave | fabric | **yes** | drop node | Direct. |
| mesh_broadcast | fabric | **yes** | hash receipt, never publish | Direct. |
| chainlock_append | fabric | **yes** | local chain | No FragGate slug. |
| chainlock_tip | fabric | no | tip read | Human UI uses this via `/mcp`. |
| chainlock_recall | fabric | no | depth 0–5 | |
| chainlock_verify | fabric | no | integrity | Human UI button. |
| chainlock_seal | fabric | **yes** | LOCKSET write | ≠ `runtime_session_close`. |
| memory_observe | fabric | **yes** | AKM observe | Belief ≠ truth. |
| memory_resolve | fabric | **yes** | resolve | |
| memory_calibrate | fabric | **yes** | calibrate | |
| memory_recall | fabric | no | recall | |
| memory_get | fabric | no | explain | |
| runtime_software | helper | no | `GET /v1/software` | Hub cards. |
| runtime_bundle | helper | no | skill URL bootstrap | |
| runtime_pull | helper | no | one card + skill | |
| runtime_run | helper **adv** | **yes** | admit + session exec | Second exec façade; still DecisionGATE-admitted. |
| runtime_manifest | helper **adv** | no | machine JSON | |
| runtime_session_open | session **adv** | **yes** | `/v1/session/open` | |
| runtime_session_policy | session **adv** | **yes** | `/policy` | |
| runtime_session_exec | session **adv** | **yes** | `/exec` | |
| runtime_session_receipt | session **adv** | no | last receipt | |
| runtime_session_receipts | session **adv** | no | chain | |
| runtime_session_close | session **adv** | **yes** | seal session | ≠ chainlock_seal |

**Dangerous without confirm:** none on the MCP surface for the 17 mutating names — runtime enforces. Human HTTP FragGate can mutate (ledger, mesh join, AZVPN open) on click without `confirm=true`. Treat as operator UI, not an agent hole.

**Schema drift:**

- `FRAGGATE_CATALOG_ALLOWLIST` ≠ full `LIVE_OPS` (MED).
- OpenAPI `fraggate_call` summary lists AZVPN `describe/open/status/list/close` and omits `send/recv/pull/peers/attach` that are live (LOW).
- MCP initialize still contains “VPN/hop mesh is not claimed” (HIGH copy) **and** later `#115` / AZVPN sentences (same blob).
- `library_lookup` enum omits most `aziel-corpus` LIVE_OPS (NOTE — helper, not the door).
- No `mesh_vpn` tool while `MESH_CANONICAL_OPS` includes `vpn` (MED).

**Instruction scrub:** Sentinel `POISON` / SweepGate block-keys catch a short list of override phrases. Not a second door. Residual jailbreak phrasing that does not match the regex is **LOW**.

---

## Dual-surface parity gaps (human vs MCP vs OpenAPI)

| Act | Human UI | MCP | OpenAPI | Gap |
| --- | --- | --- | --- | --- |
| Softwares exec | `POST /v1/fraggate/call` no confirm | `fraggate_call` + confirm | `POST /v1/fraggate/call` | Confirm policy differs (MED) |
| Discovery | console List | `fraggate_list` | `GET /v1/fraggate/list` | OK |
| Hub catalog | Softwares HTML + dashboard | `runtime_software` | `GET /v1/software` | VeilLock status differ (HIGH) |
| Mesh join | FragGate `mesh/join` | `mesh_join` → `runMeshOp` | `POST /v1/mesh/join` (HTTP mesh) | Wrapper skips door hops (MED) |
| Mesh VPN | cite on status line; AZVPN task | no `mesh_vpn`; `fraggate_call mesh/vpn` or `azvpn/*` | mesh + azvpn paths | UI/MCP incomplete vs LIVE_OPS (MED) |
| ChainLock | `/mcp` tools/call | `chainlock_*` | not a FragGate path | OK (fabric) |
| Session | `/v1/session/*` | `runtime_session_*` | session paths | OK |
| Workspace page | `/` + `/workspace` | — | **missing `/workspace`** | MED |
| Proxy | documented, not the button default | instructions: proxy ≠ exec | `/p/{slug}/{op}` proxy ops | OK |

---

## FLEET 1000-PATH rubric (cite-only)

PDF belt numbers are **operator receipt**, not this audit’s scores. Mapping only:

| Fleet name | In this runtime? | UI | MCP | Rubric note |
| --- | --- | --- | --- | --- |
| aziel-runtime / FragGate | door + kernel | homepage, console | door tools | Loaded as door. Not a Softwares isolation slug |
| decisiongate, azbot | catalog live | dash; DG has task | `fraggate_call` (+ DG wrapper) | Loaded |
| ark (public) | catalog live (heuristics) | dash | `fraggate_call` | Hosted never unlocks. Phrase endpoint absent |
| ark-private | **no** | — | — | Cite-only. Correct |
| EmbryoLock | catalog live + STUB wipe | dash, no labeled task | `fraggate_call` | Local-destructive boundary honest |
| temporallock, forgereceipts | catalog + labeled tasks | yes | `fraggate_call` | Loaded |
| TemporalLock origin acct | **no extra slug** | — | — | Cite-only mirror note |
| anon-broadcast | **not a catalog product** | mesh copy forbids it | — | Cite-only / local qnm-node sibling |
| lumen | **not listed live OS** | — | — | Struck. Correct |
| trades-runtime, Whitestone | **no** | — | — | Verticals. Not ingested |
| godlock, aziel-corpus | catalog live | dash; corpus no task | call / library_lookup | Loaded |
| azieleliab | hub cite only | About / hubs list | — | Landing, not a slug |
| qnm-node | local process cite | mesh copy | mesh_* | Not hosted |
| azieltether, miragegrid | catalog live | dash | `fraggate_call` | Not a VPN |
| azhub, azinterface, azos, azai, azchat, azmail, aznet, azbrowser, AZCoherence | catalog live | dash; browser/net have tasks | `fraggate_call` | Loaded |
| locks (chrono/code/shadow/static/peace/fold/whistle/employee/mia/veil/vibe) | catalog; veil local_only | dash; fold labeled | call / local_only | VeilLock tab/door mismatch |
| hedidntjump.com | sitemap sister cite | — | — | Not a module |
| zion-pattern-solver | slug `zsolver` | dash | `fraggate_call` | Loaded |
| 4dmap, spectrallock, trajectorylock, postking-chess, glossafilter, az-clce | catalog | dash | `fraggate_call` | Loaded |
| zkattest, mmconsensus, toolbench, azvpn | **runtime placements** (not in the 2026-09-17 PDF table) | dash; azvpn labeled | `fraggate_call` | `#106` / `#115`. PDF predates AZVPN row |

Runtime 1000 door checklist from the PDF vs this tip:

| Checklist | This tip |
| --- | --- |
| catalog/OpenAPI slugs = processes that load | **PARTIAL** — VeilLock card is live-named, door is local_only |
| Lumen not listed as live OS | **PASS** |
| ARK separate + no phrase endpoint | **PASS** (sweep/levels only; unlock stub) |
| QNS medium cite, no public qnsd | **PASS** (`GET /v1/qns` cite) |
| mesh default / GET never enables | **PASS** (suite-presence ON; GET does not arm radios; join is POST) |
| FragGate only door / DG refuse tested | **PASS** for Softwares; fabric MCP wrappers are extra |
| No IP allow/block UI / no Node Gate panel | **PASS** (no operator home/county UI) |
| One version string | **PASS** `2.0.0-rc1` on package + Worker + cite |

---

## Softwares missing UI / missing MCP / MCP orphans

**Missing labeled human UI (present as card only):**  
`4dmap`, `ark`, `azai`, `azbot`, `azchat`, `azclce`, `azcoherence`, `azhub`, `aziel-corpus`, `azieltether`, `azinterface`, `azmail`, `azos`, `chronolock`, `codelock`, `embryolock`, `employeelock`, `glossafilter`, `mialock`, `miragegrid`, `mmconsensus`, `peacelock`, `postking`, `shadowlock`, `spectrallock`, `staticclock`, `toolbench`, `trajectorylock`, `veillock`, `vibelock`, `whistlelock`, `zkattest`, `zsolver`.

**Missing public FragGate door:** `veillock` only (local_only). Correct for device-local camera steps — incorrect if the hub tab keeps saying `live` without a door label.

**Missing first-class MCP tool (by design, not a defect unless the operator wanted a pile):** all Softwares. Reach them with `fraggate_call`.

**Actually missing MCP reach:** none of the 40 live catalog slugs. `library_lookup` does not cover full corpus ops. `mesh/vpn` has no `mesh_vpn` tool.

**MCP orphans:** none.  
**Registry extras that are not Softwares cards:** `mesh`, `memory`.  
**MCP extras that are not registry Softwares:** door/helpers/session + `chainlock_*`.

---

## Recommended fix order

Do **not** batch-ingest FLEET vaults. Door only.

1. **Honesty copy (HIGH):** delete or rewrite “VPN/hop mesh is not claimed on the public surface” wherever `#115` is live. Keep REAL/SLOT/origin-hiding=false.
2. **Hub vs door (HIGH):** on `GET /v1/software`, either mark VeilLock `local_only` / `door: none` or add an explicit `fraggate_status` so `status` is not read as “public door live”.
3. **Null downloads (HIGH):** hide “Download desktop” / “counted tarball” when `worker` is absent (azvpn, zkattest, mmconsensus, toolbench).
4. **Use-in-browser (HIGH):** link unlabeled slugs to `/p/{slug}` or `/workspace#dashboard` / `[data-dash-slug=]`, not a missing `#task-*`.
5. **Labeled tasks (MED):** add panes for azmail, azhub, azinterface, aziel-corpus, 4dmap, embryolock (cite/limitation), peacelock — or stop advertising “Use in browser” as a task.
6. **MCP fabric (MED):** either route `mesh_*` through `fraggate_call { slug: "mesh" }` so the hop list matches the human Join button, or document the wrappers as fabric (not a second Softwares door) in `GET /mcp` and skill.
7. **mesh/vpn surface (MED):** mesh-panel button and/or `mesh_vpn` helper, or strike `vpn` from `MESH_CANONICAL_OPS` if AZVPN task is the only human path.
8. **OpenAPI (MED):** add `GET /workspace`. Expand `fraggate_call` examples to AZVPN send/recv and the rest of LIVE_OPS (or point at `fraggate_describe`).
9. **Allowlist text (LOW):** generate `FRAGGATE_CATALOG_ALLOWLIST` from `LIVE_OPS` or rename it so it is not read as the full door.
10. **Confirm UX (LOW):** keep MCP confirm; do not add it to human clicks. Optionally stop gating `fraggate_call` health/skill (schema change — not this PR).

---

## Close-test

`scripts/verify-human-ui-mcp-audit.mjs` asserts: 41 products, VeilLock local_only on FragGate, AZVPN in tasks + LIVE_OPS + STUB wireguard, 36 MCP names, mutating confirm schema, human script targets, dead `#task-*` set, `href="null"` on `/p/azvpn`, OpenAPI `/workspace` omitted, MCP `fraggate_call` without confirm → `MCP-CONFIRM-REQUIRED`, live-shaped in-process calls for `azvpn/describe` and `azvpn/wireguard` stub.

`npm test` includes this script after `verify-human-ui.mjs`.

---

## What this document does not do

It does not implement the 46 FLEET paths. It does not open Lumen. It does not merge EmbryoLock away. It does not put the fleet inside the door. It does not stamp 1000-hard or `fielded_100`. Author field: Aziel Eliab.
