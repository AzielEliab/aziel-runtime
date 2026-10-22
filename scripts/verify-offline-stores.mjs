/**
 * OFFLINE-RECORDS-1.0 stores addendum: AZNews + 4DMap store rows ride in the offline bundle as sidecar
 * files, bound by the holder signature (sha256, count, tip, signed checkpoints), checked offline, imported
 * forward-only, and served by the additive read-only GET /v1/<store>/rows. Author: Aziel Eliab.
 */
import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomBytes } from "node:crypto";
import { memoryRepo, openBatch, walkStep } from "../src/engines/4dmap/aznews-live.js";
import { makeCheckpoints, checkpointsAfter } from "../src/store-durability.js";
import { tetherKey } from "../src/azos-tether.js";
import { AzNewsStore, STORE_ROWS_PAGE_MAX } from "../src/aznews-do.js";

globalThis.fetch = async () => { throw new Error("verify-offline-stores: offline"); };
const handler = (await import("../src/index.js")).default.fetch;
const R = await import("../src/offline-records.js");
let n = 0;

const key = await tetherKey({ TETHER_SIGNING_SEED: randomBytes(32).toString("hex") });
async function grow(repo, chain, rows) {
  for (let i = 0; i < rows; i += 250) {
    const b = await openBatch(repo);
    for (let j = i; j < Math.min(rows, i + 250); j++) await b.add("news", { title: `${chain} item ${(await repo.count()) + b.rows.length + 1}`, n: j });
    await b.commit();
  }
  for (let s = 0; s < 20; s++) { const w = await walkStep(repo, {}); if (!w.lag_rows) break; }
  await makeCheckpoints(repo, { chain, key });
}
const repos = { "aznews-v1": memoryRepo(), "4dmap-v1": memoryRepo() };
await grow(repos["aznews-v1"], "aznews", 2100);
await grow(repos["4dmap-v1"], "4dmap", 30);
const objs = {};
for (const name of Object.keys(repos)) {
  const o = new AzNewsStore({ storage: {} }, {});
  o.name = name; o.repoOf = () => repos[name]; o.rawRepo = () => repos[name];
  objs[name] = o;
}
const env = { AZNEWS: { getByName: (name) => objs[name] } };
const ctx = { waitUntil() {} };
const origin = "https://origin.example";
const fetchImpl = (u) => handler(new Request(u), env, ctx);

// 1) the additive read route: bounded pages, raw rows with both lattice hashes, mints nothing.
{
  const before = await repos["aznews-v1"].count();
  let r = await fetchImpl(origin + "/v1/aznews/rows?from=1&limit=9999");
  let j = await r.json();
  assert.equal(r.status, 200); assert.equal(j.ok, true); assert.equal(j.count, STORE_ROWS_PAGE_MAX); assert.equal(j.rows[0].seq, 1);
  assert.match(j.rows[0].lattice.primary, /^[a-f0-9]{64}$/); assert.match(j.rows[0].lattice.secondary, /^[a-f0-9]{64}$/);
  j = await (await fetchImpl(origin + "/v1/4dmap/rows?from=21&limit=50")).json();
  assert.equal(j.count, 10); assert.equal(j.to, 30); assert.equal(j.total, 30);
  j = await (await fetchImpl(origin + "/v1/4dmap/rows?from=99")).json();
  assert.equal(j.count, 0);
  assert.equal(await repos["aznews-v1"].count(), before, "read mints nothing");
  const spec = await (await fetchImpl(origin + "/openapi.json")).json();
  assert.ok(spec.paths["/v1/aznews/rows"] && spec.paths["/v1/4dmap/rows"]);
  n++;
}

// 2) pull: chains as before + both stores as sidecar files bound into the signed body.
const d1 = await mkdtemp(join(tmpdir(), "azst-")), d2 = await mkdtemp(join(tmpdir(), "azst-")), out = await mkdtemp(join(tmpdir(), "azst-"));
const sd = join(out, "records.json.stores");
const p = await R.pullBundle(origin, d1, { fetchImpl, storesDir: sd });
assert.equal(p.ok, true);
const b = p.bundle;
assert.equal(b.stores.aznews.count, 2100); assert.equal(b.stores.aznews.checkpoints.length, 2);
assert.equal(b.stores["4dmap"].count, 30); assert.equal(b.stores["4dmap"].checkpoints.length, 0);
assert.equal(b.stores.aznews.file, "aznews.rows.jsonl"); assert.equal(b.stores_skipped, undefined);
await writeFile(join(out, "records.json"), JSON.stringify(b)); n++;

