/** STATS-FLOOR-1.0: one shared floor per key in a Durable Object; counts never drop across colos or cold starts. */
import assert from "node:assert/strict";
import { cachedUses, clearStatsMemo, statsFloorFor, statsFloorStorageKey, STATS_TTL_S, STATS_DO_CAP_PER_MIN } from "../src/stats-cache.js";
import { memoryChainWriterNamespace } from "../src/chainlock/writer-do.js";
import { USES_TOTAL_SOURCE } from "../src/uses.js";
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

// A request with a new KV candidate makes one DO call (reuse only covers an unchanged candidate < 10s).
clearStatsMemo();
fl = counted(env);
for (let i = 0; i < 10; i++) await cachedUses("light", async () => body(5 + i), { now: i * 61_000, cache: null, floor: fl });
assert.equal(fl.calls, 10); n++;
// Bounded window: colo A serves 500; colo B (warm, same candidate) reflects it once its 10s reuse ends.
clearStatsMemo();
const envW = { CHAINLOCK: memoryChainWriterNamespace({}) };
const fW = statsFloorFor(envW);
await cachedUses("w", async () => body(100), { now: 0, cache: null, floor: fW }); // colo B warm at 100
await fW.raise("w", 500); // colo A served 500
o = await cachedUses("w", async () => body(100), { now: 10_001, cache: null, floor: fW }); // past the 10s reuse window
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
  for (let i = 0; i < STATS_DO_CAP_PER_MIN; i++) assert.equal((await cachedUses("c" + i, async () => body(i), { now: base + i * 100, cache: null, floor: c })).ok, true);
  const capped = await cachedUses("cx", async () => body(99), { now: base + 30_000, cache: null, floor: c });
  assert.equal(capped.ok, false); assert.equal(capped.code, "STATS-FLOOR-RATE-CAPPED"); assert.equal(capped.uses, undefined);
  assert.ok(capped.retry_after_s >= 1 && capped.retry_after_s <= 60); assert.equal(c.calls, STATS_DO_CAP_PER_MIN); n++;
  const next = await cachedUses("cy", async () => body(99), { now: base + 60_001, cache: null, floor: c });
  assert.equal(next.ok, true, "new window"); n++;
  // HTTP: capped -> 503 with Retry-After (cap filled by this isolate's other key first).
  clearStatsMemo();
  const { default: worker } = await import("../src/index.js");
  const envH = { CHAINLOCK: memoryChainWriterNamespace({}) };
  const fh = statsFloorFor(envH);
  for (let i = 0; i < STATS_DO_CAP_PER_MIN; i++) await cachedUses("h" + i, async () => body(i + 1), { cache: null, floor: fh });
  const last = await worker.fetch(new Request("https://x.example/v1/stats"), envH, { waitUntil() {} });
  assert.equal(last.status, 503); assert.ok(Number(last.headers.get("retry-after")) >= 1);
  assert.equal((await last.json()).code, "STATS-FLOOR-RATE-CAPPED"); n++;
}
// Cap is 6 per isolate per minute.
assert.equal(STATS_DO_CAP_PER_MIN, 6); n++;
// (2) Reuse: same candidate, last floor read < 10s old -> no DO call, serve the last floor.
{
  clearStatsMemo();
  const envR = { CHAINLOCK: memoryChainWriterNamespace({}) };
  const fr = statsFloorFor(envR);
  const c = { calls: 0, raise: async (k, u) => { c.calls++; return fr.raise(k, u); } };
  const t0 = 50_000_000;
  const a = await cachedUses("r", async () => body(40), { now: t0, cache: null, floor: c });
  assert.equal(c.calls, 1); assert.equal(a.cache.floor_reused, false);
  const b2 = await cachedUses("r", async () => body(40), { now: t0 + 9_999, cache: null, floor: c });
  assert.equal(c.calls, 1, "reused"); assert.equal(b2.cache.floor_reused, true); assert.equal(b2.uses, 40); n++;
  // Changed candidate -> DO call even inside 10s.
  await cachedUses("r", async () => body(41), { now: t0 + 10_500, cache: null, floor: c });
  assert.equal(c.calls, 2); n++;
  // Same candidate but last read >= 10s old -> DO call.
  await cachedUses("r", async () => body(41), { now: t0 + 20_500, cache: null, floor: c });
  assert.equal(c.calls, 3); n++;
  // Reuse never serves below this isolate's last floor (another colo's earlier 500 is kept).
  await fr.raise("r", 500);
  const d = await cachedUses("r", async () => body(41), { now: t0 + 31_000, cache: null, floor: c });
  const e = await cachedUses("r", async () => body(41), { now: t0 + 35_000, cache: null, floor: c });
  assert.equal(d.uses, 500); assert.equal(e.uses, 500); assert.equal(e.cache.floor_reused, true); n++;
  // Reuse does not count against the cap: 50 same-candidate hits inside 10s cost one call.
  clearStatsMemo();
  const c2 = { calls: 0, raise: async (k, u) => { c2.calls++; return fr.raise(k, u); } };
  for (let i = 0; i < 50; i++) assert.equal((await cachedUses("q", async () => body(7), { now: t0 + i * 100, cache: null, floor: c2 })).ok, true);
  assert.equal(c2.calls, 1); n++;
}

