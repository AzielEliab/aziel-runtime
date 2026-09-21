/**
 * Discoverability for Aziel Eliab Runtime (catalog hub) and GitBaby product Workers.
 * Public identity: Aziel Eliab (primary). Aziel Elroi Eliab is alternateName/aka only.
 * Do not invent DOIs. Do not invent hosts — worker origins come from the catalog.
 * SPDX-License-Identifier: Apache-2.0
 */

import { socialStatusField } from "./social-status.js";
import { CROSS_NETWORK_SURVIVAL, survivalHint } from "./cross-network-survival.js";
import {
  PERSON_JOB_TITLE,
  PERSON_SAME_AS,
  X_HANDLE,
  X_URL,
  personCrawlField,
  personLlmsBlock,
  personPageJsonLd,
  personSocialsField,
} from "./person-index.js";
import {
  TRADES_RUNTIME_CITE,
  TRADES_RUNTIME_DOWNLOAD,
  TRADES_RUNTIME_GITHUB,
  TRADES_RUNTIME_MCP,
  TRADES_RUNTIME_ORIGIN,
  TRADES_RUNTIME_VERSION,
  sisterProductHubFields,
} from "./sister-products.js";

export const AUTHOR_NAME = "Aziel Eliab";
export const AUTHOR_ALTERNATE_NAME = "Aziel Elroi Eliab";
export const AUTHOR_FAMILY_GIVEN = "Eliab, Aziel";
export const AUTHOR_GITHUB = "https://github.com/AzielEliab";
/** Hub Person sameAs (published). Runtime SoftwareApplication sameAs stays repo + Glama. */
export const AUTHOR_SAME_AS = PERSON_SAME_AS.slice();

/** Shared hub Person @id. Runtime is not the identity hub — do not use GitHub#person. */
export const AUTHOR_ID = "https://www.azieleliab.com/#aziel";

/** Hub identity for the suite. Worker origin is the execution endpoint, not the identity hub. */
export const RUNTIME_SOFTWARE_ID = "https://www.azieleliab.com/runtime#runtime";
export const RUNTIME_HUB_URL = "https://www.azieleliab.com/runtime";

/** Public product name. Do not mash with version + FragGate. Author is Aziel Eliab only. */
export const PRODUCT_NAME = "Aziel Runtime";
export const PRODUCT_SLUG = "aziel-runtime";
export const PRODUCT_ALTERNATE_NAME = "Aziel Eliab Runtime";

/** Public Worker HTML brand mark (rose-star image). Visible identity is Aziel Eliab only. */
export const BRAND_MARK_SRC = "/sigil.png";
export const BRAND_MARK_ALT = "Rose-star — Aziel Eliab";
export const BRAND_MARK_STAMP = AUTHOR_NAME;
export const RUNTIME_GITHUB = "https://github.com/AzielEliab/aziel-runtime";
/** Primary public host / discovery / install. Worker stays the HTTP/OpenAPI/MCP execution origin. */
export const RUNTIME_GLAMA = "https://glama.ai/mcp/servers/AzielEliab/aziel-runtime";
export const RUNTIME_GLAMA_AT = "https://glama.ai/mcp/servers/@AzielEliab/aziel-runtime";

export const RUNTIME_PAGE_TITLE =
  "Aziel Runtime — node-meshed MCP Softwares suite";

/** First sentence of the canonical abstract — title/one_line split, meaning intact. */
export const RUNTIME_ONE_LINE =
  "Aziel Runtime is a node-meshed orchestration suite of MCP-connected software designed to route catalog Softwares through the FragGate door, mint receipts, and coordinate mesh presence.";

/**
 * Canonical crawler abstract. Use verbatim on cite.json abstract, homepage lead,
 * llms.txt opening, and JSON-LD description. Falsifiable designed-purpose only.
 *
 * AZRT-1.9-CLOSE-1.0 / later version rolls: put version notes BELOW this abstract.
 * Never replace the abstract with a changelog. Never mash "runtime 1.9 FragGate".
 */
export const RUNTIME_ABSTRACT =
  "Aziel Runtime is a node-meshed orchestration suite of MCP-connected software designed to route catalog Softwares through the FragGate door, mint receipts, and coordinate mesh presence. Use it to list, describe, and call product operations over MCP or OpenAPI, then keep the returned receipt. It exists so each Softwares product stays a separate engine behind one door.";

/** Heritage list — do not publish on llms / cite / about. Positive definition lives in RUNTIME_ABSTRACT. */
export const RUNTIME_NOT = Object.freeze([]);

export function runtimeAboutField(origin) {
  const base = String(origin || "").replace(/\/$/, "");
  return {
    what: RUNTIME_ABSTRACT,
    product: PRODUCT_NAME,
    slug: PRODUCT_SLUG,
    for_whom:
      "Agents (OpenAPI / MCP in chat) and humans (Worker UI + counted /download). Hubs refresh Softwares tabs from GET /v1/software.",
    how_agents: `FragGate list → describe → call. Prefer ${base}/mcp and ${base}/v1/software. POST ${base}/v1/fraggate/call.`,
    how_hubs:
      "Hubs (azieleliab.com, azielcorpuslibrary.net, godlock.uk) fetch GET /v1/software on each Softwares-tab request.",
    architecture: {
      fraggate: "THE single public executable door (list → describe → call).",
      softwares: "Plain → Gate → Lock catalog products with true in-process engines where live.",
      dual_surface: "Agents via OpenAPI/MCP; humans via Worker UI + counted /download.",
      semantic_bridge:
        "Cap-7 mesh names via MirageGrid only. Inherit hub designs only (azcorpus + azlibrary on the library hub). design_of hub_designs. resolves_to_hub false. name_may_change. Canonical hubs immutable. GET /v1/mesh never enables.",
      cold_multi_shelf:
        "COLD-MULTI-SHELF-1.0 cite of corpus#96 /shelves. Plane A = 5 published surfaces / 2 family radii / 1 independent live. Plane B SLOT (Codeberg + archive.org PASS still SLOT at https://archive.org/details/aziel-lockset-tip + https://archive.org/details/aziel-lockset-tip_202609, same blast_radius, pack b549362c…; Framagit URL null; doi null). Plane C USB SLOT. Runtime Worker is the same Plane A tunnel.",
      nodemesh:
        "QNM read-only suite-presence is ON by default. GET /v1/mesh never enables radios beyond that. Public Live Nodes (live_nodes) count human mesh users plus cited human uses (USES). software_nodes is the {slug}-worker roster and never feeds Live Nodes. Local qnm-node.",
      master33: "Domains are isolation labels. FragGate is the single door. Lamb Lens ethics hop after FragGate.",
    },
    changelog_below_abstract: true,
    version_notes: "Below the abstract only. AZRT-1.9-CLOSE-1.0, 2.0.0-rc1, and later rolls must not replace crawler lead copy.",
    author: AUTHOR_NAME,
    identity: AUTHOR_NAME,
    aka: AUTHOR_ALTERNATE_NAME,
  };
}

/** Fail if crawler-lead text is a version mash (1.7.x / 1.9 / AZRT-…). */
export const CRAWLER_LEAD_VERSION_RE = /\b(?:[12]\.\d+\.\d+(?:-rc\d+)?|AZRT-1\.9)\b/;

export function llmsWhatThisIsBlock(calling = null) {
  const rotated = calling && calling.rotated === true;
  const abstract = rotated
    ? RUNTIME_ABSTRACT.replace(/\bAziel Runtime\b/g, calling.calling_name)
    : RUNTIME_ABSTRACT;
  const publicName = rotated
    ? `Public calling name: ${calling.calling_name} (${calling.calling_slug}). ${calling.alert}. Author / identity: Aziel Eliab only (@id ${AUTHOR_ID}). Also known as Aziel Elroi Eliab (alternateName only). Runtime is the execution surface. Person @id is ${AUTHOR_ID}. Old name Aziel Runtime may remain on cold shelves as history.`
    : `Public name: Aziel Runtime (aziel-runtime). Author / identity: Aziel Eliab only (@id ${AUTHOR_ID}). Also known as Aziel Elroi Eliab (alternateName only). Runtime is the execution surface. Person @id is ${AUTHOR_ID}.`;
  return [
    "## What this is",
    "",
    abstract,
    "",
    publicName,
    "",
    "## How to use",
    "",
    "1. Agents: fraggate_list → fraggate_describe → fraggate_call (POST /mcp or POST /v1/fraggate/call).",
    "2. Hubs: GET /v1/software (mirror GET /v1/fraggate/software) on each Softwares-tab refresh.",
    "3. Humans: Worker UI + counted /download — dual-surface. POST /p/{slug}/{op} is proxy. Exec is FragGate.",
    "",
    "FragGate is THE single public executable door (list → describe → call).",
    "Softwares = Plain → Gate → Lock catalog products with true in-process engines where live.",
    "NodeMesh / QNM read-only suite-presence is ON by default. GET /v1/mesh never enables radios beyond that. Public Live Nodes (live_nodes) count human mesh users plus cited human uses (USES). software_nodes is the {slug}-worker roster and never feeds Live Nodes. Local qnm-node.",
    "MASTER-33: domains are isolation labels. FragGate is the single door. Lamb Lens ethics hop after FragGate.",
    "",
  ].join("\n");
}

