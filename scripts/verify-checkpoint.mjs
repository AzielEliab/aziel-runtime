/**
 * GATE D — canonical hashes, chain, rollback, Merkle, threshold.
 * ChainLock rows are checkpointed and left intact.
 * Author: Aziel Eliab only.
 */
import assert from "node:assert/strict";
import { append, loadChain, verify as verifyChain } from "../src/chainlock/ops.js";
import { MemoryStore } from "../src/chainlock/store.js";
import { canonicalHash } from "../src/security/canonical.js";
import { exportPublicIdentity } from "../src/security/keystore.js";
import { buildCheckpoint, buildRecordChain, recordsFromChainlock } from "../src/checkpoints/checkpoint.js";
import { merkleProof, verifyMerkleInclusion } from "../src/checkpoints/merkle.js";
import { acceptCheckpoint, createCheckpointLog, forkStatement } from "../src/checkpoints/verify.js";
import { nodeKeystore, signerFor } from "./azp-fixture.mjs";

assert.equal(await canonicalHash({ b: 1, a: 2 }), await canonicalHash({ a: 2, b: 1 }));

const alice = await nodeKeystore();
const bob = await nodeKeystore();
const cara = await nodeKeystore();
const signers = [signerFor(alice), signerFor(bob)];
const roster = [exportPublicIdentity(alice).node_public_key, exportPublicIdentity(bob).node_public_key, exportPublicIdentity(cara).node_public_key].sort();

const built = await buildRecordChain({
  chainId: "session",
  entries: [
    { record_type: "provenance", timestamp: "2026-10-01T00:00:00.000Z", payload: { payload_sha256: "a".repeat(64), policy: "admit" } },
    { record_type: "provenance", timestamp: "2026-10-01T00:01:00.000Z", payload: { payload_sha256: "b".repeat(64), policy: "admit" } },
    { record_type: "provenance", timestamp: "2026-10-01T00:02:00.000Z", payload: { payload_sha256: "c".repeat(64), policy: "admit" } },
  ],
});
assert.equal(built.ok, true, built.message);
assert.equal(built.records[1].previous_hash, built.records[0].record_hash);
assert.equal(built.records[2].sequence, 2);

const checkpoint = await buildCheckpoint({
  networkId: "aziel-runtime",
  chainId: "session",
  records: built.records,
  signerSet: roster,
  signers,
  threshold: 2,
  now: Date.parse("2026-10-01T00:03:00.000Z"),
});
assert.equal(checkpoint.ok, true, checkpoint.message);
const proof = await merkleProof(built.records.map((row) => row.record_hash), 1);
assert.equal(proof.ok, true, proof.message);
assert.equal(proof.root, checkpoint.checkpoint.merkle_root);
const included = await verifyMerkleInclusion(checkpoint.checkpoint.merkle_root, built.records[1].record_hash, 1, proof.proof);
assert.equal(included.ok, true, included.message);
const badProof = proof.proof.map((step, index) => (index === 0 ? { ...step, hash: "0".repeat(64) } : step));
if (badProof.length) {
  const missed = await verifyMerkleInclusion(checkpoint.checkpoint.merkle_root, built.records[1].record_hash, 1, badProof);
  assert.equal(missed.ok, false);
}

const oneSigner = await buildCheckpoint({
  records: built.records,
  signerSet: roster,
  signers: [signers[0]],
  threshold: 2,
});
assert.equal(oneSigner.ok, false);
assert.equal(oneSigner.code, "AZP-THRESHOLD");

const log = createCheckpointLog();
const accepted = await acceptCheckpoint(log, checkpoint.checkpoint, built.records);
assert.equal(accepted.ok, true, accepted.message);

const shorter = await buildRecordChain({
  chainId: "session",
  entries: [{ record_type: "provenance", timestamp: "2026-10-01T00:00:00.000Z", payload: { payload_sha256: "d".repeat(64), policy: "admit" } }],
});
const rollbackCp = await buildCheckpoint({
  records: shorter.records,
  signerSet: roster,
  signers,
  threshold: 2,
});
assert.equal(rollbackCp.ok, true, rollbackCp.message);
const rolled = await acceptCheckpoint(log, rollbackCp.checkpoint, shorter.records);
assert.equal(rolled.ok, false);
assert.equal(rolled.code, "AZP-ROLLBACK");
assert.equal(log.audit.some((row) => row.code === "AZP-ROLLBACK"), true);

const statement = await forkStatement({
  network_id: rollbackCp.checkpoint.network_id,
  chain_id: rollbackCp.checkpoint.chain_id,
  from_hash: checkpoint.checkpoint.checkpoint_hash,
  to_hash: rollbackCp.checkpoint.checkpoint_hash,
  reason: "fixture fork",
});
const authorizations = [];
for (const signer of signers) {
  authorizations.push({ public_key: signer.public_key, sig: await signer.sign(statement) });
}
const forked = await acceptCheckpoint(log, rollbackCp.checkpoint, shorter.records, {
  fork: { reason: "fixture fork", authorizations },
});
assert.equal(forked.ok, true, forked.message);
assert.equal(log.audit.some((row) => row.code === "AZP-FORK"), true);

const store = new MemoryStore();
const fact = "chainlock-fact-not-for-checkpoint";
const stamped = await append(store, { c: "session", s: "prov", f: fact });
assert.equal(stamped.ok, true, stamped.refuse || stamped.message);
const rows = await loadChain(store, "session");
const layered = await recordsFromChainlock(rows, { chainId: "session" });
assert.equal(layered.ok, true, layered.message);
assert.equal(JSON.stringify(layered.records).includes(fact), false);
const chainOk = await verifyChain(store, { c: "session" });
assert.equal(chainOk.ok, true);
const layeredCp = await buildCheckpoint({
  records: layered.records,
  signerSet: [signers[0].public_key],
  signers: [signers[0]],
  threshold: 1,
});
assert.equal(layeredCp.ok, true, layeredCp.message);
assert.equal(JSON.stringify(layeredCp.checkpoint).includes(fact), false);
const still = await verifyChain(store, { c: "session" });
assert.equal(still.ok, true);

const swapped = {
  ...layeredCp.checkpoint,
  signer_set: [signers[1].public_key],
  threshold: 1,
};
const { verifyCheckpointRecords } = await import("../src/checkpoints/verify.js");
const rosterSwap = await verifyCheckpointRecords(swapped, layered.records);
assert.equal(rosterSwap.ok, false);

console.log("verify-checkpoint: GATE D ok");
