/**
 * ACT-RECEIPT-1.0 — public mesh copy of four-field action receipts.
 *
 * Origin: https://www.azielcorpuslibrary.net/receipts
 * Append: POST /v1/receipts/append with header x-aziel-receipt
 *   when RECEIPT_APPEND_TOKEN (or LIBRARY_RECEIPT_TOKEN) is set.
 * Fail-open: missing token or corpus errors never break engines.
 *
 * Four fields: hash (SHA-256 including previous_hash), one-sentence request,
 * one-sentence output, event metadata (surface/path/method/status/tool/spec/
 * runtime version). No user / IP / geo.
 *
 * Not a Softwares-tab product. Not a FragGate slug. Remain-OFF untouched.
 * MESH-VAULT lite: catalog / download / mesh events may mint when token set.
 * Author: Aziel Eliab only.
 */

import { canonicalize, sha256Hex, ZERO_HASH } from "./session-core.js";
import { DEFAULT_UA, RUNTIME_VERSION } from "./runtime-api.js";

export const RECEIPTS_SPEC = "ACT-RECEIPT-1.0";
export const RECEIPTS_AUTHOR = "Aziel Eliab";
export const LIBRARY_RECEIPTS_ORIGIN = "https://www.azielcorpuslibrary.net";
export const LIBRARY_RECEIPTS_PUBLIC = `${LIBRARY_RECEIPTS_ORIGIN}/receipts`;
export const LIBRARY_RECEIPTS = `${LIBRARY_RECEIPTS_ORIGIN}/v1/receipts/append`;
export const LIBRARY_RECEIPTS_TIP = `${LIBRARY_RECEIPTS_ORIGIN}/v1/receipts/tip`;
export const LIBRARY_RECEIPTS_READ = `${LIBRARY_RECEIPTS_ORIGIN}/v1/receipts`;
export const RECEIPTS_PAPER = "docs/designs/ACT-RECEIPT-1.0.md";
export const RECEIPTS_HEADER = "x-aziel-receipt";
export const HEX64 = /^[a-f0-9]{64}$/;

export const ACT_RECEIPT_NOTE =
  "Public ACT-RECEIPT-1.0 chain lives on https://www.azielcorpuslibrary.net/receipts. Runtime appends after FragGate list/call, POST /mcp, and significant POST /v1/* when RECEIPT_APPEND_TOKEN is set. Missing token is fail-open. No user/IP/geo. Not a Softwares-tab product.";

const SKIP_MINT = new Set([
  "/",
  "/about",
  "/v1/about",
  "/robots.txt",
  "/sitemap.xml",
  "/sitemap-index.xml",
  "/llms.txt",
  "/ai.txt",
  "/cite.json",
  "/openapi.json",
  "/sigil.png",
  "/favicon.ico",
  "/v1/health",
  "/v1/ready",
  "/v1/uses",
  "/v1/stats",
  "/v1/stats-rollups",
  "/v1/qns",
  "/v1/azpipe/arch",
  "/v1/azpipe",
]);

const MESH_VAULT_GET = new Set([
  "/v1/software",
  "/v1/software.json",
  "/v1/fraggate/software",
  "/v1/fraggate/software.json",
  "/v1/catalog.json",
  "/v1/update/check",
  "/v1/update/manifest",
  "/v1/bundle",
  "/v1/pull",
]);

export function actReceiptHint() {
  return {
    spec: RECEIPTS_SPEC,
    public_chain: LIBRARY_RECEIPTS_PUBLIC,
    append: LIBRARY_RECEIPTS,
    path: "/v1/receipts",
    software_tab: false,
    fraggate_slug: false,
    fail_open: true,
    note: "Public chain lives on corpus /receipts. Runtime appends when RECEIPT_APPEND_TOKEN is set.",
  };
}

export function receiptAppendToken(env) {
  const raw = env && (env.RECEIPT_APPEND_TOKEN || env.LIBRARY_RECEIPT_TOKEN);
  const token = String(raw || "").trim();
  return token || "";
}

