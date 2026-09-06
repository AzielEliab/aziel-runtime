/**
 * aziel-runtime API use trackers — KV-backed counters + ring log.
 *
 * Distinct from product download-trackers and from the in-isolate FragGate ledger.
 * No Authorization headers, tokens, request bodies, or PII.
 *
 * Author: Aziel Eliab. Identity is Aziel Eliab only.
 */

export const USES_PRODUCT = "aziel-runtime";
export const USES_AUTHOR = "Aziel Eliab";
export const USES_LOG_KEY = "log";
export const USES_LOG_CAP = 100;
export const USES_TOTAL_KEY = "total";

const SKIP_SEO = new Set([
  "/",
  "/robots.txt",
  "/sitemap.xml",
  "/sitemap-index.xml",
  "/llms.txt",
  "/ai.txt",
  "/cite.json",
  "/openapi.json",
  "/sigil.png",
  "/favicon.ico",
]);

const SKIP_GET_READS = new Set(["/v1/health", "/v1/ready", "/v1/uses", "/v1/stats"]);

const HOST_ALIASES = {
  origin: "origin",
  "aziel-runtime.vibelock.workers.dev": "origin",
  "azieleliab.com": "azieleliab.com",
  "www.azieleliab.com": "azieleliab.com",
  "godlock.uk": "godlock.uk",
  "www.godlock.uk": "godlock.uk",
  "azielcorpuslibrary.net": "azielcorpuslibrary.net",
  "www.azielcorpuslibrary.net": "azielcorpuslibrary.net",
};

const ASSET_EXT = /\.(png|jpe?g|gif|webp|svg|ico|css|js|map|woff2?|ttf|txt)$/i;
const SESSION_ID_RE = /^[a-z0-9][a-z0-9._-]{7,127}$/i;

export function utcDay(now = new Date()) {
  const d = now instanceof Date ? now : new Date(now);
  if (Number.isNaN(d.getTime())) return new Date().toISOString().slice(0, 10);
  return d.toISOString().slice(0, 10);
}

export function normalizePath(pathname) {
  let p = String(pathname || "/").split("?")[0].split("#")[0];
  if (!p.startsWith("/")) p = "/" + p;
  p = p.replace(/\/{2,}/g, "/");
  if (p.length > 1) p = p.replace(/\/+$/, "");
  p = p.toLowerCase();
  const parts = p.split("/");
  // /v1/session/{id}/… → /v1/session/{id}/…
  if (parts[1] === "v1" && parts[2] === "session" && parts[3] && parts[3] !== "open") {
    if (SESSION_ID_RE.test(parts[3])) parts[3] = "{id}";
  }
  p = parts.join("/") || "/";
  if (p.length > 180) p = p.slice(0, 180);
  return p;
}

export function sanitizeHostLabel(raw) {
  let s = String(raw || "")
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "")
    .replace(/^\[|\]$/g, "");
  const host = s.split(":")[0];
  if (!host || !/^[a-z0-9._-]{1,80}$/.test(host)) return "unknown";
  return HOST_ALIASES[host] || host;
}

export function sanitizeToken(raw) {
  const s = String(raw || "")
    .trim()
    .toLowerCase()
    .slice(0, 80);
  if (!s || !/^[a-z0-9][a-z0-9._|-]{0,79}$/.test(s)) return "";
  return s;
}

