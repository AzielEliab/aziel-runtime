/** USES-RECTIFY-1.0: published uses cites tracker views, hosted views, and site_live_viewers. */
import assert from "node:assert/strict";
import { USES_TOTAL_SOURCE } from "../src/uses.js";
import {
  CORPUS_ONCE,
  USES_FORMULA,
  clearUsesRectifyCache,
  rectifyUsesBody,
} from "../src/uses-rectify.js";

let n = 0;
clearUsesRectifyCache();
const meters = [
  { slug: "vibelock", meter_stats: "https://vibelock-download-tracker.vibelock.workers.dev/stats" },
  { slug: "aziel-corpus", meter_stats: "https://aziel-corpus-download-tracker.vibelock.workers.dev/stats" },
  { slug: "godlock", meter_stats: "https://godlock-download-tracker.vibelock.workers.dev/stats" },
];
const urls = [];
const fetchImpl = async (url) => {
  urls.push(String(url));
  const json = (obj) => ({ ok: true, async json() { return obj; } });
  if (url === "https://www.azieleliab.com/v1/stats") return json({ views: 5102, nodes: 99999, live_nodes: 88888, human_uses: 77777 });
  if (url === "https://godlock.uk/stats") return json({ views: 5584, nodes: 6009, live_nodes: 52, uses: 56 });
  if (String(url).includes("aziel-corpus-download-tracker")) return json({ views: 448523, downloads: 23229 });
  if (String(url).includes("vibelock-download-tracker") && !String(url).includes("aziel")) return json({ views: 545, downloads: 3 });
  if (String(url).includes("godlock-download-tracker")) return json({ views: 505, downloads: 2 });
  throw new Error("unexpected " + url);
};
const raw = {
  ok: true,
  uses: 67939,
  uses_complete: true,
  uses_legacy: 62051,
  uses_durable: 5888,
  uses_total_source: USES_TOTAL_SOURCE,
};
const out = await rectifyUsesBody(raw, {
  meters,
  siteLive: {
    site_live_viewers: 52,
    site_live_viewers_complete: true,
    site_live_viewers_source: "mesh site_viewers single-key",
    site_live_viewers_components: { "godlock.uk": 0, "azieleliab.com": 52, "azielcorpuslibrary.net": 0 },
  },
  fetchImpl,
  now: 1_000,
});
const sumViews = 545 + 448523 + 505;
const hosted = 5102 + 5584;
assert.equal(out.uses_formula, USES_FORMULA);
assert.equal(out.uses_components.uses_read, 67939);
assert.equal(out.uses_components.sum_views, sumViews);
assert.equal(out.uses_components.hosted_views, hosted);
assert.equal(out.uses_components.site_live_viewers, 52);
assert.equal(out.uses, 67939 + sumViews + hosted + 52);
assert.equal(out.uses_components.hosted.azieleliab.views, 5102);
assert.equal(out.uses_components.corpus_once.hub_added, false);
assert.equal(out.uses_components.corpus_once.meter_slug, CORPUS_ONCE.meter_slug);
assert.ok(!urls.some((url) => url.includes("azielcorpuslibrary.net")));
assert.equal(out.uses_legacy, 62051);
assert.equal(out.uses_durable, 5888);
n++;

const plain = await rectifyUsesBody({ ok: true, uses: 3, uses_complete: true }, { meters, fetchImpl, now: 2_000 });
assert.equal(plain.uses, 3);
assert.equal(plain.uses_formula, undefined);
n++;

const again = await rectifyUsesBody(raw, {
  meters,
  siteLive: { site_live_viewers: 52, site_live_viewers_complete: true },
  fetchImpl,
  now: 1_500,
});
assert.equal(again.uses, out.uses);
assert.equal(again.uses_components.uses_views_source, "cache");
n++;

console.log(`ok uses rectify: ${n} checks`);
