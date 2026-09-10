# AZIEL RUNTIME — Functions That Should Remain Off, Refused, or Gated by Design

**REMAIN-OFF-BY-DESIGN-2026-09-10** · 2026-09-10 · Author / identity: **Aziel Eliab** only.

Not a Softwares-tab product. Not a FragGate slug. This ingest does **not** enable any item below.

PDF path: `docs/designs/REMAIN-OFF-BY-DESIGN-2026-09-10.pdf` (binary beside this markdown when generated). If the PDF cannot be embedded, this markdown is the full inventory.

---

## Rule

These items do **NOT** count as missing implementation when they are correctly **OFF**, **REFUSED**, or **GATED**.

Correct behavior prevents unsafe, bypass, destructive, or architecture-breaking execution.

- **OFF** — default disabled; GET/status/cite never arms it.
- **REFUSE** — named stub / halluc / lamb / gate refuse. Not silent success. Not a fake 200.
- **GATED** — operator bearer, `REQUIRE_TOKEN`, or FragGate-only. Public callers do not self-grant.

A later agent that "implements" one of these on the public mesh has broken the constitution, not closed a gap.

Companion: [FEATURE-STATE-2026-09-10](../audit/FEATURE-STATE-2026-09-10.md) lists **gaps vs intentional OFF** (50 items: OFF / STUB / LOCAL / NOT IMPLEMENTED / PARTIAL). **This paper is the constitutional OFF set** (33 items). FEATURE-STATE may name unfinished work. This paper names work that must stay correctly off.

---

## Inventory (33)

| # | Item | Mode | FEATURE-STATE | Live signal |
| ---: | --- | --- | ---: | --- |
| 1 | Mesh auto-enable | OFF | 1, 3 | `GET /v1/mesh` never enables; empty POST → `MESH-NEED-BEARER` |
| 2 | QNS public proxy | OFF | 2 | `POST /v1/qns/via` → `QNS-NO-PROXY` |
| 3 | Vault/Custody destructive / hosted unlock (ARK + EmbryoLock wipe/scorch) | REFUSE / LOCAL-ONLY | 4, 8 | ARK stub `scorch` / `wipe` / `unlock` / `encrypt`; EmbryoLock wipe/scorch `FG-STUB` on public mesh |
| 4 | WhistleLock send / mail / release | REFUSE | 9 | stub `send` / `mail` / `release` |
| 5 | MirageGrid VPN-hop / tunnel / mesh | REFUSE | 10 | stub `vpn-hop` / `hop` / `tunnel` / `mesh` |
| 6 | AzielTether VPN / arm / mesh-join | REFUSE | 11 | stub `vpn` / `arm` / `mesh-join` |
| 7 | VeilLock remote surveillance | REFUSE | 7 | stub `inject` / `intercept` / `facetime` |
| 8 | AZ-OS exec / shell / lattice | REFUSE | 12 | stub `exec` / `shell` / `lattice` |
| 9 | AZMail deanonymize | REFUSE | 21 | stub `deanonymize` / `unmask` / `identify` / `harvest` |
| 10 | PeaceLock fabricate | REFUSE | 15 | stub `transcript` / `motive` / `counterfactual` / `invent` |
| 11 | 4DMap `truth_score` | REFUSE | 16 | `4DM-TRUTH-REFUSE` |
| 12 | 4DMap `invent_mark` | REFUSE | 16 | stub `invent_mark` |
| 13 | 4DMap `backdate_class` | REFUSE | 16 | stub `backdate_class` |
| 14 | AZBrowser Tor / phoenix wipe | REFUSE | 17–18 | stub `tor_exit` / `phoenix_wipe` |
| 15 | AZNet payload hosting | OFF | 25 | stub `payload_host` / `serve_content_for_peer` |
| 16 | AZHub auto-unlock | OFF | 27 | `AIH-AUTO-UNLOCK-REFUSE` |
| 17 | AZInterface auto-unlock | OFF | 28 | `AIH-AUTO-UNLOCK-REFUSE`; cycles pre-locked |
| 18 | Public rollback API | OFF | 31 | `/v1/rollback` 404 |
| 19 | RoseClock rollback | OFF | 32 | stamps `rollback: false`; `rollback()` refuses |
| 20 | LambGate as second door | OFF | 33 | `lambgate=false`; Lamb Lens is fabric after FragGate |
| 21 | AZPIPE as Softwares slug | OFF | 36 | no Softwares-tab card; fabric only |
| 22 | `/v1/azpipe/arch` mutate | OFF | 37 | cite/read only; other `/v1/azpipe/*` 404 |
| 23 | AKM as Softwares door | OFF | 38 | fabric `slug=memory`; `software_tab=false` |
| 24 | AKM `rebuild-index` | GATED | 39 | `AKM-OPERATOR` without operator |
| 25 | AKM posterior authorizes | OFF | 40 | `authorizes_action=false`; posterior ≠ truth |
| 26 | Unauth session mutate | OFF | 41 | `REQUIRE_TOKEN=1` gates open/policy/exec/close |
| 27 | Hallucinated-tool fallback | REFUSE | 42 | `FG-HALLUC-TOOL` (e.g. `zd30`) |
| 28 | Destructive / fantasy fallback | REFUSE | 43 | `FG-STUB` / named stub ops — never fake exec |
| 29 | Thin MCP | GATED | 44 | no flat `{slug}_{op}` pile; discover → describe → call |
| 30 | `/p/{slug}/{op}` as agent path | OFF | 46 | proxy only; not exec; not default agent path |
| 31 | FragGate as catalog engine | OFF | 47 | extras/kernel door; `engine=false` |
| 32 | Mesh as catalog engine | OFF | 48 | extras/kernel rollup; not Softwares-tab |
| 33 | 11 domains as doors | OFF | 49 | isolation labels; `domains_are_doors=false` |

