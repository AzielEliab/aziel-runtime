/**
 * RuntimeKv — Durable Object home for the runtime's hot USES keys.
 *
 * Why: Workers KV on this account has a daily put() quota. The runtime used to
 * write every use counter, every MCP session, and the mesh roster (5 puts every
 * 2 minutes from cron alone) straight into USES KV. Once the account-wide quota
 * ran out, putMcpSession threw "KV put() limit exceeded for the day" and
 * POST /mcp answered HTTP 500 (error 1101) until the next UTC midnight.
 *
 * Writes now land in one SQLite-backed Durable Object (RUNTIME_KV). Reads check
 * the object first and fall back to the legacy USES namespace, so existing
 * counters and sessions carry over without a wipe. Legacy KV is never written
 * again and never deleted here.
 * The USES "total" key is the exception, handled in readUses: once the object
 * holds its own total, hybrid get hides the frozen legacy total. readUses adds
 * the two. That sum is not written back into the object.
 *
 * Author: Aziel Eliab. Identity is Aziel Eliab only.
 */

export const RUNTIME_KV_NAME = "runtime-kv-v1";
export const RUNTIME_KV_LIST_CAP = 1000;

function nowMs() {
  return Date.now();
}

function liveRow(row, now = nowMs()) {
  if (!row || typeof row !== "object") return null;
  if (Number.isFinite(row.exp) && row.exp > 0 && row.exp <= now) return null;
  return row;
}

export class RuntimeKv {
  constructor(ctx, env) {
    this.ctx = ctx;
    this.env = env;
  }

  async kvGet(key) {
    const k = "k:" + String(key);
    const row = liveRow(await this.ctx.storage.get(k));
    if (!row) return null;
    return row.v;
  }

  async kvPut(key, value, ttlSeconds) {
    const ttl = Number(ttlSeconds);
    const row = { v: String(value) };
    if (Number.isFinite(ttl) && ttl > 0) row.exp = nowMs() + ttl * 1000;
    await this.ctx.storage.put("k:" + String(key), row);
    return true;
  }

  async kvDelete(key) {
    await this.ctx.storage.delete("k:" + String(key));
    return true;
  }

  async kvList(prefix, limit, startAfter) {
    const cap = Math.max(1, Math.min(RUNTIME_KV_LIST_CAP, Number(limit) || RUNTIME_KV_LIST_CAP));
    const opts = { prefix: "k:" + String(prefix || ""), limit: cap + 1 };
    if (startAfter) opts.startAfter = "k:" + String(startAfter);
    const rows = await this.ctx.storage.list(opts);
    const now = nowMs();
    const names = [];
    let more = false;
    for (const [k, row] of rows) {
      if (names.length >= cap) {
        more = true;
        break;
      }
      if (!liveRow(row, now)) continue;
      names.push(k.slice(2));
    }
    return { names, more };
  }

  /** USES-SNAPSHOT-1.1: names AND values under a prefix in one request (storage.list already returns values). */
  async kvScan(prefix, limit, startAfter) {
    const cap = Math.max(1, Math.min(RUNTIME_KV_LIST_CAP, Number(limit) || RUNTIME_KV_LIST_CAP));
    const opts = { prefix: "k:" + String(prefix || ""), limit: cap + 1 };
    if (startAfter) opts.startAfter = "k:" + String(startAfter);
    const rows = await this.ctx.storage.list(opts);
    const now = nowMs();
    const entries = [];
    let more = false;
    for (const [k, row] of rows) {
      if (entries.length >= cap) {
        more = true;
        break;
      }
      if (!liveRow(row, now)) continue;
      entries.push([k.slice(2), row.v]);
    }
    return { entries, more };
  }
  /**
   * AZRT-AUTH-ROLLUP-1.0 (additive op): atomic counter. One handler with no outside I/O between the
   * storage get and put, so the object's input gate makes it atomic. Capped; optional TTL; when the value
   * goes from 0 to >0 the optional `mark` key is set too (same TTL), so a reader can find live counters.
   */
  async kvIncr(key, by, cap, ttlSeconds, mark) {
    const k = "k:" + String(key);
    const now = nowMs();
    const row = liveRow(await this.ctx.storage.get(k), now);
    const prev = row ? Math.max(0, Math.floor(Number(row.v)) || 0) : 0;
    const step = Math.max(1, Math.min(1_000_000, Math.floor(Number(by)) || 1));
    const limit = Number.isFinite(Number(cap)) && Number(cap) > 0 ? Math.floor(Number(cap)) : Number.MAX_SAFE_INTEGER;
    const next = Math.min(limit, prev + step);
    const ttl = Number(ttlSeconds);
    const exp = row && Number.isFinite(row.exp) ? row.exp : Number.isFinite(ttl) && ttl > 0 ? now + ttl * 1000 : undefined;
    await this.ctx.storage.put(k, exp ? { v: String(next), exp } : { v: String(next) });
    if (prev === 0 && mark) await this.ctx.storage.put("k:" + String(mark), exp ? { v: "1", exp } : { v: "1" });
    return { value: next, previous: prev, capped: prev + step > limit };
  }

