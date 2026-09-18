/**
 * TunnelHub — serialized AZVPN concentrator state.
 *
 * One Durable Object (name "azvpn") holds session-scoped tunnel records,
 * peer routing table, ciphertext inboxes, and receipts. DO input gate
 * serializes like ChainWriter. Local tests use memoryTunnelNamespace.
 *
 * Author: Aziel Eliab. Identity is Aziel Eliab only.
 */

const TUNNEL_CAP = 32;
const INBOX_CAP = 32;
const RECEIPT_CAP = 64;
const ENVELOPE_CAP = 8 * 1024;
const TTL_MS = 6 * 60 * 60 * 1000;

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

function emptyState() {
  return { tunnels: {}, inboxes: {}, receipts: [], seq: 0 };
}

function nowMs() {
  return Date.now();
}

export class TunnelHub {
  constructor(ctx, env) {
    this.ctx = ctx;
    this.env = env;
  }

  async load() {
    return (await this.ctx.storage.get("state")) || emptyState();
  }

  async save(state) {
    await this.ctx.storage.put("state", state);
  }

  prune(state) {
    const now = nowMs();
    for (const [id, row] of Object.entries(state.tunnels)) {
      if (!row) continue;
      if (row.closed || (row.expires_at_ms && row.expires_at_ms <= now)) {
        row.closed = true;
        row.state = "closed";
      }
    }
    return state;
  }

  async snapshot() {
    const state = this.prune(await this.load());
    const open = Object.values(state.tunnels).filter((t) => t && !t.closed);
    return {
      ok: true,
      store: "durable_object",
      open_count: open.length,
      tunnel_cap: TUNNEL_CAP,
      inbox_cap: INBOX_CAP,
      receipt_count: state.receipts.length,
    };
  }

  async mutate(fn) {
    const state = this.prune(await this.load());
    const out = await fn(state);
    await this.save(state);
    return out;
  }

  async fetch(request) {
    let body;
    try {
      body = await readJson(request);
    } catch (err) {
      return json({ ok: false, error: err.message || "bad_json" }, err.status || 400);
    }
    const op = String(body.op || "").trim();
    try {
      if (op === "snapshot") return json(await this.snapshot());
      if (op === "load") return json({ ok: true, state: this.prune(await this.load()) });
      if (op === "save" && body.state) {
        await this.save(body.state);
        return json({ ok: true });
      }
      if (op === "mutate" && typeof body.state === "object") {
        await this.save(body.state);
        return json({ ok: true });
      }
      return json({ ok: false, error: "unknown_op", op }, 400);
    } catch (err) {
      return json({ ok: false, error: err && err.message ? err.message : String(err) }, 500);
    }
  }
}

export function memoryTunnelNamespace() {
  const objects = new Map();
  return {
    idFromName(name) {
      return { name: String(name || "azvpn"), toString() { return String(name || "azvpn"); } };
    },
    get(id) {
      const key = String(id && id.name ? id.name : id || "azvpn");
      if (!objects.has(key)) {
        const storage = new Map();
        const stub = new TunnelHub(
          {
            storage: {
              get: async (k) => storage.get(k),
              put: async (k, v) => {
                storage.set(k, v);
              },
            },
          },
          {},
        );
        objects.set(key, stub);
      }
      return objects.get(key);
    },
    getByName(name) {
      return this.get(this.idFromName(name));
    },
  };
}

export { TUNNEL_CAP, INBOX_CAP, RECEIPT_CAP, ENVELOPE_CAP, TTL_MS };
