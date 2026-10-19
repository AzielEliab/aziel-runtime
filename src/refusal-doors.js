/**
 * AZRT-REFUSAL-RECEIPT-1.0 addendum (RIB-018 gaps): HTTP/REST refusal doors and peer surfaces.
 *
 * RIB-018 already seals MCP-door and POST /v1/fraggate/call refusals (src/receipt-guard.js
 * sealRefusal), session exec refusals (session chain `refused` receipts) and resume-anchor refusals.
 * This module closes the remaining non-auth doors through the SAME sealRefusal path and the SAME
 * internal `refusals` ChainLock chain (dual lattice, append-only, internal-only writer):
 *   - REST refusals on /v1/fraggate*, /v1/mesh* (incl. MESH-ONBOARD install), /v1/tether*,
 *     /v1/memory* (lattice-learn and friends), /v1/qns*, /v1/interface, /v1/pull/*, /p/*
 *   - AZ-OS and azinterface refusals, reported over their AZIEL_RUNTIME service binding to
 *     POST https://peer.aziel.internal/v1/refusals/peer (not reachable from the public internet:
 *     that hostname is not routable to this Worker, so only a bound Worker can present it).
 *
 * Not recorded (by design, the user decides): auth-gate refusals (401, token_* codes,
 * TOKEN-QUERY-REFUSED, CL-NOT-ISSUER) and rate-limit 429s. They stay plain refusals.
 *
 * Flood guard: sealRefusal's minute idempotency key (code + door + method + status; no caller identity, no
 * route), shared across isolates, so rows/minute <= codes x doors x methods; an in-isolate memo; and a cap
 * of REFUSAL_HTTP_CAP_PER_MIN new seals per minute PER DOOR and PER PEER SURFACE (no crowd-out). Over the
 * cap: status rate_limited. Only fixed route templates (or wildcard + route_sha256) are stored.
 * Fail closed: the refusal response is never changed into success; a failed or slow write is
 * reported as sealed:false with status unavailable or receipt_pending, never an invented receipt.
 * Additive only: the refusal body keeps every field; `refusal_receipt` is added (JSON bodies) and
 * the header X-Azrt-Refusal-Receipt is added (all bodies, e.g. install.sh text refusals).
 * Author: Aziel Eliab.
 */

export const REFUSAL_DOORS_SPEC = "AZRT-REFUSAL-RECEIPT-1.0+doors";
/** Per door (and per peer surface) per isolate per minute. Doors do not share one counter (no crowd-out). */
export const REFUSAL_HTTP_CAP_PER_MIN = 30;
export const REFUSAL_SEAL_BUDGET_MS = 2500;
export const PEER_HOST = "peer.aziel.internal";
export const PEER_PATH = "/v1/refusals/peer";
export const PEER_SURFACES = Object.freeze(["azos", "azinterface"]);

/** Path prefixes whose non-auth refusals are sealed here. */
export const SEALED_DOOR_PREFIXES = Object.freeze([
  "/v1/fraggate", "/v1/mesh", "/v1/tether", "/v1/memory", "/v1/qns", "/v1/interface", "/v1/pull/", "/p/",
]);

/** Auth refusals stay unrecorded (RIB-018 design; user decision pending). */
export const AUTH_CODES = Object.freeze(["token_required", "token_mismatch", "token_not_configured", "TOKEN-QUERY-REFUSED", "CL-NOT-ISSUER"]);

const CODE_RE = /^[A-Za-z][A-Za-z0-9_-]{1,63}$/;

export function isAuthRefusal(status, code) {
  if (Number(status) === 401) return true;
  if (!code) return false;
  if (AUTH_CODES.includes(code)) return true;
  return /token/i.test(code);
}

export function doorOf(pathname) {
  const p = String(pathname || "");
  for (const pre of SEALED_DOOR_PREFIXES) {
    const base = pre.replace(/\/$/, "");
    if (p === base || p.startsWith(base + "/") || (!pre.endsWith("/") && p.startsWith(base + "."))) {
      return base.replace(/^\/(v1\/)?/, "");
    }
  }
  return null; // includes /mcp: the MCP door seals inside (RIB-018)
}

