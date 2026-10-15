/**
 * RIB-016 / AZRT-EVIDENCE-FIELDS-1.0 (ideas from @eveliqTrace, @pocket_log_gpt, dim / @radimhfer).
 *
 * Hash-linked != true, sealed != authorized, checkable != verified. Exec receipts keep separate,
 * independently checkable evidence fields; integrity links them, verification stays per field.
 *
 * - Every new exec receipt carries policy_hash (canonical hash of the session policy in force) and
 *   policy_receipt_ref (hash of the open/policy receipt that set it). Verify fails closed when
 *   policy_hash does not match the policy sealed in the receipt it references, or when the ref is not
 *   the latest policy-setting receipt before the exec.
 * - Optional evidence block, written with every status "unchecked" (a caller can never seal "verified"):
 *     authority { grant_ref, scope }      grant_ref = hash of the open/policy receipt that granted it
 *     policy    { policy_hash, scope }
 *     execution { receipt_hash }          an earlier exec receipt in this chain
 *     effect    { observer, observation_hash, observed_at }
 * - verifyEvidence reports each field on its own: unchecked | verified | failed. Chain integrity
 *   passing never flips any field to verified. Effect is "verified" only when a supplied observation
 *   body matches the hash the caller committed to (observation_hash). The observer is a name the
 *   caller supplies and is NOT checked; it only screens out self-named observers (runtime/session,
 *   compared after NFKC + stripping zero-width/Default_Ignorable chars). No body -> "unchecked".
 * Receipts are hash-linked and sealed, not signed. Author: Aziel Eliab.
 */
import { canonicalize, sha256Hex } from "./session-core.js";

export const EVIDENCE_SPEC = "AZRT-EVIDENCE-FIELDS-1.0";
export const STATUSES = Object.freeze(["unchecked", "verified", "failed"]);
const HEX64 = /^[a-f0-9]{64}$/;
const STR_MAX = 256;
const SELF_OBSERVERS = new Set(["aziel-runtime", "runtime", "session", "self"]);
/** Observer name for comparison: NFKC, strip Default_Ignorable (incl. zero-width), trim, lowercase. */
export function observerKey(o) {
  if (o == null) return "";
  return String(o).normalize("NFKC").replace(/\p{Default_Ignorable_Code_Point}/gu, "").trim().toLowerCase();
}

export async function policyHashOf(policy) {
  return sha256Hex(canonicalize({ spec: EVIDENCE_SPEC, policy: policy == null ? null : policy }));
}

/** The policy a receipt set: open -> payload.policy, policy -> payload.after. */
export function policySetBy(receipt) {
  if (!receipt || !receipt.payload) return undefined;
  if (receipt.event === "open") return receipt.payload.policy;
  if (receipt.event === "policy") return receipt.payload.after;
  return undefined;
}

/** Latest receipt that set the policy now in force. */
export function policyReceiptOf(receipts) {
  const list = receipts || [];
  for (let i = list.length - 1; i >= 0; i--) {
    const r = list[i];
    if (r && (r.event === "open" || r.event === "policy")) return r;
  }
  return null;
}

const str = (v) => (v == null ? null : typeof v === "string" || typeof v === "number" ? String(v).slice(0, STR_MAX) : undefined);
const hex = (v) => (typeof v === "string" && HEX64.test(v.toLowerCase()) ? v.toLowerCase() : null);
function scopeOf(v) {
  if (v == null) return null;
  if (typeof v === "string") return v.slice(0, STR_MAX);
  if (typeof v === "object" && !Array.isArray(v)) {
    const out = {};
    if (v.slug != null) out.slug = String(v.slug).slice(0, 64);
    if (v.op != null) out.op = String(v.op).slice(0, 64);
    return Object.keys(out).length ? out : null;
  }
  return null;
}

/**
 * Sanitize a caller-supplied evidence block for sealing. Every field is stamped status "unchecked";
 * whatever status the caller sent is dropped. Returns null when nothing usable was sent.
 */
export function evidenceOf(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const out = { spec: EVIDENCE_SPEC };
  if (raw.authority && typeof raw.authority === "object") {
    out.authority = { grant_ref: hex(raw.authority.grant_ref), scope: scopeOf(raw.authority.scope), status: "unchecked" };
  }
  if (raw.policy && typeof raw.policy === "object") {
    out.policy = { policy_hash: hex(raw.policy.policy_hash), scope: scopeOf(raw.policy.scope), status: "unchecked" };
  }
  if (raw.execution && typeof raw.execution === "object") {
    out.execution = { receipt_hash: hex(raw.execution.receipt_hash), status: "unchecked" };
  }
  if (raw.effect && typeof raw.effect === "object") {
    out.effect = {
      observer: str(raw.effect.observer) ?? null,
      observation_hash: hex(raw.effect.observation_hash),
      observed_at: str(raw.effect.observed_at) ?? null,
      status: "unchecked",
    };
  }
  return Object.keys(out).length > 1 ? out : null;
}

