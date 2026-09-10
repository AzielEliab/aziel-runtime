/**
 * aziel-runtime 1.7.9 — AZCoherence catalog + engine cross_map / peers (domain stays null) + 1.7.8 EmbryoLock true in-process engine (live-with-local-destructive-boundary; worker_home embryolock-download-tracker) + 1.7.7 AZCoherence (AZC-0.1) true in-process FragGate Softwares engine + 1.7.6 4DMap LIVE_OPS synced with product 0.2.0 + 1.7.5 Softwares capability wave 1 (decisiongate / forgereceipts / temporallock / staticclock / chronolock / trajectorylock / spectrallock) + 1.7.4 4DMap inspection-frame capability bump (frame_status/axis_describe/walk_trace/card_export/card_import/verify_chain/neighbor_cite; not an extra door) + 1.7.3 audit WARN copy/hint (exist.mcp → tools/list; public FragGate call; catalog count_note; 4DMap not an extra door) + 1.7.2 GET /v1/azpipe/arch MASTER-33 cite + AKM-TRIAD-1.0 + MASTER-33 (FragGate single door) + locked suite heritage (SUITE-PIPE-1.6.15) + 4DMap (4DM-WP-1.0) + QNM-BUILD-1.0 suite rollup (default OFF; not a login mesh) + live software catalog + client update check + GitHub auto-deploy + FragGate door + UI-op aliases + AZChat name-only stub + AZHub + AZInterface + AZNet + AZBrowser + AZMail + PeaceLock + KV-backed API use trackers.
 *
 * 1.1.0 was catalog+proxy that called itself a runtime. Useful front doors.
 * 1.2.0 owned open → policy → exec → receipt → close but exec still proxied.
 * 1.3.0 ran vendored engines inside this Worker isolate for listed slugs.
 * 1.4.0 vendors a true engine for every catalog Software slug.
 * 1.4.1 adds /v1/ready, HEAD, no-store authority JSON, receipt cap 64, session TTL 6h,
 *       per-IP rate limits, optional RUNTIME_TOKEN on session mutate.
 * 1.5.0 agent-native MCP: display envelopes, flat product-verb tools, runtime_run façade.
 * 1.6.0 FragGate door: hashed registry, thin tools/list, DecisionGATE before exec, ask/refuse ledger.
 *
 * GET  /                      HTML (indexable) + Everblooming sigil
 * GET  /sigil.png             Everblooming sigil stamp
 * GET  /robots.txt            Allow / for Google + major AI bots; sitemap-index + hub sitemaps
 * GET  /sitemap.xml           session, pull, OpenAPI, product cards/health, GitHub
 * GET  /sitemap-index.xml     catalog sitemap + corpus + godlock.uk + live product Worker sitemaps
 * GET  /llms.txt              plain-text catalog + how to cite Aziel Eliab + Digital Library
 * GET  /ai.txt                same as /llms.txt
 * GET  /cite.json             How-to-cite: Aziel Eliab (aka Aziel Elroi Eliab), Apache-2.0, no invented DOIs
 * GET  /v1/skill              skill markdown (session + front doors)
 * GET  /v1/runtime.json       machine manifest: role=engine-runtime (1.7.9), door=fraggate
 * GET  /v1/fraggate           FragGate door summary
 * GET  /v1/fraggate/list      hashed registry
 * GET  /v1/fraggate/describe  one name
 * POST /v1/fraggate/verify    name or digest
 * POST /v1/fraggate/call      CallEnvelope → FragGate → Lamb Lens → SweepGate → Sentinel → Provenance → ChainLock-IN → DecisionGATE → AZPIPE → Internal Domain Layer → RoseClock → TemporalLock → ChainLock-OUT → ForgeReceipts → Return
 * GET  /v1/runtime            alias of /v1/runtime.json
 * GET  /v1/ready              200 if SESSION binding up; 503 if REQUIRE_TOKEN=1 and token missing
 * GET  /v1/health             liveness (version/role match ready); optional uses_total
 * GET  /v1/uses               API use counters + recent log (no increment, no PII)
 * GET  /v1/stats              alias of /v1/uses
 * GET  /v1/mesh               QNM rollup (live/locked/isolated; default OFF; never enables)
 * GET  /v1/qns                QNS-CD-1.0 cite (photon QNS1 1.3; local qnsd; never a proxy)
 * GET  /v1/azpipe/arch        MASTER-33 AZPIPE cite (same pipeline payload as GET /v1/fraggate; not a Softwares door)
 * POST /v1/memory/observe|resolve|calibrate|recall  AKM-TRIAD-1.0 (behind FragGate)
 * GET  /v1/memory/{id}[+history|+calibration]
 * POST /v1/memory/rebuild-index  OPERATOR / local only
 * GET  /v1/mesh/status        alias of /v1/mesh
 * POST /v1/mesh/enable|disable  operator bearer enable / radios off
 * POST /v1/mesh/join|heartbeat|leave
 * GET  /v1/mesh/nodes         rollup roster (no scores)
 * POST /v1/mesh/broadcast     SHA-256 hash receipt only (never a publish path)
 * GET  /v1/bundle             compact bootstrap (skill URL + invoke prefix per product)
 * GET  /v1/pull?all=1         alias of /v1/bundle
 * GET  /v1/pull/{slug}        pull record (skill, download, install, ops, aliases)
 * GET  /v1/pull/{slug}/skill  product skill markdown (proxy/cache)
 * GET  /v1/catalog.json       machine-readable full product list
 * GET  /v1/software           authoritative hub software catalog (Plain→Gate→Lock; EmbryoLock live-with-local-destructive-boundary)
 * GET  /v1/fraggate/software  FragGate-path mirror of /v1/software
 * GET  /v1/update/check       client update check (?slug=&version=)
 * GET  /v1/update/manifest    latest versions for install.sh / local UI / mobile
 * GET  /openapi.json          combined OpenAPI 3.1 (session + /p/{product}/{op} + pull)
 * POST /v1/session/open       create session + genesis receipt
 * POST /v1/session/{id}/policy
 * POST /v1/session/{id}/exec  runtime-owned exec + hash-chained receipt
 * GET  /v1/session/{id}/receipt  /  .../receipts
 * POST /v1/session/{id}/close
 * GET  /p/{product}           indexable product card
 * GET  /p/{product}/{op}      proxy GET (not exec)
 * POST /p/{product}/{op}      proxy → product Worker /v1/{op} (not exec)
 * GET  /v1/health
 * POST /mcp                   JSON-RPC MCP-over-HTTP (initialize, tools/list, tools/call)
 *
 * Product download-KV is not incremented here. API uses go to binding USES.
 * CORS *. Apache-2.0. Forks welcome.
 * Author: Aziel Eliab. Identity is Aziel Eliab only. Do not invent DOIs.
 */
import {
  VERSIONS,
  DOI_BY_SLUG,
  citationFields,
  productHowToCite,
  citeZenodoBlock,
  catalogExtraCards,
  fraggateHubCard,
  FRAGGATE_GITHUB,
  FRAGGATE_WORKER,
  FRAGGATE_WORKER_ORIGIN,
} from "./catalog-meta.js";
import {
  RUNTIME_VERSION,
  RUNTIME_ROLE,
  RUNTIME_LAYER,
  DEFAULT_UA,
  resolveSlug,
  authoritySnapshot,
  VERSION_HISTORY,
  runtimeSkillMarkdown,
  runtimeManifest,
  bundleJson,
  pullRecord,
  fallbackSkillMarkdown,
  fetchProductSkill,
  markdownResponse,
  runtimeStaticPaths,
} from "./runtime-api.js";
import { honestyFields } from "./engines/registry.js";
import { dispatchMemoryHttp } from "./memory.js";
import {
  dispatchMeshHttp,
  isMeshReadPath,
  meshCiteField,
  scheduleSuitePresenceFanout,
  setSuitePresenceCatalog,
} from "./mesh.js";
import { dispatchQnsHttp, qnsHint } from "./qns.js";
import {
  catalogCacheHeaders,
  donationStatic,
  readPackedCatalog,
} from "./packed-catalog.js";
import { RuntimeSession } from "./session-do.js";
import { callSessionTool, handleSessionRequest, sessionMcpTools } from "./session-http.js";
import {
  VERSION_HEADER,
  ROLE_HEADER,
  authorityHeaders,
  evaluateReady,
  noStoreHeaders,
} from "./production.js";
import {
  buildMcpToolList,
  callFraggateTool,
  callRuntimeRun,
  hallucRefuse,
  mcpCallPayload,
  mcpInitializeInstructions,
  registryFor,
  wrapFraggateEnvelope,
} from "./mcp-surface.js";
import { admitCall, describeRegistry, fraggateCall, listRegistry, verifyRegistry } from "./fraggate/door.js";
import { LIVE_OPS, NAMED_STUBS, registryDigest, registrySummary } from "./fraggate/registry.js";
import {
  AUTHOR_ALTERNATE_NAME,
  AUTHOR_GITHUB,
  AUTHOR_NAME,
  LIBRARY_CITE,
  LIBRARY_FRONT_DOOR,
  LIBRARY_LLMS,
  LIBRARY_NAME,
  LIBRARY_ORIGIN,
  azcoherenceCiteField,
  catalogHubFields,
  citeHowToLibrary,
  citeHowToRuntime,
  DESIGNS_GITHUB_TREE,
  describeSitemapUrls,
  DONATE_CANONICAL,
  DONATE_FOOTER_RUNTIME,
  designsCiteField,
  designsLlmsBlock,
  designsLlmsHeaderLine,
  designsSitemapUrls,
  designGithubUrl,
  AUDIT_GITHUB_TREE,
  auditsCiteField,
  auditsLlmsBlock,
  auditsLlmsHeaderLine,
  auditsSitemapUrls,
  auditGithubUrl,
  FEATURE_STATE_AUDIT,
  REMAIN_OFF_BY_DESIGN,
  hubPageSitemapUrls,
  hubsCiteField,
  libraryJsonLd,
  llmsCiteBlock,
  llmsHubsBlock,
  llmsIdentityHeader,
  personJsonLd,
  productCrawlUrls,
  robotsTxt as buildRobotsTxt,
  sitemapIndexXml,
  SUITE_DESIGNS,
} from "./seo.js";
import {
  describeDocsHtml,
  describeIndexHtml,
  describeUnknownHtml,
  prefersHtml,
  softwareCatalogHtml,
} from "./seo-html.js";
import { LOCKED_STRIP, arch as azpipeArch, dispatchAzpipeArchHttp } from "./azpipe.js";
import {
  HOMEPAGE_KEYWORDS,
  citeCompatibleFields,
  crawlerAllowSentence,
  homepageAddUrlHtml,
  llmsCompatibleBlock,
  openApiImportSentence,
  tokenAuthSentence,
} from "./ai-clients.js";
import { finishWithUse, peekUsesTotal, readUses } from "./uses.js";
import {
  SOFTWARE_FRAMING,
  listSoftwareEntries,
  softwareCatalog,
  updateCheck,
  updateManifest,
} from "./software-catalog.js";
import { crossMapFields } from "./cross-map.js";

export { RuntimeSession };

const CATALOG_HOST = "https://aziel-runtime.vibelock.workers.dev";
const PROTOCOL = "2025-03-26";
const CATALOG_TITLE = "Aziel Eliab Runtime";
const CATALOG_DESCRIPTION =
  "Aziel Eliab software catalog and engine-runtime: 37 products including EmbryoLock (live-with-local-destructive-boundary), AZCoherence (AZC-0.1), 4DMap (4DM-WP-1.0), AZHub (AIH-WP-1.0), AZInterface (AIH-WP-1.0), AZNet (AZN-WP-0.1), AZBrowser (AZB-1.0), AZMail (APP 1.0), PeaceLock (PL-WP-0.1) and the Aziel Digital Library (www.azielcorpuslibrary.net). 1.7.10 makes QNM Live Nodes durable (suite-presence is operator-enabled; GET /v1/mesh never enables; cron or request-path fans out live Softwares product Workers while enabled; TTL 5 min). 1.7.9 cross-maps AZCoherence (peers azclce / AZInterface / AKM-TRIAD fabric neighbor; hubs + Worker URL; domain stays null). 1.7.8 lands EmbryoLock as a true in-process engine (wipe/unlock stay FG-STUB on the public mesh; worker_home embryolock-download-tracker). 1.7.7 lands AZCoherence as a true in-process FragGate Softwares engine (second-pass triad coherence; cite https://github.com/AzielEliab/AZCoherence; not AKM-TRIAD). 1.7.6 syncs 4DMap LIVE_OPS with product 0.2.0 (pin/span/stack/gap/fork/walk/lens/class/cohort/absence/cap/join/list/example plus frame_status/axis_describe/walk_trace/card_export/card_import/verify_chain/neighbor_cite; inspection frame, not an extra door). 1.7.5 is Softwares capability wave 1 (decisiongate / forgereceipts / temporallock / staticclock / chronolock / trajectorylock / spectrallock; docs/audit/SUITE-CAPABILITY-CHECKLIST.md). 1.7.4 enhances 4DMap LIVE_OPS (frame_status/axis_describe/walk_trace/card_export/card_import/verify_chain/neighbor_cite; inspection frame, not an extra door). 1.7.3 aligns audit WARN copy (exist.mcp → tools/list; public FragGate call; catalog count_note; 4DMap not an extra door). 1.7.2 adds GET /v1/azpipe/arch (MASTER-33 cite/read; same FragGate pipeline payload; not a Softwares door). 1.7.1 adds AKM-TRIAD-1.0 (adaptive recollection, Bayesian calibration, 3-of-4 triad; not Softwares-tab; behind FragGate). 1.7.0 locks MASTER-33 (FragGate single door; Lamb Lens after FragGate; RoseClock forward-only; 11 domains / 33 softwares). 1.6.15 locked the suite hop order (SUITE-PIPE-1.6.15). LambGate is not a hop. 1.6.14 adds 4DMap as a four-axis inspection frame (not a sequential gate; not an extra door). 1.6.13 aligns the suite QNM rollup (QNM-BUILD-1.0, companion to AIH-WP-1.1; GET /v1/mesh live/locked/isolated; operator bearer enable; default radios off; not a login mesh; not AnonBroadcast as a Softwares-tab product; full node process is local qnm-node/). Packet-transfer coding design is QNS-CD-1.0 (photon QNS1 1.3 on local qnsd; GET /v1/qns cites only). 1.6.12 adds GET /v1/software (hub Software-tab catalog; Plain→Gate→Lock + EmbryoLock stub) and GET /v1/update/check for install.sh / local UIs / mobile. 1.6.11 adds a durable FragGate UI-op alias map (Worker button names resolve to catalog ops) and names EmbryoLock as stub / local-not-hosted (not a FragGate engine). 1.6.8 adds AZHub and AZInterface as two separate softwares under the same FragGate door (Blank Key + custodial page cycles; never one combined product; not nested in AZBrowser, AZNet, or each other). 1.6.9 frames them as sibling products on that same door. 1.6.10 sets AZBrowser and AZNet catalog one_line to separate software (not engine). 1.6.7 adds AZNet as a separate FragGate-live product (own Worker aznet-download-tracker, own UI; silent verification side-net; hash garden + memorial; never hosts payloads; AZBrowser pair_token + pair_flag required for garden/stamp/memorial — functional order only, do not merge UIs). 1.6.6 adds AZBrowser as a FragGate-live engine (Lamb Lens ethical search + advisory navigate; cite; refuse harmful harvest; never invent visit results; not Chromium; tor_exit/phoenix_wipe stub). MCP fraggate_list / fraggate_call and Worker UI buttons share that same LIVE_OPS.azbrowser backend. 1.6.5 adds AZMail as a FragGate-live engine (anonymous MCP mesh default off + advisory airlock; not a full internet MTA; SMTP/deanonymize stub). 1.6.4 adds PeaceLock as a true in-process engine (chosen silence / chosen inaction receipts; HARD_DUTY refuse; ABSENT transcript/counterfactual/motive). 1.6.3 adds KV-backed API use trackers (GET /v1/uses) across origin and same-origin /runtime doors. 1.6.2 widens the public FragGate door to sensible advisory engines; stub verbs still refuse. 1.6.1 lists every major OpenAPI/MCP/HTTP client — ChatGPT, Grok, Venice, Claude, Cursor, Glama, Perplexity, Copilot, Gemini, Mistral, Meta AI, Apple Intelligence, Amazon Q, DuckAssist, You.com, Cohere, plus other MCP/OpenAPI-capable assistants. 1.6.0 FragGate door — discover, route, refuse. Hashed registry, thin MCP, DecisionGATE before exec. 1.5.0 was agent-native flat product tools. Proxy is not exec. Dual surface: agent chat has no technical UI chrome; Worker / Flutter / local install / counted download stay complete human software. Apache-2.0. Author: Aziel Eliab (also known as Aziel Elroi Eliab). Open crawl Allow: / for GPTBot/ChatGPT, Venice, Grok, Google-Extended, GoogleOther, Google-CloudVertexBot, Claude(+Search/User), anthropic-ai, Perplexity(+User), bingbot, Meta-External*, Applebot(+Extended), Amazonbot, DuckDuck/DuckAssist, MistralAI-User, YouBot, CCBot, cohere-ai, Diffbot, AI2Bot(+Dolma), and the rest of robots.txt."
const LASTMOD = "2026-09-10";

