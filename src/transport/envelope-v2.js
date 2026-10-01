/**
 * EnvelopeV2. AES-GCM payload, session signature, opaque routing fields.
 * The outer object does not carry plaintext payloads or long-term secrets.
 * Author: Aziel Eliab only.
 */

import { AZP_SPEC } from "../security/claims.js";
import {
  b64urlToBytes,
  bytesToB64url,
  bytesToHex,
  canonicalHash,
  canonicalize,
  sha256Bytes,
  utf8,
  zeroize,
} from "../security/canonical.js";
import { assertSessionUsable } from "../security/session-identity.js";
import { loadKey } from "../security/keystore.js";
import { generateEncryptionKeypair, importX25519Public, signBytes, verifyBytes } from "../security/signatures.js";
import { rememberReplay } from "./replay-cache.js";
import { negotiateRouteClass, negotiateVersion } from "./routing.js";

export const ENVELOPE_VERSION = AZP_SPEC;

const FORBIDDEN_KEYS = new Set([
  "plaintext",
  "payload",
  "email",
  "token",
  "password",
  "passphrase",
  "private_key",
  "privatekey",
  "seed",
  "authorization",
  "user_id",
  "userid",
]);

export const ENVELOPE_METADATA = Object.freeze([
  Object.freeze({ field: "version", observer: "relay", reveals: "protocol version", necessary: true }),
  Object.freeze({ field: "network_id", observer: "relay", reveals: "network name", necessary: true }),
  Object.freeze({ field: "message_id", observer: "relay", reveals: "dedup id", necessary: true }),
  Object.freeze({ field: "sender_ephemeral_key", observer: "relay", reveals: "per-message X25519 public key", necessary: true }),
  Object.freeze({ field: "sender_signing_key", observer: "relay", reveals: "short-lived session signing key", necessary: true }),
  Object.freeze({ field: "recipient_hint", observer: "relay", reveals: "truncated hash of the recipient session encryption key", necessary: true }),
  Object.freeze({ field: "created_at", observer: "relay", reveals: "send time", necessary: true }),
  Object.freeze({ field: "expires_at", observer: "relay", reveals: "expiry", necessary: true }),
  Object.freeze({ field: "nonce", observer: "relay", reveals: "AES-GCM nonce", necessary: true }),
  Object.freeze({ field: "route_class", observer: "relay", reveals: "direct or relay", necessary: true }),
  Object.freeze({ field: "ciphertext", observer: "relay", reveals: "ciphertext length and bytes", necessary: true }),
  Object.freeze({ field: "auth_tag", observer: "relay", reveals: "GCM tag", necessary: true }),
  Object.freeze({ field: "sender_signature", observer: "relay", reveals: "session signature", necessary: true }),
]);

function fail(code, message) {
  return { ok: false, code, fail_closed: true, message };
}

function forbiddenKey(envelope) {
  if (!envelope || typeof envelope !== "object") return "envelope";
  for (const key of Object.keys(envelope)) {
    if (FORBIDDEN_KEYS.has(key.toLowerCase())) return key;
  }
  return "";
}

export async function recipientHint(encPublicKey) {
  const digest = await sha256Bytes(utf8(String(encPublicKey || "")));
  return bytesToHex(digest).slice(0, 32);
}

function unsigned(envelope) {
  const copy = { ...envelope };
  delete copy.sender_signature;
  return copy;
}

function headerAad(envelope) {
  return {
    version: envelope.version,
    network_id: envelope.network_id,
    message_id: envelope.message_id,
    sender_ephemeral_key: envelope.sender_ephemeral_key,
    sender_signing_key: envelope.sender_signing_key,
    recipient_hint: envelope.recipient_hint,
    created_at: envelope.created_at,
    expires_at: envelope.expires_at,
    nonce: envelope.nonce,
    route_class: envelope.route_class,
  };
}

