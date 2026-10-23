/**
 * RIB-055 / AZRT-AUDIT-PATH-1.0: out-of-band recorder reconciliation + fail-closed audit-path health.
 *
 * A session may name an external recorder on stamp #1: observer id + where its records live.
 * That location is a name. This runtime does not dial it, does not resolve Cap-7 or `.aziel`,
 * and does not treat a name as a registrar or a public egress address. Receipts stay hash-linked
 * and sealed, not signed.
 *
 * The runtime seals an audit-path health stamp (healthy / degraded / down) on open and on each
 * high-impact exec. High-impact is the existing FragGate mutate class (fraggateOpAccess: write-shaped
 * and unknown ops) plus the DecisionGATE mutate ops check and evaluate. While the path is not
 * healthy those ops refuse AUDIT-PATH-DOWN before anything runs, and the refusal is sealed.
 * While the recorder is down or degraded, every exec and refusal in that span is sealed
 * audit_status=unaudited.
 *
 * On close the harness (not the worker) seals an unaudited-gap receipt for each non-healthy span
 * (start, end, rows affected) and a reconcile receipt. Reconcile diffs hash-addressed observer
 * records against exec receipts. Unmatched observer actions and unmatched receipts are findings.
 * The worker has no field that writes those receipts and cannot skip them: verify recomputes both
 * and fails closed when one is missing, forged, or not clean. Sessions with no recorder are untouched.
 *
 * Author: Aziel Eliab.
 */
import { canonicalize, sha256Hex } from "./session-core.js";
import { fraggateOpAccess } from "./mcp-safeguard.js";
import { observerKey } from "./evidence-fields.js";

export const AUDIT_SPEC = "AZRT-AUDIT-PATH-1.0";
export const AUDIT_PATH_DOWN = "AUDIT-PATH-DOWN";
const HEX64 = /^[a-f0-9]{64}$/;
const HEALTH = new Set(["healthy", "degraded", "down"]);
const KINDS = new Set(["exec", "net", "file"]);
const ID_RE = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,79}$/;
const SELF_OBSERVERS = new Set(["aziel-runtime", "runtime", "session", "self", "worker"]);
const DECISIONGATE_MUTATE_OPS = new Set(["check", "evaluate"]);
const KEY_MATERIAL = /private[_ -]?key|-----BEGIN [A-Z0-9 ]*-----/i;
const TAIL_EVENTS = new Set(["delivery_check", "unaudited_gap", "reconcile", "close"]);
export const MAX_OBSERVER_RECORDS = 64;
const MAX_AT = 256;
const MAX_REASON = 512;

function bad(code, message, status = 400) {
  return { ok: false, code, spec: AUDIT_SPEC, message, status, executed: false, written: false };
}

function cleanName(value) {
  return String(value == null ? "" : value).normalize("NFKC").replace(/\p{Default_Ignorable_Code_Point}/gu, "").trim();
}

function looksLikeCap7(value) {
  const s = String(value).toLowerCase();
  return s.includes(".aziel") || s.includes("aziel://") || s.includes("cap-7") || s.includes("cap7");
}

/** FragGate mutate class, plus DecisionGATE check/evaluate. Unknown ops stay mutating (fail closed). */
export function isHighImpactOp(slug, op) {
  const s = String(slug || "").trim().toLowerCase();
  const o = String(op || "").trim().toLowerCase();
  if (!o) return true;
  if (s === "decisiongate" && DECISIONGATE_MUTATE_OPS.has(o)) return true;
  return fraggateOpAccess(o).mutating === true;
}

export function recorderFrom(receipts) {
  const first = (receipts || [])[0];
  return first && first.recorder && first.recorder_hash ? first.recorder : null;
}

export function currentHealth(receipts) {
  let status = null;
  for (const r of receipts || []) {
    if (!r) continue;
    if ((r.event === "open" || r.event === "audit_path") && r.audit_path && HEALTH.has(r.audit_path.status)) {
      status = r.audit_path.status;
    }
  }
  return status;
}

function healthStamp(recorder, status, extra = {}) {
  return {
    spec: AUDIT_SPEC,
    status,
    observer_id: recorder.observer_id,
    records_ref: recorder.records_ref,
    ...(extra.beat_hash ? { beat_hash: extra.beat_hash } : {}),
    ...(extra.reason ? { reason: extra.reason } : {}),
  };
}