const PRODUCTS_RAW = [
  {
    slug: "vibelock",
    name: "VibeLock",
    worker: "vibelock-download-tracker",
    github: "https://github.com/AzielEliab/vibelock",
    ops: [{ op: "analyze", method: "POST", summary: "Audio forensic risk assessment (JSON metrics)." }],
    example: { summary: "synthetic dual-channel notes; local WAV scoring is in the Python package" },
    banner: null,
  },
  {
    slug: "veillock",
    name: "VeilLock",
    worker: "veillock-download-tracker",
    github: "https://github.com/AzielEliab/veillock",
    ops: [{ op: "apps", method: "POST", summary: "Local-app steps. YOUR camera/screen only." }],
    example: { app: "zoom" },
    banner: "VeilLock does not inject into FaceTime, Zoom, Meet, Teams, or Skype. YOUR camera/screen only. Not a call interceptor.",
  },
  {
    slug: "codelock",
    name: "CodeLock",
    worker: "codelock-download-tracker",
    github: "https://github.com/AzielEliab/codelock",
    ops: [{ op: "render", method: "POST", summary: "Canonical or CodeLock/Rosetta HTML view of source." }],
    example: { source: "print('hello')", mode: "normalize" },
    banner: "This tool alters perception, not meaning.",
  },
  {
    slug: "godlock",
    name: "GodLock",
    worker: "godlock-download-tracker",
    github: "https://github.com/AzielEliab/godlock",
    ops: [
      { op: "score", method: "POST", summary: "Offline ABAD / hardening score for a text." },
      { op: "submit", method: "POST", summary: "Submit text; returns a receipt id (no VPN)." },
    ],
    example: { text: "ABAD does not layer on phi." },
    banner: "GodLock is not a VPN and not an anonymity network.",
  },
  {
    slug: "shadowlock",
    name: "ShadowLock",
    worker: "shadowlock-download-tracker",
    github: "https://github.com/AzielEliab/shadowlock",
    ops: [{ op: "observe", method: "POST", summary: "Zero-retention observation of a job list you already have." }],
    example: { jobs: [{ id: "a", status: "ok" }] },
    banner: "ShadowLock is a gate on an outcome you already have. No OS hook. No process intercept.",
  },
  {
    slug: "temporallock",
    name: "TemporalLock",
    worker: "temporallock-download-tracker",
    github: "https://github.com/AzielEliab/temporallock",
    ops: [
      { op: "genesis", method: "POST", summary: "First receipt of a chain (explicit genesis)." },
      { op: "append", method: "POST", summary: "Append a receipt to an existing chain payload." },
      { op: "verify", method: "POST", summary: "Recompute hashes. Anyone can verify." },
      { op: "timeslate", method: "POST", summary: "Bind or append a StaticClock timeslate on a client-held chain." },
      { op: "gate", method: "POST", summary: "Accept a payload hash onto the timeslate lattice." },
      { op: "import_export", method: "POST", summary: "Export or import a client-held chain JSON. Hosted does not store." },
      { op: "doctor", method: "GET", summary: "Richer liveness: ops, refuse list, neighbors. Does not increment download KV." },
    ],
    example: { summary: "sky was overcast", evidence: "photo:./sky.jpg", confidence: 0.9 },
    banner: null,
  },
  {
    slug: "forgereceipts",
    name: "ForgeReceipts",
    worker: "forgereceipts-download-tracker",
    github: "https://github.com/AzielEliab/forgereceipts",
    ops: [
      { op: "receipt", method: "POST", summary: "Mint a local receipt. No court connection. Hosted never stores files." },
      { op: "verify", method: "POST", summary: "Recompute a posted receipt hash. Not legal advice." },
      { op: "import_export", method: "POST", summary: "Export or import client-held receipt JSON. Hosted never stores files." },
      { op: "doctor", method: "GET", summary: "Richer liveness: receipt mint + refuse list. Does not increment download KV." },
    ],
    example: { summary: "filed locally", evidence: "sha256:…" },
    banner: "ForgeReceipts 0.3.0: Local receipt / checklist helper with jurisdiction-aware state picker (all 50 states + federal baseline) customizing UI/legal framing. Not legal advice. Does not contact courts. Author Aziel Eliab.",
  },
  {
    slug: "decisiongate",
    name: "DecisionGATE",
    worker: "decisiongate-download-tracker",
    github: "https://github.com/AzielEliab/decisiongate",
    ops: [
      { op: "check", method: "POST", summary: "Run the five sequential gates on a proposal." },
      { op: "evaluate", method: "POST", summary: "Alias of check. Same five-gate lineage." },
      { op: "gates", method: "GET", summary: "List the five sequential gates (Definition → Responsibility)." },
      { op: "verify", method: "POST", summary: "Verify a posted lineage against GATE_ORDER. wrap is not hosted." },
      { op: "doctor", method: "GET", summary: "Richer liveness: gate order, wrap unhosted. Does not increment download KV." },
    ],
    example: {
      statement: "Release the catalog Worker this week.",
      evidence: ["OpenAPI 3.1 combined spec."],
      impact_pos: ["One URL for GPT Actions."],
      impact_neg: ["A vague draft takes longer."],
      values: ["Clarity without force"],
      accountable: "Aziel Eliab",
    },
    banner: "Freedom without clarity is chaos.",
  },
  {
    slug: "zsolver",
    name: "ZionPattern Solver",
    worker: "zsolver-download-tracker",
    github: "https://github.com/AzielEliab/zion-pattern-solver",
    ops: [
      { op: "patterns", method: "GET", summary: "Nine ontology nodes (Zioncheck seed). Not a verdict." },
      { op: "score", method: "POST", summary: "Score answers. Hard 75% cap, 25% floor." },
      { op: "session", method: "POST", summary: "Stateless session snapshot from answers." },
    ],
    example: { answers: [{ pattern_id: "P1", value: "yes" }, { pattern_id: "P2", value: "unknown" }] },
    banner: "Hard 75% confidence cap / 25% uncertainty floor. Provisional and assistive. Does not solve Zioncheck or any case.",
  },
  {
    slug: "azos",
    name: "AZ-OS",
    worker: "azos-download-tracker",
    github: "https://github.com/AzielEliab/azos",
    ops: [{ op: "status", method: "POST", summary: "Read-only status / principles. No remote exec." }],
    example: {},
    banner: "AZ-OS does not grant remote shell. Invite prints principles; exec requires a local token.",
  },
  {
    slug: "glossafilter",
    name: "Glossa Filter",
    worker: "glossafilter-download-tracker",
    github: "https://github.com/AzielEliab/glossafilter",
    ops: [{ op: "render", method: "POST", summary: "Render an intent across bundled peer ids." }],
    example: { subject: "package", rel: "release", object: "filter", channel: "tooling" },
    banner: "Human opinion remains human, and tools remain tools.",
  },
  {
    slug: "miragegrid",
    name: "MirageGrid",
    worker: "miragegrid-download-tracker",
    github: "https://github.com/AzielEliab/miragegrid",
    ops: [{ op: "assign", method: "POST", summary: "Assign a session node id. Mapping is ephemeral." }],
    example: {},
    banner: "MirageGrid is not a VPN and not an anonymity network. It does not guarantee anonymity against global surveillance.",
  },
  {
    slug: "staticclock",
    name: "StaticClock",
    worker: "staticclock-download-tracker",
    github: "https://github.com/AzielEliab/staticclock",
    ops: [
      { op: "advise", method: "POST", summary: "Five advisory fields for a geo. Not a scheduler." },
      { op: "advisory", method: "POST", summary: "Alias of advise. Companion advisory only." },
      { op: "anchors", method: "GET", summary: "List Top-30 geographic anchors." },
      { op: "click", method: "POST", summary: "Append a forward-only gear click to a client-held chain." },
      { op: "verify", method: "POST", summary: "Recompute gear-click hashes. Time only locks forward." },
      { op: "timeslate", method: "POST", summary: "Bind a click into a TemporalLock timeslate payload." },
      { op: "import_export", method: "POST", summary: "Export or import a client-held click chain. Hosted does not store." },
      { op: "doctor", method: "GET", summary: "Richer liveness: forward-only clicks. Does not increment download KV." },
    ],
    example: { geo: "Indiana" },
    banner: "StaticClock is not a scheduler and not a clock you set. Advisory fields only.",
  },
  {
    slug: "chronolock",
    name: "ChronoLock",
    worker: "chronolock-download-tracker",
    github: "https://github.com/AzielEliab/chronolock",
    ops: [
      { op: "advisory", method: "POST", summary: "One advisory for a last-known geo. Not a scheduler." },
      { op: "advise", method: "POST", summary: "Alias of advisory. Distinct from TemporalLock." },
      { op: "anchors", method: "GET", summary: "List Top-30 geographic anchors." },
      { op: "window", method: "POST", summary: "Report the Temporal Neutral Window for a geo. Not a cron." },
      { op: "doctor", method: "GET", summary: "Richer liveness: advisory window only. Does not increment download KV." },
    ],
    example: { geo: "Indiana" },
    banner: "ChronoLock is advisory only — not a scheduler, not targeting, not virality. Temporal Neutral Window 08:30–10:30 local. Distinct from TemporalLock.",
  },
  {
    slug: "postking",
    name: "Post-King Chess",
    worker: "postking-download-tracker",
    github: "https://github.com/AzielEliab/postking-chess",
    ops: [
      { op: "new", method: "POST", summary: "Start a game {difficulty, seed}." },
      { op: "move", method: "POST", summary: "Human UCI move + AI 1-ply continuity reply." },
      { op: "status", method: "POST", summary: "Continuity status for a FEN/state." },
    ],
    example: { difficulty: "steward", seed: 1 },
    banner: "The goal is not to win. The goal is to remain. Human is king-bound; AI has a Node, not a king.",
  },
  {
    slug: "azclce",
    name: "AZ-CLCE",
    worker: "azclce-download-tracker",
    github: "https://github.com/AzielEliab/az-clce",
    ops: [
      { op: "score", method: "POST", summary: "Jaccard triple / pairwise / CLCE+." },
      { op: "classify", method: "POST", summary: "Mismatch types. Type D is a label only." },
      { op: "gate", method: "POST", summary: "Pass iff triple ≥ min (default 0.7). Advisory." },
    ],
    example: { r: "login button blue", d: "login form submits", p: "login button submits" },
    banner: "CLCE detects inconsistency, not intent. Type D is a label, not a finding of malice. Threshold 0.7 is advisory. AZCoherence (AZC-0.1) is a separate peer product (second-pass coherence). Not a replacement.",
  },
  {
    slug: "ark",
    name: "The ARK",
    worker: "ark-download-tracker",
    github: "https://github.com/AzielEliab/ark",
    ops: [
      { op: "sweep", method: "POST", summary: "Mode E heuristics only (PE/ELF/Mach-O, powershell -enc, curl|sh). No clamscan. Payload is not stored." },
      { op: "levels", method: "GET", summary: "Auto-lock seconds and decoy counts. Behavior, not cryptography." },
    ],
    example: { text: "hello world" },
    banner: "The ARK is not a kernel. Hosted API never unlocks or encrypts with a passphrase and never stores vaults. Sweep is Mode E heuristics only.",
  },
  {
    slug: "azai",
    name: "AZAI",
    worker: "azai-download-tracker",
    github: "https://github.com/AzielEliab/azai",
    ops: [
      { op: "health", method: "GET", summary: "Liveness. Protocol mirror. Not a provider proxy." },
      { op: "lamb-check", method: "POST", summary: "Run Lamb Lens (peace/clarity/service) on {text}. No provider call." },
      { op: "lamb_check", method: "POST", summary: "Alias of lamb-check for MCP azai_lamb_check." },
    ],
    example: { text: "hello" },
    banner: "AZAI is a local OpenAI-compatible runtime, not a new foundation model. Hosted /v1 is a protocol mirror + Lamb check, NOT a proxy that spends the author's paid keys. Jeeves is not sovereign. Live blend is local azai serve.",
  },
  {
    slug: "spectrallock",
    name: "SpectralLock",
    worker: "spectrallock-download-tracker",
    github: "https://github.com/AzielEliab/spectrallock",
    ops: [
      { op: "health", method: "GET", summary: "Liveness. Does not increment download KV." },
      { op: "modes", method: "GET", summary: "List live overlay modes (zero, tazel, vyrn, uv, rosetta, zen, chaos, balance)." },
      { op: "targets", method: "GET", summary: "List ink/page targets. Same targets as Aziel Corpus Library OCR." },
      { op: "overlay", method: "POST", summary: "Simplified overlay preview. PNG b64 in, longest side capped at 256 px. Not the full Python pipeline." },
      { op: "verify", method: "POST", summary: "Recompute overlay metadata hash (mode/target/geometry). Not forensic." },
      { op: "doctor", method: "GET", summary: "Richer liveness: 256px preview, not a spectrometer." },
    ],
    example: { mode: "rosetta", b64: "<png-base64>" },
    banner: "Hosted overlay is a 256px preview, not a spectrometer, not forensic.",
  },
  {
    slug: "azbot",
    name: "AZBot",
    worker: "azbot-download-tracker",
    github: "https://github.com/AzielEliab/azbot",
    ops: [
      { op: "health", method: "GET", summary: "Liveness. Skill, not a model." },
      { op: "skill", method: "GET", summary: "Return AZBot skill markdown. Does not increment download KV." },
      { op: "route", method: "POST", summary: "Route a request onto a catalog slug/op. Skill, not a model." },
    ],
    example: {},
    banner: "AZBot is a skill, not a foundation model. Hosted /v1/skill returns markdown. Call aziel-runtime for the engines. Jeeves is not sovereign.",
  },
  {
    slug: "employeelock",
    name: "EmployeeLock",
    worker: "employeelock-download-tracker",
    github: "https://github.com/AzielEliab/employeelock",
    ops: [
      { op: "health", method: "GET", summary: "Liveness. Does not increment download KV. Hosted never stores xlsx." },
      { op: "append-preview", method: "POST", summary: "Hash a proposed LOG row without writing a file. Hosted never stores xlsx." },
      { op: "verify-canonical", method: "POST", summary: "Recompute SHA-256 of posted canonical JSON. Not a truth score." },
      { op: "skill", method: "GET", summary: "Return EmployeeLock skill markdown. Does not increment download KV." },
    ],
    example: { event: "process outcome recorded with no named owner", result: "row logged as format proof", owner_named: "", confidence: 0.7 },
    banner: "EmployeeLock is a hash-chained accountability workbook. Not a court, not UL, not a truth score. Hosted never stores xlsx. Demo rows are format proof, not case facts.",
  },
  {
    slug: "foldlock",
    name: "FoldLock",
    worker: "foldlock-download-tracker",
    github: "https://github.com/AzielEliab/foldlock",
    ops: [
      { op: "health", method: "GET", summary: "Liveness. Does not increment download KV. Not zip." },
      { op: "fold-preview", method: "POST", summary: "Small UTF-8 text in, receipt + FLD3 base64 out. Cap ~8KB. Not zip." },
      { op: "unfold-preview", method: "POST", summary: "FLD3 base64 in, verified restore or error. Not zip." },
      { op: "skill", method: "GET", summary: "Return FoldLock skill markdown. Does not increment download KV." },
    ],
    example: { text: "the cat and the dog" },
    banner: "FoldLock is algorithmic tether-word suppression on UTF-8 text. Not zip. Hosted preview is not a general compressor. Ratios are receipts, not trophies. Short strings can grow.",
  },
  {
    slug: "whistlelock",
    name: "WhistleLock",
    worker: "whistlelock-download-tracker",
    github: "https://github.com/AzielEliab/whistlelock",
    ops: [
      { op: "health", method: "GET", summary: "Liveness. Does not increment download KV. Hosted never holds whistle files." },
      { op: "hash-preview", method: "POST", summary: "SHA-256 of posted bytes. Not stored. Hosted never holds whistle files." },
      { op: "canon-preview", method: "POST", summary: "Hash a proposed ledger row. Not stored. Not a mailer." },
      { op: "skill", method: "GET", summary: "Return WhistleLock skill markdown. Does not increment download KV." },
    ],
    example: { summary: "sample drop", kind: "drop" },
    banner: "WhistleLock is a local drop ledger + dead-man copy. Not a mailer. Hosted never holds whistle files. The operator moves released packets.",
  },
  {
    slug: "trajectorylock",
    name: "TrajectoryLock",
    worker: "trajectorylock-download-tracker",
    github: "https://github.com/AzielEliab/trajectorylock",
    ops: [
      { op: "health", method: "GET", summary: "Liveness. Does not increment download KV. Hosted never stores media. Not a certified instrument." },
      { op: "example", method: "GET", summary: "Synthetic small JSON case. Not a real case. Does not increment download KV." },
      { op: "analyze", method: "POST", summary: "Small JSON case in, geometric result out. Cap size. NEVER store media. Not a certified forensic instrument." },
      { op: "verify", method: "POST", summary: "Recompute result_sha256. Not a certified instrument." },
      { op: "schema", method: "GET", summary: "List required fields and observation types. Small JSON only." },
      { op: "import_export", method: "POST", summary: "Export or import a small JSON case. NEVER store media." },
      { op: "doctor", method: "GET", summary: "Richer liveness: geometry only, no media store." },
      { op: "skill", method: "GET", summary: "Return TrajectoryLock skill markdown. Does not increment download KV." },
    ],
    example: {
      case_id: "MINIMAL-DIRECT-LINE",
      sources: [{ id: "survey-a", quality: 0.95, calibrated: true, independence_group: "survey-a" }],
      observations: [{ type: "direct_line", source_id: "survey-a", point: [0, 0, 1.2], direction: [1, 0.1, 0.02], angular_sigma_deg: 0.5, offset_sigma_m: 0.02 }],
      official_hypothesis: { point: [0.01, 0.01, 1.19], direction: [1, 0.11, 0.02], angular_sigma_deg: 0.7, offset_sigma_m: 0.04, angle_tolerance_deg: 3.0, offset_tolerance_m: 0.25 },
    },
    banner: "TrajectoryLock is a research prototype / auditable geometric test. Not a certified forensic instrument. Hosted never stores media. Match probability is P(match | declared model), not P(official account is true). Synthetic example results must never be represented as real-case findings.",
  },
  {
    slug: "mialock",
    name: "M.I.A.Lock",
    worker: "mialock-download-tracker",
    github: "https://github.com/AzielEliab/mialock",
    ops: [
      { op: "skill", method: "GET", summary: "Return M.I.A.Lock skill markdown. Does not increment download KV. Live Leaflet map is local CLI." },
      { op: "map", method: "GET", summary: "Sample casebook index stub. Live Leaflet map is local CLI mialock map. Not live tracking." },
      { op: "search-options", method: "GET", summary: "List archive / Doe / cold-case search modes. Search plans only." },
      { op: "queries", method: "POST", summary: "Render query families for a search mode. Search plans only. Doe leads ≠ ID." },
      { op: "doe-match", method: "POST", summary: "Rank Doe / unidentified notices vs a named-subject descriptor. Compatibility leads only. Never an ID." },
      { op: "coverage", method: "GET", summary: "Adapter coverage report + heat cells. Heat = search intensity / negative evidence — not presence." },
      { op: "example", method: "GET", summary: "Sample search / map payload shapes. Does not increment download KV." },
    ],
    example: { mode: "doe_cold", name: "Christina Green", jurisdiction: "Illinois", age_band: "20-30", sex: "female" },
    banner:
      "M.I.A.Lock 0.1.1: per-person event map, archive/Doe cold-case search, Doe descriptor matching, uncertainty ellipses, coverage heat. Purpose-bound missing-person / authorized investigative use. Doe hits are compatibility leads only — never auto-ID. Coverage heat ≠ presence. No live tracking. Author Aziel Eliab.",
  },
  {
    slug: "azieltether",
    name: "AzielTether",
    worker: "azieltether-download-tracker",
    github: "https://github.com/AzielEliab/azieltether",
    ops: [
      { op: "health", method: "GET", summary: "Liveness when the counted Worker is live. Does not increment download KV." },
      { op: "skill", method: "GET", summary: "Return AzielTether skill markdown when hosted. Does not increment download KV." },
      { op: "verify", method: "POST", summary: "Verify a hash-chain of downloaded package receipts. Not a VPN." },
    ],
    example: {},
    banner:
      "AzielTether 0.1.0: central × decentral survival mesh for downloaded Aziel Eliab software. Prefer central Worker when up; peer hash-chain sync when down; reconcile on restore. Public HTTPS boards stay mesh-free. Not a VPN. Counted Worker live. Author Aziel Eliab.",
  },
  {
    slug: "peacelock",
    name: "PeaceLock",
    worker: "peacelock-download-tracker",
    github: "https://github.com/AzielEliab/peacelock",
    ops: [
      { op: "open", method: "POST", summary: "Open a PeaceLock lattice. HARD_DUTY refuses. Transcript / counterfactual / motive stay ABSENT." },
      { op: "seal", method: "POST", summary: "Seal chosen silence or chosen inaction onto the lattice. HARD_DUTY refuses. Does not invent a transcript." },
      { op: "break", method: "POST", summary: "End a sealed silence / inaction period. Still no transcript." },
      { op: "show", method: "POST", summary: "Show the lattice without inventing ABSENT fields." },
      { op: "verify", method: "POST", summary: "Verify hash-chain + ABSENT + HARD_DUTY invariants." },
      { op: "stamp", method: "POST", summary: "Timestamped file-hash envelope. Hashes bytes only. Does not store files." },
      { op: "upload_envelope", method: "POST", summary: "Same as stamp: timestamped file-hash envelope. Not a file store." },
      { op: "doctor", method: "POST", summary: "UI alias of health. Same FragGate backend as the Worker UI button." },
    ],
    example: { scope: "silence", subject: "chamber-1" },
    banner:
      "PeaceLock (PL-WP-0.1) records chosen silence or chosen inaction as a hash-chained receipt. Transcript, counterfactual, and motive are ABSENT. HARD_DUTY refuses a silence/inaction receipt. Not a transcript, not a court, not TemporalLock. Author Aziel Eliab.",
  },
  {
    slug: "azmail",
    name: "AZMail",
    worker: "azmail-download-tracker",
    github: "https://github.com/AzielEliab/azmail",
    ops: [
      { op: "airlock_classify", method: "POST", summary: "Classify text with the APP 1.0 airlock. Advisory only. Not an MTA." },
      { op: "scrub", method: "POST", summary: "Scrub emails, secrets, PANs, and phones from text. Advisory only." },
      { op: "trust_score", method: "POST", summary: "Advisory trust score (hard 0.75 cap). Not identity." },
      { op: "mesh_post", method: "POST", summary: "Post to the anonymous MCP mesh. Refuses when mesh is off (default). Strips identity keys." },
      { op: "mesh_poll", method: "POST", summary: "Poll the anonymous MCP mesh ring. Alias of listen." },
      { op: "mesh_listen", method: "POST", summary: "Listen on the anonymous MCP mesh ring. Alias of poll." },
      { op: "mesh_enable", method: "POST", summary: "Turn the mesh on. Rate-limited. Mesh default is off." },
      { op: "mesh_disable", method: "POST", summary: "Chaos switch: always allowed. Turns the mesh off." },
      { op: "keyword_alert_set", method: "POST", summary: "Set fine-tuned keyword alerts for the anonymous ring." },
      { op: "keyword_alert_list", method: "POST", summary: "List keyword alerts." },
      { op: "keyword_alert_check", method: "POST", summary: "Check text against keyword alerts without posting." },
      { op: "classify", method: "POST", summary: "UI alias of airlock_classify. Same FragGate backend as the Worker UI button." },
    ],
    example: { text: "hello from the anonymous ring" },
    banner:
      "AZMail (APP 1.0): anonymous MCP mesh + advisory airlock. Reached only via FragGate (POST /v1/fraggate/call { slug: \"azmail\", op }). Not a full internet MTA. Mesh default off. Independent of AZ-OS / Lumen. SMTP / deanonymize / harvest stay stub. Author Aziel Eliab.",
  },
  {
    slug: "azbrowser",
    name: "AZBrowser",
    worker: "azbrowser-download-tracker",
    github: "https://github.com/AzielEliab/azbrowser",
    ops: [
      { op: "ethical_search", method: "POST", summary: "Lamb Lens ethical search. Cite. Refuse harmful harvest. Never invent visit results." },
      { op: "lamb_lens_search", method: "POST", summary: "Alias of ethical_search. Same FragGate backend as the Worker UI button." },
      { op: "navigate", method: "POST", summary: "Sandboxed advisory fetch/metadata. No raw HTML. No Chromium exec." },
      { op: "airlock_ingest", method: "POST", summary: "Classify a URL or text before ingest. Refuses malware / harvest payloads." },
      { op: "tab_open", method: "POST", summary: "Open a session tab (in-memory or KV). Title is host metadata, not a claimed visit." },
      { op: "tab_list", method: "POST", summary: "List session tabs." },
      { op: "receipt_list", method: "POST", summary: "List hash-chained AZBrowser receipts." },
      { op: "verify", method: "POST", summary: "Verify an AZBrowser receipt hash." },
      { op: "receipt_verify", method: "POST", summary: "Alias of verify." },
      { op: "airlock", method: "POST", summary: "UI alias of airlock_ingest. Same FragGate backend as the Worker UI button." },
      { op: "home", method: "POST", summary: "UI alias of health. Same FragGate backend as the Worker UI button." },
    ],
    example: { q: "ethical web principles" },
    banner:
      "AZBrowser (AZB-1.0): Lamb Lens ethical research browser. Reached only via FragGate (POST /v1/fraggate/call { slug: \"azbrowser\", op }). Cite; refuse harmful harvest; never invent visit results. Not Chromium. tor_exit / phoenix_wipe / unrestricted proxy stay stub. AZNet is separate software (same FragGate door) — pairing is order/token only, not a shared Phase-1 UI. Author Aziel Eliab.",
  },
  {
    slug: "aznet",
    name: "AZNet",
    worker: "aznet-download-tracker",
    github: "https://github.com/AzielEliab/aznet",
    ops: [
      { op: "pair_status", method: "POST", summary: "Report AZBrowser pairing token + flag. Both required for garden / mesh ops." },
      { op: "garden_list", method: "POST", summary: "List the custodian garden of hash refs. Refuses without AZBrowser pair. Never hosts payloads." },
      { op: "stamp", method: "POST", summary: "Stamp a hash ref into the garden. Hashes then discards bytes. Never hosts payloads." },
      { op: "verify_hash", method: "POST", summary: "Verify a garden hash ref. Integrity mismatch isolates. Never hosts payloads." },
      { op: "memorial_list", method: "POST", summary: "List the memorial ledger. Terminal / append-only. Requires AZBrowser pair." },
      { op: "memorial_append", method: "POST", summary: "Append a terminal memorial for a garden hash. No rewrite. Requires AZBrowser pair." },
      { op: "receipt_verify", method: "POST", summary: "Verify TemporalLock-style receipt + StaticClock timeslate fields." },
      { op: "doctor", method: "POST", summary: "UI alias of health. Same FragGate backend as the Worker UI button." },
      { op: "pair", method: "POST", summary: "UI alias of pair_status. Reports pairing; does not invent unlock." },
    ],
    example: { pair_token: "aznet-azbrowser-pair", pair_flag: "azbrowser", hash: "0".repeat(64) },
    banner:
      "AZNet (AZN-WP-0.1): silent verification side-net. Hash continuity without hosting. Custodian garden of hash refs + memorial ledger. Integrity refuse/isolate. Separate software from AZBrowser (same FragGate door; functional-order pair: token AND flag required; own Worker / own UI). FragGate LIVE only. Never hosts payloads. Author Aziel Eliab.",
  },
  {
    slug: "azhub",
    name: "AZHub",
    worker: "azhub-download-tracker",
    github: "https://github.com/AzielEliab/azhub",
    ops: [
      { op: "region_list", method: "POST", summary: "List Blank Key regions. Hub does not interpret meaning." },
      { op: "place_module", method: "POST", summary: "Place a module in a region without interpretation." },
      { op: "remove_module", method: "POST", summary: "Remove a placed module. Does not interpret." },
      { op: "tether_declare", method: "POST", summary: "Declare a tether between modules. Link only, not meaning." },
      { op: "tether_cut", method: "POST", summary: "Cut a declared tether." },
      { op: "tether_list", method: "POST", summary: "List declared tethers." },
      { op: "blank_key_status", method: "POST", summary: "Blank Key status. Interprets nothing. Auto-unlock / completeness stay refused." },
      { op: "list_modules", method: "POST", summary: "UI alias of region_list. Same FragGate backend as the Worker UI button." },
      { op: "place", method: "POST", summary: "UI alias of place_module. Same FragGate backend as the Worker UI button." },
    ],
    example: { region: "core", module_id: "foldlock" },
    banner:
      "AZHub (AIH-WP-1.0): neutral spatial container / Blank Key. Reached only via FragGate (POST /v1/fraggate/call { slug: \"azhub\", op }). Does not interpret meaning. Refuses auto-unlock and completeness events. AZInterface is sibling software under the same FragGate door. scorch_remote / ranking stay stub. Author Aziel Eliab.",
  },
  {
    slug: "azinterface",
    name: "AZInterface",
    worker: "azinterface-download-tracker",
    github: "https://github.com/AzielEliab/azinterface",
    ops: [
      { op: "genesis_status", method: "POST", summary: "Genesis seal + pre-locked page cycles." },
      { op: "site_state_get", method: "POST", summary: "Read custodial site state." },
      { op: "site_state_set", method: "POST", summary: "Advance one pre-locked page cycle. Skip / auto-unlock refuse." },
      { op: "integrity_check", method: "POST", summary: "Record integrity. Does not auto-unlock to ON." },
      { op: "witness_list", method: "POST", summary: "List custodial witnesses. Not a ranking." },
      { op: "page_cycle_status", method: "POST", summary: "Pre-locked cycles: OFF / integrity / ON / FULL SHUTDOWN / MEMORIAL." },
      { op: "genesis_boot", method: "POST", summary: "UI alias of genesis_status. Genesis is already sealed; no invented boot." },
      { op: "hold", method: "POST", summary: "UI alias of page_cycle_status. Reports the current pre-locked cycle." },
    ],
    example: { cycle: "OFF" },
    banner:
      "AZInterface (AIH-WP-1.0): custodial operating environment. Reached only via FragGate (POST /v1/fraggate/call { slug: \"azinterface\", op }). Page cycles are pre-locked (OFF / integrity / ON / FULL SHUTDOWN / MEMORIAL). AZHub is sibling software under the same FragGate door. scorch_remote / auto_unlock / ranking / completeness_detect stay stub. Author Aziel Eliab.",
  },
  {
    slug: "aziel-corpus",
    name: "Aziel Digital Library",
    worker: "aziel-corpus-download-tracker",
    github: "https://github.com/AzielEliab/aziel-corpus",
    ops: [
      { op: "health", method: "GET", summary: "Liveness. Does not increment download KV. Public MASTER." },
      { op: "search", method: "GET", summary: "Search published corpus records. Anonymous GET." },
      { op: "example", method: "GET", summary: "Sample search payload. Does not increment download KV." },
      { op: "skill", method: "GET", summary: "Return Aziel Digital Library skill markdown. Does not increment download KV." },
    ],
    example: { q: "Florence" },
    banner: "Aziel Digital Library v2.6.2. Public MASTER. Anonymous GET is read-only. Signed-in accounts may ingest. Not a 26-card software index. Author Aziel Eliab only.",
  },
  {
    slug: "4dmap",
    name: "4DMap",
    worker: "4dmap-download-tracker",
    github: "https://github.com/AzielEliab/4dmap",
    ops: [
      { op: "pin", method: "POST", summary: "Pin a declared mark (product 0.2 verb). Opens a card when card_id is omitted." },
      { op: "span", method: "POST", summary: "Span two axes on one card, or two existing cards (Δ)." },
      { op: "stack", method: "POST", summary: "Stack declared cards onto Γ. Does not invent cards." },
      { op: "gap", method: "POST", summary: "Record a declared Δ gap. Not a truth score." },
      { op: "fork", method: "POST", summary: "Keep a sibling fork of a declared card. No winner." },
      { op: "walk", method: "POST", summary: "Walk card_ids or a tip prev_hash chain. Not a sequential gate." },
      { op: "lens", method: "POST", summary: "Silent lens over declared cards. Empty hit is Π-EMPTY." },
      { op: "class", method: "POST", summary: "Pin a declared Π class. Empty label is Π-EMPTY." },
      { op: "cohort", method: "POST", summary: "Pin a declared Π cohort of card ids." },
      { op: "absence", method: "POST", summary: "Absence lens. Silent miss is Π-EMPTY." },
      { op: "cap", method: "POST", summary: "ZionPattern confidence cap 75%. Not P(the world is true)." },
      { op: "join", method: "POST", summary: "Join two existing cards. Π→T backdate refuses." },
      { op: "list", method: "POST", summary: "List inspection cards, walks, and kept forks." },
      { op: "example", method: "POST", summary: "Synthetic T pin. Never a real-case finding." },
      { op: "card_new", method: "POST", summary: "Open a four-axis inspection card (T/Δ/Γ/Π). Not a sequential gate." },
      { op: "card_pin", method: "POST", summary: "Pin a declared mark onto one axis. Invent-mark refuses." },
      { op: "card_span", method: "POST", summary: "Span two axes that already have pins. Does not invent marks." },
      { op: "card_join", method: "POST", summary: "Join two existing cards. FragGate claims cite join type." },
      { op: "card_walk", method: "POST", summary: "Walk an ordered list of cards. ChainLock may stamp the walk hash." },
      { op: "card_list", method: "POST", summary: "List inspection cards and walks in this isolate." },
      { op: "verify_hash", method: "POST", summary: "Recompute a card or walk hash. Not a truth score." },
      { op: "frame_status", method: "POST", summary: "Read the inspection frame (T/Δ/Γ/Π). Not a sequential gate and not an extra door." },
      { op: "axis_describe", method: "POST", summary: "Describe one axis and its neighbors. Axes are simultaneous." },
      { op: "walk_trace", method: "POST", summary: "Trace a declared walk. 4DMap is not a sequential gate." },
      { op: "card_export", method: "POST", summary: "Export a declared card or the isolate snapshot. Hash-closed." },
      { op: "card_import", method: "POST", summary: "Import a previously exported card. Hash mismatch and invent-mark refuse." },
      { op: "verify_chain", method: "POST", summary: "Verify card prev_hash or walk card-hash chain. Not a truth score." },
      { op: "neighbor_cite", method: "POST", summary: "Cite a neighbor engine on a declared card (join type neighbor or cite)." },
      { op: "frame", method: "POST", summary: "UI alias of frame_status. Same FragGate backend as the Worker UI button." },
      { op: "axis", method: "POST", summary: "UI alias of axis_describe. Same FragGate backend as the Worker UI button." },
      { op: "trace", method: "POST", summary: "UI alias of walk_trace. Same FragGate backend as the Worker UI button." },
      { op: "export", method: "POST", summary: "UI alias of card_export. Same FragGate backend as the Worker UI button." },
      { op: "import", method: "POST", summary: "UI alias of card_import. Same FragGate backend as the Worker UI button." },
      { op: "neighbor", method: "POST", summary: "UI alias of neighbor_cite. Same FragGate backend as the Worker UI button." },
    ],
    example: { label: "inspect-1" },
    banner:
      "4DMap (4DM-WP-1.0): four-axis inspection frame T/Δ/Γ/Π. Inspection frame after AZPIPE routes to isolated engines — not an extra door (domains_are_doors:false). Not a sequential gate. Not a truth score. Not a Lumen panel. Does not invent marks or backdate class. Neighbors TemporalLock / StaticClock / ChronoLock / TrajectoryLock / SpectralLock. FragGate claims cite join types. ChainLock may stamp walks. Author Aziel Eliab.",
  },
  {
    slug: "azcoherence",
    name: "AZCoherence",
    worker: "azcoherence-download-tracker",
    github: "https://github.com/AzielEliab/AZCoherence",
    ops: [
      { op: "doctor", method: "GET", summary: "Richer liveness: coherence receipt, refuse list, AZ-CLCE neighbor. Does not increment download KV." },
      { op: "verify", method: "POST", summary: "Recompute a posted AZCoherence receipt hash. Not a truth score." },
      { op: "review_triad", method: "POST", summary: "Review a posted triad (and optional alternate). Advisory. Never invents evidence." },
      { op: "alternate_score", method: "POST", summary: "Score the alternate path only. Does not invent a missing score." },
      { op: "coherence_check", method: "POST", summary: "Primary vs alternate → PASS / FLAG / NEUTRALIZE / REFUSE. Structured receipt. Confidence ≠ truth." },
      { op: "neutralize_hallucination", method: "POST", summary: "Advisory neutralize of a scoring hallucination. Does not invent evidence. Does not emit a truth score." },
    ],
    example: {
      r: "login button blue submit",
      d: "login form submits",
      p: "login button submits",
      alternate: { r: "login button blue submit", d: "login form submits", p: "login button submits" },
      evidence: ["posted R/D/P layers"],
      confidence: 0.6,
    },
    banner:
      "AZCoherence (AZC-0.1): second-pass triad coherence reviewer. Peer AZ-CLCE detects R/D/P inconsistency; this engine reviews primary vs alternate → PASS / FLAG / NEUTRALIZE / REFUSE. Never invents evidence. Confidence ≠ truth. Not AKM-TRIAD fabric. Product cite https://github.com/AzielEliab/AZCoherence. FragGate only. Author Aziel Eliab.",
  },
  {
    slug: "embryolock",
    name: "EmbryoLock",
    worker: "embryolock-download-tracker",
    github: "https://github.com/AzielEliab/EmbryoLock",
    local_destructive_boundary: true,
    ops: [
      { op: "doctor", method: "POST", summary: "Cite vault posture + local-destructive boundary. Does not unlock." },
      { op: "verify_hash", method: "POST", summary: "Compare a digest to the published EmbryoLock SHA256HASH. Does not decrypt." },
      { op: "verify-hash", method: "POST", summary: "UI alias of verify_hash." },
      { op: "policy", method: "POST", summary: "Cite destruction-over-recovery threat model. Not an unlock." },
      { op: "limitation", method: "POST", summary: "Cite known limitations. Not an unlock." },
      { op: "cite", method: "POST", summary: "UI alias of policy." },
      { op: "limitations", method: "POST", summary: "UI alias of limitation." },
    ],
    example: { digest: "fa2e7203bd3924170e94c62357e29764b925a82c2cf708807128bd096333250d" },
    banner:
      "EmbryoLock: offline destructive-over-recovery vault (Stealth+ v1.1). Live cite/health/doctor/verify-hash/policy on FragGate. Wipe / scorch / unlock-after-fail stay local-only — Never execute on the public mesh. Vault/Custody with ARK (isolation label, not a second door). worker_home embryolock-download-tracker. This isolate does not run Argon2id or AES-GCM. Author Aziel Eliab.",
  },
];


