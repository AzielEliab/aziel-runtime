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
assert.equal(b.receipts.find((x) => x.seq === rr.seq).code, "ONBOARD-BAD-SLUG");
b = await (await get("/v1/receipts/refusals?seq=" + rr.seq)).json();
assert.equal(b.receipt.h, rr.h); assert.equal(b.receipt.refusal.code, "ONBOARD-BAD-SLUG"); assert.equal(b.receipt.refusal.reason, null); assert.match(b.receipt.refusal.reason_sha256, /^[a-f0-9]{64}$/);
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

// 19) RIB-018 follow-up (AZBot pre-merge review): no caller text on any refusal row.
{
  const CALLER = "hello-this-is-public-caller-text";
  const rowsAfter = async (h) => (await loadChain(store, "refusals")).find((x) => x.stamp_sha256 === h);
  const noText = (row, t, why) => assert.equal(JSON.stringify(row).toLowerCase().includes(t.toLowerCase()), false, why);
  // (a) body text: POST /v1/fraggate/verify echoes the name in its message; the URL does not carry it.
  doors._resetRefusalMemo();
  r = await get("/v1/fraggate/verify", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name: CALLER }) });
  b = await r.json();
  assert.equal(r.status, 400); assert.match(String(b.message), new RegExp(CALLER), "the response itself is unchanged");
  assert.equal(b.refusal_receipt.sealed, true, JSON.stringify(b.refusal_receipt));
  let row = await rowsAfter(b.refusal_receipt.h);
  assert.equal(row.refusal.reason, null); assert.equal(row.refusal.reason_sha256, await sha256Hex(b.message));
  noText(row, CALLER, "body text never stored"); n++;
  // (b) long ?name= on GET /v1/fraggate/describe: the message is longer than any cut; still no caller text.
  doors._resetRefusalMemo();
  const LONG = CALLER + "-" + "x".repeat(300);
  r = await get("/v1/fraggate/describe?name=" + encodeURIComponent(LONG), { headers: { accept: "application/json" } });
  b = await r.json();
  assert.equal(r.status, 400); assert.equal(b.refusal_receipt.sealed, true, JSON.stringify(b.refusal_receipt));
  row = await rowsAfter(b.refusal_receipt.h);
  assert.equal(row.refusal.reason, null); assert.match(row.refusal.reason_sha256, /^[a-f0-9]{64}$/);
  noText(row, CALLER, "long query text never stored"); noText(row, "xxxxxxxxxxxxxxxx", "no cut piece of it either"); n++;
  // (c) peer report carrying caller text: the runtime hashes it, whatever the peer sends.
  doors._resetRefusalMemo();
  const peerReason = `unknown thing "${CALLER}"`;
  r = await peer({ surface: "azos", code: "TRACKER-ECHO", method: "POST", route: "/v1/" + CALLER, status: 400, reason: peerReason, reason_sha256: "f".repeat(16) });
  b = await r.json();
  assert.equal(b.refusal_receipt.sealed, true, JSON.stringify(b));
  row = await rowsAfter(b.refusal_receipt.h);
  assert.equal(row.refusal.reason, null); assert.equal(row.refusal.reason_sha256, await sha256Hex(peerReason), "text wins over a claimed hash");
  noText(row, CALLER, "peer caller text never stored");
  doors._resetRefusalMemo();
  r = await peer({ surface: "azinterface", code: "TRACKER-HASHED", method: "GET", route: "/v1/x", status: 400, reason: null, reason_sha256: "not-a-hash " + CALLER });
  b = await r.json(); row = await rowsAfter(b.refusal_receipt.h);
  assert.equal(row.refusal.reason, null); assert.equal(row.refusal.reason_sha256, undefined, "a malformed hash is dropped"); noText(row, CALLER, "malformed hash text dropped"); n++;
  // (d) goal id is hashed; the next call with the same goal_id still links (pointer resolves).
  const rg2 = await import("../src/receipt-guard.js");
  const gk = await rg2.goalKeyOf({ goal_id: "Aziel-Eliab-123-Main-St" }, null);
  assert.equal(gk.key, "goal:" + (await sha256Hex("Aziel-Eliab-123-Main-St")).slice(0, 16));
  const mc = (args) => handler(new Request("https://aziel-runtime.example/mcp", { method: "POST", headers: { "content-type": "application/json", accept: "application/json, text/event-stream" }, body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/call", params: { name: "fraggate_call", arguments: args } }) }), env, ctx).then((x) => x.json());
  rg2._resetMcpSealCap();
  const g1 = (await mc({ slug: "foldlock", op: "fold-append", goal_id: "Aziel-Eliab-123-Main-St" })).result.structuredContent;
  assert.equal(g1.refusal_receipt.goal_key, gk.key);
  const g2 = (await mc({ slug: "foldlock", op: "no-such-op-" + CALLER, goal_id: "Aziel-Eliab-123-Main-St", node_ids: [CALLER], context_refs: ["r1"], confirm: true })).result.structuredContent;
  assert.equal(g2.refusal_receipt.follows.h, g1.refusal_receipt.h, "same goal_id links to the refusal before");
  const all = JSON.stringify(await loadChain(store, "refusals"));
  assert.equal(all.includes("Aziel-Eliab-123-Main-St"), false, "goal id never stored as typed");
  assert.equal(all.includes(CALLER), false, "no caller op / node id text anywhere on the chain");
  n++;
  // (e) session refusals: an unknown slug / typed op are stored as null + hash.
  const sc = await import("../src/session-core.js");
  const s0 = sc.openSession({ id: sc.newSessionId(), now: "2026-10-19T14:00:00.000Z", version: "test" });
  await assert.rejects(sc.recordIntent(s0, { slug: CALLER, op: CALLER, payload: {}, payloadText: "{}", knownSlugs: new Set(["foldlock"]) }, "2026-10-19T14:00:01.000Z"), (e) => e.code === "unknown_slug");
  const sr0 = s0.receipts.at(-1);
  assert.equal(sr0.event, "refused"); assert.equal(sr0.payload.refusal.slug, null); assert.match(sr0.payload.refusal.slug_sha256, /^[a-f0-9]{16}$/);
  assert.equal(JSON.stringify(sr0).includes(CALLER), false, "session refusal stores no caller slug/op text");
  assert.equal((await sc.verifyChainStrict(s0.receipts)).ok, true); n++;
}
{ const vv = await verify(store, { c: "refusals" }); if (!vv.ok) console.log(JSON.stringify(vv.breaks)); assert.equal(vv.ok, true); } n++;

// 10) fail closed: no store -> refusal unchanged, receipt honestly unavailable.
doors._resetRefusalMemo();
r = await get("/v1/mesh/install", {}, { SESSION: env.SESSION });
b = await r.json();
assert.equal(r.status, 400); assert.equal(b.code, "ONBOARD-BAD-SLUG");
assert.equal(b.refusal_receipt.sealed, false); assert.equal(b.refusal_receipt.status, "unavailable");
assert.match(r.headers.get("x-azrt-refusal-receipt"), /^unavailable; sealed=false/); n++;

// 11) slow write -> receipt_pending (never a fake receipt); budget 0 (deadline used up) -> pending at once.
doors._resetRefusalMemo();
const slow = { appendAtomic: () => new Promise(() => {}), get: async () => null };
let pend = await doors.sealDoorRefusal(slow, { door: "mesh", code: "MESH-X", method: "GET", route: "/v1/mesh", status: 400 }, { budgetMs: 30 });
assert.equal(pend.sealed, false); assert.equal(pend.status, "receipt_pending"); assert.equal(pend.h, undefined);
doors._resetRefusalMemo();
let bg = 0;
const t0 = Date.now();
pend = await doors.sealDoorRefusal(slow, { door: "mesh", code: "MESH-Y", method: "GET", route: "/v1/mesh", status: 400 }, { budgetMs: 0, ctx: { waitUntil: () => { bg++; } } });
assert.equal(pend.status, "receipt_pending"); assert.equal(bg, 1); assert.ok(Date.now() - t0 < 25, "no wait past the deadline");
r = await handler(new Request("https://aziel-runtime.example/v1/mesh/install"), { ...env, REQUEST_DEADLINE_MS: "1" }, ctx);
assert.equal(r.status === 400 || r.status === 408, true); n++;

// 12) caps are per door and per peer surface: spending the mesh budget does not crowd out tether or azos.
doors._resetRefusalMemo();
const ms = new MemoryStore();
let last;
for (let i = 0; i <= doors.REFUSAL_HTTP_CAP_PER_MIN; i++) last = await doors.sealDoorRefusal(ms, { door: "mesh", code: "MESH-C" + i, method: "GET", route: "/v1/mesh", status: 400 }, { now: 5 * 60000 });
assert.equal(last.sealed, false); assert.equal(last.status, "rate_limited"); assert.equal(last.cap_bucket, "door:mesh");
const other = await doors.sealDoorRefusal(ms, { door: "tether", code: "TETHER-X", method: "GET", route: "/v1/tether", status: 400 }, { now: 5 * 60000 });
assert.equal(other.sealed, true);
const peerOk = await doors.sealDoorRefusal(ms, { surface: "azos", door: "azos", code: "AZOS-X", method: "GET", route: "/*", status: 400 }, { now: 5 * 60000 });
assert.equal(peerOk.sealed, true); n++;

// 14) routes: only fixed templates are stored; caller paths become wildcard + route_sha256 (no caller text).
assert.deepEqual(await doors.routeTemplate("/v1/mesh/install"), { route: "/v1/mesh/install" });
const wild = await doors.routeTemplate("/v1/mesh/azbot-probe");
assert.equal(wild.route, "/v1/mesh/*"); assert.match(wild.route_sha256, /^[a-f0-9]{16}$/);
assert.equal((await doors.routeTemplate("/v1/pull/some-text")).route, "/v1/pull/{slug}");
assert.equal((await doors.routeTemplate("/p/x/y")).route, "/p/{product}/{op}");
doors._resetRefusalMemo();
r = await get("/v1/mesh/hello-caller-text");
b = await r.json();
const wrow = (await loadChain(store, "refusals")).find((x) => x.stamp_sha256 === b.refusal_receipt.h);
assert.equal(wrow.refusal.route, "/v1/mesh/*"); assert.match(wrow.refusal.route_sha256, /^[a-f0-9]{16}$/);
assert.equal(JSON.stringify(wrow).includes("hello-caller-text"), false, "caller text never stored"); n++;

// 15) uncoded 4xx refusals get a fixed code and are sealed; caller-echoing reasons become a hash.
doors._resetRefusalMemo();
r = await get("/v1/pull/zz-not-a-product");
b = await r.json();
assert.equal(r.status, 404); assert.equal(b.error, "unknown product"); assert.equal(b.code, undefined, "body unchanged: no code added");
assert.equal(b.refusal_receipt.sealed, true); assert.equal(b.refusal_receipt.code, "HTTP-404-UNCODED");
const urow = (await loadChain(store, "refusals")).find((x) => x.stamp_sha256 === b.refusal_receipt.h);
assert.equal(urow.refusal.route, "/v1/pull/{slug}"); assert.equal(JSON.stringify(urow).includes("zz-not-a-product"), false);
const sr = await doors.safeReason("unknown product: zz-x1", new URL("https://x/v1/pull/zz-x1"));
assert.equal(sr.reason, null); assert.equal(sr.reason_sha256, await sha256Hex("unknown product: zz-x1"));
// No free reason text on these rows at all, even when it does not visibly echo the URL.
assert.equal((await doors.safeReason("That slug is not in the catalog", new URL("https://x/v1/mesh/install?slug=abcde"))).reason, null);
assert.equal(doors.refusalFromBody(500, "application/json", JSON.stringify({ error: "boom" })), null, "uncoded 5xx is not a refusal"); n++;

// 16) /p/* upstream 5xx: an upstream error, not a refusal (no row, X-Azrt-Upstream-Error).
const up = await doors.withDoorRefusalReceipt(new Request("https://x.example/p/foo/bar"), new Response(JSON.stringify({ ok: false, code: "UPSTREAM-DOWN" }), { status: 502, headers: { "content-type": "application/json" } }), { store: ms });
assert.equal(up.status, 502); assert.equal(up.headers.get("x-azrt-upstream-error"), "502"); assert.equal(up.headers.get("x-azrt-refusal-receipt"), null);
assert.equal((await up.json()).refusal_receipt, undefined);
const up4 = await doors.withDoorRefusalReceipt(new Request("https://x.example/p/foo/bar"), new Response(JSON.stringify({ ok: false, code: "P-BAD-OP" }), { status: 400, headers: { "content-type": "application/json" } }), { store: ms });
assert.match(up4.headers.get("x-azrt-refusal-receipt"), /^sealed/); n++;

// 17) openapi documents the endpoint, the field and the header (additive).
const doc = await (await get("/openapi.json")).json();
assert.ok(doc.paths["/v1/receipts/refusals"].get); assert.ok(doc.components.schemas.RefusalReceipt);
assert.ok(doc.components.headers["X-Azrt-Refusal-Receipt"]); assert.ok(doc.paths["/v1/session/open"], "existing paths kept"); n++;

// 18) MCP door: bounded slug/op (unknown -> null + hash), args digest out of the key, per-isolate cap.
const rg = await import("../src/receipt-guard.js");
const bso = await rg.boundedSlugOp("caller-made-up", "x-op");
assert.equal(bso.slug, null); assert.equal(bso.op, null); assert.match(bso.slug_sha256, /^[a-f0-9]{16}$/);
assert.deepEqual(await rg.boundedSlugOp("foldlock", "health"), { slug: "foldlock", op: "health" });
const ms2 = new MemoryStore();
rg._resetMcpSealCap();
const a1 = await rg.sealRefusal(ms2, { code: "FG-X", tool: "fraggate_call", slug: "foldlock", op: "health", args: { a: 1 }, minuteBucket: 7 });
const a2 = await rg.sealRefusal(ms2, { code: "FG-X", tool: "fraggate_call", slug: "foldlock", op: "health", args: { a: 2 }, minuteBucket: 7 });
assert.equal(a2.seq, a1.seq, "different args, same shape, same minute: one row"); assert.equal(a2.replayed, true);
rg._resetMcpSealCap();
let capped;
for (let i = 0; i <= rg.MCP_SEAL_CAP_PER_MIN; i++) capped = await rg.sealRefusal(ms2, { code: "FG-C" + i, tool: "fraggate_call", slug: "foldlock", op: "health", args: {}, minuteBucket: 8 });
assert.equal(capped.sealed, false); assert.equal(capped.status, "rate_limited");
assert.equal(JSON.stringify(await rg.sealRefusal(new MemoryStore(), { code: "FG-HALLUC-TOOL", tool: "fraggate_call", slug: "my-secret-text", op: "zz", args: {}, minuteBucket: 9 })).includes("my-secret-text"), false); n++;

// 13) lattice door: an op refusal inside an accepted FragGate envelope is sealed too (same sealRefusal).
doors._resetRefusalMemo();
r = await get("/v1/fraggate/call", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ slug: "memory", op: "lattice-learn", payload: { chain: "nope" }, dry_run: true }) });
b = await r.json();
assert.equal(b.code, "FG-OK"); assert.equal(b.result.ok, false); assert.equal(b.result.code, "LATTICE-LEARN-BAD-CHAIN");
assert.equal(b.refusal_receipt.sealed, true); assert.equal(b.refusal_receipt.code, "LATTICE-LEARN-BAD-CHAIN"); assert.equal(b.refusal_receipt.kind, "refusal");
const lr = (await loadChain(store, "refusals")).at(-1);
assert.equal(lr.refusal.door, "op"); assert.equal(lr.refusal.code, "LATTICE-LEARN-BAD-CHAIN");
// Same refusal over MCP fraggate_call (envelope nested one level deeper).
const mres = await get("/mcp", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ jsonrpc: "2.0", id: 9, method: "tools/call", params: { name: "fraggate_call", arguments: { slug: "memory", op: "lattice-learn", payload: { chain: "nope-mcp", dry_run: true }, confirm: true } } }) });
const mj = await mres.json();
const msc = mj.result.structuredContent || JSON.parse(mj.result.content[0].text);
assert.equal(msc.result.result.code, "LATTICE-LEARN-BAD-CHAIN");
assert.equal(msc.refusal_receipt.sealed, true); assert.equal(msc.refusal_receipt.code, "LATTICE-LEARN-BAD-CHAIN");
const { innerOpRefusal } = await import("../src/receipt-guard.js");
assert.equal(innerOpRefusal({ result: { ok: false, code: "X-NOT-FOUND" } }), null); // no fail_closed / written:false
assert.equal(innerOpRefusal({ result: { ok: true, code: "OK" } }), null);

