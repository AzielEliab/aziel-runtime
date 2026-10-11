/**
 * AZRT-REFUSAL-RECEIPT-1.0, AZRT-GOAL-LINK-1.0, AZRT-SCHEMA-PIN-1.0, AZRT-CONTEXT-HASH-1.0,
 * AZRT-EXPECT-SPEC-1.0 — end to end through the real /mcp handler with in-memory DOs.
 * Author: Aziel Eliab.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import { memorySessionNamespace } from "../src/session-do.js";
import { memoryChainWriterNamespace } from "../src/chainlock/writer-do.js";
import { storeFor } from "../src/chainlock/store.js";
import { verify, stampSha256 } from "../src/chainlock/ops.js";
import { applyOpen, commitExec, openSession, recordIntent, verifyChainStrict, newSessionId } from "../src/session-core.js";
import { expectSpecOf } from "../src/receipt-guard.js";

const handler = (await import("../src/index.js")).default.fetch;
const env = { SESSION: memorySessionNamespace({}), CHAINLOCK: memoryChainWriterNamespace({}) };
async function mcp(method, params = {}, headers = {}) {
  const res = await handler(
    new Request("https://aziel-runtime.example/mcp", {
      method: "POST",
      headers: { "content-type": "application/json", ...headers },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
    }),
    env,
  );
  return res.json();
}
const sc = (r) => { if (!r.result) throw new Error(JSON.stringify(r).slice(0, 300)); return r.result.structuredContent || JSON.parse(r.result.content[0].text); };

// tools/list publishes the schema hash; still 36 tools.
const list = await mcp("tools/list");
assert.equal(list.result.tools.length, 36);
const schemaHash = list.result._meta["aziel/schema_hash"];
assert.match(schemaHash, /^[a-f0-9]{64}$/);

// RIB-018: MCP-CONFIRM-REQUIRED mints its own sealed refusal receipt; envelope otherwise unchanged.
const refused = await mcp("tools/call", { name: "fraggate_call", arguments: { slug: "foldlock", op: "fold-append", goal_id: "g-fold-1" } });
assert.equal(refused.result.isError, true);
const r1 = sc(refused);
assert.equal(r1.code, "MCP-CONFIRM-REQUIRED");
assert.equal(r1.refusal_receipt.sealed, true, JSON.stringify(r1.refusal_receipt));
assert.equal(r1.refusal_receipt.chain, "refusals");
assert.equal(r1.refusal_receipt.goal_key, "goal:g-fold-1");
assert.ok(r1.refusal_receipt.lattice.primary && r1.refusal_receipt.lattice.secondary, "dual lattice");

// FragGate door refusal (unknown op) also sealed; same goal -> chains to the previous refusal.
const refused2 = await mcp("tools/call", { name: "fraggate_call", arguments: { slug: "foldlock", op: "no-such-op", goal_id: "g-fold-1", confirm: true } });
const r2 = sc(refused2);
assert.equal(refused2.result.isError, true);
assert.notEqual(r2.code, "FG-OK");
assert.equal(r2.refusal_receipt.sealed, true);
assert.equal(r2.refusal_receipt.follows.h, r1.refusal_receipt.h, "repeat refusal names the one before");

// @asmirkn: next action on the same goal through ANOTHER tool is sealed as the action after the refusal.
const next = await mcp("tools/call", { name: "library_lookup", arguments: { q: "chainlock", goal_id: "g-fold-1" } });
const n1 = sc(next);
assert.equal(n1.follows_refusal && n1.follows_refusal.sealed, true, JSON.stringify(n1).slice(0, 400));
assert.equal(n1.follows_refusal.follows.h, r2.refusal_receipt.h);
// Pointer consumed: a second follow-up is not logged again.
const again = sc(await mcp("tools/call", { name: "library_lookup", arguments: { q: "chainlock", goal_id: "g-fold-1" } }));
assert.equal(again.follows_refusal, undefined);

// Derived goal: same MCP session id chains without goal_id.
const init = await handler(
  new Request("https://aziel-runtime.example/mcp", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "t", version: "1" } } }),
  }),
  env,
);
const sid = init.headers.get("mcp-session-id");
assert.ok(sid, "initialize returns a session id");
const s1 = sc(await mcp("tools/call", { name: "fraggate_call", arguments: { slug: "foldlock", op: "fold-append" } }, { "mcp-session-id": sid }));
assert.equal(s1.refusal_receipt.goal_source, "mcp-session");
const s2 = sc(await mcp("tools/call", { name: "fraggate_call", arguments: { slug: "foldlock", op: "health" } }, { "mcp-session-id": sid }));
assert.equal(s2.follows_refusal.follows.h, s1.refusal_receipt.h);

// RIB-019: a stale schema pin refuses SCHEMA-DRIFT, nothing runs, and the refusal is sealed.
const drift = sc(await mcp("tools/call", { name: "fraggate_call", arguments: { slug: "foldlock", op: "health", schema_hash: "0".repeat(64) } }));
assert.equal(drift.code, "SCHEMA-DRIFT");
assert.equal(drift.executed, false);
assert.equal(drift.current_schema_hash, schemaHash);
assert.equal(drift.refusal_receipt.sealed, true);
const pinned = sc(await mcp("tools/call", { name: "fraggate_call", arguments: { slug: "foldlock", op: "health", schema_hash: schemaHash } }));
assert.equal(pinned.code, "FG-OK");

// RIB-020: context hash + node ids on the result and in the FragGate ledger row.
const ctx = sc(await mcp("tools/call", { name: "fraggate_call", arguments: { slug: "foldlock", op: "health", context_refs: ["https://example.org/a", "sha256:" + "1".repeat(64)], node_ids: ["peer-node-1"] } }));
assert.equal(ctx.code, "FG-OK");
assert.match(ctx.context.context_hash, /^[a-f0-9]{64}$/);
assert.deepEqual(ctx.context.node_ids, ["aziel-runtime", "peer-node-1"]);
const ledgerRows = await storeFor(env).loadRecords("fraggate");
const withCtx = ledgerRows.find((row) => row.context_hash === ctx.context.context_hash);
assert.ok(withCtx, "ledger row carries context_hash");
assert.deepEqual(withCtx.node_ids, ["aziel-runtime", "peer-node-1"]);

// Refusals chain verifies (internal chain, not on the public roster).
const rows = await storeFor(env).loadRecords("refusals");
assert.ok(rows.length >= 5);
for (const row of rows) assert.equal(await stampSha256(row), row.stamp_sha256);
const pub = await mcp("tools/call", { name: "chainlock_append", arguments: { c: "refusals", s: "forge", f: "forged refusal", confirm: true } });
assert.notEqual(sc(pub).ok, true, "public chainlock_append cannot write the refusals chain");

// RIB-013: expected-state spec sealed as stamp #1; later receipts reference it; schema pin per session.
const exp = await expectSpecOf({ spec: { state: "foldlock health ok" }, verdict_criteria: "status 200 and code FG-OK" });
const session = openSession({ id: newSessionId(), now: "2026-10-10T00:00:00Z", version: "2.0.0-rc1" });
await applyOpen(session, "2026-10-10T00:00:00Z", { expect: exp.expect, expect_hash: exp.expect_hash, schema_hash: schemaHash });
assert.equal(session.receipts[0].expect_hash, exp.expect_hash);
assert.equal(session.receipts[0].schema_hash, schemaHash);
const { intent } = await recordIntent(session, { slug: "foldlock", op: "health", payload: {}, payloadText: "{}", schemaHash }, "2026-10-10T00:00:01Z");
const rec = await commitExec(session, { intent, status: 200, latencyMs: 1, requestDigest: "a", responseDigest: "b", additive: { context_hash: "2".repeat(64), node_ids: ["aziel-runtime"] } }, "2026-10-10T00:00:02Z");
assert.equal(rec.spec_ref.receipt_hash, session.receipts[0].hash);
assert.equal(rec.context_hash, "2".repeat(64));
assert.equal((await verifyChainStrict(session.receipts)).ok, true);
await assert.rejects(
  recordIntent(session, { slug: "foldlock", op: "health", payload: {}, payloadText: "{}", schemaHash: "3".repeat(64) }, "2026-10-10T00:00:03Z"),
  (err) => err.code === "SCHEMA-DRIFT",
);
assert.equal((await expectSpecOf({ spec: "x" })).code, "EXPECT-SPEC-INVALID");

// Old session fixture still verifies unchanged.
const fx = JSON.parse(fs.readFileSync(new URL("../fixtures/session-receipt-chain.json", import.meta.url), "utf8"));
assert.equal((await verifyChainStrict(Array.isArray(fx) ? fx : fx.receipts)).ok, true);
console.log("verify-receipt-guard: ok (refusal receipts, goal links, schema pin, context hash, expect spec)");
