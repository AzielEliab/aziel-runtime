/**
 * Public RSS feed. Dates come from the GitHub release, the Softwares catalog,
 * and RIB source lines. A date that is not recorded is not published.
 * Author: Aziel Eliab. Identity is Aziel Eliab only.
 */
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { shouldIncrementUse } from "../src/uses.js";
import {
  RELEASE_PUBLISHED_AT,
  RIB_RECORDS,
  SITE_RSS_ALIAS,
  SITE_RSS_ORIGIN,
  SITE_RSS_PATH,
  calendarDay,
  rfc822Utc,
  siteRssItems,
  siteRssStaticLastmod,
  siteRssXml,
} from "../src/site-rss.js";

const handler = (await import("../src/index.js")).default.fetch;
const origin = "https://aziel-runtime.example";

function get(path, env = {}, headers) {
  return handler(new Request(origin + path, { headers }), env);
}

function itemsFrom(xml) {
  const out = [];
  for (const match of xml.matchAll(/<item>([\s\S]*?)<\/item>/g)) {
    const block = match[1];
    const grab = (tag) => {
      const found = block.match(new RegExp(`<${tag}(?: [^>]*)?>([\\s\\S]*?)</${tag}>`));
      return found ? found[1] : null;
    };
    out.push({
      title: grab("title"),
      link: grab("link"),
      guid: grab("guid"),
      pubDate: grab("pubDate"),
      category: grab("category"),
      description: grab("description"),
    });
  }
  return out;
}

assert.equal(RELEASE_PUBLISHED_AT, "2026-09-11T01:23:57Z");
assert.equal(calendarDay(RELEASE_PUBLISHED_AT.slice(0, 10)), "2026-09-11");
assert.equal(rfc822Utc(RELEASE_PUBLISHED_AT), "Fri, 11 Sep 2026 01:23:57 GMT");
// Actions checks out the PR commit without tags. Compare the tag day only when it is present.
let tagIso = "";
try {
  tagIso = execFileSync("git", ["log", "-1", "--format=%cI", "v2.0.0-rc1"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  }).trim();
} catch {
  tagIso = "";
}
if (tagIso) {
  assert.equal(new Date(tagIso).toISOString().slice(0, 10), calendarDay(RELEASE_PUBLISHED_AT.slice(0, 10)));
}

for (const row of RIB_RECORDS) {
  const line = readFileSync(new URL("../" + row.source, import.meta.url), "utf8").split(/\n/)[row.line - 1];
  assert.ok(line.includes(row.date), `${row.source}:${row.line} records ${row.date}`);
  for (const id of row.ribs) assert.ok(line.includes(id), `${row.source}:${row.line} names ${id}`);
  if (row.date_role === "reinforced date") assert.match(line, /reinforced 2026-10-08/);
  if (row.date_role === "follow-up review date") assert.match(line, /follow-up \(AZBot review, 2026-10-19\)/);
  assert.equal(calendarDay(row.date), row.date);
}

assert.equal(siteRssStaticLastmod(), "2026-10-30");
assert.equal(calendarDay("2026-13-40"), null);
assert.equal(calendarDay("not-a-date"), null);
assert.equal(calendarDay(""), null);

const dropped = siteRssItems({ origin, updatedAt: "not-a-date", softwareCount: 42 });
assert.equal(dropped.some((item) => item.kind === "software"), false);
assert.equal(dropped.filter((item) => item.kind === "release").length, 1);
assert.equal(dropped.filter((item) => item.kind === "rib").length, RIB_RECORDS.length);

const impossible = siteRssItems({ origin, updatedAt: "2026-13-40", softwareCount: 42 });
assert.equal(impossible.some((item) => item.kind === "software"), false);

const blank = siteRssItems({ origin, updatedAt: null, softwareCount: null });
assert.equal(blank.some((item) => item.kind === "software"), false);

const catalog = siteRssItems({ origin, updatedAt: "2026-11-02", softwareCount: 42 });
assert.equal(catalog[0].kind, "software");
assert.equal(catalog[0].iso, "2026-11-02T00:00:00Z");
assert.match(catalog[0].description, /42 Softwares/);
assert.match(catalog[0].description, /not a separate release date/);
assert.equal(catalog.at(-1).kind, "release");
assert.equal(catalog.at(-1).iso, RELEASE_PUBLISHED_AT);
assert.equal(catalog.at(-1).clock, undefined);

const rssRes = await get(SITE_RSS_PATH);
assert.equal(rssRes.status, 200);
assert.match(rssRes.headers.get("content-type") || "", /^application\/rss\+xml; charset=utf-8$/);
const rss = await rssRes.text();
assert.match(rss, /^<\?xml version="1\.0" encoding="UTF-8"\?>/);
assert.match(rss, /<rss version="2\.0"/);
assert.match(rss, /<title>Aziel Runtime<\/title>/);
assert.match(rss, new RegExp(`<link>${SITE_RSS_ORIGIN}/</link>`));
assert.match(rss, new RegExp(`<atom:link href="${SITE_RSS_ORIGIN}${SITE_RSS_PATH}" rel="self" type="application/rss\\+xml"/>`));
assert.doesNotMatch(rss, /aziel-runtime\.example/);

