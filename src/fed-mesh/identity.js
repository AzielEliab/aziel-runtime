/**
 * Self-certifying Ed25519 identity. Handle is # + 11 Crockford chars of SHA-256(raw pubkey).
 * Private keys stay with the caller. This module does not store them.
 * Author: Aziel Eliab only.
 */

import { bytesToB64url, b64urlToBytes, canonicalHandle, canonicalStatement, handleFromRawPublicKey, publicKeyMatchesHandle, utf8 } from "./codec.js";
import { FED_AUTHOR, FED_SPEC } from "./spec.js";

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

async function publicB64FromPrivate(privateKey) {
  const jwk = await crypto.subtle.exportKey("jwk", privateKey);
  return String(jwk.x || "");
}

export async function importEd25519Seed(seed) {
  const raw = seed instanceof Uint8Array ? seed : new Uint8Array(seed);
  if (raw.length !== 32) throw new Error("Ed25519 seed must be 32 bytes");
  return crypto.subtle.importKey("pkcs8", pkcs8(ED_PKCS8_PREFIX, raw), { name: "Ed25519" }, true, ["sign"]);
}

export async function importX25519Seed(seed) {
  const raw = seed instanceof Uint8Array ? seed : new Uint8Array(seed);
  if (raw.length !== 32) throw new Error("X25519 seed must be 32 bytes");
  return crypto.subtle.importKey("pkcs8", pkcs8(X_PKCS8_PREFIX, raw), { name: "X25519" }, true, ["deriveBits"]);
}

export async function generateEd25519() {
  const pair = await crypto.subtle.generateKey({ name: "Ed25519" }, true, ["sign", "verify"]);
  const public_key = await publicB64FromPrivate(pair.privateKey);
  const raw = b64urlToBytes(public_key);
  const handle = await handleFromRawPublicKey(raw);
  return { privateKey: pair.privateKey, publicKey: pair.publicKey, public_key, handle };
}

export async function generateX25519() {
  const pair = await crypto.subtle.generateKey({ name: "X25519" }, true, ["deriveBits"]);
  const enc_public_key = await publicB64FromPrivate(pair.privateKey);
  return { privateKey: pair.privateKey, publicKey: pair.publicKey, enc_public_key };
}

/**
 * Local identity. privateKey and encPrivateKey are for the node process only.
 * Do not send them to a relay.
 */
export async function createIdentity(opts = {}) {
  let signing;
  let enc;
  if (opts.seed) {
    const seed = opts.seed instanceof Uint8Array ? opts.seed : Uint8Array.from(opts.seed);
    const privateKey = await importEd25519Seed(seed);
    const public_key = await publicB64FromPrivate(privateKey);
    const handle = await handleFromRawPublicKey(b64urlToBytes(public_key));
    signing = { privateKey, public_key, handle };
  } else {
    signing = await generateEd25519();
  }
  if (opts.encSeed) {
    const seed = opts.encSeed instanceof Uint8Array ? opts.encSeed : Uint8Array.from(opts.encSeed);
    const privateKey = await importX25519Seed(seed);
    enc = { privateKey, enc_public_key: await publicB64FromPrivate(privateKey) };
  } else {
    enc = await generateX25519();
  }
  return {
    spec: FED_SPEC,
    author: FED_AUTHOR,
    handle: signing.handle,
    public_key: signing.public_key,
    enc_public_key: enc.enc_public_key,
    privateKey: signing.privateKey,
    encPrivateKey: enc.privateKey,
  };
}

export async function importIdentity({ seed, encSeed }) {
  return createIdentity({ seed, encSeed });
}

export async function signObject(privateKey, object) {
  const bytes = utf8(canonicalStatement(object));
  const sig = await crypto.subtle.sign("Ed25519", privateKey, bytes);
  return bytesToB64url(sig);
}

export async function verifyObject(publicKeyB64, object, sigB64) {
  const raw = b64urlToBytes(publicKeyB64);
  const sig = b64urlToBytes(sigB64);
  if (!raw || raw.length !== 32 || !sig || sig.length !== 64) return false;
  const key = await crypto.subtle.importKey("raw", raw, { name: "Ed25519" }, true, ["verify"]);
  return crypto.subtle.verify("Ed25519", key, sig, utf8(canonicalStatement(object)));
}

export async function signedEnvelope(privateKey, statement) {
  const sig = await signObject(privateKey, statement);
  return { ...statement, sig };
}

export { canonicalHandle, publicKeyMatchesHandle, handleFromRawPublicKey };
