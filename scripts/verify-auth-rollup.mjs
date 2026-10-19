/**
 * AZRT-AUTH-ROLLUP-1.0: login/token refusals are counted, never sealed one by one, and the cron seals ONE
 * count-only row per minute per door + code on the internal refusals chain (dual lattice, fixed reasons,
 * no identity/token/text), with its own row cap, failing closed. Author: Aziel Eliab.
 */
import assert from "node:assert/strict";
import { memorySessionNamespace } from "../src/session-do.js";
import { memoryChainWriterNamespace } from "../src/chainlock/writer-do.js";
import { storeFor } from "../src/chainlock/store.js";
import { verify, loadChain } from "../src/chainlock/ops.js";
import { memoryRuntimeKvNamespace, withDurableKv } from "../src/durable-kv.js";
import { sha256Hex } from "../src/session-core.js";

globalThis.fetch = async () => { throw new Error("verify-auth-rollup: offline"); };
const handler = (await import("../src/index.js")).default.fetch;
const AR = await import("../src/auth-rollup.js");
const legacyKv = () => { const m = new Map(); return { get: async (k) => m.get(k) ?? null, put: async (k, v) => { m.set(k, String(v)); }, delete: async (k) => { m.delete(k); }, list: async () => ({ keys: [], list_complete: true }) }; };
const TOKEN = "t0k-" + "z".repeat(24);
const WRONG = "wrong-" + "q".repeat(22);
const IP = "203.0.113.77";
const base = { SESSION: memorySessionNamespace({}), CHAINLOCK: memoryChainWriterNamespace({}), RUNTIME_KV: memoryRuntimeKvNamespace(), USES: legacyKv(), REQUIRE_TOKEN: "1", RUNTIME_TOKEN: TOKEN };
const env = withDurableKv(base);
const store = storeFor(env);
const pending = [];
const ctx = { waitUntil(p) { pending.push(p); } };
const call = (path, init = {}, e = base) => handler(new Request("https://aziel-runtime.example" + path, { ...init, headers: { "cf-connecting-ip": IP, "content-type": "application/json", ...(init.headers || {}) } }), e, ctx);
const rowsOf = async () => loadChain(store, "refusals");
let n = 0;

// 1) fixed door and code lists.
assert.equal(AR.rollupDoor("/mcp"), "mcp");
assert.equal(AR.rollupDoor("/v1/session/open"), "session-open");
assert.equal(AR.rollupDoor("/v1/session/sess_" + "a".repeat(32) + "/stale"), "session-stale");
assert.equal(AR.rollupDoor("/v1/session/sess_" + "a".repeat(32) + "/revoke"), "session-revoke");
assert.equal(AR.rollupDoor("/v1/session/x/evil<script>"), "session");
assert.equal(AR.rollupDoor("/anything/caller-typed"), "other");
assert.equal(AR.rollupCode(401, "token_required"), "token_required");
assert.equal(AR.rollupCode(403, "CL-NOT-ISSUER"), "CL-NOT-ISSUER");
assert.equal(AR.rollupCode(409, "SESSION-PAUSED"), "SESSION-PAUSED");
assert.equal(AR.rollupCode(400, "MY-TOKEN-WAS-hunter2"), "TOKEN-OTHER");
assert.equal(AR.rollupCode(401, "caller text here"), "HTTP-401-AUTH");
assert.equal(AR.rollupCode(400, "ONBOARD-BAD-SLUG"), null);
for (const c of Object.keys(AR.AUTH_ROLLUP_REASONS)) assert.ok(/^[A-Za-z][A-Za-z0-9_-]+$/.test(c)); n++;

// 2) request path: 3 x token_required + 2 x token_mismatch on session open. Body unchanged, header counted, NO row yet.
const rows0 = (await rowsOf()).length;
for (let i = 0; i < 3; i++) {
  const r = await call("/v1/session/open", { method: "POST", body: "{}" });
  assert.equal(r.status, 401);
  const b = await r.json();
  assert.equal(b.code, "token_required"); assert.equal(b.refusal_receipt, undefined);
  assert.equal(r.headers.get("x-azrt-refusal-receipt"), null);
  assert.match(r.headers.get("x-azrt-auth-rollup"), /^counted; spec=AZRT-AUTH-ROLLUP-1\.0; minute=\d+; door=session-open; code=token_required$/);
}
for (let i = 0; i < 2; i++) {
  const r = await call("/v1/session/open", { method: "POST", body: "{}", headers: { authorization: "Bearer " + WRONG } });
  assert.equal(r.status, 401); assert.equal((await r.json()).code, "token_mismatch");
  assert.match(r.headers.get("x-azrt-auth-rollup"), /^counted; .*door=session-open; code=token_mismatch$/);
}
await Promise.allSettled(pending.splice(0));
assert.equal((await rowsOf()).length, rows0, "no per-request rows"); n++;

// 3) non-auth refusal: sealed one by one as before, no rollup header.
{
  const r = await call("/v1/mesh/install");
  assert.equal(r.status, 400); assert.match(r.headers.get("x-azrt-refusal-receipt"), /^sealed/);
  assert.equal(r.headers.get("x-azrt-auth-rollup"), null);
}
const rows1 = (await rowsOf()).length; n++;

