/**
 * Client-side remote MCP / FragGate transport honesty.
 *
 * When outbound DNS or HTTPS to the hosted Worker fails, return a typed
 * network refuse. Never mint a FragGate execution receipt. Never present
 * in-process local validation as remote execution. --local is explicit.
 *
 * Author: Aziel Eliab. Identity is Aziel Eliab only.
 * SPDX-License-Identifier: Apache-2.0
 */

import { FG_DNS, FG_NET } from "./fraggate/codes.js";

export const PRIMARY_REMOTE_ORIGIN = "https://aziel-runtime.vibelock.workers.dev";

export const REQUIRED_EGRESS = Object.freeze({
  dns: true,
  https: true,
  hosts: Object.freeze(["aziel-runtime.vibelock.workers.dev", "*.vibelock.workers.dev"]),
  cloudflare: true,
  paths: Object.freeze(["/mcp", "/v1/fraggate", "/v1/fraggate/list", "/v1/fraggate/describe", "/v1/fraggate/call"]),
  note:
    "Containers (stdio MCP bridge, Docker used for Glama/MCP, ToolBench/session clients) need outbound DNS + HTTPS to *.vibelock.workers.dev / Cloudflare. --local is explicit in-process only. A DNS or network miss is FG-DNS / FG-NET (remote:false) — not a FragGate execution receipt and not local validation.",
});

const DNS_CODES = new Set([
  "ENOTFOUND",
  "EAI_AGAIN",
  "EAI_FAIL",
  "EAI_NODATA",
  "EAI_NONAME",
  "ENODATA",
  "ERR_NAME_NOT_RESOLVED",
]);

const DNS_RE = /getaddrinfo|ENOTFOUND|EAI_AGAIN|EAI_FAIL|EAI_NODATA|EAI_NONAME|ERR_NAME_NOT_RESOLVED|queryA(aaa)? ENOTFOUND|name not resolved/i;

function walkCauses(err, depth = 0) {
  const out = [];
  let cur = err;
  for (let i = 0; i < 6 && cur && depth + i < 6; i++) {
    out.push(cur);
    cur = cur.cause;
  }
  return out;
}

function blobOf(err) {
  return walkCauses(err)
    .map((e) => [e && e.code, e && e.errno, e && e.name, e && e.syscall, e && e.hostname, e && e.message, String(e)])
    .flat()
    .filter(Boolean)
    .join(" ");
}

export function classifyTransportError(err) {
  const nodes = walkCauses(err);
  for (const node of nodes) {
    if (node && DNS_CODES.has(String(node.code || ""))) {
      return { code: FG_DNS, kind: "dns", remote: false };
    }
  }
  if (DNS_RE.test(blobOf(err))) {
    return { code: FG_DNS, kind: "dns", remote: false };
  }
  return { code: FG_NET, kind: "network-error", remote: false };
}

export function dnsError(hostname = "aziel-runtime.vibelock.workers.dev", message) {
  const err = new Error(message || `getaddrinfo ENOTFOUND ${hostname}`);
  err.code = "ENOTFOUND";
  err.syscall = "getaddrinfo";
  err.hostname = hostname;
  const wrap = new TypeError("fetch failed");
  wrap.cause = err;
  return wrap;
}

export function networkRefuseEnvelope(options = {}) {
  const classified = classifyTransportError(options.err);
  const origin = options.origin || PRIMARY_REMOTE_ORIGIN;
  const path = options.path || "/mcp";
  const detail = options.err && (options.err.message || options.err.cause?.message || String(options.err));
  const message =
    classified.code === FG_DNS
      ? `Remote MCP/FragGate DNS failed for ${origin}${path}. Outbound DNS + HTTPS to *.vibelock.workers.dev / Cloudflare is required. This is not a FragGate execution receipt and not local validation.`
      : `Remote MCP/FragGate network failed for ${origin}${path}. This is not a FragGate execution receipt and not local validation.`;
  return {
    ok: false,
    remote: false,
    code: classified.code,
    kind: classified.kind,
    fraggate_receipt: false,
    local_validation: false,
    fabricated: false,
    door: null,
    result: null,
    ledger_tip: null,
    message,
    detail: detail ? String(detail).slice(0, 300) : null,
    origin,
    path,
    egress: REQUIRED_EGRESS,
    author: "Aziel Eliab",
  };
}

/**
 * True only for a completed FragGate door accept (FG-OK + door + ledger tip).
 * Network refuses and local-validation notes must return false.
 */
export function looksLikeFraggateExecutionReceipt(obj) {
  if (!obj || typeof obj !== "object") return false;
  const data = obj.error && obj.error.data ? obj.error.data : obj;
  if (data.fraggate_receipt === false) return false;
  if (data.local_validation === true) return false;
  if (data.remote === false && (data.code === FG_DNS || data.code === FG_NET)) return false;
  return data.ok === true && data.code === "FG-OK" && data.door === "fraggate" && Boolean(data.ledger_tip);
}
