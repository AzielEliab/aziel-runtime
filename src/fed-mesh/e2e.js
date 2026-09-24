/**
 * End-to-end message bodies. X25519 + HKDF-SHA-256 + AES-GCM.
 * The relay never calls openMessage. Author: Aziel Eliab only.
 */

import { bytesToB64url, b64urlToBytes, utf8 } from "./codec.js";
import { FED_SPEC } from "./spec.js";

async function importXPublic(b64) {
  const raw = b64urlToBytes(b64);
  if (!raw || raw.length !== 32) return null;
  return crypto.subtle.importKey("raw", raw, { name: "X25519" }, true, []);
}

async function sharedKey(privateKey, publicB64, fromHandle, toHandle, seq) {
  const pub = await importXPublic(publicB64);
  if (!pub) return null;
  const bits = await crypto.subtle.deriveBits({ name: "X25519", public: pub }, privateKey, 256);
  const hkdf = await crypto.subtle.importKey("raw", bits, "HKDF", false, ["deriveBits"]);
  const aes = await crypto.subtle.deriveBits(
    {
      name: "HKDF",
      hash: "SHA-256",
      salt: utf8(FED_SPEC),
      info: utf8(`${FED_SPEC}|${fromHandle}|${toHandle}|${seq}`),
    },
    hkdf,
    256,
  );
  return crypto.subtle.importKey("raw", aes, "AES-GCM", false, ["encrypt", "decrypt"]);
}

export async function generateEphemeral() {
  const pair = await crypto.subtle.generateKey({ name: "X25519" }, true, ["deriveBits"]);
  const jwk = await crypto.subtle.exportKey("jwk", pair.privateKey);
  return { privateKey: pair.privateKey, eph_public_key: String(jwk.x || "") };
}

/**
 * Seal plaintext to the recipient's advertised X25519 key.
 * Returns nonce, eph_public_key, ciphertext. No plaintext.
 */
export async function sealPlaintext({ fromHandle, toHandle, seq, recipientEncPublicKey, plaintext }) {
  const eph = await generateEphemeral();
  const key = await sharedKey(eph.privateKey, recipientEncPublicKey, fromHandle, toHandle, seq);
  if (!key) return null;
  const nonce = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt({ name: "AES-GCM", iv: nonce }, key, utf8(String(plaintext ?? "")));
  return {
    nonce: bytesToB64url(nonce),
    eph_public_key: eph.eph_public_key,
    ciphertext: bytesToB64url(new Uint8Array(ct)),
  };
}

export async function openCiphertext({ encPrivateKey, fromHandle, toHandle, seq, nonce, eph_public_key, ciphertext }) {
  const key = await sharedKey(encPrivateKey, eph_public_key, fromHandle, toHandle, seq);
  if (!key) return null;
  const iv = b64urlToBytes(nonce);
  const ct = b64urlToBytes(ciphertext);
  if (!iv || iv.length !== 12 || !ct) return null;
  try {
    const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ct);
    return new TextDecoder().decode(plain);
  } catch {
    return null;
  }
}
