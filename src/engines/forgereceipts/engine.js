/**
 * ForgeReceipts engine (port of workers/download-tracker/src/runtime.js receipt).
 * Local-style receipt JSON. Not legal advice. Does not contact courts.
 * Author: Aziel Eliab.
 */

export const PRODUCT = "forgereceipts";
export const VERSION = "0.3.0";
export const BANNER = "Not legal advice. No court filing.";
export const MOTTO = "Child's Best Interests First. Integrity Over Narrative. Local Control. Always.";
export const GENESIS_PREV_HASH = "0".repeat(64);
export const MAX_NOTE = 16384;
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

export function canonicalBytes(timestamp, summary, evidence, confidence, prevHash) {
  const obj = {
    confidence: "__TL_CONFIDENCE__",
    evidence,
    prev_hash: prevHash,
    summary,
    timestamp,
  };
  const keys = Object.keys(obj).sort();
  let raw = "{" + keys.map((k) => JSON.stringify(k) + ":" + JSON.stringify(obj[k])).join(",") + "}";
  raw = raw.replace('"__TL_CONFIDENCE__"', formatConfidence(confidence));
  return new TextEncoder().encode(raw);
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
  const timestamp = utcNow();
  const prev = GENESIS_PREV_HASH;
  const evidence = composeEvidence(evidenceBody, kind, childImpact);
  const bytes = canonicalBytes(timestamp, summary, evidence, confidence, prev);
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
      kind,
      child_impact: childImpact,
      note,
      context: ctx,
    },
    genesis: true,
    durable: false,
    stored: false,
    true_engine_runtime: true,
    note_to_caller: "Local-style receipt JSON. Corrections are new receipts. Not legal advice. No court filing. Does not call Odyssey.",
  });
}
