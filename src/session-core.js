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

/**
 * Additive optional receipt fields (2.0 additive-only; absent = old hash unchanged).
 * AZRT-ANCHOR-1.0 anchor; later specs add more names here.
 */
export const ADDITIVE_RECEIPT_FIELDS = Object.freeze([
  "anchor", // AZRT-ANCHOR-1.0
  "schema_hash", // AZRT-SCHEMA-PIN-1.0
  "expect", // AZRT-EXPECT-SPEC-1.0 (open receipt only)
  "expect_hash",
  "verdict", // AZRT-EXPECT-SPEC-1.0 (close receipt only)
  "context_hash", // AZRT-CONTEXT-HASH-1.0
  "context_n",
  "node_ids",
  "goal_key", // AZRT-GOAL-LINK-1.0
  "server_path", // AZRT-SERVER-PROVENANCE-1.0 (RIB-039, exec receipts)
  "server_hash",
  "server_reason",
  "server_basis",
  "server_tool",
  "requested_alias", // AZRT-MODEL-PROVENANCE-1.0 (RIB-068, model-backed exec receipts only)
  "model_id",
  "model_version",
  "model_basis",
  "model_finding",
]);

export function additiveReceiptFields(src) {
  const out = {};
  if (!src || typeof src !== "object") return out;
  for (const key of ADDITIVE_RECEIPT_FIELDS) {
    const value = src[key];
    if (value == null) continue;
    try {
      const text = JSON.stringify(value);
      if (text && text.length <= 2048) out[key] = JSON.parse(text);
    } catch {
      /* drop unserializable */
    }
  }
  return out;
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
    "issuer_kind",
    "issuer_path",
    "issuerKind",
    "issuerPath",
    "writer_epoch",
    "writer_fence",
    "build_attest",
  ]) {
    delete rest[key];
  }
  // RIB-051: the harness mints issuer_kind. A caller field cannot.
  const { harnessFieldsFor } = await import("./harness-seal.js");
  const harness = harnessFieldsFor(event);
  // RIB-048: an exec row records the attestation check. Mismatch refuses before the row exists.
  let buildAttest = null;
  if (event === "exec") {
    const { assertBuildAttestForExec } = await import("./build-attest.js");
    const attest = await assertBuildAttestForExec(session);
    if (!attest.allowed) {
      throw sessionError(409, attest.code, attest.message, { executed: false, build_attest: attest.view, written: false });
    }
    buildAttest = attest.view;
  }
  // R4 backstop: no non-close row may eat the close reserve (stale/revoke/pause/resume/refused included).
  if (!CLOSE_EVENTS.includes(event) && roomLeft(session) <= 0) {
    const reserve = closeReserveFor(session);
    throw sessionError(409, "receipt_cap", `session receipt cap ${RECEIPT_CAP} reached (the last ${reserve} slots are reserved for close)`, { receipt_count: (session.receipts || []).length, receipt_cap: RECEIPT_CAP, close_reserve: reserve, written: false });
  }
  // Close rows are never refused (a session must always be closable; legacy chains past the reserve still close).
  // RIB-050: epoch sealed by the runtime. A bump stamp is consumed only once the row will be written.
  const { takeFenceStamp } = await import("./writer-fence.js");
  const fenceStamp = takeFenceStamp(session);
  const epochFields = Number.isInteger(session && session.writer_epoch)
    ? { writer_epoch: session.writer_epoch, ...(fenceStamp ? { writer_fence: fenceStamp } : {}) }
    : {};
  const prev = lastReceipt(session);
  // AZRT-EXPECT-SPEC-1.0: once stamp #1 sealed an expected-state spec, every later receipt names it.
  const first = (session.receipts || [])[0];
  if (first && first.expect_hash && rest.spec_ref == null) {
    rest.spec_ref = { spec: "AZRT-EXPECT-SPEC-1.0", receipt_hash: first.hash, expect_hash: first.expect_hash };
  }
  const partial = {
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
    ...harness,
    ...epochFields,
    ...(buildAttest ? { build_attest: buildAttest } : {}),
  };
  // Dual hash lattice: primary + secondary chain over every session receipt.
  // Session receipts are written by the online runtime, so the secondary is the online chain.
  const { latticeDocumentHash, planLattice } = await import("./dual-lattice.js");
  const lattice = await planLattice({
    document_hash: await latticeDocumentHash({ kind: RECEIPT_KIND, ...partial }),
    rows: session.receipts || [],
  });
  // RIB-042: sig_commit is INSIDE the hash, so stripping or nulling the signature later is detectable.
  const { signatureFor, sigCommitFor } = await import("./receipt-signing.js");
  const sealed = await signReceipt({ ...partial, lattice, sig_commit: sigCommitFor() }, prev ? prev.hash : ZERO_HASH);
  // The signature itself covers the hash and so must sit outside it.
  const receipt = { ...sealed, signature: await signatureFor(sealed.hash) };
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

