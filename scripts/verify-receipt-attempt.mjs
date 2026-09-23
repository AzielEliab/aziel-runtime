/**
 * Retry linkage: one logical request, several attempt receipts, hashes that change.
 * Author: Aziel Eliab. Not a court filing.
 */
import assert from "node:assert/strict";
import { PRODUCTS } from "../src/index.js";
import { buildRegistry } from "../src/fraggate/registry.js";
import { resetLedger } from "../src/fraggate/ledger.js";
import { fraggateCall } from "../src/fraggate/door.js";
import {
  GENESIS_PREV_HASH,
  canonicalBytes,
  composeEvidence,
  receipt,
  verifyReceipt,
} from "../src/engines/forgereceipts/engine.js";
import { forgereceiptsHealth, forgereceiptsSkill } from "../src/engines/forgereceipts/ops.js";
import { hashActReceipt, mintActReceipt } from "../src/library-receipts.js";
import { ZERO_HASH, openSession, applyOpen, recordIntent, commitExec, signReceipt, verifyChainStrict } from "../src/session-core.js";

const REQ = "req_chain_demo_0001";
const evidence = composeEvidence(
  "same",
  "incident",
  "Child's best interests recorded as context for this local receipt.",
);
const ts = "2026-09-23T00:00:00Z";

function link(attempt_n, parent_receipt_id, outcome, correlation_id = null) {
  return {
    linked: true,
    request_id: REQ,
    attempt_n,
    parent_receipt_id,
    correlation_id,
    outcome,
  };
}

const bytes1 = canonicalBytes(ts, "same", evidence, 1, GENESIS_PREV_HASH, link(1, null, "retry"));
const bytes2 = canonicalBytes(ts, "same", evidence, 1, GENESIS_PREV_HASH, link(2, null, "retry"));
const bytesCorr = canonicalBytes(ts, "same", evidence, 1, GENESIS_PREV_HASH, link(1, null, "retry", "corr_demo"));
const bytesLegacy = canonicalBytes(ts, "same", evidence, 1, GENESIS_PREV_HASH, null);
assert.notEqual(new TextDecoder().decode(bytes1), new TextDecoder().decode(bytes2));
assert.notEqual(new TextDecoder().decode(bytes1), new TextDecoder().decode(bytesCorr));
assert.equal(new TextDecoder().decode(bytesLegacy).includes("attempt_n"), false);

