/**
 * AZKS-1 encrypted keystore.
 * Long-term seeds are wrapped with PBKDF2-SHA-256 and AES-GCM.
 * The file holds ciphertext and public identity only.
 * Zeroization of Uint8Array copies is best-effort. JavaScript strings
 * and WebCrypto key objects cannot be fully wiped.
 * Author: Aziel Eliab only.
 */

import { handleFromRawPublicKey } from "../fed-mesh/codec.js";
import { AZP_SPEC } from "./claims.js";
import { b64urlToBytes, bytesToB64url, utf8, zeroize } from "./canonical.js";
import {
  generateEncryptionKeypair,
  generateSigningKeypair,
  importEncryptionSeed,
  importSigningSeed,
} from "./signatures.js";

export const KEYSTORE_VERSION = "AZKS-1";
export const KEYSTORE_KDF = "PBKDF2-SHA-256";
export const KEYSTORE_ITERATIONS = 210_000;
export const KEYSTORE_MIN_PASSPHRASE = 8;

const SECRET_NAMES = ["seed", "seed_b64", "private_key", "privateKey", "enc_seed", "enc_seed_b64", "passphrase", "pkcs8"];

function fail(code, message) {
  return { ok: false, code, fail_closed: true, message };
}

function copySeed(seed) {
  if (!seed) return null;
  const raw = seed instanceof Uint8Array ? seed : Uint8Array.from(seed);
  if (raw.length !== 32) return null;
  return new Uint8Array(raw);
}

