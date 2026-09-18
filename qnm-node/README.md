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
