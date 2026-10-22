/**
 * USER-SIGNIN-ARK-1.0 §4 credential firewall. Runs FIRST at every door for
 * { slug|name|product: "ark", op: "account_*" }. Derives keys in memory, deletes
 * username/password (top level and payload), and keeps the keys in a WeakMap
 * keyed by the returned args object. JSON never carries the secret or a hash of
 * it, so ledger rows, attempt links, refusal args_digest, background jobs,
 * telemetry and receipts cannot see it. Fails closed: any error drops the
 * credentials and leaves no keys (the op then refuses ARK-INPUT).
 * Author: Aziel Eliab. SPDX-License-Identifier: Apache-2.0
 */
import { deriveArkAccount } from "./ark-kdf.js";

let parseTarget = null; // loaded lazily (static import would cycle through the engine registry)
async function loadParse() {
  if (!parseTarget) parseTarget = (await import("../fraggate/registry.js")).parseTarget;
}

const CREDS = new WeakMap(); // args → { u, p } raw; derived lazily by ops AFTER flag + rate checks (MED-2)
const KEYS = new WeakMap();
const SCRUBBED = new WeakSet();
const USER_KEYS = new Set(["username", "user", "user_name", "login", "uname"]);
const PASS_KEYS = new Set(["password", "pass", "passphrase", "passwd", "pwd", "pw", "secret"]);
const ARK_MINI = { bySlug: { ark: { slug: "ark" } }, byName: { "the ark": { slug: "ark" }, ark: { slug: "ark" } } };

const norm = (k) => String(k).toLowerCase().replace(/[^a-z_]/g, "");

/** Detect ark account calls in every shape parseTarget routes (name "ark/account_x", "ark_account_x", tool, verb …). */
export function isArkAccountCall(args) {
  if (!args || typeof args !== "object" || Array.isArray(args)) return false;
  let t;
  try { t = parseTarget ? parseTarget(args, ARK_MINI, ARK_MINI.bySlug) : null; } catch { t = null; }
  if (t && t.slug === "ark" && /^account[_-]/i.test(String(t.op || ""))) return true;
  // Belt and braces: any routing field that names an account_* op.
  return ["name", "slug", "product", "tool", "op", "verb"].some((f) => /(^|[/_\s-])account[_-]/i.test(String(args[f] || "")));
}

function strip(obj) {
  let u, p;
  if (!obj || typeof obj !== "object" || Array.isArray(obj)) return { obj, u, p };
  const out = { ...obj };
  for (const k of Object.keys(out)) {
    const n = norm(k);
    if (USER_KEYS.has(n)) { if (u === undefined) u = out[k]; delete out[k]; }
    else if (PASS_KEYS.has(n)) { if (p === undefined) p = out[k]; delete out[k]; }
  }
  return { obj: out, u, p };
}

/** Deep-remove credential-looking keys (case-insensitive). Used on any echo (MCP retry hints). */
export function scrubCredentialKeys(v, depth = 0) {
  if (depth > 6 || !v || typeof v !== "object") return v;
  if (Array.isArray(v)) return v.map((x) => scrubCredentialKeys(x, depth + 1));
  const out = {};
  for (const [k, x] of Object.entries(v)) {
    const n = norm(k);
    if (USER_KEYS.has(n) || PASS_KEYS.has(n)) continue;
    out[k] = scrubCredentialKeys(x, depth + 1);
  }
  return out;
}

export async function arkFirewall(args) {
  await loadParse();
  if (!isArkAccountCall(args) || SCRUBBED.has(args)) return args;
  const top = strip(args);
  const inner = strip(top.obj.payload);
  const out = top.obj;
  if (inner.obj !== undefined && out.payload !== undefined) out.payload = inner.obj;
  const u = top.u !== undefined ? top.u : inner.u;
  const p = top.p !== undefined ? top.p : inner.p;
  SCRUBBED.add(out);
  if (u !== undefined || p !== undefined) {
    out.credential_mode = "hosted";
    CREDS.set(out, { u, p }); // no PBKDF2 here: ops derives only after ARK_ACCOUNTS + rate checks
  }
  return out;
}

/** Hosted credentials held off-JSON (never serialized). */
export function arkCredsFor(args) {
  return args && typeof args === "object" ? CREDS.get(args) || null : null;
}
/** Derive (once) and cache keys. Throws ARK-INPUT on bad input. */
export async function arkDeriveFor(args) {
  if (KEYS.has(args)) return KEYS.get(args);
  const c = CREDS.get(args);
  if (!c) return null;
  CREDS.delete(args);
  const k = await deriveArkAccount(c.u, c.p);
  KEYS.set(args, k);
  return k;
}
export function arkKeysFor(args) {
  return args && typeof args === "object" ? KEYS.get(args) || null : null;
}
export function wasScrubbed(args) {
  return !!(args && typeof args === "object" && SCRUBBED.has(args));
}
