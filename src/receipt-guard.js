/**
 * Receipt guard: AZRT-REFUSAL-RECEIPT-1.0 (RIB-018), AZRT-GOAL-LINK-1.0 (@asmirkn x2),
 * AZRT-SCHEMA-PIN-1.0 (RIB-019), AZRT-CONTEXT-HASH-1.0 (RIB-020).
 *
 * - Every policy refusal at the MCP door (MCP-CONFIRM-REQUIRED, FG-*, MESH-*, SCHEMA-DRIFT, ...)
 *   mints its own sealed stamp on the internal ChainLock chain "refusals" (dual lattice, DO,
 *   append-only). The refuse envelope is unchanged except for an added `refusal_receipt`.
 * - A goal key (caller `goal_id`, else derived from the MCP session id) leaves a pointer; the next
 *   action on that goal through ANY tool is sealed as a `follow` stamp that names the refusal, and a
 *   repeated refusal names the one before it. Retries chain to the refusal, not to the call shape.
 * - schema_hash pins the tools/list schema; a caller pin that no longer matches refuses SCHEMA-DRIFT.
 * - context_hash / node_ids seal what the agent says it read and which nodes were involved.
 *
 * Additive only: no existing refuse code, field or hash input changes. Fail-soft on the receipt
 * write (a refusal never turns into success); the envelope reports `refusal_receipt.sealed:false`.
 * Author: Aziel Eliab. Identity is Aziel Eliab only.
 * SPDX-License-Identifier: Apache-2.0
 */

import { AsyncLocalStorage } from "node:async_hooks";
import { canonicalize, sha256Hex } from "./session-core.js";

export const REFUSAL_SPEC = "AZRT-REFUSAL-RECEIPT-1.0";
export const GOAL_SPEC = "AZRT-GOAL-LINK-1.0";
export const SCHEMA_PIN_SPEC = "AZRT-SCHEMA-PIN-1.0";
export const CONTEXT_SPEC = "AZRT-CONTEXT-HASH-1.0";
export const REFUSAL_CHAIN = "refusals";
export const SCHEMA_DRIFT = "SCHEMA-DRIFT";
export const GOAL_TTL_MS = 60 * 60 * 1000;
export const CONTEXT_REFS_MAX = 64;
export const CONTEXT_REF_BYTES = 512;
export const NODE_IDS_MAX = 8;
export const SELF_NODE = "aziel-runtime";
const GOAL_RE = /^[A-Za-z0-9._:-]{1,80}$/;
const NODE_RE = /^[a-z0-9._-]{1,80}$/;
const HEX64 = /^[a-f0-9]{64}$/;

/** Arg names this layer reads; FragGate strips them from engine payloads. */
export const GUARD_ARG_KEYS = Object.freeze(["goal_id", "context_refs", "context_hash", "node_ids", "schema_hash"]);

const metaAls = new AsyncLocalStorage();
let schemaHashNow = null;

/** Set once per isolate by the Worker from the live tools/list. */
export function setCurrentSchemaHash(h) {
  if (typeof h === "string" && HEX64.test(h)) schemaHashNow = h;
}

export function currentSchemaHash() {
  return schemaHashNow;
}

export const EXPECT_SPEC = "AZRT-EXPECT-SPEC-1.0";
export const EXPECT_BYTES = 2048;

/**
 * RIB-013: expected-state spec + verdict criteria sealed into the open receipt (stamp #1) before
 * anything runs. Returns null when absent, {ok:false} when malformed (refused, nothing opened).
 */
export async function expectSpecOf(raw) {
  if (raw == null) return null;
  const bad = (message) => ({ ok: false, code: "EXPECT-SPEC-INVALID", spec: EXPECT_SPEC, message, executed: false });
  if (typeof raw !== "object" || Array.isArray(raw)) return bad("expect must be an object { spec, verdict_criteria }.");
  if (raw.spec == null || raw.verdict_criteria == null) return bad("expect needs both spec (expected state) and verdict_criteria.");
  let text;
  try {
    text = canonicalize({ spec: raw.spec, verdict_criteria: raw.verdict_criteria, ...(raw.world_version != null ? { world_version: raw.world_version } : {}) });
  } catch {
    return bad("expect must be plain JSON.");
  }
  if (!text || text.length > EXPECT_BYTES) return bad(`expect must be at most ${EXPECT_BYTES} bytes as canonical JSON.`);
  const expect = JSON.parse(text);
  return { ok: true, expect, expect_hash: await sha256Hex(canonicalize({ spec: EXPECT_SPEC, expect })) };
}

