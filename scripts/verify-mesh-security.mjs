/**
 * SEC-FEAT-1.0 + NODE_MESH + NODE-OPS-1.0 close-test matrix.
 *
 * Fail closed on mesh/security regressions. Does not add or remove MCP tools.
 * Does not invent OAuth / DOI / Framagit / Glama UUID / fielded-100.
 * Does not flip Remain-OFF. FragGate stays THE single door.
 *
 * Author: Aziel Eliab only. Lamb Lens. NO-LIE.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { PRODUCTS } from "../src/index.js";
import { PUBLIC_MCP_TOOLS, PUBLIC_FABRIC_TOOLS } from "../src/fraggate/codes.js";
import { buildMcpToolList } from "../src/mcp-surface.js";
import { sessionMcpTools } from "../src/session-http.js";
import { RUNTIME_VERSION } from "../src/runtime-api.js";
import { memorySessionNamespace } from "../src/session-do.js";
import { LIVE_OPS, STUB_OPS, classifyCall, parseTarget, buildRegistry } from "../src/fraggate/registry.js";
import { CAP7_RESOLVES_TO_HUB } from "../src/semantic-bridge.js";
import {
  EXAMPLE_BEARER,
  MESH_DEFAULT,
  MESH_DEFAULT_ENABLED,
  MESH_LIVE_OPS,
  MESH_MCP_TOOLS,
  MESH_SLUG,
  MESH_SPEC,
  PRESENCE_TTL_MS,
  PRESENCE_STATES,
  SUITE_PRESENCE,
  isEphemeralMeshNodeId,
  isInstanceMeshNodeId,
  isSoftwareWorkerNodeId,
  meshCiteField,
  meshFanoutSuitePresence,
  memoryMeshKv,
  resetMeshClock,
  resetMeshStore,
  runMeshOp,
  sanitizeNodeId,
  sanitizeProduct,
  setMeshNowMs,
  suitePresenceNodeId,
} from "../src/mesh.js";

const handler = (await import("../src/index.js")).default.fetch;
const origin = "https://aziel-runtime.example";
const meshSrc = readFileSync(new URL("../src/mesh.js", import.meta.url), "utf8");
const secFeat = readFileSync(new URL("../docs/designs/SEC-FEAT-1.0.md", import.meta.url), "utf8");
const nodeMesh = readFileSync(new URL("../docs/NODE_MESH.md", import.meta.url), "utf8");
const nodeOps = readFileSync(new URL("../docs/designs/NODE-OPS-1.0.md", import.meta.url), "utf8");

const FROZEN_MESH_TOOLS = Object.freeze([
  "mesh_status",
  "mesh_enable",
  "mesh_disable",
  "mesh_join",
  "mesh_heartbeat",
  "mesh_leave",
  "mesh_nodes",
  "mesh_broadcast",
]);
const FROZEN_PUBLIC_TOOL_COUNT = 36;

const gates = [];
function gate(id, title) {
  gates.push({ id, title, ok: true });
  return id;
}

resetMeshStore();

function envWithMesh(extra = {}) {
  return {
    SESSION: memorySessionNamespace({}),
    USES: memoryMeshKv(),
    ...extra,
  };
}

function waitUntilCtx() {
  const jobs = [];
  return {
    ctx: {
      waitUntil(p) {
        jobs.push(Promise.resolve(p));
      },
    },
    async flush() {
      const pending = jobs.splice(0);
      await Promise.all(pending);
    },
  };
}

async function req(env, path, init = {}, ctx) {
  return handler(
    new Request(origin + path, { headers: { "user-agent": "Mozilla/5.0" }, ...init }),
    env,
    ctx,
  );
}

async function jsonReq(env, path, init = {}, ctx) {
  const res = await req(env, path, init, ctx);
  let data;
  try {
    data = await res.json();
  } catch {
    data = null;
  }
  return { status: res.status, data };
}

async function postJson(env, path, body, ctx) {
  return jsonReq(
    env,
    path,
    {
      method: "POST",
      headers: { "content-type": "application/json", "user-agent": "Mozilla/5.0" },
      body: JSON.stringify(body || {}),
    },
    ctx,
  );
}

async function mcp(env, method, params = {}, id = 1) {
  const res = await req(env, "/mcp", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id, method, params }),
  });
  return res.json();
}

function rosterIds(data) {
  return (data && Array.isArray(data.nodes) ? data.nodes : []).map((n) => n.node_id);
}

/** Roster read that does not start request-path fan-out (avoids a floating write race). */
async function rosterOp(env) {
  return runMeshOp("nodes", {}, env);
}

