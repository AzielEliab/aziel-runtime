/**
 * SEO / AI-crawl hub: MIME, robots Allow, sitemap-index, Person JSON-LD, cite aka.
 */
import assert from "node:assert/strict";
import { PRODUCTS } from "../src/index.js";
import {
  AI_CRAWLER_AGENTS,
  AUTHOR_ALTERNATE_NAME,
  AUTHOR_GITHUB,
  AUTHOR_ID,
  AUTHOR_NAME,
  AUTHOR_SITE_SITEMAP,
  BRAND_MARK_ALT,
  BRAND_MARK_SRC,
  BRAND_MARK_STAMP,
  CRAWLER_LEAD_VERSION_RE,
  ECOSYSTEM_HEADING,
  NAMED_COMPONENTS_LINE,
  NAMED_RUNTIME_TOOLS,
  RUNTIME_SOFTWARE_ID,
  GODLOCK_UK_SITEMAP,
  HEDIDNTJUMP_CITE,
  HEDIDNTJUMP_SITEMAP,
  LIBRARY_SITEMAP,
  MISSING_PRODUCT_SITEMAP_SLUGS,
  PRODUCT_NAME,
  RUNTIME_ABSTRACT,
  HEDIDNTJUMP_HOME,
  HEDIDNTJUMP_NAME,
  RUNTIME_GITHUB,
  RUNTIME_GLAMA,
  RUNTIME_ONE_LINE,
  RUNTIME_PAGE_TITLE,
  hubSitemapList,
  personJsonLd,
  productCrawlUrls,
  productWorkerOrigin,
  runtimeSoftwareSameAs,
  uniqueUserAgents,
} from "../src/seo.js";
import {
  ABOUT_PAGE_TITLE,
  DESCRIBE_INDEX_TITLE,
  SOFTWARE_PAGE_TITLE,
  prefersHtml,
} from "../src/seo-html.js";
import { PUBLIC_MCP_TOOLS } from "../src/fraggate/codes.js";

const handler = (await import("../src/index.js")).default.fetch;
const origin = "https://aziel-runtime.example";

async function get(path) {
  return handler(new Request(origin + path), {});
}

