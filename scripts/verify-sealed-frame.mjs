/**
 * Sealed frame v2 (header as additional data), v1 decrypt, key-hash allowlist,
 * and a third node that cannot open A→B traffic.
 * Vectors are written for qnm-node interop. No live flag is turned on.
 * Author: Aziel Eliab.
 */
import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { createIdentity } from "../src/fed-mesh/identity.js";
import { createTrack2, openPeerSession, peerShareSignBody } from "../src/fed-mesh/track2.js";
import { frameAad as phoneAad } from "../qnm-node/mobile/join.mjs";
import { bluetoothCarrier, carrierForBearer, lanCarrier, photonCarrier, relayCarrier, rfCarrier } from "../src/transport/carriers.js";
import { frameAad, frameHeader, openFrame, peerKeyPin, sealFrame } from "../src/transport/sealed-frame.js";
import { sealPhotonFrame } from "../qnm-node/bearers/photon.js";
import { sealBluetoothFrame, sealRfFrame } from "../qnm-node/bearers/radio.js";

const secret = "a-to-b-only";
const a = await createIdentity();
const b = await createIdentity();
const c = await createIdentity();

const sealed = await sealFrame({
  fromHandle: a.handle,
  toHandle: b.handle,
  seq: 1,
  recipientEncPublicKey: b.enc_public_key,
  plaintext: secret,
  carrier: "lan",
  route_class: "direct",
});
assert.equal(sealed.frame_v, 2);
assert.equal(sealed.carrier, "lan");
const opened = await openFrame({
  encPrivateKey: b.encPrivateKey,
  fromHandle: a.handle,
  toHandle: b.handle,
  seq: 1,
  nonce: sealed.nonce,
  eph_public_key: sealed.eph_public_key,
  ciphertext: sealed.ciphertext,
  frame_v: 2,
  carrier: "lan",
  route_class: "direct",
});
assert.equal(opened, secret);
const stranger = await openFrame({
  encPrivateKey: c.encPrivateKey,
  fromHandle: a.handle,
  toHandle: b.handle,
  seq: 1,
  nonce: sealed.nonce,
  eph_public_key: sealed.eph_public_key,
  ciphertext: sealed.ciphertext,
  frame_v: 2,
  carrier: "lan",
  route_class: "direct",
});
assert.equal(stranger, null, "node C must not open A→B traffic");

const tampered = frameHeader({
  carrier: "relay",
  fromHandle: a.handle,
  toHandle: b.handle,
  seq: 1,
  eph_public_key: sealed.eph_public_key,
  nonce: sealed.nonce,
  route_class: "direct",
});
assert.notEqual(frameAad(tampered), sealed.aad);
const swapped = await openFrame({
  encPrivateKey: b.encPrivateKey,
  fromHandle: a.handle,
  toHandle: b.handle,
  seq: 1,
  nonce: sealed.nonce,
  eph_public_key: sealed.eph_public_key,
  ciphertext: sealed.ciphertext,
  frame_v: 2,
  carrier: "relay",
  route_class: "direct",
});
assert.equal(swapped, null, "a changed header fails the additional data");

const v1 = await sealFrame({
  version: 1,
  fromHandle: a.handle,
  toHandle: b.handle,
  seq: 2,
  recipientEncPublicKey: b.enc_public_key,
  plaintext: "legacy",
  carrier: "lan",
});
assert.equal(v1.frame_v, 1);
const legacy = await openFrame({
  encPrivateKey: b.encPrivateKey,
  fromHandle: a.handle,
  toHandle: b.handle,
  seq: 2,
  nonce: v1.nonce,
  eph_public_key: v1.eph_public_key,
  ciphertext: v1.ciphertext,
  frame_v: 1,
  allowV1: true,
});
assert.equal(legacy, "legacy");
const v1Default = await openFrame({
  encPrivateKey: b.encPrivateKey,
  fromHandle: a.handle,
  toHandle: b.handle,
  seq: 2,
  nonce: v1.nonce,
  eph_public_key: v1.eph_public_key,
  ciphertext: v1.ciphertext,
  frame_v: 1,
});
assert.equal(v1Default, null, "version 1 is refused unless allowV1 is set");
assert.equal(await openFrame({
  encPrivateKey: b.encPrivateKey,
  fromHandle: a.handle,
  toHandle: b.handle,
  seq: 2,
  nonce: v1.nonce,
  eph_public_key: v1.eph_public_key,
  ciphertext: v1.ciphertext,
  frame_v: 99,
  allowV1: true,
}), null, "unknown version is refused even when allowV1 is set");
const badCarrier = frameHeader({ carrier: "carrier-pigeon", fromHandle: a.handle, toHandle: b.handle, seq: 1 });
assert.equal(badCarrier.ok, false);
assert.equal(badCarrier.code, "SEALED-FRAME-CARRIER");
const legacyAsV2 = await openFrame({
  encPrivateKey: b.encPrivateKey,
  fromHandle: a.handle,
  toHandle: b.handle,
  seq: 2,
  nonce: v1.nonce,
  eph_public_key: v1.eph_public_key,
  ciphertext: v1.ciphertext,
  frame_v: 2,
  carrier: "lan",
});
assert.equal(legacyAsV2, null);

assert.equal(peerKeyPin(a.handle), "");
assert.equal(peerKeyPin("#0123456789A"), "");
const pin = peerKeyPin(a.public_key);
assert.match(pin, /^[a-f0-9]{64}$/);
assert.notEqual(pin, a.handle.replace("#", "").toLowerCase());
assert.equal(peerKeyPin(pin), pin);

