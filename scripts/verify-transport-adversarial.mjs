/**
 * GATE B and GATE C — adversarial transport fixtures.
 * Live destruction of a remote provider stays SKIP.
 * Author: Aziel Eliab only.
 */
import assert from "node:assert/strict";
import { canonicalize, utf8 } from "../src/security/canonical.js";
import { exportPublicIdentity } from "../src/security/keystore.js";
import { generateEncryptionKeypair } from "../src/security/signatures.js";
import { assertSessionUsable, verifySessionBinding } from "../src/security/session-identity.js";
import { signSessionTraffic } from "../src/security/session-identity.js";
import { buildCheckpoint, buildRecordChain } from "../src/checkpoints/checkpoint.js";
import { exportPeerState } from "../src/replication/peer-state.js";
import { inspectPeerState } from "../src/replication/peer-state.js";
import { recoverFromReplicas } from "../src/replication/recovery.js";
import { openEnvelope, sealEnvelope } from "../src/transport/envelope-v2.js";
import { createReplayCache, rememberReplay } from "../src/transport/replay-cache.js";
import { createRelay, relayAccept, relayDump, relayForward, relayLog } from "../src/transport/relay.js";
import { negotiateVersion } from "../src/transport/routing.js";
import { nodeKeystore, pair, sessionFor, signerFor } from "./azp-fixture.mjs";

const { aliceKs, bobKs, alice, bob, now } = await pair();
const carolKs = await nodeKeystore();
const carol = await sessionFor(carolKs);
assert.equal(carol.ok, true, carol.message);
const secret = "AZP-SECRET-transport-adversary";

function flip(value) {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
  const chars = value.split("");
  const index = chars.findIndex((char) => alphabet.includes(char));
  chars[index] = alphabet[(alphabet.indexOf(chars[index]) + 1) % alphabet.length];
  return chars.join("");
}

async function seal(extra = {}) {
  return sealEnvelope({
    keystore: aliceKs,
    session: alice.session,
    recipientEncPublicKey: bob.session.ephemeral_enc_public_key,
    payload: secret,
    now,
    ttlMs: 20_000,
    routeClass: "relay",
    ...extra,
  });
}

async function open(envelope, extra = {}) {
  return openEnvelope({
    keystore: bobKs,
    session: bob.session,
    envelope,
    expectSigningKey: alice.session.ephemeral_public_key,
    now,
    ...extra,
  });
}

const sealed = await seal();
assert.equal(sealed.ok, true, sealed.message);
const cache = createReplayCache({ cap: 8 });
const first = await open(sealed.envelope, { replayCache: cache });
assert.equal(first.ok, true, first.message);
assert.equal(first.payload, secret);
const replay = await open(sealed.envelope, { now: now + 1, replayCache: cache });
assert.equal(replay.ok, false);
assert.equal(replay.code, "AZP-REPLAY");

const secondSeal = await seal({ now: now + 2, payload: "other-body" });
assert.equal(secondSeal.ok, true, secondSeal.message);
const secondOpen = await open(secondSeal.envelope, { now: now + 2, replayCache: cache });
assert.equal(secondOpen.ok, true, secondOpen.message);
assert.equal(secondOpen.payload, "other-body");
const crossNetwork = rememberReplay(cache, {
  network_id: "other-network",
  sender: sealed.envelope.sender_signing_key,
  message_id: sealed.envelope.message_id,
  expires_at: now + 20_000,
}, now + 3);
assert.equal(crossNetwork.ok, true, crossNetwork.message);
const crossSender = rememberReplay(cache, {
  network_id: sealed.envelope.network_id,
  sender: carol.session.ephemeral_public_key,
  message_id: sealed.envelope.message_id,
  expires_at: now + 20_000,
}, now + 4);
assert.equal(crossSender.ok, true, crossSender.message);
const sameAgain = rememberReplay(cache, {
  network_id: sealed.envelope.network_id,
  sender: sealed.envelope.sender_signing_key,
  message_id: sealed.envelope.message_id,
  expires_at: now + 20_000,
}, now + 5);
assert.equal(sameAgain.ok, false);
assert.equal(sameAgain.code, "AZP-REPLAY");

const renamed = { ...sealed.envelope, message_id: `${sealed.envelope.message_id}ff` };
const renamedOpen = await open(renamed, { now: now + 4, replayCache: cache });
assert.equal(renamedOpen.ok, false);
assert.equal(renamedOpen.code, "AZP-BAD-SIG");

const expiredOpen = await open(sealed.envelope, { now: now + 20_000, replayCache: createReplayCache({ cap: 4 }) });
assert.equal(expiredOpen.ok, false);
assert.equal(expiredOpen.code, "AZP-EXPIRED");

