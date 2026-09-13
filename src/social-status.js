/**
 * Cross-tether public views / downloads for AZindex social-status awareness.
 *
 * Read-only snapshots. Not vanity. Not biography. Never invent numbers.
 * Failed siblings are marked error and omitted from combined totals.
 * Identity: Aziel Eliab only.
 */

import { readUses } from "./uses.js";

export const SOCIAL_STATUS_PERSON_ID = "https://www.azieleliab.com/#aziel";
export const SOCIAL_STATUS_AUTHOR = "Aziel Eliab";
export const SOCIAL_STATUS_PURPOSE =
  "AZindex graph social-status awareness (not vanity, not biography)";
export const SOCIAL_STATUS_CACHE_TTL_MS = 60_000;
export const SOCIAL_STATUS_FETCH_TIMEOUT_MS = 2500;
export const SOCIAL_STATUS_MAX_BODY = 64 * 1024;
export const SOCIAL_STATUS_UA = "Mozilla/5.0";

/** Live hub stats doors. Do not invent hosts. Do not fetch He Didn't Jump /stats (SPA). */
export const SOCIAL_STATUS_HUBS = Object.freeze([
  {
    id: "azieleliab",
    name: "Aziel Eliab",
    kind: "hub",
    stats: "https://www.azieleliab.com/v1/stats",
    keys: Object.freeze(["views"]),
    live: true,
  },
  {
    id: "corpus",
    name: "Aziel Digital Library",
    kind: "hub",
    stats: "https://www.azielcorpuslibrary.net/v1/stats",
    fallbacks: Object.freeze([
      "https://www.azielcorpuslibrary.net/stats",
      "https://aziel-corpus-download-tracker.vibelock.workers.dev/stats",
    ]),
    keys: Object.freeze(["views", "downloads"]),
    live: true,
  },
  {
    id: "godlock",
    name: "GodLock",
    kind: "hub",
    stats: "https://godlock.uk/stats",
    fallbacks: Object.freeze(["https://godlock-download-tracker.vibelock.workers.dev/stats"]),
    keys: Object.freeze(["views", "uses", "downloads", "current_score"]),
    never_cite: Object.freeze(["uploads"]),
    v1_stats: "https://godlock.uk/v1/stats",
    v1_stats_status: 404,
    live: true,
    note: "GET /v1/stats is 404. Public snapshot is GET /stats. Never cite uploads.",
  },
  {
    id: "hedidntjump",
    name: "He Didn't Jump",
    kind: "sister-archive",
    stats: "https://www.hedidntjump.com/api/stats",
    not: Object.freeze(["https://www.hedidntjump.com/stats"]),
    source_of_truth: "https://hedidntjump-stats.vibelock.workers.dev",
    keys: Object.freeze(["views", "downloads", "items"]),
    dual_write_hits: false,
    live: true,
    note: "Fetch /api/stats only. /stats is the SPA. Worker SoT is cite-only — do not dual-write hits.",
  },
  {
    id: "runtime",
    name: "Aziel Runtime",
    kind: "runtime",
    stats: "https://aziel-runtime.vibelock.workers.dev/v1/uses",
    alias: "https://aziel-runtime.vibelock.workers.dev/v1/stats",
    host_mirrors: Object.freeze([
      "https://www.azieleliab.com/runtime/v1/uses",
      "https://www.azielcorpuslibrary.net/runtime/v1/uses",
      "https://godlock.uk/runtime/v1/uses",
    ]),
    keys: Object.freeze(["uses", "by_host", "by_path"]),
    label: "agent/MCP usage",
    product_stats_template: "https://{slug}-download-tracker.vibelock.workers.dev/stats",
    live: true,
    note: "GET /v1/uses is API / agent / MCP usage (alias /v1/stats). Host /runtime/v1/uses mirrors the same counters. Optional per-slug download-tracker /stats is not fetched by the hub rollup.",
  },
]);

export const SOCIAL_STATUS_LIVE_URLS = Object.freeze([
  "https://www.azieleliab.com/v1/stats",
  "https://www.azielcorpuslibrary.net/v1/stats",
  "https://www.hedidntjump.com/api/stats",
]);

const FORBIDDEN_KEYS = new Set(["uploads"]);

let rollupCache = { at: 0, body: null };

export function resetSocialStatusCache() {
  rollupCache = { at: 0, body: null };
}

