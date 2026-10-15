/**
 * RIB-043 / AZRT-APPROVER-1.0 (idea from @RohanBhanotAI): the approver lives in the same row as the action.
 *
 * A session exec is GATED when the session policy sets require_decision:true, or when the exec carries
 * a `decision`. A gated exec must bring a DecisionGATE decision { proposal, overrides?, args_hash,
 * goal_hash? }. The runtime re-runs DecisionGATE on that proposal itself (final_state must be PASS),
 * binds args_hash to the executed call (slug, op, payload_digest, session_id, intent_id) and goal_hash to the executed goal,
 * and seals into the exec receipt's intent (inside the same row hash as the action):
 *   approver { spec, approver_id, decision_record_hash, approved_at, record }
 * approver_id is DecisionGATE's accountable_person as recorded in the proposal. It is DecisionGATE's
 * record of who is accountable, not a signature and not an authenticated identity.
 * Refusals (sealed as `refused` receipts by AZRT-REFUSAL-RECEIPT-1.0): APPROVER-MISSING,
 * APPROVER-NOT-PASSED, APPROVER-DRIFT. Verify: APPROVER-MISSING / APPROVER-MISMATCH; ungated execs
 * report approver:"not_required". Receipts are hash-linked and sealed, not signed. Author: Aziel Eliab.
 */
import { canonicalize, sha256Hex, sessionError } from "./session-core.js";
import { check as decisiongateCheck, proposalFromBody } from "./engines/decisiongate/engine.js";

export const APPROVER_SPEC = "AZRT-APPROVER-1.0";

/**
 * Hash of the executed call the decision must match. Binds session_id and intent_id
 * (intent_id = "<session_id>:<seq>", issued by the runtime) so a decision cannot be
 * replayed in a later exec of the same session or in another session.
 */
export async function argsHashOf({ slug, op, payload_digest, session_id, intent_id }) {
  return sha256Hex(canonicalize({ spec: APPROVER_SPEC, slug: String(slug || "").toLowerCase(), op: String(op || ""), payload_digest: payload_digest || null, session_id: session_id || null, intent_id: intent_id || null }));
}
export function sessionIdOfIntent(intent_id) {
  const s = String(intent_id || "");
  const i = s.lastIndexOf(":");
  return i > 0 ? s.slice(0, i) : null;
}
/** Re-stamp approved_at to the sealing receipt's ts and recompute decision_record_hash. */
export async function restampApprover(approver, ts) {
  const record = { ...approver.record, approved_at: ts };
  return { ...approver, approved_at: ts, record, decision_record_hash: await sha256Hex(canonicalize(record)) };
}
function usedDecisions(receipts) {
  const used = new Set();
  for (const r of receipts || []) {
    const a = r && r.event === "exec" && r.payload && r.payload.intent && r.payload.intent.approver;
    if (a && a.record) { used.add(a.decision_record_hash); used.add(a.record.args_hash); }
  }
  return used;
}
export async function goalHashOf(goal) {
  if (goal == null || goal === "") return null;
  return sha256Hex(canonicalize({ spec: APPROVER_SPEC, goal: String(goal) }));
}

/** Decision record exactly as sealed; its hash is decision_record_hash. */
export function decisionRecord({ proposal, overrides, gate, args_hash, goal_hash, approved_at }) {
  return {
    spec: APPROVER_SPEC,
    gate: "DecisionGATE",
    proposal,
    overrides: overrides == null ? null : overrides,
    final_state: gate.final_state,
    lineage: (gate.lineage || []).map((g) => ({ name: g.name, state: g.state, ...(g.overridden ? { overridden: true } : {}) })),
    args_hash,
    goal_hash: goal_hash || null,
    approved_at,
  };
}

export function isGated(policy, decision) {
  return (policy && policy.require_decision === true) || (decision != null && decision !== false);
}

/**
 * Build the approver for a gated exec, or throw a 4xx refusal (the caller seals it as a refused receipt).
 */
