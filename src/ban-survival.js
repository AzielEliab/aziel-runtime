/**
 * BAN-SURVIVAL-1.0 — mutual backup: live multi-front ↔ cold shelves.
 *
 * Live fronts back up cold-shelf death. Cold shelves back up death-by-ban.
 * Keep both. Client door list = LIVE doors only. Shelves are the later backup,
 * not /mcp. Live-node API is SLOT (no open proxy to the QNM roster).
 * Cap-7 cite + AZNet verify are LIVE; hosted exec SLOT; update shuffle ping→land.
 * AKM-TRIAD cited: belief_is_not_truth; memory_get append-only; memory_resolve additive.
 *
 * Not a Softwares-tab product. Not a FragGate slug. Not a new MCP tool.
 * Author: Aziel Eliab only.
 */

import { AUTHOR_ID, AUTHOR_NAME, LIBRARY_FRONT_DOOR, LIBRARY_ORIGIN, RUNTIME_GITHUB, RUNTIME_HUB_URL } from "./seo.js";
import { CROSS_NETWORK_SURVIVAL, SURVIVAL_TIP } from "./cross-network-survival.js";
import { NO_LIE_SPEC } from "./no-lie.js";
import {
  CAP7_NAME_MAY_CHANGE,
  CAP7_RESOLVES_TO_HUB,
  MIRAGEGRID_WORKER_ORIGIN,
  SEMANTIC_BRIDGE_FACTORY,
  azGeneratorPath,
  miragegridBridgeUrl,
} from "./semantic-bridge.js";
import {
  CAP7_SHUFFLE_HANDOFF,
  CAP7_SHUFFLE_REFUSE,
  cap7ShuffleCite,
  judgeFakePublicShuffle,
  judgeHardcodedCap7Host,
  judgeLocalhostCap7Update,
} from "./cap7-shuffle.js";
import {
  CALLING_NAME_REFUSE,
  callingNameCite,
  judgeCallingNameHistoryRewrite,
  judgeInventedBan,
  judgeTrademarkCallingName,
} from "./calling-name.js";
import { platformsCite } from "./platforms.js";

/** CNS / shelf cite — death-by-ban backup. Not a live exec door. */
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
  "Survive survive survive — grow. Three layers: live multi-front ↔ cold shelves; live-node API when attested; Cap-7 cite + AZNet verify (hosted exec SLOT; update shuffle ping→land, no hardcoded host). AKM memory: belief_is_not_truth, append-only. Never invent a live door. Never fake a Cap-7 hosted endpoint. Never lie to survive.";

export const BAN_SURVIVAL_TIP =
  "BAN-SURVIVAL-1.0: one banned door is not last tip gone — try the next LIVE named front, then remaining LIVE paths, then cold-shelf tip-hash. Cap-7/AZNet cite+verify stay LIVE; hosted Cap-7 endpoints stay SLOT. Update shuffle: ping MirageGrid until one Cap-7 site lands. Never invent a live door. Never claim a banned host is LIVE.";

/** AKM-TRIAD memory law — cite alongside the survival stack. Already LIVE fabric. */
export const AKM_MEMORY_LAW = Object.freeze({
  spec: "AKM-TRIAD-1.0",
  ranked_adaptive_recall: true,
  belief_list_vs_chainlock: true,
  belief_is_not_truth: true,
  posterior_is_not_truth: true,
  append_only: true,
  memory_get: "append-only recollection",
  memory_resolve: "forward-path additive stamps on existing memory IDs",
  memory_delete: false,
  memory_update_overwrite: false,
  stub_ops: Object.freeze(["model_update", "rollback", "rewrite", "delete_history", "auto_update"]),
  note:
    "Ranked adaptive recall cross-references the Belief List against verified ChainLock states. Posterior ≠ truth. Runtime must not treat its own memory as absolute fact. memory_get is append-only (no memory_delete / memory_update overwrite). memory_resolve adds sedimentary stamps — no sanitizing the old trail.",
});

