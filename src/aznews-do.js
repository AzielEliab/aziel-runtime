/**
 * AzNewsStore — Durable Object (SQLite) home for AZNews live data (AZNEWS-LIVE-1.0).
 * One object, name "aznews-v1". Requests are serialized through a promise queue so
 * the dual-lattice tips advance in order. Never touches KV or D1.
 * Author: Aziel Eliab. Identity is Aziel Eliab only.
 */
import { read, sqlRepo, tick, verifyRowRun } from "./engines/4dmap/aznews-live.js";
import { makeCheckpoints, relocateStep, routedRepo, segPut, segName, checkpointsAfter, CP_SPEC, SHARD_SPEC, CP_EVERY, SEG_ROWS } from "./store-durability.js";
import { tetherKey } from "./azos-tether.js";

export const AZNEWS_DO_NAME = "aznews-v1";
/** OFFLINE-RECORDS-1.0: largest public raw-row page (GET /v1/aznews/rows, /v1/4dmap/rows). */
export const STORE_ROWS_PAGE_MAX = 500;

export class AzNewsStore {
  constructor(ctx, env) {
    this.ctx = ctx;
    this.env = env;
    this.repo = null;
    this.queue = Promise.resolve();
  }

  baseName() {
    // The object learns its own name from the first request (aznews-v1, 4dmap-v1 or a segment).
    return this.name || null;
  }

  rawRepo() {
    if (!this.raw) this.raw = sqlRepo(this.ctx.storage);
    return this.raw;
  }

