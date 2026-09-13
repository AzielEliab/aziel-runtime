/**
 * Social-status / stats-rollups: cite + catalog fields, read-only rollup,
 * never invent numbers, omit on timeout. No MCP tool added.
 * Author: Aziel Eliab.
 */
import assert from "node:assert/strict";
import { PUBLIC_MCP_TOOLS } from "../src/fraggate/codes.js";
import { memorySessionNamespace } from "../src/session-do.js";
import {
  SOCIAL_STATUS_AUTHOR,
  SOCIAL_STATUS_HUBS,
  SOCIAL_STATUS_LIVE_URLS,
  SOCIAL_STATUS_PERSON_ID,
  fetchHubSnapshot,
  llmsStatsAwarenessBlock,
  resetSocialStatusCache,
  socialStatusField,
  statsRollupSnapshot,
} from "../src/social-status.js";
import { memoryUsesKv, shouldIncrementUse } from "../src/uses.js";

const handler = (await import("../src/index.js")).default.fetch;
const origin = "https://aziel-runtime.example";

function envWith(extra = {}) {
  return {
    SESSION: memorySessionNamespace({}),
    USES: memoryUsesKv({ total: "7" }),
    ...extra,
  };
}

function jsonRes(body, status = 200, contentType = "application/json; charset=utf-8") {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": contentType },
  });
}

function mockFetch(routes) {
  return async (url) => {
    const href = String(url);
    for (const [prefix, factory] of routes) {
      if (href === prefix || href.startsWith(prefix + "?")) {
        return factory(href);
      }
    }
    return new Response("not found", { status: 404, headers: { "content-type": "text/html" } });
  };
}

assert.equal(SOCIAL_STATUS_AUTHOR, "Aziel Eliab");
assert.equal(SOCIAL_STATUS_PERSON_ID, "https://www.azieleliab.com/#aziel");
assert.deepEqual(SOCIAL_STATUS_LIVE_URLS, [
  "https://www.azieleliab.com/v1/stats",
  "https://www.azielcorpuslibrary.net/v1/stats",
  "https://www.hedidntjump.com/api/stats",
]);

const field = socialStatusField(origin);
assert.equal(field.person_id, SOCIAL_STATUS_PERSON_ID);
assert.equal(field.author, SOCIAL_STATUS_AUTHOR);
assert.equal(field.identity, SOCIAL_STATUS_AUTHOR);
assert.equal(field.vanity, false);
assert.equal(field.biography, false);
assert.equal(field.never_invent_numbers, true);
assert.equal(field.rollup, `${origin}/v1/stats-rollups`);
assert.ok(field.hubs.some((h) => h.id === "azieleliab" && h.stats === SOCIAL_STATUS_LIVE_URLS[0]));
assert.ok(field.hubs.some((h) => h.id === "corpus" && h.stats === SOCIAL_STATUS_LIVE_URLS[1]));
assert.ok(field.hubs.some((h) => h.id === "hedidntjump" && h.stats === SOCIAL_STATUS_LIVE_URLS[2]));
const hdj = field.hubs.find((h) => h.id === "hedidntjump");
assert.ok(hdj.not.includes("https://www.hedidntjump.com/stats"));
assert.equal(hdj.dual_write_hits, false);
assert.equal(hdj.source_of_truth, "https://hedidntjump-stats.vibelock.workers.dev");
const god = field.hubs.find((h) => h.id === "godlock");
assert.equal(god.stats, "https://godlock.uk/stats");
assert.equal(god.v1_stats_status, 404);
assert.ok(god.never_cite.includes("uploads"));
const runtimeHub = field.hubs.find((h) => h.id === "runtime");
assert.equal(runtimeHub.label, "agent/MCP usage");
assert.ok(runtimeHub.host_mirrors.some((u) => u.endsWith("/runtime/v1/uses")));

