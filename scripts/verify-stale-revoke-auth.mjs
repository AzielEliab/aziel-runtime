/**
 * AZBot finding on #296 (c3cb8cc): with REQUIRE_TOKEN=1, stale and revoke were outside the token gate, so a
 * leaked issuer key alone could revoke a session (permanent; exec then refuses SPEC-REVOKED) or append a
 * stale stamp. Worse, pause -> revoke/stale while paused -> resume refused RESUME-ANCHOR-MISMATCH ("rows
 * appended while paused") on every retry: the session was bricked forever.
 * Now: stale/revoke are token-gated AND issuer-only, and both refuse 409 SESSION-PAUSED while paused with no
 * row appended, so resume still matches the frozen head. Every refusal leaves the chain unchanged.
 */
import assert from "node:assert/strict";
import { isSessionMutatePath } from "../src/production.js";
import { memorySessionNamespace } from "../src/session-do.js";
import { newIssuerKey } from "../src/issuer-append.js";
import { applyOpen, applyRevoke, applyStale, newSessionId, openSession, verifyChainStrict } from "../src/session-core.js";
import { expectSpecOf } from "../src/receipt-guard.js";

let n = 0;
const SID = "sess_" + "a".repeat(32);
const TOKEN = "rt_" + "c".repeat(40);
const OTHER = await newIssuerKey();
const handler = (await import("../src/index.js")).default.fetch;

// 1) The token gate covers stale and revoke (POST only); reads and look-alikes stay outside.
for (const a of ["stale", "revoke"]) {
  assert.equal(isSessionMutatePath(`/v1/session/${SID}/${a}`, "POST"), true, a);
  assert.equal(isSessionMutatePath(`/v1/session/${SID}/${a}`, "GET"), false, a);
  assert.equal(isSessionMutatePath(`/v1/session/${SID}/${a}x`, "POST"), false, a);
  assert.equal(isSessionMutatePath(`/v1/session/${SID}/${a}/`, "POST"), false, a);
}
assert.equal(isSessionMutatePath(`/v1/session/${SID}/spec`, "GET"), false); n++;

