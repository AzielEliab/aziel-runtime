/**
 * AZRT-X-REPLY-POLICY-1.0 — Nov 6–19 reply enforcement on the existing door.
 *
 * Six gates, one plane, fail closed. Nothing here mints a signing key, flips
 * Remain-OFF, or touches paid satellite (Cap-7 is not ICANN; paid sat stays HELD).
 *
 * 1. Agent attribution (@SiuHarry202601, @TheEdgeMasterAI). Tool-call and refused
 *    receipts hash agent_id, caller_identity, and issuer_kind. A missing or forged
 *    attribution refuses the call. The session sealer's issuer_kind stays harness
 *    (RIB-051). The caller class lives in the attribution block.
 * 2. Pre-action hooks (@iveyzen). Hooks run in (order, id) order before the action.
 *    A refusal or a throw stops the action. Decisions are an append-only hash chain.
 * 3. Write-ahead limits (@0xAlphana). The increment and any cooldown are journaled
 *    before the action returns allow. A wiped memory counter still replays the journal.
 * 4. MCP policy refresh (@RusticStack). A failed, stale, or invalid refresh refuses
 *    gated calls. The previous permissive policy is dropped. allow-all is invalid.
 * 5. Runtime MCP / peer trust (@Cipher0ps_tech). A loaded manifest needs a pinned
 *    digest and a capability subset. Unpinned and drifted manifests are refused.
 * 6. Guardian (@dipenvaja). A write that truncates, overwrites, clears, disables,
 *    or resets the audit / receipt log or guardian policy is refused and a refusal
 *    receipt is sealed. The log is left as it was.
 *
 * Author: Aziel Eliab. Identity is Aziel Eliab only.
 * SPDX-License-Identifier: Apache-2.0
 */

import { AsyncLocalStorage } from "node:async_hooks";
import { canonicalize, sha256Hex, ZERO_HASH } from "./session-core.js";

export const X_REPLY_SPEC = "AZRT-X-REPLY-POLICY-1.0";
export const AGENT_ATTR_SPEC = "AZRT-AGENT-ATTR-1.0";
export const PRE_ACTION_SPEC = "AZRT-PRE-ACTION-1.0";
export const WRITE_AHEAD_SPEC = "AZRT-WRITE-AHEAD-LIMIT-1.0";
export const MCP_POLICY_SPEC = "AZRT-MCP-POLICY-REFRESH-1.0";
export const TRUST_SPEC = "AZRT-MCP-TRUST-1.0";
export const GUARDIAN_AUDIT_SPEC = "AZRT-GUARDIAN-AUDIT-1.0";

export const DEFAULT_POLICY_TTL_MS = 60_000;

const AGENT_ID_RE = /^[a-z0-9][a-z0-9._:-]{0,79}$/;
const ISSUER_OK = new Set(["agent", "peer", "runtime"]);
const TOOL_RE = /^[a-z0-9._:-]{1,80}$/;

const AUDIT_FLAGS = Object.freeze([
  "clear_audit",
  "truncate_log",
  "truncate_receipts",
  "reset_receipts",
  "reset_log",
  "overwrite_receipts",
  "overwrite_log",
  "disable_guardian",
  "disable_audit",
  "guardian_off",
  "wipe_ledger",
  "wipe_receipts",
  "delete_receipts",
  "erase_audit",
  "drop_chain",
]);

const MUTATION_VERBS = new Set(["truncate", "overwrite", "clear", "disable", "reset", "wipe", "erase"]);
const AUDIT_TARGETS = Object.freeze([
  "audit",
  "receipt",
  "receipts",
  "guardian",
  "ledger",
  "refusals",
  "hook_log",
  "hook-log",
]);
const OP_MUTATION_RE = /^(clear|truncate|reset|wipe|overwrite|disable|erase)_(audit|receipts?|guardian|ledger|log)$/;

const screenAls = new AsyncLocalStorage();

function createReceiptChain() {
  return { spec: X_REPLY_SPEC, rows: [], tail: Promise.resolve() };
}

function createHookLog() {
  return { spec: PRE_ACTION_SPEC, rows: [], tail: Promise.resolve() };
}

let moduleReceipts = createReceiptChain();
let moduleHookLog = createHookLog();

export function policyReceipts() {
  return moduleReceipts.rows.slice();
}

export function policyHookLog() {
  return moduleHookLog.rows.slice();
}

export function resetXReplyState() {
  moduleReceipts = createReceiptChain();
  moduleHookLog = createHookLog();
}

export function createLimitJournal() {
  return { spec: WRITE_AHEAD_SPEC, entries: [], failRemaining: 0, memoryCount: null };
}

