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
// Stale snapshot (> 3 h) is labelled, not presented as current.
kv.m.set(USES_SNAPSHOT_KEY, JSON.stringify({ ...snap, snapshot_at: new Date(Date.now() - (3 * 60 + 1) * 60_000).toISOString() }));
r = await readUses(env, { maps: "snapshot" });
assert.equal(r.maps_complete, false); assert.match(r.maps_note, /stale/); assert.match(r.maps_note, /does not scan/); assert.equal(r.maps_refresh, "due"); assert.equal(r.ring_ts, null); n++;
// Through the Worker: /v1/stats well under 1s and cacheable (uses_complete true).
clearStatsMemo();
const { default: worker } = await import("../src/index.js");
const wenv = { USES: kv, CHAINLOCK: memoryChainWriterNamespace({}) };
t = Date.now();
const res = await worker.fetch(new Request("https://x.example/v1/stats"), wenv, { waitUntil() {} });
const ms = Date.now() - t;
const body = await res.json();
assert.equal(res.status, 200); assert.ok(ms < 1000, "/v1/stats took " + ms + "ms"); assert.equal(body.uses_complete, true); assert.equal(body.maps_source, "USES-SNAPSHOT-1.0"); n++;
// Option A: N concurrent /v1/stats while maps_refresh is due do not start a USES scan.
{
  const { seedAnchorMemo } = await import("../src/anchor.js");
  seedAnchorMemo("anchors", { ok: false }, Date.now());
  clearStatsMemo();
  const listsBefore = kv.lists;
  const pending = [];
  const N = 12;
  const responses = await Promise.all(Array.from({ length: N }, () => worker.fetch(
    new Request("https://x.example/v1/stats"),
    wenv,
    { waitUntil: (p) => pending.push(Promise.resolve(p).catch(() => null)) },
  )));
  await Promise.all(pending);
  assert.equal(kv.lists, listsBefore, "N concurrent /v1/stats started " + (kv.lists - listsBefore) + " list scans");
  for (const one of responses) {
    assert.equal(one.status, 200);
    const b = await one.json();
    assert.equal(b.maps_refresh, "due");
    assert.equal(b.by_host.h5, 2, "stale maps stay the last snapshot");
  }
  n++;
}
// The cron schedules the snapshot build.
// One cron, every 30 min: due at :01 and :31 of the odd-minute cron only.
const { snapshotDue, buildUsesSnapshot: build } = await import("../src/uses.js");
const at = (m) => Date.UTC(2026, 9, 11, 20, m);
assert.equal(snapshotDue("1-59/2 * * * *", at(1), "1-59/2 * * * *"), true);
assert.equal(snapshotDue("1-59/2 * * * *", at(31), "1-59/2 * * * *"), true);
assert.equal(snapshotDue("1-59/2 * * * *", at(3), "1-59/2 * * * *"), false);
assert.equal(snapshotDue("*/2 * * * *", at(30), "1-59/2 * * * *"), false);
let due = 0;
for (let m = 0; m < 1440; m++) if (snapshotDue(m % 2 ? "1-59/2 * * * *" : "*/2 * * * *", Date.UTC(2026, 9, 11, 0, m), "1-59/2 * * * *")) due++;
assert.equal(due, 48, "48 runs/day"); n++;
{
  const before = kv.m.get(USES_SNAPSHOT_KEY);
  const sk = slowKv(5); const w1 = [];
  await worker.scheduled({ cron: "1-59/2 * * * *", scheduledTime: at(3) }, { USES: sk }, { waitUntil: (p) => w1.push(p) });
  await Promise.all(w1);
  assert.equal(sk.m.has(USES_SNAPSHOT_KEY), false, "not due -> no build"); n++;
  const w2 = [];
  await worker.scheduled({ cron: "1-59/2 * * * *", scheduledTime: at(31) }, { USES: sk }, { waitUntil: (p) => w2.push(p) });
  await Promise.all(w2);
  assert.equal(sk.m.has(USES_SNAPSHOT_KEY), true, "due -> built"); n++;
  const staleKv = slowKv(1);
  const when = at(3);
  staleKv.m.set(USES_SNAPSHOT_KEY, JSON.stringify({ spec: "USES-SNAPSHOT-1.0", complete: true, snapshot_at: new Date(when - 40 * 60 * 60 * 1000).toISOString(), by_host: { old: 1 }, by_path: {}, by_day: {}, by_method: {}, by_op: {} }));
  const w3 = [];
  await worker.scheduled({ cron: "1-59/2 * * * *", scheduledTime: when }, { USES: staleKv }, { waitUntil: (p) => w3.push(p) });
  await Promise.all(w3);
  const rebuilt = JSON.parse(staleKv.m.get(USES_SNAPSHOT_KEY));
  assert.equal(rebuilt.snapshot_at, new Date(when).toISOString(), "stale maps refresh off the :01/:31 mark");
  assert.equal(rebuilt.by_host.h0, 2); n++;
}
// USES-SNAPSHOT-1.1: RUNTIME_KV Durable Object path. Legacy KV read once; DO scans; no-change skip.
{
  const { memoryRuntimeKvNamespace, hybridKv } = await import("../src/durable-kv.js");
  const legacy = slowKv(40);
  const ns = memoryRuntimeKvNamespace();
  const hk = hybridKv(ns, legacy);
  await hk.put("host|h1", "99"); await hk.put("host|new", "7"); await hk.put("total", "500");
  const env2 = { USES: hk };
  legacy.lists = 0; legacy.gets = 0;
  const T = Date.parse("2026-10-11T20:31:00Z");
  const o1 = await build(env2, { now: T });
  assert.equal(o1.published, true); assert.ok(legacy.lists > 0);
  const s1 = JSON.parse(await hk.get(USES_SNAPSHOT_KEY));
  assert.equal(s1.by_host.h1, 99, "DO value overrides legacy"); assert.equal(s1.by_host.h2, 2, "legacy base kept"); assert.equal(s1.by_host.new, 7); n++;
  // Second run: zero legacy KV operations, and no put because nothing changed.
  legacy.lists = 0; legacy.gets = 0;
  const putsBefore = ns._map.size;
  const o2 = await build(env2, { now: T + 30 * 60_000 });
  assert.equal(legacy.lists, 0); assert.equal(legacy.gets, 0, "legacy read once, never again");
  assert.equal(o2.skipped_unchanged, true); assert.equal(o2.published, false); assert.equal(o2.do_scans, 5);
  assert.equal(JSON.parse(await hk.get(USES_SNAPSHOT_KEY)).snapshot_at, s1.snapshot_at); n++;
  // A change publishes; an unchanged snapshot older than 2 h is refreshed.
  await hk.put("path|/x", "1");
  assert.equal((await build(env2, { now: T + 60 * 60_000 })).published, true);
  assert.equal((await build(env2, { now: T + 90 * 60_000 })).skipped_unchanged, true);
  assert.equal((await build(env2, { now: T + 60 * 60_000 + 2 * 60 * 60_000 + 1 })).published, true); n++;
  void putsBefore;
}
console.log(`ok uses snapshot: ${n} checks`);
