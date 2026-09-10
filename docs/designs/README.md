# Suite software designs
Author: **Aziel Eliab** only.
See pack 2026-09-06 + pack 2026-09-09 papers in this folder.
**MASTER-33** (runtime 1.7.0) locks the public hop order: Human → AZInterface → PUBLIC/UI/AGENT/API → FragGate → Lamb Lens → SweepGate → Sentinel → Provenance/Input Packet → ChainLock-IN → DecisionGATE → AZPIPE → Internal Domain Layer → optional ASE → RoseClock → TemporalLock → ChainLock-OUT → ForgeReceipts → Return. FragGate is THE single door. Lamb Lens is fabric after FragGate. Domains are isolation labels, not doors. LambGate is not a hop. FoldLock fld3-wire stays internal to AZPIPE. **SUITE-PIPE-1.6.15** is the historical 1.6.15 lock (kept; not rolled back).
**4DM-WP-1.0** is the 4DMap product spec (slug `4dmap`, Plain bucket) — inspection frame after AZPIPE routes to isolated engines; not a sequential gate and not an extra door. Neighbors TemporalLock / StaticClock / ChronoLock / TrajectoryLock / SpectralLock. ChainLock may stamp walks. FragGate claims cite join types.


LIVE fabric on this Worker (not Softwares-tab): CL-WP-0.4, AP-WP-0.2, SG-WP-0.1, LS-WP-0.1, RL-WP-0.1-runtime (library RL is aziel-corpus only), QNS-CD-1.0 (photon QNS1 1.3; local `qnsd` in qnm-node; Worker cites only), **AKM-TRIAD-1.0** (adaptive recollection / Bayesian calibration / 3-of-4 triad; behind FragGate).

**Softwares capability checklist** (runtime 1.7.5 wave 1): [`docs/audit/SUITE-CAPABILITY-CHECKLIST.md`](../audit/SUITE-CAPABILITY-CHECKLIST.md). 4DMap inspection-frame ops shipped in 1.7.4. Product 0.2.0 LIVE_OPS sync shipped in 1.7.6. Remaining Locks/Gates/Plain live engines are listed for later waves. EmbryoLock / AZChat stay name-only stubs (EmbryoLock landing is a separate PR). **AKM-TRIAD-1.0 is already LIVE fabric** (`docs/designs/AKM-TRIAD-1.0.md` + `.pdf`; `/v1/memory/*`; MCP `memory_*`) — not a Softwares-tab product; capability waves must not invent one. Softwares may feed `memory_*` via FragGate only.
