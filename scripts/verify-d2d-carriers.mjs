/**
 * Phase A device-to-device packet plane.
 * Cap-7 stays the name plane. Packet carriers stay NOT-READY / FG-STUB.
 * Author: Aziel Eliab.
 */
import assert from "node:assert/strict";
import { PRODUCTS } from "../src/index.js";
import { SUITE_SOFTWARE_COUNT } from "../src/guide-reason.js";
import { SOFTWARE_COPY } from "../src/software-copy.js";
import { PUBLIC_MCP_TOOLS } from "../src/fraggate/codes.js";
import { STUB_OPS, buildRegistry, classifyCall } from "../src/fraggate/registry.js";
import { admitCall, previewCatalogAdmission } from "../src/fraggate/door.js";
import { resetLedger } from "../src/fraggate/ledger.js";
import { aznetSkill } from "../src/engines/aznet/engine.js";
import { meshStatus, resetMeshStore, runMeshOp } from "../src/mesh.js";
import {
  D2D_CARRIERS,
  D2D_CODE,
  D2D_ORDER_ARROW,
  D2D_ORDER_LABEL,
  D2D_PLANE,
  D2D_SPEC,
  D2D_STATUS,
  D2D_STUB_OPS,
  isD2dStubOp,
} from "../src/d2d-carriers.js";
import { track2CarrierProbe } from "../qnm-node/bearers/radio.js";

resetLedger();
resetMeshStore();

assert.equal(SUITE_SOFTWARE_COUNT, 42);
assert.equal(PRODUCTS.length, 41);
assert.equal(PRODUCTS.some((p) => p.slug === "d2d" || p.slug === "nodemesh"), false);
assert.equal(PUBLIC_MCP_TOOLS.length, 36);
assert.deepEqual(
  D2D_CARRIERS.map((row) => row.id),
  ["lan", "wifi", "bluetooth", "rf", "photon"],
);
assert.equal(D2D_ORDER_LABEL, "LAN, Wi-Fi, Bluetooth, RF, photon light flashes");
assert.equal(D2D_ORDER_ARROW, "LAN → Wi-Fi → Bluetooth → RF → Photon light flashes");
assert.equal(D2D_PLANE, "track2-reachability");
for (const row of D2D_CARRIERS) {
  assert.equal(row.status, D2D_STATUS);
  assert.equal(row.code, D2D_CODE);
  assert.equal(row.packet_live, false);
  assert.equal(row.mock, false);
  assert.equal(isD2dStubOp(row.op), true);
}
assert.match(D2D_CARRIERS[3].note, /ModemManager/);
assert.match(D2D_CARRIERS[3].note, /beyond Wi-Fi and Bluetooth/);
assert.match(D2D_CARRIERS[4].note, /camera and flash/);
assert.match(D2D_CARRIERS[4].note, /No mock LIVE/);

