/**
 * F03 — inbound body / depth / deadline gates (FragGate HTTP + MCP + other POST).
 * Honest refuse codes from MASTER-ARCHITECTURE-2.0: RATE_LIMIT, BODY_TOO_LARGE,
 * plus BODY_TOO_DEEP and REQUEST_DEADLINE. Not a second door.
 * Author: Aziel Eliab. Identity is Aziel Eliab only.
 */

export const MAX_BODY_BYTES = 256 * 1024;
export const MAX_JSON_DEPTH = 12;
export const MAX_JSON_NODES = 4096;
export const REQUEST_DEADLINE_MS = 25_000;

export const CODE_RATE_LIMIT = "RATE_LIMIT";
export const CODE_BODY_TOO_LARGE = "BODY_TOO_LARGE";
export const CODE_BODY_TOO_DEEP = "BODY_TOO_DEEP";
export const CODE_REQUEST_DEADLINE = "REQUEST_DEADLINE";

const BODY_METHODS = new Set(["POST", "PUT", "PATCH"]);

export function requestDeadlineMs(env) {
  const raw = env && env.REQUEST_DEADLINE_MS;
  const n = Number(raw);
  if (Number.isFinite(n) && n >= 1 && n <= 60_000) return Math.floor(n);
  return REQUEST_DEADLINE_MS;
}

export function deadlineExceeded(startedAt, now, budgetMs) {
  const start = Number(startedAt);
  const t = Number(now);
  const budget = Number(budgetMs);
  if (!Number.isFinite(start) || !Number.isFinite(t) || !Number.isFinite(budget)) return false;
  return t - start >= budget;
}

function meshRoute(pathname) {
  const path = String(pathname || "").replace(/\/+$/, "").toLowerCase() || "/";
  if (path === "/v1/fedmesh" || path.startsWith("/v1/fedmesh/")) {
    return "/v1/mesh/relay" + path.slice("/v1/fedmesh".length);
  }
  return path;
}

export function requestLimitKind(pathname, method) {
  const path = meshRoute(pathname);
  const m = String(method || "").toUpperCase();
  if (path === "/mcp") {
    return m === "POST" || m === "DELETE" ? "mcp" : null;
  }
  if (path === "/v1/fraggate" || path.startsWith("/v1/fraggate/")) {
    if (path === "/v1/fraggate/call" && m === "POST") return "fraggate_call";
    return "fraggate_read";
  }
  // Seal on this path can dispatch a live FragGate op. Bill it as a call, not a read.
  if (path === "/v1/interface" && m === "POST") return "fraggate_call";
  if (path === "/v1/author-shelf" && m === "GET") return "fraggate_read";
  if (
    m === "POST" &&
    (path === "/v1/mesh/join" ||
      path === "/v1/mesh/heartbeat" ||
      path === "/v1/mesh/broadcast" ||
      path === "/v1/mesh/leave" ||
      path === "/v1/mesh/site-presence" ||
      path === "/v1/mesh/site-heartbeat" ||
      path === "/v1/mesh/relay/register" ||
      path === "/v1/mesh/relay/heartbeat" ||
      path === "/v1/mesh/relay/leave" ||
      path === "/v1/mesh/relay/post" ||
      path === "/v1/mesh/relay/pull" ||
      path === "/v1/mesh/relay/deliver" ||
      path === "/v1/mesh/relay/forward" ||
      path === "/v1/mesh/relay/peers" ||
      path === "/v1/mesh/relay/bootstrap" ||
      path === "/v1/mesh/relay/rollup" ||
      path === "/v1/mesh/relay/remote-task" ||
      path === "/v1/mesh/relay/ref" ||
      path === "/v1/mesh/relay/sync" ||
      path === "/v1/mesh/relay/object" ||
      path === "/v1/mesh/relay/name" ||
      path === "/v1/mesh/relay/witness" ||
      path === "/v1/mesh/relay/equivocation" ||
      path === "/v1/mesh/relay/vouch" ||
      path === "/v1/mesh/relay/advisory" ||
      path === "/v1/mesh/relay/quarantine" ||
      path === "/v1/mesh/relay/island" ||
      path === "/v1/mesh/relay/airgap" ||
      path === "/v1/mesh/relay/restore" ||
      path === "/v1/mesh/relay/isolation" ||
      path === "/v1/mesh/relay/appeal")
  ) {
    return "mesh_mutate";
  }
  if (m === "POST" && path.startsWith("/v1/memory/")) {
    return "memory_mutate";
  }
  return null;
}