/**
 * Fixed route templates. Only these literal strings are ever stored as `route`; any other path is stored
 * as its door wildcard plus `route_sha256` (16 hex of sha256(path)), so a caller cannot write text into
 * the permanent chain (RIB-018 follow-up, AZBot review 2026-10-19).
 */
export const KNOWN_ROUTES = Object.freeze([
  "/v1/fraggate", "/v1/fraggate/call", "/v1/fraggate/list", "/v1/fraggate/describe", "/v1/fraggate/software", "/v1/fraggate/verify",
  "/v1/mesh", "/v1/mesh/install", "/v1/mesh/install.sh", "/v1/mesh/bootstrap", "/v1/mesh/join", "/v1/mesh/leave", "/v1/mesh/enable",
  "/v1/mesh/disable", "/v1/mesh/heartbeat", "/v1/mesh/status", "/v1/mesh/nodes", "/v1/mesh/broadcast",
  "/v1/tether", "/v1/tether/push", "/v1/tether/tip", "/v1/tether/aznews", "/v1/tether/4dmap",
  "/v1/memory", "/v1/memory/observe", "/v1/memory/resolve", "/v1/memory/calibrate", "/v1/memory/recall", "/v1/memory/rebuild-index",
  "/v1/qns", "/v1/interface", "/v1/pull",
  // peer trackers (AZ-OS / azinterface)
  "/", "/v1/runtime/sync", "/v1/refusals", "/v1/health", "/v1/newsmap", "/v1/newsmap/globe", "/openapi.json",
]);
const ROUTE_PATTERNS = [
  [/^\/v1\/pull\/[^/]+$/, "/v1/pull/{slug}"],
  [/^\/v1\/pull\/[^/]+\/skill$/, "/v1/pull/{slug}/skill"],
  [/^\/p\/[^/]+\/[^/]+$/, "/p/{product}/{op}"],
  [/^\/v1\/session\/sess_[a-f0-9]{32}(\/[a-z]+)?$/, "/v1/session/{id}/*"],
];

/** Returns { route, route_sha256? }. route is always a fixed string from code, never caller text. */
export async function routeTemplate(pathname, { wildcard = null } = {}) {
  const p = String(pathname || "/").replace(/\/+$/, "") || "/";
  if (KNOWN_ROUTES.includes(p)) return { route: p };
  const { sha256Hex } = await import("./session-core.js");
  const h = (await sha256Hex(p)).slice(0, 16);
  for (const [re, t] of ROUTE_PATTERNS) if (re.test(p)) return { route: t, route_sha256: h };
  const door = doorOf(p);
  const base = wildcard || (door ? SEALED_DOOR_PREFIXES.find((x) => x.replace(/\/$/, "").replace(/^\/(v1\/)?/, "") === door).replace(/\/$/, "") + "/*" : "/*");
  return { route: base, route_sha256: h };
}

/** Uncoded 4xx get this fixed code (RIB-018 follow-up). */
export function uncodedCode(status) {
  return `HTTP-${Number(status) || 0}-UNCODED`;
}

/** Drop a reason that echoes caller input (path segments or query values of 3+ chars); keep a hash instead. */
export async function safeReason(reason, url) {
  const r = String(reason || "").slice(0, 160);
  if (!r) return { reason: "" };
  const bits = [];
  try {
    const u = typeof url === "string" ? new URL(url, "https://x.invalid") : url;
    for (const seg of u.pathname.split("/")) { try { const d = decodeURIComponent(seg); if (d.length >= 3) bits.push(d.toLowerCase()); } catch { if (seg.length >= 3) bits.push(seg.toLowerCase()); } }
    for (const [, v] of u.searchParams) { if (String(v).length >= 3) bits.push(String(v).toLowerCase()); }
  } catch { /* no url: keep the server-authored reason */ }
  const low = r.toLowerCase();
  const fixed = new Set(["v1", "mesh", "fraggate", "tether", "memory", "pull", "qns", "interface", "install", "install.sh", "call", "skill", "runtime", "sync", "refusals", "newsmap", "health"]);
  if (bits.some((b) => !fixed.has(b) && low.includes(b))) {
    const { sha256Hex } = await import("./session-core.js");
    return { reason: null, reason_sha256: (await sha256Hex(r)).slice(0, 16), reason_note: "reason echoed caller input; hash kept" };
  }
  return { reason: r };
}

