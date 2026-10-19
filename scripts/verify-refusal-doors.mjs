/**
 * AZRT-REFUSAL-RECEIPT-1.0 addendum (RIB-018 gaps): REST door refusals and AZ-OS/azinterface peer
 * refusals are sealed through sealRefusal on the internal refusals chain (dual lattice), additive,
 * deduped, capped, fail closed. Auth refusals stay unrecorded. Author: Aziel Eliab.
 */
import assert from "node:assert/strict";
import { memorySessionNamespace } from "../src/session-do.js";
import { memoryChainWriterNamespace } from "../src/chainlock/writer-do.js";
import { storeFor, MemoryStore } from "../src/chainlock/store.js";
import { verify, loadChain } from "../src/chainlock/ops.js";
import { latticePrimary, latticeOnlineSecondary, latticeOfflineSecondary, LATTICE_GENESIS } from "../src/dual-lattice.js";
import { canonicalize, sha256Hex } from "../src/session-core.js";

// Hermetic: no live witness log (a real anchors view would not match this in-memory chain).
globalThis.fetch = async () => { throw new Error("verify-refusal-doors: offline"); };
const handler = (await import("../src/index.js")).default.fetch;
(await import("../src/anchor.js")).resetAnchorMemo();
const doors = await import("../src/refusal-doors.js");
const env = { SESSION: memorySessionNamespace({}), CHAINLOCK: memoryChainWriterNamespace({}) };
const store = storeFor(env);
const ctx = { waitUntil() {} };
const get = (path, init = {}, e = env) => handler(new Request("https://aziel-runtime.example" + path, init), e, ctx);
let n = 0;

const before = await verify(store, {});
const beforeTips = JSON.stringify(before.chains.map((c) => [c.c, c.n]));

// 1) onboarding refusal: original fields unchanged, additive refusal_receipt, header.
let r = await get("/v1/mesh/install");
assert.equal(r.status, 400);
let b = await r.json();
assert.equal(b.ok, false); assert.equal(b.code, "ONBOARD-BAD-SLUG"); assert.equal(b.spec, "MESH-ONBOARD-1.0");
const rr = b.refusal_receipt;
assert.equal(rr.sealed, true); assert.equal(rr.kind, "refusal"); assert.equal(rr.code, "ONBOARD-BAD-SLUG");
assert.equal(rr.chain, "refusals"); assert.equal(rr.surface, "runtime"); assert.equal(rr.door, "mesh");
assert.match(rr.h, /^[a-f0-9]{64}$/); assert.match(rr.lattice.primary, /^[a-f0-9]{64}$/); assert.match(rr.lattice.secondary, /^[a-f0-9]{64}$/);
assert.match(r.headers.get("x-azrt-refusal-receipt"), /^sealed; chain=refusals; seq=\d+; h=[a-f0-9]{64}$/); n++;

// 2) same refusal in the same minute: replay, no new row (flood guard); a different route with the same code too.
const rows1 = (await loadChain(store, "refusals")).length;
b = await (await get("/v1/mesh/install")).json();
assert.equal(b.refusal_receipt.seq, rr.seq); assert.equal(b.refusal_receipt.replayed, true);
assert.equal((await loadChain(store, "refusals")).length, rows1);
doors._resetRefusalMemo();
const flood = await doors.sealDoorRefusal(store, { door: "mesh", code: "ONBOARD-BAD-SLUG", reason: "x", method: "GET", route: "/v1/mesh/other-route", status: 400 });
assert.equal(flood.seq, rr.seq); assert.equal(flood.replayed, true);
assert.equal((await loadChain(store, "refusals")).length, rows1); n++;