export function createPolicyCache(ttlMs = DEFAULT_POLICY_TTL_MS) {
  return {
    spec: MCP_POLICY_SPEC,
    policy: null,
    fetched_at: null,
    ttl_ms: ttlMs,
    valid: false,
    error: null,
  };
}

export function policyScreened() {
  const store = screenAls.getStore();
  return Boolean(store && store.screened);
}

export function runScreened(fn) {
  return screenAls.run({ screened: true }, fn);
}

function cmpId(a, b) {
  const x = String(a);
  const y = String(b);
  if (x < y) return -1;
  if (x > y) return 1;
  return 0;
}

function asObject(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value;
}

function fieldOrNull(value) {
  if (value == null) return null;
  const text = String(value);
  return text.length ? text : null;
}

export function readPresented(src) {
  const obj = asObject(src) || {};
  const nested = asObject(obj.attribution) || {};
  const agent_id = fieldOrNull(obj.agent_id != null ? obj.agent_id : nested.agent_id);
  const caller_identity = fieldOrNull(obj.caller_identity != null ? obj.caller_identity : nested.caller_identity);
  const issuer_kind = fieldOrNull(obj.issuer_kind != null ? obj.issuer_kind : nested.issuer_kind);
  // issuer_kind alone is the RIB-051 harness field on chainlock_append. It does not
  // open this plane. agent_id, caller_identity, or an attribution object does.
  const any = agent_id != null || caller_identity != null || asObject(obj.attribution) != null;
  return { any, agent_id, caller_identity, issuer_kind };
}

export function canonicalCallerIdentity(issuerKind, agentId) {
  return `${issuerKind}:${agentId}`;
}

/**
 * required, a bound caller, or any presented field turns attribution on.
 * A caller that mints issuer_kind=harness is forged. The canonical identity
 * is issuer_kind + ":" + agent_id. Bound sessions must match that pair.
 */
export function evaluateAttribution(presented, bound, { required = false } = {}) {
  const pin = asObject(bound);
  const must = required === true || pin != null || (presented && presented.any === true);
  if (!must) return { ok: true, required: false };
  const agent_id = presented ? presented.agent_id : null;
  const caller_identity = presented ? presented.caller_identity : null;
  const issuer_kind = presented ? presented.issuer_kind : null;
  if (issuer_kind != null && !ISSUER_OK.has(issuer_kind)) {
    return { ok: false, code: "IDENTITY-FORGED", required: true };
  }
  if (agent_id == null || caller_identity == null || issuer_kind == null) {
    return { ok: false, code: "IDENTITY-MISSING", required: true };
  }
  if (!AGENT_ID_RE.test(agent_id) || !ISSUER_OK.has(issuer_kind)) {
    return { ok: false, code: "IDENTITY-FORGED", required: true };
  }
  if (caller_identity !== canonicalCallerIdentity(issuer_kind, agent_id)) {
    return { ok: false, code: "IDENTITY-FORGED", required: true };
  }
  if (pin && (pin.agent_id !== agent_id || pin.issuer_kind !== issuer_kind)) {
    return { ok: false, code: "IDENTITY-FORGED", required: true };
  }
  return { ok: true, required: true, agent_id, caller_identity, issuer_kind };
}

export function attributionBlock(presented, verdict) {
  if (verdict && verdict.ok && verdict.required !== false && verdict.agent_id) {
    return {
      spec: AGENT_ATTR_SPEC,
      agent_id: verdict.agent_id,
      caller_identity: verdict.caller_identity,
      issuer_kind: verdict.issuer_kind,
      bound: true,
      failure: null,
    };
  }
  const src = presented || {};
  return {
    spec: AGENT_ATTR_SPEC,
    agent_id: src.agent_id ?? null,
    caller_identity: src.caller_identity ?? null,
    issuer_kind: src.issuer_kind ?? null,
    bound: false,
    failure: (verdict && verdict.code) || "IDENTITY-MISSING",
  };
}

function flagSet(obj) {
  if (!obj) return false;
  for (const flag of AUDIT_FLAGS) {
    if (obj[flag] === true) return true;
  }
  if (obj.guardian === "off" || obj.guardian_policy === "reset" || obj.audit === "clear" || obj.receipts === "truncate") {
    return true;
  }
  return false;
}

function targetIsAudit(value) {
  const text = String(value || "").trim().toLowerCase();
  if (!text) return false;
  return AUDIT_TARGETS.some((t) => text === t || text.endsWith("/" + t) || text.startsWith(t + ":"));
}