/** Close-time verdict against the sealed criteria (caller's claim, sealed; not computed by the runtime). */
export function verdictOf(raw) {
  if (raw == null) return null;
  const bad = (message) => ({ ok: false, code: "EXPECT-VERDICT-INVALID", spec: EXPECT_SPEC, message });
  if (typeof raw !== "object" || Array.isArray(raw) || typeof raw.pass !== "boolean") return bad("verdict must be { pass: boolean, notes?: string }.");
  const notes = raw.notes == null ? null : String(raw.notes).slice(0, 500);
  return { ok: true, verdict: { spec: EXPECT_SPEC, pass: raw.pass, notes, claimed_by: "caller", computed_by_runtime: false } };
}

export function runWithCallMeta(meta, fn) {
  return metaAls.run(meta || {}, fn);
}

/** Additive ledger fields for the current call (goal_key, context_hash, node_ids, schema_hash). */
export function callMetaLedgerFields() {
  const m = metaAls.getStore();
  if (!m) return {};
  const out = {};
  if (m.goal_key) out.goal_key = m.goal_key;
  if (m.context && m.context.context_hash) {
    out.context_hash = m.context.context_hash;
    out.node_ids = m.context.node_ids;
  }
  if (m.schema_hash) out.schema_hash = m.schema_hash;
  return out;
}

export async function goalKeyOf(args, request) {
  const raw = args && typeof args.goal_id === "string" ? args.goal_id.trim() : "";
  // RIB-018 follow-up: the caller's goal_id never lands on the permanent chain as text. The key is
  // goal:<sha256(goal_id) hex[:16]>; the same goal_id always gives the same key, so links still resolve.
  if (raw && GOAL_RE.test(raw)) return { key: "goal:" + (await sha256Hex(raw)).slice(0, 16), source: "caller" };
  const sid = request && request.headers ? String(request.headers.get("mcp-session-id") || "").trim() : "";
  if (sid) return { key: "mcp:" + (await sha256Hex("mcp-session:" + sid)).slice(0, 32), source: "mcp-session" };
  return null;
}

export function badGoalId(args) {
  const raw = args && args.goal_id;
  if (raw == null) return null;
  return typeof raw === "string" && GOAL_RE.test(raw.trim()) ? null : "goal_id must be 1-80 chars of [A-Za-z0-9._:-].";
}

/** RIB-020: hash of what the agent read + node ids. Null when the caller sent nothing. */
export async function contextOf(args) {
  const src = args && typeof args === "object" ? args : {};
  let refs = null;
  if (Array.isArray(src.context_refs)) {
    refs = [...new Set(src.context_refs.filter((r) => typeof r === "string" && r.length && r.length <= CONTEXT_REF_BYTES))].sort().slice(0, CONTEXT_REFS_MAX);
  }
  const given = typeof src.context_hash === "string" && HEX64.test(src.context_hash) ? src.context_hash : null;
  if (!refs?.length && !given) return null;
  const nodes = Array.isArray(src.node_ids) ? src.node_ids.filter((n) => typeof n === "string" && NODE_RE.test(n)).slice(0, NODE_IDS_MAX) : [];
  const node_ids = [...new Set([SELF_NODE, ...nodes])];
  const context_hash = refs?.length ? await sha256Hex(canonicalize({ spec: CONTEXT_SPEC, refs })) : given;
  return { spec: CONTEXT_SPEC, context_hash, context_n: refs ? refs.length : null, source: refs?.length ? "refs" : "caller-hash", node_ids };
}

export async function schemaHashOf(tools) {
  return sha256Hex(canonicalize({ spec: SCHEMA_PIN_SPEC, tools }));
}

