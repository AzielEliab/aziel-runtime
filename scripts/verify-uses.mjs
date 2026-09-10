/**
 * API use trackers: normalize path, skip rules, increment/read with mock KV.
 * Author: Aziel Eliab.
 */
import assert from "node:assert/strict";
import { PRODUCTS } from "../src/index.js";
import { RUNTIME_VERSION } from "../src/runtime-api.js";
import { memorySessionNamespace } from "../src/session-do.js";
import {
  incrementUse,
  inferProductOp,
  memoryUsesKv,
  normalizePath,
  peekUsesTotal,
  readUses,
  resolveUseHost,
  sanitizeHostLabel,
  shouldIncrementUse,
} from "../src/uses.js";

const handler = (await import("../src/index.js")).default.fetch;
const origin = "https://aziel-runtime.example";

function envWithUses(extra = {}) {
  return {
    SESSION: memorySessionNamespace({}),
    USES: memoryUsesKv(),
    ...extra,
  };
}

async function req(env, path, init = {}) {
  return handler(new Request(origin + path, init), env);
}

async function jsonReq(env, path, init = {}) {
  const res = await req(env, path, init);
  let data;
  try {
    data = await res.json();
  } catch {
    data = null;
  }
  return { status: res.status, data, headers: res.headers };
}

// --- normalize path ---
assert.equal(normalizePath("/v1/fraggate/list"), "/v1/fraggate/list");
assert.equal(normalizePath("/v1/fraggate/list/"), "/v1/fraggate/list");
assert.equal(normalizePath("/V1/Skill"), "/v1/skill");
assert.equal(normalizePath("/v1/session/open"), "/v1/session/open");
assert.equal(normalizePath("/v1/session/s1a2b3c4d5e6/exec"), "/v1/session/{id}/exec");
assert.equal(normalizePath("/v1/session/s1a2b3c4d5e6/receipts?x=1"), "/v1/session/{id}/receipts");
assert.equal(normalizePath("/p/AZCLCE/score"), "/p/azclce/score");
assert.equal(normalizePath("v1/bundle"), "/v1/bundle");
assert.doesNotMatch(normalizePath("/v1/session/s1a2b3c4d5e6/exec"), /s1a2b3c4d5e6/);

// --- skip rules ---
assert.equal(shouldIncrementUse("GET", "/v1/health"), false);
assert.equal(shouldIncrementUse("GET", "/v1/ready"), false);
assert.equal(shouldIncrementUse("GET", "/v1/uses"), false);
assert.equal(shouldIncrementUse("GET", "/v1/mesh"), false);
assert.equal(shouldIncrementUse("GET", "/v1/mesh/status"), false);
assert.equal(shouldIncrementUse("GET", "/v1/mesh/nodes"), false);
assert.equal(shouldIncrementUse("GET", "/v1/qns"), false);
assert.equal(shouldIncrementUse("POST", "/v1/mesh/enable"), true);
assert.equal(shouldIncrementUse("POST", "/v1/mesh/join"), true);
assert.equal(shouldIncrementUse("POST", "/v1/uses"), false);
assert.equal(shouldIncrementUse("GET", "/v1/stats"), false);
assert.equal(shouldIncrementUse("POST", "/v1/stats"), false);
assert.equal(shouldIncrementUse("HEAD", "/v1/fraggate/list"), false);
assert.equal(shouldIncrementUse("OPTIONS", "/v1/fraggate/call"), false);
assert.equal(shouldIncrementUse("GET", "/openapi.json"), false);
assert.equal(shouldIncrementUse("GET", "/robots.txt"), false);
assert.equal(shouldIncrementUse("GET", "/sitemap.xml"), false);
assert.equal(shouldIncrementUse("GET", "/sitemap-index.xml"), false);
assert.equal(shouldIncrementUse("GET", "/llms.txt"), false);
assert.equal(shouldIncrementUse("GET", "/ai.txt"), false);
assert.equal(shouldIncrementUse("GET", "/cite.json"), false);
assert.equal(shouldIncrementUse("GET", "/"), false);
assert.equal(shouldIncrementUse("GET", "/sigil.png"), false);
assert.equal(shouldIncrementUse("GET", "/p/foldlock"), false);
assert.equal(shouldIncrementUse("GET", "/mcp"), false);
assert.equal(shouldIncrementUse("GET", "/v1/software"), false);
assert.equal(shouldIncrementUse("GET", "/v1/software.json"), false);
assert.equal(shouldIncrementUse("GET", "/v1/fraggate/software"), false);
assert.equal(shouldIncrementUse("GET", "/v1/catalog.json"), false);
assert.equal(shouldIncrementUse("GET", "/v1/update/check"), false);
assert.equal(shouldIncrementUse("GET", "/v1/update/manifest"), false);

