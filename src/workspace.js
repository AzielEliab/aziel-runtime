/**
 * Caller isolation / workspace contract (audit F02).
 *
 * Public-demo vs private-workspace. Same rules on HTTP, MCP, UI, and
 * runtime_session. confirm:true is NOT authentication. A client-supplied
 * owner / workspace_id / caller string is NOT authorization.
 *
 * Public FragGate call stays open on the shared public-demo singleton
 * (ephemeral, labeled, not isolated). Private AZHub / AZInterface state is
 * namespaced by a verified session or a verified operator token.
 *
 * Identity: Aziel Eliab only. Lamb Lens. NO-LIE. No invented OAuth IdP.
 */

import { SESSION_ID_RE, sha256Hex } from "./session-core.js";
import {
  extractRuntimeToken,
  sessionMutateAuth,
  tokenConfigured,
  tokenSecret,
  timingSafeEqualString,
} from "./production.js";

export const PUBLIC_DEMO_ID = "public-demo";
export const CONTRACT_PUBLIC_DEMO = "public-demo";
export const CONTRACT_PRIVATE = "private-workspace";
export const ENV_WORKSPACE_KEY = "__aziel_workspace";

export const WORKSPACE_SKIP_KEYS = Object.freeze([
  "workspace",
  "workspace_id",
  "owner",
  "caller",
  "isolation",
  "confirm",
  "dry_run",
]);

const PUBLIC_DEMO_NOTE =
  "Shared public-demo singleton. Ephemeral isolate memory. Not a private workspace. " +
  "Every unauthenticated HTTP / MCP / UI FragGate caller on this isolate sees the same demo state. " +
  "confirm:true is not authentication.";

const OPERATOR_NOTE =
  "Operator private workspace. Shared by every caller who presents the matching runtime token. " +
  "Isolated from public-demo. Bind a verified session_id for per-caller isolation. " +
  "confirm:true is not authentication.";

const SESSION_NOTE =
  "Session-scoped private workspace. Other sessions cannot read or write this state. " +
  "Isolated from public-demo and from the operator singleton. confirm:true is not authentication.";

export function publicDemoWorkspace() {
  return {
    contract: CONTRACT_PUBLIC_DEMO,
    workspace_id: PUBLIC_DEMO_ID,
    shared: true,
    isolated: false,
    isolated_from_public_demo: false,
    ephemeral: true,
    durable: false,
    auth: "none",
    confirm_is_not_auth: true,
    owner_string_is_not_auth: true,
    note: PUBLIC_DEMO_NOTE,
  };
}

export function operatorWorkspaceView(workspaceId) {
  return {
    contract: CONTRACT_PRIVATE,
    workspace_id: workspaceId,
    shared: true,
    isolated: false,
    isolated_from_public_demo: true,
    ephemeral: false,
    durable: false,
    auth: "runtime_token",
    confirm_is_not_auth: true,
    owner_string_is_not_auth: true,
    note: OPERATOR_NOTE,
  };
}

export function sessionWorkspaceView(sessionId) {
  return {
    contract: CONTRACT_PRIVATE,
    workspace_id: sessionWorkspaceId(sessionId),
    session_id: sessionId,
    shared: false,
    isolated: true,
    isolated_from_public_demo: true,
    ephemeral: false,
    durable: false,
    auth: "session",
    confirm_is_not_auth: true,
    owner_string_is_not_auth: true,
    note: SESSION_NOTE,
  };
}

export function sessionWorkspaceId(sessionId) {
  return `ws_${String(sessionId || "").trim()}`;
}

export async function operatorWorkspaceId(env) {
  const secret = tokenSecret(env);
  if (!secret) return "ws_operator";
  const hex = await sha256Hex(`aziel-runtime.operator-workspace|${secret}`);
  return `ws_operator_${hex.slice(0, 16)}`;
}

export function isolationView(env, workspace = null) {
  const ws = workspace || workspaceFromEnv(env) || publicDemoWorkspace();
  return {
    contract: ws.contract,
    workspace_id: ws.workspace_id,
    shared: ws.shared === true,
    isolated: ws.isolated === true,
    isolated_from_public_demo: ws.isolated_from_public_demo === true,
    ephemeral: ws.ephemeral === true,
    durable: ws.durable === true,
    auth: ws.auth || "none",
    confirm_is_not_auth: true,
    owner_string_is_not_auth: true,
    note: ws.note,
    ...(ws.session_id ? { session_id: ws.session_id } : {}),
  };
}

export function workspaceFromEnv(env) {
  if (!env || typeof env !== "object") return null;
  const ws = env[ENV_WORKSPACE_KEY];
  if (!ws || typeof ws !== "object") return null;
  return ws;
}

export function storeKeyOf(env) {
  const ws = workspaceFromEnv(env);
  const id = ws && ws.workspace_id ? String(ws.workspace_id).trim() : "";
  return id || PUBLIC_DEMO_ID;
}

