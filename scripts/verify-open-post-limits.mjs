/**
 * Open POST abuse limits for mesh and memory, including sot-sync.
 * HTML, GET, and crawler reads stay outside the mutate buckets.
 * Author: Aziel Eliab. Identity is Aziel Eliab only.
 */
import assert from "node:assert/strict";
import { memorySessionNamespace } from "../src/session-do.js";
import { RATE_WINDOW_MS, rateLimitDecision } from "../src/production.js";
import { CODE_RATE_LIMIT, requestLimitKind } from "../src/request-limits.js";
import { resetSotStore, sotLedgerView } from "../src/sot-sync.js";

const handler = (await import("../src/index.js")).default.fetch;
const origin = "https://aziel-runtime.example";

function baseEnv(extra = {}) {
  return {
    SESSION: memorySessionNamespace({}),
    sotFetch: async () => new Response("{}", { status: 200, headers: { "content-type": "application/json" } }),
    ...extra,
  };
}

async function jsonReq(env, path, method, body, headers = {}) {
  const init = { method, headers: { "content-type": "application/json", ...headers } };
  if (body !== undefined && method !== "GET" && method !== "HEAD") {
    init.body = typeof body === "string" ? body : JSON.stringify(body);
  }
  const res = await handler(new Request(origin + path, init), env);
  let data = null;
  const text = await res.text();
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = { raw: text.slice(0, 120) };
    }
  }
  return { status: res.status, data, headers: res.headers };
}

assert.equal(requestLimitKind("/v1/mesh/sot-sync", "POST"), "mesh_mutate");
assert.equal(requestLimitKind("/v1/mesh/SOT-SYNC/", "POST"), "mesh_mutate");
assert.equal(requestLimitKind("/v1/fedmesh/isolation", "POST"), "mesh_mutate");
assert.equal(requestLimitKind("/v1/mesh/enable", "POST"), "mesh_mutate");
assert.equal(requestLimitKind("/v1/mesh/disable", "POST"), "mesh_mutate");
assert.equal(requestLimitKind("/v1/mesh/lie", "POST"), "mesh_mutate");
assert.equal(requestLimitKind("/v1/mesh/rewrite", "POST"), "mesh_mutate");
assert.equal(requestLimitKind("/v1/mesh/join", "POST"), "mesh_mutate");
assert.equal(requestLimitKind("/v1/memory", "POST"), "memory_mutate");
assert.equal(requestLimitKind("/v1/memory/observe", "POST"), "memory_mutate");
assert.equal(requestLimitKind("/v1/memory/resolve", "POST"), "memory_mutate");
assert.equal(requestLimitKind("/v1/mesh/sot-sync", "GET"), null);
assert.equal(requestLimitKind("/v1/mesh", "GET"), null);
assert.equal(requestLimitKind("/", "GET"), null);
assert.equal(requestLimitKind("/robots.txt", "GET"), null);
assert.equal(requestLimitKind("/v1/session/open", "POST"), null);

const t0 = 1_700_000_000_000;
const resetEnv = { __aziel_rate_limits: { mesh_mutate: 1 } };
const resetReq = new Request(origin + "/v1/mesh/sot-sync", { headers: { "CF-Connecting-IP": "203.0.113.80" } });
assert.equal(rateLimitDecision(resetEnv, resetReq, "mesh_mutate", t0).ok, true);
const held = rateLimitDecision(resetEnv, resetReq, "mesh_mutate", t0 + 10);
assert.equal(held.ok, false);
assert.equal(held.scope, "mesh_mutate");
const reopened = rateLimitDecision(resetEnv, resetReq, "mesh_mutate", t0 + RATE_WINDOW_MS + 1);
assert.equal(reopened.ok, true, "the sliding window drops expired hits");

