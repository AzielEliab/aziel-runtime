/**
 * GATE B — envelope confidentiality, tamper, expiry, recipient, signature.
 * Replay lives in verify-replay.mjs. Author: Aziel Eliab only.
 */
import assert from "node:assert/strict";
import { canonicalize, utf8 } from "../src/security/canonical.js";
import { loadKey } from "../src/security/keystore.js";
import { endSession, signSessionTraffic } from "../src/security/session-identity.js";
import { openEnvelope, sealEnvelope } from "../src/transport/envelope-v2.js";
import { nodeKeystore, pair, sessionFor } from "./azp-fixture.mjs";

const { aliceKs, bobKs, alice, bob, now } = await pair();
const carolKs = await nodeKeystore();
const carol = await sessionFor(carolKs);
assert.equal(carol.ok, true, carol.message);

const secret = "AZP-SECRET-payload-9f3c2a-do-not-log";
const sealed = await sealEnvelope({
  keystore: aliceKs,
  session: alice.session,
  recipientEncPublicKey: bob.session.ephemeral_enc_public_key,
  payload: secret,
  now,
  ttlMs: 5_000,
  routeClass: "relay",
});
assert.equal(sealed.ok, true, sealed.message);
const packed = JSON.stringify(sealed.envelope);
assert.equal(packed.includes(secret), false);
assert.equal(packed.includes(alice.node_public_key), false);
assert.equal(packed.includes("plaintext"), false);

const opened = await openEnvelope({
  keystore: bobKs,
  session: bob.session,
  envelope: sealed.envelope,
  expectSigningKey: alice.session.ephemeral_public_key,
  now,
});
assert.equal(opened.ok, true, opened.message);
assert.equal(opened.payload, secret);

const flipped = { ...sealed.envelope, ciphertext: flip(sealed.envelope.ciphertext) };
const tamperSig = await openEnvelope({
  keystore: bobKs,
  session: bob.session,
  envelope: flipped,
  expectSigningKey: alice.session.ephemeral_public_key,
  now: now + 1,
});
assert.equal(tamperSig.ok, false);
assert.equal(tamperSig.code, "AZP-BAD-SIG");

const resigned = { ...flipped };
delete resigned.sender_signature;
const sig = await signSessionTraffic(aliceKs, alice.session, utf8(canonicalize(resigned)), now + 2);
assert.equal(sig.ok, true, sig.message);
resigned.sender_signature = sig.signature;
const tamper = await openEnvelope({
  keystore: bobKs,
  session: bob.session,
  envelope: resigned,
  expectSigningKey: alice.session.ephemeral_public_key,
  now: now + 2,
});
assert.equal(tamper.ok, false);
assert.equal(tamper.code, "AZP-TAMPER");

const expired = await openEnvelope({
  keystore: bobKs,
  session: bob.session,
  envelope: sealed.envelope,
  expectSigningKey: alice.session.ephemeral_public_key,
  now: now + 5_000,
});
assert.equal(expired.ok, false);
assert.equal(expired.code, "AZP-EXPIRED");

const wrong = await openEnvelope({
  keystore: carolKs,
  session: carol.session,
  envelope: sealed.envelope,
  expectSigningKey: alice.session.ephemeral_public_key,
  now: now + 3,
});
assert.equal(wrong.ok, false);
assert.equal(wrong.code, "AZP-WRONG-RECIPIENT");

const substituted = { ...sealed.envelope };
const bobKey = loadKey(bobKs, `${bob.session.session_id}:sign`);
const body = { ...substituted };
delete body.sender_signature;
substituted.sender_signature = (await signSessionTraffic(bobKs, bob.session, utf8(canonicalize(body)), now + 4)).signature;
assert.notEqual(substituted.sender_signature, sealed.envelope.sender_signature);
assert.equal(bobKey.ok, true);
const sub = await openEnvelope({
  keystore: bobKs,
  session: bob.session,
  envelope: substituted,
  expectSigningKey: alice.session.ephemeral_public_key,
  now: now + 4,
});
assert.equal(sub.ok, false);
assert.equal(sub.code, "AZP-BAD-SIG");

const ended = endSession(bobKs, bob.session.session_id);
assert.equal(ended.ok, true);
const after = await openEnvelope({
  keystore: bobKs,
  session: bob.session,
  envelope: sealed.envelope,
  expectSigningKey: alice.session.ephemeral_public_key,
  now: now + 6,
});
assert.equal(after.ok, false);
assert.equal(after.code, "AZP-EXPIRED");

const downgrade = await sealEnvelope({
  keystore: aliceKs,
  session: alice.session,
  recipientEncPublicKey: bob.session.ephemeral_enc_public_key,
  payload: "x",
  version: "AZP-NS-0.9",
  now,
});
assert.equal(downgrade.ok, false);
assert.equal(downgrade.code, "AZP-DOWNGRADE");

function flip(value) {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
  const chars = value.split("");
  const index = chars.findIndex((char) => alphabet.includes(char));
  chars[index] = alphabet[(alphabet.indexOf(chars[index]) + 1) % alphabet.length];
  return chars.join("");
}

console.log("verify-envelope-v2: GATE B ok");
