/**
 * RIB-043 / AZRT-APPROVER-1.0: approver sealed in the same exec row; drift refused + sealed;
 * verify fails closed on missing/altered approver; ungated = not_required; old fixture unchanged.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import { applyOpen, applyPolicy, canonicalize, commitExec, digestText, newSessionId, openSession, recordIntent, sha256Hex, verifyChainStrict } from "../src/session-core.js";
import { argsHashOf, goalHashOf } from "../src/approver.js";

const T = "2026-10-12T00:00:00Z";
let n = 0;
const PROPOSAL = {
  statement: "Run the foldlock health check once against the hosted runtime to confirm the engine responds before the release window",
  evidence: ["foldlock health returned ok in the last three CI runs"],
  impacts_positive: ["release owner knows the engine is up"],
  impacts_negative: ["one extra request to the runtime"],
  values: ["honesty"],
  commitments: ["report the result as observed"],
  constraints: [],
  accountable_person: "Aziel Eliab",
};
let CUR = null;
async function fresh(policy) {
  const s = openSession({ id: newSessionId(), now: T, version: "test" });
  await applyOpen(s, T, {});
  if (policy) await applyPolicy(s, policy, T);
  CUR = s;
  return s;
}
// The runtime issues intent_id = "<session_id>:<next seq>"; the decision binds it.
const nextIntent = (s, ahead = 0) => `${s.id}:${s.receipts.length + 1 + ahead}`;
async function decisionFor(slug, op, text, extra = {}, s = CUR, ahead = 0) {
  const d = await digestText(text);
  return { proposal: PROPOSAL, args_hash: await argsHashOf({ slug, op, payload_digest: d.sha256, session_id: s.id, intent_id: nextIntent(s, ahead) }), ...extra };
}
async function run(s, args) {
  const { intent } = await recordIntent(s, { payload: {}, payloadText: "{}", slug: "foldlock", op: "health", ...args }, T);
  await commitExec(s, { intent, status: 200, latencyMs: 1 }, T);
}
const rehash = async (r) => { const { hash, ...u } = r; r.hash = await sha256Hex(canonicalize(u)); };

// 1) gated exec seals approver inside the exec row hash; verify binds it.
const s1 = await fresh({ require_decision: true });
await run(s1, { decision: await decisionFor("foldlock", "health", "{}") });
const ex = s1.receipts.find((r) => r.event === "exec");
assert.equal(ex.payload.intent.approver.approver_id, "Aziel Eliab");
assert.ok(/^[0-9a-f]{64}$/.test(ex.payload.intent.approver.decision_record_hash));
let v = await verifyChainStrict(s1.receipts);
assert.equal(v.ok, true, JSON.stringify(v.errors));
assert.equal(v.approver.rows[0].approver, "bound"); n++;

// 2) args drift -> APPROVER-DRIFT, sealed refused receipt, nothing ran.
const s2 = await fresh({ require_decision: true });
const before = s2.receipts.length;
await assert.rejects(run(s2, { payloadText: "{\"x\":1}", decision: await decisionFor("foldlock", "health", "{}") }),
  (e) => e.code === "APPROVER-DRIFT" && e.extra.refused_receipt.sealed === true);
assert.equal(s2.receipts.length, before + 1);
assert.equal(s2.receipts.at(-1).event, "refused");
assert.equal(s2.receipts.at(-1).payload.refusal.code, "APPROVER-DRIFT");
assert.equal((await verifyChainStrict(s2.receipts)).ok, true); n++;

// 3) goal drift -> APPROVER-DRIFT.
const s3 = await fresh({ require_decision: true });
await assert.rejects(run(s3, { goal: "ship B", decision: await decisionFor("foldlock", "health", "{}", { goal_hash: await goalHashOf("ship A") }) }),
  (e) => e.code === "APPROVER-DRIFT"); n++;

// 4) gated without decision -> APPROVER-MISSING refusal; non-PASS -> APPROVER-NOT-PASSED.
const s4 = await fresh({ require_decision: true });
await assert.rejects(run(s4, {}), (e) => e.code === "APPROVER-MISSING" && e.extra.refused_receipt.sealed === true);
await assert.rejects(run(s4, { decision: { ...(await decisionFor("foldlock", "health", "{}", {}, s4)), proposal: { ...PROPOSAL, evidence: [] } } }),
  (e) => e.code === "APPROVER-NOT-PASSED"); n++;

// 5) verify: approver stripped (rehashed, chain relinked) -> APPROVER-MISSING.
async function relink(rs) { for (let i = 0; i < rs.length; i++) { if (i) rs[i].prev_hash = rs[i - 1].hash; await rehash(rs[i]); } }
const strip = structuredClone(s1.receipts);
delete strip.find((r) => r.event === "exec").payload.intent.approver;
await relink(strip);
v = await verifyChainStrict(strip);
assert.ok(v.errors.some((e) => e.error === "APPROVER-MISSING"), JSON.stringify(v.errors)); n++;

// 6) verify: approver_id altered / record altered -> APPROVER-MISMATCH.
for (const mut of [(a) => { a.approver_id = "Mallory"; }, (a) => { a.record.proposal.accountable_person = "Mallory"; }, (a) => { a.record.args_hash = "0".repeat(64); }]) {
  const t = structuredClone(s1.receipts);
  mut(t.find((r) => r.event === "exec").payload.intent.approver);
  await relink(t);
  v = await verifyChainStrict(t);
  assert.ok(v.errors.some((e) => e.error === "APPROVER-MISMATCH"), JSON.stringify(v.errors));
}
n++;

// 7) ungated -> not_required.
const s7 = await fresh(null);
await run(s7, {});
v = await verifyChainStrict(s7.receipts);
assert.equal(v.ok, true);
assert.equal(v.approver.rows[0].approver, "not_required"); n++;

// 8) old fixture verifies unchanged.
const fx = JSON.parse(fs.readFileSync(new URL("../fixtures/session-receipt-chain.json", import.meta.url), "utf8"));
v = await verifyChainStrict(fx.receipts);
assert.equal(v.ok, true, JSON.stringify(v.errors));
assert.ok(v.approver.rows.every((r) => r.approver === "not_required")); n++;

// 9) docs say record, not signature.
const doc = fs.readFileSync(new URL("../docs/APPROVER.md", import.meta.url), "utf8");
assert.match(doc, /not a signature/); n++;

// ---- AZBot BLOCKER regressions (#290 review) ----
const T2 = "2026-10-12T00:00:05Z";
// 10) Blocker 1: gated -> ungated mid-session is refused 409 APPROVER-POLICY-DOWNGRADE; policy unchanged.
const s10 = await fresh({ require_decision: true });
const n10 = s10.receipts.length;
await assert.rejects(applyPolicy(s10, { require_decision: false }, T), (e) => e.status === 409 && e.code === "APPROVER-POLICY-DOWNGRADE");
await assert.rejects(applyPolicy(s10, { require_decision: null }, T), (e) => e.code === "APPROVER-POLICY-DOWNGRADE");
assert.equal(s10.policy.require_decision, true);
assert.equal(s10.receipts.length, n10);
await assert.rejects(run(s10, {}), (e) => e.code === "APPROVER-MISSING"); n++;

// 11) Blocker 1 (verify): a forged policy receipt true -> false is flagged, and later ungated execs stay gated (MISSING).
const s11 = await fresh({ require_decision: true });
await run(s11, { decision: await decisionFor("foldlock", "health", "{}") });
const forged = structuredClone(s11.receipts);
const pol = forged.find((r) => r.event === "policy");
const forgedPol = structuredClone(pol); forgedPol.payload = { before: pol.payload.after, after: { ...pol.payload.after, require_decision: false } };
const ex11 = structuredClone(forged.find((r) => r.event === "exec")); delete ex11.payload.intent.approver;
forged.push(forgedPol, ex11);
for (let i = 0; i < forged.length; i++) forged[i].seq = i + 1;
await relink(forged);
v = await verifyChainStrict(forged);
assert.ok(v.errors.some((e) => e.error === "APPROVER-POLICY-DOWNGRADE"), JSON.stringify(v.errors));
assert.ok(v.errors.some((e) => e.error === "APPROVER-MISSING"), JSON.stringify(v.errors)); n++;

// 12) Blocker 2: same-session replay of a used decision is refused (REPLAY or DRIFT), sealed, nothing ran.
const s12 = await fresh({ require_decision: true });
const d12 = await decisionFor("foldlock", "health", "{}");
await run(s12, { decision: d12 });
const execs12 = s12.receipts.filter((r) => r.event === "exec").length;
await assert.rejects(run(s12, { decision: d12 }), (e) => e.code === "APPROVER-REPLAY" && e.extra.refused_receipt.sealed === true);
assert.equal(s12.receipts.filter((r) => r.event === "exec").length, execs12);
// A fresh decision for the next intent_id still works.
await run(s12, { decision: await decisionFor("foldlock", "health", "{}") });
assert.equal((await verifyChainStrict(s12.receipts)).ok, true); n++;

// 13) Blocker 2: cross-session replay -> APPROVER-DRIFT (args_hash binds session_id + intent_id).
const sA = await fresh({ require_decision: true });
const dA = await decisionFor("foldlock", "health", "{}", {}, sA);
const sB = await fresh({ require_decision: true });
await assert.rejects(run(sB, { decision: dA }), (e) => e.code === "APPROVER-DRIFT"); n++;

// 14) Blocker 2 (verify): a sealed exec row copied into another session / duplicated in-session fails.
const dup = structuredClone(s1.receipts);
const exDup = structuredClone(dup.find((r) => r.event === "exec")); dup.push(exDup);
for (let i = 0; i < dup.length; i++) dup[i].seq = i + 1;
await relink(dup);
v = await verifyChainStrict(dup);
assert.ok(v.errors.some((e) => e.error === "APPROVER-REPLAY" || e.error === "APPROVER-MISMATCH"), JSON.stringify(v.errors));
const other = await fresh({ require_decision: true });
const moved = structuredClone(other.receipts);
const exMoved = structuredClone(s1.receipts.find((r) => r.event === "exec")); exMoved.session_id = other.id; moved.push(exMoved);
for (let i = 0; i < moved.length; i++) moved[i].seq = i + 1;
await relink(moved);
v = await verifyChainStrict(moved);
assert.ok(v.errors.some((e) => e.error === "APPROVER-MISMATCH"), JSON.stringify(v.errors)); n++;

// 15) Should-fix: approved_at equals the exec receipt's own ts (intent at T, commit at T2).
const s15 = await fresh({ require_decision: true });
const { intent: i15 } = await recordIntent(s15, { payload: {}, payloadText: "{}", slug: "foldlock", op: "health", decision: await decisionFor("foldlock", "health", "{}") }, T);
await commitExec(s15, { intent: i15, status: 200, latencyMs: 1 }, T2);
const e15 = s15.receipts.find((r) => r.event === "exec");
assert.equal(e15.payload.intent.approver.approved_at, e15.ts);
assert.equal(e15.payload.intent.approver.record.approved_at, T2);
assert.equal((await verifyChainStrict(s15.receipts)).ok, true);
const t15 = structuredClone(s15.receipts); const a15 = t15.find((r) => r.event === "exec").payload.intent.approver;
a15.approved_at = T; a15.record.approved_at = T; a15.decision_record_hash = await sha256Hex(canonicalize(a15.record));
await relink(t15);
v = await verifyChainStrict(t15);
assert.ok(v.errors.some((e) => e.error === "APPROVER-MISMATCH"), JSON.stringify(v.errors)); n++;

// 16) Should-fix: verify re-runs DecisionGATE on record.proposal; a forged final_state:"PASS" on a failing proposal fails.
const t16 = structuredClone(s1.receipts); const a16 = t16.find((r) => r.event === "exec").payload.intent.approver;
a16.record.proposal = { ...a16.record.proposal, evidence: [] }; a16.decision_record_hash = await sha256Hex(canonicalize(a16.record));
await relink(t16);
v = await verifyChainStrict(t16);
assert.ok(v.errors.some((e) => e.error === "APPROVER-MISMATCH" && e.seq), JSON.stringify(v.errors));
assert.ok(v.approver.errors.some((e) => e.fields.includes("final_state"))); n++;

// 17) Should-fix: goal sealed in the intent; record.goal_hash must equal intent.goal_hash.
const s17 = await fresh({ require_decision: true });
await run(s17, { goal: "ship A", decision: await decisionFor("foldlock", "health", "{}", { goal_hash: await goalHashOf("ship A") }) });
const e17 = s17.receipts.find((r) => r.event === "exec");
assert.equal(e17.payload.intent.goal_hash, await goalHashOf("ship A"));
assert.equal((await verifyChainStrict(s17.receipts)).ok, true);
const t17 = structuredClone(s17.receipts); t17.find((r) => r.event === "exec").payload.intent.goal_hash = await goalHashOf("ship B");
await relink(t17);
v = await verifyChainStrict(t17);
assert.ok(v.approver.errors.some((e) => e.fields && e.fields.includes("goal_hash")), JSON.stringify(v.approver.errors)); n++;

console.log(`ok approver in the same entry (RIB-043): ${n} checks`);
