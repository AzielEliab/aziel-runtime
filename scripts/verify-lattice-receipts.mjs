/** LATTICE-RECEIPTS-1.0: NO-LIE rows and fed-mesh identity receipts carry the dual lattice (additive). */
import assert from "node:assert/strict";
import { verifyLattice, latticeTips } from "../src/dual-lattice.js";
import { mintNoLieReceipt, verifyNoLieReceipt } from "../src/no-lie.js";
import { mintIdentityReceipt, verifyIdentityReceipt, verifyIdentityChain } from "../src/fed-mesh/receipt.js";
import { createIdentity } from "../src/fed-mesh/identity.js";
const Z = "0".repeat(64);
let n = 0;
// NO-LIE
const rows = [];
let prev = Z;
for (let i = 0; i < 3; i++) {
  const r = await mintNoLieReceipt({ previous_hash: prev, body: { line: "no rewrite " + i }, event: { i }, lattice_tips: latticeTips(rows) });
  assert.equal(r.lattice.document_hash, r.hash);
  assert.equal((await verifyNoLieReceipt(r)).ok, true, "four-field verify unchanged");
  rows.push(r); prev = r.hash;
}
assert.equal((await verifyLattice(rows)).ok, true); assert.equal((await verifyLattice(rows)).lattice_live, true); n++;
const tampered = rows.map((r) => ({ ...r, lattice: { ...r.lattice } }));
tampered[1].lattice.primary = "f".repeat(64);
assert.equal((await verifyLattice(tampered)).ok, false); n++;
// fed-mesh identity receipts
const id = await createIdentity();
const rec = [];
let ph = Z, aprev = Z;
for (let i = 1; i <= 3; i++) {
  const r = await mintIdentityReceipt({ identity: id, request: "Relay " + i + ".", output: "Stored " + i + ".", seq: i, prev: aprev, previous_hash: ph, lattice_tips: latticeTips(rec) });
  const v = await verifyIdentityReceipt(r);
  assert.equal(v.ok, true, JSON.stringify(v)); assert.equal(r.lattice.document_hash, r.hash);
  rec.push(r); ph = r.hash; aprev = v.statement_hash;
}
assert.equal((await verifyLattice(rec)).ok, true); n++;
const chain = await verifyIdentityChain(rec);
assert.equal(chain.ok, true, JSON.stringify(chain)); n++;
console.log(`ok lattice receipts (no-lie + fed-mesh): ${n} checks`);