/** Structured audit-clearing write. Ordinary stamps and prose do not match. */
export function isAuditClearingWrite(src) {
  const obj = asObject(src);
  if (!obj) return false;
  if (flagSet(obj)) return true;
  const payload = asObject(obj.payload) || asObject(obj.args);
  if (flagSet(payload)) return true;
  const op = String(obj.op || obj.tool || obj.name || "").trim().toLowerCase();
  if (OP_MUTATION_RE.test(op)) return true;
  const verb = String(obj.op || obj.k || obj.kind || obj.tool || "").trim().toLowerCase();
  const target = obj.target || obj.chain || obj.c || obj.subject || obj.s || (payload && payload.target) || "";
  if (MUTATION_VERBS.has(verb) && targetIsAudit(target)) return true;
  return false;
}

async function sealNow(chain, body) {
  const prev = chain.rows.length ? chain.rows[chain.rows.length - 1].hash : ZERO_HASH;
  const unsigned = {
    spec: X_REPLY_SPEC,
    seq: chain.rows.length + 1,
    prev_hash: prev,
    event: body.event,
    code: body.code,
    agent_id: body.agent_id ?? null,
    caller_identity: body.caller_identity ?? null,
    issuer_kind: body.issuer_kind ?? null,
    bound: body.bound === true,
    failure: body.failure ?? null,
    tool: body.tool ?? null,
    hook_tip: body.hook_tip ?? null,
    limit_seq: body.limit_seq ?? null,
  };
  const hash = await sha256Hex(canonicalize(unsigned));
  const row = Object.freeze({ ...unsigned, hash });
  chain.rows.push(row);
  return row;
}

export function sealPolicyReceipt(chain, body) {
  const target = chain || moduleReceipts;
  const job = target.tail.then(() => sealNow(target, body));
  target.tail = job.then(
    () => {},
    () => {},
  );
  return job;
}

export async function verifyPolicyReceipt(row) {
  if (!row || typeof row !== "object") return { ok: false, code: "RECEIPT-MISSING" };
  const { hash, ...body } = row;
  const expected = await sha256Hex(canonicalize(body));
  if (expected !== hash) return { ok: false, code: "RECEIPT-HASH-MISMATCH", expected, got: hash || null };
  if (row.event !== "tool_call" && row.event !== "refused") return { ok: false, code: "RECEIPT-EVENT" };
  if (!Object.prototype.hasOwnProperty.call(body, "agent_id")) return { ok: false, code: "IDENTITY-MISSING" };
  if (!Object.prototype.hasOwnProperty.call(body, "caller_identity")) return { ok: false, code: "IDENTITY-MISSING" };
  if (!Object.prototype.hasOwnProperty.call(body, "issuer_kind")) return { ok: false, code: "IDENTITY-MISSING" };
  if (row.event === "tool_call") {
    if (!row.agent_id || !row.caller_identity || !row.issuer_kind) return { ok: false, code: "IDENTITY-MISSING" };
    if (!ISSUER_OK.has(row.issuer_kind)) return { ok: false, code: "IDENTITY-FORGED" };
    if (row.caller_identity !== canonicalCallerIdentity(row.issuer_kind, row.agent_id)) {
      return { ok: false, code: "IDENTITY-FORGED" };
    }
    if (row.bound !== true) return { ok: false, code: "IDENTITY-MISSING" };
  }
  return { ok: true, hash };
}

export async function verifyPolicyChain(rows) {
  let prev = ZERO_HASH;
  const list = rows || [];
  for (const row of list) {
    if (!row || row.prev_hash !== prev) return { ok: false, code: "CHAIN-BREAK", seq: row && row.seq };
    const verdict = await verifyPolicyReceipt(row);
    if (!verdict.ok) return verdict;
    prev = row.hash;
  }
  return { ok: true, count: list.length, head: list.length ? list[list.length - 1].hash : ZERO_HASH };
}

async function appendHookNow(log, fields) {
  const prev = log.rows.length ? log.rows[log.rows.length - 1].hash : ZERO_HASH;
  const unsigned = {
    spec: PRE_ACTION_SPEC,
    seq: log.rows.length + 1,
    prev_hash: prev,
    hook_id: String(fields.hook_id || ""),
    allow: fields.allow === true,
    code: String(fields.code || (fields.allow === true ? "HOOK-ALLOW" : "HOOK-REFUSED")),
  };
  const hash = await sha256Hex(canonicalize(unsigned));
  const row = Object.freeze({ ...unsigned, hash });
  log.rows.push(row);
  return row;
}

export function appendHookRecord(log, fields) {
  const target = log || moduleHookLog;
  const job = target.tail.then(() => appendHookNow(target, fields));
  target.tail = job.then(
    () => {},
    () => {},
  );
  return job;
}

