# Local `qnm-node` radio hooks

**Author:** Aziel Eliab only.

This directory is **hooks**, not the full local node process
(`boot` / `chain` / `apg` / `outbox` / `phoenix` / `score` / `memorial` / `tethers` / `qnsd`).
Parent still owns that package: [AzielEliab/qnm-node](https://github.com/AzielEliab/qnm-node).

## Law

- **LIVE** only when host hardware (wifi / bluetooth / rf) or local `qnsd` (photon) is present.
- **Refuse** `QNM-RADIO-ABSENT` when absent.
- **No mock LIVE.**
- The public Worker `GET /v1/mesh` `channel_plane` stays **cite-only** (`worker_hardware: false`).
- Photon is loopback `qnsd` only. The Worker never fetches `127.0.0.1`.

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

Each instance has its own key, handle, and data directory. Instances talk through a relay. There is no hidden shortcut between ports. `--relay` is the L0 path (one relay). `--relays` with more than one URL is optional L1 and does not replace that path. Peer bearers are relay HTTPS, a configured direct or LAN URL (`POST /v1/fed-mesh/direct`), and loopback. `GET /v1/mesh/relay` is the health check. A failed check selects the next configured relay. NAT hole-punch refuses `FED-MESH-NAT-REFUSE`. A sidenet does not replace the internet. This is not public ICANN DNS and not radio PHY. Object fetch between peers is `{ "v": "FED-MESH-1.0", "kind": "object-fetch", "hash": "<64 hex>" }` and the answer is `{ "v": "FED-MESH-1.0", "kind": "object", "hash", "body_b64" }` or `FED-MESH-NO-OBJECT`. Name records are `.aziel` only. `<handle>.aziel` is self-certifying. Friendly names stay pending until proof-of-work, 72 hours, and 2 witnesses, then the first final claim wins, 3 user names per handle, plus 4 reserved hub-mirror slots. Daemon work for two-hop, Tor, airlock scan, and island enforcement cites section 11 of the spec. Design mode, local classifiers, and reserved-mirror hosting cite sections 12 and 13. This relay does not run those classifiers. `.az` is normal DNS except the Cap-7 / AZ.* allowlist. Spec: [`docs/designs/FED-MESH-1.0.md`](../docs/designs/FED-MESH-1.0.md).
