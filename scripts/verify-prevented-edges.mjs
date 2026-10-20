/**
 * RIB-053 / AKM-PREVENTED-EDGE-1.0: refusals as recallable "prevented" memory edges.
 */
import assert from "node:assert/strict";
const handler = (await import("../src/index.js")).default.fetch;
const { append, loadChain, verify } = await import("../src/chainlock/ops.js");
const { storeFor } = await import("../src/chainlock/store.js");
const { sealRefusal, goalKeyOf } = await import("../src/receipt-guard.js");
const { adaptiveRecall, observe, revoke, supersede, resetMemoryIndexForTests, runMemoryOp } = await import("../src/memory.js");
const { resetRoseClockForTests } = await import("../src/roseclock/engine.js");
const { goalHashOfKey, edgeMemoryId, verifyPreventedEdges, preventedEdges } = await import("../src/memory/prevented.js");

resetMemoryIndexForTests();
resetRoseClockForTests();
let n = 0;
const ok = (c, m) => { assert.ok(c, m); n++; };
const env = {};
const store = storeFor(env);

// Baseline: existing memory ops verify unchanged before any prevented edge exists.
const base = await observe(env, { subject: "baseline", fact: "a plain observation" });
ok(base.ok && base.authorizes_action === false, "plain observe unchanged");
const v0 = await verify(env, { c: "learn" });
ok(v0.ok && v0.chains[0].prevented === undefined, "learn verify unchanged without edges");

// A sealed refusal receipt with a goal.
const goal = await goalKeyOf({ goal_id: "ship-release-7" }, null);
const sealed = await sealRefusal(store, { code: "FG-STUB-OP", tool: "fraggate_call", slug: "foldlock", op: "rewrite", args: { secret_text: "do not store me" }, goal, trustedNames: true });
const refusals = await loadChain(store, "refusals", "");
const rrow = refusals[refusals.length - 1];
ok(rrow && rrow.k === "refusal" && rrow.goal_key === goal.key, "refusal sealed on refusals chain with goal_key");
const H = rrow.stamp_sha256;
const GH = await goalHashOfKey(goal.key);

// Refusals that cannot become edges: bad hash, unknown hash, no goal.
let r = await observe(env, { kind: "prevented", refusal_receipt_hash: "zz" });
ok(!r.ok && r.code === "AKM-PREVENTED-INVALID", "bad hash refused");
r = await observe(env, { kind: "prevented", refusal_receipt_hash: "f".repeat(64) });
ok(!r.ok && r.code === "AKM-PREVENTED-NO-RECEIPT" && r.written === false, "hash not on refusals chain refused");
await sealRefusal(store, { code: "FG-NO-GOAL", tool: "fraggate_call", slug: "foldlock", op: "rewrite", args: {}, trustedNames: true });
const noGoal = (await loadChain(store, "refusals", "")).at(-1).stamp_sha256;
r = await observe(env, { kind: "prevented", refusal_receipt_hash: noGoal });
ok(!r.ok && r.code === "AKM-PREVENTED-NO-GOAL", "refusal without goal refused");
r = await observe(env, { kind: "prevented", refusal_receipt_hash: H, goal_hash: "0".repeat(64) });
ok(!r.ok && r.code === "AKM-PREVENTED-GOAL-MISMATCH", "goal mismatch refused");


