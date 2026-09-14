/**
 * SPLIT-WIRES-1.0: pull-only payloads, hash-absolute ingest, equivocation
 * ends that peer, two clocks never share a socket.
 * Keeps die-with-pull tunnel/Phoenix public-hostname truth.
 * Author: Aziel Eliab only.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { MemoryStore } from "../src/chainlock/store.js";
import { append } from "../src/chainlock/ops.js";
import { seal, verify as verifyLockset } from "../src/lockset.js";
import { MESH_LIMITATION, resetMeshStore, runMeshOp } from "../src/mesh.js";
import {
  DWELL_S,
  SPLIT_WIRES,
  SPLIT_WIRES_LAW,
  SPLIT_WIRES_SHORT,
  TICK_MS_MAX,
  TICK_MS_MIN,
  clocksShareSocket,
  heartbeatLossMeaning,
  ingestProof,
  judgeEquivocation,
  mayEmitTip,
  neighborPhoenix,
  partitionRejoin,
  tickAccepts,
} from "../src/split-wires.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel) => readFileSync(join(root, rel), "utf8");

const docs = [
  "docs/NODE_MESH.md",
  "docs/designs/NODE-OPS-1.0.md",
  "docs/designs/QNM-WP-1.0.md",
  "docs/designs/LS-WP-0.1.md",
  "docs/designs/README.md",
  "src/mesh.js",
  "src/lockset.js",
  "src/split-wires.js",
].map((rel) => [rel, read(rel)]);

for (const [name, text] of docs) {
  assert.match(text, /presence \+ tip hash/i, name);
  assert.doesNotMatch(text, /Phoenix brings/i, name);
  assert.doesNotMatch(text, /mesh auto-reattaches public hostname/i, name);
}

const nodeMesh = read("docs/NODE_MESH.md");
assert.match(nodeMesh, /Split the wires/i);
assert.match(nodeMesh, /777s is dwell after a valid cite/);
assert.match(nodeMesh, /die with the pull/i);
assert.match(nodeMesh, /never share a socket|stay strangers/);

assert.equal(SPLIT_WIRES, "SPLIT-WIRES-1.0");
assert.equal(DWELL_S, 777);
assert.equal(TICK_MS_MIN, 500);
assert.equal(TICK_MS_MAX, 1000);
assert.equal(clocksShareSocket(), false);
assert.match(SPLIT_WIRES_SHORT, /delayed epidemic/);
assert.match(SPLIT_WIRES_LAW.die_with_pull, /die with the pull/);
assert.match(MESH_LIMITATION, /Split the wires/);
assert.match(MESH_LIMITATION, /die with the pull/);

const prev = "aa".repeat(32);
const tipA = "bb".repeat(32);
const tipB = "cc".repeat(32);
const lock = "dd".repeat(32);

assert.equal(tickAccepts({ node_id: "godlock-uk" }).ok, true);
assert.equal(tickAccepts({ node_id: "godlock-uk", tip_hash: tipA, prev }).ok, true);
const bodyTick = tickAccepts({ node_id: "godlock-uk", body: "also here’s the file" });
assert.equal(bodyTick.ok, false);
assert.equal(bodyTick.code, "MESH-NO-BYTES");
assert.ok(bodyTick.refused_keys.includes("body"));
assert.equal(tickAccepts({ tip_hash: "short" }).ok, false);

const good = ingestProof({
  held_prev: prev,
  cited_prev: prev,
  tip: tipA,
  held_lockset: lock,
  lockset: lock,
  verified: true,
  valid_cite: true,
});
assert.equal(good.ok, true);
assert.equal(good.fail_closed, true);
assert.equal(good.merge, false);

const dwell = ingestProof({
  held_prev: prev,
  cited_prev: prev,
  tip: tipA,
  held_lockset: lock,
  lockset: lock,
  verified: true,
  elapsed_s: 777,
  valid_cite: false,
});
assert.equal(dwell.ok, false);
assert.ok(dwell.breaks.some((b) => b.reason === "dwell-not-take"));

const desync = ingestProof({
  held_prev: prev,
  cited_prev: prev,
  tip: tipA,
  held_lockset: lock,
  lockset: lock,
  verified: true,
  valid_cite: true,
  clock_desync: true,
});
assert.equal(desync.ok, false);
assert.ok(desync.breaks.some((b) => b.reason === "clock-desync-not-yes"));

const ambig = ingestProof({
  held_prev: prev,
  cited_prev: prev,
  tip: tipA,
  held_lockset: lock,
  lockset: lock,
  verified: true,
  valid_cite: true,
  ambiguous: true,
});
assert.equal(ambig.ok, false);
assert.equal(ambig.isolate, true);
assert.equal(ambig.merge, false);

const quorum = ingestProof({
  held_prev: prev,
  cited_prev: prev,
  tip: tipA,
  held_lockset: lock,
  lockset: lock,
  verified: true,
  valid_cite: true,
  majority_vote: true,
});
assert.equal(quorum.ok, false);
assert.ok(quorum.breaks.some((b) => b.reason === "majority-not-truth"));

const eq = judgeEquivocation({ node_id: "peer-1", prev, tips: [tipA, tipB] });
assert.equal(eq.equivocated, true);
assert.equal(eq.presence, "isolated");
assert.equal(eq.vote_to_reconcile, false);
assert.equal(eq.majority_is_truth, false);

assert.equal(mayEmitTip({ verified: false }).emit, false);
assert.equal(mayEmitTip({ verified: true }).emit, true);
assert.equal(neighborPhoenix({ neighbor_phoenixed: true }).phoenix, false);
assert.equal(partitionRejoin({ auto_splice: true }).ok, false);
assert.equal(partitionRejoin({ cite: true, operator: true }).ok, true);
assert.equal(heartbeatLossMeaning({ missed: true }).poison, false);
assert.equal(heartbeatLossMeaning({ missed: true }).apply_last_packet, false);

resetMeshStore();
const env = {};
const joined = await runMeshOp("join", { product: "godlock", node_id: "split-wires-peer" }, env);
assert.equal(joined.ok, true);

const cleanBeat = await runMeshOp("heartbeat", { node_id: "split-wires-peer" }, env);
assert.equal(cleanBeat.ok, true);
assert.equal(cleanBeat.heartbeat_loss_isolates, false);
assert.equal(cleanBeat.apply_last_packet, false);

const bodyBeat = await runMeshOp(
  "heartbeat",
  { node_id: "split-wires-peer", body: "also here’s the file", diff: "nope" },
  env,
);
assert.equal(bodyBeat.ok, false);
assert.equal(bodyBeat.code, "MESH-NO-BYTES");

const firstTip = await runMeshOp(
  "heartbeat",
  { node_id: "split-wires-peer", tip_hash: tipA, prev },
  env,
);
assert.equal(firstTip.ok, true);
assert.equal(firstTip.node.tip_hash, tipA);

const fork = await runMeshOp(
  "heartbeat",
  { node_id: "split-wires-peer", tip_hash: tipB, prev },
  env,
);
assert.equal(fork.ok, false);
assert.equal(fork.code, "MESH-EQUIVOCATION");
assert.equal(fork.node.presence, "isolated");

const vault = new MemoryStore();
await append(vault, { c: "genesis", fact: "split-wires lockset genesis" });
const sealed = await seal(vault);
const proofFail = await verifyLockset(vault, {
  clock_desync: true,
  held_prev: prev,
  cited_prev: prev,
  tip: tipA,
  held_lockset: sealed.lockset_sha256,
  lockset: sealed.lockset_sha256,
  verified: true,
  valid_cite: true,
});
assert.equal(proofFail.ok, false);
assert.equal(proofFail.timer_is_not_yes, true);
assert.equal(proofFail.majority_is_truth, false);
assert.ok(proofFail.breaks.some((b) => b.reason === "clock-desync-not-yes"));

resetMeshStore();
console.log(`ok ${SPLIT_WIRES}: pull-only tick, hash-absolute ingest, equivocation isolates, clocks stay strangers`);
