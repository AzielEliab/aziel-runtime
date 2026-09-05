/**
 * Stdio MCP transport for Glama / local clients.
 *
 * Default: bridge JSON-RPC to the hosted Worker POST /mcp so tool lists
 * stay in one place. --local / AZIEL_RUNTIME_MCP=local runs the same
 * Worker fetch handler in-process (vendored engines, no network).
 *
 * Stdout is MCP only (newline-delimited JSON-RPC, official SDK shape).
 * Logs go to stderr. Author: Aziel Eliab. Identity is Aziel Eliab only.
 */

export const DEFAULT_RUNTIME_URL = "https://aziel-runtime.vibelock.workers.dev";
export const DEFAULT_UA = "Mozilla/5.0";
export const PROTOCOL = "2025-03-26";

const PARSE_ERROR = -32700;
const INVALID_REQUEST = -32600;
const INTERNAL_ERROR = -32603;
const UPSTREAM_ERROR = -32000;

export function runtimeToken(env = process.env) {
  const token = env.AZIEL_RUNTIME_TOKEN || env.RUNTIME_TOKEN;
  return token ? String(token) : "";
}

export function isLocalMode(flags = {}, env = process.env) {
  if (flags.local) return true;
  const v = String(env.AZIEL_RUNTIME_MCP || "").trim().toLowerCase();
  return v === "local" || v === "offline";
}

export function resolveRuntimeUrl(flags = {}, env = process.env) {
  const raw = (flags.url || env.AZIEL_RUNTIME_URL || DEFAULT_RUNTIME_URL).trim();
  return raw.replace(/\/$/, "");
}

export function parseCliArgs(argv) {
  const flags = {};
  const rest = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--local") flags.local = true;
    else if (a === "--help" || a === "-h") flags.help = true;
    else if (a === "--url") flags.url = argv[++i];
    else if (a === "--token") flags.token = argv[++i];
    else if (a.startsWith("--")) flags[a.slice(2)] = argv[++i] ?? true;
    else rest.push(a);
  }
  return { flags, rest };
}

export function usage() {
  return `aziel-runtime-mcp — stdio MCP (Aziel Eliab)

Glama and Claude Desktop need a stdio process. This CLI speaks MCP
JSON-RPC on stdin/stdout and bridges to the hosted Worker by default.

Usage:
  node cli/mcp-stdio.mjs
  node cli/mcp-stdio.mjs --local
  node cli/mcp-stdio.mjs --url https://aziel-runtime.vibelock.workers.dev

Env:
  AZIEL_RUNTIME_URL                 Worker origin (default ${DEFAULT_RUNTIME_URL})
  AZIEL_RUNTIME_MCP=local           same as --local (in-process Worker /mcp)
  RUNTIME_TOKEN / AZIEL_RUNTIME_TOKEN   optional; sent as Bearer + X-Aziel-Runtime-Token
`;
}

export function serializeMessage(message) {
  return JSON.stringify(message) + "\n";
}

export function rpcError(id, code, message, data) {
  const error = { code, message };
  if (data !== undefined) error.data = data;
  return { jsonrpc: "2.0", id: id === undefined ? null : id, error };
}

export function isNotification(message) {
  return !message || message.id === undefined;
}

/**
 * Buffer stdin chunks into discrete JSON-RPC messages.
 * Accepts official newline-delimited JSON and LSP Content-Length framing.
 */
export class ReadBuffer {
  constructor() {
    this._buf = Buffer.alloc(0);
  }

  append(chunk) {
    const add = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    this._buf = this._buf.length ? Buffer.concat([this._buf, add]) : add;
  }

  readMessage() {
    this._trimLeadingSpace();
    if (!this._buf.length) return null;
    const peek = this._buf.toString("utf8", 0, Math.min(this._buf.length, 48)).toLowerCase();
    if (peek.startsWith("content-length:")) return this._readContentLength();
    return this._readNdjson();
  }

  _trimLeadingSpace() {
    let i = 0;
    while (i < this._buf.length) {
      const c = this._buf[i];
      if (c === 0x20 || c === 0x09 || c === 0x0d || c === 0x0a) i++;
      else break;
    }
    if (i) this._buf = this._buf.subarray(i);
  }