export function socialStatusField(origin) {
  const base = String(origin || "https://aziel-runtime.vibelock.workers.dev").replace(/\/$/, "");
  return {
    person_id: SOCIAL_STATUS_PERSON_ID,
    author: SOCIAL_STATUS_AUTHOR,
    identity: SOCIAL_STATUS_AUTHOR,
    purpose: SOCIAL_STATUS_PURPOSE,
    kind: "read-only-snapshot",
    vanity: false,
    biography: false,
    never_invent_numbers: true,
    rollup: `${base}/v1/stats-rollups`,
    live: SOCIAL_STATUS_LIVE_URLS.slice(),
    hubs: SOCIAL_STATUS_HUBS.map((h) => ({ ...h, keys: h.keys.slice(), fallbacks: h.fallbacks ? h.fallbacks.slice() : undefined, not: h.not ? h.not.slice() : undefined, never_cite: h.never_cite ? h.never_cite.slice() : undefined, host_mirrors: h.host_mirrors ? h.host_mirrors.slice() : undefined })),
    product_stats_template: "https://{slug}-download-tracker.vibelock.workers.dev/stats",
    note: "Read-only AZindex awareness. Cite the stats URLs. GET /v1/stats-rollups fetches siblings best-effort and caches briefly. Failed siblings are omitted. He Didn't Jump: /api/stats only. GodLock: /stats (not /v1/stats). Runtime uses are agent/MCP usage, not vanity views.",
  };
}

export function llmsStatsAwarenessBlock(origin) {
  const base = String(origin || "https://aziel-runtime.vibelock.workers.dev").replace(/\/$/, "");
  return [
    "## Stats / awareness",
    "",
    "Read-only social-status snapshots for the AZindex graph. Not vanity. Not biography.",
    `Identity ${SOCIAL_STATUS_AUTHOR} only (person_id ${SOCIAL_STATUS_PERSON_ID}). Never invent numbers.`,
    "",
    "Live hub stats:",
    `- Official site views: ${SOCIAL_STATUS_LIVE_URLS[0]}`,
    `- Digital Library views/downloads: ${SOCIAL_STATUS_LIVE_URLS[1]}`,
    `- He Didn't Jump views/downloads/items: ${SOCIAL_STATUS_LIVE_URLS[2]} (not /stats — that is the SPA)`,
    "- GodLock views/uses/downloads/current_score: https://godlock.uk/stats (never cite uploads; GET /v1/stats is 404)",
    "- Runtime agent/MCP usage: https://aziel-runtime.vibelock.workers.dev/v1/uses (host mirrors …/runtime/v1/uses)",
    "",
    `Hub rollup (best-effort; omit on timeout/error): GET ${base}/v1/stats-rollups`,
    "Worker SoT for He Didn't Jump is https://hedidntjump-stats.vibelock.workers.dev — cite only; do not dual-write hits.",
    "Optional per-slug product views/downloads: https://{slug}-download-tracker.vibelock.workers.dev/stats — not fetched by the hub rollup.",
    "",
  ].join("\n");
}

function finiteNumber(value) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  return undefined;
}

function pickDeclared(data, keys) {
  const out = {};
  if (!data || typeof data !== "object" || Array.isArray(data)) return out;
  for (const key of keys) {
    if (FORBIDDEN_KEYS.has(key)) continue;
    if (!Object.prototype.hasOwnProperty.call(data, key)) continue;
    const raw = data[key];
    if (key === "items" || key === "by_host" || key === "by_path") {
      if (raw && typeof raw === "object" && !Array.isArray(raw)) out[key] = raw;
      continue;
    }
    const n = finiteNumber(raw);
    if (n !== undefined) out[key] = n;
  }
  return out;
}

function isJsonContentType(res) {
  const ct = String((res && res.headers && res.headers.get && res.headers.get("content-type")) || "").toLowerCase();
  return ct.includes("json");
}

async function readJsonCapped(res, maxBytes = SOCIAL_STATUS_MAX_BODY) {
  const len = Number(res && res.headers && res.headers.get && res.headers.get("content-length"));
  if (Number.isFinite(len) && len > maxBytes) {
    return { error: "body_too_large" };
  }
  const buf = await res.arrayBuffer();
  if (buf.byteLength > maxBytes) return { error: "body_too_large" };
  try {
    return { data: JSON.parse(new TextDecoder().decode(buf)) };
  } catch {
    return { error: "invalid_json" };
  }
}