const ONE_LINE = {
  vibelock: "Physical-consistency evaluation of speech audio. Risk assessment, not a liveness proof.",
  veillock: "Local camera/screen steps for YOUR device only. Not a call interceptor.",
  codelock: "Canonical or Rosetta HTML view of source. Alters perception, not meaning.",
  godlock: "Offline ABAD / hardening score. Not a VPN and not an anonymity network.",
  shadowlock: "Zero-retention observation of a job list you already have. No OS hook.",
  temporallock: "Hash-chained receipts + timeslate lattice. genesis, append, verify, timeslate, gate. Not a truth claim.",
  forgereceipts: "Local receipt mint + verify / import_export. Not legal advice. Does not contact courts.",
  decisiongate: "Five sequential gates (Definition, Evidence, Impact, Integrity, Responsibility). PASS/REVISE/BLOCK. wrap is not hosted.",
  zsolver: "Nine ontology nodes (Zioncheck seed). Hard 75% cap. Does not solve cases.",
  azos: "Read-only status / principles. Does not grant remote shell.",
  glossafilter: "Render an intent across bundled peer ids. Human opinion remains human.",
  miragegrid: "Ephemeral session node assignment. Not a VPN and not an anonymity network.",
  staticclock: "Forward-only gear-click timeline + companion advisory. click, verify, timeslate. Not a rollback clock.",
  chronolock: "Temporal Neutral Window advisory 08:30–10:30 local. Distinct from TemporalLock. Not a scheduler.",
  postking: "Continuity chess. The goal is not to win. The goal is to remain.",
  azclce: "Jaccard triple / pairwise / CLCE+. Detects inconsistency, not intent. AZCoherence is a separate peer reviewer.",
  ark: "Mode E heuristics sweep. Not a kernel. Hosted never unlocks or stores vaults.",
  azai: "Local OpenAI-compatible runtime. Not a new foundation model. Jeeves is not sovereign.",
  spectrallock: "256px overlay preview (zero/tazel/vyrn/uv/rosetta/zen/chaos/balance). Not a spectrometer.",
  azbot: "Skill, not a foundation model. Hosted /v1/skill returns markdown.",
  employeelock: "Hash-chained accountability workbook. Not a court, not UL, not a truth score.",
  foldlock: "Algorithmic tether-word suppression on UTF-8 text. Not zip.",
  whistlelock: "Local drop ledger + dead-man copy. Not a mailer.",
  trajectorylock: "Auditable geometric compatibility vs a declared line. Research prototype. Hosted never stores media.",
  mialock: "M.I.A.Lock 0.1.1: event map + Doe matching + uncertainty ellipses + coverage heat. Doe leads ≠ ID. Heat ≠ presence. Author Aziel Eliab.",
  azieltether: "AzielTether 0.1.0: central × decentral survival mesh for downloaded Aziel software. Prefer-central; peer sync when down; public HTTPS stays mesh-free. Not a VPN. Author Aziel Eliab.",
  peacelock: "Chosen silence / chosen inaction as a first-class receipt (PL-WP-0.1).",
  azmail: "AZMail (APP 1.0): anonymous MCP mesh + advisory airlock. Not a full internet MTA. Mesh default off. FragGate only.",
  azbrowser: "AZBrowser (AZB-1.0): Lamb Lens ethical research browser. Cite; refuse harvest; no invented visits. FragGate only. AZNet is a separate software (order/token pairing only).",
  aznet: "AZNet (AZN-WP-0.1): silent verification side-net. Hash continuity without hosting. Separate software; functional-order pair with AZBrowser.",
  azhub: "AZHub (AIH-WP-1.0): Blank Key / neutral spatial container. Does not interpret. FragGate only. AZInterface is sibling software under the same FragGate door.",
  azinterface: "AZInterface (AIH-WP-1.0): custodial operating environment. Pre-locked page cycles OFF/integrity/ON/FULL SHUTDOWN/MEMORIAL. FragGate only. AZHub is sibling software under the same FragGate door.",
  "aziel-corpus": "Self-contained immutable digital library. Public MASTER. Not a 26-card index.",
  "4dmap": "4DMap (4DM-WP-1.0): four-axis inspection frame T/Δ/Γ/Π. Inspection frame after AZPIPE, not an extra door (domains_are_doors:false). FragGate only.",
  azcoherence: "AZCoherence: second-pass triad coherence review (primary vs alternate → PASS/FLAG/NEUTRALIZE/REFUSE). Never invents evidence. Confidence ≠ truth. Not AKM-TRIAD. Peer AZ-CLCE is a separate product.",
  embryolock: "Offline destructive-over-recovery vault. Cite live on FragGate; wipe/unlock stay local-only. Never execute on the public mesh.",
};

function ensureCatalogOps(p) {
  const have = new Set((p.ops || []).map((o) => o.op));
  const ops = [];
  if (!have.has("health")) {
    ops.push({
      op: "health",
      method: "GET",
      summary: "Liveness. Does not increment download KV.",
    });
  }
  ops.push(...(p.ops || []));
  if (!have.has("skill")) {
    ops.push({
      op: "skill",
      method: "GET",
      summary: `Return ${p.name} skill markdown. Does not increment download KV.`,
    });
  }
  return ops;
}

export const PRODUCTS = PRODUCTS_RAW.map((p) => ({
  ...p,
  version: VERSIONS[p.slug] || p.version || null,
  oneLine: ONE_LINE[p.slug] || p.name,
  doi: DOI_BY_SLUG[p.slug] || null,
  banner: p.banner || ONE_LINE[p.slug] || p.name,
  ops: ensureCatalogOps(p),
}));

setSuitePresenceCatalog(PRODUCTS);

const BY_SLUG = Object.fromEntries(PRODUCTS.map((p) => [p.slug, p]));

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, HEAD, POST, OPTIONS",
    "Access-Control-Allow-Headers":
      "Content-Type, Accept, Authorization, X-Aziel-Runtime-Token, X-Aziel-Runtime-Via, X-Aziel-Runtime-Host, MCP-Protocol-Version, mcp-session-id",
    "Access-Control-Expose-Headers": `${VERSION_HEADER}, ${ROLE_HEADER}`,
  };
}

function asHead(request, response) {
  if (request.method !== "HEAD") return response;
  return new Response(null, { status: response.status, headers: response.headers });
}

function authorityLinkHeaders(origin, path) {
  return {
    ...authorityHeaders(RUNTIME_VERSION, RUNTIME_ROLE),
    ...noStoreHeaders(),
    ...linkHeaders(origin, path),
  };
}

function catalogLinkHeaders(origin, path) {
  return {
    ...authorityHeaders(RUNTIME_VERSION, RUNTIME_ROLE),
    ...catalogCacheHeaders(),
    ...linkHeaders(origin, path),
  };
}

async function servePackedSoftware(request, env, origin, extra = {}) {
  const packed = await readPackedCatalog(env, origin, PRODUCTS, softwareExtra(env));
  const body = { ...packed.catalog, rl: packed.rl, donation: donationStatic(), ...extra };
  const path = extra.mirror_of || "/v1/software";
  if (prefersHtml(request)) {
    return asHead(
      request,
      html(softwareCatalogHtml(origin, body, PAGE_CSS), catalogLinkHeaders(origin, path)),
    );
  }
  return json(body, 200, catalogLinkHeaders(origin, path));
}

function linkHeaders(origin, canonicalPath = "/") {
  const base = origin.replace(/\/$/, "") || CATALOG_HOST;
  const canonical = base + (canonicalPath.startsWith("/") ? canonicalPath : "/" + canonicalPath);
  return {
    "X-Robots-Tag": "index, follow, max-snippet:-1, max-image-preview:large",
    Link: `<${canonical}>; rel="canonical", <${base}/openapi.json>; rel="service-doc", <${base}/sitemap.xml>; rel="describedby"`,
  };
}

function json(body, status = 200, extra = {}) {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      ...corsHeaders(),
      "X-Robots-Tag": "index, follow, max-snippet:-1, max-image-preview:large",
      ...extra,
    },
  });
}

function html(body, extra = {}) {
  const { status, ...headers } = extra;
  return new Response(body, {
    status: status || 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      ...corsHeaders(),
      "X-Robots-Tag": "index, follow, max-snippet:-1, max-image-preview:large",
      ...headers,
    },
  });
}

function text(body, extra = {}) {
  return new Response(body, {
    status: 200,
    headers: {
      ...corsHeaders(),
      "X-Robots-Tag": "index, follow, max-snippet:-1, max-image-preview:large",
      ...extra,
      "Content-Type": "text/plain; charset=utf-8",
    },
  });
}

function xml(body, extra = {}) {
  return new Response(body, {
    status: 200,
    headers: {
      ...corsHeaders(),
      "X-Robots-Tag": "index, follow, max-snippet:-1, max-image-preview:large",
      ...extra,
      "Content-Type": "application/xml; charset=utf-8",
    },
  });
}

function originOf(request) {
  try {
    return new URL(request.url).origin;
  } catch {
    return CATALOG_HOST;
  }
}

function workerHost(product) {
  if (product.slug === "aziel-corpus") return "https://www.azielcorpuslibrary.net";
  return `https://${product.worker}.vibelock.workers.dev`;
}

function workerUrl(product, op) {
  return `${workerHost(product)}/v1/${op}`;
}

function productUrls(product, origin) {
  const host = workerHost(product);
  const base = (origin || CATALOG_HOST).replace(/\/$/, "");
  return {
    github: product.github,
    worker: product.worker,
    worker_home: host + "/",
    download: host + "/download",
    count: host + "/count",
    install: host + "/install.sh",
    skill: host + "/v1/skill",
    openapi: host + "/openapi.json",
    stats: host + "/stats",
    catalog_card: `${base}/p/${product.slug}`,
    catalog_health: `${base}/p/${product.slug}/health`,
    catalog_skill: `${base}/p/${product.slug}/skill`,
    catalog_openapi: `${base}/openapi.json`,
    pull: `${base}/v1/pull/${product.slug}`,
    pull_skill: `${base}/v1/pull/${product.slug}/skill`,
    invoke_prefix: `${base}/p/${product.slug}`,
    doi: product.doi || null,
    doi_url: product.doi ? `https://doi.org/${product.doi}` : null,
    ...productCrawlUrls(product),
  };
}

function softwareExtra(env) {
  const sha =
    (env && env.GIT_SHA && String(env.GIT_SHA).trim()) ||
    (env && env.CF_VERSION_METADATA && env.CF_VERSION_METADATA.id) ||
    null;
  const updated = (env && env.UPDATED_AT && String(env.UPDATED_AT).trim()) || LASTMOD;
  return {
    runtimeVersion: RUNTIME_VERSION,
    version: RUNTIME_VERSION,
    updated_at: updated,
    git_sha: sha && /^[0-9a-f]{7,40}$/i.test(String(sha)) ? String(sha).toLowerCase() : null,
  };
}

function softwareCatalogBody(origin, env) {
  return softwareCatalog(origin, PRODUCTS, softwareExtra(env));
}

function catalogRecord(product, origin) {
  const urls = productUrls(product, origin);
  const cite = citationFields(product, urls);
  const base = (origin || CATALOG_HOST).replace(/\/$/, "");
  const fraggateLive = Array.isArray(LIVE_OPS[product.slug]);
  return {
    slug: product.slug,
    name: product.name,
    kind: "software",
    ...(product.version ? { version: product.version } : {}),
    one_line: product.oneLine,
    github: urls.github,
    worker: urls.worker,
    door: "fraggate",
    fraggate_live: fraggateLive,
    fraggate_ops: fraggateLive ? LIVE_OPS[product.slug].slice() : [],
    fraggate_call: `${base}/v1/fraggate/call`,
    download: urls.download,
    count: urls.count,
    install: urls.install,
    skill: urls.skill,
    openapi: urls.openapi,
    doi: cite.doi,
    doi_url: cite.doi_url,
    doi_kind: cite.doi_kind,
    ...(cite.doi_note ? { doi_note: cite.doi_note } : {}),
    zenodo_status: cite.zenodo_status,
    software_deposit_needed: cite.software_deposit_needed,
    related_identifiers: cite.related_identifiers,
    software_tarball: cite.software_tarball,
    banner: product.banner,
    ops: product.ops,
    catalog_card: urls.catalog_card,
    catalog_health: urls.catalog_health,
    catalog_skill: urls.catalog_skill,
    pull: urls.pull,
    pull_skill: urls.pull_skill,
    invoke_prefix: urls.invoke_prefix,
    worker_home: urls.worker_home,
    cite: urls.cite,
    llms: urls.llms,
    sitemap: urls.has_sitemap ? urls.sitemap : null,
    crawl: {
      home: urls.worker_home,
      cite: urls.cite,
      llms: urls.has_llms ? urls.llms : null,
      download: urls.download,
      sitemap: urls.has_sitemap ? urls.sitemap : null,
    },
    qns_cd: qnsHint(),
    ...crossMapFields(product.slug),
  };
}

function robotsTxt(origin) {
  return buildRobotsTxt(origin, PRODUCTS);
}

