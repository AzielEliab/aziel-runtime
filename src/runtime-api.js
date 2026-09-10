/**
 * Aziel Eliab Runtime — catalog + pull + proxy + session + in-process engines.
 * 1.1.0 was catalog+proxy that called itself a runtime.
 * 1.2.0 was a session/receipt runtime (exec still proxied).
 * 1.3.0 ran vendored engines inside this isolate for listed slugs.
 * 1.4.0 vendors a true engine for every catalog Software slug.
 * 1.4.1 adds production gates (ready, HEAD, no-store, receipt cap, TTL, rate limits, optional token).
 * 1.5.0 was the agent-native cut: display envelopes, flat product-verb MCP, runtime_run façade.
 * 1.6.0 is the FragGate door: hashed registry, thin tools/list, DecisionGATE before exec.
 * 1.6.1 lists every major OpenAPI / MCP / HTTP client (not only ChatGPT / Grok / Venice).
 * 1.6.2 widens the public FragGate LIVE_OPS door to sensible advisory engines.
 * 1.6.3 adds KV-backed API use trackers (GET /v1/uses). Distinct from download KV.
 * 1.6.4 adds PeaceLock (PL-WP-0.1) as a true in-process engine.
 * 1.6.11 adds a durable FragGate UI-op alias map (Worker button names → catalog ops) and names EmbryoLock as a stub / local-not-hosted registry entry (not a catalog engine).
 * 1.6.10 sets AZBrowser and AZNet catalog one_line to separate software (not engine).
 * 1.6.9 frames AZHub and AZInterface as sibling softwares under the same FragGate door.
 * 1.6.8 adds AZHub and AZInterface as two separate softwares under the same FragGate door (AIH-WP-1.0).
 * 1.6.7 adds AZNet (AZN-WP-0.1) as a FragGate-live engine (silent verification side-net).
 * 1.6.6 adds AZBrowser (AZB-1.0) as a FragGate-live engine (Lamb Lens ethical research browser). AZNet is a separate product.
 * 1.6.5 adds AZMail (APP 1.0) as a FragGate-live engine (mesh default off).
 * Public identity: Aziel Eliab only. Forks welcome. Do not invent DOIs.
 */
import { CATALOG_ALIASES, catalogExtraCards, FRAGGATE_GITHUB, fraggateHubCard } from "./catalog-meta.js";
import { honestyFields, trueEngineSlugs } from "./engines/registry.js";
import { FRAGGATE_KERNEL, FRAGGATE_KERNEL_VERSION } from "./fraggate/codes.js";
import { LIVE_OPS, buildRegistry } from "./fraggate/registry.js";
import {
  RATE_EXEC_PER_MIN,
  RATE_OPEN_PER_MIN,
  RECEIPT_CAP,
  SESSION_TTL_MS,
} from "./production.js";
import { citeCompatibleFields, skillCompatibleSection } from "./ai-clients.js";
import { designsSkillMarkdown } from "./seo.js";
import { LOCKED_STRIP } from "./azpipe.js";

export const RUNTIME_VERSION = "1.7.4";
export const RUNTIME_ROLE = "engine-runtime";
export const RUNTIME_LAYER = "catalog+pull+proxy+session+in-process-engines+fraggate";

export const VERSION_HISTORY = [
  { version: "1.7.4", status: "current", note: "4DMap in-process capability bump (4DM-WP-1.0): LIVE_OPS add frame_status, axis_describe, walk_trace, card_export, card_import, verify_chain, neighbor_cite. Stubs stay truth_score/lumen_panel/invent_mark/backdate_class. layer=inspection_frame; domains_are_doors:false; FragGate remains THE single door. Product 4dmap is still 0.1.0 on main — after product 0.2.0 deploys, recompute and sync engine_digest / catalog version. Mesh stays default-off. Identity Aziel Eliab only." },
  { version: "1.7.3", status: "superseded", note: "Audit WARN copy/hint: refuse exist.mcp lists the live MCP tool set and points at POST /mcp tools/list (not the thin 7-tool door alone). Public FragGate call stays open; session mutate requires token when REQUIRE_TOKEN=1 and RUNTIME_TOKEN is set. 4DMap Softwares copy is inspection frame / not an extra door (domains_are_doors:false). GET /v1/software count_note explains Softwares-tab placements (azinterface / decisiongate / forgereceipts) vs isolation software_count=33. OpenAPI lists POST /mcp. Mesh stays default-off. Identity Aziel Eliab only." },
  { version: "1.7.2", status: "superseded", note: "GET /v1/azpipe/arch (and POST) cites the locked MASTER-33 AZPIPE arch/strip — same payload FragGate already exposes as pipeline / pipeline_strip (v, magic, locked, master, lambgate, fraggate_single_door, roseclock, hop list, 11 domains / 33 softwares). Cite/read surface only. Not a Softwares-tab door. Not a FragGate slug. Mesh stays default-off. Identity Aziel Eliab only." },
  { version: "1.7.1", status: "superseded", note: "AKM-TRIAD-1.0: Adaptive Knowledge Recollection, Bayesian Calibration & 3-of-4 Triad Selection. ChainLock remains the immutable learn/recall ledger; the adaptive index is derived and rebuildable. Memory APIs behind FragGate (POST /v1/memory/observe|resolve|calibrate|recall, GET /v1/memory/{id}[+history|+calibration], POST /v1/memory/rebuild-index operator/local only). MCP memory_*. Not a Softwares-tab product. Posterior ≠ truth. No rollback. Identity Aziel Eliab only." },
  { version: "1.7.0", status: "superseded", note: "MASTER-33: FragGate is THE single door. Locked strip Human → AZInterface → PUBLIC/UI/AGENT/API → FragGate → Lamb Lens → SweepGate → Sentinel → Provenance/Input Packet → ChainLock-IN → DecisionGATE → AZPIPE → Internal Domain Layer → optional ASE → RoseClock (forward-only; StaticClock/VECTOR as needed) → TemporalLock → ChainLock-OUT → ForgeReceipts → Return. Lamb Lens is fabric ethics after FragGate (not Softwares-tab, not a second door). 11 domains / 33 softwares are isolation labels. AZChat name-only stub. ASE/VECTOR cite+refuse until armed. Overrides MASTER-ARCHITECTURE-2.0 §4.2. Keeps all 1.6.15 live fabric. No ZD30. No rollback. Identity Aziel Eliab only." },
  { version: "1.6.15", status: "superseded", note: "Lock the suite pipeline hop order (SUITE-PIPE-1.6.15): PUBLIC/UI/Agents → FragGate → SweepGate → ChainLock-IN → DecisionGATE → AZPIPE → Domain Doors (4DMap inspection) → TemporalLock → StaticClock → ChainLock-OUT → Response/Receipt. Outbound reverses sensibly. FragGate call runs DecisionGATE AFTER ChainLock-IN and BEFORE domain exec. ChainLock-IN stamps inbound; ChainLock-OUT stamps outbound receipts. TemporalLock + StaticClock are advisory envelope stamps (existing engines). 4DMap remains the Domain Door inspection frame — not a sequential gate. FoldLock fld3-wire stays internal to AZPIPE. LambGate is not a hop. Illegal reorder is refused. Identity Aziel Eliab only. 34 catalog slugs. 1.6.14 remains the 4DMap engine add." },
  { version: "1.6.14", status: "superseded", note: "Add 4DMap (4DM-WP-1.0) as a true in-process engine: four-axis inspection frame T/Δ/Γ/Π. Domain Door / inspection layer after AZPIPE routes to isolated engines — not a sequential gate. LIVE_OPS health/skill/card_new/card_pin/card_span/card_join/card_walk/card_list/verify_hash. truth_score/lumen_panel/invent_mark/backdate_class stay STUB_OPS. Plain A–Z. worker_home https://4dmap-download-tracker.vibelock.workers.dev/. mesh.enabled_default false; qns_cd pointer like peers. FragGate claims cite join types. ChainLock may stamp walks. Neighbors TemporalLock/StaticClock/ChronoLock/TrajectoryLock/SpectralLock. 34 catalog slugs. EmbryoLock stays stub. GET /v1/mesh never enables. RL packed catalog stays 0-KV hot path. 1.6.13 remains the QNM suite rollup." },
  { version: "1.6.13", status: "superseded", note: "QNM-BUILD-1.0 suite rollup (companion to AIH-WP-1.1): GET /v1/mesh + /status expose live/locked/isolated counts only (no QNM-S, no leaderboard). POST enable requires a declared bearer (empty {} refused; GET never enables). POST disable drops tethers clean (no implicit heal / resurrection). Keep join/heartbeat/leave/nodes + optional hash-only broadcast (never a publish path). Default radios/bearers OFF. Not a login mesh; not Node Gate/IP panel; not login-recovery; not upload proxy. Full node process is local qnm-node/ (boot/chain/apg/bearers/outbox/phoenix/score/memorial/tethers); anon-broadcast is that process's sibling loopback module only. FragGate slug=mesh + MCP mesh_*. Each /v1/software card carries mesh: { path, enabled_default: false, spec, companion, rollup_only, qnm_s: false }. AZMail mesh_* stays product-local. docs/NODE_MESH.md. 1.6.12 remains the live catalog + client update foundation." },
  { version: "1.6.12", status: "superseded", note: "Authoritative GET /v1/software (also GET /v1/fraggate/software) for hubs/clients: every product plus EmbryoLock stub, sorted Plain A–Z → Gate A–Z → Lock A–Z (Clock ≠ Lock). Client update check GET /v1/update/check?slug=&version= and GET /v1/update/manifest. GitHub Action auto-deploy on main. SEO/MCP point agents at FragGate → /v1/software → /mcp (list→describe→call). Sibling software under one FragGate door — never separate FragGate engines. 33 catalog slugs + EmbryoLock stub. 1.6.11 remains UI-op aliases." },
  { version: "1.6.11", status: "superseded", note: "Durable FragGate op alias map so Worker UI button names agents copy (azhub list_modules/place, azinterface genesis_boot/hold, azbrowser airlock/home, azmail classify, aznet doctor/pair, peacelock doctor) resolve to catalog LIVE_OPS and forward to the real engine method. Aliases appear in list/describe live_ops. EmbryoLock is a named stub / local-not-hosted registry entry (name only; not a hosted Worker; not a FragGate engine). 33 catalog slugs. 1.6.10 remains AZBrowser/AZNet one_line framing." },
  { version: "1.6.10", status: "superseded", note: "AZBrowser one_line: AZNet is a separate software (not engine). AZNet one_line: Separate software; functional-order pair. Same FragGate door. Two catalog slugs stay. 33 catalog slugs. 1.6.9 remains the broader separate-software framing." },
  { version: "1.6.9", status: "superseded", note: "Frame AZHub, AZInterface, AZBrowser, and AZNet as separate softwares under the same FragGate door. Catalog one_line / description / skill / README corrected. Four catalog slugs stay. 33 catalog slugs. 1.6.8 remains the Hub/Interface product add." },
  { version: "1.6.8", status: "superseded", note: "Add AZHub and AZInterface as two separate softwares under the same FragGate door (AIH-WP-1.0). AZHub is a Blank Key / neutral spatial container (LIVE_OPS region_list/place_module/remove_module/tether_*/blank_key_status). AZInterface is a custodial operating environment (LIVE_OPS genesis_status/site_state_*/integrity_check/witness_list/page_cycle_status). Page cycles are pre-locked: OFF/integrity/ON/FULL SHUTDOWN/MEMORIAL. Hub refuses auto-unlock and completeness events. Never one combined product. Not nested in AZBrowser or AZNet. scorch_remote/auto_unlock/ranking/completeness_detect stay STUB_OPS. Reached only via POST /v1/fraggate/call { slug: \"azhub\", op } or { slug: \"azinterface\", op }. DecisionGATE / FragGate ledger still apply. 33 catalog slugs. 1.6.7 remains AZNet." },
  { version: "1.6.7", status: "superseded", note: "Add AZNet (AZN-WP-0.1) as a separate FragGate-live product (own Worker aznet-download-tracker, own UI): silent verification side-net (hash stamps, custodian garden of hash refs, memorial ledger, integrity refuse/isolate). Never hosts payloads. Pairing with AZBrowser is functional order only — pair_token AND pair_flag required for garden/stamp/memorial ops. Do not merge UIs. LIVE_OPS health/pair_status/garden_list/stamp/verify_hash/memorial_list/memorial_append/receipt_verify/skill. payload_host/serve_content_for_peer/analytics/ranking/repair_integrity_bypass/interface/lumen/hub stay STUB_OPS. StaticClock stamps + TemporalLock-style receipt fields. 31 catalog slugs. 1.6.6 remains AZBrowser." },
  { version: "1.6.6", status: "superseded", note: "Add AZBrowser (AZB-1.0) as a FragGate-live engine: Lamb Lens ethical research browser (ethical search + advisory navigate). Cite; refuse harmful harvest; never invent visit results. Not Chromium. LIVE_OPS ethical_search/lamb_lens_search/navigate/airlock_ingest/tab_open/tab_list/receipt_list/verify/receipt_verify. tor_exit/phoenix_wipe/chromium/unrestricted proxy stay STUB_OPS. MCP fraggate_list/fraggate_call and Worker UI buttons share LIVE_OPS.azbrowser. Reached only via POST /v1/fraggate/call { slug: \"azbrowser\", op }. AZNet is separate software (same FragGate door; 1.6.7) — pairing is order/token only, not a shared Phase-1 UI. DecisionGATE / FragGate ledger still apply. 30 catalog slugs. 1.6.5 remains AZMail." },
  { version: "1.6.5", status: "superseded", note: "Add AZMail (APP 1.0) as a FragGate-live engine: anonymous MCP mesh (default off) + advisory airlock. Not a full internet MTA. LIVE_OPS airlock_classify/scrub/trust_score/mesh_*/keyword_alert_*. SMTP/deanonymize/harvest stay STUB_OPS. Reached only via POST /v1/fraggate/call { slug: \"azmail\", op } (host /runtime proxies that door). DecisionGATE / FragGate ledger still apply. 29 catalog slugs. 1.6.4 remains PeaceLock." },
  { version: "1.6.4", status: "superseded", note: "Add PeaceLock (PL-WP-0.1) as a true in-process engine: chosen silence / chosen inaction receipts, hash-chained lattice, HARD_DUTY refuse, ABSENT transcript/counterfactual/motive. FragGate LIVE_OPS open/seal/break/show/verify/stamp/upload_envelope. 28 catalog slugs. 1.6.3 remains KV-backed API use trackers (GET /v1/uses)." },
  { version: "1.6.3", status: "superseded", note: "KV-backed API use trackers and ring log (GET /v1/uses, alias GET /v1/stats). Binding USES. Counts host/method/path/op/day for API traffic across origin and same-origin /runtime doors. Skips health/ready/uses and static SEO. No Authorization, tokens, bodies, or PII. FragGate ledger and session receipts unchanged. Distinct from product download-trackers." },
  { version: "1.6.2", status: "superseded", note: "Widen FragGate public LIVE_OPS to every catalog Software product that makes sense on a public agent door (advisory / score / classify / gate / search / preview / render / verify / hash / receipt / game / overlay / route / status). VeilLock stays local_only. Stub verbs still refuse. MCP tools/list stays the thin FragGate surface. 1.6.1 remains the full AI client list." },
  { version: "1.6.1", status: "superseded", note: "Full compatible AI client list in skill, Worker UI, OpenAPI, llms.txt, and cite.json (ChatGPT, Grok, Venice, Claude, Cursor, Glama, Perplexity, Copilot, Gemini, Mistral, Meta AI, Apple Intelligence, Amazon Q, DuckAssist, You.com, Cohere, plus other MCP/OpenAPI-capable assistants). 1.6.0 remains the FragGate door cut." },
  { version: "1.6.0", status: "superseded", note: "FragGate door cut: hashed registry, thin MCP tools/list (discover / route / refuse), DecisionGATE before exec, ask/refuse ledger. 1.5.0 was agent-native flat {slug}_{op} tools." },
  { version: "1.5.0", status: "superseded", note: "agent-native cut: display-ready MCP envelopes, product-verb tool descriptions, session/health/manifest marked advanced/internal, runtime_run auto-session façade (true in-process exec)" },
  { version: "1.4.1", status: "superseded", note: "production gates: GET /v1/ready, HEAD + version/role headers, no-store authority JSON, receipt cap 64, session TTL 6h, per-IP rate limits, optional RUNTIME_TOKEN on session mutate" },
  { version: "1.4.0", status: "superseded", note: "every catalog Software slug is a true in-process engine; binding-only ops stay per-op proxy_fallback" },
  { version: "1.3.0", status: "superseded", note: "true engine runtime for listed portable slugs only" },
  { version: "1.2.0", status: "superseded", note: "session-runtime: open → policy → exec → receipt → close; exec still proxied" },
  { version: "1.1.0", status: "superseded", note: "catalog + pull + proxy that called itself a runtime" },
];

