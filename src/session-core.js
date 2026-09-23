/**
 * Aziel Eliab Runtime — session object (pure).
 *
 * open → policy → exec → receipt → close
 *
 * Receipts are hash-chained and owned by this runtime process/session.
 * Local exec receipts include engine_digest of the artifact that ran here.
 * Isolation is Cloudflare's Worker/DO isolate (the jail). Dynamic policy / exec /
 * wipe envelopes are isolate-honest. Full guest VM / QEMU / KVM is SLOT.
 * Author: Aziel Eliab. Identity is Aziel Eliab only. Do not invent DOIs.
 * SPDX-License-Identifier: Apache-2.0
 */

import { RECEIPT_CAP, SESSION_TTL_MS, isSessionExpired, receiptCapReached, sessionExpiresAt } from "./production.js";
import { linkSessionAttempt } from "./receipt-attempt.js";

export const ZERO_HASH = "0".repeat(64);
export const SESSION_ID_RE = /^sess_[a-f0-9]{32}$/;
export const DEFAULT_MAX_PAYLOAD_BYTES = 65_536;
export const DEFAULT_MAX_OPS = 64;
export const RECEIPT_KIND = "aziel-runtime.receipt";
export const ISOLATE_CLASS = "worker-do";
export const SANDBOX_KIND = "isolate";
export const GUEST_VM_KEYS = Object.freeze([
  "qemu",
  "kvm",
  "hypervisor",
  "guest_vm",
  "virtual_machine",
  "full_vm",
]);

