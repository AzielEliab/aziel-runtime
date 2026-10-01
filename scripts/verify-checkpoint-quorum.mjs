/**
 * GATE D — checkpoint quorum in a fixture.
 * Several independent signers must reach the threshold.
 * One signer cannot force accept. A Byzantine peer cannot inject a tip.
 * Author: Aziel Eliab only.
 */
import assert from "node:assert/strict";
import { exportPublicIdentity } from "../src/security/keystore.js";
import { utf8 } from "../src/security/canonical.js";
import { generateSigningKeypair, signBytes } from "../src/security/signatures.js";
import { buildCheckpoint, buildRecordChain, hashCheckpoint, signerSetHash } from "../src/checkpoints/checkpoint.js";
import { acceptCheckpoint, createCheckpointLog, forkStatement, verifyCheckpoint, verifyCheckpointRecords } from "../src/checkpoints/verify.js";
import { exportPeerState } from "../src/replication/peer-state.js";
import { recoverFromReplicas } from "../src/replication/recovery.js";
import { nodeKeystore, signerFor } from "./azp-fixture.mjs";

const names = ["a", "b", "c", "d", "e"];
const opened = [];
for (const name of names) opened.push(await nodeKeystore({ now: `2026-10-01T00:0${opened.length}:00.000Z` }));
const signers = opened.map(signerFor);
const roster = signers.map((signer) => signer.public_key).sort();
const threshold = 2;
assert.equal(new Set(roster).size, 5);
assert.ok(threshold > 1);
assert.ok(roster.length > threshold);

const outsiderKeys = await generateSigningKeypair();
assert.equal(outsiderKeys.ok, true, outsiderKeys.message);
const outsider = {
  public_key: outsiderKeys.public_key,
  sign: (text) => signBytes(outsiderKeys.privateKey, utf8(text)),
};
assert.equal(roster.includes(outsider.public_key), false);

async function chain(label, extra = {}) {
  const built = await buildRecordChain({
    chainId: "session",
    entries: [
      {
        record_type: "provenance",
        timestamp: extra.timestamp || "2026-10-01T00:00:00.000Z",
        payload: { payload_sha256: label.repeat(64).slice(0, 64), policy: "admit" },
      },
    ],
    ...extra,
  });
  assert.equal(built.ok, true, built.message);
  return built;
}

async function authorize(who, checkpoint, fromHash, reason) {
  const statement = await forkStatement({
    network_id: checkpoint.network_id,
    chain_id: checkpoint.chain_id,
    from_hash: fromHash,
    to_hash: checkpoint.checkpoint_hash,
    reason,
  });
  const authorizations = [];
  for (const signer of who) {
    authorizations.push({ public_key: signer.public_key, sig: await signer.sign(statement) });
  }
  return { reason, authorizations };
}

const primaryRecords = await chain("a");
const quorum = await buildCheckpoint({
  records: primaryRecords.records,
  signerSet: roster,
  signers: [signers[0], signers[1], signers[2]],
  threshold,
});
assert.equal(quorum.ok, true, quorum.message);
assert.ok(quorum.checkpoint.signatures.length >= threshold);
const verified = await verifyCheckpointRecords(quorum.checkpoint, primaryRecords.records);
assert.equal(verified.ok, true, verified.message);

const pairOnly = await buildCheckpoint({
  records: primaryRecords.records,
  signerSet: roster,
  signers: [signers[3], signers[4]],
  threshold,
});
assert.equal(pairOnly.ok, true, pairOnly.message);
const pairLog = createCheckpointLog();
assert.equal((await acceptCheckpoint(pairLog, pairOnly.checkpoint, primaryRecords.records)).ok, true);

const needThree = await buildCheckpoint({
  records: primaryRecords.records,
  signerSet: roster,
  signers: [signers[0], signers[1]],
  threshold: 3,
});
assert.equal(needThree.ok, false);
assert.equal(needThree.code, "AZP-THRESHOLD");

const oneSigner = await buildCheckpoint({
  records: primaryRecords.records,
  signerSet: roster,
  signers: [signers[0]],
  threshold,
});
assert.equal(oneSigner.ok, false);
assert.equal(oneSigner.code, "AZP-THRESHOLD");

const stripped = {
  ...quorum.checkpoint,
  signatures: [quorum.checkpoint.signatures[0], { ...quorum.checkpoint.signatures[0] }],
};
const reused = await verifyCheckpoint(stripped, primaryRecords.records);
assert.equal(reused.ok, false);
assert.equal(reused.code, "AZP-THRESHOLD");

