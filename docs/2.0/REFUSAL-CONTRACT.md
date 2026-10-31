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
| `FG-HALLUC-TOOL` | Unknown registry name. Also `error.data.code` when `tools/call` names a tool that is not listed (JSON-RPC `-32602`, not a result with `isError`) |
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

Client-transport codes (stdio bridge / session / Docker — the door was **never reached**; not a FragGate execution receipt; not local validation):

| Code | When |
|------|------|
| `FG-DNS` | Outbound DNS failed (`ENOTFOUND` / `getaddrinfo` / `EAI_AGAIN`) for `*.vibelock.workers.dev` |
| `FG-NET` | Other remote transport failure (timeout, connection refused) |

These envelopes set `remote: false`, `fraggate_receipt: false`, `local_validation: false`, `door: null`, `ledger_tip: null`. Source: [`src/remote-transport.js`](../../src/remote-transport.js).

---

## 2. Remain-OFF inventory (33) — do not enable

Modes: **OFF** (GET/status never arms), **REFUSE** (named stub / halluc / lamb / gate), **GATED** (operator / token / FragGate-only).

| # | Item | Mode | Live signal |
|---:|------|------|-------------|
| 1 | Mesh auto-enable | OFF | `GET /v1/mesh` never enables; empty POST → `MESH-NEED-BEARER` |
| 2 | QNS public proxy | OFF | `POST /v1/qns/via` → `QNS-NO-PROXY` |
| 3 | Vault/Custody destructive / hosted unlock | REFUSE / LOCAL-ONLY | ARK `scorch`/`wipe`/`unlock`/`encrypt`; EmbryoLock wipe/scorch `FG-STUB` |
| 4 | WhistleLock send / mail / release | REFUSE | stub `send` / `mail` / `release` |
| 5 | MirageGrid VPN-hop / tunnel / mesh | REFUSE | stub `vpn-hop` / `hop` / `tunnel` / `mesh`. `geo-target` / `session-stick` / `egress-rotate` are LIVE on the Cap-7 plane and are not a public egress IP |
| 6 | AzielTether VPN / arm / mesh-join | REFUSE | stub `vpn` / `arm` / `mesh-join` |
| 7 | VeilLock remote surveillance | REFUSE | local_only `inject` / `intercept` / `facetime` → `FG-LOCAL-ONLY` |
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

`MESH-OK`, `MESH-NEED-BEARER`, `MESH-BAD-BEARER`, `MESH-ENABLE-RATE`, `MESH-DISABLE-REFUSED`, `MESH-OFF`, `MESH-BAD-INPUT`, `MESH-UNKNOWN-NODE`, `MESH-SESSION-SEAL`, `MESH-ROSTER-FULL`, `MESH-NO-PUBLISH`, `MESH-NO-BYTES`, `MESH-EQUIVOCATION`, `MESH-NO-INDEX`, `MESH-NO-NEIGHBOR-HEAL`, `MESH-NO-LIVE-SHELF`, `MESH-POISON`, `MESH-STUB`, `MESH-UNKNOWN-OP`, `MESH-METHOD`, `MESH-NOT-FOUND`, `MESH-NO-REWRITE`, `MESH-NO-LIE`

`MESH-GET-NEVER-ENABLES` refuses enable-via-GET (`?enable=true` / `op=enable`). `MESH-NO-REWRITE` / `MESH-NO-LIE` refuse rewrite-key and lie-to-survive verbs. Receipts that still hash. Copies not all on one tunnel. The network is never allowed to lie — even to self-preserve. Law paper: `docs/designs/NO-LIE-NO-REWRITE-1.0.md`. Does not replace the CROSS-NETWORK-SURVIVAL-1.0 machine tip.

Nine QNM laws are hard-true on `GET /v1/mesh` (and status). OPERATOR-OVERRIDE 2026-09-17 flipped `auto_heal` / `implicit_heal`, `node_gate` / `get_is_node_gate`, `neighbor_heal`, `network`, and `anonymity_network` (mode flag only — not Tor/VPN) from hard-false to ON. Remaining violations reuse the published codes above — they do not invent a new door: tick body / live body sync → `MESH-NO-BYTES`; clocks sharing a socket → `MESH-BAD-INPUT`; vote-to-fix / apply-last-packet → `MESH-NO-NEIGHBOR-HEAL`; phoenix-neighbor / hostname-restore / login-recovery IP panel / VPN-origin-hiding claims → `MESH-STUB`. Close test: `scripts/verify-mesh-nine-laws.mjs`.