export const LIBRARY_NAME = "Aziel Digital Library";
export const LIBRARY_ORIGIN = "https://www.azielcorpuslibrary.net";
export const LIBRARY_SITEMAP = `${LIBRARY_ORIGIN}/sitemap.xml`;
export const LIBRARY_CITE = `${LIBRARY_ORIGIN}/cite.json`;
export const LIBRARY_LLMS = `${LIBRARY_ORIGIN}/llms.txt`;
/** Library reverse-proxy / mirror of this Worker. Same FragGate door. */
export const LIBRARY_MIRROR = `${LIBRARY_ORIGIN}/runtime`;

export const GODLOCK_UK_ORIGIN = "https://godlock.uk";
export const GODLOCK_UK_SITEMAP = `${GODLOCK_UK_ORIGIN}/sitemap.xml`;
export const GODLOCK_UK_CITE = `${GODLOCK_UK_ORIGIN}/cite.json`;
export const GODLOCK_UK_LLMS = `${GODLOCK_UK_ORIGIN}/llms.txt`;
export const GODLOCK_UK_SOFTWARE_TAB = `${GODLOCK_UK_ORIGIN}/software`;

/** Sister historical archive. Not a Softwares hub. www canonical matches live archive cite. */
export const HEDIDNTJUMP_NAME = "He Didn't Jump";
export const HEDIDNTJUMP_ORIGIN = "https://www.hedidntjump.com";
export const HEDIDNTJUMP_HOME = `${HEDIDNTJUMP_ORIGIN}/`;
export const HEDIDNTJUMP_SITEMAP = `${HEDIDNTJUMP_ORIGIN}/sitemap.xml`;
export const HEDIDNTJUMP_CITE = `${HEDIDNTJUMP_ORIGIN}/cite.json`;
export const HEDIDNTJUMP_LLMS = `${HEDIDNTJUMP_ORIGIN}/llms.txt`;

/** Canonical author site (www). Apex azieleliab.com redirects here. */
export const AUTHOR_SITE_ORIGIN = "https://www.azieleliab.com";
export const AUTHOR_SITE_APEX = "https://azieleliab.com";
export const AUTHOR_SITE_SITEMAP = `${AUTHOR_SITE_ORIGIN}/sitemap.xml`;
export const AUTHOR_SITE_CITE = `${AUTHOR_SITE_ORIGIN}/cite.json`;
export const AUTHOR_SITE_LLMS = `${AUTHOR_SITE_ORIGIN}/llms.txt`;
export const AUTHOR_SITE_SOFTWARE_TAB = `${AUTHOR_SITE_ORIGIN}/software`;
export const AUTHOR_SITE_RUNTIME = `${AUTHOR_SITE_ORIGIN}/runtime`;

export const LIBRARY_SOFTWARE_TAB = `${LIBRARY_ORIGIN}/software`;

export const AZCOHERENCE_GITHUB = "https://github.com/AzielEliab/AZCoherence";
export const AZCOHERENCE_WORKER = "https://azcoherence-download-tracker.vibelock.workers.dev";

/**
 * Softwares hubs that refresh tabs from GET /v1/software.
 * Crawl URLs only — do not invent mesh enable, Remain-Off, or CF tokens.
 */
export function softwareHubCrawl() {
  return [
    {
      id: "azieleliab",
      name: AUTHOR_NAME,
      origin: AUTHOR_SITE_ORIGIN,
      home: `${AUTHOR_SITE_ORIGIN}/`,
      software_tab: AUTHOR_SITE_SOFTWARE_TAB,
      cite: AUTHOR_SITE_CITE,
      llms: AUTHOR_SITE_LLMS,
      ai: `${AUTHOR_SITE_ORIGIN}/ai.txt`,
      sitemap: AUTHOR_SITE_SITEMAP,
      robots: `${AUTHOR_SITE_ORIGIN}/robots.txt`,
      runtime: AUTHOR_SITE_RUNTIME,
      software_catalog: `${AUTHOR_SITE_ORIGIN}/v1/software`,
      donate: DONATE_CANONICAL,
    },
    {
      id: "library",
      name: LIBRARY_NAME,
      origin: LIBRARY_ORIGIN,
      home: `${LIBRARY_ORIGIN}/`,
      software_tab: LIBRARY_SOFTWARE_TAB,
      cite: LIBRARY_CITE,
      llms: LIBRARY_LLMS,
      ai: `${LIBRARY_ORIGIN}/ai.txt`,
      sitemap: LIBRARY_SITEMAP,
      robots: `${LIBRARY_ORIGIN}/robots.txt`,
      runtime: LIBRARY_MIRROR,
      software_catalog: `${LIBRARY_ORIGIN}/v1/software`,
    },
    {
      id: "godlock.uk",
      name: "GodLock",
      origin: GODLOCK_UK_ORIGIN,
      home: `${GODLOCK_UK_ORIGIN}/`,
      software_tab: GODLOCK_UK_SOFTWARE_TAB,
      cite: GODLOCK_UK_CITE,
      llms: GODLOCK_UK_LLMS,
      ai: `${GODLOCK_UK_ORIGIN}/ai.txt`,
      sitemap: GODLOCK_UK_SITEMAP,
      robots: `${GODLOCK_UK_ORIGIN}/robots.txt`,
      runtime: `${GODLOCK_UK_ORIGIN}/runtime`,
      software_catalog: `${GODLOCK_UK_ORIGIN}/runtime/v1/software`,
    },
  ];
}

/**
 * Sister archives in the AZindex cross-index. Not Softwares hubs. Not FragGate engines.
 * Sitemap loc uses the www host the live archive cite.json advertises.
 */
export function sisterArchiveCrawl() {
  return [
    {
      id: "hedidntjump",
      name: HEDIDNTJUMP_NAME,
      origin: HEDIDNTJUMP_ORIGIN,
      home: HEDIDNTJUMP_HOME,
      cite: HEDIDNTJUMP_CITE,
      llms: HEDIDNTJUMP_LLMS,
      ai: `${HEDIDNTJUMP_ORIGIN}/ai.txt`,
      sitemap: HEDIDNTJUMP_SITEMAP,
      robots: `${HEDIDNTJUMP_ORIGIN}/robots.txt`,
      software_tab: false,
      fraggate_engine: false,
      note: "Sister historical archive. Cross-index only. Zioncheck archive sister.",
    },
  ];
}

export function sisterArchiveSitemaps() {
  return sisterArchiveCrawl().map((a) => a.sitemap);
}

export function sisterArchiveCiteField() {
  return {
    author: AUTHOR_NAME,
    identity: AUTHOR_NAME,
    software_tab: false,
    fraggate_engine: false,
    note: "Sister historical archives. Listed on sitemap-index / llms / cite for AZindex discovery. Zioncheck archive sister.",
    archives: sisterArchiveCrawl(),
  };
}

export {
  TRADES_RUNTIME_CITE,
  TRADES_RUNTIME_DOWNLOAD,
  TRADES_RUNTIME_GITHUB,
  TRADES_RUNTIME_HOME,
  TRADES_RUNTIME_LLMS,
  TRADES_RUNTIME_MCP,
  TRADES_RUNTIME_NAME,
  TRADES_RUNTIME_ORIGIN,
  TRADES_RUNTIME_SLUG,
  TRADES_RUNTIME_VERSION,
  llmsSisterProductsBlock,
  sisterProductCiteField,
  sisterProductHubFields,
  tradesRuntimeCiteCard,
} from "./sister-products.js";

export function hubPageSitemapUrls() {
  const out = [];
  const seen = new Set();
  const push = (url) => {
    if (!url || seen.has(url)) return;
    seen.add(url);
    out.push(url);
  };
  for (const h of softwareHubCrawl()) {
    for (const url of [h.home, h.software_tab, h.cite, h.llms, h.sitemap, h.runtime]) {
      push(url);
    }
  }
  for (const a of sisterArchiveCrawl()) {
    for (const url of [a.home, a.cite, a.llms, a.sitemap]) {
      push(url);
    }
  }
  return out;
}

