# QNM-CHANNEL-PLANE-1.0

**Aziel Eliab** only. Channel plane cite — not a Softwares-tab product, not a FragGate slug, not a new MCP tool.

Live law stays on [NODE_MESH](../NODE_MESH.md). This page is the short honesty cite.

## This is

Operator-armed **communication channel cites** on `GET /v1/mesh` (+ status):

| Channel | Cite |
| --- | --- |
| Wi-Fi | `wifi: "on"` |
| Bluetooth | `bluetooth: "on"` |
| RF | `rf: "on"` |
| Photon flashes | `photon: "on"` |

They sit on a **channel plane**. Data persist across devices is a local `qnm-node` / `qnsd` process law. The Worker **cites** that plane. `public_proxy` is **false**.

The Worker rollup bearer stays **`suite-presence`**. Do not invent a second Worker bearer or live RF/BT hardware on Cloudflare.

## This is not

- A public VPN product
- Tor / SOCKS / origin-hiding fabric
- GodLock-as-VPN (`vpn: false` stays)
- Worker-proxied radios
- Invented live OS/hardware on this isolate
- A tunnel that merges AZNet and AZBrowser

**Channel plane ≠ VPN.**

**AZNet ↔ AZBrowser pairing ≠ tunnel.** Pairing is functional order / token (hash continuity, silent side-net). Products stay separate. FragGate stays THE single public door.

## Surfaces

- `GET /v1/mesh` and `GET /v1/mesh/status` → `channel_plane`, `channels`, `wifi` / `bluetooth` / `rf` / `photon`
- Human workspace `#op-panel` / `#dashboard` / `#mesh-panel` show the cite; they do not enable radios
- AZNet `pair_status` / `pair` report functional-order pair state with AZBrowser

Identity: **Aziel Eliab** only. Cap-7 / die-with-pull / FragGate sole door unchanged. No visible 15:20 chrome.
