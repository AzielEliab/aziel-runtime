/**
 * QNM-BUILD-1.0 suite rollup: default OFF, bearer-gated enable,
 * live/locked/isolated counts, hash-only non-publish broadcast,
 * MCP mesh_* tools, FragGate slug=mesh. Not a login mesh.
 * Author: Aziel Eliab. Identity is Aziel Eliab only.
 */
import assert from "node:assert/strict";
import { PRODUCTS } from "../src/index.js";
import { RUNTIME_VERSION } from "../src/runtime-api.js";
import { LIVE_OPS, STUB_OPS, buildRegistry, classifyCall, parseTarget } from "../src/fraggate/registry.js";
import { memorySessionNamespace } from "../src/session-do.js";
import {
  MESH_COMPANION,
  MESH_DEFAULT_ENABLED,
  MESH_LIVE_OPS,
  MESH_MCP_TOOLS,
  MESH_SLUG,
  MESH_SPEC,
  MESH_STUB_OPS,
  isSha256Hex,
  memoryMeshKv,
  resetMeshStore,
  runMeshOp,
  sanitizeBearer,
  sanitizeProduct,
} from "../src/mesh.js";

const handler = (await import("../src/index.js")).default.fetch;
const origin = "https://aziel-runtime.example";

resetMeshStore();

function envWithMesh(extra = {}) {
  return {
    SESSION: memorySessionNamespace({}),
    USES: memoryMeshKv(),
    ...extra,
  };
}

async function req(env, path, init = {}) {
  return handler(new Request(origin + path, { headers: { "user-agent": "Mozilla/5.0" }, ...init }), env);
}

async function jsonReq(env, path, init = {}) {
  const res = await req(env, path, init);
  let data;
  try {
    data = await res.json();
  } catch {
    data = null;
  }
  return { status: res.status, data };
}

async function postJson(env, path, body) {
  return jsonReq(env, path, {
    method: "POST",
    headers: { "content-type": "application/json", "user-agent": "Mozilla/5.0" },
    body: JSON.stringify(body || {}),
  });
}

async function mcp(env, method, params = {}, id = 1) {
  const res = await req(env, "/mcp", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id, method, params }),
  });
  return res.json();
}

assert.equal(MESH_DEFAULT_ENABLED, false);
assert.equal(MESH_SPEC, "QNM-BUILD-1.0");
assert.equal(MESH_COMPANION, "AIH-WP-1.1");
assert.equal(sanitizeProduct("godlock"), "godlock");
assert.equal(sanitizeProduct("anon-broadcast"), "");
assert.equal(sanitizeProduct("AnonBroadcast"), "");
assert.equal(sanitizeBearer("suite-presence"), "suite-presence");
assert.equal(sanitizeBearer("login"), "");
assert.equal(sanitizeBearer("account-recover"), "");
assert.equal(sanitizeBearer("node-gate"), "");
assert.equal(isSha256Hex("a".repeat(64)), true);
assert.equal(isSha256Hex("not-a-hash"), false);

const registry = buildRegistry(PRODUCTS);
assert.ok(registry.bySlug.mesh);
assert.equal(registry.bySlug.mesh.status, "live");
assert.equal(registry.bySlug.mesh.engine, false);
assert.equal(registry.bySlug.mesh.spec, MESH_SPEC);
assert.ok(!PRODUCTS.some((p) => p.slug === MESH_SLUG));
assert.ok(LIVE_OPS.mesh.includes("join"));
assert.ok(LIVE_OPS.mesh.includes("mesh_join"));
assert.equal(classifyCall(registry.bySlug.mesh, "join").kind, "live");
assert.equal(classifyCall(registry.bySlug.mesh, "arm").kind, "stub");
assert.equal(classifyCall(registry.bySlug.mesh, "login").kind, "stub");
assert.equal(classifyCall(registry.bySlug.mesh, "recover").kind, "stub");
assert.equal(classifyCall(registry.bySlug.mesh, "resurrection").kind, "stub");
assert.equal(classifyCall(registry.bySlug.mesh, "heal").kind, "stub");
assert.equal(classifyCall(registry.bySlug.mesh, "phoenix-hunt").kind, "stub");
assert.equal(classifyCall(registry.bySlug.mesh, "controller").kind, "stub");
assert.equal(classifyCall(registry.bySlug.mesh, "publish").kind, "stub");
assert.equal(parseTarget({ name: "mesh_join" }, registry).slug, "mesh");
assert.equal(parseTarget({ name: "mesh_join" }, registry).op, "join");
assert.equal(parseTarget({ slug: "qnm", op: "status" }, registry).slug, "mesh");
assert.deepEqual(STUB_OPS.mesh.slice().sort(), MESH_STUB_OPS.slice().sort());
assert.ok(MESH_LIVE_OPS.includes("broadcast"));

