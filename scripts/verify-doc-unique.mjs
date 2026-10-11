/**
 * LATTICE-DOC-UNIQUE-1.0: one document is stored once. Content hash over normalized text
 * (NFC, trim, collapsed whitespace, case-fold), not chain or kind. Atomic claim in the Durable
 * Object; no KV fallback (fail closed); claim released when a write throws; backfill indexes
 * rows written before the index. Cases include AZBot's probe257.
 */
import assert from "node:assert/strict";
import { append, backfillDocumentIndex, backfillDocumentPage, listDocumentWriters, documentContentHash, normalizeDocText, DOCUMENT_CHAINS } from "../src/chainlock/ops.js";
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

// AZBot probe2: NFKC, \p{Cf} (ZWSP, ZWJ, soft hyphen), fullwidth, NFD, nbsp, case, chains, users.
{
  const s = doStore();
  const base = { c: "evidence", subject: "one", fact: "first fact café" };
  assert.equal((await append(s, base)).ok, true); n++;
  const refused = [
    ["exact same", base],
    ["trailing space", { ...base, fact: base.fact + " " }],
    ["case", { ...base, subject: "ONE" }],
    ["internal ws run", { ...base, fact: "first   fact\tcafé" }],
    ["NFD", { ...base, fact: base.fact.normalize("NFD") }],
    ["zero-width space", { ...base, fact: "first \u200Bfact café" }],
    ["zero-width joiner in word", { ...base, fact: "fi\u200Drst fact café" }],
    ["soft hyphen", { ...base, fact: "fi\u00ADrst fact café" }],
    ["fullwidth (NFKC)", { ...base, fact: "ｆirst fact café" }],
    ["fullwidth word", { ...base, subject: "ＯＮＥ", fact: "ＦＩＲＳＴ fact café" }],
    ["nbsp", { ...base, fact: "first\u00A0fact café" }],
    ["U+034F combining grapheme joiner", { ...base, fact: "fi\u034Frst fact café" }],
    ["U+FE0F variation selector", { ...base, fact: "first fact\uFE0F café" }],
    ["U+2060 word joiner", { ...base, fact: "first\u2060 fact café" }],
    ["other kind", { ...base, k: "note" }],
    ["other chain library", { ...base, c: "library" }],
    ["other chain identity", { ...base, c: "identity" }],
    ["other user", { ...base, caller: "bob" }],
    ["offline+username", { ...base, offline: true, username: "bob", caller: "bob" }],
    ["offline same user other case", { ...base, offline: true, username: "BOB", caller: "BOB" }],
  ];
  for (const [label, x] of refused) {
    const o = await append(s, x);
    assert.equal(o.ok, false, "probe2 " + label); assert.match(o.code, /^LATTICE-DOUBLE/, label); n++;
  }
  assert.equal((await append(s, { ...base, fact: "second fact" })).ok, true, "control");
  assert.equal((await append(s, { ...base, fact: "first fact café." })).ok, true, "punctuation differs"); n++;
}

// Paged, resumable backfill (operator entry point).
{
  const s = doStore();
  const realClaim = s.docClaim.bind(s);
  s.docClaim = async () => ({ ok: true, fresh: false }); // rows written before the index
  for (let i = 0; i < 7; i++) await append(s, { c: "evidence", subject: "legacy", fact: "row " + i, caller: "alice" });
  await append(s, { c: "library", subject: "legacy", fact: "row 3" }); // a pre-existing cross double
  s.docClaim = realClaim;
  let cur = 1, pages = 0, indexed = 0;
  for (;;) {
    const p = await backfillDocumentPage(s, { chain: "evidence", caller: "alice", cursor: cur, limit: 3 });
    assert.equal(p.ok, true); pages++; indexed += p.indexed;
    if (p.done) break;
    assert.ok(p.next_cursor > cur); cur = p.next_cursor;
  }
  assert.equal(pages, 3); assert.equal(indexed, 7); n++;
  const again = await backfillDocumentPage(s, { chain: "evidence", caller: "alice", cursor: 4, limit: 100 });
  assert.equal(again.indexed, 0); assert.equal(again.already, 4); assert.equal(again.done, true); n++; // resumable, idempotent
  const lib = await backfillDocumentPage(s, { chain: "library", cursor: 1, limit: 10 });
  assert.equal(lib.doubles.length, 1); assert.equal(lib.doubles[0].code, "LATTICE-DOUBLE-CROSS"); n++;
  assert.equal((await append(s, { c: "evidence", subject: "LEGACY", fact: "Row 5", caller: "zed" })).code, "LATTICE-DOUBLE-CROSS"); n++;
  assert.equal((await backfillDocumentPage(s, { chain: "session", cursor: 1 })).code, "DOC-BACKFILL-BAD-QUERY");
  assert.equal((await backfillDocumentPage(s, { chain: "evidence", cursor: 0 })).code, "DOC-BACKFILL-BAD-QUERY");
  assert.equal((await backfillDocumentPage(new MemoryStore(), { chain: "evidence" })).code, "LATTICE-DOC-INDEX-UNAVAILABLE"); n++;
}

