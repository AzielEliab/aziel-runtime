# D2D-CARRIERS-1.0 — device-to-device packet carriers

**Author:** Aziel Eliab only.  
**Phase:** A landed. B and C run on the local node. D is LIVE-when-three-local-nodes / fixture. E is scaffold.  
**Version:** runtime stays `2.0.0-rc1`. Not a new MCP tool. Softwares stay 42. `tools/list` stays 36.

This plane is device-to-device packet reachability. It is separate from Cap-7. Design names: the name plane is **Plane N** and the packet plane is **Plane P** ([`PLANE-P-D2D-1.0.md`](PLANE-P-D2D-1.0.md)). The public Worker door stays NOT-READY / FG-STUB. `alt_internet_live` stays false. WARN-5 stays STANDS-until-demonstrated.

## Two planes

| Plane | What it is | This cut |
|---|---|---|
| Plane N (name) | Cap-7 / MirageGrid land-region metadata and `.aziel` records | Cap-7 factory exec stays on that plane. Not an ICANN registrar. Not a public egress IP. Not AZVPN. Cap-7 is not the public Internet. |
| Plane P (packet) | Node-mesh hops between devices | Public door `status` NOT-READY / `FG-STUB`. Local LAN discovery is LIVE-when-armed. Peer tunnel is LIVE-when-session. Local store-forward is LIVE-when-three-local-nodes / fixture. `packet_path_live` false. `alt_internet_live` false. Not a LIVE public packet egress. WARN-5 is not closed. |

`not_a_second_internet` stays true. `aznet_replaces_internet` stays false. WARN-5 stays `STANDS-until-demonstrated`. That status is not a permanent stay-off. Field 1.0 is not claimed.

## Carrier failover

Order is fixed. A later carrier is the fallback when the earlier path is absent or not yet a real hop. The public door does not open them. The local node opens LAN when the operator arms it.

Operator lock: **LAN → Wi-Fi → Bluetooth → RF → Photon light flashes**.

| Order | Carrier | Hop | Honesty |
|---|---|---|---|
| 1 | LAN | `d2d_lan` | Public door NOT-READY / FG-STUB. Local node: LIVE-when-armed after two peers verify beacons. |
| 2 | Wi-Fi | `d2d_wifi` | Public door NOT-READY / FG-STUB. Local arm is ARMED-when-HW. A channel-plane cite is not this hop. |
| 3 | Bluetooth | `d2d_bluetooth` | Public door NOT-READY / FG-STUB. Local arm is ARMED-when-HW. BlueZ presence is not a demonstrated hop. |
| 4 | RF | `d2d_rf` | Functional carrier. Dedicated hop beyond Wi-Fi and Bluetooth. Cellular / ModemManager when that radio is present. `QNM-RADIO-ABSENT` when it is absent. No mock LIVE. |
| 5 | Photon | `d2d_photon` | Functional carrier. Last resort. Camera and flash or LED. `QNM-RADIO-ABSENT` when that hardware is absent. Local `qnsd` is not this flash path. No mock LIVE. |

Plane tag on receipts: `track2-reachability`.

FragGate names that stay `FG-STUB` on `mesh` and `aznet` until a real path works: `mesh_discover`, `peer_advertise`, `peer_list`, `peer_session_open`, `peer_session_status`, `peer_session_close`, `peer_send`, `peer_recv`, `outbox_enqueue`, `outbox_cut`, `store_forward`, `path_probe`, `bootstrap_list`, `shelf_cite`, `tip_pull`, `origin_status`, plus discovery, tunnel, and multi-hop. `store_forward` and `path_probe` also cite `MESH-NO-ROUTE`. `relay_forward` stays the existing FED-MESH op and is not this stub. Cap-7 painted as a public egress IP stays `MG-NOT-PUBLIC-EGRESS` on the engine, classed `MG-NO-IP-EXIT`. `negotiateBearer` still refuses `icann` and `cap7-egress` with `AZP-BEARER-REFUSE`.

Local `track2CarrierProbe()` may report `HW-PRESENT` or `REFUSE`. It never reports `LIVE`. A LIVE LAN discovery row needs two verified beacons. RF and photon still have no demonstrated exchange.

