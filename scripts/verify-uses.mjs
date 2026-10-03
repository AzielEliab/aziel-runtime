/**
 * API use trackers: normalize path, skip rules, increment/read with mock KV.
 * Author: Aziel Eliab.
 */
import assert from "node:assert/strict";
import { PRODUCTS } from "../src/index.js";
import { RUNTIME_VERSION } from "../src/runtime-api.js";
import { memorySessionNamespace } from "../src/session-do.js";
import {
  detailOpsForUse,
  incrementUse,
  inferProductOp,
  memoryUsesKv,
  normalizePath,
  peekHumanUses,
  peekUsesTotal,
  readUses,
  USES_READ_BUDGET_MS,
  resolveUseHost,
  sanitizeHostLabel,
  sanitizeUseOpKey,
  sanitizeUseOpToken,
  shouldIncrementUse,
  slugTokenFromArgs,
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
assert.equal(shouldIncrementUse("GET", "/v1/mesh/az-generator"), false);
assert.equal(shouldIncrementUse("GET", "/v1/qns"), false);
assert.equal(shouldIncrementUse("GET", "/v1/receipts"), false);
assert.equal(shouldIncrementUse("GET", "/v1/receipts/tip"), false);
assert.equal(shouldIncrementUse("GET", "/v1/azpipe/arch"), false);
assert.equal(shouldIncrementUse("POST", "/v1/mesh/enable"), true);
assert.equal(shouldIncrementUse("POST", "/v1/mesh/join"), true);
assert.equal(shouldIncrementUse("POST", "/v1/mesh/site-presence"), false);
assert.equal(shouldIncrementUse("POST", "/v1/mesh/site-heartbeat"), false);
assert.equal(shouldIncrementUse("GET", "/v1/mesh/site-presence"), false);
assert.equal(shouldIncrementUse("POST", "/v1/uses"), false);
assert.equal(shouldIncrementUse("GET", "/v1/stats"), false);
assert.equal(shouldIncrementUse("POST", "/v1/stats"), false);
assert.equal(shouldIncrementUse("GET", "/v1/stats-rollups"), false);
assert.equal(shouldIncrementUse("POST", "/v1/stats-rollups"), false);
assert.equal(shouldIncrementUse("HEAD", "/v1/fraggate/list"), false);
assert.equal(shouldIncrementUse("OPTIONS", "/v1/fraggate/call"), false);
assert.equal(shouldIncrementUse("GET", "/openapi.json"), false);
assert.equal(shouldIncrementUse("GET", "/robots.txt"), false);
assert.equal(shouldIncrementUse("GET", "/sitemap.xml"), false);
assert.equal(shouldIncrementUse("GET", "/sitemap-index.xml"), false);
assert.equal(shouldIncrementUse("GET", "/llms.txt"), false);
assert.equal(shouldIncrementUse("GET", "/ai.txt"), false);
assert.equal(shouldIncrementUse("GET", "/cite.json"), false);
assert.equal(shouldIncrementUse("GET", "/person.jsonld"), false);
assert.equal(shouldIncrementUse("GET", "/who-is"), false);
assert.equal(shouldIncrementUse("GET", "/who-is-aziel-eliab.txt"), false);
assert.equal(shouldIncrementUse("GET", "/shelves"), false);
assert.equal(shouldIncrementUse("GET", "/v1/shelves"), false);
assert.equal(shouldIncrementUse("GET", "/cold-copy"), false);
assert.equal(shouldIncrementUse("GET", "/v1/cold-copy"), false);
assert.equal(shouldIncrementUse("GET", "/"), false);
assert.equal(shouldIncrementUse("GET", "/about"), false);
assert.equal(shouldIncrementUse("GET", "/v1/about"), false);
assert.equal(shouldIncrementUse("GET", "/sigil.png"), false);
assert.equal(shouldIncrementUse("GET", "/p/foldlock"), false);
assert.equal(shouldIncrementUse("GET", "/mcp"), false);
assert.equal(shouldIncrementUse("GET", "/.well-known/mcp/server-card.json"), false);
assert.equal(shouldIncrementUse("GET", "/.well-known/oauth-protected-resource"), false);
assert.equal(shouldIncrementUse("GET", "/.well-known/oauth-protected-resource/mcp"), false);
assert.equal(shouldIncrementUse("GET", "/mcp/.well-known/mcp/server-card.json"), false);
assert.equal(shouldIncrementUse("GET", "/mcp/.well-known/oauth-protected-resource"), false);
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
assert.equal(shouldIncrementUse("GET", "/download"), true);
assert.equal(shouldIncrementUse("GET", "/v1/download"), true);
assert.equal(shouldIncrementUse("GET", "/v1/suite/download"), true);
assert.equal(shouldIncrementUse("GET", "/v1/bundle"), true);
assert.equal(shouldIncrementUse("GET", "/v1/skill"), true);
assert.equal(shouldIncrementUse("POST", "/mcp"), true);
assert.equal(shouldIncrementUse("DELETE", "/mcp"), false);
assert.equal(shouldIncrementUse("POST", "/p/azclce/score"), true);
assert.equal(shouldIncrementUse("GET", "/p/azclce/score"), true);

assert.equal(inferProductOp("/v1/fraggate/call").op, "fraggate.call");
assert.equal(inferProductOp("/p/foldlock/fold-preview").op, "foldlock.fold-preview");
assert.equal(inferProductOp("/p/foldlock/fold-preview").product, "foldlock");
assert.equal(inferProductOp("/v1/pull/azclce").op, "azclce.pull");
assert.equal(inferProductOp("/v1/session/s1a2b3c4d5e6/exec").op, "session.exec");
assert.equal(inferProductOp("/mcp").op, "mcp");
assert.equal(inferProductOp("/v1/azpipe/arch").op, "azpipe.arch");
assert.equal(inferProductOp("/download").op, "runtime.suite_download");
assert.equal(inferProductOp("/v1/suite/download").op, "runtime.suite_download");

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
assert.equal(first.entry.version, "2.0.0-rc1");
assert.equal(first.entry.git_sha, undefined);
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
assert.equal((await readUses({})).uses_complete, false);
assert.equal(await peekUsesTotal({}), null);
const unboundHuman = await peekHumanUses({});
assert.equal(unboundHuman.uses, 0);
assert.equal(unboundHuman.complete, false);
assert.equal(unboundHuman.uses_kv, false);
const humanPeek = await peekHumanUses(kvEnv);
assert.equal(humanPeek.uses, 2);
assert.equal(humanPeek.complete, true);
assert.equal(humanPeek.source, "uses.total");
const lightSnap = await readUses(kvEnv, { light: true });
assert.equal(lightSnap.light, true);
assert.equal(lightSnap.uses, 2);
assert.equal(lightSnap.uses_complete, true);
assert.deepEqual(lightSnap.by_host, {});
assert.ok(USES_READ_BUDGET_MS <= 8_000);

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
assert.equal(usesRes.data.uses_complete, true);
const lightHttp = await jsonReq(env, "/v1/uses?light=1");
assert.equal(lightHttp.status, 200);
assert.equal(lightHttp.data.light, true);
assert.equal(lightHttp.data.uses, beforeRead);
assert.deepEqual(lightHttp.data.by_host, {});
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
assert.ok(openapi.data.paths["/v1/stats-rollups"]);
const llms = await (await req(env, "/llms.txt")).text();
assert.match(llms, /\/v1\/uses/);
const cite = await jsonReq(env, "/cite.json");
assert.match(cite.data.uses, /\/v1\/uses/);
const sitemap = await (await req(env, "/sitemap.xml")).text();
assert.match(sitemap, /\/v1\/uses/);

assert.ok(PRODUCTS.length >= 27);

// --- additive by_op: tool name and slug, no second total, no Softwares×slug ---
assert.equal(sanitizeUseOpToken("Softwares", { lower: false }), "Softwares");
assert.equal(sanitizeUseOpToken("softwares", { lower: false }), "softwares");
assert.equal(sanitizeUseOpToken("FoldLock"), "foldlock");
assert.equal(sanitizeUseOpToken("aziel-corpus"), "aziel-corpus");
assert.equal(sanitizeUseOpToken("4dmap"), "4dmap");
assert.equal(sanitizeUseOpToken("fraggate_call", { lower: false }), "fraggate_call");
assert.equal(sanitizeUseOpToken("mcp.Softwares", { lower: false }), "");
assert.equal(sanitizeUseOpToken("foldlock/fold-preview"), "");
assert.equal(sanitizeUseOpToken("../etc/passwd"), "");
assert.equal(sanitizeUseOpToken("<script>alert(1)</script>"), "");
assert.equal(sanitizeUseOpToken("slug|total"), "");
assert.equal(sanitizeUseOpToken("has space"), "");
assert.equal(sanitizeUseOpToken("a".repeat(49)), "");
assert.equal(sanitizeUseOpToken("a".repeat(48)), "a".repeat(48));
assert.equal(sanitizeUseOpToken(12), "");
assert.equal(sanitizeUseOpToken(""), "");
assert.equal(sanitizeUseOpKey("mcp.Softwares"), "mcp.Softwares");
assert.equal(sanitizeUseOpKey("fraggate.call.foldlock"), "fraggate.call.foldlock");
assert.equal(sanitizeUseOpKey("op|injected"), "");
assert.equal(sanitizeUseOpKey("fraggate.call.<script>"), "");

assert.equal(slugTokenFromArgs({ slug: "AZMail", op: "health" }), "azmail");
assert.equal(slugTokenFromArgs({ name: "foldlock/fold-preview" }), "foldlock");
assert.equal(slugTokenFromArgs({ name: "foldlock/fold-preview", op: "health" }), "");
assert.equal(slugTokenFromArgs({ name: "<script>", slug: "foldlock" }), "");
assert.equal(slugTokenFromArgs({ product: "spectrallock" }), "spectrallock");
assert.equal(slugTokenFromArgs({}), "");

const softwaresDetail = detailOpsForUse({
  method: "POST",
  path: "/mcp",
  body: { jsonrpc: "2.0", id: 1, method: "tools/call", params: { name: "Softwares", arguments: { slug: "foldlock" } } },
});
assert.deepEqual(softwaresDetail.ops, ["mcp.Softwares"]);
assert.equal(softwaresDetail.product, "");

const aliasDetail = detailOpsForUse({
  method: "POST",
  path: "/mcp",
  body: { method: "tools/call", params: { name: "runtime_software", arguments: {} } },
});
assert.deepEqual(aliasDetail.ops, ["mcp.runtime_software"]);
assert.equal(aliasDetail.product, "");

const listDetail = detailOpsForUse({
  method: "POST",
  path: "/mcp",
  body: { method: "tools/list" },
});
assert.deepEqual(listDetail.ops, []);

const callDetail = detailOpsForUse({
  method: "POST",
  path: "/mcp",
  body: {
    method: "tools/call",
    params: { name: "fraggate_call", arguments: { slug: "foldlock", op: "health" } },
  },
});
assert.deepEqual(callDetail.ops, ["mcp.fraggate_call", "fraggate.call.foldlock"]);
assert.equal(callDetail.product, "foldlock");

const describeMcp = detailOpsForUse({
  method: "POST",
  path: "/mcp",
  body: { method: "tools/call", params: { name: "fraggate_describe", arguments: { name: "SpectralLock" } } },
});
assert.deepEqual(describeMcp.ops, ["mcp.fraggate_describe", "fraggate.describe.spectrallock"]);

const badTool = detailOpsForUse({
  method: "POST",
  path: "/mcp",
  body: { method: "tools/call", params: { name: "mcp.Softwares", arguments: {} } },
});
assert.deepEqual(badTool.ops, []);

const httpCall = detailOpsForUse({
  method: "POST",
  path: "/v1/fraggate/call",
  body: { name: "azmail/health" },
});
assert.deepEqual(httpCall.ops, ["fraggate.call.azmail"]);

const badSlug = detailOpsForUse({
  method: "POST",
  path: "/v1/fraggate/call",
  body: { slug: "<script>alert(1)</script>", op: "health" },
});
assert.deepEqual(badSlug.ops, []);

const describeGet = detailOpsForUse({
  method: "GET",
  path: "/v1/fraggate/describe",
  search: "?slug=spectrallock",
});
assert.deepEqual(describeGet.ops, ["fraggate.describe.spectrallock"]);
assert.equal(describeGet.product, "spectrallock");

const describeXss = detailOpsForUse({
  method: "GET",
  path: "/v1/fraggate/describe",
  search: "?slug=%3Cscript%3E",
});
assert.deepEqual(describeXss.ops, []);

const describeName = detailOpsForUse({
  method: "GET",
  path: "/v1/fraggate/describe",
  search: "?name=foldlock/fold-preview",
});
assert.deepEqual(describeName.ops, ["fraggate.describe.foldlock"]);

const detailEnv = { USES: memoryUsesKv() };
const detailInc = await incrementUse(detailEnv, {
  host: "origin",
  method: "POST",
  path: "/mcp",
  status: 200,
  op: "mcp",
  extra_ops: ["mcp.Softwares", "mcp", "not safe", "mcp.Softwares", "op|injected"],
});
assert.equal(detailInc.uses, 1);
assert.equal(detailInc.entry.op, "mcp");
assert.deepEqual(detailInc.entry.ops, ["mcp", "mcp.Softwares"]);
assert.equal(detailInc.entry.product, undefined);
const detailSnap = await readUses(detailEnv);
assert.equal(detailSnap.uses, 1);
assert.equal(detailSnap.by_op.mcp, 1);
assert.equal(detailSnap.by_op["mcp.Softwares"], 1);
assert.equal(detailSnap.by_path["/mcp"], 1);
assert.equal(Object.keys(detailSnap.by_op).length, 2);

const detailHttp = envWithUses();
const beforeDetail = Number(await detailHttp.USES.get("total")) || 0;
const softwaresCall = await jsonReq(detailHttp, "/mcp", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({
    jsonrpc: "2.0",
    id: 1,
    method: "tools/call",
    params: { name: "Softwares", arguments: { slug: "foldlock" } },
  }),
});
assert.equal(softwaresCall.status, 200);
assert.equal(softwaresCall.data.result.isError, false);
const softwaresText = softwaresCall.data.result.content[0].text;
const softwaresBody = softwaresCall.data.result.structuredContent;
assert.equal(softwaresBody.result.count, 42);
assert.match(softwaresText, /Softwares 42/);
assert.match(softwaresText, /deploy lag/);
assert.doesNotMatch(softwaresText, /"count": 42/);