export function newSessionId() {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return "sess_" + [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function defaultPolicy() {
  return {
    allow_slugs: ["*"],
    allow_ops: ["*"],
    max_payload_bytes: DEFAULT_MAX_PAYLOAD_BYTES,
    max_ops: DEFAULT_MAX_OPS,
    kv_increment: false,
    identity: "Aziel Eliab",
    lamb_banners: true,
    isolate_class: ISOLATE_CLASS,
    sandbox_kind: SANDBOX_KIND,
    wipe_on_close: false,
    deny_guest_vm: true,
    guest_vm: false,
    note:
      "Download counters stay off unless kv_increment is explicitly true. This Worker has no download KV and still will not increment one. Isolate (Worker/DO) is the jail — not QEMU/KVM.",
  };
}

export function canonicalize(value) {
  if (value === undefined) return undefined;
  if (value === null) return "null";
  const t = typeof value;
  if (t === "number") {
    if (!Number.isFinite(value)) throw new Error("cannot canonicalize non-finite number");
    return JSON.stringify(value);
  }
  if (t === "boolean") return value ? "true" : "false";
  if (t === "string") return JSON.stringify(value);
  if (Array.isArray(value)) {
    return "[" + value.map((item) => canonicalize(item)).join(",") + "]";
  }
  if (t === "object") {
    const keys = Object.keys(value)
      .filter((k) => value[k] !== undefined)
      .sort();
    return (
      "{" +
      keys.map((k) => JSON.stringify(k) + ":" + canonicalize(value[k])).join(",") +
      "}"
    );
  }
  throw new Error(`cannot canonicalize ${t}`);
}

export async function sha256Hex(input) {
  const bytes = typeof input === "string" ? new TextEncoder().encode(input) : input;
  const buf = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function digestText(text) {
  const raw = text == null ? "" : String(text);
  return {
    sha256: await sha256Hex(raw),
    bytes: new TextEncoder().encode(raw).length,
  };
}

export function sessionError(status, code, message, extra = {}) {
  const err = new Error(message);
  err.status = status;
  err.code = code;
  err.extra = extra;
  return err;
}

function lastReceipt(session) {
  const list = session.receipts || [];
  return list.length ? list[list.length - 1] : null;
}

export async function signReceipt(partial, prevHash) {
  const body = {
    kind: RECEIPT_KIND,
    ...partial,
    prev_hash: prevHash || ZERO_HASH,
  };
  const { hash: _omit, ...unsigned } = body;
  const hash = await sha256Hex(canonicalize(unsigned));
  return { ...unsigned, hash };
}

export async function appendReceipt(session, event, payload, nowIso, extra = {}) {
  const link = linkSessionAttempt(session, extra && extra.attempt_link ? extra.attempt_link : extra, {
    defaultOutcome: extra && extra.outcome ? extra.outcome : "completed",
  });
  if (!link.ok) throw sessionError(link.status || 400, "bad_attempt_link", link.error);
  const rest = extra && typeof extra === "object" ? { ...extra } : {};
  for (const key of [
    "request_id",
    "attempt_n",
    "parent_receipt_id",
    "correlation_id",
    "outcome",
    "attempt_link",
    "context",
  ]) {
    delete rest[key];
  }
  const prev = lastReceipt(session);
  const receipt = await signReceipt(
    {
      version: session.runtime_version,
      session_id: session.id,
      seq: (session.receipts || []).length + 1,
      event,
      ts: nowIso,
      author: "Aziel Eliab",
      identity: "Aziel Eliab",
      runtime: "aziel-runtime",
      owner: "aziel-runtime",
      owner_note:
        "This receipt is owned by the aziel-runtime session process, not by upstream JSON alone.",
      payload,
      request_id: link.request_id,
      attempt_n: link.attempt_n,
      parent_receipt_id: link.parent_receipt_id,
      correlation_id: link.correlation_id,
      outcome: link.outcome,
      ledger_prev_is_retry_parent: false,
      ...rest,
    },
    prev ? prev.hash : ZERO_HASH,
  );
  session.receipts.push(receipt);
  session.head_hash = receipt.hash;
  session.updated_at = nowIso;
  return receipt;
}

export function verifyChain(receipts) {
  const errors = [];
  let prev = ZERO_HASH;
  for (let i = 0; i < receipts.length; i++) {
    const rec = receipts[i];
    if (!rec || rec.kind !== RECEIPT_KIND) {
      errors.push({ seq: rec && rec.seq, error: "bad_kind" });
      continue;
    }
    if (rec.prev_hash !== prev) {
      errors.push({ seq: rec.seq, error: "prev_hash_mismatch", expected: prev, got: rec.prev_hash });
    }
    if (rec.seq !== i + 1) {
      errors.push({ seq: rec.seq, error: "seq_mismatch", expected: i + 1 });
    }
    prev = rec.hash;
  }
  return { ok: errors.length === 0, count: receipts.length, errors, head: prev === ZERO_HASH ? null : prev };
}

export async function verifyChainStrict(receipts) {
  const basic = verifyChain(receipts);
  const errors = [...basic.errors];
  for (const rec of receipts || []) {
    if (!rec) continue;
    const { hash, ...unsigned } = rec;
    const expected = await sha256Hex(canonicalize(unsigned));
    if (hash !== expected) {
      errors.push({ seq: rec.seq, error: "hash_mismatch", expected, got: hash });
    }
  }
  return { ok: errors.length === 0, count: (receipts || []).length, errors, head: basic.head };
}

export function openSession({ id, now, version, source }) {
  if (!SESSION_ID_RE.test(id)) {
    throw sessionError(400, "bad_session_id", "session id must match sess_ + 32 hex");
  }
  return {
    id,
    opened_at: now,
    updated_at: now,
    closed: false,
    closed_at: null,
    runtime_version: version,
    source: source || "worker",
    author: "Aziel Eliab",
    identity: "Aziel Eliab",
    policy: defaultPolicy(),
    receipts: [],
    pending_intent: null,
    exec_count: 0,
    wiped: false,
    head_hash: ZERO_HASH,
    honesty: {
      layer: "catalog+pull+proxy+session+in-process-engines",
      proxy_is_not_exec: true,
      true_engine_runtime: true,
      isolate_is_the_jail: true,
      hosted_azai_is_not_the_blend: true,
      no_extra_sandbox_claimed: true,
      sandbox_kind: SANDBOX_KIND,
      isolate_class: ISOLATE_CLASS,
      guest_vm: false,
      hypervisor: false,
      qemu: false,
      kvm: false,
      local_blends: ["azai serve", "forgereceipts ui", "azos ui"],
    },
  };
}

function refuseGuestVm(incoming) {
  if (!incoming || typeof incoming !== "object") return;
  for (const key of GUEST_VM_KEYS) {
    if (incoming[key] === true) {
      throw sessionError(
        400,
        "guest_vm_refused",
        "Worker/DO isolate is the jail. Full VM / QEMU / KVM is SLOT — not implemented.",
        { isolate_is_the_jail: true, sandbox_kind: SANDBOX_KIND, guest_vm: false },
      );
    }
  }
  const isolate = incoming.isolate_class != null ? String(incoming.isolate_class).trim().toLowerCase() : "";
  const kind = incoming.sandbox_kind != null ? String(incoming.sandbox_kind).trim().toLowerCase() : "";
  if (isolate && isolate !== ISOLATE_CLASS) {
    throw sessionError(
      400,
      "guest_vm_refused",
      `isolate_class ${isolate} is not implementable here. Only worker-do (Cloudflare isolate).`,
      { isolate_is_the_jail: true, sandbox_kind: SANDBOX_KIND, allowed: ISOLATE_CLASS },
    );
  }
  if (kind && kind !== SANDBOX_KIND) {
    throw sessionError(
      400,
      "guest_vm_refused",
      `sandbox_kind ${kind} is SLOT. Only isolate (Worker/DO jail) is real.`,
      { isolate_is_the_jail: true, sandbox_kind: SANDBOX_KIND },
    );
  }
}

export function mergePolicy(current, incoming) {
  if (!incoming || typeof incoming !== "object" || Array.isArray(incoming)) {
    throw sessionError(400, "bad_policy", "policy must be a JSON object");
  }
  refuseGuestVm(incoming);
  const next = { ...current };
  if (incoming.allow_slugs !== undefined) {
    if (!Array.isArray(incoming.allow_slugs) || incoming.allow_slugs.some((s) => typeof s !== "string")) {
      throw sessionError(400, "bad_policy", "allow_slugs must be an array of strings");
    }
    next.allow_slugs = incoming.allow_slugs.map((s) => String(s).trim()).filter(Boolean);
  }
  if (incoming.allow_ops !== undefined) {
    if (!Array.isArray(incoming.allow_ops) || incoming.allow_ops.some((s) => typeof s !== "string")) {
      throw sessionError(400, "bad_policy", "allow_ops must be an array of strings");
    }
    next.allow_ops = incoming.allow_ops.map((s) => String(s).trim()).filter(Boolean);
  }
  if (incoming.max_payload_bytes !== undefined) {
    const n = Number(incoming.max_payload_bytes);
    if (!Number.isInteger(n) || n < 1 || n > 1_048_576) {
      throw sessionError(400, "bad_policy", "max_payload_bytes must be an integer 1..1048576");
    }
    next.max_payload_bytes = n;
  }
  if (incoming.kv_increment !== undefined) {
    next.kv_increment = incoming.kv_increment === true;
  }
  if (incoming.lamb_banners !== undefined) {
    next.lamb_banners = incoming.lamb_banners !== false;
  }
  if (incoming.identity !== undefined) {
    const id = String(incoming.identity || "").trim();
    if (id && id !== "Aziel Eliab") {
      throw sessionError(400, "bad_policy", "identity must remain Aziel Eliab");
    }
    next.identity = "Aziel Eliab";
  }
  if (incoming.note !== undefined) {
    next.note = String(incoming.note);
  }
  if (incoming.max_ops !== undefined) {
    const n = Number(incoming.max_ops);
    if (!Number.isInteger(n) || n < 1 || n > 1024) {
      throw sessionError(400, "bad_policy", "max_ops must be an integer 1..1024");
    }
    next.max_ops = n;
  }
  if (incoming.wipe_on_close !== undefined) {
    next.wipe_on_close = incoming.wipe_on_close === true;
  }
  if (incoming.isolate_class !== undefined) {
    next.isolate_class = ISOLATE_CLASS;
  }
  if (incoming.sandbox_kind !== undefined) {
    next.sandbox_kind = SANDBOX_KIND;
  }
  next.deny_guest_vm = true;
  next.guest_vm = false;
  return next;
}

function requireOpen(session, nowIso) {
  if (!session) throw sessionError(404, "session_not_found", "session not found");
  if (session.closed) {
    throw sessionError(409, "session_closed", "session is sealed; no further exec or policy", {
      session_id: session.id,
      closed_at: session.closed_at,
    });
  }
  if (isSessionExpired(session, nowIso || new Date())) {
    throw sessionError(410, "session_expired", "session exceeded 6h TTL", {
      session_id: session.id,
      opened_at: session.opened_at,
      session_ttl_ms: SESSION_TTL_MS,
    });
  }
}

function requireReceiptRoom(session) {
  if (receiptCapReached(session)) {
    throw sessionError(409, "receipt_cap", `session receipt cap ${RECEIPT_CAP} reached`, {
      receipt_count: (session.receipts || []).length,
      receipt_cap: RECEIPT_CAP,
    });
  }
}

export function assertExecAllowed(session, { slug, op, payloadBytes, knownSlugs, nowIso }) {
  requireOpen(session, nowIso);
  const s = String(slug || "").trim().toLowerCase();
  const o = String(op || "").trim();
  if (!s || !o) {
    throw sessionError(400, "bad_exec", "exec requires slug and op");
  }
  if (knownSlugs && !knownSlugs.has(s)) {
    throw sessionError(404, "unknown_slug", `unknown product: ${s}`, { slug: s });
  }
  const slugs = session.policy.allow_slugs || ["*"];
  if (!slugs.includes("*") && !slugs.includes(s)) {
    throw sessionError(403, "slug_not_allowed", `policy does not allow slug ${s}`, { slug: s });
  }
  const ops = session.policy.allow_ops || ["*"];
  if (!ops.includes("*") && !ops.includes(o)) {
    throw sessionError(403, "op_not_allowed", `policy does not allow op ${o}`, { op: o });
  }
  const max = session.policy.max_payload_bytes || DEFAULT_MAX_PAYLOAD_BYTES;
  if (payloadBytes > max) {
    throw sessionError(413, "payload_too_large", `payload ${payloadBytes} exceeds max_payload_bytes ${max}`, {
      payload_bytes: payloadBytes,
      max_payload_bytes: max,
    });
  }
  const maxOps = session.policy.max_ops || DEFAULT_MAX_OPS;
  const used = Number(session.exec_count) || 0;
  if (used >= maxOps) {
    throw sessionError(409, "max_ops", `session exec_count ${used} reached max_ops ${maxOps}`, {
      exec_count: used,
      max_ops: maxOps,
      sandbox_kind: SANDBOX_KIND,
    });
  }
  return { slug: s, op: o };
}

export async function applyOpen(session, nowIso) {
  await appendReceipt(session, "open", {
    policy: session.policy,
    source: session.source,
  }, nowIso);
  return session;
}

export async function applyPolicy(session, incoming, nowIso) {
  requireOpen(session, nowIso);
  requireReceiptRoom(session);
  const before = session.policy;
  session.policy = mergePolicy(before, incoming);
  const receipt = await appendReceipt(session, "policy", {
    before,
    after: session.policy,
  }, nowIso);
  return { session, receipt };
}

export async function recordIntent(session, { slug, op, payload, payloadText, knownSlugs, banner }, nowIso) {
  requireOpen(session, nowIso);
  requireReceiptRoom(session);
  const bytes = new TextEncoder().encode(payloadText).length;
  const allowed = assertExecAllowed(session, { slug, op, payloadBytes: bytes, knownSlugs, nowIso });
  const digest = await digestText(payloadText);
  const intent = {
    intent_id: `${session.id}:${(session.receipts || []).length + 1}`,
    slug: allowed.slug,
    op: allowed.op,
    recorded_at: nowIso,
    payload_digest: digest.sha256,
    payload_bytes: digest.bytes,
    kv_increment_requested: session.policy.kv_increment === true,
    kv_increment_applied: false,
    kv_note: "aziel-runtime does not increment product download counters.",
    identity: "Aziel Eliab",
    ...(banner && session.policy.lamb_banners ? { banner } : {}),
    ...(allowed.slug === "azai"
      ? { hosted_azai: "protocol mirror + Lamb check, not the local blend (azai serve)" }
      : {}),
  };
  session.pending_intent = intent;
  session.exec_count = (Number(session.exec_count) || 0) + 1;
  session.updated_at = nowIso;
  return { intent, payload };
}

export async function commitExec(session, { intent, status, latencyMs, requestDigest, responseDigest, error, upstream, responseBytes, contentType, engine, request_id, attempt_n, parent_receipt_id, correlation_id, outcome }, nowIso) {
  requireOpen(session, nowIso);
  requireReceiptRoom(session);
  if (!session.pending_intent || session.pending_intent.intent_id !== intent.intent_id) {
    throw sessionError(409, "intent_mismatch", "pending intent does not match commit");
  }
  const eng = engine && typeof engine === "object" ? engine : {};
  const mode = eng.mode || (upstream ? "proxy_fallback" : "local");
  const isLocal = mode === "local" && eng.true_engine_runtime === true && Boolean(eng.engine_digest);
  const receipt = await appendReceipt(session, "exec", {
    intent,
    result: {
      status,
      latency_ms: latencyMs,
      request_digest: requestDigest,
      response_digest: responseDigest,
      response_bytes: responseBytes,
      content_type: contentType || null,
      error: error || null,
      upstream: isLocal ? null : (upstream || null),
      mode,
      true_engine_runtime: isLocal,
      engine_digest: isLocal ? eng.engine_digest : null,
      engine_slug: eng.engine_slug || intent.slug,
      engine_op: eng.engine_op || intent.op,
      ran_in: isLocal ? (eng.ran_in || "aziel-runtime") : null,
    },
  }, nowIso, {
    attempt_link: {
      request_id,
      attempt_n,
      parent_receipt_id,
      correlation_id,
      outcome: outcome || (error || Number(status) >= 400 ? "failed" : "completed"),
    },
  });
  session.pending_intent = null;
  return receipt;
}

export async function applyClose(session, nowIso, { force = false } = {}) {
  if (!session) throw sessionError(404, "session_not_found", "session not found");
  if (session.closed) {
    throw sessionError(409, "session_closed", "session is sealed; no further exec or policy", {
      session_id: session.id,
      closed_at: session.closed_at,
    });
  }
  if (!force) requireOpen(session, nowIso);
  session.closed = true;
  session.closed_at = nowIso;
  session.pending_intent = null;
  const wipe = session.policy && session.policy.wipe_on_close === true;
  if (wipe) session.wiped = true;
  const receipt = await appendReceipt(session, "close", {
    sealed: true,
    receipt_count: session.receipts.length + 1,
    wipe_on_close: wipe,
    wiped: session.wiped === true,
    sandbox_kind: SANDBOX_KIND,
    isolate_class: ISOLATE_CLASS,
    guest_vm: false,
  }, nowIso);
  return { session, receipt };
}

export function publicSession(session) {
  if (!session) return null;
  return {
    id: session.id,
    opened_at: session.opened_at,
    updated_at: session.updated_at,
    closed: session.closed,
    closed_at: session.closed_at,
    runtime_version: session.runtime_version,
    source: session.source,
    author: session.author,
    identity: session.identity,
    policy: session.policy,
    receipt_count: (session.receipts || []).length,
    receipt_cap: RECEIPT_CAP,
    exec_count: Number(session.exec_count) || 0,
    wiped: session.wiped === true,
    expires_at: sessionExpiresAt(session),
    head_hash: session.head_hash,
    pending_intent: session.pending_intent,
    honesty: session.honesty,
    ...(session.vpn_auto ? { vpn_auto: session.vpn_auto } : {}),
  };
}
