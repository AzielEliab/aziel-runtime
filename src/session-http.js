/**
 * HTTP + MCP adapter for the session object.
 * Records intent, invokes via the Worker proxy path, then appends a runtime-owned receipt.
 * Author: Aziel Eliab.
 */

import { digestText, newSessionId, SESSION_ID_RE } from "./session-core.js";
import { RUNTIME_VERSION } from "./runtime-api.js";

function sessionStub(env, id) {
  if (!env || !env.SESSION) return null;
  if (typeof env.SESSION.getByName === "function") {
    return env.SESSION.getByName(id);
  }
  const nid = env.SESSION.idFromName(id);
  return env.SESSION.get(nid);
}

async function stubFetch(env, id, path, init) {
  const stub = sessionStub(env, id);
  if (!stub) {
    return new Response(
      JSON.stringify({
        error: "SESSION Durable Object binding missing",
        code: "session_binding_missing",
        hint: "Deploy with [[durable_objects.bindings]] name=SESSION class_name=RuntimeSession (migration tag v1). Local tests should pass env.SESSION.",
      }),
      { status: 503, headers: { "Content-Type": "application/json; charset=utf-8" } },
    );
  }
  return stub.fetch(new Request("https://session/" + path.replace(/^\//, ""), init));
}

async function copyJson(res, json) {
  let body;
  try {
    body = await res.json();
  } catch {
    body = { error: "session object returned non-JSON", status: res.status };
  }
  return json(body, res.status);
}

function payloadTextOf(payload) {
  if (payload === undefined) return "{}";
  if (typeof payload === "string") return payload;
  return JSON.stringify(payload);
}

export async function handleSessionRequest(request, env, deps) {
  const { json, PRODUCTS, BY_SLUG, upstreamFetch, extra } = deps;
  const url = new URL(request.url);
  const path = url.pathname;

  if (path === "/v1/session/open" && request.method === "POST") {
    let body = {};
    try {
      const text = await request.text();
      body = text && text.trim() ? JSON.parse(text) : {};
    } catch {
      return json({ error: "invalid JSON", code: "bad_json" }, 400);
    }
    const id = SESSION_ID_RE.test(String(body.id || "")) ? body.id : newSessionId();
    const res = await stubFetch(env, id, "open", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        id,
        version: RUNTIME_VERSION,
        source: body.source || "worker",
        now: new Date().toISOString(),
      }),
    });
    return copyJson(res, json);
  }

  const m = path.match(/^\/v1\/session\/(sess_[a-f0-9]{32})(?:\/([a-z]+))?$/i);
  if (!m) {
    return json(
      {
        error: "not a session route",
        hint: "POST /v1/session/open  POST /v1/session/{id}/policy  POST /v1/session/{id}/exec  GET /v1/session/{id}/receipt  GET /v1/session/{id}/receipts  POST /v1/session/{id}/close",
      },
      404,
      extra ? extra(path) : {},
    );
  }

  const id = m[1];
  const action = (m[2] || "status").toLowerCase();

  if (action === "status" && request.method === "GET") {
    return copyJson(await stubFetch(env, id, "status", { method: "GET" }), json);
  }
  if (action === "policy" && request.method === "POST") {
    let body = {};
    try {
      const text = await request.text();
      body = text && text.trim() ? JSON.parse(text) : {};
    } catch {
      return json({ error: "invalid JSON", code: "bad_json" }, 400);
    }
    return copyJson(
      await stubFetch(env, id, "policy", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      }),
      json,
    );
  }
  if ((action === "receipt" || action === "receipts") && request.method === "GET") {
    return copyJson(await stubFetch(env, id, action, { method: "GET" }), json);
  }
  if (action === "close" && request.method === "POST") {
    return copyJson(await stubFetch(env, id, "close", { method: "POST" }), json);
  }
  if (action === "exec" && request.method === "POST") {
    return handleExec(request, env, id, { json, PRODUCTS, BY_SLUG, upstreamFetch });
  }

  return json({ error: "unknown session action", action, session_id: id }, 404);
}