/** RIB-019: a caller pin that no longer matches the live tools/list schema. */
export function schemaDrift(args, current) {
  const pin = args && typeof args.schema_hash === "string" ? args.schema_hash.trim().toLowerCase() : "";
  if (!pin) return null;
  if (pin === current) return null;
  return {
    ok: false,
    code: SCHEMA_DRIFT,
    door: "fraggate",
    spec: SCHEMA_PIN_SPEC,
    message: "The tools/list schema changed since you pinned it. Nothing ran. Re-read tools/list, check the tool you meant still means the same thing, then retry with the new schema_hash.",
    pinned_schema_hash: HEX64.test(pin) ? pin : null,
    current_schema_hash: current,
    result: null,
    executed: false,
  };
}

function argsDigestSource(args) {
  const out = {};
  for (const [k, v] of Object.entries(args && typeof args === "object" ? args : {})) {
    if (k === "confirm" || k === "dry_run") continue;
    out[k] = v;
  }
  return out;
}

export async function argsDigest(args) {
  try {
    return await sha256Hex(canonicalize(argsDigestSource(args)));
  } catch {
    return null;
  }
}

/** Parse the envelope a tool call returned (object or JSON text). */
export function envelopeOf(out) {
  if (out && out.envelope && typeof out.envelope === "object") return out.envelope;
  if (out && typeof out.text === "string") {
    try {
      const parsed = JSON.parse(out.text);
      return parsed && typeof parsed === "object" ? parsed : null;
    } catch {
      return null;
    }
  }
  return null;
}

/** A policy refusal: ok:false with a stable refuse code (not a transport error, not a crash). */
export function refusalCodeOf(env, out = null) {
  if (!env) return null;
  const failed = env.ok === false || Number(env.status) >= 400 || Number(out && out.status) >= 400;
  if (!failed) return null;
  const code = typeof env.code === "string" ? env.code : null;
  if (!code || code === "FG-OK" || code === "FG-DNS" || code === "FG-NET") return null;
  return /^[A-Z0-9][A-Z0-9-]{1,63}$/.test(code) ? code : null;
}

async function goalPointer(store, key) {
  if (!store || !key) return null;
  if (typeof store.goalPointer === "function") {
    const got = await store.goalPointer(REFUSAL_CHAIN, key);
    return got && got.pointer ? got.pointer : null;
  }
  // In-memory / KV fallback (tests): scan the chain for the newest stamp with this goal key.
  const { loadChain } = await import("./chainlock/ops.js");
  const rows = await loadChain(store, REFUSAL_CHAIN);
  for (let i = rows.length - 1; i >= 0; i--) {
    const r = rows[i];
    if (r && r.goal_key === key && (r.k === "refusal" || r.k === "follow")) return { seq: i + 1, h: r.stamp_sha256, k: r.k, t: r.t, open: r.k === "refusal" };
  }
  return null;
}

export async function openRefusalFor(store, key, now = Date.now()) {
  const p = await goalPointer(store, key);
  if (!p || !p.h) return null;
  const age = now - Date.parse(p.t || 0);
  if (!(age >= 0 && age <= GOAL_TTL_MS)) return null;
  return p;
}

function clipText(s, n) {
  const t = String(s || "");
  return t.length > n ? t.slice(0, n) : t;
}

async function appendInternal(store, input) {
  const { append } = await import("./chainlock/ops.js");
  return append(store, input, { internal: true });
}

/** RIB-018 follow-up: caller node ids are stored hashed on refusal-chain stamps (SELF_NODE stays literal). */
export async function boundedNodeIds(ids) {
  if (!Array.isArray(ids)) return ids;
  const out = [];
  for (const n of ids) out.push(n === SELF_NODE ? n : "n:" + (await sha256Hex(String(n))).slice(0, 16));
  return out;
}

/** RIB-018 follow-up: per-isolate cap on MCP/FragGate-door refusal seals (the REST doors cap per door). */
export const MCP_SEAL_CAP_PER_MIN = 60;
const mcpCap = { minute: -1, n: 0 };
export function _resetMcpSealCap() { mcpCap.minute = -1; mcpCap.n = 0; }

