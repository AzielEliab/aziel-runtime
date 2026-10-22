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

const KEYS = new WeakMap();
const SCRUBBED = new WeakSet();
const CRED_FIELDS = ["username", "password", "user", "pass", "passphrase"];

export function isArkAccountCall(args) {
  if (!args || typeof args !== "object" || Array.isArray(args)) return false;
  const slug = String(args.slug || args.name || args.product || "").trim().toLowerCase();
  return slug === "ark" && /^account[_-]/i.test(String(args.op || "").trim());
}

function strip(obj) {
  let u, p;
  if (!obj || typeof obj !== "object" || Array.isArray(obj)) return { obj, u, p };
  const out = { ...obj };
  for (const f of CRED_FIELDS) {
    if (f in out) {
      if ((f === "username" || f === "user") && u === undefined) u = out[f];
      if ((f === "password" || f === "pass" || f === "passphrase") && p === undefined) p = out[f];
      delete out[f];
    }
  }
  return { obj: out, u, p };
}

export async function arkFirewall(args) {
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
    try {
      KEYS.set(out, await deriveArkAccount(u, p));
    } catch {
      out.credential_error = "ARK-INPUT";
    }
  }
  return out;
}

export function arkKeysFor(args) {
  return args && typeof args === "object" ? KEYS.get(args) || null : null;
}
export function wasScrubbed(args) {
  return !!(args && typeof args === "object" && SCRUBBED.has(args));
}