export function oneSentence(text) {
  const raw = String(text || "")
    .replace(/\s+/g, " ")
    .trim();
  if (!raw) return "";
  const cut = raw.split(/(?<=[.!?])\s+/)[0] || raw;
  return cut.length <= 240 ? cut : cut.slice(0, 239) + "…";
}

export function normalizeReceiptPath(pathname) {
  let p = String(pathname || "/").split("?")[0].split("#")[0];
  if (!p.startsWith("/")) p = "/" + p;
  p = p.replace(/\/{2,}/g, "/");
  if (p.length > 1) p = p.replace(/\/+$/, "");
  return p.toLowerCase() || "/";
}

function isReceiptReadPath(path) {
  return path === "/v1/receipts" || path.startsWith("/v1/receipts/");
}

export function classifyActSurface(method, pathname) {
  const verb = String(method || "GET").toUpperCase();
  const path = normalizeReceiptPath(pathname);
  if (path === "/mcp" && verb === "POST") return "mcp";
  if (path === "/v1/fraggate/list" || path === "/v1/fraggate/call") return "fraggate";
  if (path === "/v1/fraggate/verify" && verb === "POST") return "fraggate";
  if (path.startsWith("/v1/mesh/") && verb === "POST") return "mesh-vault";
  if (path.startsWith("/v1/pull/") || MESH_VAULT_GET.has(path)) return "mesh-vault";
  if (verb === "POST" && path.startsWith("/v1/")) return "http";
  return null;
}

export function shouldMintActReceipt(method, pathname) {
  const verb = String(method || "GET").toUpperCase();
  if (verb === "OPTIONS" || verb === "HEAD") return false;
  const path = normalizeReceiptPath(pathname);
  if (isReceiptReadPath(path)) return false;
  if (SKIP_MINT.has(path)) return false;
  if (/\.(png|jpe?g|gif|webp|svg|ico|css|js|map|woff2?|ttf)$/i.test(path)) return false;
  return classifyActSurface(verb, path) != null;
}

function toolFromPath(path, extra = {}) {
  if (extra.tool) return String(extra.tool).slice(0, 80);
  if (path === "/v1/fraggate/list") return "fraggate_list";
  if (path === "/v1/fraggate/call") return "fraggate_call";
  if (path === "/v1/fraggate/verify") return "fraggate_verify";
  if (path === "/mcp") return extra.mcp_method || "mcp";
  if (path.startsWith("/v1/mesh/")) return `mesh_${path.slice("/v1/mesh/".length).replace(/\W+/g, "_")}` || "mesh";
  if (path === "/v1/software" || path === "/v1/software.json" || path === "/v1/fraggate/software") {
    return "runtime_software";
  }
  if (path === "/v1/catalog.json") return "runtime_catalog";
  if (path.startsWith("/v1/pull")) return "runtime_pull";
  if (path.startsWith("/v1/session/")) return "runtime_session";
  if (path.startsWith("/v1/memory/")) return `memory_${path.slice("/v1/memory/".length).split("/")[0] || "act"}`;
  return "";
}

export function requestSentence(meta) {
  const surface = meta.surface;
  const tool = meta.tool;
  const mcp = meta.mcp_method;
  if (surface === "mcp") {
    if (mcp === "tools/call" && tool) return `MCP tools/call invoked ${tool}.`;
    if (mcp === "tools/list") return "MCP tools/list requested the public FragGate roster.";
    if (mcp === "initialize") return "MCP initialize negotiated the FragGate door.";
    return `MCP ${mcp || "request"} was posted.`;
  }
  if (meta.path === "/v1/fraggate/list") return "FragGate listed the hashed registry.";
  if (meta.path === "/v1/fraggate/call") {
    return tool && tool !== "fraggate_call" ? `FragGate called ${tool}.` : "FragGate executed a CallEnvelope.";
  }
  if (surface === "mesh-vault") return `MESH-VAULT lite recorded ${meta.method} ${meta.path}.`;
  return `${meta.method} ${meta.path} was accepted by the runtime.`;
}

export function outputSentence(status) {
  const n = Number(status) || 0;
  if (n >= 200 && n < 300) return `Returned ${n} without breaking the engine path.`;
  if (n >= 400) return `Returned ${n}; engines stayed on the fail-open path.`;
  return `Completed with HTTP ${n}.`;
}

