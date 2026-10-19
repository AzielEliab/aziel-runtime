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
console.log(`ok offline stores: ${n} checks`);