  _readNdjson() {
    const idx = this._buf.indexOf(0x0a);
    if (idx === -1) return null;
    const line = this._buf.toString("utf8", 0, idx).replace(/\r$/, "");
    this._buf = this._buf.subarray(idx + 1);
    if (!line.trim()) return this.readMessage();
    return JSON.parse(line);
  }

  _readContentLength() {
    const ascii = this._buf.toString("utf8");
    let sep = ascii.indexOf("\r\n\r\n");
    let sepLen = 4;
    if (sep === -1) {
      sep = ascii.indexOf("\n\n");
      sepLen = 2;
    }
    if (sep === -1) return null;
    const headers = ascii.slice(0, sep);
    const match = headers.match(/content-length:\s*(\d+)/i);
    if (!match) throw new SyntaxError("Content-Length header missing");
    const len = Number(match[1]);
    const bodyStart = sep + sepLen;
    if (this._buf.length < bodyStart + len) return null;
    const body = this._buf.subarray(bodyStart, bodyStart + len).toString("utf8");
    this._buf = this._buf.subarray(bodyStart + len);
    return JSON.parse(body);
  }
}

export function mcpRequestHeaders(ctx) {
  const headers = {
    "User-Agent": DEFAULT_UA,
    "Content-Type": "application/json",
    Accept: "application/json",
  };
  if (ctx.token) {
    headers.Authorization = `Bearer ${ctx.token}`;
    headers["X-Aziel-Runtime-Token"] = ctx.token;
  }
  if (ctx.protocolVersion) headers["MCP-Protocol-Version"] = ctx.protocolVersion;
  if (ctx.sessionId) headers["mcp-session-id"] = ctx.sessionId;
  return headers;
}

export function createBridgeContext(options = {}, env = process.env) {
  const flags = options.flags || {};
  const token = options.token != null ? String(options.token) : flags.token || runtimeToken(env);
  return {
    local: isLocalMode(flags, env),
    url: resolveRuntimeUrl(flags, env),
    token: token || "",
    protocolVersion: options.protocolVersion || PROTOCOL,
    sessionId: options.sessionId || "",
    timeoutMs: Number(options.timeoutMs || env.AZIEL_RUNTIME_MCP_TIMEOUT_MS || 30000),
    log: options.log || ((line) => process.stderr.write(String(line) + "\n")),
    fetchImpl: options.fetchImpl || globalThis.fetch.bind(globalThis),
    localSend: options.localSend || null,
  };
}

function rememberSession(res, ctx) {
  if (!res || typeof res.headers?.get !== "function") return;
  const sid = res.headers.get("mcp-session-id");
  if (sid) ctx.sessionId = sid;
  const pv = res.headers.get("MCP-Protocol-Version") || res.headers.get("mcp-protocol-version");
  if (pv) ctx.protocolVersion = pv;
}

function rememberFromMessage(message, ctx) {
  if (message && message.method === "initialize" && message.params && message.params.protocolVersion) {
    ctx.protocolVersion = String(message.params.protocolVersion);
  }
}

function rememberFromRpc(body, ctx) {
  if (body && body.result && body.result.protocolVersion) {
    ctx.protocolVersion = String(body.result.protocolVersion);
  }
}

export async function responseToRpc(res, message, ctx) {
  rememberSession(res, ctx);
  if (!res) {
    if (isNotification(message)) return null;
    return rpcError(message && message.id, UPSTREAM_ERROR, "Upstream MCP returned no response");
  }
  if (res.status === 204 || res.status === 202) return null;
  let text = "";
  try {
    text = await res.text();
  } catch (err) {
    if (isNotification(message)) return null;
    return rpcError(message && message.id, UPSTREAM_ERROR, `Upstream read failed: ${err.message || err}`);
  }
  if (!String(text).trim()) {
    if (isNotification(message) || res.ok) return null;
    return rpcError(message && message.id, UPSTREAM_ERROR, `Upstream HTTP ${res.status}`);
  }
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    if (isNotification(message)) return null;
    return rpcError(message && message.id, UPSTREAM_ERROR, `Upstream returned non-JSON (HTTP ${res.status})`, {
      snippet: String(text).slice(0, 200),
    });
  }
  rememberFromRpc(body, ctx);
  if (body && typeof body === "object" && (body.jsonrpc || "result" in body || "error" in body)) {
    return body;
  }
  if (!res.ok) {
    if (isNotification(message)) return null;
    const msg = (body && (body.error || body.message)) || `Upstream HTTP ${res.status}`;
    return rpcError(message && message.id, UPSTREAM_ERROR, String(msg));
  }
  return body;
}