/** Single source of truth for health + runtime.json + ready — never diverge. */
export function authoritySnapshot(productSlugs) {
  const honesty = honestyFields(productSlugs || []);
  return {
    ok: true,
    product: "aziel-runtime",
    name: "Aziel Eliab Runtime",
    title: "Aziel Eliab Runtime",
    author: "Aziel Eliab",
    identity: "Aziel Eliab",
    version: RUNTIME_VERSION,
    role: RUNTIME_ROLE,
    layer: RUNTIME_LAYER,
    true_engine_runtime: honesty.true_engine_runtime,
    true_engine_slugs: honesty.true_engine_slugs,
    engine_slugs: honesty.engine_slugs,
    proxy_fallback_slugs: honesty.proxy_fallback_slugs,
    proxy_fallback_ops: honesty.proxy_fallback_ops,
    proxy_is_not_exec: true,
    isolate_is_the_jail: honesty.isolate_is_the_jail,
    receipt_cap: RECEIPT_CAP,
    session_ttl_ms: SESSION_TTL_MS,
    rate_open_per_minute: RATE_OPEN_PER_MIN,
    rate_exec_per_minute: RATE_EXEC_PER_MIN,
    token: "optional-on-session-mutate",
    door: "fraggate",
    authority: {
      health: "GET /v1/health",
      ready: "GET /v1/ready",
      runtime_json: "GET /v1/runtime.json",
      note: "version/role/engine_slugs on health, ready, and runtime.json are the same snapshot. Historical notes live under version_history only — never read those keys as the current version.",
    },
  };
}
export const SKILL_INLINE_MAX = 24_000;
export const SKILL_TTL_MS = 10 * 60 * 1000;
export const DEFAULT_UA = "Mozilla/5.0";

export { CATALOG_ALIASES };

const skillCache = new Map();

export function resolveSlug(raw, bySlug) {
  const key = String(raw || "")
    .trim()
    .toLowerCase();
  if (!key) return null;
  if (bySlug[key]) return key;
  const aliased = CATALOG_ALIASES[key];
  if (aliased && bySlug[aliased]) return aliased;
  return null;
}

export function aliasesForSlug(slug) {
  return Object.entries(CATALOG_ALIASES)
    .filter(([, target]) => target === slug)
    .map(([alias]) => alias);
}