Discovery (`d2d_discover`), tunnel (`d2d_tunnel`), and multi-hop (`d2d_multi_hop`) use the same refuse. `confirm: true` does not promote a stub. `dry_run` returns the same `FG-STUB` and writes no ledger.

Direct `runMeshOp` on those names returns `MESH-STUB` with `door_code` `FG-STUB` and `status` `NOT-READY`.

## What stays put

- Channel-plane cites (`wifi` / `bluetooth` / `rf` / `photon` = `on`) stay cites. `worker_hardware` stays false.
- Local `qnm-node/bearers/radio.js` may read hardware presence as LIVE. `packet_hop` stays false. That reading is not a packet hop.
- Isolation is single-node security-awareness. Phoenix is local wait / re-seal. `mesh_fenced_to_loopback` stays false.
- No live DNS change. No origin cutover. No merge of MirageGrid with AZVPN. No Wi-Fi Direct or Bluetooth exchange. No multi-hop WAN. The local three-node path is an in-process fixture.

`GET /v1/mesh` publishes `d2d_carriers`. AZNet `one_line` names the name plane and the NOT-READY public door. Close-test: `node scripts/verify-d2d-carriers.mjs`. Local discovery and session close-test: `node scripts/verify-track2-d2d.mjs`.

## Phase B and C (local node)

The prefer-order walk and the peer session live in `src/fed-mesh/track2.js`, on `qnm-node/fed-instance.mjs` and `startInstance`. The Worker cites the plane. `worker_hardware` stays false. GET never arms a carrier.

| Surface | Honesty |
|---|---|
| LAN discovery | `LIVE-when-armed`. Beacon is presence and tip hash. Two verified beacons each way mark the local roster LIVE. One beacon stays fixture. No second physical device stays `second_device: false` and `fixture: true` when the node is in fixture mode. |
| Wi-Fi / Bluetooth | `ARMED-when-HW`. Arm records real hardware. A LAN beacon is not that exchange. |
| RF / photon | `REFUSE-without-HW` (`QNM-RADIO-ABSENT`). Hardware presence is still not a LIVE hop. No mock LIVE. |
| Peer tunnel | `LIVE-when-session` after discovery. Session signing key is not the node key. Route class is `direct` when `direct-lan` or loopback classifies, else admitted `relay`. Loopback is not the mesh fence. |
| Public FragGate `mesh` / `aznet` | Stays `FG-STUB`, including `mesh_discover` and `peer_session_open`. The Worker does not invent peers and does not paint `live_nodes`. |
| Mirage `vpn-hop` / `hop` / `tunnel` / `mesh` | Stays `FG-STUB`. This tunnel is not AZVPN. |
| Cap-7 as a discovery bearer | `MG-NO-IP-EXIT` for egress paint. `negotiateBearer` still refuses `icann` and `cap7-egress` with `AZP-BEARER-REFUSE`. |
| STUN / TURN / NAT punch | `FED-MESH-NAT-REFUSE`. |
| Tick body | `MESH-NO-BYTES`. |
| APG poison on ingress | `FED-MESH-POISON`. That peer is isolated. Other roster rows stay. |
| Equivocation | `FED-MESH-FORK`. That peer only. Neighbors do not phoenix. |
| Phoenix | Local wait / re-seal. `phoenix_lock` stays wait-reseal. |

Operator arm is `POST /v1/fed-mesh/arm` or `--arm lan` / `--arm order`. `GET /v1/fed-mesh/arm` returns `MESH-OFF`.

### Phase D (local three-node fixture)

`enqueue` writes `track2-outbox.json` with ciphertext only. A tick stays presence and tip hash (`MESH-NO-BYTES`). The next node pulls the sealed share. `forward` admits a roster handle or an explicit allow list. The hop counter stays below 3. A→B→C is the exit (`MESH-NO-ROUTE`, `FED-MESH-NO-ROUTE`). No DHT. No BGP. Cap-7 is not a forward bearer. STUN and TURN stay refused.

Three in-process nodes deliver a sealed object. Each hop signs a receipt. A stranger recomputes the hash and checks the signature. `second_device` stays false. `physical_devices` stays 1. That label is `LIVE-when-three-local-nodes / fixture`. It is not a second physical device.

