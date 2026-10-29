/**
 * Cross-tether public views / downloads for AZindex social-status awareness.
 *
 * Read-only snapshots. Not vanity. Not biography. Never invent numbers.
 * A sibling timeout is never a silent omit. Combined totals keep a last-good
 * snapshot with stale_age, or they are partial with an explicit missing flag.
 * Identity: Aziel Eliab only.
 */

import { readUses } from "./uses.js";

export const SOCIAL_STATUS_PERSON_ID = "https://www.azieleliab.com/#aziel";
export const SOCIAL_STATUS_AUTHOR = "Aziel Eliab";
export const SOCIAL_STATUS_PURPOSE =
  "AZindex graph social-status awareness (not vanity, not biography)";
export const SOCIAL_STATUS_CACHE_TTL_MS = 60_000;
export const SOCIAL_STATUS_FETCH_TIMEOUT_MS = 2500;
export const SOCIAL_STATUS_FAST_TIMEOUT_MS = 1000;
export const SOCIAL_STATUS_CORPUS_REFRESH_MS = 22_000;
export const ROLLUP_SNAPSHOT_KEY = "rollup|snapshot";
export const ROLLUP_LAST_GOOD_PREFIX = "rollup|last-good|";
/** Cross-isolate single-flight for the 60s rollup refresh. Not a USES map scan. */
export const ROLLUP_REFRESH_LEASE_KEY = "rollup|refresh-lease";
/** Longer than the 22s corpus refresh budget so a live refresh is not started twice. A dead holder frees the next request after this. */
export const ROLLUP_REFRESH_LEASE_MS = 45_000;
/** Cloudflare KV expirationTtl minimum is 60 seconds. The JSON `until` is the lease. */
export const ROLLUP_REFRESH_LEASE_KV_TTL_S = 60;
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
    stats: "https://www.azielcorpuslibrary.net/stats",
    fast_fallbacks: Object.freeze(["https://www.azielcorpuslibrary.net/v1/stats"]),
    fallbacks: Object.freeze(["https://aziel-corpus-download-tracker.vibelock.workers.dev/stats"]),
    version: "https://www.azielcorpuslibrary.net/v1/health",
    keys: Object.freeze(["views", "downloads"]),
    live: true,
    note: "Prefer GET /stats (counter door; slow). GET /v1/stats is a fast fallback and counts only when it declares views or downloads. It is not the version door. Version is GET /v1/health. A timeout keeps last-good with stale_age, or the rollup is partial. Never a silent omit.",
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
  "https://www.azielcorpuslibrary.net/stats",
  "https://www.hedidntjump.com/api/stats",
]);

const FORBIDDEN_KEYS = new Set(["uploads"]);

let rollupCache = { at: 0, body: null };
const memoryHubGood = new Map();

/** Isolate single-flight slot. Not request data. One in-flight rollup refresh per isolate. */
export function createStatsRollupIsolate() {
  return { refresh: null };
}

const defaultIsolate = createStatsRollupIsolate();

export function resetSocialStatusCache() {
  rollupCache = { at: 0, body: null };
  memoryHubGood.clear();
  defaultIsolate.refresh = null;
}

function usesStore(env) {
  const kv = env && env.USES;
  if (!kv || typeof kv.get !== "function" || typeof kv.put !== "function") return null;
  return kv;
}

function counterRecord(row, fetchedAt) {
  const rec = { id: row.id, url: row.url, fetched_at: fetchedAt };
  for (const key of ["views", "downloads", "uses", "current_score"]) {
    if (row[key] !== undefined) rec[key] = row[key];
  }
  if (row.items && typeof row.items === "object") rec.items = row.items;
  return rec;
}

function recordHasCounter(rec) {
  if (!rec) return false;
  return rec.views !== undefined || rec.downloads !== undefined || rec.uses !== undefined || rec.current_score !== undefined || (rec.items && typeof rec.items === "object");
}