export function runtimeSkillMarkdown(origin, products) {
  const base = origin.replace(/\/$/, "");
  const n = products.length;
  const slugs = products.map((p) => p.slug).join(", ");
  const local = trueEngineSlugs().join(", ");
  return `---
name: Aziel Eliab Runtime
description: >-
  One door — discover, route, refuse. FragGate over the catalog: hashed
  registry, DecisionGATE after ChainLock-IN, ask/refuse ledger. Dual surface —
  agent/MCP has no technical UI chrome; Worker UI, Flutter mobile/, local
  install, and counted /download stay complete human software. 1.7.4 enhances
  4DMap LIVE_OPS (frame_status/axis_describe/walk_trace/card_export/card_import/verify_chain/neighbor_cite; inspection frame, not an extra door). 1.7.3 aligns
  audit WARN copy (exist.mcp → tools/list; public FragGate call; catalog count_note; 4DMap not an extra door). 1.7.2 adds
  GET /v1/azpipe/arch (MASTER-33 cite/read; same FragGate pipeline payload; not a Softwares door). 1.7.1 adds
  AKM-TRIAD-1.0 (adaptive recollection, Bayesian calibration, 3-of-4 triad; not Softwares-tab). 1.7.0 locks
  MASTER-33 (FragGate single door; Lamb Lens after FragGate; RoseClock forward-only). 1.6.15 locked
  the suite hop order (SUITE-PIPE-1.6.15; LambGate is not a hop). 1.6.14 adds
  4DMap (4DM-WP-1.0) as a true in-process engine (four-axis inspection frame T/Δ/Γ/Π; inspection frame after AZPIPE, not an extra door).
  1.6.13 adds
  the QNM-BUILD-1.0 suite rollup (GET /v1/mesh live/locked/isolated; operator bearer enable; default OFF; not a login mesh; full node is local qnm-node/).
  Packet-transfer coding design is QNS-CD-1.0 (photon QNS1 1.3 on local qnsd; GET /v1/qns cites only).
  GET /v1/azpipe/arch cites the locked MASTER-33 AZPIPE strip (same FragGate pipeline payload; not a Softwares door).
  1.6.12 adds GET /v1/software (hub Software-tab catalog) plus GET /v1/update/check for install.sh /
  local UIs / mobile. 1.6.11 adds a durable
  FragGate UI-op alias map and names EmbryoLock as stub / local-not-hosted (not an engine). 1.6.10 sets
  AZBrowser and AZNet catalog one_line to separate software (not engine). 1.6.9 frames
  AZHub, AZInterface, AZBrowser, and AZNet as separate softwares under the same FragGate door. 1.6.8 adds
  AZHub and AZInterface as two separate softwares under the same FragGate door (AIH-WP-1.0). 1.6.7 adds
  AZNet (AZN-WP-0.1) as a FragGate-live engine (silent verification side-net).
  1.6.6 adds AZBrowser (AZB-1.0) as a FragGate-live engine (Lamb Lens ethical research browser). AZNet is separate software (same FragGate door; order/token pairing only). 1.6.5 adds
  AZMail (APP 1.0) as a FragGate-live engine (mesh default off). 1.6.4 adds
  PeaceLock (PL-WP-0.1) as a true in-process engine. 1.6.3 adds
  KV-backed API use trackers (GET /v1/uses). 1.6.2 widens the public door
  to sensible advisory engines; stubs still refuse. 1.6.1 lists every major
  OpenAPI/MCP/HTTP client. 1.6.0 FragGate door cut. Kernel:
  https://github.com/AzielEliab/fraggate
---

# Aziel Eliab Runtime

This is software you use in chat. **One door — discover, route, refuse.** There is no extra technical UI for the agent surface. Show the user the software output, then take the next input.

FragGate kernel: https://github.com/AzielEliab/fraggate (FG-0.1)

## Dual surface (product law)

1. **Agent / MCP** — Software runs 100% through the agent. Display \`display.title\`, \`display.summary\`, and \`display.fields\` in the AI client. Feed the next input back into the same product. Session ids, receipts, OpenAPI, and HTTP stay invisible unless the user asked for them.
2. **Human software** — Unchanged and required. Worker homepage, Flutter \`mobile/\`, local install, and counted \`/download\` remain complete developed software. Do not gut human UIs.

## How an agent uses this like software

1. **Discover.** \`runtime_skill\` or \`fraggate_list\` (hashed registry: live / stub / local_only). \`fraggate_describe\` one name. \`fraggate_verify\` a name or digest.
2. **Route.** \`fraggate_call\` with a CallEnvelope \`{ name|slug, op, payload, claim? }\`. Locked path (MASTER-33): FragGate → Lamb Lens → SweepGate → Sentinel → Provenance/Input Packet → ChainLock-IN → DecisionGATE → AZPIPE → Internal Domain Layer → optional ASE → RoseClock → TemporalLock → ChainLock-OUT → ForgeReceipts → Return. FragGate is THE single door. Lamb Lens is fabric after FragGate. Domain softwares execute only after AZPIPE. Live allowlist: every sensible advisory / score / classify / gate / search / preview / render / verify / hash / receipt / game / overlay / route / status engine already hosted in-process. VeilLock stays local_only. Stub verbs still refuse.
3. **Refuse.** Unknown names return \`FG-HALLUC-TOOL\`. Stubs and \`local_only\` do not execute on the public mesh. Gate BLOCK/REVISE is ledgered; no handler.
4. **Show the output.** Results are \`{ display, result, ledger_tip? }\`. Show \`display\` to the user.
5. **Take the next input.**

Named live modules still on the thin tools/list: \`decisiongate_check\`, \`library_lookup\` (read-only corpus), suite \`mesh_*\` (QNM-BUILD-1.0 rollup; default OFF; not a login mesh), plus fabric \`chainlock_*\` (CL-WP-0.4 / LS-WP-0.1 — not Softwares-tab) and \`memory_*\` (AKM-TRIAD-1.0 — not Softwares-tab).

**LIVE fabric** (runtime, not Softwares-tab products): AZPIPE (\`AP-WP-0.2\`, magic FLD3) wraps \`fraggate_call\` so admitted payloads never present raw inbound bytes. **Locked hop order (1.7.0 / MASTER-33):** Human → AZInterface → PUBLIC/UI/AGENT/API → FragGate → Lamb Lens → SweepGate → Sentinel → Provenance/Input Packet → ChainLock-IN → DecisionGATE → AZPIPE → Internal Domain Layer → optional ASE → RoseClock (forward-only; StaticClock/VECTOR as needed) → TemporalLock → ChainLock-OUT → ForgeReceipts → Return. FragGate is THE single door. Lamb Lens is fabric ethics after FragGate (not Softwares-tab, not a second door). Domains are isolation labels, not doors. RoseClock sequence never decreases. FoldLock fld3-wire is internal to AZPIPE. LambGate is not a hop. Illegal reorder is refused. SweepGate (\`SG-WP-0.1\`) airlocks poison / malware-class / block-keys, and isolates off-origin only when inbound and untrusted; ChainLock (\`CL-WP-0.4\`) append-only stamps (vault \`vault/chains/<name>.jsonl\` on CLI; Worker KV/memory) — ChainLock-IN inbound, ChainLock-OUT outbound receipts; LOCKSET (\`LS-WP-0.1\`) fail-closed seal citing \`https://godlock.uk\` (runtime does not write the public ledger); packed catalog (\`RL-WP-0.1-runtime\`) is a single-key read with edge Cache-Control; **QNS-CD-1.0** is the Quantum Node Signal packet-transfer coding design (photon QNS1 1.3 on local \`qnsd\` in https://github.com/AzielEliab/qnm-node — companion to QNM-BUILD-1.0 / AIH-WP-1.3). \`GET /v1/qns\` cites only; the public Worker does not proxy local via emit and is not a wipe/control plane. qnsd uses the same AZPIPE / SweepGate / APG / ChainLock laws locally. Catalog GET / HTML stay full (200) for humans and SEO; soft caps apply only to expensive fan-out. Donation stays static (no KV). \`GET /v1/mesh\` never enables. Do **not** add QNS or AKM-TRIAD as Softwares-tab product slugs. Adaptive memory is LIVE fabric behind FragGate (\`POST /v1/memory/*\`, MCP \`memory_*\`, FragGate \`slug=memory\`). Bayesian posterior is calibrated belief, not truth.

Do **not** walk the user through \`runtime_session_open\` → policy → exec → receipt → close. Those tools, \`runtime_run\`, raw \`*_health\`, and \`runtime_manifest\` are **advanced/internal**.

Do **not** call flat \`{slug}_{op}\` names (1.5.0 pile). They are not in \`tools/list\`. That is hallucination with a receipt.

HTTP \`POST /p/{slug}/{op}\` is still a **proxy**. Proxy without a session receipt is **not** exec. VPN/hop mesh is **not** claimed on this public surface. AZMail anonymous ring is FragGate LIVE_OPS only (default off; not SMTP). The suite QNM rollup (\`GET /v1/mesh\`, MCP \`mesh_*\`, FragGate \`slug=mesh\`) is live/locked/isolated counts + operator bearer enable (default OFF). Not a login mesh. Views/MCP/downloads do not enter QNM-S. Full node process is local \`qnm-node/\`. Packet-transfer coding design is **QNS-CD-1.0** (photon QNS1 1.3 on local \`qnsd\`; \`GET /v1/qns\` cites only). Library host \`www.azielcorpuslibrary.net/runtime/v1/mesh/enable\` may return **409** \`library-default-off\` instead of Worker \`MESH-NEED-BEARER\` / \`MESH-BAD-BEARER\` — radios stay OFF; GET never enables. That overlay is host-side (aziel-corpus), not this Worker.

Refuse envelopes (\`exist.mcp\`) list the live MCP tool set and point at \`POST /mcp tools/list\`. That hint is not an exec allowlist. Unknown names still \`FG-HALLUC-TOOL\`. Stubs still \`FG-STUB\`.

Every catalog slug is a true engine. Cloudflare isolate is the jail. Hosted AZAI is protocol mirror + Lamb check, **not** the blend. Identity is **Aziel Eliab** only.

**1.7.4 = 4DMap inspection-frame capability bump.** LIVE_OPS add frame_status, axis_describe, walk_trace, card_export, card_import, verify_chain, neighbor_cite. Stubs stay. Not a sequential gate and not an extra door. Product 4dmap 0.2.0 is not merged — sync engine_digest after that deploy.
**1.7.3 = audit WARN copy/hint.** Refuse \`exist.mcp\` lists the live MCP tool set and points at \`POST /mcp tools/list\`. Public FragGate call stays open; session mutate requires token when configured. Softwares-tab \`count\` includes placements; isolation \`software_count\` is 33. 4DMap catalog copy is inspection frame / not an extra door. OpenAPI lists \`POST /mcp\`. Mesh stays default-off.
**1.7.2 = GET /v1/azpipe/arch.** Cite/read surface for the locked MASTER-33 AZPIPE strip (same payload as \`GET /v1/fraggate\` \`pipeline\` / \`pipeline_strip\`). Not a Softwares-tab door. Not a FragGate slug. Mesh stays default-off.
**1.7.1 = AKM-TRIAD-1.0.** Adaptive knowledge recollection over ChainLock learn: Bayesian calibration, deterministic 3-of-4 triad (E/C/P/B), derived rebuildable index. Memory APIs behind FragGate. Not a Softwares-tab product. Posterior ≠ truth. No history rewrite.
**1.7.0 = MASTER-33.** FragGate is THE single door. Public hop list: Human → AZInterface → PUBLIC/UI/AGENT/API → FragGate → Lamb Lens → SweepGate → Sentinel → Provenance/Input Packet → ChainLock-IN → DecisionGATE → AZPIPE → Internal Domain Layer → optional ASE → RoseClock (forward-only; StaticClock/VECTOR as needed) → TemporalLock → ChainLock-OUT → ForgeReceipts → Return. Lamb Lens is fabric ethics after FragGate (not Softwares-tab, not a second door). 11 domains / 33 softwares are isolation labels. AZChat is a name-only stub. ASE/VECTOR cite + refuse until armed. RoseClock sequence never decreases. Overrides MASTER-ARCHITECTURE-2.0 §4.2. No ZD30. No rollback. Identity Aziel Eliab only.
**1.6.15 = locked suite pipeline (SUITE-PIPE-1.6.15).** Historical public hop list: PUBLIC/UI/Agents → FragGate → SweepGate → ChainLock-IN → DecisionGATE → AZPIPE → Domain Doors (4DMap inspection) → TemporalLock → StaticClock → ChainLock-OUT → Response/Receipt. Kept live; 1.7.0 extends it. FragGate \`fraggate_call\` aligns. DecisionGATE after ChainLock-IN, before domain exec. 4DMap stays the inspection frame — not a sequential gate. TemporalLock + StaticClock are advisory stamps on the envelope (existing engines). LambGate is not a hop. FoldLock fld3-wire stays internal. Illegal reorder is refused. Identity Aziel Eliab only.
**1.6.14 = 4DMap (4DM-WP-1.0)** as a true in-process engine: four-axis inspection frame T/Δ/Γ/Π. Domain Door / inspection layer after AZPIPE routes to isolated engines — not a sequential gate. LIVE_OPS health/skill/card_new/card_pin/card_span/card_join/card_walk/card_list/verify_hash. truth_score/lumen_panel/invent_mark/backdate_class stay stub. Plain bucket. FragGate claims cite join types. ChainLock may stamp walks. Neighbors TemporalLock/StaticClock/ChronoLock/TrajectoryLock/SpectralLock. EmbryoLock stays stub. GET /v1/mesh never enables. RL packed catalog stays 0-KV hot path.
**1.6.13 = QNM-BUILD-1.0 suite rollup** (companion to AIH-WP-1.1): \`GET /v1/mesh\` / \`/status\` (live/locked/isolated; never enables), \`POST /v1/mesh/enable\` requires \`{ bearer }\`, \`POST /v1/mesh/disable\` drops tethers clean, plus join/heartbeat/leave/nodes and optional hash-only broadcast (never a publish path). Default radios OFF. Not a login mesh. Full node process is local \`qnm-node/\`. Anon-broadcast is that process's sibling loopback module only. MCP \`mesh_*\` + FragGate \`slug=mesh\`. Each software card has \`mesh: { path, enabled_default: false, spec, companion, rollup_only, qnm_s: false }\` and \`qns_cd: { spec: "QNS-CD-1.0", local: "https://github.com/AzielEliab/qnm-node", note: "Photon vias on local qnsd; Worker cites only" }\`. AZMail mesh stays product-local. See \`docs/NODE_MESH.md\`. Designs: \`docs/designs/\` (AZL / SEC-FEAT / QNM-WP / NODE-OPS plus LIVE fabric CL-WP-0.4 / AP-WP-0.2 / SG-WP-0.1 / LS-WP-0.1 / RL-WP-0.1-runtime / QNS-CD-1.0 / SUITE-PIPE-1.6.15 plus product spec 4DM-WP-1.0).
**1.6.12 = live software catalog + client updates:** \`GET /v1/software\` (mirror \`GET /v1/fraggate/software\`) is the authoritative hub catalog — every product plus EmbryoLock stub, sorted Plain A–Z → Gate A–Z → Lock A–Z (Clock ≠ Lock). \`GET /v1/update/check?slug=&version=\` and \`GET /v1/update/manifest\` for install.sh / local UIs / mobile. GitHub Action deploys on push to main. Agents prefer FragGate / \`/v1/software\` / \`/mcp\` (list → describe → call). Sibling software under one FragGate door — never separate FragGate engines.
**1.6.11 = dual-surface op aliases:** Worker UI button names resolve to catalog LIVE_OPS (forward to the real engine method). EmbryoLock is named stub / local-not-hosted (describe?slug=embryolock; not a Worker; not a FragGate engine).
**1.6.10 = framing: AZBrowser and AZNet catalog one_line say separate software, not separate engine.** Same FragGate door. Two catalog slugs stay.
**1.6.9 = framing: AZHub, AZInterface, AZBrowser, and AZNet are separate softwares under the same FragGate door.** Catalog slugs stay.
**1.6.8 = AZHub (AIH-WP-1.0) + AZInterface (AIH-WP-1.0)** as two separate softwares under the same FragGate door. Call only via \`fraggate_call\` / \`POST /v1/fraggate/call\` with \`{ slug: "azhub", op: "..." }\` or \`{ slug: "azinterface", op: "..." }\`. Hub is a Blank Key (does not interpret; refuses auto-unlock / completeness). Interface page cycles are pre-locked: OFF / integrity / ON / FULL SHUTDOWN / MEMORIAL. Never one combined product. DecisionGATE / FragGate ledger still apply before exec.
**1.6.7 = AZNet (AZN-WP-0.1)** as a separate FragGate-live product (own Worker / own UI; silent verification side-net; hash stamps / garden / memorial; never hosts payloads). Call only via \`fraggate_call\` / \`POST /v1/fraggate/call\` with \`{ slug: "aznet", op: "..." }\`. Garden / stamp / memorial ops require AZBrowser pair_token AND pair_flag (functional order only — do not merge UIs). payload_host / serve_content_for_peer stay stub. DecisionGATE / FragGate ledger still apply before exec.
**1.6.6 = AZBrowser (AZB-1.0)** as a FragGate-live engine (Lamb Lens ethical research browser: ethical search + advisory navigate). Call only via \`fraggate_call\` / \`POST /v1/fraggate/call\` with \`{ slug: "azbrowser", op: "..." }\`. MCP \`fraggate_list\` includes LIVE_OPS.azbrowser. Worker UI buttons call that same door. Cite; refuse harmful harvest; never invent visit results. Not Chromium. tor_exit / phoenix_wipe stay stub. AZNet is separate software (same FragGate door) — pairing is order/token only, not a shared Phase-1 UI. DecisionGATE / FragGate ledger still apply before exec.
**1.6.5 = AZMail (APP 1.0)** as a FragGate-live engine (anonymous MCP mesh default off + advisory airlock; not a full internet MTA). Call only via \`fraggate_call\` / \`POST /v1/fraggate/call\` with \`{ slug: "azmail", op: "..." }\`. Host \`/runtime\` proxies that same FragGate door. SMTP / deanonymize stay stub. DecisionGATE / FragGate ledger still apply before exec.
**1.6.4 = PeaceLock (PL-WP-0.1)** as a true in-process engine (chosen silence / chosen inaction receipts; HARD_DUTY refuse; ABSENT transcript/counterfactual/motive).
**1.6.3 = KV-backed API use trackers** (\`GET /v1/uses\`). Distinct from product download counters. No tokens, bodies, or PII.
**1.6.2 = public door covers sensible advisory engines**; stub verbs still refuse. VeilLock stays local_only. MCP tools/list stays the thin FragGate surface.
**1.6.1 = full compatible AI client list** (not only ChatGPT / Grok / Venice).
**1.6.0 = FragGate door** over the catalog (hashed registry, thin MCP, DecisionGATE before exec, ask/refuse ledger). Kernel: https://github.com/AzielEliab/fraggate
**1.5.0 = agent-native cut** on 1.4.1 production gates (display envelopes, flat product-verb MCP, \`runtime_run\`).
**1.4.1 = 1.4.0 engine-runtime + production gates** (\`GET /v1/ready\`, HEAD, no-store authority JSON, receipt cap 64, session TTL 6h, per-IP rate limits, optional \`RUNTIME_TOKEN\` on session mutate).
**1.4.0 = catalog + pull + proxy + session + in-process engines** for **every** catalog Software slug.
**1.3.0 = true engine runtime** for listed portable slugs (in-process) + session + pull/proxy.
**1.2.0 = session-runtime** (receipt chain; exec still \`upstreamFetch\`ed product Workers).
**1.1.0 = catalog + pull + proxy** that started calling itself a runtime. Useful front doors. Not exec.

True engine exec on *this* Worker is still:

\`open → policy → exec(slug, op, payload) → receipt → close\`

Agents should not narrate that chain. \`fraggate_call\` is the default exec path. For **true-engine slugs** (\`${local}\`) \`exec\` resolves the slug to a vendored module, computes \`engine_digest\` = SHA-256 of that artifact's bytes, runs the op **inside this Worker isolate** (the jail), wipes scratch buffers, and the receipt includes \`engine_digest\`, \`engine_slug\`, \`engine_op\`, \`ran_in: "aziel-runtime"\`. \`GET /v1/health\` \`engine_slugs\` equals \`true_engine_slugs\` equals the catalog.

If an op **cannot** run without external bindings (KV / D1 / AI / live media), that **op** is marked \`mode: "proxy_fallback"\` while the slug stays a true engine. It does **not** pretend the binding ran here.

\`GET/POST /p/{slug}/{op}\` is still a **proxy**. Proxy without a session receipt is **not** exec.

Cloudflare's Worker / Durable Object isolate **is** the jail. No extra guest isolate is claimed. The receipt still requires that engine's digest.

Closest true *local blends* in the mesh remain: \`azai serve\`, \`forgereceipts ui\`, \`azos ui\`.
Hosted / in-process AZAI is still protocol mirror + Lamb check, **not** the blend.

Author: **Aziel Eliab**. Identity is Aziel Eliab only.
License: Apache-2.0. Forks are welcome and always allowed.
Version: ${RUNTIME_VERSION}
Role: engine-runtime (layer: catalog+pull+proxy+session+in-process-engines+fraggate)
Door: fraggate
Kernel: https://github.com/AzielEliab/fraggate
Host: ${base}/
Everblooming sigil: ${base}/sigil.png
Products: ${n} (${slugs})
True-engine slugs: ${local}
engine_slugs: ${local}
Modules: \`src/engines/{slug}.js\` for every catalog slug (${local})
Packaging: Worker session + in-repo CLI (\`node cli/aziel-runtime.mjs\`). **No counted runtime tarball.**

Always send \`User-Agent: Mozilla/5.0\`. Cloudflare Workers may 403 an empty agent.
Do **not** invent Zenodo DOIs. Cite \`/cite.json\`. Product download counters are **not** incremented on pull, skill, health, proxy, or session exec. API uses are counted separately on \`GET /v1/uses\` (no PII).

## Session (advanced / internal)

Prefer \`fraggate_call\`. This chain is the raw object:

1. \`POST ${base}/v1/session/open\` — session id, start time, policy defaults, empty receipt chain.
2. \`POST ${base}/v1/session/{id}/policy\` — allow slugs/ops, payload size cap, no product-download-counter side effects unless explicitly requested. API uses still increment on \`/v1/uses\` (no PII).
3. \`POST ${base}/v1/session/{id}/exec\` body \`{slug, op, payload}\` — record intent, run the **local in-process engine** for that slug (\`engine_digest\` + \`ran_in: aziel-runtime\`); only binding-only ops are per-op \`proxy_fallback\`. Append a **hash-chained execution receipt owned by this session**. Returns \`display\` + \`result\` + \`receipt\`.
4. \`GET ${base}/v1/session/{id}/receipt\` or \`.../receipts\` — last receipt / full chain (verifiable locally).
5. \`POST ${base}/v1/session/{id}/close\` — seal. Further exec is 409.

CLI (talks to this Worker, or \`--local\` filesystem session; prefers local engine modules):

\`\`\`bash
node cli/aziel-runtime.mjs session open
node cli/aziel-runtime.mjs session policy --allow-slugs azclce
node cli/aziel-runtime.mjs session exec azclce score '{"r":"login button blue","d":"login form submits","p":"login button submits"}'
node cli/aziel-runtime.mjs session receipt
node cli/aziel-runtime.mjs session close
\`\`\`

## Bootstrap (front doors — still useful)

1. \`GET ${base}/v1/skill\` — this markdown.
2. \`GET ${base}/v1/runtime.json\` — machine manifest (\`version=${RUNTIME_VERSION}\`, \`role=engine-runtime\`, \`door=fraggate\`, every catalog slug in \`engine_slugs\` / \`true_engine_slugs\`, \`authoritySnapshot\` + \`version_history\`). Same JSON: \`GET ${base}/v1/runtime\`.
   FragGate: \`GET ${base}/v1/fraggate\` · \`GET ${base}/v1/fraggate/list\` · \`POST ${base}/v1/fraggate/call\`.
   MASTER-33 cite: \`GET ${base}/v1/azpipe/arch\` (same \`pipeline\` payload; not a Softwares door).
   Also \`GET ${base}/v1/ready\` (200 only if SESSION binding is up; 503 if \`REQUIRE_TOKEN=1\` and \`RUNTIME_TOKEN\` is missing).
   API uses: \`GET ${base}/v1/uses\` (no increment).
3. \`GET ${base}/v1/software\` — authoritative hub catalog (Plain → Gate → Lock + EmbryoLock stub). Mirror: \`GET ${base}/v1/fraggate/software\`.
   Softwares-tab \`count\` includes placements (\`azinterface\` / \`decisiongate\` / \`forgereceipts\`). Isolation \`domains.software_count\` is **33** (\`domains_are_doors:false\`). See \`count_note\`. Do not equate the two.
   Client updates: \`GET ${base}/v1/update/check?slug={slug}&version={installed}\` · \`GET ${base}/v1/update/manifest\`.
4. \`GET ${base}/v1/bundle\` — every product skill URL + invoke prefix.
   Alias: \`GET ${base}/v1/pull?all=1\`.
5. \`GET ${base}/v1/pull/{slug}\` — name, version, skill URL, counted download, install.sh, ops.
6. \`GET ${base}/v1/pull/{slug}/skill\` — product skill markdown (proxied / cached).
7. Proxy (not exec): \`GET\` or \`POST ${base}/p/{slug}/{op}\`.

You do **not** need to open each product homepage.

${skillCompatibleSection(base)}

## Endpoints (this Worker)

| Method | Path | What |
|--------|------|------|
| POST | \`/v1/session/open\` | Create session + genesis receipt. |
| POST | \`/v1/session/{id}/policy\` | Attach allow rules. |
| POST | \`/v1/session/{id}/exec\` | In-process engine for every catalog slug (\`engine_digest\`). Binding-only ops may be per-op proxy_fallback. Hash-chained receipt. |
| GET | \`/v1/session/{id}/receipt\` | Last receipt (verifiable). Includes engine_digest when local. |
| GET | \`/v1/session/{id}/receipts\` | Full receipt chain. |
| POST | \`/v1/session/{id}/close\` | Seal session. |
| GET | \`/v1/skill\` | This markdown. Does not increment downloads. |
| GET | \`/v1/runtime.json\` | Machine manifest. Authority with health: version=${RUNTIME_VERSION}, role=engine-runtime, door=fraggate, top-level registry_digest, all catalog slugs are true engines. |
| GET | \`/v1/fraggate\` | FragGate door summary (registry_digest; live / stub / local_only product counts; stub_op_count). |
| GET | \`/v1/fraggate/list\` | Hashed registry entries. |
| GET | \`/v1/fraggate/describe\` | Describe one name (\`?name=\` / \`?slug=\`). |
| POST | \`/v1/fraggate/verify\` | Verify a name or digest. |
| POST | \`/v1/fraggate/call\` | CallEnvelope → FragGate → Lamb Lens → SweepGate → Sentinel → Provenance → ChainLock-IN → DecisionGATE → AZPIPE → Internal Domain Layer → RoseClock → TemporalLock → ChainLock-OUT → ForgeReceipts → Return. |
| GET | \`/v1/runtime\` | Alias of \`/v1/runtime.json\` (same machine manifest). |
| GET | \`/v1/ready\` | Readiness. 200 if SESSION binding is up. 503 if \`REQUIRE_TOKEN=1\` and \`RUNTIME_TOKEN\` missing. |
| HEAD | \`/v1/health\`, \`/v1/ready\`, \`/v1/runtime.json\`, \`/v1/skill\` | 200 + \`X-Aziel-Runtime-Version\` / \`X-Aziel-Runtime-Role\`. |
| GET | \`/v1/bundle\` | Compact bootstrap of every product. |
| GET | \`/v1/pull?all=1\` | Alias of \`/v1/bundle\`. |
| GET | \`/v1/pull/{slug}\` | Pull record for one product. |
| GET | \`/v1/pull/{slug}/skill\` | Product skill markdown. |
| GET | \`/v1/catalog.json\` | Full catalog (discover). |
| GET | \`/v1/software\` | Authoritative hub software catalog (Plain→Gate→Lock + EmbryoLock stub). |
| GET | \`/v1/fraggate/software\` | FragGate-path mirror of \`/v1/software\`. |
| GET | \`/v1/update/check\` | Client update check (\`?slug=&version=\`). For install.sh / local UI / mobile. |
| GET | \`/v1/update/manifest\` | Latest versions for every product + runtime. |
| GET/POST | \`/p/{slug}/{op}\` | **Proxy only** — not exec. Service binding preferred. |
| GET | \`/openapi.json\` | Combined OpenAPI 3.1. |
| POST | \`/mcp\` | JSON-RPC MCP-over-HTTP. |
| GET | \`/cite.json\` | How to cite Aziel Eliab software and the Digital Library. Aka Aziel Elroi Eliab. No invented DOIs. |
| GET | \`/llms.txt\` | Plain-text catalog + citation rules for crawlers. |
| GET | \`/ai.txt\` | Alias of \`/llms.txt\`. |
| GET | \`/robots.txt\` | Allow / for Google and major AI bots. No GPTBot Disallow. |
| GET | \`/sitemap.xml\` | Catalog urlset. |
| GET | \`/sitemap-index.xml\` | Catalog + Digital Library + godlock.uk + live product Worker sitemaps. |
| GET | \`/v1/health\` | Liveness. Optional \`uses_total\` when USES KV is bound. Does not increment. |
| GET | \`/v1/uses\` | API use counters + recent ring log. Does not increment. No PII. |
| GET | \`/v1/stats\` | Alias of \`/v1/uses\`. |
| GET | \`/v1/mesh\` | QNM rollup: enabled?, bearers, live/locked/isolated. Default OFF. Never enables. |
| GET | \`/v1/mesh/status\` | Alias of \`/v1/mesh\`. |
| POST | \`/v1/mesh/enable\` | Operator enable. Body \`{bearer}\` required (rate-limited). |
| POST | \`/v1/mesh/disable\` | Radios/bearers OFF. Tethers drop clean. Always allowed. |
| POST | \`/v1/mesh/join\` | Register rollup presence. Body \`{product, node_id?, label?, presence?}\`. |
| POST | \`/v1/mesh/heartbeat\` | Refresh 5-minute presence. Body \`{node_id, presence?}\`. |
| POST | \`/v1/mesh/leave\` | Drop presence. Body \`{node_id}\`. No implicit heal. |
| GET | \`/v1/mesh/nodes\` | Rollup roster (no scores / leaderboard). |
| POST | \`/v1/mesh/broadcast\` | SHA-256 hash receipt only. Never a publish path. |
| GET | \`/v1/qns\` | QNS-CD-1.0 cite (photon QNS1 1.3). Local \`qnsd\` in qnm-node. Never a public via proxy. |
| GET/POST | \`/v1/azpipe/arch\` | MASTER-33 AZPIPE cite (same \`arch()\` payload as FragGate \`pipeline\`). Not a Softwares-tab door. |
| POST | \`/v1/memory/observe\` | AKM-TRIAD-1.0 observe (behind FragGate). |
| POST | \`/v1/memory/resolve\` | Append a graded/UNKNOWN resolution. |
| POST | \`/v1/memory/calibrate\` | 3-of-4 triad + Bayesian posterior. No auto MODEL_UPDATE. |
| POST | \`/v1/memory/recall\` | Adaptive ranked recall after ChainLock verify. |
| GET | \`/v1/memory/{id}\` | Read-only node / \`/history\` / \`/calibration\`. |
| POST | \`/v1/memory/rebuild-index\` | OPERATOR / local only. |

Library front door: https://www.azielcorpuslibrary.net/runtime  
Library engine manifest (same as this Worker): https://www.azielcorpuslibrary.net/runtime/v1/runtime.json  
**Not** the engine manifest: https://www.azielcorpuslibrary.net/v1/runtime is Digital Library package discovery (aziel-corpus), not aziel-runtime.

## Operator token (session mutate)

When \`REQUIRE_TOKEN=1\` and \`RUNTIME_TOKEN\` is set, **session mutate** (open/policy/exec/close) and MCP session tools require \`Authorization: Bearer $RUNTIME_TOKEN\` (Wrangler secret — one operator token, not per-user). **Public FragGate call stays open** (\`POST /v1/fraggate/call\`, MCP \`fraggate_call\`). Catalog, skill, OpenAPI, health, pull, FragGate list/describe/verify, MCP \`tools/list\`, and proxy \`/p/{slug}/{op}\` stay public. Proxy is not exec. \`runtime_run\` opens a session internally, so it inherits session-mutate auth.

## Example (Mozilla/5.0)

\`\`\`bash
curl -s -A 'Mozilla/5.0' ${base}/v1/skill
curl -s -A 'Mozilla/5.0' ${base}/v1/runtime.json
SID=$(curl -s -A 'Mozilla/5.0' -X POST ${base}/v1/session/open -H 'content-type: application/json' -H "Authorization: Bearer $RUNTIME_TOKEN" -d '{}' | jq -r .session.id)
curl -s -A 'Mozilla/5.0' -X POST ${base}/v1/session/$SID/policy \\
  -H 'content-type: application/json' -H "Authorization: Bearer $RUNTIME_TOKEN" \\
  -d '{"allow_slugs":["azclce"],"max_payload_bytes":8192}'
curl -s -A 'Mozilla/5.0' -X POST ${base}/v1/session/$SID/exec \\
  -H 'content-type: application/json' -H "Authorization: Bearer $RUNTIME_TOKEN" \\
  -d '{"slug":"azclce","op":"score","payload":{"r":"login button blue","d":"login form submits","p":"login button submits"}}'
curl -s -A 'Mozilla/5.0' ${base}/v1/session/$SID/receipt
curl -s -A 'Mozilla/5.0' -X POST ${base}/v1/session/$SID/close -H "Authorization: Bearer $RUNTIME_TOKEN"
\`\`\`

Proxy (not exec — no runtime-owned receipt):

\`\`\`bash
curl -s -A 'Mozilla/5.0' -X POST ${base}/p/azclce/score \\
  -H 'content-type: application/json' \\
  -d '{"r":"login button blue","d":"login form submits","p":"login button submits"}'
\`\`\`

## Honesty

Every catalog Software slug is a true engine (\`true_engine_runtime: true\`). \`engine_slugs\` equals \`true_engine_slugs\`: ${local}. Some ops remain per-op \`proxy_fallback\` when they need product-Worker bindings (AZ-OS session/exec/lattice; Aziel Digital Library live D1 / Whisper / OCR). Cloudflare isolate is the jail; \`engine_digest\` is still required for local exec.

**1.4.1 production gates (unchanged in 1.7.4):** \`GET /v1/ready\` is 200 only if the SESSION Durable Object binding is up; **503** if \`REQUIRE_TOKEN=1\` and the \`RUNTIME_TOKEN\` secret is missing (fail closed). Authority JSON is \`Cache-Control: no-store\`. When \`REQUIRE_TOKEN=1\` and the secret is set, **session mutate** (open/policy/exec/close) and MCP session tools require \`Authorization: Bearer …\` or \`X-Aziel-Runtime-Token\` (one operator token). **Public FragGate call stays open.** Catalog / health / runtime / skill / pull / FragGate list / OpenAPI / MCP \`tools/list\` / \`GET /v1/uses\` stay public. Proxy \`/p/{slug}/{op}\` stays public and is **not** exec. Receipt cap 64. Session TTL 6h. Per-IP rate limits apply.

GodLock and MirageGrid are not VPNs. ForgeReceipts is not legal advice. ZionPattern Solver caps confidence at 75% and does not solve cases. VeilLock does not inject into FaceTime. AZ-CLCE detects inconsistency, not intent. ChronoLock is advisory only. The ARK is not a kernel. AZAI hosted /v1 is a protocol mirror + Lamb check, not a paid-key proxy and **not** the local blend. Jeeves is not sovereign. SpectralLock hosted overlay is a 256px preview. EmployeeLock is not a court. FoldLock is not zip. WhistleLock is not a mailer. TrajectoryLock is not a certified forensic instrument. M.I.A.Lock Doe hits are leads, not IDs. Aziel Digital Library is not a 26-card index. AzielTether is not a VPN. PeaceLock is not a transcript, not a counterfactual, not a motive score, and not a HARD_DUTY waiver. 4DMap (4DM-WP-1.0) is a four-axis inspection frame T/Δ/Γ/Π — not a sequential gate, not a truth score, not a Lumen panel, not an extra door (\`domains_are_doors:false\`), and does not invent marks or backdate class. AZMail (APP 1.0) is not a full internet MTA — FragGate only; mesh default off; SMTP / deanonymize stub. AZBrowser (AZB-1.0) is not Chromium — FragGate only; Lamb Lens ethical research browser; cites; refuses harmful harvest; never invents visit results; tor_exit / phoenix_wipe stub. AZNet (AZN-WP-0.1) is a separate product — not a payload host; FragGate only; garden / stamp / memorial ops require AZBrowser pair_token AND pair_flag (functional order only). payload_host / serve_content_for_peer stub. AZHub (AIH-WP-1.0) is a Blank Key — not AZInterface, not an interpreter, not auto-unlock. AZInterface (AIH-WP-1.0) is a custodial operating environment — pre-locked page cycles; not AZHub. VPN/hop mesh is not claimed on this public surface. The suite QNM surface is QNM-BUILD-1.0 rollup (live/locked/isolated; default radios OFF; operator bearer enable) — not a login mesh, not login-recovery, not Node Gate/IP panel, not AnonBroadcast as a catalog product or publish path, not an upload proxy, not origin-hiding, not QNM-S. Full node process is local qnm-node/. AZMail mesh_* stays product-local.

## Cite

Eliab, Aziel. (${new Date().getUTCFullYear()}). Aziel Eliab Runtime ${RUNTIME_VERSION} [Software]. Apache-2.0. ${base}/

Primary name: Aziel Eliab. Also known as Aziel Elroi Eliab (alternateName only).
Digital Library: Eliab, Aziel. (2026). Aziel Digital Library [Software]. Apache-2.0. https://www.azielcorpuslibrary.net/
Machine-readable: ${base}/cite.json · https://www.azielcorpuslibrary.net/cite.json
GitHub: https://github.com/AzielEliab/aziel-runtime

${designsSkillMarkdown().trimEnd()}
`;
}

