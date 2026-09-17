/**
 * ChainLock storage — append-only chains as individual records.
 *
 * Worker deploy: CHAINLOCK Durable Object (ChainWriter) is the concurrent
 * writer — one serialized object per chain, transactional seq/tip, commit
 * before ack. In-process MemoryStore/KvStore locks are same-isolate only.
 * USES KV get/put is not compare-and-swap; do not treat it as the writer.
 *
 * CLI vault path: vault/chains/<name>.jsonl  (documented; not hosted)
 * Not a public ledger. Author: Aziel Eliab only.
 */

export const CHAINLOCK_KV_PREFIX = "chainlock|";
export const VAULT_CHAINS_PATH = "vault/chains/<name>.jsonl";
export const VAULT_LOCKSET_PATH = "vault/receipts/LOCKSET.json";
export const VAULT_LIBRARY_PATH = "vault/library.jsonl";
export const WORKER_STORE_NOTE =
  "Worker deploy binds CHAINLOCK (ChainWriter Durable Object): serialized writer per chain, individual records, commit-before-ack. MemoryStore/KvStore in-process locks are same-isolate only. USES KV get/put has no CAS in this code.";

function isChainBlobKey(key) {
  const k = String(key || "");
  return k.startsWith("chains/") && !k.includes("/e/") && !k.startsWith("e/") && k !== "chains/";
}

export function storageName(chain, caller) {
  const c = String(chain || "").trim() || "session";
  const ns = String(caller || "").trim();
  return ns ? `${ns}/${c}` : c;
}

export function writerName(chain, caller) {
  const c = String(chain || "").trim() || "session";
  const ns = String(caller || "").trim();
  return ns ? `${ns}:${c}` : c;
}

export function chainKey(name, caller) {
  return `chains/${storageName(name, caller)}`;
}

export function tipOf(record, genesis = "") {
  if (!record || typeof record !== "object") return genesis;
  return record.stamp_sha256 || record.hash || record.tip || genesis;
}

export function parseJsonl(raw) {
  const text = raw == null ? "" : String(raw);
  if (!text.trim()) return [];
  const rows = [];
  for (const line of text.split(/\r?\n/)) {
    const s = line.trim();
    if (!s) continue;
    try {
      rows.push(JSON.parse(s));
    } catch {
      rows.push({ _broken: true, raw: s });
    }
  }
  return rows;
}

export function toJsonl(rows) {
  return (rows || []).map((r) => JSON.stringify(r)).join("\n") + ((rows || []).length ? "\n" : "");
}

function orderedRecords(entryMap) {
  return [...entryMap.entries()]
    .sort((a, b) => Number(a[0]) - Number(b[0]))
    .map(([, row]) => row);
}

function withLock(locks, key, fn) {
  const prev = locks.get(key) || Promise.resolve();
  const run = prev.then(fn, fn);
  locks.set(key, run.then(() => {}, () => {}));
  return run;
}

