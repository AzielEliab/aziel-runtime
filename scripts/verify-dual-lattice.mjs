/**
 * Runtime-wide dual hash lattices (AUDIT-2026-10-04 §5.2).
 * Every ChainLock stamp and session receipt stores a primary chain and a
 * secondary chain. Offline, secondary = H(document primary hash + username),
 * so the same document is never written twice for that user.
 * lattice_live is true only where both chains are stored and the walk holds.
 * Author: Aziel Eliab. Identity is Aziel Eliab only.
 */
import assert from "node:assert/strict";
import {
  LATTICE_GENESIS,
  LatticeError,
  latticeDocumentHash,
  latticeOfflineSecondary,
  latticeOnlineSecondary,
  latticePrimary,
  planLattice,
  verifyLattice,
} from "../src/dual-lattice.js";
import { append, stampDocumentHash, tip, verify } from "../src/chainlock/ops.js";
import { MemoryStore, KvStore, DurableStore } from "../src/chainlock/store.js";
import { memoryChainWriterNamespace } from "../src/chainlock/writer-do.js";
import {
  applyClose,
  applyOpen,
  applyPolicy,
  openSession,
  verifyChainStrict,
} from "../src/session-core.js";
import { offlineSecondaryHash, onlineSecondaryHash, primaryChainHash } from "../src/engines/4dmap/aznews.js";

const HEX = /^[a-f0-9]{64}$/;

// --- 1. Hash rules -----------------------------------------------------------
const doc = await latticeDocumentHash({ c: "evidence", k: "stamp", subject: "s", fact: "f" });
assert.match(doc, HEX);
const p1 = await latticePrimary(doc, LATTICE_GENESIS);
const s1 = await latticeOnlineSecondary(p1, LATTICE_GENESIS);
const off = await latticeOfflineSecondary(doc, "azuser");
assert.notEqual(p1, s1);
assert.notEqual(s1, off);
// Offline secondary does not depend on chain order: same doc + user, same hash.
assert.equal(off, await latticeOfflineSecondary(doc, "azuser"));
assert.notEqual(off, await latticeOfflineSecondary(doc, "otheruser"));
// AZNews uses the same rules (one definition).
assert.equal(await primaryChainHash(doc, LATTICE_GENESIS), p1);
assert.equal(await onlineSecondaryHash(p1, LATTICE_GENESIS), s1);
assert.equal(await offlineSecondaryHash(doc, "azuser"), off);

// Offline needs a username handle; nothing is written without it.
await assert.rejects(() => planLattice({ document_hash: doc, offline: true }), (err) => err instanceof LatticeError && err.code === "LATTICE-USERNAME-ABSENT");
await assert.rejects(() => planLattice({ document_hash: doc, offline: true, username: "Not A Handle!" }), /username/);

// --- 2. ChainLock stamps on every store ------------------------------------
async function exerciseStore(label, store) {
  const a = await append(store, { c: "evidence", subject: "one", fact: "first fact" });
  assert.equal(a.ok, true, label);
  assert.ok(a.stamp.lattice, `${label}: stamp stores the lattice block`);
  assert.match(a.stamp.lattice.primary, HEX);
  assert.match(a.stamp.lattice.secondary, HEX);
  assert.deepEqual(a.stamp.lattice.lattices, ["primary", "secondary"]);
  assert.equal(a.stamp.lattice.primary_prev, LATTICE_GENESIS);
  assert.equal(a.stamp.lattice.offline, false);
  assert.equal(a.stamp.lattice.username, null);
  assert.equal(a.stamp.lattice.document_hash, await stampDocumentHash({ c: "evidence", subject: "one", fact: "first fact" }));
  assert.equal(a.lattice_live, true);

  const b = await append(store, { c: "evidence", subject: "two", fact: "second fact" });
  assert.equal(b.stamp.lattice.primary_prev, a.stamp.lattice.primary, `${label}: primary links`);
  assert.equal(b.stamp.lattice.secondary_prev, a.stamp.lattice.secondary, `${label}: secondary links`);

  // Offline: secondary is the document hash plus the username.
  const o = await append(store, { c: "evidence", subject: "field", fact: "offline note", offline: true, username: "azuser" });
  assert.equal(o.ok, true, `${label}: offline append`);
  assert.equal(o.stamp.lattice.offline, true);
  assert.equal(o.stamp.lattice.username, "azuser");
  assert.equal(o.stamp.lattice.secondary, await latticeOfflineSecondary(o.stamp.lattice.document_hash, "azuser"));

  // The same document for the same user offline is refused and nothing is written.
  const before = await tip(store, "evidence");
  const doubled = await append(store, { c: "evidence", subject: "field", fact: "offline note", offline: true, username: "azuser" });
  assert.equal(doubled.ok, false, `${label}: offline double refused`);
  assert.equal(doubled.refuse, "lattice-double");
  assert.equal(doubled.code, "LATTICE-DOUBLE");
  assert.equal(doubled.written, false);
  const after = await tip(store, "evidence");
  assert.equal(after.seq, before.seq, `${label}: nothing written on double`);

  // A different user can store the same document.
  const other = await append(store, { c: "evidence", subject: "field", fact: "offline note", offline: true, username: "seconduser" });
  assert.equal(other.ok, true);

  // Offline without a username refuses.
  const nouser = await append(store, { c: "evidence", fact: "no handle", offline: true });
  assert.equal(nouser.ok, false);
  assert.equal(nouser.code, "LATTICE-USERNAME-ABSENT");

  // Online re-append of the same content is allowed (chain order differs).
  const again = await append(store, { c: "evidence", subject: "one", fact: "first fact" });
  assert.equal(again.ok, true);
  assert.notEqual(again.stamp.lattice.primary, a.stamp.lattice.primary);

  const t = await tip(store, "evidence");
  assert.equal(t.lattice_tips.primary, again.stamp.lattice.primary);
  assert.equal(t.lattice_tips.secondary, again.stamp.lattice.secondary);

  const v = await verify(store, { c: "evidence" });
  assert.equal(v.ok, true, `${label}: ${JSON.stringify(v.breaks)}`);
  assert.equal(v.chains[0].dual_lattice.lattice_live, true);
  assert.equal(v.chains[0].dual_lattice.lattice_rows, 5);
  assert.equal(v.dual_lattice.lattice_live, true);
  return store;
}

