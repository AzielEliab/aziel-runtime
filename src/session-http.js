/**
 * HTTP + MCP adapter for the session object.
 * Records intent, runs a local engine when vendored, else explicit proxy_fallback.
 * Author: Aziel Eliab.
 */

import { digestText, newSessionId, SESSION_ID_RE } from "./session-core.js";
import { RUNTIME_VERSION } from "./runtime-api.js";
import { executeLocal, proxyFallbackMeta } from "./engines/runner.js";
import { attachExecDisplay } from "./display.js";
import { sessionIdProps, tdqsDescription, toolEnvelopeOutputSchema } from "./mcp-schema.js";
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
          "Write: creates a session with a 6h TTL and receipt cap 64. Re-open on an existing id returns already=true without resetting the chain. Expired sessions refuse session_expired (410). When REQUIRE_TOKEN=1, session mutate needs RUNTIME_TOKEN; missing SESSION binding returns session_binding_missing (503). Prefer leaving sessions to TTL expire. Not chainlock_seal",
        params:
          "Empty {} mints sess_ + 32 hex. Optional id is accepted only when it already matches that pattern; otherwise bad_session_id. source is open metadata (default worker)",
        returns: "session.id plus the first receipt in the display envelope",
      }),
      inputSchema: {
        type: "object",
        additionalProperties: true,
        description:
          "No required arguments. Empty {} mints a sess_ + 32 hex id. Extra keys may be stored as open metadata.",
        properties: {
          id: {
            type: "string",
            description:
              "Optional caller-chosen session id. Must already match sess_ + 32 lowercase hex or the open refuses bad_session_id. Omit to mint one.",
            pattern: "^sess_[a-f0-9]{32}$",
          },
          source: {
            type: "string",
            description: "Optional open metadata label. Default worker. Not a permission and not a catalog slug.",
          },
        },
      },
      outputSchema: toolEnvelopeOutputSchema(
        "Open body: session.id, receipts[0], already=true when the id already exists. Errors: bad_session_id, session_binding_missing, session_expired.",
      ),
    },
    {
      name: "runtime_session_policy",
      description: tdqsDescription({
        action: "Attach allow rules on an already-open raw session (allow_slugs / allow_ops). Policy overlay — not open and not exec. Identity remains Aziel Eliab",
        when: "an already-open session needs tighter allow_slugs / allow_ops before exec",
        notFor: "executing an op or opening a session",
        instead: "runtime_session_exec or runtime_session_open (prefer fraggate_call, which applies defaults)",
        effects:
          "Write: mutates session policy only. A sealed session refuses session_closed (409). Expired sessions refuse session_expired (410). Missing both session_id and id fails before the door runs. Does not exec and does not mint a new id",
        params:
          "session_id or id (aliases) required. allow_slugs / allow_ops replace the allow overlay when sent; omit them to leave the current lists. max_payload_bytes and kv_increment are optional overlays, not exec payload. Nested policy{} is accepted as the same overlay",
        returns: "updated session policy plus a policy receipt",
      }),
      inputSchema: {
        type: "object",
        additionalProperties: true,
        description:
          "session_id or id required. Other fields are optional policy overlays (also accepted nested under policy).",
        properties: {
          ...sessionIdProps("Required."),
          allow_slugs: {
            type: "array",
            items: { type: "string" },
            description: "Optional replacement allowlist of catalog slugs this session may exec. Omit to keep the current list.",
          },
          allow_ops: {
            type: "array",
            items: { type: "string" },
            description: "Optional replacement allowlist of ops this session may exec. Omit to keep the current list.",
          },
          max_payload_bytes: {
            type: "integer",
            minimum: 1,
            maximum: 1048576,
            description:
              "Optional max payload size in bytes for later exec (integer 1..1048576). Overlay only; not the exec body. Out of range refuses bad_policy.",
          },
          kv_increment: {
            type: "boolean",
            description: "Optional. When true, allow KV increment side effects on later exec. Not an increment itself.",
          },
        },
        required: ["session_id"],
      },
      outputSchema: toolEnvelopeOutputSchema(
        "Policy body: updated session allow lists and a policy receipt. Refuses session_id required, session_not_found, session_closed, session_expired.",
      ),
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
          "Side effects are operation-dependent (read, write, or refuse). Does not mint a session_id — missing id fails before admit. Sealed sessions refuse session_closed (409); TTL 6h refuses session_expired (410); receipt cap 64 refuses receipt_cap (409). Rate-limited (exec). Binding-only ops stay per-op proxy_fallback. Prefer fraggate_call",
        params:
          "session_id or id, plus slug and op, are required. payload is optional and engine-specific; leftover keys are not auto-payload the way fraggate_call leftover keys are. Unknown slugs refuse FG-HALLUC-TOOL; stubs refuse FG-STUB",
        returns: "exec result with engine_slug, engine_op, engine_digest, ran_in, receipt, and refusal when gated",
      }),
      inputSchema: {
        type: "object",
        additionalProperties: true,
        description:
          "session_id (or id), slug, and op are required. Extra keys besides payload are not treated as the op payload.",
        properties: {
          ...sessionIdProps("Required."),
          slug: {
            type: "string",
            description:
              "Required catalog slug to exec. Alias: product. Unknown slugs refuse FG-HALLUC-TOOL. This tool does not auto-open.",
          },
          product: {
            type: "string",
            description: "Alias of slug. Do not send two different values.",
          },
          op: {
            type: "string",
            description: "Required allowlisted op. Stubs refuse FG-STUB. UI aliases still forward only after FragGate admit.",
          },
          payload: {
            type: "object",
            additionalProperties: true,
            description:
              "Optional op payload object. Engine-specific. Unlike fraggate_call, leftover top-level keys are not used as payload.",
          },
        },
        required: ["session_id", "slug", "op"],
      },
      outputSchema: toolEnvelopeOutputSchema(
        "Exec body: session, receipt, engine_slug, engine_op, engine_digest, ran_in, refusal when gated. Errors: session_id required, session_closed, session_expired, receipt_cap, FG-HALLUC-TOOL, FG-STUB.",
      ),
    },
    {
      name: "runtime_session_receipt",
      description: tdqsDescription({
        action: "Read the last receipt only for a raw session — not the full chain",
        when: "the user asked for the latest receipt on an open or sealed session",
        notFor: "the full receipt chain or product output the user did not ask to audit",
        instead: "runtime_session_receipts (full chain) or the product display from fraggate_call",
        effects:
          "Does not mutate the session. Unknown id returns session_not_found. An empty receipt list returns receipt=null rather than inventing one. Prefer product output (display) unless the user asked for the chain",
        params: "session_id or id (aliases) required. No view/limit — this is always the last receipt plus a chain verified flag",
        returns: "the last receipt object (or null) and verified",
      }),
      inputSchema: {
        type: "object",
        additionalProperties: true,
        description: "session_id or id required. Extra keys are ignored.",
        properties: sessionIdProps("Required."),
        required: ["session_id"],
      },
      outputSchema: toolEnvelopeOutputSchema(
        "Last-receipt body: receipt (or null), verified chain flag, public session. Errors: session_id required, session_not_found.",
      ),
    },
    {
      name: "runtime_session_receipts",
      description: tdqsDescription({
        action: "Read the full receipt chain for a raw session — not the last receipt only",
        when: "the user asked for the whole receipt chain",
        notFor: "only the last receipt or ordinary product output",
        instead: "runtime_session_receipt or the product display from fraggate_call",
        effects:
          "Does not mutate the session. Unknown id returns session_not_found. List is the stored chain (cap 64), oldest to newest, plus verified. Prefer product output unless the user asked for the chain",
        params: "session_id or id (aliases) required. No pagination — the cap is the runtime receipt cap, not a cursor",
        returns: "the receipt list (capped at 64) and verified",
      }),
      inputSchema: {
        type: "object",
        additionalProperties: true,
        description: "session_id or id required. Extra keys are ignored. No cursor/limit.",
        properties: sessionIdProps("Required."),
        required: ["session_id"],
      },
      outputSchema: toolEnvelopeOutputSchema(
        "Receipt-chain body: receipts[] (cap 64), verified, public session. Errors: session_id required, session_not_found.",
      ),
    },
    {
      name: "runtime_session_close",
      description: tdqsDescription({
        action:
          "Seal a raw session so further exec or policy on that session_id is rejected. End of the raw lifecycle — not a LOCKSET seal and not a FragGate call",
        when: "the user asked to close the session",
        notFor: "ordinary completion, writing a ChainLock LOCKSET, or default product work",
        instead: "leaving the session to TTL expire (6h), chainlock_seal for a lockset, or fraggate_call for new work",
        effects:
          "Destructive to further exec/policy on that session_id only (session_closed 409). Does not delete receipts. A second close does not reopen — it returns session_closed (409) while the session stays sealed. Missing session returns session_not_found. Prefer leaving sessions to expire unless asked",
        params: "session_id or id (aliases) required. No force flag on the public tool — TTL expiry is the automatic close path",
        returns: "sealed session status, close receipt, and verified",
      }),
      inputSchema: {
        type: "object",
        additionalProperties: true,
        description: "session_id or id required. Extra keys are ignored. This is not chainlock_seal.",
        properties: sessionIdProps("Required."),
        required: ["session_id"],
      },
      outputSchema: toolEnvelopeOutputSchema(
        "Close body: sealed session, close receipt, verified. Errors: session_id required, session_not_found, session_closed (already sealed; does not reopen).",
      ),
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
