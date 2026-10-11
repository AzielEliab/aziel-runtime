/**
 * LEDGER-LATTICE-1.0 (all writer paths): FragGate ledger rows carry the dual lattice whether they
 * are written by the CHAINLOCK DO, a non-DO store (appendOnStore builder), a snapshot, or the
 * isolate fallback. Identity and learn ChainLock writes carry the lattice too.
 */
import assert from "node:assert/strict";
import { appendLedger, emptyLedger, resetLedger, currentLedger, verifyLedger } from "../src/fraggate/ledger.js";
import { verifyLattice } from "../src/dual-lattice.js";
import { append, verify } from "../src/chainlock/ops.js";
import { MemoryStore, DurableStore } from "../src/chainlock/store.js";
import { memoryChainWriterNamespace } from "../src/chainlock/writer-do.js";
let n = 0;
const HEX = /^[0-9a-f]{64}$/;
const rec = (i) => ({ name: "tool-" + i, op: "health", asked: true, code: "FG-OK" });
async function checkRows(label, rows) {
  assert.ok(rows.length >= 3, label + " rows");
  for (const r of rows) { assert.ok(r.lattice, label + ": row " + r.seq + " has lattice"); assert.match(r.lattice.primary, HEX); assert.match(r.lattice.secondary, HEX); }
  for (let i = 1; i < rows.length; i++) assert.equal(rows[i].lattice.primary_prev, rows[i - 1].lattice.primary, label + " primary links");
  const v = await verifyLattice(rows);
  assert.equal(v.ok, true, label + " " + JSON.stringify(v.breaks)); assert.equal(v.lattice_live, true);
}
// 1. Isolate fallback (no store bound).
resetLedger();
for (let i = 0; i < 3; i++) await appendLedger(rec(i));
await checkRows("isolate", currentLedger().entries);
assert.equal((await verifyLedger(currentLedger())).ok, true); n++;
// 2. Non-DO store (MemoryStore appendAtomic -> appendOnStore builder).
resetLedger();
const mem = new MemoryStore();
for (let i = 0; i < 3; i++) await appendLedger(rec(i), { store: mem });
await checkRows("memory store", await mem.loadRecords("fraggate"));
n++;
// 3. Snapshot path.
let snap = emptyLedger();
for (let i = 0; i < 3; i++) snap = (await appendLedger(rec(i), snap)).ledger;
await checkRows("snapshot", snap.entries); n++;
// 4. DO path still carries it.
resetLedger();
const ds = new DurableStore(memoryChainWriterNamespace({}));
for (let i = 0; i < 3; i++) await appendLedger(rec(i), { store: ds });
await checkRows("durable", await ds.loadRecords("fraggate")); n++;
// 5. Identity and learn writes carry the lattice (DO store; learn also on a non-DO store).
for (const [label, st, chains] of [["durable", new DurableStore(memoryChainWriterNamespace({})), ["identity", "learn"]], ["memory", new MemoryStore(), ["learn"]]]) {
  for (const c of chains) {
    for (let i = 0; i < 3; i++) {
      const o = await append(st, { c, subject: c + " s" + i, fact: `${c} fact ${i}` });
      assert.equal(o.ok, true, `${label} ${c}: ${JSON.stringify(o)}`);
      assert.match(o.stamp.lattice.primary, HEX); assert.match(o.stamp.lattice.secondary, HEX); assert.equal(o.lattice_live, true);
    }
    const v = await verify(st, { c });
    assert.equal(v.ok, true); assert.equal(v.chains[0].dual_lattice.lattice_live, true); assert.equal(v.chains[0].dual_lattice.lattice_rows, 3);
    n++;
  }
}
console.log(`ok ledger lattice paths: ${n} checks`);
