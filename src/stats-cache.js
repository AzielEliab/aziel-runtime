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

function cacheable(body) {
  return Boolean(body && body.ok === true && body.uses_complete === true);
}

function stamp(body, cachedAt, cached, now) {
  return {
    ...body,
    cache: {
      spec: STATS_CACHE_SPEC,
      cached,
      read_at: new Date(cachedAt).toISOString(),
      age_s: Math.max(0, Math.round((now - cachedAt) / 1000)),
      max_age_s: STATS_TTL_S,
      rule: "Counts are a complete read at read_at, at most max_age_s old. Partial reads are never cached.",
    },
  };
}

/**
 * cachedUses(key, read, { now, cache }) -> body. `read()` does the real KV read.
 * `cache` is a Cache API object (caches.default) or null.
 */
export async function cachedUses(key, read, { now = Date.now(), cache = defaultCache() } = {}) {
  const hit = memo.get(key);
  if (hit && now - hit.at < STATS_TTL_S * 1000) return stamp(hit.body, hit.at, true, now);
  const reqKey = "https://stats-cache.internal/" + encodeURIComponent(key);
  if (cache) {
    try {
      const res = await cache.match(reqKey);
      if (res) {
        const saved = await res.json();
        if (saved && Number.isFinite(saved.at) && now - saved.at < STATS_TTL_S * 1000 && cacheable(saved.body)) {
          memo.set(key, saved);
          return stamp(saved.body, saved.at, true, now);
        }
      }
    } catch {
      /* fall through to a fresh read */
    }
  }
  const body = await read();
  if (!cacheable(body)) return stamp(body, now, false, now);
  const entry = { at: now, body };
  memo.set(key, entry);
  if (cache) {
    try {
      await cache.put(reqKey, new Response(JSON.stringify(entry), { headers: { "content-type": "application/json", "cache-control": `max-age=${STATS_TTL_S}` } }));
    } catch {
      /* the isolate memo still holds it */
    }
  }
  return stamp(body, now, false, now);
}

export function clearStatsMemo() {
  memo.clear();
}

function defaultCache() {
  return typeof caches !== "undefined" && caches && caches.default ? caches.default : null;
}
