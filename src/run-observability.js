/**
 * AZRT-OBS-HYGIENE-1.0 — run observability, strict schema disposition, and log hygiene.
 *
 * Six additive controls (Nov 6–19). They sit on the existing session receipt,
 * FragGate door, and log writers. They do not add an MCP tool, a second door,
 * a signing key, a Remain-OFF flip, or a Cap-7 / paid-satellite path.
 * Cap-7 is not ICANN. Paid satellite stays HELD.
 *
 * 1. capability snapshot — dated hash of active skills, tools, and granted scopes,
 *    sealed on the session open receipt.
 * 2. credential baselines — per-identity class/scope sets. An out-of-baseline touch
 *    seals a finding. Raw secrets are never stored.
 * 3. schema disposition — strict input/output checks (no coercion). Failures return
 *    retry or abort. Nothing is swallowed.
 * 4. result taint — tool output is marked UNTRUSTED with hash, size, and source boundary.
 * 5. redaction — gated, secret, token, and PII-flagged fields are markers on logs
 *    and receipts. A surviving raw secret fails closed.
 * 6. tool errors — failures carry a stable code and reason, not an empty success.
 *
 * Author: Aziel Eliab. Identity is Aziel Eliab only.
 * SPDX-License-Identifier: Apache-2.0
 */

import { createHash } from "node:crypto";
import { canonicalize, sha256Hex } from "./session-core.js";

export const OBS_SPEC = "AZRT-OBS-HYGIENE-1.0";
export const CAPABILITY_SNAPSHOT_SPEC = "AZRT-CAPABILITY-SNAPSHOT-1.0";
export const CREDENTIAL_BASELINE_SPEC = "AZRT-CREDENTIAL-BASELINE-1.0";
export const SCHEMA_DISPOSITION_SPEC = "AZRT-SCHEMA-DISPOSITION-1.0";
export const RESULT_TAINT_SPEC = "AZRT-UNTRUSTED-RESULT-1.0";
export const TOOL_ERROR_SPEC = "AZRT-TOOL-ERROR-1.0";

export const SCHEMA_INPUT_RETRY = "SCHEMA-INPUT-RETRY";
export const SCHEMA_INPUT_ABORT = "SCHEMA-INPUT-ABORT";
export const SCHEMA_OUTPUT_RETRY = "SCHEMA-OUTPUT-RETRY";
export const SCHEMA_OUTPUT_ABORT = "SCHEMA-OUTPUT-ABORT";

const HEX64 = /^[a-f0-9]{64}$/;
const DOOR_META = Object.freeze(["goal_id", "context_refs", "context_hash", "node_ids", "schema_hash"]);
const REQUIRED_ALIASES = Object.freeze({
  fact: ["f"],
  subject: ["s"],
  k: ["kind"],
  q: ["query"],
  op: ["verb"],
  session_id: ["id"],
});
const REDACT_MARK = /^\[REDACTED:[a-z0-9_]+:[a-f0-9]{16}\]$/;
const SECRET_PATTERNS = Object.freeze([
  { class: "bearer", re: /Bearer\s+[A-Za-z0-9\-._~+/]{8,}={0,2}/g },
  { class: "api_key", re: /\bsk-[A-Za-z0-9]{8,}\b/g },
  { class: "private_key", re: /-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/g },
  { class: "token", re: /\bAKIA[0-9A-Z]{16}\b/g },
  { class: "token", re: /\bxox[baprs]-[A-Za-z0-9-]{10,}/g },
]);

const mcpBaselines = { credential_baselines: {} };
let toolSchemaMemo = null;
let staticInventoryMemo = null;
let logWrapInstalled = false;

function sha16(text) {
  return createHash("sha256").update(String(text)).digest("hex").slice(0, 16);
}

function marker(cls, raw) {
  return `[REDACTED:${cls}:${sha16(raw)}]`;
}

export function keyClass(key) {
  const k = String(key || "").toLowerCase().replace(/-/g, "_");
  if (!k || /(_hash|_sha256|_digest|_present|_len|_bytes|_count|_mode)$/.test(k)) return null;
  if (["password", "passwd", "passphrase", "passcode", "pwd", "pw"].includes(k) || k.endsWith("_password")) return "password";
  if (k === "secret" || k.endsWith("_secret")) return "secret";
  if (k === "api_key" || k === "apikey" || k.endsWith("_api_key")) return "api_key";
  if (k === "private_key" || k === "privatekey" || k.endsWith("_private_key")) return "private_key";
  if (k === "authorization" || k === "bearer") return "bearer";
  if (k === "access_token" || k === "refresh_token" || k === "id_token" || k === "token" || k.endsWith("_token")) return "token";
  if (["ssn", "credit_card", "card_number", "cvv", "email", "phone", "dob", "date_of_birth"].includes(k)) return "pii";
  if (k === "gated" || k === "pii") return "gated";
  return null;
}

function flagged(obj) {
  if (!obj || typeof obj !== "object" || Array.isArray(obj)) return false;
  try {
    if (obj.pii === true || obj.gated === true) return true;
    return obj.sensitivity === "gated" || obj.sensitivity === "pii";
  } catch {
    return false;
  }
}

