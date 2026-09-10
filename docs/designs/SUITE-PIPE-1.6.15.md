# SUITE-PIPE-1.6.15 — Locked suite pipeline

Author: Aziel Eliab only.

Status: historical runtime note (1.6.15). Public hop list superseded by **MASTER-33** / runtime **1.7.0** (FragGate-first; Lamb Lens after FragGate). Not rolled back — extended. Not a Softwares-tab product. Not a FragGate slug. Not LambGate.

---

Aziel Eliab · locked suite hop order · runtime 1.6.15

## 0. Sentence

The public hop list is locked. Changing product names does not change the list. FoldLock fld3-wire may stay inside AZPIPE. LambGate is not a hop.

## 1. Locked order

Inbound (PUBLIC through receipt):

`PUBLIC/UI/Agents → FragGate → SweepGate → ChainLock-IN → DecisionGATE → AZPIPE → Domain Doors (4DMap inspection) → TemporalLock → StaticClock → ChainLock-OUT → Response/Receipt`

Outbound (sensible reverse):

`Response/Receipt → ChainLock-OUT → StaticClock → TemporalLock → Domain Doors → AZPIPE → DecisionGATE → SweepGate → FragGate → PUBLIC/UI/Agents`

Illegal reorder is refused (`illegal-reorder`). The old fold-centric list (`frag → sweep → fold → static → fold → entry → frag → toolkits`) is not the public hop list.

## 2. What each hop is

| Hop | Kind | Act |
| --- | --- | --- |
| PUBLIC/UI/Agents | surface | Human Worker UI, MCP, OpenAPI, agents. |
| FragGate | door | Classify live / stub / halluc. Empty inbound refuses here. |
| SweepGate | fabric | Airlock. Poison / malware-class / block-keys isolate. Off-origin isolates only when inbound and untrusted. |
| ChainLock-IN | fabric | Stamp the inbound envelope. |
| DecisionGATE | catalog engine | D/E/I/G/R after ChainLock-IN and before domain exec. |
| AZPIPE | fabric | Admit. fld3-wire fold/static is internal. Memory never sees raw inbound bytes. |
| Domain Doors | catalog engines | Isolated engine exec. **4DMap (`4dmap`)** is the inspection frame T/Δ/Γ/Π — not a sequential gate, not a new Softwares-tab fabric hop. |
| TemporalLock | catalog engine | Advisory receipt stamp on the envelope. Not a new Software. |
| StaticClock | catalog engine | Advisory gear-click stamp on the envelope. Not a new Software. |
| ChainLock-OUT | fabric | Stamp the outbound receipt. |
| Response/Receipt | surface | ResultEnvelope + display + ledger tip. |

SweepGate / ChainLock / AZPIPE remain fabric (not Softwares-tab). 4DMap remains a Plain-bucket product cited at Domain Doors.

## 3. FragGate call path

`fraggate_call` / `POST /v1/fraggate/call`:

1. FragGate classify (halluc / stub / local_only refuse).
2. SweepGate.
3. ChainLock-IN.
4. DecisionGATE — no handler on BLOCK/REVISE.
5. AZPIPE fld3 admit.
6. Domain door exec (`executeLocal`). 4DMap ops are inspection here.
7. TemporalLock + StaticClock advisory stamps.
8. ChainLock-OUT.
9. Response/Receipt.

DecisionGATE does **not** run after domain exec on this path. It does **not** run before ChainLock-IN.

## 4. What it is not

- Not LambGate.
- Not a Softwares-tab product and not a new catalog slug.
- Not a rewrite of AP-WP-0.2 magic (FLD3) or SweepGate / ChainLock papers.
- Not a sequential-gate role for 4DMap.
- Not a claim that FoldLock TETH-1 is live. fld3-wire stays internal.

Companion: AP-WP-0.2 (addendum), SG-WP-0.1, CL-WP-0.4, 4DM-WP-1.0. Identity Aziel Eliab only.