  /** Compare-and-swap one string. Fail closed when the stored bytes moved. */
  async kvCas(key, prev, value) {
    const k = "k:" + String(key);
    const row = liveRow(await this.ctx.storage.get(k));
    const current = row && row.v != null ? String(row.v) : "";
    if (current !== String(prev == null ? "" : prev)) return { ok: false, conflict: true };
    await this.ctx.storage.put(k, { v: String(value) });
    return { ok: true };
  }

  /** Fetch door (the runtime's Durable Objects are plain classes, so no RPC): POST {op, ...}. */
  async fetch(request) {
    let body = {};
    try {
      body = await request.json();
    } catch {
      body = {};
    }
    const op = String(body.op || "");
    let out;
    if (op === "get") out = { value: await this.kvGet(body.key) };
    else if (op === "put") out = { ok: await this.kvPut(body.key, body.value, body.ttl) };
    else if (op === "delete") out = { ok: await this.kvDelete(body.key) };
    else if (op === "list") out = await this.kvList(body.prefix, body.limit, body.after);
    else if (op === "scan") out = await this.kvScan(body.prefix, body.limit, body.after);
    else if (op === "incr") out = await this.kvIncr(body.key, body.by, body.cap, body.ttl, body.mark);
    else if (op === "cas") out = await this.kvCas(body.key, body.prev, body.value);
    else return new Response(JSON.stringify({ ok: false, error: "unknown op" }), { status: 400 });
    return new Response(JSON.stringify(out), { headers: { "content-type": "application/json" } });
  }
}

function stubFor(ns) {
  if (!ns) return null;
  if (typeof ns.getByName === "function") return ns.getByName(RUNTIME_KV_NAME);
  if (typeof ns.idFromName === "function" && typeof ns.get === "function") return ns.get(ns.idFromName(RUNTIME_KV_NAME));
  return null;
}

function decode(raw, opts) {
  if (raw == null) return null;
  const type = typeof opts === "string" ? opts : opts && opts.type;
  if (type === "json") {
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }
  return raw;
}

function ttlOf(opts) {
  if (!opts || typeof opts !== "object") return 0;
  if (Number.isFinite(Number(opts.expirationTtl)) && Number(opts.expirationTtl) > 0) return Number(opts.expirationTtl);
  if (Number.isFinite(Number(opts.expiration)) && Number(opts.expiration) > 0) {
    return Math.max(60, Math.floor(Number(opts.expiration) - nowMs() / 1000));
  }
  return 0;
}

/**
 * KV-shaped facade: Durable Object first, legacy KV read fallback.
 * put/delete go to the Durable Object only. list walks legacy pages ("kv:" cursor)
 * then Durable Object pages ("do:" cursor); a name in both is returned twice and
 * readers resolve it through get(), which prefers the Durable Object.
 */