export const REFUSE = Object.freeze({
  NO_LIE: "BAN-NO-LIE",
  NO_HYDRA: "BAN-NO-HYDRA",
  NO_SECOND_DOOR: "BAN-NO-SECOND-DOOR",
  NO_RESURRECT: "BAN-NO-RESURRECT",
  NO_LLM_REPLICA: "BAN-NO-LLM-REPLICA",
  NO_FAN: "BAN-NO-FAN",
  NO_SHELF_ONLY: "BAN-NO-SHELF-ONLY",
  NO_DOOR_ONLY: "BAN-NO-DOOR-ONLY",
  NO_OPEN_NODE_PROXY: "BAN-NO-OPEN-NODE-PROXY",
  NO_FAKE_CAP7_HOST: "BAN-NO-FAKE-CAP7-HOST",
  NO_AZNET_PAYLOAD: "BAN-NO-AZNET-PAYLOAD-HOST",
  NO_HARDCODE_CAP7_HOST: CAP7_SHUFFLE_REFUSE.HARDCODE_HOST,
  NO_FAKE_SHUFFLE_LIVE: CAP7_SHUFFLE_REFUSE.FAKE_PUBLIC_SHUFFLE,
  NO_LOCALHOST_CAP7_UPDATE: CAP7_SHUFFLE_REFUSE.LOCALHOST_UPDATE,
  NO_MEMORY_AS_TRUTH: "BAN-NO-MEMORY-AS-TRUTH",
  NO_MEMORY_REWRITE: "BAN-NO-MEMORY-REWRITE",
  NO_TRADEMARK_NAME: CALLING_NAME_REFUSE.TRADEMARK,
  NO_NAME_HISTORY_REWRITE: CALLING_NAME_REFUSE.HISTORY_REWRITE,
  NO_INVENT_BAN: CALLING_NAME_REFUSE.INVENT_BAN,
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
  "/v1/mesh/az-generator",
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

/** Cold-shelf backup for death-by-ban. Not a live exec door. Not the only answer. */
export const SHELF_BACKUP = Object.freeze({
  role: "death-by-ban-backup",
  is_live_door: false,
  mutual_backup: true,
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
    note: "COLD-MULTI-SHELF cite. Hash-verify PASS still SLOT. Backup for death-by-ban. Not /mcp.",
  }),
  plane_c: Object.freeze({
    status: "slot",
    note: "USB airgap SLOT until CNS-OPERATOR-ATTEST. Backup for death-by-ban. Not /mcp.",
  }),
  note: "Cold shelves back up death-by-ban. Live fronts back up shelf death. Keep both. BAN-NO-SHELF-ONLY / BAN-NO-DOOR-ONLY.",
});

export const NEIGHBOR_SHELF_CITE = SHELF_BACKUP;
export const COLD_FALLBACK = SHELF_BACKUP;

/** Live-node-as-API. Roster is presence, not exec. SLOT until attest. */
export const LIVE_NODE_API = Object.freeze({
  status: "slot",
  code: "BAN-NODE-API-NOT-ATTESTED",
  refuse: REFUSE.NO_OPEN_NODE_PROXY,
  exec: false,
  is_live_door: false,
  mesh_live_nodes_are_api: false,
  note:
    "QNM live_nodes is mesh size (presence). Nodes do not publish exec URLs. Product Workers proxy /v1/mesh/* only — not /mcp. No submesh/subpipe exec hop. Open proxy to random nodes is refused.",
  secure_path: Object.freeze([
    "named origin only (no unmarked hydra)",
    "FragGate is the only exec path (/mcp or /v1/fraggate/call)",
    "engine_digest + ChainLock / ForgeReceipts attest of that origin",
    "same Lamb Lens → SweepGate → Sentinel hop — no side door",
  ]),
  handoff: "Follow-on (not this PR): security audit → attest named node origins → rescan → then consider LIVE.",
});

/**
 * Layer 3 — Cap-7 generator + AZNet.
 * LIVE: name-metadata cite (MirageGrid-only) + AZNet hash stamp/verify.
 * SLOT: hosted exec endpoints. AZNet never hosts payloads. No fake .az.
 */
