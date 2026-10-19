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
 * - Stores addendum: the AZNews ("aznews-v1") and 4DMap ("4dmap-v1") Durable Object stores ride in the
 *   bundle as sidecar files (<bundle>.stores/<name>.rows.jsonl, one canonical row per line). The signed
 *   body carries each file's sha256, row count, tip and the store's signed checkpoints, so the rows are
 *   bound by the holder signature without putting ~10^5 rows into one JSON string. Checked offline:
 *   file hash, contiguous seq from 1, both lattice links and every document hash (verifyRowRun), the
 *   checkpoint chain and signatures, and the signed tips at each checkpoint row. Imported forward-only.
 * Author: Aziel Eliab. SPDX-License-Identifier: Apache-2.0
 */
import { readFile, writeFile, rename, mkdir, open as fsOpen, copyFile } from "node:fs/promises";
import { createReadStream } from "node:fs";
import { createInterface } from "node:readline";
import { dirname, join } from "node:path";
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

export async function exportBundle(store, dir, { source = "local", now = new Date(), storesDir = null } = {}) {
  const { loadChain } = await import("./chainlock/ops.js");
  const chains = {};
  for (const c of await chainNames()) {
    const rows = await loadChain(store, c, "");
    if (rows.length) chains[c] = rows;
  }
  // Stores addendum: stores this holder imported earlier are carried on (sidecar files in storesDir).
  const stores = storesDir ? await localStores(dir, storesDir) : null;
  return signBundle(chains, dir, { source, now, stores });
}

export async function signBundle(chains, dir, { source, now = new Date(), stores = null, storesSkipped = null }) {
  const key = await holderKey(dir);
  const body = { kind: BUNDLE_KIND, spec: OFFLINE_RECORDS_SPEC, source, at: now.toISOString(), signer: "local-holder", signer_is_origin: false, chains };
  // Additive: present only when a store is carried (or was tried), so chain-only bundles hash as before.
  if (stores && Object.keys(stores).length) body.stores = stores;
  if (storesSkipped && Object.keys(storesSkipped).length) body.stores_skipped = storesSkipped;
  const text = canon(body);
  const body_sha256 = sha(text);
  const sig = sign(null, Buffer.from(body_sha256), key.priv).toString("base64url");
  return { ...body, body_sha256, public_key: key.pub, sig, counts: Object.fromEntries(Object.entries(chains).map(([c, r]) => [c, r.length])) };
}

export async function checkBundle(bundle, { storesDir = null, trustStoreKey = null } = {}) {
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
  if (body.stores) {
    const st = await checkBundleStores(bundle, storesDir, { trustStoreKey });
    if (!st.ok) return st;
    return { ok: true, code: "OFFLINE-BUNDLE-OK", body_sha256, signer: body.signer, signer_is_origin: false, stores: st.stores, _loaded: st.loaded };
  }
  return { ok: true, code: "OFFLINE-BUNDLE-OK", body_sha256, signer: body.signer, signer_is_origin: false };
}

export async function importBundle(store, bundle, { trustKeys = null, storesDir = null, dir = null, trustStoreKey = null } = {}) {
  const { _loaded: loaded, ...chk } = await checkBundle(bundle, { storesDir, trustStoreKey });
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
  // Stores addendum: forward-only too; a store fork refuses before any chain is written.
  let storesOut = null;
  if (bundle.stores) {
    if (!dir) storesOut = { written: [], note: "stores verified but not imported: no local records dir given" };
    else {
      storesOut = await importStores(dir, bundle, storesDir, loaded);
      if (!storesOut.ok) return storesOut;
    }
  }
  const kv = store && store.kv && typeof store.kv.begin === "function" ? store.kv : null;
  if (kv) kv.begin();
  try {
    for (const [c, rows] of plan) await store.replaceRecords(c, rows);
  } finally {
    if (kv) await kv.commit();
  }
  return { ok: true, code: "OFFLINE-IMPORTED", written: plan.length > 0 || Boolean(storesOut && storesOut.written && storesOut.written.length), chains: plan.map(([c, r]) => ({ chain: c, rows: r.length })), ...(storesOut ? { stores: storesOut.written, ...(storesOut.note ? { stores_note: storesOut.note } : {}) } : {}) };
}

