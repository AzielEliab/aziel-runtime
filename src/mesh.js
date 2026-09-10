/**
 * Aziel Eliab Runtime — Quantum Node Mesh suite rollup (QNM-BUILD-1.0).
 *
 * Companion to AIH-WP-1.1. Public surface is rollup + operator enable only.
 * Parent will roll the full local `qnm-node/` package next.
 * This Worker must not invent a login mesh, Node Gate / IP panel,
 * login-recovery, upload proxy, or account resurrection.
 *
 * Law (must not violate):
 * - Bulletproof: local modules run radios off; receipts to disk; poison
 *   refused not interpreted; tamper isolates; PHOENIX-LOCK waits locally
 *   (no controller hunt); tethers drop clean (no implicit heal); no
 *   account resurrection; anon-broadcast is never a publish path.
 * - azieleliab.com hosts published software/runtime — NOT login-recovery,
 *   NOT Node Gate/IP panel, NOT upload proxy.
 * - Suite public surface may expose mesh rollup only: live / locked /
 *   isolated counts (no average-of-nodes leaderboard). Views / MCP /
 *   downloads do not enter QNM-S.
 * - Default: radios/bearers off. LIVE only after the operator enables
 *   ≥1 declared bearer (never because a site pinged GET /v1/mesh).
 * - suite-presence is operator-enabled. While that bearer is LIVE, this
 *   Worker fans out join/heartbeat for every live Softwares product
 *   (and hubs that show Live Nodes) on cron or request-path. TTL 5 min.
 *   GET still never enables. Product Workers proxy /v1/mesh/* via
 *   AZIEL_RUNTIME — do not invent a second mesh.
 *
 * Keep /v1/mesh status/nodes/enable/disable for suite presence.
 * Frame as QNM rollup + operator enable — not account mesh.
 *
 * Full node process is local `qnm-node/` (boot/chain/apg/bearers/outbox/
 * phoenix/score/memorial/tethers). Anon-broadcast is a sibling loopback
 * module of that local process only. Packet-transfer coding design is
 * QNS-CD-1.0 (photon QNS1 1.3 on local qnsd; Worker cites only).
 *
 * Not a Softwares-tab product. Not AZMail's product-local ring.
 * Do not invent arming / wipe / VPN-hop internals.
 * Public identity: Aziel Eliab only.
 */

import { qnsCiteField, qnsHint } from "./qns.js";

export const MESH_SLUG = "mesh";
export const MESH_NAME = "Quantum Node Mesh";
export const MESH_SPEC = "QNM-BUILD-1.0";
export const MESH_COMPANION = "AIH-WP-1.1";
export const MESH_AUTHOR = "Aziel Eliab";
export const MESH_DEFAULT = "off";
export const MESH_DEFAULT_ENABLED = false;
export const PRESENCE_TTL_MS = 5 * 60 * 1000;
export const ENABLE_COOLDOWN_MS = 60_000;
export const RECEIPT_CAP = 32;
export const NODE_CAP = 256;
export const LABEL_CAP = 80;
export const TITLE_CAP = 160;
export const PRESENCE_STATES = Object.freeze(["live", "locked", "isolated"]);
export const EXAMPLE_BEARER = "suite-presence";
export const FANOUT_CRON = "*/2 * * * *";
export const FANOUT_NODE_SUFFIX = "-worker";

/** Live Softwares catalog used by suite-presence fan-out. Set from index.js (avoids a cycle). */
let suitePresenceCatalog = [];

export const QNM_HOST_NOTE =
  "azieleliab.com hosts published software/runtime — not login-recovery, not Node Gate/IP panel, not upload proxy.";

export const QNM_LOCAL_NODE =
  "Full node process is local qnm-node/ (boot/chain/apg/bearers/outbox/phoenix/score/memorial/tethers). Packet-transfer coding design is QNS-CD-1.0 (photon QNS1 1.3 on local qnsd; Worker cites only). Parent will roll that package. This runtime is suite rollup + operator enable only.";

export const QNM_S_NOTE = "Views, MCP, and downloads do not enter QNM-S.";

export const ANON_BROADCAST_NOTE =
  "Anon-broadcast is a sibling loopback module of local qnm-node/ only (text→TTS→desk MP4→metadata-culled file + SHA-256). Style tool. Never a publish path. Not an upload proxy. Not origin-hiding. Operator keeps the file. Not a Softwares-tab product. Not a QNM publish channel.";

export const MESH_LIMITATION =
  "THIS IS: QNM-BUILD-1.0 suite rollup on aziel-runtime — companion to AIH-WP-1.1. Packet-transfer coding design is QNS-CD-1.0 (companion to QNM-BUILD-1.0 / AIH-WP-1.3; photon QNS1 1.3 on local qnsd; Worker cites only). Public surface is live/locked/isolated counts plus operator enable of a declared bearer. Default radios/bearers OFF. suite-presence is operator-enabled (POST /v1/mesh/enable { bearer }). GET /v1/mesh never turns LIVE. While enabled, cron or request-path fans out join/heartbeat for live Softwares product Workers (node_id {slug}-worker; no '|'; TTL 5 min). Product Workers proxy /v1/mesh/* via AZIEL_RUNTIME. THIS IS NOT: a login mesh; login-recovery; Node Gate/IP panel; upload proxy; account resurrection; average-of-nodes leaderboard; QNM-S; the local qnm-node process (boot/chain/apg/bearers/outbox/phoenix/score/memorial/tethers); AnonBroadcast as a catalog product or publish path; AZMail's product-local ring; arming; wipe; controller hunt; implicit heal; a public qnsd proxy. Author: Aziel Eliab only.";

