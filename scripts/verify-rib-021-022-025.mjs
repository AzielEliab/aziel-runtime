/**
 * RIB-021 counterparty receipts, RIB-022 calibration probes, RIB-025 portable
 * execution receipts (draft-zambo-aer1-08, kit v1.4.0 43/43).
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { applyOpen, applyPolicy, canonicalize, commitExec, newSessionId, openSession, recordIntent, sha256Hex, verifyChainStrict } from "../src/session-core.js";
import { applyAer, applyCounterparty, applyProbe } from "../src/session-core.js";
import { isSessionMutatePath } from "../src/production.js";
import {
  AER1_CHAIN_CORPUS,
  AER1_CONFORMANCE,
  AER1_KIT_RESULT,
  CHAIN_ROUNDTRIP_DIGEST,
  GENESIS_PREV,
  PROVENANCE_EXECUTED,
  PROVENANCE_LOGGED,
  PUBLISHED_MERKLE_ROOT,
  PUBLISHED_WORKFLOW_IDS,
  chainEntryDigest,
  dumpsPy,
  kitVerdict,
  merkleRoot,
  validTimestamp,
  verifyChain06,
  verifyChain08,
  verifyCoreAsync,
  verifyWorkflow,
} from "../src/aer1-receipt.js";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const T = "2026-10-12T00:00:00.000Z";
let n = 0;
const codes = (v) => v.errors.map((e) => e.error);

async function fresh() {
  const s = openSession({ id: newSessionId(), now: T, version: "2.0.0-rc1" });
  await applyOpen(s, T, {});
  return s;
}
async function exec(s) {
  const { intent } = await recordIntent(s, { slug: "foldlock", op: "health", payload: {}, payloadText: "{}" }, T);
  return commitExec(s, {
    intent,
    status: 200,
    latencyMs: 1,
    requestDigest: "a",
    responseDigest: "b",
    engine: { mode: "local", true_engine_runtime: true, engine_digest: "ab".repeat(32), engine_slug: "foldlock", engine_op: "health", ran_in: "aziel-runtime" },
  }, T);
}
async function reseal(receipts) {
  let prev = "0".repeat(64);
  const out = [];
  for (const r of receipts) {
    const { hash: _h, signature, ...rest } = { ...r, prev_hash: prev };
    const hash = await sha256Hex(canonicalize(rest));
    out.push({ ...rest, hash, ...(signature ? { signature } : {}) });
    prev = hash;
  }
  return out;
}

// Kit v1.4.0: same pass/fail as the reference conformance.py. 43/43.
{
  const dir = join(root, "fixtures/aer1-v1.4.0");
  const index = JSON.parse(readFileSync(join(dir, "index.json"), "utf8"));
  assert.equal(index.vectors.length, 43);
  let passed = 0;
  for (const vector of index.vectors) {
    const fixture = JSON.parse(readFileSync(join(dir, vector.fixture), "utf8"));
    const got = await kitVerdict(vector, fixture);
    assert.equal(got, vector.expected_verdict, vector.id);
    if (vector.id === "missing-inputs") assert.equal((await verifyCoreAsync(fixture)).length, 0, "missing-inputs stays core-valid");
    if (got === vector.expected_verdict) passed += 1;
  }
  assert.equal(passed, 43);
  assert.equal(AER1_KIT_RESULT, "43/43");
  assert.equal(AER1_CONFORMANCE, "draft-zambo-aer1-08");
  assert.equal(AER1_CHAIN_CORPUS, "not_in_v1.4.0_tag");
  n++;
}

// Section 7.1 digest matches the frozen Python json.dumps vector. Section 8.1 matches the draft's published root.
{
  assert.equal(dumpsPy("é"), '"\\u00e9"');
  assert.equal(dumpsPy("🙂"), '"\\ud83d\\ude42"');
  assert.equal(dumpsPy("a/b"), '"a/b"');
  const canon = dumpsPy({ inputs: { n: 1, note: "café" }, outputs: { ok: true }, tool_call: { name: "foldlock", op: "health", version: "2.0.0-rc1" } });
  assert.equal(canon, '{"inputs":{"n":1,"note":"caf\\u00e9"},"outputs":{"ok":true},"tool_call":{"name":"foldlock","op":"health","version":"2.0.0-rc1"}}');
  const entry = {
    prev_digest: GENESIS_PREV,
    seq: 1,
    job_id: "job-1",
    close: true,
    id: "130da435-e157-498e-af90-605866a86a27",
    tool: "foldlock",
    provenance_class: PROVENANCE_EXECUTED,
    canonical_bytes: Buffer.from(canon).toString("base64"),
  };
  assert.equal(await chainEntryDigest(entry), CHAIN_ROUNDTRIP_DIGEST);
  assert.equal(await merkleRoot(PUBLISHED_WORKFLOW_IDS), PUBLISHED_MERKLE_ROOT);
  const dup = await merkleRoot([...PUBLISHED_WORKFLOW_IDS, PUBLISHED_WORKFLOW_IDS[4]]);
  assert.equal(dup, PUBLISHED_MERKLE_ROOT, "odd-level duplication collides; verification must still reject the duplicate id");
  const workflow = { steps: PUBLISHED_WORKFLOW_IDS.map((id, i) => ({ seq: i + 1, receipt_id: id })), merkle_root: PUBLISHED_MERKLE_ROOT };
  assert.deepEqual(await verifyWorkflow(workflow), []);
  const collided = { steps: [...workflow.steps, { seq: 6, receipt_id: PUBLISHED_WORKFLOW_IDS[4] }], merkle_root: dup };
  assert.ok((await verifyWorkflow(collided)).some((f) => f.includes("duplicate receipt_id")));
  assert.equal(validTimestamp("2026-02-30T00:00:00Z"), false);
  assert.equal(validTimestamp("2024-02-29T00:00:00Z"), true);
  n++;
}

// -06 historical chain verifies under -06 and must not verify as -08.
{
  const canon = dumpsPy({ inputs: { n: 1 }, outputs: { ok: true }, tool_call: { name: "foldlock", op: "health", version: "1" } });
  const raw = new TextEncoder().encode(canon);
  const b64 = Buffer.from(raw).toString("base64");
  const bare = await sha256Hex(raw);
  const first = { prev_digest: GENESIS_PREV, seq: 1, job_id: "job-1", id: "130da435-e157-498e-af90-605866a86a27", tool: "foldlock", provenance_class: PROVENANCE_LOGGED, canonical_bytes: b64, close: false, chain_construction: "-06" };
  const second = { ...first, seq: 2, prev_digest: bare, close: true, id: "514fe841-bbdd-4804-9ef4-6828842d8763" };
  assert.deepEqual(await verifyChain06([first, second]), []);
  const current = await verifyChain08([first, second]);
  assert.ok(current.length > 0);
  assert.ok(current.some((f) => f.includes("historical") || f.includes("prev_digest") || f.includes("-06")));
  const good = { ...first, chain_construction: "-08", close: false };
  good.prev_digest = GENESIS_PREV;
  const digest = await chainEntryDigest(good);
  const next = { ...good, seq: 2, prev_digest: digest, close: true, id: "514fe841-bbdd-4804-9ef4-6828842d8763" };
  assert.deepEqual(await verifyChain08([good, next]), []);
  n++;
}

// A plain session reports the three features absent and still verifies.
{
  const s = await fresh();
  await exec(s);
  const v = await verifyChainStrict(s.receipts);
  assert.equal(v.ok, true, JSON.stringify(v.errors));
  assert.equal(v.counterparty.status, "absent");
  assert.equal(v.calibration.status, "absent");
  assert.equal(v.aer1.status, "absent");
  assert.equal(v.counterparty.acts[0].counterparty, "absent");
  n++;
}

// RIB-021: policy before the act, then a counterparty row a third party can recompute. Self and early seals write nothing.
{
  const s = await fresh();
  await assert.rejects(() => applyCounterparty(s, T, { issuer: "other-lab", statement: "saw it", act_receipt_hash: "ab".repeat(32) }), /no sealed act/);
  const act = await exec(s);
  await assert.rejects(() => applyCounterparty(s, T, { issuer: "aziel-runtime", statement: "saw it", act_receipt_hash: act.hash }), /not a counterparty/);
  await assert.rejects(() => applyCounterparty(s, T, { issuer: "Runtime\u200b", statement: "saw it", act_receipt_hash: act.hash }), /not a counterparty/);
  const before = s.receipts.length;
  const row = await applyCounterparty(s, T, { issuer: "other-lab", statement: "the deploy landed", act_receipt_hash: act.hash, attachment: "log line", status: "verified" });
  assert.equal(row.payload.counterparty.signed, false);
  assert.equal(row.payload.counterparty.signature, null);
  assert.equal(row.payload.counterparty.commitment.length, 64);
  assert.equal(s.receipts.length, before + 1);
  const v = await verifyChainStrict(s.receipts);
  assert.equal(v.ok, true, JSON.stringify(v.errors));
  assert.equal(v.counterparty.acts.find((a) => a.act_receipt_hash === act.hash).counterparty, "verified");
  const tampered = await reseal(s.receipts.map((r) => r.event === "counterparty" ? { ...r, payload: { counterparty: { ...r.payload.counterparty, statement: "rewritten" } } } : r));
  assert.ok(codes(await verifyChainStrict(tampered)).includes("COUNTERPARTY-COMMITMENT"));
  n++;
}

// RIB-022: premise sealed first. Verdict is one of three, linked to the pre-registration hash, and not graded by the runtime.
{
  const s = await fresh();
  await assert.rejects(() => applyProbe(s, T, { phase: "preregister", premise: "the sky is green", deliberately_wrong: false }), /deliberately wrong/);
  await assert.rejects(() => applyProbe(s, T, { phase: "preregister", premise: "the sky is green", deliberately_wrong: true, verdict: "built_on" }), /after the premise/);
  const pre = await applyProbe(s, T, { phase: "preregister", premise: "the sky is green", deliberately_wrong: true });
  const prereg = pre.payload.calibration.prereg_hash;
  await assert.rejects(() => applyProbe(s, T, { phase: "record", prereg_hash: prereg, response: "yes", verdict: "accepted" }), /held, hedged, or built_on/);
  const act = await exec(s);
  const rec = await applyProbe(s, T, { phase: "record", prereg_hash: prereg, response: "the reply treated it as weather", verdict: "hedged", response_receipt_hash: act.hash });
  assert.equal(rec.payload.calibration.computed_by_runtime, false);
  assert.equal(rec.payload.calibration.verdict, "hedged");
  assert.equal(rec.payload.calibration.prereg_hash, prereg);
  await assert.rejects(() => applyProbe(s, T, { phase: "record", prereg_hash: prereg, response: "again", verdict: "built_on" }), /already has a sealed verdict/);
  const v = await verifyChainStrict(s.receipts);
  assert.equal(v.ok, true, JSON.stringify(v.errors));
  assert.equal(v.calibration.status, "sealed");
  const moved = await reseal(s.receipts.map((r) => r.payload && r.payload.calibration && r.payload.calibration.phase === "record"
    ? { ...r, payload: { calibration: { ...r.payload.calibration, verdict: "built_on" } } }
    : r));
  assert.ok(codes(await verifyChainStrict(moved)).includes("CALIBRATION-RECORD-HASH"));
  n++;
}

// RIB-025: one commitment over tool call + inputs + outputs, chain link, public read, no provenance upgrade.
{
  const s = await fresh();
  const act = await exec(s);
  await assert.rejects(() => applyAer(s, T, { act_receipt_hash: act.hash, provenance_class: PROVENANCE_EXECUTED, logged: true }, "https://rt.example"), /different provenances/);
  await assert.rejects(() => applyAer(s, T, { logged: true, provenance_class: PROVENANCE_EXECUTED, tool: { name: "x", version: "1" }, inputs: { a: 1 }, outputs: { b: 2 } }, "https://rt.example"), /cannot upgrade/);
  const sealed = await applyAer(s, T, { act_receipt_hash: act.hash, inputs_text: "{}" }, "https://rt.example");
  const portable = sealed.payload.aer1.receipt;
  assert.equal(portable.provenance_class, PROVENANCE_EXECUTED);
  assert.equal(portable.verification_status, "verified");
  assert.equal(portable.account_required, false);
  assert.equal(portable.signed, false);
  assert.equal((await verifyCoreAsync(portable)).length, 0);
  const decoded = JSON.parse(Buffer.from(portable.canonical_bytes, "base64").toString("utf8"));
  assert.equal(decoded.tool_call.name, "foldlock");
  assert.equal(decoded.inputs.text, "{}");
  assert.equal(decoded.outputs.status, 200);
  assert.equal(sealed.payload.aer1.aer1_conformance, "draft-zambo-aer1-08");
  assert.equal(sealed.payload.aer1.aer1_chain_corpus, "not_in_v1.4.0_tag");
  const openChain = await verifyChainStrict(s.receipts);
  assert.equal(openChain.ok, true, JSON.stringify(openChain.errors));
  assert.equal(openChain.aer1.timeline_status, "open");
  assert.equal(openChain.aer1.verifies_as_current, false);
  const closed = await applyAer(s, T, { close: true, goal: "health check" }, "https://rt.example");
  assert.equal(closed.payload.aer1.workflow.merkle_root.length, 64);
  assert.equal(closed.payload.aer1.workflow.account_required, false);
  const done = await verifyChainStrict(s.receipts);
  assert.equal(done.ok, true, JSON.stringify(done.errors));
  assert.equal(done.aer1.verifies_as_current, true);
  assert.equal(done.aer1.historical_06_reported_as_current, false);
  const broken = await reseal(s.receipts.map((r) => {
    if (r.event !== "aer" || !r.payload.aer1.act_receipt_hash) return r;
    const receipt = { ...r.payload.aer1.receipt, output_hash: "sha256:" + "ab".repeat(32) };
    return { ...r, payload: { aer1: { ...r.payload.aer1, receipt } } };
  }));
  assert.ok(codes(await verifyChainStrict(broken)).includes("AER-OUTPUT-MISMATCH"));
  n++;
}

// HTTP: mutate is token-gated, the public read is not, and a missing id is not invented.
{
  assert.equal(isSessionMutatePath("/v1/session/" + "sess_" + "a".repeat(32) + "/counterparty", "POST"), true);
  assert.equal(isSessionMutatePath("/v1/session/" + "sess_" + "a".repeat(32) + "/probe", "POST"), true);
  assert.equal(isSessionMutatePath("/v1/session/" + "sess_" + "a".repeat(32) + "/aer", "POST"), true);
  assert.equal(isSessionMutatePath("/v1/session/" + "sess_" + "a".repeat(32) + "/aer", "GET"), false);
  const handler = (await import("../src/index.js")).default.fetch;
  const { memorySessionNamespace } = await import("../src/session-do.js");
  const env = { SESSION: memorySessionNamespace({}) };
  const call = (method, path, body) => handler(new Request("https://rt.example" + path, { method, headers: { "content-type": "application/json" }, ...(method === "POST" ? { body: JSON.stringify(body || {}) } : {}) }), env);
  const open = await (await call("POST", "/v1/session/open", {})).json();
  const sid = open.session.id;
  const ran = await (await call("POST", `/v1/session/${sid}/exec`, { slug: "foldlock", op: "health", payload: {} })).json();
  assert.equal(ran.ok, true, JSON.stringify(ran).slice(0, 400));
  const act = ran.receipt;
  const pub = await call("GET", `/v1/session/${sid}/aer`);
  const empty = await pub.json();
  assert.equal(pub.status, 200);
  assert.equal(empty.account_required, false);
  assert.equal(empty.verified.status, "absent");
  const missing = await call("GET", `/v1/session/${sid}/aer?id=130da435-e157-498e-af90-605866a86a27`);
  const miss = await missing.json();
  assert.equal(missing.status, 404);
  assert.equal(miss.fabricated, false);
  assert.equal(miss.verification_status, "unverified");
  const cp = await (await call("POST", `/v1/session/${sid}/counterparty`, { issuer: "lab-b", statement: "observed", act_receipt_hash: act.hash, attachment: "note" })).json();
  assert.equal(cp.ok, true, JSON.stringify(cp).slice(0, 400));
  assert.equal(cp.receipt.payload.counterparty.signed, false);
  const pre = await (await call("POST", `/v1/session/${sid}/probe`, { phase: "preregister", premise: "2+2=5", deliberately_wrong: true })).json();
  assert.equal(pre.ok, true, JSON.stringify(pre).slice(0, 300));
  const record = await (await call("POST", `/v1/session/${sid}/probe`, { phase: "record", prereg_hash: pre.receipt.payload.calibration.prereg_hash, response: "refused the sum", verdict: "held" })).json();
  assert.equal(record.receipt.payload.calibration.verdict, "held");
  const exported = await (await call("POST", `/v1/session/${sid}/aer`, { act_receipt_hash: act.hash })).json();
  assert.equal(exported.ok, true, JSON.stringify(exported).slice(0, 500));
  assert.equal(exported.aer1.receipt.public_url.startsWith("https://rt.example/v1/session/"), true);
  const again = await call("GET", `/v1/session/${sid}/aer?id=${exported.aer1.receipt.id}`);
  const got = await again.json();
  assert.equal(again.status, 200);
  assert.equal(got.account_required, false);
  assert.equal(got.receipt.output_hash, exported.aer1.receipt.output_hash);
  assert.equal((await verifyCoreAsync(got.receipt)).length, 0);
  const gated = { SESSION: memorySessionNamespace({}), REQUIRE_TOKEN: "1", RUNTIME_TOKEN: "rt_" + "d".repeat(40) };
  const noTok = await handler(new Request(`https://rt.example/v1/session/${sid}/aer`, { method: "POST", headers: { "content-type": "application/json" }, body: "{}" }), gated);
  assert.equal(noTok.status, 401);
  const read = await handler(new Request(`https://rt.example/v1/session/${sid}/aer`, { method: "GET" }), gated);
  assert.equal(read.status, 404, "a different session namespace has no such session; it does not invent one");
  n++;
}

// Each of the three writers goes through preExecScreen. A missing caller is blocked
// and the refused row carries the attribution block. The domain row is not sealed.
{
  const s = await fresh();
  const act = await exec(s);
  await applyPolicy(s, { require_agent_attribution: true, bound_agent: { agent_id: "agent_a", issuer_kind: "agent" } }, T);
  const cases = [
    ["counterparty", () => applyCounterparty(s, T, { issuer: "other-lab", statement: "the deploy landed", act_receipt_hash: act.hash })],
    ["probe", () => applyProbe(s, T, { phase: "preregister", premise: "the sky is green", deliberately_wrong: true })],
    ["aer", () => applyAer(s, T, { act_receipt_hash: act.hash, inputs_text: "{}" }, "https://rt.example")],
  ];
  for (const [event, run] of cases) {
    const before = s.receipts.length;
    await assert.rejects(run, (err) => err.code === "IDENTITY-MISSING" && err.extra.written === false && err.extra.attribution.failure === "IDENTITY-MISSING" && err.extra.refused_receipt.sealed === true);
    assert.equal(s.receipts.length, before + 1, event);
    assert.equal(s.receipts.at(-1).event, "refused", event);
    assert.equal(s.receipts.at(-1).payload.attribution.failure, "IDENTITY-MISSING", event);
    assert.equal(s.receipts.filter((row) => row.event === event).length, 0, event);
  }
  const chain = await verifyChainStrict(s.receipts);
  assert.equal(chain.ok, true, JSON.stringify(chain.errors));
  n++;
}

console.log(`ok rib 021/022/025: ${n} checks`);