  segCall(k, op, payload) {
    const base = this.baseName();
    const ns = this.env && this.env.AZNEWS;
    if (!base || !ns) return Promise.resolve({ ok: false, code: "SEG-UNBOUND" });
    const name = segName(base, k);
    const stub = typeof ns.getByName === "function" ? ns.getByName(name) : ns.get(ns.idFromName(name));
    return stub
      .fetch(new Request("https://seg.internal/" + op, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ op, payload, store: name }) }))
      .then((r) => r.json())
      .catch((err) => ({ ok: false, code: "SEG-UNAVAILABLE", message: String((err && err.message) || err).slice(0, 160) }));
  }

  repoOf() {
    if (!this.repo) this.repo = routedRepo(this.rawRepo(), (k, op, p) => this.segCall(k, op, p));
    return this.repo;
  }

  /** AZRT-STORE-CHECKPOINT-1.0 + AZRT-STORE-SHARD-1.0, bounded, after each tick's push. */
  async maintain(chain) {
    const repo = this.repoOf();
    const key = await tetherKey(this.env);
    const cp = await makeCheckpoints(repo, { chain, key });
    const raw = this.rawRepo();
    const reloc = await relocateStep(repo, { call: (k, op, p) => this.segCall(k, op, p), dropRange: (a, b) => raw.dropRelocated(a, b) });
    return { checkpoints: cp, relocation: reloc };
  }

  async ledger() {
    const repo = this.repoOf();
    const raw = this.rawRepo();
    const shard = (await repo.metaGet("shard")) || { floor: 0, segments: [] };
    const walk = await repo.metaGet("walk");
    return {
      ok: true,
      store: this.baseName(),
      checkpoint_spec: CP_SPEC,
      shard_spec: SHARD_SPEC,
      total_rows: await repo.count(),
      head_rows: await raw.headRows(),
      head_db_bytes: raw.dbBytes ? raw.dbBytes() : null,
      floor: shard.floor || 0,
      segment_rows: SEG_ROWS,
      segments: shard.segments || [],
      relocating: shard.current || null,
      checkpoint_every: CP_EVERY,
      checkpoint_tip: (await repo.metaGet("cp_tip")) || null,
      tips: await repo.metaGet("tips"),
      walk: walk ? { from_genesis: walk.from_genesis, verified_through: walk.verified_through, breaks: walk.breaks, caught_up_at: walk.caught_up_at } : null,
      rule: "Rows are never deleted. A sealed segment lives in its own object and is read through the head; checkpoints are signed and chained from genesis.",
    };
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
    if (!this.name && typeof body.store === "string") this.name = body.store.slice(0, 64);
    try {
      const out = await this.serial(async () => {
        const repo = this.repoOf();
        if (op === "seg_put") return segPut(this.rawRepo(), body.payload || {}, { verifyRows: (rows, anchor) => verifyRowRun(rows, anchor) });
        if (op === "seg_rows") {
          const p = body.payload || {};
          const from = Number(p.from) || 1;
          const to = Math.min(Number(p.to) || from, from + 1999);
          return { ok: true, rows: await this.rawRepo().rowRange(from, to) };
        }
        if (op === "rows") {
          // OFFLINE-RECORDS-1.0 (stores addendum): public, read-only page of raw ledger rows for the offline
          // export. Bounded; mints nothing; relocated segments are read through the head (routed repo).
          const p = body.payload || {};
          const total = await repo.count();
          const from = Math.max(1, Math.floor(Number(p.from)) || 1);
          const limit = Math.max(1, Math.min(STORE_ROWS_PAGE_MAX, Math.floor(Number(p.limit)) || 200));
          const to = Math.min(total, from + limit - 1);
          const rows = from <= total ? await repo.rowRange(from, to) : [];
          return { ok: true, spec: "OFFLINE-RECORDS-1.0", store: this.baseName(), total, from, to: from <= total ? to : from - 1, count: rows.length, rows };
        }
        if (op === "ledger") return this.ledger();
        if (op === "checkpoints") return { ok: true, checkpoints: await checkpointsAfter(repo, Number((body.payload || {}).after) || 0, { max: 50 }) };
        if (op === "tick") return tick(repo, { force: body.force || {} });
        if (op === "tether_push") {
          // Signed copy of this ledger to every bound receiver (internal; not a public read op).
          // aznews-v1 sends chain "aznews"; 4dmap-v1 sends chain "4dmap".
          const { pushCopies } = await import("./aznews-tether.js");
          const chain = body.payload && body.payload.chain === "4dmap" ? "4dmap" : "aznews";
          const maint = await this.maintain(chain).catch((err) => ({ ok: false, code: "STORE-MAINT-ERROR", message: String((err && err.message) || err).slice(0, 160) }));
          const pushed = await pushCopies(this.env, repo, { chain });
          return { ...pushed, maintenance: maint };
        }
        if (op === "map_tick") {
          const { mapTick } = await import("./engines/4dmap/map-store.js");
          return mapTick(repo, { force: Boolean(body.force) });
        }
        if (op === "map_link") {
          const { mapLink } = await import("./engines/4dmap/map-store.js");
          return mapLink(repo, (body.payload && body.payload.items) || []);
        }
        if (op === "map_plot") {
          const { mapPlot } = await import("./engines/4dmap/map-store.js");
          return mapPlot(repo, body.payload || {});
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
  if (!["map_tick", "map_read", "map_link", "map_plot", "tether_push", "ledger", "checkpoints", "rows"].includes(op)) return { ok: false, code: "4DMAP-STORE-OP", message: "Unknown 4DMap store op." };
  if (op === "tether_push") payload = { chain: "4dmap" };
  const stub = mapStubOf(env && env.AZNEWS);
  if (!stub) return { ok: false, code: "4DMAP-STORE-UNBOUND", message: "The store Durable Object is not bound in this isolate." };
  try {
    const res = await stub.fetch(new Request("https://4dmap.internal/" + op, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ op, payload, store: MAP_DO_NAME, ...extra }) }));
    return await res.json();
  } catch (err) {
    return { ok: false, code: "4DMAP-STORE-UNAVAILABLE", message: String((err && err.message) || err).slice(0, 200) };
  }
}

/** Call the store. Never throws: a failure is a refusal body, so /mcp and health stay up. */
export async function aznewsCall(env, op, payload = {}, extra = {}) {
  if (op === "map_tick" || op === "map_read" || op === "map_link" || op === "map_plot") return { ok: false, code: "AZNEWS-STORE-OP", message: "4DMap store ops go to the 4dmap-v1 object." };
  if (op === "tether_push") payload = { chain: "aznews" };
  const stub = stubOf(env && env.AZNEWS);
  if (!stub) return { ok: false, code: "AZNEWS-STORE-UNBOUND", message: "The AZNEWS Durable Object is not bound in this isolate. Nothing was read or written." };
  try {
    const res = await stub.fetch(
      new Request("https://aznews.internal/" + op, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ op, payload, store: AZNEWS_DO_NAME, ...extra }),
      }),
    );
    return await res.json();
  } catch (err) {
    return { ok: false, code: "AZNEWS-STORE-UNAVAILABLE", message: String((err && err.message) || err).slice(0, 200) };
  }
}
