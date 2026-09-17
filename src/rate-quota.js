/**
 * F03 — Worker-feasible distributed quota (RATE Durable Object per IP+bucket).
 * Unbound deploy uses the isolate sliding window and labels it isolate.
 * MemoryStore is not this quota and is not durable.
 * Author: Aziel Eliab. Identity is Aziel Eliab only.
 */

import { RATE_WINDOW_MS, clientIp, rateLimitDecision, rateLimitForKind, takeRateSlot } from "./production.js";

export class RateQuota {
  constructor(ctx, env) {
    this.ctx = ctx;
    this.env = env;
  }

  async take(body) {
    const now = Number(body && body.now) || Date.now();
    const limit = Number(body && body.limit);
    const windowMs = Number(body && body.window_ms) || RATE_WINDOW_MS;
    if (!Number.isFinite(limit) || limit < 1) {
      return { ok: false, error: "bad limit", enforcement: "durable-object" };
    }
    const prev = (await this.ctx.storage.get("w")) || [];
    const times = (Array.isArray(prev) ? prev : []).filter((ts) => now - Number(ts) < windowMs);
    if (times.length >= limit) {
      const oldest = Number(times[0]) || now;
      const retryAfter = Math.max(1, Math.ceil((windowMs - (now - oldest)) / 1000));
      return {
        ok: false,
        limit,
        remaining: 0,
        count: times.length,
        retry_after: retryAfter,
        window_seconds: Math.round(windowMs / 1000),
        enforcement: "durable-object",
      };
    }
    times.push(now);
    await this.ctx.storage.put("w", times);
    return {
      ok: true,
      limit,
      remaining: limit - times.length,
      count: times.length,
      retry_after: 0,
      window_seconds: Math.round(windowMs / 1000),
      enforcement: "durable-object",
    };
  }

  async fetch(request) {
    try {
      const url = new URL(request.url);
      const action = url.pathname.replace(/^\//, "") || "take";
      if (action === "take" && request.method === "POST") {
        let body = {};
        try {
          body = await request.json();
        } catch {
          body = {};
        }
        return json(await this.take(body));
      }
      return json({ error: "unknown rate quota action", action }, 404);
    } catch (err) {
      return json({ error: err && err.message ? err.message : String(err) }, 500);
    }
  }
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}

function memoryStorage(store) {
  return {
    get: async (k) => (store.has(k) ? store.get(k) : undefined),
    put: async (k, v) => {
      store.set(k, v);
    },
    delete: async (k) => {
      store.delete(k);
    },
  };
}

function serializeObject(obj) {
  let tail = Promise.resolve();
  return {
    fetch(request) {
      const run = tail.then(() => obj.fetch(request), () => obj.fetch(request));
      tail = run.then(
        () => {},
        () => {},
      );
      return run;
    },
    take: (body) => obj.take(body),
  };
}

/** In-memory Durable Object namespace for tests (same contract as RATE). */
export function memoryRateQuotaNamespace(env = {}, shared = new Map()) {
  const objects = new Map();
  function idFromName(name) {
    const key = String(name);
    return {
      name: key,
      toString() {
        return key;
      },
    };
  }
  function get(id) {
    const key = String(id);
    if (!objects.has(key)) {
      let store = shared.get(key);
      if (!store) {
        store = new Map();
        shared.set(key, store);
      }
      objects.set(key, serializeObject(new RateQuota({ storage: memoryStorage(store) }, env)));
    }
    return objects.get(key);
  }
  return {
    idFromName,
    getByName(name) {
      return get(idFromName(name));
    },
    get,
    _shared: shared,
  };
}

function quotaStub(env, name) {
  if (!env || !env.RATE) return null;
  if (typeof env.RATE.getByName === "function") return env.RATE.getByName(name);
  if (typeof env.RATE.idFromName === "function" && typeof env.RATE.get === "function") {
    return env.RATE.get(env.RATE.idFromName(name));
  }
  return null;
}

export async function takeDistributedRateSlot(env, bucket, key, limit, now = Date.now()) {
  const stub = quotaStub(env, `${bucket}:${key}`);
  if (stub) {
    try {
      if (typeof stub.take === "function") {
        return await stub.take({ limit, window_ms: RATE_WINDOW_MS, now });
      }
      const res = await stub.fetch(
        new Request("https://rate/take", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ limit, window_ms: RATE_WINDOW_MS, now }),
        }),
      );
      const body = await res.json();
      if (body && typeof body.ok === "boolean") return body;
    } catch {
      /* isolate fallback — labeled */
    }
  }
  const slot = takeRateSlot(env, bucket, key, limit, now);
  return { ...slot, enforcement: "isolate" };
}

const DOOR_SCOPES = {
  fraggate_call: "fraggate_call",
  fraggate_read: "fraggate_read",
  mcp: "mcp",
};

/** FragGate HTTP + MCP: Durable Object when RATE is bound, else isolate. */
export async function doorRateLimitDecision(env, request, kind, now = Date.now()) {
  if (!DOOR_SCOPES[kind]) return rateLimitDecision(env, request, kind, now);
  const ip = clientIp(request);
  const limit = rateLimitForKind(env, kind);
  if (limit < 1) {
    return { ok: true, scope: DOOR_SCOPES[kind], ip, limit: 0, remaining: 0, count: 0, retry_after: 0, window_seconds: 60, enforcement: "isolate" };
  }
  const slot = await takeDistributedRateSlot(env, kind, ip, limit, now);
  return { ...slot, scope: DOOR_SCOPES[kind], ip };
}
