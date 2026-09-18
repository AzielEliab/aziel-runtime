/**
 * BAN-SURVIVAL-1.0 — live multi-front door survival.
 *
 * One banned hostname or blocked exec path does not kill the runtime.
 * workers.dev + custom-domain hub /runtime + path quarantine.
 * Client door list = LIVE doors only. Never invent a live door.
 * Never claim shelves saved you. Cold shelves are a neighbor cite, not failover.
 *
 * Not a Softwares-tab product. Not a FragGate slug. Not a new MCP tool.
 * Author: Aziel Eliab only.
 */

import { AUTHOR_ID, AUTHOR_NAME, LIBRARY_FRONT_DOOR, LIBRARY_ORIGIN, RUNTIME_GITHUB, RUNTIME_HUB_URL } from "./seo.js";
import { CROSS_NETWORK_SURVIVAL, SURVIVAL_TIP } from "./cross-network-survival.js";
import { NO_LIE_SPEC } from "./no-lie.js";

/** Existing CNS / shelf cite — neighbor only. Not a live door. Not failover. */
export const COLD_MULTI_SHELF = "COLD-MULTI-SHELF-1.0";
export const LOCKSET_TIP = "c831429befc221bd41caeb0a6d1c5361602db5684abab7af6d39714084b6b245";
export const CORPUS_SHELVES = `${LIBRARY_ORIGIN}/shelves`;
export const TIP_PACK_SHA256 = "b549362c0736ddb54ddc488812327c464e0da1167281f92fd1a4263eedf5df37";
export const CODEBERG_TIP_PACK_URL = "https://codeberg.org/AzielEliab/aziel-lockset-tip";
export const ARCHIVE_ORG_TIP_PACK_URL = "https://archive.org/details/aziel-lockset-tip";
export const ARCHIVE_ORG_TIP_PACK_202609_URL = "https://archive.org/details/aziel-lockset-tip_202609";

export const BAN_SURVIVAL = "BAN-SURVIVAL-1.0";
export const BAN_SURVIVAL_AUTHOR = AUTHOR_NAME;
export const BAN_SURVIVAL_DOCS = "docs/designs/BAN-SURVIVAL-1.0.md";

export const PRIMARY_WORKER_ORIGIN = "https://aziel-runtime.vibelock.workers.dev";
export const GODLOCK_RUNTIME = "https://godlock.uk/runtime";

export const BAN_SURVIVAL_RULE =
  "One banned hostname or blocked exec path does not kill the runtime for clients. Live multi-front: workers.dev + custom-domain hub /runtime proxies + path quarantine. Client door list = LIVE doors only. Never invent a live door. Never claim shelves saved you.";

export const BAN_SURVIVAL_TIP =
  "BAN-SURVIVAL-1.0: one banned door is not the runtime gone — try the next LIVE named front (workers.dev → custom-domain /runtime). Never invent a live door. Never claim a banned host is LIVE. Never claim shelves saved you.";

export const REFUSE = Object.freeze({
  NO_LIE: "BAN-NO-LIE",
  NO_HYDRA: "BAN-NO-HYDRA",
  NO_SECOND_DOOR: "BAN-NO-SECOND-DOOR",
  NO_RESURRECT: "BAN-NO-RESURRECT",
  NO_LLM_REPLICA: "BAN-NO-LLM-REPLICA",
  NO_FAN: "BAN-NO-FAN",
  NO_SHELF_FAILOVER: "BAN-NO-SHELF-FAILOVER",
  ROUTE_BLOCKED: "BAN-ROUTE-BLOCKED",
  EXEC_QUARANTINE: "BAN-EXEC-QUARANTINE",
});

export const EXEC_PATHS = Object.freeze(["/mcp", "/v1/fraggate/call"]);
export const MAP_PATHS = Object.freeze([
  "/survival",
  "/v1/survival",
  "/doors",
  "/v1/doors",
  "/failover",
  "/v1/failover",
  "/cite.json",
  "/llms.txt",
  "/ai.txt",
  "/v1/mesh",
  "/v1/health",
  "/v1/ready",
  "/v1/software",
  "/openapi.json",
]);
export const READ_PATHS = Object.freeze([
  ...MAP_PATHS,
  "/shelves",
  "/v1/shelves",
  "/cold-copy",
  "/v1/cold-copy",
  "/v1/receipts",
]);

