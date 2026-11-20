/**
 * RIB-025 / draft-zambo-aer1-08 (Brennan Zambo, @brennanzambo).
 *
 * Portable execution receipt: one SHA-256 commitment over the exact UTF-8 bytes
 * of tool call + inputs + outputs, an append-only hash chain (Section 7.1, the
 * -07/-08 construction), and a workflow Merkle root (Section 8.1).
 *
 * aer1_conformance is "draft-zambo-aer1-08" only for what was actually run:
 * the frozen v1.4.0 corpus (43/43, the reference the draft names) and a
 * Section 7.1 / Section 8 round-trip, including the draft's published workflow
 * Merkle vector. The draft's later chain corpora are not in that tag and are
 * not claimed. This is not draft-zambo-aer1-26. No signing key is minted.
 * Author: Aziel Eliab.
 */
import { sha256Hex } from "./session-core.js";

export const AER1_DRAFT = "draft-zambo-aer1-08";
export const AER1_SCHEMA = "0.3";
export const AER1_CONFORMANCE = "draft-zambo-aer1-08";
export const AER1_KIT = "v1.4.0";
export const AER1_KIT_RESULT = "43/43";
export const AER1_CHAIN_CORPUS = "not_in_v1.4.0_tag";
export const AER1_CONFORMANCE_SCOPE =
  "Frozen kit v1.4.0 corpus 43/43 (named by draft-zambo-aer1-08) plus a Section 7.1 and Section 8 round-trip, including the draft's published workflow Merkle root. The draft's extra corpora (uppercase-id, bad-verification-status, the 7-vector Section 7 chain, the 15-vector Section 7.1 chain) are not in the v1.4.0 tag and were not executed. Not a claim of byte-identical verdicts against that full set. Not draft-zambo-aer1-26.";
export const RECORDING_SYSTEM = "AZIEL-RUNTIME";
export const PROVENANCE_EXECUTED = "EXECUTED BY AZIEL-RUNTIME";
export const PROVENANCE_GATEWAY = "OBSERVED VIA GATEWAY";
export const PROVENANCE_LOGGED = "LOGGED BY AGENT";
export const GENESIS_PREV = "0".repeat(64);
export const PUBLISHED_MERKLE_ROOT = "7c4817ca249edfeae259b98abf63ed38a31d9dbeebf5ee23139410a7a7f63b37";
export const PUBLISHED_WORKFLOW_IDS = Object.freeze([
  "e80168eb-a6a1-4ec9-8478-ac108f9397ff",
  "514fe841-bbdd-4804-9ef4-6828842d8763",
  "a090bdad-f2cf-48c9-bc89-e9e17700fb15",
  "bf88a036-416b-456a-8e82-8c0991811d68",
  "ae795bf0-27f8-4cf2-8aef-3f8142b77217",
]);
/** Frozen Section 7.1 vector. Digest matches Python json.dumps(sort_keys, separators, ensure_ascii). */
export const CHAIN_ROUNDTRIP_DIGEST = "6ea7dbfbd815d8317c782be0f3ada1a17f3a9f21fe6bb4340776337b4e98c52e";

const UUID_V4 = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-4[0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/;
const RFC3339 = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d+)?(Z|[+-]\d{2}:\d{2})$/;
const HASH_RE = /^sha256:[0-9a-f]{64}$/;
const CORE = ["id", "receipt_schema_version", "created_at", "tool", "provenance_class", "canonical_bytes", "output_hash", "verification_status"];
const EXECUTED_RE = /^EXECUTED BY [A-Z0-9][A-Z0-9 ._-]*$/;

function leap(year) {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}
function daysInMonth(year, month) {
  if (month === 2) return leap(year) ? 29 : 28;
  return [0, 31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month];
}