/** True when text still carries a secret-shaped token. */
export function leakScan(text) {
  const s = String(text || "");
  for (const row of SECRET_PATTERNS) {
    row.re.lastIndex = 0;
    if (row.re.test(s)) return true;
  }
  return false;
}

export function redactLogText(text) {
  let out = String(text == null ? "" : text);
  const needles = [];
  for (const row of SECRET_PATTERNS) {
    row.re.lastIndex = 0;
    out = out.replace(row.re, (match) => {
      if (match.length >= 8) needles.push(match);
      return marker(row.class, match);
    });
  }
  for (const needle of needles) {
    if (needle && out.includes(needle)) return "[REDACTED:closed]";
  }
  if (leakScan(out)) return "[REDACTED:closed]";
  return out;
}

function redactString(text, cls) {
  if (cls) return marker(cls, text);
  return redactLogText(text);
}

/**
 * Deep copy with gated / secret / token / PII values replaced.
 * Clean values come back unchanged. A raw secret that survives is replaced
 * by the closed marker (fail closed). Does not mutate the input.
 */
function jsonOrNull(value) {
  try {
    return JSON.stringify(value);
  } catch {
    return null;
  }
}

const CLOSED = "[REDACTED:closed]";
/** Assignment of these names can change the receiver's prototype. They stay data-only or are dropped. */
const PROTO_KEYS = new Set(["__proto__", "constructor", "prototype"]);

function freshObject() {
  return {};
}

function putPlain(out, key, value) {
  if (PROTO_KEYS.has(key)) return;
  Object.defineProperty(out, key, {
    value,
    enumerable: true,
    writable: true,
    configurable: true,
  });
}

function readProp(obj, key) {
  try {
    return { ok: true, value: obj[key] };
  } catch {
    return { ok: false, value: undefined };
  }
}

export function redactValue(value, depth = 0) {
  try {
    return redactValueInner(value, depth);
  } catch {
    return CLOSED;
  }
}

function redactValueInner(value, depth) {
  if (value == null || typeof value === "boolean" || typeof value === "number") return value;
  if (typeof value === "bigint") return CLOSED;
  if (typeof value === "string") return redactLogText(value);
  if (depth > 32) return CLOSED;
  if (Array.isArray(value)) {
    const items = [];
    for (let i = 0; i < value.length; i++) {
      const got = readProp(value, i);
      items.push(got.ok ? redactValue(got.value, depth + 1) : CLOSED);
    }
    return items;
  }
  if (typeof value !== "object") return value;
  const flag = flagged(value);
  const out = freshObject();
  let keys;
  try {
    keys = Object.keys(value);
  } catch {
    return CLOSED;
  }
  for (const key of keys) {
    if (PROTO_KEYS.has(key)) continue;
    const got = readProp(value, key);
    if (!got.ok) {
      putPlain(out, key, CLOSED);
      continue;
    }
    const child = got.value;
    const cls = keyClass(key);
    if (typeof child === "bigint") {
      putPlain(out, key, CLOSED);
      continue;
    }
    if (cls && (typeof child === "string" || (child && typeof child === "object"))) {
      const raw = typeof child === "string" ? child : jsonOrNull(child);
      putPlain(out, key, raw == null ? CLOSED : marker(cls, raw));
      continue;
    }
    if (flag && typeof child === "string" && !HEX64.test(child) && !REDACT_MARK.test(child)) {
      putPlain(out, key, marker("pii", child));
      continue;
    }
    putPlain(out, key, redactValue(child, depth + 1));
  }
  const packed = jsonOrNull(out);
  if (packed == null || leakScan(packed)) return { redacted: true, code: "LOG-LEAK-CLOSED", spec: OBS_SPEC };
  return out;
}

/** Lowercase homoglyphs that still look like Latin after NFKC. */
const CONFUSABLE = Object.freeze({
  "\u0430": "a", "\u0435": "e", "\u0456": "i", "\u0457": "i", "\u0455": "s",
  "\u0442": "t", "\u043e": "o", "\u0440": "p", "\u0441": "c", "\u0443": "y",
  "\u04cf": "l", "\u0131": "i", "\u026a": "i", "\u029f": "l", "\u2113": "l",
  "\u03b1": "a", "\u03b5": "e", "\u03b9": "i", "\u03af": "i", "\u03bf": "o",
  "\u03c1": "p", "\u03c4": "t", "\u043d": "h", "\u04bb": "h",
});

/**
 * Fold a key to comparable letters. NFKC first (fullwidth `＿` / `ｒ` become
 * `_` / `r`), then drop marks, every format character (`\p{Cf}`: soft hyphen,
 * word joiner, bidi marks, BOM), and every whitespace character. Separators
 * `.` `_` `-` go last.
 */
export function normalizeTaintKey(key) {
  const raw = String(key)
    .normalize("NFKC")
    .replace(/\p{M}/gu, "")
    .replace(/\p{Cf}/gu, "")
    .replace(/\s/gu, "")
    .toLowerCase();
  let folded = "";
  for (const ch of raw) folded += CONFUSABLE[ch] || ch;
  return folded.replace(/[._-]+/gu, "");
}

/** result_taint in any case, separator, homoglyph, or zero-width spelling. */
export function isForgedTaintKey(key) {
  return normalizeTaintKey(key) === "resulttaint";
}

