/**
 * AZMAIL-USER-1.0 §2-§5: pure crypto for private user-to-user mail on ARK accounts.
 * X25519 mail keys from the ARK:MAIL subkey, ECDH+HKDF+AES-256-GCM envelopes,
 * unlinkable sent/delivered/ack commitments, decoy keys for unclaimed names.
 * No I/O. Server sees ciphertext only. Author: Aziel Eliab. SPDX-License-Identifier: Apache-2.0
 */
import { hex, unhex, sha256, normalizeUsername, ArkInputError } from "../account/ark-kdf.js";

export const AZMAIL_USER_SPEC = "AZMAIL-USER-1.0";
export const ADDR_RE = /^azm1\.[0-9a-f]{64}$/;
export const BODY_MAX = 16384;
export const SUBJECT_MAX = 200;
const PKCS8_X25519 = new Uint8Array([0x30, 0x2e, 0x02, 0x01, 0x00, 0x30, 0x05, 0x06, 0x03, 0x2b, 0x65, 0x6e, 0x04, 0x22, 0x04, 0x20]);
const enc = new TextEncoder();
const dec = new TextDecoder();
const subtle = () => globalThis.crypto.subtle;
const b64 = (u8) => btoa(String.fromCharCode(...u8));
const unb64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
const b64url = (s) => Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - (s.length % 4)) % 4)), (c) => c.charCodeAt(0));

export async function x25519FromSeed(seed) {
  if (!(seed instanceof Uint8Array) || seed.length !== 32) throw new ArkInputError();
  const pk8 = new Uint8Array(PKCS8_X25519.length + 32);
  pk8.set(PKCS8_X25519); pk8.set(seed, PKCS8_X25519.length);
  const tmp = await subtle().importKey("pkcs8", pk8, { name: "X25519" }, true, ["deriveBits"]);
  const jwk = await subtle().exportKey("jwk", tmp);
  const priv = await subtle().importKey("pkcs8", pk8, { name: "X25519" }, false, ["deriveBits"]);
  pk8.fill(0);
  return { priv, pub: hex(b64url(jwk.x)) };
}

export const addressOf = (mailPubHex) => "azm1." + mailPubHex;
export function pubOfAddress(addr) {
  if (typeof addr !== "string" || !ADDR_RE.test(addr)) throw new ArkInputError();
  return addr.slice(5);
}
export const inboxIdOf = async (mailPubHex) => hex(await sha256("AZMAIL-USER:v1:inbox|" + mailPubHex));
export const outboxIdOf = async (vaultId) => hex(await sha256("AZMAIL-USER:v1:outbox|" + vaultId));
export const nameKeyOf = async (username) => hex(await sha256("AZMAIL-USER:v1:name|" + normalizeUsername(username)));
/** sent / delivered / ack commitments: distinct per role so rows are not publicly linkable. */
export async function commitments(rHex) {
  if (!/^[0-9a-f]{64}$/.test(rHex)) throw new ArkInputError();
  return {
    out: hex(await sha256("AZMAIL-USER:v1:out|" + rHex)),
    in: hex(await sha256("AZMAIL-USER:v1:in|" + rHex)),
    ack: hex(await sha256("AZMAIL-USER:v1:ack|" + rHex)),
  };
}

/** Decoy key for an unclaimed name: indistinguishable without the server-held decoy secret. */
export async function decoyPubFor(secret, username) {
  if (typeof secret !== "string" || secret.length < 32) throw new ArkInputError();
  const u = normalizeUsername(username);
  const k = await subtle().importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const seed = new Uint8Array(await subtle().sign("HMAC", k, enc.encode("AZMAIL-USER:v1:decoy|" + u)));
  const { pub } = await x25519FromSeed(seed);
  seed.fill(0);
  return pub;
}

async function msgKey(privKey, peerPubHex, ephPub, rcptPub) {
  const peer = await subtle().importKey("raw", unhex(peerPubHex), { name: "X25519" }, false, []);
  const shared = new Uint8Array(await subtle().deriveBits({ name: "X25519", public: peer }, privKey, 256));
  if (shared.every((b) => b === 0)) throw new ArkInputError(); // low-order point
  const salt = new Uint8Array(64); salt.set(ephPub); salt.set(rcptPub, 32);
  const base = await subtle().importKey("raw", shared, "HKDF", false, ["deriveKey"]);
  shared.fill(0);
  return subtle().deriveKey({ name: "HKDF", hash: "SHA-256", salt, info: enc.encode("AZMAIL-USER:v1:msg") }, base, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
}
const envAad = (inboxId) => enc.encode("AZMAIL-USER:v1|" + inboxId);

/** Encrypt {inner, inner_sig} to the recipient's mail_pub. Output: base64(eph_pub‖iv‖ct). */
export async function sealEnvelope(rcptPubHex, inboxId, obj) {
  const eph = await subtle().generateKey({ name: "X25519" }, true, ["deriveBits"]);
  const ephPub = new Uint8Array(await subtle().exportKey("raw", eph.publicKey));
  const key = await msgKey(eph.privateKey, rcptPubHex, ephPub, unhex(rcptPubHex));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = new Uint8Array(await subtle().encrypt({ name: "AES-GCM", iv, additionalData: envAad(inboxId) }, key, enc.encode(JSON.stringify(obj))));
  const out = new Uint8Array(44 + ct.length); out.set(ephPub); out.set(iv, 32); out.set(ct, 44);
  return b64(out);
}
export async function openEnvelope(mailKey, mailPubHex, inboxId, ctB64) {
  const all = unb64(ctB64);
  if (all.length < 44 + 16) throw new ArkInputError();
  const ephPub = all.slice(0, 32);
  const key = await msgKey(mailKey, hex(ephPub), ephPub, unhex(mailPubHex));
  const pt = await subtle().decrypt({ name: "AES-GCM", iv: all.slice(32, 44), additionalData: envAad(inboxId) }, key, all.slice(44));
  return JSON.parse(dec.decode(pt));
}
