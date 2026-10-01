/**
 * GATE E — provider loss.
 * Live multi-provider, DNS, and Plane B Framagit are SKIP.
 * The executed rows are fixtures. Author: Aziel Eliab only.
 */
import assert from "node:assert/strict";
import { exportPublicIdentity } from "../src/security/keystore.js";
import { buildCheckpoint, buildRecordChain } from "../src/checkpoints/checkpoint.js";
import { directoryWithoutDomain, exportPeerState } from "../src/replication/peer-state.js";
import { recoverFromReplicas } from "../src/replication/recovery.js";
import { createRelay, relayAccept, relayForward } from "../src/transport/relay.js";
import { openEnvelope, sealEnvelope } from "../src/transport/envelope-v2.js";
import { nodeKeystore, pair, signerFor } from "./azp-fixture.mjs";

const opened = await nodeKeystore();
const signer = signerFor(opened);
const pub = exportPublicIdentity(opened);
const built = await buildRecordChain({
  chainId: "session",
  entries: [{ record_type: "provenance", timestamp: "2026-10-01T00:00:00.000Z", payload: { payload_sha256: "1".repeat(64), policy: "admit" } }],
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
    identity: pub,
    peers: [{ id: "keep", address: "http://10.0.0.8:8781/v1/fed-mesh/direct" }],
    checkpoints: [checkpoint.checkpoint],
    records: built.records,
  });
}

const providers = ["provider-a", "provider-b", "provider-c", "node-d", "archive-e"].map(replica);
const killed = providers.filter((item) => item.state.provider_id !== "provider-a");
const recovered = await recoverFromReplicas(killed, { minReplicas: 2 });
assert.equal(recovered.ok, true, recovered.message);

const dnsLeft = directoryWithoutDomain(
  [{ id: "hub", address: "https://aziel-runtime.vibelock.workers.dev/mcp" }, ...providers[1].state.peers],
  "vibelock.workers.dev",
);
assert.equal(dnsLeft.some((peer) => peer.address.includes("vibelock.workers.dev")), false);
assert.equal(dnsLeft.length, 1);

const { aliceKs, bobKs, alice, bob, now } = await pair();
const sealed = await sealEnvelope({
  keystore: aliceKs,
  session: alice.session,
  recipientEncPublicKey: bob.session.ephemeral_enc_public_key,
  payload: "relay-loss",
  now,
  ttlMs: 20_000,
});
const relayA = createRelay({ id: "a" });
const relayB = createRelay({ id: "b" });
assert.equal(relayAccept(relayA, sealed.envelope, now).ok, true);
assert.equal(relayAccept(relayB, sealed.envelope, now).ok, true);
relayA.box.clear();
const viaB = await openEnvelope({
  keystore: bobKs,
  session: bob.session,
  envelope: relayForward(relayB, sealed.envelope.message_id).envelope,
  expectSigningKey: alice.session.ephemeral_public_key,
  now,
});
assert.equal(viaB.ok, true, viaB.message);

const nodeLost = providers.filter((item) => item.state.provider_id !== "node-d");
const withoutNode = await recoverFromReplicas(nodeLost, { minReplicas: 2 });
assert.equal(withoutNode.ok, true, withoutNode.message);

const report = [
  { id: "kill-primary-provider", mode: "FIXTURE", ok: recovered.ok, note: "In-memory provider A removed. The production Cloudflare Worker is already deployed. This script does not contact it and does not destroy it." },
  { id: "remove-primary-dns", mode: "FIXTURE", ok: true, note: "Directory drop is a string filter. No DNS record was changed." },
  { id: "remove-github-repository", mode: "FIXTURE", ok: true, note: "Recovery reads replica objects in memory. It does not fetch GitHub." },
  { id: "lose-one-relay", mode: "FIXTURE", ok: viaB.ok, note: "Two local relays. Clearing A leaves B." },
  { id: "lose-one-node", mode: "FIXTURE", ok: withoutNode.ok, note: "In-memory node D removed. This is not a self-hosted machine." },
  { id: "live-vps", mode: "SKIP", ok: false, note: "OPERATOR node B. No independent VPS is provisioned. SKIP until that host exists." },
  { id: "node-c-separate-provider", mode: "SKIP", ok: false, note: "OPERATOR node C. A separate cloud provider is not provisioned." },
  { id: "node-d-self-hosted", mode: "SKIP", ok: false, note: "OPERATOR node D. No self-hosted node is provisioned. The lose-one-node row is a fixture." },
  { id: "archive-e-cold", mode: "SLOT", ok: false, note: "Node E offline copy. Codeberg and archive.org tip-pack hash PASS is an operator record, not a fetch in this script. Plane B stays SLOT until a real Framagit URL. The URL is null. Not LIVE." },
  { id: "plane-b-framagit", mode: "SKIP", ok: false, note: "Plane B Framagit URL is null. Do not invent a Framagit, VPS, or Zenodo URL. Not LIVE." },
  { id: "live-multi-provider", mode: "SKIP", ok: false, note: "Independent cloud providers are not provisioned here. live_multi_provider stays false." },
];
for (const row of report) {
  assert.ok(row.mode === "FIXTURE" || row.mode === "SKIP" || row.mode === "SLOT", row.id);
  if (row.mode === "FIXTURE") assert.equal(row.ok, true, row.id);
  if (row.mode === "SKIP" || row.mode === "SLOT") assert.equal(row.ok, false, row.id);
}
assert.equal(report.some((row) => row.mode === "LIVE"), false);

console.log(JSON.stringify({ script: "verify-provider-loss", live_multi_provider: false, report }, null, 2));
console.log("verify-provider-loss: GATE E fixture/SKIP ok");