const llmsBlock = llmsStatsAwarenessBlock(origin);
assert.match(llmsBlock, /## Stats \/ awareness/);
assert.match(llmsBlock, /azieleliab\.com\/v1\/stats/);
assert.match(llmsBlock, /azielcorpuslibrary\.net\/v1\/stats/);
assert.match(llmsBlock, /hedidntjump\.com\/api\/stats/);
assert.match(llmsBlock, /godlock\.uk\/stats/);
assert.doesNotMatch(llmsBlock, /hedidntjump\.com\/stats \(/);
assert.match(llmsBlock, /person_id https:\/\/www\.azieleliab\.com\/#aziel/);

assert.equal(shouldIncrementUse("GET", "/v1/stats-rollups"), false);
assert.equal(shouldIncrementUse("POST", "/v1/stats-rollups"), false);

const liveRoutes = mockFetch([
  ["https://www.azieleliab.com/v1/stats", () => jsonRes({ ok: true, views: 10, product: "azieleliab", author: "Aziel Eliab" })],
  ["https://www.azielcorpuslibrary.net/v1/stats", () => jsonRes({ ok: true, views: 20, downloads: 3 })],
  ["https://godlock.uk/stats", () => jsonRes({ ok: true, views: 5, uses: 1, downloads: 2, current_score: 9.5, uploads: 99 })],
  ["https://www.hedidntjump.com/api/stats", () => jsonRes({ views: 4, downloads: 1, items: { landing: 4 } })],
]);

resetSocialStatusCache();
const snap = await statsRollupSnapshot(envWith(), { fetch: liveRoutes, origin, skipCache: true });
assert.equal(snap.ok, true);
assert.equal(snap.author, "Aziel Eliab");
assert.equal(snap.identity, "Aziel Eliab");
assert.equal(snap.person_id, SOCIAL_STATUS_PERSON_ID);
assert.equal(snap.combined.views, 39);
assert.equal(snap.combined.downloads, 6);
assert.ok(snap.combined.source_urls.includes("https://www.azieleliab.com/v1/stats"));
assert.ok(snap.combined.source_urls.includes("https://www.azielcorpuslibrary.net/v1/stats"));
assert.ok(snap.combined.source_urls.includes("https://godlock.uk/stats"));
assert.ok(snap.combined.source_urls.includes("https://www.hedidntjump.com/api/stats"));
const godRow = snap.sources.find((s) => s.id === "godlock");
assert.equal(godRow.ok, true);
assert.equal(godRow.current_score, 9.5);
assert.equal(godRow.uses, 1);
assert.ok(!("uploads" in godRow), "never cite uploads");
const runtimeRow = snap.sources.find((s) => s.id === "runtime");
assert.equal(runtimeRow.ok, true);
assert.equal(runtimeRow.uses, 7);
assert.equal(runtimeRow.label, "agent/MCP usage");
assert.ok(!("uses" in snap.combined), "runtime uses must not enter combined views");
assert.equal(snap.omitted.length, 0);

const missingViews = await fetchHubSnapshot(
  SOCIAL_STATUS_HUBS.find((h) => h.id === "azieleliab"),
  { fetch: mockFetch([["https://www.azieleliab.com/v1/stats", () => jsonRes({ ok: true, product: "azieleliab" })]]) },
);
assert.equal(missingViews.ok, true);
assert.ok(!("views" in missingViews), "missing views must be omitted, not invented as 0");

let hdjHits = 0;
let sotHits = 0;
let spaHits = 0;
const guarded = mockFetch([
  ["https://www.azieleliab.com/v1/stats", () => jsonRes({ views: 1 })],
  ["https://www.azielcorpuslibrary.net/v1/stats", () => jsonRes({ views: 1, downloads: 1 })],
  ["https://godlock.uk/stats", () => jsonRes({ views: 1, downloads: 1, uses: 0, current_score: 1 })],
  [
    "https://www.hedidntjump.com/api/stats",
    () => {
      hdjHits += 1;
      return jsonRes({ views: 1, downloads: 0, items: { landing: 1 } });
    },
  ],
  [
    "https://www.hedidntjump.com/stats",
    () => {
      spaHits += 1;
      return new Response("<html>SPA</html>", { status: 200, headers: { "content-type": "text/html" } });
    },
  ],
  [
    "https://hedidntjump-stats.vibelock.workers.dev",
    () => {
      sotHits += 1;
      return jsonRes({ views: 1, downloads: 0 });
    },
  ],
]);
resetSocialStatusCache();
await statsRollupSnapshot(envWith(), { fetch: guarded, origin, skipCache: true });
assert.equal(hdjHits, 1);
assert.equal(sotHits, 0, "must not dual-write / fetch HDJ Worker SoT");
assert.equal(spaHits, 0, "must not fetch He Didn't Jump /stats SPA");

const fallbackFetch = mockFetch([
  ["https://www.azieleliab.com/v1/stats", () => jsonRes({ views: 2 })],
  ["https://www.azielcorpuslibrary.net/v1/stats", () => new Response("no", { status: 404, headers: { "content-type": "text/html" } })],
  ["https://www.azielcorpuslibrary.net/stats", () => jsonRes({ views: 8, downloads: 4 })],
  ["https://godlock.uk/stats", () => new Response("no", { status: 404, headers: { "content-type": "text/html" } })],
  ["https://godlock-download-tracker.vibelock.workers.dev/stats", () => jsonRes({ views: 3, downloads: 1 })],
  ["https://www.hedidntjump.com/api/stats", () => jsonRes({ views: 1, downloads: 0, items: {} })],
]);
resetSocialStatusCache();
const fallbackSnap = await statsRollupSnapshot(envWith(), { fetch: fallbackFetch, origin, skipCache: true });
assert.equal(fallbackSnap.sources.find((s) => s.id === "corpus").url, "https://www.azielcorpuslibrary.net/stats");
assert.equal(fallbackSnap.sources.find((s) => s.id === "godlock").url, "https://godlock-download-tracker.vibelock.workers.dev/stats");
assert.equal(fallbackSnap.combined.views, 14);
assert.equal(fallbackSnap.combined.downloads, 5);

const failOne = mockFetch([
  ["https://www.azieleliab.com/v1/stats", () => jsonRes({ views: 6 })],
  ["https://www.azielcorpuslibrary.net/v1/stats", async () => {
    const err = new Error("aborted");
    err.name = "TimeoutError";
    throw err;
  }],
  ["https://www.azielcorpuslibrary.net/stats", async () => {
    const err = new Error("aborted");
    err.name = "TimeoutError";
    throw err;
  }],
  ["https://aziel-corpus-download-tracker.vibelock.workers.dev/stats", async () => {
    const err = new Error("aborted");
    err.name = "AbortError";
    throw err;
  }],
  ["https://godlock.uk/stats", () => jsonRes({ views: 2, downloads: 1 })],
  ["https://www.hedidntjump.com/api/stats", () => jsonRes({ views: 1, downloads: 1 })],
]);
resetSocialStatusCache();
const timed = await statsRollupSnapshot(envWith(), { fetch: failOne, origin, skipCache: true });
const corpusFail = timed.sources.find((s) => s.id === "corpus");
assert.equal(corpusFail.ok, false);
assert.equal(corpusFail.error, "timeout");
assert.equal(corpusFail.omitted, true);
assert.ok(timed.omitted.some((o) => o.id === "corpus" && o.error === "timeout"));
assert.equal(timed.combined.views, 9);
assert.equal(timed.combined.downloads, 2);
assert.ok(!timed.combined.source_urls.includes("https://www.azielcorpuslibrary.net/v1/stats"));

resetSocialStatusCache();
const unbound = await statsRollupSnapshot({ SESSION: memorySessionNamespace({}) }, { fetch: liveRoutes, origin, skipCache: true });
const unboundRuntime = unbound.sources.find((s) => s.id === "runtime");
assert.equal(unboundRuntime.ok, false);
assert.equal(unboundRuntime.error, "uses_unbound");
assert.equal(unboundRuntime.omitted, true);
assert.ok(!("uses" in unboundRuntime));

resetSocialStatusCache();
let fetches = 0;
const counting = async (url) => {
  fetches += 1;
  return liveRoutes(url);
};
const env = envWith();
const first = await statsRollupSnapshot(env, { fetch: counting, origin, now: 1_000 });
const second = await statsRollupSnapshot(env, { fetch: counting, origin, now: 1_000 + 10_000 });
assert.equal(first.cached, false);
assert.equal(second.cached, true);
assert.equal(fetches, 4, "cached rollup must not refetch siblings");

const cite = await (await handler(new Request(origin + "/cite.json"), env)).json();
assert.ok(cite.stats);
assert.ok(cite.social_status);
assert.equal(cite.stats.person_id, SOCIAL_STATUS_PERSON_ID);
assert.equal(cite.social_status.person_id, SOCIAL_STATUS_PERSON_ID);
assert.equal(cite.stats.rollup, `${origin}/v1/stats-rollups`);
assert.ok(cite.stats.hubs.some((h) => h.id === "hedidntjump" && h.stats.includes("/api/stats")));

const catalog = await (await handler(new Request(origin + "/v1/catalog.json"), env)).json();
assert.equal(catalog.stats.person_id, SOCIAL_STATUS_PERSON_ID);
assert.equal(catalog.social_status.identity, "Aziel Eliab");
assert.ok(catalog.stats.live.includes("https://www.hedidntjump.com/api/stats"));

const software = await (await handler(new Request(origin + "/v1/software"), env)).json();
assert.equal(software.social_status.person_id, SOCIAL_STATUS_PERSON_ID);

resetSocialStatusCache();
const httpEnv = envWith({ STATS_FETCH: liveRoutes });
const rollRes = await handler(new Request(origin + "/v1/stats-rollups"), httpEnv);
assert.equal(rollRes.status, 200);
const roll = await rollRes.json();
assert.equal(roll.ok, true);
assert.equal(roll.person_id, SOCIAL_STATUS_PERSON_ID);
assert.equal(typeof roll.combined, "object");
assert.match(rollRes.headers.get("Cache-Control") || "", /s-maxage=60/);

const head = await handler(new Request(origin + "/v1/stats-rollups", { method: "HEAD" }), httpEnv);
assert.equal(head.status, 200);
assert.equal(await head.text(), "");

const post = await handler(new Request(origin + "/v1/stats-rollups", { method: "POST", headers: { "content-type": "application/json" }, body: "{}" }), env);
assert.equal(post.status, 405);

const llms = await (await handler(new Request(origin + "/llms.txt"), env)).text();
assert.match(llms, /## Stats \/ awareness/);
assert.match(llms, /azieleliab\.com\/v1\/stats/);
assert.match(llms, /azielcorpuslibrary\.net\/v1\/stats/);
assert.match(llms, /hedidntjump\.com\/api\/stats/);

const sitemap = await (await handler(new Request(origin + "/sitemap.xml"), env)).text();
assert.match(sitemap, /\/v1\/stats-rollups/);

const openapi = await (await handler(new Request(origin + "/openapi.json"), env)).json();
assert.ok(openapi.paths["/v1/stats-rollups"]);
assert.ok(openapi.paths["/v1/stats-rollups"].get);
assert.doesNotMatch(JSON.stringify(PUBLIC_MCP_TOOLS), /stats-rollups/);
assert.ok(!PUBLIC_MCP_TOOLS.includes("stats_rollups"));
assert.ok(!PUBLIC_MCP_TOOLS.includes("runtime_stats_rollups"));

const toolsList = await handler(
  new Request(origin + "/mcp", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list" }),
  }),
  env,
);
const toolsBody = await toolsList.json();
const names = (toolsBody.result && toolsBody.result.tools ? toolsBody.result.tools : []).map((t) => t.name);
assert.ok(!names.includes("stats_rollups"));
assert.ok(!names.includes("runtime_stats_rollups"));
assert.ok(names.includes("fraggate_list"));

console.log("ok social-status: cite/catalog fields, rollup omit/timeout, no MCP tool, HDJ /api/stats only");
