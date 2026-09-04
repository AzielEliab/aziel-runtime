/**
 * One Durable Object per aziel-runtime session.
 * Storage is the session JSON + receipt chain. No product engine is loaded here.
 * Author: Aziel Eliab.
 */

import {
  applyClose,
  applyOpen,
  applyPolicy,
  commitExec,
  openSession,
  publicSession,
  recordIntent,
  SESSION_ID_RE,
  verifyChainStrict,
} from "./session-core.js";

function json(body, status = 200) {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}

function fail(err) {
  const status = err && err.status ? err.status : 500;
  return json(
    {
      error: err && err.message ? err.message : String(err),
      code: (err && err.code) || "session_error",
      ...(err && err.extra ? err.extra : {}),
    },
    status,
  );
}

async function readJson(request) {
  const text = await request.text();
  if (!text || !text.trim()) return {};
  try {
    return JSON.parse(text);
  } catch {
    const err = new Error("invalid JSON");
    err.status = 400;
    err.code = "bad_json";
    throw err;
  }
}

export class RuntimeSession {
  constructor(ctx, env) {
    this.ctx = ctx;
    this.env = env;
  }

  async load() {
    return (await this.ctx.storage.get("session")) || null;
  }

  async save(session) {
    await this.ctx.storage.put("session", session);
  }

  async fetch(request) {
    try {
      const url = new URL(request.url);
      const action = url.pathname.replace(/^\//, "") || "status";
      if (action === "open" && request.method === "POST") {
        return await this.open(await readJson(request));
      }
      if (action === "policy" && request.method === "POST") {
        return await this.policy(await readJson(request));
      }
      if (action === "intent" && request.method === "POST") {
        return await this.intent(await readJson(request));
      }
      if (action === "commit" && request.method === "POST") {
        return await this.commit(await readJson(request));
      }
      if (action === "receipt" && request.method === "GET") {
        return await this.receipt();
      }
      if (action === "receipts" && request.method === "GET") {
        return await this.receipts();
      }
      if (action === "close" && request.method === "POST") {
        return await this.close();
      }
      if ((action === "status" || action === "") && request.method === "GET") {
        return await this.status();
      }
      return json({ error: "unknown session action", action }, 404);
    } catch (err) {
      return fail(err);
    }
  }

  async open(body) {
    const existing = await this.load();
    if (existing) {
      return json({ ok: true, already: true, session: publicSession(existing), receipt: existing.receipts[0] || null });
    }
    const id = String(body.id || "");
    if (!SESSION_ID_RE.test(id)) {
      return json({ error: "session id must match sess_ + 32 hex", code: "bad_session_id" }, 400);
    }
    const now = body.now || new Date().toISOString();
    const session = openSession({
      id,
      now,
      version: body.version,
      source: body.source || "worker",
    });
    await applyOpen(session, now);
    await this.save(session);
    return json({ ok: true, session: publicSession(session), receipt: session.receipts[0] });
  }

  async policy(body) {
    const session = await this.load();
    const now = new Date().toISOString();
    const out = await applyPolicy(session, body && body.policy != null ? body.policy : body, now);
    await this.save(out.session);
    return json({ ok: true, session: publicSession(out.session), receipt: out.receipt });
  }

  async intent(body) {
    const session = await this.load();
    const now = new Date().toISOString();
    const known = body.known_slugs ? new Set(body.known_slugs) : null;
    const out = await recordIntent(
      session,
      {
        slug: body.slug,
        op: body.op,
        payload: body.payload,
        payloadText: body.payload_text,
        knownSlugs: known,
        banner: body.banner || null,
      },
      now,
    );
    await this.save(session);
    return json({ ok: true, session: publicSession(session), intent: out.intent });
  }

  async commit(body) {
    const session = await this.load();
    const now = new Date().toISOString();
    const receipt = await commitExec(
      session,
      {
        intent: body.intent,
        status: body.status,
        latencyMs: body.latency_ms,
        requestDigest: body.request_digest,
        responseDigest: body.response_digest,
        error: body.error || null,
        upstream: body.upstream || null,
        responseBytes: body.response_bytes,
        contentType: body.content_type,
      },
      now,
    );
    await this.save(session);
    return json({ ok: true, session: publicSession(session), receipt });
  }

  async receipt() {
    const session = await this.load();
    if (!session) return json({ error: "session not found", code: "session_not_found" }, 404);
    const last = session.receipts[session.receipts.length - 1] || null;
    const verified = await verifyChainStrict(session.receipts);
    return json({ ok: true, session: publicSession(session), receipt: last, verified });
  }

  async receipts() {
    const session = await this.load();
    if (!session) return json({ error: "session not found", code: "session_not_found" }, 404);
    const verified = await verifyChainStrict(session.receipts);
    return json({ ok: true, session: publicSession(session), receipts: session.receipts, verified });
  }

  async close() {
    const session = await this.load();
    const now = new Date().toISOString();
    const out = await applyClose(session, now);
    await this.save(out.session);
    const verified = await verifyChainStrict(out.session.receipts);
    return json({ ok: true, session: publicSession(out.session), receipt: out.receipt, verified });
  }

  async status() {
    const session = await this.load();
    if (!session) return json({ error: "session not found", code: "session_not_found" }, 404);
    return json({ ok: true, session: publicSession(session) });
  }
}

/** In-memory Durable Object namespace for tests (and CLI local HTTP adapter). */
export function memorySessionNamespace(env) {
  const objects = new Map();
  function idFromName(name) {
    const key = String(name);
    return { name: key, toString() { return key; } };
  }
  function get(id) {
    const key = String(id);
    if (!objects.has(key)) {
      const store = new Map();
      const storage = {
        get: async (k) => store.get(k),
        put: async (k, v) => {
          store.set(k, v);
        },
      };
      objects.set(key, new RuntimeSession({ storage }, env));
    }
    return objects.get(key);
  }
  return {
    idFromName,
    getByName(name) {
      return get(idFromName(name));
    },
    get,
  };
}