const forged = { ...sealed.envelope, sender_signature: flip(sealed.envelope.sender_signature) };
const badSig = await open(forged, { now: now + 5 });
assert.equal(badSig.ok, false);
assert.equal(badSig.code, "AZP-BAD-SIG");
const wrong = await openEnvelope({
  keystore: carolKs,
  session: carol.session,
  envelope: sealed.envelope,
  expectSigningKey: alice.session.ephemeral_public_key,
  now: now + 6,
});
assert.equal(wrong.ok, false);
assert.equal(wrong.code, "AZP-WRONG-RECIPIENT");

const expiredSession = assertSessionUsable(alice.session, now + 60_000);
assert.equal(expiredSession.ok, false);
assert.equal(expiredSession.code, "AZP-EXPIRED");
const staleSeal = await seal({ now: now + 60_000 });
assert.equal(staleSeal.ok, false);
assert.equal(staleSeal.code, "AZP-EXPIRED");
const staleOpen = await open(sealed.envelope, { now: now + 60_000 });
assert.equal(staleOpen.ok, false);
assert.equal(staleOpen.code, "AZP-EXPIRED");

const substituted = { ...sealed.envelope, sender_signing_key: carol.session.ephemeral_public_key };
const subOpen = await open(substituted, { now: now + 7 });
assert.equal(subOpen.ok, false);
assert.equal(subOpen.code, "AZP-BAD-SIG");
const expectSwap = await open(sealed.envelope, {
  now: now + 8,
  expectSigningKey: carol.session.ephemeral_public_key,
});
assert.equal(expectSwap.ok, false);
assert.equal(expectSwap.code, "AZP-BAD-SIG");

const eph = await generateEncryptionKeypair();
assert.equal(eph.ok, true, eph.message);
const swappedEph = { ...sealed.envelope, sender_ephemeral_key: eph.public_key };
delete swappedEph.sender_signature;
swappedEph.sender_signature = (await signSessionTraffic(aliceKs, alice.session, utf8(canonicalize(swappedEph)), now + 9)).signature;
const ephOpen = await open(swappedEph, { now: now + 9 });
assert.equal(ephOpen.ok, false);
assert.equal(ephOpen.code, "AZP-TAMPER");

const rebound = { ...alice.session, node_public_key: exportPublicIdentity(bobKs).node_public_key };
const binding = await verifySessionBinding(rebound, rebound.node_public_key);
assert.equal(binding.ok, false);
assert.equal(binding.code, "AZP-BAD-SIG");
const wrongNode = await verifySessionBinding(alice.session, exportPublicIdentity(bobKs).node_public_key);
assert.equal(wrongNode.ok, false);
assert.equal(wrongNode.code, "AZP-BAD-SIG");

const downgradeSeal = await seal({ version: "AZP-NS-0.9" });
assert.equal(downgradeSeal.ok, false);
assert.equal(downgradeSeal.code, "AZP-DOWNGRADE");
const downgraded = { ...sealed.envelope, version: "AZP-NS-0.9" };
delete downgraded.sender_signature;
downgraded.sender_signature = (await signSessionTraffic(aliceKs, alice.session, utf8(canonicalize(downgraded)), now + 10)).signature;
const downgradeOpen = await open(downgraded, { now: now + 10 });
assert.equal(downgradeOpen.ok, false);
assert.equal(downgradeOpen.code, "AZP-DOWNGRADE");
assert.equal(negotiateVersion("AZP-NS-0.9").code, "AZP-DOWNGRADE");
assert.equal(JSON.stringify(negotiateVersion("AZP-NS-0.9")), JSON.stringify(negotiateVersion("AZP-NS-0.9")));
const relayDrop = relayAccept(createRelay({ id: "downgrade" }), downgraded, now + 10);
assert.equal(relayDrop.ok, false);
assert.equal(relayDrop.code, "AZP-DOWNGRADE");
const peer = exportPeerState({
  providerId: "version",
  identity: exportPublicIdentity(aliceKs),
  checkpoints: [],
  records: [],
});
peer.state.protocol_version = "AZP-NS-0.9";
assert.equal(inspectPeerState(peer.state).code, "AZP-DOWNGRADE");

const relay = createRelay({ id: "malicious" });
assert.equal(relayAccept(relay, sealed.envelope, now).ok, true);
assert.equal(relay.decrypt, undefined);
assert.equal(relayDump(relay).can_decrypt, false);
assert.equal(JSON.stringify(relayLog(relay)).includes(secret), false);
assert.equal(JSON.stringify(relayDump(relay)).includes(secret), false);
const forwarded = relayForward(relay, sealed.envelope.message_id);
const mutated = { ...forwarded.envelope, ciphertext: flip(forwarded.envelope.ciphertext) };
const mutatedOpen = await open(mutated, { now: now + 11 });
assert.equal(mutatedOpen.ok, false);
assert.equal(mutatedOpen.code, "AZP-BAD-SIG");
const honest = await open(forwarded.envelope, { now: now + 12 });
assert.equal(honest.ok, true, honest.message);
assert.equal(honest.payload, secret);