/**
 * Plain JSON data only. No accessors, no toJSON, no Proxy identity, no taint key
 * in any spelling. Past depth 32 the subtree is dropped so a nested forged mark
 * cannot survive. A throwing getter becomes the closed marker. Never throws.
 */
export function stripResultTaint(value, depth = 0) {
  try {
    return copyPlain(value, depth);
  } catch {
    return { redacted: true, code: "LOG-LEAK-CLOSED", spec: OBS_SPEC };
  }
}

function copyPlain(value, depth) {
  if (value == null || typeof value === "boolean" || typeof value === "number") return value;
  if (typeof value === "bigint") return CLOSED;
  if (typeof value === "string") return value;
  if (typeof value !== "object") return null;
  if (depth > 32) return CLOSED;
  if (Array.isArray(value)) {
    let len = 0;
    try {
      len = value.length;
    } catch {
      return CLOSED;
    }
    const items = [];
    const cap = Math.min(Number(len) || 0, 10000);
    for (let i = 0; i < cap; i++) {
      let child;
      try {
        child = value[i];
      } catch {
        items.push(CLOSED);
        continue;
      }
      items.push(copyPlain(child, depth + 1));
    }
    return items;
  }
  let keys;
  try {
    keys = Object.keys(value);
  } catch {
    return { redacted: true, code: "LOG-LEAK-CLOSED", spec: OBS_SPEC };
  }
  const out = freshObject();
  for (const key of keys) {
    if (key === "toJSON" || isForgedTaintKey(key) || PROTO_KEYS.has(key)) continue;
    let child;
    try {
      child = value[key];
    } catch {
      putPlain(out, key, CLOSED);
      continue;
    }
    if (typeof child === "function") continue;
    putPlain(out, key, copyPlain(child, depth + 1));
  }
  return out;
}

/** In-place purge. Past depth 32 the subtree is replaced. Never throws. */
export function purgeResultTaint(value, depth = 0) {
  try {
    if (!value || typeof value !== "object") return value;
    if (depth > 32) return CLOSED;
    if (Array.isArray(value)) {
      let len = 0;
      try {
        len = value.length;
      } catch {
        return CLOSED;
      }
      const cap = Math.min(Number(len) || 0, 10000);
      for (let i = 0; i < cap; i++) {
        let child;
        try {
          child = value[i];
        } catch {
          try { value[i] = CLOSED; } catch { /* sealed slot */ }
          continue;
        }
        const next = purgeResultTaint(child, depth + 1);
        if (next !== child) {
          try { value[i] = next; } catch { /* sealed slot */ }
        }
      }
      return value;
    }
    let keys = [];
    try {
      keys = Object.keys(value);
    } catch {
      return CLOSED;
    }
    for (const key of keys) {
      if (PROTO_KEYS.has(key)) continue;
      if (isForgedTaintKey(key)) {
        try { delete value[key]; } catch { /* non-configurable; the copy path does not keep this object */ }
        continue;
      }
      let child;
      try {
        child = value[key];
      } catch {
        try { value[key] = CLOSED; } catch { /* sealed */ }
        continue;
      }
      if (child && typeof child === "object") {
        const next = purgeResultTaint(child, depth + 1);
        if (next !== child) {
          try { value[key] = next; } catch { /* sealed */ }
        }
      }
    }
    return value;
  } catch {
    return CLOSED;
  }
}

/**
 * Fresh plain object for a tool result. Arrays and primitives are wrapped as
 * `{ result, result_taint }` so the runtime mark is always at the top.
 * The returned object is never the tool's object.
 */
export async function mintPlainEnvelope(source, tool) {
  let clean;
  try {
    clean = stripResultTaint(source);
  } catch {
    clean = { redacted: true, code: "LOG-LEAK-CLOSED", spec: OBS_SPEC };
  }
  const wrapped = Array.isArray(clean) || clean == null || typeof clean !== "object";
  const body = wrapped ? { result: clean } : clean;
  let taint;
  try {
    taint = await resultTaint({ tool: tool || "tool", body });
  } catch {
    taint = {
      spec: RESULT_TAINT_SPEC,
      trust: "UNTRUSTED",
      source_boundary: `tool-result:${tool || "tool"}`,
      sha256: "0".repeat(64),
      bytes: 0,
      policy: false,
      operator: false,
    };
  }
  const minted = {};
  let keys = [];
  try {
    keys = Object.keys(body);
  } catch {
    keys = [];
  }
  for (const key of keys) {
    if (key === "result_taint" || PROTO_KEYS.has(key)) continue;
    putPlain(minted, key, body[key]);
  }
  putPlain(minted, "result_taint", taint);
  return minted;
}

export function assertNoGatedLeak(text, samples) {
  const hay = String(text || "");
  const hits = [];
  for (const sample of samples || []) {
    if (sample && String(sample).length >= 8 && hay.includes(String(sample))) hits.push("sample");
  }
  if (leakScan(hay)) hits.push("pattern");
  if (hits.length) {
    const err = new Error("gated data leaked into a log or receipt");
    err.code = "LOG-LEAK-CLOSED";
    throw err;
  }
  return true;
}

const origLog = console.log.bind(console);
const origErr = console.error.bind(console);
const origWarn = console.warn.bind(console);