export function eventMetadata(meta) {
  return {
    surface: meta.surface || "http",
    path: meta.path || "/",
    method: meta.method || "GET",
    status: Number(meta.status) || 0,
    tool: meta.tool || "",
    spec: RECEIPTS_SPEC,
    runtime_version: meta.runtime_version || RUNTIME_VERSION,
  };
}

export async function hashActReceipt(unsigned) {
  return sha256Hex(canonicalize(unsigned));
}

export async function mintActReceipt(input = {}) {
  const previous_hash = HEX64.test(String(input.previous_hash || ""))
    ? String(input.previous_hash)
    : ZERO_HASH;
  const request = oneSentence(input.request || input.action);
  const output = oneSentence(input.output);
  const event = eventMetadata(input.event || input);
  const unsigned = { previous_hash, request, output, event };
  const hash = await hashActReceipt(unsigned);
  return { hash, request, output, event, previous_hash };
}

function peekJsonHash(body) {
  if (!body || typeof body !== "object") return "";
  const candidates = [
    body.hash,
    body.tip && body.tip.hash,
    body.receipt && body.receipt.hash,
    body.chain && body.chain.hash,
  ];
  for (const h of candidates) {
    if (HEX64.test(String(h || ""))) return String(h);
  }
  return "";
}

export async function fetchCorpusTip(env, fetchImpl = fetch) {
  try {
    const headers = { "User-Agent": DEFAULT_UA, Accept: "application/json" };
    const token = receiptAppendToken(env);
    if (token) headers[RECEIPTS_HEADER] = token;
    const res = await fetchImpl(LIBRARY_RECEIPTS_TIP, {
      method: "GET",
      headers,
      signal: AbortSignal.timeout(2500),
    });
    if (!res || !res.ok) return { ok: false, hash: ZERO_HASH, status: res ? res.status : 0 };
    const json = await res.json().catch(() => ({}));
    const hash = peekJsonHash(json) || ZERO_HASH;
    return { ok: true, hash, status: res.status, tip: json };
  } catch {
    return { ok: false, hash: ZERO_HASH, status: 0, fail_open: true };
  }
}

export async function appendActReceipt(env, receipt, fetchImpl = fetch) {
  const token = receiptAppendToken(env);
  if (!token) return { ok: false, refuse: "no-token", published: false };
  try {
    const res = await fetchImpl(LIBRARY_RECEIPTS, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "User-Agent": DEFAULT_UA,
        [RECEIPTS_HEADER]: token,
      },
      body: JSON.stringify({
        spec: RECEIPTS_SPEC,
        hash: receipt.hash,
        previous_hash: receipt.previous_hash,
        request: receipt.request,
        output: receipt.output,
        event: receipt.event,
        action: receipt.request,
      }),
      signal: AbortSignal.timeout(2500),
    });
    const json = await res.json().catch(() => ({}));
    return {
      ok: !!json.ok || res.status === 200 || res.status === 201,
      published: res.status === 200 || res.status === 201,
      status: res.status,
      receipt: json.receipt || receipt,
      refuse: json.refuse,
    };
  } catch (err) {
    return {
      ok: false,
      refuse: "corpus-unreachable",
      published: false,
      fail_open: true,
      detail: String(err && err.message ? err.message : err),
    };
  }
}

/** Existing publisher — four-field mint + fail-open append. */
export async function publishLibraryReceipt(env, input = {}, fetchImpl = fetch) {
  const token = receiptAppendToken(env);
  if (!token) return { ok: false, refuse: "no-token", published: false };
  const request = oneSentence(input.action || input.request);
  const output = oneSentence(input.output);
  if (!request || !output) return { ok: false, refuse: "need-action-and-output", published: false };
  const tip = await fetchCorpusTip(env, fetchImpl);
  const receipt = await mintActReceipt({
    previous_hash: tip.hash,
    request,
    output,
    event: {
      surface: input.surface || "aziel-runtime",
      path: input.path || "/runtime",
      method: input.method || "POST",
      status: Number(input.status) || 200,
      tool: input.tool || "",
      spec: RECEIPTS_SPEC,
      runtime_version: input.runtime || RUNTIME_VERSION,
    },
  });
  return appendActReceipt(env, receipt, fetchImpl);
}

