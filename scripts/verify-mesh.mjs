/**
 * QNM-BUILD-1.0 suite rollup: read-only suite-presence ON by default,
 * public disable refused, live/locked/isolated counts, hash-only
 * non-publish broadcast, MCP mesh_* tools, FragGate slug=mesh.
 * Not a login mesh. Author: Aziel Eliab. Identity is Aziel Eliab only.
 */
import assert from "node:assert/strict";
import { PRODUCTS } from "../src/index.js";
import { RUNTIME_VERSION } from "../src/runtime-api.js";
import { LIVE_OPS, STUB_OPS, buildRegistry, classifyCall, parseTarget } from "../src/fraggate/registry.js";
import { memorySessionNamespace } from "../src/session-do.js";
import {
  MESH_COMPANION,
  MESH_DEFAULT,
  MESH_DEFAULT_ENABLED,
  SUITE_PRESENCE,
  MESH_LIVE_OPS,
  MESH_MCP_TOOLS,
  MESH_SLUG,
  MESH_SPEC,
  MESH_STUB_OPS,
  isEphemeralMeshNodeId,
  isSha256Hex,
  isSoftwareWorkerNodeId,
  meshCiteField,
  meshFanoutSuitePresence,
  memoryMeshKv,
  resetMeshStore,
  runMeshOp,
  sanitizeBearer,
  sanitizeProduct,
  suitePresenceNodeId,
  suitePresenceTargets,
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

assert.equal(MESH_DEFAULT_ENABLED, true);
assert.equal(MESH_DEFAULT, "on");
assert.equal(SUITE_PRESENCE, "on");
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

const onStatus = await jsonReq(env, "/v1/mesh");
assert.equal(onStatus.status, 200);
assert.equal(onStatus.data.enabled, true);
assert.equal(onStatus.data.mesh_default, "on");
assert.equal(onStatus.data.spec, "QNM-BUILD-1.0");
assert.equal(onStatus.data.companion, "AIH-WP-1.1");
assert.equal(onStatus.data.qnm_s, false);
assert.equal(onStatus.data.scores, false);
assert.equal(onStatus.data.leaderboard, false);
assert.equal(onStatus.data.radios, "on");
assert.deepEqual(onStatus.data.bearers, ["suite-presence"]);
assert.equal(onStatus.data.suite_presence, "on");
assert.equal(onStatus.data.rollup.live, 0);
assert.equal(onStatus.data.rollup.locked, 0);
assert.equal(onStatus.data.rollup.isolated, 0);
assert.deepEqual(onStatus.data.rollup.software, { live: 0, locked: 0, isolated: 0 });
assert.deepEqual(onStatus.data.rollup.ephemeral, { live: 0, locked: 0, isolated: 0 });
assert.equal(onStatus.data.live_nodes, 0);
assert.equal(onStatus.data.ephemeral_nodes, 0);
assert.deepEqual(onStatus.data.products_present, []);
assert.match(onStatus.data.anon_broadcast, /never a publish path/i);
assert.match(onStatus.data.local_node_note, /qnm-node\//);
assert.match(onStatus.data.host_note, /not login-recovery/i);
assert.match(onStatus.data.note, /ON by default|LIVE/i);
assert.doesNotMatch(JSON.stringify(onStatus.data), /mesh_default":"off"/);
assert.doesNotMatch(onStatus.data.note, /Default OFF|mesh off/i);

const pingAgain = await jsonReq(env, "/v1/mesh");
assert.equal(pingAgain.data.enabled, true, "GET /v1/mesh reports default-on presence");
assert.deepEqual(pingAgain.data.bearers, ["suite-presence"], "GET must not add extra radios");
assert.equal(pingAgain.data.get_never_enables, true);

const alias = await jsonReq(env, "/v1/mesh/status");
assert.equal(alias.data.enabled, true);
assert.equal(alias.data.mesh_default, "on");
assert.equal(alias.data.qnm_s, false);

const defaultJoin = await postJson(env, "/v1/mesh/join", { product: "godlock", node_id: "godlock-default-on" });
assert.equal(defaultJoin.status, 200, JSON.stringify(defaultJoin.data));
assert.equal(defaultJoin.data.ok, true);
assert.equal(defaultJoin.data.session.product, "godlock");
const leftDefault = await postJson(env, "/v1/mesh/leave", { node_id: "godlock-default-on" });
assert.equal(leftDefault.data.left, true);

const emptyEnable = await postJson(env, "/v1/mesh/enable", {});
assert.equal(emptyEnable.status, 400);
assert.equal(emptyEnable.data.code, "MESH-NEED-BEARER");
assert.equal(emptyEnable.data.enabled, true);

const loginBearer = await postJson(env, "/v1/mesh/enable", { bearer: "login" });
assert.equal(loginBearer.status, 400);
assert.equal(loginBearer.data.code, "MESH-BAD-BEARER");

const accountBearer = await postJson(env, "/v1/mesh/enable", { bearer: "account-recover" });
assert.equal(accountBearer.status, 400);
assert.equal(accountBearer.data.code, "MESH-BAD-BEARER");

const stillOn = await jsonReq(env, "/v1/mesh");
assert.equal(stillOn.data.enabled, true);
assert.deepEqual(stillOn.data.bearers, ["suite-presence"]);

assert.equal(suitePresenceNodeId("godlock"), "godlock-worker");
assert.equal(suitePresenceNodeId("azcoherence"), "azcoherence-worker");
assert.equal(isSoftwareWorkerNodeId("godlock-worker"), true);
assert.equal(isEphemeralMeshNodeId("mesh_1_abc_defg"), true);
assert.equal(isSoftwareWorkerNodeId("mesh_1_abc_defg"), false);
assert.ok(!suitePresenceNodeId("anon-broadcast"));
const targets = suitePresenceTargets(PRODUCTS);
assert.equal(targets.length, PRODUCTS.length);
assert.ok(targets.every((t) => t.node_id.endsWith("-worker") && !t.node_id.includes("|")));
assert.ok(targets.some((t) => t.product === "godlock" && t.node_id === "godlock-worker"));

const defaultFanout = await meshFanoutSuitePresence(env, { source: "test-default-on" });
assert.equal(defaultFanout.skipped, false);
assert.equal(defaultFanout.enabled, true);
assert.equal(defaultFanout.get_never_enables, true);
assert.equal(defaultFanout.live_nodes, PRODUCTS.length);

const enabled = await postJson(env, "/v1/mesh/enable", { bearer: "suite-presence" });
assert.equal(enabled.status, 200, JSON.stringify(enabled.data));
assert.equal(enabled.data.enabled, true);
assert.deepEqual(enabled.data.bearers, ["suite-presence"]);
assert.equal(enabled.data.radios, "on");
assert.equal(enabled.data.suite_presence, "on");
assert.equal(enabled.data.get_never_enables, true);
assert.equal(enabled.data.fanout, true);
assert.equal(enabled.data.live_nodes, PRODUCTS.length, JSON.stringify(enabled.data.products_present));
assert.equal(enabled.data.ephemeral_nodes, 0);
assert.equal(enabled.data.software_nodes, PRODUCTS.length);

const autoJoin = await postJson(env, "/v1/mesh/join", { product: "azchat" });
assert.equal(autoJoin.status, 200, JSON.stringify(autoJoin.data));
assert.match(autoJoin.data.session.node_id, /^mesh_/);
assert.equal(isEphemeralMeshNodeId(autoJoin.data.session.node_id), true);
assert.equal(autoJoin.data.live_nodes, PRODUCTS.length, "mesh_* must not inflate Softwares live_nodes");
assert.equal(autoJoin.data.ephemeral_nodes, 1);
assert.equal(autoJoin.data.ephemeral_live_nodes, 1);
assert.equal(autoJoin.data.rollup.all.live, PRODUCTS.length + 1);
const leftEphem = await postJson(env, "/v1/mesh/leave", { node_id: autoJoin.data.session.node_id });
assert.equal(leftEphem.data.ephemeral_nodes, 0);
assert.equal(leftEphem.data.live_nodes, PRODUCTS.length);

assert.ok(enabled.data.products_present.includes("godlock"));
assert.ok(enabled.data.products_present.includes("vibelock"));
assert.ok(enabled.data.products_present.includes("azmail"));
assert.ok(enabled.data.products_present.includes("zsolver"));

const getStillOn = await jsonReq(env, "/v1/mesh");
assert.equal(getStillOn.data.enabled, true);
assert.equal(getStillOn.data.get_never_enables, true);

const joined = await postJson(env, "/v1/mesh/join", { product: "godlock", node_id: "godlock-uk", label: "GodLock UK" });
assert.equal(joined.status, 200, JSON.stringify(joined.data));
assert.equal(joined.data.ok, true);
assert.ok(joined.data.session.session_id);
assert.equal(joined.data.session.node_id, "godlock-uk");
assert.equal(joined.data.session.product, "godlock");
assert.equal(joined.data.session.presence, "live");
assert.equal(joined.data.live_nodes, PRODUCTS.length);
assert.equal(joined.data.ephemeral_nodes, 0);
assert.equal(joined.data.rollup.named.live, 1);
assert.equal(joined.data.rollup.all.live, PRODUCTS.length + 1);
assert.ok(joined.data.products_present.includes("godlock"));

const nodeId = joined.data.session.node_id;
const beat = await postJson(env, "/v1/mesh/heartbeat", { node_id: nodeId });
assert.equal(beat.status, 200);
assert.equal(beat.data.node.node_id, nodeId);

const isolated = await postJson(env, "/v1/mesh/join", {
  product: "foldlock",
  node_id: "foldlock-isolated",
  label: "isolated fold",
  presence: "isolated",
});
assert.equal(isolated.status, 200, JSON.stringify(isolated.data));
assert.equal(isolated.data.rollup.live, PRODUCTS.length);
assert.equal(isolated.data.rollup.isolated, 0);
assert.equal(isolated.data.rollup.named.isolated, 1);
assert.equal(isolated.data.rollup.locked, 0);
assert.equal(isolated.data.live_nodes, PRODUCTS.length);
assert.equal(isolated.data.rollup.all.live, PRODUCTS.length + 1);
assert.equal(isolated.data.rollup.all.isolated, 1);

const lockedBeat = await postJson(env, "/v1/mesh/heartbeat", {
  node_id: isolated.data.session.node_id,
  presence: "locked",
});
assert.equal(lockedBeat.status, 200);
assert.equal(lockedBeat.data.rollup.locked, 0);
assert.equal(lockedBeat.data.rollup.named.locked, 1);
assert.equal(lockedBeat.data.rollup.isolated, 0);
assert.equal(lockedBeat.data.rollup.software.live, PRODUCTS.length);

const nodes = await jsonReq(env, "/v1/mesh/nodes");
assert.equal(nodes.status, 200);
assert.equal(nodes.data.nodes.length, PRODUCTS.length + 2);
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
assert.equal(disabled.status, 400);
assert.equal(disabled.data.ok, false);
assert.equal(disabled.data.code, "MESH-DISABLE-REFUSED");
assert.equal(disabled.data.enabled, true);
assert.ok(disabled.data.bearers.includes("suite-presence"));
assert.match(disabled.data.message, /cannot turn suite presence off|stays ON/i);

const afterDisable = await jsonReq(env, "/v1/mesh");
assert.equal(afterDisable.data.enabled, true);
assert.equal(afterDisable.data.mesh_default, "on");
assert.ok(afterDisable.data.live_nodes >= 1, "disable must not wipe Live Nodes");

const doorEnv = envWithMesh();
const doorOn = await postJson(doorEnv, "/v1/fraggate/call", { slug: "mesh", op: "status", payload: {} });
assert.equal(doorOn.status, 200);
assert.equal(doorOn.data.ok, true);
assert.equal(doorOn.data.slug, "mesh");
assert.equal(doorOn.data.result.enabled, true);
assert.equal(doorOn.data.result.mesh_default, "on");
assert.equal(doorOn.data.result.spec, "QNM-BUILD-1.0");

const doorEmpty = await postJson(doorEnv, "/v1/fraggate/call", { slug: "mesh", op: "enable", payload: {} });
assert.equal(doorEmpty.data.result.enabled, true);
assert.equal(doorEmpty.data.result.code, "MESH-NEED-BEARER");

const doorDisable = await postJson(doorEnv, "/v1/fraggate/call", { slug: "mesh", op: "disable", payload: {} });
assert.equal(doorDisable.data.result.ok, false);
assert.equal(doorDisable.data.result.code, "MESH-DISABLE-REFUSED");
assert.equal(doorDisable.data.result.enabled, true);

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
assert.ok(software.data.software.every((s) => s.mesh && s.mesh.enabled_default === true));
assert.ok(software.data.software.every((s) => s.mesh.spec === "QNM-BUILD-1.0"));
assert.ok(software.data.software.every((s) => s.mesh.qnm_s === false));
assert.ok(!software.data.software.some((s) => s.slug === "anon-broadcast"));
assert.ok(!software.data.software.some((s) => s.slug === "mesh"));
assert.equal(software.data.mesh.spec, "QNM-BUILD-1.0");
assert.equal(software.data.mesh.qnm_s, false);
assert.equal(software.data.mesh.suite_presence, "on");
assert.equal(software.data.mesh.enabled_default, true);
assert.equal(software.data.mesh.mesh_default, "on");
assert.equal(software.data.mesh.get_never_enables, true);
assert.ok(software.data.software.every((s) => s.mesh.suite_presence === "on"));
assert.ok(software.data.software.every((s) => s.mesh.get_never_enables === true));

const citeMesh = meshCiteField(origin);
assert.equal(citeMesh.suite_presence, "on");
assert.equal(citeMesh.enabled_default, true);
assert.equal(citeMesh.mesh_default, "on");
assert.equal(citeMesh.get_never_enables, true);
assert.equal(citeMesh.login_mesh, false);
assert.equal(citeMesh.node_gate, false);
assert.ok(software.data.software.every((s) => s.qns_cd && s.qns_cd.spec === "QNS-CD-1.0"));
assert.equal(software.data.qns_cd.spec, "QNS-CD-1.0");

const openapi = await jsonReq(env, "/openapi.json");
assert.ok(openapi.data.paths["/v1/mesh"]);
assert.ok(openapi.data.paths["/v1/mesh/join"]);
assert.ok(openapi.data.paths["/v1/mesh/broadcast"]);
assert.match(openapi.data.paths["/v1/mesh"].get.summary, /QNM-BUILD-1.0/);
assert.match(openapi.data.paths["/v1/mesh"].get.summary, /QNS-CD-1\.0/);
assert.match(openapi.data.paths["/v1/mesh"].get.summary, /ON by default/);
assert.doesNotMatch(openapi.data.paths["/v1/mesh"].get.summary, /Default OFF/);
assert.match(openapi.data.paths["/v1/mesh/disable"].post.summary, /MESH-DISABLE-REFUSED|Refused/);
assert.ok(openapi.data.paths["/v1/qns"]);

const unitOn = await runMeshOp("join", { product: "azmail" }, {});
assert.equal(unitOn.ok, true);
assert.equal(unitOn.enabled, true);

const unitDisable = await runMeshOp("disable", {}, {});
assert.equal(unitDisable.ok, false);
assert.equal(unitDisable.code, "MESH-DISABLE-REFUSED");
assert.equal(unitDisable.enabled, true);

console.log(
  `ok mesh ${RUNTIME_VERSION}: QNM-BUILD-1.0 rollup, suite-presence ON by default, disable refused, live/locked/isolated, MCP ${MESH_MCP_TOOLS.length} tools, FragGate slug=mesh`,
);
