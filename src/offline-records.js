/**
 * OFFLINE-RECORDS-1.0: keep, verify, export and rehydrate ChainLock records with the origin gone.
 *
 * - FileKv: a local, persistent KV (one JSON file, atomic rename) behind the normal ChainLock KvStore,
 *   so stdio/local mode appends survive restarts. Append-only is enforced by ChainLock itself.
 * - exportBundle: every chain's rows, their tips, a sha256 over the canonical body, and an Ed25519
 *   signature by the LOCAL holder key (not the runtime origin; the bundle says so).
 * - importBundle (rehydrate): fails closed. The hash, signature and every chain link are checked
 *   first. A chain is written only when the local copy is empty or is a strict prefix of the bundle
 *   (forward-only). Anything else refuses OFFLINE-FORK and writes nothing.
 * - pullBundle: walks the public GET /v1/anchor/rows pages of a live origin into a bundle (while it exists).
 * - verifyAnchorsOffline: checks a local copy of the aziel-anchors witness log (Ed25519, pinned key and
 *   retired keys, hash order) and checks each anchored head against the bundle rows, without the origin.
 * Author: Aziel Eliab. SPDX-License-Identifier: Apache-2.0
 */
import { readFile, writeFile, rename, mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import { createHash, generateKeyPairSync, sign, verify as edVerify, createPublicKey, createPrivateKey } from "node:crypto";

export const OFFLINE_RECORDS_SPEC = "OFFLINE-RECORDS-1.0";
export const BUNDLE_KIND = "aziel-runtime-record-bundle";

function canon(v) {
  if (Array.isArray(v)) return "[" + v.map(canon).join(",") + "]";
  if (v && typeof v === "object") return "{" + Object.keys(v).sort().map((k) => JSON.stringify(k) + ":" + canon(v[k])).join(",") + "}";
  return JSON.stringify(v === undefined ? null : v);
}
const sha = (s) => createHash("sha256").update(s).digest("hex");

export class FileKv {
  constructor(file) { this.file = file; this.map = null; this.batching = 0; this.dirty = false; }
  begin() { this.batching += 1; }
  async commit() { this.batching = Math.max(0, this.batching - 1); if (!this.batching && this.dirty) await this.flush(); }
  async load() {
    if (this.map) return this.map;
    try { this.map = new Map(Object.entries(JSON.parse(await readFile(this.file, "utf8")))); } catch (e) { if (e && e.code !== "ENOENT") throw e; this.map = new Map(); }
    return this.map;
  }
  async flush() {
    await mkdir(dirname(this.file), { recursive: true });
    const tmp = this.file + ".tmp";
    await writeFile(tmp, JSON.stringify(Object.fromEntries(this.map)));
    await rename(tmp, this.file);
    this.dirty = false;
  }
  async get(k) { return (await this.load()).has(k) ? this.map.get(k) : null; }
  async put(k, v) { (await this.load()).set(k, String(v)); this.dirty = true; if (!this.batching) await this.flush(); }
  async delete(k) { (await this.load()).delete(k); this.dirty = true; if (!this.batching) await this.flush(); }
  async list({ prefix = "" } = {}) { const m = await this.load(); return { keys: [...m.keys()].filter((k) => k.startsWith(prefix)).sort().map((name) => ({ name })), list_complete: true }; }
}

export async function localStore(dir) {
  const { KvStore } = await import("./chainlock/store.js");
  return new KvStore(new FileKv(`${dir}/chainlock.json`));
}

export async function holderKey(dir) {
  const file = `${dir}/holder-key.json`;
  try {
    const j = JSON.parse(await readFile(file, "utf8"));
    return { priv: createPrivateKey({ key: j.private_pem, format: "pem" }), pub: j.public_b64url };
  } catch (e) {
    if (e && e.code !== "ENOENT") throw e;
  }
  const { privateKey, publicKey } = generateKeyPairSync("ed25519");
  const pub = publicKey.export({ format: "jwk" }).x;
  await mkdir(dir, { recursive: true });
  await writeFile(file, JSON.stringify({ public_b64url: pub, private_pem: privateKey.export({ format: "pem", type: "pkcs8" }) }), { mode: 0o600 });
  return { priv: privateKey, pub };
}

function pubFromB64(x) { return createPublicKey({ key: { kty: "OKP", crv: "Ed25519", x }, format: "jwk" }); }

async function chainNames() { return (await import("./anchor.js")).ANCHOR_CHAINS.slice(); }

/** Check prev links of raw stamps (same rule as ChainLock verify: prev of row n is the stamp hash of row n-1). */
export async function linkCheck(rows) {
  const { recomputeRowHash, rowHash, rowPrev, GENESIS_PREVS } = await import("./anchor.js");
  let prev = null;
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const h = rowHash(r);
    if (!h || (await recomputeRowHash(r)) !== h) return { ok: false, seq: i + 1, why: "hash does not recompute" };
    if (i === 0 && !GENESIS_PREVS.includes(rowPrev(r))) return { ok: false, seq: 1, why: "row 1 does not link to genesis" };
    if (i > 0 && rowPrev(r) !== prev) return { ok: false, seq: i + 1, why: "prev does not link" };
    prev = h;
  }
  return { ok: true, count: rows.length };
}

export async function exportBundle(store, dir, { source = "local", now = new Date() } = {}) {
  const { loadChain } = await import("./chainlock/ops.js");
  const chains = {};
  for (const c of await chainNames()) {
    const rows = await loadChain(store, c, "");
    if (rows.length) chains[c] = rows;
  }
  return signBundle(chains, dir, { source, now });
}