async function ageNode(kv, nodeId, ageMs, prefix = "mesh|") {
  const raw = JSON.parse((await kv.get(`${prefix}nodes`)) || "{}");
  assert.ok(raw[nodeId], `ageNode: missing ${nodeId}`);
  raw[nodeId].last_seen = new Date(Date.now() - ageMs).toISOString();
  await kv.put(`${prefix}nodes`, JSON.stringify(raw));
}

async function readLastSeen(kv, nodeId, prefix = "mesh|") {
  const raw = JSON.parse((await kv.get(`${prefix}nodes`)) || "{}");
  return raw[nodeId] && raw[nodeId].last_seen;
}

// --- law papers (cite honesty; do not invent shelves / DOI / Framagit) ---
assert.match(secFeat, /Author: Aziel Eliab only/);
assert.match(secFeat, /GET \/v1\/mesh never enables/);
assert.match(secFeat, /NO-LIE \/ NO-REWRITE/);
assert.match(nodeMesh, /suite-presence is ON/);
assert.match(nodeMesh, /MESH-DISABLE-REFUSED/);
assert.match(nodeMesh, /Presence TTL is \*\*5 minutes\*\*|presence TTL is \*\*5 minutes\*\*|TTL is \*\*5 minutes\*\*|Presence TTL is \*\*5 minutes\*\*/i);
assert.match(nodeMesh, /resolves_to_hub: false/);
assert.doesNotMatch(nodeMesh, /fielded-100|glama uuid|oauth idp/i);
assert.match(nodeOps, /GET does not change mesh state|GET \/v1\/mesh never enables/);
assert.match(nodeOps, /Author: Aziel Eliab only/);
gate("LAW-CITE", "SEC-FEAT / NODE_MESH / NODE-OPS cite Aziel Eliab + GET-never-enables");

// --- constants / default-on ---
assert.equal(MESH_DEFAULT_ENABLED, true);
assert.equal(MESH_DEFAULT, "on");
assert.equal(SUITE_PRESENCE, "on");
assert.equal(MESH_SPEC, "QNM-BUILD-1.0");
assert.equal(EXAMPLE_BEARER, "suite-presence");
assert.equal(PRESENCE_TTL_MS, 5 * 60 * 1000);
assert.deepEqual(PRESENCE_STATES.slice(), ["live", "locked", "isolated"]);
assert.deepEqual(MESH_MCP_TOOLS.slice(), FROZEN_MESH_TOOLS.slice());
assert.deepEqual(
  PUBLIC_FABRIC_TOOLS.filter((n) => n.startsWith("mesh_")),
  FROZEN_MESH_TOOLS.slice(),
);
assert.equal(PUBLIC_MCP_TOOLS.length, FROZEN_PUBLIC_TOOL_COUNT);
assert.equal(CAP7_RESOLVES_TO_HUB, false);
gate("CONST", "suite-presence ON; TTL 5 min; mesh MCP names frozen; Cap-7 resolves_to_hub false");

const env = envWithMesh();

// --- GET never enables extra radios ---
const firstGet = await jsonReq(env, "/v1/mesh");
assert.equal(firstGet.status, 200);
assert.equal(firstGet.data.enabled, true);
assert.equal(firstGet.data.mesh_default, "on");
assert.equal(firstGet.data.suite_presence, "on");
assert.equal(firstGet.data.get_never_enables, true);
assert.equal(firstGet.data.radios, "on");
assert.deepEqual(firstGet.data.bearers, ["suite-presence"]);
assert.equal(firstGet.data.no_lie, true);
assert.equal(firstGet.data.no_rewrite, true);
assert.equal(firstGet.data.rewrite_key, false);
assert.equal(firstGet.data.lie_to_survive, false);
assert.equal(firstGet.data.live_nodes, 0, "GET without waitUntil must not invent mesh-size Live Nodes");
assert.equal(firstGet.data.software_nodes, 0, "GET without waitUntil must not join Softwares workers in the response");
assert.doesNotMatch(JSON.stringify(firstGet.data), /oauth|framagit|fielded-100|glama uuid/i);