function redactArg(arg) {
  if (typeof arg === "string") return redactLogText(arg);
  if (arg && typeof arg === "object") return redactValue(arg);
  return arg;
}

/** Install once. Clean lines stay byte-for-byte; secret-shaped text is marked. */
export function installLogRedaction() {
  if (logWrapInstalled) return;
  logWrapInstalled = true;
  console.log = (...args) => origLog(...args.map(redactArg));
  console.error = (...args) => origErr(...args.map(redactArg));
  console.warn = (...args) => origWarn(...args.map(redactArg));
}

function nonempty(v) {
  return typeof v === "string" && v.trim().length > 0;
}

function questionArgs(args) {
  return nonempty(args && args.q) || nonempty(args && args.question) || nonempty(args && args.text);
}

function slashName(v) {
  return typeof v === "string" && v.includes("/");
}

function encodedOp(value) {
  if (typeof value !== "string" || !value.includes("_")) return false;
  const idx = value.lastIndexOf("_");
  return idx > 0 && idx < value.length - 1;
}

function shorthandOp(args) {
  const src = args && typeof args === "object" ? args : {};
  return slashName(src.name) || slashName(src.slug) || encodedOp(src.name) || encodedOp(src.slug) || encodedOp(src.tool) || encodedOp(src.product);
}

/** Documented door alternates. These are not type coercion. */
function alternateSatisfies(tool, key, args) {
  if ((tool === "fraggate_call" || tool === "runtime_run" || tool === "runtime_session_exec") && key === "op") {
    return nonempty(args.job_id) || shorthandOp(args) || (tool === "runtime_run" && questionArgs(args) && !nonempty(args.slug));
  }
  if ((tool === "runtime_run" || tool === "runtime_session_exec") && key === "slug") {
    return shorthandOp(args) || (questionArgs(args) && !nonempty(args.slug));
  }
  return false;
}

function typeOf(value) {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  return typeof value;
}

function typeOk(schema, value) {
  const want = schema && schema.type;
  if (!want) return true;
  if (value === null) return schema.nullable === true;
  if (want === "integer") return typeof value === "number" && Number.isInteger(value);
  if (want === "number") return typeof value === "number" && Number.isFinite(value);
  if (want === "array") return Array.isArray(value);
  if (want === "object") return value !== null && typeof value === "object" && !Array.isArray(value);
  return typeof value === want;
}

function push(errors, path, keyword, message) {
  if (errors.length >= 16) return;
  errors.push({ path: path || "$", keyword, message });
}

function validateNode(schema, value, path, errors) {
  if (!schema || typeof schema !== "object") {
    push(errors, path, "schema", "schema is missing");
    return;
  }
  if (schema.nullable === true && value === null) return;
  if (schema.const !== undefined && value !== schema.const) {
    push(errors, path, "const", "value must equal the schema const");
    return;
  }
  if (Array.isArray(schema.enum) && !schema.enum.includes(value)) {
    push(errors, path, "enum", "value is not in the schema enum");
    return;
  }
  if (schema.type && !typeOk(schema, value)) {
    push(errors, path, "type", `expected ${schema.type}, got ${typeOf(value)}`);
    return;
  }
  if (typeof value === "string") {
    if (Number.isInteger(schema.minLength) && value.length < schema.minLength) {
      push(errors, path, "minLength", `shorter than ${schema.minLength}`);
    }
    if (Number.isInteger(schema.maxLength) && value.length > schema.maxLength) {
      push(errors, path, "maxLength", `longer than ${schema.maxLength}`);
    }
    if (typeof schema.pattern === "string") {
      let re;
      try {
        re = new RegExp(schema.pattern);
      } catch {
        push(errors, path, "schema", "schema pattern is not a valid regular expression");
        return;
      }
      if (!re.test(value)) push(errors, path, "pattern", "value does not match the schema pattern");
    }
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    if (typeof schema.minimum === "number" && value < schema.minimum) push(errors, path, "minimum", `below ${schema.minimum}`);
    if (typeof schema.maximum === "number" && value > schema.maximum) push(errors, path, "maximum", `above ${schema.maximum}`);
  }
  if (Array.isArray(value) && schema.items && typeof schema.items === "object") {
    const cap = Math.min(value.length, 64);
    for (let i = 0; i < cap; i++) validateNode(schema.items, value[i], `${path}[${i}]`, errors);
  }
  if (value && typeof value === "object" && !Array.isArray(value) && (schema.type === "object" || schema.properties || schema.additionalProperties === false)) {
    const props = schema.properties && typeof schema.properties === "object" ? schema.properties : {};
    const required = Array.isArray(schema.required) ? schema.required : [];
    for (const key of required) {
      const aliases = REQUIRED_ALIASES[key] || [];
      const has = value[key] !== undefined && value[key] !== null && value[key] !== "";
      const aliasHit = aliases.some((name) => value[name] !== undefined && value[name] !== null && value[name] !== "");
      if (!has && !aliasHit) push(errors, path ? `${path}.${key}` : key, "required", `${key} is required`);
    }
    for (const [key, child] of Object.entries(props)) {
      if (value[key] === undefined) continue;
      validateNode(child, value[key], path ? `${path}.${key}` : key, errors);
    }
    for (const [key, aliases] of Object.entries(REQUIRED_ALIASES)) {
      if (props[key] == null) continue;
      for (const name of aliases) {
        if (props[name] || value[name] === undefined) continue;
        validateNode(props[key], value[name], path ? `${path}.${name}` : name, errors);
      }
    }
    if (schema.additionalProperties === false) {
      const allowed = new Set([...Object.keys(props), ...DOOR_META]);
      for (const aliases of Object.values(REQUIRED_ALIASES)) for (const name of aliases) allowed.add(name);
      for (const key of Object.keys(value)) {
        if (!allowed.has(key)) push(errors, path ? `${path}.${key}` : key, "additionalProperties", `${key} is not in the schema`);
      }
    }
  }
}

