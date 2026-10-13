/**
 * RIB-013 / AZRT-EXPECT-SPEC-1.0: verify proves the spec was sealed as stamp #1 before anything ran.
 * Tampered spec, outcome-before-spec, missing/mismatched spec_ref, late spec and verdict-without-spec
 * all fail closed; the honest path passes; chains with no spec verify as before.
 */
import assert from "node:assert/strict";
import { expectSpecOf } from "../src/receipt-guard.js";
import { appendReceipt, applyClose, applyOpen, canonicalize, newSessionId, openSession, sha256Hex, verifyChainStrict } from "../src/session-core.js";
import { verifyExpectSpec } from "../src/expect-spec-verify.js";
import { append, verify } from "../src/chainlock/ops.js";
import { MemoryStore } from "../src/chainlock/store.js";

let n = 0;
const T = "2026-10-12T00:00:00Z";
const codes = (v) => v.errors.map((e) => e.error);
const exp = await expectSpecOf({ spec: { state: "foldlock health ok" }, verdict_criteria: "status 200 and code FG-OK" });
const ex = { intent: { slug: "foldlock", op: "health" }, result: { status: 200 } };
async function honest() {
  const s = openSession({ id: newSessionId(), now: T, version: "test" });
  await applyOpen(s, T, { expect: exp.expect, expect_hash: exp.expect_hash });
  await appendReceipt(s, "exec", ex, T);
  await appendReceipt(s, "exec", ex, T);
  return s;
}
async function reseal(receipts) {
  // Re-hash the chain after an edit so only the spec rule (not the hash link) can catch it.
  let prev = "0".repeat(64);
  const out = [];
  for (const r of receipts) {
    const { hash: _h, ...rest } = { ...r, prev_hash: prev };
    const hash = await sha256Hex(canonicalize(rest));
    out.push({ ...rest, hash });
    prev = hash;
  }
  return out;
}