// AZBot B317-1 squat repro: before the honest observe, an attacker writes a crafted memory_prevented row
// citing the real refusal hash with the wrong goal_hash/code (old id mem_prev_<hash32>). Every public path refuses.
{
  const legacyId = "mem_prev_" + H.slice(0, 32);
  const crafted = { c: "learn", k: "memory_prevented", subject: "prevented:squat", fact: "prevented SQUAT", memory: { memory_id: legacyId, kind: "memory_prevented", edge_spec: "AKM-PREVENTED-EDGE-1.0", goal_hash: "0".repeat(64), refusal_code: "SQUAT", refusal_receipt_hash: H, refusal_chain: "refusals", authorizes_action: false } };
  const before = (await loadChain(store, "learn", "")).length;
  for (const variant of [crafted, { ...crafted, k: "memory_observation" }, { ...crafted, k: "x", memory: { memory_id: legacyId, refusal_receipt_hash: H } }, { ...crafted, k: "Memory_Prevented_Retire", memory: undefined }]) {
    const a = await append(env, variant);
    ok(!a.ok && a.code === "CL-PREVENTED-RESERVED" && a.written === false, "public append refused: " + variant.k);
  }
  // Through the real public MCP door (tools/call chainlock_append).
  const res = await handler(new Request("https://rt.example/mcp", { method: "POST", headers: { "content-type": "application/json", accept: "application/json, text/event-stream" }, body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/call", params: { name: "chainlock_append", arguments: { ...crafted, confirm: true } } }) }), env);
  const txt = await res.text();
  ok(txt.includes("CL-PREVENTED-RESERVED"), "MCP chainlock_append refused CL-PREVENTED-RESERVED");
  ok((await loadChain(store, "learn", "")).length === before, "nothing written by the squat attempts");
  // Even a row that somehow got in with a hash-only id is not an edge and does not block the honest one.
  const ghost = await preventedEdges([{ k: "memory_prevented", t: "2026-01-01T00:00:00Z", memory: crafted.memory }]);
  ok(ghost.length === 0, "unbound id is never counted as an edge");
}

// Observe the refusal as a prevented edge (through the memory op door, like memory_observe).
const e = await runMemoryOp("observe", { kind: "prevented", refusal_receipt_hash: H, fact: "caller text must not land", subject: "caller subject" }, env);
ok(e.ok && e.prevented === true && e.authorizes_action === false, "edge observed, authorizes_action false");
ok(e.edge.goal_hash === GH && e.edge.refusal_code === "FG-STUB-OP" && e.edge.refusal_receipt_hash === H && e.edge.memory_id === (await edgeMemoryId(H, GH, "FG-STUB-OP")), "edge carries goal_hash, code, receipt hash");
const learn1 = await loadChain(store, "learn", "");
const erow = learn1.at(-1);
const text = JSON.stringify(erow);
ok(erow.k === "memory_prevented" && !text.includes("caller text") && !text.includes("caller subject") && !text.includes("do not store me") && !text.includes("ship-release-7"), "no caller text on the stamp");
r = await observe(env, { kind: "prevented", refusal_receipt_hash: H });
ok(!r.ok && r.code === "AKM-PREVENTED-DUPLICATE", "duplicate edge refused");

// Recall by goal_hash and by goal_id.
let rc = await adaptiveRecall(env, { goal_hash: GH });
ok(rc.prevented && rc.prevented.count === 1 && rc.prevented.edges[0].prevented === true && rc.prevented.edges[0].refusal_receipt_hash === H && rc.prevented.edges[0].active === true, "recall returns active prevented edge");
ok(rc.authorizes_action === false && rc.prevented.authorizes_action === false, "recall authorizes nothing");
rc = await adaptiveRecall(env, { goal_id: "ship-release-7" });
ok(rc.prevented && rc.prevented.count === 1, "recall by goal_id (hashed) matches");
rc = await adaptiveRecall(env, { goal_hash: "1".repeat(64) });
ok(rc.prevented && rc.prevented.count === 0, "other goal: none");
rc = await adaptiveRecall(env, { goal_hash: "nothex" });
ok(!rc.ok && rc.code === "AKM-PREVENTED-INVALID", "bad goal_hash refused");
const plain = await adaptiveRecall(env, { q: "baseline" });
ok(plain.prevented === undefined, "recall without goal unchanged");

// verify ok with a good edge.
let v = await verify(env, { c: "learn" });
ok(v.ok && v.chains[0].prevented.edges === 1 && v.chains[0].prevented.errors === 0, "verify ok with cited receipt");

// Retire: additive supersede stamp sets valid_to; history keeps the row; recall stops returning it active.
const ret = await supersede(env, { memory_id: e.edge.memory_id, fact: "lesson superseded" });
ok(ret.ok, "retire stamp appended");
rc = await adaptiveRecall(env, { goal_hash: GH });
ok(rc.prevented.count === 0, "retired edge not active in recall");
rc = await adaptiveRecall(env, { goal_hash: GH, history: true });
ok(rc.prevented.count === 1 && rc.prevented.edges[0].active === false && rc.prevented.edges[0].valid_to && rc.prevented.edges[0].retired_by.k === "memory_supersede", "history keeps row with valid_to");
ok((await loadChain(store, "learn", "")).some((x) => x.k === "memory_prevented"), "row never deleted");
r = await observe(env, { kind: "prevented", refusal_receipt_hash: H });
ok(!r.ok && r.code === "AKM-PREVENTED-RETIRED", "retired edge not re-opened");
// revoke also retires.
const goal2 = await goalKeyOf({ goal_id: "goal-two" }, null);
await sealRefusal(store, { code: "MESH-OFF", tool: "mesh_join", slug: "mesh", op: "join", args: {}, goal: goal2, trustedNames: true });
const H2 = (await loadChain(store, "refusals", "")).at(-1).stamp_sha256;
const e2 = await observe(env, { kind: "prevented", refusal_receipt_hash: H2 });
ok(e2.ok, "second edge");
ok((await revoke(env, { memory_id: e2.edge.memory_id })).ok, "revoke retires");
rc = await adaptiveRecall(env, { goal_hash: await goalHashOfKey(goal2.key), history: true });
ok(rc.prevented.edges[0].active === false && rc.prevented.edges[0].retired_by.k === "memory_revoke", "revoke sets valid_to");

// Fail closed: an edge citing a hash that is not on the refusals chain.
const fake = "e".repeat(64);
// Simulates a direct store write (the public door refuses this; see B317-1 above).
await append(env, { c: "learn", k: "memory_prevented", subject: "prevented:x", fact: "prevented FAKE", memory: { memory_id: await edgeMemoryId(fake, GH, "FAKE"), kind: "memory_prevented", edge_spec: "AKM-PREVENTED-EDGE-1.0", goal_hash: GH, refusal_code: "FAKE", refusal_receipt_hash: fake, refusal_chain: "refusals", authorizes_action: false } }, { preventedWriter: true });
v = await verify(env, { c: "learn" });
ok(!v.ok && v.breaks.some((b) => b.reason === "PREVENTED-RECEIPT-MISSING"), "verify fails closed on uncited receipt");
const all = await verify(env, {});
ok(!all.ok, "full verify fails closed");
rc = await adaptiveRecall(env, { goal_hash: GH });
ok(!rc.ok && rc.code === "CHAIN_VERIFY_FAIL", "recall refuses on a broken edge (fail closed)");
// Mismatch (right hash, wrong code) also fails.
const mm = await verifyPreventedEdges([{ k: "memory_prevented", memory: { memory_id: await edgeMemoryId(H, GH, "OTHER"), goal_hash: GH, refusal_code: "OTHER", refusal_receipt_hash: H, authorizes_action: false } }], await loadChain(store, "refusals", ""));
ok(!mm.ok && mm.errors[0].code === "PREVENTED-RECEIPT-MISMATCH", "code mismatch fails");
const refv = await verify(env, { c: "refusals" });
ok(refv.ok, "refusals chain verifies unchanged");

// R2: word-boundary + NFKC + zero-width match for prevented-shaped stamps.
{
  const { isPreventedShaped } = await import("../src/chainlock/ops.js");
  for (const k of ["memory_prevented", "Memory_Prevented_Retire", "prevented", "memory-prevented", "memory_pre\u200Bvented", "memory_\uFF50revented", "memory_preven\u00ADted", "x.PREVENTED"]) ok(isPreventedShaped({ k }), "caught: " + JSON.stringify(k));
  for (const k of ["unprevented", "memory_unprevented", "preventedness", "memory_observation", "prevent", ""]) ok(!isPreventedShaped({ k }), "not caught: " + JSON.stringify(k));
  ok(isPreventedShaped({ k: "x", memory: { kind: "memory_pre\u200Dvented" } }), "memory.kind normalized");
  ok(!isPreventedShaped({ k: "x", memory: { kind: "unprevented_note" } }), "memory.kind unprevented ok");
  const a = await append(env, { c: "learn", k: "memory_unprevented_note", subject: "s", fact: "an unprevented note is a normal stamp" });
  ok(a.ok, "unprevented kind appends normally");
}
console.log(`verify-prevented-edges: ${n} checks ok (RIB-053 / AKM-PREVENTED-EDGE-1.0; hash-linked and sealed, not signed; authorizes_action false)`);