const mem = await exerciseStore("memory", new MemoryStore());

const kvMap = new Map();
const kvBinding = {
  async get(k) { return kvMap.has(k) ? kvMap.get(k) : null; },
  async put(k, v) { kvMap.set(k, v); },
  async delete(k) { kvMap.delete(k); },
  async list() { return { keys: [...kvMap.keys()].map((name) => ({ name })) }; },
};
await exerciseStore("kv", new KvStore(kvBinding));

const doNs = memoryChainWriterNamespace({});
await exerciseStore("durable", new DurableStore(doNs));

// Durable writer keeps lattice tips in meta and an offline index, so a double is refused
// without a full row scan, including across a fresh store handle on the same namespace.
const doStore2 = new DurableStore(doNs);
const doubleAcross = await append(doStore2, { c: "evidence", subject: "field", fact: "offline note", offline: true, username: "azuser" });
assert.equal(doubleAcross.code, "LATTICE-DOUBLE");

// --- 3. Tamper and missing-chain checks fail closed --------------------------
const rows = (await mem.loadRecords("evidence")).map((r) => structuredClone(r));
{
  const bad = structuredClone(rows);
  bad[1].lattice.secondary = "f".repeat(64);
  const res = await verifyLattice(bad);
  assert.equal(res.ok, false);
  assert.equal(res.lattice_live, false);
  assert.match(res.breaks[0].reason, /lattice-secondary/);
}
{
  const bad = structuredClone(rows);
  delete bad[2].lattice.secondary;
  const res = await verifyLattice(bad);
  assert.equal(res.ok, false, "a row missing the secondary chain fails");
  assert.equal(res.lattice_live, false, "lattice_live false when one chain is missing");
}
{
  const bad = structuredClone(rows);
  bad[1].lattice.primary_prev = "1".repeat(64);
  const res = await verifyLattice(bad);
  assert.equal(res.ok, false);
  assert.equal(res.breaks[0].reason, "lattice-primary-prev");
}
{
  const bad = structuredClone(rows);
  delete bad[3].lattice;
  const res = await verifyLattice(bad);
  assert.equal(res.ok, false, "a row without a lattice after lattice rows fails closed");
}
{
  // Two offline rows with the same secondary are a double.
  const bad = structuredClone(rows.slice(0, 3));
  const dup = structuredClone(bad[2]);
  dup.lattice.primary_prev = bad[2].lattice.primary;
  dup.lattice.secondary_prev = bad[2].lattice.secondary;
  dup.lattice.primary = await latticePrimary(dup.lattice.document_hash, dup.lattice.primary_prev);
  bad.push(dup);
  const res = await verifyLattice(bad);
  assert.equal(res.ok, false);
  assert.equal(res.breaks[0].reason, "lattice-double");
}
{
  // Legacy rows (before the lattice) never make the flag true on their own.
  const legacy = [{ id: "old1" }, { id: "old2" }];
  const res = await verifyLattice(legacy);
  assert.equal(res.ok, true);
  assert.equal(res.legacy_rows, 2);
  assert.equal(res.lattice_live, false);
}
// ChainLock verify reports the break on the tampered stored row.
{
  const store = new MemoryStore();
  await append(store, { c: "acts", fact: "a" });
  await append(store, { c: "acts", fact: "b" });
  const stored = await store.loadRecords("acts");
  stored[1].lattice.secondary = "e".repeat(64);
  await store.replaceRecords("acts", stored);
  const v = await verify(store, { c: "acts" });
  assert.equal(v.ok, false);
  assert.equal(v.dual_lattice.lattice_live, false);
}

// --- 4. Session receipts carry both chains ----------------------------------
const now = "2026-10-05T00:00:00.000Z";
const session = openSession({ id: "sess_" + "cd".repeat(16), now, version: "2.0.0-rc1", source: "test" });
await applyOpen(session, now);
await applyPolicy(session, { allow_slugs: ["azclce"] }, "2026-10-05T00:00:01.000Z");
await applyClose(session, "2026-10-05T00:00:02.000Z");
for (const rec of session.receipts) {
  assert.match(rec.lattice.primary, HEX);
  assert.match(rec.lattice.secondary, HEX);
  assert.equal(rec.lattice.offline, false);
}
for (let i = 1; i < session.receipts.length; i++) {
  assert.equal(session.receipts[i].lattice.primary_prev, session.receipts[i - 1].lattice.primary);
}
const chain = await verifyChainStrict(session.receipts);
assert.equal(chain.ok, true, JSON.stringify(chain.errors));
assert.equal(chain.dual_lattice.lattice_live, true);
assert.equal(chain.dual_lattice.lattice_rows, session.receipts.length);
const forged = structuredClone(session.receipts);
forged[1].lattice.secondary = "a".repeat(64);
const forgedRes = await verifyChainStrict(forged);
assert.equal(forgedRes.ok, false);
assert.equal(forgedRes.dual_lattice.lattice_live, false);

console.log(
  "ok dual-lattice: ChainLock (memory, KV, Durable Object) and session receipts store primary+secondary; offline double refused; tamper and missing chain fail closed; lattice_live only when both chains are stored and verified",
);