/** Normalize a recorder named at open. null = none (old behaviour). Does not resolve the location. */
export async function recorderOf(raw, auditHealth, { sessionId = null } = {}) {
  if (raw == null) {
    if (auditHealth != null) return bad("AUDIT-RECORDER-INVALID", "audit_health requires a recorder { observer_id, records_at }.");
    return null;
  }
  if (typeof raw !== "object" || Array.isArray(raw)) {
    return bad("AUDIT-RECORDER-INVALID", "recorder must be { observer_id, records_at }.");
  }
  if (KEY_MATERIAL.test(typeof raw.observer_id === "string" ? raw.observer_id : "") || KEY_MATERIAL.test(typeof raw.records_at === "string" ? raw.records_at : "")) {
    return bad("AUDIT-RECORDER-INVALID", "recorder fields must not carry key material.");
  }
  const observer_id = cleanName(raw.observer_id);
  const records_at = cleanName(raw.records_at);
  if (!ID_RE.test(observer_id)) return bad("AUDIT-RECORDER-INVALID", "observer_id must be 1-80 chars [A-Za-z0-9._:-], starting with a letter or digit.");
  const key = observerKey(observer_id);
  if (SELF_OBSERVERS.has(key) || (sessionId && key === observerKey(sessionId))) {
    return bad("AUDIT-RECORDER-INVALID", "observer_id must name an external recorder, not the runtime or this session.");
  }
  if (!records_at || records_at.length > MAX_AT || /[\u0000-\u001f]/.test(records_at)) {
    return bad("AUDIT-RECORDER-INVALID", `records_at is where the recorder's records live: 1-${MAX_AT} chars, no control characters. It is stored as a name and is not resolved.`);
  }
  const status = auditHealth == null ? "healthy" : String(auditHealth);
  if (!HEALTH.has(status)) return bad("AUDIT-PATH-INVALID", "audit_health must be healthy, degraded, or down.");
  const names_only = looksLikeCap7(records_at);
  const records_ref = await sha256Hex(canonicalize({ spec: AUDIT_SPEC, observer_id, records_at }));
  const recorder = {
    spec: AUDIT_SPEC,
    observer_id,
    records_at,
    records_ref,
    names_only,
    resolved: false,
  };
  const recorder_hash = await sha256Hex(canonicalize({ spec: AUDIT_SPEC, recorder }));
  return { ok: true, recorder, recorder_hash, audit_path: healthStamp(recorder, status) };
}

/** Fields sealed on an exec or refusal when a recorder was named. Null when none was named. */
export function execAuditFields(receipts, { slug, op }) {
  const recorder = recorderFrom(receipts);
  if (!recorder) return null;
  const status = currentHealth(receipts) || "down";
  const high = isHighImpactOp(slug, op);
  const audited = status === "healthy";
  const audit_path = healthStamp(recorder, status);
  return {
    audit_status: audited ? "audited" : "unaudited",
    high_impact: high,
    ...(high || !audited ? { audit_path } : {}),
  };
}

/** Seal a health transition. Down needs no beat. Returning to healthy requires a beat hash. */
export function healthTransitionOf(receipts, raw) {
  const recorder = recorderFrom(receipts);
  if (!recorder) return bad("AUDIT-RECORDER-NONE", "stamp #1 named no recorder; nothing to mark.", 409);
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return bad("AUDIT-PATH-INVALID", "audit path needs { status }.");
  if (KEY_MATERIAL.test(typeof raw.reason === "string" ? raw.reason : "")) {
    return bad("AUDIT-PATH-INVALID", "audit path fields must not carry key material.");
  }
  const status = String(raw.status || "");
  if (!HEALTH.has(status)) return bad("AUDIT-PATH-INVALID", "status must be healthy, degraded, or down.");
  const current = currentHealth(receipts) || "down";
  if (status === current) return bad("AUDIT-PATH-UNCHANGED", `audit path is already ${current}.`, 409);
  let beat_hash = null;
  if (status === "healthy") {
    beat_hash = String(raw.beat_hash || "").toLowerCase();
    if (!HEX64.test(beat_hash)) {
      return bad("AUDIT-BEAT-REQUIRED", "returning the audit path to healthy requires beat_hash (sha256 of the recorder beat). The outage stays on the chain.");
    }
  }
  let reason = null;
  if (raw.reason != null) {
    reason = String(raw.reason).trim();
    if (!reason || reason.length > MAX_REASON) return bad("AUDIT-PATH-INVALID", `reason must be 1-${MAX_REASON} chars when set.`);
  }
  return { ok: true, audit_path: healthStamp(recorder, status, { beat_hash, reason }) };
}

