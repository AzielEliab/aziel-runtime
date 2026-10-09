/**
 * AzNewsStore — Durable Object (SQLite) home for AZNews live data (AZNEWS-LIVE-1.0).
 * One object, name "aznews-v1". Requests are serialized through a promise queue so
 * the dual-lattice tips advance in order. Never touches KV or D1.
 * Author: Aziel Eliab. Identity is Aziel Eliab only.
 */
import { read, sqlRepo, tick } from "./engines/4dmap/aznews-live.js";

export const AZNEWS_DO_NAME = "aznews-v1";

export class AzNewsStore {
  constructor(ctx, env) {
    this.ctx = ctx;
    this.env = env;
    this.repo = null;
    this.queue = Promise.resolve();
  }

  repoOf() {
    if (!this.repo) this.repo = sqlRepo(this.ctx.storage);
    return this.repo;
  }

  serial(fn) {
    const run = this.queue.then(fn, fn);
    this.queue = run.catch(() => null);
    return run;
  }

  async fetch(request) {
    let body = {};
    try {
      body = await request.json();
    } catch {
      body = {};
    }
    const op = String(body.op || "");
    try {
      const out = await this.serial(async () => {
        const repo = this.repoOf();
        if (op === "tick") return tick(repo, { force: body.force || {} });
        return read(repo, op, body.payload || {});
      });
      return new Response(JSON.stringify(out), { headers: { "content-type": "application/json" } });
    } catch (err) {
      return new Response(JSON.stringify({ ok: false, code: "AZNEWS-STORE-ERROR", message: String((err && err.message) || err).slice(0, 300) }), {
        status: 500,
        headers: { "content-type": "application/json" },
      });
    }
  }
}

function stubOf(ns) {
  if (!ns) return null;
  if (typeof ns.getByName === "function") return ns.getByName(AZNEWS_DO_NAME);
  if (typeof ns.idFromName === "function") return ns.get(ns.idFromName(AZNEWS_DO_NAME));
  return null;
}

/** Call the store. Never throws: a failure is a refusal body, so /mcp and health stay up. */
export async function aznewsCall(env, op, payload = {}, extra = {}) {
  const stub = stubOf(env && env.AZNEWS);
  if (!stub) return { ok: false, code: "AZNEWS-STORE-UNBOUND", message: "The AZNEWS Durable Object is not bound in this isolate. Nothing was read or written." };
  try {
    const res = await stub.fetch(
      new Request("https://aznews.internal/" + op, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ op, payload, ...extra }),
      }),
    );
    return await res.json();
  } catch (err) {
    return { ok: false, code: "AZNEWS-STORE-UNAVAILABLE", message: String((err && err.message) || err).slice(0, 200) };
  }
}