async function parseMintHints(request) {
  const hints = {};
  if (!request || String(request.method || "").toUpperCase() !== "POST") return hints;
  try {
    const body = await request.clone().json();
    if (!body || typeof body !== "object") return hints;
    if (body.method) hints.mcp_method = String(body.method).slice(0, 80);
    const params = body.params || {};
    const name = params.name || body.name || body.slug;
    const op = (params.arguments && params.arguments.op) || body.op;
    if (name && op) hints.tool = `${name}:${op}`.slice(0, 80);
    else if (name) hints.tool = String(name).slice(0, 80);
    else if (body.slug && body.op) hints.tool = `${body.slug}:${body.op}`.slice(0, 80);
  } catch {
    /* body already consumed or not JSON */
  }
  return hints;
}

export async function mintFromHttp(request, response, extra = {}) {
  const url = new URL(request.url);
  const path = normalizeReceiptPath(url.pathname);
  const method = String(request.method || "GET").toUpperCase();
  const surface = classifyActSurface(method, path);
  const status = response && typeof response.status === "number" ? response.status : 0;
  const tool = toolFromPath(path, extra);
  return mintActReceipt({
    previous_hash: extra.previous_hash,
    request: requestSentence({ surface, path, method, tool, mcp_method: extra.mcp_method }),
    output: outputSentence(status),
    event: {
      surface,
      path,
      method,
      status,
      tool,
      spec: RECEIPTS_SPEC,
      runtime_version: RUNTIME_VERSION,
    },
  });
}

export async function recordActReceipt(env, request, response, fetchImpl = fetch) {
  if (!receiptAppendToken(env)) return { ok: true, skipped: true, refuse: "no-token" };
  if (!request) return { ok: true, skipped: true };
  const path = normalizeReceiptPath(new URL(request.url).pathname);
  if (!shouldMintActReceipt(request.method, path)) return { ok: true, skipped: true };
  try {
    const hints = await parseMintHints(request);
    const tip = await fetchCorpusTip(env, fetchImpl);
    const receipt = await mintFromHttp(request, response, { ...hints, previous_hash: tip.hash });
    return appendActReceipt(env, receipt, fetchImpl);
  } catch (err) {
    return {
      ok: false,
      refuse: "fail-open",
      published: false,
      fail_open: true,
      detail: String(err && err.message ? err.message : err),
    };
  }
}

export async function finishWithActReceipt(request, env, ctx, response, fetchImpl = fetch) {
  const work = Promise.resolve()
    .then(() => recordActReceipt(env, request, response, fetchImpl))
    .catch((err) => {
      console.log(
        JSON.stringify({
          msg: "act_receipt_failed",
          detail: String(err && err.message ? err.message : err),
        }),
      );
    });
  if (ctx && typeof ctx.waitUntil === "function") {
    ctx.waitUntil(work);
    return response;
  }
  await work;
  return response;
}

export function actReceiptStatus(extra = {}) {
  return {
    ok: true,
    code: "ACT-RECEIPT-OK",
    author: RECEIPTS_AUTHOR,
    identity: "Aziel Eliab",
    spec: RECEIPTS_SPEC,
    software_tab: false,
    fraggate_slug: false,
    fail_open: true,
    public_chain: LIBRARY_RECEIPTS_PUBLIC,
    append: LIBRARY_RECEIPTS,
    tip: extra.tip || null,
    tip_path: "/v1/receipts/tip",
    proxy_path: "/v1/receipts/proxy",
    fields: ["hash", "request", "output", "event"],
    event_fields: ["surface", "path", "method", "status", "tool", "spec", "runtime_version"],
    no_user_ip_geo: true,
    token_configured: extra.token_configured === true,
    paper: RECEIPTS_PAPER,
    note: ACT_RECEIPT_NOTE,
    mesh_vault_lite: true,
    remain_off_untouched: true,
    act_receipt: actReceiptHint(),
  };
}