function sitemapXml(origin) {
  const base = origin.replace(/\/$/, "");
  const urls = [
    { loc: base + "/", priority: "1.0", changefreq: "daily" },
    { loc: base + "/openapi.json", priority: "0.9", changefreq: "daily" },
    { loc: base + "/v1/catalog.json", priority: "0.9", changefreq: "daily" },
    { loc: base + "/v1/software", priority: "0.95", changefreq: "daily" },
    { loc: base + "/v1/fraggate/software", priority: "0.9", changefreq: "daily" },
    { loc: base + "/v1/update/check", priority: "0.7", changefreq: "daily" },
    { loc: base + "/v1/update/manifest", priority: "0.8", changefreq: "daily" },
    { loc: base + "/v1/skill", priority: "0.95", changefreq: "daily" },
    { loc: base + "/v1/runtime.json", priority: "0.95", changefreq: "daily" },
    { loc: base + "/v1/fraggate", priority: "0.95", changefreq: "daily" },
    { loc: base + "/v1/fraggate/list", priority: "0.9", changefreq: "daily" },
    { loc: base + "/v1/session/open", priority: "0.95", changefreq: "daily" },
    { loc: base + "/v1/bundle", priority: "0.95", changefreq: "daily" },
    { loc: base + "/cite.json", priority: "0.8", changefreq: "weekly" },
    { loc: base + "/llms.txt", priority: "0.8", changefreq: "weekly" },
    { loc: base + "/ai.txt", priority: "0.8", changefreq: "weekly" },
    { loc: base + "/sitemap-index.xml", priority: "0.85", changefreq: "weekly" },
    { loc: base + "/v1/health", priority: "0.5", changefreq: "daily" },
    { loc: base + "/v1/uses", priority: "0.6", changefreq: "daily" },
    { loc: base + "/v1/mesh", priority: "0.7", changefreq: "daily" },
    { loc: base + "/v1/mesh/status", priority: "0.65", changefreq: "daily" },
    { loc: base + "/v1/mesh/nodes", priority: "0.65", changefreq: "daily" },
    { loc: base + "/v1/qns", priority: "0.65", changefreq: "weekly" },
    { loc: base + "/v1/azpipe/arch", priority: "0.65", changefreq: "weekly" },
    { loc: base + "/v1/memory", priority: "0.6", changefreq: "weekly" },
    { loc: base + "/v1/ready", priority: "0.7", changefreq: "daily" },
    { loc: base + "/mcp", priority: "0.6", changefreq: "weekly" },
    { loc: base + "/sigil.png", priority: "0.3", changefreq: "monthly" },
  ];
  for (const p of PRODUCTS) {
    urls.push({ loc: `${base}/#${p.slug}`, priority: "0.8", changefreq: "weekly" });
    urls.push({ loc: `${base}/p/${p.slug}`, priority: "0.8", changefreq: "weekly" });
    urls.push({ loc: `${base}/p/${p.slug}/health`, priority: "0.7", changefreq: "daily" });
    urls.push({ loc: `${base}/v1/pull/${p.slug}`, priority: "0.85", changefreq: "daily" });
    urls.push({ loc: `${base}/v1/pull/${p.slug}/skill`, priority: "0.85", changefreq: "daily" });
    urls.push({ loc: p.github, priority: "0.5", changefreq: "weekly", lastmod: null });
  }
  for (const loc of designsSitemapUrls()) {
    urls.push({ loc, priority: "0.5", changefreq: "weekly", lastmod: null });
  }
  for (const loc of auditsSitemapUrls()) {
    urls.push({ loc, priority: "0.45", changefreq: "weekly", lastmod: null });
  }
  const describeSlugs = PRODUCTS.map((p) => p.slug).concat(NAMED_STUBS.map((s) => s.slug));
  for (const loc of describeSitemapUrls(origin, describeSlugs)) {
    urls.push({ loc, priority: loc.endsWith("/describe") ? "0.85" : "0.75", changefreq: "weekly" });
  }
  for (const loc of hubPageSitemapUrls()) {
    urls.push({ loc, priority: "0.7", changefreq: "weekly", lastmod: null });
  }
  const body = urls
    .map((u) => {
      const last = u.lastmod === null ? "" : `    <lastmod>${u.lastmod || LASTMOD}</lastmod>\n`;
      return `  <url>\n    <loc>${escapeXml(u.loc)}</loc>\n${last}    <changefreq>${u.changefreq}</changefreq>\n    <priority>${u.priority}</priority>\n  </url>`;
    })
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${body}
</urlset>
`;
}

function escapeXml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function llmsTxt(origin) {
  const base = origin.replace(/\/$/, "");
  const lines = [
    `# ${CATALOG_TITLE}`,
    "",
    `> ${CATALOG_DESCRIPTION}`,
    "",
    ...llmsIdentityHeader(),
    `Role: engine-runtime (catalog + pull + proxy + session + in-process engines)`,
    `Honesty: 1.1.0 was catalog+proxy. 1.2.0 was session/receipt (exec still proxied). 1.3.0 ran listed slugs in-process. 1.4.0 vendors every catalog Software slug. 1.4.1 adds production gates (ready, HEAD, no-store, receipt cap 64, TTL 6h, rate limits, optional token). 1.5.0 was the agent-native cut (flat product-verb MCP). 1.6.0 is the FragGate door (discover, route, refuse). 1.6.1 lists every major OpenAPI/MCP/HTTP client. 1.6.2 widens the public door to sensible advisory engines; stubs still refuse. 1.6.3 adds KV-backed API use trackers (GET /v1/uses; no PII). 1.6.4 adds PeaceLock (PL-WP-0.1) as a true in-process engine. 1.6.5 adds AZMail (APP 1.0) as a FragGate-live engine. 1.6.6 adds AZBrowser (AZB-1.0) as a FragGate-live engine. 1.6.7 adds AZNet (AZN-WP-0.1) as a separate FragGate-live product. 1.6.8 adds AZHub and AZInterface as two separate softwares under the same FragGate door (AIH-WP-1.0). 1.6.9 frames them as sibling products on that same door. 1.6.10 sets AZBrowser and AZNet one_line to separate software. 1.6.11 adds FragGate UI-op aliases and names EmbryoLock as stub / local-not-hosted. 1.6.12 adds GET /v1/software (hub catalog; Plain→Gate→Lock) and GET /v1/update/check. 1.6.13 aligns the QNM-BUILD-1.0 suite rollup. 1.6.14 adds 4DMap (4DM-WP-1.0). 1.6.15 locks the suite hop order (SUITE-PIPE-1.6.15). 1.7.0 locks MASTER-33 (FragGate single door; Lamb Lens after FragGate; RoseClock forward-only). 1.7.1 adds AKM-TRIAD-1.0 (adaptive recollection; Bayesian posterior ≠ truth; 3-of-4 triad; behind FragGate; not Softwares-tab). 1.7.2 adds GET /v1/azpipe/arch (MASTER-33 cite/read; same FragGate pipeline payload; not a Softwares door). 1.7.3 aligns audit WARN copy. 1.7.4 enhances 4DMap LIVE_OPS (frame_status/axis_describe/walk_trace/card_export/card_import/verify_chain/neighbor_cite; inspection frame, not an extra door). 1.7.5 is Softwares capability wave 1 (decisiongate / forgereceipts / temporallock / staticclock / chronolock / trajectorylock / spectrallock; docs/audit/SUITE-CAPABILITY-CHECKLIST.md). 1.7.6 syncs 4DMap LIVE_OPS with product 0.2.0 (pin/span/stack/gap/fork/walk/lens/class/cohort/absence/cap/join/list/example plus frame_status/axis_describe/walk_trace/card_export/card_import/verify_chain/neighbor_cite; inspection frame, not an extra door). 1.7.7 lands AZCoherence (AZC-0.1) as a true in-process FragGate Softwares engine (second-pass triad coherence; cite https://github.com/AzielEliab/AZCoherence; not AKM-TRIAD). 1.7.8 lands EmbryoLock as a true in-process engine (live-with-local-destructive-boundary; wipe/unlock stay FG-STUB on the public mesh). 1.7.9 cross-maps AZCoherence (peers azclce / AZInterface / AKM-TRIAD fabric neighbor; hubs + Worker URL; domain stays null). 1.7.10 makes QNM Live Nodes durable: suite-presence is operator-enabled; GET /v1/mesh never enables; cron or request-path fans out live Softwares product Workers while enabled (TTL 5 min). AKM-TRIAD-1.0 stays LIVE fabric, not Softwares-tab.`,
    `AZNet: FragGate only. POST /v1/fraggate/call { slug: "aznet", op }. Separate product (own Worker aznet-download-tracker, own UI). Silent verification side-net. Never hosts payloads. Garden / stamp / memorial ops require AZBrowser pair_token AND pair_flag (functional order only). payload_host / serve_content_for_peer / analytics / ranking / repair_integrity_bypass stay stub.`,
    `AZMail: FragGate only. POST /v1/fraggate/call { slug: "azmail", op }. Host /runtime proxies that same FragGate door. Not a full internet MTA. Mesh default off. SMTP / deanonymize / harvest stay stub. DecisionGATE / FragGate ledger still apply before exec.`,
    `AZBrowser: FragGate only. POST /v1/fraggate/call { slug: "azbrowser", op }. MCP fraggate_list / fraggate_call and Worker UI buttons share LIVE_OPS.azbrowser (ethical_search, lamb_lens_search, navigate, airlock_ingest, tab_open, tab_list, receipt_list, verify, receipt_verify, health, skill). Lamb Lens cites; refuses harmful harvest; never invents visit results. Not Chromium. tor_exit / phoenix_wipe / unrestricted proxy stay stub.`,
    `AZHub: FragGate only. POST /v1/fraggate/call { slug: "azhub", op }. Blank Key / neutral spatial container (AIH-WP-1.0). Does not interpret meaning. Refuses auto-unlock and completeness events. AZInterface is sibling software under the same FragGate door.`,
    `AZInterface: FragGate only. POST /v1/fraggate/call { slug: "azinterface", op }. Custodial operating environment (AIH-WP-1.0). Pre-locked page cycles OFF / integrity / ON / FULL SHUTDOWN / MEMORIAL. AZHub is sibling software under the same FragGate door.`,
    `4DMap: FragGate only. POST /v1/fraggate/call { slug: "4dmap", op }. Four-axis inspection frame T/Δ/Γ/Π (4DM-WP-1.0 / product 0.2.0). Research-domain inspection frame inside Internal Domain Layer after AZPIPE — not a sequential gate and not an extra door. LIVE_OPS match product 0.2 (pin/span/stack/gap/fork/walk/lens/class/cohort/absence/cap/join/list/example plus card_* / frame_status / axis_describe / walk_trace / card_export / card_import / verify_chain / neighbor_cite). Cited on the locked MASTER-33 pipeline. truth_score / lumen_panel / invent_mark / backdate_class stay stub. FragGate claims cite join types.`,
    `AZCoherence: FragGate only. POST /v1/fraggate/call { slug: "azcoherence", op }. Second-pass triad coherence reviewer (AZC-0.1). Peer AZ-CLCE detects R/D/P inconsistency; AZCoherence reviews primary vs alternate → PASS / FLAG / NEUTRALIZE / REFUSE. Never invents evidence. Confidence ≠ truth. Not AKM-TRIAD fabric. Cross-map peers: azclce (peer scorer), azinterface (human UI), AKM-TRIAD (fabric neighbor, not merged). Hubs: azieleliab.com, azielcorpuslibrary.net, godlock.uk. Worker: https://azcoherence-download-tracker.vibelock.workers.dev/. Domain stays null (scoring-review placement). Product cite https://github.com/AzielEliab/AZCoherence.`,
    `EmbryoLock: FragGate only. POST /v1/fraggate/call { slug: "embryolock", op }. True in-process engine (engine_digest). Vault/Custody with ARK. LIVE_OPS health/skill/doctor/verify-hash/policy/limitation. Wipe/scorch/unlock-after-fail stay FG-STUB — Never execute on the public mesh. worker_home https://embryolock-download-tracker.vibelock.workers.dev/.`,
    `Locked MASTER-33 pipeline: ${LOCKED_STRIP}. FragGate is THE single door. Lamb Lens is fabric after FragGate. Domains are isolation labels, not doors. LambGate is not a hop. FoldLock fld3-wire is internal to AZPIPE. Illegal reorder is refused. No rollback. Cite: GET ${base}/v1/azpipe/arch (same payload as GET /v1/fraggate pipeline; not a Softwares-tab door).`,
    `True-engine slugs: ${honestyFields(PRODUCTS.map((p) => p.slug)).true_engine_slugs.join(", ")}`,
    `Proxy /p/{slug}/{op} is not exec. Hosted AZAI is not the local blend. VPN/hop mesh is not claimed on this public surface.`,
    `Local blends: azai serve · forgereceipts ui · azos ui`,
    `Counted tarball: none (Worker session + in-repo CLI)`,
    `Host: ${base}/`,
    `Skill: ${base}/v1/skill`,
    `Manifest: ${base}/v1/runtime.json`,
    `Session open: POST ${base}/v1/session/open`,
    `Bundle: ${base}/v1/bundle`,
    `OpenAPI: ${base}/openapi.json`,
    `Door: fraggate`,
    `FragGate: ${base}/v1/fraggate`,
    `AZPIPE MASTER-33 cite: ${base}/v1/azpipe/arch`,
    `Kernel: ${FRAGGATE_GITHUB}`,
    `Catalog extras (hub kernel card, not a Software engine): slug=fraggate worker=${FRAGGATE_WORKER} github=${FRAGGATE_GITHUB} worker_home=${FRAGGATE_WORKER_ORIGIN}/ download=${FRAGGATE_WORKER_ORIGIN}/download — read catalog.json extras[] / fraggate. FragGate is the kernel door; human UI + counted download is the separate FragGate Worker app (not nested in AZBrowser).`,
    `MCP: POST ${base}/mcp`,
    `Uses: ${base}/v1/uses`,
    `Machine catalog: ${base}/v1/catalog.json`,
    `Authoritative software (hubs fetch this): ${base}/v1/software`,
    `Softwares HTML shell (Accept: text/html): ${base}/v1/software`,
    `FragGate software mirror: ${base}/v1/fraggate/software`,
    `FragGate describe docs: ${base}/v1/fraggate/describe?slug={slug} (HTML when Accept prefers text/html)`,
    `AZCoherence describe: ${base}/v1/fraggate/describe?slug=azcoherence`,
    `Client update check: ${base}/v1/update/check?slug={slug}&version={installed}`,
    `Update manifest: ${base}/v1/update/manifest`,
    `Mesh: ${base}/v1/mesh  (QNM-BUILD-1.0 suite rollup. suite-presence is operator-enabled. GET /v1/mesh never enables. Default radios OFF. Not a login mesh. Not Node Gate.)`,
    `Mesh status: ${base}/v1/mesh/status  (alias; never enables)`,
    `Mesh nodes: ${base}/v1/mesh/nodes  (roster; 5-minute TTL; no scores)`,
    `Agent pipeline: fraggate_list → fraggate_describe → fraggate_call. Prefer ${base}/mcp and ${base}/v1/software.`,
    `Cite: ${base}/cite.json`,
    `Sitemap: ${base}/sitemap.xml`,
    `Sitemap index: ${base}/sitemap-index.xml`,
    `Library: ${LIBRARY_NAME} ${LIBRARY_ORIGIN}/`,
    `Library cite: ${LIBRARY_CITE}`,
    `Library llms: ${LIBRARY_LLMS}`,
    `Library front door: https://www.azielcorpuslibrary.net/runtime`,
    `License: Apache-2.0`,
    `User-Agent: Mozilla/5.0`,
    designsLlmsHeaderLine(),
    auditsLlmsHeaderLine(),
    "",
    llmsCompatibleBlock().trimEnd(),
    "",
    llmsHubsBlock().trimEnd(),
    "",
    "## Session (the actual runtime cut)",
    "",
    `1. POST ${base}/v1/session/open`,
    `2. POST ${base}/v1/session/{id}/policy`,
    `3. POST ${base}/v1/session/{id}/exec  {slug, op, payload}`,
    `4. GET ${base}/v1/session/{id}/receipt`,
    `5. POST ${base}/v1/session/{id}/close`,
    "",
    "## How to pull + proxy (front doors, not exec)",
    "",
    `1. GET ${base}/v1/skill`,
    `2. GET ${base}/v1/software  (hubs: Software-tab refresh; also ${base}/v1/fraggate/software)`,
    `3. GET ${base}/v1/update/check?slug={slug}&version={installed}  (install.sh / local UI / mobile)`,
    `4. GET ${base}/v1/runtime.json`,
    `5. GET ${base}/v1/bundle  (or ${base}/v1/pull?all=1)`,
    `6. GET ${base}/v1/pull/{slug}  then GET ${base}/v1/pull/{slug}/skill`,
    `7. GET or POST ${base}/p/{slug}/{op}  (proxy only)`,
    `Agent pipeline: POST ${base}/mcp — fraggate_list → fraggate_describe → fraggate_call.`,
    "",
    "## Quantum Node Mesh (QNM-BUILD-1.0)",
    "",
    "suite-presence is operator-enabled. POST /v1/mesh/enable { bearer: \"suite-presence\" } turns radios LIVE. GET /v1/mesh never enables. Default radios OFF. Not a login mesh. Not Node Gate. Not QNM-S.",
    "While enabled, this Worker fans out join/heartbeat for every live Softwares product Worker (node_id {slug}-worker, no '|') on cron (*/2 * * * *) or request-path. Presence TTL is 5 minutes.",
    "Product Workers and hubs that show Live Nodes proxy /v1/mesh and /v1/mesh/* to the AZIEL_RUNTIME binding (same path). Do not invent a second mesh. GodLock download-tracker /v1/mesh/status is that proxy — not a local mesh.",
    "Full node process is local qnm-node/. Anon-broadcast is never a publish path.",
    "",
    "## Products",
    "",
  ];
  for (const p of PRODUCTS) {
    const u = productUrls(p, origin);
    lines.push(`### ${p.name} (${p.slug})`);
    lines.push(p.oneLine);
    if (p.banner) lines.push(`Banner: ${p.banner}`);
    lines.push(`GitHub: ${u.github}`);
    lines.push(`Worker: ${u.worker_home}`);
    lines.push(`Worker cite: ${u.cite}`);
    if (u.has_llms) lines.push(`Worker llms: ${u.llms}`);
    if (u.has_sitemap) lines.push(`Worker sitemap: ${u.sitemap}`);
    lines.push(`Download (counted, gzip 200): ${u.download}`);
    if (p.version) lines.push(`Version: ${p.version}`);
    lines.push(`Install: curl -fsSL ${u.install} | bash`);
    lines.push(`Skill: ${u.skill}`);
    lines.push(`Pull: ${u.pull}`);
    lines.push(`Pull skill: ${u.pull_skill}`);
    lines.push(`Invoke prefix: ${u.invoke_prefix}`);
    lines.push(`Catalog health: ${u.catalog_health}`);
    lines.push(`Catalog skill: GET ${base}/p/${p.slug}/skill`);
    lines.push(`Ops: ${p.ops.map((o) => `${o.method} /p/${p.slug}/${o.op}`).join(", ")}`);
    const cite = citationFields(p, u);
    if (u.doi_url) lines.push(`DOI: ${u.doi}  ${u.doi_url}  (${cite.zenodo_status})`);
    else lines.push("DOI: none — Zenodo software deposit needed (do not invent a DOI)");
    lines.push(`Related: GitHub ${u.github} · counted tarball ${u.download}`);
    if (cite.software_tarball && cite.software_tarball.filename) {
      lines.push(`Software package: ${cite.software_tarball.filename}`);
    }
    lines.push("");
  }
  lines.push(designsLlmsBlock());
  lines.push(auditsLlmsBlock());
  lines.push(llmsCiteBlock(origin));
  lines.push("## Crawl (GitBaby product Workers)");
  lines.push("");
  lines.push(
    "Expected on every product Worker: GET /  GET /cite.json  GET /llms.txt  GET /download  GET /robots.txt (Allow: /)  GET /sitemap.xml.",
  );
  lines.push(
    `See docs/PRODUCT_SEO.md. Open crawl: ${crawlerAllowSentence()} Do not leave a conflicting Disallow. Do not ship Cloudflare content-signal blocks.`,
  );
  lines.push(
    "VibeLock counted Worker (vibelock-download-tracker.vibelock.workers.dev) already Allows /. The host vibelock.vibelock.workers.dev is a different Worker and previously served Cloudflare content-signal text — that repo should match the template.",
  );
  lines.push(
    `Sitemap index (corpus + godlock.uk + live product sitemaps): ${base}/sitemap-index.xml`,
  );
  lines.push("");
  return lines.join("\n");
}

function citeJson(origin) {
  const base = origin.replace(/\/$/, "");
  return {
    author: AUTHOR_NAME,
    aka: AUTHOR_ALTERNATE_NAME,
    alternateName: AUTHOR_ALTERNATE_NAME,
    identity: AUTHOR_NAME,
    author_github: AUTHOR_GITHUB,
    catalog: base + "/",
    runtime: base + "/",
    library: LIBRARY_ORIGIN + "/",
    library_name: LIBRARY_NAME,
    library_how_to_cite: citeHowToLibrary(),
    library_cite: LIBRARY_CITE,
    library_llms: LIBRARY_LLMS,
    role: RUNTIME_ROLE,
    layer: RUNTIME_LAYER,
    version: RUNTIME_VERSION,
    uses: base + "/v1/uses",
    counted_tarball: false,
    proxy_is_not_exec: true,
    ...citeCompatibleFields(),
    ...honestyFields(PRODUCTS.map((p) => p.slug)),
    license: "Apache-2.0",
    license_url: "https://www.apache.org/licenses/LICENSE-2.0",
    how_to_cite: citeHowToRuntime(origin),
    bibtex: `@software{eliab_aziel_runtime_2026,
  author = {Eliab, Aziel},
  title = {Aziel Eliab Runtime},
  year = {2026},
  url = {${base}/},
  version = {${RUNTIME_VERSION}},
  license = {Apache-2.0}
}`,
    apa: `Eliab, A. (2026). Aziel Eliab Runtime [Computer software]. ${base}/`,
    zenodo: citeZenodoBlock(),
    door: "fraggate",
    kernel: FRAGGATE_GITHUB,
    fraggate: fraggateHubCard(origin),
    extras: catalogExtraCards(origin),
    software: base + "/v1/software",
    update_check: base + "/v1/update/check",
    update_manifest: base + "/v1/update/manifest",
    mcp: base + "/mcp",
    azpipe_arch: base + "/v1/azpipe/arch",
    hubs: hubsCiteField(),
    azcoherence: azcoherenceCiteField(origin),
    mesh_get_never_enables: true,
    designs: designsCiteField(),
    audits: auditsCiteField(),
    mesh: meshCiteField(base),
    mesh_get_never_enables: true,
    suite_presence: "operator-enabled",
    products: PRODUCTS.map((p) => {
      const u = productUrls(p, origin);
      const cite = citationFields(p, u);
      return {
        name: p.name,
        slug: p.slug,
        github: p.github,
        download: u.download,
        version: cite.version,
        doi: cite.doi,
        doi_url: cite.doi_url,
        doi_kind: cite.doi_kind,
        ...(cite.doi_note ? { doi_note: cite.doi_note } : {}),
        zenodo_status: cite.zenodo_status,
        software_deposit_needed: cite.software_deposit_needed,
        related_identifiers: cite.related_identifiers,
        software_tarball: cite.software_tarball,
        zenodo_deposit: cite.zenodo_deposit,
        how_to_cite: productHowToCite(p),
        qns_cd: qnsHint(),
        worker_home: u.worker_home,
        cite: u.cite,
        llms: u.has_llms ? u.llms : null,
        catalog_card: `${base}/p/${p.slug}`,
        fraggate_describe: `${base}/v1/fraggate/describe?slug=${encodeURIComponent(p.slug)}`,
      };
    }),
  };
}

function jsonLd(origin) {
  const base = origin.replace(/\/$/, "");
  const person = personJsonLd();
  const software = {
    "@type": "SoftwareApplication",
    "@id": base + "/#runtime",
    name: CATALOG_TITLE,
    url: base + "/",
    description: CATALOG_DESCRIPTION,
    softwareVersion: RUNTIME_VERSION,
    applicationCategory: "DeveloperApplication",
    operatingSystem: "Cloudflare Workers",
    license: "https://www.apache.org/licenses/LICENSE-2.0",
    author: { "@id": person["@id"] },
    creator: { "@id": person["@id"] },
    codeRepository: "https://github.com/AzielEliab/aziel-runtime",
    sameAs: [
      "https://github.com/AzielEliab/aziel-runtime",
      AUTHOR_GITHUB,
      LIBRARY_FRONT_DOOR,
      base + "/v1/software",
      base + "/v1/catalog.json",
      base + "/mcp",
      base + "/openapi.json",
      base + "/v1/fraggate/describe",
      "https://www.azieleliab.com/",
      "https://www.azieleliab.com/software",
      LIBRARY_ORIGIN + "/",
      LIBRARY_ORIGIN + "/software",
      "https://godlock.uk/",
      "https://godlock.uk/software",
    ],
    screenshot: base + "/sigil.png",
  };
  const website = {
    "@type": "WebSite",
    "@id": base + "/#website",
    name: CATALOG_TITLE,
    url: base + "/",
    description: CATALOG_DESCRIPTION,
    publisher: { "@id": person["@id"] },
    inLanguage: "en",
  };
  const itemList = {
    "@type": "ItemList",
    name: "Aziel Eliab products",
    numberOfItems: PRODUCTS.length,
    itemListElement: PRODUCTS.map((p, i) => {
      const u = productUrls(p, origin);
      const item = {
        "@type": "SoftwareApplication",
        name: p.name,
        description: p.oneLine,
        url: u.catalog_card,
        codeRepository: p.github,
        downloadUrl: u.download,
        author: { "@id": person["@id"] },
        license: "https://www.apache.org/licenses/LICENSE-2.0",
        sameAs: [u.worker_home, u.cite, u.download].concat(u.has_llms ? [u.llms] : []),
      };
      if (p.version) item.softwareVersion = p.version;
      if (u.doi_url) item.identifier = u.doi_url;
      return {
        "@type": "ListItem",
        position: i + 1,
        name: p.name,
        url: u.catalog_card,
        item,
      };
    }),
  };
  const softwareList = {
    "@type": "ItemList",
    "@id": base + "/v1/software#list",
    name: "Aziel Eliab software (Plain → Gate → Lock)",
    description: SOFTWARE_FRAMING,
    url: base + "/v1/software",
    numberOfItems: listSoftwareEntries(PRODUCTS, origin).length,
    itemListElement: listSoftwareEntries(PRODUCTS, origin).map((s, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: s.name,
      url: s.worker_home || `${base}/v1/fraggate/describe?slug=${s.slug}`,
      item: {
        "@type": "SoftwareApplication",
        name: s.name,
        description: s.one_line,
        softwareVersion: s.version || undefined,
        url: s.worker_home || `${base}/v1/software`,
        downloadUrl: s.download_url || undefined,
        codeRepository: s.github || undefined,
        applicationCategory: s.bucket,
        author: { "@id": person["@id"] },
        license: "https://www.apache.org/licenses/LICENSE-2.0",
      },
    })),
  };
  return {
    "@context": "https://schema.org",
    "@graph": [person, software, website, libraryJsonLd(), itemList, softwareList],
  };
}

function headMeta(origin, title, description, canonicalPath) {
  const base = origin.replace(/\/$/, "");
  const canonical = base + canonicalPath;
  const image = base + "/sigil.png";
  return `<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
<meta name="description" content="${escapeHtml(description)}">
<meta name="author" content="${escapeHtml(AUTHOR_NAME)}">
<meta name="citation_author" content="${escapeHtml(AUTHOR_NAME)}">
<meta name="keywords" content="${escapeHtml(HOMEPAGE_KEYWORDS)}">
<meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1">
<link rel="canonical" href="${escapeHtml(canonical)}">
<link rel="sitemap" type="application/xml" href="${base}/sitemap.xml">
<link rel="sitemap" type="application/xml" href="${base}/sitemap-index.xml">
<link rel="alternate" type="text/plain" href="${base}/llms.txt" title="llms.txt">
<link rel="alternate" type="application/json" href="${base}/cite.json" title="cite.json">
<meta property="og:type" content="website">
<meta property="og:title" content="${escapeHtml(title)}">
<meta property="og:description" content="${escapeHtml(description)}">
<meta property="og:url" content="${escapeHtml(canonical)}">
<meta property="og:site_name" content="${escapeHtml(AUTHOR_NAME)}">
<meta property="og:image" content="${escapeHtml(image)}">
<meta property="og:image:alt" content="Everblooming sigil — Aziel Eliab">
<meta name="twitter:card" content="summary">
<meta name="twitter:title" content="${escapeHtml(title)}">
<meta name="twitter:description" content="${escapeHtml(description)}">
<meta name="twitter:image" content="${escapeHtml(image)}">`;
}