async function rememberHub(env, row, fetchedAt) {
  if (!row || row.ok !== true || row.stale === true || row.last_good === true) return;
  const rec = counterRecord(row, fetchedAt);
  if (!recordHasCounter(rec)) return;
  memoryHubGood.set(row.id, rec);
  const kv = usesStore(env);
  if (!kv) return;
  try {
    await kv.put(`${ROLLUP_LAST_GOOD_PREFIX}${row.id}`, JSON.stringify(rec));
  } catch {
    /* last-good memory still stands for this isolate */
  }
}

async function loadLastGood(env, id) {
  if (memoryHubGood.has(id)) return memoryHubGood.get(id);
  const kv = usesStore(env);
  if (!kv) return null;
  try {
    const raw = await kv.get(`${ROLLUP_LAST_GOOD_PREFIX}${id}`);
    if (!raw) return null;
    const rec = JSON.parse(raw);
    if (!rec || rec.id !== id || !recordHasCounter(rec)) return null;
    memoryHubGood.set(id, rec);
    return rec;
  } catch {
    return null;
  }
}

function staleFromLastGood(hub, last, error, now) {
  const fetched = Date.parse(last.fetched_at);
  const stale_age_s = Number.isFinite(fetched) ? Math.max(0, Math.round((now - fetched) / 1000)) : null;
  const row = {
    id: hub.id,
    name: hub.name,
    ok: true,
    stale: true,
    last_good: true,
    fresh: false,
    error: error || "timeout",
    omitted: false,
    included_in_combined: true,
    url: last.url,
    stale_age_s,
    fetched_at: last.fetched_at,
  };
  if (hub.label) row.label = hub.label;
  if (hub.never_cite) row.never_cite = hub.never_cite.slice();
  for (const key of ["views", "downloads", "uses", "current_score"]) {
    if (last[key] !== undefined) row[key] = last[key];
  }
  if (last.items && typeof last.items === "object") row.items = last.items;
  return row;
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
    hubs: SOCIAL_STATUS_HUBS.map((h) => ({ ...h, keys: h.keys.slice(), fallbacks: h.fallbacks ? h.fallbacks.slice() : undefined, fast_fallbacks: h.fast_fallbacks ? h.fast_fallbacks.slice() : undefined, not: h.not ? h.not.slice() : undefined, never_cite: h.never_cite ? h.never_cite.slice() : undefined, host_mirrors: h.host_mirrors ? h.host_mirrors.slice() : undefined })),
    product_stats_template: "https://{slug}-download-tracker.vibelock.workers.dev/stats",
    note: "Read-only AZindex awareness. Cite the stats URLs. GET /v1/stats-rollups keeps a shared last-good snapshot. A timeout is partial, or it includes last-good with stale_age. It does not silently omit corpus views. Digital Library: prefer /stats, then /v1/stats only when that body declares views or downloads; version is /v1/health. He Didn't Jump: /api/stats only. GodLock: /stats (not /v1/stats). Runtime uses are agent/MCP usage, not vanity views. The product stats template is not a license to probe unlisted slugs.",
    product_stats_template_is_probe_license: false,
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
    `- Digital Library views/downloads: ${SOCIAL_STATUS_LIVE_URLS[1]} (prefer /stats; /v1/stats is a fast fallback only when it declares views or downloads; version is GET /v1/health)`,
    `- He Didn't Jump views/downloads/items: ${SOCIAL_STATUS_LIVE_URLS[2]} (not /stats — that is the SPA)`,
    "- GodLock views/uses/downloads/current_score: https://godlock.uk/stats (never cite uploads; GET /v1/stats is 404)",
    "- Runtime agent/MCP usage: https://aziel-runtime.vibelock.workers.dev/v1/uses (host mirrors …/runtime/v1/uses)",
    "",
    `Hub rollup (last-good with stale_age, or partial; never a silent omit): GET ${base}/v1/stats-rollups`,
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

function acceptHubBody(hub, url, result, attempts) {
  attempts.push({ url, error: result && result.ok ? null : (result && result.error) || "unavailable" });
  if (!result || result.ok !== true) return null;
  const picked = pickDeclared(result.data, hub.keys);
  const fast = Array.isArray(hub.fast_fallbacks) && hub.fast_fallbacks.includes(url);
  if (fast && picked.views === undefined && picked.downloads === undefined) {
    attempts[attempts.length - 1].error = "no_counters";
    return null;
  }
  const row = {
    id: hub.id,
    name: hub.name,
    ok: true,
    fresh: true,
    stale: false,
    last_good: false,
    url: result.url,
    ...picked,
  };
  if (hub.label) row.label = hub.label;
  if (hub.never_cite) row.never_cite = hub.never_cite.slice();
  return row;
}

export async function fetchHubSnapshot(hub, options = {}) {
  const urls = [hub.stats].concat(hub.fast_fallbacks || []).concat(hub.fallbacks || []);
  const attempts = [];
  const seen = new Set();
  const now = typeof options.now === "number" ? options.now : Date.now();
  if (options.parallelFast && hub.fast_fallbacks && hub.fast_fallbacks[0]) {
    const fastUrl = hub.fast_fallbacks[0];
    const [primary, fast] = await Promise.all([
      fetchSiblingJson(hub.stats, options),
      fetchSiblingJson(fastUrl, options),
    ]);
    const chosen = acceptHubBody(hub, hub.stats, primary, attempts) || acceptHubBody(hub, fastUrl, fast, attempts);
    seen.add(hub.stats);
    seen.add(fastUrl);
    if (chosen) return chosen;
  }
  for (const url of urls) {
    if (seen.has(url)) continue;
    seen.add(url);
    const result = await fetchSiblingJson(url, options);
    const chosen = acceptHubBody(hub, url, result, attempts);
    if (chosen) return chosen;
  }
  const last = await loadLastGood(options.env, hub.id);
  if (recordHasCounter(last)) {
    return staleFromLastGood(hub, last, (attempts[0] && attempts[0].error) || "unavailable", now);
  }
  return {
    id: hub.id,
    name: hub.name,
    ok: false,
    url: hub.stats,
    error: (attempts[0] && attempts[0].error) || "unavailable",
    omitted: true,
    included_in_combined: false,
    attempts,
  };
}

async function runtimeSnapshot(env, origin) {
  const base = String(origin || "https://aziel-runtime.vibelock.workers.dev").replace(/\/$/, "");
  const url = `${base}/v1/uses`;
  try {
    const uses = await readUses(env, { maps: "snapshot", budget_ms: 1000 });
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
      by_op: uses.by_op || {},
      maps_age_s: uses.maps_age_s ?? null,
      maps_snapshot_at: uses.maps_snapshot_at || null,
      maps_complete: uses.maps_complete === true,
      maps_refresh: uses.maps_refresh || "idle",
      ring_ts: uses.ring_ts ?? null,
    };
  } catch {
    return { id: "runtime", name: "Aziel Runtime", ok: false, url, error: "uses_unbound", omitted: true, label: "agent/MCP usage" };
  }
}

