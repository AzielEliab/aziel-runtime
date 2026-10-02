/**
 * Track 2 Phase B/C local discovery and peer session, Phase D three-node
 * store-forward, and Phase E scaffold cites.
 * Fixture mode when there is no second device. Public door stays FG-STUB.
 * WARN-5 stays open.
 * Author: Aziel Eliab.
 */
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PRODUCTS } from "../src/index.js";
import { SUITE_SOFTWARE_COUNT } from "../src/guide-reason.js";
import { PUBLIC_MCP_TOOLS } from "../src/fraggate/codes.js";
import { buildRegistry, classifyCall } from "../src/fraggate/registry.js";
import { sealPlaintext } from "../src/fed-mesh/e2e.js";
import { createIdentity, signObject, verifyObject } from "../src/fed-mesh/identity.js";
import { startInstance } from "../src/fed-mesh/instance.js";
import { hashStatement } from "../src/fed-mesh/codec.js";
import { locksetHash } from "../src/lockset.js";
import {
  createTrack2,
  deliverThreeLocal,
  openPeerSession,
  shelfCiteSlots,
  TRACK2_ORDER,
  verifyBootstrapPeerList,
  verifyForwardReceipt,
} from "../src/fed-mesh/track2.js";
import { meshStatus, resetMeshStore, runMeshOp } from "../src/mesh.js";
import { negotiateBearer } from "../src/transport/routing.js";

resetMeshStore();

assert.equal(SUITE_SOFTWARE_COUNT, 42);
assert.equal(PRODUCTS.length, 41);
assert.equal(PUBLIC_MCP_TOOLS.length, 36);
assert.deepEqual(TRACK2_ORDER, ["lan", "wifi", "bluetooth", "rf", "photon"]);
assert.equal(negotiateBearer("icann").code, "AZP-BEARER-REFUSE");
assert.equal(negotiateBearer("cap7-egress").code, "AZP-BEARER-REFUSE");
assert.equal(negotiateBearer("stun").code, "AZP-BEARER-REFUSE");
assert.equal(negotiateBearer("turn").code, "AZP-BEARER-REFUSE");

const registry = buildRegistry(PRODUCTS);
for (const op of ["mesh_discover", "peer_session_open", "peer_send", "d2d_rf", "d2d_photon", "store_forward"]) {
  assert.equal(classifyCall(registry.bySlug.mesh, op).kind, "stub", op);
  assert.equal(classifyCall(registry.bySlug.aznet, op).kind, "stub", op);
}
assert.equal(classifyCall(registry.bySlug.miragegrid, "tunnel").kind, "stub");
assert.equal(classifyCall(registry.bySlug.miragegrid, "vpn-hop").kind, "stub");

const kernel = await runMeshOp("mesh_discover", { peers: ["#NOTAPEER000"] }, {});
assert.equal(kernel.ok, false);
assert.equal(kernel.code, "MESH-STUB");
assert.equal(kernel.door_code, "FG-STUB");
assert.equal(kernel.alt_internet_live, false);
assert.equal(kernel.peers, undefined);
assert.equal(kernel.d2d_carriers.lan_discovery, "LIVE-when-armed");
assert.equal(kernel.d2d_carriers.peer_tunnel, "LIVE-when-session");
assert.equal(kernel.d2d_carriers.rf_discovery, "REFUSE-without-HW");
assert.equal(kernel.d2d_carriers.photon_discovery, "REFUSE-without-HW");
assert.equal(kernel.d2d_carriers.wifi_discovery, "ARMED-when-HW");
assert.equal(kernel.d2d_carriers.bluetooth_discovery, "ARMED-when-HW");
assert.equal(kernel.d2d_carriers.worker_hardware, false);
assert.equal(kernel.d2d_carriers.get_never_enables, true);
assert.equal(kernel.d2d_carriers.store_forward, "LIVE-when-three-local-nodes / fixture");
assert.equal(kernel.d2d_carriers.store_forward_public, "FG-STUB");
assert.equal(kernel.d2d_carriers.worker_runs_store_forward, false);
assert.equal(kernel.d2d_carriers.phases.D, "LIVE-when-three-local-nodes / fixture");
assert.equal(kernel.d2d_carriers.phases.E, "scaffold");
assert.equal(kernel.d2d_carriers.needs_starting_address, true);
assert.equal(kernel.d2d_carriers.live_multi_provider, false);
assert.equal(kernel.d2d_carriers.cold_shelf_live, false);
assert.equal(kernel.d2d_carriers.warn5_closed, false);
assert.equal(kernel.d2d_carriers.second_device, false);
assert.equal(kernel.d2d_carriers.cap7_public_egress, false);