const foreign = await buildCheckpoint({
  records: (await chain("f")).records,
  signerSet: roster,
  signers: [signers[0], signers[1]],
  threshold,
});
assert.equal(foreign.ok, true, foreign.message);
const copied = {
  ...quorum.checkpoint,
  signatures: [quorum.checkpoint.signatures[0], foreign.checkpoint.signatures[0]],
};
const copiedSig = await verifyCheckpoint(copied, primaryRecords.records);
assert.equal(copiedSig.ok, false);
assert.equal(copiedSig.code, "AZP-THRESHOLD");

const wrongRoot = { ...quorum.checkpoint, merkle_root: "ab".repeat(32) };
const wrong = await verifyCheckpointRecords(wrongRoot, primaryRecords.records);
assert.equal(wrong.ok, false);
assert.equal(wrong.code, "AZP-CHECKPOINT");
const setHash = await signerSetHash(wrongRoot.signer_set, wrongRoot.threshold);
wrongRoot.checkpoint_hash = await hashCheckpoint(wrongRoot, setHash);
const resignedRoot = await verifyCheckpoint(wrongRoot, primaryRecords.records);
assert.equal(resignedRoot.ok, false);
assert.equal(resignedRoot.code, "AZP-THRESHOLD");

const editedRoster = {
  ...quorum.checkpoint,
  signer_set: [...quorum.checkpoint.signer_set, outsider.public_key].sort(),
};
const edited = await verifyCheckpoint(editedRoster, primaryRecords.records);
assert.equal(edited.ok, false);
assert.equal(edited.code, "AZP-CHECKPOINT");

const log = createCheckpointLog();
const accepted = await acceptCheckpoint(log, quorum.checkpoint, primaryRecords.records);
assert.equal(accepted.ok, true, accepted.message);
assert.equal(log.tip.threshold, threshold);
assert.ok(log.tip.signer_set.length > 1);

const otherRecords = await chain("b");
const conflict = await buildCheckpoint({
  records: otherRecords.records,
  signerSet: roster,
  signers: [signers[0], signers[1]],
  threshold,
});
assert.equal(conflict.ok, true, conflict.message);
const bare = await acceptCheckpoint(log, conflict.checkpoint, otherRecords.records);
assert.equal(bare.ok, false);
assert.equal(bare.code, "AZP-ROLLBACK");
assert.equal(log.tip.checkpoint_hash, quorum.checkpoint.checkpoint_hash);
assert.equal(log.audit.some((row) => row.code === "AZP-ROLLBACK"), true);

const shortFork = await acceptCheckpoint(log, conflict.checkpoint, otherRecords.records, {
  fork: await authorize([signers[0]], conflict.checkpoint, quorum.checkpoint.checkpoint_hash, "one-signer"),
});
assert.equal(shortFork.ok, false);
assert.equal(shortFork.code, "AZP-ROLLBACK");
assert.equal(log.tip.checkpoint_hash, quorum.checkpoint.checkpoint_hash);

const outsiderFork = await acceptCheckpoint(log, conflict.checkpoint, otherRecords.records, {
  fork: await authorize([outsider], conflict.checkpoint, quorum.checkpoint.checkpoint_hash, "outsider"),
});
assert.equal(outsiderFork.ok, false);
assert.equal(outsiderFork.code, "AZP-ROLLBACK");

const soloBuilt = await buildCheckpoint({
  records: otherRecords.records,
  signerSet: [signers[0].public_key],
  signers: [signers[0]],
  threshold: 1,
});
assert.equal(soloBuilt.ok, true, soloBuilt.message);
const soloFork = await acceptCheckpoint(log, soloBuilt.checkpoint, otherRecords.records, {
  fork: await authorize([signers[0]], soloBuilt.checkpoint, quorum.checkpoint.checkpoint_hash, "solo-roster"),
});
assert.equal(soloFork.ok, false);
assert.equal(soloFork.code, "AZP-ROLLBACK");
assert.equal(log.accepted.length, 1);

const continuation = await chain("c", {
  timestamp: "2026-10-01T00:05:00.000Z",
  startSeq: quorum.checkpoint.end_seq + 1,
  previousHash: quorum.checkpoint.end_hash,
});
const soloContinue = await buildCheckpoint({
  records: continuation.records,
  signerSet: [outsider.public_key],
  signers: [outsider],
  threshold: 1,
});
assert.equal(soloContinue.ok, true, soloContinue.message);
const soloContinueAccept = await acceptCheckpoint(log, soloContinue.checkpoint, continuation.records, {
  fork: await authorize([outsider], soloContinue.checkpoint, quorum.checkpoint.checkpoint_hash, "append"),
});
assert.equal(soloContinueAccept.ok, false);
assert.equal(soloContinueAccept.code, "AZP-THRESHOLD");
assert.equal(log.tip.checkpoint_hash, quorum.checkpoint.checkpoint_hash);

