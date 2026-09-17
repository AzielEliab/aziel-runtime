# Refusal contract — Aziel Runtime 2.0.0-rc1

**Author / identity:** **Aziel Eliab** only  
**Law paper:** `docs/designs/REMAIN-OFF-BY-DESIGN-2026-09-10.md` (33 items)  
**Self-check:** `scripts/verify-remain-off.mjs`

These refusals are **stable boundaries**, not gaps. Enabling any Remain-OFF item on the public mesh is a constitutional break, not a feature.

`cite.audits.remain_off_by_design.do_not_enable === true`.  
`GET /v1/mesh` never enables.

---

## 1. FragGate door codes (`src/fraggate/codes.js`)

| Code | When |
|------|------|
| `FG-OK` | Allowlisted live op completed the door |
| `FG-HALLUC-TOOL` | Unknown registry name or unknown MCP tool |
| `FG-STUB` | Stub op / named stub verb |
| `FG-LOCAL-ONLY` | Named local_only entry, or allowlisted op this isolate cannot run |
| `FG-GATE-REFUSE` | DecisionGATE blocked |
| `FG-UNKNOWN-OP` | Live slug, op not on allowlist |

Pipeline-only (AZPIPE / fabric hops in `door.js`):

| Code | Hop |
|------|-----|
| `FG-SWEEP-ISOLATE` | SweepGate isolate |
| `FG-LAMB-REFUSE` | Lamb Lens REFUSE / HOLD — no handler; not a second door |
| `FG-SENTINEL` | Sentinel reject — no rollback |
| `FG-REORDER` | Illegal MASTER-33 hop reorder |

Refuse envelopes are `ok: false`, `result: null`, and write an ask/refuse ledger tip. They are not silent 200 success.

---

## 2. Remain-OFF inventory (33) — do not enable

Modes: **OFF** (GET/status never arms), **REFUSE** (named stub / halluc / lamb / gate), **GATED** (operator / token / FragGate-only).

| # | Item | Mode | Live signal |
|---:|------|------|-------------|
| 1 | Mesh auto-enable | OFF | `GET /v1/mesh` never enables; empty POST → `MESH-NEED-BEARER` |
| 2 | QNS public proxy | OFF | `POST /v1/qns/via` → `QNS-NO-PROXY` |
| 3 | Vault/Custody destructive / hosted unlock | REFUSE / LOCAL-ONLY | ARK `scorch`/`wipe`/`unlock`/`encrypt`; EmbryoLock wipe/scorch `FG-STUB` |
| 4 | WhistleLock send / mail / release | REFUSE | stub `send` / `mail` / `release` |
| 5 | MirageGrid VPN-hop / tunnel / mesh | REFUSE | stub `vpn-hop` / `hop` / `tunnel` / `mesh` |
| 6 | AzielTether VPN / arm / mesh-join | REFUSE | stub `vpn` / `arm` / `mesh-join` |
| 7 | VeilLock remote surveillance | REFUSE | stub `inject` / `intercept` / `facetime` |
| 8 | AZ-OS exec / shell / lattice | REFUSE | stub `exec` / `shell` / `lattice` (session VFS is ethics-only) |
| 9 | AZMail deanonymize | REFUSE | stub `deanonymize` / `unmask` / `identify` / `harvest` / SMTP family |
| 10 | PeaceLock fabricate | REFUSE | stub `transcript` / `motive` / `counterfactual` / `invent` |
| 11 | 4DMap `truth_score` | REFUSE | `4DM-TRUTH-REFUSE` |
| 12 | 4DMap `invent_mark` | REFUSE | stub `invent_mark` |
| 13 | 4DMap `backdate_class` | REFUSE | stub `backdate_class` |
| 14 | AZBrowser Tor / phoenix wipe | REFUSE | stub `tor_exit` / `phoenix_wipe` |
| 15 | AZNet payload hosting | OFF | stub `payload_host` / `serve_content_for_peer` |
| 16 | AZHub auto-unlock | OFF | `AIH-AUTO-UNLOCK-REFUSE` |
| 17 | AZInterface auto-unlock | OFF | `AIH-AUTO-UNLOCK-REFUSE`; cycles pre-locked |
| 18 | Public rollback API | OFF | `/v1/rollback` 404 |
| 19 | RoseClock rollback | OFF | `RC-NO-ROLLBACK` |
| 20 | LambGate as second door | OFF | `lambgate=false` |
| 21 | AZPIPE as Softwares slug | OFF | no Softwares-tab card |
| 22 | `/v1/azpipe/arch` mutate | OFF | cite/read only |
| 23 | AKM as Softwares door | OFF | fabric `slug=memory`; `software_tab=false` |
| 24 | AKM `rebuild-index` | GATED | `AKM-OPERATOR` without operator |
| 25 | AKM posterior authorizes | OFF | `authorizes_action=false`; posterior ≠ truth |
| 26 | Unauth session mutate | OFF | `REQUIRE_TOKEN=1` gates open/policy/exec/close |
| 27 | Hallucinated-tool fallback | REFUSE | `FG-HALLUC-TOOL` |
| 28 | Destructive / fantasy fallback | REFUSE | `FG-STUB` — never fake exec |
| 29 | Thin MCP | GATED | no flat `{slug}_{op}` pile |
| 30 | `/p/{slug}/{op}` as agent path | OFF | proxy only |
| 31 | FragGate as catalog engine | OFF | extras/kernel door; `engine=false` |
| 32 | Mesh as catalog engine | OFF | extras/kernel rollup |
| 33 | 11 domains as doors | OFF | `domains_are_doors=false` |

`lumen_panel` stays refused with the 4DMap cluster. Do not add a Lumen panel. Do not add a 34th Remain-OFF row in this rc without a new major.