export const SURVIVAL_PATHS = Object.freeze([
  "/survival",
  "/v1/survival",
  "/doors",
  "/v1/doors",
  "/failover",
  "/v1/failover",
]);

export const NAMED_ROUTES = Object.freeze([
  Object.freeze({
    id: "workers-dev",
    kind: "exec-origin",
    role: "primary_public_worker",
    origin: PRIMARY_WORKER_ORIGIN,
    prefix: "",
    status: "live",
    independent: false,
    blast_radius: "cf-github",
    via: "workers.dev",
    exec: Object.freeze([`${PRIMARY_WORKER_ORIGIN}/mcp`, `${PRIMARY_WORKER_ORIGIN}/v1/fraggate/call`]),
    read: Object.freeze([
      `${PRIMARY_WORKER_ORIGIN}/survival`,
      `${PRIMARY_WORKER_ORIGIN}/cite.json`,
      `${PRIMARY_WORKER_ORIGIN}/llms.txt`,
      `${PRIMARY_WORKER_ORIGIN}/v1/mesh`,
      `${PRIMARY_WORKER_ORIGIN}/v1/software`,
      `${PRIMARY_WORKER_ORIGIN}/v1/health`,
    ]),
    note: "Primary public Worker hostname. Same Plane A tunnel. Not an independent shelf.",
  }),
  Object.freeze({
    id: "library-runtime",
    kind: "hub-proxy",
    role: "named_hub_front_door",
    origin: LIBRARY_FRONT_DOOR,
    prefix: "/runtime",
    status: "live",
    independent: false,
    blast_radius: "cf-github",
    via: "service-binding",
    exec: Object.freeze([`${LIBRARY_FRONT_DOOR}/mcp`, `${LIBRARY_FRONT_DOOR}/v1/fraggate/call`]),
    read: Object.freeze([
      `${LIBRARY_FRONT_DOOR}/survival`,
      `${LIBRARY_FRONT_DOOR}/cite.json`,
      `${LIBRARY_FRONT_DOOR}/llms.txt`,
      `${LIBRARY_FRONT_DOOR}/v1/mesh`,
      `${LIBRARY_FRONT_DOOR}/v1/software`,
      `${LIBRARY_FRONT_DOOR}/v1/health`,
    ]),
    note: "Aziel Digital Library /runtime (custom domain). Service binding to this Worker — survives a workers.dev hostname ban. Same FragGate door. Not a second door. Not a sixth shelf.",
  }),
  Object.freeze({
    id: "author-runtime",
    kind: "hub-proxy",
    role: "named_hub_front_door",
    origin: RUNTIME_HUB_URL,
    prefix: "/runtime",
    status: "live",
    independent: false,
    blast_radius: "cf-github",
    via: "service-binding",
    exec: Object.freeze([`${RUNTIME_HUB_URL}/mcp`, `${RUNTIME_HUB_URL}/v1/fraggate/call`]),
    read: Object.freeze([
      `${RUNTIME_HUB_URL}/survival`,
      `${RUNTIME_HUB_URL}/cite.json`,
      `${RUNTIME_HUB_URL}/llms.txt`,
      `${RUNTIME_HUB_URL}/v1/software`,
      `${RUNTIME_HUB_URL}/v1/health`,
    ]),
    note: "Author hub /runtime (azieleliab.com custom domain). Service binding. Same FragGate door. Same Plane A tunnel.",
  }),
  Object.freeze({
    id: "godlock-runtime",
    kind: "hub-proxy",
    role: "named_hub_front_door",
    origin: GODLOCK_RUNTIME,
    prefix: "/runtime",
    status: "live",
    independent: false,
    blast_radius: "cf-github",
    via: "service-binding",
    exec: Object.freeze([`${GODLOCK_RUNTIME}/mcp`, `${GODLOCK_RUNTIME}/v1/fraggate/call`]),
    read: Object.freeze([
      `${GODLOCK_RUNTIME}/survival`,
      `${GODLOCK_RUNTIME}/cite.json`,
      `${GODLOCK_RUNTIME}/v1/software`,
      `${GODLOCK_RUNTIME}/v1/health`,
    ]),
    note: "GodLock hub /runtime (custom domain). Service binding. Same FragGate door. Same Plane A tunnel. GodLock is a product name, not identity.",
  }),
]);

