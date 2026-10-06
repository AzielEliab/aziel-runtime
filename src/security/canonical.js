/**
 * AZP-CANON-1 — deterministic encoding for AZP-NS-1.0.
 *
 * Object canonical form is `canonicalize` from src/session-core.js:
 * sorted keys, JSON string escaping, no undefined, finite numbers only.
 * Ledger hashes do not use that object form. They hash length-prefixed
 * fields (domain separation) so a JavaScript object dump is never the hash input.
 *
 * Author: Aziel Eliab only.
 */

import { canonicalize, sha256Hex } from "../session-core.js";

export const CANON_SPEC = "AZP-CANON-1";

export { canonicalize, sha256Hex };

const textEncoder = new TextEncoder();

export function utf8(value) {
  return textEncoder.encode(String(value));
}

export function bytesToHex(bytes) {
  const u8 = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let out = "";
  for (let i = 0; i < u8.length; i++) out += u8[i].toString(16).padStart(2, "0");
  return out;
}

export function hexToBytes(hex) {
  const raw = String(hex || "");
  if (!/^[a-f0-9]*$/.test(raw) || raw.length % 2 !== 0) return null;
  const out = new Uint8Array(raw.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = Number.parseInt(raw.slice(i * 2, i * 2 + 2), 16);
  return out;
}

export function bytesToB64url(bytes) {
  const u8 = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let s = "";
  for (let i = 0; i < u8.length; i++) s += String.fromCharCode(u8[i]);
  return btoa(s).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

export function b64urlToBytes(value) {
  const raw = String(value || "").trim();
  if (!raw || /[^A-Za-z0-9_-]/.test(raw)) return null;
  const pad = raw.length % 4 === 0 ? "" : "=".repeat(4 - (raw.length % 4));
  let bin;
  try {
    bin = atob(raw.replaceAll("-", "+").replaceAll("_", "/") + pad);
  } catch {
    return null;
  }
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

/** Best-effort wipe of a Uint8Array copy. This does not wipe a key. */
export function zeroize(bytes) {
  if (bytes instanceof Uint8Array) bytes.fill(0);
}

export async function sha256Bytes(bytes) {
  const buf = await crypto.subtle.digest("SHA-256", bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes));
  return new Uint8Array(buf);
}

/**
 * SHA-256 over: label || 0x00 || (uint32be length || bytes)* 
 * `parts` are Uint8Array or strings (UTF-8).
 */
export async function domainHash(label, parts) {
  const chunks = [utf8(String(label)), Uint8Array.of(0)];
  for (const part of parts) {
    const bytes = part instanceof Uint8Array ? part : utf8(part);
    const len = new Uint8Array(4);
    new DataView(len.buffer).setUint32(0, bytes.length);
    chunks.push(len, bytes);
  }
  let total = 0;
  for (const chunk of chunks) total += chunk.length;
  const joined = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    joined.set(chunk, offset);
    offset += chunk.length;
  }
  const digest = await sha256Bytes(joined);
  zeroize(joined);
  return bytesToHex(digest);
}

export async function canonicalHash(value) {
  return sha256Hex(canonicalize(value));
}

export const ZERO_HASH = "0".repeat(64);

export function isHex64(value) {
  return /^[a-f0-9]{64}$/.test(String(value || ""));
}