// Honest path passes, every later receipt names the spec.
{
  const s = await honest();
  const v = await verifyChainStrict(s.receipts);
  assert.equal(v.ok, true, JSON.stringify(v.errors)); assert.equal(v.expect_spec.status, "verified"); assert.equal(v.expect_spec.spec_hash, exp.expect_hash);
  const closed = await applyClose(s, T, { additive: { verdict: { spec: "AZRT-EXPECT-SPEC-1.0", pass: true, notes: null, claimed_by: "caller", computed_by_runtime: false } } });
  assert.equal((await verifyChainStrict(closed.session.receipts)).ok, true); n++;
}
// Tampered spec: expect edited after sealing.
{
  const s = await honest();
  const forged = s.receipts.map((r, i) => (i === 0 ? { ...r, expect: { ...r.expect, verdict_criteria: "anything goes" } } : r));
  assert.ok(codes(await verifyChainStrict(forged)).includes("EXPECT-SPEC-TAMPERED"));
  // Even fully re-sealed (hashes recomputed), the expect/expect_hash mismatch fails closed.
  assert.ok(codes(await verifyChainStrict(await reseal(forged))).includes("EXPECT-SPEC-TAMPERED")); n++;
}
// Outcome before spec: a receipt names a spec_ref but stamp #1 sealed none.
{
  const s = openSession({ id: newSessionId(), now: T, version: "test" });
  await applyOpen(s, T, {});
  await appendReceipt(s, "exec", ex, T, { spec_ref: { spec: "AZRT-EXPECT-SPEC-1.0", receipt_hash: "f".repeat(64), expect_hash: exp.expect_hash } });
  const v = await verifyChainStrict(s.receipts);
  assert.equal(v.ok, false); assert.ok(codes(v).includes("EXPECT-SPEC-REF-UNSEALED")); n++;
  // Spec sealed late (not stamp #1) also refuses.
  const s2 = openSession({ id: newSessionId(), now: T, version: "test" });
  await applyOpen(s2, T, {});
  await appendReceipt(s2, "exec", ex, T, { expect_hash: exp.expect_hash });
  assert.ok(codes(await verifyChainStrict(s2.receipts)).includes("EXPECT-SPEC-LATE")); n++;
}
// Missing and mismatched spec_ref.
{
  const s = await honest();
  const drop = await reseal(s.receipts.map((r, i) => { if (i !== 2) return r; const { spec_ref: _x, ...rest } = r; return rest; }));
  const v = await verifyChainStrict(drop);
  assert.equal(v.ok, false); assert.ok(codes(v).includes("EXPECT-SPEC-REF-MISSING")); n++;
  const wrong = await reseal(s.receipts.map((r, i) => (i === 1 ? { ...r, spec_ref: { ...r.spec_ref, expect_hash: "e".repeat(64) } } : r)));
  assert.ok(codes(await verifyChainStrict(wrong)).includes("EXPECT-SPEC-REF-MISMATCH"));
  const wrongStamp = await reseal(s.receipts.map((r, i) => (i === 1 ? { ...r, spec_ref: { ...r.spec_ref, receipt_hash: "d".repeat(64) } } : r)));
  assert.ok(codes(await verifyChainStrict(wrongStamp)).includes("EXPECT-SPEC-REF-MISMATCH")); n++;
}
// Verdict without a spec refuses; a chain with no spec at all verifies as before.
{
  const s = openSession({ id: newSessionId(), now: T, version: "test" });
  await applyOpen(s, T, {});
  await appendReceipt(s, "exec", ex, T);
  const plain = await verifyChainStrict(s.receipts);
  assert.equal(plain.ok, true); assert.equal(plain.expect_spec.status, "no_spec"); assert.equal(plain.expect_spec.checked, 0);
  await appendReceipt(s, "close", { sealed: true }, T, { verdict: { pass: true } });
  assert.ok(codes(await verifyChainStrict(s.receipts)).includes("EXPECT-VERDICT-NO-SPEC")); n++;
}
// ChainLock chains: stamp #1 spec binds later spec_refs; unsealed spec_ref refuses; plain chains unchanged.
{
  const st = new MemoryStore();
  const a = await append(st, { c: "learn", subject: "spec", fact: "expected state: foldlock health ok", expect_hash: exp.expect_hash });
  assert.equal(a.ok, true, JSON.stringify(a));
  const b = await append(st, { c: "learn", subject: "outcome", fact: "foldlock health 200", spec_ref: { id: a.stamp.id, expect_hash: exp.expect_hash } });
  assert.equal(b.ok, true);
  let v = await verify(st, { c: "learn" });
  assert.equal(v.ok, true, JSON.stringify(v.breaks)); assert.equal(v.chains[0].expect_spec.status, "verified");
  await append(st, { c: "learn", subject: "outcome2", fact: "pointed elsewhere", spec_ref: { id: "cl_other", expect_hash: exp.expect_hash } });
  v = await verify(st, { c: "learn" });
  assert.equal(v.ok, false); assert.ok(v.breaks.some((x) => x.reason === "EXPECT-SPEC-REF-MISMATCH")); n++;
  const st2 = new MemoryStore();
  await append(st2, { c: "learn", subject: "first", fact: "no spec here" });
  await append(st2, { c: "learn", subject: "outcome", fact: "claims a spec", spec_ref: { id: "cl_x", expect_hash: exp.expect_hash } });
  v = await verify(st2, { c: "learn" });
  assert.ok(v.breaks.some((x) => x.reason === "EXPECT-SPEC-REF-UNSEALED")); n++;
  const st3 = new MemoryStore();
  await append(st3, { c: "learn", subject: "a", fact: "plain a" });
  await append(st3, { c: "learn", subject: "b", fact: "plain b" });
  v = await verify(st3, { c: "learn" });
  assert.equal(v.ok, true); assert.equal(v.chains[0].expect_spec.status, "no_spec"); n++;
}
// Pure walker: empty and null are no_spec, never a fake pass of a spec.
assert.equal((await verifyExpectSpec([])).status, "no_spec");
assert.doesNotMatch(JSON.stringify(await verifyExpectSpec([])), /signed|signature/i); n++;
console.log(`ok expect spec verify (RIB-013): ${n} checks`);