export const MESH_CANONICAL_OPS = Object.freeze([
  "status",
  "enable",
  "disable",
  "join",
  "heartbeat",
  "leave",
  "nodes",
  "broadcast",
  "health",
  "skill",
]);

export const MESH_OP_ALIASES = Object.freeze({
  mesh_status: "status",
  mesh_enable: "enable",
  mesh_disable: "disable",
  mesh_join: "join",
  mesh_heartbeat: "heartbeat",
  mesh_leave: "leave",
  mesh_nodes: "nodes",
  mesh_broadcast: "broadcast",
});

export const MESH_LIVE_OPS = Object.freeze([...MESH_CANONICAL_OPS, ...Object.keys(MESH_OP_ALIASES)]);

export const MESH_STUB_OPS = Object.freeze([
  "arm",
  "wipe",
  "vpn",
  "hop",
  "tunnel",
  "scorch",
  "login",
  "recover",
  "recovery",
  "resurrection",
  "resurrect",
  "account",
  "gate",
  "ip-panel",
  "ippanel",
  "publish",
  "phoenix-hunt",
  "phoenix_hunt",
  "heal",
  "controller",
]);

export const MESH_MCP_TOOLS = Object.freeze([
  "mesh_status",
  "mesh_enable",
  "mesh_disable",
  "mesh_join",
  "mesh_heartbeat",
  "mesh_leave",
  "mesh_nodes",
  "mesh_broadcast",
]);

const SHA256_RE = /^[a-f0-9]{64}$/;
const PRODUCT_RE = /^[a-z0-9][a-z0-9-]{0,39}$/;
const NODE_RE = /^[a-z0-9][a-z0-9._-]{7,79}$/i;
const BEARER_RE = /^[a-z][a-z0-9-]{1,39}$/;
const FORBIDDEN_BEARER_TOKENS = Object.freeze([
  "login",
  "recover",
  "recovery",
  "account",
  "resurrection",
  "resurrect",
  "gate",
  "ip",
  "ip-panel",
  "ippanel",
  "publish",
  "phoenix",
  "heal",
  "controller",
  "password",
  "session",
  "restore",
]);
const FORBIDDEN_BROADCAST_KEYS = Object.freeze([
  "video",
  "bytes",
  "file",
  "body",
  "mp4",
  "media",
  "blob",
  "content",
  "upload",
  "data",
  "payload_b64",
  "file_b64",
  "publish",
  "public",
  "announce",
  "stream",
]);
const POISON_KEY_RE = /poison/i;

const memory = {
  enabled: MESH_DEFAULT_ENABLED,
  last_enable_ms: 0,
  bearers: [],
  nodes: {},
  receipts: [],
  seq: 0,
};

export function resetMeshStore() {
  memory.enabled = MESH_DEFAULT_ENABLED;
  memory.last_enable_ms = 0;
  memory.bearers = [];
  memory.nodes = {};
  memory.receipts = [];
  memory.seq = 0;
}

export function setSuitePresenceCatalog(products) {
  suitePresenceCatalog = Array.isArray(products) ? products.slice() : [];
  return suitePresenceCatalog.length;
}

export function getSuitePresenceCatalog() {
  return suitePresenceCatalog.slice();
}

export function suitePresenceNodeId(slug) {
  const product = sanitizeProduct(slug);
  if (!product) return "";
  return `${product}${FANOUT_NODE_SUFFIX}`;
}

export function isMeshReadPath(pathname) {
  const path = String(pathname || "")
    .split("?")[0]
    .replace(/\/+$/, "")
    .toLowerCase() || "/";
  return path === "/v1/mesh" || path === "/v1/mesh/status" || path === "/v1/mesh/nodes";
}

export function suitePresenceTargets(products) {
  const src = Array.isArray(products) && products.length ? products : suitePresenceCatalog;
  const out = [];
  const seen = new Set();
  for (const item of src || []) {
    const product = sanitizeProduct((item && (item.slug || item.product)) || "");
    if (!product || seen.has(product)) continue;
    const node_id = suitePresenceNodeId(product);
    if (!node_id) continue;
    seen.add(product);
    out.push({
      product,
      node_id,
      label: sanitizeLabel((item && (item.name || item.label)) || product),
      presence: "live",
    });
  }
  return out;
}

export function resolveMeshOp(raw) {
  const op = String(raw || "")
    .trim()
    .toLowerCase();
  if (!op) return "";
  if (MESH_OP_ALIASES[op]) return MESH_OP_ALIASES[op];
  return op;
}

export function isMeshMcpTool(name) {
  return MESH_MCP_TOOLS.includes(String(name || "").trim());
}

export function meshHint(path = "/v1/mesh") {
  return {
    path: String(path || "/v1/mesh"),
    enabled_default: false,
    spec: MESH_SPEC,
    companion: MESH_COMPANION,
    rollup_only: true,
    qnm_s: false,
    suite_presence: "operator-enabled",
    get_never_enables: true,
    fanout: "cron-or-request-path",
    presence_ttl_ms: PRESENCE_TTL_MS,
    qns_cd: qnsHint(),
  };
}

