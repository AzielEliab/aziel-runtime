/**
 * SEO / AI-crawl hub: MIME, robots Allow, sitemap-index, Person JSON-LD, cite aka.
 */
import assert from "node:assert/strict";
import { PRODUCTS } from "../src/index.js";
import {
  AUTHOR_ALTERNATE_NAME,
  AUTHOR_NAME,
  GODLOCK_UK_SITEMAP,
  LIBRARY_SITEMAP,
  MISSING_PRODUCT_SITEMAP_SLUGS,
  hubSitemapList,
  productCrawlUrls,
  productWorkerOrigin,
} from "../src/seo.js";

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
assert.match(robots, /User-agent: \*/);
assert.match(robots, /Allow: \//);
assert.match(robots, /User-agent: GPTBot\nAllow: \//);
assert.doesNotMatch(robots, /User-agent: GPTBot\nDisallow:/);
assert.doesNotMatch(robots, /Disallow: \//);
assert.match(robots, /Content-Signal: search=yes, ai-input=yes, ai-train=yes/);
assert.match(robots, /OAI-SearchBot/);
assert.match(robots, /Cloudflare-AI-Search/);
assert.match(robots, /sitemap-index\.xml/);
assert.match(robots, /azielcorpuslibrary\.net\/sitemap\.xml/);
assert.match(robots, /godlock\.uk\/sitemap\.xml/);
assert.doesNotMatch(robots, /vibelock-download-tracker\.vibelock\.workers\.dev\/sitemap\.xml/);

const siteRes = await get("/sitemap.xml");
assert.equal(siteRes.status, 200);
mime(siteRes, /application\/xml; charset=utf-8/);
const sitemap = await siteRes.text();
assert.match(sitemap, /<urlset /);
assert.match(sitemap, /\/v1\/catalog\.json/);
assert.match(sitemap, /\/cite\.json/);
assert.match(sitemap, /\/llms\.txt/);
assert.match(sitemap, /\/sitemap-index\.xml/);

const indexRes = await get("/sitemap-index.xml");
assert.equal(indexRes.status, 200);
mime(indexRes, /application\/xml; charset=utf-8/);
const indexXml = await indexRes.text();
assert.match(indexXml, /<sitemapindex /);
assert.match(indexXml, /aziel-runtime\.example\/sitemap\.xml/);
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
assert.match(cite.library_how_to_cite, /Aziel Digital Library/);
assert.equal(cite.library, "https://www.azielcorpuslibrary.net/");
assert.ok(cite.products.length === PRODUCTS.length);

const catalogRes = await get("/v1/catalog.json");
assert.equal(catalogRes.status, 200);
mime(catalogRes, /application\/json; charset=utf-8/);
const catalog = await catalogRes.json();
assert.equal(catalog.author, AUTHOR_NAME);
assert.equal(catalog.aka, AUTHOR_ALTERNATE_NAME);
assert.equal(catalog.library_name, "Aziel Digital Library");
assert.ok(catalog.crawl.sitemap_index.endsWith("/sitemap-index.xml"));
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

const card = await (await get("/p/foldlock")).text();
assert.match(card, /"@type":"Person"/);
assert.match(card, /Aziel Elroi Eliab/);
assert.match(card, /og:image/);

assert.ok(MISSING_PRODUCT_SITEMAP_SLUGS.includes("vibelock"));
assert.equal(productWorkerOrigin({ slug: "aziel-corpus" }), "https://www.azielcorpuslibrary.net");
assert.equal(productCrawlUrls({ slug: "vibelock", worker: "vibelock-download-tracker" }).has_sitemap, false);

const openapi = await (await get("/openapi.json")).json();
assert.ok(openapi.paths["/sitemap-index.xml"]);
assert.ok(openapi.paths["/robots.txt"]);

console.log("ok seo hub: robots, sitemap-index, llms/cite MIME, Person JSON-LD, catalog crawl links");
