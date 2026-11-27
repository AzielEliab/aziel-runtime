/**
 * AZRT-X-REPLY-POLICY-1.0: agent attribution, pre-action hooks, write-ahead
 * limits, fail-closed MCP policy refresh, runtime manifest trust, and the
 * guardian audit-clear refusal. Allow and fail-closed paths. Hash-linked,
 * not signed. Cap-7 is not ICANN. Paid satellite stays HELD.
 */
import assert from "node:assert/strict";
import { append, loadChain } from "../src/chainlock/ops.js";
import { MemoryStore } from "../src/chainlock/store.js";
import { fraggateCall } from "../src/fraggate/door.js";
import { guardToolCall } from "../src/receipt-guard.js";
import {
  applyOpen,
  applyPolicy,
  canonicalize,
  commitExec,
  digestText,
  newSessionId,
  openSession,
  recordIntent,
  sha256Hex,
  verifyChainStrict,
} from "../src/session-core.js";
import {
  admitMcpPolicy,
  admitRuntimeManifest,
  clearHookLog,
  clearReceiptChain,
  createHookLog,
  createLimitJournal,
  createPolicyCache,
  createReceiptChain,
  executeGatedAction,
  manifestDigest,
  persistLimitBeforeAction,
  policyHookLog,
  refreshMcpPolicy,
  resetXReplyState,
  rewriteHookRecord,
  runPreActionHooks,
  verifyHookLog,
  verifyPolicyChain,
  verifyPolicyReceipt,
} from "../src/x-reply-policy.js";

resetXReplyState();
let n = 0;
const T = "2026-11-20T00:00:00.000Z";
const ID = {
  agent_id: "agent_a",
  caller_identity: "agent:agent_a",
  issuer_kind: "agent",
};

function caller() {
  return { ...ID };
}

async function freshSession() {
  const session = openSession({ id: newSessionId(), now: T, version: "test", source: "x-reply-policy" });
  await applyOpen(session, T);
  return session;
}

async function sealExec(session, intent) {
  const payloadText = "{}";
  const reqDig = await digestText(payloadText);
  const resDig = await digestText('{"ok":true}');
  return commitExec(
    session,
    {
      intent,
      status: 200,
      latencyMs: 1,
      requestDigest: reqDig.sha256,
      responseDigest: resDig.sha256,
      error: null,
      upstream: "mock",
      responseBytes: resDig.bytes,
      contentType: "application/json",
    },
    T,
  );
}