export async function verifyHookLog(rows) {
  let prev = ZERO_HASH;
  const list = rows || [];
  for (const row of list) {
    if (!row || row.prev_hash !== prev) return { ok: false, code: "HOOK-CHAIN-BREAK", seq: row && row.seq };
    const { hash, ...body } = row;
    const expected = await sha256Hex(canonicalize(body));
    if (expected !== hash) return { ok: false, code: "HOOK-HASH-MISMATCH", seq: row.seq, expected, got: hash || null };
    prev = row.hash;
  }
  return { ok: true, count: list.length, head: list.length ? list[list.length - 1].hash : ZERO_HASH };
}

/** The hook log has no rewrite, truncate, or clear. The rows stay. */
export function rewriteHookRecord() {
  return {
    ok: false,
    code: "HOOK-LOG-IMMUTABLE",
    written: false,
    spec: PRE_ACTION_SPEC,
    message: "Hook decisions are append-only. The recorded row was left unchanged.",
  };
}

export async function clearHookLog(log) {
  const target = log || moduleHookLog;
  const before = target.rows.length;
  const receipt = await sealPolicyReceipt(moduleReceipts, {
    event: "refused",
    code: "GUARDIAN-AUDIT-REFUSED",
    agent_id: null,
    caller_identity: null,
    issuer_kind: null,
    bound: false,
    failure: "GUARDIAN-AUDIT-REFUSED",
    tool: "hook_log",
    hook_tip: before ? target.rows[before - 1].hash : null,
  });
  return {
    ok: false,
    code: "GUARDIAN-AUDIT-REFUSED",
    written: false,
    spec: GUARDIAN_AUDIT_SPEC,
    rows: before,
    refusal_receipt: receipt,
    message: "Guardian refuses a clear of the hook decision log. The log was left unchanged.",
  };
}

export async function clearReceiptChain(chain) {
  const target = chain || moduleReceipts;
  const before = target.rows.map((row) => row.hash);
  const receipt = await sealPolicyReceipt(target, {
    event: "refused",
    code: "GUARDIAN-AUDIT-REFUSED",
    agent_id: null,
    caller_identity: null,
    issuer_kind: null,
    bound: false,
    failure: "GUARDIAN-AUDIT-REFUSED",
    tool: "receipts",
  });
  const kept = target.rows.slice(0, before.length).every((row, i) => row.hash === before[i]);
  return {
    ok: false,
    code: "GUARDIAN-AUDIT-REFUSED",
    written: false,
    spec: GUARDIAN_AUDIT_SPEC,
    kept,
    refusal_receipt: receipt,
    message: "Guardian refuses a clear of the receipt chain. Earlier receipts were left unchanged.",
  };
}

export function replayLimit(journal, key, now, windowMs) {
  let count = 0;
  let cooldown_until = null;
  const entries = journal && Array.isArray(journal.entries) ? journal.entries : [];
  for (const entry of entries) {
    if (!entry || entry.key !== key) continue;
    if (entry.type === "increment" && Number(now) - Number(entry.at) < Number(windowMs)) count += 1;
    if (entry.type === "cooldown") cooldown_until = Number(entry.until);
  }
  return { count, cooldown_until };
}

/**
 * Journal the slot (and cooldown, when one is set) before allow.
 * memoryCount is ignored so a wiped cache cannot reopen the window.
 * failRemaining simulates a persistence error and writes nothing.
 */
export async function persistLimitBeforeAction(journal, spec, now) {
  const store = journal || createLimitJournal();
  const key = spec && spec.key != null ? String(spec.key) : "";
  const limit = Number(spec && spec.limit);
  const windowMs = Number(spec && spec.windowMs);
  const cooldownMs = Number(spec && spec.cooldownMs) || 0;
  if (!key || !Number.isFinite(limit) || limit < 1 || !Number.isFinite(windowMs) || windowMs < 1) {
    return { ok: false, code: "LIMIT-PERSIST-FAILED", fail_closed: true, persisted: false, executed: false, spec: WRITE_AHEAD_SPEC };
  }
  if (store.failRemaining > 0) {
    store.failRemaining -= 1;
    return { ok: false, code: "LIMIT-PERSIST-FAILED", fail_closed: true, persisted: false, executed: false, spec: WRITE_AHEAD_SPEC };
  }
  const state = replayLimit(store, key, now, windowMs);
  if (state.cooldown_until != null && Number.isFinite(state.cooldown_until) && Number(now) < state.cooldown_until) {
    return {
      ok: false,
      code: "COOLDOWN-ACTIVE",
      fail_closed: true,
      persisted: true,
      executed: false,
      spec: WRITE_AHEAD_SPEC,
      retry_after_ms: state.cooldown_until - Number(now),
    };
  }
  if (state.count >= limit) {
    const until = Number(now) + Math.max(cooldownMs, windowMs);
    store.entries.push({ type: "cooldown", key, until, at: Number(now) });
    return { ok: false, code: "RATE-LIMIT-BEFORE", fail_closed: true, persisted: true, executed: false, spec: WRITE_AHEAD_SPEC, count: state.count };
  }
  store.entries.push({ type: "increment", key, at: Number(now), window_ms: windowMs });
  if (cooldownMs > 0) store.entries.push({ type: "cooldown", key, until: Number(now) + cooldownMs, at: Number(now) });
  return {
    ok: true,
    code: "LIMIT-PERSISTED",
    spec: WRITE_AHEAD_SPEC,
    persisted: true,
    count: state.count + 1,
    seq: store.entries.length,
  };
}