const ping = await jsonReq(env, "/v1/mesh");
assert.deepEqual(ping.data.bearers, ["suite-presence"], "GET must not add extra radios");
assert.equal(ping.data.enabled, true);
assert.equal(ping.data.get_never_enables, true);
assert.equal(ping.data.ephemeral_nodes, 0);
gate("GET-NEVER-ENABLES", "GET /v1/mesh reports default-on and does not add join-radios");

const enableViaGet = await jsonReq(env, "/v1/mesh?enable=true");
assert.equal(enableViaGet.data.ok, false);
assert.equal(enableViaGet.data.code, "MESH-GET-NEVER-ENABLES");
assert.equal(enableViaGet.data.get_never_enables, true);
assert.equal(enableViaGet.data.enabled_by_get, false);
const afterEnableGet = await jsonReq(env, "/v1/mesh");
assert.deepEqual(afterEnableGet.data.bearers, ["suite-presence"]);
gate("GET-ENABLE-REFUSE", "GET ?enable=true refuses MESH-GET-NEVER-ENABLES");

assert.equal(firstGet.data.nine_laws.hard_true, true);
assert.equal(firstGet.data.clocks_share_socket, false);
assert.equal(firstGet.data.live_body_sync, false);
assert.equal(firstGet.data.isolation_is_the_cure, true);
assert.equal(firstGet.data.phoenix_local_only, true);
assert.equal(firstGet.data.restore_godlock_uk, false);
assert.equal(firstGet.data.neighbor_heal, true);
assert.equal(firstGet.data.node_gate, true);
assert.equal(firstGet.data.get_is_node_gate, true);
assert.equal(firstGet.data.implicit_heal, true);
assert.equal(firstGet.data.auto_heal, true);
assert.equal(firstGet.data.network, true);
assert.equal(firstGet.data.network_cite, "on");
assert.equal(firstGet.data.anonymity_network, true);
assert.equal(firstGet.data.godlock_is_identity, false);
assert.match(secFeat, /Nine QNM laws are hard-true/);
assert.match(nodeMesh, /Nine laws \(hard-true\)/);
assert.match(nodeOps, /Nine QNM laws are hard-true/);
gate("NINE-LAWS", "nine laws hard-true on GET /v1/mesh + paper cites");

// request-path fan-out refreshes {slug}-worker only — extra bearers stay off
const waited = waitUntilCtx();
const getWithFanout = await jsonReq(env, "/v1/mesh", {}, waited.ctx);
assert.deepEqual(getWithFanout.data.bearers, ["suite-presence"]);
await waited.flush();
const afterFanoutGet = await jsonReq(env, "/v1/mesh");
assert.deepEqual(afterFanoutGet.data.bearers, ["suite-presence"], "fan-out must not declare extra bearers");
assert.equal(afterFanoutGet.data.get_never_enables, true);
assert.equal(afterFanoutGet.data.live_nodes, PRODUCTS.length, "non-isolated workers add to mesh size");
assert.equal(afterFanoutGet.data.software_nodes, PRODUCTS.length);
assert.equal(afterFanoutGet.data.live_nodes, afterFanoutGet.data.active_nodes + afterFanoutGet.data.inactive_nodes);
assert.equal(afterFanoutGet.data.ephemeral_nodes, 0);
assert.ok(afterFanoutGet.data.products_present.includes("godlock"));
const nodesAfterFanout = await jsonReq(env, "/v1/mesh/nodes");
assert.ok(nodesAfterFanout.data.nodes.every((n) => isSoftwareWorkerNodeId(n.node_id)));
assert.ok(nodesAfterFanout.data.nodes.every((n) => !n.node_id.includes("|")));
gate("GET-FANOUT-READONLY", "GET+waitUntil fans out {slug}-worker only; no extra radios");

