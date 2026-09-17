/**
 * F03–F05 — rate / body / deadline, security headers, durability labels
 * (audit 2026-09-17 on tip d4c6e66).
 * Author: Aziel Eliab. Identity is Aziel Eliab only.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { PRODUCTS } from "../src/index.js";
import { RUNTIME_VERSION } from "../src/runtime-api.js";
import { memorySessionNamespace } from "../src/session-do.js";
import { memoryChainWriterNamespace } from "../src/chainlock/writer-do.js";
import { memoryRateQuotaNamespace } from "../src/rate-quota.js";
import { LEDGER_CAP, resetLedger } from "../src/fraggate/ledger.js";
import {
  RATE_FRAGGATE_CALL_PER_MIN,
  RATE_MCP_PER_MIN,
  RATE_OPEN_PER_MIN,
  rateLimitDecision,
  rateLimitFailBody,
} from "../src/production.js";
import { CODE_BODY_TOO_DEEP, CODE_BODY_TOO_LARGE, CODE_RATE_LIMIT, CODE_REQUEST_DEADLINE, MAX_BODY_BYTES, MAX_JSON_DEPTH, deadlineExceeded, jsonStructureStats, requestLimitKind, withDeadline } from "../src/request-limits.js";
import { applySecurityHeaders, securityHeaders } from "../src/security-headers.js";
import { MEMORY_STORE_IS_DURABLE, durabilityLabels } from "../src/durability-labels.js";
import { PUBLIC_MCP_TOOLS } from "../src/fraggate/codes.js";

const handler = (await import("../src/index.js")).default.fetch;
const origin = "https://aziel-runtime.example";

resetLedger();

function baseEnv(extra = {}) {
  const env = { ...extra };
  env.SESSION = extra.SESSION === null ? undefined : extra.SESSION || memorySessionNamespace(env);
  return env;
}

async function req(env, path, init = {}) {
  return handler(new Request(origin + path, init), env);
}

async function jsonReq(env, path, method, body, headers = {}) {
  const init = {
    method,
    headers: { "content-type": "application/json", ...headers },
  };
  if (body !== undefined && method !== "GET" && method !== "HEAD") {
    init.body = typeof body === "string" ? body : JSON.stringify(body);
  }
  const res = await req(env, path, init);
  let data;
  try {
    data = await res.json();
  } catch {
    data = null;
  }
  return { status: res.status, data, headers: res.headers };
}

function assertSecurityHeaders(headers, kind, label) {
  assert.equal(headers.get("X-Frame-Options"), "DENY", `${label} X-Frame-Options`);
  assert.equal(headers.get("X-Content-Type-Options"), "nosniff", `${label} nosniff`);
  assert.equal(headers.get("Referrer-Policy"), "no-referrer", `${label} Referrer-Policy`);
  assert.match(headers.get("Strict-Transport-Security") || "", /max-age=31536000/, `${label} HSTS`);
  const csp = headers.get("Content-Security-Policy") || "";
  assert.match(csp, /frame-ancestors 'none'/, `${label} CSP frame-ancestors`);
  if (kind === "html") {
    assert.match(csp, /script-src 'unsafe-inline'/, `${label} HTML CSP script`);
    assert.match(csp, /style-src 'unsafe-inline'/, `${label} HTML CSP style`);
  } else {
    assert.match(csp, /default-src 'none'/, `${label} API CSP`);
  }
}

function assertDurability(block, label, env) {
  assert.ok(block && typeof block === "object", `${label} durability object`);
  assert.equal(block.fraggate_ledger.window_cap, LEDGER_CAP, `${label} ledger cap`);
  assert.equal(block.fraggate_ledger.ephemeral_window, true, `${label} ledger ephemeral window`);
  assert.equal(block.fraggate_ledger.memory_store_is_durable, false, `${label} ledger MemoryStore`);
  assert.equal(block.fraggate_ledger.public_qxact_ledger, false, `${label} not Q×act`);
  assert.equal(block.chainlock.memory_store_is_durable, false, `${label} chainlock MemoryStore`);
  assert.equal(block.memory_store.durable, false, `${label} MemoryStore durable`);
  assert.equal(block.memory_store.durable_commit, false, `${label} MemoryStore commit`);
  assert.equal(block.akm_memory.durable, false, `${label} AKM durable`);
  assert.doesNotMatch(JSON.stringify(block), /OAuth|doi:|framagit|/i, `${label} no invented claims`);
  const expectChain = Boolean(env && env.CHAINLOCK);
  const expectSession = Boolean(env && env.SESSION);
  assert.equal(block.chainlock.durable_commit, expectChain, `${label} chainlock commit flag`);
  assert.equal(block.session.durable_commit, expectSession, `${label} session commit flag`);
  assert.equal(MEMORY_STORE_IS_DURABLE, false);
}

// --- helpers ---
assert.equal(requestLimitKind("/v1/fraggate/call", "POST"), "fraggate_call");
assert.equal(requestLimitKind("/v1/fraggate/list", "GET"), "fraggate_read");
assert.equal(requestLimitKind("/mcp", "POST"), "mcp");
assert.equal(requestLimitKind("/v1/session/open", "POST"), null);
assert.equal(RATE_FRAGGATE_CALL_PER_MIN, 240);
assert.equal(RATE_MCP_PER_MIN, 240);
assert.equal(RATE_OPEN_PER_MIN, 20);
assert.equal(rateLimitFailBody({ scope: "fraggate_call", limit: 3, window_seconds: 60, retry_after: 1 }).code, CODE_RATE_LIMIT);
assert.equal(jsonStructureStats({ a: { b: { c: 1 } } }).depth, 3);
assert.equal(jsonStructureStats({ a: 1 }, 1).too_deep, true);
assert.equal(deadlineExceeded(0, 25_000, 25_000), true);
assert.equal(deadlineExceeded(0, 24_999, 25_000), false);

const timed = await withDeadline(new Promise((resolve) => setTimeout(() => resolve("late"), 40)), 5, () => "deadline");
assert.equal(timed, "deadline");
const timely = await withDeadline(Promise.resolve("ok"), 50, () => "deadline");
assert.equal(timely, "ok");

const apiH = securityHeaders("api");
assert.equal(apiH["X-Frame-Options"], "DENY");
const htmlH = securityHeaders("html");
assert.match(htmlH["Content-Security-Policy"], /unsafe-inline/);
const stamped = applySecurityHeaders(new Response("{}", { headers: { "content-type": "application/json" } }));
assert.equal(stamped.headers.get("X-Content-Type-Options"), "nosniff");

assert.deepEqual(PUBLIC_MCP_TOOLS.slice(), PUBLIC_MCP_TOOLS.slice(), "tool list identity");
assert.ok(PUBLIC_MCP_TOOLS.includes("fraggate_call"));
assert.ok(!PUBLIC_MCP_TOOLS.includes("rate_limit"));

const wrangler = readFileSync(new URL("../wrangler.toml", import.meta.url), "utf8");
assert.match(wrangler, /name = "RATE"/);
assert.match(wrangler, /class_name = "RateQuota"/);
assert.match(wrangler, /tag = "v3"/);
assert.doesNotMatch(wrangler, /OAuth|doi:|framagit|/i);

// --- F03 HTTP FragGate + MCP rate-limit refuses ---
const rateEnv = baseEnv({
  __aziel_rate_limits: { fraggate_call: 3, fraggate_read: 3, mcp: 3 },
});
for (let i = 0; i < 3; i++) {
  const ok = await jsonReq(rateEnv, "/v1/fraggate/call", "POST", { slug: "vibelock", op: "health" }, { "CF-Connecting-IP": "203.0.113.9" });
  assert.equal(ok.status, 200, `fraggate call ${i + 1}`);
  assert.equal(ok.data.code, "FG-OK");
}
const limitedFg = await jsonReq(rateEnv, "/v1/fraggate/call", "POST", { slug: "vibelock", op: "health" }, { "CF-Connecting-IP": "203.0.113.9" });
assert.equal(limitedFg.status, 429);
assert.equal(limitedFg.data.code, CODE_RATE_LIMIT);
assert.equal(limitedFg.data.scope, "fraggate_call");
assert.equal(limitedFg.data.limit, 3);
assert.ok(limitedFg.headers.get("Retry-After"));
assert.equal(limitedFg.data.enforcement, "isolate");

const otherIp = await jsonReq(rateEnv, "/v1/fraggate/call", "POST", { slug: "vibelock", op: "health" }, { "CF-Connecting-IP": "203.0.113.10" });
assert.equal(otherIp.status, 200);

for (let i = 0; i < 3; i++) {
  const read = await jsonReq(rateEnv, "/v1/fraggate/list", "GET", undefined, { "CF-Connecting-IP": "203.0.113.11" });
  assert.equal(read.status, 200, `fraggate read ${i + 1}`);
}
const limitedRead = await jsonReq(rateEnv, "/v1/fraggate/list", "GET", undefined, { "CF-Connecting-IP": "203.0.113.11" });
assert.equal(limitedRead.status, 429);
assert.equal(limitedRead.data.code, CODE_RATE_LIMIT);
assert.equal(limitedRead.data.scope, "fraggate_read");

for (let i = 0; i < 3; i++) {
  const mcp = await jsonReq(
    rateEnv,
    "/mcp",
    "POST",
    { jsonrpc: "2.0", id: i, method: "ping", params: {} },
    { "CF-Connecting-IP": "203.0.113.12" },
  );
  assert.equal(mcp.status, 200, `mcp ${i + 1}`);
}
const limitedMcp = await jsonReq(
  rateEnv,
  "/mcp",
  "POST",
  { jsonrpc: "2.0", id: 99, method: "ping", params: {} },
  { "CF-Connecting-IP": "203.0.113.12" },
);
assert.equal(limitedMcp.status, 429);
assert.equal(limitedMcp.data.code, CODE_RATE_LIMIT);
assert.equal(limitedMcp.data.scope, "mcp");

const helperEnv = { __aziel_rate_limits: { fraggate_call: 2 } };
const reqA = new Request(origin + "/v1/fraggate/call", { headers: { "CF-Connecting-IP": "198.51.100.1" } });
assert.equal(rateLimitDecision(helperEnv, reqA, "fraggate_call").ok, true);
assert.equal(rateLimitDecision(helperEnv, reqA, "fraggate_call").ok, true);
assert.equal(rateLimitDecision(helperEnv, reqA, "fraggate_call").ok, false);

// Distributed RATE Durable Object
const doEnv = baseEnv({
  RATE: memoryRateQuotaNamespace({}),
  __aziel_rate_limits: { fraggate_call: 2 },
});
const doOk1 = await jsonReq(doEnv, "/v1/fraggate/call", "POST", { slug: "vibelock", op: "health" }, { "CF-Connecting-IP": "198.51.100.8" });
const doOk2 = await jsonReq(doEnv, "/v1/fraggate/call", "POST", { slug: "vibelock", op: "health" }, { "CF-Connecting-IP": "198.51.100.8" });
const doLimited = await jsonReq(doEnv, "/v1/fraggate/call", "POST", { slug: "vibelock", op: "health" }, { "CF-Connecting-IP": "198.51.100.8" });
assert.equal(doOk1.status, 200);
assert.equal(doOk2.status, 200);
assert.equal(doLimited.status, 429);
assert.equal(doLimited.data.code, CODE_RATE_LIMIT);
assert.equal(doLimited.data.enforcement, "durable-object");

// --- F03 body / depth ---
const bodyEnv = baseEnv();
const tooBig = await req(bodyEnv, "/v1/fraggate/call", {
  method: "POST",
  headers: { "content-type": "application/json", "content-length": String(MAX_BODY_BYTES + 1) },
  body: "{}",
});
assert.equal(tooBig.status, 413);
const tooBigBody = await tooBig.json();
assert.equal(tooBigBody.code, CODE_BODY_TOO_LARGE);
assert.equal(tooBigBody.cap, MAX_BODY_BYTES);

function nest(depth) {
  let v = { leaf: true };
  for (let i = 0; i < depth; i++) v = { child: v };
  return v;
}
const deep = await jsonReq(bodyEnv, "/v1/fraggate/call", "POST", nest(MAX_JSON_DEPTH + 2));
assert.equal(deep.status, 400);
assert.equal(deep.data.code, CODE_BODY_TOO_DEEP);
assert.equal(deep.data.reason, "depth");

const mcpDeep = await jsonReq(bodyEnv, "/mcp", "POST", { jsonrpc: "2.0", id: 1, method: "ping", params: nest(MAX_JSON_DEPTH + 2) });
assert.equal(mcpDeep.status, 400);
assert.equal(mcpDeep.data.code, CODE_BODY_TOO_DEEP);

const deadlineRes = await withDeadline(
  new Promise((resolve) => setTimeout(() => resolve({ status: 200 }), 30)),
  1,
  () => ({ status: 408, data: { code: CODE_REQUEST_DEADLINE } }),
);
assert.equal(deadlineRes.status, 408);
assert.equal(deadlineRes.data.code, CODE_REQUEST_DEADLINE);

// --- F04 headers on HTML + API + product homepage ---
const headEnv = baseEnv();
const ready = await jsonReq(headEnv, "/v1/ready", "GET");
assert.equal(ready.status, 200);
assertSecurityHeaders(ready.headers, "api", "/v1/ready");

const fg = await jsonReq(headEnv, "/v1/fraggate", "GET");
assert.equal(fg.status, 200);
assertSecurityHeaders(fg.headers, "api", "/v1/fraggate");

const health = await jsonReq(headEnv, "/v1/health", "GET");
assert.equal(health.status, 200);
assertSecurityHeaders(health.headers, "api", "/v1/health");

const home = await req(headEnv, "/", { headers: { accept: "text/html" } });
assert.equal(home.status, 200);
assertSecurityHeaders(home.headers, "html", "/");
assert.match(home.headers.get("Content-Type") || "", /text\/html/);

const product = await req(headEnv, `/p/${PRODUCTS[0].slug}`, { headers: { accept: "text/html" } });
assert.equal(product.status, 200, "product homepage");
assertSecurityHeaders(product.headers, "html", `/p/${PRODUCTS[0].slug}`);

const mcpGet = await jsonReq(headEnv, "/mcp", "GET");
assert.equal(mcpGet.status, 200);
assertSecurityHeaders(mcpGet.headers, "api", "GET /mcp");

const options = await req(headEnv, "/v1/fraggate/call", { method: "OPTIONS" });
assert.equal(options.status, 204);
assertSecurityHeaders(options.headers, "api", "OPTIONS");

// --- F05 ready / mesh / fraggate labels ---
const labelEnv = baseEnv();
assertDurability(ready.data.durability, "ready isolate", labelEnv);
assert.equal(ready.data.durability.fraggate_ledger.durable_commit, false);
assert.match(ready.data.durability.fraggate_ledger.durable_commit_label, /MemoryStore — not durable/);
assert.match(ready.data.durability.memory_store.note, /Not a durable commit/);

assertDurability(fg.data.durability, "fraggate isolate", labelEnv);
const fgList = await jsonReq(labelEnv, "/v1/fraggate/list", "GET");
assert.equal(fgList.status, 200);
assertDurability(fgList.data.durability, "fraggate list", labelEnv);

const mesh = await jsonReq(labelEnv, "/v1/mesh", "GET");
assert.equal(mesh.status, 200);
assertDurability(mesh.data.durability, "mesh isolate", labelEnv);

const call = await jsonReq(labelEnv, "/v1/fraggate/call", "POST", { slug: "vibelock", op: "health" });
assert.equal(call.status, 200);
assert.equal(call.data.ledger_tip.window_cap, LEDGER_CAP);
assert.equal(call.data.ledger_tip.ephemeral_window, true);
assert.equal(call.data.ledger_tip.memory_store_is_durable, false);

const boundEnv = baseEnv({
  CHAINLOCK: memoryChainWriterNamespace({}),
  RATE: memoryRateQuotaNamespace({}),
});
const readyBound = await jsonReq(boundEnv, "/v1/ready", "GET");
assert.equal(readyBound.status, 200);
assertDurability(readyBound.data.durability, "ready bound", boundEnv);
assert.equal(readyBound.data.durability.fraggate_ledger.durable_commit, true);
assert.equal(readyBound.data.durability.chainlock.durable_commit, true);
assert.equal(readyBound.data.durability.session.durable_commit, true);
assert.equal(readyBound.data.durability.rate_quota.durable_commit, true);
assert.match(readyBound.data.durability.fraggate_ledger.durable_commit_label, /CHAINLOCK/);
assert.match(readyBound.data.durability.session.durable_commit_label, /SESSION/);
assert.equal(readyBound.data.durability.memory_store.durable, false);

const meshBound = await jsonReq(boundEnv, "/v1/mesh", "GET");
assertDurability(meshBound.data.durability, "mesh bound", boundEnv);
const fgBound = await jsonReq(boundEnv, "/v1/fraggate", "GET");
assertDurability(fgBound.data.durability, "fraggate bound", boundEnv);

const labels = durabilityLabels({});
assert.equal(labels.memory_store.durable, false);
assert.equal(labels.fraggate_ledger.ephemeral_window, true);

assert.equal(RUNTIME_VERSION, "2.0.0-rc1");
console.log("ok F03-F05: RATE_LIMIT/BODY_TOO_LARGE/BODY_TOO_DEEP + security headers + ephemeral/durable labels");
