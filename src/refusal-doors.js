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
 * Flood guard: sealRefusal's minute idempotency key (code + door + method + status; the caller-shaped
 * route is recorded but left out of the key, so the first route in that minute is the one kept), an
 * in-isolate memo so a replay inside the minute costs no Durable Object call, and an in-isolate cap
 * of REFUSAL_HTTP_CAP_PER_MIN new seals per minute (over the cap: receipt status rate_limited).
 * Fail closed: the refusal response is never changed into success; a failed or slow write is
 * reported as sealed:false with status unavailable or receipt_pending, never an invented receipt.
 * Additive only: the refusal body keeps every field; `refusal_receipt` is added (JSON bodies) and
 * the header X-Azrt-Refusal-Receipt is added (all bodies, e.g. install.sh text refusals).
 * Author: Aziel Eliab.
 */

export const REFUSAL_DOORS_SPEC = "AZRT-REFUSAL-RECEIPT-1.0+doors";
export const REFUSAL_HTTP_CAP_PER_MIN = 60;
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

/** Collapse ids so one door cannot mint unbounded distinct keys. At most 4 segments. */
export function routeTemplate(pathname) {
  const segs = String(pathname || "/").split("/").filter(Boolean).slice(0, 4);
  const out = segs.map((s, i) => {
    if (i < 2 && /^[a-z][a-z0-9._-]{0,31}$/.test(s)) return s;
    if (/^(sess_[a-f0-9]+|[a-f0-9]{16,}|[0-9a-f-]{32,36}|\d+)$/i.test(s)) return ":id";
    if (i >= 2 && !/^[a-z][a-z0-9._-]{0,31}$/.test(s)) return ":x";
    return s;
  });
  return "/" + out.join("/");
}

export function refusalFromBody(status, contentType, text) {
  const ct = String(contentType || "");
  if (/json/i.test(ct)) {
    let body;
    try { body = JSON.parse(text); } catch { return null; }
    if (!body || typeof body !== "object" || Array.isArray(body)) return null;
    if (body.refusal_receipt != null || body.refused_receipt != null) return { already: true, body };
    const code = typeof body.code === "string" ? body.code : (typeof body.refuse === "string" ? body.refuse : null);
    if (!code || !CODE_RE.test(code)) return null;
    const reason = typeof body.message === "string" ? body.message : (typeof body.error === "string" ? body.error : (typeof body.reason === "string" ? body.reason : ""));
    return { code, reason: reason.slice(0, 160), body };
  }
  // MESH-ONBOARD install.sh refusal: `echo 'CODE' >&2; exit 1`
  const m = /^#!\/bin\/sh\s*\necho '([A-Za-z][A-Za-z0-9_-]{1,63})' >&2/.exec(String(text || ""));
  if (m) return { code: m[1], reason: "install script refused", body: null, text: true };
  return null;
}

// In-isolate memo + cap (flood guard). Keyed by minute.
const memo = { minute: -1, sealed: 0, views: new Map() };
function memoFor(minute) {
  if (memo.minute !== minute) { memo.minute = minute; memo.sealed = 0; memo.views = new Map(); }
  return memo;
}
export function _resetRefusalMemo() { memo.minute = -1; memo.sealed = 0; memo.views = new Map(); }

/**
 * Seal one door refusal through receipt-guard sealRefusal. Returns the receipt view.
 * `surface` is "runtime" for this Worker's own doors, or a PEER_SURFACES name.
 */
export async function sealDoorRefusal(store, { surface = "runtime", door, code, reason, method, route, status }, { ctx, now = Date.now(), budgetMs = REFUSAL_SEAL_BUDGET_MS } = {}) {
  const { sealRefusal, REFUSAL_SPEC, REFUSAL_CHAIN } = await import("./receipt-guard.js");
  const minute = Math.floor(now / 60000);
  const m = memoFor(minute);
  // Dedupe key leaves the route out (it is caller-shaped); codes and doors are a finite set.
  const key = [surface, door, code, method, status].join("|");
  const extra = { kind: "refusal", surface, door, reason: String(reason || "").slice(0, 160), status: Number(status) || null, route };
  if (m.views.has(key)) return { ...m.views.get(key), replayed: true, memo: true };
  if (!store) return { spec: REFUSAL_SPEC, kind: "refusal", sealed: false, status: "unavailable", reason: "no durable store in this isolate" };
  if (m.sealed >= REFUSAL_HTTP_CAP_PER_MIN) {
    return { spec: REFUSAL_SPEC, kind: "refusal", sealed: false, status: "rate_limited", reason: `refusal seal cap ${REFUSAL_HTTP_CAP_PER_MIN}/min reached in this isolate; the refusal still stands` };
  }
  m.sealed++;
  const work = sealRefusal(store, {
    code, tool: surface === "runtime" ? "http" : surface, slug: door, op: method,
    args: { door, status: Number(status) || null }, minuteBucket: minute, extra,
  });
  let timer;
  const timeout = new Promise((r) => { timer = setTimeout(() => r(null), budgetMs); });
  const view = await Promise.race([work, timeout]);
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

/** Wrap a finished runtime response: seal non-auth refusals on the listed doors (additive). */
export async function withDoorRefusalReceipt(request, response, { store, ctx } = {}) {
  try {
    if (!response || Number(response.status) < 400 || Number(response.status) === 429) return response;
    const method = String((request && request.method) || "GET").toUpperCase();
    if (method === "OPTIONS" || method === "HEAD") return response;
    const url = new URL(request.url);
    const door = doorOf(url.pathname);
    if (!door) return response;
    const ct = response.headers.get("content-type") || "";
    const len = Number(response.headers.get("content-length") || 0);
    if (len > 65536) return response;
    const text = await response.clone().text();
    if (text.length > 65536) return response;
    const ref = refusalFromBody(response.status, ct, text);
    if (!ref || ref.already) return response;
    if (isAuthRefusal(response.status, ref.code)) return response;
    const view = await sealDoorRefusal(store, { surface: "runtime", door, code: ref.code, reason: ref.reason, method, route: routeTemplate(url.pathname), status: response.status }, { ctx });
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
  const method = String(b.method || "GET").toUpperCase().slice(0, 8);
  const route = routeTemplate(String(b.route || "/"));
  const view = await sealDoorRefusal(store, { surface, door: surface, code, reason: String(b.reason || ""), method, route, status: Number(b.status) || 400 }, { ctx });
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
