/** scripts/trigger-witness.mjs: dispatch shape, fail-closed paths, and wait never counts pending as witnessed. */
import assert from "node:assert/strict";
import { dispatchRequest, dispatchWitness, waitWitnessed } from "./trigger-witness.mjs";

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
console.log(`ok trigger-witness (dispatch on deploy): ${n} checks`);