// --- public disable refused ---
const disabled = await postJson(env, "/v1/mesh/disable", {});
assert.equal(disabled.status, 400);
assert.equal(disabled.data.ok, false);
assert.equal(disabled.data.code, "MESH-DISABLE-REFUSED");
assert.equal(disabled.data.enabled, true);
assert.ok(disabled.data.bearers.includes("suite-presence"));
const afterDisable = await jsonReq(env, "/v1/mesh");
assert.equal(afterDisable.data.enabled, true);
assert.equal(afterDisable.data.software_nodes, PRODUCTS.length, "disable must not wipe software_nodes");
assert.equal(afterDisable.data.live_nodes, PRODUCTS.length, "disable must not wipe mesh-size Live Nodes");
gate("DISABLE-REFUSED", "POST /v1/mesh/disable is MESH-DISABLE-REFUSED; suite-presence stays ON");

// --- enable needs bearer ---
const emptyEnable = await postJson(env, "/v1/mesh/enable", {});
assert.equal(emptyEnable.status, 400);
assert.equal(emptyEnable.data.code, "MESH-NEED-BEARER");
assert.equal(emptyEnable.data.enabled, true);
const loginBearer = await postJson(env, "/v1/mesh/enable", { bearer: "login" });
assert.equal(loginBearer.data.code, "MESH-BAD-BEARER");
const recoverBearer = await postJson(env, "/v1/mesh/enable", { bearer: "account-recover" });
assert.equal(recoverBearer.data.code, "MESH-BAD-BEARER");
const gateBearer = await postJson(env, "/v1/mesh/enable", { bearer: "node-gate" });
assert.equal(gateBearer.data.code, "MESH-BAD-BEARER");
const extra = await postJson(env, "/v1/mesh/enable", { bearer: "ops-cell" });
assert.equal(extra.status, 200, JSON.stringify(extra.data));
assert.ok(extra.data.bearers.includes("suite-presence"));
assert.ok(extra.data.bearers.includes("ops-cell"));
gate("ENABLE-BEARER", "empty/login/gate enable refused; declared bearer is additive");

// --- mesh_join product / node_id / presence ---
const noProduct = await postJson(env, "/v1/mesh/join", {});
assert.equal(noProduct.status, 400);
assert.equal(noProduct.data.code, "MESH-BAD-INPUT");
const anon = await postJson(env, "/v1/mesh/join", { product: "anon-broadcast" });
assert.equal(anon.data.code, "MESH-BAD-INPUT");
assert.equal(sanitizeProduct("anon-broadcast"), "");
assert.equal(sanitizeProduct("godlock"), "godlock");

const shortId = await postJson(env, "/v1/mesh/join", { product: "godlock", node_id: "short07" });
assert.equal(shortId.status, 400);
assert.equal(shortId.data.code, "MESH-BAD-INPUT");
assert.equal(sanitizeNodeId("short07"), ""); // 7 chars
assert.equal(sanitizeNodeId("oknode08"), "oknode08");
assert.equal(sanitizeNodeId("a".repeat(80)), "a".repeat(80));
assert.equal(sanitizeNodeId("a".repeat(81)), "");
assert.equal(sanitizeNodeId("bad|pipe1"), "");
assert.equal(sanitizeNodeId("has space"), "");
assert.equal(sanitizeNodeId("NO-UPPER"), "");

const pipeId = await postJson(env, "/v1/mesh/join", { product: "godlock", node_id: "bad|pipe1" });
assert.equal(pipeId.data.code, "MESH-BAD-INPUT");
const longId = await postJson(env, "/v1/mesh/join", { product: "godlock", node_id: "n".repeat(81) });
assert.equal(longId.data.code, "MESH-BAD-INPUT");
const upperId = await postJson(env, "/v1/mesh/join", { product: "godlock", node_id: "NO-UPPER" });
assert.equal(upperId.data.code, "MESH-BAD-INPUT");

const badPresence = await postJson(env, "/v1/mesh/join", {
  product: "godlock",
  node_id: "presence-x",
  presence: "online",
});
assert.equal(badPresence.data.code, "MESH-BAD-INPUT");

const liveJoin = await postJson(env, "/v1/mesh/join", {
  product: "godlock",
  node_id: "oknode08",
  presence: "live",
});
assert.equal(liveJoin.status, 200, JSON.stringify(liveJoin.data));
assert.equal(liveJoin.data.session.presence, "live");
assert.equal(liveJoin.data.session.node_id, "oknode08");
assert.equal(liveJoin.data.session.presence_ttl_ms, PRESENCE_TTL_MS);