function extraFraggate(products, extra = {}) {
  const registry = buildRegistry(products);
  return {
    kernel: FRAGGATE_KERNEL,
    kernel_version: FRAGGATE_KERNEL_VERSION,
    pipeline: "MASTER-33",
    pipeline_strip: LOCKED_STRIP,
    lambgate: false,
    fraggate_single_door: true,
    registry_digest: extra.registry_digest || null,
    live_count: registry.live_count,
    stub_count: registry.stub_count,
    stub_op_count: registry.stub_op_count,
    local_only_count: registry.local_only_count,
    product_count: registry.entries.length,
    allowlist: LIVE_OPS,
    stub_ops: registry.stub_ops,
    ...(extra.fraggate || {}),
  };
}

export function runtimeManifest(origin, products, extra = {}) {
  const base = origin.replace(/\/$/, "");
  const slugs = products.map((p) => p.slug);
  const honesty = honestyFields(slugs);
  const authority = authoritySnapshot(slugs);
  const fraggate = extraFraggate(products, extra);
  return {
    ...authority,
    // Explicit aliases so scrapers that only look for these keys still see current version
    runtime_version: RUNTIME_VERSION,
    manifest: "aziel-runtime.manifest.v1.6",
    door: "fraggate",
    kernel: FRAGGATE_GITHUB,
    extras: catalogExtraCards(base),
    extras_note:
      "Kernel / door cards for Software hubs. extras[] is not PRODUCTS — FragGate is the door; Quantum Node Mesh (QNM-BUILD-1.0) is the suite rollup (not a login mesh; not a Softwares-tab product). Human UI + counted download is the separate FragGate Worker app (fraggate-download-tracker; not nested in AZBrowser). AZPIPE / SweepGate / ChainLock / LOCKSET / packed catalog / QNS-CD-1.0 are LIVE fabric modules, not Softwares-tab products. QNS implementation is local qnsd (Worker cites only).",
    fabric: {
      azpipe: "AZPIPE-0.2",
      sweepgate: "SG-0.1",
      chainlock: "CL-0.4",
      lockset: "LS-0.1",
      packed_catalog: "RL-WP-0.1-runtime",
      qns_cd: "QNS-CD-1.0",
      qns_process: "qnsd",
      qns_local: "https://github.com/AzielEliab/qnm-node",
      akm_triad: "AKM-TRIAD-1.0",
      pipeline: "MASTER-33",
      pipeline_strip: LOCKED_STRIP,
      azpipe_arch: "/v1/azpipe/arch",
      lamb_lens: true,
      roseclock: true,
      lambgate: false,
      fraggate_single_door: true,
      software_tab: false,
      mesh_get_never_enables: true,
      node_gate: false,
      author: "Aziel Eliab",
    },
    registry_digest: extra.registry_digest || fraggate.registry_digest || null,
    fraggate: { ...fraggateHubCard(base), ...fraggate },
    author: "Aziel Eliab",
    identity: "Aziel Eliab",
    aka: "Aziel Elroi Eliab",
    alternateName: "Aziel Elroi Eliab",
    license: "Apache-2.0",
    forks: "welcome",
    doi: null,
    doi_note: "No DOI invented. Cite /cite.json. Zenodo software deposit needed for a live record.",
    product_count: products.length,
    products: slugs,
    host: base + "/",
    github: "https://github.com/AzielEliab/aziel-runtime",
    ...citeCompatibleFields(),
    library_front_door: "https://www.azielcorpuslibrary.net/runtime",
    sigil: base + "/sigil.png",
    sigil_stamp: "Everblooming",
    user_agent: DEFAULT_UA,
    kv_increment: false,
    uses: base + "/v1/uses",
    counted_tarball: false,
    ...honesty,
    local_blends: ["azai serve", "forgereceipts ui", "azos ui"],
    authoritySnapshot: authority,
    version_history: VERSION_HISTORY,
    endpoints: {
      session_open: base + "/v1/session/open",
      ready: base + "/v1/ready",
      session_policy: base + "/v1/session/{id}/policy",
      session_exec: base + "/v1/session/{id}/exec",
      session_receipt: base + "/v1/session/{id}/receipt",
      session_receipts: base + "/v1/session/{id}/receipts",
      session_close: base + "/v1/session/{id}/close",
      skill: base + "/v1/skill",
      runtime: base + "/v1/runtime.json",
      runtime_alias: base + "/v1/runtime",
      discover: base + "/v1/catalog.json",
      software: base + "/v1/software",
      fraggate_software: base + "/v1/fraggate/software",
      update_check: base + "/v1/update/check",
      update_manifest: base + "/v1/update/manifest",
      pull: base + "/v1/pull/{slug}",
      pull_skill: base + "/v1/pull/{slug}/skill",
      bundle: base + "/v1/bundle",
      pull_all: base + "/v1/pull?all=1",
      fraggate: base + "/v1/fraggate",
      fraggate_list: base + "/v1/fraggate/list",
      fraggate_describe: base + "/v1/fraggate/describe",
      fraggate_verify: base + "/v1/fraggate/verify",
      fraggate_call: base + "/v1/fraggate/call",
      invoke: base + "/p/{slug}/{op}",
      invoke_note: "proxy only — not exec",
      cite: base + "/cite.json",
      openapi: base + "/openapi.json",
      mcp: base + "/mcp",
      health: base + "/v1/health",
      uses: base + "/v1/uses",
      stats: base + "/v1/stats",
      mesh: base + "/v1/mesh",
      mesh_status: base + "/v1/mesh/status",
      mesh_nodes: base + "/v1/mesh/nodes",
      mesh_enable: base + "/v1/mesh/enable",
      mesh_join: base + "/v1/mesh/join",
      mesh_broadcast: base + "/v1/mesh/broadcast",
      qns: base + "/v1/qns",
      azpipe_arch: base + "/v1/azpipe/arch",
      memory_observe: base + "/v1/memory/observe",
      memory_resolve: base + "/v1/memory/resolve",
      memory_calibrate: base + "/v1/memory/calibrate",
      memory_recall: base + "/v1/memory/recall",
      memory: base + "/v1/memory/{id}",
      llms: base + "/llms.txt",
      ai: base + "/ai.txt",
      sitemap: base + "/sitemap.xml",
      sitemap_index: base + "/sitemap-index.xml",
      robots: base + "/robots.txt",
    },
  };
}

