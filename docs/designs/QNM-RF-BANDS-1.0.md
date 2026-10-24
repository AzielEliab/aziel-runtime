# QNM-RF-BANDS-1.0 — receive-only RF bands and a satellite relay switch

**Author:** Aziel Eliab only.
**Status:** Design note plus switches. Every new switch is **off**. Nothing is purchased. Nothing transmits. Version stays `2.0.0-rc1`. Softwares stay 42. `tools/list` stays 36. FragGate stub ops stay 363. FragGate stays the single door.

This paper names the bands under the one generic RF channel, and the satellite relay that would sit after photon. The switches are in the tree. The radios are not.

## What is true

AM and FM are receive-only.

- AM is 530–1700 kHz.
- FM is 88–108 MHz.
- The mesh never transmits on AM or FM. Transmitting on those bands needs an FCC license. This runtime does not hold that license and does not transmit.

XM SDARS is not a mesh path.

- XM SDARS is 2320–2345 MHz.
- The signal is encrypted.
- Receiving it needs a SiriusXM-activated radio and a SiriusXM subscription.
- It is one-way. It cannot carry mesh traffic.

Satellite receive needs an SDR.

- Weather, GNSS, and amateur downlinks are receive paths.
- Each one needs an SDR. A channel cite is not a demodulator.

Satellite uplink and relay need a license or a paid terminal.

- An amateur uplink needs an amateur license. Amateur service does not allow encryption, so the FED-MESH-1.0 encrypted store-and-forward body cannot ride that uplink.
- A commercial uplink needs a paid terminal (Starlink or Iridium).
- Nothing is bought. A paid path needs Aziel's explicit OK. This paper does not record that OK. `paid_ok` stays false. `purchased` stays false.

## Switches in this tree

All of these are `enabled: false` and `live: false`.

| Switch | Where | Device it would need | Without that device |
|---|---|---|---|
| `am` | receive-only sub-row under `rf` | SDR | `QNM-RADIO-ABSENT` |
| `fm` | receive-only sub-row under `rf` | SDR | `QNM-RADIO-ABSENT` |
| `xm_sdars` | receive-only sub-row under `rf` | licensed SiriusXM tuner | `QNM-RADIO-ABSENT` |
| `sat_rx` | receive-only sub-row under `rf` | SDR | `QNM-RADIO-ABSENT` |
| `satellite_relay` | carrier after photon | amateur terminal or commercial terminal | `QNM-RADIO-ABSENT` |

`satellite_relay` also has `transmit: false`. It is not in the failover preference string (LAN, Wi-Fi, Bluetooth, RF, photon light flashes). It reuses the existing FED-MESH-1.0 store-and-forward envelope (`v`, `from`, `to`, `seq`, `nonce`, `eph_public_key`, `ciphertext`; X25519 + HKDF-SHA-256 + AES-GCM; salt `FED-MESH-1.0`). It does not add a FragGate op. `store_forward` was already `FG-STUB`.

An SDR does not satisfy XM. A network interface does not satisfy the relay. A device that happens to be present does not flip a switch. `GET /v1/mesh` never enables (`get_never_enables` stays true). Bearer names `am`, `fm`, `xm`, `xm-sdars`, `sat-rx`, and `satellite-relay` are refused `MESH-BAD-BEARER`.

## What is built, and what needs hardware

Built before this note:

- One generic RF channel. The local hook checks hardware presence (`/dev/swradio0`, `/sys/class/sdr`, or the rtl USB driver). Absence is `QNM-RADIO-ABSENT`. Presence is not a packet hop and not a band.
- Wi-Fi, Bluetooth, RF, and photon channel cites stay `cite` / `cite/operator-armed`. `worker_hardware` stays false.
- The D2D failover carriers stay LAN, Wi-Fi, Bluetooth, RF, photon. The public door for those hops stays `NOT-READY` / `FG-STUB`.

Built in this cut:

- The four receive-only sub-rows and the relay switch, all off, in `src/mesh-channel-plane.js`, `src/d2d-carriers.js`, and `qnm-node/bearers/radio.js`.
- `workerClaimsRadioHardware()` treats a band or the relay that reads live, enabled, or transmit while the worker has no device as a refused radio claim.
- Tests that fail if any of those rows read live without the device.

Not built. These need hardware, a license, a subscription, or Aziel's OK:

- No AM demodulator. No FM demodulator.
- No SiriusXM tuner driver. No SiriusXM subscription. No activation.
- No weather, GNSS, or amateur-downlink decoder.
- No amateur license check. No amateur transmitter. Encryption stays off that path because amateur service does not allow it.
- No Starlink terminal. No Iridium terminal. No purchase. No paid-path OK.
- No transmit path on AM, FM, XM, satellite receive, or the relay.
- The carry walk still does not send on `satellite_relay`.

## Locks this note does not move

- `mesh_node_live`, `alt_internet_live`, and `packet_path_live` stay true, as on main. That fact is not radio PHY. `radio_phy` stays false.
- `GET /v1/mesh` never enables.
- FragGate stays the single door.
- `cap7_name_only` stays true. `public_icann`, `paid_registrar`, `cap7_registrar_live`, `registrar_live`, `cap7_public_egress`, `public_egress_ip`, and `dns_publish` stay false.
- Softwares stay 42. MCP `tools/list` stays 36. Version stays `2.0.0-rc1`. Stub ops stay 363.
- No new secret. No live claim on these switches.

## Follow-up mirrors (not this repo)

This pull request does not edit AZ-OS or AZInterface. The same off switches still need to be mirrored later in:

- `azos/azos/carriers.py`
- `azinterface` `packet_path.py`

Until those mirrors land, those trees do not show these rows. This runtime does not pretend that they do.

## Honest gaps

- RF is still one generic presence check plus four off sub-rows. There is no tuner, no demodulator, and no decoder.
- XM cannot carry mesh traffic even if a licensed tuner appears. The switch stays off anyway.
- A present SDR does not make AM, FM, or satellite receive live. The switch stays off.
- The FED-MESH store-and-forward envelope is encrypted. An amateur satellite uplink cannot carry it. A commercial terminal might, and nothing here buys one or records Aziel's OK.
- `satellite_relay` is listed after photon and is not a working hop. `peer_exchange_demonstrated` stays false. WARN-5 stays STANDS-until-demonstrated.
- AZ-OS and AZInterface do not carry these rows yet.

Paper cross-links: [`QNM-CHANNEL-PLANE-1.0.md`](QNM-CHANNEL-PLANE-1.0.md), [`D2D-CARRIERS-1.0.md`](D2D-CARRIERS-1.0.md), [`FED-MESH-1.0.md`](FED-MESH-1.0.md), [`PLANE-P-D2D-1.0.md`](PLANE-P-D2D-1.0.md).
