/**
 * WhistleLock engine (port of workers/download-tracker/src/runtime.js).
 * Preview hashes only. Never stores drops. Not a mailer. Author: Aziel Eliab.
 */

export const PRODUCT = "whistlelock";
export const VERSION = "0.1.0";
export const SPEC = "whistlelock-v0";
export const GENESIS_PREV = "0".repeat(64);
export const LIMITATION =
  "THIS IS: local directory store + TemporalLock-shaped rows + local dead-man copy + optional refresh of an operator-supplied source_url at verify. THIS IS NOT: rotating encrypted identity mailbox; IP-masking/proxy; mixnet/anonymous relay; boot scraper of inboxes; a public website; UL; FoldLock; EmployeeLock; GodLock; legal advice. Hosted API never holds whistle files. Not a mailer.";

const HASHED_FIELDS = [
  "drop_id",
  "entry_id",
  "kind",
  "payload_sha256",
  "prev_hash",
  "source_note",
  "summary",
  "timestamp",
];

function asStr(v) {
  if (v == null) return "";
  return String(v);
}

export function canonicalJson(fields) {
  const payload = {};
  for (const key of HASHED_FIELDS) payload[key] = asStr(fields[key]);
  const keys = Object.keys(payload).sort();
  return "{" + keys.map((k) => JSON.stringify(k) + ":" + JSON.stringify(payload[k])).join(",") + "}";
}

async function sha256Hex(data) {
  const buf = typeof data === "string" ? new TextEncoder().encode(data) : data;
  const digest = await crypto.subtle.digest("SHA-256", buf);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function pickFields(body) {
  const src = body && typeof body === "object" ? body : {};
  const row = src.row && typeof src.row === "object" ? src.row : src;
  return {
    entry_id: asStr(row.entry_id || "WL-0001"),
    timestamp: asStr(row.timestamp || ""),
    kind: asStr(row.kind || "drop"),
    summary: asStr(row.summary || "sample drop"),
    drop_id: asStr(row.drop_id || ""),
    payload_sha256: asStr(row.payload_sha256 || ""),
    source_note: asStr(row.source_note || ""),
    prev_hash: asStr(row.prev_hash || GENESIS_PREV),
  };
}

function bytesFromBody(body, scratch) {
  const src = body && typeof body === "object" ? body : {};
  let bytes;
  if (src.b64 || src.bytes_b64) {
    const raw = String(src.b64 || src.bytes_b64);
    const bin = atob(raw);
    bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  } else if (src.text != null) {
    bytes = new TextEncoder().encode(String(src.text));
  } else if (src.bytes instanceof Uint8Array) {
    bytes = src.bytes;
  } else {
    bytes = new TextEncoder().encode(JSON.stringify(src));
  }
  if (scratch) scratch.push(bytes);
  return bytes;
}

export async function hashPreview(body, scratch) {
  const bytes = bytesFromBody(body, scratch);
  const digest = await sha256Hex(bytes);
  return {
    product: PRODUCT,
    version: VERSION,
    spec: SPEC,
    kv_increment: false,
    stored: false,
    true_engine_runtime: true,
    limitation: LIMITATION,
    bytes: bytes.byteLength,
    sha256: digest,
  };
}

export async function canonPreview(body) {
  const fields = pickFields(body || {});
  if (!fields.timestamp) {
    fields.timestamp = new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
  }
  const canonical = canonicalJson(fields);
  const digest = await sha256Hex(canonical);
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
    genesis: fields.prev_hash === GENESIS_PREV,
  };
}
