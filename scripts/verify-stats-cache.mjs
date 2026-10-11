/** STATS-CACHE-1.0: cached /v1/stats is fast, honest about age, and never caches a partial read. */
import assert from "node:assert/strict";
import { cachedUsesLocal as cachedUses, clearStatsMemo, STATS_TTL_S } from "../src/stats-cache.js";
let n = 0;
let reads = 0;
const full = () => { reads++; return { ok: true, uses_complete: true, total: 42 }; };
clearStatsMemo();
let b = await cachedUses("full", full, { now: 1_000_000, cache: null });
assert.equal(b.cache.cached, false); assert.equal(b.total, 42); assert.equal(reads, 1); n++;
b = await cachedUses("full", full, { now: 1_010_000, cache: null });
assert.equal(b.cache.cached, true); assert.equal(b.cache.age_s, 10); assert.equal(b.total, 42); assert.equal(reads, 1); n++;
b = await cachedUses("full", full, { now: 1_000_000 + STATS_TTL_S * 1000 + 1, cache: null });
assert.equal(b.cache.cached, false); assert.equal(reads, 2); n++;
// Partial reads are never cached.
clearStatsMemo(); reads = 0;
const partial = () => { reads++; return { ok: true, uses_complete: false, total: 7 }; };
await cachedUses("p", partial, { now: 1, cache: null });
b = await cachedUses("p", partial, { now: 2, cache: null });
assert.equal(b.cache.cached, false); assert.equal(reads, 2); n++;
// Cache API path: a second isolate (memo cleared) is served from the Cache API.
const store = new Map();
const cache = { match: async (k) => (store.has(k) ? new Response(store.get(k)) : undefined), put: async (k, r) => store.set(k, await r.text()) };
clearStatsMemo(); reads = 0;
await cachedUses("full", full, { now: 5_000_000, cache });
clearStatsMemo();
b = await cachedUses("full", full, { now: 5_020_000, cache });
assert.equal(b.cache.cached, true); assert.equal(reads, 1); assert.equal(b.total, 42); n++;
// Through the Worker: the second GET is served cached and fast.
clearStatsMemo();
const { default: worker } = await import("../src/index.js");
const { memoryChainWriterNamespace } = await import("../src/chainlock/writer-do.js");
const wenv = { CHAINLOCK: memoryChainWriterNamespace({}) };
const g = async () => { const t = Date.now(); const r = await worker.fetch(new Request("https://x.example/v1/stats"), wenv); return { body: await r.json(), ms: Date.now() - t }; };
const first = await g();
const second = await g();
assert.ok(first.body.cache && typeof first.body.cache.cached === "boolean"); n++;
if (first.body.uses_complete === true) { assert.equal(second.body.cache.cached, true); assert.ok(second.ms < 1000, "cached stats took " + second.ms + "ms"); }
n++;
console.log(`ok stats cache: ${n} checks`);