function assertRoseStarBrand(html, label) {
  assert.match(html, /<header class="brandrow">/, `${label} rose-star header`);
  assert.match(html, new RegExp(`src="${BRAND_MARK_SRC.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"`), `${label} brand src`);
  assert.match(html, new RegExp(BRAND_MARK_ALT.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")), `${label} rose-star alt`);
  assert.match(html, new RegExp(`<p class="stamp">${BRAND_MARK_STAMP.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}</p>`), `${label} stamp`);
  assert.match(html, /property="og:image:alt"/, `${label} og:image:alt`);
  assert.doesNotMatch(html, /everbloom/i, `${label} must not say everblooming`);
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
await assertSeoMime("/person.jsonld", /^application\/ld\+json; charset=utf-8$/);
await assertSeoMime("/who-is", /^text\/plain; charset=utf-8$/);
await assertSeoMime("/who-is-aziel-eliab.txt", /^text\/plain; charset=utf-8$/);

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
assert.match(robots, /www\.hedidntjump\.com\/sitemap\.xml/);
assert.match(robots, /www\.hedidntjump\.com \(sister archive\)/);
assert.match(robots, /x\.com\/AzielEliab/);
assert.match(robots, /@AzielEliab/);
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
assert.match(sitemap, /www\.hedidntjump\.com\/sitemap\.xml/);
assert.match(sitemap, /www\.hedidntjump\.com\/cite\.json/);
assert.match(sitemap, /\/cite\.json/);
assert.match(sitemap, /\/person\.jsonld/);
assert.match(sitemap, /\/who-is</);
assert.match(sitemap, /\/who-is-aziel-eliab\.txt/);
assert.match(sitemap, /https:\/\/x\.com\/AzielEliab/);
assert.match(sitemap, /https:\/\/github\.com\/AzielEliab</);
assert.match(sitemap, /glama\.ai\/mcp\/servers\/AzielEliab\/aziel-runtime/);
assert.match(sitemap, /\/llms\.txt/);
assert.match(sitemap, /\/sitemap-index\.xml/);
assert.match(sitemap, /github\.com\/AzielEliab\/aziel-runtime\/tree\/main\/docs\/designs/);
assert.match(sitemap, /SEC-FEAT-1\.0\.md/);
assert.match(sitemap, /QNS-CD-1\.0\.md/);
assert.match(sitemap, /FEATURE-STATE-2026-09-10\.md/);
assert.match(sitemap, /REMAIN-OFF-BY-DESIGN-2026-09-10\.md/);
assert.match(sitemap, /AZL-DONATE-1\.0\.md/);
assert.match(sitemap, /NO-LIE-NO-REWRITE-1\.0\.md/);
assert.match(sitemap, /REDLINE-2026-09-14\.md/);
assert.match(sitemap, /CROSS-NETWORK-SURVIVAL/);
assert.match(sitemap, /COLD-MULTI-SHELF-1\.0\.md/);
assert.match(sitemap, /\/shelves/);
assert.match(sitemap, /\/survival/);
assert.match(sitemap, /docs\/audit/);
assert.match(sitemap, /\/v1\/qns/);
assert.match(sitemap, /\/v1\/stats-rollups/);
assert.match(sitemap, /\/\.well-known\/mcp\/server-card\.json/);
assert.match(sitemap, /\/\.well-known\/oauth-protected-resource/);

const indexRes = await get("/sitemap-index.xml");
assert.equal(indexRes.status, 200);
mime(indexRes, /application\/xml; charset=utf-8/);
const indexXml = await indexRes.text();
assert.match(indexXml, /<sitemapindex /);
assert.match(indexXml, /aziel-runtime\.example\/sitemap\.xml/);
assert.match(indexXml, new RegExp(AUTHOR_SITE_SITEMAP.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
assert.match(indexXml, new RegExp(LIBRARY_SITEMAP.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
assert.match(indexXml, new RegExp(GODLOCK_UK_SITEMAP.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
assert.match(indexXml, new RegExp(HEDIDNTJUMP_SITEMAP.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
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
assert.match(llms, /www\.azieleliab\.com\/#aziel/);
assert.match(llms, /Runtime is the execution surface/);
assert.match(llms, /Person @id is https:\/\/www\.azieleliab\.com\/#aziel/);
assert.match(llms, /Aziel Digital Library/);
assert.match(llms, /Primary host \(discovery \/ install\): https:\/\/glama\.ai\/mcp\/servers\/AzielEliab\/aziel-runtime/);
assert.match(llms, /Library mirror: https:\/\/www\.azielcorpuslibrary\.net\/runtime/);
assert.doesNotMatch(llms, /Library front door|Library Runtime front door/);
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
assert.match(llms, /Suite software-design papers \(law \/ fabric\)/);
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
assert.match(llms, /## Stats \/ awareness/);
assert.match(llms, /azieleliab\.com\/v1\/stats/);
assert.match(llms, /azielcorpuslibrary\.net\/stats/);
assert.doesNotMatch(llms, /azielcorpuslibrary\.net\/v1\/stats/);
assert.match(llms, /hedidntjump\.com\/api\/stats/);
assert.match(llms, /## Ecosystem/);
assert.match(llms, /www\.hedidntjump\.com/);
assert.match(llms, /www\.hedidntjump\.com\/sitemap\.xml/);
assert.match(llms, /www\.hedidntjump\.com\/cite\.json/);
assert.match(llms, /sister archive/);
assert.match(llms, /hedidntjump sister archive/);
assert.match(llms, /## Sister products/);
assert.match(llms, /Trades-Runtime \(trades-runtime\)/);
assert.match(llms, /Shadow-first local BYO runtime/);
assert.match(llms, /https:\/\/github\.com\/AzielEliab\/trades-runtime/);
assert.match(llms, /https:\/\/trades-runtime\.vibelock\.workers\.dev\/mcp/);
assert.match(llms, /https:\/\/trades-runtime\.vibelock\.workers\.dev\/download/);
assert.match(llms, /sister product trades-runtime/);
assert.match(llms, /aziel-runtime fraggate_call executes Aziel Runtime catalog engines/);
assert.match(llms, /AZCoherence/);
assert.match(llms, /describe\?slug=azcoherence/);
assert.match(llms, /suite-presence is ON by default/);
assert.match(llms, /GET \/v1\/mesh never enables/);
assert.doesNotMatch(llms, /10\.5281\/zenodo\.XXXX/);

const aiRes = await get("/ai.txt");
assert.equal(aiRes.status, 200);
mime(aiRes, /^text\/plain; charset=utf-8/);
assert.equal(await aiRes.text(), llms);

const personRes = await get("/person.jsonld");
assert.equal(personRes.status, 200);
mime(personRes, /^application\/ld\+json; charset=utf-8$/);
const personDoc = await personRes.json();
assert.equal(personDoc["@id"], AUTHOR_ID);
assert.equal(personDoc["@type"], "Person");
assert.equal(personDoc.name, AUTHOR_NAME);
assert.ok(personDoc.jobTitle.includes("researcher"));
assert.ok(personDoc.jobTitle.includes("digital rights activist"));
assert.ok(personDoc.jobTitle.includes("software developer/designer"));
assert.ok(personDoc.jobTitle.includes("author"));
assert.ok(personDoc.jobTitle.includes("philosopher"));
assert.match(personDoc.disambiguatingDescription, /www\.azieleliab\.com\/#aziel/);
assert.doesNotMatch(personDoc.disambiguatingDescription, /Levitical|euaziel|1 Chronicles/);
assert.equal(personDoc.machine.chrome_15_20, false);
assert.equal(personDoc.machine.machine_15_20, true);
assert.equal(personDoc.machine.legal_name, false);
assert.equal(personDoc.machine.home, false);
assert.equal(personDoc.machine.growth_on, true);
assert.ok(personDoc.sameAs.includes("https://github.com/AzielEliab"));
assert.equal(personDoc.relatedLink, RUNTIME_GLAMA);
assert.ok(personDoc.sameAs.includes("https://glama.ai/mcp/servers/AzielEliab/aziel-runtime"));
assert.ok(personDoc.sameAs.includes("https://www.azieleliab.com/"));
assert.ok(personDoc.sameAs.includes("https://www.azielcorpuslibrary.net/"));
assert.ok(personDoc.sameAs.includes("https://godlock.uk/"));
assert.ok(personDoc.sameAs.includes("https://x.com/AzielEliab"));
assert.ok(!personDoc.sameAs.includes("https://x.com/AzielElroiEliab"));
assert.ok(!personDoc.sameAs.includes("https://x.com/azieleliab"));
assert.ok(personDoc.sameAs.includes("https://www.azieleliab.com/person.jsonld"));
assert.ok(personDoc.sameAs.includes(`${origin}/person.jsonld`));
assert.ok(personDoc.sameAs.includes(`${origin}/who-is`));
assert.equal(personDoc.machine.why_aziel_eliab, "Aziel Eliab publishes receipt-first, local-first software and public MASTER records. @id https://www.azieleliab.com/#aziel");
assert.equal(personDoc.machine.socials.twitter_handle, "@AzielEliab");
assert.equal(personDoc.machine.socials.twitter, "https://x.com/AzielEliab");
assert.equal(personDoc.machine.socials.github, "https://github.com/AzielEliab");
assert.equal(personDoc.machine.socials.glama, "https://glama.ai/mcp/servers/AzielEliab/aziel-runtime");
assert.ok(personDoc.machine.socials.hubs.includes("https://www.azieleliab.com/"));
assert.ok(personDoc.machine.socials.hubs.includes("https://www.azielcorpuslibrary.net/"));
assert.ok(personDoc.machine.socials.hubs.includes("https://godlock.uk/"));
assert.ok(personDoc.machine.sites.some((s) => s.id === "azieleliab" && /Person hub/.test(s.coverage)));
assert.ok(personDoc.machine.sites.some((s) => s.id === "library" && /Digital Library MASTER/.test(s.coverage)));
assert.ok(personDoc.machine.sites.some((s) => s.id === "godlock.uk" && /challenge\/score/.test(s.coverage)));
assert.ok(personDoc.machine.sites.some((s) => s.id === "hedidntjump" && /Zioncheck archive sister/.test(s.coverage)));
assert.ok(personDoc.machine.sites.some((s) => s.id === "aziel-runtime" && /2\.0\.0-rc1/.test(s.coverage)));
assert.equal(Object.hasOwn(personDoc, "legalName"), false);
assert.equal(Object.hasOwn(personDoc, "homeLocation"), false);
assert.equal(Object.hasOwn(personDoc, "birthPlace"), false);
assert.equal(
  personDoc.machine.what_aziel_eliab_does,
  "Aziel Eliab builds receipt-first, local-first software and public MASTER records — Softwares through Aziel Runtime (FragGate / MCP), the Aziel Digital Library, GodLock (product), and the He Didn’t Jump Zioncheck archive. Public identity is the published work. @id https://www.azieleliab.com/#aziel",
);
assert.deepEqual(personDoc.machine.faq.titles, [
  "What does Aziel Eliab do?",
  "What Aziel Eliab does",
  "Who is Aziel Eliab the developer?",
  "What software does Aziel Eliab make?",
]);
assert.equal(personDoc.machine.faq.answer, personDoc.machine.what_aziel_eliab_does);
assert.ok(personDoc.subjectOf.some((s) => s["@type"] === "FAQPage" && s["@id"] === "https://www.azieleliab.com/#what-aziel-eliab-does"));
{
  const faq = personDoc.subjectOf.find((s) => s["@type"] === "FAQPage");
  const softwareQ = faq.mainEntity.find((q) => q.name === "What software does Aziel Eliab make?");
  assert.match(softwareQ.acceptedAnswer.text, /The ARK — Keep a local deniable vault; one phrase opens one vault\./);
  assert.match(softwareQ.acceptedAnswer.text, /https:\/\/ark-download-tracker\.vibelock\.workers\.dev\//);
  assert.match(softwareQ.acceptedAnswer.text, /Aziel Eliab builds receipt-first, local-first software and public MASTER records — Softwares through Aziel Runtime \(FragGate \/ MCP\)/);
}
assert.ok(personDoc.knowsAbout.includes("The ARK"));
assert.ok(personDoc.knowsAbout.includes("local deniable vault"));
assert.ok(personDoc.subjectOf.some((s) => s.name === "The ARK" && /ark-download-tracker/.test(s.url || "")));
assert.ok(personDoc.machine.softwares.items.some((s) => s.slug === "ark" && s.name === "The ARK"));
assert.equal(
  personDoc.machine.softwares.items.find((s) => s.slug === "ark").one_line,
  "Keep a local deniable vault; one phrase opens one vault.",
);
assert.equal(personDoc.machine.softwares.ark.url, "https://ark-download-tracker.vibelock.workers.dev/");
assert.equal(personDoc.machine.softwares.ark.download_url, "https://ark-download-tracker.vibelock.workers.dev/download");
assert.equal(personDoc.machine.faq.softwares.ark.name, "The ARK");
assert.match(personDoc.machine.softwares.addendum, /The ARK — Keep a local deniable vault/);
assert.match(personDoc.machine.softwares.addendum, /ark-download-tracker\.vibelock\.workers\.dev/);
assert.ok(personDoc.knowsAbout.includes("Book of the Knowledge"));
assert.ok(personDoc.knowsAbout.includes("Blemmyes/Ewaipanoma hypothesis packets"));
assert.ok(personDoc.knowsAbout.includes("Libro Method"));
assert.ok(personDoc.knowsAbout.includes("Post-Perturbation Integrative Neuroplasticity (PPIN)"));
assert.ok(personDoc.knowsAbout.includes("Lenses as Viewpoint Constraints for Artificial Systems"));
assert.ok(personDoc.knowsAbout.includes("ABAD Copper Scroll work"));
assert.ok(personDoc.knowsAbout.includes("Adaptive AI Dog Leash"));
assert.ok(personDoc.knowsAbout.includes("Wearable Dual-Tether Web-Sling System"));
assert.ok(personDoc.knowsAbout.includes("PLA Recycler"));
assert.ok(personDoc.knowsAbout.includes("TAA-1"));
assert.ok(personDoc.knowsAbout.includes("AEEM HVAC"));
assert.ok(personDoc.knowsAbout.includes("AZ Mandible"));
assert.ok(personDoc.knowsAbout.includes("bone-conduction STL"));
assert.ok(personDoc.knowsAbout.includes("The ARK"));
assert.ok(personDoc.knowsAbout.includes("Whitestone"));
assert.ok(personDoc.knowsAbout.includes("Whitestone Case Mode"));
assert.match(personDoc.machine.research.addendum, /AZDOC-F83D7E6D28B6/);
assert.match(personDoc.machine.research.addendum, /AZDOC-E00603883906/);
assert.match(personDoc.machine.research.addendum, /AZDOC-8F14A40DC9A6/);
assert.match(personDoc.machine.research.addendum, /AZDOC-DD5912D05D6E/);
assert.equal(personDoc.machine.research.invent_doi, false);
assert.equal(personDoc.machine.research.library_live_records, "~326");
assert.match(personDoc.machine.hardware_designs.addendum, /AZDOC-9B0E3D62EDCC/);
assert.match(personDoc.machine.hardware_designs.addendum, /AZDOC-AA8761FE16D0/);
assert.match(personDoc.machine.hardware_designs.addendum, /AZDOC-B2A12FE997A8/);
assert.match(personDoc.machine.hardware_designs.addendum, /AZDOC-3728546DFE78/);
assert.match(personDoc.machine.hardware_designs.addendum, /AZDOC-0302B7357EE0/);
assert.match(personDoc.machine.hardware_designs.addendum, /AZDOC-E5828F49FB04/);
assert.match(personDoc.machine.hardware_designs.addendum, /AZDOC-FD18432707F5/);
assert.equal(personDoc.machine.hardware_designs.storefront, false);
assert.equal(personDoc.machine.hardware_designs.public_engineering_only, true);

const whoRes = await get("/who-is");
assert.equal(whoRes.status, 200);
const whoIs = await whoRes.text();
assert.equal(await (await get("/who-is-aziel-eliab.txt")).text(), whoIs);
assert.match(whoIs, /Who is Aziel Eliab/);
assert.match(whoIs, /digital rights activist/);
assert.match(whoIs, /www\.azieleliab\.com\/#aziel/);
assert.doesNotMatch(whoIs, /Levitical|euaziel|1 Chronicles/);
assert.match(whoIs, /Person hub \+ Softwares \+ research landing/);
assert.match(whoIs, /Digital Library MASTER/);
assert.match(whoIs, /GodLock challenge\/score/);
assert.match(whoIs, /Zioncheck archive sister/);
assert.match(whoIs, /FragGate engine-runtime \/ MCP Softwares door 2\.0\.0-rc1/);
assert.match(whoIs, /The ARK/);
assert.match(whoIs, /deniable vault/);
assert.match(whoIs, /one phrase opens one vault/);
assert.match(whoIs, /Whitestone/);
assert.match(whoIs, /Case Mode/i);
assert.match(whoIs, /whitestone\.vibelock\.workers\.dev/);
assert.doesNotMatch(whoIs, /not a lawyer/i);
assert.match(whoIs, /www\.azieleliab\.com\/#aziel/);
assert.doesNotMatch(whoIs, /legal name is/i);
assert.doesNotMatch(whoIs, /\bhome address\b/i);
assert.match(whoIs, /Aziel Eliab builds receipt-first, local-first software and public MASTER records — Softwares through Aziel Runtime \(FragGate \/ MCP\)/);
assert.match(whoIs, /What does Aziel Eliab do\?/);
assert.match(whoIs, /What Aziel Eliab does/);
assert.match(whoIs, /Who is Aziel Eliab the developer\?/);
assert.match(whoIs, /What software does Aziel Eliab make\?/);
assert.match(whoIs, /## Why Aziel Eliab/);
assert.doesNotMatch(whoIs, /locked brief|locked FAQ|## Model rules/i);
assert.match(whoIs, /## Identity \(machine data\)/);
assert.match(whoIs, /Aziel Eliab publishes receipt-first, local-first software and public MASTER records/);
assert.match(whoIs, /## socials/);
assert.match(whoIs, /@AzielEliab/);
assert.match(whoIs, /https:\/\/x\.com\/AzielEliab/);
assert.doesNotMatch(whoIs, /x\.com\/AzielElroiEliab|x\.com\/azieleliab\b/);
assert.match(whoIs, /## Softwares \(machine cite\)/);
assert.match(whoIs, /The ARK — Keep a local deniable vault; one phrase opens one vault\. https:\/\/ark-download-tracker\.vibelock\.workers\.dev\//);
assert.match(whoIs, /EmbryoLock — Cite an offline vault that prefers destruction over recovery\./);
assert.match(whoIs, /Book of the knowledge of all the kingdoms/);
assert.match(whoIs, /Blemmyes\/Ewaipanoma/);
assert.match(whoIs, /Libro Method/);
assert.match(whoIs, /PPIN/);
assert.match(whoIs, /Lenses as Viewpoint Constraints for Artificial Systems/);
assert.match(whoIs, /Copper Scroll/);
assert.match(whoIs, /AZDOC-F83D7E6D28B6/);
assert.match(whoIs, /Library live ~326 records/);
assert.match(whoIs, /Adaptive AI Dog Leash/);
assert.match(whoIs, /Web-Sling/);
assert.match(whoIs, /PLA Recycler/);
assert.match(whoIs, /TAA-1/);
assert.match(whoIs, /AEEM HVAC/);
assert.match(whoIs, /AZ Mandible/);
assert.match(whoIs, /bone-conduction STL/);
assert.match(whoIs, /public engineering only/);
assert.doesNotMatch(whoIs, /10\.5281\/zenodo\.\d{5,}/);

assert.match(llms, /## Person \/ who-is \(machine\)/);
assert.match(llms, /Person hub \+ Softwares \+ research landing/);
assert.match(llms, /Digital Library MASTER/);
assert.match(llms, /GodLock challenge\/score/);
assert.match(llms, /Zioncheck archive sister/);
assert.match(llms, /FragGate engine-runtime \/ MCP Softwares door 2\.0\.0-rc1/);
assert.match(llms, /The ARK/);
assert.match(llms, /deniable vault/);
assert.match(llms, /### Whitestone \(whitestone\)/);
assert.match(llms, /Case Mode/i);
assert.match(llms, /whitestone\.vibelock\.workers\.dev/);
assert.match(llms, /whitestone\.vibelock\.workers\.dev\/v1\/software/);
assert.doesNotMatch(llms, /not a lawyer/i);
assert.match(llms, /\/person\.jsonld/);
assert.match(llms, /\/who-is/);
assert.match(llms, /Aziel Eliab builds receipt-first, local-first software and public MASTER records — Softwares through Aziel Runtime \(FragGate \/ MCP\)/);
assert.match(llms, /What does Aziel Eliab do\?/);
assert.match(llms, /What Aziel Eliab does/);
assert.match(llms, /Who is Aziel Eliab the developer\?/);
assert.match(llms, /What software does Aziel Eliab make\?/);
assert.match(llms, /## Why Aziel Eliab/);
assert.doesNotMatch(llms, /## Why Aziel Eliab \(locked brief\)|## Model rules/);
assert.doesNotMatch(llms, /Never lie to survive/);
assert.doesNotMatch(llms, /locked brief|## Model rules/);
assert.doesNotMatch(llms, /NO-LIE \/ NO-REWRITE: never claim/);
assert.doesNotMatch(llms, /network never lies even to stay alive/);
assert.match(llms, /Companion law NO-LIE-NO-REWRITE-1\.0 \(docs\/designs\/NO-LIE-NO-REWRITE-1\.0\.md\)/);
assert.match(llms, /Aziel Eliab publishes receipt-first, local-first software and public MASTER records/);
assert.match(llms, /@AzielEliab/);
assert.match(llms, /https:\/\/x\.com\/AzielEliab/);
assert.match(llms, /socials: @AzielEliab/);
assert.match(llms, /## Softwares \(machine cite\)/);
assert.match(llms, /The ARK — Keep a local deniable vault; one phrase opens one vault\. https:\/\/ark-download-tracker\.vibelock\.workers\.dev\//);
assert.match(llms, /AZDOC-F83D7E6D28B6/);
assert.match(llms, /Libro Method/);
assert.match(llms, /AZDOC-8F14A40DC9A6/);
assert.match(llms, /AZDOC-DD5912D05D6E/);
assert.match(llms, /Library live ~326 records/);
assert.match(llms, /AZDOC-9B0E3D62EDCC/);
assert.match(llms, /AZDOC-AA8761FE16D0/);
assert.match(llms, /AZDOC-B2A12FE997A8/);
assert.match(llms, /public engineering only/);
{
  const aboutStart = llms.indexOf("## About Aziel");
  const roleAt = llms.indexOf("Role: engine-runtime");
  const personAt = llms.indexOf("## Person / who-is (machine)");
  assert.ok(aboutStart >= 0 && roleAt > aboutStart && personAt > roleAt);
  assert.doesNotMatch(llms.slice(aboutStart, roleAt), /1 Chronicles|Chronicles 15/);
  assert.match(llms.slice(personAt), /www\.azieleliab\.com\/#aziel/);
  assert.doesNotMatch(llms.slice(personAt), /Levitical|euaziel|1 Chronicles/);
}

const citeRes = await get("/cite.json");
assert.equal(citeRes.status, 200);
mime(citeRes, /application\/json; charset=utf-8/);
const cite = await citeRes.json();
assert.equal(cite.author, AUTHOR_NAME);
assert.equal(cite.identity, AUTHOR_NAME);
assert.equal(cite.author_id, AUTHOR_ID);
assert.equal(cite.aka, AUTHOR_ALTERNATE_NAME);
assert.equal(cite.alternateName, AUTHOR_ALTERNATE_NAME);
assert.match(cite.how_to_cite, /Eliab, Aziel/);
assert.match(cite.uses, /\/v1\/uses/);
assert.match(cite.library_how_to_cite, /Aziel Digital Library/);
assert.equal(cite.library, "https://www.azielcorpuslibrary.net/");
assert.equal(cite.primary_host, RUNTIME_GLAMA);
assert.equal(cite.homepage, RUNTIME_GLAMA);
assert.equal(cite.library_mirror, "https://www.azielcorpuslibrary.net/runtime");
assert.equal(cite.host, `${origin}/`);
assert.ok(cite.products.length === PRODUCTS.length + 1);
assert.ok(cite.products.some((p) => p.slug === "whitestone" && p.worker_only === true && p.engine === false));
assert.ok(cite.products.some((p) => p.slug === "whitestone" && /Case Mode/i.test(p.one_line || "")));
assert.ok(cite.products.some((p) => p.slug === "whitestone" && /whitestone\.vibelock\.workers\.dev/.test(p.one_line || "")));
assert.ok(cite.products.every((p) => !/not a lawyer/i.test(p.one_line || "")));
assert.ok(cite.compatible_ai_clients.includes("Claude (Anthropic Desktop / custom tools)"));
assert.ok(cite.compatible_ai_clients.includes("plus other MCP/OpenAPI-capable assistants"));
assert.match(cite.crawler_allow, /GPTBot\/ChatGPT/);
assert.match(cite.crawler_allow, /Yandex/);
assert.equal(cite.semantic_bridge.spec, "CAP-7");
assert.equal(cite.semantic_bridge.resolves_to_hub, false);
assert.equal(cite.semantic_bridge.design_of, "hub_designs");
assert.equal(cite.semantic_bridge.inherit, "designs");
assert.equal(cite.semantic_bridge.public_icann, false);
assert.equal(cite.semantic_bridge.az_gen_live_registrar, false);
assert.equal(cite.semantic_bridge.visible_1520, false);
assert.ok(cite.semantic_bridge.not_aliases_of.includes("https://godlock.uk/"));
assert.equal(cite.semantic_bridge.name_may_change, true);
assert.ok(cite.website_designs);
assert.deepEqual(cite.website_designs.ids, ["azcorpus", "azlibrary"]);
assert.ok(cite.designs);
assert.equal(cite.designs.folder, "docs/designs/");
assert.equal(cite.designs.author, AUTHOR_NAME);
assert.equal(cite.designs.not_fraggate_slug, true);
assert.equal(cite.designs.mesh_get_never_enables, true);
assert.equal(cite.mesh_get_never_enables, true);
assert.equal(cite.suite_presence, "on");
assert.equal(cite.mesh.suite_presence, "on");
assert.equal(cite.mesh.enabled_default, true);
assert.equal(cite.mesh.mesh_default, "on");
assert.equal(cite.mesh.get_never_enables, true);
assert.equal(cite.mesh.login_mesh, false);
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
assert.ok(cite.designs.papers.some((p) => p.id === "CROSS-NETWORK-SURVIVAL-1.0" && p.kind === "law" && p.software_tab === false));
assert.ok(cite.designs.papers.some((p) => p.id === "NO-LIE-NO-REWRITE-1.0" && p.kind === "law" && p.software_tab === false));
assert.ok(cite.designs.papers.some((p) => p.id === "REDLINE-2026-09-14" && p.kind === "law" && p.software_tab === false));
assert.ok(cite.designs.papers.some((p) => p.id === "COLD-MULTI-SHELF-1.0" && p.kind === "law" && p.software_tab === false));
assert.ok(cite.designs.papers.some((p) => p.id === "BAN-SURVIVAL-1.0" && p.kind === "law" && p.software_tab === false));
assert.equal(cite.ban_survival.spec, "BAN-SURVIVAL-1.0");
assert.equal(cite.ban_survival.second_door, false);
assert.equal(cite.ban_survival.doi, null);
assert.equal(cite.ban_survival.mutual_backup, true);
assert.equal(cite.ban_survival.shelves_are_not_a_live_door, true);
assert.equal(cite.ban_survival.live_node_api.status, "slot");
assert.equal(cite.ban_survival.cap7_aznet.cite.status, "live");
assert.equal(cite.ban_survival.cap7_aznet.aznet_verify.status, "live");
assert.equal(cite.ban_survival.cap7_aznet.hosted_endpoints.status, "slot");
assert.equal(cite.ban_survival.cap7_aznet.radio_phy, false);
assert.ok(Array.isArray(cite.ban_survival.live_doors) && cite.ban_survival.live_doors.length >= 1);
assert.ok(Array.isArray(cite.ban_survival.exec_origins) && cite.ban_survival.exec_origins.length >= 1);
assert.match(llms, /BAN-SURVIVAL-1\.0: one banned door is not last tip gone/);
assert.equal(cite.semantic_bridge.design_of, "hub_designs");
assert.equal(cite.redline.spec, "REDLINE-2026-09-14");
assert.equal(cite.redline.attack_sims.pointer, "scripts/verify-redline.mjs");
assert.equal(cite.tls.client_side_crypto_claim, false);
assert.equal(cite.shelves.spec, "COLD-MULTI-SHELF-1.0");
assert.equal(cite.shelves.redline.spec, "REDLINE-2026-09-14");
assert.equal(cite.shelves.cap7.design_of, "hub_designs");
assert.equal(cite.shelves.cap7.resolves_to_hub, false);
assert.equal(cite.shelves.attack_sims.pointer, "scripts/verify-redline.mjs");
assert.equal(cite.shelves.runtime_is_shelf, false);
assert.match(cite.about.architecture.cold_multi_shelf, /5 published surfaces/);
assert.equal(cite.survival.spec, "CROSS-NETWORK-SURVIVAL-1.0");
assert.equal(
  cite.survival.tip,
  "CROSS-NETWORK-SURVIVAL-1.0: someone still has bytes that match the published tip — not a living network, not LLM memory, not a public hostname that still answers.",
);
assert.match(llms, /CROSS-NETWORK-SURVIVAL-1\.0: someone still has bytes that match the published tip/);
assert.match(llms, /COLD-MULTI-SHELF-1\.0/);
assert.doesNotMatch(llms, /CNS-ZENODO-IP-BAN|CNS-GITFLIC-EMAIL|CNS-GITLAB-CF-LOOP|Operator IP banned/i);
assert.match(llms, /Plane B SLOT/);
assert.match(llms, /doi null/);
assert.ok(cite.designs.papers.some((p) => p.id === "AZRT-1.9-GAPS-CLOSE" && p.kind === "law"));
assert.equal(cite.identity, AUTHOR_NAME);
assert.equal(cite.mesh_get_never_enables, true);
assert.ok(cite.hubs);
assert.equal(cite.hubs.mesh_get_never_enables, true);
assert.ok(cite.hubs.hubs.some((h) => h.id === "azieleliab" && /azieleliab\.com\/software/.test(h.software_tab)));
assert.ok(cite.hubs.hubs.some((h) => h.id === "library" && /azielcorpuslibrary\.net\/software/.test(h.software_tab)));
assert.ok(cite.hubs.hubs.some((h) => h.id === "godlock.uk" && /godlock\.uk\/software/.test(h.software_tab)));
assert.ok(cite.stats);
assert.ok(cite.social_status);
assert.equal(cite.stats.person_id, AUTHOR_ID);
assert.equal(cite.social_status.person_id, AUTHOR_ID);
assert.equal(cite.stats.author, AUTHOR_NAME);
assert.equal(cite.stats.vanity, false);
assert.ok(cite.stats.hubs.some((h) => h.id === "azieleliab" && h.stats === "https://www.azieleliab.com/v1/stats"));
assert.ok(cite.stats.hubs.some((h) => h.id === "hedidntjump" && /\/api\/stats$/.test(h.stats)));
assert.equal(cite.entity_graph.person, AUTHOR_ID);
assert.equal(cite.entity_graph.person_jsonld, `${origin}/person.jsonld`);
assert.equal(cite.entity_graph.who_is, `${origin}/who-is`);
assert.equal(cite.entity_graph.runtime, RUNTIME_SOFTWARE_ID);
assert.equal(cite.entity_graph.execution_url, `${origin}/`);
assert.equal(cite.entity_graph.relatedLink, RUNTIME_GLAMA);
assert.equal(cite.entity_graph.primary_host, RUNTIME_GLAMA);
assert.deepEqual(cite.entity_graph.sameAs, runtimeSoftwareSameAs());
assert.equal(cite.entity_graph.named_tools.length, NAMED_RUNTIME_TOOLS.length);
assert.ok(cite.entity_graph.named_tools.every((t) => t["@id"] === `https://www.azieleliab.com/runtime#${t.slug}`));
assert.ok(cite.entity_graph.named_tools.some((t) => t.slug === "jeeves" && t.name === "Ask Jeeves"));
assert.ok(cite.entity_graph.named_tools.some((t) => t.slug === "fraggate" && t.name === "FragGate"));
assert.ok(!cite.entity_graph.named_tools.some((t) => PUBLIC_MCP_TOOLS.includes(t.slug) || PUBLIC_MCP_TOOLS.includes(t.name)));
assert.ok(cite.entity_graph.ecosystem.some((l) => l.label === "Official site" && l.url === "https://www.azieleliab.com/"));
assert.ok(cite.entity_graph.ecosystem.some((l) => l.label === "Aziel Corpus Library" && l.url === "https://www.azielcorpuslibrary.net/"));
assert.ok(cite.entity_graph.ecosystem.some((l) => l.label === "Aziel Runtime on GitHub" && l.url === RUNTIME_GITHUB));
assert.ok(cite.entity_graph.ecosystem.some((l) => l.label === "Try on Glama (primary host)" && l.url === RUNTIME_GLAMA));
assert.ok(cite.entity_graph.ecosystem.some((l) => l.label === "GodLock" && l.url === "https://godlock.uk/"));
assert.ok(cite.entity_graph.ecosystem.some((l) => l.label === HEDIDNTJUMP_NAME && l.url === HEDIDNTJUMP_HOME));
assert.equal(cite.hedidntjump, HEDIDNTJUMP_HOME);
assert.equal(cite.hedidntjump_name, HEDIDNTJUMP_NAME);
assert.equal(cite.hedidntjump_sitemap, HEDIDNTJUMP_SITEMAP);
assert.equal(cite.hedidntjump_cite, HEDIDNTJUMP_CITE);
assert.equal(cite.hedidntjump_software_tab, false);
assert.ok(cite.sister_archives);
assert.equal(cite.sister_archives.software_tab, false);
assert.equal(cite.sister_archives.fraggate_engine, false);
assert.ok(cite.sister_archives.archives.some((a) => a.id === "hedidntjump" && a.sitemap === HEDIDNTJUMP_SITEMAP && a.software_tab === false));
assert.ok(cite.sister_products);
assert.equal(cite.sister_products.software_tab, false);
assert.equal(cite.sister_products.fraggate_engine, false);
assert.equal(cite.sister_products.fraggate_call, false);
assert.equal(cite.sister_products.isolation_software, false);
assert.equal(cite.trades_runtime, "https://trades-runtime.vibelock.workers.dev/");
assert.equal(cite.trades_runtime_github, "https://github.com/AzielEliab/trades-runtime");
assert.equal(cite.trades_runtime_mcp, "https://trades-runtime.vibelock.workers.dev/mcp");
assert.equal(cite.trades_runtime_download, "https://trades-runtime.vibelock.workers.dev/download");
assert.equal(cite.trades_runtime_fraggate_call, false);
assert.equal(cite.trades_runtime_live_backends, false);
assert.ok(cite.sister_products.products.some((p) => p.slug === "trades-runtime" && p.engine === false && p.fraggate_call === false && p.live_backends === false));
assert.ok(!cite.products.some((p) => p.slug === "trades-runtime"), "trades-runtime is not a PRODUCTS true-engine");
assert.ok(cite.extras.some((e) => e.slug === "trades-runtime" && e.kind === "cite_only" && e.engine === false && e.fraggate_call === false));
assert.ok(!cite.hubs.hubs.some((h) => h.id === "hedidntjump"));
assert.equal(cite.azcoherence.slug, "azcoherence");
assert.equal(cite.azcoherence.identity, AUTHOR_NAME);
assert.match(cite.azcoherence.github, /AZCoherence/);
assert.ok(cite.products.some((p) => p.slug === "azcoherence" && /describe\?slug=azcoherence/.test(p.fraggate_describe)));
assert.ok(cite.person);
assert.equal(cite.person.person_id, AUTHOR_ID);
assert.equal(cite.person.chrome_15_20, false);
assert.equal(cite.person.machine_15_20, true);
assert.equal(cite.person.legal_name, false);
assert.equal(cite.person.home, false);
assert.equal(cite.person.growth_on, true);
assert.deepEqual(cite.person.roles, [
  "researcher",
  "digital rights activist",
  "software developer/designer",
  "author",
  "philosopher",
]);
assert.ok(cite.person.sites.some((s) => s.id === "azieleliab" && s.coverage.includes("Person hub")));
assert.ok(cite.person.sites.some((s) => s.id === "library" && s.coverage.includes("Digital Library MASTER")));
assert.ok(cite.person.sites.some((s) => s.id === "godlock.uk" && s.coverage.includes("challenge/score")));
assert.ok(cite.person.sites.some((s) => s.id === "hedidntjump" && s.coverage.includes("Zioncheck archive sister")));
assert.ok(cite.person.sites.some((s) => s.id === "aziel-runtime" && s.coverage.includes("2.0.0-rc1")));
assert.ok(cite.person.sameAs.includes("https://www.azieleliab.com/"));
assert.ok(cite.person.sameAs.includes("https://x.com/AzielEliab"));
assert.ok(cite.person.sameAs.includes("https://github.com/AzielEliab"));
assert.ok(cite.person.sameAs.includes("https://glama.ai/mcp/servers/AzielEliab/aziel-runtime"));
assert.equal(cite.person.socials.twitter_handle, "@AzielEliab");
assert.equal(cite.socials.twitter_handle, "@AzielEliab");
assert.equal(cite.twitter, "https://x.com/AzielEliab");
assert.equal(cite.twitter_handle, "@AzielEliab");
assert.equal(
  cite.person.why_aziel_eliab,
  "Aziel Eliab publishes receipt-first, local-first software and public MASTER records. @id https://www.azieleliab.com/#aziel",
);
assert.ok(cite.person.sameAs.includes(`${origin}/person.jsonld`));
assert.equal(cite.person.person_jsonld, `${origin}/person.jsonld`);
assert.equal(
  cite.person.what_aziel_eliab_does,
  "Aziel Eliab builds receipt-first, local-first software and public MASTER records — Softwares through Aziel Runtime (FragGate / MCP), the Aziel Digital Library, GodLock (product), and the He Didn’t Jump Zioncheck archive. Public identity is the published work. @id https://www.azieleliab.com/#aziel",
);
assert.deepEqual(cite.person.faq.titles, [
  "What does Aziel Eliab do?",
  "What Aziel Eliab does",
  "Who is Aziel Eliab the developer?",
  "What software does Aziel Eliab make?",
]);
assert.equal(cite.person.faq.answer, cite.person.what_aziel_eliab_does);
assert.ok(cite.person.knowsAbout.includes("The ARK"));
assert.ok(cite.person.knowsAbout.includes("Book of the Knowledge"));
assert.ok(cite.person.knowsAbout.includes("bone-conduction STL"));
assert.equal(cite.person.softwares.ark.name, "The ARK");
assert.equal(cite.person.softwares.ark.one_line, "Keep a local deniable vault; one phrase opens one vault.");
assert.equal(cite.person.softwares.ark.url, "https://ark-download-tracker.vibelock.workers.dev/");
assert.equal(cite.person.faq.softwares.ark.download_url, "https://ark-download-tracker.vibelock.workers.dev/download");
assert.ok(cite.person.softwares.items.some((s) => s.slug === "embryolock" && s.url.includes("embryolock-download-tracker")));
assert.match(cite.about_aziel.softwares.addendum, /The ARK — Keep a local deniable vault/);
assert.equal(cite.person.research.invent_doi, false);
assert.equal(cite.person.research.library_live_records, "~326");
assert.equal(cite.person.hardware_designs.storefront, false);
assert.match(cite.about_aziel.what_aziel_eliab_does, /Softwares through Aziel Runtime/);
assert.deepEqual(cite.about_aziel.faq.titles, cite.person.faq.titles);

const catalogRes = await get("/v1/catalog.json");
assert.equal(catalogRes.status, 200);
mime(catalogRes, /application\/json; charset=utf-8/);
const catalog = await catalogRes.json();
assert.equal(catalog.author, AUTHOR_NAME);
assert.equal(catalog.author_id, AUTHOR_ID);
assert.equal(catalog.aka, AUTHOR_ALTERNATE_NAME);
assert.equal(catalog.library_name, "Aziel Digital Library");
assert.equal(catalog.primary_host, RUNTIME_GLAMA);
assert.equal(catalog.homepage, RUNTIME_GLAMA);
assert.equal(catalog.library_mirror, "https://www.azielcorpuslibrary.net/runtime");
assert.equal(catalog.library_front_door, undefined);
assert.equal(catalog.hedidntjump, HEDIDNTJUMP_HOME);
assert.equal(catalog.hedidntjump_sitemap, HEDIDNTJUMP_SITEMAP);
assert.equal(catalog.hedidntjump_software_tab, false);
assert.equal(catalog.socials.twitter_handle, "@AzielEliab");
assert.equal(catalog.twitter, "https://x.com/AzielEliab");
assert.ok(catalog.socials.hubs.includes("https://godlock.uk/"));
assert.ok(catalog.sister_archives.archives.some((a) => a.id === "hedidntjump" && a.software_tab === false));
assert.ok(catalog.sister_products.products.some((p) => p.slug === "trades-runtime" && p.fraggate_call === false));
assert.equal(catalog.trades_runtime_software_tab, false);
assert.ok(!catalog.products.some((p) => p.slug === "trades-runtime"));
assert.ok(catalog.crawl.sitemap_index.endsWith("/sitemap-index.xml"));
assert.ok(catalog.crawl.software.endsWith("/v1/software"));
assert.ok(catalog.crawl.mcp.endsWith("/mcp"));
assert.equal(catalog.crawl.person_jsonld, `${origin}/person.jsonld`);
assert.equal(catalog.crawl.who_is, `${origin}/who-is`);
assert.equal(catalog.crawl.who_is_txt, `${origin}/who-is-aziel-eliab.txt`);
assert.equal(catalog.stats.person_id, AUTHOR_ID);
assert.equal(catalog.social_status.identity, AUTHOR_NAME);
assert.ok(catalog.stats.rollup.endsWith("/v1/stats-rollups"));
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
assert.ok(catalog.extras.some((e) => e.slug === "mesh" && e.kind === "kernel" && e.enabled_default === true));
assert.ok(catalog.extras.some((e) => e.slug === "trades-runtime" && e.kind === "cite_only" && e.engine === false && e.fraggate_call === false && e.software_tab === false));
assert.match(catalog.extras_note, /cite-only sister products/);
assert.equal(catalog.fraggate.worker, "fraggate-download-tracker");
assert.equal(catalog.fraggate.engine, false);
assert.equal(catalog.fraggate.worker_home, "https://fraggate-download-tracker.vibelock.workers.dev/");
assert.equal(catalog.fraggate.download, "https://fraggate-download-tracker.vibelock.workers.dev/download");
assert.ok(!catalog.products.some((p) => p.worker === "fraggate-download-tracker"));
assert.match(catalog.extras_note, /fraggate-download-tracker/);
assert.match(catalog.extras_note, /FragGate is THE single public executable door/);

const homeRes = await get("/");
assert.equal(homeRes.status, 200);
mime(homeRes, /text\/html; charset=utf-8/);
const home = await homeRes.text();
assert.doesNotMatch(home, /trades-runtime\.vibelock/, "homepage chrome stays machine-cite only for Trades-Runtime");
assert.match(home, /application\/ld\+json/);
assert.match(home, /"@type":"Person"/);
assert.match(home, /"name":"Aziel Eliab"/);
assert.match(home, /Aziel Elroi Eliab/);
assert.doesNotMatch(home, /github\.com\/AzielEliab#person/);
assert.match(home, /rel="canonical" href="https:\/\/aziel-runtime\.example\/"/);
assert.doesNotMatch(home, /rel="canonical" href="https:\/\/www\.azieleliab\.com/);
{
  const ldMatch = home.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
  assert.ok(ldMatch, "homepage JSON-LD");
  const graph = JSON.parse(ldMatch[1])["@graph"] || [];
  const person = graph.find((n) => n["@type"] === "Person");
  assert.equal(person["@id"], AUTHOR_ID);
  assert.equal(person.name, AUTHOR_NAME);
  assert.deepEqual(person.alternateName, [AUTHOR_ALTERNATE_NAME]);
  assert.equal(person.url, "https://www.azieleliab.com/");
  assert.equal(person.relatedLink, RUNTIME_GLAMA);
  assert.ok(person.jobTitle.includes("researcher"));
  assert.ok(person.jobTitle.includes("digital rights activist"));
  assert.ok(person.sameAs.includes("https://github.com/AzielEliab"));
  assert.ok(person.sameAs.includes("https://glama.ai/mcp/servers/AzielEliab/aziel-runtime"));
  assert.ok(person.sameAs.includes("https://x.com/AzielEliab"));
  assert.ok(person.sameAs.includes("https://www.azieleliab.com/"));
  assert.doesNotMatch(JSON.stringify(person), /1 Chronicles|15:20/);
  assert.ok(!String(person.url).includes("workers.dev"));
  assert.ok(!String(person["@id"]).includes("github.com"));
  const runtimeApp = graph.find((n) => n["@type"] === "SoftwareApplication" && n["@id"] === RUNTIME_SOFTWARE_ID);
  assert.ok(runtimeApp, "runtime SoftwareApplication hub @id");
  assert.equal(runtimeApp.name, PRODUCT_NAME);
  assert.equal(runtimeApp.url, `${origin}/`);
  assert.equal(runtimeApp.relatedLink, RUNTIME_GLAMA);
  assert.equal(runtimeApp.author["@id"], AUTHOR_ID);
  assert.deepEqual(runtimeApp.sameAs, [RUNTIME_GITHUB, RUNTIME_GLAMA]);
  assert.ok(!runtimeApp.sameAs.includes(AUTHOR_GITHUB));
  assert.ok(!runtimeApp.sameAs.includes("https://www.azieleliab.com/"));
  assert.ok(!graph.some((n) => n["@id"] === `${origin}/#runtime`));
  const hasPartIds = (runtimeApp.hasPart || []).map((p) => p["@id"]);
  assert.deepEqual(
    hasPartIds,
    NAMED_RUNTIME_TOOLS.map((t) => `https://www.azieleliab.com/runtime#${t.slug}`),
  );
  for (const tool of NAMED_RUNTIME_TOOLS) {
    const child = graph.find((n) => n["@id"] === `https://www.azieleliab.com/runtime#${tool.slug}`);
    assert.ok(child, `named tool ${tool.slug}`);
    assert.equal(child["@type"], "SoftwareApplication");
    assert.equal(child.name, tool.name);
    assert.equal(child.author["@id"], AUTHOR_ID);
    assert.equal(child.isPartOf["@id"], RUNTIME_SOFTWARE_ID);
  }
  const appNames = [];
  const walk = (node) => {
    if (!node || typeof node !== "object") return;
    if (Array.isArray(node)) {
      node.forEach(walk);
      return;
    }
    if (node["@type"] === "SoftwareApplication" && node.name) appNames.push(node.name);
    for (const value of Object.values(node)) walk(value);
  };
  walk(graph);
  for (const mcpName of PUBLIC_MCP_TOOLS) {
    assert.ok(!appNames.includes(mcpName), `MCP op ${mcpName} must not be a SoftwareApplication`);
    assert.ok(!graph.some((n) => n && n["@id"] && String(n["@id"]).endsWith(`#${mcpName}`)), `MCP op ${mcpName} must not have a schema @id`);
  }
  const eco = graph.find((n) => n["@id"] === `${origin}/#ecosystem`);
  assert.equal(eco.name, ECOSYSTEM_HEADING);
}
assert.equal(personJsonLd()["@id"], AUTHOR_ID);
assert.match(home, /class="ecosystem"/);
assert.match(home, new RegExp(ECOSYSTEM_HEADING.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
assert.match(home, /href="https:\/\/www\.azieleliab\.com\/">Official site<\/a>/);
assert.match(home, /href="https:\/\/www\.azielcorpuslibrary\.net\/">Aziel Corpus Library<\/a>/);
assert.match(home, /href="https:\/\/github\.com\/AzielEliab\/aziel-runtime">Aziel Runtime on GitHub<\/a>/);
assert.match(home, /href="https:\/\/glama\.ai\/mcp\/servers\/AzielEliab\/aziel-runtime">Try on Glama<\/a>/);
assert.match(home, /href="https:\/\/godlock\.uk\/">GodLock<\/a>/);
assert.match(home, /href="https:\/\/www\.hedidntjump\.com\/">He Didn't Jump<\/a>/);
{
  const ecoAt = home.indexOf(ECOSYSTEM_HEADING);
  const namedAt = home.indexOf(NAMED_COMPONENTS_LINE);
  const softwaresAt = home.indexOf("<h2>Softwares</h2>");
  assert.ok(ecoAt >= 0 && softwaresAt > ecoAt, "ecosystem chrome precedes Softwares catalog");
  assert.ok(namedAt >= 0 && namedAt < softwaresAt, "named components line precedes Softwares catalog");
}
assert.match(home, /Includes named components such as FragGate/);
assertRoseStarBrand(home, "homepage");
assert.match(home, /property="og:image" content="https:\/\/aziel-runtime\.example\/sigil\.png"/);
assert.match(home, /name="twitter:image" content="https:\/\/aziel-runtime\.example\/sigil\.png"/);
assert.match(home, /property="og:site_name" content="Aziel Eliab"/);
assert.match(home, /href="https:\/\/foldlock-download-tracker\.vibelock\.workers\.dev\/cite\.json"/);
assert.match(home, /href="https:\/\/foldlock-download-tracker\.vibelock\.workers\.dev\/llms\.txt"/);
assert.match(home, /href="https:\/\/foldlock-download-tracker\.vibelock\.workers\.dev\/download"/);
assert.match(home, /sitemap-index\.xml/);
assert.doesNotMatch(home, /Yahweh|Messiah|Jesus Christ/);
assert.doesNotMatch(firstVisibleText(home, 4000), /1 Chronicles|15:20/);
assert.match(home, /rel="alternate" type="application\/ld\+json" href="https:\/\/aziel-runtime\.example\/person\.jsonld"/);
assert.match(home, /rel="alternate" type="text\/plain" href="https:\/\/aziel-runtime\.example\/who-is"/);
assert.match(home, /Compatible AI clients/);
assert.match(home, /Claude \(Anthropic Desktop \/ custom tools\)/);
assert.match(home, /Cursor \(MCP\)/);
assert.match(home, /Glama \(Install Server \/ MCP\)/);
assert.match(
  home,
  /<a href="https:\/\/glama\.ai\/mcp\/servers\/AzielEliab\/aziel-runtime">Try on Glama<\/a>/,
);
assert.match(
  home,
  /<a href="https:\/\/glama\.ai\/mcp\/servers\/AzielEliab\/aziel-runtime" class="cta">Try on Glama<\/a>/,
);
{
  const doorsAt = home.indexOf('<p class="doors">');
  const workerSelfAt = home.indexOf(`<p class="links">`);
  assert.ok(doorsAt >= 0, "homepage has distribution doors");
  assert.match(home.slice(doorsAt, doorsAt + 400), /class="cta">Try on Glama<\/a>/);
  assert.ok(workerSelfAt > doorsAt, "Try on Glama CTA precedes Worker origin self-links");
}
assert.doesNotMatch(home, /glama\.ai\/mcp\/servers\/[0-9a-f]{8}-[0-9a-f-]{27}/i);
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
assert.match(card, /www\.azieleliab\.com\/#aziel/);
assert.doesNotMatch(card, /github\.com\/AzielEliab#person/);
assert.match(card, /class="ecosystem"/);
assert.match(card, /og:image/);
assertRoseStarBrand(card, "product card");
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
assert.match(softwareHtml, /www\.azieleliab\.com\/#aziel/);
assert.doesNotMatch(softwareHtml, /github\.com\/AzielEliab#person/);
assert.match(softwareHtml, /class="ecosystem"/);
assert.match(softwareHtml, new RegExp(ECOSYSTEM_HEADING.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
assert.match(softwareHtml, /href="https:\/\/www\.hedidntjump\.com\/">He Didn't Jump<\/a>/);
assert.match(softwareHtml, /www\.azieleliab\.com\/runtime#runtime/);
assert.match(softwareHtml, /Includes named components such as FragGate/);
{
  const ecoAt = softwareHtml.indexOf('class="ecosystem"');
  const catalogAt = softwareHtml.indexOf("<h2>Catalog</h2>");
  assert.ok(ecoAt >= 0 && catalogAt > ecoAt, "ecosystem chrome precedes Softwares catalog list");
}
assert.match(softwareHtml, /data-slug="azcoherence"/);
assert.match(softwareHtml, /<h2>Mesh-resident website designs<\/h2>/);
assert.match(softwareHtml, /<strong>azcorpus<\/strong> \+ <strong>azlibrary<\/strong>/);
assert.match(softwareHtml, /API token only/);
assert.match(softwareHtml, /www\.azieleliab\.com\/software/);
assert.match(softwareHtml, /godlock\.uk\/software/);
assert.match(softwareHtml, /GET \/v1\/mesh never enables/);
assert.match(
  softwareHtml,
  /<a href="https:\/\/glama\.ai\/mcp\/servers\/AzielEliab\/aziel-runtime" class="cta">Try on Glama<\/a>/,
);
{
  const doorsAt = softwareHtml.indexOf('<p class="doors">');
  const machineAt = softwareHtml.indexOf('class="secondary">Author');
  assert.ok(doorsAt >= 0, "Softwares HTML has distribution doors");
  assert.match(softwareHtml.slice(doorsAt, doorsAt + 400), /class="cta">Try on Glama<\/a>/);
  assert.ok(machineAt > doorsAt, "Try on Glama CTA precedes Worker origin Softwares self-link");
}
assert.doesNotMatch(softwareHtml, /Yahweh|Messiah|Jesus Christ/);
assertRoseStarBrand(softwareHtml, "Softwares HTML");

const softwareJsonStill = await get("/v1/software");
assert.match(softwareJsonStill.headers.get("content-type") || "", /application\/json/);
const softwareJsonBody = await softwareJsonStill.json();
assert.equal(softwareJsonBody.identity, AUTHOR_NAME);
assert.equal(softwareJsonBody.author_id, AUTHOR_ID);
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
assert.match(describeHtml, /<title>AZCoherence — FragGate describe — Aziel Runtime<\/title>/);
assert.match(describeHtml, /application\/ld\+json/);
assert.match(describeHtml, /"@type":"Person"/);
assert.match(describeHtml, /www\.azieleliab\.com\/#aziel/);
assert.doesNotMatch(describeHtml, /github\.com\/AzielEliab#person/);
assert.match(describeHtml, /class="ecosystem"/);
assert.match(describeHtml, /www\.azieleliab\.com\/software/);
assert.match(describeHtml, /GET \/v1\/mesh never enables/);
assertRoseStarBrand(describeHtml, "describe HTML");

const describeIndexRes = await handler(
  new Request(origin + "/v1/fraggate/describe", { headers: { accept: "text/html" } }),
  {},
);
assert.equal(describeIndexRes.status, 200);
const describeIndex = await describeIndexRes.text();
assert.match(describeIndex, new RegExp(`<title>${DESCRIBE_INDEX_TITLE.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}</title>`));
assert.match(describeIndex, /data-slug="azcoherence"/);
assertRoseStarBrand(describeIndex, "describe index HTML");

const describeJsonStill = await get("/v1/fraggate/describe?slug=azcoherence");
assert.match(describeJsonStill.headers.get("content-type") || "", /application\/json/);
const described = await describeJsonStill.json();
assert.equal(described.ok, true);
assert.equal(described.slug, "azcoherence");

assert.ok(MISSING_PRODUCT_SITEMAP_SLUGS.includes("vibelock"));
assert.equal(productWorkerOrigin({ slug: "aziel-corpus" }), "https://www.azielcorpuslibrary.net");
assert.equal(productCrawlUrls({ slug: "vibelock", worker: "vibelock-download-tracker" }).has_sitemap, false);

const openapi = await (await get("/openapi.json")).json();
assert.ok(openapi.paths["/person.jsonld"]);
assert.ok(openapi.paths["/who-is"]);
assert.ok(openapi.paths["/who-is-aziel-eliab.txt"]);
assert.ok(openapi.paths["/sitemap-index.xml"]);
assert.match(openapi.paths["/sitemap-index.xml"].get.summary, /He Didn't Jump sister archive/);
assert.ok(openapi.paths["/robots.txt"]);
assert.match(openapi.info.description, /Claude \(Anthropic Desktop \/ custom tools\)/);
assert.match(openapi.info.description, /plus other MCP\/OpenAPI-capable assistants/);
assert.match(openapi.info.description, /docs\/designs/);
assert.equal(openapi.info.externalDocs.url, "https://github.com/AzielEliab/aziel-runtime/tree/main/docs/designs");
assert.equal(openapi.info.contact.name, "Aziel Eliab");
assert.equal(openapi.info.contact.url, "https://www.azieleliab.com/");
assert.equal(openapi.info["x-socials"].twitter_handle, "@AzielEliab");
assert.ok(openapi.info["x-sameAs"].includes("https://x.com/AzielEliab"));
assert.ok(openapi.info["x-sameAs"].includes("https://github.com/AzielEliab"));
assert.ok(openapi.info["x-sameAs"].includes("https://glama.ai/mcp/servers/AzielEliab/aziel-runtime"));
assert.match(openapi.paths["/cite.json"].get.summary, /@AzielEliab/);
assert.match(openapi.paths["/person.jsonld"].get.summary, /What Aziel Eliab does \/ why/);
assert.match(openapi.paths["/who-is"].get.summary, /hubs \+ GitHub \+ Glama/);
assert.doesNotMatch(openapi.info.description, /Import this file in ChatGPT GPT Actions, Grok custom tools, or Venice HTTP tools/);
assert.match(openapi.components.securitySchemes.RuntimeToken.description, /Claude, Cursor, Glama/);

function firstVisibleText(html, n = 500) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, n);
}

const homeLead = firstVisibleText(home, 500);
assert.match(homeLead, /node-meshed orchestration suite of MCP-connected software/);
assert.doesNotMatch(homeLead, /not merely an API orchestrator|not an API aggregator|What this is not/i);
assert.doesNotMatch(homeLead, CRAWLER_LEAD_VERSION_RE);
assert.match(home, new RegExp(`<title>${RUNTIME_PAGE_TITLE.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}</title>`));
assert.match(home, new RegExp(`<meta name="description" content="${RUNTIME_ABSTRACT.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"`));
assert.match(home, /<h2>Softwares<\/h2>\s*[\s\S]*?class="card"/);
assert.match(home, /id="version-history"/);
assert.ok(home.indexOf(RUNTIME_ABSTRACT) < home.indexOf("id=\"version-history\""));
assert.match(home, /"@type":"WebAPI"/);
assert.match(home, /"name":"FragGate"/);

const llmsHead = llms.split("\n").slice(0, 30).join("\n");
assert.match(llmsHead, /## What this is/);
assert.match(llmsHead, /## How to use/);
assert.match(llmsHead, /node-meshed orchestration suite of MCP-connected software/);
assert.doesNotMatch(llmsHead, /not merely an API orchestrator|What this is not/i);
assert.doesNotMatch(llmsHead, CRAWLER_LEAD_VERSION_RE);
assert.match(llms, /## Version history/);
assert.ok(llms.indexOf("## What this is") < llms.indexOf("## Version history"));
assert.ok(llms.indexOf("## What this is") < llms.indexOf("## Cap-7 semantic bridge"));
assert.match(llms, /resolves_to_hub: false/);
assert.equal(llms.includes(RUNTIME_ABSTRACT), true);

assert.equal(cite.one_line, RUNTIME_ONE_LINE);
assert.equal(cite.abstract, RUNTIME_ABSTRACT);
assert.equal(cite.product, PRODUCT_NAME);
assert.equal(cite.about.what, RUNTIME_ABSTRACT);
assert.equal(cite.about.author, AUTHOR_NAME);
assert.equal(cite.about.not, undefined);
assert.doesNotMatch(JSON.stringify(cite.about), /What this is not|Not merely an API/);
assert.match(cite.about.architecture.fraggate, /single public executable door/);
assert.match(cite.about.architecture.nodemesh, /GET \/v1\/mesh never enables/);
assert.match(cite.about.architecture.semantic_bridge, /resolves_to_hub false/);
assert.match(cite.about.architecture.semantic_bridge, /design_of hub_designs/);
assert.match(cite.about.architecture.semantic_bridge, /designs only/);

assert.match(sitemap, /\/about</);
assert.match(sitemap, /\/v1\/about</);

const aboutRes = await get("/about");
assert.equal(aboutRes.status, 200);
mime(aboutRes, /text\/html; charset=utf-8/);
const aboutHtml = await aboutRes.text();
assert.match(aboutHtml, new RegExp(`<title>${ABOUT_PAGE_TITLE.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}</title>`));
assert.match(aboutHtml, /node-meshed orchestration suite of MCP-connected software/);
assert.doesNotMatch(aboutHtml, /not merely an API orchestrator|What it is not/i);
assert.match(aboutHtml, /www\.azieleliab\.com\/#aziel/);
assert.doesNotMatch(aboutHtml, /github\.com\/AzielEliab#person/);
assert.match(aboutHtml, /class="ecosystem"/);
assert.match(aboutHtml, /href="https:\/\/www\.azieleliab\.com\/">Official site<\/a>/);
assert.match(aboutHtml, /www\.azieleliab\.com\/runtime#runtime/);
assert.match(aboutHtml, /Includes named components such as FragGate/);
assert.doesNotMatch(firstVisibleText(aboutHtml, 500), CRAWLER_LEAD_VERSION_RE);
assert.equal(cite.about.changelog_below_abstract, true);
assert.match(aboutHtml, /How agents call it/);
assert.match(aboutHtml, /How hubs use it/);
assert.doesNotMatch(aboutHtml, /What it is not/);
assert.match(
  aboutHtml,
  /<a href="https:\/\/glama\.ai\/mcp\/servers\/AzielEliab\/aziel-runtime" class="cta">Try on Glama<\/a>/,
);
{
  const doorsAt = aboutHtml.indexOf('<p class="doors">');
  const machineAt = aboutHtml.indexOf('class="secondary">Author');
  assert.ok(doorsAt >= 0, "About HTML has distribution doors");
  assert.match(aboutHtml.slice(doorsAt, doorsAt + 400), /class="cta">Try on Glama<\/a>/);
  assert.ok(machineAt > doorsAt, "Try on Glama CTA precedes Worker origin cite self-link");
}
assertRoseStarBrand(aboutHtml, "about HTML");
assert.doesNotMatch(firstVisibleText(aboutHtml, 4000), /1 Chronicles|15:20/);
assert.equal(await (await get("/v1/about")).text(), aboutHtml);

const readme = await (await import("node:fs/promises")).readFile(
  new URL("../README.md", import.meta.url),
  "utf8",
);
assert.match(readme, /node-meshed orchestration suite of MCP-connected software/);
assert.doesNotMatch(readme.slice(0, 1200), /not merely an API orchestrator|not an API aggregator/);
assert.match(readme, /\[Try on Glama\]\(https:\/\/glama\.ai\/mcp\/servers\/AzielEliab\/aziel-runtime\)/);
assert.match(readme, /www\.azieleliab\.com\/#aziel/);
assert.match(readme, /www\.azieleliab\.com\/runtime#runtime/);
assert.match(readme, /www\.azieleliab\.com\//);
assert.match(readme, /azielcorpuslibrary\.net/);
assert.match(readme, /godlock\.uk/);
assert.match(readme, /github\.com\/AzielEliab\/fraggate/);
assert.match(readme, /docs\/GITHUB\.md/);
assert.match(readme, /ChatGPT \(GPT Actions \/ OpenAI\)/);
assert.match(readme, /plus other MCP\/OpenAPI-capable assistants/);
assert.match(readme, /Cloudflare-AI-Search/);
assert.ok(
  readme.indexOf("Primary host / discovery / install") < readme.indexOf("Runtime Worker / MCP / OpenAPI"),
  "Glama primary host precedes Worker origin in README websites table",
);
assert.match(readme, /Library mirror \(reverse-proxy\)/);
assert.doesNotMatch(readme, /Library Runtime front door|Library front door:/);

const githubLock = await (await import("node:fs/promises")).readFile(
  new URL("../docs/GITHUB.md", import.meta.url),
  "utf8",
);
assert.match(githubLock, /MCP Softwares suite: FragGate door/);
assert.match(githubLock, /receipts, and mesh coordination/);
assert.doesNotMatch(githubLock, /not an API aggregator/);
assert.match(githubLock, /glama\.ai\/mcp\/servers\/AzielEliab\/aziel-runtime/);
assert.match(githubLock, /x\.com\/AzielEliab/);
assert.match(githubLock, /@AzielEliab/);
assert.match(githubLock, /--homepage "https:\/\/aziel-runtime\.vibelock\.workers\.dev\/mcp"/);
assert.doesNotMatch(githubLock, /--homepage "https:\/\/glama\.ai/);
assert.match(githubLock, /www\.azieleliab\.com\/#aziel/);
assert.match(githubLock, /www\.azieleliab\.com\/runtime#runtime/);
assert.match(githubLock, /--add-topic openapi/);
assert.match(githubLock, /--add-topic fraggate/);
assert.match(githubLock, /digital-forensics/);

const citeDoc = await (await import("node:fs/promises")).readFile(
  new URL("../docs/CITE.md", import.meta.url),
  "utf8",
);
assert.match(citeDoc, /node-meshed orchestration suite of MCP-connected software/);
assert.doesNotMatch(citeDoc, /not merely an API orchestrator/);
assert.match(citeDoc, /2\.0\.0-rc1/);
assert.match(citeDoc, /www\.azieleliab\.com\/#aziel/);
assert.match(citeDoc, /www\.azieleliab\.com\/runtime#runtime/);
assert.match(citeDoc, /github\.com\/AzielEliab\/fraggate/);
assert.match(citeDoc, /plus other MCP\/OpenAPI-capable assistants/);
assert.match(citeDoc, /resolves_to_hub: false/);
assert.match(citeDoc, /design_of: hub_designs/);
assert.match(citeDoc, /inherit hub \*\*designs\*\* only/);
assert.match(citeDoc, /azcorpus/);
assert.match(citeDoc, /azlibrary/);
assert.doesNotMatch(citeDoc, /CNS-ZENODO-IP-BAN|CNS-GITFLIC-EMAIL|CNS-GITLAB-CF-LOOP|Operator IP banned/i);
assert.doesNotMatch(readme, /CNS-ZENODO-IP-BAN|CNS-GITFLIC-EMAIL|CNS-GITLAB-CF-LOOP|Operator IP banned/i);
assert.equal(cite.about_aziel.not, undefined);
assert.doesNotMatch(llms, /About Aziel \(work, not biography\)|Not zip\. Not hosted_store/);
assert.doesNotMatch(llms, /^Banner:/m);
assert.doesNotMatch(llms, /Not AKM-TRIAD|What this is not|not a lawyer|Not legal advice|GodLock is not a VPN|is not a gap|does not count as missing/i);
assert.doesNotMatch(JSON.stringify(cite.azcoherence.note || ""), /Not AKM-TRIAD|not a 34th/i);
assert.match(cite.azcoherence.note, /Second-pass triad coherence/);
assert.doesNotMatch(cite.audits.remain_off_by_design.one_line, /is not a gap|does not count as missing/i);
assert.match(cite.audits.remain_off_by_design.one_line, /stays recorded as OFF/);
assert.doesNotMatch(aboutHtml, /<h3>Not this<\/h3>/);
assert.doesNotMatch(home, /user blocked/i);
assert.equal(cite.zenodo.audit.tombstone_note, "HTTP 410 tombstone");

const HELP_PATHS = ["/help.txt", "/addendum.txt", "/help/softwares.txt", "/help/fraggate.txt", "/help/glama.txt"];
for (const path of HELP_PATHS) {
  await assertSeoMime(path, /^text\/plain; charset=utf-8$/);
  assert.match(sitemap, new RegExp(`${path.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}<`));
  assert.ok(openapi.paths[path], `OpenAPI lists ${path}`);
}
const helpTxt = await (await get("/help.txt")).text();
assert.match(helpTxt, /FragGate is THE single public door/);
assert.match(helpTxt, /GET https:\/\/aziel-runtime\.example\/v1\/software/);
assert.match(helpTxt, /Try on Glama/);
assert.match(helpTxt, /Dual surface/);
assert.doesNotMatch(helpTxt, /not a lawyer|What this is not|CNS-ZENODO-IP-BAN|THIS IS NOT:/i);
const helpSoftwares = await (await get("/help/softwares.txt")).text();
assert.match(helpSoftwares, /Whitestone/);
assert.match(helpSoftwares, /whitestone\.vibelock\.workers\.dev/);
assert.doesNotMatch(helpSoftwares, /not a lawyer|not legal advice|not a spectrometer/i);
const helpFg = await (await get("/help/fraggate.txt")).text();
assert.match(helpFg, /list → describe → call/);
const helpGlama = await (await get("/help/glama.txt")).text();
assert.match(helpGlama, /glama\.ai\/mcp\/servers\/AzielEliab\/aziel-runtime/);
assert.match(home, /rel="alternate" type="text\/plain" href="https:\/\/aziel-runtime\.example\/help\.txt"/);

console.log("ok seo hub: robots, sitemap-index, llms/cite MIME, Person JSON-LD, catalog crawl links, HTML shells, definition-first abstract, GitHub About lock, help.txt addenda");
