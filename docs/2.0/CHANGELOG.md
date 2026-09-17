# Changelog / migration — 1.9.x → 2.0.0-rc1

**Author / identity:** **Aziel Eliab** only  
**Kind:** contract freeze. **No intentional behavioral breaks.**

Crawler abstract (`RUNTIME_ABSTRACT`) is unchanged and stays the lead on homepage / `/llms.txt` / `/cite.json` / `/about` / OpenAPI `info.description`. These notes belong **below** that abstract.

---

## 2.0.0-rc1 (current)

Certification point — not a feature dump.

- Mesh/security close-test matrix (`scripts/verify-mesh-security.mjs`, not a new public tool): fail-closed gates for suite-presence ON, GET-never-enables, `MESH-DISABLE-REFUSED`, bearer enable, join product/node_id/presence, 5-minute non-fanout TTL + heartbeat refresh, broadcast no-bytes, NO-LIE / NO-REWRITE, Cap-7 `resolves_to_hub: false`. No MCP tool added, removed, or renamed. Remain-OFF untouched.
- F02 caller isolation (not a new public tool): AZHub and AZInterface isolate private workspace state by verified session or operator token. Public FragGate HTTP / MCP / UI stay on the labeled shared public-demo singleton. `confirm:true` is not authentication. No invented OAuth IdP.
- F01 concurrent-append integrity patch (not a new public tool): CHAINLOCK Durable Object writer per chain; individual records; commit-before-ack; idempotency + caller namespaces. No MCP tool added, removed, or renamed. Remain-OFF untouched.
- Sentinel pass4 MCP honesty (not a new public tool): mutating MCP tools still document `confirm` / `dry_run` and set `annotations.requiresConfirmation`, but those flags are **not** in `inputSchema.required` (connector replay after refresh must not break). Runtime `tools/call` still refuses `MCP-CONFIRM-REQUIRED` unless `confirm=true` or `dry_run=true`. Initialize instructions also scrub bare `retired` / `this`. HTTP FragGate call unchanged. Identity Aziel Eliab only. Lamb Lens / DecisionGATE not weakened.
- NodeMesh / `mesh_join` contract honesty (not a new public tool): `product` required; optional `node_id` exactly 8–80 `[a-z0-9._-]`; `presence` `live`|`locked`|`isolated`; additive presence has a **strict 5-minute TTL** (heartbeat refreshes; else dropped). Join/heartbeat/broadcast refuse **`MESH-OFF`** when transmission radios are off. Read paths stay honest. HTTP + MCP + FragGate door unchanged. No MCP tool added/removed/renamed.
- Sentinel pass3 MCP honesty (not a new public tool): claimed `protocolVersion` is `2025-11-25` on initialize, `MCP-Protocol-Version`, and the server card even when the client sends `2025-03-26` / `latest` / `validator_protocol_version`. Dated versions stay accepted. Initialize instructions no longer expose bare `Aziel` / `counters` / `leftover` tokens. Every write MCP tool has required `confirm` plus `dry_run` and `annotations.requiresConfirmation`. HTTP FragGate call unchanged.
- Sentinel pass2 MCP transport honesty (not a new public tool): preferred `protocolVersion` `2025-11-25` in initialize, response headers, and `/.well-known/mcp/server-card.json`. Still accepts `2025-06-18` and `2025-03-26`. Invalid protocol is HTTP 400. `Mcp-Session-Id` issued and echoed. `DELETE /mcp` tears down; reuse is 404. `GET` SSE is 405 (not faked). Mutating MCP tools require `confirm=true` or `dry_run=true`. HTTP FragGate call unchanged. Identity Aziel Eliab only. Lamb Lens / DecisionGATE not weakened.
- Public contract frozen under `docs/2.0/` (FragGate flow, MCP names, OpenAPI parity, health/version, `engine_digest`, live/stub/proxy-fallback).
- Gate 4 distribution identity includes Glama TDQS 5.0 metadata (`tools/list` descriptions / params / truthful annotations / output schemas) plus existing `glama.json` and GitHub topics. Folded into this same 2.0.0-rc1 train — not a side quest. **No tool renames. No behavior / routing / refusal changes.** `fraggate_call` is not globally read-only or idempotent. A follow-up metadata pass tightens pairwise first sentences, lifecycle completeness (append-only families have no delete), initialize `serverInfo.version` lead, and `glama.json` `version`. A second metadata pass lifts the weakest per-tool scores (4.1–4.3) with refuse codes, omit-defaults, and aliases the door already accepts — still no behavior change. See `docs/GLAMA-TDQS.md`. GitHub-side SEO lock (`docs/GITHUB.md` / README hubs) restates Try on Glama primary and locked Person/Runtime `@id`s without changing Worker HTML or MCP handlers.
- Compatibility, receipt, refusal, and breaking-change policies published.
- Clean-room reproducibility script + machine-readable evidence schema.
- External adversarial pack wrapping the existing `verify-adversarial` + Remain-OFF matrix (reviewer-ready; **self-test ≠ third-party lab**).
- Version strings: `package.json`, `RUNTIME_VERSION`, `VERSION_HISTORY`, SEO changelog **below** the abstract.
- Remain-OFF untouched. FragGate remains THE single door. Read-only QNM suite-presence is ON by default. `GET /v1/mesh` never enables radios beyond that. `POST /v1/mesh/disable` refuses `MESH-DISABLE-REFUSED`.
- Worker homepage/UI chrome: rose-star brand mark top-left. Public Worker HTML scrubs “Everblooming sigil” / everblooming verbage. Visible identity Aziel Eliab only. README public copy now labels `/sigil.png` as the rose-star brand mark. Skill markdown + `X-Aziel-Sigil` unchanged. No Remain-OFF change. No MCP behavior change.
- Cite/catalog `stats` / `social_status` plus optional `GET /v1/stats-rollups` for AZindex awareness (read-only sibling snapshots; never invent numbers). No MCP tool added.
- AZindex cross-index: `/sitemap-index.xml` and `robots.txt` now list `https://www.hedidntjump.com/sitemap.xml` with the Softwares hubs. `/cite.json` and `/v1/catalog.json` add `sister_archives` / `hedidntjump_*` (`software_tab: false`). Not a Softwares-tab engine. No MCP behavior change.
- Additive ACT-RECEIPT-1.0 fabric (not a Softwares engine): fail-open append to corpus `/v1/receipts/append` after FragGate list/call, `POST /mcp`, and significant `POST /v1/*` when `RECEIPT_APPEND_TOKEN` is set. Public chain lives on corpus `/receipts`. `GET /v1/receipts` cites; tip/proxy is optional. No new MCP tool. Remain-OFF untouched.
- CROSS-NETWORK-SURVIVAL-1.0 machine cite: `/cite.json` `survival.tip` and `/llms.txt` carry one survival tip string. Design paper in `docs/designs/`. No new MCP tool. Remain-OFF untouched.
- Additive NO-LIE-NO-REWRITE-1.0 law (companion under the umbrella; does not replace the machine tip): receipts that still hash; copies not all on one tunnel; no rewrite key; never lie to survive. `GET /v1/mesh` cites the flags. Rewrite / lie verbs refuse `MESH-NO-REWRITE` / `MESH-NO-LIE`. No new MCP tool. Remain-OFF untouched.
- Additive COLD-MULTI-SHELF-1.0 cite (`GET /shelves`) matches live corpus#96 `/shelves` honesty (hub parity after corpus#104): Plane A 5 published surfaces / 2 family radii / 1 independent live; Plane B Codeberg + archive.org PASS still SLOT (`https://archive.org/details/aziel-lockset-tip` + `https://archive.org/details/aziel-lockset-tip_202609`, same blast_radius); Framagit URL null; GitFlic refused `CNS-GITFLIC-EMAIL`; GitLab refused `CNS-GITLAB-CF-LOOP`; Zenodo refused; `doi` null; Plane C USB SLOT. Runtime is the same Plane A tunnel, not a sixth surface. Linked fields on `GET /shelves` cite `redline.spec`, Cap-7 `design_of` + `resolves_to_hub: false`, and the attack-sim refuse pointer (do not drop those cites). No new MCP tool. Remain-OFF untouched.
- Dual-surface AI upload/download/invoke how-to on `runtime_skill` + OpenAPI. Cap-7 semantic-bridge cite (`/cite.json` `semantic_bridge`, `GET /v1/mesh/az-generator`, MirageGrid `bridge`). Inherit hub designs only (azcorpus + azlibrary on the library hub). `design_of: hub_designs`. `resolves_to_hub: false`. `name_may_change`. Canonical hubs immutable. Not ICANN aliases. No fifth product. No live registrar. GET never enables radios. Catalog + skill name mesh-resident website designs **azcorpus** + **azlibrary** (downloadable to nodes; azlibrary upload is API token only). No new MCP tool.
- Additive REDLINE-2026-09-14 (`docs/designs/REDLINE-2026-09-14.md` + `src/redline.js`): map public doors; refuse anonymous mutate; operator token header-only; Growth-ON Allow (no GPTBot Disallow); Cloudflare TLS cite; attack sims refuse AZ Generator call, GET `/v1/mesh` enable, Cap-7 `resolves_to_hub` injection, fake Zenodo DOI, and token leak. Hub crawl edges unchanged. No new MCP tool.
- Architecture-fit placements (not isolation-33 engines; no new MCP tool): `zkattest` (hash-commitment attest; Groth16/SNARK SLOT), `mmconsensus` (posted-opinion tally adjacent to DecisionGATE; live model calls SLOT), `toolbench` (synthetic FragGate refuse playground;  SLOT). In-runtime (`worker_home` null). See [ARCHITECTURE-FIT-FIVE.md](ARCHITECTURE-FIT-FIVE.md).
- Edge MCP gateway honesty: `GET /mcp` + server card cite `gateway.role=edge-mcp-gateway` terminating at `fraggate_call`. No second MCP door.
- Session isolate envelopes: `max_ops`, `wipe_on_close`, `sandbox_kind=isolate`. QEMU/KVM/guest VM policy refuses `guest_vm_refused`. Worker/DO isolate remains the jail.
- No remote shell / VPN / deanonymize / public SMTP.
- No `2.0.0` final tag in this PR.

