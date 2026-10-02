/**
 * GATE A — key security.
 * Author: Aziel Eliab only.
 */
import assert from "node:assert/strict";
import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { bytesToB64url, utf8 } from "../src/security/canonical.js";
import {
  KEYSTORE_ITERATIONS,
  assertKeystoreHasNoPlaintextSeeds,
  createKeystore,
  exportPublicIdentity,
  loadKey,
  rotateKey,
  unlockKeystore,
} from "../src/security/keystore.js";
import { assertSessionUsable, createSessionIdentity, verifySessionBinding } from "../src/security/session-identity.js";
import { signBytes, verifyBytes } from "../src/security/signatures.js";
import { openInstance } from "../src/fed-mesh/instance.js";
import { ITERATIONS, PASSPHRASE } from "./azp-fixture.mjs";

assert.equal(KEYSTORE_ITERATIONS, 210_000);

const seed = new Uint8Array(32).fill(9);
const seedB64 = bytesToB64url(seed);
const created = await createKeystore({
  passphrase: PASSPHRASE,
  iterations: ITERATIONS,
  signingSeed: seed,
});
assert.equal(created.ok, true, created.message);
assert.ok(seed.every((byte) => byte === 0), "caller seed must be zeroized");
const documentText = JSON.stringify(created.document);
assert.equal(documentText.includes(seedB64), false);
assert.equal(assertKeystoreHasNoPlaintextSeeds(created.document).ok, true);
assert.equal(documentText.includes(PASSPHRASE), false);

const unlocked = await unlockKeystore(created.document, PASSPHRASE);
assert.equal(unlocked.ok, true, unlocked.message);
const pub = exportPublicIdentity(unlocked);
assert.equal(pub.ok, true);
assert.equal(pub.node_public_key, exportPublicIdentity(created).node_public_key);

const corrupt = { ...created.document, v: "nope" };
const badVersion = await unlockKeystore(corrupt, PASSPHRASE);
assert.equal(badVersion.ok, false);
assert.equal(badVersion.fail_closed, true);
assert.equal(badVersion.privateKey, undefined);

const head = created.document.ciphertext[0] === "A" ? "B" : "A";
const flipped = {
  ...created.document,
  ciphertext: `${head}${created.document.ciphertext.slice(1)}`,
};
const tampered = await unlockKeystore(flipped, PASSPHRASE);
assert.equal(tampered.ok, false);
assert.equal(tampered.fail_closed, true);
assert.equal(tampered.privateKey, undefined);
assert.equal(String(tampered.message).includes(PASSPHRASE), false);

const wrong = await unlockKeystore(created.document, "not-the-passphrase");
assert.equal(wrong.ok, false);
assert.equal(wrong.code, "AZKS-UNLOCK");

const before = exportPublicIdentity(unlocked);
const priorKey = loadKey(unlocked, "node-sign");
const priorSig = await signBytes(priorKey.privateKey, utf8("rotate-me"));
const rotated = await rotateKey(unlocked, { now: "2026-10-01T00:00:00.000Z" });
assert.equal(rotated.ok, true, rotated.message);
assert.notEqual(rotated.public_key, before.node_public_key);
assert.equal(await verifyBytes(before.node_public_key, utf8("rotate-me"), priorSig), true);
assert.equal(await verifyBytes(rotated.public_key, utf8("rotate-me"), priorSig), false);
const nextKey = loadKey(unlocked, "node-sign");
const nextSig = await signBytes(nextKey.privateKey, utf8("after"));
assert.equal(await verifyBytes(rotated.public_key, utf8("after"), nextSig), true);
assert.equal(assertKeystoreHasNoPlaintextSeeds(rotated.document).ok, true);

const fresh = await createKeystore({ passphrase: PASSPHRASE, iterations: ITERATIONS });
const session = await createSessionIdentity({ keystore: fresh, ttlMs: 1_000, now: 1_000 });
assert.equal(session.ok, true, session.message);
assert.notEqual(session.session.ephemeral_public_key, session.node_public_key);
assert.notEqual(session.session.ephemeral_enc_public_key, exportPublicIdentity(fresh).enc_public_key);
const binding = await verifySessionBinding(session.session, session.node_public_key);
assert.equal(binding.ok, true, binding.message);
const expired = assertSessionUsable(session.session, 2_000);
assert.equal(expired.ok, false);
assert.equal(expired.code, "AZP-EXPIRED");

const root = await mkdtemp(join(tmpdir(), "azks-"));
const node = await openInstance({
  dataDir: root,
  passphrase: PASSPHRASE,
  iterations: ITERATIONS,
});
const idText = await readFile(join(root, "identity.json"), "utf8");
const ksText = await readFile(join(root, "keystore.json"), "utf8");
assert.equal(idText.includes("seed_b64"), false);
assert.equal(ksText.includes(PASSPHRASE), false);
assert.equal(assertKeystoreHasNoPlaintextSeeds(ksText).ok, true);
const again = await openInstance({ dataDir: root, passphrase: PASSPHRASE, iterations: ITERATIONS });
assert.equal(again.identity.handle, node.identity.handle);
await assert.rejects(() => openInstance({ dataDir: root }), (err) => err.code === "AZKS-UNLOCK");

const plainDir = await mkdtemp(join(tmpdir(), "azks-l0-"));
const plain = await openInstance({ dataDir: plainDir });
const plainText = await readFile(join(plainDir, "identity.json"), "utf8");
assert.equal(plainText.includes("seed_b64"), true);
assert.equal(plain.identity.handle.startsWith("#"), true);

console.log("verify-keystore: GATE A ok");