export async function pullBundle(origin, dir, { fetchImpl = fetch, limit = 100, storesDir = null } = {}) {
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
  // Stores addendum: AZNews + 4DMap rows go to sidecar files; a store the origin cannot serve is named in stores_skipped.
  const st = storesDir ? await pullStores(origin, storesDir, { fetchImpl }) : null;
  return { ok: true, bundle: await signBundle(chains, dir, { source: origin, stores: st && st.stores, storesSkipped: st && st.skipped }) };
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
  for (const x of storeAnchorChecks(last && last.statement && last.statement.heads, bundle)) checks.push({ c: x.store, cp_n: x.cp_n, state: x.state });
  const bad = checks.some((x) => x.state === "MISMATCH");
  return { ok: !bad, code: bad ? "OFFLINE-ANCHOR-MISMATCH" : "OFFLINE-ANCHOR-OK", entries: entries.length, latest_n: last && last.statement && last.statement.n, observed_at: last && last.statement && last.statement.observed_at, checks, tsa_rekor_checked_here: false };
}

/* ------------------------------------------------------------------ stores addendum (OFFLINE-RECORDS-1.0) */

export const STORES_SPEC = "OFFLINE-RECORDS-1.0+stores";
/** The checkpointed Durable Object stores carried by a bundle (public read routes /v1/<name>/rows). */
export const STORE_NAMES = Object.freeze(["aznews", "4dmap"]);
export const STORE_PAGE = 500;
const STORE_VERIFY_CHUNK = 2000;
const storeFile = (name) => `${name}.rows.jsonl`;

/** Stream rows (async iterable of pages) into a canonical JSONL file. Returns { count, rows_sha256, tip }. */
export async function writeStoreRows(path, pages) {
  await mkdir(dirname(path), { recursive: true });
  const tmp = path + ".tmp";
  const fh = await fsOpen(tmp, "w");
  const h = createHash("sha256");
  let count = 0;
  let last = null;
  try {
    for await (const page of pages) {
      let chunk = "";
      for (const row of page) {
        if (!row || row.seq !== count + 1) throw Object.assign(new Error("store rows out of order"), { code: "OFFLINE-STORE-GAP", seq: count + 1 });
        chunk += canon(row) + "\n";
        count += 1;
        last = row;
      }
      if (chunk) { h.update(chunk); await fh.write(chunk); }
    }
  } finally {
    await fh.close();
  }
  await rename(tmp, path);
  return { count, rows_sha256: h.digest("hex"), tip: last ? { seq: last.seq, primary: last.lattice && last.lattice.primary, secondary: last.lattice && last.lattice.secondary } : null };
}

/**
 * Read a store sidecar file: { rows, rows_sha256 }. The hash is over the canonical lines (each non-blank line
 * plus "\n"; blank lines are skipped and CRLF reads as LF), not over the raw file bytes. A file written by
 * writeStoreRows hashes the same either way.
 */
export async function readStoreRows(path) {
  const h = createHash("sha256");
  const rows = [];
  const rl = createInterface({ input: createReadStream(path, { encoding: "utf8" }), crlfDelay: Infinity });
  for await (const line of rl) {
    if (!line) continue;
    h.update(line + "\n");
    rows.push(JSON.parse(line));
  }
  return { rows, rows_sha256: h.digest("hex") };
}

