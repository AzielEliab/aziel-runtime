/**
 * ChainLock storage — append-only jsonl chains.
 *
 * Worker: in-memory (env.__aziel_chainlock) or KV (USES) under chainlock|
 * CLI vault path: vault/chains/<name>.jsonl  (documented; not hosted)
 *
 * Not a public ledger. Author: Aziel Eliab only.
 */

export const CHAINLOCK_KV_PREFIX = "chainlock|";
export const VAULT_CHAINS_PATH = "vault/chains/<name>.jsonl";
export const VAULT_LOCKSET_PATH = "vault/receipts/LOCKSET.json";
export const VAULT_LIBRARY_PATH = "vault/library.jsonl";

export class MemoryStore {
  constructor(seed) {
    this.map = new Map();
    if (seed && typeof seed === "object") {
      for (const [k, v] of Object.entries(seed)) this.map.set(k, v);
    }
  }

  async get(key) {
    return this.map.has(key) ? this.map.get(key) : null;
  }

  async put(key, value) {
    this.map.set(key, value);
  }

  async listKeys(prefix) {
    const p = String(prefix || "");
    return [...this.map.keys()].filter((k) => k.startsWith(p));
  }
}

export class KvStore {
  constructor(kv, prefix = CHAINLOCK_KV_PREFIX) {
    this.kv = kv;
    this.prefix = prefix;
  }

  async get(key) {
    if (!this.kv || typeof this.kv.get !== "function") return null;
    const raw = await this.kv.get(this.prefix + key);
    return raw == null ? null : raw;
  }

  async put(key, value) {
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
}

export function storeFor(env) {
  if (env && typeof env.get === "function" && typeof env.put === "function" && !env.USES && !env.__aziel_chainlock) {
    return env;
  }
  if (env && env.__aziel_chainlock && typeof env.__aziel_chainlock.get === "function") {
    return env.__aziel_chainlock;
  }
  if (env && env.USES && typeof env.USES.get === "function") {
    return new KvStore(env.USES);
  }
  const mem = new MemoryStore();
  if (env && typeof env === "object" && !env.get) env.__aziel_chainlock = mem;
  return mem;
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
