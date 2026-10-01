/**
 * GATE A — stolen keystore, session compromise, rotation, revocation.
 * Historical checkpoint verification is not rewritten.
 * Author: Aziel Eliab only.
 */
import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { utf8 } from "../src/security/canonical.js";
import {
  assertKeystoreHasNoPlaintextSeeds,
  destroySessionKey,
  exportPublicIdentity,
  loadKey,
  resealKeystore,
  rotateKey,
  unlockKeystore,
} from "../src/security/keystore.js";
import { assertSessionUsable, createSessionIdentity, endSession } from "../src/security/session-identity.js";
import { verifyBytes } from "../src/security/signatures.js";
import { buildCheckpoint, buildRecordChain } from "../src/checkpoints/checkpoint.js";
import { acceptCheckpoint, createCheckpointLog, forkStatement, verifyCheckpointRecords } from "../src/checkpoints/verify.js";
import { openEnvelope, sealEnvelope } from "../src/transport/envelope-v2.js";
import { ITERATIONS, NOW, PASSPHRASE, nodeKeystore, sessionFor, signerFor } from "./azp-fixture.mjs";

const stolen = await nodeKeystore();
const sessionOnDisk = await createSessionIdentity({ keystore: stolen, ttlMs: 60_000, now: NOW });
assert.equal(sessionOnDisk.ok, true, sessionOnDisk.message);
await resealKeystore(stolen);
const documentText = JSON.stringify(stolen.document);
assert.equal(assertKeystoreHasNoPlaintextSeeds(stolen.document).ok, true);
assert.equal(documentText.includes(PASSPHRASE), false);
assert.equal(stolen.document.key_index.some((row) => row.purpose === "session"), false);
assert.equal(documentText.includes(sessionOnDisk.session.ephemeral_public_key), false);

const dir = await mkdtemp(join(tmpdir(), "azp-stolen-"));
await writeFile(join(dir, "keystore.json"), documentText);
const fromDisk = JSON.parse(await readFile(join(dir, "keystore.json"), "utf8"));
const noPass = await unlockKeystore(fromDisk);
assert.equal(noPass.ok, false);
assert.equal(noPass.fail_closed, true);
assert.equal(noPass.privateKey, undefined);
const emptyPass = await unlockKeystore(fromDisk, "");
assert.equal(emptyPass.ok, false);
assert.equal(emptyPass.code, "AZKS-UNLOCK");
const wrongPass = await unlockKeystore(fromDisk, "not-the-passphrase");
assert.equal(wrongPass.ok, false);
assert.equal(wrongPass.code, "AZKS-UNLOCK");
assert.equal(loadKey(noPass, "node-sign").ok, false);
assert.equal(loadKey(fromDisk, "node-sign").code, "AZKS-UNLOCK");
const honest = await unlockKeystore(fromDisk, PASSPHRASE);
assert.equal(honest.ok, true, honest.message);
assert.equal(exportPublicIdentity(honest).node_public_key, exportPublicIdentity(stolen).node_public_key);

const aliceKs = await nodeKeystore();
const bobKs = await nodeKeystore();
const alice = await sessionFor(aliceKs);
const bob = await sessionFor(bobKs);
const secret = "session-compromise-payload";
const sealed = await sealEnvelope({
  keystore: aliceKs,
  session: alice.session,
  recipientEncPublicKey: bob.session.ephemeral_enc_public_key,
  payload: secret,
  now: NOW,
  ttlMs: 30_000,
});
assert.equal(sealed.ok, true, sealed.message);
const opened = await openEnvelope({
  keystore: bobKs,
  session: bob.session,
  envelope: sealed.envelope,
  expectSigningKey: alice.session.ephemeral_public_key,
  now: NOW,
});
assert.equal(opened.payload, secret);
const destroyed = destroySessionKey(bobKs, bob.session.session_id);
assert.equal(destroyed.ok, true, destroyed.message);
assert.equal(endSession(bobKs, bob.session.session_id).ok, false);
const oldEnvelope = await openEnvelope({
  keystore: bobKs,
  session: bob.session,
  envelope: sealed.envelope,
  expectSigningKey: alice.session.ephemeral_public_key,
  now: NOW + 1,
});
assert.equal(oldEnvelope.ok, false);
assert.equal(oldEnvelope.code, "AZP-EXPIRED");
assert.equal(JSON.stringify(sealed.envelope).includes(secret), false);
const bobNext = await sessionFor(bobKs, { now: NOW + 2 });
assert.equal(bobNext.ok, true, bobNext.message);
const resealed = await sealEnvelope({
  keystore: aliceKs,
  session: alice.session,
  recipientEncPublicKey: bobNext.session.ephemeral_enc_public_key,
  payload: secret,
  now: NOW + 2,
  ttlMs: 30_000,
});
assert.equal(resealed.ok, true, resealed.message);
const reopened = await openEnvelope({
  keystore: bobKs,
  session: bobNext.session,
  envelope: resealed.envelope,
  expectSigningKey: alice.session.ephemeral_public_key,
  now: NOW + 2,
});
assert.equal(reopened.ok, true, reopened.message);
assert.equal(reopened.payload, secret);