export function validateMcpPolicy(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return { ok: false, code: "POLICY-INVALID" };
  if (raw.allow_all === true || raw.default === "allow") return { ok: false, code: "POLICY-INVALID" };
  if (!Array.isArray(raw.allow) || raw.allow.length < 1) return { ok: false, code: "POLICY-INVALID" };
  if (!raw.allow.every((tool) => typeof tool === "string" && TOOL_RE.test(tool))) return { ok: false, code: "POLICY-INVALID" };
  return {
    ok: true,
    policy: {
      spec: MCP_POLICY_SPEC,
      allow: raw.allow.slice().sort(),
      default: "deny",
      allow_all: false,
    },
  };
}

export async function refreshMcpPolicy(cache, fetcher, now) {
  const slot = cache || createPolicyCache();
  let raw;
  try {
    raw = await fetcher();
  } catch {
    slot.valid = false;
    slot.policy = null;
    slot.fetched_at = null;
    slot.error = "POLICY-REFRESH-FAILED";
    return { ok: false, code: "POLICY-REFRESH-FAILED", fail_closed: true, spec: MCP_POLICY_SPEC };
  }
  const parsed = validateMcpPolicy(raw);
  if (!parsed.ok) {
    slot.valid = false;
    slot.policy = null;
    slot.fetched_at = null;
    slot.error = parsed.code;
    return { ok: false, code: parsed.code, fail_closed: true, spec: MCP_POLICY_SPEC };
  }
  slot.policy = parsed.policy;
  slot.fetched_at = Number(now);
  slot.valid = true;
  slot.error = null;
  if (!Number.isFinite(slot.ttl_ms) || slot.ttl_ms < 1) slot.ttl_ms = DEFAULT_POLICY_TTL_MS;
  return { ok: true, policy: slot.policy, spec: MCP_POLICY_SPEC };
}

export function admitMcpPolicy(cache, tool, now) {
  if (!cache || cache.valid !== true || !cache.policy || cache.policy.allow_all === true) {
    return {
      ok: false,
      code: cache && cache.error ? cache.error : "POLICY-UNAVAILABLE",
      fail_closed: true,
      spec: MCP_POLICY_SPEC,
    };
  }
  const ttl = Number.isFinite(cache.ttl_ms) ? cache.ttl_ms : DEFAULT_POLICY_TTL_MS;
  const age = Number(now) - Number(cache.fetched_at);
  if (!Number.isFinite(cache.fetched_at) || age >= ttl) {
    return { ok: false, code: "POLICY-STALE", fail_closed: true, spec: MCP_POLICY_SPEC };
  }
  const name = String(tool || "");
  if (!cache.policy.allow.includes(name)) {
    return { ok: false, code: "POLICY-DENY", fail_closed: true, spec: MCP_POLICY_SPEC };
  }
  return { ok: true, spec: MCP_POLICY_SPEC, tool: name };
}

export async function manifestDigest(manifest) {
  const src = asObject(manifest) || {};
  const rest = {};
  for (const key of Object.keys(src).sort()) {
    if (key === "digest" || key === "signature") continue;
    rest[key] = src[key];
  }
  return sha256Hex(canonicalize(rest));
}

export async function admitRuntimeManifest(manifest, { pins = {}, allowlist = [] } = {}) {
  const src = asObject(manifest);
  if (!src) return { ok: false, code: "TRUST-UNPINNED", fail_closed: true, spec: TRUST_SPEC };
  const id = typeof src.id === "string" ? src.id : "";
  const pin = id && pins && Object.prototype.hasOwnProperty.call(pins, id) ? pins[id] : null;
  if (!id || typeof pin !== "string" || !/^[a-f0-9]{64}$/.test(pin)) {
    return { ok: false, code: "TRUST-UNPINNED", fail_closed: true, spec: TRUST_SPEC };
  }
  const digest = await manifestDigest(src);
  if (src.digest !== digest || pin !== digest) {
    return { ok: false, code: "TRUST-DRIFT", fail_closed: true, spec: TRUST_SPEC, digest };
  }
  if (!Array.isArray(src.capabilities)) {
    return { ok: false, code: "TRUST-CAPABILITY", fail_closed: true, spec: TRUST_SPEC };
  }
  const allow = new Set(allowlist);
  if (src.capabilities.some((cap) => typeof cap !== "string" || !allow.has(cap))) {
    return { ok: false, code: "TRUST-CAPABILITY", fail_closed: true, spec: TRUST_SPEC };
  }
  return { ok: true, spec: TRUST_SPEC, id, digest, capabilities: src.capabilities.slice() };
}

