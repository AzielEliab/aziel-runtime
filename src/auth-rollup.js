/**
 * AZRT-AUTH-ROLLUP-1.0: login / token refusals as ONE count-only rollup receipt per minute per door + code.
 *
 * Auth-gate refusals (token_required, token_mismatch, token_not_configured, TOKEN-QUERY-REFUSED,
 * TOKEN-BODY-REFUSED, CL-NOT-ISSUER on stale/revoke/pause/resume, SESSION-PAUSED, any other 401) are
 * still never sealed one by one (RIB-018: a row per failed login would be a flood door and a caller log).
 * Instead each one adds 1 to a counter keyed (minute, door, code). After the minute closes, the cron
 * seals one row per (door, code) on the internal `refusals` ChainLock chain through the SAME
 * receipt-guard sealRefusal path (dual lattice, append-only, internal writer):
 *   refusal { spec AZRT-REFUSAL-RECEIPT-1.0, kind:"auth_rollup", rollup_spec, code, door, count,
 *             count_capped, minute, window_s:60, reason:null, reason_sha256 (of the fixed reason) }
 * No caller identity, no IP, no token, no route text, no body text: door and code come from fixed
 * lists in this file; anything else is folded into a fixed bucket.
 * Flood guard: one row per (door, code) per minute, at most AUTH_ROLLUP_ROWS_PER_MIN rows a minute plus
 * one overflow row; counters are capped; the request path makes at most one counter call in flight per
 * key per isolate (the rest are coalesced into the next call).
 * Fail closed: the refusal response is never changed (one additive header). If counting is unavailable
 * the header says so; if a seal fails the minute is retried by the next tick (same idempotency key,
 * so no duplicate rows), and nothing is ever invented.
 * Author: Aziel Eliab.
 */

export const AUTH_ROLLUP_SPEC = "AZRT-AUTH-ROLLUP-1.0";
export const AUTH_ROLLUP_ROWS_PER_MIN = 8;
export const AUTH_ROLLUP_COUNT_CAP = 100_000;
export const AUTH_ROLLUP_TTL_S = 6 * 3600;
export const AUTH_ROLLUP_GRACE_MIN = 2;
export const AUTH_ROLLUP_MINUTES_PER_TICK = 10;
export const AUTH_ROLLUP_COUNT_BUDGET_MS = 300;
export const AUTH_ROLLUP_HEADER = "X-Azrt-Auth-Rollup";
const ISO_PENDING_CAP = 256;
const P = "authroll|";

/** Fixed code list and the one fixed reason each row hashes (reason text is never stored). */
export const AUTH_ROLLUP_REASONS = Object.freeze({
  token_required: "Runtime token required. Nothing ran.",
  token_mismatch: "Runtime token did not match. Nothing ran.",
  token_not_configured: "Runtime token is not configured on this deploy. Nothing ran.",
  "TOKEN-QUERY-REFUSED": "A token in the URL query is refused. Nothing ran.",
  "TOKEN-BODY-REFUSED": "A token in the request body is refused. Nothing ran.",
  "CL-NOT-ISSUER": "Only the issuer key may do this. Nothing ran.",
  "SESSION-PAUSED": "The session is paused. Nothing ran.",
  "TOKEN-OTHER": "Another token refusal. Nothing ran.",
  "HTTP-401-AUTH": "Unauthorized. Nothing ran.",
  "AUTH-ROLLUP-OVERFLOW": "More door and code pairs than the rollup row cap this minute; summed here.",
});
export const AUTH_ROLLUP_CODES = Object.freeze(Object.keys(AUTH_ROLLUP_REASONS).filter((c) => c !== "AUTH-ROLLUP-OVERFLOW"));

/** Fixed door labels. Session doors are split by action so stale/revoke/pause/resume refusals show. */
export const AUTH_ROLLUP_DOORS = Object.freeze([
  "mcp", "session-open", "session-exec", "session-stale", "session-revoke", "session-stop", "session-pause", "session-resume", "session-close", "session",
  "fraggate", "mesh", "chainlock", "memory", "tether", "workspace", "other",
]);

