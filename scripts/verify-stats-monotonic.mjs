/** STATS-MONOTONIC-1.0: /v1/stats counts never go backwards. */
import assert from "node:assert/strict";
import { cachedUses, clearStatsMemo, STATS_TTL_S } from "../src/stats-cache.js";
let n = 0;
const body = (uses, complete = true) => ({ ok: true, uses, uses_complete: complete });
function fakeCache() {
  const m = new Map();
  return {
    m,
    async match(k) { return m.has(k) ? new Response(m.get(k)) : undefined; },
    async put(k, r) { m.set(k, await r.text()); },
  };
}
const T = STATS_TTL_S * 1000;

// 1. A lagging fresh read (KV eventual consistency) never lowers the served count.
clearStatsMemo();
let out = await cachedUses("k", async () => body(10), { now: 0, cache: null });
assert.equal(out.uses, 10); n++;
out = await cachedUses("k", async () => body(7), { now: T + 1, cache: null });
assert.equal(out.uses, 10); assert.equal(out.cache.held_high_water, true); n++;
out = await cachedUses("k", async () => body(12), { now: 2 * T + 2, cache: null });
assert.equal(out.uses, 12); assert.equal(out.cache.held_high_water, false); n++;

// 2. A partial read with a lower count is not served over the high-water mark.
out = await cachedUses("k", async () => body(3, false), { now: 3 * T + 3, cache: null });
assert.equal(out.uses, 12); n++;

// 3. Newest of local and shared: a newer shared entry from another isolate wins.
clearStatsMemo();
const c = fakeCache();
await cachedUses("s", async () => body(20), { now: 0, cache: c });
c.m.set("https://stats-cache.internal/s", JSON.stringify({ at: 1000, body: body(25) }));
out = await cachedUses("s", async () => assert.fail("no read while fresh"), { now: 2000, cache: c });
assert.equal(out.uses, 25); n++;

// 4. A newer but lower shared entry does not lower the count this isolate already served.
c.m.set("https://stats-cache.internal/s", JSON.stringify({ at: 3000, body: body(21) }));
out = await cachedUses("s", async () => assert.fail("no read while fresh"), { now: 4000, cache: c });
assert.equal(out.uses, 25); assert.equal(out.cache.monotonic, true); n++;

// 5. Sequence of 50 random reads: served counts are non-decreasing.
clearStatsMemo();
let last = -1;
for (let i = 0; i < 50; i++) {
  const v = Math.floor(Math.random() * 100);
  const o = await cachedUses("r", async () => body(v, Math.random() > 0.3), { now: i * (T + 1), cache: fakeCache() });
  assert.ok(o.uses >= last || last === -1, `went backwards ${last} -> ${o.uses}`);
  last = Math.max(last, o.uses);
}
n++;
console.log(`ok stats monotonic: ${n} checks`);