const PAGE_CSS = `
  :root { color-scheme: dark; }
  .brandrow{display:flex;align-items:center;gap:12px;margin:0 0 10px}
  .brandmark{width:40px;height:40px;border-radius:10px;object-fit:cover;flex:0 0 auto;box-shadow:0 0 0 1px #d4af3733}
  .stamp{margin:0;color:#d4af37;font-size:.88rem;letter-spacing:.02em}
  body { font: 16px/1.45 system-ui, sans-serif; max-width: 52rem; margin: 2.5rem auto; padding: 0 1.25rem 4rem; background: #0e1014; color: #e8eaef; }
  h1 { font-size: 1.85rem; margin: 0 0 .35rem; }
  h2 { font-size: 1.2rem; margin: 0 0 .4rem; }
  .slug { font-weight: 500; color: #9aa3b2; font-size: .95rem; }
  a { color: #c9d4ff; }
  .lead { color: #9aa3b2; margin: 0 0 1.25rem; }
  .honesty { border: 1px solid #5c4a1a; background: #241c0d; color: #f0d78c; padding: .9rem 1.05rem; border-radius: 10px; margin: 0 0 1.4rem; }
  .honesty ul { margin: .4rem 0 0; padding-left: 1.2rem; }
  .card { border: 1px solid #2a3140; border-radius: 12px; padding: 1.1rem 1.2rem; background: #151922; margin: 0 0 1rem; }
  .banner { border: 1px solid #3d3420; background: #1b160c; color: #e6d19a; padding: .55rem .7rem; border-radius: 8px; font-size: .92rem; }
  .oneline { margin: .2rem 0 .6rem; }
  .meta a { margin-right: .85rem; }
  pre { background: #0e1014; padding: .75rem .9rem; overflow: auto; border-radius: 8px; font-size: .82rem; }
  code { font-size: .88rem; }
  .links a { margin-right: 1rem; }
  .cite { border: 1px solid #2a3140; border-radius: 12px; padding: 1rem 1.15rem; background: #12151c; margin: 0 0 1.4rem; }
  .fg-door { border: 1px solid #3d3420; background: #16120a; border-radius: 10px; padding: .75rem .85rem; margin: .75rem 0 0; }
  .fg-door p { margin: 0 0 .55rem; color: #e6d19a; font-size: .92rem; }
  .fg-ops { display: flex; flex-wrap: wrap; gap: .4rem; margin: 0 0 .55rem; }
  .fg-ops button { background: #241c0d; color: #f0d78c; border: 1px solid #5c4a1a; border-radius: 8px; padding: .35rem .65rem; cursor: pointer; font: inherit; font-size: .82rem; }
  .fg-ops button:hover { background: #33280f; }
  .fg-door textarea { width: 100%; min-height: 4.2rem; background: #0e1014; color: #e8eaef; border: 1px solid #2a3140; border-radius: 8px; padding: .5rem .6rem; font: .82rem/1.4 ui-monospace, monospace; box-sizing: border-box; }
  .fg-out { margin: .55rem 0 0; max-height: 16rem; }
  footer.donate { margin: 2.2rem 0 0; padding-top: 1rem; border-top: 1px solid #2a3140; }
  footer.donate p { margin: 0; color: #9aa3b2; }
`;

function donateFooterHtml() {
  return `<footer class="donate"><p><a href="${DONATE_CANONICAL}">${escapeHtml(DONATE_FOOTER_RUNTIME)}</a></p></footer>`;
}

function doorOnly(p) {
  return p && (p.slug === "azbrowser" || p.slug === "azmail" || p.slug === "aznet" || p.slug === "azhub" || p.slug === "azinterface" || p.slug === "4dmap" || p.slug === "embryolock");
}

function fragGateDoorHtml(p, origin) {
  if (!doorOnly(p)) return "";
  const live = (p.ops || [])
    .map((o) => o.op)
    .filter((op) => op !== "health" && op !== "skill");
  const buttons = ["health", ...live, "skill"]
    .map((op) => `<button type="button" data-op="${escapeHtml(op)}">${escapeHtml(op)}</button>`)
    .join("");
  const example = JSON.stringify(p.example || {}, null, 2);
  return `<div class="fg-door" data-slug="${escapeHtml(p.slug)}" data-origin="${escapeHtml(origin)}">
  <p>FragGate only — same LIVE_OPS as MCP <code>fraggate_call</code> / <code>POST /v1/fraggate/call</code>. One backend, two surfaces.</p>
  <div class="fg-ops">${buttons}</div>
  <textarea class="fg-payload">${escapeHtml(example)}</textarea>
  <pre class="fg-out">POST ${escapeHtml(origin)}/v1/fraggate/call
{ "slug": "${escapeHtml(p.slug)}", "op": "${escapeHtml(live[0] || "health")}", "payload": ${example} }</pre>
</div>`;
}

function fragGateDoorScript() {
  return `<script>
(function () {
  function parsePayload(raw) {
    var text = String(raw || "").trim();
    if (!text) return {};
    try { return JSON.parse(text); } catch (e) { return { q: text, text: text }; }
  }
  document.querySelectorAll(".fg-door").forEach(function (box) {
    var slug = box.getAttribute("data-slug");
    var origin = box.getAttribute("data-origin") || "";
    var out = box.querySelector(".fg-out");
    var area = box.querySelector(".fg-payload");
    box.querySelectorAll("[data-op]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var op = btn.getAttribute("data-op");
        var payload = parsePayload(area && area.value);
        out.textContent = "calling " + slug + "/" + op + " …";
        fetch(origin + "/v1/fraggate/call", {
          method: "POST",
          headers: { "content-type": "application/json", accept: "application/json" },
          body: JSON.stringify({ slug: slug, op: op, payload: payload })
        }).then(function (res) { return res.json(); }).then(function (body) {
          var title = body && body.display && body.display.title ? body.display.title : (slug + "/" + op);
          var summary = body && body.display && body.display.summary ? body.display.summary : "";
          out.textContent = title + (summary ? "\\n" + summary : "") + "\\n\\n" + JSON.stringify(body, null, 2);
        }).catch(function (err) {
          out.textContent = String(err && err.message ? err.message : err);
        });
      });
    });
  });
})();
</script>`;
}

function productCardHtml(p, origin, stats) {
  const u = productUrls(p, origin);
  const ops = doorOnly(p)
    ? p.ops
        .map((o) => `<code>POST /v1/fraggate/call { slug: "${p.slug}", op: "${o.op}" }</code> — ${escapeHtml(o.summary)}`)
        .join("<br>")
    : p.ops
        .map((o) => `<code>${o.method} /p/${p.slug}/${o.op}</code> — ${escapeHtml(o.summary)}`)
        .join("<br>");
  const banner = p.banner ? `<p class="banner">${escapeHtml(p.banner)}</p>` : "";
  const example = JSON.stringify(p.example, null, 2);
  const firstPost = p.ops.find((o) => o.method === "POST") || p.ops[0];
  const invokePre = doorOnly(p)
    ? `<pre>curl -s -A 'Mozilla/5.0' -X POST ${origin}/v1/fraggate/call \\
  -H 'content-type: application/json' \\
  -d '${JSON.stringify({ slug: p.slug, op: firstPost.op, payload: p.example || {} }).replace(/'/g, "’")}'</pre>`
    : `<pre>curl -X ${firstPost.method} ${origin}/p/${p.slug}/${firstPost.op} \\
  -H 'content-type: application/json' \\
  -d '${example.replace(/'/g, "’")}'</pre>`;
  const count =
    stats && typeof stats.downloads === "number"
      ? ` <span class="count">(${stats.downloads} counted)</span>`
      : "";
  const cite = citationFields(p, u);
  const doi = u.doi_url
    ? ` · <a href="${u.doi_url}">DOI ${escapeHtml(u.doi)}</a> <span class="slug">(${escapeHtml(cite.zenodo_status)})</span>`
    : ` · <span class="slug">Zenodo deposit needed</span>`;
  const ver = p.version ? ` <span class="slug">v${escapeHtml(p.version)}</span>` : "";
  const tarball = cite.software_tarball
    ? ` · package <code>${escapeHtml(cite.software_tarball.filename)}</code>`
    : "";
  return `<article class="card" id="${escapeHtml(p.slug)}">
  <h2><a href="${origin}/p/${p.slug}">${escapeHtml(p.name)}</a> <span class="slug">${escapeHtml(p.slug)}</span>${ver}</h2>
  <p class="oneline">${escapeHtml(p.oneLine)}</p>
  ${banner}
  <p class="meta">
    <a href="${p.github}">GitHub</a>
    <a href="${u.worker_home}">Worker /</a>
    <a href="${u.cite}">/cite.json</a>
    ${u.has_llms ? `<a href="${u.llms}">/llms.txt</a>` : ""}
    <a href="${u.download}">counted /download</a>${count}
    <a href="${u.install}">install.sh</a>
    <a href="${u.skill}">/v1/skill</a>
    <a href="${u.pull}">pull</a>
    <a href="${u.pull_skill}">pull skill</a>
    <a href="${origin}/p/${p.slug}/health">catalog proxy health</a>${doi}${tarball}
  </p>
  <p>Worker: <a href="${u.worker_home}">${escapeHtml(u.worker_home)}</a>
     · <a href="${u.openapi}">product OpenAPI</a>
     ${u.has_sitemap ? `· <a href="${u.sitemap}">Worker sitemap</a>` : ""}</p>
  <p>${ops}</p>
  ${invokePre}
  ${fragGateDoorHtml(p, origin)}
</article>`;
}

