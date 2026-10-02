# Local `qnm-node` radio hooks

**Author:** Aziel Eliab only.

This directory is **hooks**, not the full local node process
(`boot` / `chain` / `apg` / `outbox` / `phoenix` / `score` / `memorial` / `tethers` / `qnsd`).
Parent still owns that package: [AzielEliab/qnm-node](https://github.com/AzielEliab/qnm-node).

## Law

- **LIVE** only when host hardware (wifi / bluetooth / rf) or local `qnsd` (photon) is present.
- **Refuse** `QNM-RADIO-ABSENT` when absent.
- **No mock LIVE.**
- Plane P carrier prefer order is LAN, then Wi-Fi, Bluetooth, RF, photon. The operator arms that order on the local node (`--arm` or `POST /v1/fed-mesh/arm`). GET never arms it. RF and photon stay real carriers. Absent hardware refuses `QNM-RADIO-ABSENT`. No mock LIVE. Paper: [PLANE-P-D2D-1.0](../docs/designs/PLANE-P-D2D-1.0.md). Cap-7 / `.aziel` stay names, not carriers.
- `track2CarrierProbe()` reports `HW-PRESENT` or `REFUSE` (`QNM-RADIO-ABSENT`). It never reports `LIVE`. LAN discovery is LIVE only after two peers verify beacons. A peer session is LIVE-when-session. Store-forward is LIVE-when-three-local-nodes / fixture. `alt_internet_live` stays false. WARN-5 is not closed. Paper: [D2D-CARRIERS-1.0](../docs/designs/D2D-CARRIERS-1.0.md).
- The public Worker `GET /v1/mesh` `channel_plane` stays **cite-only** (`worker_hardware: false`).
- Photon vias run on local `qnsd`, which binds `127.0.0.1`. That bind is not a fence of the mesh. Isolation is single-node security-awareness (a bad peer or self). Phoenix is a local reboot loop (`phoenix_lock`: wait / re-seal), not public hostname resurrection. Open-world awareness is a separate listen on `0.0.0.0` (`node qnm-node/awareness.mjs`). The operator lock is LIVE. This process is LIVE only while it is listening; otherwise the socket stays `live-when-configured`. `forced_loopback` and `loopback_isolation` are not the mesh fence. The listen does not forward packets and is not a Cap-7 public egress IP. The Worker never fetches `127.0.0.1`.

```bash
node qnm-node/radio.mjs
```

Close-test: `scripts/verify-qnm-radio.mjs` (part of `npm test`).

## FED-MESH-1.0 protocol client

`qnm-node/fed-instance.mjs` is a protocol client for the Local-First Edge Mesh, not the sandboxed daemon. The daemon in [AzielEliab/qnm-node](https://github.com/AzielEliab/qnm-node) implements neighborhood discovery, quotas, and object storage. This repo's Worker relay accepts the later sync.

```bash
node qnm-node/fed-instance.mjs --data ./data/a --port 8781 --relay http://127.0.0.1:8780/v1/mesh/relay
node qnm-node/fed-instance.mjs --data ./data/b --port 8782 --relays http://127.0.0.1:8780/v1/mesh/relay,http://127.0.0.1:8783/v1/mesh/relay
```

### Direct LAN bind

The client listens on `127.0.0.1` unless `--host` is set. `--host 0.0.0.0` or a LAN IP lets a second machine POST `/v1/fed-mesh/direct`. That socket is not open-world awareness. Awareness is `node qnm-node/awareness.mjs`, which binds `0.0.0.0` on its own port and does not carry these envelopes.

`0.0.0.0` is a listen bind, not a peer URL. Pass `--advertise` with the machine's LAN IP, or pass that IP as `--host`. Share `http://<lan-ip>:<port>/v1/fed-mesh/direct`. A peer classifies that URL as `direct-lan`. No STUN, no TURN, no NAT punch.

```bash
# Machine A — listen on all interfaces; the printed direct URL uses the LAN IP
node qnm-node/fed-instance.mjs --data ./data/a --port 8781 --host 0.0.0.0 --advertise 192.168.1.10 \
  --relay http://127.0.0.1:8780/v1/mesh/relay

# Machine B — its own key and data dir; more than one relay is optional L1
node qnm-node/fed-instance.mjs --data ./data/b --port 8782 --host 192.168.1.20 \
  --relays http://127.0.0.1:8780/v1/mesh/relay,http://127.0.0.1:8783/v1/mesh/relay
```

One `--relay` stays L0. `--relays` with more than one URL makes that node's `GET /health` show `survival.methods` multi-relay `live: true`. Binding the socket does not do that, and it does not paint public `GET /v1/mesh` `l1_live`. Unconfigured public mesh stays `l1_live=false`, `aznet_replaces_internet=false`, Softwares 42.

`--passphrase` opts this data directory into an AZKS-1 keystore (`keystore.json`). The public `identity.json` then has no seed. Without `--passphrase`, L0 still writes `identity.json` seed fields so existing nodes keep their handles. That plaintext file is not encrypted storage. The passphrase is not printed.

Local multi-relay smoke (start two relays first; the canonical pack is `node scripts/verify-peer-bearers.mjs`):

```bash
node qnm-node/fed-instance.mjs --data ./data/b --port 8782 \
  --relays http://127.0.0.1:8780/v1/mesh/relay,http://127.0.0.1:8783/v1/mesh/relay
curl -s http://127.0.0.1:8782/health
```

Each instance has its own key, handle, and data directory. Instances talk through a relay. There is no hidden shortcut between ports. `--relay` is the L0 path (one relay). `--relays` with more than one URL is optional L1 and does not replace that path. `node qnm-node/offline-node.mjs` is the L4 stub: no relay stays local; `--relay` registers on that L0 path and does not enable the mesh. Local `GET /health` cites `survival`: multi-relay is LIVE only when more than one relay is named. Cold shelves stay SLOT. doi stays null. Peer bearers are relay HTTPS, a configured direct or LAN URL (`POST /v1/fed-mesh/direct`), and loopback. Loopback is that optional L1 bearer for a local node. It is not the mesh security model and does not fence the mesh to 127.0.0.1. Isolation is single-node security-awareness. Phoenix is a local reboot loop. Open-world awareness binds `0.0.0.0` in `awareness.mjs`. `fed-instance.mjs --host` is a separate direct-lan listen and does not make that awareness socket LIVE. `forced_loopback` and `loopback_isolation` are not the mesh fence. `GET /v1/mesh/relay` is the health check. A failed check selects the next configured relay. NAT hole-punch refuses `FED-MESH-NAT-REFUSE`. AZnet does not replace the internet. This is not public ICANN DNS and not radio PHY. Object fetch between peers is `{ "v": "FED-MESH-1.0", "kind": "object-fetch", "hash": "<64 hex>" }` and the answer is `{ "v": "FED-MESH-1.0", "kind": "object", "hash", "body_b64" }` or `FED-MESH-NO-OBJECT`. Name records are `.aziel` only. `<handle>.aziel` is self-certifying. Friendly names stay pending until proof-of-work, 72 hours, and 2 witnesses, then the first final claim wins, 3 user names per handle, plus 4 reserved hub-mirror slots. Daemon work for two-hop, Tor, airlock scan, and island enforcement cites section 11 of the spec. Design mode, local classifiers, and reserved-mirror hosting cite sections 12 and 13. This relay does not run those classifiers. `.az` is normal DNS except the Cap-7 / AZ.* allowlist. Spec: [`docs/designs/FED-MESH-1.0.md`](../docs/designs/FED-MESH-1.0.md).