/** RFC 3339 calendar check from the v1.4.0 reference verifier (February 30 fails). */
export function validTimestamp(value) {
  const m = typeof value === "string" ? RFC3339.exec(value) : null;
  if (!m) return false;
  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  const hour = Number(m[4]);
  const minute = Number(m[5]);
  const second = Number(m[6]);
  const zone = m[7];
  if (month < 1 || month > 12 || day < 1 || day > daysInMonth(year, month)) return false;
  if (hour > 23 || minute > 59 || second > 59) return false;
  if (zone !== "Z") {
    const zh = Number(zone.slice(1, 3));
    const zm = Number(zone.slice(4));
    if (zh > 23 || zm > 59) return false;
  }
  return true;
}

/**
 * Canonical JSON matching Python json.dumps(sort_keys=True, separators=(",", ":"),
 * ensure_ascii=True). Section 7.1 says member names are sorted by Unicode code point.
 * The draft's bullet list is a different order; the reference chain digest sorts keys.
 */
export function dumpsPy(value) {
  if (value === null) return "null";
  const t = typeof value;
  if (t === "boolean") return value ? "true" : "false";
  if (t === "number") {
    if (!Number.isFinite(value) || !Number.isInteger(value)) throw new Error("AER1 canonical JSON accepts integers only");
    return Object.is(value, -0) ? "0" : String(value);
  }
  if (t === "string") return escapePy(value);
  if (Array.isArray(value)) return "[" + value.map((item) => dumpsPy(item)).join(",") + "]";
  if (t === "object") {
    const keys = Object.keys(value).filter((k) => value[k] !== undefined).sort();
    return "{" + keys.map((k) => escapePy(k) + ":" + dumpsPy(value[k])).join(",") + "}";
  }
  throw new Error("AER1 canonical JSON cannot encode " + t);
}

function escapePy(s) {
  let out = '"';
  for (const ch of s) {
    const cp = ch.codePointAt(0);
    if (ch === '"') out += '\\"';
    else if (ch === "\\") out += "\\\\";
    else if (ch === "\b") out += "\\b";
    else if (ch === "\f") out += "\\f";
    else if (ch === "\n") out += "\\n";
    else if (ch === "\r") out += "\\r";
    else if (ch === "\t") out += "\\t";
    else if (cp < 0x20) out += "\\u" + cp.toString(16).padStart(4, "0");
    else if (cp < 0x80) out += ch;
    else if (cp > 0xffff) {
      const u = cp - 0x10000;
      const hi = 0xd800 + (u >> 10);
      const lo = 0xdc00 + (u & 0x3ff);
      out += "\\u" + hi.toString(16).padStart(4, "0");
      out += "\\u" + lo.toString(16).padStart(4, "0");
    } else out += "\\u" + cp.toString(16).padStart(4, "0");
  }
  return out + '"';
}

export function strictB64(value) {
  if (typeof value !== "string" || value.length % 4 !== 0 || !/^[A-Za-z0-9+/]*={0,2}$/.test(value)) {
    throw new Error("canonical_bytes is not valid base64");
  }
  const raw = Buffer.from(value, "base64");
  if (raw.toString("base64") !== value) throw new Error("canonical_bytes is not valid base64");
  try {
    new TextDecoder("utf-8", { fatal: true }).decode(raw);
  } catch {
    throw new Error("canonical_bytes is not valid UTF-8");
  }
  return raw;
}