assert.equal(shouldIncrementUse("GET", "/v1/fraggate"), true);
assert.equal(shouldIncrementUse("GET", "/v1/fraggate/list"), true);
assert.equal(shouldIncrementUse("GET", "/v1/fraggate/describe"), true);
assert.equal(shouldIncrementUse("POST", "/v1/fraggate/call"), true);
assert.equal(shouldIncrementUse("POST", "/v1/fraggate/verify"), true);
assert.equal(shouldIncrementUse("POST", "/v1/session/open"), true);
assert.equal(shouldIncrementUse("POST", "/v1/session/s1a2b3c4d5e6/exec"), true);
assert.equal(shouldIncrementUse("POST", "/v1/session/s1a2b3c4d5e6/close"), true);
assert.equal(shouldIncrementUse("GET", "/v1/pull/foldlock"), true);
assert.equal(shouldIncrementUse("GET", "/v1/bundle"), true);
assert.equal(shouldIncrementUse("GET", "/v1/skill"), true);
assert.equal(shouldIncrementUse("POST", "/mcp"), true);
assert.equal(shouldIncrementUse("POST", "/p/azclce/score"), true);
assert.equal(shouldIncrementUse("GET", "/p/azclce/score"), true);

assert.equal(inferProductOp("/v1/fraggate/call").op, "fraggate.call");
assert.equal(inferProductOp("/p/foldlock/fold-preview").op, "foldlock.fold-preview");
assert.equal(inferProductOp("/p/foldlock/fold-preview").product, "foldlock");
assert.equal(inferProductOp("/v1/pull/azclce").op, "azclce.pull");
assert.equal(inferProductOp("/v1/session/s1a2b3c4d5e6/exec").op, "session.exec");
assert.equal(inferProductOp("/mcp").op, "mcp");

assert.equal(sanitizeHostLabel("aziel-runtime.vibelock.workers.dev"), "origin");
assert.equal(sanitizeHostLabel("www.azieleliab.com"), "azieleliab.com");
assert.equal(sanitizeHostLabel("GODLOCK.UK:443"), "godlock.uk");
assert.equal(sanitizeHostLabel("www.azielcorpuslibrary.net"), "azielcorpuslibrary.net");
assert.equal(sanitizeHostLabel("origin"), "origin");

const viaReq = new Request(origin + "/v1/skill", {
  headers: {
    Host: "aziel-runtime.vibelock.workers.dev",
    "X-Aziel-Runtime-Via": "azielcorpuslibrary.net",
  },
});
assert.deepEqual(resolveUseHost(viaReq), {
  host: "azielcorpuslibrary.net",
  via: "azielcorpuslibrary.net",
});
const hostOverride = new Request(origin + "/v1/skill", {
  headers: {
    Host: "aziel-runtime.vibelock.workers.dev",
    "X-Aziel-Runtime-Host": "godlock.uk",
    "X-Aziel-Runtime-Via": "origin",
  },
});
assert.deepEqual(resolveUseHost(hostOverride), { host: "godlock.uk", via: "origin" });

// --- increment / read with mock KV ---
const kvEnv = { USES: memoryUsesKv() };
const first = await incrementUse(kvEnv, {
  host: "origin",
  method: "POST",
  path: "/v1/fraggate/call",
  status: 200,
  op: "fraggate.call",
  via: "azieleliab.com",
});
assert.equal(first.ok, true);
assert.equal(first.uses, 1);
assert.equal(first.entry.host, "origin");
assert.equal(first.entry.op, "fraggate.call");
assert.equal(first.entry.via, "azieleliab.com");
assert.equal(first.entry.method, "POST");
assert.ok(!("authorization" in first.entry));
assert.ok(!("body" in first.entry));
assert.ok(!("token" in first.entry));

await incrementUse(kvEnv, {
  host: "godlock.uk",
  method: "GET",
  path: "/v1/pull/foldlock",
  status: 200,
  product: "foldlock",
  op: "foldlock.pull",
});
const snap = await readUses(kvEnv);
assert.equal(snap.ok, true);
assert.equal(snap.product, "aziel-runtime");
assert.equal(snap.author, "Aziel Eliab");
assert.equal(snap.uses, 2);
assert.equal(snap.by_host.origin, 1);
assert.equal(snap.by_host["godlock.uk"], 1);
assert.equal(snap.by_path["/v1/fraggate/call"], 1);
assert.equal(snap.by_path["/v1/pull/foldlock"], 1);
assert.equal(snap.by_method.POST, 1);
assert.equal(snap.by_method.GET, 1);
assert.equal(snap.by_op["fraggate.call"], 1);
assert.equal(snap.by_op["foldlock.pull"], 1);
assert.ok(snap.by_day[Object.keys(snap.by_day)[0]] >= 1);
assert.equal(snap.recent.length, 2);
assert.equal(snap.recent[0].path, "/v1/pull/foldlock");
assert.equal(await peekUsesTotal(kvEnv), 2);

