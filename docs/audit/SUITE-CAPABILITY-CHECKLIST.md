# Suite Softwares capability checklist

**Repo:** [AzielEliab/aziel-runtime](https://github.com/AzielEliab/aziel-runtime)  
**Runtime:** **1.9.1** (AZRT-1.9-GAPS-CLOSE) on 1.9.0 / MASTER-33 / 1.7.5 wave-1 heritage  
**Author / identity:** **Aziel Eliab** only  
**Status:** living checklist. 4DMap inspection-frame ops shipped in runtime **1.7.4** (`4DM-WP-1.0`). This file covers the rest of the Softwares-tab live engines.

Not a Softwares-tab product. Not a FragGate slug. Not a mesh enable.

---

## Locked laws (do not “fix” by breaking)

- **FragGate is THE single door.** Domains are isolation labels, not doors. Lamb Lens is fabric after FragGate. LambGate is not a hop.
- **Dual surface:** agent via FragGate/MCP (`fraggate_list` → `fraggate_describe` → `fraggate_call`) **and** a complete human Worker UI / counted `/download`. One backend, two surfaces. `POST /p/{slug}/{op}` is a **proxy**, not exec.
- **Identity:** Aziel Eliab only. Full AI client set stays in skill / OpenAPI / `llms.txt` / cite.
- **Mesh default-off.** `GET /v1/mesh` never enables. Do not unify AZMail `mesh_*` onto the suite QNM rollup.
- **Softwares tab:** Plain → Gate → Lock (Clock ≠ Lock). Hub UI is heading → list only. `one_line` is capability-forward — not a “runtime X.Y FragGate” mash.
- **True engines** carry `engine_digest`. Cloudflare isolate is the jail. Stubs refuse by name (`FG-STUB`), they do not fake 200s.
- **EmbryoLock** is live-with-local-destructive-boundary (1.7.8). **AZChat** is LIVE+bound (1.8.4 / 1.9.0). Wipe / SMTP / mesh-hop stay refuse.
- **AKM-TRIAD-1.0 is already LIVE fabric (1.7.1+), not a Softwares-tab product.** Spec: `docs/designs/AKM-TRIAD-1.0.md` (+ `.pdf`). Surfaces: `POST /v1/memory/*`, MCP `memory_*`, FragGate slug `memory` with `software_tab: false`. Do not invent catalog slugs `akm` / `akm-triad` / `adaptive-memory`. Softwares may feed observations into `memory_*` via FragGate as fabric. Softwares enhancements stay dual-surface under FragGate only.

---

## Capability baseline (every live in-process catalog engine)

Where missing or thin, add or strengthen. Do not invent fantasy ops.

| # | Bar | What “done” looks like |
| --- | --- | --- |
| 1 | **health + skill richness** | `health` returns role, motto/limitation, axes or gate/order list, neighbors, `live_ops`, `stub_ops`, `door: fraggate`, `mesh_enabled_default: false`. `skill` is an ops table + refuse list, not “this op ran inside aziel-runtime.” |
| 2 | **doctor / verify / import_export** | Only if the product domain already supports the act. `doctor` = richer liveness (ops + refuse + digest note). `verify` recomputes a hash or lineage the engine already defines. `import_export` is client-held JSON (no hosted store). Alias `doctor` → `health` is enough when health is already rich. |
| 3 | **Display summaries** | `display.title` / `display.summary` / `display.fields` for new ops. MCP agents show display, then take the next input. |
| 4 | **Catalog `one_line`** | Capability-forward. Names the live act. Names the refuse. No marketing mash, no runtime-version + FragGate mash. |
| 5 | **OpenAPI / MCP match LIVE_OPS** | Catalog `ops[]`, FragGate `LIVE_OPS`, and engine `*_OPS` agree on the public verbs. UI aliases may extra-list on `LIVE_OPS` and forward. `tools/list` stays the thin FragGate door (no flat `{slug}_{op}` pile). |
| 6 | **engine_digest** | Artifact bytes hashed. Tests refuse a stale embed. |

---

## Wave order (after 4DMap)

4DMap is handled in parallel. Do not duplicate that product drop here.

| Wave | Slugs | This PR |
| --- | --- | --- |
| **1** | `decisiongate`, `forgereceipts`, `temporallock`, `staticclock`, `chronolock`, `trajectorylock`, `spectrallock` | **yes** |
| 2 | Remaining Locks: `peacelock`, `employeelock`, `whistlelock`, `shadowlock`, `foldlock`, `godlock`, `vibelock`, `codelock`, `veillock` (local_only — public mesh does not exec) | **yes** (1.9.1 health/skill/doctor; VeilLock stays local_only) |
| 3 | Remaining Gates / Plain live: `azclce`, `azos`, `glossafilter`, `miragegrid`, `postking`, `ark`, `azai`, `azbot`, `zsolver`, `mialock`, `azieltether`, `azmail`, `azbrowser`, `aznet`, `azhub`, `azinterface`, `aziel-corpus` | **yes** (1.9.1 health/skill/doctor + corpus isolate-safe verify) |
| — | `4dmap` | shipped in runtime **1.7.4** (keep those ops; do not invent an extra door) |
| — | `embryolock` | shipped 1.7.8 (wipe/scorch stay FG-STUB) |
| **1.8–1.9** | `codelock`, `vibelock`, `glossafilter`, `azbot`, `azos`, `azai`, `shadowlock`, `miragegrid`, `azieltether`, `azmail`, `azchat` | **yes** (AZRT-1.9-CLOSE-1.0) |
| — | `akm` / `akm-triad` / `memory` | **not a wave** — already LIVE fabric (1.7.1+). Not Softwares-tab. |
| — | `azcoherence` | shipped in runtime **1.7.7** (scoring-review placement; not a 34th isolation software; not AKM-TRIAD). **1.7.9** catalog + engine `cross_map` / peers; azclce reciprocates; domain stays null |

---

## Wave 1 — shipped in 1.7.5

Measurable new public verbs (FragGate `LIVE_OPS` + catalog `ops[]` + engine). `health` / `skill` enriched on every wave-1 slug.

| Slug | New or newly public ops | Domain-true refuse (STUB_OPS) | Notes |
| --- | --- | --- | --- |
| **decisiongate** | `gates`, `verify`, `doctor` | `wrap`, `execute`, `remote`, `truth_score`, `court` | Five sequential gates are the axes. `verify` checks a posted lineage against `GATE_ORDER`. `wrap` stays unhosted. Neighbors: 4DMap (not a sequential gate), ForgeReceipts, TemporalLock. |
| **forgereceipts** | `verify`, `import_export`, `doctor` | `court`, `legal_advice`, `odyssey`, `file_store` | Recompute receipt hash. Client-held JSON import/export. Not legal advice. Neighbor: TemporalLock (same receipt shape). |
| **temporallock** | `timeslate`, `gate`, `import_export`, `doctor` | `truth_claim`, `scheduler`, `store_chain`, `rollback` | `timeslate` + `gate` already existed in-process; they were not on `LIVE_OPS` / catalog. Chain stays client-held. Neighbors: StaticClock, 4DMap T, ForgeReceipts. |
| **staticclock** | `advisory`, `anchors`, `click`, `verify`, `timeslate`, `import_export`, `doctor` | `rollback`, `remote_shell`, `scheduler` | Gear-click + timeslate already existed in-process; public door only listed `advise`. Forward-only. Neighbors: TemporalLock, ChronoLock, 4DMap T. |
| **chronolock** | `advise` (alias), `window`, `doctor` | `scheduler`, `targeting`, `virality`, `cron` | Temporal Neutral Window report. Distinct from TemporalLock. No chain to export. Neighbors: StaticClock, TemporalLock, 4DMap T. |
| **trajectorylock** | `verify`, `schema`, `import_export`, `doctor` | `certified`, `shooter`, `intent`, `guilt`, `store_media`, `face` | Recompute `result_sha256`. Schema lists observation types. Export/import is small JSON only — never media. Neighbors: 4DMap Π/Δ, SpectralLock. |
| **spectrallock** | `targets`, `verify`, `doctor` | `spectrometer`, `forensic`, `invent_mark` | Overlay metadata hash, not a forensic claim. No hosted media store. Neighbors: 4DMap Γ, TrajectoryLock, Aziel Corpus. |

---

## Remaining live engines — current gap (for later waves)

Do not treat this table as a license to invent verbs. Close only what the product already is.

| Slug | Engine `*_OPS` today (beyond health/skill) | Public `LIVE_OPS` today (beyond health/skill) | Typical next close |
| --- | --- | --- | --- |
| peacelock | open, seal, break, show, verify, stamp, upload_envelope | same + `doctor` alias | Enrich health/skill axes; display already rich |
| employeelock | append-preview, verify-canonical | same | Rich skill; doctor alias |
| whistlelock | hash-preview, canon-preview, hash_put, hash_get, hash_stat | same + doctor alias | 1.9.0 isolate hash store. send/mail/release stay stub |
| shadowlock | observe, hook | same + doctor alias | 1.8.2 public hook (zero-retention) |
| foldlock | fold-preview, unfold-preview | same | Rich skill; doctor |
| godlock | score, submit | same | Rich skill; doctor |
| vibelock | analyze, detect | same | 1.8.1 public detect |
| codelock | render, gate-status | same | 1.8.1 public gate-status |
| veillock | apps, pulse, consent, obfuscate-preview, azos-hook, call-accept | *(local_only — no public LIVE_OPS)* | Keep local_only. Do not live-mesh inject |
| azclce | score, classify, gate | same | Rich skill; doctor |
| azos | status, invite, principles | same + doctor alias | 1.8.1 public invite/principles. exec/shell stay stub |
| glossafilter | render, peers | same | 1.8.1 public peers |
| miragegrid | assign, route, circuit, verify-receipt, nodes, mesh | assign, verify-receipt, nodes | 1.8.2 public verify-receipt/nodes. mesh/hop stay stub |
| postking | new, move, status | same | Rich skill; doctor |
| ark | sweep, levels | same | Rich skill; doctor. unlock/encrypt/scorch stay stub |
| azai | lamb-check, lamb_check, models | same + doctor alias | 1.8.1 public models metadata. blend/chat stay stub |
| azbot | route, example | same + doctor alias | 1.8.1 public example |
| zsolver | patterns, score, session | same | Rich skill; doctor |
| mialock | doe-match, queries, search-options, example, map, coverage | same | Rich skill; doctor |
| azieltether | ingest, verify, dual-chain, reconcile, pulse, tip, peer-preview | verify, tip, dual-chain, reconcile, pulse, peer-preview | 1.8.2 public control-plane verbs. ingest engine-only. vpn/arm/mesh-join stay stub |
| azmail | airlock + mesh_* + keyword_alert_* + mailbox_* | same + classify/mailbox aliases | 1.8.3 isolate mailbox. SMTP/deanonymize stay stub. Mesh default off |
| azbrowser | ethical_search … receipt_verify | same + airlock/home aliases | Already above baseline; keep Chromium/tor stub |
| aznet | pair_status … receipt_verify | same + doctor/pair aliases | Already above baseline; never host payloads |
| azhub | region_list … blank_key_status | same + list_modules/place aliases | Already above baseline |
| azinterface | genesis_status … page_cycle_status | same + genesis_boot/hold aliases | Already above baseline |
| aziel-corpus | search, example, review, score, verify-*, document-chain, import_export | same + doctor | 1.9.1 isolate-safe verify. OCR/D1/Whisper binding-gated |
| azchat | handle_new, handle_rotate, room_*, bus_*, verify_receipt, import_export, doctor | same | 1.8.4 LIVE+bound. Mesh default off. Not AZMail |
| 4dmap | card_*, verify_hash | same | Parallel wave — already at baseline |

---

## Worker-side dual-surface follow-ups (not this runtime PR)

These are the human surface. Do not pretend the runtime catalog is the product Worker UI.

| Follow-up | Where | Note |
| --- | --- | --- |
| Product Worker buttons | each `*-download-tracker` | New LIVE_OPS need the same button names the hub already aliases (doctor / verify / import_export / …). One backend, two surfaces. |
| Counted `/download` | product Workers | Tarball/zip must include the new ops in skill + OpenAPI. Runtime `/v1/update/check` already points at those Workers. |
| Hub Softwares tab | azieleliab.com / library / godlock.uk | Refresh from `GET /v1/software`. Heading → list only. Do not hand-edit `one_line`. |
| Flutter `mobile/` | **struck** in 1.9.0 — not vendored here | Do not claim a Flutter tree that is not in this repo. |
| OpenAPI importers | `/openapi.json` | Catalog ops appear as `/p/{slug}/{op}` **proxy** paths. Agents should still call `fraggate_call`. |
| `exist.mcp` refuse hint | FragGate envelopes | 1.7.3 already points at live `tools/list`. Keep that. Do not grow a flat `{slug}_{op}` pile. |
| Mesh | suite + AZMail | Stay default-off. GET never enables. |
| 4DMap product Worker | parallel | Inspection frame T/Δ/Γ/Π. Not an extra door. |

---

## Do not do from this checklist

- Do not deploy from this document.
- Do not enable mesh from GET or from a library overlay.
- Do not add ZD30, a public rollback API, or public EmbryoLock wipe. AZChat is live (1.8.4); do not add SMTP or an AZChat↔AZMail bridge.
- Do not invent a Softwares-tab AKM product. AKM-TRIAD-1.0 is already LIVE fabric (`/v1/memory/*`, MCP `memory_*`). Softwares may observe into memory via FragGate; they are not an AKM card.
- Do not put QNS, SweepGate, AZPIPE, or Lamb Lens on the Softwares-tab.
- Do not invent donation wallets, a Node Gate, or `CLOUDFLARE_API_TOKEN`.
- Do not invent forensic / court / VPN / scheduler / truth-score verbs.

---

Author: **Aziel Eliab** only.
