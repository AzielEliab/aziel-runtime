/**
 * RIB-018 on the session chain: every pre-exec policy refusal appends exactly one `refused` receipt
 * (outcome=failed, code, slug, op, payload_digest) that links by prev_hash and verifies; no exec receipt.
 * Closed-session and receipt-cap refusals cannot seal and say so.
 */
import assert from "node:assert/strict";
import { applyClose, applyOpen, applyPolicy, digestText, newSessionId, openSession, recordIntent, verifyChain, verifyChainStrict } from "../src/session-core.js";
import { memorySessionNamespace } from "../src/session-do.js";

let n = 0;
const T = "2026-10-12T00:00:00Z";
async function fresh(policy) {
  const s = openSession({ id: newSessionId(), now: T, version: "test" });
  await applyOpen(s, T, {});
  if (policy) await applyPolicy(s, policy, T);
  return s;
}
const ask = (s, a) => recordIntent(s, { payload: {}, payloadText: "{}", ...a }, T);

for (const [name, policy, args, code] of [
  ["slug", { allow_slugs: ["azclce"] }, { slug: "foldlock", op: "health" }, "slug_not_allowed"],
  ["op", { allow_ops: ["score"] }, { slug: "foldlock", op: "health" }, "op_not_allowed"],
  ["payload", { max_payload_bytes: 4 }, { slug: "foldlock", op: "health", payloadText: "{\"x\":\"too big\"}" }, "payload_too_large"],
  ["unknown", null, { slug: "nope", op: "x", knownSlugs: new Set(["foldlock"]) }, "unknown_slug"],
  ["bad", null, { slug: "", op: "" }, "bad_exec"],
]) {
  const s = await fresh(policy);
  const before = s.receipts.length;
  await assert.rejects(ask(s, args), (e) => e.code === code && e.extra.refused_receipt.sealed === true);
  assert.equal(s.receipts.length, before + 1, name);
  const r = s.receipts.at(-1);
  assert.equal(r.event, "refused"); assert.equal(r.outcome, "failed");
  assert.equal(r.payload.refusal.code, code); assert.equal(r.payload.refusal.executed, false);
  assert.equal(r.payload.refusal.payload_digest, (await digestText(args.payloadText ?? "{}")).sha256);
  assert.equal(r.prev_hash, s.receipts.at(-2).hash);
  assert.equal(s.receipts.filter((x) => x.event === "exec").length, 0);
  assert.equal(s.pending_intent ?? null, null, "no intent left pending");
  assert.equal(verifyChain(s.receipts).ok, true);
  assert.equal((await verifyChainStrict(s.receipts)).ok, true, name); n++;
}
// max_ops refusal seals too, and does not consume an exec.
{
  const s = await fresh({ max_ops: 1 });
  await ask(s, { slug: "foldlock", op: "health" });
  s.pending_intent = null;
  const used = s.exec_count;
  await assert.rejects(ask(s, { slug: "foldlock", op: "health" }), (e) => e.code === "max_ops");
  assert.equal(s.receipts.at(-1).event, "refused"); assert.equal(s.exec_count, used); n++;
}
// Closed session: no receipt possible, and it says so.
{
  const s = await fresh();
  await applyClose(s, T, {});
  const len = s.receipts.length;
  await assert.rejects(ask(s, { slug: "foldlock", op: "health" }), (e) => e.code === "session_closed" && e.extra.refused_receipt.sealed === false);
  assert.equal(s.receipts.length, len); n++;
}
// Receipt cap: no room to seal, and it says so.
{
  const { RECEIPT_CAP } = await import("../src/production.js");
  assert.ok(RECEIPT_CAP > 0);
  const s = await fresh();
  const pad = s.receipts[0];
  while (RECEIPT_CAP && s.receipts.length < RECEIPT_CAP) s.receipts.push(pad);
  if (RECEIPT_CAP) {
    const len = s.receipts.length;
    await assert.rejects(ask(s, { slug: "foldlock", op: "health" }), (e) => e.code === "receipt_cap" && e.extra.refused_receipt.sealed === false);
    assert.equal(s.receipts.length, len);
  }
  n++;
}
// HTTP door: denied slug -> exactly one refused receipt, persisted, no exec receipt; chain verifies.
{
  const handler = (await import("../src/index.js")).default.fetch;
  const env = { SESSION: memorySessionNamespace({}) };
  const req = (m, p, body) => handler(new Request("https://rt.example" + p, { method: m, headers: { "content-type": "application/json" }, ...(body ? { body: JSON.stringify(body) } : {}) }), env);
  const open = await (await req("POST", "/v1/session/open", {})).json();
  const id = open.session.id;
  await req("POST", `/v1/session/${id}/policy`, { allow_slugs: ["azclce"] });
  const denied = await req("POST", `/v1/session/${id}/exec`, { slug: "foldlock", op: "health", payload: {} });
  assert.equal(denied.status, 403);
  const dj = await denied.json();
  assert.equal(dj.code, "slug_not_allowed"); assert.equal(dj.refused_receipt.sealed, true);
  const all = await (await req("GET", `/v1/session/${id}/receipts`)).json();
  assert.equal(all.receipts.filter((r) => r.event === "refused").length, 1);
  assert.equal(all.receipts.filter((r) => r.event === "exec").length, 0);
  assert.equal(all.verified.ok, true);
  // Sealed, not signed: with no RIB-042 key provisioned, the refused receipt carries no signature value.
  const last = all.receipts.at(-1);
  assert.ok(!last.signature || last.signature.sig === null, JSON.stringify(last.signature));
  assert.doesNotMatch(JSON.stringify(last), /signed_by/i); n++;
}
console.log(`ok session refused receipts (RIB-018): ${n} checks`);
