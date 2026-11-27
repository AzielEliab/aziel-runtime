/**
 * AZRT-REFUSAL-LINEAGE-1.0 — Twitter backlog RIB-057 (@read__the__diff).
 * Full upstream walk from a refusal. Cycle-safe, bounded, hash-checked.
 * Not the AZRT-ANCHOR-COVERAGE-1.0 per-refusal anchor (that paper also says RIB-057).
 * Not signed. Not live. Cap-7 is not ICANN. Paid satellite stays HELD.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { canonicalize, sha256Hex, verifyChainStrict } from "../src/session-core.js";
import { append, loadChain } from "../src/chainlock/ops.js";
import { MemoryStore } from "../src/chainlock/store.js";
import { PUBLIC_MCP_TOOLS } from "../src/fraggate/codes.js";
import {
  DEFAULT_MAX_HOPS,
  LINEAGE_BACKLOG,
  LINEAGE_LIVE,
  LINEAGE_SPEC,
  walkRefusalLineage,
} from "../src/refusal-lineage.js";

let n = 0;
const ok = (cond, message) => {
  assert.equal(cond, true, message);
  n += 1;
};

async function seal(body) {
  const hash = await sha256Hex(canonicalize(body));
  return { ...body, hash };
}

ok(LINEAGE_LIVE === false && LINEAGE_SPEC === "AZRT-REFUSAL-LINEAGE-1.0" && LINEAGE_BACKLOG === "RIB-057");
ok(DEFAULT_MAX_HOPS === 32);
ok(PUBLIC_MCP_TOOLS.length === 37 && !PUBLIC_MCP_TOOLS.some((name) => /lineage|refusal-walk/i.test(name)), "tools/list is 37");

const root = await seal({
  kind: "aziel-runtime.receipt",
  event: "exec",
  seq: 1,
  parent_receipt_id: null,
  correlation_id: "same-corr",
  prev_hash: "0".repeat(64),
  payload: { n: 0 },
});
const mid = await seal({
  kind: "aziel-runtime.receipt",
  event: "exec",
  seq: 2,
  parent_receipt_id: root.hash,
  correlation_id: "same-corr",
  prev_hash: root.hash,
  payload: { n: 1 },
});
const decoy = await seal({
  kind: "aziel-runtime.receipt",
  event: "exec",
  seq: 9,
  parent_receipt_id: null,
  correlation_id: "same-corr",
  prev_hash: mid.hash,
  payload: { n: "decoy" },
});
const refusal = await seal({
  kind: "aziel-runtime.receipt",
  event: "refused",
  seq: 3,
  parent_receipt_id: mid.hash,
  correlation_id: "same-corr",
  prev_hash: decoy.hash,
  payload: { refusal: { code: "FG-X" } },
});
const corpus = [decoy, root, refusal, mid];
const before = JSON.stringify(corpus);
const walked = await walkRefusalLineage(corpus, { receipt_id: refusal.hash });
ok(JSON.stringify(corpus) === before, "the walk does not rewrite the corpus");
ok(walked.ok === true && walked.verified === true && walked.code === "LINEAGE-OK", JSON.stringify(walked));
ok(walked.live === false && walked.signed === false && walked.cap7_is_icann === false && walked.paid_sat === "HELD");
ok(walked.paid_satellite_live === false && walked.writes === false);
ok(walked.correlation_id_is_hop === false && walked.prev_hash_is_hop === false);
ok(walked.lineage.join(",") === [refusal.hash, mid.hash, root.hash].join(","), "the walk passes the single parent hop");
ok(!walked.lineage.includes(decoy.hash), "prev_hash and a shared correlation_id are not hops");
ok(walked.hops === 2 && walked.nodes.every((node) => node.hash_ok === true && node.chain_prev_is_hop === false));
ok(walked.nodes[0].code === "FG-X" && walked.nodes[0].refusal === true && walked.nodes[2].refusal === false);
ok(walked.correlation_ids.length === 1 && walked.correlation_ids[0] === "same-corr");
const again = await walkRefusalLineage(corpus.slice().reverse(), { hash: refusal.hash });
ok(JSON.stringify(again) === JSON.stringify(walked), "the same corpus walks the same way");

const bySeq = await walkRefusalLineage(corpus, { seq: 3 });
ok(bySeq.lineage[0] === refusal.hash && bySeq.verified === true, "seq lookup finds the refusal");
const ambiguous = await walkRefusalLineage(
  [refusal, { ...mid, seq: 3 }],
  { seq: 3 },
);
ok(ambiguous.code === "LINEAGE-AMBIGUOUS" && ambiguous.verified === false && ambiguous.candidates.length === 2);

const fan = await seal({
  kind: "aziel-runtime.receipt",
  event: "refused",
  seq: 4,
  parent_receipt_id: mid.hash,
  upstream: [root.hash],
  correlation_id: "same-corr",
  prev_hash: decoy.hash,
  payload: { refusal: { code: "FG-FAN" } },
});
const fanned = await walkRefusalLineage([root, mid, decoy, fan], { receipt_id: fan.hash });
ok(fanned.verified === true && fanned.lineage.join(",") === [fan.hash, mid.hash, root.hash].join(","));
ok(fanned.edges.some((edge) => edge.from === fan.hash && edge.to === root.hash && edge.via === "upstream"));
ok(fanned.nodes.filter((node) => node.id === root.hash).length === 1, "a shared upstream is visited once");

const f1 = await seal({ k: "refusal", seq: 1, refusal: { code: "FG-A" }, prev: "GENESIS" });
const f2 = await seal({ k: "refusal", seq: 2, refusal: { code: "FG-B" }, follows: { h: f1.hash, seq: 1, k: "refusal" }, prev: f1.hash });
const f3 = await seal({ k: "refusal", seq: 3, refusal: { code: "FG-C" }, follows: { h: f2.hash, seq: 2, k: "refusal" }, prev: f2.hash });
const follows = await walkRefusalLineage([f3, f1, f2], { receipt_id: f3.hash });
ok(follows.verified === true && follows.lineage.join(",") === [f3.hash, f2.hash, f1.hash].join(","), "follows walks past the single hop");
ok(follows.nodes[0].follows === f2.hash && follows.nodes[2].follows == null);

const missingParent = "ab".repeat(32);
const orphan = await seal({
  event: "refused",
  seq: 1,
  parent_receipt_id: missingParent,
  payload: { refusal: { code: "FG-ORPHAN" } },
});
const missing = await walkRefusalLineage([orphan], { receipt_id: orphan.hash });
ok(missing.verified === false && missing.code === "LINEAGE-MISSING" && missing.unresolved[0].id === missingParent);
ok(missing.nodes.length === 1 && missing.nodes[0].hash_ok === true);

const tampered = structuredClone(root);
tampered.payload = { n: 9 };
const badHash = await walkRefusalLineage([tampered, mid, refusal], { receipt_id: refusal.hash });
ok(badHash.verified === false && badHash.code === "LINEAGE-HASH");
ok(badHash.lineage.includes(root.hash) && badHash.nodes.some((node) => node.id === root.hash && node.hash_ok === false));

const loopA = await seal({
  event: "refused",
  seq: 1,
  parent_receipt_id: null,
  payload: { refusal: { code: "FG-LOOP" } },
});
const loopB = await seal({
  event: "exec",
  seq: 2,
  parent_receipt_id: loopA.hash,
  payload: { n: 1 },
});
loopA.parent_receipt_id = loopB.hash;
const cyclic = await walkRefusalLineage([loopA, loopB], { receipt_id: loopA.hash });
ok(cyclic.verified === false && cyclic.code === "LINEAGE-HASH" && cyclic.cycles.length === 1, "a tampered cycle is reported and the walk returns");
ok(new Set(cyclic.lineage).size === cyclic.lineage.length, "a cycle does not repeat a receipt");

const chain = [];
let parent = null;
for (let i = 0; i < 5; i++) {
  const row = await seal({
    event: i === 4 ? "refused" : "exec",
    seq: i + 1,
    parent_receipt_id: parent,
    payload: i === 4 ? { refusal: { code: "FG-BOUND" } } : { n: i },
  });
  chain.push(row);
  parent = row.hash;
}
const bounded = await walkRefusalLineage(chain, { receipt_id: chain[4].hash, max_hops: 2 });
ok(bounded.verified === false && bounded.code === "LINEAGE-BOUND" && bounded.bound_hit === true);
ok(bounded.nodes.length === 3 && bounded.nodes.map((node) => node.depth).join(",") === "0,1,2");
ok(bounded.truncated.length === 1 && bounded.truncated[0].id === chain[1].hash);
ok(!bounded.lineage.includes(chain[0].hash), "the walk stops at the bound");
const exact = await walkRefusalLineage(chain, { receipt_id: chain[4].hash, max_hops: 4 });
ok(exact.verified === true && exact.bound_hit === false && exact.lineage.length === 5);
for (const bad of [0, 257, 1.5, "32"]) {
  const refused = await walkRefusalLineage(chain, { receipt_id: chain[4].hash, max_hops: bad });
  ok(refused.code === "LINEAGE-BAD-BOUND" && refused.verified === false, "bad bound " + bad);
}
const noQuery = await walkRefusalLineage(chain, {});
ok(noQuery.code === "LINEAGE-NO-QUERY" && noQuery.verified === false);
const absent = await walkRefusalLineage(chain, { receipt_id: "cd".repeat(32) });
ok(absent.code === "LINEAGE-NOT-FOUND" && absent.verified === false);
const notRefusal = await walkRefusalLineage(chain, { receipt_id: chain[0].hash });
ok(notRefusal.code === "LINEAGE-NOT-REFUSAL" && notRefusal.verified === false && notRefusal.edges.length === 0);

const store = new MemoryStore();
const stampedA = await append(store, {
  c: "refusals",
  k: "refusal",
  s: "ONE",
  f: "first refusal sealed",
  refusal: { spec: "AZRT-REFUSAL-RECEIPT-1.0", code: "FG-A" },
  idempotency_key: "lin-a",
}, { internal: true });
ok(stampedA.ok === true, JSON.stringify(stampedA));
const stampedB = await append(store, {
  c: "refusals",
  k: "follow",
  s: "note",
  f: "row between the two refusals",
  idempotency_key: "lin-b",
}, { internal: true });
ok(stampedB.ok === true, JSON.stringify(stampedB));
const stampedC = await append(store, {
  c: "refusals",
  k: "refusal",
  s: "TWO",
  f: "second refusal sealed",
  refusal: { spec: "AZRT-REFUSAL-RECEIPT-1.0", code: "FG-C" },
  follows: { spec: "AZRT-GOAL-LINK-1.0", h: stampedA.stamp.stamp_sha256, seq: 1, k: "refusal" },
  idempotency_key: "lin-c",
}, { internal: true });
ok(stampedC.ok === true, JSON.stringify(stampedC));
const stored = await loadChain(store, "refusals");
const fromChain = await walkRefusalLineage(stored, { receipt_id: stampedC.stamp.stamp_sha256 });
ok(fromChain.verified === true && fromChain.code === "LINEAGE-OK", JSON.stringify({ code: fromChain.code, nodes: fromChain.nodes }));
ok(fromChain.lineage.join(",") === [stampedC.stamp.stamp_sha256, stampedA.stamp.stamp_sha256].join(","));
ok(!fromChain.lineage.includes(stampedB.stamp.stamp_sha256), "chain order is not the dependency chain");
ok(fromChain.nodes.every((node) => node.hash_ok === true && node.hash_scheme === "chainlock"));
const fromChainAgain = await walkRefusalLineage(stored, { h: stampedC.stamp.stamp_sha256 });
ok(JSON.stringify(fromChainAgain) === JSON.stringify(fromChain), "a stored chain walks the same way twice");

const fixture = JSON.parse(readFileSync(new URL("../fixtures/session-receipt-chain.json", import.meta.url), "utf8"));
const strict = await verifyChainStrict(fixture.receipts);
ok(strict.ok === true, "old session receipts still verify");
const old = await walkRefusalLineage(fixture.receipts, { receipt_id: fixture.receipts[0].hash });
ok(old.code === "LINEAGE-NOT-REFUSAL" && old.verified === false);

const paper = readFileSync(new URL("../docs/designs/AZRT-REFUSAL-LINEAGE-1.0.md", import.meta.url), "utf8");
ok(paper.includes("Not live") && paper.includes("not signed") && paper.includes("Cap-7 is not ICANN") && paper.includes("HELD"));
ok(paper.includes("@read__the__diff") && paper.includes("AZRT-ANCHOR-COVERAGE-1.0"));

console.log(`verify-refusal-lineage: ${n} checks ok`);