export function inferProductOp(pathname) {
  const path = normalizePath(pathname);
  const proxy = path.match(/^\/p\/([a-z0-9-]+)\/([a-z0-9_-]+)$/);
  if (proxy) return { product: proxy[1], op: `${proxy[1]}.${proxy[2]}` };
  const pull = path.match(/^\/v1\/pull\/([a-z0-9.-]+)(?:\/skill)?$/);
  if (pull) return { product: pull[1], op: `${pull[1]}.pull` };
  if (path === "/v1/fraggate/call") return { op: "fraggate.call" };
  if (path === "/v1/fraggate/list") return { op: "fraggate.list" };
  if (path === "/v1/fraggate/describe") return { op: "fraggate.describe" };
  if (path === "/v1/fraggate/verify") return { op: "fraggate.verify" };
  if (path === "/v1/fraggate") return { op: "fraggate" };
  if (path === "/v1/session/open") return { op: "session.open" };
  if (path === "/v1/session/{id}/exec") return { op: "session.exec" };
  if (path === "/v1/session/{id}/policy") return { op: "session.policy" };
  if (path === "/v1/session/{id}/close") return { op: "session.close" };
  if (path === "/v1/session/{id}/receipt") return { op: "session.receipt" };
  if (path === "/v1/session/{id}/receipts") return { op: "session.receipts" };
  if (path === "/v1/bundle" || path === "/v1/pull") return { op: "runtime.bundle" };
  if (path === "/v1/skill") return { op: "runtime.skill" };
  if (path === "/v1/runtime.json" || path === "/v1/runtime") return { op: "runtime.manifest" };
  if (path === "/v1/catalog.json") return { op: "runtime.catalog" };
  if (path === "/mcp") return { op: "mcp" };
  return {};
}

export function shouldIncrementUse(method, pathname) {
  const m = String(method || "GET").toUpperCase();
  if (m === "OPTIONS" || m === "HEAD") return false;
  const path = normalizePath(pathname);
  if (SKIP_SEO.has(path)) return false;
  if (ASSET_EXT.test(path)) return false;
  if (m === "GET" && SKIP_GET_READS.has(path)) return false;
  if (m === "GET" && path === "/mcp") return false;
  if (m === "GET" && /^\/p\/[a-z0-9-]+$/.test(path)) return false;
  if (path.startsWith("/v1/")) return true;
  if (path === "/mcp") return m === "POST";
  if (/^\/p\/[a-z0-9-]+\/[a-z0-9_-]+$/.test(path)) return true;
  return false;
}

export function resolveUseHost(request) {
  const headers = request && request.headers;
  const via = headers && (headers.get("X-Aziel-Runtime-Via") || headers.get("x-aziel-runtime-via"));
  const override =
    (headers && (headers.get("X-Aziel-Runtime-Host") || headers.get("x-aziel-runtime-host"))) || via;
  let host = "";
  if (override) host = override;
  else if (headers) host = headers.get("Host") || headers.get("host") || "";
  if (!host) {
    try {
      host = new URL(request.url).host;
    } catch {
      host = "unknown";
    }
  }
  return { host: sanitizeHostLabel(host), via: via ? sanitizeHostLabel(via) : "" };
}

export function useDimsFromRequest(request, response) {
  let pathname = "/";
  try {
    pathname = new URL(request.url).pathname;
  } catch {
    pathname = "/";
  }
  const path = normalizePath(pathname);
  const inferred = inferProductOp(path);
  const { host, via } = resolveUseHost(request);
  const status = response && typeof response.status === "number" ? response.status : 0;
  return {
    host,
    via: via || undefined,
    method: String(request.method || "GET").toUpperCase(),
    path,
    status,
    product: inferred.product,
    op: inferred.op,
  };
}

function usesKv(env) {
  const kv = env && env.USES;
  if (!kv || typeof kv.get !== "function" || typeof kv.put !== "function") return null;
  return kv;
}

async function bumpKey(kv, key) {
  let cur = 0;
  try {
    cur = Number(await kv.get(key)) || 0;
  } catch {
    cur = 0;
  }
  const next = cur + 1;
  await kv.put(key, String(next));
  return next;
}

async function appendLog(kv, entry) {
  let arr = [];
  try {
    const raw = await kv.get(USES_LOG_KEY);
    if (raw) arr = JSON.parse(raw);
  } catch {
    arr = [];
  }
  if (!Array.isArray(arr)) arr = [];
  arr.unshift(entry);
  if (arr.length > USES_LOG_CAP) arr.length = USES_LOG_CAP;
  await kv.put(USES_LOG_KEY, JSON.stringify(arr));
  return arr;
}