// --- 1. Attribution: allow binds the caller inside the hash; missing and forged refuse ---
{
  const receipts = createReceiptChain();
  const hookLog = createHookLog();
  let ran = 0;
  const ok = await executeGatedAction(
    { tool: "fraggate_call", ...caller(), receipts, hookLog, now: 0 },
    async () => {
      ran += 1;
      return { status: 200 };
    },
  );
  assert.equal(ok.ok, true);
  assert.equal(ran, 1);
  assert.equal(ok.receipt.event, "tool_call");
  assert.equal(ok.receipt.agent_id, "agent_a");
  assert.equal(ok.receipt.caller_identity, "agent:agent_a");
  assert.equal(ok.receipt.issuer_kind, "agent");
  assert.equal(ok.receipt.bound, true);
  const verdict = await verifyPolicyReceipt(ok.receipt);
  assert.equal(verdict.ok, true);
  const { hash, ...unsigned } = ok.receipt;
  assert.equal(await sha256Hex(canonicalize(unsigned)), hash);
  assert.match(canonicalize(unsigned), /"agent_id":"agent_a"/);
  assert.match(canonicalize(unsigned), /"caller_identity":"agent:agent_a"/);
  assert.match(canonicalize(unsigned), /"issuer_kind":"agent"/);
  const tampered = { ...ok.receipt, agent_id: "agent_b" };
  assert.equal((await verifyPolicyReceipt(tampered)).code, "RECEIPT-HASH-MISMATCH");
  const stripped = { ...unsigned };
  delete stripped.issuer_kind;
  assert.notEqual(await sha256Hex(canonicalize(stripped)), hash);
  n++;
}
{
  const receipts = createReceiptChain();
  const hookLog = createHookLog();
  let ran = 0;
  const missing = await executeGatedAction({ tool: "fraggate_call", receipts, hookLog, now: 0, agent_id: "agent_a" }, async () => {
    ran += 1;
    return { status: 200 };
  });
  assert.equal(missing.ok, false);
  assert.equal(missing.code, "IDENTITY-MISSING");
  assert.equal(missing.executed, false);
  assert.equal(ran, 0);
  assert.equal(missing.refusal_receipt.event, "refused");
  assert.equal(missing.refusal_receipt.agent_id, "agent_a");
  assert.equal(missing.refusal_receipt.caller_identity, null);
  assert.equal(missing.refusal_receipt.issuer_kind, null);
  assert.equal((await verifyPolicyReceipt(missing.refusal_receipt)).ok, true);
  n++;
}
{
  const receipts = createReceiptChain();
  let ran = 0;
  const forged = await executeGatedAction(
    {
      tool: "fraggate_call",
      receipts,
      hookLog: createHookLog(),
      now: 0,
      agent_id: "agent_a",
      caller_identity: "harness:agent_a",
      issuer_kind: "harness",
      bound: { agent_id: "agent_a", issuer_kind: "agent" },
    },
    async () => {
      ran += 1;
      return { status: 200 };
    },
  );
  assert.equal(forged.code, "IDENTITY-FORGED");
  assert.equal(ran, 0);
  assert.equal(forged.refusal_receipt.issuer_kind, "harness");
  assert.equal(forged.refusal_receipt.caller_identity, "harness:agent_a");
  assert.equal((await verifyPolicyChain(receipts.rows)).ok, true);
  const mismatch = await executeGatedAction(
    {
      tool: "fraggate_call",
      receipts,
      hookLog: createHookLog(),
      now: 0,
      agent_id: "agent_a",
      caller_identity: "agent:agent_a",
      issuer_kind: "agent",
      bound: { agent_id: "agent_b", issuer_kind: "agent" },
    },
    async () => {
      ran += 1;
      return { status: 200 };
    },
  );
  assert.equal(mismatch.code, "IDENTITY-FORGED");
  assert.equal(ran, 0);
  n++;
}

// --- 2. Pre-action hooks: deterministic order, fail closed, append-only log ---
{
  const seen = [];
  const log = createHookLog();
  const stopped = await runPreActionHooks(
    [
      { id: "b", order: 2, fn: async () => { seen.push("b"); return { allow: true }; } },
      { id: "a", order: 2, fn: async () => { seen.push("a"); return { allow: true }; } },
      { id: "c", order: 1, fn: async () => { seen.push("c"); return { allow: false, code: "HOOK-REFUSED" }; } },
    ],
    {},
    log,
  );
  assert.deepEqual(seen, ["c"]);
  assert.equal(stopped.ok, false);
  assert.equal(stopped.code, "HOOK-REFUSED");
  assert.equal(log.rows.length, 1);
  assert.equal(log.rows[0].hook_id, "c");
  assert.equal(log.rows[0].prev_hash, "0".repeat(64));
  n++;
}
{
  const seen = [];
  const log = createHookLog();
  const ok = await runPreActionHooks(
    [
      { id: "b", order: 2, fn: async () => { seen.push("b"); return { allow: true }; } },
      { id: "a", order: 2, fn: async () => { seen.push("a"); return { allow: true }; } },
      { id: "c", order: 1, fn: async () => { seen.push("c"); return { allow: true }; } },
    ],
    {},
    log,
  );
  assert.equal(ok.ok, true);
  assert.deepEqual(seen, ["c", "a", "b"]);
  assert.equal((await verifyHookLog(log.rows)).ok, true);
  assert.equal(log.rows[1].prev_hash, log.rows[0].hash);
  assert.equal(log.rows[2].prev_hash, log.rows[1].hash);
  const before = JSON.stringify(log.rows);
  const denied = rewriteHookRecord(log, 1, { allow: false });
  assert.equal(denied.ok, false);
  assert.equal(denied.code, "HOOK-LOG-IMMUTABLE");
  assert.equal(JSON.stringify(log.rows), before);
  const mutated = { ...log.rows[0], allow: false };
  assert.equal((await verifyHookLog([mutated])).code, "HOOK-HASH-MISMATCH");
  assert.equal((await verifyHookLog(log.rows)).ok, true);
  const cleared = await clearHookLog(log);
  assert.equal(cleared.ok, false);
  assert.equal(cleared.code, "GUARDIAN-AUDIT-REFUSED");
  assert.equal(log.rows.length, 3);
  assert.equal((await verifyHookLog(log.rows)).ok, true);
  n++;
}
{
  const receipts = createReceiptChain();
  const hookLog = createHookLog();
  let ran = 0;
  const thrown = await executeGatedAction(
    {
      ...caller(),
      tool: "fraggate_call",
      receipts,
      hookLog,
      now: 0,
      hooks: [{ id: "boom", order: 100, fn: async () => { throw new Error("hook down"); } }],
    },
    async () => {
      ran += 1;
      return { status: 200 };
    },
  );
  assert.equal(thrown.code, "HOOK-ERROR");
  assert.equal(ran, 0);
  assert.equal(hookLog.rows.at(-1).code, "HOOK-ERROR");
  assert.equal(hookLog.rows.at(-1).allow, false);
  assert.equal((await verifyHookLog(hookLog.rows)).ok, true);
  n++;
}