function dispositionOf(errors, phase) {
  if (!errors.length) return null;
  const schemaBroken = errors.some((e) => e.keyword === "schema");
  const contract = phase === "output" && errors.some((e) => e.keyword === "type" || e.keyword === "enum" || e.keyword === "const" || e.keyword === "pattern");
  const abort = schemaBroken || contract;
  const code = phase === "output"
    ? (abort ? SCHEMA_OUTPUT_ABORT : SCHEMA_OUTPUT_RETRY)
    : (abort ? SCHEMA_INPUT_ABORT : SCHEMA_INPUT_RETRY);
  return {
    ok: false,
    code,
    disposition: abort ? "abort" : "retry",
    spec: SCHEMA_DISPOSITION_SPEC,
    phase,
    executed: phase === "output",
    accepted: false,
    returned: false,
    status: abort ? 422 : 400,
    errors,
    message: abort
      ? "Schema validation failed. Disposition is abort. The value was not coerced and was not returned as success."
      : "Schema validation failed. Disposition is retry. Fix the value and send it again. Nothing was coerced.",
  };
}

export function validateAgainst(schema, value, phase = "input") {
  const errors = [];
  if (!schema || typeof schema !== "object") {
    push(errors, "$", "schema", "no schema for this tool");
    return { ok: false, errors, failure: dispositionOf(errors, phase) };
  }
  const expectObject = schema.type === "object" || schema.properties || schema.additionalProperties === false;
  if (expectObject && (value == null || typeof value !== "object" || Array.isArray(value))) {
    push(errors, "$", "type", `expected object, got ${typeOf(value)}`);
    return { ok: false, errors, failure: dispositionOf(errors, phase) };
  }
  validateNode(schema, value, "", errors);
  if (!errors.length) return { ok: true, errors };
  return { ok: false, errors, failure: dispositionOf(errors, phase) };
}

async function toolSchemas() {
  if (toolSchemaMemo) return toolSchemaMemo;
  const { buildMcpToolList } = await import("./mcp-surface.js");
  const { sessionMcpTools } = await import("./session-http.js");
  const map = new Map();
  for (const tool of buildMcpToolList({ sessionTools: sessionMcpTools() })) {
    map.set(tool.name, { input: tool.inputSchema || null, output: tool.outputSchema || null });
  }
  toolSchemaMemo = map;
  return map;
}

const INTERNAL_CHAINS = new Set(["agentcomms", "refusals", "coverage"]);

function admitInternalChains(tool, args, errors) {
  if (!tool || !tool.startsWith("chainlock_") || !args || typeof args !== "object") return;
  const kept = [];
  for (const err of errors) {
    const key = String(err.path || "").split(".").pop();
    if (err.keyword === "enum" && (key === "c" || key === "chain") && INTERNAL_CHAINS.has(args[key])) continue;
    kept.push(err);
  }
  errors.length = 0;
  for (const err of kept) errors.push(err);
}

function applyAdmission(tool, schema, args, errors) {
  if (!schema || !Array.isArray(schema.required)) return;
  const kept = [];
  for (const err of errors) {
    if (err.keyword !== "required") {
      kept.push(err);
      continue;
    }
    const key = err.path.split(".").pop();
    if (alternateSatisfies(tool, key, args)) continue;
    kept.push(err);
  }
  errors.length = 0;
  for (const err of kept) errors.push(err);
}

/**
 * Strict check of one tool invocation. `phase` is "input" or "output".
 * Pass `schema` in tests to avoid the live tool list.
 */