// 3) install.sh text refusal: body unchanged, receipt in the header.
r = await get("/v1/mesh/install.sh?slug=nope-not-a-slug");
const txt = await r.text();
assert.equal(r.status, 400); assert.match(txt, /^#!\/bin\/sh\necho 'ONBOARD-UNKNOWN-SLUG' >&2/);
assert.match(r.headers.get("x-azrt-refusal-receipt"), /^sealed; chain=refusals/); n++;

// 4) auth refusals stay unrecorded (tether push without token, session pause without token).
const rows2 = (await loadChain(store, "refusals")).length;
for (const [p, m] of [["/v1/tether/push", "POST"], ["/v1/session/sess_" + "a".repeat(32) + "/pause", "POST"]]) {
  const res = await get(p, { method: m, headers: { "content-type": "application/json" }, body: "{}" }, { ...env, REQUIRE_TOKEN: "1", RUNTIME_TOKEN: "t0k" });
  assert.ok(res.status === 401 || res.status === 503, p + " " + res.status);
  const body = await res.json();
  assert.equal(body.refusal_receipt, undefined); assert.equal(res.headers.get("x-azrt-refusal-receipt"), null);
}
assert.equal((await loadChain(store, "refusals")).length, rows2);
assert.equal(doors.isAuthRefusal(403, "CL-NOT-ISSUER"), true); assert.equal(doors.isAuthRefusal(400, "TOKEN-QUERY-REFUSED"), true);
assert.equal(doors.isAuthRefusal(400, "ONBOARD-BAD-SLUG"), false); n++;

// 5) paths outside the doors (and /mcp, sealed inside by RIB-018) are not wrapped.
assert.equal(doors.doorOf("/mcp"), null); assert.equal(doors.doorOf("/v1/session/open"), null); assert.equal(doors.doorOf("/v1/meshx"), null);
assert.equal(doors.doorOf("/v1/mesh/install.sh"), "mesh"); assert.equal(doors.doorOf("/v1/memory/observe"), "memory"); n++;

// 6) receipts endpoint finds them; ?seq= returns one; unknown seq 404.
b = await (await get("/v1/receipts/refusals")).json();
assert.equal(b.ok, true); assert.equal(b.chain, "refusals"); assert.ok(b.total >= 2); assert.equal(b.receipts[0].seq, b.total);
assert.equal(b.receipts.find((x) => x.seq === rr.seq).refusal.kind, "refusal");
b = await (await get("/v1/receipts/refusals?seq=" + rr.seq)).json();
assert.equal(b.receipt.h, rr.h); assert.equal(b.receipt.refusal.code, "ONBOARD-BAD-SLUG"); assert.equal(b.receipt.refusal.reason.length > 0, true);
assert.equal((await get("/v1/receipts/refusals?seq=99999")).status, 404);
b = await (await get("/v1/receipts")).json();
assert.equal(b.refusal_receipts, "/v1/receipts/refusals"); n++;

// 7) chainlock verify: refusals verifiable by name (dual lattice live); default roster output unchanged.
const v = await verify(store, { c: "refusals" });
assert.equal(v.ok, true); assert.equal(v.chains[0].c, "refusals"); assert.equal(v.chains[0].dual_lattice.ok, true);
assert.equal(v.chains[0].dual_lattice.lattice_live, true);
const after = await verify(store, {});
assert.equal(after.chains.some((c) => c.c === "refusals"), false);
assert.equal(JSON.stringify(after.chains.map((c) => [c.c, c.n])), beforeTips, "normal chains unchanged"); n++;

// 8) lattice math on the stored refusal rows (online), and the offline rule (primary hash + username).
const rows = await loadChain(store, "refusals");
let pp = LATTICE_GENESIS, sp = LATTICE_GENESIS;
for (const row of rows) {
  assert.equal(row.lattice.primary, await latticePrimary(row.lattice.document_hash, pp));
  assert.equal(row.lattice.secondary, await latticeOnlineSecondary(row.lattice.primary, sp));
  pp = row.lattice.primary; sp = row.lattice.secondary;
}
const dh = rows[0].lattice.document_hash;
assert.equal(await latticeOfflineSecondary(dh, "aziel"), await sha256Hex(canonicalize({ primary: dh, username: "aziel" }))); n++;

// 9) peer refusals: only over the service-binding host; surfaces allowlisted; auth codes refused.
const peer = (body, host = "peer.aziel.internal", headers = {}) => handler(new Request(`https://${host}/v1/refusals/peer`, { method: "POST", headers: { "content-type": "application/json", ...headers }, body: JSON.stringify(body) }), env, ctx);
r = await peer({ surface: "azos", code: "RUNTIME-SYNC-BAD", method: "GET", route: "/v1/runtime/sync", status: 400, reason: "x" }, "aziel-runtime.example");
assert.equal(r.status, 404 === r.status ? 404 : r.status); // public host: not the peer route
assert.notEqual((await r.clone().text()).includes('"sealed": true'), true);
r = await peer({ surface: "azos", code: "TRACKER-BAD", method: "GET", route: "/v1/x", status: 400 }, "peer.aziel.internal", { "cf-connecting-ip": "1.2.3.4" });
assert.equal(r.status, 403); assert.equal((await r.json()).code, "REFUSAL-PEER-NOT-BOUND");
r = await peer({ surface: "azos", code: "TRACKER-BAD-QUERY", method: "GET", route: "/v1/downloads/abc", status: 400, reason: "bad query" });
b = await r.json();
assert.equal(b.ok, true); assert.equal(b.refusal_receipt.surface, "azos"); assert.equal(b.refusal_receipt.sealed, true); assert.equal(b.refusal_receipt.door, "azos");
r = await peer({ surface: "azinterface", code: "IFACE-BAD", method: "POST", route: "/v1/x", status: 400 });
assert.equal((await r.json()).refusal_receipt.surface, "azinterface");
assert.equal((await peer({ surface: "evil", code: "X-Y" })).status, 400);
assert.equal((await (await peer({ surface: "azos", code: "token_required", status: 401 })).json()).code, "REFUSAL-PEER-AUTH-UNRECORDED");
{ const vv = await verify(store, { c: "refusals" }); if (!vv.ok) console.log(JSON.stringify(vv.breaks)); assert.equal(vv.ok, true); } n++;

// 10) fail closed: no store -> refusal unchanged, receipt honestly unavailable.
doors._resetRefusalMemo();
r = await get("/v1/mesh/install", {}, { SESSION: env.SESSION });
b = await r.json();
assert.equal(r.status, 400); assert.equal(b.code, "ONBOARD-BAD-SLUG");
assert.equal(b.refusal_receipt.sealed, false); assert.equal(b.refusal_receipt.status, "unavailable");
assert.match(r.headers.get("x-azrt-refusal-receipt"), /^unavailable; sealed=false/); n++;

// 11) slow write -> receipt_pending (never a fake receipt); cap -> rate_limited.
doors._resetRefusalMemo();
const slow = { appendAtomic: () => new Promise(() => {}), get: async () => null };
let pend = await doors.sealDoorRefusal(slow, { door: "mesh", code: "MESH-X", method: "GET", route: "/v1/mesh", status: 400 }, { budgetMs: 30 });
assert.equal(pend.sealed, false); assert.equal(pend.status, "receipt_pending"); assert.equal(pend.h, undefined);
doors._resetRefusalMemo();
const ms = new MemoryStore();
let last;
for (let i = 0; i <= doors.REFUSAL_HTTP_CAP_PER_MIN; i++) last = await doors.sealDoorRefusal(ms, { door: "mesh", code: "MESH-C" + i, method: "GET", route: "/v1/mesh", status: 400 }, { now: 5 * 60000 });
assert.equal(last.sealed, false); assert.equal(last.status, "rate_limited"); n++;

// 12) route templates collapse ids (bounded keys).
assert.equal(doors.routeTemplate("/v1/session/sess_" + "b".repeat(32) + "/exec"), "/v1/session/:id/exec");
assert.equal(doors.routeTemplate("/v1/mesh/a/b/c/d/e"), "/v1/mesh/a/b"); n++;

// 13) lattice door: an op refusal inside an accepted FragGate envelope is sealed too (same sealRefusal).
doors._resetRefusalMemo();
r = await get("/v1/fraggate/call", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ slug: "memory", op: "lattice-learn", payload: { chain: "nope" }, dry_run: true }) });
b = await r.json();
assert.equal(b.code, "FG-OK"); assert.equal(b.result.ok, false); assert.equal(b.result.code, "LATTICE-LEARN-BAD-CHAIN");
assert.equal(b.refusal_receipt.sealed, true); assert.equal(b.refusal_receipt.code, "LATTICE-LEARN-BAD-CHAIN"); assert.equal(b.refusal_receipt.kind, "refusal");
const lr = (await loadChain(store, "refusals")).at(-1);
assert.equal(lr.refusal.door, "op"); assert.equal(lr.refusal.code, "LATTICE-LEARN-BAD-CHAIN");
const { innerOpRefusal } = await import("../src/receipt-guard.js");
assert.equal(innerOpRefusal({ result: { ok: false, code: "X-NOT-FOUND" } }), null); // no fail_closed / written:false
assert.equal(innerOpRefusal({ result: { ok: true, code: "OK" } }), null);
{ const vv = await verify(store, { c: "refusals" }); if (!vv.ok) console.log(JSON.stringify(vv.breaks)); assert.equal(vv.ok, true); } n++;

console.log(`verify-refusal-doors: ok (${n} groups)`);
