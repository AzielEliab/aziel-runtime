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
// Own store: the writer's rollup share (9/min of wall-clock time) already spent 2 rows above.
const s6 = storeFor(withDurableKv({ ...base, CHAINLOCK: memoryChainWriterNamespace({}) }));
(await import("../src/receipt-guard.js"))._resetMcpSealCap();
f = await AR.flushAuthRollups(env, s6, { now: T + 3 * 60000 });
const capped = await loadChain(s6, "refusals");
assert.equal(capped.length, AR.AUTH_ROLLUP_ROWS_PER_MIN + 1);
const ov = capped.find((r) => r.refusal.code === "AUTH-ROLLUP-OVERFLOW");
assert.equal(ov.refusal.combos, 4); assert.equal(ov.refusal.count, 1 + 2 + 3 + 4);
assert.equal(Math.max(...capped.filter((r) => r !== ov).map((r) => r.refusal.count)), 12); n++;

// 7) fail closed: the seal fails -> minute kept for the next tick; next tick seals once, no duplicate.
const T2 = T + 10 * 60000;
for (let i = 0; i < 4; i++) await AR.countAuthRefusal(env, { door: "session-revoke", code: "CL-NOT-ISSUER", now: T2 });
const broken = new Proxy({}, { get: (_t, p) => (p === "then" ? undefined : async () => { throw new Error("store down"); }) });
const s7 = storeFor(withDurableKv({ ...base, CHAINLOCK: memoryChainWriterNamespace({}) }));
f = await AR.flushAuthRollups(env, broken, { now: T2 + 3 * 60000 });
assert.equal(f.minutes[0].status, "retry_next_tick"); assert.equal((await loadChain(s7, "refusals")).length, 0);
f = await AR.flushAuthRollups(env, s7, { now: T2 + 4 * 60000 });
assert.equal(f.minutes[0].status, "sealed");
f = await AR.flushAuthRollups(env, s7, { now: T2 + 5 * 60000 });
const after7 = await loadChain(s7, "refusals");
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

// 11) B307-1: the rollup has its own 9/min share in the writer cap, outside REST 240. A minute whose REST
//     share is spent (and memoed full in this isolate) still flushes the rollup rows.
{
  const { REFUSAL_CAP } = await import("../src/chainlock/writer-do.js");
  const { append } = await import("../src/chainlock/ops.js");
  const rg = await import("../src/receipt-guard.js");
  rg._resetMcpSealCap();
  assert.equal(REFUSAL_CAP.classes.rollup, AR.AUTH_ROLLUP_ROWS_PER_MIN + 1, "share = row cap + overflow row");
  const e2 = withDurableKv({ ...base, CHAINLOCK: memoryChainWriterNamespace({}), RUNTIME_KV: memoryRuntimeKvNamespace(), USES: legacyKv() });
  const s2 = storeFor(e2);
  for (let i = 0; i < REFUSAL_CAP.classes.rest; i++) {
    const o = await append(s2, { c: "refusals", k: "refusal", s: "R" + i, f: "refusal R" + i, refusal: { code: "R" + i, surface: "runtime", kind: "refusal", tool: "http" }, idempotency_key: "rest:" + i }, { internal: true });
    assert.equal(o.ok, true);
  }
  const over = await rg.sealRefusal(s2, { code: "REST-OVER", tool: "http", slug: "mesh", op: "GET", args: { door: "mesh" }, trustedNames: true, extra: { kind: "refusal", surface: "runtime", door: "mesh", reason: null } });
  assert.equal(over.status, "rate_limited", "REST share is full"); assert.equal(over.cap_class, "rest");
  const T4 = Date.now();
  for (const [door, code] of [["mcp", "token_required"], ["session-open", "token_mismatch"]]) await AR.countAuthRefusal(e2, { door, code, now: T4 });
  const before = (await loadChain(s2, "refusals")).length;
  const f4 = await AR.flushAuthRollups(e2, s2, { now: T4 + 3 * 60000 });
  assert.equal(f4.minutes.length, 1); assert.equal(f4.minutes[0].status, "sealed", "a full REST share does not stall the flush");
  const got = (await loadChain(s2, "refusals")).slice(before);
  assert.equal(got.length, 2); for (const r of got) assert.equal(r.refusal.kind, "auth_rollup");
  rg._resetMcpSealCap();
  // Backlog: two closed minutes of 9 rows each in one tick. The 9/min share seals the older minute; the
  // newer one is retry_next_tick (nothing lost, nothing duplicated) and seals in the next wall-clock minute.
  const e3 = withDurableKv({ ...base, CHAINLOCK: memoryChainWriterNamespace({}), RUNTIME_KV: memoryRuntimeKvNamespace(), USES: legacyKv() });
  const s3 = storeFor(e3);
  const TB = Date.UTC(2026, 9, 19, 13, 0, 5);
  for (const m of [0, 1]) for (const d of ["mcp", "fraggate", "mesh"]) for (const c of ["token_required", "token_mismatch", "TOKEN-QUERY-REFUSED"]) await AR.countAuthRefusal(e3, { door: d, code: c, now: TB + m * 60000 });
  const realNow = Date.now;
  try {
    Date.now = () => TB + 5 * 60000;
    const b1 = await AR.flushAuthRollups(e3, s3, { now: TB + 5 * 60000 });
    assert.equal(b1.minutes[0].status, "sealed"); assert.equal(b1.minutes[1].status, "retry_next_tick");
    assert.match(b1.minutes[1].reason, /rollup share 9\/min/);
    assert.equal((await loadChain(s3, "refusals")).length, 9);
    Date.now = () => TB + 6 * 60000;
    const b2 = await AR.flushAuthRollups(e3, s3, { now: TB + 6 * 60000 });
    assert.equal(b2.minutes.length, 1); assert.equal(b2.minutes[0].status, "sealed");
    assert.equal((await loadChain(s3, "refusals")).length, 18, "both minutes, no duplicate");
  } finally { Date.now = realNow; rg._resetMcpSealCap(); }
}
n++;