export function verifyCore(receipt) {
  const failures = [];
  if (!receipt || typeof receipt !== "object" || Array.isArray(receipt)) return { failures: ["receipt is not a JSON object"], raw: null };
  const missing = CORE.filter((k) => !(k in receipt));
  if (missing.length) return { failures: missing.map((k) => `missing required member: ${k}`), raw: null };
  if (typeof receipt.id !== "string" || !UUID_V4.test(receipt.id)) failures.push("id is not a UUID v4");
  if (receipt.receipt_schema_version !== AER1_SCHEMA) failures.push("receipt_schema_version is not 0.3");
  if (!validTimestamp(receipt.created_at)) failures.push("created_at is not a valid RFC 3339 timestamp");
  const tool = receipt.tool;
  if (!tool || typeof tool !== "object" || Array.isArray(tool) || ["name", "version", "scope"].some((k) => typeof tool[k] !== "string" || !tool[k])) {
    failures.push("tool is not an object with name/version/scope strings");
  }
  const p = receipt.provenance_class;
  if (!(p === PROVENANCE_GATEWAY || p === PROVENANCE_LOGGED || (typeof p === "string" && EXECUTED_RE.test(p)))) {
    failures.push("provenance_class is not a known class");
  }
  let raw = null;
  try {
    raw = strictB64(receipt.canonical_bytes);
  } catch (err) {
    failures.push(err.message);
  }
  if (typeof receipt.output_hash !== "string" || !HASH_RE.test(receipt.output_hash)) failures.push("output_hash is not sha256: plus lowercase hex");
  if (receipt.verification_status !== "verified") failures.push("verification_status is not verified");
  return { failures, raw };
}

export async function verifyCoreAsync(receipt) {
  const checked = verifyCore(receipt);
  const failures = checked.failures.slice();
  if (checked.raw && receipt && typeof receipt.output_hash === "string" && HASH_RE.test(receipt.output_hash)) {
    const expected = "sha256:" + (await sha256Hex(checked.raw));
    if (receipt.output_hash !== expected) failures.push(`hash mismatch: expected ${expected}, got ${receipt.output_hash}`);
  }
  return failures;
}

export async function checkProfile(receipt) {
  try {
    const payload = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(strictB64(receipt.canonical_bytes)));
    if (!payload || typeof payload !== "object" || Array.isArray(payload) || !("inputs" in payload)) {
      return ["reference-producer payload omits the 'inputs' member"];
    }
    return [];
  } catch {
    return ["canonical payload is not valid JSON"];
  }
}

export async function checkAnchor(receipt) {
  const anchor = receipt && receipt.anchor;
  const keys = anchor && typeof anchor === "object" && !Array.isArray(anchor) ? Object.keys(anchor).sort() : [];
  if (keys.join(",") !== "anchored_at,leaf_hash,log,proof") return ["anchor is missing required members"];
  let raw;
  try {
    raw = strictB64(receipt.canonical_bytes);
  } catch (err) {
    return [err.message];
  }
  const expected = "sha256:" + (await sha256Hex(raw));
  const failures = [];
  if (anchor.leaf_hash !== expected) failures.push("anchor.leaf_hash does not match canonical_bytes");
  if (!validTimestamp(anchor.anchored_at)) failures.push("anchor.anchored_at is not a valid timestamp");
  if (!anchor.proof || typeof anchor.proof !== "object" || Array.isArray(anchor.proof)) failures.push("anchor.proof is not an object");
  return failures;
}

/** Same pass/fail rule as aer1-implementations/python/conformance.py at kit v1.4.0. */
export async function kitVerdict(vector, receipt) {
  const coreOk = (await verifyCoreAsync(receipt)).length === 0;
  let result = coreOk;
  if (vector && vector.id === "missing-inputs") result = result && (await checkProfile(receipt)).length === 0;
  if (vector && vector.vector_group === "anchored") result = result && (await checkAnchor(receipt)).length === 0;
  return result;
}

export async function merkleRoot(receiptIds) {
  if (!receiptIds || !receiptIds.length) return sha256Hex("");
  let level = [];
  for (const id of receiptIds) level.push(Buffer.from(await sha256Hex(String(id)), "hex"));
  while (level.length > 1) {
    if (level.length % 2) level.push(level[level.length - 1]);
    const next = [];
    for (let i = 0; i < level.length; i += 2) {
      const cat = Buffer.concat([level[i], level[i + 1]]);
      next.push(Buffer.from(await sha256Hex(cat), "hex"));
    }
    level = next;
  }
  return level[0].toString("hex");
}