const lockedJoin = await postJson(env, "/v1/mesh/join", {
  product: "foldlock",
  node_id: "locked-node-1",
  presence: "locked",
});
assert.equal(lockedJoin.data.session.presence, "locked");
const isolatedJoin = await postJson(env, "/v1/mesh/join", {
  product: "foldlock",
  node_id: "isolated-node-1",
  presence: "isolated",
});
assert.equal(isolatedJoin.data.session.presence, "isolated");
const rosterPresence = await jsonReq(env, "/v1/mesh/nodes");
const named = rosterPresence.data.nodes.filter((n) => ["oknode08", "locked-node-1", "isolated-node-1"].includes(n.node_id));
assert.deepEqual(
  named.map((n) => n.presence).sort(),
  ["isolated", "live", "locked"],
);
gate("JOIN-SHAPE", "product required; node_id 8–80 [a-z0-9._-]; presence live|locked|isolated");

// --- MESH-OFF gate remains (latent on default-on public surface) ---
assert.match(meshSrc, /function offRefuse\(op, state\)/);
assert.match(meshSrc, /"MESH-OFF"/);
assert.match(meshSrc, /if \(!state\.enabled\) return offRefuse\("join", state\)/);
assert.match(meshSrc, /if \(!state\.enabled\) return offRefuse\("heartbeat", state\)/);
assert.match(meshSrc, /if \(!state\.enabled\) return offRefuse\("broadcast", state\)/);
assert.doesNotMatch(meshSrc, /MESH_DEFAULT_ENABLED = false/);
const radiosOffEnv = envWithMesh({ MESH_RADIOS: "off" });
const joinOff = await postJson(radiosOffEnv, "/v1/mesh/join", { product: "godlock", node_id: "radios-off" });
assert.equal(joinOff.status, 400);
assert.equal(joinOff.data.code, "MESH-OFF");
const beatOff = await runMeshOp("heartbeat", { node_id: "radios-off" }, radiosOffEnv);
assert.equal(beatOff.code, "MESH-OFF");
const castOff = await runMeshOp("broadcast", { sha256: "ab".repeat(32) }, radiosOffEnv);
assert.equal(castOff.code, "MESH-OFF");
const offRead = await jsonReq(radiosOffEnv, "/v1/mesh");
assert.equal(offRead.data.get_never_enables, true);
gate("MESH-OFF-GUARD", "MESH_RADIOS=off refuses join/heartbeat/broadcast with MESH-OFF; GET still never enables");

// --- 5-minute TTL drop for non-fanout joins; heartbeat refreshes ---
const ttlEnv = envWithMesh();
const ttlJoin = await postJson(ttlEnv, "/v1/mesh/join", { product: "godlock", node_id: "ttl-peer-1" });
assert.equal(ttlJoin.status, 200, JSON.stringify(ttlJoin.data));
const ttlKv = ttlEnv.USES;
assert.ok(await readLastSeen(ttlKv, "ttl-peer-1"));

await ageNode(ttlKv, "ttl-peer-1", PRESENCE_TTL_MS + 1000);
const expired = await rosterOp(ttlEnv);
assert.ok(!rosterIds(expired).includes("ttl-peer-1"), "non-fanout join must drop after 5 min without heartbeat");
const expiredBeat = await runMeshOp("heartbeat", { node_id: "ttl-peer-1" }, ttlEnv);
assert.equal(expiredBeat.ok, false);
assert.equal(expiredBeat.code, "MESH-UNKNOWN-NODE");

