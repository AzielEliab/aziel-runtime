/** LEDGER-LATTICE-1.0 + coverage: identity, learn and fraggate rows all carry the dual lattice. */
import assert from "node:assert/strict";
import { append } from "../src/chainlock/ops.js";
import { memoryChainWriterNamespace } from "../src/chainlock/writer-do.js";
import { storeFor } from "../src/chainlock/store.js";
import { appendLedger, verifyLedger, composeLedgerEntry, ledgerDocumentHash } from "../src/fraggate/ledger.js";
import { verifyLattice, LATTICE_GENESIS } from "../src/dual-lattice.js";
import { canonicalize, sha256Hex } from "../src/session-core.js";
let n = 0;
const env = { CHAINLOCK: memoryChainWriterNamespace({}) };
const ds = storeFor(env);
for (const c of ["identity", "learn"]) {
  await append(ds, { c, s: c + " one", f: "first" });
  await append(ds, { c, s: c + " two", f: "second" });
  const meta = await ds.chainMeta(c);
  assert.ok(meta.lt && meta.lt.primary && meta.lt.secondary, c + " has no lattice tips");
  const rows = (await ds.loadRecords(c));
  assert.ok(rows.every((r) => r.lattice && r.lattice.primary && r.lattice.secondary), c);
  const v = await verifyLattice(rows);
  assert.equal(v.ok, true, c);
  n += 2;
}
// FragGate ledger through the Durable Object writer.
await appendLedger({ asked: true, refused: false, name: "foldlock", op: "fold", gate: "fraggate" }, { store: ds });
await appendLedger({ asked: true, refused: true, code: "FG-STUB", name: "embryolock", op: "wipe", gate: "fraggate" }, { store: ds });
const frows = await ds.loadRecords("fraggate");
assert.equal(frows.length, 2);
assert.ok(frows.every((r) => r.lattice && r.lattice.primary && r.lattice.secondary)); n++;
assert.equal(frows[0].lattice.primary_prev, LATTICE_GENESIS); n++;
assert.equal(frows[1].lattice.primary_prev, frows[0].lattice.primary); n++;
assert.equal(frows[0].lattice.document_hash, await ledgerDocumentHash({ asked: true, refused: false, name: "foldlock", op: "fold", gate: "fraggate" })); n++;
// Row hash covers the lattice; verifyLedger still passes; tamper with lattice breaks it.
const vl = await verifyLedger({ entries: frows });
assert.equal(vl.ok, true, JSON.stringify(vl)); n++;
const tampered = frows.map((r, i) => (i === 1 ? { ...r, lattice: { ...r.lattice, secondary: "f".repeat(64) } } : r));
assert.equal((await verifyLedger({ entries: tampered })).ok, false); n++;
// Lattice walk over the ledger rows.
assert.equal((await verifyLattice(frows)).ok, true); n++;
// Old rows (no lattice) keep their old hash: composing without tips is the legacy shape.
const legacy = await composeLedgerEntry({ asked: true, name: "x", op: "y", at: "2026-01-01T00:00:00.000Z" }, { seq: 1, prev: "0".repeat(64) });
assert.equal(legacy.lattice, undefined);
const { hash, ...body } = legacy;
assert.equal(await sha256Hex(canonicalize(body)), hash); n++;
console.log(`ok lattice coverage: ${n} checks (identity, learn, fraggate)`);