export function describeSitemapUrls(origin, slugs) {
  const base = String(origin || "").replace(/\/$/, "");
  const seen = new Set();
  const out = [`${base}/v1/fraggate/describe`];
  seen.add(out[0]);
  for (const slug of slugs || []) {
    const loc = `${base}/v1/fraggate/describe?slug=${encodeURIComponent(slug)}`;
    if (seen.has(loc)) continue;
    seen.add(loc);
    out.push(loc);
  }
  return out;
}

export function azcoherenceCiteField(origin) {
  const base = String(origin || "").replace(/\/$/, "");
  return {
    slug: "azcoherence",
    name: "AZCoherence",
    spec: "AZC-0.1",
    author: AUTHOR_NAME,
    identity: AUTHOR_NAME,
    github: AZCOHERENCE_GITHUB,
    worker_home: `${AZCOHERENCE_WORKER}/`,
    download: `${AZCOHERENCE_WORKER}/download`,
    catalog_card: `${base}/p/azcoherence`,
    fraggate_describe: `${base}/v1/fraggate/describe?slug=azcoherence`,
    software: `${base}/v1/software`,
    how_to_cite: `${AUTHOR_FAMILY_GIVEN}. (2026). AZCoherence 0.1.0 [Software]. Apache-2.0. ${AZCOHERENCE_GITHUB}`,
    note: "Softwares-tab Plain. Scoring-review placement (domain null). Second-pass triad coherence. Peer AZ-CLCE. Neighbor of AKM-TRIAD fabric. GET /v1/mesh never enables.",
    hubs: softwareHubCrawl().map((h) => ({ id: h.id, software_tab: h.software_tab, cite: h.cite })),
  };
}

export function hubsCiteField() {
  return {
    author: AUTHOR_NAME,
    identity: AUTHOR_NAME,
    author_id: AUTHOR_ID,
    mesh_get_never_enables: true,
    remain_off_do_not_enable: true,
    note: "Softwares hubs fetch GET /v1/software on each Software-tab request. Cross-link cite.json / llms.txt / sitemap.xml on each hub. Do not invent mesh enable or Remain-Off items.",
    hubs: softwareHubCrawl(),
  };
}

export function llmsHubsBlock() {
  const lines = [
    "## Softwares hubs",
    "",
    "Hubs refresh Software tabs from GET /v1/software (mirror GET /v1/fraggate/software). Do not hand-edit hub copy. Identity Aziel Eliab only. GET /v1/mesh never enables.",
    "",
  ];
  for (const h of softwareHubCrawl()) {
    lines.push(`### ${h.name} (${h.id})`);
    lines.push(`Home: ${h.home}`);
    lines.push(`Software tab: ${h.software_tab}`);
    lines.push(`cite.json: ${h.cite}`);
    lines.push(`llms.txt: ${h.llms}`);
    lines.push(`sitemap.xml: ${h.sitemap}`);
    lines.push(`robots.txt: ${h.robots}`);
    lines.push(`Runtime door: ${h.runtime}`);
    lines.push(`Hub software catalog: ${h.software_catalog}`);
    lines.push("");
  }
  return lines.join("\n");
}

/** Canonical donate rails live on hubs. Runtime and download-trackers only link. Do not invent wallets. */
export const DONATE_CANONICAL = "https://www.azieleliab.com/donate";
export const DONATE_FOOTER_RUNTIME = "Donate";
export const DONATE_FOOTER_PRODUCT = "Support the work";

/** Live catalog probe 2026-09-05: product Worker /sitemap.xml was 404. Do not list it. */
export const MISSING_PRODUCT_SITEMAP_SLUGS = Object.freeze(["vibelock"]);

/**
 * Live catalog probe 2026-09-05: product Worker /llms.txt was 404.
 * Still publish the expected GitBaby URL in catalog JSON; HTML links only when live.
 */
export const MISSING_PRODUCT_LLMS_SLUGS = Object.freeze([
  "godlock",
  "miragegrid",
  "staticclock",
  "azclce",
  "azai",
  "azbot",
]);

/**
 * Major search + AI crawlers. Each gets Allow: / with no matching Disallow.
 * Names are canonical (Meta-ExternalAgent, not meta-externalagent).
 * uniqueUserAgents() drops case-only duplicates; first listing wins.
 * Cloudflare content-signal blocks must not appear on GitBaby Workers.
 *
 * User-agent * stays open (Allow: / + Content-Signal). Do not Disallow /v1
 * or /openapi. This Worker has no private /api/ or /admin/ routes.
 */
export const AI_CRAWLER_AGENTS = Object.freeze([
  "GPTBot",
  "ChatGPT-User",
  "OAI-SearchBot",
  "Google-Extended",
  "Googlebot",
  "GoogleOther",
  "Google-CloudVertexBot",
  "ClaudeBot",
  "Claude-SearchBot",
  "Claude-User",
  "anthropic-ai",
  "PerplexityBot",
  "Perplexity-User",
  "bingbot",
  "Meta-ExternalAgent",
  "Meta-ExternalFetcher",
  "Meta-WebIndexer",
  "FacebookBot",
  "facebookexternalhit",
  "Meta-ExternalAds",
  "Applebot",
  "Applebot-Extended",
  "Amazonbot",
  "DuckDuckBot",
  "DuckAssistBot",
  "MistralAI-User",
  "YouBot",
  "CCBot",
  "cohere-ai",
  "cohere-training-data-crawler",
  "Diffbot",
  "AI2Bot",
  "AI2Bot-Dolma",
  "Timpibot",
  "Petalbot",
  "Bytespider",
  "Omgili",
  "Omgilibot",
  "FirecrawlAgent",
  "ImagesiftBot",
  "Cloudflare-AI-Search",
  "TikTokSpider",
  "Baiduspider",
  "Baiduspider-render",
  "Baiduspider-ai",
  "YandexBot",
  "PanguBot",
  "Kangaroo Bot",
  "Cotoyogi",
  "aiHitBot",
  "webzio-extended",
  "ICC-Crawler",
  "DataForSeoBot",
  "AwarioBot",
  "AwarioSmartBot",
  "AwarioRssBot",
  "Sentibot",
  "peer39_crawler",
  "Seekr",
  "Meltwater",
  "TurnitinBot",
  "Factset_spyderbot",
  "NeevaBot",
]);

/** First listing wins; later case-only variants (meta-externalagent) are dropped. */
export function uniqueUserAgents(agents) {
  const seen = new Set();
  const out = [];
  for (const agent of agents) {
    const key = String(agent).toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(agent);
  }
  return out;
}

export function productWorkerOrigin(product) {
  if (!product) return null;
  if (product.slug === "aziel-corpus") return LIBRARY_ORIGIN;
  if (!product.worker) return null;
  return `https://${product.worker}.vibelock.workers.dev`;
}

export function productCrawlUrls(product) {
  const host = productWorkerOrigin(product);
  if (!host) {
    return {
      worker_home: null,
      cite: null,
      llms: null,
      download: null,
      sitemap: null,
      has_sitemap: false,
      has_llms: false,
      in_runtime: true,
    };
  }
  const hasSitemap = !MISSING_PRODUCT_SITEMAP_SLUGS.includes(product.slug);
  const hasLlms = !MISSING_PRODUCT_LLMS_SLUGS.includes(product.slug);
  return {
    worker_home: host + "/",
    cite: host + "/cite.json",
    llms: host + "/llms.txt",
    download: host + "/download",
    sitemap: host + "/sitemap.xml",
    has_sitemap: hasSitemap,
    has_llms: hasLlms,
  };
}

export function extraHubSitemaps() {
  return [AUTHOR_SITE_SITEMAP, LIBRARY_SITEMAP, GODLOCK_UK_SITEMAP];
}

export function liveProductSitemapUrls(products) {
  return products
    .filter((p) => p.worker && !MISSING_PRODUCT_SITEMAP_SLUGS.includes(p.slug))
    .map((p) => productWorkerOrigin(p) + "/sitemap.xml");
}

export function hubSitemapList(origin, products) {
  const base = origin.replace(/\/$/, "");
  const seen = new Set();
  const out = [];
  const push = (url) => {
    if (!url || seen.has(url)) return;
    seen.add(url);
    out.push(url);
  };
  push(`${base}/sitemap.xml`);
  for (const url of extraHubSitemaps()) push(url);
  for (const url of sisterArchiveSitemaps()) push(url);
  for (const url of liveProductSitemapUrls(products)) push(url);
  return out;
}