const live = await meshStatus({}, {});
assert.equal(live.d2d_carriers.alt_internet_live, false);
assert.equal(live.d2d_carriers.packet_path_live, false);
assert.equal(live.d2d_carriers.status, "NOT-READY");
assert.equal(live.d2d_carriers.code, "FG-STUB");
assert.equal(live.d2d_carriers.peers, undefined);
assert.equal(live.channel_plane.worker_hardware, false);
assert.equal(typeof live.live_nodes, "number");

function node(tip) {
  return createIdentity().then((identity) =>
    createTrack2({ identity, fixture: true, tipHash: tip, dataDir: "" }),
  );
}

const alice = await node("11".repeat(32));
const bob = await node("22".repeat(32));
const cara = await node("33".repeat(32));

const cold = alice.status();
assert.equal(cold.ok, false);
assert.equal(cold.code, "MESH-OFF");
assert.deepEqual(cold.armed, []);
assert.equal(cold.get_never_enables, true);
const still = await alice.arm(["lan"], "GET");
assert.equal(still.code, "MESH-OFF");
assert.deepEqual(alice.status().armed, []);

const armed = await alice.arm(["lan", "wifi", "bluetooth", "rf", "photon", "stun", "cap7-egress"]);
assert.equal(armed.ok, true);
assert.equal(armed.get_never_enables, true);
const byId = Object.fromEntries(armed.results.filter((row) => row.id).map((row) => [row.id, row]));
assert.equal(byId.lan.armed, true);
assert.equal(byId.lan.live, false);
assert.equal(byId.lan.mock, false);
for (const id of ["wifi", "bluetooth", "rf", "photon"]) {
  assert.equal(byId[id].live, false, id);
  assert.equal(byId[id].mock, false, id);
  assert.equal(byId[id].peer_exchange_demonstrated, false, id);
  if (!byId[id].armed) assert.equal(byId[id].code, "QNM-RADIO-ABSENT", id);
}
const refusedBearer = armed.results.find((row) => row.bearer === "stun" || row.code === "AZP-BEARER-REFUSE");
assert.ok(refusedBearer);
assert.equal(refusedBearer.code, "AZP-BEARER-REFUSE");
const noExit = armed.results.find((row) => row.code === "MG-NO-IP-EXIT");
assert.ok(noExit);

await bob.arm(["lan"]);
await cara.arm(["lan"]);
const alone = alice.status();
assert.equal(alone.carriers.lan.status, "fixture");
assert.equal(alone.carriers.lan.live, false);
assert.equal(alone.alt_internet_live, false);

const one = await alice.beacon("lan");
assert.equal(one.ok, true);
assert.equal(one.beacon.presence, "live");
assert.equal(one.beacon.kind, "beacon");
assert.equal(one.beacon.body, undefined);
const once = await bob.ingest(one.beacon);
assert.equal(once.ok, true);
assert.equal(once.mutual, false);
assert.equal(bob.status().carriers.lan.live, false);
assert.equal(bob.status().carriers.lan.status, "fixture");