export function meshCiteField(origin) {
  const base = String(origin || "").replace(/\/$/, "");
  return {
    ...meshHint("/v1/mesh"),
    name: MESH_NAME,
    status: base ? `${base}/v1/mesh/status` : "/v1/mesh/status",
    nodes: base ? `${base}/v1/mesh/nodes` : "/v1/mesh/nodes",
    enable: base ? `${base}/v1/mesh/enable` : "/v1/mesh/enable",
    example_bearer: EXAMPLE_BEARER,
    login_mesh: false,
    node_gate: false,
    qnm_s: false,
    note: "suite-presence is operator-enabled. GET /v1/mesh never enables. Not a login mesh.",
  };
}

export function meshKernelEntry() {
  return {
    name: MESH_NAME,
    slug: MESH_SLUG,
    digest: null,
    status: "live",
    ops: MESH_LIVE_OPS.slice(),
    catalog_ops: MESH_CANONICAL_OPS.slice(),
    stub_ops: MESH_STUB_OPS.slice(),
    op_aliases: { ...MESH_OP_ALIASES },
    description:
      "QNM-BUILD-1.0 suite rollup (companion to AIH-WP-1.1). Packet-transfer coding design QNS-CD-1.0 (photon QNS1 1.3 on local qnsd; Worker cites only). live/locked/isolated counts + operator-declared bearer. suite-presence is operator-enabled. GET /v1/mesh never enables. Default OFF. Not a login mesh. Not a Softwares-tab product.",
    note: MESH_LIMITATION,
    kind: "kernel",
    engine: false,
    true_engine_runtime: false,
    local_not_hosted: false,
    companion: MESH_COMPANION,
    spec: MESH_SPEC,
    qns_cd: qnsHint(),
  };
}

export function nodeMeshHubCard(origin) {
  const base = String(origin || "https://aziel-runtime.vibelock.workers.dev").replace(/\/$/, "");
  return {
    slug: MESH_SLUG,
    name: MESH_NAME,
    kind: "kernel",
    spec: MESH_SPEC,
    companion: MESH_COMPANION,
    engine: false,
    true_engine_runtime: false,
    version: MESH_SPEC,
    door: "fraggate",
    one_line:
      "QNM-BUILD-1.0 suite rollup (live/locked/isolated). suite-presence is operator-enabled. GET never enables. Default OFF. Not a login mesh. Full node is local qnm-node/. Packet transfer: QNS-CD-1.0 on local qnsd (Worker cites only).",
    path: "/v1/mesh",
    enabled_default: false,
    rollup_only: true,
    qnm_s: false,
    status: `${base}/v1/mesh/status`,
    nodes: `${base}/v1/mesh/nodes`,
    enable: `${base}/v1/mesh/enable`,
    mcp: `${base}/mcp`,
    fraggate_describe: `${base}/v1/fraggate/describe?slug=mesh`,
    fraggate_call: `${base}/v1/fraggate/call`,
    docs: "docs/NODE_MESH.md",
    local_node: "qnm-node/",
    qns: `${base}/v1/qns`,
    qns_cd: qnsHint(),
    note: MESH_LIMITATION,
    author: MESH_AUTHOR,
  };
}

function nowMs() {
  return Date.now();
}

function nowIso(ms = nowMs()) {
  return new Date(ms).toISOString();
}

function clip(raw, cap) {
  return String(raw == null ? "" : raw).trim().slice(0, cap);
}

export function sanitizeProduct(raw) {
  const s = String(raw || "")
    .trim()
    .toLowerCase();
  if (!PRODUCT_RE.test(s)) return "";
  if (s === "anon-broadcast" || s === "anonbroadcast") return "";
  return s;
}

export function sanitizeNodeId(raw) {
  const s = String(raw || "").trim();
  if (!NODE_RE.test(s)) return "";
  return s;
}

export function sanitizeLabel(raw) {
  return clip(raw, LABEL_CAP);
}

export function isSha256Hex(raw) {
  return SHA256_RE.test(String(raw || "").trim().toLowerCase());
}

export function sanitizeBearer(raw) {
  const s = String(raw || "")
    .trim()
    .toLowerCase();
  if (!BEARER_RE.test(s)) return "";
  const parts = s.split("-").filter(Boolean);
  for (const tok of FORBIDDEN_BEARER_TOKENS) {
    if (s === tok || parts.includes(tok)) return "";
  }
  return s;
}

export function sanitizePresence(raw, fallback = "live") {
  if (raw == null || raw === "") return fallback;
  const s = String(raw).trim().toLowerCase();
  if (PRESENCE_STATES.includes(s)) return s;
  return "";
}

function newNodeId(ms = nowMs()) {
  memory.seq += 1;
  const rand = Math.random().toString(36).slice(2, 10);
  return `mesh_${memory.seq.toString(36)}_${ms.toString(36)}_${rand}`;
}

function newSessionId(nodeId) {
  return `msess_${String(nodeId || "node").replace(/[^a-z0-9]/gi, "").slice(0, 24)}_${Math.random().toString(36).slice(2, 10)}`;
}

function meshKv(env) {
  if (env && env.MESH && typeof env.MESH.get === "function" && typeof env.MESH.put === "function") {
    return { kv: env.MESH, prefix: "", binding: "MESH" };
  }
  if (env && env.USES && typeof env.USES.get === "function" && typeof env.USES.put === "function") {
    return { kv: env.USES, prefix: "mesh|", binding: "USES" };
  }
  return null;
}

