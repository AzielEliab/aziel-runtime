/**
 * Canonical bytes, base64url, hashes. Author: Aziel Eliab only.
 */

import { canonicalize, sha256Hex } from "../session-core.js";
import { CROCKFORD, HANDLE_LEN, HANDLE_RE, ZERO_HASH } from "./spec.js";

export function bytesToB64url(bytes) {
  const u8 = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let s = "";
  for (let i = 0; i < u8.length; i++) s += String.fromCharCode(u8[i]);
  return btoa(s).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

export function b64urlToBytes(text) {
  const raw = String(text || "").trim();
  if (!raw || /[^A-Za-z0-9_-]/.test(raw)) return null;
  const pad = raw.length % 4 === 0 ? "" : "=".repeat(4 - (raw.length % 4));
  const b64 = raw.replaceAll("-", "+").replaceAll("_", "/") + pad;
  let bin;
  try {
    bin = atob(b64);
  } catch {
    return null;
  }
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export async function sha256Bytes(bytes) {
  const buf = await crypto.subtle.digest("SHA-256", bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes));
  return new Uint8Array(buf);
}

export function bytesToHex(bytes) {
  const u8 = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let out = "";
  for (let i = 0; i < u8.length; i++) out += u8[i].toString(16).padStart(2, "0");
  return out;
}

export async function sha256HexBytes(bytes) {
  return bytesToHex(await sha256Bytes(bytes));
}

export async function handleFromRawPublicKey(raw) {
  if (!raw || raw.length !== 32) return "";
  const digest = await sha256Bytes(raw);
  let acc = 0n;
  let bits = 0n;
  let out = "";
  for (let i = 0; i < digest.length && out.length < HANDLE_LEN; i++) {
    acc = (acc << 8n) | BigInt(digest[i]);
    bits += 8n;
    while (bits >= 5n && out.length < HANDLE_LEN) {
      bits -= 5n;
      out += CROCKFORD[Number((acc >> bits) & 31n)];
    }
  }
  return out.length === HANDLE_LEN ? `#${out}` : "";
}

export function canonicalHandle(raw) {
  const s = String(raw || "").trim().toUpperCase();
  return HANDLE_RE.test(s) ? s : "";
}

export function handleBody(handle) {
  const h = canonicalHandle(handle);
  return h ? h.slice(1).toLowerCase() : "";
}

export async function publicKeyMatchesHandle(publicKeyB64, handle) {
  const raw = b64urlToBytes(publicKeyB64);
  if (!raw) return false;
  const got = await handleFromRawPublicKey(raw);
  return got !== "" && got === canonicalHandle(handle);
}

export function canonicalStatement(object) {
  return canonicalize(object);
}

export async function hashStatement(object) {
  return sha256Hex(canonicalStatement(object));
}

export function utf8(text) {
  return new TextEncoder().encode(text);
}

export function isHex64(value) {
  return /^[a-f0-9]{64}$/.test(String(value || ""));
}

export function zeroPrev(value) {
  return String(value || "").toLowerCase() === ZERO_HASH;
}

export { sha256Hex, ZERO_HASH };
