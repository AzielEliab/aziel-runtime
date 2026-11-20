/** USES-RECTIFY-1.0: published uses cites tracker views, hosted views, and site_live_viewers. */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { memoryRuntimeKvNamespace } from "../src/durable-kv.js";
import { memoryChainWriterNamespace } from "../src/chainlock/writer-do.js";
import { PRODUCTS } from "../src/index.js";
import { WORKER_ONLY_PRODUCTS } from "../src/software-catalog.js";
import { serviceBindingName, softwareMeterRoster } from "../src/software-meters.js";
import { clearStatsMemo, statsFloorFor, statsFloorStorageKey } from "../src/stats-cache.js";
import { USES_TOTAL_SOURCE, memoryUsesKv } from "../src/uses.js";
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
assert.equal(out.uses_complete, true);
assert.equal(out.uses_components.uses_views_complete, true);
assert.deepEqual(out.uses_components.uses_views_missing, []);
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

// A service binding wins. The public workers.dev URL is not fetched.
{
  clearUsesRectifyCache();
  const seen = [];
  const bound = await rectifyUsesBody(raw, {
    meters: [meters[0]],
    siteLive: { site_live_viewers: 0, site_live_viewers_complete: true },
    bindFetch: (row) => async (req) => {
      seen.push("bind:" + row.slug + ":" + new URL(req.url).pathname);
      return { ok: true, async json() { return { views: 10 }; } };
    },
    fetchImpl: async (url) => {
      seen.push("pub:" + url);
      const json = (obj) => ({ ok: true, async json() { return obj; } });
      if (url === "https://www.azieleliab.com/v1/stats") return json({ views: 1 });
      if (url === "https://godlock.uk/stats") return json({ views: 2 });
      return json({ views: 99 });
    },
    now: 80_000,
  });
  assert.equal(bound.uses_components.sum_views, 10);
  assert.equal(bound.uses_components.sum_views_meters[0].via, "service-binding");
  assert.equal(bound.uses_complete, true);
  assert.ok(seen.some((s) => s === "bind:vibelock:/stats"));
  assert.ok(!seen.some((s) => String(s).includes("download-tracker")));
  n++;
}

// Timeout on one meter, 1042 on its public fallback: that meter is missing, the other is kept,
// and a later failed read does not reuse the earlier sum.
{
  clearUsesRectifyCache();
  const pair = [
    { slug: "vibelock", meter_stats: "https://vibelock-download-tracker.vibelock.workers.dev/stats" },
    { slug: "aziel-corpus", meter_stats: "https://aziel-corpus-download-tracker.vibelock.workers.dev/stats" },
  ];
  const hostedOk = async (url) => {
    const json = (obj) => ({ ok: true, async json() { return obj; } });
    if (url === "https://www.azieleliab.com/v1/stats") return json({ views: 10 });
    if (url === "https://godlock.uk/stats") return json({ views: 11 });
    const err = new Error("error code: 1042");
    throw err;
  };
  const timed = await rectifyUsesBody(raw, {
    meters: pair,
    siteLive: { site_live_viewers: 1, site_live_viewers_complete: true },
    bindFetch: (row) => {
      if (row.slug === "vibelock") {
        return async () => {
          const err = new Error("The operation was aborted due to timeout");
          err.name = "TimeoutError";
          throw err;
        };
      }
      return async () => ({ ok: true, async json() { return { views: 450477 }; } });
    },
    fetchImpl: hostedOk,
    now: 200_000,
    timeoutMs: 50,
  });
  assert.equal(timed.uses_components.sum_views, 450477);
  assert.ok(timed.uses_components.uses_views_missing.includes("vibelock"));
  assert.equal(timed.uses_components.uses_views_errors.find((e) => e.slug === "vibelock").reason, "timeout");
  assert.equal(timed.uses_components.uses_views_complete, false);
  assert.equal(timed.uses_components.uses_views_source, "partial");
  assert.equal(timed.uses_complete, false);
  assert.match(timed.uses_complete_note, /missing/);
  const dropped = await rectifyUsesBody(raw, {
    meters: pair,
    siteLive: { site_live_viewers: 1, site_live_viewers_complete: true },
    fetchImpl: async () => {
      throw Object.assign(new Error("error code: 1042"), { name: "Error" });
    },
    now: 200_100,
  });
  assert.equal(dropped.uses_components.sum_views, 0);
  assert.equal(dropped.uses_components.uses_views_source, "partial");
  assert.ok(dropped.uses_components.uses_views_missing.includes("vibelock"));
  assert.ok(dropped.uses_components.uses_views_missing.includes("aziel-corpus"));
  assert.equal(dropped.uses_components.uses_views_errors.find((e) => e.slug === "aziel-corpus").reason, "worker-1042");
  assert.notEqual(dropped.uses, timed.uses);
  assert.equal(dropped.uses_complete, false);
  n++;
}

// Every front-door meter has a wrangler service binding. Whitestone is worker-only and still a meter.
{
  const toml = readFileSync(new URL("../wrangler.toml", import.meta.url), "utf8");
  const services = new Map([...toml.matchAll(/\[\[services\]\]\nbinding = "([^"]+)"\nservice = "([^"]+)"/g)].map((m) => [m[1], m[2]]));
  const roster = softwareMeterRoster(PRODUCTS, WORKER_ONLY_PRODUCTS).meters;
  assert.equal(roster.length, 38);
  for (const row of roster) {
    const name = serviceBindingName(row);
    assert.equal(services.get(name), row.worker, row.slug + " binding " + name);
  }
  assert.equal(services.get("WHITESTONE"), "whitestone-download-tracker");
  n++;
}

