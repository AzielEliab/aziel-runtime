/**
 * USES-RECTIFY-1.0: published /v1/uses cites each component.
 * uses = uses_legacy + uses_durable + sum_views + hosted_views + site_live_viewers.
 * The sum is computed on read. It is not written into the USES Durable Object.
 * nodes, live_nodes, and human_uses are not Softwares uses.
 *
 * Front-door meter views are read through the Worker's service binding. A fetch of
 * https://{worker}.vibelock.workers.dev from this Worker is same-account and Cloudflare
 * returns error 1042, which dropped every meter (sum_views 0). The public URL is only
 * a fallback when the binding is missing or does not answer. A timeout, 1042, or a
 * body without an integer `views` is listed in uses_views_missing. It is not filled
 * from an older snapshot, and the rollup is not complete.
 *
 * Author: Aziel Eliab. Identity is Aziel Eliab only.
 */

import { serviceBindingName } from "./software-meters.js";
import { USES_TOTAL_SOURCE } from "./uses.js";

export const USES_RECTIFY_SPEC = "USES-RECTIFY-1.0";
export const USES_FORMULA = "uses_legacy+uses_durable+sum_views+hosted_views+site_live_viewers";
export const USES_VIEWS_TTL_MS = 60_000;
/** Matches the product proxy. 2s aborted the whole roster under parallel subrequests. */
export const USES_VIEW_TIMEOUT_MS = 4_000;

/**
 * Hosted page views that are not a download-tracker counter.
 * Only the `views` field is read. nodes, live_nodes, human_uses, and uses are ignored.
 */
export const HOSTED_VIEW_SOURCES = Object.freeze([
  {
    id: "azieleliab",
    url: "https://www.azieleliab.com/v1/stats",
    field: "views",
    excluded_fields: Object.freeze(["nodes", "live_nodes", "human_uses"]),
  },
  {
    id: "godlock",
    url: "https://godlock.uk/stats",
    field: "views",
    excluded_fields: Object.freeze(["nodes", "live_nodes", "uses"]),
  },
]);

/** Corpus hub /stats views match aziel-corpus-download-tracker /stats views. Counted once, in sum_views. */
export const CORPUS_ONCE = Object.freeze({
  meter_slug: "aziel-corpus",
  hub_url: "https://www.azielcorpuslibrary.net/stats",
  counted_in: "sum_views",
  hub_added: false,
});

export const USES_EXCLUDED = Object.freeze({
  nodes: "Aziel node census is not Softwares uses.",
  live_nodes: "live_nodes is human mesh users plus site_live_viewers. It is not added.",
  human_uses: "human_uses is not added. The uses component is uses_legacy + uses_durable.",
  downloads: "Download counters are not views.",
  hedidntjump: "hedidntjump.com is not a Softwares meter and is excluded from site viewers.",
});

const VIEWS_INCOMPLETE_NOTE =
  "uses_complete is false because one or more Softwares meters or hosted view sources are missing. Missing meters are not counted as a complete total.";

let viewsCache = { at: 0, complete: null };

export function clearUsesRectifyCache() {
  viewsCache = { at: 0, complete: null };
}

function whole(n) {
  return Number.isSafeInteger(n) && n >= 0 ? n : null;
}

function viewInit(timeoutMs) {
  return {
    method: "GET",
    headers: { "user-agent": "Mozilla/5.0", accept: "application/json" },
    signal: AbortSignal.timeout(timeoutMs),
  };
}

function failureReason(err) {
  const name = err && err.name ? String(err.name) : "";
  if (name === "TimeoutError" || name === "AbortError") return "timeout";
  const msg = String(err && err.message ? err.message : err || "fetch-failed");
  if (msg.includes("1042")) return "worker-1042";
  return msg.slice(0, 160);
}

function viewsFromBody(body, url) {
  const views = whole(body && body.views);
  if (views == null) return { ok: false, url, reason: "views-missing" };
  return { ok: true, url, views };
}

async function responseViews(res, url) {
  if (!res || res.ok !== true) {
    const status = res && Number.isFinite(Number(res.status)) ? Number(res.status) : 0;
    return { ok: false, url, reason: status ? "http-" + status : "no-response" };
  }
  try {
    return viewsFromBody(await res.json(), url);
  } catch {
    return { ok: false, url, reason: "bad-json" };
  }
}

async function fetchPublicViews(url, fetchImpl, timeoutMs) {
  const res = await fetchImpl(url, viewInit(timeoutMs));
  return responseViews(res, url);
}