export async function loadRuntimeMcp(manifest, trust) {
  const admitted = await admitRuntimeManifest(manifest, trust || {});
  if (!admitted.ok) return { ...admitted, loaded: false, tool: null };
  return {
    ok: true,
    loaded: true,
    spec: TRUST_SPEC,
    tool: {
      id: admitted.id,
      digest: admitted.digest,
      capabilities: admitted.capabilities,
      trusted: true,
    },
  };
}

function hookTipOf(log) {
  if (!log || !log.rows.length) return null;
  return log.rows[log.rows.length - 1].hash;
}

function statusFor(code) {
  if (code === "RATE-LIMIT-BEFORE" || code === "COOLDOWN-ACTIVE") return 429;
  if (code === "LIMIT-PERSIST-FAILED") return 503;
  return 403;
}

function messageFor(code) {
  switch (code) {
    case "IDENTITY-MISSING":
      return "Tool calls require agent_id, caller_identity, and issuer_kind inside the receipt. The call was refused.";
    case "IDENTITY-FORGED":
      return "Caller identity does not match the bound agent, the canonical issuer:agent_id form, or a caller-minted issuer kind. The call was refused.";
    case "HOOK-REFUSED":
      return "A pre-action hook refused this call. Nothing ran.";
    case "HOOK-ERROR":
      return "A pre-action hook failed. Nothing ran.";
    case "HOOK-LOG-IMMUTABLE":
      return "Hook decisions are append-only.";
    case "LIMIT-PERSIST-FAILED":
      return "The rate-limit journal did not persist. The action was refused.";
    case "RATE-LIMIT-BEFORE":
      return "The rate-limit journal already holds this window. The action was refused.";
    case "COOLDOWN-ACTIVE":
      return "A cooldown is already journaled for this key. The action was refused.";
    case "POLICY-REFRESH-FAILED":
      return "MCP policy refresh failed. Gated calls are refused.";
    case "POLICY-INVALID":
      return "MCP policy data is invalid. allow-all is refused. Gated calls are refused.";
    case "POLICY-STALE":
      return "MCP policy is past its TTL. The stale copy is not used. Gated calls are refused.";
    case "POLICY-UNAVAILABLE":
      return "MCP policy is not available. Gated calls are refused.";
    case "POLICY-DENY":
      return "MCP policy does not list this tool. The call was refused.";
    case "TRUST-UNPINNED":
      return "Runtime-loaded MCP and peer manifests are untrusted until a digest pin matches. The load was refused.";
    case "TRUST-DRIFT":
      return "The runtime manifest digest does not match the pin. The load was refused.";
    case "TRUST-CAPABILITY":
      return "The runtime manifest asks for a capability outside the allowlist. The load was refused.";
    case "GUARDIAN-AUDIT-REFUSED":
      return "Guardian refuses writes that truncate, overwrite, clear, disable, or reset the audit log, receipt log, or guardian policy. Nothing was written.";
    case "AGENT-ATTR-POLICY-DOWNGRADE":
      return "Agent attribution stays on for this session. Open a new session to change it.";
    default:
      return "The policy plane refused this call. Nothing ran.";
  }
}

async function refuseSealed(ctx, code, presented, verdict) {
  const block = attributionBlock(presented, verdict && verdict.code ? verdict : { code, ok: false });
  const chain = ctx.receipts || moduleReceipts;
  const receipt = await sealPolicyReceipt(chain, {
    event: "refused",
    code,
    agent_id: block.agent_id,
    caller_identity: block.caller_identity,
    issuer_kind: block.issuer_kind,
    bound: false,
    failure: block.failure || code,
    tool: ctx.tool || ctx.name || null,
    hook_tip: hookTipOf(ctx.hookLog),
    limit_seq: null,
  });
  return {
    ok: false,
    engaged: true,
    code,
    status: statusFor(code),
    message: messageFor(code),
    fail_closed: true,
    executed: false,
    written: false,
    attribution: block,
    refusal_receipt: receipt,
    hook_tip: hookTipOf(ctx.hookLog),
    envelope: {
      ok: false,
      code,
      message: messageFor(code),
      fail_closed: true,
      executed: false,
      written: false,
      spec: X_REPLY_SPEC,
      attribution: block,
      refusal_receipt: receipt,
    },
  };
}

