/**
 * RIB-015 / AZRT-ISSUER-APPEND-1.0: genesis records the issuer; only the issuer may append stale or
 * revoke stamps (CL-NOT-ISSUER otherwise, chain unchanged); the run path only reads and refuses;
 * verify fails closed on control stamps not by the issuer and on anything run or graded after them.
 */
import assert from "node:assert/strict";
import { expectSpecOf, verdictOf } from "../src/receipt-guard.js";
import { appendReceipt, applyClose, applyOpen, applyRevoke, applyStale, additiveReceiptFields, newSessionId, openSession, recordIntent, verifyChainStrict } from "../src/session-core.js";
import { issuerKeyHash, newIssuerKey, specState, verifyIssuerAppend } from "../src/issuer-append.js";
import { memorySessionNamespace } from "../src/session-do.js";

let n = 0;
const T = "2026-10-12T00:00:00Z";
const exp = await expectSpecOf({ spec: { state: "ok" }, verdict_criteria: "200", world_version: "w-1" });
const verdict = verdictOf({ pass: true }).verdict;
const ISS = await newIssuerKey();
const OTHER = await newIssuerKey();
const codes = (v) => v.errors.map((e) => e.error);
async function run(withIssuer = true) {
  const s = openSession({ id: newSessionId(), now: T, version: "test" });
  await applyOpen(s, T, { expect: exp.expect, expect_hash: exp.expect_hash, ...(withIssuer ? { issuer_key_hash: ISS.key_hash } : {}) });
  return s;
}
const intent = (s) => recordIntent(s, { slug: "foldlock", op: "health", payload: {}, payloadText: "{}" }, T);

