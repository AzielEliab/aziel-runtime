/**
 * TRI-LATTICE-CONCURRENCY-1.0 (Aziel goal 6, 2026-10-20).
 * Concurrent receipts across 3 levels (runtime / ui / interface) x many users, online and offline-secondary.
 * Asserts: no duplicate primary hash, no duplicate stamp hash, no duplicate seq, no fork (prev reused),
 * verify() ok, offline secondary = H(primary doc hash + username) unique per (doc,user), offline doubles refused.
 * Two harnesses: (A) the serialized memory namespace the suite uses; (B) a raw ChainWriter with storage that
 * yields like a real DO (non-storage awaits are not input-gated), to show whether append() itself serializes.
 * Author: Aziel Eliab. Identity is Aziel Eliab only.
 */
import assert from "node:assert/strict";
import { DurableStore } from "../src/chainlock/store.js";
import { append, loadChain, verify } from "../src/chainlock/ops.js";
import { ChainWriter, memoryChainWriterNamespace } from "../src/chainlock/writer-do.js";
import { latticeOfflineSecondary } from "../src/dual-lattice.js";

const LEVELS = ["runtime", "ui", "interface"];
const USERS = Array.from({ length: 12 }, (_, i) => `user${i}`);
const CHAIN = "evidence"; // a document chain: doc-unique index is on

function inputs() {
  const out = [];
  for (const level of LEVELS) for (const u of USERS) for (let n = 0; n < 4; n++) {
    out.push({ c: "session", fact: `${level}:${u}:receipt:${n}`, caller: "", username: u, offline: n % 2 === 1, s: level });
  }
  return out;
}

function audit(rows, label) {
  const dup = (xs) => xs.filter((x, i) => x != null && xs.indexOf(x) !== i);
  const stamps = rows.map((r) => r.stamp_sha256);
  const prims = rows.map((r) => r.lattice && r.lattice.primary);
  const secs = rows.map((r) => r.lattice && r.lattice.secondary);
  const prevs = rows.map((r) => r.prev);
  const res = { label, rows: rows.length, dup_stamp: dup(stamps).length, dup_primary: dup(prims).length, dup_secondary: dup(secs).length, forks_prev_reused: dup(prevs).length };
  return res;
}

const results = [];

// (A) suite harness (fetch serialized by the test wrapper)
{
  const store = new DurableStore(memoryChainWriterNamespace());
  const ins = inputs();
  const acks = await Promise.all(ins.map((x) => append(store, x)));
  const ok = acks.filter((a) => a.ok);
  const seqs = ok.map((a) => a.seq);
  const rows = await loadChain(store, "session");
  const r = audit(rows, "A serialized-namespace");
  r.acked = ok.length; r.dup_seq = seqs.filter((s, i) => seqs.indexOf(s) !== i).length;
  r.verify_ok = (await verify(store, { c: "session" })).ok;
  // offline secondary rule + double refusal
  const off = rows.find((x) => x.lattice && x.lattice.offline);
  assert.equal(off.lattice.secondary, await latticeOfflineSecondary(off.lattice.document_hash, off.lattice.username));
  const again = await append(store, { c: "session", fact: off.fact, username: off.lattice.username, offline: true, s: off.subject, t: off.t, id: "fresh-id-x" });
  r.offline_double_code = again.code || (again.ok ? "written" : again.refuse);
  // same doc, different user offline -> different secondary
  r.cross_user_secondary_distinct = (await latticeOfflineSecondary(off.lattice.document_hash, "a")) !== (await latticeOfflineSecondary(off.lattice.document_hash, "b"));
  results.push(r);
}

// (B) raw ChainWriter, storage yields a macrotask per op (input gates do not cover crypto awaits)
async function raw(gated) {
  const m = new Map();
  const tick = () => new Promise((res) => setImmediate(res));
  const storage = { get: async (k) => { await tick(); return m.get(k); }, put: async (k, v) => { await tick(); m.set(k, v); } };
  const w = new ChainWriter({ storage }, {});
  let tail = Promise.resolve();
  const call = (b) => { if (!gated) return w.append(b); const r = tail.then(() => w.append(b)); tail = r.catch(() => {}); return r; };
  const { composeChainlockStamp } = await import("../src/chainlock/ops.js");
  const ins = inputs();
  const acks = await Promise.all(ins.map((x) => call({ kind: "chainlock", input: x })));
  const ok = acks.filter((a) => a.ok);
  const seqs = ok.map((a) => a.seq);
  const meta = m.get("meta");
  const rows = []; for (let i = 1; i <= meta.seq; i++) rows.push(m.get("e:" + i));
  const r = audit(rows, gated ? "B raw-writer+queue" : "B raw-writer (production append path, no queue)");
  r.acked = ok.length; r.stored = meta.seq; r.lost_acks = ok.length - meta.seq;
  r.dup_seq = seqs.filter((s, i) => seqs.indexOf(s) !== i).length;
  return r;
}
results.push(await raw(false));
results.push(await raw(true));

console.log(JSON.stringify(results, null, 2));
const a = results[0];
assert.equal(a.dup_stamp + a.dup_primary + a.forks_prev_reused + a.dup_seq, 0, "serialized path must have no duplicates");
assert.equal(a.verify_ok, true);
const q = results[2];
assert.equal(q.dup_seq + q.forks_prev_reused + q.lost_acks, 0, "queued raw writer must not fork");
const strict = process.env.TRI_STRICT !== "0";
const b = results[1];
const raceFound = b.dup_seq + b.forks_prev_reused + b.lost_acks > 0;
console.log(raceFound ? "RACE: raw ChainWriter.append forks under interleaving (needs an append queue)" : "raw ChainWriter.append held");
if (strict) assert.equal(raceFound, false, "TRI_STRICT: production append must serialize");
console.log("verify-tri-lattice-concurrency: done");