/** Verify one store's rows + checkpoints offline. */
export async function checkStore(name, meta, rows, { trustKey = null } = {}) {
  const { verifyRowRun } = await import("./engines/4dmap/aznews-live.js");
  const { checkCheckpoints } = await import("./store-durability.js");
  if (!meta || meta.spec !== STORES_SPEC) return { ok: false, code: "OFFLINE-STORE-BAD-META", store: name };
  if (rows.length !== meta.count) return { ok: false, code: "OFFLINE-STORE-COUNT", store: name, rows: rows.length, count: meta.count };
  let anchor = null;
  for (let i = 0; i < rows.length; i += STORE_VERIFY_CHUNK) {
    const run = rows.slice(i, i + STORE_VERIFY_CHUNK);
    if (run[0].seq !== i + 1) return { ok: false, code: "OFFLINE-STORE-BROKEN", store: name, seq: i + 1, why: "sequence-gap" };
    const v = await verifyRowRun(run, anchor);
    if (!v.ok) return { ok: false, code: "OFFLINE-STORE-BROKEN", store: name, seq: v.seq, why: v.reason };
    anchor = { primary: v.tips.primary, secondary: v.tips.secondary };
  }
  const last = rows[rows.length - 1] || null;
  const tip = last ? { seq: last.seq, primary: last.lattice.primary, secondary: last.lattice.secondary } : null;
  if (canon(tip) !== canon(meta.tip || null)) return { ok: false, code: "OFFLINE-STORE-TIP", store: name };
  const cps = Array.isArray(meta.checkpoints) ? meta.checkpoints : [];
  const key = trustKey || (cps[0] && cps[0].public_key) || null;
  if (cps.length) {
    if (trustKey && cps.some((c) => c.public_key !== trustKey)) return { ok: false, code: "OFFLINE-STORE-UNTRUSTED-CHECKPOINT-KEY", store: name };
    const cc = await checkCheckpoints(cps.filter((c) => c.to_seq <= rows.length), { publicKey: key, rowAt: async (seq) => rows[seq - 1] || null });
    if (!cc.ok) return { ok: false, code: "OFFLINE-STORE-CHECKPOINT", store: name, n: cc.n, why: cc.reason };
  }
  const out = { ok: true, code: "OFFLINE-STORE-OK", store: name, rows: rows.length, checkpoints: cps.length, checkpoint_key: key, checkpoint_key_pinned: Boolean(trustKey) };
  if (name === "4dmap") {
    // Raw rows keep retracted pins (append-only). Report them so a reader can apply the same rule as
    // /v1/4dmap/pins (hidden unless include_retracted): a pin superseded by a later retraction row.
    const { hiddenPinsOffline } = await import("./store-rows-http.js");
    const hidden = hiddenPinsOffline(rows);
    out.retracted_pins = { hidden: hidden.size, retraction_rows: rows.filter((r) => r && r.kind === "map_pin" && r.doc && r.doc.retracted).length, rule: "hidden = a map_pin row whose source_id has a later retraction row; both stay in the rows (append-only)" };
  }
  return out;
}

/** Pages that answer 429 (the origin's light rows limit) are retried after Retry-After, at most this many times each. */
export const STORE_PAGE_RETRIES = 12;
const sleepMs = (ms) => new Promise((r) => setTimeout(r, ms));

async function* pagedRows(fetchImpl, origin, name, limit, { sleep = sleepMs } = {}) {
  for (let from = 1; ; from += limit) {
    let r = await fetchImpl(`${origin}/v1/${name}/rows?from=${from}&limit=${limit}`);
    for (let tries = 0; r && r.status === 429 && tries < STORE_PAGE_RETRIES; tries++) {
      const wait = Math.min(60, Math.max(1, Number(r.headers && r.headers.get && r.headers.get("retry-after")) || 1));
      await sleep(wait * 1000);
      r = await fetchImpl(`${origin}/v1/${name}/rows?from=${from}&limit=${limit}`);
    }
    const j = await r.json().catch(() => null);
    if (!j || !j.ok || !Array.isArray(j.rows)) throw Object.assign(new Error("store rows page refused"), { code: (j && j.code) || "OFFLINE-STORE-PULL-REFUSED", from });
    if (!j.rows.length) return;
    yield j.rows;
    // B311-1: keep paging while a page comes back full. `total` is not trusted to stop (a cached page leaves it
    // out, and an old one could be stale); an empty or short page ends the run.
    if (j.rows.length < limit) return;
  }
}

async function pullCheckpoints(fetchImpl, origin, name) {
  const out = [];
  for (let guard = 0; guard < 10000; guard++) {
    const r = await fetchImpl(`${origin}/v1/${name}/checkpoints?after=${out.length}`);
    const j = await r.json().catch(() => null);
    const cps = j && Array.isArray(j.checkpoints) ? j.checkpoints : null;
    if (!cps) throw Object.assign(new Error("checkpoints refused"), { code: "OFFLINE-STORE-CP-REFUSED" });
    if (!cps.length) break;
    out.push(...cps);
  }
  return out;
}

/** Pull the stores of a live origin into storesDir. Returns { stores, skipped }. */
export async function pullStores(origin, storesDir, { fetchImpl = fetch, limit = STORE_PAGE, names = STORE_NAMES, sleep = sleepMs } = {}) {
  const stores = {};
  const skipped = {};
  for (const name of names) {
    try {
      const checkpoints = await pullCheckpoints(fetchImpl, origin, name);
      const w = await writeStoreRows(join(storesDir, storeFile(name)), pagedRows(fetchImpl, origin, name, limit, { sleep }));
      if (!w.count) { skipped[name] = "OFFLINE-STORE-EMPTY"; continue; }
      stores[name] = { spec: STORES_SPEC, file: storeFile(name), count: w.count, rows_sha256: w.rows_sha256, tip: w.tip, checkpoints: checkpoints.filter((c) => c.to_seq <= w.count) };
    } catch (err) {
      skipped[name] = String((err && err.code) || "OFFLINE-STORE-PULL-FAILED");
    }
  }
  return { stores, skipped };
}