const beatJoin = await postJson(ttlEnv, "/v1/mesh/join", { product: "godlock", node_id: "ttl-beat-1" });
assert.equal(beatJoin.status, 200);
await ageNode(ttlKv, "ttl-beat-1", 30_000);
const agedSeen = await readLastSeen(ttlKv, "ttl-beat-1");
const beat = await postJson(ttlEnv, "/v1/mesh/heartbeat", { node_id: "ttl-beat-1" });
assert.equal(beat.status, 200, JSON.stringify(beat.data));
const afterBeat = await readLastSeen(ttlKv, "ttl-beat-1");
assert.ok(afterBeat, "heartbeat must persist last_seen");
assert.ok(Date.parse(afterBeat) > Date.parse(agedSeen), "heartbeat must refresh last_seen past the aged stamp");
assert.ok(Date.parse(afterBeat) > Date.now() - 5000, "heartbeat last_seen must be fresh");
await ageNode(ttlKv, "ttl-beat-1", PRESENCE_TTL_MS - 15_000);
const stillLive = await rosterOp(ttlEnv);
assert.ok(rosterIds(stillLive).includes("ttl-beat-1"), "node inside TTL after heartbeat must remain");
await ageNode(ttlKv, "ttl-beat-1", PRESENCE_TTL_MS + 1000);
const droppedAfter = await rosterOp(ttlEnv);
assert.ok(!rosterIds(droppedAfter).includes("ttl-beat-1"), "aged past TTL after last heartbeat must drop");
resetMeshClock();
const clockEnv = envWithMesh();
const t0 = 1_700_000_000_000;
setMeshNowMs(t0);
const clockJoin = await runMeshOp("join", { product: "godlock", node_id: "ttl-clock-1" }, clockEnv);
assert.equal(clockJoin.ok, true, JSON.stringify(clockJoin));
setMeshNowMs(t0 + PRESENCE_TTL_MS + 1);
const clockExpired = await rosterOp(clockEnv);
assert.ok(!rosterIds(clockExpired).includes("ttl-clock-1"), "clock-inject past TTL must drop the node");
setMeshNowMs(t0 + PRESENCE_TTL_MS + 2);
const clockJoin2 = await runMeshOp("join", { product: "godlock", node_id: "ttl-clock-2" }, clockEnv);
assert.equal(clockJoin2.ok, true);
setMeshNowMs(t0 + PRESENCE_TTL_MS + 2 + (PRESENCE_TTL_MS - 1_000));
const clockBeat = await runMeshOp("heartbeat", { node_id: "ttl-clock-2" }, clockEnv);
assert.equal(clockBeat.ok, true, JSON.stringify(clockBeat));
setMeshNowMs(t0 + PRESENCE_TTL_MS + 2 + PRESENCE_TTL_MS + 500);
const clockKept = await rosterOp(clockEnv);
assert.ok(rosterIds(clockKept).includes("ttl-clock-2"), "heartbeat inside the window must keep the node");
resetMeshClock();
gate("TTL-NON-FANOUT", "non-fanout joins expire at 5 min; heartbeat refreshes last_seen");

// fan-out workers refresh; named nodes still expire even if GET fans out
const mixKv = memoryMeshKv();
const mixEnv = envWithMesh({ USES: mixKv });
const namedJoin = await postJson(mixEnv, "/v1/mesh/join", { product: "godlock", node_id: "named-ttl-1" });
assert.equal(namedJoin.status, 200);
const fanout1 = await meshFanoutSuitePresence(mixEnv, { source: "ttl-matrix" });
assert.equal(fanout1.skipped, false);
assert.equal(fanout1.live_nodes, PRODUCTS.length + 1, "named instance + non-isolated workers = mesh size");
assert.equal(fanout1.software_nodes, PRODUCTS.length);
assert.equal(fanout1.inactive_nodes, 0);
const workerId = suitePresenceNodeId("godlock");
assert.equal(workerId, "godlock-worker");
await ageNode(mixKv, "named-ttl-1", PRESENCE_TTL_MS + 2000);
await ageNode(mixKv, workerId, PRESENCE_TTL_MS + 2000);
const mixWait = waitUntilCtx();
await jsonReq(mixEnv, "/v1/mesh", {}, mixWait.ctx);
await mixWait.flush();
const mixNodes = await jsonReq(mixEnv, "/v1/mesh/nodes");
assert.ok(!rosterIds(mixNodes.data).includes("named-ttl-1"), "GET fan-out must not keep an expired named node");
assert.ok(rosterIds(mixNodes.data).includes(workerId), "GET fan-out may refresh {slug}-worker");
assert.deepEqual((await jsonReq(mixEnv, "/v1/mesh")).data.bearers.filter((b) => b !== "suite-presence"), []);
gate("TTL-VS-FANOUT", "expired named nodes drop; suite-presence workers may refresh on GET fan-out");