// 12) OpenAPI documents the header in components.headers (additive).
{
  const r = await call("/openapi.json");
  assert.equal(r.status, 200);
  const doc = await r.json();
  const h = doc.components.headers["X-Azrt-Auth-Rollup"];
  assert.ok(h && h.schema && h.schema.type === "string");
  assert.ok(new RegExp(h.schema.pattern).test("counted; spec=AZRT-AUTH-ROLLUP-1.0; minute=1; door=session-open; code=token_required"));
  assert.ok(doc.components.headers["X-Azrt-Refusal-Receipt"], "existing header doc kept");
}
n++;

// 13) 64 KB limit while streaming: a body with no content-length is read at most 64 KB (code from status
//     only past that), the client still gets the whole body, and a small streamed body is parsed.
{
  const streamOf = (text, chunk = 4096) => {
    const bytes = new TextEncoder().encode(text); let off = 0;
    return new ReadableStream({ pull(c) { if (off >= bytes.length) { c.close(); return; } c.enqueue(bytes.slice(off, off + chunk)); off += chunk; } });
  };
  const big = JSON.stringify({ code: "token_mismatch", pad: "x".repeat(70000) });
  const rBig = new Response(streamOf(big), { status: 401, headers: { "content-type": "application/json" } });
  assert.equal(rBig.headers.get("content-length"), null);
  const wBig = await AR.withAuthRollup(new Request("https://aziel-runtime.example/v1/session/open", { method: "POST" }), rBig, { env, now: T + 40 * 60000 });
  assert.match(wBig.headers.get("x-azrt-auth-rollup"), /code=HTTP-401-AUTH$/, "body past 64 KB is not parsed");
  assert.equal((await wBig.text()).length, big.length, "client body intact");
  assert.equal(await AR.readCappedText(new Response(streamOf(big)), 65536), null);
  const small = JSON.stringify({ code: "token_mismatch" });
  const wSmall = await AR.withAuthRollup(new Request("https://aziel-runtime.example/v1/session/open", { method: "POST" }), new Response(streamOf(small, 3), { status: 401, headers: { "content-type": "application/json" } }), { env, now: T + 40 * 60000 });
  assert.match(wSmall.headers.get("x-azrt-auth-rollup"), /code=token_mismatch$/);
  assert.equal(await wSmall.text(), small);
}
n++;

console.log(`ok auth rollup: ${n} checks`);