async function fetchBoundViews(row, bindFetch, timeoutMs) {
  if (typeof bindFetch !== "function") return null;
  const fetchBound = bindFetch(row);
  if (typeof fetchBound !== "function") return null;
  const binding = serviceBindingName(row);
  const res = await fetchBound(new Request(row.meter_stats, viewInit(timeoutMs)));
  const got = await responseViews(res, row.meter_stats);
  return { ...got, via: "service-binding", binding };
}

async function fetchOneMeter(row, bindFetch, fetchImpl, timeoutMs) {
  const url = row.meter_stats;
  const binding = serviceBindingName(row);
  let bound = null;
  try {
    bound = await fetchBoundViews(row, bindFetch, timeoutMs);
  } catch (err) {
    bound = { ok: false, url, via: "service-binding", binding, reason: failureReason(err) };
  }
  if (bound && bound.ok) return bound;
  if (typeof fetchImpl !== "function") {
    return bound || { ok: false, url, via: "unbound", binding, reason: "no-binding" };
  }
  try {
    const pub = await fetchPublicViews(url, fetchImpl, timeoutMs);
    if (pub.ok) return { ...pub, via: bound ? "public-fallback" : "public", binding };
    return {
      ok: false,
      url,
      via: bound ? "public-fallback" : "public",
      binding,
      reason: (bound && bound.reason) || pub.reason || "unread",
      public_reason: pub.reason || null,
    };
  } catch (err) {
    return {
      ok: false,
      url,
      via: bound ? "public-fallback" : "public",
      binding,
      reason: (bound && bound.reason) || failureReason(err),
      public_reason: failureReason(err),
    };
  }
}

function unreadSnapshot() {
  return {
    sum_views: 0,
    hosted_views: 0,
    meters: [],
    hosted: {},
    missing: ["views-unread"],
    errors: [{ slug: "views-unread", reason: "no-fetch" }],
    complete: false,
    source: "unread",
    corpus_once: CORPUS_ONCE,
  };
}

async function readViewSnapshot(meters, bindFetch, fetchImpl, now, timeoutMs) {
  const fresh = viewsCache.complete && now - viewsCache.at < USES_VIEWS_TTL_MS ? viewsCache.complete : null;
  if (fresh) return { ...fresh, source: "cache" };
  const list = (Array.isArray(meters) ? meters : []).filter(
    (row) => row && row.slug && typeof row.meter_stats === "string" && row.meter_stats,
  );
  const meterRows = await Promise.all(
    list.map(async (row) => {
      const got = await fetchOneMeter(row, bindFetch, fetchImpl, timeoutMs);
      return { slug: row.slug, ...got };
    }),
  );
  const hostedRows = await Promise.all(
    HOSTED_VIEW_SOURCES.map(async (src) => {
      if (typeof fetchImpl !== "function") {
        return {
          ok: false,
          id: src.id,
          url: src.url,
          field: src.field,
          excluded_fields: src.excluded_fields,
          reason: "no-fetch",
          via: "unbound",
        };
      }
      try {
        const got = await fetchPublicViews(src.url, fetchImpl, timeoutMs);
        return { id: src.id, field: src.field, excluded_fields: src.excluded_fields, via: "public", ...got };
      } catch (err) {
        return {
          ok: false,
          id: src.id,
          url: src.url,
          field: src.field,
          excluded_fields: src.excluded_fields,
          reason: failureReason(err),
          via: "public",
        };
      }
    }),
  );
  const missing = [];
  const errors = [];
  let sum_views = 0;
  const meters_out = [];
  for (const row of meterRows) {
    if (!row.ok) {
      missing.push(row.slug || row.url);
      errors.push({
        slug: row.slug || null,
        url: row.url || null,
        reason: row.reason || "unread",
        via: row.via || null,
        binding: row.binding || null,
        ...(row.public_reason ? { public_reason: row.public_reason } : {}),
      });
      continue;
    }
    sum_views += row.views;
    meters_out.push({ slug: row.slug, url: row.url, views: row.views, via: row.via || "public" });
  }
  let hosted_views = 0;
  const hosted = {};
  for (const row of hostedRows) {
    if (!row.ok) {
      missing.push(row.id || row.url);
      errors.push({ slug: row.id || null, url: row.url || null, reason: row.reason || "unread", via: row.via || "public" });
      hosted[row.id] = { url: row.url, field: "views", ok: false, reason: row.reason || "unread" };
      continue;
    }
    hosted_views += row.views;
    hosted[row.id] = { url: row.url, field: "views", views: row.views, ok: true, excluded_fields: row.excluded_fields };
  }
  const snap = {
    sum_views,
    hosted_views,
    meters: meters_out,
    hosted,
    missing,
    errors,
    complete: missing.length === 0 && meters_out.length === list.length,
    corpus_once: CORPUS_ONCE,
  };
  // Only a full roster is cached. A failed read is not replaced by the previous sum.
  if (snap.complete) viewsCache = { at: now, complete: snap };
  return { ...snap, source: snap.complete ? "live" : "partial" };
}

