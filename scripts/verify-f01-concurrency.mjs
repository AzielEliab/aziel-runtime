/**
 * F01 — concurrent append loss (audit 2026-09-17, commit d9dc40f).
 * Failing-before: the audit's racy tip-then-hash / whole-chain overwrite.
 * Passing-after: serialized writers retain every acknowledged event once.
 * Exercises MemoryStore, KvStore, and the CHAINLOCK Durable Object adapter.
 * Author: Aziel Eliab. Identity is Aziel Eliab only.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { canonicalize, sha256Hex, ZERO_HASH } from "../src/session-core.js";
import {
  LEDGER_KIND,
  appendLedger,
  currentLedger,
  loadLedger,
  resetLedger,
  verifyLedger,
} from "../src/fraggate/ledger.js";
import { DurableStore, KvStore, MemoryStore, WORKER_STORE_NOTE, parseJsonl, toJsonl } from "../src/chainlock/store.js";
import { append, composeChainlockStamp, loadChain, verify } from "../src/chainlock/ops.js";
import { memoryChainWriterNamespace } from "../src/chainlock/writer-do.js";
import { memorySessionNamespace } from "../src/session-do.js";

const wrangler = readFileSync(new URL("../wrangler.toml", import.meta.url), "utf8");
assert.match(wrangler, /name = "CHAINLOCK"/);
assert.match(wrangler, /class_name = "ChainWriter"/);
assert.match(wrangler, /tag = "v2"/);
assert.match(wrangler, /new_sqlite_classes = \["ChainWriter"\]/);
assert.match(WORKER_STORE_NOTE, /Durable Object/);
assert.doesNotMatch(WORKER_STORE_NOTE, /OAuth|doi:|framagit/i);

function seqs(rows) {
  return rows.map((x) => x.tip.seq);
}

// --- failing-before: audit ledger script (legacy race) ---
async function legacyRacyAppendLedger(shared, record) {
  const ledger = shared.ledger;
  const seq = ledger.seq + 1;
  const body = {
    kind: LEDGER_KIND,
    seq,
    prev: ledger.tip,
    asked: Boolean(record && record.asked),
    refused: Boolean(record && record.refused),
    code: record && record.code ? String(record.code) : null,
    name: record && record.name ? String(record.name) : null,
    op: record && record.op ? String(record.op) : null,
    gate: record && record.gate ? String(record.gate) : null,
    at: (record && record.at) || new Date().toISOString(),
  };
  const hash = await sha256Hex(canonicalize(body));
  const entry = { ...body, hash };
  const next = {
    kind: LEDGER_KIND,
    seq,
    tip: hash,
    entries: [...ledger.entries, entry],
  };
  shared.ledger = next;
  return { tip: { seq: next.seq }, ledger: next };
}

{
  const shared = { ledger: { kind: LEDGER_KIND, seq: 0, tip: ZERO_HASH, entries: [] } };
  const r = await Promise.all(
    Array.from({ length: 10 }, (_, i) =>
      legacyRacyAppendLedger(shared, { name: `audit-${i}`, op: "health", asked: true, code: "FG-OK" }),
    ),
  );
  assert.deepEqual(
    r.map((x) => x.tip.seq),
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    "legacy ledger race must match audit observation (all seq 1)",
  );
  assert.equal(shared.ledger.entries.length, 1, "legacy ledger race leaves one entry");
}

// --- passing-after: audit ledger script against the fix ---
resetLedger();
{
  const r = await Promise.all(
    Array.from({ length: 10 }, (_, i) =>
      appendLedger({ name: `audit-${i}`, op: "health", asked: true, code: "FG-OK" }),
    ),
  );
  const got = seqs(r).slice().sort((a, b) => a - b);
  assert.deepEqual(got, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  assert.equal(new Set(seqs(r)).size, 10);
  assert.equal(currentLedger().entries.length, 10);
  const names = new Set(currentLedger().entries.map((e) => e.name));
  for (let i = 0; i < 10; i++) assert.ok(names.has(`audit-${i}`), `retained audit-${i}`);
  const checked = await verifyLedger(currentLedger());
  assert.equal(checked.ok, true, JSON.stringify(checked.breaks));
}

// --- failing-before: audit ChainLock script (whole-chain overwrite) ---
async function legacyRacyChainAppend(store, input) {
  const rows = parseJsonl(await store.get("chains/evidence"));
  const prev = rows.length ? rows[rows.length - 1].stamp_sha256 || "GENESIS" : "GENESIS";
  const stamp = await composeChainlockStamp({ c: "evidence", fact: input.fact }, { prev });
  rows.push(stamp);
  await store.put("chains/evidence", toJsonl(rows));
  return { ok: true, stamp };
}

{
  const store = new MemoryStore();
  const writes = await Promise.all(
    Array.from({ length: 10 }, (_, i) => legacyRacyChainAppend(store, { fact: `audit fact ${i}` })),
  );
  assert.equal(writes.filter((x) => x.ok).length, 10);
  assert.equal((await loadChain(store, "evidence")).length, 1, "legacy ChainLock race leaves one entry");
}

// --- passing-after: MemoryStore appendAtomic path ---
{
  const store = new MemoryStore();
  const writes = await Promise.all(
    Array.from({ length: 10 }, (_, i) => append(store, { c: "evidence", fact: `audit fact ${i}` })),
  );
  assert.equal(writes.filter((x) => x.ok).length, 10);
  const rows = await loadChain(store, "evidence");
  assert.equal(rows.length, 10);
  assert.equal(new Set(writes.map((w) => w.seq)).size, 10);
  assert.equal(new Set(writes.map((w) => w.stamp.stamp_sha256)).size, 10);
  const facts = new Set(rows.map((r) => r.fact));
  for (let i = 0; i < 10; i++) assert.ok(facts.has(`audit fact ${i}`));
  const checked = await verify(store, { c: "evidence" });
  assert.equal(checked.ok, true, JSON.stringify(checked.breaks));
  assert.equal(checked.lattice, true);
}

// --- deployed adapter: CHAINLOCK Durable Object (memory namespace) ---
{
  const shared = new Map();
  const ns = memoryChainWriterNamespace({}, shared);
  const store = new DurableStore(ns);
  const writes = await Promise.all(
    Array.from({ length: 10 }, (_, i) => append(store, { c: "evidence", fact: `do fact ${i}` })),
  );
  assert.equal(writes.filter((x) => x.ok).length, 10);
  assert.equal((await loadChain(store, "evidence")).length, 10);
  const checked = await verify(store, { c: "evidence" });
  assert.equal(checked.ok, true, JSON.stringify(checked.breaks));

  const restarted = new DurableStore(memoryChainWriterNamespace({}, shared));
  const again = await loadChain(restarted, "evidence");
  assert.equal(again.length, 10, "DO storage survives writer restart");
  const recheck = await verify(restarted, { c: "evidence" });
  assert.equal(recheck.ok, true);
}

// --- idempotent retry: acknowledged once ---
{
  const store = new DurableStore(memoryChainWriterNamespace());
  const first = await append(store, { c: "evidence", fact: "retry fact", id: "cl_f01_retry" });
  const second = await append(store, { c: "evidence", fact: "retry fact", id: "cl_f01_retry" });
  assert.equal(first.ok, true);
  assert.equal(second.ok, true);
  assert.equal(second.replayed, true);
  assert.equal(first.stamp.stamp_sha256, second.stamp.stamp_sha256);
  assert.equal(first.seq, second.seq);
  assert.equal((await loadChain(store, "evidence")).length, 1);
}

// --- caller namespaces stay separate ---
{
  const store = new DurableStore(memoryChainWriterNamespace());
  await Promise.all([
    append(store, { c: "evidence", fact: "alice-1", caller: "alice" }),
    append(store, { c: "evidence", fact: "bob-1", caller: "bob" }),
  ]);
  assert.equal((await loadChain(store, "evidence", "alice")).length, 1);
  assert.equal((await loadChain(store, "evidence", "bob")).length, 1);
  assert.equal((await loadChain(store, "evidence")).length, 0);
}

// --- KvStore individual-record path (Worker-compatible fallback, same-isolate lock) ---
{
  const map = new Map();
  const kv = {
    async get(key) {
      return map.has(key) ? map.get(key) : null;
    },
    async put(key, value) {
      map.set(key, value);
    },
    async delete(key) {
      map.delete(key);
    },
    async list({ prefix }) {
      return { keys: [...map.keys()].filter((k) => k.startsWith(prefix)).map((name) => ({ name })) };
    },
  };
  const store = new KvStore(kv);
  const writes = await Promise.all(
    Array.from({ length: 10 }, (_, i) => append(store, { c: "evidence", fact: `kv fact ${i}` })),
  );
  assert.equal(writes.filter((x) => x.ok).length, 10);
  assert.equal((await loadChain(store, "evidence")).length, 10);
  assert.ok([...map.keys()].some((k) => /e\/evidence\/1$/.test(k)), "KvStore writes individual records");
  const checked = await verify(store, { c: "evidence" });
  assert.equal(checked.ok, true, JSON.stringify(checked.breaks));
}

// --- FragGate ledger through CHAINLOCK writer + restart ---
{
  resetLedger();
  const shared = new Map();
  const store = new DurableStore(memoryChainWriterNamespace({}, shared));
  const r = await Promise.all(
    Array.from({ length: 10 }, (_, i) =>
      appendLedger({ name: `do-ledger-${i}`, op: "health", asked: true, code: "FG-OK" }, { store }),
    ),
  );
  assert.deepEqual(
    seqs(r)
      .slice()
      .sort((a, b) => a - b),
    [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
  );
  assert.equal(currentLedger().entries.length, 10);
  const checked = await verifyLedger(currentLedger());
  assert.equal(checked.ok, true, JSON.stringify(checked.breaks));

  resetLedger();
  assert.equal(currentLedger().entries.length, 0);
  const revived = new DurableStore(memoryChainWriterNamespace({}, shared));
  const loaded = await loadLedger(revived);
  assert.equal(loaded.entries.length, 10, "ledger DO survives restart");
  assert.equal((await verifyLedger(loaded)).ok, true);
}

// --- HTTP Worker path uses CHAINLOCK when bound ---
{
  resetLedger();
  const handler = (await import("../src/index.js")).default.fetch;
  const env = {
    SESSION: memorySessionNamespace({}),
    CHAINLOCK: memoryChainWriterNamespace(),
  };
  const replies = await Promise.all(
    Array.from({ length: 10 }, (_, i) =>
      handler(
        new Request("https://audit.local/v1/fraggate/call", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ slug: "decisiongate", op: "health", payload: { n: i } }),
        }),
        env,
      ),
    ),
  );
  const bodies = await Promise.all(replies.map((res) => res.json()));
  assert.ok(bodies.every((b) => b.ok && b.ledger_tip && b.ledger_tip.seq));
  assert.equal(new Set(bodies.map((b) => b.ledger_tip.seq)).size, 10);
  const durable = await loadLedger((await import("../src/chainlock/store.js")).storeFor(env));
  assert.equal(durable.entries.length, 10);
  assert.equal((await verifyLedger(durable)).ok, true);
}

console.log("ok f01-concurrency: legacy race reproduced; MemoryStore/KvStore/CHAINLOCK retain 10; verify; restart; idemp");
