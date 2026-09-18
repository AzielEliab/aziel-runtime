/**
 * BAN-SURVIVAL-1.0 — door / path survival under CROSS-NETWORK-SURVIVAL.
 *
 * One banned hostname or blocked exec path does not kill the runtime.
 * Named same-tunnel routes + read-surface quarantine + cold tip-hash.
 * Never invent a live door. Never lie to survive.
 *
 * Not a Softwares-tab product. Not a FragGate slug. Not a new MCP tool.
 * Author: Aziel Eliab only.
 */

import { AUTHOR_ID, AUTHOR_NAME, LIBRARY_FRONT_DOOR, LIBRARY_ORIGIN, RUNTIME_GITHUB, RUNTIME_HUB_URL } from "./seo.js";
import { CROSS_NETWORK_SURVIVAL, SURVIVAL_TIP } from "./cross-network-survival.js";
import { NO_LIE_SPEC } from "./no-lie.js";
import {
  ARCHIVE_ORG_TIP_PACK,
  ARCHIVE_ORG_TIP_PACK_202609,
  CODEBERG_TIP_PACK,
  COLD_MULTI_SHELF,
  CORPUS_SHELVES,
  LOCKSET_TIP,
} from "./cold-multi-shelf.js";

export const BAN_SURVIVAL = "BAN-SURVIVAL-1.0";
export const BAN_SURVIVAL_AUTHOR = AUTHOR_NAME;
export const BAN_SURVIVAL_DOCS = "docs/designs/BAN-SURVIVAL-1.0.md";

export const PRIMARY_WORKER_ORIGIN = "https://aziel-runtime.vibelock.workers.dev";
export const GODLOCK_RUNTIME = "https://godlock.uk/runtime";

export const BAN_SURVIVAL_RULE =
  "One banned hostname or blocked exec path does not kill the runtime for clients. Named same-tunnel routes + read-surface quarantine + cold tip-hash verify. Never invent a live door. Never lie to survive.";

export const BAN_SURVIVAL_TIP =
  "BAN-SURVIVAL-1.0: one banned door is not last tip gone — try the next named route, then read surfaces, then cold tip-hash. Never invent a live door. Never claim a banned host is LIVE.";

export const REFUSE = Object.freeze({
  NO_LIE: "BAN-NO-LIE",
  NO_HYDRA: "BAN-NO-HYDRA",
  NO_SECOND_DOOR: "BAN-NO-SECOND-DOOR",
  NO_RESURRECT: "BAN-NO-RESURRECT",
  NO_LLM_REPLICA: "BAN-NO-LLM-REPLICA",
  NO_FAN: "BAN-NO-FAN",
  ROUTE_BLOCKED: "BAN-ROUTE-BLOCKED",
  EXEC_QUARANTINE: "BAN-EXEC-QUARANTINE",
});

export const EXEC_PATHS = Object.freeze(["/mcp", "/v1/fraggate/call"]);
export const READ_PATHS = Object.freeze([
  "/survival",
  "/v1/survival",
  "/doors",
  "/v1/doors",
  "/failover",
  "/v1/failover",
  "/cite.json",
  "/llms.txt",
  "/ai.txt",
  "/shelves",
  "/v1/shelves",
  "/cold-copy",
  "/v1/cold-copy",
  "/v1/mesh",
  "/v1/health",
  "/v1/ready",
  "/v1/software",
  "/v1/receipts",
  "/openapi.json",
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
      `${PRIMARY_WORKER_ORIGIN}/shelves`,
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
      `${LIBRARY_FRONT_DOOR}/shelves`,
      `${LIBRARY_FRONT_DOOR}/v1/mesh`,
      `${LIBRARY_FRONT_DOOR}/v1/software`,
      `${LIBRARY_FRONT_DOOR}/v1/health`,
    ]),
    note: "Aziel Digital Library /runtime. Service binding to this Worker — survives a workers.dev hostname ban. Same FragGate door. Not a second door. Not a sixth shelf.",
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
    note: "Author hub /runtime (azieleliab.com). Service binding. Same FragGate door. Same Plane A tunnel.",
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
    note: "GodLock hub /runtime. Service binding. Same FragGate door. Same Plane A tunnel. GodLock is a product name, not identity.",
  }),
]);