export async function chainEntryDigest(entry) {
  const raw = strictB64(entry.canonical_bytes);
  const outputHash = await sha256Hex(raw);
  let seq = entry.seq;
  if (typeof seq === "number" && Number.isInteger(seq)) seq = seq;
  const payload = {
    prev_digest: entry.prev_digest,
    seq,
    job_id: entry.job_id,
    close: entry.close === undefined ? false : entry.close,
    id: entry.id,
    tool: entry.tool,
    provenance_class: entry.provenance_class,
    output_hash: outputHash,
  };
  return sha256Hex(dumpsPy(payload));
}

function seqOf(entry, i) {
  const seq = entry.seq;
  if (typeof seq === "boolean") return { fail: `entry ${i} seq is not an integer` };
  if (typeof seq === "number") {
    if (!Number.isInteger(seq)) return { fail: `entry ${i} seq is not an integer` };
    return { seq };
  }
  return { fail: `entry ${i} seq is not an integer` };
}

/** -06 historical chain: digest is only the decoded canonical bytes. Not a current timeline. */
export async function verifyChain06(timeline) {
  const failures = [];
  if (!Array.isArray(timeline) || !timeline.length) return ["timeline is not a non-empty list"];
  let prev = null;
  for (let i = 0; i < timeline.length; i++) {
    const e = timeline[i];
    if (!e || typeof e !== "object" || Array.isArray(e)) {
      failures.push(`entry ${i} is not an object`);
      prev = null;
      continue;
    }
    if (i === 0) {
      if (e.prev_digest !== GENESIS_PREV) failures.push("entry 0 prev_digest is not 64 zeros");
    } else if (typeof e.prev_digest !== "string") failures.push(`entry ${i} prev_digest is not a string`);
    else if (e.prev_digest !== prev) failures.push(`entry ${i} prev_digest does not match digest of entry ${i - 1}`);
    try {
      const raw = strictB64(e.canonical_bytes);
      prev = await sha256Hex(raw);
    } catch {
      failures.push(`entry ${i} canonical_bytes is not valid base64`);
      prev = null;
    }
  }
  const last = timeline[timeline.length - 1];
  if (!last || last.close !== true) failures.push("last entry close is not boolean true");
  return failures;
}

/** Section 7.1 / 7.2. A -06 chain must not pass. */
export async function verifyChain08(timeline) {
  const failures = [];
  if (!Array.isArray(timeline) || !timeline.length) return ["timeline is not a non-empty list"];
  let job = null;
  let prev = null;
  for (let i = 0; i < timeline.length; i++) {
    const e = timeline[i];
    if (!e || typeof e !== "object" || Array.isArray(e)) return [`entry ${i} is not an object`];
    try {
      strictB64(e.canonical_bytes);
    } catch {
      return [`entry ${i} canonical_bytes is not valid base64`];
    }
    for (const m of ["id", "tool", "provenance_class", "job_id", "prev_digest"]) {
      if (typeof e[m] !== "string" || !e[m]) return [`entry ${i} missing ${m}`];
    }
    const parsed = seqOf(e, i);
    if (parsed.fail) return [parsed.fail];
    if (parsed.seq !== i + 1) failures.push(`entry ${i} seq ${parsed.seq} breaks contiguity (expected ${i + 1})`);
    if (job == null) job = e.job_id;
    else if (e.job_id !== job) failures.push(`entry ${i} job_id mixes jobs`);
    if (i === 0) {
      if (e.prev_digest !== GENESIS_PREV) failures.push("entry 0 prev_digest is not 64 zeros");
    } else if (e.prev_digest !== prev) failures.push(`entry ${i} prev_digest does not match digest of entry ${i - 1}`);
    if ("close" in e && typeof e.close !== "boolean") failures.push(`entry ${i} close is not a boolean`);
    else if (i < timeline.length - 1 && e.close === true) failures.push(`entry ${i} carries close:true before the last entry`);
    if (e.chain_construction === "-06") failures.push(`entry ${i} is a historical -06 chain and must not verify as -08`);
    prev = await chainEntryDigest(e);
  }
  const last = timeline[timeline.length - 1];
  if (!last || last.close !== true) failures.push("last entry does not carry close: true");
  return failures;
}

