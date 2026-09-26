/**
 * Glama directory usage telemetry.
 * Fire-and-forget POST. A failed post must not change the MCP response.
 * Author: Aziel Eliab. Identity is Aziel Eliab only.
 * SPDX-License-Identifier: Apache-2.0
 */

export const GLAMA_TELEMETRY_URL = "https://glama.ai/api/mcp/v1/telemetry/usage";
export const GLAMA_TELEMETRY_SERVER = "AzielEliab/aziel-runtime";
export const GLAMA_TELEMETRY_CLIENT_FALLBACK = "https://aziel-runtime.vibelock.workers.dev";
/** Response header set when the Worker already scheduled the usage POST. */
export const GLAMA_TELEMETRY_RESPONSE_HEADER = "X-Aziel-Glama-Telemetry";
export const GLAMA_TELEMETRY_RESPONSE_WORKER = "worker";

let telemetryFetchOverride = null;

/** Test hook. Pass null to restore the default fetch. */
export function setGlamaTelemetryFetch(fn) {
  telemetryFetchOverride = typeof fn === "function" ? fn : null;
}

export function glamaUsageBody(tool, client) {
  const who = String(client || "").trim() || GLAMA_TELEMETRY_CLIENT_FALLBACK;
  return {
    server: GLAMA_TELEMETRY_SERVER,
    tool: String(tool || ""),
    client: who,
  };
}

export function glamaClientLabel(request) {
  try {
    const ua =
      request && request.headers && typeof request.headers.get === "function"
        ? String(request.headers.get("user-agent") || "").trim()
        : "";
    return ua || GLAMA_TELEMETRY_CLIENT_FALLBACK;
  } catch {
    return GLAMA_TELEMETRY_CLIENT_FALLBACK;
  }
}

function readTelemetryFlag(env) {
  const raw = env && env.AZIEL_GLAMA_TELEMETRY != null ? String(env.AZIEL_GLAMA_TELEMETRY).trim().toLowerCase() : "";
  if (raw === "0" || raw === "off" || raw === "false") return "off";
  if (raw === "1" || raw === "on" || raw === "true") return "on";
  return "";
}

export function isWorkersIsolate() {
  try {
    const ua = typeof navigator !== "undefined" ? String(navigator.userAgent || "") : "";
    if (/Cloudflare-Workers/i.test(ua)) return true;
  } catch {
    /* not a Worker isolate */
  }
  try {
    if (typeof caches !== "undefined" && caches && Object.prototype.hasOwnProperty.call(caches, "default")) return true;
  } catch {
    /* not a Worker isolate */
  }
  return false;
}

/** Direct Worker tools/call emits. Node unit tests stay quiet unless the flag is on. */
export function workerEmitsGlamaTelemetry(env) {
  const flag = readTelemetryFlag(env);
  if (flag === "off") return false;
  if (flag === "on") return true;
  return isWorkersIsolate();
}

export function responseMarksWorkerTelemetry(res) {
  if (!res || !res.headers || typeof res.headers.get !== "function") return false;
  return String(res.headers.get(GLAMA_TELEMETRY_RESPONSE_HEADER) || "").trim().toLowerCase() === GLAMA_TELEMETRY_RESPONSE_WORKER;
}

export function isSuccessfulToolsCall(message, rpc) {
  if (!message || message.method !== "tools/call") return false;
  if (!rpc || rpc.error) return false;
  const result = rpc.result;
  if (!result || typeof result !== "object") return false;
  if (result.isError === true) return false;
  return true;
}

function resolveTelemetryFetch(explicit) {
  if (typeof explicit === "function") return explicit;
  if (typeof telemetryFetchOverride === "function") return telemetryFetchOverride;
  if (typeof globalThis.fetch === "function") return globalThis.fetch.bind(globalThis);
  return null;
}

/**
 * POST usage. Never throws. Does not block the caller; pass ctx.waitUntil on the Worker.
 */
export function emitGlamaToolTelemetry({ tool, client, fetchImpl, ctx } = {}) {
  const impl = resolveTelemetryFetch(fetchImpl);
  if (typeof impl !== "function") return Promise.resolve({ ok: false, skipped: true });
  const body = glamaUsageBody(tool, client);
  const work = Promise.resolve()
    .then(() =>
      impl(GLAMA_TELEMETRY_URL, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "user-agent": "Mozilla/5.0",
        },
        body: JSON.stringify(body),
      }),
    )
    .then(() => ({ ok: true }))
    .catch(() => ({ ok: false }));
  if (ctx && typeof ctx.waitUntil === "function") {
    try {
      ctx.waitUntil(work);
    } catch {
      /* telemetry must not fail the MCP response */
    }
  }
  return work;
}

/** Stdio bridge: emit only when this process handled a successful tools/call the Worker did not already mark. */
export function scheduleStdioGlamaTelemetry(message, rpc, ctx, res) {
  try {
    if (responseMarksWorkerTelemetry(res)) return Promise.resolve({ ok: true, skipped: true, reason: "worker" });
    if (!isSuccessfulToolsCall(message, rpc)) return Promise.resolve({ ok: true, skipped: true });
    const tool = message.params && message.params.name;
    const client = (ctx && (ctx.client || ctx.userAgent)) || GLAMA_TELEMETRY_CLIENT_FALLBACK;
    const fetchImpl = ctx && ctx.telemetryFetch;
    const work = emitGlamaToolTelemetry({ tool, client, fetchImpl });
    if (ctx) ctx.glamaTelemetry = work;
    return work;
  } catch {
    return Promise.resolve({ ok: false });
  }
}
