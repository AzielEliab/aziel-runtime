/**
 * SEO / AI-crawl hub: MIME, robots Allow, sitemap-index, Person JSON-LD, cite aka.
 */
import assert from "node:assert/strict";
import { PRODUCTS } from "../src/index.js";
import {
  AI_CRAWLER_AGENTS,
  AUTHOR_ALTERNATE_NAME,
  AUTHOR_NAME,
  AUTHOR_SITE_SITEMAP,
  GODLOCK_UK_SITEMAP,
  LIBRARY_SITEMAP,
  MISSING_PRODUCT_SITEMAP_SLUGS,
  hubSitemapList,
  productCrawlUrls,
  productWorkerOrigin,
  uniqueUserAgents,
} from "../src/seo.js";
import {
  DESCRIBE_INDEX_TITLE,
  SOFTWARE_PAGE_TITLE,
  prefersHtml,
} from "../src/seo-html.js";

const handler = (await import("../src/index.js")).default.fetch;
const origin = "https://aziel-runtime.example";

async function get(path) {
  return handler(new Request(origin + path), {});
}

async function head(path) {
  return handler(new Request(origin + path, { method: "HEAD" }), {});
}

function mime(res, expect, label = "response") {
  const ct = res.headers.get("content-type") || "";
  assert.match(ct, expect, `${label} content-type ${ct}`);
}

async function assertSeoMime(path, expect) {
  const getRes = await get(path);
  assert.equal(getRes.status, 200, `GET ${path} status`);
  mime(getRes, expect, `GET ${path}`);
  const headRes = await head(path);
  assert.equal(headRes.status, 200, `HEAD ${path} status`);
  mime(headRes, expect, `HEAD ${path}`);
  assert.equal(await headRes.text(), "", `HEAD ${path} must have an empty body`);
}

await assertSeoMime("/robots.txt", /^text\/plain; charset=utf-8$/);
await assertSeoMime("/llms.txt", /^text\/plain; charset=utf-8$/);
await assertSeoMime("/ai.txt", /^text\/plain; charset=utf-8$/);
await assertSeoMime("/sitemap.xml", /^application\/xml; charset=utf-8$/);
await assertSeoMime("/sitemap-index.xml", /^application\/xml; charset=utf-8$/);
await assertSeoMime("/cite.json", /^application\/json; charset=utf-8$/);

