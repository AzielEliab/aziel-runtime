/**
 * AZRT-SEALED-FRAME-1.0. One frame for every carrier.
 *
 * Version 2 binds the header as AES-GCM additional data (the envelope-v2 rule).
 * Version 1 is decrypt-only: frames sealed before this rule have no additional data.
 * A version-2 frame is never opened as version 1.
 * The allowlist pin is sha256 of the raw peer public key, not the 11-character handle.
 * Cap-7 is not ICANN. Paid satellite stays HELD. This module sets no live flag.
 * Author: Aziel Eliab only.
 */
import { createHash } from "node:crypto";
import { b64urlToBytes, bytesToB64url, utf8 } from "../fed-mesh/codec.js";
import { FED_SPEC } from "../fed-mesh/spec.js";

export const SEALED_FRAME_SPEC = "AZRT-SEALED-FRAME-1.0";
export const FRAME_V2 = 2;
export const FRAME_V1 = 1;

const CARRIERS = new Set(["lan", "relay", "photon", "bluetooth", "rf", "wifi"]);

export function frameHeader(opts = {}) {
  const named = opts.carrier == null || opts.carrier === "" ? "lan" : String(opts.carrier);
  if (!CARRIERS.has(named)) {
    return { ok: false, code: "SEALED-FRAME-CARRIER", message: `Unknown carrier "${named}".` };
  }
  const carrier = named;
  return {
    v: FRAME_V2,
    spec: SEALED_FRAME_SPEC,
    carrier,
    from: String(opts.fromHandle || opts.from || ""),
    to: String(opts.toHandle || opts.to || ""),
    seq: Number(opts.seq),
    eph_public_key: String(opts.eph_public_key || ""),
    nonce: String(opts.nonce || ""),
    route_class: String(opts.route_class || opts.routeClass || ""),
  };
}

/** Fixed key order. qnm-node and the phone client must emit this same string. */
export function frameAad(header) {
  return JSON.stringify({
    v: header.v,
    spec: header.spec,
    carrier: header.carrier,
    from: header.from,
    to: header.to,
    seq: header.seq,
    eph_public_key: header.eph_public_key,
    nonce: header.nonce,
    route_class: header.route_class,
  });
}

/**
 * sha256 of the raw 32-byte public key.
 * A 64-hex string is already a pin. An 11-character handle is not a key and returns "".
 */
export function peerKeyPin(value) {
  const text = String(value || "").trim();
  if (/^[a-f0-9]{64}$/.test(text)) return text;
  const raw = b64urlToBytes(text);
  if (!raw || raw.length !== 32) return "";
  return createHash("sha256").update(raw).digest("hex");
}

async function importXPublic(b64) {
  const raw = b64urlToBytes(b64);
  if (!raw || raw.length !== 32) return null;
  return crypto.subtle.importKey("raw", raw, { name: "X25519" }, true, []);
}

async function sharedKey(privateKey, publicB64, from, to, seq) {
  const pub = await importXPublic(publicB64);
  if (!pub) return null;
  const bits = await crypto.subtle.deriveBits({ name: "X25519", public: pub }, privateKey, 256);
  const hkdf = await crypto.subtle.importKey("raw", bits, "HKDF", false, ["deriveBits"]);
  const aes = await crypto.subtle.deriveBits(
    {
      name: "HKDF",
      hash: "SHA-256",
      salt: utf8(FED_SPEC),
      info: utf8(`${FED_SPEC}|${from}|${to}|${seq}`),
    },
    hkdf,
    256,
  );
  return crypto.subtle.importKey("raw", aes, "AES-GCM", false, ["encrypt", "decrypt"]);
}

async function ephemeral(opts) {
  if (opts.ephPrivateKey && opts.eph_public_key) {
    return { privateKey: opts.ephPrivateKey, eph_public_key: String(opts.eph_public_key) };
  }
  const pair = await crypto.subtle.generateKey({ name: "X25519" }, true, ["deriveBits"]);
  const jwk = await crypto.subtle.exportKey("jwk", pair.privateKey);
  return { privateKey: pair.privateKey, eph_public_key: String(jwk.x || "") };
}

/**
 * Seal to the recipient X25519 key.
 * version 2 (default) binds the header as additional data.
 * version 1 omits additional data so an older opener still matches those bytes.
 */
export async function sealFrame(opts = {}) {
  const version = Number(opts.version) === FRAME_V1 ? FRAME_V1 : FRAME_V2;
  const from = String(opts.fromHandle || opts.from || "");
  const to = String(opts.toHandle || opts.to || "");
  const seq = opts.seq;
  const eph = await ephemeral(opts);
  const key = await sharedKey(eph.privateKey, opts.recipientEncPublicKey, from, to, seq);
  if (!key) return null;
  const nonce = opts.nonceBytes instanceof Uint8Array && opts.nonceBytes.length === 12
    ? opts.nonceBytes
    : crypto.getRandomValues(new Uint8Array(12));
  const nonceText = bytesToB64url(nonce);
  const header = frameHeader({
    carrier: opts.carrier,
    fromHandle: from,
    toHandle: to,
    seq,
    eph_public_key: eph.eph_public_key,
    nonce: nonceText,
    route_class: opts.route_class || opts.routeClass,
  });
  if (header.ok === false) return header;
  const aad = version === FRAME_V2 ? utf8(frameAad(header)) : undefined;
  const ct = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: nonce, ...(aad ? { additionalData: aad } : {}) },
    key,
    utf8(String(opts.plaintext ?? "")),
  );
  return {
    nonce: nonceText,
    eph_public_key: eph.eph_public_key,
    ciphertext: bytesToB64url(new Uint8Array(ct)),
    frame_v: version,
    carrier: header.carrier,
    spec: SEALED_FRAME_SPEC,
    ...(version === FRAME_V2 ? { aad: frameAad(header) } : {}),
  };
}

async function decrypt(opts, withAad) {
  const from = String(opts.fromHandle || opts.from || "");
  const to = String(opts.toHandle || opts.to || "");
  const key = await sharedKey(opts.encPrivateKey, opts.eph_public_key, from, to, opts.seq);
  if (!key) return null;
  const iv = b64urlToBytes(opts.nonce);
  const ct = b64urlToBytes(opts.ciphertext);
  if (!iv || iv.length !== 12 || !ct) return null;
  const header = frameHeader({
    carrier: opts.carrier,
    fromHandle: from,
    toHandle: to,
    seq: opts.seq,
    eph_public_key: opts.eph_public_key,
    nonce: opts.nonce,
    route_class: opts.route_class || opts.routeClass,
  });
  if (header.ok === false) return null;
  try {
    const plain = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv, ...(withAad ? { additionalData: utf8(frameAad(header)) } : {}) },
      key,
      ct,
    );
    return new TextDecoder().decode(plain);
  } catch {
    return null;
  }
}

/**
 * Open a frame. Version 2 is the default and binds the header as additional data.
 * Version 1 opens only when allowV1 is true. Any other version is refused.
 */
export async function openFrame(opts = {}) {
  const allowV1 = opts.allowV1 === true;
  const version = Number(opts.frame_v ?? opts.frameV ?? opts.version ?? FRAME_V2);
  if (!Number.isInteger(version) || (version !== FRAME_V1 && version !== FRAME_V2)) return null;
  if (version === FRAME_V1) {
    if (!allowV1) return null;
    return decrypt(opts, false);
  }
  return decrypt(opts, true);
}