export function rollupDoor(pathname) {
  const p = String(pathname || "/").replace(/\/+$/, "") || "/";
  if (p === "/mcp" || p.startsWith("/mcp/")) return "mcp";
  if (p === "/v1/session/open") return "session-open";
  const m = /^\/v1\/session\/[^/]+\/([a-z]+)$/.exec(p);
  if (m) {
    const a = m[1];
    if (["exec", "stale", "revoke", "stop", "pause", "resume", "close"].includes(a)) return "session-" + a;
    return "session";
  }
  if (p === "/v1/session" || p.startsWith("/v1/session/")) return "session";
  for (const [pre, d] of [["/v1/fraggate", "fraggate"], ["/v1/mesh", "mesh"], ["/v1/chainlock", "chainlock"], ["/v1/memory", "memory"], ["/v1/tether", "tether"], ["/workspace", "workspace"], ["/v1/workspace", "workspace"]]) {
    if (p === pre || p.startsWith(pre + "/")) return d;
  }
  return "other";
}

/** Fixed rollup code for a refusal, or null when it is not an auth refusal. */
export function rollupCode(status, code) {
  const c = typeof code === "string" ? code : "";
  if (c && AUTH_ROLLUP_CODES.includes(c) && c !== "TOKEN-OTHER" && c !== "HTTP-401-AUTH") return c;
  if (c && /token/i.test(c)) return "TOKEN-OTHER";
  if (Number(status) === 401) return "HTTP-401-AUTH";
  return null;
}

const minuteOf = (now) => Math.floor(now / 60000);
const counterKey = (m, door, code) => `${P}c|${m}|${door}|${code}`;
const markKey = (m) => `${P}m|${m}`;
const doneKey = (m) => `${P}d|${m}`;

// In-isolate coalescing: at most one counter call in flight per key; later hits ride the next call.
const iso = new Map();
export function _resetAuthRollupIsolate() { iso.clear(); }

function bump(kv, key, mark) {
  let p = iso.get(key);
  if (!p) {
    if (iso.size >= ISO_PENDING_CAP) return null;
    p = { delta: 0, run: null };
    iso.set(key, p);
  }
  p.delta += 1;
  if (!p.run) {
    p.run = (async () => {
      let last = null;
      try {
        while (p.delta > 0) {
          const by = p.delta;
          p.delta = 0;
          try {
            last = await kv.incr(key, by, { cap: AUTH_ROLLUP_COUNT_CAP, ttl: AUTH_ROLLUP_TTL_S, mark });
          } catch (err) {
            p.delta += by; // not counted yet: the next hit retries it
            throw err;
          }
        }
        return last;
      } finally {
        p.run = null;
        if (!p.delta) iso.delete(key);
      }
    })();
  }
  return p.run;
}

/**
 * Count one auth refusal. Returns { status: counted|pending|unavailable|rate_limited, minute, door, code }.
 * `kv` is env.USES routed through RUNTIME_KV (needs the atomic incr); anything else is unavailable.
 */
export async function countAuthRefusal(env, { door, code, now = Date.now(), ctx = null, budgetMs = AUTH_ROLLUP_COUNT_BUDGET_MS }) {
  const minute = minuteOf(now);
  const base = { spec: AUTH_ROLLUP_SPEC, minute, door, code };
  const kv = env && env.USES;
  if (!kv || typeof kv.incr !== "function") return { ...base, status: "unavailable", reason: "no durable counter (RUNTIME_KV) in this isolate; the refusal still stands" };
  if (!AUTH_ROLLUP_DOORS.includes(door) || !AUTH_ROLLUP_CODES.includes(code)) return { ...base, status: "unavailable", reason: "not a rollup door/code" };
  const work = bump(kv, counterKey(minute, door, code), markKey(minute));
  if (!work) return { ...base, status: "rate_limited", reason: "rollup counter queue full in this isolate; the refusal still stands" };
  let timer;
  const timeout = new Promise((r) => { timer = setTimeout(() => r("__pending"), Math.max(0, budgetMs)); });
  const got = await Promise.race([work.then(() => "ok", () => "err"), timeout]);
  clearTimeout(timer);
  if (got === "__pending") {
    if (ctx && typeof ctx.waitUntil === "function") ctx.waitUntil(work.catch(() => null));
    return { ...base, status: "pending" };
  }
  return got === "ok" ? { ...base, status: "counted" } : { ...base, status: "unavailable", reason: "counter write failed; the refusal still stands" };
}

