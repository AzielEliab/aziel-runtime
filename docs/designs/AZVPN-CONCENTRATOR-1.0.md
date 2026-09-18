# AZVPN-CONCENTRATOR-1.0

**Aziel Eliab** only. Application-layer tunnel concentrator Softwares placement. Not a second door. FragGate stays THE single public exec door.

## This is

`azvpn` (**AZVPN**) is an in-runtime Softwares placement. Call only via FragGate:

`POST /v1/fraggate/call` `{ slug: "azvpn", op }`

AZVPN is the **automatic backend** for public VPN / tunnel concentrator use (`default_vpn_backend: "azvpn"`, `auto_use: true`). Mesh, AZNet pair, runtime session, and AZBrowser paths that need a tunnel auto-select AZVPN. Callers do not name `software=azvpn`. Explicit `azvpn/*` ops still exist.

| Kind | Honesty | What happens |
| --- | --- | --- |
| HTTPS / FragGate envelopes | **REAL** | `open` / `send` / `recv` / `close` / `list` / `status` / `peers` / `attach` |
| WebSocket attach | **REAL** | Same inbox; ticket from `open` / `attach`. Data-plane of this concentrator, not a second exec door |
| WireGuard UDP | **SLOT** | Refuse `AZVPN-SLOT-WIREGUARD` |
| OpenVPN | **SLOT** | Refuse `AZVPN-SLOT-OPENVPN` |
| L3 exit-IP pool / tun/tap | **SLOT** | Refuse `AZVPN-SLOT-L3-EXIT` / `AZVPN-SLOT-KERNEL` |

Public cite (`GET /v1/mesh` and AZVPN describe):

- `vpn: true`
- `public_vpn: true`
- `tunnel_concentrator: true`
- `concentrator_slug: "azvpn"`
- `default_vpn_backend: "azvpn"`
- `auto_use: true`
- `worker_terminates_tunnels: true` (app-layer sessions)
- `worker_terminates_kernel_udp: false`

`GET /v1/mesh` **cites** the auto-bind and **never opens** a session. `POST` mesh `vpn`, paired AZNet `pair_status`, armed session open (`vpn` / `public_vpn` / `tunnel`), and AZBrowser `vpn` call `ensureDefaultVpnSession`. If auto cannot start, refuse honestly — never fake connected.

The Worker **does** terminate HTTPS/FragGate (and optional WS) sessions. It does **not** host a classic WireGuard/OpenVPN kernel UDP concentrator. Do not draw a “connected to WireGuard” UI.

## Live ops

`describe`, `open`, `status`, `list`, `close`, `send`, `recv` (alias `pull`), `peers`, `attach`, plus `health` / `skill` / `doctor` / `limitation`.

Launch hashtags: `#azvpn`, `#azvpn-concentrator`, `#azvpn-session`, `#azvpn-auto` plus About Aziel.

## Softwares stay separate

AZBrowser, AZNet, FragGate, and AZVPN are sibling software under the same FragGate door. AZNet pairing remains order/token (pairing ≠ tunnel). AZBrowser `vpn` auto-binds AZVPN; it does not merge products.

## This is not

- A kernel VPN product
- Tor / SOCKS / origin-hiding
- GodLock-as-VPN
- Invented live RF/BT hardware
- A new MCP tool
- Visible 15:20 chrome

Identity: **Aziel Eliab** only.
