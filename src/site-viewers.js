/**
 * Fleet site-viewer presence for public Live Nodes.
 *
 * GodLock computes site_live_nodes locally (distinct human page sessions
 * with a heartbeat inside 5 minutes — see godlock workers/godlock-uk
 * presence.js). Runtime does not scrape hub /count. Hubs POST a fail-closed
 * heartbeat here. Missing, expired, or refused reports are 0.
 *
 * Allowed: godlock.uk + azieleliab.com + azielcorpuslibrary.net.
 * Excluded: hedidntjump.com. Bots, Softwares, downloads are refused.
 * NO-LIE: do not invent viewers. Zero is honest.
 *
 * Author: Aziel Eliab. Identity is Aziel Eliab only.
 */

export const SITE_LIVE_TTL_MS = 5 * 60 * 1000;
export const SITE_VIEWER_CAP = 10_000;
export const SITE_LIVE_KIND = "human-page";
export const SITE_LIVE_VIEWERS_PLANE = "hub-human-page-presence";
export const SITE_LIVE_HOSTS = Object.freeze(["godlock.uk", "azieleliab.com", "azielcorpuslibrary.net"]);
export const SITE_LIVE_EXCLUDED_HOSTS = Object.freeze(["hedidntjump.com"]);
export const SITE_LIVE_REFUSED_KINDS = Object.freeze([
  "bot",
  "bots",
  "crawler",
  "software",
  "softwares",
  "download",
  "downloads",
  "instance",
  "mcp",
]);

const HOST_ALIASES = Object.freeze({
  "godlock.uk": "godlock.uk",
  "www.godlock.uk": "godlock.uk",
  "azieleliab.com": "azieleliab.com",
  "www.azieleliab.com": "azieleliab.com",
  "azielcorpuslibrary.net": "azielcorpuslibrary.net",
  "www.azielcorpuslibrary.net": "azielcorpuslibrary.net",
  "hedidntjump.com": "hedidntjump.com",
  "www.hedidntjump.com": "hedidntjump.com",
});

export const SITE_LIVE_VIEWERS_NOTE =
  "site_live_viewers is concurrent human page presence across godlock.uk + azieleliab.com + azielcorpuslibrary.net, reported by hub heartbeats (POST /v1/mesh/site-presence). Same 5-minute TTL as mesh presence. GET /v1/mesh reads one sealed aggregate (live_nodes_generation / live_nodes_tip) and never pulls hub /count. Hubs paint live_nodes from that JSON — do not add a local /count. hedidntjump.com, bots, Softwares, and downloads are excluded. Missing or expired reports are 0. Do not invent viewers.";

export const SITE_PRESENCE_CONTRACT = Object.freeze({
  method: "POST",
  path: "/v1/mesh/site-presence",
  alias: "/v1/mesh/site-heartbeat",
  fraggate: { slug: "mesh", op: "site-presence" },
  body: Object.freeze({
    host: "godlock.uk | azieleliab.com | azielcorpuslibrary.net",
    viewers: "non-negative integer concurrent human page sessions (0.." + SITE_VIEWER_CAP + ")",
    kind: SITE_LIVE_KIND,
  }),
  ttl_ms: SITE_LIVE_TTL_MS,
  allowed_hosts: SITE_LIVE_HOSTS.slice(),
  excluded_hosts: SITE_LIVE_EXCLUDED_HOSTS.slice(),
  refused_kinds: SITE_LIVE_REFUSED_KINDS.slice(),
  pull_hub_count: false,
  invent: false,
  fail_closed: true,
  read: "single-key",
  paint: "live_nodes",
  local_recompute: false,
  radios: "not required — hub ingest, not a TX join",
  rate_kind: "mesh_mutate",
  note: SITE_LIVE_VIEWERS_NOTE,
});

export function emptySiteViewerComponents() {
  const out = {};
  for (const host of SITE_LIVE_HOSTS) out[host] = 0;
  return out;
}

