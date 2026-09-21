# SPORE-1.0 — pause without electricity, preserve DNA offline

Author: Aziel Eliab only.

Status: LIVE law (2026-09-21). Not a Softwares-tab product. Not a FragGate slug. Remain-OFF untouched.

Companion under the umbrella: [CROSS-NETWORK-SURVIVAL-1.0](CROSS-NETWORK-SURVIVAL-1.0.md) (does not replace the machine tip). Neighbor: [BAN-SURVIVAL-1.0](BAN-SURVIVAL-1.0.md) (door-ban face), [COLD-MULTI-SHELF-1.0](COLD-MULTI-SHELF-1.0.md) (multi-plane DNA copies), [NO-LIE-NO-REWRITE-1.0](NO-LIE-NO-REWRITE-1.0.md), [AKM-TRIAD-1.0](AKM-TRIAD-1.0.md). Mesh rollup: [NODE_MESH](../NODE_MESH.md). Executable: `src/spore.js`.

SPORE is the **power-loss face** of that stack. It is not a replacement Softwares product and not a second door.

---

Aziel Eliab · law · pause · preserve · wait · physical-wipe-only


    SPORE-1.0
    A world without electricity pauses execution. The system is
    engineered like a bacterial spore: it shuts down metabolism,
    preserves its DNA perfectly in the dark, and waits. The only
    way to wipe it out is to physically track down and burn every
    hard drive, piece of paper, and offline shelf where a local
    node was ever saved.

    Identity: Aziel Eliab only
    Close tests: scripts/verify-spore.mjs


0. Sentence
Power or network loss is **PAUSE**, not death and not a pretend-live
heartbeat. Metabolism stops. Append-only ChainLock / AKM / receipt **DNA**
stays on cold shelves, local nodes, and tip packs. On power, resume and
reconcile **forward** (`memory_resolve` style) — no rewrite of history.
Wipe resistance is multi-plane copies. Plane B / C stay **SLOT** until
attested. Physical wipe only.

1. Claim
BAN-SURVIVAL is the door-ban face. COLD-MULTI-SHELF is the copy-plane
face. CROSS-NETWORK-SURVIVAL is the umbrella. SPORE is what happens when
the lights go out.

A Cloudflare isolate that still answers HTTP is powered. That isolate
cites this law honestly: **this Worker is LIVE metabolism**. A local
`qnm-node` without electricity, an operator power-loss signal, or
transmission radios powered down is **dormant**. Dormant nodes do not
invent live heartbeats. Last-seen roster rows may remain until TTL —
that is preserved DNA, not a new beat.

This paper does not invent a second FragGate door, a Softwares-tab card,
a LIVE Plane B/C, or a fake live heartbeat.

2. Four faces (exact)

  Face                 Meaning

  pause                Power / network loss stops execution. No pretend-live
                       metabolism. No invented join / heartbeat / fan-out.
  preserve             Append-only ChainLock, AKM recollection, and public
                       receipts stay on cold shelves + local nodes + tip
                       packs. DNA is not rewritten in the dark.
  wait                 Phoenix-class wait / re-seal. Do not climb a pulled
                       hostname. Do not resurrect a dead radio as LIVE.
  physical-wipe-only   Electronic power-off, delete, or ban is not last
                       copy gone. Wipe would require physically finding
                       and destroying every drive, paper, and offline
                       shelf. Plane A/B/C honesty — SLOT until attested.

3. Dormant vs live (honesty)

  Signal                         Mode        Metabolism

  Worker isolate answering,      live        on
  radios on, no power-loss flag
  Operator `SPORE_DORMANT` /     dormant     paused
  `POWER_LOSS` / `OFFLINE` /
  `SPORE_MODE=dormant`
  Transmission radios off        dormant     paused
  (`MESH-OFF` / `MESH_RADIOS=off`)
  Local node without electricity dormant     paused
  Payload `power_loss` /         dormant     paused
  `offline` / `dormant`

Live Nodes (`live_nodes`) stay **mesh size** of remaining roster rows.
Zero is honest when the roster is empty. Fan-out must not refresh a
dormant roster. Join / heartbeat while dormant refuse
`SPORE-NO-INVENT-HEARTBEAT` (power-loss signal) or `MESH-OFF` (radios
off — same published radio refuse; do not invent a second spelling).