async function messageKey(privateKey, remotePublic, info) {
  const pub = await importX25519Public(remotePublic);
  if (!pub) return null;
  const bits = new Uint8Array(await crypto.subtle.deriveBits({ name: "X25519", public: pub }, privateKey, 256));
  const hkdf = await crypto.subtle.importKey("raw", bits, "HKDF", false, ["deriveKey"]);
  zeroize(bits);
  return crypto.subtle.deriveKey(
    { name: "HKDF", hash: "SHA-256", salt: utf8(ENVELOPE_VERSION), info: utf8(info) },
    hkdf,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

export async function sealEnvelope(opts = {}) {
  const session = opts.session;
  const usable = assertSessionUsable(session, opts.now == null ? Date.now() : opts.now);
  if (!usable.ok) return usable;
  const version = negotiateVersion(opts.version || ENVELOPE_VERSION);
  if (!version.ok) return version;
  const route = negotiateRouteClass(opts.routeClass || opts.route_class || "relay");
  if (!route.ok) return route;
  const recipient = String(opts.recipientEncPublicKey || "");
  if (!recipient) return fail("AZP-REFUSE", "Recipient encryption key is missing.");
  const signing = loadKey(opts.keystore, `${session.session_id}:sign`);
  if (!signing.ok) return fail("AZP-EXPIRED", "Session signing key is gone. Fail closed.");
  const eph = await generateEncryptionKeypair();
  if (!eph.ok) return eph;
  const nowMs = opts.now == null ? Date.now() : Number(opts.now);
  const ttl = Number.isFinite(opts.ttlMs) ? Number(opts.ttlMs) : 60_000;
  if (ttl <= 0) {
    zeroize(eph.seed);
    return fail("AZP-EXPIRED", "Envelope TTL must be positive.");
  }
  const messageId = bytesToHex(crypto.getRandomValues(new Uint8Array(16)));
  const nonce = crypto.getRandomValues(new Uint8Array(12));
  const header = {
    version: ENVELOPE_VERSION,
    network_id: String(opts.networkId || "aziel-runtime"),
    message_id: messageId,
    sender_ephemeral_key: eph.public_key,
    sender_signing_key: session.ephemeral_public_key,
    recipient_hint: await recipientHint(recipient),
    created_at: new Date(nowMs).toISOString(),
    expires_at: new Date(nowMs + ttl).toISOString(),
    nonce: bytesToB64url(nonce),
    route_class: route.route_class,
  };
  const payload = typeof opts.payload === "string" ? opts.payload : canonicalize(opts.payload ?? "");
  const info = `${header.version}|${header.network_id}|${header.message_id}|${header.nonce}`;
  const key = await messageKey(eph.privateKey, recipient, info);
  zeroize(eph.seed);
  if (!key) return fail("AZP-REFUSE", "Recipient key was refused.");
  const packed = new Uint8Array(
    await crypto.subtle.encrypt(
      { name: "AES-GCM", iv: nonce, additionalData: utf8(canonicalize(headerAad(header))) },
      key,
      utf8(payload),
    ),
  );
  const envelope = {
    ...header,
    ciphertext: bytesToB64url(packed.slice(0, packed.length - 16)),
    auth_tag: bytesToB64url(packed.slice(packed.length - 16)),
  };
  envelope.sender_signature = await signBytes(signing.privateKey, utf8(canonicalize(unsigned(envelope))));
  if (forbiddenKey(envelope)) return fail("AZP-RELAY-PLAINTEXT", "Outer envelope names a secret field.");
  return { ok: true, envelope, payload_sha256: await canonicalHash(payload) };
}

export async function openEnvelope(opts = {}) {
  const envelope = opts.envelope;
  const badKey = forbiddenKey(envelope);
  if (badKey) return fail("AZP-RELAY-PLAINTEXT", "Outer envelope names a secret field.");
  const version = negotiateVersion(envelope && envelope.version);
  if (!version.ok) return version;
  const nowMs = opts.now == null ? Date.now() : Number(opts.now);
  const exp = Date.parse(envelope.expires_at);
  if (!Number.isFinite(exp) || nowMs >= exp) return fail("AZP-EXPIRED", "Envelope is expired.");
  const expect = opts.expectSigningKey || envelope.sender_signing_key;
  if (opts.expectSigningKey && opts.expectSigningKey !== envelope.sender_signing_key) {
    return fail("AZP-BAD-SIG", "Sender signing key was substituted.");
  }
  const signed = await verifyBytes(expect, utf8(canonicalize(unsigned(envelope))), envelope.sender_signature);
  if (!signed) return fail("AZP-BAD-SIG", "Envelope signature failed.");
  const session = opts.session;
  const usable = assertSessionUsable(session, nowMs);
  if (!usable.ok) return usable;
  const hint = await recipientHint(session.ephemeral_enc_public_key);
  if (hint !== envelope.recipient_hint) return fail("AZP-WRONG-RECIPIENT", "Recipient hint does not match this session.");
  if (opts.replayCache) {
    const replay = rememberReplay(
      opts.replayCache,
      {
        network_id: envelope.network_id,
        sender: envelope.sender_signing_key,
        message_id: envelope.message_id,
        expires_at: exp,
      },
      nowMs,
    );
    if (!replay.ok) return replay;
  }
  const enc = loadKey(opts.keystore, `${session.session_id}:enc`);
  if (!enc.ok) return fail("AZP-EXPIRED", "Session encryption key is gone. Fail closed.");
  const iv = b64urlToBytes(envelope.nonce);
  const ct = b64urlToBytes(envelope.ciphertext);
  const tag = b64urlToBytes(envelope.auth_tag);
  if (!iv || iv.length !== 12 || !ct || !tag || tag.length !== 16) return fail("AZP-TAMPER", "Envelope bytes are malformed.");
  const packed = new Uint8Array(ct.length + tag.length);
  packed.set(ct, 0);
  packed.set(tag, ct.length);
  const info = `${envelope.version}|${envelope.network_id}|${envelope.message_id}|${envelope.nonce}`;
  const key = await messageKey(enc.privateKey, envelope.sender_ephemeral_key, info);
  if (!key) return fail("AZP-TAMPER", "Sender ephemeral key was refused.");
  try {
    const plain = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv, additionalData: utf8(canonicalize(headerAad(envelope))) },
      key,
      packed,
    );
    return { ok: true, payload: new TextDecoder().decode(plain), message_id: envelope.message_id };
  } catch {
    return fail("AZP-TAMPER", "Envelope authentication failed.");
  }
}
