/**
 * RIB-051 / AZRT-HARNESS-SEAL-1.0 (idea from @p4cs_pedro).
 *
 * Tool and exec receipts are sealed by the runtime session path (the harness), not by the
 * script being audited. appendReceipt sets issuer_kind=harness. chainlock_append cannot.
 * A caller that tries to mint harness is refused SELF-AUDIT-REFUSED and a sealed refusal
 * receipt is returned. An exec-shaped self-log is stored as issuer_kind=untrusted and is
 * not exec evidence. Old rows with no issuer_kind stay legacy.
 * Not live. Receipts are hash-linked and sealed, not signed.
 * Author: Aziel Eliab.
 */
import { canonicalize, sha256Hex, ZERO_HASH } from "./session-core.js";
import { decideChainFence } from "./writer-fence.js";

export const HARNESS_SPEC = "AZRT-HARNESS-SEAL-1.0";
const EVENT_RE = /^[a-z_]{1,40}$/;

let selfAuditRows = [];
let selfAttempt = 0;

export function resetHarnessSealState() {
  selfAuditRows = [];
  selfAttempt = 0;
}

export function harnessFieldsFor(event) {
  const name = String(event || "");
  if (!EVENT_RE.test(name)) return { issuer_kind: "harness", issuer_path: "runtime_session_other" };
  return { issuer_kind: "harness", issuer_path: "runtime_session_" + name };
}

export function claimsHarnessIssuer(src) {
  if (!src || typeof src !== "object") return false;
  const kind = String(src.issuer_kind || src.issuerKind || "").toLowerCase();
  if (kind === "harness") return true;
  const path = String(src.issuer_path || src.issuerPath || "");
  return path.startsWith("runtime_session");
}

export function isExecClaim(src) {
  if (!src || typeof src !== "object") return false;
  const k = String(src.k || src.kind || src.event || "").toLowerCase();
  if (k === "exec" || k === "tool_call" || k === "tool-call") return true;
  const text = `${src.subject || ""} ${src.fact || ""} ${src.s || ""} ${src.f || ""}`.toLowerCase();
  return /\bi called\b/.test(text) || text.includes("exec receipt") || text.includes("tool call");
}

async function sealRow(fields) {
  const prev = selfAuditRows.length ? selfAuditRows[selfAuditRows.length - 1].hash : ZERO_HASH;
  const body = {
    spec: HARNESS_SPEC,
    path: fields.path,
    attempt: fields.attempt,
    deny_reason: fields.deny_reason,
    code: fields.code,
    tip: fields.tip || prev,
    prev_hash: prev,
    signed: false,
  };
  const hash = await sha256Hex(canonicalize(body));
  const row = { ...body, hash };
  selfAuditRows.push(row);
  return row;
}

export async function sealSelfAuditRefusal({ path, deny_reason, tip }) {
  selfAttempt += 1;
  return sealRow({
    path: path || "chainlock_append",
    attempt: selfAttempt,
    deny_reason,
    code: "SELF-AUDIT-REFUSED",
    tip,
  });
}

export function selfAuditRefusals() {
  return selfAuditRows.slice();
}

export async function verifySealedRefusal(row, { tip = null } = {}) {
  if (!row || typeof row !== "object") return { ok: false, code: "REFUSAL-ROW-MISSING" };
  const { hash, ...body } = row;
  const expected = await sha256Hex(canonicalize(body));
  if (expected !== hash) return { ok: false, code: "REFUSAL-HASH-MISMATCH", expected, got: hash || null };
  if (tip != null && row.tip !== tip) return { ok: false, code: "REFUSAL-TIP-MISMATCH", expected: tip, got: row.tip };
  return { ok: true, code: row.code, hash };
}

/**
 * Public ChainLock append gate. harnessRefusal skips the gate (the runtime writing its own
 * refusal row). authority is the runtime fence bump, never a caller field.
 */
export async function gateChainAppend(src, chainFence, { authority = false, harnessRefusal = false, tip = null } = {}) {
  if (harnessRefusal) return { ok: true, harnessIssuer: null, writerFence: null };
  if (claimsHarnessIssuer(src)) {
    const refusal_receipt = await sealSelfAuditRefusal({
      path: "chainlock_append",
      deny_reason: "a script or agent client cannot mint issuer_kind=harness",
      tip,
    });
    return {
      ok: false,
      refuse: "self-audit",
      code: "SELF-AUDIT-REFUSED",
      message: "The harness seals exec receipts. A script cannot mint issuer_kind=harness. Nothing was appended.",
      refusal_receipt,
      written: false,
    };
  }
  const fence = decideChainFence(chainFence, src, { authority });
  if (!fence.ok) {
    selfAttempt += 1;
    const refusal_receipt = await sealRow({
      path: "chainlock_append",
      attempt: selfAttempt,
      deny_reason: fence.message,
      code: fence.code,
      tip,
    });
    return { ok: false, refuse: fence.refuse, code: fence.code, message: fence.message, refusal_receipt, written: false };
  }
  const harnessIssuer = isExecClaim(src) ? { issuer_kind: "untrusted", issuer_path: "chainlock_append" } : null;
  return { ok: true, harnessIssuer, writerFence: fence.writerFence || null };
}

export function verifyHarnessSeals(receipts) {
  const errors = [];
  let trustedExec = 0;
  let untrustedExec = 0;
  const list = receipts || [];
  for (let i = 0; i < list.length; i++) {
    const r = list[i];
    if (!r || r.issuer_kind == null) continue;
    const seq = r.seq ?? i + 1;
    const execLike = r.event === "exec" || r.k === "exec" || isExecClaim(r);
    if (r.issuer_kind === "harness") {
      if (typeof r.issuer_path !== "string" || !r.issuer_path.startsWith("runtime_session_")) {
        errors.push({ seq, code: "HARNESS-ISSUER-FORGED" });
      } else if (r.event === "exec") trustedExec += 1;
    } else if (r.issuer_kind === "untrusted") {
      if (execLike) {
        untrustedExec += 1;
        errors.push({ seq, code: "SELF-AUDIT-UNTRUSTED", not_trusted: true });
      }
    } else errors.push({ seq, code: "HARNESS-ISSUER-FORGED" });
  }
  return {
    spec: HARNESS_SPEC,
    ok: errors.length === 0,
    not_trusted: untrustedExec > 0,
    trusted_exec: trustedExec,
    untrusted_exec: untrustedExec,
    exec_evidence: trustedExec > 0 && untrustedExec === 0 ? "harness" : untrustedExec > 0 && trustedExec === 0 ? "not_trusted" : trustedExec > 0 ? "harness" : "none",
    errors,
    note: "issuer_kind=harness is minted only by the runtime session path. A self-logged row is not exec evidence. Hash-linked and sealed, not signed.",
  };
}

/** ChainLock verify: a harness label on this door is forged. An untrusted exec claim is not evidence. */
export function chainlockHarnessSummary(rows) {
  const list = (rows || []).filter(Boolean);
  if (!list.some((r) => r.issuer_kind)) return null;
  let forged = false;
  let untrustedExec = 0;
  for (const r of list) {
    if (r.issuer_kind === "harness") forged = true;
    else if (r.issuer_kind === "untrusted" && (r.k === "exec" || isExecClaim(r))) untrustedExec += 1;
  }
  return {
    spec: HARNESS_SPEC,
    ok: !forged,
    not_trusted: untrustedExec > 0,
    exec_evidence: untrustedExec > 0 ? false : !forged,
    forged,
  };
}
