/**
 * AZNet engine (AZN-WP-0.1).
 * Silent verification side-net: hash stamps, custodian garden of hash refs,
 * memorial ledger, integrity refuse/isolate. NEVER hosts payloads.
 * Requires AZBrowser pairing token AND flag for garden / mesh ops.
 * FragGate unlocks access (DecisionGATE + ledger).
 * StaticClock gear-click stamps + TemporalLock-style receipt chain on ops.
 * Author: Aziel Eliab. Identity is Aziel Eliab only.
 */

export const PRODUCT = "aznet";
export const NAME = "AZNet";
export const VERSION = "0.1.0";
export const SPEC = "AZN-WP-0.1";
export const AUTHOR = "Aziel Eliab";
export const MOTTO = "Hash continuity without hosting.";
export const ROLE = "silent verification side-net";
export const PAIR_PEER = "azbrowser";
export const PAIR_FLAG = "azbrowser";
export const PAIR_TOKEN_MIN = 8;
export const GENESIS_PREV = "0".repeat(64);
export const CONFIDENCE_DECIMALS = 6;
export const CONF_PLACEHOLDER = "__TL_CONFIDENCE__";
export const GARDEN_CAP = 64;
export const MEMORIAL_CAP = 64;
export const RECEIPT_CAP = 64;
export const LABEL_CAP = 160;

export const LIMITATION =
  "THIS IS: AZNet AZN-WP-0.1 — silent verification side-net. Hash stamps, a custodian garden of hash refs, a memorial ledger, and integrity refuse/isolate. FragGate LIVE only. StaticClock stamps time; TemporalLock-style receipt fields ride on ops. Garden / mesh ops require pairing token AND flag with azbrowser (both required). THIS IS NOT: a payload host; a CDN; a peer content server; analytics; ranking; an integrity-repair bypass; AZ-OS / Lumen / interface / hub. Hosted never stores payloads. Author: Aziel Eliab only.";

export const GARDEN_OPS = Object.freeze([
  "garden_list",
  "stamp",
  "verify_hash",
  "memorial_list",
  "memorial_append",
]);

export const PAYLOAD_KEYS = Object.freeze([
  "payload",
  "content",
  "body",
  "bytes",
  "file",
  "blob",
  "media",
  "data",
]);

export const HOST_INTENT_KEYS = Object.freeze([
  "host",
  "host_payload",
  "store_payload",
  "serve",
  "serve_content",
  "serve_content_for_peer",
]);

const memory = {
  garden: [],
  memorials: [],
  receipts: [],
  isolated: [],
  seq: 0,
  click_index: -1,
};

export function resetAznetStore() {
  memory.garden = [];
  memory.memorials = [];
  memory.receipts = [];
  memory.isolated = [];
  memory.seq = 0;
  memory.click_index = -1;
}

function nowIso() {
  return new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
}

function clip(raw, cap) {
  return String(raw == null ? "" : raw).slice(0, cap);
}

function formatConfidence(confidence) {
  return Number(confidence).toFixed(CONFIDENCE_DECIMALS);
}