// Reconciled legacy+durable total is not pinned by an inflated pre-reconciliation floor.
// Live shape: uses_legacy 62051 + uses_durable 5888 = 67939, old floor 112111.
{
  clearStatsMemo();
  const envU = { CHAINLOCK: memoryChainWriterNamespace({}) };
  const fu = statsFloorFor(envU);
  await fu.raise("full", 112111);
  await fu.raise("light", 112111);
  const c = { calls: 0, raise: async (k, u) => { c.calls++; return fu.raise(k, u); } };
  const reconciled = (uses) => ({
    ok: true,
    uses,
    uses_complete: true,
    uses_legacy: 62051,
    uses_durable: uses - 62051,
    uses_total_source: USES_TOTAL_SOURCE,
  });
  const base = reconciled(67939);
  const series = statsFloorStorageKey("full", base);
  assert.equal(series, "full:" + USES_TOTAL_SOURCE);
  assert.notEqual(series, "full");
  const t0 = 90_000_000;
  const unmasked = await cachedUses("full", async () => base, { now: t0, cache: null, floor: c });
  assert.equal(unmasked.uses, 67939);
  assert.equal(unmasked.cache.uses_floor_applied, false);
  assert.equal(unmasked.uses_read, undefined);
  assert.equal(unmasked.cache.floor_epoch, USES_TOTAL_SOURCE);
  assert.equal(c.calls, 1);
  assert.equal((await fu.raise("full", 0)).floor, 112111, "old floor key is left in place and not applied");
  assert.equal((await fu.raise(series, 0)).floor, 67939);
  const reused = await cachedUses("full", async () => base, { now: t0 + 1_000, cache: null, floor: c });
  assert.equal(c.calls, 1, "reuse stays on the reconciled series");
  assert.equal(reused.uses, 67939);
  assert.equal(reused.cache.floor_reused, true);
  assert.equal(reused.cache.floor_epoch, USES_TOTAL_SOURCE);
  clearStatsMemo();
  const climbed = await cachedUses("full", async () => reconciled(67940), { now: t0 + 70_000, cache: null, floor: c });
  assert.equal(climbed.uses, 67940);
  assert.equal(climbed.cache.uses_floor_applied, false);
  assert.equal((await fu.raise(series, 0)).floor, 67940);
  const reusedClimb = await cachedUses("full", async () => reconciled(67940), { now: t0 + 71_000, cache: null, floor: c });
  assert.equal(reusedClimb.uses, 67940);
  assert.equal(reusedClimb.cache.floor_reused, true);
  clearStatsMemo();
  const lag = await cachedUses("full", async () => reconciled(67930), { now: t0 + 140_000, cache: null, floor: c });
  assert.equal(lag.uses, 67940, "colo lag holds the reconciled baseline, not 112111");
  assert.equal(lag.uses_read, 67930);
  assert.equal(lag.cache.uses_floor_applied, true);
  assert.equal(lag.cache.floor_epoch, USES_TOTAL_SOURCE);
  clearStatsMemo();
  const plain = await cachedUses("full", async () => body(90), { now: t0 + 150_000, cache: null, floor: c });
  assert.equal(plain.uses, 112111, "a non-reconciled read still uses the old floor");
  assert.equal(plain.uses_read, 90);
  assert.equal(plain.cache.uses_floor_applied, true);
  assert.equal(plain.cache.floor_epoch, undefined);
  clearStatsMemo();
  const light = await cachedUses("light", async () => base, { now: t0 + 160_000, cache: null, floor: c });
  assert.equal(light.uses, 67939);
  assert.equal((await fu.raise("light", 0)).floor, 112111);
  assert.equal((await fu.raise(statsFloorStorageKey("light", base), 0)).floor, 67939);
  n++;
}
console.log(`ok stats floor: ${n} checks`);
