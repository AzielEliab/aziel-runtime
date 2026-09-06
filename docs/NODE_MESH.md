# Quantum Node Mesh (QNM-BUILD-1.0)

**Aziel Eliab Runtime 1.6.13** exposes a **suite QNM rollup** on `/v1/mesh`.

This is the public companion surface to **AIH-WP-1.1**. Parent will roll the full local `qnm-node/` package next. **This runtime must not invent a login mesh.**

Public identity: **Aziel Eliab** only.

## Law (must not violate)

- **Bulletproof:** local modules run radios off; receipts to disk; poison refused not interpreted; tamper isolates; **PHOENIX-LOCK waits locally** (no controller hunt); tethers drop clean (**no implicit heal**); **no account resurrection**; **anon-broadcast is never a publish path**.
- **azieleliab.com** hosts published software/runtime — **not** login-recovery, **not** Node Gate/IP panel, **not** upload proxy.
- Suite public surface may expose mesh **rollup only**: **live / locked / isolated** counts. No average-of-nodes leaderboard. **Views / MCP / downloads do not enter QNM-S.**
- **Default:** radios/bearers **off**. **LIVE** only after the operator enables **≥1 declared bearer**. A site ping of `GET /v1/mesh` never turns radios on.

## What this Worker is

| This is | This is not |
| --- | --- |
| QNM-BUILD-1.0 suite **rollup** (live / locked / isolated) | A login mesh, account directory, or session store |
| Operator enable of a **declared bearer** (default **OFF**) | LIVE because a site, view, MCP call, or download pinged status |
| `/v1/mesh` status / nodes / enable / disable for suite presence | Node Gate / IP panel / login-recovery hosted on azieleliab.com |
| A SHA-256 **hash receipt** of a local communique | A publish path, upload proxy, or video host |
| Docs so product Workers can show rollup counts | The full local `qnm-node/` process |
| Shared FragGate kernel extras card (`kind: kernel`) | A Softwares-tab product; AZMail’s product-local mail ring |

## Local `qnm-node/` (not this package)

The **full node process** is local:

`qnm-node/` → `boot` / `chain` / `apg` / `bearers` / `outbox` / `phoenix` / `score` / `memorial` / `tethers`

Parent rolls that package. This runtime does **not** host those engines.

**Anon-broadcast** is a **sibling loopback module** of that local process only (`text → TTS → desk MP4 → metadata-culled file + SHA-256`). Style tool. Operator keeps the file. **Never a publish path.** Not listed on `/v1/software`.

## Runtime APIs

All paths are on `aziel-runtime` (this Worker). Product Workers **proxy** them via the `AZIEL_RUNTIME` service binding. Do not invent a second mesh or a login mesh.

| Method | Path | Body | Notes |
| --- | --- | --- | --- |
| GET | `/v1/mesh` | — | `enabled`, `bearers`, `rollup: { live, locked, isolated }`. **Never enables.** |
| GET | `/v1/mesh/status` | — | Alias of `/v1/mesh` |
| POST | `/v1/mesh/enable` | `{ bearer }` | LIVE only with ≥1 declared bearer (example: `suite-presence`). Empty `{}` is refused. Rate-limited. Login/account/recover/gate names refuse. |
| POST | `/v1/mesh/disable` | `{}` | Radios/bearers OFF. Tethers drop clean. No wipe / heal / resurrection. Always allowed. |
| POST | `/v1/mesh/join` | `{ product, node_id?, label?, presence? }` | Optional `presence`: `live` \| `locked` \| `isolated`. Rollup only. Refused while OFF. |
| POST | `/v1/mesh/heartbeat` | `{ node_id, presence? }` | Refresh 5-minute presence. |
| POST | `/v1/mesh/leave` | `{ node_id }` | Drop presence. Idempotent. No implicit heal. |
| GET | `/v1/mesh/nodes` | — | Roster with presence. **No scores / leaderboard.** |
| POST | `/v1/mesh/broadcast` | `{ sha256, title? }` | Hash receipt only. **Not a publish path.** **No video bytes.** |

