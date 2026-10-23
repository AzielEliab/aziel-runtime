# AZNews ↔ 4DMap — integration and standalone honesty

Runtime **2.0.0-rc1** on `main`. Author: **Aziel Eliab** only.

This page is the operator-facing honesty sheet for how **AZNews** and **4DMap** work together and apart inside **aziel-runtime**. It does not invent a separate public AZNews repository, a 43rd Softwares card, or a 37th MCP tool.

## Catalog and door limits (unchanged)

| Surface | Count | AZNews |
|--------|------:|--------|
| Softwares tab (`GET /v1/software`) | **42** | **Not listed** — no `aznews` slug |
| MCP `tools/list` | **36** | **Not listed** — no `news_*` or `aznews` tool |
| FragGate slug | `4dmap` | All `news_*` ops run on the **4dmap** engine only |

4DMap catalog copy (`src/software-copy.js`) states that AZNews may store alone or pin on the map. That is descriptive, not a second product card.

## Two paths (both callable)

| Mode | Primary ops | What it does | Pins the map? |
|------|-------------|--------------|---------------|
| **Standalone** | `news_ingest` | Stores wording, images (hash), and score on the dual hash lattice | **No** (`on_map: false`) |
| **Integrated (4DMap join)** | `news_pin`, `news_open` | Item → pins and pin → item round-trip on date × event × place | **Yes** when a real item is stored |

Read the current posture with **`news_status`** (FragGate `4dmap`) or **`GET /v1/aznews`** when the AzNewsStore Durable Object is bound.

HTTP mirrors for the join (store bound): `GET /v1/aznews/link` (item → pins), `GET /v1/aznews/open/{pin_id}` (pin → item).

The human globe at **`GET /aznews`** calls FragGate `news_globe` / related `news_*` reads through `POST /v1/fraggate/call` — same door, not a side API.

## What is *not* AZNews

| Cite / op | Honesty |
|-----------|---------|
| **`library_pin`** | Paper date × event × place from the corpus — **4DM-PIN-FRAME**, not RSS news. Persisted pins use **4dmap-v1** (`4DMAP-PLOT-PERSIST-1.0`). |
| **`https://www.azielcorpuslibrary.net/map`** | Library map cite only (`library_map_is_aznews: false`, `library_cite_merged: false`). Passing the URL to `news_pin` refuses **`AZNEWS-NOT-LIBRARY`**. |
| **Card `join` / `card_join`** | Multi-axis **card** joins (FragGate join types). Not the AZNews item ↔ pin join (**AZNEWS-JOIN-1.0**). |
| **`map_link` (4DMAP-LINK-1.0)** | Optional correspondence / reference-place links between **stored** news items and corpus pins on **4dmap-v1**. `needs_aznews: false` on the map store — linking is cron-driven, not a second door. |

## Execution contexts (do not confuse)

1. **AzNewsStore + 4dmap-v1 DO** (`env.AZNEWS` bound — production Worker): `src/engines/4dmap/aznews-live.js`, `src/aznews-do.js`. Rolling **`outlets_live`**, **`join_check`** (AZNEWS-JOIN-1.0), and **`lattice_live`** (AZNEWS-WALK-1.0) apply here. `ops.js` routes `news_feed`, `news_globe`, etc. through the store when bound.
2. **In-process lattice** (`src/engines/4dmap/lattice.js` → `aznews.js`): Used when the store is **unbound** (local verify, fixtures, legacy `news_pin` / `news_open` / `news_ingest` without live reads). Isolate-global `records` / `chain` — **not durable** across requests; `installed` stays false.

Both contexts implement standalone + join; flags and `outlets_live` semantics **differ** between them. Do not export DO rolling counts as catalog “global live.”

## Refuse paths (fail-closed)

| Code | When |
|------|------|
| **`AZNEWS-SOURCE-ABSENT`** | Empty `news_pin` / `news_open` / ingest with no fetched or supplied item; names `src/engines/4dmap/aznews-source.js` and the configured public Aziel feed (none on tip `main`). |
| **`AZNEWS-NOT-LIBRARY`** | Library map URL or corpus cite presented as news. |
| **`AZNEWS-STORE-UNBOUND`** | `news_feed`, `news_globe`, … when `env.AZNEWS` is missing in the isolate. |
| **`AZNEWS-OFFLINE-AUTH-REQUIRED`** | Offline view receipts without token-authenticated `GET /v1/aznews/*`. |
| Fixture with `fixture: true` | May **prove** paths; **`fixture_is_source: false`** — does not set join **`live`** or **`merged`**. |

