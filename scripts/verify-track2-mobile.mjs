/**
 * Track 2 mobile join client.
 * The test speaks the existing LAN beacon and sealed peer session.
 * It is not a phone, and it does not paint a demonstrated device.
 * Author: Aziel Eliab.
 */
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PRODUCTS } from "../src/index.js";
import { SUITE_SOFTWARE_COUNT } from "../src/guide-reason.js";
import { PUBLIC_MCP_TOOLS } from "../src/fraggate/codes.js";
import { resetLedger } from "../src/fraggate/ledger.js";
import { meshStatus, resetMeshStore, runMeshOp } from "../src/mesh.js";
import { D2D_MOBILE_CLIENT } from "../src/d2d-carriers.js";
import { classifyPeerUrl } from "../src/fed-mesh/bearers.js";
import { b64urlToBytes, canonicalStatement, handleFromRawPublicKey } from "../src/fed-mesh/codec.js";
import { generateEd25519, signObject, verifyObject } from "../src/fed-mesh/identity.js";
import { startInstance } from "../src/fed-mesh/instance.js";
import {
  MOBILE_CLIENT,
  beaconView,
  canonicalizeJoin,
  createMobileJoinClient,
  joinRoute,
  verifyJoin,
} from "../qnm-node/mobile/join.mjs";

resetLedger();
resetMeshStore();

assert.equal(SUITE_SOFTWARE_COUNT, 42);
assert.equal(PRODUCTS.length, 41);
assert.equal(PUBLIC_MCP_TOOLS.length, 36);
assert.equal(MOBILE_CLIENT, "present-not-demonstrated");
assert.equal(MOBILE_CLIENT, D2D_MOBILE_CLIENT);

const sample = { b: 1, a: "x", nested: { z: true, y: null }, skip: undefined };
assert.equal(canonicalizeJoin(sample), canonicalStatement(sample));

const client = await createMobileJoinClient();
assert.equal(Object.hasOwn(client, "arm"), false);
assert.equal(client.handle, await handleFromRawPublicKey(b64urlToBytes(client.public_key)));
const statement = { v: "D2D-CARRIERS-1.0", kind: "beacon", plane: "track2-reachability", n: 1 };
assert.equal(await verifyObject(client.public_key, statement, await client.sign(statement)), true);
const other = await generateEd25519();
assert.equal(await verifyJoin(other.public_key, statement, await signObject(other.privateKey, statement)), true);

const wifiBeacon = await client.signBeacon("wifi");
assert.equal(wifiBeacon.ok, false);
assert.equal(wifiBeacon.code, "FG-STUB");
assert.equal(wifiBeacon.wifi_peer_exchange_demonstrated, false);
assert.equal(wifiBeacon.alt_internet_live, false);
const lanBeacon = await client.signBeacon("lan");
assert.equal(lanBeacon.ok, true);
assert.equal(lanBeacon.beacon.carrier, "lan");
assert.equal(lanBeacon.beacon.presence, "live");
assert.equal(lanBeacon.beacon.body, undefined);
assert.equal(lanBeacon.beacon.plaintext, undefined);

const loop = joinRoute("http://127.0.0.1:8781/mobile/");
assert.equal(loop.ok, true);
assert.equal(loop.bearer_mode, "loopback");
assert.equal(loop.route_class, "direct");
assert.equal(classifyPeerUrl("http://127.0.0.1:8781/v1/fed-mesh/direct", { role: "direct" }).mode, "loopback");
const lan = joinRoute("http://192.168.1.10:8781/mobile/");
assert.equal(lan.ok, true);
assert.equal(lan.bearer_mode, "direct-lan");
assert.equal(classifyPeerUrl("http://192.168.1.10:8781/v1/fed-mesh/direct", { role: "direct" }).mode, "direct-lan");
const pub = joinRoute("https://aziel-runtime.vibelock.workers.dev/mobile/");
assert.equal(pub.ok, false);
assert.equal(pub.code, "FED-MESH-NO-ROUTE");
assert.equal(pub.alt_internet_live, false);
assert.equal(pub.wifi_peer_exchange_demonstrated, false);
const stun = joinRoute("stun:203.0.113.5:3478");
assert.equal(stun.code, "FED-MESH-NAT-REFUSE");
assert.equal(stun.alt_internet_live, false);
const missed = await client.discover("https://aziel-runtime.vibelock.workers.dev");
assert.equal(missed.ok, false);
assert.equal(missed.code, "FED-MESH-NO-ROUTE");
assert.equal(missed.mobile_client, MOBILE_CLIENT);

const disk = await readFile(new URL("../qnm-node/mobile/join.mjs", import.meta.url), "utf8");
const page = await readFile(new URL("../qnm-node/mobile/index.html", import.meta.url), "utf8");
const pageJs = await readFile(new URL("../qnm-node/mobile/page.mjs", import.meta.url), "utf8");
assert.doesNotMatch(disk, /alt_internet_live:\s*true/);
assert.doesNotMatch(disk, /second_device:\s*true/);
assert.doesNotMatch(disk, /peer_exchange_demonstrated:\s*true/);
assert.doesNotMatch(disk, /fed-mesh\/arm/);
assert.match(page, /Android/);
assert.match(page, /iPhone/);
assert.match(page, /present-not-demonstrated/);
assert.match(page, /alt_internet_live/);
assert.match(page, /not an app-store release/i);
assert.doesNotMatch(pageJs, /fed-mesh\/arm/);