const header = frameHeader({
  carrier: "lan",
  fromHandle: a.handle,
  toHandle: b.handle,
  seq: 1,
  eph_public_key: sealed.eph_public_key,
  nonce: sealed.nonce,
  route_class: "direct",
});
assert.equal(phoneAad(header), frameAad(header));

for (const [name, adapter, seal] of [
  ["lan", lanCarrier, (opts) => lanCarrier.seal(opts)],
  ["relay", relayCarrier, (opts) => relayCarrier.seal(opts)],
  ["photon", photonCarrier, sealPhotonFrame],
  ["bluetooth", bluetoothCarrier, sealBluetoothFrame],
  ["rf", rfCarrier, sealRfFrame],
]) {
  assert.equal(adapter.live, false, name);
  assert.equal(adapter.alt_internet_live, undefined, name);
  assert.equal(adapter.packet_path_live, undefined, name);
  const box = await seal({
    fromHandle: a.handle,
    toHandle: b.handle,
    seq: 3,
    recipientEncPublicKey: b.enc_public_key,
    plaintext: name,
    route_class: name === "relay" ? "relay" : "direct",
  });
  assert.equal(box.carrier, name);
  assert.equal(box.frame_v, 2);
  const text = await adapter.open({
    encPrivateKey: b.encPrivateKey,
    fromHandle: a.handle,
    toHandle: b.handle,
    seq: 3,
    ...box,
    route_class: name === "relay" ? "relay" : "direct",
  });
  assert.equal(text, name, name);
  const denied = await adapter.open({
    encPrivateKey: c.encPrivateKey,
    fromHandle: a.handle,
    toHandle: b.handle,
    seq: 3,
    ...box,
    route_class: name === "relay" ? "relay" : "direct",
  });
  assert.equal(denied, null, name + " third node");
}
assert.equal(carrierForBearer("direct-lan"), "lan");
assert.equal(carrierForBearer("photon"), "photon");
assert.equal(carrierForBearer("bluetooth"), "bluetooth");
assert.equal(carrierForBearer("rf"), "rf");
assert.equal(carrierForBearer("relay"), "relay");

async function node(tip) {
  return createTrack2({ identity: await createIdentity(), fixture: true, tipHash: tip, dataDir: "" });
}
const A = await node("aa".repeat(32));
const B = await node("bb".repeat(32));
const C = await node("cc".repeat(32));
assert.equal(A.allowSession(B.state.identity.handle).code, "MESH-PEER-KEY-REQUIRED");
assert.equal(A.allowSession(B.state.identity.public_key).ok, true);
assert.match(A.allowSession(B.state.identity.public_key).allowlist[0], /^[a-f0-9]{64}$/);
assert.equal(B.allowSession(A.state.identity.public_key).ok, true);
await A.arm(["lan"], "operator");
await B.arm(["lan"], "operator");
await C.arm(["lan"], "operator");
assert.equal((await A.exchange(B)).ok, true);
assert.equal((await B.exchange(A)).ok, true);
const session = await openPeerSession(A, B, { directUrl: "http://192.168.50.2:8781/v1/fed-mesh/direct" });
assert.equal(session.ok, true, JSON.stringify(session));
const sent = await A.send(session.local.session_id, secret);
assert.equal(sent.ok, true, JSON.stringify(sent));
assert.equal(sent.envelope.frame_v, 2);
assert.equal(peerShareSignBody(sent.envelope).frame_v, 2);
const got = await B.recv(sent.envelope);
assert.equal(got.ok, true, JSON.stringify(got));
assert.equal(got.plaintext, secret);
const stolen = await C.recv(sent.envelope);
assert.notEqual(stolen.ok, true);
assert.notEqual(stolen.plaintext, secret);

const vector = {
  spec: "AZRT-SEALED-FRAME-1.0",
  note: "qnm-node interop. Test key only. Version 2 binds the header as additional data. Version 1 has no additional data.",
  cap7_is_icann: false,
  paid_sat: "HELD",
  v2: {
    from: a.handle,
    to: b.handle,
    seq: 1,
    carrier: "lan",
    route_class: "direct",
    plaintext: secret,
    recipient_enc_public_key: b.enc_public_key,
    recipient_enc_pkcs8: Buffer.from(await crypto.subtle.exportKey("pkcs8", b.encPrivateKey)).toString("base64url"),
    ...sealed,
  },
  v1: {
    from: a.handle,
    to: b.handle,
    seq: 2,
    plaintext: "legacy",
    recipient_enc_public_key: b.enc_public_key,
    nonce: v1.nonce,
    eph_public_key: v1.eph_public_key,
    ciphertext: v1.ciphertext,
    frame_v: 1,
  },
};
const path = new URL("../fixtures/sealed-frame-vectors.json", import.meta.url);
const qnmPath = new URL("../qnm-node/sealed-frame-vectors.json", import.meta.url);
const text = JSON.stringify(vector, null, 2) + "\n";
if (process.env.WRITE_VECTORS === "1") {
  writeFileSync(path, text);
  writeFileSync(qnmPath, text);
}
const saved = JSON.parse(readFileSync(path, "utf8"));
assert.equal(saved.spec, "AZRT-SEALED-FRAME-1.0");
assert.equal(saved.v2.frame_v, 2);
assert.equal(saved.v2.aad, frameAad(frameHeader(saved.v2)));
assert.equal(JSON.parse(readFileSync(qnmPath, "utf8")).v2.ciphertext, saved.v2.ciphertext);

console.log("ok sealed frame");