function catalogHtml(origin, statsMap) {
  const cards = PRODUCTS.map((p) => productCardHtml(p, origin, statsMap && statsMap[p.slug])).join("\n");
  const ld = JSON.stringify(jsonLd(origin));
  const citeProducts = PRODUCTS.map((p) => {
    const u = productUrls(p, origin);
    const cite = citationFields(p, u);
    const doi = p.doi
      ? ` — DOI <a href="https://doi.org/${p.doi}">${p.doi}</a> (${escapeHtml(cite.zenodo_status)})`
      : " — Zenodo software deposit needed (no DOI invented)";
    const ver = p.version ? ` ${escapeHtml(p.version)}` : "";
    return `<li><a href="${p.github}">${escapeHtml(p.name)}</a>${ver}${doi} · <a href="${u.download}">counted tarball</a></li>`;
  }).join("");
  return `<!doctype html>
<html lang="en">
<head>
${headMeta(origin, CATALOG_TITLE, CATALOG_DESCRIPTION, "/")}
<script type="application/ld+json">${ld}</script>
<style>${PAGE_CSS}</style>
</head>
<body>
  <div class="brandrow">
    <img class="brandmark" src="/sigil.png" width="40" height="40" alt="Everblooming sigil — Aziel Eliab" decoding="async">
    <p class="stamp">Everblooming sigil · Aziel Eliab</p>
  </div>
  <h1>Aziel Eliab Runtime</h1>
  <p class="lead"><strong>1.7.10</strong> makes QNM <strong>Live Nodes</strong> durable — suite-presence is operator-enabled; <code>GET /v1/mesh</code> never enables; cron or request-path fans out live Softwares product Workers while enabled (TTL 5 min). <strong>1.7.9</strong> cross-maps <strong>AZCoherence</strong> (peers AZ-CLCE / AZInterface / AKM-TRIAD fabric neighbor; hubs + Worker URL; domain stays null). <strong>1.7.8</strong> lands <strong>EmbryoLock</strong> as a true in-process engine — live-with-local-destructive-boundary (health/skill/doctor/verify-hash/policy cite; wipe/unlock stay FG-STUB on the public mesh; worker_home <code>embryolock-download-tracker</code>). <strong>1.7.7</strong> lands <strong>AZCoherence</strong> (AZC-0.1) as a true in-process FragGate Softwares engine — second-pass triad coherence (primary vs alternate → PASS / FLAG / NEUTRALIZE / REFUSE). Cite <a href="https://github.com/AzielEliab/AZCoherence">github.com/AzielEliab/AZCoherence</a>. Never invents evidence. Confidence ≠ truth. Not AKM-TRIAD fabric. Softwares-tab Plain A–Z. <strong>1.7.6</strong> syncs 4DMap LIVE_OPS with product <code>0.2.0</code> — <code>pin</code>, <code>span</code>, <code>stack</code>, <code>gap</code>, <code>fork</code>, <code>walk</code>, <code>lens</code>, <code>class</code>, <code>cohort</code>, <code>absence</code>, <code>cap</code>, <code>join</code>, <code>list</code>, <code>example</code>, plus <code>frame_status</code>, <code>axis_describe</code>, <code>walk_trace</code>, <code>card_export</code>, <code>card_import</code>, <code>verify_chain</code>, <code>neighbor_cite</code>. Inspection frame after AZPIPE, not an extra door. <strong>1.7.5</strong> is Softwares capability wave 1 — richer health/skill plus doctor/verify/import_export (or window/gates/schema/targets) on DecisionGATE, ForgeReceipts, TemporalLock, StaticClock, ChronoLock, TrajectoryLock, SpectralLock. Checklist: <code>docs/audit/SUITE-CAPABILITY-CHECKLIST.md</code>. <strong>1.7.4</strong> enhances 4DMap LIVE_OPS — <code>frame_status</code>, <code>axis_describe</code>, <code>walk_trace</code>, <code>card_export</code>, <code>card_import</code>, <code>verify_chain</code>, <code>neighbor_cite</code>. Inspection frame after AZPIPE, not an extra door. <strong>1.7.3</strong> aligns audit WARN copy — refuse <code>exist.mcp</code> points at live <code>tools/list</code>; public FragGate call stays open; Softwares-tab count includes placements vs isolation 33; 4DMap is an inspection frame, not an extra door. <strong>1.7.2</strong> adds <code>GET /v1/azpipe/arch</code> — MASTER-33 AZPIPE cite/read (same payload as <code>GET /v1/fraggate</code> <code>pipeline</code>; not a Softwares-tab door). <strong>1.7.1</strong> adds AKM-TRIAD-1.0 (adaptive recollection, Bayesian calibration, 3-of-4 triad; not Softwares-tab; behind FragGate). <strong>1.7.0</strong> locks MASTER-33: <code>${LOCKED_STRIP}</code>. DecisionGATE sits after ChainLock-IN and before domain exec. 4DMap is the inspection frame after AZPIPE — not an extra door. LambGate is not a hop. FoldLock fld3-wire stays internal to AZPIPE. <strong>1.6.14</strong> adds <strong>4DMap</strong> (4DM-WP-1.0) as a true in-process engine — four-axis inspection frame T/Δ/Γ/Π at the Domain Door / inspection layer after AZPIPE routes to isolated engines. Not a sequential gate. FragGate claims cite join types. ChainLock may stamp walks. <strong>1.6.13</strong> aligns the suite <strong>QNM-BUILD-1.0</strong> rollup (companion to AIH-WP-1.1) — <code>GET /v1/mesh</code> live/locked/isolated counts, MCP <code>mesh_*</code>, FragGate <code>slug=mesh</code>. Default radios <strong>OFF</strong>. LIVE only after the operator declares a bearer. Not a login mesh. Full node process is local <code>qnm-node/</code>. Anon-broadcast is that process's sibling loopback module only — never a publish path. AZMail <code>mesh_*</code> stays product-local. <strong>1.6.12</strong> publishes the authoritative hub catalog at <code>GET /v1/software</code> (mirror <code>/v1/fraggate/software</code>) — every product plus EmbryoLock stub, sorted Plain A–Z → Gate A–Z → Lock A–Z (Clock ≠ Lock) — plus <code>GET /v1/update/check</code> for install.sh / local UIs / mobile. <strong>1.6.11</strong> adds a durable FragGate <strong>UI-op alias map</strong> so Worker button names agents copy resolve to catalog LIVE_OPS (forward to the real engine method). EmbryoLock is named <strong>stub / local-not-hosted</strong> (describe?slug=embryolock; not a Worker; not a FragGate engine). <strong>1.6.10</strong> sets AZBrowser and AZNet catalog one_line to <strong>separate software</strong> (not engine). <strong>1.6.9</strong> frames <strong>AZHub</strong> and <strong>AZInterface</strong> as sibling softwares under the same FragGate door. <strong>1.6.8</strong> added <strong>AZHub</strong> (AIH-WP-1.0, Blank Key) and <strong>AZInterface</strong> (AIH-WP-1.0, custodial page cycles) as two separate softwares under the same FragGate door — never one combined product, never nested in AZBrowser or AZNet. Reached only via <code>POST /v1/fraggate/call</code> with <code>{ slug: "azhub", op }</code> or <code>{ slug: "azinterface", op }</code>. <strong>1.6.7</strong> adds <strong>AZNet</strong> (AZN-WP-0.1) as a separate FragGate-live product — own Worker <code>aznet-download-tracker</code>, own UI. Silent verification side-net: hash stamps, custodian garden of hash refs, memorial ledger, integrity refuse/isolate. Never hosts payloads. Garden / stamp / memorial ops require AZBrowser <code>pair_token</code> AND <code>pair_flag</code> (functional order only — do not nest inside AZBrowser chrome). Reached only via <code>POST /v1/fraggate/call</code> with <code>{ slug: "aznet", op }</code>. <strong>1.6.6</strong> adds <strong>AZBrowser</strong> (AZB-1.0) as a FragGate-live engine — Lamb Lens ethical research browser. Cite; refuse harmful harvest; never invent visit results. Not Chromium. Reached only via <code>POST /v1/fraggate/call</code> with <code>{ slug: "azbrowser", op }</code>. MCP <code>fraggate_list</code> / <code>fraggate_call</code> and the Worker UI buttons on this page share that same <code>LIVE_OPS.azbrowser</code> backend. <strong>1.6.5</strong> adds <strong>AZMail</strong> (APP 1.0) as a FragGate-live engine — anonymous MCP mesh (default off) + advisory airlock. Not a full internet MTA. Reached only via <code>POST /v1/fraggate/call</code> with <code>{ slug: "azmail", op }</code> (host <code>/runtime</code> proxies that same door). <strong>1.6.4</strong> adds <strong>PeaceLock</strong> (PL-WP-0.1) as a true in-process engine — chosen silence / chosen inaction receipts, HARD_DUTY refuse, ABSENT transcript/counterfactual/motive. <strong>1.6.3</strong> adds KV-backed API use trackers (<a href="${origin}/v1/uses">/v1/uses</a>) so every public host point can keep usage logs. <strong>1.6.2</strong> widens the public FragGate door to sensible advisory engines; stub verbs still refuse. <strong>1.6.1</strong> lists every major OpenAPI / MCP / HTTP client (not only ChatGPT, Grok, and Venice). <strong>1.6.0</strong> is the <strong>FragGate door</strong> over the catalog — one door: discover, route, refuse. <strong>1.5.0</strong> was the agent-native flat product-tool pile. Human software — this Worker UI, Flutter <code>mobile/</code>, local install, counted <code>/download</code> — stays complete. Catalog + pull + proxy + session + <strong>in-process engines</strong> for every catalog Software slug. ${PRODUCTS.length} products including the <a href="${LIBRARY_ORIGIN}/">Aziel Digital Library</a>. Kernel: <a href="https://github.com/AzielEliab/fraggate">fraggate</a>. Forks welcome. Apache-2.0. Author: <strong>Aziel Eliab</strong> (also known as Aziel Elroi Eliab).</p>
  <div class="honesty">
    <strong>What this Worker is</strong>
    <ul>
      <li><strong>1.1.0</strong> was catalog + pull + proxy that started calling itself a runtime. Those front doors stay. They are not exec.</li>
      <li><strong>1.2.0</strong> added a session Durable Object and hash-chained receipts. Exec still proxied to product Workers.</li>
      <li><strong>1.3.0</strong> vendored portable engines and ran them <em>inside this Worker isolate</em> for listed slugs. Receipts include <code>engine_digest</code> and <code>ran_in</code>.</li>
      <li><strong>1.4.0</strong> vendors a true engine for <em>every</em> catalog Software slug. <code>engine_slugs</code> equals <code>true_engine_slugs</code>. Binding-only ops (KV / D1 / AI / live media) stay per-op <code>proxy_fallback</code>.</li>
      <li><strong>1.4.1</strong> production gates: <code>GET /v1/ready</code> (SESSION binding; 503 if <code>REQUIRE_TOKEN=1</code> and <code>RUNTIME_TOKEN</code> missing). HEAD on health/ready/runtime/skill. Authority JSON is <code>Cache-Control: no-store</code>. Receipt cap 64. Session TTL 6h. 20 opens / 60 execs per IP per minute. Optional token on session mutate only.</li>
      <li><strong>1.5.0</strong> agent-native MCP: product verbs return a <code>display</code> envelope; <code>runtime_run</code> auto-opens a session; session/health/manifest tools are advanced/internal. Dual surface: no technical UI chrome for agents; human UIs unchanged.</li>
      <li><strong>1.6.0</strong> FragGate door: hashed registry, thin MCP <code>tools/list</code>, <code>fraggate_call</code> is the default exec path, DecisionGATE before exec, ask/refuse ledger. Flat <code>{slug}_{op}</code> names are not listed. Kernel: <a href="https://github.com/AzielEliab/fraggate">github.com/AzielEliab/fraggate</a>.</li>
      <li><strong>1.6.1</strong> lists every major OpenAPI / MCP / HTTP client: ChatGPT, Grok, Venice, Claude, Cursor, Glama, Perplexity, Copilot, Gemini, Mistral, Meta AI, Apple Intelligence, Amazon Q, DuckAssist, You.com, Cohere, plus other MCP/OpenAPI-capable assistants. Crawl copy names the robots.txt Allow set (${crawlerAllowSentence()}).</li>
      <li><strong>1.6.2</strong> widens the public FragGate <code>LIVE_OPS</code> door to every catalog Software product that makes sense on a public agent door (advisory / score / classify / gate / search / preview / render / verify / hash / receipt / game / overlay / route / status). VeilLock stays <code>local_only</code>. Stub verbs still refuse. MCP <code>tools/list</code> stays the thin FragGate surface.</li>
      <li><strong>1.6.3</strong> KV-backed API use trackers: <code>GET /v1/uses</code> (alias <code>/v1/stats</code>). Counts host / method / path / op / day. Ring log (~100) has no Authorization, tokens, bodies, or PII. Distinct from product download-trackers and the FragGate ledger. Proxies may set <code>X-Aziel-Runtime-Via</code> or <code>X-Aziel-Runtime-Host</code> (<code>origin</code>, <code>azieleliab.com</code>, <code>godlock.uk</code>, <code>azielcorpuslibrary.net</code>).</li>
      <li><strong>1.6.4</strong> adds PeaceLock (PL-WP-0.1) as a true in-process engine with <code>engine_digest</code>. Public FragGate ops: open, seal, break, show, verify, stamp, upload_envelope. Transcript / motive / counterfactual / waive-duty stay stub. HARD_DUTY refuses a silence/inaction receipt.</li>
      <li><strong>1.6.5</strong> adds AZMail (APP 1.0) as a FragGate-live engine with <code>engine_digest</code>. Public FragGate ops: airlock_classify, scrub, trust_score, mesh_post, mesh_poll, mesh_listen, mesh_enable, mesh_disable, keyword_alert_*. SMTP / deanonymize / harvest stay stub. Mesh default off. <code>mesh_disable</code> is always allowed. Reached only via FragGate — not a side door. Host <code>/runtime</code> proxies the same door.</li>
      <li><strong>1.6.6</strong> adds AZBrowser (AZB-1.0) as a FragGate-live engine with <code>engine_digest</code>. Public FragGate ops: ethical_search, lamb_lens_search, navigate, airlock_ingest, tab_open, tab_list, receipt_list, verify, receipt_verify. Lamb Lens cites; refuses harmful harvest; never invents visit results. <code>navigate</code> is advisory metadata only — no raw HTML. tor_exit / phoenix_wipe / chromium / unrestricted proxy stay stub. MCP <code>tools/list</code> stays the thin FragGate door; <code>fraggate_list</code> / <code>fraggate_call</code> and the Worker UI buttons call the same LIVE_OPS.</li>
      <li><strong>1.6.7</strong> adds AZNet (AZN-WP-0.1) as a separate FragGate-live product with <code>engine_digest</code> (own Worker <code>aznet-download-tracker</code>, own UI). Public FragGate ops: health, pair_status, garden_list, stamp, verify_hash, memorial_list, memorial_append (terminal only), receipt_verify, skill. payload_host / serve_content_for_peer / analytics / ranking / repair_integrity_bypass / interface / lumen / hub stay stub. Garden / stamp / memorial ops require AZBrowser pair_token AND pair_flag (functional order only). Never hosts payloads. StaticClock stamps + TemporalLock-style receipt fields ride on ops.</li>
      <li><strong>1.6.8</strong> adds AZHub and AZInterface as two separate softwares under the same FragGate door (AIH-WP-1.0) with <code>engine_digest</code>. AZHub LIVE_OPS: region_list, place_module, remove_module, tether_declare, tether_cut, tether_list, blank_key_status. AZInterface LIVE_OPS: genesis_status, site_state_get, site_state_set, integrity_check, witness_list, page_cycle_status. Page cycles are pre-locked: OFF / integrity / ON / FULL SHUTDOWN / MEMORIAL. Hub refuses auto-unlock / completeness. Never one combined product. Not nested in AZBrowser or AZNet. scorch_remote / auto_unlock / ranking / completeness_detect stay stub.</li>
      <li><strong>1.6.9</strong> frames AZHub and AZInterface as sibling softwares on the same FragGate door. Catalog one_line / description / skill corrected. Two catalog slugs stay. Architecture unchanged.</li>
      <li><strong>1.6.10</strong> sets AZBrowser one_line to “AZNet is a separate software” and AZNet one_line to “Separate software; functional-order pair”. Same FragGate door. Two catalog slugs stay.</li>
      <li><strong>1.6.11</strong> adds a durable FragGate UI-op alias map: azhub list_modules→region_list, place→place_module; azinterface genesis_boot→genesis_status, hold→page_cycle_status; azbrowser airlock→airlock_ingest, home→health; azmail classify→airlock_classify; aznet doctor→health, pair→pair_status; peacelock doctor→health. Aliases appear in list/describe live_ops and forward to the real engine method. EmbryoLock is a named stub / local-not-hosted registry entry (name only; not a hosted Worker; not a FragGate engine). 33 catalog slugs stay.</li>
      <li><strong>1.6.12</strong> adds <code>GET /v1/software</code> (also <code>GET /v1/fraggate/software</code>) so hubs fetch one sorted catalog on each Software-tab request — Plain A–Z → Gate A–Z → Lock A–Z (Clock ≠ Lock), every product plus EmbryoLock stub. Client update check: <code>GET /v1/update/check?slug=&amp;version=</code> and <code>GET /v1/update/manifest</code> for install.sh / local UIs / mobile. GitHub Action deploys on push to main. MCP pipeline stays list → describe → call. Sibling software under one FragGate door — never separate FragGate engines.</li>
      <li><strong>1.7.10</strong> makes QNM Live Nodes durable: suite-presence is operator-enabled; <code>GET /v1/mesh</code> never enables; cron (<code>*/2 * * * *</code>) or request-path fans out join/heartbeat for every live Softwares product Worker (<code>node_id</code> <code>{slug}-worker</code>, no <code>|</code>; TTL 5 min). Product Workers proxy <code>/v1/mesh/*</code> via <code>AZIEL_RUNTIME</code>. Not a login mesh. Not Node Gate.</li>
      <li><strong>1.7.9</strong> cross-maps AZCoherence: catalog + engine <code>peers</code> / <code>cross_map</code> (azclce peer scorer, AKM-TRIAD fabric neighbor not merged, AZInterface, Softwares hubs, product Worker URL). azclce reciprocates. Domain stays null (scoring-review placement; same pattern as decisiongate/forgereceipts).</li>
      <li><strong>1.7.8</strong> lands EmbryoLock as a true in-process engine with <code>engine_digest</code>. Vault/Custody isolation label (with ARK). Public FragGate ops: health, skill, doctor, verify_hash, policy, limitation. Wipe / scorch / unlock-after-fail stay stub — Never execute on the public mesh. Catalog surface live-with-local-destructive-boundary. Softwares <code>worker_home</code> <code>https://embryolock-download-tracker.vibelock.workers.dev/</code>. AZChat stays name-only stub.</li>
      <li><strong>1.7.7</strong> lands AZCoherence (AZC-0.1) as a true in-process FragGate Softwares engine with <code>engine_digest</code>. Public FragGate ops: health, skill, doctor, verify, review_triad, alternate_score, coherence_check, neutralize_hallucination. invent_evidence / truth_score / akm_calibrate stay stub. Scoring-review placement (AZ-CLCE adjacent). Not a 34th MASTER-33 isolation software. Not AKM-TRIAD fabric. Product cite <a href="https://github.com/AzielEliab/AZCoherence">github.com/AzielEliab/AZCoherence</a>. Mesh stays default-off.</li>
      <li><strong>1.7.6</strong> syncs 4DMap (4DM-WP-1.0) in-process LIVE_OPS with product 0.2.0: pin, span, stack, gap, fork, walk, lens, class, cohort, absence, cap, join, list, example, plus frame_status, axis_describe, walk_trace, card_export, card_import, verify_chain, neighbor_cite. Stubs stay. <code>layer=inspection_frame</code>. Not a sequential gate and not an extra door. Catalog version 0.2.0. <code>engine_digest</code> is the runtime isolate artifact — GitBaby deploys the product Worker. Mesh stays default-off.</li>
      <li><strong>1.7.5</strong> Softwares capability wave 1: DecisionGATE / ForgeReceipts / TemporalLock / StaticClock / ChronoLock / TrajectoryLock / SpectralLock get rich health/skill plus domain-true doctor/verify/import_export (or window/gates/schema/targets). Catalog <code>one_line</code> is capability-forward. LIVE_OPS matches engine ops. Checklist <code>docs/audit/SUITE-CAPABILITY-CHECKLIST.md</code>. AKM-TRIAD-1.0 stays LIVE fabric (not Softwares-tab). 4DMap 1.7.4 inspection-frame ops stay. Mesh stays default-off. EmbryoLock / AZChat stay stubs.</li>
      <li><strong>1.7.4</strong> enhances 4DMap (4DM-WP-1.0) in-process LIVE_OPS: frame_status, axis_describe, walk_trace, card_export, card_import, verify_chain, neighbor_cite. Stubs stay. <code>layer=inspection_frame</code>. Not a sequential gate and not an extra door. Product 4dmap is still 0.1.0 on main — sync <code>engine_digest</code> after product 0.2.0 deploys. Mesh stays default-off.</li>
      <li><strong>1.7.3</strong> aligns audit WARN copy: refuse <code>exist.mcp</code> lists the live MCP tool set and points at <code>POST /mcp tools/list</code>. Public FragGate call stays open; session mutate requires token when configured. Softwares-tab <code>count</code> includes placements (<code>azinterface</code> / <code>decisiongate</code> / <code>forgereceipts</code>); isolation <code>software_count</code> is 33 (<code>domains_are_doors:false</code>). 4DMap catalog copy is inspection frame / not an extra door. OpenAPI lists <code>POST /mcp</code>. Mesh stays default-off.</li>
      <li><strong>1.7.2</strong> adds <code>GET /v1/azpipe/arch</code> (POST allowed as the same cite). Returns the locked MASTER-33 AZPIPE arch/strip — same payload FragGate already exposes as <code>pipeline</code> / <code>pipeline_strip</code>. Cite/read only. Not a Softwares-tab door. Not a FragGate slug. Mesh stays default-off.</li>
      <li><strong>1.7.1</strong> adds AKM-TRIAD-1.0: Adaptive Knowledge Recollection, Bayesian Calibration &amp; 3-of-4 Triad Selection. ChainLock remains the immutable learn ledger; the adaptive index is derived and rebuildable. Memory APIs behind FragGate. Not a Softwares-tab product. Posterior ≠ truth. No rollback.</li>
      <li><strong>1.7.0</strong> locks MASTER-33: Human → AZInterface → PUBLIC/UI/AGENT/API → FragGate → Lamb Lens → SweepGate → Sentinel → Provenance/Input Packet → ChainLock-IN → DecisionGATE → AZPIPE → Internal Domain Layer → optional ASE → RoseClock (forward-only) → TemporalLock → ChainLock-OUT → ForgeReceipts → Return. FragGate is THE single door. Lamb Lens is fabric after FragGate (not a second door). 11 domains / 33 softwares are isolation labels. AZChat is a name-only stub. RoseClock sequence never decreases. No rollback. Identity Aziel Eliab only.</li>
      <li><strong>1.6.15</strong> locked the suite hop order (SUITE-PIPE-1.6.15; historical, kept). PUBLIC/UI/Agents → FragGate → SweepGate → ChainLock-IN → DecisionGATE → AZPIPE → Domain Doors (4DMap inspection) → TemporalLock → StaticClock → ChainLock-OUT → Response/Receipt. LambGate is not a hop. Illegal reorder is refused.</li>
      <li><strong>1.6.14</strong> adds 4DMap (4DM-WP-1.0) as a true in-process engine with <code>engine_digest</code>. Public FragGate ops (then): health, skill, card_new, card_pin, card_span, card_join, card_walk, card_list, verify_hash. truth_score / lumen_panel / invent_mark / backdate_class stay stub. Four-axis inspection frame T/Δ/Γ/Π after AZPIPE — not a sequential gate and not an extra door. Plain bucket. worker_home <code>https://4dmap-download-tracker.vibelock.workers.dev/</code>. mesh.enabled_default false. qns_cd pointer like peers. FragGate claims cite join types. 34 catalog slugs.</li>
      <li><strong>1.6.13</strong> aligns the suite QNM rollup to <code>QNM-BUILD-1.0</code> (companion to AIH-WP-1.1): <code>GET /v1/mesh</code> / <code>/status</code> expose live/locked/isolated counts only (never enables; views/MCP/downloads do not enter QNM-S). <code>POST /v1/mesh/enable</code> requires a declared bearer. <code>POST /v1/mesh/disable</code> drops tethers clean. Keep join/heartbeat/leave/nodes plus optional hash-only broadcast (never a publish path). Default radios OFF. Not a login mesh, not Node Gate/IP panel, not login-recovery, not upload proxy. Full node process is local <code>qnm-node/</code> (boot/chain/apg/bearers/outbox/phoenix/score/memorial/tethers). Anon-broadcast is that process's sibling loopback module only. MCP <code>mesh_*</code> and FragGate <code>slug=mesh</code> share the rollup. Each <code>/v1/software</code> card carries <code>mesh: { path, enabled_default: false, spec, companion, rollup_only, qnm_s: false }</code>. AZMail mesh stays the product-local mail ring. Docs: <code>docs/NODE_MESH.md</code>.</li>
      <li>AZAI in-process is Lamb check only — not the local blend. AZBot is a skill router, not a model. Aziel Digital Library in-process searches a bundled sample MASTER; live D1 stays per-op proxy.</li>
      <li><code>POST /p/{slug}/{op}</code> is a <em>proxy</em>. Proxy without a session receipt is not exec.</li>
      <li>Cloudflare's Worker / Durable Object isolate <em>is</em> the jail. No extra guest isolate is claimed. <code>engine_digest</code> is still required.</li>
      <li>Closest true local blends remain <code>azai serve</code>, <code>forgereceipts ui</code>, <code>azos ui</code>.</li>
      <li>Hosted AZAI is a protocol mirror + Lamb check, <em>not</em> the local blend.</li>
      <li>No counted runtime tarball. CLI is in-repo: <code>node cli/aziel-runtime.mjs</code>.</li>
    </ul>
    <strong>Product honesty banners</strong>
    <ul>
      <li>GodLock and MirageGrid are <em>not</em> VPNs and not anonymity networks.</li>
      <li>ForgeReceipts is <em>not</em> legal advice and does not contact courts.</li>
      <li>ZionPattern Solver never claims more than 75% confidence. It does not solve cases.</li>
      <li>VeilLock does <em>not</em> inject into FaceTime or any calling app.</li>
      <li>AZ-CLCE detects inconsistency, not intent. Type D is a label only.</li>
      <li>ChronoLock is advisory only — not a scheduler, not targeting, not virality. 08:30–10:30 local. Distinct from TemporalLock.</li>
      <li>The ARK is <em>not</em> a kernel. Hosted API never unlocks or encrypts with a passphrase and never stores vaults. Sweep is Mode E heuristics only.</li>
      <li>AZAI is a local OpenAI-compatible runtime, not a new foundation model. Hosted /v1 is a protocol mirror + Lamb check, not a provider proxy. Jeeves is not sovereign.</li>
      <li>SpectralLock hosted overlay is a 256px preview, not a spectrometer, not forensic.</li>
      <li>EmployeeLock is <em>not</em> a court, not UL, not a truth score. Hosted never stores xlsx. Demo rows are format proof, not case facts.</li>
      <li>FoldLock is <em>not</em> zip. Hosted preview is tether-suppression on small UTF-8 text. Ratios are receipts, not trophies.</li>
      <li>WhistleLock is a local vault + dead-man copy. It is <em>not</em> a mailer. Hosted never holds whistle files.</li>
      <li>TrajectoryLock is a research prototype / auditable geometric test. <em>Not</em> a certified forensic instrument. Hosted never stores media. Synthetic examples are not real-case findings.</li>
      <li>Aziel Corpus Library is a public library index + counted PDF/package download. It is <em>not</em> a search engine of private files, not Zenodo, and not a new Lock engine.</li>
      <li>AzielTether is <em>not</em> a VPN. Prefer-central mesh for downloaded Aziel Eliab software; public HTTPS stays mesh-free.</li>
      <li>PeaceLock is chosen silence / chosen inaction as a receipt (PL-WP-0.1). It is <em>not</em> a transcript, not a counterfactual, not a motive score, and not a HARD_DUTY waiver. Hosted never invents speech or stores files.</li>
      <li>AZMail is an anonymous MCP mesh + advisory airlock (APP 1.0). It is <em>not</em> a full internet MTA, not SMTP, not identity. Mesh default off. Reached only via FragGate. VPN/hop mesh is still not claimed on this public surface. AZMail <code>mesh_*</code> stays product-local; the suite QNM surface is rollup + operator enable, not that ring.</li>
      <li>The suite QNM surface is <code>QNM-BUILD-1.0</code> rollup (live/locked/isolated) plus operator bearer enable. It is <em>not</em> a login mesh, not login-recovery, not Node Gate/IP panel, not AnonBroadcast as a Softwares-tab product, not an upload proxy, not origin-hiding, not QNM-S. Default radios OFF. Full node process is local <code>qnm-node/</code>. Anon-broadcast is that process's sibling loopback only — never a publish path. <code>azieleliab.com</code> hosts published software/runtime only.</li>
      <li>AZBrowser is the Lamb Lens ethical research browser (AZB-1.0). It is <em>not</em> Chromium, not a Tor exit, not an unrestricted proxy, and not surveillance. Lamb Lens cites; refuses harmful harvest; never invents visit results. Reached only via FragGate. AZNet is separate software (same FragGate door) — pairing is order/token only, not a shared Phase-1 UI.</li>
      <li>AZNet is a silent verification side-net (AZN-WP-0.1). It is <em>not</em> a payload host, not a CDN, not analytics, not an integrity-repair bypass. Own Worker / own UI. Garden / stamp / memorial ops require AZBrowser pairing token AND flag (functional order only). Hosted never stores payloads.</li>
      <li>AZHub is a Blank Key / neutral spatial container (AIH-WP-1.0). It does <em>not</em> interpret meaning, does <em>not</em> auto-unlock, and does <em>not</em> fire completeness events. AZInterface is a <em>separate</em> product.</li>
      <li>AZInterface is a custodial operating environment (AIH-WP-1.0). Page cycles are pre-locked: OFF / integrity / ON / FULL SHUTDOWN / MEMORIAL. It is <em>not</em> AZHub. Auto-unlock / ranking / completeness_detect stay stub.</li>
      <li>M.I.A.Lock Doe hits are compatibility leads only — never an ID. Coverage heat is not presence. No live tracking.</li>
      <li>4DMap is a four-axis inspection frame T/Δ/Γ/Π (4DM-WP-1.0). It is <em>not</em> a sequential gate, not a truth score, not a Lumen panel, and not an extra door (<code>domains_are_doors:false</code>). It does not invent marks or backdate class. Inspection frame after AZPIPE. Neighbors TemporalLock / StaticClock / ChronoLock / TrajectoryLock / SpectralLock. FragGate claims cite join types. ChainLock may stamp walks.</li>
    </ul>
  </div>
  <section class="cite" id="cite">
    <h2>How to cite</h2>
    <p>Author: <strong>${escapeHtml(AUTHOR_NAME)}</strong> (also known as ${escapeHtml(AUTHOR_ALTERNATE_NAME)}) · Runtime: <a href="${origin}/">${origin}/</a> · License: Apache-2.0 · Machine-readable: <a href="${origin}/cite.json">/cite.json</a></p>
    <p>${escapeHtml(citeHowToRuntime(origin))}</p>
    <p>${escapeHtml(citeHowToLibrary())} · <a href="${LIBRARY_CITE}">Digital Library /cite.json</a> · <a href="${LIBRARY_LLMS}">/llms.txt</a></p>
    <p class="lead">Known DOIs are historical. Zenodo currently returns HTTP 410 (user blocked) for every wired record. FoldLock and WhistleLock share method-paper DOI 10.5281/zenodo.22257762 on purpose — WhistleLock still needs its own software deposit. No DOIs are invented here.</p>
    <ul>${citeProducts}</ul>
  </section>
  <p class="links">
    <a href="${origin}/v1/skill">/v1/skill</a>
    <a href="${origin}/v1/fraggate">/v1/fraggate</a>
    <a href="${origin}/v1/runtime.json">/v1/runtime.json</a>
    <a href="${origin}/v1/session/open">/v1/session/open</a>
    <a href="${origin}/v1/bundle">/v1/bundle</a>
    <a href="${origin}/openapi.json">Combined OpenAPI 3.1</a>
    <a href="${origin}/v1/catalog.json">/v1/catalog.json</a>
    <a href="${origin}/v1/software">/v1/software</a>
    <a href="${origin}/v1/update/check">/v1/update/check</a>
    <a href="${origin}/llms.txt">/llms.txt</a>
    <a href="${origin}/ai.txt">/ai.txt</a>
    <a href="${origin}/sitemap.xml">/sitemap.xml</a>
    <a href="${origin}/sitemap-index.xml">/sitemap-index.xml</a>
    <a href="${origin}/robots.txt">/robots.txt</a>
    <a href="${origin}/mcp">MCP (POST JSON-RPC)</a>
    <a href="${origin}/v1/health">/v1/health</a>
    <a href="${origin}/v1/uses">/v1/uses</a>
    <a href="${origin}/v1/mesh">/v1/mesh</a>
    <a href="${origin}/v1/qns">/v1/qns</a>
    <a href="${origin}/v1/azpipe/arch">/v1/azpipe/arch</a>
    <a href="${origin}/v1/memory">/v1/memory</a>
    <a href="${origin}/v1/ready">/v1/ready</a>
    <a href="https://www.azielcorpuslibrary.net/runtime">Library /runtime</a>
    <a href="https://github.com/AzielEliab/aziel-runtime">GitHub</a>
  </p>
  <p id="pipeline"><strong>Locked MASTER-33 pipeline</strong> (1.7.0 — FragGate is THE single door; not LambGate): <code>${LOCKED_STRIP}</code>. Lamb Lens is fabric after FragGate. Internal Domain Layer holds isolated softwares — domains are labels, not doors. RoseClock is forward-only. FoldLock fld3-wire stays internal to AZPIPE. SweepGate / ChainLock / AZPIPE / Lamb Lens / Sentinel / RoseClock are fabric, not Softwares-tab. 4DMap is cited inside the domain layer. Illegal reorder is refused.</p>
  <p>LIVE fabric (not Softwares-tab): AZPIPE, SweepGate, ChainLock, LOCKSET, packed catalog, Lamb Lens, Sentinel, RoseClock, <strong>QNS-CD-1.0</strong> (photon QNS1 1.3; local <code>qnsd</code>; Worker cites only), MASTER-33 (SUITE-PIPE-1.6.15 historical), <strong>AKM-TRIAD-1.0</strong> (adaptive recollection; Bayesian posterior ≠ truth; behind FragGate). MCP <code>chainlock_*</code> and <code>memory_*</code>. <code>GET /v1/mesh</code> never enables. <code>GET /v1/qns</code> cites the packet-transfer coding design — it does not proxy local via emit. <code>GET /v1/azpipe/arch</code> cites the locked MASTER-33 strip (same payload as <code>GET /v1/fraggate</code> <code>pipeline</code>; not a Softwares-tab door). UI=MCP. No Node Gate.</p>
  <p>Donation is a static hub tab (<a href="${DONATE_CANONICAL}">${escapeHtml(DONATE_CANONICAL)}</a>) — AZL-DONATE-1.0. Canonical rails live on hubs; this runtime only links. Hub Donate pages include five QRs that encode payment URIs (BTC / ETH / LTC / XRP / DOGE). No KV, no invented wallets, no five QRs on this Worker.</p>
  <p>Designs (git-hosted papers — not Softwares-tab products, not a FragGate slug; <code>GET /v1/mesh</code> never enables): <a href="${DESIGNS_GITHUB_TREE}">docs/designs/</a>${SUITE_DESIGNS.map((d) => ` · <a href="${designGithubUrl(d.file)}">${escapeHtml(d.id)}</a>`).join("")}. Author: Aziel Eliab only. PDFs sit beside each paper on GitHub.</p>
  <p>Feature-state audit (authoritative intentional-OFF vs gaps for 1.7.3+; not a Softwares-tab product, not a FragGate slug): <a href="${auditGithubUrl(FEATURE_STATE_AUDIT.file)}">${escapeHtml(FEATURE_STATE_AUDIT.id)}</a> · <a href="${auditGithubUrl(FEATURE_STATE_AUDIT.pdf)}">PDF</a> · <a href="${AUDIT_GITHUB_TREE}">docs/audit/</a>. Constitutional OFF set (33 items; correctly OFF/REFUSED/GATED is not a gap): <a href="${designGithubUrl(REMAIN_OFF_BY_DESIGN.file)}">${escapeHtml(REMAIN_OFF_BY_DESIGN.id)}</a> · <a href="${designGithubUrl(REMAIN_OFF_BY_DESIGN.pdf)}">PDF</a>. Do not enable mesh or safety stubs. Author: Aziel Eliab only.</p>
  <h2>Session (the actual cut)</h2>
  <ol>
    <li><code>POST ${origin}/v1/session/open</code></li>
    <li><code>POST ${origin}/v1/session/{id}/policy</code></li>
    <li><code>POST ${origin}/v1/session/{id}/exec</code> body <code>{slug, op, payload}</code></li>
    <li><code>GET ${origin}/v1/session/{id}/receipt</code></li>
    <li><code>POST ${origin}/v1/session/{id}/close</code></li>
  </ol>
  <h2>Pull + proxy (front doors — not exec)</h2>
  <ol>
    <li><code>GET ${origin}/v1/skill</code></li>
    <li><code>GET ${origin}/v1/runtime.json</code> — machine manifest (<code>role=engine-runtime</code>)</li>
    <li><code>GET ${origin}/v1/bundle</code> — every product skill URL + invoke prefix</li>
    <li><code>GET ${origin}/v1/pull/{slug}</code> then <code>GET ${origin}/v1/pull/{slug}/skill</code></li>
    <li><code>GET</code> or <code>POST ${origin}/p/{slug}/{op}</code> — <em>proxy only</em></li>
  </ol>
${homepageAddUrlHtml(origin)}
  <section class="cite" id="fraggate">
    <h2>FragGate (kernel / door — not a Software engine)</h2>
    <p>FragGate is the kernel door. Human UI + counted download is the separate FragGate Worker app (not nested in AZBrowser). Hubs already show <a href="${FRAGGATE_GITHUB}">${FRAGGATE_GITHUB}</a>. This runtime publishes a catalog-friendly card at <code>GET /v1/catalog.json</code> <code>extras[]</code> / <code>fraggate</code> so corpus / godlock.uk / azieleliab Software indexes can list Worker <code>${FRAGGATE_WORKER}</code> without adding a PRODUCTS true-engine slug.</p>
    <p><a href="${origin}/v1/fraggate">/v1/fraggate</a> · <a href="${origin}/v1/fraggate/list">/v1/fraggate/list</a> · <a href="${origin}/v1/catalog.json">catalog extras</a> · <a href="${FRAGGATE_WORKER_ORIGIN}/">Worker UI</a> · <a href="${FRAGGATE_WORKER_ORIGIN}/download">counted download</a> · <a href="${FRAGGATE_GITHUB}">GitHub</a></p>
  </section>
  ${cards}
${fragGateDoorScript()}
${donateFooterHtml()}
</body>
</html>`;
}

function productPageHtml(p, origin, stats) {
  const u = productUrls(p, origin);
  const title = `${p.name} — ${CATALOG_TITLE}`;
  const description = `${p.name}: ${p.oneLine} Author Aziel Eliab. Apache-2.0.`;
  const person = personJsonLd();
  const ld = JSON.stringify({
    "@context": "https://schema.org",
    "@graph": [
      person,
      {
        "@type": "SoftwareApplication",
        name: p.name,
        description: p.oneLine,
        url: u.catalog_card,
        codeRepository: p.github,
        downloadUrl: u.download,
        author: { "@id": person["@id"] },
        license: "https://www.apache.org/licenses/LICENSE-2.0",
        identifier: u.doi_url || undefined,
        sameAs: [u.worker_home, u.cite, u.download].concat(u.has_llms ? [u.llms] : []),
      },
    ],
  });
  return `<!doctype html>
<html lang="en">
<head>
${headMeta(origin, title, description, `/p/${p.slug}`)}
<script type="application/ld+json">${ld}</script>
<style>${PAGE_CSS}</style>
</head>
<body>
  <div class="brandrow">
    <img class="brandmark" src="/sigil.png" width="40" height="40" alt="Everblooming sigil — Aziel Eliab" decoding="async">
    <p class="stamp">Everblooming sigil · Aziel Eliab</p>
  </div>
  <p><a href="${origin}/">← Aziel Eliab Runtime</a></p>
  ${productCardHtml(p, origin, stats)}
${fragGateDoorScript()}
${donateFooterHtml()}
</body>
</html>`;
}