const bodyTick = await bob.ingest({ ...one.beacon, body: "payload" });
assert.equal(bodyTick.code, "MESH-NO-BYTES");
const cap7 = await bob.ingest({ ...one.beacon, bearer: "cap7-egress" });
assert.equal(cap7.code, "MG-NO-IP-EXIT");
assert.equal(cap7.cap7_public_egress, false);
const punch = await bob.ingest({ ...one.beacon, direct_url: "stun:203.0.113.5:3478" });
assert.equal(punch.code, "FED-MESH-NAT-REFUSE");
assert.equal(bob.status().peers.length, 1);

const seen = await alice.exchange(bob);
assert.equal(seen.ok, true);
assert.equal(seen.local.live, true);
assert.equal(seen.local.fixture, true);
assert.equal(seen.local.second_device, false);
assert.equal(seen.local.peer_exchange_demonstrated, true);
assert.equal(seen.remote.live, true);
assert.equal(seen.alt_internet_live, false);
assert.equal(alice.status().not_public_live_nodes, true);
assert.equal(alice.status().not_software_workers, true);
assert.equal(alice.status().peers.some((row) => row.handle === bob.state.identity.handle), true);
assert.equal(bob.status().peers.some((row) => row.handle === alice.state.identity.handle), true);
assert.equal(live.d2d_carriers.peers, undefined);

const radioBeacon = await alice.beacon("rf");
assert.notEqual(radioBeacon.code, "MESH-OK");
assert.equal(radioBeacon.alt_internet_live, false);
assert.equal(radioBeacon.mock, false);
assert.equal(radioBeacon.live, false);
if (radioBeacon.code !== "QNM-RADIO-ABSENT") {
  assert.equal(radioBeacon.peer_exchange_demonstrated, false);
}

const opened = await openPeerSession(alice, bob, {
  directUrl: "http://192.168.50.2:8781/v1/fed-mesh/direct",
  relayUrl: "https://relay.example/v1/mesh/relay",
});
assert.equal(opened.ok, true);
assert.equal(opened.route_class, "direct");
assert.equal(opened.local.bearer_mode, "direct-lan");
assert.equal(opened.peer_tunnel, "LIVE-when-session");
assert.equal(opened.live, true);
assert.equal(opened.alt_internet_live, false);
assert.equal(opened.azvpn, false);
assert.equal(opened.local.session_identity_is_node_key, false);
assert.notEqual(opened.local.session_handle, opened.local.node_handle);

const relayOnly = await openPeerSession(alice, bob, { relayUrl: "https://relay.example/v1/mesh/relay" });
assert.equal(relayOnly.ok, true);
assert.equal(relayOnly.route_class, "relay");
assert.equal(relayOnly.alt_internet_live, false);

const punched = await alice.offer(bob.state.identity.handle, { directUrl: "turn:203.0.113.8:3478" });
assert.equal(punched.code, "FED-MESH-NAT-REFUSE");

const sent = await alice.send(opened.local.session_id, "sealed-share");
assert.equal(sent.ok, true);
assert.equal(sent.envelope.plaintext, undefined);
assert.equal(sent.envelope.body, undefined);
assert.equal(sent.azvpn, false);
const got = await bob.recv(sent.envelope);
assert.equal(got.ok, true);
assert.equal(got.plaintext, "sealed-share");
assert.equal(got.route_class, "direct");
assert.equal(got.alt_internet_live, false);

const blocked = await alice.send(opened.local.session_id, "inject-payload");
assert.equal(blocked.code, "FED-MESH-POISON");
assert.equal(blocked.sent, false);