function pointOf(r) {
  return { seq: r.seq, hash: r.hash, ts: r.ts };
}

/** Contiguous spans where health is not healthy. Tail receipts (close harness) are not part of a span. */
export function unauditedSpans(receipts) {
  const list = (receipts || []).filter((r) => r && !TAIL_EVENTS.has(r.event));
  const spans = [];
  let status = null;
  let start = null;
  const push = (end) => {
    if (!start || !end || status == null || status === "healthy") return;
    let rows = 0;
    for (const r of receipts || []) {
      if (!r || typeof r.seq !== "number") continue;
      if (r.seq < start.seq || r.seq > end.seq) continue;
      if (r.event === "exec" || r.event === "refused") rows += 1;
    }
    spans.push({ status, start: pointOf(start), end: pointOf(end), rows_affected: rows });
  };
  for (let i = 0; i < list.length; i++) {
    const r = list[i];
    const next = (r.event === "open" || r.event === "audit_path") && r.audit_path ? r.audit_path.status : null;
    if (!HEALTH.has(next)) continue;
    if (status == null) {
      status = next;
      if (next !== "healthy") start = r;
      continue;
    }
    if (next === status) continue;
    if (next === "healthy") {
      push(list[i - 1]);
      start = null;
      status = next;
      continue;
    }
    if (status === "healthy") {
      start = r;
      status = next;
      continue;
    }
    push(list[i - 1]);
    start = r;
    status = next;
  }
  if (start) push(list[list.length - 1]);
  return spans;
}

export function gapObject(spans) {
  let rows_affected = 0;
  for (const s of spans) rows_affected += s.rows_affected;
  return { spec: AUDIT_SPEC, written_by: "harness", gaps: spans, rows_affected };
}

function recordBody(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return bad("AUDIT-RECORD-INVALID", "each observer record must be an object.");
  if (["target", "slug", "op"].some((k) => typeof raw[k] === "string" && KEY_MATERIAL.test(raw[k]))) {
    return bad("AUDIT-RECORD-INVALID", "observer records must not carry key material.");
  }
  const kind = String(raw.kind || "");
  if (!KINDS.has(kind)) return bad("AUDIT-RECORD-INVALID", "observer record kind must be exec, net, or file.");
  const body = { kind };
  if (raw.slug != null) body.slug = String(raw.slug).trim().toLowerCase();
  if (raw.op != null) body.op = String(raw.op).trim();
  for (const key of ["payload_digest", "detail_sha256", "receipt_hash"]) {
    if (raw[key] == null) continue;
    const hex = String(raw[key]).toLowerCase();
    if (!HEX64.test(hex)) return bad("AUDIT-RECORD-INVALID", `${key} must be 64 hex.`);
    body[key] = hex;
  }
  if (raw.target != null) {
    const target = cleanName(raw.target);
    if (!target || target.length > MAX_AT || /[\u0000-\u001f]/.test(target)) return bad("AUDIT-RECORD-INVALID", `target must be 1-${MAX_AT} chars.`);
    body.target = target;
  }
  if (kind === "exec" && !(body.receipt_hash || (body.slug && body.op && body.payload_digest))) {
    return bad("AUDIT-RECORD-INVALID", "an exec observer record needs receipt_hash or slug + op + payload_digest.");
  }
  if ((kind === "net" || kind === "file") && !body.target && !body.receipt_hash) {
    return bad("AUDIT-RECORD-INVALID", "a net or file observer record needs target or receipt_hash.");
  }
  if (body.slug != null && !body.slug) return bad("AUDIT-RECORD-INVALID", "slug must be non-empty when set.");
  if (body.op != null && !body.op) return bad("AUDIT-RECORD-INVALID", "op must be non-empty when set.");
  return { ok: true, body };
}

async function hashRecord(body) {
  return sha256Hex(canonicalize({ spec: AUDIT_SPEC, record: body }));
}

