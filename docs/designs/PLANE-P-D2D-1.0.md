# PLANE-P-D2D-1.0 — node-mesh packet path

**Author:** Aziel Eliab only.  
**Operator lock:** Aziel Eliab, 2026-10-02, via AZBot.  
**Kind:** design sketch and honesty notes. This paper does not implement hops, does not deploy, and does not edit Softwares.  
**Not a Softwares card. No new MCP tool.** Softwares stay 42. `tools/list` stays 36.

Plane P is the device-to-device packet path: a node-mesh alternative internet, separate from ICANN. This repository does not have that path in operation. This paper is not a LIVE public packet egress, not a multi-node PASS, and not an Internet-comparable BGP claim. It is not BGP.

WARN-5 is **STANDS-until-demonstrated**. Operator lock 2026-10-02: that status is not a permanent ceiling and is not a permanent stay-off. BY-DESIGN the mesh internet stays separate from ICANN. The missing demonstration is not a refusal to build. Map: [`MESH-INTERNET-WARNS-1.0.md`](MESH-INTERNET-WARNS-1.0.md).

## Dual plane

Two planes. They are not the same network. Cap-7 and `.aziel` do not become packet routes by being named on Plane N.

| Plane | Also called | What it is | This cut |
|---|---|---|---|
| Plane N | Track 1 | Cap-7 and `.aziel` **names** | Names as they ship today. Cap-7 factory exec is LIVE on that name plane (region label, sticky mesh node, factory land). Not a public egress IP. Not an ICANN registrar. Not packet forward. Cap-7 is not the public Internet. |
| Plane P | Track 2 | Node-mesh **packet / path**. Devices are the nodes. | Designed. SLOT as a public path until real hops exist. WARN-5 is STANDS-until-demonstrated. BY-DESIGN separate from ICANN. Not BGP. Not demonstrated. Not a refusal to build. |

`not_a_second_internet` stays true for Plane N: the name plane does not replace the ICANN internet. `aznet_replaces_internet` stays false. Plane P is a different goal. It is not a claim that Cap-7 already is that internet, and it is not a claim that the packet path is LIVE.