export async function sha256Hex(data) {
  const buf = typeof data === "string" ? new TextEncoder().encode(data) : data;
  const digest = await crypto.subtle.digest("SHA-256", buf);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function canonicalSorted(payload) {
  const keys = Object.keys(payload).sort();
  return "{" + keys.map((k) => JSON.stringify(k) + ":" + JSON.stringify(payload[k])).join(",") + "}";
}

function receiptCanonicalBytes(timestamp, summary, evidence, confidence, prev_hash) {
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

export async function receiptDigest(timestamp, summary, evidence, confidence, prev_hash) {
  const bytes = receiptCanonicalBytes(timestamp, summary, evidence, confidence, prev_hash);
  return sha256Hex(bytes);
}

export async function staticclockClickDigest({ timestamp, click_index, kind = "gear-click" }) {
  return sha256Hex(
    canonicalSorted({
      click_index: Number(click_index) || 0,
      kind,
      product: "staticclock",
      timestamp,
    }),
  );
}

export async function timeslateDigest(receiptHash, staticclockClick, prevTimeslateHash, clickIndex) {
  return sha256Hex(
    canonicalSorted({
      click_index: Number(clickIndex) || 0,
      prev_timeslate_hash: prevTimeslateHash,
      receipt_hash: receiptHash,
      staticclock_click: staticclockClick,
    }),
  );
}

export function isHex64(value) {
  return typeof value === "string" && /^[0-9a-f]{64}$/.test(value.trim().toLowerCase());
}

export function normalizeHex64(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function readPairFields(src) {
  const token = src.pair_token != null ? src.pair_token : src.token != null ? src.token : src.aznet_token != null ? src.aznet_token : src.pairing_token;
  const flag = src.pair_flag != null ? src.pair_flag : src.flag != null ? src.flag : src.azbrowser_flag != null ? src.azbrowser_flag : src.pairing_flag;
  return { token, flag };
}

export function inspectPair(payload) {
  const src = payload && typeof payload === "object" ? payload : {};
  const { token, flag } = readPairFields(src);
  const tokenText = token == null ? "" : String(token).trim();
  const flagText = flag == null ? "" : String(flag).trim().toLowerCase();
  const token_present = tokenText.length >= PAIR_TOKEN_MIN;
  const flag_present = flagText.length > 0;
  const flag_ok = flagText === PAIR_FLAG;
  const paired = token_present && flag_ok;
  return {
    paired,
    token_present,
    flag_present,
    flag_ok,
    peer: PAIR_PEER,
    pair_flag_required: PAIR_FLAG,
    both_required: true,
  };
}

export function hostsPayloadIntent(payload) {
  const src = payload && typeof payload === "object" ? payload : {};
  for (const key of HOST_INTENT_KEYS) {
    if (src[key] === true) return key;
  }
  return null;
}

export function collectPayloadKeys(payload) {
  const src = payload && typeof payload === "object" ? payload : {};
  return PAYLOAD_KEYS.filter((k) => Object.prototype.hasOwnProperty.call(src, k) && src[k] != null && src[k] !== "");
}

function baseResult(extra = {}) {
  return {
    ok: true,
    product: PRODUCT,
    name: NAME,
    version: VERSION,
    spec: SPEC,
    true_engine_runtime: true,
    kv_increment: false,
    door: "fraggate",
    door_only: true,
    hosts_payloads: false,
    pair_peer: PAIR_PEER,
    author: AUTHOR,
    motto: MOTTO,
    limitation: LIMITATION,
    ...extra,
  };
}

function refuse(code, message, extra = {}) {
  return baseResult({
    ok: false,
    refused: true,
    code,
    error: message,
    ...extra,
  });
}

export function pairRefuse(op, pair) {
  return refuse(
    "AZN-PAIR-REQUIRED",
    "Garden / mesh ops require pairing token AND flag with azbrowser. Both required. pair_status reports the missing half.",
    {
      op,
      pair,
      garden: false,
      mesh: false,
    },
  );
}

function requirePair(op, payload) {
  const pair = inspectPair(payload);
  if (!pair.paired) return { ok: false, pair, refuse: pairRefuse(op, pair) };
  return { ok: true, pair };
}

function gardenPublic(row) {
  return {
    hash: row.hash,
    label: row.label,
    isolated: row.isolated === true,
    memorialized: row.memorialized === true,
    terminal: row.terminal === true,
    ts: row.ts,
  };
}

function memorialPublic(row) {
  return {
    id: row.id,
    hash: row.hash,
    note: row.note,
    terminal: true,
    ts: row.ts,
  };
}

function receiptPublic(row) {
  return {
    timestamp: row.timestamp,
    summary: row.summary,
    evidence: row.evidence,
    confidence: row.confidence,
    prev_hash: row.prev_hash,
    hash: row.hash,
    staticclock_click: row.staticclock_click,
    click_index: row.click_index,
    prev_timeslate_hash: row.prev_timeslate_hash,
    timeslate_hash: row.timeslate_hash,
  };
}

async function mintReceipt({ op, summary, evidence, confidence = 1.0 }) {
  const timestamp = nowIso();
  const prev = memory.receipts.length ? memory.receipts[memory.receipts.length - 1] : null;
  const prev_hash = prev ? prev.hash : GENESIS_PREV;
  const prev_timeslate_hash = prev && prev.timeslate_hash ? prev.timeslate_hash : GENESIS_PREV;
  const click_index = (prev ? prev.click_index : -1) + 1;
  const hash = await receiptDigest(timestamp, summary, evidence, confidence, prev_hash);
  const staticclock_click = await staticclockClickDigest({ timestamp, click_index });
  const timeslate_hash = await timeslateDigest(hash, staticclock_click, prev_timeslate_hash, click_index);
  const rec = {
    op,
    timestamp,
    summary,
    evidence,
    confidence,
    prev_hash,
    hash,
    staticclock_click,
    click_index,
    prev_timeslate_hash,
    timeslate_hash,
  };
  memory.receipts.push(rec);
  if (memory.receipts.length > RECEIPT_CAP) memory.receipts.splice(0, memory.receipts.length - RECEIPT_CAP);
  memory.click_index = click_index;
  return rec;
}

async function hashThenDiscard(raw) {
  if (raw == null) return null;
  if (typeof raw === "string") {
    if (isHex64(raw)) return normalizeHex64(raw);
    return sha256Hex(raw);
  }
  if (raw instanceof Uint8Array || raw instanceof ArrayBuffer) {
    const hex = await sha256Hex(raw);
    if (raw instanceof Uint8Array) raw.fill(0);
    return hex;
  }
  return sha256Hex(typeof raw === "object" ? JSON.stringify(raw) : String(raw));
}

export async function resolveStampHash(payload) {
  const src = payload && typeof payload === "object" ? payload : {};
  if (src.hash && isHex64(src.hash)) return { hash: normalizeHex64(src.hash), hashed_then_discarded: false };
  if (src.ref && isHex64(src.ref)) return { hash: normalizeHex64(src.ref), hashed_then_discarded: false };
  const payloadKeys = collectPayloadKeys(src);
  if (payloadKeys.length) {
    const first = src[payloadKeys[0]];
    const hash = await hashThenDiscard(first);
    return { hash, hashed_then_discarded: true, discarded_keys: payloadKeys };
  }
  if (src.text != null && String(src.text).trim()) {
    return { hash: await sha256Hex(String(src.text)), hashed_then_discarded: true, discarded_keys: ["text"] };
  }
  if (src.label != null && String(src.label).trim()) {
    return { hash: await sha256Hex(String(src.label)), hashed_then_discarded: true, discarded_keys: ["label"] };
  }
  return { hash: null, hashed_then_discarded: false };
}

function findGarden(hash) {
  return memory.garden.find((row) => row.hash === hash) || null;
}

function isolateRef(row, reason) {
  row.isolated = true;
  row.isolate_reason = reason;
  if (!memory.isolated.includes(row.hash)) memory.isolated.push(row.hash);
  return row;
}

export function pairStatus(payload) {
  const pair = inspectPair(payload);
  return baseResult({
    op: "pair_status",
    code: pair.paired ? "AZN-OK" : "AZN-PAIR-MISSING",
    pair,
    garden_unlocked: pair.paired,
    note: pair.paired
      ? "AZBrowser pair present (token + flag). Garden / memorial ops are unlocked."
      : "AZBrowser pair missing. Garden / mesh ops refuse until both token and flag are present.",
  });
}

export async function gardenList(payload) {
  const gate = requirePair("garden_list", payload);
  if (!gate.ok) return gate.refuse;
  const src = payload && typeof payload === "object" ? payload : {};
  const include_isolated = src.include_isolated !== false;
  const rows = memory.garden.filter((row) => include_isolated || !row.isolated).map(gardenPublic);
  const receipt = await mintReceipt({
    op: "garden_list",
    summary: "garden_list",
    evidence: `sha256:garden:${rows.length}`,
  });
  return baseResult({
    op: "garden_list",
    code: "AZN-OK",
    pair: gate.pair,
    count: rows.length,
    garden: rows,
    isolated_count: memory.isolated.length,
    hosts_payloads: false,
    receipt: receiptPublic(receipt),
    note: "Custodian garden of hash refs only. No payloads.",
  });
}

export async function stamp(payload) {
  const gate = requirePair("stamp", payload);
  if (!gate.ok) return gate.refuse;
  const src = payload && typeof payload === "object" ? payload : {};
  const hostIntent = hostsPayloadIntent(src);
  if (hostIntent) {
    return refuse("AZN-NO-PAYLOAD", "AZNet never hosts payloads. Hash refs only.", {
      op: "stamp",
      pair: gate.pair,
      host_intent: hostIntent,
    });
  }
  const resolved = await resolveStampHash(src);
  if (!resolved.hash || !isHex64(resolved.hash)) {
    return refuse("AZN-BAD-INPUT", "Pass { hash } (64 hex) or text/bytes to hash-then-discard. Nothing is hosted.", {
      op: "stamp",
      pair: gate.pair,
    });
  }
  const existing = findGarden(resolved.hash);
  if (existing && existing.isolated) {
    return refuse("AZN-ISOLATED", "This hash ref is isolated. Integrity refuse. repair_integrity_bypass is stub.", {
      op: "stamp",
      pair: gate.pair,
      hash: resolved.hash,
      isolated: true,
    });
  }
  const label = clip(src.label != null ? src.label : src.ref_label != null ? src.ref_label : "", LABEL_CAP);
  let row = existing;
  if (!row) {
    memory.seq += 1;
    row = {
      hash: resolved.hash,
      label,
      isolated: false,
      memorialized: false,
      terminal: false,
      ts: nowIso(),
    };
    memory.garden.unshift(row);
    if (memory.garden.length > GARDEN_CAP) memory.garden.length = GARDEN_CAP;
  } else if (label && !row.label) {
    row.label = label;
  }
  const receipt = await mintReceipt({
    op: "stamp",
    summary: "stamp",
    evidence: `sha256:${resolved.hash}`,
  });
  return baseResult({
    op: "stamp",
    code: "AZN-OK",
    pair: gate.pair,
    ref: gardenPublic(row),
    hashed_then_discarded: resolved.hashed_then_discarded === true,
    discarded_keys: resolved.discarded_keys || [],
    hosts_payloads: false,
    receipt: receiptPublic(receipt),
    note: "Hash stamp recorded. Payload bytes were not stored.",
  });
}

export async function verifyHash(payload) {
  const gate = requirePair("verify_hash", payload);
  if (!gate.ok) return gate.refuse;
  const src = payload && typeof payload === "object" ? payload : {};
  const resolved = await resolveStampHash(src);
  if (!resolved.hash || !isHex64(resolved.hash)) {
    return refuse("AZN-BAD-INPUT", "Pass { hash } (64 hex) or text/bytes to hash-then-discard.", {
      op: "verify_hash",
      pair: gate.pair,
    });
  }
  const row = findGarden(resolved.hash);
  if (!row) {
    return refuse("AZN-NOT-FOUND", "Hash ref is not in the garden.", {
      op: "verify_hash",
      pair: gate.pair,
      hash: resolved.hash,
      verified: false,
    });
  }
  if (row.isolated) {
    return refuse("AZN-ISOLATED", "Hash ref is isolated. Integrity refuse. repair_integrity_bypass is stub.", {
      op: "verify_hash",
      pair: gate.pair,
      hash: resolved.hash,
      isolated: true,
      verified: false,
    });
  }
  const expected = src.expected != null ? normalizeHex64(src.expected) : src.expected_hash != null ? normalizeHex64(src.expected_hash) : resolved.hash;
  if (isHex64(expected) && expected !== row.hash) {
    isolateRef(row, "hash_mismatch");
    return refuse("AZN-INTEGRITY", "Integrity mismatch. Ref isolated. AZNet does not repair.", {
      op: "verify_hash",
      pair: gate.pair,
      hash: row.hash,
      expected,
      isolated: true,
      verified: false,
    });
  }
  const receipt = await mintReceipt({
    op: "verify_hash",
    summary: "verify_hash",
    evidence: `sha256:${row.hash}`,
  });
  return baseResult({
    op: "verify_hash",
    code: "AZN-OK",
    pair: gate.pair,
    hash: row.hash,
    verified: true,
    isolated: false,
    ref: gardenPublic(row),
    hashed_then_discarded: resolved.hashed_then_discarded === true,
    receipt: receiptPublic(receipt),
    note: "Hash ref matches the garden. No payload hosted.",
  });
}

export async function memorialList(payload) {
  const gate = requirePair("memorial_list", payload);
  if (!gate.ok) return gate.refuse;
  const rows = memory.memorials.map(memorialPublic);
  const receipt = await mintReceipt({
    op: "memorial_list",
    summary: "memorial_list",
    evidence: `sha256:memorial:${rows.length}`,
  });
  return baseResult({
    op: "memorial_list",
    code: "AZN-OK",
    pair: gate.pair,
    count: rows.length,
    memorials: rows,
    terminal_only: true,
    receipt: receiptPublic(receipt),
    note: "Memorial ledger is terminal / append-only. No payloads.",
  });
}

export async function memorialAppend(payload) {
  const gate = requirePair("memorial_append", payload);
  if (!gate.ok) return gate.refuse;
  const src = payload && typeof payload === "object" ? payload : {};
  const hostIntent = hostsPayloadIntent(src);
  if (hostIntent) {
    return refuse("AZN-NO-PAYLOAD", "AZNet never hosts payloads. Memorials are hash refs only.", {
      op: "memorial_append",
      pair: gate.pair,
      host_intent: hostIntent,
    });
  }
  const resolved = await resolveStampHash(src);
  if (!resolved.hash || !isHex64(resolved.hash)) {
    return refuse("AZN-BAD-INPUT", "Pass { hash } for a garden ref. memorial_append is terminal only.", {
      op: "memorial_append",
      pair: gate.pair,
    });
  }
  const row = findGarden(resolved.hash);
  if (!row) {
    return refuse("AZN-NOT-FOUND", "Hash ref is not in the garden. Stamp first.", {
      op: "memorial_append",
      pair: gate.pair,
      hash: resolved.hash,
    });
  }
  if (row.isolated) {
    return refuse("AZN-ISOLATED", "Isolated refs cannot be memorialized. Integrity refuse.", {
      op: "memorial_append",
      pair: gate.pair,
      hash: row.hash,
      isolated: true,
    });
  }
  if (row.memorialized || row.terminal) {
    return refuse("AZN-MEMORIAL-TERMINAL", "Memorial is terminal. This hash is already sealed. No rewrite.", {
      op: "memorial_append",
      pair: gate.pair,
      hash: row.hash,
      terminal: true,
    });
  }
  const note = clip(src.note != null ? src.note : src.summary != null ? src.summary : "memorial", LABEL_CAP);
  memory.seq += 1;
  const entry = {
    id: `azn_mem_${memory.seq.toString(36)}`,
    hash: row.hash,
    note,
    terminal: true,
    ts: nowIso(),
  };
  memory.memorials.unshift(entry);
  if (memory.memorials.length > MEMORIAL_CAP) memory.memorials.length = MEMORIAL_CAP;
  row.memorialized = true;
  row.terminal = true;
  const receipt = await mintReceipt({
    op: "memorial_append",
    summary: "memorial_append",
    evidence: `sha256:${row.hash}`,
  });
  return baseResult({
    op: "memorial_append",
    code: "AZN-OK",
    pair: gate.pair,
    memorial: memorialPublic(entry),
    ref: gardenPublic(row),
    terminal_only: true,
    receipt: receiptPublic(receipt),
    note: "Memorial appended and sealed. Terminal — no rewrite.",
  });
}

export function parseReceiptChain(body) {
  if (body == null) return [];
  let raw = body;
  if (typeof body === "string") {
    const text = body.trim();
    if (!text) return [];
    raw = JSON.parse(text);
  }
  if (Array.isArray(raw)) return raw;
  if (raw && typeof raw === "object") {
    if (Array.isArray(raw.chain)) return raw.chain;
    if (Array.isArray(raw.receipts)) return raw.receipts;
    if (raw.receipt && typeof raw.receipt === "object") return [raw.receipt];
  }
  return [];
}

async function verifyOneReceipt(rec, prev) {
  const errors = [];
  const timestamp = rec.timestamp;
  const summary = rec.summary;
  const evidence = rec.evidence;
  const confidence = rec.confidence;
  const prev_hash = rec.prev_hash;
  const expected = await receiptDigest(timestamp, summary, evidence, confidence, prev_hash);
  if (rec.hash !== expected) errors.push(`stored hash ${rec.hash} != recomputed ${expected}`);
  if (prev) {
    if (rec.prev_hash !== prev.hash) errors.push(`prev_hash ${rec.prev_hash} != previous.hash ${prev.hash}`);
    const expectedPrevTl = prev.timeslate_hash || GENESIS_PREV;
    if (rec.prev_timeslate_hash && rec.prev_timeslate_hash !== expectedPrevTl) {
      errors.push(`prev_timeslate_hash ${rec.prev_timeslate_hash} != previous timeslate ${expectedPrevTl}`);
    }
    if (typeof rec.click_index === "number" && typeof prev.click_index === "number" && rec.click_index < prev.click_index) {
      errors.push(`StaticClock rollback: click_index ${rec.click_index} < ${prev.click_index}`);
    }
  }
  if (rec.timeslate_hash && rec.staticclock_click) {
    const tl = await timeslateDigest(rec.hash, rec.staticclock_click, rec.prev_timeslate_hash || GENESIS_PREV, rec.click_index);
    if (rec.timeslate_hash !== tl) errors.push(`timeslate_hash ${rec.timeslate_hash} != recomputed ${tl}`);
  }
  return errors;
}

export async function receiptVerify(payload) {
  const src = payload && typeof payload === "object" ? payload : {};
  const submitted = parseReceiptChain(src);
  const chain = submitted.length ? submitted : memory.receipts.map(receiptPublic);
  if (!chain.length) {
    return refuse("AZN-BAD-INPUT", "Pass { receipt } or { chain }. Empty store is not a verified chain.", {
      op: "receipt_verify",
    });
  }
  const errors = [];
  for (let i = 0; i < chain.length; i++) {
    const rec = chain[i];
    const missing = ["timestamp", "summary", "evidence", "confidence", "prev_hash", "hash"].filter((k) => rec[k] == null);
    if (missing.length) {
      errors.push(`index ${i}: missing ${missing.join(",")}`);
      continue;
    }
    const rowErrors = await verifyOneReceipt(rec, i === 0 ? null : chain[i - 1]);
    for (const err of rowErrors) errors.push(`index ${i}: ${err}`);
  }
  const ok = errors.length === 0;
  const last = chain[chain.length - 1];
  return baseResult({
    op: "receipt_verify",
    code: ok ? "AZN-OK" : "AZN-RECEIPT",
    ok,
    verified: ok,
    length: chain.length,
    first_hash: chain[0].hash,
    last_hash: last.hash,
    last_timeslate_hash: last.timeslate_hash || null,
    last_click_index: last.click_index == null ? null : last.click_index,
    errors,
    source: submitted.length ? "submitted" : "store",
    note: "TemporalLock-style receipt + StaticClock timeslate verify. Receipts, not truth claims.",
  });
}

export function aznetHealth() {
  return baseResult({
    ok: true,
    hosts_payloads: false,
    pair_peer: PAIR_PEER,
    pair_flag_required: PAIR_FLAG,
    both_required: true,
    garden_count: memory.garden.length,
    memorial_count: memory.memorials.length,
    isolated_count: memory.isolated.length,
    receipt_count: memory.receipts.length,
    click_index: memory.click_index,
  });
}

export function aznetSkill() {
  return {
    markdown: `# AZNet (in-process)

AZNet (AZN-WP-0.1) is the silent verification side-net: hash stamps, a custodian garden of hash refs, a memorial ledger, and integrity refuse/isolate.

**Reached only via FragGate** on aziel-runtime (and host \`/runtime\` proxies of that door):

- MCP: \`fraggate_call\` with \`{ slug: "aznet", op: "..." }\`
- HTTP: \`POST /v1/fraggate/call\` with the same CallEnvelope
- Leftover flat names such as \`aznet_stamp\` still go through FragGate (\`parseTarget\`) — they are not a side door and are not listed on \`tools/list\`

Live ops: \`health\`, \`pair_status\`, \`garden_list\`, \`stamp\`, \`verify_hash\`, \`memorial_list\`, \`memorial_append\` (terminal only), \`receipt_verify\`, \`skill\`.

Garden / mesh ops require **pairing token AND flag with azbrowser** (both required). Missing pair refuses.

**Never hosts payloads.** payload_host / serve_content_for_peer / analytics / ranking / repair_integrity_bypass / interface / lumen / hub stay **stub**.

StaticClock gear-click stamps and TemporalLock-style receipt fields (\`timestamp\`, \`summary\`, \`evidence\`, \`confidence\`, \`prev_hash\`, \`hash\`, \`staticclock_click\`, \`click_index\`, \`prev_timeslate_hash\`, \`timeslate_hash\`) ride on garden ops.

This op ran inside aziel-runtime's Worker isolate (or a local CLI jail).

Author: **Aziel Eliab**.
Limitation: ${LIMITATION}
`,
    kv_increment: false,
    limitation: LIMITATION,
    door: "fraggate",
    door_only: true,
    hosts_payloads: false,
    pair_peer: PAIR_PEER,
  };
}
