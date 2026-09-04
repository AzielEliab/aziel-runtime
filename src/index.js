/**
 * aziel-runtime — true runtime (pull + invoke + cite) for every Aziel Eliab product.
 *
 * GET  /                      HTML runtime (indexable) + Everblooming sigil
 * GET  /sigil.png             Everblooming sigil stamp
 * GET  /robots.txt            Allow /, sitemap URL
 * GET  /sitemap.xml           runtime, pull, OpenAPI, product cards/health, GitHub
 * GET  /llms.txt              plain-text runtime for LLM crawlers
 * GET  /ai.txt                same as /llms.txt
 * GET  /cite.json             How-to-cite: Aziel Eliab, Apache-2.0, GitHub + DOI + related_identifiers
 * GET  /v1/skill              runtime skill markdown (how Grok/ChatGPT/Venice pull + call)
 * GET  /v1/runtime.json       machine manifest: role=runtime
 * GET  /v1/bundle             compact bootstrap (skill URL + invoke prefix per product)
 * GET  /v1/pull?all=1         alias of /v1/bundle
 * GET  /v1/pull/{slug}        pull record (skill, download, install, ops, aliases)
 * GET  /v1/pull/{slug}/skill  product skill markdown (proxy/cache)
 * GET  /v1/catalog.json       machine-readable full product list
 * GET  /openapi.json          combined OpenAPI 3.1 (paths /p/{product}/{op} + pull APIs)
 * GET  /p/{product}           indexable product card
 * GET  /p/{product}/{op}      proxy GET
 * POST /p/{product}/{op}      proxy → product Worker /v1/{op} (service binding preferred)
 * GET  /v1/health
 * POST /mcp                   JSON-RPC MCP-over-HTTP (initialize, tools/list, tools/call)
 *
 * No download-KV increment on runtime routes. CORS *. Apache-2.0. Forks welcome.
 * Author: Aziel Eliab. Identity is Aziel Eliab only. Do not invent DOIs.
 */
import {
  VERSIONS,
  DOI_BY_SLUG,
  citationFields,
  productHowToCite,
  citeZenodoBlock,
} from "./catalog-meta.js";
import {
  RUNTIME_VERSION,
  DEFAULT_UA,
  resolveSlug,
  runtimeSkillMarkdown,
  runtimeManifest,
  bundleJson,
  pullRecord,
  fallbackSkillMarkdown,
  fetchProductSkill,
  markdownResponse,
  runtimeStaticPaths,
} from "./runtime-api.js";

const CATALOG_HOST = "https://aziel-runtime.vibelock.workers.dev";
const PROTOCOL = "2025-03-26";
const CATALOG_TITLE = "Aziel Eliab Runtime";
const CATALOG_DESCRIPTION =
  "Root source for AI to pull, invoke, and cite every Aziel Eliab product. Skill markdown, install recipes, OpenAPI, counted downloads, and /p/{slug}/{op} invoke. Apache-2.0. Author: Aziel Eliab.";
const LASTMOD = "2026-09-04";

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
    ],
    example: { summary: "sky was overcast", evidence: "photo:./sky.jpg", confidence: 0.9 },
    banner: null,
  },
  {
    slug: "forgereceipts",
    name: "ForgeReceipts",
    worker: "forgereceipts-download-tracker",
    github: "https://github.com/AzielEliab/forgereceipts",
    ops: [{ op: "receipt", method: "POST", summary: "Local receipt / checklist helper. No court connection." }],
    example: { summary: "filed locally", evidence: "sha256:…" },
    banner: "ForgeReceipts 0.3.0: Local receipt / checklist helper with jurisdiction-aware state picker (all 50 states + federal baseline) customizing UI/legal framing. Not legal advice. Does not contact courts. Author Aziel Eliab.",
  },
  {
    slug: "decisiongate",
    name: "DecisionGATE",
    worker: "decisiongate-download-tracker",
    github: "https://github.com/AzielEliab/decisiongate",
    ops: [{ op: "check", method: "POST", summary: "Run the five sequential gates on a proposal." }],
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
    ops: [{ op: "advise", method: "POST", summary: "Five advisory fields for a geo. Not a scheduler." }],
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
      { op: "anchors", method: "GET", summary: "List Top-30 geographic anchors." },
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
    banner: "CLCE detects inconsistency, not intent. Type D is a label, not a finding of malice. Threshold 0.7 is advisory.",
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
      { op: "overlay", method: "POST", summary: "Simplified overlay preview. PNG b64 in, longest side capped at 256 px. Not the full Python pipeline." },
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
    ],
    example: {},
    banner:
      "AzielTether 0.1.0: central × decentral survival mesh for downloaded Aziel Eliab software. Prefer central Worker when up; peer hash-chain sync when down; reconcile on restore. Public HTTPS boards stay mesh-free. Not a VPN. Counted Worker live. Author Aziel Eliab.",
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
];


