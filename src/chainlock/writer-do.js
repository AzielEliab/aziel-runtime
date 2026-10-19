/**
 * ChainWriter — one Durable Object per chain (FragGate ledger or ChainLock).
 * Serialized by the DO input gate. Individual records. Commit before ack.
 * Local tests use memoryChainWriterNamespace (same fetch contract).
 * Author: Aziel Eliab. Identity is Aziel Eliab only.
 */

import { composeLedgerEntry } from "../fraggate/ledger.js";
import { CARD_CAP, CL_VERSION, GENESIS, cardBytes, composeChainlockStamp, toCard } from "./ops.js";
import { tipOf } from "./store.js";
import { LatticeError, latticeTips } from "../dual-lattice.js";

function offlineSecondaries(rows) {
  const out = [];
  for (const row of rows || []) {
    const lat = row && row.lattice;
    if (lat && lat.offline === true && typeof lat.secondary === "string") out.push(lat.secondary);
  }
  return out;
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}

async function readJson(request) {
  const text = await request.text();
  if (!text || !text.trim()) return {};
  try {
    return JSON.parse(text);
  } catch {
    const err = new Error("invalid JSON");
    err.status = 400;
    throw err;
  }
}


/** RIB-018 follow-up: global per-minute cap on new `refusals` rows; peers (azos/azinterface) get a sub-cap. */
export const REFUSAL_CAP = Object.freeze({
  chain: "refusals",
  total: 609,
  // Per-class shares (sum 609), so one class can't starve another (AZBot review of #302).
  // rollup: 9/min reserved for AZRT-AUTH-ROLLUP-1.0 count rows (8 + 1 overflow, self-capped), outside
  // the REST 240 so a flood of REST door refusals can't starve the auth rollup flush (AZBot B307-1).
  classes: Object.freeze({ rest: 240, mcp: 240, peer: 120, rollup: 9 }),
  peer: 120,
  // Rows that differ only by goal_id (or the prior refusal they follow): at most this many per minute
  // for one door + code + route shape across all goal variants.
  variant: 30,
});

/**
 * Which share a new refusal row spends: peer (azos/azinterface reports), rollup (the runtime's own
 * AZRT-AUTH-ROLLUP-1.0 count rows: surface runtime + kind auth_rollup + tool auth-rollup, all set by
 * server code only), rest (runtime REST doors), mcp (FragGate/MCP door).
 */
export function refusalCapClass(input) {
  const r = (input && input.refusal) || {};
  if (r.surface === "azos" || r.surface === "azinterface") return "peer";
  if (r.surface === "runtime" && r.kind === "auth_rollup" && r.tool === "auth-rollup") return "rollup";
  if (r.surface === "runtime") return "rest";
  return "mcp";
}

/**
 * The row's shape with goal_key / follows left out: rows sharing it differ only by goal (or prior).
 * Built from the same bounded names the dedupe key uses (slug || "other", op || "other") plus
 * code / tool / door / route template / status (tool is checked against the listed tools before here). Caller-shaped hashes (slug_sha256, op_sha256, route_sha256)
 * are left out, so varying a junk op or path together with goal_id can't mint a fresh shape.
 */
async function refusalVariantKey(input) {
  const r = (input && input.refusal) || {};
  const shape = [r.code, r.tool, r.slug || "other", r.op || "other", r.door, r.route, r.status].map((x) => (x == null ? "" : String(x))).join("|");
  const bytes = new TextEncoder().encode(shape);
  const d = new Uint8Array(await crypto.subtle.digest("SHA-256", bytes));
  return Array.from(d.slice(0, 8), (b) => b.toString(16).padStart(2, "0")).join("");
}

export class ChainWriter {
  constructor(ctx, env) {
    this.ctx = ctx;
    this.env = env;
  }

  async _get(key) {
    return this.ctx.storage.get(key);
  }

  async _put(key, value) {
    await this.ctx.storage.put(key, value);
  }

