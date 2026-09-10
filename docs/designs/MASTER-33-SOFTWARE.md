# MASTER-33 — Locked 33-software architecture

Author: **Aziel Eliab** only.

Status: live runtime note (2026-09-10). Runtime **1.7.0**. Not a Softwares-tab product. Not a FragGate slug. Not LambGate.

Supersedes the public hop list in SUITE-PIPE-1.6.15. Companion: MASTER-ARCHITECTURE-2.0 (FragGate-first addendum). Keeps every 1.6.15 live fabric module.

---

## 0. HARD LAW — FragGate is THE SINGLE DOOR

Human → AZInterface → PUBLIC/UI/AGENT/API → **FragGate** → Lamb Lens → SweepGate → Sentinel → Provenance/Input Packet → ChainLock-IN → DecisionGATE → AZPIPE → Internal Domain Layer (isolated softwares, NOT additional doors) → optional ASE → **RoseClock** (forward-only; StaticClock/VECTOR as needed) → TemporalLock → ChainLock-OUT → ForgeReceipts → Return.

Lamb Lens is fabric ethics AFTER FragGate — NOT a Softwares-tab product and NOT a second door. Pass/compatible with Peace, then Clarity, then Service; permit Q&A and legitimate inspection (e.g. TrajectoryLock on public cases); refuse porn, harassment, foul language, stalking, falsifying documents, bypassing protocols. PASS / REFUSE / HOLD-UNCERTAIN.

This strip **overrides** MASTER-ARCHITECTURE-2.0 §4.2 (which placed Lamb Lens before FragGate). FragGate is first among executable hops.

## 1. Locked diagram

```
Human
  → AZInterface          (human UI before the door; catalog software, not an extra door)
  → PUBLIC/UI/AGENT/API
  → FragGate             ★ THE SINGLE DOOR — classify live / stub / halluc
  → Lamb Lens            fabric ethics (not Softwares-tab; not a second door)
  → SweepGate            airlock
  → Sentinel             PASS / SUSPECT / QUARANTINE / REJECT / HOLD  (no rollback)
  → Provenance/Input Packet
  → ChainLock-IN
  → DecisionGATE
  → AZPIPE               fld3-wire internal
  → Internal Domain Layer   isolated softwares; domains are labels, not doors
  → optional ASE         cite + stub refuse until armed
  → RoseClock            forward-only; StaticClock / VECTOR as needed
  → TemporalLock
  → ChainLock-OUT
  → ForgeReceipts
  → Return
```

Outbound reverses sensibly. Illegal reorder is refused (`illegal-reorder`). LambGate is not a hop. No ZD30. No generic truth score as security authority.

## 2. What stayed live (1.6.15)

FragGate registry, DecisionGATE, AZPIPE FLD3 (fld3-wire internal), SweepGate, ChainLock IN/OUT, LOCKSET, packed catalog, QNS-CD cite, QNM mesh default OFF, 4DMap, TemporalLock, StaticClock, all catalog engines, dual-surface MCP/OpenAPI/skill/cite/llms, Softwares Plain→Gate→Lock.

## 3. New fabric (not Softwares-tab)

| Module | After | Act |
| --- | --- | --- |
| Lamb Lens | FragGate | Peace → Clarity → Service. Absolute prohibitions refuse. |
| Sentinel | SweepGate | Integrity. No rollback language. |
| Provenance / Input Packet | before ChainLock-IN | Normalize source. Trust is metadata, not truth. |
| RoseClock | after domain / optional ASE | Sequence never decreases. Restore/correct/quarantine are forward `action_class`. |
| ASE / VECTOR | optional | Cite + stub refuse until armed. |

RoseClock transition hash is stamped into ChainLock and TemporalLock. Any rollback API is refused.

## 4. Internal Domain Layer — 11 domains / 33 softwares

Domains are **isolation labels**, not doors. Softwares stay on the Softwares-tab (`domain` + `domain_id`).

| ID | Domain | Softwares |
| --- | --- | --- |
| 01 | Vault/Custody | ark, embryolock (stub) |
| 02 | Media | vibelock, veillock, spectrallock, trajectorylock |
| 03 | Evidence | employeelock, whistlelock, peacelock, shadowlock, mialock, chronolock |
| 04 | Language | codelock, foldlock, glossafilter, zsolver, godlock, azclce |
| 05 | AI | azai, azbot, azhub |
| 06 | Research | azbrowser, aziel-corpus, 4dmap |
| 07 | Comms | azmail, **azchat** (name-only stub refuse until a product exists) |
| 08 | Network | aznet, miragegrid, azieltether |
| 09 | System | azos |
| 10 | Simulation | postking |
| 11 | Core Time | staticclock, temporallock |

4DMap remains a Research-domain inspection frame T/Δ/Γ/Π inside the layer — not a sequential gate and not an additional door.

## 5. Placement of live extras (not extra doors)

| Item | Placement |
| --- | --- |
| AZInterface | Human UI before FragGate. Catalog software. |
| FragGate Worker app | Fabric/hub. THE door + counted human UI. |
| DecisionGATE product | Fabric product. Policy hop on the strip. |
| ForgeReceipts | Fabric product. Return packaging via the existing engine. |
| AZCoherence | Scoring-review placement (Language / AZ-CLCE adjacent). Catalog software. Not an extra door. Not AKM-TRIAD fabric. |
| mesh (QNM) | Fabric/hub. Default OFF. Not Softwares-tab. |

## 6. FragGate call path

`fraggate_call` / `POST /v1/fraggate/call`:

1. FragGate classify (halluc / stub / local_only refuse).
2. Lamb Lens.
3. SweepGate.
4. Sentinel.
5. Provenance / Input Packet.
6. ChainLock-IN.
7. DecisionGATE — no handler on BLOCK/REVISE.
8. AZPIPE fld3 admit.
9. Internal Domain Layer exec (`executeLocal`). Isolated software only.
10. Optional ASE cite (refuse if armed-request while unarmed).
11. RoseClock forward transition.
12. StaticClock (as needed) + TemporalLock (rose hash in evidence).
13. ChainLock-OUT (rose + temporal hashes).
14. ForgeReceipts package.
15. Return.

## 7. What it is not

- Not a second door (Lamb Lens / domains / ASE / VECTOR).
- Not LambGate.
- Not ZD30.
- Not rollback. Restore is `RESTORE_FORWARD`.
- Not a rewrite of AP-WP-0.2 magic (FLD3) or SweepGate / ChainLock papers.
- Not a fake AZChat engine.

Identity Aziel Eliab only.
