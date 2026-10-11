/** STATS-FLOOR wording: the response note and docs say the qualified claim; no unqualified "never drops". */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { cachedUses, clearStatsMemo, FLOOR_NOTE, statsFloorFor } from "../src/stats-cache.js";
import { memoryChainWriterNamespace } from "../src/chainlock/writer-do.js";
const W = "across colos the count may lag by up to 10s; within an isolate it never drops.";
let n = 0;
assert.equal(FLOOR_NOTE, W); n++;
clearStatsMemo();
const env = { CHAINLOCK: memoryChainWriterNamespace({}) };
const floor = statsFloorFor(env);
const o = await cachedUses("w", async () => ({ ok: true, uses: 3, uses_complete: true }), { now: 1, cache: null, floor });
assert.equal(o.cache.floor_note, W); n++;
const r = await cachedUses("w", async () => ({ ok: true, uses: 3, uses_complete: true }), { now: 2, cache: null, floor });
assert.equal(r.cache.floor_reused, true); assert.equal(r.cache.floor_note, W); n++;
const { default: worker } = await import("../src/index.js");
clearStatsMemo();
const res = await worker.fetch(new Request("https://x.example/v1/stats"), { CHAINLOCK: memoryChainWriterNamespace({}) }, { waitUntil() {} });
const body = await res.json();
assert.equal(res.status, 200); assert.equal(body.cache.floor_note, W); assert.match(body.cache.rule, /may lag by up to 10s; within an isolate it never drops/); n++;
// No unqualified "never drops / never go backwards" in the stats source or docs.
for (const f of ["src/stats-cache.js", "docs/STATS.md"]) {
  const t = readFileSync(new URL("../" + f, import.meta.url), "utf8").replace(/\s+/g, " ");
  for (const m of t.matchAll(/never (drops?|goes? backwards)/gi)) {
    const ctx = t.slice(Math.max(0, m.index - 80), m.index + 40);
    assert.match(ctx, /within an isolate|in this isolate|per key in this isolate/, f + ": unqualified: " + ctx);
  }
  n++;
}
assert.ok(readFileSync(new URL("../docs/STATS.md", import.meta.url), "utf8").includes("Across colos the count may lag by up to 10s; within an isolate it never drops.")); n++;
console.log(`ok stats wording: ${n} checks`);
