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
