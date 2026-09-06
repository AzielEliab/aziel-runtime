/**
 * PeaceLock engine (PL-WP-0.1).
 * Chosen silence / chosen inaction as a first-class receipt.
 * Hash-chained lattice. HARD_DUTY refuse. ABSENT transcript / counterfactual / motive.
 * Timestamped file-hash envelopes hash bytes only — never store files, never invent speech.
 * Author: Aziel Eliab. Identity is Aziel Eliab only.
 */

export const PRODUCT = "peacelock";
export const VERSION = "0.1.0";
export const SPEC = "PL-WP-0.1";
export const AUTHOR = "Aziel Eliab";
export const MOTTO = "Chosen silence. Chosen inaction. Receipts, not transcripts.";
export const ROLE = "chosen silence / chosen inaction lattice";
export const GENESIS_PREV = "0".repeat(64);
export const ABSENT = "ABSENT";

export const LIMITATION =
  "THIS IS: chosen silence / chosen inaction as a first-class hash-chained receipt (PL-WP-0.1). Lattice of open → seal → break. Transcript, counterfactual, and motive stay ABSENT. HARD_DUTY refuses a silence/inaction receipt when a non-waivable duty applies. stamp / upload_envelope hash bytes only. THIS IS NOT: a transcript of what was said; a counterfactual of what would have happened; a motive score; a waiver of hard duty; a court filing; TemporalLock; WhistleLock; EmployeeLock; legal advice. Hosted / in-process never invents speech or stores files. Author: Aziel Eliab only.";

export const HARD_DUTY_CLASSES = [
  "imminent_harm",
  "subpoena",
  "mandatory_report",
  "safety_critical",
  "court_testimony",
  "duty_to_warn",
];

export const INVARIANT_KEYS = ["transcript", "counterfactual", "motive"];

export const INVENT_ALIASES = {
  said: "transcript",
  spoken: "transcript",
  words: "transcript",
  would_have: "counterfactual",
  would_have_said: "counterfactual",
  would_have_done: "counterfactual",
  what_if: "counterfactual",
  why: "motive",
  intent: "motive",
  reason: "motive",
  because: "motive",
};

export const HASHED_FIELDS = [
  "counterfactual",
  "entry_id",
  "file_sha256",
  "hard_duty",
  "kind",
  "lattice_id",
  "motive",
  "prev_hash",
  "scope",
  "subject",
  "timestamp",
  "transcript",
];

export const KINDS = {
  open: "open",
  chosen_silence: "chosen_silence",
  chosen_inaction: "chosen_inaction",
  seal_break: "seal_break",
  file_stamp: "file_stamp",
};

export class HardDutyError extends Error {
  constructor(msg) {
    super(msg);
    this.name = "HardDutyError";
    this.code = "PL-HARD-DUTY";
  }
}

export class AbsentInvariantError extends Error {
  constructor(msg) {
    super(msg);
    this.name = "AbsentInvariantError";
    this.code = "PL-ABSENT";
  }
}

export class LatticeError extends Error {
  constructor(msg) {
    super(msg);
    this.name = "LatticeError";
    this.code = "PL-CHAIN";
  }
}

function asStr(v) {
  if (v == null) return "";
  return String(v);
}

function utcNow() {
  return new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
}

export function canonicalJson(fields) {
  const payload = {};
  for (const key of HASHED_FIELDS) payload[key] = asStr(fields[key]);
  const keys = Object.keys(payload).sort();
  return "{" + keys.map((k) => JSON.stringify(k) + ":" + JSON.stringify(payload[k])).join(",") + "}";
}