export function refusalFromBody(status, contentType, text) {
  const ct = String(contentType || "");
  if (/json/i.test(ct)) {
    let body;
    try { body = JSON.parse(text); } catch { return null; }
    if (!body || typeof body !== "object" || Array.isArray(body)) return null;
    if (body.refusal_receipt != null || body.refused_receipt != null) return { already: true, body };
    let code = typeof body.code === "string" ? body.code : (typeof body.refuse === "string" ? body.refuse : null);
    const reason = typeof body.message === "string" ? body.message : (typeof body.error === "string" ? body.error : (typeof body.reason === "string" ? body.reason : ""));
    let uncoded = false;
    if (!code) {
      // RIB-018 follow-up: an uncoded 4xx refusal (ok:false or an error string) gets a fixed code.
      const st = Number(status);
      if (!(st >= 400 && st < 500) || !(body.ok === false || typeof body.error === "string")) return null;
      code = uncodedCode(st);
      uncoded = true;
    }
    if (!CODE_RE.test(code)) return null;
    return { code, reason: reason.slice(0, 160), body, uncoded };
  }
  // MESH-ONBOARD install.sh refusal: `echo 'CODE' >&2; exit 1`
  const m = /^#!\/bin\/sh\s*\necho '([A-Za-z][A-Za-z0-9_-]{1,63})' >&2/.exec(String(text || ""));
  if (m) return { code: m[1], reason: "install script refused", body: null, text: true };
  return null;
}

// In-isolate memo + cap (flood guard). Keyed by minute.
// Counters are per door (runtime doors) and per peer surface, so one door cannot spend another's budget.
const memo = { minute: -1, sealed: new Map(), views: new Map() };
function memoFor(minute) {
  if (memo.minute !== minute) { memo.minute = minute; memo.sealed = new Map(); memo.views = new Map(); }
  return memo;
}
export function _resetRefusalMemo() { memo.minute = -1; memo.sealed = new Map(); memo.views = new Map(); }
export function capBucketOf(surface, door) { return surface === "runtime" ? "door:" + door : "peer:" + surface; }

/**
 * Seal one door refusal through receipt-guard sealRefusal. Returns the receipt view.
 * `surface` is "runtime" for this Worker's own doors, or a PEER_SURFACES name.
 */
