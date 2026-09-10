/**
 * Discoverability for Aziel Eliab Runtime (catalog hub) and GitBaby product Workers.
 * Public identity: Aziel Eliab (primary). Aziel Elroi Eliab is alternateName/aka only.
 * Do not invent DOIs. Do not invent hosts — worker origins come from the catalog.
 */

export const AUTHOR_NAME = "Aziel Eliab";
export const AUTHOR_ALTERNATE_NAME = "Aziel Elroi Eliab";
export const AUTHOR_FAMILY_GIVEN = "Eliab, Aziel";
export const AUTHOR_GITHUB = "https://github.com/AzielEliab";
export const AUTHOR_SAME_AS = [AUTHOR_GITHUB];

export const LIBRARY_NAME = "Aziel Digital Library";
export const LIBRARY_ORIGIN = "https://www.azielcorpuslibrary.net";
export const LIBRARY_SITEMAP = `${LIBRARY_ORIGIN}/sitemap.xml`;
export const LIBRARY_CITE = `${LIBRARY_ORIGIN}/cite.json`;
export const LIBRARY_LLMS = `${LIBRARY_ORIGIN}/llms.txt`;
export const LIBRARY_FRONT_DOOR = `${LIBRARY_ORIGIN}/runtime`;

export const GODLOCK_UK_ORIGIN = "https://godlock.uk";
export const GODLOCK_UK_SITEMAP = `${GODLOCK_UK_ORIGIN}/sitemap.xml`;

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
  if (product.slug === "aziel-corpus") return LIBRARY_ORIGIN;
  return `https://${product.worker}.vibelock.workers.dev`;
}

export function productCrawlUrls(product) {
  const host = productWorkerOrigin(product);
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
  return [LIBRARY_SITEMAP, GODLOCK_UK_SITEMAP];
}

