/**
 * Streamable HTTP transport for POST /mcp.
 *
 * Issues and echoes Mcp-Session-Id + MCP-Protocol-Version.
 * Invalid protocol versions are HTTP 400. DELETE tears down a session;
 * reuse of that id is HTTP 404. No fake SSE. No invented OAuth IdP.
 *
 * Author: Aziel Eliab only. NO-LIE / NO-REWRITE.
 */

export const MCP_PROTOCOL_PREFERRED = "2025-11-25";
export const MCP_PROTOCOL_LEGACY = "2025-03-26";
export const MCP_PROTOCOL_SUPPORTED = Object.freeze(["2025-11-25", "2025-06-18", "2025-03-26"]);
export const MCP_SESSION_HEADER = "Mcp-Session-Id";
export const MCP_PROTOCOL_HEADER = "MCP-Protocol-Version";
export const MCP_SESSION_TTL_MS = 6 * 60 * 60 * 1000;
const KV_PREFIX = "mcp|sid|";

/** In-isolate map. USES KV is the durable copy when bound. */
const memorySessions = new Map();

export function isSupportedProtocolVersion(raw) {
  const v = String(raw || "").trim();
  return MCP_PROTOCOL_SUPPORTED.includes(v);
}

export function negotiateProtocolVersion(requested) {
  const v = String(requested || "").trim();
  if (!v) {
    return { ok: true, version: MCP_PROTOCOL_PREFERRED, source: "default" };
  }
  if (!isSupportedProtocolVersion(v)) {
    return {
      ok: false,
      error: "unsupported MCP-Protocol-Version",
      requested: v,
      supported: MCP_PROTOCOL_SUPPORTED.slice(),
    };
  }
  return { ok: true, version: v, source: "client" };
}

export function readMcpProtocolHeader(request) {
  const headers = request && request.headers;
  if (!headers || typeof headers.get !== "function") return "";
  return String(headers.get(MCP_PROTOCOL_HEADER) || headers.get("mcp-protocol-version") || "").trim();
}

export function readMcpSessionHeader(request) {
  const headers = request && request.headers;
  if (!headers || typeof headers.get !== "function") return "";
  return String(headers.get(MCP_SESSION_HEADER) || headers.get("mcp-session-id") || "").trim();
}

export function mcpTransportHeaders(sessionId, protocolVersion) {
  const headers = {
    [MCP_SESSION_HEADER]: String(sessionId || ""),
    [MCP_PROTOCOL_HEADER]: String(protocolVersion || MCP_PROTOCOL_PREFERRED),
  };
  if (!headers[MCP_SESSION_HEADER]) delete headers[MCP_SESSION_HEADER];
  return headers;
}

export function newMcpSessionId() {
  if (globalThis.crypto && typeof globalThis.crypto.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }
  const bytes = new Uint8Array(16);
  if (globalThis.crypto && typeof globalThis.crypto.getRandomValues === "function") {
    globalThis.crypto.getRandomValues(bytes);
  }
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

function sessionRecord(rec) {
  return {
    id: rec.id,
    protocolVersion: rec.protocolVersion || MCP_PROTOCOL_PREFERRED,
    created: rec.created || Date.now(),
    dead: rec.dead === true,
  };
}

function usesKv(env) {
  const kv = env && env.USES;
  if (!kv || typeof kv.get !== "function" || typeof kv.put !== "function") return null;
  return kv;
}

export async function putMcpSession(env, rec) {
  const row = sessionRecord(rec);
  memorySessions.set(row.id, row);
  const kv = usesKv(env);
  if (kv) {
    await kv.put(KV_PREFIX + row.id, JSON.stringify(row), { expirationTtl: Math.floor(MCP_SESSION_TTL_MS / 1000) });
  }
  return row;
}

export async function getMcpSession(env, id) {
  const key = String(id || "").trim();
  if (!key) return null;
  if (memorySessions.has(key)) return memorySessions.get(key);
  const kv = usesKv(env);
  if (kv) {
    try {
      const raw = await kv.get(KV_PREFIX + key);
      if (raw) {
        const row = sessionRecord({ ...JSON.parse(raw), id: key });
        memorySessions.set(key, row);
        return row;
      }
    } catch {
      return null;
    }
  }
  return null;
}

export async function closeMcpSession(env, id) {
  const key = String(id || "").trim();
  if (!key) return { ok: false, status: 400, error: "Mcp-Session-Id required" };
  const existing = await getMcpSession(env, key);
  if (!existing || existing.dead) {
    return { ok: false, status: 404, error: "MCP session not found" };
  }
  await putMcpSession(env, { ...existing, dead: true });
  return { ok: true, status: 204, sessionId: key, protocolVersion: existing.protocolVersion };
}

/**
 * Admit a POST /mcp request.
 * Invalid protocol → HTTP 400.
 * Presented unknown/dead session → HTTP 404.
 * Missing session mints a new one (initialize and first POST) so headers are always echoed.
 */
export async function admitMcpPost(request, env, { method, requestedProtocol } = {}) {
  const headerProtocol = readMcpProtocolHeader(request);
  if (headerProtocol && !isSupportedProtocolVersion(headerProtocol)) {
    return {
      ok: false,
      status: 400,
      error: "unsupported MCP-Protocol-Version",
      requested: headerProtocol,
      supported: MCP_PROTOCOL_SUPPORTED.slice(),
    };
  }
  const negotiated = negotiateProtocolVersion(requestedProtocol || headerProtocol);
  if (!negotiated.ok) {
    return {
      ok: false,
      status: 400,
      error: negotiated.error,
      requested: negotiated.requested,
      supported: negotiated.supported,
    };
  }

  const presented = readMcpSessionHeader(request);
  if (presented) {
    const existing = await getMcpSession(env, presented);
    if (!existing || existing.dead) {
      return { ok: false, status: 404, error: "MCP session not found", sessionId: presented };
    }
    const version = requestedProtocol ? negotiated.version : existing.protocolVersion || negotiated.version;
    const rec = await putMcpSession(env, { ...existing, protocolVersion: version, dead: false });
    return { ok: true, sessionId: rec.id, protocolVersion: rec.protocolVersion, resumed: true };
  }

  if (method && method !== "initialize") {
    const rec = await putMcpSession(env, {
      id: newMcpSessionId(),
      protocolVersion: negotiated.version,
    });
    return { ok: true, sessionId: rec.id, protocolVersion: rec.protocolVersion, minted: true };
  }

  const rec = await putMcpSession(env, {
    id: newMcpSessionId(),
    protocolVersion: negotiated.version,
  });
  return { ok: true, sessionId: rec.id, protocolVersion: rec.protocolVersion, minted: true };
}