// Worker: public 1042 drops all 38 meters. A stored floor of 562200 must not mask that partial sum
// or mark it complete. Bindings then publish the real sum, above that floor.
{
  clearUsesRectifyCache();
  clearStatsMemo();
  const roster = softwareMeterRoster(PRODUCTS, WORKER_ONLY_PRODUCTS).meters;
  const legacy = memoryUsesKv({ total: "62051" });
  const RUNTIME_KV = memoryRuntimeKvNamespace();
  const CHAINLOCK = memoryChainWriterNamespace({});
  const floor = statsFloorFor({ CHAINLOCK });
  const floorKey = statsFloorStorageKey("full", { uses_total_source: USES_TOTAL_SOURCE });
  await floor.raise(floorKey, 562200);
  const json = (obj) => ({ ok: true, async json() { return obj; } });
  const urls = [];
  const viewsFetch = async (url) => {
    urls.push(String(url));
    if (url === "https://www.azieleliab.com/v1/stats") return json({ views: 6623, nodes: 9, live_nodes: 9, human_uses: 9 });
    if (url === "https://godlock.uk/stats") return json({ views: 7657, nodes: 9, live_nodes: 9, uses: 9 });
    throw new Error("error code: 1042");
  };
  const env = { USES: legacy, RUNTIME_KV, CHAINLOCK, USES_VIEWS_FETCH: viewsFetch };
  const handler = (await import("../src/index.js")).default.fetch;
  await legacy.put("total", "62051");
  const { hybridKv } = await import("../src/durable-kv.js");
  const kv = hybridKv(RUNTIME_KV, legacy);
  await kv.put("total", "62701");
  const masked = await handler(new Request("https://x.example/v1/stats"), env, { waitUntil() {} });
  const maskedBody = await masked.json();
  assert.equal(masked.status, 200);
  assert.equal(maskedBody.uses_components.sum_views, 0);
  assert.equal(maskedBody.uses_components.uses_views_missing.length, 38);
  assert.equal(maskedBody.uses_components.sum_views_meters.length, 0);
  assert.equal(maskedBody.uses_components.uses_views_errors.filter((e) => e.reason === "worker-1042").length, 38);
  assert.equal(maskedBody.uses_complete, false);
  assert.equal(maskedBody.cache.uses_floor_applied, false);
  assert.equal(maskedBody.cache.floor_skipped, "views-incomplete");
  assert.notEqual(maskedBody.uses, 562200);
  const partial = maskedBody.uses_components.uses_legacy + maskedBody.uses_components.uses_durable + maskedBody.uses_components.sum_views + maskedBody.uses_components.hosted_views + maskedBody.uses_components.site_live_viewers;
  assert.equal(maskedBody.uses, partial);
  assert.equal((await floor.raise(floorKey, 0)).floor, 562200);
  n++;

  clearUsesRectifyCache();
  clearStatsMemo();
  urls.length = 0;
  const viewsBySlug = new Map(roster.map((row, i) => [row.slug, row.slug === "aziel-corpus" ? 450477 : 100 + i]));
  const sumViews = [...viewsBySlug.values()].reduce((a, b) => a + b, 0);
  const boundEnv = { USES: legacy, RUNTIME_KV, CHAINLOCK, USES_VIEWS_FETCH: viewsFetch };
  for (const row of roster) {
    boundEnv[serviceBindingName(row)] = {
      fetch: async (req) => {
        assert.equal(new URL(req.url).pathname, "/stats");
        return json({ views: viewsBySlug.get(row.slug), downloads: 1 });
      },
    };
  }
  const full = await handler(new Request("https://x.example/v1/uses"), boundEnv, { waitUntil() {} });
  const fullBody = await full.json();
  assert.equal(full.status, 200);
  assert.equal(fullBody.uses_components.sum_views, sumViews);
  assert.equal(fullBody.uses_components.sum_views_meters.length, 38);
  assert.deepEqual(fullBody.uses_components.uses_views_missing, []);
  assert.ok(fullBody.uses_components.sum_views_meters.every((row) => row.via === "service-binding"));
  assert.equal(fullBody.uses_components.uses_views_complete, true);
  assert.equal(fullBody.uses_complete, true);
  assert.equal(fullBody.cache.uses_floor_applied, false);
  assert.ok(fullBody.uses > 562200);
  const published = fullBody.uses_components.uses_legacy + fullBody.uses_components.uses_durable + sumViews + fullBody.uses_components.hosted_views + fullBody.uses_components.site_live_viewers;
  assert.equal(fullBody.uses, published);
  assert.ok(!urls.some((url) => url.includes("download-tracker")));
  assert.equal((await floor.raise(floorKey, 0)).floor, published);
  clearUsesRectifyCache();
  clearStatsMemo();
  const stats = await handler(new Request("https://x.example/v1/stats"), boundEnv, { waitUntil() {} });
  const statsBody = await stats.json();
  assert.equal(stats.status, 200);
  assert.equal(statsBody.alias_of, "/v1/uses");
  assert.equal(statsBody.uses, published);
  assert.equal(statsBody.uses_components.sum_views, sumViews);
  assert.equal(statsBody.uses_complete, true);
  assert.equal(statsBody.cache.uses_floor_applied, false);
  n++;
}

console.log(`ok uses rectify: ${n} checks`);
