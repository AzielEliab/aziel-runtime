/**
 * GATE C — relay distrust. GATE G bearer refusal is included.
 * Author: Aziel Eliab only.
 */
import assert from "node:assert/strict";
import { openEnvelope, sealEnvelope } from "../src/transport/envelope-v2.js";
import { createRelay, relayAccept, relayDropExpired, relayDump, relayForward, relayLog, relayStored } from "../src/transport/relay.js";
import { negotiateBearer, negotiateVersion } from "../src/transport/routing.js";
import { endSession } from "../src/security/session-identity.js";
import { pair } from "./azp-fixture.mjs";

const { aliceKs, bobKs, alice, bob, now } = await pair();
const secret = "AZP-SECRET-relay-must-not-see";
const sealed = await sealEnvelope({
  keystore: aliceKs,
  session: alice.session,
  recipientEncPublicKey: bob.session.ephemeral_enc_public_key,
  payload: secret,
  now,
  ttlMs: 30_000,
  routeClass: "relay",
});
assert.equal(sealed.ok, true, sealed.message);

const relayA = createRelay({ id: "relay-a", retentionMs: 30_000 });
const accepted = relayAccept(relayA, sealed.envelope, now);
assert.equal(accepted.ok, true, accepted.message);
assert.equal(accepted.can_decrypt, false);
assert.equal(JSON.stringify(relayLog(relayA)).includes(secret), false);
assert.equal(JSON.stringify(relayDump(relayA)).includes(secret), false);
assert.equal(relayDump(relayA).can_decrypt, false);
assert.equal(relayA.decrypt, undefined);

const forwarded = relayForward(relayA, sealed.envelope.message_id);
assert.equal(forwarded.ok, true);
const opened = await openEnvelope({
  keystore: bobKs,
  session: bob.session,
  envelope: forwarded.envelope,
  expectSigningKey: alice.session.ephemeral_public_key,
  now,
});
assert.equal(opened.ok, true, opened.message);
assert.equal(opened.payload, secret);

const stored = relayStored(relayA, sealed.envelope.message_id);
stored.ciphertext = `${stored.ciphertext.slice(0, -1)}${stored.ciphertext.endsWith("A") ? "B" : "A"}`;
const modified = await openEnvelope({
  keystore: bobKs,
  session: bob.session,
  envelope: stored,
  expectSigningKey: alice.session.ephemeral_public_key,
  now: now + 1,
});
assert.equal(modified.ok, false);
assert.equal(modified.code, "AZP-BAD-SIG");

const relayB = createRelay({ id: "relay-b" });
const moved = relayAccept(relayB, sealed.envelope, now + 2);
assert.equal(moved.ok, true, moved.message);
const viaB = await openEnvelope({
  keystore: bobKs,
  session: bob.session,
  envelope: relayForward(relayB, sealed.envelope.message_id).envelope,
  expectSigningKey: alice.session.ephemeral_public_key,
  now: now + 2,
});
assert.equal(viaB.ok, true, viaB.message);

const named = relayAccept(relayA, { ...sealed.envelope, payload: secret }, now + 3);
assert.equal(named.ok, false);
assert.equal(named.code, "AZP-RELAY-PLAINTEXT");

endSession(bobKs, bob.session.session_id);
const stale = await openEnvelope({
  keystore: bobKs,
  session: bob.session,
  envelope: relayForward(relayB, sealed.envelope.message_id).envelope,
  expectSigningKey: alice.session.ephemeral_public_key,
  now: now + 4,
});
assert.equal(stale.ok, false);
assert.equal(JSON.stringify(relayDump(relayA)).includes(secret), false);
assert.equal(JSON.stringify(relayDump(relayB)).includes(secret), false);

const dropped = relayDropExpired(relayA, now + 60_000);
assert.equal(dropped.ok, true);
assert.equal(dropped.retained, 0);

for (const bearer of ["tor", "udp", "radio", "sandbox"]) {
  const refused = negotiateBearer(bearer);
  assert.equal(refused.ok, false);
  assert.equal(refused.live, false);
  assert.equal(refused.code, "AZP-BEARER-REFUSE");
}
assert.equal(negotiateVersion("AZP-NS-0.9").code, "AZP-DOWNGRADE");
assert.equal(negotiateVersion("AZP-NS-1.0").ok, true);
assert.equal(JSON.stringify(negotiateVersion("AZP-NS-0.9")), JSON.stringify(negotiateVersion("AZP-NS-0.9")));

console.log("verify-relay: GATE C ok");
