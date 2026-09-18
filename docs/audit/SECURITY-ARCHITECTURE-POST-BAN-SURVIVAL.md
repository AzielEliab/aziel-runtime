# Security architecture audit — post BAN-SURVIVAL / Cap-7

**Date written:** 2026-09-18 UTC  
**Repo:** [AzielEliab/aziel-runtime](https://github.com/AzielEliab/aziel-runtime)  
**Tip audited:** `origin/main` `df0b42c` — **BAN-SURVIVAL-1.0: mutual backup, shuffle, AKM, name rotation, platforms (#129)**  
**Live fronts fetched (User-Agent `Mozilla/5.0`):**  
`https://aziel-runtime.vibelock.workers.dev` · hub `/runtime` on azieleliab.com / azielcorpuslibrary.net / godlock.uk · hub `/survival` pulls on ae / corpus / godlock / HDJ · `https://miragegrid.vibelock.workers.dev` · `https://miragegrid-download-tracker.vibelock.workers.dev`  
**Related repo (network):** [AzielEliab/miragegrid](https://github.com/AzielEliab/miragegrid) `main` pushed `2026-09-18T04:46:06Z` (Cap-7 factory Worker)  
**Identity:** Aziel Eliab only  
**Phase:** AUDIT. FragGate remains THE public exec door. Shelves were not dropped. No invented scores. No `fielded_100`.

This report is the written findings package for the next **fix → rescan → patch** loop. This PR also applies **one** class of safe immediate fix: wrong Cap-7 factory cites (download-tracker `/bridge` is 404; app Worker `/bridge` is the live cite). Large redesigns stay follow-on.

---

## Method

1. Fast-forward local `main` to `#129` (`df0b42c`). Read `docs/designs/BAN-SURVIVAL-1.0.md`, `src/ban-survival.js`, `src/calling-name.js`, `src/cap7-shuffle.js`, `src/platforms.js`, FragGate door, mesh, memory, redline, rate/CORS, `wrangler.toml`.
2. Fetch LIVE JSON (not invented): `/v1/survival`, `/v1/mesh`, `/v1/health`, `/v1/ready`, `/openapi.json`, `/cite.json`, `/manifest.webmanifest`, `GET /mcp`, `/v1/fraggate/list`, `/v1/mesh/az-generator`, `/v1/shelves`, well-known MCP/OAuth cards.
3. Fetch MirageGrid factory + download-tracker: `/v1/health`, `/bridge`, `/v1/shuffle`, `/v1/cap7`, `/cap7/azgrid`, `/cap7/azgrid/update`.
4. Probe hub survival TTL pulls: azieleliab.com, azielcorpuslibrary.net, godlock.uk, hedidntjump.com (`/survival`, `/v1/survival`, `/runtime/survival`, `/runtime/mcp`).
5. Probe unauthenticated `POST /v1/mesh/join` and `POST /v1/fraggate/call` `{slug:"mesh",op:"join"}` (presence-only; 5-minute TTL).
6. Compare paper ↔ isolate code ↔ live bytes. Cite conflicts are findings. Absence of a live fetch is marked **not fetched**, not invented LIVE.

**NO-LIE:** LIVE / SLOT / cite-only labels below are taken from fetched JSON or from code that emits that JSON. Where a surface was not executed end-to-end (for example AZNet `stamp` against a real tip, session mutate with a real operator token, Embryolock local wipe), the row says **cite/code only**.

---

## Severity rubric

| Level | Meaning |
| --- | --- |
| **CRITICAL** | Public exec door invents a second FragGate, paints a banned host LIVE, or a live surface executes a Remain-OFF destructive/fantasy path. |
| **HIGH** | Live cite contradicts fetched bytes; unauthenticated mutate that the paper treats as gated; open proxy / roster abuse; refuse-code honesty break. |
| **MED** | Dual-surface gap, rate-limit hole on a kernel path, hub pull incomplete, documented kernel-direct hop skip, design tension that still refuses the dangerous verb. |
| **LOW** | Stale handoff sentence, trademark heuristic breadth, cache TTL vs rotation, heritage copy. |
| **NOTE** | By-design public demo, cite-only fleet objects, SLOT until attest. Not a missing feature. |

This audit does **not** stamp belt scores.

---

## Executive findings

**No CRITICAL** on the fetched tip: FragGate is still the Softwares exec door; `GET /mcp` says `second_door: false` / `backdoor_exec: false`; hosted Cap-7 `/mcp` stays SLOT in runtime cites; Embryolock wipe/scorch stay `FG-STUB`; live-node API stays SLOT; shelves stay on the map and are not `/mcp`; `doi` on `/v1/shelves` is null.

**HIGH (this PR closed the wrong-cite half):**

1. Runtime `#129` cited `https://miragegrid-download-tracker.vibelock.workers.dev/bridge` as the Cap-7 factory bridge. Live fetch: **404** `{error:"not found"}`. The factory app Worker `https://miragegrid.vibelock.workers.dev/bridge` is **200** `BRIDGE-CAP7-SHUFFLE`. GodLock and HDJ hub pulls already named the app Worker. Runtime SoT was the stale URL. **Closed in this PR** (code + paper + `docs/CITE.md` + close tests). `public_worker_shuffle` **land** stays **SLOT**. No hosted `/mcp` invent.

**HIGH (follow-on — not closed here):**

2. Cap-7 **name-set drift** between runtime in-process shuffle (`cap7-loom` … `cap7-vault`) and live MirageGrid factory (`azgrid` / `azbooth` / `azcloak` / `azvault` / `azshift` / `azflag` / `azstandby`, mesh_name `*.az` with `mesh_name_icann: SLOT`). Aligning those sets is a factory/runtime contract, not a one-file cite swap.
3. **Unauthenticated mesh join / heartbeat** on `POST /v1/mesh/join` and FragGate `mesh/join` succeeded on the live Worker (product slug + 8–80 `node_id`). Not in `requestLimitKind` (F03 only covers `/mcp` + `/v1/fraggate/*`). Roster is presence, not exec — still an abuse / fill vector.
4. **Public FragGate call stays open** while `REQUIRE_TOKEN=1` gates only session mutate. Documented public-demo. Residual: any origin can walk MASTER-33 allowlisted LIVE_OPS (confirm on MCP; HTTP click = confirm).
5. **Library hub root `/survival` is 404.** BAN-SURVIVAL says hubs should pull `/survival`. `https://www.azielcorpuslibrary.net/runtime/survival` is LIVE (service binding). Root `/survival` is not. Clients that only know the hub hostname miss the map.

**No second FragGate Softwares door was found.** HTTP `/p/{slug}/{op}` is still labeled proxy-not-exec. MCP fabric `mesh_*` / `chainlock_*` / `memory_*` are documented kernel-direct (`master_33: false`, `second_softwares_door: false`). `POST /v1/memory/observe|resolve|calibrate|recall` re-enters `fraggateCall`.

Shelves were **not** removed. `mutual_backup: true` on live `/v1/survival`. `BAN-NO-SHELF-FAILOVER` is not a refuse code.

---

## Live byte receipts (fetched)

| Surface | HTTP | Honest label from body / headers |
| --- | ---: | --- |
| `GET …/v1/survival` | 200 | `spec=BAN-SURVIVAL-1.0`, `mode=LIVE`, `second_door=false`, `live_node_api.status=slot`, `hosted_endpoints.status=slot`, `akm_memory.belief_is_not_truth=true`, `platforms.all_live=true`, `native_app_store=false`. Cache-Control `public, max-age=120`. |
| `GET …/v1/mesh` | 200 | `MESH-OK`, `presence_ttl_ms=300000`, `clocks_share_socket=false`, `live_body_sync=false`, `restore_godlock_uk=false`, `vote_to_fix=false`, `rewrite_key=false`, `lie_to_survive=false`. OPERATOR-OVERRIDE ON: `neighbor_heal`, `auto_heal`, `implicit_heal`, `node_gate`, `network`, `anonymity_network`. `ban_survival=BAN-SURVIVAL-1.0`. `live_nodes=41` at fetch time (mesh size, not catalog proof). |
| `GET …/v1/mesh/az-generator` | 200 | `CAP7-CITE`, `factory=miragegrid`, `resolves_to_hub=false`, `design_of=hub_designs`, `public_icann=false`. |
| `GET …/mcp` | 200 | `auth=none (public)`, `door=fraggate`, `second_door=false`, fabric `hop_list=kernel-direct`. |
| `GET …/v1/fraggate/list` | 200 | `live_count=42`, `stub_count=0`, `local_only_count=1`, `stub_op_count=257`. |
| `GET …/manifest.webmanifest` | 200 | `name=Aziel Runtime`, `aziel.door=fraggate`, `native_app_store=false`. |
| `GET …/.well-known/oauth-protected-resource` | 200 | `auth=none (public)`, `authorization_servers=[]`. |
| `GET …/v1/shelves` | 200 | `COLD-MULTI-SHELF-1.0`, `lockset_tip=c831429befc221bd41caeb0a6d1c5361602db5684abab7af6d39714084b6b245`. |
| `GET miragegrid…/v1/health` | 200 | `role=cap-7-shuffle-app`, `radio_phy=false`, `resolves_to_hub=false`. |
| `GET miragegrid…/bridge` | 200 | `BRIDGE-CAP7-SHUFFLE`, `shuffle_spec=CAP7-SHUFFLE-1.0`. |
| `GET miragegrid…/v1/shuffle` | 200 | `CAP7-SHUFFLE-CITE` (cite, not land/exec). |
| `GET miragegrid-download-tracker…/bridge` | **404** | `{error:"not found"}`. |
| `GET ae /survival` | 200 | Hub wrap, `source=live`, `spec=BAN-SURVIVAL-1.0`. |
| `GET corpus /survival` | **404** | `{error:"not found"}`. `/runtime/survival` 200 raw runtime map. |
| `GET godlock.uk/survival` | 200 | `kind=hub_cite`, `ttl_ms=60000`, `sot` = workers.dev, `runtime` = `godlock.uk/runtime/survival`, `source=service-binding`. |
| `GET HDJ /survival` | 200 | `this_host_is_live_door=false`, `ttl_seconds=60`, `sot_aliases` include the three hub `/runtime/survival` fronts. `/runtime/*` returns archive HTML (not a runtime binding). |

CORS on the runtime Worker: `Access-Control-Allow-Origin: *` plus `GET, HEAD, POST, DELETE, OPTIONS` and `Authorization` / `X-Aziel-Runtime-Token`. Same posture on MirageGrid app Worker.

---

## Part 1 — Design

### 1.1 BAN-SURVIVAL mutual backup

Paper (`docs/designs/BAN-SURVIVAL-1.0.md`) and isolate (`src/ban-survival.js`) agree on the three-layer map:

| Layer | Paper | Live `/v1/survival` |
| --- | --- | --- |
| Live multi-front | workers.dev + library/author/godlock `/runtime` (same FragGate, `independent: false`, blast_radius `cf-github`) | Four `live_doors`; exec URLs include `/mcp` and `/v1/fraggate/call` on each origin |
| Cold shelves | Death-by-ban backup; not `/mcp`; Plane B/C SLOT | `shelf_backup.is_live_door=false`, `plane_b=slot`, `plane_c=slot` |
| Live-node API | SLOT until named origin + digest/receipt attest | `status=slot`, `code=BAN-NODE-API-NOT-ATTESTED`, `refuse=BAN-NO-OPEN-NODE-PROXY` |

Named exec origins in code match the live map:

- `https://aziel-runtime.vibelock.workers.dev`
- `https://www.azielcorpuslibrary.net/runtime`
- `https://www.azieleliab.com/runtime`
- `https://godlock.uk/runtime`

Fetched: each of those `/runtime` (or workers.dev) fronts served runtime HTML or `/v1/health` 200 except HDJ, which is honestly **not** a named live door.

**Finding D1 (NOTE).** Counting four hostnames as four independent blast-radius doors is refused (`BAN-NO-HYDRA` / `CNS-PLANE-A-ONE-TUNNEL`). The paper is consistent. Clients that treat the four fronts as four CF accounts will over-count survival. Keep the honesty; do not “fix” by adding a fifth tunnel.

**Finding D2 (MED, hub follow-on).** Hub SoT pointers still prefer `https://aziel-runtime.vibelock.workers.dev/v1/survival`. If that hostname is the banned door, a hub that only stores `sot` (and does not fail over to `sot_aliases` / local `/runtime/survival`) repeats the banned URL. HDJ already lists aliases. GodLock lists local `runtime` plus workers.dev `sot`. Author hub wrap (ae) points at workers.dev as `survival`. **Do not drop shelves** to compensate.

### 1.2 Cap-7 / AZNet / calling-name / platforms

| Claim | Runtime isolate | Live factory (MirageGrid app Worker) |
| --- | --- | --- |
| Factory | `miragegrid` only | `role=cap-7-shuffle-app` |
| `resolves_to_hub` | `false` | `false` |
| `design_of` | `hub_designs` | **URL** (`https://www.azieleliab.com/` etc.) |
| `public_icann` | `false` | `false`; `mesh_name_icann=SLOT` |
| Site names | `cap7-loom` … `cap7-vault` | `azgrid` … `azstandby` (`*.az` mesh_name strings) |
| `/bridge` | was download-tracker (404) | 200 cite |
| Shuffle land | in-process FragGate; public SLOT | `/v1/shuffle` is **CITE** (`CAP7-SHUFFLE-CITE`) |
| Hosted `/mcp` | SLOT | Not claimed as `/mcp` on fetched paths |

AZNet verify ops (`stamp`, `verify_hash`, `receipt_verify`) are **cited LIVE** on `/v1/survival`. This audit did **not** execute those ops against a real tip — **cite/code only**. `payload_host` stays stub in registry / Remain-OFF #15.

Calling-name rotation (`src/calling-name.js`) is discovery-only. Live fetch: `rotated=false`, name `Aziel Runtime`, identity Aziel Eliab. Triggers require operator env or `implies_ban`. Empty metrics are not a ban. Trademark block list is present. ChainLock/AKM rewrite flags stay false.

Platforms: live `/v1/survival` `platforms.all_live=true`, `native_app_store=false`. Manifest 200. This is browser/PWA/Worker reach, **not** five native store binaries.

**Finding D3 (HIGH, follow-on).** Factory `design_of` is a hub URL; REDLINE / runtime insist `design_of: hub_designs`. Same law, two wire shapes. Do not flip `resolves_to_hub`. Align the field name in a MirageGrid + runtime pair, after a rescan.

**Finding D4 (HIGH, follow-on).** In-process Cap-7 names ≠ factory names. `#129` land still returns `cap7-*`. Live `/v1/cap7` returns `azgrid`…. A client that “pings until land” on the factory will not match runtime `CAP7_SITES`. **Do not invent a merge in this PR.**

### 1.3 FragGate single door / MASTER-33 strip

Locked hop (door.js header): FragGate → Lamb Lens → SweepGate → Sentinel → Provenance → ChainLock-IN → DecisionGATE → AZPIPE → Internal Domain → optional ASE → RoseClock → TemporalLock → ChainLock-OUT → ForgeReceipts.

Live `GET /mcp` and `#129` paper both say hub `/runtime` is the **same** door via service binding.

**Finding D5 (MED, documented).** Fabric MCP tools and `POST /v1/mesh/*` are kernel-direct. `GET /mcp` already publishes `master_33: false` / `second_softwares_door: false`. Memory HTTP POST re-enters FragGate. Mesh HTTP POST does **not**. Keep the label; do not silently promote mesh HTTP to a Softwares door.

### 1.4 Mesh QNM / nine laws / NO-LIE / die-with-pull

Fetched machine fields match the 2026-09-17 operator override: five former hard-false cites are ON. Die-with-pull `restore_godlock_uk: false`. Split-wires `clocks_share_socket: false`. Cold-copy `live_body_sync: false`. `vote_to_fix: false`. `rewrite_key: false`. `lie_to_survive: false`.

**Finding D6 (MED, design tension).** The same `/v1/mesh` body has `reheal_short` “Never by listening to neighbors” and `neighbor_heal: true`. That is the published override, not a silent lie — but it is easy to misread as REHEAL executing neighbor heal. Vote-to-fix still refuses. Follow-on: a machine field `neighbor_heal_is_cite` / `neighbor_heal_exec: false` if that is the truth, **after** a rescan. Do not flip the override off in this audit PR.

`survival_shelves` on `/v1/mesh` lists `doi` as an umbrella shelf class. COLD-MULTI-SHELF live `doi` is null. **Finding D7 (LOW):** class list ≠ live DOI invent. Keep `doi: null` on shelves.

### 1.5 AKM / ChainLock / EmbryoLock / AZVPN / strip

| Module | What this audit verified | What it did not |
| --- | --- | --- |
| AKM | Live survival cite: `belief_is_not_truth`, append-only, no `memory_delete`, stub_ops listed. `rebuild-index` refuses `AKM-OPERATOR` without operator (`src/memory.js`). | Did not fill or recall a production memory id. |
| ChainLock | Code: append-only writer DO; no `chainlock_delete`. | Did not append a production tip. |
| EmbryoLock | Code: wipe/scorch/unlock `FG-STUB` / local-only; no Argon2id/AES-GCM in isolate. Remain-OFF #3. | Did not run a local vault. |
| AZVPN | Cite: HTTPS/WS REAL; WireGuard/OpenVPN/L3 SLOT; GET `/v1/mesh` `vpn=true` never opens a session. | Did not open a TUNNEL session. |
| DecisionGATE / Sentinel / SweepGate | Present on FragGate call path. Sentinel override regex is still narrow (prior audit LOW). | No new attack-sim campaign beyond existing `verify-redline` / `verify-adversarial`. |

---

## Part 2 — Function (what actually runs)

### 2.1 LIVE vs cite-only vs SLOT (runtime SoT)

| Object | Runtime claim | Fetch / code |
| --- | --- | --- |
| FragGate `fraggate_call` | LIVE door | `GET /v1/fraggate/list` 200; HTTP call accepted (mesh join probed) |
| `POST /mcp` | LIVE edge MCP | GET card 200; POST not fully walked this pass |
| Hub `/runtime` exec | LIVE same door | library / author / godlock `/runtime/v1/health` 200 |
| `/survival` map | LIVE cite | 200 + 120s cache |
| Cap-7 name cite | LIVE | `/v1/mesh/az-generator` 200 |
| AZNet hash verify | LIVE cite | **not executed** |
| Cap-7 hosted `/mcp` | SLOT | no invent |
| Cap-7 public shuffle **land** | SLOT | factory `/v1/shuffle` is CITE |
| Cap-7 app `/bridge` | was implied absent / wrong host | **LIVE cite** (this PR retarget) |
| Live-node API | SLOT | confirmed |
| Plane B/C shelves | SLOT | confirmed |
| PWA manifest | LIVE | 200 |
| Native store apps | false | confirmed |
| Calling-name rotation | armed, not triggered | `rotated=false` |

### 2.2 Auth / attest gaps

`wrangler.toml` `[vars] REQUIRE_TOKEN = "1"`. Live `/v1/ready` 200 ⇒ SESSION bind up and token secret present (fail-closed ready gate). Session mutate is header-only (`Authorization` / `X-Aziel-Runtime-Token`). Query token refuses (`tokenPresentedInQuery`).

**Finding F1 (HIGH, residual, by design).** Public FragGate + public MCP `tools/call` + public `/p/{slug}/{op}` proxy do not require the operator token. Paper and OpenAPI say this out loud (`fraggate_call_public=true`). Attest for live-node API / hosted Cap-7 is explicitly **not** done (`BAN-NODE-API-NOT-ATTESTED`, `BAN-CAP7-HOST-NOT-ATTESTED`). Next phase: attest named origins **before** any SLOT→LIVE flip.

### 2.3 Open proxies

`src/index.js` `proxy()` forwards `GET|POST /p/{slug}/{op}` to `{slug}-download-tracker.vibelock.workers.dev/v1/{op}` via service binding, else public `fetch`. Labeled `PROXY-NOT-EXEC`. Service bindings in `wrangler.toml` are the **download-trackers**, including `MIRAGEGRID → miragegrid-download-tracker` — not the Cap-7 app Worker.

**Finding F2 (MED).** Unauthenticated POST to `/p/miragegrid/assign` (and peer trackers) is an open forward to the download plane. Tracker hint lists `POST /v1/assign`. This is not FragGate and not MASTER-33. Keep the proxy-not-exec label. Follow-on: allowlist proxy ops; do not bind the factory app Worker as a silent second hop.

**Finding F3 (NOTE).** Sigil fallback `fetch`es library + foldlock-download-tracker. Fixed URLs, 2.5s timeout. Not a general SSRF.

### 2.4 Mesh join / heartbeat abuse

Probed live:

- `POST /v1/mesh/join` `{"product":"aznet","node_id":"auditnode1","presence":"live"}` → `MESH-OK`
- `POST /v1/fraggate/call` `{slug:"mesh",op:"join",confirm:true}` → `FG-OK` / `MESH-OK`

Shape checks exist (`product` required, `node_id` `[a-z0-9._-]{8,80}`, presence enum, 5-minute TTL, equivocation isolate, broadcast no-bytes, disable refused). **No bearer** for join. **Not rate-limited** by `requestLimitKind`. Fan-out cron `*/2 * * * *` refreshes `{slug}-worker` software_nodes.

**Finding F4 (HIGH).** Anyone can add presence rows for 5 minutes and churn `node_id`s. This does not open `/mcp` on random nodes (SLOT). It does pollute Live Nodes (mesh size) and USES/KV. Next phase: join rate bucket + optional attest; do **not** publish exec URLs on the roster.

### 2.5 Download trackers

Catalog `PRODUCTS[].worker` is `*-download-tracker`. Suite `GET /download` is JSON pack, counted when USES bound, not exec. Distinct from `/v1/uses`. **Finding F5 (NOTE):** tracker Workers are a second public hostname class (same CF account). A tracker ban is not a FragGate ban. Do not treat tracker `/download` as `/mcp`.

### 2.6 MCP / OpenAPI exposure

Live OpenAPI 3.1 ~395 KB documents survival, FragGate, proxy paths, session. MCP tools/list remains the frozen thin door (no new `#129` tool). Well-known OAuth card honestly has empty `authorization_servers`.

**Finding F6 (MED).** Large public OpenAPI + `/cite.json` (~476 KB) are crawler/LLM surfaces. Growth-ON is law (no GPTBot Disallow). Abuse shaping is F03 on `/mcp` + FragGate only (240/min call). Survival is cacheable (good). Follow-on: consider a compact `/openapi.json?door=1` without proxy-path explosion — not this PR.

### 2.7 PWA / manifest

`GET /manifest.webmanifest` 200. Icons point at `/sigil.png`. `start_url=/`, `display=standalone`. Calling-name rotation would rewrite `name` / `id` after an honest trigger; 120s survival cache can lag the manifest (manifest itself is not on the 120s survival header). **Finding F7 (LOW).** After a rotate, clients may see old survival JSON for ≤120s. Acceptable for crawlers; document for hubs.

### 2.8 Hub `/survival` TTL pulls

| Hub | Root `/survival` | `/runtime/survival` | TTL | Notes |
| --- | --- | --- | --- | --- |
| azieleliab.com | 200 wrap | 200 wrap | (hub) | Apex 301 → www |
| azielcorpuslibrary.net | **404** | 200 raw runtime | n/a on root | Binding works; hub pull missing |
| godlock.uk | 200 `hub_cite` | 200 raw | 60s | `challenge_only`; product surface not `/mcp` |
| hedidntjump.com | 200 pull | **HTML archive** | 60s | Honest `this_host_is_live_door=false` |

**Finding F8 (HIGH, hub repos).** Corpus root 404 breaks “hubs pull `/survival`”. HDJ `/runtime` is not a runtime front (correctly excluded from `NAMED_ROUTES`). GodLock `cap7_aznet.cite.mesh_az_generator` fetched as `https://aziel-runtime/v1/mesh/az-generator` (host missing `.vibelock.workers.dev`) — **hub cite bug**, not this repo.

---

## Part 3 — Protocol

### 3.1 Refuse-code honesty

`#129` refuse set is implemented as **judge functions** on `applyBanSurvival` (flag in, refuse out). They are honest **when invoked**. They are not a WAF. A CF ban that never reaches the isolate cannot be reported on the blocked path (`BAN-SURVIVAL` §4).

| Code | Wired in isolate? | Live trigger this pass? |
| --- | --- | --- |
| `BAN-NO-LIE` | yes | not triggered |
| `BAN-NO-HYDRA` | yes | not triggered |
| `BAN-NO-SECOND-DOOR` | yes | not triggered |
| `BAN-NO-SHELF-ONLY` / `BAN-NO-DOOR-ONLY` | yes | `BAN-NO-SHELF-FAILOVER` absent (good) |
| `BAN-NO-OPEN-NODE-PROXY` | yes | SLOT cite only |
| `BAN-NO-FAKE-CAP7-HOST` | yes | not triggered |
| `BAN-NO-FAKE-SHUFFLE-LIVE` | yes | land stays SLOT |
| `BAN-NO-TRADEMARK-NAME` | yes | default name clean |
| `BAN-NO-INVENT-BAN` | yes | empty metrics not a ban |
| `BAN-ROUTE-BLOCKED` / `BAN-EXEC-QUARANTINE` | yes (`BAN_SURVIVAL_BLOCKED`) | env unset; mode LIVE |
| `MESH-DISABLE-REFUSED` | yes | not re-probed |
| `FG-STUB` / `AKM-OPERATOR` | yes | code path |

**Finding P1 (MED).** Judges fire on explicit payload flags (`banned_host_is_live`, `open_node_proxy`, …). They do not automatically wrap every outbound cite. A stale URL (download-tracker `/bridge`) was emitted as a normal field, not as a refuse. Close tests now pin the app-Worker bridge.

### 3.2 Rate / abuse

`src/request-limits.js` `requestLimitKind` returns `mcp` | `fraggate_call` | `fraggate_read` only. Caps in `production.js`: MCP/FragGate call 240/min, read 360/min, session open 20, exec 60, anon_mutate 10. 429 on exec includes `rateLimitFailoverCite` (next LIVE front first, shelves later).

**Finding P2 (HIGH).** `POST /v1/mesh/join|heartbeat|broadcast` and `POST /v1/memory/*` are outside `requestLimitKind`. Memory POST still walks FragGate (and therefore FragGate call quota **if** sent as `/v1/fraggate/call`). Direct `/v1/memory/observe` and `/v1/mesh/join` do not. Next phase: add kinds `mesh_mutate` / `memory_mutate` to the same RATE DO. Do not lower FragGate below honest capacity (paper §5).

### 3.3 Ban-trigger invent

`detectCallingNameTriggers` requires `BAN_SURVIVAL_BLOCKED`, operator rotate/ban flags, uses-collapse / downloads-stop flags, or `implies_ban`. `invent_ban` / `fake_ban` refuse. **Finding P3 (NOTE).** Collapse flags are operator env, not derived from empty `/v1/uses`. Good. Do not auto-wire “uses == 0 ⇒ ban”.

### 3.4 Trademark block

List includes `gpt` as a short token (`n === "gpt"` / starts with `gpt ` / `gpt-runtime`). Seeds (`Potato Runtime`, `Whitestone AI`) do not match. **Finding P4 (LOW).** `gpt` as a bare token is broad but the matcher is token-ish, not substring-in-Potato. Forced `BAN_SURVIVAL_CALLING_NAME` is dropped if trademarked. No HTML escape audit of a rotated name into homepage chrome (manifest/OpenAPI are JSON). Follow-on: reject control characters in forced names.

### 3.5 Secret leakage

Token is header-only (redline). `[vars]` has `REQUIRE_TOKEN` only — no `RUNTIME_TOKEN` in git. Account / KV / D1 ids in `wrangler.toml` are binding identifiers, not operator tokens. Ready JSON was not dumped for secret strings this pass. **Finding P5 (NOTE).** `X-Aziel-Upstream` on proxy responses names the tracker URL. Not a secret.

### 3.6 CORS

`Access-Control-Allow-Origin: *` on mutating FragGate/MCP/mesh. **Finding P6 (MED).** Any browser origin can POST join/call. Public-demo + Growth-ON. Follow-on: credentialed CORS is **not** required (no cookies). A CSRF-style join flood is the mesh-rate finding, not a cookie theft.

### 3.7 Path quarantine

`BAN_SURVIVAL_BLOCKED` accepts `id` or `id:/path`. Exec paths only 503; read maps stay up. Live env unset ⇒ `mode=LIVE`. `liveDoors()` omits fully blocked fronts and strips blocked exec paths. **Finding P7 (LOW).** Path-degraded fronts still have `status: "live"` on `live_doors` (exec list already filtered). `routesDoc` uses `degraded`. Fine if clients read `exec[]`. Document in CLIENT_UPDATE if hubs key off `status` only.

### 3.8 Service bindings

Hub `/runtime` = same isolate (fetched health 200). Product bindings = download-trackers. No `MIRAGEGRID_APP` bind to `miragegrid` (the factory Worker). **Finding P8 (MED, follow-on).** Runtime cannot service-bind to the factory; it must cite the public app hostname (this PR) or add a dedicated bind later. Do not point `MIRAGEGRID` at the factory and break counted `/download`.

---

## Severity-ranked findings

| ID | Sev | Area | Evidence | This PR |
| --- | --- | --- | --- | --- |
| H1 | HIGH | Wrong Cap-7 bridge cite | Runtime `#129` → download-tracker `/bridge` **404**; app Worker `/bridge` **200**; hubs already named the app Worker | **Closed** (retarget + paper + tests) |
| H2 | HIGH | Cap-7 name-set drift | Runtime `cap7-loom…` vs factory `azgrid…` / `*.az` | Follow-on |
| H3 | HIGH | Unauth mesh join + no F03 kind | Live `POST /v1/mesh/join` `MESH-OK`; `requestLimitKind` omits mesh | Follow-on |
| H4 | HIGH | Public FragGate / MCP exec without operator token | `/mcp` `auth=none`; OpenAPI `fraggate_call_public` | By design; attest before SLOT→LIVE |
| H5 | HIGH | Corpus hub root `/survival` 404 | Fetched `{error:"not found"}`; `/runtime/survival` 200 | Hub repo follow-on |
| H6 | HIGH | Factory `design_of` URL vs `hub_designs` | Live `/bridge` sites vs runtime REDLINE | Pair-repo follow-on |
| M1 | MED | `/p/{slug}/{op}` open forward to trackers | `proxy()` + `wrangler.toml` bindings | Follow-on allowlist |
| M2 | MED | Mesh HTTP skips MASTER-33 | `dispatchMeshHttp` vs memory’s `fraggateCall` | Documented; optional wrap |
| M3 | MED | `neighbor_heal: true` vs REHEAL short | Live `/v1/mesh` | Cite-field honesty follow-on |
| M4 | MED | Hub SoT prefers workers.dev | GodLock/HDJ/ae pulls | Hub failover to aliases |
| M5 | MED | CORS `*` on mutate | Live headers | Accept or mesh-rate |
| M6 | MED | OpenAPI / cite.json size | 395 KB / 476 KB | Optional compact door spec |
| M7 | MED | GodLock az-generator host typo | `https://aziel-runtime/v1/…` | Hub repo |
| L1 | LOW | Survival cache 120s vs name rotate | `survivalCacheHeaders` | Accept |
| L2 | LOW | `gpt` trademark token | `calling-name.js` | Tighten later |
| L3 | LOW | Mesh `survival_shelves` includes `doi` class | `/v1/mesh` vs shelves `doi:null` | Copy only |
| L4 | LOW | Sentinel override regex narrow | prior audit | Keep |
| N1 | NOTE | Live-node API SLOT | paper + live | Do not flip |
| N2 | NOTE | Hosted Cap-7 `/mcp` SLOT | paper + live | Do not flip |
| N3 | NOTE | Shelves mutual backup | live `mutual_backup=true` | Do not drop |
| N4 | NOTE | HDJ not a live door | live JSON + HTML `/runtime` | Correct |
| N5 | NOTE | Platforms LIVE ≠ native apps | `native_app_store=false` | Correct |
| N6 | NOTE | Public demo workspace | F02 | Keep labeled |

---

## Suggested fix order (next “fix → rescan → patch”)

Do **not** boil the ocean. One loop per row. Rescan live bytes after each. Do not weaken survival by deleting shelves or painting SLOT as LIVE.

1. **Deploy this PR** so runtime SoT `/v1/survival` `cap7_aznet.cite.miragegrid_bridge` is the app Worker (closes H1 on the next Worker deploy). Rescan `/v1/survival` + `/cite.json`.
2. **Hub survival completeness (H5, M4, M7)** — corpus root `/survival` pull; GodLock az-generator host; hub `sot_aliases` failover when workers.dev is the banned front. Separate hub PRs.
3. **Mesh abuse (H3, P2)** — add `mesh_mutate` to `requestLimitKind` + RATE DO; keep join public if presence-only; still no exec URLs on the roster.
4. **Cap-7 contract (H2, H6)** — MirageGrid + runtime agree on site ids and `design_of` wire shape. Land/exec and hosted `/mcp` stay SLOT until attest. Do not invent ICANN `.az`.
5. **Proxy allowlist (M1)** — `/p/{slug}/{op}` only forwards documented tracker ops; never factory `/mcp`.
6. **Attest gate (H4, N1, N2)** — named origin + `engine_digest` + ChainLock/ForgeReceipts **before** any live-node API or hosted Cap-7 SLOT→LIVE. Security rescan after attest, not before.
7. **Cite hygiene (M3, L3)** — `neighbor_heal_exec` honesty; mesh `survival_shelves` vs `doi:null`.
8. **Optional compact OpenAPI (M6)** — only if crawler/LLM hammering returns.

---

## What this PR changes (safe)

- `MIRAGEGRID_APP_ORIGIN` / `MIRAGEGRID_DOWNLOAD_ORIGIN` split. Bridge cites use the app Worker.
- BAN-SURVIVAL §6c + `docs/CITE.md` no longer say `/bridge` is absent or point at the 404 tracker path.
- `public_worker_bridge: "live"` (cite). `public_worker_shuffle` **land** remains `"slot"`. Hosted update remains SLOT.
- Close tests in `verify-semantic-bridge.mjs` / `verify-ban-survival.mjs`.

## What this PR does not change

- No new MCP tool. No FragGate slug. No shelf drop. No live-node API LIVE. No hosted Cap-7 `/mcp`. No Remain-OFF flip. No name-set merge (`cap7-loom` vs `azgrid`). No mesh auth redesign.

---

## Close-test pointers

- `scripts/verify-ban-survival.mjs`
- `scripts/verify-semantic-bridge.mjs`
- `scripts/verify-redline.mjs`
- `scripts/verify-mesh-security.mjs`
- `scripts/verify-mesh-nine-laws.mjs`
- `npm test` (full suite)

---

Eliab, Aziel. (2026). Security architecture audit post BAN-SURVIVAL / Cap-7. https://github.com/AzielEliab/aziel-runtime/blob/main/docs/audit/SECURITY-ARCHITECTURE-POST-BAN-SURVIVAL.md

Identity **Aziel Eliab** only. One banned door is not last tip gone. One dead shelf is not last door gone. Name the next LIVE front. Keep the shelves. Do not lie.
