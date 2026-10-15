/**
 * RIB-016 / AZRT-EVIDENCE-FIELDS-1.0: exec receipts bind policy_hash + policy_receipt_ref (fail closed);
 * optional evidence fields are sealed unchecked and verified one by one; integrity never confers trust.
 */
import assert from "node:assert/strict";
import { appendReceipt, applyOpen, applyPolicy, canonicalize, commitExec, newSessionId, openSession, recordIntent, sha256Hex, verifyChainStrict } from "../src/session-core.js";
import { evidenceOf, policyHashOf, verifyEvidence } from "../src/evidence-fields.js";
import { memorySessionNamespace } from "../src/session-do.js";

let n = 0;
const T = "2026-10-12T00:00:00Z";
async function exec(s, additive = {}) {
  const { intent } = await recordIntent(s, { slug: "foldlock", op: "health", payload: {}, payloadText: "{}" }, T);
  return commitExec(s, { intent, status: 200, latencyMs: 1, requestDigest: "a", responseDigest: "b", additive }, T);
}
async function fresh() {
  const s = openSession({ id: newSessionId(), now: T, version: "test" });
  await applyOpen(s, T, {});
  return s;
}
const reseal = async (receipts) => {
  let prev = "0".repeat(64); const out = [];
  for (const r of receipts) { const { hash: _h, ...rest } = { ...r, prev_hash: prev }; const hash = await sha256Hex(canonicalize(rest)); out.push({ ...rest, hash }); prev = hash; }
  return out;
};
const codes = (v) => v.errors.map((e) => e.error);