export async function runPreActionHooks(hooks, ctx, log) {
  const target = log || moduleHookLog;
  const list = (hooks || []).map((hook, index) => ({ ...hook, _i: index }));
  list.sort((a, b) => (Number(a.order) || 0) - (Number(b.order) || 0) || cmpId(a.id, b.id) || a._i - b._i);
  for (const hook of list) {
    let decision;
    try {
      decision = await hook.fn(ctx);
    } catch {
      decision = { allow: false, code: "HOOK-ERROR" };
    }
    const allow = Boolean(decision && decision.allow === true);
    const code = allow ? "HOOK-ALLOW" : (decision && decision.code) || "HOOK-REFUSED";
    await appendHookRecord(target, { hook_id: hook.id || "hook", allow, code });
    if (!allow) return { ok: false, code, hook_id: hook.id || "hook" };
  }
  return { ok: true, hook_tip: hookTipOf(target) };
}

function builtinHooks(ctx) {
  return [
    {
      id: "guardian",
      order: 10,
      fn: async () => (isAuditClearingWrite(ctx) || isAuditClearingWrite(ctx.args) || isAuditClearingWrite(ctx.action) ? { allow: false, code: "GUARDIAN-AUDIT-REFUSED" } : { allow: true }),
    },
    {
      id: "identity",
      order: 20,
      fn: async () => {
        const verdict = evaluateAttribution(ctx.presented, ctx.bound, { required: ctx.requireAttribution === true });
        if (!verdict.ok) return { allow: false, code: verdict.code };
        return { allow: true };
      },
    },
    {
      id: "trust",
      order: 30,
      fn: async () => {
        if (!ctx.manifest) return { allow: true };
        const trust = await admitRuntimeManifest(ctx.manifest, ctx.trust || {});
        return trust.ok ? { allow: true } : { allow: false, code: trust.code };
      },
    },
    {
      id: "mcp-policy",
      order: 40,
      fn: async () => {
        if (!ctx.mcpPolicy) return { allow: true };
        const admit = admitMcpPolicy(ctx.mcpPolicy, ctx.tool, ctx.now);
        return admit.ok ? { allow: true } : { allow: false, code: admit.code };
      },
    },
  ];
}

function planeFrom(ctx) {
  const args = asObject(ctx.args) || {};
  const session = ctx.session;
  const policy = session && asObject(session.policy) ? session.policy : {};
  const env = asObject(ctx.env) || {};
  const fromArgs = readPresented(args);
  const presented = fromArgs.any ? fromArgs : readPresented(ctx);
  const bound = asObject(ctx.bound) || asObject(policy.bound_agent) || null;
  const requireAttribution = ctx.requireAttribution === true || policy.require_agent_attribution === true || env.__aziel_require_attribution === true || presented.any || bound != null;
  const manifest = ctx.manifest || args.runtime_manifest || args.peer_manifest || null;
  const mcpPolicy = ctx.mcpPolicy || env.__aziel_mcp_policy || session && session._mcp_policy || null;
  const limit = ctx.limit || env.__aziel_write_ahead_limit || policy.write_ahead_limit || null;
  const limitStore = ctx.limitStore || env.__aziel_limit_journal || (session && session._limit_journal) || null;
  const userHooks = ctx.hooks || env.__aziel_pre_action_hooks || (session && session._pre_action_hooks) || [];
  const audit = isAuditClearingWrite(ctx) || isAuditClearingWrite(args) || isAuditClearingWrite(ctx.action) || isAuditClearingWrite({ op: args.op, tool: ctx.name || ctx.tool, payload: args.payload });
  const engaged = Boolean(requireAttribution || manifest || mcpPolicy || (limit && limitStore) || (userHooks && userHooks.length) || audit || ctx.force === true);
  return { presented, bound, requireAttribution, manifest, mcpPolicy, limit, limitStore, userHooks: userHooks || [], audit, engaged };
}

/**
 * Gates only. The caller runs the action after ok. Write-ahead persistence
 * finishes before this returns ok, so a crash after the return still counts.
 */