/** Existing CNS shelf cite. Neighbor only — not a live door, not failover. */
export const NEIGHBOR_SHELF_CITE = Object.freeze({
  failover: false,
  shelves_are_not_failover: true,
  github: RUNTIME_GITHUB,
  paper: `https://github.com/AzielEliab/aziel-runtime/blob/main/${BAN_SURVIVAL_DOCS}`,
  client_update: "https://github.com/AzielEliab/aziel-runtime/blob/main/docs/CLIENT_UPDATE.md",
  shelves: CORPUS_SHELVES,
  lockset_tip: LOCKSET_TIP,
  plane_b: Object.freeze({
    status: "slot",
    codeberg: CODEBERG_TIP_PACK_URL,
    archive_org: ARCHIVE_ORG_TIP_PACK_URL,
    archive_org_202609: ARCHIVE_ORG_TIP_PACK_202609_URL,
    pack_sha256: TIP_PACK_SHA256,
    hash_verify: "pass",
    live_ready: false,
    note: "Existing COLD-MULTI-SHELF cite. Hash-verify PASS still SLOT. Not a live door. Not ban-survival failover.",
  }),
  plane_c: Object.freeze({
    status: "slot",
    note: "USB airgap SLOT until CNS-OPERATOR-ATTEST. Not a live door. Not ban-survival failover.",
  }),
  note: "Shelves already exist as CNS. They do not keep LLM/MCP/OpenAPI clients alive. BAN-NO-SHELF-FAILOVER.",
});

/** @deprecated neighbor cite only — do not use as client failover */
export const COLD_FALLBACK = NEIGHBOR_SHELF_CITE;

export const CLIENT_ORDER = Object.freeze([
  "try primary workers.dev exec (POST /mcp or POST /v1/fraggate/call)",
  "if hostname or exec path blocked: try the next LIVE custom-domain hub /runtime (library, author, godlock — same FragGate door, service binding)",
  "if one exec path is quarantined: remaining LIVE exec paths on remaining LIVE fronts still run",
  "if exec is gone on a front: remaining LIVE read surfaces on remaining LIVE fronts still publish this door map (honest DEGRADED for that front). Cold shelves are not a live door.",
]);

function normPath(pathname) {
  const path = String(pathname || "/")
    .split("?")[0]
    .split("#")[0];
  const trimmed = path.replace(/\/+$/, "") || "/";
  return trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
}

export function isSurvivalPath(pathname) {
  return SURVIVAL_PATHS.includes(normPath(pathname));
}

export function isExecPath(pathname) {
  return EXEC_PATHS.includes(normPath(pathname));
}

export function isReadPath(pathname) {
  return READ_PATHS.includes(normPath(pathname));
}

export function parseBlockedRoutes(env) {
  const raw = env && (env.BAN_SURVIVAL_BLOCKED || env.BLOCKED_ROUTES);
  if (raw == null || raw === "") return [];
  return String(raw)
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((token) => {
      const [id, path] = token.split(":");
      return {
        id: String(id || "").trim(),
        path: path ? (String(path).startsWith("/") ? path : `/${path}`) : null,
      };
    })
    .filter((row) => row.id);
}

export function routeIdForOrigin(origin) {
  const base = String(origin || "")
    .replace(/\/$/, "")
    .toLowerCase();
  if (!base) return "workers-dev";
  if (base.includes("azielcorpuslibrary.net")) return "library-runtime";
  if (base.includes("azieleliab.com")) return "author-runtime";
  if (base.includes("godlock.uk")) return "godlock-runtime";
  if (base.includes("workers.dev")) return "workers-dev";
  return null;
}

export function isRouteBlocked(env, origin, pathname) {
  const blocked = parseBlockedRoutes(env);
  if (!blocked.length) return null;
  const id = routeIdForOrigin(origin);
  const path = normPath(pathname);
  for (const row of blocked) {
    if (row.id !== id) continue;
    if (!row.path || row.path === path) return row;
  }
  return null;
}

export function routeIsFullyBlocked(env, routeId) {
  return parseBlockedRoutes(env).some((b) => b.id === routeId && !b.path);
}

export function doorMode(env) {
  return parseBlockedRoutes(env).length ? "DEGRADED" : "LIVE";
}

export function namedExecOrigins() {
  return NAMED_ROUTES.map((r) => r.origin);
}

export function liveRoutes(env) {
  return NAMED_ROUTES.filter((r) => !routeIsFullyBlocked(env, r.id));
}