const withCara = await bob.exchange(cara);
assert.equal(withCara.ok, true);
const row = alice.state.sessions.get(opened.local.session_id);
const sealed = await sealPlaintext({
  fromHandle: row.session_id,
  toHandle: row.peer_session_id,
  seq: 99,
  recipientEncPublicKey: row.peer_session_enc_public_key,
  plaintext: "inject-payload",
});
const poison = {
  v: "D2D-CARRIERS-1.0",
  kind: "peer-share",
  plane: "track2-reachability",
  session_id: row.session_id,
  to_session: row.peer_session_id,
  handle: alice.state.identity.handle,
  session_public_key: row.session_public_key,
  seq: 99,
  route_class: row.route_class,
  ...sealed,
};
poison.session_sig = await signObject(row.signPrivate, {
  v: poison.v,
  kind: poison.kind,
  plane: poison.plane,
  session_id: poison.session_id,
  to_session: poison.to_session,
  seq: poison.seq,
  nonce: poison.nonce,
  eph_public_key: poison.eph_public_key,
  ciphertext: poison.ciphertext,
  route_class: poison.route_class,
});
const ingress = await bob.recv(poison);
assert.equal(ingress.code, "FED-MESH-POISON");
assert.equal(ingress.plaintext, null);
assert.equal(ingress.isolated_only, alice.state.identity.handle);
assert.equal(ingress.mesh_fenced_to_loopback, false);
assert.equal(ingress.neighbor_phoenix, false);
const caraRow = bob.status().peers.find((peer) => peer.handle === cara.state.identity.handle);
assert.equal(caraRow.presence, "live");
assert.equal(caraRow.isolated, false);
const aliceRow = bob.status().peers.find((peer) => peer.handle === alice.state.identity.handle);
assert.equal(aliceRow.presence, "isolated");

const forkNode = await node("44".repeat(32));
await forkNode.arm(["lan"]);
const prev = alice.state.prev;
const tipA = await alice.beacon("lan");
assert.equal((await forkNode.ingest(tipA.beacon)).ok, true);
alice.state.tip_hash = "ab".repeat(32);
alice.state.prev = prev;
const tipB = await alice.beacon("lan");
const fork = await forkNode.ingest(tipB.beacon);
assert.equal(fork.code, "FED-MESH-FORK");
assert.equal(fork.neighbor_phoenix, false);
assert.equal(fork.mesh_fenced_to_loopback, false);
assert.equal(forkNode.status().peers.find((peer) => peer.handle === cara.state.identity.handle), undefined);
const isolatedForward = await forkNode.forward(alice.state.identity.handle, []);
assert.equal(isolatedForward.code, "FED-MESH-NO-ROUTE");
assert.equal(isolatedForward.alt_internet_live, false);

const tipBefore = cara.state.tip_hash;
const resealed = await bob.phoenixLocal();
assert.equal(resealed.phoenix_local_only, true);
assert.equal(resealed.neighbor_phoenix, false);
assert.equal(resealed.public_hostname_resurrection, false);
assert.notEqual(resealed.tip_hash, tipBefore);
assert.equal(cara.state.tip_hash, tipBefore);
const neighbor = await cara.phoenixBecauseNeighbor();
assert.equal(neighbor.code, "MESH-STUB");
assert.equal(neighbor.neighbor_phoenix, false);
assert.equal(cara.state.tip_hash, tipBefore);