const root = await mkdtemp(join(tmpdir(), "track2-mobile-"));
const node = await startInstance({ dataDir: join(root, "node"), fixture: true, port: 0, host: "127.0.0.1" });
const plain = await startInstance({ dataDir: join(root, "plain"), fixture: false, port: 0, host: "127.0.0.1" });
try {
  const htmlRes = await fetch(`${node.base}/mobile/`);
  assert.equal(htmlRes.status, 200);
  assert.match(htmlRes.headers.get("content-type") || "", /text\/html/);
  const html = await htmlRes.text();
  assert.match(html, /present-not-demonstrated/);
  assert.match(html, /Android/);
  assert.match(html, /iPhone/);
  assert.match(html, /\/mobile\/page\.mjs/);
  assert.match(pageJs, /from \"\.\/join\.mjs\"/);
  const served = await (await fetch(`${node.base}/mobile/join.mjs`)).text();
  assert.equal(served, disk);
  assert.equal((await fetch(`${node.base}/mobile/manifest.webmanifest`)).status, 200);
  assert.equal((await fetch(`${node.base}/mobile/sw.js`)).status, 200);
  assert.match((await fetch(`${node.base}/mobile/sw.js`)).headers.get("content-type") || "", /javascript/);
  const sw = await (await fetch(`${node.base}/mobile/sw.js`)).text();
  assert.match(sw, /\/v1\//);
  assert.doesNotMatch(sw, /peer_session/);
  const unknown = await (await fetch(`${node.base}/package.json`)).json();
  assert.equal(unknown.ok, false);

  const health = await (await fetch(`${node.base}/health`)).json();
  assert.equal(health.mobile_client, MOBILE_CLIENT);
  assert.equal(health.mobile_join, "/mobile/");
  assert.equal(health.app_store_release, false);
  assert.equal(health.track2.mobile_client, MOBILE_CLIENT);
  assert.equal(health.track2.mobile_demonstrated, false);
  assert.equal(health.track2.alt_internet_live, false);
  assert.equal(health.track2.second_device, false);
  assert.equal(health.worker_hardware, false);

  const phone = await createMobileJoinClient();
  const before = await phone.readRoster(node.base);
  assert.equal(before.ok, true);
  assert.equal(before.roster_code, "MESH-OFF");
  assert.deepEqual(before.armed, []);
  assert.equal(before.mobile_client, MOBILE_CLIENT);
  assert.equal(before.alt_internet_live, false);
  assert.equal(before.wifi_peer_exchange_demonstrated, false);

  const getArm = await (await fetch(`${node.base}/v1/fed-mesh/arm?carriers=lan`)).json();
  assert.equal(getArm.code, "MESH-OFF");
  assert.equal(getArm.get_never_enables, true);
  const still = await phone.readRoster(node.base);
  assert.deepEqual(still.armed, []);

  const early = await phone.discover(node.base);
  assert.equal(early.ok, false);
  assert.equal(early.code, "MESH-OFF");
  assert.equal(early.mobile_client, MOBILE_CLIENT);
  assert.equal(early.alt_internet_live, false);

  const posted = await (
    await fetch(`${node.base}/v1/fed-mesh/arm`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ carriers: ["lan"] }),
    })
  ).json();
  assert.equal(posted.ok, true);

  const found = await phone.discover(node.base);
  assert.equal(found.ok, true, found.message || found.code);
  assert.deepEqual(Object.keys(found.beacon).sort(), ["presence", "tip_hash"]);
  assert.equal(found.beacon.presence, "live");
  assert.match(found.beacon.tip_hash, /^[a-f0-9]{64}$/);
  assert.equal(beaconView(found.beacon).body, undefined);
  assert.equal(found.mutual, true);
  assert.equal(found.fixture, true);
  assert.equal(found.discovery.second_device, false);
  assert.equal(found.second_device, false);
  assert.equal(found.carrier, "lan");
  assert.equal(found.wifi_peer_exchange_demonstrated, false);
  assert.equal(found.rf_live, false);
  assert.equal(found.photon_live, false);
  assert.equal(found.mobile_client, MOBILE_CLIENT);
  assert.equal(found.mobile_demonstrated, false);
  assert.equal(found.app_store_release, false);
  assert.equal(found.alt_internet_live, false);
  assert.equal(found.public_door, "FG-STUB");
  const peer = found.peers.find((row) => row.handle === phone.handle);
  assert.equal(peer.carrier, "lan");
  assert.equal(peer.fixture, true);
  assert.equal(peer.second_device, false);
  assert.equal(peer.mutual, true);

  const status = node.track2.status();
  assert.equal(status.carriers.lan.live, true);
  assert.equal(status.carriers.lan.fixture, true);
  assert.equal(status.carriers.lan.second_device, false);
  assert.equal(status.carriers.wifi.peer_exchange_demonstrated, false);
  assert.equal(status.carriers.wifi.live, false);
  assert.equal(status.carriers.bluetooth.peer_exchange_demonstrated, false);
  assert.equal(status.carriers.rf.live, false);
  assert.equal(status.carriers.rf.peer_exchange_demonstrated, false);
  assert.equal(status.carriers.photon.live, false);
  assert.equal(status.carriers.photon.peer_exchange_demonstrated, false);
  assert.equal(status.second_device, false);
  assert.equal(status.mobile_client, MOBILE_CLIENT);
  assert.equal(status.store_forward_demonstrated, false);
  assert.equal(status.alt_internet_live, false);
  assert.equal(status.packet_path_live, false);
  assert.equal(status.public_live_nodes, false);

  const opened = await phone.openSession(node.base);
  assert.equal(opened.ok, true, opened.message || opened.code);
  assert.equal(opened.peer_tunnel, "LIVE-when-session");
  assert.equal(opened.route_class, "direct");
  assert.equal(opened.bearer_mode, "loopback");
  assert.equal(opened.session_identity_is_node_key, false);
  assert.notEqual(opened.session_public_key, opened.node_public_key);
  assert.match(opened.session_id, /^d2d_[a-f0-9]{32}$/);
  assert.equal(opened.wifi_peer_exchange_demonstrated, false);
  assert.equal(opened.rf_live, false);
  assert.equal(opened.photon_live, false);
  assert.equal(opened.second_device, false);
  assert.equal(opened.alt_internet_live, false);
  assert.equal(opened.mobile_client, MOBILE_CLIENT);
  assert.equal(node.track2.summary().peer_tunnel, "LIVE-when-session");
  assert.equal(node.track2.summary().alt_internet_live, false);
  assert.equal(node.track2.summary().mobile_demonstrated, false);

  const sent = await phone.send(node.base, "lan-join");
  assert.equal(sent.ok, true, sent.message || sent.code);
  assert.equal(sent.plaintext, "lan-join");
  assert.equal(sent.alt_internet_live, false);
  assert.equal(sent.wifi_peer_exchange_demonstrated, false);
  assert.equal(sent.second_device, false);
  assert.equal(node.track2.status().carriers.wifi.peer_exchange_demonstrated, false);
  assert.equal(node.track2.status().carriers.rf.live, false);
  assert.equal(node.track2.status().carriers.photon.live, false);
  assert.equal(node.track2.summary().store_forward_demonstrated, false);

  const plainArm = await (
    await fetch(`${plain.base}/v1/fed-mesh/arm`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ carriers: ["lan"] }),
    })
  ).json();
  assert.equal(plainArm.ok, true);
  const visitor = await createMobileJoinClient();
  const joined = await visitor.discover(plain.base);
  assert.equal(joined.ok, true, joined.message || joined.code);
  assert.equal(joined.fixture, false);
  assert.equal(joined.discovery.second_device, false);
  assert.equal(joined.second_device, false);
  assert.equal(joined.mobile_client, MOBILE_CLIENT);
  assert.equal(joined.mobile_demonstrated, false);
  assert.equal(joined.wifi_peer_exchange_demonstrated, false);
  assert.equal(joined.alt_internet_live, false);
  assert.equal(plain.track2.summary().second_device, false);
  assert.equal(plain.track2.summary().mobile_client, MOBILE_CLIENT);
  assert.equal(plain.track2.status().carriers.wifi.peer_exchange_demonstrated, false);
  assert.equal(plain.track2.status().carriers.rf.live, false);
  assert.equal(plain.track2.status().carriers.photon.live, false);
} finally {
  await node.stop();
  await plain.stop();
  await rm(root, { recursive: true, force: true });
}

const live = await meshStatus({}, {});
assert.equal(live.d2d_carriers.mobile_client, MOBILE_CLIENT);
assert.equal(live.d2d_carriers.mobile_demonstrated, false);
assert.equal(live.d2d_carriers.app_store_release, false);
assert.equal(live.d2d_carriers.alt_internet_live, false);
assert.equal(live.d2d_carriers.packet_path_live, false);
assert.equal(live.d2d_carriers.status, "NOT-READY");
assert.equal(live.d2d_carriers.code, "FG-STUB");
assert.equal(live.d2d_carriers.second_device, false);
assert.equal(live.d2d_carriers.peers, undefined);
assert.equal(live.d2d_carriers.get_never_enables, true);
assert.equal(live.d2d_carriers.worker_hardware, false);
for (const op of ["peer_session_open", "mesh_discover", "d2d_wifi", "d2d_rf", "d2d_photon"]) {
  const stub = await runMeshOp(op, { confirm: true }, {});
  assert.equal(stub.code, "MESH-STUB", op);
  assert.equal(stub.door_code, "FG-STUB", op);
  assert.equal(stub.alt_internet_live, false, op);
  assert.equal(stub.peers, undefined, op);
}

console.log("verify-track2-mobile: ok");
