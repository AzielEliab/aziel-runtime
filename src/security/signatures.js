/**
 * Ed25519 and X25519 helpers for AZP-NS-1.0.
 * Seeds stay with the caller. This module does not write them.
 * Author: Aziel Eliab only.
 */

import { b64urlToBytes, bytesToB64url, utf8, zeroize } from "./canonical.js";

const ED_PKCS8_PREFIX = Uint8Array.from([
  0x30, 0x2e, 0x02, 0x01, 0x00, 0x30, 0x05, 0x06, 0x03, 0x2b, 0x65, 0x70, 0x04, 0x22, 0x04, 0x20,
]);
const X_PKCS8_PREFIX = Uint8Array.from([
  0x30, 0x2e, 0x02, 0x01, 0x00, 0x30, 0x05, 0x06, 0x03, 0x2b, 0x65, 0x6e, 0x04, 0x22, 0x04, 0x20,
]);

function pkcs8(prefix, seed) {
  const out = new Uint8Array(prefix.length + seed.length);
  out.set(prefix, 0);
  out.set(seed, prefix.length);
  return out;
}

async function publicB64(privateKey) {
  const jwk = await crypto.subtle.exportKey("jwk", privateKey);
  return String(jwk.x || "");
}

export async function importSigningSeed(seed) {
  const raw = seed instanceof Uint8Array ? seed : new Uint8Array(seed);
  if (raw.length !== 32) return { ok: false, code: "AZP-BAD-KEY", message: "Ed25519 seed must be 32 bytes." };
  const privateKey = await crypto.subtle.importKey("pkcs8", pkcs8(ED_PKCS8_PREFIX, raw), { name: "Ed25519" }, true, ["sign"]);
  const public_key = await publicB64(privateKey);
  return { ok: true, privateKey, public_key };
}

export async function importEncryptionSeed(seed) {
  const raw = seed instanceof Uint8Array ? seed : new Uint8Array(seed);
  if (raw.length !== 32) return { ok: false, code: "AZP-BAD-KEY", message: "X25519 seed must be 32 bytes." };
  const privateKey = await crypto.subtle.importKey("pkcs8", pkcs8(X_PKCS8_PREFIX, raw), { name: "X25519" }, true, ["deriveBits"]);
  const public_key = await publicB64(privateKey);
  return { ok: true, privateKey, public_key };
}

export async function generateSigningKeypair() {
  const seed = crypto.getRandomValues(new Uint8Array(32));
  const imported = await importSigningSeed(seed);
  if (!imported.ok) {
    zeroize(seed);
    return imported;
  }
  return { ...imported, seed };
}

export async function generateEncryptionKeypair() {
  const seed = crypto.getRandomValues(new Uint8Array(32));
  const imported = await importEncryptionSeed(seed);
  if (!imported.ok) {
    zeroize(seed);
    return imported;
  }
  return { ...imported, seed };
}

export async function signBytes(privateKey, bytes) {
  const sig = await crypto.subtle.sign("Ed25519", privateKey, bytes instanceof Uint8Array ? bytes : utf8(bytes));
  return bytesToB64url(new Uint8Array(sig));
}

export async function verifyBytes(publicKeyB64, bytes, sigB64) {
  const raw = b64urlToBytes(publicKeyB64);
  const sig = b64urlToBytes(sigB64);
  if (!raw || raw.length !== 32 || !sig || sig.length !== 64) return false;
  const key = await crypto.subtle.importKey("raw", raw, { name: "Ed25519" }, false, ["verify"]);
  return crypto.subtle.verify("Ed25519", key, sig, bytes instanceof Uint8Array ? bytes : utf8(bytes));
}

export async function importX25519Public(b64) {
  const raw = b64urlToBytes(b64);
  if (!raw || raw.length !== 32) return null;
  return crypto.subtle.importKey("raw", raw, { name: "X25519" }, false, []);
}