function combineSnapshots(sources) {
  let views;
  let downloads;
  const source_urls = [];
  const staleAges = [];
  for (const src of sources) {
    if (!src || src.ok !== true) continue;
    if (src.url) source_urls.push(src.url);
    if (src.stale === true && Number.isFinite(src.stale_age_s)) staleAges.push(src.stale_age_s);
    if (src.views !== undefined) views = (views === undefined ? 0 : views) + src.views;
    if (src.downloads !== undefined) downloads = (downloads === undefined ? 0 : downloads) + src.downloads;
  }
  const missing = sources.filter((s) => !s || s.ok !== true).map((s) => s.id);
  const corpus = sources.find((s) => s && s.id === "corpus");
  const corpus_views_included = Boolean(corpus && corpus.ok === true && corpus.views !== undefined);
  const combined = {
    source_urls,
    complete: missing.length === 0 && staleAges.length === 0,
    partial: missing.length > 0 || staleAges.length > 0,
    corpus_views_included,
    stale: staleAges.length > 0,
  };
  if (views !== undefined) combined.views = views;
  if (downloads !== undefined) combined.downloads = downloads;
  if (staleAges.length) combined.stale_age_s = Math.max(...staleAges);
  if (missing.length) {
    combined.missing = missing;
    combined.omit_reason = "no_last_good";
  }
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
    parallelFast: options.parallelFast === true,
    env,
    now,
  };
  const remoteHubs = SOCIAL_STATUS_HUBS.filter((h) => h.id !== "runtime");

  const remote = await Promise.all(remoteHubs.map((hub) => fetchHubSnapshot(hub, fetchOpts)));
  const runtime = await runtimeSnapshot(env, origin);
  const sources = remote.concat([runtime]);
  const fetchedAt = new Date(now).toISOString();
  for (const row of sources) await rememberHub(env, row, fetchedAt);
  const omitted = sources.filter((s) => s.ok !== true).map((s) => ({ id: s.id, url: s.url, error: s.error }));
  const stale_sources = sources.filter((s) => s.stale === true).map((s) => ({ id: s.id, url: s.url, error: s.error, stale_age_s: s.stale_age_s }));
  const combined = combineSnapshots(sources);
  const runtimeRow = sources.find((s) => s.id === "runtime");

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
    fetched_at: fetchedAt,
    cache_ttl_ms: ttl,
    cached: false,
    cache_source: "fetch",
    combined,
    sources,
    omitted,
    stale_sources,
    maps_age_s: runtimeRow ? runtimeRow.maps_age_s ?? null : null,
    maps_snapshot_at: runtimeRow ? runtimeRow.maps_snapshot_at || null : null,
    maps_complete: runtimeRow ? runtimeRow.maps_complete === true : false,
    maps_refresh: runtimeRow && runtimeRow.maps_refresh ? runtimeRow.maps_refresh : "idle",
    ring_ts: runtimeRow ? runtimeRow.ring_ts ?? null : null,
    note: "Read-only AZindex awareness. Combined views/downloads sum fresh siblings and last-good snapshots. A last-good row sets combined.partial and stale_age_s. A sibling with no last-good stays in omitted and combined.missing. Runtime uses are agent/MCP usage and are not added to views. Never invent numbers. Never silently omit corpus views.",
  };

  const cacheable = combined.complete === true && combined.corpus_views_included === true;
  if (!options.skipCache && cacheable) {
    rollupCache = { at: now, body };
  }
  if (!options.skipShared) await writeSharedRollup(env, body, now);
  return body;
}