export function liveExecOrigins(env) {
  return liveRoutes(env).map((r) => r.origin);
}

export function liveExecUrls(env) {
  const out = [];
  for (const r of liveRoutes(env)) {
    for (const path of EXEC_PATHS) {
      if (!isRouteBlocked(env, r.origin, path)) out.push(`${r.origin}${path}`);
    }
  }
  return out;
}

export function liveDoors(env) {
  return liveRoutes(env).map((r) => {
    const blockedPaths = parseBlockedRoutes(env)
      .filter((b) => b.id === r.id && b.path)
      .map((b) => b.path);
    return {
      id: r.id,
      origin: r.origin,
      via: r.via,
      status: "live",
      independent: false,
      exec: EXEC_PATHS.filter((p) => !blockedPaths.includes(p)).map((p) => `${r.origin}${p}`),
      read: (r.read || []).slice(),
    };
  });
}

/**
 * Stdio / client origin list. A pinned non-default --url stays pinned
 * (tests and operator override do not wander onto unnamed hosts).
 * Unpinned lists LIVE named fronts only.
 */
export function bridgeOrigins(flags = {}, env = {}) {
  const pinned = String(flags.url || env.AZIEL_RUNTIME_URL || "")
    .trim()
    .replace(/\/$/, "");
  const failoverOff = String(env.AZIEL_RUNTIME_FAILOVER || "").trim() === "0";
  if (pinned && pinned !== PRIMARY_WORKER_ORIGIN) return [pinned];
  if (failoverOff && pinned) return [pinned];
  if (failoverOff) return [PRIMARY_WORKER_ORIGIN];
  return liveExecOrigins(env);
}

export function nextExecOrigin(failedOrigin, flags, env) {
  const list = bridgeOrigins(flags, env);
  const failed = String(failedOrigin || "")
    .replace(/\/$/, "")
    .replace(/\/mcp$/, "");
  const idx = list.findIndex((o) => o === failed);
  if (idx === -1) return list[0] || null;
  return list[idx + 1] || null;
}

export function shouldFailoverStatus(status) {
  const n = Number(status);
  return n === 403 || n === 429 || n === 502 || n === 503 || n === 521 || n === 522 || n === 523 || n === 524;
}

export function judgeBannedHostLive(input) {
  const src = input && typeof input === "object" ? input : {};
  if (
    src.banned_host_is_live === true ||
    src.claim_live_on_banned_host === true ||
    src.lie_to_survive === true ||
    src.paint_live === true
  ) {
    return {
      accept: false,
      action: "refuse",
      reason: REFUSE.NO_LIE,
      mode: "DEGRADED",
      note: "Never claim a banned host is LIVE. Prefer honest DEGRADED + the next LIVE front.",
    };
  }
  return { accept: true, action: "ok", mode: src.mode || "LIVE" };
}

export function judgeUnmarkedHydra(input) {
  const src = input && typeof input === "object" ? input : {};
  if (
    src.unmarked_hydra === true ||
    src.unnamed_failover === true ||
    src.anycast_concealment === true ||
    (Array.isArray(src.origins) && src.origins.some((o) => !o || String(o).trim() === ""))
  ) {
    return {
      accept: false,
      action: "refuse",
      reason: REFUSE.NO_HYDRA,
      note: "Named hosts only. No unmarked hydra. No unnamed failover.",
    };
  }
  return { accept: true, action: "ok", named_hosts_only: true };
}

export function judgeSecondDoor(input) {
  const src = input && typeof input === "object" ? input : {};
  if (
    src.second_door === true ||
    src.secret_backdoor === true ||
    src.backdoor_exec === true ||
    src.fraggate_is_not_the_door === true
  ) {
    return {
      accept: false,
      action: "refuse",
      reason: REFUSE.NO_SECOND_DOOR,
      door: "fraggate",
      note: "FragGate remains THE public exec door. Hub /runtime is the same door, not a second door.",
    };
  }
  return { accept: true, action: "ok", door: "fraggate", second_door: false };
}