// 3) offline check: needs the sidecar; hash, lattice, docs, checkpoints all verify.
assert.equal((await R.checkBundle(b)).code, "OFFLINE-STORE-FILE-MISSING");
const ck = await R.checkBundle(b, { storesDir: sd });
assert.equal(ck.ok, true); assert.equal(ck.stores.length, 2);
assert.equal(ck.stores.find((s) => s.store === "aznews").checkpoints, 2);
assert.equal((await R.checkBundle(b, { storesDir: sd, trustStoreKey: key.public_key })).ok, true);
assert.equal((await R.checkBundle(b, { storesDir: sd, trustStoreKey: "x".repeat(43) })).code, "OFFLINE-STORE-UNTRUSTED-CHECKPOINT-KEY"); n++;

// 4) tamper: edited sidecar -> hash mismatch; edited AND re-signed -> the lattice/doc check catches it.
{
  const f = join(sd, "4dmap.rows.jsonl");
  const orig = await readFile(f, "utf8");
  const lines = orig.trim().split("\n");
  const row = JSON.parse(lines[4]); row.doc.title = "rewritten"; lines[4] = JSON.stringify(row);
  await writeFile(f, lines.join("\n") + "\n");
  assert.equal((await R.checkBundle(b, { storesDir: sd })).code, "OFFLINE-STORE-HASH-MISMATCH");
  const reread = await R.readStoreRows(f);
  const { body_sha256: _h, public_key: _k, sig: _s, counts: _c, ...body } = b;
  const forged = await R.signBundle(body.chains, d1, { source: "forged", stores: { ...body.stores, "4dmap": { ...body.stores["4dmap"], rows_sha256: reread.rows_sha256 } } });
  const bad = await R.checkBundle(forged, { storesDir: sd });
  assert.equal(bad.code, "OFFLINE-STORE-BROKEN"); assert.equal(bad.store, "4dmap"); assert.equal(bad.seq, 5);
  await writeFile(f, orig);
  assert.equal((await R.checkBundle(b, { storesDir: sd })).ok, true);
}
n++;

// 5) import (rehydrate) forward-only; re-import writes nothing; re-export carries the stores on.
let s2 = await R.localStore(d2);
let im = await R.importBundle(s2, b, { storesDir: sd, dir: d2 });
assert.equal(im.code, "OFFLINE-IMPORTED"); assert.deepEqual(im.stores.sort(), ["4dmap", "aznews"]);
im = await R.importBundle(s2, b, { storesDir: sd, dir: d2 });
assert.deepEqual(im.stores, []); assert.equal(im.written, false);
const sd2 = join(out, "again.json.stores");
const re = await R.exportBundle(s2, d2, { storesDir: sd2 });
assert.equal(re.stores.aznews.count, 2100);
assert.equal((await R.checkBundle(re, { storesDir: sd2 })).ok, true);
// stores verified but not imported without a local dir (old callers keep working)
assert.match((await R.importBundle(await R.localStore(await mkdtemp(join(tmpdir(), "azst-"))), b, { storesDir: sd })).stores_note, /not imported/); n++;

// 6) the origin grows: the new pull imports forward; a diverged local copy refuses OFFLINE-FORK.
await grow(repos["aznews-v1"], "aznews", 40);
const sd3 = join(out, "later.json.stores");
const later = (await R.pullBundle(origin, d1, { fetchImpl, storesDir: sd3 })).bundle;
assert.equal(later.stores.aznews.count, 2140);
im = await R.importBundle(s2, later, { storesDir: sd3, dir: d2 });
assert.deepEqual(im.stores, ["aznews"]);
const metaFile = join(d2, "stores", "aznews.meta.json");
const meta = JSON.parse(await readFile(metaFile, "utf8"));
await writeFile(metaFile, JSON.stringify({ ...meta, count: 2000, tip: { seq: 2000, primary: "f".repeat(64), secondary: "f".repeat(64) } }));
assert.equal((await R.importBundle(s2, later, { storesDir: sd3, dir: d2 })).code, "OFFLINE-FORK"); n++;

