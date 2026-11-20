/**
 * AZRT-SEALED-FRAME-1.0. One frame for every carrier in this runtime.
 *
 * This is not wire-identical to qnm-node FED-MESH-ENVELOPE-2 and not wire-identical
 * to AZP-NS-1.0 (src/transport/envelope-v2.js). Those three names do not share
 * version bytes, additional-data bytes, or KDF info. No test vector proves they do.
 * FED-MESH-1.0 remains the signed act version. FED-MESH-ENVELOPE-2 is an opaque
 * relay label (src/fed-mesh/relay.js) and is not this frame.
 *
 * Version 2 binds this frame's own header as AES-GCM additional data.
 * A missing version, version 1, and any other version are refused unless the
 * caller sets allowV1 or allow_v1 for version 1 only.
 * Low-order X25519 public keys and an all-zero shared secret are refused.
 * Cap-7 is not ICANN. Paid satellite stays HELD. This module sets no live flag.
 * Author: Aziel Eliab only.
 */
import { createHash } from "node:crypto";
import { b64urlToBytes, bytesToB64url, utf8 } from "../fed-mesh/codec.js";
import { FED_SPEC } from "../fed-mesh/spec.js";

export const SEALED_FRAME_SPEC = "AZRT-SEALED-FRAME-1.0";
export const FRAME_V2 = 2;
export const FRAME_V1 = 1;
export const WIRE_RELATION = Object.freeze({
  azrt_sealed_frame: SEALED_FRAME_SPEC,
  fed_mesh: "FED-MESH-1.0",
  fed_mesh_envelope: "FED-MESH-ENVELOPE-2",
  azp_ns: "AZP-NS-1.0",
  wire_identical: false,
  note: "AZRT-SEALED-FRAME-1.0, FED-MESH-ENVELOPE-2, and AZP-NS-1.0 are different wires. This object does not claim they share version, AAD, or KDF bytes.",
});

const LOW_ORDER_X25519 = new Set([
  "0000000000000000000000000000000000000000000000000000000000000000",
  "0100000000000000000000000000000000000000000000000000000000000000",
  "e0eb7a7c3b41b8ae1656e3faf19fc46ada098deb9c32b1fd866205165f49b800",
  "5f9c95bca3508c24b1d0b1559c83ef5b04445cc4581c8e86d8224eddd09f1157",
  "ecffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff7f",
  "edffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff7f",
  "eeffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff7f",
]);
const REPLAY_CAP = 256;
const seenNonces = new Map();

export function resetSealedReplay() {
  seenNonces.clear();
}

function replayKey(from, to, seq, nonce) {
  return `${from}|${to}|${seq}|${nonce}`;
}

function rememberNonce(from, to, seq, nonce) {
  const key = replayKey(from, to, seq, nonce);
  seenNonces.set(key, Date.now());
  if (seenNonces.size > REPLAY_CAP) seenNonces.delete(seenNonces.keys().next().value);
}

function hexOf(bytes) {
  let out = "";
  for (const b of bytes) out += b.toString(16).padStart(2, "0");
  return out;
}

function lowOrderPublic(raw) {
  if (!raw || raw.length !== 32) return true;
  const masked = new Uint8Array(raw);
  masked[31] &= 0x7f;
  return LOW_ORDER_X25519.has(hexOf(masked));
}

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
  if (!raw || raw.length !== 32 || lowOrderPublic(raw)) return null;
  return crypto.subtle.importKey("raw", raw, { name: "X25519" }, true, []);
}

async function sharedKey(privateKey, publicB64, from, to, seq) {
  const pub = await importXPublic(publicB64);
  if (!pub) return null;
  const bits = new Uint8Array(await crypto.subtle.deriveBits({ name: "X25519", public: pub }, privateKey, 256));
  if (bits.every((b) => b === 0)) return null;
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
 * Open a frame. A missing version is refused. It is not treated as version 1
 * and it is not treated as version 2. Version 1 opens only when allowV1 or
 * allow_v1 is true. Any other version, including 99, is refused.
 */
export async function openFrame(opts = {}) {
  const allowV1 = opts.allowV1 === true || opts.allow_v1 === true;
  const raw = opts.frame_v ?? opts.frameV ?? opts.version;
  if (raw == null || raw === "") return null;
  const version = Number(raw);
  if (!Number.isInteger(version) || (version !== FRAME_V1 && version !== FRAME_V2)) return null;
  if (version === FRAME_V1 && !allowV1) return null;
  const from = String(opts.fromHandle || opts.from || "");
  const to = String(opts.toHandle || opts.to || "");
  if (opts.replay !== false && seenNonces.has(replayKey(from, to, opts.seq, opts.nonce))) return null;
  const opened = await decrypt(opts, version === FRAME_V2);
  if (opened != null && opts.replay !== false) rememberNonce(from, to, opts.seq, opts.nonce);
  return opened;
}