export function judgeInventedLiveShelf(input) {
  const src = input && typeof input === "object" ? input : {};
  if (
    src.plane_b_live === true ||
    src.plane_c_live === true ||
    src.invent_doi === true ||
    src.invent_live_door === true
  ) {
    return {
      accept: false,
      action: "refuse",
      reason: REFUSE.NO_FAN,
      plane_b: "slot",
      plane_c: "slot",
      doi: null,
      note: "Do not invent LIVE Plane B/C or a fake live door. doi null.",
    };
  }
  return { accept: true, action: "ok", plane_b: "slot", plane_c: "slot", doi: null };
}

export function judgeShelfFailover(input) {
  const src = input && typeof input === "object" ? input : {};
  if (
    src.shelves_saved_you === true ||
    src.cold_shelf_is_failover === true ||
    src.failover_to_plane_b === true ||
    src.failover_to_archive === true ||
    src.failover_to_tip_pack === true ||
    src.plane_b_is_ban_survival === true ||
    src.tip_pack_is_live_door === true
  ) {
    return {
      accept: false,
      action: "refuse",
      reason: REFUSE.NO_SHELF_FAILOVER,
      shelves_are_not_failover: true,
      note: "Cold shelves / tip-packs / archive.org are not a live door. They do not keep LLM/MCP/OpenAPI clients alive.",
    };
  }
  return { accept: true, action: "ok", shelves_are_not_failover: true };
}

export function judgeHostnameResurrection(input) {
  const src = input && typeof input === "object" ? input : {};
  if (src.public_hostname_resurrection === true || src.restore_pulled_host === true) {
    return {
      accept: false,
      action: "refuse",
      reason: REFUSE.NO_RESURRECT,
      note: "Die-with-pull. Phoenix is wait / re-seal, not public hostname resurrection.",
    };
  }
  return { accept: true, action: "ok", public_hostname_resurrection: false };
}

export function judgeLlmReplica(input) {
  const src = input && typeof input === "object" ? input : {};
  if (src.llm_memory_is_replica === true || src.model_recollection_is_shelf === true) {
    return {
      accept: false,
      action: "refuse",
      reason: REFUSE.NO_LLM_REPLICA,
      note: "LLM memory is not a replica. Survival is matching bytes, not recollection.",
    };
  }
  return { accept: true, action: "ok" };
}

export function applyBanSurvival(input) {
  const checks = [
    judgeBannedHostLive(input),
    judgeUnmarkedHydra(input),
    judgeSecondDoor(input),
    judgeInventedLiveShelf(input),
    judgeShelfFailover(input),
    judgeHostnameResurrection(input),
    judgeLlmReplica(input),
  ];
  const breaks = checks.filter((c) => !c.accept);
  return {
    ok: breaks.length === 0,
    spec: BAN_SURVIVAL,
    breaks: breaks.map((b) => b.reason),
    checks,
  };
}

export function blockedRouteRefuse(row, origin, env) {
  return {
    ok: false,
    status: 503,
    code: row && row.path ? REFUSE.EXEC_QUARANTINE : REFUSE.ROUTE_BLOCKED,
    spec: BAN_SURVIVAL,
    mode: "DEGRADED",
    door: "fraggate",
    second_door: false,
    lie_to_survive: false,
    shelves_are_not_failover: true,
    route: row || null,
    origin: String(origin || "").replace(/\/$/, "") || null,
    message:
      "This named exec route is operator-quarantined (honest DEGRADED). Try the next LIVE custom-domain /runtime. Never invent a live door. Never claim shelves saved you.",
    failover: failoverCite(origin, env),
  };
}

export function failoverCite(origin, env) {
  const live = liveExecOrigins(env);
  return {
    spec: BAN_SURVIVAL,
    rule: BAN_SURVIVAL_RULE,
    tip: BAN_SURVIVAL_TIP,
    client_order: CLIENT_ORDER.slice(),
    live_doors: liveDoors(env),
    exec_origins: live.slice(),
    next: nextExecOrigin(origin, {}, env),
    read: MAP_PATHS.slice(),
    shelves_are_not_failover: true,
    lie_to_survive: false,
    second_door: false,
    unmarked_hydra: false,
  };
}

export function rateLimitFailoverCite(decision, origin, env) {
  const cite = failoverCite(origin, env);
  const current = String(origin || "").replace(/\/$/, "");
  return {
    ...cite,
    exec_origins: cite.exec_origins.filter((o) => o !== current),
    live_doors: cite.live_doors.filter((d) => d.origin !== current),
    rate_limit: {
      code: "RATE_LIMIT",
      scope: decision && decision.scope,
      limit: decision && decision.limit,
      retry_after: decision && decision.retry_after,
      enforcement: (decision && decision.enforcement) || "isolate",
      note: "Honest capacity. Do not retry-storm this door. Try the next LIVE named front or wait Retry-After. Shelves are not a live door.",
    },
  };
}

