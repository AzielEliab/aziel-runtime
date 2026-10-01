/**
 * GATE B — replay resistance.
 * Author: Aziel Eliab only.
 */
import assert from "node:assert/strict";
import { openEnvelope, sealEnvelope } from "../src/transport/envelope-v2.js";
import { createReplayCache, rememberReplay } from "../src/transport/replay-cache.js";
import { pair } from "./azp-fixture.mjs";

const { aliceKs, bobKs, alice, bob, now } = await pair();
const cache = createReplayCache({ cap: 2 });
const sealed = await sealEnvelope({
  keystore: aliceKs,
  session: alice.session,
  recipientEncPublicKey: bob.session.ephemeral_enc_public_key,
  payload: "replay-body",
  now,
  ttlMs: 10_000,
});
assert.equal(sealed.ok, true, sealed.message);
const first = await openEnvelope({
  keystore: bobKs,
  session: bob.session,
  envelope: sealed.envelope,
  expectSigningKey: alice.session.ephemeral_public_key,
  now,
  replayCache: cache,
});
assert.equal(first.ok, true, first.message);
const second = await openEnvelope({
  keystore: bobKs,
  session: bob.session,
  envelope: sealed.envelope,
  expectSigningKey: alice.session.ephemeral_public_key,
  now: now + 1,
  replayCache: cache,
});
assert.equal(second.ok, false);
assert.equal(second.code, "AZP-REPLAY");

const other = await sealEnvelope({
  keystore: aliceKs,
  session: alice.session,
  recipientEncPublicKey: bob.session.ephemeral_enc_public_key,
  payload: "other-body",
  now: now + 2,
  ttlMs: 10_000,
});
const third = await openEnvelope({
  keystore: bobKs,
  session: bob.session,
  envelope: other.envelope,
  expectSigningKey: alice.session.ephemeral_public_key,
  now: now + 2,
  replayCache: cache,
});
assert.equal(third.ok, true, third.message);
assert.equal(cache.entries.size <= cache.cap, true);

const bounded = createReplayCache({ cap: 1 });
const kept = rememberReplay(bounded, {
  network_id: "aziel-runtime",
  sender: "sender-a",
  message_id: "m1",
  expires_at: now + 10_000,
}, now);
assert.equal(kept.ok, true);
const evicted = rememberReplay(bounded, {
  network_id: "aziel-runtime",
  sender: "sender-a",
  message_id: "m2",
  expires_at: now + 10_000,
}, now + 1);
assert.equal(evicted.ok, true);
assert.equal(bounded.entries.size, 1);
const forgotten = rememberReplay(bounded, {
  network_id: "aziel-runtime",
  sender: "sender-a",
  message_id: "m1",
  expires_at: now + 10_000,
}, now + 2);
assert.equal(forgotten.ok, true);

console.log("verify-replay: GATE B replay ok");