const forced = siteRssXml("https://evil.example", { updatedAt: "2026-09-30", softwareCount: 42 });
assert.match(forced, new RegExp(`<link>${SITE_RSS_ORIGIN}/</link>`));
assert.doesNotMatch(forced, /evil\.example/);

const feedRes = await get(SITE_RSS_ALIAS);
assert.equal(feedRes.status, 301);
assert.equal(feedRes.headers.get("location"), `${SITE_RSS_ORIGIN}${SITE_RSS_PATH}`);
assert.equal(await feedRes.text(), "");

const headRes = await handler(new Request(origin + SITE_RSS_PATH, { method: "HEAD" }), {});
assert.equal(headRes.status, 200);
assert.match(headRes.headers.get("content-type") || "", /^application\/rss\+xml; charset=utf-8$/);
assert.equal(await headRes.text(), "");

const posted = await handler(new Request(origin + SITE_RSS_PATH, { method: "POST" }), {});
assert.equal(posted.status, 404);

const items = itemsFrom(rss);
assert.ok(items.length >= 1 + RIB_RECORDS.length);
const guids = new Set();
for (const item of items) {
  assert.ok(item.title);
  assert.ok(item.link);
  assert.ok(item.guid);
  assert.ok(item.pubDate);
  assert.ok(["release", "software", "rib"].includes(item.category));
  assert.equal(guids.has(item.guid), false);
  guids.add(item.guid);
  assert.doesNotMatch(item.description, /&(?!amp;|lt;|gt;|quot;)/);
}
assert.equal(items.at(-1).category, "release");
assert.equal(items.at(-1).pubDate, "Fri, 11 Sep 2026 01:23:57 GMT");
assert.equal(items.at(-1).link, "https://github.com/AzielEliab/aziel-runtime/releases/tag/v2.0.0-rc1");
assert.match(items.at(-1).description, /published_at 2026-09-11T01:23:57Z/);
assert.doesNotMatch(items.at(-1).description, /00:00:00 GMT/);

const software = items.find((item) => item.category === "software");
assert.ok(software);
assert.equal(software.pubDate, "Wed, 30 Sep 2026 00:00:00 GMT");
assert.equal(software.link, `${SITE_RSS_ORIGIN}/v1/software`);
assert.match(software.description, /Catalog updated_at 2026-09-30/);
assert.match(software.description, /00:00:00 GMT because the source recorded a calendar day/);
const softwareJson = await (await get("/v1/software")).json();
assert.equal(softwareJson.updated_at, "2026-09-30");
assert.match(software.description, new RegExp(`${softwareJson.count} Softwares`));