resetSotStore();
const meshEnv = baseEnv({ __aziel_rate_limits: { mesh_mutate: 2, memory_mutate: 2 } });
const ip = { "CF-Connecting-IP": "203.0.113.50" };
const beforeMesh = await jsonReq(meshEnv, "/v1/mesh", "GET", undefined, ip);
assert.equal(beforeMesh.status, 200);
assert.equal(beforeMesh.data.radio_phy, false);
assert.equal(beforeMesh.data.packet_path_live, true);
const beforeLedger = sotLedgerView();
const enabledBefore = beforeMesh.data.enabled;

const missing = await jsonReq(meshEnv, "/v1/mesh/sot-sync", "POST", {}, ip);
assert.equal(missing.status, 400);
assert.equal(missing.data.code, "SOT-CONFIRM-REQUIRED");
assert.equal(missing.data.receipt, null);
assert.deepEqual(sotLedgerView(), beforeLedger);

const broken = await jsonReq(meshEnv, "/v1/mesh/sot-sync", "POST", "{", ip);
assert.equal(broken.status, 400);
assert.equal(broken.data.code, "SOT-CONFIRM-REQUIRED");
assert.deepEqual(sotLedgerView(), beforeLedger);

const burst = await jsonReq(meshEnv, "/v1/mesh/sot-sync", "POST", { confirm: true }, ip);
assert.equal(burst.status, 429);
assert.equal(burst.data.code, CODE_RATE_LIMIT);
assert.equal(burst.data.scope, "mesh_mutate");
assert.ok(burst.headers.get("Retry-After"));
assert.deepEqual(sotLedgerView(), beforeLedger);

const spoofedForward = await jsonReq(meshEnv, "/v1/mesh/sot-sync", "POST", { confirm: true }, {
  "CF-Connecting-IP": "203.0.113.50",
  "X-Forwarded-For": "198.51.100.77",
});
assert.equal(spoofedForward.status, 429);
assert.deepEqual(sotLedgerView(), beforeLedger);

const spoofedLeg = await jsonReq(meshEnv, "/v1/mesh/enable", "POST", { bearer: "suite-presence" }, {
  "CF-Connecting-IP": "203.0.113.50",
  "X-Azrt-Client-IP": "198.51.100.9",
});
assert.equal(spoofedLeg.status, 429);

const override = await jsonReq(meshEnv, "/v1/mesh/lie", "POST", {}, {
  "CF-Connecting-IP": "203.0.113.50",
  "X-HTTP-Method-Override": "GET",
});
assert.equal(override.status, 429);

const upper = await jsonReq(meshEnv, "/v1/mesh/SOT-SYNC/", "POST", { confirm: true }, ip);
assert.equal(upper.status, 429);
assert.deepEqual(sotLedgerView(), beforeLedger);

const afterMesh = await jsonReq(meshEnv, "/v1/mesh", "GET", undefined, ip);
assert.equal(afterMesh.status, 200);
assert.equal(afterMesh.data.enabled, enabledBefore);
assert.equal(afterMesh.data.radio_phy, false);
assert.equal(afterMesh.data.packet_path_live, true);

const other = await jsonReq(meshEnv, "/v1/mesh/lie", "POST", {}, { "CF-Connecting-IP": "203.0.113.51" });
assert.equal(other.status, 400);
assert.equal(other.data.code, "MESH-NO-LIE");
assert.equal((await jsonReq(meshEnv, "/v1/mesh", "GET")).data.enabled, enabledBefore);

const v6Env = baseEnv({ __aziel_rate_limits: { mesh_mutate: 1 } });
const v6a = await jsonReq(v6Env, "/v1/mesh/disable", "POST", {}, { "CF-Connecting-IP": "2001:db8:aa:bb::1" });
assert.notEqual(v6a.status, 429);
const v6same = await jsonReq(v6Env, "/v1/mesh/disable", "POST", {}, { "CF-Connecting-IP": "2001:db8:aa:bb::abcd" });
assert.equal(v6same.status, 429, "one IPv6 /64 shares mesh_mutate");
const v6other = await jsonReq(v6Env, "/v1/mesh/disable", "POST", {}, { "CF-Connecting-IP": "2001:db8:cc:dd::1" });
assert.notEqual(v6other.status, 429);

