/**
 * RL-WP-0.1-runtime — packed catalog (runtime scope only).
 *
 * One key (catalog:v1) instead of KV.list / multi-get on the hot path.
 * Edge-friendly Cache-Control. Donation stays static (no KV).
 * Catalog GET / homepage HTML always return the full packed body (200).
 * Soft visitor caps apply only to expensive fan-out — never starve humans
 * or SEO bots of catalog/HTML. Hubs hit GET /v1/software every Software-tab
 * render; packed + Cache-Control is the cost multiplier.
 * GET /v1/mesh never enables. No Node Gate UI. Library RL is aziel-corpus.
 *
 * Target: <<191 KV ops/request on catalog paths (packed read = 0 or 1).
 * Author: Aziel Eliab only.
 */

import { sha256Hex } from "./session-core.js";
import { softwareCatalog } from "./software-catalog.js";
import { clientIp, extractRuntimeToken, timingSafeEqualString, tokenSecret } from "./production.js";

export const RL_SPEC = "RL-WP-0.1-runtime";
export const RL_SCOPE = "runtime";
export const PACKED_CATALOG_KEY = "catalog:v1";
export const KV_CACHE_TTL = 3600;
export const KV_OPS_CAP = 30;
export const CATALOG_CACHE_CONTROL = "public, s-maxage=300, stale-while-revalidate=3600";

export const VISITOR_PER_MINUTE = 60;
export const VISITOR_PER_HOUR = 600;
export const VISITOR_PER_DAY = 5000;

export const CATALOG_PATHS = Object.freeze([
  "/v1/software",
  "/v1/software.json",
  "/v1/fraggate/software",
  "/v1/fraggate/software.json",
  "/v1/catalog.json",
  "/v1/update/check",
  "/v1/update/manifest",
]);

function kvGetOptions() {
  return { cacheTtl: KV_CACHE_TTL };
}

function visitorStore(env) {
  if (!env || typeof env !== "object") return { min: new Map(), hour: new Map(), day: new Map() };
  if (!env.__aziel_rl_bucket) {
    env.__aziel_rl_bucket = { min: new Map(), hour: new Map(), day: new Map() };
  }
  return env.__aziel_rl_bucket;
}

function take(map, key, windowMs, limit, now) {
  const times = (map.get(key) || []).filter((ts) => now - ts < windowMs);
  if (times.length >= limit) {
    const oldest = times[0] || now;
    const retryAfter = Math.max(1, Math.ceil((windowMs - (now - oldest)) / 1000));
    map.set(key, times);
    return { ok: false, retryAfter, used: times.length, limit };
  }
  times.push(now);
  map.set(key, times);
  return { ok: true, used: times.length, limit };
}

export function isCatalogPath(pathname) {
  const p = String(pathname || "").split("?")[0].toLowerCase();
  return CATALOG_PATHS.includes(p);
}

export function isOperator(request, env) {
  const presented = extractRuntimeToken(request);
  const secret = tokenSecret(env);
  if (!presented || !secret) return false;
  return timingSafeEqualString(presented, secret);
}

export async function visitorId(request) {
  const ip = clientIp(request);
  const cookie = request && request.headers && request.headers.get("Cookie");
  const material = `${ip}|${cookie ? "c" : "n"}`;
  return sha256Hex(material);
}

/**
 * Per-visitor cap for expensive fan-out only (not catalog GET / HTML).
 * Operator token bypass (server-side; no Node Gate UI).
 * Soft exceed: rate-soft. Does not enable mesh. Never 429 a catalog/HTML body.
 */
