# AZIEL RUNTIME — Disabled, Off, Stubbed, Gated & Not-Yet-Implemented Feature Audit

**Baseline:** aziel-runtime **1.7.3** (authoritative for 1.7.3+)  
**Date:** 2026-09-10  
**Repo:** [AzielEliab/aziel-runtime](https://github.com/AzielEliab/aziel-runtime)  
**Author / identity:** **Aziel Eliab** only  

**Binary:** `docs/audit/FEATURE-STATE-2026-09-10.pdf` (same inventory; original binary was provided to GitBaby as `FEATURE-STATE-2026-09-10.pdf`). This markdown is the cite-surface source of truth.

Companions (same day; different scope):

- `docs/audit/RUNTIME-AUDIT-2026-09-10.md` — deployed 1.6.13 (pre-lattice)
- `docs/audit/RUNTIME-AUDIT-2026-09-10-MASTER33.md` — deployed 1.7.1
- `docs/audit/RUNTIME-AUDIT-2026-09-10-FULL.md` — deployed 1.7.2

This file is the **authoritative intentional-OFF vs gaps inventory** for **1.7.3+**. It is an audit, not a Softwares-tab product and not a FragGate slug. Do not enable mesh or safety stubs from this document. Do not deploy from the PR that lands it.

---

## How to read the states

| State | Meaning |
| --- | --- |
| **OFF / DISABLED** | Named surface exists and stays off (default or by law). |
| **STUB** | Named verb refuses (`FG-STUB`). Not silent success. |
| **LOCAL ONLY / GATED** | Named, but not live on the public mesh / requires operator or local process. |
| **NOT IMPLEMENTED** | Expected product behavior is absent on this Worker. |
| **PARTIAL / FALLBACK** | Some door exists; design not fully admitted (proxy / binding / subset). |

**Intentional OFF** (security / architecture) must stay. **Gaps** are unfinished networking, external action, stubs that are product-incomplete, and distribution — not a license to flip radios or host destructive vaults.

---

## Bottom line

Most catalog Software is wired in-process. Unfinished work concentrates in networking, external action, named stubs, and distribution. Security and architecture intentional OFF must stay. Identity **Aziel Eliab** only.

---

## Inventory (50)

### Networking / mesh / signal

| # | Item | State | Class | Note |
| --- | --- | --- | --- | --- |
| 1 | QNM / Node Mesh radios | **OFF** (default) | intentional OFF | `GET /v1/mesh` `enabled: false`. Default radios/bearers off. Operator enable requires a declared bearer. Full node is local `qnm-node/`. |
| 2 | QNS proxying | **OFF** | intentional OFF | `GET /v1/qns` cites only. `POST /v1/qns/via` → `QNS-NO-PROXY`. Local `qnsd` in qnm-node; Worker does not emit. |
| 3 | Public mesh auto-enable | **DISABLED** | intentional OFF | GET never enables. Empty POST enable → `MESH-NEED-BEARER`. Login-named bearer → `MESH-BAD-BEARER`. Library `/runtime` may 409 overlay; radios stay OFF. |

### Named stubs / local-only products

| # | Item | State | Class | Note |
| --- | --- | --- | --- | --- |
| 4 | EmbryoLock | **STUB** | transition | Name-only / local-not-hosted at PR time (`FG-STUB` on unlock). **Parallel land:** live-with-local-destructive-boundary (Vault/Custody; destructive ops stay local-only). Do not treat this audit as promoting a public wipe/unlock engine. See [EmbryoLock transition](#embryolock-transition). |
| 5 | AZChat | **STUB** | intentional OFF | Name-only. Product does not exist yet. `FG-STUB`. Do not invent a fake engine. |
| 6 | VeilLock public execution | **LOCAL ONLY** | intentional OFF | Catalog card may read live; FragGate registry is `local_only`. Public mesh does not exec. |
| 7 | VeilLock inject / intercept / facetime | **STUB** | intentional OFF | Device-inject fantasies refuse. SEC-FEAT law. |

### Product stub verbs (named refuse)

| # | Item | State | Class | Note |
| --- | --- | --- | --- | --- |
| 8 | ARK scorch / wipe / unlock / encrypt | **STUB** | intentional OFF | Hosted vault never unlocks. |
| 9 | WhistleLock send / mail / release | **STUB** | intentional OFF | Not a mailer. |
| 10 | MirageGrid VPN-hop / hop / tunnel / mesh | **STUB** | intentional OFF | Not a VPN. |
| 11 | AzielTether mesh-join / vpn / arm | **STUB** | intentional OFF | Not a VPN. |
| 12 | AZ-OS exec / shell | **STUB** | intentional OFF | `lattice` also stub. Session/exec/lattice stay binding-only proxy_fallback. |
| 13 | AZAI blend / complete / chat | **STUB** | intentional OFF | Hosted AZAI is protocol mirror + Lamb check, not the local blend. |
| 14 | EmployeeLock court / judge | **STUB** | intentional OFF | Not a court. |
| 15 | PeaceLock transcript / motive / etc. | **STUB** | intentional OFF | `transcript`, `transcribe`, `motive`, `counterfactual`, `invent`, `waive-duty`, `bypass-duty`. HARD_DUTY stays. |
| 16 | 4DMap truth_score / lumen_panel / invent_mark / backdate_class | **STUB** | intentional OFF | Inspection frame only. Not a sequential gate and not an extra door. |

### AZBrowser / AZMail / stores

| # | Item | State | Class | Note |
| --- | --- | --- | --- | --- |
| 17 | AZBrowser tor_exit | **STUB** | intentional OFF | Also `tor` / `onion`. Not a Tor exit. |
| 18 | AZBrowser phoenix_wipe | **STUB** | intentional OFF | Also `wipe` / `scorch`. Not a hosted phoenix wipe. |
| 19 | AZBrowser Chromium | **NOT IMPLEMENTED** | gap (must stay absent) | Not Chromium. `chromium` / `playwright` / `puppeteer` / unrestricted proxy stay stub. |
| 20 | AZMail SMTP | **NOT IMPLEMENTED** | intentional OFF | Not a full internet MTA. `smtp` / `smtp_send` / `send` / `deliver` / `imap` / `pop3` / `mx` refuse. |
| 21 | AZMail deanonymization | **STUB** | intentional OFF | `deanonymize` / `unmask` / `identify` / `whois` / `harvest` / `login` / `credential_capture`. |
| 22 | AZMail anonymous mesh | **OFF** (default) | intentional OFF | Product-local `mesh_*` default off. Not the suite QNM rollup. |
| 23 | TrajectoryLock media store | **NOT IMPLEMENTED** | intentional OFF | Hosted API never stores media. |
| 24 | WhistleLock file store | **NOT IMPLEMENTED** | intentional OFF | Hash/canon preview only. No hosted file locker. |

### AZNet / Hub / Interface

| # | Item | State | Class | Note |
| --- | --- | --- | --- | --- |
| 25 | AZNet payload hosting | **DISABLED BY DESIGN** | intentional OFF | `payload_host` / `serve_content_for_peer` stub. Silent verification side-net. |
| 26 | AZNet unpaired privileged ops | **CONDITIONALLY OFF** | gated | Garden / stamp / memorial require AZBrowser `pair_token` **and** `pair_flag`. |
| 27 | AZHub auto-unlock | **OFF** | intentional OFF | `auto_unlock` / `unlock` / `completeness_detect` / `scorch_remote` stub. Blank Key. |
| 28 | AZInterface page cycles | **PRE-LOCKED** | intentional OFF | Cycles: OFF / integrity / ON / FULL SHUTDOWN / MEMORIAL. `skip_cycle` / `invent_cycle` stub. |

### Exec completeness / rollback / pipeline extras

| # | Item | State | Class | Note |
| --- | --- | --- | --- | --- |
| 29 | Corpus D1 / Whisper / OCR | **PARTIAL / PROXY** | gap | Binding-only `proxy_fallback` on Aziel Digital Library live ops. Isolate is still the jail. |
| 30 | Universal local execution | **NOT COMPLETE** | gap | Per-op proxy_fallback remains for AZ-OS session/exec/lattice and library bindings. |
| 31 | Public rollback | **OFF** | intentional OFF | `/v1/rollback` 404. Memory `rollback` → `FG-STUB`. |
| 32 | RoseClock rollback | **OFF** | intentional OFF | Forward-only. `/v1/roseclock/rollback` 404. Envelope stamps `rollback: false`. |
| 33 | LambGate | **OFF** (not a hop) | intentional OFF | Lamb Lens is fabric **after** FragGate. LambGate is not on MASTER-33. |
| 34 | ASE | **OPTIONAL** | gated | Cite + refuse until armed. Not a Softwares-tab door. |
| 35 | ZD30 | **ABSENT** | intentional OFF | `describe?slug=zd30` → `FG-HALLUC-TOOL`. Do not add it. |
| 36 | AZPIPE public engine | **DISABLED** | intentional OFF | `describe?slug=azpipe` → `FG-HALLUC-TOOL`. Cite/read only: `GET /v1/azpipe/arch`. |
| 37 | AZPIPE mutation | **OFF** | intentional OFF | Arch POST is the same read. No mutate. Unknown `/v1/azpipe/*` 404. |

### Memory / session / door law

| # | Item | State | Class | Note |
| --- | --- | --- | --- | --- |
| 38 | AKM Softwares-tab | **DISABLED BY DESIGN** | intentional OFF | AKM-TRIAD is **live fabric** behind FragGate (`memory_*`, `POST /v1/memory/*`). Not a tab slug. |
| 39 | AKM rebuild-index | **OPERATOR-GATED** | gated | `AKM-OPERATOR`. No invented token bypass. |
| 40 | Memory posterior authorizes action | **OFF** | intentional OFF | Posterior ≠ truth. `authorizes_action=false`. `model_update` / `rewrite` / `delete_history` / `auto_update` stub. |
| 41 | Unauth session mutate | **OFF** in prod | gated | `REQUIRE_TOKEN=1` + `RUNTIME_TOKEN`: session open/policy/exec/close 401 without bearer. **Public FragGate call stays open.** |
| 42 | Unknown tools | **REFUSE** | intentional OFF | `FG-HALLUC-TOOL`. Flat `{slug}_{op}` not in `tools/list`. |
| 43 | Destructive / fantasy ops | **REFUSE** | intentional OFF | Named `STUB_OPS` (scorch / wipe / vpn / hop / inject / blend / exec / …). Not silent 200. |
| 44 | Full internal MCP | **LIMITED** | partial | Thin door + named fabric (`mesh_*`, `chainlock_*`, `memory_*`, session). Advanced session / `runtime_run` are internal. |
| 45 | Complete OpenAPI | **INCOMPLETE** | gap | Live paths omit some dual-surface doors (`/`, `/openapi.json`, `/p/{product}/{op}` proxy). `POST /mcp` is listed (1.7.3). |
| 46 | `/p` default agent path | **OFF BY DESIGN** | intentional OFF | `/p/{slug}/{op}` is proxy, not exec. Agents use FragGate `list → describe → call`. |
| 47 | FragGate as catalog engine | **OFF** | intentional OFF | Kernel extra (`kind: kernel`, `engine: false`). Not a Softwares-tab slug. |
| 48 | Node Mesh as normal catalog engine | **OFF** | intentional OFF | Kernel extra. `digest: null`. Not a Softwares-tab product. |
| 49 | Per-domain public doors | **OFF** | intentional OFF | 11 domains / 33 isolation softwares are **labels**, not doors (`domains_are_doors: false`). |
| 50 | Zenodo live publication | **INACTIVE** | gap | `/cite.json` `software_deposit_needed`. Do not invent DOIs. |

---

## EmbryoLock transition

**At PR time (this ingest):** EmbryoLock remains a **named stub** / local-not-hosted registry entry. `fraggate_describe?slug=embryolock` is stub. `fraggate_call` unlock → `FG-STUB`. Not a hosted Worker. Not a FragGate engine.

**Parallel land (do not wait on, do not enable here):** EmbryoLock is being landed as **live-with-local-destructive-boundary** — Vault/Custody isolation, public door may become a true engine for non-destructive describe/health-class ops, while scorch / wipe / unlock / encrypt stay **local-only**. This audit does **not** flip that land. When that PR merges, update item 4 from STUB → LIVE (local destructive boundary) and keep items 8 / 43 as the vault refuse law.

Do not host EmbryoLock wipe on the public mesh. Do not treat “live” as “hosted unlock.”

---

## Intentional OFF that must stay

Do not “fix” this inventory by enabling:

- Mesh radios from GET, from the library 409 overlay, or from a login-named bearer
- QNS public via proxy
- Public rollback / RoseClock rewind
- ZD30
- AZChat as an engine
- AZPIPE / AKM / Lamb Lens / SweepGate as Softwares-tab slugs
- Hosted vault unlock / wipe (ARK, EmbryoLock)
- VPN / hop / Tor exit / payload host / SMTP / deanonymize
- Node Gate / IP panel
- Per-domain public doors
- Posterior-as-truth or automatic model update

Those are law, not gaps.

---

## Gaps (unfinished, not a flip-the-switch list)

- Binding-only library D1 / Whisper / OCR and AZ-OS session/exec/lattice (`proxy_fallback`)
- OpenAPI holes for homepage / proxy
- Zenodo software deposits (do not invent DOIs)
- AZBrowser is not Chromium (must stay absent on this door)
- EmbryoLock parallel land is a **bounded** engine, not a public destructive vault

---

## Cite

Eliab, Aziel. (2026). FEATURE-STATE-2026-09-10 [Audit]. https://github.com/AzielEliab/aziel-runtime/blob/main/docs/audit/FEATURE-STATE-2026-09-10.md

PDF: https://github.com/AzielEliab/aziel-runtime/blob/main/docs/audit/FEATURE-STATE-2026-09-10.pdf

Machine-readable pointer: `/cite.json` `audits.feature_state`. Skill / `/llms.txt` name this inventory briefly. Not a Softwares-tab product. Not a FragGate slug. `GET /v1/mesh` never enables.

Author: **Aziel Eliab** only.