/**
 * RIB-018 follow-up: caller-typed slug/op never land on the permanent chain as text. A slug that is not in
 * the FragGate registry, or an op that is not one of its ops, is stored as null plus a short sha256.
 */
export async function boundedSlugOp(slug, op) {
  const { LIVE_OPS, STUB_OPS } = await import("./fraggate/registry.js");
  const s = slug ? String(slug) : null;
  const o = op ? String(op) : null;
  const known = s && (Object.prototype.hasOwnProperty.call(LIVE_OPS, s) || Object.prototype.hasOwnProperty.call(STUB_OPS, s));
  const ops = known ? [...(LIVE_OPS[s] || []), ...(STUB_OPS[s] || [])] : [];
  const opKnown = Boolean(known && o && ops.includes(o));
  return {
    slug: known ? s : null,
    op: opKnown ? o : null,
    ...(s && !known ? { slug_sha256: (await sha256Hex(s)).slice(0, 16) } : {}),
    ...(o && !opKnown ? { op_sha256: (await sha256Hex(o)).slice(0, 16) } : {}),
  };
}

/**
 * RIB-018: seal one refusal. Returns the receipt view put on the refuse envelope.
 * `trustedNames` (REST doors and peers, src/refusal-doors.js): slug/op are server-chosen door/method names,
 * capped per door there. Otherwise (MCP / POST /v1/fraggate/call): slug/op are bounded to the registry,
 * the dedupe key leaves the args digest out, and MCP_SEAL_CAP_PER_MIN applies per isolate.
 */
export async function sealRefusal(store, { code, tool, slug, op, args, goal, prior, context, schemaHash, minuteBucket = Math.floor(Date.now() / 60000), extra = null, trustedNames = false }) {
  const digest = await argsDigest(args);
  const b = trustedNames ? { slug: slug || null, op: op || null } : await boundedSlugOp(slug, op);
  // Addendum (RIB-018 gaps, src/refusal-doors.js): additive kind/surface/door/reason/status/route.
  const refusal = { spec: REFUSAL_SPEC, code, tool: tool || null, slug: b.slug, op: b.op, args_digest: digest, ...(b.slug_sha256 ? { slug_sha256: b.slug_sha256 } : {}), ...(b.op_sha256 ? { op_sha256: b.op_sha256 } : {}), ...(extra && typeof extra === "object" ? extra : {}) };
  // Bounded key: REST/peer doors keep their finite key; the MCP door keys on code + tool + registry slug/op
  // (or "other") + goal + the prior refusal it follows + minute. The args digest is left out. The goal stays
  // (RIB-018 goal links need one row per goal), so MCP_SEAL_CAP_PER_MIN is the hard per-isolate bound.
  const keyParts = trustedNames
    ? { code, tool, slug, op, digest, goal: goal ? goal.key : null, prior: prior ? prior.h : null, m: minuteBucket }
    : { code, tool, slug: b.slug || "other", op: b.op || "other", goal: goal ? goal.key : null, prior: prior ? prior.h : null, m: minuteBucket, v: 2 };
  const input = {
    c: REFUSAL_CHAIN,
    k: "refusal",
    s: clipText(code, 80),
    f: clipText(`${tool || "?"}${b.slug ? " " + b.slug : (slug ? " ?" : "")}${b.op ? " " + b.op : (op ? " ?" : "")} refused ${code}. Nothing ran.`, 160),
    refusal,
    ...(goal ? { goal_key: goal.key } : {}),
    ...(prior ? { follows: { spec: GOAL_SPEC, h: prior.h, seq: prior.seq, k: prior.k } } : {}),
    ...(context ? { context_hash: context.context_hash, node_ids: await boundedNodeIds(context.node_ids) } : {}),
    ...(schemaHash ? { schema_hash: schemaHash } : {}),
    // Same refusal shape within a minute replays the same receipt (no flood).
    idempotency_key: "refusal:" + (await sha256Hex(canonicalize(keyParts))).slice(0, 40),
  };
  if (!trustedNames && store) {
    if (mcpCap.minute !== minuteBucket) { mcpCap.minute = minuteBucket; mcpCap.n = 0; }
    if (mcpCap.n >= MCP_SEAL_CAP_PER_MIN) {
      return { spec: REFUSAL_SPEC, kind: "refusal", code, sealed: false, status: "rate_limited", reason: `door refusal seal cap ${MCP_SEAL_CAP_PER_MIN}/min reached in this isolate; the refusal still stands` };
    }
    mcpCap.n++;
  }
  if (!store) return { spec: REFUSAL_SPEC, sealed: false, reason: "no durable store in this isolate" };
  // Nothing written: give the MCP isolate slot back (failed writes don't spend a slot).
  const refund = () => { if (!trustedNames && mcpCap.minute === minuteBucket && mcpCap.n > 0) mcpCap.n--; };
  try {
    const out = await appendInternal(store, input);
    if (!out || !out.ok) refund();
    // RIB-018 follow-up: the writer's global cap answers refusal-cap; report it honestly as rate_limited.
    if (out && out.refuse === "refusal-cap") return { spec: REFUSAL_SPEC, kind: "refusal", code, sealed: false, status: "rate_limited", reason: out.message || "global refusal seal cap reached; the refusal still stands" };
    if (!out || !out.ok) return { spec: REFUSAL_SPEC, sealed: false, reason: (out && (out.refuse || out.code)) || "append-failed" };
    return {
      spec: REFUSAL_SPEC,
      kind: "refusal",
      code,
      sealed: true,
      chain: REFUSAL_CHAIN,
      seq: out.seq + 1,
      h: out.stamp.stamp_sha256,
      lattice: out.lattice ? { primary: out.lattice.primary, secondary: out.lattice.secondary } : null,
      replayed: Boolean(out.replayed),
      goal_key: goal ? goal.key : null,
      goal_source: goal ? goal.source : null,
      follows: prior ? { h: prior.h, seq: prior.seq, k: prior.k } : null,
      verify: `/v1/anchor/row?c=${REFUSAL_CHAIN}&seq=${out.seq + 1}`,
      retry_hint: goal ? `Your next call with the same goal${goal.source === "caller" ? "_id" : " (same MCP session)"} is sealed as the action after this refusal.` : "Pass goal_id on your next call to link it to this refusal.",
    };
  } catch (err) {
    refund();
    return { spec: REFUSAL_SPEC, sealed: false, reason: clipText(err && err.message, 120) };
  }
}