export function actReceiptRefuse(code, message, extra = {}) {
  return {
    ok: false,
    code,
    author: RECEIPTS_AUTHOR,
    identity: "Aziel Eliab",
    spec: RECEIPTS_SPEC,
    software_tab: false,
    public_chain: LIBRARY_RECEIPTS_PUBLIC,
    message,
    note: ACT_RECEIPT_NOTE,
    ...extra,
  };
}

export async function proxyCorpusReceipts(env, kind = "tip", fetchImpl = fetch) {
  const url = kind === "read" ? LIBRARY_RECEIPTS_READ : LIBRARY_RECEIPTS_TIP;
  try {
    const headers = { "User-Agent": DEFAULT_UA, Accept: "application/json" };
    const token = receiptAppendToken(env);
    if (token) headers[RECEIPTS_HEADER] = token;
    const res = await fetchImpl(url, {
      method: "GET",
      headers,
      signal: AbortSignal.timeout(2500),
    });
    if (!res || !res.ok) {
      return {
        ok: true,
        proxied: false,
        status: res ? res.status : 0,
        public_chain: LIBRARY_RECEIPTS_PUBLIC,
        note: ACT_RECEIPT_NOTE,
        tip: null,
      };
    }
    const json = await res.json().catch(() => ({}));
    return {
      ok: true,
      proxied: true,
      status: res.status,
      public_chain: LIBRARY_RECEIPTS_PUBLIC,
      note: ACT_RECEIPT_NOTE,
      tip: json,
      hash: peekJsonHash(json) || null,
    };
  } catch {
    return {
      ok: true,
      proxied: false,
      fail_open: true,
      public_chain: LIBRARY_RECEIPTS_PUBLIC,
      note: ACT_RECEIPT_NOTE,
      tip: null,
    };
  }
}

/**
 * Optional read door. GET/HEAD cite + tip/proxy. POST refused (append is corpus-only).
 */
export async function dispatchActReceiptHttp(method, pathname, env, fetchImpl = fetch) {
  const verb = String(method || "GET").toUpperCase();
  const path = normalizeReceiptPath(pathname);
  const tail = path === "/v1/receipts" ? "" : path.replace(/^\/v1\/receipts\/?/, "").toLowerCase();

  if (verb === "GET" || verb === "HEAD") {
    if (tail === "tip" || tail === "proxy") {
      const proxied = await proxyCorpusReceipts(env, "tip", fetchImpl);
      return { status: 200, body: { ...actReceiptStatus({ token_configured: !!receiptAppendToken(env) }), ...proxied } };
    }
    return {
      status: 200,
      body: actReceiptStatus({ token_configured: !!receiptAppendToken(env) }),
    };
  }

  return {
    status: 405,
    body: actReceiptRefuse(
      "ACT-RECEIPT-CORPUS-ONLY",
      "Runtime does not accept public append. POST corpus /v1/receipts/append when RECEIPT_APPEND_TOKEN is set. GET /v1/receipts cites the public chain.",
      { path, method: verb, hint: "GET /v1/receipts  GET /v1/receipts/tip" },
    ),
  };
}

export function actReceiptSkillText() {
  return `# ACT-RECEIPT-1.0

Public four-field action receipts. The chain lives on [Aziel Corpus Library /receipts](${LIBRARY_RECEIPTS_PUBLIC}).

${ACT_RECEIPT_NOTE}

Fields: **hash** (SHA-256 including previous_hash), one-sentence **request**, one-sentence **output**, **event** metadata (surface / path / method / status / tool / spec / runtime version). No user, IP, or geo.

Runtime appends after FragGate list/call, POST /mcp, and significant POST /v1/* when \`RECEIPT_APPEND_TOKEN\` is set (header \`${RECEIPTS_HEADER}\`). MESH-VAULT lite may mint catalog / download / mesh events. Missing token is fail-open — engines still work.

Read: \`GET /v1/receipts\` (cite) · \`GET /v1/receipts/tip\` / \`GET /v1/receipts/proxy\` (corpus tip).

Not a Softwares-tab product. Not a FragGate slug. Remain-OFF untouched. Author: Aziel Eliab only.
`;
}
