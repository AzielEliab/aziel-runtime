/**
 * AZBot live probe of 22ba95e: pause/resume were outside the token gate (isSessionMutatePath) and had
 * no issuer check, so anyone holding a session id could pause or resume. Now both are token-gated
 * like policy/exec/close, and issuer-only like stale/revoke (X-Azrt-Issuer-Key, else 403 CL-NOT-ISSUER).
 * Every refusal leaves the chain unchanged.
 */
import assert from "node:assert/strict";
import { isSessionMutatePath } from "../src/production.js";
import { memorySessionNamespace, RuntimeSession } from "../src/session-do.js";
import { newIssuerKey } from "../src/issuer-append.js";
import { newSessionId, verifyChainStrict } from "../src/session-core.js";

let n = 0;
const SID = "sess_" + "a".repeat(32);

// 1) The token gate now covers pause and resume (POST only); reads stay public.
for (const a of ["policy", "exec", "close", "pause", "resume"]) assert.equal(isSessionMutatePath(`/v1/session/${SID}/${a}`, "POST"), true, a);
assert.equal(isSessionMutatePath(`/v1/session/${SID}/pause`, "GET"), false);
assert.equal(isSessionMutatePath(`/v1/session/${SID}/receipts`, "GET"), false);
assert.equal(isSessionMutatePath(`/v1/session/${SID}/pausex`, "POST"), false);
assert.equal(isSessionMutatePath(`/v1/session/${SID}/pause/`, "POST"), false); n++;

const handler = (await import("../src/index.js")).default.fetch;
const TOKEN = "rt_" + "b".repeat(40);
const OTHER = await newIssuerKey();

async function harness(env) {
  const req = (m, p, body, { token, issuer } = {}) =>
    handler(new Request("https://rt.example" + p, {
      method: m,
      headers: { "content-type": "application/json", ...(token ? { authorization: "Bearer " + token } : {}), ...(issuer ? { "x-azrt-issuer-key": issuer } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {}),
    }), env);
  const receipts = async (id) => (await (await req("GET", `/v1/session/${id}/receipts`)).json()).receipts;
  return { req, receipts };
}

// 2) REQUIRE_TOKEN=1 (production): no token 401, wrong issuer 403, honest path 200.
{
  const env = { SESSION: memorySessionNamespace({}), REQUIRE_TOKEN: "1", RUNTIME_TOKEN: TOKEN };
  const { req, receipts } = await harness(env);
  const open = await (await req("POST", "/v1/session/open", {}, { token: TOKEN })).json();
  const id = open.session.id; const ik = open.issuer_key;
  assert.match(ik, /^isk_[a-f0-9]{64}$/);
  const len0 = (await receipts(id)).length;

  for (const action of ["pause", "resume"]) {
    // No token (even with the right issuer key): 401 before the session object is touched.
    let r = await req("POST", `/v1/session/${id}/${action}`, {}, { issuer: ik });
    assert.equal(r.status, 401, action); assert.equal((await r.json()).code, "token_required");
    r = await req("POST", `/v1/session/${id}/${action}`, {}, { token: "wrong-token", issuer: ik });
    assert.equal(r.status, 401); assert.equal((await r.json()).code, "token_mismatch");
    // Token in the query string is refused, never accepted.
    r = await req("POST", `/v1/session/${id}/${action}?token=${TOKEN}`, {}, { issuer: ik });
    assert.equal(r.status, 400);
    // Token but no / wrong / hash-as-key issuer: 403 CL-NOT-ISSUER.
    for (const [issuer, reason] of [[null, "missing_key"], [OTHER.key, "wrong_key"], [open.receipt.issuer.key_hash, "wrong_key"]]) {
      r = await req("POST", `/v1/session/${id}/${action}`, {}, { token: TOKEN, issuer });
      const b = await r.json();
      assert.equal(r.status, 403, `${action} ${reason}`); assert.equal(b.code, "CL-NOT-ISSUER"); assert.equal(b.reason, reason); assert.equal(b.stamp, action); assert.equal(b.written, false);
    }
    // An issuer key in the body is ignored: the header is the only channel.
    r = await req("POST", `/v1/session/${id}/${action}`, { issuer_key: ik }, { token: TOKEN });
    assert.equal(r.status, 403);
    assert.equal((await receipts(id)).length, len0, `${action} refusals leave the chain unchanged`);
  }
  n++;

  // Honest path: token + issuer pauses, exec refuses while paused, token + issuer resumes, exec runs.
  let r = await req("POST", `/v1/session/${id}/pause`, {}, { token: TOKEN, issuer: ik });
  assert.equal(r.status, 200); assert.equal((await r.json()).receipt.event, "freeze");
  const paused = await receipts(id);
  // While paused, a wrong-issuer resume adds no row (the paused row count must stay exact).
  r = await req("POST", `/v1/session/${id}/resume`, {}, { token: TOKEN, issuer: OTHER.key });
  assert.equal(r.status, 403); assert.equal((await receipts(id)).length, paused.length);
  r = await req("POST", `/v1/session/${id}/resume`, {}, { token: TOKEN, issuer: ik });
  const rb = await r.json();
  assert.equal(r.status, 200, JSON.stringify(rb)); assert.equal(rb.receipt.event, "resume");
  assert.equal((await verifyChainStrict(await receipts(id))).ok, true); n++;
}

// 3) Public mode (no REQUIRE_TOKEN): the issuer check still applies on its own.
{
  const env = { SESSION: memorySessionNamespace({}) };
  const { req, receipts } = await harness(env);
  const open = await (await req("POST", "/v1/session/open", {})).json();
  const id = open.session.id;
  for (const action of ["pause", "resume"]) {
    const r = await req("POST", `/v1/session/${id}/${action}`, {});
    assert.equal(r.status, 403); assert.equal((await r.json()).code, "CL-NOT-ISSUER");
  }
  assert.equal((await receipts(id)).length, 1);
  assert.equal((await req("POST", `/v1/session/${id}/pause`, {}, { issuer: open.issuer_key })).status, 200); n++;
}

// 4) Legacy session with no issuer at genesis: no one may pause or resume (fail closed), even with a key.
{
  const m = new Map();
  const st = { get: async (k) => structuredClone(m.get(k)), put: async (k, v) => { m.set(k, structuredClone(v)); }, setAlarm: async () => {}, deleteAlarm: async () => {} };
  const o = new RuntimeSession({ storage: st }, {});
  const call = async (a, body) => { const res = await o.fetch(new Request("https://do/" + a, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body || {}) })); return { status: res.status, data: await res.json() }; };
  assert.equal((await call("open", { id: newSessionId() })).status, 200);
  for (const a of ["pause", "resume"]) {
    const r = await call(a, { issuer_key: OTHER.key });
    assert.equal(r.status, 403); assert.equal(r.data.code, "CL-NOT-ISSUER"); assert.equal(r.data.reason, "no_issuer");
  }
  assert.equal(m.get("session").receipts.length, 1); assert.equal(m.get("session").paused, undefined); n++;
}

console.log(`ok pause/resume token gate + issuer-only: ${n} checks`);
