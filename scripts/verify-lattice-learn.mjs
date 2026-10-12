import assert from "node:assert/strict";
import "../src/index.js";
import { latticeLearn, cursorOf } from "../src/lattice-learn.js";

const { runMemoryOp, MEMORY_CANONICAL_OPS } = await import("../src/memory.js");
const H = (c) => c.repeat(64);
const mem = new Map(); const kv = { get: async (k) => mem.get(k) ?? null, put: async (k, v) => { mem.set(k, v); } };
const obsLog = []; const observe = async (_e, p) => { obsLog.push(p); return { ok: true }; };
let rows = [{ seq: 1, lattice: null }, { seq: 2, lattice: { primary: H("a"), secondary: H("b") } }, { seq: 3, lattice: { primary: H("c"), secondary: H("d") } }];
const page = async (_e, _c, from, n) => { const r = rows.filter((x) => x.seq >= from).slice(0, n); return r.length ? { ok: true, rows: r, head_seq: rows.length } : { ok: false, code: "LEDGER-NO-ROWS" }; };
const env = {};
assert.equal((await latticeLearn(env, { chain: "nope" }, { kv, observe, page })).code, "LATTICE-LEARN-BAD-CHAIN");
assert.equal((await latticeLearn({}, { chain: "acts" }, { observe, page })).code, "LATTICE-LEARN-KV-UNBOUND");
const d = await latticeLearn(env, { chain: "acts", dry_run: true }, { kv, observe, page });
assert.equal(d.written, false); assert.equal(obsLog.length, 0);
const a = await latticeLearn(env, { chain: "acts" }, { kv, observe, page });
assert.equal(a.code, "LATTICE-LEARN-OK"); assert.equal(a.cursor_to, 3); assert.equal(a.new_lattice_rows, 2);
assert.ok(obsLog[0].fact.length <= 160); assert.equal(obsLog[0].subject, "lattice:acts");
assert.equal(cursorOf(mem.get("lattice-learn:cursor:acts")), 3);
assert.equal((await latticeLearn(env, { chain: "acts" }, { kv, observe, page })).code, "LATTICE-LEARN-NOTHING-NEW");
rows.push({ seq: 4, lattice: { primary: H("e"), secondary: H("f") } });
const b = await latticeLearn(env, { chain: "acts" }, { kv, observe, page });
assert.equal(b.cursor_from, 3); assert.equal(b.cursor_to, 4);
const broken = async () => ({ ok: false, code: "LEDGER-PAGE-BROKEN", breaks: [{ seq: 5 }] });
const before = obsLog.length;
assert.equal((await latticeLearn(env, { chain: "acts" }, { kv, observe, page: broken })).code, "LATTICE-LEARN-PAGE-BROKEN");
assert.equal(obsLog.length, before);
assert.equal((await latticeLearn(env, { chain: "acts" }, { kv, observe, page: async () => ({ ok: true, rows: [], head_seq: 2 }) })).code, "LATTICE-LEARN-BEHIND-CURSOR");
assert.equal(cursorOf(mem.get("lattice-learn:cursor:acts")), 4);
assert.equal((await latticeLearn(env, { chain: "acts" }, { kv, observe, page: async () => ({ ok: false, code: "LEDGER-STORE-UNBOUND" }) })).code, "LATTICE-LEARN-STORE-UNBOUND");
assert.ok(MEMORY_CANONICAL_OPS.includes("lattice-learn"));
const viaDoor = await runMemoryOp("lattice-learn", { chain: "acts" }, {});
assert.equal(viaDoor.ok, false); assert.equal(viaDoor.written, false);
console.log("verify-lattice-learn: ok");
const { memoryRuntimeKvNamespace } = await import("../src/durable-kv.js");
const doEnv = { RUNTIME_KV: memoryRuntimeKvNamespace() };
const viaDo = await latticeLearn(doEnv, { chain: "acts" }, { observe, page });
assert.equal(viaDo.code, "LATTICE-LEARN-OK");
assert.equal((await latticeLearn(doEnv, { chain: "acts" }, { observe, page })).code, "LATTICE-LEARN-NOTHING-NEW");
console.log("verify-lattice-learn: durable cursor ok");
{
  const m = new Map(); const k = { get: async (x) => m.get(x) ?? null, put: async (x, v) => { m.set(x, v); } };
  const legacy = Array.from({ length: 150 }, (_, i) => ({ seq: i + 1, lattice: i === 149 ? { primary: "a".repeat(64), secondary: "b".repeat(64) } : null }));
  const pg = async (_e, _c, from, n) => { const r = legacy.filter((x) => x.seq >= from).slice(0, n); return r.length ? { ok: true, rows: r, head_seq: 150 } : { ok: false, code: "LEDGER-NO-ROWS" }; };
  assert.equal((await latticeLearn({}, { chain: "acts" }, { kv: k, observe, page: pg })).code, "LATTICE-LEARN-LEGACY-ONLY");
  const r2 = await latticeLearn({}, { chain: "acts" }, { kv: k, observe, page: pg });
  assert.equal(r2.code, "LATTICE-LEARN-OK"); assert.equal(r2.cursor_to, 150);
  console.log("verify-lattice-learn: legacy prefix no stall ok");
}
{
  const { scheduledLatticeLearn } = await import("../src/lattice-learn.js");
  const seen = [];
  const r = await scheduledLatticeLearn({}, 0, { run: async (c) => { seen.push(c); return { code: "LATTICE-LEARN-OK" }; } });
  assert.equal(r.length, 3); assert.equal(new Set(seen).size, 3);
  const r2 = await scheduledLatticeLearn({}, 60000, { run: async (c) => { throw new Error("x"); } });
  assert.ok(r2.every((x) => x.code === "LATTICE-LEARN-THREW"));
  console.log("verify-lattice-learn: scheduled ok");
}