export function normalizeSiteHostLabel(raw) {
  let s = String(raw == null ? "" : raw)
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "")
    .replace(/^\[|\]$/g, "");
  const host = s.split(":")[0];
  if (!host || !/^[a-z0-9._-]{1,80}$/.test(host)) return "";
  return HOST_ALIASES[host] || host;
}

export function sanitizeSiteHost(raw) {
  const host = normalizeSiteHostLabel(raw);
  if (!host) return { ok: false, code: "MESH-SITE-HOST", host: "", excluded: false };
  if (SITE_LIVE_EXCLUDED_HOSTS.includes(host)) {
    return { ok: false, code: "MESH-SITE-HOST-EXCLUDED", host, excluded: true };
  }
  if (!SITE_LIVE_HOSTS.includes(host)) {
    return { ok: false, code: "MESH-SITE-HOST", host, excluded: false };
  }
  return { ok: true, host, excluded: false };
}

export function sanitizeSiteKind(raw) {
  const kind = String(raw == null ? "" : raw)
    .trim()
    .toLowerCase();
  if (!kind) return { ok: false, code: "MESH-SITE-KIND", kind: "" };
  if (SITE_LIVE_REFUSED_KINDS.includes(kind)) {
    return { ok: false, code: "MESH-SITE-KIND-REFUSED", kind };
  }
  if (kind !== SITE_LIVE_KIND) return { ok: false, code: "MESH-SITE-KIND", kind };
  return { ok: true, kind };
}

export function sanitizeSiteViewers(raw) {
  if (raw == null || raw === "") {
    return { ok: false, code: "MESH-SITE-VIEWERS", viewers: 0 };
  }
  if (typeof raw === "boolean") {
    return { ok: false, code: "MESH-SITE-VIEWERS", viewers: 0 };
  }
  if (typeof raw === "string" && !/^\d+$/.test(raw.trim())) {
    return { ok: false, code: "MESH-SITE-VIEWERS", viewers: 0 };
  }
  const n = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isFinite(n) || !Number.isInteger(n) || n < 0) {
    return { ok: false, code: "MESH-SITE-VIEWERS", viewers: 0 };
  }
  if (n > SITE_VIEWER_CAP) {
    return { ok: false, code: "MESH-SITE-VIEWERS-CAP", viewers: 0, cap: SITE_VIEWER_CAP };
  }
  return { ok: true, viewers: n };
}

export function pruneSiteViewers(raw, nowMs = Date.now()) {
  const src = raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {};
  const now = Number(nowMs);
  const t = Number.isFinite(now) ? now : Date.now();
  const out = {};
  for (const host of SITE_LIVE_HOSTS) {
    const row = src[host];
    if (!row || typeof row !== "object") continue;
    const seen = Date.parse(row.last_seen || "") || 0;
    const viewers = Number(row.viewers);
    if (!seen || t - seen > SITE_LIVE_TTL_MS) continue;
    if (!Number.isInteger(viewers) || viewers < 0) continue;
    if (row.kind !== SITE_LIVE_KIND) continue;
    out[host] = {
      host,
      viewers: Math.min(viewers, SITE_VIEWER_CAP),
      kind: SITE_LIVE_KIND,
      last_seen: row.last_seen,
    };
  }
  return out;
}

export function unwrapSiteViewerStore(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { generation: 0, sealed_at: "", hosts: {} };
  }
  if (raw.hosts && typeof raw.hosts === "object" && !Array.isArray(raw.hosts)) {
    const generation = Number(raw.generation);
    return {
      generation: Number.isInteger(generation) && generation > 0 ? generation : 0,
      sealed_at: typeof raw.sealed_at === "string" ? raw.sealed_at : "",
      hosts: raw.hosts,
    };
  }
  return { generation: 0, sealed_at: "", hosts: raw };
}