for (const row of RIB_RECORDS) {
  const item = items.find((entry) => entry.guid === `aziel-runtime:rib:${row.id}`);
  assert.ok(item, row.id);
  assert.equal(item.category, "rib");
  assert.equal(item.link, row.link);
  assert.equal(item.pubDate, rfc822Utc(`${row.date}T00:00:00Z`));
  for (const id of row.ribs) assert.match(item.description, new RegExp(id));
  assert.match(item.description, new RegExp(row.date_role.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.match(item.description, /00:00:00 GMT because the source recorded a calendar day/);
}

const stamped = await get(SITE_RSS_PATH, { UPDATED_AT: "2026-11-02T08:15:00Z" });
const stampedItems = itemsFrom(await stamped.text());
assert.equal(stampedItems[0].category, "software");
assert.equal(stampedItems[0].pubDate, "Mon, 02 Nov 2026 00:00:00 GMT");
assert.match(stampedItems[0].description, /Catalog updated_at 2026-11-02/);
assert.doesNotMatch(stampedItems[0].description, /08:15:00/);

const refused = await get(SITE_RSS_PATH, { UPDATED_AT: "not-a-date" });
const refusedItems = itemsFrom(await refused.text());
assert.equal(refusedItems.some((item) => item.category === "software"), false);

assert.equal(shouldIncrementUse("GET", SITE_RSS_PATH), false);
assert.equal(shouldIncrementUse("GET", SITE_RSS_ALIAS), false);

const again = await (await get(SITE_RSS_PATH)).text();
assert.equal(again, rss);
const channel = rss.split("<item>")[0];
const built = channel.match(/<lastBuildDate>([^<]*)<\/lastBuildDate>/);
assert.ok(built);
assert.equal(built[1], items[0].pubDate);
assert.doesNotMatch(channel, /<pubDate>/);
const feedSrc = readFileSync(new URL("../src/site-rss.js", import.meta.url), "utf8");
assert.doesNotMatch(feedSrc, /new Date\(\s*\)/);
assert.doesNotMatch(feedSrc, /Date\.now\(\)/);

const creators = [...rss.matchAll(/<dc:creator>([^<]*)<\/dc:creator>/g)].map((match) => match[1]);
assert.ok(creators.length >= 1);
for (const name of creators) assert.equal(name, "Aziel Eliab");
assert.doesNotMatch(rss, /<author>/);

function visibleHtml(html) {
  const head = html.match(/<head[\s\S]*?<\/head>/i);
  assert.ok(head, "page has a head");
  return html.slice(head.index + head[0].length);
}

const home = await (await get("/")).text();
assert.match(home, new RegExp(`rel="alternate" type="application/rss\\+xml" href="${origin}${SITE_RSS_PATH}"`));
assert.doesNotMatch(visibleHtml(home), /href="[^"]*\/(?:rss|feed)\.xml"/);

const softwarePage = await (await get("/software")).text();
assert.match(softwarePage, new RegExp(`rel="alternate" type="application/rss\\+xml" href="${origin}${SITE_RSS_PATH}"`));
assert.doesNotMatch(visibleHtml(softwarePage), /href="[^"]*\/(?:rss|feed)\.xml"/);

const softwareHtml = await (
  await get("/v1/software", {}, { accept: "text/html" })
).text();
assert.match(softwareHtml, new RegExp(`rel="alternate" type="application/rss\\+xml" href="${origin}${SITE_RSS_PATH}"`));
assert.doesNotMatch(visibleHtml(softwareHtml), /href="[^"]*\/(?:rss|feed)\.xml"/);

const llms = await (await get("/llms.txt")).text();
assert.match(llms, new RegExp(`RSS: ${origin}${SITE_RSS_PATH}`));

const sitemap = await (await get("/sitemap.xml")).text();
assert.match(
  sitemap,
  new RegExp(`<loc>${origin}${SITE_RSS_PATH}</loc>\\s*<lastmod>${siteRssStaticLastmod()}</lastmod>`),
);

const openapi = await (await get("/openapi.json")).json();
assert.ok(openapi.paths[SITE_RSS_PATH]?.get);
assert.match(openapi.paths[SITE_RSS_PATH].get.summary, /GET \/feed\.xml is a 301/);

for (const url of [
  "https://evil.example/rss.xml",
  "https://aziel-runtime.vibelock.workers.dev./rss.xml",
]) {
  const spoofed = await handler(new Request(url, { headers: { host: "evil.example" } }), {});
  assert.equal(spoofed.status, 200);
  const body = await spoofed.text();
  assert.match(body, new RegExp(`<link>${SITE_RSS_ORIGIN}/</link>`));
  assert.match(body, new RegExp(`<atom:link href="${SITE_RSS_ORIGIN}${SITE_RSS_PATH}" rel="self"`));
  assert.match(body, new RegExp(`<link>${SITE_RSS_ORIGIN}/v1/software</link>`));
  assert.doesNotMatch(body, /evil\.example/);
  assert.doesNotMatch(body, /workers\.dev\./);
  const link = spoofed.headers.get("link") || "";
  assert.match(link, new RegExp(SITE_RSS_ORIGIN.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.doesNotMatch(link, /evil\.example/);
  assert.doesNotMatch(link, /workers\.dev\./);
}

const hostSpoof = await handler(
  new Request(`${SITE_RSS_ORIGIN}${SITE_RSS_PATH}`, { headers: { host: "evil.example" } }),
  {},
);
assert.equal(hostSpoof.status, 200);
assert.doesNotMatch(await hostSpoof.text(), /evil\.example/);

for (const url of ["https://evil.example/feed.xml", "https://aziel-runtime.vibelock.workers.dev./feed.xml"]) {
  const moved = await handler(new Request(url, { headers: { host: "evil.example." } }), {});
  assert.equal(moved.status, 301);
  assert.equal(moved.headers.get("location"), `${SITE_RSS_ORIGIN}${SITE_RSS_PATH}`);
}

for (const path of ["/rss", "/feed"]) {
  const other = await handler(new Request(origin + path), {});
  assert.notEqual(other.status, 200);
  assert.notEqual(other.headers.get("content-type"), "application/rss+xml; charset=utf-8");
}

const health = await (await get("/v1/health")).json();
assert.equal(health.rss, SITE_RSS_PATH);

const robots = await (await get("/robots.txt")).text();
assert.match(robots, new RegExp(`# RSS: ${origin}${SITE_RSS_PATH}`));

console.log(`ok site-rss: ${items.length} items (release, Softwares catalog, ${RIB_RECORDS.length} dated RIB notes)`);