const ONE_LINE = {
  vibelock: "Physical-consistency evaluation of speech audio. Risk assessment, not a liveness proof.",
  veillock: "Local camera/screen steps for YOUR device only. Not a call interceptor.",
  codelock: "Canonical or Rosetta HTML view of source. Alters perception, not meaning.",
  godlock: "Offline ABAD / hardening score. Not a VPN and not an anonymity network.",
  shadowlock: "Zero-retention observation of a job list you already have. No OS hook.",
  temporallock: "Hash-chained receipts anyone can verify. Explicit genesis, append, verify.",
  forgereceipts: "ForgeReceipts 0.3.0: Local receipt / checklist helper with jurisdiction-aware state picker (all 50 states + federal baseline) customizing UI/legal framing. Not legal advice. Does not contact courts. Author Aziel Eliab.",
  decisiongate: "Five sequential gates on a proposal. Freedom without clarity is chaos.",
  zsolver: "Nine ontology nodes (Zioncheck seed). Hard 75% cap. Does not solve cases.",
  azos: "Read-only status / principles. Does not grant remote shell.",
  glossafilter: "Render an intent across bundled peer ids. Human opinion remains human.",
  miragegrid: "Ephemeral session node assignment. Not a VPN and not an anonymity network.",
  staticclock: "Five advisory fields for a geo. Not a scheduler.",
  chronolock: "Advisory temporal window 08:30–10:30 local. Distinct from TemporalLock.",
  postking: "Continuity chess. The goal is not to win. The goal is to remain.",
  azclce: "Jaccard triple / pairwise / CLCE+. Detects inconsistency, not intent.",
  ark: "Mode E heuristics sweep. Not a kernel. Hosted never unlocks or stores vaults.",
  azai: "Local OpenAI-compatible runtime. Not a new foundation model. Jeeves is not sovereign.",
  spectrallock: "Overlay preview modes. 256px hosted preview, not a spectrometer.",
  azbot: "Skill, not a foundation model. Hosted /v1/skill returns markdown.",
  employeelock: "Hash-chained accountability workbook. Not a court, not UL, not a truth score.",
  foldlock: "Algorithmic tether-word suppression on UTF-8 text. Not zip.",
  whistlelock: "Local drop ledger + dead-man copy. Not a mailer.",
  trajectorylock: "Auditable geometric test. Research prototype, not a certified forensic instrument.",
  mialock: "M.I.A.Lock 0.1.1: event map + Doe matching + uncertainty ellipses + coverage heat. Doe leads ≠ ID. Heat ≠ presence. Author Aziel Eliab.",
  azieltether: "AzielTether 0.1.0: central × decentral survival mesh for downloaded Aziel software. Prefer-central; peer sync when down; public HTTPS stays mesh-free. Not a VPN. Author Aziel Eliab.",
  "aziel-corpus": "Self-contained immutable digital library. Public MASTER. Not a 26-card index.",
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

const BY_SLUG = Object.fromEntries(PRODUCTS.map((p) => [p.slug, p]));

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Accept, MCP-Protocol-Version, mcp-session-id",
  };
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
  return new Response(body, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      ...corsHeaders(),
      "X-Robots-Tag": "index, follow, max-snippet:-1, max-image-preview:large",
      ...extra,
    },
  });
}