`POST /v1/mesh/disable` / suite `mesh_disable` return **`MESH-DISABLE-REFUSED`**. Read-only suite-presence stays ON. Library host overlay may return **409** `library-default-off` instead of Worker `MESH-NEED-BEARER`. That overlay is host-side. GET never enables extra radios.

`mesh_join` / `mesh_heartbeat` / `mesh_broadcast` (HTTP + MCP) return **`MESH-OFF`** when transmission radios are powered down or suite radios are not enabled. Software presence is blocked. Do not invent a second spelling. Missing `product`, `node_id` outside 8–80 `[a-z0-9._-]`, a `presence` other than `live`/`locked`/`isolated`, or a `heartbeat_mode` other than `active`/`idle`/`asleep` is **`MESH-BAD-INPUT`**. A non-worker session stays registered until explicit leave or 14 days after the last beat. Miss 3 adaptive beats and the class is **stale** (not deleted, not Live). One beat restores the declared presence. `{slug}-worker` presence TTL is a strict 5 minutes; no suite refresh inside that window drops that worker. A stored seal that does not match the session fields is **`MESH-SESSION-SEAL`** and does not count as live. Past grace, or a node that was never joined, is **`MESH-UNKNOWN-NODE`**.

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

`enforcement` is `durable-object` when `RATE` is bound, else `isolate`. Not a second door. Direct mesh join/heartbeat/leave/broadcast/site-presence use kind `mesh_mutate`. Direct `/v1/memory/*` uses `memory_mutate`. `/p/{slug}/{op}` outside the documented tracker/catalog allowlist (including factory `/mcp`) is `PROXY-OP-REFUSED` (404, still proxy-not-exec).

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

---

## 5. Receipt-integrity codes (additive, 2.0.x)

New names only; no existing code changed or recycled. All are `ok: false`.

| Code | Spec | When |
|------|------|------|
| `ANCHOR-MISSING` | AZRT-ANCHOR-1.0 | Witness log empty / 404, or no statement covers the row yet |
| `ANCHOR-UNREACHABLE` | AZRT-ANCHOR-1.0 | Witness log could not be fetched (fail closed, not "ok") |
| `ANCHOR-SIG-BAD` | AZRT-ANCHOR-1.0 | Statement signature does not verify with the pinned witness key |
| `ANCHOR-KEY-MISMATCH` | AZRT-ANCHOR-1.0 | Statement names a key other than the pinned one |
| `ANCHOR-ORDER-BREAK` | AZRT-ANCHOR-1.0 | Statement `n` gap or `prev_statement_hash` break |
| `ANCHOR-MISMATCH` | AZRT-ANCHOR-1.0 | Statement hash wrong, or an anchored head is no longer the runtime's row at that seq |
| `ANCHOR-STORE-UNBOUND` / `ANCHOR-NO-ROW` / `ANCHOR-WALK-TOO-LONG` / `ANCHOR-BAD-QUERY` | AZRT-ANCHOR-1.0 | `/v1/anchor/row` cannot check |
| `ANCHOR-PENDING` | AZRT-ANCHOR-COVERAGE-1.0 | A refusal head is not in the outside anchor log yet. The refusal still stands. Verify flags the row. Not a witness signature. |
| `SCHEMA-DRIFT` | AZRT-SCHEMA-PIN-1.0 | Caller or session pinned a `tools/list` schema hash that no longer matches (409, nothing ran) |
| `EXPECT-SPEC-INVALID` / `EXPECT-VERDICT-INVALID` | AZRT-EXPECT-SPEC-1.0 | Malformed `expect` on open / `verdict` on close (400) |

Every refusal above and every existing refuse code on `tools/call` / `POST /v1/fraggate/call` additionally returns `refusal_receipt` (AZRT-REFUSAL-RECEIPT-1.0). The code and envelope fields are unchanged.

---

## 5b. Mesh peer sessions (additive, 2.0.x)

| Code | Spec | When |
|------|------|------|
| `MESH-PEER-NOT-ALLOWED` | AZRT-MESH-PEER-DENY-1.0 | Local Track 2 node: peer session offer/accept with a handle the operator has not allowed (deny-by-default). The public Worker `peer_session_open` stays `FG-STUB`. |

