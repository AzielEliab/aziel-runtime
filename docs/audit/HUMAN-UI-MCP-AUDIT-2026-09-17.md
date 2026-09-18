# Audit: Softwares human UI + MCP wiring

**Date:** 2026-09-17 (written 2026-09-18 UTC against the live tip; MED/LOW remediations 2026-09-18)  
**Repo:** [AzielEliab/aziel-runtime](https://github.com/AzielEliab/aziel-runtime)  
**Base:** latest `main` `06048d4` — **Audit: Softwares human UI + MCP wiring (#116)**  
**Live front door:** `https://aziel-runtime.vibelock.workers.dev/` (User-Agent `Mozilla/5.0`)  
**Live `GET /v1/software`:** `version=2.0.0-rc1` (tip SHA is this PR after #116)  
**Identity:** Aziel Eliab only  
**Scope:** Human UI + MCP audit, then security / node-mesh / VPN / radios launch-readiness. #116 closed HIGH + one-click suite pack. This follow-up closes remaining MED/LOW launch leftovers. Close-test: `scripts/verify-human-ui-mcp-audit.mjs`  
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

### HIGH (found on `4d043d6`; closed in this PR)

1. **Hub Softwares tab marked VeilLock `status: "live"`** while FragGate marked `local_only`. **Closed:** hub card is `local_only` / `door: none` / `fraggate_status: local_only`. `live_count=40`.
2. **Heritage “VPN/hop mesh is not claimed on the public surface”** vs live `vpn=true`. **Closed:** MCP initialize, homepage, skill, OpenAPI use AZVPN REAL/SLOT copy.
3. **`Use in browser` was a dead hash for 33 of 41 slugs.** **Closed:** unlabeled slugs link `/p/{slug}`.
4. **In-runtime placements emitted `href="null"`.** **Closed:** those cards say “no counted Worker tarball (in-runtime)”.

### MED

5. MCP fabric tools **`mesh_*` / `chainlock_*` / `memory_*`** (and named wrappers `decisiongate_check`, `library_lookup`) run kernel functions from `POST /mcp` **without** walking the full MASTER-33 hop list that `fraggate_call` walks. **Closed as documented:** `GET /mcp` `gateway.fabric.hop_list=kernel-direct`, `master_33=false`, `second_softwares_door=false`. Same kernels. Not a second Softwares door.
6. **Dashboard Run with `{}`** remains for unlabeled slugs. **15** Softwares now have labeled fields (was 8). Remaining cards use `/p/{slug}`.
7. **OpenAPI omits `GET /workspace`.** **Closed in #116.**
8. **`FRAGGATE_CATALOG_ALLOWLIST`** **Closed:** generated from `LIVE_OPS` + compact verify tokens; prefixed “not the full door.”
9. **`mesh/vpn`** **Closed in #116** (mesh-panel + FragGate). Extra-bearer button added in the MED/LOW PR.
10. MCP **`fraggate_call` is always mutating** — even `health` / `skill` need `confirm=true` or `dry_run=true`. Human HTTP FragGate does not send `confirm` (click is the operator confirm). Dual-surface policy, kept.

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
| Hub `GET /v1/software` | 41 cards, `live_count=40`, `local_only_count=1`, `stub_count=0` | VeilLock matches FragGate `local_only` |
| FragGate `LIVE_OPS` keys | **42** | 40 catalog live + kernel `mesh` + `memory` |
| FragGate registry entries | **43** | 41 products + mesh + memory. `live_count=42`, `local_only_count=1` (veillock) |
| `NAMED_STUBS` | **0** | Stubs are **ops**, not fake catalog cards |
| `HUMAN_TASKS` labeled panes | **15** | original 8 + azmail, azhub, azinterface, aziel-corpus, 4dmap, embryolock, peacelock |
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
| 4dmap | 4DMap | live | **pin** | yes | LIVE_OPS (+aliases) | works | `pin` | `fraggate_call` |
| ark | The ARK | live | missing | yes | sweep/levels/… | **dead hash** | `sweep` | `fraggate_call` |
| azai | AZAI | live | missing | yes | lamb-check/models/… | **dead hash** | `lamb-check` | `fraggate_call` |
| azbot | AZBot | live | missing | yes | route/example/… | **dead hash** | `route` | `fraggate_call` |
| azbrowser | AZBrowser | live | **ethical_search** | yes | full + `vpn` + aliases | works | `ethical_search` | `fraggate_call` (`vpn` auto-binds AZVPN) |
| azchat | AZChat | live | missing | yes | handle/room/bus/… | **dead hash** | `handle_new` | `fraggate_call` |
| azclce | AZ-CLCE | live | missing | yes | score/classify/gate | **dead hash** | `score` | `fraggate_call` |
| azcoherence | AZCoherence | live | missing | yes | review_triad/… | **dead hash** | `doctor` then first non-generic | `fraggate_call` |
| azhub | AZHub | live | **region_list** | yes | region/place/tether + aliases | works | `region_list` | `fraggate_call` |
| aziel-corpus | Aziel Digital Library | live | **search** | yes | search/jeeves/tip-pack/… | works | `search` | `fraggate_call` **or** `library_lookup` (search/example/skill/health only) |
| azieltether | AzielTether | live | missing | yes | verify/tip/… | **dead hash** | `verify` | `fraggate_call` |
| azinterface | AZInterface | live | **genesis_status** | yes | genesis/site_state + aliases | works | `genesis_status` | `fraggate_call` |
| azmail | AZMail | live | **airlock_classify** | yes | airlock/mailbox/mesh_* + aliases | works | `airlock_classify` | `fraggate_call` |
| aznet | AZNet | live | **pair_status** + pair | yes | pair + garden/stamp/… | works | `pair_status` / `pair` | `fraggate_call` |
| azos | AZ-OS | live | missing | yes | status/session_* + aliases | **dead hash** | `status` | `fraggate_call` |
| azvpn | AZVPN | live | **describe** | yes | describe/open/send/… + SLOT stubs refuse | works | `describe` | `fraggate_call` only (no `azvpn_*` tool) |
| chronolock | ChronoLock | live | missing | yes | advisory/window + alias | **dead hash** | `advisory` | `fraggate_call` |
| codelock | CodeLock | live | missing | yes | render/gate-status | **dead hash** | `render` | `fraggate_call` |
| decisiongate | DecisionGATE | live | **check** | yes | check/evaluate/gates/… | works | `check` | `fraggate_call` **or** `decisiongate_check` |
| embryolock | EmbryoLock | live + local-destructive | **limitation** | yes | health/skill/doctor/verify_hash/policy/limitation | works | `limitation` / `doctor` / `verify_hash` | `fraggate_call`. wipe/scorch/unlock = **FG-STUB** |
| employeelock | EmployeeLock | live | missing | yes | append-preview/verify-canonical | **dead hash** | `append-preview` | `fraggate_call` |
| foldlock | FoldLock | live | **fold-preview** | yes | fold/unfold/pack-verify | works | `fold-preview` | `fraggate_call` |
| forgereceipts | ForgeReceipts | live | **receipt** | yes | receipt/verify/import_export | works | `receipt` | `fraggate_call` |
| glossafilter | Glossa Filter | live | missing | yes | render/peers | **dead hash** | `render` | `fraggate_call` |
| godlock | GodLock | live | **score** | yes | score/submit | works | `score` | `fraggate_call` |
| mialock | M.I.A.Lock | live | missing | yes | map/queries/doe-match/… | **dead hash** | `map` | `fraggate_call` |
| miragegrid | MirageGrid | live | missing | yes | assign/nodes/bridge | **dead hash** | `assign` | `fraggate_call`. vpn-hop = stub |
| mmconsensus | MMConsensus | live | missing | yes | tally/agree/limitation | **dead hash** | `tally` | `fraggate_call`. `href="null"` download |
| peacelock | PeaceLock | live | **open** | yes | open/seal/stamp + doctor | works | `open` | `fraggate_call` |
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
| trades-runtime, Whitestone | **cite-only** (trades-runtime) / **no** (Whitestone) | — | — | Trades-Runtime is machine-cited on `/cite.json` `sister_products` + catalog extras `cite_only`. Not a FragGate true-engine. `fraggate_call` does not execute company ops. Whitestone still not ingested |
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
`ark`, `azai`, `azbot`, `azchat`, `azclce`, `azcoherence`, `azieltether`, `azos`, `chronolock`, `codelock`, `employeelock`, `glossafilter`, `mialock`, `miragegrid`, `mmconsensus`, `postking`, `shadowlock`, `spectrallock`, `staticclock`, `toolbench`, `trajectorylock`, `veillock`, `vibelock`, `whistlelock`, `zkattest`, `zsolver`.  
(azmail / azhub / azinterface / aziel-corpus / 4dmap / embryolock / peacelock now have labeled panes.)

**Missing public FragGate door:** `veillock` only (local_only). Correct for device-local camera steps — incorrect if the hub tab keeps saying `live` without a door label.

**Missing first-class MCP tool (by design, not a defect unless the operator wanted a pile):** all Softwares. Reach them with `fraggate_call`.

**Actually missing MCP reach:** none of the 40 live catalog slugs. `library_lookup` does not cover full corpus ops. `mesh/vpn` has no `mesh_vpn` tool.

**MCP orphans:** none.  
**Registry extras that are not Softwares cards:** `mesh`, `memory`.  
**MCP extras that are not registry Softwares:** door/helpers/session + `chainlock_*`.

---

## Recommended fix order

Do **not** batch-ingest FLEET vaults. Door only.

### Closed in this PR (HIGH + one-click)

1. **Honesty copy:** rewrite leftover “VPN/hop mesh is not claimed on the public surface” (MCP initialize, homepage / skill / OpenAPI). Story is now: HTTPS/WS REAL, WireGuard/OpenVPN SLOT, origin-hiding false.
2. **Hub vs door:** `GET /v1/software` marks VeilLock `status=local_only`, `door=none`, `fraggate_status=local_only`. `live_count=40`, `local_only_count=1`.
3. **Null downloads:** hide “Download desktop” / counted tarball when `worker` is absent.
4. **Use-in-browser:** labeled `HUMAN_TASKS` keep `/workspace#task-{slug}`; everyone else goes to `/p/{slug}`.
5. **mesh/vpn + radios UI:** mesh panel + op-panel expose status / nodes / join / heartbeat / leave / VPN cite via FragGate. Honesty: `worker_hardware:false`, channel plane CITE, GET never enables.
6. **OpenAPI:** `GET /workspace`, `GET /download`, `GET /v1/download`, `GET /v1/suite/download`.
7. **One-click suite pack:** prominent UI (nav + op-panel + dashboard + Softwares HTML) + counted `GET /download` JSON. REAL catalog/tip/cites; SLOT wasm / WG / OpenVPN. Not fielded_100.

### Follow-up fix PR (remaining MED / LOW)

Closed in the MED/LOW remediations PR (this file’s remediations table). Items that stay SLOT / by-design are listed there.

8. **Labeled tasks (MED):** add panes for azmail, azhub, azinterface, aziel-corpus, 4dmap, embryolock (cite/limitation), peacelock — only where operators actually click.
9. **MCP fabric (MED):** either route `mesh_*` through `fraggate_call { slug: "mesh" }` so the hop list matches the human Join button, or document the wrappers as fabric (not a second Softwares door) in `GET /mcp` and skill. Do **not** add `mesh_vpn` as a 37th MCP tool (cap 40; door is `fraggate_call`).
10. **Allowlist text (LOW):** generate `FRAGGATE_CATALOG_ALLOWLIST` from `LIVE_OPS` or rename it so it is not read as the full door.
11. **Confirm UX (LOW):** keep MCP confirm; do not add it to human clicks. Optionally stop gating `fraggate_call` health/skill (schema change).
12. **qnm-node bearers (MED, local):** field wifi / bluetooth / rf / photon on local `qnm-node` / `qnsd`. Worker stays cite-only. Do not invent isolate hardware.
13. **Ledger durability (MED, ops):** bind CHAINLOCK / SESSION / RATE on production so labels say durable-commit, not isolate MemoryStore.
14. **Product Worker tarballs (LOW):** in-runtime placements (azvpn, zkattest, mmconsensus, toolbench) stay without counted `*-download-tracker` hosts unless a real Worker ships.

---

## Remediations (MED/LOW launch leftovers, post-#116)

Honest completeness. **Never `fielded_100`.** Softwares stay separate. FragGate stays THE door. AZVPN `auto_use` stays. Mesh overrides ON (operator). Identity Aziel Eliab only.

| ID | Leftover | What landed | Class now |
| --- | --- | --- | --- |
| R8 | Labeled `#task-*` panes | Added azmail (`airlock_classify`), azhub (`region_list`), azinterface (`genesis_status`), aziel-corpus (`search`), 4dmap (`pin`), embryolock (`limitation` + doctor/verify_hash), peacelock (`open`). `HUMAN_TASKS` = **15**. Use-in-browser for those slugs is `/workspace#task-{slug}`. Remaining catalog slugs still `/p/{slug}`. | MED → closed |
| R9 | MCP fabric hop-list | Documented as **kernel-direct** on `GET /mcp` `gateway.fabric` + initialize + mesh/DecisionGATE/library descriptions. `master_33: false`, `second_softwares_door: false`, `same_kernels: true`. Softwares exec stays `fraggate_call` only. No 37th `mesh_vpn` tool. | MED → closed (documented; not rerouted) |
| R10 | Allowlist text | `FRAGGATE_CATALOG_ALLOWLIST` is generated from `LIVE_OPS` slugs + compact verify tokens. Prefix: not the full door; empty `fraggate_list` is discovery. | LOW → closed |
| R11 | Confirm UX | Unchanged: MCP confirm stays; human clicks stay operator confirm. Health/skill still gated on MCP (schema change declined). | LOW → kept |
| R12 | qnm-node radios | `qnm-node/bearers/radio.js` — LIVE-when-HW-present / `QNM-RADIO-ABSENT` when absent. **No mock.** Worker `channel_plane.worker_hardware: false`. Photon is local qnsd loopback only. | MED → closed (hooks; full node still SLOT) |
| R13 | Production DO binds | `wrangler.toml` already bound SESSION / CHAINLOCK / RATE. Cite on `GET /mcp` `production_binds` + `durability.production_binds`. Isolate tests still label MemoryStore when unbound. | MED → closed (binds verified + labeled) |
| R14 | Product tarballs | In-runtime placements stay without invented `*-download-tracker` hosts. | LOW → kept SLOT |
| R6+ | mesh_enable UI | Mesh panel + op-panel expose extra-bearer (rate-limited; GET never enables). | optional → closed |
| OpenAPI | AZVPN examples | `status` / `list` / `send` / `recv` / `close` added next to describe/open. | LOW → closed |
| Heritage | EmbryoLock stub sentence | Initialize 1.6.11 heritage note now points at 1.7.8 live-with-local-destructive-boundary. | LOW → closed |

**Still SLOT / not a goal**

| Item | Why it stays |
| --- | --- |
| ToolBench `fielded_100` | `FG-STUB`. Self-test ≠ third-party lab. |
| WireGuard / OpenVPN / L3 | AZVPN SLOT. HTTPS/WS REAL. |
| Worker RF / BT / Wi-Fi / photon hardware | Cite-only. Local hooks refuse when HW absent. |
| Full `qnm-node` boot/chain/apg/phoenix | Parent package. This repo has radio hooks only. |
| Product Worker tarballs for in-runtime placements | No invented tracker hosts. |
| 41/41 labeled field panes | Completeness, not launch-block. Cards + `/p/{slug}` remain. |
| FLEET cite-only objects | Cite ≠ loaded. |
| Fabric wrappers walking MASTER-33 | Documented kernel-direct. Reroute declined (no second door; hop stamps stay on `fraggate_call`). |

---

## Part C — SECURITY + NODEMESH + VPN + RADIOS

Probed in-process Worker + source (`src/mesh.js`, `src/mesh-nine-laws.js`, `src/mesh-channel-plane.js`, `src/public-vpn.js`, `src/azvpn-auto.js`, `src/security-headers.js`, `src/rate-quota.js`, `src/request-limits.js`, `src/durability-labels.js`, `src/workspace.js`). Live door shape matches `#115` tip.

| ID | Surface | What is true | Gap / risk | Sev |
| --- | --- | --- | --- | --- |
| S1 | FragGate sole door | Softwares exec is `POST /v1/fraggate/call`. `POST /p/{slug}/{op}` is proxy. MCP `fraggate_call` is the exec tool. `GET /mcp` publishes `second_door=false` and `fabric.hop_list=kernel-direct`. | Fabric MCP `mesh_*` / `chainlock_*` / `memory_*` skip MASTER-33 (same kernels). Documented. Not a second Softwares door. | NOTE (was MED) |
| S2 | confirm / dry_run | 17 mutating MCP tools require `confirm=true` or `dry_run=true`. Runtime `MCP-CONFIRM-REQUIRED`. Human click is operator confirm (no MCP confirm). | Dual-surface policy. Do not add confirm to human HTTP. | NOTE |
| S3 | Security headers | CSP (HTML `unsafe-inline` honest; API `default-src 'none'`), HSTS `max-age=31536000; includeSubDomains`, `X-Frame-Options: DENY`, nosniff, `Referrer-Policy: no-referrer`. | `unsafe-inline` is required for the FragGate door script. Not a fake lock. | LOW |
| S4 | Rate / body / deadline | FragGate HTTP + MCP share RATE DO (or isolate window). Caps: 256 KiB, depth 12, 25s. Codes `RATE_LIMIT` / `BODY_TOO_LARGE` / `BODY_TOO_DEEP` / `REQUEST_DEADLINE`. | Unbound deploys are isolate-window, labeled as such. | NOTE |
| S5 | Workspace isolation | AZHub / AZInterface namespace by session or operator token (F02). Public FragGate uses ephemeral public-demo singleton. `confirm:true` is not auth. | PASS for the claimed model. | NOTE |
| S6 | Ledger durability | FragGate public window cap 64, ephemeral unless CHAINLOCK bound. SESSION / RATE labeled when bound. MemoryStore never durable. AKM ≠ commit. `wrangler.toml` binds SESSION / CHAINLOCK / RATE. `GET /mcp` cites `production_binds`. | Isolate tests still label MemoryStore when unbound. | NOTE (was MED) |
| S7 | Vault / OAuth / DOI | No vault ingest on the public door. `/.well-known/oauth-protected-resource` has empty `authorization_servers`. `/cite.json` refuses injected DOI. Plane B `doi` null. | PASS. Do not invent OAuth IdP or DOI. | NOTE |
| M1 | Mesh join/leave/heartbeat/status | LIVE. `product` required on join. `node_id` 8–80 `[a-z0-9._-]`. Presence live/locked/isolated. TTL **5 minutes**. Heartbeat refreshes. Miss → drop. GET `/v1/mesh` never enables. | Human UI now wires status/nodes/join/heartbeat/leave. | NOTE (was MED) |
| M2 | MESH-OFF / disable | Join/heartbeat/broadcast refuse `MESH-OFF` when transmission radios are not LIVE. `mesh_disable` / `POST /v1/mesh/disable` refuse `MESH-DISABLE-REFUSED`. Suite-presence ON by default. | PASS. Public kill-switch does not exist. | NOTE |
| M3 | Nine laws + operator override | Hard-true machine fields. Overrides 2026-09-17: `auto_heal` / `implicit_heal`, `node_gate` / `get_is_node_gate`, `neighbor_heal`, `network` ON, `anonymity_network` mode flag. Die-with-pull / no godlock.uk / Cap-7 stay. | Vote-to-fix and apply-last-packet still refuse. Node Gate is cite, not a login/IP panel. | NOTE |
| M4 | REHEAL / phoenix / split wires / die-with-pull | Isolation is the cure. Phoenix local-only. Clocks do not share a socket. Sites pulled die with the pull. Neighbors do not phoenix. | LIVE as refuse law + cite. Local qnm-node phoenix wait is **not** this Worker. | NOTE |
| M5 | LIVE vs cite vs SLOT | Suite-presence + join roster = LIVE. Channel plane + qnsd = CITE. WG/OVPN/L3 = SLOT. FoldLock tip = REAL. Full library = not in-process. | Heritage “not a VPN” copy was HIGH; rewritten this PR. | NOTE |
| V1 | AZVPN vpn:true / auto_use / concentrator | `GET /v1/mesh` `vpn=true`, `public_vpn=true`, `default_vpn_backend=azvpn`, `auto_use=true`. FragGate `mesh/vpn` + `azvpn/*`. | GET never opens. Auto-bind refuses honestly (`fake_connected: false`). | NOTE |
| V2 | REAL vs SLOT | HTTPS/WS + FragGate envelopes REAL. WireGuard / OpenVPN / L3 / kernel UDP SLOT (`FG-STUB` / `AZVPN-SLOT-*`). `origin_hiding=false`. | Typing SLOT verbs in the console refuses honestly. | NOTE |
| V3 | FragGate-only VPN exec | No `azvpn_*` MCP pile. Agents use `fraggate_call`. Human AZVPN task + `/p/azvpn` + mesh VPN cite. | No dedicated `mesh_vpn` MCP tool (by design; cap). | NOTE |
| B1 | AZBrowser + AZNet | Separate Softwares. Pair = order/token. Pairing ≠ tunnel. UI Pair status / pair buttons → FragGate. Honesty banners on dash cards. `vpn` on AZBrowser auto-binds AZVPN. | Chromium / Tor / phoenix stay stub / DEFERRED. | NOTE |
| R1 | RF / Wi-Fi / Bluetooth / photon | `channel_plane` wifi/bt/rf/photon ON as cites. `worker_hardware:false`. `invented_hardware:false`. `public_proxy:false`. Local `qnm-node` / `qnsd`. | Human radios metric is suite-presence, not a radio toggle. Buttons do not claim live Worker RF. | NOTE (was HIGH if UI claimed live radio — it does not) |
| D1 | Suite download | `GET /download` (+ `/v1/download`, `/v1/suite/download`) packs in-process catalog + tip cite + mesh/VPN cites. Counted via USES. UI on panel / dashboard / Softwares / nav. | Worker wasm not attached (SLOT). Product `*-download-tracker` tarballs stay on those hosts. | NOTE |

**No security BLOCKER** on this tip: headers, rate/body gates, confirm/dry_run, no second Softwares door, no vault ingest, no invented OAuth/DOI.

---

## Launch readiness for 100% node-mesh / human UI

Honest completeness checklist. **Never `fielded_100`.** ToolBench `fielded_100` stays `FG-STUB`. This is not a third-party lab.

| # | Checklist item | This tip after remediation | Toward “perfect” |
| --- | --- | --- | --- |
| 1 | FragGate is the only Softwares exec door | **PASS** | Keep. Do not add `{slug}_{op}` MCP pile. |
| 2 | Hub catalog does not lie vs FragGate | **PASS** (VeilLock `local_only`) | Keep `fraggate_status` if more local_only slugs appear. |
| 3 | Human Use-in-browser hits a real pane or `/p/{slug}` | **PASS** | 15 labeled panes; remaining slugs `/p/{slug}`. |
| 4 | No `href="null"` downloads | **PASS** | Optional real tracker hosts for in-runtime placements. |
| 5 | VPN copy matches `vpn=true` | **PASS** | Keep REAL/SLOT in every new sentence. |
| 6 | Mesh join / heartbeat / leave / status / nodes / vpn on human UI | **PASS** (FragGate) | Extra-bearer button landed (rate-limited; GET still never enables). |
| 7 | TTL 5 min + MESH-OFF + disable refused | **PASS** | Keep. |
| 8 | Nine laws + operator overrides published | **PASS** | Local qnm-node must honor the same fields. |
| 9 | Channel plane cite-only; `worker_hardware:false` | **PASS** | Local radio hooks LIVE-when-HW-present / refuse-when-absent. Isolate stays cite. |
| 10 | AZVPN HTTPS/WS REAL; WG/OVPN SLOT; no fake connected | **PASS** | A future L3 concentrator is a new SLOT→REAL decision with tests. |
| 11 | AZBrowser ≠ AZNet; pairing ≠ tunnel | **PASS** | Keep separate Worker UIs. |
| 12 | One-click suite pack (honest labels) | **PASS** (JSON pack) | Do not attach invented wasm. Product tarballs stay on tracker hosts. |
| 13 | OpenAPI documents workspace + download | **PASS** | AZVPN send/recv/list/close examples added. |
| 14 | MCP 36-name door + confirm | **PASS** | Fabric hop-list documented kernel-direct (not MASTER-33). |
| 15 | Security headers + rate/body + isolation + no OAuth/DOI invention | **PASS** | SESSION / CHAINLOCK / RATE bound in wrangler.toml; labels honest when unbound. |
| 16 | Full node-mesh hardware (wifi/bt/rf/photon live in isolate) | **NOT A GOAL** | Would be a lie. Perfect = cite + local qnm-node. |
| 17 | 100% labeled human fields for 41 slugs | **NOT DONE** (15 labeled) | Completeness, not launch-block. Cards + `/p/{slug}` suffice. |
| 18 | FLEET cite-only objects loaded | **NOT A GOAL** | Cite ≠ loaded. Do not ingest vaults. |

Gap list to “perfect” (honest):

- Local `qnm-node` **full** process (boot/chain/apg/phoenix) — radio hooks only in this repo; LIVE only when HW present.
- Fabric wrappers walking MASTER-33 (documented kernel-direct instead).
- Product-Worker counted tarballs only where a Worker exists.
- Remaining unlabeled Softwares field panes (26 catalog slugs still `/p/{slug}`).
- Never stamp `fielded_100`.

---

## Close-test

`scripts/verify-human-ui-mcp-audit.mjs` asserts: 41 products, VeilLock `local_only` on FragGate **and** hub catalog, AZVPN in tasks + LIVE_OPS + STUB wireguard, 36 MCP names, mutating confirm schema, human script FragGate targets including `mesh/vpn` + heartbeat/leave + extra-bearer, 15 labeled `#task-*` panes, Use-in-browser `/p/{slug}` for unlabeled slugs, no `href="null"`, OpenAPI `/workspace` + `/download`, suite pack `AZRT-SUITE-PACK-1.0` REAL/SLOT labels, MCP initialize without heritage “VPN not claimed”, fabric hop-list honesty, production DO bind cites, `fraggate_call` without confirm → `MCP-CONFIRM-REQUIRED`.

`scripts/verify-qnm-radio.mjs` asserts local radio hooks (no mock; Worker `worker_hardware:false`).

`npm test` includes this script after `verify-human-ui.mjs`.

---

## What this document does not do

It does not implement the 46 FLEET paths. It does not open Lumen. It does not merge EmbryoLock away. It does not put the fleet inside the door. It does not stamp 1000-hard or `fielded_100`. Author field: Aziel Eliab.
