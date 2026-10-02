/**
 * Track 2 Phase B/C local discovery and peer session.
 * Fixture mode when there is no second device. Public door stays FG-STUB.
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
import { createIdentity, signObject } from "../src/fed-mesh/identity.js";
import { startInstance } from "../src/fed-mesh/instance.js";
import { createTrack2, openPeerSession, TRACK2_ORDER } from "../src/fed-mesh/track2.js";
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
assert.equal(kernel.d2d_carriers.store_forward, "scaffold");
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
assert.equal(queued.scaffold, true);
assert.equal(queued.alt_internet_live, false);
assert.equal(queued.live, false);
const stored = JSON.parse(await readFile(join(root, "track2-outbox.json"), "utf8"));
assert.equal(stored[0].ciphertext, "c2VhbGVk");
assert.equal(stored[0].plaintext, undefined);
assert.equal(stored[0].body, undefined);
const forwarded = await disk.forward(bob.state.identity.handle, [bob.state.identity.handle]);
assert.equal(forwarded.ok, true);
assert.equal(forwarded.moved, 1);
assert.equal(forwarded.scaffold, true);
assert.equal(forwarded.alt_internet_live, false);
assert.equal(forwarded.warn5, "STANDS-until-demonstrated");
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
} finally {
  await left.stop();
  await right.stop();
  await rm(httpRoot, { recursive: true, force: true });
}

console.log("verify-track2-d2d: ok");