// Exec carries policy_hash + policy_receipt_ref; honest chain verifies.
{
  const s = await fresh();
  const r = await exec(s);
  assert.equal(r.policy_hash, await policyHashOf(s.policy));
  assert.equal(r.policy_receipt_ref, s.receipts[0].hash);
  await applyPolicy(s, { allow_slugs: ["foldlock"] }, T);
  const r2 = await exec(s);
  assert.equal(r2.policy_receipt_ref, s.receipts[2].hash, "ref follows the latest policy receipt");
  const v = await verifyChainStrict(s.receipts);
  assert.equal(v.ok, true, JSON.stringify(v.errors));
  assert.deepEqual(v.evidence.fields.map((f) => f.policy_binding), ["verified", "verified"]); n++;
}
// Fail closed: policy_hash mismatch, unsealed ref, stale ref (even with hashes re-sealed).
{
  const s = await fresh();
  await exec(s);
  const bad = await reseal(s.receipts.map((r, i) => (i === 1 ? { ...r, policy_hash: "e".repeat(64) } : r)));
  assert.ok(codes(await verifyChainStrict(bad)).includes("POLICY-HASH-MISMATCH"));
  const unsealed = await reseal(s.receipts.map((r, i) => (i === 1 ? { ...r, policy_receipt_ref: "d".repeat(64) } : r)));
  assert.ok(codes(await verifyChainStrict(unsealed)).includes("POLICY-REF-UNSEALED"));
  // Policy changed, exec still points at the old open receipt.
  const s2 = await fresh();
  await applyPolicy(s2, { allow_slugs: ["foldlock"] }, T);
  await exec(s2);
  const stale = await reseal(s2.receipts.map((r, i) => (i === 2 ? { ...r, policy_receipt_ref: s2.receipts[0].hash, policy_hash: s2.receipts[2].policy_hash } : r)));
  const sc = codes(await verifyChainStrict(stale));
  assert.ok(sc.includes("POLICY-HASH-MISMATCH") || sc.includes("POLICY-REF-STALE")); n++;
}
// Old exec receipts without the binding verify as legacy.
{
  const s = await fresh();
  await appendReceipt(s, "exec", { intent: { slug: "x", op: "y" } }, T);
  const v = await verifyChainStrict(s.receipts);
  assert.equal(v.ok, true); assert.equal(v.evidence.fields[0].policy_binding, "legacy"); n++;
}
// Callers can never seal "verified": every field is written unchecked.
{
  const ev = evidenceOf({ authority: { grant_ref: "a".repeat(64), status: "verified" }, effect: { observer: "x", observation_hash: "b".repeat(64), status: "verified" } });
  assert.equal(ev.authority.status, "unchecked"); assert.equal(ev.effect.status, "unchecked");
  assert.equal(evidenceOf({}), null); assert.equal(evidenceOf("x"), null); n++;
}
// Per-field verification: authority, policy, execution verified on their own; effect unchecked without an outside observer.
{
  const s = await fresh();
  const first = await exec(s);
  const policyHash = await policyHashOf(s.policy);
  const r = await exec(s, { evidence: {
    authority: { grant_ref: s.receipts[0].hash, scope: { slug: "foldlock", op: "health" } },
    policy: { policy_hash: policyHash, scope: "session" },
    execution: { receipt_hash: first.hash },
    effect: { observer: "aziel-runtime", observation_hash: "c".repeat(64), observed_at: T },
  } });
  const v = await verifyChainStrict(s.receipts);
  assert.equal(v.ok, true);
  const f = v.evidence.fields.find((x) => x.receipt_hash === r.hash).evidence;
  assert.deepEqual(f, { authority: "verified", policy: "verified", execution: "verified", effect: "unchecked" }, "self-observed effect never verifies"); n++;
  // Outside observer: verified only when the observation hashes to observation_hash.
  const body = { status: "deployed", by: "ci" };
  const s2 = await fresh();
  const r2 = await exec(s2, { evidence: { effect: { observer: "github-actions", observation_hash: await sha256Hex(canonicalize(body)), observed_at: T } } });
  const none = await verifyEvidence(s2.receipts);
  assert.equal(none.fields[0].evidence.effect, "unchecked", "no observation supplied");
  const yes = await verifyEvidence(s2.receipts, { observations: [{ receipt_hash: r2.hash, observer: "github-actions", body }] });
  assert.equal(yes.fields[0].evidence.effect, "verified");
  const no = await verifyEvidence(s2.receipts, { observations: [{ receipt_hash: r2.hash, observer: "github-actions", body: { status: "other" } }] });
  assert.equal(no.fields[0].evidence.effect, "failed");
  const selfObs = await verifyEvidence(s2.receipts, { observations: [{ receipt_hash: r2.hash, observer: s2.id, body }] });
  assert.equal(selfObs.fields[0].evidence.effect, "unchecked"); n++;
}
// Failed fields stay per field: bad grant (scope not allowed), unknown exec, wrong policy_hash.
{
  const s = await fresh();
  await applyPolicy(s, { allow_slugs: ["foldlock"] }, T);
  const r = await exec(s, { evidence: {
    authority: { grant_ref: s.receipts[1].hash, scope: { slug: "azmail" } },
    policy: { policy_hash: "f".repeat(64) },
    execution: { receipt_hash: "9".repeat(64) },
  } });
  const v = await verifyChainStrict(s.receipts);
  assert.equal(v.ok, true, "a failed evidence field is not a chain-integrity break");
  assert.equal(v.evidence.fields_ok, false);
  assert.deepEqual(v.evidence.fields.find((x) => x.receipt_hash === r.hash).evidence, { authority: "failed", policy: "failed", execution: "failed" });
  assert.deepEqual(v.evidence.field_failures.map((x) => x.field).sort(), ["authority", "execution", "policy"]); n++;
}
// Integrity passing never flips a field: an intact chain with only refs to nothing stays unchecked/failed, never verified.
{
  const s = await fresh();
  await exec(s, { evidence: { authority: { scope: "x" }, effect: { observer: "someone" } } });
  const v = await verifyChainStrict(s.receipts);
  assert.equal(v.ok, true);
  assert.ok(!Object.values(v.evidence.fields[0].evidence).includes("verified")); n++;
}
// HTTP door seals evidence unchecked and binds the policy.
{
  const handler = (await import("../src/index.js")).default.fetch;
  const env = { SESSION: memorySessionNamespace({}) };
  const call = (p, body) => handler(new Request("https://rt.example" + p, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }), env);
  const open = await (await call("/v1/session/open", {})).json();
  const res = await call(`/v1/session/${open.session.id}/exec`, { slug: "foldlock", op: "health", payload: {}, evidence: { effect: { observer: "ci", observation_hash: "a".repeat(64), status: "verified" } } });
  const j = await res.json();
  const rec = j.receipt || (j.session_receipt) || j;
  const recs = (await (await handler(new Request(`https://rt.example/v1/session/${open.session.id}/receipts`), env)).json()).receipts;
  const ex = recs.find((x) => x.event === "exec");
  assert.ok(ex, JSON.stringify(rec).slice(0, 300));
  assert.match(ex.policy_hash, /^[a-f0-9]{64}$/); assert.equal(ex.policy_receipt_ref, recs[0].hash);
  assert.equal(ex.evidence.effect.status, "unchecked"); n++;
}
// Self-observer lookalikes (zero-width, Default_Ignorable, NFKC compat forms) are still self.
{
  const { observerKey } = await import("../src/evidence-fields.js");
  const body = { status: "x" };
  for (const name of ["Runtime\u200b", "R\u034Funtime", "\uFEFFsession", "ＲＵＮＴＩＭＥ", "aziel-runtime\uFE0F", "Self\u2060"]) {
    const s = await fresh();
    const r = await exec(s, { evidence: { effect: { observer: name, observation_hash: await sha256Hex(canonicalize(body)) } } });
    const v = await verifyEvidence(s.receipts, { observations: [{ receipt_hash: r.hash, observer: name, body }] });
    assert.equal(v.fields[0].evidence.effect, "unchecked", JSON.stringify(name));
  }
  assert.equal(observerKey("Runtime\u200b"), "runtime");
  const v = await verifyEvidence([]);
  assert.match(v.ok_scope, /only the policy binding/); assert.match(v.note, /matches the hash the caller committed to/);
  assert.doesNotMatch(v.note, /outside observer/); n++;
}
console.log(`ok evidence fields (RIB-016): ${n} checks`);