export function bundleRecord(product, origin) {
  const base = origin.replace(/\/$/, "");
  return {
    slug: product.slug,
    name: product.name,
    version: product.version || null,
    skill_url: `${base}/v1/pull/${product.slug}/skill`,
    worker_skill: productUrlsSkill(product),
    invoke_prefix: `${base}/p/${product.slug}`,
    ops: (product.ops || []).map((o) => `${o.method} /p/${product.slug}/${o.op}`),
    download: downloadUrl(product),
    install: installUrl(product),
  };
}

export function bundleJson(origin, products) {
  const base = origin.replace(/\/$/, "");
  const honesty = honestyFields(products.map((p) => p.slug));
  return {
    ok: true,
    role: RUNTIME_ROLE,
    layer: RUNTIME_LAYER,
    author: "Aziel Eliab",
    identity: "Aziel Eliab",
    version: RUNTIME_VERSION,
    product_count: products.length,
    skill: base + "/v1/skill",
    runtime: base + "/v1/runtime.json",
    session: base + "/v1/session/open",
    invoke: base + "/p/{slug}/{op}",
    invoke_note: "proxy only — not exec",
    cite: base + "/cite.json",
    user_agent: DEFAULT_UA,
    true_engine_slugs: honesty.true_engine_slugs,
    proxy_is_not_exec: true,
    products: products.map((p) => bundleRecord(p, origin)),
  };
}