`negotiateBearer` refuses `icann` and `cap7-egress` with `AZP-BEARER-REFUSE`. A name miss or a hash mismatch on `.aziel` is `FG-GATE-REFUSE` (AZBrowser #17 from the local ledger plus the relay; runtime #201 from a posted ledger or relay snapshot). The Worker does not query ICANN DNS and does not dial a LAN peer from that name-read.

## What is already live, and what is not

| Surface | Honest status |
|---|---|
| Cap-7 `geo-target`, `session-stick`, `egress-rotate` | LIVE on Plane N. Metadata and session land. Not a public egress IP. Not residential. Not a Cloudflare geo-exit pool. Not a sticky public IP. Not packet forwarding. Not AZVPN. |
| `.aziel` name records and relay name-read | LIVE protocol path on Plane N. Not a packet hop. |
| AZP route classes `direct` and `relay` | Admitted names. `negotiateBearer` returns `live: false` for those names (`configured: "caller"`). Not Plane P public egress. |
| L0 HTTPS relay | The default public path for signed envelopes. One relay among many. Not the device-to-device packet internet. |
| `direct-lan` | `live-when-configured`. LIVE only when a node names a direct or LAN URL. The Worker does not discover a LAN. |
| Local radio / photon hooks | LIVE on that device only while the hardware or local `qnsd` is present. Absent is `QNM-RADIO-ABSENT`. No mock LIVE. |
| Worker `wifi` / `bluetooth` / `rf` / `photon` = `"on"` | Channel-plane **cite**. `worker_hardware: false`. Not a LIVE hop and not public egress. |
| Open-world awareness law | LIVE as law. Socket is LIVE only while local `qnm-node/awareness.mjs` listens on `0.0.0.0`. Otherwise `live-when-configured`. The listen does not forward packets. |
| Plane P as a public packet path | Not demonstrated. Do not paint it LIVE. |

`live_multi_provider` stays false. `{slug}-worker` rows are the same-Worker product roster. They are not independent device nodes.

## Device nodes

A Plane P node is a device running local `qnm-node` with its own key and its own handle (FED-MESH-1.0). Raw data and signing keys stay on that device. The Worker relay stores and serves refs. It does not execute peer code and it does not forward Plane P packets.

Open-world awareness is the outward listen on `0.0.0.0` (all interfaces). It sits **beside** the carriers. It is not carrier 1 and it is not a hop.

| Ask | Code | Meaning |
|---|---|---|
| Bind awareness on a host other than `0.0.0.0` | `QNM-AWARENESS-BIND` | No listen. A loopback host is not this bind. |
| Any method other than GET on the awareness socket | `QNM-AWARENESS-READ` | Awareness is a read. `packet_forward` stays false. |
| Any path other than `/`, `/awareness`, or `/health` | `QNM-AWARENESS-ABSENT` | No invented route. |

`forced_loopback` and `loopback_isolation` are not the mesh fence. `mesh_fenced_to_loopback` stays false. Local `qnsd` may bind `127.0.0.1`. That bind is a process bind for the photon via. It does not fence the mesh.

## Security on a failed hop

Isolation is single-node security-awareness. A node isolates a bad peer or itself. That does not fence the whole mesh to `127.0.0.1`.

Phoenix is the local reboot loop: wait, then re-seal (`phoenix_lock`). `phoenix_local_only` stays true. `neighbor_phoenix` stays false. Phoenix does not resurrect a public hostname. An ask to bring a public hostname back stays `MESH-STUB`. Neighbors do not phoenix because a neighbor phoenix'd. Heartbeat loss does not apply the last packet.

Split the wires still holds when a real hop exists: the fast tick is presence and tip hash only. Payload is receiver-pull. This paper does not add that pull.

## Carriers (prefer order)

Functional carriers, in the order a device should prefer once a real selector exists. **This cut does not implement that selector.** `qnm-node/bearers/radio.js` probes each local carrier on its own. FED-MESH uses a configured direct URL or the relay. Neither path walks this list, and neither path is public packet egress.

A packet is for a peer the device already knows (a configured URL or prior local presence). This paper does not add LAN discovery, STUN, TURN, or NAT punch.

| Order | Carrier | Kind | Present means | Absent or not configured | Code already in the tree |
|---|---|---|---|---|---|
| 1 | LAN | Configured path. Not a radio probe. | The node has named a `direct-lan` URL (`http://<lan-ip>:<port>/v1/fed-mesh/direct`). `0.0.0.0` is a listen bind, not a peer URL. | Unconfigured stays `live-when-configured`, not LIVE. The Worker does not discover a LAN. A punch, STUN, TURN, or `stun:` / `turn:` URL refuses. | `FED-MESH-NAT-REFUSE` for a punch ask. `AZP-BEARER-REFUSE` for bearer names `stun` and `turn`. |
| 2 | Wi-Fi | Real local hardware. | `ieee80211` or a wireless sysfs entry on that device. Local hook `state: "LIVE"`, `mock: false`. | Refuse. Do not invent an interface. | `QNM-RADIO-ABSENT` |
| 3 | Bluetooth | Real local hardware. | `/sys/class/bluetooth` has entries. Local hook `state: "LIVE"`, `mock: false`. | Refuse. Do not invent an adapter. | `QNM-RADIO-ABSENT` |
| 4 | RF | **Real carrier.** SDR. Not Wi-Fi. | `/dev/swradio0`, `/sys/class/sdr`, or the rtl USB driver on that device. | Refuse. **No mock LIVE.** The public Worker still has `radio_phy: false` (it does not claim a PHY). The AZP bearer name `radio` is a different surface and stays refused. | Local hook: `QNM-RADIO-ABSENT`. AZP negotiator: `AZP-BEARER-REFUSE` for the name `radio`. |
| 5 | Photon light flashes | **Real carrier.** Local `qnsd`, photon QNS1 1.3. | `qnsd` socket or process on that device. | Refuse. **No mock LIVE.** The Worker cites `GET /v1/qns` and does not emit. | Local hook: `QNM-RADIO-ABSENT`. Worker POST `/v1/qns`: `QNS-CITE-ONLY`. Worker POST `/v1/qns/via`: `QNS-NO-PROXY`. |

Worker channel cites stay `"on"` for Wi-Fi, Bluetooth, RF, and photon whether or not this machine has the hardware. That word is the operator-armed cite (`QNM-CHANNEL-PLANE-1.0`). It is not a LIVE packet hop. `worker_hardware` stays false. `invented_hardware` stays false. `public_proxy` stays false.

SPORE-1.0 on the local radio hook: if no local radio hardware is present, mode is dormant (pause, preserve, wait). Do not invent a LIVE beat.

## Designed hop (not built)

This is the sketch. It is not a backend.

1. The device is the node (own key, own handle).
2. Awareness may listen on `0.0.0.0` and answer GET. It does not forward.
3. The node addresses a peer it already knows. Plane N may supply a name. A name miss is `FG-GATE-REFUSE` and does not open a hop. Cap-7 land is not an egress IP.
4. A future selector walks the table above and uses the first carrier that is configured or has hardware. Each miss returns that row's code and stays `live: false`.
5. The body stays off the presence tick.
6. A bad peer or a failed seal isolates that node, then phoenix waits and re-seals locally.

Until that selector exists on real devices, Plane P stays designed. Do not mark a fixture walk, a channel cite, or a Cap-7 land rotate as the demonstration that closes WARN-5.

## Brands that stay apart

AZVPN is the suite VPN concentrator (HTTPS and WebSocket on the public concentrator). WireGuard, OpenVPN, and L3 stay SLOT. MirageGrid Cap-7 is the mesh-name factory. Mirage is not AZVPN. `mirage_is_azvpn` stays false. Mirage `vpn-hop`, `hop`, `tunnel`, and `mesh` stay FG-STUB in current law. This paper does not change those verbs.

`CLAIM_LIMITS` stays as published: `cap7_public_icann` false, `cap7_public_egress` false, `aznet_replaces_internet` false, `tor_live` false, `udp_live` false, `radio_live` false, `sandbox_live` false, `live_multi_provider` false.

## Softwares follow-on (not this paper)

AZBot Phase A (cloud agent `bc-c5243c31-a34c-5ed5-80a9-186f7d8f9297`) owns Softwares catalog honesty and FG-STUB D2D mesh ops on this repository. This paper does not edit the Softwares catalog, a Softwares engine, or FragGate stub tables. Front-door packet, hop, tunnel, and mesh-internet verbs stay out of this pull request. They stay SLOT or refused until real hops exist. They must not be painted as LIVE public egress.

## Phase A scaffold (landed, still not a hop)

[`D2D-CARRIERS-1.0.md`](D2D-CARRIERS-1.0.md) is the Phase A honesty scaffold this sketch pointed at. It is on the tree. It is not a LIVE public packet egress.

- Status stays `NOT-READY`. FragGate on `mesh` and `aznet` returns `FG-STUB`. `alt_internet_live` stays false. `packet_path_live` stays false. WARN-5 stays STANDS-until-demonstrated. This scaffold does not close it.
- Carrier order matches this paper: LAN, Wi-Fi, Bluetooth, RF, then photon light flashes.
- The photon **flash hop** in that scaffold is camera and flash or LED. Absent hardware is `QNM-RADIO-ABSENT`. Local `qnsd` stays the QNS cite (`QNS-CITE-ONLY`, `QNS-NO-PROXY`). It is not that flash path. A local radio-hook reading of `qnsd` stays hardware presence (`packet_hop` false). It is not a packet hop and not mock LIVE.
- The RF **hop** in that scaffold is the dedicated carrier beyond Wi-Fi and Bluetooth (cellular / ModemManager when that radio is present). Absent is `QNM-RADIO-ABSENT`. The SDR row in the table above stays a local hardware-presence hook. It is not a LIVE packet hop.
- `track2CarrierProbe()` may report `HW-PRESENT` or `REFUSE`. It never reports `LIVE`.
- The prefer-order selector that would open a hop is still not built. Phase A does not implement it and does not forward packets.
- This Plane P paper still does not edit the Softwares catalog. Catalog strings and the FG-STUB op tables live in the Phase A scaffold. Softwares stay 42. `tools/list` stays 36.

## What this cut does not do

No Worker deploy. No DNS change. No NAT punch. No new hop process. No mock RF. No mock photon. No claim that channel-plane `"on"` is hardware. No claim that open-world awareness forwards packets. No claim that Plane P is LIVE. No Internet-comparable BGP. No new Softwares card. No new MCP tool. No merge of AZVPN and MirageGrid.

Cross-links: [`D2D-CARRIERS-1.0.md`](D2D-CARRIERS-1.0.md), [`MESH-INTERNET-WARNS-1.0.md`](MESH-INTERNET-WARNS-1.0.md), [`FED-MESH-1.0.md`](FED-MESH-1.0.md), [`QNM-CHANNEL-PLANE-1.0.md`](QNM-CHANNEL-PLANE-1.0.md), [`QNS-CD-1.0.md`](QNS-CD-1.0.md), [`NODE_MESH.md`](../NODE_MESH.md).