/** OpenAPI components.headers entry for X-Azrt-Auth-Rollup (additive). */
export const AUTH_ROLLUP_HEADER_DOC = Object.freeze({
  description:
    "Added to a login/token refusal (401, token_*, TOKEN-QUERY-REFUSED, TOKEN-BODY-REFUSED, CL-NOT-ISSUER, SESSION-PAUSED): `<counted|pending|unavailable|rate_limited>; spec=AZRT-AUTH-ROLLUP-1.0; minute=<unix minute>; door=<fixed door>; code=<fixed code>`. The refusal is counted, not sealed one by one: the cron seals one count-only row per minute per door + code on the refusals chain (no caller identity, token or text). Find: GET /v1/receipts/refusals. Never on 429, OPTIONS or responses carrying X-Azrt-Refusal-Receipt.",
  schema: { type: "string", pattern: "^(counted|pending|unavailable|rate_limited); spec=AZRT-AUTH-ROLLUP-1\\.0; minute=\\d+; door=[a-z-]+; code=[A-Za-z0-9_-]+$" },
});

/** Body bytes read to find the refusal code; larger bodies are not parsed (code from status only). */
export const AUTH_ROLLUP_BODY_MAX = 65536;

/** Read a response body as text, at most `max` bytes, streaming. Returns null past the limit (reader cancelled). */
export async function readCappedText(response, max = AUTH_ROLLUP_BODY_MAX) {
  if (!response || !response.body) return "";
  const reader = response.body.getReader();
  const parts = [];
  let total = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value ? value.byteLength : 0;
      // Not awaited: cancelling one branch of a tee (response.clone()) settles only when both branches
      // are cancelled, and the client's branch must stay open.
      if (total > max) { reader.cancel().catch(() => {}); return null; }
      if (value) parts.push(value);
    }
  } finally {
    try { reader.releaseLock(); } catch { /* ignore */ }
  }
  const buf = new Uint8Array(total);
  let off = 0;
  for (const p of parts) { buf.set(p, off); off += p.byteLength; }
  return new TextDecoder().decode(buf);
}

/** Wrap a finished response (additive header only). Never changes status or body. */
export async function withAuthRollup(request, response, { env, ctx, now = Date.now(), budgetMs = AUTH_ROLLUP_COUNT_BUDGET_MS } = {}) {
  try {
    if (!response || Number(response.status) < 400 || Number(response.status) === 429) return response;
    const method = String((request && request.method) || "GET").toUpperCase();
    if (method === "OPTIONS") return response;
    if (response.headers.get("X-Azrt-Refusal-Receipt")) return response; // already sealed one by one: not an auth refusal
    const url = new URL(request.url);
    if (url.hostname === "peer.aziel.internal") return response;
    let bodyCode = null;
    const ct = response.headers.get("content-type") || "";
    const len = Number(response.headers.get("content-length") || 0);
    if (/json/i.test(ct) && len <= AUTH_ROLLUP_BODY_MAX) {
      // The 64 KB limit holds while streaming too (bodies with no content-length): stop and skip the
      // body code past the limit, so a large body is never read whole (AZBot #307 follow-up).
      const text = await readCappedText(response.clone(), AUTH_ROLLUP_BODY_MAX);
      if (text != null) {
        try { const b = JSON.parse(text); if (b && typeof b === "object" && typeof b.code === "string") bodyCode = b.code; } catch { /* not JSON */ }
      }
    }
    const code = rollupCode(response.status, bodyCode);
    if (!code) return response;
    const door = rollupDoor(url.pathname);
    const out = await countAuthRefusal(env, { door, code, now, ctx, budgetMs });
    const headers = new Headers(response.headers);
    headers.set(AUTH_ROLLUP_HEADER, `${out.status}; spec=${AUTH_ROLLUP_SPEC}; minute=${out.minute}; door=${door}; code=${code}`);
    return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
  } catch {
    return response; // fail closed: the refusal stands unchanged
  }
}

async function reasonSha(code) {
  const { sha256Hex } = await import("./session-core.js");
  return sha256Hex(AUTH_ROLLUP_REASONS[code]);
}

async function sealOne(store, { minute, door, code, count, capped, combos = null }) {
  const { sealRefusal } = await import("./receipt-guard.js");
  return sealRefusal(store, {
    code, tool: "auth-rollup", slug: door, op: "rollup",
    args: { door, code, minute }, minuteBucket: minute, trustedNames: true,
    extra: {
      kind: "auth_rollup", rollup_spec: AUTH_ROLLUP_SPEC, surface: "runtime", door, reason: null,
      reason_sha256: await reasonSha(code), count, count_capped: Boolean(capped), minute, window_s: 60,
      ...(combos != null ? { combos } : {}),
    },
  });
}

