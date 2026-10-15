/**
 * RIB-044 / AZRT-RESUME-ANCHOR-1.0: freeze head queued to ChainLock "session" (witnessed chain);
 * resume and cold-isolate exec recompute the chain; edits/truncation after freeze refuse
 * RESUME-ANCHOR-MISMATCH with a sealed refusal; no covering statement = not_checked; strict refuses.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import { RuntimeSession } from "../src/session-do.js";
import { memoryChainWriterNamespace } from "../src/chainlock/writer-do.js";
import { storeFor } from "../src/chainlock/store.js";
import { resetAnchorMemo, seedAnchorMemo } from "../src/anchor.js";
import { newSessionId, verifyChainStrict, appendReceipt } from "../src/session-core.js";
import { resumeCheck, resumeIndexKey } from "../src/resume-anchor.js";
import { append as clAppend } from "../src/chainlock/ops.js";

let n = 0;
const env = { CHAINLOCK: memoryChainWriterNamespace({}) };
function storage() {
  const m = new Map();
  return { m, get: async (k) => structuredClone(m.get(k)), put: async (k, v) => { m.set(k, structuredClone(v)); }, setAlarm: async () => {}, deleteAlarm: async () => {} };
}
async function call(obj, action, body, method = "POST") {
  const res = await obj.fetch(new Request("https://do/" + action, method === "GET" ? { method } : { method, headers: { "content-type": "application/json" }, body: JSON.stringify(body || {}) }));
  return { status: res.status, data: await res.json() };
}
const exec = (o) => call(o, "intent", { slug: "foldlock", op: "health", payload: {}, payload_text: "{}" });
async function newPaused(policy) {
  const st = storage();
  const o = new RuntimeSession({ storage: st }, env);
  assert.equal((await call(o, "open", { id: newSessionId() })).status, 200);
  if (policy) await call(o, "policy", policy);
  const p = await call(o, "pause");
  assert.equal(p.status, 200, JSON.stringify(p.data));
  return { st, o, p };
}
function witness(seq, h) {
  // A verified-log view whose newest statement covers ChainLock "session" through seq.
  seedAnchorMemo("anchors", { ok: true, n: 1, latest: { statement: { n: 1 }, statement_hash: "s".repeat(64) }, entries: [{ statement: { n: 1, heads: { chains: [{ c: "session", seq, h }] } }, statement_hash: "s".repeat(64) }] });
}
resetAnchorMemo();
seedAnchorMemo("anchors", { ok: true, n: 0, entries: [] });

// 1) pause records freeze receipt + freeze_head, queued on ChainLock "session".
const a = await newPaused();
const fz = a.p.data.freeze;
assert.equal(a.p.data.receipt.event, "freeze");
assert.equal(fz.queue.queued, true);
assert.equal(fz.queue.cl_chain, "session");
assert.ok(fz.freeze_head.chain.startsWith("session:sess_"));
const row = (await storeFor(env).chainRow("session", fz.queue.cl_seq)).row;
assert.ok(row.fact.includes(fz.freeze_head.hash)); n++;

// 2) paused session refuses exec.
assert.equal((await exec(a.o)).data.code, "SESSION-PAUSED"); n++;

// 3) clean resume without a covering statement: allowed, anchor not_checked (never a pass), recorded.
let r = await call(a.o, "resume");
assert.equal(r.status, 200, JSON.stringify(r.data));
assert.equal(r.data.resume.anchor.level, "not_checked");
assert.equal(r.data.receipt.event, "resume");
assert.equal(r.data.receipt.payload.anchor.level, "not_checked");
assert.equal((await exec(a.o)).status, 200); n++;

// 4) clean resume with a covering witness statement: anchor witnessed, recorded in the resume receipt.
const b = await newPaused();
const meta = await storeFor(env).chainMeta("session");
witness(meta.seq, meta.tip);
r = await call(b.o, "resume");
assert.equal(r.status, 200, JSON.stringify(r.data));
assert.equal(r.data.resume.anchor.level, "witnessed");
assert.equal(r.data.receipt.payload.anchor.level, "witnessed"); n++;
seedAnchorMemo("anchors", { ok: true, n: 0, entries: [] });

// 5) edit after freeze -> RESUME-ANCHOR-MISMATCH + sealed refused receipt.
const c = await newPaused();
const sc = c.st.m.get("session");
sc.receipts[0].payload = { ...(sc.receipts[0].payload || {}), tampered: true };
r = await call(c.o, "resume");
assert.equal(r.status, 409);
assert.equal(r.data.code, "RESUME-ANCHOR-MISMATCH");
assert.equal(r.data.refused_receipt.sealed, true);
const after = c.st.m.get("session").receipts.at(-1);
assert.equal(after.event, "refused");
assert.equal(after.payload.refusal.code, "RESUME-ANCHOR-MISMATCH"); n++;

// 6) tail truncation after freeze -> refused (also when freeze copy is rewritten to match: ChainLock row is the truth).
const d = await newPaused();
const sd = d.st.m.get("session");
sd.receipts.splice(-1, 1);
r = await call(d.o, "resume");
assert.equal(r.data.code, "RESUME-ANCHOR-MISMATCH");
const d2 = await newPaused();
const sd2 = d2.st.m.get("session");
sd2.receipts.splice(-1, 1);
const last = sd2.receipts.at(-1);
sd2.freeze.freeze_head = { ...sd2.freeze.freeze_head, seq: last.seq, hash: last.hash };
r = await call(d2.o, "resume");
assert.equal(r.data.code, "RESUME-ANCHOR-MISMATCH");
assert.match(r.data.reason, /queued stamp/); n++;

// 7) strict mode: no covering statement -> RESUME-ANCHOR-NOT-CHECKED.
const e = await newPaused({ resume_strict: true });
r = await call(e.o, "resume");
assert.equal(r.data.code, "RESUME-ANCHOR-NOT-CHECKED");
assert.equal(r.data.refused_receipt.sealed, true); n++;

// 8) cold isolate: resumed session, row edited in storage, new instance -> exec refused.
const f = await newPaused();
assert.equal((await call(f.o, "resume")).status, 200);
const sf = f.st.m.get("session");
sf.receipts[1].payload = { forged: 1 };
const cold = new RuntimeSession({ storage: f.st }, env);
r = await exec(cold);
assert.equal(r.status, 409);
assert.equal(r.data.code, "RESUME-ANCHOR-MISMATCH");
const g = await newPaused();
await call(g.o, "resume");
assert.equal((await exec(new RuntimeSession({ storage: g.st }, env))).status, 200); n++;

// 9) close queues its own head; old fixture verifies unchanged.
const h = await newPaused();
await call(h.o, "resume");
const cl = await call(h.o, "close");
assert.equal(cl.status, 200);
const sh = h.st.m.get("session");
assert.equal(sh.freeze.reason, "close");
assert.equal(sh.freeze.freeze_head.hash, sh.receipts.at(-1).hash);
assert.equal(sh.freeze.queue.queued, true);
const fx = JSON.parse(fs.readFileSync(new URL("../fixtures/session-receipt-chain.json", import.meta.url), "utf8"));
assert.equal((await verifyChainStrict(fx.receipts)).ok, true); n++;

// 10) no CHAINLOCK: freeze not queued, resume says not_checked.
const bare = new RuntimeSession({ storage: storage() }, {});
await call(bare, "open", { id: newSessionId() });
const bp = await call(bare, "pause");
assert.equal(bp.data.freeze.queue.queued, false);
assert.equal((await call(bare, "resume")).data.resume.anchor.level, "not_checked"); n++;

assert.match(fs.readFileSync(new URL("../docs/RESUME-ANCHOR.md", import.meta.url), "utf8"), /not_checked/); n++;
// ---- AZBot BLOCKER regressions (#291 review). Each attack edits session storage only. ----
const expectMismatch = async (o, label) => {
  const res = await call(o, "resume");
  assert.equal(res.status, 409, `${label}: ${JSON.stringify(res.data)}`);
  assert.equal(res.data.code, "RESUME-ANCHOR-MISMATCH", label);
  return res;
};
// A) queued:false + truncate -> MISMATCH (was 200 not_checked).
const A1 = await newPaused();
{ const ss = A1.st.m.get("session"); ss.freeze.queue.queued = false; ss.receipts.splice(-1, 1); ss.freeze.freeze_head = { ...ss.freeze.freeze_head, seq: ss.receipts.at(-1).seq, hash: ss.receipts.at(-1).hash }; }
await expectMismatch(A1.o, "A queued:false");
// A') queue deleted (no truncation) -> MISMATCH.
const A2 = await newPaused();
delete A2.st.m.get("session").freeze.queue;
await expectMismatch(A2.o, "A queue deleted"); n++;

// B) delete session.freeze + paused=false -> resume (non-strict and strict) MISMATCH (was 200 no_freeze).
for (const strict of [false, true]) {
  const B = await newPaused(strict ? { resume_strict: true } : null);
  const ss = B.st.m.get("session"); delete ss.freeze; ss.paused = false;
  const res = await call(B.o, "resume", { strict });
  assert.equal(res.status, 409, JSON.stringify(res.data));
  assert.equal(res.data.code, "RESUME-ANCHOR-MISMATCH");
}
// B') also truncate the freeze row; resume and cold exec both refuse.
const B2 = await newPaused();
{ const ss = B2.st.m.get("session"); delete ss.freeze; ss.paused = false; ss.receipts.splice(-1, 1); }
await expectMismatch(B2.o, "B truncate freeze row");
const B3 = await newPaused();
{ const ss = B3.st.m.get("session"); delete ss.freeze; ss.paused = false; ss.receipts.splice(-1, 1); }
r = await exec(new RuntimeSession({ storage: B3.st }, env));
assert.equal(r.status, 409, JSON.stringify(r.data));
assert.equal(r.data.code, "RESUME-ANCHOR-MISMATCH");
// B'') without CHAINLOCK: session.freeze deleted but the chain has the freeze row -> MISMATCH (fix 3).
{
  const st = storage(); const o = new RuntimeSession({ storage: st }, {});
  await call(o, "open", { id: newSessionId() }); await call(o, "pause");
  const ss = st.m.get("session"); delete ss.freeze; ss.paused = false;
  r = await exec(new RuntimeSession({ storage: st }, {}));
  assert.equal(r.data.code, "RESUME-ANCHOR-MISMATCH", JSON.stringify(r.data));
}
// Strict never accepts no_freeze on /resume.
{
  const st = storage(); const o = new RuntimeSession({ storage: st }, env);
  await call(o, "open", { id: newSessionId() });
  r = await call(o, "resume", { strict: true });
  assert.equal(r.data.code, "RESUME-ANCHOR-NOT-CHECKED", JSON.stringify(r.data));
  // A never-frozen session still execs from a cold instance.
  assert.equal((await exec(new RuntimeSession({ storage: st }, env))).status, 200);
}
n++;

// C) row appended while paused (built with appendReceipt) -> MISMATCH (was 200).
const C1 = await newPaused();
{ const ss = C1.st.m.get("session"); await appendReceipt(ss, "exec", { intent: { slug: "foldlock", op: "health" }, result: { status: 200 } }, "2026-10-13T00:00:00Z"); }
await expectMismatch(C1.o, "C appended while paused");
// C') appended while paused AND paused=false -> cold exec refused (no resume receipt follows the freeze).
const C2 = await newPaused();
{ const ss = C2.st.m.get("session"); await appendReceipt(ss, "exec", { intent: { slug: "foldlock", op: "health" }, result: { status: 200 } }, "2026-10-13T00:00:00Z"); ss.paused = false; }
r = await exec(new RuntimeSession({ storage: C2.st }, env));
assert.equal(r.data.code, "RESUME-ANCHOR-MISMATCH", JSON.stringify(r.data));
// A sealed resume refusal while paused does not brick a later clean resume.
const C3 = await newPaused();
assert.equal((await call(C3.o, "resume", { strict: true })).data.code, "RESUME-ANCHOR-NOT-CHECKED");
r = await call(C3.o, "resume");
assert.equal(r.status, 200, JSON.stringify(r.data));
assert.equal((await exec(new RuntimeSession({ storage: C3.st }, env))).status, 200);
n++;

// Fix 1: the session-keyed index exists in the ChainLock store and names the newest freeze stamp.
{
  const X = await newPaused();
  const ss = X.st.m.get("session");
  const idx = await storeFor(env).get(resumeIndexKey(ss.id));
  assert.equal(idx.cl_seq, ss.freeze.queue.cl_seq);
  assert.equal(idx.stamp_sha256, ss.freeze.queue.stamp_sha256);
  assert.equal(idx.freeze_head.hash, ss.receipts.at(-1).hash);
}
n++;

// Fix 5: witnessed requires every ChainLock link from the freeze stamp to the witnessed head.
{
  const W = await newPaused();
  const ss = W.st.m.get("session");
  for (let i = 0; i < 3; i++) await clAppend(env, { c: "session", s: "filler", f: "filler stamp " + i, k: "note" });
  const m = await storeFor(env).chainMeta("session");
  witness(m.seq, m.tip);
  const good = await resumeCheck(structuredClone(ss), env, { storeFor });
  assert.equal(good.anchor.level, "witnessed");
  assert.equal(good.anchor.walked_rows, m.seq - ss.freeze.queue.cl_seq + 1);
  // Same end rows, a middle row swapped: the walk must catch it.
  const mid = ss.freeze.queue.cl_seq + 1;
  const tampered = (e) => { const real = storeFor(e); return new Proxy(real, { get(t, k) {
    if (k === "chainRows") return async (c, from, lim) => { const got = await t.chainRows(c, from, lim); return { ...got, rows: got.rows.map((x) => x.seq === mid ? { seq: x.seq, row: { ...x.row, fact: "swapped" } } : x) }; };
    const v = t[k]; return typeof v === "function" ? v.bind(t) : v; } }); };
  await assert.rejects(resumeCheck(structuredClone(ss), env, { storeFor: tampered }), (e) => e.code === "RESUME-ANCHOR-MISMATCH" && /path broken/.test(e.extra.reason));
  seedAnchorMemo("anchors", { ok: true, n: 0, entries: [] });
}
n++;

const doc2 = fs.readFileSync(new URL("../docs/RESUME-ANCHOR.md", import.meta.url), "utf8");
assert.match(doc2, /session storage only/);
assert.match(doc2, /closed/); n++;
// ---- AZBot review 2 (#291 @ 9355fb15): forged resume-refusal rows; index rolled back to an older stamp ----
const forgeRefusal = async (ss, refusal) => appendReceipt(ss, "refused", { refusal }, "2026-10-13T00:00:00Z", { attempt_link: { outcome: "failed" } });
const fhOf = (ss) => ({ chain: ss.freeze.freeze_head.chain, seq: ss.freeze.freeze_head.seq, hash: ss.freeze.freeze_head.hash });
// R1) made-up refused/op:resume row with 5 KB of data, appended while paused -> MISMATCH (was 200 not_checked).
{
  const R = await newPaused();
  const ss = R.st.m.get("session");
  await forgeRefusal(ss, { spec: "AZRT-REFUSAL-RECEIPT-1.0", code: "RESUME-ANCHOR-MISMATCH", status: 409, op: "resume", executed: false, resume: { spec: "AZRT-RESUME-ANCHOR-1.0", freeze_head: fhOf(ss), reason: "x", blob: "A".repeat(5000) } });
  const res = await expectMismatch(R.o, "R1 5KB forged refusal");
  assert.match(res.data.reason, /not a sealed refusal shape/);
}
// R2) perfectly shaped forged refusal (session storage only) -> MISMATCH: hash not in the ChainLock index.
{
  const R = await newPaused();
  const ss = R.st.m.get("session");
  await forgeRefusal(ss, { spec: "AZRT-REFUSAL-RECEIPT-1.0", code: "RESUME-ANCHOR-NOT-CHECKED", status: 409, op: "resume", executed: false, resume: { spec: "AZRT-RESUME-ANCHOR-1.0", freeze_head: fhOf(ss), reason: "forged" } });
  const res = await expectMismatch(R.o, "R2 shaped forged refusal");
  assert.match(res.data.reason, /differ from the ChainLock index/);
}
// R3) shape checks: wrong freeze_head, wrong code, executed:true, extra key -> MISMATCH even without CHAINLOCK.
for (const mut of [
  (f, fh) => { f.resume.freeze_head = { ...fh, seq: fh.seq - 1 }; },
  (f) => { f.code = "SOMETHING-ELSE"; },
  (f) => { f.executed = true; },
  (f) => { f.extra = 1; },
]) {
  const st = storage(); const o = new RuntimeSession({ storage: st }, {});
  await call(o, "open", { id: newSessionId() }); await call(o, "pause");
  const ss = st.m.get("session");
  const f = { spec: "AZRT-REFUSAL-RECEIPT-1.0", code: "RESUME-ANCHOR-MISMATCH", status: 409, op: "resume", executed: false, resume: { spec: "AZRT-RESUME-ANCHOR-1.0", freeze_head: fhOf(ss), reason: "x" } };
  mut(f, fhOf(ss));
  await forgeRefusal(ss, f);
  assert.equal((await call(o, "resume")).data.code, "RESUME-ANCHOR-MISMATCH");
}
// R4) caps without CHAINLOCK: 17 shaped rows -> MISMATCH; legit sealed refusals are indexed and accepted.
{
  const st = storage(); const o = new RuntimeSession({ storage: st }, {});
  await call(o, "open", { id: newSessionId() }); await call(o, "pause");
  const ss = st.m.get("session");
  for (let i = 0; i < 17; i++) await forgeRefusal(ss, { spec: "AZRT-REFUSAL-RECEIPT-1.0", code: "RESUME-ANCHOR-NOT-CHECKED", status: 409, op: "resume", executed: false, resume: { spec: "AZRT-RESUME-ANCHOR-1.0", freeze_head: fhOf(ss), reason: "x" } });
  const res = await call(o, "resume");
  assert.equal(res.data.code, "RESUME-ANCHOR-MISMATCH");
  assert.match(res.data.reason, /too many/);
}
{
  const L = await newPaused();
  for (let i = 0; i < 2; i++) assert.equal((await call(L.o, "resume", { strict: true })).data.code, "RESUME-ANCHOR-NOT-CHECKED");
  const ss = L.st.m.get("session");
  const idx = await storeFor(env).get(resumeIndexKey(ss.id));
  assert.deepEqual(idx.refusals, ss.receipts.slice(-2).map((x) => x.hash));
  assert.equal((await call(L.o, "resume")).status, 200);
  assert.equal((await exec(new RuntimeSession({ storage: L.st }, env))).status, 200);
}
n++;
// R5) index pointed at an older stamp + session rolled back to match -> MISMATCH (newer stamp found).
{
  const O = await newPaused();
  const old = structuredClone(O.st.m.get("session"));
  const oldIdx = structuredClone(await storeFor(env).get(resumeIndexKey(old.id)));
  assert.equal((await call(O.o, "resume")).status, 200);
  assert.equal((await call(O.o, "pause")).status, 200);
  await storeFor(env).put(resumeIndexKey(old.id), oldIdx);
  O.st.m.set("session", old);
  const res = await call(new RuntimeSession({ storage: O.st }, env), "resume");
  assert.equal(res.data.code, "RESUME-ANCHOR-MISMATCH", JSON.stringify(res.data));
  assert.match(res.data.reason, /older freeze stamp/);
}
n++;
resetAnchorMemo();
console.log(`ok anchor-gated resume (RIB-044): ${n} checks`);