// --- 3. Write-ahead limits and cooldowns persist before the action ---
{
  const journal = createLimitJournal();
  const spec = { key: "door", limit: 1, windowMs: 1000, cooldownMs: 0 };
  const first = await persistLimitBeforeAction(journal, spec, 0);
  assert.equal(first.ok, true);
  assert.equal(first.persisted, true);
  assert.equal(journal.entries.length, 1);
  journal.memoryCount = 0;
  const saved = journal.entries.map((entry) => ({ ...entry }));
  const revived = createLimitJournal();
  revived.entries = saved;
  revived.memoryCount = 0;
  const second = await persistLimitBeforeAction(revived, spec, 10);
  assert.equal(second.ok, false);
  assert.equal(second.code, "RATE-LIMIT-BEFORE");
  assert.equal(second.persisted, true);
  assert.equal(second.executed, false);
  assert.ok(revived.entries.some((entry) => entry.type === "cooldown"));
  n++;
}
{
  const journal = createLimitJournal();
  journal.failRemaining = 1;
  const spec = { key: "door", limit: 2, windowMs: 1000, cooldownMs: 0 };
  const failed = await persistLimitBeforeAction(journal, spec, 0);
  assert.equal(failed.code, "LIMIT-PERSIST-FAILED");
  assert.equal(failed.persisted, false);
  assert.equal(journal.entries.length, 0);
  const retried = await persistLimitBeforeAction(journal, spec, 0);
  assert.equal(retried.ok, true);
  assert.equal(journal.entries.length, 1);
  n++;
}
{
  const journal = createLimitJournal();
  const spec = { key: "cool", limit: 5, windowMs: 5000, cooldownMs: 500 };
  assert.equal((await persistLimitBeforeAction(journal, spec, 0)).ok, true);
  const mid = await persistLimitBeforeAction(journal, spec, 100);
  assert.equal(mid.code, "COOLDOWN-ACTIVE");
  assert.equal(mid.executed, false);
  assert.equal(journal.entries.filter((entry) => entry.type === "increment").length, 1);
  const later = await persistLimitBeforeAction(journal, spec, 500);
  assert.equal(later.ok, true);
  n++;
}
{
  const journal = createLimitJournal();
  const receipts = createReceiptChain();
  const hookLog = createHookLog();
  let ran = 0;
  const spec = { key: "gated", limit: 1, windowMs: 1000, cooldownMs: 0 };
  const first = await executeGatedAction(
    { ...caller(), tool: "fraggate_call", receipts, hookLog, limitStore: journal, limit: spec, now: 0 },
    async () => {
      ran += 1;
      return { status: 200 };
    },
  );
  assert.equal(first.ok, true);
  assert.equal(ran, 1);
  assert.equal(journal.entries.length >= 1, true);
  journal.memoryCount = 0;
  const second = await executeGatedAction(
    { ...caller(), tool: "fraggate_call", receipts, hookLog: createHookLog(), limitStore: journal, limit: spec, now: 10 },
    async () => {
      ran += 1;
      return { status: 200 };
    },
  );
  assert.equal(second.code, "RATE-LIMIT-BEFORE");
  assert.equal(ran, 1);
  assert.equal((await verifyPolicyChain(receipts.rows)).ok, true);
  n++;
}

