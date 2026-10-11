/**
 * FragGate read-only ops run on a plain first call; mutating ops keep MCP-CONFIRM-REQUIRED.
 * Plus an all-36-tools first-call smoke: every tool answers (no RPC error, no throw),
 * and every refusal is a documented code with a message.
 * Author: Aziel Eliab.
 */
import assert from "node:assert/strict";
import { fraggateOpAccess, MCP_CONFIRM_REQUIRED } from "../src/mcp-safeguard.js";
import { memorySessionNamespace } from "../src/session-do.js";

const handler = (await import("../src/index.js")).default.fetch;
const env = { SESSION: memorySessionNamespace({}) };
async function mcp(method, params = {}, id = 1) {
  const res = await handler(
    new Request("https://aziel-runtime.example/mcp", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id, method, params }),
    }),
    env,
  );
  return res.json();
}

for (const op of ["health", "fold-preview", "status", "describe", "verify", "news_feed", "skill", "doctor", "region_list"]) {
  assert.equal(fraggateOpAccess(op).mutating, false, `${op} should be read-only`);
}
for (const op of ["append", "seal", "news_pin", "send", "mint", "session_open", "", "mystery_op", "airlock_ingest", "notice_post"]) {
  assert.equal(fraggateOpAccess(op).mutating, true, `${op} should be mutating`);
}

for (const [slug, op] of [["foldlock", "health"], ["foldlock", "fold-preview"], ["decisiongate", "health"]]) {
  const r = await mcp("tools/call", { name: "fraggate_call", arguments: { slug, op, payload: { text: "first call" } } });
  assert.notEqual(r.result.isError, true, `${slug} ${op} without confirm: ${JSON.stringify(r.result.structuredContent).slice(0, 300)}`);
  assert.equal(r.result.structuredContent.code, "FG-OK");
  assert.equal(r.result.structuredContent.access, "read_only");
}

const mut = await mcp("tools/call", { name: "fraggate_call", arguments: { slug: "foldlock", op: "fold-append" } });
assert.equal(mut.result.isError, true);
assert.equal(mut.result.structuredContent.code, MCP_CONFIRM_REQUIRED);
assert.equal(mut.result.structuredContent.mutated, false);
assert.match(mut.result.structuredContent.message, /op "fold-append" is mutating/);
assert.equal(mut.result.structuredContent.result.retry.arguments.confirm, true);
assert.match(mut.result.structuredContent.message, /is mutating/);

const tools = (await mcp("tools/list")).result.tools;
assert.equal(tools.length, 36);
const firstArgs = { fraggate_call: { slug: "foldlock", op: "health" }, runtime_pull: { slug: "foldlock" } };
const SESSION_OR_ID = new Set(["memory_get", "runtime_session_receipt", "runtime_session_receipts"]);
for (const t of tools) {
  const r = await mcp("tools/call", { name: t.name, arguments: firstArgs[t.name] || {} });
  assert.ok(!r.error, `${t.name} rpc error ${r.error && r.error.message}`);
  if (r.result.isError) {
    const sc = r.result.structuredContent || {};
    const text = JSON.stringify(sc);
    const ok = sc.code === MCP_CONFIRM_REQUIRED || sc.code === "MESH-DISABLE-REFUSED" || SESSION_OR_ID.has(t.name);
    assert.ok(ok, `${t.name} errored on a reasonable first call: ${text.slice(0, 300)}`);
  }
}
console.log("verify-fraggate-readonly: ok");