export const CAP7_AZNET = Object.freeze({
  layer: 3,
  factory: SEMANTIC_BRIDGE_FACTORY,
  factory_only: true,
  radio_phy: false,
  resolves_to_hub: CAP7_RESOLVES_TO_HUB,
  name_may_change: CAP7_NAME_MAY_CHANGE,
  public_icann: false,
  live_registrar: false,
  fifth_product: false,
  pairing_is_tunnel: false,
  channel_plane_is_vpn: false,
  cite: Object.freeze({
    status: "live",
    mesh_az_generator: "/v1/mesh/az-generator",
    miragegrid_bridge: `${MIRAGEGRID_WORKER_ORIGIN}/bridge`,
    fraggate: 'fraggate_call { slug: "miragegrid", op: "bridge" }',
    note: "Cap-7 name-metadata cite. Inherit hub designs only. Not a live registrar.",
  }),
  aznet_verify: Object.freeze({
    status: "live",
    ops: Object.freeze(["stamp", "verify_hash", "receipt_verify"]),
    door: "fraggate_call",
    slug: "aznet",
    note: "AZNet verification side-net. Hash continuity when a public door is banned. Never hosts payloads.",
  }),
  hosted_endpoints: Object.freeze({
    status: "slot",
    code: "BAN-CAP7-HOST-NOT-ATTESTED",
    payload_host: "stub",
    is_live_door: false,
    note:
      "AZNet never hosts payloads (payload_host stays stub). Cap-7 names are not /mcp and not ICANN aliases. Do not invent a hosted endpoint.",
    next:
      "AZNet stamp binds a Cap-7 name (design DNA only; resolves_to_hub false) to an attested named FragGate origin. Only that named origin may later flip hosted_endpoints LIVE. Security audit first.",
  }),
  shuffle: Object.freeze({
    layout: "live",
    public_worker_shuffle: "slot",
    hosted_update: "slot",
    path: "ping → land → that-round update",
    hardcoded_single_host: false,
    localhost_pool_is_not_public_update: true,
    fraggate: 'fraggate_call { slug: "miragegrid", op: "shuffle" }',
    handoff: CAP7_SHUFFLE_HANDOFF,
    note:
      "Distinct Cap-7 mesh names. All nodes ping MirageGrid until one site lands. That landed site is the update endpoint for that round. Subset browser-reachable class; remainder AZNet-side. Do not invent LIVE public shuffle.",
  }),
});