const short = await createSessionIdentity({ keystore: aliceKs, ttlMs: 1_000, now: NOW });
assert.equal(short.ok, true, short.message);
const shortBob = await createSessionIdentity({ keystore: bobKs, ttlMs: 1_000, now: NOW });
assert.equal(shortBob.ok, true, shortBob.message);
const shortSeal = await sealEnvelope({
  keystore: aliceKs,
  session: short.session,
  recipientEncPublicKey: shortBob.session.ephemeral_enc_public_key,
  payload: "short",
  now: NOW,
  ttlMs: 30_000,
});
assert.equal(shortSeal.ok, true, shortSeal.message);
const expiredUse = assertSessionUsable(short.session, NOW + 1_000);
assert.equal(expiredUse.code, "AZP-EXPIRED");
const expiredSeal = await sealEnvelope({
  keystore: aliceKs,
  session: short.session,
  recipientEncPublicKey: shortBob.session.ephemeral_enc_public_key,
  payload: "late",
  now: NOW + 1_000,
  ttlMs: 30_000,
});
assert.equal(expiredSeal.code, "AZP-EXPIRED");
const expiredOpen = await openEnvelope({
  keystore: bobKs,
  session: shortBob.session,
  envelope: shortSeal.envelope,
  expectSigningKey: short.session.ephemeral_public_key,
  now: NOW + 1_000,
});
assert.equal(expiredOpen.ok, false);
assert.equal(expiredOpen.code, "AZP-EXPIRED");
assert.equal(JSON.stringify(shortSeal.envelope).includes("short"), false);

const nodes = [await nodeKeystore(), await nodeKeystore(), await nodeKeystore()];
const signers = nodes.map(signerFor);
const oldPub = signers[2].public_key;
const historicalText = "historical-node-signature";
const historicalSig = await signers[2].sign(historicalText);
const built = await buildRecordChain({
  chainId: "session",
  entries: [{ record_type: "provenance", timestamp: "2026-10-01T00:00:00.000Z", payload: { payload_sha256: "a".repeat(64), policy: "admit" } }],
});
const roster = signers.map((signer) => signer.public_key).sort();
const historical = await buildCheckpoint({
  records: built.records,
  signerSet: roster,
  signers,
  threshold: 2,
});
assert.equal(historical.ok, true, historical.message);
const log = createCheckpointLog();
assert.equal((await acceptCheckpoint(log, historical.checkpoint, built.records)).ok, true);
const replayed = await acceptCheckpoint(log, historical.checkpoint, built.records, {
  revokedPublicKeys: [oldPub],
});
assert.equal(replayed.ok, true);
assert.equal(replayed.replayed, true);

const rotated = await rotateKey(nodes[2], { now: "2026-10-01T02:00:00.000Z" });
assert.equal(rotated.ok, true, rotated.message);
assert.notEqual(rotated.public_key, oldPub);
assert.equal(await verifyBytes(oldPub, utf8(historicalText), historicalSig), true);
assert.equal(await verifyBytes(rotated.public_key, utf8(historicalText), historicalSig), false);
const still = await verifyCheckpointRecords(historical.checkpoint, built.records);
assert.equal(still.ok, true, still.message);
assert.equal(log.accepted[0].checkpoint.checkpoint_hash, historical.checkpoint.checkpoint_hash);
const retired = nodes[2].document.key_index.find((row) => row.public_key === oldPub);
assert.equal(retired.status, "retired");
const nextSigner = signerFor(nodes[2]);
assert.equal(nextSigner.public_key, rotated.public_key);
const nextSig = await nextSigner.sign("new-tip");
assert.equal(await verifyBytes(rotated.public_key, utf8("new-tip"), nextSig), true);
assert.equal(await verifyBytes(oldPub, utf8("new-tip"), nextSig), false);

const continuation = await buildRecordChain({
  chainId: "session",
  startSeq: historical.checkpoint.end_seq + 1,
  previousHash: historical.checkpoint.end_hash,
  entries: [{ record_type: "provenance", timestamp: "2026-10-01T00:10:00.000Z", payload: { payload_sha256: "b".repeat(64), policy: "admit" } }],
});
const sameRosterNext = await buildCheckpoint({
  records: continuation.records,
  signerSet: roster,
  signers: [signers[0], signers[1]],
  threshold: 2,
});
assert.equal(sameRosterNext.ok, true, sameRosterNext.message);
const revokedAttempt = await acceptCheckpoint(log, sameRosterNext.checkpoint, continuation.records, {
  revokedPublicKeys: [oldPub],
});
assert.equal(revokedAttempt.ok, false);
assert.equal(revokedAttempt.code, "AZP-THRESHOLD");
assert.match(revokedAttempt.message, /revoked/);
assert.equal(log.tip.checkpoint_hash, historical.checkpoint.checkpoint_hash);
assert.equal(log.accepted.length, 1);
const unchanged = await verifyCheckpointRecords(log.accepted[0].checkpoint, log.accepted[0].records);
assert.equal(unchanged.ok, true, unchanged.message);