## 5c. Agent subnet (additive, 2.0.x)

AGENT-SUBNET-1.0 (`src/agent-subnet.js`, docs/designs/AGENT-SUBNET-1.0.md). Every one is sealed on the internal `refusals` chain through `sealRefusal` with `reason: null` and `reason_sha256` of the fixed reason; caller text is never stored. Default deny.

| Code | HTTP | When |
|---|---|---|
| `AGENT-BAD-INPUT` | 400 | Not a well-formed AGENT-SUBNET-1.0 statement. |
| `AGENT-PLAINTEXT-FIELD` | 400 | A send carries a field outside the signed statement and the sealed box. |
| `AGENT-PLAINTEXT-SUSPECT` | 400 | The box bytes are at least 90% printable ASCII (not ciphertext). |
| `AGENT-PRIVATE-KEY` | 400 | A private-key-shaped field was sent. |
| `AGENT-SKEW` | 400 | Statement time not within 5 minutes. |
| `AGENT-REPLAY` | 409 | That exact signed statement was already used. |
| `AGENT-ID-MISMATCH` | 400 | Agent/owner id is not the handle of its public key. |
| `AGENT-SIG-INVALID` | 403 | Agent signature did not verify. |
| `AGENT-OWNER-SIG` | 403 | Owner signature missing or bad (cross-owner links need both owners). |
| `AGENT-UNKNOWN` | 404 | Agent not registered. |
| `AGENT-EXISTS` | 409 | Agent id already registered. |
| `AGENT-RETIRED` | 403 | The agent was retired by its owner; every grant it had is dead. |
| `AGENT-OWNER-CAP` | 409 | Owner has the maximum agents. |
| `AGENT-NO-GRANT` / `AGENT-GRANT-EXPIRED` / `AGENT-GRANT-REVOKED` / `AGENT-GRANT-SCOPE` | 403 | No usable grant. |
| `AGENT-BOX-HASH` | 400 | `box_sha256` does not match the box. |
| `AGENT-CARRIER-ABSENT` | 503 | A named radio carrier (LAN, Wi-Fi, Bluetooth, RF, Photon) is not at this relay; `absent_code: QNM-RADIO-ABSENT`. |
| `AGENT-RATE` | 429 | Per-agent or subnet rate limit (sealed, unlike door 429s). |
| `AGENT-MAILBOX-FULL` | 409 | Receiver mailbox at cap. |
| `AGENT-RECEIPT-UNAVAILABLE` / `AGENT-RECEIPT-CAP` | 503 | No receipt could be sealed, so nothing was done. |
| `AGENT-STORE-UNBOUND` | 503 | Durable store (or the agent state object) not bound or not reachable. |
| `AGENT-SALT-LOST` | 503 | The subnet salt is missing while receipts exist; refused rather than re-minted. |
| `AGENT-CHALLENGE` | 403 | View challenge missing, expired, forged, already used, or for another scope or key. |
| `AGENT-NOT-FOUND` / `AGENT-METHOD` | 404 / 405 | Unknown path / wrong method. |

## 5d. Auth refusal rollup (additive, 2.0.x, AZRT-AUTH-ROLLUP-1.0)

No auth refuse code, status or body changes. Auth refusals (`token_required`, `token_mismatch`,
`token_not_configured`, `TOKEN-QUERY-REFUSED`, `TOKEN-BODY-REFUSED`, `CL-NOT-ISSUER`, `SESSION-PAUSED`,
other `*token*` codes, any other 401) gain one additive header,
`X-Azrt-Auth-Rollup: <counted|pending|unavailable|rate_limited>; spec=AZRT-AUTH-ROLLUP-1.0; minute=<n>; door=<fixed>; code=<fixed>`.
They are still never sealed one by one. The cron seals one count-only row per minute per door + code on the
internal `refusals` chain (`refusal.kind: "auth_rollup"`). New row code: `AUTH-ROLLUP-OVERFLOW` (pairs past
the per-minute row cap, summed). Cron log codes: `AUTH-ROLLUP-UNBOUND`, `AUTH-ROLLUP-STORE-UNBOUND`.
Rollup rows spend their own reserved `rollup` share (9/min) of the writer's refusal cap, outside the REST
240 (writer total 609). The header is documented at `#/components/headers/X-Azrt-Auth-Rollup`.