async function sha256Hex(bytes) {
  const dig = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(dig)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
assert.notEqual(await sha256Hex(bytes1), await sha256Hex(bytes2));

const legacyHash = await sha256Hex(bytesLegacy);
const legacy = await verifyReceipt({
  receipt: {
    timestamp: ts,
    summary: "same",
    evidence,
    confidence: 1,
    prev_hash: GENESIS_PREV_HASH,
    hash: legacyHash,
    context: { attempt_n: 2, request_id: REQ },
  },
});
assert.equal(legacy.match, true, "older seals stay valid when attempt fields were not in the hash");

const r1 = await receipt({
  note: "same",
  request_id: REQ,
  attempt_n: 1,
  parent_receipt_id: null,
  correlation_id: "corr_demo",
  outcome: "retry",
});
const r2 = await receipt({
  note: "same",
  request_id: REQ,
  attempt_n: 2,
  parent_receipt_id: r1.receipt.hash,
  correlation_id: "corr_demo",
  outcome: "retry",
});
const r3 = await receipt({
  note: "same",
  request_id: REQ,
  attempt_n: 3,
  parent_receipt_id: r2.receipt.hash,
  correlation_id: "corr_demo",
  outcome: "completed",
});
assert.equal(r1.ok && r2.ok && r3.ok, true);
assert.equal(r1.receipt.request_id, REQ);
assert.equal(r2.receipt.request_id, REQ);
assert.equal(r3.receipt.request_id, REQ);
assert.equal(r1.receipt.attempt_n, 1);
assert.equal(r2.receipt.attempt_n, 2);
assert.equal(r3.receipt.attempt_n, 3);
assert.equal(r1.receipt.parent_receipt_id, null);
assert.equal(r2.receipt.parent_receipt_id, r1.receipt.hash);
assert.equal(r3.receipt.parent_receipt_id, r2.receipt.hash);
assert.equal(r1.receipt.receipt_id, r1.receipt.hash);
assert.notEqual(r1.receipt.hash, r2.receipt.hash);
assert.notEqual(r2.receipt.hash, r3.receipt.hash);
assert.equal(r1.receipt.outcome, "retry");
assert.equal(r2.receipt.outcome, "retry");
assert.equal(r3.receipt.outcome, "completed");
assert.equal((await verifyReceipt({ receipt: r1.receipt })).match, true);
assert.equal((await verifyReceipt({ receipt: r2.receipt })).match, true);
assert.equal((await verifyReceipt({ receipt: r3.receipt })).match, true);
const tampered = { ...r2.receipt, attempt_n: 1 };
assert.equal((await verifyReceipt({ receipt: tampered })).match, false);

const health = forgereceiptsHealth();
for (const axis of ["request_id", "attempt_n", "parent_receipt_id", "correlation_id"]) {
  assert.ok(health.axes.includes(axis), axis);
}
assert.match(forgereceiptsSkill().markdown, /request_id/);
assert.match(forgereceiptsSkill().markdown, /parent_receipt_id/);
assert.match(forgereceiptsSkill().markdown, /call order only/);

const plain = {
  previous_hash: ZERO_HASH,
  request: "Asked once.",
  output: "Returned 200.",
  event: {
    surface: "fraggate",
    path: "/v1/fraggate/call",
    method: "POST",
    status: 200,
    tool: "fraggate_call",
    spec: "ACT-RECEIPT-1.0",
    runtime_version: "2.0.0-rc1",
  },
};
const act0 = await mintActReceipt(plain);
assert.equal(Object.hasOwn(act0.event, "request_id"), false);
const act1 = await mintActReceipt({
  ...plain,
  event: { ...plain.event, request_id: REQ, attempt_n: 1, parent_receipt_id: null, correlation_id: "corr_demo" },
});
const act2 = await mintActReceipt({
  ...plain,
  event: { ...plain.event, request_id: REQ, attempt_n: 2, parent_receipt_id: act1.hash, correlation_id: "corr_demo" },
});
assert.equal(act1.event.request_id, act2.event.request_id);
assert.equal(act1.event.attempt_n, 1);
assert.equal(act2.event.attempt_n, 2);
assert.equal(act2.event.parent_receipt_id, act1.hash);
assert.notEqual(act1.hash, act2.hash);
assert.notEqual(act0.hash, act1.hash);
assert.equal(await hashActReceipt({ previous_hash: act2.previous_hash, request: act2.request, output: act2.output, event: act2.event }), act2.hash);

const now = "2026-09-23T15:00:00.000Z";
const session = openSession({
  id: "sess_" + "ab".repeat(16),
  now,
  version: "2.0.0-rc1",
  source: "test",
});
await applyOpen(session, now);
const execs = [];
for (const outcome of ["retry", "retry", "completed"]) {
  const { intent } = await recordIntent(
    session,
    { slug: "forgereceipts", op: "health", payload: {}, payloadText: "{}", knownSlugs: null, banner: null },
    now,
  );
  execs.push(
    await commitExec(
      session,
      {
        intent,
        status: outcome === "completed" ? 200 : 503,
        latencyMs: 1,
        requestDigest: "aa",
        responseDigest: "bb",
        error: outcome === "completed" ? null : "again",
        upstream: null,
        responseBytes: 2,
        contentType: "application/json",
        engine: null,
        request_id: REQ,
        correlation_id: "corr_demo",
        outcome,
      },
      now,
    ),
  );
}
assert.equal(execs.length, 3);
assert.deepEqual(execs.map((r) => r.attempt_n), [1, 2, 3]);
assert.equal(execs[0].parent_receipt_id, null);
assert.equal(execs[1].parent_receipt_id, execs[0].hash);
assert.equal(execs[2].parent_receipt_id, execs[1].hash);
assert.ok(execs.every((r) => r.request_id === REQ));
assert.deepEqual(execs.map((r) => r.outcome), ["retry", "retry", "completed"]);
assert.equal(execs.filter((r) => r.outcome === "completed").length, 1);
const sealed = await verifyChainStrict(session.receipts);
assert.equal(sealed.ok, true, JSON.stringify(sealed.errors));
const broken = session.receipts.map((r) => ({ ...r }));
broken[broken.length - 1] = { ...broken[broken.length - 1], attempt_n: 9 };
assert.equal((await verifyChainStrict(broken)).ok, false);

const legacySession = await signReceipt(
  {
    version: "2.0.0-rc1",
    session_id: session.id,
    seq: 1,
    event: "open",
    ts: now,
    author: "Aziel Eliab",
    identity: "Aziel Eliab",
    runtime: "aziel-runtime",
    owner: "aziel-runtime",
    owner_note: "legacy",
    payload: { source: "test" },
  },
  ZERO_HASH,
);
assert.equal((await verifyChainStrict([legacySession])).ok, true);

resetLedger();
const registry = buildRegistry(PRODUCTS);
const first = await fraggateCall(
  {
    slug: "forgereceipts",
    op: "receipt",
    note: "envelope",
    request_id: REQ,
    attempt_n: 1,
    parent_receipt_id: null,
    correlation_id: "corr_demo",
    outcome: "retry",
  },
  registry,
  registry.bySlug,
  {},
);
assert.equal(first.code, "FG-OK");
assert.equal(first.request_id, REQ);
assert.equal(first.attempt_n, 1);
assert.equal(first.parent_receipt_id, null);
assert.equal(first.correlation_id, "corr_demo");
assert.equal(first.ledger_prev_is_retry_parent, false);
assert.equal(first.ledger_tip.prev_is_retry_parent, false);
assert.equal(first.ledger_tip.prev_role, "call-order");
assert.equal(first.result.receipt.request_id, REQ);
assert.equal(first.result.receipt.attempt_n, 1);
assert.equal(first.forgereceipts.request_id, REQ);
assert.equal(first.forgereceipts.hash_covers_attempt, true);
assert.notEqual(first.ledger_tip.prev, first.result.receipt.hash);

const second = await fraggateCall(
  {
    slug: "forgereceipts",
    op: "receipt",
    note: "envelope",
    request_id: REQ,
    attempt_n: 2,
    parent_receipt_id: first.result.receipt.hash,
    correlation_id: "corr_demo",
    outcome: "completed",
  },
  registry,
  registry.bySlug,
  {},
);
assert.equal(second.attempt_n, 2);
assert.equal(second.parent_receipt_id, first.result.receipt.hash);
assert.equal(second.result.receipt.parent_receipt_id, first.result.receipt.hash);
assert.notEqual(second.result.receipt.hash, first.result.receipt.hash);
assert.equal(second.ledger_tip.prev_is_retry_parent, false);
assert.notEqual(second.ledger_tip.prev, second.parent_receipt_id);
assert.equal((await verifyReceipt({ receipt: second.result.receipt })).match, true);

const handler = (await import("../src/index.js")).default.fetch;
const origin = "https://aziel-runtime.example";
const openapi = await (await handler(new Request(origin + "/openapi.json"), {})).json();
const TOKENS = ["request_id", "attempt_n", "parent_receipt_id", "correlation_id", "outcome"];
for (const name of ["ForgeReceipt", "SessionReceipt", "ResultEnvelope"]) {
  const props = openapi.components.schemas[name].properties;
  for (const token of TOKENS) {
    assert.ok(props[token], `${name} schema missing ${token}`);
  }
}
assert.equal(openapi.components.schemas.ResultEnvelope.properties.ledger_tip.properties.prev_is_retry_parent.type, "boolean");
const callSchema = openapi.paths["/v1/fraggate/call"].post.requestBody.content["application/json"].schema.properties;
for (const token of TOKENS) assert.ok(callSchema[token], `CallEnvelope schema missing ${token}`);
assert.equal(
  openapi.paths["/v1/fraggate/call"].post.responses["200"].content["application/json"].schema.$ref,
  "#/components/schemas/ResultEnvelope",
);
assert.equal(
  openapi.paths["/v1/session/{id}/receipt"].get.responses["200"].content["application/json"].schema.properties.receipt.$ref,
  "#/components/schemas/SessionReceipt",
);

const described = await (await handler(new Request(origin + "/v1/fraggate/describe?slug=forgereceipts"), {})).json();
const software = await (await handler(new Request(origin + "/v1/software"), {})).json();
const card = software.software.find((s) => s.slug === "forgereceipts");
assert.equal(described.description, card.description);
assert.match(described.description, /request_id/);
assert.match(described.description, /attempt_n/);
assert.match(described.description, /parent_receipt_id/);
assert.match(described.description, /correlation_id/);
assert.match(described.description, /outcome/);
assert.match(described.description, /hashed into the receipt/);
assert.match(described.description, /call-order only/);
assert.match(described.description, /prev_is_retry_parent false/);
assert.doesNotMatch(described.description, /^Mint and hash-check/);

const skill = await (await handler(new Request(origin + "/v1/skill"), {})).text();
assert.match(skill, /Attempt linkage \(additive\)/);
assert.match(skill, /request_id/);
assert.match(skill, /attempt_n/);
assert.match(skill, /parent_receipt_id/);
assert.match(skill, /correlation_id/);
assert.match(skill, /outcome/);
assert.match(skill, /not the retry parent/);
assert.match(skill, /not a forensic finding/);
assert.match(skill, /prev_is_retry_parent/);

console.log("ok receipt-attempt: hashed request_id / attempt_n / parent_receipt_id / correlation_id");