/**
 * Seal closed minutes (cron). One row per (door, code) with count > 0, at most AUTH_ROLLUP_ROWS_PER_MIN
 * rows plus one overflow row per minute. Marks a minute done only when every row sealed.
 */
export async function flushAuthRollups(env, store, { now = Date.now(), maxMinutes = AUTH_ROLLUP_MINUTES_PER_TICK } = {}) {
  const kv = env && env.USES;
  if (!kv || typeof kv.scan !== "function" || typeof kv.incr !== "function") return { ok: false, code: "AUTH-ROLLUP-UNBOUND", spec: AUTH_ROLLUP_SPEC };
  if (!store) return { ok: false, code: "AUTH-ROLLUP-STORE-UNBOUND", spec: AUTH_ROLLUP_SPEC };
  const cutoff = minuteOf(now) - AUTH_ROLLUP_GRACE_MIN;
  const marks = await kv.scan(`${P}m|`, "", 1000);
  const minutes = ((marks && marks.entries) || []).map(([k]) => Number(String(k).slice(`${P}m|`.length))).filter((m) => Number.isInteger(m) && m <= cutoff).sort((a, b) => a - b).slice(0, maxMinutes);
  const report = [];
  let shareFull = false;
  for (const minute of minutes) {
    if (await kv.get(doneKey(minute))) { await kv.delete(markKey(minute)); report.push({ minute, status: "already_done" }); continue; }
    const page = await kv.scan(`${P}c|${minute}|`, "", 1000);
    const rows = [];
    for (const [k, v] of (page && page.entries) || []) {
      const [door, code] = String(k).slice(`${P}c|${minute}|`.length).split("|");
      const count = Math.max(0, Math.floor(Number(v)) || 0);
      if (!count || !AUTH_ROLLUP_DOORS.includes(door) || !AUTH_ROLLUP_CODES.includes(code)) continue;
      rows.push({ key: k, door, code, count, capped: count >= AUTH_ROLLUP_COUNT_CAP });
    }
    rows.sort((a, b) => b.count - a.count || (a.door + a.code < b.door + b.code ? -1 : 1));
    const top = rows.slice(0, AUTH_ROLLUP_ROWS_PER_MIN);
    const rest = rows.slice(AUTH_ROLLUP_ROWS_PER_MIN);
    const views = [];
    let allSealed = true;
    for (const r of top) {
      const v = await sealOne(store, { minute, door: r.door, code: r.code, count: r.count, capped: r.capped });
      views.push({ door: r.door, code: r.code, count: r.count, sealed: Boolean(v && v.sealed), seq: v && v.seq, replayed: Boolean(v && v.replayed), ...(v && v.status === "rate_limited" ? { status: "rate_limited" } : {}) });
      if (!v || !v.sealed) allSealed = false;
      if (v && v.status === "rate_limited") { shareFull = true; break; }
    }
    if (rest.length && !shareFull) {
      const sum = Math.min(AUTH_ROLLUP_COUNT_CAP, rest.reduce((a, r) => a + r.count, 0));
      const v = await sealOne(store, { minute, door: "other", code: "AUTH-ROLLUP-OVERFLOW", count: sum, capped: sum >= AUTH_ROLLUP_COUNT_CAP || rest.some((r) => r.capped), combos: rest.length });
      views.push({ door: "other", code: "AUTH-ROLLUP-OVERFLOW", count: sum, combos: rest.length, sealed: Boolean(v && v.sealed), seq: v && v.seq });
      if (!v || !v.sealed) allSealed = false;
      if (v && v.status === "rate_limited") shareFull = true;
    }
    if (allSealed) {
      await kv.put(doneKey(minute), "1", { expirationTtl: 86400 });
      for (const r of rows) await kv.delete(r.key);
      await kv.delete(markKey(minute));
    }
    report.push({ minute, status: allSealed ? "sealed" : "retry_next_tick", rows: views, ...(shareFull ? { reason: "rollup share 9/min in the writer is spent this minute; later minutes wait for the next tick" } : {}) });
    // The writer's rollup share (9/min) is spent: stop this tick; older minutes go first next tick.
    if (shareFull) break;
  }
  return { ok: true, spec: AUTH_ROLLUP_SPEC, minutes: report };
}