// 7) witness store heads vs the bundle checkpoints (no origin).
{
  const cp1 = b.stores.aznews.checkpoints[0];
  assert.deepEqual(R.storeAnchorChecks({ stores: { aznews: { n: 1, cp_hash: cp1.cp_hash } } }, b), [{ store: "aznews", cp_n: 1, state: "match" }]);
  assert.equal(R.storeAnchorChecks({ stores: { aznews: { n: 1, cp_hash: "0".repeat(64) } } }, b)[0].state, "MISMATCH");
  assert.equal(R.storeAnchorChecks({ stores: { "4dmap": { n: 3, cp_hash: "0".repeat(64) } } }, b)[0].state, "bundle-short");
}
n++;

// 8) an origin that cannot serve store rows (e.g. not deployed yet): chains still pulled, stores named as skipped.
{
  const old = async (u) => (String(u).includes("/rows?from=") && !String(u).includes("/v1/anchor/") ? new Response(JSON.stringify({ ok: false, error: "not found" }), { status: 404 }) : fetchImpl(u));
  const q = await R.pullBundle(origin, d1, { fetchImpl: old, storesDir: join(out, "old.json.stores") });
  assert.equal(q.ok, true); assert.equal(q.bundle.stores, undefined);
  assert.deepEqual(Object.keys(q.bundle.stores_skipped).sort(), ["4dmap", "aznews"]);
  assert.equal((await R.checkBundle(q.bundle)).ok, true);
}
n++;

// 9) chain-only bundles are unchanged (no stores field, same check).
{
  const plain = await R.signBundle({}, d1, { source: "x" });
  assert.equal("stores" in plain, false); assert.equal((await R.checkBundle(plain)).ok, true);
}
n++;
// 10) follow-up: retracted pins stay in the raw rows; ?marks=1 marks them per row (never cached, rows unchanged);
//     the offline check reports them with the same rule.
const SH = await import("../src/store-rows-http.js");
{
  const mrepo = memoryRepo();
  const bt = await openBatch(mrepo);
  const a = await bt.add("map_pin", { kind: "4dmap-pin", source_id: "corpus:e1", layer: "corpus", geo: { lat: 1.5, lon: 2.5 } });
  await bt.add("map_pin", { kind: "4dmap-pin", source_id: "corpus:e2", layer: "corpus", geo: { lat: 3.5, lon: 4.5 } });
  const rt = await bt.add("map_pin", { kind: "4dmap-pin", source_id: "corpus:e1", layer: "corpus", supersedes_seq: a.seq, retracted: "geoparser_junk", retract_reason: "junk" });
  bt.seen["m:corpus:e1"] = { seq: rt.seq, retracted: true };
  bt.seen["m:corpus:e2"] = { seq: 2 };
  await bt.commit();
  const o = new AzNewsStore({ storage: {} }, {});
  o.name = "4dmap-v1"; o.repoOf = () => mrepo; o.rawRepo = () => mrepo;
  const menv = { AZNEWS: { getByName: () => o } };
  const call = (u) => handler(new Request(u), menv, ctx);
  let r = await call(origin + "/v1/4dmap/rows?from=1&limit=10&marks=1");
  let j = await r.json();
  assert.equal(j.count, 3, "retracted pin and its retraction row both stay in the rows");
  assert.deepEqual(j.marks.map((m) => [m.seq, m.mark]), [[1, "hidden"], [3, "retraction"]]);
  assert.equal(j.marks[0].retracted_by_seq, 3); assert.equal(j.marks[1].hides_seq, 1);
  assert.equal(r.headers.get("cache-control"), "no-store");
  const plain = await (await call(origin + "/v1/4dmap/rows?from=1&limit=10")).json();
  assert.equal(plain.marks, undefined); assert.deepEqual(plain.rows, j.rows, "marks never change the rows");
  assert.equal((await (await fetchImpl(origin + "/v1/aznews/rows?from=1&limit=2&marks=1")).json()).marks, undefined, "marks are 4dmap only");
  const off = SH.hiddenPinsOffline(j.rows);
  assert.deepEqual([...off.entries()], [[1, 3]]);
  const dm = await mkdtemp(join(tmpdir(), "azst-"));
  const w = await R.writeStoreRows(join(dm, "4dmap.rows.jsonl"), (async function* () { yield j.rows; })());
  const meta = { spec: R.STORES_SPEC, file: "4dmap.rows.jsonl", count: w.count, rows_sha256: w.rows_sha256, tip: w.tip, checkpoints: [] };
  const cs = await R.checkStore("4dmap", meta, (await R.readStoreRows(join(dm, "4dmap.rows.jsonl"))).rows);
  assert.equal(cs.ok, true); assert.equal(cs.retracted_pins.hidden, 1); assert.equal(cs.retracted_pins.retraction_rows, 1);
}
n++;

