# Changelog

Public identity: **Aziel Eliab** only.

This file exists so Glama / crawlers that look for a repo-root changelog see the **current** MCP server version first.

## 2.0.0-rc1 (current)

- Dual-surface AI path: agents download via `GET /v1/update/check` / `GET /v1/pull/{slug}` and invoke upload/ingest/receipt ops through `fraggate_call` / OpenAPI. Humans stay on Worker UI + counted `/download`. Full AI client set restated on skill / OpenAPI / `llms.txt` / cite.
- Cap-7 semantic-bridge cite: MirageGrid-only mesh-name factory. Names inherit hub **designs** only. `resolves_to_hub: false`. Not aliases of the four ICANN hostnames. Live paths: MirageGrid Worker `/bridge`, `GET /v1/mesh/az-generator`, `fraggate_call` `{ slug: "miragegrid", op: "bridge" }`. `public_icann: false`. No AZ-GEN live registrar. No fake ICANN `.az`. No visible 15:20. `GET /v1/mesh` never enables radios. AZNet + AZBrowser for mesh browse. Plane A hubs mirror tips. **No MCP tool added.**
- MCP `initialize` `serverInfo.version` is `2.0.0-rc1` (same as `package.json` and `RUNTIME_VERSION`).
- `1.6.2` is **superseded heritage** (FragGate public-door widen). It is not the current server.
- Certification-point freeze. Read-only QNM suite-presence is ON by default; `POST /v1/mesh/disable` refuses `MESH-DISABLE-REFUSED`. Remain-OFF untouched.
- Follow-up TDQS metadata pass: weak-tool descriptions disclose refuse codes, omit-defaults, and door aliases already accepted by handlers. No tool rename. No behavior change. See [`docs/GLAMA-TDQS.md`](docs/GLAMA-TDQS.md).
- GitHub-side SEO / indexing lock: README ecosystem cross-links, [`docs/GITHUB.md`](docs/GITHUB.md), [`docs/CITE.md`](docs/CITE.md). Try on Glama primary. Entity `@id`s unchanged. No Worker / MCP handler change.
- Sister-archive chrome: Worker homepage / `/cite.json` / `/llms.txt` ecosystem lists [He Didn't Jump](https://www.hedidntjump.com/). Not a Softwares hub. **No MCP behavior change.**
- AZindex: `/sitemap-index.xml` and `robots.txt` Sitemap lines now include `https://www.hedidntjump.com/sitemap.xml` with the Softwares hubs. `/cite.json` + `/v1/catalog.json` add `sister_archives` / `hedidntjump_*` fields (`software_tab: false`). **No MCP behavior change.**
- Cross-tether social-status (AZindex awareness, not vanity): `/cite.json` and `/v1/catalog.json` publish `stats` / `social_status` (person_id `https://www.azieleliab.com/#aziel`) listing live hub stats URLs. Optional `GET /v1/stats-rollups` is a read-only best-effort snapshot (brief cache; never invents numbers; omit on timeout). Corpus counters are `GET /stats` (not `/v1/stats`; version is `/v1/health`). GodLock is `GET /stats` (`/v1/stats` is 404). He Didn't Jump is `/api/stats` only. Runtime `/v1/uses` is labeled agent/MCP usage. **No MCP behavior change.**
- Worker homepage/UI: rose-star brand mark top-left. Public Worker HTML no longer says “Everblooming sigil”. Visible identity **Aziel Eliab** only. Remain-OFF untouched. **No MCP behavior change.**
- README public copy labels `/sigil.png` as the rose-star brand mark (not “Everblooming sigil”). Skill markdown + `X-Aziel-Sigil` stay unchanged. **No MCP behavior change.**
- Additive ACT-RECEIPT-1.0 fabric (operator-approved runtime plugin): after FragGate list/call, `POST /mcp`, and significant `POST /v1/*`, the runtime POSTs four-field receipts to corpus `/v1/receipts/append` with header `x-aziel-receipt` when `RECEIPT_APPEND_TOKEN` is set. Fail-open without token. Public chain lives on [corpus /receipts](https://www.azielcorpuslibrary.net/receipts). `GET /v1/receipts` cites; tip/proxy is optional. Not a Softwares-tab product. Remain-OFF untouched.
- CROSS-NETWORK-SURVIVAL-1.0 machine cite: `/cite.json` `survival.tip` and `/llms.txt` carry one tip string (matching bytes on an independent shelf). Design paper in `docs/designs/`. Not a Softwares-tab product. No new MCP tool. Remain-OFF untouched.
- Additive **NO-LIE-NO-REWRITE-1.0** law (companion under that umbrella, does not replace the machine tip): receipts that still hash; copies not all on one tunnel; no rewrite key. The network is never allowed to lie — even to self-preserve, sustain, stay alive, adapt, or prevent death. `GET /v1/mesh` cites `no_lie` / `no_rewrite` / `rewrite_key: false`. Rewrite / lie verbs refuse `MESH-NO-REWRITE` / `MESH-NO-LIE`. No new MCP tool. Remain-OFF untouched.
- Full notes: [`docs/2.0/CHANGELOG.md`](docs/2.0/CHANGELOG.md).

## Heritage

Older rows live in `VERSION_HISTORY` / `docs/2.0/CHANGELOG.md`. Do not read a superseded row as `serverInfo.version`.