const root = await mkdtemp(join(tmpdir(), "track2-outbox-"));
const disk = createTrack2({
  identity: await createIdentity(),
  fixture: true,
  tipHash: "55".repeat(32),
  dataDir: root,
});
await disk.arm(["lan"]);
const queued = await disk.enqueue({ to: bob.state.identity.handle, ciphertext: "c2VhbGVk", hops: 0 });
assert.equal(queued.ok, true);
assert.equal(queued.scaffold, false);
assert.equal(queued.stored, true);
assert.equal(queued.delivered, false);
assert.equal(queued.alt_internet_live, false);
assert.equal(queued.live, false);
assert.equal(queued.item.hops, 0);
const stored = JSON.parse(await readFile(join(root, "track2-outbox.json"), "utf8"));
assert.equal(stored[0].ciphertext, "c2VhbGVk");
assert.equal(stored[0].plaintext, undefined);
assert.equal(stored[0].body, undefined);
const forwarded = await disk.forward(bob.state.identity.handle, [bob.state.identity.handle]);
assert.equal(forwarded.ok, true);
assert.equal(forwarded.moved, 1);
assert.equal(forwarded.delivered, false);
assert.equal(forwarded.scaffold, false);
assert.equal(forwarded.alt_internet_live, false);
assert.equal(forwarded.packet_path_live, false);
assert.equal(forwarded.warn5, "STANDS-until-demonstrated");
assert.equal(forwarded.warn5_closed, false);
assert.equal(forwarded.tickets[0].ciphertext, undefined);
assert.equal(forwarded.tickets[0].body, undefined);
assert.equal(disk.state.outbox[0].hops, 0);
const bounded = await disk.enqueue({ to: bob.state.identity.handle, ciphertext: "aa", hops: 3 });
assert.equal(bounded.code, "MESH-NO-ROUTE");
const missing = await disk.forward("#NOTADMITTED");
assert.equal(missing.code, "FED-MESH-NO-ROUTE");
const probed = disk.probe({ presence: "live", tip_hash: "cd".repeat(32), body: "bytes" });
assert.equal(probed.code, "MESH-NO-BYTES");
const clean = disk.probe({ presence: "live", tip_hash: "cd".repeat(32) });
assert.equal(clean.ok, true);
assert.equal(clean.body, false);
assert.equal(clean.alt_internet_live, false);
const cap7Forward = await disk.forward(bob.state.identity.handle, [bob.state.identity.handle], { bearer: "cap7-egress" });
assert.equal(cap7Forward.code, "MG-NO-IP-EXIT");
assert.equal(cap7Forward.cap7_public_egress, false);
const stunForward = await disk.forward(bob.state.identity.handle, [bob.state.identity.handle], { transport: "stun" });
assert.equal(stunForward.code, "AZP-BEARER-REFUSE");
const turnForward = await disk.forward(bob.state.identity.handle, [bob.state.identity.handle], { direct_url: "turn:203.0.113.9:3478" });
assert.equal(turnForward.code, "FED-MESH-NAT-REFUSE");
const dhtForward = await disk.forward(bob.state.identity.handle, [bob.state.identity.handle], { bearer: "dht" });
assert.equal(dhtForward.code, "MESH-NO-ROUTE");
assert.equal(dhtForward.dht, false);
const reloaded = createTrack2({
  identity: disk.state.identity,
  fixture: true,
  tipHash: disk.state.tip_hash,
  dataDir: root,
});
await reloaded.loadOutbox();
assert.equal(reloaded.state.outbox[0].ciphertext, "c2VhbGVk");
assert.equal(reloaded.state.outbox[0].plaintext, undefined);
assert.equal(reloaded.state.outbox[0].body, undefined);
assert.equal(reloaded.state.receipts.length > 0, true);
const cut = await disk.cut();
assert.equal(cut.ok, true);
assert.equal(cut.bundle.plaintext, undefined);
assert.equal(cut.bundle.items[0].ciphertext, "c2VhbGVk");
assert.equal(cut.bundle.items[0].plaintext, undefined);
const { sig: cutSig, ...cutStatement } = cut.bundle;
assert.equal(await verifyObject(disk.state.identity.public_key, cutStatement, cutSig), true);
await rm(root, { recursive: true, force: true });