/** @asmirkn: seal the agent's next action after a refusal on the same goal (any tool). */
export async function sealFollow(store, { prior, goal, tool, slug, op, outcome, code, args, context, schemaHash }) {
  if (!store || !prior || !goal) return null;
  // RIB-018 follow-up: caller-typed slug/op are bounded to the registry (else "?"), the code to a stable shape.
  const b = await boundedSlugOp(slug, op);
  const fcode = typeof code === "string" && /^[A-Za-z0-9][A-Za-z0-9_-]{1,63}$/.test(code) ? code : null;
  const input = {
    c: REFUSAL_CHAIN,
    k: "follow",
    s: clipText(`after ${prior.k} #${prior.seq}`, 80),
    f: clipText(`${tool || "?"}${b.slug ? " " + b.slug : (slug ? " ?" : "")}${b.op ? " " + b.op : (op ? " ?" : "")} -> ${outcome}${fcode ? " " + fcode : ""}`, 160),
    goal_key: goal.key,
    follows: { spec: GOAL_SPEC, h: prior.h, seq: prior.seq, k: prior.k, args_digest: await argsDigest(args) },
    ...(context ? { context_hash: context.context_hash, node_ids: await boundedNodeIds(context.node_ids) } : {}),
    ...(schemaHash ? { schema_hash: schemaHash } : {}),
    idempotency_key: "follow:" + (await sha256Hex(prior.h + ":" + goal.key)).slice(0, 40),
  };
  try {
    const out = await appendInternal(store, input);
    if (!out || !out.ok) return { spec: GOAL_SPEC, sealed: false };
    return { spec: GOAL_SPEC, sealed: true, chain: REFUSAL_CHAIN, seq: out.seq + 1, h: out.stamp.stamp_sha256, follows: { h: prior.h, seq: prior.seq, k: prior.k }, replayed: Boolean(out.replayed) };
  } catch {
    return { spec: GOAL_SPEC, sealed: false };
  }
}