// 4) flush before the minute closes: nothing. After: one row per door+code with the count.
let f = await AR.flushAuthRollups(env, store, { now: Date.now() });
assert.equal(f.ok, true); assert.equal(f.minutes.length, 0);
f = await AR.flushAuthRollups(env, store, { now: Date.now() + 3 * 60000 });
assert.equal(f.minutes.length, 1); assert.equal(f.minutes[0].status, "sealed");
const rows = (await rowsOf()).slice(rows1);
assert.equal(rows.length, 2);
const byCode = Object.fromEntries(rows.map((r) => [r.refusal.code, r]));
assert.equal(byCode.token_required.refusal.count, 3); assert.equal(byCode.token_mismatch.refusal.count, 2);
for (const r of rows) {
  assert.equal(r.k, "refusal"); assert.equal(r.refusal.kind, "auth_rollup"); assert.equal(r.refusal.rollup_spec, "AZRT-AUTH-ROLLUP-1.0");
  assert.equal(r.refusal.door, "session-open"); assert.equal(r.refusal.reason, null); assert.equal(r.refusal.window_s, 60);
  assert.equal(r.refusal.reason_sha256, await sha256Hex(AR.AUTH_ROLLUP_REASONS[r.refusal.code]));
  assert.match(r.lattice.primary, /^[a-f0-9]{64}$/); assert.match(r.lattice.secondary, /^[a-f0-9]{64}$/);
}
const dump = JSON.stringify(await rowsOf());
for (const bad of [TOKEN, WRONG, IP, "Bearer", "cf-connecting-ip"]) assert.ok(!dump.includes(bad), "row leaks " + bad);
n++;

// 5) re-flush: nothing new (done), counters cleared.
f = await AR.flushAuthRollups(env, store, { now: Date.now() + 4 * 60000 });
assert.equal((await rowsOf()).length, rows1 + 2);
assert.equal(((await env.USES.scan("authroll|c|", "", 100)).entries || []).length, 0); n++;

// 6) row cap: 12 door/code pairs in one minute -> 8 rows + 1 overflow row with the rest summed.
const T = Date.UTC(2026, 9, 19, 12, 0, 30);
const pairs = [];
for (const d of ["mcp", "fraggate", "mesh", "chainlock"]) for (const c of ["token_required", "token_mismatch", "TOKEN-QUERY-REFUSED"]) pairs.push([d, c]);
let k = 0;
for (const [door, code] of pairs) { k++; for (let i = 0; i < k; i++) assert.equal((await AR.countAuthRefusal(env, { door, code, now: T })).status, "counted"); }
const r2 = (await rowsOf()).length;
f = await AR.flushAuthRollups(env, store, { now: T + 3 * 60000 });
const capped = (await rowsOf()).slice(r2);
assert.equal(capped.length, AR.AUTH_ROLLUP_ROWS_PER_MIN + 1);
const ov = capped.find((r) => r.refusal.code === "AUTH-ROLLUP-OVERFLOW");
assert.equal(ov.refusal.combos, 4); assert.equal(ov.refusal.count, 1 + 2 + 3 + 4);
assert.equal(Math.max(...capped.filter((r) => r !== ov).map((r) => r.refusal.count)), 12); n++;

// 7) fail closed: the seal fails -> minute kept for the next tick; next tick seals once, no duplicate.
const T2 = T + 10 * 60000;
for (let i = 0; i < 4; i++) await AR.countAuthRefusal(env, { door: "session-revoke", code: "CL-NOT-ISSUER", now: T2 });
const broken = new Proxy({}, { get: (_t, p) => (p === "then" ? undefined : async () => { throw new Error("store down"); }) });
const r3 = (await rowsOf()).length;
f = await AR.flushAuthRollups(env, broken, { now: T2 + 3 * 60000 });
assert.equal(f.minutes[0].status, "retry_next_tick"); assert.equal((await rowsOf()).length, r3);
f = await AR.flushAuthRollups(env, store, { now: T2 + 4 * 60000 });
assert.equal(f.minutes[0].status, "sealed");
f = await AR.flushAuthRollups(env, store, { now: T2 + 5 * 60000 });
const after7 = (await rowsOf()).slice(r3);
assert.equal(after7.length, 1); assert.equal(after7[0].refusal.count, 4); assert.equal(after7[0].refusal.door, "session-revoke"); n++;

// 8) unbound: no store -> code; no durable counter -> header unavailable, refusal unchanged.
assert.equal((await AR.flushAuthRollups(env, null)).code, "AUTH-ROLLUP-STORE-UNBOUND");
assert.equal((await AR.flushAuthRollups({}, store)).code, "AUTH-ROLLUP-UNBOUND");
{
  const plain = { SESSION: memorySessionNamespace({}), CHAINLOCK: memoryChainWriterNamespace({}), REQUIRE_TOKEN: "1", RUNTIME_TOKEN: TOKEN };
  const r = await call("/v1/session/open", { method: "POST", body: "{}" }, plain);
  assert.equal(r.status, 401); assert.equal((await r.json()).code, "token_required");
  assert.match(r.headers.get("x-azrt-auth-rollup"), /^unavailable; /);
}
n++;

// 9) coalescing + counter cap: 50 concurrent hits count 50; the counter never passes its cap.
AR._resetAuthRollupIsolate();
const T3 = T + 20 * 60000;
await Promise.all(Array.from({ length: 50 }, () => AR.countAuthRefusal(env, { door: "mcp", code: "token_required", now: T3, budgetMs: 5000 })));
assert.equal(await env.USES.get(`authroll|c|${Math.floor(T3 / 60000)}|mcp|token_required`), "50");
const capOut = await env.USES.incr("authroll|test|cap", 10, { cap: 7 });
assert.equal(capOut.value, 7); assert.equal(capOut.capped, true); n++;

// 10) chain verifies (dual lattice live).
const v = await verify(store, { c: "refusals" });
assert.equal(v.ok, true); assert.equal(v.chains[0].dual_lattice.ok, true); n++;

console.log(`ok auth rollup: ${n} checks`);