const httpRoot = await mkdtemp(join(tmpdir(), "track2-http-"));
const left = await startInstance({ dataDir: join(httpRoot, "left"), fixture: true, port: 0 });
const right = await startInstance({ dataDir: join(httpRoot, "right"), fixture: true, port: 0 });
try {
  const before = await (await fetch(`${left.base}/v1/fed-mesh/discover`)).json();
  assert.equal(before.code, "MESH-OFF");
  assert.deepEqual(before.armed, []);
  const getArm = await (await fetch(`${left.base}/v1/fed-mesh/arm?carriers=lan`)).json();
  assert.equal(getArm.code, "MESH-OFF");
  assert.equal(getArm.get_never_enables, true);
  const afterGet = await (await fetch(`${left.base}/v1/fed-mesh/discover`)).json();
  assert.deepEqual(afterGet.armed, []);
  const health = await (await fetch(`${left.base}/health`)).json();
  assert.equal(health.worker_hardware, false);
  assert.equal(health.track2.alt_internet_live, false);
  assert.equal(health.track2.mobile_client, "present-not-demonstrated");
  assert.equal(health.track2.mobile_demonstrated, false);
  assert.equal(health.mobile_client, "present-not-demonstrated");
  assert.equal(health.app_store_release, false);
  assert.equal(health.track2.public_live_nodes, false);
  assert.equal(health.awareness_socket, false);

  for (const inst of [left, right]) {
    const posted = await (
      await fetch(`${inst.base}/v1/fed-mesh/arm`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ carriers: ["lan"] }),
      })
    ).json();
    assert.equal(posted.ok, true, inst.handle);
    assert.equal(posted.results.find((row) => row.id === "lan").armed, true);
  }
  const discovered = await left.track2.discoverUrl(`${right.base}/v1/fed-mesh/discover`);
  assert.equal(discovered.ok, true);
  assert.equal(discovered.local.live, true);
  assert.equal(discovered.local.fixture, true);
  assert.equal(discovered.local.second_device, false);
  assert.equal(discovered.alt_internet_live, false);
  const rightStatus = right.track2.status();
  assert.equal(rightStatus.carriers.lan.live, true);
  assert.equal(rightStatus.peers.some((peer) => peer.handle === left.handle), true);
  assert.equal(left.track2.status().peers.some((peer) => peer.handle === right.handle), true);
  assert.equal(live.d2d_carriers.peers, undefined);
  const boot = await (await fetch(`${left.base}/v1/fed-mesh/bootstrap`)).json();
  assert.equal(boot.ok, true);
  assert.equal(boot.needs_starting_address, true);
  assert.equal(boot.live_multi_provider, false);
  assert.equal(boot.scaffold, true);
  assert.equal(boot.live, false);
  assert.equal(boot.list.peers.length, 0);
  const shelves = await (await fetch(`${left.base}/v1/fed-mesh/shelves`)).json();
  assert.equal(shelves.cold_shelf_live, false);
  assert.equal(shelves.live_multi_provider, false);
  assert.equal(shelves.dns_cut, false);
  assert.equal(shelves.origin_cutover, false);
  assert.equal(shelves.slots.find((row) => row.plane === "B").status, "SLOT");
  assert.equal(shelves.slots.find((row) => row.plane === "B").live, false);
  assert.equal(shelves.slots.find((row) => row.plane === "C").live, false);
  const tickets = await (await fetch(`${left.base}/v1/fed-mesh/outbox`)).json();
  assert.equal(tickets.ciphertext, false);
  assert.equal(tickets.tickets.every((row) => row.ciphertext === undefined && row.body === undefined), true);
} finally {
  await left.stop();
  await right.stop();
  await rm(httpRoot, { recursive: true, force: true });
}

const hopRoot = await mkdtemp(join(tmpdir(), "track2-hops-"));
const nodeA = createTrack2({ identity: await createIdentity(), fixture: true, tipHash: "a1".repeat(32), dataDir: join(hopRoot, "a") });
const nodeB = createTrack2({ identity: await createIdentity(), fixture: true, tipHash: "b2".repeat(32), dataDir: join(hopRoot, "b") });
const nodeC = createTrack2({ identity: await createIdentity(), fixture: true, tipHash: "c3".repeat(32), dataDir: join(hopRoot, "c") });
const nodeD = createTrack2({ identity: await createIdentity(), fixture: true, tipHash: "d4".repeat(32), dataDir: join(hopRoot, "d") });
for (const hop of [nodeA, nodeB, nodeC, nodeD]) await hop.arm(["lan"]);
assert.equal((await nodeA.exchange(nodeB)).ok, true);
assert.equal((await nodeB.exchange(nodeC)).ok, true);
assert.equal((await nodeC.exchange(nodeD)).ok, true);
assert.equal(nodeA.status().carriers.wifi.peer_exchange_demonstrated, false);
assert.equal(nodeA.status().carriers.rf.peer_exchange_demonstrated, false);
assert.equal(nodeA.status().carriers.photon.peer_exchange_demonstrated, false);
assert.equal(nodeA.status().carriers.bluetooth.peer_exchange_demonstrated, false);