export async function validateToolInvocation({ name, args, phase = "input", output, schema }) {
  const { resolvePublicToolName } = await import("./fraggate/codes.js");
  const tool = resolvePublicToolName(name);
  let inputSchema = schema || null;
  let outputSchema = null;
  if (!schema) {
    const map = await toolSchemas();
    const row = map.get(tool);
    if (!row) {
      const errors = [];
      push(errors, "$", "schema", `no schema for ${tool || "tool"}`);
      const failure = dispositionOf(errors, phase);
      return { ok: false, ...failure, result: null };
    }
    inputSchema = row.input;
    outputSchema = row.output;
  }
  if (phase === "output") {
    if (output == null) return { ok: true, phase, executed: true };
    // `status` is an HTTP integer on display wrappers and a catalog string
    // (stub, live, local_only) on FragGate door bodies. Both are real.
    // A string is not coerced into an integer, and an integer is not coerced
    // into a catalog word. Any other shape is a type abort.
    const outputSchemaUsed = relaxStatusSchema(schema || outputSchema || { type: "object", additionalProperties: true }, output);
    const checked = validateAgainst(outputSchemaUsed, output, "output");
    const statusErr = statusShapeError(output);
    if (statusErr) checked.errors.push(statusErr);
    if (!checked.errors.length) return { ok: true, phase: "output", executed: true };
    const failure = dispositionOf(checked.errors, "output");
    return { ok: false, ...failure, result: null };
  }
  const prepared = prepareArgs(inputSchema, args);
  const checked = validateAgainst(inputSchema, prepared, "input");
  if (!checked.ok && inputSchema) {
    const preparedArgs = prepared && typeof prepared === "object" ? prepared : {};
    applyAdmission(tool, inputSchema, preparedArgs, checked.errors);
    admitInternalChains(tool, preparedArgs, checked.errors);
  }
  if (!checked.errors || checked.errors.length === 0) return { ok: true, phase: "input" };
  const failure = dispositionOf(checked.errors, "input");
  return { ok: false, ...failure, result: null };
}

function relaxStatusSchema(schema, output) {
  if (!schema || !schema.properties || !schema.properties.status) return schema;
  if (!output || typeof output.status !== "string") return schema;
  const properties = { ...schema.properties, status: { description: schema.properties.status.description } };
  return { ...schema, properties };
}

function statusShapeError(output) {
  if (!output || typeof output !== "object" || output.status == null) return null;
  const status = output.status;
  if (typeof status === "number" && Number.isInteger(status)) return null;
  if (typeof status === "string" && /^[a-z0-9_.:-]{1,64}$/.test(status)) return null;
  return { path: "status", keyword: "type", message: "expected integer or catalog status string" };
}

function prepareArgs(schema, args) {
  if (!args || typeof args !== "object" || Array.isArray(args)) return args;
  const props = schema && schema.properties && typeof schema.properties === "object" ? schema.properties : {};
  const copy = { ...args };
  for (const key of DOOR_META) {
    if (!Object.prototype.hasOwnProperty.call(props, key)) delete copy[key];
  }
  return copy;
}

export async function resultTaint({ tool, body, boundary = "tool-result" }) {
  let encoded = "";
  if (typeof body === "string") encoded = body;
  else {
    try {
      encoded = canonicalize(body == null ? null : body);
    } catch {
      encoded = JSON.stringify(body == null ? null : body);
    }
  }
  const bytes = new TextEncoder().encode(encoded).length;
  return {
    spec: RESULT_TAINT_SPEC,
    trust: "UNTRUSTED",
    source_boundary: `${boundary}:${tool || "tool"}`,
    sha256: await sha256Hex(encoded),
    bytes,
    policy: false,
    operator: false,
  };
}

export function resultTaintFromDigest({ tool, sha256, bytes, boundary = "tool-result" }) {
  if (typeof sha256 !== "string" || !HEX64.test(sha256)) return null;
  const n = Number(bytes);
  if (!Number.isInteger(n) || n < 0) return null;
  return {
    spec: RESULT_TAINT_SPEC,
    trust: "UNTRUSTED",
    source_boundary: `${boundary}:${tool || "tool"}`,
    sha256,
    bytes: n,
    policy: false,
    operator: false,
  };
}

export function taintShapeOk(taint) {
  if (!taint || typeof taint !== "object") return false;
  return taint.spec === RESULT_TAINT_SPEC
    && taint.trust === "UNTRUSTED"
    && taint.policy === false
    && taint.operator === false
    && typeof taint.source_boundary === "string"
    && taint.source_boundary.startsWith("tool-result:")
    && typeof taint.sha256 === "string"
    && HEX64.test(taint.sha256)
    && Number.isInteger(taint.bytes)
    && taint.bytes >= 0;
}

export function explicitToolError({ status, error, code, thrown = false } = {}) {
  const http = Number(status);
  const failed = thrown || (Number.isInteger(http) && http >= 400) || (error != null && String(error).length > 0) || (typeof code === "string" && code && code !== "FG-OK");
  if (!failed) return null;
  let stable = typeof code === "string" && /^[A-Z0-9][A-Z0-9-]{1,63}$/.test(code) ? code : "";
  if (!stable && thrown) stable = "TOOL-THROWN";
  else if (!stable && Number.isInteger(http) && http >= 500) stable = "TOOL-HTTP-5XX";
  else if (!stable && Number.isInteger(http) && http >= 400) stable = "TOOL-HTTP-4XX";
  else if (!stable) stable = "TOOL-FAILED";
  const reason = redactLogText(error == null ? stable : String(error)).slice(0, 240);
  return {
    spec: TOOL_ERROR_SPEC,
    ok: false,
    code: stable,
    reason: reason || stable,
    status: Number.isInteger(http) ? http : null,
    disposition: thrown || (Number.isInteger(http) && http >= 500) ? "retry" : "abort",
  };
}

export function toolErrorShapeOk(row) {
  if (!row || typeof row !== "object") return false;
  return row.spec === TOOL_ERROR_SPEC && row.ok === false && typeof row.code === "string" && /^[A-Z0-9][A-Z0-9-]{1,63}$/.test(row.code) && typeof row.reason === "string";
}