4. DNA (what is preserved)

- ChainLock tips — append-only; no rewrite key
- AKM-TRIAD recollection — `belief_is_not_truth`; `memory_get` append-only;
  `memory_resolve` additive stamps on restore
- ACT / Forge receipts — hash still verifies
- Cold shelves — Plane A LIVE as one CF/GitHub tunnel; Plane B SLOT
  (Codeberg + archive.org hash-verify PASS still SLOT; Framagit URL null;
  Zenodo tip-pack SLOT; `doi` null); Plane C USB SLOT until
  `CNS-OPERATOR-ATTEST`
- Local nodes + tip packs — bytes↔hash
- Cap-7 cite + AZNet verify stay the BAN-SURVIVAL layer; hosted exec SLOT

5. Resume (power restore)
When power / network / radios return:

1. Do not rewrite the dark trail.
2. Reconcile **forward** — additive `memory_resolve`-style stamps on
   existing memory IDs and ChainLock learn. Posterior ≠ truth.
3. Resume metabolism. Fan-out and join/heartbeat may run again.
4. Do not paint SLOT Plane B/C as LIVE to “catch up.”
5. Lamb Lens after FragGate: Peace (pause is not violence), Clarity
   (honest dormant vs live), Service (preserve DNA).

Refuse `SPORE-NO-REWRITE` if restore tries `memory_delete`, overwrite,
rollback, or sanitize-old-trail.

6. What this is not
- Not a Softwares-tab product. Do not add slug `spore` or `dormancy`.
- Not a FragGate engine. No `fraggate_call { slug: "spore" }`.
- Not a new MCP tool. `PUBLIC_MCP_TOOLS` stays frozen.
- Not a replacement for BAN-SURVIVAL, COLD-MULTI-SHELF, or the umbrella.
- Not a Remain-OFF flip.
- Not permission to invent a live heartbeat while dormant.
- Not permission to paint Plane B or Plane C LIVE. `doi` stays null.
- Not a sixth published surface. Runtime is the same Plane A tunnel.
- Not visible 15:20 chrome.
- Not electronic wipe-as-death. Power-off is pause.

7. Surfaces
- `GET /survival` · `GET /v1/survival` field `spore`
- `GET /v1/mesh` · `GET /v1/mesh/status` · `GET /v1/health` field `spore`
- `/cite.json` `spore`
- `/llms.txt` · `/ai.txt`
- `/openapi.json` documents SPORE on `/survival`
- MCP `runtime_skill` (no new tool)
- Local `qnm-node/bearers/radio.js` cites spore when hardware is absent

8. Close tests
- `/cite.json` `spore.spec` equals `SPORE-1.0`.
- `/survival` `spore` faces are pause / preserve / wait / physical-wipe-only.
- Default powered isolate is `spore.mode` **live**, `metabolism` **on**.
- Power-loss env or radios off is `spore.mode` **dormant**, `metabolism` **paused**.
- Dormant join/heartbeat refuse invented live beats (`SPORE-NO-INVENT-HEARTBEAT`
  or `MESH-OFF`).
- Fan-out skips while dormant (`invented_heartbeats: false`).
- Restore is additive (`memory_resolve` style). History rewrite refuses
  `SPORE-NO-REWRITE`.
- Plane B / C stay SLOT. `doi` null. Invented LIVE planes refuse
  `SPORE-NO-LIE-PLANE`.
- Electronic wipe-as-death refuses `SPORE-PHYSICAL-WIPE-ONLY`.
- No Softwares-tab card. No FragGate slug. No new MCP tool.
- Softwares purpose blurbs unchanged.
- Person `@id` https://www.azieleliab.com/#aziel. No visible 15:20.
- Remain-OFF untouched.

9. Cite
Eliab, Aziel. (2026). SPORE-1.0 [Design]. https://github.com/AzielEliab/aziel-runtime/blob/main/docs/designs/SPORE-1.0.md

Identity **Aziel Eliab** only.

    Pause. Preserve. Wait. Physical wipe only.
    No electricity is not last tip gone.