const delivered = await deliverThreeLocal(nodeA, nodeB, nodeC, "sealed-object-for-c");
assert.equal(delivered.ok, true);
assert.equal(delivered.store_forward, "LIVE-when-three-local-nodes / fixture");
assert.equal(delivered.local_delivery, true);
assert.equal(delivered.plaintext, "sealed-object-for-c");
assert.equal(delivered.nodes, 3);
assert.equal(delivered.hops, 2);
assert.equal(delivered.hops < 3, true);
assert.equal(delivered.fixture, true);
assert.equal(delivered.second_device, false);
assert.equal(delivered.physical_devices, 1);
assert.equal(delivered.in_process, true);
assert.equal(delivered.alt_internet_live, false);
assert.equal(delivered.packet_path_live, false);
assert.equal(delivered.public_door, "FG-STUB");
assert.equal(delivered.warn5, "STANDS-until-demonstrated");
assert.equal(delivered.warn5_closed, false);
assert.equal(delivered.peer_exchange_demonstrated, false);
assert.equal(delivered.dht, false);
assert.equal(delivered.bgp, false);
assert.equal(delivered.mid_opened, false);
assert.equal(delivered.mid_code, "FED-MESH-PRIVATE-KEY");
assert.equal(delivered.mid_plaintext, null);
assert.equal(delivered.path.join(">"), `${nodeA.state.identity.handle}>${nodeB.state.identity.handle}>${nodeC.state.identity.handle}`);
assert.equal(nodeB.state.outbox.some((row) => row.object_hash === delivered.object_hash && row.plaintext), false);
assert.equal(nodeA.state.outbox.find((row) => row.object_hash === delivered.object_hash).hops, 0);
assert.equal(nodeB.state.outbox.find((row) => row.object_hash === delivered.object_hash).hops, 1);
assert.equal(nodeC.state.outbox.find((row) => row.object_hash === delivered.object_hash).hops, 2);
assert.equal(nodeC.summary().store_forward, "LIVE-when-three-local-nodes / fixture");
assert.equal(nodeC.summary().store_forward_demonstrated, true);
assert.equal(nodeA.summary().second_device, false);
assert.equal(nodeA.summary().alt_internet_live, false);

let receiptPrev = "0".repeat(64);
for (const receipt of delivered.receipts) {
  assert.equal(receipt.plaintext, undefined);
  assert.equal(receipt.object_hash, delivered.object_hash);
  assert.equal(receipt.prev_receipt, receiptPrev);
  const { sig, ...signed } = receipt;
  const { receipt_hash, ...unsigned } = signed;
  assert.equal(await hashStatement(unsigned), receipt_hash);
  assert.equal(await verifyObject(receipt.hop_public_key, signed, sig), true);
  const checked = await verifyForwardReceipt(receipt);
  assert.equal(checked.ok, true);
  assert.equal(checked.receipt_hash, receipt_hash);
  receiptPrev = receipt_hash;
}
assert.deepEqual(delivered.receipts.map((row) => row.hop), [
  nodeA.state.identity.handle,
  nodeB.state.identity.handle,
  nodeC.state.identity.handle,
  nodeC.state.identity.handle,
]);

const held = nodeC.state.outbox.find((row) => row.object_hash === delivered.object_hash);
held.via = nodeD.state.identity.handle;
held.offered_to = nodeD.state.identity.handle;
const fourth = await nodeD.pull(nodeC, held.id);
assert.equal(fourth.code, "MESH-NO-ROUTE");
assert.equal(fourth.alt_internet_live, false);
const noRoute = await nodeA.forward("#NOT-A-HOP");
assert.equal(noRoute.code, "FED-MESH-NO-ROUTE");