async function deriveAes(passphrase, salt, iterations) {
  const material = await crypto.subtle.importKey("raw", utf8(passphrase), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations, hash: "SHA-256" },
    material,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

function publicView(record) {
  return {
    id: record.id,
    purpose: record.purpose,
    algorithm: record.algorithm,
    public_key: record.public_key,
    status: record.status,
    created_at: record.created_at,
    rotated_from: record.rotated_from || null,
  };
}

function activeRecord(records, purpose) {
  return records.find((row) => row.purpose === purpose && row.status === "active") || null;
}

async function handleFor(publicKeyB64) {
  const raw = b64urlToBytes(publicKeyB64);
  if (!raw || raw.length !== 32) return "";
  return handleFromRawPublicKey(raw);
}

function bundleRecords(records) {
  return {
    records: records
      .filter((row) => row.purpose !== "session" && row.seed instanceof Uint8Array)
      .map((row) => ({
        id: row.id,
        purpose: row.purpose,
        algorithm: row.algorithm,
        public_key: row.public_key,
        status: row.status,
        created_at: row.created_at,
        rotated_from: row.rotated_from || null,
        seed_b64: bytesToB64url(row.seed),
      })),
  };
}

async function sealDocument(state) {
  const plaintext = utf8(JSON.stringify(bundleRecords(state.records)));
  const nonce = crypto.getRandomValues(new Uint8Array(12));
  const aad = utf8(`${KEYSTORE_VERSION}|${KEYSTORE_KDF}|${state.iterations}|${bytesToB64url(state.salt)}`);
  const packed = new Uint8Array(
    await crypto.subtle.encrypt({ name: "AES-GCM", iv: nonce, additionalData: aad }, state.aes, plaintext),
  );
  zeroize(plaintext);
  const tag = packed.slice(packed.length - 16);
  const ciphertext = packed.slice(0, packed.length - 16);
  const signing = activeRecord(state.records, "node-sign");
  const enc = activeRecord(state.records, "node-enc");
  const document = {
    v: KEYSTORE_VERSION,
    kdf: KEYSTORE_KDF,
    iterations: state.iterations,
    salt: bytesToB64url(state.salt),
    nonce: bytesToB64url(nonce),
    ciphertext: bytesToB64url(ciphertext),
    auth_tag: bytesToB64url(tag),
    protocol_version: AZP_SPEC,
    created_at: state.created_at,
    rotated_at: state.rotated_at,
    public_identity: {
      key_id: signing ? signing.id : "",
      node_public_key: signing ? signing.public_key : "",
      enc_public_key: enc ? enc.public_key : "",
      handle: signing ? signing.handle : "",
      protocol_version: AZP_SPEC,
    },
    key_index: state.records.filter((row) => row.purpose !== "session").map(publicView),
  };
  state.document = document;
  return document;
}

async function openBundle(document, passphrase) {
  if (!document || typeof document !== "object") return fail("AZKS-CORRUPT", "Keystore document is missing.");
  if (document.v !== KEYSTORE_VERSION) return fail("AZKS-VERSION", "Keystore version is not AZKS-1. Fail closed.");
  if (document.kdf !== KEYSTORE_KDF) return fail("AZKS-CORRUPT", "Keystore KDF is not recognized. Fail closed.");
  const iterations = Number(document.iterations);
  if (!Number.isInteger(iterations) || iterations < 100_000) {
    return fail("AZKS-CORRUPT", "Keystore iteration count is not acceptable. Fail closed.");
  }
  const salt = b64urlToBytes(document.salt);
  const nonce = b64urlToBytes(document.nonce);
  const ciphertext = b64urlToBytes(document.ciphertext);
  const tag = b64urlToBytes(document.auth_tag);
  if (!salt || salt.length !== 16 || !nonce || nonce.length !== 12 || !ciphertext || !tag || tag.length !== 16) {
    return fail("AZKS-CORRUPT", "Keystore fields are truncated or malformed. Fail closed.");
  }
  const packed = new Uint8Array(ciphertext.length + tag.length);
  packed.set(ciphertext, 0);
  packed.set(tag, ciphertext.length);
  let aes;
  try {
    aes = await deriveAes(passphrase, salt, iterations);
  } catch {
    return fail("AZKS-UNLOCK", "Keystore passphrase was refused. Fail closed.");
  }
  const aad = utf8(`${KEYSTORE_VERSION}|${KEYSTORE_KDF}|${iterations}|${bytesToB64url(salt)}`);
  let plain;
  try {
    plain = new Uint8Array(
      await crypto.subtle.decrypt({ name: "AES-GCM", iv: nonce, additionalData: aad }, aes, packed),
    );
  } catch {
    return fail("AZKS-UNLOCK", "Keystore did not authenticate. Wrong passphrase or tampered ciphertext. Fail closed.");
  }
  let bundle;
  try {
    bundle = JSON.parse(new TextDecoder().decode(plain));
  } catch {
    zeroize(plain);
    return fail("AZKS-CORRUPT", "Keystore plaintext is not a record bundle. Fail closed.");
  }
  zeroize(plain);
  if (!bundle || !Array.isArray(bundle.records)) return fail("AZKS-CORRUPT", "Keystore bundle has no records. Fail closed.");
  const records = [];
  for (const row of bundle.records) {
    const seed = b64urlToBytes(row && row.seed_b64);
    if (!row || !seed || seed.length !== 32 || !row.id || !row.purpose) {
      zeroize(seed);
      return fail("AZKS-CORRUPT", "Keystore record is incomplete. Fail closed.");
    }
    const imported =
      row.algorithm === "X25519" ? await importEncryptionSeed(seed) : await importSigningSeed(seed);
    if (!imported.ok || imported.public_key !== row.public_key) {
      zeroize(seed);
      return fail("AZKS-CORRUPT", "Keystore record does not match its public key. Fail closed.");
    }
    records.push({
      id: String(row.id),
      purpose: String(row.purpose),
      algorithm: row.algorithm === "X25519" ? "X25519" : "Ed25519",
      public_key: row.public_key,
      status: row.status === "retired" ? "retired" : "active",
      created_at: String(row.created_at || ""),
      rotated_from: row.rotated_from || null,
      handle: row.algorithm === "X25519" ? "" : await handleFor(row.public_key),
      seed,
      privateKey: imported.privateKey,
    });
  }
  return {
    ok: true,
    aes,
    salt,
    iterations,
    records,
    created_at: String(document.created_at || ""),
    rotated_at: String(document.rotated_at || document.created_at || ""),
    sessions: new Map(),
  };
}

function unlockedView(state) {
  return {
    ok: true,
    v: KEYSTORE_VERSION,
    protocol_version: AZP_SPEC,
    document: state.document,
    created_at: state.created_at,
    rotated_at: state.rotated_at,
    _state: state,
  };
}

export function exportPublicIdentity(opened) {
  const document = opened && opened.document ? opened.document : opened;
  const pub = document && document.public_identity;
  if (!pub || !pub.node_public_key) return fail("AZKS-CORRUPT", "Public identity is missing. Fail closed.");
  return {
    ok: true,
    v: KEYSTORE_VERSION,
    keystore_version: KEYSTORE_VERSION,
    protocol_version: AZP_SPEC,
    key_id: pub.key_id,
    node_public_key: pub.node_public_key,
    enc_public_key: pub.enc_public_key,
    handle: pub.handle,
    created_at: document.created_at,
  };
}

export async function identityFromUnlocked(opened) {
  if (!opened || !opened.ok || !opened._state) return fail("AZKS-UNLOCK", "Keystore is locked. Fail closed.");
  const signing = activeRecord(opened._state.records, "node-sign");
  const enc = activeRecord(opened._state.records, "node-enc");
  if (!signing || !enc) return fail("AZKS-CORRUPT", "Node identity records are missing. Fail closed.");
  return {
    ok: true,
    spec: AZP_SPEC,
    handle: signing.handle,
    public_key: signing.public_key,
    enc_public_key: enc.public_key,
    privateKey: signing.privateKey,
    encPrivateKey: enc.privateKey,
    keystore: opened,
  };
}

export async function createKeystore(opts = {}) {
  const passphrase = String(opts.passphrase || "");
  if (passphrase.length < KEYSTORE_MIN_PASSPHRASE) {
    return fail("AZKS-REFUSE", "Passphrase is too short. Fail closed.");
  }
  const now = opts.now ? new Date(opts.now) : new Date();
  const created_at = now.toISOString();
  let signingSeed = copySeed(opts.signingSeed);
  let encryptionSeed = copySeed(opts.encryptionSeed);
  if (opts.signingSeed && !signingSeed) return fail("AZKS-REFUSE", "Signing seed must be 32 bytes.");
  if (opts.encryptionSeed && !encryptionSeed) return fail("AZKS-REFUSE", "Encryption seed must be 32 bytes.");
  if (!signingSeed) {
    const generated = await generateSigningKeypair();
    if (!generated.ok) return generated;
    signingSeed = generated.seed;
  }
  if (!encryptionSeed) {
    const generated = await generateEncryptionKeypair();
    if (!generated.ok) {
      zeroize(signingSeed);
      return generated;
    }
    encryptionSeed = generated.seed;
  }
  const signing = await importSigningSeed(signingSeed);
  const enc = await importEncryptionSeed(encryptionSeed);
  if (!signing.ok || !enc.ok) {
    zeroize(signingSeed);
    zeroize(encryptionSeed);
    return fail("AZKS-REFUSE", "Node keys could not be imported.");
  }
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iterations = Number.isInteger(opts.iterations) ? opts.iterations : KEYSTORE_ITERATIONS;
  if (iterations < 100_000) {
    zeroize(signingSeed);
    zeroize(encryptionSeed);
    return fail("AZKS-REFUSE", "Iteration count is below the minimum. Fail closed.");
  }
  const state = {
    aes: await deriveAes(passphrase, salt, iterations),
    salt,
    iterations,
    created_at,
    rotated_at: created_at,
    sessions: new Map(),
    records: [
      {
        id: "node-sign",
        purpose: "node-sign",
        algorithm: "Ed25519",
        public_key: signing.public_key,
        status: "active",
        created_at,
        rotated_from: null,
        handle: await handleFor(signing.public_key),
        seed: signingSeed,
        privateKey: signing.privateKey,
      },
      {
        id: "node-enc",
        purpose: "node-enc",
        algorithm: "X25519",
        public_key: enc.public_key,
        status: "active",
        created_at,
        rotated_from: null,
        handle: "",
        seed: encryptionSeed,
        privateKey: enc.privateKey,
      },
    ],
  };
  await sealDocument(state);
  if (opts.signingSeed instanceof Uint8Array) zeroize(opts.signingSeed);
  if (opts.encryptionSeed instanceof Uint8Array) zeroize(opts.encryptionSeed);
  return unlockedView(state);
}

export async function unlockKeystore(document, passphrase) {
  const secret = String(passphrase || "");
  if (secret.length < KEYSTORE_MIN_PASSPHRASE) return fail("AZKS-UNLOCK", "Passphrase was refused. Fail closed.");
  const opened = await openBundle(document, secret);
  if (!opened.ok) return opened;
  await sealDocument(opened);
  return unlockedView(opened);
}

export function storeKey(opened, record) {
  if (!opened || !opened.ok || !opened._state) return fail("AZKS-UNLOCK", "Keystore is locked. Fail closed.");
  if (!record || !record.id || !record.purpose || !(record.seed instanceof Uint8Array)) {
    return fail("AZKS-REFUSE", "Key record is incomplete. Fail closed.");
  }
  const state = opened._state;
  const existing = state.records.find((row) => row.id === record.id);
  if (existing) return fail("AZKS-REFUSE", "Key id already exists. Fail closed.");
  state.records.push({
    id: String(record.id),
    purpose: String(record.purpose),
    algorithm: record.algorithm === "X25519" ? "X25519" : "Ed25519",
    public_key: String(record.public_key || ""),
    status: record.status === "retired" ? "retired" : "active",
    created_at: String(record.created_at || new Date().toISOString()),
    rotated_from: record.rotated_from || null,
    handle: record.handle || "",
    seed: new Uint8Array(record.seed),
    privateKey: record.privateKey || null,
  });
  if (record.purpose === "session") {
    state.sessions.set(record.id, state.records[state.records.length - 1]);
  }
  return { ok: true, id: record.id };
}

export function loadKey(opened, id) {
  if (!opened || !opened.ok || !opened._state) return fail("AZKS-UNLOCK", "Keystore is locked. Fail closed.");
  const row = opened._state.records.find((item) => item.id === id);
  if (!row || !row.privateKey) return fail("AZKS-REFUSE", "Key is not available. Fail closed.");
  return {
    ok: true,
    id: row.id,
    purpose: row.purpose,
    algorithm: row.algorithm,
    public_key: row.public_key,
    status: row.status,
    privateKey: row.privateKey,
    seed: row.seed,
  };
}

export async function rotateKey(opened, opts = {}) {
  if (!opened || !opened.ok || !opened._state) return fail("AZKS-UNLOCK", "Keystore is locked. Fail closed.");
  const purpose = opts.purpose === "node-enc" ? "node-enc" : "node-sign";
  const state = opened._state;
  const current = activeRecord(state.records, purpose);
  if (!current) return fail("AZKS-CORRUPT", "Active key is missing. Fail closed.");
  const now = opts.now ? new Date(opts.now) : new Date();
  const created_at = now.toISOString();
  const generated = purpose === "node-enc" ? await generateEncryptionKeypair() : await generateSigningKeypair();
  if (!generated.ok) return generated;
  current.status = "retired";
  current.id = `${purpose}:retired:${created_at}`;
  const next = {
    id: purpose,
    purpose,
    algorithm: purpose === "node-enc" ? "X25519" : "Ed25519",
    public_key: generated.public_key,
    status: "active",
    created_at,
    rotated_from: current.public_key,
    handle: purpose === "node-enc" ? "" : await handleFor(generated.public_key),
    seed: generated.seed,
    privateKey: generated.privateKey,
  };
  state.records.push(next);
  state.rotated_at = created_at;
  await sealDocument(state);
  opened.document = state.document;
  opened.rotated_at = created_at;
  return {
    ok: true,
    purpose,
    previous_public_key: current.public_key,
    public_key: next.public_key,
    handle: next.handle,
    document: state.document,
  };
}

export async function resealKeystore(opened) {
  if (!opened || !opened.ok || !opened._state) return fail("AZKS-UNLOCK", "Keystore is locked. Fail closed.");
  await sealDocument(opened._state);
  opened.document = opened._state.document;
  return { ok: true, document: opened.document };
}

export function destroySessionKey(opened, sessionId) {
  if (!opened || !opened.ok || !opened._state) return fail("AZKS-UNLOCK", "Keystore is locked. Fail closed.");
  const id = String(sessionId || "");
  const state = opened._state;
  const kept = [];
  let removed = 0;
  for (const row of state.records) {
    if (row.purpose === "session" && (row.id === id || row.id.startsWith(`${id}:`))) {
      zeroize(row.seed);
      row.privateKey = null;
      row.status = "destroyed";
      removed += 1;
      continue;
    }
    kept.push(row);
  }
  state.records = kept;
  state.sessions.delete(id);
  if (!removed) return fail("AZKS-REFUSE", "Session key was not present. Fail closed.");
  return {
    ok: true,
    destroyed: removed,
    session_id: id,
    zeroize_wipes_key: false,
    zeroize_is_best_effort: true,
  };
}

export function assertKeystoreHasNoPlaintextSeeds(document) {
  const text = typeof document === "string" ? document : JSON.stringify(document);
  if (SECRET_NAMES.some((name) => text.includes(`"${name}"`))) {
    return fail("AZKS-REFUSE", "Keystore document names secret material. Fail closed.");
  }
  return { ok: true };
}