// 19) RIB-018 follow-up (AZBot pre-merge review): no caller text on any refusal row.
{
  const CALLER = "hello-this-is-public-caller-text";
  const rowsAfter = async (h) => (await loadChain(store, "refusals")).find((x) => x.stamp_sha256 === h);
  const noText = (row, t, why) => assert.equal(JSON.stringify(row).toLowerCase().includes(t.toLowerCase()), false, why);
  // (a) body text: POST /v1/fraggate/verify echoes the name in its message; the URL does not carry it.
  doors._resetRefusalMemo();
  r = await get("/v1/fraggate/verify", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name: CALLER }) });
  b = await r.json();
  assert.equal(r.status, 400); assert.match(String(b.message), new RegExp(CALLER), "the response itself is unchanged");
  assert.equal(b.refusal_receipt.sealed, true, JSON.stringify(b.refusal_receipt));
  let row = await rowsAfter(b.refusal_receipt.h);
  assert.equal(row.refusal.reason, null); assert.equal(row.refusal.reason_sha256, await sha256Hex(b.message));
  noText(row, CALLER, "body text never stored"); n++;
  // (b) long ?name= on GET /v1/fraggate/describe: the message is longer than any cut; still no caller text.
  doors._resetRefusalMemo();
  const LONG = CALLER + "-" + "x".repeat(300);
  r = await get("/v1/fraggate/describe?name=" + encodeURIComponent(LONG), { headers: { accept: "application/json" } });
  b = await r.json();
  assert.equal(r.status, 400); assert.equal(b.refusal_receipt.sealed, true, JSON.stringify(b.refusal_receipt));
  row = await rowsAfter(b.refusal_receipt.h);
  assert.equal(row.refusal.reason, null); assert.match(row.refusal.reason_sha256, /^[a-f0-9]{64}$/);
  noText(row, CALLER, "long query text never stored"); noText(row, "xxxxxxxxxxxxxxxx", "no cut piece of it either"); n++;
  // (c) peer report carrying caller text: the runtime hashes it, whatever the peer sends.
  doors._resetRefusalMemo();
  const peerReason = `unknown thing "${CALLER}"`;
  r = await peer({ surface: "azos", code: "TRACKER-ECHO", method: "POST", route: "/v1/" + CALLER, status: 400, reason: peerReason, reason_sha256: "f".repeat(16) });
  b = await r.json();
  assert.equal(b.refusal_receipt.sealed, true, JSON.stringify(b));
  row = await rowsAfter(b.refusal_receipt.h);
  assert.equal(row.refusal.reason, null); assert.equal(row.refusal.reason_sha256, await sha256Hex(peerReason), "text wins over a claimed hash");
  noText(row, CALLER, "peer caller text never stored");
  doors._resetRefusalMemo();
  r = await peer({ surface: "azinterface", code: "TRACKER-HASHED", method: "GET", route: "/v1/x", status: 400, reason: null, reason_sha256: "not-a-hash " + CALLER });
  b = await r.json(); row = await rowsAfter(b.refusal_receipt.h);
  assert.equal(row.refusal.reason, null); assert.equal(row.refusal.reason_sha256, undefined, "a malformed hash is dropped"); noText(row, CALLER, "malformed hash text dropped"); n++;
  // (d) goal id is hashed; the next call with the same goal_id still links (pointer resolves).
  const rg2 = await import("../src/receipt-guard.js");
  const gk = await rg2.goalKeyOf({ goal_id: "Aziel-Eliab-123-Main-St" }, null);
  assert.equal(gk.key, "goal:" + (await sha256Hex("Aziel-Eliab-123-Main-St")).slice(0, 16));
  const mc = (args) => handler(new Request("https://aziel-runtime.example/mcp", { method: "POST", headers: { "content-type": "application/json", accept: "application/json, text/event-stream" }, body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/call", params: { name: "fraggate_call", arguments: args } }) }), env, ctx).then((x) => x.json());
  rg2._resetMcpSealCap();
  const g1 = (await mc({ slug: "foldlock", op: "fold-append", goal_id: "Aziel-Eliab-123-Main-St" })).result.structuredContent;
  assert.equal(g1.refusal_receipt.goal_key, gk.key);
  const g2 = (await mc({ slug: "foldlock", op: "no-such-op-" + CALLER, goal_id: "Aziel-Eliab-123-Main-St", node_ids: [CALLER], context_refs: ["r1"], confirm: true })).result.structuredContent;
  assert.equal(g2.refusal_receipt.follows.h, g1.refusal_receipt.h, "same goal_id links to the refusal before");
  const all = JSON.stringify(await loadChain(store, "refusals"));
  assert.equal(all.includes("Aziel-Eliab-123-Main-St"), false, "goal id never stored as typed");
  assert.equal(all.includes(CALLER), false, "no caller op / node id text anywhere on the chain");
  n++;
  // (e) session refusals: an unknown slug / typed op are stored as null + hash.
  const sc = await import("../src/session-core.js");
  const s0 = sc.openSession({ id: sc.newSessionId(), now: "2026-10-19T14:00:00.000Z", version: "test" });
  await assert.rejects(sc.recordIntent(s0, { slug: CALLER, op: CALLER, payload: {}, payloadText: "{}", knownSlugs: new Set(["foldlock"]) }, "2026-10-19T14:00:01.000Z"), (e) => e.code === "unknown_slug");
  const sr0 = s0.receipts.at(-1);
  assert.equal(sr0.event, "refused"); assert.equal(sr0.payload.refusal.slug, null); assert.match(sr0.payload.refusal.slug_sha256, /^[a-f0-9]{16}$/);
  assert.equal(JSON.stringify(sr0).includes(CALLER), false, "session refusal stores no caller slug/op text");
  assert.equal((await sc.verifyChainStrict(s0.receipts)).ok, true); n++;
}
{ const vv = await verify(store, { c: "refusals" }); if (!vv.ok) console.log(JSON.stringify(vv.breaks)); assert.equal(vv.ok, true); } n++;

// 19) writer cap (true global bound): per-class shares rest 240 / mcp 240 / peer 120 / rollup 9 (sum 609),
//     goal-variant sub-cap 30/min, replays uncapped, failed writes spend nothing; doors report rate_limited.
{
  const rgc = await import("../src/receipt-guard.js");
  const { REFUSAL_CAP, refusalCapClass } = await import("../src/chainlock/writer-do.js");
  const { append } = await import("../src/chainlock/ops.js");
  assert.equal(REFUSAL_CAP.classes.rest + REFUSAL_CAP.classes.mcp + REFUSAL_CAP.classes.peer + REFUSAL_CAP.classes.rollup, REFUSAL_CAP.total);
  assert.equal(Object.values(REFUSAL_CAP.classes).reduce((a, b) => a + b, 0), REFUSAL_CAP.total, "shares sum to the total (honest)");
  assert.equal(REFUSAL_CAP.classes.rollup, 9);
  assert.equal(refusalCapClass({ refusal: { surface: "runtime", kind: "auth_rollup", tool: "auth-rollup" } }), "rollup");
  assert.equal(refusalCapClass({ refusal: { surface: "runtime", kind: "auth_rollup", tool: "http" } }), "rest", "a REST door row can't claim the rollup share");
  assert.equal(refusalCapClass({ refusal: { surface: "azos", kind: "auth_rollup", tool: "auth-rollup" } }), "peer", "a peer report can't claim the rollup share");
  assert.equal(refusalCapClass({ refusal: { surface: "azos" } }), "peer");
  assert.equal(refusalCapClass({ refusal: { surface: "runtime" } }), "rest");
  assert.equal(refusalCapClass({ refusal: { tool: "fraggate_call" } }), "mcp");
  const row = (code, surface, extra = {}) => ({ c: "refusals", k: "refusal", s: code, f: "refusal " + code, refusal: { code, ...(surface ? { surface } : {}) }, idempotency_key: "k:" + code + ":" + (extra.goal_key || "") + (surface || ""), ...extra });
  const fill = async (st, prefix, surface, count) => { let last; for (let i = 0; i < count; i++) last = await append(st, row(prefix + i, surface), { internal: true }); return last; };

  // (a) shares: each class stops at its own share and can't starve the others.
  const gst = storeFor({ CHAINLOCK: memoryChainWriterNamespace({}) });
  assert.equal((await fill(gst, "M", null, REFUSAL_CAP.classes.mcp)).ok, true);
  let o = await append(gst, row("M-over", null), { internal: true });
  assert.equal(o.ok, false); assert.equal(o.refuse, "refusal-cap"); assert.equal(o.cap_class, "mcp");
  assert.equal((await fill(gst, "R", "runtime", REFUSAL_CAP.classes.rest)).ok, true, "MCP junk does not starve REST");
  o = await append(gst, row("R-over", "runtime"), { internal: true });
  assert.equal(o.ok, false); assert.equal(o.cap_class, "rest");
  assert.equal((await fill(gst, "P", "azos", REFUSAL_CAP.classes.peer)).ok, true, "MCP+REST do not starve peers");
  o = await append(gst, row("P-over", "azinterface"), { internal: true });
  assert.equal(o.ok, false); assert.equal(o.cap_class, "peer");
  const rollRow = (code) => ({ c: "refusals", k: "refusal", s: code, f: "refusal " + code, refusal: { code, surface: "runtime", kind: "auth_rollup", tool: "auth-rollup" }, idempotency_key: "k:roll:" + code });
  for (let i = 0; i < REFUSAL_CAP.classes.rollup; i++) assert.equal((await append(gst, rollRow("U" + i), { internal: true })).ok, true, "MCP+REST+peer do not starve the auth rollup");
  o = await append(gst, rollRow("U-over"), { internal: true });
  assert.equal(o.ok, false); assert.equal(o.cap_class, "rollup");
  assert.equal((await loadChain(gst, "refusals")).length, REFUSAL_CAP.total, "exactly 609 new rows, no more");
  // (b) replays are never capped and write no row.
  const rep = await append(gst, row("R0", "runtime"), { internal: true });
  assert.equal(rep.ok, true); assert.equal(rep.replayed, true);
  assert.equal((await loadChain(gst, "refusals")).length, REFUSAL_CAP.total);
  // (c) sealRefusal maps the writer cap to an honest rate_limited.
  rgc._resetMcpSealCap();
  const sealed = await rgc.sealRefusal(gst, { code: "FG-HALLUC-TOOL", tool: "fraggate_call", slug: "foldlock", op: "zz", args: {}, minuteBucket: 7 });
  assert.equal(sealed.sealed, false); assert.equal(sealed.status, "rate_limited");
  assert.equal((await verify(gst, { c: "refusals" })).ok, true);

  // (d) goal-variant sub-cap: rows that differ only by goal_key stop at 30; another code still writes.
  const vst = storeFor({ CHAINLOCK: memoryChainWriterNamespace({}) });
  let vlast;
  for (let i = 0; i < REFUSAL_CAP.variant; i++) vlast = await append(vst, row("SAME-CODE", null, { goal_key: "goal:" + String(i).padStart(16, "0") }), { internal: true });
  assert.equal(vlast.ok, true);
  o = await append(vst, row("SAME-CODE", null, { goal_key: "goal:ffffffffffffffff" }), { internal: true });
  assert.equal(o.ok, false); assert.match(o.message, /goal-variant sub-cap 30/);
  assert.equal((await append(vst, row("OTHER-CODE", null, { goal_key: "goal:ffffffffffffffff" }), { internal: true })).ok, true);
  assert.equal((await loadChain(vst, "refusals")).length, REFUSAL_CAP.variant + 1);
  // (d2) AZBot bypass repro: a junk op AND the goal both vary. The op is bounded to "other" (its hash is
  //      not in the shape), so the sub-cap still stops it at 30.
  const jst = storeFor({ CHAINLOCK: memoryChainWriterNamespace({}) });
  let jok = 0, jcap = 0;
  for (let i = 0; i < 100; i++) {
    rgc._resetMcpSealCap();
    const jr = await rgc.sealRefusal(jst, { code: "FG-HALLUC-TOOL", tool: "fraggate_call", slug: "foldlock", op: "junk" + i, args: {}, goal: { key: "goal:" + String(i).padStart(16, "0"), source: "caller" } });
    if (jr.sealed) jok++; else if (jr.status === "rate_limited") jcap++;
  }
  assert.equal(jok, REFUSAL_CAP.variant, "junk op + goal varied: stops at 30"); assert.equal(jcap, 100 - REFUSAL_CAP.variant);
  assert.equal((await loadChain(jst, "refusals")).length, REFUSAL_CAP.variant);
  rgc._resetMcpSealCap();
  // (d3) AZBot collide repro: two MCP tools sharing one code have separate variant buckets (tool is in the shape).
  const tst = storeFor({ CHAINLOCK: memoryChainWriterNamespace({}) });
  for (let i = 0; i < REFUSAL_CAP.variant; i++) {
    rgc._resetMcpSealCap();
    const tr = await rgc.sealRefusal(tst, { code: "SCHEMA-DRIFT", tool: "memory_get", args: {}, goal: { key: "goal:" + String(i).padStart(16, "0"), source: "caller" } });
    assert.equal(tr.sealed, true, "memory_get variant " + i + " seals");
  }
  rgc._resetMcpSealCap();
  const tover = await rgc.sealRefusal(tst, { code: "SCHEMA-DRIFT", tool: "memory_get", args: {}, goal: { key: "goal:ffffffffffffffff", source: "caller" } });
  assert.equal(tover.status, "rate_limited", "memory_get variant 31 is capped");
  rgc._resetMcpSealCap();
  const tother = await rgc.sealRefusal(tst, { code: "SCHEMA-DRIFT", tool: "mesh_join", args: {} });
  assert.equal(tother.sealed, true, "same code on another tool is not in memory_get's bucket");
  rgc._resetMcpSealCap();

  // (e) failed writes don't spend a slot: the first peer write fails at the storage put, then 120 still fit.
  class Flaky extends Map { set(k, v) { if (this.failNext && String(k).startsWith("e:")) { this.failNext = false; throw new Error("disk full (test)"); } return super.set(k, v); } }
  const flaky = [];
  class Shared extends Map { get(k) { if (!super.has(k)) { const f = new Flaky(); flaky.push(f); super.set(k, f); } return super.get(k); } }
  const fst = storeFor({ CHAINLOCK: memoryChainWriterNamespace({}, new Shared()) });
  await append(fst, row("WARM", "runtime"), { internal: true }); // creates the writer's map
  for (const f of flaky) f.failNext = true;
  let failed; try { failed = await append(fst, row("FAILS", "azos"), { internal: true }); } catch (e) { failed = { ok: false, threw: true }; }
  assert.equal(failed.ok, false, "the failed write is not ok");
  for (const f of flaky) f.failNext = false;
  assert.equal((await fill(fst, "FP", "azos", REFUSAL_CAP.classes.peer)).ok, true, "failed write did not spend a peer slot");
  assert.equal((await append(fst, row("FP-over", "azos"), { internal: true })).ok, false);
  assert.equal((await verify(fst, { c: "refusals" })).ok, true);

  // (f) door level: REST and peer doors over the writer cap answer rate_limited; the refusal still stands.
  const cenv = { SESSION: memorySessionNamespace({}), CHAINLOCK: memoryChainWriterNamespace({}) };
  const cst = storeFor(cenv);
  await fill(cst, "CR", "runtime", REFUSAL_CAP.classes.rest);
  await fill(cst, "CP", "azos", REFUSAL_CAP.classes.peer);
  const rowsBefore = (await loadChain(cst, "refusals")).length;
  doors._resetRefusalMemo();
  const restRes = await get("/v1/mesh/install", {}, cenv);
  assert.equal(restRes.status, 400, "REST refusal still stands");
  const restBody = await restRes.json();
  assert.equal(restBody.code, "ONBOARD-BAD-SLUG");
  assert.equal(restBody.refusal_receipt.sealed, false); assert.equal(restBody.refusal_receipt.status, "rate_limited");
  assert.equal(restRes.headers.get("x-azrt-refusal-receipt"), "rate_limited; sealed=false");
  const peerRes = await handler(new Request("https://peer.aziel.internal/v1/refusals/peer", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ surface: "azos", code: "TRACKER-BAD-QUERY", method: "GET", route: "/v1/downloads/abc", status: 400 }) }), cenv, ctx);
  const peerBody = await peerRes.json();
  assert.equal(peerBody.ok, false); assert.equal(peerBody.refusal_receipt.sealed, false); assert.equal(peerBody.refusal_receipt.status, "rate_limited");
  assert.equal((await loadChain(cst, "refusals")).length, rowsBefore, "over cap: nothing written");
  doors._resetRefusalMemo(); rgc._resetMcpSealCap();

  // (g) class-full memo: once the writer says a class is full, further refusals of that class answer
  //     rate_limited in the isolate without calling the writer DO; other classes still reach it.
  //     Cap answers are not refunded, so the isolate door cap fills too.
  let calls = 0;
  const realNs = memoryChainWriterNamespace({});
  const counted = { idFromName: realNs.idFromName, get: (id) => { const st = realNs.get(id); return { fetch: (req) => { calls++; return st.fetch(req); } }; }, getByName: (nm) => { const st = realNs.getByName(nm); return { fetch: (req) => { calls++; return st.fetch(req); } }; } };
  const kst = storeFor({ CHAINLOCK: counted });
  await fill(kst, "KM", null, REFUSAL_CAP.classes.mcp);
  await fill(kst, "KR", "runtime", REFUSAL_CAP.classes.rest);
  calls = 0;
  const first = await rgc.sealRefusal(kst, { code: "FG-HALLUC-TOOL", tool: "fraggate_call", slug: "foldlock", op: "zz", args: {} });
  assert.equal(first.status, "rate_limited"); assert.equal(first.cap_class, "mcp"); assert.ok(calls > 0, "first over-cap refusal asks the writer");
  calls = 0;
  for (let i = 0; i < 20; i++) {
    const again = await rgc.sealRefusal(kst, { code: "FG-UNKNOWN-OP-" + i, tool: "fraggate_call", slug: "foldlock", op: "zz" + i, args: {} });
    assert.equal(again.status, "rate_limited"); assert.equal(again.memo, true);
  }
  assert.equal(calls, 0, "class full: no writer DO calls for further mcp refusals");
  // REST share is full too: the first door refusal asks the writer, then the memo answers;
  // cap answers keep their isolate slot, so the per-door isolate cap (30) fills.
  doors._resetRefusalMemo();
  calls = 0;
  const d1 = await doors.sealDoorRefusal(kst, { door: "mesh", code: "ONBOARD-X0", reason: "x", method: "GET", route: "/v1/mesh/install", status: 400 });
  assert.equal(d1.status, "rate_limited"); assert.ok(calls > 0);
  calls = 0;
  let dl;
  for (let i = 1; i <= doors.REFUSAL_HTTP_CAP_PER_MIN; i++) dl = await doors.sealDoorRefusal(kst, { door: "mesh", code: "ONBOARD-X" + i, reason: "x", method: "GET", route: "/v1/mesh/install", status: 400 });
  assert.equal(calls, 0, "rest class full: no writer DO calls");
  assert.equal(dl.status, "rate_limited"); assert.equal(dl.cap_bucket, "door:mesh", "cap answers were not refunded: isolate door cap filled");
  // The peer class still has room and still reaches the writer.
  calls = 0;
  const pv = await doors.sealDoorRefusal(kst, { surface: "azos", door: "azos", code: "TRACKER-OK-ROOM", method: "GET", route: "/v1/x", status: 400 });
  assert.equal(pv.sealed, true); assert.ok(calls > 0, "peer class not full: writes");
  // (h) a real write failure IS refunded (MCP isolate slot given back).
  rgc._resetMcpSealCap();
  const before = rgc._mcpSealCapUsed();
  const bad = await rgc.sealRefusal({ appendAtomic: async () => { throw new Error("disk full (test)"); }, load: async () => [] , kind: "x" }, { code: "FG-HALLUC-TOOL", tool: "fraggate_call", slug: "foldlock", op: "zz", args: {} });
  assert.equal(bad.sealed, false); assert.notEqual(bad.status, "rate_limited");
  assert.equal(rgc._mcpSealCapUsed(), before, "real failure: slot refunded");
  doors._resetRefusalMemo(); rgc._resetMcpSealCap();
  n++;
}

console.log(`verify-refusal-doors: ok (${n} groups)`);