function classesOf(value, out, depth) {
  if (!value || typeof value !== "object" || depth > 8) return;
  if (Array.isArray(value)) {
    for (const item of value) classesOf(item, out, depth + 1);
    return;
  }
  if (value.credential_mode === "hosted") out.add("password");
  const scopes = value.credential_scopes || value.scopes;
  if (Array.isArray(scopes)) {
    for (const scope of scopes) {
      if (typeof scope !== "string") continue;
      const token = scope.trim().toLowerCase();
      if (!/^[a-z][a-z0-9_.:-]{0,63}$/.test(token)) continue;
      if (leakScan(token)) continue;
      const known = ["password", "secret", "api_key", "private_key", "bearer", "token", "pii", "gated"].includes(token);
      out.add(known || token.startsWith("scope:") ? token : `scope:${token}`);
    }
  }
  for (const [key, child] of Object.entries(value)) {
    if (key === "credential_scopes" || key === "scopes" || key === "credential_mode") continue;
    const cls = keyClass(key);
    if (cls && typeof child === "string" && child.length > 0 && !REDACT_MARK.test(child)) out.add(cls);
    else if (child && typeof child === "object") classesOf(child, out, depth + 1);
  }
}

export function credentialClassesOf(value) {
  const out = new Set();
  classesOf(value, out, 0);
  return [...out].sort();
}

export async function identityHash(identity) {
  const text = String(identity == null || String(identity).trim() === "" ? "public" : identity).trim().toLowerCase();
  return sha256Hex(`aziel-runtime.credential-identity|${text}`);
}

export function resetCredentialBaselines() {
  mcpBaselines.credential_baselines = {};
}

export function mcpCredentialStore() {
  return mcpBaselines;
}

/**
 * Record the classes an identity touched. The first non-empty touch establishes
 * the baseline. A later class outside that set seals an anomaly. The baseline
 * is not widened by the anomaly. Secrets are not copied.
 */
export async function observeCredentialTouch({ store, identity, value }) {
  const touched = credentialClassesOf(value);
  if (!touched.length) return { touched, established: false, anomaly: null, baselineView: null };
  const box = store && typeof store === "object" ? store : mcpBaselines;
  if (!box.credential_baselines || typeof box.credential_baselines !== "object" || Array.isArray(box.credential_baselines)) {
    box.credential_baselines = {};
  }
  const idh = await identityHash(identity);
  const prior = Array.isArray(box.credential_baselines[idh]) ? box.credential_baselines[idh].slice() : null;
  if (!prior) {
    box.credential_baselines[idh] = touched.slice();
    return {
      touched,
      established: true,
      anomaly: null,
      baselineView: {
        spec: CREDENTIAL_BASELINE_SPEC,
        identity_hash: idh,
        classes: touched.slice(),
        established: true,
      },
    };
  }
  const outside = touched.filter((cls) => !prior.includes(cls));
  if (!outside.length) return { touched, established: false, anomaly: null, baselineView: null };
  const body = {
    spec: CREDENTIAL_BASELINE_SPEC,
    identity_hash: idh,
    baseline: prior,
    touched,
    out_of_baseline: outside,
  };
  const finding_hash = await sha256Hex(canonicalize(body));
  return { touched, established: false, anomaly: { ...body, finding_hash }, baselineView: null };
}

export async function verifyCredentialFinding(finding) {
  if (!finding || typeof finding !== "object" || finding.spec !== CREDENTIAL_BASELINE_SPEC) return false;
  if (typeof finding.finding_hash !== "string" || !HEX64.test(finding.finding_hash)) return false;
  const { finding_hash: _omit, ...body } = finding;
  const expect = await sha256Hex(canonicalize(body));
  return expect === finding.finding_hash;
}

function sortedNames(tools) {
  const rows = [];
  for (const tool of tools || []) {
    const name = typeof tool === "string" ? tool : tool && tool.name;
    if (typeof name !== "string" || !name) continue;
    rows.push(name);
  }
  return [...new Set(rows)].sort();
}

async function hashJson(value) {
  return sha256Hex(canonicalize(value));
}

export async function capabilitySnapshot({ at, tools, skills, scopes }) {
  const when = typeof at === "string" && at ? at : "";
  if (!when) {
    const err = new Error("capability snapshot needs a timestamp");
    err.code = "CAPABILITY-SNAPSHOT-ABORT";
    throw err;
  }
  const toolRows = [];
  for (const name of sortedNames(tools)) {
    const src = (tools || []).find((tool) => (typeof tool === "string" ? tool : tool && tool.name) === name);
    const schema = src && typeof src === "object" ? src.inputSchema || src.schema || null : null;
    toolRows.push({ name, schema_sha256: schema ? await hashJson(schema) : null });
  }
  const skillRows = [];
  for (const skill of skills || []) {
    if (!skill || typeof skill.id !== "string") continue;
    const text = skill.text == null ? "" : String(skill.text);
    skillRows.push({
      id: skill.id,
      sha256: skill.sha256 || await sha256Hex(text),
      bytes: Number.isInteger(skill.bytes) ? skill.bytes : new TextEncoder().encode(text).length,
      source: typeof skill.source === "string" ? skill.source : "skill",
    });
  }
  skillRows.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  const scopeRows = [...new Set((scopes || []).filter((s) => typeof s === "string" && s.length > 0 && s.length <= 80))].sort();
  const body = {
    spec: CAPABILITY_SNAPSHOT_SPEC,
    at: when,
    tools: toolRows,
    skills: skillRows,
    scopes: scopeRows,
  };
  return {
    ...body,
    tools_hash: await hashJson(toolRows),
    skills_hash: await hashJson(skillRows),
    scopes_hash: await hashJson(scopeRows),
    snapshot_hash: await hashJson(body),
  };
}