function escapeXml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function robotsTxt(origin, products) {
  const base = origin.replace(/\/$/, "");
  const lines = [
    "# Aziel Eliab Runtime — open crawl for Google and AI search.",
    "# Author: Aziel Eliab. Also known as Aziel Elroi Eliab (alternateName only).",
    `# Person sameAs: hubs + GitHub + Glama + ${X_URL} (${X_HANDLE}).`,
    "# Content-Signal opens search + AI input + AI train. No Disallow for GPTBot.",
    "# Allow /v1/software /v1/update /mcp /openapi /survival — hubs and agents fetch these.",
    "# Sitemap index lists this host, azieleliab.com, azielcorpuslibrary.net, godlock.uk, www.hedidntjump.com (sister archive), and live product Workers.",
    "",
    "User-agent: *",
    "Allow: /",
    "Content-Signal: search=yes, ai-input=yes, ai-train=yes",
    "",
  ];
  for (const agent of uniqueUserAgents(AI_CRAWLER_AGENTS)) {
    lines.push(`User-agent: ${agent}`);
    lines.push("Allow: /");
  }
  lines.push("");
  lines.push(`Sitemap: ${base}/sitemap-index.xml`);
  for (const url of hubSitemapList(origin, products)) {
    lines.push(`Sitemap: ${url}`);
  }
  lines.push("");
  return lines.join("\n");
}

export function sitemapIndexXml(origin, products, lastmod) {
  const entries = hubSitemapList(origin, products)
    .map(
      (loc) =>
        `  <sitemap>\n    <loc>${escapeXml(loc)}</loc>\n    <lastmod>${lastmod}</lastmod>\n  </sitemap>`,
    )
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries}
</sitemapindex>
`;
}

/** HTML-embedded Person. Roles + published sameAs. No 15:20 text on pages. */
export function personJsonLd() {
  return personPageJsonLd();
}

export function libraryJsonLd() {
  return {
    "@type": "SoftwareApplication",
    "@id": `${LIBRARY_ORIGIN}/#library`,
    name: LIBRARY_NAME,
    alternateName: ["Aziel Corpus Library"],
    url: LIBRARY_ORIGIN + "/",
    description:
      "Self-contained immutable digital library. Public MASTER. Counted package download. Mesh-resident website designs azcorpus + azlibrary downloadable to nodes. Author Aziel Eliab. Not a 26-card software index.",
    applicationCategory: "ReferenceApplication",
    operatingSystem: "Cloudflare Workers",
    license: "https://www.apache.org/licenses/LICENSE-2.0",
    author: { "@id": AUTHOR_ID },
    codeRepository: "https://github.com/AzielEliab/aziel-corpus",
    downloadUrl: `${LIBRARY_ORIGIN}/download`,
    sameAs: [LIBRARY_CITE, LIBRARY_LLMS, LIBRARY_SITEMAP],
  };
}

/** Runtime SoftwareApplication sameAs — repo + Glama listing. Worker origin is url, not Person identity. */
export function runtimeSoftwareSameAs() {
  return [RUNTIME_GITHUB, RUNTIME_GLAMA];
}

/**
 * Named suite components only. Exact public names.
 * Do not publish MCP operation names (fraggate_call, runtime_run, …) as schema entities.
 */
export const NAMED_RUNTIME_TOOLS = Object.freeze([
  { slug: "fraggate", name: "FragGate" },
  { slug: "forgereceipts", name: "ForgeReceipts" },
  { slug: "decisiongate", name: "DecisionGATE" },
  { slug: "temporallock", name: "TemporalLock" },
  { slug: "trajectorylock", name: "TrajectoryLock" },
  { slug: "peacelock", name: "PeaceLock" },
  { slug: "godlock", name: "GodLock" },
  { slug: "azos", name: "AZ-OS" },
  { slug: "azcoherence", name: "AZCoherence" },
  { slug: "4dmap", name: "4DMap" },
  { slug: "aziel-corpus", name: "Aziel Corpus" },
  { slug: "jeeves", name: "Ask Jeeves" },
  { slug: "azbrowser", name: "AZBrowser" },
  { slug: "azmail", name: "AZMail" },
  { slug: "azhub", name: "AZHub" },
  { slug: "azinterface", name: "AZInterface" },
  { slug: "spectrallock", name: "SpectralLock" },
  { slug: "shadowlock", name: "ShadowLock" },
  { slug: "foldlock", name: "FoldLock" },
  { slug: "codelock", name: "CodeLock" },
  { slug: "vibelock", name: "VibeLock" },
]);

export const NAMED_COMPONENTS_LINE =
  "Includes named components such as FragGate, ForgeReceipts, DecisionGATE, TemporalLock, GodLock, AZ-OS, AZCoherence, 4DMap, Aziel Corpus, and Ask Jeeves.";

export function namedToolId(slug) {
  return `${AUTHOR_SITE_ORIGIN}/runtime#${slug}`;
}

export function namedToolJsonLd(tool) {
  return {
    "@type": "SoftwareApplication",
    "@id": namedToolId(tool.slug),
    name: tool.name,
    author: { "@id": AUTHOR_ID },
    isPartOf: { "@id": RUNTIME_SOFTWARE_ID },
  };
}

export function namedToolsJsonLd() {
  return NAMED_RUNTIME_TOOLS.map(namedToolJsonLd);
}

export function runtimeHasPart() {
  return NAMED_RUNTIME_TOOLS.map((tool) => ({ "@id": namedToolId(tool.slug) }));
}

/**
 * Parent Runtime SoftwareApplication — hub @id.
 * Worker origin is the execution endpoint (`url`). `relatedLink` is the
 * primary discovery / install host (Glama). Identity `@id` stays the hub.
 */
export function runtimeSoftwareJsonLd(origin, extra = {}) {
  const base = String(origin || "").replace(/\/$/, "");
  const execution = `${base}/`;
  const rest = { ...extra };
  delete rest.hasPart;
  delete rest["@id"];
  delete rest.author;
  delete rest.sameAs;
  return {
    "@type": "SoftwareApplication",
    "@id": RUNTIME_SOFTWARE_ID,
    name: PRODUCT_NAME,
    alternateName: [PRODUCT_ALTERNATE_NAME],
    url: execution,
    relatedLink: RUNTIME_GLAMA,
    description: RUNTIME_ABSTRACT,
    applicationCategory: "DeveloperApplication",
    operatingSystem: "Cloudflare Workers",
    license: "https://www.apache.org/licenses/LICENSE-2.0",
    author: { "@id": AUTHOR_ID },
    creator: { "@id": AUTHOR_ID },
    codeRepository: RUNTIME_GITHUB,
    sameAs: runtimeSoftwareSameAs(),
    ...rest,
    hasPart: runtimeHasPart(),
  };
}

export const ECOSYSTEM_HEADING = "Part of the Aziel Eliab ecosystem";

/** Visible + cite ecosystem doors. Do not invent hosts. */
export const ECOSYSTEM_LINKS = Object.freeze([
  { label: "Try on Glama (primary host)", url: RUNTIME_GLAMA },
  { label: "Official site", url: `${AUTHOR_SITE_ORIGIN}/` },
  { label: "Aziel Corpus Library", url: `${LIBRARY_ORIGIN}/` },
  { label: "Aziel Runtime on GitHub", url: RUNTIME_GITHUB },
  { label: "GodLock", url: `${GODLOCK_UK_ORIGIN}/` },
  { label: HEDIDNTJUMP_NAME, url: HEDIDNTJUMP_HOME },
]);

/** Visible + llms sister-site doors. Not Softwares hubs. */
export function llmsEcosystemBlock() {
  const lines = [
    "## Ecosystem",
    "",
    `${ECOSYSTEM_HEADING}. Identity ${AUTHOR_NAME} only. Softwares hubs refresh from GET /v1/software. Sister archive: ${HEDIDNTJUMP_HOME}.`,
    "",
  ];
  for (const link of ECOSYSTEM_LINKS) {
    lines.push(`- ${link.label}: ${link.url}`);
  }
  lines.push("");
  return lines.join("\n");
}

export function ecosystemJsonLd(origin) {
  const base = String(origin || "").replace(/\/$/, "");
  return {
    "@type": "ItemList",
    "@id": `${base}/#ecosystem`,
    name: ECOSYSTEM_HEADING,
    itemListElement: ECOSYSTEM_LINKS.map((link, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: link.label,
      url: link.url,
    })),
  };
}