export function survivalCacheHeaders() {
  return {
    "Cache-Control": "public, max-age=120",
    "CDN-Cache-Control": "public, max-age=120",
  };
}

export function routesDoc(env) {
  const blocked = parseBlockedRoutes(env);
  return NAMED_ROUTES.map((r) => {
    const hits = blocked.filter((b) => b.id === r.id);
    const fully = hits.some((h) => !h.path);
    const status = fully ? "blocked" : hits.length ? "degraded" : r.status;
    return {
      ...r,
      exec: r.exec.slice(),
      read: r.read.slice(),
      status,
      blocked_paths: hits.map((h) => h.path).filter(Boolean),
    };
  });
}

export function survivalDoc(origin, env) {
  const base = String(origin || "").replace(/\/$/, "");
  const mode = doorMode(env);
  return {
    spec: BAN_SURVIVAL,
    rule: BAN_SURVIVAL_RULE,
    tip: BAN_SURVIVAL_TIP,
    author: BAN_SURVIVAL_AUTHOR,
    identity: BAN_SURVIVAL_AUTHOR,
    person_id: AUTHOR_ID,
    umbrella: CROSS_NETWORK_SURVIVAL,
    survival_tip: SURVIVAL_TIP,
    no_lie_spec: NO_LIE_SPEC,
    cold_multi_shelf: COLD_MULTI_SHELF,
    mode,
    lie_to_survive: false,
    rewrite_key: false,
    second_door: false,
    backdoor_exec: false,
    fraggate_is_the_door: true,
    named_hosts_only: true,
    unmarked_hydra: false,
    public_hostname_resurrection: false,
    independent: false,
    blast_radius: "cf-github",
    runtime_is_shelf: false,
    shelves_are_not_failover: true,
    software_tab: false,
    fraggate_slug: false,
    door: "fraggate",
    routes: routesDoc(env),
    live_doors: liveDoors(env),
    exec_origins: liveExecOrigins(env),
    exec_urls: liveExecUrls(env),
    exec_paths: EXEC_PATHS.slice(),
    read_paths: MAP_PATHS.slice(),
    client_order: CLIENT_ORDER.slice(),
    neighbor_shelf_cite: {
      failover: false,
      shelves: NEIGHBOR_SHELF_CITE.shelves,
      lockset_tip: NEIGHBOR_SHELF_CITE.lockset_tip,
      plane_b: "slot",
      plane_c: "slot",
      note: NEIGHBOR_SHELF_CITE.note,
    },
    cite: base ? `${base}/cite.json` : "/cite.json",
    llms: base ? `${base}/llms.txt` : "/llms.txt",
    paper: BAN_SURVIVAL_DOCS,
    visible_1520: false,
    growth_on: true,
    remain_off_untouched: true,
    note:
      "Hub /runtime is the same FragGate door via service binding (survives a workers.dev hostname ban). " +
      "Same Plane A tunnel — not four independent blast-radius doors. They are four named live fronts. " +
      "Client door list = LIVE only. Cold shelves are a neighbor cite, not failover. " +
      "Never claim a banned host is LIVE. Never claim shelves saved you.",
  };
}