async function kvGetJson(kv, key, fallback) {
  try {
    const raw = await kv.get(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return parsed == null ? fallback : parsed;
  } catch {
    return fallback;
  }
}

function pruneNodes(nodes, now = nowMs()) {
  const live = {};
  for (const [id, node] of Object.entries(nodes || {})) {
    if (!node || typeof node !== "object") continue;
    const seen = Date.parse(node.last_seen || node.joined_at || "") || 0;
    if (seen && now - seen <= PRESENCE_TTL_MS) live[id] = node;
  }
  return live;
}

function liveList(nodes) {
  return Object.values(nodes || {})
    .slice()
    .sort((a, b) => String(b.last_seen || "").localeCompare(String(a.last_seen || "")));
}

function productsPresent(nodes) {
  const set = new Set();
  for (const node of liveList(nodes)) {
    if (node && node.product) set.add(node.product);
  }
  return [...set].sort();
}

function rollupCounts(nodes) {
  const rollup = { live: 0, locked: 0, isolated: 0 };
  for (const node of liveList(nodes)) {
    const p = node && PRESENCE_STATES.includes(node.presence) ? node.presence : "live";
    rollup[p] += 1;
  }
  return rollup;
}

function normalizeBearers(raw) {
  if (!Array.isArray(raw)) return [];
  const out = [];
  for (const item of raw) {
    const b = sanitizeBearer(item);
    if (b && !out.includes(b)) out.push(b);
  }
  return out;
}

function storeHonesty(binding) {
  if (binding === "MESH") return "Dedicated MESH KV.";
  if (binding === "USES") return "USES KV under mesh| keys (no placeholder namespace ids).";
  return "In-process memory (tests / unbound).";
}

function radiosOn(bearers) {
  return Array.isArray(bearers) && bearers.length >= 1;
}

async function loadState(env) {
  const bound = meshKv(env);
  if (!bound) {
    memory.nodes = pruneNodes(memory.nodes);
    const bearers = normalizeBearers(memory.bearers);
    memory.enabled = radiosOn(bearers);
    memory.bearers = bearers;
    return {
      enabled: memory.enabled === true,
      last_enable_ms: memory.last_enable_ms || 0,
      bearers,
      nodes: { ...memory.nodes },
      receipts: Array.isArray(memory.receipts) ? memory.receipts.slice() : [],
      store: "memory",
    };
  }
  const lastRaw = await bound.kv.get(`${bound.prefix}last_enable_ms`);
  const bearers = normalizeBearers(await kvGetJson(bound.kv, `${bound.prefix}bearers`, []));
  const nodes = pruneNodes(await kvGetJson(bound.kv, `${bound.prefix}nodes`, {}));
  const receipts = await kvGetJson(bound.kv, `${bound.prefix}receipts`, []);
  return {
    enabled: radiosOn(bearers),
    last_enable_ms: Number(lastRaw) || 0,
    bearers,
    nodes: nodes && typeof nodes === "object" && !Array.isArray(nodes) ? nodes : {},
    receipts: Array.isArray(receipts) ? receipts : [],
    store: bound.binding,
  };
}

async function saveState(env, state) {
  const bound = meshKv(env);
  const bearers = normalizeBearers(state.bearers);
  const enabled = radiosOn(bearers);
  const nodes = pruneNodes(state.nodes);
  const receipts = Array.isArray(state.receipts) ? state.receipts.slice(0, RECEIPT_CAP) : [];
  if (!bound) {
    memory.enabled = enabled;
    memory.last_enable_ms = state.last_enable_ms || 0;
    memory.bearers = bearers;
    memory.nodes = nodes;
    memory.receipts = receipts;
    return "memory";
  }
  await bound.kv.put(`${bound.prefix}enabled`, enabled ? "1" : "0");
  await bound.kv.put(`${bound.prefix}last_enable_ms`, String(state.last_enable_ms || 0));
  await bound.kv.put(`${bound.prefix}bearers`, JSON.stringify(bearers));
  await bound.kv.put(`${bound.prefix}nodes`, JSON.stringify(nodes));
  await bound.kv.put(`${bound.prefix}receipts`, JSON.stringify(receipts));
  return bound.binding;
}

function qnmFrame() {
  return {
    spec: MESH_SPEC,
    companion: MESH_COMPANION,
    name: MESH_NAME,
    qnm_s: false,
    qnm_s_note: QNM_S_NOTE,
    scores: false,
    leaderboard: false,
    phoenix_lock: "local wait — no controller hunt",
    local_node: "qnm-node/",
    local_node_note: QNM_LOCAL_NODE,
    host_note: QNM_HOST_NOTE,
    qns_cd: qnsCiteField(),
  };
}

function baseResult(extra) {
  return {
    ok: true,
    code: "MESH-OK",
    author: MESH_AUTHOR,
    identity: "Aziel Eliab",
    kernel: MESH_SLUG,
    mesh_default: MESH_DEFAULT,
    presence_ttl_ms: PRESENCE_TTL_MS,
    ...qnmFrame(),
    ...extra,
  };
}

function refuse(code, message, extra = {}) {
  return {
    ok: false,
    code,
    author: MESH_AUTHOR,
    identity: "Aziel Eliab",
    kernel: MESH_SLUG,
    mesh_default: MESH_DEFAULT,
    message,
    ...qnmFrame(),
    ...extra,
  };
}

function statusFields(state) {
  const nodes = pruneNodes(state.nodes);
  const list = liveList(nodes);
  const products = productsPresent(nodes);
  const rollup = rollupCounts(nodes);
  const bearers = normalizeBearers(state.bearers);
  const enabled = radiosOn(bearers);
  return {
    enabled,
    radios: enabled ? "operator" : "off",
    bearers,
    rollup,
    live_nodes: rollup.live,
    locked_nodes: rollup.locked,
    isolated_nodes: rollup.isolated,
    products_present: products,
    products,
    store: state.store,
    store_note: storeHonesty(state.store),
    anon_broadcast: ANON_BROADCAST_NOTE,
    azmail_note:
      "AZMail mesh_* stays product-local (anonymous mail ring). This surface is QNM rollup + operator enable, not that ring and not an account mesh.",
    suite_presence: "operator-enabled",
    get_never_enables: true,
    fanout: "cron-or-request-path",
  };
}

export async function meshFanoutSuitePresence(env, extra = {}) {
  const source = String((extra && extra.source) || "fanout").trim() || "fanout";
  const state = await loadState(env);
  if (!state.enabled) {
    return {
      ok: true,
      skipped: true,
      reason: "off",
      enabled: false,
      fanout: false,
      joined: 0,
      refreshed: 0,
      source,
      get_never_enables: true,
      suite_presence: "operator-enabled",
      note: "GET /v1/mesh never enables. Suite-presence fan-out runs only after an operator declared a bearer.",
    };
  }
  const targets = suitePresenceTargets(extra.products);
  const now = nowMs();
  const ts = nowIso(now);
  let joined = 0;
  let refreshed = 0;
  for (const target of targets) {
    const existing = state.nodes[target.node_id];
    const session_id = (existing && existing.session_id) || newSessionId(target.node_id);
    state.nodes[target.node_id] = {
      node_id: target.node_id,
      product: target.product,
      label: existing && existing.label ? existing.label : target.label,
      presence: "live",
      session_id,
      joined_at: (existing && existing.joined_at) || ts,
      last_seen: ts,
    };
    if (existing) refreshed += 1;
    else joined += 1;
  }
  const ids = Object.keys(state.nodes);
  if (ids.length > NODE_CAP) {
    const sorted = liveList(state.nodes);
    state.nodes = Object.fromEntries(sorted.slice(0, NODE_CAP).map((n) => [n.node_id, n]));
  }
  const store = await saveState(env, state);
  return baseResult({
    op: "fanout",
    skipped: false,
    fanout: true,
    source,
    joined,
    refreshed,
    targets: targets.length,
    node_ids: targets.map((t) => t.node_id),
    get_never_enables: true,
    suite_presence: "operator-enabled",
    ...statusFields({ ...state, store }),
    note: "Suite-presence refresh of live Softwares product Workers. GET never enables. Not a login mesh.",
  });
}

export function scheduleSuitePresenceFanout(ctx, env, extra = {}) {
  const work = meshFanoutSuitePresence(env, extra);
  if (ctx && typeof ctx.waitUntil === "function") {
    ctx.waitUntil(work);
    return { scheduled: true, source: (extra && extra.source) || "request-path" };
  }
  return work;
}

export async function meshStatus(payload, env) {
  const state = await loadState(env);
  return baseResult({
    op: "status",
    ...statusFields(state),
    note: state.enabled
      ? "QNM suite rollup is LIVE because an operator declared ≥1 bearer. Counts only — no QNM-S, no leaderboard."
      : "QNM radios/bearers are OFF (default). GET /v1/mesh never enables. Declare a bearer with POST /v1/mesh/enable.",
  });
}

export async function meshHealth(payload, env) {
  const status = await meshStatus(payload, env);
  return {
    ...status,
    op: "health",
    product: MESH_SLUG,
    name: MESH_NAME,
  };
}

export function meshSkillText() {
  return `# Quantum Node Mesh (QNM-BUILD-1.0)

Companion to **AIH-WP-1.1**. Suite public surface is **rollup + operator enable** only.

${MESH_LIMITATION}

Default **OFF**. **suite-presence is operator-enabled** (example: \`POST /v1/mesh/enable\` with \`{ bearer: "suite-presence" }\`). A site ping of \`GET /v1/mesh\` never turns radios on.

While radios are LIVE, this Worker fans out join/heartbeat for every live Softwares product Worker (\`node_id\` \`{slug}-worker\`, no \`|\`) on cron (\`*/2 * * * *\`) or request-path. Presence TTL is 5 minutes. Product Workers proxy \`/v1/mesh/*\` via \`AZIEL_RUNTIME\`. Not a second mesh.

Rollup counts: **live / locked / isolated**. No average-of-nodes leaderboard. Views / MCP / downloads do not enter QNM-S.

Full node process is local \`qnm-node/\` (boot / chain / apg / bearers / outbox / phoenix / score / memorial / tethers). Packet-transfer coding design is **QNS-CD-1.0** (photon QNS1 1.3 on local \`qnsd\`; companion to QNM-BUILD-1.0 / AIH-WP-1.3). This Worker cites only — \`GET /v1/qns\`. It does not proxy local via emit. Parent will roll that package. Anon-broadcast is a sibling loopback module of that local process only — never a publish path.

HTTP: \`GET /v1/mesh\` · \`GET /v1/mesh/status\` · \`POST /v1/mesh/enable\` (body \`{ bearer }\`) · \`POST /v1/mesh/disable\` · \`POST /v1/mesh/join|heartbeat|leave\` · \`GET /v1/mesh/nodes\` · \`POST /v1/mesh/broadcast\` (hash receipt only; not a publish path)

FragGate: \`fraggate_list\` → \`fraggate_describe\` slug=mesh → \`fraggate_call { slug: "mesh", op }\`

MCP tools: ${MESH_MCP_TOOLS.join(", ")}

${QNM_HOST_NOTE}

${ANON_BROADCAST_NOTE}

Author: Aziel Eliab only.
`;
}

export async function meshSkill() {
  return baseResult({
    op: "skill",
    text: meshSkillText(),
    note: "QNM suite rollup skill. Not a catalog Software engine. Not a login mesh.",
  });
}

function collectDeclaredBearers(src) {
  const raw = [];
  if (src && src.bearer != null && src.bearer !== "") raw.push(src.bearer);
  if (src && Array.isArray(src.bearers)) raw.push(...src.bearers);
  const accepted = [];
  const rejected = [];
  for (const item of raw) {
    const clean = sanitizeBearer(item);
    if (clean) {
      if (!accepted.includes(clean)) accepted.push(clean);
    } else {
      rejected.push(String(item == null ? "" : item).trim());
    }
  }
  return { accepted, rejected, raw };
}

export async function meshEnable(payload, env) {
  const src = payload && typeof payload === "object" && !Array.isArray(payload) ? payload : {};
  const state = await loadState(env);
  const { accepted, rejected, raw } = collectDeclaredBearers(src);
  if (!raw.length) {
    return refuse(
      "MESH-NEED-BEARER",
      "LIVE only after the operator declares ≥1 bearer. Pass { bearer: \"suite-presence\" }. Empty enable is refused. GET /v1/mesh never enables.",
      {
        op: "enable",
        mesh_enabled: state.enabled === true,
        ...statusFields(state),
        example_bearer: EXAMPLE_BEARER,
      },
    );
  }
  if (rejected.length) {
    return refuse(
      "MESH-BAD-BEARER",
      "Bearer refused. Login / account / recover / gate / IP / publish / phoenix / heal names are not suite bearers. This is not a login mesh.",
      {
        op: "enable",
        mesh_enabled: state.enabled === true,
        refused_bearers: rejected.slice(0, 8),
        example_bearer: EXAMPLE_BEARER,
      },
    );
  }
  const now = nowMs();
  if (state.last_enable_ms && now - state.last_enable_ms < ENABLE_COOLDOWN_MS) {
    const retry_ms = ENABLE_COOLDOWN_MS - (now - state.last_enable_ms);
    return refuse("MESH-ENABLE-RATE", "mesh enable is rate-limited. disable is always allowed.", {
      op: "enable",
      mesh_enabled: state.enabled === true,
      retry_ms,
    });
  }
  const bearers = [...state.bearers];
  for (const b of accepted) {
    if (!bearers.includes(b)) bearers.push(b);
  }
  state.bearers = bearers;
  state.enabled = radiosOn(bearers);
  state.last_enable_ms = now;
  await saveState(env, state);
  const fanout = await meshFanoutSuitePresence(env, { source: "enable" });
  const after = await loadState(env);
  return baseResult({
    op: "enable",
    ...statusFields(after),
    fanout: fanout.skipped ? false : true,
    fanout_joined: fanout.joined || 0,
    fanout_refreshed: fanout.refreshed || 0,
    note: "Operator declared a bearer. Radios LIVE for suite rollup only. Live Softwares product Workers are joined for rollup counts (TTL 5 min). Default remains off on a fresh isolate / empty KV. GET never enables. Not a login mesh.",
  });
}

export async function meshDisable(payload, env) {
  const state = await loadState(env);
  state.bearers = [];
  state.enabled = false;
  state.nodes = {};
  state.receipts = [];
  const store = await saveState(env, state);
  return baseResult({
    op: "disable",
    ...statusFields({ ...state, store }),
    note: "Radios/bearers OFF. Tethers drop clean — no implicit heal, no account resurrection, no wipe internals.",
  });
}

function offRefuse(op, state) {
  return refuse("MESH-OFF", "QNM radios are off. Default OFF. Declare ≥1 bearer with enable first. Site pings do not enable.", {
    op,
    mesh_enabled: false,
    ...statusFields(state),
  });
}

export async function meshJoin(payload, env) {
  const src = payload && typeof payload === "object" && !Array.isArray(payload) ? payload : {};
  const state = await loadState(env);
  if (!state.enabled) return offRefuse("join", state);
  const product = sanitizeProduct(src.product);
  if (!product) {
    return refuse("MESH-BAD-INPUT", "Pass { product } as a catalog slug (a-z0-9-). AnonBroadcast is not a product.", {
      op: "join",
      mesh_enabled: true,
    });
  }
  const presence = Object.prototype.hasOwnProperty.call(src, "presence")
    ? sanitizePresence(src.presence, "")
    : "live";
  if (!presence) {
    return refuse("MESH-BAD-INPUT", "presence must be live, locked, or isolated (rollup only; no scores).", {
      op: "join",
      mesh_enabled: true,
    });
  }
  let node_id = sanitizeNodeId(src.node_id || src.id);
  if (src.node_id && !node_id) {
    return refuse("MESH-BAD-INPUT", "node_id must be 8–80 chars [a-z0-9._-].", { op: "join", mesh_enabled: true });
  }
  const now = nowMs();
  const ts = nowIso(now);
  const existing = node_id ? state.nodes[node_id] : null;
  if (!node_id) node_id = newNodeId(now);
  const label = sanitizeLabel(src.label || (existing && existing.label) || product);
  const session_id = (existing && existing.session_id) || newSessionId(node_id);
  const node = {
    node_id,
    product,
    label,
    presence,
    session_id,
    joined_at: (existing && existing.joined_at) || ts,
    last_seen: ts,
  };
  state.nodes[node_id] = node;
  const ids = Object.keys(state.nodes);
  if (ids.length > NODE_CAP) {
    const sorted = liveList(state.nodes);
    state.nodes = Object.fromEntries(sorted.slice(0, NODE_CAP).map((n) => [n.node_id, n]));
  }
  const store = await saveState(env, state);
  return baseResult({
    op: "join",
    ...statusFields({ ...state, store }),
    session: {
      session_id,
      node_id,
      product,
      label,
      presence,
      joined_at: node.joined_at,
      presence_ttl_ms: PRESENCE_TTL_MS,
    },
    node,
    note: "Presence registered for QNM rollup only. Heartbeat within 5 minutes or the count drops. Not an account session.",
  });
}

export async function meshHeartbeat(payload, env) {
  const src = payload && typeof payload === "object" && !Array.isArray(payload) ? payload : {};
  const state = await loadState(env);
  if (!state.enabled) return offRefuse("heartbeat", state);
  const node_id = sanitizeNodeId(src.node_id || src.id);
  if (!node_id) {
    return refuse("MESH-BAD-INPUT", "Pass { node_id }.", { op: "heartbeat", mesh_enabled: true });
  }
  const node = state.nodes[node_id];
  if (!node) {
    return refuse("MESH-UNKNOWN-NODE", "Unknown or expired node. Join again. No account resurrection.", {
      op: "heartbeat",
      mesh_enabled: true,
      node_id,
    });
  }
  if (Object.prototype.hasOwnProperty.call(src, "presence")) {
    const presence = sanitizePresence(src.presence, "");
    if (!presence) {
      return refuse("MESH-BAD-INPUT", "presence must be live, locked, or isolated.", {
        op: "heartbeat",
        mesh_enabled: true,
      });
    }
    node.presence = presence;
  }
  node.last_seen = nowIso();
  state.nodes[node_id] = node;
  const store = await saveState(env, state);
  return baseResult({
    op: "heartbeat",
    ...statusFields({ ...state, store }),
    node,
    note: "Presence refreshed for rollup counts. 5-minute TTL. No implicit heal.",
  });
}

export async function meshLeave(payload, env) {
  const src = payload && typeof payload === "object" && !Array.isArray(payload) ? payload : {};
  const state = await loadState(env);
  const node_id = sanitizeNodeId(src.node_id || src.id);
  if (!node_id) {
    return refuse("MESH-BAD-INPUT", "Pass { node_id }.", { op: "leave", mesh_enabled: state.enabled === true });
  }
  const existed = Boolean(state.nodes[node_id]);
  delete state.nodes[node_id];
  const store = await saveState(env, state);
  return baseResult({
    op: "leave",
    ...statusFields({ ...state, store }),
    node_id,
    left: existed,
    note: existed ? "Presence dropped clean. No implicit heal." : "Node was not in the rollup; leave is idempotent.",
  });
}

export async function meshNodes(payload, env) {
  const state = await loadState(env);
  const nodes = liveList(pruneNodes(state.nodes)).map((n) => ({
    node_id: n.node_id,
    product: n.product,
    label: n.label,
    presence: PRESENCE_STATES.includes(n.presence) ? n.presence : "live",
    last_seen: n.last_seen,
    joined_at: n.joined_at,
  }));
  return baseResult({
    op: "nodes",
    ...statusFields(state),
    nodes,
    note: "QNM rollup roster (live/locked/isolated). No scores. No leaderboard. Views/MCP/downloads do not enter QNM-S.",
  });
}

function forbiddenBroadcastKeys(obj) {
  if (!obj || typeof obj !== "object") return [];
  return Object.keys(obj).filter((k) => FORBIDDEN_BROADCAST_KEYS.includes(String(k).toLowerCase()));
}

function poisonKeys(obj) {
  if (!obj || typeof obj !== "object" || Array.isArray(obj)) return [];
  return Object.keys(obj).filter((k) => POISON_KEY_RE.test(String(k)));
}

export async function meshBroadcast(payload, env) {
  const src = payload && typeof payload === "object" && !Array.isArray(payload) ? payload : {};
  const state = await loadState(env);
  if (!state.enabled) return offRefuse("broadcast", state);
  if (src.publish === true || String(src.mode || "").toLowerCase() === "publish") {
    return refuse("MESH-NO-PUBLISH", "Anon-broadcast is never a publish path. Local qnm-node/ loopback only.", {
      op: "broadcast",
      mesh_enabled: true,
      anon_broadcast: ANON_BROADCAST_NOTE,
    });
  }
  const banned = forbiddenBroadcastKeys(src);
  if (banned.length) {
    return refuse(
      "MESH-NO-BYTES",
      "Never a publish path. Do not send video / file / bytes / publish fields. Operator keeps the file on disk. Use local qnm-node/ anon-broadcast loopback to render.",
      {
        op: "broadcast",
        mesh_enabled: true,
        refused_keys: banned,
        anon_broadcast: ANON_BROADCAST_NOTE,
      },
    );
  }
  const sha = String(src.sha256 || src.hash || src.digest || "")
    .trim()
    .toLowerCase();
  if (!isSha256Hex(sha)) {
    return refuse("MESH-BAD-INPUT", "Pass { sha256 } as 64 hex chars. Hash receipt only — not a publish path.", {
      op: "broadcast",
      mesh_enabled: true,
      anon_broadcast: ANON_BROADCAST_NOTE,
    });
  }
  const title = clip(src.title, TITLE_CAP);
  const receipt = {
    sha256: sha,
    title: title || undefined,
    at: nowIso(),
    product: sanitizeProduct(src.product) || undefined,
    publish: false,
  };
  state.receipts.unshift(receipt);
  if (state.receipts.length > RECEIPT_CAP) state.receipts.length = RECEIPT_CAP;
  const store = await saveState(env, state);
  return baseResult({
    op: "broadcast",
    ...statusFields({ ...state, store }),
    receipt,
    receipts: state.receipts.slice(0, 8),
    render: "local-qnm-node-loopback",
    publish: false,
    anon_broadcast: ANON_BROADCAST_NOTE,
    note: "Local hash receipt only. Never a publish path. File stays on the operator disk.",
  });
}

export async function runMeshOp(op, payload, env) {
  const resolved = resolveMeshOp(op);
  const src = payload && typeof payload === "object" && !Array.isArray(payload) ? payload : {};
  const poisoned = poisonKeys(src);
  if (poisoned.length) {
    return refuse("MESH-POISON", "Poison refused, not interpreted.", {
      op: resolved || op || null,
      refused_keys: poisoned,
    });
  }
  if (MESH_STUB_OPS.includes(resolved)) {
    return refuse(
      "MESH-STUB",
      `${resolved} is stub on the suite QNM rollup. No login mesh, recovery, resurrection, Node Gate, publish, controller hunt, heal, arming, wipe, or hop internals.`,
      { op: resolved },
    );
  }
  if (resolved === "status") return meshStatus(payload, env);
  if (resolved === "health") return meshHealth(payload, env);
  if (resolved === "skill") return meshSkill();
  if (resolved === "enable") return meshEnable(payload, env);
  if (resolved === "disable") return meshDisable(payload, env);
  if (resolved === "join") return meshJoin(payload, env);
  if (resolved === "heartbeat") return meshHeartbeat(payload, env);
  if (resolved === "leave") return meshLeave(payload, env);
  if (resolved === "nodes") return meshNodes(payload, env);
  if (resolved === "broadcast") return meshBroadcast(payload, env);
  return refuse("MESH-UNKNOWN-OP", `Unknown mesh op ${JSON.stringify(op || "")}.`, {
    op: resolved || op || null,
    ops: MESH_CANONICAL_OPS.slice(),
  });
}

export async function dispatchMeshHttp(method, pathname, payload, env) {
  const m = String(method || "GET").toUpperCase();
  const path = String(pathname || "")
    .split("?")[0]
    .replace(/\/+$/, "")
    .toLowerCase() || "/";
  if (path === "/v1/mesh" || path === "/v1/mesh/status") {
    if (m === "GET" || m === "HEAD") {
      const body = await meshStatus(payload, env);
      return { status: 200, body };
    }
    return {
      status: 405,
      body: refuse("MESH-METHOD", "GET /v1/mesh or GET /v1/mesh/status. GET never enables radios.", {
        hint: "GET /v1/mesh/status",
      }),
    };
  }
  if (path === "/v1/mesh/nodes") {
    if (m === "GET" || m === "HEAD") {
      const body = await meshNodes(payload, env);
      return { status: 200, body };
    }
    return { status: 405, body: refuse("MESH-METHOD", "GET /v1/mesh/nodes.", { hint: "GET /v1/mesh/nodes" }) };
  }
  const postOps = {
    "/v1/mesh/enable": "enable",
    "/v1/mesh/disable": "disable",
    "/v1/mesh/join": "join",
    "/v1/mesh/heartbeat": "heartbeat",
    "/v1/mesh/leave": "leave",
    "/v1/mesh/broadcast": "broadcast",
  };
  if (postOps[path]) {
    if (m !== "POST") {
      return {
        status: 405,
        body: refuse("MESH-METHOD", `POST ${path}.`, { hint: `POST ${path}` }),
      };
    }
    const body = await runMeshOp(postOps[path], payload, env);
    return { status: body.ok === false ? 400 : 200, body };
  }
  return {
    status: 404,
    body: refuse("MESH-NOT-FOUND", "Unknown mesh path.", {
      hint: "GET /v1/mesh /status /nodes  POST /v1/mesh/enable|disable|join|heartbeat|leave|broadcast",
    }),
  };
}

/** In-memory KV stand-in for tests (same shape as USES / MESH). */
export function memoryMeshKv(seed = {}) {
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