export async function verifyWorkflow(workflow, { receipts = null } = {}) {
  const failures = [];
  if (!workflow || typeof workflow !== "object" || Array.isArray(workflow)) return ["workflow is not a JSON object"];
  const steps = workflow.steps;
  if (!Array.isArray(steps) || !steps.length) return ["steps is not a non-empty list"];
  const seqs = [];
  const ids = [];
  for (let i = 0; i < steps.length; i++) {
    const s = steps[i];
    if (!s || typeof s !== "object" || Array.isArray(s)) {
      failures.push(`step ${i} is not an object`);
      seqs.push(null);
      ids.push(null);
      continue;
    }
    if (typeof s.seq !== "number" || !Number.isInteger(s.seq)) failures.push(`step ${i} seq is not an integer`);
    if (typeof s.receipt_id !== "string") failures.push(`step ${i} receipt_id is not a string`);
    seqs.push(s.seq);
    ids.push(s.receipt_id);
  }
  const seqOk = seqs.every((q) => typeof q === "number" && Number.isInteger(q));
  const expect = seqs.map((_, i) => i + 1);
  if (seqOk && seqs.join(",") !== expect.join(",")) failures.push("seq values are not exactly 1..n in order: gap, duplicate, or out of order");
  if (ids.every((r) => typeof r === "string")) {
    const seen = new Set();
    for (const r of ids) {
      if (seen.has(r)) {
        failures.push(`8.2 duplicate receipt_id: ${r}`);
        break;
      }
      seen.add(r);
    }
    if (typeof workflow.merkle_root !== "string") failures.push("merkle_root is not a string");
    else if ((await merkleRoot(ids)) !== workflow.merkle_root) failures.push("merkle_root mismatch");
  }
  if (Array.isArray(receipts)) {
    for (let i = 0; i < steps.length; i++) {
      const s = steps[i];
      const rec = receipts.find((r) => r && r.id === s.receipt_id);
      if (!rec) {
        failures.push(`step ${i} receipt was not supplied`);
        continue;
      }
      const core = await verifyCoreAsync(rec);
      if (core.length) failures.push(`step ${i} receipt failed: ${core[0]}`);
      if (s.receipt_hash) {
        try {
          const bare = await sha256Hex(strictB64(rec.canonical_bytes));
          if (s.receipt_hash !== bare) failures.push(`step ${i} receipt_hash does not match canonical bytes`);
        } catch {
          failures.push(`step ${i} receipt_hash cannot be recomputed`);
        }
      }
    }
  }
  return failures;
}

export function conformanceView() {
  return {
    draft: AER1_DRAFT,
    aer1_conformance: AER1_CONFORMANCE,
    aer1_conformance_scope: AER1_CONFORMANCE_SCOPE,
    aer1_kit: AER1_KIT,
    aer1_kit_result: AER1_KIT_RESULT,
    aer1_chain_corpus: AER1_CHAIN_CORPUS,
    account_required: false,
    signed: false,
  };
}