const signer = signerFor(aliceKs);
const built = await buildRecordChain({
  chainId: "session",
  entries: [{ record_type: "provenance", timestamp: "2026-10-01T00:00:00.000Z", payload: { payload_sha256: "a".repeat(64), policy: "admit" } }],
});
const checkpoint = await buildCheckpoint({
  records: built.records,
  signerSet: [signer.public_key],
  signers: [signer],
  threshold: 1,
});
assert.equal(checkpoint.ok, true, checkpoint.message);
const left = exportPeerState({
  providerId: "partition-left",
  identity: exportPublicIdentity(aliceKs),
  checkpoints: [checkpoint.checkpoint],
  records: built.records,
});
const leftCopy = exportPeerState({
  providerId: "partition-left-copy",
  identity: exportPublicIdentity(aliceKs),
  checkpoints: [checkpoint.checkpoint],
  records: built.records,
});
const empty = exportPeerState({
  providerId: "partition-right",
  identity: exportPublicIdentity(bobKs),
  checkpoints: [],
  records: [],
});
const badSigCheckpoint = {
  ...checkpoint.checkpoint,
  signatures: [{ public_key: signer.public_key, sig: "aa" }],
};
const rightBad = exportPeerState({
  providerId: "partition-right-bad",
  identity: exportPublicIdentity(bobKs),
  checkpoints: [badSigCheckpoint],
  records: built.records,
});
const joined = await recoverFromReplicas([left, leftCopy, empty, rightBad], { minReplicas: 2 });
assert.equal(joined.ok, true, joined.message);
assert.equal(joined.checkpoint_hash, checkpoint.checkpoint.checkpoint_hash);
assert.equal(joined.providers.includes("partition-right"), false);
assert.equal(joined.providers.includes("partition-right-bad"), false);
const emptyOnly = await recoverFromReplicas([empty], { minReplicas: 2 });
assert.equal(emptyOnly.ok, false);
assert.equal(emptyOnly.code, "AZP-RECOVER-SHORT");

const report = [
  { id: "replay", mode: "FIXTURE", ok: replay.code === "AZP-REPLAY" },
  { id: "replay-distinct-message", mode: "FIXTURE", ok: secondOpen.payload === "other-body" && crossNetwork.ok === true && crossSender.ok === true && sameAgain.code === "AZP-REPLAY" },
  { id: "replay-message-id-mutation", mode: "FIXTURE", ok: renamedOpen.code === "AZP-BAD-SIG" },
  { id: "forged-signature", mode: "FIXTURE", ok: badSig.code === "AZP-BAD-SIG" },
  { id: "wrong-recipient", mode: "FIXTURE", ok: wrong.code === "AZP-WRONG-RECIPIENT" },
  { id: "expired-session", mode: "FIXTURE", ok: expiredSession.code === "AZP-EXPIRED" && staleSeal.code === "AZP-EXPIRED" && staleOpen.code === "AZP-EXPIRED" },
  { id: "expired-envelope-before-replay", mode: "FIXTURE", ok: expiredOpen.code === "AZP-EXPIRED" },
  { id: "session-key-substitution", mode: "FIXTURE", ok: subOpen.code === "AZP-BAD-SIG" && expectSwap.code === "AZP-BAD-SIG" },
  { id: "node-key-substitution", mode: "FIXTURE", ok: binding.code === "AZP-BAD-SIG" && wrongNode.code === "AZP-BAD-SIG" },
  { id: "encryption-key-substitution", mode: "FIXTURE", ok: ephOpen.code === "AZP-TAMPER" },
  { id: "protocol-downgrade", mode: "FIXTURE", ok: downgradeSeal.code === "AZP-DOWNGRADE" && downgradeOpen.code === "AZP-DOWNGRADE" && relayDrop.code === "AZP-DOWNGRADE" },
  { id: "malicious-relay", mode: "FIXTURE", ok: mutatedOpen.code === "AZP-BAD-SIG" && honest.payload === secret && relay.decrypt === undefined },
  { id: "partition-reconcile", mode: "FIXTURE", ok: joined.ok === true && emptyOnly.code === "AZP-RECOVER-SHORT" },
  { id: "destroy-live-provider", mode: "SKIP", ok: false, note: "Live remote destroy is operator work. This script does not contact Cloudflare or a VPS." },
];
for (const row of report) {
  assert.ok(row.mode === "FIXTURE" || row.mode === "SKIP", row.id);
  if (row.mode === "FIXTURE") assert.equal(row.ok, true, row.id);
  if (row.mode === "SKIP") assert.equal(row.ok, false, row.id);
}
assert.equal(report.some((row) => row.mode === "LIVE"), false);

console.log(JSON.stringify({ script: "verify-transport-adversarial", live_multi_provider: false, report }, null, 2));
console.log("verify-transport-adversarial: GATE B/C fixture/SKIP ok");