const forked = await acceptCheckpoint(log, conflict.checkpoint, otherRecords.records, {
  fork: await authorize([signers[0], signers[1]], conflict.checkpoint, quorum.checkpoint.checkpoint_hash, "fixture fork"),
});
assert.equal(forked.ok, true, forked.message);
assert.equal(log.tip.checkpoint_hash, conflict.checkpoint.checkpoint_hash);
assert.equal(log.audit.some((row) => row.code === "AZP-FORK"), true);
const history = await verifyCheckpointRecords(quorum.checkpoint, primaryRecords.records);
assert.equal(history.ok, true, history.message);

const next = await chain("d", {
  timestamp: "2026-10-01T00:06:00.000Z",
  startSeq: conflict.checkpoint.end_seq + 1,
  previousHash: conflict.checkpoint.end_hash,
});
const rotatedRoster = roster.filter((key) => key !== signers[4].public_key).concat(outsider.public_key).sort();
const rotated = await buildCheckpoint({
  records: next.records,
  signerSet: rotatedRoster,
  signers: [signers[0], signers[1]],
  threshold,
});
assert.equal(rotated.ok, true, rotated.message);
const deniedRotation = await acceptCheckpoint(log, rotated.checkpoint, next.records);
assert.equal(deniedRotation.ok, false);
assert.equal(deniedRotation.code, "AZP-THRESHOLD");
const allowedRotation = await acceptCheckpoint(log, rotated.checkpoint, next.records, {
  fork: await authorize([signers[0], signers[1]], rotated.checkpoint, conflict.checkpoint.checkpoint_hash, "roster change"),
});
assert.equal(allowedRotation.ok, true, allowedRotation.message);

const goodA = exportPeerState({
  providerId: "fixture-b",
  identity: exportPublicIdentity(opened[0]),
  checkpoints: [quorum.checkpoint],
  records: primaryRecords.records,
});
const goodB = exportPeerState({
  providerId: "fixture-c",
  identity: exportPublicIdentity(opened[1]),
  checkpoints: [quorum.checkpoint],
  records: primaryRecords.records,
});
const malicious = exportPeerState({
  providerId: "byzantine",
  identity: exportPublicIdentity(opened[2]),
  checkpoints: [wrongRoot],
  records: primaryRecords.records,
});
const recovered = await recoverFromReplicas([goodA, goodB, malicious], { minReplicas: 2 });
assert.equal(recovered.ok, true, recovered.message);
assert.equal(recovered.checkpoint_hash, quorum.checkpoint.checkpoint_hash);
assert.equal(recovered.providers.includes("byzantine"), false);
assert.equal(recovered.live_multi_provider, false);

const report = [
  { id: "quorum-three-of-five", mode: "FIXTURE", ok: quorum.ok === true },
  { id: "second-pair-reaches-threshold", mode: "FIXTURE", ok: pairLog.tip.checkpoint_hash === pairOnly.checkpoint.checkpoint_hash },
  { id: "below-threshold", mode: "FIXTURE", ok: oneSigner.code === "AZP-THRESHOLD" && needThree.code === "AZP-THRESHOLD" },
  { id: "reused-signature", mode: "FIXTURE", ok: reused.code === "AZP-THRESHOLD" && copiedSig.code === "AZP-THRESHOLD" },
  { id: "wrong-root", mode: "FIXTURE", ok: wrong.code === "AZP-CHECKPOINT" && resignedRoot.code === "AZP-THRESHOLD" },
  { id: "conflicting-tip", mode: "FIXTURE", ok: bare.code === "AZP-ROLLBACK" },
  { id: "fork-needs-prior-quorum", mode: "FIXTURE", ok: shortFork.code === "AZP-ROLLBACK" && outsiderFork.code === "AZP-ROLLBACK" && forked.ok === true },
  { id: "one-signer-cannot-force-accept", mode: "FIXTURE", ok: soloFork.code === "AZP-ROLLBACK" && soloContinueAccept.code === "AZP-THRESHOLD" },
  { id: "roster-change-needs-prior-quorum", mode: "FIXTURE", ok: deniedRotation.code === "AZP-THRESHOLD" && allowedRotation.ok === true },
  { id: "byzantine-peer-excluded", mode: "FIXTURE", ok: recovered.providers.includes("byzantine") === false },
  { id: "historical-checkpoint-still-verifies", mode: "FIXTURE", ok: history.ok === true },
];
for (const row of report) {
  assert.equal(row.mode, "FIXTURE");
  assert.equal(row.ok, true, row.id);
}
assert.equal(report.some((row) => row.mode === "LIVE"), false);

console.log(JSON.stringify({ script: "verify-checkpoint-quorum", live_multi_provider: false, report }, null, 2));
console.log("verify-checkpoint-quorum: GATE D quorum ok");