export async function buildPortable({ id, created_at, tool, provenance_class, inputs, outputs, tool_call, origin, session_id, close = false, prev_digest, seq, job_id }) {
  const canonical = dumpsPy({ inputs, outputs, tool_call });
  const raw = new TextEncoder().encode(canonical);
  const bare = await sha256Hex(raw);
  const canonical_bytes = Buffer.from(raw).toString("base64");
  const publicUrl = origin && session_id && id ? `${origin}/v1/session/${session_id}/aer?id=${id}` : null;
  const receipt = {
    id,
    receipt_schema_version: AER1_SCHEMA,
    created_at,
    tool,
    provenance_class,
    canonical_bytes,
    output_hash: "sha256:" + bare,
    verification_status: publicUrl ? "verified" : "unverified",
    draft: AER1_DRAFT,
    account_required: false,
    signed: false,
    public_url: publicUrl,
    canonical_profile: "aziel-runtime.aer1-canonical/1",
    covers: ["tool_call", "inputs", "outputs"],
  };
  const core = await verifyCoreAsync({ ...receipt });
  if (publicUrl && core.length) {
    return { ok: false, status: 500, code: "AER-CORE-FAILED", message: core[0], written: false };
  }
  const entry = {
    id,
    tool: tool.name,
    provenance_class,
    job_id,
    seq,
    prev_digest,
    close: close === true,
    canonical_bytes,
    chain_construction: "-08",
  };
  const entry_digest = await chainEntryDigest(entry);
  return {
    ok: true,
    receipt,
    entry,
    entry_digest,
    output_commitment: "confirmed",
    public_resolution: publicUrl ? "session" : "unresolved",
  };
}

export function priorAer(receipts) {
  return (receipts || []).filter((r) => r && r.event === "aer" && r.payload && r.payload.aer1);
}

export async function timelineFrom(receipts) {
  return priorAer(receipts).map((r) => r.payload.aer1.entry);
}

function planFail(status, code, message) {
  return { ok: false, status, code, message, written: false };
}

/**
 * Build the next portable receipt from a session chain. Does not append.
 * Provenance is chosen here. A caller field cannot upgrade a log into an execution.
 */