async function loadStatsMap(env, only) {
  const list = only ? [only] : PRODUCTS;
  const entries = await Promise.all(
    list.map(async (p) => {
      try {
        const { res } = await upstreamFetch(env, p, "/stats", {
          method: "GET",
          headers: { accept: "application/json" },
          signal: AbortSignal.timeout(2000),
        });
        if (!res || !res.ok) return [p.slug, null];
        const data = await res.json();
        const downloads = Number(data.downloads ?? data.total);
        const views = Number(data.views);
        return [
          p.slug,
          {
            downloads: Number.isFinite(downloads) ? downloads : null,
            views: Number.isFinite(views) ? views : null,
          },
        ];
      } catch {
        return [p.slug, null];
      }
    }),
  );
  return Object.fromEntries(entries);
}


function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function staticPaths(origin) {
  const paths = {
    ...runtimeStaticPaths(),
    "/v1/health": {
      get: {
        operationId: "catalog_health",
        summary: "Liveness. Lists session, pull, proxy, and cite endpoints. Version/role match /v1/ready.",
        tags: ["runtime"],
        responses: { "200": { description: "ok" } },
      },
      head: {
        operationId: "catalog_health_head",
        summary: "HEAD of /v1/health. X-Aziel-Runtime-Version / Role.",
        tags: ["runtime"],
        responses: { "200": { description: "headers only" } },
      },
    },
    "/v1/catalog.json": {
      get: {
        operationId: "catalog_list",
        summary:
          "Machine-readable catalog. products[] are Software engines (slug, worker, github — hubs fetch these). extras[] / fraggate is the FragGate kernel card (github.com/AzielEliab/fraggate; worker fraggate-download-tracker is the separate human UI + counted download, not nested in AZBrowser; engine:false). Each product includes door, fraggate_live, fraggate_ops, fraggate_call. Authoritative hub tab list is GET /v1/software (Plain→Gate→Lock; EmbryoLock live-with-local-destructive-boundary; AZChat name-only stub).",
        tags: ["runtime"],
        responses: { "200": { description: "Product catalog JSON" } },
      },
    },
    "/v1/software": {
      get: {
        operationId: "software_catalog",
        summary:
          "Authoritative live software catalog for hubs and clients. Every product plus AZChat name-only stub. EmbryoLock is live-with-local-destructive-boundary (worker_home embryolock-download-tracker). Sort: Plain A–Z → Gate A–Z → Lock A–Z (Clock ≠ Lock). Sibling software under one FragGate door — never separate FragGate engines. Softwares-tab count includes placements (azinterface / decisiongate / forgereceipts / azcoherence); isolation domain software_count is 33 (domains_are_doors:false). Hubs (azieleliab.com, azielcorpuslibrary.net, godlock.uk) fetch this on each Software-tab request. Default application/json. Accept: text/html returns a crawl HTML shell (unique title/description + JSON-LD) without changing the Worker homepage UI.",
        tags: ["software"],
        responses: { "200": { description: "Sorted software[] plus count_note, isolation_software_count, tab_placement_slugs, domains (domains_are_doors:false)" } },
      },
      head: {
        operationId: "software_catalog_head",
        summary: "HEAD of /v1/software.",
        tags: ["software"],
        responses: { "200": { description: "headers only" } },
      },
    },
    "/v1/fraggate/software": {
      get: {
        operationId: "fraggate_software",
        summary: "FragGate-path mirror of GET /v1/software. Same JSON plus mirror_of.",
        tags: ["fraggate", "software"],
        responses: { "200": { description: "Software catalog JSON" } },
      },
    },
    "/v1/update/check": {
      get: {
        operationId: "update_check",
        summary:
          "Client update check for install.sh, local UIs, and mobile. Query slug (product or aziel-runtime) and version (installed). Returns {slug, current, latest, update_available, download_url, notes}.",
        tags: ["software"],
        parameters: [
          { name: "slug", in: "query", required: true, schema: { type: "string" }, description: "Product slug or aziel-runtime" },
          { name: "version", in: "query", required: false, schema: { type: "string" }, description: "Installed version" },
        ],
        responses: {
          "200": { description: "Update check JSON" },
          "404": { description: "Unknown slug" },
        },
      },
    },
    "/v1/update/manifest": {
      get: {
        operationId: "update_manifest",
        summary: "Latest version list for every product plus AZChat name-only stub and aziel-runtime. For install.sh / local UI / mobile.",
        tags: ["software"],
        responses: { "200": { description: "Latest versions JSON" } },
      },
    },
    "/cite.json": {
      get: {
        operationId: "catalog_cite",
        summary:
          "How to cite Aziel Eliab software and the Digital Library. Aka Aziel Elroi Eliab. No invented DOIs.",
        tags: ["catalog"],
        responses: { "200": { description: "Citation JSON" } },
      },
    },
    "/llms.txt": {
      get: {
        operationId: "catalog_llms",
        summary: "Plain-text catalog + citation rules for Aziel Eliab and the Digital Library.",
        tags: ["catalog"],
        responses: { "200": { description: "text/plain catalog" } },
      },
    },
    "/ai.txt": {
      get: {
        operationId: "catalog_ai_txt",
        summary: "Alias of /llms.txt.",
        tags: ["catalog"],
        responses: { "200": { description: "text/plain catalog" } },
      },
    },
    "/robots.txt": {
      get: {
        operationId: "catalog_robots",
        summary: "Allow / for Google and major AI bots. Sitemap index + hub/product sitemaps. No GPTBot Disallow.",
        tags: ["catalog"],
        responses: { "200": { description: "robots.txt" } },
      },
    },
    "/sitemap.xml": {
      get: {
        operationId: "catalog_sitemap",
        summary: "Indexable sitemap of catalog, OpenAPI, product cards, health, GitHub.",
        tags: ["catalog"],
        responses: { "200": { description: "sitemap.xml" } },
      },
    },
    "/sitemap-index.xml": {
      get: {
        operationId: "catalog_sitemap_index",
        summary:
          "Sitemap index: this catalog sitemap plus live Aziel Digital Library, godlock.uk, and product Worker sitemaps.",
        tags: ["catalog"],
        responses: { "200": { description: "sitemapindex.xml" } },
      },
    },
  };
  return paths;
}

function rewriteLivePaths(spec, product) {
  const out = {};
  const src = spec && spec.paths;
  if (!src || typeof src !== "object") return out;
  for (const [path, item] of Object.entries(src)) {
    const m = path.match(/^\/v1\/([^/]+)$/);
    if (!m) continue;
    const op = m[1];
    if (op === "health") continue;
    const prefixed = `/p/${product.slug}/${op}`;
    const copy = JSON.parse(JSON.stringify(item));
    for (const method of Object.keys(copy)) {
      const opObj = copy[method];
      if (opObj && typeof opObj === "object") {
        opObj.operationId = `${product.slug}_${op}`;
        opObj.tags = [product.slug];
        const extra = `Proxies to ${workerUrl(product, op)}.`;
        opObj.description = [opObj.description || opObj.summary || "", product.banner || "", extra]
          .filter(Boolean)
          .join("\n\n");
      }
    }
    out[prefixed] = copy;
  }
  return out;
}

async function combinedOpenApi(request, env) {
  const origin = originOf(request);
  const paths = staticPaths(origin);
  return {
    openapi: "3.1.0",
    info: {
      title: "Aziel Eliab Runtime",
      version: RUNTIME_VERSION,
      summary: "FragGate door over the Aziel Eliab catalog: discover, route, refuse.",
      description:
        "1.7.10 makes QNM Live Nodes durable (suite-presence is operator-enabled; GET /v1/mesh never enables; cron or request-path fans out live Softwares product Workers while enabled; TTL 5 min). " +
        "1.7.9 cross-maps AZCoherence (peers azclce / AZInterface / AKM-TRIAD fabric neighbor; hubs + Worker URL; domain stays null). " +
        "1.7.8 lands EmbryoLock as a true in-process engine (live-with-local-destructive-boundary; wipe/unlock stay FG-STUB; worker_home embryolock-download-tracker). " +
        "1.7.7 lands AZCoherence (AZC-0.1) as a true in-process FragGate Softwares engine (second-pass triad coherence; cite https://github.com/AzielEliab/AZCoherence; not AKM-TRIAD). " +
        "1.7.6 syncs 4DMap LIVE_OPS with product 0.2.0 (pin/span/stack/gap/fork/walk/lens/class/cohort/absence/cap/join/list/example plus frame_status/axis_describe/walk_trace/card_export/card_import/verify_chain/neighbor_cite; inspection frame, not an extra door). " +
        "1.7.5 is Softwares capability wave 1 (decisiongate / forgereceipts / temporallock / staticclock / chronolock / trajectorylock / spectrallock). " +
        "1.7.4 enhances 4DMap LIVE_OPS (frame_status/axis_describe/walk_trace/card_export/card_import/verify_chain/neighbor_cite; inspection frame, not an extra door). " +
        "1.7.3 aligns audit WARN copy (exist.mcp → tools/list; public FragGate call; catalog count_note; 4DMap not an extra door). " +
        "1.7.2 adds GET /v1/azpipe/arch (MASTER-33 AZPIPE cite/read; same FragGate pipeline payload; not a Softwares door). " +
        "1.7.1 adds AKM-TRIAD-1.0 (adaptive recollection, Bayesian calibration, 3-of-4 triad; not Softwares-tab; behind FragGate). " +
        "1.7.0 locks MASTER-33: Human → AZInterface → PUBLIC/UI/AGENT/API → FragGate → Lamb Lens → SweepGate → Sentinel → Provenance/Input Packet → ChainLock-IN → DecisionGATE → AZPIPE → Internal Domain Layer → optional ASE → RoseClock → TemporalLock → ChainLock-OUT → ForgeReceipts → Return. FragGate is THE single door. Lamb Lens is fabric after FragGate. LambGate is not a hop. " +
        "1.6.15 locked SUITE-PIPE-1.6.15 (historical; kept). " +
        "1.6.14 adds 4DMap (4DM-WP-1.0) as a true in-process engine: four-axis inspection frame T/Δ/Γ/Π after AZPIPE — not a sequential gate and not an extra door. Call only via POST /v1/fraggate/call (or MCP fraggate_call) with { slug: \"4dmap\", op }. 1.7.6 LIVE_OPS sync product 0.2.0 verbs (pin/span/stack/gap/fork/walk/lens/class/cohort/absence/cap/join/list/example) plus frame_status/axis_describe/walk_trace/card_export/card_import/verify_chain/neighbor_cite. truth_score/lumen_panel/invent_mark/backdate_class stay stub. FragGate claims cite join types. " +
        "1.6.13 aligns the suite QNM rollup (QNM-BUILD-1.0, companion to AIH-WP-1.1; GET /v1/mesh live/locked/isolated; operator bearer enable; default radios off; not a login mesh; full node is local qnm-node/). Packet-transfer coding design is QNS-CD-1.0 (photon QNS1 1.3 on local qnsd; GET /v1/qns cites only — never a public via proxy). " +
        "1.6.12 adds GET /v1/software (authoritative hub catalog: Plain A–Z → Gate A–Z → Lock A–Z, Clock ≠ Lock, EmbryoLock stub) plus GET /v1/update/check and GET /v1/update/manifest. " +
        "1.6.11 adds a durable FragGate UI-op alias map (Worker button names resolve to catalog ops) and names EmbryoLock as stub / local-not-hosted (not a FragGate engine). " +
        "1.6.10 sets AZBrowser and AZNet catalog one_line to separate software (not engine). Same FragGate door. Two catalog slugs stay. " +
        "1.6.9 frames AZHub (AIH-WP-1.0 Blank Key) and AZInterface (AIH-WP-1.0 custodial page cycles) as two separate softwares under the same FragGate door — never one combined product. Call only via POST /v1/fraggate/call (or MCP fraggate_call) with { slug: \"azhub\", op } or { slug: \"azinterface\", op }. Hub refuses auto-unlock / completeness. Interface page_cycle_status reports OFF / integrity / ON / FULL SHUTDOWN / MEMORIAL. scorch_remote / ranking stay stub. 1.6.8 added the two catalog slugs. " +
        "1.6.7 adds AZNet (AZN-WP-0.1) as a separate FragGate-live product: silent verification side-net (hash stamps, custodian garden, memorial ledger, integrity refuse/isolate). Never hosts payloads. Own Worker aznet-download-tracker and own UI. Garden / stamp / memorial ops require AZBrowser pair_token AND pair_flag (functional order only). payload_host / serve_content_for_peer / analytics / ranking / repair_integrity_bypass stay stub. Reached only via POST /v1/fraggate/call (or MCP fraggate_call) with { slug: \"aznet\", op }. " +
        "1.6.6 adds AZBrowser (AZB-1.0) as a FragGate-live engine: Lamb Lens ethical search + advisory navigate. Cite; refuse harmful harvest; never invent visit results. Not Chromium. LIVE_OPS.azbrowser: ethical_search, lamb_lens_search, navigate, airlock_ingest, tab_open, tab_list, receipt_list, verify, receipt_verify, health, skill. Call only via POST /v1/fraggate/call (or MCP fraggate_call) with { slug: \"azbrowser\", op }. Worker UI buttons on this host call that same door — one backend, two surfaces. tor_exit / phoenix_wipe / chromium / unrestricted proxy stay stub. " +
        "1.6.5 adds AZMail (APP 1.0) as a FragGate-live engine: anonymous MCP mesh (default off) + advisory airlock. Not a full internet MTA. SMTP / deanonymize / harvest stay stub. AZMail is reached only via POST /v1/fraggate/call (or MCP fraggate_call) with { slug: \"azmail\", op }. Host /runtime proxies that same FragGate door. DecisionGATE / FragGate ledger still apply before exec. " +
        "1.6.4 adds PeaceLock (PL-WP-0.1) as a true in-process engine: chosen silence / chosen inaction receipts, HARD_DUTY refuse, ABSENT transcript/counterfactual/motive. " +
        "1.6.3 adds GET /v1/uses (KV-backed API use counters + ring log; no PII). " +
        "1.6.2 widens the public FragGate door to sensible advisory engines; stub verbs still refuse. " +
        "1.6.1 lists every major OpenAPI / MCP / HTTP client. " +
        "1.6.0 is the FragGate door: hashed registry, thin MCP tools/list, DecisionGATE before exec, ask/refuse ledger. " +
        "1.5.0 was the agent-native cut (flat product-verb MCP + runtime_run). " +
        "1.4.1 adds production gates on the 1.4.0 engine-runtime. " +
        "1.4.0 is catalog + pull + proxy + a session Durable Object + vendored in-process engines for every catalog Software slug. " +
        "1.3.0 listed portable slugs. 1.2.0 was session/receipt (exec still proxied). 1.1.0 was catalog+proxy that called itself a runtime. " +
        "Agent default exec is POST /v1/fraggate/call or MCP fraggate_call (CallEnvelope → FragGate → Lamb Lens → SweepGate → Sentinel → Provenance → ChainLock-IN → DecisionGATE → AZPIPE → Internal Domain Layer → RoseClock → TemporalLock → ChainLock-OUT → ForgeReceipts → Return). " +
        "Binding-only ops stay per-op proxy_fallback. POST /p/{product}/{op} is a proxy, not exec, and is not the agent default path. " +
        "Cloudflare isolate is the jail. Hosted AZAI is a protocol mirror + Lamb check, not the local blend. VPN/hop mesh is not claimed on this public surface. AZMail anonymous ring is FragGate LIVE_OPS only (default off; not SMTP, not identity). AZBrowser Lamb Lens is FragGate LIVE_OPS only (not Chromium; no invented visits). AZHub Blank Key and AZInterface page cycles are two separate softwares under the same FragGate door (AIH-WP-1.0). " +
        "Start at GET /v1/skill or GET /v1/software. Agents use fraggate_list → fraggate_describe → fraggate_call (POST /mcp). " +
        "Hubs fetch GET /v1/software (also GET /v1/fraggate/software). Clients check GET /v1/update/check?slug=&version=. " +
        "GET /v1/bundle lists every product skill URL + invoke prefix. " +
        "GET /v1/pull/{slug} and GET /v1/pull/{slug}/skill pull a product without visiting its Worker. " +
        "Suite design papers live at docs/designs/ (git-hosted; not Softwares-tab products, not a FragGate slug). " +
        openApiImportSentence() +
        " " +
        "GodLock/MirageGrid are not VPNs. ForgeReceipts is not legal advice. " +
        "ZionPattern Solver caps confidence at 75% and does not solve cases. " +
        "VeilLock does not inject into FaceTime. AZ-CLCE detects inconsistency, not intent. " +
        "ChronoLock is advisory only (not a scheduler, not targeting, not virality; 08:30–10:30 local; distinct from TemporalLock). " +
        "The ARK is not a kernel. Hosted API never unlocks or encrypts with a passphrase and never stores vaults. Sweep is Mode E heuristics only. " +
        "AZAI is a local OpenAI-compatible runtime, not a new foundation model. Hosted /v1 is a protocol mirror + Lamb check, not a provider proxy. Jeeves is not sovereign. " +
        "SpectralLock hosted overlay is a 256px preview, not a spectrometer, not forensic. " +
        "EmployeeLock is not a court, not UL, not a truth score. Hosted never stores xlsx. " +
        "FoldLock is not zip. Hosted preview is tether-suppression on small UTF-8 text. " +
        "WhistleLock is not a mailer. Hosted never holds whistle files. " +
        "AZMail is not a full internet MTA and is reached only via FragGate on aziel-runtime (host /runtime proxies that door). " +
        "AZBrowser is not Chromium and is reached only via FragGate on aziel-runtime (MCP fraggate_call and Worker UI buttons share LIVE_OPS.azbrowser). " +
        "AZNet is not a payload host and is reached only via FragGate. Separate product / own UI. Garden / stamp / memorial ops require AZBrowser pairing token AND flag. " +
        "AZHub is a Blank Key and is not AZInterface. AZInterface page cycles are pre-locked and AZHub is sibling software under the same FragGate door. " +
        "4DMap is a four-axis inspection frame (4DM-WP-1.0), not a sequential gate, not a truth score, not a Lumen panel. " +
        "TrajectoryLock is a research prototype / auditable geometric test. Not a certified forensic instrument. Hosted never stores media. " +
        "Aziel Corpus Library is not a private-file search engine, not Zenodo, and not a new Lock engine. " +
        "Forks welcome. Apache-2.0. Author: Aziel Eliab.",
      license: { name: "Apache-2.0", identifier: "Apache-2.0" },
      contact: { name: "Aziel Eliab", url: "https://github.com/AzielEliab/aziel-runtime" },
      externalDocs: {
        description: "Suite software designs (docs/designs/) — git-hosted. Not Softwares-tab products.",
        url: DESIGNS_GITHUB_TREE,
      },
    },
    servers: [{ url: origin }],
    tags: [
      { name: "fraggate", description: "FragGate door — discover, route, refuse. One door for sibling software." },
      { name: "software", description: "Authoritative software catalog + client update check. Hubs fetch /v1/software." },
      { name: "mesh", description: "QNM-BUILD-1.0 suite rollup. Default OFF. live/locked/isolated counts + operator bearer enable. Not a login mesh. Not a Softwares-tab product." },
      { name: "memory", description: "AKM-TRIAD-1.0 adaptive knowledge memory. Behind FragGate. Not a Softwares-tab product. Posterior ≠ truth." },
      { name: "runtime", description: "Runtime" },
      { name: "session", description: "Session (advanced)" },
    ].concat(
      PRODUCTS.map((p) => ({ name: p.slug, description: p.name })),
    ),
    components: {
      securitySchemes: {
        RuntimeToken: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "RUNTIME_TOKEN",
          description:
            "Operator bearer for session mutate (open/policy/exec/close) and MCP session tools when REQUIRE_TOKEN=1. Public FragGate call stays open. " +
            tokenAuthSentence(),
        },
      },
    },
    paths,
  };
}

function bindingName(product) {
  const slug = String(product.slug || "");
  return slug.toUpperCase().replace(/-/g, "_");
}

function withUpstreamHeaders(init) {
  const headers = new Headers((init && init.headers) || {});
  if (!headers.has("user-agent") && !headers.has("User-Agent")) {
    headers.set("User-Agent", DEFAULT_UA);
  }
  if (!headers.has("accept") && !headers.has("Accept")) {
    headers.set("Accept", "application/json, text/markdown, text/plain, */*");
  }
  return { ...init, headers };
}

async function upstreamFetch(env, product, path, init) {
  const bind = env && env[bindingName(product)];
  const publicHost =
    product.slug === "aziel-corpus"
      ? "https://www.azielcorpuslibrary.net"
      : `https://${product.worker}.vibelock.workers.dev`;
  const target = `${publicHost}${path}`;
  const next = withUpstreamHeaders(init);
  const signal = next.signal || AbortSignal.timeout(4000);
  if (bind && typeof bind.fetch === "function") {
    try {
      const req = new Request("https://internal" + path, { ...next, signal });
      return { res: await bind.fetch(req), target: target + " (service binding)" };
    } catch (err) {
      /* fall through to public URL */
      console.log(
        JSON.stringify({
          msg: "service_binding_fallback",
          product: product.slug,
          path,
          detail: String(err && err.message ? err.message : err),
        }),
      );
    }
  }
  return { res: await fetch(target, { ...next, signal }), target };
}

async function proxy(product, op, request, env) {
  const targetPath = `/v1/${op}`;
  const method = request.method === "GET" ? "GET" : "POST";
  const headers = {
    "content-type": request.headers.get("content-type") || "application/json",
    accept: "application/json",
  };
  const init = { method, headers };
  if (method !== "GET") {
    const text = await request.text();
    init.body = text && text.trim() ? text : "{}";
  }
  try {
    const { res, target } = await upstreamFetch(env, product, targetPath, init);
    const buf = await res.arrayBuffer();
    const outHeaders = new Headers(corsHeaders());
    const ct = res.headers.get("content-type") || "application/json; charset=utf-8";
    outHeaders.set("Content-Type", ct);
    outHeaders.set("X-Aziel-Upstream", target);
    return new Response(buf, { status: res.status, headers: outHeaders });
  } catch (err) {
    return json(
      {
        error: "upstream unreachable",
        product: product.slug,
        worker: product.worker,
        op,
        detail: String(err && err.message ? err.message : err),
      },
      502,
    );
  }
}

function toolList() {
  return buildMcpToolList({ sessionTools: sessionMcpTools() });
}

async function callRuntimeTool(env, name, args, origin, request) {
  const base = (origin || CATALOG_HOST).replace(/\/$/, "");
  const fraggate = await callFraggateTool(name, args, PRODUCTS, BY_SLUG, env);
  if (fraggate) return fraggate;
  if (name === "runtime_run" || name === "use_software") {
    return callRuntimeRun(env, args, origin, sessionDeps(env, origin, request));
  }
  if (name === "runtime_skill") {
    return { status: 200, text: runtimeSkillMarkdown(base, PRODUCTS), target: base + "/v1/skill" };
  }
  if (name === "runtime_manifest") {
    const registry = registryFor(PRODUCTS);
    const digest = await registryDigest(registry);
    return {
      status: 200,
      text: JSON.stringify(
        runtimeManifest(base, PRODUCTS, { registry_digest: digest, fraggate: registrySummary(registry, digest) }),
        null,
        2,
      ),
      target: base + "/v1/runtime.json",
    };
  }
  if (name === "runtime_software") {
    return {
      status: 200,
      text: JSON.stringify((await readPackedCatalog(env, base, PRODUCTS, softwareExtra(env))).catalog, null, 2),
      target: base + "/v1/software",
    };
  }
  if (name === "runtime_bundle") {
    return { status: 200, text: JSON.stringify(bundleJson(base, PRODUCTS), null, 2), target: base + "/v1/bundle" };
  }
  if (name === "runtime_pull") {
    const key = resolveSlug((args && (args.slug || args.product)) || "", BY_SLUG);
    if (!key) throw new Error(`unknown product: ${(args && args.slug) || ""}`);
    const product = BY_SLUG[key];
    const fetched = await fetchProductSkill(env, product, upstreamFetch);
    const skillText = fetched.text || fallbackSkillMarkdown(product, base);
    return {
      status: 200,
      text: JSON.stringify(pullRecord(product, base, skillText, { skill_source: fetched.source || "fallback" }), null, 2),
      target: `${base}/v1/pull/${key}`,
    };
  }
  const session = await callSessionTool(env, name, args, origin, sessionDeps(env, origin, request));
  if (session) return session;
  return null;
}