/** Stores held locally after an import ($dir/stores), copied into storesDir for a re-export. */
export async function localStores(dir, storesDir) {
  const stores = {};
  for (const name of STORE_NAMES) {
    let meta = null;
    try { meta = JSON.parse(await readFile(join(dir, "stores", `${name}.meta.json`), "utf8")); } catch { meta = null; }
    if (!meta) continue;
    if (storesDir) { await mkdir(storesDir, { recursive: true }); await copyFile(join(dir, "stores", storeFile(name)), join(storesDir, storeFile(name))); }
    stores[name] = meta;
  }
  return stores;
}

/** Check every store a bundle names against its sidecar files. */
export async function checkBundleStores(bundle, storesDir, { trustStoreKey = null } = {}) {
  const names = Object.keys((bundle && bundle.stores) || {});
  if (!names.length) return { ok: true, stores: [] };
  if (!storesDir) return { ok: false, code: "OFFLINE-STORE-FILE-MISSING", stores: names };
  const results = [];
  const loaded = {};
  for (const name of names) {
    if (!STORE_NAMES.includes(name)) return { ok: false, code: "OFFLINE-STORE-UNKNOWN", store: name };
    const meta = bundle.stores[name];
    if (!meta || meta.file !== storeFile(name)) return { ok: false, code: "OFFLINE-STORE-BAD-META", store: name };
    let got;
    try { got = await readStoreRows(join(storesDir, meta.file)); } catch { return { ok: false, code: "OFFLINE-STORE-FILE-MISSING", store: name }; }
    if (got.rows_sha256 !== meta.rows_sha256) return { ok: false, code: "OFFLINE-STORE-HASH-MISMATCH", store: name };
    const r = await checkStore(name, meta, got.rows, { trustKey: trustStoreKey });
    if (!r.ok) return r;
    results.push(r);
    loaded[name] = got.rows;
  }
  return { ok: true, stores: results, loaded };
}

/** Import stores forward-only into $dir/stores. A local copy must be a prefix (same tip at its seq). */
export async function importStores(dir, bundle, storesDir, loaded) {
  const plan = [];
  for (const name of Object.keys((bundle && bundle.stores) || {})) {
    const meta = bundle.stores[name];
    let local = null;
    try { local = JSON.parse(await readFile(join(dir, "stores", `${name}.meta.json`), "utf8")); } catch { local = null; }
    if (local) {
      const at = loaded[name][local.count - 1];
      const same = local.count <= meta.count && at && local.tip && at.lattice.primary === local.tip.primary && at.lattice.secondary === local.tip.secondary;
      if (!same) return { ok: false, code: "OFFLINE-FORK", store: name, local: local.count, bundle: meta.count, written: false };
      if (local.count === meta.count) continue;
    }
    plan.push(name);
  }
  await mkdir(join(dir, "stores"), { recursive: true });
  for (const name of plan) {
    const meta = bundle.stores[name];
    const dst = join(dir, "stores", storeFile(name));
    await copyFile(join(storesDir, meta.file), dst + ".tmp");
    await rename(dst + ".tmp", dst);
    await writeFile(join(dir, "stores", `${name}.meta.json`), JSON.stringify(meta));
  }
  return { ok: true, written: plan };
}

/** Store checkpoint heads in a witness statement vs the bundle's checkpoints. */
export function storeAnchorChecks(heads, bundle) {
  const out = [];
  for (const [name, a] of Object.entries((heads && heads.stores) || {})) {
    if (!a || !a.n || !a.cp_hash) continue;
    const meta = bundle && bundle.stores ? bundle.stores[name] : null;
    if (!meta) { out.push({ store: name, cp_n: a.n, state: "not-in-bundle" }); continue; }
    const cp = (meta.checkpoints || []).find((c) => c.n === a.n);
    if (!cp) { out.push({ store: name, cp_n: a.n, state: "bundle-short" }); continue; }
    out.push({ store: name, cp_n: a.n, state: cp.cp_hash === a.cp_hash ? "match" : "MISMATCH" });
  }
  return out;
}
