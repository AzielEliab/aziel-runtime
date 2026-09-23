/**
 * ForgeReceipts engine (port of workers/download-tracker/src/runtime.js receipt).
 * Local-style receipt JSON. Not legal advice. Does not contact courts.
 * Author: Aziel Eliab.
 */
import { normalizeAttemptLink } from "../../receipt-attempt.js";

export const PRODUCT = "forgereceipts";
export const NAME = "ForgeReceipts";
export const VERSION = "0.3.0";
export const SPEC = "FR-0.3";
export const AUTHOR = "Aziel Eliab";
export const ROLE = "local receipt mint + verify";
export const BANNER = "Not legal advice. No court filing.";
export const MOTTO = "Child's Best Interests First. Integrity Over Narrative. Local Control. Always.";
export const GENESIS_PREV_HASH = "0".repeat(64);
export const MAX_NOTE = 16384;
export const AXES = Object.freeze([
  "kind",
  "child_impact",
  "evidence",
  "confidence",
  "hash",
  "request_id",
  "attempt_n",
  "parent_receipt_id",
  "correlation_id",
]);
export const NEIGHBORS = Object.freeze(["temporallock", "decisiongate"]);
export const STUB_REFUSE = Object.freeze(["court", "legal_advice", "odyssey", "file_store"]);
export const LIMITATION =
  "THIS IS: a local-first evidence integrity helper that packages receipts. THIS IS NOT: legal advice, a court filing, counsel, Odyssey/email/cloud contact, or a guarantee of any court outcome. Hosted / in-process never stores files.";

async function sha256Hex(bytes) {
  const data = bytes instanceof Uint8Array ? bytes : new TextEncoder().encode(String(bytes));
  const dig = await crypto.subtle.digest("SHA-256", data);
  const arr = new Uint8Array(dig);
  let out = "";
  for (let i = 0; i < arr.length; i++) out += arr[i].toString(16).padStart(2, "0");
  return out;
}

function utcNow() {
  return new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
}

export function withBanner(obj) {
  return {
    banner: BANNER,
    motto: MOTTO,
    legal_advice: false,
    court_filing: false,
    odyssey: false,
    court: false,
    ...obj,
  };
}

function formatConfidence(c) {
  const n = Number(c);
  const v = Number.isFinite(n) ? n : 1;
  return v.toFixed(6);
}

export function composeEvidence(body, kind, childImpact) {
  const lines = [
    "KIND: " + kind,
    "CHILD_IMPACT: " + String(childImpact || "").trim(),
    "",
    body && String(body).trim() ? String(body).trim() : "(no additional body)",
  ];
  return lines.join("\n");
}

/**
 * Legacy seals (no integer attempt_n) hash timestamp, summary, evidence,
 * confidence, prev_hash only. New receipts also hash request_id, attempt_n,
 * parent_receipt_id, correlation_id, and outcome. Changing any of those
 * changes the hash. correlation_id is JSON null when the caller omitted it,
 * so a later value cannot be written onto the same seal.
 * parent_receipt_id is the prior attempt's receipt hash, or null on the first.
 * FragGate ledger prev is not this field.
 */
export function canonicalBytes(timestamp, summary, evidence, confidence, prevHash, attempt = null) {
  const obj = {
    evidence,
    prev_hash: prevHash,
    summary,
    timestamp,
  };
  if (attempt && attempt.linked) {
    obj.attempt_n = attempt.attempt_n;
    obj.correlation_id = attempt.correlation_id == null ? null : attempt.correlation_id;
    obj.outcome = attempt.outcome == null ? null : attempt.outcome;
    obj.parent_receipt_id = attempt.parent_receipt_id == null ? null : attempt.parent_receipt_id;
    obj.request_id = attempt.request_id == null ? null : attempt.request_id;
  }
  const ordered = Object.keys(obj).concat(["confidence"]).sort();
  const raw =
    "{" +
    ordered
      .map((k) => {
        if (k === "confidence") return JSON.stringify(k) + ":" + formatConfidence(confidence);
        return JSON.stringify(k) + ":" + JSON.stringify(obj[k]);
      })
      .join(",") +
    "}";
  return new TextEncoder().encode(raw);
}

export function storedAttempt(rec) {
  if (!rec || typeof rec !== "object" || !Number.isInteger(rec.attempt_n)) return null;
  return {
    linked: true,
    request_id: rec.request_id == null || rec.request_id === "" ? null : String(rec.request_id),
    attempt_n: rec.attempt_n,
    parent_receipt_id: rec.parent_receipt_id == null || rec.parent_receipt_id === "" ? null : String(rec.parent_receipt_id),
    correlation_id: rec.correlation_id == null || rec.correlation_id === "" ? null : String(rec.correlation_id),
    outcome: typeof rec.outcome === "string" && rec.outcome ? rec.outcome : null,
  };
}

