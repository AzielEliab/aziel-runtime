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
    const doc = String((body && body.doc) || "");
    const owner = String((body && body.owner) || "");
    const idemp = String((body && body.idemp) || "");
    if (!/^[0-9a-f]{64}$/.test(doc)) return { ok: false, refuse: "lattice-doc-index", code: "LATTICE-DOC-INDEX-UNAVAILABLE" };
    const hit = await this._get("claim:" + doc);
    if (!hit) {
      await this._put("claim:" + doc, { owner, idemp });
      return { ok: true, fresh: true };
    }
    if (hit.owner === owner && idemp && hit.idemp === idemp) return { ok: true, fresh: false };
    return { ok: false, refuse: "lattice-double", code: hit.owner === owner ? "LATTICE-DOUBLE" : "LATTICE-DOUBLE-CROSS" };
  }

  async docRelease(body) {
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
      if (action === "row" && request.method === "GET") {
        return json(await this.rowAt(url.searchParams.get("seq")));
      }
      if (action === "rows" && request.method === "GET") {
        return json(await this.rowsFrom(url.searchParams.get("from"), url.searchParams.get("limit")));
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
