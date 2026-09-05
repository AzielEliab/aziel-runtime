/**
 * TemporalLock engine (port of workers/download-tracker/src/runtime.js).
 * Stateless hash-chained receipts. Author: Aziel Eliab.
 */
export const PRODUCT = "temporallock";
export const VERSION = "0.2.0";
export const MOTTO = "Receipts, not truth claims.";
export const ROLE = "immutable timeslate lattice";
export const AUTHOR = "Aziel Eliab";
const STATICCLOCK_HOST = "https://staticclock-download-tracker.vibelock.workers.dev";
const AZOS_HOST = "https://azos-download-tracker.vibelock.workers.dev";
const HOST = "https://temporallock-download-tracker.vibelock.workers.dev";
export const LIMITATION = "THIS IS: hash-chained receipts anyone can verify (genesis, append, verify, timeslate lattice). THIS IS NOT: a truth claim, a scheduler, or a stored chain. Hosted / in-process is stateless: the client sends the chain.";
export const GENESIS_PREV_HASH = "0".repeat(64);
export const CONFIDENCE_DECIMALS = 6;
export const CONF_PLACEHOLDER = "__TL_CONFIDENCE__";
export class ReceiptError extends Error {
  constructor(msg) { super(msg); this.name = "ReceiptError"; }
}
export class ChainError extends Error {
  constructor(msg) { super(msg); this.name = "ChainError"; }
}

function formatConfidence(confidence) {
  return Number(confidence).toFixed(CONFIDENCE_DECIMALS);
}

function canonicalBytes(timestamp, summary, evidence, confidence, prev_hash) {
  const payload = {
    confidence: CONF_PLACEHOLDER,
    evidence,
    prev_hash,
    summary,
    timestamp,
  };
  const keys = Object.keys(payload).sort();
  let raw = "{" + keys.map((k) => JSON.stringify(k) + ":" + JSON.stringify(payload[k])).join(",") + "}";
  raw = raw.replace(`"${CONF_PLACEHOLDER}"`, formatConfidence(confidence));
  return new TextEncoder().encode(raw);
}