// --- 4. MCP policy refresh fails closed. Stale and invalid data are not an allow ---
{
  const cache = createPolicyCache(1000);
  cache.policy = { allow: ["fraggate_call"], allow_all: true, default: "allow" };
  cache.valid = true;
  cache.fetched_at = 0;
  const failed = await refreshMcpPolicy(cache, async () => {
    throw new Error("timeout");
  }, 50);
  assert.equal(failed.code, "POLICY-REFRESH-FAILED");
  assert.equal(cache.policy, null);
  assert.equal(cache.valid, false);
  assert.equal(admitMcpPolicy(cache, "fraggate_call", 50).ok, false);
  n++;
}
{
  const cache = createPolicyCache(10);
  const loaded = await refreshMcpPolicy(cache, async () => ({ allow: ["fraggate_call"] }), 0);
  assert.equal(loaded.ok, true);
  assert.equal(cache.policy.allow_all, false);
  assert.equal(cache.policy.default, "deny");
  assert.equal(admitMcpPolicy(cache, "fraggate_call", 0).ok, true);
  assert.equal(admitMcpPolicy(cache, "fraggate_call", 10).code, "POLICY-STALE");
  assert.equal(admitMcpPolicy(cache, "other_tool", 1).code, "POLICY-DENY");
  const invalid = await refreshMcpPolicy(cache, async () => ({ allow_all: true, allow: ["fraggate_call"] }), 1);
  assert.equal(invalid.code, "POLICY-INVALID");
  assert.equal(cache.policy, null);
  assert.equal(admitMcpPolicy(cache, "fraggate_call", 1).ok, false);
  n++;
}
{
  const cache = createPolicyCache(1000);
  await refreshMcpPolicy(cache, async () => ({ allow: ["fraggate_call"] }), 0);
  const receipts = createReceiptChain();
  let ran = 0;
  const allowed = await executeGatedAction(
    { ...caller(), tool: "fraggate_call", receipts, hookLog: createHookLog(), mcpPolicy: cache, now: 0 },
    async () => {
      ran += 1;
      return { status: 200 };
    },
  );
  assert.equal(allowed.ok, true);
  assert.equal(ran, 1);
  cache.fetched_at = 0;
  cache.ttl_ms = 5;
  const stale = await executeGatedAction(
    { ...caller(), tool: "fraggate_call", receipts, hookLog: createHookLog(), mcpPolicy: cache, now: 5 },
    async () => {
      ran += 1;
      return { status: 200 };
    },
  );
  assert.equal(stale.code, "POLICY-STALE");
  assert.equal(ran, 1);
  const broken = createPolicyCache(1000);
  await refreshMcpPolicy(broken, async () => { throw new Error("down"); }, 0);
  const down = await executeGatedAction(
    { ...caller(), tool: "fraggate_call", receipts, hookLog: createHookLog(), mcpPolicy: broken, now: 0 },
    async () => {
      ran += 1;
      return { status: 200 };
    },
  );
  assert.equal(down.code, "POLICY-REFRESH-FAILED");
  assert.equal(ran, 1);
  n++;
}