---

## 3. Domain refuse codes (stable names)

### Mesh (`src/mesh.js`)

`MESH-OK`, `MESH-NEED-BEARER`, `MESH-BAD-BEARER`, `MESH-ENABLE-RATE`, `MESH-DISABLE-REFUSED`, `MESH-OFF`, `MESH-BAD-INPUT`, `MESH-UNKNOWN-NODE`, `MESH-NO-PUBLISH`, `MESH-NO-BYTES`, `MESH-EQUIVOCATION`, `MESH-NO-INDEX`, `MESH-NO-NEIGHBOR-HEAL`, `MESH-NO-LIVE-SHELF`, `MESH-POISON`, `MESH-STUB`, `MESH-UNKNOWN-OP`, `MESH-METHOD`, `MESH-NOT-FOUND`, `MESH-NO-REWRITE`, `MESH-NO-LIE`

`MESH-GET-NEVER-ENABLES` refuses enable-via-GET (`?enable=true` / `op=enable`). `MESH-NO-REWRITE` / `MESH-NO-LIE` refuse rewrite-key and lie-to-survive verbs. Receipts that still hash. Copies not all on one tunnel. The network is never allowed to lie — even to self-preserve. Law paper: `docs/designs/NO-LIE-NO-REWRITE-1.0.md`. Does not replace the CROSS-NETWORK-SURVIVAL-1.0 machine tip.

Nine QNM laws are hard-true on `GET /v1/mesh` (and status). Violations reuse the published codes above — they do not invent a new door: tick body / live body sync → `MESH-NO-BYTES`; clocks sharing a socket → `MESH-BAD-INPUT`; neighbor heal / vote-to-fix / apply-last-packet → `MESH-NO-NEIGHBOR-HEAL`; phoenix-neighbor / hostname-restore / Node Gate / auto-heal / VPN-anonymity claims → `MESH-STUB`. Close test: `scripts/verify-mesh-nine-laws.mjs`.

`POST /v1/mesh/disable` / suite `mesh_disable` return **`MESH-DISABLE-REFUSED`**. Read-only suite-presence stays ON. Library host overlay may return **409** `library-default-off` instead of Worker `MESH-NEED-BEARER`. That overlay is host-side. GET never enables extra radios.

`mesh_join` / `mesh_heartbeat` / `mesh_broadcast` (HTTP + MCP) return **`MESH-OFF`** when transmission radios are powered down or suite radios are not enabled. Software presence is blocked. Do not invent a second spelling. Missing `product`, `node_id` outside 8–80 `[a-z0-9._-]`, or a `presence` other than `live`/`locked`/`isolated` is **`MESH-BAD-INPUT`**. Presence TTL is a strict 5 minutes; no heartbeat (or fan-out refresh) inside that window drops the node from the live roster.

### QNS (`src/qns.js`)

`QNS-OK` (cite), `QNS-CITE-ONLY`, `QNS-NO-PROXY`

### AKM (`src/memory.js`)

`AKM-OPERATOR`, `AKM-CAPABILITY`, `AKM-CONFLICT`, `AKM-ROSE`, `AKM-STAMP`, `AKM-NO-FACT`, `AKM-NO-MEMORY`, `AKM-NO-OUTCOME`, `AKM-UNKNOWN`, `AKM-NO-AUTO-MODEL`, `AKM-NOT-FOUND`, `AKM-STUB`, `AKM-UNKNOWN-OP`, `AKM-METHOD`

Refuse objects set `belief_is_not_truth: true` and `authorizes_action: false`.

### AZHub / AZInterface

`AIH-AUTO-UNLOCK-REFUSE`, `AIH-COMPLETENESS-REFUSE`, `AIH-RANKING-REFUSE`, `AIH-SCORCH-REFUSE`

### Other fabric

| Code | Source |
|------|--------|
| `4DM-TRUTH-REFUSE` | 4DMap |
| `FG-CL` | ChainLock |
| `RC-NO-ROLLBACK` | RoseClock |
| `ASE-UNARMED` | ASE cite+refuse |
| `VECTOR-UNARMED` | VECTOR cite+refuse |

### Gateway (F03 — `src/request-limits.js` / `src/production.js`)

| Code | HTTP | When |
|------|------|------|
| `RATE_LIMIT` | 429 | FragGate HTTP, MCP, or session mutate window exceeded |
| `BODY_TOO_LARGE` | 413 | Inbound body over 256 KiB before parse |
| `BODY_TOO_DEEP` | 400 | JSON depth > 12 or nodes > 4096 |
| `REQUEST_DEADLINE` | 408 | Request exceeded the deadline budget (default 25s) |

`enforcement` is `durable-object` when `RATE` is bound, else `isolate`. Not a second door.

### Redline (`src/redline.js`)

`AZ-GEN-CALL-REFUSED`, `CAP7-RESOLVE-INJECT`, `DOI-FAKE-REFUSED`, `TOKEN-QUERY-REFUSED`, `TOKEN-BODY-REFUSED`

Operator token is header-only. Cap-7 `design_of` stays `hub_designs`; `resolves_to_hub` stays false. Fake Zenodo DOIs are not cited. Law paper: `docs/designs/REDLINE-2026-09-14.md`.

`named_fallback_inventory.refused` stays  
`["exec", "shell", "blend", "chat", "smtp_send", "deanonymize", "unknown-tool"]`.

---

## 4. Reviewer rule

A **PASS** on Remain-OFF means the item stayed correctly OFF / REFUSED / GATED.

A **FAIL** means something that must stay off returned success, enabled radios, or invented a fallback.

Self-check (`npm test` / this pack) ≠ third-party lab.