function parseMaybe(raw) {
  if (raw == null || raw === "") return null;
  if (typeof raw === "object") return raw;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/**
 * Shared append transaction: assign seq/tip, build record, store that
 * record under its own key, then commit meta. Caller must already hold
 * the per-chain lock (Memory/KV) or be inside a Durable Object request.
 */
export async function commitAppend(adapter, opts, builder) {
  const genesis = opts.genesis == null ? "" : String(opts.genesis);
  const idempKey = opts.idempotencyKey ? String(opts.idempotencyKey) : "";
  if (idempKey) {
    const hit = parseMaybe(await adapter.getIdemp(idempKey));
    if (hit && hit.ok && hit.record) {
      return { ...hit, replayed: true, ok: true };
    }
  }
  const rows = await adapter.loadRows();
  const seq = rows.length;
  const prev = rows.length ? tipOf(rows[rows.length - 1], genesis) : genesis;
  const record = await builder({ seq, prev, rows });
  if (!record || record.refuse) {
    return { ok: false, ...(record || { refuse: "no-record" }) };
  }
  const nextSeq = seq + 1;
  await adapter.putEntry(nextSeq, record);
  await adapter.putMeta({ seq: nextSeq, tip: tipOf(record, genesis) });
  const ack = { ok: true, record, seq: nextSeq, prev, replayed: false };
  if (idempKey) await adapter.putIdemp(idempKey, { ...ack, replayed: true });
  return ack;
}

class MapChainAdapter {
  constructor(store, name, genesis) {
    this.store = store;
    this.name = name;
    this.genesis = genesis;
  }

  async loadRows() {
    return this.store._rows(this.name);
  }

  async putEntry(seq, record) {
    this.store._ensure(this.name).set(seq, record);
    this.store._rebuildBlob(this.name);
  }

  async putMeta(meta) {
    this.store._meta.set(this.name, meta);
  }

  async getIdemp(key) {
    const bag = this.store._idemp.get(this.name);
    return bag && bag.has(key) ? bag.get(key) : null;
  }

  async putIdemp(key, ack) {
    if (!this.store._idemp.has(this.name)) this.store._idemp.set(this.name, new Map());
    this.store._idemp.get(this.name).set(key, ack);
  }
}

class KvChainAdapter {
  constructor(kvStore, name, genesis) {
    this.kvStore = kvStore;
    this.name = name;
    this.genesis = genesis;
  }

  async loadRows() {
    const entries = [];
    const meta = parseMaybe(await this.kvStore.get(`meta/${this.name}`));
    if (meta && meta.seq > 0) {
      for (let i = 1; i <= meta.seq; i++) {
        const row = parseMaybe(await this.kvStore.get(`e/${this.name}/${i}`));
        if (row) entries.push(row);
      }
      if (entries.length) return entries;
    }
    return parseJsonl(await this.kvStore.get(chainKey(this.name)));
  }

  async putEntry(seq, record) {
    await this.kvStore._putRaw(`e/${this.name}/${seq}`, JSON.stringify(record));
  }

  async putMeta(meta) {
    await this.kvStore._putRaw(`meta/${this.name}`, JSON.stringify(meta));
    const rows = await this.loadRows();
    await this.kvStore._putRaw(chainKey(this.name), toJsonl(rows));
  }

  async getIdemp(key) {
    return parseMaybe(await this.kvStore.get(`idemp/${this.name}/${key}`));
  }

  async putIdemp(key, ack) {
    await this.kvStore._putRaw(`idemp/${this.name}/${key}`, JSON.stringify(ack));
  }
}

export class MemoryStore {
  constructor(seed) {
    this.map = new Map();
    this._entries = new Map();
    this._meta = new Map();
    this._idemp = new Map();
    this._locks = new Map();
    if (seed && typeof seed === "object") {
      for (const [k, v] of Object.entries(seed)) {
        this.map.set(k, v);
        if (isChainBlobKey(k)) this._replaceFromJsonl(k.slice("chains/".length), v);
      }
    }
  }

  _ensure(name) {
    if (!this._entries.has(name)) this._entries.set(name, new Map());
    return this._entries.get(name);
  }

  _rows(name) {
    if (this._entries.has(name) && this._entries.get(name).size) {
      return orderedRecords(this._entries.get(name));
    }
    return parseJsonl(this.map.get(chainKey(name)));
  }

  _rebuildBlob(name) {
    this.map.set(chainKey(name), toJsonl(this._rows(name)));
  }

  _replaceFromJsonl(name, raw) {
    const rows = parseJsonl(raw);
    const bag = new Map();
    for (let i = 0; i < rows.length; i++) bag.set(i + 1, rows[i]);
    this._entries.set(name, bag);
    const last = rows[rows.length - 1];
    this._meta.set(name, { seq: rows.length, tip: tipOf(last, "") });
    this.map.set(chainKey(name), toJsonl(rows));
  }

  async get(key) {
    const k = String(key || "");
    if (isChainBlobKey(k)) {
      const name = k.slice("chains/".length);
      if (this._entries.has(name) && this._entries.get(name).size) {
        return toJsonl(this._rows(name));
      }
    }
    return this.map.has(k) ? this.map.get(k) : null;
  }

  async put(key, value) {
    const k = String(key || "");
    this.map.set(k, value);
    if (isChainBlobKey(k)) this._replaceFromJsonl(k.slice("chains/".length), value);
  }

  async listKeys(prefix) {
    const p = String(prefix || "");
    const keys = new Set([...this.map.keys()].filter((k) => k.startsWith(p)));
    for (const name of this._entries.keys()) {
      const blob = chainKey(name);
      if (blob.startsWith(p)) keys.add(blob);
    }
    return [...keys];
  }

  async loadRecords(name) {
    return this._rows(String(name || ""));
  }

  async replaceRecords(name, rows) {
    this._replaceFromJsonl(String(name || ""), toJsonl(rows));
  }

  async resetChain(name) {
    const n = String(name || "");
    this._entries.delete(n);
    this._meta.delete(n);
    this._idemp.delete(n);
    this.map.delete(chainKey(n));
  }

  async appendAtomic(opts, builder) {
    const name = storageName(opts && opts.chain, opts && opts.caller);
    if (typeof builder !== "function") {
      throw new Error("MemoryStore.appendAtomic requires a builder (use DurableStore / CHAINLOCK for Worker compose)");
    }
    return withLock(this._locks, name, () =>
      commitAppend(new MapChainAdapter(this, name, opts && opts.genesis), opts || {}, builder),
    );
  }
}

export class KvStore {
  constructor(kv, prefix = CHAINLOCK_KV_PREFIX) {
    this.kv = kv;
    this.prefix = prefix;
    this._locks = new Map();
  }

  async get(key) {
    if (!this.kv || typeof this.kv.get !== "function") return null;
    const raw = await this.kv.get(this.prefix + key);
    return raw == null ? null : raw;
  }

  async put(key, value) {
    await this._putRaw(key, value);
    if (isChainBlobKey(key)) {
      // Whole-chain put (tests / recover): rewrite individual keys from jsonl.
      const name = String(key).slice("chains/".length);
      const rows = parseJsonl(value);
      if (this.kv && typeof this.kv.put === "function") {
        for (let i = 0; i < rows.length; i++) {
          await this.kv.put(this.prefix + `e/${name}/${i + 1}`, JSON.stringify(rows[i]));
        }
        const last = rows[rows.length - 1];
        await this.kv.put(this.prefix + `meta/${name}`, JSON.stringify({ seq: rows.length, tip: tipOf(last, "") }));
      }
    }
  }

  async _putRaw(key, value) {
    if (!this.kv || typeof this.kv.put !== "function") return;
    await this.kv.put(this.prefix + key, value);
  }

  async listKeys(prefix) {
    if (!this.kv || typeof this.kv.list !== "function") return [];
    const out = [];
    const listed = await this.kv.list({ prefix: this.prefix + String(prefix || "") });
    for (const key of (listed && listed.keys) || []) {
      const name = String(key.name || "").slice(this.prefix.length);
      if (name) out.push(name);
    }
    return out;
  }

  async loadRecords(name) {
    return new KvChainAdapter(this, String(name || ""), "").loadRows();
  }

  async replaceRecords(name, rows) {
    await this.put(chainKey(name), toJsonl(rows));
  }

  async resetChain(name) {
    const n = String(name || "");
    const rows = await this.loadRecords(n);
    if (this.kv && typeof this.kv.delete === "function") {
      await this.kv.delete(this.prefix + chainKey(n));
      await this.kv.delete(this.prefix + `meta/${n}`);
      for (let i = 1; i <= rows.length + 1; i++) {
        await this.kv.delete(this.prefix + `e/${n}/${i}`);
      }
    } else if (this.kv && typeof this.kv.put === "function") {
      await this.kv.put(this.prefix + chainKey(n), "");
      await this.kv.put(this.prefix + `meta/${n}`, JSON.stringify({ seq: 0, tip: "" }));
    }
  }

  async appendAtomic(opts, builder) {
    const name = storageName(opts && opts.chain, opts && opts.caller);
    if (typeof builder !== "function") {
      throw new Error("KvStore.appendAtomic requires a builder (Worker deploy uses CHAINLOCK / DurableStore)");
    }
    return withLock(this._locks, name, () =>
      commitAppend(new KvChainAdapter(this, name, opts && opts.genesis), opts || {}, builder),
    );
  }
}

/**
 * Worker-compatible store: one Durable Object per chain (getByName).
 * Tests use memoryChainWriterNamespace() from writer-do.js as the binding.
 */
export class DurableStore {
  constructor(ns, opts = {}) {
    this.ns = ns;
    this.fallback = opts.fallback || null;
  }

  _stub(name) {
    if (!this.ns) return null;
    if (typeof this.ns.getByName === "function") return this.ns.getByName(name);
    if (typeof this.ns.idFromName === "function" && typeof this.ns.get === "function") {
      return this.ns.get(this.ns.idFromName(name));
    }
    return null;
  }

  async _fetch(name, path, init) {
    const stub = this._stub(name);
    if (!stub || typeof stub.fetch !== "function") {
      throw new Error("CHAINLOCK Durable Object stub missing fetch");
    }
    const url = new URL(path, "https://chainwriter.internal");
    return stub.fetch(new Request(url, init));
  }

  async _json(name, path, init) {
    const res = await this._fetch(name, path, init);
    const text = await res.text();
    if (!text) return {};
    try {
      return JSON.parse(text);
    } catch {
      return { ok: false, refuse: "bad-writer-json", status: res.status };
    }
  }

  async get(key) {
    const k = String(key || "");
    if (isChainBlobKey(k)) {
      const name = k.slice("chains/".length);
      const rows = await this.loadRecords(name);
      return toJsonl(rows);
    }
    const body = await this._json("__kv__", `/kv?key=${encodeURIComponent(k)}`);
    if (body && body.value != null) return body.value;
    if (this.fallback) return this.fallback.get(k);
    return null;
  }

  async put(key, value) {
    const k = String(key || "");
    if (isChainBlobKey(k)) {
      const name = k.slice("chains/".length);
      await this.replaceRecords(name, parseJsonl(value));
      return;
    }
    await this._json("__kv__", "/kv", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ key: k, value }),
    });
  }

  async listKeys(prefix) {
    const p = String(prefix || "");
    const body = await this._json("__kv__", `/keys?prefix=${encodeURIComponent(p)}`);
    const fromDo = Array.isArray(body.keys) ? body.keys : [];
    if (!this.fallback || typeof this.fallback.listKeys !== "function") return fromDo;
    const extra = await this.fallback.listKeys(p);
    return [...new Set([...fromDo, ...extra])];
  }

  async loadRecords(name) {
    const n = String(name || "");
    const writer = n.includes("/") ? n.replace("/", ":") : n;
    const body = await this._json(writer, "/dump");
    const rows = Array.isArray(body.rows) ? body.rows : [];
    if (rows.length || !this.fallback) return rows;
    const legacy = parseJsonl(await this.fallback.get(chainKey(n)));
    if (!legacy.length) return [];
    await this.replaceRecords(n, legacy);
    return legacy;
  }

  async replaceRecords(name, rows) {
    const n = String(name || "");
    const writer = n.includes("/") ? n.replace("/", ":") : n;
    await this._json(writer, "/replace", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ rows: rows || [] }),
    });
  }

  async resetChain(name) {
    const n = String(name || "");
    const writer = n.includes("/") ? n.replace("/", ":") : n;
    await this._json(writer, "/reset", { method: "POST" });
  }

  async appendAtomic(opts) {
    const chain = opts && opts.chain;
    const caller = opts && opts.caller;
    const name = writerName(chain, caller);
    if (this.fallback) {
      await this.loadRecords(storageName(chain, caller));
    }
    return this._json(name, "/append", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        kind: (opts && opts.kind) || "chainlock",
        chain,
        caller,
        idempotencyKey: opts && opts.idempotencyKey,
        genesis: opts && opts.genesis,
        input: opts && opts.input,
      }),
    });
  }
}

export function storeFor(env) {
  if (env && typeof env.appendAtomic === "function") return env;
  if (
    env &&
    typeof env.get === "function" &&
    typeof env.put === "function" &&
    !env.USES &&
    !env.__aziel_chainlock &&
    !env.CHAINLOCK
  ) {
    return env;
  }
  if (env && env.CHAINLOCK && (typeof env.CHAINLOCK.getByName === "function" || typeof env.CHAINLOCK.get === "function")) {
    if (!env.__aziel_durable) {
      const fallback = env.USES && typeof env.USES.get === "function" ? new KvStore(env.USES) : null;
      env.__aziel_durable = new DurableStore(env.CHAINLOCK, { fallback });
    }
    return env.__aziel_durable;
  }
  if (env && env.__aziel_chainlock && typeof env.__aziel_chainlock.get === "function") {
    return env.__aziel_chainlock;
  }
  if (env && env.USES && typeof env.USES.get === "function") {
    if (!env.__aziel_kvstore) env.__aziel_kvstore = new KvStore(env.USES);
    return env.__aziel_kvstore;
  }
  const mem = new MemoryStore();
  if (env && typeof env === "object" && !env.get) env.__aziel_chainlock = mem;
  return mem;
}