function healthBody(origin) {
  return {
    ok: true,
    product: "aziel-runtime",
    author: "Aziel Eliab",
    role: RUNTIME_ROLE,
    layer: RUNTIME_LAYER,
    version: RUNTIME_VERSION,
    title: CATALOG_TITLE,
    identity: "Aziel Eliab",
    products: PRODUCTS.map((p) => p.slug),
    count: PRODUCTS.length,
    skill: "/v1/skill",
    runtime: "/v1/runtime.json",
    door: "fraggate",
    fraggate: "/v1/fraggate",
    ready: "/v1/ready",
    session: "/v1/session/open",
    bundle: "/v1/bundle",
    pull: "/v1/pull/{slug}",
    invoke: "/p/{slug}/{op}",
    invoke_note: "proxy only — not exec",
    ...honestyFields(PRODUCTS.map((p) => p.slug)),
    authoritySnapshot: authoritySnapshot(PRODUCTS.map((p) => p.slug)),
    version_history: VERSION_HISTORY,
    counted_tarball: false,
    openapi: "/openapi.json",
    catalog: "/v1/catalog.json",
    software: "/v1/software",
    update_check: "/v1/update/check",
    update_manifest: "/v1/update/manifest",
    uses: "/v1/uses",
    stats: "/v1/stats",
    mesh: "/v1/mesh",
    mesh_status: "/v1/mesh/status",
    mesh_nodes: "/v1/mesh/nodes",
    qns: "/v1/qns",
    azpipe_arch: "/v1/azpipe/arch",
    memory: "/v1/memory",
    cite: "/cite.json",
    sitemap: "/sitemap.xml",
    sitemap_index: "/sitemap-index.xml",
    robots: "/robots.txt",
    llms: "/llms.txt",
    ai: "/ai.txt",
    mcp: "/mcp",
    sigil: "/sigil.png",
    library_front_door: "https://www.azielcorpuslibrary.net/runtime",
    kv_increment: false,
    host: (origin || CATALOG_HOST).replace(/\/$/, "") + "/",
  };
}

function sessionDeps(_env, _origin, request) {
  return { json, PRODUCTS, BY_SLUG, upstreamFetch, request };
}

function splitProductToolName(name) {
  const n = String(name || "");
  const known = BY_SLUG[n.split("_")[0]] ? n.split("_")[0] : null;
  if (known) return { slug: known, op: n.slice(known.length + 1) };
  // slugs that contain a hyphen still split on the first underscore (aziel-corpus_search)
  const idx = n.indexOf("_");
  if (idx < 1) return { slug: null, op: null };
  return { slug: n.slice(0, idx), op: n.slice(idx + 1) };
}

async function callTool(env, name, args, origin, request) {
  if (name === "runtime_session_exec") {
    const registry = registryFor(PRODUCTS);
    const admission = await admitCall(args, registry, BY_SLUG);
    if (!admission.admitted) {
      return wrapFraggateEnvelope(name, admission.envelope, null, (args && args.op) || null);
    }
  }
  const local = await callRuntimeTool(env, name, args, origin, request);
  if (local) return local;
  return wrapFraggateEnvelope(name, hallucRefuse(name), null, null);
}

function rpcResult(id, result) {
  return json({ jsonrpc: "2.0", id: id ?? null, result });
}

function rpcError(id, code, message) {
  return json({ jsonrpc: "2.0", id: id ?? null, error: { code, message } });
}

async function handleMcp(request, env, origin) {
  if (request.method === "GET") {
    return json({
      ok: true,
      transport: "JSON-RPC MCP-over-HTTP",
      endpoint: "POST /mcp",
      methods: ["initialize", "tools/list", "tools/call", "ping"],
      auth: "none (public)",
      note: "Durable Objects / agents McpAgent not used. Minimal HTTP JSON-RPC. tools/list is the thin FragGate door. Pipeline: fraggate_list → fraggate_describe → fraggate_call. Hubs: GET /v1/software.",
      door: "fraggate",
      skill: "/v1/skill",
      runtime: "/v1/runtime.json",
      fraggate: "/v1/fraggate",
      software: "/v1/software",
      update_check: "/v1/update/check",
      bundle: "/v1/bundle",
      session: "/v1/session/open",
    });
  }
  if (request.method !== "POST") {
    return json({ error: "POST JSON-RPC to /mcp" }, 405);
  }
  let body;
  try {
    body = await request.json();
  } catch {
    return rpcError(null, -32700, "Parse error");
  }
  const id = body && body.id !== undefined ? body.id : null;
  const method = body && body.method;
  const params = (body && body.params) || {};
  if (method === "initialize") {
    return rpcResult(id, {
      protocolVersion: PROTOCOL,
      capabilities: { tools: { listChanged: false } },
      serverInfo: { name: "aziel-runtime", version: RUNTIME_VERSION },
      instructions: mcpInitializeInstructions(),
    });
  }
  if (method === "notifications/initialized" || method === "initialized") {
    return new Response(null, { status: 204, headers: corsHeaders() });
  }
  if (method === "ping") {
    return rpcResult(id, {});
  }
  if (method === "tools/list") {
    return rpcResult(id, { tools: toolList() });
  }
  if (method === "tools/call") {
    const name = params.name;
    const args = params.arguments || params.input || {};
    try {
      const out = await callTool(env, name, args, origin, request);
      const { slug, op } = splitProductToolName(name);
      return rpcResult(id, mcpCallPayload(name, out, out.product || BY_SLUG[slug], out.op || op));
    } catch (err) {
      const text = JSON.stringify({ error: String(err.message || err) });
      return rpcResult(id, mcpCallPayload(name, { status: 400, text }, null, null));
    }
  }
  return rpcError(id, -32601, `Method not found: ${method}`);
}


async function handleFraggateHttp(request, url, origin, env) {
  const registry = registryFor(PRODUCTS);
  const extra = authorityLinkHeaders(origin, url.pathname);
  if (
    (url.pathname === "/v1/fraggate/software" || url.pathname === "/v1/fraggate/software.json") &&
    (request.method === "GET" || request.method === "HEAD")
  ) {
    return asHead(
      request,
      await servePackedSoftware(request, env, origin, { mirror_of: "/v1/software" }),
    );
  }
  if (url.pathname === "/v1/fraggate" && (request.method === "GET" || request.method === "HEAD")) {
    const digest = await registryDigest(registry);
    const body = {
      ok: true,
      door: "fraggate",
      ...registrySummary(registry, digest),
      pipeline: azpipeArch(),
      pipeline_strip: LOCKED_STRIP,
      skill: origin.replace(/\/$/, "") + "/v1/skill",
      mcp: origin.replace(/\/$/, "") + "/mcp",
      kernel: "https://github.com/AzielEliab/fraggate",
    };
    return asHead(request, json(body, 200, extra));
  }
  if (url.pathname === "/v1/fraggate/list" && (request.method === "GET" || request.method === "HEAD")) {
    return asHead(request, json(await listRegistry(registry), 200, extra));
  }
  if (url.pathname === "/v1/fraggate/describe" && (request.method === "GET" || request.method === "HEAD")) {
    const args = {
      name: url.searchParams.get("name") || url.searchParams.get("slug") || "",
      slug: url.searchParams.get("slug") || "",
    };
    if (!args.name && !args.slug && prefersHtml(request)) {
      const entries = [
        ...PRODUCTS.map((p) => ({ slug: p.slug, name: p.name })),
        ...NAMED_STUBS.map((s) => ({ slug: s.slug, name: s.name })),
      ];
      return asHead(request, html(describeIndexHtml(origin, entries, PAGE_CSS), extra));
    }
    const body = await describeRegistry(args, registry, BY_SLUG);
    if (prefersHtml(request)) {
      const page =
        body.ok === false ? describeUnknownHtml(origin, body, PAGE_CSS) : describeDocsHtml(origin, body, PAGE_CSS);
      return asHead(request, html(page, { ...extra, status: body.ok === false ? 400 : 200 }));
    }
    return asHead(request, json(body, body.ok === false ? 400 : 200, extra));
  }
  if (url.pathname === "/v1/fraggate/verify" && request.method === "POST") {
    let args = {};
    try {
      args = await request.json();
    } catch {
      args = {};
    }
    const body = await verifyRegistry(args, registry, BY_SLUG);
    return json(body, body.ok === false ? 400 : 200, extra);
  }
  if (url.pathname === "/v1/fraggate/call" && request.method === "POST") {
    let args = {};
    try {
      args = await request.json();
    } catch {
      args = {};
    }
    const body = await fraggateCall(args, registry, BY_SLUG, env, request);
    return json(body, body.ok === false ? 400 : 200, extra);
  }
  return json(
    {
      error: "not found",
        hint: "GET /v1/fraggate  GET /v1/fraggate/list  GET /v1/fraggate/describe?name=  GET /v1/fraggate/software  POST /v1/fraggate/verify  POST /v1/fraggate/call",
    },
    404,
  );
}

async function handlePull(env, product, origin, extra) {
  const fetched = await fetchProductSkill(env, product, upstreamFetch);
  const skillText = fetched.text || fallbackSkillMarkdown(product, origin);
  return json(
    pullRecord(product, origin, skillText, { skill_source: fetched.source || "fallback" }),
    200,
    extra,
  );
}

async function handlePullSkill(env, product, origin, extra) {
  const fetched = await fetchProductSkill(env, product, upstreamFetch);
  const text = fetched.text || fallbackSkillMarkdown(product, origin);
  const headers = {
    ...(extra || {}),
    "X-Aziel-Skill-Source": fetched.source || "fallback",
  };
  return markdownResponse(text, headers);
}

async function serveSigil(request, env) {
  const headers = {
    "Content-Type": "image/png",
    "Cache-Control": "public, max-age=86400",
    "X-Aziel-Sigil": "Everblooming",
    ...corsHeaders(),
  };
  if (env && env.ASSETS && typeof env.ASSETS.fetch === "function") {
    try {
      const res = await env.ASSETS.fetch(new Request(new URL("/sigil.png", request.url)));
      if (res && res.ok) {
        const buf = await res.arrayBuffer();
        return new Response(buf, { status: 200, headers });
      }
    } catch {
      /* fall through */
    }
  }
  const fallbacks = [
    "https://www.azielcorpuslibrary.net/sigil.png",
    "https://foldlock-download-tracker.vibelock.workers.dev/sigil.png",
  ];
  for (const src of fallbacks) {
    try {
      const res = await fetch(src, { headers: { "User-Agent": DEFAULT_UA }, signal: AbortSignal.timeout(2500) });
      if (res.ok) {
        const buf = await res.arrayBuffer();
        return new Response(buf, { status: 200, headers });
      }
    } catch {
      /* next */
    }
  }
  return json({ error: "sigil unavailable" }, 502);
}

async function handleRequest(request, env, ctx) {
    const url = new URL(request.url);
    const origin = originOf(request);
    const extra = (path) => linkHeaders(origin, path);

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders() });
    }

    if (url.pathname === "/" && request.method === "GET") {
      return html(catalogHtml(origin, {}), { ...extra("/"), ...catalogCacheHeaders() });
    }

    if (url.pathname === "/robots.txt" && (request.method === "GET" || request.method === "HEAD")) {
      return asHead(request, text(robotsTxt(origin), extra("/robots.txt")));
    }

    if (url.pathname === "/sitemap.xml" && (request.method === "GET" || request.method === "HEAD")) {
      return asHead(request, xml(sitemapXml(origin), extra("/sitemap.xml")));
    }

    if (url.pathname === "/sitemap-index.xml" && (request.method === "GET" || request.method === "HEAD")) {
      return asHead(request, xml(sitemapIndexXml(origin, PRODUCTS, LASTMOD), extra("/sitemap-index.xml")));
    }

    if ((url.pathname === "/llms.txt" || url.pathname === "/ai.txt") && (request.method === "GET" || request.method === "HEAD")) {
      return asHead(request, text(llmsTxt(origin), extra(url.pathname)));
    }

    if (url.pathname === "/cite.json" && (request.method === "GET" || request.method === "HEAD")) {
      return asHead(request, json(citeJson(origin), 200, extra("/cite.json")));
    }

    if (url.pathname === "/v1/skill" && (request.method === "GET" || request.method === "HEAD")) {
      return asHead(
        request,
        markdownResponse(runtimeSkillMarkdown(origin, PRODUCTS), {
          ...authorityLinkHeaders(origin, "/v1/skill"),
        }),
      );
    }

    if (
      (url.pathname === "/v1/runtime.json" || url.pathname === "/v1/runtime") &&
      (request.method === "GET" || request.method === "HEAD")
    ) {
      const canon = "/v1/runtime.json";
      const registry = registryFor(PRODUCTS);
      const digest = await registryDigest(registry);
      return asHead(
        request,
        json(
          runtimeManifest(origin, PRODUCTS, { registry_digest: digest, fraggate: registrySummary(registry, digest) }),
          200,
          authorityLinkHeaders(origin, canon),
        ),
      );
    }

    if (url.pathname === "/v1/fraggate" || url.pathname.startsWith("/v1/fraggate/")) {
      return handleFraggateHttp(request, url, origin, env);
    }

    if (url.pathname === "/v1/bundle" && request.method === "GET") {
      return json(bundleJson(origin, PRODUCTS), 200, extra("/v1/bundle"));
    }

    if (url.pathname === "/v1/session/open" || url.pathname.startsWith("/v1/session/")) {
      return handleSessionRequest(request, env, { json, extra, PRODUCTS, BY_SLUG, upstreamFetch });
    }

    if (url.pathname === "/v1/pull" && request.method === "GET") {
      const all = url.searchParams.get("all");
      if (all === "1" || all === "true") {
        return json(bundleJson(origin, PRODUCTS), 200, extra("/v1/pull"));
      }
      const raw = url.searchParams.get("slug") || url.searchParams.get("product");
      const key = resolveSlug(raw, BY_SLUG);
      if (!key) {
        return json(
          { error: "unknown product", slug: raw, hint: "GET /v1/pull?all=1 or /v1/pull/{slug}", known: PRODUCTS.map((p) => p.slug) },
          404,
        );
      }
      return handlePull(env, BY_SLUG[key], origin, extra(`/v1/pull/${key}`));
    }

    const pullSkill = url.pathname.match(/^\/v1\/pull\/([a-z0-9.-]+)\/skill$/i);
    if (pullSkill && request.method === "GET") {
      const key = resolveSlug(pullSkill[1], BY_SLUG);
      if (!key) {
        return json({ error: "unknown product", slug: pullSkill[1], known: PRODUCTS.map((p) => p.slug) }, 404);
      }
      return handlePullSkill(env, BY_SLUG[key], origin, extra(`/v1/pull/${key}/skill`));
    }

    const pullOne = url.pathname.match(/^\/v1\/pull\/([a-z0-9.-]+)$/i);
    if (pullOne && request.method === "GET") {
      const key = resolveSlug(pullOne[1], BY_SLUG);
      if (!key) {
        return json({ error: "unknown product", slug: pullOne[1], known: PRODUCTS.map((p) => p.slug) }, 404);
      }
      return handlePull(env, BY_SLUG[key], origin, extra(`/v1/pull/${key}`));
    }

    if (
      (url.pathname === "/v1/software" || url.pathname === "/v1/software.json") &&
      (request.method === "GET" || request.method === "HEAD")
    ) {
      return asHead(request, await servePackedSoftware(request, env, origin));
    }

    if (url.pathname === "/v1/update/manifest" && (request.method === "GET" || request.method === "HEAD")) {
      return asHead(
        request,
        json(
          updateManifest(origin, PRODUCTS, softwareExtra(env)),
          200,
          catalogLinkHeaders(origin, "/v1/update/manifest"),
        ),
      );
    }

    if (url.pathname === "/v1/update/check" && (request.method === "GET" || request.method === "HEAD")) {
      const body = updateCheck(
        {
          slug: url.searchParams.get("slug") || url.searchParams.get("product") || "",
          version: url.searchParams.get("version") || url.searchParams.get("current") || "",
        },
        origin,
        PRODUCTS,
        softwareExtra(env),
      );
      const status = body.status || (body.ok === false ? 404 : 200);
      const { status: _drop, ...payload } = body;
      return asHead(request, json(payload, status, catalogLinkHeaders(origin, "/v1/update/check")));
    }

    if (url.pathname === "/v1/catalog.json" && request.method === "GET") {
      return json(
        {
          ok: true,
          role: RUNTIME_ROLE,
          layer: RUNTIME_LAYER,
          ...catalogHubFields(origin),
          title: CATALOG_TITLE,
          version: RUNTIME_VERSION,
          catalog: origin + "/",
          skill: origin + "/v1/skill",
          runtime: origin + "/v1/runtime.json",
          ready: origin + "/v1/ready",
          uses: origin + "/v1/uses",
          session: origin + "/v1/session/open",
          bundle: origin + "/v1/bundle",
          ...honestyFields(PRODUCTS.map((p) => p.slug)),
          authoritySnapshot: authoritySnapshot(PRODUCTS.map((p) => p.slug)),
          version_history: VERSION_HISTORY,
          license: "Apache-2.0",
          door: "fraggate",
          kernel: FRAGGATE_GITHUB,
          fraggate: fraggateHubCard(origin),
          extras: catalogExtraCards(origin),
          extras_note:
            "Kernel / door cards for Software hubs. extras[] is not PRODUCTS — FragGate is the door; Quantum Node Mesh (QNM-BUILD-1.0) is the suite rollup (not a login mesh; not a Softwares-tab product). QNS-CD-1.0 is the packet-transfer coding design (local qnsd; Worker cites only — not a Softwares-tab slug). Human UI + counted download is the separate FragGate Worker app (fraggate-download-tracker; not nested in AZBrowser).",
          software: origin.replace(/\/$/, "") + "/v1/software",
          fraggate_software: origin.replace(/\/$/, "") + "/v1/fraggate/software",
          update_check: origin.replace(/\/$/, "") + "/v1/update/check",
          update_manifest: origin.replace(/\/$/, "") + "/v1/update/manifest",
          count: PRODUCTS.length,
          products: PRODUCTS.map((p) => catalogRecord(p, origin)),
        },
        200,
        authorityLinkHeaders(origin, "/v1/catalog.json"),
      );
    }

    if (url.pathname === "/openapi.json" && request.method === "GET") {
      return json(await combinedOpenApi(request, env), 200, extra("/openapi.json"));
    }

    if (url.pathname === "/v1/mesh" || url.pathname.startsWith("/v1/mesh/")) {
      let payload = {};
      if (request.method === "POST") {
        try {
          payload = await request.json();
        } catch {
          payload = {};
        }
      }
      const out = await dispatchMeshHttp(request.method, url.pathname, payload, env);
      if (isMeshReadPath(url.pathname)) {
        scheduleSuitePresenceFanout(ctx, env, { source: "request-path" });
      }
      return asHead(
        request,
        json(out.body, out.status, authorityLinkHeaders(origin, url.pathname)),
      );
    }

    if (url.pathname === "/v1/memory" || url.pathname.startsWith("/v1/memory/")) {
      let payload = {};
      if (request.method === "POST") {
        try {
          payload = await request.json();
        } catch {
          payload = {};
        }
      }
      const memPath = url.pathname.replace(/\/+$/, "") || "/";
      const memPost = {
        "/v1/memory/observe": "observe",
        "/v1/memory/resolve": "resolve",
        "/v1/memory/calibrate": "calibrate",
        "/v1/memory/recall": "recall",
        "/v1/memory/rebuild-index": "rebuild-index",
      };
      if (memPost[memPath] && request.method === "POST") {
        const registry = registryFor(PRODUCTS);
        const envelope = await fraggateCall(
          { slug: "memory", name: "memory", op: memPost[memPath], payload },
          registry,
          BY_SLUG,
          env,
          request,
        );
        if (envelope.ok === false) {
          return asHead(request, json(envelope, 400, authorityLinkHeaders(origin, url.pathname)));
        }
        const body = envelope.result && typeof envelope.result === "object" ? envelope.result : envelope;
        return asHead(
          request,
          json(body, body && body.ok === false ? 400 : 200, authorityLinkHeaders(origin, url.pathname)),
        );
      }
      const out = await dispatchMemoryHttp(request.method, url.pathname, payload, env, request);
      return asHead(
        request,
        json(out.body, out.status, authorityLinkHeaders(origin, url.pathname)),
      );
    }

    if (url.pathname === "/v1/azpipe/arch" || url.pathname === "/v1/azpipe" || url.pathname.startsWith("/v1/azpipe/")) {
      const out = dispatchAzpipeArchHttp(request.method, url.pathname);
      return asHead(
        request,
        json(out.body, out.status, authorityLinkHeaders(origin, url.pathname)),
      );
    }

    if (url.pathname === "/v1/qns" || url.pathname.startsWith("/v1/qns/")) {
      let payload = {};
      if (request.method !== "GET" && request.method !== "HEAD") {
        try {
          payload = await request.json();
        } catch {
          payload = {};
        }
      }
      const out = dispatchQnsHttp(request.method, url.pathname, payload);
      return asHead(
        request,
        json(out.body, out.status, authorityLinkHeaders(origin, url.pathname)),
      );
    }

    if (url.pathname === "/v1/uses" && request.method === "POST") {
      return json(
        { ok: false, error: "method not allowed", hint: "GET /v1/uses — increments are automatic" },
        405,
        authorityLinkHeaders(origin, "/v1/uses"),
      );
    }

    if (
      (url.pathname === "/v1/uses" || url.pathname === "/v1/stats") &&
      (request.method === "GET" || request.method === "HEAD")
    ) {
      const uses = await readUses(env);
      const body =
        url.pathname === "/v1/stats" ? { ...uses, stats: "uses", alias_of: "/v1/uses" } : uses;
      return asHead(request, json(body, 200, authorityLinkHeaders(origin, url.pathname)));
    }

    if (url.pathname === "/v1/health" && (request.method === "GET" || request.method === "HEAD")) {
      const body = healthBody(origin);
      const usesTotal = await peekUsesTotal(env);
      if (usesTotal != null) body.uses_total = usesTotal;
      return asHead(
        request,
        json(
          body,
          200,
          authorityLinkHeaders(origin, "/v1/health"),
        ),
      );
    }

    if (url.pathname === "/v1/ready" && (request.method === "GET" || request.method === "HEAD")) {
      const gate = evaluateReady(env);
      const body = {
        ...healthBody(origin),
        ok: gate.ok,
        ready: gate.ok,
        session_binding: gate.session_binding,
        require_token: gate.require_token,
        token_configured: gate.token_configured,
        mutate_requires_token: gate.mutate_requires_token,
        fraggate_call_public: gate.fraggate_call_public !== false,
        token_note: gate.token_note,
        ...(gate.error
          ? { error: gate.error, code: gate.code, hint: gate.hint }
          : {}),
      };
      return asHead(request, json(body, gate.status, authorityLinkHeaders(origin, "/v1/ready")));
    }

    if (url.pathname === "/sigil.png" && request.method === "GET") {
      return serveSigil(request, env);
    }

    if (url.pathname === "/mcp" || url.pathname === "/mcp/") {
      return handleMcp(request, env, origin);
    }

    const card = url.pathname.match(/^\/p\/([a-z0-9-]+)\/?$/i);
    if (card && request.method === "GET") {
      const product = BY_SLUG[card[1].toLowerCase()];
      if (!product) {
        return json({ error: "unknown product", slug: card[1], known: PRODUCTS.map((p) => p.slug) }, 404);
      }
      const statsMap = await loadStatsMap(env, product);
      return html(productPageHtml(product, origin, statsMap[product.slug]), extra(`/p/${product.slug}`));
    }

    const m = url.pathname.match(/^\/p\/([a-z0-9-]+)\/([a-z0-9_-]+)$/i);
    if (m && (request.method === "GET" || request.method === "POST")) {
      const product = BY_SLUG[m[1].toLowerCase()];
      if (!product) {
        return json({ error: "unknown product", slug: m[1], known: PRODUCTS.map((p) => p.slug) }, 404);
      }
      return proxy(product, m[2], request, env);
    }

    if (
      /\.(png|jpe?g|gif|webp|svg|ico)$/i.test(url.pathname) &&
      env &&
      env.ASSETS &&
      typeof env.ASSETS.fetch === "function"
    ) {
      const asset = await env.ASSETS.fetch(request);
      if (asset && asset.status !== 404) {
        const headers = new Headers(asset.headers);
        headers.set("Access-Control-Allow-Origin", "*");
        return new Response(asset.body, { status: asset.status, headers });
      }
    }

    return json(
      {
        error: "not found",
        hint: "POST /v1/fraggate/call  GET /v1/fraggate  GET /v1/azpipe/arch  GET /v1/software  GET /v1/mesh  GET /v1/qns  POST /v1/memory/observe  GET /v1/update/check  GET /v1/skill  POST /v1/session/open  POST /v1/session/{id}/exec  GET /v1/ready  GET /v1/uses  GET /v1/runtime.json  GET /v1/bundle  GET /v1/pull/{slug}  GET /v1/catalog.json  GET /openapi.json  POST /p/{product}/{op} (proxy, not exec)  POST /mcp",
      },
      404,
    );
}

export default {
  async fetch(request, env, ctx) {
    const response = await handleRequest(request, env, ctx);
    return finishWithUse(request, env, ctx, response);
  },
  async scheduled(controller, env, ctx) {
    const source = controller && controller.cron ? `cron:${controller.cron}` : "cron";
    await meshScheduled(env, ctx, source);
  },
};

export async function meshScheduled(env, ctx, source = "cron") {
  return scheduleSuitePresenceFanout(ctx, env, { source });
}