const copy = `${SOFTWARE_COPY.aznet.one_line} ${SOFTWARE_COPY.aznet.description}`;
assert.match(copy, /Check hash continuity/);
assert.match(copy, /Cap-7/);
assert.match(copy, /NOT-READY/);
assert.match(copy, /FG-STUB/);
assert.match(copy, new RegExp(D2D_ORDER_LABEL.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
assert.match(copy, /not an ICANN registrar/);
assert.match(copy, /not a public egress IP/);
assert.match(copy, /not AZVPN/);
assert.doesNotMatch(copy, /this is not/i);
assert.doesNotMatch(copy, /\b(?:SLOT|REAL)\b/);
assert.doesNotMatch(copy, /alternative internet is live|alt-internet LIVE|LIVE alt-internet/i);

const registry = buildRegistry(PRODUCTS);
assert.equal(registry.bySlug.aznet.status, "live");
assert.equal(registry.bySlug.mesh.status, "live");
const packetOps = [
  "d2d_discover",
  "discover",
  "d2d_tunnel",
  "d2d_multi_hop",
  "multi-hop",
  "d2d_lan",
  "lan",
  "d2d_wifi",
  "wifi",
  "d2d_bluetooth",
  "bluetooth",
  "d2d_rf",
  "rf",
  "d2d_photon",
  "photon",
  "alt_internet",
  "packet_forward",
  "mesh_discover",
  "peer_advertise",
  "peer_list",
  "peer_session_open",
  "peer_session_status",
  "peer_session_close",
  "peer_send",
  "peer_recv",
  "outbox_enqueue",
  "outbox_cut",
  "store_forward",
  "path_probe",
  "bootstrap_list",
  "shelf_cite",
  "tip_pull",
  "origin_status",
];
for (const op of packetOps) {
  assert.ok(D2D_STUB_OPS.includes(op), op);
  assert.ok(STUB_OPS.mesh.includes(op), `mesh stub ${op}`);
  assert.ok(STUB_OPS.aznet.includes(op), `aznet stub ${op}`);
  assert.equal(classifyCall(registry.bySlug.mesh, op).kind, "stub", op);
  assert.equal(classifyCall(registry.bySlug.aznet, op).kind, "stub", `aznet ${op}`);
  assert.equal(classifyCall(registry.bySlug.mesh, "name_read").kind, "live");
  assert.equal(classifyCall(registry.bySlug.aznet, "name_claim").kind, "live");
}

for (const slug of ["mesh", "aznet"]) {
  for (const op of ["d2d_discover", "d2d_rf", "d2d_photon", "alt_internet", "peer_session_open", "mesh_discover"]) {
    const preview = previewCatalogAdmission({ slug, op, confirm: true, dry_run: true, payload: {} }, registry, null);
    assert.equal(preview.proceed, false, `${slug} ${op} dry_run`);
    assert.equal(preview.envelope.code, "FG-STUB");
    assert.equal(preview.envelope.ledger_written, false);
    const admitted = await admitCall({ slug, op, confirm: true, payload: { live: true } }, registry, null, { gate: false });
    assert.equal(admitted.admitted, false, `${slug} ${op} confirm`);
    assert.equal(admitted.envelope.code, "FG-STUB");
    assert.equal(admitted.envelope.op, op);
    assert.match(admitted.envelope.message, /stub/);
  }
}

const kernel = await runMeshOp("d2d_photon", { confirm: true }, {});
assert.equal(kernel.ok, false);
assert.equal(kernel.code, "MESH-STUB");
assert.equal(kernel.door_code, "FG-STUB");
assert.equal(kernel.status, "NOT-READY");
assert.equal(kernel.packet_path_live, false);
assert.equal(kernel.alt_internet_live, false);
assert.equal(kernel.plane, "track2-reachability");
assert.equal(kernel.cap7_egress_code, "MG-NO-IP-EXIT");
assert.equal(kernel.d2d_carriers.order_arrow, D2D_ORDER_ARROW);
assert.equal(kernel.d2d_carriers.refuse.cap7_egress, "MG-NO-IP-EXIT");
assert.equal(kernel.d2d_carriers.refuse.radio_absent, "QNM-RADIO-ABSENT");
const routed = await runMeshOp("store_forward", {}, {});
assert.equal(routed.code, "MESH-STUB");
assert.equal(routed.door_code, "FG-STUB");
assert.equal(routed.route_code, "MESH-NO-ROUTE");
assert.equal(routed.packet_path_live, false);
assert.equal(isD2dStubOp("relay_forward"), false);
assert.equal(classifyCall(registry.bySlug.mesh, "relay_forward").kind, "live");
assert.equal(kernel.d2d_carriers.cap7_public_egress, false);
assert.equal(kernel.d2d_carriers.cap7_public_icann, false);
assert.equal(kernel.d2d_carriers.mirage_is_azvpn, false);
assert.equal(kernel.d2d_carriers.field_1_0, false);
assert.equal(kernel.d2d_carriers.warn5, "STANDS-until-demonstrated");
assert.equal(kernel.d2d_carriers.warn5_permanent_stay_off, false);
assert.equal(kernel.d2d_carriers.security.mesh_fenced_to_loopback, false);
assert.deepEqual(kernel.d2d_carriers.order, ["lan", "wifi", "bluetooth", "rf", "photon"]);

const live = await meshStatus({}, {});
assert.equal(live.wifi, "cite");
assert.equal(live.d2d_carriers.spec, D2D_SPEC);
assert.equal(live.d2d_carriers.status, "NOT-READY");
assert.equal(live.d2d_carriers.code, "FG-STUB");
assert.equal(live.d2d_carriers.alt_internet_live, false);
assert.equal(live.d2d_carriers.packet_path_live, false);
assert.equal(live.d2d_carriers.cap7_is_name_plane, true);
assert.equal(live.d2d_carriers.lan_discovery, "LIVE-when-armed");
assert.equal(live.d2d_carriers.peer_tunnel, "LIVE-when-session");
assert.equal(live.d2d_carriers.rf_discovery, "REFUSE-without-HW");
assert.equal(live.d2d_carriers.photon_discovery, "REFUSE-without-HW");
assert.equal(live.d2d_carriers.wifi_discovery, "ARMED-when-HW");
assert.equal(live.d2d_carriers.bluetooth_discovery, "ARMED-when-HW");
assert.equal(live.d2d_carriers.worker_hardware, false);
assert.equal(live.d2d_carriers.get_never_enables, true);
assert.equal(live.d2d_carriers.store_forward, "LIVE-when-three-local-nodes / fixture");
assert.equal(live.d2d_carriers.store_forward_public, "FG-STUB");
assert.equal(live.d2d_carriers.worker_runs_store_forward, false);
assert.equal(live.d2d_carriers.phase, "B+C+D");
assert.equal(live.d2d_carriers.phases.E, "scaffold");
assert.equal(live.d2d_carriers.needs_starting_address, true);
assert.equal(live.d2d_carriers.live_multi_provider, false);
assert.equal(live.d2d_carriers.cold_shelf_live, false);
assert.equal(live.d2d_carriers.dns_cut, false);
assert.equal(live.d2d_carriers.origin_cutover, false);
assert.equal(live.d2d_carriers.warn5_closed, false);
assert.equal(live.d2d_carriers.second_device, false);
assert.equal(live.d2d_carriers.mobile_client, "present-not-demonstrated");
assert.equal(live.d2d_carriers.mobile_demonstrated, false);
assert.equal(live.d2d_carriers.app_store_release, false);
for (const id of ["wifi", "bluetooth", "rf", "photon"]) {
  const row = live.d2d_carriers.carriers.find((carrier) => carrier.id === id);
  assert.equal(row.peer_exchange_demonstrated, false, id);
}
assert.equal(live.d2d_carriers.peers, undefined);
assert.equal(live.not_a_second_internet, true);
assert.equal(live.channel_plane.wifi, "cite");
assert.equal(live.channel_plane.worker_hardware, false);
assert.equal(live.channel_plane.worker_radios_live, false);
for (const id of ["wifi", "bluetooth", "rf", "photon"]) {
  assert.equal(live.channel_plane[id], "cite", id);
  if (live.worker_hardware === false && (live.channel_plane[id] === "on" || live[id] === "on" || live[id] === true)) {
    assert.fail(`${id} claims radio hardware the worker cannot see`);
  }
}

const skill = aznetSkill();
assert.match(skill.markdown, /Cap-7/);
assert.match(skill.markdown, /FG-STUB/);
assert.match(skill.markdown, /photon light flashes/);
assert.match(skill.markdown, /ModemManager/);
assert.match(skill.markdown, /STANDS-until-demonstrated/);
assert.match(skill.markdown, /LAN → Wi-Fi → Bluetooth → RF → Photon light flashes/);
assert.match(skill.markdown, /peer_session_open/);
assert.match(SOFTWARE_COPY.miragegrid.description, /FG-STUB/);
assert.match(SOFTWARE_COPY.azvpn.description, /NOT-READY/);
const probe = track2CarrierProbe();
assert.equal(probe.packet_live, false);
assert.equal(probe.alt_internet_live, false);
assert.deepEqual(probe.order, ["lan", "wifi", "bluetooth", "rf", "photon"]);
for (const id of probe.order) {
  const row = probe.carriers[id];
  assert.notEqual(row.state, "LIVE", id);
  assert.equal(row.packet_live, false);
  assert.equal(row.mock, false);
  if (row.state === "REFUSE") assert.equal(row.code, "QNM-RADIO-ABSENT", id);
  if (row.state === "HW-PRESENT") assert.equal(row.peer_exchange_demonstrated, false);
}
assert.match(skill.markdown, /single-node security-awareness/);
assert.doesNotMatch(skill.markdown, /packet path is LIVE|alt_internet_live is true/);

console.log("verify-d2d-carriers: ok");