async function digest(timestamp, summary, evidence, confidence, prev_hash) {
  const bytes = canonicalBytes(timestamp, summary, evidence, confidence, prev_hash);
  const buf = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function requireHex64(name, value) {
  if (typeof value !== "string") throw new ReceiptError(`${name} must be a string`);
  const text = value.trim().toLowerCase();
  if (text.length !== 64 || /[^0-9a-f]/.test(text)) {
    throw new ReceiptError(`${name} must be 64 lowercase hex characters`);
  }
  return text;
}

function validateClickIndex(value) {
  const n = Number(value);
  if (!Number.isInteger(n) || n < 0) throw new ReceiptError("click_index must be an integer >= 0");
  return n;
}

function sortedJsonBytes(payload) {
  const keys = Object.keys(payload).sort();
  const raw = "{" + keys.map((k) => JSON.stringify(k) + ":" + JSON.stringify(payload[k])).join(",") + "}";
  return new TextEncoder().encode(raw);
}

async function sha256HexBytes(bytes) {
  const buf = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function timeslateDigest(receiptHash, staticclockClick, prevTimeslateHash, clickIndex) {
  const payload = {
    click_index: validateClickIndex(clickIndex),
    prev_timeslate_hash: requireHex64("prev_timeslate_hash", prevTimeslateHash),
    receipt_hash: requireHex64("receipt_hash", receiptHash),
    staticclock_click: requireHex64("staticclock_click", staticclockClick),
  };
  return sha256HexBytes(sortedJsonBytes(payload));
}

export async function staticclockClickDigest(payload) {
  const body = { ...(payload && typeof payload === "object" ? payload : {}) };
  body.product = "staticclock";
  if (body.kind == null) body.kind = "gear-click";
  return sha256HexBytes(sortedJsonBytes(body));
}

async function defaultGearClick(timestamp, clickIndex) {
  return staticclockClickDigest({ kind: "gear-click", timestamp, click_index: validateClickIndex(clickIndex) });
}

function prevTimeslateLink(prev) {
  if (!prev) return GENESIS_PREV_HASH;
  if (prev.timeslate_hash) return prev.timeslate_hash;
  return prev.hash;
}

function minClickIndex(prev) {
  if (!prev) return 0;
  if (prev.timeslate_hash || prev.staticclock_click) return prev.click_index || 0;
  return 0;
}

export class LatticeError extends Error {
  constructor(msg) { super(msg); this.name = "LatticeError"; }
}

async function bindTimeslate(rec, prev, body) {
  const floor = minClickIndex(prev);
  let index;
  if (body.click_index == null || body.click_index === "") {
    index = prev ? floor + 1 : 0;
  } else {
    index = validateClickIndex(body.click_index);
  }
  if (index < floor) {
    throw new LatticeError(`StaticClock rollback refused: click_index ${index} < previous ${floor}`);
  }
  let click;
  if (body.staticclock_click) {
    click = requireHex64("staticclock_click", String(body.staticclock_click));
  } else if (body.click_payload && typeof body.click_payload === "object") {
    click = await staticclockClickDigest(body.click_payload);
  } else {
    click = await defaultGearClick(rec.timestamp, index);
  }
  const prevTl = prevTimeslateLink(prev);
  const tlHash = await timeslateDigest(rec.hash, click, prevTl, index);
  return {
    ...rec,
    staticclock_click: click,
    click_index: index,
    prev_timeslate_hash: prevTl,
    timeslate_hash: tlHash,
  };
}

function utcNow() {
  return new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
}

function requireStr(name, value) {
  if (typeof value !== "string") throw new ReceiptError(`${name} must be a string`);
  return value;
}

function validateEvidence(evidence) {
  evidence = requireStr("evidence", evidence);
  if (evidence.trim() === "") throw new ReceiptError("empty evidence is invalid");
  return evidence;
}

function validateConfidence(confidence) {
  const value = Number(confidence);
  if (!Number.isFinite(value) || value < 0 || value > 1) {
    throw new ReceiptError("confidence must be a float in [0.0, 1.0] inclusive");
  }
  return value;
}

function validateSummary(summary) {
  return requireStr("summary", summary);
}

function validateTimestamp(timestamp) {
  const ts = requireStr("timestamp", timestamp);
  if (ts.trim() === "") throw new ReceiptError("timestamp must be a non-empty UTC ISO-8601 string");
  return ts;
}

export async function createReceipt({ summary, evidence, confidence = 1.0, timestamp = null, prev_hash = GENESIS_PREV_HASH }) {
  const ts = timestamp == null ? utcNow() : timestamp;
  const conf = validateConfidence(confidence);
  const recHash = await digest(
    validateTimestamp(ts),
    validateSummary(summary),
    validateEvidence(evidence),
    conf,
    requireStr("prev_hash", prev_hash),
  );
  return {
    timestamp: ts,
    summary,
    evidence,
    confidence: conf,
    prev_hash,
    hash: recHash,
    staticclock_click: "",
    click_index: 0,
    prev_timeslate_hash: "",
    timeslate_hash: "",
  };
}

function receiptFromDict(data) {
  const missing = ["timestamp", "summary", "evidence", "confidence", "prev_hash", "hash"].filter((k) => !(k in data));
  if (missing.length) throw new ReceiptError(`receipt missing fields: ${missing}`);
  const rec = {
    timestamp: validateTimestamp(data.timestamp),
    summary: validateSummary(data.summary),
    evidence: validateEvidence(data.evidence),
    confidence: validateConfidence(data.confidence),
    prev_hash: requireStr("prev_hash", data.prev_hash),
    hash: requireStr("hash", data.hash),
    staticclock_click: data.staticclock_click ? String(data.staticclock_click) : "",
    click_index: data.click_index == null ? 0 : Number(data.click_index),
    prev_timeslate_hash: data.prev_timeslate_hash ? String(data.prev_timeslate_hash) : "",
    timeslate_hash: data.timeslate_hash ? String(data.timeslate_hash) : "",
  };
  return rec;
}

async function recomputedHash(rec) {
  return digest(rec.timestamp, rec.summary, rec.evidence, rec.confidence, rec.prev_hash);
}

export function parseChain(body) {
  if (body == null) return [];
  let raw = body;
  if (typeof body === "string") {
    const text = body.trim();
    if (!text) return [];
    if (text.startsWith("[")) raw = JSON.parse(text);
    else {
      const rows = [];
      for (const line of text.split("\n")) {
        const t = line.trim();
        if (!t) continue;
        rows.push(JSON.parse(t));
      }
      return rows.map(receiptFromDict);
    }
  }
  if (Array.isArray(raw)) return raw.map(receiptFromDict);
  if (raw && typeof raw === "object") {
    if (Array.isArray(raw.chain)) return raw.chain.map(receiptFromDict);
    if (Array.isArray(raw.receipts)) return raw.receipts.map(receiptFromDict);
  }
  return [];
}

export async function verify(receipts) {
  const errors = [];
  const n = receipts.length;
  const first = n ? receipts[0].hash : null;
  const last = n ? receipts[n - 1].hash : null;
  for (let i = 0; i < n; i++) {
    const rec = receipts[i];
    const expected = await recomputedHash(rec);
    if (rec.hash !== expected) {
      errors.push(`index ${i}: stored hash ${rec.hash} != recomputed ${expected}`);
    }
    if (i === 0) continue;
    const prev = receipts[i - 1];
    if (rec.prev_hash !== prev.hash) {
      errors.push(`index ${i}: prev_hash ${rec.prev_hash} != previous.hash ${prev.hash}`);
    }
  }
  return { ok: errors.length === 0, length: n, first_hash: first, last_hash: last, errors };
}

export async function verifyLattice(receipts, receiptErrors) {
  const errors = Array.isArray(receiptErrors) ? [...receiptErrors] : [];
  const n = receipts.length;
  let bound = 0;
  let lastTl = null;
  let lastClick = null;
  for (let i = 0; i < n; i++) {
    const rec = receipts[i];
    if (!rec.timeslate_hash) {
      if (i > 0 && receipts[i - 1].timeslate_hash) {
        errors.push(`index ${i}: missing timeslate after lattice bind`);
      }
      continue;
    }
    bound += 1;
    let expected;
    try {
      expected = await timeslateDigest(rec.hash, rec.staticclock_click, rec.prev_timeslate_hash, rec.click_index);
    } catch (err) {
      errors.push(`index ${i}: ${err.message || err}`);
      continue;
    }
    if (rec.timeslate_hash !== expected) {
      errors.push(`index ${i}: stored timeslate_hash ${rec.timeslate_hash} != recomputed ${expected}`);
    }
    if (i === 0) {
      if (rec.prev_timeslate_hash !== GENESIS_PREV_HASH) {
        errors.push(`index 0: prev_timeslate_hash ${rec.prev_timeslate_hash} != genesis zeros`);
      }
    } else {
      const prev = receipts[i - 1];
      const expectedPrev = prevTimeslateLink(prev);
      if (rec.prev_timeslate_hash !== expectedPrev) {
        errors.push(`index ${i}: prev_timeslate_hash ${rec.prev_timeslate_hash} != previous timeslate ${expectedPrev}`);
      }
      const floor = minClickIndex(prev);
      if (rec.click_index < floor) {
        errors.push(`index ${i}: StaticClock rollback: click_index ${rec.click_index} < ${floor}`);
      }
    }
    lastTl = rec.timeslate_hash;
    lastClick = rec.click_index;
  }
  return {
    ok: errors.length === 0,
    length: n,
    bound,
    cross_hash: bound > 0,
    first_hash: n ? receipts[0].hash : null,
    last_hash: n ? receipts[n - 1].hash : null,
    last_timeslate_hash: lastTl,
    last_click_index: lastClick,
    errors,
    receipt_ok: !(receiptErrors && receiptErrors.length),
    role: ROLE,
    staticclock: STATICCLOCK_HOST,
    azos: AZOS_HOST,
    note: "Timeslate lattice integrity only. Receipts, not truth claims. AZ-OS prefab hooks may write here; this log does not execute software.",
  };
}

export async function genesis(body) {
  const summary = body.summary;
  const evidence = body.evidence;
  if (summary == null) throw new ReceiptError("summary is required");
  if (evidence == null) throw new ReceiptError("evidence is required");
  const existing = parseChain(body.chain != null ? body.chain : body.receipts);
  if (existing.length) throw new ChainError("chain already exists; use append");
  let rec = await createReceipt({
    summary: String(summary),
    evidence: String(evidence),
    confidence: body.confidence == null ? 1.0 : body.confidence,
    timestamp: body.timestamp || null,
    prev_hash: GENESIS_PREV_HASH,
  });
  rec = await bindTimeslate(rec, null, body);
  return { product: PRODUCT, version: VERSION, motto: MOTTO, role: ROLE, author: AUTHOR, action: "genesis", receipt: rec, chain: [rec] };
}

export async function append(body) {
  const receipts = parseChain(body.chain != null ? body : body.chain);
  // parseChain on full body also looks at body.chain / body.receipts
  const chain = parseChain(body);
  if (!chain.length) throw new ChainError("chain does not exist or is empty; use genesis");
  let rec = await createReceipt({
    summary: String(body.summary),
    evidence: String(body.evidence),
    confidence: body.confidence == null ? 0.7 : body.confidence,
    timestamp: body.timestamp || null,
    prev_hash: chain[chain.length - 1].hash,
  });
  rec = await bindTimeslate(rec, chain[chain.length - 1], body);
  return { product: PRODUCT, version: VERSION, motto: MOTTO, role: ROLE, author: AUTHOR, action: "appended", receipt: rec, chain: [...chain, rec] };
}

export async function timeslate(body) {
  const chain = parseChain(body);
  if (!chain.length) return genesis(body);
  return append(body);
}

async function sha256Text(text) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text == null ? "" : String(text)));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function gate(body) {
  const content = body.content != null ? String(body.content) : (body.file_text != null ? String(body.file_text) : "");
  const fileName = body.file || body.name || "payload";
  const digestHex = body.sha256 || body.file_sha256 || await sha256Text(content);
  const evidence = `sha256:${digestHex} path:${fileName}`;
  const summary = body.summary || `gate accept ${fileName}`;
  let chain = parseChain(body);
  let rec;
  let action;
  if (!chain.length) {
    rec = await createReceipt({
      summary,
      evidence,
      confidence: body.confidence == null ? 1.0 : body.confidence,
      timestamp: body.timestamp || null,
      prev_hash: GENESIS_PREV_HASH,
    });
    rec = await bindTimeslate(rec, null, body);
    chain = [rec];
    action = "genesis";
  } else {
    rec = await createReceipt({
      summary,
      evidence,
      confidence: body.confidence == null ? 1.0 : body.confidence,
      timestamp: body.timestamp || null,
      prev_hash: chain[chain.length - 1].hash,
    });
    rec = await bindTimeslate(rec, chain[chain.length - 1], body);
    chain = [...chain, rec];
    action = "appended";
  }
  const result = await verifyLattice(chain, (await verify(chain)).errors);
  return {
    product: PRODUCT,
    version: VERSION,
    motto: MOTTO,
    role: ROLE,
    author: AUTHOR,
    ok: result.ok,
    accepted: Boolean(result.ok),
    action,
    file: fileName,
    file_sha256: digestHex,
    receipt: rec.hash,
    timeslate_hash: rec.timeslate_hash,
    click_index: rec.click_index,
    staticclock_click: rec.staticclock_click,
    length: result.length,
    bound: result.bound,
    errors: result.errors,
    chain,
  };
}
