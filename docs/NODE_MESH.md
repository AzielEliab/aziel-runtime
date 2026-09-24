# Quantum Node Mesh (QNM-BUILD-1.0)

**Aziel Eliab Runtime** exposes a **suite QNM rollup** on `/v1/mesh`.

This is the public companion surface to **AIH-WP-1.1**. Parent will roll the full local `qnm-node/` package next. **This runtime must not invent a login mesh.**

Public identity: **Aziel Eliab** only.

## Design papers (cross-link only)

Current software designs live in [docs/designs/](designs/). Author: **Aziel Eliab** only.

- [QNM-WP-1.0](designs/QNM-WP-1.0.md) — Quantum Node Mesh fabric (local process ON / public rollup)
- [NODE-OPS-1.0](designs/NODE-OPS-1.0.md) — Node operations + surface law + phoenix wait/re-seal (not public hostname resurrection)
- [SEC-FEAT-1.0](designs/SEC-FEAT-1.0.md) — Security feature inventory (door, stubs, vault, fabric)
- [QNS-CD-1.0](designs/QNS-CD-1.0.md) — Quantum Node Signal packet-transfer coding design (photon QNS1 1.3; local `qnsd`; Worker cites only)
- [QNM-CHANNEL-PLANE-1.0](designs/QNM-CHANNEL-PLANE-1.0.md) — channel plane cites (wifi / bluetooth / rf / photon ON). Channel plane ≠ kernel VPN. Public VPN auto-binds [AZVPN](designs/AZVPN-CONCENTRATOR-1.0.md). Pairing ≠ tunnel.
- [CROSS-NETWORK-SURVIVAL-1.0](designs/CROSS-NETWORK-SURVIVAL-1.0.md) — umbrella survival law (if network and data die tomorrow, the chain survives on cold shelves — hosts / DOI / git / vault)
- [NO-LIE-NO-REWRITE-1.0](designs/NO-LIE-NO-REWRITE-1.0.md) — receipts that still hash; no rewrite key; never lie to survive (companion under the umbrella; does not replace the machine tip)
- [COLD-MULTI-SHELF-1.0](designs/COLD-MULTI-SHELF-1.0.md) — planes A/B/C matching live corpus `/shelves` (corpus#96); runtime cites, does not invent a sixth surface
- [BAN-SURVIVAL-1.0](designs/BAN-SURVIVAL-1.0.md) — three layers: live multi-front ↔ cold shelves; live-node API SLOT; Cap-7 factory duplication cite LIVE + AZNet verify LIVE (standard internet does not reach Cap-7; update shuffle ping→land)
- [SPORE-1.0](designs/SPORE-1.0.md) — last-resort failsafe: pause / preserve / wait / physical-wipe-only; does not replace cold shelves; no pretend-live metabolism while dormant

This page remains the live **QNM-BUILD-1.0** rollup law. Do not rewrite that law from the papers.

## Law (must not violate)

- **Bulletproof:** local modules run radios off; receipts to disk; poison refused not interpreted; tamper isolates; **PHOENIX-LOCK waits locally** (no controller hunt); wait / re-seal after poison or isolation (**not public hostname resurrection**; Phoenix does not restore godlock.uk); tethers drop clean (**no implicit heal**); **no account resurrection**; **anon-broadcast is never a publish path**.
- **Die with the pull:** Cloudflare Tunnel lives on a token, a DNS name, and an account. Pull the site, revoke the token, drop the Worker, or kill DNS and cloudflared has nowhere legal to land. A process supervisor restarting cloudflared is operator kit, not the public contract; it fails if credential or hostname is gone.
- **Sites pulled → public rollup on that hostname down.** Local node may keep verifying/appending. Mesh does not climb back onto the public hostname by itself.
- **Split the wires:** Fast 0.5–1s tick is **presence + tip hash only**. Fixed-size. No body, no diff, no “also here’s the file.” Payload lives on a **second plane the receiver pulls**, never a push the sender fans out. Update is a **proof, not a timer**. Receiver already holds prev and the lockset. New tip must cite that prev, match the lockset rule, and verify fail-closed. **777s is dwell after a valid cite**, not “wait then take whatever arrived.” Clock desync is not a yes. Ambiguous tip is isolate, not merge. Same prev + two different tips from one node → that node is locked/isolated. No vote-to-reconcile. Quorum cannot outvote a broken hash. Majority is not truth. A node may announce a tip only after its own verify passes. Phoenix is local reboot/WAIT for the failed node. Neighbors do not phoenix because a neighbor phoenix’d. No unsend, so nothing leaving the box is an unverified body. Split brain: each island keeps its own chain; they do not auto-splice on reconnect. Rejoin is cite + human/operator or lockset gate, same as first ingest. Heartbeat loss ≠ poison. Heartbeat loss ≠ “apply last packet.” The 1s loop and the 777s gate stay strangers. Anything less is a delayed epidemic.
- **Cold-copy survival:** Multiply cold copies. Refuse live body sync across the network. A tip is content-addressed and expensive to erase. A single-server pull kills that named hostname (die-with-the-pull); it does not kill vaults that already hold the hashes. Local verify/append continues. Data outlives creators. Hash-absolute poison refuse: equivocation isolates that peer, not the chain. Payloads are pull-only and cold. Named hosts only.
- **Re-expand-from-archive:** Bytes survive, not summaries. Re-expand restores from archive after prev-hash verify. Not mesh from index. Crawlers are extra shelves only. Training residue is rumor.
- **REHEAL:** Isolation is the cure. A poisoned node heals from its own last good tip + a verified trusted pull, or phoenix-WAIT — never by listening to neighbors. Allowed: live / locked / isolated / tip-hash. Forbidden: bodies / diffs / vote-to-fix. Neighbor talk-back-to-health is a group hug over a wound.
- **CROSS-NETWORK-SURVIVAL-1.0:** If network and data die tomorrow, the chain survives on cold shelves (hosts / DOI / git / vault). Under that sentence: die-with-the-pull, split-the-wires, cold-copy survival, ingest-as-receipt, re-expand-from-archive, REHEAL. The live mesh is not a shelf. Machine tip: `CROSS-NETWORK-SURVIVAL-1.0: someone still has bytes that match the published tip — not a living network, not LLM memory, not a public hostname that still answers.` Named hosts only. No unmarked hydra. No VPN concealment kit. No visible 15:20 chrome.
- **Ingest-as-receipt:** Crawlers get hash + “cite, don’t merge.” Many indexes, one tip. ACT-RECEIPT-1.0 is the public four-field companion.
- **azieleliab.com** hosts published software/runtime — **not** login-recovery, **not** IP panel, **not** upload proxy. `node_gate` / `get_is_node_gate` are operator-armed public mesh cites (2026-09-17), not a login-recovery panel.
- Suite public surface may expose mesh **rollup only**: **live / locked / isolated** counts. No average-of-nodes leaderboard. **Views / MCP / downloads do not enter QNM-S.**
- **Default:** read-only **suite-presence is ON** (bearer `suite-presence`). A site ping of `GET /v1/mesh` never enables radios beyond that read-only presence. Do not require `POST /v1/mesh/enable` for public Live Nodes.
- **Public disable of suite-presence is refused.** `POST /v1/mesh/disable` and suite `mesh_disable` refuse `MESH-DISABLE-REFUSED`. They cannot turn suite-presence off. AZMail `mesh_disable` stays a separate product-local mail ring.
- **Public Nodes (`nodes` / `rollup.nodes`):** **human mesh users + cited human uses**. This is today’s interaction-inclusive clock (same math as `live_nodes` before the Nodes / Live Nodes split). **`human_uses`** is the USES interaction counter (no PII; peek `total` only — never a full `/v1/uses` walk on this path). Uses are counters, not unique people. Incomplete or unbound telemetry is reported honestly (`0` + `human_uses_complete: false`). Short UI label is **Nodes**. Zero is honest.
- **Public Live Nodes (`live_nodes` / `rollup.mesh`):** **human mesh users + concurrent website viewers**. Counted humans are join/heartbeat/presence rows with a **human bearer** (`kind=human`, `bearer=human`, or auto-minted `mesh_*`). **`site_live_viewers`** is fleet human page presence across **godlock.uk + azieleliab.com + azielcorpuslibrary.net**, reported by hub `POST /v1/mesh/site-presence` (`kind: "human-page"`, 5-minute TTL). The three host rows live in **one KV aggregate**. `GET /v1/mesh` reads that key once, prunes expired rows to **0**, and sets `live_nodes = human_mesh_users + site_live_viewers`. `live_nodes_generation` bumps only when a stored viewer count changes. `live_nodes_tip` is `generation:human_mesh_users:host=count,...` for the numbers in **this** JSON. Isolated humans stay on `isolated_nodes`. **Exclude** hedidntjump.com, bots, Softwares, and downloads. `GET /v1/mesh` **never pulls** hub `/count`. Roster fan-out does **not** rewrite the aggregate (a stale full-state save was dropping in-flight heartbeats). Missing or expired hub heartbeats are **0**. Short UI label is **Live Nodes**. **Do not invent users or viewers.** Zero is honest when no human is present. Hubs **paint `live_nodes` / `rollup.mesh` only** (same number). Never paint `software_nodes` or `rollup.live` as Live Nodes. Do not add a local `/count` and do not re-sum components with a private viewer. Same `live_nodes_tip` means the same Live Nodes inputs. A different tip is a different seal or a different human-roster read, not a second formula. KV may deliver an older seal to another colo for a short time; that older number is a real prior seal. **`rollup.live` is not published.** It used to be every roster row with `presence=live`. After `{slug}-worker` fan-out that number matched `software_nodes` (~the Softwares roster) and hub chrome treated it as Live Nodes. Roster presence=live is **`rollup.all.live`** (and `rollup.active`). Softwares presence=live is **`rollup.software.live`**. Neither is the pill. `rollup.public_live_nodes` is `"mesh"`.
- **`software_nodes` / `rollup.software`:** while suite-presence is LIVE, this Worker fans out `join` / `heartbeat` for every live Softwares product Worker (`node_id` `{slug}-worker`, no `|`) on cron (`*/2 * * * *`) or request-path. Presence TTL is **5 minutes**. GET still never enables extra radios. That roster is **software_nodes** (plus `software_live_nodes` / `software_locked_nodes` / `software_isolated_nodes`). Downloaded Softwares instances stay **`instance_nodes`**. Hubs may cite `software_nodes` separately. `software_nodes` stays on its own plane.
- **`mesh_join` contract:** `product` is required (catalog slug). Optional `node_id` must be exactly **8–80** chars matching **`[a-z0-9._-]+`** (full string; no uppercase). `presence` must be **`live`** (default), **`locked`**, or **`isolated`**. Join creates **additive** presence bound to a **strict 5-minute TTL**. `mesh_heartbeat` (or suite fan-out refresh) resets that window. Miss it and the node is **automatically dropped** from the live roster. Direct HTTP join/heartbeat/leave/broadcast share F03 kind **`mesh_mutate`** (30/min, `RATE_LIMIT` 429). Not a login mesh. Roster does not publish exec URLs. `MESH-ROSTER-FULL` if a new anonymous join would evict `{slug}-worker`. When transmission radios are powered down or suite radios are not enabled, join/heartbeat/broadcast refuse **`MESH-OFF`** (same code on HTTP and MCP). Read paths stay honest. Public `mesh_disable` still cannot turn suite-presence off. `neighbor_heal` is an operator-armed **cite** (`neighbor_heal_is_cite: true`, `neighbor_heal_exec: false`). Vote-to-fix still refuses.
- **NO-LIE / NO-REWRITE:** receipts that still hash; copies not all on one tunnel; rules simple enough others verify without the author's voice; **no rewrite key**. The network is **never allowed to lie** — even to self-preserve, sustain, stay alive, adapt, or prevent death. `GET /v1/mesh` cites `no_lie`, `no_rewrite`, `rewrite_key: false`, `lie_to_survive: false`. Rewrite / lie verbs refuse `MESH-NO-REWRITE` / `MESH-NO-LIE`. Companion under [CROSS-NETWORK-SURVIVAL-1.0](designs/CROSS-NETWORK-SURVIVAL-1.0.md); does not replace the machine tip.
- **Cap-7 semantic bridge:** MirageGrid auto-generates `.az` duplications of the four hub sites and shifts them with StaticLock (catalog product StaticClock, slug `staticclock`) and MirageGrid cloak, paired with AZVPN. Real duplications: `azgrid`, `azcloak`, `azvault`, `azshift`. False sites: `azbooth`, `azflag`, `azstandby`. `resolves_to_hub: false` on Cap-7. Standard internet does not reach Cap-7. Internet reaches the AZ domains through the four hub HTTPS links (`public_icann: true`, `resolves_to_hub: true`, shuffle once, stand alone, immutable after hubs go down, live-node anchor). Factory duplication cite is LIVE. Not a fifth product. `GET /v1/mesh/az-generator` and MirageGrid Worker `/bridge` are the cite. No ICANN `.az` ccTLD purchase. No visible 15:20. `GET /v1/mesh` never enables radios. AZNet + AZBrowser browse the mesh via FragGate.
- **COLD-MULTI-SHELF-1.0:** `GET /shelves` cites live corpus `/shelves` (corpus#96). Plane A = 5 published surfaces / 2 family radii / 1 independent live (`cf-github`). Plane B is alt-forge SLOT (Codeberg + archive.org hash-verify PASS still SLOT at https://archive.org/details/aziel-lockset-tip + https://archive.org/details/aziel-lockset-tip_202609, same blast_radius; Framagit URL null Zenodo tip-pack SLOT `CNS-ZENODO-NOT-LIVE`; `doi` null). Plane C USB SLOT until `CNS-OPERATOR-ATTEST`. This Worker is the same Plane A tunnel, not a sixth surface. Paper: [COLD-MULTI-SHELF-1.0](designs/COLD-MULTI-SHELF-1.0.md).
- **BAN-SURVIVAL-1.0:** one banned public door (`workers.dev`, `/mcp`, a FragGate path) is a surface death, not last tip gone. Three layers: live multi-front ↔ cold shelves; live-node API SLOT until attest; Cap-7 cite + AZNet verify LIVE (factory duplication cite LIVE; standard internet does not reach Cap-7; AZ domains via hub HTTPS; AZNet never hosts payloads). Cap-7 update shuffle: ping MirageGrid until one distinct-name site lands (factory land LIVE; 3 of 7 false sites; no hardcoded host). AKM-TRIAD: `belief_is_not_truth`; append-only `memory_get`; additive `memory_resolve`. Calling-name rotation is discovery-only (`*new name alert:` pull from `GET /v1/mesh` and `/survival`; GET never enables; open-ended + random; rewrite all live discovery metadata). Never invent a live door. `GET /survival`. Paper: [BAN-SURVIVAL-1.0](designs/BAN-SURVIVAL-1.0.md).
- **SPORE-1.0:** last-resort failsafe after live fronts and cold-shelf mutual backup — does **not** replace those layers. Power or network loss **pauses** execution. No pretend-live metabolism. Preserve append-only ChainLock / AKM / receipt DNA on cold shelves + local nodes + tip packs. Resume on power (`memory_resolve` additive — no rewrite). Wipe resistance is every remaining copy. Plane B/C stay SLOT until attested. Physical wipe only. RE-COLD-STORE is an honest hook (no invented destinations). Operator `SPORE_DORMANT` / `POWER_LOSS` or radios off surfaces `spore.mode=dormant` on `GET /v1/mesh` and `GET /survival`. Dormant join/heartbeat refuse invented live beats. Paper: [SPORE-1.0](designs/SPORE-1.0.md).

## Nine laws (hard-true)

These are **not** soft docs. `GET /v1/mesh` and `GET /v1/mesh/status` publish machine fields. A violation takes a **published** refuse code. Close test: `scripts/verify-mesh-nine-laws.mjs`. Papers: [SEC-FEAT-1.0](designs/SEC-FEAT-1.0.md), [NODE-OPS-1.0](designs/NODE-OPS-1.0.md), [QNM-WP-1.0](designs/QNM-WP-1.0.md). **GodLock is a product name, not identity.** Identity is **Aziel Eliab** only. Cap-7 stays `resolves_to_hub: false`. Worker-launch cite fields on the same JSON: `hashtag_parts` (`#aziel`, `#runtime`), `author_id` `https://www.azieleliab.com/#aziel`, `runtime_id` `https://www.azieleliab.com/runtime#runtime`, and always-About (`about.path` `/about`). Cite only — not a control-panel UI.

| Law | LIVE field | Refuse |
| --- | --- | --- |
| Split the wires | `clocks_share_socket: false`, `tick_plane: "presence-tip-hash"`, `payload_plane: "receiver-pull"` | `MESH-NO-BYTES` (body/diff/file on the tick); `MESH-BAD-INPUT` if `clocks_share_socket` is forced true |
| Cold-copy survival | `live_body_sync: false`, `named_hosts_only: true`, `tip_content_addressed: true` | `MESH-NO-BYTES` |
| REHEAL isolation | `isolation_is_the_cure: true`, `neighbor_heal: true` (operator-armed), `vote_to_fix: false` | `MESH-NO-NEIGHBOR-HEAL` still refuses vote-to-fix |
| Phoenix local only | `phoenix_local_only: true`, `neighbor_phoenix: false`, `public_hostname_resurrection: false` | `MESH-STUB` |
| Die-with-pull (no godlock.uk back) | `die_with_pull: true`, `restore_godlock_uk: false`, `climb_public_hostname: false` | `MESH-STUB` |
| Neighbor talk-back-to-health (operator-armed) | `neighbor_heal: true`, `apply_last_packet_on_heartbeat_loss: false` | `MESH-NO-NEIGHBOR-HEAL` still refuses apply-last-packet / vote-to-fix |
| Node Gate (operator-armed cite) | `node_gate: true`, `get_is_node_gate: true`, `ip_panel: false`, `login_recovery: false` | `MESH-STUB` still refuses login-recovery / IP panel |
| Auto-heal (operator-armed) | `implicit_heal: true`, `auto_heal: true`, `heartbeat_loss_isolates: false`, `apply_last_packet: false` | `MESH-STUB` still refuses apply-last-packet |
| Anonymity-network mode flag (operator-armed) | `anonymity_network: true`, `vpn: true`, `public_vpn: true`, `origin_hiding: false` | Public VPN auto-binds AZVPN (HTTPS/WS REAL). Kernel UDP / origin-hiding still refuse |

### OPERATOR-OVERRIDE 2026-09-17

These five were **hard-false**. Operator **2026-09-17** flipped them **ON** on the public mesh cite (`GET /v1/mesh` + status):

1. `auto_heal` / `implicit_heal` → true / ON
2. `node_gate` / `get_is_node_gate` → true / ON (public mesh surface; not a login-recovery IP panel)
3. `neighbor_heal` → true / ON (mesh no longer refuses the neighbor talk-back-to-health flag)
4. `network` → true and `network_cite: "on"` (suite/mesh network + radios cite operator-armed)
5. `anonymity_network` → true as an **operator-armed mode flag** only — `anonymity_network_note` says this is not a live anonymity fabric. Not Tor. Not origin-hiding. Public VPN auto-binds AZVPN (HTTPS/WS REAL; WireGuard/OpenVPN SLOT). GodLock is still not a kernel VPN.

Die-with-pull / no godlock.uk resurrection / Cap-7 `resolves_to_hub: false` / FragGate sole door / `confirm` / `dry_run` stay as-is. No MCP tool added or removed. Identity **Aziel Eliab** only.

No new MCP tool. FragGate stays the only public exec door.

## Channel plane ≠ kernel VPN · pairing ≠ tunnel · public VPN AZVPN

Operator-armed **communication channel cites** on `GET /v1/mesh` (+ status): `wifi` / `bluetooth` / `rf` / `photon` are **ON** as a **channel plane**. Live OS/hardware bearers run on local `qnm-node` / `qnsd`. This Worker **cites** that plane. `public_proxy` is **false**. It does **not** invent RF/BT/Wi-Fi/photon hardware on Cloudflare.

The Worker rollup bearer stays **`suite-presence`**. `radios` may read `"on"` because suite-presence is LIVE. Channel plane is not a kernel UDP VPN, Tor exit, SOCKS proxy, or origin-hiding fabric. Public VPN auto-binds **AZVPN** (`default_vpn_backend: "azvpn"`, `auto_use: true`). `GET /v1/mesh` cites `vpn: true` / `public_vpn: true` / `tunnel_concentrator: true` and never opens a session.

**AZNet ↔ AZBrowser pairing** is functional order / token only (hash continuity, silent side-net). `pair_status` (alias `pair`) reports that pair state. Products stay separate. Pairing is **not** a tunnel. Public VPN auto-binds AZVPN when the pair is present or vpn is armed. AZBrowser `vpn` is the auto-bind hook (not a merge). `tor` / `socks` / `proxy` stay stub.

Paper: [QNM-CHANNEL-PLANE-1.0](designs/QNM-CHANNEL-PLANE-1.0.md). Human workspace `#op-panel` / `#dashboard` / `#fg-console` expose Pair status without merging Softwares.

## What this Worker is

| This is | This is not |
| --- | --- |
| QNM-BUILD-1.0 suite **rollup** (live / locked / isolated) | A login mesh, account directory, or session store |
| Read-only suite-presence **ON by default** | LIVE because a site, view, MCP call, or download pinged status |
| `/v1/mesh` status / nodes / enable; disable is refused | Login-recovery / IP panel hosted on azieleliab.com (`node_gate` cite is operator-armed ON) |
| A SHA-256 **hash receipt** of a local communique | A publish path, upload proxy, or video host |
| Docs so product Workers can show rollup counts | The full local `qnm-node/` process |
| Shared FragGate kernel extras card (`kind: kernel`) | A Softwares-tab product; AZMail’s product-local mail ring |

## Local `qnm-node/` (not this package)

The **full node process** is local:

`qnm-node/` → `boot` / `chain` / `apg` / `bearers` / `outbox` / `phoenix` / `score` / `memorial` / `tethers` / `qnsd`

**Radio hooks in this repo:** `qnm-node/bearers/radio.js` (`QNM-RADIO-HOOKS-1.0`). wifi / bluetooth / rf / photon are **LIVE** only when host hardware or local `qnsd` is present; otherwise they refuse `QNM-RADIO-ABSENT`. **No mock LIVE.** The Worker `channel_plane` stays cite-only (`worker_hardware: false`). Close-test: `scripts/verify-qnm-radio.mjs`.

**QNS-CD-1.0** is the packet-transfer coding design (photon QNS1 1.3). Local process `qnsd` lives in [AzielEliab/qnm-node](https://github.com/AzielEliab/qnm-node) and binds **127.0.0.1** only. Companion to QNM-BUILD-1.0 / AIH-WP-1.3. This Worker cites it at `GET /v1/qns` and as `qns_cd` on every software card — it does **not** proxy local via emit and is **not** a remote wipe/control plane.

Parent rolls the remaining engines. This runtime hosts **radio bearer hooks only** — not boot/chain/apg/phoenix.

**Anon-broadcast** is a **sibling loopback module** of that local process only (`text → TTS → desk MP4 → metadata-culled file + SHA-256`). Style tool. Operator keeps the file. **Never a publish path.** Not listed on `/v1/software`.

## Runtime APIs

All paths are on `aziel-runtime` (this Worker). Product Workers **proxy** them via the `AZIEL_RUNTIME` service binding. Do not invent a second mesh or a login mesh. GodLock download-tracker (`godlock-download-tracker`) must proxy `GET /v1/mesh/status` (and `/v1/mesh/*`) the same way — a 404 there is a missing proxy, not a second mesh.

| Method | Path | Body | Notes |
| --- | --- | --- | --- |
| GET | `/v1/mesh` | — | `enabled`, `bearers` (Worker rollup: `suite-presence`), `channel_plane` / `channels` (`wifi` / `bluetooth` / `rf` / `photon` ON as cites), `vpn: true` / `public_vpn: true` / `default_vpn_backend: "azvpn"` (cite-only; never opens), `nodes` / `rollup.nodes` = human mesh users + cited `human_uses`, `live_nodes` / `rollup.mesh` = human mesh users + `site_live_viewers`, `live_nodes_generation`, `live_nodes_tip`, `human_mesh_users`, `site_live_viewers` / components (one aggregate read), `human_uses` / `human_uses_complete`, `active_nodes` / `inactive_nodes`, `isolated_nodes`, `software_nodes` / `rollup.software` = `{slug}-worker` roster, `nodes_note`, `live_nodes_note`, `mesh_default: "on"`. **Never enables extra radios. Never pulls hub `/count`.** Hubs paint `live_nodes` / `rollup.mesh` only — never `software_nodes` or `rollup.live`. Channel plane ≠ kernel VPN. |
| GET | `/v1/mesh/status` | — | Alias of `/v1/mesh` |
| POST | `/v1/mesh/enable` | `{ bearer }` | Optional extra bearer (example: `suite-presence`). Empty `{}` is refused. Rate-limited. Login/account/recover/gate names refuse. Not required for public Live Nodes. |
| POST | `/v1/mesh/disable` | `{}` | **Refused** (`MESH-DISABLE-REFUSED`). Suite-presence stays ON. |
| POST | `/v1/mesh/join` | `{ product, node_id?, label?, presence? }` | **`product` required.** Optional `node_id` 8–80 `[a-z0-9._-]`. Optional `presence`: `live` \| `locked` \| `isolated`. Strict **5-minute TTL**. Radios off → **`MESH-OFF`**. |
| POST | `/v1/mesh/heartbeat` | `{ node_id, presence? }` | Refresh the 5-minute TTL. Miss the window → dropped. Radios off → **`MESH-OFF`**. |
| POST | `/v1/mesh/leave` | `{ node_id }` | Drop presence. Idempotent. No implicit heal. |
| GET | `/v1/mesh/nodes` | — | Roster with presence. **No scores / leaderboard.** |
| GET | `/v1/mesh/site-presence` | — | Cite the hub site-viewer contract + current `site_live_viewers`. **Never writes. Never pulls hub `/count`.** |
| POST | `/v1/mesh/site-presence` | `{ host, viewers, kind: "human-page" }` | Hub fleet heartbeat of concurrent human page sessions. Allowed hosts: `godlock.uk`, `azieleliab.com`, `azielcorpuslibrary.net`. Alias `POST /v1/mesh/site-heartbeat`. Strict **5-minute TTL**. Overwrite per host (latest wins). Fail-closed: excluded host / bot / software / download / non-integer / over-cap refuse and do not store. F03 kind **`mesh_mutate`**. Not a radio join. |
| POST | `/v1/mesh/broadcast` | `{ sha256, title? }` | Hash receipt only. **Not a publish path.** **No video bytes.** |

Storage: existing **USES** KV under `mesh|` keys, or a dedicated **MESH** binding if present. Never invent placeholder `0000…` namespace ids. Empty or historically disabled KV is treated as default-on (`suite-presence`).

`qnm_s` is always `false` on this surface. Views, MCP, and downloads do not enter QNM-S.

## FragGate + MCP

Pipeline stays **list → describe → call**. Dual surface: agents use MCP; no extra chrome.

```bash
# Discover
curl -s -A 'Mozilla/5.0' https://aziel-runtime.vibelock.workers.dev/v1/fraggate/describe?slug=mesh

# Status (does not enable extra radios)
curl -s -A 'Mozilla/5.0' -X POST https://aziel-runtime.vibelock.workers.dev/v1/fraggate/call \
  -H 'content-type: application/json' \
  -d '{"slug":"mesh","op":"status","payload":{}}'
```

Named MCP tools (same kernel): `mesh_status`, `mesh_enable`, `mesh_disable`, `mesh_join`, `mesh_heartbeat`, `mesh_leave`, `mesh_nodes`, `mesh_broadcast`.

`mesh_disable` stays listed so clients do not 404, but it **refuses**. Leftover names such as `mesh_join` also parse through FragGate (`slug=mesh`, `op=join`). They are not a side door.

Stub verbs refuse: login / recover / resurrection / account / gate / ip-panel / publish / phoenix-hunt / heal / controller / arm / wipe / hop.

AZMail `mesh_post` / `mesh_poll` / `mesh_listen` / `mesh_enable` / `mesh_disable` stay **product-local** (anonymous mail ring). Do not unify those verbs onto this kernel.

## Catalog hints

`GET /v1/software` cards include:

```json
"mesh": {
  "path": "/v1/mesh",
  "enabled_default": true,
  "mesh_default": "on",
  "spec": "QNM-BUILD-1.0",
  "companion": "AIH-WP-1.1",
  "rollup_only": true,
  "qnm_s": false
},
"qns_cd": {
  "spec": "QNS-CD-1.0",
  "local": "https://github.com/AzielEliab/qnm-node",
  "note": "Photon vias on local qnsd; Worker cites only"
}
```

Hubs must **not** add AnonBroadcast as a Software-tab product from this hint. The hint tells each product Worker where the suite **rollup** lives.

`GET /v1/catalog.json` `extras[]` includes a Quantum Node Mesh kernel card (`kind: "kernel"`, `engine: false`) beside FragGate. extras are not PRODUCTS.

## How every product Worker should wire

1. Keep an `AZIEL_RUNTIME` service binding to `aziel-runtime`.
2. Proxy `/v1/mesh` and `/v1/mesh/*` to that binding (same path). Forward method, JSON body, and `User-Agent: Mozilla/5.0`.
3. On the human UI, show a small **QNM rollup** strip (counts only):
   - Poll `GET /v1/mesh/status` (or `/v1/mesh/nodes`) on a gentle interval.
   - Show **Nodes · N** from `nodes` / `rollup.nodes` (human mesh users + cited `human_uses`). Tooltip / note: use `nodes_note` from the same JSON — do not fork copy.
   - Show **Live Nodes · N** from `live_nodes` / `rollup.mesh` only. Do **not** paint `software_nodes`, `rollup.live`, `rollup.all.live`, `rollup.active`, `active_nodes`, or `rollup.software.live` as Live Nodes. `rollup.live` is not on the JSON. Those roster counts, after fan-out, match the `{slug}-worker` roster. Tooltip / note: use `live_nodes_note` from the same JSON — do not fork copy. Do **not** add this hub's local presence on top of `live_nodes`. Do **not** recompute from `site_live_viewers_components` plus a private `/count`. Optional cite: `live_nodes_tip` (same tip ⇒ same Live Nodes inputs). `live_nodes_generation` is the site-viewer seal and stays put across TTL-only heartbeats.
   - Hubs that already compute concurrent human page presence (GodLock `site_live_nodes`: distinct sessions with a heartbeat inside 5 minutes) **POST** that count to `/v1/mesh/site-presence`. Do **not** wait for runtime to scrape `/count`. If the POST is missing or expired, runtime reports `site_live_viewers: 0`.
   - `software_nodes` / `rollup.software` is the `{slug}-worker` suite roster. Hubs may cite it separately.
   - Do not treat the poll as enable. Do not show suite “mesh off” / “Default OFF” copy.
   - A **human** should `POST /v1/mesh/join` with `{ "product": "<slug>", "kind": "human", "bearer": "human", "presence": "live" }` (optional `node_id`; omit to mint `mesh_*`) then heartbeat about once a minute. Isolated presence does not count as Live Nodes.
   - A **running downloaded Softwares instance** should `POST /v1/mesh/join` with `{ "product": "<slug>", "node_id": "<instance-id>", "kind": "instance", "presence": "live" }`. That is `instance_nodes`, **not** Live Nodes. Instance `node_id` must **not** be `{slug}-worker`. Avoid `|` in `node_id`.
   - Product Workers may still heartbeat `{ "product": "<slug>", "node_id": "<slug>-worker" }` — that is `software_nodes` only. Never add those rows to Live Nodes.
   - Leave on shutdown if you can; otherwise the node drops from the roster in five minutes.
   - The runtime also fans out `{slug}-worker` presence while suite-presence is on (cron or request-path) for `software_nodes`. Product Workers still proxy status so hubs that show **Live Nodes** do not 404.
4. Do **not** add login, recovery, IP panel, AnonBroadcast chrome, upload buttons, or origin-hiding claims. `node_gate` / `get_is_node_gate` are operator-armed cites on this rollup, not a new control-panel UI.
5. Do **not** implement arm / wipe / hop / heal / resurrection / phoenix-hunt verbs. Those refuse as stub on this kernel.
6. Do **not** treat Phoenix or suite fan-out as restoring godlock.uk or auto-reattaching a pulled public hostname.

Example proxy (product Worker):

```js
if (url.pathname === "/v1/mesh" || url.pathname.startsWith("/v1/mesh/")) {
  if (!env.AZIEL_RUNTIME) {
    return Response.json({ ok: false, error: "AZIEL_RUNTIME unbound" }, { status: 503 });
  }
  return env.AZIEL_RUNTIME.fetch(request);
}
```

## Honesty

- Read-only suite-presence is **ON by default**. Public Nodes and Live Nodes do not need a manual enable. Live Nodes stay **0** until a human join/heartbeat exists and/or an unexpired hub site-presence heartbeat reports viewers. Nodes add cited `human_uses` when USES reports a total (never invent users or viewers). Incomplete USES is `human_uses=0` + `human_uses_complete=false` and does **not** enter Live Nodes.
- `GET /v1/mesh` is a rollup read. It does not enable radios beyond that default presence. It **never pulls** hub `/count`. Missing or expired `site_live_viewers` reports are **0**.
- `POST /v1/mesh/disable` cannot turn suite-presence off.
- Library host `www.azielcorpuslibrary.net/runtime/v1/mesh/enable` may return **409** `{ source: "library-default-off", enabled: false }` instead of this Worker's `MESH-NEED-BEARER` / `MESH-BAD-BEARER`. That overlay is **host-side** (aziel-corpus), not a runtime kill switch. Do not treat it as the suite being off.
- Presence is ephemeral. **`mesh_join` TTL is a strict 5 minutes.** Heartbeat (or fan-out refresh) inside that window keeps the node; otherwise it is dropped from the live roster.
- Join/heartbeat/broadcast refuse **`MESH-OFF`** when transmission radios are powered down or suite radios are not enabled. Mesh **read** paths stay honest and never enable radios. Do not invent a second refuse spelling.
- Phoenix is wait / re-seal only. It does not bring the .uk node back.
- Split the wires: pull-only payloads, hash-absolute ingest, equivocation = death of that peer, two clocks that never share a socket.
- Cold-copy survival: multiply cold copies; no live body sync; tip expensive to erase; unkillable by single-server pull; payloads pull-only cold; named hosts only.
- Re-expand-from-archive: bytes survive, not summaries; restore after prev-hash verify; not mesh from index; crawlers extra shelves only; training residue is rumor.
- REHEAL: isolation is the cure; own last good tip + verified trusted pull, or phoenix-WAIT; never neighbor talk-back-to-health; no bodies / diffs / vote-to-fix.
- Nine laws are hard-true on `GET /v1/mesh`: machine fields + published refuse codes. **OPERATOR-OVERRIDE 2026-09-17** flipped `auto_heal` / `implicit_heal`, `node_gate` / `get_is_node_gate`, `neighbor_heal`, `network`, `anonymity_network` (mode flag), and public VPN (AZVPN auto-bind) from hard-false to ON. GodLock is a product name, not identity. Die-with-pull does not restore godlock.uk. Not a login-recovery IP panel. Channel plane (wifi / bluetooth / rf / photon) is an operator-armed cite — live hardware stays on local qnm-node. **Channel plane ≠ kernel VPN. Pairing ≠ tunnel. Public VPN auto-binds AZVPN.**
- CROSS-NETWORK-SURVIVAL-1.0: if network and data die tomorrow, the chain survives on cold shelves (hosts / DOI / git / vault). All prior laws sit under that sentence. The live mesh is not a shelf.
- Broadcast never accepts `video` / `bytes` / `file` / `mp4` / `publish` fields.
- Public identity is Aziel Eliab only.
- Receipts that still hash. No rewrite key. Never lie to stay alive.
- Forks welcome. Apache-2.0.

## FED-MESH-1.0: Local-First Edge Mesh

This page stays the QNM-BUILD-1.0 suite rollup. The multi-user protocol is a separate layer: [`docs/designs/FED-MESH-1.0.md`](designs/FED-MESH-1.0.md).

Raw data, signing keys, and heavy compute stay on the local node. By default the mesh carries signed receipts, state digests, and ref updates. Raw data moves only on an explicit end-to-end encrypted share. The Worker relay never requires plaintext.

`verified_handles` counts distinct `#handles` with a matching key and presence inside 5 minutes. One handle is one node. Three local instances with three keys are three nodes. That count is handles, not people. It is not added to `nodes`, `live_nodes`, `software_nodes`, or `instance_nodes`. The published pills stay the suite formulas above.

The Worker is one relay. Any qnm-node may run the same relay. A new node still needs one relay address it already has. GET `/v1/mesh/relay` is the health check and never enables.

`.aziel` name records are signed and anchored like ref updates. `<handle>.aziel` is self-certifying and final immediately. A friendly name carries proof-of-work and stays pending until 72 hours and 2 witness handles. The first valid final claim wins, with 3 user .aziel names per handle and 4 reserved hub-mirror slots. Equivocation flags that handle only. This relay does not execute peer code and does not rank handles. `.az` is normal DNS except the Cap-7 factory names and the AZ.* hub names (`AZ.AzielEliab.AZ`, `AZ.Godlock.AZ`, `AZ.AzielCorpusLibrary.AZ`, `AZ.HeDidntJump.AZ`). Those cites are not mesh name records. Standard internet does not reach Cap-7. AZ.* resolves through hub HTTPS.

## FAQ

**What are Nodes?** `human_mesh_users + human_uses`. Unchanged. Uses are interaction counters, not unique people.

**What are Live Nodes?** `human_mesh_users + site_live_viewers`, published as `live_nodes` and `rollup.mesh`. Concurrent website viewers are human page presence on godlock.uk + azieleliab.com + azielcorpuslibrary.net. Not hedidntjump.com. Not bots, Softwares, or downloads.

**Is `rollup.live` Live Nodes?** No. That key is not published. `rollup.all.live` is roster rows with `presence=live` on every plane, including `{slug}-worker`. `rollup.software.live` is only those workers. Both can read ~41 while Live Nodes is the human + site-viewer total. Paint `live_nodes` / `rollup.mesh`. Never paint `software_nodes` or `rollup.live`.

**Does runtime scrape godlock.uk/count?** No. GodLock already computes `site_live_nodes` locally (distinct sessions with a heartbeat inside 5 minutes). Hubs must `POST /v1/mesh/site-presence` `{ host, viewers, kind: "human-page" }`. If they do not, `site_live_viewers` stays 0. Fail-closed. `GET /v1/mesh` never fetches hub `/count`.

**Why do hubs show 22 vs 23 vs 24?** Paint `live_nodes` / `rollup.mesh` from `GET /v1/mesh`. Do not add a local viewer count. Never paint `software_nodes` or `rollup.live`. The runtime seals godlock.uk + azieleliab.com + azielcorpuslibrary.net into one aggregate, so one response's `site_live_viewers` equals the sum of `site_live_viewers_components`, and `live_nodes` equals `human_mesh_users + site_live_viewers`. `live_nodes_tip` identifies that pair of inputs. Two chrome strips with the same tip are the same number. A newer heartbeat that has not reached this colo yet is an older seal, not a license to recompute. Roster fan-out does not rewrite the aggregate.

**Can a hub invent viewers?** The contract refuses excluded hosts, refused kinds, non-integers, and over-cap counts. Runtime does not invent a count when none was stored. Zero is honest. Missing or expired host rows are 0.
