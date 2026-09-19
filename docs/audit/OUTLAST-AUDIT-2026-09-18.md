# OUTLAST audit — security · survival · integration · preservation · comms · receipts · AI · memory · mesh

**Date written:** 2026-09-18 UTC  
**Repo:** [AzielEliab/aziel-runtime](https://github.com/AzielEliab/aziel-runtime)  
**Tip audited:** `origin/main` `26dd8b6` — Security fix→rescan→patch post BAN-SURVIVAL audit (#132)  
**Audit paper tip:** `origin/main` `726e635` — OUTLAST audit — 9 pillars (#133)  
**Prior security paper (do not duplicate):** [`SECURITY-ARCHITECTURE-POST-BAN-SURVIVAL.md`](SECURITY-ARCHITECTURE-POST-BAN-SURVIVAL.md) (tip `df0b42c` / rescan `60d8667`)  
**Live fronts fetched (User-Agent `Mozilla/5.0`, ~14:31–14:32Z):**  
`https://aziel-runtime.vibelock.workers.dev` · hub `/runtime` on azieleliab.com / azielcorpuslibrary.net / godlock.uk · hub `/survival` on ae / corpus / godlock / HDJ · `https://miragegrid.vibelock.workers.dev` · FragGate MCP (`runtime_skill`, `fraggate_list`, `fraggate_call`, `mesh_status`, `chainlock_tip`, `chainlock_verify`, `memory_observe` dry-run, `fraggate_describe` ForgeReceipts)  
**Identity:** Aziel Eliab only  
**Phase:** AUDIT. FragGate remains THE public exec door. Shelves were not dropped. No invented scores. No `fielded_100`.

Lamb Lens order for this write-up: **Service** (what actually answers) → **Clarity** (LIVE vs SLOT vs GAP) → **Peace** (harden order; no panic flips).

This report covers the **new outlast pillars** (preservation, receipts, AI, persistent memory, mesh outlast) plus a **rescan** of security / survival / integration after #129–#132. Closed prior rows are cited, not re-argued.

---

## Severity rubric

| Level | Meaning |
| --- | --- |
| **CRITICAL** | Public exec door invents a second FragGate, paints a banned host LIVE, executes a Remain-OFF destructive/fantasy path, or a rewrite key makes a broken hash pass. |
| **HIGH** | Live cite contradicts fetched bytes; unauthenticated mutate the paper treats as gated; open proxy / roster abuse; refuse-code honesty break that hides a write. |
| **MED** | Dual-surface gap, durable-vs-isolate honesty, hub pull incomplete, documented kernel-direct hop skip, design tension that still refuses the dangerous verb. |
| **LOW** | Stale handoff sentence, trademark heuristic breadth, cache TTL vs rotation, heritage copy, wrong refuse *label* on a path that already refuses. |
| **NOTE** | By-design public demo, cite-only fleet objects, SLOT until attest. Not a missing feature. |

This audit does **not** stamp belt scores.

---

## Rescan (GAP harden — this PR, post #133)

**Date rescanned:** 2026-09-19 UTC  
**Isolate tip:** this PR on `cursor/outlast-gap-harden-3600` (base `726e635` / #133).  
**Live bytes fetched (UA `Mozilla/5.0`, before deploy):** runtime `/v1/receipts/tip` still `ok:true` + `hash:null` + `fail_open:true` (O5 live residual until this Worker deploys). Corpus `/v1/receipts` tip still 64-zero, `receipts: []`. MirageGrid hosted `/mcp` still **404**. Plane B still SLOT. Do not treat pre-deploy live bytes as this isolate.

| ID | Audit finding | This loop | Honesty |
| --- | --- | --- | --- |
| O1 | HTTP `dry_run` wrote learn stamps | **Closed in isolate** — HTTP + `runMemoryOp` honor `dry_run` (`AKM-DRY-RUN`, `mutated:false`). No ChainLock write. MCP `MCP-DRY-RUN` unchanged. | Silent write after `dry_run:true` is refused |
| O2 | Isolate Belief List vs durable ChainLock | **Closed in isolate** — `memory_get` / `memory_resolve` / `recall` hydrate from append-only learn on miss / cold isolate. Index stays derived. `belief_is_not_truth`. No `memory_delete` / overwrite. | MemoryStore cache ≠ ledger authority |
| O5 | Empty ACT tip fail-open as success | **Closed in isolate** — empty (ZERO_HASH / null) or dark tip is SLOT (`ACT-RECEIPT-TIP-EMPTY` / `ACT-RECEIPT-TIP-DARK`). `fail_open` is append-skip only. Tip is content-addressed; ForgeReceipts is not this public tip. | Do not invent receipts to look alive |
| Plane B/C | SLOT honesty | **Honesty cites added** — `hash_verify_pass_is_not_live`, `do_not_paint_slot_as_live`, Framagit URL null, Zenodo/GitFlic/GitLab not LIVE. Still SLOT until hash-verify LIVE (ALL-TARGETS / USB attest). | No invented LIVE shelves |
| Cap-7 hosted | SLOT unless attested | **Still SLOT** — `hosted_mcp` / `hosted_land` / `attested:false`. Factory SoT `miragegrid`. `resolves_to_hub:false`. Injected hosted `/mcp` LIVE refuses. Live factory `/mcp` 404. | Do not fake hosted land |

Not flipped: live-node API SLOT. No HTTP ChainLock dump (O4). No second FragGate door. Remain-OFF untouched. No new MCP tool. Shelves stay.

Close tests: `verify-akm-triad.mjs` (dry_run + rebuild-from-learn), `verify-act-receipt.mjs` (empty/dark SLOT), `verify-cold-multi-shelf.mjs` + `verify-ban-survival.mjs` (honesty + hosted SLOT), `verify-f03-f05.mjs` (AKM ledger labels).

---

## Executive findings

**No CRITICAL** on the fetched tip and fetched bytes.

- FragGate is still the Softwares exec door. `GET /mcp` says `second_door: false` / `backdoor_exec: false`.
- Hosted Cap-7 `/mcp` is **404** `{error:"not found"}` on `miragegrid.vibelock.workers.dev`. Runtime cites hosted endpoints **SLOT**.
- EmbryoLock `wipe` → `FG-STUB`. Mesh disable → `MESH-DISABLE-REFUSED`. Unknown slug → `FG-HALLUC-TOOL`.
- Live-node API stays **SLOT** (`BAN-NODE-API-NOT-ATTESTED` / `BAN-NO-OPEN-NODE-PROXY`).
- Shelves stay on the map. `mutual_backup: true`. `doi` null. Plane B/C **SLOT**.
- Nine QNM laws `hard_true: true`. `rewrite_key: false`. `lie_to_survive: false`. `restore_godlock_uk: false`.
- Cap-7 `resolves_to_hub: false` on runtime, factory, and in-process shuffle land.

**Prior HIGH closed on this tip / this rescan (do not reopen as new work):**

| Prior ID | Status 2026-09-18T14:31Z |
| --- | --- |
| H1 Cap-7 bridge 404 | **Still closed.** App Worker `/bridge` 200 `BRIDGE-CAP7-SHUFFLE`. Tracker `/bridge` 404. Runtime `miragegrid_bridge` = app Worker. |
| H2 Cap-7 name-set drift | **Still closed.** Factory labels `azgrid`…`azstandby` are SoT. In-process land used `azgrid`. `mesh_name_icann=SLOT`. |
| H3 mesh join + no F03 | **Closed in isolate.** `requestLimitKind` has `mesh_mutate` / `memory_mutate`. Live `/v1/mesh` publishes `mesh_mutate_rate_kind`. Join stays presence-only. |
| H5 corpus root `/survival` 404 | **Closed on live bytes.** Corpus `/survival` and `/v1/survival` are 200 `BAN-SURVIVAL-1.0` (37100 bytes, raw runtime map). Cite in `docs/corpus-runtime-front-door.md` updated. |
| M1 `/p` open factory `/mcp` | **Still closed.** `POST /p/miragegrid/mcp` → `PROXY-OP-REFUSED`. |
| M3 `neighbor_heal` vs REHEAL | **Still closed.** Live `neighbor_heal_is_cite=true` / `neighbor_heal_exec=false`. |

**NEW (this OUTLAST pass — not in the security-only paper):**

| ID | Sev | Pillar | Finding |
| --- | --- | --- | --- |
| O1 | HIGH | Memory / receipts | HTTP `POST /v1/memory/observe` with `dry_run:true` **wrote** learn-chain stamp `cl_858b598b…` / `akm_c0b50a01…`. MCP `memory_observe` `dry_run:true` is `MCP-DRY-RUN` / `mutated:false`. HTTP click = confirm (F02 public-demo). `dry_run` is not a second HTTP gate. **Closed in isolate (GAP harden):** HTTP dry_run → `AKM-DRY-RUN` / `mutated:false`. |
| O2 | HIGH | Memory | Immediate `GET /v1/memory/akm_c0b50a01…` → `AKM-NOT-FOUND`. ChainLock stamp is durable (DO). Belief List is isolate MemoryStore. `rebuild-index` is OPERATOR/local. Worker memory ≠ mesh-scoped ledger. **Closed in isolate (GAP harden):** get/resolve/recall rebuild from learn. |
| O3 | HIGH | Survival / comms | GodLock hub wrap still cites `https://aziel-runtime/v1/mesh/az-generator` (host missing `.vibelock.workers.dev`). DNS does not resolve. Hub follow-on (prior M7). |
| O4 | MED | Preservation / receipts | `GET /v1/chainlock/tip` and `/v1/chainlock/verify` are **404** (no public HTTP chain). Tip/verify are MCP `chainlock_*` + FragGate kernel. HTTP-only clients cannot hash-verify the vault without MCP/FragGate. By design — label it, do not invent the route. |
| O5 | MED | Receipts | ACT-RECEIPT public chain: corpus `/v1/receipts` `tip` is 64-zero, `receipts: []`. Runtime `/v1/receipts/tip` `hash: null`, `token_configured: false`, fail-open. Cite is honest. Continuity of *public* ingest receipts is empty. |
| O6 | MED | Integration | `/v1/software` `git_sha=e2159d5b…` (stamped `src/build-meta.js`) ≠ git tip `26dd8b6`. Worker behavior matches #132 (factory names, `mesh_mutate_rate_kind`). Do not treat catalog `git_sha` as deploy tip. |
| O7 | MED | Security residual | Public FragGate + public HTTP memory/mesh mutate without operator token (H4). Session mutate still token-gated (`REQUIRE_TOKEN=1`; `/v1/ready` 200). Attest before any SLOT→LIVE. |
| O8 | LOW | Refuse honesty | `POST /v1/mesh/rewrite` was `MESH-NOT-FOUND` (paper promises `MESH-NO-REWRITE`). `POST /v1/memory/delete` was `AKM-NOT-FOUND` (paper: no delete). **This PR maps those paths to the named refuse.** |
| O9 | LOW | Preservation | Corpus `GET /v1/shelves` 404; SoT `GET /shelves` 200. Runtime `/v1/shelves` 200. Prefer `/shelves` on the library hub. |
| O10 | LOW | Mesh / shelves | `/v1/mesh` `survival_shelves` includes class `doi`. Live shelves `doi: null`. Class list ≠ live DOI invent (prior L3). |
| O11 | NOTE | Comms | `/p/miragegrid/assign` still forwards a documented tracker op (200 control-plane receipt). Proxy-not-exec. Not FragGate. |
| O12 | NOTE | Mesh | `live_nodes=41` equals `software_nodes=41` at fetch time (fan-out roster). Formula is mesh size (active+inactive, not isolated) — coincidence with catalog fan-out, not a second definition. |

**No second FragGate Softwares door was found.** HTTP `/p/{slug}/{op}` stays proxy-not-exec. Fabric MCP `mesh_*` / `chainlock_*` / `memory_*` stay `master_33: false` / `second_softwares_door: false`.

---

## Method

1. Fast-forward local `main` to `#132` (`26dd8b6`). Read BAN-SURVIVAL, NO-LIE, COLD-MULTI-SHELF, AKM-TRIAD, ACT-RECEIPT, NODE_MESH, FragGate door, request-limits, proxy-allowlist, memory, mesh, platforms, calling-name.
2. Fetch LIVE JSON (not invented) with User-Agent `Mozilla/5.0`.
3. Execute FragGate / fabric MCP: list, mesh status, ChainLock tip+verify, ForgeReceipts describe, memory observe dry-run, HTTP refuse probes.
4. Compare paper ↔ isolate ↔ live bytes. Cite conflicts are findings. Absence of a live fetch is **not fetched**, not invented LIVE.
5. Safe cite / refuse-label fixes in this PR only. Large hardening → follow-on list.

**NO-LIE:** LIVE / SLOT / cite-only labels below are taken from fetched JSON or from code that emits that JSON. AZNet `stamp` against a real attested tip, session mutate with a real operator token, Embryolock local wipe, and Plane B/C USB were **not** executed — **cite/code only**.

---

## Live byte receipts (fetched)

| Surface | HTTP | Honest label from body |
| --- | ---: | --- |
| `GET …/v1/survival` | 200 | `spec=BAN-SURVIVAL-1.0`, `mode=LIVE`, `mutual_backup=true`, `second_door=false`, `live_node_api.status=slot`, `hosted_endpoints.status=slot`, `akm_memory.belief_is_not_truth=true`, `platforms.all_live=true`, `native_app_store=false`, Cap-7 factory `miragegrid`, `resolves_to_hub=false`, bridge = app Worker |
| `GET …/v1/mesh` + `/v1/mesh/status` | 200 | Same 24956-byte `MESH-OK` body. `live_nodes=41`, `software_nodes=41`, `isolated_nodes=0`, `suite_presence=on`, `nine_laws.hard_true=true`, `rewrite_key=false`, `die_with_pull=true`, `restore_godlock_uk=false`, `mesh_mutate_rate_kind=mesh_mutate`, `roster_publishes_exec_urls=false`, channel_plane wifi/bt/rf/photon `on` + `worker_hardware=false` |
| `GET …/mcp` | 200 | `auth=none (public)`, `door=fraggate`, `second_door=false`, fabric `hop_list=kernel-direct` |
| `POST …/mcp` initialize + `tools/list` | 200 | `serverInfo.version=2.0.0-rc1`, **36** tools (thin door + fabric). `Mcp-Session-Id` issued. |
| `GET …/openapi.json` | 200 | OpenAPI **3.1.0**, 395542 bytes, title `Aziel Runtime` |
| `GET …/v1/shelves` | 200 | `COLD-MULTI-SHELF-1.0`, `lockset_tip=c831429befc221bd41caeb0a6d1c5361602db5684abab7af6d39714084b6b245`, Plane A live 5 surfaces / 2 radii, B/C SLOT, `doi` null |
| `GET …/v1/receipts` | 200 | `ACT-RECEIPT-OK`, public chain corpus `/receipts`, `fail_open=true`, `token_configured=false` |
| `GET …/v1/receipts/tip` | 200 | `proxied=true`, `hash=null` |
| `GET …/v1/software` | 200 | `count=42`, `live_count=41`, `local_only_count=1` (VeilLock), `isolation_software_count=33` |
| `GET …/v1/fraggate/list` | 200 | `live_count=42`, `stub_count=0`, `local_only_count=1`, `stub_op_count=257` |
| `GET …/v1/chainlock/tip` + `/verify` | **404** | `{error:"not found"}` + public-route hint. No HTTP chainlock surface. |
| `GET …/llms.txt` / `/ai.txt` | 200 | 144344 / 145027 bytes. FragGate pipeline + identity Aziel Eliab. |
| `GET …/.well-known/mcp/server-card.json` | 200 | `auth.type=none`, `public=true` |
| `GET ae /survival` | 200 | Hub wrap, `source=live`, `spec=BAN-SURVIVAL-1.0` |
| `GET corpus /survival` + `/v1/survival` | 200 | Raw runtime map (H5 closed) |
| `GET corpus /shelves` | 200 | COLD-MULTI-SHELF SoT |
| `GET corpus /v1/shelves` | **404** | `{error:"not found"}` |
| `GET corpus /v1/receipts` | 200 | ACT-RECEIPT, `tip` 64-zero, `receipts: []` |
| `GET corpus /lockset.json` | 200 | `sha256=c831429bef…`, `doi=null`, `zenodo=null` |
| `GET godlock.uk/survival` | 200 | Hub wrap; `cap7` cite `mesh_az_generator=https://aziel-runtime/v1/mesh/az-generator` (**typo**) |
| `GET HDJ /survival` | 200 | `this_host_is_live_door=false` |
| `GET HDJ /runtime/survival` | 200 | **HTML archive** (not a runtime binding) |
| `GET ae/corpus/godlock /runtime/v1/health` | 200 | `version=2.0.0-rc1`, `door=fraggate`, `count=41` engines |
| `GET miragegrid…/v1/health` | 200 | `role=cap-7-shuffle-app`, `resolves_to_hub=false` |
| `GET miragegrid…/bridge` | 200 | `BRIDGE-CAP7-SHUFFLE` |
| `GET miragegrid…/v1/shuffle` | 200 | `CAP7-SHUFFLE-CITE` (cite, not land) |
| `GET miragegrid…/mcp` | **404** | `{error:"not found"}` |
| `GET miragegrid…/cap7/azgrid/update` | **403** | Hosted update not public |
| `POST …/v1/fraggate/call` halluc | 400 | `FG-HALLUC-TOOL` + ask/refuse ledger tip |
| `POST … embryolock/wipe` | 400 | `FG-STUB` |
| `POST … forgereceipts/health` | 200 | `FG-OK`, DecisionGATE `PASS`, isolate hash store |
| `POST … aznet/pair_status` | 200 | `AZN-PAIR-MISSING`, `tunnel=false`, pairing ≠ tunnel |
| `POST … azvpn/health` | 200 | HTTPS/WS REAL; WireGuard/OpenVPN/L3 SLOT |
| `POST … miragegrid/shuffle` | 200 | ping→land `azgrid`; `hosted_url=null`; land SLOT |
| `POST …/v1/mesh/disable` | 400 | `MESH-DISABLE-REFUSED` |
| `POST …/p/miragegrid/mcp` | 404 | `PROXY-OP-REFUSED` |
| MCP `chainlock_tip` session | — | `ok`, seq 250, tip `h=acc8b030…` |
| MCP `chainlock_verify` | — | `chain_ok=true`, `breaks=[]`, `lockset_sha256=null`, learn `n=11` |
| MCP `memory_observe` dry_run | — | `MCP-DRY-RUN`, `mutated=false` |
| HTTP `POST /v1/memory/observe` + `dry_run:true` | 200 | **Wrote** stamp (O1) |
| HTTP `GET /v1/memory/{that id}` | 404 | `AKM-NOT-FOUND` (O2) |

CORS on the runtime Worker: `Access-Control-Allow-Origin: *` plus mutating methods and `Authorization` / `X-Aziel-Runtime-Token`. Same public-demo posture as the prior audit.

---

## Per-pillar matrix (PASS / GAP / SLOT)

Legend: **PASS** = paper + isolate + fetched bytes agree. **GAP** = contradiction or missing honesty on a live path. **SLOT** = intentionally not LIVE (attest / Remain-OFF / cold plane). **NOTE** = by-design public-demo or coincidence.

| Pillar | Design | Function | Protocol | LIVE bytes | Rollup |
| --- | --- | --- | --- | --- | --- |
| 1 Security | PASS | PASS with O1/O7 residual | PASS after O8 map | PASS | **PASS** (residuals HIGH/MED, not CRITICAL) |
| 2 Survival | PASS | PASS | PASS | PASS; O3 hub typo | **PASS** (hub follow-on) |
| 3 Integration | PASS | PASS | PASS | PASS; O6 sha pin | **PASS** |
| 4 Preservation | PASS | PASS (MCP) | GAP O4 HTTP | SLOT Plane B/C | **PASS / SLOT** |
| 5 Communication | PASS | PASS | PASS | PASS | **PASS** |
| 6 Hash receipts | PASS | PASS (ChainLock MCP + ForgeReceipts) | PASS fail-open append-skip | GAP O5 empty public chain **closed as SLOT cite** (not success) | **PASS / SLOT** |
| 7 AI integration | PASS | PASS | PASS | PASS | **PASS** (H4 residual) |
| 8 Persistent memory | PASS paper | GAP O1/O2 **closed in isolate** | PASS MCP confirm + HTTP dry_run | GAP isolate index **closed in isolate** (rebuild-from-learn) | **PASS** (belief ≠ truth; live deploy pending) |
| 9 Node mesh | PASS | PASS | PASS | PASS | **PASS** |

---

## 1. Security

**Build-on, not a replay.** Prior paper closed H1/H2/H3/M1/M3 on isolate + rescan. This pass re-fetched the refuse surface.

### 1.1 FragGate single door

Live `GET /mcp` gateway: `terminates_at=fraggate_call`, `second_door=false`, `proxy_is_not_exec=true`. ForgeReceipts describe publishes the locked MASTER-33 strip. HTTP `/p` is labeled proxy.

**PASS.** Do not add a second door to “outlast” a ban.

### 1.2 Refuse honesty

Fetched: `FG-HALLUC-TOOL`, `FG-STUB` (wipe), `MESH-DISABLE-REFUSED`, `PROXY-OP-REFUSED`, `AKM-NOT-FOUND` (unknown id), `BAN-NODE-API-NOT-ATTESTED` (cite).

**O8 (this PR):** HTTP rewrite/lie and memory delete/update now hit `MESH-NO-REWRITE` / `MESH-NO-LIE` / `AKM-STUB` instead of a generic not-found. Close tests in `verify-no-lie.mjs` / `verify-akm-triad.mjs`.

### 1.3 Rate / abuse (F03)

Isolate: `requestLimitKind` returns `mcp` | `fraggate_call` | `fraggate_read` | `mesh_mutate` | `memory_mutate`. Live mesh body cites `mesh_mutate_rate_kind`. Caps stay in `production.js` (this pass did not exhaust 429).

**PASS** vs prior H3. Join remains public presence-only (O7 / H4 class).

### 1.4 NO-LIE / NO-REWRITE / Remain-OFF

Live mesh: `no_lie=true`, `no_rewrite=true`, `rewrite_key=false`, `lie_to_survive=false`, `copies_one_tunnel=false`. MCP verify: `rewrite=false`, `vote_to_fix=false`. Embryolock wipe FG-STUB. Remain-OFF inventory not flipped (`/v1/receipts` `remain_off_untouched=true`).

**PASS.** No rewrite key was found that makes a broken hash pass.

### 1.5 Token / session / open-proxy residual

`wrangler.toml` `REQUIRE_TOKEN=1`. Live ready/health 200 on hub `/runtime`. Session mutate is header-only (prior paper). Public FragGate + public MCP `tools/call` + public `/v1/memory/observe` do not require the operator token.

`/p/miragegrid/mcp` refused. `/p/miragegrid/assign` 200 documented tracker forward (O11). `/p/foldlock/not-a-documented-op` refused.

**O7 NOTE/HIGH residual:** public-demo workspace (F02). Attest before SLOT→LIVE. Do not treat `confirm:true` as authentication.

---

## 2. Survival

### 2.1 BAN-SURVIVAL mutual backup

Live `/v1/survival`: four named fronts (workers.dev + library/author/godlock `/runtime`), `independent=false`, `blast_radius=cf-github`, `mutual_backup=true`, `shelves_are_not_a_live_door=true`. HDJ is honestly **not** a live door.

Fetched health 200 on the three hub `/runtime` fronts. **PASS.** `BAN-NO-HYDRA` still applies — do not count four hostnames as four tunnels.

### 2.2 Cap-7 / AZNet / calling-name / platforms

Factory `GET /v1/cap7` + `/bridge` use `azgrid`…`azstandby`, `mesh_name_icann=SLOT`, `resolves_to_hub=false`. In-process `miragegrid/shuffle` landed `azgrid` with `hosted_url=null`. Hosted `/mcp` 404. Update path 403.

Calling-name: `rotated=false`, identity Aziel Eliab, `chainlock_rewrite=false`, `akm_rewrite=false`. Platforms `all_live=true`, `native_app_store=false` (browser/PWA/Worker, not five store binaries).

AZNet `pair_status`: unpaired, `hosts_payloads=false`, `tunnel=false`. Verify ops cited LIVE — **not executed** against an attested tip.

**PASS** on name-set + SLOT hosted exec. **O3** GodLock az-generator typo remains hub follow-on.

### 2.3 CROSS-NETWORK / COLD-MULTI-SHELF / die-with-pull

Shelves (runtime + corpus `/shelves`): Plane A live (5 surfaces / 2 family radii / 1 independent live). Plane B Codeberg + archive.org PASS still **SLOT** (two IA items, same `blast_radius`). Framagit URL null. GitFlic / GitLab / Zenodo refused. `doi` null. Plane C USB **SLOT**.

Die-with-pull: `restore_godlock_uk=false`, `public_hostname_resurrection=false`, `die_with_pull=true`.

**PASS.** Do not drop shelves. Do not paint Plane B/C LIVE.

### 2.4 H5 close

Corpus root `/survival` is now the raw runtime map. Clients who only know the library hostname **do** get BAN-SURVIVAL. The wrap vs raw difference vs ae/godlock is **NOTE** (same spec, different envelope).

---

## 3. Integration

### 3.1 Softwares catalog SSoT

`GET /v1/software`: 42 cards, 41 live, 1 local_only (VeilLock), isolation 33, placements called out in `count_note`. Hubs note: refresh from this Worker. FragGate list `live_count=42` matches the tab count (includes placements / kernel cards — do not equate to isolation-33).

**PASS.** Whitestone `door=none` (no invented FragGate engine) stays labeled.

### 3.2 Hub `/runtime` bindings

ae / corpus / godlock `/runtime/v1/health` 200, `door=fraggate`, same engine set. HDJ `/runtime` is archive HTML — correctly excluded from `NAMED_ROUTES`.

**PASS.**

### 3.3 MCP / OpenAPI dual-surface + AI discovery

36 MCP tools. OpenAPI 3.1 ~396 KB. `/llms.txt` + `/ai.txt` + `/cite.json` + server-card. Compatible-client list is prose (ChatGPT / Grok / Cursor / Glama / …), not a trademark impersonation of those products.

`git_sha` pin (O6): stamped build-meta, not `26dd8b6`. **MED cite hygiene** for hubs that key off `git_sha` as “what is deployed.”

Calling-name rotation surfaces include OpenAPI info + MCP serverInfo + llms/ai/cite — armed, not triggered.

**PASS** for discovery. **O7** for public exec residual.

---

## 4. Preservation

Survival sentence from live mesh: *someone still has bytes that match the published tip — not a living network, not LLM memory, not a public hostname that still answers.*

### 4.1 Tip-hash if the network dies

| Copy | Fetched | Role |
| --- | --- | --- |
| Corpus `lockset.json` `sha256` | `c831429bef…` | Public lockset tip |
| Runtime `/v1/shelves` `lockset_tip` | same hex | Worker cite of that tip |
| Corpus `/shelves` | 200 COLD-MULTI-SHELF | SoT |
| GitHub tree `docs/` + this repo | present | Plane A git |
| Plane B Codeberg / archive.org | cited PASS / SLOT | Hash-verify packs, not `/mcp` |
| Plane C USB | SLOT | Airgap |
| MCP ChainLock session tip | `h=acc8b030…` seq 250 | Durable DO vault (this Worker) |
| MCP verify `lockset_sha256` | `null` | No local LOCKSET seal stored |

**PASS** as mutual backup: live fronts + cold shelves. **SLOT** Plane B/C. Local LOCKSET seal is optional / empty — verify still `chain_ok` without requiring a seal.

### 4.2 No rewrite key; copies not one tunnel

Live: `copies_one_tunnel=false`, `blast_radius=cf-github` (honest one-tunnel Plane A). Second plane is cold shelves / git, not a second CF account.

**PASS.** Do not invent a fifth independent live tunnel.

### 4.3 HTTP ChainLock absence (O4)

There is **no** `src` route for `/v1/chainlock/*`. 404 hint lists FragGate / memory / receipts / mcp. Tip/verify **work** on MCP (`chainlock_tip`, `chainlock_verify`).

**Do not add a public unauthenticated HTTP tip-dump as “preservation.”** That would widen the attack surface. Follow-on: a *cite* field on `/v1/survival` / `/v1/receipts` pointing at MCP/FragGate verify — not a new dump API — if HTTP-only AIs cannot find the vault.

### 4.4 Ingest-as-receipt

Shelves carry `ingest_as_receipt=INGEST-AS-RECEIPT-1.0`. Corpus lockset `spec=INGEST-AS-RECEIPT-1.0`. Public ACT chain is empty (O5). Fail-open without `RECEIPT_APPEND_TOKEN` is labeled.

---

## 5. Communication

### 5.1 Mesh presence / heartbeat

`presence_ttl_ms=300000`. `join_is_presence_only=true`. `join_is_not_login=true`. `roster_publishes_exec_urls=false`. Fan-out `cron-or-request-path`. GET never enables.

**PASS.** Abuse shaping is now `mesh_mutate` (prior H3). Roster is not an exec URL phone book.

### 5.2 Cap-7 shuffle ping → land → update

In-process FragGate `miragegrid/shuffle` returned a ping receipt (`integrity=PASS`, hash `a675782e…`) and landed `azgrid` / `azgrid.az` with hosted URL **SLOT**. Factory `/v1/shuffle` is **CITE**. Public land **SLOT**. `hardcoded_single_host=false`.

**PASS.** Do not hardcode one Cap-7 host. Do not treat factory `honesty_public=LIVE` on azgrid/azbooth as hosted `/mcp`.

### 5.3 Channel plane / AZNet pair / AZVPN

Channel plane: four cites ON, `worker_hardware=false`, `public_proxy=false`, `tunnel=false`, local `qnm-node`. Pairing ≠ tunnel on AZNet health. AZVPN: GET mesh `vpn=true` / `get_never_opens=true` / `open=false`. Health: WireGuard/OpenVPN/L3 SLOT, not Tor, not origin-hiding.

**PASS.**

---

## 6. Hash receipts

### 6.1 ChainLock

MCP tip + verify: append-only vault, `fail_closed=true`, `cite=https://godlock.uk`, `write_public_ledger=false`. Session chain populated; learn `n=11` after this audit’s HTTP observe; other roster chains empty/ok. `breaks=[]`.

No `chainlock_delete` in MCP tools/list (36 names). **PASS** for MCP. **O4** for HTTP.

### 6.2 ForgeReceipts

`fraggate_describe` + `fraggate_call` health: live digest `950fec2e…`, ops health/receipt/verify/import_export/doctor/skill, stubs court/legal_advice/odyssey/file_store. Isolate hash store. Not a court. FragGate ledger tip hashed (`seq` 62 on that call).

**PASS** (health/cite). Mint/verify of a caller-held receipt was **not** walked beyond health.

### 6.3 ACT-RECEIPT / library / ingest

Runtime cite four fields (`hash`, `request`, `output`, `event`). Corpus public chain empty + zero tip. Runtime tip proxy `hash=null`.

**O5 (closed as SLOT cite):** empty / dark public tip is no longer `ok:true` success. Isolate returns `ACT-RECEIPT-TIP-EMPTY` / `ACT-RECEIPT-TIP-DARK`, `tip_status=slot`, `fail_open=false` on the tip read. Fail-open remains append-skip only. Operator `RECEIPT_APPEND_TOKEN` + corpus append still required before tip ≠ zero. Do not invent receipts to look alive.

Control-plane MirageGrid assign/shuffle receipts hash in-request only — not the ACT public chain.

---

## 7. AI integration

### 7.1 Surfaces

| Surface | Fetched | Role |
| --- | --- | --- |
| `POST /mcp` tools/list | 36 tools | Thin door + fabric |
| `GET /openapi.json` | 3.1 / 396 KB | GPT Actions / OpenAPI import |
| `/llms.txt` `/ai.txt` | 144–145 KB | Crawler / LLM instructions |
| server-card + oauth well-known | auth none; empty IdP | Honest; no invented OAuth |
| Glama listing URL | code cite only | Not fetched this pass |

Pipeline published: `fraggate_list` → `fraggate_describe` → `fraggate_call`. Flat `{slug}_{op}` not listed.

### 7.2 Calling-name / trademarks

Not rotated. Seeds include Potato / Whitestone / Eliab Runtime — not third-party product impersonation. `BAN-NO-TRADEMARK-NAME` still in isolate. **PASS** (prior P4 `gpt` token breadth remains LOW).

### 7.3 Public FragGate residual

Same as O7/H4. Growth-ON. Compact OpenAPI (`?door=1`) remains optional follow-on (prior M6).

**PASS** for discovery honesty. Residual is abuse / attest, not a missing AI door.

---

## 8. Persistent memory (AKM-TRIAD)

Live survival `akm_memory`:

- `belief_is_not_truth=true`
- `posterior_is_not_truth=true`
- `memory_get` = append-only recollection
- `memory_resolve` = forward additive stamps
- `memory_delete=false`
- `memory_update_overwrite=false`
- stub_ops: model_update / rollback / rewrite / delete_history / auto_update

MCP: observe dry-run does not write. `authorizes_action=false` on HTTP observe body.

**O1 (closed in isolate):** HTTP `dry_run` is honored (`AKM-DRY-RUN`, `mutated:false`). No ChainLock learn write. MCP `MCP-DRY-RUN` unchanged. HTTP click without the flag is still confirm (F02 public-demo).

**O2 (closed in isolate):** Belief List isolate index remains a derived cache (`durability.akm_memory.durable=false`). Recollection authority is the append-only ChainLock learn chain. `GET /v1/memory/{id}`, resolve, and recall hydrate from learn on a cold isolate. `rebuild-index` stays OPERATOR/local for a forced rebuild. Posterior ≠ truth.

This is the mesh-scoped vs Worker-memory honesty the pillar asked for:

| Store | Durable? | Truth? | Public get? |
| --- | --- | --- | --- |
| ChainLock learn stamps | Yes (CHAINLOCK DO) | Ledger facts (still not “the world”) | MCP tip/recall; GET rebuilds Belief List from this ledger |
| AKM Belief List / posterior | Derived (rebuildable) | **Not truth** | After hydrate-from-learn; isolate cache may be empty |
| LLM client memory | No | Rumor | Never a replica |

**PASS** as law. **PASS** as durable handle: `memory_id` from HTTP observe is a learn-chain id, not an isolate-only cookie. Do not pretend the posterior is truth after a pull.

Delete/update HTTP stay `AKM-STUB`.

---

## 9. Node mesh

### 9.1 live_nodes vs software_nodes

Fetched: `live_nodes=41`, `active_nodes=41`, `inactive_nodes=0`, `isolated_nodes=0`, `software_nodes=41`, `rollup.mesh=41`. Notes on the body state the formula (active+inactive, not isolated) and that software_nodes must not be used *alone* as the pill.

At this instant the numbers match because the roster is the `{slug}-worker` fan-out (41 products including VeilLock). **NOTE**, not a definition collapse. Zero remains honest if the roster empties.

### 9.2 Suite-presence + nine laws + Cap-7

`suite_presence=on`, `get_never_enables=true`, disable refused. Nine laws `count=9`, `hard_true=true`. Cap-7 `resolves_to_hub=false` everywhere fetched. Live-node API SLOT. `QNS` `public_proxy=false`.

**PASS.**

### 9.3 No open node proxy

`roster_publishes_exec_urls=false`. `BAN-NO-OPEN-NODE-PROXY` on the survival live-node-api object. Product Workers proxy `/v1/mesh/*` only — not `/mcp` (cite).

**PASS / SLOT.** Do not flip live-node API LIVE in this loop.

---

## Severity-ranked findings (OUTLAST set)

| ID | Sev | Area | Evidence | This PR |
| --- | --- | --- | --- | --- |
| O1 | HIGH | HTTP `dry_run` writes memory | Live observe+dry_run minted `cl_858b598b…` | **Closed in isolate** (`AKM-DRY-RUN`) |
| O2 | HIGH | Isolate Belief List vs durable ChainLock | GET id → `AKM-NOT-FOUND` after write | **Closed in isolate** (rebuild-from-learn) |
| O3 | HIGH | GodLock az-generator host typo | Live wrap `https://aziel-runtime/v1/…` | Hub follow-on |
| O7 | HIGH | Public FragGate / HTTP memory without token | `/mcp` auth none; HTTP observe 200 | By design; attest first |
| H4 | HIGH | (prior, still open) | same | Attest / not this PR |
| H6 | HIGH | (prior) factory `design_of` URL vs `hub_designs` | Runtime keeps `hub_designs` + `factory_design_of` | Pair-repo |
| O4 | MED | No HTTP ChainLock tip/verify | 404 | Cite-only; do not invent dump |
| O5 | MED | Empty public ACT chain | zero tip, `[]` | **Closed as SLOT cite** (not success). Operator token still needed for a non-empty public chain |
| O6 | MED | Catalog `git_sha` ≠ git tip | `e2159d5b` vs `26dd8b6` | Stamp on deploy or label pin |
| M2 | MED | Mesh HTTP skips MASTER-33 | prior; still true | Documented |
| M4 | MED | Hub SoT prefers workers.dev | ae/godlock wraps | Hub failover aliases |
| M5 | MED | CORS `*` on mutate | live headers | Accept or mesh-rate |
| M6 | MED | OpenAPI / llms size | 396 KB / 145 KB | Optional compact |
| O8 | LOW | Wrong refuse labels | rewrite/delete HTTP | **Closed** (map + tests) |
| O9 | LOW | Corpus `/v1/shelves` 404 | `/shelves` 200 | Hub alias or clients use SoT |
| O10 | LOW | `doi` class vs `doi:null` | mesh vs shelves | Copy only |
| H5 | — | Corpus `/survival` 404 | now 200 | **Closed on live bytes** + cite fix |
| N1–N6 | NOTE | SLOT / public-demo / HDJ | unchanged | Do not flip |

---

## Recommended harden order (harden → rescan → patch)

Do **not** boil the ocean. One loop per row. Rescan live bytes after each. Do not weaken survival by deleting shelves or painting SLOT as LIVE.

1. **Deploy this PR** (audit paper + H5 cite + O8 refuse maps). Rescan `POST /v1/mesh/rewrite` → `MESH-NO-REWRITE`; `POST /v1/memory/delete` → `AKM-STUB`; corpus `/survival` still 200.
2. **Hub cite completeness (O3, M4, O9)** — GodLock az-generator host; hub `sot_aliases` failover; optional corpus `/v1/shelves` alias to `/shelves`. Separate hub PRs.
3. **Memory honesty (O1, O2)** — **Closed in isolate (this PR).** HTTP `dry_run` preview; `memory_get` / resolve / recall rebuild-from-learn. Rescan live after deploy with observe→get across two requests. Do not treat posterior as truth.
4. **Public ACT tip (O5)** — **Empty tip no longer fail-opens as success (this PR).** Operator `RECEIPT_APPEND_TOKEN` + corpus append still required before tip ≠ zero. Fail-open stays for append-skip only.
5. **Attest gate (O7, H4, N1, N2)** — named origin + `engine_digest` + ChainLock/ForgeReceipts **before** live-node API or hosted Cap-7 SLOT→LIVE.
6. **Catalog pin (O6)** — stamp `BUILD_GIT_SHA` at deploy or publish `git_sha_is_build_meta=true`.
7. **Optional compact OpenAPI / llms (M6)** — only if crawler hammering returns.
8. **Do not** add public HTTP `/v1/chainlock/*` as a convenience dump (O4). Cite MCP/FragGate instead.

---

## What this PR changes (safe)

- New audit: `docs/audit/OUTLAST-AUDIT-2026-09-18.md`.
- H5 cite: `docs/corpus-runtime-front-door.md` records corpus root `/survival` **200** on the OUTLAST rescan.
- Refuse-label maps: HTTP `/v1/mesh/rewrite|lie*` → `MESH-NO-REWRITE` / `MESH-NO-LIE`; HTTP `/v1/memory/delete|update|rewrite` → `AKM-STUB`.
- Close tests in `scripts/verify-no-lie.mjs` and `scripts/verify-akm-triad.mjs`.
- **GAP harden (rescan):** Belief List rebuild-from-learn; HTTP memory `dry_run` does not write; ACT empty/dark tip SLOT; Plane B/C honesty cites; hosted Cap-7 `/mcp`/land SLOT + factory SoT.

## What this PR does not change

- No new MCP tool. No FragGate slug. No shelf drop. No live-node API LIVE. No hosted Cap-7 `/mcp`. No Remain-OFF flip. No HTTP ChainLock dump. No GodLock hub deploy. No invented LIVE Zenodo/Framagit. Posterior is still not truth.

---

## Close-test pointers

- `scripts/verify-no-lie.mjs` (includes HTTP rewrite/lie)
- `scripts/verify-akm-triad.mjs` (includes HTTP delete/update stub)
- `scripts/verify-ban-survival.mjs`
- `scripts/verify-mesh-security.mjs`
- `scripts/verify-mesh-nine-laws.mjs`
- `scripts/verify-act-receipt.mjs`
- `scripts/verify-cold-multi-shelf.mjs`
- `npm test`

---

Eliab, Aziel. (2026). OUTLAST audit — security survival integration preservation comms receipts AI memory mesh. https://github.com/AzielEliab/aziel-runtime/blob/main/docs/audit/OUTLAST-AUDIT-2026-09-18.md

Identity **Aziel Eliab** only. One banned door is not last tip gone. One dead shelf is not last door gone. Belief is not truth. Name the next LIVE front. Keep the shelves. Do not lie.