  /** STATS-FLOOR-1.0 (only on the "__statsfloor__" object): raise the floor to max(floor, uses). */
  async statsFloor(body) {
    const key = String((body && body.key) || "").slice(0, 64);
    const uses = Math.floor(Number(body && body.uses));
    if (!key || !Number.isFinite(uses) || uses < 0) return { ok: false, refuse: "bad-floor" };
    const run = (this._floorQueue || Promise.resolve()).then(async () => {
      const cur = Number((await this._get("floor:" + key)) || 0);
      const next = Math.max(cur, uses);
      if (next !== cur) await this._put("floor:" + key, next);
      return { ok: true, key, floor: next };
    });
    this._floorQueue = run.catch(() => {});
    return run;
  }

  async _meta() {
    return (await this._get("meta")) || { seq: 0, tip: "" };
  }

  async _rows() {
    const meta = await this._meta();
    const rows = [];
    for (let i = 1; i <= (meta.seq || 0); i++) {
      const row = await this._get("e:" + i);
      if (row) rows.push(row);
    }
    return rows;
  }

  async append(body) {
    const src = body && typeof body === "object" ? body : {};
    const kind = String(src.kind || "chainlock");
    const idempKey = src.idempotencyKey ? String(src.idempotencyKey) : "";
    if (idempKey) {
      const hit = await this._get("idemp:" + idempKey);
      if (hit && hit.ok && hit.record) return { ...hit, replayed: true, ok: true };
    }
    // RIB-018 follow-up: global per-minute cap on NEW refusal rows (this writer is the only one for the
    // chain, so it is a true global bound), split into per-class shares (rest / mcp / peer) plus a
    // goal-variant sub-cap. Checked here; counted only after the row is written (failed writes spend nothing).
    let capCommit = null;
    if (String(src.chain || "") === REFUSAL_CAP.chain && src.input && src.input.k === "refusal") {
      const minute = Math.floor(Date.now() / 60000);
      const prevCap = await this._get("refcap");
      const cap = prevCap && prevCap.m === minute && prevCap.cls ? prevCap : { m: minute, total: 0, cls: { rest: 0, mcp: 0, peer: 0, rollup: 0 }, v: {} };
      const cls = refusalCapClass(src.input);
      const vk = await refusalVariantKey(src.input);
      const share = REFUSAL_CAP.classes[cls];
      let why = null;
      let limit = null;
      if (cap.total >= REFUSAL_CAP.total) { limit = "total"; why = `global refusal seal cap ${REFUSAL_CAP.total}/min reached`; }
      else if ((cap.cls[cls] || 0) >= share) { limit = "class"; why = `${cls} refusal share ${share}/min reached`; }
      else if ((cap.v[vk] || 0) >= REFUSAL_CAP.variant) { limit = "variant"; why = `goal-variant sub-cap ${REFUSAL_CAP.variant}/min for this door+code+route reached`; }
      if (why) {
        // cap_limit / cap_minute (additive) let isolates memo "class full until the end of this minute".
        return { ok: false, refuse: "refusal-cap", code: "REFUSAL-GLOBAL-CAP", cap_class: cls, cap_limit: limit, cap_minute: minute, written: false, message: `${why}; the refusal still stands`, v: CL_VERSION };
      }
      capCommit = async () => {
        const cur = await this._get("refcap");
        const c = cur && cur.m === minute && cur.cls ? cur : { m: minute, total: 0, cls: { rest: 0, mcp: 0, peer: 0, rollup: 0 }, v: {} };
        c.total++;
        c.cls[cls] = (c.cls[cls] || 0) + 1;
        c.v[vk] = (c.v[vk] || 0) + 1;
        await this._put("refcap", c);
      };
    }
    const genesis = src.genesis == null ? (kind === "ledger" ? "0".repeat(64) : GENESIS) : String(src.genesis);
    const meta = await this._meta();
    const seq = Number(meta.seq) || 0;
    const prev = meta.tip || genesis;
    let record;
    if (kind === "ledger") {
      // LEDGER-LATTICE-1.0: FragGate ledger rows join the dual lattice too.
      let ltips = meta.lt && meta.lt.primary ? meta.lt : null;
      if (!ltips) {
        const lt = latticeTips(seq > 0 ? await this._rows() : []);
        ltips = { primary: lt.primary, secondary: lt.secondary };
      }
      record = await composeLedgerEntry(src.input || {}, { seq: seq + 1, prev: prev || genesis, latticeTips: ltips });
      if (idempKey) record = { ...record, idemp: idempKey };
    } else {
      // Dual hash lattice tips live in meta.lt. A chain written before the
      // lattice has no meta.lt, so its tips come from a one-time row scan.
      let tips = meta.lt && meta.lt.primary ? meta.lt : null;
      let legacyRows = null;
      if (!tips) {
        legacyRows = seq > 0 ? await this._rows() : [];
        const lt = latticeTips(legacyRows);
        tips = { primary: lt.primary, secondary: lt.secondary };
      }
      let stamp;
      try {
        stamp = await composeChainlockStamp(src.input || {}, {
          prev: prev || genesis,
          rows: legacyRows,
          latticeTips: tips,
          hasOffline: async (secondary) => Boolean(await this._get("off:" + secondary)),
        });
      } catch (err) {
        if (err instanceof LatticeError) {
          return {
            ok: false,
            refuse: err.code === "LATTICE-DOUBLE" ? "lattice-double" : "lattice-username",
            code: err.code,
            message: err.message,
            written: false,
            v: CL_VERSION,
          };
        }
        throw err;
      }
      const card = toCard(stamp, { pipe: src.input && src.input.pipe });
      if (!card || cardBytes(card) > CARD_CAP) {
        return { ok: false, refuse: "card-cap", cap: CARD_CAP, v: CL_VERSION };
      }
      record = stamp;
    }
    const nextSeq = seq + 1;
    await this._put("e:" + nextSeq, record);
    const nextMeta = { seq: nextSeq, tip: tipOf(record, genesis) };
    if (record && record.lattice && record.lattice.primary) {
      nextMeta.lt = { primary: record.lattice.primary, secondary: record.lattice.secondary };
      if (record.lattice.offline === true) await this._put("off:" + record.lattice.secondary, nextSeq);
    } else if (meta.lt) {
      nextMeta.lt = meta.lt;
    }
    await this._put("meta", nextMeta);
    if (capCommit) await capCommit();
    // AZRT-GOAL-LINK-1.0: a refusal (or follow) stamp that names a goal key leaves a pointer
    // so the agent's next action on the same goal, through any tool, can link back to it.
    const goalKey = src.input && typeof src.input.goal_key === "string" ? src.input.goal_key : "";
    if (goalKey && record && (record.k === "refusal" || record.k === "follow")) {
      await this._put("goal:" + goalKey, { seq: nextSeq, h: record.stamp_sha256, k: record.k, t: record.t, open: record.k === "refusal" });
    }
    const ack = { ok: true, record, seq: nextSeq, prev: prev || genesis, replayed: false };
    if (idempKey) await this._put("idemp:" + idempKey, { ...ack, replayed: true });
    return ack;
  }