const cleanLog = createCheckpointLog();
assert.equal((await acceptCheckpoint(cleanLog, historical.checkpoint, built.records)).ok, true);
const withoutRevocation = await acceptCheckpoint(cleanLog, sameRosterNext.checkpoint, continuation.records);
assert.equal(withoutRevocation.ok, true, withoutRevocation.message);

const newRoster = [signers[0].public_key, signers[1].public_key, nextSigner.public_key].sort();
assert.equal(newRoster.includes(oldPub), false);
const alone = await buildCheckpoint({
  records: continuation.records,
  signerSet: newRoster,
  signers: [signers[2]],
  threshold: 2,
});
assert.equal(alone.ok, false);
assert.equal(alone.code, "AZP-THRESHOLD");
const nextCp = await buildCheckpoint({
  records: continuation.records,
  signerSet: newRoster,
  signers: [signers[0], signers[1], nextSigner],
  threshold: 2,
});
assert.equal(nextCp.ok, true, nextCp.message);
assert.equal(nextCp.checkpoint.signatures.some((row) => row.public_key === nextSigner.public_key), true);
assert.equal(nextCp.checkpoint.signatures.some((row) => row.public_key === oldPub), false);
const reason = "rotate-compromised-node";
const statement = await forkStatement({
  network_id: nextCp.checkpoint.network_id,
  chain_id: nextCp.checkpoint.chain_id,
  from_hash: historical.checkpoint.checkpoint_hash,
  to_hash: nextCp.checkpoint.checkpoint_hash,
  reason,
});
const authorizations = [];
for (const signer of [signers[0], signers[1]]) {
  authorizations.push({ public_key: signer.public_key, sig: await signer.sign(statement) });
}
const rotatedTip = await acceptCheckpoint(log, nextCp.checkpoint, continuation.records, {
  fork: { reason, authorizations },
  revokedPublicKeys: [oldPub],
});
assert.equal(rotatedTip.ok, true, rotatedTip.message);
assert.equal(log.tip.checkpoint_hash, nextCp.checkpoint.checkpoint_hash);
const priorStill = await verifyCheckpointRecords(historical.checkpoint, built.records);
assert.equal(priorStill.ok, true, priorStill.message);
assert.equal(await verifyBytes(oldPub, utf8(historical.checkpoint.checkpoint_hash), historical.checkpoint.signatures.find((row) => row.public_key === oldPub).sig), true);

const solo = await buildCheckpoint({
  records: built.records,
  signerSet: [oldPub],
  signers: [signers[2]],
  threshold: 1,
});
assert.equal(solo.ok, true, solo.message);
const soloGenesis = await acceptCheckpoint(createCheckpointLog(), solo.checkpoint, built.records);
assert.equal(soloGenesis.ok, true, soloGenesis.message);
const afterTip = createCheckpointLog();
assert.equal((await acceptCheckpoint(afterTip, historical.checkpoint, built.records)).ok, true);
const soloConflict = await acceptCheckpoint(afterTip, solo.checkpoint, built.records, {
  revokedPublicKeys: [oldPub],
});
assert.equal(soloConflict.ok, false);
assert.equal(afterTip.tip.checkpoint_hash, historical.checkpoint.checkpoint_hash);
assert.equal((await verifyCheckpointRecords(historical.checkpoint, built.records)).ok, true);

const report = [
  { id: "stolen-keystore-without-passphrase", mode: "FIXTURE", ok: noPass.ok === false && wrongPass.code === "AZKS-UNLOCK" },
  { id: "session-key-destroyed", mode: "FIXTURE", ok: oldEnvelope.code === "AZP-EXPIRED" && reopened.payload === secret },
  { id: "session-expired", mode: "FIXTURE", ok: expiredSeal.code === "AZP-EXPIRED" && expiredOpen.code === "AZP-EXPIRED" },
  { id: "historical-signature-under-old-pubkey", mode: "FIXTURE", ok: still.ok === true },
  { id: "new-tip-uses-rotated-key", mode: "FIXTURE", ok: rotatedTip.ok === true && nextCp.checkpoint.signatures.some((row) => row.public_key === rotated.public_key) },
  { id: "revoked-roster-refused", mode: "FIXTURE", ok: revokedAttempt.code === "AZP-THRESHOLD" && priorStill.ok === true },
  { id: "old-key-alone-cannot-meet-new-threshold", mode: "FIXTURE", ok: alone.code === "AZP-THRESHOLD" && soloConflict.ok === false },
];
for (const row of report) {
  assert.equal(row.mode, "FIXTURE");
  assert.equal(row.ok, true, row.id);
}
assert.equal(ITERATIONS >= 100_000, true);

console.log(JSON.stringify({ script: "verify-key-compromise", live_multi_provider: false, report }, null, 2));
console.log("verify-key-compromise: GATE A compromise ok");