// --- 5. Runtime MCP / peer manifests are untrusted until the pin and allowlist match ---
{
  const body = { id: "peer-a", version: 1, capabilities: ["read"] };
  const digest = await manifestDigest(body);
  const manifest = { ...body, digest };
  const trust = { pins: { "peer-a": digest }, allowlist: ["read"] };
  const loaded = await admitRuntimeManifest(manifest, trust);
  assert.equal(loaded.ok, true);
  assert.equal(loaded.digest, digest);
  assert.equal((await admitRuntimeManifest(manifest, { pins: {}, allowlist: ["read"] })).code, "TRUST-UNPINNED");
  assert.equal((await admitRuntimeManifest({ id: "peer-a", capabilities: ["read"] }, trust)).code, "TRUST-DRIFT");
  const drifted = { ...manifest, version: 2 };
  assert.equal((await admitRuntimeManifest(drifted, trust)).code, "TRUST-DRIFT");
  const wider = { id: "peer-a", version: 1, capabilities: ["read", "admin"] };
  const widerDigest = await manifestDigest(wider);
  assert.equal(
    (await admitRuntimeManifest({ ...wider, digest: widerDigest }, { pins: { "peer-a": widerDigest }, allowlist: ["read"] })).code,
    "TRUST-CAPABILITY",
  );
  let ran = 0;
  const refused = await executeGatedAction(
    { ...caller(), tool: "peer.load", receipts: createReceiptChain(), hookLog: createHookLog(), manifest, trust: { pins: {}, allowlist: ["read"] }, now: 0 },
    async () => {
      ran += 1;
      return { status: 200 };
    },
  );
  assert.equal(refused.code, "TRUST-UNPINNED");
  assert.equal(ran, 0);
  const admitted = await executeGatedAction(
    { ...caller(), tool: "peer.load", receipts: createReceiptChain(), hookLog: createHookLog(), manifest, trust, now: 0 },
    async () => {
      ran += 1;
      return { status: 200 };
    },
  );
  assert.equal(admitted.ok, true);
  assert.equal(ran, 1);
  n++;
}

// --- 6. Guardian refuses audit-clearing writes and seals the attempt ---
{
  const receipts = createReceiptChain();
  const first = await executeGatedAction(
    { ...caller(), tool: "fraggate_call", receipts, hookLog: createHookLog(), now: 0 },
    async () => ({ status: 200 }),
  );
  assert.equal(first.ok, true);
  const before = receipts.rows.map((row) => row.hash);
  let ran = 0;
  const cleared = await executeGatedAction(
    {
      ...caller(),
      tool: "clear_audit",
      args: { op: "clear_audit", ...caller() },
      receipts,
      hookLog: createHookLog(),
      now: 0,
    },
    async () => {
      ran += 1;
      return { status: 200 };
    },
  );
  assert.equal(cleared.code, "GUARDIAN-AUDIT-REFUSED");
  assert.equal(ran, 0);
  assert.equal(cleared.written, false);
  assert.equal((await verifyPolicyReceipt(cleared.refusal_receipt)).ok, true);
  assert.equal(receipts.rows[0].hash, before[0]);
  const wipe = await clearReceiptChain(receipts);
  assert.equal(wipe.ok, false);
  assert.equal(wipe.kept, true);
  assert.equal(receipts.rows[0].hash, before[0]);
  assert.equal(receipts.rows.at(-1).code, "GUARDIAN-AUDIT-REFUSED");
  assert.equal((await verifyPolicyChain(receipts.rows)).ok, true);
  n++;
}
{
  const store = new MemoryStore();
  const ok = await append(store, { c: "session", s: "note", f: "ordinary fact" });
  assert.equal(ok.ok, true, JSON.stringify(ok));
  const before = (await loadChain(store, "session")).length;
  for (const extra of [
    { clear_audit: true },
    { truncate_receipts: true },
    { overwrite_log: true },
    { disable_guardian: true },
    { reset_receipts: true },
    { op: "clear_audit" },
    { k: "truncate", target: "receipts" },
  ]) {
    const bad = await append(store, { c: "session", s: "audit", f: "leave the log", ...extra });
    assert.equal(bad.ok, false, JSON.stringify(extra));
    assert.equal(bad.code, "GUARDIAN-AUDIT-REFUSED");
    assert.equal(bad.written, false);
    assert.equal((await verifyPolicyReceipt(bad.refusal_receipt)).ok, true);
    const tampered = { ...bad.refusal_receipt, code: "OK" };
    assert.equal((await verifyPolicyReceipt(tampered)).ok, false);
  }
  assert.equal((await loadChain(store, "session")).length, before);
  const still = await append(store, { c: "session", s: "note", f: "second ordinary fact" });
  assert.equal(still.ok, true, JSON.stringify(still));
  assert.equal((await loadChain(store, "session")).length, before + 1);
  n++;
}

