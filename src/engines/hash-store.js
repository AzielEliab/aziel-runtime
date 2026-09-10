/**
 * Isolate hash object store (1.9.0).
 * SHA-256 addressed bytes in this Worker isolate. Not a CDN. Not R2.
 * TrajectoryLock media + WhistleLock files may put/get by hash.
 * send / mail / release / store_media-as-CDN stay refuse.
 * Author: Aziel Eliab. Identity is Aziel Eliab only.
 */

import { sha256Hex } from "../session-core.js";

export const HASH_STORE_CAP_BYTES = 64 * 1024;
export const HASH_STORE_CAP_OBJECTS = 64;
export const HASH_STORE_KIND = "isolate-hash";

const buckets = new Map();

function bucket(ns) {
  const key = String(ns || "default")
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "")
    .slice(0, 32) || "default";
  if (!buckets.has(key)) buckets.set(key, new Map());
  return { key, map: buckets.get(key) };
}

function toBytes(payload) {
  const src = payload && typeof payload === "object" ? payload : {};
  if (src.bytes instanceof Uint8Array) return src.bytes;
  if (src.b64 || src.bytes_b64) {
    const raw = String(src.b64 || src.bytes_b64);
    const bin = atob(raw);
    return Uint8Array.from(bin, (c) => c.charCodeAt(0));
  }
  const text = src.text != null ? String(src.text) : src.body != null ? String(src.body) : "";
  return new TextEncoder().encode(text);
}

export function resetHashStore() {
  buckets.clear();
}

export function hashStoreEnvelope() {
  return {
    r2: { bound: false, bucket: null, cdn: false },
    isolate_hash_store: true,
    object_store: HASH_STORE_KIND,
    cdn: false,
    public_url: false,
  };
}

export async function hashPut(namespace, payload) {
  const bytes = toBytes(payload);
  if (bytes.byteLength === 0) {
    return { ok: false, status: 400, error: "empty-object", cdn: false };
  }
  if (bytes.byteLength > HASH_STORE_CAP_BYTES) {
    return {
      ok: false,
      status: 413,
      error: "object-too-large",
      cap_bytes: HASH_STORE_CAP_BYTES,
      cdn: false,
    };
  }
  const { key, map } = bucket(namespace);
  if (map.size >= HASH_STORE_CAP_OBJECTS) {
    return {
      ok: false,
      status: 507,
      error: "store-full",
      cap_objects: HASH_STORE_CAP_OBJECTS,
      cdn: false,
    };
  }
  const hash = await sha256Hex(bytes);
  map.set(hash, { hash, bytes, size: bytes.byteLength, ts: new Date().toISOString(), ns: key });
  return {
    ok: true,
    op: "hash_put",
    namespace: key,
    hash,
    size: bytes.byteLength,
    stored: true,
    cdn: false,
    url: null,
    public_url: false,
    object_store: HASH_STORE_KIND,
    r2: { bound: false, cdn: false },
    note: "Isolate hash object. Not a CDN. Not R2. No public URL.",
  };
}

export function hashGet(namespace, payload) {
  const src = payload && typeof payload === "object" ? payload : {};
  const hash = String(src.hash || src.digest || "").toLowerCase().replace(/[^a-f0-9]/g, "");
  const { key, map } = bucket(namespace);
  const row = map.get(hash);
  if (!row) {
    return { ok: false, status: 404, error: "not-found", hash, namespace: key, cdn: false };
  }
  const b64 = btoa(String.fromCharCode(...row.bytes));
  return {
    ok: true,
    op: "hash_get",
    namespace: key,
    hash: row.hash,
    size: row.size,
    bytes_b64: b64,
    stored: true,
    cdn: false,
    url: null,
    object_store: HASH_STORE_KIND,
    r2: { bound: false, cdn: false },
  };
}

export function hashStat(namespace, payload) {
  const src = payload && typeof payload === "object" ? payload : {};
  const hash = String(src.hash || src.digest || "").toLowerCase().replace(/[^a-f0-9]/g, "");
  const { key, map } = bucket(namespace);
  const row = map.get(hash);
  if (!row) {
    return { ok: false, status: 404, error: "not-found", hash, namespace: key, present: false, cdn: false };
  }
  return {
    ok: true,
    op: "hash_stat",
    namespace: key,
    hash: row.hash,
    size: row.size,
    ts: row.ts,
    present: true,
    stored: true,
    cdn: false,
    url: null,
    object_store: HASH_STORE_KIND,
    r2: { bound: false, cdn: false },
  };
}
