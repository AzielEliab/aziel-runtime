/**
 * Open-world awareness bind 0.0.0.0 beside suite mesh radios.
 * Law is LIVE. Worker socket is live-when-configured.
 * Local qnm-node is LIVE only while it listens on 0.0.0.0.
 * Author: Aziel Eliab only.
 */
import assert from "node:assert/strict";
import { memorySessionNamespace } from "../src/session-do.js";
import { meshSecurityCite, meshStayOffHit } from "../src/mesh.js";
import { openWorldAwarenessCite } from "../src/open-world-awareness.js";
import { localAwarenessStatus, startOpenWorldAwareness } from "../qnm-node/awareness.js";
import { meshRadios } from "../src/engines/azinterface/ops.js";

const handler = (await import("../src/index.js")).default.fetch;
const origin = "https://aziel-runtime.example";
const env = { SESSION: memorySessionNamespace({}) };

function assertStayOff(row, where) {
  assert.equal(row.bind, "0.0.0.0", where);
  assert.equal(row.law, "LIVE", where);
  assert.equal(row.open_world_awareness, true, where);
  assert.equal(row.all_interfaces, true, where);
  assert.equal(row.worker_socket, false, where);
  assert.equal(row.mock, false, where);
  assert.equal(row.forced_loopback, false, where);
  assert.equal(row.loopback_isolation, false, where);
  assert.equal(row.forced_loopback_is_mesh_fence, false, where);
  assert.equal(row.loopback_isolation_is_mesh_fence, false, where);
  assert.equal(row.mesh_fenced_to_loopback, false, where);
  assert.equal(row.public_egress_ip, false, where);
  assert.equal(row.residential, false, where);
  assert.equal(row.cf_geo_exit, false, where);
  assert.equal(row.cf_geo_exit_pool, false, where);
  assert.equal(row.sticky_public_ip, false, where);
  assert.equal(row.packet_forward, false, where);
  assert.equal(row.packet_forwarding, false, where);
  assert.equal(row.public_icann, false, where);
  assert.equal(row.cap7_is_icann, false, where);
  assert.equal(row.replaces_internet, false, where);
  assert.equal(row.not_a_second_internet, true, where);
  assert.equal(row.hosted_vpn, false, where);
  assert.equal(row.payload_host, false, where);
  assert.equal(row.vpn_hop, false, where);
  assert.equal(row.wireguard, false, where);
  assert.equal(row.openvpn, false, where);
  assert.equal(row.l3_exit, false, where);
  assert.match(row.note, /forced_loopback and loopback_isolation are not the mesh fence/);
}

const idle = openWorldAwarenessCite();
assertStayOff(idle, "worker cite");
assert.equal(idle.status, "live-when-configured");
assert.equal(idle.live, false);
assert.equal(idle.socket, "live-when-configured");
assert.equal(idle.qnm_node_bind, "live-when-configured");

const security = meshSecurityCite();
assert.equal(security.operator_locks.length, 3);
assert.equal(security.operator_locks[0].id, "single-node-security-awareness");
assert.equal(security.operator_locks[0].status, "LIVE");
assert.equal(security.operator_locks[1].id, "phoenix-reboot-loop");
assert.equal(security.operator_locks[1].public_hostname_resurrection, false);
assert.equal(security.operator_locks[2].id, "open-world-awareness");
assert.equal(security.operator_locks[2].bind, "0.0.0.0");
assertStayOff(security.open_world_awareness, "security");

assert.equal(meshStayOffHit({ forced_loopback: true }), "forced_loopback");
assert.equal(meshStayOffHit({ loopback_isolation: true }), "loopback_isolation");
assert.equal(meshStayOffHit({ open_world_awareness: false }), "open_world_awareness");
assert.equal(meshStayOffHit({ cf_geo_exit: true }), "cf_geo_exit");
assert.equal(meshStayOffHit({ l3_exit: true }), "l3_exit");
assert.equal(meshStayOffHit({ public_egress_ip: true }), "public_egress_ip");

const absent = localAwarenessStatus();
assert.equal(absent.status, "live-when-configured");
assert.equal(absent.live, false);
assert.equal(absent.mock, false);

const refused = await startOpenWorldAwareness({ host: "127.0.0.1" });
assert.equal(refused.ok, false);
assert.equal(refused.code, "QNM-AWARENESS-BIND");
assert.equal(refused.listening, false);
assert.equal(refused.packet_forward, false);

const live = await startOpenWorldAwareness({ port: 0 });
try {
  assert.equal(live.ok, true);
  assert.equal(live.bind, "0.0.0.0");
  assert.equal(live.listening, true);
  assert.equal(live.cite.status, "LIVE");
  assert.equal(live.cite.live, true);
  assert.equal(live.cite.worker_socket, false);
  assert.equal(live.cite.public_egress_ip, false);
  assert.equal(live.cite.packet_forward, false);
  const res = await fetch(`http://127.0.0.1:${live.port}/awareness`);
  const body = await res.json();
  assert.equal(res.status, 200);
  assert.equal(body.ok, true);
  assert.equal(body.bind, "0.0.0.0");
  assert.equal(body.status, "LIVE");
  assert.equal(body.law, "LIVE");
  assert.equal(body.listening, true);
  assert.equal(body.packet_forward, false);
  assert.equal(body.public_icann, false);
  assert.equal(body.not_a_second_internet, true);
  const posted = await fetch(`http://127.0.0.1:${live.port}/awareness`, { method: "POST", body: "{}" });
  const denied = await posted.json();
  assert.equal(posted.status, 405);
  assert.equal(denied.packet_forward, false);
  assert.equal(denied.code, "QNM-AWARENESS-READ");
} finally {
  await live.stop();
}

const mesh = await (await handler(new Request(origin + "/v1/mesh"), env)).json();
assert.equal(mesh.open_world_awareness.bind, "0.0.0.0");
assert.equal(mesh.open_world_awareness.law, "LIVE");
assert.equal(mesh.open_world_awareness.status, "live-when-configured");
assert.equal(mesh.open_world_awareness.worker_socket, false);
assert.ok(mesh.radios === "on" || mesh.radios === "off");
assert.equal(mesh.get_never_enables, true);
assert.equal(mesh.security.mesh_fenced_to_loopback, false);
assert.equal(mesh.security.phoenix_lock, true);
assert.equal(mesh.security.public_hostname_resurrection, false);
assert.equal(mesh.not_a_second_internet, true);

const tile = await meshRadios({}, env);
assert.equal(tile.needs_confirm, true);
assert.equal(tile.open_world_awareness.bind, "0.0.0.0");
assert.equal(tile.radios === "on" || tile.radios === "off", true);

const init = await (
  await handler(
    new Request(origin + "/mcp", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "initialize", params: {} }),
    }),
    env,
  )
).json();
assert.match(init.result.instructions, /0\.0\.0\.0/);
assert.match(init.result.instructions, /forced_loopback and loopback_isolation are not the mesh fence/);
const listed = await (
  await handler(
    new Request(origin + "/mcp", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 2, method: "tools/list", params: {} }),
    }),
    env,
  )
).json();
assert.equal(listed.result.tools.length, 36);

console.log(
  JSON.stringify({
    ok: true,
    bind: "0.0.0.0",
    law: "LIVE",
    worker_socket: "live-when-configured",
    local_listen: "LIVE",
    tools: 36,
  }),
);
