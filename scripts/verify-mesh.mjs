/**
 * QNM-BUILD-1.0 suite rollup: read-only suite-presence ON by default,
 * public disable refused, live/locked/isolated counts, hash-only
 * non-publish broadcast, MCP mesh_* tools, FragGate slug=mesh.
 * Not a login mesh. Author: Aziel Eliab. Identity is Aziel Eliab only.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
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
  REGISTERED_GRACE_MS,
  HEARTBEAT_MISS_N,
  HEARTBEAT_INTERVAL_MS,
  staleAfterMs,
  resetMeshClock,
  resetMeshStore,
  runMeshOp,
  sanitizeBearer,
  sanitizeNodeId,
  sanitizeProduct,
  setMeshNowMs,
  setMeshRadiosEnabled,
  meshSecurityCite,
  meshSkillText,
  SITE_LIVE_EXCLUDED_HOSTS,
  SITE_LIVE_HOSTS,
  SITE_LIVE_KIND,
  SITE_LIVE_TTL_MS,
  SITE_LIVE_VIEWERS_NOTE,
  SITE_PRESENCE_CONTRACT,
  suitePresenceNodeId,
  suitePresenceTargets,
} from "../src/mesh.js";
import {
  acceptSitePresence,
  liveNodesTip,
  mergeSiteViewerRows,
  pruneSiteViewers,
  sanitizeSiteHost,
  sanitizeSiteKind,
  sanitizeSiteViewers,
  siteViewerFleet,
  siteViewerTuple,
} from "../src/site-viewers.js";
import { createIdentity } from "../src/fed-mesh/identity.js";
import { signAct } from "../src/fed-mesh/client.js";
import { ZERO_HASH } from "../src/fed-mesh/spec.js";
import { meshRadios } from "../src/engines/azinterface/ops.js";
import { runAznet } from "../src/engines/aznet/ops.js";

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

/** Status JSON: Nodes = users+uses; Live Nodes = users + site viewers; software_nodes stays off both. */
function assertMeshPills(data, extra = {}) {
  const roster = extra.roster === true;
  const viewers = Number(data.site_live_viewers) || 0;
  assert.equal(typeof data.site_live_viewers, "number", extra.viewersTypeMsg || "site_live_viewers is a count");
  const parts = data.site_live_viewers_components || {};
  let componentSum = 0;
  for (const host of SITE_LIVE_HOSTS) componentSum += Number(parts[host]) || 0;
  assert.equal(data.site_live_viewers, componentSum, extra.componentMsg || "site_live_viewers is the single-key component sum");
  assert.equal(data.site_live_viewers_read, "single-key");
  assert.equal(data.live_nodes_tip, liveNodesTip(data.live_nodes_generation, data.human_mesh_users, parts));
  assert.equal(data.live_nodes, data.human_mesh_users + viewers, extra.liveMsg || "live_nodes === human_mesh_users + site_live_viewers");
  assert.equal(data.live_nodes, data.rollup.mesh, extra.rollupMeshMsg || "rollup.mesh === live_nodes");
  assert.equal(Object.prototype.hasOwnProperty.call(data.rollup, "live"), false, "rollup.live is not published");
  assert.equal(data.rollup.public_live_nodes, "mesh");
  assert.equal(data.rollup.all.live, data.rollup.active);
  assert.equal(data.rollup.nodes, data.human_mesh_users + data.human_uses, extra.rollupNodesMsg || "rollup.nodes === users+uses");
  if (!roster) {
    assert.equal(typeof data.nodes, "number", extra.nodesTypeMsg || "status nodes is a count");
    assert.equal(data.nodes, data.human_mesh_users + data.human_uses, extra.nodesMsg || "nodes === human_mesh_users + human_uses");
    assert.equal(data.nodes, data.rollup.nodes);
    assert.equal(data.nodes_are_not_unique_humans, true);
    assert.equal(data.paint_nodes_as_people, false);
    assert.equal(data.nodes_formula, "human_mesh_users+human_uses");
    assert.match(data.nodes_note, /nodes_are_not_unique_humans/);
    assert.match(data.nodes_note, /Do not paint nodes or human_uses as people/);
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
assert.equal(onStatus.data.rollup.all.live, 0);
assert.equal(onStatus.data.rollup.live, undefined);
assert.equal(onStatus.data.rollup.locked, 0);
assert.equal(onStatus.data.rollup.isolated, 0);
assert.deepEqual(onStatus.data.rollup.software, { live: 0, locked: 0, isolated: 0, stale: 0 });
assert.deepEqual(onStatus.data.rollup.instances, { live: 0, locked: 0, isolated: 0, stale: 0 });
assert.deepEqual(onStatus.data.rollup.ephemeral, { live: 0, locked: 0, isolated: 0, stale: 0 });
assert.equal(onStatus.data.live_nodes, 0);
assert.equal(onStatus.data.site_live_viewers, 0);
assert.equal(onStatus.data.nodes, 0);
assert.equal(onStatus.data.software_nodes, 0);
assert.equal(onStatus.data.instance_nodes, 0);
assert.match(onStatus.data.live_nodes_note, /human mesh users/i);
assert.match(onStatus.data.nodes_note, /human mesh users plus/i);
assert.match(LIVE_NODES_NOTE, /does not invent users/i);
assert.match(NODES_NOTE, /does not invent users/i);
assert.equal(onStatus.data.live_nodes_plane, LIVE_NODES_PLANE);
assert.equal(onStatus.data.nodes_plane, NODES_PLANE);
assert.equal(LIVE_NODES_PLANE, "human-mesh-users-site-viewers");
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
assert.equal(autoJoin.data.rollup.all.live, PRODUCTS.length + 1);
assert.equal(autoJoin.data.rollup.live, undefined);
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
assert.equal(joined.data.rollup.all.live, PRODUCTS.length + 1);
assert.equal(joined.data.rollup.live, undefined);
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
assert.equal(isolated.data.rollup.all.live, PRODUCTS.length + 1, "workers + godlock-uk still active");
assert.equal(isolated.data.rollup.live, undefined);
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
assert.equal(tools.length, 36, "tools/list stays 36");
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
assert.ok(software.data.software.every((s) => s.mesh.live_nodes_plane === "human-mesh-users-site-viewers"));
assert.ok(software.data.software.every((s) => s.mesh.nodes_plane === "human-mesh-users-uses"));
assert.ok(software.data.software.every((s) => s.mesh.spec === "QNM-BUILD-1.0"));
assert.ok(software.data.software.every((s) => s.mesh.qnm_s === false));
assert.ok(!software.data.software.some((s) => s.slug === "anon-broadcast"));
assert.ok(!software.data.software.some((s) => s.slug === "mesh"));
assert.equal(software.data.mesh.spec, "QNM-BUILD-1.0");
assert.equal(software.data.mesh.qnm_s, false);
assert.equal(software.data.mesh.live_nodes_plane, "human-mesh-users-site-viewers");
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
assert.equal(citeMesh.wifi, "cite");
assert.equal(citeMesh.bluetooth, "cite");
assert.equal(citeMesh.rf, "cite");
assert.equal(citeMesh.photon, "cite");
assert.equal(citeMesh.worker_hardware, false);
assert.equal(citeMesh.channel_plane.worker_radios_live, false);
for (const name of ["wifi", "bluetooth", "rf", "photon"]) {
  if (citeMesh.worker_hardware === false && (citeMesh[name] === "on" || citeMesh[name] === true || citeMesh[name] === "live")) {
    assert.fail(`${name} claims radio hardware the worker cannot see`);
  }
}
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
assert.equal(ttlJoin.session.membership, "registered");
assert.equal(ttlJoin.session.session_sealed, true);
assert.equal(ttlJoin.session.presence_ttl_ms, null);
assert.equal(ttlJoin.session.registered_grace_ms, REGISTERED_GRACE_MS);
assert.equal(ttlJoin.session.heartbeat_mode, "idle");
assert.equal(ttlJoin.session.presence_class, "live");
assert.equal(ttlJoin.session.stale_after_ms, staleAfterMs("idle"));
assert.equal(HEARTBEAT_MISS_N, 3);
assert.equal(HEARTBEAT_INTERVAL_MS.active.min_ms, 15_000);
assert.equal(HEARTBEAT_INTERVAL_MS.active.max_ms, 30_000);
assert.equal(HEARTBEAT_INTERVAL_MS.idle.min_ms, 2 * 60 * 1000);
assert.equal(HEARTBEAT_INTERVAL_MS.idle.max_ms, 5 * 60 * 1000);
assert.equal(HEARTBEAT_INTERVAL_MS.asleep.min_ms, 15 * 60 * 1000);
assert.equal(HEARTBEAT_INTERVAL_MS.asleep.max_ms, 30 * 60 * 1000);
const rosterLive = await runMeshOp("nodes", {}, ttlEnv);
assert.ok(rosterLive.nodes.some((n) => n.node_id === "ttl-node1"), "joined node must appear on roster");

const idleStale = staleAfterMs("idle");
setMeshNowMs(t0 + idleStale + 1);
const rosterStale = await runMeshOp("nodes", {}, ttlEnv);
const staleRow = rosterStale.nodes.find((n) => n.node_id === "ttl-node1");
assert.ok(staleRow, "missed beats must keep the node registered");
assert.equal(staleRow.presence_class, "stale");
assert.equal(rosterStale.live_nodes, rosterStale.human_mesh_users + rosterStale.site_live_viewers);
assert.ok(rosterStale.registered_nodes >= 1);
const staleBeat = await runMeshOp("heartbeat", { node_id: "ttl-node1" }, ttlEnv);
assert.equal(staleBeat.ok, true, JSON.stringify(staleBeat));
assert.equal(staleBeat.presence_class, "live");
assert.equal(staleBeat.restored_from_stale, true);

setMeshNowMs(t0 + idleStale + 1 + REGISTERED_GRACE_MS + 1);
const rosterGrace = await runMeshOp("nodes", {}, ttlEnv);
assert.ok(!rosterGrace.nodes.some((n) => n.node_id === "ttl-node1"), "grace deletes a row that never beats again");
const graceBeat = await runMeshOp("heartbeat", { node_id: "ttl-node1" }, ttlEnv);
assert.equal(graceBeat.ok, false);
assert.equal(graceBeat.code, "MESH-UNKNOWN-NODE");

setMeshNowMs(t0 + idleStale + 2);
const humanJoin = await runMeshOp("join", {
  product: "godlock",
  node_id: "human-ttl-1",
  kind: "human",
  bearer: "human",
  heartbeat_mode: "active",
}, ttlEnv);
assert.equal(humanJoin.ok, true, JSON.stringify(humanJoin));
assert.equal(humanJoin.human_mesh_users, 1);
assert.equal(humanJoin.live_nodes, humanJoin.human_mesh_users + humanJoin.site_live_viewers);
setMeshNowMs(t0 + idleStale + 2 + staleAfterMs("active") + 1);
const humanStale = await runMeshOp("nodes", {}, ttlEnv);
const humanRow = humanStale.nodes.find((n) => n.node_id === "human-ttl-1");
assert.equal(humanRow.presence_class, "stale");
assert.equal(humanStale.human_mesh_users, 0, "stale human must not count as Live Nodes");
assert.equal(humanStale.registered_humans, 1);
assert.equal(humanStale.live_nodes, humanStale.site_live_viewers);
const humanBack = await runMeshOp("heartbeat", { node_id: "human-ttl-1", heartbeat_mode: "active" }, ttlEnv);
assert.equal(humanBack.ok, true, JSON.stringify(humanBack));
assert.equal(humanBack.human_mesh_users, 1);
assert.equal(humanBack.presence_class, "live");

const suiteJoin = await runMeshOp("join", { product: "godlock", node_id: "godlock-worker" }, ttlEnv);
assert.equal(suiteJoin.ok, true, JSON.stringify(suiteJoin));
assert.equal(suiteJoin.session.membership, "suite-presence");
assert.equal(suiteJoin.session.user_heartbeat, false);
assert.equal(suiteJoin.session.presence_ttl_ms, PRESENCE_TTL_MS);
setMeshNowMs(t0 + idleStale + 2 + staleAfterMs("active") + 1 + PRESENCE_TTL_MS + 1);
const workerRoster = await runMeshOp("nodes", {}, ttlEnv);
assert.ok(!workerRoster.nodes.some((n) => n.node_id === "godlock-worker"), "{slug}-worker still drops after 5 minutes");
const workerBeat = await runMeshOp("heartbeat", { node_id: "godlock-worker" }, ttlEnv);
assert.equal(workerBeat.code, "MESH-UNKNOWN-NODE");
resetMeshClock();
resetMeshStore();

{
  const sealKv = memoryMeshKv();
  const sealEnv = envWithMesh({ USES: sealKv });
  const joined = await runMeshOp("join", {
    product: "azchat",
    node_id: "seal-human1",
    kind: "human",
    bearer: "human",
  }, sealEnv);
  assert.equal(joined.ok, true, JSON.stringify(joined));
  assert.equal(joined.human_mesh_users, 1);
  const raw = JSON.parse(await sealKv.get("mesh|nodes"));
  raw["seal-human1"].session_seal = "ab".repeat(32);
  await sealKv.put("mesh|nodes", JSON.stringify(raw));
  const lied = await runMeshOp("status", {}, sealEnv);
  assert.equal(lied.human_mesh_users, 0, "a mismatched session seal does not count as Live");
  assert.equal(lied.registered_humans, 1, "a mismatched seal stays registered and is not a ghost Live Node");
  const beat = await runMeshOp("heartbeat", { node_id: "seal-human1" }, sealEnv);
  assert.equal(beat.ok, false);
  assert.equal(beat.code, "MESH-SESSION-SEAL");
  const still = await runMeshOp("status", {}, sealEnv);
  assert.equal(still.human_mesh_users, 0, "a refused beat does not restore live");
  resetMeshStore();
}

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
  assert.equal(usesStatus.data.live_nodes, usesStatus.data.human_mesh_users + usesStatus.data.site_live_viewers);
  assert.notEqual(usesStatus.data.nodes, usesStatus.data.software_nodes);
  assert.notEqual(usesStatus.data.live_nodes, usesStatus.data.software_nodes);
  resetMeshStore();
}

{
  assert.deepEqual(SITE_LIVE_HOSTS.slice(), ["godlock.uk", "azieleliab.com", "azielcorpuslibrary.net"]);
  assert.deepEqual(SITE_LIVE_EXCLUDED_HOSTS.slice(), ["hedidntjump.com"]);
  assert.equal(SITE_LIVE_KIND, "human-page");
  assert.equal(SITE_LIVE_TTL_MS, staleAfterMs("idle"));
  assert.notEqual(SITE_LIVE_TTL_MS, PRESENCE_TTL_MS);
  assert.equal(sanitizeSiteHost("https://www.godlock.uk/count").host, "godlock.uk");
  assert.equal(sanitizeSiteHost("hedidntjump.com").code, "MESH-SITE-HOST-EXCLUDED");
  assert.equal(sanitizeSiteKind("bot").code, "MESH-SITE-KIND-REFUSED");
  assert.equal(sanitizeSiteKind("software").code, "MESH-SITE-KIND-REFUSED");
  assert.equal(sanitizeSiteKind("download").code, "MESH-SITE-KIND-REFUSED");
  assert.equal(sanitizeSiteViewers(-1).ok, false);
  assert.equal(acceptSitePresence({ host: "godlock.uk", viewers: 4, kind: "human-page" }).ok, true);
  assert.equal(siteViewerFleet({}).site_live_viewers, 0);
  assert.match(SITE_LIVE_VIEWERS_NOTE, /never pulls hub \/count/i);
  assert.equal(SITE_PRESENCE_CONTRACT.pull_hub_count, false);
  assert.equal(SITE_PRESENCE_CONTRACT.fail_closed, true);
  assert.ok(MESH_LIVE_OPS.includes("site-presence"));

  const siteEnv = envWithMesh();
  const emptyGet = await jsonReq(siteEnv, "/v1/mesh");
  assert.equal(emptyGet.data.site_live_viewers, 0, "no hub heartbeat stays 0");
  assert.equal(emptyGet.data.live_nodes, 0);
  assert.equal(emptyGet.data.site_live_viewers_pull, false);
  assert.equal(emptyGet.data.live_nodes_components.invent_users, false);
  const cite = await jsonReq(siteEnv, "/v1/mesh/site-presence");
  assert.equal(cite.status, 200);
  assert.equal(cite.data.site_live_viewers, 0);
  assert.equal(cite.data.site_presence_contract.fail_closed, true);

  const hdj = await postJson(siteEnv, "/v1/mesh/site-presence", {
    host: "hedidntjump.com",
    viewers: 9,
    kind: "human-page",
  });
  assert.equal(hdj.status, 400);
  assert.equal(hdj.data.code, "MESH-SITE-HOST-EXCLUDED");
  assert.equal((await jsonReq(siteEnv, "/v1/mesh")).data.site_live_viewers, 0);

  const bot = await postJson(siteEnv, "/v1/mesh/site-presence", {
    host: "godlock.uk",
    viewers: 9,
    kind: "bot",
  });
  assert.equal(bot.status, 400);
  assert.equal(bot.data.code, "MESH-SITE-KIND-REFUSED");
  const software = await postJson(siteEnv, "/v1/mesh/site-presence", {
    host: "godlock.uk",
    viewers: 9,
    kind: "software",
  });
  assert.equal(software.data.code, "MESH-SITE-KIND-REFUSED");
  const download = await postJson(siteEnv, "/v1/mesh/site-presence", {
    host: "godlock.uk",
    viewers: 9,
    kind: "download",
  });
  assert.equal(download.data.code, "MESH-SITE-KIND-REFUSED");
  assert.equal((await jsonReq(siteEnv, "/v1/mesh")).data.live_nodes, 0, "refused reports do not invent viewers");

  const godlock = await postJson(siteEnv, "/v1/mesh/site-presence", {
    host: "www.godlock.uk",
    viewers: 4,
    kind: "human-page",
  });
  assert.equal(godlock.status, 200, JSON.stringify(godlock.data));
  assert.equal(godlock.data.site_live_viewers, 4);
  assert.equal(godlock.data.site_live_viewers_components["godlock.uk"], 4);
  assert.equal(godlock.data.live_nodes_generation, 1, "first stored viewer count seals generation 1");
  assert.equal(godlock.data.live_nodes, 4);
  const godlockAgain = await postJson(siteEnv, "/v1/mesh/site-presence", {
    host: "godlock.uk",
    viewers: 4,
    kind: "human-page",
  });
  assert.equal(godlockAgain.data.live_nodes_generation, 1, "TTL-only heartbeat keeps the seal");
  assert.equal(godlockAgain.data.live_nodes, 4);
  assert.equal(godlock.data.human_mesh_users, 0);
  assert.equal(godlock.data.nodes, godlock.data.human_mesh_users + godlock.data.human_uses);
  assertMeshPills(godlock.data);

  const corpus = await postJson(siteEnv, "/v1/mesh/site-heartbeat", {
    host: "azielcorpuslibrary.net",
    viewers: 2,
    kind: "human-page",
  });
  assert.equal(corpus.data.site_live_viewers, 6);
  assert.equal(corpus.data.live_nodes_generation, 2);
  assert.equal(corpus.data.live_nodes, 6);
  assert.equal(corpus.data.nodes, corpus.data.human_mesh_users + corpus.data.human_uses);

  const human = await postJson(siteEnv, "/v1/mesh/join", { product: "azchat" });
  assert.equal(human.data.human_mesh_users, 1);
  assert.equal(human.data.site_live_viewers, 6);
  assert.equal(human.data.live_nodes, 7);
  assert.equal(human.data.nodes, human.data.human_mesh_users + human.data.human_uses);
  assertMeshPills(human.data);

  const zero = await postJson(siteEnv, "/v1/mesh/site-presence", {
    host: "godlock.uk",
    viewers: 0,
    kind: "human-page",
  });
  assert.equal(zero.data.site_live_viewers_components["godlock.uk"], 0);
  assert.equal(zero.data.site_live_viewers, 2);
  assert.equal(zero.data.live_nodes, 3);

  const tSite = 2_000_000_000_000;
  setMeshNowMs(tSite);
  await postJson(siteEnv, "/v1/mesh/site-presence", {
    host: "azieleliab.com",
    viewers: 5,
    kind: "human-page",
  });
  setMeshNowMs(tSite + SITE_LIVE_TTL_MS + 1);
  const expired = await jsonReq(siteEnv, "/v1/mesh");
  assert.equal(expired.data.site_live_viewers_components["azieleliab.com"], 0);
  assert.equal(expired.data.site_live_viewers, 0, "stale hub heartbeats are 0 on Live Nodes");
  assert.equal(expired.data.site_registered_viewers_components["azieleliab.com"], 5);
  assert.equal(expired.data.site_registered_viewers, 5, "stale hub count stays registered");
  assert.equal(expired.data.live_nodes, expired.data.human_mesh_users);
  setMeshNowMs(tSite + SITE_LIVE_TTL_MS + 1 + REGISTERED_GRACE_MS + 1);
  const siteGone = await jsonReq(siteEnv, "/v1/mesh");
  assert.equal(siteGone.data.site_registered_viewers, 0, "grace deletes a hub row that never beats again");
  resetMeshClock();
  resetMeshStore();

  const fresh = new Date().toISOString();
  const older = new Date(Date.now() - 1000).toISOString();
  const merged = mergeSiteViewerRows(
    {
      "godlock.uk": { host: "godlock.uk", viewers: 4, kind: "human-page", last_seen: fresh },
      "azieleliab.com": { host: "azieleliab.com", viewers: 3, kind: "human-page", last_seen: fresh },
    },
    {
      "godlock.uk": { host: "godlock.uk", viewers: 1, kind: "human-page", last_seen: older },
      "azielcorpuslibrary.net": { host: "azielcorpuslibrary.net", viewers: 2, kind: "human-page", last_seen: fresh },
    },
  );
  assert.equal(merged["godlock.uk"].viewers, 4, "older sibling write does not drop a newer count");
  assert.equal(merged["azieleliab.com"].viewers, 3);
  assert.equal(merged["azielcorpuslibrary.net"].viewers, 2);
  assert.equal(siteViewerTuple(siteViewerFleet(merged).components), "godlock.uk=4,azieleliab.com=3,azielcorpuslibrary.net=2");

  function meshKvWithTrap() {
    const store = new Map();
    let trap = null;
    return {
      async get(key) {
        const value = store.has(key) ? store.get(key) : null;
        if (trap && key === trap.key) {
          const { wait, entered } = trap;
          trap = null;
          entered();
          await wait;
        }
        return value;
      },
      async put(key, value) {
        store.set(key, String(value));
      },
      async list() {
        return { keys: [], list_complete: true };
      },
      _store: store,
      trapSiteViewers() {
        let release;
        let entered;
        const wait = new Promise((resolve) => {
          release = resolve;
        });
        const enteredP = new Promise((resolve) => {
          entered = resolve;
        });
        trap = { key: "mesh|site_viewers", wait, entered };
        return { release, entered: enteredP };
      },
    };
  }

  const trapKv = meshKvWithTrap();
  const trapEnv = envWithMesh({ USES: trapKv });
  const seededGod = await postJson(trapEnv, "/v1/mesh/site-presence", {
    host: "godlock.uk",
    viewers: 4,
    kind: "human-page",
  });
  assert.equal(seededGod.data.site_live_viewers, 4);
  const seededAe = await postJson(trapEnv, "/v1/mesh/site-presence", {
    host: "azieleliab.com",
    viewers: 3,
    kind: "human-page",
  });
  assert.equal(seededAe.data.site_live_viewers, 7);
  const held = trapKv.trapSiteViewers();
  const fanoutP = meshFanoutSuitePresence(trapEnv, { source: "stale-site-read" });
  await held.entered;
  const corpusDuringFanout = await postJson(trapEnv, "/v1/mesh/site-presence", {
    host: "azielcorpuslibrary.net",
    viewers: 2,
    kind: "human-page",
  });
  assert.equal(corpusDuringFanout.data.site_live_viewers, 9);
  held.release();
  await fanoutP;
  const afterFanout = await jsonReq(trapEnv, "/v1/mesh");
  assert.equal(afterFanout.data.site_live_viewers_components["godlock.uk"], 4);
  assert.equal(afterFanout.data.site_live_viewers_components["azieleliab.com"], 3);
  assert.equal(afterFanout.data.site_live_viewers_components["azielcorpuslibrary.net"], 2);
  assert.equal(afterFanout.data.site_live_viewers, 9, "roster fan-out must not clobber an in-flight hub heartbeat");
  assert.equal(afterFanout.data.live_nodes, afterFanout.data.human_mesh_users + 9);
  resetMeshStore();

  const meshSrc = readFileSync(new URL("../src/mesh.js", import.meta.url), "utf8");
  const siteSrc = readFileSync(new URL("../src/site-viewers.js", import.meta.url), "utf8");
  assert.doesNotMatch(meshSrc, /\bfetch\s*\(/, "GET /v1/mesh path must not fetch hub /count");
  assert.doesNotMatch(siteSrc, /\bfetch\s*\(/);
  assert.match(meshSrc, /Does not write the site-viewer aggregate/);
  assert.equal(
    pruneSiteViewers({
      "godlock.uk": { host: "godlock.uk", viewers: 3, kind: "human-page", last_seen: "1999-01-01T00:00:00.000Z" },
    })["godlock.uk"],
    undefined,
  );
}

const joinTool = listed.result.tools.find((t) => t.name === "mesh_join");
assert.match(joinTool.description, /MESH-OFF/);
assert.match(joinTool.description, /5-minute TTL|5-minute/);
assert.equal(joinTool.inputSchema.required.includes("product"), true);
assert.equal(joinTool.inputSchema.properties.node_id.pattern, "^[a-z0-9._-]+$");
assert.deepEqual(joinTool.inputSchema.properties.presence.enum, ["live", "locked", "isolated"]);

{
  const skill = meshSkillText();
  assert.doesNotMatch(skill, /Cap-7, home-origin, and cold shelves stay SLOT/);
  assert.match(skill, /cap7-mesh-dns/);
  assert.match(skill, /factory exec is LIVE on the Cap-7 plane/);
  assert.match(skill, /single-node security-awareness/i);
  assert.match(skill, /not a loopback fence|not a fence of the mesh/i);
  assert.equal(meshSecurityCite().mesh_fenced_to_loopback, false);
  assert.equal(meshSecurityCite().forced_loopback, false);
  assert.equal(meshSecurityCite().loopback_isolation, false);
  assert.equal(meshSecurityCite().forced_loopback_is_mesh_fence, false);
  assert.equal(meshSecurityCite().loopback_isolation_is_mesh_fence, false);
  assert.equal(meshSecurityCite().phoenix_lock, true);
  assert.equal(meshSecurityCite().public_hostname_resurrection, false);
  assert.equal(meshSecurityCite().open_world_awareness.bind, "0.0.0.0");
  assert.equal(meshSecurityCite().open_world_awareness.law, "LIVE");
  assert.equal(meshSecurityCite().open_world_awareness.worker_socket, false);
  assert.equal(meshSecurityCite().open_world_awareness.status, "live-when-configured");
  assert.equal(meshSecurityCite().open_world_awareness.public_egress_ip, false);
  assert.equal(meshSecurityCite().open_world_awareness.not_a_second_internet, true);
  assert.match(skill, /0\.0\.0\.0/);
  assert.match(skill, /forced_loopback and loopback_isolation are not the mesh fence/);

  const nodeMesh = readFileSync(new URL("../docs/NODE_MESH.md", import.meta.url), "utf8");
  const fedPaper = readFileSync(new URL("../docs/designs/FED-MESH-1.0.md", import.meta.url), "utf8");
  assert.doesNotMatch(nodeMesh, /sibling loopback module/);
  assert.match(nodeMesh, /single-node security-awareness/);
  assert.match(nodeMesh, /does not fence the mesh to 127\.0\.0\.1/);
  assert.match(nodeMesh, /0\.0\.0\.0/);
  assert.match(nodeMesh, /forced_loopback/);
  assert.match(fedPaper, /0\.0\.0\.0/);
  assert.match(nodeMesh, /home-origin SLOT/);
  assert.match(nodeMesh, /LIVE on the Cap-7 plane/);
  assert.doesNotMatch(fedPaper, /SLOT\. Mesh-only/);
  assert.doesNotMatch(fedPaper, /Cite and refuse only/);
  assert.match(fedPaper, /LIVE factory exec on the Cap-7 plane/);
  assert.match(fedPaper, /single-node security-awareness/);
  assert.match(fedPaper, /Mirage is not AZVPN/);
  assert.match(fedPaper, /optional L1 bearer/i);

  const ui = readFileSync(new URL("../src/human-ui.js", import.meta.url), "utf8");
  assert.match(ui, /data-mesh="enable"/);
  assert.match(ui, /id="mesh-bearer"/);
  assert.match(ui, /id="mesh-radios-confirm"/);
  assert.match(ui, /data-mesh-radios/);

  const statusSec = await jsonReq(envWithMesh(), "/v1/mesh");
  assert.equal(statusSec.data.security.mesh_fenced_to_loopback, false);
  assert.equal(statusSec.data.open_world_awareness.bind, "0.0.0.0");
  assert.equal(statusSec.data.open_world_awareness.law, "LIVE");
  assert.equal(statusSec.data.open_world_awareness.worker_socket, false);
  assert.equal(statusSec.data.open_world_awareness.status, "live-when-configured");
  assert.equal(statusSec.data.radios === "on" || statusSec.data.radios === "off", true);
  assert.equal(statusSec.data.get_never_enables, true);

  const radiosTile = await meshRadios({}, envWithMesh());
  assert.equal(radiosTile.needs_confirm, true);
  assert.equal(radiosTile.mutated, false);
  assert.equal(radiosTile.security.mesh_fenced_to_loopback, false);
  assert.equal(radiosTile.open_world_awareness.bind, "0.0.0.0");
  assert.equal(radiosTile.open_world_awareness.law, "LIVE");
  assert.equal(radiosTile.open_world_awareness.worker_socket, false);

  const radiosOffTile = await meshRadios({ confirm: true }, envWithMesh({ MESH_RADIOS: "off" }));
  assert.equal(radiosOffTile.ok, false);
  assert.equal(radiosOffTile.code, "MESH-OFF");
  assert.equal(radiosOffTile.mutated, false);

  const radiosStay = await meshRadios({ confirm: true, public_egress_ip: true }, envWithMesh({ MESH_RADIOS: "on" }));
  assert.equal(radiosStay.ok, false);
  assert.equal(radiosStay.code, "MESH-STAY-OFF");
  const radiosFence = await meshRadios({ confirm: true, forced_loopback: true }, envWithMesh({ MESH_RADIOS: "on" }));
  assert.equal(radiosFence.ok, false);
  assert.equal(radiosFence.code, "MESH-STAY-OFF");
  assert.equal(radiosFence.mutated, false);

  const radiosOn = envWithMesh({ MESH_RADIOS: "on" });
  const radiosEnabled = await meshRadios({ confirm: true, bearer: "human" }, radiosOn);
  assert.equal(radiosEnabled.ok, true, JSON.stringify(radiosEnabled));
  assert.equal(radiosEnabled.mutated, true);
  assert.equal(radiosEnabled.receipt.op, "enable");
  const radiosJoin = await postJson(radiosOn, "/v1/mesh/join", { product: "foldlock" });
  assert.equal(radiosJoin.data.ok, true, JSON.stringify(radiosJoin.data));
  assert.ok(radiosJoin.data.human_mesh_users >= 1);
  const radiosBeat = await postJson(radiosOn, "/v1/mesh/heartbeat", { node_id: radiosJoin.data.session.node_id });
  assert.equal(radiosBeat.data.ok, true, JSON.stringify(radiosBeat.data));

  const nameEnv = envWithMesh();
  const id = await createIdentity({
    seed: Uint8Array.from({ length: 32 }, (_, i) => i + 1),
    encSeed: Uint8Array.from({ length: 32 }, (_, i) => i + 64),
  });
  const registered = await runMeshOp(
    "relay-register",
    await signAct(id, "register", {
      enc_public_key: id.enc_public_key,
      product: "mesh",
      presence: "live",
      relays: [],
      seq: 1,
      prev: ZERO_HASH,
    }),
    nameEnv,
  );
  assert.equal(registered.ok, true, JSON.stringify(registered));
  const selfName = `${id.handle.slice(1).toLowerCase()}.aziel`;
  const claimBody = await signAct(id, "name", {
    name: selfName,
    owner: id.handle,
    target: { type: "hash", value: "ab".repeat(32) },
    expires: null,
    seq: 2,
    prev: registered.statement_hash,
    prev_record: ZERO_HASH,
  });
  const dryClaim = await runMeshOp("name_claim", { ...claimBody }, nameEnv);
  assert.equal(dryClaim.ok, true);
  assert.equal(dryClaim.needs_confirm, true);
  assert.equal(dryClaim.mutated, false);
  const stayClaim = await runMeshOp("name_claim", { ...claimBody, confirm: true, public_egress_ip: true }, nameEnv);
  assert.equal(stayClaim.ok, false);
  assert.equal(stayClaim.code, "MESH-STAY-OFF");
  assert.equal(stayClaim.mutated, false);
  const claimed = await runMeshOp("name_claim", { ...claimBody, confirm: true }, nameEnv);
  assert.equal(claimed.ok, true, JSON.stringify(claimed));
  assert.equal(claimed.mutated, true);
  assert.equal(claimed.chainlock.anchored, true);
  assert.equal(claimed.public_icann, false);
  assert.equal(claimed.not_a_second_internet, true);
  assert.equal(claimed.security.mesh_fenced_to_loopback, false);
  assert.equal(claimed.target.value, "ab".repeat(32));
  const readName = await runMeshOp("name_read", { name: selfName }, nameEnv);
  assert.equal(readName.ok, true, JSON.stringify(readName));
  assert.equal(readName.record.target.value, "ab".repeat(32));
  const resolvedName = await runMeshOp("name_resolve", { name: selfName }, nameEnv);
  assert.equal(resolvedName.ok, true, JSON.stringify(resolvedName));
  assert.equal(resolvedName.resolved, true);
  assert.equal(resolvedName.target.value, "ab".repeat(32));
  assert.equal(resolvedName.owner, id.handle);
  const slots = await runMeshOp("slot_read", { handle: id.handle }, nameEnv);
  assert.equal(slots.ok, true, JSON.stringify(slots));
  assert.equal(slots.handle, id.handle);
  assert.equal(slots.user_slot_cap, 3);
  const witnessDry = await runMeshOp("witness", { subject_kind: "name", subject_hash: claimed.statement_hash }, nameEnv);
  assert.equal(witnessDry.needs_confirm, true);
  assert.equal(witnessDry.mutated, false);
  const bob = await createIdentity({
    seed: Uint8Array.from({ length: 32 }, (_, i) => 255 - i),
    encSeed: Uint8Array.from({ length: 32 }, (_, i) => 128 + (i % 64)),
  });
  const bobReg = await runMeshOp(
    "relay-register",
    await signAct(bob, "register", {
      enc_public_key: bob.enc_public_key,
      product: "mesh",
      presence: "live",
      relays: [],
      seq: 1,
      prev: ZERO_HASH,
    }),
    nameEnv,
  );
  assert.equal(bobReg.ok, true, JSON.stringify(bobReg));
  const witnessBody = await signAct(bob, "witness", {
    subject_kind: "name",
    subject_hash: claimed.statement_hash,
    seq: 2,
    prev: bobReg.statement_hash,
  });
  const witnessLive = await runMeshOp("witness", { ...witnessBody, confirm: true }, nameEnv);
  assert.equal(witnessLive.ok, false, JSON.stringify(witnessLive));
  assert.equal(witnessLive.code, "FED-MESH-WITNESS");
  assert.equal(witnessLive.mutated, false);
  const aznetDry = await runAznet("name_read", { name: selfName }, null, nameEnv);
  assert.equal(aznetDry.ok, true, JSON.stringify(aznetDry));
  assert.equal(aznetDry.pair_required, false);
  assert.equal(aznetDry.payload_host, false);
  const aznetHost = await runAznet("name_claim", { ...claimBody, confirm: true, host_payload: true }, null, nameEnv);
  assert.equal(aznetHost.ok, false);
  assert.equal(aznetHost.code, "AZN-NO-PAYLOAD");
}

console.log(
  `ok mesh ${RUNTIME_VERSION}: QNM-BUILD-1.0 rollup, suite-presence ON by default, disable refused, live/locked/isolated, join TTL/MESH-OFF/validation, name door, radios tile, MCP ${MESH_MCP_TOOLS.length} tools, FragGate slug=mesh`,
);
