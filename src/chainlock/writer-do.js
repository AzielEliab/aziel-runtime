/**
 * ChainWriter — one Durable Object per chain (FragGate ledger or ChainLock).
 * Serialized by the DO input gate. Individual records. Commit before ack.
 * Local tests use memoryChainWriterNamespace (same fetch contract).
 * Author: Aziel Eliab. Identity is Aziel Eliab only.
 */

import { composeLedgerEntry } from "../fraggate/ledger.js";
import { CARD_CAP, CL_VERSION, GENESIS, cardBytes, composeChainlockStamp, toCard } from "./ops.js";
import { tipOf } from "./store.js";

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
      record = await composeLedgerEntry(src.input || {}, { seq: seq + 1, prev: prev || genesis });
      if (idempKey) record = { ...record, idemp: idempKey };
    } else {
      const stamp = await composeChainlockStamp(src.input || {}, { prev: prev || genesis });
      const card = toCard(stamp, { pipe: src.input && src.input.pipe });
      if (!card || cardBytes(card) > CARD_CAP) {
        return { ok: false, refuse: "card-cap", cap: CARD_CAP, v: CL_VERSION };
      }
      record = stamp;
    }
    const nextSeq = seq + 1;
    await this._put("e:" + nextSeq, record);
    await this._put("meta", { seq: nextSeq, tip: tipOf(record, genesis) });
    const ack = { ok: true, record, seq: nextSeq, prev: prev || genesis, replayed: false };
    if (idempKey) await this._put("idemp:" + idempKey, { ...ack, replayed: true });
    return ack;
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
    await this._put("meta", { seq: rows.length, tip: tipOf(last, "") });
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