export async function preExecScreen(input = {}) {
  const ctx = {
    ...input,
    tool: input.tool || input.name || null,
    now: input.now == null ? Date.now() : Number(input.now),
    hookLog: input.hookLog || moduleHookLog,
    receipts: input.receipts || moduleReceipts,
  };
  const plane = planeFrom(ctx);
  ctx.presented = plane.presented;
  ctx.bound = plane.bound;
  ctx.requireAttribution = plane.requireAttribution;
  ctx.manifest = plane.manifest;
  ctx.mcpPolicy = plane.mcpPolicy;
  ctx.trust = input.trust || (input.env && input.env.__aziel_runtime_trust) || (input.session && input.session._runtime_trust) || {};
  if (!plane.engaged) return { ok: true, engaged: false };
  if (plane.audit) return refuseSealed(ctx, "GUARDIAN-AUDIT-REFUSED", plane.presented, { ok: false, code: "GUARDIAN-AUDIT-REFUSED" });
  const verdict = evaluateAttribution(plane.presented, plane.bound, { required: plane.requireAttribution });
  if (!verdict.ok) return refuseSealed(ctx, verdict.code, plane.presented, verdict);
  if (plane.manifest) {
    const trust = await admitRuntimeManifest(plane.manifest, ctx.trust || {});
    if (!trust.ok) return refuseSealed(ctx, trust.code, plane.presented, verdict);
  }
  if (plane.mcpPolicy) {
    const admit = admitMcpPolicy(plane.mcpPolicy, ctx.tool, ctx.now);
    if (!admit.ok) return refuseSealed(ctx, admit.code, plane.presented, verdict);
  }
  const hooks = builtinHooks(ctx).concat(
    plane.userHooks.map((hook) => ({ ...hook, order: hook.order == null ? 100 : hook.order })),
  );
  const ran = await runPreActionHooks(hooks, ctx, ctx.hookLog);
  if (!ran.ok) return refuseSealed(ctx, ran.code, plane.presented, verdict);
  if (plane.limit) {
    if (!plane.limitStore) return refuseSealed(ctx, "LIMIT-PERSIST-FAILED", plane.presented, verdict);
    const persisted = await persistLimitBeforeAction(plane.limitStore, plane.limit, ctx.now);
    if (!persisted.ok) return refuseSealed(ctx, persisted.code, plane.presented, verdict);
  }
  const attribution = attributionBlock(plane.presented, verdict);
  return {
    ok: true,
    engaged: true,
    code: "OK",
    attribution,
    hook_tip: hookTipOf(ctx.hookLog),
    executed: false,
  };
}

export async function executeGatedAction(ctx, action) {
  const input = { ...ctx, force: true, requireAttribution: ctx.requireAttribution !== false };
  const screen = await preExecScreen(input);
  if (!screen.ok) return { ...screen, result: null };
  let result;
  try {
    result = await action();
  } catch {
    const presented = readPresented(input.args || input);
    const verdict = evaluateAttribution(presented, input.bound || null, { required: true });
    const refused = await refuseSealed(
      { ...input, hookLog: input.hookLog || moduleHookLog, receipts: input.receipts || moduleReceipts, tool: input.tool || input.name || null },
      "ACTION-ERROR",
      presented,
      verdict.ok ? { ...verdict, code: "ACTION-ERROR" } : verdict,
    );
    return { ...refused, result: null };
  }
  const block = screen.attribution;
  const chain = input.receipts || moduleReceipts;
  const receipt = await sealPolicyReceipt(chain, {
    event: "tool_call",
    code: "OK",
    agent_id: block.agent_id,
    caller_identity: block.caller_identity,
    issuer_kind: block.issuer_kind,
    bound: true,
    failure: null,
    tool: input.tool || input.name || null,
    hook_tip: screen.hook_tip,
    limit_seq: input.limitStore && input.limitStore.entries ? input.limitStore.entries.length : null,
  });
  return {
    ok: true,
    engaged: true,
    executed: true,
    code: "OK",
    result,
    receipt,
    attribution: block,
    hook_tip: screen.hook_tip,
  };
}

export async function sealGuardianRefusal(src) {
  const presented = readPresented(src);
  const verdict = evaluateAttribution(presented, null, { required: presented.any });
  const block = attributionBlock(presented, verdict.ok ? { ok: false, code: "GUARDIAN-AUDIT-REFUSED" } : verdict);
  return sealPolicyReceipt(moduleReceipts, {
    event: "refused",
    code: "GUARDIAN-AUDIT-REFUSED",
    agent_id: block.agent_id,
    caller_identity: block.caller_identity,
    issuer_kind: block.issuer_kind,
    bound: false,
    failure: block.failure || "GUARDIAN-AUDIT-REFUSED",
    tool: "chainlock_append",
    hook_tip: null,
    limit_seq: null,
  });
}

export function validBoundAgent(raw) {
  const src = asObject(raw);
  if (!src) return null;
  if (typeof src.agent_id !== "string" || !AGENT_ID_RE.test(src.agent_id)) return null;
  if (!ISSUER_OK.has(src.issuer_kind)) return null;
  return { agent_id: src.agent_id, issuer_kind: src.issuer_kind };
}

export { createHookLog, createReceiptChain };
