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
        if (op === "tether_push") {
          // Signed copy of this ledger to every bound receiver (internal; not a public read op).
          // aznews-v1 sends chain "aznews"; 4dmap-v1 sends chain "4dmap".
          const { pushCopies } = await import("./aznews-tether.js");
          const chain = body.payload && body.payload.chain === "4dmap" ? "4dmap" : "aznews";
          return pushCopies(this.env, repo, { chain });
        }
        if (op === "map_tick") {
          const { mapTick } = await import("./engines/4dmap/map-store.js");
          return mapTick(repo, { force: Boolean(body.force) });
        }
        if (op === "map_read") {
          const { mapRead } = await import("./engines/4dmap/map-store.js");
          return mapRead(repo, body.payload || {});
        }
        return read(repo, op, body.payload || {}, { auth: body.auth === true });
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

/** The 4DMap pin store: same object class, its own instance and SQLite database ("4dmap-v1"). */
export const MAP_DO_NAME = "4dmap-v1";

function mapStubOf(ns) {
  if (!ns) return null;
  if (typeof ns.getByName === "function") return ns.getByName(MAP_DO_NAME);
  if (typeof ns.idFromName === "function") return ns.get(ns.idFromName(MAP_DO_NAME));
  return null;
}

/** Call the 4DMap store. Only map_tick, map_read and tether_push {chain:"4dmap"} are sent to it. Never throws. */
export async function mapCall(env, op, payload = {}, extra = {}) {
  if (!["map_tick", "map_read", "tether_push"].includes(op)) return { ok: false, code: "4DMAP-STORE-OP", message: "Unknown 4DMap store op." };
  if (op === "tether_push") payload = { chain: "4dmap" };
  const stub = mapStubOf(env && env.AZNEWS);
  if (!stub) return { ok: false, code: "4DMAP-STORE-UNBOUND", message: "The store Durable Object is not bound in this isolate." };
  try {
    const res = await stub.fetch(new Request("https://4dmap.internal/" + op, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ op, payload, ...extra }) }));
    return await res.json();
  } catch (err) {
    return { ok: false, code: "4DMAP-STORE-UNAVAILABLE", message: String((err && err.message) || err).slice(0, 200) };
  }
}

/** Call the store. Never throws: a failure is a refusal body, so /mcp and health stay up. */
export async function aznewsCall(env, op, payload = {}, extra = {}) {
  if (op === "map_tick" || op === "map_read") return { ok: false, code: "AZNEWS-STORE-OP", message: "4DMap store ops go to the 4dmap-v1 object." };
  if (op === "tether_push") payload = { chain: "aznews" };
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
