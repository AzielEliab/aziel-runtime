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
- [CROSS-NETWORK-SURVIVAL-1.0](designs/CROSS-NETWORK-SURVIVAL-1.0.md) — umbrella survival law (if network and data die tomorrow, the chain survives on cold shelves — hosts / DOI / git / vault)
- [NO-LIE-NO-REWRITE-1.0](designs/NO-LIE-NO-REWRITE-1.0.md) — receipts that still hash; no rewrite key; never lie to survive (companion under the umbrella; does not replace the machine tip)
- [COLD-MULTI-SHELF-1.0](designs/COLD-MULTI-SHELF-1.0.md) — planes A/B/C matching live corpus `/shelves` (corpus#96); runtime cites, does not invent a sixth surface

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
- **azieleliab.com** hosts published software/runtime — **not** login-recovery, **not** Node Gate/IP panel, **not** upload proxy.
- Suite public surface may expose mesh **rollup only**: **live / locked / isolated** counts. No average-of-nodes leaderboard. **Views / MCP / downloads do not enter QNM-S.**
- **Default:** read-only **suite-presence is ON** (bearer `suite-presence`). A site ping of `GET /v1/mesh` never enables radios beyond that read-only presence. Do not require `POST /v1/mesh/enable` for public Live Nodes.
- **Public disable of suite-presence is refused.** `POST /v1/mesh/disable` and suite `mesh_disable` refuse `MESH-DISABLE-REFUSED`. They cannot turn suite-presence off. AZMail `mesh_disable` stays a separate product-local mail ring.
- **Durable Live Nodes:** while suite-presence is LIVE, this Worker fans out `join` / `heartbeat` for every live Softwares product Worker (`node_id` `{slug}-worker`, no `|`) on cron (`*/2 * * * *`) or request-path. Presence TTL is **5 minutes**. GET still never enables extra radios. Hub `live_nodes` counts those `{slug}-worker` Softwares only. Auto-minted `mesh_*` ids are `ephemeral_nodes` and do not inflate the Softwares count.
- **NO-LIE / NO-REWRITE:** receipts that still hash; copies not all on one tunnel; rules simple enough others verify without the author's voice; **no rewrite key**. The network is **never allowed to lie** — even to self-preserve, sustain, stay alive, adapt, or prevent death. `GET /v1/mesh` cites `no_lie`, `no_rewrite`, `rewrite_key: false`, `lie_to_survive: false`. Rewrite / lie verbs refuse `MESH-NO-REWRITE` / `MESH-NO-LIE`. Companion under [CROSS-NETWORK-SURVIVAL-1.0](designs/CROSS-NETWORK-SURVIVAL-1.0.md); does not replace the machine tip.
- **Cap-7 semantic bridge:** mesh-name factory is **MirageGrid-only**. Names inherit hub **designs** only (library hub carries mesh-resident **azcorpus** + **azlibrary**). `resolves_to_hub: false`. `name_may_change: true`. Canonical hubs immutable. Not aliases of the four ICANN hostnames. Not a fifth product. `GET /v1/mesh/az-generator` and MirageGrid Worker `/bridge` are cite-only. No live AZ-GEN registrar. No fake ICANN `.az`. No visible 15:20. `GET /v1/mesh` never enables radios. AZNet + AZBrowser browse the mesh via FragGate. Plane A hubs mirror tips.
- **COLD-MULTI-SHELF-1.0:** `GET /shelves` cites live corpus `/shelves` (corpus#96). Plane A = 5 published surfaces / 2 family radii / 1 independent live (`cf-github`). Plane B is alt-forge SLOT (Codeberg hash-verify PASS still SLOT; archive.org + GitFlic URL null; Zenodo refused `CNS-ZENODO-IP-BAN`; `doi` null). Plane C USB SLOT until `CNS-OPERATOR-ATTEST`. This Worker is the same Plane A tunnel, not a sixth surface. Paper: [COLD-MULTI-SHELF-1.0](designs/COLD-MULTI-SHELF-1.0.md).

## What this Worker is

| This is | This is not |
| --- | --- |
| QNM-BUILD-1.0 suite **rollup** (live / locked / isolated) | A login mesh, account directory, or session store |
| Read-only suite-presence **ON by default** | LIVE because a site, view, MCP call, or download pinged status |
| `/v1/mesh` status / nodes / enable; disable is refused | Node Gate / IP panel / login-recovery hosted on azieleliab.com |
| A SHA-256 **hash receipt** of a local communique | A publish path, upload proxy, or video host |
| Docs so product Workers can show rollup counts | The full local `qnm-node/` process |
| Shared FragGate kernel extras card (`kind: kernel`) | A Softwares-tab product; AZMail’s product-local mail ring |

## Local `qnm-node/` (not this package)

The **full node process** is local:

`qnm-node/` → `boot` / `chain` / `apg` / `bearers` / `outbox` / `phoenix` / `score` / `memorial` / `tethers` / `qnsd`

**QNS-CD-1.0** is the packet-transfer coding design (photon QNS1 1.3). Local process `qnsd` lives in [AzielEliab/qnm-node](https://github.com/AzielEliab/qnm-node) and binds **127.0.0.1** only. Companion to QNM-BUILD-1.0 / AIH-WP-1.3. This Worker cites it at `GET /v1/qns` and as `qns_cd` on every software card — it does **not** proxy local via emit and is **not** a remote wipe/control plane.

Parent rolls that package. This runtime does **not** host those engines.

**Anon-broadcast** is a **sibling loopback module** of that local process only (`text → TTS → desk MP4 → metadata-culled file + SHA-256`). Style tool. Operator keeps the file. **Never a publish path.** Not listed on `/v1/software`.

## Runtime APIs

All paths are on `aziel-runtime` (this Worker). Product Workers **proxy** them via the `AZIEL_RUNTIME` service binding. Do not invent a second mesh or a login mesh. GodLock download-tracker (`godlock-download-tracker`) must proxy `GET /v1/mesh/status` (and `/v1/mesh/*`) the same way — a 404 there is a missing proxy, not a second mesh.

| Method | Path | Body | Notes |
| --- | --- | --- | --- |
| GET | `/v1/mesh` | — | `enabled`, `bearers`, `rollup: { live, locked, isolated }`, `mesh_default: "on"`. **Never enables extra radios.** |
| GET | `/v1/mesh/status` | — | Alias of `/v1/mesh` |
| POST | `/v1/mesh/enable` | `{ bearer }` | Optional extra bearer (example: `suite-presence`). Empty `{}` is refused. Rate-limited. Login/account/recover/gate names refuse. Not required for public Live Nodes. |
| POST | `/v1/mesh/disable` | `{}` | **Refused** (`MESH-DISABLE-REFUSED`). Suite-presence stays ON. |
| POST | `/v1/mesh/join` | `{ product, node_id?, label?, presence? }` | Optional `presence`: `live` \| `locked` \| `isolated`. Rollup only. |
| POST | `/v1/mesh/heartbeat` | `{ node_id, presence? }` | Refresh 5-minute presence. |
| POST | `/v1/mesh/leave` | `{ node_id }` | Drop presence. Idempotent. No implicit heal. |
| GET | `/v1/mesh/nodes` | — | Roster with presence. **No scores / leaderboard.** |
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
   - Show **Live Nodes · N** from `rollup.live` / `live_nodes`. Prefer mesh on / Live Nodes · N only.
   - Do not treat the poll as enable. Do not show suite “mesh off” / “Default OFF” copy.
   - Heartbeat the Worker’s own `node_id` about once a minute after `POST /v1/mesh/join` with `{ "product": "<slug>", "node_id": "<slug>-worker", "presence": "live" }`. Avoid `|` in `node_id`.
   - Leave on shutdown if you can; otherwise the count expires in five minutes.
   - The runtime also fans out `{slug}-worker` presence while suite-presence is on (cron or request-path). Product Workers still proxy status so hubs that show **Live Nodes** do not 404.
4. Do **not** add login, recovery, Node Gate, IP panel, AnonBroadcast chrome, upload buttons, or origin-hiding claims.
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

- Read-only suite-presence is **ON by default**. Public Live Nodes do not need a manual enable.
- `GET /v1/mesh` is a rollup read. It does not enable radios beyond that default presence.
- `POST /v1/mesh/disable` cannot turn suite-presence off.
- Library host `www.azielcorpuslibrary.net/runtime/v1/mesh/enable` may return **409** `{ source: "library-default-off", enabled: false }` instead of this Worker's `MESH-NEED-BEARER` / `MESH-BAD-BEARER`. That overlay is **host-side** (aziel-corpus), not a runtime kill switch. Do not treat it as the suite being off.
- Presence is ephemeral (5 minutes).
- Phoenix is wait / re-seal only. It does not bring the .uk node back.
- Split the wires: pull-only payloads, hash-absolute ingest, equivocation = death of that peer, two clocks that never share a socket.
- Cold-copy survival: multiply cold copies; no live body sync; tip expensive to erase; unkillable by single-server pull; payloads pull-only cold; named hosts only.
- Re-expand-from-archive: bytes survive, not summaries; restore after prev-hash verify; not mesh from index; crawlers extra shelves only; training residue is rumor.
- REHEAL: isolation is the cure; own last good tip + verified trusted pull, or phoenix-WAIT; never neighbor talk-back-to-health; no bodies / diffs / vote-to-fix.
- CROSS-NETWORK-SURVIVAL-1.0: if network and data die tomorrow, the chain survives on cold shelves (hosts / DOI / git / vault). All prior laws sit under that sentence. The live mesh is not a shelf.
- Broadcast never accepts `video` / `bytes` / `file` / `mp4` / `publish` fields.
- Public identity is Aziel Eliab only.
- Receipts that still hash. No rewrite key. Never lie to stay alive.
- Forks welcome. Apache-2.0.
