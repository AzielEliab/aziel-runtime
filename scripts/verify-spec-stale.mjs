/**
 * RIB-014 / AZRT-SPEC-STALE-1.0: the sealed spec binds a world_version; a moved world is an appended
 * stale stamp (never an edit); no verdict can be graded against a stale spec; no timer decides it.
 */
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { expectSpecOf, verdictOf } from "../src/receipt-guard.js";
import { appendReceipt, applyClose, applyOpen, applyStale, canonicalize, newSessionId, openSession, sha256Hex, verifyChainStrict } from "../src/session-core.js";
import { specStaleness, staleRequestOf } from "../src/spec-stale.js";
import { memorySessionNamespace } from "../src/session-do.js";
import { newIssuerKey } from "../src/issuer-append.js";
// RIB-015 (stacked): stale stamps are issuer-only, so every test run opens with an issuer key.
const ISS = await newIssuerKey();
const K = { issuerKey: ISS.key };

let n = 0;
const T = "2026-10-12T00:00:00Z";
const ex = { intent: { slug: "foldlock", op: "health" }, result: { status: 200 } };
const exp = await expectSpecOf({ spec: { state: "foldlock health ok" }, verdict_criteria: "status 200", world_version: "w-1" });
const verdict = verdictOf({ pass: true }).verdict;
async function run() {
  const s = openSession({ id: newSessionId(), now: T, version: "test" });
  await applyOpen(s, T, { expect: exp.expect, expect_hash: exp.expect_hash, issuer_key_hash: ISS.key_hash });
  await appendReceipt(s, "exec", ex, T);
  return s;
}
const codes = (v) => v.errors.map((e) => e.error);

