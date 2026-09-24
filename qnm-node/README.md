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
```

Each instance has its own key, handle, and data directory. Instances talk through a relay. There is no hidden shortcut between ports. Object fetch between peers is `{ "v": "FED-MESH-1.0", "kind": "object-fetch", "hash": "<64 hex>" }` and the answer is `{ "v": "FED-MESH-1.0", "kind": "object", "hash", "body_b64" }` or `FED-MESH-NO-OBJECT`. Spec: [`docs/designs/FED-MESH-1.0.md`](../docs/designs/FED-MESH-1.0.md).
