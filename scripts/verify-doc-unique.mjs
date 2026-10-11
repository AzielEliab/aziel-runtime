/**
 * LATTICE-DOC-UNIQUE-1.0: one document is stored once. Content hash over normalized text
 * (NFC, trim, collapsed whitespace, case-fold), not chain or kind. Atomic claim in the Durable
 * Object; no KV fallback (fail closed); claim released when a write throws; backfill indexes
 * rows written before the index. Cases include AZBot's probe257.
 */
import assert from "node:assert/strict";
import { append, backfillDocumentIndex, documentContentHash, normalizeDocText, DOCUMENT_CHAINS } from "../src/chainlock/ops.js";
import { memoryChainWriterNamespace } from "../src/chainlock/writer-do.js";
import { storeFor, MemoryStore } from "../src/chainlock/store.js";
let n = 0;
const doStore = () => storeFor({ CHAINLOCK: memoryChainWriterNamespace({}) });

// Normalization.
assert.equal(normalizeDocText("  First\u00a0 fact \n"), "first fact"); n++;
assert.equal(normalizeDocText("Cafe\u0301"), normalizeDocText("Caf\u00e9")); n++;
assert.equal(await documentContentHash({ c: "evidence", k: "stamp", subject: "one", fact: "first fact" }), await documentContentHash({ c: "library", k: "note", subject: "One ", fact: "FIRST   fact" })); n++;

// Probe257 cases, every bypass refused.
{
  const s = doStore();
  const r = (x) => append(s, x);
  assert.equal((await r({ c: "evidence", subject: "one", fact: "first fact" })).ok, true); n++;
  const cases = [
    ["same", { c: "evidence", subject: "one", fact: "first fact" }, "LATTICE-DOUBLE"],
    ["trailing space", { c: "evidence", subject: "one", fact: "first fact " }, "LATTICE-DOUBLE"],
    ["case", { c: "evidence", subject: "One", fact: "First fact" }, "LATTICE-DOUBLE"],
    ["whitespace inside", { c: "evidence", subject: "one", fact: "first \t fact" }, "LATTICE-DOUBLE"],
    ["nbsp", { c: "evidence", subject: "one", fact: "first\u00a0fact" }, "LATTICE-DOUBLE"],
    ["other kind", { c: "evidence", k: "note", subject: "one", fact: "first fact" }, "LATTICE-DOUBLE"],
    ["other chain", { c: "library", subject: "one", fact: "first fact" }, "LATTICE-DOUBLE-CROSS"],
    ["identity chain", { c: "identity", subject: "one", fact: "first fact" }, "LATTICE-DOUBLE-CROSS"],
    ["offline other user", { c: "evidence", subject: "one", fact: "first fact", offline: true, username: "bob", caller: "bob" }, "LATTICE-DOUBLE-CROSS"],
    ["online other user", { c: "evidence", subject: "one", fact: "first fact", caller: "bob" }, "LATTICE-DOUBLE-CROSS"],
    ["offline same user", { c: "evidence", subject: "one", fact: "first fact", offline: true, username: "azuser" }, null],
    ["new id, same doc", { c: "evidence", subject: "one", fact: "first fact", id: "K9" }, "LATTICE-DOUBLE"],
  ];
  for (const [label, x, code] of cases) {
    const o = await r(x);
    assert.equal(o.ok, false, label); if (code) assert.equal(o.code, code, label); else assert.match(o.code, /^LATTICE-DOUBLE/, label);
    assert.equal(o.written, false, label); n++;
  }
  // Idempotent replay by id is allowed; a new document with the same id is a new document.
  const k1 = await r({ c: "evidence", subject: "x", fact: "y", id: "K1" });
  const k2 = await r({ c: "evidence", subject: "x", fact: "y", id: "K1" });
  assert.equal(k1.ok, true); assert.equal(k2.ok, true); assert.equal(k2.replayed, true); n++;
  // Event chains are not document chains.
  assert.equal(DOCUMENT_CHAINS.includes("session"), false);
  assert.equal((await r({ c: "session", fact: "tick" })).ok, true);
  assert.equal((await r({ c: "session", fact: "tick" })).ok, true); n++;
}

// Atomic: 20 concurrent writers of one document -> exactly one write.
{
  const s = doStore();
  const outs = await Promise.all(Array.from({ length: 20 }, (_, i) => append(s, { c: "evidence", subject: "race", fact: "same text", caller: "u" + i })));
  assert.equal(outs.filter((o) => o.ok).length, 1); n++;
}

// No KV fallback: a non-DO store fails closed on document chains (and still writes event chains).
{
  const m = new MemoryStore();
  const f = await append(m, { c: "evidence", subject: "x", fact: "y" });
  assert.equal(f.ok, false); assert.equal(f.code, "LATTICE-DOC-INDEX-UNAVAILABLE"); assert.equal(f.written, false);
  assert.equal((await m.loadRecords("evidence")).length, 0);
  assert.equal((await append(m, { c: "session", fact: "y" })).ok, true); n++;
  const s = doStore();
  s.docClaim = async () => { throw new Error("index down"); };
  assert.equal((await append(s, { c: "library", subject: "x", fact: "y" })).code, "LATTICE-DOC-INDEX-UNAVAILABLE"); n++;
}

// Release on throw: a write that throws after the claim leaves the document free to retry.
{
  const s = doStore();
  const real = s.appendAtomic.bind(s);
  s.appendAtomic = async () => { throw new Error("write blew up"); };
  await assert.rejects(() => append(s, { c: "evidence", subject: "t", fact: "throws once" }), /blew up/);
  s.appendAtomic = real;
  assert.equal((await append(s, { c: "evidence", subject: "t", fact: "throws once" })).ok, true); n++;
}

// Backfill: rows written before the index get claimed; a pre-existing cross double is reported.
{
  const ns = memoryChainWriterNamespace({});
  const s = storeFor({ CHAINLOCK: ns });
  const realClaim = s.docClaim.bind(s);
  s.docClaim = async () => ({ ok: true, fresh: false }); // simulate rows written before LATTICE-DOC-UNIQUE-1.0
  await append(s, { c: "evidence", subject: "old", fact: "legacy row", caller: "alice" });
  await append(s, { c: "library", subject: "old", fact: "legacy row", caller: "bob" });
  await append(s, { c: "identity", subject: "me", fact: "legacy identity", caller: "alice" });
  s.docClaim = realClaim;
  const targets = [{ chain: "evidence", caller: "alice" }, { chain: "library", caller: "bob" }, { chain: "identity", caller: "alice" }, { chain: "session", caller: "alice" }];
  const b1 = await backfillDocumentIndex(s, targets);
  assert.equal(b1.ok, true); assert.equal(b1.indexed, 2); assert.equal(b1.doubles.length, 1); assert.equal(b1.doubles[0].code, "LATTICE-DOUBLE-CROSS"); n++;
  const b2 = await backfillDocumentIndex(s, targets);
  assert.equal(b2.indexed, 0); assert.equal(b2.already, 2); n++;
  assert.equal((await append(s, { c: "evidence", subject: "OLD", fact: " legacy  row", caller: "carol" })).code, "LATTICE-DOUBLE-CROSS"); n++;
  assert.equal((await backfillDocumentIndex(new MemoryStore(), [{ chain: "evidence", caller: "" }])).ok, true); n++;
}
console.log(`ok doc unique: ${n} checks`);
