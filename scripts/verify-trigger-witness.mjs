/** scripts/trigger-witness.mjs: dispatch shape, fail-closed paths, and wait never counts pending as witnessed. */
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { FETCH_TIMEOUT_MS, dispatchRequest, dispatchWitness, parseTimeoutMin, waitWitnessed } from "./trigger-witness.mjs";

let n = 0;
const r = dispatchRequest({ token: "t" });
assert.equal(r.url, "https://api.github.com/repos/AzielEliab/aziel-anchors/actions/workflows/witness.yml/dispatches");
assert.equal(r.init.method, "POST"); assert.deepEqual(JSON.parse(r.init.body), { ref: "main", inputs: { force: "0" } });
assert.equal(r.init.headers.authorization, "Bearer t"); n++;
assert.throws(() => dispatchRequest({}), (e) => e.code === "WITNESS-DISPATCH-NO-TOKEN"); n++;
let seen = null;
assert.deepEqual(await dispatchWitness({ token: "t", fetchImpl: async (u) => { seen = u; return new Response(null, { status: 204 }); } }), { ok: true, dispatched: "AzielEliab/aziel-anchors/witness.yml" });
assert.match(seen, /witness\.yml\/dispatches$/);
for (const status of [403, 404, 422, 200]) {
  await assert.rejects(dispatchWitness({ token: "t", fetchImpl: async () => new Response("no", { status }) }), (e) => e.code === "WITNESS-DISPATCH-FAILED" && e.status === status);
}
n++;
// wait: pending and failed keep polling; only verified + ok:true returns ok; timeout fails closed.
let t = 0;
const seq = ["pending", "failed", "verified"];
const fake = async () => new Response(JSON.stringify({ build_witness: { status: seq.shift() || "verified", ok: seq.length === 0 ? true : null } }));
const w = await waitWitnessed({ fetchImpl: fake, sleep: async (ms) => { t += ms; }, now: () => t, timeoutMs: 10 * 60_000, intervalMs: 1000 });
assert.equal(w.ok, true); assert.equal(w.build_witness.status, "verified");
const stuck = await waitWitnessed({ fetchImpl: async () => new Response(JSON.stringify({ build_witness: { status: "pending", ok: null } })), sleep: async (ms) => { t += ms; }, now: () => t, timeoutMs: 5000, intervalMs: 1000 });
assert.equal(stuck.ok, false); assert.equal(stuck.code, "WITNESS-WAIT-TIMEOUT"); assert.equal(stuck.build_witness.status, "pending");
const broken = await waitWitnessed({ fetchImpl: async () => { throw new Error("down"); }, sleep: async (ms) => { t += ms; }, now: () => t, timeoutMs: 2000, intervalMs: 1000 });
assert.equal(broken.ok, false); assert.equal(broken.build_witness.status, "unreadable"); n++;
// --timeout-min: only finite 1-120 minutes; NaN / missing value / another flag / out of range -> WITNESS-BAD-TIMEOUT.
{
  assert.equal(parseTimeoutMin([]), 20); assert.equal(parseTimeoutMin(["--timeout-min", "1"]), 1); assert.equal(parseTimeoutMin(["--wait", "--timeout-min", "120"]), 120);
  assert.equal(parseTimeoutMin(["--timeout-min", "2.5"]), 2.5);
  for (const args of [["--timeout-min"], ["--timeout-min", "abc"], ["--timeout-min", "--wait"], ["--timeout-min", "NaN"], ["--timeout-min", "Infinity"], ["--timeout-min", "0"], ["--timeout-min", "-5"], ["--timeout-min", "121"], ["--timeout-min", "1e3"], ["--timeout-min", "0x10"], ["--timeout-min", ""]]) {
    assert.throws(() => parseTimeoutMin(args), (e) => e.code === "WITNESS-BAD-TIMEOUT", JSON.stringify(args));
  }
  // The CLI exits 1 before any dispatch (no token needed to prove it: it fails on the flag first).
  for (const extra of [["--timeout-min", "abc"], ["--timeout-min"]]) {
    const p = spawnSync(process.execPath, [new URL("./trigger-witness.mjs", import.meta.url).pathname, "--wait", ...extra], { env: { ...process.env, GH_TOKEN: "t" }, encoding: "utf8", timeout: 10_000 });
    assert.equal(p.status, 1, JSON.stringify(extra) + p.stderr); assert.match(p.stderr, /WITNESS-BAD-TIMEOUT/);
  }
  // Deadline guard inside waitWitnessed: NaN / Infinity / 0 / >120 min return at once, never poll.
  let polls = 0;
  const pend = async () => { polls++; return new Response(JSON.stringify({ build_witness: { status: "pending", ok: null } })); };
  for (const timeoutMs of [NaN, Infinity, 0, -1, 121 * 60_000]) {
    const r = await waitWitnessed({ timeoutMs, fetchImpl: pend, sleep: async () => {} });
    assert.equal(r.ok, false); assert.equal(r.code, "WITNESS-BAD-TIMEOUT");
  }
  assert.equal(polls, 0); n++;
}
// Every fetch carries an abort signal (default 15 s); a hung fetch aborts instead of blocking forever.
{
  assert.equal(FETCH_TIMEOUT_MS, 15_000);
  const signals = [];
  await dispatchWitness({ token: "t", fetchImpl: async (u, init) => { signals.push(init.signal); return new Response(null, { status: 204 }); } });
  await waitWitnessed({ timeoutMs: 1000, fetchImpl: async (u, init) => { signals.push(init.signal); return new Response(JSON.stringify({ build_witness: { status: "verified", ok: true } })); } });
  assert.equal(signals.length, 2); for (const s of signals) assert.ok(s instanceof AbortSignal);
  // AbortSignal.timeout timers are unref'd; a real fetch keeps the loop alive, this fake does not, so hold it open.
  const keepAlive = setInterval(() => {}, 1000);
  const hung = (u, init) => new Promise((_, reject) => init.signal.addEventListener("abort", () => reject(init.signal.reason)));
  const t0 = Date.now();
  await assert.rejects(dispatchWitness({ token: "t", fetchImpl: hung, fetchTimeoutMs: 50 }), (e) => e.code === "WITNESS-DISPATCH-FAILED" && /no response within 50 ms/.test(e.message));
  // Hung poll: each attempt aborts, the loop reaches its deadline and fails closed (real clock, small numbers).
  const w = await waitWitnessed({ timeoutMs: 200, intervalMs: 20, fetchTimeoutMs: 50, fetchImpl: hung });
  assert.equal(w.ok, false); assert.equal(w.code, "WITNESS-WAIT-TIMEOUT"); assert.equal(w.build_witness.status, "unreadable");
  assert.ok(Date.now() - t0 < 5000, "hung fetches were bounded"); clearInterval(keepAlive); n++;
}
console.log(`ok trigger-witness (dispatch on deploy): ${n} checks`);
