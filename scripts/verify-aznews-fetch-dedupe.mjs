/** AZNEWS-FETCH-DEDUPE-1.0: a feed that repeats an item in one fetch stores it once; the join holds. */
import assert from "node:assert/strict";
import { memoryRepo, tick, read, joinCheck } from "../src/engines/4dmap/aznews-live.js";
import { wiredOutlets } from "../src/engines/4dmap/aznews-outlets.js";
const NOW = Date.parse("2026-10-09T06:00:00Z");
const item = (prefix, i, link) => {
  const title = `Earthquake strikes Tokyo as Japan issues warning ${prefix} ${i}`;
  return `<item><title>${title}</title><link>${link || `https://example.org/${prefix}/${i}`}</link><pubDate>Fri, 09 Oct 2026 0${i % 6}:00:00 GMT</pubDate><description>TOKYO (AP) — ${title}. Officials said more.</description></item>`;
};
function feed(prefix) {
  // Same link twice (as live nypost/pagesix did), and same title+wording under a second link.
  const a = item(prefix, 1);
  const b = item(prefix, 2);
  const sameContent = item(prefix, 2, `https://example.org/${prefix}/2-mirror`);
  return `<?xml version="1.0"?><rss><channel>${a}${b}${a}${sameContent}${item(prefix, 3)}</channel></rss>`;
}
const fetchImpl = async (url) => {
  const u = String(url);
  if (u.startsWith("https://api.open-meteo.com/")) return new Response("[]", { headers: { "content-type": "application/json" } });
  const o = wiredOutlets().find((x) => x.feed_url === u);
  if (o) return new Response(feed(o.id), { headers: { "content-type": "application/rss+xml" } });
  return new Response("no", { status: 404 });
};
let n = 0;
const repo = memoryRepo();
await tick(repo, { fetchImpl, now: NOW });
const news = repo._ledger.filter((r) => r.kind === "news");
assert.ok(news.length > 0);
const ids = news.map((r) => r.doc.item_id);
assert.equal(new Set(ids).size, ids.length, "an item_id was stored twice"); n++;
const hashes = news.map((r) => r.doc.content_hash);
assert.ok(hashes.every(Boolean));
assert.equal(new Set(hashes).size, hashes.length, "same title+wording stored twice"); n++;
const j = await joinCheck(repo, { now: NOW, verifiedThrough: await repo.count() });
assert.equal(j.joined, true, JSON.stringify(j.broken || j)); n++;
const st = await read(repo, "status", {}, { now: NOW });
assert.equal(st.joined, true); n++;
// A second tick (the rotation may reach more outlets): still no duplicates, join still holds.
await tick(repo, { fetchImpl, now: NOW + 120000 });
const all = repo._ledger.filter((r) => r.kind === "news");
assert.equal(new Set(all.map((r) => r.doc.item_id)).size, all.length);
assert.equal(new Set(all.map((r) => r.doc.content_hash)).size, all.length);
assert.equal((await joinCheck(repo, { now: NOW + 120000, verifiedThrough: await repo.count() })).joined, true); n++;
console.log(`ok aznews fetch dedupe: ${n} checks`);