export async function receipt(body) {
  const note = body && body.note != null ? String(body.note) : body && body.summary != null ? String(body.summary) : "";
  if (!note.trim()) return withBanner({ ok: false, error: "note is required", status: 400 });
  if (note.length > MAX_NOTE) return withBanner({ ok: false, error: "note too large", max: MAX_NOTE, status: 413 });
  const ctx = body.context && typeof body.context === "object" ? body.context : {};
  const kind = String(ctx.kind || body.kind || "incident");
  const childImpact = String(ctx.child_impact || ctx.childImpact || "Child's best interests recorded as context for this local receipt.");
  const evidenceBody = String(ctx.evidence || body.evidence || note);
  const summary = String(ctx.summary || body.summary || note).slice(0, 500);
  const confidence = ctx.confidence == null && body.confidence == null ? 1.0 : Number(ctx.confidence ?? body.confidence);
  if (!Number.isFinite(confidence) || confidence < 0 || confidence > 1) {
    return withBanner({ ok: false, error: "confidence must be a float in [0.0, 1.0]", status: 400 });
  }
  const link = normalizeAttemptLink(body, { generate: true, defaultOutcome: "completed" });
  if (!link.ok) return withBanner({ ok: false, error: link.error, status: link.status || 400 });
  const timestamp = utcNow();
  const prev = GENESIS_PREV_HASH;
  const evidence = composeEvidence(evidenceBody, kind, childImpact);
  const bytes = canonicalBytes(timestamp, summary, evidence, confidence, prev, link);
  const digest = await sha256Hex(bytes);
  return withBanner({
    ok: true,
    product: PRODUCT,
    receipt: {
      timestamp,
      summary,
      evidence,
      confidence,
      prev_hash: prev,
      hash: digest,
      receipt_id: digest,
      kind,
      child_impact: childImpact,
      note,
      context: ctx,
      request_id: link.request_id,
      attempt_n: link.attempt_n,
      parent_receipt_id: link.parent_receipt_id,
      correlation_id: link.correlation_id,
      outcome: link.outcome,
      hash_covers_attempt: true,
      ledger_prev_is_retry_parent: false,
    },
    genesis: true,
    durable: false,
    stored: false,
    true_engine_runtime: true,
    note_to_caller:
      "Local-style receipt JSON. request_id, attempt_n, parent_receipt_id, correlation_id, and outcome are inside the hash. parent_receipt_id is the prior attempt hash, or null on the first. FragGate ledger prev is call order only. Corrections are new receipts. Not legal advice. No court filing. Does not call Odyssey.",
  });
}

function receiptFields(src) {
  const rec = src && src.receipt && typeof src.receipt === "object" ? src.receipt : src;
  return rec && typeof rec === "object" ? rec : {};
}

export async function verifyReceipt(body) {
  const rec = receiptFields(body);
  const timestamp = rec.timestamp;
  const summary = rec.summary;
  const evidence = rec.evidence;
  const prev = rec.prev_hash || GENESIS_PREV_HASH;
  const stored = rec.hash ? String(rec.hash) : "";
  if (!timestamp || !summary || !evidence || !stored) {
    return withBanner({
      ok: false,
      product: PRODUCT,
      match: false,
      error: "verify needs receipt.timestamp, summary, evidence, hash",
      status: 400,
    });
  }
  const confidence = rec.confidence == null ? 1.0 : Number(rec.confidence);
  if (!Number.isFinite(confidence) || confidence < 0 || confidence > 1) {
    return withBanner({ ok: false, product: PRODUCT, match: false, error: "confidence must be a float in [0.0, 1.0]", status: 400 });
  }
  const attempt = storedAttempt(rec);
  const bytes = canonicalBytes(timestamp, summary, evidence, confidence, prev, attempt);
  const recomputed = await sha256Hex(bytes);
  const match = recomputed === stored;
  return withBanner({
    ok: match,
    product: PRODUCT,
    version: VERSION,
    match,
    hash: stored,
    recomputed,
    prev_hash: prev,
    durable: false,
    stored: false,
    true_engine_runtime: true,
    limitation: LIMITATION,
    author: AUTHOR,
  });
}

export async function importExport(body) {
  const src = body && typeof body === "object" ? body : {};
  const mode = String(src.mode || src.action || "export").toLowerCase();
  if (mode === "import" || mode === "verify") {
    return { action: "import", ...(await verifyReceipt(src)) };
  }
  let rec = src.receipt && typeof src.receipt === "object" ? src.receipt : null;
  if (!rec && (src.note || src.summary)) {
    const minted = await receipt(src);
    if (!minted.ok) return { action: "export", ...minted };
    rec = minted.receipt;
  }
  if (!rec) {
    return withBanner({
      ok: false,
      product: PRODUCT,
      error: "import_export export needs a receipt object or note/summary to mint",
      status: 400,
    });
  }
  return withBanner({
    ok: true,
    product: PRODUCT,
    version: VERSION,
    action: "export",
    envelope: {
      product: PRODUCT,
      version: VERSION,
      schema: "forgereceipts-receipt-v1",
      receipt: rec,
      stored: false,
      durable: false,
    },
    stored: false,
    durable: false,
    true_engine_runtime: true,
    limitation: LIMITATION,
    author: AUTHOR,
    note: "Client-held JSON. Hosted / in-process never stores files.",
  });
}
