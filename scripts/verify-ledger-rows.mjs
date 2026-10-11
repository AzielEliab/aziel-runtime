/** LEDGER-ROWS-1.0: page a chain from genesis, every page linked, any break fails closed. */
import assert from "node:assert/strict";
import * as A from "../src/anchor.js";
import { append } from "../src/chainlock/ops.js";
import { memoryChainWriterNamespace } from "../src/chainlock/writer-do.js";
import { storeFor } from "../src/chainlock/store.js";
let n = 0;
const shared = new Map();
const env = { CHAINLOCK: memoryChainWriterNamespace({}, shared) };
const ds = storeFor(env);
for (let i = 0; i < 7; i++) await append(ds, { c: "acts", s: "s" + i, f: "row " + i });
// Walk from genesis in pages of 3.
let page = await A.pageRows(env, "acts", 1, 3, { storeFor });
assert.equal(page.ok, true, JSON.stringify(page.breaks)); n++;
assert.ok(["GENESIS", "0".repeat(64)].includes(page.first_prev)); n++;
const seen = [...page.rows];
while (page.next) {
  const expect = page.next.expect_prev;
  page = await A.pageRows(env, "acts", page.next.from, 3, { storeFor });
  assert.equal(page.ok, true);
  assert.equal(page.first_prev, expect, "page does not link to the one before");
  seen.push(...page.rows);
}
n++;
assert.equal(seen.length, 7); assert.deepEqual(seen.map((r) => r.seq), [1, 2, 3, 4, 5, 6, 7]); n++;
const meta = await ds.chainMeta("acts");
assert.equal(seen[6].h, meta.tip); n++;
// Limit clamps to 100.
const big = await A.pageRows(env, "acts", 1, 5000, { storeFor });
assert.equal(big.count, 7); n++;
// Tamper one row inside the writer: the page fails closed.
const mem = shared.get("acts");
let tampered = false;
if (mem && mem.has("e:3")) {
  const raw = mem.get("e:3");
  const r = typeof raw === "string" ? JSON.parse(raw) : structuredClone(raw);
  r.fact = "rewritten";
  mem.set("e:3", typeof raw === "string" ? JSON.stringify(r) : r);
  tampered = true;
}
if (tampered) {
  const bad = await A.pageRows(env, "acts", 1, 10, { storeFor });
  assert.equal(bad.ok, false); assert.equal(bad.code, "LEDGER-PAGE-BROKEN"); assert.ok(bad.breaks.some((b) => b.seq === 3));
}
assert.equal(tampered, true, "tamper hook missing");
n++;
// No store: fails closed.
assert.equal((await A.pageRows({}, "acts", 1, 10, { storeFor })).ok, false); n++;
// Worker route.
const { default: worker } = await import("../src/index.js");
const res = await worker.fetch(new Request("https://x.example/v1/anchor/rows?c=nope"), {});
assert.equal(res.status, 400); n++;
console.log(`ok ledger rows: ${n} checks (tamper ${tampered ? "checked" : "skipped: memory writer has no storage handle"})`);