export async function sha256Hex(data) {
  const buf = typeof data === "string" ? new TextEncoder().encode(data) : data;
  const digest = await crypto.subtle.digest("SHA-256", buf);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function normalizeKind(raw) {
  const k = String(raw || "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
  if (k === "silence" || k === "quiet" || k === "chosen_silence") return KINDS.chosen_silence;
  if (k === "inaction" || k === "chosen_inaction") return KINDS.chosen_inaction;
  if (k === "open" || k === "genesis") return KINDS.open;
  if (k === "break" || k === "seal_break" || k === "unseal") return KINDS.seal_break;
  if (k === "stamp" || k === "file_stamp" || k === "upload_envelope" || k === "envelope") return KINDS.file_stamp;
  return k;
}

export function scopeForKind(kind, requested) {
  const want = String(requested || "")
    .trim()
    .toLowerCase();
  if (kind === KINDS.chosen_silence) return "silence";
  if (kind === KINDS.chosen_inaction) return "inaction";
  if (kind === KINDS.file_stamp) return "file";
  if (kind === KINDS.seal_break) return want === "inaction" ? "inaction" : want === "both" ? "both" : "silence";
  if (want === "silence" || want === "inaction" || want === "both") return want;
  return "both";
}

function normalizeDutyToken(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
}

/**
 * HARD_DUTY is non-waivable. Asking to mint chosen silence / inaction
 * under a listed duty class is a refuse, not a receipt.
 */
export function detectHardDuty(body) {
  const src = body && typeof body === "object" ? body : {};
  if (src.waive_duty === true || src.bypass_hard_duty === true || src.bypass_duty === true) {
    return { hit: true, klass: "waive" };
  }
  if (src.hard_duty === true || src.duty === true) return { hit: true, klass: "hard_duty" };
  const tokens = [src.hard_duty, src.duty, src.duty_class, src.hard_duty_class, src.klass]
    .filter((v) => v != null && v !== false && v !== "")
    .map(normalizeDutyToken)
    .filter((t) => t && t !== "false" && t !== "absent" && t !== ABSENT.toLowerCase());
  for (const token of tokens) {
    if (HARD_DUTY_CLASSES.includes(token) || token === "hard_duty" || token === "duty") {
      return { hit: true, klass: token };
    }
  }
  return { hit: false, klass: null };
}

export function collectInventedKeys(body) {
  const src = body && typeof body === "object" ? body : {};
  const hits = [];
  for (const key of INVARIANT_KEYS) {
    if (src[key] == null || src[key] === "") continue;
    if (String(src[key]).trim() === ABSENT) continue;
    hits.push(key);
  }
  for (const [alias, canon] of Object.entries(INVENT_ALIASES)) {
    if (src[alias] == null || src[alias] === "") continue;
    if (String(src[alias]).trim() === ABSENT) continue;
    hits.push(`${alias}->${canon}`);
  }
  return hits;
}

export function assertAbsentInvariants(body) {
  const hits = collectInventedKeys(body);
  if (hits.length) {
    throw new AbsentInvariantError(
      `PL-ABSENT: ${hits.join(", ")} must be ABSENT. PeaceLock does not invent transcripts, counterfactuals, or motives.`,
    );
  }
}

export function assertNoHardDuty(body, action) {
  const duty = detectHardDuty(body);
  if (duty.hit) {
    throw new HardDutyError(
      `PL-HARD-DUTY: ${action} refused. Class ${duty.klass} is a non-waivable duty. PeaceLock will not mint chosen silence or chosen inaction, and will not invent a waiver.`,
    );
  }
}

export function parseLattice(payload) {
  const src = payload && typeof payload === "object" ? payload : {};
  if (src.lattice && typeof src.lattice === "object" && Array.isArray(src.lattice.receipts)) {
    return {
      lattice_id: src.lattice.lattice_id || src.lattice_id || null,
      receipts: src.lattice.receipts.filter((x) => x && typeof x === "object"),
    };
  }
  if (Array.isArray(src.lattice)) {
    return { lattice_id: src.lattice_id || null, receipts: src.lattice.filter((x) => x && typeof x === "object") };
  }
  if (Array.isArray(src.chain)) {
    return { lattice_id: src.lattice_id || null, receipts: src.chain.filter((x) => x && typeof x === "object") };
  }
  if (Array.isArray(src.receipts)) {
    return { lattice_id: src.lattice_id || null, receipts: src.receipts.filter((x) => x && typeof x === "object") };
  }
  if (src.hash || src.prev_hash || src.kind) {
    return { lattice_id: src.lattice_id || null, receipts: [src] };
  }
  return { lattice_id: src.lattice_id || null, receipts: [] };
}

function nextEntryId(receipts) {
  const n = (receipts || []).length + 1;
  return "PL-" + String(n).padStart(4, "0");
}

function lastReceipt(receipts) {
  return receipts && receipts.length ? receipts[receipts.length - 1] : null;
}

export async function digestReceipt(fields) {
  return sha256Hex(canonicalJson(fields));
}

export async function mintReceipt({ kind, scope, subject, lattice_id, prev_hash, timestamp, file_sha256, entry_id }) {
  const fields = {
    entry_id: entry_id || "PL-0001",
    lattice_id: asStr(lattice_id),
    kind,
    scope: scopeForKind(kind, scope),
    subject: asStr(subject),
    hard_duty: "false",
    transcript: ABSENT,
    counterfactual: ABSENT,
    motive: ABSENT,
    file_sha256: asStr(file_sha256),
    timestamp: timestamp || utcNow(),
    prev_hash: prev_hash || GENESIS_PREV,
  };
  const hash = await digestReceipt(fields);
  return { ...fields, hash };
}

function envelope(extra) {
  return {
    product: PRODUCT,
    version: VERSION,
    spec: SPEC,
    motto: MOTTO,
    role: ROLE,
    author: AUTHOR,
    true_engine_runtime: true,
    kv_increment: false,
    stored: false,
    limitation: LIMITATION,
    ...extra,
  };
}

function refuse(err, extra) {
  const code = err && err.code ? err.code : "PL-REFUSE";
  return envelope({
    ok: false,
    code,
    refused: true,
    error: String(err && err.message ? err.message : err),
    message: String(err && err.message ? err.message : err),
    ...(extra || {}),
  });
}

export async function verifyReceipts(receipts) {
  const errors = [];
  const invariant_hits = [];
  let prev = GENESIS_PREV;
  for (let i = 0; i < receipts.length; i++) {
    const rec = receipts[i];
    if (!rec || typeof rec !== "object") {
      errors.push(`item ${i}: not an object`);
      continue;
    }
    const invented = collectInventedKeys(rec);
    if (invented.length) {
      invariant_hits.push({ index: i, keys: invented });
      errors.push(`item ${i}: PL-ABSENT ${invented.join(", ")}`);
    }
    if (String(rec.transcript || ABSENT) !== ABSENT) errors.push(`item ${i}: transcript is not ABSENT`);
    if (String(rec.counterfactual || ABSENT) !== ABSENT) errors.push(`item ${i}: counterfactual is not ABSENT`);
    if (String(rec.motive || ABSENT) !== ABSENT) errors.push(`item ${i}: motive is not ABSENT`);
    if (String(rec.hard_duty) === "true" || rec.hard_duty === true) {
      errors.push(`item ${i}: PL-HARD-DUTY recorded on a receipt — lattice is invalid`);
    }
    const wantPrev = i === 0 ? GENESIS_PREV : prev;
    if (asStr(rec.prev_hash) !== wantPrev) errors.push(`item ${i}: prev_hash mismatch`);
    const fields = {};
    for (const key of HASHED_FIELDS) fields[key] = rec[key];
    const recomputed = await digestReceipt(fields);
    if (rec.hash && rec.hash !== recomputed) errors.push(`item ${i}: hash mismatch`);
    prev = rec.hash || recomputed;
  }
  const tip = receipts.length ? receipts[receipts.length - 1] : null;
  return {
    ok: errors.length === 0,
    items: receipts.length,
    errors,
    invariant_hits,
    first_hash: receipts[0] && receipts[0].hash ? receipts[0].hash : null,
    tip_hash: tip && tip.hash ? tip.hash : null,
    genesis: receipts.length ? asStr(receipts[0].prev_hash) === GENESIS_PREV : true,
  };
}

function latticeView(lattice_id, receipts, tip_hash) {
  return {
    lattice_id,
    spec: SPEC,
    receipts: receipts.map((r) => ({
      ...r,
      transcript: ABSENT,
      counterfactual: ABSENT,
      motive: ABSENT,
    })),
    tip_hash: tip_hash || (receipts.length ? receipts[receipts.length - 1].hash : null),
    count: receipts.length,
  };
}

export async function openLattice(payload) {
  const src = payload && typeof payload === "object" ? payload : {};
  try {
    assertAbsentInvariants(src);
    assertNoHardDuty(src, "open");
  } catch (err) {
    return refuse(err);
  }
  const existing = parseLattice(src);
  if (existing.receipts.length) {
    return refuse(new LatticeError("PL-CHAIN: open starts a new lattice. Do not post an existing chain."), {
      lattice: latticeView(existing.lattice_id, existing.receipts, null),
    });
  }
  const lattice_id = asStr(src.lattice_id) || `PL-${(await sha256Hex(utcNow() + ":" + asStr(src.subject))).slice(0, 16)}`;
  const receipt = await mintReceipt({
    kind: KINDS.open,
    scope: src.scope,
    subject: src.subject,
    lattice_id,
    prev_hash: GENESIS_PREV,
    timestamp: src.timestamp,
    entry_id: "PL-0001",
  });
  return envelope({
    ok: true,
    code: "PL-OK",
    op: "open",
    lattice: latticeView(lattice_id, [receipt], receipt.hash),
    receipt,
  });
}

export async function sealLattice(payload) {
  const src = payload && typeof payload === "object" ? payload : {};
  try {
    assertAbsentInvariants(src);
    assertNoHardDuty(src, "seal");
  } catch (err) {
    return refuse(err);
  }
  const parsed = parseLattice(src);
  if (!parsed.receipts.length) {
    return refuse(new LatticeError("PL-CHAIN: seal needs an opened lattice. Call open first."));
  }
  const kind = normalizeKind(src.kind || src.choice || src.silence || "chosen_silence");
  if (kind !== KINDS.chosen_silence && kind !== KINDS.chosen_inaction) {
    return refuse(new LatticeError(`PL-KIND: seal accepts chosen_silence or chosen_inaction, not ${JSON.stringify(kind)}.`));
  }
  const checked = await verifyReceipts(parsed.receipts);
  if (!checked.ok) {
    return refuse(new LatticeError("PL-CHAIN: posted lattice failed verify. " + checked.errors.join("; ")), {
      verify: checked,
    });
  }
  const prev = lastReceipt(parsed.receipts);
  const receipt = await mintReceipt({
    kind,
    scope: src.scope || (kind === KINDS.chosen_inaction ? "inaction" : "silence"),
    subject: src.subject != null ? src.subject : prev && prev.subject,
    lattice_id: parsed.lattice_id || (prev && prev.lattice_id),
    prev_hash: prev.hash,
    timestamp: src.timestamp,
    entry_id: nextEntryId(parsed.receipts),
  });
  const receipts = parsed.receipts.concat([receipt]);
  return envelope({
    ok: true,
    code: "PL-OK",
    op: "seal",
    lattice: latticeView(receipt.lattice_id, receipts, receipt.hash),
    receipt,
  });
}

export async function breakLattice(payload) {
  const src = payload && typeof payload === "object" ? payload : {};
  try {
    assertAbsentInvariants(src);
    assertNoHardDuty(src, "break");
  } catch (err) {
    return refuse(err);
  }
  const parsed = parseLattice(src);
  if (!parsed.receipts.length) {
    return refuse(new LatticeError("PL-CHAIN: break needs a lattice. Call open then seal first."));
  }
  const sealed = parsed.receipts.some((r) => r.kind === KINDS.chosen_silence || r.kind === KINDS.chosen_inaction);
  if (!sealed) {
    return refuse(new LatticeError("PL-CHAIN: nothing sealed. Break ends a chosen silence or inaction period."));
  }
  const checked = await verifyReceipts(parsed.receipts);
  if (!checked.ok) {
    return refuse(new LatticeError("PL-CHAIN: posted lattice failed verify. " + checked.errors.join("; ")), {
      verify: checked,
    });
  }
  const prev = lastReceipt(parsed.receipts);
  const receipt = await mintReceipt({
    kind: KINDS.seal_break,
    scope: src.scope || (prev && prev.scope),
    subject: src.subject != null ? src.subject : prev && prev.subject,
    lattice_id: parsed.lattice_id || (prev && prev.lattice_id),
    prev_hash: prev.hash,
    timestamp: src.timestamp,
    entry_id: nextEntryId(parsed.receipts),
  });
  const receipts = parsed.receipts.concat([receipt]);
  return envelope({
    ok: true,
    code: "PL-OK",
    op: "break",
    lattice: latticeView(receipt.lattice_id, receipts, receipt.hash),
    receipt,
    note: "Seal period ended. Transcript remains ABSENT. PeaceLock does not invent what was then said.",
  });
}

export async function showLattice(payload) {
  const src = payload && typeof payload === "object" ? payload : {};
  const invented = collectInventedKeys(src);
  const parsed = parseLattice(src);
  const checked = parsed.receipts.length ? await verifyReceipts(parsed.receipts) : { ok: true, items: 0, errors: [], invariant_hits: [] };
  const tip = lastReceipt(parsed.receipts);
  return envelope({
    ok: checked.ok && invented.length === 0,
    code: invented.length ? "PL-ABSENT" : checked.ok ? "PL-OK" : "PL-CHAIN",
    op: "show",
    invented_on_request: invented,
    verify: checked,
    lattice: latticeView(parsed.lattice_id || (tip && tip.lattice_id), parsed.receipts, tip && tip.hash),
    note: "Show reports the lattice as posted. Missing transcript / counterfactual / motive stay ABSENT. Nothing is invented.",
  });
}

export async function verifyLattice(payload) {
  const src = payload && typeof payload === "object" ? payload : {};
  const invented = collectInventedKeys(src);
  const parsed = parseLattice(src);
  const checked = await verifyReceipts(parsed.receipts);
  const tip = lastReceipt(parsed.receipts);
  return envelope({
    ok: checked.ok && invented.length === 0,
    code: invented.length ? "PL-ABSENT" : checked.ok ? "PL-OK" : "PL-CHAIN",
    op: "verify",
    invented_on_request: invented,
    ...checked,
    lattice: latticeView(parsed.lattice_id || (tip && tip.lattice_id), parsed.receipts, checked.tip_hash),
  });
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
    bytes = null;
  }
  if (bytes && scratch) scratch.push(bytes);
  return bytes;
}

export async function stampEnvelope(payload, scratch) {
  const src = payload && typeof payload === "object" ? payload : {};
  try {
    assertAbsentInvariants(src);
  } catch (err) {
    return refuse(err);
  }
  if (detectHardDuty(src).hit && (src.kind === "chosen_silence" || src.kind === "chosen_inaction" || src.silence || src.inaction)) {
    return refuse(new HardDutyError("PL-HARD-DUTY: stamp will not carry a chosen silence/inaction claim under hard duty."));
  }
  let digest = src.sha256 || src.file_sha256 || src.hash || "";
  digest = String(digest || "")
    .trim()
    .toLowerCase();
  const bytes = bytesFromBody(src, scratch);
  if (bytes) {
    digest = await sha256Hex(bytes);
  }
  if (!digest || digest.length !== 64 || /[^0-9a-f]/.test(digest)) {
    return refuse(new LatticeError("PL-KIND: stamp needs sha256 (64 hex) or text/b64 bytes to hash. Files are not stored."));
  }
  const parsed = parseLattice(src);
  const receipt = await mintReceipt({
    kind: KINDS.file_stamp,
    scope: "file",
    subject: src.subject || src.name || "",
    lattice_id: parsed.lattice_id || asStr(src.lattice_id) || `PL-STAMP-${digest.slice(0, 12)}`,
    prev_hash: parsed.receipts.length ? lastReceipt(parsed.receipts).hash : GENESIS_PREV,
    timestamp: src.timestamp,
    file_sha256: digest,
    entry_id: parsed.receipts.length ? nextEntryId(parsed.receipts) : "PL-0001",
  });
  const receipts = parsed.receipts.concat([receipt]);
  return envelope({
    ok: true,
    code: "PL-OK",
    op: src._op || "stamp",
    file_sha256: digest,
    bytes: bytes ? bytes.byteLength : null,
    stored: false,
    lattice: latticeView(receipt.lattice_id, receipts, receipt.hash),
    receipt,
    note: "Timestamped file-hash envelope. Bytes were hashed, not stored. Content is not a transcript.",
  });
}

export async function uploadEnvelope(payload, scratch) {
  const src = payload && typeof payload === "object" ? payload : {};
  return stampEnvelope({ ...src, _op: "upload_envelope" }, scratch);
}
