# 4DM-WP-1.0 — 4DMap

Author: Aziel Eliab only.

Status: live product specification (2026-09-10). Softwares-tab product slug `4dmap` (Plain bucket). Not a sequential gate. Not LIVE fabric.

---

Aziel Eliab · 4DMap · four-axis inspection frame

4DMap
Four-axis inspection frame T / Δ / Γ / Π

4DM-WP-1.0 10 September 2026 Author: Aziel Eliab Status: live in-process engine on aziel-runtime. Slug `4dmap`. Worker home https://4dmap-download-tracker.vibelock.workers.dev/ (product Worker may land same wave).

## 0. Sentence

Inspect a declared object on four axes at once. Do not invent a mark. Do not score truth. Do not sit in the sequential-gate line.

## 1. Claim

4DMap is a Domain Door / inspection layer. After AZPIPE admits a payload and FragGate routes to an isolated engine, 4DMap frames what may be pinned, spanned, joined, and walked. The four axes are simultaneous, not a hop list.

- **T** — time / temporal class. Neighbors: TemporalLock, StaticClock, ChronoLock.
- **Δ** — change / difference. Neighbors: TemporalLock, TrajectoryLock.
- **Γ** — class / genus / spectral class. Neighbor: SpectralLock. Class time cannot be backdated.
- **Π** — path / projection / walk. Neighbor: TrajectoryLock.

Cards hold declared pins. Spans connect two pinned axes on one card. Joins cite a join type. Walks order existing cards. ChainLock may stamp a walk hash. 4DMap does not write the ChainLock vault.

FragGate claims cite join types: pin, span, join, walk, overlay, cite, neighbor, inspect.

Identity is Aziel Eliab only. UI=MCP. EmbryoLock stays stub. `GET /v1/mesh` never enables. Packed catalog (RL-WP-0.1-runtime) stays the 0-KV hot path.

## 2. What it is not

- Not a sequential gate. DecisionGATE remains the five-gate line (D/E/I/G/R). 4DMap does not replace it and does not sit on the AZPIPE hop list.
- Not TemporalLock, StaticClock, ChronoLock, TrajectoryLock, or SpectralLock. Those are neighbor engines under the same FragGate door.
- Not a truth score. `truth_score` is stub-refused.
- Not a Lumen panel. `lumen_panel` is stub-refused.
- Not an invented mark. `invent_mark` is stub-refused. Pin and span require a declared mark already on the card.
- Not a backdated class. `backdate_class` is stub-refused. Γ / class time cannot precede card genesis or an earlier pin.
- Not LIVE fabric (AZPIPE, SweepGate, ChainLock, LOCKSET, packed catalog, QNS-CD).
- Not EmbryoLock. EmbryoLock stays stub / local-not-hosted.
- Not a mesh enable. Each software card keeps `mesh.enabled_default: false` and the same `qns_cd` pointer as peers.

## 3. Pipeline placement

AZPIPE inbound hop list (AP-WP-0.2) stays:

`frag → sweep → fold → static → fold → entry → frag → toolkits`

4DMap is **not** a hop on that list. Placement:

1. AZPIPE admits or refuses the envelope (FoldLock / StaticClock freeze / SweepGate / ChainLock entry).
2. FragGate / DecisionGATE classifies the CallEnvelope (live / stub / halluc).
3. Isolated engine exec runs inside the Worker isolate.
4. **4DMap sits here** — Domain Door / inspection layer — framing T/Δ/Γ/Π on declared cards for that isolated engine result. Neighbors may be cited. ChainLock may stamp a walk.

Changing product names does not move 4DMap onto the sequential-gate line.

## 4. LIVE ops

Reached only via `fraggate_call` / `POST /v1/fraggate/call` with `{ slug: "4dmap", op }`.

| op | act |
| --- | --- |
| health | Liveness. Does not increment download KV. |
| skill | Product skill markdown. |
| card_new | Open an inspection card with empty T/Δ/Γ/Π slots. |
| card_pin | Pin a **declared** mark onto one axis. |
| card_span | Span two axes that already have pins. |
| card_join | Join two existing cards. Claim cites `join_type`. |
| card_walk | Walk an ordered list of existing cards. Returns `walk_hash`. ChainLock may stamp. |
| card_list | List cards and walks in this isolate. |
| verify_hash | Recompute a card or walk hash. |

Stub refuse (never hosted): `truth_score`, `lumen_panel`, `invent_mark`, `backdate_class`.

## 5. Catalog

- Slug: `4dmap`
- Bucket: Plain (name does not end in Lock / Gate / Clock)
- Sort: Plain A–Z with peers
- Status: live
- `worker_home`: `https://4dmap-download-tracker.vibelock.workers.dev/`
- `mesh.enabled_default`: false
- `qns_cd`: same pointer as peers (`QNS-CD-1.0`, local `https://github.com/AzielEliab/qnm-node`, Worker cites only)
- True in-process engine. `engine_digest` required. Cloudflare isolate is the jail.

## 6. Cite

Eliab, Aziel. (2026). 4DM-WP-1.0 [Design]. https://github.com/AzielEliab/aziel-runtime/blob/main/docs/designs/4DM-WP-1.0.md

Eliab, Aziel. (2026). 4DMap 0.1.0 [Software]. Apache-2.0. https://github.com/AzielEliab/4dmap
