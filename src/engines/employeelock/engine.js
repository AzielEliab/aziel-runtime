/**
 * EmployeeLock engine (port of workers/download-tracker/src/runtime.js).
 * Hash a proposed LOG row. Never stores xlsx. Not a court. Author: Aziel Eliab.
 */

export const PRODUCT = "employeelock";
export const VERSION = "0.1.0";
export const SPEC = "employeelock-v0";
export const GENESIS_PREV = "0".repeat(64);
export const CONF_PLACEHOLDER = "__EL_CONFIDENCE__";
export const LIMITATION =
  "THIS IS: workbook (COVER, LOG, EVIDENCE, CHAIN, OWNERS, DASH, LISTS) + CLI (init/append/import/verify) + linear hash chain + countermeasure against unowned/renamed rows. THIS IS NOT: UL or a BAL issue paper; FoldLock; TemporalLock (borrows ethic, different product); court filing / exhibit stickerer / counsel; truth score / consensus / token; remote uploader / anonymous relay; a charge sheet against a named living person. Demo rows are generic format proof, not case facts. Hosted API never stores xlsx. Not a court. Not UL. Not a truth score.";

const HASHED_FIELDS = [
  "entry_id",
  "timestamp",
  "event",
  "result",
  "blame_placed",
  "owner_named",
  "renamed_from",
  "outcome_short",
  "outcome_long",
  "evidence_ids",
  "confidence",
  "observer",
  "file_sha256s",
  "prev_hash",
];

function formatConfidence(confidence) {
  const n = Number(confidence);
  if (!Number.isFinite(n)) return "0.000000";
  return n.toFixed(6);
}

function asStr(v) {
  if (v == null) return "";
  return String(v);
}

export function canonicalJson(fields) {
  const payload = {};
  for (const key of HASHED_FIELDS) {
    payload[key] = key === "confidence" ? CONF_PLACEHOLDER : asStr(fields[key]);
  }
  const keys = Object.keys(payload).sort();
  let raw = "{" + keys.map((k) => JSON.stringify(k) + ":" + JSON.stringify(payload[k])).join(",") + "}";
  raw = raw.replace(`"${CONF_PLACEHOLDER}"`, formatConfidence(fields.confidence));
  return raw;
}

async function sha256Hex(text) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function pickFields(body) {
  const src = body && typeof body === "object" ? body : {};
  const row = src.row && typeof src.row === "object" ? src.row : src;
  return {
    entry_id: asStr(row.entry_id || "EL-0001"),
    timestamp: asStr(row.timestamp || row.timestamp_utc || ""),
    event: asStr(row.event || ""),
    result: asStr(row.result || ""),
    blame_placed: asStr(row.blame_placed != null ? row.blame_placed : row.blame || ""),
    owner_named: asStr(row.owner_named != null ? row.owner_named : row.owner || ""),
    renamed_from: asStr(row.renamed_from || ""),
    outcome_short: asStr(row.outcome_short != null ? row.outcome_short : row.short || ""),
    outcome_long: asStr(row.outcome_long != null ? row.outcome_long : row.long || ""),
    evidence_ids: asStr(row.evidence_ids || ""),
    confidence: row.confidence == null || row.confidence === "" ? 0.7 : Number(row.confidence),
    observer: asStr(row.observer || "operator"),
    file_sha256s: asStr(row.file_sha256s || ""),
    prev_hash: asStr(row.prev_hash || GENESIS_PREV),
  };
}

export async function appendPreview(body) {
  const fields = pickFields(body || {});
  if (!fields.timestamp) {
    fields.timestamp = new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
  }
  const canonical = canonicalJson(fields);
  const digest = await sha256Hex(canonical);
  const unowned = fields.owner_named.trim() === "" ? "UNOWNED" : "owned";
  const name_moved = fields.renamed_from.trim() === "" ? "stable" : "RENAMED";
  return {
    product: PRODUCT,
    version: VERSION,
    spec: SPEC,
    kv_increment: false,
    stored: false,
    true_engine_runtime: true,
    limitation: LIMITATION,
    fields,
    canonical,
    row_hash: digest,
    unowned,
    name_moved,
    genesis: fields.prev_hash === GENESIS_PREV,
  };
}

export async function verifyCanonical(body) {
  const src = body && typeof body === "object" ? body : {};
  let canonical = src.canonical != null ? String(src.canonical) : null;
  let fields = null;
  if (!canonical) {
    fields = pickFields(src);
    canonical = canonicalJson(fields);
  }
  const recomputed = await sha256Hex(canonical);
  const posted = src.row_hash ? String(src.row_hash) : null;
  const ok = posted == null ? true : posted === recomputed;
  return {
    product: PRODUCT,
    version: VERSION,
    spec: SPEC,
    kv_increment: false,
    stored: false,
    true_engine_runtime: true,
    limitation: LIMITATION,
    ok,
    canonical,
    row_hash: recomputed,
    posted_row_hash: posted,
    fields,
  };
}
