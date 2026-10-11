/**
 * STATS-CACHE-1.0: GET /v1/stats and /v1/uses read many KV prefixes (seconds under load).
 * Serve a short-lived copy: per isolate first, then the Cache API, then a fresh read.
 * Honesty: only a complete, ok read is cached (uses_complete true). Every body says
 * whether it is cached, when it was read, and the max age. Counts are never edited.
 * No KV or D1 writes. Author: Aziel Eliab only.
 */
export const STATS_CACHE_SPEC = "STATS-CACHE-1.0";
export const STATS_TTL_S = 60;
const memo = new Map();
const highWater = new Map();

function cacheable(body) {
  return Boolean(body && body.ok === true && body.uses_complete === true);
}

function stamp(body, cachedAt, cached, now, held = false) {
  return {
    ...body,
    cache: {
      spec: STATS_CACHE_SPEC,
      cached,
      read_at: new Date(cachedAt).toISOString(),
      age_s: Math.max(0, Math.round((now - cachedAt) / 1000)),
      max_age_s: STATS_TTL_S,
      monotonic: true,
      held_high_water: held,
      rule: "Counts are a complete read at read_at, at most max_age_s old. Partial reads are never cached. Counts never go backwards: a lower read is not served over a higher count already served.",
    },
  };
}

/** Count used for the monotonic rule: the total `uses`. */
function countOf(body) {
  const n = Number(body && body.uses);
  return Number.isFinite(n) ? n : -1;
}

/** Pick the entry to serve: never one with a lower count than `high`; ties go to the newer read. */
function pickEntry(a, b) {
  if (!a) return b || null;
  if (!b) return a;
  const ca = countOf(a.body);
  const cb = countOf(b.body);
  if (ca !== cb) return ca > cb ? a : b;
  return a.at >= b.at ? a : b;
}

/**
 * cachedUses(key, read, { now, cache }) -> body. `read()` does the real KV read.
 * `cache` is a Cache API object (caches.default) or null.
 * STATS-MONOTONIC-1.0: serve the newest of the isolate memo and the shared cache entry, track
 * the highest count already served per key, and never serve a lower one (KV reads are
 * eventually consistent, so a fresh read can lag a count already shown).
 */
async function cachedUsesLocal(key, read, { now = Date.now(), cache = defaultCache() } = {}) {
  const fresh = (e) => e && Number.isFinite(e.at) && now - e.at < STATS_TTL_S * 1000 && cacheable(e.body);
  const reqKey = "https://stats-cache.internal/" + encodeURIComponent(key);
  const local = memo.get(key) || null;
  let shared = null;
  if (cache) {
    try {
      const res = await cache.match(reqKey);
      if (res) shared = await res.json();
    } catch {
      shared = null;
    }
  }
  const high = pickEntry(highWater.get(key), pickEntry(local, shared));
  if (high) highWater.set(key, high);
  // Newest fresh entry of local and shared; lifted to the high-water mark if it is lower.
  const fl = fresh(local) ? local : null;
  const fs = fresh(shared) ? shared : null;
  const newest = fl && fs ? (fl.at >= fs.at ? fl : fs) : fl || fs;
  if (newest) {
    const serve = high && countOf(high.body) > countOf(newest.body) ? high : newest;
    memo.set(key, newest);
    return stamp(serve.body, serve.at, true, now, serve !== newest);
  }
  const body = await read();
  const entry = { at: now, body };
  if (!cacheable(body)) {
    if (high && countOf(high.body) > countOf(body)) return stamp(high.body, high.at, true, now, true);
    highWater.set(key, entry); // served, so it is the floor; still never cached
    return stamp(body, now, false, now);
  }
  const best = pickEntry(high, entry);
  highWater.set(key, best);
  memo.set(key, best);
  if (cache) {
    try {
      await cache.put(reqKey, new Response(JSON.stringify(best), { headers: { "content-type": "application/json", "cache-control": `max-age=${STATS_TTL_S}` } }));
    } catch {
      /* the isolate memo still holds it */
    }
  }
  return stamp(best.body, best.at, best !== entry, now, best !== entry);
}

/**
 * STATS-FLOOR-1.0: one shared floor per key in a Durable Object (no KV). The floor is the highest
 * `uses` ever served by any isolate in any colo.
 * Every request makes exactly one DO call, raise(key, candidate), which atomically sets the floor
 * to max(floor, candidate) and returns it (a write only when the count rises). The served count is
 * that returned max, so no request anywhere can serve below a count already served. Cost: one DO
 * request per /v1/stats or /v1/uses request (the expensive KV read stays cached for 60s). A
 * time-throttled floor is cheaper but lets a colo serve a stale lower count, so it is not used.
 * Fail closed: no CHAINLOCK binding, or the DO call fails -> no count is served (HTTP 503).
 * by_host/by_path/by_day/by_method/by_op are the raw read and are labelled as such.
 */
export const STATS_FLOOR_UNAVAILABLE = "STATS-FLOOR-UNAVAILABLE";
export const STATS_FLOOR_RETRY_S = 5;
export const BREAKDOWN_NOTE = "raw, may lag total: per-host/path/day/method/op maps are the KV read at read_at; uses is lifted to the shared floor.";
export { cachedUsesLocal };
export async function cachedUses(key, read, { now = Date.now(), cache = defaultCache(), floor = null } = {}) {
  const refuse = (why) => ({ ok: false, code: STATS_FLOOR_UNAVAILABLE, reason: why, retry_after_s: STATS_FLOOR_RETRY_S, message: "The shared stats floor (Durable Object) could not be read, so no count was served. Retry shortly.", spec: "STATS-FLOOR-1.0" });
  if (!floor || typeof floor.raise !== "function") return refuse("unbound");
  const body = await cachedUsesLocal(key, read, { now, cache });
  const candidate = Math.max(0, countOf(body), countOf((highWater.get(key) || {}).body));
  let f;
  try {
    const got = await floor.raise(key, candidate);
    f = Number(got && got.floor);
    if (!got || got.ok !== true || !Number.isFinite(f)) return refuse("bad-reply");
  } catch {
    return refuse("unreachable");
  }
  const served = Math.max(f, candidate);
  const out = { ...body, breakdown: BREAKDOWN_NOTE, cache: { ...body.cache, floor_spec: "STATS-FLOOR-1.0", floor_shared: true, uses_floor_applied: served > countOf(body) } };
  if (served > countOf(body)) out.uses_read = body.uses;
  out.uses = served;
  return out;
}

export function clearStatsMemo() {
  memo.clear();
  highWater.clear();
}

function defaultCache() {
  return typeof caches !== "undefined" && caches && caches.default ? caches.default : null;
}

/** The shared floor lives on the CHAINLOCK Durable Object namespace ("__statsfloor__"). No KV. */
export function statsFloorFor(env) {
  const ns = env && env.CHAINLOCK;
  if (!ns || typeof ns.idFromName !== "function" || typeof ns.get !== "function") return null;
  return {
    async raise(key, uses) {
      const stub = ns.get(ns.idFromName("__statsfloor__"));
      const res = await stub.fetch(new Request("https://chainwriter.internal/floor", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ key, uses }) }));
      return res.json();
    },
  };
}