export async function planAerSeal(session, raw, nowIso, origin) {
  const body = raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {};
  const receipts = (session && session.receipts) || [];
  const prior = priorAer(receipts);
  if (prior.some((r) => r.payload.aer1.entry && r.payload.aer1.entry.close === true)) {
    return planFail(409, "AER-ALREADY-CLOSED", "this job timeline is already closed. Nothing was sealed.");
  }
  if (body.logged === true && body.act_receipt_hash) return planFail(400, "AER-MIXED", "a logged report and a sealed act are different provenances. Nothing was sealed.");
  if (body.job_id != null && body.job_id !== session.id) return planFail(400, "AER-JOB-MISMATCH", "the job id is the session id. Nothing was sealed.");
  const seq = prior.length + 1;
  const prev_digest = seq === 1 ? GENESIS_PREV : prior[prior.length - 1].payload.aer1.entry_digest;
  const close = body.close === true;
  let provenance;
  let inputs;
  let outputs;
  let tool_call;
  let act_receipt_hash = null;
  let claimed_executed = false;
  if (close) {
    provenance = PROVENANCE_EXECUTED;
    inputs = { close: true };
    outputs = { closed: true, steps: prior.length };
    tool_call = { name: "aer.close", op: "close", version: session.runtime_version || "0" };
  } else if (body.act_receipt_hash) {
    const hash = String(body.act_receipt_hash).toLowerCase();
    const act = receipts.find((r) => r && r.hash === hash);
    if (!act) return planFail(409, "AER-NO-ACT", "no sealed act has that hash. Nothing was sealed.");
    if (act.event !== "exec" || !act.payload || !act.payload.intent || !act.payload.result) {
      return planFail(409, "AER-NOT-ACT", "a portable execution receipt binds an exec receipt. Nothing was sealed.");
    }
    if (prior.some((r) => r.payload.aer1.act_receipt_hash === hash)) {
      return planFail(409, "AER-DUPLICATE", "that act already has a portable receipt. Nothing was sealed.");
    }
    const intent = act.payload.intent;
    const result = act.payload.result;
    if (body.inputs_text != null) {
      const digest = await sha256Hex(String(body.inputs_text));
      if (digest !== intent.payload_digest) return planFail(400, "AER-INPUT-MISMATCH", "inputs_text does not match the sealed payload digest. Nothing was sealed.");
      inputs = { payload_digest: intent.payload_digest, payload_bytes: intent.payload_bytes, text: String(body.inputs_text) };
    } else {
      inputs = { payload_digest: intent.payload_digest, payload_bytes: intent.payload_bytes, embedded: false };
    }
    outputs = {
      status: result.status,
      request_digest: result.request_digest,
      response_digest: result.response_digest,
      response_bytes: result.response_bytes ?? null,
      error: result.error,
      mode: result.mode,
      engine_digest: result.engine_digest,
    };
    tool_call = { name: intent.slug, op: intent.op, version: session.runtime_version || "0" };
    if (result.mode === "local" && result.true_engine_runtime === true) provenance = PROVENANCE_EXECUTED;
    else if (result.mode === "proxy_fallback") provenance = PROVENANCE_GATEWAY;
    else provenance = PROVENANCE_LOGGED;
    act_receipt_hash = hash;
    claimed_executed = provenance === PROVENANCE_EXECUTED;
  } else if (body.logged === true) {
    const tool = body.tool;
    if (!tool || typeof tool.name !== "string" || !tool.name || typeof tool.version !== "string" || !tool.version) {
      return planFail(400, "AER-INVALID", "a logged receipt needs tool.name and tool.version. Nothing was sealed.");
    }
    if (body.inputs === undefined || body.outputs === undefined) return planFail(400, "AER-INVALID", "a logged receipt needs inputs and outputs. Nothing was sealed.");
    provenance = PROVENANCE_LOGGED;
    inputs = body.inputs;
    outputs = body.outputs;
    tool_call = { name: tool.name.slice(0, 80), op: String(tool.op || "log").slice(0, 80), version: tool.version.slice(0, 40) };
    claimed_executed = false;
  } else {
    return planFail(400, "AER-INVALID", "send act_receipt_hash, logged:true, or close:true. Nothing was sealed.");
  }
  if (body.provenance_class != null && body.provenance_class !== provenance) {
    return planFail(400, "AER-PROVENANCE-UPGRADE", "provenance is chosen from what the runtime did. A caller label cannot upgrade it. Nothing was sealed.");
  }
  let built;
  try {
    built = await buildPortable({
      id: crypto.randomUUID(),
      created_at: nowIso,
      tool: { name: tool_call.name, version: tool_call.version, scope: "session" },
      provenance_class: provenance,
      inputs,
      outputs,
      tool_call,
      origin: origin || null,
      session_id: session.id,
      close,
      prev_digest,
      seq,
      job_id: session.id,
    });
  } catch (err) {
    return planFail(400, "AER-INVALID", err && err.message ? err.message : "canonical bytes could not be built");
  }
  if (!built.ok) return built;
  const steps = prior
    .filter((r) => r.payload.aer1.entry && r.payload.aer1.entry.tool !== "aer.close")
    .map((r, i) => ({
      seq: i + 1,
      tool: r.payload.aer1.entry.tool,
      receipt_id: r.payload.aer1.receipt.id,
      receipt_hash: r.payload.aer1.receipt.output_hash.slice("sha256:".length),
      started_at: r.payload.aer1.receipt.created_at,
      ended_at: r.payload.aer1.receipt.created_at,
      status: "ok",
    }));
  let workflow = null;
  if (close && steps.length) {
    const last = prior.filter((r) => r.payload.aer1.entry && r.payload.aer1.entry.tool !== "aer.close").at(-1);
    workflow = {
      type: "verifiable-workflow-receipt",
      version: "1",
      workflow_id: crypto.randomUUID(),
      receipt_id: crypto.randomUUID(),
      session_id: session.id,
      goal: typeof body.goal === "string" && body.goal.trim() ? body.goal.trim().slice(0, 200) : "session tool calls",
      status: "ok",
      steps,
      merkle_root: await merkleRoot(steps.map((s) => s.receipt_id)),
      output_hash: last.payload.aer1.receipt.output_hash.slice("sha256:".length),
      output_bytes_rule: "sha256 of the last step receipt's decoded canonical_bytes",
      verify_url: origin ? `${origin}/v1/session/${session.id}/aer?workflow=1` : null,
      draft: AER1_DRAFT,
      account_required: false,
    };
  }
  return {
    ok: true,
    aer1: {
      spec: "AZRT-AER1-EXPORT-1.0",
      rib: "RIB-025",
      draft: AER1_DRAFT,
      act_receipt_hash,
      claimed_executed,
      receipt: built.receipt,
      entry: built.entry,
      entry_digest: built.entry_digest,
      output_commitment: built.output_commitment,
      public_resolution: built.public_resolution,
      ...(workflow ? { workflow } : {}),
      ...conformanceView(),
    },
  };
}