export function jsonStructureStats(value, maxDepth = MAX_JSON_DEPTH, maxNodes = MAX_JSON_NODES) {
  let nodes = 0;
  let depth = 0;
  function walk(v, d) {
    nodes += 1;
    if (nodes > maxNodes) return;
    if (v && typeof v === "object") {
      if (d > depth) depth = d;
      if (d > maxDepth) return;
      if (Array.isArray(v)) {
        for (const item of v) walk(item, d + 1);
      } else {
        for (const key of Object.keys(v)) walk(v[key], d + 1);
      }
    }
  }
  walk(value, 1);
  return { depth, nodes, too_deep: depth > maxDepth, too_wide: nodes > maxNodes };
}

export function bodyTooLargeRefuse(bytes, cap = MAX_BODY_BYTES) {
  return {
    ok: false,
    error: "request body exceeds size cap",
    code: CODE_BODY_TOO_LARGE,
    bytes,
    cap,
    hint: `Send at most ${cap} bytes before parse.`,
  };
}

export function bodyTooDeepRefuse(stats, cap = MAX_JSON_DEPTH) {
  return {
    ok: false,
    error: stats && stats.too_wide ? "request JSON exceeds node cap" : "request JSON exceeds depth cap",
    code: CODE_BODY_TOO_DEEP,
    depth: stats && stats.depth,
    nodes: stats && stats.nodes,
    cap,
    node_cap: MAX_JSON_NODES,
    reason: stats && stats.too_wide ? "nodes" : "depth",
  };
}

export function deadlineRefuse(budgetMs = REQUEST_DEADLINE_MS) {
  return {
    ok: false,
    error: "request deadline exceeded",
    code: CODE_REQUEST_DEADLINE,
    budget_ms: budgetMs,
  };
}

export function rateLimitRefuse(decision) {
  return {
    ok: false,
    error: "rate limit exceeded",
    code: CODE_RATE_LIMIT,
    scope: decision && decision.scope,
    limit: decision && decision.limit,
    window_seconds: decision && decision.window_seconds,
    retry_after: decision && decision.retry_after,
    enforcement: (decision && decision.enforcement) || "isolate",
  };
}

export function refuseStatus(code) {
  if (code === CODE_RATE_LIMIT) return 429;
  if (code === CODE_BODY_TOO_LARGE) return 413;
  if (code === CODE_REQUEST_DEADLINE) return 408;
  if (code === CODE_BODY_TOO_DEEP) return 400;
  return 400;
}

export function contentLengthOf(request) {
  if (!request || !request.headers) return null;
  const raw = request.headers.get("content-length") || request.headers.get("Content-Length");
  if (raw == null || raw === "") return null;
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

export async function readCappedBytes(request, maxBytes = MAX_BODY_BYTES) {
  const declared = contentLengthOf(request);
  if (declared != null && declared > maxBytes) {
    return { ok: false, refuse: bodyTooLargeRefuse(declared, maxBytes), bytes: null };
  }
  if (!request || typeof request.arrayBuffer !== "function") {
    return { ok: true, bytes: new Uint8Array(0).buffer, refuse: null };
  }
  const buf = await request.arrayBuffer();
  if (buf.byteLength > maxBytes) {
    return { ok: false, refuse: bodyTooLargeRefuse(buf.byteLength, maxBytes), bytes: null };
  }
  return { ok: true, bytes: buf, refuse: null };
}

export function rebuildRequest(request, bytes) {
  const method = String(request.method || "GET").toUpperCase();
  const init = { method, headers: request.headers };
  if (BODY_METHODS.has(method) && bytes && bytes.byteLength) {
    init.body = bytes;
  }
  return new Request(request.url, init);
}

export function parseJsonBytes(bytes) {
  if (!bytes || !bytes.byteLength) return { ok: true, value: {} };
  const text = new TextDecoder().decode(bytes);
  if (!text.trim()) return { ok: true, value: {} };
  try {
    return { ok: true, value: JSON.parse(text) };
  } catch {
    return { ok: false, error: "invalid JSON", code: "bad_json" };
  }
}

export async function withDeadline(work, budgetMs, onTimeout) {
  const budget = Number(budgetMs);
  if (!Number.isFinite(budget) || budget <= 0) return work;
  let timer = null;
  const timeout = new Promise((resolve) => {
    timer = setTimeout(() => resolve({ __deadline: true }), budget);
  });
  try {
    const raced = await Promise.race([
      Promise.resolve(work).then((value) => ({ __deadline: false, value })),
      timeout,
    ]);
    if (raced && raced.__deadline) return onTimeout();
    return raced.value;
  } finally {
    if (timer) clearTimeout(timer);
  }
}