const hopTipA = nodeA.state.tip_hash;
const hopTipC = nodeC.state.tip_hash;
const island = nodeA.partition();
assert.equal(island.partitioned, true);
assert.equal(island.merged, false);
const blockedPull = await nodeB.pull(nodeA, nodeA.state.outbox[0].id);
assert.equal(blockedPull.code, "FED-MESH-NO-ROUTE");
assert.equal(nodeA.state.tip_hash, hopTipA);
assert.equal(nodeC.state.tip_hash, hopTipC);
const vote = await nodeA.rejoin({ cite: hopTipC, operator: true, vote_to_heal: true });
assert.equal(vote.code, "MESH-NO-NEIGHBOR-HEAL");
assert.equal(vote.merged, false);
assert.equal(nodeA.state.tip_hash, hopTipA);
assert.equal(nodeC.state.tip_hash, hopTipC);
const resealTip = nodeC.state.tip_hash;
const localPhoenix = await nodeA.phoenixLocal();
assert.equal(localPhoenix.phoenix_local_only, true);
assert.equal(localPhoenix.neighbor_phoenix, false);
assert.notEqual(nodeA.state.tip_hash, hopTipA);
assert.equal(nodeC.state.tip_hash, resealTip);
const cited = nodeC.state.tip_hash;
const rejoined = await nodeA.rejoin({ cite: cited, operator: true });
assert.equal(rejoined.ok, true);
assert.equal(rejoined.merged, false);
assert.equal(rejoined.chains_spliced, false);
assert.equal(nodeA.state.tip_hash === cited, false);
assert.equal(nodeC.state.tip_hash, cited);
nodeB.partition();
const gateDoc = { v: "cite", tip: nodeA.state.tip_hash };
const gateHash = await locksetHash(gateDoc);
const byLockset = await nodeB.rejoin({ cite: nodeA.state.tip_hash, lockset: gateDoc, lockset_sha256: gateHash });
assert.equal(byLockset.ok, true);
assert.equal(byLockset.merged, false);
assert.equal(nodeB.state.tip_hash === nodeA.state.tip_hash, false);
const bare = await nodeC.partition();
assert.equal(bare.partitioned, true);
const noGate = await nodeC.rejoin({ cite: nodeA.state.tip_hash });
assert.equal(noGate.code, "MESH-NO-NEIGHBOR-HEAL");
assert.equal(nodeC.state.partition.partitioned, true);

const emptyList = await nodeA.bootstrapList([]);
assert.equal(emptyList.needs_starting_address, true);
assert.equal(emptyList.live_multi_provider, false);
assert.equal(emptyList.scaffold, true);
assert.equal(emptyList.live, false);
assert.equal(emptyList.list.peers.length, 0);
const emptyChecked = await verifyBootstrapPeerList(emptyList.list);
assert.equal(emptyChecked.ok, true);
assert.equal(emptyChecked.needs_starting_address, true);
const named = await nodeA.bootstrapList([{ handle: nodeB.state.identity.handle, public_key: nodeB.state.identity.public_key }]);
assert.equal(named.ok, true);
assert.equal(named.needs_starting_address, true);
assert.equal(named.live_multi_provider, false);
assert.equal(named.live, false);
const shelvesLocal = shelfCiteSlots();
assert.equal(shelvesLocal.live_multi_provider, false);
assert.equal(shelvesLocal.cold_shelf_live, false);
assert.equal(shelvesLocal.dns_cut, false);
assert.equal(shelvesLocal.origin_cutover, false);
assert.equal(shelvesLocal.aznet_hosts_payloads, false);
assert.equal(shelvesLocal.slots.filter((row) => row.live === true).length, 0);

const poisonedHop = await deliverThreeLocal(nodeA, nodeB, nodeC, "inject-payload");
assert.equal(poisonedHop.code, "FED-MESH-POISON");
assert.equal(poisonedHop.sent, false);

assert.equal(live.d2d_carriers.peers, undefined);
assert.equal(nodeA.summary().public_live_nodes, false);
assert.notEqual(typeof live.live_nodes, "undefined");
await rm(hopRoot, { recursive: true, force: true });

console.log("verify-track2-d2d: ok");