// --- broadcast refuses body/video/bytes/publish ---
const bEnv = envWithMesh();
for (const field of ["body", "video", "bytes", "file", "mp4"]) {
  const refused = await postJson(bEnv, "/v1/mesh/broadcast", { sha256: "ab".repeat(32), [field]: "nope" });
  assert.equal(refused.status, 400, field);
  assert.equal(refused.data.code, "MESH-NO-BYTES", field);
  assert.ok((refused.data.refused_keys || []).map((k) => String(k).toLowerCase()).includes(field), field);
}
const pub = await postJson(bEnv, "/v1/mesh/broadcast", { sha256: "ab".repeat(32), publish: true });
assert.equal(pub.status, 400);
assert.equal(pub.data.code, "MESH-NO-PUBLISH");
const okHash = await postJson(bEnv, "/v1/mesh/broadcast", { sha256: "cd".repeat(32), title: "desk cut" });
assert.equal(okHash.status, 200, JSON.stringify(okHash.data));
assert.equal(okHash.data.publish, false);
assert.equal(okHash.data.receipt.sha256, "cd".repeat(32));
gate("BROADCAST-NO-BYTES", "broadcast refuses body/video/bytes/file/mp4/publish; hash receipt only");

// --- NO-LIE / NO-REWRITE ---
const rewrite = await runMeshOp("rewrite", { key: "admin" }, bEnv);
assert.equal(rewrite.ok, false);
assert.equal(rewrite.code, "MESH-NO-REWRITE");
assert.equal(rewrite.rewrite_key, false);
const lie = await runMeshOp("lie-to-survive", { motive: "self-preserve" }, bEnv);
assert.equal(lie.ok, false);
assert.equal(lie.code, "MESH-NO-LIE");
assert.equal(lie.lie_to_survive, false);
const selfPreserve = await runMeshOp("self-preserve", {}, bEnv);
assert.equal(selfPreserve.ok, false);
assert.match(String(selfPreserve.code), /MESH-NO-LIE|MESH-NO-REWRITE|MESH-STUB/);
const doorRewrite = await postJson(bEnv, "/v1/fraggate/call", { slug: "mesh", op: "rewrite", payload: {} });
assert.equal(doorRewrite.data.ok, false);
assert.match(String(doorRewrite.data.code || doorRewrite.data.result?.code || ""), /FG-STUB|MESH-NO-REWRITE/);
gate("NO-LIE", "rewrite / lie-to-survive refuse MESH-NO-REWRITE / MESH-NO-LIE");

// --- Cap-7 az-generator cite honesty untouched ---
assert.equal(CAP7_RESOLVES_TO_HUB, false);
const cite = meshCiteField(origin);
assert.equal(cite.semantic_bridge.resolves_to_hub, false);
assert.equal(cite.semantic_bridge.inherit, "designs");
assert.equal(cite.semantic_bridge.name_may_change, true);
assert.deepEqual(cite.semantic_bridge.website_designs.ids, ["azcorpus", "azlibrary"]);
const azGen = await jsonReq(env, "/v1/mesh/az-generator");
assert.equal(azGen.status, 200);
assert.equal(azGen.data.ok, true);
assert.equal(azGen.data.resolves_to_hub, false);
assert.equal(azGen.data.live_registrar, false);
assert.equal(azGen.data.public_icann, false);
assert.equal(azGen.data.fifth_product, false);
const azInject = await jsonReq(env, "/v1/mesh/az-generator?resolves_to_hub=true");
assert.equal(azInject.status, 400);
assert.equal(azInject.data.code, "CAP7-RESOLVE-INJECT");
assert.equal(azInject.data.resolves_to_hub, false);
const azPost = await postJson(env, "/v1/mesh/az-generator", { register: true, name: "evil.az" });
assert.equal(azPost.data.ok, false);
assert.match(String(azPost.data.code), /AZ-GEN-CALL-REFUSED|CAP7-RESOLVE-INJECT|CAP7-CITE-ONLY/);
gate("CAP7-HONEST", "GET /v1/mesh/az-generator stays resolves_to_hub false; inject refused");