/** Newest last_seen wins per host. A missing side does not delete the other row. */
export function mergeSiteViewerRows(prev, next) {
  const left = prev && typeof prev === "object" && !Array.isArray(prev) ? prev : {};
  const right = next && typeof next === "object" && !Array.isArray(next) ? next : {};
  const out = {};
  for (const host of SITE_LIVE_HOSTS) {
    const a = left[host];
    const b = right[host];
    if (!a && !b) continue;
    if (!a) {
      out[host] = b;
      continue;
    }
    if (!b) {
      out[host] = a;
      continue;
    }
    const as = Date.parse(a.last_seen || "") || 0;
    const bs = Date.parse(b.last_seen || "") || 0;
    out[host] = bs >= as ? b : a;
  }
  return out;
}

export function siteViewerTuple(components) {
  const src = components && typeof components === "object" ? components : {};
  return SITE_LIVE_HOSTS.map((host) => `${host}=${Number.isInteger(src[host]) ? src[host] : Number(src[host]) || 0}`).join(",");
}

export function liveNodesTip(generation, humanMeshUsers, components) {
  const gen = Number(generation);
  const humans = Number(humanMeshUsers);
  return `${Number.isInteger(gen) && gen > 0 ? gen : 0}:${Number.isInteger(humans) && humans > 0 ? humans : 0}:${siteViewerTuple(components)}`;
}

export function siteViewerFleet(raw, nowMs = Date.now()) {
  const live = pruneSiteViewers(raw, nowMs);
  const components = emptySiteViewerComponents();
  let total = 0;
  for (const host of SITE_LIVE_HOSTS) {
    const n = live[host] && Number.isInteger(live[host].viewers) ? live[host].viewers : 0;
    components[host] = n;
    total += n;
  }
  return {
    site_live_viewers: total,
    components,
    hosts: SITE_LIVE_HOSTS.slice(),
    excluded_hosts: SITE_LIVE_EXCLUDED_HOSTS.slice(),
    complete: true,
    pull: false,
    invent: false,
    fail_closed: true,
    plane: SITE_LIVE_VIEWERS_PLANE,
    ttl_ms: SITE_LIVE_TTL_MS,
    note: SITE_LIVE_VIEWERS_NOTE,
  };
}

export function acceptSitePresence(payload, nowMs = Date.now()) {
  const src = payload && typeof payload === "object" && !Array.isArray(payload) ? payload : {};
  const host = sanitizeSiteHost(src.host || src.site || src.hostname);
  if (!host.ok) {
    return {
      ok: false,
      code: host.code,
      message: host.excluded
        ? "hedidntjump.com (and other excluded hosts) do not enter site_live_viewers."
        : "Pass { host } as godlock.uk, azieleliab.com, or azielcorpuslibrary.net.",
      host: host.host || "",
    };
  }
  const kind = sanitizeSiteKind(Object.prototype.hasOwnProperty.call(src, "kind") ? src.kind : src.plane);
  if (!kind.ok) {
    return {
      ok: false,
      code: kind.code,
      message:
        kind.code === "MESH-SITE-KIND-REFUSED"
          ? "Bots, Softwares, downloads, and MCP kinds are excluded from site_live_viewers."
          : "Pass { kind: \"human-page\" }. Only concurrent human page presence is accepted.",
      kind: kind.kind,
    };
  }
  const viewers = sanitizeSiteViewers(src.viewers != null ? src.viewers : src.site_live_viewers);
  if (!viewers.ok) {
    return {
      ok: false,
      code: viewers.code,
      message:
        viewers.code === "MESH-SITE-VIEWERS-CAP"
          ? `viewers must be an integer 0–${SITE_VIEWER_CAP}. Over-cap reports are refused (not clamped).`
          : "Pass { viewers } as a non-negative integer concurrent human page count. Do not invent viewers.",
      cap: viewers.cap,
    };
  }
  const now = Number(nowMs);
  const ts = new Date(Number.isFinite(now) ? now : Date.now()).toISOString();
  return {
    ok: true,
    record: {
      host: host.host,
      viewers: viewers.viewers,
      kind: kind.kind,
      last_seen: ts,
    },
  };
}