const env = envWithMesh();

const offStatus = await jsonReq(env, "/v1/mesh");
assert.equal(offStatus.status, 200);
assert.equal(offStatus.data.enabled, false);
assert.equal(offStatus.data.spec, "QNM-BUILD-1.0");
assert.equal(offStatus.data.companion, "AIH-WP-1.1");
assert.equal(offStatus.data.qnm_s, false);
assert.equal(offStatus.data.scores, false);
assert.equal(offStatus.data.leaderboard, false);
assert.equal(offStatus.data.radios, "off");
assert.deepEqual(offStatus.data.bearers, []);
assert.deepEqual(offStatus.data.rollup, { live: 0, locked: 0, isolated: 0 });
assert.equal(offStatus.data.live_nodes, 0);
assert.deepEqual(offStatus.data.products_present, []);
assert.match(offStatus.data.anon_broadcast, /never a publish path/i);
assert.match(offStatus.data.local_node_note, /qnm-node\//);
assert.match(offStatus.data.host_note, /not login-recovery/i);
assert.match(offStatus.data.note, /never enables|OFF/i);

const pingAgain = await jsonReq(env, "/v1/mesh");
assert.equal(pingAgain.data.enabled, false, "GET /v1/mesh must not enable radios");

const alias = await jsonReq(env, "/v1/mesh/status");
assert.equal(alias.data.enabled, false);
assert.equal(alias.data.qnm_s, false);

const offJoin = await postJson(env, "/v1/mesh/join", { product: "godlock" });
assert.equal(offJoin.status, 400);
assert.equal(offJoin.data.code, "MESH-OFF");

const emptyEnable = await postJson(env, "/v1/mesh/enable", {});
assert.equal(emptyEnable.status, 400);
assert.equal(emptyEnable.data.code, "MESH-NEED-BEARER");
assert.equal(emptyEnable.data.enabled, false);

const loginBearer = await postJson(env, "/v1/mesh/enable", { bearer: "login" });
assert.equal(loginBearer.status, 400);
assert.equal(loginBearer.data.code, "MESH-BAD-BEARER");

const accountBearer = await postJson(env, "/v1/mesh/enable", { bearer: "account-recover" });
assert.equal(accountBearer.status, 400);
assert.equal(accountBearer.data.code, "MESH-BAD-BEARER");

const stillOff = await jsonReq(env, "/v1/mesh");
assert.equal(stillOff.data.enabled, false);

const enabled = await postJson(env, "/v1/mesh/enable", { bearer: "suite-presence" });
assert.equal(enabled.status, 200, JSON.stringify(enabled.data));
assert.equal(enabled.data.enabled, true);
assert.deepEqual(enabled.data.bearers, ["suite-presence"]);
assert.equal(enabled.data.radios, "operator");

const joined = await postJson(env, "/v1/mesh/join", { product: "godlock", label: "GodLock UK" });
assert.equal(joined.status, 200, JSON.stringify(joined.data));
assert.equal(joined.data.ok, true);
assert.ok(joined.data.session.session_id);
assert.ok(joined.data.session.node_id);
assert.equal(joined.data.session.product, "godlock");
assert.equal(joined.data.session.presence, "live");
assert.equal(joined.data.live_nodes, 1);
assert.deepEqual(joined.data.rollup, { live: 1, locked: 0, isolated: 0 });
assert.deepEqual(joined.data.products_present, ["godlock"]);

const nodeId = joined.data.session.node_id;
const beat = await postJson(env, "/v1/mesh/heartbeat", { node_id: nodeId });
assert.equal(beat.status, 200);
assert.equal(beat.data.node.node_id, nodeId);

const isolated = await postJson(env, "/v1/mesh/join", {
  product: "foldlock",
  label: "isolated fold",
  presence: "isolated",
});
assert.equal(isolated.status, 200, JSON.stringify(isolated.data));
assert.equal(isolated.data.rollup.live, 1);
assert.equal(isolated.data.rollup.isolated, 1);
assert.equal(isolated.data.rollup.locked, 0);
assert.equal(isolated.data.live_nodes, 1);

const lockedBeat = await postJson(env, "/v1/mesh/heartbeat", {
  node_id: isolated.data.session.node_id,
  presence: "locked",
});
assert.equal(lockedBeat.status, 200);
assert.equal(lockedBeat.data.rollup.locked, 1);
assert.equal(lockedBeat.data.rollup.isolated, 0);

const nodes = await jsonReq(env, "/v1/mesh/nodes");
assert.equal(nodes.status, 200);
assert.equal(nodes.data.nodes.length, 2);
assert.equal(nodes.data.qnm_s, false);
assert.equal(nodes.data.leaderboard, false);
assert.ok(nodes.data.nodes.every((n) => n.presence === "live" || n.presence === "locked" || n.presence === "isolated"));
assert.ok(!("score" in nodes.data) || nodes.data.scores === false);

const badBroadcast = await postJson(env, "/v1/mesh/broadcast", { video: "nope", sha256: "a".repeat(64) });
assert.equal(badBroadcast.status, 400);
assert.equal(badBroadcast.data.code, "MESH-NO-BYTES");

const publishRefuse = await postJson(env, "/v1/mesh/broadcast", { sha256: "ab".repeat(32), publish: true });
assert.equal(publishRefuse.status, 400);
assert.equal(publishRefuse.data.code, "MESH-NO-PUBLISH");

const receipt = await postJson(env, "/v1/mesh/broadcast", {
  sha256: "ab".repeat(32),
  title: "desk cut",
});
assert.equal(receipt.status, 200, JSON.stringify(receipt.data));
assert.equal(receipt.data.receipt.sha256, "ab".repeat(32));
assert.equal(receipt.data.publish, false);
assert.match(receipt.data.anon_broadcast, /never a publish path/i);

const poison = await runMeshOp("status", { poison: "do-not-read" }, env);
assert.equal(poison.ok, false);
assert.equal(poison.code, "MESH-POISON");

const stubLogin = await runMeshOp("login", {}, env);
assert.equal(stubLogin.ok, false);
assert.equal(stubLogin.code, "MESH-STUB");

const left = await postJson(env, "/v1/mesh/leave", { node_id: nodeId });
assert.equal(left.status, 200);
assert.equal(left.data.left, true);

const disabled = await postJson(env, "/v1/mesh/disable", {});
assert.equal(disabled.status, 200);
assert.equal(disabled.data.enabled, false);
assert.deepEqual(disabled.data.bearers, []);
assert.deepEqual(disabled.data.rollup, { live: 0, locked: 0, isolated: 0 });

const afterDisable = await jsonReq(env, "/v1/mesh");
assert.equal(afterDisable.data.enabled, false);

const doorEnv = envWithMesh();
const doorOff = await postJson(doorEnv, "/v1/fraggate/call", { slug: "mesh", op: "status", payload: {} });
assert.equal(doorOff.status, 200);
assert.equal(doorOff.data.ok, true);
assert.equal(doorOff.data.slug, "mesh");
assert.equal(doorOff.data.result.enabled, false);
assert.equal(doorOff.data.result.spec, "QNM-BUILD-1.0");

const doorEmpty = await postJson(doorEnv, "/v1/fraggate/call", { slug: "mesh", op: "enable", payload: {} });
assert.equal(doorEmpty.data.result.enabled, false);
assert.equal(doorEmpty.data.result.code, "MESH-NEED-BEARER");

const doorEnable = await postJson(doorEnv, "/v1/fraggate/call", {
  slug: "mesh",
  op: "enable",
  payload: { bearer: "suite-presence" },
});
assert.equal(doorEnable.data.result.enabled, true, JSON.stringify(doorEnable.data));

const doorJoin = await postJson(doorEnv, "/v1/fraggate/call", {
  name: "mesh_join",
  payload: { product: "foldlock" },
});
assert.equal(doorJoin.data.ok, true);
assert.equal(doorJoin.data.op, "join");
assert.equal(doorJoin.data.result.session.product, "foldlock");

const listed = await mcp(doorEnv, "tools/list", {}, 2);
const tools = listed.result.tools.map((t) => t.name);
for (const name of MESH_MCP_TOOLS) {
  assert.ok(tools.includes(name), `tools/list missing ${name}`);
}
const enableTool = listed.result.tools.find((t) => t.name === "mesh_enable");
assert.ok(enableTool.inputSchema.required.includes("bearer"));

const mcpStatus = await mcp(doorEnv, "tools/call", { name: "mesh_status", arguments: {} }, 3);
assert.equal(mcpStatus.result.isError, false);
assert.equal(mcpStatus.result.structuredContent.result.enabled, true);
assert.equal(mcpStatus.result.structuredContent.result.qnm_s, false);

const mcpNodes = await mcp(doorEnv, "tools/call", { name: "mesh_nodes", arguments: {} }, 4);
assert.ok(mcpNodes.result.structuredContent.result.live_nodes >= 1);

const software = await jsonReq(env, "/v1/software");
assert.ok(software.data.software.every((s) => s.mesh && s.mesh.enabled_default === false));
assert.ok(software.data.software.every((s) => s.mesh.spec === "QNM-BUILD-1.0"));
assert.ok(software.data.software.every((s) => s.mesh.qnm_s === false));
assert.ok(!software.data.software.some((s) => s.slug === "anon-broadcast"));
assert.ok(!software.data.software.some((s) => s.slug === "mesh"));
assert.equal(software.data.mesh.spec, "QNM-BUILD-1.0");
assert.equal(software.data.mesh.qnm_s, false);
assert.ok(software.data.software.every((s) => s.qns_cd && s.qns_cd.spec === "QNS-CD-1.0"));
assert.equal(software.data.qns_cd.spec, "QNS-CD-1.0");

const openapi = await jsonReq(env, "/openapi.json");
assert.ok(openapi.data.paths["/v1/mesh"]);
assert.ok(openapi.data.paths["/v1/mesh/join"]);
assert.ok(openapi.data.paths["/v1/mesh/broadcast"]);
assert.match(openapi.data.paths["/v1/mesh"].get.summary, /QNM-BUILD-1.0/);
assert.match(openapi.data.paths["/v1/mesh"].get.summary, /QNS-CD-1\.0/);
assert.ok(openapi.data.paths["/v1/qns"]);

const unitOff = await runMeshOp("join", { product: "azmail" }, {});
assert.equal(unitOff.ok, false);
assert.equal(unitOff.code, "MESH-OFF");

console.log(
  `ok mesh ${RUNTIME_VERSION}: QNM-BUILD-1.0 rollup, bearer enable, live/locked/isolated, MCP ${MESH_MCP_TOOLS.length} tools, FragGate slug=mesh`,
);