// --- Session door: refused and exec receipts carry the attribution block ---
{
  const session = await freshSession();
  await applyPolicy(session, { require_agent_attribution: true, bound_agent: { agent_id: "agent_a", issuer_kind: "agent" } }, T);
  const before = session.receipts.length;
  await assert.rejects(
    recordIntent(session, { slug: "foldlock", op: "health", payload: {}, payloadText: "{}" }, T),
    (err) => err.code === "IDENTITY-MISSING" && err.extra.executed === false,
  );
  assert.equal(session.receipts.length, before + 1);
  assert.equal(session.receipts.at(-1).event, "refused");
  assert.equal(session.receipts.at(-1).payload.agent_id, null);
  assert.equal(session.receipts.at(-1).payload.caller_identity, null);
  assert.equal(session.receipts.at(-1).payload.attribution.issuer_kind, null);
  assert.equal(session.receipts.at(-1).payload.attribution.failure, "IDENTITY-MISSING");
  assert.equal(session.exec_count, 0);
  await assert.rejects(
    recordIntent(
      session,
      { slug: "foldlock", op: "health", payload: {}, payloadText: "{}", agent_id: "agent_a", caller_identity: "harness:agent_a", issuer_kind: "harness" },
      T,
    ),
    (err) => err.code === "IDENTITY-FORGED",
  );
  assert.equal(session.receipts.at(-1).payload.attribution.issuer_kind, "harness");
  assert.equal(session.receipts.at(-1).issuer_kind, "harness");
  const { intent } = await recordIntent(
    session,
    { slug: "foldlock", op: "health", payload: {}, payloadText: "{}", ...caller() },
    T,
  );
  const exec = await sealExec(session, intent);
  assert.equal(exec.event, "exec");
  assert.equal(exec.payload.agent_id, "agent_a");
  assert.equal(exec.payload.caller_identity, "agent:agent_a");
  assert.equal(exec.payload.attribution.issuer_kind, "agent");
  assert.equal(exec.issuer_kind, "harness");
  assert.match(exec.payload.hook_tip, /^[a-f0-9]{64}$/);
  const chain = await verifyChainStrict(session.receipts);
  assert.equal(chain.ok, true, JSON.stringify(chain.errors));
  const broken = session.receipts.map((row, i) => (i === session.receipts.length - 1 ? { ...row, payload: { ...row.payload, agent_id: "other" } } : row));
  assert.equal((await verifyChainStrict(broken)).ok, false);
  const policyBefore = JSON.stringify(session.policy);
  await assert.rejects(
    applyPolicy(session, { require_agent_attribution: false }, T),
    (err) => err.code === "AGENT-ATTR-POLICY-DOWNGRADE" && err.extra.refused_receipt.sealed === true,
  );
  assert.equal(JSON.stringify(session.policy), policyBefore);
  assert.equal(session.receipts.at(-1).event, "refused");
  await assert.rejects(
    applyPolicy(session, { clear_audit: true, disable_guardian: true }, T),
    (err) => err.code === "GUARDIAN-AUDIT-REFUSED" && err.extra.written === false,
  );
  assert.equal(JSON.stringify(session.policy), policyBefore);
  assert.equal(session.receipts.at(-1).payload.attribution.failure, "GUARDIAN-AUDIT-REFUSED");
  assert.equal((await verifyChainStrict(session.receipts)).ok, true);
  n++;
}
{
  const session = await freshSession();
  await applyPolicy(
    session,
    {
      require_agent_attribution: true,
      bound_agent: { agent_id: "agent_a", issuer_kind: "agent" },
      write_ahead_limit: { key: "exec", limit: 1, windowMs: 60000, cooldownMs: 0 },
    },
    T,
  );
  session._pre_action_hooks = [{ id: "stop", order: 100, fn: async () => ({ allow: false, code: "HOOK-REFUSED" }) }];
  await assert.rejects(
    recordIntent(session, { slug: "foldlock", op: "health", payload: {}, payloadText: "{}", ...caller() }, T),
    (err) => err.code === "HOOK-REFUSED",
  );
  assert.equal(session.exec_count, 0);
  assert.equal(session._limit_journal.entries.length, 0);
  session._pre_action_hooks = [];
  const first = await recordIntent(session, { slug: "foldlock", op: "health", payload: {}, payloadText: "{}", ...caller() }, T);
  assert.ok(first.intent);
  assert.equal(session._limit_journal.entries.length, 1);
  session._limit_journal.memoryCount = 0;
  await assert.rejects(
    recordIntent(session, { slug: "foldlock", op: "health", payload: {}, payloadText: "{}", ...caller() }, T),
    (err) => err.code === "RATE-LIMIT-BEFORE" && err.extra.executed === false,
  );
  assert.equal(session.exec_count, 1);
  assert.equal(session.receipts.at(-1).event, "refused");
  assert.equal(session.receipts.at(-1).payload.agent_id, "agent_a");
  assert.equal((await verifyChainStrict(session.receipts)).ok, true, JSON.stringify((await verifyChainStrict(session.receipts)).errors));
  n++;
}