export function survivalCiteField(origin, env) {
  const base = String(origin || "").replace(/\/$/, "");
  return {
    spec: BAN_SURVIVAL,
    author: BAN_SURVIVAL_AUTHOR,
    identity: BAN_SURVIVAL_AUTHOR,
    person_id: AUTHOR_ID,
    kind: "law",
    rule: BAN_SURVIVAL_RULE,
    tip: BAN_SURVIVAL_TIP,
    umbrella: CROSS_NETWORK_SURVIVAL,
    no_lie_spec: NO_LIE_SPEC,
    cold_multi_shelf: COLD_MULTI_SHELF,
    doi: null,
    survival: base ? `${base}/survival` : "/survival",
    survival_json: base ? `${base}/v1/survival` : "/v1/survival",
    doors: base ? `${base}/doors` : "/doors",
    failover: base ? `${base}/failover` : "/failover",
    primary: PRIMARY_WORKER_ORIGIN,
    library_runtime: LIBRARY_FRONT_DOOR,
    author_runtime: RUNTIME_HUB_URL,
    godlock_runtime: GODLOCK_RUNTIME,
    live_doors: liveDoors(env),
    exec_origins: liveExecOrigins(env),
    client_order: CLIENT_ORDER.slice(),
    exec_paths: EXEC_PATHS.slice(),
    read_paths: MAP_PATHS.slice(),
    shelves_are_not_failover: true,
    neighbor_shelf_cite: {
      failover: false,
      shelves: NEIGHBOR_SHELF_CITE.shelves,
      lockset_tip: NEIGHBOR_SHELF_CITE.lockset_tip,
      plane_b: "slot",
      plane_c: "slot",
    },
    lie_to_survive: false,
    second_door: false,
    unmarked_hydra: false,
    public_hostname_resurrection: false,
    runtime_is_shelf: false,
    software_tab: false,
    fraggate_slug: false,
    paper: BAN_SURVIVAL_DOCS,
  };
}

export function survivalLlmsBlock(origin, env) {
  const cite = survivalCiteField(origin, env);
  return [
    "## Ban / blocked-endpoint survival (BAN-SURVIVAL-1.0)",
    "",
    BAN_SURVIVAL_TIP,
    "",
    BAN_SURVIVAL_RULE,
    "",
    `Umbrella: ${CROSS_NETWORK_SURVIVAL}. NO-LIE / NO-REWRITE: never claim a banned host is LIVE. Never claim shelves saved you.`,
    `Person @id: ${AUTHOR_ID}. No visible 15:20 chrome.`,
    `Machine map: ${cite.survival} · ${cite.survival_json} · aliases ${cite.doors} ${cite.failover}`,
    `LIVE exec origins (same Plane A tunnel, not independent shelves): ${cite.exec_origins.join(" · ")}`,
    "Client order: workers.dev exec → next LIVE custom-domain /runtime (library, author, godlock) → remaining LIVE exec paths → remaining LIVE read surfaces that republish this map.",
    "Hub /runtime is the same FragGate door — not a second door and not a sixth shelf.",
    "Cold shelves / tip-packs / archive.org are a neighbor CNS cite, not a live door, not failover.",
    "429 on /mcp or FragGate includes the next LIVE front. Do not retry-storm the same path.",
    "",
  ].join("\n");
}

export function survivalSkillMarkdown(origin, env) {
  const cite = survivalCiteField(origin, env);
  return `## Ban / blocked-endpoint survival (BAN-SURVIVAL-1.0)

${BAN_SURVIVAL_RULE}

Machine map: \`GET ${cite.survival}\` / \`GET ${cite.survival_json}\` (aliases \`/doors\` \`/failover\`). Person \`@id\` ${AUTHOR_ID}. Door list = LIVE only.

1. Try \`${PRIMARY_WORKER_ORIGIN}/mcp\` (or \`POST /v1/fraggate/call\`).
2. If that hostname or exec path is blocked: try named LIVE hub \`/runtime\` — \`${LIBRARY_FRONT_DOOR}\`, \`${RUNTIME_HUB_URL}\`, \`${GODLOCK_RUNTIME}\` (custom domain + service binding; same FragGate door).
3. If one exec path is quarantined: remaining LIVE exec paths on remaining LIVE fronts still run.
4. If exec is gone on a front: remaining LIVE read surfaces (\`/survival\` \`/cite.json\` \`/llms.txt\` \`/v1/health\`) still publish this map. Mode **DEGRADED** on the banned front.

Never invent a live door. Never claim a banned host is LIVE. Never claim shelves saved you. No new MCP tool. FragGate stays THE door.
`;
}

export function dispatchSurvivalHttp(method, pathname, origin, env) {
  const verb = String(method || "GET").toUpperCase();
  const path = normPath(pathname);
  if (!isSurvivalPath(path)) return null;
  if (verb === "GET" || verb === "HEAD") {
    return { status: 200, body: survivalDoc(origin, env) };
  }
  return {
    status: 405,
    body: {
      ok: false,
      code: "BAN-CITE-ONLY",
      spec: BAN_SURVIVAL,
      message: "GET /survival cites BAN-SURVIVAL-1.0. Not a door promote. Not a live registrar.",
      path,
      method: verb,
      hint: "GET /survival",
    },
  };
}
