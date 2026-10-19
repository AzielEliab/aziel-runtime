/**
 * OFFLINE-RECORDS-1.0 stores addendum, follow-up (AZBot review of #310): the public raw-row pages
 * GET /v1/aznews/rows and GET /v1/4dmap/rows.
 *   - Pages wholly below the signed checkpoint tip never change (rows are append-only and sealed by a
 *     signed checkpoint), so a full page there is cached at the edge (Cache API) and served with
 *     `cache-control: public, max-age=86400, s-maxage=31536000, immutable`. Other pages stay no-store.
 *   - A light per-isolate rate limit (STORE_ROWS_PAGES_PER_MIN per client) applies only to pages that go to
 *     the Durable Object (cache misses); cache hits are free. Over the limit: 429 with Retry-After.
 *   - `?marks=1` (4dmap only) adds per-row view marks for retracted ("hidden") pins, computed live;
 *     such pages are never cached. The rows themselves are never changed or filtered.
 * Read-only, mints nothing, no FragGate op, no MCP tool. Author: Aziel Eliab.
 */
export const STORE_ROWS_SPEC = "OFFLINE-RECORDS-1.0+stores";
export const STORE_ROWS_PAGES_PER_MIN = 60;
export const STORE_ROWS_DEFAULT_LIMIT = 200;
export const STORE_ROWS_MAX_LIMIT = 500;
export const STORE_ROWS_IMMUTABLE = "public, max-age=86400, s-maxage=31536000, immutable";
const CACHE_ORIGIN = "https://store-rows.cache.aziel.internal";

/** Normalized paging (same rule as the DO "rows" op). */
export function normalizePaging(params) {
  const get = (k) => (params && typeof params.get === "function" ? params.get(k) : params && params[k]);
  const from = Math.max(1, Math.floor(Number(get("from"))) || 1);
  const limit = Math.max(1, Math.min(STORE_ROWS_MAX_LIMIT, Math.floor(Number(get("limit"))) || STORE_ROWS_DEFAULT_LIMIT));
  const m = String(get("marks") || "");
  return { from, limit, marks: m === "1" || m === "true" };
}

/** True when a page answer is safe to cache forever: full, ok, and wholly at or below the checkpoint tip. */
export function pageIsImmutable(out, limit) {
  if (!out || out.ok !== true || !Array.isArray(out.rows) || out.marks) return false;
  const tip = Number(out.checkpoint_tip_seq) || 0;
  return out.rows.length === limit && out.count === limit && Number(out.to) <= tip && tip > 0;
}

function cacheKeyFor(name, from, limit) {
  return new Request(`${CACHE_ORIGIN}/v1/${name}/rows?from=${from}&limit=${limit}`, { method: "GET" });
}

/**
 * Serve one rows page. `call(op, payload)` reaches the store DO; `cache` is a Cache API object (caches.default)
 * or null; `rate(key)` returns { ok, retry_after, limit } (defaults to the runtime's isolate limiter).
 */
export async function serveStoreRows(request, env, { name, call, cache = defaultCache(), rate = null, ctx = null, clientKey = null }) {
  const url = new URL(request.url);
  const { from, limit, marks } = normalizePaging(url.searchParams);
  const wantMarks = marks && name === "4dmap";
  const base = { "access-control-allow-origin": "*" };
  const key = wantMarks ? null : cacheKeyFor(name, from, limit);
  if (cache && key) {
    try {
      const hit = await cache.match(key);
      if (hit) {
        const h = new Headers(hit.headers);
        h.set("x-azrt-rows-cache", "hit");
        return new Response(request.method === "HEAD" ? null : hit.body, { status: hit.status, headers: h });
      }
    } catch { /* cache unavailable: fall through to the store */ }
  }
  const limiter = rate || (async (k) => {
    const { takeRateSlot } = await import("./production.js");
    return takeRateSlot(env, "store_rows", k, STORE_ROWS_PAGES_PER_MIN);
  });
  const who = clientKey || request.headers.get("cf-connecting-ip") || "anon";
  const slot = await limiter(who);
  if (slot && slot.ok === false) {
    const retry = String(Math.max(1, Number(slot.retry_after) || 1));
    const body = { ok: false, code: "STORE-ROWS-RATE-LIMIT", error: "rate limit exceeded", scope: "store_rows", limit: slot.limit || STORE_ROWS_PAGES_PER_MIN, window_seconds: 60, retry_after: Number(retry), enforcement: "isolate", note: "Pages below the checkpoint tip are edge-cached and not limited; retry after Retry-After seconds." };
    return new Response(request.method === "HEAD" ? null : JSON.stringify(body), { status: 429, headers: { ...base, "content-type": "application/json; charset=utf-8", "cache-control": "no-store", "retry-after": retry } });
  }
  const out = await call("rows", { from, limit, ...(wantMarks ? { marks: true } : {}) });
  const ok = !(out && out.ok === false);
  const immutable = ok && !wantMarks && pageIsImmutable(out, limit);
  const headers = { ...base, "content-type": "application/json; charset=utf-8", "cache-control": immutable ? STORE_ROWS_IMMUTABLE : "no-store", "x-azrt-rows-cache": immutable ? "miss" : "bypass" };
  const text = JSON.stringify(out);
  const res = new Response(text, { status: ok ? 200 : 503, headers });
  if (immutable && cache && key) {
    const put = cache.put(key, new Response(text, { status: 200, headers })).catch(() => null);
    if (ctx && typeof ctx.waitUntil === "function") ctx.waitUntil(put); else await put;
  }
  return request.method === "HEAD" ? new Response(null, { status: res.status, headers }) : res;
}

function defaultCache() {
  try { return typeof caches !== "undefined" && caches && caches.default ? caches.default : null; } catch { return null; }
}

/**
 * Per-row view marks for a 4dmap page (never part of the rows or their hashes):
 *   { seq, mark: "retraction", hides_seq }        a retraction row (doc.retracted) for an earlier pin
 *   { seq, mark: "hidden", retracted_by_seq }     a pin row whose source id is now retracted
 * `seenGet` returns the store's newest { seq, retracted } per "m:<source_id>".
 */
export async function pinMarks(rows, seenGet) {
  const marks = [];
  const memo = new Map();
  for (const r of rows || []) {
    if (!r || r.kind !== "map_pin" || !r.doc) continue;
    if (r.doc.retracted) { marks.push({ seq: r.seq, mark: "retraction", retracted: String(r.doc.retracted).slice(0, 40), hides_seq: r.doc.supersedes_seq || null }); continue; }
    const sid = r.doc.source_id;
    if (!sid) continue;
    if (!memo.has(sid)) memo.set(sid, await seenGet("m:" + sid).catch(() => null));
    const seen = memo.get(sid);
    if (seen && seen.retracted && Number(seen.seq) > Number(r.seq)) marks.push({ seq: r.seq, mark: "hidden", retracted_by_seq: seen.seq });
  }
  return marks;
}

/** Offline: the same marks from a full row run alone (no live store): a pin is hidden when a later retraction row supersedes it. */
export function hiddenPinsOffline(rows) {
  const hidden = new Map();
  const bySid = new Map();
  for (const r of rows || []) {
    if (!r || r.kind !== "map_pin" || !r.doc || !r.doc.source_id) continue;
    const list = bySid.get(r.doc.source_id) || [];
    if (r.doc.retracted) { for (const s of list) hidden.set(s, r.seq); bySid.set(r.doc.source_id, []); }
    else { list.push(r.seq); bySid.set(r.doc.source_id, list); }
  }
  return hidden;
}