// 11) caching: a full page wholly below the checkpoint tip is cached (immutable) and served from the cache
//     without reaching the store; partial pages / above the tip / marks pages are not cached.
{
  const mem = new Map();
  const cache = { match: async (req) => { const v = mem.get(req.url); return v ? new Response(v.body, { status: v.status, headers: v.headers }) : undefined; }, put: async (req, res) => { mem.set(req.url, { body: await res.text(), status: res.status, headers: Object.fromEntries(res.headers) }); } };
  let calls = 0;
  const call = (op, payload) => { calls++; return objs["aznews-v1"].fetch(new Request("https://do/", { method: "POST", body: JSON.stringify({ op, payload }) })).then((r) => r.json()); };
  const req = (q) => new Request(origin + "/v1/aznews/rows" + q);
  const noLimit = async () => ({ ok: true });
  let r = await SH.serveStoreRows(req("?from=1&limit=500"), {}, { name: "aznews", call, cache, rate: noLimit });
  let j = await r.json();
  assert.equal(j.checkpoint_tip_seq, 2000); assert.equal(r.headers.get("cache-control"), SH.STORE_ROWS_IMMUTABLE); assert.equal(r.headers.get("x-azrt-rows-cache"), "miss");
  r = await SH.serveStoreRows(req("?limit=500&from=1"), {}, { name: "aznews", call, cache, rate: async () => ({ ok: false, retry_after: 9 }) });
  assert.equal(r.status, 200); assert.equal(r.headers.get("x-azrt-rows-cache"), "hit", "cache hits are not limited"); assert.deepEqual((await r.json()).rows, j.rows);
  assert.equal(calls, 1, "hit served without the store");
  for (const q of ["?from=1801&limit=500", "?from=2001&limit=50", "?from=2050&limit=500"]) {
    const x = await SH.serveStoreRows(req(q), {}, { name: "aznews", call, cache, rate: noLimit });
    assert.equal(x.headers.get("cache-control"), "no-store", q); assert.equal(x.headers.get("x-azrt-rows-cache"), "bypass");
  }
  assert.equal(mem.size, 1, "only the page below the tip was cached");
  assert.equal(SH.pageIsImmutable({ ok: true, rows: new Array(10), count: 10, to: 10, checkpoint_tip_seq: 0 }, 10), false, "no checkpoint: never immutable");
  assert.equal(SH.pageIsImmutable({ ok: true, rows: new Array(10), count: 10, to: 10, checkpoint_tip_seq: 10, marks: [] }, 10), false);
}
n++;

// 12) light limit on store reads (cache misses): over it -> 429 with Retry-After; pull waits it out.
{
  const e2 = { AZNEWS: env.AZNEWS };
  let last;
  for (let i = 0; i <= SH.STORE_ROWS_PAGES_PER_MIN; i++) last = await handler(new Request(origin + "/v1/4dmap/rows?from=" + (i + 1) + "&limit=1", { headers: { "cf-connecting-ip": "203.0.113.77" } }), e2, ctx);
  assert.equal(last.status, 429); assert.ok(Number(last.headers.get("retry-after")) >= 1);
  const lj = await last.json(); assert.equal(lj.code, "STORE-ROWS-RATE-LIMIT"); assert.ok(!JSON.stringify(lj).includes("203.0.113.77"), "no client address in the answer");
  const other = await handler(new Request(origin + "/v1/4dmap/rows?from=1&limit=1", { headers: { "cf-connecting-ip": "198.51.100.9" } }), e2, ctx);
  assert.equal(other.status, 200, "per client");
  let flaky = 0; const slept = [];
  const fi = async (u) => { if (u.includes("/rows?") && flaky++ % 2 === 0) return new Response("{}", { status: 429, headers: { "retry-after": "2" } }); return fetchImpl(u); };
  const ds = await mkdtemp(join(tmpdir(), "azst-"));
  const ps = await R.pullStores(origin, ds, { fetchImpl: fi, names: ["4dmap"], sleep: async (ms) => { slept.push(ms); } });
  assert.equal(ps.stores["4dmap"].count, 30); assert.ok(slept.length >= 1 && slept.every((ms) => ms === 2000));
}
n++;