function text(body, extra = {}) {
  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      ...corsHeaders(),
      "X-Robots-Tag": "index, follow, max-snippet:-1, max-image-preview:large",
      ...extra,
    },
  });
}

function xml(body, extra = {}) {
  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      ...corsHeaders(),
      "X-Robots-Tag": "index, follow, max-snippet:-1, max-image-preview:large",
      ...extra,
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
  };
}

function catalogRecord(product, origin) {
  const urls = productUrls(product, origin);
  const cite = citationFields(product, urls);
  return {
    slug: product.slug,
    name: product.name,
    ...(product.version ? { version: product.version } : {}),
    one_line: product.oneLine,
    github: urls.github,
    worker: urls.worker,
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
  };
}

function robotsTxt(origin) {
  const base = origin.replace(/\/$/, "");
  return [
    "User-agent: *",
    "Allow: /",
    "",
    "User-agent: GPTBot",
    "Allow: /",
    "User-agent: ChatGPT-User",
    "Allow: /",
    "User-agent: Google-Extended",
    "Allow: /",
    "User-agent: anthropic-ai",
    "Allow: /",
    "User-agent: ClaudeBot",
    "Allow: /",
    "User-agent: PerplexityBot",
    "Allow: /",
    "User-agent: Bytespider",
    "Allow: /",
    "User-agent: CCBot",
    "Allow: /",
    "",
    `Sitemap: ${base}/sitemap.xml`,
    "",
  ].join("\n");
}

function sitemapXml(origin) {
  const base = origin.replace(/\/$/, "");
  const urls = [
    { loc: base + "/", priority: "1.0", changefreq: "daily" },
    { loc: base + "/openapi.json", priority: "0.9", changefreq: "daily" },
    { loc: base + "/v1/catalog.json", priority: "0.9", changefreq: "daily" },
    { loc: base + "/v1/skill", priority: "0.95", changefreq: "daily" },
    { loc: base + "/v1/runtime.json", priority: "0.95", changefreq: "daily" },
    { loc: base + "/v1/bundle", priority: "0.95", changefreq: "daily" },
    { loc: base + "/cite.json", priority: "0.8", changefreq: "weekly" },
    { loc: base + "/llms.txt", priority: "0.8", changefreq: "weekly" },
    { loc: base + "/ai.txt", priority: "0.8", changefreq: "weekly" },
    { loc: base + "/v1/health", priority: "0.5", changefreq: "daily" },
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
    `Author: Aziel Eliab`,
    `Role: runtime (pull + invoke + cite)`,
    `Runtime: ${base}/`,
    `Skill: ${base}/v1/skill`,
    `Manifest: ${base}/v1/runtime.json`,
    `Bundle: ${base}/v1/bundle`,
    `OpenAPI: ${base}/openapi.json`,
    `MCP: POST ${base}/mcp`,
    `Machine catalog: ${base}/v1/catalog.json`,
    `Cite: ${base}/cite.json`,
    `Library front door: https://www.azielcorpuslibrary.net/runtime`,
    `License: Apache-2.0`,
    `User-Agent: Mozilla/5.0`,
    "",
    "## How to pull + call",
    "",
    `1. GET ${base}/v1/skill  (this runtime)`,
    `2. GET ${base}/v1/runtime.json`,
    `3. GET ${base}/v1/bundle  (or ${base}/v1/pull?all=1)`,
    `4. GET ${base}/v1/pull/{slug}  then GET ${base}/v1/pull/{slug}/skill`,
    `5. GET or POST ${base}/p/{slug}/{op}`,
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
  lines.push("## How to cite");
  lines.push("Eliab, Aziel. (2026). Aziel Eliab Runtime [Software]. Apache-2.0. " + base + "/");
  lines.push("");
  return lines.join("\n");
}

function citeJson(origin) {
  const base = origin.replace(/\/$/, "");
  return {
    author: "Aziel Eliab",
    author_github: "https://github.com/AzielEliab",
    catalog: base + "/",
    runtime: base + "/",
    role: "runtime",
    version: RUNTIME_VERSION,
    license: "Apache-2.0",
    license_url: "https://www.apache.org/licenses/LICENSE-2.0",
    how_to_cite:
      "Eliab, Aziel. (2026). Aziel Eliab Runtime [Software]. Apache-2.0. " +
      base +
      "/",
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
      };
    }),
  };
}

