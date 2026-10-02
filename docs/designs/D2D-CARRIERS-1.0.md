# D2D-CARRIERS-1.0 — device-to-device packet carriers (Phase A)

**Author:** Aziel Eliab only.  
**Phase:** A (honesty + scaffolding).  
**Version:** runtime stays `2.0.0-rc1`. Not a new MCP tool. Softwares stay 42. `tools/list` stays 36.

This plane is device-to-device packet reachability. It is separate from Cap-7.

## Two planes

| Plane | What it is | This cut |
|---|---|---|
| Name | Cap-7 / MirageGrid land-region metadata and `.aziel` records | Cap-7 factory exec stays on that plane. Not an ICANN registrar. Not a public egress IP. Not AZVPN. |
| Packet | Node-mesh hops between devices | Scaffold only. `status` NOT-READY. FragGate code `FG-STUB`. `packet_path_live` false. `alt_internet_live` false. |

`not_a_second_internet` stays true. `aznet_replaces_internet` stays false. WARN-5 stays `STANDS-until-demonstrated`. That status is not a permanent stay-off. Field 1.0 is not claimed.

## Carrier failover

Order is fixed. A later carrier is the fallback when the earlier path is absent or not yet a real hop. Phase A does not open any of them.

| Order | Carrier | Hop | Honesty |
|---|---|---|---|
| 1 | LAN | `d2d_lan` | NOT-READY / FG-STUB |
| 2 | Wi-Fi | `d2d_wifi` | NOT-READY / FG-STUB. NetworkManager / Wi-Fi Direct is the intended binding. A channel-plane cite is not this hop. |
| 3 | Bluetooth | `d2d_bluetooth` | NOT-READY / FG-STUB. BlueZ is the intended binding. |
| 4 | RF | `d2d_rf` | Dedicated RF mesh hop beyond Wi-Fi and Bluetooth. Prefer cellular / ModemManager when that radio is present. Refuse when it is absent. No fake LIVE. |
| 5 | Photon | `d2d_photon` | Last resort. Optical / LiFi-style light-flash encoding. Refuse when camera or flash hardware is absent. Local `qnsd` is not this flash path. No mock LIVE. |

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