// 14) B311-1: cached bodies leave out total / checkpoint_tip_seq (they move forward), the cache key carries a
//     format version, and the puller keeps paging while pages come back full: a page cached when the store
//     had 1000 rows does not cut a later pull of 3000 short. HEAD never spends a GET slot.
{
  const mem = new Map();
  const cache = { match: async (k) => (mem.has(k.url) ? new Response(mem.get(k.url).body, { headers: mem.get(k.url).headers }) : undefined), put: async (k, r) => { mem.set(k.url, { body: await r.text(), headers: Object.fromEntries(r.headers) }); } };
  let total = 1000, tip = 1000;
  const row = (sq) => ({ seq: sq, kind: "map_pin", at: "x", doc: { sq }, lattice: { primary: "p" + sq, secondary: "s" + sq } });
  const call = async (op, pl) => { const to = Math.min(total, pl.from + pl.limit - 1); const rows = []; for (let q = pl.from; q <= to; q++) rows.push(row(q)); return { ok: true, total, from: pl.from, to: pl.from <= total ? to : pl.from - 1, count: rows.length, checkpoint_tip_seq: tip, rows }; };
  const serve = (u, init) => SH.serveStoreRows(new Request(u, init), {}, { name: "4dmap", call, cache, rate: async () => ({ ok: true }) });
  let r = await serve("https://o/v1/4dmap/rows?from=501&limit=500");
  let j = await r.json();
  assert.equal(r.headers.get("x-azrt-rows-cache"), "miss"); assert.equal(j.total, 1000, "live answer keeps total"); assert.equal(j.checkpoint_tip_seq, 1000);
  assert.ok([...mem.keys()].every((k) => k.includes("/" + SH.STORE_ROWS_CACHE_FORMAT + "/")), "format version in the cache key");
  total = 3000; tip = 3000;
  r = await serve("https://o/v1/4dmap/rows?from=501&limit=500");
  j = await r.json();
  assert.equal(r.headers.get("x-azrt-rows-cache"), "hit"); assert.equal(j.total, undefined); assert.equal(j.checkpoint_tip_seq, undefined); assert.equal(j.cached, true); assert.equal(j.format, SH.STORE_ROWS_CACHE_FORMAT);
  assert.equal(j.rows.length, 500); assert.equal(j.to, 1000);
  const ds = await mkdtemp(join(tmpdir(), "azst-"));
  const fi = async (u) => (u.includes("/rows?") ? serve(u) : new Response(JSON.stringify({ checkpoints: [] }), { status: 200 }));
  const ps = await R.pullStores("https://o", ds, { fetchImpl: fi, names: ["4dmap"], limit: 500 });
  assert.equal(ps.stores["4dmap"].count, 3000, "puller got all 3000 rows");
  // HEAD has its own bucket: HEADs never spend the GET slots.
  const used = [];
  const rate = async (k) => { used.push(k); return { ok: true }; };
  await SH.serveStoreRows(new Request("https://o/v1/4dmap/rows?from=2999&limit=5", { method: "HEAD", headers: { "cf-connecting-ip": "203.0.113.77" } }), {}, { name: "4dmap", call, cache: null, rate });
  await SH.serveStoreRows(new Request("https://o/v1/4dmap/rows?from=2999&limit=5", { headers: { "cf-connecting-ip": "203.0.113.77" } }), {}, { name: "4dmap", call, cache: null, rate });
  assert.deepEqual(used, ["head:203.0.113.77", "203.0.113.77"]);
  const hb = await SH.serveStoreRows(new Request("https://o/v1/4dmap/rows?from=1&limit=1", { method: "HEAD" }), {}, { name: "4dmap", call, cache: null, rate: async () => ({ ok: true }) });
  assert.equal(hb.status, 200); assert.equal(await hb.text(), "");
}
n++;

// 13) OpenAPI: from/limit (and marks on 4dmap) are real query parameters.
{
  const spec = await (await fetchImpl(origin + "/openapi.json")).json();
  for (const pth of ["/v1/aznews/rows", "/v1/4dmap/rows"]) {
    const names = spec.paths[pth].get.parameters.map((x) => x.name);
    assert.ok(names.includes("from") && names.includes("limit"), pth);
    const lim = spec.paths[pth].get.parameters.find((x) => x.name === "limit");
    assert.equal(lim.schema.maximum, 500); assert.equal(lim.schema.type, "integer");
  }
  assert.ok(spec.paths["/v1/4dmap/rows"].get.parameters.some((x) => x.name === "marks"));
}
n++;

console.log(`ok offline stores: ${n} checks`);