export async function sendBridgeHttp(message, ctx) {
  const url = ctx.url.replace(/\/$/, "") + "/mcp";
  const headers = mcpRequestHeaders(ctx);
  return ctx.fetchImpl(url, {
    method: "POST",
    headers,
    body: JSON.stringify(message),
    signal: AbortSignal.timeout(ctx.timeoutMs),
  });
}

export async function createLocalSend() {
  const { default: worker } = await import("./index.js");
  const { memorySessionNamespace } = await import("./session-do.js");
  const env = { SESSION: memorySessionNamespace({}) };
  const token = runtimeToken();
  if (token) env.RUNTIME_TOKEN = token;
  if (process.env.REQUIRE_TOKEN) env.REQUIRE_TOKEN = process.env.REQUIRE_TOKEN;
  const origin = DEFAULT_RUNTIME_URL;
  return async function localSend(message, ctx) {
    const headers = mcpRequestHeaders(ctx);
    return worker.fetch(
      new Request(origin + "/mcp", {
        method: "POST",
        headers,
        body: JSON.stringify(message),
      }),
      env,
    );
  };
}

export async function dispatchMcp(message, ctx) {
  if (!message || typeof message !== "object" || Array.isArray(message)) {
    return rpcError(null, INVALID_REQUEST, "Invalid Request");
  }
  rememberFromMessage(message, ctx);
  let res;
  try {
    if (ctx.local) {
      if (!ctx.localSend) ctx.localSend = await createLocalSend();
      res = await ctx.localSend(message, ctx);
    } else {
      res = await sendBridgeHttp(message, ctx);
    }
  } catch (err) {
    if (isNotification(message)) return null;
    return rpcError(message.id, UPSTREAM_ERROR, `Upstream MCP failed: ${err && err.message ? err.message : err}`);
  }
  return responseToRpc(res, message, ctx);
}

export function parseIncoming(raw) {
  try {
    return { message: JSON.parse(raw) };
  } catch (err) {
    return { error: rpcError(null, PARSE_ERROR, "Parse error", { detail: String(err.message || err) }) };
  }
}

/**
 * Run the stdio loop. stdout = MCP messages only.
 */
export async function runStdioLoop(options = {}) {
  const ctx = options.ctx || createBridgeContext(options);
  const input = options.stdin || process.stdin;
  const output = options.stdout || process.stdout;
  const buf = new ReadBuffer();
  let queue = Promise.resolve();

  function write(msg) {
    if (!msg) return;
    output.write(serializeMessage(msg));
  }

  async function handleOne(message) {
    try {
      write(await dispatchMcp(message, ctx));
    } catch (err) {
      if (!isNotification(message)) {
        write(rpcError(message && message.id, INTERNAL_ERROR, String(err && err.message ? err.message : err)));
      }
    }
  }

  function enqueue(fn) {
    queue = queue.then(fn, fn);
    return queue;
  }

  function drain() {
    return enqueue(async () => {
      for (;;) {
        let message;
        try {
          message = buf.readMessage();
        } catch (err) {
          write(rpcError(null, PARSE_ERROR, "Parse error", { detail: String(err.message || err) }));
          continue;
        }
        if (!message) break;
        await handleOne(message);
      }
    });
  }

  if (typeof input.setEncoding === "function") {
    /* binary — ReadBuffer wants bytes */
  }
  input.on("data", (chunk) => {
    buf.append(chunk);
    drain();
  });

  await new Promise((resolve) => {
    input.on("end", resolve);
    input.on("close", resolve);
    if (input.readableEnded) resolve();
  });
  await queue;
}