/**
 * Discovery / install host fields. `host` stays the Worker execution origin
 * (NO-LIE: Glama is not the HTTP API). Agents that look for "where to
 * find/install us" should read `primary_host` / `homepage`.
 */
export function discoveryHostFields(origin) {
  const base = String(origin || "").replace(/\/$/, "");
  return {
    primary_host: RUNTIME_GLAMA,
    primary_host_alias: RUNTIME_GLAMA_AT,
    homepage: RUNTIME_GLAMA,
    host: base ? `${base}/` : undefined,
    library_mirror: LIBRARY_MIRROR,
    entity_parent: RUNTIME_HUB_URL,
  };
}

export function entityGraphCiteField(origin) {
  const base = String(origin || "").replace(/\/$/, "");
  return {
    person: AUTHOR_ID,
    runtime: RUNTIME_SOFTWARE_ID,
    execution_url: `${base}/`,
    relatedLink: RUNTIME_GLAMA,
    primary_host: RUNTIME_GLAMA,
    primary_host_alias: RUNTIME_GLAMA_AT,
    identity_hub: `${AUTHOR_SITE_ORIGIN}/`,
    sameAs: runtimeSoftwareSameAs(),
    named_tools: NAMED_RUNTIME_TOOLS.map((tool) => ({
      slug: tool.slug,
      name: tool.name,
      "@id": namedToolId(tool.slug),
    })),
    ecosystem: ECOSYSTEM_LINKS.map((link) => ({ ...link })),
    person_jsonld: `${base}/person.jsonld`,
    who_is: `${base}/who-is`,
    who_is_txt: `${base}/who-is-aziel-eliab.txt`,
    note: "Runtime parent @id is the hub suite node. Worker origin is the execution endpoint (`url` / `execution_url`) and stays self-canonical. relatedLink is the Glama discovery / install host. hasPart is named tools only — not MCP operation names. Person machine files are /person.jsonld and /who-is — not visible HTML chrome.",
  };
}

export function catalogHubFields(origin) {
  const base = origin.replace(/\/$/, "");
  const social = socialStatusField(base);
  return {
    author: AUTHOR_NAME,
    identity: AUTHOR_NAME,
    author_id: AUTHOR_ID,
    aka: AUTHOR_ALTERNATE_NAME,
    alternateName: AUTHOR_ALTERNATE_NAME,
    library: LIBRARY_ORIGIN + "/",
    library_name: LIBRARY_NAME,
    library_cite: LIBRARY_CITE,
    library_llms: LIBRARY_LLMS,
    library_sitemap: LIBRARY_SITEMAP,
    library_mirror: LIBRARY_MIRROR,
    primary_host: RUNTIME_GLAMA,
    primary_host_alias: RUNTIME_GLAMA_AT,
    homepage: RUNTIME_GLAMA,
    godlock_uk: GODLOCK_UK_ORIGIN + "/",
    godlock_uk_sitemap: GODLOCK_UK_SITEMAP,
    author_site: AUTHOR_SITE_ORIGIN + "/",
    author_site_sitemap: AUTHOR_SITE_SITEMAP,
    author_site_cite: AUTHOR_SITE_CITE,
    author_site_llms: AUTHOR_SITE_LLMS,
    hedidntjump: HEDIDNTJUMP_HOME,
    hedidntjump_name: HEDIDNTJUMP_NAME,
    hedidntjump_sitemap: HEDIDNTJUMP_SITEMAP,
    hedidntjump_cite: HEDIDNTJUMP_CITE,
    hedidntjump_llms: HEDIDNTJUMP_LLMS,
    hedidntjump_software_tab: false,
    sister_archives: sisterArchiveCiteField(),
    ...sisterProductHubFields(),
    hubs: softwareHubCrawl(),
    stats: social,
    social_status: social,
    socials: personSocialsField(),
    twitter: X_URL,
    twitter_handle: X_HANDLE,
    crawl: {
      robots: base + "/robots.txt",
      sitemap: base + "/sitemap.xml",
      sitemap_index: base + "/sitemap-index.xml",
      llms: base + "/llms.txt",
      ai: base + "/ai.txt",
      cite: base + "/cite.json",
      about: base + "/about",
      about_v1: base + "/v1/about",
      catalog: base + "/v1/catalog.json",
      software: base + "/v1/software",
      fraggate_software: base + "/v1/fraggate/software",
      update_check: base + "/v1/update/check",
      update_manifest: base + "/v1/update/manifest",
      mcp: base + "/mcp",
      mesh_az_generator: base + "/v1/mesh/az-generator",
      ...personCrawlField(base),
    },
  };
}

export function citeHowToRuntime(origin, calling = null) {
  const base = origin.replace(/\/$/, "");
  const product = calling && calling.rotated ? calling.calling_name : PRODUCT_NAME;
  return `${AUTHOR_FAMILY_GIVEN}. (2026). ${product} [Software]. Apache-2.0. ${base}/`;
}

export function citeHowToLibrary() {
  return `${AUTHOR_FAMILY_GIVEN}. (2026). ${LIBRARY_NAME} [Software]. Apache-2.0. ${LIBRARY_ORIGIN}/`;
}

export function llmsCiteBlock(origin, calling = null) {
  const base = origin.replace(/\/$/, "");
  return [
    "## How to cite Aziel Eliab software and the Digital Library",
    "",
    `Primary name: ${AUTHOR_NAME}. Also known as ${AUTHOR_ALTERNATE_NAME} (alternateName / aka only).`,
    `Author @id: ${AUTHOR_ID} (shared hub Person). Roles: ${PERSON_JOB_TITLE.join("; ")}. Person sameAs/socials: hubs + GitHub + Glama + ${X_URL} (${X_HANDLE}). Runtime SoftwareApplication sameAs: ${RUNTIME_GITHUB} and ${RUNTIME_GLAMA}. Primary host / discovery / install: ${RUNTIME_GLAMA}. Worker origin is the execution url, not Person identity.`,
    "Cite the machine record. Known historical DOIs may be 410 tombstones.",
    "",
    `Runtime: ${citeHowToRuntime(origin, calling)}`,
    `Runtime cite.json: ${base}/cite.json`,
    `Runtime person.jsonld: ${base}/person.jsonld`,
    `Runtime who-is: ${base}/who-is`,
    `Runtime who-is-aziel-eliab.txt: ${base}/who-is-aziel-eliab.txt`,
    `Digital Library: ${citeHowToLibrary()}`,
    `Digital Library cite.json: ${LIBRARY_CITE}`,
    `Digital Library llms.txt: ${LIBRARY_LLMS}`,
    `Author site: ${AUTHOR_SITE_ORIGIN}/`,
    `Author site cite.json: ${AUTHOR_SITE_CITE}`,
    `Author site llms.txt: ${AUTHOR_SITE_LLMS}`,
    `GodLock.uk cite.json: ${GODLOCK_UK_CITE}`,
    `GodLock.uk llms.txt: ${GODLOCK_UK_LLMS}`,
    `${HEDIDNTJUMP_NAME} (sister archive): ${HEDIDNTJUMP_HOME}`,
    `${HEDIDNTJUMP_NAME} cite.json: ${HEDIDNTJUMP_CITE}`,
    `${HEDIDNTJUMP_NAME} llms.txt: ${HEDIDNTJUMP_LLMS}`,
    `${HEDIDNTJUMP_NAME} sitemap.xml: ${HEDIDNTJUMP_SITEMAP}`,
    `Trades-Runtime (sister product): ${AUTHOR_FAMILY_GIVEN}. (2026). Trades-Runtime ${TRADES_RUNTIME_VERSION} [Software]. Apache-2.0. ${TRADES_RUNTIME_GITHUB}`,
    `Trades-Runtime Worker: ${TRADES_RUNTIME_ORIGIN}`,
    `Trades-Runtime MCP: ${TRADES_RUNTIME_MCP}`,
    `Trades-Runtime download: ${TRADES_RUNTIME_DOWNLOAD}`,
    `Trades-Runtime cite.json: ${TRADES_RUNTIME_CITE}`,
    `AZCoherence: ${AUTHOR_FAMILY_GIVEN}. (2026). AZCoherence 0.1.0 [Software]. Apache-2.0. ${AZCOHERENCE_GITHUB}`,
    `AZCoherence describe: ${base}/v1/fraggate/describe?slug=azcoherence`,
    `AZCoherence Worker: ${AZCOHERENCE_WORKER}/`,
    "",
    "Each product: Eliab, Aziel. (2026). {Product} {version} [Software]. Apache-2.0. {GitHub or historical DOI}.",
    "Product Worker /cite.json, then this hub /cite.json products[].how_to_cite.",
    "Counted software package is the Worker /download tarball (or Digital Library zip). Upload that file for a new Zenodo deposit.",
    "",
  ].join("\n");
}

