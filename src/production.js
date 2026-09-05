/**
 * aziel-runtime 1.4.1 production gates — ready, token, rate-limit, TTL, receipt cap.
 * 1.5.0 keeps these gates unchanged.
 * Session mutate only. Catalog / health / runtime / skill / pull stay public.
 * Author: Aziel Eliab. Identity is Aziel Eliab only.
 */

export const RECEIPT_CAP = 64;
export const SESSION_TTL_MS = 6 * 60 * 60 * 1000;
export const RATE_WINDOW_MS = 60_000;
export const RATE_OPEN_PER_MIN = 20;
export const RATE_EXEC_PER_MIN = 60;

export const TOKEN_HEADER = "X-Aziel-Runtime-Token";
export const VERSION_HEADER = "X-Aziel-Runtime-Version";
export const ROLE_HEADER = "X-Aziel-Runtime-Role";

export function authorityHeaders(version, role) {
  return {
    [VERSION_HEADER]: String(version),
    [ROLE_HEADER]: String(role),
  };
}

export function noStoreHeaders() {
  return {
    "Cache-Control": "no-store",
    "CDN-Cache-Control": "no-store",
  };
}

export function sessionExpiresAt(session) {
  if (!session || !session.opened_at) return null;
  const opened = Date.parse(session.opened_at);
  if (!Number.isFinite(opened)) return null;
  return new Date(opened + SESSION_TTL_MS).toISOString();
}

export function isSessionExpired(session, now = new Date()) {
  if (!session || !session.opened_at) return false;
  const opened = Date.parse(session.opened_at);
  if (!Number.isFinite(opened)) return false;
  const t = typeof now === "string" ? Date.parse(now) : now instanceof Date ? now.getTime() : Number(now);
  if (!Number.isFinite(t)) return false;
  return t - opened >= SESSION_TTL_MS;
}

export function receiptCapReached(session) {
  return ((session && session.receipts) || []).length >= RECEIPT_CAP;
}

export function tokenSecret(env) {
  const raw = env && env.RUNTIME_TOKEN;
  if (raw == null) return "";
  return String(raw).trim();
}

export function requireTokenFlag(env) {
  const v = env && env.REQUIRE_TOKEN;
  if (v === 1 || v === true) return true;
  const s = String(v == null ? "" : v)
    .trim()
    .toLowerCase();
  return s === "1" || s === "true" || s === "yes";
}

export function tokenConfigured(env) {
  return tokenSecret(env).length > 0;
}

export function tokenGateState(env) {
  const require_token = requireTokenFlag(env);
  const token_configured = tokenConfigured(env);
  return {
    require_token,
    token_configured,
    ready_blocked: require_token && !token_configured,
    mutate_requires_token: token_configured,
    mutate_blocked: require_token && !token_configured,
  };
}

export function sessionBindingUp(env) {
  return Boolean(
    env &&
      env.SESSION &&
      (typeof env.SESSION.getByName === "function" || typeof env.SESSION.idFromName === "function"),
  );
}

export function evaluateReady(env) {
  const gate = tokenGateState(env);
  const session_binding = sessionBindingUp(env);
  if (!session_binding) {
    return {
      ok: false,
      status: 503,
      session_binding: false,
      require_token: gate.require_token,
      token_configured: gate.token_configured,
      code: "session_binding_missing",
      error: "SESSION Durable Object binding missing",
      hint: "Deploy with [[durable_objects.bindings]] name=SESSION class_name=RuntimeSession (migration tag v1).",
    };
  }
  if (gate.ready_blocked) {
    return {
      ok: false,
      status: 503,
      session_binding: true,
      require_token: true,
      token_configured: false,
      code: "token_not_configured",
      error: "REQUIRE_TOKEN=1 but RUNTIME_TOKEN secret is missing",
      hint: "npx wrangler secret put RUNTIME_TOKEN",
    };
  }
  return {
    ok: true,
    status: 200,
    session_binding: true,
    require_token: gate.require_token,
    token_configured: gate.token_configured,
    code: null,
    error: null,
    hint: null,
  };
}

export function extractRuntimeToken(request) {
  if (!request || !request.headers) return "";
  const named = request.headers.get(TOKEN_HEADER) || request.headers.get("x-aziel-runtime-token");
  if (named && String(named).trim()) return String(named).trim();
  const auth = request.headers.get("Authorization") || request.headers.get("authorization") || "";
  const m = String(auth).match(/^Bearer\s+(\S+)/i);
  return m ? m[1].trim() : "";
}

/** Constant-time string compare. Empty presented token never matches. */
export function timingSafeEqualString(a, b) {
  const left = String(a ?? "");
  const right = String(b ?? "");
  const enc = new TextEncoder();
  const lb = enc.encode(left);
  const rb = enc.encode(right);
  const len = Math.max(lb.length, rb.length, 1);
  const padL = new Uint8Array(len);
  const padR = new Uint8Array(len);
  padL.set(lb);
  padR.set(rb);
  let diff = lb.length ^ rb.length;
  for (let i = 0; i < len; i++) diff |= padL[i] ^ padR[i];
  return diff === 0 && left.length > 0 && right.length > 0;
}

