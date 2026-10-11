/** USES-SNAPSHOT-1.0: /v1/stats reads total + log + snapshot (no scan); maps built off the request path, resumable. */
import assert from "node:assert/strict";
import { buildUsesSnapshot, readUses, USES_SNAPSHOT_KEY, USES_SNAPSHOT_PROGRESS_KEY } from "../src/uses.js";
import { clearStatsMemo } from "../src/stats-cache.js";
import { memoryChainWriterNamespace } from "../src/chainlock/writer-do.js";
let n = 0;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
function slowKv(nKeys) {
  const m = new Map([["total", String(nKeys * 5)], ["log", "[]"]]);
  for (let i = 0; i < nKeys; i++) m.set(`host|h${i}`, "2"), m.set(`path|/p${i}`, "3");
  m.set("day|2026-10-11", String(nKeys)); m.set("method|GET", String(nKeys)); m.set("op|x", "1");
  const kv = {
    m, lists: 0, gets: 0,
    async get(k) { kv.gets++; await sleep(2); return m.has(k) ? m.get(k) : null; },
    async put(k, v) { m.set(k, v); },
    async delete(k) { m.delete(k); },
    async list({ prefix, limit = 1000, cursor }) {
      kv.lists++; await sleep(30);
      const all = [...m.keys()].filter((k) => k.startsWith(prefix)).sort();
      const from = cursor ? Number(cursor) : 0;
      const keys = all.slice(from, from + limit).map((name) => ({ name }));
      const done = from + limit >= all.length;
      return { keys, list_complete: done, cursor: done ? undefined : String(from + limit) };
    },
  };
  return kv;
}
const kv = slowKv(3000);
const env = { USES: kv };
// Before any snapshot: fast, total live, maps labelled unavailable.
let t = Date.now();
let r = await readUses(env, { maps: "snapshot" });
assert.ok(Date.now() - t < 1000, "read took " + (Date.now() - t) + "ms");
assert.equal(kv.lists, 0, "no scan on the request path");
assert.equal(r.uses, 15000); assert.equal(r.uses_complete, true); assert.equal(r.maps_complete, false); assert.match(r.maps_note, /not available yet or are stale/); n++;
// Resumable build: a tiny budget leaves progress; later runs finish and publish.
let runs = 0, out;
do { out = await buildUsesSnapshot(env, { budget_ms: 40 }); runs++; } while (!out.published && runs < 500);
assert.equal(out.published, true); assert.ok(runs > 1, "took several resumable runs"); assert.equal(kv.m.has(USES_SNAPSHOT_PROGRESS_KEY), false); n++;
const snap = JSON.parse(kv.m.get(USES_SNAPSHOT_KEY));
assert.equal(Object.keys(snap.by_host).length, 3000); assert.equal(snap.by_path["/p17"], 3); assert.equal(snap.complete, true); n++;
// After the snapshot: still fast, maps present and labelled with their time.
kv.lists = 0; t = Date.now();
r = await readUses(env, { maps: "snapshot" });
assert.ok(Date.now() - t < 1000); assert.equal(kv.lists, 0);
assert.equal(r.maps_complete, true); assert.equal(r.by_host.h5, 2); assert.equal(r.maps_snapshot_at, snap.snapshot_at); assert.equal(r.uses, 15000); n++;
// Stale snapshot (> 30 min) is labelled, not presented as current.
kv.m.set(USES_SNAPSHOT_KEY, JSON.stringify({ ...snap, snapshot_at: new Date(Date.now() - 31 * 60_000).toISOString() }));
r = await readUses(env, { maps: "snapshot" });
assert.equal(r.maps_complete, false); assert.match(r.maps_note, /stale/); n++;
// Through the Worker: /v1/stats well under 1s and cacheable (uses_complete true).
clearStatsMemo();
const { default: worker } = await import("../src/index.js");
const wenv = { USES: kv, CHAINLOCK: memoryChainWriterNamespace({}) };
t = Date.now();
const res = await worker.fetch(new Request("https://x.example/v1/stats"), wenv, { waitUntil() {} });
const ms = Date.now() - t;
const body = await res.json();
assert.equal(res.status, 200); assert.ok(ms < 1000, "/v1/stats took " + ms + "ms"); assert.equal(body.uses_complete, true); assert.equal(body.maps_source, "USES-SNAPSHOT-1.0"); n++;
// The cron schedules the snapshot build.
const waits = [];
await worker.scheduled({ cron: "1-59/2 * * * *" }, { USES: slowKv(5) }, { waitUntil: (p) => waits.push(p) });
assert.ok(waits.length >= 1); await Promise.all(waits); n++;
console.log(`ok uses snapshot: ${n} checks`);
