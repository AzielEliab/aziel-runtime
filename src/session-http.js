/**
 * HTTP + MCP adapter for the session object.
 * Records intent, runs a local engine when vendored, else explicit proxy_fallback.
 * Author: Aziel Eliab.
 */

import { digestText, newSessionId, SESSION_ID_RE } from "./session-core.js";
import { RUNTIME_VERSION } from "./runtime-api.js";
import { executeLocal, proxyFallbackMeta } from "./engines/runner.js";
import { attachExecDisplay } from "./display.js";
import { MCP_OUTPUT_SCHEMA, tdqsDescription } from "./mcp-schema.js";
import {
  copyTokenHeaders,
  isSessionMutatePath,
  rateLimitDecision,
  rateLimitFailBody,
  rateLimitFailHeaders,
  sessionMutateAuth,
} from "./production.js";

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

function gateSessionMutate(request, env, json) {
  const url = new URL(request.url);
  if (!isSessionMutatePath(url.pathname, request.method)) return null;
  const auth = sessionMutateAuth(request, env);
  if (!auth.ok) return json(auth.body, auth.status);
  const kind = url.pathname === "/v1/session/open" ? "open" : url.pathname.endsWith("/exec") ? "exec" : null;
  if (kind) {
    const decision = rateLimitDecision(env, request, kind);
    if (!decision.ok) {
      return json(rateLimitFailBody(decision), 429, rateLimitFailHeaders(decision));
    }
  }
  return null;
}

export async function handleSessionRequest(request, env, deps) {
  const { json, PRODUCTS, BY_SLUG, upstreamFetch, extra } = deps;
  const url = new URL(request.url);
  const path = url.pathname;

  const gated = gateSessionMutate(request, env, json);
  if (gated) return gated;

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
  const reqDig = await digestText(payloadText);

  let status = 502;
  let responseText = "";
  let upstream = null;
  let error = null;
  let contentType = "application/json; charset=utf-8";
  let latencyMs = 0;
  let engine = null;
  let parsedBody = null;

  const local = await executeLocal({ slug, op, payload, ranIn: "aziel-runtime", env });
  if (local && !local.unsupported) {
    status = local.status;
    responseText = local.responseText;
    error = local.error;
    contentType = local.content_type;
    latencyMs = local.latency_ms;
    engine = {
      mode: "local",
      true_engine_runtime: true,
      engine_digest: local.engine_digest,
      engine_slug: local.engine_slug,
      engine_op: local.engine_op,
      ran_in: local.ran_in,
    };
    try {
      parsedBody = JSON.parse(responseText);
    } catch {
      parsedBody = null;
    }
  } else {
    const started = Date.now();
    try {
      if (!product) {
        throw Object.assign(new Error(`no local engine and unknown product: ${slug}`), { status: 404 });
      }
      const init = {
        method,
        headers: { "content-type": "application/json", accept: "application/json" },
      };
      if (method !== "GET") init.body = payloadText;
      const out = await upstreamFetch(env, product, `/v1/${op}`, init);
      upstream = out.target;
      status = out.res.status;
      contentType = out.res.headers.get("content-type") || contentType;
      responseText = await out.res.text();
    } catch (err) {
      error = String(err && err.message ? err.message : err);
      status = err && err.status ? err.status : 502;
    }
    latencyMs = Date.now() - started;
    engine = proxyFallbackMeta({ slug, op, upstream, status, error });
  }

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
      upstream: engine && engine.mode === "local" ? null : upstream,
      engine,
    }),
  });
  const commitBody = await commitRes.json();
  const localNote =
    engine && engine.mode === "local"
      ? "Ran inside this Worker isolate. Receipt includes engine_digest of the loaded artifact."
      : "mode=proxy_fallback. Proxy without a session receipt is not exec. This receipt is owned by aziel-runtime.";
  const envelope = attachExecDisplay({
    product,
    slug,
    op,
    parsedBody,
    receipt: commitBody.receipt,
    session_id: id,
  });
  return json(
    {
      ...commitBody,
      display: envelope.display,
      result: parsedBody,
      exec: {
        slug,
        op,
        status,
        latency_ms: latencyMs,
        mode: engine && engine.mode,
        true_engine_runtime: engine && engine.true_engine_runtime === true,
        engine_digest: engine && engine.engine_digest,
        engine_slug: engine && engine.engine_slug,
        engine_op: engine && engine.engine_op,
        ran_in: engine && engine.ran_in,
        upstream: engine && engine.mode === "local" ? null : upstream,
        error,
        response_digest: resDig.sha256,
        response_bytes: resDig.bytes,
        result: parsedBody,
        note: localNote,
      },
    },
    commitRes.status,
  );
}

