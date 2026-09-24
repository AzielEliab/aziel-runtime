/**
 * FED-MESH-1.0 loopback: one relay, two instances, a third identity.
 * They talk through the relay. Author: Aziel Eliab only.
 */
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { signAct } from "../src/fed-mesh/client.js";
import { createIdentity } from "../src/fed-mesh/identity.js";
import { startInstance } from "../src/fed-mesh/instance.js";
import { startRelayServer } from "../src/fed-mesh/local-http.js";
import { ZERO_HASH } from "../src/fed-mesh/spec.js";

const relay = await startRelayServer();
const root = await mkdtemp(join(tmpdir(), "fed-mesh-"));
const alice = await startInstance({ dataDir: join(root, "alice"), relays: [relay.url] });
const bob = await startInstance({ dataDir: join(root, "bob"), relays: [relay.url] });
const cara = await createIdentity({
  seed: Uint8Array.from({ length: 32 }, (_, i) => (i * 7 + 3) % 256),
  encSeed: Uint8Array.from({ length: 32 }, (_, i) => (i * 3 + 9) % 256),
});

try {
  assert.notEqual(alice.base, bob.base);
  assert.notEqual(alice.handle, bob.handle);
  assert.notEqual(alice.handle, cara.handle);

  const health = await fetch(relay.url);
  const cite = await health.json();
  assert.equal(cite.ok, true);
  assert.equal(cite.title, "FED-MESH-1.0: Local-First Edge Mesh");
  assert.equal(cite.worker_requires_plaintext, false);
  assert.equal(cite.health, "up");

  const regA = await alice.register(relay.url);
  const regB = await bob.register(relay.url);
  assert.equal(regA.ok, true, regA.message);
  assert.equal(regB.ok, true, regB.message);

  const caraReg = await signAct(cara, "register", {
    enc_public_key: cara.enc_public_key,
    product: "mesh",
    presence: "live",
    relays: [relay.url],
    seq: 1,
    prev: ZERO_HASH,
  });
  const caraRes = await fetch(`${relay.url}/register`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(caraReg),
  });
  const caraBody = await caraRes.json();
  assert.equal(caraBody.ok, true, caraBody.message);

  const secret = "three-handles";
  const sent = await alice.send(relay.url, {
    to: bob.handle,
    enc_public_key: bob.enc_public_key,
    plaintext: secret,
  });
  assert.equal(sent.ok, true, sent.message);
  assert.equal(JSON.stringify(sent.envelope).includes(secret), false);

  const pulled = await bob.pull(relay.url);
  assert.equal(pulled.messages.length, 1);
  assert.equal(JSON.stringify(pulled).includes(secret), false);
  assert.equal(await bob.open(pulled.messages[0].envelope), secret);
  const delivered = await bob.deliver(relay.url, [pulled.messages[0].msg_hash]);
  assert.equal(delivered.ok, true, delivered.message);
  assert.ok(delivered.delivery_receipt);
  assert.equal(delivered.chainlock.anchored, true);

  const unsigned = await fetch(`${relay.url}/heartbeat`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ v: "FED-MESH-1.0", kind: "heartbeat", handle: alice.handle }),
  });
  const unsignedBody = await unsigned.json();
  assert.equal(unsignedBody.ok, false);
  assert.equal(unsignedBody.code, "FED-MESH-UNSIGNED");

  const dir = await fetch(`${relay.url}/directory?handle=${encodeURIComponent(alice.handle)}`);
  const directory = await dir.json();
  assert.equal(directory.ok, true);
  assert.ok(directory.seq >= 2);

  console.log("verify-fed-mesh-e2e: ok");
} finally {
  await alice.stop();
  await bob.stop();
  await relay.stop();
  await rm(root, { recursive: true, force: true });
}