export async function approverFor({ decision, slug, op, payload_digest, goal, nowIso, session_id, intent_id, receipts }) {
  if (!decision || typeof decision !== "object" || !decision.proposal || typeof decision.proposal !== "object") {
    throw sessionError(403, "APPROVER-MISSING", "This action is DecisionGATE-gated. Send decision { proposal, args_hash } from DecisionGATE. Nothing ran.", { executed: false, spec: APPROVER_SPEC });
  }
  const proposal = proposalFromBody(decision.proposal);
  if (!proposal.accountable_person) {
    throw sessionError(403, "APPROVER-MISSING", "The DecisionGATE proposal names no accountable_person. Nothing ran.", { executed: false, spec: APPROVER_SPEC });
  }
  const gate = decisiongateCheck({ ...proposal, overrides: decision.overrides });
  if (!gate || gate.final_state !== "PASS") {
    throw sessionError(403, "APPROVER-NOT-PASSED", `DecisionGATE ${gate ? gate.final_state : "REFUSE"} for this proposal. Nothing ran.`, { executed: false, spec: APPROVER_SPEC, blocked_at: gate ? gate.blocked_at : null });
  }
  if (!session_id || !intent_id) {
    throw sessionError(403, "APPROVER-MISSING", "No runtime-issued session_id/intent_id to bind the decision to. Nothing ran.", { executed: false, spec: APPROVER_SPEC });
  }
  const used = usedDecisions(receipts);
  if (typeof decision.args_hash === "string" && used.has(decision.args_hash)) {
    throw sessionError(409, "APPROVER-REPLAY", "This decision was already used in this session. Nothing ran.", { executed: false, spec: APPROVER_SPEC });
  }
  const want = await argsHashOf({ slug, op, payload_digest, session_id, intent_id });
  if (decision.args_hash !== want) {
    throw sessionError(409, "APPROVER-DRIFT", "The decision's args_hash does not match the executed call (slug, op, payload, session_id, intent_id). Nothing ran.", { executed: false, spec: APPROVER_SPEC, expected_args_hash: want, decision_args_hash: decision.args_hash ?? null, intent_id });
  }
  const goalHash = await goalHashOf(goal);
  if ((decision.goal_hash ?? null) !== goalHash) {
    throw sessionError(409, "APPROVER-DRIFT", "The decision's goal_hash does not match the executed call's goal. Nothing ran.", { executed: false, spec: APPROVER_SPEC, expected_goal_hash: goalHash, decision_goal_hash: decision.goal_hash ?? null });
  }
  const record = decisionRecord({ proposal, overrides: decision.overrides, gate, args_hash: want, goal_hash: goalHash, approved_at: nowIso });
  const decision_record_hash = await sha256Hex(canonicalize(record));
  if (used.has(decision_record_hash)) {
    throw sessionError(409, "APPROVER-REPLAY", "This decision record was already used in this session. Nothing ran.", { executed: false, spec: APPROVER_SPEC });
  }
  return {
    spec: APPROVER_SPEC,
    approver_id: proposal.accountable_person,
    decision_record_hash,
    approved_at: nowIso,
    record,
    note: "approver_id is DecisionGATE's accountable_person record, not a signature.",
  };
}

/** Verify the approver on every exec receipt. Gating is sticky: once on, it stays on (fail closed). */
export async function verifyApprover(receipts) {
  const list = (receipts || []).filter(Boolean);
  const errors = [];
  const rows = [];
  let gatedEver = false;
  const seen = new Set();
  for (let i = 0; i < list.length; i++) {
    const r = list[i];
    const seq = r.seq ?? i + 1;
    if (r.event === "open" && r.payload && r.payload.policy && r.payload.policy.require_decision === true) gatedEver = true;
    if (r.event === "policy" && r.payload) {
      const b = r.payload.before || {};
      const a = r.payload.after || {};
      if ((b.require_decision === true || gatedEver) && a.require_decision !== true) {
        errors.push({ seq, code: "APPROVER-POLICY-DOWNGRADE" });
        rows.push({ seq, approver: "policy_downgrade" });
      }
      if (a.require_decision === true || b.require_decision === true) gatedEver = true;
      continue;
    }
    if (r.event !== "exec") continue;
    const intent = (r.payload && r.payload.intent) || {};
    const a = intent.approver;
    const gated = gatedEver || a != null;
    if (!gated) { rows.push({ seq, approver: "not_required" }); continue; }
    if (!a || typeof a !== "object" || !a.record || typeof a.record !== "object") { errors.push({ seq, code: "APPROVER-MISSING" }); rows.push({ seq, approver: "missing" }); continue; }
    const bad = [];
    if ((await sha256Hex(canonicalize(a.record))) !== a.decision_record_hash) bad.push("decision_record_hash");
    if (a.approver_id !== (a.record.proposal && a.record.proposal.accountable_person)) bad.push("approver_id");
    if (a.approved_at !== a.record.approved_at) bad.push("approved_at");
    if (a.approved_at !== r.ts) bad.push("approved_at_ts");
    // Re-run DecisionGATE on the sealed proposal; do not trust the sealed final_state.
    let rerun = null;
    try { rerun = a.record.proposal ? decisiongateCheck({ ...proposalFromBody(a.record.proposal), overrides: a.record.overrides ?? undefined }) : null; } catch { rerun = null; }
    if (!rerun || rerun.final_state !== "PASS" || a.record.final_state !== "PASS") bad.push("final_state");
    const sid = r.session_id || sessionIdOfIntent(intent.intent_id);
    if (!intent.intent_id || sessionIdOfIntent(intent.intent_id) !== sid) bad.push("intent_id");
    if (a.record.args_hash !== (await argsHashOf({ slug: intent.slug, op: intent.op, payload_digest: intent.payload_digest, session_id: sid, intent_id: intent.intent_id }))) bad.push("args_hash");
    if ((a.record.goal_hash ?? null) !== (intent.goal_hash ?? null)) bad.push("goal_hash");
    if (seen.has(a.decision_record_hash) || seen.has(a.record.args_hash)) bad.push("replay");
    seen.add(a.decision_record_hash); seen.add(a.record.args_hash);
    if (bad.length) {
      const code = bad.length === 1 && bad[0] === "replay" ? "APPROVER-REPLAY" : "APPROVER-MISMATCH";
      errors.push({ seq, code, fields: bad }); rows.push({ seq, approver: "mismatch", fields: bad }); continue;
    }
    rows.push({ seq, approver: "bound", approver_id: a.approver_id, decision_record_hash: a.decision_record_hash });
  }
  return { spec: APPROVER_SPEC, ok: errors.length === 0, rows, errors, note: "approver_id is DecisionGATE's record, not a signature." };
}
