// TRI-STRICT-1.0 (lattice plan step 10): the test namespace no longer masks the append race.
import assert from "node:assert/strict";
import { memoryChainWriterNamespace, triStrict, ChainWriter } from "../src/chainlock/writer-do.js";
import { append, loadChain } from "../src/chainlock/ops.js";
import { storeFor } from "../src/chainlock/store.js";

let checks = 0;
const ok = (c, m) => { assert.ok(c, m); checks++; };
ok(triStrict({}) === true || process.env.TRI_STRICT === "0", "TRI_STRICT default on");
ok(triStrict({ TRI_STRICT: "0" }) === false, "TRI_STRICT=0 opts out");

async function burst(ns, n = 48) {
  const env = { CHAINLOCK: ns };
  const res = await Promise.all(Array.from({ length: n }, (_, i) => append(env, { c: "learn", subject: "strict", fact: `strict fact ${i}` })));
  const rows = await loadChain(storeFor(env), "learn");
  const seqs = rows.map((r, i) => i);
  return { acked: res.filter((r) => r.ok).length, rows: rows.length, uniqStamps: new Set(rows.map((r) => r.stamp_sha256)).size, uniqPrev: new Set(rows.map((r) => r.prev)).size, seqs };
}

// With the per-writer queue (#324), a strict namespace keeps every receipt.
const s = await burst(memoryChainWriterNamespace({}));
ok(s.acked === 48 && s.rows === 48 && s.uniqStamps === 48 && s.uniqPrev === 48, `strict + queue: ${s.rows}/48 stored, 0 dup, 0 forks`);

// Without the queue, the strict namespace must make the race visible (it used to be hidden).
const orig = ChainWriter.prototype.append;
ChainWriter.prototype.append = function (body) { return this._appendOne(body); };
try {
  const r = await burst(memoryChainWriterNamespace({}));
  ok(r.rows < 48 || r.uniqPrev < r.rows, `race visible without queue: ${r.rows}/48 stored`);
  const legacy = await burst(memoryChainWriterNamespace({ TRI_STRICT: "0" }));
  ok(legacy.rows === 48, "TRI_STRICT=0 serialized namespace hides it (why the default changed)");
} finally {
  ChainWriter.prototype.append = orig;
}
console.log(`verify-tri-strict: ${checks} checks pass`);