export async function verifySealedAer(receipts) {
  const rows = priorAer(receipts);
  if (!rows.length) {
    return { spec: AER1_DRAFT, ok: true, status: "absent", timeline_status: "absent", errors: [], account_required: false, ...conformanceView() };
  }
  const errors = [];
  const entries = [];
  for (const row of rows) {
    const body = row.payload.aer1;
    const core = await verifyCoreAsync(body.receipt);
    const hashFails = core.filter((f) => f.startsWith("hash mismatch") || f.includes("not valid"));
    if (hashFails.length) errors.push({ seq: row.seq, code: "AER-OUTPUT-MISMATCH", detail: hashFails[0] });
    if (body.receipt && body.receipt.provenance_class === PROVENANCE_LOGGED && body.claimed_executed === true) {
      errors.push({ seq: row.seq, code: "AER-PROVENANCE-UPGRADE" });
    }
    if (body.entry_digest && body.entry) {
      try {
        const again = await chainEntryDigest(body.entry);
        if (again !== body.entry_digest) errors.push({ seq: row.seq, code: "AER-ENTRY-DIGEST" });
      } catch {
        errors.push({ seq: row.seq, code: "AER-ENTRY-DIGEST" });
      }
    }
    if (body.entry) entries.push(body.entry);
  }
  const closed = entries.length > 0 && entries[entries.length - 1].close === true && entries.slice(0, -1).every((e) => e.close !== true);
  let timeline_status = "open";
  let chain_failures = [];
  if (closed) {
    chain_failures = await verifyChain08(entries);
    timeline_status = chain_failures.length ? "failed" : "verified";
    for (const detail of chain_failures) errors.push({ seq: rows[rows.length - 1].seq, code: "AER-CHAIN", detail });
  } else {
    for (let i = 0; i < entries.length; i++) {
      if (entries[i].close === true) errors.push({ seq: rows[i].seq, code: "AER-CHAIN", detail: "close before the last entry" });
      if (i === 0 && entries[i].prev_digest !== GENESIS_PREV) errors.push({ seq: rows[i].seq, code: "AER-CHAIN", detail: "genesis" });
      if (i > 0) {
        try {
          const prev = await chainEntryDigest(entries[i - 1]);
          if (entries[i].prev_digest !== prev) errors.push({ seq: rows[i].seq, code: "AER-CHAIN", detail: "prev_digest" });
        } catch {
          errors.push({ seq: rows[i].seq, code: "AER-CHAIN", detail: "prev_digest" });
        }
      }
    }
  }
  const historical = await verifyChain06(entries);
  return {
    spec: AER1_DRAFT,
    ok: errors.length === 0,
    status: errors.length ? "unverified" : closed ? "verified" : "open",
    timeline_status,
    verifies_as_current: closed && chain_failures.length === 0,
    historical_06_would_pass: historical.length === 0,
    historical_06_reported_as_current: false,
    errors,
    count: rows.length,
    ...conformanceView(),
    note: "An open chain is not a closed timeline. A -06 digest is historical and is not reported as the -08 construction. Hash-linked and sealed, not signed. No key was minted.",
  };
}
