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
  countsAsLiveNodes,
  inferMeshKind,
  isEphemeralMeshNodeId,
  isInstanceMeshNodeId,
  isSha256Hex,
  isSoftwareWorkerNodeId,
  LIVE_NODES_NOTE,
  LIVE_NODES_PLANE,
  NODES_NOTE,
  NODES_PLANE,
  meshCiteField,
  meshFanoutSuitePresence,
  memoryMeshKv,
  PRESENCE_TTL_MS,
  resetMeshClock,
  resetMeshStore,
  runMeshOp,
  sanitizeBearer,
  sanitizeNodeId,
  sanitizeProduct,
  setMeshNowMs,
  setMeshRadiosEnabled,
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

/** Status JSON: Nodes = users+uses; Live Nodes = users; software_nodes stays off both. */
function assertMeshPills(data, extra = {}) {
  const roster = extra.roster === true;
  assert.equal(data.live_nodes, data.human_mesh_users, extra.liveMsg || "live_nodes === human_mesh_users");
  assert.equal(data.live_nodes, data.rollup.mesh, extra.rollupMeshMsg || "rollup.mesh === live_nodes");
  assert.equal(data.rollup.nodes, data.human_mesh_users + data.human_uses, extra.rollupNodesMsg || "rollup.nodes === users+uses");
  if (!roster) {
    assert.equal(typeof data.nodes, "number", extra.nodesTypeMsg || "status nodes is a count");
    assert.equal(data.nodes, data.human_mesh_users + data.human_uses, extra.nodesMsg || "nodes === human_mesh_users + human_uses");
    assert.equal(data.nodes, data.rollup.nodes);
  } else {
    assert.ok(Array.isArray(data.nodes), extra.rosterMsg || "GET /v1/mesh/nodes.nodes is the roster");
  }
  if ((data.software_nodes || 0) > 0) {
    assert.notEqual(data.live_nodes, data.software_nodes, extra.softLiveMsg || "software_nodes never feeds Live Nodes");
    const nodesCount = roster ? data.rollup.nodes : data.nodes;
    assert.notEqual(nodesCount, data.software_nodes, extra.softNodesMsg || "software_nodes never feeds Nodes");
  }
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
assert.equal(classifyCall(registry.bySlug.mesh, "rewrite").kind, "stub");
assert.equal(classifyCall(registry.bySlug.mesh, "lie-to-survive").kind, "stub");
assert.equal(classifyCall(registry.bySlug.mesh, "self-preserve").kind, "stub");
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
assert.equal(onStatus.data.no_lie, true);
assert.equal(onStatus.data.no_rewrite, true);
assert.equal(onStatus.data.rewrite_key, false);
assert.equal(onStatus.data.lie_to_survive, false);
assert.equal(onStatus.data.copies_one_tunnel, false);
assert.equal(onStatus.data.no_lie_spec, "NO-LIE-NO-REWRITE-1.0");
assert.equal(onStatus.data.rollup.live, 0);
assert.equal(onStatus.data.rollup.locked, 0);
assert.equal(onStatus.data.rollup.isolated, 0);
assert.deepEqual(onStatus.data.rollup.software, { live: 0, locked: 0, isolated: 0 });
assert.deepEqual(onStatus.data.rollup.instances, { live: 0, locked: 0, isolated: 0 });
assert.deepEqual(onStatus.data.rollup.ephemeral, { live: 0, locked: 0, isolated: 0 });
assert.equal(onStatus.data.live_nodes, 0);
assert.equal(onStatus.data.nodes, 0);
assert.equal(onStatus.data.software_nodes, 0);
assert.equal(onStatus.data.instance_nodes, 0);
assert.match(onStatus.data.live_nodes_note, /human mesh users/i);
assert.match(onStatus.data.nodes_note, /human mesh users plus/i);
assert.match(LIVE_NODES_NOTE, /does not invent users/i);
assert.match(NODES_NOTE, /does not invent users/i);
assert.equal(onStatus.data.live_nodes_plane, LIVE_NODES_PLANE);
assert.equal(onStatus.data.nodes_plane, NODES_PLANE);
assert.equal(LIVE_NODES_PLANE, "human-mesh-users");
assert.equal(NODES_PLANE, "human-mesh-users-uses");
assert.equal(onStatus.data.human_mesh_users, 0);
assert.equal(onStatus.data.human_uses, 0);
assertMeshPills(onStatus.data);
assert.equal(onStatus.data.active_nodes, 0);
assert.equal(onStatus.data.inactive_nodes, 0);
assert.equal(onStatus.data.rollup.mesh, 0);
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

assert.equal(inferMeshKind({ node_id: "godlock-worker" }), "software");
assert.equal(inferMeshKind({ node_id: "mesh_1_abc_defg" }), "human");
assert.equal(inferMeshKind({ node_id: "godlock-uk" }), "instance");
assert.equal(inferMeshKind({ node_id: "godlock-uk", kind: "human" }), "human");
assert.equal(countsAsLiveNodes({ node_id: "godlock-worker", presence: "live" }), false);
assert.equal(countsAsLiveNodes({ node_id: "mesh_1_abc_defg", presence: "live" }), true);
assert.equal(countsAsLiveNodes({ node_id: "godlock-uk", presence: "live" }), false);

const defaultJoin = await postJson(env, "/v1/mesh/join", { product: "godlock", node_id: "godlock-default-on" });
assert.equal(defaultJoin.status, 200, JSON.stringify(defaultJoin.data));
assert.equal(defaultJoin.data.ok, true);
assert.equal(defaultJoin.data.session.product, "godlock");
assert.equal(defaultJoin.data.session.plane, "instance");
assert.equal(defaultJoin.data.session.counts_as_live_nodes, false, "downloaded instance is not Live Nodes");
assertMeshPills(defaultJoin.data);
assert.equal(defaultJoin.data.human_mesh_users, 0);
assert.equal(defaultJoin.data.instance_nodes, 1);
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
assert.equal(isInstanceMeshNodeId("mesh_1_abc_defg"), true);
assert.equal(isInstanceMeshNodeId("godlock-uk"), true);
assert.equal(isInstanceMeshNodeId("godlock-worker"), false);
assert.ok(!suitePresenceNodeId("anon-broadcast"));
const targets = suitePresenceTargets(PRODUCTS);
assert.equal(targets.length, PRODUCTS.length);
assert.ok(targets.every((t) => t.node_id.endsWith("-worker") && !t.node_id.includes("|")));
assert.ok(targets.some((t) => t.product === "godlock" && t.node_id === "godlock-worker"));

const defaultFanout = await meshFanoutSuitePresence(env, { source: "test-default-on" });
assert.equal(defaultFanout.skipped, false);
assert.equal(defaultFanout.enabled, true);
assert.equal(defaultFanout.get_never_enables, true);
assert.equal(defaultFanout.software_nodes, PRODUCTS.length);
assert.equal(defaultFanout.software_live_nodes, PRODUCTS.length);
assert.equal(defaultFanout.active_nodes, PRODUCTS.length);
assert.equal(defaultFanout.inactive_nodes, 0);
assert.equal(defaultFanout.human_mesh_users, 0, "Softwares fan-out must not create human mesh users");
assertMeshPills(defaultFanout);

const enabled = await postJson(env, "/v1/mesh/enable", { bearer: "suite-presence" });
assert.equal(enabled.status, 200, JSON.stringify(enabled.data));
assert.equal(enabled.data.enabled, true);
assert.deepEqual(enabled.data.bearers, ["suite-presence"]);
assert.equal(enabled.data.radios, "on");
assert.equal(enabled.data.suite_presence, "on");
assert.equal(enabled.data.get_never_enables, true);
assert.equal(enabled.data.fanout, true);
assert.equal(enabled.data.human_mesh_users, 0, JSON.stringify(enabled.data.products_present));
assert.equal(enabled.data.ephemeral_nodes, 0);
assert.equal(enabled.data.software_nodes, PRODUCTS.length);
assert.equal(enabled.data.software_live_nodes, PRODUCTS.length);
assertMeshPills(enabled.data);
const workerJoin = await postJson(env, "/v1/mesh/join", { product: "godlock", node_id: "godlock-worker" });
assert.equal(workerJoin.status, 200, JSON.stringify(workerJoin.data));
assert.equal(workerJoin.data.session.plane, "software");
assert.equal(workerJoin.data.session.counts_as_live_nodes, false);
assert.equal(workerJoin.data.human_mesh_users, 0);
assertMeshPills(workerJoin.data);
assert.equal(workerJoin.data.software_nodes, PRODUCTS.length);

const autoJoin = await postJson(env, "/v1/mesh/join", { product: "azchat" });
assert.equal(autoJoin.status, 200, JSON.stringify(autoJoin.data));
assert.match(autoJoin.data.session.node_id, /^mesh_/);
assert.equal(isEphemeralMeshNodeId(autoJoin.data.session.node_id), true);
assert.equal(autoJoin.data.session.plane, "human", "auto-minted mesh_* is a human participant");
assert.equal(autoJoin.data.session.counts_as_live_nodes, true);
assert.equal(autoJoin.data.human_mesh_users, 1);
assertMeshPills(autoJoin.data);
assert.equal(autoJoin.data.software_nodes, PRODUCTS.length, "mesh_* must not inflate software_nodes");
assert.equal(autoJoin.data.ephemeral_nodes, 1);
assert.equal(autoJoin.data.ephemeral_live_nodes, 1);
assert.equal(autoJoin.data.instance_live_nodes, 0);
assert.equal(autoJoin.data.rollup.live, PRODUCTS.length + 1);
assert.equal(autoJoin.data.rollup.mesh, autoJoin.data.live_nodes);
assert.equal(autoJoin.data.rollup.software.live, PRODUCTS.length);
assert.equal(autoJoin.data.rollup.human.live, 1);
assert.equal(autoJoin.data.rollup.all.live, PRODUCTS.length + 1);
const leftEphem = await postJson(env, "/v1/mesh/leave", { node_id: autoJoin.data.session.node_id });
assert.equal(leftEphem.data.ephemeral_nodes, 0);
assert.equal(leftEphem.data.human_mesh_users, 0);
assertMeshPills(leftEphem.data);
assert.equal(leftEphem.data.software_nodes, PRODUCTS.length);

const humanNamed = await postJson(env, "/v1/mesh/join", {
  product: "godlock",
  node_id: "human-aziel01",
  kind: "human",
  bearer: "human",
});
assert.equal(humanNamed.status, 200, JSON.stringify(humanNamed.data));
assert.equal(humanNamed.data.session.plane, "human");
assert.equal(humanNamed.data.session.counts_as_live_nodes, true);
assert.equal(humanNamed.data.human_mesh_users, 1);
assertMeshPills(humanNamed.data);
assert.equal(humanNamed.data.software_nodes, PRODUCTS.length);
const isolatedHuman = await postJson(env, "/v1/mesh/join", {
  product: "foldlock",
  node_id: "human-isolated",
  kind: "human",
  presence: "isolated",
});
assert.equal(isolatedHuman.data.human_mesh_users, 1, "isolated human excluded from Live Nodes users");
assert.equal(isolatedHuman.data.human_isolated_nodes, 1);
assert.equal(isolatedHuman.data.session.counts_as_live_nodes, false);
assertMeshPills(isolatedHuman.data);
const leftHuman = await postJson(env, "/v1/mesh/leave", { node_id: "human-aziel01" });
assert.equal(leftHuman.data.human_mesh_users, 0);
await postJson(env, "/v1/mesh/leave", { node_id: "human-isolated" });

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
assert.equal(joined.data.human_mesh_users, 0, "named downloaded instance is not a human Live Node");
assert.equal(joined.data.session.plane, "instance");
assert.equal(joined.data.session.counts_as_live_nodes, false);
assertMeshPills(joined.data);
assert.equal(joined.data.software_nodes, PRODUCTS.length);
assert.equal(joined.data.ephemeral_nodes, 0);
assert.equal(joined.data.rollup.named.live, 1);
assert.equal(joined.data.rollup.live, PRODUCTS.length + 1);
assert.equal(joined.data.rollup.mesh, joined.data.live_nodes);
assert.equal(joined.data.rollup.all.live, PRODUCTS.length + 1);
assert.ok(joined.data.products_present.includes("godlock"));

const nodeId = joined.data.session.node_id;
const beat = await postJson(env, "/v1/mesh/heartbeat", { node_id: nodeId });
assert.equal(beat.status, 200);
assert.equal(beat.data.node.node_id, nodeId);
assert.equal(beat.data.heartbeat_loss_isolates, false);
assert.equal(beat.data.apply_last_packet, false);
assert.equal(beat.data.split_wires, "SPLIT-WIRES-1.0");

const tickBody = await postJson(env, "/v1/mesh/heartbeat", { node_id: nodeId, body: "also here’s the file" });
assert.equal(tickBody.status, 400);
assert.equal(tickBody.data.code, "MESH-NO-BYTES");

const tipA = "11".repeat(32);
const tipB = "22".repeat(32);
const prev = "33".repeat(32);
const eqJoin = await postJson(env, "/v1/mesh/join", { product: "godlock", node_id: "equivocation-peer" });
assert.equal(eqJoin.status, 200);
const firstHash = await postJson(env, "/v1/mesh/heartbeat", {
  node_id: "equivocation-peer",
  tip_hash: tipA,
  prev,
});
assert.equal(firstHash.status, 200, JSON.stringify(firstHash.data));
const forked = await postJson(env, "/v1/mesh/heartbeat", { node_id: "equivocation-peer", tip_hash: tipB, prev });
assert.equal(forked.status, 400);
assert.equal(forked.data.code, "MESH-EQUIVOCATION");
assert.equal(forked.data.node.presence, "isolated");
const eqLeft = await postJson(env, "/v1/mesh/leave", { node_id: "equivocation-peer" });
assert.equal(eqLeft.status, 200);

const isolated = await postJson(env, "/v1/mesh/join", {
  product: "foldlock",
  node_id: "foldlock-isolated",
  label: "isolated fold",
  presence: "isolated",
});
assert.equal(isolated.status, 200, JSON.stringify(isolated.data));
assert.equal(isolated.data.rollup.live, PRODUCTS.length + 1, "workers + godlock-uk still active");
assert.equal(isolated.data.rollup.isolated, 1);
assert.equal(isolated.data.rollup.named.isolated, 1);
assert.equal(isolated.data.rollup.locked, 0);
assert.equal(isolated.data.human_mesh_users, 0, "isolated instance excluded from human Live Nodes");
assertMeshPills(isolated.data);
assert.equal(isolated.data.isolated_nodes, 1);
assert.equal(isolated.data.software_nodes, PRODUCTS.length);
assert.equal(isolated.data.session.counts_as_live_nodes, false);
assert.notEqual(isolated.data.live_nodes, isolated.data.software_nodes);
assert.equal(isolated.data.rollup.all.live, PRODUCTS.length + 1);
assert.equal(isolated.data.rollup.all.isolated, 1);

const lockedBeat = await postJson(env, "/v1/mesh/heartbeat", {
  node_id: isolated.data.session.node_id,
  presence: "locked",
});
assert.equal(lockedBeat.status, 200);
assert.equal(lockedBeat.data.rollup.locked, 1);
assert.equal(lockedBeat.data.rollup.named.locked, 1);
assert.equal(lockedBeat.data.rollup.isolated, 0);
assert.equal(lockedBeat.data.inactive_nodes, 1);
assert.equal(lockedBeat.data.human_mesh_users, 0, "locked instance still not a human Live Node");
assertMeshPills(lockedBeat.data);
assert.equal(lockedBeat.data.software_locked_nodes, 0);
assert.equal(lockedBeat.data.software_live_nodes, PRODUCTS.length);
assert.equal(lockedBeat.data.rollup.software.live, PRODUCTS.length);

const nodes = await jsonReq(env, "/v1/mesh/nodes");
assert.equal(nodes.status, 200);
assert.equal(nodes.data.nodes.length, PRODUCTS.length + 2);
assert.equal(nodes.data.qnm_s, false);
assert.equal(nodes.data.leaderboard, false);
assert.ok(nodes.data.nodes.every((n) => n.presence === "live" || n.presence === "locked" || n.presence === "isolated"));
assert.ok(!("score" in nodes.data) || nodes.data.scores === false);
assertMeshPills(nodes.data, { roster: true });

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

const noRewrite = await runMeshOp("rewrite", { key: "admin" }, env);
assert.equal(noRewrite.ok, false);
assert.equal(noRewrite.code, "MESH-NO-REWRITE");
assert.equal(noRewrite.rewrite_key, false);
const noLie = await runMeshOp("lie-to-survive", { motive: "self-preserve" }, env);
assert.equal(noLie.ok, false);
assert.equal(noLie.code, "MESH-NO-LIE");
assert.equal(noLie.lie_to_survive, false);

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
assert.equal(afterDisable.data.software_nodes, PRODUCTS.length, "disable must not wipe software_nodes");
assertMeshPills(afterDisable.data);
assert.ok(afterDisable.data.instance_nodes >= 1, "locked instance remains until TTL");

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
assertMeshPills(mcpStatus.result.structuredContent.result);

const mcpNodes = await mcp(doorEnv, "tools/call", { name: "mesh_nodes", arguments: {} }, 4);
assert.ok(mcpNodes.result.structuredContent.result.software_nodes >= 1);
assert.match(mcpNodes.result.structuredContent.result.live_nodes_note, /human mesh users/i);
assertMeshPills(mcpNodes.result.structuredContent.result, { roster: true });

const software = await jsonReq(env, "/v1/software");
assert.ok(software.data.software.every((s) => s.mesh && s.mesh.enabled_default === true));
assert.ok(software.data.software.every((s) => s.mesh.live_nodes === undefined));
assert.ok(software.data.software.every((s) => s.mesh.live_nodes_plane === "human-mesh-users"));
assert.ok(software.data.software.every((s) => s.mesh.nodes_plane === "human-mesh-users-uses"));
assert.ok(software.data.software.every((s) => s.mesh.spec === "QNM-BUILD-1.0"));
assert.ok(software.data.software.every((s) => s.mesh.qnm_s === false));
assert.ok(!software.data.software.some((s) => s.slug === "anon-broadcast"));
assert.ok(!software.data.software.some((s) => s.slug === "mesh"));
assert.equal(software.data.mesh.spec, "QNM-BUILD-1.0");
assert.equal(software.data.mesh.qnm_s, false);
assert.equal(software.data.mesh.live_nodes_plane, "human-mesh-users");
assert.equal(software.data.mesh.nodes_plane, "human-mesh-users-uses");
assert.equal(software.data.mesh.software_nodes_plane, "software-worker-fanout");
assert.equal(software.data.mesh.live_nodes, undefined, "catalog mesh hint must not publish a live_nodes count");
assert.equal(typeof software.data.mesh.nodes, "string", "catalog mesh hint nodes is the roster URL");
assert.match(software.data.mesh.live_nodes_note, /human mesh users/i);
assert.match(software.data.mesh.nodes_note, /human mesh users plus/i);
assert.equal(software.data.mesh.suite_presence, "on");
assert.equal(software.data.mesh.enabled_default, true);
assert.equal(software.data.mesh.mesh_default, "on");
assert.equal(software.data.mesh.get_never_enables, true);
assert.equal(software.data.mesh.no_lie, true);
assert.equal(software.data.mesh.no_rewrite, true);
assert.equal(software.data.mesh.rewrite_key, false);
assert.ok(software.data.software.every((s) => s.mesh.suite_presence === "on"));
assert.ok(software.data.software.every((s) => s.mesh.get_never_enables === true));

const citeMesh = meshCiteField(origin);
assert.equal(citeMesh.suite_presence, "on");
assert.equal(citeMesh.enabled_default, true);
assert.equal(citeMesh.mesh_default, "on");
assert.equal(citeMesh.get_never_enables, true);
assert.equal(citeMesh.login_mesh, false);
assert.equal(citeMesh.node_gate, true);
assert.equal(citeMesh.get_is_node_gate, true);
assert.equal(citeMesh.neighbor_heal, true);
assert.equal(citeMesh.network, true);
assert.equal(citeMesh.anonymity_network, true);
assert.equal(citeMesh.channel_plane.spec, "QNM-CHANNEL-PLANE-1.0");
assert.equal(citeMesh.channel_plane.vpn, true);
assert.equal(citeMesh.channel_plane.concentrator_slug, "azvpn");
assert.equal(citeMesh.channel_plane.default_vpn_backend, "azvpn");
assert.equal(citeMesh.wifi, "on");
assert.equal(citeMesh.bluetooth, "on");
assert.equal(citeMesh.rf, "on");
assert.equal(citeMesh.photon, "on");
assert.equal(citeMesh.no_lie, true);
assert.equal(citeMesh.no_rewrite, true);
assert.equal(citeMesh.rewrite_key, false);
assert.ok(software.data.software.every((s) => s.qns_cd && s.qns_cd.spec === "QNS-CD-1.0"));
assert.equal(software.data.qns_cd.spec, "QNS-CD-1.0");

const openapi = await jsonReq(env, "/openapi.json");
assert.ok(openapi.data.paths["/v1/mesh"]);
assert.ok(openapi.data.paths["/v1/mesh/join"]);
assert.ok(openapi.data.paths["/v1/mesh/broadcast"]);
assert.match(openapi.data.paths["/v1/mesh"].get.summary, /QNM-BUILD-1.0/);
assert.match(openapi.data.paths["/v1/mesh"].get.summary, /NO-LIE|NO-REWRITE/);
assert.match(openapi.data.paths["/v1/mesh"].get.summary, /QNS-CD-1\.0/);
assert.match(openapi.data.paths["/v1/mesh"].get.summary, /ON by default/);
assert.doesNotMatch(openapi.data.paths["/v1/mesh"].get.summary, /Default OFF/);
assert.match(openapi.data.paths["/v1/mesh/disable"].post.summary, /MESH-DISABLE-REFUSED|Refused/);
assert.ok(openapi.data.paths["/v1/qns"]);
assert.ok(openapi.data.paths["/v1/mesh/az-generator"]);
assert.match(openapi.data.paths["/v1/mesh/az-generator"].get.summary, /resolves_to_hub false/);
assert.equal(citeMesh.semantic_bridge.resolves_to_hub, false);
assert.equal(citeMesh.semantic_bridge.inherit, "designs");
assert.equal(citeMesh.semantic_bridge.name_may_change, true);
assert.deepEqual(citeMesh.semantic_bridge.website_designs.ids, ["azcorpus", "azlibrary"]);

const unitOn = await runMeshOp("join", { product: "azmail" }, {});
assert.equal(unitOn.ok, true);
assert.equal(unitOn.enabled, true);

const unitDisable = await runMeshOp("disable", {}, {});
assert.equal(unitDisable.ok, false);
assert.equal(unitDisable.code, "MESH-DISABLE-REFUSED");
assert.equal(unitDisable.enabled, true);

// --- mesh_join contract: product / node_id / presence / MESH-OFF / 5-minute TTL ---
assert.equal(PRESENCE_TTL_MS, 5 * 60 * 1000);
assert.equal(sanitizeNodeId("godlock-uk"), "godlock-uk");
assert.equal(sanitizeNodeId("GODLOCK-UK"), "");
assert.equal(sanitizeNodeId("short"), "");
assert.equal(sanitizeNodeId("a".repeat(81)), "");
assert.equal(sanitizeNodeId("bad|pipe1"), "");

const contractEnv = envWithMesh();
resetMeshStore();

const noProduct = await postJson(contractEnv, "/v1/mesh/join", { node_id: "need-prod" });
assert.equal(noProduct.status, 400);
assert.equal(noProduct.data.ok, false);
assert.equal(noProduct.data.code, "MESH-BAD-INPUT");
assert.match(noProduct.data.message, /product/i);

const noProductMcp = await mcp(contractEnv, "tools/call", {
  name: "mesh_join",
  arguments: { node_id: "need-prod", confirm: true },
}, 20);
assert.equal(noProductMcp.result.isError, true);
assert.equal(noProductMcp.result.structuredContent.result.code, "MESH-BAD-INPUT");

const badNode = await postJson(contractEnv, "/v1/mesh/join", { product: "godlock", node_id: "NO-UPPER" });
assert.equal(badNode.status, 400);
assert.equal(badNode.data.code, "MESH-BAD-INPUT");
assert.match(badNode.data.message, /node_id/i);

const badNodeShort = await postJson(contractEnv, "/v1/mesh/join", { product: "godlock", node_id: "short" });
assert.equal(badNodeShort.status, 400);
assert.equal(badNodeShort.data.code, "MESH-BAD-INPUT");

const badNodePipe = await postJson(contractEnv, "/v1/mesh/join", { product: "godlock", node_id: "godlock|uk" });
assert.equal(badNodePipe.status, 400);
assert.equal(badNodePipe.data.code, "MESH-BAD-INPUT");

const badPresence = await postJson(contractEnv, "/v1/mesh/join", {
  product: "godlock",
  node_id: "godlock-ok1",
  presence: "online",
});
assert.equal(badPresence.status, 400);
assert.equal(badPresence.data.code, "MESH-BAD-INPUT");
assert.match(badPresence.data.message, /live, locked, or isolated/i);

const radiosOffEnv = envWithMesh({ MESH_RADIOS: "off" });
const joinRadiosOff = await postJson(radiosOffEnv, "/v1/mesh/join", { product: "godlock", node_id: "godlock-tx1" });
assert.equal(joinRadiosOff.status, 400);
assert.equal(joinRadiosOff.data.ok, false);
assert.equal(joinRadiosOff.data.code, "MESH-OFF");
assert.equal(joinRadiosOff.data.radios, "off");

const doorOff = await postJson(radiosOffEnv, "/v1/fraggate/call", {
  slug: "mesh",
  op: "join",
  payload: { product: "godlock", node_id: "godlock-tx2" },
});
assert.equal(doorOff.data.result.code, "MESH-OFF");

const mcpOff = await mcp(radiosOffEnv, "tools/call", {
  name: "mesh_join",
  arguments: { product: "godlock", node_id: "godlock-tx3", confirm: true },
}, 21);
assert.equal(mcpOff.result.structuredContent.result.code, "MESH-OFF");

const statusOff = await jsonReq(radiosOffEnv, "/v1/mesh");
assert.equal(statusOff.status, 200);
assert.equal(statusOff.data.radios, "off");
assert.equal(statusOff.data.suite_presence, "on");

setMeshRadiosEnabled(false);
const unitOff = await runMeshOp("join", { product: "godlock", node_id: "godlock-tx4" }, {});
assert.equal(unitOff.ok, false);
assert.equal(unitOff.code, "MESH-OFF");
setMeshRadiosEnabled(true);

const ttlEnv = envWithMesh();
resetMeshStore();
const t0 = 1_700_000_000_000;
setMeshNowMs(t0);
const ttlJoin = await runMeshOp("join", { product: "godlock", node_id: "ttl-node1" }, ttlEnv);
assert.equal(ttlJoin.ok, true, JSON.stringify(ttlJoin));
assert.equal(ttlJoin.session.node_id, "ttl-node1");
assert.equal(ttlJoin.session.presence_ttl_ms, PRESENCE_TTL_MS);
const rosterLive = await runMeshOp("nodes", {}, ttlEnv);
assert.ok(rosterLive.nodes.some((n) => n.node_id === "ttl-node1"), "joined node must appear on roster");

setMeshNowMs(t0 + PRESENCE_TTL_MS + 1);
const rosterExpired = await runMeshOp("nodes", {}, ttlEnv);
assert.ok(!rosterExpired.nodes.some((n) => n.node_id === "ttl-node1"), "node must drop after 5 minutes without heartbeat");
const expiredBeat = await runMeshOp("heartbeat", { node_id: "ttl-node1" }, ttlEnv);
assert.equal(expiredBeat.ok, false);
assert.equal(expiredBeat.code, "MESH-UNKNOWN-NODE");

setMeshNowMs(t0 + PRESENCE_TTL_MS + 2);
const ttlJoin2 = await runMeshOp("join", { product: "godlock", node_id: "ttl-keep1" }, ttlEnv);
assert.equal(ttlJoin2.ok, true, JSON.stringify(ttlJoin2));
setMeshNowMs(t0 + PRESENCE_TTL_MS + 2 + (PRESENCE_TTL_MS - 1_000));
const keptBeat = await runMeshOp("heartbeat", { node_id: "ttl-keep1" }, ttlEnv);
assert.equal(keptBeat.ok, true, JSON.stringify(keptBeat));
setMeshNowMs(t0 + PRESENCE_TTL_MS + 2 + PRESENCE_TTL_MS + 500);
const stillKept = await runMeshOp("nodes", {}, ttlEnv);
assert.ok(stillKept.nodes.some((n) => n.node_id === "ttl-keep1"), "heartbeat inside the window must keep the node");
setMeshNowMs(t0 + PRESENCE_TTL_MS + 2 + PRESENCE_TTL_MS + 500 + PRESENCE_TTL_MS + 1);
const droppedAfterKeep = await runMeshOp("nodes", {}, ttlEnv);
assert.ok(!droppedAfterKeep.nodes.some((n) => n.node_id === "ttl-keep1"), "missed heartbeat after refresh must drop the node");
resetMeshClock();
resetMeshStore();

{
  const usesKv = memoryMeshKv({ total: "7" });
  const usesEnv = envWithMesh({ USES: usesKv });
  const usesFanout = await meshFanoutSuitePresence(usesEnv, { source: "test-nodes-vs-live" });
  assert.equal(usesFanout.human_mesh_users, 0);
  assert.equal(usesFanout.human_uses, 7);
  assert.equal(usesFanout.nodes, 7);
  assert.equal(usesFanout.live_nodes, 0);
  assert.equal(usesFanout.software_nodes, PRODUCTS.length);
  assertMeshPills(usesFanout);
  const usesHuman = await postJson(usesEnv, "/v1/mesh/join", { product: "azchat" });
  assert.equal(usesHuman.data.human_mesh_users, 1);
  assert.equal(usesHuman.data.human_uses, 7);
  assert.equal(usesHuman.data.nodes, 8);
  assert.equal(usesHuman.data.live_nodes, 1);
  assert.equal(usesHuman.data.software_nodes, PRODUCTS.length);
  assertMeshPills(usesHuman.data);
  const usesStatus = await jsonReq(usesEnv, "/v1/mesh");
  assert.equal(usesStatus.data.nodes, usesStatus.data.human_mesh_users + usesStatus.data.human_uses);
  assert.equal(usesStatus.data.live_nodes, usesStatus.data.human_mesh_users);
  assert.notEqual(usesStatus.data.nodes, usesStatus.data.software_nodes);
  assert.notEqual(usesStatus.data.live_nodes, usesStatus.data.software_nodes);
  resetMeshStore();
}

const joinTool = listed.result.tools.find((t) => t.name === "mesh_join");
assert.match(joinTool.description, /MESH-OFF/);
assert.match(joinTool.description, /5-minute TTL|5-minute/);
assert.equal(joinTool.inputSchema.required.includes("product"), true);
assert.equal(joinTool.inputSchema.properties.node_id.pattern, "^[a-z0-9._-]+$");
assert.deepEqual(joinTool.inputSchema.properties.presence.enum, ["live", "locked", "isolated"]);

console.log(
  `ok mesh ${RUNTIME_VERSION}: QNM-BUILD-1.0 rollup, suite-presence ON by default, disable refused, live/locked/isolated, join TTL/MESH-OFF/validation, MCP ${MESH_MCP_TOOLS.length} tools, FragGate slug=mesh`,
);