Partition keeps each island's own tip. Rejoin is a cited tip plus an operator or lockset gate. Vote-to-heal is `MESH-NO-NEIGHBOR-HEAL`. Equivocation isolates that peer. Phoenix stays local wait / re-seal.

Public FragGate `store_forward` and multi-hop names stay `FG-STUB`. The Worker does not invent peers and does not paint `live_nodes` from this path. `packet_path_live` stays false. `alt_internet_live` stays false. WARN-5 is not closed.

### Phase E (scaffold only)

A signed bootstrap peer list may be empty. `needs_starting_address` stays true. Shelf cite slots name Plane A as cite and Plane B and Plane C as SLOT. `live_multi_provider` stays false. Cold shelves are not painted LIVE. This phase does not cut DNS and does not touch origin cutover. AZNet stamp and verify stay hash continuity. AZNet does not host payloads.

### What remains before WARN-5 can move

WARN-5 stays `STANDS-until-demonstrated`. Still required, and not claimed here:

- A second physical device on LAN, then a demonstrated exchange on Wi-Fi, Bluetooth, RF, or photon. RF and photon stay refused until that hardware and that exchange exist. `peer_exchange_demonstrated` stays false on those carriers.
- Track 2 addressing on separate hosts, not three peers in one process. The fixture receipts do not close WARN-5.
- Track 2 addressing that is not Cap-7 and not ICANN. `negotiateBearer` still refuses `icann` and `cap7-egress`.
- `live_multi_provider` stays false. `{slug}-worker` rows stay software workers, not device peers.

Exit for this slice: three local nodes deliver a sealed object a stranger can recompute, labeled fixture. That is not alt-internet LIVE. WARN-5 is not closed.

## Mobile join client

`qnm-node/mobile/` is a client of this local node. It is served at `/mobile/` by `qnm-node/fed-instance.mjs`. The page discovers the existing LAN beacon (presence and tip hash only) and opens the sealed peer session `src/fed-mesh/track2.js` already speaks. There is no second protocol. Paper: [`TRACK2-MOBILE-JOIN-1.0.md`](TRACK2-MOBILE-JOIN-1.0.md).

`mobile_client` stays `present-not-demonstrated`. `mobile_demonstrated` stays false. `app_store_release` stays false. `second_device` stays false. A phone on Wi-Fi is the path to the LAN socket. That path does not set `peer_exchange_demonstrated` on Wi-Fi, Bluetooth, RF, or photon. RF and photon stay refuse-without-hardware. The public FragGate door stays FG-STUB. GET never arms radios. The Worker does not invent peers. `alt_internet_live` stays false.

Android and iPhone both open `http://<lan-ip>:<port>/mobile/` on the same LAN as the node. Add to Home Screen saves the shell. It is not a store listing. Close-test: `node scripts/verify-track2-mobile.mjs`. That test is the protocol. It is not a pretended phone.

## GitBaby deploy notes

Version stays `2.0.0-rc1`. Do not invent a `version_id`.

After review and CLEAR, from a checkout that has wrangler OAuth (no API token in the environment):

```bash
env -u CLOUDFLARE_API_TOKEN npx wrangler deploy --keep-vars --var GIT_SHA:$(git rev-parse HEAD)
```

Worker name is `aziel-runtime`. `--keep-vars` leaves existing Worker vars in place.

`GET /v1/software` publishes `version_id` from `CF_VERSION_METADATA.id` when that binding is present. Add `--var VERSION_ID:<worker-version-id>` only when that id is already known from a real deploy. An unbound isolate keeps `version_id: null`.

Do not change live DNS. Do not run origin cutover. Do not describe this deploy as a live alternative internet or as public IP egress.

Probe after deploy:

```bash
node scripts/probe-live.mjs
```

Confirm `GET /v1/mesh` `d2d_carriers.status` is `NOT-READY`, `d2d_carriers.alt_internet_live` is false, and `d2d_carriers.cap7_public_egress` is false. A FragGate call `{ slug: "mesh", op: "d2d_rf" }` returns `FG-STUB`.
