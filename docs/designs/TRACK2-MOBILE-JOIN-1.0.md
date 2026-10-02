# TRACK2-MOBILE-JOIN-1.0 — phone client of the local node

**Author:** Aziel Eliab only.  
**Status:** client present, not demonstrated.  
**Version:** runtime stays `2.0.0-rc1`. Not a new MCP tool. Softwares stay 42. `tools/list` stays 36.

This paper is the runbook for the phone client. The bytes are the LAN beacon and the sealed peer session already implemented in `src/fed-mesh/track2.js`. The client does not define a second protocol.

`mobile_client` is `present-not-demonstrated`. `mobile_demonstrated` is false. `app_store_release` is false. `second_device` stays false. `alt_internet_live` stays false. `packet_path_live` stays false.

## What the phone is

The phone is a client of one local `qnm-node` process on the same LAN. The runnable client is `qnm-node/mobile/`, served by that process at `/mobile/`. Android Chrome and iPhone Safari both open that page. Add to Home Screen saves the shell. That is not a store listing.

Wi-Fi on the phone is how the phone reaches the node's LAN socket. That reach is the LAN carrier (`join_carrier: lan`). It does not set `peer_exchange_demonstrated` on Wi-Fi, Bluetooth, RF, or photon. RF and photon stay `QNM-RADIO-ABSENT` without that hardware. No mock LIVE.

The public Worker does not serve this page. FragGate `mesh` and `aznet` stay `FG-STUB` for `mesh_discover`, `peer_session_open`, and the carrier ops. GET never arms a radio. The Worker does not invent peers.

## Wire

Canonical JSON is sorted keys, the same bytes `src/fed-mesh/codec.js` already signs. Signatures are Ed25519. The share cipher is X25519 + HKDF-SHA-256 + AES-GCM from `src/fed-mesh/e2e.js`. The HKDF salt is `FED-MESH-1.0`. The info string is `FED-MESH-1.0|<from session id>|<to session id>|<seq>`.

### Beacon

`POST /v1/fed-mesh/discover` with the beacon object. The node answers with its own beacon. Two posts make the roster mutual. The beacon fields are:

| Field | Value |
|---|---|
| `v` | `D2D-CARRIERS-1.0` |
| `kind` | `beacon` |
| `plane` | `track2-reachability` |
| `presence` | `live` |
| `tip_hash` | 64 hex characters |
| `prev` | 64 hex characters |
| `handle` | self-certifying `#` + 11 Crockford characters |
| `public_key` | Ed25519 raw key, base64url |
| `enc_public_key` | X25519 raw key, base64url |
| `carrier` | `lan` |
| `direct_url` | optional. The phone omits it. |
| `sig` | Ed25519 over the other fields |

A body, payload, or plaintext on that object is `MESH-NO-BYTES`. A carrier other than `lan` is `FG-STUB`. The phone's own tip is the zero hash. It has no chain. The beacon the page shows is the node's `presence` and `tip_hash`.

`GET /v1/fed-mesh/discover` is the roster. It reports `fixture` and `second_device`. It does not arm. An unarmed node returns `MESH-OFF`. `GET /v1/fed-mesh/arm` returns `MESH-OFF`. The client has no arm call.

### Sealed session

After two verified beacons, the phone posts `POST /v1/fed-mesh/peer-session`. The body is a `peer-session` offer signed by the phone's long-term key:

| Field | Value |
|---|---|
| `kind` | `peer-session` |
| `plane` | `track2-reachability` |
| `session_id` | `d2d_` + 32 hex characters |
| `handle` / `node_public_key` | the phone's long-term identity |
| `session_handle` / `session_public_key` / `session_enc_public_key` | a new session key, not the long-term key |
| `peer_handle` | the node handle from the beacon |
| `route_class` | `direct` |
| `bearer_mode` | `loopback` on 127.0.0.1 / localhost / `::1`, otherwise `direct-lan` on a LAN address |

The node accepts and returns a counter-offer signed by the node's long-term key. The phone checks that signature, checks the session key is not the node key, and marks the session open. That is `peer_tunnel: LIVE-when-session` for this session. It is not alt-internet LIVE.

`POST /v1/fed-mesh/peer` carries a `peer-share`: ciphertext, nonce, and ephemeral X25519 key. The session signature covers those fields. The envelope has no plaintext. The node opens it with the session key.

A public hostname is refused (`FED-MESH-NO-ROUTE`). STUN, TURN, and NAT punch are refused (`FED-MESH-NAT-REFUSE`).

## Run

On the computer, with its LAN address:

```bash
node qnm-node/fed-instance.mjs --data ./data/a --port 8781 --host 0.0.0.0 --advertise 192.168.1.10 --arm lan --fixture
```

`--fixture` is the no-second-device mode. The printed `mobile_join` URL is `http://192.168.1.10:8781/mobile/`. `0.0.0.0` is the listen bind. `--advertise` is the address the phone uses. GET does not arm the radio.

### Android

1. Join the same Wi-Fi as that computer.
2. Open `http://<lan-ip>:8781/mobile/` in Chrome.
3. Add to Home Screen, or Install app, if Chrome offers it.
4. Read roster. Discover beacon. Open sealed session.

### iPhone

1. Join the same Wi-Fi as that computer.
2. Open `http://<lan-ip>:8781/mobile/` in Safari.
3. Share, then Add to Home Screen.
4. Read roster. Discover beacon. Open sealed session.

The home-screen icon is this shell. Discovery still needs the local node. The service worker caches the shell and does not answer `/v1/` by itself. A reload of the page makes a new handle. Keys stay in the page. That handle is not a demonstrated device.

## Honesty

| Field | Value |
|---|---|
| `mobile_client` | `present-not-demonstrated` |
| `mobile_demonstrated` | false |
| `app_store_release` | false |
| `second_device` | false |
| `join_carrier` | `lan` |
| `wifi_peer_exchange_demonstrated` | false |
| `rf_live` / `photon_live` | false |
| `alt_internet_live` | false |
| `public_door` | `FG-STUB` |

A protocol test (`node scripts/verify-track2-mobile.mjs`) runs the client against the local node in this process. It checks the beacon, the roster flags, and one sealed share. It is not a phone on a desk. Passing that test does not flip `mobile_client`, `second_device`, or `alt_internet_live`.

## What this cut does not do

No store listing. No DNS change. No Cap-7 egress. No new MCP tool. No Softwares card. No Worker peer. No mock RF. No mock photon. No claim that a phone on Wi-Fi demonstrated the Wi-Fi carrier.