// Genesis records the issuer hash, never the key.
{
  const s = await run();
  assert.equal(s.receipts[0].issuer.key_hash, ISS.key_hash);
  assert.equal(s.receipts[0].issuer.key_hash, await issuerKeyHash(ISS.key));
  assert.doesNotMatch(JSON.stringify(s.receipts), new RegExp(ISS.key)); n++;
  // A caller cannot set or overwrite the issuer through additive fields.
  assert.equal(additiveReceiptFields({ issuer: { key_hash: "x" }, written_by: {}, revoke: {}, stale: {} }).issuer, undefined);
  assert.deepEqual(Object.keys(additiveReceiptFields({ issuer: 1, written_by: 1, revoke: 1, stale: 1 })), []); n++;
}
// Non-issuer stale and revoke refuse CL-NOT-ISSUER and leave the chain unchanged.
for (const [name, fn, body] of [["stale", applyStale, { new_world_version: "w-2", reason: "r" }], ["revoke", applyRevoke, { reason: "r" }]]) {
  const s = await run();
  const before = JSON.stringify(s.receipts);
  for (const key of [null, "", OTHER.key, ISS.key_hash]) {
    await assert.rejects(fn(s, T, body, { issuerKey: key }), (e) => e.code === "CL-NOT-ISSUER" && e.status === 403, `${name} ${key}`);
  }
  assert.equal(JSON.stringify(s.receipts), before);
  // Legacy chain with no issuer at genesis: no one may write (fail closed), even with a key.
  const legacy = await run(false);
  await assert.rejects(fn(legacy, T, body, { issuerKey: ISS.key }), (e) => e.code === "CL-NOT-ISSUER" && e.extra.reason === "no_issuer");
  n++;
}
// Issuer revocation: appended, exec refuses (read-only check), verdict refuses, verify passes.
{
  const s = await run();
  const { intent: i1 } = await intent(s);
  assert.ok(i1);
  s.pending_intent = null;
  const r = await applyRevoke(s, T, { reason: "issuer withdrew the spec" }, { issuerKey: ISS.key });
  assert.equal(r.event, "revoke"); assert.equal(r.written_by.issuer_key_hash, ISS.key_hash); assert.equal(r.revoke.genesis_hash, s.receipts[0].hash);
  const st = specState(s.receipts);
  assert.equal(st.revoked, true); assert.equal(st.exec_allowed, false);
  const len = s.receipts.length;
  await assert.rejects(intent(s), (e) => e.code === "SPEC-REVOKED" && e.extra.executed === false);
  await assert.rejects(applyClose(s, T, { additive: { verdict } }), (e) => e.code === "SPEC-REVOKED");
  await assert.rejects(applyRevoke(s, T, { reason: "again" }, { issuerKey: ISS.key }), (e) => e.code === "REVOKE-DUPLICATE");
  assert.equal(s.receipts.length, len);
  const v = await verifyChainStrict(s.receipts);
  assert.equal(v.ok, true, JSON.stringify(v.errors)); assert.equal(v.issuer_append.revoked_at_seq, r.seq); n++;
}
// Issuer stale: exec refuses SPEC-STALE.
{
  const s = await run();
  await applyStale(s, T, { new_world_version: "w-2", reason: "moved" }, { issuerKey: ISS.key });
  await assert.rejects(intent(s), (e) => e.code === "SPEC-STALE"); n++;
}
// Revocation works without a spec too (issuer owns the run log); refuses empty reason.
{
  const s = openSession({ id: newSessionId(), now: T, version: "test" });
  await applyOpen(s, T, { issuer_key_hash: ISS.key_hash });
  await assert.rejects(applyRevoke(s, T, { reason: "" }, { issuerKey: ISS.key }), (e) => e.code === "REVOKE-INVALID");
  await applyRevoke(s, T, { reason: "stop" }, { issuerKey: ISS.key });
  await assert.rejects(intent(s), (e) => e.code === "SPEC-REVOKED"); n++;
}
// Verify fails closed on forged control stamps and on anything run or graded after them.
{
  const s = await run();
  await appendReceipt(s, "revoke", {}, T, { revoke: { reason: "forged" }, written_by: { issuer_key_hash: OTHER.key_hash } });
  assert.ok(codes(await verifyChainStrict(s.receipts)).includes("CL-NOT-ISSUER"));
  const s2 = await run();
  await appendReceipt(s2, "stale", {}, T, { stale: { spec_ref: { receipt_hash: s2.receipts[0].hash, expect_hash: exp.expect_hash }, spec_world_version: "w-1", new_world_version: "w-2" } });
  assert.ok(codes(await verifyChainStrict(s2.receipts)).includes("CL-NOT-ISSUER"));
  const s3 = await run();
  await applyRevoke(s3, T, { reason: "stop" }, { issuerKey: ISS.key });
  await appendReceipt(s3, "exec", { intent: {} }, T);
  await appendReceipt(s3, "close", { sealed: true }, T, { verdict });
  const c3 = codes(await verifyChainStrict(s3.receipts));
  assert.ok(c3.includes("EXEC-AFTER-REVOKE")); assert.ok(c3.includes("EXPECT-VERDICT-REVOKED"));
  const s4 = await run();
  await applyStale(s4, T, { new_world_version: "w-2", reason: "m" }, { issuerKey: ISS.key });
  await appendReceipt(s4, "exec", { intent: {} }, T);
  assert.ok(codes(await verifyChainStrict(s4.receipts)).includes("EXEC-AFTER-STALE"));
  // Legacy chains with no control stamps verify as before.
  const legacy = await run(false);
  assert.equal(verifyIssuerAppend(legacy.receipts).ok, true); assert.equal(verifyIssuerAppend(legacy.receipts).issuer, null); n++;
}
// HTTP: open returns the key once; wrong/missing key 403; issuer revoke works; GET /spec is read-only; exec refuses.
{
  const handler = (await import("../src/index.js")).default.fetch;
  const env = { SESSION: memorySessionNamespace({}) };
  const req = (m, p, body, key) => handler(new Request("https://rt.example" + p, { method: m, headers: { "content-type": "application/json", ...(key ? { "x-azrt-issuer-key": key } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) }), env);
  const open = await (await req("POST", "/v1/session/open", { expect: { spec: "s", verdict_criteria: "c" } })).json();
  const id = open.session.id;
  assert.match(open.issuer_key, /^isk_[a-f0-9]{64}$/);
  assert.equal(open.receipt.issuer.key_hash, await issuerKeyHash(open.issuer_key));
  assert.doesNotMatch(JSON.stringify(open.receipt), new RegExp(open.issuer_key));
  const again = await (await req("POST", "/v1/session/open", { id })).json();
  assert.equal(again.issuer_key, undefined, "a re-open never hands out a key");
  // A client cannot pick its own issuer hash at open.
  const forged = await (await req("POST", "/v1/session/open", { issuer_key_hash: OTHER.key_hash })).json();
  assert.notEqual(forged.receipt.issuer.key_hash, OTHER.key_hash);
  for (const k of [null, OTHER.key]) {
    const r = await req("POST", `/v1/session/${id}/revoke`, { reason: "x" }, k);
    assert.equal(r.status, 403); assert.equal((await r.json()).code, "CL-NOT-ISSUER");
    const s = await req("POST", `/v1/session/${id}/stale`, { new_world_version: "w-9", reason: "x" }, k);
    assert.equal(s.status, 403);
  }
  const spec0 = await (await req("GET", `/v1/session/${id}/spec`)).json();
  assert.equal(spec0.state.exec_allowed, true); assert.equal(spec0.state.issuer_recorded, true);
  const ok = await req("POST", `/v1/session/${id}/revoke`, { reason: "withdrawn" }, open.issuer_key);
  assert.equal(ok.status, 200);
  const spec1 = await (await req("GET", `/v1/session/${id}/spec`)).json();
  assert.equal(spec1.state.revoked, true); assert.equal(spec1.state.exec_allowed, false);
  const ex = await req("POST", `/v1/session/${id}/exec`, { slug: "foldlock", op: "health", payload: {} });
  assert.equal(ex.status, 409); assert.equal((await ex.json()).code, "SPEC-REVOKED");
  // GET /spec has no write side: repeated reads leave the chain length unchanged.
  const before = (await (await req("GET", `/v1/session/${id}/receipts`)).json()).receipts.length;
  await req("GET", `/v1/session/${id}/spec`);
  assert.equal((await (await req("GET", `/v1/session/${id}/receipts`)).json()).receipts.length, before); n++;
}
console.log(`ok issuer append + revocation (RIB-015): ${n} checks`);