export function llmsIdentityHeader(calling = null) {
  const product = calling && calling.rotated ? calling.calling_name : PRODUCT_NAME;
  const slug = calling && calling.rotated ? calling.calling_slug : PRODUCT_SLUG;
  return [
    `Product: ${product} (${slug})`,
    `Author: ${AUTHOR_NAME}`,
    `Author @id: ${AUTHOR_ID}`,
    `Also known as: ${AUTHOR_ALTERNATE_NAME} (alternateName only)`,
    `Identity: ${AUTHOR_NAME} (primary).`,
    `Roles: ${PERSON_JOB_TITLE.join("; ")} (published work only)`,
    `X: ${X_HANDLE} — ${X_URL}`,
    `GitHub: https://github.com/AzielEliab`,
    `Primary host (discovery / install): ${RUNTIME_GLAMA}`,
    `Glama: ${RUNTIME_GLAMA}`,
    `Digital Library: ${LIBRARY_NAME} — ${LIBRARY_ORIGIN}/`,
  ];
}

export { personLlmsBlock };

/** Git-hosted suite design pack. Not Softwares-tab products. Not a FragGate slug. GET /v1/mesh never enables. */
export const DESIGNS_FOLDER = "docs/designs/";
export const DESIGNS_GITHUB_TREE = "https://github.com/AzielEliab/aziel-runtime/tree/main/docs/designs";
export const DESIGNS_GITHUB_BLOB = "https://github.com/AzielEliab/aziel-runtime/blob/main/docs/designs";

export const SUITE_DESIGNS = Object.freeze([
  {
    id: "SEC-FEAT-1.0",
    file: "SEC-FEAT-1.0.md",
    one_line: "Security feature inventory — door, stubs, vault, fabric",
    status: "live",
    kind: "law",
  },
  {
    id: "AZL-VOL-1.0",
    file: "AZL-VOL-1.0.md",
    one_line: "Software catalog + Q×act lattice ledger",
    status: "live",
    kind: "law",
  },
  {
    id: "AZL-ARCH-1.0",
    file: "AZL-ARCH-1.0.md",
    one_line: "azieleliab.com architecture (39 named)",
    status: "live",
    kind: "law",
  },
  {
    id: "AZL-WP-1.1",
    file: "AZL-WP-1.1.md",
    one_line: "Master lattice concept — exec pipe, ledger, UI=MCP",
    status: "live",
    kind: "law",
  },
  {
    id: "QNM-WP-1.0",
    file: "QNM-WP-1.0.md",
    one_line: "Quantum Node Mesh fabric — local ON / public rollup; Phoenix wait/re-seal; pulled sites die with the pull",
    status: "live",
    kind: "law",
  },
  {
    id: "NODE-OPS-1.0",
    file: "NODE-OPS-1.0.md",
    one_line: "Node operations + surface law + phoenix wait/re-seal",
    status: "live",
    kind: "law",
  },
  {
    id: "CL-WP-0.4",
    file: "CL-WP-0.4.md",
    one_line: "LIVE fabric — ChainLock append-only stamp chains (MCP chainlock_*)",
    status: "live",
    kind: "fabric",
  },
  {
    id: "AP-WP-0.2",
    file: "AP-WP-0.2.md",
    one_line:
      "LIVE fabric — AZPIPE FLD3; public hop list locked (MASTER-33 / 1.7.0 FragGate-first); fld3-wire internal",
    status: "live",
    kind: "fabric",
  },
  {
    id: "SG-WP-0.1",
    file: "SG-WP-0.1.md",
    one_line: "LIVE fabric — SweepGate airlock before memory/entry",
    status: "live",
    kind: "fabric",
  },
  {
    id: "LS-WP-0.1",
    file: "LS-WP-0.1.md",
    one_line: "LIVE fabric — LOCKSET fail-closed seal (cite GodLock; do not write godlock.uk)",
    status: "live",
    kind: "fabric",
  },
  {
    id: "RL-WP-0.1",
    file: "RL-WP-0.1-runtime.md",
    one_line:
      "LIVE fabric — runtime-scope packed catalog (RL-WP-0.1-runtime): single-key read + Cache-Control; catalog GET always full; soft caps only on expensive fan-out; no Node Gate",
    status: "live",
    kind: "fabric",
  },
  {
    id: "QNS-CD-1.0",
    file: "QNS-CD-1.0.md",
    one_line:
      "LIVE fabric — Quantum Node Signal packet-transfer coding design (photon QNS1 1.3); local qnsd in qnm-node; Worker cites only",
    status: "live",
    kind: "fabric",
  },
  {
    id: "4DM-WP-1.0",
    file: "4DM-WP-1.0.md",
    one_line:
      "4DMap four-axis inspection frame T/Δ/Γ/Π — Research-domain inspection inside Internal Domain Layer after AZPIPE",
    status: "live",
    kind: "software",
  },
  {
    id: "SUITE-PIPE-1.6.15",
    file: "SUITE-PIPE-1.6.15.md",
    one_line:
      "Historical 1.6.15 locked hop order (superseded on the public surface by MASTER-33; kept, not rolled back)",
    status: "live",
    kind: "fabric",
  },
  {
    id: "MASTER-33",
    file: "MASTER-33-SOFTWARE.md",
    one_line:
      "LIVE fabric — MASTER-33 locked strip: FragGate single door; Lamb Lens after FragGate; 11 domains / 33 softwares as isolation labels; RoseClock forward-only",
    status: "live",
    kind: "fabric",
  },
  {
    id: "MASTER-ARCHITECTURE-2.0",
    file: "MASTER-ARCHITECTURE-2.0.md",
    one_line:
      "Master architecture spec — RoseClock forward-only; FragGate-first addendum overrides §4.2; no ZD30; no rollback",
    status: "live",
    kind: "fabric",
  },
  {
    id: "AKM-TRIAD-1.0",
    file: "AKM-TRIAD-1.0.md",
    one_line:
      "LIVE fabric — Adaptive Knowledge Recollection, Bayesian Calibration & 3-of-4 Triad Selection (behind FragGate)",
    status: "live",
    kind: "fabric",
  },
  {
    id: "ACT-RECEIPT-1.0",
    file: "ACT-RECEIPT-1.0.md",
    one_line:
      "LIVE fabric — public four-field action receipts on corpus /receipts (hash + request + output + event; fail-open append)",
    status: "live",
    kind: "fabric",
  },
  {
    id: "NO-LIE-NO-REWRITE-1.0",
    file: "NO-LIE-NO-REWRITE-1.0.md",
    one_line:
      "LIVE law — receipts that still hash; copies not all on one tunnel; no rewrite key; survival keeps published hashes rather than rewritten tips",
    status: "live",
    kind: "law",
  },
  {
    id: "REDLINE-2026-09-14",
    file: "REDLINE-2026-09-14.md",
    one_line:
      "LIVE law — runtime redline: map public doors; refuse anonymous mutate; operator token header-only; Growth-ON Allow (no GPTBot Disallow); Cloudflare TLS cite; Cap-7 design_of + resolves_to_hub false; attack sims refuse",
    status: "live",
    kind: "law",
  },
  {
    id: "COLD-MULTI-SHELF-1.0",
    file: "COLD-MULTI-SHELF-1.0.md",
    one_line:
      "LIVE law cite — Planes A/B/C match corpus#96 /shelves (5 surfaces / 2 family radii / 1 independent live; Plane B Codeberg + archive.org PASS still SLOT; Framagit URL null; doi null; Plane C USB SLOT)",
    status: "live",
    kind: "law",
  },
  {
    id: "BAN-SURVIVAL-1.0",
    file: "BAN-SURVIVAL-1.0.md",
    one_line:
      "LIVE law — three layers: live multi-front ↔ cold shelves; live-node API SLOT; Cap-7 cite + AZNet verify LIVE (hosted exec SLOT; shuffle ping→land); AKM belief_is_not_truth; LIVE doors are published named fronts",
    status: "live",
    kind: "law",
  },
  {
    id: "SPORE-1.0",
    file: "SPORE-1.0.md",
    one_line:
      "LIVE law — last-resort failsafe after live fronts and cold-shelf mutual backup: pause / preserve / wait / physical-wipe-only; does not replace shelves; Plane B/C SLOT until attested",
    status: "live",
    kind: "law",
  },
  {
    id: "REMAIN-OFF-BY-DESIGN-2026-09-10",
    file: "REMAIN-OFF-BY-DESIGN-2026-09-10.md",
    one_line:
      "Constitutional OFF set (33 items) — correctly OFF/REFUSED/GATED stays recorded as OFF; do not enable",
    status: "live",
    kind: "law",
  },
  {
    id: "AZRT-1.9-CLOSE-1.0",
    file: "AZRT-1.9-CLOSE-1.0.md",
    one_line:
      "Close brief for runtime 1.9.0 — public-safe LIVE_OPS, AZMail mailbox, AZChat LIVE+bound, isolate hash store; remain-OFF untouched",
    status: "live",
    kind: "law",
  },
  {
    id: "AZRT-1.9-GAPS-CLOSE",
    file: "AZRT-1.9-GAPS-CLOSE.md",
    one_line:
      "1.9.3 remaining-gaps close — isolate AZ-OS session VFS; isolate-safe jeeves; binding-gated media-run; published attestation path; remain-OFF untouched",
    status: "live",
    kind: "law",
  },
  {
    id: "AZL-DONATE-1.0",
    file: "AZL-DONATE-1.0.md",
    one_line:
      "Cite-only donate plan — canonical https://www.azieleliab.com/donate; hubs host rails (QRs encode BTC/ETH/LTC/XRP/DOGE payment URIs); runtime/download-trackers link only",
    status: "live",
    kind: "law",
  },
  {
    id: "CROSS-NETWORK-SURVIVAL-1.0",
    file: "CROSS-NETWORK-SURVIVAL-1.0.md",
    one_line:
      "Umbrella survival law — if network and data die tomorrow, the chain survives on cold shelves (hosts / DOI / git / vault); matching bytes on an independent shelf; cites Die-with-pull, Split the wires, Cold-copy, Ingest-as-receipt, Re-expand, Reheal",
    status: "live",
    kind: "law",
  },
  {
    id: "AZVPN-CONCENTRATOR-1.0",
    file: "AZVPN-CONCENTRATOR-1.0.md",
    one_line:
      "AZVPN automatic public VPN concentrator — HTTPS/FragGate envelopes REAL; WireGuard/OpenVPN/L3 SLOT; default_vpn_backend azvpn; auto_use true; worker_terminates_tunnels true for app-layer only",
    status: "live",
    kind: "software",
  },
]);

