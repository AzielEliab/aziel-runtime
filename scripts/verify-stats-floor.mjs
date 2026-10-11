/** STATS-FLOOR-1.0: one shared floor per key in a Durable Object; counts never drop across colos or cold starts. */
import assert from "node:assert/strict";
import { cachedUses, clearStatsMemo, statsFloorFor, STATS_TTL_S } from "../src/stats-cache.js";
import { memoryChainWriterNamespace } from "../src/chainlock/writer-do.js";
let n = 0;
const T = STATS_TTL_S * 1000;
const body = (uses, complete = true) => ({ ok: true, uses, uses_complete: complete });
function counted(env) {
  const f = statsFloorFor(env);
  const c = { calls: 0, raise: async (k, u) => { c.calls++; return f.raise(k, u); } };
  return c;
}
const env = { CHAINLOCK: memoryChainWriterNamespace({}) };
assert.equal(statsFloorFor({}), null);
assert.equal(statsFloorFor({ USES: {} }), null, "no KV floor"); n++;

// Colo A serves 100; colo B (cold isolate, empty cache) reads a lagging 90 -> still 100.
clearStatsMemo();
let fl = counted(env);
let o = await cachedUses("full", async () => body(100), { now: 0, cache: null, floor: fl });
assert.equal(o.uses, 100); assert.equal(o.cache.floor_shared, true); n++;
clearStatsMemo(); // cold start / other colo
o = await cachedUses("full", async () => body(90), { now: 10, cache: null, floor: fl });
assert.equal(o.uses, 100); assert.equal(o.uses_read, 90); assert.equal(o.cache.uses_floor_applied, true); n++;

// At most one DO call per key per 60s per isolate.
clearStatsMemo();
fl = counted(env);
for (let i = 0; i < 30; i++) await cachedUses("light", async () => body(5 + i), { now: i * 1000, cache: null, floor: fl });
assert.equal(fl.calls, 1); n++;
await cachedUses("light", async () => body(50), { now: T + 1, cache: null, floor: fl });
assert.equal(fl.calls, 2); n++;
await cachedUses("other", async () => body(1), { now: T + 2, cache: null, floor: fl });
assert.equal(fl.calls, 3, "per key"); n++;

// DO unreachable: floor_shared false, local floor still holds.
clearStatsMemo();
const down = { raise: async () => { throw new Error("DO down"); } };
await cachedUses("d", async () => body(40), { now: 0, cache: null, floor: down });
o = await cachedUses("d", async () => body(30), { now: T + 1, cache: null, floor: down });
assert.equal(o.cache.floor_shared, false); assert.equal(o.uses, 40); n++;

// Concurrent raises in the DO end at the max.
const f = statsFloorFor(env);
await Promise.all([7, 300, 12, 299, 0].map((u) => f.raise("race", u)));
assert.equal((await f.raise("race", 1)).floor, 300); n++;

// Random reads across 5 colos with cold starts: served counts never drop.
const env2 = { CHAINLOCK: memoryChainWriterNamespace({}) };
const f2 = statsFloorFor(env2);
let max = -1;
for (let i = 0; i < 80; i++) {
  if (i % 3 === 0) clearStatsMemo();
  const v = Math.floor(Math.random() * 1000);
  const r = await cachedUses("x", async () => body(v, Math.random() > 0.3), { now: i * (T + 1), cache: null, floor: f2 });
  assert.ok(r.uses >= max, `dropped ${max} -> ${r.uses}`);
  max = Math.max(max, r.uses);
}
n++;
console.log(`ok stats floor: ${n} checks`);