  /**
   * Dual-lattice rows after a given primary tip, selected inside the object so
   * the caller does not pull the whole chain (AZ-OS tether). since = "" or
   * genesis returns every lattice row. A since that is not on this chain is a fork.
   */
  async latticeSince(since) {
    const meta = await this._meta();
    const genesis = "0".repeat(64);
    const want = since && since !== genesis ? String(since) : "";
    if (meta.lt && want && want === meta.lt.primary) {
      return { ok: true, lt: meta.lt, rows: [], current: true, fork: false };
    }
    const rows = await this._rows();
    const out = [];
    let found = !want;
    rows.forEach((row, i) => {
      const lat = row && row.lattice;
      if (!lat || !lat.primary) return;
      if (found) out.push({ ...lat, seq: i });
      else if (lat.primary === want) found = true;
    });
    const lt = latticeTips(rows);
    return {
      ok: true,
      lt: lt.count ? { primary: lt.primary, secondary: lt.secondary } : null,
      rows: found ? out : [],
      current: false,
      fork: !found,
    };
  }

  /** AZRT-ANCHOR-1.0: tip metadata without pulling every row. */
  async metaView() {
    const meta = await this._meta();
    return { ok: true, seq: Number(meta.seq) || 0, tip: meta.tip || null, lt: meta.lt || null };
  }

  /** One row by 1-based seq (anchor / auditor checks). */
  async rowAt(seq) {
    const n = Math.floor(Number(seq));
    if (!Number.isFinite(n) || n < 1) return { ok: false, refuse: "bad-seq" };
    const row = await this._get("e:" + n);
    return row ? { ok: true, seq: n, row } : { ok: false, refuse: "no-row", seq: n };
  }