export async function verifyCapabilitySnapshot(snap) {
  if (!snap || snap.spec !== CAPABILITY_SNAPSHOT_SPEC) return { ok: false, code: "CAPABILITY-SNAPSHOT-TAMPER" };
  const body = { spec: snap.spec, at: snap.at, tools: snap.tools, skills: snap.skills, scopes: snap.scopes };
  const snapshot_hash = await hashJson(body);
  const tools_hash = await hashJson(snap.tools);
  const skills_hash = await hashJson(snap.skills);
  const scopes_hash = await hashJson(snap.scopes);
  if (snapshot_hash !== snap.snapshot_hash || tools_hash !== snap.tools_hash || skills_hash !== snap.skills_hash || scopes_hash !== snap.scopes_hash) {
    return { ok: false, code: "CAPABILITY-SNAPSHOT-TAMPER" };
  }
  return { ok: true };
}

function scopesFromPolicy(policy) {
  const src = policy && typeof policy === "object" ? policy : {};
  const slugs = Array.isArray(src.allow_slugs) && src.allow_slugs.length ? src.allow_slugs : ["*"];
  const ops = Array.isArray(src.allow_ops) && src.allow_ops.length ? src.allow_ops : ["*"];
  const scopes = [];
  for (const slug of slugs) if (typeof slug === "string" && slug) scopes.push(`slug:${slug}`);
  for (const op of ops) if (typeof op === "string" && op) scopes.push(`op:${op}`);
  scopes.push(`kv_increment:${src.kv_increment === true}`);
  scopes.push(`require_decision:${src.require_decision === true}`);
  return scopes;
}

async function staticInventory() {
  if (staticInventoryMemo) return staticInventoryMemo;
  const { buildMcpToolList } = await import("./mcp-surface.js");
  const { sessionMcpTools } = await import("./session-http.js");
  const { runtimeSkillMarkdown } = await import("./runtime-api.js");
  let products = [];
  try {
    const mod = await import("./index.js");
    products = Array.isArray(mod.PRODUCTS) ? mod.PRODUCTS : [];
  } catch {
    const err = new Error("capability snapshot could not read the active catalog");
    err.code = "CAPABILITY-SNAPSHOT-ABORT";
    throw err;
  }
  const tools = buildMcpToolList({ sessionTools: sessionMcpTools() });
  if (!tools.length) {
    const err = new Error("capability snapshot found no active tools");
    err.code = "CAPABILITY-SNAPSHOT-ABORT";
    throw err;
  }
  const text = runtimeSkillMarkdown("https://aziel-runtime.vibelock.workers.dev", products, {});
  staticInventoryMemo = { tools, skillText: text };
  return staticInventoryMemo;
}

/** Dated snapshot of the tools, runtime skill, and this session's granted scopes. */
export async function snapshotForSession(session, at) {
  const inventory = await staticInventory();
  const granted = session && session.policy && Array.isArray(session.policy.allow_slugs) ? session.policy.allow_slugs : ["*"];
  const skills = [{ id: "runtime", text: inventory.skillText, source: "runtime-skill" }];
  for (const slug of granted) {
    if (typeof slug !== "string" || !slug || slug === "*") continue;
    const text = `granted-software:${slug}`;
    skills.push({ id: `software:${slug}`, text, source: "policy-grant" });
  }
  return capabilitySnapshot({
    at,
    tools: inventory.tools,
    skills,
    scopes: scopesFromPolicy(session && session.policy),
  });
}

export async function verifyObsReceipts(receipts) {
  const errors = [];
  for (const rec of receipts || []) {
    if (!rec || typeof rec !== "object") continue;
    if (rec.capability_snapshot) {
      const snap = await verifyCapabilitySnapshot(rec.capability_snapshot);
      if (!snap.ok) errors.push({ seq: rec.seq, error: snap.code });
    }
    const intent = rec.payload && rec.payload.intent;
    if (intent && intent.credential_anomaly) {
      const ok = await verifyCredentialFinding(intent.credential_anomaly);
      if (!ok) errors.push({ seq: rec.seq, error: "CREDENTIAL-FINDING-TAMPER" });
    }
    const result = rec.payload && rec.payload.result;
    if (result && result.result_taint && !taintShapeOk(result.result_taint)) {
      errors.push({ seq: rec.seq, error: "RESULT-TAINT-INVALID" });
    }
    if (result && result.tool_error && !toolErrorShapeOk(result.tool_error)) {
      errors.push({ seq: rec.seq, error: "TOOL-ERROR-SHAPE" });
    }
  }
  return { ok: errors.length === 0, errors, spec: OBS_SPEC };
}

installLogRedaction();
