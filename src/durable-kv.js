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
