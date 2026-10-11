/** STATS-FLOOR-1.0: one shared floor per key in a Durable Object; counts never drop across colos or cold starts. */
import assert from "node:assert/strict";
import { cachedUses, clearStatsMemo, statsFloorFor, STATS_TTL_S, STATS_DO_CAP_PER_MIN } from "../src/stats-cache.js";
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

// Every request makes exactly one DO call (no stale window), and serves max(local, DO floor).
clearStatsMemo();
fl = counted(env);
for (let i = 0; i < 10; i++) await cachedUses("light", async () => body(5 + i), { now: i * 1000, cache: null, floor: fl });
assert.equal(fl.calls, 10); n++;
// No window: colo A serves 500 at t=0; colo B (warm, within 60s of its own last read) serves >= 500 at t=1s.
clearStatsMemo();
const envW = { CHAINLOCK: memoryChainWriterNamespace({}) };
const fW = statsFloorFor(envW);
await cachedUses("w", async () => body(100), { now: 0, cache: null, floor: fW }); // colo B warm at 100
await fW.raise("w", 500); // colo A served 500
o = await cachedUses("w", async () => body(100), { now: 1000, cache: null, floor: fW });
assert.equal(o.uses, 500); assert.equal(o.uses_read, 100); n++;
// Breakdown is labelled raw.
assert.match(o.breakdown, /raw, may lag total/); n++;
// No CHAINLOCK binding: refuse.
assert.equal((await cachedUses("u", async () => body(1), { now: 0, cache: null, floor: null })).code, "STATS-FLOOR-UNAVAILABLE"); n++;
{
  const { default: worker } = await import("../src/index.js");
  const r = await worker.fetch(new Request("https://x.example/v1/uses"), {}, { waitUntil() {} });
  assert.equal(r.status, 503); assert.ok(Number(r.headers.get("retry-after")) > 0); n++;
}

// DO unreachable: fail closed (no count served), even for a brand-new isolate.
clearStatsMemo();
const down = { raise: async () => { throw new Error("DO down"); } };
o = await cachedUses("d", async () => body(40), { now: 0, cache: null, floor: down });
assert.equal(o.ok, false); assert.equal(o.code, "STATS-FLOOR-UNAVAILABLE"); assert.equal(o.uses, undefined); assert.ok(o.retry_after_s > 0 && o.retry_after_s <= 30); n++;
const bad = { raise: async () => ({ ok: false }) };
assert.equal((await cachedUses("d2", async () => body(1), { now: 0, cache: null, floor: bad })).code, "STATS-FLOOR-UNAVAILABLE"); n++;
// HTTP: 503 + Retry-After when the CHAINLOCK binding throws.
{
  clearStatsMemo();
  const { default: worker } = await import("../src/index.js");
  const brokenNs = { idFromName: (x) => x, get: () => ({ fetch: async () => { throw new Error("DO down"); } }) };
  const res = await worker.fetch(new Request("https://x.example/v1/stats"), { CHAINLOCK: brokenNs }, { waitUntil() {} });
  assert.equal(res.status, 503); assert.ok(Number(res.headers.get("retry-after")) > 0);
  const b = await res.json(); assert.equal(b.code, "STATS-FLOOR-UNAVAILABLE"); n++;
}

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
// (1) Batching: 25 concurrent requests in one isolate share one DO call; each gets >= the floor.
{
  clearStatsMemo();
  const envB = { CHAINLOCK: memoryChainWriterNamespace({}) };
  const fb = statsFloorFor(envB);
  await fb.raise("b", 700); // another colo already served 700
  const c = { calls: 0, raise: async (k, u) => { c.calls++; return fb.raise(k, u); } };
  const outs = await Promise.all(Array.from({ length: 25 }, (_, i) => cachedUses("b", async () => body(100 + i), { now: 5, cache: null, floor: c })));
  assert.equal(c.calls, 1, "one DO call for the batch");
  for (const o of outs) { assert.equal(o.ok, true); assert.ok(o.uses >= 700); }
  assert.equal(outs[0].cache.floor_batch, 25); n++;
  // A request arriving after the call was sent does not join it: it gets its own call and sees a later raise.
  clearStatsMemo();
  const slow = { calls: 0, async raise(k, u) { slow.calls++; await new Promise((r) => setTimeout(r, 20)); return fb.raise(k, u); } };
  const first = cachedUses("b", async () => body(1), { now: 10, cache: null, floor: slow });
  await new Promise((r) => setTimeout(r, 5)); // first call is now in flight
  await fb.raise("b", 900); // a colo serves 900 after the first call was sent
  const late = await cachedUses("b", async () => body(1), { now: 11, cache: null, floor: slow });
  await first;
  assert.equal(slow.calls, 2); assert.ok(late.uses >= 900, "late request sees the floor at its serve time"); n++;
}
// (2) Cap: at most STATS_DO_CAP_PER_MIN DO calls per isolate per minute, then 503 + Retry-After.
{
  clearStatsMemo();
  const envC = { CHAINLOCK: memoryChainWriterNamespace({}) };
  const fc = statsFloorFor(envC);
  const c = { calls: 0, raise: async (k, u) => { c.calls++; return fc.raise(k, u); } };
  const base = 10_000_000;
  for (let i = 0; i < STATS_DO_CAP_PER_MIN; i++) assert.equal((await cachedUses("c", async () => body(i), { now: base + i * 100, cache: null, floor: c })).ok, true);
  const capped = await cachedUses("c", async () => body(99), { now: base + 30_000, cache: null, floor: c });
  assert.equal(capped.ok, false); assert.equal(capped.code, "STATS-FLOOR-RATE-CAPPED"); assert.equal(capped.uses, undefined);
  assert.ok(capped.retry_after_s >= 1 && capped.retry_after_s <= 60); assert.equal(c.calls, STATS_DO_CAP_PER_MIN); n++;
  const next = await cachedUses("c", async () => body(99), { now: base + 60_001, cache: null, floor: c });
  assert.equal(next.ok, true, "new window"); n++;
  // HTTP: capped -> 503 with Retry-After.
  clearStatsMemo();
  const { default: worker } = await import("../src/index.js");
  const envH = { CHAINLOCK: memoryChainWriterNamespace({}) };
  let last;
  for (let i = 0; i <= STATS_DO_CAP_PER_MIN; i++) last = await worker.fetch(new Request("https://x.example/v1/stats"), envH, { waitUntil() {} });
  assert.equal(last.status, 503); assert.ok(Number(last.headers.get("retry-after")) >= 1);
  assert.equal((await last.json()).code, "STATS-FLOOR-RATE-CAPPED"); n++;
}
console.log(`ok stats floor: ${n} checks`);
