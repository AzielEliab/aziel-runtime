/**
 * Short-lived session identity. Distinct from the long-term node key.
 * The node key signs the binding. The session key signs traffic.
 * Author: Aziel Eliab only.
 */

import { AZP_SPEC } from "./claims.js";
import { canonicalHash, canonicalize, utf8 } from "./canonical.js";
import { destroySessionKey, exportPublicIdentity, loadKey, storeKey } from "./keystore.js";
import { generateEncryptionKeypair, generateSigningKeypair, signBytes, verifyBytes } from "./signatures.js";
import { zeroize } from "./canonical.js";

export const SESSION_PROTOCOL = AZP_SPEC;
export const DEFAULT_SESSION_TTL_MS = 15 * 60 * 1000;

function fail(code, message) {
  return { ok: false, code, fail_closed: true, message };
}

function bindingBody(session) {
  return {
    session_id: session.session_id,
    ephemeral_public_key: session.ephemeral_public_key,
    ephemeral_enc_public_key: session.ephemeral_enc_public_key,
    created_at: session.created_at,
    expires_at: session.expires_at,
    protocol_version: session.protocol_version,
    capabilities_digest: session.capabilities_digest,
    node_public_key: session.node_public_key,
  };
}

export function sessionExpired(session, now = Date.now()) {
  if (!session || !session.expires_at) return true;
  const exp = Date.parse(session.expires_at);
  if (!Number.isFinite(exp)) return true;
  return Number(now) >= exp;
}

export async function createSessionIdentity(opts = {}) {
  const opened = opts.keystore || opts.unlocked;
  const pub = exportPublicIdentity(opened);
  if (!pub.ok) return pub;
  const node = loadKey(opened, "node-sign");
  if (!node.ok) return node;
  const ttl = Number.isFinite(opts.ttlMs) ? Number(opts.ttlMs) : DEFAULT_SESSION_TTL_MS;
  if (ttl <= 0) return fail("AZP-EXPIRED", "Session TTL must be positive. Fail closed.");
  const nowMs = opts.now == null ? Date.now() : Number(opts.now);
  const created = new Date(nowMs);
  const expires = new Date(nowMs + ttl);
  const signing = await generateSigningKeypair();
  const enc = await generateEncryptionKeypair();
  if (!signing.ok || !enc.ok) {
    if (signing.seed) zeroize(signing.seed);
    if (enc.seed) zeroize(enc.seed);
    return fail("AZP-BAD-KEY", "Session keys could not be generated.");
  }
  const capabilities = opts.capabilities && typeof opts.capabilities === "object" ? opts.capabilities : {};
  const sessionId = `azs_${[...crypto.getRandomValues(new Uint8Array(16))].map((b) => b.toString(16).padStart(2, "0")).join("")}`;
  const session = {
    session_id: sessionId,
    ephemeral_public_key: signing.public_key,
    ephemeral_enc_public_key: enc.public_key,
    created_at: created.toISOString(),
    expires_at: expires.toISOString(),
    protocol_version: SESSION_PROTOCOL,
    capabilities_digest: await canonicalHash(capabilities),
    node_public_key: pub.node_public_key,
  };
  session.signature = await signBytes(node.privateKey, utf8(canonicalize(bindingBody(session))));
  const storedSign = storeKey(opened, {
    id: `${sessionId}:sign`,
    purpose: "session",
    algorithm: "Ed25519",
    public_key: signing.public_key,
    created_at: session.created_at,
    seed: signing.seed,
    privateKey: signing.privateKey,
  });
  const storedEnc = storeKey(opened, {
    id: `${sessionId}:enc`,
    purpose: "session",
    algorithm: "X25519",
    public_key: enc.public_key,
    created_at: session.created_at,
    seed: enc.seed,
    privateKey: enc.privateKey,
  });
  zeroize(signing.seed);
  zeroize(enc.seed);
  if (!storedSign.ok || !storedEnc.ok) return storedSign.ok ? storedEnc : storedSign;
  return { ok: true, session, node_public_key: pub.node_public_key };
}

export async function verifySessionBinding(session, nodePublicKey) {
  if (!session || session.protocol_version !== SESSION_PROTOCOL) {
    return fail("AZP-DOWNGRADE", "Session protocol version is refused.");
  }
  if (session.node_public_key !== nodePublicKey) {
    return fail("AZP-BAD-SIG", "Session binding names a different node key.");
  }
  const ok = await verifyBytes(nodePublicKey, utf8(canonicalize(bindingBody(session))), session.signature);
  if (!ok) return fail("AZP-BAD-SIG", "Session binding signature failed.");
  return { ok: true, session_id: session.session_id };
}

export function assertSessionUsable(session, now = Date.now()) {
  if (!session) return fail("AZP-EXPIRED", "Session is missing. Fail closed.");
  if (sessionExpired(session, now)) return fail("AZP-EXPIRED", "Session is expired and cannot be reused.");
  if (session.ephemeral_public_key && session.node_public_key && session.ephemeral_public_key === session.node_public_key) {
    return fail("AZP-BAD-KEY", "Session key matches the node key. Fail closed.");
  }
  return { ok: true };
}

export async function signSessionTraffic(opened, session, bytes, now = Date.now()) {
  const usable = assertSessionUsable(session, now);
  if (!usable.ok) return usable;
  const key = loadKey(opened, `${session.session_id}:sign`);
  if (!key.ok) return fail("AZP-EXPIRED", "Session signing key is gone. Fail closed.");
  return { ok: true, signature: await signBytes(key.privateKey, bytes) };
}

export function endSession(opened, sessionId) {
  return destroySessionKey(opened, sessionId);
}