function workerHostOf(product) {
  if (product.slug === "aziel-corpus") return "https://www.azielcorpuslibrary.net";
  return `https://${product.worker}.vibelock.workers.dev`;
}

function downloadUrl(product) {
  return workerHostOf(product) + "/download";
}

function installUrl(product) {
  return workerHostOf(product) + "/install.sh";
}

function productUrlsSkill(product) {
  return workerHostOf(product) + "/v1/skill";
}

export function pullRecord(product, origin, skillText, extra = {}) {
  const base = origin.replace(/\/$/, "");
  const host = workerHostOf(product);
  const inline =
    typeof skillText === "string" && skillText.length > 0 && skillText.length <= SKILL_INLINE_MAX
      ? skillText
      : null;
  return {
    ok: true,
    role: "product",
    slug: product.slug,
    name: product.name,
    version: product.version || null,
    one_line: product.oneLine,
    author: "Aziel Eliab",
    identity: "Aziel Eliab",
    aka: "Aziel Elroi Eliab",
    license: "Apache-2.0",
    github: product.github,
    skill_url: `${base}/v1/pull/${product.slug}/skill`,
    worker_skill: host + "/v1/skill",
    ...(inline ? { skill: inline } : skillText ? { skill_bytes: skillText.length, skill_inline: false } : {}),
    download: host + "/download",
    cite: host + "/cite.json",
    llms: host + "/llms.txt",
    sitemap: host + "/sitemap.xml",
    count: host + "/count",
    install: host + "/install.sh",
    install_sh: `curl -fsSL ${host}/install.sh | bash`,
    update_check: `${base}/v1/update/check?slug=${encodeURIComponent(product.slug)}${product.version ? `&version=${encodeURIComponent(product.version)}` : ""}`,
    software: `${base}/v1/software`,
    openapi: host + "/openapi.json",
    runtime_openapi: base + "/openapi.json",
    ops: product.ops,
    banner: product.banner || null,
    limitations: product.banner || product.oneLine || null,
    aliases: {
      catalog_card: `${base}/p/${product.slug}`,
      catalog_skill: `${base}/p/${product.slug}/skill`,
      catalog_health: `${base}/p/${product.slug}/health`,
    invoke_prefix: `${base}/p/${product.slug}`,
    update_check: `${base}/v1/update/check?slug=${encodeURIComponent(product.slug)}${product.version ? `&version=${encodeURIComponent(product.version)}` : ""}`,
    software: `${base}/v1/software`,
    worker_home: host + "/",
      slugs: [product.slug, ...aliasesForSlug(product.slug)],
    },
    doi: product.doi || null,
    doi_note: product.doi
      ? "Historical DOI only. Do not invent a replacement. See /cite.json."
      : "No DOI. Zenodo software deposit needed. Do not invent one.",
    skill_source: extra.skill_source || null,
    kv_increment: false,
  };
}

export function fallbackSkillMarkdown(product, origin) {
  const base = origin.replace(/\/$/, "");
  const host = workerHostOf(product);
  const ops = (product.ops || [])
    .map((o) => `| ${o.method} | \`/v1/${o.op}\` · \`${base}/p/${product.slug}/${o.op}\` | ${o.summary} |`)
    .join("\n");
  const example = JSON.stringify(product.example || {}, null, 2);
  return `---
name: ${product.name}
description: >-
  ${product.oneLine || product.name} Hosted via aziel-runtime pull + invoke.
  Author Aziel Eliab.
---

# ${product.name}

${product.oneLine || product.name}

Author: **Aziel Eliab**. Identity is Aziel Eliab only.
${product.version ? `Version: ${product.version}` : ""}
${product.banner ? `\n**Banner / limitation:** ${product.banner}\n` : ""}

Always send \`User-Agent: Mozilla/5.0\`.

This skill was served from **aziel-runtime** because the product Worker \`/v1/skill\` was not available. Prefer \`${base}/v1/pull/${product.slug}/skill\` on the next call.

## Pull + invoke (do not visit the product homepage first)

- Pull: \`${base}/v1/pull/${product.slug}\`
- Skill: \`${base}/v1/pull/${product.slug}/skill\`
- Invoke prefix: \`${base}/p/${product.slug}\`
- Worker: ${host}/
- Counted download: ${host}/download
- Install: \`curl -fsSL ${host}/install.sh | bash\`
- GitHub: ${product.github}

## Ops

| Method | Path | What |
|--------|------|------|
${ops}

## Example

\`\`\`bash
curl -s -A 'Mozilla/5.0' -X POST ${base}/p/${product.slug}/${(product.ops.find((o) => o.method === "POST") || product.ops[0] || { op: "health" }).op} \\
  -H 'content-type: application/json' \\
  -d '${example.replace(/'/g, "’")}'
\`\`\`

Apache-2.0. Forks welcome. Do not invent a DOI.
`;
}

function looksLikeSkill(text, contentType) {
  if (!text || typeof text !== "string") return false;
  const trimmed = text.trim();
  if (!trimmed || trimmed[0] === "{" || trimmed[0] === "[") return false;
  const ct = String(contentType || "").toLowerCase();
  if (ct.includes("json")) return false;
  if (ct.includes("markdown") || ct.includes("text/plain") || ct.includes("text/x-markdown")) return true;
  return trimmed.startsWith("#") || trimmed.startsWith("---") || trimmed.includes("\n# ");
}

export async function fetchProductSkill(env, product, upstreamFetch) {
  const now = Date.now();
  const hit = skillCache.get(product.slug);
  if (hit && now - hit.at < SKILL_TTL_MS && hit.text) {
    return { text: hit.text, source: hit.source + "+cache", contentType: hit.contentType };
  }
  try {
    const { res, target } = await upstreamFetch(env, product, "/v1/skill", {
      method: "GET",
      headers: {
        accept: "text/markdown, text/plain, */*",
        "user-agent": DEFAULT_UA,
      },
    });
    if (res && res.ok) {
      const contentType = res.headers.get("content-type") || "text/markdown; charset=utf-8";
      const text = await res.text();
      if (looksLikeSkill(text, contentType)) {
        skillCache.set(product.slug, { text, at: now, source: target, contentType });
        return { text, source: target, contentType };
      }
    }
  } catch {
    /* fallback below */
  }
  return { text: null, source: null, contentType: "text/markdown; charset=utf-8" };
}

export function markdownResponse(body, extra = {}) {
  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, HEAD, POST, OPTIONS",
      "Access-Control-Allow-Headers":
        "Content-Type, Accept, Authorization, X-Aziel-Runtime-Token, X-Aziel-Runtime-Via, X-Aziel-Runtime-Host, MCP-Protocol-Version, mcp-session-id",
      "Access-Control-Expose-Headers": "X-Aziel-Runtime-Version, X-Aziel-Runtime-Role",
      "X-Robots-Tag": "index, follow, max-snippet:-1, max-image-preview:large",
      ...extra,
    },
  });
}