/** Hash-addressed observer records. null/omitted = the observer sent nothing (a finding, not a skip). */
export async function observerRecordsOf(raw) {
  if (raw == null) return { ok: true, present: false, records: [] };
  if (!Array.isArray(raw) || raw.length > MAX_OBSERVER_RECORDS) {
    return bad("AUDIT-RECORD-INVALID", `observer_records must be an array of at most ${MAX_OBSERVER_RECORDS} hash-addressed records.`);
  }
  const records = [];
  for (const item of raw) {
    const parsed = recordBody(item);
    if (!parsed.ok) return parsed;
    const record_hash = await hashRecord(parsed.body);
    if (item.record_hash != null && String(item.record_hash).toLowerCase() !== record_hash) {
      return bad("AUDIT-RECORD-HASH-MISMATCH", "record_hash does not match the canonical observer record. The harness will not seal a mismatched address.");
    }
    records.push({ ...parsed.body, record_hash });
  }
  return { ok: true, present: true, records };
}

function recordMatches(record, exec) {
  if (record.receipt_hash && record.receipt_hash === exec.hash) return true;
  const intent = exec.payload && exec.payload.intent;
  if (!intent) return false;
  if (record.slug && record.op && record.payload_digest) {
    return record.slug === intent.slug && record.op === intent.op && record.payload_digest === intent.payload_digest;
  }
  return false;
}

export function reconcileObject(recorder, records, present, execs) {
  const findings = [];
  if (!present) findings.push({ kind: "observer_records_absent" });
  const used = new Set();
  const list = present ? records : [];
  for (const record of list) {
    const hit = (execs || []).find((e) => e && e.hash && !used.has(e.hash) && recordMatches(record, e));
    if (hit) used.add(hit.hash);
    else findings.push({ kind: "unmatched_observer", record_hash: record.record_hash, record: { ...record } });
  }
  for (const exec of execs || []) {
    if (!exec || used.has(exec.hash)) continue;
    const intent = (exec.payload && exec.payload.intent) || {};
    findings.push({
      kind: "unmatched_receipt",
      receipt_hash: exec.hash,
      seq: exec.seq,
      slug: intent.slug || null,
      op: intent.op || null,
    });
  }
  const counts = { unmatched_observer: 0, unmatched_receipt: 0, observer_records_absent: 0 };
  for (const f of findings) {
    if (f.kind === "unmatched_observer") counts.unmatched_observer += 1;
    else if (f.kind === "unmatched_receipt") counts.unmatched_receipt += 1;
    else if (f.kind === "observer_records_absent") counts.observer_records_absent += 1;
  }
  return {
    spec: AUDIT_SPEC,
    written_by: "harness",
    observer_id: recorder.observer_id,
    records_ref: recorder.records_ref,
    records_present: present === true,
    records: present ? records : [],
    exec_count: (execs || []).length,
    findings,
    counts,
    clean: findings.length === 0,
    refused: findings.length ? { code: "AUDIT-RECONCILE-FINDING", sealed: true } : null,
  };
}

/** Harness close payload. null when stamp #1 named no recorder. Bad records refuse before anything is written. */
export async function auditCloseFor(receipts, observerRaw) {
  const recorder = recorderFrom(receipts);
  if (!recorder) return null;
  const parsed = await observerRecordsOf(observerRaw);
  if (!parsed.ok) return parsed;
  const spans = unauditedSpans(receipts);
  const execs = (receipts || []).filter((r) => r && r.event === "exec");
  const reconcile = reconcileObject(recorder, parsed.records, parsed.present, execs);
  const gap = spans.length ? gapObject(spans) : null;
  const clean = reconcile.clean === true && !gap;
  const refused = clean ? null : { code: gap ? "AUDIT-UNAUDITED-GAP" : "AUDIT-RECONCILE-FINDING", sealed: true };
  return { ok: true, gap, reconcile, clean, refused };
}

function statusBefore(list, index) {
  let status = null;
  for (let i = 0; i < index; i++) {
    const r = list[i];
    if (!r) continue;
    if ((r.event === "open" || r.event === "audit_path") && r.audit_path && HEALTH.has(r.audit_path.status)) status = r.audit_path.status;
  }
  return status;
}

function stampAgrees(recorder, stamp) {
  return stamp && stamp.spec === AUDIT_SPEC && stamp.observer_id === recorder.observer_id && stamp.records_ref === recorder.records_ref && HEALTH.has(stamp.status);
}