export async function visitorBucket(request, env, now = Date.now()) {
  if (isOperator(request, env)) {
    return { ok: true, operator: true, bypass: true, spec: RL_SPEC };
  }
  const id = await visitorId(request);
  const store = visitorStore(env);
  const minute = take(store.min, id, 60_000, VISITOR_PER_MINUTE, now);
  if (!minute.ok) {
    return { ok: false, refuse: "rate-soft", retryAfter: Math.min(30, minute.retryAfter), id, spec: RL_SPEC };
  }
  const hour = take(store.hour, id, 3600_000, VISITOR_PER_HOUR, now);
  if (!hour.ok) {
    return { ok: false, refuse: "rate-soft", retryAfter: 30, id, spec: RL_SPEC };
  }
  const day = take(store.day, id, 86400_000, VISITOR_PER_DAY, now);
  if (!day.ok) {
    return { ok: false, refuse: "rate-soft", retryAfter: 30, id, spec: RL_SPEC };
  }
  return { ok: true, operator: false, id, spec: RL_SPEC };
}

export function catalogCacheHeaders() {
  return {
    "Cache-Control": CATALOG_CACHE_CONTROL,
    "CDN-Cache-Control": CATALOG_CACHE_CONTROL,
  };
}

export function donationStatic() {
  return {
    static: true,
    kv: false,
    note: "Donation is a static tab. Addresses are an operator paste at publish time. Do not invent wallets. Do not route donations through KV, D1, or Durable Objects.",
    networks: ["bitcoin", "lightning", "ethereum", "solana"],
    addresses: null,
  };
}

/**
 * Packed catalog for hub Software-tab / SEO doors.
 * Production hot path is the Worker bundle (0 KV). Never list() or multi-get.
 * Optional single-key get only when extra.kv_probe is passed (tests / overlay).
 * Do not read env.USES on catalog GET — that binding is for use counters.
 */
export async function readPackedCatalog(env, origin, products, extra = {}) {
  const probe = extra.kv_probe;
  let kv_ops = 0;
  let packed = false;
  let source = "memory";

  if (probe && typeof probe.get === "function") {
    kv_ops += 1;
    if (kv_ops > KV_OPS_CAP) {
      const built = softwareCatalog(origin, products, extra);
      return {
        ok: true,
        truncated: true,
        refuse: "kv-cap",
        kv_ops,
        kv_ops_cap: KV_OPS_CAP,
        packed: false,
        source: "truncated",
        catalog: built,
        rl: rlMeta(kv_ops, false),
      };
    }
    const raw = await probe.get(PACKED_CATALOG_KEY, kvGetOptions());
    if (raw) {
      packed = true;
      source = "packed";
      try {
        const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
        return {
          ok: true,
          truncated: false,
          kv_ops,
          kv_ops_cap: KV_OPS_CAP,
          packed: true,
          source,
          catalog: parsed,
          rl: rlMeta(kv_ops, true),
        };
      } catch {
        /* fall through to memory */
      }
    }
  }

  const built = softwareCatalog(origin, products, extra);
  return {
    ok: true,
    truncated: false,
    kv_ops,
    kv_ops_cap: KV_OPS_CAP,
    packed,
    source,
    catalog: { ...built, packed_key: PACKED_CATALOG_KEY, rl: rlMeta(kv_ops, packed) },
    rl: rlMeta(kv_ops, packed),
  };
}

function rlMeta(kv_ops, packed) {
  return {
    spec: RL_SPEC,
    scope: RL_SCOPE,
    key: PACKED_CATALOG_KEY,
    packed,
    kv_ops,
    kv_ops_cap: KV_OPS_CAP,
    target: "<<191",
    list: false,
    donation_kv: false,
    catalog_always_full: true,
    catalog_consumes_bucket: false,
    visitor_cap: "expensive-fanout-only",
    mesh_get_never_enables: true,
    node_gate: false,
  };
}

export function countKvOps(probe) {
  return (probe && probe.__gets) || 0;
}

/** Test helper: KV that counts get/list and never lists on catalog. */
export function countingKv(seed = {}) {
  const map = new Map(Object.entries(seed));
  const stats = { gets: 0, lists: 0, puts: 0 };
  return {
    stats,
    async get(key, _opts) {
      stats.gets += 1;
      return map.has(key) ? map.get(key) : null;
    },
    async put(key, value) {
      stats.puts += 1;
      map.set(key, value);
    },
    async list() {
      stats.lists += 1;
      return { keys: [...map.keys()].map((name) => ({ name })) };
    },
  };
}