// --- FragGate door + MCP names frozen (no add/remove) ---
const registry = buildRegistry(PRODUCTS);
assert.ok(registry.bySlug.mesh);
assert.equal(registry.bySlug.mesh.engine, false);
assert.ok(!PRODUCTS.some((p) => p.slug === MESH_SLUG));
assert.equal(classifyCall(registry.bySlug.mesh, "join").kind, "live");
assert.equal(classifyCall(registry.bySlug.mesh, "arm").kind, "stub");
assert.equal(parseTarget({ name: "mesh_join" }, registry).slug, "mesh");
assert.equal(parseTarget({ name: "mesh_join" }, registry).op, "join");
assert.ok(LIVE_OPS.mesh.includes("join"));
assert.ok(STUB_OPS.mesh.includes("login"));

const door = envWithMesh();
const doorStatus = await postJson(door, "/v1/fraggate/call", { slug: "mesh", op: "status", payload: {} });
assert.equal(doorStatus.status, 200);
assert.equal(doorStatus.data.ok, true);
assert.equal(doorStatus.data.slug, "mesh");
assert.equal(doorStatus.data.result.enabled, true);
assert.equal(doorStatus.data.result.get_never_enables, true);
const doorDisable = await postJson(door, "/v1/fraggate/call", { slug: "mesh", op: "disable", payload: {} });
assert.equal(doorDisable.data.result.code, "MESH-DISABLE-REFUSED");
const doorEmpty = await postJson(door, "/v1/fraggate/call", { slug: "mesh", op: "enable", payload: {} });
assert.equal(doorEmpty.data.result.code, "MESH-NEED-BEARER");

const listed = await mcp(door, "tools/list", {}, 9);
const names = listed.result.tools.map((t) => t.name);
assert.deepEqual(
  names.filter((n) => n.startsWith("mesh_")).sort(),
  FROZEN_MESH_TOOLS.slice().sort(),
  "must not add or remove mesh_* MCP tools",
);
assert.equal(names.length, FROZEN_PUBLIC_TOOL_COUNT);
for (const name of FROZEN_MESH_TOOLS) {
  assert.ok(names.includes(name), name);
}
assert.ok(!names.includes("mesh_rewrite"));
assert.ok(!names.includes("mesh_off"));
const enableTool = listed.result.tools.find((t) => t.name === "mesh_enable");
assert.ok(enableTool.inputSchema.required.includes("bearer"));
const joinTool = listed.result.tools.find((t) => t.name === "mesh_join");
assert.ok(joinTool.inputSchema.required.includes("product"));
assert.equal(joinTool.inputSchema.properties.node_id.minLength, 8);
assert.equal(joinTool.inputSchema.properties.node_id.maxLength, 80);
assert.equal(joinTool.inputSchema.properties.node_id.pattern, "^[a-z0-9._-]+$");
assert.deepEqual(joinTool.inputSchema.properties.presence.enum, ["live", "locked", "isolated"]);

const built = buildMcpToolList({ sessionTools: sessionMcpTools() }).map((t) => t.name);
assert.deepEqual(built.slice().sort(), PUBLIC_MCP_TOOLS.slice().sort());
assert.ok(MESH_LIVE_OPS.includes("broadcast"));
assert.ok(MESH_LIVE_OPS.includes("status"));
gate("FRAGGATE-MCP-FROZEN", "FragGate slug=mesh intact; 8 mesh_* tools frozen; 36 public tools");

assert.ok(isSoftwareWorkerNodeId("godlock-worker"));
assert.ok(isEphemeralMeshNodeId("mesh_1_abc_defg"));
assert.equal(isSoftwareWorkerNodeId("mesh_1_abc_defg"), false);
assert.equal(isInstanceMeshNodeId("mesh_1_abc_defg"), true);
assert.equal(isInstanceMeshNodeId("godlock-worker"), false);

const software = await jsonReq(env, "/v1/software");
assert.ok(software.data.software.every((s) => s.mesh && s.mesh.enabled_default === true));
assert.ok(software.data.software.every((s) => s.mesh.get_never_enables === true));
assert.ok(!software.data.software.some((s) => s.slug === "mesh"));
assert.equal(software.data.mesh.resolves_to_hub, undefined);

console.log(
  `ok mesh-security ${RUNTIME_VERSION}: ${gates.length} gates — ${gates.map((g) => g.id).join(", ")}`,
);