const many = { USES: memoryUsesKv() };
for (let i = 0; i < 105; i++) {
  await incrementUse(many, { host: "origin", method: "GET", path: "/v1/bundle", status: 200 });
}
const capped = await readUses(many);
assert.equal(capped.uses, 105);
assert.equal(capped.recent.length, 100);

assert.equal((await incrementUse({}, { path: "/v1/skill" })).skipped, "uses_unbound");
assert.equal((await readUses({})).uses_kv, false);
assert.equal(await peekUsesTotal({}), null);

// --- HTTP: increment API, skip SEO / health / uses ---
const env = envWithUses();
await jsonReq(env, "/v1/fraggate/list");
await jsonReq(env, "/v1/bundle");
await jsonReq(env, "/v1/skill");
await jsonReq(env, "/v1/pull/foldlock");
await jsonReq(env, "/mcp", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list" }),
});
await jsonReq(env, "/v1/health");
await jsonReq(env, "/v1/ready");
await jsonReq(env, "/openapi.json");
await jsonReq(env, "/robots.txt");
await jsonReq(env, "/cite.json");
await jsonReq(env, "/llms.txt");
await req(env, "/");

const beforeRead = Number(await env.USES.get("total")) || 0;
assert.ok(beforeRead >= 5, `expected API increments, got ${beforeRead}`);
const usesRes = await jsonReq(env, "/v1/uses");
assert.equal(usesRes.status, 200);
assert.equal(usesRes.data.ok, true);
assert.equal(usesRes.data.product, "aziel-runtime");
assert.equal(usesRes.data.author, "Aziel Eliab");
assert.equal(typeof usesRes.data.uses, "number");
assert.equal(usesRes.data.uses, beforeRead);
assert.ok(usesRes.data.by_host);
assert.ok(usesRes.data.by_path);
assert.ok(usesRes.data.by_day);
assert.ok(Array.isArray(usesRes.data.recent));
assert.equal(Number(await env.USES.get("total")), beforeRead, "GET /v1/uses must not increment");
const blob = JSON.stringify(usesRes.data);
assert.doesNotMatch(blob, /authorization/i);
assert.doesNotMatch(blob, /Bearer /);
assert.doesNotMatch(blob, /RUNTIME_TOKEN/);

const statsRes = await jsonReq(env, "/v1/stats");
assert.equal(statsRes.status, 200);
assert.equal(statsRes.data.alias_of, "/v1/uses");
assert.equal(statsRes.data.uses, beforeRead);
assert.equal(Number(await env.USES.get("total")), beforeRead, "GET /v1/stats must not increment");

const postUses = await jsonReq(env, "/v1/uses", { method: "POST", headers: { "content-type": "application/json" }, body: "{}" });
assert.equal(postUses.status, 405);
assert.equal(postUses.data.ok, false);
assert.equal(Number(await env.USES.get("total")), beforeRead, "POST /v1/uses must not increment");

const health = await jsonReq(env, "/v1/health");
assert.equal(health.status, 200);
assert.equal(health.data.version, RUNTIME_VERSION);
assert.equal(health.data.uses, "/v1/uses");
assert.equal(health.data.uses_total, beforeRead);
assert.equal(Number(await env.USES.get("total")), beforeRead);

const viaEnv = envWithUses();
await jsonReq(viaEnv, "/v1/fraggate", {
  headers: { "X-Aziel-Runtime-Via": "godlock.uk", Host: "aziel-runtime.vibelock.workers.dev" },
});
const viaSnap = await readUses(viaEnv);
assert.equal(viaSnap.by_host["godlock.uk"], 1);
assert.equal(viaSnap.recent[0].via, "godlock.uk");

const tokenEnv = envWithUses();
await jsonReq(tokenEnv, "/v1/fraggate/list", {
  headers: { Authorization: "Bearer secret-token-value", "X-Aziel-Runtime-Token": "also-secret" },
});
const tokenSnap = await readUses(tokenEnv);
const tokenLog = JSON.stringify(tokenSnap.recent);
assert.doesNotMatch(tokenLog, /secret-token-value/);
assert.doesNotMatch(tokenLog, /also-secret/);
assert.doesNotMatch(tokenLog, /Bearer /);

const openapi = await jsonReq(env, "/openapi.json");
assert.ok(openapi.data.paths["/v1/uses"]);
assert.ok(openapi.data.paths["/v1/stats"]);
const llms = await (await req(env, "/llms.txt")).text();
assert.match(llms, /\/v1\/uses/);
const cite = await jsonReq(env, "/cite.json");
assert.match(cite.data.uses, /\/v1\/uses/);
const sitemap = await (await req(env, "/sitemap.xml")).text();
assert.match(sitemap, /\/v1\/uses/);

assert.ok(PRODUCTS.length >= 27);
console.log(`ok uses ${RUNTIME_VERSION}: normalize, skip, mock KV increment/read, GET /v1/uses no increment`);