// Admin route: token in a header only, POST only.
{
  const { default: worker } = await import("../src/index.js");
  const env = { CHAINLOCK: memoryChainWriterNamespace({}), RUNTIME_TOKEN: "t".repeat(40) };
  const u = "https://x.example/v1/admin/doc-index/backfill?c=evidence&cursor=1&limit=10";
  assert.equal((await worker.fetch(new Request(u, { method: "POST" }), env, {})).status, 401);
  { const q = await worker.fetch(new Request(u + "&token=" + "t".repeat(40), { method: "POST" }), env, {}); assert.ok(q.status === 400 || q.status === 401, "token in query refused"); }
  assert.equal((await worker.fetch(new Request(u, { method: "POST", headers: { authorization: "Bearer wrong" } }), env, {})).status, 401);
  assert.equal((await worker.fetch(new Request(u), env, {})).status, 405);
  const ok = await worker.fetch(new Request(u, { method: "POST", headers: { authorization: "Bearer " + "t".repeat(40) } }), env, {});
  assert.equal(ok.status, 200); const b = await ok.json(); assert.equal(b.ok, true); assert.equal(b.done, true); n++;
}
// DOC-WRITERS-1.0: the backfill enumerates caller chains itself (no hand-made caller list).
{
  const s = doStore();
  await append(s, { c: "evidence", subject: "a", fact: "alice doc", caller: "alice" });
  await append(s, { c: "library", subject: "b", fact: "bob doc", caller: "bob" });
  await append(s, { c: "evidence", subject: "p", fact: "public doc" });
  await append(s, { c: "evidence", subject: "a2", fact: "alice doc 2", caller: "alice" });
  await append(s, { c: "session", fact: "not a document chain", caller: "carol" });
  const all = [];
  let cur = 0;
  for (;;) {
    const w = await listDocumentWriters(s, { cursor: cur, limit: 1 });
    assert.equal(w.ok, true);
    all.push(...w.writers);
    if (w.done) break;
    cur = w.next_cursor;
  }
  const keys = all.map((w) => w.caller + "|" + w.chain).sort();
  assert.deepEqual(keys, ["alice|evidence", "bob|library", "|evidence", "|identity", "|library"]); n++;
  // Runbook loop: enumerate, then backfill every pair page by page; all done, nothing new left.
  let pages = 0;
  for (const w of all) {
    let c2 = 1;
    for (;;) {
      const p = await backfillDocumentPage(s, { chain: w.chain, caller: w.caller, cursor: c2, limit: 1 });
      assert.equal(p.ok, true); pages++;
      if (p.done) break;
      c2 = p.next_cursor;
    }
  }
  assert.ok(pages >= 5); n++;
  assert.equal((await listDocumentWriters(new MemoryStore())).code, "LATTICE-DOC-INDEX-UNAVAILABLE"); n++;
  const { default: worker } = await import("../src/index.js");
  const env = { CHAINLOCK: memoryChainWriterNamespace({}), RUNTIME_TOKEN: "t".repeat(40) };
  const wu = "https://x.example/v1/admin/doc-index/writers?cursor=0&limit=50";
  assert.equal((await worker.fetch(new Request(wu), env, {})).status, 401);
  const ok = await worker.fetch(new Request(wu, { headers: { authorization: "Bearer " + "t".repeat(40) } }), env, {});
  assert.equal(ok.status, 200); assert.equal((await ok.json()).writers.length, 3); n++;
}
{
  const { readFileSync } = await import("node:fs");
  const doc = readFileSync(new URL("../docs/DOC-INDEX-BACKFILL.md", import.meta.url), "utf8");
  assert.match(doc, /\/v1\/admin\/doc-index\/backfill/); assert.match(doc, /Authorization: Bearer/); assert.match(doc, /next_cursor/); assert.match(doc, /doc-index\/writers/); assert.ok(!/\$CALLERS/.test(doc), "no hand-made caller list"); n++;
}
console.log(`ok doc unique: ${n} checks`);