## Live-flag honesty (do not flip falsely)

| Flag | In-process `aznews.js` | DO `liveFlags()` |
|------|------------------------|------------------|
| **`live` (join / product)** | `true` only after a **fetched** item is on a pin (`fetchedOnMap`) | `true` only with fresh stored news + **`lattice_live`** (see `live_rule` in status) |
| **`merged`** | Real pin on map, not fixture-driven | Join check fresh + merged sample + **`lattice_live`** |
| **`joined`** | Any record with `on_map` | Join check fresh and passing |
| **`outlets_live`** | **0** in `news_status` | Rolling 60-minute window over wired outlets (not catalog global live) |
| **`weather_live` / `sky_live`** | false unless filled in that context | Fresh pulls with no gaps (weather) / sky tick |
| **`installed` / `software_tab` / `mcp_tool`** | **always false** | **always false** |
| **`item_live`** | Supplied or fetched item stored (standalone ingest) | (store uses `source_present` / counts) |

A **supplied** real item can be item-live on standalone ingest without marking the **join** `live`. A **fixture** cannot. Until a **fetched** news item is stored on a pin, treat join **`live`** as **false** in catalog-facing copy even if the DO has historical rows from other environments.

## Code map (single repo)

| Area | Path |
|------|------|
| Standalone + join logic (in-process) | `src/engines/4dmap/aznews.js` |
| Live store, walk, join check | `src/engines/4dmap/aznews-live.js` |
| 4DMap op router | `src/engines/4dmap/ops.js` |
| Map persistence + news↔corpus links | `src/engines/4dmap/map-store.js` |
| DO bindings | `src/aznews-do.js` |
| OpenAPI + `GET /v1/aznews/*` | `src/index.js` |
| Product spec | `docs/designs/4DM-WP-1.0.md` |

## Verification harness

| Script | Covers |
|--------|--------|
| `scripts/verify-4dmap.mjs` | Refuse, fixture honesty, standalone ingest, join pin, catalog 42 / tools 36 |
| `scripts/verify-aznews-live.mjs` | DO store join round-trip, lattice walk, flags after stored data |
| `scripts/verify-aznews-4dmap-honesty.mjs` | This document present; exports align with stated ops |
| `scripts/verify-offline-stores.mjs` | `aznews` + `4dmap` rows in offline bundle |

## Residual gaps (honest, not blockers for dual paths)

1. **No public Aziel news feed** configured on tip `main` — adapter module exists; empty calls stay **`AZNEWS-SOURCE-ABSENT`** until fetch or supply stores an item.
2. **`live` overload** — catalog product `live`, Cap-7 `worker_live`, Whitestone, and AZNews `live` / `outlets_live` mean different things (`docs/AUDIT-2026-10-04.md` §512).
3. **In-process globals** — `aznews.js` `records`/`chain` are per-isolate; durability and join truth on the Worker are the **DO** paths.
4. **Press Gazette outlets** — configured; per-outlet RSS wired where recorded; catalog rows stay configured-but-not-live until a fetch stores an item (`outlets_live: 0` on in-process status).
5. **Cross-tether to AZ-OS** — comment on receipts only (`azos_updated: false`); runtime does not write AZ-OS.

## Bottom line

- **Standalone works**: `news_ingest` (+ store reads when bound).
- **Integration works**: `news_pin` / `news_open`, globe, optional `map_link`, separate from `library_pin`.
- **Catalog honesty holds**: 42 Softwares, 36 MCP tools, no AZNews repo split.
- **Do not** set join or catalog-global live flags true on tip `main` without a real fetched item on a pin and the matching verify scripts green on that deployment.

Cite: Eliab, Aziel. (2026). AZNEWS-4DMAP-INTEGRATION-HONESTY [Audit]. `docs/audit/AZNEWS-4DMAP-INTEGRATION-HONESTY.md`