function allows(policy, scope) {
  if (!policy || !scope || typeof scope !== "object") return false;
  const slugs = policy.allow_slugs || ["*"];
  const ops = policy.allow_ops || ["*"];
  const okSlug = scope.slug == null || slugs.includes("*") || slugs.includes(String(scope.slug).toLowerCase());
  const okOp = scope.op == null || ops.includes("*") || ops.includes(String(scope.op));
  return okSlug && okOp;
}

/**
 * Verify the policy binding of every exec receipt (fail closed) and report each evidence field on
 * its own. `observations` is an optional list of { receipt_hash, observer, body } supplied to the
 * verifier; never filled in by the session itself. The observer name is not authenticated.
 */
export async function verifyEvidence(receipts, { observations = [], sessionId = null } = {}) {
  const list = (receipts || []).filter(Boolean);
  const byHash = new Map(list.map((r, i) => [r.hash, { r, i }]));
  const errors = [];
  const fields = [];
  const fieldFailures = [];
  for (let i = 0; i < list.length; i++) {
    const r = list[i];
    if (r.event !== "exec") continue;
    const seq = r.seq ?? i + 1;
    // Policy binding (only receipts that carry it; old receipts stay legacy).
    let policyBinding = "legacy";
    if (r.policy_hash != null || r.policy_receipt_ref != null) {
      const ref = byHash.get(r.policy_receipt_ref);
      const latest = policyReceiptOf(list.slice(0, i));
      if (!ref || ref.i >= i || policySetBy(ref.r) === undefined) {
        errors.push({ seq, code: "POLICY-REF-UNSEALED" });
        policyBinding = "failed";
      } else if ((await policyHashOf(policySetBy(ref.r))) !== r.policy_hash) {
        errors.push({ seq, code: "POLICY-HASH-MISMATCH" });
        policyBinding = "failed";
      } else if (!latest || latest.hash !== ref.r.hash) {
        errors.push({ seq, code: "POLICY-REF-STALE" });
        policyBinding = "failed";
      } else policyBinding = "verified";
    }
    const ev = r.evidence;
    if (!ev) {
      fields.push({ seq, receipt_hash: r.hash, policy_binding: policyBinding, evidence: null });
      continue;
    }
    const out = {};
    // Each field is checked on its own; nothing here reads the chain-integrity result.
    if (ev.authority) {
      const g = byHash.get(ev.authority.grant_ref);
      const granted = g && g.i < i ? policySetBy(g.r) : undefined;
      const scope = ev.authority.scope && typeof ev.authority.scope === "object" ? ev.authority.scope : { slug: r.payload?.intent?.slug, op: r.payload?.intent?.op };
      out.authority = !ev.authority.grant_ref ? "unchecked" : granted !== undefined && allows(granted, scope) ? "verified" : "failed";
    }
    if (ev.policy) {
      out.policy = !ev.policy.policy_hash ? "unchecked" : policyBinding === "verified" && ev.policy.policy_hash === r.policy_hash ? "verified" : "failed";
    }
    if (ev.execution) {
      const e = byHash.get(ev.execution.receipt_hash);
      out.execution = !ev.execution.receipt_hash ? "unchecked" : e && e.i < i && e.r.event === "exec" ? "verified" : "failed";
    }
    if (ev.effect) {
      const self = (o) => {
        const k = observerKey(o);
        return !k || SELF_OBSERVERS.has(k) || (sessionId && k === observerKey(sessionId)) || k === observerKey(r.session_id);
      };
      if (!ev.effect.observation_hash) out.effect = "unchecked";
      else if (self(ev.effect.observer)) out.effect = "unchecked"; // the executing session cannot verify its own effect
      else {
        const obs = (observations || []).find((o) => o && o.receipt_hash === r.hash && observerKey(o.observer) === observerKey(ev.effect.observer) && !self(o.observer));
        if (!obs) out.effect = "unchecked";
        else out.effect = (await sha256Hex(typeof obs.body === "string" ? obs.body : canonicalize(obs.body))) === ev.effect.observation_hash ? "verified" : "failed";
      }
    }
    // A failed evidence field is reported on that field only; it is not a chain-integrity break.
    for (const [k, v] of Object.entries(out)) if (v === "failed") fieldFailures.push({ seq, field: k, code: `EVIDENCE-${k.toUpperCase()}-FAILED` });
    fields.push({ seq, receipt_hash: r.hash, policy_binding: policyBinding, evidence: out });
  }
  return {
    spec: EVIDENCE_SPEC,
    ok: errors.length === 0, // policy binding only (fail closed)
    ok_scope: "ok covers only the policy binding (policy_hash/policy_receipt_ref); evidence fields are in fields/fields_ok",
    fields_ok: fieldFailures.length === 0,
    fields,
    field_failures: fieldFailures,
    note: "Per-field status; chain integrity never sets any field to verified. ok covers only the policy binding. Effect is verified only when the supplied body matches the hash the caller committed to; the observer name is caller-supplied and not checked.",
    errors,
  };
}