function canReadViews(meters, bindFetch, fetchFn) {
  if (typeof fetchFn === "function") return true;
  if (typeof bindFetch !== "function") return false;
  return (Array.isArray(meters) ? meters : []).some((row) => typeof bindFetch(row) === "function");
}

/**
 * Fold Softwares tracker views, hosted views, and site_live_viewers into a reconciled uses body.
 * A body that is not the legacy+durable total is returned unchanged.
 */
export async function rectifyUsesBody(body, { meters = [], siteLive = null, bindFetch = null, fetchImpl = null, now = Date.now(), timeoutMs = USES_VIEW_TIMEOUT_MS } = {}) {
  if (!body || body.uses_total_source !== USES_TOTAL_SOURCE) return body;
  const fetchFn = typeof fetchImpl === "function"
    ? fetchImpl
    : process.env.AZIEL_HERMETIC === "1"
      ? null
      : typeof globalThis.fetch === "function"
        ? globalThis.fetch
        : null;
  const uses_legacy = whole(body.uses_legacy) || 0;
  const uses_durable = whole(body.uses_durable) || 0;
  const uses_read = uses_legacy + uses_durable;
  const limit = Number.isFinite(Number(timeoutMs)) && Number(timeoutMs) > 0 ? Number(timeoutMs) : USES_VIEW_TIMEOUT_MS;
  const views = canReadViews(meters, bindFetch, fetchFn)
    ? await readViewSnapshot(meters, bindFetch, fetchFn, now, limit)
    : unreadSnapshot();
  const site_live_viewers = siteLive && whole(siteLive.site_live_viewers) != null ? siteLive.site_live_viewers : 0;
  const site_live_viewers_complete = Boolean(siteLive && siteLive.site_live_viewers_complete === true && whole(siteLive.site_live_viewers) != null);
  const rollupComplete = views.complete === true;
  const uses_complete = body.uses_complete === true && rollupComplete;
  return {
    ...body,
    uses: uses_read + views.sum_views + views.hosted_views + site_live_viewers,
    uses_complete,
    ...(uses_complete
      ? {}
      : {
          uses_complete_note: rollupComplete
            ? "uses_complete is false because the USES read itself was incomplete."
            : VIEWS_INCOMPLETE_NOTE,
        }),
    uses_formula: USES_FORMULA,
    uses_rectify_spec: USES_RECTIFY_SPEC,
    uses_components: {
      uses_legacy,
      uses_durable,
      uses_read,
      sum_views: views.sum_views,
      hosted_views: views.hosted_views,
      site_live_viewers,
      sum_views_meters: views.meters,
      hosted: views.hosted,
      corpus_once: views.corpus_once,
      excluded: USES_EXCLUDED,
      site_live_viewers_source: (siteLive && siteLive.site_live_viewers_source) || "mesh site_viewers single-key",
      site_live_viewers_components: siteLive && siteLive.site_live_viewers_components ? siteLive.site_live_viewers_components : {},
      uses_views_source: views.source,
      uses_views_complete: rollupComplete,
      uses_views_missing: views.missing,
      uses_views_errors: views.errors,
      site_live_viewers_complete,
    },
    uses_formula_note:
      "published uses is uses_legacy + uses_durable + sum of front-door meter views + hosted views (azieleliab.com and godlock.uk views only) + site_live_viewers. Meter views are read through each Softwares service binding. A public workers.dev fetch from this Worker is same-account error 1042 and is only a fallback. A missing or timed-out meter is listed and is not filled from an older snapshot. Corpus hub views are the aziel-corpus tracker views and are counted once. nodes, live_nodes, human_uses, downloads, and hedidntjump are not added. The sum is not written into the USES Durable Object. An incomplete rollup is not lifted to the shared floor.",
  };
}