/** Put an additive field on a tool result (envelope object and its JSON text). */
export function attachToResult(out, key, value) {
  if (!out || typeof out !== "object" || value == null) return out;
  if (out.envelope && typeof out.envelope === "object") out.envelope[key] = value;
  if (typeof out.text === "string") {
    try {
      const parsed = JSON.parse(out.text);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        parsed[key] = value;
        out.text = JSON.stringify(parsed, null, 2);
      }
    } catch {
      /* non-JSON text stays as is */
    }
  }
  return out;
}

/**
 * RIB-018 follow-up: an op refusal's reason is never stored as text (it can echo caller input, and a cut
 * message hides the echo). The row keeps reason:null + reason_sha256 (sha256 hex of the full reason).
 */
export async function boundedReason(reason, _args) {
  const r = reason == null ? "" : String(reason);
  if (!r) return { reason: null };
  return { reason: null, reason_sha256: await sha256Hex(r) };
}

/** Inner op refusal under an accepted envelope: result.ok false + stable code + fail_closed or written:false. */
export function innerOpRefusal(env) {
  let r = env && env.result;
  // MCP fraggate_call nests the FragGate envelope one level deeper (result.result is the op's answer).
  if (r && typeof r === "object" && r.ok !== false && r.door && r.result && typeof r.result === "object") r = r.result;
  if (!r || typeof r !== "object" || Array.isArray(r) || r.ok !== false) return null;
  if (!(r.fail_closed === true || r.written === false)) return null;
  const code = typeof r.code === "string" ? r.code : null;
  if (!code || !/^[A-Z0-9][A-Z0-9-]{1,63}$/.test(code) || /TOKEN/.test(code)) return null;
  return { code, reason: String(r.message || r.reason || "") };
}

/**
 * Wrap one MCP tools/call. call() runs the existing door unchanged.
 */
export async function guardToolCall({ store, request, name, args, schemaHash, call }) {
  const src = args && typeof args === "object" ? args : {};
  const goal = badGoalId(src) ? null : await goalKeyOf(src, request);
  const context = await contextOf(src);
  const drift = schemaDrift(src, schemaHash);
  let prior = null;
  if (goal && store) {
    try {
      prior = await openRefusalFor(store, goal.key);
    } catch {
      prior = null;
    }
  }
  const meta = { goal_key: goal ? goal.key : null, context, schema_hash: schemaHash || null };
  let out;
  if (drift) {
    out = { status: 409, text: JSON.stringify(drift, null, 2), envelope: { ...drift } };
  } else {
    out = await runWithCallMeta(meta, () => call());
  }
  const env = envelopeOf(out);
  let code = refusalCodeOf(env, out);
  // RIB-018 addendum: an op that refuses inside an accepted door envelope (e.g. memory lattice-learn
  // LATTICE-LEARN-BAD-CHAIN: envelope FG-OK, result ok:false, fail_closed / written:false) is a refusal too.
  const inner = !code ? innerOpRefusal(env) : null;
  if (inner) code = inner.code;
  const slug = String(src.slug || src.name || src.product || "") || null;
  const op = src.op ? String(src.op) : null;
  if (code) {
    const receipt = await sealRefusal(store, { code, tool: name, slug, op, args: src, goal, prior, context, schemaHash, extra: inner ? { kind: "refusal", door: "op", ...(await boundedReason(inner.reason, src)) } : null });
    attachToResult(out, "refusal_receipt", receipt);
  } else if (prior && prior.open) {
    const follow = await sealFollow(store, { prior, goal, tool: name, slug, op, outcome: env && (env.ok === false || Number(out && out.status) >= 400) ? "error" : "accepted", code: env && env.code, args: src, context, schemaHash });
    if (follow) attachToResult(out, "follows_refusal", follow);
  }
  if (context) attachToResult(out, "context", context);
  if (badGoalId(src)) attachToResult(out, "goal_id_ignored", badGoalId(src));
  return out;
}