export async function verifyChainStrict(receipts, { trustedKeys = null } = {}) {
  const basic = verifyChain(receipts);
  const errors = [...basic.errors];
  const { verifyLattice } = await import("./dual-lattice.js");
  const dual = await verifyLattice((receipts || []).filter(Boolean));
  for (const br of dual.breaks) errors.push({ seq: br.seq + 1, error: br.reason });
  for (const rec of receipts || []) {
    if (!rec) continue;
    const { hash, signature: _sig, ...unsigned } = rec; // RIB-042: signature sits outside the hash
    const expected = await sha256Hex(canonicalize(unsigned));
    if (hash !== expected) {
      errors.push({ seq: rec.seq, error: "hash_mismatch", expected, got: hash });
    }
  }
  // RIB-039: SERVER-DRIFT per tool name; missing after present fails closed.
  const { checkServerDrift } = await import("./server-provenance.js");
  const server_drift = checkServerDrift((receipts || []).filter(Boolean));
  for (const d of server_drift.drifts) errors.push({ seq: d.seq, error: d.code, tool: d.tool });
  // RIB-068: version change under one requested alias. Non-model receipts add no errors.
  const { checkModelVersion } = await import("./model-provenance.js");
  const model_provenance = await checkModelVersion((receipts || []).filter(Boolean));
  for (const e of model_provenance.errors) errors.push({ seq: e.seq, error: e.error, requested_alias: e.requested_alias });
  // RIB-013: the sealed expected-state spec (stamp #1) and every later spec_ref, fail closed.
  const { verifyExpectSpec } = await import("./expect-spec-verify.js");
  const expect_spec = await verifyExpectSpec((receipts || []).filter(Boolean), { hashOf: (r) => r.hash, requireRef: true });
  for (const e of expect_spec.errors) errors.push({ seq: e.seq, error: e.code });
  // RIB-014: a verdict sealed after a stale stamp can never be reported valid (fail closed).
  const { specStaleness } = await import("./spec-stale.js");
  const spec_stale = specStaleness(receipts);
  for (const e of spec_stale.errors) errors.push({ seq: e.seq, error: e.code });
  // RIB-015: control stamps name the genesis issuer; nothing runs or grades after revoke/stale.
  const { verifyIssuerAppend } = await import("./issuer-append.js");
  const issuer_append = verifyIssuerAppend(receipts);
  for (const e of issuer_append.errors) errors.push({ seq: e.seq, error: e.code });
  // RIB-016: policy binding fails closed; evidence fields are reported one by one, never from integrity.
  const { verifyEvidence } = await import("./evidence-fields.js");
  const evidence = await verifyEvidence(receipts);
  for (const e of evidence.errors) errors.push({ seq: e.seq, error: e.code });
  // RIB-042: receipt signatures (held, never minted key). Bad/untrusted fails closed; unsigned/legacy reported.
  const rs = await import("./receipt-signing.js");
  let trusted = trustedKeys;
  if (!trusted) {
    trusted = await rs.trustedReceiptKeys(null);
    const held = rs.activeReceiptSigner();
    if (held && held.ok && !trusted.some((k) => k.key_id === held.provenance.key_id)) trusted.push({ public_key: held.provenance.public_key, key_id: held.provenance.key_id, source: "published" });
  }
  const receipt_signatures = await rs.verifyReceiptSignatures((receipts || []).filter(Boolean), { trusted });
  for (const e of receipt_signatures.errors) errors.push({ seq: e.seq, error: e.code });
  // RIB-052: frozen-artifact delivery check recomputed from the chain; undeclared changes fail closed.
  const { verifyFrozenArtifacts } = await import("./frozen-artifacts.js");
  const frozen_artifacts = await verifyFrozenArtifacts(receipts);
  for (const e of frozen_artifacts.errors) errors.push({ seq: e.seq, error: e.code });
  // RIB-055: recorder health, unaudited gaps, and harness reconcile. No recorder → no new errors.
  const { verifyAuditPath } = await import("./audit-path.js");
  const audit_path = await verifyAuditPath(receipts);
  for (const e of audit_path.errors) errors.push({ seq: e.seq, error: e.code });
  // RIB-043: approver bound into gated exec rows; missing/altered fails closed.
  const { verifyApprover } = await import("./approver.js");
  const approver = await verifyApprover(receipts);
  for (const e of approver.errors) errors.push({ seq: e.seq, error: e.code });
  // RIB-050: a row whose writer epoch is older than an earlier revocation stamp fails closed.
  const { verifyWriterFence } = await import("./writer-fence.js");
  const writer_fence = verifyWriterFence(receipts);
  for (const e of writer_fence.errors) errors.push({ seq: e.seq, error: e.code });
  // RIB-051: harness-sealed rows verify. A self-logged exec claim is not exec evidence.
  const { verifyHarnessSeals } = await import("./harness-seal.js");
  const harness_seal = verifyHarnessSeals(receipts);
  for (const e of harness_seal.errors) errors.push({ seq: e.seq, error: e.code });
  const hashPresent = (receipts || []).length > 0 && (receipts || []).every((r) => r && typeof r.hash === "string");
  return {
    ok: errors.length === 0,
    count: (receipts || []).length,
    errors,
    head: basic.head,
    // AZRT-INTEGRITY-LEVEL-1.0 (additive). Session chains are not witnessed, so the ceiling is chain_consistent.
    integrity: {
      spec: "AZRT-INTEGRITY-LEVEL-1.0",
      level: hashPresent ? (errors.length === 0 ? "chain_consistent" : "hash_present") : "none",
      levels: ["hash_present", "chain_consistent", "externally_anchored"],
      externally_anchored: false,
      note: "Session receipts may carry an anchor ref (the newest witness statement at mint time). That proves order after it, not external anchoring of this session.",
    },
    server_drift,
    model_provenance,
    expect_spec,
    spec_stale,
    issuer_append,
    evidence,
    receipt_signatures,
    approver,
    frozen_artifacts,
    audit_path,
    writer_fence,
    harness_seal,
    dual_lattice: {
      ok: dual.ok,
      lattice_rows: dual.lattice_rows,
      legacy_rows: dual.legacy_rows,
      tips: dual.lattice_rows ? dual.tips : null,
      lattice_live: dual.lattice_live && errors.length === 0,
    },
  };
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
  if (incoming.require_decision !== undefined) {
    // RIB-043: every exec must carry a DecisionGATE decision bound to the call.
    // Gating is one-way within a session: true -> anything else is refused (fail closed).
    if (current && current.require_decision === true && incoming.require_decision !== true) {
      throw sessionError(409, "APPROVER-POLICY-DOWNGRADE", "This session is DecisionGATE-gated (require_decision:true). Gating cannot be turned off mid-session; open a new session. Policy unchanged.", { spec: "AZRT-APPROVER-1.0" });
    }
    next.require_decision = incoming.require_decision === true;
  }
  if (incoming.resume_strict !== undefined) {
    // RIB-044: resume refuses unless a witness statement covers the freeze head.
    next.resume_strict = incoming.resume_strict === true;
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

/** R4: the last 2 slots under RECEIPT_CAP are reserved for close (delivery_check + close), so close always fits. */
export const CLOSE_RESERVE = 2;
/** Harness rows that may use the close reserve. RIB-055 adds unaudited_gap + reconcile when a recorder was named. */
export const CLOSE_EVENTS = Object.freeze(["delivery_check", "unaudited_gap", "reconcile", "close"]);

function namedRecorder(session) {
  const first = session && session.receipts && session.receipts[0];
  return Boolean(first && first.recorder && first.recorder_hash);
}

/** Base reserve stays 2. A named recorder also seals unaudited_gap + reconcile, so close still fits. */
export function closeReserveFor(session) {
  return CLOSE_RESERVE + (namedRecorder(session) ? 2 : 0);
}

function auditPublic(session) {
  const first = session && session.receipts && session.receipts[0];
  if (!first || !first.recorder) return null;
  let status = (first.audit_path && first.audit_path.status) || "down";
  for (const r of session.receipts || []) {
    if (r && r.event === "audit_path" && r.audit_path && r.audit_path.status) status = r.audit_path.status;
  }
  return {
    spec: "AZRT-AUDIT-PATH-1.0",
    observer_id: first.recorder.observer_id,
    records_ref: first.recorder.records_ref,
    status,
    resolved: false,
    names_only: first.recorder.names_only === true,
  };
}

function roomLeft(session) {
  return RECEIPT_CAP - closeReserveFor(session) - ((session && session.receipts) || []).length;
}

function requireReceiptRoom(session) {
  const reserve = closeReserveFor(session);
  if (receiptCapReached(session) || roomLeft(session) <= 0) {
    throw sessionError(409, "receipt_cap", `session receipt cap ${RECEIPT_CAP} reached (the last ${reserve} slots are reserved for close)`, {
      receipt_count: (session.receipts || []).length,
      receipt_cap: RECEIPT_CAP,
      close_reserve: reserve,
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

export async function applyOpen(session, nowIso, extra = {}) {
  // RIB-015: genesis records the issuer (hash of a Worker-minted key; the key itself is never sealed).
  const { issuerField } = await import("./issuer-append.js");
  const issuer = issuerField(extra && extra.issuer_key_hash);
  // RIB-052: frozen artifacts are sealed on stamp #1 only (re-normalized here; never via additive fields).
  let frozen = null;
  if (extra && extra.frozen_artifacts != null) {
    const { frozenArtifactsOf } = await import("./frozen-artifacts.js");
    const f = await frozenArtifactsOf(extra.frozen_artifacts);
    if (!f.ok) throw sessionError(400, f.code, f.message);
    frozen = { frozen_artifacts: f.frozen_artifacts, frozen_hash: f.frozen_hash };
  }
  // RIB-055: an external recorder is sealed on stamp #1 only (re-normalized here; never via additive fields).
  let recorder = null;
  if (extra && (extra.recorder != null || extra.audit_health != null)) {
    const { recorderOf } = await import("./audit-path.js");
    const rec = await recorderOf(extra.recorder, extra.audit_health, { sessionId: session.id });
    if (!rec || rec.ok === false) throw sessionError(rec && rec.status ? rec.status : 400, rec && rec.code ? rec.code : "AUDIT-RECORDER-INVALID", rec && rec.message ? rec.message : "recorder invalid");
    recorder = { recorder: rec.recorder, recorder_hash: rec.recorder_hash, audit_path: rec.audit_path };
  }
  const { beginSessionFence } = await import("./writer-fence.js");
  beginSessionFence(session);
  await appendReceipt(session, "open", {
    policy: session.policy,
    source: session.source,
  }, nowIso, { ...additiveReceiptFields(extra), ...(issuer ? { issuer } : {}), ...(frozen || {}), ...(recorder || {}) });
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

/**
 * RIB-018 / AZRT-REFUSAL-RECEIPT-1.0 on the session chain: a pre-exec policy refusal appends one
 * `refused` receipt (outcome=failed, refuse code, slug, op, payload_digest) before the error returns.
 * Closed-session and receipt-cap refusals cannot append (no room / sealed) and say so
 * (refused_receipt.sealed:false with the reason). Hash-linked and sealed, not signed.
 */
export const SESSION_REFUSAL_SPEC = "AZRT-REFUSAL-RECEIPT-1.0";

async function sealSessionRefusal(session, err, { slug, op, payloadText, payloadDigest = null }, nowIso) {
  const digest = payloadDigest && typeof payloadDigest.sha256 === "string"
    ? { sha256: payloadDigest.sha256, bytes: Number(payloadDigest.bytes) || 0 }
    : await digestText(payloadText == null ? "" : String(payloadText));
  const { execAuditFields } = await import("./audit-path.js");
  const audit = execAuditFields(session.receipts, { slug, op });
  // RIB-018 follow-up: a slug that is not a FragGate registry name, or an op that is not one of its ops
  // (unknown_slug, op_not_allowed with a typed op, ...), is stored as null + a short sha256, never as text.
  const { boundedSlugOp } = await import("./receipt-guard.js");
  const b = await boundedSlugOp(String(slug || "").trim().toLowerCase() || null, String(op || "").trim() || null);
  const receipt = await appendReceipt(session, "refused", {
    refusal: {
      spec: SESSION_REFUSAL_SPEC,
      code: err.code || "session_error",
      status: err.status || 500,
      slug: b.slug,
      op: b.op,
      ...(b.slug_sha256 ? { slug_sha256: b.slug_sha256 } : {}),
      ...(b.op_sha256 ? { op_sha256: b.op_sha256 } : {}),
      payload_digest: digest.sha256,
      payload_bytes: digest.bytes,
      executed: false,
    },
  }, nowIso, {
    attempt_link: { outcome: "failed" },
    ...(audit ? { audit_status: audit.audit_status, ...(audit.audit_path ? { audit_path: audit.audit_path } : {}) } : {}),
  });
  session.updated_at = nowIso;
  return receipt;
}

export async function recordIntent(session, args, nowIso) {
  // These two cannot seal: the session is sealed/expired, or has no receipt room. They stay as before.
  try {
    requireOpen(session, nowIso);
    requireReceiptRoom(session);
  } catch (err) {
    err.extra = { ...(err.extra || {}), refused_receipt: { sealed: false, reason: err.code === "receipt_cap" ? "receipt cap reached; no room to seal" : "session is not open; no receipt possible" } };
    throw err;
  }
  try {
    return await recordIntentInner(session, args, nowIso);
  } catch (err) {
    if (!err || !err.status || err.status >= 500) throw err;
    const receipt = await sealSessionRefusal(session, err, args || {}, nowIso);
    err.extra = { ...(err.extra || {}), refused_receipt: { sealed: true, seq: receipt.seq, hash: receipt.hash, code: err.code } };
    err.sessionDirty = true; // caller must persist the appended refused receipt
    throw err;
  }
}

async function recordIntentInner(session, { slug, op, payload, payloadText, knownSlugs, banner, schemaHash, decision = null, goal = null, writerEpoch = null }, nowIso) {
  // AZRT-SCHEMA-PIN-1.0: the open receipt pinned the tools/list schema; drift stops the session.
  const pinned = (session.receipts || [])[0] && session.receipts[0].schema_hash;
  if (pinned && schemaHash && pinned !== schemaHash) {
    throw sessionError(409, "SCHEMA-DRIFT", "The tools/list schema changed since this session opened. Nothing ran. Open a new session to pin the new schema.", {
      ok: false,
      spec: "AZRT-SCHEMA-PIN-1.0",
      pinned_schema_hash: pinned,
      current_schema_hash: schemaHash,
      executed: false,
    });
  }
  // RIB-050: epoch and stop are enforced here, in runtime code, before anything runs.
  const { presentSessionEpoch } = await import("./writer-fence.js");
  const presented = presentSessionEpoch(session, writerEpoch);
  if (presented) throw sessionError(presented.status, presented.code, presented.message, { executed: false, written: false });
  if (session.writer_stopped) {
    throw sessionError(409, "SESSION-STOPPED", "The runtime stopped this session. Stopping a run does not undo an external effect. Nothing ran.", { executed: false, written: false });
  }
  // RIB-015: the run path only READS spec state; a revoked or stale spec stops it before anything runs.
  const { specState } = await import("./issuer-append.js");
  const state = specState(session.receipts);
  if (state.revoked) {
    throw sessionError(409, "SPEC-REVOKED", "The issuer revoked this run's spec. Nothing ran.", { executed: false, revoked_at_seq: state.revoked_at_seq });
  }
  if (state.stale) {
    throw sessionError(409, "SPEC-STALE", "The issuer marked this run's spec stale. Nothing ran.", { executed: false, stale_at_seq: state.stale_at_seq });
  }
  // RIB-048: bindings are checked before exec. No attestation is not_checked, never a pass.
  const { assertBuildAttestForExec } = await import("./build-attest.js");
  const attest = await assertBuildAttestForExec(session);
  if (!attest.allowed) throw sessionError(409, attest.code, attest.message, { executed: false, build_attest: attest.view, written: false });
  session._build_attest = attest.view;
  const bytes = new TextEncoder().encode(payloadText).length;
  const allowed = assertExecAllowed(session, { slug, op, payloadBytes: bytes, knownSlugs, nowIso });
  const digest = await digestText(payloadText);
  // RIB-055: a named recorder must be healthy before a high-impact intent is accepted.
  // Commit checks again before the exec receipt is sealed.
  const { execAuditFields, AUDIT_PATH_DOWN, AUDIT_SPEC } = await import("./audit-path.js");
  const audit = execAuditFields(session.receipts, { slug: allowed.slug, op: allowed.op });
  if (audit && audit.high_impact && audit.audit_status !== "audited") {
    throw sessionError(409, AUDIT_PATH_DOWN, `audit path is ${audit.audit_path.status}; high-impact op refused. Nothing ran.`, {
      spec: AUDIT_SPEC,
      executed: false,
      mutated: false,
      audit_status: "unaudited",
      audit_path: audit.audit_path,
    });
  }
  // RIB-043: a DecisionGATE-gated exec binds its approver into this intent (same row hash as the action).
  const { isGated, approverFor } = await import("./approver.js");
  const intentId = `${session.id}:${(session.receipts || []).length + 1}`;
  const approver = isGated(session.policy, decision)
    ? await approverFor({ decision, slug: allowed.slug, op: allowed.op, payload_digest: digest.sha256, goal, nowIso, session_id: session.id, intent_id: intentId, receipts: session.receipts })
    : null;
  const intent = {
    intent_id: intentId,
    slug: allowed.slug,
    op: allowed.op,
    recorded_at: nowIso,
    payload_digest: digest.sha256,
    payload_bytes: digest.bytes,
    kv_increment_requested: session.policy.kv_increment === true,
    kv_increment_applied: false,
    kv_note: "aziel-runtime does not increment product download counters.",
    identity: "Aziel Eliab",
    ...(approver ? { approver, goal_hash: approver.record.goal_hash } : {}),
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

export async function commitExec(session, { intent, status, latencyMs, requestDigest, responseDigest, error, upstream, responseBytes, contentType, engine, request_id, attempt_n, parent_receipt_id, correlation_id, outcome, additive }, nowIso) {
  requireOpen(session, nowIso);
  if (session && session.writer_stopped) {
    const err = sessionError(409, "SESSION-STOPPED", "The runtime stopped this session. Stopping a run does not undo an external effect. Nothing was sealed.", { executed: false });
    const receipt = await sealSessionRefusal(session, err, { slug: intent && intent.slug, op: intent && intent.op, payloadText: "" }, nowIso);
    err.extra = { executed: false, refused_receipt: { sealed: true, seq: receipt.seq, hash: receipt.hash, code: "SESSION-STOPPED" } };
    err.sessionDirty = true;
    throw err;
  }
  requireReceiptRoom(session);
  if (!session.pending_intent || session.pending_intent.intent_id !== intent.intent_id) {
    throw sessionError(409, "intent_mismatch", "pending intent does not match commit");
  }
  // RIB-055: re-gate before any exec receipt. A path that is not healthy now cannot commit,
  // and the pending intent is dropped so a later beat cannot seal this result.
  const { execAuditFields, AUDIT_PATH_DOWN, AUDIT_SPEC } = await import("./audit-path.js");
  const audit = execAuditFields(session.receipts, {
    slug: session.pending_intent.slug,
    op: session.pending_intent.op,
  });
  const withheld = additive && additive.engine_withheld === true;
  if (audit && audit.high_impact && (audit.audit_status !== "audited" || withheld)) {
    if (audit.audit_status !== "audited") {
      const err = sessionError(409, AUDIT_PATH_DOWN, `audit path is ${audit.audit_path.status}; high-impact op refused at commit. The result was not sealed.`, {
        spec: AUDIT_SPEC,
        executed: false,
        mutated: false,
        audit_status: "unaudited",
        audit_path: audit.audit_path,
      });
      const receipt = await sealSessionRefusal(session, err, {
        slug: session.pending_intent.slug,
        op: session.pending_intent.op,
        payloadDigest: { sha256: session.pending_intent.payload_digest, bytes: session.pending_intent.payload_bytes },
      }, nowIso);
      session.pending_intent = null;
      session.updated_at = nowIso;
      err.extra = { ...(err.extra || {}), refused_receipt: { sealed: true, seq: receipt.seq, hash: receipt.hash, code: AUDIT_PATH_DOWN } };
      err.sessionDirty = true;
      throw err;
    }
    session.pending_intent = null;
    session.updated_at = nowIso;
    const err = sessionError(409, AUDIT_PATH_DOWN, "audit path was not healthy before this high-impact op. The exec was not run and was not sealed.", {
      spec: AUDIT_SPEC,
      executed: false,
      mutated: false,
      refused_receipt: { sealed: false, reason: "path is healthy at commit; a down refusal would not match the chain. Nothing was sealed." },
    });
    err.sessionDirty = true;
    throw err;
  }
  const eng = engine && typeof engine === "object" ? engine : {};
  const mode = eng.mode || (upstream ? "proxy_fallback" : "local");
  const isLocal = mode === "local" && eng.true_engine_runtime === true && Boolean(eng.engine_digest);
  // RIB-016: bind the exec to the policy in force and the receipt that set it; seal optional evidence as unchecked.
  const { policyHashOf, policyReceiptOf, evidenceOf } = await import("./evidence-fields.js");
  const policyRef = policyReceiptOf(session.receipts);
  const binding = {
    policy_hash: await policyHashOf(session.policy),
    policy_receipt_ref: policyRef ? policyRef.hash : null,
  };
  const evidence = evidenceOf(additive && additive.evidence);
  // RIB-043: approved_at is the exec receipt's own ts; restamp the record and its hash at seal time.
  let sealedIntent = session.pending_intent;
  if (sealedIntent && sealedIntent.approver) {
    const { restampApprover } = await import("./approver.js");
    sealedIntent = { ...sealedIntent, approver: await restampApprover(sealedIntent.approver, nowIso) };
  }
  // RIB-068: recompute the model stamp from the provider fields. A caller-supplied finding is dropped.
  const { MODEL_RECEIPT_FIELDS, modelStampOf, withSwapFinding } = await import("./model-provenance.js");
  const additiveInput = additive && typeof additive === "object" ? { ...additive } : additive;
  if (additiveInput && typeof additiveInput === "object") {
    for (const key of MODEL_RECEIPT_FIELDS) delete additiveInput[key];
  }
  const modelStamp = modelStampOf(additive);
  const modelFields = modelStamp ? await withSwapFinding(session.receipts, modelStamp) : {};
  const receipt = await appendReceipt(session, "exec", {
    // Seal the intent the session recorded (incl. any RIB-043 approver), not the caller's echo of it.
    intent: sealedIntent,
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
    ...additiveReceiptFields(additiveInput),
    ...modelFields,
    ...binding,
    ...(evidence ? { evidence } : {}),
    ...(audit ? { audit_status: audit.audit_status, ...(audit.audit_path ? { audit_path: audit.audit_path } : {}) } : {}),
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

/**
 * A paused session takes no stale or revoke stamp: resume (src/resume-anchor.js) requires the chain to be
 * exactly the frozen head, so any row appended while paused would make every resume refuse
 * RESUME-ANCHOR-MISMATCH forever. Refuse before anything is appended; the session is left unchanged.
 */
function refuseWhilePaused(session, stamp) {
  if (session && session.paused) {
    throw sessionError(409, "SESSION-PAUSED", `session is paused; POST /resume before appending a ${stamp} stamp`, { session_id: session.id, stamp, written: false });
  }
}

/**
 * RIB-014: append a stale stamp against the sealed spec (never edits stamp #1). Event-driven only.
 * Writer authority (issuer-only) is RIB-015.
 */
export async function applyStale(session, nowIso, raw, { issuerKey = null } = {}) {
  if (!session) throw sessionError(404, "session_not_found", "session not found");
  if (session.closed) throw sessionError(409, "session_closed", "session is sealed; no further stamps", { session_id: session.id });
  // RIB-015: only the issuer recorded at genesis may append a stale stamp.
  const { assertIssuer } = await import("./issuer-append.js");
  const written_by = await assertIssuer(session, issuerKey);
  refuseWhilePaused(session, "stale");
  const { staleRequestOf, specWorldVersion, specStaleness, SPEC_STALE } = await import("./spec-stale.js");
  const req = staleRequestOf(raw);
  if (!req.ok) throw sessionError(400, req.code, req.message);
  const first = (session.receipts || [])[0];
  if (!first || !first.expect_hash) throw sessionError(409, "SPEC-STALE-NO-SPEC", "no expected-state spec was sealed as stamp #1; nothing to mark stale");
  const current = specStaleness(session.receipts).current_world_version ?? specWorldVersion(session.receipts);
  if (current != null && current === req.new_world_version) {
    throw sessionError(409, "SPEC-STALE-SAME-VERSION", "new_world_version equals the version already in force; the world did not move");
  }
  return appendReceipt(session, "stale", {}, nowIso, {
    stale: {
      spec: SPEC_STALE,
      spec_ref: { receipt_hash: first.hash, expect_hash: first.expect_hash },
      spec_world_version: current,
      new_world_version: req.new_world_version,
      reason: req.reason,
    },
    written_by,
  });
}

/** RIB-015: issuer-only revocation of the run/spec. Append-only; nothing runs or grades after it. */
export async function applyRevoke(session, nowIso, raw, { issuerKey = null } = {}) {
  if (!session) throw sessionError(404, "session_not_found", "session not found");
  if (session.closed) throw sessionError(409, "session_closed", "session is sealed; no further stamps", { session_id: session.id });
  const { assertIssuer, specState, ISSUER_SPEC } = await import("./issuer-append.js");
  const written_by = await assertIssuer(session, issuerKey);
  refuseWhilePaused(session, "revoke");
  const reason = raw && raw.reason != null ? String(raw.reason).trim() : "";
  if (!reason || reason.length > 512) throw sessionError(400, "REVOKE-INVALID", "revoke needs { reason } (1-512 chars).");
  const st = specState(session.receipts);
  if (st.revoked) throw sessionError(409, "REVOKE-DUPLICATE", "already revoked", { revoked_at_seq: st.revoked_at_seq });
  if (Number.isInteger(session.writer_epoch)) {
    const { bumpSessionFence } = await import("./writer-fence.js");
    bumpSessionFence(session, { stopped: false, side_effects: [] });
  }
  const first = session.receipts[0];
  return appendReceipt(session, "revoke", {}, nowIso, {
    revoke: { spec: ISSUER_SPEC, genesis_hash: first.hash, ...(first.expect_hash ? { expect_hash: first.expect_hash } : {}), reason },
    written_by,
  });
}

/** RIB-050: issuer-gated stop. Reuses the RIB-015 issuer key. Bumps the writer epoch. Does not undo external effects. */
export async function applyStop(session, nowIso, raw, { issuerKey = null } = {}) {
  if (!session) throw sessionError(404, "session_not_found", "session not found");
  if (session.closed) throw sessionError(409, "session_closed", "session is sealed; no further stamps", { session_id: session.id });
  const { assertIssuer } = await import("./issuer-append.js");
  const written_by = await assertIssuer(session, issuerKey);
  refuseWhilePaused(session, "stop");
  if (session.writer_stopped) throw sessionError(409, "STOP-DUPLICATE", "already stopped", { written: false });
  const reason = raw && raw.reason != null ? String(raw.reason).trim() : "";
  if (!reason || reason.length > 512) throw sessionError(400, "STOP-INVALID", "stop needs { reason } (1-512 chars).");
  requireReceiptRoom(session);
  const { bumpSessionFence, sideEffectsOf, NOT_UNDONE, FENCE_SPEC } = await import("./writer-fence.js");
  const side_effects = sideEffectsOf(raw, session.pending_intent);
  bumpSessionFence(session, { stopped: true, side_effects });
  session.pending_intent = null;
  return appendReceipt(session, "stop", {}, nowIso, {
    stop: { spec: FENCE_SPEC, reason, side_effects, not_undone: NOT_UNDONE },
    written_by,
  });
}

/** RIB-052: declare (in-session, before close) that a frozen artifact changes: { artifact, new_sha256, reason }. */
export async function applyArtifactChange(session, nowIso, raw) {
  if (!session) throw sessionError(404, "session_not_found", "session not found");
  if (session.closed) throw sessionError(409, "session_closed", "session is sealed; no further stamps", { session_id: session.id });
  refuseWhilePaused(session, "artifact_change");
  requireReceiptRoom(session);
  const { changeRequestOf } = await import("./frozen-artifacts.js");
  const req = changeRequestOf(raw, session.receipts);
  if (!req.ok) throw sessionError(req.code === "FROZEN-ARTIFACT-NONE" ? 409 : 400, req.code, req.message);
  return appendReceipt(session, "artifact_change", {}, nowIso, { artifact_change: req.change });
}

/** RIB-055: seal a recorder health transition (healthy / degraded / down). Does not exec. */
export async function applyAuditHealth(session, nowIso, raw) {
  if (!session) throw sessionError(404, "session_not_found", "session not found");
  if (session.closed) throw sessionError(409, "session_closed", "session is sealed; no further stamps", { session_id: session.id });
  refuseWhilePaused(session, "audit_path");
  requireReceiptRoom(session);
  const { healthTransitionOf } = await import("./audit-path.js");
  const req = healthTransitionOf(session.receipts, raw);
  if (!req.ok) throw sessionError(req.status || 400, req.code, req.message, { written: false, executed: false, spec: req.spec });
  return appendReceipt(session, "audit_path", {}, nowIso, { audit_path: req.audit_path });
}

export async function applyClose(session, nowIso, { force = false, additive = null, delivered = null, observerRecords = null } = {}) {
  if (!session) throw sessionError(404, "session_not_found", "session not found");
  // RIB-052: when stamp #1 froze artifacts, the harness check runs first (bad delivery input refuses, nothing written).
  let delivery = null;
  let audit = null;
  if (!session.closed) {
    const { deliveryCheckFor } = await import("./frozen-artifacts.js");
    delivery = await deliveryCheckFor(session.receipts, delivered);
    if (delivery && !delivery.ok) throw sessionError(400, delivery.code, delivery.message);
    // RIB-055: bad observer records refuse before any close row is written. Omitted records are a finding, not a skip.
    const { auditCloseFor } = await import("./audit-path.js");
    audit = await auditCloseFor(session.receipts, observerRecords);
    if (audit && !audit.ok) throw sessionError(audit.status || 400, audit.code, audit.message, { written: false, executed: false });
  }
  if (additive && additive.verdict != null) {
    const { specStaleness } = await import("./spec-stale.js");
    const st = specStaleness(session.receipts);
    const { specState } = await import("./issuer-append.js");
    if (specState(session.receipts).revoked) {
      throw sessionError(409, "SPEC-REVOKED", "The issuer revoked this spec; no verdict can be graded against it. Close without a verdict.");
    }
    if (st.status === "stale") {
      throw sessionError(409, "EXPECT-SPEC-STALE", "the sealed spec was marked stale before close; no verdict can be graded against it. Close without a verdict.", { stale_at_seq: st.stale_at_seq, current_world_version: st.current_world_version });
    }
  }
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
  let closeAdditive = additiveReceiptFields(additive);
  let deliveryReceipt = null;
  let gapReceipt = null;
  let reconcileReceipt = null;
  const verdictRefused = (delivery && !delivery.check.verdict_allowed) || (audit && audit.clean === false);
  if (verdictRefused && closeAdditive.verdict != null) {
    const { verdict: _refused, ...rest } = closeAdditive;
    closeAdditive = rest;
  }
  if (delivery) {
    // Harness-written; the caller has no field that reaches this receipt and cannot skip it.
    deliveryReceipt = await appendReceipt(session, "delivery_check", {}, nowIso, { delivery_check: delivery.check });
  }
  if (audit) {
    // Harness-written. The caller cannot supply findings, and verify fails closed if either row is missing.
    if (audit.gap) gapReceipt = await appendReceipt(session, "unaudited_gap", {}, nowIso, { unaudited_gap: audit.gap });
    reconcileReceipt = await appendReceipt(session, "reconcile", {}, nowIso, { reconcile: audit.reconcile });
  }
  const receipt = await appendReceipt(session, "close", {
    sealed: true,
    receipt_count: session.receipts.length + 1,
    wipe_on_close: wipe,
    wiped: session.wiped === true,
    sandbox_kind: SANDBOX_KIND,
    isolate_class: ISOLATE_CLASS,
    guest_vm: false,
  }, nowIso, closeAdditive);
  return {
    session,
    receipt,
    ...(delivery ? { delivery_check: deliveryReceipt } : {}),
    ...(gapReceipt ? { unaudited_gap: gapReceipt } : {}),
    ...(reconcileReceipt ? { reconcile: reconcileReceipt } : {}),
    ...(audit ? { audit_refused: audit.refused } : {}),
  };
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
    close_reserve: closeReserveFor(session),
    honesty: session.honesty,
    ...(auditPublic(session) ? { audit_path: auditPublic(session) } : {}),
    ...(session.vpn_auto ? { vpn_auto: session.vpn_auto } : {}),
    ...(Number.isInteger(session.writer_epoch) ? { writer_epoch: session.writer_epoch, writer_stopped: session.writer_stopped === true } : {}),
  };
}
