/**
 * RIB-055 / AZRT-AUDIT-PATH-1.0: out-of-band recorder reconciliation + fail-closed audit-path health.
 * Kill the recorder mid-session → the gap is unaudited and a high-impact write refuses.
 * An action the observer saw but receipts lack is a finding. No recorder behaves as today.
 * Old receipts verify unchanged. The worker cannot write or skip the reconcile receipt.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import { memorySessionNamespace } from "../src/session-do.js";
import { isSessionMutatePath, RECEIPT_CAP } from "../src/production.js";
import { RUNTIME_VERSION } from "../src/runtime-api.js";
import { PUBLIC_MCP_TOOLS } from "../src/fraggate/codes.js";
import { buildRegistry } from "../src/fraggate/registry.js";
import { listSoftwareEntries } from "../src/software-catalog.js";
import { PRODUCTS } from "../src/index.js";
import {
  applyAuditHealth,
  applyClose,
  applyOpen,
  applyPolicy,
  closeReserveFor,
  CLOSE_RESERVE,
  newSessionId,
  openSession,
  verifyChainStrict,
} from "../src/session-core.js";
import { verifyAuditPath } from "../src/audit-path.js";

let n = 0;
const ok = (c, m) => { assert.ok(c, m); n++; };
const handler = (await import("../src/index.js")).default.fetch;
const env = { SESSION: memorySessionNamespace({}) };
const req = async (m, p, body) => {
  const r = await handler(new Request("https://rt.example" + p, { method: m, headers: { "content-type": "application/json" }, ...(body ? { body: JSON.stringify(body) } : {}) }), env);
  return { status: r.status, body: await r.json() };
};
const receipts = async (id) => (await req("GET", `/v1/session/${id}/receipts`)).body;
const REC = { observer_id: "obs-net-1", records_at: "observer://records/sess" };
const now = () => new Date().toISOString();

ok(RUNTIME_VERSION === "2.0.0-rc1", "version lock");
ok(PUBLIC_MCP_TOOLS.length === 36, "tools/list stays 36");
ok(!PUBLIC_MCP_TOOLS.includes("runtime_session_audit"), "audit is not an MCP tool");
ok(buildRegistry().stub_op_count === 363, "stub ops stay 363");
ok(listSoftwareEntries(PRODUCTS, "https://rt.example").length === 42, "Softwares stay 42");
ok(CLOSE_RESERVE === 2, "base close reserve unchanged");
const src = fs.readFileSync(new URL("../src/audit-path.js", import.meta.url), "utf8");
ok(!/\bfetch\s*\(/.test(src) && !/dns\.resolve/.test(src), "recorder location is not resolved");
ok(isSessionMutatePath("/v1/session/sess_" + "a".repeat(32) + "/audit", "POST"), "audit is token-gated");
ok(!isSessionMutatePath("/v1/session/sess_" + "a".repeat(32) + "/audit", "GET"), "GET audit is not a mutate path");

// Bad recorder input refuses before a session is stored. Key material is not echoed.
{
  const key = "-----BEGIN PRIVATE KEY-----\nabc";
  const r = await req("POST", "/v1/session/open", { recorder: { observer_id: "obs-1", records_at: key } });
  ok(r.status === 400 && r.body.code === "AUDIT-RECORDER-INVALID", "key material refused");
  ok(!JSON.stringify(r.body).includes("PRIVATE KEY"), "refusal does not echo key material");
  const self = await req("POST", "/v1/session/open", { recorder: { observer_id: "runtime", records_at: "observer://x" } });
  ok(self.status === 400 && self.body.code === "AUDIT-RECORDER-INVALID", "self-named observer refused");
  const none = await req("POST", "/v1/session/open", { audit_health: "down" });
  ok(none.status === 400 && none.body.code === "AUDIT-RECORDER-INVALID", "health without a recorder refused");
}

// Cap-7 / .aziel stays a name.
{
  const o = await req("POST", "/v1/session/open", { recorder: { observer_id: "obs-cap7", records_at: "cap-7:lab.aziel" } });
  ok(o.status === 200 && o.body.receipt.recorder.names_only === true && o.body.receipt.recorder.resolved === false, "cap-7/.aziel name is not resolved");
  ok(o.body.receipt.recorder.records_at === "cap-7:lab.aziel" && /^[a-f0-9]{64}$/.test(o.body.receipt.recorder.records_ref), "location stored as a name plus hash");
  const id = o.body.session.id;
  const c = await req("POST", `/v1/session/${id}/close`, { observer_records: [] });
  ok(c.status === 200 && c.body.verified.ok === true && c.body.verified.audit_path.clean === true, "named-only recorder with no execs can close clean");
}

function recordFor(exec) {
  return { kind: "exec", slug: exec.payload.intent.slug, op: exec.payload.intent.op, payload_digest: exec.payload.intent.payload_digest };
}

// 1) Kill the recorder mid-session. Gap is unaudited. High-impact write refuses. Observer-only action is a finding.
{
  const o = await req("POST", "/v1/session/open", { recorder: REC });
  ok(o.status === 200 && o.body.receipt.audit_path.status === "healthy" && o.body.receipt.recorder.observer_id === "obs-net-1", "open seals healthy audit path");
  ok(o.body.receipt.recorder.resolved === false, "plain location is still not resolved");
  const id = o.body.session.id;
  const read1 = await req("POST", `/v1/session/${id}/exec`, { slug: "decisiongate", op: "health", payload: {} });
  ok(read1.status === 200 && read1.body.receipt.event === "exec" && read1.body.receipt.audit_status === "audited" && read1.body.receipt.audit_path == null, "read while healthy is audited, stamp is for high-impact");
  const hi = await req("POST", `/v1/session/${id}/exec`, { slug: "decisiongate", op: "check", payload: {} });
  ok(hi.status === 200 && hi.body.receipt.event === "exec" && hi.body.receipt.audit_path.status === "healthy" && hi.body.receipt.audit_status === "audited", "high-impact check seals a healthy stamp");
  const down = await req("POST", `/v1/session/${id}/audit`, { status: "down", reason: "recorder stopped" });
  ok(down.status === 200 && down.body.receipt.event === "audit_path" && down.body.receipt.audit_path.status === "down", "kill seals down");
  const read2 = await req("POST", `/v1/session/${id}/exec`, { slug: "decisiongate", op: "health", payload: {} });
  ok(read2.status === 200 && read2.body.receipt.audit_status === "unaudited" && read2.body.receipt.audit_path.status === "down", "exec during the outage is unaudited");
  const before = (await receipts(id)).receipts.length;
  const mid = await receipts(id);
  ok(mid.verified.ok === false && mid.verified.audit_path.clean === false && mid.verified.errors.some((e) => e.error === "AUDIT-PATH-NOT-HEALTHY"), "open outage is not clean");
  const refused = await req("POST", `/v1/session/${id}/exec`, { slug: "decisiongate", op: "check", payload: { statement: "write the file" } });
  ok(refused.status === 409 && refused.body.code === "AUDIT-PATH-DOWN" && refused.body.executed === false, "high-impact write refuses AUDIT-PATH-DOWN");
  ok(refused.body.refused_receipt && refused.body.refused_receipt.sealed === true && refused.body.refused_receipt.code === "AUDIT-PATH-DOWN", "refusal receipt sealed on the session");
  ok(refused.body.refusal_receipt && refused.body.refusal_receipt.sealed === true && refused.body.refusal_receipt.code === "AUDIT-PATH-DOWN", "refusal also sealed on the refusals chain");
  ok(!refused.body.exec && !refused.body.result, "nothing ran");
  const after = await receipts(id);
  const refusedRow = after.receipts[after.receipts.length - 1];
  ok(refusedRow.event === "refused" && refusedRow.payload.refusal.code === "AUDIT-PATH-DOWN" && refusedRow.payload.refusal.executed === false && refusedRow.audit_status === "unaudited", "refused row is unaudited and did not execute");
  ok(after.receipts.filter((r) => r.event === "exec" && r.payload.intent.op === "check").length === 1, "the refused check did not append an exec");
  ok(after.receipts.length === before + 1, "only the refusal row was added");
  const execs = after.receipts.filter((r) => r.event === "exec");
  const extra = { kind: "file", target: "var/notes.txt", detail_sha256: "ab".repeat(32) };
  const c = await req("POST", `/v1/session/${id}/close`, {
    verdict: { pass: true },
    reconcile: { findings: [] },
    observer_records: [...execs.map(recordFor), extra],
  });
  ok(c.status === 409 && c.body.code === "AUDIT-UNAUDITED-GAP", "close refuses a clean verdict");
  ok(c.body.receipt.event === "close" && c.body.receipt.verdict == null, "verdict not sealed");
  const gap = c.body.unaudited_gap.unaudited_gap;
  ok(gap.written_by === "harness" && gap.gaps.length === 1 && gap.gaps[0].rows_affected === 2, "gap rows: unaudited exec + refusal");
  ok(gap.gaps[0].start.seq === down.body.receipt.seq && gap.gaps[0].end.seq === refusedRow.seq && gap.gaps[0].start.hash === down.body.receipt.hash, "gap start and end are the outage bounds");
  const findings = c.body.reconcile.reconcile.findings;
  ok(c.body.reconcile.reconcile.written_by === "harness" && findings.length === 1 && findings[0].kind === "unmatched_observer" && findings[0].record.target === "var/notes.txt", "observer-only file action is a finding");
  ok(c.body.verified.ok === false && c.body.verified.audit_path.clean === false && c.body.verified.audit_path.status === "unaudited", "verify does not report the session clean");
  ok(c.body.verified.errors.some((e) => e.error === "AUDIT-UNAUDITED-GAP") && c.body.verified.errors.some((e) => e.error === "AUDIT-RECONCILE-FINDING"), "gap and finding both fail closed");
  ok(c.body.refusal_receipt && c.body.refusal_receipt.sealed === true && c.body.refusal_receipt.code === "AUDIT-UNAUDITED-GAP", "close refusal sealed on the refusals chain");
  // Worker cannot rewrite or skip the harness rows.
  const all = (await receipts(id)).receipts;
  const forged = structuredClone(all);
  forged[forged.length - 2].reconcile.findings = [];
  forged[forged.length - 2].reconcile.clean = true;
  const fv = await verifyAuditPath(forged);
  ok(!fv.ok && fv.errors.some((e) => e.code === "AUDIT-RECONCILE-FORGED"), "forged reconcile findings fail recompute");
  const skipped = all.filter((r) => r.event !== "reconcile");
  const sv = await verifyAuditPath(skipped);
  ok(!sv.ok && sv.errors.some((e) => e.code === "AUDIT-RECONCILE-MISSING"), "skipped reconcile fails closed");
  const noGap = all.filter((r) => r.event !== "unaudited_gap");
  ok((await verifyAuditPath(noGap)).errors.some((e) => e.code === "AUDIT-GAP-MISSING"), "skipped gap fails closed");
}

// Restoring healthy needs a beat, and the gap remains.
{
  const o = await req("POST", "/v1/session/open", { recorder: REC });
  const id = o.body.session.id;
  await req("POST", `/v1/session/${id}/audit`, { status: "down" });
  const n0 = (await receipts(id)).receipts.length;
  const bare = await req("POST", `/v1/session/${id}/audit`, { status: "healthy" });
  ok(bare.status === 400 && bare.body.code === "AUDIT-BEAT-REQUIRED" && (await receipts(id)).receipts.length === n0, "healthy without a beat writes nothing");
  const beat = "cd".repeat(32);
  const back = await req("POST", `/v1/session/${id}/audit`, { status: "healthy", beat_hash: beat, reason: "recorder restarted" });
  ok(back.status === 200 && back.body.receipt.audit_path.beat_hash === beat && back.body.receipt.audit_path.status === "healthy", "beat restores healthy and stays sealed");
  const read = await req("POST", `/v1/session/${id}/exec`, { slug: "decisiongate", op: "health", payload: {} });
  ok(read.status === 200 && read.body.receipt.audit_status === "audited", "exec after the beat is audited");
  const execs = (await receipts(id)).receipts.filter((r) => r.event === "exec");
  const c = await req("POST", `/v1/session/${id}/close`, { observer_records: execs.map(recordFor) });
  ok(c.status === 409 && c.body.code === "AUDIT-UNAUDITED-GAP" && c.body.verified.audit_path.clean === false, "the outage is still not a clean session");
}

// Degraded is not healthy: high-impact refuses with the same code, and the exec that did run is unaudited.
{
  const o = await req("POST", "/v1/session/open", { recorder: REC });
  const id = o.body.session.id;
  const d = await req("POST", `/v1/session/${id}/audit`, { status: "degraded", reason: "lagging" });
  ok(d.status === 200 && d.body.receipt.audit_path.status === "degraded", "degraded sealed");
  const hi = await req("POST", `/v1/session/${id}/exec`, { slug: "decisiongate", op: "evaluate", payload: {} });
  ok(hi.status === 409 && hi.body.code === "AUDIT-PATH-DOWN", "DecisionGATE evaluate refuses while degraded");
  const read = await req("POST", `/v1/session/${id}/exec`, { slug: "decisiongate", op: "health", payload: {} });
  ok(read.body.receipt.audit_status === "unaudited", "read while degraded is unaudited");
}

// 2) Observer saw an action the receipts lack, and a receipt the observer did not see. No outage.
{
  const o = await req("POST", "/v1/session/open", { recorder: REC });
  const id = o.body.session.id;
  const a = await req("POST", `/v1/session/${id}/exec`, { slug: "decisiongate", op: "health", payload: {} });
  const b = await req("POST", `/v1/session/${id}/exec`, { slug: "decisiongate", op: "doctor", payload: {} });
  ok(a.status === 200 && b.status === 200, "two reads while healthy");
  const c = await req("POST", `/v1/session/${id}/close`, {
    observer_records: [recordFor(a.body.receipt), { kind: "net", target: "10.0.0.8:443", detail_sha256: "ef".repeat(32) }],
  });
  ok(c.status === 409 && c.body.code === "AUDIT-RECONCILE-FINDING", "findings refuse a clean close");
  const kinds = c.body.reconcile.reconcile.findings.map((f) => f.kind).sort();
  ok(kinds.includes("unmatched_observer") && kinds.includes("unmatched_receipt"), "both sides of the diff are findings");
  ok(c.body.unaudited_gap == null && c.body.verified.audit_path.status === "findings" && c.body.verified.ok === false, "no gap, still not clean");
  // A matching set is clean.
  const o2 = await req("POST", "/v1/session/open", { recorder: REC, expect: { spec: "records match the exec", verdict_criteria: "no unmatched rows" } });
  const id2 = o2.body.session.id;
  const e = await req("POST", `/v1/session/${id2}/exec`, { slug: "decisiongate", op: "health", payload: {} });
  const good = await req("POST", `/v1/session/${id2}/close`, { verdict: { pass: true }, observer_records: [recordFor(e.body.receipt)] });
  ok(good.status === 200 && good.body.reconcile.reconcile.clean === true && good.body.reconcile.reconcile.findings.length === 0, "matched records reconcile clean");
  ok(good.body.receipt.verdict && good.body.receipt.verdict.pass === true && good.body.unaudited_gap == null, "verdict sealed, no gap row");
  ok(good.body.verified.ok === true && good.body.verified.audit_path.status === "clean" && good.body.verified.audit_path.clean === true, "verify reports clean");
}

// Hash-addressed records: a mismatched hash writes nothing.
{
  const o = await req("POST", "/v1/session/open", { recorder: REC });
  const id = o.body.session.id;
  const bad = await req("POST", `/v1/session/${id}/close`, { observer_records: [{ kind: "file", target: "a.txt", detail_sha256: "11".repeat(32), record_hash: "0".repeat(64) }] });
  ok(bad.status === 400 && bad.body.code === "AUDIT-RECORD-HASH-MISMATCH", "mismatched record hash refused");
  ok((await receipts(id)).receipts.length === 1 && (await receipts(id)).session.closed === false, "nothing written");
  const absent = await req("POST", `/v1/session/${id}/close`, {});
  ok(absent.status === 409 && absent.body.reconcile.reconcile.findings.some((f) => f.kind === "observer_records_absent"), "omitted observer records are a finding, not a skip");
}

// 3) No recorder: high-impact runs, no audit fields, close as today.
{
  const o = await req("POST", "/v1/session/open", { expect: { spec: "no recorder", verdict_criteria: "close as today" } });
  ok(o.body.receipt.recorder == null && o.body.receipt.audit_path == null && o.body.session.audit_path == null, "no recorder fields");
  const id = o.body.session.id;
  const nope = await req("POST", `/v1/session/${id}/audit`, { status: "down" });
  ok(nope.status === 409 && nope.body.code === "AUDIT-RECORDER-NONE" && (await receipts(id)).receipts.length === 1, "audit without a recorder writes nothing");
  const hi = await req("POST", `/v1/session/${id}/exec`, { slug: "decisiongate", op: "check", payload: {} });
  ok(hi.status === 200 && hi.body.receipt.event === "exec" && hi.body.receipt.audit_status == null && hi.body.receipt.audit_path == null, "high-impact with no recorder behaves as today");
  const c = await req("POST", `/v1/session/${id}/close`, { verdict: { pass: true } });
  ok(c.status === 200 && c.body.reconcile == null && c.body.unaudited_gap == null && c.body.receipt.verdict.pass === true, "close as today");
  ok(c.body.verified.ok === true && c.body.verified.audit_path.status === "no_recorder" && c.body.verified.audit_path.clean === null, "verify unchanged");
}

// Old fixture receipts verify unchanged.
{
  const fix = JSON.parse(fs.readFileSync(new URL("../fixtures/session-receipt-chain.json", import.meta.url), "utf8"));
  const v = await verifyChainStrict(fix.receipts);
  ok(v.ok === true && v.audit_path.status === "no_recorder" && v.audit_path.clean === null && v.audit_path.errors.length === 0, "old receipts verify unchanged");
  const direct = await verifyAuditPath(fix.receipts);
  ok(direct.ok === true && direct.status === "no_recorder", "audit verify adds nothing to the fixture");
}

// Recorder sessions reserve two more close slots. Plain sessions stay at 2.
{
  const plain = openSession({ id: newSessionId(), now: now(), version: "2.0.0-rc1" });
  await applyOpen(plain, now(), {});
  ok(closeReserveFor(plain) === 2, "plain reserve stays 2");
  const s = openSession({ id: newSessionId(), now: now(), version: "2.0.0-rc1" });
  await applyOpen(s, now(), { recorder: REC });
  ok(closeReserveFor(s) === 4, "recorder reserve is 4");
  let err = null;
  for (let i = 0; i < RECEIPT_CAP + 5 && !err; i++) {
    try { await applyPolicy(s, { max_ops: 8 + (i % 3) }, now()); } catch (e) { err = e; }
  }
  ok(err && err.code === "receipt_cap" && err.extra.close_reserve === 4 && s.receipts.length === RECEIPT_CAP - 4, "fill stops with room for gap + reconcile + delivery_check + close");
  let late = null;
  try { await applyAuditHealth(s, now(), { status: "down" }); } catch (e) { late = e; }
  ok(late && late.code === "receipt_cap" && s.receipts.length === RECEIPT_CAP - 4, "health transition cannot eat the reserve");
  const out = await applyClose(s, now(), { observerRecords: [] });
  ok(out.receipt.event === "close" && out.reconcile && out.reconcile.event === "reconcile" && s.receipts.length === RECEIPT_CAP - 2, "reconcile + close fit in the reserve");
  ok((await verifyChainStrict(s.receipts)).ok === true, "full recorder chain with no execs verifies");
}

console.log(`verify-audit-path: ${n} checks ok (RIB-055 / AZRT-AUDIT-PATH-1.0; hash-linked and sealed, not signed)`);