export async function incrementUse(env, dims = {}) {
  const kv = usesKv(env);
  if (!kv) return { ok: false, skipped: "uses_unbound" };
  const host = sanitizeHostLabel(dims.host);
  const method = String(dims.method || "GET").toUpperCase().slice(0, 12);
  const path = normalizePath(dims.path || "/");
  const day = /^\d{4}-\d{2}-\d{2}$/.test(String(dims.day || "")) ? String(dims.day) : utcDay();
  const product = sanitizeToken(dims.product);
  const op = sanitizeToken(dims.op);
  const via = dims.via ? sanitizeHostLabel(dims.via) : "";
  const status = Number(dims.status);
  const keys = [USES_TOTAL_KEY, `host|${host}`, `method|${method}`, `path|${path}`, `day|${day}`];
  if (op) keys.push(`op|${op}`);
  const counts = {};
  for (const key of keys) {
    counts[key] = await bumpKey(kv, key);
  }
  const entry = {
    at: typeof dims.at === "string" && dims.at ? dims.at : new Date().toISOString(),
    host,
    method,
    path,
    status: Number.isFinite(status) ? status : 0,
  };
  if (product) entry.product = product;
  if (op) entry.op = op;
  if (via && via !== "unknown") entry.via = via;
  await appendLog(kv, entry);
  return { ok: true, uses: counts[USES_TOTAL_KEY], entry };
}

async function collectPrefixed(kv, prefix) {
  const out = {};
  if (typeof kv.list === "function") {
    let cursor;
    do {
      const page = await kv.list({ prefix, limit: 1000, cursor });
      const keys = (page && page.keys) || [];
      for (const item of keys) {
        const name = item && item.name;
        if (!name || name === prefix) continue;
        const label = name.slice(prefix.length);
        const n = Number(await kv.get(name)) || 0;
        out[label] = n;
      }
      cursor = page && page.list_complete === false ? page.cursor : undefined;
    } while (cursor);
    return out;
  }
  return out;
}

export async function readUses(env) {
  const base = {
    ok: true,
    product: USES_PRODUCT,
    author: USES_AUTHOR,
    uses: 0,
    by_host: {},
    by_path: {},
    by_day: {},
    recent: [],
  };
  const kv = usesKv(env);
  if (!kv) return { ...base, uses_kv: false };
  let uses = 0;
  try {
    uses = Number(await kv.get(USES_TOTAL_KEY)) || 0;
  } catch {
    uses = 0;
  }
  let recent = [];
  try {
    const raw = await kv.get(USES_LOG_KEY);
    recent = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(recent)) recent = [];
  } catch {
    recent = [];
  }
  const [by_host, by_path, by_day, by_method, by_op] = await Promise.all([
    collectPrefixed(kv, "host|"),
    collectPrefixed(kv, "path|"),
    collectPrefixed(kv, "day|"),
    collectPrefixed(kv, "method|"),
    collectPrefixed(kv, "op|"),
  ]);
  return {
    ...base,
    uses,
    by_host,
    by_path,
    by_day,
    by_method,
    by_op,
    recent,
    uses_kv: true,
  };
}

export async function peekUsesTotal(env) {
  const kv = usesKv(env);
  if (!kv) return null;
  try {
    const n = Number(await kv.get(USES_TOTAL_KEY));
    return Number.isFinite(n) ? n : 0;
  } catch {
    return null;
  }
}

export async function recordApiUse(env, request, response) {
  const dims = useDimsFromRequest(request, response);
  if (!shouldIncrementUse(dims.method, dims.path)) return { ok: true, skipped: true };
  return incrementUse(env, dims);
}

export async function finishWithUse(request, env, ctx, response) {
  const work = Promise.resolve()
    .then(() => recordApiUse(env, request, response))
    .catch((err) => {
      console.log(
        JSON.stringify({
          msg: "uses_record_failed",
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

/** In-memory KV stand-in for tests. */
export function memoryUsesKv(seed = {}) {
  const store = new Map(Object.entries(seed));
  return {
    async get(key) {
      return store.has(key) ? store.get(key) : null;
    },
    async put(key, value) {
      store.set(key, String(value));
    },
    async list({ prefix = "", limit = 1000, cursor } = {}) {
      const names = [...store.keys()].filter((k) => k.startsWith(prefix)).sort();
      const start = cursor ? Number(cursor) || 0 : 0;
      const slice = names.slice(start, start + limit);
      return {
        keys: slice.map((name) => ({ name })),
        list_complete: start + slice.length >= names.length,
        cursor: start + slice.length < names.length ? String(start + slice.length) : undefined,
      };
    },
    _store: store,
  };
}
