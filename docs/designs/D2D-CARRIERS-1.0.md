# D2D-CARRIERS-1.0 — device-to-device packet carriers (Phase A)

**Author:** Aziel Eliab only.  
**Phase:** A (honesty + scaffolding).  
**Version:** runtime stays `2.0.0-rc1`. Not a new MCP tool. Softwares stay 42. `tools/list` stays 36.

This plane is device-to-device packet reachability. It is separate from Cap-7. Design names: the name plane is **Plane N** and the packet plane is **Plane P** ([`PLANE-P-D2D-1.0.md`](PLANE-P-D2D-1.0.md)). That sketch is not a LIVE public packet egress. This scaffold does not build the prefer-order selector, does not forward packets, and does not close WARN-5.

## Two planes

| Plane | What it is | This cut |
|---|---|---|
| Plane N (name) | Cap-7 / MirageGrid land-region metadata and `.aziel` records | Cap-7 factory exec stays on that plane. Not an ICANN registrar. Not a public egress IP. Not AZVPN. Cap-7 is not the public Internet. |
| Plane P (packet) | Node-mesh hops between devices | Scaffold only. `status` NOT-READY. FragGate code `FG-STUB`. `packet_path_live` false. `alt_internet_live` false. Not a LIVE public packet egress. |

`not_a_second_internet` stays true. `aznet_replaces_internet` stays false. WARN-5 stays `STANDS-until-demonstrated`. That status is not a permanent stay-off. Field 1.0 is not claimed.

## Carrier failover

Order is fixed. A later carrier is the fallback when the earlier path is absent or not yet a real hop. Phase A does not open any of them.

Operator lock: **LAN → Wi-Fi → Bluetooth → RF → Photon light flashes**.

| Order | Carrier | Hop | Honesty |
|---|---|---|---|
| 1 | LAN | `d2d_lan` | NOT-READY / FG-STUB. Wired or same-L2 when the interface exists. |
| 2 | Wi-Fi | `d2d_wifi` | NOT-READY / FG-STUB. Infrastructure and Wi-Fi Direct when armed. A channel-plane cite is not this hop. |
| 3 | Bluetooth | `d2d_bluetooth` | NOT-READY / FG-STUB. BlueZ when the radio is present. |
| 4 | RF | `d2d_rf` | Functional carrier. Dedicated hop beyond Wi-Fi and Bluetooth. Cellular / ModemManager when that radio is present. `QNM-RADIO-ABSENT` when it is absent. No mock LIVE. |
| 5 | Photon | `d2d_photon` | Functional carrier. Last resort. Camera and flash or LED. `QNM-RADIO-ABSENT` when that hardware is absent. Local `qnsd` is not this flash path. No mock LIVE. |

Plane tag on receipts: `track2-reachability`.

FragGate names that stay `FG-STUB` on `mesh` and `aznet` until a real path works: `mesh_discover`, `peer_advertise`, `peer_list`, `peer_session_open`, `peer_session_status`, `peer_session_close`, `peer_send`, `peer_recv`, `outbox_enqueue`, `outbox_cut`, `store_forward`, `path_probe`, `bootstrap_list`, `shelf_cite`, `tip_pull`, `origin_status`, plus discovery, tunnel, and multi-hop. `store_forward` and `path_probe` also cite `MESH-NO-ROUTE`. `relay_forward` stays the existing FED-MESH op and is not this stub. Cap-7 painted as a public egress IP stays `MG-NOT-PUBLIC-EGRESS` on the engine, classed `MG-NO-IP-EXIT`. `negotiateBearer` still refuses `icann` and `cap7-egress` with `AZP-BEARER-REFUSE`.

Local `track2CarrierProbe()` may report `HW-PRESENT` or `REFUSE`. It never reports `LIVE`. A LIVE packet hop needs a demonstrated peer exchange, which this phase does not have.

Discovery (`d2d_discover`), tunnel (`d2d_tunnel`), and multi-hop (`d2d_multi_hop`) use the same refuse. `confirm: true` does not promote a stub. `dry_run` returns the same `FG-STUB` and writes no ledger.

Direct `runMeshOp` on those names returns `MESH-STUB` with `door_code` `FG-STUB` and `status` `NOT-READY`.

## What stays put

- Channel-plane cites (`wifi` / `bluetooth` / `rf` / `photon` = `on`) stay cites. `worker_hardware` stays false.
- Local `qnm-node/bearers/radio.js` may read hardware presence as LIVE. `packet_hop` stays false. That reading is not a packet hop.
- Isolation is single-node security-awareness. Phoenix is local wait / re-seal. `mesh_fenced_to_loopback` stays false.
- No live DNS change. No origin cutover. No merge of MirageGrid with AZVPN. No Wi-Fi Direct, Bluetooth, or multi-hop WAN implementation in this phase.

`GET /v1/mesh` publishes `d2d_carriers`. AZNet `one_line` names the name plane and the NOT-READY carrier stack. Close-test: `node scripts/verify-d2d-carriers.mjs`.

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
