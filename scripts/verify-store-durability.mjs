// AZRT-STORE-CHECKPOINT-1.0 + AZRT-STORE-SHARD-1.0: checkpoints, tamper refusals, relocation, routed reads. Author: Aziel Eliab.
import assert from "node:assert/strict";
import { memoryRepo, openBatch, walkStep, verifyRowRun } from "../src/engines/4dmap/aznews-live.js";
import { tetherKey, signTetherPacket } from "../src/azos-tether.js";
import { makeCheckpoints, checkCheckpoints, checkpointsAfter, relocateStep, routedRepo, segPut, SEG_ROWS, SEG_MARGIN, CP_EVERY, cpHashOf } from "../src/store-durability.js";
import { buildNewsPacket } from "../src/aznews-tether.js";

const key = await tetherKey({ TETHER_SIGNING_SEED: "11".repeat(32) });
const head = memoryRepo();
const N = SEG_ROWS + SEG_MARGIN + 500;
for (let done = 0; done < N; ) {
  const b = await openBatch(head);
  for (let i = 0; i < 1500 && done < N; i++, done++) await b.add("pull_receipt", { kind: "t", i: done });
  await b.commit();
}
assert.equal(await head.count(), N);
for (let i = 0; i < 40; i++) { const w = await walkStep(head, { maxRows: 600 }); if (w.verified_through === N) break; }
assert.equal((await head.metaGet("walk")).verified_through, N);
let made = 0;
for (let i = 0; i < 5; i++) made += (await makeCheckpoints(head, { chain: "aznews", key })).made;
assert.equal(made, Math.floor(N / CP_EVERY));
const cps = await checkpointsAfter(head, 0, { max: 50 });
const okc = await checkCheckpoints(cps, { publicKey: key.public_key, rowAt: (s) => head.rowGet(s) });
assert.ok(okc.ok, okc.reason);

// Tamper tests: each must be refused.
const forged = structuredClone(cps[2]); forged.tips.primary = "0".repeat(64);
assert.equal((await checkCheckpoints([cps[0], cps[1], forged], { publicKey: key.public_key })).reason, "checkpoint signature does not verify");
const other = await tetherKey({ TETHER_SIGNING_SEED: "22".repeat(32) });
const resigned = await signTetherPacket(other, { ...cps[0], public_key: other.public_key, sig: undefined });
assert.equal((await checkCheckpoints([resigned], { publicKey: key.public_key })).reason, "checkpoint key is not the pinned key");
// Validly signed but unlinked (skips n=2), and validly signed with wrong tips.
const body = { ...cps[2] }; delete body.sig; body.prev_hash = cps[0].cp_hash; body.cp_hash = await cpHashOf(body);
const unlinked = await signTetherPacket(key, body);
assert.match((await checkCheckpoints([cps[0], unlinked], { publicKey: key.public_key })).reason, /n out of order|does not link/);
const wt = { ...cps[0], tips: { primary: "a".repeat(64), secondary: "b".repeat(64) } }; delete wt.sig; wt.cp_hash = await cpHashOf(wt);
const wrongTips = await signTetherPacket(key, wt);
assert.equal((await checkCheckpoints([wrongTips], { publicKey: key.public_key, rowAt: (s) => head.rowGet(s) })).reason, "row at to_seq does not carry the signed tips");

// Relocation into a segment object (memory), then routed reads.
const segs = new Map();
const call = async (k, op, p) => {
  if (!segs.has(k)) segs.set(k, memoryRepo());
  const seg = segs.get(k);
  if (op === "seg_put") return segPut(seg, p, { verifyRows: verifyRowRun });
  if (op === "seg_rows") return { ok: true, rows: await seg.rowRange(p.from, p.to) };
};
// A tampered row in transit is refused by the segment.
const bad = structuredClone(await head.rowRange(1, 3)); bad[1].doc.i = 999;
assert.equal((await segPut(memoryRepo(), { rows: bad, anchor: { primary: "0".repeat(64), secondary: "0".repeat(64) }, k: 1 }, { verifyRows: verifyRowRun })).ok, false);
const routed = routedRepo(head, call);
let r;
for (let i = 0; i < 20; i++) { r = await relocateStep(routed, { call, dropRange: (a, b) => head.dropRelocated(a, b) }); if (r.state === "sealed") break; assert.ok(r.ok, JSON.stringify(r)); }
assert.equal(r.state, "sealed");
assert.equal(await head.headRows(), N - SEG_ROWS, "head keeps only unsealed rows");
assert.equal(await routed.count(), N, "total row count unchanged");
const a = await routed.rowGet(5); assert.equal(a.seq, 5); assert.equal(a.doc.i, 4);
const span = await routed.rowRange(SEG_ROWS - 2, SEG_ROWS + 2); assert.deepEqual(span.map((x) => x.seq), [SEG_ROWS - 2, SEG_ROWS - 1, SEG_ROWS, SEG_ROWS + 1, SEG_ROWS + 2]);
// A fresh copy can still be built from genesis through the routed repo.
const built = await buildNewsPacket({ key, repo: routed, afterSeq: 0, expect: null, chain: "aznews", cpAfter: 0, maxRows: 150 });
assert.equal(built.packet.rows[0].seq, 1);
const fullAgain = await verifyRowRun(await routed.rowRange(1, 2000), { primary: "0".repeat(64), secondary: "0".repeat(64) });
assert.ok(fullAgain.ok, "genesis walk through relocated rows");
assert.ok((await checkCheckpoints(await checkpointsAfter(routed, 0, { max: 50 }), { publicKey: key.public_key, rowAt: (s) => routed.rowGet(s) })).ok);
console.log("verify-store-durability: ok", { rows: N, checkpoints: made, head_rows: await head.headRows() });