export function runtimeStaticPaths() {
  return {
    "/v1/session/open": {
      post: {
        operationId: "runtime_session_open",
        security: [{ RuntimeToken: [] }],
        summary: "Open a session (id, policy defaults, empty hash-chained receipt list).",
        tags: ["session"],
        requestBody: {
          required: false,
          content: { "application/json": { schema: { type: "object" } } },
        },
        responses: { "200": { description: "Session + genesis receipt" } },
      },
    },
    "/v1/session/{id}/policy": {
      post: {
        operationId: "runtime_session_policy",
        security: [{ RuntimeToken: [] }],
        summary: "Attach allow rules (slugs, ops, payload cap). Identity remains Aziel Eliab.",
        tags: ["session"],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        requestBody: {
          required: true,
          content: { "application/json": { schema: { type: "object" } } },
        },
        responses: { "200": { description: "Updated policy + receipt" }, "409": { description: "Session closed" } },
      },
    },
    "/v1/session/{id}/exec": {
      post: {
        operationId: "runtime_session_exec",
        security: [{ RuntimeToken: [] }],
        summary: "Runtime-owned exec: local engine when vendored (engine_digest + ran_in), else explicit proxy_fallback. Not the same as proxy /p/{slug}/{op}.",
        tags: ["session"],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["slug", "op"],
                properties: {
                  slug: { type: "string" },
                  op: { type: "string" },
                  payload: { type: "object" },
                },
              },
            },
          },
        },
        responses: {
          "200": { description: "Exec receipt" },
          "403": { description: "Policy denied" },
          "409": { description: "Session closed" },
        },
      },
    },
    "/v1/session/{id}/receipt": {
      get: {
        operationId: "runtime_session_receipt",
        summary: "Last runtime-owned receipt. Hash chain is verifiable locally.",
        tags: ["session"],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { "200": { description: "Last receipt + verified" } },
      },
    },
    "/v1/session/{id}/receipts": {
      get: {
        operationId: "runtime_session_receipts",
        summary: "Full hash-chained receipt list for a session.",
        tags: ["session"],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { "200": { description: "Receipt chain + verified" } },
      },
    },
    "/v1/session/{id}/close": {
      post: {
        operationId: "runtime_session_close",
        security: [{ RuntimeToken: [] }],
        summary: "Seal the session. Further exec is rejected.",
        tags: ["session"],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { "200": { description: "Final receipt" }, "409": { description: "Already closed" } },
      },
    },
    "/v1/skill": {
      get: {
        operationId: "runtime_skill",
        summary: "Skill markdown: 1.7.4 enhances 4DMap LIVE_OPS (frame_status/axis_describe/walk_trace/card_export/card_import/verify_chain/neighbor_cite). 1.7.3 aligns audit WARN copy (exist.mcp → tools/list; public FragGate call; catalog count_note). 1.7.2 adds GET /v1/azpipe/arch (MASTER-33 cite). 1.7.1 adds AKM-TRIAD-1.0. 1.7.0 locks MASTER-33 (FragGate single door). 1.6.15 locked SUITE-PIPE. 1.6.14 adds 4DMap (4DM-WP-1.0). 1.6.13 aligns the QNM-BUILD-1.0 suite rollup. 1.6.12 adds GET /v1/software + client update check. Honest about 1.1.0 through 1.7.4.",
        tags: ["runtime"],
        responses: { "200": { description: "text/markdown skill" } },
      },
      head: {
        operationId: "runtime_skill_head",
        summary: "HEAD of /v1/skill. X-Aziel-Runtime-Version / Role.",
        tags: ["runtime"],
        responses: { "200": { description: "headers only" } },
      },
    },
    "/v1/runtime.json": {
      get: {
        operationId: "runtime_manifest",
        summary: "Machine manifest. role=engine-runtime. Every catalog slug is a true engine; binding-only ops stay per-op proxy_fallback. Identity Aziel Eliab.",
        tags: ["runtime"],
        responses: { "200": { description: "Runtime manifest JSON" } },
      },
      head: {
        operationId: "runtime_manifest_head",
        summary: "HEAD of /v1/runtime.json. X-Aziel-Runtime-Version / Role.",
        tags: ["runtime"],
        responses: { "200": { description: "headers only" } },
      },
    },
    "/v1/ready": {
      get: {
        operationId: "runtime_ready",
        summary:
          "Readiness. 200 if SESSION Durable Object binding is up. 503 if REQUIRE_TOKEN=1 and RUNTIME_TOKEN secret is missing. Public FragGate call stays open; session mutate requires token when configured.",
        tags: ["runtime"],
        responses: {
          "200": { description: "Ready. fraggate_call_public=true. mutate_requires_token when REQUIRE_TOKEN=1 and secret is set." },
          "503": { description: "SESSION missing or REQUIRE_TOKEN=1 without RUNTIME_TOKEN" },
        },
      },
      head: {
        operationId: "runtime_ready_head",
        summary: "HEAD of /v1/ready. X-Aziel-Runtime-Version / Role.",
        tags: ["runtime"],
        responses: { "200": { description: "headers only" }, "503": { description: "not ready" } },
      },
    },
    "/mcp": {
      post: {
        operationId: "mcp_jsonrpc",
        summary:
          "JSON-RPC MCP-over-HTTP. tools/list is the live tool set (~36). Pipeline: fraggate_list → fraggate_describe → fraggate_call. Refuse exist.mcp points here. Proxy /p/{slug}/{op} is not exec. FragGate remains THE single door.",
        tags: ["fraggate"],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  jsonrpc: { type: "string", example: "2.0" },
                  id: {},
                  method: { type: "string", description: "initialize | tools/list | tools/call | ping" },
                  params: { type: "object" },
                },
              },
            },
          },
        },
        responses: { "200": { description: "JSON-RPC result. tools/list names match refuse exist.mcp." } },
      },
    },
    "/v1/software": {
      get: {
        operationId: "runtime_software",
        summary:
          "Authoritative software catalog for hubs/clients. Plain A–Z → Gate A–Z → Lock A–Z (Clock ≠ Lock). Includes EmbryoLock stub. Mirror: GET /v1/fraggate/software.",
        tags: ["software"],
        responses: { "200": { description: "Software catalog JSON" } },
      },
    },
    "/v1/update/check": {
      get: {
        operationId: "runtime_update_check",
        summary: "Client update check for install.sh / local UI / mobile. Query slug + version.",
        tags: ["software"],
        parameters: [
          { name: "slug", in: "query", required: true, schema: { type: "string" } },
          { name: "version", in: "query", schema: { type: "string" } },
        ],
        responses: { "200": { description: "Update check JSON" }, "404": { description: "Unknown slug" } },
      },
    },
    "/v1/update/manifest": {
      get: {
        operationId: "runtime_update_manifest",
        summary: "Latest versions for every product plus aziel-runtime.",
        tags: ["software"],
        responses: { "200": { description: "Update manifest JSON" } },
      },
    },
    "/v1/bundle": {
      get: {
        operationId: "runtime_bundle",
        summary: "Compact bootstrap: every product skill URL + invoke prefix. Prefer GET /v1/software for hub tabs.",
        tags: ["runtime"],
        responses: { "200": { description: "Bundle JSON" } },
      },
    },
    "/v1/pull": {
      get: {
        operationId: "runtime_pull_query",
        summary: "Pull one product (?slug=) or the full bundle (?all=1).",
        tags: ["runtime"],
        parameters: [
          { name: "all", in: "query", schema: { type: "string" } },
          { name: "slug", in: "query", schema: { type: "string" } },
        ],
        responses: { "200": { description: "Pull or bundle JSON" } },
      },
    },
    "/v1/pull/{slug}": {
      get: {
        operationId: "runtime_pull",
        summary: "Pull record: name, version, skill_url, inline skill, download, install.sh, ops, OpenAPI, banners, aliases.",
        tags: ["runtime"],
        parameters: [{ name: "slug", in: "path", required: true, schema: { type: "string" } }],
        responses: { "200": { description: "Pull JSON" }, "404": { description: "Unknown slug" } },
      },
    },
    "/v1/pull/{slug}/skill": {
      get: {
        operationId: "runtime_pull_skill",
        summary: "Product skill markdown proxied/cached from the product Worker.",
        tags: ["runtime"],
        parameters: [{ name: "slug", in: "path", required: true, schema: { type: "string" } }],
        responses: { "200": { description: "text/markdown skill" }, "404": { description: "Unknown slug" } },
      },
    },
    "/v1/fraggate": {
      get: {
        operationId: "fraggate_door",
        summary: "FragGate door summary: registry_digest; live / stub / local_only product counts; stub_op_count. Kernel FG-0.1.",
        tags: ["fraggate"],
        responses: { "200": { description: "Door JSON" } },
      },
    },
    "/v1/fraggate/list": {
      get: {
        operationId: "fraggate_list",
        summary: "Hashed registry entries (name, slug, digest, status, public ops).",
        tags: ["fraggate"],
        responses: { "200": { description: "Registry list" } },
      },
    },
    "/v1/fraggate/describe": {
      get: {
        operationId: "fraggate_describe",
        summary: "Describe one registry name (live vs stub vs local_only).",
        tags: ["fraggate"],
        parameters: [
          { name: "name", in: "query", schema: { type: "string" } },
          { name: "slug", in: "query", schema: { type: "string" } },
        ],
        responses: { "200": { description: "Entry JSON" } },
      },
    },
    "/v1/fraggate/verify": {
      post: {
        operationId: "fraggate_verify",
        summary: "Verify a registry name or digest.",
        tags: ["fraggate"],
        requestBody: {
          required: false,
          content: { "application/json": { schema: { type: "object" } } },
        },
        responses: { "200": { description: "Verify JSON" } },
      },
    },
    "/v1/fraggate/call": {
      post: {
        operationId: "fraggate_call",
        summary:
          "CallEnvelope in → FragGate → Lamb Lens → SweepGate → Sentinel → Provenance/Input Packet → ChainLock-IN → DecisionGATE → AZPIPE → Internal Domain Layer → optional ASE → RoseClock → TemporalLock → ChainLock-OUT → ForgeReceipts → Return. FragGate is THE single door. Lamb Lens is fabric after FragGate. Domain softwares execute only after AZPIPE. AZHub LIVE_OPS, AZInterface LIVE_OPS, AZBrowser LIVE_OPS (ethical_search, lamb_lens_search, navigate, airlock_ingest, tab_open, tab_list, receipt_list, verify, receipt_verify, health, skill) and AZNet LIVE_OPS (health, pair_status, garden_list, stamp, verify_hash, memorial_list, memorial_append, receipt_verify, skill) are reached only through this door — same ops as MCP fraggate_call and the Worker UI buttons. AZHub, AZInterface, AZNet, and AZBrowser are separate products.",
        tags: ["fraggate"],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  slug: { type: "string", description: "Catalog slug. Use azhub or azinterface for AIH-WP-1.0 (separate products, same FragGate door). Use azbrowser for AZBrowser / Lamb Lens. Use aznet for AZNet (separate product)." },
                  op: {
                    type: "string",
                    description:
                      "Public allowlisted op. UI aliases forward to catalog ops: azhub list_modules→region_list, place→place_module; azinterface genesis_boot→genesis_status, hold→page_cycle_status; azbrowser airlock→airlock_ingest, home→health; azmail classify→airlock_classify; aznet doctor→health, pair→pair_status; peacelock doctor→health. AZHub: region_list | place_module | remove_module | tether_declare | tether_cut | tether_list | blank_key_status | list_modules | place | health | skill. AZInterface: genesis_status | site_state_get | site_state_set | integrity_check | witness_list | page_cycle_status | genesis_boot | hold | health | skill. AZBrowser: ethical_search | lamb_lens_search | navigate | airlock_ingest | airlock | home | tab_open | tab_list | receipt_list | verify | receipt_verify | health | skill. AZNet: health | doctor | pair_status | pair | garden_list | stamp | verify_hash | memorial_list | memorial_append | receipt_verify | skill.",
                  },
                  payload: { type: "object" },
                  claim: { type: "object" },
                },
              },
              examples: {
                azbrowser_ethical_search: {
                  summary: "AZBrowser Lamb Lens ethical search",
                  value: { slug: "azbrowser", op: "ethical_search", payload: { q: "ethical web principles" } },
                },
                azbrowser_navigate: {
                  summary: "AZBrowser advisory navigate (metadata only)",
                  value: { slug: "azbrowser", op: "navigate", payload: { url: "https://www.w3.org/TR/ethical-web-principles/" } },
                },
                azbrowser_airlock: {
                  summary: "AZBrowser airlock ingest",
                  value: { slug: "azbrowser", op: "airlock_ingest", payload: { url: "https://github.com/AzielEliab/azbrowser" } },
                },
                azbrowser_tabs: {
                  summary: "AZBrowser tab_open",
                  value: { slug: "azbrowser", op: "tab_open", payload: { url: "https://github.com/AzielEliab/fraggate" } },
                },
                azbrowser_lamb_lens: {
                  summary: "AZBrowser Lamb Lens alias",
                  value: { slug: "azbrowser", op: "lamb_lens_search", payload: { q: "Workers AI embeddings" } },
                },
                azbrowser_tab_list: {
                  summary: "AZBrowser tab_list",
                  value: { slug: "azbrowser", op: "tab_list", payload: {} },
                },
                azbrowser_receipts: {
                  summary: "AZBrowser receipt_list",
                  value: { slug: "azbrowser", op: "receipt_list", payload: { limit: 8 } },
                },
                azbrowser_verify: {
                  summary: "AZBrowser receipt verify",
                  value: { slug: "azbrowser", op: "verify", payload: { id: "azb_example" } },
                },
                azbrowser_receipt_verify: {
                  summary: "AZBrowser receipt_verify alias",
                  value: { slug: "azbrowser", op: "receipt_verify", payload: { id: "azb_example" } },
                },
                azbrowser_health: {
                  summary: "AZBrowser health",
                  value: { slug: "azbrowser", op: "health", payload: {} },
                },
                azbrowser_skill: {
                  summary: "AZBrowser skill",
                  value: { slug: "azbrowser", op: "skill", payload: {} },
                },
                aznet_pair_status: {
                  summary: "AZNet pair_status",
                  value: { slug: "aznet", op: "pair_status", payload: {} },
                },
                aznet_garden_list: {
                  summary: "AZNet garden_list (requires AZBrowser pair)",
                  value: { slug: "aznet", op: "garden_list", payload: { pair_token: "aznet-azbrowser-pair", pair_flag: "azbrowser" } },
                },
                aznet_stamp: {
                  summary: "AZNet stamp hash ref",
                  value: { slug: "aznet", op: "stamp", payload: { pair_token: "aznet-azbrowser-pair", pair_flag: "azbrowser", hash: "0".repeat(64) } },
                },
                aznet_verify_hash: {
                  summary: "AZNet verify_hash",
                  value: { slug: "aznet", op: "verify_hash", payload: { pair_token: "aznet-azbrowser-pair", pair_flag: "azbrowser", hash: "0".repeat(64) } },
                },
                aznet_memorial_list: {
                  summary: "AZNet memorial_list",
                  value: { slug: "aznet", op: "memorial_list", payload: { pair_token: "aznet-azbrowser-pair", pair_flag: "azbrowser" } },
                },
                aznet_memorial_append: {
                  summary: "AZNet memorial_append (terminal)",
                  value: { slug: "aznet", op: "memorial_append", payload: { pair_token: "aznet-azbrowser-pair", pair_flag: "azbrowser", hash: "0".repeat(64), note: "sealed" } },
                },
                aznet_receipt_verify: {
                  summary: "AZNet receipt_verify",
                  value: { slug: "aznet", op: "receipt_verify", payload: { receipt: { hash: "0".repeat(64) } } },
                },
                aznet_health: {
                  summary: "AZNet health",
                  value: { slug: "aznet", op: "health", payload: {} },
                },
                aznet_skill: {
                  summary: "AZNet skill",
                  value: { slug: "aznet", op: "skill", payload: {} },
                },
                azhub_blank_key: {
                  summary: "AZHub Blank Key status",
                  value: { slug: "azhub", op: "blank_key_status", payload: {} },
                },
                azhub_region_list: {
                  summary: "AZHub region_list",
                  value: { slug: "azhub", op: "region_list", payload: {} },
                },
                azhub_place_module: {
                  summary: "AZHub place_module",
                  value: { slug: "azhub", op: "place_module", payload: { region: "core", module_id: "foldlock" } },
                },
                azhub_remove_module: {
                  summary: "AZHub remove_module",
                  value: { slug: "azhub", op: "remove_module", payload: { module_id: "foldlock" } },
                },
                azhub_tether_declare: {
                  summary: "AZHub tether_declare",
                  value: { slug: "azhub", op: "tether_declare", payload: { from: "foldlock", to: "peacelock" } },
                },
                azhub_tether_cut: {
                  summary: "AZHub tether_cut",
                  value: { slug: "azhub", op: "tether_cut", payload: { from: "foldlock", to: "peacelock" } },
                },
                azhub_tether_list: {
                  summary: "AZHub tether_list",
                  value: { slug: "azhub", op: "tether_list", payload: {} },
                },
                azhub_health: {
                  summary: "AZHub health",
                  value: { slug: "azhub", op: "health", payload: {} },
                },
                azhub_skill: {
                  summary: "AZHub skill",
                  value: { slug: "azhub", op: "skill", payload: {} },
                },
                azinterface_page_cycle: {
                  summary: "AZInterface pre-locked page cycles",
                  value: { slug: "azinterface", op: "page_cycle_status", payload: {} },
                },
                azinterface_genesis: {
                  summary: "AZInterface genesis_status",
                  value: { slug: "azinterface", op: "genesis_status", payload: {} },
                },
                azinterface_state_get: {
                  summary: "AZInterface site_state_get",
                  value: { slug: "azinterface", op: "site_state_get", payload: {} },
                },
                azinterface_state_set: {
                  summary: "AZInterface site_state_set",
                  value: { slug: "azinterface", op: "site_state_set", payload: { cycle: "integrity" } },
                },
                azinterface_integrity: {
                  summary: "AZInterface integrity_check",
                  value: { slug: "azinterface", op: "integrity_check", payload: { witness: "custodian-1" } },
                },
                azinterface_witnesses: {
                  summary: "AZInterface witness_list",
                  value: { slug: "azinterface", op: "witness_list", payload: {} },
                },
                azinterface_health: {
                  summary: "AZInterface health",
                  value: { slug: "azinterface", op: "health", payload: {} },
                },
                azinterface_skill: {
                  summary: "AZInterface skill",
                  value: { slug: "azinterface", op: "skill", payload: {} },
                },
                azhub_list_modules: {
                  summary: "AZHub UI alias of region_list",
                  value: { slug: "azhub", op: "list_modules", payload: {} },
                },
                azhub_place: {
                  summary: "AZHub UI alias of place_module",
                  value: { slug: "azhub", op: "place", payload: { region: "core", module_id: "foldlock" } },
                },
                azinterface_genesis_boot: {
                  summary: "AZInterface UI alias of genesis_status",
                  value: { slug: "azinterface", op: "genesis_boot", payload: {} },
                },
                azinterface_hold: {
                  summary: "AZInterface UI alias of page_cycle_status",
                  value: { slug: "azinterface", op: "hold", payload: {} },
                },
                azbrowser_airlock_alias: {
                  summary: "AZBrowser UI alias of airlock_ingest",
                  value: { slug: "azbrowser", op: "airlock", payload: { url: "https://github.com/AzielEliab/azbrowser" } },
                },
                azbrowser_home: {
                  summary: "AZBrowser UI alias of health",
                  value: { slug: "azbrowser", op: "home", payload: {} },
                },
                azmail_classify: {
                  summary: "AZMail UI alias of airlock_classify",
                  value: { slug: "azmail", op: "classify", payload: { text: "hello from the anonymous ring" } },
                },
                aznet_doctor: {
                  summary: "AZNet UI alias of health",
                  value: { slug: "aznet", op: "doctor", payload: {} },
                },
                aznet_pair: {
                  summary: "AZNet UI alias of pair_status",
                  value: { slug: "aznet", op: "pair", payload: {} },
                },
                peacelock_doctor: {
                  summary: "PeaceLock UI alias of health",
                  value: { slug: "peacelock", op: "doctor", payload: {} },
                },
              },
            },
          },
        },
        responses: {
          "200": { description: "ResultEnvelope" },
          "400": { description: "Refuse (HALLUC / stub / local_only / gate)" },
        },
      },
    },
    "/v1/uses": {
      get: {
        operationId: "runtime_uses",
        summary:
          "API use counters + recent ring log (no PII). Does not increment. Distinct from product download-trackers and the FragGate ledger.",
        tags: ["runtime"],
        responses: { "200": { description: "Uses JSON: uses, by_host, by_path, by_day, recent" } },
      },
      head: {
        operationId: "runtime_uses_head",
        summary: "HEAD of /v1/uses. Does not increment.",
        tags: ["runtime"],
        responses: { "200": { description: "headers only" } },
      },
      post: {
        operationId: "runtime_uses_post",
        summary: "Forbidden. Increments are automatic on API traffic. Read with GET /v1/uses.",
        tags: ["runtime"],
        responses: { "405": { description: "method not allowed" } },
      },
    },
    "/v1/stats": {
      get: {
        operationId: "runtime_stats",
        summary: "Alias of GET /v1/uses (API use counters). Does not increment.",
        tags: ["runtime"],
        responses: { "200": { description: "Uses JSON plus alias_of" } },
      },
    },
    "/v1/mesh": {
      get: {
        operationId: "mesh_status",
        summary:
          "QNM-BUILD-1.0 suite rollup (enabled?, bearers, live/locked/isolated). Default OFF. GET never enables. Not a login mesh. Views/MCP/downloads do not enter QNM-S. Packet-transfer coding design is QNS-CD-1.0 (photon QNS1 1.3 on local qnsd; GET /v1/qns cites only).",
        tags: ["mesh"],
        responses: { "200": { description: "QNM rollup JSON" } },
      },
      head: {
        operationId: "mesh_status_head",
        summary: "HEAD of /v1/mesh.",
        tags: ["mesh"],
        responses: { "200": { description: "headers only" } },
      },
    },
    "/v1/mesh/status": {
      get: {
        operationId: "mesh_status_alias",
        summary: "Alias of GET /v1/mesh. Never enables radios.",
        tags: ["mesh"],
        responses: { "200": { description: "QNM rollup JSON" } },
      },
    },
    "/v1/mesh/nodes": {
      get: {
        operationId: "mesh_nodes",
        summary: "QNM rollup roster (live/locked/isolated). No scores. No leaderboard.",
        tags: ["mesh"],
        responses: { "200": { description: "Rollup nodes JSON" } },
      },
    },
    "/v1/mesh/enable": {
      post: {
        operationId: "mesh_enable",
        summary: "Operator enable. LIVE only after ≥1 declared bearer. Empty {} refused. Rate-limited. Not a login mesh.",
        tags: ["mesh"],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["bearer"],
                properties: { bearer: { type: "string", description: "Declared bearer (example: suite-presence)" } },
              },
            },
          },
        },
        responses: { "200": { description: "Radios LIVE" }, "400": { description: "Need bearer, bad bearer, or rate limited" } },
      },
    },
    "/v1/mesh/disable": {
      post: {
        operationId: "mesh_disable",
        summary: "Radios/bearers OFF. Tethers drop clean. No wipe / heal / resurrection.",
        tags: ["mesh"],
        requestBody: { required: false, content: { "application/json": { schema: { type: "object" } } } },
        responses: { "200": { description: "Radios OFF" } },
      },
    },
    "/v1/mesh/join": {
      post: {
        operationId: "mesh_join",
        summary: "Register rollup presence. Body { product, node_id?, label?, presence? }. Refused while radios are OFF.",
        tags: ["mesh"],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["product"],
                properties: {
                  product: { type: "string" },
                  node_id: { type: "string" },
                  label: { type: "string" },
                  presence: { type: "string", description: "live | locked | isolated" },
                },
              },
            },
          },
        },
        responses: { "200": { description: "Session + node" }, "400": { description: "Radios off or bad input" } },
      },
    },
    "/v1/mesh/heartbeat": {
      post: {
        operationId: "mesh_heartbeat",
        summary: "Refresh 5-minute presence. Body { node_id, presence? }.",
        tags: ["mesh"],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["node_id"],
                properties: { node_id: { type: "string" }, presence: { type: "string" } },
              },
            },
          },
        },
        responses: { "200": { description: "Presence refreshed" }, "400": { description: "Unknown node or radios off" } },
      },
    },
    "/v1/mesh/leave": {
      post: {
        operationId: "mesh_leave",
        summary: "Drop rollup presence. Body { node_id }. No implicit heal.",
        tags: ["mesh"],
        requestBody: {
          required: true,
          content: { "application/json": { schema: { type: "object", required: ["node_id"], properties: { node_id: { type: "string" } } } } },
        },
        responses: { "200": { description: "Left" } },
      },
    },
    "/v1/qns": {
      get: {
        operationId: "qns_cite",
        summary:
          "QNS-CD-1.0 cite (photon QNS1 1.3). Packet-transfer coding design companion to QNM-BUILD-1.0 / AIH-WP-1.3. Implementation is local qnsd in AzielEliab/qnm-node (127.0.0.1 only). This Worker cites only — never a public via proxy, wipe, or control plane. Not a Softwares-tab product.",
        tags: ["mesh"],
        responses: { "200": { description: "QNS-CD-1.0 cite JSON (local API paths named, not proxied)" } },
      },
      head: {
        operationId: "qns_cite_head",
        summary: "HEAD of /v1/qns.",
        tags: ["mesh"],
        responses: { "200": { description: "headers only" } },
      },
      post: {
        operationId: "qns_cite_post",
        summary:
          "Refused. GET /v1/qns cites only. Public Worker must not proxy local via emit.",
        tags: ["mesh"],
        responses: { "405": { description: "QNS-CITE-ONLY" } },
      },
    },
    "/v1/azpipe/arch": {
      get: {
        operationId: "azpipe_arch",
        summary:
          "MASTER-33 AZPIPE cite/read. Same arch() payload FragGate already exposes as pipeline / pipeline_strip (v, magic, locked, master, lambgate, fraggate_single_door, roseclock, hop list, 11 domains / 33 softwares). Not a Softwares-tab door. Not a FragGate slug. Mesh stays default-off.",
        tags: ["runtime"],
        responses: { "200": { description: "MASTER-33 AZPIPE arch/strip JSON" } },
      },
      head: {
        operationId: "azpipe_arch_head",
        summary: "HEAD of /v1/azpipe/arch.",
        tags: ["runtime"],
        responses: { "200": { description: "headers only" } },
      },
      post: {
        operationId: "azpipe_arch_post",
        summary:
          "Same MASTER-33 cite as GET /v1/azpipe/arch. Cite/read only — no mutate, no mesh enable, no Softwares door.",
        tags: ["runtime"],
        responses: { "200": { description: "MASTER-33 AZPIPE arch/strip JSON" } },
      },
    },
    "/v1/memory/observe": {
      post: {
        operationId: "memory_observe",
        summary: "AKM-TRIAD-1.0 observe. Behind FragGate. Not a Softwares-tab product. Append-only learn stamp.",
        tags: ["memory"],
        requestBody: { required: true, content: { "application/json": { schema: { type: "object" } } } },
        responses: { "200": { description: "Observation stamp" } },
      },
    },
    "/v1/memory/resolve": {
      post: {
        operationId: "memory_resolve",
        summary: "AKM-TRIAD-1.0 resolve. UNKNOWN ≠ MISS. Outcome requires provenance.",
        tags: ["memory"],
        requestBody: { required: true, content: { "application/json": { schema: { type: "object" } } } },
        responses: { "200": { description: "Resolution stamp" } },
      },
    },
    "/v1/memory/calibrate": {
      post: {
        operationId: "memory_calibrate",
        summary: "AKM-TRIAD-1.0 calibrate. Deterministic 3-of-4 triad. No automatic MODEL_UPDATE.",
        tags: ["memory"],
        requestBody: { required: false, content: { "application/json": { schema: { type: "object" } } } },
        responses: { "200": { description: "Calibration + triad" } },
      },
    },
    "/v1/memory/recall": {
      post: {
        operationId: "memory_recall",
        summary: "AKM-TRIAD-1.0 adaptive recall after ChainLock verify. Additive path.",
        tags: ["memory"],
        requestBody: { required: false, content: { "application/json": { schema: { type: "object" } } } },
        responses: { "200": { description: "Ranked memory cards" } },
      },
    },
    "/v1/memory/rebuild-index": {
      post: {
        operationId: "memory_rebuild_index",
        security: [{ RuntimeToken: [] }],
        summary: "Rebuild derived AdaptiveMemoryNode index from learn stamps. OPERATOR / local only.",
        tags: ["memory"],
        requestBody: { required: false, content: { "application/json": { schema: { type: "object" } } } },
        responses: { "200": { description: "Rebuilt index" }, "400": { description: "Not operator" } },
      },
    },
    "/v1/memory/{id}": {
      get: {
        operationId: "memory_get",
        summary: "Read-only AdaptiveMemoryNode explainability.",
        tags: ["memory"],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { "200": { description: "Node JSON" }, "404": { description: "Unknown id" } },
      },
    },
    "/v1/memory/{id}/history": {
      get: {
        operationId: "memory_history",
        summary: "Read-only learn-chain history for one memory.",
        tags: ["memory"],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { "200": { description: "History JSON" } },
      },
    },
    "/v1/memory/{id}/calibration": {
      get: {
        operationId: "memory_calibration",
        summary: "Read-only posterior, triad legs, effective N, Brier.",
        tags: ["memory"],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { "200": { description: "Calibration JSON" } },
      },
    },
    "/v1/mesh/broadcast": {
      post: {
        operationId: "mesh_broadcast",
        summary:
          "Register a SHA-256 hash receipt of a local communique. Never a publish path. Does not accept video bytes. Anon-broadcast is a sibling loopback of local qnm-node/ only.",
        tags: ["mesh"],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["sha256"],
                properties: {
                  sha256: { type: "string", description: "64-char hex SHA-256" },
                  title: { type: "string" },
                },
              },
            },
          },
        },
        responses: { "200": { description: "Local hash receipt" }, "400": { description: "Radios off, bytes refused, publish refused, or bad hash" } },
      },
    },
  };
}