  /** LEDGER-ROWS-1.0: up to `limit` rows from 1-based `from`, read inside the object. */
  async rowsFrom(from, limit) {
    const a = Math.floor(Number(from));
    const n = Math.min(Math.max(Math.floor(Number(limit)) || 0, 1), 100);
    if (!Number.isFinite(a) || a < 1) return { ok: false, refuse: "bad-from" };
    const meta = await this._meta();
    const seq = Number(meta.seq) || 0;
    const rows = [];
    for (let i = a; i <= Math.min(seq, a + n - 1); i++) {
      const row = await this._get("e:" + i);
      if (!row) return { ok: false, refuse: "no-row", seq: i };
      rows.push({ seq: i, row });
    }
    return { ok: true, from: a, seq, rows };
  }

  /** LATTICE-DOC-UNIQUE-1.0 claim (only used on the "__docindex__" object). */
  async docClaim(body) {
    // Atomic: claims on this object run one at a time (read-then-write under one lock).
    return this._docLocked(() => this._docClaim(body));
  }
  _docLocked(fn) {
    const run = (this._docQueue || Promise.resolve()).then(fn, fn);
    this._docQueue = run.catch(() => {});
    return run;
  }
  /** DOC-WRITERS-1.0: every (caller|chain) that claimed a document, in first-seen order. */
  async _registerWriter(owner) {
    if (!owner || (await this._get("writer:" + owner))) return;
    const list = (await this._get("writers")) || [];
    list.push(owner);
    await this._put("writers", list);
    await this._put("writer:" + owner, list.length);
  }
  async docWriters(cursor, limit) {
    const list = (await this._get("writers")) || [];
    const from = Math.max(0, Math.floor(Number(cursor)) || 0);
    const n = Math.min(Math.max(Math.floor(Number(limit)) || 0, 1), 500);
    const page = list.slice(from, from + n).map((o) => {
      const i = o.lastIndexOf("|");
      return { caller: o.slice(0, i), chain: o.slice(i + 1) };
    });
    return { ok: true, writers: page, cursor: from, next_cursor: from + page.length, done: from + page.length >= list.length, total: list.length };
  }
  async _docClaim(body) {
    const doc = String((body && body.doc) || "");
    const owner = String((body && body.owner) || "");
    const idemp = String((body && body.idemp) || "");
    if (!/^[0-9a-f]{64}$/.test(doc)) return { ok: false, refuse: "lattice-doc-index", code: "LATTICE-DOC-INDEX-UNAVAILABLE" };
    const hit = await this._get("claim:" + doc);
    if (!hit) {
      await this._put("claim:" + doc, { owner, idemp });
      await this._registerWriter(owner);
      return { ok: true, fresh: true };
    }
    if (hit.owner === owner && idemp && hit.idemp === idemp) {
      await this._registerWriter(owner);
      return { ok: true, fresh: false };
    }
    return { ok: false, refuse: "lattice-double", code: hit.owner === owner ? "LATTICE-DOUBLE" : "LATTICE-DOUBLE-CROSS" };
  }

  async docRelease(body) {
    return this._docLocked(() => this._docRelease(body));
  }
  async _docRelease(body) {
    const doc = String((body && body.doc) || "");
    const hit = doc ? await this._get("claim:" + doc) : null;
    if (hit && hit.owner === String((body && body.owner) || "") && this.ctx.storage && typeof this.ctx.storage.delete === "function") {
      await this.ctx.storage.delete("claim:" + doc);
      return { ok: true, released: true };
    }
    return { ok: true, released: false };
  }

  async goalGet(key) {
    const hit = key ? await this._get("goal:" + String(key)) : null;
    return { ok: true, pointer: hit || null };
  }

  async dump() {
    return { ok: true, rows: await this._rows(), meta: await this._meta() };
  }