export const CLIENT_ORDER = Object.freeze([
  "try primary workers.dev exec (POST /mcp or POST /v1/fraggate/call)",
  "if hostname or exec path blocked: try the next LIVE custom-domain hub /runtime (library, author, godlock — same FragGate door, service binding)",
  "if one exec path is quarantined: remaining LIVE exec paths on remaining LIVE fronts still run",
  "if exec is gone on a front: remaining LIVE read surfaces on remaining LIVE fronts still publish this door map (honest DEGRADED for that front)",
  "Cap-7 cite (GET /v1/mesh/az-generator or MirageGrid /bridge) + AZNet stamp/verify_hash stay LIVE via FragGate — name metadata and hash continuity, not a hosted /mcp",
  "Cap-7 update shuffle: all nodes ping MirageGrid until they land on one Cap-7 site (distinct mesh names). That landed site is the update endpoint for that round — do not hardcode a single Cap-7 host. Hosted update URL stays SLOT. Public workers.dev shuffle stays SLOT",
  "if every named live front is gone (death-by-ban): verify lockset tip on GitHub / /shelves / Codeberg + archive.org SLOT packs — shelf backup, not a live door",
  "vice versa: if a shelf or alt-forge dies, keep the LIVE named fronts — live multi-front is the backup for cold-shelf death",
  "Cap-7/AZNet hosted exec endpoints stay SLOT — never fake a hosted door, never treat live_nodes as API, never claim AZNet hosts payloads",
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
      note: "Never claim a banned host is LIVE. Prefer honest DEGRADED + the next LIVE front, then the shelf backup.",
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

export function judgeShelfOnly(input) {
  const src = input && typeof input === "object" ? input : {};
  if (
    src.shelf_is_live_door === true ||
    src.tip_pack_is_live_door === true ||
    src.plane_b_is_live_exec === true ||
    src.archive_is_mcp === true
  ) {
    return {
      accept: false,
      action: "refuse",
      reason: REFUSE.NO_SHELF_ONLY,
      is_live_door: false,
      note: "Cold shelves back up death-by-ban. They are not /mcp and not the only answer.",
    };
  }
  return { accept: true, action: "ok", is_live_door: false, mutual_backup: true };
}

export function judgeDoorOnly(input) {
  const src = input && typeof input === "object" ? input : {};
  if (
    src.shelves_failed_plan === true ||
    src.drop_shelves === true ||
    src.live_doors_only_answer === true ||
    src.drop_mutual_backup === true
  ) {
    return {
      accept: false,
      action: "refuse",
      reason: REFUSE.NO_DOOR_ONLY,
      mutual_backup: true,
      note: "Do not drop shelves. Live multi-front is not the only answer. They back each other up.",
    };
  }
  return { accept: true, action: "ok", mutual_backup: true };
}

export function judgeOpenNodeProxy(input) {
  const src = input && typeof input === "object" ? input : {};
  if (
    src.open_node_proxy === true ||
    src.unattested_node_api === true ||
    src.live_nodes_are_api === true ||
    src.submesh_exec === true ||
    src.random_node_as_door === true
  ) {
    return {
      accept: false,
      action: "refuse",
      reason: REFUSE.NO_OPEN_NODE_PROXY,
      live_node_api: "slot",
      note: "QNM roster is presence, not an API. No open proxy to random nodes. SLOT until named FragGate origin + digest/receipt attest.",
    };
  }
  return { accept: true, action: "ok", live_node_api: "slot" };
}

export function judgeFakeCap7Host(input) {
  const src = input && typeof input === "object" ? input : {};
  if (
    src.cap7_hosted_endpoint_live === true ||
    src.cap7_is_mcp === true ||
    src.fake_icann_az === true ||
    src.live_registrar === true ||
    src.resolves_to_hub === true ||
    src.radio_phy === true
  ) {
    return {
      accept: false,
      action: "refuse",
      reason: REFUSE.NO_FAKE_CAP7_HOST,
      hosted_endpoints: "slot",
      radio_phy: false,
      resolves_to_hub: false,
      public_icann: false,
      note: "Cap-7 cite is LIVE. Hosted Cap-7 exec endpoints are SLOT. No fake .az. radio_phy false. resolves_to_hub false.",
    };
  }
  return { accept: true, action: "ok", hosted_endpoints: "slot", radio_phy: false };
}

export function judgeMemoryAsTruth(input) {
  const src = input && typeof input === "object" ? input : {};
  if (
    src.belief_is_truth === true ||
    src.posterior_is_truth === true ||
    src.memory_is_absolute_fact === true ||
    src.belief_is_not_truth === false
  ) {
    return {
      accept: false,
      action: "refuse",
      reason: REFUSE.NO_MEMORY_AS_TRUTH,
      belief_is_not_truth: true,
      note: "AKM-TRIAD: posterior ≠ truth. Runtime must not treat its own memory as absolute fact.",
    };
  }
  return { accept: true, action: "ok", belief_is_not_truth: true };
}

export function judgeMemoryRewrite(input) {
  const src = input && typeof input === "object" ? input : {};
  if (
    src.memory_delete === true ||
    src.memory_update_overwrite === true ||
    src.delete_history === true ||
    src.sanitize_old_trail === true ||
    src.rewrite === true
  ) {
    return {
      accept: false,
      action: "refuse",
      reason: REFUSE.NO_MEMORY_REWRITE,
      append_only: true,
      stub_ops: AKM_MEMORY_LAW.stub_ops.slice(),
      note: "memory_get is append-only. memory_resolve is additive. model_update / rollback / rewrite / delete_history / auto_update stay refused.",
    };
  }
  return { accept: true, action: "ok", append_only: true };
}

export function judgeAznetPayloadHost(input) {
  const src = input && typeof input === "object" ? input : {};
  if (src.aznet_hosts_payloads === true || src.payload_host_live === true || src.serve_content_for_peer === true) {
    return {
      accept: false,
      action: "refuse",
      reason: REFUSE.NO_AZNET_PAYLOAD,
      payload_host: "stub",
      note: "AZNet is a verification side-net. Never hosts payloads. pairing ≠ tunnel.",
    };
  }
  return { accept: true, action: "ok", payload_host: "stub" };
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
    judgeShelfOnly(input),
    judgeDoorOnly(input),
    judgeOpenNodeProxy(input),
    judgeFakeCap7Host(input),
    judgeAznetPayloadHost(input),
    judgeHardcodedCap7Host(input),
    judgeFakePublicShuffle(input),
    judgeLocalhostCap7Update(input),
    judgeMemoryAsTruth(input),
    judgeMemoryRewrite(input),
    judgeTrademarkCallingName(input),
    judgeCallingNameHistoryRewrite(input),
    judgeInventedBan(input),
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
    mutual_backup: true,
    shelves_are_not_a_live_door: true,
    route: row || null,
    origin: String(origin || "").replace(/\/$/, "") || null,
    message:
      "This named exec route is operator-quarantined (honest DEGRADED). Try the next LIVE custom-domain /runtime. If every live front is gone, use the shelf backup (tip-hash). Never invent a live door.",
    failover: failoverCite(origin, env),
  };
}

export function shelfBackupCite() {
  return {
    role: SHELF_BACKUP.role,
    is_live_door: false,
    shelves: SHELF_BACKUP.shelves,
    lockset_tip: SHELF_BACKUP.lockset_tip,
    plane_b: "slot",
    plane_c: "slot",
    note: SHELF_BACKUP.note,
  };
}

export function liveNodeApiCite() {
  return {
    status: LIVE_NODE_API.status,
    code: LIVE_NODE_API.code,
    refuse: LIVE_NODE_API.refuse,
    exec: false,
    mesh_live_nodes_are_api: false,
    note: LIVE_NODE_API.note,
    secure_path: LIVE_NODE_API.secure_path.slice(),
    handoff: LIVE_NODE_API.handoff,
  };
}

export function cap7AznetCite(origin) {
  return {
    layer: CAP7_AZNET.layer,
    factory: CAP7_AZNET.factory,
    factory_only: true,
    radio_phy: false,
    resolves_to_hub: false,
    name_may_change: true,
    public_icann: false,
    live_registrar: false,
    fifth_product: false,
    pairing_is_tunnel: false,
    channel_plane_is_vpn: false,
    cite: {
      status: "live",
      mesh_az_generator: azGeneratorPath(origin),
      miragegrid_bridge: miragegridBridgeUrl(),
      fraggate: CAP7_AZNET.cite.fraggate,
    },
    aznet_verify: {
      status: "live",
      ops: CAP7_AZNET.aznet_verify.ops.slice(),
      door: "fraggate_call",
      note: CAP7_AZNET.aznet_verify.note,
    },
    hosted_endpoints: {
      status: "slot",
      code: CAP7_AZNET.hosted_endpoints.code,
      payload_host: "stub",
      is_live_door: false,
      note: CAP7_AZNET.hosted_endpoints.note,
      next: CAP7_AZNET.hosted_endpoints.next,
    },
    shuffle: cap7ShuffleCite(),
  };
}

export function akmMemoryCite() {
  return {
    spec: AKM_MEMORY_LAW.spec,
    ranked_adaptive_recall: true,
    belief_list_vs_chainlock: true,
    belief_is_not_truth: true,
    posterior_is_not_truth: true,
    append_only: true,
    memory_get: AKM_MEMORY_LAW.memory_get,
    memory_resolve: AKM_MEMORY_LAW.memory_resolve,
    memory_delete: false,
    memory_update_overwrite: false,
    stub_ops: AKM_MEMORY_LAW.stub_ops.slice(),
    note: AKM_MEMORY_LAW.note,
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
    mutual_backup: true,
    shelves_are_not_a_live_door: true,
    shelf_backup: shelfBackupCite(),
    live_node_api: liveNodeApiCite(),
    cap7_aznet: cap7AznetCite(origin),
    akm_memory: akmMemoryCite(),
    calling_name: callingNameCite(env),
    platforms: platformsCite(env),
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
      note: "Honest capacity. Do not retry-storm this door. Try the next LIVE named front or wait Retry-After. Shelves are the later death-by-ban backup, not the 429 hop.",
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
    mutual_backup: true,
    shelves_are_not_a_live_door: true,
    shelves_backup_for: "death-by-ban",
    live_doors_backup_for: "cold-shelf-death",
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
    shelf_backup: {
      ...shelfBackupCite(),
      plane_b: { ...SHELF_BACKUP.plane_b },
      plane_c: { ...SHELF_BACKUP.plane_c },
    },
    live_node_api: liveNodeApiCite(),
    cap7_aznet: cap7AznetCite(base),
    akm_memory: akmMemoryCite(),
    calling_name: callingNameCite(env),
    platforms: platformsCite(env),
    cite: base ? `${base}/cite.json` : "/cite.json",
    llms: base ? `${base}/llms.txt` : "/llms.txt",
    paper: BAN_SURVIVAL_DOCS,
    visible_1520: false,
    growth_on: true,
    remain_off_untouched: true,
    note:
      "Hub /runtime is the same FragGate door via service binding (survives a workers.dev hostname ban). " +
      "Same Plane A tunnel — not four independent blast-radius doors. They are four named live fronts. " +
      "Client door list = LIVE only. Cold shelves back up death-by-ban. Live fronts back up shelf death. " +
      "Live-node API is SLOT. Cap-7 cite + AZNet verify are LIVE; hosted Cap-7 endpoints are SLOT. " +
      "Cap-7 update shuffle is ping MirageGrid → land one site → that-round update (no hardcoded host; public shuffle SLOT). " +
      "AKM-TRIAD: belief_is_not_truth; memory_get append-only; memory_resolve additive. " +
      "Never claim a banned host is LIVE.",
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
    mutual_backup: true,
    shelves_are_not_a_live_door: true,
    shelves_backup_for: "death-by-ban",
    live_doors_backup_for: "cold-shelf-death",
    shelf_backup: shelfBackupCite(),
    live_node_api: liveNodeApiCite(),
    cap7_aznet: cap7AznetCite(origin),
    akm_memory: akmMemoryCite(),
    calling_name: callingNameCite(env),
    platforms: platformsCite(env),
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
    `Umbrella: ${CROSS_NETWORK_SURVIVAL}. NO-LIE / NO-REWRITE: never claim a banned host is LIVE.`,
    `Person @id: ${AUTHOR_ID}. No visible 15:20 chrome.`,
    `Machine map: ${cite.survival} · ${cite.survival_json} · aliases ${cite.doors} ${cite.failover}`,
    `LIVE exec origins (same Plane A tunnel, not independent shelves): ${cite.exec_origins.join(" · ")}`,
    "Three layers: (1) live multi-front ↔ cold shelves (2) live-node API SLOT until attest (3) Cap-7 cite + AZNet verify LIVE; hosted Cap-7 endpoints SLOT.",
    "Client order: workers.dev exec → next LIVE custom-domain /runtime → remaining LIVE exec/read paths → Cap-7/AZNet cite+verify → Cap-7 shuffle ping→land → shelf tip-hash if every live front is gone.",
    "Hub /runtime is the same FragGate door — not a second door and not a sixth shelf.",
    "Live-node API is SLOT (QNM roster is presence, not exec). No open proxy to random nodes.",
    "Cap-7 factory is MirageGrid-only. radio_phy false. resolves_to_hub false. AZNet never hosts payloads. No fake ICANN .az.",
    "Cap-7 update shuffle: ping MirageGrid until one distinct-name site lands. That landed site is that-round update. Do not hardcode one host. Public workers.dev shuffle SLOT. Subset browser-reachable class; remainder AZNet-side.",
    "AKM-TRIAD-1.0: ranked adaptive recall vs verified ChainLock; belief_is_not_truth; memory_get append-only; memory_resolve additive stamps. stub_ops model_update / rollback / rewrite / delete_history / auto_update stay refused.",
    "Calling-name rotation (discovery only): on honest ban signals, rewrite the public calling name (Whitestone AI → Bills → Runtime → Eliab Runtime → Potato Runtime → Elroi Runtime → endless Softwares-family / random). Mesh nodes pull `*new name alert: <name>` from /survival. Identity Aziel Eliab unchanged. No ChainLock/AKM rewrite. No third-party trademarks.",
    "Platforms LIVE: Windows, Mac, Linux, Android, iPhone via browser + PWA (`/manifest.webmanifest`) + Worker fronts + Softwares /download + MCP/OpenAPI. Not native store apps.",
    "429 on /mcp or FragGate includes the next LIVE front first. Do not retry-storm the same path.",
    "",
  ].join("\n");
}

export function survivalSkillMarkdown(origin, env) {
  const cite = survivalCiteField(origin, env);
  return `## Ban / blocked-endpoint survival (BAN-SURVIVAL-1.0)

${BAN_SURVIVAL_RULE}

Machine map: \`GET ${cite.survival}\` / \`GET ${cite.survival_json}\` (aliases \`/doors\` \`/failover\`). Person \`@id\` ${AUTHOR_ID}. Door list = LIVE only. Mutual backup with cold shelves.

1. Try \`${PRIMARY_WORKER_ORIGIN}/mcp\` (or \`POST /v1/fraggate/call\`).
2. If that hostname or exec path is blocked: try named LIVE hub \`/runtime\` — \`${LIBRARY_FRONT_DOOR}\`, \`${RUNTIME_HUB_URL}\`, \`${GODLOCK_RUNTIME}\` (custom domain + service binding; same FragGate door).
3. If one exec path is quarantined: remaining LIVE exec paths on remaining LIVE fronts still run.
4. If exec is gone on a front: remaining LIVE read surfaces (\`/survival\` \`/cite.json\` \`/llms.txt\` \`/v1/health\`) still publish this map. Mode **DEGRADED** on the banned front.
5. Cap-7 cite (\`GET /v1/mesh/az-generator\` / MirageGrid \`/bridge\`) + AZNet \`stamp\` / \`verify_hash\` stay LIVE via FragGate (name metadata + hash continuity). Hosted Cap-7 exec endpoints stay **SLOT**.
6. Cap-7 update shuffle: all nodes ping MirageGrid (\`fraggate_call { slug: "miragegrid", op: "shuffle" }\`) until they land on one distinct-name Cap-7 site. That landed site is the update endpoint for that round. Do not hardcode a single host. Public workers.dev shuffle stays **SLOT**.
7. If every named live front is gone: verify lockset tip on GitHub / \`/shelves\` / Codeberg + archive.org SLOT packs (shelf backup, not \`/mcp\`).
8. Vice versa: if a shelf or forge dies, keep the LIVE named fronts.

Live-node API is SLOT (no open proxy). Cap-7 factory is MirageGrid-only. \`radio_phy: false\`. AZNet never hosts payloads. AKM-TRIAD: \`belief_is_not_truth\`; \`memory_get\` append-only; \`memory_resolve\` additive. Calling-name rotation is discovery metadata only (mesh \`*new name alert:\`; no ChainLock/AKM rewrite). Never invent a live door. Never claim a banned host is LIVE. No new MCP tool. FragGate stays THE door.
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
