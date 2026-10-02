# MESH-INTERNET-WARNS-1.0 — five mesh-internet WARNs

**Author:** Aziel Eliab only.  
**Operator lock:** Aziel Eliab, 2026-10-02. WARN-5 is not a permanent ceiling.  
**Tip:** `324a4a88561dd6e33bdfcbb0f2dd80a874344af2` (merge #203). This note does not deploy.  
**Not a Softwares card. No new MCP tool.** Softwares stay 42. `tools/list` stays 36.

This is an honesty map. It does not close a WARN. A green `node scripts/verify-azp-ns-repro.mjs` still prints `WARN STANDS` for WARN-1 through WARN-4. WARN-5 prints `STANDS-until-demonstrated`. SKIP and SLOT rows stay `ok: false`. Nothing here is an anonymity PASS, a live multi-node PASS, or an Internet-comparable BGP claim.

## Dual track

Two tracks. They are not the same network, and this cut does not paint either one as the public ICANN Internet.

| Track | What it is | This cut |
|---|---|---|
| Track 1 | Cap-7 and `.aziel` mesh name plane, as it ships today | LIVE on that plane. Not a public egress IP. Not an ICANN registrar. Cap-7 is not the public Internet. |
| Track 2 | A separate node-mesh internet: its own addressing and routing, not an ICANN or BGP paint | Goal. WARN-5 is STANDS-until-demonstrated. BY-DESIGN that internet stays separate from ICANN. Not demonstrated. Not BGP. Not a refusal to build. |

Track 2 needs multiple independently deployed nodes actually operating together, plus mesh routing and addressing on that node mesh. This repository does not have that demonstration. `live_multi_provider` stays false. Do not invent a LIVE multi-node result. Do not invent Internet-comparable BGP.

`not_a_second_internet` stays true on Track 1: the Cap-7 / AZNet name plane does not replace the ICANN internet. `aznet_replaces_internet` stays false. Track 2 is a different goal. It is not a claim that Cap-7 already is that internet.

## Claim limits

Copied from `src/security/claims.js` `CLAIM_LIMITS`. These values are unchanged.

| Key | Value |
|---|---|
| `anonymous` | false |
| `unkillable` | false |
| `immutable` | false |
| `cap7_public_icann` | false |
| `cap7_public_egress` | false |
| `mirage_is_azvpn` | false |
| `aznet_replaces_internet` | false |
| `tor_live` | false |
| `udp_live` | false |
| `radio_live` | false |
| `sandbox_live` | false |
| `live_multi_provider` | false |
| `plane_b_framagit` | `SLOT` |
| `encryption_addressed_is_anonymity` | false |

Sentences that stay in force: records are tamper-evident, not an immutability claim. Payloads are privacy-preserving, not anonymity. Checkpoints are survivable in the fixture model, not an unkillable network. A relay that cannot decrypt is not a production zero-trust certification.

## Locks that stay

| Lock | Law |
|---|---|
| Cap-7 | Factory exec, geo-target, session-stick, and egress-rotate are plane metadata and land. Not a public egress IP. Not residential. Not a Cloudflare geo-exit pool. Not packet forward. Not an ICANN `.az` registrar. Cap-7 is not the public Internet. |
| Mirage | `vpn-hop`, `hop`, `tunnel`, and `mesh` stay FG-STUB. Mirage is not AZVPN. AZVPN HTTPS/WS stays the suite VPN. WireGuard, OpenVPN, and L3 stay SLOT. |
| Track 1 flag | `not_a_second_internet` stays true. `aznet_replaces_internet` stays false. |
| Catalog | Softwares stay 42. `tools/list` stays 36. No new Softwares card. No new MCP tool. |
| Plane B | Framagit URL is null. `doi` is null. `CLAIM_LIMITS.plane_b_framagit` is `SLOT`. The script row `plane-b-framagit` is SKIP with `ok: false`. Hash-verify on Codeberg and archive.org is an operator record. It is not Plane B LIVE. |
| NAT / DNS | `FED-MESH-NAT-REFUSE`. No STUN. No TURN. No live DNS change. No Cap-7 egress bearer. |
| Phoenix / isolation | Phoenix is local wait / re-seal. Isolation is single-node security-awareness. Neither one is a loopback fence of the whole mesh. |
| Nodes | Do not paint `{slug}-worker` software-workers as independent hosts. |

## Point-in-time public read

`GET /v1/mesh` on 2026-10-02 (this note's writing, not a new measurement campaign):

- `survival_methods.l0_live` true. `l1_live` false. `independent_requirement_met` false.
- `not_a_second_internet` true. `aznet_replaces_internet` false.
- `cap7-mesh-dns`: `factory_exec` true, `public_egress_ip` false, `public_icann` false, `live` true on the Cap-7 plane.
- Open-world: `law` LIVE, `live` false, `worker_socket` false, socket `live-when-configured`. `mesh_fenced_to_loopback` false.
- `human_mesh_users` 0. `software_nodes` 41.

`software_nodes` is the same-Worker product roster. It is not a count of independently deployed hosts. That GET is not a multi-node demonstration and not a Track 2 demonstration.

## Verdict board

| Id | WARN | Status |
|---|---|---|
| WARN-1 | Multiple independently deployed nodes operating together | STANDS |
| WARN-2 | Provider-independent recovery | STANDS |
| WARN-3 | Real-world partition, reconnection, and adversarial testing | STANDS |
| WARN-4 | Metadata privacy measurement | STANDS |
| WARN-5 | Mesh-internet addressing and routing, separate from ICANN | STANDS-until-demonstrated |

WARN-5 is BY-DESIGN separate from ICANN. That separation is the design. The missing demonstration is not a refusal to build.

## WARN-1 — independent nodes together

**STANDS.** One LIVE production edge plus same-host fixtures. No demonstrated multi-host independent deployments operating together.

| Layer | Status | Evidence |
|---|---|---|
| Node A, `aziel-runtime.vibelock.workers.dev` | LIVE | Public L0 edge. These scripts do not deploy it and do not destroy it. |
| Software-node roster (`{slug}-worker`) | LIVE presence on one plane | Same Worker rollup. Not independent hosts. |
| FED-MESH e2e / `fed-instance` | FIXTURE | Same machine. `verify-fed-mesh*.mjs`. |
| Multi-relay / direct-lan L1 | Code present, public `live-when-configured` | `l1_live` false on the 2026-10-02 GET. |
| Node B independent VPS | SKIP | `live-vps` in `verify-provider-loss.mjs`. OPERATOR. |
| Node C separate provider | SKIP | `node-c-separate-provider`. |
| Node D self-hosted | SKIP | `node-d-self-hosted`. `lose-one-node` is an in-memory FIXTURE. |
| Node E offline / cold | SLOT | `archive-e-cold`. The script does not fetch the tip-pack. |
| `live_multi_provider` | false | `CLAIM_LIMITS`. |

A real close needs provisioned hosts with distinct keys, concurrent presence, and signed delivery across those hosts. This note does not mark that PASS.

## WARN-2 — provider-independent recovery

**STANDS.** Fixture recovery exists. Live provider destruction is SKIP.

| Layer | Status | Evidence |
|---|---|---|
| Checkpoint, Merkle, quorum refuse | FIXTURE | `verify-checkpoint*.mjs`, `verify-replication.mjs`. Gate green is not a WARN close. |
| In-memory `kill-primary-provider` | FIXTURE | `verify-provider-loss.mjs`, `verify-disaster-recovery.mjs`. |
| `destroy-live-provider` | SKIP | Not a destroyed Cloudflare account, VPS, or home node. |
| Plane A | LIVE as one CF/GitHub tunnel | `independent_requirement_met` false. |
| Plane B Framagit, cold shelves, home-origin | SLOT | `doi` null. Framagit URL null. Script row `plane-b-framagit` is SKIP. |
| Phoenix | LIVE law | Local wait / re-seal. Not cross-provider resurrection. |
| Spore, BAN-SURVIVAL, CROSS-NETWORK | LIVE laws / cites | Designed stack. Not a multi-provider demonstration. |

Survivable in fixtures is not unkillable. The harness exits non-zero if a SKIP or SLOT honesty row is painted pass.

## WARN-3 — partition, reconnection, adversarial

**STANDS.** Transport and FragGate fixture adversarial coverage is real. Real-world partition across independently deployed nodes is missing.

| Layer | Status | Evidence |
|---|---|---|
| `verify-transport-adversarial.mjs` | FIXTURE | Replay, forge, wrong recipient, expired session, key swaps, `AZP-DOWNGRADE`, mutating relay. Partition reconciles from checkpoints only. `destroy-live-provider` inside that family is SKIP. |
| `verify-adversarial.mjs` and the external pack | Self-check | Self-test is not a third-party lab. |
| FED-MESH name and isolation vectors | FIXTURE | `fixtures/fed-mesh-vectors.json`. |
| Live remote partition between Node A and Node B | missing | No second host. |
| Reconnection under churn | missing | Refuse paths are designed. They are not a multi-host demonstration. |

A local simulation is FIXTURE. It is not the real-world half of this WARN.

## WARN-4 — metadata measurement

**STANDS.** The metadata inventory is fixture-LIVE. A published anonymity measurement is missing. Encryption is not anonymity.

| Layer | Status | Evidence |
|---|---|---|
| `ENVELOPE_METADATA` | LIVE inventory | Necessary routing fields on EnvelopeV2. |
| `OBSERVER_LEAKAGE` | LIVE inventory | timing, ip_connection_frequency, message_size, relay_relationships, node_uptime. `necessary` false. Class `leakage`. |
| `verify-privacy-metadata.mjs` | FIXTURE | `fields`, `observer`, `reveals`, `necessary`, `claim_limits`. |
| `FIXTURE-MEASURE` | FIXTURE stub | Envelope byte sizes and seal timings over a fixed sample. Not an anonymity PASS. |
| `anonymous`, `encryption_addressed_is_anonymity` | false | Hard claim limits. |
| Published anonymity / traffic-analysis campaign | missing | Use privacy-preserving until a published anonymity test passes. |
| Cap-7 or Mirage as a privacy network | off | Cap-7 is not egress. Mirage is not AZVPN. Not Tor. |

`scripts/verify-privacy-metadata.mjs` prints `fixture_measure.label` `FIXTURE-MEASURE` and `anonymity_pass` false. Those samples are not an anonymity PASS.

## WARN-5 — mesh-internet addressing and routing

**STANDS-until-demonstrated.** BY-DESIGN the mesh internet stays separate from ICANN. This is not a refusal to build.

| Layer | Status | Evidence |
|---|---|---|
| Cap-7 factory exec | LIVE on the Cap-7 plane | geo-target, session-stick, egress-rotate. `public_egress_ip` false. `public_icann` false. Cap-7 is not the public Internet. |
| `.aziel` records and relay name-read | LIVE protocol path on Track 1 | FED-MESH-1.0. AZBrowser #17 resolves from the local ledger plus the relay. Runtime #201 name-reads a posted ledger or relay snapshot. A miss or a hash mismatch is `FG-GATE-REFUSE`. The Worker does not query ICANN DNS and does not dial a LAN peer. |
| AZNet / AZBrowser pair | Functional-order pair | FragGate. Pair is not a tunnel. `payload_host` false. |
| AZP route classes | `direct` or `relay` only | `src/transport/routing.js`. `negotiateBearer` refuses `icann` and `cap7-egress` (`AZP-BEARER-REFUSE`), and also refuses tor, udp, radio, sandbox, wireguard, openvpn, stun, and turn. |
| `mesh-router.js` | Softwares slug router | MESH-ADAPT free text to a catalog op. Not packet routing. |
| Home-origin / cold-shelf origins | SLOT | ORIGIN-CUTOVER. L3 registry. |
| Track 2 node-mesh internet | missing | Own addressing and routing, separate from ICANN, not BGP. Not demonstrated. Multi-node operation is still WARN-1. |

Honest close, later, not in this cut: show Track 2 on real nodes (the WARN-1 hosts) with mesh addressing and routing that a stranger can recompute, while Cap-7 remains not the public Internet and `negotiateBearer` still refuses `icann` and `cap7-egress`. Painting Cap-7, `.aziel`, or today's route classes as Internet-comparable BGP would be a lie.

Softwares skill text already says the Track 1 boundary (MirageGrid `one_line`, AZBrowser `skill`, AZNet `skill`). This cut does not rewrite those strings and does not rehash an engine digest.

## Harness

`scripts/verify-azp-ns-repro.mjs` prints:

```text
WARN STANDS WARN-1
WARN STANDS WARN-2
WARN STANDS WARN-3
WARN STANDS WARN-4
WARN-5 STANDS-until-demonstrated BY-DESIGN separate from ICANN
```

The closing JSON includes `warns: [{id, status}]`. WARN-5 also carries `until: "demonstrated"` and `by_design: "separate-from-icann"`. Status is never `PASS`. WARN-5 status is not a permanent ceiling.

Required honesty rows stay fail-closed: `live-vps`, `plane-b-framagit`, `live-multi-provider`, `destroy-live-provider`. A row painted `LIVE`, or a SKIP/SLOT row with `ok: true`, fails the wrapper.

## What this cut does not do

No Worker deploy. No DNS change. No NAT punch. No Cap-7 egress bearer. No new Softwares card. No new MCP tool. No flip of `live_multi_provider`. No Plane B LIVE. No claim that software-workers are independent hosts. No claim that Track 2 is LIVE. No Internet-comparable BGP. Mirage stub ops stay FG-STUB. Cap-7 is not the public Internet.

Cross-links: [`AZP-NS-REPRO-1.0.md`](AZP-NS-REPRO-1.0.md), [`FED-MESH-1.0.md`](FED-MESH-1.0.md), [`NODE_MESH.md`](../NODE_MESH.md).