export function sessionMutateAuth(request, env) {
  const gate = tokenGateState(env);
  if (gate.mutate_blocked) {
    return {
      ok: false,
      status: 503,
      body: {
        ok: false,
        error: "REQUIRE_TOKEN=1 but RUNTIME_TOKEN secret is missing",
        code: "token_not_configured",
        hint: "npx wrangler secret put RUNTIME_TOKEN",
      },
    };
  }
  if (!gate.mutate_requires_token) {
    return { ok: true };
  }
  const presented = extractRuntimeToken(request);
  if (!presented) {
    return {
      ok: false,
      status: 401,
      body: {
        ok: false,
        error: "runtime token required",
        code: "token_required",
        hint: "Authorization: Bearer … or X-Aziel-Runtime-Token",
      },
    };
  }
  if (!timingSafeEqualString(presented, tokenSecret(env))) {
    return {
      ok: false,
      status: 401,
      body: {
        ok: false,
        error: "runtime token mismatch",
        code: "token_mismatch",
      },
    };
  }
  return { ok: true };
}

export function clientIp(request) {
  if (!request || !request.headers) return "local";
  const cf = request.headers.get("CF-Connecting-IP") || request.headers.get("cf-connecting-ip");
  if (cf && cf.trim()) return cf.trim();
  const xff = request.headers.get("X-Forwarded-For") || request.headers.get("x-forwarded-for");
  if (xff && xff.trim()) return xff.split(",")[0].trim();
  return "local";
}

function rateStore(env) {
  if (!env || typeof env !== "object") {
    throw new Error("rate limiter requires env object");
  }
  if (!env.__aziel_rate) {
    env.__aziel_rate = { open: new Map(), exec: new Map() };
  }
  return env.__aziel_rate;
}

export function takeRateSlot(env, bucket, key, limit, now = Date.now()) {
  const store = rateStore(env);
  if (!store[bucket]) store[bucket] = new Map();
  const map = store[bucket];
  const t = typeof now === "number" ? now : Date.now();
  const times = (map.get(key) || []).filter((ts) => t - ts < RATE_WINDOW_MS);
  if (times.length >= limit) {
    const oldest = times[0];
    const retryAfter = Math.max(1, Math.ceil((RATE_WINDOW_MS - (t - oldest)) / 1000));
    return {
      ok: false,
      limit,
      remaining: 0,
      count: times.length,
      retry_after: retryAfter,
      window_seconds: Math.round(RATE_WINDOW_MS / 1000),
    };
  }
  times.push(t);
  map.set(key, times);
  return {
    ok: true,
    limit,
    remaining: limit - times.length,
    count: times.length,
    retry_after: 0,
    window_seconds: Math.round(RATE_WINDOW_MS / 1000),
  };
}

export function rateLimitDecision(env, request, kind, now = Date.now()) {
  const ip = clientIp(request);
  if (kind === "open") {
    const slot = takeRateSlot(env, "open", ip, RATE_OPEN_PER_MIN, now);
    return { ...slot, scope: "session_open", ip };
  }
  if (kind === "exec") {
    const slot = takeRateSlot(env, "exec", ip, RATE_EXEC_PER_MIN, now);
    return { ...slot, scope: "session_exec", ip };
  }
  return { ok: true, scope: kind, ip, limit: 0, remaining: 0, count: 0, retry_after: 0, window_seconds: 60 };
}

export function rateLimitFailBody(decision) {
  return {
    ok: false,
    error: "rate limit exceeded",
    code: "rate_limited",
    scope: decision.scope,
    limit: decision.limit,
    window_seconds: decision.window_seconds,
    retry_after: decision.retry_after,
  };
}

export function rateLimitFailHeaders(decision) {
  return {
    "Retry-After": String(decision.retry_after || 1),
    "X-RateLimit-Limit": String(decision.limit),
    "X-RateLimit-Remaining": "0",
  };
}

export function isSessionMutatePath(pathname, method) {
  const path = String(pathname || "");
  const m = String(method || "").toUpperCase();
  if (path === "/v1/session/open" && m === "POST") return true;
  const hit = path.match(/^\/v1\/session\/sess_[a-f0-9]{32}\/(policy|exec|close)$/i);
  return Boolean(hit && m === "POST");
}

export function copyTokenHeaders(fromRequest, headers = {}) {
  const out = { ...headers };
  if (!fromRequest || !fromRequest.headers) return out;
  const named = fromRequest.headers.get(TOKEN_HEADER) || fromRequest.headers.get("x-aziel-runtime-token");
  if (named) out[TOKEN_HEADER] = named;
  const auth = fromRequest.headers.get("Authorization") || fromRequest.headers.get("authorization");
  if (auth) out.Authorization = auth;
  return out;
}
