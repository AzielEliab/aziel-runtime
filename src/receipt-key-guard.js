/**
 * AZRT-KEY-ROTATION-1.0. A new receipt key is accepted only with a statement
 * signed by the old key and by an operator root key.
 * Root public keys come from OPERATOR_ROOT_PUBKEY. If that set is empty,
 * replacement is refused. A retired-list edit with no statement is refused.
 * This module does not generate, export, or store a private key.
 * Author: Aziel Eliab.
 */
import { canonicalize } from "./session-core.js";

export const ROTATION_SPEC = "AZRT-KEY-ROTATION-1.0";

function b64urlToBytes(text) {
  const s = String(text || "").replace(/-/g, "+").replace(/_/g, "/");
  const pad = s.length % 4 ? "=".repeat(4 - (s.length % 4)) : "";
  const bin = atob(s + pad);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export function operatorRootPubkeys(env, extra) {
  const fromEnv = env && env.OPERATOR_ROOT_PUBKEY != null ? String(env.OPERATOR_ROOT_PUBKEY) : "";
  const parts = [...fromEnv.split(/[\s,]+/), ...(Array.isArray(extra) ? extra : extra ? [extra] : [])];
  return [...new Set(parts.map((s) => String(s || "").trim()).filter(Boolean))];
}

export function rotationBody(oldPublic, newPublic) {
  return { spec: ROTATION_SPEC, old_public_key: String(oldPublic || ""), new_public_key: String(newPublic || "") };
}

function readStatement(env, statement) {
  if (statement && typeof statement === "object") return statement;
  const raw = env && env.OPERATOR_KEY_STATEMENT;
  if (raw && typeof raw === "object") return raw;
  if (typeof raw === "string" && raw.trim()) {
    try {
      return JSON.parse(raw);
    } catch {
      return { malformed: true };
    }
  }
  return null;
}

async function verifyRaw(publicKeyB64url, message, sigB64url) {
  try {
    const key = await crypto.subtle.importKey("raw", b64urlToBytes(publicKeyB64url), { name: "Ed25519" }, false, ["verify"]);
    return await crypto.subtle.verify({ name: "Ed25519" }, key, b64urlToBytes(sigB64url), new TextEncoder().encode(message));
  } catch {
    return false;
  }
}

/**
 * Check a replacement statement. Does not sign.
 * Returns { ok:true } or { ok:false, code, reason }.
 */
export async function verifyKeyRotation({ old_public_key, new_public_key, old_sig, root_sig, rootPubkeys } = {}) {
  const roots = (rootPubkeys || []).map((k) => String(k || "").trim()).filter(Boolean);
  if (!roots.length) {
    return { ok: false, code: "KEY-ROTATION-NO-ROOT", reason: "OPERATOR_ROOT_PUBKEY is not configured; replacement is refused" };
  }
  if (!old_public_key || !new_public_key || (!old_sig && !root_sig)) {
    return { ok: false, code: "KEY-ROTATION-UNSIGNED", reason: "replacement statement has no signatures" };
  }
  const msg = canonicalize(rotationBody(old_public_key, new_public_key));
  const oldOk = old_sig ? await verifyRaw(old_public_key, msg, old_sig) : false;
  let rootOk = false;
  if (root_sig) {
    for (const root of roots) {
      if (await verifyRaw(root, msg, root_sig)) {
        rootOk = true;
        break;
      }
    }
  }
  if (oldOk && !rootOk) return { ok: false, code: "KEY-ROTATION-ROOT-SIG", reason: "replacement has the old key signature only" };
  if (rootOk && !oldOk) return { ok: false, code: "KEY-ROTATION-OLD-SIG", reason: "replacement has the operator root signature only" };
  if (!oldOk || !rootOk) return { ok: false, code: "KEY-ROTATION-UNSIGNED", reason: "replacement signatures did not verify" };
  return { ok: true, code: "KEY-ROTATION-OK", spec: ROTATION_SPEC };
}

/** Refuse a new held key when an older key is listed and the statement is missing or incomplete. */
export async function admitReplacement({ env, heldPublic, epochs, statement, rootPubkeys, pinnedKeys = [] } = {}) {
  const roots = operatorRootPubkeys(env, rootPubkeys);
  const doc = readStatement(env, statement);
  if (!roots.length) {
    return { ok: false, code: "KEY-ROTATION-NO-ROOT", reason: "OPERATOR_ROOT_PUBKEY is not configured; a retired-list edit is not a replacement" };
  }
  if (!doc || doc.malformed) {
    return { ok: false, code: "KEY-ROTATION-UNSIGNED", reason: "a retired-list edit alone is refused; the replacement statement is missing" };
  }
  const verdict = await verifyKeyRotation({
    old_public_key: doc.old_public_key,
    new_public_key: doc.new_public_key,
    old_sig: doc.old_sig,
    root_sig: doc.root_sig,
    rootPubkeys: roots,
  });
  if (!verdict.ok) return verdict;
  if (String(doc.new_public_key || "") !== String(heldPublic || "")) {
    return { ok: false, code: "KEY-ROTATION-NEW-KEY", reason: "replacement statement is not for the held key" };
  }
  const { keyIdOf } = await import("./receipt-signing.js");
  const oldId = await keyIdOf(doc.old_public_key);
  let listed = false;
  for (const e of epochs || []) {
    if (e && e.public_key && (await keyIdOf(e.public_key)) === oldId) listed = true;
  }
  let oldIsPinned = false;
  for (const k of pinnedKeys || []) {
    if ((await keyIdOf(k)) === oldId) oldIsPinned = true;
  }
  if (!listed && !oldIsPinned) return { ok: false, code: "KEY-ROTATION-OLD-KEY", reason: "the old key in the statement is not the pinned key or a listed retired key" };
  return { ok: true, code: "KEY-ROTATION-OK", spec: ROTATION_SPEC };
}
