/**
 * GATE E — disaster fixtures: partition, rollback, malicious peer.
 * Live destruction of a provider is SKIP. Author: Aziel Eliab only.
 */
import assert from "node:assert/strict";
import { exportPublicIdentity } from "../src/security/keystore.js";
import { buildCheckpoint, buildRecordChain } from "../src/checkpoints/checkpoint.js";
import { acceptCheckpoint, createCheckpointLog } from "../src/checkpoints/verify.js";
import { exportPeerState } from "../src/replication/peer-state.js";
import { recoverFromReplicas } from "../src/replication/recovery.js";
import { nodeKeystore, signerFor } from "./azp-fixture.mjs";

const opened = await nodeKeystore();
const signer = signerFor(opened);
const pub = exportPublicIdentity(opened);

async function chain(label) {
  const built = await buildRecordChain({
    chainId: "session",
    entries: [{ record_type: "provenance", timestamp: "2026-10-01T00:00:00.000Z", payload: { payload_sha256: label.repeat(64), policy: "admit" } }],
  });
  const checkpoint = await buildCheckpoint({
    records: built.records,
    signerSet: [signer.public_key],
    signers: [signer],
    threshold: 1,
  });
  return { built, checkpoint };
}

const primary = await chain("a");
const other = await chain("b");
assert.equal(primary.checkpoint.ok, true, primary.checkpoint.message);
assert.equal(other.checkpoint.ok, true, other.checkpoint.message);

const log = createCheckpointLog();
assert.equal((await acceptCheckpoint(log, primary.checkpoint.checkpoint, primary.built.records)).ok, true);
const rollback = await acceptCheckpoint(log, other.checkpoint.checkpoint, other.built.records);
assert.equal(rollback.ok, false);
assert.equal(rollback.code, "AZP-ROLLBACK");

const left = exportPeerState({
  providerId: "partition-left",
  identity: pub,
  checkpoints: [primary.checkpoint.checkpoint],
  records: primary.built.records,
});
const leftCopy = exportPeerState({
  providerId: "partition-left-copy",
  identity: pub,
  checkpoints: [primary.checkpoint.checkpoint],
  records: primary.built.records,
});
const rightOnly = exportPeerState({
  providerId: "partition-right",
  identity: pub,
  checkpoints: [],
  records: [],
});
const rightRecover = await recoverFromReplicas([left, leftCopy], { minReplicas: 2 });
assert.equal(rightRecover.ok, true, rightRecover.message);
assert.equal(rightOnly.ok, true);
assert.equal(rightOnly.state.checkpoints.length, 0);

const malicious = exportPeerState({
  providerId: "malicious-peer",
  identity: pub,
  checkpoints: [{ ...other.checkpoint.checkpoint, signatures: [{ public_key: signer.public_key, sig: "aa" }] }],
  records: other.built.records,
});
const kept = await recoverFromReplicas(
  [
    exportPeerState({ providerId: "b", identity: pub, checkpoints: [primary.checkpoint.checkpoint], records: primary.built.records }),
    exportPeerState({ providerId: "c", identity: pub, checkpoints: [primary.checkpoint.checkpoint], records: primary.built.records }),
    malicious,
  ],
  { minReplicas: 2 },
);
assert.equal(kept.ok, true, kept.message);
assert.equal(kept.checkpoint_hash, primary.checkpoint.checkpoint.checkpoint_hash);
assert.equal(kept.providers.includes("malicious-peer"), false);

const report = [
  { id: "checkpoint-rollback", mode: "FIXTURE", ok: rollback.ok === false },
  { id: "partition-network", mode: "FIXTURE", ok: rightRecover.ok === true, note: "Uncheckpointed local records are not network state." },
  { id: "malicious-peer", mode: "FIXTURE", ok: kept.providers.includes("malicious-peer") === false },
  { id: "recover-independent-checkpoints", mode: "FIXTURE", ok: kept.ok === true },
  { id: "destroy-live-provider", mode: "SKIP", ok: false, note: "Live destruction of provider A (Cloudflare Worker), B (VPS), C, or D is operator work. This script does not destroy a live host. Fixture kill-primary stays in verify-provider-loss.mjs." },
];
for (const row of report) {
  assert.ok(row.mode === "FIXTURE" || row.mode === "SKIP", row.id);
  if (row.mode === "FIXTURE") assert.equal(row.ok, true, row.id);
  if (row.mode === "SKIP") assert.equal(row.ok, false, row.id);
}
assert.equal(report.some((row) => row.mode === "LIVE"), false);

console.log(JSON.stringify({ script: "verify-disaster-recovery", live_multi_provider: false, report }, null, 2));
console.log("verify-disaster-recovery: GATE E fixture/SKIP ok");