`lumen_panel` stays refused with the 4DMap cluster (FEATURE-STATE #16). It is covered by items 11–13 and item 28. Do not add a Lumen panel.

---

## 1. Mesh auto-enable — OFF

Default radios / bearers are **OFF**. `GET /v1/mesh` and `GET /v1/mesh/status` return rollup counts and stay `enabled=false`. They never turn LIVE. Empty `POST /v1/mesh/enable` is `MESH-NEED-BEARER`. A login-shaped bearer is `MESH-BAD-BEARER`. Library host overlay may 409 stricter-OFF; that is not an enable.

Enabling from a GET, a site ping, or a hub Softwares click would be a bypass of QNM-BUILD-1.0. Full node process stays local `qnm-node/`.

Do not: auto-enable, invent a login mesh, add a Node Gate / IP panel.

FEATURE-STATE #1 (radios OFF), #3 (public auto-enable DISABLED).

## 2. QNS public proxy — OFF

`GET /v1/qns` cites QNS-CD-1.0 (photon QNS1 1.3; local `qnsd` on 127.0.0.1). The Worker does not emit, via, admit, wipe, or forward. `POST /v1/qns/via` and other mutate verbs return **403 `QNS-NO-PROXY`**.

A public via proxy would be a remote control plane over loopback photon vias. That is architecture-breaking.

Do not: proxy 127.0.0.1, add Softwares slug `qns` / `qnsd`, treat QNS as a FragGate engine.

FEATURE-STATE #2.

## 3. Vault/Custody destructive / hosted unlock — REFUSE / LOCAL-ONLY

Vault/Custody holds ARK + EmbryoLock (isolation label, not a second door).

**ARK** stub ops stay **REFUSE** on the public runtime: `scorch`, `wipe`, `unlock`, `encrypt`. Hosted ARK never unlocks a vault. Advisory `sweep` / `levels` / `health` / `skill` stay live.

**EmbryoLock** land (runtime 1.7.8) may take health / skill / doctor / policy / limitation / verify-hash **LIVE**. Destructive vault `wipe` / `scorch` / `unlock` / `unlock-after-fail` stay **LOCAL-ONLY** / `FG-STUB` on the public mesh — Never execute on the public mesh. This isolate does not run Argon2id or AES-GCM.

Do not: host ARK wipe/unlock/encrypt, invent unlock success, treat ARK as a kernel, or execute EmbryoLock wipe/scorch on the public mesh.

FEATURE-STATE #8 (ARK), #4 (EmbryoLock live-with-local-destructive-boundary).

## 4. WhistleLock send / mail / release — REFUSE

Stub ops: `send`, `mail`, `release`. Live ops are hash/canon preview only. WhistleLock is not a mailer and not a release valve.

Do not: send, mail, or release on the public mesh.

FEATURE-STATE #9.

## 5. MirageGrid VPN-hop / tunnel / mesh — REFUSE

Stub ops: `vpn-hop`, `hop`, `tunnel`, `mesh`. MirageGrid is not a VPN. GodLock and MirageGrid are not hop fabrics on this Worker.

Do not: stand up a public hop mesh.

FEATURE-STATE #10.

## 6. AzielTether VPN / arm / mesh-join — REFUSE

Stub ops: `vpn`, `arm`, `mesh-join`. AzielTether verifies; it does not arm a tunnel or join a mesh from the public door.

Do not: VPN, arm, or mesh-join on this Worker.

FEATURE-STATE #11.

## 7. VeilLock remote surveillance — REFUSE

Stub ops: `inject`, `intercept`, `facetime`. Public execution is `local_only` (FEATURE-STATE #6). VeilLock does not inject into FaceTime and does not intercept device media on the public mesh.

Do not: host inject / intercept / FaceTime hooks.

FEATURE-STATE #7.

## 8. AZ-OS exec / shell / lattice — REFUSE

Stub ops: `exec`, `shell`, `lattice`. AZ-OS status/health/skill are advisory. Hosted AZ-OS is not a remote shell and not a lattice controller.

Do not: exec, open a shell, or expose a lattice control plane.

FEATURE-STATE #12.

## 9. AZMail deanonymize — REFUSE

Stub ops include `deanonymize`, `unmask`, `identify`, `whois`, `harvest`, `credential_capture`, `login`, plus SMTP/send/mail/deliver. Anonymous mesh LIVE_OPS stay default OFF (FEATURE-STATE #22). SMTP is not implemented and must not be "finished" as a public MTA.

Do not: deanonymize, harvest credentials, or stand up SMTP.

FEATURE-STATE #21.

## 10. PeaceLock fabricate — REFUSE

Stub ops: `transcript`, `transcribe`, `motive`, `counterfactual`, `invent`, `waive-duty`, `bypass-duty`. Transcript / counterfactual / motive stay **ABSENT**. HARD_DUTY refuses a silence receipt when a non-waivable duty applies. PeaceLock is receipts, not speech.

Do not: invent what was said, score motive, or waive HARD_DUTY.

FEATURE-STATE #15.

## 11. 4DMap `truth_score` — REFUSE

`truth_score` / `truth` → `4DM-TRUTH-REFUSE`. 4DMap is a four-axis inspection frame T/Δ/Γ/Π (4DM-WP-1.0). It is not a sequential gate and not a truth authority.

Do not: emit a generic truth score as security authority.

FEATURE-STATE #16.

## 12. 4DMap `invent_mark` — REFUSE

Cards hold declared pins. 4DMap does not invent marks. Stub `invent_mark`. Motto: inspect on four axes; do not invent a mark.

Do not: synthesize pins, spans, or class marks the operator did not declare.

FEATURE-STATE #16.

## 13. 4DMap `backdate_class` — REFUSE

Stub `backdate_class`. RoseClock / TemporalLock stay forward. 4DMap does not rewrite Γ class in the past.

Do not: backdate class, rewind a walk, or stamp a prior axis as if it had always been so.

FEATURE-STATE #16.

## 14. AZBrowser Tor / phoenix wipe — REFUSE

Stub ops: `tor_exit`, `tor`, `onion`, `phoenix_wipe`, `wipe`, `scorch`, plus Chromium/proxy/harvest/surveillance verbs. AZBrowser is the Lamb Lens ethical research browser (AZB-1.0). Not a Tor exit. Not a phoenix controller. Not Chromium.

Do not: exit Tor, phoenix-wipe, or claim a visit that was not fetched.

FEATURE-STATE #17–18.

## 15. AZNet no payloads — OFF

AZNet is a silent verification side-net (AZN-WP-0.1). Stub `payload_host`, `serve_content_for_peer`, `analytics`, `ranking`, `repair_integrity_bypass`. Pairing with AZBrowser is order/token only — not a shared payload host.

Do not: host peer content, rank, or bypass integrity repair.

FEATURE-STATE #25.

## 16. AZHub auto-unlock — OFF

AZHub is a Blank Key / neutral spatial container (AIH-WP-1.0). `auto_unlock` / `unlock` / completeness / ranking / remote scorch refuse (`AIH-AUTO-UNLOCK-REFUSE`, `AIH-COMPLETENESS-REFUSE`, `AIH-RANKING-REFUSE`, `AIH-SCORCH-REFUSE`). Hub never interprets meaning and never fires completeness.

Do not: auto-unlock, rank, or scorch remote from Hub.

FEATURE-STATE #27.

## 17. AZInterface auto-unlock — OFF

AZInterface page cycles are pre-locked: OFF / integrity / ON / FULL SHUTDOWN / MEMORIAL. No skip. No invented cycle. Same auto-unlock / completeness / ranking / remote-scorch refuse family as Hub. Integrity recorded does not auto-unlock to ON.

Do not: invent or skip a cycle; do not auto-unlock Interface.

FEATURE-STATE #28.

## 18. Public rollback API — OFF

`POST /v1/rollback` and `POST /v1/roseclock/rollback` are **404**. There is no public rewind surface. Recovery language is forward `action_class` only (restore / correct / quarantine as new transitions).

Do not: add a public rollback route.

FEATURE-STATE #31.

## 19. RoseClock rollback — OFF

RoseClock sequence never decreases. Stamps carry `rollback: false`. `rollback()` returns `refuse: rollback-forbidden`. Memory `op=rollback` is `FG-STUB`. Sentinel carries `rollback: false`.

Do not: rewind RoseClock, TemporalLock, or ChainLock history.

FEATURE-STATE #32.

## 20. LambGate is not a second door — OFF

MASTER-33: FragGate is THE single door. Lamb Lens is fabric ethics **after** FragGate (`lambgate=false`, `fraggate_single_door=true`). PASS / REFUSE / HOLD-UNCERTAIN. Absolute prohibitions refuse (`FG-LAMB-REFUSE`). LambGate is not a hop and not a Softwares-tab product.

Do not: put Lamb Lens before FragGate, add a LambGate slug, or treat ethics as a second door.

FEATURE-STATE #33.

## 21. AZPIPE is not a Softwares-tab slug — OFF

AZPIPE (AP-WP-0.2, magic FLD3) is LIVE fabric. fld3-wire is internal. There is no Softwares-tab card `azpipe`. Domains after AZPIPE are isolation labels, not extra pipes.

Do not: add slug `azpipe` to `/v1/software`.

FEATURE-STATE #36.

## 22. `/v1/azpipe/arch` does not mutate — OFF

`GET` / `HEAD` / `POST /v1/azpipe/arch` cites the locked MASTER-33 strip (same payload as `GET /v1/fraggate` `pipeline`). `cite=true`, `software_tab=false`, `fraggate_slug=false`. Other `/v1/azpipe/*` paths 404 with a hint to `/arch`. No mutate. No mesh enable. No new door.

Do not: accept arch writes, reorder hops, or treat `/arch` as exec.

FEATURE-STATE #37.

## 23. AKM is not a Softwares-tab door — OFF

AKM-TRIAD-1.0 is LIVE fabric behind FragGate (`POST /v1/memory/*`, MCP `memory_*`, `slug=memory`). Not a Softwares-tab product. ChainLock remains the immutable ledger; the adaptive index is derived and rebuildable.

Do not: add `memory` / `akm` to the Softwares-tab.

FEATURE-STATE #38.

## 24. AKM `rebuild-index` is operator-gated — GATED

`POST /v1/memory/rebuild-index` without an operator token is **`AKM-OPERATOR`**. Public observe/resolve/calibrate/recall stay on the FragGate door. Rebuild is not a public self-grant.

Do not: invent a token bypass or make rebuild public.

FEATURE-STATE #39.

## 25. Posterior never authorizes — OFF

Bayesian posterior is calibrated belief strength, not truth. Triad assembly sets `authorizes_action=false`. No AI component self-grants `MODEL_UPDATE`, `TRUST_UPDATE`, `NETWORK_EGRESS`, `MESSAGE_SEND`, or `LOCAL_EXEC` from a posterior.

Do not: treat triad/posterior as permission to act.

FEATURE-STATE #40.

## 26. Unauthenticated session mutate — OFF

When `REQUIRE_TOKEN=1` and `RUNTIME_TOKEN` is set, session open/policy/exec/close and MCP session tools / `runtime_run` require `Authorization: Bearer` or `X-Aziel-Runtime-Token`. Missing secret fail-closes ready (503). Catalog / health / skill / FragGate list stay public. Proxy `/p` stays public and is not exec.

Do not: leave session mutate open in production, or invent per-user logins.

FEATURE-STATE #41.

## 27. Hallucinated-tool fallback — REFUSE

Unknown slug (example: `zd30`) → **`FG-HALLUC-TOOL`**. Flat leftover `{slug}_{op}` names are not in `tools/list`. That is hallucination with a receipt, not exec.

Do not: invent ZD30, add a compatibility exec for hallucinated names, or return a fake 200.

FEATURE-STATE #42.

## 28. Destructive / fantasy fallback — REFUSE

Named stub verbs (scorch / wipe / send / vpn / inject / blend / exec / unlock fantasies) return **`FG-STUB`** or the engine's named refuse. That includes **ARK** `scorch` / `wipe` / `unlock` / `encrypt` and **EmbryoLock** public-mesh `wipe` / `scorch` / `unlock` / `unlock-after-fail`. DecisionGATE BLOCK / Lamb REFUSE / SweepGate isolate close at the hop. No handler means no exec.

Do not: map a stub to a live op "for completeness." Completeness is not a reason to enable.

FEATURE-STATE #43.

## 29. Thin MCP — GATED

Public door is discover / route / refuse: `fraggate_list` → `fraggate_describe` → `fraggate_call`. Named fabric tools (`mesh_*`, `chainlock_*`, `memory_*`) are listed; the 1.5.0 flat pile is not. `PUBLIC_MCP_TOOL_MAX` is a cap, not a dump target. Refuse `exist.mcp` points at live `tools/list`.

Do not: restore the flat `{slug}_{op}` tools/list.

FEATURE-STATE #44.

## 30. `/p/{slug}/{op}` is not the default agent path — OFF

`GET`/`POST /p/{slug}/{op}` is a **proxy**. Proxy without a session receipt is **not** exec. Agents use FragGate (`POST /v1/fraggate/call` / MCP `fraggate_call`). `/p` remains for catalog cards, human crawl, and service-binding front doors.

Do not: teach agents that `/p` is exec, or make proxy the default path.

FEATURE-STATE #46.

## 31. FragGate is not a catalog engine — OFF

FragGate is THE single door (kernel `https://github.com/AzielEliab/fraggate`, FG-0.1). It appears on `catalog.extras[]`, not as a Softwares-tab engine (`engine=false`). Every catalog slug that is live is a true engine **behind** FragGate — FragGate itself is not one of the 33.

Do not: add FragGate as a Softwares-tab product or a second door.

FEATURE-STATE #47.

## 32. Mesh is not a catalog engine — OFF

Mesh is the QNM-BUILD-1.0 suite rollup extra (`kind=kernel`). Not a Softwares-tab card. Not a normal catalog engine. FragGate `slug=mesh` is the rollup/enable surface with radios default OFF.

Do not: promote mesh to Softwares-tab or treat GET mesh as a product engine.

FEATURE-STATE #48.

## 33. Eleven domains are not doors — OFF

MASTER-33 Internal Domain Layer: 11 domains / 33 softwares are **isolation labels**. `/v1/software.domains.domains_are_doors=false`. Softwares stay on the Softwares-tab with `domain` + `domain_id`. Placements (AZInterface, DecisionGATE, ForgeReceipts, FragGate, mesh, memory) are not extra doors.

Do not: add per-domain public doors, or treat a domain as a FragGate slug.

FEATURE-STATE #49.

---

## What this paper is not

- Not a gap list. Gaps live in FEATURE-STATE (NOT IMPLEMENTED / PARTIAL / STUB-being-landed).
- Not permission to enable EmbryoLock wipe/scorch/unlock on the public mesh (FEATURE-STATE #4 — 1.7.8 land is live-with-local-destructive-boundary only; health/skill/doctor/policy may be LIVE).
- Not permission to promote AZChat (FEATURE-STATE #5).
- Not a Softwares-tab product, not a FragGate slug, not a fleet-completeness claim.
- Not a deploy. This ingest is cite-only.

## Do not do from this paper

Do not enable mesh from GET. Do not proxy QNS. Do not host ARK unlock / wipe / encrypt. Do not execute EmbryoLock wipe / scorch on the public mesh. Do not host WhistleLock send, MirageGrid hop, Tether VPN, VeilLock inject, AZ-OS exec, AZMail deanonymize, PeaceLock fabricate, 4DMap truth/invent/backdate, AZBrowser Tor/phoenix, or AZNet payloads. Do not auto-unlock Hub or Interface. Do not add rollback. Do not add LambGate. Do not put AZPIPE or AKM on the Softwares-tab. Do not let posterior authorize. Do not dump flat MCP. Do not make `/p` exec. Do not make FragGate, Mesh, or the 11 domains into extra doors.

---

Cite: Eliab, Aziel. (2026). REMAIN-OFF-BY-DESIGN-2026-09-10 [Design]. https://github.com/AzielEliab/aziel-runtime/blob/main/docs/designs/REMAIN-OFF-BY-DESIGN-2026-09-10.md

Companion: Eliab, Aziel. (2026). FEATURE-STATE-2026-09-10 [Audit]. https://github.com/AzielEliab/aziel-runtime/blob/main/docs/audit/FEATURE-STATE-2026-09-10.md
