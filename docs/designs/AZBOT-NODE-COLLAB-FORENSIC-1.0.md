# AZBot Node Collaborative Forensic Design 1.0

**AZBot Design for Node-Based Collaborative Forensic System**
**Zero-Trust AI × Human × Human Auditing Layer**

Author: Aziel Eliab
Version: Design 1.0 · October 2026
License: Apache-2.0

PDF: [`AZBOT-NODE-COLLAB-FORENSIC-1.0.pdf`](AZBOT-NODE-COLLAB-FORENSIC-1.0.pdf)

Code: `src/forensic-collab.js`. Tests: `scripts/verify-forensic-collab.mjs`.

Not a Softwares-tab product. Not a FragGate slug. Not a new MCP tool. `tools/list` stays 36. Softwares stay 42. Version stays 2.0.0-rc1.

---

## 1. Purpose

AZBot is the local skill runner and AI interface that lets humans and AI collaborate inside the Aziel node mesh while preserving the existing zero-trust contract. It routes every request through FragGate, emits receipts into the shared lattice, and never becomes a second door or an unrestricted execution path.

It extends the current AZBot (v0.2.0) — a local skill catalog and OpenAPI/MCP client for aziel-runtime — so that it can participate in multi-party sessions on nodes without enabling public mesh radios or changing vault logic.

The skill-runner changes land on AzielEliab/azbot. This runtime paper is the tether and session support that design needs.

## 2. Position in the Platform

| Component | Role |
| --- | --- |
| AZ-OS | Ethics-gated session shell and closed-verb VFS on the node. |
| Aziel Runtime / FragGate | Single public door. Discovery, routing, refuse. |
| AZ Interface | Local control surface and pre-locked page cycles. |
| AZBot (this design) | Local AI handoff and skill runner that stays behind the gates. |

## 3. Node Role

On each node, AZBot runs locally (127.0.0.1). It does not open public ports. When a human or another node requests AI assistance inside a session:

- The request is presented to the local AZ-OS session.
- AZ-OS re-gates it (five ethics gates, ARC token if required, closed verb list).
- If the gate passes, AZBot packages the request as a FragGate call (slug + op + payload).
- The call returns a structured result + receipt.
- The receipt is appended to the session’s TemporalLock / ChainLock lattice.
- Other parties in the multi-party session can read the tip; they cannot rewrite it.

## 4. Constraints Preserved

This design adds node participation and multi-party receipt sharing. It does not rewrite the public contract.

| Remain-OFF item | Status |
| --- | --- |
| Mesh auto-enable / GET /v1/mesh | Still never enables |
| AZ-OS public exec / shell / lattice | Still refused |
| Vault destructive ops (ARK / EmbryoLock wipe, scorch, unlock) | Still local-only / FG-STUB |
| Deanonymize, invent_mark, backdate, public rollback | Still refused |
| FragGate single door | Unchanged |
| Local-first sessions | Unchanged |

`GET /v1/mesh` never enables. That Remain-OFF item is not cancelled by QNM OVERRIDE 2026-10-23.

`mesh_node_live`, `alt_internet_live`, and `packet_path_live` earn LIVE together per the QNM definition: a packet leaves this machine and arrives on a different machine id (`src/alt-internet-fact.js`). Unqualified is not a permanent paint of false. Cap-7 factory name-plane active use is LIVE. Cap-7 and `.aziel` are not ICANN. `cap7_names_only` is not a stay-off of that factory.

## 5. Minimal Additions (No Feature Loss)

- Operator-gated mesh presence using existing MESH-NEED-BEARER and local qnm-node.
- Multi-party session object that shares receipt tips only.
- AZBot handoff that still travels through FragGate and produces a receipt.
- Existing tethers (AZRT-AZOS-TETHER, AzielTether under bearer, external anchors) used as specified.
- All currently live advisory Softwares remain live and unchanged.

## 6. Collaborative Flow

Human A (on Node 1) opens a session in AZ Interface → AZ-OS gates the request → AZBot (local) packages a FragGate call → Runtime routes to the appropriate Softwares engine → result + receipt returned → lattice updated → Human B (on Node 2) and the AI can read the verified tip. No node executes a refused verb. No public radio is auto-enabled.

## Runtime binding

| Claim | Where it holds |
| --- | --- |
| FragGate handoff, not a second door | `packageHandoff` returns `{ door: "fraggate", executed: false }`. Session exec runs the call. |
| Receipt into TemporalLock / ChainLock | `stampHandoff` appends the tip hash on ChainLock `session` and a TemporalLock receipt of that same hash. The session dual lattice already carries the receipt. |
| Other parties read the tip and cannot rewrite it | `GET /v1/session/{id}/tip` returns the tip. `POST` on that route, and any party body that names a tip, hash, lattice, backdate, invent_mark, rollback, or deanonymize, returns `FORENSIC-NO-REWRITE` and writes nothing. |
| Multi-party session object | `POST /v1/session/{id}/party` records an opaque party id. The stored share is the tip. |
| AZRT-AZOS-TETHER | Tip view cites `AZRT-AZOS-TETHER-1.0`. `uses_fraggate_azos_lattice` stays false. The signed tether packet is unchanged. |
| AzielTether under bearer | `tether: "azieltether"` without a bearer is `MESH-NEED-BEARER`. vpn, arm, and mesh-join stay `FG-STUB`. The call does not enable radios. |
| External anchors | ChainLock stamps keep the existing anchor ref. The tip view cites `/v1/anchor/heads`. |
| Operator-gated mesh presence | `operatorMeshPresence` delegates to `meshEnable`. An empty body is `MESH-NEED-BEARER`. Live hardware is local `qnm-node`. |
| GET /v1/mesh never enables | `get_never_enables` stays true. The tip read does not call `meshEnable`. |

Integrity precedes execution. The public identity is the work.

© 2026 Aziel Eliab · Apache-2.0