// Spec carries world_version (inside the hashed expect).
{
  const s = await run();
  assert.equal(s.receipts[0].expect.world_version, "w-1");
  const st = specStaleness(s.receipts);
  assert.equal(st.status, "fresh"); assert.equal(st.spec_world_version, "w-1"); n++;
}
// Fresh spec: verdict seals and is valid.
{
  const s = await run();
  const { session } = await applyClose(s, T, { additive: { verdict } });
  const v = await verifyChainStrict(session.receipts);
  assert.equal(v.ok, true, JSON.stringify(v.errors)); assert.equal(v.spec_stale.verdict_valid, true); n++;
}
// Stale stamp is appended; stamp #1 is untouched and the chain still verifies.
{
  const s = await run();
  const before = JSON.stringify(s.receipts[0]);
  const r = await applyStale(s, T, { new_world_version: "w-2", reason: "upstream schema moved" }, K);
  assert.equal(r.event, "stale"); assert.equal(r.seq, 3);
  assert.equal(r.stale.spec_world_version, "w-1"); assert.equal(r.stale.new_world_version, "w-2");
  assert.equal(r.stale.spec_ref.receipt_hash, s.receipts[0].hash);
  assert.equal(JSON.stringify(s.receipts[0]), before);
  const v = await verifyChainStrict(s.receipts);
  assert.equal(v.ok, true); assert.equal(v.spec_stale.status, "stale"); assert.equal(v.spec_stale.stale_at_seq, 3); assert.equal(v.spec_stale.current_world_version, "w-2"); n++;
  // Grading against it refuses, and nothing is appended.
  const len = s.receipts.length;
  await assert.rejects(applyClose(s, T, { additive: { verdict } }), (e) => e.code === "EXPECT-SPEC-STALE" && e.status === 409);
  assert.equal(s.receipts.length, len); assert.equal(s.closed, false); n++;
  // Closing without a verdict is still allowed.
  const { session } = await applyClose(s, T, {});
  assert.equal((await verifyChainStrict(session.receipts)).spec_stale.verdict_valid, null); n++;
}
// A verdict smuggled in after a stale stamp (bypassing close) fails verify closed.
{
  const s = await run();
  await applyStale(s, T, { new_world_version: "w-2", reason: "moved" }, K);
  await appendReceipt(s, "close", { sealed: true }, T, { verdict });
  const v = await verifyChainStrict(s.receipts);
  assert.equal(v.ok, false); assert.ok(codes(v).includes("EXPECT-VERDICT-STALE-SPEC")); assert.equal(v.spec_stale.verdict_valid, false); n++;
}
// A verdict sealed BEFORE a later stale stamp stays valid (old verdicts stay honest).
{
  const st = specStaleness([
    { seq: 1, hash: "h1", expect_hash: "e", expect: { world_version: "w-1" } },
    { seq: 2, verdict: { pass: true } },
    { seq: 3, stale: { spec_ref: { receipt_hash: "h1", expect_hash: "e" }, spec_world_version: "w-1", new_world_version: "w-2" } },
  ]);
  assert.equal(st.ok, true); assert.equal(st.verdict_valid, true); n++;
}
// Refusals: no spec, same version, bad body, forged stale stamps.
{
  const s = openSession({ id: newSessionId(), now: T, version: "test" });
  await applyOpen(s, T, { issuer_key_hash: ISS.key_hash });
  await assert.rejects(applyStale(s, T, { new_world_version: "w-2", reason: "x" }, K), (e) => e.code === "SPEC-STALE-NO-SPEC");
  const s2 = await run();
  await assert.rejects(applyStale(s2, T, { new_world_version: "w-1", reason: "x" }, K), (e) => e.code === "SPEC-STALE-SAME-VERSION");
  for (const bad of [null, {}, { new_world_version: "" }, { new_world_version: "w", reason: "" }, { new_world_version: { a: 1 }, reason: "r" }]) assert.equal(staleRequestOf(bad).ok, false);
  await applyStale(s2, T, { new_world_version: "w-2", reason: "a" }, K);
  await applyStale(s2, T, { new_world_version: "w-3", reason: "b" }, K);
  assert.equal((await verifyChainStrict(s2.receipts)).spec_stale.current_world_version, "w-3"); n++;
  const forged = specStaleness([
    { seq: 1, hash: "h1", expect_hash: "e", expect: { world_version: "w-1" } },
    { seq: 2, stale: { spec_ref: { receipt_hash: "other", expect_hash: "e" }, spec_world_version: "w-9", new_world_version: "w-2" } },
  ]);
  assert.deepEqual(forged.errors.map((e) => e.code).sort(), ["SPEC-STALE-REF-MISMATCH", "SPEC-STALE-VERSION-MISMATCH"]);
  assert.equal(specStaleness([{ seq: 1, hash: "h" }, { seq: 2, stale: {} }]).errors[0].code, "SPEC-STALE-NO-SPEC"); n++;
}
// Callers cannot inject a stale stamp through exec/close additive fields.
{
  const { additiveReceiptFields } = await import("../src/session-core.js");
  assert.equal(additiveReceiptFields({ stale: { new_world_version: "x" } }).stale, undefined); n++;
}
// No timers: a spec opened long ago with an old world_version is still fresh; only a sealed stamp moves it.
{
  const s = openSession({ id: newSessionId(), now: "2000-01-01T00:00:00Z", version: "test" });
  await applyOpen(s, "2000-01-01T00:00:00Z", { expect: exp.expect, expect_hash: exp.expect_hash });
  assert.equal(specStaleness(s.receipts).status, "fresh");
  const src = await readFile(new URL("../src/spec-stale.js", import.meta.url), "utf8");
  assert.doesNotMatch(src.replace(/\/\*[\s\S]*?\*\//g, ""), /Date\.now|new Date|setTimeout|setInterval|ttl/i);
  assert.doesNotMatch(src, /\bsigned receipts?\b/i); n++;
}
// HTTP door: POST /v1/session/{id}/stale appends; close with verdict then refuses 409.
{
  const handler = (await import("../src/index.js")).default.fetch;
  const env = { SESSION: memorySessionNamespace({}) };
  let key = null;
  const call = (p, body) => handler(new Request("https://rt.example" + p, { method: "POST", headers: { "content-type": "application/json", ...(key ? { "x-azrt-issuer-key": key } : {}) }, body: JSON.stringify(body) }), env);
  const openRes = await call("/v1/session/open", { expect: { spec: "s", verdict_criteria: "c", world_version: "w-1" } });
  const open = await openRes.json();
  const id = open.session.id;
  key = open.issuer_key;
  const bad = await call(`/v1/session/${id}/stale`, { new_world_version: "" });
  assert.equal(bad.status, 400);
  const ok = await call(`/v1/session/${id}/stale`, { new_world_version: "w-2", reason: "moved" });
  const okj = await ok.json();
  assert.equal(ok.status, 200, JSON.stringify(okj)); assert.equal(okj.spec_stale.status, "stale");
  const cl = await call(`/v1/session/${id}/close`, { verdict: { pass: true } });
  assert.equal(cl.status, 409); assert.equal((await cl.json()).code, "EXPECT-SPEC-STALE"); n++;
}
void canonicalize; void sha256Hex;
console.log(`ok spec stale (RIB-014): ${n} checks`);