function harness(env) {
  const req = (m, p, body, { token, issuer } = {}) =>
    handler(new Request("https://rt.example" + p, {
      method: m,
      headers: { "content-type": "application/json", ...(token ? { authorization: "Bearer " + token } : {}), ...(issuer ? { "x-azrt-issuer-key": issuer } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {}),
    }), env);
  const receipts = async (id) => (await (await req("GET", `/v1/session/${id}/receipts`)).json()).receipts;
  const spec = async (id) => (await (await req("GET", `/v1/session/${id}/spec`)).json()).state;
  const open = async (token) => (await (await req("POST", "/v1/session/open", { expect: { spec: "s", verdict_criteria: "c", world_version: "w-1" } }, { token })).json());
  return { req, receipts, spec, open };
}
const BODY = { stale: { new_world_version: "w-2", reason: "world moved" }, revoke: { reason: "withdrawn" } };

// 2) REQUIRE_TOKEN=1: the issuer key alone is 401, never 200. Nothing is written; the spec is not revoked or stale.
{
  const env = { SESSION: memorySessionNamespace({}), REQUIRE_TOKEN: "1", RUNTIME_TOKEN: TOKEN };
  const { req, receipts, spec, open } = harness(env);
  const o = await open(TOKEN);
  const id = o.session.id; const ik = o.issuer_key;
  assert.match(ik, /^isk_[a-f0-9]{64}$/);
  const len0 = (await receipts(id)).length;
  for (const action of ["stale", "revoke"]) {
    let r = await req("POST", `/v1/session/${id}/${action}`, BODY[action], { issuer: ik });
    assert.equal(r.status, 401, `${action}: issuer key alone must be 401`); assert.equal((await r.json()).code, "token_required");
    r = await req("POST", `/v1/session/${id}/${action}`, BODY[action], { token: "wrong-token", issuer: ik });
    assert.equal(r.status, 401); assert.equal((await r.json()).code, "token_mismatch");
    r = await req("POST", `/v1/session/${id}/${action}?token=${TOKEN}`, BODY[action], { issuer: ik });
    assert.equal(r.status, 400); assert.equal((await r.json()).code, "TOKEN-QUERY-REFUSED");
    // Token but no / wrong issuer: still 403 CL-NOT-ISSUER (the issuer requirement is kept).
    for (const issuer of [null, OTHER.key]) {
      r = await req("POST", `/v1/session/${id}/${action}`, BODY[action], { token: TOKEN, issuer });
      assert.equal(r.status, 403, action); assert.equal((await r.json()).code, "CL-NOT-ISSUER");
    }
    assert.equal((await receipts(id)).length, len0, `${action} refusals leave the chain unchanged`);
  }
  const st = await spec(id);
  assert.equal(st.revoked, false); assert.equal(st.exec_allowed, true); n++;

  // Honest path: token + issuer works for both.
  let r = await req("POST", `/v1/session/${id}/stale`, BODY.stale, { token: TOKEN, issuer: ik });
  assert.equal(r.status, 200, JSON.stringify(await r.clone().json())); assert.equal((await r.json()).receipt.event, "stale");
  r = await req("POST", `/v1/session/${id}/revoke`, BODY.revoke, { token: TOKEN, issuer: ik });
  assert.equal(r.status, 200); assert.equal((await r.json()).receipt.event, "revoke");
  assert.equal((await spec(id)).revoked, true);
  assert.equal((await verifyChainStrict(await receipts(id))).ok, true); n++;
}

// 3) REQUIRE_TOKEN=1 with no RUNTIME_TOKEN configured: 503 token_not_configured (fail closed), nothing written.
{
  const mem = memorySessionNamespace({});
  const pub = harness({ SESSION: mem });
  const o = await pub.open();
  const { req, receipts } = harness({ SESSION: mem, REQUIRE_TOKEN: "1" });
  for (const action of ["stale", "revoke"]) {
    const r = await req("POST", `/v1/session/${o.session.id}/${action}`, BODY[action], { issuer: o.issuer_key });
    assert.equal(r.status, 503, action); assert.equal((await r.json()).code, "token_not_configured");
  }
  assert.equal((await receipts(o.session.id)).length, 1); n++;
}

// 4) Pause -> revoke/stale while paused is 409 SESSION-PAUSED (no row, still paused) -> resume succeeds -> stamp succeeds.
for (const action of ["revoke", "stale"]) {
  const env = { SESSION: memorySessionNamespace({}), REQUIRE_TOKEN: "1", RUNTIME_TOKEN: TOKEN };
  const { req, receipts, spec, open } = harness(env);
  const o = await open(TOKEN);
  const id = o.session.id; const auth = { token: TOKEN, issuer: o.issuer_key };
  let r = await req("POST", `/v1/session/${id}/pause`, {}, auth);
  assert.equal(r.status, 200); assert.equal((await r.json()).receipt.event, "freeze");
  const frozen = await receipts(id);
  for (let i = 0; i < 3; i++) {
    r = await req("POST", `/v1/session/${id}/${action}`, BODY[action], auth);
    const b = await r.json();
    assert.equal(r.status, 409, `${action} while paused`); assert.equal(b.code, "SESSION-PAUSED"); assert.equal(b.written, false); assert.equal(b.stamp, action);
  }
  assert.deepEqual(await receipts(id), frozen, `${action}: no row appended while paused`);
  // Still paused: exec refuses SESSION-PAUSED (the refused stamp did not unpause or alter the session).
  const exPaused = await req("POST", `/v1/session/${id}/exec`, { slug: "foldlock", op: "health", payload: {} }, { token: TOKEN });
  assert.equal(exPaused.status, 409); assert.equal((await exPaused.json()).code, "SESSION-PAUSED");
  assert.deepEqual(await receipts(id), frozen);
  assert.equal((await spec(id)).revoked, false);
  r = await req("POST", `/v1/session/${id}/resume`, {}, auth);
  const rb = await r.json();
  assert.equal(r.status, 200, `${action}: resume must still succeed: ${JSON.stringify(rb)}`); assert.equal(rb.receipt.event, "resume");
  r = await req("POST", `/v1/session/${id}/${action}`, BODY[action], auth);
  assert.equal(r.status, 200, `${action} after resume`); assert.equal((await r.json()).receipt.event, action);
  if (action === "revoke") {
    const ex = await req("POST", `/v1/session/${id}/exec`, { slug: "foldlock", op: "health", payload: {} }, { token: TOKEN });
    assert.equal(ex.status, 409); assert.equal((await ex.json()).code, "SPEC-REVOKED");
  }
  assert.equal((await verifyChainStrict(await receipts(id))).ok, true); n++;
}

// 5) Core: applyStale/applyRevoke refuse a paused session before appending, and leave the session object unchanged.
{
  const ISS = await newIssuerKey();
  const exp = await expectSpecOf({ spec: { state: "ok" }, verdict_criteria: "200", world_version: "w-1" });
  const T = new Date().toISOString();
  const s = openSession({ id: newSessionId(), now: T, version: "test" });
  await applyOpen(s, T, { expect: exp.expect, expect_hash: exp.expect_hash, issuer_key_hash: ISS.key_hash });
  s.paused = true;
  const snap = structuredClone(s);
  for (const [fn, raw] of [[applyStale, BODY.stale], [applyRevoke, BODY.revoke]]) {
    await assert.rejects(fn(s, T, raw, { issuerKey: ISS.key }), (e) => e.status === 409 && e.code === "SESSION-PAUSED" && e.extra.written === false);
    assert.deepEqual(s, snap, "session unchanged");
    // A non-issuer is still refused as a non-issuer first (403), never told anything else.
    await assert.rejects(fn(s, T, raw, { issuerKey: OTHER.key }), (e) => e.code === "CL-NOT-ISSUER");
  }
  s.paused = false;
  assert.equal((await applyStale(s, T, BODY.stale, { issuerKey: ISS.key })).event, "stale"); n++;
}

console.log(`ok stale/revoke token gate + SESSION-PAUSED (no brick): ${n} checks`);