Storage: existing **USES** KV under `mesh|` keys, or a dedicated **MESH** binding if present. Never invent placeholder `0000…` namespace ids.

`qnm_s` is always `false` on this surface. Views, MCP, and downloads do not enter QNM-S.

## FragGate + MCP

Pipeline stays **list → describe → call**. Dual surface: agents use MCP; no extra chrome.

```bash
# Discover
curl -s -A 'Mozilla/5.0' https://aziel-runtime.vibelock.workers.dev/v1/fraggate/describe?slug=mesh

# Status (does not enable)
curl -s -A 'Mozilla/5.0' -X POST https://aziel-runtime.vibelock.workers.dev/v1/fraggate/call \
  -H 'content-type: application/json' \
  -d '{"slug":"mesh","op":"status","payload":{}}'

# Operator enable (declared bearer required)
curl -s -A 'Mozilla/5.0' -X POST https://aziel-runtime.vibelock.workers.dev/v1/fraggate/call \
  -H 'content-type: application/json' \
  -d '{"slug":"mesh","op":"enable","payload":{"bearer":"suite-presence"}}'
```

Named MCP tools (same kernel): `mesh_status`, `mesh_enable`, `mesh_disable`, `mesh_join`, `mesh_heartbeat`, `mesh_leave`, `mesh_nodes`, `mesh_broadcast`.

`mesh_enable` requires `{ bearer }`. Leftover names such as `mesh_join` also parse through FragGate (`slug=mesh`, `op=join`). They are not a side door.

Stub verbs refuse: login / recover / resurrection / account / gate / ip-panel / publish / phoenix-hunt / heal / controller / arm / wipe / hop.

AZMail `mesh_post` / `mesh_poll` / `mesh_listen` / `mesh_enable` / `mesh_disable` stay **product-local** (anonymous mail ring). Do not unify those verbs onto this kernel.

## Catalog hints

`GET /v1/software` cards include:

```json
"mesh": {
  "path": "/v1/mesh",
  "enabled_default": false,
  "spec": "QNM-BUILD-1.0",
  "companion": "AIH-WP-1.1",
  "rollup_only": true,
  "qnm_s": false
}
```

Hubs must **not** add AnonBroadcast as a Software-tab product from this hint. The hint tells each product Worker where the suite **rollup** lives.

`GET /v1/catalog.json` `extras[]` includes a Quantum Node Mesh kernel card (`kind: "kernel"`, `engine: false`) beside FragGate. extras are not PRODUCTS.

## How every product Worker should wire

1. Keep an `AZIEL_RUNTIME` service binding to `aziel-runtime`.
2. Proxy `/v1/mesh` and `/v1/mesh/*` to that binding (same path). Forward method, JSON body, and `User-Agent: Mozilla/5.0`.
3. On the human UI, show a small **QNM rollup** strip (counts only):
   - Poll `GET /v1/mesh/status` (or `/v1/mesh/nodes`) on a gentle interval.
   - If `enabled` is false, show **QNM OFF** (default). Do not treat the poll as enable.
   - If on, show `rollup.live` / `rollup.locked` / `rollup.isolated`. No averages. No leaderboard.
   - After an operator has enabled a bearer, heartbeat the Worker’s own `node_id` about once a minute after `POST /v1/mesh/join` with `{ "product": "<slug>", "presence": "live" }`.
   - Leave on shutdown if you can; otherwise the count expires in five minutes.
4. Do **not** add login, recovery, Node Gate, IP panel, AnonBroadcast chrome, upload buttons, or origin-hiding claims.
5. Do **not** implement arm / wipe / hop / heal / resurrection / phoenix-hunt verbs. Those refuse as stub on this kernel.

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

- Default **OFF**. Radios stay off until an operator declares a bearer.
- `GET /v1/mesh` is a rollup read. It does not enable.
- Presence is ephemeral (5 minutes).
- Broadcast never accepts `video` / `bytes` / `file` / `mp4` / `publish` fields.
- Public identity is Aziel Eliab only.
- Forks welcome. Apache-2.0.
