/**
 * Nine QNM / Node Mesh laws must be HARD TRUE:
 * machine fields on GET /v1/mesh (+ status) and a published refuse path
 * for each violation. Not a new MCP tool. Author: Aziel Eliab only.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { PRODUCTS } from "../src/index.js";
import { RUNTIME_VERSION } from "../src/runtime-api.js";
import {
  MESH_MCP_TOOLS,
  meshCiteField,
  resetMeshStore,
  runMeshOp,
} from "../src/mesh.js";
import {
  NINE_LAW_PAPERS,
  NINE_LAW_REFUSE_CODES,
  NINE_LAWS,
  NINE_LAWS_AUTHOR_ID,
  NINE_LAWS_COUNT,
  NINE_LAWS_HASHTAG_PARTS,
  NINE_LAWS_IDENTITY,
  NINE_LAWS_RUNTIME_ID,
  assertNineLawsHardTrue,
  refuseNineLawViolation,
} from "../src/mesh-nine-laws.js";

const handler = (await import("../src/index.js")).default.fetch;
const origin = "https://aziel-runtime.example";
const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel) => readFileSync(join(root, rel), "utf8");

resetMeshStore();

async function jsonReq(path, init = {}) {
  const res = await handler(
    new Request(origin + path, { headers: { "user-agent": "Mozilla/5.0" }, ...init }),
    {},
  );
  let data;
  try {
    data = await res.json();
  } catch {
    data = null;
  }
  return { status: res.status, data };
}

async function postJson(path, body) {
  return jsonReq(path, {
    method: "POST",
    headers: { "content-type": "application/json", "user-agent": "Mozilla/5.0" },
    body: JSON.stringify(body || {}),
  });
}

function law1_split_wires_fields_and_refuse(live) {
  assert.equal(live.clocks_share_socket, false);
  assert.equal(live.tick_plane, "presence-tip-hash");
  assert.equal(live.payload_plane, "receiver-pull");
  assert.equal(live.tick_body, false);
  assert.equal(live.tick_diff, false);
  assert.equal(live.tick_file, false);
  assert.equal(live.tick_ms.min, 500);
  assert.equal(live.tick_ms.max, 1000);
  assert.equal(live.dwell_s, 777);
}

function law2_cold_copy_fields_and_refuse(live) {
  assert.equal(live.live_body_sync, false);
  assert.equal(live.named_hosts_only, true);
  assert.equal(live.tip_content_addressed, true);
}

function law3_reheal_refuse(live) {
  assert.equal(live.isolation_is_the_cure, true);
  assert.equal(live.neighbor_heal, false);
  assert.equal(live.vote_to_fix, false);
}

function law4_phoenix_local_only(live) {
  assert.equal(live.phoenix_local_only, true);
  assert.equal(live.neighbor_phoenix, false);
  assert.equal(live.public_hostname_resurrection, false);
}

function law5_die_with_pull_no_godlock_uk(live) {
  assert.equal(live.die_with_pull, true);
  assert.equal(live.restore_godlock_uk, false);
  assert.equal(live.climb_public_hostname, false);
  assert.equal(live.godlock_is_identity, false);
}

function law6_no_neighbor_heal(live) {
  assert.equal(live.neighbor_heal, false);
  assert.equal(live.apply_last_packet_on_heartbeat_loss, false);
}

function law7_no_node_gate(live) {
  assert.equal(live.node_gate, false);
  assert.equal(live.login_mesh, false);
  assert.equal(live.login_recovery, false);
  assert.equal(live.ip_panel, false);
  assert.equal(live.get_is_node_gate, false);
}

function law8_no_auto_heal(live) {
  assert.equal(live.implicit_heal, false);
  assert.equal(live.auto_heal, false);
  assert.equal(live.heartbeat_loss_isolates, false);
  assert.equal(live.apply_last_packet, false);
}

function law9_not_anonymity_network(live) {
  assert.equal(live.anonymity_network, false);
  assert.equal(live.vpn, false);
  assert.equal(live.origin_hiding, false);
}

assert.equal(NINE_LAWS.length, NINE_LAWS_COUNT);
assert.equal(NINE_LAWS_IDENTITY, "Aziel Eliab");
assert.deepEqual(MESH_MCP_TOOLS.slice(), [
  "mesh_status",
  "mesh_enable",
  "mesh_disable",
  "mesh_join",
  "mesh_heartbeat",
  "mesh_leave",
  "mesh_nodes",
  "mesh_broadcast",
]);

const mesh = await jsonReq("/v1/mesh");
assert.equal(mesh.status, 200, JSON.stringify(mesh.data));
assert.equal(mesh.data.identity, "Aziel Eliab");
assert.equal(mesh.data.author, "Aziel Eliab");
assert.equal(mesh.data.author_id, NINE_LAWS_AUTHOR_ID);
assert.equal(mesh.data.runtime_id, NINE_LAWS_RUNTIME_ID);
assert.deepEqual(mesh.data.hashtag_parts, { ...NINE_LAWS_HASHTAG_PARTS });
assert.equal(mesh.data.about.always, true);
assert.equal(mesh.data.about.path, "/about");
assert.equal(mesh.data.about.identity, "Aziel Eliab");
assert.equal(mesh.data.nine_laws.hard_true, true);
assert.equal(mesh.data.nine_laws.count, 9);
assert.equal(mesh.data.semantic_bridge?.resolves_to_hub ?? meshCiteField(origin).semantic_bridge.resolves_to_hub, false);

const status = await jsonReq("/v1/mesh/status");
assert.equal(status.status, 200);
assert.equal(status.data.nine_laws.hard_true, true);

for (const live of [mesh.data, status.data]) {
  const check = assertNineLawsHardTrue(live);
  assert.equal(check.ok, true, `LIVE fields missing or false: ${check.missing.join(", ")}`);
  law1_split_wires_fields_and_refuse(live);
  law2_cold_copy_fields_and_refuse(live);
  law3_reheal_refuse(live);
  law4_phoenix_local_only(live);
  law5_die_with_pull_no_godlock_uk(live);
  law6_no_neighbor_heal(live);
  law7_no_node_gate(live);
  law8_no_auto_heal(live);
  law9_not_anonymity_network(live);
  assert.equal(live.papers.node_mesh, NINE_LAW_PAPERS.node_mesh);
  assert.equal(live.papers.sec_feat, NINE_LAW_PAPERS.sec_feat);
  assert.equal(live.papers.node_ops, NINE_LAW_PAPERS.node_ops);
  assert.equal(live.papers.qnm_wp, NINE_LAW_PAPERS.qnm_wp);
}

resetMeshStore();
const joined = await runMeshOp("join", { product: "godlock", node_id: "nine-laws-peer" }, {});
assert.equal(joined.ok, true, JSON.stringify(joined));
assert.equal(joined.nine_laws.hard_true, true);
assert.equal(joined.godlock_is_identity, false);

const tickBody = await runMeshOp("heartbeat", { node_id: "nine-laws-peer", body: "also here’s the file" }, {});
assert.equal(tickBody.ok, false);
assert.equal(tickBody.code, NINE_LAW_REFUSE_CODES["split-wires"]);

const shareSocket = await runMeshOp("heartbeat", { node_id: "nine-laws-peer", clocks_share_socket: true }, {});
assert.equal(shareSocket.ok, false);
assert.equal(shareSocket.code, NINE_LAW_REFUSE_CODES["split-wires-clocks"]);
assert.equal(shareSocket.law, "split-wires");

const liveSync = await runMeshOp("broadcast", { sha256: "ab".repeat(32), live_body_sync: true }, {});
assert.equal(liveSync.ok, false);
assert.equal(liveSync.code, NINE_LAW_REFUSE_CODES["cold-copy"]);

const reheal = await runMeshOp("heartbeat", { node_id: "nine-laws-peer", neighbor_heal: true }, {});
assert.equal(reheal.ok, false);
assert.equal(reheal.code, NINE_LAW_REFUSE_CODES.reheal);

const phoenix = await runMeshOp("heartbeat", { node_id: "nine-laws-peer", neighbor_phoenix: true }, {});
assert.equal(phoenix.ok, false);
assert.equal(phoenix.code, NINE_LAW_REFUSE_CODES.phoenix);
assert.equal(phoenix.law, "phoenix");

const ukBack = await runMeshOp(
  "heartbeat",
  { node_id: "nine-laws-peer", restore_godlock_uk: true, hostname: "godlock.uk" },
  {},
);
assert.equal(ukBack.ok, false);
assert.equal(ukBack.code, NINE_LAW_REFUSE_CODES["die-with-pull"]);
assert.equal(ukBack.restore_godlock_uk, false);
assert.equal(ukBack.godlock_is_identity, false);

const hostRestore = await runMeshOp(
  "status",
  { resurrect: true, hostname: "azieleliab.com" },
  {},
);
assert.equal(hostRestore.ok, false);
assert.equal(hostRestore.code, NINE_LAW_REFUSE_CODES["die-with-pull"]);

const applyLast = await runMeshOp("heartbeat", { node_id: "nine-laws-peer", apply_last_packet: true }, {});
assert.equal(applyLast.ok, false);
assert.equal(applyLast.code, NINE_LAW_REFUSE_CODES["neighbor-heal"]);

const vote = await runMeshOp("heartbeat", { node_id: "nine-laws-peer", vote_to_fix: true }, {});
assert.equal(vote.ok, false);
assert.equal(vote.code, NINE_LAW_REFUSE_CODES["neighbor-heal"]);

const gate = await runMeshOp("status", { node_gate: true }, {});
assert.equal(gate.ok, false);
assert.equal(gate.code, NINE_LAW_REFUSE_CODES["node-gate"]);
assert.equal(gate.node_gate, false);

const getGate = await jsonReq("/v1/mesh?node_gate=true");
assert.equal(getGate.status, 405);
assert.equal(getGate.data.ok, false);
assert.equal(getGate.data.code, NINE_LAW_REFUSE_CODES["node-gate"]);
assert.equal(getGate.data.node_gate, false);
assert.equal(getGate.data.get_is_node_gate, false);

const getUk = await jsonReq("/v1/mesh?restore_godlock_uk=true");
assert.equal(getUk.status, 405);
assert.equal(getUk.data.code, NINE_LAW_REFUSE_CODES["die-with-pull"]);
assert.equal(getUk.data.restore_godlock_uk, false);

const autoHeal = await runMeshOp("heartbeat", { node_id: "nine-laws-peer", auto_heal: true }, {});
assert.equal(autoHeal.ok, false);
assert.equal(autoHeal.code, NINE_LAW_REFUSE_CODES["auto-heal"]);
assert.equal(autoHeal.implicit_heal, false);

const implicit = await runMeshOp("leave", { node_id: "nine-laws-peer", implicit_heal: true }, {});
assert.equal(implicit.ok, false);
assert.equal(implicit.code, NINE_LAW_REFUSE_CODES["auto-heal"]);

const vpn = await runMeshOp("status", { vpn: true }, {});
assert.equal(vpn.ok, false);
assert.equal(vpn.code, NINE_LAW_REFUSE_CODES.anonymity);
assert.equal(vpn.anonymity_network, false);

const hide = await runMeshOp("broadcast", { sha256: "cd".repeat(32), origin_hiding: true }, {});
assert.equal(hide.ok, false);
assert.equal(hide.code, NINE_LAW_REFUSE_CODES.anonymity);

const stubHeal = await runMeshOp("heal", {}, {});
assert.equal(stubHeal.ok, false);
assert.equal(stubHeal.code, "MESH-STUB");
const stubVpn = await runMeshOp("vpn", {}, {});
assert.equal(stubVpn.ok, false);
assert.equal(stubVpn.code, "MESH-STUB");
const stubGate = await runMeshOp("gate", {}, {});
assert.equal(stubGate.ok, false);
assert.equal(stubGate.code, "MESH-STUB");
const stubResurrect = await runMeshOp("resurrect", {}, {});
assert.equal(stubResurrect.ok, false);
assert.equal(stubResurrect.code, "MESH-STUB");

const unit = refuseNineLawViolation({ restore_godlock_uk: true });
assert.equal(unit.ok, false);
assert.equal(unit.code, "MESH-STUB");

const papers_cited_on_live = () => {
  for (const rel of Object.values(NINE_LAW_PAPERS)) {
    const text = read(rel);
    assert.match(text, /Aziel Eliab only/, rel);
    assert.match(text, /GET \/v1\/mesh/, rel);
    assert.doesNotMatch(text, /Phoenix brings/i, rel);
    assert.doesNotMatch(text, /|Glama UUID/i, rel);
  }
};
papers_cited_on_live();

const nodeMesh = read("docs/NODE_MESH.md");
assert.match(nodeMesh, /Nine laws \(hard-true\)/);
assert.match(nodeMesh, /clocks_share_socket/);
assert.match(nodeMesh, /restore_godlock_uk/);
assert.match(nodeMesh, /anonymity_network/);
assert.match(nodeMesh, /MESH-NO-NEIGHBOR-HEAL/);
assert.match(nodeMesh, /GodLock is a product name/);

const sec = read("docs/designs/SEC-FEAT-1.0.md");
assert.match(sec, /Nine QNM laws are hard-true/);
const ops = read("docs/designs/NODE-OPS-1.0.md");
assert.match(ops, /nine-law fields|Nine QNM laws are hard-true/);
const qnm = read("docs/designs/QNM-WP-1.0.md");
assert.match(qnm, /nine-law|Nine QNM laws are hard-true/);

const cite = meshCiteField(origin);
assert.equal(cite.node_gate, false);
assert.equal(cite.semantic_bridge.resolves_to_hub, false);
assert.equal(cite.nine_laws.hard_true, true);
assert.equal(cite.identity || NINE_LAWS_IDENTITY, "Aziel Eliab");
assert.equal(cite.author_id, NINE_LAWS_AUTHOR_ID);
assert.equal(cite.runtime_id, NINE_LAWS_RUNTIME_ID);
assert.deepEqual(cite.hashtag_parts, { ...NINE_LAWS_HASHTAG_PARTS });
assert.equal(cite.about.always, true);
assert.equal(cite.about.path, "/about");
assert.equal(cite.about.url, `${origin}/about`);
assert.match(NINE_LAWS_AUTHOR_ID, /#aziel$/);
assert.match(NINE_LAWS_RUNTIME_ID, /#runtime$/);

const openapi = await jsonReq("/openapi.json");
assert.match(openapi.data.paths["/v1/mesh"].get.summary, /Nine QNM laws|hard-true|clocks_share_socket/);
assert.match(openapi.data.paths["/v1/mesh/az-generator"].get.summary, /resolves_to_hub false/);

const software = await jsonReq("/v1/software");
assert.equal(software.data.mesh.nine_laws.hard_true, true);
assert.equal(software.data.mesh.node_gate, false);
assert.ok(!software.data.software.some((s) => s.slug === "mesh"));

const mcp = await jsonReq("/mcp", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list", params: {} }),
});
const tools = mcp.data.result.tools.map((t) => t.name);
for (const name of MESH_MCP_TOOLS) {
  assert.ok(tools.includes(name), `must not drop MCP tool ${name}`);
}
assert.ok(!tools.includes("mesh_nine_laws"));
assert.ok(!tools.includes("mesh_heal"));
assert.ok(PRODUCTS.every((p) => p.slug !== "mesh"));

resetMeshStore();
console.log(
  `ok mesh-nine-laws ${RUNTIME_VERSION}: ${NINE_LAWS.map((l) => l.slug).join(", ")} hard-true on GET /v1/mesh; refuses ${Object.values(NINE_LAW_REFUSE_CODES).join(", ")}`,
);