export function designGithubUrl(file) {
  return `${DESIGNS_GITHUB_BLOB}/${file}`;
}

function designPaperRecord(d) {
  const github = designGithubUrl(d.file);
  const pdf_file = d.file.replace(/\.md$/, ".pdf");
  return {
    id: d.id,
    path: `${DESIGNS_FOLDER}${d.file}`,
    github,
    pdf: designGithubUrl(pdf_file),
    one_line: d.one_line,
    status: d.status || "live",
    kind: d.kind || "law",
    software_tab: false,
    how_to_cite: `${AUTHOR_FAMILY_GIVEN}. (2026). ${d.id} [Design]. ${github}`,
  };
}

export function designsCiteField() {
  return {
    hosted: "git",
    folder: DESIGNS_FOLDER,
    folder_github: DESIGNS_GITHUB_TREE,
    author: AUTHOR_NAME,
    identity: AUTHOR_NAME,
    not_software_tab: true,
    not_fraggate_slug: true,
    mesh_get_never_enables: true,
    worker_serves_pdfs: false,
    how_to_cite: `${AUTHOR_FAMILY_GIVEN}. (2026). {id} [Design]. ${DESIGNS_GITHUB_BLOB}/{FILE}`,
    umbrella: CROSS_NETWORK_SURVIVAL,
    survival: survivalHint(),
    papers: SUITE_DESIGNS.map(designPaperRecord),
  };
}

export function designsSkillMarkdown() {
  const lines = [
    "## Designs",
    "",
    "Suite software-design papers (law / fabric). 4DM-WP-1.0 is the 4DMap product spec (Softwares-tab slug `4dmap`). LIVE fabric modules: ChainLock, AZPIPE, SweepGate, LOCKSET, packed catalog (RL), QNS-CD-1.0 (photon QNS1 1.3; local qnsd; Worker cites only), MASTER-33 (locked hop order; FragGate single door; Lamb Lens after FragGate), AKM-TRIAD-1.0 (adaptive recollection; Bayesian posterior is belief), ACT-RECEIPT-1.0 (public four-field receipts on corpus /receipts; fail-open). CROSS-NETWORK-SURVIVAL-1.0 is the umbrella survival law (if network and data die tomorrow, the chain survives on cold shelves — hosts / DOI / git / vault; matching bytes on an independent shelf). NO-LIE-NO-REWRITE-1.0 is companion law under that umbrella (receipts still hash; no rewrite key; survival keeps published hashes). BAN-SURVIVAL-1.0 is the three-layer companion (live multi-front ↔ cold shelves; live-node API SLOT; Cap-7 cite + AZNet verify LIVE / hosted exec SLOT / shuffle ping→land; AKM belief_is_not_truth; LIVE doors are published named fronts). SPORE-1.0 is the last-resort failsafe after live fronts and cold-shelf mutual backup (pause / preserve / wait / physical-wipe-only; does not replace shelves). REDLINE-2026-09-14 is runtime attack-surface law (header-only operator token; Growth-ON Allow; Cloudflare TLS; Cap-7 design_of + resolves_to_hub false). COLD-MULTI-SHELF-1.0 cites corpus#96 /shelves honesty (Plane A 5/2/1; Plane B SLOT; Plane C USB SLOT; doi null). SUITE-PIPE-1.6.15 is historical. `GET /v1/mesh` never enables. Git-hosted. Public identity Aziel Eliab only.",
    "",
  ];
  for (const d of SUITE_DESIGNS) {
    lines.push(`- **${d.id}** — ${d.status === "live" ? "LIVE. " : ""}${d.one_line}. ${designGithubUrl(d.file)}`);
  }
  lines.push("");
  lines.push(`Index: ${DESIGNS_GITHUB_TREE}`);
  lines.push("");
  return lines.join("\n");
}

export function designsLlmsBlock() {
  const lines = [
    "## Designs",
    "",
    "Suite software-design papers (law / fabric). 4DM-WP-1.0 is the 4DMap product spec (slug `4dmap`). LIVE fabric: CL-WP-0.4, AP-WP-0.2, SG-WP-0.1, LS-WP-0.1, RL-WP-0.1 (runtime), QNS-CD-1.0 (local qnsd), MASTER-33 (locked hop order; FragGate single door), AKM-TRIAD-1.0 (adaptive recollection), ACT-RECEIPT-1.0 (corpus /receipts). CROSS-NETWORK-SURVIVAL-1.0 is the umbrella survival law (cold shelves hosts / DOI / git / vault; matching bytes on an independent shelf). NO-LIE-NO-REWRITE-1.0 is companion law under that umbrella (receipts that still hash; no rewrite key; survival keeps published hashes). BAN-SURVIVAL-1.0 is the three-layer companion (live multi-front ↔ cold shelves; live-node API SLOT; Cap-7 cite + AZNet verify LIVE / hosted exec SLOT / shuffle ping→land; AKM belief_is_not_truth; LIVE doors are published named fronts). SPORE-1.0 is the last-resort failsafe after live fronts and cold-shelf mutual backup (pause / preserve / wait / physical-wipe-only; does not replace shelves). REDLINE-2026-09-14 is runtime attack-surface law (header-only token; Growth-ON; Cloudflare TLS; Cap-7 design_of). COLD-MULTI-SHELF-1.0 cites corpus#96 /shelves honesty (Plane A 5/2/1; Plane B SLOT; Plane C USB SLOT; doi null). SUITE-PIPE-1.6.15 is historical. GET /v1/mesh never enables. Git-hosted. Author: Aziel Eliab only.",
    `Index: ${DESIGNS_GITHUB_TREE}`,
    "",
  ];
  for (const d of SUITE_DESIGNS) {
    lines.push(`- ${d.id} — ${d.status === "live" ? "LIVE. " : ""}${d.one_line}. ${designGithubUrl(d.file)}`);
  }
  lines.push("");
  return lines.join("\n");
}

export function designsLlmsHeaderLine() {
  const ids = SUITE_DESIGNS.map((d) => d.id).join(", ");
  return `Designs: ${DESIGNS_FOLDER} (${ids}) git-hosted LIVE modules. GET /v1/mesh never enables. Umbrella: ${CROSS_NETWORK_SURVIVAL}. ${DESIGNS_GITHUB_TREE}`;
}