export async function sealDoorRefusal(store, { surface = "runtime", door, code, reason, method, route, status, routeHash = null, reasonExtra = null }, { ctx, now = Date.now(), budgetMs = REFUSAL_SEAL_BUDGET_MS } = {}) {
  const { sealRefusal, REFUSAL_SPEC, REFUSAL_CHAIN } = await import("./receipt-guard.js");
  const minute = Math.floor(now / 60000);
  const m = memoFor(minute);
  // Dedupe key leaves the route out (it is caller-shaped); codes and doors are a finite set.
  const key = [surface, door, code, method, status].join("|");
  const extra = { kind: "refusal", surface, door, reason: reason == null ? null : String(reason).slice(0, 160), ...(reasonExtra || {}), status: Number(status) || null, route, ...(routeHash ? { route_sha256: routeHash } : {}) };
  const bucket = capBucketOf(surface, door);
  if (m.views.has(key)) return { ...m.views.get(key), replayed: true, memo: true };
  if (!store) return { spec: REFUSAL_SPEC, kind: "refusal", sealed: false, status: "unavailable", reason: "no durable store in this isolate" };
  const used = m.sealed.get(bucket) || 0;
  if (used >= REFUSAL_HTTP_CAP_PER_MIN) {
    return { spec: REFUSAL_SPEC, kind: "refusal", sealed: false, status: "rate_limited", cap_bucket: bucket, reason: `refusal seal cap ${REFUSAL_HTTP_CAP_PER_MIN}/min for ${bucket} reached in this isolate; the refusal still stands` };
  }
  m.sealed.set(bucket, used + 1);
  const work = sealRefusal(store, {
    code, tool: surface === "runtime" ? "http" : surface, slug: door, op: method,
    args: { door, status: Number(status) || null }, minuteBucket: minute, extra, trustedNames: true,
  });
  let timer;
  const timeout = new Promise((r) => { timer = setTimeout(() => r(null), Math.max(0, budgetMs)); });
  const view = budgetMs > 0 ? await Promise.race([work, timeout]) : null;
  clearTimeout(timer);
  if (!view) {
    if (ctx && typeof ctx.waitUntil === "function") ctx.waitUntil(work.catch(() => null));
    return { spec: REFUSAL_SPEC, kind: "refusal", sealed: false, status: "receipt_pending", chain: REFUSAL_CHAIN, reason: `write still in flight after ${budgetMs} ms; find it at /v1/receipts/refusals` };
  }
  const out = { ...view, kind: "refusal", code, surface, door };
  if (out.sealed) { out.status = "sealed"; m.views.set(key, out); }
  else out.status = "unavailable";
  return out;
}

function headerValue(view) {
  if (!view) return null;
  if (view.sealed) return `sealed; chain=${view.chain}; seq=${view.seq}; h=${view.h}`;
  return `${view.status || "unavailable"}; sealed=false`;
}

/**
 * Wrap a finished runtime response: seal non-auth refusals on the listed doors (additive).
 * budgetMs is what is left of the request deadline (index.js); 0 means seal in the background (pending).
 * /p/* 5xx are upstream errors, not refusals: logged and marked X-Azrt-Upstream-Error, never sealed.
 */