  async replace(body) {
    const rows = Array.isArray(body && body.rows) ? body.rows : [];
    if (this.ctx.storage && typeof this.ctx.storage.deleteAll === "function") {
      await this.ctx.storage.deleteAll();
    } else {
      const meta = await this._meta();
      for (let i = 1; i <= (meta.seq || 0); i++) {
        if (typeof this.ctx.storage.delete === "function") await this.ctx.storage.delete("e:" + i);
      }
    }
    for (let i = 0; i < rows.length; i++) {
      await this._put("e:" + (i + 1), rows[i]);
    }
    const last = rows[rows.length - 1];
    const lt = latticeTips(rows);
    const meta = { seq: rows.length, tip: tipOf(last, "") };
    if (lt.count) meta.lt = { primary: lt.primary, secondary: lt.secondary };
    for (const secondary of offlineSecondaries(rows)) await this._put("off:" + secondary, 1);
    await this._put("meta", meta);
    return { ok: true, n: rows.length };
  }

  async reset() {
    if (this.ctx.storage && typeof this.ctx.storage.deleteAll === "function") {
      await this.ctx.storage.deleteAll();
    } else {
      const meta = await this._meta();
      for (let i = 1; i <= (meta.seq || 0); i++) {
        if (typeof this.ctx.storage.delete === "function") await this.ctx.storage.delete("e:" + i);
      }
      if (typeof this.ctx.storage.delete === "function") await this.ctx.storage.delete("meta");
    }
    return { ok: true };
  }

  async kvGet(key) {
    const bag = (await this._get("kv")) || {};
    return { ok: true, value: Object.prototype.hasOwnProperty.call(bag, key) ? bag[key] : null };
  }

  async kvPut(key, value) {
    const bag = (await this._get("kv")) || {};
    bag[key] = value;
    await this._put("kv", bag);
    return { ok: true };
  }

  async kvKeys(prefix) {
    const bag = (await this._get("kv")) || {};
    const p = String(prefix || "");
    return { ok: true, keys: Object.keys(bag).filter((k) => k.startsWith(p)) };
  }

  async fetch(request) {
    try {
      const url = new URL(request.url);
      const action = url.pathname.replace(/^\//, "") || "dump";
      if (action === "append" && request.method === "POST") {
        return json(await this.append(await readJson(request)));
      }
      if (action === "lattice" && request.method === "GET") {
        return json(await this.latticeSince(url.searchParams.get("since") || ""));
      }
      if (action === "meta" && request.method === "GET") {
        return json(await this.metaView());
      }
      if (action === "floor" && request.method === "POST") {
        return json(await this.statsFloor(await readJson(request)));
      }
      if (action === "row" && request.method === "GET") {
        return json(await this.rowAt(url.searchParams.get("seq")));
      }
      if (action === "rows" && request.method === "GET") {
        return json(await this.rowsFrom(url.searchParams.get("from"), url.searchParams.get("limit")));
      }
      if (action === "writers" && request.method === "GET") {
        return json(await this.docWriters(url.searchParams.get("cursor"), url.searchParams.get("limit")));
      }
      if (action === "claim" && request.method === "POST") {
        return json(await this.docClaim(await readJson(request)));
      }
      if (action === "release" && request.method === "POST") {
        return json(await this.docRelease(await readJson(request)));
      }
      if (action === "goal" && request.method === "GET") {
        return json(await this.goalGet(url.searchParams.get("key") || ""));
      }
      if (action === "dump" && request.method === "GET") {
        return json(await this.dump());
      }
      if (action === "replace" && request.method === "POST") {
        return json(await this.replace(await readJson(request)));
      }
      if (action === "reset" && request.method === "POST") {
        return json(await this.reset());
      }
      if (action === "kv" && request.method === "GET") {
        return json(await this.kvGet(url.searchParams.get("key") || ""));
      }
      if (action === "kv" && request.method === "POST") {
        const body = await readJson(request);
        return json(await this.kvPut(body.key, body.value));
      }
      if (action === "keys" && request.method === "GET") {
        return json(await this.kvKeys(url.searchParams.get("prefix") || ""));
      }
      return json({ error: "unknown chain writer action", action }, 404);
    } catch (err) {
      const status = err && err.status ? err.status : 500;
      return json({ error: err && err.message ? err.message : String(err) }, status);
    }
  }
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
    deleteAll: async () => {
      store.clear();
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
    append: (body) => obj.append(body),
    dump: () => obj.dump(),
  };
}

/** In-memory Durable Object namespace for tests (same contract as CHAINLOCK). */
export function memoryChainWriterNamespace(env = {}, shared = new Map()) {
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
      objects.set(key, serializeObject(new ChainWriter({ storage: memoryStorage(store) }, env)));
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