export async function signBundle(chains, dir, { source, now = new Date() }) {
  const key = await holderKey(dir);
  const body = { kind: BUNDLE_KIND, spec: OFFLINE_RECORDS_SPEC, source, at: now.toISOString(), signer: "local-holder", signer_is_origin: false, chains };
  const text = canon(body);
  const body_sha256 = sha(text);
  const sig = sign(null, Buffer.from(body_sha256), key.priv).toString("base64url");
  return { ...body, body_sha256, public_key: key.pub, sig, counts: Object.fromEntries(Object.entries(chains).map(([c, r]) => [c, r.length])) };
}

export async function checkBundle(bundle) {
  if (!bundle || bundle.kind !== BUNDLE_KIND) return { ok: false, code: "OFFLINE-BAD-BUNDLE" };
  const { body_sha256, public_key, sig, counts: _c, ...body } = bundle;
  if (sha(canon(body)) !== body_sha256) return { ok: false, code: "OFFLINE-HASH-MISMATCH" };
  let good = false;
  try { good = edVerify(null, Buffer.from(body_sha256), pubFromB64(public_key), Buffer.from(sig, "base64url")); } catch { good = false; }
  if (!good) return { ok: false, code: "OFFLINE-BAD-SIG" };
  for (const [c, rows] of Object.entries(body.chains || {})) {
    const lk = await linkCheck(rows);
    if (!lk.ok) return { ok: false, code: "OFFLINE-CHAIN-BROKEN", chain: c, seq: lk.seq, why: lk.why };
  }
  return { ok: true, code: "OFFLINE-BUNDLE-OK", body_sha256, signer: body.signer, signer_is_origin: false };
}

export async function importBundle(store, bundle, { trustKeys = null } = {}) {
  const chk = await checkBundle(bundle);
  if (!chk.ok) return { ...chk, written: false };
  if (Array.isArray(trustKeys) && trustKeys.length && !trustKeys.includes(bundle.public_key)) return { ok: false, code: "OFFLINE-UNTRUSTED-SIGNER", written: false };
  const { loadChain } = await import("./chainlock/ops.js");
  const plan = [];
  for (const [c, rows] of Object.entries(bundle.chains)) {
    const local = await loadChain(store, c, "");
    const prefixOk = local.length <= rows.length && local.every((r, i) => canon(r) === canon(rows[i]));
    if (!prefixOk) return { ok: false, code: "OFFLINE-FORK", chain: c, local: local.length, bundle: rows.length, written: false };
    if (rows.length > local.length) plan.push([c, rows]);
  }
  const kv = store && store.kv && typeof store.kv.begin === "function" ? store.kv : null;
  if (kv) kv.begin();
  try {
    for (const [c, rows] of plan) await store.replaceRecords(c, rows);
  } finally {
    if (kv) await kv.commit();
  }
  return { ok: true, code: "OFFLINE-IMPORTED", written: plan.length > 0, chains: plan.map(([c, r]) => ({ chain: c, rows: r.length })) };
}

export async function pullBundle(origin, dir, { fetchImpl = fetch, limit = 100 } = {}) {
  const chains = {};
  for (const c of await chainNames()) {
    const rows = [];
    for (let from = 1; ; from += limit) {
      const r = await fetchImpl(`${origin}/v1/anchor/rows?c=${c}&from=${from}&limit=${limit}`);
      const j = await r.json().catch(() => null);
      if (!j || !j.ok) {
        if (j && j.code === "LEDGER-NO-ROWS") break;
        if (j && j.code === "LEDGER-PAGE-BROKEN") return { ok: false, code: "OFFLINE-PULL-BROKEN", chain: c, from };
        break;
      }
      for (const x of j.rows) rows.push(x.row);
      if (j.count < limit) break;
    }
    if (rows.length) chains[c] = rows;
  }
  return { ok: true, bundle: await signBundle(chains, dir, { source: origin }) };
}

export async function verifyAnchorsOffline(logText, bundle) {
  const anchor = await import("./anchor.js");
  const entries = anchor.parseJsonlLines(logText);
  const sig = await anchor.verifySignedLog(entries, { publicKey: anchor.WITNESS_PUBLIC_KEY, retiredKeys: anchor.WITNESS_RETIRED_KEYS });
  if (!sig.ok) return { ok: false, code: "OFFLINE-ANCHOR-LOG-BAD", detail: sig };
  const last = entries[entries.length - 1];
  const heads = (last && last.statement && last.statement.heads && last.statement.heads.chains) || [];
  const checks = [];
  for (const h of heads) {
    const rows = bundle && bundle.chains ? bundle.chains[h.c] : null;
    if (!rows) { checks.push({ c: h.c, seq: h.seq, state: "not-in-bundle" }); continue; }
    const row = rows[h.seq - 1];
    if (!row) { checks.push({ c: h.c, seq: h.seq, state: "bundle-short" }); continue; }
    const got = await anchor.recomputeRowHash(row);
    checks.push({ c: h.c, seq: h.seq, state: got === h.h && anchor.rowHash(row) === h.h ? "match" : "MISMATCH" });
  }
  const bad = checks.some((x) => x.state === "MISMATCH");
  return { ok: !bad, code: bad ? "OFFLINE-ANCHOR-MISMATCH" : "OFFLINE-ANCHOR-OK", entries: entries.length, latest_n: last && last.statement && last.statement.n, observed_at: last && last.statement && last.statement.observed_at, checks, tsa_rekor_checked_here: false };
}