/**
 * Verify from the chain alone (fail closed). Sessions with no recorder return status no_recorder
 * and add no errors, so older receipts verify unchanged.
 */
export async function verifyAuditPath(receipts) {
  const list = (receipts || []).filter(Boolean);
  const errors = [];
  const first = list[0] || null;
  const recorder = first && first.recorder ? first.recorder : null;
  const named = Boolean(recorder && first.recorder_hash);
  if (first && (first.recorder != null || first.recorder_hash != null)) {
    const again = recorder ? await sha256Hex(canonicalize({ spec: AUDIT_SPEC, recorder })) : null;
    if (!recorder || first.recorder_hash !== again || first.recorder.resolved !== false) {
      errors.push({ seq: first.seq ?? 1, code: "AUDIT-RECORDER-TAMPERED" });
    }
    if (!first.audit_path || !stampAgrees(recorder, first.audit_path)) errors.push({ seq: first.seq ?? 1, code: "AUDIT-STAMP-MISSING" });
  }
  if (!named) {
    for (let i = 0; i < list.length; i++) {
      const r = list[i];
      if (!r) continue;
      if (r.audit_path != null || r.audit_status != null || r.event === "audit_path" || r.event === "unaudited_gap" || r.event === "reconcile" || r.unaudited_gap != null || r.reconcile != null) {
        errors.push({ seq: r.seq ?? i + 1, code: "AUDIT-RECORDER-ABSENT" });
      }
    }
    return {
      spec: AUDIT_SPEC,
      ok: errors.length === 0,
      status: errors.length ? "failed" : "no_recorder",
      clean: null,
      health: null,
      gaps: null,
      findings: null,
      errors,
    };
  }

  let prevHealth = first.audit_path && first.audit_path.status;
  for (let i = 1; i < list.length; i++) {
    const r = list[i];
    const seq = r.seq ?? i + 1;
    if (r.recorder != null || r.recorder_hash != null) errors.push({ seq, code: "AUDIT-RECORDER-LATE" });
    if (r.event === "audit_path") {
      if (!stampAgrees(recorder, r.audit_path)) errors.push({ seq, code: "AUDIT-STAMP-MISMATCH" });
      else if (r.audit_path.status === "healthy" && prevHealth !== "healthy" && !HEX64.test(String(r.audit_path.beat_hash || ""))) {
        errors.push({ seq, code: "AUDIT-BEAT-REQUIRED" });
      }
      if (r.audit_path && HEALTH.has(r.audit_path.status)) prevHealth = r.audit_path.status;
    }
    if (r.event === "exec" || r.event === "refused") {
      const walked = statusBefore(list, i) || "down";
      const want = walked === "healthy" ? "audited" : "unaudited";
      if (r.audit_status !== want) errors.push({ seq, code: "AUDIT-STATUS-MISMATCH" });
      if (r.audit_path && r.audit_path.status !== walked) errors.push({ seq, code: "AUDIT-STAMP-MISMATCH" });
      if (!r.audit_path && (want === "unaudited" || (r.event === "exec" && isHighImpactOp(r.payload && r.payload.intent && r.payload.intent.slug, r.payload && r.payload.intent && r.payload.intent.op)))) {
        errors.push({ seq, code: "AUDIT-STAMP-MISSING" });
      }
      if (r.event === "exec") {
        const intent = r.payload && r.payload.intent;
        if (intent && isHighImpactOp(intent.slug, intent.op) && walked !== "healthy") errors.push({ seq, code: "AUDIT-HIGH-IMPACT-UNAUDITED" });
      }
      const refusalCode = r.payload && r.payload.refusal && r.payload.refusal.code;
      if (refusalCode === AUDIT_PATH_DOWN && walked === "healthy") errors.push({ seq, code: "AUDIT-STAMP-MISMATCH" });
    }
  }

  const closeIdx = list.findIndex((r) => r && r.event === "close");
  const closed = closeIdx >= 0;
  const spans = unauditedSpans(list);
  const gapReceipts = [];
  const reconcileReceipts = [];
  for (let i = 0; i < list.length; i++) {
    const r = list[i];
    if (r.event === "unaudited_gap" || r.unaudited_gap != null) gapReceipts.push({ r, i });
    if (r.event === "reconcile" || r.reconcile != null) reconcileReceipts.push({ r, i });
  }
  if (gapReceipts.length > 1) errors.push({ seq: gapReceipts[1].r.seq, code: "AUDIT-GAP-DUPLICATE" });
  if (reconcileReceipts.length > 1) errors.push({ seq: reconcileReceipts[1].r.seq, code: "AUDIT-RECONCILE-DUPLICATE" });

  let findings = null;
  if (!closed) {
    if (gapReceipts.length || reconcileReceipts.length) errors.push({ seq: (gapReceipts[0] || reconcileReceipts[0]).r.seq, code: "AUDIT-RECONCILE-FORGED" });
    if ((currentHealth(list) || "down") !== "healthy") errors.push({ seq: list[list.length - 1].seq, code: "AUDIT-PATH-NOT-HEALTHY" });
  } else {
    const reconcileAt = closeIdx - 1;
    const recRow = reconcileReceipts[0];
    if (!recRow || recRow.i !== reconcileAt || recRow.r.event !== "reconcile") {
      errors.push({ seq: list[closeIdx].seq, code: "AUDIT-RECONCILE-MISSING" });
    } else {
      const got = recRow.r.reconcile || {};
      const execs = list.slice(0, recRow.i).filter((r) => r.event === "exec");
      let records = [];
      let recordsOk = true;
      if (got.records_present === true) {
        if (!Array.isArray(got.records)) recordsOk = false;
        for (const row of recordsOk ? got.records : []) {
          if (!row || typeof row !== "object") { recordsOk = false; break; }
          const { record_hash, ...body } = row;
          const expect = await hashRecord(body);
          if (record_hash !== expect) { recordsOk = false; break; }
          records.push({ ...body, record_hash: expect });
        }
      } else if (Array.isArray(got.records) && got.records.length) recordsOk = false;
      const want = recordsOk ? reconcileObject(recorder, records, got.records_present === true, execs) : null;
      if (!recordsOk || !want || got.written_by !== "harness" || canonicalize(want) !== canonicalize(got)) {
        errors.push({ seq: recRow.r.seq, code: "AUDIT-RECONCILE-FORGED" });
      } else {
        findings = want.findings;
        if (want.findings.length) errors.push({ seq: recRow.r.seq, code: "AUDIT-RECONCILE-FINDING" });
      }
    }
    if (spans.length) {
      const gapAt = reconcileAt - 1;
      const gapRow = gapReceipts[0];
      if (!gapRow || gapRow.i !== gapAt || gapRow.r.event !== "unaudited_gap") errors.push({ seq: list[closeIdx].seq, code: "AUDIT-GAP-MISSING" });
      else {
        const wantGap = gapObject(spans);
        const gotGap = gapRow.r.unaudited_gap || {};
        if (gotGap.written_by !== "harness" || canonicalize(wantGap) !== canonicalize(gotGap)) errors.push({ seq: gapRow.r.seq, code: "AUDIT-GAP-FORGED" });
        else errors.push({ seq: gapRow.r.seq, code: "AUDIT-UNAUDITED-GAP" });
      }
    } else if (gapReceipts.length) errors.push({ seq: gapReceipts[0].r.seq, code: "AUDIT-GAP-FORGED" });
    if ((spans.length || (findings && findings.length)) && list[closeIdx].verdict != null) {
      errors.push({ seq: list[closeIdx].seq, code: "AUDIT-VERDICT-REFUSED" });
    }
  }

  const structural = errors.some((e) => e.code !== "AUDIT-UNAUDITED-GAP" && e.code !== "AUDIT-RECONCILE-FINDING" && e.code !== "AUDIT-PATH-NOT-HEALTHY");
  const dirty = errors.length > 0;
  let status = "open";
  let clean = null;
  if (structural) {
    status = "failed";
    clean = false;
  } else if (!closed) {
    status = dirty ? "unaudited" : "open";
    clean = dirty ? false : null;
  } else if (spans.length) {
    status = "unaudited";
    clean = false;
  } else if (findings && findings.length) {
    status = "findings";
    clean = false;
  } else if (dirty) {
    status = "failed";
    clean = false;
  } else {
    status = "clean";
    clean = true;
  }
  return {
    spec: AUDIT_SPEC,
    ok: errors.length === 0,
    status,
    clean,
    health: currentHealth(list),
    gaps: spans,
    findings,
    errors,
  };
}