### Migration for 1.9.x clients

| Client habit (1.9.x) | 2.0.0-rc1 |
|----------------------|-----------|
| `fraggate_list` → `fraggate_describe` → `fraggate_call` | Unchanged |
| `POST /v1/fraggate/call` | Unchanged |
| `POST /mcp` initialize `2025-03-26` | Still accepted (not HTTP 400); claimed `protocolVersion` stays `2025-11-25` unless `require_legacy_protocol=true` |
| MCP mutating `tools/call` without confirm | Now `MCP-CONFIRM-REQUIRED` unless `dry_run=true`. HTTP `/v1/fraggate/call` unchanged |
| 36 `PUBLIC_MCP_TOOLS` | Unchanged names; TDQS-richer descriptions / params / annotations |
| `/p/{slug}/{op}` is proxy | Unchanged |
| Remain-OFF verbs refuse | Unchanged |
| `POST /v1/mesh/disable` turns suite radios off | Now `MESH-DISABLE-REFUSED`; read-only suite-presence stays ON |
| `/v1/mesh` `mesh_default: "off"` | Now `"on"`; `enabled_default` true |
| Glama stdio `node cli/mcp-stdio.mjs` | Unchanged |
| Read `version` from health / runtime.json | Now `2.0.0-rc1` (same snapshot shape) |

If you pinned `1.9.3` in a client assertion, update the version string only. MCP mutating `tools/call` now also needs `confirm=true` (or `dry_run=true`). HTTP FragGate call shapes stay the same.

---

## Heritage (superseded, still true)

- **1.9.3** — remaining AZRT-1.9-GAPS-CLOSE: isolate AZ-OS session VFS; isolate-safe jeeves; binding-gated media-run; published independent-validation attestation path (not a third-party lab).
- **1.9.2** — bind Workers Browser Rendering (`BROWSER`) and live D1 MASTER (`CORPUS_D1`); Workers AI (`AI`) for Whisper/OCR honesty. Sample MASTER unbound fallback. Tor/phoenix refuse.
- **1.9.1** — isolate-safe corpus verify; adversarial self-check + Actions `npm test`; `/v1/software` `engine_digest`.
- **1.9.0** — AZRT-1.9-CLOSE-1.0 public-safe LIVE_OPS; AZMail isolate mailbox; AZChat LIVE+bound; isolate hash store; OpenAPI proxy-path parity.
- **1.7.11** — SEO abstract locked as crawler lead.

Full structured history: `VERSION_HISTORY` in `src/runtime-api.js`.
