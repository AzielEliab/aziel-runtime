/**
 * ARK-ACCOUNT-1.0 key schedule (USER-SIGNIN-ARK-1.0 §3). ARK account mode:
 * one (username, password) → one vault. No record, no verifier, no salt store.
 * A wrong password is a different, empty vault (ARK deniability). Pure: no I/O.
 * Author: Aziel Eliab. SPDX-License-Identifier: Apache-2.0
 */
export const ARK_ACCOUNT_SPEC = "ARK-ACCOUNT-1.0";
export const ARK_KDF_ITERS = 100000; // Cloudflare Workers WebCrypto PBKDF2 maximum
export const USERNAME_RE = /^[a-z0-9._-]{3,32}$/;
export const PW_MIN = 8;
export const PW_MAX = 1024;
const PKCS8_ED25519 = new Uint8Array([0x30, 0x2e, 0x02, 0x01, 0x00, 0x30, 0x05, 0x06, 0x03, 0x2b, 0x65, 0x70, 0x04, 0x22, 0x04, 0x20]);
const enc = new TextEncoder();
const subtle = () => globalThis.crypto.subtle;

export class ArkInputError extends Error {
  constructor() { super("ARK-INPUT"); this.code = "ARK-INPUT"; }
}

export function hex(bytes) {
  return Array.from(new Uint8Array(bytes), (b) => b.toString(16).padStart(2, "0")).join("");
}
export function unhex(s) {
  if (typeof s !== "string" || !/^([0-9a-f]{2})+$/.test(s)) throw new ArkInputError();
  return new Uint8Array(s.match(/../g).map((h) => parseInt(h, 16)));
}
export async function sha256(bytes) {
  return new Uint8Array(await subtle().digest("SHA-256", typeof bytes === "string" ? enc.encode(bytes) : bytes));
}

/** NFKD → strip combining marks → NFKC → lowercase. Throws ARK-INPUT (uniform) if not allowed. */
export function normalizeUsername(raw) {
  if (typeof raw !== "string") throw new ArkInputError();
  const u = raw.normalize("NFKD").replace(/\p{M}+/gu, "").normalize("NFKC").toLowerCase();
  if (!USERNAME_RE.test(u)) throw new ArkInputError();
  return u;
}
export function normalizePassword(raw) {
  if (typeof raw !== "string") throw new ArkInputError();
  const pw = enc.encode(raw.normalize("NFKC"));
  if (pw.length < PW_MIN || pw.length > PW_MAX) throw new ArkInputError();
  return pw;
}

export async function hkdf(master, salt, info, len = 32) {
  const k = await subtle().importKey("raw", master, "HKDF", false, ["deriveBits"]);
  return new Uint8Array(await subtle().deriveBits({ name: "HKDF", hash: "SHA-256", salt, info: enc.encode(info) }, k, len * 8));
}

export async function ed25519FromSeed(seed) {
  const pk8 = new Uint8Array(PKCS8_ED25519.length + 32);
  pk8.set(PKCS8_ED25519); pk8.set(seed, PKCS8_ED25519.length);
  const priv = await subtle().importKey("pkcs8", pk8, { name: "Ed25519" }, true, ["sign"]);
  const jwk = await subtle().exportKey("jwk", priv);
  const pub = Uint8Array.from(atob(jwk.x.replace(/-/g, "+").replace(/_/g, "/") + "="), (c) => c.charCodeAt(0));
  pk8.fill(0);
  return { priv, pub };
}

export async function vaultIdOf(pubHex) {
  if (typeof pubHex !== "string" || !/^[0-9a-f]{64}$/.test(pubHex)) throw new ArkInputError();
  return hex(await sha256("ARK-ACCOUNT:v1:vault|" + pubHex));
}

/** Derive the full key set. Secret material stays in CryptoKey objects / zeroed buffers. */
export async function deriveArkAccount(username, password, { iterations = ARK_KDF_ITERS } = {}) {
  const u = normalizeUsername(username);
  const pw = normalizePassword(password);
  const salt = await sha256("ARK-ACCOUNT:v1:salt|" + u);
  const base = await subtle().importKey("raw", pw, "PBKDF2", false, ["deriveBits"]);
  pw.fill(0);
  const master = new Uint8Array(await subtle().deriveBits({ name: "PBKDF2", hash: "SHA-256", salt, iterations }, base, 256));
  const seed = await hkdf(master, salt, "ARK:SIGN");
  const encRaw = await hkdf(master, salt, "ARK:ENC");
  // AZMAIL-USER-1.0 §2: additive X25519 mail subkey; existing pub/vault_id/vectors unchanged.
  const mailSeed = await hkdf(master, salt, "ARK:MAIL");
  master.fill(0);
  const { priv, pub } = await ed25519FromSeed(seed);
  seed.fill(0);
  const encKey = await subtle().importKey("raw", encRaw, { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);
  encRaw.fill(0);
  const pubHex = hex(pub);
  const { x25519FromSeed } = await import("../mail/user-crypto.js");
  const mail = await x25519FromSeed(mailSeed);
  mailSeed.fill(0);
  return {
    spec: ARK_ACCOUNT_SPEC,
    pub: pubHex,
    vault_id: await vaultIdOf(pubHex),
    rl_subject: hex(await sha256("ARK-ACCOUNT:v1:rl|" + u)),
    signKey: priv,
    encKey,
    mailKey: mail.priv,
    mail_pub: mail.pub,
  };
}

export async function signBytes(signKey, bytes) {
  return hex(await subtle().sign({ name: "Ed25519" }, signKey, bytes));
}
export async function verifySig(pubHex, sigHex, bytes) {
  try {
    const k = await subtle().importKey("raw", unhex(pubHex), { name: "Ed25519" }, false, ["verify"]);
    return await subtle().verify({ name: "Ed25519" }, k, unhex(sigHex), bytes);
  } catch { return false; }
}
export function aad(vaultId, seq) { return enc.encode(`ARK:V1|${vaultId}|${seq}`); }
export async function sealData(encKey, vaultId, seq, plaintext) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = new Uint8Array(await subtle().encrypt({ name: "AES-GCM", iv, additionalData: aad(vaultId, seq) }, encKey, enc.encode(plaintext)));
  const out = new Uint8Array(12 + ct.length); out.set(iv); out.set(ct, 12);
  return btoa(String.fromCharCode(...out));
}
export async function openData(encKey, vaultId, seq, b64) {
  const all = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  const pt = await subtle().decrypt({ name: "AES-GCM", iv: all.slice(0, 12), additionalData: aad(vaultId, seq) }, encKey, all.slice(12));
  return new TextDecoder().decode(pt);
}