for (let i = 0; i < 5; i++) {
  const home = await jsonReq(meshEnv, "/", "GET", undefined, ip);
  assert.equal(home.status, 200, `html ${i}`);
  const robots = await handler(new Request(origin + "/robots.txt", { headers: ip }), meshEnv);
  assert.equal(robots.status, 200);
  const meshRead = await jsonReq(meshEnv, "/v1/mesh", "GET", undefined, ip);
  assert.equal(meshRead.status, 200);
}
const readOverride = await jsonReq(meshEnv, "/v1/mesh", "GET", undefined, {
  ...ip,
  "X-HTTP-Method-Override": "POST",
});
assert.equal(readOverride.status, 200);

const memoryEnv = baseEnv({ __aziel_rate_limits: { memory_mutate: 2 } });
const memIp = { "CF-Connecting-IP": "203.0.113.60" };
const beforeNodes = (await jsonReq(memoryEnv, "/v1/memory", "GET", undefined, memIp)).data.nodes;
const badResolve = await jsonReq(memoryEnv, "/v1/memory/resolve", "POST", {}, memIp);
assert.equal(badResolve.status, 400);
assert.equal(badResolve.data.code, "AKM-NO-MEMORY");
const badAgain = await jsonReq(memoryEnv, "/v1/memory/delete", "POST", { memory_id: "missing" }, memIp);
assert.equal(badAgain.status, 400);
assert.equal(badAgain.data.code, "AKM-STUB");
assert.equal((await jsonReq(memoryEnv, "/v1/memory", "GET")).data.nodes, beforeNodes);
const memBurst = await jsonReq(memoryEnv, "/v1/memory/observe", "POST", { subject: "limit", fact: "must not land" }, memIp);
assert.equal(memBurst.status, 429);
assert.equal(memBurst.data.scope, "memory_mutate");
assert.equal((await jsonReq(memoryEnv, "/v1/memory", "GET")).data.nodes, beforeNodes);
const memSpoof = await jsonReq(memoryEnv, "/v1/memory/observe", "POST", { subject: "limit", fact: "spoof" }, {
  "CF-Connecting-IP": "203.0.113.60",
  "X-Forwarded-For": "198.51.100.60",
});
assert.equal(memSpoof.status, 429);
assert.equal((await jsonReq(memoryEnv, "/v1/memory", "GET")).data.nodes, beforeNodes);
const memOther = await jsonReq(memoryEnv, "/v1/memory/observe", "POST", { subject: "kept", fact: "a real observation" }, {
  "CF-Connecting-IP": "203.0.113.61",
});
assert.notEqual(memOther.status, 429);
if (memOther.status === 200) {
  assert.equal((await jsonReq(memoryEnv, "/v1/memory", "GET")).data.nodes, beforeNodes + 1);
}

const token = "runtime-token-test-value";
const locked = baseEnv({ REQUIRE_TOKEN: "1", RUNTIME_TOKEN: token });
const noToken = await jsonReq(locked, "/v1/session/open", "POST", {});
assert.equal(noToken.status, 401);
const wrongToken = await jsonReq(locked, "/v1/session/open", "POST", {}, { "X-Aziel-Runtime-Token": "not-the-token" });
assert.equal(wrongToken.status, 401);
const queryToken = await jsonReq(locked, "/v1/session/open?token=" + token, "POST", {}, { "X-Aziel-Runtime-Token": token });
assert.equal(queryToken.status, 400);
assert.notEqual(queryToken.data.code, "FG-OK");

console.log("ok open-post-limits: mesh_mutate and memory_mutate cover sot-sync and the other open POSTs");