export function attachWorkspace(env, workspace) {
  const proto = env && typeof env === "object" ? env : {};
  const target = Object.create(proto);
  target[ENV_WORKSPACE_KEY] = workspace || publicDemoWorkspace();
  return target;
}

export function claimedSessionId(args, { allowIdAlias = false } = {}) {
  const src = args && typeof args === "object" ? args : {};
  if (src.session_id != null && String(src.session_id).trim()) return String(src.session_id).trim();
  if (allowIdAlias && src.id != null && String(src.id).trim()) return String(src.id).trim();
  return "";
}

function authFail(auth) {
  return {
    ok: false,
    status: auth.status,
    code: auth.body && auth.body.code,
    error: auth.body && auth.body.error,
    hint: auth.body && auth.body.hint,
    body: auth.body,
  };
}

export async function sessionExists(env, sessionId) {
  if (!SESSION_ID_RE.test(String(sessionId || ""))) {
    return { bound: Boolean(env && env.SESSION), found: false, code: "bad_session_id" };
  }
  if (!env || !env.SESSION) return { bound: false, found: false };
  let stub = null;
  if (typeof env.SESSION.getByName === "function") {
    stub = env.SESSION.getByName(sessionId);
  } else if (typeof env.SESSION.idFromName === "function" && typeof env.SESSION.get === "function") {
    stub = env.SESSION.get(env.SESSION.idFromName(sessionId));
  }
  if (!stub || typeof stub.fetch !== "function") return { bound: false, found: false };
  const res = await stub.fetch(new Request("https://session/status", { method: "GET" }));
  if (res.status === 404) return { bound: true, found: false };
  if (!res.ok) return { bound: true, found: false, status: res.status };
  let body = null;
  try {
    body = await res.json();
  } catch {
    body = null;
  }
  const session = body && body.session;
  return {
    bound: true,
    found: Boolean(session && session.id),
    closed: Boolean(session && session.closed),
    session,
  };
}

function dummyMutateRequest(request) {
  if (request && request.headers) {
    return new Request("https://aziel-runtime.local/v1/session/open", {
      method: "POST",
      headers: request.headers,
    });
  }
  return new Request("https://aziel-runtime.local/v1/session/open", { method: "POST" });
}

/**
 * Resolve the caller workspace from request + env + optional session id.
 * Never trusts confirm, owner, workspace_id, or caller fields.
 */
export async function resolveCallerWorkspace({ request = null, env = null, sessionId = "" } = {}) {
  const claimed = String(sessionId || "").trim();
  if (claimed && !SESSION_ID_RE.test(claimed)) {
    return {
      ok: false,
      status: 400,
      code: "bad_session_id",
      error: "session id must match sess_ + 32 hex",
      body: {
        ok: false,
        error: "session id must match sess_ + 32 hex",
        code: "bad_session_id",
      },
    };
  }

  if (claimed) {
    const auth = sessionMutateAuth(dummyMutateRequest(request), env);
    if (!auth.ok) return authFail(auth);
    const exists = await sessionExists(env, claimed);
    if (!exists.bound) {
      return {
        ok: false,
        status: 503,
        code: "session_binding_missing",
        error: "SESSION Durable Object binding missing",
        body: {
          ok: false,
          error: "SESSION Durable Object binding missing",
          code: "session_binding_missing",
          hint: "Deploy with [[durable_objects.bindings]] name=SESSION class_name=RuntimeSession (migration tag v1).",
        },
      };
    }
    if (!exists.found) {
      return {
        ok: false,
        status: 404,
        code: "session_not_found",
        error: "session not found",
        body: { ok: false, error: "session not found", code: "session_not_found" },
      };
    }
    if (exists.closed) {
      return {
        ok: false,
        status: 409,
        code: "session_closed",
        error: "session is sealed",
        body: { ok: false, error: "session is sealed", code: "session_closed" },
      };
    }
    return { ok: true, workspace: sessionWorkspaceView(claimed) };
  }

  const presented = extractRuntimeToken(request);
  if (presented && tokenConfigured(env)) {
    if (!timingSafeEqualString(presented, tokenSecret(env))) {
      return {
        ok: false,
        status: 401,
        code: "token_mismatch",
        error: "runtime token mismatch",
        body: { ok: false, error: "runtime token mismatch", code: "token_mismatch" },
      };
    }
    return { ok: true, workspace: operatorWorkspaceView(await operatorWorkspaceId(env)) };
  }

  return { ok: true, workspace: publicDemoWorkspace() };
}

export function workspaceRefuseEnvelope(fail, extra = {}) {
  return {
    ok: false,
    code: fail.code || "WS-REFUSE",
    status: fail.status || 400,
    door: "fraggate",
    message: fail.error || "workspace isolation refused",
    result: null,
    isolation: isolationView(null, publicDemoWorkspace()),
    confirm_is_not_auth: true,
    ...(fail.hint ? { hint: fail.hint } : {}),
    ...(fail.body || {}),
    ...extra,
  };
}

export { SESSION_ID_RE };