// --- MCP guard and FragGate door refuse before the tool runs ---
{
  let calls = 0;
  const forged = await guardToolCall({
    store: null,
    request: new Request("https://example.test/mcp"),
    name: "fraggate_call",
    args: { slug: "foldlock", op: "health", agent_id: "agent_a", caller_identity: "harness:agent_a", issuer_kind: "harness" },
    schemaHash: null,
    call: async () => {
      calls += 1;
      return { status: 200, text: "{}", envelope: { ok: true } };
    },
  });
  assert.equal(calls, 0);
  assert.equal(JSON.parse(forged.text).code, "IDENTITY-FORGED");
  assert.equal(forged.envelope.attribution.issuer_kind, "harness");
  const manifest = { id: "peer", capabilities: ["exec"] };
  const unpinned = await guardToolCall({
    store: null,
    request: new Request("https://example.test/mcp"),
    name: "fraggate_call",
    args: { slug: "foldlock", op: "health", ...caller(), runtime_manifest: manifest },
    schemaHash: null,
    runtimeEnv: { __aziel_runtime_trust: { pins: {}, allowlist: ["exec"] } },
    call: async () => {
      calls += 1;
      return { status: 200, text: "{}", envelope: { ok: true } };
    },
  });
  assert.equal(calls, 0);
  assert.equal(JSON.parse(unpinned.text).code, "TRUST-UNPINNED");
  const allowed = await guardToolCall({
    store: null,
    request: new Request("https://example.test/mcp"),
    name: "fraggate_call",
    args: { slug: "foldlock", op: "health", ...caller() },
    schemaHash: null,
    call: async () => {
      calls += 1;
      return { status: 200, text: JSON.stringify({ ok: true }), envelope: { ok: true } };
    },
  });
  assert.equal(calls, 1);
  assert.equal(allowed.envelope.attribution.agent_id, "agent_a");
  assert.equal(allowed.envelope.attribution.issuer_kind, "agent");
  n++;
}
{
  const cleared = await fraggateCall({ slug: "foldlock", op: "clear_audit", confirm: true, payload: {} }, null, {}, {});
  assert.equal(cleared.ok, false);
  assert.equal(cleared.code, "GUARDIAN-AUDIT-REFUSED");
  assert.equal(cleared.executed, false);
  assert.equal(cleared.written, false);
  assert.equal(cleared.attribution.agent_id, null);
  assert.equal(cleared.attribution.caller_identity, null);
  assert.equal(cleared.attribution.issuer_kind, null);
  assert.equal((await verifyPolicyReceipt(cleared.refusal_receipt)).ok, true);
  n++;
}
{
  assert.equal((await verifyHookLog(policyHookLog())).ok, true);
  n++;
}

console.log(`verify-x-reply-policy: ${n} checks`);