export function sessionMcpTools() {
  return [
    {
      name: "runtime_session_open",
      description: tdqsDescription({
        action: "Open a raw session object (session.id). First step of open → policy → exec → receipt(s) → close. Not the default exec path",
        when: "you were explicitly asked for raw session plumbing",
        notFor: "the default agent exec path or attaching policy to an existing id",
        instead: "fraggate_call (default) or runtime_session_policy (existing session_id)",
        effects:
          "Write: creates a session. Session plumbing stays invisible unless the user asked for the receipt chain. Prefer leaving sessions to TTL expire",
        returns: "session.id plus display envelope",
      }),
      inputSchema: {
        type: "object",
        additionalProperties: true,
        description: "No required arguments. Extra keys may be stored as open metadata. Prefer fraggate_call.",
        properties: {},
      },
      outputSchema: MCP_OUTPUT_SCHEMA,
    },
    {
      name: "runtime_session_policy",
      description: tdqsDescription({
        action: "Attach allow rules on an already-open raw session (allow_slugs / allow_ops). Policy overlay — not open and not exec. Identity remains Aziel Eliab",
        when: "an already-open session needs tighter allow_slugs / allow_ops before exec",
        notFor: "executing an op or opening a session",
        instead: "runtime_session_exec or runtime_session_open (prefer fraggate_call, which applies defaults)",
        effects: "Write: mutates session policy. Missing session_id fails",
        params: "session_id is required (alias id). allow_slugs, allow_ops, max_payload_bytes, and kv_increment are optional overlays",
        returns: "updated session policy",
      }),
      inputSchema: {
        type: "object",
        additionalProperties: true,
        description: "session_id is required. Other fields are optional policy overlays.",
        properties: {
          session_id: {
            type: "string",
            description: "Required raw session id from runtime_session_open. Alias: id.",
          },
          allow_slugs: {
            type: "array",
            items: { type: "string" },
            description: "Optional allowlist of catalog slugs this session may exec.",
          },
          allow_ops: {
            type: "array",
            items: { type: "string" },
            description: "Optional allowlist of ops this session may exec.",
          },
          max_payload_bytes: {
            type: "integer",
            description: "Optional max payload size in bytes for later exec.",
          },
          kv_increment: {
            type: "boolean",
            description: "Optional. When true, allow KV increment side effects on this session.",
          },
        },
        required: ["session_id"],
      },
      outputSchema: MCP_OUTPUT_SCHEMA,
    },
    {
      name: "runtime_session_exec",
      description: tdqsDescription({
        action:
          "Raw session exec on an already-open session_id (FragGate-admitted). Not fraggate_call and not runtime_run auto-open",
        when: "you already have a session_id and were asked for raw session exec",
        notFor: "the default agent exec path or opening a session",
        instead: "fraggate_call or runtime_session_open",
        effects:
          "Side effects are operation-dependent. Binding-only ops stay per-op proxy_fallback. Prefer fraggate_call",
        params: "session_id, slug, and op are required. payload is optional and engine-specific",
        returns: "exec result with engine_slug, engine_op, engine_digest, ran_in, receipt, and refusal when gated",
      }),
      inputSchema: {
        type: "object",
        additionalProperties: true,
        description: "session_id, slug, and op are required.",
        properties: {
          session_id: {
            type: "string",
            description: "Required open session id. Alias: id.",
          },
          slug: {
            type: "string",
            description: "Required catalog slug to exec. Unknown slugs refuse FG-HALLUC-TOOL.",
          },
          op: {
            type: "string",
            description: "Required allowlisted op. Stubs refuse FG-STUB.",
          },
          payload: {
            type: "object",
            additionalProperties: true,
            description: "Optional op payload object. Engine-specific.",
          },
        },
        required: ["session_id", "slug", "op"],
      },
      outputSchema: MCP_OUTPUT_SCHEMA,
    },
    {
      name: "runtime_session_receipt",
      description: tdqsDescription({
        action: "Read the last receipt only for a raw session — not the full chain",
        when: "the user asked for the latest receipt on an open or sealed session",
        notFor: "the full receipt chain or product output the user did not ask to audit",
        instead: "runtime_session_receipts (full chain) or the product display from fraggate_call",
        effects: "Prefer product output (display) unless the user asked for the chain",
        params: "session_id is required (alias id)",
        returns: "the last receipt object",
      }),
      inputSchema: {
        type: "object",
        additionalProperties: true,
        description: "session_id is required.",
        properties: {
          session_id: {
            type: "string",
            description: "Required session id whose last receipt to read. Alias: id.",
          },
        },
        required: ["session_id"],
      },
      outputSchema: MCP_OUTPUT_SCHEMA,
    },
    {
      name: "runtime_session_receipts",
      description: tdqsDescription({
        action: "Read the full receipt chain for a raw session — not the last receipt only",
        when: "the user asked for the whole receipt chain",
        notFor: "only the last receipt or ordinary product output",
        instead: "runtime_session_receipt or the product display from fraggate_call",
        effects: "Prefer product output unless the user asked for the chain. List is capped by the runtime receipt cap",
        params: "session_id is required (alias id)",
        returns: "the receipt list (capped by the runtime receipt cap)",
      }),
      inputSchema: {
        type: "object",
        additionalProperties: true,
        description: "session_id is required.",
        properties: {
          session_id: {
            type: "string",
            description: "Required session id whose receipt list to read. Alias: id.",
          },
        },
        required: ["session_id"],
      },
      outputSchema: MCP_OUTPUT_SCHEMA,
    },
    {
      name: "runtime_session_close",
      description: tdqsDescription({
        action: "Seal a raw session so further exec on that session_id is rejected. End of the raw lifecycle — not a FragGate call",
        when: "the user asked to close the session",
        notFor: "ordinary completion — prefer leaving sessions to expire",
        instead: "leaving the session to TTL expire, or fraggate_call for new work",
        effects:
          "Destructive to further exec on that session. Repeating close on an already-sealed id stays sealed. Prefer leaving sessions to expire unless asked",
        params: "session_id is required",
        returns: "sealed session status",
      }),
      inputSchema: {
        type: "object",
        additionalProperties: true,
        description: "session_id is required.",
        properties: {
          session_id: {
            type: "string",
            description: "Required session id to seal. Further exec on this id is rejected.",
          },
        },
        required: ["session_id"],
      },
      outputSchema: MCP_OUTPUT_SCHEMA,
    },
  ];
}

const SESSION_TOOL_NAMES = new Set([
  "runtime_session_open",
  "runtime_session_policy",
  "runtime_session_exec",
  "runtime_session_receipt",
  "runtime_session_receipts",
  "runtime_session_close",
]);

export async function callSessionTool(env, name, args, origin, deps) {
  if (!SESSION_TOOL_NAMES.has(name)) return null;
  const base = (origin || "https://aziel-runtime.vibelock.workers.dev").replace(/\/$/, "");
  const sid = args && (args.session_id || args.id);
  const tokenHeaders = copyTokenHeaders(deps && deps.request, {});
  if (args && args.runtime_token) tokenHeaders["X-Aziel-Runtime-Token"] = String(args.runtime_token);
  if (name === "runtime_session_open") {
    const req = new Request(base + "/v1/session/open", {
      method: "POST",
      headers: { "content-type": "application/json", ...tokenHeaders },
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
  const init = { method: spec.method, headers: { "content-type": "application/json", ...tokenHeaders } };
  if (spec.method === "POST") init.body = JSON.stringify(body);
  const req = new Request(base + spec.path, init);
  const res = await handleSessionRequest(req, env, deps);
  return { status: res.status, text: await res.text(), target: base + spec.path };
}