export async function readSharedRollup(env) {
  const kv = usesStore(env);
  if (!kv) return null;
  try {
    const raw = await kv.get(ROLLUP_SNAPSHOT_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export async function writeSharedRollup(env, body, now) {
  const kv = usesStore(env);
  if (!kv || !body || !body.combined) return false;
  const prev = await readSharedRollup(env);
  const nextHas = body.combined.corpus_views_included === true;
  const prevHas = Boolean(prev && prev.combined && prev.combined.corpus_views_included === true);
  if (!nextHas && prevHas) return false;
  try {
    await kv.put(ROLLUP_SNAPSHOT_KEY, JSON.stringify({ ...body, saved_at: new Date(now).toISOString() }));
    return true;
  } catch {
    return false;
  }
}

function parseRefreshLease(raw) {
  if (!raw || typeof raw !== "string") return null;
  try {
    const rec = JSON.parse(raw);
    if (!rec || typeof rec.token !== "string" || !Number.isFinite(rec.until)) return null;
    return rec;
  } catch {
    return null;
  }
}

/**
 * Short USES KV lease. Same-colo read-after-write keeps one winner.
 * A missing read-back still allows this caller through so a lagging KV does not drop the only refresh.
 * Another token already stored means this caller lost.
 */
async function acquireRollupRefreshLease(env, now) {
  const kv = usesStore(env);
  const token = crypto.randomUUID();
  if (!kv) return { ok: true, token, held: false };
  const until = now + ROLLUP_REFRESH_LEASE_MS;
  let raw = null;
  try {
    raw = await kv.get(ROLLUP_REFRESH_LEASE_KEY);
  } catch {
    raw = null;
  }
  const cur = parseRefreshLease(raw);
  if (cur && cur.until > now) return { ok: false, reason: "lease" };
  const body = JSON.stringify({ token, until });
  try {
    await kv.put(ROLLUP_REFRESH_LEASE_KEY, body, { expirationTtl: ROLLUP_REFRESH_LEASE_KV_TTL_S });
  } catch {
    return { ok: false, reason: "lease-put" };
  }
  let after = null;
  try {
    after = await kv.get(ROLLUP_REFRESH_LEASE_KEY);
  } catch {
    after = null;
  }
  if (after == null) return { ok: true, token, held: true };
  if (after !== body) return { ok: false, reason: "lease" };
  return { ok: true, token, held: true };
}

async function releaseRollupRefreshLease(env, lease) {
  if (!lease || !lease.held) return;
  const kv = usesStore(env);
  if (!kv) return;
  let raw = null;
  try {
    raw = await kv.get(ROLLUP_REFRESH_LEASE_KEY);
  } catch {
    return;
  }
  const cur = parseRefreshLease(raw);
  if (!cur || cur.token !== lease.token) return;
  try {
    if (typeof kv.delete === "function") await kv.delete(ROLLUP_REFRESH_LEASE_KEY);
    else await kv.put(ROLLUP_REFRESH_LEASE_KEY, "");
  } catch {
    /* `until` expires the lease */
  }
}

function refreshSnapshotOptions(options, now) {
  const rest = { ...options };
  delete rest.isolate;
  return {
    ...rest,
    skipCache: true,
    skipShared: false,
    timeoutMs: SOCIAL_STATUS_CORPUS_REFRESH_MS,
    now,
  };
}

async function runRollupRefresh(env, snapshotOptions) {
  const now = typeof snapshotOptions.now === "number" ? snapshotOptions.now : Date.now();
  let lease = null;
  try {
    lease = await acquireRollupRefreshLease(env, now);
    if (!lease.ok) return { ok: true, built: false, reason: "lease" };
    await statsRollupSnapshot(env, snapshotOptions);
    return { ok: true, built: true };
  } catch {
    return { ok: false, built: false, reason: "error" };
  } finally {
    if (lease && lease.ok) await releaseRollupRefreshLease(env, lease);
  }
}

/**
 * One rollup refresh per isolate, and one across isolates while the KV lease is held.
 * The flag is set before the first await so N calls in one turn start one build.
 */
function scheduleRollupRefresh(isolate, env, snapshotOptions) {
  const slot = isolate || defaultIsolate;
  if (slot.refresh) return Promise.resolve({ ok: true, built: false, reason: "in-flight" });
  slot.refresh = slot;
  const job = runRollupRefresh(env, snapshotOptions).finally(() => {
    if (slot.refresh === job) slot.refresh = null;
  });
  slot.refresh = job;
  return job;
}

export async function statsRollupResponse(env = {}, options = {}) {
  const now = typeof options.now === "number" ? options.now : Date.now();
  const isolate = options.isolate || defaultIsolate;
  const shared = await readSharedRollup(env);
  const savedAt = shared && shared.saved_at ? Date.parse(shared.saved_at) : NaN;
  const ageS = Number.isFinite(savedAt) ? Math.max(0, Math.round((now - savedAt) / 1000)) : null;
  const hasCorpus = Boolean(shared && shared.combined && shared.combined.corpus_views_included === true);
  const fresh = hasCorpus && shared.combined.partial !== true && ageS != null && ageS * 1000 < SOCIAL_STATUS_CACHE_TTL_MS;
  const refresh = () => scheduleRollupRefresh(isolate, env, refreshSnapshotOptions(options, now));
  if (hasCorpus) {
    return {
      body: {
        ...shared,
        cached: true,
        cache_source: "shared",
        cache_age_s: ageS,
        stale: fresh ? shared.combined.stale === true : true,
        ...(fresh ? {} : { stale_age_s: ageS }),
      },
      refresh: fresh ? null : refresh,
    };
  }
  const body = await statsRollupSnapshot(env, {
    ...options,
    timeoutMs: options.timeoutMs || SOCIAL_STATUS_FAST_TIMEOUT_MS,
    parallelFast: true,
    now,
  });
  return {
    body,
    refresh: body.combined && body.combined.partial === true ? refresh : null,
  };
}

export function socialStatusCacheHeaders() {
  return {
    "Cache-Control": "public, max-age=30, s-maxage=60, stale-while-revalidate=180",
    "CDN-Cache-Control": "public, s-maxage=60, stale-while-revalidate=180",
  };
}