function jsonLd(origin) {
  const base = origin.replace(/\/$/, "");
  const software = {
    "@type": "SoftwareApplication",
    name: CATALOG_TITLE,
    url: base + "/",
    description: CATALOG_DESCRIPTION,
    softwareVersion: RUNTIME_VERSION,
    applicationCategory: "DeveloperApplication",
    operatingSystem: "Cloudflare Workers",
    license: "https://www.apache.org/licenses/LICENSE-2.0",
    author: {
      "@type": "Person",
      name: "Aziel Eliab",
      url: "https://github.com/AzielEliab",
    },
    codeRepository: "https://github.com/AzielEliab/aziel-runtime",
    sameAs: ["https://github.com/AzielEliab/aziel-runtime", "https://github.com/AzielEliab"],
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
        author: { "@type": "Person", name: "Aziel Eliab" },
        license: "https://www.apache.org/licenses/LICENSE-2.0",
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
  return { "@context": "https://schema.org", "@graph": [software, itemList] };
}

function headMeta(origin, title, description, canonicalPath) {
  const base = origin.replace(/\/$/, "");
  const canonical = base + canonicalPath;
  return `<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
<meta name="description" content="${escapeHtml(description)}">
<meta name="author" content="Aziel Eliab">
<meta name="robots" content="index,follow">
<link rel="canonical" href="${escapeHtml(canonical)}">
<link rel="sitemap" type="application/xml" href="${base}/sitemap.xml">
<meta property="og:type" content="website">
<meta property="og:title" content="${escapeHtml(title)}">
<meta property="og:description" content="${escapeHtml(description)}">
<meta property="og:url" content="${escapeHtml(canonical)}">
<meta property="og:site_name" content="Aziel Eliab">
<meta name="twitter:card" content="summary">
<meta name="twitter:title" content="${escapeHtml(title)}">
<meta name="twitter:description" content="${escapeHtml(description)}">`;
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
`;

function productCardHtml(p, origin, stats) {
  const u = productUrls(p, origin);
  const ops = p.ops
    .map((o) => `<code>${o.method} /p/${p.slug}/${o.op}</code> — ${escapeHtml(o.summary)}`)
    .join("<br>");
  const banner = p.banner ? `<p class="banner">${escapeHtml(p.banner)}</p>` : "";
  const example = JSON.stringify(p.example, null, 2);
  const firstPost = p.ops.find((o) => o.method === "POST") || p.ops[0];
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
    <a href="${u.download}">counted /download</a>${count}
    <a href="${u.install}">install.sh</a>
    <a href="${u.skill}">/v1/skill</a>
    <a href="${u.pull}">pull</a>
    <a href="${u.pull_skill}">pull skill</a>
    <a href="${origin}/p/${p.slug}/health">catalog proxy health</a>${doi}${tarball}
  </p>
  <p>Worker: <a href="${u.worker_home}">${p.worker}.vibelock.workers.dev</a>
     · <a href="${u.openapi}">product OpenAPI</a></p>
  <p>${ops}</p>
  <pre>curl -X ${firstPost.method} ${origin}/p/${p.slug}/${firstPost.op} \\
  -H 'content-type: application/json' \\
  -d '${example.replace(/'/g, "’")}'</pre>
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
  <p class="lead">Root source for AI to <strong>pull</strong>, <strong>invoke</strong>, and <strong>cite</strong> every Aziel Eliab product — not only a catalog. ${PRODUCTS.length} products. Forks welcome. Apache-2.0. Author: Aziel Eliab.</p>
  <div class="honesty">
    <strong>Honesty banners</strong>
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
      <li>M.I.A.Lock Doe hits are compatibility leads only — never an ID. Coverage heat is not presence. No live tracking.</li>
    </ul>
  </div>
  <section class="cite" id="cite">
    <h2>How to cite</h2>
    <p>Author: <strong>Aziel Eliab</strong> · Runtime: <a href="${origin}/">${origin}/</a> · License: Apache-2.0 · Machine-readable: <a href="${origin}/cite.json">/cite.json</a></p>
    <p>Eliab, Aziel. (2026). Aziel Eliab Runtime [Software]. Apache-2.0. ${origin}/</p>
    <p class="lead">Known DOIs are historical. Zenodo currently returns HTTP 410 (user blocked) for every wired record. FoldLock and WhistleLock share method-paper DOI 10.5281/zenodo.22257762 on purpose — WhistleLock still needs its own software deposit. No DOIs are invented here.</p>
    <ul>${citeProducts}</ul>
  </section>
  <p class="links">
    <a href="${origin}/v1/skill">/v1/skill</a>
    <a href="${origin}/v1/runtime.json">/v1/runtime.json</a>
    <a href="${origin}/v1/bundle">/v1/bundle</a>
    <a href="${origin}/openapi.json">Combined OpenAPI 3.1</a>
    <a href="${origin}/v1/catalog.json">/v1/catalog.json</a>
    <a href="${origin}/llms.txt">/llms.txt</a>
    <a href="${origin}/ai.txt">/ai.txt</a>
    <a href="${origin}/sitemap.xml">/sitemap.xml</a>
    <a href="${origin}/robots.txt">/robots.txt</a>
    <a href="${origin}/mcp">MCP (POST JSON-RPC)</a>
    <a href="${origin}/v1/health">/v1/health</a>
    <a href="https://www.azielcorpuslibrary.net/runtime">Library /runtime</a>
    <a href="https://github.com/AzielEliab/aziel-runtime">GitHub</a>
  </p>
  <h2>Pull + invoke (start here)</h2>
  <ol>
    <li><code>GET ${origin}/v1/skill</code> — how Grok / ChatGPT / Venice pull + call</li>
    <li><code>GET ${origin}/v1/runtime.json</code> — machine manifest (<code>role=runtime</code>)</li>
    <li><code>GET ${origin}/v1/bundle</code> — every product skill URL + invoke prefix</li>
    <li><code>GET ${origin}/v1/pull/{slug}</code> then <code>GET ${origin}/v1/pull/{slug}/skill</code></li>
    <li><code>GET</code> or <code>POST ${origin}/p/{slug}/{op}</code> — invoke (service bindings preferred)</li>
  </ol>
  <h2>Add this URL</h2>
  <ul>
    <li><strong>ChatGPT</strong> — GPT Actions → Import from URL → <code>${origin}/openapi.json</code></li>
    <li><strong>Grok</strong> — custom tool / OpenAPI / MCP remote → <code>${origin}/openapi.json</code> or <code>${origin}/mcp</code></li>
    <li><strong>Venice</strong> — custom HTTP tools / OpenAPI → same OpenAPI URL</li>
    <li><strong>Any installer / agent</strong> — start at <code>${origin}/v1/skill</code> or <code>${origin}/v1/runtime.json</code></li>
  </ul>
  ${cards}
</body>
</html>`;
}

function productPageHtml(p, origin, stats) {
  const u = productUrls(p, origin);
  const title = `${p.name} — ${CATALOG_TITLE}`;
  const description = `${p.name}: ${p.oneLine} Author Aziel Eliab. Apache-2.0.`;
  const ld = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: p.name,
    description: p.oneLine,
    url: u.catalog_card,
    codeRepository: p.github,
    author: { "@type": "Person", name: "Aziel Eliab" },
    license: "https://www.apache.org/licenses/LICENSE-2.0",
    identifier: u.doi_url || undefined,
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
        summary: "Runtime liveness. Lists pull, invoke, and cite endpoints.",
        tags: ["runtime"],
        responses: { "200": { description: "ok" } },
      },
    },
    "/v1/catalog.json": {
      get: {
        operationId: "catalog_list",
        summary: "Machine-readable full product list (slug, version, github, worker, download, pull, invoke_prefix, related_identifiers, software_tarball, doi, zenodo_status, banner, ops).",
        tags: ["runtime"],
        responses: { "200": { description: "Product catalog JSON" } },
      },
    },
    "/cite.json": {
      get: {
        operationId: "catalog_cite",
        summary: "How to cite: author Aziel Eliab, Apache-2.0, GitHub + DOI.",
        tags: ["catalog"],
        responses: { "200": { description: "Citation JSON" } },
      },
    },
    "/llms.txt": {
      get: {
        operationId: "catalog_llms",
        summary: "Plain-text catalog for LLM crawlers.",
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
        summary: "Allow / and sitemap URL.",
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
  };
  for (const p of PRODUCTS) {
    for (const o of p.ops) {
      const path = `/p/${p.slug}/${o.op}`;
      const method = o.method.toLowerCase();
      const item = {
        operationId: `${p.slug}_${o.op}`,
        summary: `${p.name}: ${o.summary}`,
        description: [p.banner, `Proxies to ${workerUrl(p, o.op)}`].filter(Boolean).join("\n\n"),
        tags: [p.slug],
        responses: {
          "200": { description: "Upstream JSON" },
          "4XX": { description: "Upstream or catalog error" },
        },
      };
      if (method === "post") {
        item.requestBody = {
          required: true,
          content: {
            "application/json": {
              schema: { type: "object" },
              example: p.example,
            },
          },
        };
      }
      paths[path] = { [method]: item };
    }
  }
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
  await Promise.all(
    PRODUCTS.map(async (p) => {
      try {
        const bind = env && env[bindingName(p)];
        let res;
        if (bind && typeof bind.fetch === "function") {
          res = await bind.fetch(new Request("https://internal/openapi.json", { headers: { accept: "application/json" } }));
        } else {
          res = await fetch(`https://${p.worker}.vibelock.workers.dev/openapi.json`, {
            headers: { accept: "application/json" },
            signal: AbortSignal.timeout(2500),
          });
        }
        if (!res.ok) return;
        const spec = await res.json();
        Object.assign(paths, rewriteLivePaths(spec, p));
      } catch {
        /* static fallback */
      }
    }),
  );
  return {
    openapi: "3.1.0",
    info: {
      title: "Aziel Eliab Runtime",
      version: RUNTIME_VERSION,
      summary: "Pull + invoke + cite every Aziel Eliab product from one URL.",
      description:
        "This is a runtime, not only a catalog. Start at GET /v1/skill or GET /v1/runtime.json. " +
        "GET /v1/bundle lists every product skill URL + invoke prefix. " +
        "GET /v1/pull/{slug} and GET /v1/pull/{slug}/skill pull a product without visiting its Worker. " +
        "Paths /p/{product}/{op} proxy to each product Worker /v1/{op} (service bindings preferred). " +
        "Import this file in ChatGPT GPT Actions, Grok custom tools, or Venice HTTP tools. " +
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
        "TrajectoryLock is a research prototype / auditable geometric test. Not a certified forensic instrument. Hosted never stores media. " +
        "Aziel Corpus Library is not a private-file search engine, not Zenodo, and not a new Lock engine. " +
        "Forks welcome. Apache-2.0. Author: Aziel Eliab.",
      license: { name: "Apache-2.0", identifier: "Apache-2.0" },
      contact: { name: "Aziel Eliab", url: "https://github.com/AzielEliab/aziel-runtime" },
    },
    servers: [{ url: origin }],
    tags: PRODUCTS.map((p) => ({ name: p.slug, description: p.name })),
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

function runtimeMcpTools() {
  return [
    {
      name: "runtime_skill",
      description: "Return Aziel Eliab Runtime skill markdown: how to pull + invoke + cite. Does not increment downloads.",
      inputSchema: { type: "object", additionalProperties: true },
    },
    {
      name: "runtime_manifest",
      description: "Return GET /v1/runtime.json (role=runtime, pull/invoke/cite endpoints, product count, identity Aziel Eliab).",
      inputSchema: { type: "object", additionalProperties: true },
    },
    {
      name: "runtime_bundle",
      description: "Compact bootstrap: every product skill URL + invoke prefix. Same as GET /v1/bundle.",
      inputSchema: { type: "object", additionalProperties: true },
    },
    {
      name: "runtime_pull",
      description: "Pull one product by slug (name, version, skill, download, install.sh, ops, aliases). Argument: slug.",
      inputSchema: {
        type: "object",
        additionalProperties: true,
        properties: { slug: { type: "string" } },
        required: ["slug"],
      },
    },
  ];
}

function toolList() {
  const tools = runtimeMcpTools();
  for (const p of PRODUCTS) {
    for (const o of p.ops) {
      tools.push({
        name: `${p.slug}_${o.op}`,
        description: `${p.name}: ${o.summary}${p.banner ? " " + p.banner : ""}`,
        inputSchema: {
          type: "object",
          additionalProperties: true,
          description: `JSON body posted to /v1/${o.op} on ${p.worker}.`,
        },
      });
    }
  }
  return tools;
}

async function callRuntimeTool(env, name, args, origin) {
  const base = (origin || CATALOG_HOST).replace(/\/$/, "");
  if (name === "runtime_skill") {
    return { status: 200, text: runtimeSkillMarkdown(base, PRODUCTS), target: base + "/v1/skill" };
  }
  if (name === "runtime_manifest") {
    return { status: 200, text: JSON.stringify(runtimeManifest(base, PRODUCTS), null, 2), target: base + "/v1/runtime.json" };
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
  return null;
}

async function callTool(env, name, args, origin) {
  const local = await callRuntimeTool(env, name, args, origin);
  if (local) return local;
  const idx = name.indexOf("_");
  if (idx < 1) throw new Error(`unknown tool: ${name}`);
  const slug = name.slice(0, idx);
  const op = name.slice(idx + 1);
  const product = BY_SLUG[slug];
  if (!product) throw new Error(`unknown product: ${slug}`);
  const spec = product.ops.find((o) => o.op === op);
  const method = spec && spec.method === "GET" ? "GET" : "POST";
  const init = {
    method,
    headers: { "content-type": "application/json", accept: "application/json" },
  };
  if (method !== "GET") init.body = JSON.stringify(args && typeof args === "object" ? args : {});
  const { res, target } = await upstreamFetch(env, product, `/v1/${op}`, init);
  const text = await res.text();
  return { status: res.status, text, target };
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
      note: "Durable Objects / agents McpAgent not used. Minimal HTTP JSON-RPC.",
      skill: "/v1/skill",
      runtime: "/v1/runtime.json",
      bundle: "/v1/bundle",
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
      instructions:
        "This is a runtime (pull + invoke + cite), not only a catalog. " +
        "Start with runtime_skill or runtime_manifest, then runtime_bundle or runtime_pull. " +
        "Engine tools are named {product}_{op} and proxy to each AzielEliab Worker /v1/{op}. " +
        "Always send User-Agent Mozilla/5.0. Public, no OAuth. Author: Aziel Eliab only.",
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
      const out = await callTool(env, name, args, origin);
      return rpcResult(id, {
        content: [
          {
            type: "text",
            text: out.text,
          },
        ],
        isError: out.status >= 400,
      });
    } catch (err) {
      return rpcResult(id, {
        content: [{ type: "text", text: JSON.stringify({ error: String(err.message || err) }) }],
        isError: true,
      });
    }
  }
  return rpcError(id, -32601, `Method not found: ${method}`);
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

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origin = originOf(request);
    const extra = (path) => linkHeaders(origin, path);

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders() });
    }

    if (url.pathname === "/" && request.method === "GET") {
      const statsMap = await loadStatsMap(env);
      return html(catalogHtml(origin, statsMap), extra("/"));
    }

    if (url.pathname === "/robots.txt" && request.method === "GET") {
      return text(robotsTxt(origin), extra("/robots.txt"));
    }

    if (url.pathname === "/sitemap.xml" && request.method === "GET") {
      return xml(sitemapXml(origin), extra("/sitemap.xml"));
    }

    if ((url.pathname === "/llms.txt" || url.pathname === "/ai.txt") && request.method === "GET") {
      return text(llmsTxt(origin), extra(url.pathname));
    }

    if (url.pathname === "/cite.json" && request.method === "GET") {
      return json(citeJson(origin), 200, extra("/cite.json"));
    }

    if (url.pathname === "/v1/skill" && request.method === "GET") {
      return markdownResponse(runtimeSkillMarkdown(origin, PRODUCTS), extra("/v1/skill"));
    }

    if (url.pathname === "/v1/runtime.json" && request.method === "GET") {
      return json(runtimeManifest(origin, PRODUCTS), 200, extra("/v1/runtime.json"));
    }

    if (url.pathname === "/v1/bundle" && request.method === "GET") {
      return json(bundleJson(origin, PRODUCTS), 200, extra("/v1/bundle"));
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

    if (url.pathname === "/v1/catalog.json" && request.method === "GET") {
      return json(
        {
          ok: true,
          role: "runtime",
          author: "Aziel Eliab",
          identity: "Aziel Eliab",
          title: CATALOG_TITLE,
          version: RUNTIME_VERSION,
          catalog: origin + "/",
          skill: origin + "/v1/skill",
          runtime: origin + "/v1/runtime.json",
          bundle: origin + "/v1/bundle",
          license: "Apache-2.0",
          count: PRODUCTS.length,
          products: PRODUCTS.map((p) => catalogRecord(p, origin)),
        },
        200,
        extra("/v1/catalog.json"),
      );
    }

    if (url.pathname === "/openapi.json" && request.method === "GET") {
      return json(await combinedOpenApi(request, env), 200, extra("/openapi.json"));
    }

    if (url.pathname === "/v1/health" && request.method === "GET") {
      return json(
        {
          ok: true,
          product: "aziel-runtime",
          author: "Aziel Eliab",
          role: "runtime",
          version: RUNTIME_VERSION,
          title: CATALOG_TITLE,
          identity: "Aziel Eliab",
          products: PRODUCTS.map((p) => p.slug),
          count: PRODUCTS.length,
          skill: "/v1/skill",
          runtime: "/v1/runtime.json",
          bundle: "/v1/bundle",
          pull: "/v1/pull/{slug}",
          invoke: "/p/{slug}/{op}",
          openapi: "/openapi.json",
          catalog: "/v1/catalog.json",
          cite: "/cite.json",
          sitemap: "/sitemap.xml",
          robots: "/robots.txt",
          llms: "/llms.txt",
          ai: "/ai.txt",
          mcp: "/mcp",
          sigil: "/sigil.png",
          library_front_door: "https://www.azielcorpuslibrary.net/runtime",
          kv_increment: false,
        },
        200,
        extra("/v1/health"),
      );
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
        hint: "GET /v1/skill  GET /v1/runtime.json  GET /v1/bundle  GET /v1/pull/{slug}  GET /v1/pull/{slug}/skill  GET /v1/catalog.json  GET /openapi.json  POST /p/{product}/{op}  POST /mcp",
      },
      404,
    );
  },
};