async function handleExec(request, env, id, { json, PRODUCTS, BY_SLUG, upstreamFetch }) {
  let body = {};
  try {
    const text = await request.text();
    body = text && text.trim() ? JSON.parse(text) : {};
  } catch {
    return json({ error: "invalid JSON", code: "bad_json" }, 400);
  }
  const slug = String(body.slug || body.product || "").trim().toLowerCase();
  const op = String(body.op || "").trim();
  const payload = body.payload !== undefined ? body.payload : {};
  const product = BY_SLUG[slug];
  const known = new Set(PRODUCTS.map((p) => p.slug));
  const payloadText = payloadTextOf(payload);

  const intentRes = await stubFetch(env, id, "intent", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      slug,
      op,
      payload,
      payload_text: payloadText,
      known_slugs: [...known],
      banner: product ? product.banner : null,
    }),
  });
  if (!intentRes.ok) {
    return copyJson(intentRes, json);
  }
  const intentBody = await intentRes.json();
  const intent = intentBody.intent;

  const spec = product && product.ops ? product.ops.find((o) => o.op === op) : null;
  const method = spec && spec.method === "GET" ? "GET" : "POST";
  const started = Date.now();
  let status = 502;
  let responseText = "";
  let upstream = null;
  let error = null;
  let contentType = null;
  try {
    const init = {
      method,
      headers: { "content-type": "application/json", accept: "application/json" },
    };
    if (method !== "GET") init.body = payloadText;
    const out = await upstreamFetch(env, product, `/v1/${op}`, init);
    upstream = out.target;
    status = out.res.status;
    contentType = out.res.headers.get("content-type");
    responseText = await out.res.text();
  } catch (err) {
    error = String(err && err.message ? err.message : err);
    status = 502;
  }
  const latencyMs = Date.now() - started;
  const reqDig = await digestText(payloadText);
  const resDig = await digestText(responseText);

  const commitRes = await stubFetch(env, id, "commit", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      intent,
      status,
      latency_ms: latencyMs,
      request_digest: reqDig.sha256,
      response_digest: resDig.sha256,
      response_bytes: resDig.bytes,
      content_type: contentType,
      error,
      upstream,
    }),
  });
  const commitBody = await commitRes.json();
  return json(
    {
      ...commitBody,
      exec: {
        slug,
        op,
        status,
        latency_ms: latencyMs,
        upstream,
        error,
        response_digest: resDig.sha256,
        response_bytes: resDig.bytes,
        note: "Proxy without this session receipt is not exec. This receipt is owned by aziel-runtime.",
      },
    },
    commitRes.status,
  );
}

export function sessionMcpTools() {
  return [
    {
      name: "runtime_session_open",
      description:
        "Open an aziel-runtime session (id, policy defaults, empty receipt chain). This is the runtime object. Proxy /p/{slug}/{op} is not exec.",
      inputSchema: { type: "object", additionalProperties: true },
    },
    {
      name: "runtime_session_policy",
      description:
        "Attach allow rules on a session: allow_slugs, allow_ops, max_payload_bytes, kv_increment (still no download KV), lamb_banners. Identity remains Aziel Eliab.",
      inputSchema: {
        type: "object",
        additionalProperties: true,
        properties: {
          session_id: { type: "string" },
          allow_slugs: { type: "array", items: { type: "string" } },
          allow_ops: { type: "array", items: { type: "string" } },
          max_payload_bytes: { type: "integer" },
          kv_increment: { type: "boolean" },
        },
        required: ["session_id"],
      },
    },
    {
      name: "runtime_session_exec",
      description:
        "Runtime-owned exec: record intent, invoke product via service binding/public URL, append a hash-chained receipt. Body: session_id, slug, op, payload. Not the same as proxy /p/{slug}/{op}.",
      inputSchema: {
        type: "object",
        additionalProperties: true,
        properties: {
          session_id: { type: "string" },
          slug: { type: "string" },
          op: { type: "string" },
          payload: { type: "object" },
        },
        required: ["session_id", "slug", "op"],
      },
    },
    {
      name: "runtime_session_receipt",
      description: "Read the last runtime-owned receipt for a session. Verifiable hash chain.",
      inputSchema: {
        type: "object",
        additionalProperties: true,
        properties: { session_id: { type: "string" } },
        required: ["session_id"],
      },
    },
    {
      name: "runtime_session_receipts",
      description: "Read the full hash-chained receipt list for a session.",
      inputSchema: {
        type: "object",
        additionalProperties: true,
        properties: { session_id: { type: "string" } },
        required: ["session_id"],
      },
    },
    {
      name: "runtime_session_close",
      description: "Seal a session. Further exec/policy is rejected (409).",
      inputSchema: {
        type: "object",
        additionalProperties: true,
        properties: { session_id: { type: "string" } },
        required: ["session_id"],
      },
    },
  ];
}

export async function callSessionTool(env, name, args, origin, deps) {
  const base = (origin || "https://aziel-runtime.vibelock.workers.dev").replace(/\/$/, "");
  const sid = args && (args.session_id || args.id);
  if (name === "runtime_session_open") {
    const req = new Request(base + "/v1/session/open", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(args && typeof args === "object" ? args : {}),
    });
    const res = await handleSessionRequest(req, env, deps);
    return { status: res.status, text: await res.text(), target: base + "/v1/session/open" };
  }
  if (!sid) throw new Error("session_id required");
  const map = {
    runtime_session_policy: { method: "POST", path: `/v1/session/${sid}/policy` },
    runtime_session_exec: { method: "POST", path: `/v1/session/${sid}/exec` },
    runtime_session_receipt: { method: "GET", path: `/v1/session/${sid}/receipt` },
    runtime_session_receipts: { method: "GET", path: `/v1/session/${sid}/receipts` },
    runtime_session_close: { method: "POST", path: `/v1/session/${sid}/close` },
  };
  const spec = map[name];
  if (!spec) return null;
  const body = { ...(args || {}) };
  delete body.session_id;
  delete body.id;
  const init = { method: spec.method, headers: { "content-type": "application/json" } };
  if (spec.method === "POST") init.body = JSON.stringify(body);
  const req = new Request(base + spec.path, init);
  const res = await handleSessionRequest(req, env, deps);
  return { status: res.status, text: await res.text(), target: base + spec.path };
}