export function hybridKv(ns, legacy) {
  if (!stubFor(ns)) return legacy || null;
  // Resolve the stub per call: a Durable Object stub is request-scoped I/O and must not
  // be reused from another request (the wrapper itself is cached per env).
  const call = async (body) => {
    const res = await stubFor(ns).fetch(
      new Request("https://runtime-kv.internal/kv", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      }),
    );
    if (!res.ok) throw new Error("RUNTIME_KV " + body.op + " failed: HTTP " + res.status);
    return res.json();
  };
  const stub = {
    kvGet: async (key) => (await call({ op: "get", key })).value,
    kvPut: (key, value, ttl) => call({ op: "put", key, value, ttl }),
    kvDelete: (key) => call({ op: "delete", key }),
    kvList: (prefix, limit, after) => call({ op: "list", prefix, limit, after }),
  };
  const hasLegacy = Boolean(legacy && typeof legacy.get === "function");
  return {
    durable: true,
    /** Legacy (frozen, never written) namespace, for one-time reads such as the snapshot's legacy base. */
    legacy: hasLegacy ? legacy : null,
    /** Durable Object value only. Null when the key is absent. No legacy fallback. */
    async durableGet(key, opts) {
      const raw = await stub.kvGet(String(key));
      if (raw == null) return null;
      return decode(raw, opts);
    },
    /** Durable Object entries (name, value) under a prefix, one request per page of up to 1000. */
    async scan(prefix, after = "", limit = RUNTIME_KV_LIST_CAP) {
      return call({ op: "scan", prefix, after, limit });
    },
    /** AZRT-AUTH-ROLLUP-1.0: atomic capped counter in the Durable Object (no legacy KV involved). */
    async incr(key, by = 1, { cap = 0, ttl = 0, mark = null } = {}) {
      return call({ op: "incr", key: String(key), by, cap, ttl, mark: mark ? String(mark) : null });
    },
    /** Write only when the stored string is still `prev`. Conflict writes nothing. */
    async cas(key, prev, value) {
      return call({ op: "cas", key: String(key), prev: prev == null ? "" : String(prev), value: String(value) });
    },
    async get(key, opts) {
      const raw = await stub.kvGet(String(key));
      if (raw != null) return decode(raw, opts);
      if (!hasLegacy) return null;
      try {
        return await legacy.get(key, opts);
      } catch {
        return null;
      }
    },
    async put(key, value, opts) {
      await stub.kvPut(String(key), String(value), ttlOf(opts));
    },
    async delete(key) {
      await stub.kvDelete(String(key));
    },
    async list({ prefix = "", limit = RUNTIME_KV_LIST_CAP, cursor } = {}) {
      const c = String(cursor || "");
      if (hasLegacy && typeof legacy.list === "function" && !c.startsWith("do:")) {
        try {
          const page = await legacy.list({ prefix, limit, cursor: c.startsWith("kv:") ? c.slice(3) : undefined });
          const keys = (page && page.keys) || [];
          if (page && page.list_complete === false && page.cursor) {
            return { keys, list_complete: false, cursor: "kv:" + page.cursor };
          }
          return { keys, list_complete: false, cursor: "do:" };
        } catch {
          // Legacy list failed: continue with the durable pages only.
        }
      }
      const after = c.startsWith("do:") ? c.slice(3) : "";
      const page = await stub.kvList(prefix, limit, after);
      const names = (page && page.names) || [];
      const keys = names.map((name) => ({ name }));
      if (page && page.more && names.length) {
        return { keys, list_complete: false, cursor: "do:" + names[names.length - 1] };
      }
      return { keys, list_complete: true };
    },
  };
}

const wrapped = new WeakMap();

/** Env with USES routed through RUNTIME_KV when that binding exists. Same object back otherwise. */
export function withDurableKv(env) {
  if (!env || typeof env !== "object" || !env.RUNTIME_KV || !env.USES) return env;
  if (env.USES && env.USES.durable === true) return env;
  const hit = wrapped.get(env);
  if (hit) return hit;
  const out = Object.assign(Object.create(Object.getPrototypeOf(env)), env, { USES: hybridKv(env.RUNTIME_KV, env.USES) });
  wrapped.set(env, out);
  return out;
}

/** In-memory RUNTIME_KV namespace for tests (same RPC contract). */
export function memoryRuntimeKvNamespace() {
  const map = new Map();
  const storage = {
    async get(k) {
      return map.has(k) ? structuredClone(map.get(k)) : undefined;
    },
    async put(k, v) {
      map.set(k, structuredClone(v));
    },
    async delete(k) {
      return map.delete(k);
    },
    async list({ prefix = "", limit = Infinity, startAfter } = {}) {
      const keys = [...map.keys()].filter((k) => k.startsWith(prefix) && (!startAfter || k > startAfter)).sort();
      return new Map(keys.slice(0, limit).map((k) => [k, structuredClone(map.get(k))]));
    },
  };
  const obj = new RuntimeKv({ storage }, {});
  return {
    _map: map,
    getByName() {
      return obj;
    },
  };
}
