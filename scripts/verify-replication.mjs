/**
 * GATE E — peer state and recovery from fixture replicas.
 * Author: Aziel Eliab only.
 */
import assert from "node:assert/strict";
import { exportPublicIdentity } from "../src/security/keystore.js";
import { buildCheckpoint, buildRecordChain } from "../src/checkpoints/checkpoint.js";
import { createCheckpointLog } from "../src/checkpoints/verify.js";
import { directoryWithoutDomain, exportPeerState, inspectPeerState } from "../src/replication/peer-state.js";
import { recoverFromReplicas } from "../src/replication/recovery.js";
import { syncPeerState } from "../src/replication/sync.js";
import { nodeKeystore, signerFor } from "./azp-fixture.mjs";

const opened = await nodeKeystore();
const signer = signerFor(opened);
const pub = exportPublicIdentity(opened);
const built = await buildRecordChain({
  chainId: "session",
  entries: [
    { record_type: "provenance", timestamp: "2026-10-01T00:00:00.000Z", payload: { payload_sha256: "e".repeat(64), policy: "admit" } },
    { record_type: "provenance", timestamp: "2026-10-01T00:01:00.000Z", payload: { payload_sha256: "f".repeat(64), policy: "admit" } },
  ],
});
const checkpoint = await buildCheckpoint({
  records: built.records,
  signerSet: [signer.public_key],
  signers: [signer],
  threshold: 1,
});
assert.equal(checkpoint.ok, true, checkpoint.message);

function replica(providerId) {
  return exportPeerState({
    providerId,
    networkId: "aziel-runtime",
    identity: pub,
    peers: [
      { id: "b", address: "https://vps.example/relay" },
      { id: "c", address: "https://other.example/relay" },
    ],
    checkpoints: [checkpoint.checkpoint],
    records: built.records,
  });
}

const a = replica("provider-a");
const b = replica("provider-b");
const c = replica("provider-c");
const d = replica("node-d");
const e = replica("archive-e");
for (const item of [a, b, c, d, e]) assert.equal(item.ok, true, item.message);

const secretState = exportPeerState({
  providerId: "bad",
  checkpoints: [checkpoint.checkpoint],
  records: built.records,
});
secretState.state.seed = "no";
assert.equal(inspectPeerState(secretState.state).ok, false);

const lostPrimary = await recoverFromReplicas([b, c, d, e], { minReplicas: 2 });
assert.equal(lostPrimary.ok, true, lostPrimary.message);
assert.equal(lostPrimary.providers.includes("provider-a"), false);
assert.equal(lostPrimary.records.length, built.records.length);
assert.equal(lostPrimary.live_multi_provider, false);
assert.equal(lostPrimary.mode, "FIXTURE");

const alone = await recoverFromReplicas([b], { minReplicas: 2 });
assert.equal(alone.ok, false);
assert.equal(alone.code, "AZP-RECOVER-SHORT");

const malicious = exportPeerState({
  providerId: "malicious",
  identity: pub,
  checkpoints: [{ ...checkpoint.checkpoint, checkpoint_hash: "0".repeat(64), signatures: [] }],
  records: built.records,
});
const filtered = await recoverFromReplicas([b, c, malicious], { minReplicas: 2 });
assert.equal(filtered.ok, true, filtered.message);
assert.equal(filtered.providers.includes("malicious"), false);

const withoutDns = directoryWithoutDomain(a.state.peers, "vps.example");
assert.equal(withoutDns.length, 1);
assert.equal(withoutDns[0].address.includes("vps.example"), false);
const still = await recoverFromReplicas([b, c], { minReplicas: 2 });
assert.equal(still.ok, true, still.message);

const log = createCheckpointLog();
const synced = await syncPeerState(log, b);
assert.equal(synced.ok, true, synced.message);
const refused = await syncPeerState(log, { state: secretState.state });
assert.equal(refused.ok, false);

console.log("verify-replication: GATE E fixture ok");