export async function withDoorRefusalReceipt(request, response, { store, ctx, budgetMs = REFUSAL_SEAL_BUDGET_MS } = {}) {
  try {
    if (!response || Number(response.status) < 400 || Number(response.status) === 429) return response;
    const method = String((request && request.method) || "GET").toUpperCase();
    if (method === "OPTIONS" || method === "HEAD") return response;
    const url = new URL(request.url);
    const door = doorOf(url.pathname);
    if (!door) return response;
    if (door === "p" && Number(response.status) >= 500) {
      console.log(JSON.stringify({ upstream_error: true, door: "p", status: response.status, route: "/p/{product}/{op}" }));
      const h = new Headers(response.headers);
      h.set("X-Azrt-Upstream-Error", String(response.status));
      return new Response(response.body, { status: response.status, statusText: response.statusText, headers: h });
    }
    const ct = response.headers.get("content-type") || "";
    const len = Number(response.headers.get("content-length") || 0);
    if (len > 65536) return response;
    const text = await response.clone().text();
    if (text.length > 65536) return response;
    const ref = refusalFromBody(response.status, ct, text);
    if (!ref || ref.already) return response;
    if (isAuthRefusal(response.status, ref.code)) return response;
    const rt = await routeTemplate(url.pathname);
    const sr = await safeReason(ref.reason, url);
    const view = await sealDoorRefusal(store, { surface: "runtime", door, code: ref.code, reason: sr.reason, reasonExtra: sr.reason_sha256 ? { reason_sha256: sr.reason_sha256 } : null, method, route: rt.route, routeHash: rt.route_sha256 || null, status: response.status }, { ctx, budgetMs: Math.min(REFUSAL_SEAL_BUDGET_MS, Math.max(0, budgetMs)) });
    const headers = new Headers(response.headers);
    const hv = headerValue(view);
    if (hv) headers.set("X-Azrt-Refusal-Receipt", hv);
    let body = text;
    if (ref.body) {
      body = JSON.stringify({ ...ref.body, refusal_receipt: view }, null, /\n  "/.test(text) ? 2 : 0);
      headers.delete("content-length");
    }
    return new Response(body, { status: response.status, statusText: response.statusText, headers });
  } catch {
    return response; // fail closed: the refusal stands unchanged
  }
}

/** POST https://peer.aziel.internal/v1/refusals/peer — AZ-OS / azinterface refusal over a service binding. */
export async function handlePeerRefusal(request, { store, ctx } = {}) {
  const json = (b, s) => new Response(JSON.stringify(b, null, 2), { status: s, headers: { "content-type": "application/json; charset=utf-8" } });
  const url = new URL(request.url);
  if (url.hostname !== PEER_HOST || request.headers.get("cf-connecting-ip")) {
    return json({ ok: false, code: "REFUSAL-PEER-NOT-BOUND", message: "Peer refusal receipts are accepted only over an AZIEL_RUNTIME service binding." }, 403);
  }
  if (request.method !== "POST") return json({ ok: false, code: "REFUSAL-PEER-METHOD", message: "POST only." }, 405);
  let b;
  try { b = await request.json(); } catch { return json({ ok: false, code: "REFUSAL-PEER-BAD-JSON" }, 400); }
  const surface = String((b && b.surface) || "");
  const code = String((b && b.code) || "");
  if (!PEER_SURFACES.includes(surface) || !CODE_RE.test(code)) return json({ ok: false, code: "REFUSAL-PEER-BAD-INPUT", surfaces: PEER_SURFACES }, 400);
  if (isAuthRefusal(b.status, code)) return json({ ok: false, code: "REFUSAL-PEER-AUTH-UNRECORDED", message: "Auth refusals stay unrecorded." }, 400);
  const method = /^[A-Z]{3,7}$/.test(String(b.method || "")) ? String(b.method) : "OTHER";
  const rt = await routeTemplate(String(b.route || "/"), { wildcard: "/*" });
  // The peer already drops caller-echoing reasons; check again against the route it reports.
  const sr = b.reason == null ? { reason: null } : await safeReason(String(b.reason), "https://peer.invalid" + String(b.route || "/"));
  const reasonExtra = b.reason_sha256 && /^[a-f0-9]{16}$/.test(String(b.reason_sha256)) ? { reason_sha256: String(b.reason_sha256) } : (sr.reason_sha256 ? { reason_sha256: sr.reason_sha256 } : null);
  const view = await sealDoorRefusal(store, { surface, door: surface, code, reason: sr.reason, reasonExtra, method, route: rt.route, routeHash: rt.route_sha256 || null, status: Number(b.status) || 400 }, { ctx });
  return json({ ok: Boolean(view.sealed), refusal_receipt: view }, 200);
}

/** GET /v1/receipts/refusals[?seq=N][&limit=20] — find refusal receipts (newest first). */
export async function listRefusalReceipts(store, url) {
  const { REFUSAL_CHAIN } = await import("./receipt-guard.js");
  if (!store) return { status: 503, body: { ok: false, code: "REFUSALS-STORE-UNBOUND", chain: REFUSAL_CHAIN } };
  const { loadChain } = await import("./chainlock/ops.js");
  const rows = await loadChain(store, REFUSAL_CHAIN);
  const total = rows.length;
  const view = (r, i) => ({ seq: i + 1, k: r.k, kind: (r.refusal && r.refusal.kind) || (r.k === "refusal" ? "refusal" : r.k), code: (r.refusal && r.refusal.code) || r.subject || r.s || null, fact: r.fact, refusal: r.refusal || null, h: r.stamp_sha256, prev: r.prev || null, lattice: r.lattice ? { primary: r.lattice.primary, secondary: r.lattice.secondary } : null, t: r.t || null, verify: `/v1/anchor/row?c=${REFUSAL_CHAIN}&seq=${i + 1}` });
  const seq = Number(url.searchParams.get("seq") || 0);
  if (seq) {
    if (!(seq >= 1 && seq <= total)) return { status: 404, body: { ok: false, code: "REFUSAL-RECEIPT-NOT-FOUND", chain: REFUSAL_CHAIN, total } };
    return { status: 200, body: { ok: true, spec: REFUSAL_DOORS_SPEC, chain: REFUSAL_CHAIN, total, receipt: view(rows[seq - 1], seq - 1) } };
  }
  const limit = Math.max(1, Math.min(50, Number(url.searchParams.get("limit") || 20)));
  const out = [];
  for (let i = total - 1; i >= 0 && out.length < limit; i--) out.push(view(rows[i], i));
  const tip = total ? { seq: total, h: rows[total - 1].stamp_sha256, lattice: rows[total - 1].lattice ? { primary: rows[total - 1].lattice.primary, secondary: rows[total - 1].lattice.secondary } : null } : null;
  return { status: 200, body: { ok: true, spec: REFUSAL_DOORS_SPEC, chain: REFUSAL_CHAIN, total, tip, receipts: out, verify_chain: "chainlock_verify {\"c\":\"refusals\"}", not_recorded: "auth-gate refusals (401, token_*, TOKEN-QUERY-REFUSED, CL-NOT-ISSUER) and 429 rate limits" } };
}

/** OpenAPI (additive): GET /v1/receipts/refusals, the refusal_receipt field and the X-Azrt-Refusal-Receipt header. */
export const REFUSAL_RECEIPT_HEADER_DOC = Object.freeze({
  description:
    "Added to a sealed-door refusal (status >= 400): `sealed; chain=refusals; seq=<n>; h=<64 hex>` or `<receipt_pending|unavailable|rate_limited>; sealed=false`. Never present on auth refusals (401, token_*, TOKEN-QUERY-REFUSED, CL-NOT-ISSUER) or 429.",
  schema: { type: "string" },
});
export function refusalReceiptSchema() {
  return {
    type: "object",
    description:
      "AZRT-REFUSAL-RECEIPT-1.0 receipt added to a refusal body (additive; the refusal's own fields are unchanged). Hash-linked and sealed on the internal `refusals` ChainLock chain with both lattice hashes; not signed. sealed:false never carries a hash.",
    properties: {
      spec: { type: "string", const: "AZRT-REFUSAL-RECEIPT-1.0" },
      kind: { type: "string", const: "refusal" },
      code: { type: "string" },
      sealed: { type: "boolean" },
      status: { type: "string", enum: ["sealed", "receipt_pending", "unavailable", "rate_limited"] },
      chain: { type: "string", const: "refusals" },
      seq: { type: "integer" },
      h: { type: "string", pattern: "^[a-f0-9]{64}$" },
      lattice: { type: "object", properties: { primary: { type: "string" }, secondary: { type: "string" } } },
      replayed: { type: "boolean" },
      surface: { type: "string", enum: ["runtime", "azos", "azinterface"] },
      door: { type: "string" },
      verify: { type: "string" },
      reason: { type: ["string", "null"] },
    },
    required: ["spec", "sealed"],
  };
}
export function refusalOpenApiPaths() {
  return {
    "/v1/receipts/refusals": {
      get: {
        operationId: "refusal_receipts",
        summary:
          "Refusal receipts on the internal `refusals` chain, newest first (limit <= 50), or one by ?seq=N. Rows carry code, kind, surface, door, status, a fixed route template (other paths: wildcard + route_sha256), and both lattice hashes. Verify the chain with chainlock_verify {\"c\":\"refusals\"}; a row with /v1/anchor/row?c=refusals&seq=N. Not signed. Auth refusals and 429s are not recorded.",
        tags: ["runtime"],
        parameters: [
          { name: "seq", in: "query", required: false, schema: { type: "integer", minimum: 1 } },
          { name: "limit", in: "query", required: false, schema: { type: "integer", minimum: 1, maximum: 50 } },
        ],
        responses: {
          "200": { description: "{ok, chain, total, tip, receipts[]} or {ok, receipt}" },
          "404": { description: "REFUSAL-RECEIPT-NOT-FOUND" },
          "503": { description: "REFUSALS-STORE-UNBOUND" },
        },
      },
    },
  };
}