await jsonReq(detailHttp, "/mcp", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({
    jsonrpc: "2.0",
    id: 2,
    method: "tools/call",
    params: { name: "fraggate_call", arguments: { slug: "foldlock", op: "health", dry_run: true } },
  }),
});
await jsonReq(detailHttp, "/mcp", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({
    jsonrpc: "2.0",
    id: 3,
    method: "tools/call",
    params: { name: "fraggate_describe", arguments: { slug: "azhub" } },
  }),
});
await jsonReq(detailHttp, "/mcp", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ jsonrpc: "2.0", id: 4, method: "tools/list" }),
});
await jsonReq(detailHttp, "/v1/fraggate/call", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ slug: "azmail", op: "health", dry_run: true }),
});
await jsonReq(detailHttp, "/v1/fraggate/call", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ slug: "<script>alert(1)</script>", op: "health" }),
});
await jsonReq(detailHttp, "/v1/fraggate/describe?slug=spectrallock");
await jsonReq(detailHttp, "/v1/fraggate/describe?slug=%3Cimg%20src=x%3E");
const softwareGet = await jsonReq(detailHttp, "/v1/software");
assert.equal(softwareGet.status, 200);
assert.equal(softwareGet.data.count, 42);

const detailUses = await readUses(detailHttp);
assert.equal(detailUses.uses, beforeDetail + 8, `detail uses total ${detailUses.uses}`);
assert.equal(detailUses.by_op.mcp, 4);
assert.equal(detailUses.by_op["mcp.Softwares"], 1);
assert.equal(detailUses.by_op["mcp.fraggate_call"], 1);
assert.equal(detailUses.by_op["mcp.fraggate_describe"], 1);
assert.equal(detailUses.by_op["fraggate.call"], 2);
assert.equal(detailUses.by_op["fraggate.call.foldlock"], 1);
assert.equal(detailUses.by_op["fraggate.call.azmail"], 1);
assert.equal(detailUses.by_op["fraggate.describe"], 2);
assert.equal(detailUses.by_op["fraggate.describe.spectrallock"], 1);
assert.equal(detailUses.by_op["fraggate.describe.azhub"], 1);
assert.equal(detailUses.by_op["fraggate.call.foldlock"], 1);
const opBlob = JSON.stringify(detailUses.by_op);
assert.doesNotMatch(opBlob, /script/i);
assert.doesNotMatch(opBlob, /<img/i);
assert.equal(detailUses.by_op["fraggate.call.softwares"], undefined);
assert.equal(detailUses.by_path["/v1/software"], undefined);
const softwaresRecent = detailUses.recent.find((row) => row.op === "mcp" && Array.isArray(row.ops) && row.ops.includes("mcp.Softwares"));
assert.ok(softwaresRecent);
assert.equal(softwaresRecent.product, undefined);
assert.equal(Number(await detailHttp.USES.get("total")), detailUses.uses);

console.log(`ok uses ${RUNTIME_VERSION}: normalize, skip, mock KV increment/read, GET /v1/uses no increment, by_op tool/slug detail`);