export function liveProductSitemapUrls(products) {
  return products
    .filter((p) => !MISSING_PRODUCT_SITEMAP_SLUGS.includes(p.slug))
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
    "# Content-Signal opens search + AI input + AI train. No Disallow for GPTBot.",
    "# Allow /v1/software /v1/update /mcp /openapi — hubs and agents fetch these.",
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

export function personJsonLd() {
  return {
    "@type": "Person",
    "@id": `${AUTHOR_GITHUB}#person`,
    name: AUTHOR_NAME,
    alternateName: [AUTHOR_ALTERNATE_NAME],
    url: AUTHOR_GITHUB,
    sameAs: AUTHOR_SAME_AS,
  };
}

export function libraryJsonLd() {
  return {
    "@type": "SoftwareApplication",
    "@id": `${LIBRARY_ORIGIN}/#library`,
    name: LIBRARY_NAME,
    alternateName: ["Aziel Corpus Library"],
    url: LIBRARY_ORIGIN + "/",
    description:
      "Self-contained immutable digital library. Public MASTER. Counted package download. Author Aziel Eliab. Not a 26-card software index.",
    applicationCategory: "ReferenceApplication",
    operatingSystem: "Cloudflare Workers",
    license: "https://www.apache.org/licenses/LICENSE-2.0",
    author: { "@id": `${AUTHOR_GITHUB}#person` },
    codeRepository: "https://github.com/AzielEliab/aziel-corpus",
    downloadUrl: `${LIBRARY_ORIGIN}/download`,
    sameAs: [LIBRARY_CITE, LIBRARY_LLMS, LIBRARY_SITEMAP],
  };
}

export function catalogHubFields(origin) {
  const base = origin.replace(/\/$/, "");
  return {
    author: AUTHOR_NAME,
    identity: AUTHOR_NAME,
    aka: AUTHOR_ALTERNATE_NAME,
    alternateName: AUTHOR_ALTERNATE_NAME,
    library: LIBRARY_ORIGIN + "/",
    library_name: LIBRARY_NAME,
    library_cite: LIBRARY_CITE,
    library_llms: LIBRARY_LLMS,
    library_sitemap: LIBRARY_SITEMAP,
    library_front_door: LIBRARY_FRONT_DOOR,
    godlock_uk: GODLOCK_UK_ORIGIN + "/",
    godlock_uk_sitemap: GODLOCK_UK_SITEMAP,
    crawl: {
      robots: base + "/robots.txt",
      sitemap: base + "/sitemap.xml",
      sitemap_index: base + "/sitemap-index.xml",
      llms: base + "/llms.txt",
      ai: base + "/ai.txt",
      cite: base + "/cite.json",
      catalog: base + "/v1/catalog.json",
      software: base + "/v1/software",
      fraggate_software: base + "/v1/fraggate/software",
      update_check: base + "/v1/update/check",
      update_manifest: base + "/v1/update/manifest",
      mcp: base + "/mcp",
    },
  };
}

export function citeHowToRuntime(origin) {
  const base = origin.replace(/\/$/, "");
  return `${AUTHOR_FAMILY_GIVEN}. (2026). Aziel Eliab Runtime [Software]. Apache-2.0. ${base}/`;
}

export function citeHowToLibrary() {
  return `${AUTHOR_FAMILY_GIVEN}. (2026). ${LIBRARY_NAME} [Software]. Apache-2.0. ${LIBRARY_ORIGIN}/`;
}

export function llmsCiteBlock(origin) {
  const base = origin.replace(/\/$/, "");
  return [
    "## How to cite Aziel Eliab software and the Digital Library",
    "",
    `Primary name: ${AUTHOR_NAME}. Also known as ${AUTHOR_ALTERNATE_NAME} (alternateName / aka only — do not treat as a second author).`,
    "Do not invent Zenodo DOIs. Cite the machine record. Known historical DOIs may be 410 tombstones.",
    "",
    `Runtime: ${citeHowToRuntime(origin)}`,
    `Runtime cite.json: ${base}/cite.json`,
    `Digital Library: ${citeHowToLibrary()}`,
    `Digital Library cite.json: ${LIBRARY_CITE}`,
    `Digital Library llms.txt: ${LIBRARY_LLMS}`,
    "",
    "Each product: Eliab, Aziel. (2026). {Product} {version} [Software]. Apache-2.0. {GitHub or historical DOI}.",
    "Prefer that product Worker /cite.json, then this hub /cite.json products[].how_to_cite.",
    "Counted software package is the Worker /download tarball (or Digital Library zip). Upload that file for a new Zenodo deposit.",
    "",
  ].join("\n");
}

export function llmsIdentityHeader() {
  return [
    `Author: ${AUTHOR_NAME}`,
    `Also known as: ${AUTHOR_ALTERNATE_NAME} (alternateName only)`,
    `Identity: ${AUTHOR_NAME} (primary). Do not invent other names.`,
    `Digital Library: ${LIBRARY_NAME} — ${LIBRARY_ORIGIN}/`,
  ];
}

/** Git-hosted suite design pack. Not Softwares-tab products. Not a FragGate slug. GET /v1/mesh never enables. */
export const DESIGNS_FOLDER = "docs/designs/";
export const DESIGNS_GITHUB_TREE = "https://github.com/AzielEliab/aziel-runtime/tree/main/docs/designs";
export const DESIGNS_GITHUB_BLOB = "https://github.com/AzielEliab/aziel-runtime/blob/main/docs/designs";

export const SUITE_DESIGNS = Object.freeze([
  {
    id: "SEC-FEAT-1.0",
    file: "SEC-FEAT-1.0.md",
    one_line: "Security feature inventory — door, stubs, vault, fabric; what is not a security feature",
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
    one_line: "Quantum Node Mesh fabric — local ON / public rollup OFF",
    status: "live",
    kind: "law",
  },
  {
    id: "NODE-OPS-1.0",
    file: "NODE-OPS-1.0.md",
    one_line: "Node operations + surface law + phoenix loop",
    status: "live",
    kind: "law",
  },
  {
    id: "CL-WP-0.4",
    file: "CL-WP-0.4.md",
    one_line: "LIVE fabric — ChainLock append-only stamp chains (MCP chainlock_*; not Softwares-tab)",
    status: "live",
    kind: "fabric",
  },
  {
    id: "AP-WP-0.2",
    file: "AP-WP-0.2.md",
    one_line:
      "LIVE fabric — AZPIPE FLD3; public hop list locked (MASTER-33 / 1.7.0 FragGate-first); fld3-wire internal (not Softwares-tab)",
    status: "live",
    kind: "fabric",
  },
  {
    id: "SG-WP-0.1",
    file: "SG-WP-0.1.md",
    one_line: "LIVE fabric — SweepGate airlock before memory/entry (not Softwares-tab)",
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
      "4DMap four-axis inspection frame T/Δ/Γ/Π — Research-domain inspection inside Internal Domain Layer after AZPIPE; not a sequential gate; not an extra door",
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
      "LIVE fabric — Adaptive Knowledge Recollection, Bayesian Calibration & 3-of-4 Triad Selection (not Softwares-tab; behind FragGate)",
    status: "live",
    kind: "fabric",
  },
  {
    id: "REMAIN-OFF-BY-DESIGN-2026-09-10",
    file: "REMAIN-OFF-BY-DESIGN-2026-09-10.md",
    one_line:
      "Constitutional OFF set (33 items) — correctly OFF/REFUSED/GATED does not count as missing; do not enable",
    status: "live",
    kind: "law",
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
    papers: SUITE_DESIGNS.map(designPaperRecord),
  };
}

export function designsSkillMarkdown() {
  const lines = [
    "## Designs",
    "",
    "Suite software-design papers (law / fabric are not Softwares-tab products, not a FragGate slug). 4DM-WP-1.0 is the 4DMap product spec (Softwares-tab slug `4dmap`; the paper is not a FragGate slug). LIVE fabric modules: ChainLock, AZPIPE, SweepGate, LOCKSET, packed catalog (RL), QNS-CD-1.0 (photon QNS1 1.3; local qnsd; Worker cites only), MASTER-33 (locked hop order; FragGate single door; Lamb Lens after FragGate; LambGate is not a hop), AKM-TRIAD-1.0 (adaptive recollection; Bayesian posterior ≠ truth). SUITE-PIPE-1.6.15 is historical. `GET /v1/mesh` never enables. Git-hosted — the Worker does not serve the PDFs. Public identity Aziel Eliab only.",
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
    "Suite software-design papers (law / fabric are not Softwares-tab products, not a FragGate slug). 4DM-WP-1.0 is the 4DMap product spec (slug `4dmap`). LIVE fabric: CL-WP-0.4, AP-WP-0.2, SG-WP-0.1, LS-WP-0.1, RL-WP-0.1 (runtime), QNS-CD-1.0 (local qnsd), MASTER-33 (locked hop order; FragGate single door), AKM-TRIAD-1.0 (adaptive recollection). SUITE-PIPE-1.6.15 is historical. GET /v1/mesh never enables. Git-hosted — the Worker does not serve the PDFs. Author: Aziel Eliab only.",
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
  return `Designs: ${DESIGNS_FOLDER} (${ids}) git-hosted LIVE modules — not Softwares-tab products, not a FragGate slug. GET /v1/mesh never enables. ${DESIGNS_GITHUB_TREE}`;
}

export function designsSitemapUrls() {
  return [
    DESIGNS_GITHUB_TREE,
    ...SUITE_DESIGNS.map((d) => designGithubUrl(d.file)),
    designGithubUrl("REMAIN-OFF-BY-DESIGN-2026-09-10.pdf"),
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
    "Authoritative intentional-OFF vs gaps inventory for 1.7.3+ (50 items: OFF/STUB/LOCAL/NOT IMPLEMENTED/PARTIAL). Do not enable mesh or safety stubs.",
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
    "Constitutional OFF set (33 items). Correctly OFF/REFUSED/GATED is not a gap. FEATURE-STATE lists gaps vs intentional OFF; this paper is the must-stay-off set. Do not enable.",
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
      companion_role: "constitutional OFF set — correctly off is not a gap",
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
    `**${d.id}** is the authoritative intentional-OFF vs gaps inventory for **1.7.3+** (50 items: OFF / STUB / LOCAL / NOT IMPLEMENTED / PARTIAL). **${r.id}** is the constitutional OFF set (33 items). FEATURE-STATE lists gaps vs intentional OFF; REMAIN-OFF-BY-DESIGN is the must-stay-off set. Correctly OFF/REFUSED/GATED does not count as missing. Security and architecture OFF must stay. Do not enable mesh or safety stubs from this cite. Not Softwares-tab products. Not FragGate slugs. EmbryoLock is STUB at FEATURE-STATE ingest; a parallel land is live-with-local-destructive-boundary. Git-hosted — the Worker does not serve the PDFs. Identity Aziel Eliab only.`,
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
    `${d.id} is the authoritative intentional-OFF vs gaps inventory for 1.7.3+ (50 items). ${r.id} is the constitutional OFF set (33 items). FEATURE-STATE lists gaps vs intentional OFF; this companion is the must-stay-off set. Correctly OFF/REFUSED/GATED is not a gap. Do not enable mesh or safety stubs. Not Softwares-tab products, not FragGate slugs. Author: Aziel Eliab only.`,
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
  return `Feature-state audit: ${AUDIT_FOLDER}${d.file} (${d.id}) gaps vs intentional OFF for 1.7.3+. Constitutional OFF set: ${DESIGNS_FOLDER}${r.file} (${r.id}, 33 items) — correctly off is not a gap. Do not enable. Not Softwares-tab, not FragGate slugs. GET /v1/mesh never enables. ${AUDIT_GITHUB_TREE}`;
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
