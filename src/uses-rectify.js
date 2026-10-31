/**
 * USES-RECTIFY-1.0: published /v1/uses cites each component.
 * uses = uses_legacy + uses_durable + sum_views + hosted_views + site_live_viewers.
 * The sum is computed on read. It is not written into the USES Durable Object.
 * nodes, live_nodes, and human_uses are not Softwares uses.
 *
 * Author: Aziel Eliab. Identity is Aziel Eliab only.
 */

import { USES_TOTAL_SOURCE } from "./uses.js";

export const USES_RECTIFY_SPEC = "USES-RECTIFY-1.0";
export const USES_FORMULA = "uses_legacy+uses_durable+sum_views+hosted_views+site_live_viewers";
export const USES_VIEWS_TTL_MS = 60_000;
const VIEW_TIMEOUT_MS = 2_000;

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

let viewsCache = { at: 0, complete: null };

export function clearUsesRectifyCache() {
  viewsCache = { at: 0, complete: null };
}

function whole(n) {
  return Number.isSafeInteger(n) && n >= 0 ? n : null;
}

async function fetchViews(url, fetchImpl) {
  const res = await fetchImpl(url, {
    headers: { "user-agent": "Mozilla/5.0", accept: "application/json" },
    signal: AbortSignal.timeout(VIEW_TIMEOUT_MS),
  });
  if (!res || res.ok !== true) return { ok: false, url };
  const body = await res.json();
  const views = whole(body && body.views);
  if (views == null) return { ok: false, url };
  return { ok: true, url, views };
}

async function readViewSnapshot(meters, fetchImpl, now) {
  const fresh = viewsCache.complete && now - viewsCache.at < USES_VIEWS_TTL_MS ? viewsCache.complete : null;
  if (fresh) return { ...fresh, source: "cache" };
  const list = Array.isArray(meters) ? meters : [];
  const meterJobs = list
    .filter((row) => row && row.slug && typeof row.meter_stats === "string" && row.meter_stats)
    .map(async (row) => {
      try {
        const got = await fetchViews(row.meter_stats, fetchImpl);
        return { slug: row.slug, ...got };
      } catch {
        return { ok: false, slug: row.slug, url: row.meter_stats };
      }
    });
  const hostedJobs = HOSTED_VIEW_SOURCES.map(async (src) => {
    try {
      const got = await fetchViews(src.url, fetchImpl);
      return { id: src.id, field: src.field, excluded_fields: src.excluded_fields, ...got };
    } catch {
      return { ok: false, id: src.id, url: src.url, field: src.field, excluded_fields: src.excluded_fields };
    }
  });
  const [meterRows, hostedRows] = await Promise.all([Promise.all(meterJobs), Promise.all(hostedJobs)]);
  const missing = [];
  let sum_views = 0;
  const meters_out = [];
  for (const row of meterRows) {
    if (!row.ok) {
      missing.push(row.slug || row.url);
      continue;
    }
    sum_views += row.views;
    meters_out.push({ slug: row.slug, url: row.url, views: row.views });
  }
  let hosted_views = 0;
  const hosted = {};
  for (const row of hostedRows) {
    if (!row.ok) {
      missing.push(row.id || row.url);
      hosted[row.id] = { url: row.url, field: "views", ok: false };
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
    complete: missing.length === 0,
    corpus_once: CORPUS_ONCE,
  };
  if (snap.complete) viewsCache = { at: now, complete: snap };
  else if (viewsCache.complete) return { ...viewsCache.complete, source: "last-complete", missing };
  return { ...snap, source: "partial" };
}

/**
 * Fold Softwares tracker views, hosted views, and site_live_viewers into a reconciled uses body.
 * A body that is not the legacy+durable total is returned unchanged.
 */
export async function rectifyUsesBody(body, { meters = [], siteLive = null, fetchImpl = null, now = Date.now() } = {}) {
  if (!body || body.uses_total_source !== USES_TOTAL_SOURCE) return body;
  const fetchFn = typeof fetchImpl === "function" ? fetchImpl : typeof globalThis.fetch === "function" ? globalThis.fetch : null;
  const uses_legacy = whole(body.uses_legacy) || 0;
  const uses_durable = whole(body.uses_durable) || 0;
  const uses_read = uses_legacy + uses_durable;
  let views = {
    sum_views: 0,
    hosted_views: 0,
    meters: [],
    hosted: {},
    missing: ["views-unread"],
    complete: false,
    source: "unread",
    corpus_once: CORPUS_ONCE,
  };
  if (fetchFn) views = await readViewSnapshot(meters, fetchFn, now);
  const site_live_viewers = siteLive && whole(siteLive.site_live_viewers) != null ? siteLive.site_live_viewers : 0;
  const site_live_viewers_complete = Boolean(siteLive && siteLive.site_live_viewers_complete === true && whole(siteLive.site_live_viewers) != null);
  return {
    ...body,
    uses: uses_read + views.sum_views + views.hosted_views + site_live_viewers,
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
      uses_views_complete: views.complete === true,
      uses_views_missing: views.missing,
      site_live_viewers_complete,
    },
    uses_formula_note:
      "published uses is uses_legacy + uses_durable + sum of front-door meter views + hosted views (azieleliab.com and godlock.uk views only) + site_live_viewers. Corpus hub views are the aziel-corpus tracker views and are counted once. nodes, live_nodes, human_uses, downloads, and hedidntjump are not added. The sum is not written into the USES Durable Object.",
  };
}