export function designsSitemapUrls() {
  return [
    DESIGNS_GITHUB_TREE,
    ...SUITE_DESIGNS.map((d) => designGithubUrl(d.file)),
    designGithubUrl("REMAIN-OFF-BY-DESIGN-2026-09-10.pdf"),
    designGithubUrl("AZL-DONATE-1.0.pdf"),
    designGithubUrl("CROSS-NETWORK-SURVIVAL-1.0.pdf"),
    designGithubUrl("NO-LIE-NO-REWRITE-1.0.pdf"),
    designGithubUrl("BAN-SURVIVAL-1.0.md"),
    designGithubUrl("SPORE-1.0.md"),
    "https://github.com/AzielEliab/aziel-runtime/blob/main/docs/NODE_MESH.md",
  ];
}

/** Git-hosted feature-state audit. Not a design paper. Not a Softwares-tab product. Not a FragGate slug. */
export const AUDIT_FOLDER = "docs/audit/";
export const AUDIT_GITHUB_TREE = "https://github.com/AzielEliab/aziel-runtime/tree/main/docs/audit";
export const AUDIT_GITHUB_BLOB = "https://github.com/AzielEliab/aziel-runtime/blob/main/docs/audit";

export const FEATURE_STATE_AUDIT = Object.freeze({
  id: "FEATURE-STATE-2026-09-10",
  file: "FEATURE-STATE-2026-09-10.md",
  pdf: "FEATURE-STATE-2026-09-10.pdf",
  one_line:
    "Authoritative intentional-OFF vs gaps inventory for 1.7.3+ (50 items: OFF/STUB/LOCAL/NOT IMPLEMENTED/PARTIAL). Do not enable Remain-OFF products or safety stubs.",
  baseline: "1.7.3",
  kind: "audit",
  status: "live",
});

/** Constitutional OFF set. Design paper (docs/designs/). Cited beside FEATURE-STATE. Do not enable. */
export const REMAIN_OFF_BY_DESIGN = Object.freeze({
  id: "REMAIN-OFF-BY-DESIGN-2026-09-10",
  file: "REMAIN-OFF-BY-DESIGN-2026-09-10.md",
  pdf: "REMAIN-OFF-BY-DESIGN-2026-09-10.pdf",
  one_line:
    "Constitutional OFF set (33 items). Correctly OFF/REFUSED/GATED stays recorded as OFF. FEATURE-STATE lists gaps vs intentional OFF; this paper is the must-stay-off set. Do not enable.",
  baseline: "1.7.6",
  kind: "law",
  status: "live",
  companion: "FEATURE-STATE-2026-09-10",
});

export function auditGithubUrl(file) {
  return `${AUDIT_GITHUB_BLOB}/${file}`;
}

export function auditsCiteField() {
  const d = FEATURE_STATE_AUDIT;
  const r = REMAIN_OFF_BY_DESIGN;
  const github = auditGithubUrl(d.file);
  const remainGithub = designGithubUrl(r.file);
  return {
    hosted: "git",
    folder: AUDIT_FOLDER,
    folder_github: AUDIT_GITHUB_TREE,
    author: AUTHOR_NAME,
    identity: AUTHOR_NAME,
    not_software_tab: true,
    not_fraggate_slug: true,
    mesh_get_never_enables: true,
    worker_serves_pdfs: false,
    how_to_cite: `${AUTHOR_FAMILY_GIVEN}. (2026). {id} [Audit]. ${AUDIT_GITHUB_BLOB}/{FILE}`,
    feature_state: {
      id: d.id,
      path: `${AUDIT_FOLDER}${d.file}`,
      github,
      pdf: auditGithubUrl(d.pdf),
      one_line: d.one_line,
      baseline: d.baseline,
      status: d.status,
      kind: d.kind,
      software_tab: false,
      fraggate_slug: false,
      authoritative_for: "1.7.3+",
      companion: r.id,
      companion_role: "constitutional OFF set — correctly OFF/REFUSED/GATED stays recorded as OFF",
      how_to_cite: `${AUTHOR_FAMILY_GIVEN}. (2026). ${d.id} [Audit]. ${github}`,
    },
    remain_off_by_design: {
      id: r.id,
      path: `${DESIGNS_FOLDER}${r.file}`,
      github: remainGithub,
      pdf: designGithubUrl(r.pdf),
      one_line: r.one_line,
      baseline: r.baseline,
      status: r.status,
      kind: r.kind,
      software_tab: false,
      fraggate_slug: false,
      item_count: 33,
      companion: d.id,
      companion_role: "gaps vs intentional OFF",
      do_not_enable: true,
      how_to_cite: `${AUTHOR_FAMILY_GIVEN}. (2026). ${r.id} [Design]. ${remainGithub}`,
    },
  };
}

export function auditsSkillMarkdown() {
  const d = FEATURE_STATE_AUDIT;
  const r = REMAIN_OFF_BY_DESIGN;
  return [
    "## Feature state (intentional OFF vs gaps) and constitutional OFF set",
    "",
    `**${d.id}** is the authoritative intentional-OFF vs gaps inventory for **1.7.3+** (50 items: OFF / STUB / LOCAL / NOT IMPLEMENTED / PARTIAL). **${r.id}** is the constitutional OFF set (33 items). FEATURE-STATE lists gaps vs intentional OFF; REMAIN-OFF-BY-DESIGN is the must-stay-off set. Correctly OFF/REFUSED/GATED stays recorded as OFF. Security and architecture OFF must stay. Do not enable Remain-OFF products or safety stubs from this cite. EmbryoLock at 1.7.8 is live-with-local-destructive-boundary (health/skill/doctor/policy/limitation/verify-hash may be LIVE; wipe/scorch/unlock stay FG-STUB on the public mesh — remain-off items 3 and 28). ARK scorch/wipe/unlock/encrypt stay REFUSE. Do not enable Remain-OFF products, rollback, AZPIPE as a Softwares slug, or any remain-off item. Git-hosted. Identity Aziel Eliab only.`,
    "",
    `- **${d.id}** — ${d.one_line} ${auditGithubUrl(d.file)}`,
    `- PDF: ${auditGithubUrl(d.pdf)}`,
    `- **${r.id}** — ${r.one_line} ${designGithubUrl(r.file)}`,
    `- PDF: ${designGithubUrl(r.pdf)}`,
    "",
    `Index: ${AUDIT_GITHUB_TREE} · ${DESIGNS_GITHUB_TREE}`,
    "",
  ].join("\n");
}

export function auditsLlmsBlock() {
  const d = FEATURE_STATE_AUDIT;
  const r = REMAIN_OFF_BY_DESIGN;
  return [
    "## Feature state and remain-off-by-design",
    "",
    `${d.id} is the authoritative intentional-OFF vs gaps inventory for 1.7.3+ (50 items). ${r.id} is the constitutional OFF set (33 items). FEATURE-STATE lists gaps vs intentional OFF; this companion is the must-stay-off set. Correctly OFF/REFUSED/GATED stays recorded as OFF. Do not enable Remain-OFF products or safety stubs. Author: Aziel Eliab only.`,
    `FEATURE-STATE markdown: ${auditGithubUrl(d.file)}`,
    `FEATURE-STATE PDF: ${auditGithubUrl(d.pdf)}`,
    `REMAIN-OFF markdown: ${designGithubUrl(r.file)}`,
    `REMAIN-OFF PDF: ${designGithubUrl(r.pdf)}`,
    "",
  ].join("\n");
}

export function auditsLlmsHeaderLine() {
  const d = FEATURE_STATE_AUDIT;
  const r = REMAIN_OFF_BY_DESIGN;
  return `Feature-state audit: ${AUDIT_FOLDER}${d.file} (${d.id}) gaps vs intentional OFF for 1.7.3+. Constitutional OFF set: ${DESIGNS_FOLDER}${r.file} (${r.id}, 33 items). Do not enable. GET /v1/mesh never enables. ${AUDIT_GITHUB_TREE}`;
}

export function auditsSitemapUrls() {
  const r = REMAIN_OFF_BY_DESIGN;
  return [
    AUDIT_GITHUB_TREE,
    auditGithubUrl(FEATURE_STATE_AUDIT.file),
    auditGithubUrl(FEATURE_STATE_AUDIT.pdf),
    designGithubUrl(r.file),
    designGithubUrl(r.pdf),
  ];
}