export async function fetchSiblingJson(url, options = {}) {
  const fetchImpl = options.fetch || globalThis.fetch;
  const timeoutMs = options.timeoutMs || SOCIAL_STATUS_FETCH_TIMEOUT_MS;
  const headers = {
    Accept: "application/json",
    "User-Agent": SOCIAL_STATUS_UA,
  };
  let res;
  try {
    res = await fetchImpl(url, {
      method: "GET",
      headers,
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (err) {
    const name = err && err.name;
    if (name === "TimeoutError" || name === "AbortError") {
      return { ok: false, url, error: "timeout", omitted: true };
    }
    return { ok: false, url, error: "network", omitted: true };
  }
  if (!res || !res.ok) {
    return {
      ok: false,
      url,
      error: `http_${res && res.status ? res.status : 0}`,
      omitted: true,
    };
  }
  if (!isJsonContentType(res)) {
    return { ok: false, url, error: "not_json", omitted: true };
  }
  const parsed = await readJsonCapped(res);
  if (parsed.error) return { ok: false, url, error: parsed.error, omitted: true };
  return { ok: true, url, data: parsed.data };
}

export async function fetchHubSnapshot(hub, options = {}) {
  const urls = [hub.stats].concat(hub.fallbacks || []);
  const attempts = [];
  for (const url of urls) {
    const result = await fetchSiblingJson(url, options);
    attempts.push({ url, error: result.error || null });
    if (result.ok) {
      const picked = pickDeclared(result.data, hub.keys);
      const row = {
        id: hub.id,
        name: hub.name,
        ok: true,
        url: result.url,
        ...picked,
      };
      if (hub.label) row.label = hub.label;
      if (hub.never_cite) row.never_cite = hub.never_cite.slice();
      return row;
    }
    if (!hub.fallbacks || hub.fallbacks.length === 0) {
      return { id: hub.id, name: hub.name, ok: false, url, error: result.error, omitted: true };
    }
  }
  return {
    id: hub.id,
    name: hub.name,
    ok: false,
    url: hub.stats,
    error: (attempts[0] && attempts[0].error) || "unavailable",
    omitted: true,
    attempts,
  };
}

async function runtimeSnapshot(env, origin) {
  const base = String(origin || "https://aziel-runtime.vibelock.workers.dev").replace(/\/$/, "");
  const url = `${base}/v1/uses`;
  try {
    const uses = await readUses(env);
    if (!uses || uses.uses_kv === false) {
      return { id: "runtime", name: "Aziel Runtime", ok: false, url, error: "uses_unbound", omitted: true, label: "agent/MCP usage" };
    }
    const picked = pickDeclared(uses, ["uses", "by_host", "by_path"]);
    if (picked.uses === undefined) {
      return { id: "runtime", name: "Aziel Runtime", ok: false, url, error: "uses_unbound", omitted: true, label: "agent/MCP usage" };
    }
    return {
      id: "runtime",
      name: "Aziel Runtime",
      ok: true,
      url,
      label: "agent/MCP usage",
      ...picked,
    };
  } catch {
    return { id: "runtime", name: "Aziel Runtime", ok: false, url, error: "uses_unbound", omitted: true, label: "agent/MCP usage" };
  }
}

function combineSnapshots(sources) {
  let views;
  let downloads;
  const source_urls = [];
  for (const src of sources) {
    if (!src || src.ok !== true) continue;
    source_urls.push(src.url);
    if (src.views !== undefined) views = (views === undefined ? 0 : views) + src.views;
    if (src.downloads !== undefined) downloads = (downloads === undefined ? 0 : downloads) + src.downloads;
  }
  const combined = { source_urls };
  if (views !== undefined) combined.views = views;
  if (downloads !== undefined) combined.downloads = downloads;
  return combined;
}

/**
 * Best-effort sibling snapshot. Never invents numbers.
 * Runtime uses local USES KV (this Worker). He Didn't Jump hits /api/stats only.
 * Does not fetch the HDJ Worker SoT (no dual-write). Does not fan-out product /stats.
 */
export async function statsRollupSnapshot(env = {}, options = {}) {
  const now = typeof options.now === "number" ? options.now : Date.now();
  const ttl = options.ttlMs == null ? SOCIAL_STATUS_CACHE_TTL_MS : options.ttlMs;
  if (!options.skipCache && rollupCache.body && now - rollupCache.at < ttl) {
    return { ...rollupCache.body, cached: true };
  }

  const origin = options.origin || "https://aziel-runtime.vibelock.workers.dev";
  const fetchOpts = {
    fetch: options.fetch || (env && env.STATS_FETCH) || globalThis.fetch,
    timeoutMs: options.timeoutMs,
  };
  const remoteHubs = SOCIAL_STATUS_HUBS.filter((h) => h.id !== "runtime");

  const remote = await Promise.all(remoteHubs.map((hub) => fetchHubSnapshot(hub, fetchOpts)));
  const runtime = await runtimeSnapshot(env, origin);
  const sources = remote.concat([runtime]);
  const omitted = sources.filter((s) => s.ok !== true).map((s) => ({ id: s.id, url: s.url, error: s.error }));
  const okSources = sources.filter((s) => s.ok === true);
  const combined = combineSnapshots(okSources);

  const body = {
    ok: true,
    author: SOCIAL_STATUS_AUTHOR,
    identity: SOCIAL_STATUS_AUTHOR,
    person_id: SOCIAL_STATUS_PERSON_ID,
    purpose: SOCIAL_STATUS_PURPOSE,
    kind: "read-only-snapshot",
    vanity: false,
    biography: false,
    never_invent_numbers: true,
    fetched_at: new Date(now).toISOString(),
    cache_ttl_ms: ttl,
    cached: false,
    combined,
    sources,
    omitted,
    note: "Read-only AZindex awareness. Combined views/downloads sum only successful siblings. Runtime uses are agent/MCP usage and are not added to views. Failed siblings are omitted. Never invent numbers.",
  };

  if (!options.skipCache) {
    rollupCache = { at: now, body };
  }
  return body;
}

export function socialStatusCacheHeaders() {
  return {
    "Cache-Control": "public, max-age=30, s-maxage=60, stale-while-revalidate=180",
    "CDN-Cache-Control": "public, s-maxage=60, stale-while-revalidate=180",
  };
}