export const COLD_FALLBACK = Object.freeze({
  github: RUNTIME_GITHUB,
  paper: `https://github.com/AzielEliab/aziel-runtime/blob/main/${BAN_SURVIVAL_DOCS}`,
  client_update: "https://github.com/AzielEliab/aziel-runtime/blob/main/docs/CLIENT_UPDATE.md",
  shelves: CORPUS_SHELVES,
  lockset_tip: LOCKSET_TIP,
  plane_b: Object.freeze({
    status: "slot",
    codeberg: CODEBERG_TIP_PACK.url,
    archive_org: ARCHIVE_ORG_TIP_PACK.url,
    archive_org_202609: ARCHIVE_ORG_TIP_PACK_202609.url,
    pack_sha256: CODEBERG_TIP_PACK.pack_sha256,
    hash_verify: "pass",
    live_ready: false,
    note: "Hash-verify PASS still SLOT. Do not invent LIVE Plane B. doi null.",
  }),
  plane_c: Object.freeze({
    status: "slot",
    note: "USB airgap SLOT until CNS-OPERATOR-ATTEST. Do not invent LIVE Plane C.",
  }),
  verify: "bytes↔hash against the published lockset tip. Cite, don't merge. LLM memory is not a replica.",
});

export const CLIENT_ORDER = Object.freeze([
  "try primary workers.dev exec (POST /mcp or POST /v1/fraggate/call)",
  "if hostname or exec path blocked: try next named hub /runtime prefix (same FragGate door, service binding)",
  "if every exec route fails: remaining read surfaces still cite tip + this map (mode DEGRADED)",
  "if the live CF tunnel is gone: verify cold shelf / GitHub / Codeberg / archive.org tip-pack — do not invent LIVE",
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

export function doorMode(env) {
  return parseBlockedRoutes(env).length ? "DEGRADED" : "LIVE";
}

export function namedExecOrigins() {
  return NAMED_ROUTES.map((r) => r.origin);
}

/**
 * Stdio / client origin list. A pinned non-default --url stays pinned
 * (tests and operator override do not wander onto unnamed hosts).
 */
export function bridgeOrigins(flags = {}, env = {}) {
  const pinned = String(flags.url || env.AZIEL_RUNTIME_URL || "")
    .trim()
    .replace(/\/$/, "");
  const failoverOff = String(env.AZIEL_RUNTIME_FAILOVER || "").trim() === "0";
  if (pinned && pinned !== PRIMARY_WORKER_ORIGIN) return [pinned];
  if (failoverOff && pinned) return [pinned];
  if (failoverOff) return [PRIMARY_WORKER_ORIGIN];
  return namedExecOrigins();
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
      note: "Never claim a banned host is LIVE. Prefer honest DEGRADED + shelf pointers.",
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

export function blockedRouteRefuse(row, origin) {
  return {
    ok: false,
    status: 503,
    code: row && row.path ? REFUSE.EXEC_QUARANTINE : REFUSE.ROUTE_BLOCKED,
    spec: BAN_SURVIVAL,
    mode: "DEGRADED",
    door: "fraggate",
    second_door: false,
    lie_to_survive: false,
    route: row || null,
    origin: String(origin || "").replace(/\/$/, "") || null,
    message:
      "This named exec route is operator-quarantined (honest DEGRADED). Try the next named hub /runtime or verify the cold tip. Never invent a live door.",
    failover: failoverCite(origin),
  };
}

export function failoverCite(origin) {
  return {
    spec: BAN_SURVIVAL,
    rule: BAN_SURVIVAL_RULE,
    tip: BAN_SURVIVAL_TIP,
    client_order: CLIENT_ORDER.slice(),
    exec_origins: namedExecOrigins(),
    next: nextExecOrigin(origin),
    read: READ_PATHS.slice(),
    cold: {
      github: COLD_FALLBACK.github,
      shelves: COLD_FALLBACK.shelves,
      lockset_tip: COLD_FALLBACK.lockset_tip,
      plane_b: "slot",
      plane_c: "slot",
    },
    lie_to_survive: false,
    second_door: false,
    unmarked_hydra: false,
  };
}

export function rateLimitFailoverCite(decision, origin) {
  return {
    ...failoverCite(origin),
    rate_limit: {
      code: "RATE_LIMIT",
      scope: decision && decision.scope,
      limit: decision && decision.limit,
      retry_after: decision && decision.retry_after,
      enforcement: (decision && decision.enforcement) || "isolate",
      note: "Honest capacity. Do not retry-storm this door. Try the next named route or wait Retry-After.",
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
    const status = hits.length ? "blocked" : r.status;
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
    software_tab: false,
    fraggate_slug: false,
    door: "fraggate",
    routes: routesDoc(env),
    exec_paths: EXEC_PATHS.slice(),
    read_paths: READ_PATHS.slice(),
    client_order: CLIENT_ORDER.slice(),
    cold_fallback: {
      ...COLD_FALLBACK,
      plane_b: { ...COLD_FALLBACK.plane_b },
      plane_c: { ...COLD_FALLBACK.plane_c },
    },
    cite: base ? `${base}/cite.json` : "/cite.json",
    llms: base ? `${base}/llms.txt` : "/llms.txt",
    shelves: base ? `${base}/shelves` : "/shelves",
    paper: BAN_SURVIVAL_DOCS,
    visible_1520: false,
    growth_on: true,
    remain_off_untouched: true,
    note:
      "Hub /runtime is the same FragGate door via service binding (survives a workers.dev hostname ban). " +
      "Same Plane A tunnel — not four independent live doors. Plane B/C stay SLOT. " +
      "Never claim a banned host is LIVE. Prefer honest DEGRADED + shelf pointers.",
  };
}

export function survivalCiteField(origin) {
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
    lockset_tip: LOCKSET_TIP,
    doi: null,
    survival: base ? `${base}/survival` : "/survival",
    survival_json: base ? `${base}/v1/survival` : "/v1/survival",
    doors: base ? `${base}/doors` : "/doors",
    failover: base ? `${base}/failover` : "/failover",
    primary: PRIMARY_WORKER_ORIGIN,
    library_runtime: LIBRARY_FRONT_DOOR,
    author_runtime: RUNTIME_HUB_URL,
    godlock_runtime: GODLOCK_RUNTIME,
    exec_origins: namedExecOrigins(),
    client_order: CLIENT_ORDER.slice(),
    exec_paths: EXEC_PATHS.slice(),
    read_paths: READ_PATHS.slice(),
    cold_fallback: {
      github: COLD_FALLBACK.github,
      shelves: COLD_FALLBACK.shelves,
      lockset_tip: COLD_FALLBACK.lockset_tip,
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

export function survivalLlmsBlock(origin) {
  const cite = survivalCiteField(origin);
  return [
    "## Ban / blocked-endpoint survival (BAN-SURVIVAL-1.0)",
    "",
    BAN_SURVIVAL_TIP,
    "",
    BAN_SURVIVAL_RULE,
    "",
    `Umbrella: ${CROSS_NETWORK_SURVIVAL}. NO-LIE / NO-REWRITE: never claim a banned host is LIVE.`,
    `Person @id: ${AUTHOR_ID}. No visible 15:20 chrome.`,
    `Machine map: ${cite.survival} · ${cite.survival_json} · aliases ${cite.doors} ${cite.failover}`,
    `Named exec origins (same Plane A tunnel, not independent shelves): ${cite.exec_origins.join(" · ")}`,
    "Client order: workers.dev exec → named hub /runtime (service binding) → read surfaces (DEGRADED) → cold tip-hash (GitHub + /shelves + Codeberg/archive.org SLOT packs).",
    "Hub /runtime is the same FragGate door — not a second door and not a sixth shelf.",
    `Lockset tip: ${LOCKSET_TIP}. Plane B SLOT. Plane C SLOT. doi null. Never invent a live door.`,
    "429 on /mcp or FragGate includes this failover cite. Do not retry-storm the same path.",
    "",
  ].join("\n");
}

export function survivalSkillMarkdown(origin) {
  const cite = survivalCiteField(origin);
  return `## Ban / blocked-endpoint survival (BAN-SURVIVAL-1.0)

${BAN_SURVIVAL_RULE}

Machine map: \`GET ${cite.survival}\` / \`GET ${cite.survival_json}\` (aliases \`/doors\` \`/failover\`). Person \`@id\` ${AUTHOR_ID}.

1. Try \`${PRIMARY_WORKER_ORIGIN}/mcp\` (or \`POST /v1/fraggate/call\`).
2. If that hostname or exec path is blocked: try named hub \`/runtime\` — \`${LIBRARY_FRONT_DOOR}\`, \`${RUNTIME_HUB_URL}\`, \`${GODLOCK_RUNTIME}\` (service binding; same FragGate door).
3. If exec is gone: read \`/cite.json\` \`/llms.txt\` \`/shelves\` \`/v1/mesh\` still cite the tip. Mode **DEGRADED**.
4. If the CF tunnel is gone: verify lockset tip \`${LOCKSET_TIP}\` on GitHub / corpus \`/shelves\` / Codeberg + archive.org tip-packs (**SLOT**, hash-verify PASS). Do not invent LIVE.

Never invent a live door. Never claim a banned host is LIVE. No new MCP tool. FragGate stays THE door.
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
