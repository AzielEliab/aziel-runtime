# Suite node mesh

**Aziel Eliab Runtime 1.6.13** adds a suite-wide decentralized **node mesh** kernel.

This is **not** AnonBroadcast as a Softwares-tab product. Mesh networking lives here. Anon-broadcast stays a **local communique renderer** operators may run offline.

Public identity: **Aziel Eliab** only.

## Boundary

| This is | This is not |
| --- | --- |
| Optional presence for product Workers (Live Nodes, 5-minute TTL) | A Softwares-tab product |
| A global kill switch (default **OFF**) | Always-on networking |
| A SHA-256 **hash receipt** of a local communique | An upload proxy or video host |
| Shared suite layer under FragGate | AZMail’s product-local anonymous mail ring |
| Docs so every Worker UI can show a small Live Nodes strip | Arming / wipe / VPN-hop internals |

GodLock law was mesh off until Aziel adds it. **This is the add.** Default stays **OFF** until an operator calls enable.

## Runtime APIs

All paths are on `aziel-runtime` (this Worker). Product Workers **proxy** them via the `AZIEL_RUNTIME` service binding. Do not invent a second mesh.

| Method | Path | Body | Notes |
| --- | --- | --- | --- |
| GET | `/v1/mesh` | — | `enabled`, `live_nodes`, `products_present` |
| GET | `/v1/mesh/status` | — | Alias of `/v1/mesh` |
| POST | `/v1/mesh/enable` | `{}` | Kill switch ON. Rate-limited. |
| POST | `/v1/mesh/disable` | `{}` | Kill switch OFF. Always allowed. No wipe. |
| POST | `/v1/mesh/join` | `{ product, node_id?, label? }` | Returns a session. Refused while OFF. |
| POST | `/v1/mesh/heartbeat` | `{ node_id }` | Refresh 5-minute presence. |
| POST | `/v1/mesh/leave` | `{ node_id }` | Drop presence. Idempotent. |
| GET | `/v1/mesh/nodes` | — | Live nodes (`last_seen` within 5 minutes) |
| POST | `/v1/mesh/broadcast` | `{ sha256, title? }` | Hash receipt only. **No video bytes.** |

Storage: existing **USES** KV under `mesh|` keys, or a dedicated **MESH** binding if present. Never invent placeholder `0000…` namespace ids.

## FragGate + MCP

Pipeline stays **list → describe → call**. Dual surface: agents use MCP; no extra chrome.

```bash
# Discover
curl -s -A 'Mozilla/5.0' https://aziel-runtime.vibelock.workers.dev/v1/fraggate/describe?slug=mesh

# Call
curl -s -A 'Mozilla/5.0' -X POST https://aziel-runtime.vibelock.workers.dev/v1/fraggate/call \
  -H 'content-type: application/json' \
  -d '{"slug":"mesh","op":"status","payload":{}}'
```

Named MCP tools (same kernel): `mesh_status`, `mesh_enable`, `mesh_disable`, `mesh_join`, `mesh_heartbeat`, `mesh_leave`, `mesh_nodes`, `mesh_broadcast`.

Leftover names such as `mesh_join` also parse through FragGate (`slug=mesh`, `op=join`). They are not a side door.

AZMail `mesh_post` / `mesh_poll` / `mesh_listen` / `mesh_enable` / `mesh_disable` stay **product-local** (anonymous mail ring). Do not unify those verbs onto this kernel.

## Catalog hints

`GET /v1/software` cards include:

```json
"mesh": { "path": "/v1/mesh", "enabled_default": false }
```

Hubs must **not** add AnonBroadcast as a Software-tab product from this hint. The hint tells each product Worker where the suite mesh lives.

`GET /v1/catalog.json` `extras[]` includes a Node Mesh kernel card (`kind: "kernel"`, `engine: false`) beside FragGate. extras are not PRODUCTS.

## How every product Worker should wire

1. Keep an `AZIEL_RUNTIME` service binding to `aziel-runtime`.
2. Proxy `/v1/mesh` and `/v1/mesh/*` to that binding (same path). Forward method, JSON body, and `User-Agent: Mozilla/5.0`.
3. On the human UI, show a small **Live Nodes** strip:
   - Poll `GET /v1/mesh/status` (or `/v1/mesh/nodes`) on a gentle interval.
   - If `enabled` is false, show **Mesh OFF** (default). No join.
   - If on, list `live_nodes` / product labels. Heartbeat the Worker’s own `node_id` about once a minute after `POST /v1/mesh/join` with `{ "product": "<slug>" }`.
   - Leave on shutdown if you can; otherwise the node expires in five minutes.
4. Do **not** add AnonBroadcast chrome, upload buttons, or origin-hiding claims.
5. Do **not** implement arm / wipe / hop mesh verbs. Those refuse as stub on this kernel.

Example proxy (product Worker):

```js
if (url.pathname === "/v1/mesh" || url.pathname.startsWith("/v1/mesh/")) {
  if (!env.AZIEL_RUNTIME) {
    return Response.json({ ok: false, error: "AZIEL_RUNTIME unbound" }, { status: 503 });
  }
  return env.AZIEL_RUNTIME.fetch(request);
}
```

## Anon-broadcast (local only)

Mesh operators may use **anon-broadcast** offline as a style tool:

`text → TTS → desk MP4 → metadata-culled file + SHA-256`

Then optionally `POST /v1/mesh/broadcast` with that SHA-256 (and an optional title).

- Style tool only.
- Not an upload proxy.
- Not origin-hiding.
- The operator moves the file.
- Not listed on `/v1/software` as a product.

## Honesty

- Default **OFF**.
- Presence is ephemeral (5 minutes), like GodLock Live Nodes.
- Broadcast never accepts `video` / `bytes` / `file` / `mp4` fields.
- Public identity is Aziel Eliab only.
- Forks welcome. Apache-2.0.