const robotsRes = await get("/robots.txt");
assert.equal(robotsRes.status, 200);
mime(robotsRes, /^text\/plain; charset=utf-8/);
const robots = await robotsRes.text();
assert.match(robots, /User-agent: \*\nAllow: \//);
assert.match(robots, /Allow: \//);
assert.match(robots, /User-agent: GPTBot\nAllow: \//);
assert.doesNotMatch(robots, /User-agent: GPTBot\nDisallow:/);
assert.doesNotMatch(robots, /Disallow: \//);
assert.match(robots, /Content-Signal: search=yes, ai-input=yes, ai-train=yes/);
assert.doesNotMatch(robots, /Disallow:\s*\/v1/);
assert.doesNotMatch(robots, /Disallow:\s*\/openapi/);
assert.doesNotMatch(robots, /Disallow:\s*\/api\//);
assert.doesNotMatch(robots, /Disallow:\s*\/admin\//);

const requiredAllowAgents = [
  "GPTBot",
  "ChatGPT-User",
  "OAI-SearchBot",
  "Googlebot",
  "Google-Extended",
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
];
for (const agent of requiredAllowAgents) {
  const escaped = agent.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  assert.match(robots, new RegExp(`User-agent: ${escaped}\\nAllow: /`), `${agent} Allow: /`);
  assert.doesNotMatch(robots, new RegExp(`User-agent: ${escaped}\\nDisallow:`), `${agent} must not Disallow`);
}
for (const agent of uniqueUserAgents(AI_CRAWLER_AGENTS)) {
  const escaped = agent.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  assert.match(robots, new RegExp(`User-agent: ${escaped}\\nAllow: /`), `${agent} Allow: /`);
  assert.doesNotMatch(robots, new RegExp(`User-agent: ${escaped}\\nDisallow:`), `${agent} must not Disallow`);
}
assert.doesNotMatch(robots, /User-agent: meta-externalagent/);
assert.deepEqual(uniqueUserAgents(["Meta-ExternalAgent", "meta-externalagent", "META-EXTERNALAGENT"]), [
  "Meta-ExternalAgent",
]);
assert.equal(uniqueUserAgents(AI_CRAWLER_AGENTS).length, AI_CRAWLER_AGENTS.length);
assert.equal(
  new Set(AI_CRAWLER_AGENTS.map((a) => a.toLowerCase())).size,
  AI_CRAWLER_AGENTS.length,
  "AI crawler agents must be unique ignoring case",
);
assert.match(robots, /Cloudflare-AI-Search/);
assert.match(robots, /sitemap-index\.xml/);
assert.match(robots, /azieleliab\.com\/sitemap\.xml/);
assert.match(robots, /azielcorpuslibrary\.net\/sitemap\.xml/);
assert.match(robots, /godlock\.uk\/sitemap\.xml/);
assert.doesNotMatch(robots, /vibelock-download-tracker\.vibelock\.workers\.dev\/sitemap\.xml/);

const siteRes = await get("/sitemap.xml");
assert.equal(siteRes.status, 200);
mime(siteRes, /application\/xml; charset=utf-8/);
const sitemap = await siteRes.text();
assert.match(sitemap, /<urlset /);
assert.match(sitemap, /\/v1\/catalog\.json/);
assert.match(sitemap, /\/v1\/software/);
assert.match(sitemap, /\/v1\/update\/check/);
assert.match(sitemap, /\/v1\/update\/manifest/);
assert.match(sitemap, /\/v1\/fraggate\/software/);
assert.match(sitemap, /\/v1\/fraggate\/describe\?slug=azcoherence/);
assert.match(sitemap, /www\.azieleliab\.com\/software/);
assert.match(sitemap, /www\.azielcorpuslibrary\.net\/software/);
assert.match(sitemap, /godlock\.uk\/software/);
assert.match(sitemap, /\/cite\.json/);
assert.match(sitemap, /\/llms\.txt/);
assert.match(sitemap, /\/sitemap-index\.xml/);
assert.match(sitemap, /github\.com\/AzielEliab\/aziel-runtime\/tree\/main\/docs\/designs/);
assert.match(sitemap, /SEC-FEAT-1\.0\.md/);
assert.match(sitemap, /QNS-CD-1\.0\.md/);
assert.match(sitemap, /FEATURE-STATE-2026-09-10\.md/);
assert.match(sitemap, /REMAIN-OFF-BY-DESIGN-2026-09-10\.md/);
assert.match(sitemap, /AZL-DONATE-1\.0\.md/);
assert.match(sitemap, /docs\/audit/);
assert.match(sitemap, /\/v1\/qns/);

const indexRes = await get("/sitemap-index.xml");
assert.equal(indexRes.status, 200);
mime(indexRes, /application\/xml; charset=utf-8/);
const indexXml = await indexRes.text();
assert.match(indexXml, /<sitemapindex /);
assert.match(indexXml, /aziel-runtime\.example\/sitemap\.xml/);
assert.match(indexXml, new RegExp(AUTHOR_SITE_SITEMAP.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
assert.match(indexXml, new RegExp(LIBRARY_SITEMAP.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
assert.match(indexXml, new RegExp(GODLOCK_UK_SITEMAP.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
assert.match(indexXml, /foldlock-download-tracker\.vibelock\.workers\.dev\/sitemap\.xml/);
assert.match(indexXml, /www\.azielcorpuslibrary\.net\/sitemap\.xml/);
assert.doesNotMatch(indexXml, /vibelock-download-tracker\.vibelock\.workers\.dev\/sitemap\.xml/);
for (const url of hubSitemapList(origin, PRODUCTS)) {
  assert.match(indexXml, new RegExp(url.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
}

const llmsRes = await get("/llms.txt");
assert.equal(llmsRes.status, 200);
mime(llmsRes, /^text\/plain; charset=utf-8/);
const llms = await llmsRes.text();
assert.match(llms, /Aziel Eliab/);
assert.match(llms, /Aziel Elroi Eliab/);
assert.match(llms, /Aziel Digital Library/);
assert.match(llms, /How to cite Aziel Eliab software/);
assert.match(llms, /www\.azielcorpuslibrary\.net\/cite\.json/);
assert.match(llms, /PRODUCT_SEO\.md/);
assert.match(llms, /Worker cite: /);
assert.match(llms, /Compatible AI clients/);
assert.match(llms, /Claude \(Anthropic Desktop \/ custom tools\)/);
assert.match(llms, /Cursor \(MCP\)/);
assert.match(llms, /plus other MCP\/OpenAPI-capable assistants/);
assert.match(llms, /GPTBot\/ChatGPT/);
assert.match(llms, /Google-CloudVertexBot/);
assert.match(llms, /Baiduspider\*/);
assert.match(llms, /\/v1\/uses/);
assert.match(llms, /docs\/designs/);
assert.match(llms, /SEC-FEAT-1\.0/);
assert.match(llms, /QNS-CD-1\.0/);
assert.match(llms, /AZL-WP-1\.1/);
assert.match(llms, /QNM-WP-1\.0/);
assert.match(llms, /not Softwares-tab products/);
assert.match(llms, /FEATURE-STATE-2026-09-10/);
assert.match(llms, /intentional-OFF vs gaps/);
assert.match(llms, /REMAIN-OFF-BY-DESIGN-2026-09-10/);
assert.match(llms, /constitutional OFF set/);
assert.match(llms, /AZL-DONATE-1\.0/);
assert.match(llms, /www\.azieleliab\.com\/donate/);
assert.match(llms, /## Softwares hubs/);
assert.match(llms, /www\.azieleliab\.com\/software/);
assert.match(llms, /www\.azielcorpuslibrary\.net\/software/);
assert.match(llms, /godlock\.uk\/software/);
assert.match(llms, /AZCoherence/);
assert.match(llms, /describe\?slug=azcoherence/);
assert.match(llms, /GET \/v1\/mesh never enables/);
assert.doesNotMatch(llms, /10\.5281\/zenodo\.XXXX/);

const aiRes = await get("/ai.txt");
assert.equal(aiRes.status, 200);
mime(aiRes, /^text\/plain; charset=utf-8/);
assert.equal(await aiRes.text(), llms);

const citeRes = await get("/cite.json");
assert.equal(citeRes.status, 200);
mime(citeRes, /application\/json; charset=utf-8/);
const cite = await citeRes.json();
assert.equal(cite.author, AUTHOR_NAME);
assert.equal(cite.identity, AUTHOR_NAME);
assert.equal(cite.aka, AUTHOR_ALTERNATE_NAME);
assert.equal(cite.alternateName, AUTHOR_ALTERNATE_NAME);
assert.match(cite.how_to_cite, /Eliab, Aziel/);
assert.match(cite.uses, /\/v1\/uses/);
assert.match(cite.library_how_to_cite, /Aziel Digital Library/);
assert.equal(cite.library, "https://www.azielcorpuslibrary.net/");
assert.ok(cite.products.length === PRODUCTS.length);
assert.ok(cite.compatible_ai_clients.includes("Claude (Anthropic Desktop / custom tools)"));
assert.ok(cite.compatible_ai_clients.includes("plus other MCP/OpenAPI-capable assistants"));
assert.match(cite.crawler_allow, /GPTBot\/ChatGPT/);
assert.match(cite.crawler_allow, /Yandex/);
assert.ok(cite.designs);
assert.equal(cite.designs.folder, "docs/designs/");
assert.equal(cite.designs.author, AUTHOR_NAME);
assert.equal(cite.designs.not_fraggate_slug, true);
assert.equal(cite.designs.mesh_get_never_enables, true);
assert.match(cite.designs.how_to_cite, /Eliab, Aziel/);
assert.ok(cite.designs.papers.some((p) => p.id === "SEC-FEAT-1.0"));
assert.ok(cite.designs.papers.some((p) => p.id === "4DM-WP-1.0" && p.kind === "software"));
assert.ok(cite.designs.papers.every((p) => /docs\/designs\//.test(p.path) && /github\.com\/AzielEliab\/aziel-runtime\/blob\/main/.test(p.github)));
assert.ok(cite.audits);
assert.equal(cite.audits.feature_state.id, "FEATURE-STATE-2026-09-10");
assert.equal(cite.audits.remain_off_by_design.id, "REMAIN-OFF-BY-DESIGN-2026-09-10");
assert.equal(cite.audits.remain_off_by_design.do_not_enable, true);
assert.equal(cite.audits.not_fraggate_slug, true);
assert.equal(cite.audits.mesh_get_never_enables, true);
assert.ok(cite.designs.papers.some((p) => p.id === "REMAIN-OFF-BY-DESIGN-2026-09-10" && p.kind === "law"));
assert.ok(cite.designs.papers.some((p) => p.id === "AZL-DONATE-1.0" && p.kind === "law" && p.software_tab === false));
assert.equal(cite.identity, AUTHOR_NAME);
assert.equal(cite.mesh_get_never_enables, true);
assert.ok(cite.hubs);
assert.equal(cite.hubs.mesh_get_never_enables, true);
assert.ok(cite.hubs.hubs.some((h) => h.id === "azieleliab" && /azieleliab\.com\/software/.test(h.software_tab)));
assert.ok(cite.hubs.hubs.some((h) => h.id === "library" && /azielcorpuslibrary\.net\/software/.test(h.software_tab)));
assert.ok(cite.hubs.hubs.some((h) => h.id === "godlock.uk" && /godlock\.uk\/software/.test(h.software_tab)));
assert.equal(cite.azcoherence.slug, "azcoherence");
assert.equal(cite.azcoherence.identity, AUTHOR_NAME);
assert.match(cite.azcoherence.github, /AZCoherence/);
assert.ok(cite.products.some((p) => p.slug === "azcoherence" && /describe\?slug=azcoherence/.test(p.fraggate_describe)));

const catalogRes = await get("/v1/catalog.json");
assert.equal(catalogRes.status, 200);
mime(catalogRes, /application\/json; charset=utf-8/);
const catalog = await catalogRes.json();
assert.equal(catalog.author, AUTHOR_NAME);
assert.equal(catalog.aka, AUTHOR_ALTERNATE_NAME);
assert.equal(catalog.library_name, "Aziel Digital Library");
assert.ok(catalog.crawl.sitemap_index.endsWith("/sitemap-index.xml"));
assert.ok(catalog.crawl.software.endsWith("/v1/software"));
assert.ok(catalog.crawl.mcp.endsWith("/mcp"));
assert.ok(catalog.software.endsWith("/v1/software"));
const fold = catalog.products.find((p) => p.slug === "foldlock");
assert.equal(fold.worker_home, "https://foldlock-download-tracker.vibelock.workers.dev/");
assert.equal(fold.cite, "https://foldlock-download-tracker.vibelock.workers.dev/cite.json");
assert.equal(fold.llms, "https://foldlock-download-tracker.vibelock.workers.dev/llms.txt");
assert.equal(fold.crawl.download, fold.download);
assert.equal(fold.sitemap, "https://foldlock-download-tracker.vibelock.workers.dev/sitemap.xml");
const vibe = catalog.products.find((p) => p.slug === "vibelock");
assert.equal(vibe.sitemap, null);
assert.equal(vibe.crawl.home, "https://vibelock-download-tracker.vibelock.workers.dev/");
assert.equal(vibe.crawl.cite, "https://vibelock-download-tracker.vibelock.workers.dev/cite.json");
assert.equal(vibe.crawl.download, vibe.download);
const god = catalog.products.find((p) => p.slug === "godlock");
assert.equal(god.crawl.llms, null);
assert.ok(god.llms.endsWith("/llms.txt"));
const lib = catalog.products.find((p) => p.slug === "aziel-corpus");
assert.equal(lib.worker_home, "https://www.azielcorpuslibrary.net/");
assert.equal(lib.cite, "https://www.azielcorpuslibrary.net/cite.json");
const azb = catalog.products.find((p) => p.slug === "azbrowser");
assert.equal(azb.slug, "azbrowser");
assert.equal(azb.worker, "azbrowser-download-tracker");
assert.equal(azb.github, "https://github.com/AzielEliab/azbrowser");
assert.equal(azb.fraggate_live, true);
const azn = catalog.products.find((p) => p.slug === "aznet");
assert.equal(azn.slug, "aznet");
assert.equal(azn.worker, "aznet-download-tracker");
assert.equal(azn.github, "https://github.com/AzielEliab/aznet");
assert.equal(azn.fraggate_live, true);
const azh = catalog.products.find((p) => p.slug === "azhub");
assert.equal(azh.worker, "azhub-download-tracker");
assert.equal(azh.github, "https://github.com/AzielEliab/azhub");
assert.equal(azh.fraggate_live, true);
const azi = catalog.products.find((p) => p.slug === "azinterface");
assert.equal(azi.worker, "azinterface-download-tracker");
assert.equal(azi.github, "https://github.com/AzielEliab/azinterface");
assert.equal(azi.fraggate_live, true);
assert.ok(azh.slug !== azi.slug);
assert.ok(azh.slug !== azn.slug);
assert.ok(azi.slug !== azn.slug);
assert.ok(!catalog.products.some((p) => p.slug === "fraggate"));
assert.equal(catalog.fraggate.slug, "fraggate");
assert.equal(catalog.fraggate.github, "https://github.com/AzielEliab/fraggate");
assert.ok(catalog.extras.some((e) => e.slug === "fraggate" && e.kind === "kernel"));
assert.ok(catalog.extras.some((e) => e.slug === "mesh" && e.kind === "kernel" && e.enabled_default === false));
assert.equal(catalog.fraggate.worker, "fraggate-download-tracker");
assert.equal(catalog.fraggate.engine, false);
assert.equal(catalog.fraggate.worker_home, "https://fraggate-download-tracker.vibelock.workers.dev/");
assert.equal(catalog.fraggate.download, "https://fraggate-download-tracker.vibelock.workers.dev/download");
assert.ok(!catalog.products.some((p) => p.worker === "fraggate-download-tracker"));
assert.match(catalog.extras_note, /fraggate-download-tracker/);
assert.match(catalog.extras_note, /not nested in AZBrowser/);

const homeRes = await get("/");
assert.equal(homeRes.status, 200);
mime(homeRes, /text\/html; charset=utf-8/);
const home = await homeRes.text();
assert.match(home, /application\/ld\+json/);
assert.match(home, /"@type":"Person"/);
assert.match(home, /"name":"Aziel Eliab"/);
assert.match(home, /Aziel Elroi Eliab/);
assert.match(home, /property="og:image" content="https:\/\/aziel-runtime\.example\/sigil\.png"/);
assert.match(home, /name="twitter:image" content="https:\/\/aziel-runtime\.example\/sigil\.png"/);
assert.match(home, /property="og:site_name" content="Aziel Eliab"/);
assert.match(home, /href="https:\/\/foldlock-download-tracker\.vibelock\.workers\.dev\/cite\.json"/);
assert.match(home, /href="https:\/\/foldlock-download-tracker\.vibelock\.workers\.dev\/llms\.txt"/);
assert.match(home, /href="https:\/\/foldlock-download-tracker\.vibelock\.workers\.dev\/download"/);
assert.match(home, /sitemap-index\.xml/);
assert.doesNotMatch(home, /Yahweh|Messiah|Jesus Christ/);
assert.match(home, /Compatible AI clients/);
assert.match(home, /Claude \(Anthropic Desktop \/ custom tools\)/);
assert.match(home, /Cursor \(MCP\)/);
assert.match(home, /Glama \(Install Server \/ MCP\)/);
assert.match(home, /Microsoft Copilot \/ Bing/);
assert.match(home, /Google Gemini \/ Vertex AI/);
assert.match(home, /plus other MCP\/OpenAPI-capable assistants/);
assert.doesNotMatch(home, /Import this file in ChatGPT GPT Actions, Grok custom tools, or Venice HTTP tools/);
assert.match(home, /docs\/designs/);
assert.match(home, /SEC-FEAT-1\.0/);
assert.match(home, /4DM-WP-1\.0/);
assert.match(home, /data-slug="4dmap"/);
assert.match(home, /github\.com\/AzielEliab\/aziel-runtime\/(?:tree|blob)\/main\/docs\/designs/);
assert.match(home, /FEATURE-STATE-2026-09-10/);
assert.match(home, /REMAIN-OFF-BY-DESIGN-2026-09-10/);
assert.match(home, /AZL-DONATE-1\.0/);
assert.match(home, /<footer class="donate">/);
assert.match(home, /href="https:\/\/www\.azieleliab\.com\/donate">Donate<\/a>/);
assert.match(home, /encode payment URIs \(BTC \/ ETH \/ LTC \/ XRP \/ DOGE\)/);
assert.doesNotMatch(home, /<img[^>]*(qr|QR)/);
assert.doesNotMatch(home, /bitcoin:|ethereum:|litecoin:|ripple:|dogecoin:/i);
assert.match(home, /docs\/audit/);

const card = await (await get("/p/foldlock")).text();
assert.match(card, /"@type":"Person"/);
assert.match(card, /Aziel Elroi Eliab/);
assert.match(card, /og:image/);
assert.match(card, /<footer class="donate">/);
assert.match(card, /href="https:\/\/www\.azieleliab\.com\/donate">Donate<\/a>/);
assert.doesNotMatch(card, /<img[^>]*(qr|QR)/);

assert.equal(prefersHtml(new Request(origin + "/v1/software")), false);
assert.equal(
  prefersHtml(new Request(origin + "/v1/software", { headers: { accept: "application/json" } })),
  false,
);
assert.equal(
  prefersHtml(
    new Request(origin + "/v1/software", {
      headers: { accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8" },
    }),
  ),
  true,
);
assert.equal(prefersHtml(new Request(origin + "/v1/software?format=html")), true);
assert.equal(
  prefersHtml(new Request(origin + "/v1/software?format=json", { headers: { accept: "text/html" } })),
  false,
);

const softwareHtmlRes = await handler(
  new Request(origin + "/v1/software", { headers: { accept: "text/html" } }),
  {},
);
assert.equal(softwareHtmlRes.status, 200);
mime(softwareHtmlRes, /text\/html; charset=utf-8/);
const softwareHtml = await softwareHtmlRes.text();
assert.match(softwareHtml, new RegExp(`<title>${SOFTWARE_PAGE_TITLE.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}</title>`));
assert.match(softwareHtml, /<meta name="description"/);
assert.match(softwareHtml, /application\/ld\+json/);
assert.match(softwareHtml, /"@type":"Person"/);
assert.match(softwareHtml, /"name":"Aziel Eliab"/);
assert.match(softwareHtml, /data-slug="azcoherence"/);
assert.match(softwareHtml, /www\.azieleliab\.com\/software/);
assert.match(softwareHtml, /godlock\.uk\/software/);
assert.match(softwareHtml, /GET \/v1\/mesh never enables/);
assert.doesNotMatch(softwareHtml, /Yahweh|Messiah|Jesus Christ/);

const softwareJsonStill = await get("/v1/software");
assert.match(softwareJsonStill.headers.get("content-type") || "", /application\/json/);
const softwareJsonBody = await softwareJsonStill.json();
assert.equal(softwareJsonBody.identity, AUTHOR_NAME);
assert.equal(softwareJsonBody.mesh_get_never_enables, true);
assert.ok(softwareJsonBody.hubs_crawl);
assert.equal(softwareJsonBody.azcoherence.slug, "azcoherence");

const describeHtmlRes = await handler(
  new Request(origin + "/v1/fraggate/describe?slug=azcoherence", { headers: { accept: "text/html" } }),
  {},
);
assert.equal(describeHtmlRes.status, 200);
mime(describeHtmlRes, /text\/html; charset=utf-8/);
const describeHtml = await describeHtmlRes.text();
assert.match(describeHtml, /<title>AZCoherence — FragGate describe — Aziel Eliab Runtime<\/title>/);
assert.match(describeHtml, /application\/ld\+json/);
assert.match(describeHtml, /"@type":"Person"/);
assert.match(describeHtml, /www\.azieleliab\.com\/software/);
assert.match(describeHtml, /GET \/v1\/mesh never enables/);

const describeIndexRes = await handler(
  new Request(origin + "/v1/fraggate/describe", { headers: { accept: "text/html" } }),
  {},
);
assert.equal(describeIndexRes.status, 200);
const describeIndex = await describeIndexRes.text();
assert.match(describeIndex, new RegExp(`<title>${DESCRIBE_INDEX_TITLE.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}</title>`));
assert.match(describeIndex, /data-slug="azcoherence"/);

const describeJsonStill = await get("/v1/fraggate/describe?slug=azcoherence");
assert.match(describeJsonStill.headers.get("content-type") || "", /application\/json/);
const described = await describeJsonStill.json();
assert.equal(described.ok, true);
assert.equal(described.slug, "azcoherence");

assert.ok(MISSING_PRODUCT_SITEMAP_SLUGS.includes("vibelock"));
assert.equal(productWorkerOrigin({ slug: "aziel-corpus" }), "https://www.azielcorpuslibrary.net");
assert.equal(productCrawlUrls({ slug: "vibelock", worker: "vibelock-download-tracker" }).has_sitemap, false);

const openapi = await (await get("/openapi.json")).json();
assert.ok(openapi.paths["/sitemap-index.xml"]);
assert.ok(openapi.paths["/robots.txt"]);
assert.match(openapi.info.description, /Claude \(Anthropic Desktop \/ custom tools\)/);
assert.match(openapi.info.description, /plus other MCP\/OpenAPI-capable assistants/);
assert.match(openapi.info.description, /docs\/designs/);
assert.equal(openapi.info.externalDocs.url, "https://github.com/AzielEliab/aziel-runtime/tree/main/docs/designs");
assert.doesNotMatch(openapi.info.description, /Import this file in ChatGPT GPT Actions, Grok custom tools, or Venice HTTP tools/);
assert.match(openapi.components.securitySchemes.RuntimeToken.description, /Claude, Cursor, Glama/);

console.log("ok seo hub: robots, sitemap-index, llms/cite MIME, Person JSON-LD, catalog crawl links, HTML shells");
